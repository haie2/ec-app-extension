// Shared half of every CRO extension's checkout pixel module. Each extension
// keeps only what is genuinely its own — how its cart lines carry attribution —
// and hands the result to `registerCheckoutPixel`, which owns the wire format,
// the transport and both event subscriptions.
//
// This file exists because the three modules used to carry their own copy of
// all of it and had already drifted apart: Mix & Match's copy was missing the
// "is this line even mine?" guard that Volume Discount's copy had, so a Volume
// Discount line was reported by BOTH modules and `ext_checkout_started` went out
// twice for the same checkout.
//
// Synced into the parent app's Web Pixel Extension along with the modules
// themselves (scripts/sync-widgets.js `syncPixelModules` copies every file in
// this directory). Nothing here may call `register()` — see the note at the top
// of any module for why.

// scripts/sync-widgets.js `--dev` rewrites this literal to pixel-dev.ecomposer.app
// as it copies the file — keep it a plain inline string.
const PIXEL_BASE_URL = "https://pixel-dev.ecomposer.app";

// `browser.localStorage` is the Web Pixel sandbox's own storage, namespaced
// separately from the storefront's `window.localStorage` — the storefront
// widget's `_cro_client_id` is NOT readable from here. It is instead handed
// over in the `cro_context` event and adopted below, so the storefront events
// and the checkout ones report the same visitor; the id minted here is only
// the fallback for a shopper who reached checkout without passing a widget.
const CLIENT_ID_STORAGE_KEY = "_cro_client_id";

// Currency context published by the storefront widget (`publishCroContext` in
// share-extensions/base/pixel-client.js) and persisted here so the checkout
// events, which arrive on a later page load, can still read it.
const CURRENCY_CONTEXT_STORAGE_KEY = "_cro_currency_context";

// Shopify re-fires `checkout_started` whenever the shopper reloads or
// re-enters checkout. Rather than gate on the checkout as a whole (a token that
// changes the moment the shopper adds an unrelated, non-bundle product), each
// rule's own line composition is fingerprinted under its own key below, so a
// rule only reports again once ITS bundle lines actually changed.
const checkoutStartedSignatureStorageKey = (extensionType: string, ruleId: string) =>
    `_cro_checkout_started_signature:${extensionType}:${ruleId}`;

// How long a rule's dedupe entry is trusted before it's treated as stale and
// `checkout_started` is allowed to report again. Bounds the window on ALL
// paths that never explicitly clear the entry — an abandoned checkout that's
// never completed, or a rule dropped from the cart before payment — instead of
// only the completed-checkout path, which a one-shot "clear on complete" can't
// cover and would even risk re-opening right on top of a same-checkout re-fire
// (a second tab, a back-navigation/bfcache restore) landing moments later.
// A day comfortably covers a shopper reloading, stepping away and coming back
// to finish the SAME checkout, while still letting a real new attempt with the
// same bundle — days or weeks later — report on its own.
const CHECKOUT_STARTED_SIGNATURE_TTL_MS = 24 * 60 * 60 * 1000;

export type TrackedLine = {
    finalLinePrice: { amount: number; currencyCode: string };
    quantity: number;
    variant: any;
    /** `_cro_sign` cart-line property: a timestamp the storefront widget
     * resolves right before the real `/cart/add` submit, reusing whatever
     * value an already-matching line in the cart carries instead of minting a
     * fresh one (see `resolveCroSign` in VolumeDiscountWidget.js) — so this
     * property changes only when the line actually starts over (cart emptied
     * by a completed checkout, or genuinely no matching line yet). Folded into
     * `buildBundleSignature` so a rule re-added after checkout completes — same
     * variants, same rule — is told apart from the line still sitting in the
     * cart from before, without relying on the checkout session's own identity. */
    sign?: string;
};

/** One extension's slice of a checkout: every line the extension claims for a
 * single rule, plus whatever extra dimensions only that extension reports. */
export type CroGroup = {
    extensionType: string;
    ruleName?: string;
    lines: TrackedLine[];
    /** Extension-specific dimensions merged into the event's `data`. No module
     * reports any today — it is the seam for one that needs a dimension the
     * shared payload doesn't already carry. */
    data?: Record<string, unknown>;
};

