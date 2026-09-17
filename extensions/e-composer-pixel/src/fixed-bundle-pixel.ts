// Synced into the parent app's existing Web Pixel Extension
// (extensions/e-composer-pixel/src/) — see share-extensions/sync-manifest.json
// `pixelModules` and scripts/sync-widgets.js `syncPixelModules`. A Web Pixel
// bundle only supports ONE top-level `register()` call — the parent's
// e-composer-pixel/src/index.ts already has its own for EC's own tracking, so
// this file must NOT call `register()` itself. Instead it exports
// `registerFixedBundlePixel`, which index.ts imports and calls from inside its
// existing `register()` callback, passing the same `{ settings, analytics,
// browser }` it already has — same pattern as `mix-match-pixel.ts`.
//
// Fixed Bundle adds its bundle product as ONE cart line (no cart-transform,
// no `lineComponents`), so — unlike Mix & Match — every line tags itself
// directly and there is no line-components fan-out to group.

const PIXEL_BASE_URL = "https://pixel-dev.ecomposer.app";

// Same storage key `share-extensions/base/pixel-client.js` uses on the
// storefront, so `client_id` stays consistent with what the widget already
// sent on `ext_impression`/`ext_offer_accepted`.
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

const FALLBACK_EXTENSION_TYPE = "cro_fixed_bundle";

type CroLineAttribution = { extensionType: string | null; ruleId: string; ruleName?: string };

/** Fixed Bundle tags its single cart line with flat properties — `_cro_ext` /
 * `_cro_campaign` (see `_addBundleToCart` in CroFixedBundleWidget.js) — rather
 * than packing them into `_cro_data`: it adds one line with no cart-transform
 * function reading it, so there is no input-query byte budget to economize on. */
const parseCroAttribution = (line: any): CroLineAttribution | null => {
    const properties = new Map((line.properties ?? []).map((property: any) => [property.key, property.value]));

    const ruleId = properties.get("_cro_campaign") as string | undefined;
    if (!ruleId) return null;
    return { extensionType: (properties.get("_cro_ext") as string | undefined) ?? null, ruleId };
};

function groupLinesByRule(lines: any[]) {
    const byRule = new Map<string, { extensionType: string; ruleName?: string; lines: TrackedLine[] }>();
    for (const line of lines ?? []) {
        const attribution = parseCroAttribution(line);
        if (!attribution) continue;

        const { ruleId } = attribution;
        const extensionType = attribution.extensionType || FALLBACK_EXTENSION_TYPE;
        const group = byRule.get(ruleId) ?? { extensionType, ruleName: attribution.ruleName, lines: [] };
        group.lines.push({ finalLinePrice: line.finalLinePrice, quantity: line.quantity ?? 0, variant: line.variant });
        byRule.set(ruleId, group);
    }
    return byRule;
}

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

export function registerFixedBundlePixel({ settings, analytics, browser }: PixelApi) {
    const shopDomain = settings.shopify_domain as string | undefined;
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
            console.error(`[Fixed Bundle Pixel] no usable store_id (${String(storeId)}) — dropping "${name}"`);
            return;
        }

        const payload = {
            id: crypto.randomUUID(),
            name,
            store_id: numericStoreId,
            client_id: await getClientId(),
            timestamp: new Date().toISOString(),
            extension_type: extensionType,
            rule_id: ruleId,
            rule_name: ruleName,
            page_id: pageId,
            context: { shopify_domain: shopDomain },
            data: {
                extension_type: extensionType,
                rule_id: ruleId,
                rule_name: ruleName,
                page_id: pageId,
                ...data,
            },
            layout_id: "cro-fixed-bundle",
        };

        fetch(`${PIXEL_BASE_URL}/v1/analytic?shopify_domain=${encodeURIComponent(shopDomain)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            keepalive: true,
        }).catch((error) => console.error(`[Fixed Bundle Pixel] Failed to send "${name}"`, error));
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
        // Same contract as `mix-match-pixel.ts`: Shopify's spec allows `order.id`
        // to still be null here, and the backend resolves identity from
        // `checkout_token` first, skipping the empty string.
        const orderId = checkout.order?.id ?? "";
        const customerId = checkout.order?.customer?.id;

        const money = resolveCurrencyContext(attributes, checkout.currencyCode);

        const rules = groupLinesByRule(checkout.lineItems);

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
