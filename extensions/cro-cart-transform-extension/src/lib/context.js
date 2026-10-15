/**
 * Facts every handler shares, plus each handler's own campaign data kept under
 * its own type.
 *
 * Nothing here knows what a cro type is or where its campaigns live: each
 * handler answers that itself through `readCampaigns(input)`, because the
 * metafield owner, the parse (raw JSON string vs `jsonValue`) and the envelope
 * shape all differ per type. Adding a cro type must not require editing this
 * file.
 */
export function buildContext(input, handlers) {
    // Keyed by handler type. Insertion order follows the handler registry, which
    // is what keeps the `meta=` trace column stable run to run.
    const campaigns = new Map();
    const metafieldBytes = new Map();

    for (const handler of handlers) {
        const read = handler.readCampaigns(input);
        campaigns.set(handler.type, read.campaigns);
        metafieldBytes.set(handler.type, read.bytes);
    }

    return {
        today: input?.shop?.localTime?.date ?? null,
        // Storefront currency / shop currency. Cart money is already in the
        // presentment currency, but campaign config amounts are in the shop's,
        // so a handler comparing the two has to convert with this first.
        presentmentCurrencyRate: input?.presentmentCurrencyRate ?? 1,
        isAuthenticated: input?.cart?.buyerIdentity?.isAuthenticated ?? false,
        // null for a guest — distinct from 0, which means an authenticated
        // customer with no orders yet ("new").
        customerNumberOfOrders: input?.cart?.buyerIdentity?.customer?.numberOfOrders ?? null,
        // Which of the global union query variable's tags the customer
        // actually has — a handler intersects this against its OWN campaign's
        // required tags, so two bundles with different tag requirements are
        // each checked correctly. See checkEligibility in handlers/mix-match.js.
        customerTags: (input?.cart?.buyerIdentity?.customer?.hasTags ?? [])
            .filter((entry) => entry?.hasTag)
            .map((entry) => String(entry.tag)),
        countryIsoCode: input?.localization?.country?.isoCode ?? null,
        campaigns,
        // Bytes each campaign metafield delivered, measured BEFORE parsing. A
        // metafield the function is not allowed to read arrives as null, which
        // after parsing is indistinguishable from a shop that simply has no
        // campaigns — both end up an empty map. The raw size is the only thing
        // that separates "no data reached us" from "data reached us and held
        // nothing", and that is the difference between a permissions problem and
        // a config problem.
        metafieldBytes,
        // Distinct reasons lines were skipped this run, printed once by
        // `cartTransformRun`. Function logs are truncated at 1 kB and a cart can
        // hold a dozen bundle lines that all skip for the same reason, so the
        // reason is logged per cause, not per line. Rebuilt every run, so it
        // never leaks across invocations.
        skipReasons: new Set(),
        // One entry per operation a handler actually emitted. A merge collapses
        // N lines into 1 and keeps none of its own arithmetic, so the numbers
        // behind the percentage are recorded here or they cannot be recovered
        // from the resulting cart at all.
        applied: [],
    };
}