export type PixelApi = {
    settings: Record<string, unknown>;
    analytics: { subscribe: (event: string, callback: (event: any) => void) => void };
    browser: { localStorage: { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void> } };
};

type BrowserApi = PixelApi["browser"];

// Every module runs inside the SAME sandbox and shares this one storage key, so
// the read-generate-write has to resolve once for the whole bundle. Three
// modules resolving it independently all saw empty storage on a first-time
// shopper and minted three different ids for the same person, which split that
// shopper across three rows of the `unique_clients` aggregate.
let clientIdPromise: Promise<string> | null = null;

const resolveClientId = async (browser: BrowserApi): Promise<string> => {
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

export const getClientId = (browser: BrowserApi): Promise<string> => {
    if (!clientIdPromise) clientIdPromise = resolveClientId(browser);
    return clientIdPromise;
};

/** Identifies a rule's bundle lines by which variants are in it AND each line's
 * `_cro_sign`, order- and quantity-independent — two fires with the same
 * variants AND the same signs (a reload, a re-entry into the same checkout, a
 * quantity tweak on an existing line) produce the same signature, while
 * adding/removing a line of THIS rule, or the rule being added again as a
 * fresh add-to-cart (a new `_cro_sign`, e.g. after a prior checkout for the
 * same variants already completed), changes it. Quantity is deliberately
 * excluded: `ext_offer_accepted` (add-to-cart) is only ever fired from the
 * widget's own add-to-cart button, so a quantity edit made from the plain cart
 * page has no matching add-to-cart event, and counting it here would push
 * `ext_checkout_started` past `ext_offer_accepted` again. Lines outside this
 * rule's group never enter it, so a shopper adding an unrelated product
 * elsewhere in the cart doesn't touch it. */
const buildBundleSignature = (lines: TrackedLine[]): string => {
    const variants = Array.from(new Set(lines.map((line) => String(line.variant?.id ?? "")))).sort().join("|");
    const signs = Array.from(new Set(lines.map((line) => line.sign ?? ""))).sort().join("|");
    return `${variants}::${signs}`;
};

/** What's actually stored per rule: the signature so a later fire can tell a
 * repeat from a change (now including each line's `_cro_sign`, so a fresh
 * add-to-cart of the same variants counts as a change too — see
 * `buildBundleSignature`), and when it was written so a later fire can tell a
 * repeat from a STALE one. Serialised as-is — `browser.localStorage` only
 * holds strings. */
type StoredBundleSignature = {
    signature: string;
    firedAt: number;
};

/** True when this rule's bundle composition (variants + `_cro_sign`s) is
 * exactly what was last reported under this key, so `checkout_started` should
 * be skipped for it within the TTL below. A changed signature — different
 * variants, or the same variants re-added as a fresh add-to-cart — is let
 * through immediately, no TTL wait, since there is nothing to guard against
 * there.
 *
 * On an unreadable store (quota/permission error) this returns true — the
 * funnel would rather silently miss a `checkout_started` than let a broken
 * store turn into a duplicate, since a browser whose storage is failing can't
 * reliably suppress a reload either way. */
const hasBundleCompositionAlreadyFired = async (browser: BrowserApi, key: string, signature: string): Promise<boolean> => {
    try {
        const raw = await browser.localStorage.getItem(key);
        if (!raw) return false;

        const stored: StoredBundleSignature = JSON.parse(raw);
        if (stored.signature !== signature) return false;

        return Date.now() - stored.firedAt < CHECKOUT_STARTED_SIGNATURE_TTL_MS;
    } catch {
        return true;
    }
};

const markBundleCompositionFired = async (browser: BrowserApi, key: string, signature: string) => {
    try {
        const stored: StoredBundleSignature = { signature, firedAt: Date.now() };
        await browser.localStorage.setItem(key, JSON.stringify(stored));
    } catch {
        // No persistence available — this composition may be reported again.
    }
};

// `browser.localStorage.getItem`/`setItem` are async, so two invocations of the
// `checkout_started` subscriber racing on the SAME key (Shopify redelivering the
// event, or firing it twice in close succession) can both `await` the read
// before either finishes the write, and both see "not yet fired". The sandbox
// is single-threaded, though — there's no true parallelism to guard against,
// only interleaving between two `await`s — so chaining each call onto the
// previous one for the same key is enough to make read-then-write atomic
// relative to any other call for that key, with no external lock needed.
const bundleSignatureLocks = new Map<string, Promise<unknown>>();

const withBundleSignatureLock = <T>(key: string, task: () => Promise<T>): Promise<T> => {
    const previous = bundleSignatureLocks.get(key) ?? Promise.resolve();
    const next = previous.then(task, task);
    // Never left rejected: a throwing `task` must not wedge every later call
    // for this key behind a rejected promise forever.
    bundleSignatureLocks.set(key, next.catch(() => undefined));
    return next;
};

/** The single entry point for the dedupe check: atomically tells whether THIS
 * call is the one that gets to report `checkout_started` for this rule, and if
 * so, claims it before returning. Replaces the separate
 * check-then-write two-step, which was racy across concurrent calls for the
 * same key. */
const claimBundleComposition = (browser: BrowserApi, key: string, signature: string): Promise<boolean> =>
    withBundleSignatureLock(key, async () => {
        if (await hasBundleCompositionAlreadyFired(browser, key, signature)) return false;

        await markBundleCompositionFired(browser, key, signature);
        return true;
    });

/** Replaces whatever id this sandbox holds with the one the storefront widget
 * is already reporting. The storefront's id wins because it is the older of the
 * two — it exists from the shopper's first widget impression, while this sandbox
 * only mints one lazily — and because events already sent carry it. */
const adoptStorefrontClientId = async (browser: BrowserApi, clientId: string) => {
    clientIdPromise = Promise.resolve(clientId);
    try {
        const existing = await browser.localStorage.getItem(CLIENT_ID_STORAGE_KEY);
        if (existing === clientId) return;
        await browser.localStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId);
    } catch {
        // No persistence available — the in-memory copy still serves this page.
    }
};

