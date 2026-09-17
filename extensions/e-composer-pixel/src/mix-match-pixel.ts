// Synced into the parent app's existing Web Pixel Extension
// (extensions/e-composer-pixel/src/) — see share-extensions/sync-manifest.json
// `pixelModules` and scripts/sync-widgets.js `syncPixelModules`. A Web Pixel
// bundle only supports ONE top-level `register()` call — the parent's
// e-composer-pixel/src/index.ts already has its own for EC's own tracking, so
// this file must NOT call `register()` itself (a second call silently
// overrides the first and its subscriptions never fire). Instead it exports
// `registerMixMatchPixel`, which index.ts imports and calls from inside its
// existing `register()` callback, passing the same `{ settings, analytics,
// browser }` it already has. Other extensions (Volume Discount, BXGY) should
// follow the same export-a-function pattern, not call `register()` on their own.
//
// Grouping is by the `_cro_data` line property (see
// docs/EXTENSION_FUNNEL_TRACKING.md §1.2), not hardcoded to Mix & Match, so
// Volume Discount/BXGY can reuse the same grouping once they instrument their
// own widgets — no changes needed here.

const PIXEL_BASE_URL = "https://pixel-dev.ecomposer.app";

// Same storage key `share-extensions/base/pixel-client.js` uses on the
// storefront — the Web Pixels `browser.localStorage` accessor reads/writes the
// shopper's real browser storage (not a sandboxed copy), so this returns the
// same `client_id` the storefront widget already sent on
// `ext_impression`/`ext_offer_accepted`, keeping the funnel's
// `client_id` consistent end-to-end.
const CLIENT_ID_STORAGE_KEY = "_cro_client_id";

type SendPixelEventArgs = {
    name: string;
    storeId?: string;
    extensionType: string | null;
    ruleId: string;
    ruleName?: string;
    pageId: string;
    data?: Record<string, unknown>;
};

type TrackedLine = {
    finalLinePrice: { amount: number; currencyCode: string };
    quantity: number;
    variant: any;
};

// A line whose attribution carries no extension type would be dropped by every
// report (the queries filter on it). Only Mix & Match tags its lines today —
// revisit when Volume Discount/BXGY instrument their own widgets.
const FALLBACK_EXTENSION_TYPE = "cro_mix_match";

type CroLineAttribution = { extensionType: string | null; ruleId: string; ruleName?: string };

/** The contract is three separate line properties — `_cro_ext` / `_cro_rule` /
 * `_cro_tier` (docs/CRO_REVENUE_INTEGRATION.md §2). Mix & Match packs the same
 * fields into one `_cro_data` JSON property instead, because the cart-transform
 * function reads them from its input query, which has a hard 3000-character
 * deploy limit that each extra attribute eats into. Both shapes are read here so
 * an extension following the documented contract needs no changes to this file.
 * The rest of `_cro_data` belongs to the function (`lib/cro-data.js`) and is
 * ignored. */
const parseCroAttribution = (line: any): CroLineAttribution | null => {
    const properties = new Map((line.properties ?? []).map((property: any) => [property.key, property.value]));

    const ruleId = properties.get("_cro_rule") as string | undefined;
    if (ruleId) return { extensionType: (properties.get("_cro_ext") as string | undefined) ?? null, ruleId };

    const raw = properties.get("_cro_data") as string | undefined;
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as { campaign?: string; ext?: string; name?: string };
        if (!parsed.campaign) return null;
        return { extensionType: parsed.ext ?? null, ruleId: parsed.campaign, ruleName: parsed.name };
    } catch {
        return null;
    }
};

// Mix & Match sends one parent line per bundle (tagged with `_cro_bundle`);
// the `_cro_data` property lives on each `lineComponents[]` entry (one per
// product picked into the bundle), not on the parent line itself. Lines with no
// `lineComponents` (other extensions, e.g. Volume Discount/BXGY) are expected to
// tag themselves directly instead.
function trackableLines(line: any): any[] {
    const components = line.lineComponents ?? [];
    return components.length ? components : [line];
}

function groupLinesByRule(lines: any[]) {
    const byRule = new Map<string, { extensionType: string; ruleName?: string; lines: TrackedLine[] }>();
    for (const line of lines ?? []) {
        for (const source of trackableLines(line)) {
            const attribution = parseCroAttribution(source);
            if (!attribution) continue;

            const { ruleId } = attribution;
            const extensionType = attribution.extensionType || FALLBACK_EXTENSION_TYPE;
            const group = byRule.get(ruleId) ?? { extensionType, ruleName: attribution.ruleName, lines: [] };
            group.lines.push({ finalLinePrice: source.finalLinePrice, quantity: source.quantity ?? 0, variant: source.variant });
            byRule.set(ruleId, group);
        }
    }
    return byRule;
}

/** `product_id` / `variant_id` / `product_name` may only be sent when the group
 * holds exactly one product — a group of several would fragment the report into
 * one row per combination. `product_count` records how many products the rule
 * covered in either case (docs/ANALYTICS_API.md §2.4). */