export type CurrencyContext = {
    activeCurrency?: string;
    baseCurrency?: string;
    exchangeRate: number;
    toBase: (presentmentAmount: number) => number;
};

/** What the storefront published, as stored: a plain object so it survives the
 * round trip through `browser.localStorage`. */
type StoredCurrencyContext = {
    base_currency?: string;
    exchange_rate?: number;
};

// Every module runs in the same sandbox, so the context is subscribed once and
// shared — see the note on `clientIdPromise`.
let storedCurrencyContext: StoredCurrencyContext | null = null;
let storedCurrencyContextPromise: Promise<StoredCurrencyContext | null> | null = null;
let croContextSubscribed = false;

const persistCurrencyContext = async (browser: BrowserApi, context: StoredCurrencyContext) => {
    storedCurrencyContext = context;
    storedCurrencyContextPromise = Promise.resolve(context);
    try {
        await browser.localStorage.setItem(CURRENCY_CONTEXT_STORAGE_KEY, JSON.stringify(context));
    } catch {
        // No persistence available — the in-memory copy still serves this page.
    }
};

const readStoredCurrencyContext = async (browser: BrowserApi): Promise<StoredCurrencyContext | null> => {
    if (storedCurrencyContext) return storedCurrencyContext;
    try {
        const raw = await browser.localStorage.getItem(CURRENCY_CONTEXT_STORAGE_KEY);
        if (!raw) return null;
        storedCurrencyContext = JSON.parse(raw) as StoredCurrencyContext;
        return storedCurrencyContext;
    } catch {
        return null;
    }
};

export const getStoredCurrencyContext = (browser: BrowserApi): Promise<StoredCurrencyContext | null> => {
    if (!storedCurrencyContextPromise) storedCurrencyContextPromise = readStoredCurrencyContext(browser);
    return storedCurrencyContextPromise;
};