const buildProductDimensions = (lines: TrackedLine[]) => {
    const productIds = new Set(lines.map((line) => line.variant?.product?.id).filter(Boolean));
    if (productIds.size !== 1) return { product_count: productIds.size };

    const [line] = lines;
    return {
        product_count: 1,
        product_id: line.variant?.product?.id,
        variant_id: line.variant?.id,
        product_name: line.variant?.product?.title,
    };
};

/** `lines` is the one array the contract allows in `data`: the resolver extracts
 * `product_ids` / `product_names` / `products` into its GROUP BY, but not this
 * key, so Go can fan it into `extension_revenue_lines` while `extension_revenue`
 * keeps its single order-rule row — money and order counts are unchanged. It is
 * also the only way a multi-product rule keeps any product breakdown at all,
 * since the root product dimensions are dropped above
 * (docs/ANALYTICS_PAYLOADS.md §6.6). */
const buildRevenueLines = (lines: TrackedLine[], money: CurrencyContext) =>
    lines.map((line) => ({
        product_id: line.variant?.product?.id,
        variant_id: line.variant?.id,
        product_name: line.variant?.product?.title,
        quantity: line.quantity,
        amount: money.toBase(Number(line.finalLinePrice?.amount ?? 0)),
        currency: money.baseCurrency,
    }));

const readAttributes = (checkout: any): Map<string, string> =>
    new Map((checkout.attributes ?? []).map((attribute: any) => [attribute.key, attribute.value]));

type CurrencyContext = {
    activeCurrency?: string;
    baseCurrency?: string;
    exchangeRate: number;
    toBase: (presentmentAmount: number) => number;
};

/** Checkout money is presentment; the analytics API is sent the shop's base
 * currency so rows from different markets sum — the same convention EComposer's
 * own pixel follows. The sandbox has no `window.Shopify`, so the base currency
 * and rate come from the cart attributes the widget pushed
 * (`pushCroCartAttributes`). Without them the amounts are reported as-is: a
 * single-currency shop is already correct, and a converted-by-1 amount beats a
 * dropped event. */
const resolveCurrencyContext = (attributes: Map<string, string>, checkoutCurrency?: string): CurrencyContext => {
    const activeCurrency = checkoutCurrency;
    const parsedRate = Number(attributes.get("_cro_rate"));
    const exchangeRate = Number.isFinite(parsedRate) && parsedRate > 0 ? parsedRate : 1;
    const baseCurrency = attributes.get("_cro_base_currency") || activeCurrency;

    return {
        activeCurrency,
        baseCurrency,
        exchangeRate,
        toBase: (presentmentAmount: number) => (Number(presentmentAmount) || 0) / exchangeRate,
    };
};

type PixelApi = {
    settings: Record<string, unknown>;
    analytics: { subscribe: (event: string, callback: (event: any) => void) => void };
    browser: { localStorage: { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void> } };
};