/** Subscribes the custom events that carry storefront-only context into this
 * sandbox. `cro_context` is CRO Hub's own, published by every widget on render,
 * and brings both the currency pair and the visitor's `client_id`;
 * `ec_page_viewed` is the parent app's, which already carries the same currency
 * fields on any EComposer-built page and costs a few lines to accept as a
 * fallback for shoppers who never passed a CRO Hub widget.
 *
 * Called once from `registerCroPixels` — the modules share one sandbox, and a
 * second subscription would just overwrite the same key with the same value. */
export const subscribeCroContext = ({ analytics, browser }: PixelApi) => {
    if (croContextSubscribed) return;
    croContextSubscribed = true;

    const acceptCurrency = (payload: any, { onlyIfMissing = false } = {}) => {
        if (!payload?.base_currency) return;
        if (onlyIfMissing && storedCurrencyContext) return;

        const rate = Number(payload.exchange_rate);
        persistCurrencyContext(browser, {
            base_currency: payload.base_currency,
            exchange_rate: Number.isFinite(rate) && rate > 0 ? rate : 1,
        });
    };

    analytics.subscribe("cro_context", (event: any) => {
        const payload = event?.customData ?? event?.data;
        acceptCurrency(payload);
        if (payload?.client_id) adoptStorefrontClientId(browser, String(payload.client_id));
    });
    // Only fills a gap, never overwrites: the host's event reads its base
    // currency from `window.shopCurrency`, a global most themes never set, so
    // CRO Hub's own value (rendered from `{{ shop.currency }}`) wins whenever
    // both are available. It carries no `client_id` of CRO Hub's.
    analytics.subscribe("ec_page_viewed", (event: any) =>
        acceptCurrency(event?.customData ?? event?.data, { onlyIfMissing: true }),
    );
};

/** Checkout money is presentment; the analytics API is sent the shop's base
 * currency so rows from different markets sum — the same convention EComposer's
 * own pixel follows. The sandbox has no `window.Shopify`, so the base currency
 * and rate come from whatever `subscribeCroContext` captured. Without them
 * the amounts are reported as-is: a single-currency shop is already correct, and
 * a converted-by-1 amount beats a dropped event. */
export const resolveCurrencyContext = (
    stored: StoredCurrencyContext | null,
    checkoutCurrency?: string,
): CurrencyContext => {
    const activeCurrency = checkoutCurrency;
    const parsedRate = Number(stored?.exchange_rate);
    const exchangeRate = Number.isFinite(parsedRate) && parsedRate > 0 ? parsedRate : 1;
    const baseCurrency = stored?.base_currency || activeCurrency;

    return {
        activeCurrency,
        baseCurrency,
        exchangeRate,
        toBase: (presentmentAmount: number) => {
            const amount = Number(presentmentAmount) || 0;
            return activeCurrency === baseCurrency ? amount : amount / exchangeRate;
        },
    };
};

/** `product_id` / `variant_id` / `product_name` may only be sent when the group
 * holds exactly one product — a group of several would fragment the report into
 * one row per combination. `product_count` records how many products the rule
 * covered in either case (docs/ANALYTICS_API.md §2.4). */
export const buildProductDimensions = (lines: TrackedLine[]) => {
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

type SendPixelEventArgs = {
    name: string;
    storeId?: string;
    extensionType: string | null;
    ruleId: string;
    ruleName?: string;
    pageId: string;
    data?: Record<string, unknown>;
};

type CheckoutPixelConfig = {
    /** Prefixes this module's console output, e.g. "Volume Discount Pixel". */
    label: string;
    layoutId: string;
    /** The extension's own reading of the checkout: which lines belong to it,
     * and which rule each one falls under. */
    groupLines: (lineItems: any[]) => Map<string, CroGroup>;
};

export function registerCheckoutPixel(
    { settings, analytics, browser }: PixelApi,
    { label, layoutId, groupLines }: CheckoutPixelConfig,
) {
    const shopDomain = settings.shopify_domain as string | undefined;
    // The store id the host pixel is configured with — the only source, and the
    // reason nothing has to be smuggled through the cart for it. A missing store
    // id drops the event outright (docs/CRO_REVENUE_INTEGRATION.md §2).
    const accountStoreId = settings.accountID ? String(settings.accountID) : undefined;

    const sendPixelEvent = async ({ name, storeId, extensionType, ruleId, ruleName, pageId, data = {} }: SendPixelEventArgs) => {
        if (!shopDomain) return;

        // The read API rejects `shop_id: 0` (docs/ANALYTICS_API.md §4.2 requires
        // `> 0`), so an unresolvable store id drops the event instead of filing
        // it under an account that belongs to nobody.
        const numericStoreId = Number(storeId);
        if (!Number.isFinite(numericStoreId) || numericStoreId <= 0) {
            console.error(`[${label}] no usable store_id (${String(storeId)}) — dropping "${name}"`);
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
            client_id: await getClientId(browser),
            timestamp: new Date().toISOString(),
            extension_type: extensionType,
            rule_id: ruleId,
            rule_name: ruleName,
            page_id: pageId,
            // Checkout events do carry `context.navigator`/`context.document`
            // (the host pixel reports both), but the domain is the only piece
            // the backend reconciles against, so nothing else is sent.
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
            layout_id: layoutId,
        };

        fetch(`${PIXEL_BASE_URL}/v1/analytic?shopify_domain=${encodeURIComponent(shopDomain)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            keepalive: true,
        }).catch((error) => console.error(`[${label}] Failed to send "${name}"`, error));
    };

    const readCheckoutContext = async (checkout: any) => ({
        storeId: accountStoreId,
        money: resolveCurrencyContext(await getStoredCurrencyContext(browser), checkout.currencyCode),
    });

    const totalsOf = (group: CroGroup) => ({
        presentmentAmount: group.lines.reduce((sum, line) => sum + Number(line.finalLinePrice?.amount ?? 0), 0),
        quantity: group.lines.reduce((sum, line) => sum + (line.quantity ?? 0), 0),
    });

    analytics.subscribe("checkout_started", async (event: any) => {
        const checkout = event.data?.checkout;
        if (!checkout) return;

        const { storeId, money } = await readCheckoutContext(checkout);

        for (const [ruleId, group] of groupLines(checkout.lineItems)) {
            // A reload or re-entry into checkout re-fires Shopify's
            // `checkout_started` for every rule still in the cart even when
            // nothing about that rule's bundle changed, inflating
            // `ext_checkout_started` past the real `ext_offer_accepted`
            // (add-to-cart) count. Only report again once THIS rule's lines
            // actually changed — adding an unrelated, non-bundle product
            // elsewhere in the cart must not suppress or duplicate it.
            const signatureKey = checkoutStartedSignatureStorageKey(group.extensionType, ruleId);
            const signature = buildBundleSignature(group.lines);
            if (!(await claimBundleComposition(browser, signatureKey, signature))) continue;

            const { presentmentAmount, quantity } = totalsOf(group);

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
                    // The funnel counts `ext_checkout_started` by raw event count
                    // (`queryExtensionFunnel` in app/lib/analytics.server.ts), and
                    // Shopify re-fires `checkout_started` whenever the shopper
                    // reloads or re-enters the checkout. Without a stable handle
                    // on the checkout, those repeats are indistinguishable from
                    // separate shoppers and inflate the step.
                    checkout_token: checkout.token,
                    ...buildProductDimensions(group.lines),
                    ...group.data,
                },
            });
        }
    });

    analytics.subscribe("checkout_completed", async (event: any) => {
        const checkout = event.data?.checkout;
        if (!checkout) return;

        const { storeId, money } = await readCheckoutContext(checkout);
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

        // One event per order-rule, never one per line: `extensionRevenue`
        // dedupes by `revenue_key` and its default revenue unit is one
        // unit/order-rule (docs/ANALYTICS_API.md §2.4), so per-line events would
        // collapse into a single row and undercount the offer.
        for (const [ruleId, group] of groupLines(checkout.lineItems)) {
            const { presentmentAmount, quantity } = totalsOf(group);

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
                    ...buildProductDimensions(group.lines),
                    ...group.data,
                    lines: buildRevenueLines(group.lines, money),
                },
            });
        }
    });
}