export function registerMixMatchPixel({ settings, analytics, browser }: PixelApi) {
    const shopDomain = settings.shopify_domain as string | undefined;
    // The store id the host pixel is configured with. The `_cro_store` cart
    // attribute is only a fallback: the widget writes it through
    // `cart/update.js`, which can still be in flight when the shopper hits
    // checkout, and a missing store id drops the event outright
    // (docs/CRO_REVENUE_INTEGRATION.md §2).
    const accountStoreId = settings.accountID ? String(settings.accountID) : undefined;

    const resolveStoreId = (attributes: Map<string, string>) => accountStoreId || attributes.get("_cro_store");

    const getClientId = async (): Promise<string> => {
        try {
            const existing = await browser.localStorage.getItem(CLIENT_ID_STORAGE_KEY);
            if (existing) return existing;
        } catch {
            // Falls through to generating a fresh id below.
        }
        const generated = crypto.randomUUID();
        try {
            await browser.localStorage.setItem(CLIENT_ID_STORAGE_KEY, generated);
        } catch {
            // No persistence available — still usable for this one event.
        }
        return generated;
    };

    const sendPixelEvent = async ({ name, storeId, extensionType, ruleId, ruleName, pageId, data = {} }: SendPixelEventArgs) => {
        if (!shopDomain) return;

        // The read API rejects `shop_id: 0` (docs/ANALYTICS_API.md §4.2 requires
        // `> 0`), so an unresolvable store id drops the event instead of filing
        // it under an account that belongs to nobody.
        const numericStoreId = Number(storeId);
        if (!Number.isFinite(numericStoreId) || numericStoreId <= 0) {
            console.error(`[Mix & Match Pixel] no usable store_id (${String(storeId)}) — dropping "${name}"`);
            return;
        }

        const payload = {
            // Sent explicitly rather than left to the server: `id` is what lets
            // a retried request be recognised, and `timestamp` is the shopper's
            // real event time, not the time the request happened to arrive
            // (docs/ANALYTICS_API.md §2.2).
            id: crypto.randomUUID(),
            name,
            store_id: numericStoreId,
            client_id: await getClientId(),
            timestamp: new Date().toISOString(),
            extension_type: extensionType,
            rule_id: ruleId,
            rule_name: ruleName,
            page_id: pageId,
            // The checkout sandbox has no `document`/`navigator` worth
            // reporting; the domain is what the backend reconciles against.
            context: { shopify_domain: shopDomain },
            // The four attribution fields go to the root AND into `data`
            // (docs/ANALYTICS_API.md §2.2): query filters read them from the
            // root, while some metrics are grouped off `data`.
            data: {
                extension_type: extensionType,
                rule_id: ruleId,
                rule_name: ruleName,
                page_id: pageId,
                ...data,
            },
            layout_id: "cro-mix-match",
        };

        fetch(`${PIXEL_BASE_URL}/v1/analytic?shopify_domain=${encodeURIComponent(shopDomain)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            keepalive: true,
        }).catch((error) => console.error(`[Mix & Match Pixel] Failed to send "${name}"`, error));
    };

    analytics.subscribe("checkout_started", (event: any) => {
        const checkout = event.data?.checkout;
        if (!checkout) return;

        const attributes = readAttributes(checkout);
        const storeId = resolveStoreId(attributes);
        const source = attributes.get("_cro_src");
        const device = attributes.get("_cro_device");

        const money = resolveCurrencyContext(attributes, checkout.currencyCode);

        const rules = groupLinesByRule(checkout.lineItems);

        for (const [ruleId, group] of rules) {
            const presentmentAmount = group.lines.reduce((sum, line) => sum + Number(line.finalLinePrice?.amount ?? 0), 0);
            const quantity = group.lines.reduce((sum, line) => sum + (line.quantity ?? 0), 0);

            sendPixelEvent({
                name: "ext_checkout_started",
                storeId,
                extensionType: group.extensionType,
                ruleId,
                ruleName: group.ruleName,
                pageId: "checkout",
                data: {
                    // `amount` is the revenue attributed to this rule;
                    // `order_value` is the whole cart. The resolver falls back
                    // `upsell_value` → `amount`, so `amount` alone is enough.
                    amount: money.toBase(presentmentAmount),
                    quantity,
                    order_value: money.toBase(Number(checkout.totalPrice?.amount ?? 0)),
                    currency: money.baseCurrency,
                    original_price: presentmentAmount,
                    original_currency: money.activeCurrency,
                    exchange_rate: money.exchangeRate,
                    source,
                    device,
                    ...buildProductDimensions(group.lines),
                },
            });
        }
    });

    analytics.subscribe("checkout_completed", (event: any) => {
        const checkout = event.data?.checkout;
        if (!checkout) return;

        const attributes = readAttributes(checkout);
        const storeId = resolveStoreId(attributes);
        const source = attributes.get("_cro_src");
        const device = attributes.get("_cro_device");
        // Shopify's own spec allows `order.id` to still be `null` here, so
        // `checkout_token` is what the backend resolves the identity from
        // first. Sent as an empty string rather than the token: the resolver
        // skips empty strings, and putting the token in both keys would make a
        // later payload that does carry a real order id look like a different
        // order (docs/ANALYTICS_PAYLOADS.md §6.5).
        const orderId = checkout.order?.id ?? "";
        // Only present for a logged-in shopper — an undefined key is dropped by
        // `JSON.stringify`, so a guest checkout simply sends no `customer_id`.
        const customerId = checkout.order?.customer?.id;

        const money = resolveCurrencyContext(attributes, checkout.currencyCode);

        const rules = groupLinesByRule(checkout.lineItems);

        // One event per order-rule, never one per bundle line: `extensionRevenue`
        // dedupes by `revenue_key` and its default revenue unit is one
        // unit/order-rule (docs/ANALYTICS_API.md §2.4), so per-line events would
        // collapse into a single row and undercount the bundle.
        for (const [ruleId, group] of rules) {
            const presentmentAmount = group.lines.reduce((sum, line) => sum + Number(line.finalLinePrice?.amount ?? 0), 0);
            const quantity = group.lines.reduce((sum, line) => sum + (line.quantity ?? 0), 0);

            sendPixelEvent({
                name: "ext_revenue",
                storeId,
                extensionType: group.extensionType,
                ruleId,
                ruleName: group.ruleName,
                pageId: "checkout",
                data: {
                    // `amount` is required for a revenue row to exist at all;
                    // `order_value` is the order total next to it.
                    amount: money.toBase(presentmentAmount),
                    quantity,
                    currency: money.baseCurrency,
                    original_price: presentmentAmount,
                    original_currency: money.activeCurrency,
                    exchange_rate: money.exchangeRate,
                    order_id: orderId,
                    checkout_token: checkout.token,
                    order_value: money.toBase(Number(checkout.totalPrice?.amount ?? 0)),
                    customer_id: customerId,
                    source,
                    device,
                    ...buildProductDimensions(group.lines),
                    lines: buildRevenueLines(group.lines, money),
                },
            });
        }
    });
}
