import { withinDateRange } from "../lib/schedule.js";
import { readCroData } from "../lib/cro-data.js";

/**
 * Mix & Match cart-transform handler.
 *
 * The shape is the OPPOSITE of BXGY's (handled in the same extension, in
 * handlers/bxgy.js). BXGY posts one parent line priced 0 and
 * carries the whole offer in its `_cro_data` property, so it MUST expand or
 * the shopper checks out for free. Mix & Match posts one REAL cart line per
 * selected item at Shopify's own price (`_buildCartLines` in
 * CroMixMatchBundleWidget.js) and tags them all with the same `_cro_bundle`
 * instance id — so:
 *
 *   - It groups by `_cro_bundle` (see `groupKey`), so the dispatcher hands
 *     `run` every line of one bundle instance at once and gets back a single
 *     `linesMerge`; a per-line handler physically cannot merge.
 *   - Doing nothing is SAFE. Every failed check returns no operation and the
 *     shopper pays the correct full price, so all of them fail closed.
 *   - No price is ever read from a line property. The subtotal comes from
 *     `cost.amountPerQuantity`, which is Shopify's own number, so editing line
 *     properties in the browser cannot buy the bundle cheaper.
 *
 * ONE HARD SCHEMA CONSTRAINT drives the whole discount section below:
 * `LinesMergeOperation.price` is a `PriceAdjustment`, and that input has exactly
 * one field — `percentageDecrease`. There is no fixed-price adjustment for a
 * merge (unlike `ExpandedItem`, which BXGY uses for its per-unit prices). So
 * every one of the six discount methods has to be reduced to a single
 * percentage of the bundle's real subtotal.
 */

/** Why the bundle produced no operation. Recorded per distinct reason rather
 * than per line: function logs are truncated at 1 kB and the line ids are
 * already in the dispatch trace. */
const skip = (context, reason) => {
    context.skipReasons.add(`mixMatch/${reason}`);
    return null;
};

/** The widget's group-id contract, which this must mirror exactly or every line
 * looks like it came from a group that does not exist: `normalizeGroup` labels a
 * group `group.id ?? "group-" + index` (groups added through the schema-driven
 * editor carry no id of their own), and the product page's own product, when it
 * belongs to no configured group, is added under `current-product`. */
const CURRENT_PRODUCT_GROUP_ID = "current-product";

/** The "Free product" discount's gift line, added by the widget once the bundle
 * reaches its minimum (`FREE_GIFT_GROUP_ID` in CroMixMatchBundleWidget.js). It
 * is merged with the bundle but counts toward nothing — not the minimum, not a
 * group's Min/Max — and the discount is exactly its price. */
const FREE_GIFT_GROUP_ID = "free-gift";

const TYPE = "mixMatch";

export const mixMatchHandler = {
    type: TYPE,

    /** One job per bundle instance: every line the shopper picked for one bundle
     * has to be seen together, since `linesMerge` collapses them into a single
     * line and a per-line view cannot express that. A line whose `_cro_data` is
     * missing or unreadable cannot be placed in a bundle at all and is left
     * alone. */
    groupAttribute: "_cro_data",
    groupKey: (line) => readBundleAttribute(line)?.bundle ?? null,

    /** Owned by the cartTransform node in the `$app:` namespace, and requested
     * as `jsonValue`, so this arrives already parsed — see
     * MMB_FUNCTION_METAFIELD in mix-match-bundle.server.ts. */
    readCampaigns(input) {
        const envelope = input?.cartTransform?.mixMatch?.jsonValue;
        return {
            campaigns: indexBundles(envelope),
            bytes: envelope == null ? 0 : JSON.stringify(envelope).length,
        };
    },

    run(lines, context) {
        // Parsed ONCE here and threaded through the rest of the run: `_cro_data`
        // is a JSON string, and re-parsing it per check would cost the same work
        // several times over on a cart that can hold hundreds of lines.
        const parsed = lines.map((line) => ({ line, mm: readBundleAttribute(line) }));
        if (parsed.some((entry) => !entry.mm)) return skip(context, "line has no readable _cro_data");

        const campaignId = sharedCampaignId(parsed);
        if (!campaignId) return skip(context, "lines of one bundle disagree on campaign");

        // The dispatcher grouped these lines BY this value, so every line carries
        // the same one — see `groupKey` above.
        const bundleInstanceId = parsed[0].mm.bundle;

        // The map holds each bundle's settings directly — the map value IS the
        // config (see `indexBundles`).
        const config = context.campaigns.get(TYPE).get(campaignId);
        if (!config) {
            // The ids the metafield DID carry, so one run tells the two causes
            // apart: an empty list means no campaign data reached the function
            // (see `metafieldBytes`), a non-empty one means this cart names a
            // bundle that is no longer active.
            const known = [...context.campaigns.get(TYPE).keys()].map(tailOf).join(",");
            return skip(context, `campaign ${tailOf(campaignId)} not in metafield [${known || "empty"}]`);
        }

        const parentVariantId = config.bundleParent?.variantId;
        if (!parentVariantId) return skip(context, `campaign ${campaignId} has no bundleParent variant`);

        // The window and today are both in the reason: `withinDateRange` fails
        // CLOSED on a missing `today`, and "no local time" looks identical to
        // "expired campaign" unless the values are printed.
        if (!withinDateRange(config.startsAt, config.endsAt, context.today)) {
            return skip(
                context,
                `campaign ${tailOf(campaignId)} outside ${config.startsAt ?? "-"}..${config.endsAt ?? "-"}`
                + ` (today ${context.today ?? "unknown"})`
            );
        }

        const eligibilityReason = checkEligibility(config.eligibility, context);
        if (eligibilityReason) return skip(context, `campaign ${tailOf(campaignId)} ineligible: ${eligibilityReason}`);

        for (const line of lines) {
            // Shopify rejects every operation on a selling-plan line, and a
            // merge is all-or-nothing: one such line kills the whole bundle.
            if (line.sellingPlanAllocation) return skip(context, "line has a selling plan");
            // Already a component of another bundle — merging again would nest.
            if (line.parentRelationship) return skip(context, "line is already a bundle component");
            if (line.merchandise?.__typename !== "ProductVariant") return skip(context, "line is not a product variant");
        }

        const multiplier = bundleMultiplier(parsed);
        const facts = readLines(parsed, multiplier);
        if (!facts.lines.length) return skip(context, "no line with a usable quantity");

        const groupIndex = indexGroups(config);
        const membership = checkMembership(facts.lines, groupIndex, config.discount);
        if (membership) return skip(context, membership);

        const gate = checkGroupGates(facts, groupIndex);
        if (gate) return skip(context, gate);

        const rate = presentmentRate(context);
        const method = config.discount?.method ?? "none";
        const discountCents = computeDiscountCents(config.discount, facts, rate);
        if (discountCents <= 0) {
            return skip(
                context,
                `campaign ${tailOf(campaignId)} method ${method} qualifies for no discount`
                + ` (qty ${facts.totalQuantity}, sub ${facts.subtotalCents})`
            );
        }

        const percent = percentageDecrease(facts.subtotalCents, discountCents);
        if (percent <= 0) return skip(context, "discount rounds to 0%");

        const merge = {
            parentVariantId,
            cartLines: facts.lines.map((line) => ({ cartLineId: line.cartLineId, quantity: line.cartQuantity })),
            price: { percentageDecrease: { value: percent.toFixed(6) } },
            // Without this the cart collapses two bundle instances of the SAME
            // items into one line of quantity 2: both merges use the same parent
            // variant, title and percentage, so two merges of an identical
            // selection are indistinguishable. The
            // instance id is the one thing that differs, and an `_`-prefixed key
            // stays hidden in the cart and checkout line display.
            attributes: [{ key: "_cro_bundle", value: bundleInstanceId }],
        };

        // No `title`/`image` on the merge, deliberately: each campaign has its own
        // parent product whose title and image the merchant sets in the builder
        // (`parent_title` / `parent_image`, written onto that product server-side),
        // and Shopify shows the parent's own name and picture on the merged line
        // when the operation omits them.

        // Everything the merge is about to hide. `pct` is what Shopify actually
        // applies; `off` is what the widget promised the shopper. The two must
        // agree to within a cent, and this line is the only place that can be
        // checked after the fact.
        context.applied.push(
            `mixMatch/${tailOf(campaignId)} m=${method} n=${facts.lines.length} qty=${facts.totalQuantity}x${multiplier}`
            + ` sub=${facts.subtotalCents} off=${discountCents} pct=${percent.toFixed(4)}`
            + ` parent=${tailOf(parentVariantId)}`
            + ` inst=${bundleInstanceId}`
        );

        return { linesMerge: merge };
    },
};


/**
 * The envelope is `{ version, collectionIds, tags, customerTags, bundles: [...] }`,
 * and each bundle holds its settings flat (`groups`, `discount`, `eligibility`,
 * `startsAt`, …) with no `config` wrapper — so the map value here IS the
 * config, unlike BXGY's map where it sits under `.config`.
 * `collectionIds`/`tags`/`customerTags` are not read here at all: they exist
 * for the TOML-declared input query variables of the same names, which is why
 * the same metafield carries all three.
 */
function indexBundles(envelope) {
    const map = new Map();
    const bundles = envelope?.bundles;
    if (!Array.isArray(bundles)) return map;

    for (const bundle of bundles) {
        if (bundle?.id) map.set(String(bundle.id), bundle);
    }
    return map;
}

/** Ids are logged by their tail, not in full: campaign ids are 24-char
 * ObjectIds that share their leading timestamp bytes, and Shopify truncates
 * function logs at 1 kB per run. The tail is both the shorter and the more
 * distinguishing half. */
const tailOf = (id) => (String(id ?? "").split("/").pop() || "").slice(-6) || "?";

/**
 * Mix & Match's own fields off the line's `_cro_data`, written by
 * `_buildCartLines` in CroMixMatchBundleWidget.js as
 * `{"type","campaign","bundle","group","qty"}`.
 *
 * Returns null for anything not fully readable — no field here has a safe
 * default, and a null makes the line unbundlable rather than mis-bundled.
 */
const readBundleAttribute = (line) => {
    const parsed = readCroData(line);
    if (!parsed) return null;

    const campaign = String(parsed.campaign ?? "");
    const bundle = String(parsed.bundle ?? "");
    const unitQuantity = Math.floor(Number(parsed.qty) || 0);
    if (!campaign || !bundle) return null;

    return { campaign, bundle, group: String(parsed.group ?? ""), unitQuantity };
};

/** Every line of one bundle instance must name the same campaign — a cart where
 * they disagree was hand-edited, so nothing is trusted from it. */
const sharedCampaignId = (parsed) => {
    const first = parsed[0].mm.campaign;
    for (const entry of parsed) {
        if (entry.mm.campaign !== first) return null;
    }
    return first;
};

/**
 * How many complete bundle sets these cart lines represent.
 *
 * Shopify IGNORES `LinesMergeOperation.cartLines[].quantity`: it merges each
 * line's FULL quantity into one parent line and derives that parent's own
 * quantity itself. So when a shopper raises the merged line to 3, every
 * component quantity is multiplied by 3 and this function re-runs on the
 * tripled cart — which, with nothing to compare against, looks exactly like a
 * shopper who picked three times as much of everything. Every absolute-amount
 * method would then be applied ONCE for what is really three bundles ($15 off
 * three bundles), and `bundle` would be worse than that: a $99 bundle price
 * would price all three sets at $99 together.
 *
 * `_cro_data`'s `qty` is the per-set quantity the widget wrote at add-to-cart
 * time (`_buildCartLines`), and the multiplier is what every line has been
 * scaled by since. Returns 1 — i.e. the behaviour from before that field
 * existed — whenever the lines do not ALL scale by the same whole factor: an
 * older cart whose lines carry no `qty`, or a shopper who edited one component
 * line on its own. Failing to 1 only ever under-applies the discount, so it
 * fails closed.
 */
const bundleMultiplier = (parsed) => {
    let multiplier = 0;

    for (const { line, mm } of parsed) {
        const unitQuantity = mm.unitQuantity;
        const cartQuantity = Math.floor(Number(line.quantity) || 0);
        if (unitQuantity <= 0 || cartQuantity <= 0) return 1;
        if (cartQuantity % unitQuantity !== 0) return 1;

        const factor = cartQuantity / unitQuantity;
        if (multiplier && factor !== multiplier) return 1;
        multiplier = factor;
    }

    return multiplier || 1;
};

/**
 * Everything the discount math needs, all of it from Shopify's own numbers.
 * `amountPerQuantity` is a decimal string in the PRESENTMENT currency; cents are
 * used from here on so no step accumulates float drift.
 *
 * Every quantity here is for ONE bundle set (the cart quantity divided by
 * `multiplier`), so both the group gates and the discount describe a single
 * bundle no matter how many sets the shopper bought. `cartQuantity` keeps the
 * real cart figure, which is what the merge operation itself has to name.
 */
const readLines = (parsed, multiplier) => {
    const read = [];
    let subtotalCents = 0;
    let totalQuantity = 0;
    let giftCents = 0;
    let giftQuantity = 0;
    const quantityByGroup = new Map();

    for (const { line, mm } of parsed) {
        const cartQuantity = Math.floor(Number(line.quantity) || 0);
        const quantity = Math.floor(cartQuantity / multiplier);
        const unitCents = Math.round((Number(line.cost?.amountPerQuantity?.amount) || 0) * 100);
        // A 0-priced line (a free gift the merchant added to a group) is still
        // part of the bundle and has to be merged with the rest — only a
        // quantity-less line is meaningless.
        if (quantity <= 0) continue;

        const groupId = mm.group;
        const collectionIds = (line.merchandise?.inCollections ?? [])
            .filter((membership) => membership?.isMember)
            .map((membership) => String(membership.collectionId));
        const tags = (line.merchandise?.product?.hasTags ?? [])
            .filter((response) => response?.hasTag)
            .map((response) => String(response.tag));
        read.push({
            cartLineId: line.id,
            quantity,
            cartQuantity,
            unitCents,
            groupId,
            variantId: String(line.merchandise?.id ?? ""),
            productId: String(line.merchandise?.product?.id ?? ""),
            vendor: String(line.merchandise?.product?.vendor ?? ""),
            productType: String(line.merchandise?.product?.productType ?? ""),
            collectionIds,
            tags,
        });

        // The gift is part of the merge and of the subtotal the percentage is
        // taken from, but not of anything the shopper has to reach.
        subtotalCents += unitCents * quantity;
        if (groupId === FREE_GIFT_GROUP_ID) {
            giftCents += unitCents * quantity;
            giftQuantity += quantity;
            continue;
        }
        totalQuantity += quantity;
        quantityByGroup.set(groupId, (quantityByGroup.get(groupId) || 0) + quantity);
    }

    // `itemsSubtotalCents` — the subtotal without the gift — is what an amount
    // minimum and an amount tier are measured against.
    return {
        lines: read,
        subtotalCents,
        itemsSubtotalCents: subtotalCents - giftCents,
        totalQuantity,
        quantityByGroup,
        giftCents,
        giftQuantity,
    };
};

const indexGroups = (config) => {
    const map = new Map();
    const groups = Array.isArray(config.groups) ? config.groups : [];
    groups.forEach((group, index) => map.set(String(group?.id ?? `group-${index}`), group));
    return map;
};

/**
 * Returns a skip reason, or null when every line may stay in the bundle.
 *
 * A group's sources are five kinds (`product`, `collection`, `vendor`,
 * `product_type`, `tag`), and all five are now verifiable against the input
 * query: `product` via `resourceId`/`variantIds`, `collection` via
 * `merchandise.inCollections` (fed by `$collectionIds`), `vendor`/`product_type`
 * via the plain scalar fields on `merchandise.product`, and `tag` via
 * `merchandise.product.hasTags` (fed by `$tags`) — see `readLines` for how each
 * is captured per line, and `mix-match-bundle.server.ts`'s
 * `collectGroupCollectionIds`/`collectGroupTags` for how the candidate lists
 * reach the metafield in the first place.
 *
 * An item type this version doesn't recognise means the campaign was written by
 * a newer cro-hub than the deployed extension. There is nothing on the line to
 * compare such an item to, so the whole bundle is skipped rather than accepting
 * lines it cannot verify — a discount that silently covers products outside the
 * campaign is worse than one that doesn't apply.
 */
const checkMembership = (lines, groupIndex, discount) => {
    // Only a variant of the configured gift (one the merchant offers, when they
    // narrowed it), once per bundle set, and only for the "free" method —
    // anything else claiming the gift group was hand-made.
    const freeProduct = discount?.method === "free" ? discount.freeProduct : null;
    const giftProductId = String(freeProduct?.id ?? "");
    const giftVariantIds = Array.isArray(freeProduct?.variantIds) ? freeProduct.variantIds.map(String) : [];
    let giftLines = 0;
    for (const line of lines) {
        if (line.groupId === CURRENT_PRODUCT_GROUP_ID) continue;
        if (line.groupId === FREE_GIFT_GROUP_ID) {
            giftLines += 1;
            const isGiftVariant = Boolean(giftProductId)
                && line.productId === giftProductId
                && (giftVariantIds.length === 0 || giftVariantIds.includes(line.variantId));
            if (!isGiftVariant) return "free gift line is not this campaign's gift";
            if (line.quantity !== 1 || giftLines > 1) return "free gift appears more than once per bundle set";
            continue;
        }

        const group = groupIndex.get(line.groupId);
        if (!group) return `line names group "${line.groupId}" which the campaign has no longer`;

        if (isExcluded(group, line)) return `line is in group "${line.groupId}" exclude list`;

        const items = Array.isArray(group.items) ? group.items : [];
        const unverifiable = items.find((item) => !KNOWN_GROUP_ITEM_TYPES.has(item?.type));
        if (unverifiable) {
            return `group "${line.groupId}" holds item type "${unverifiable?.type}" this extension cannot verify`;
        }
        if (!items.some((item) => matchesGroupItem(item, line))) {
            return `line is not offered by group "${line.groupId}"`;
        }
    }

    return null;
};

const KNOWN_GROUP_ITEM_TYPES = new Set(["product", "collection", "vendor", "product_type", "tag"]);

const matchesGroupItem = (item, line) => {
    switch (item?.type) {
        case "collection":
            return matchesCollectionItem(item, line);
        case "vendor":
            return matchesValuesItem(item, line.vendor);
        case "product_type":
            return matchesValuesItem(item, line.productType);
        case "tag":
            return matchesValuesItem(item, null, line.tags);
        case "product":
            return matchesProductItem(item, line);
        default:
            return false;
    }
};

const matchesProductItem = (item, line) => {
    const productId = String(item?.resourceId ?? item?.id ?? "");
    if (productId !== line.productId) return false;
    const variantIds = Array.isArray(item?.variantIds) ? item.variantIds.map(String) : [];
    return variantIds.length === 0 || variantIds.includes(line.variantId);
};

const matchesCollectionItem = (item, line) => {
    const collectionId = String(item?.resourceId ?? item?.id ?? "");
    return line.collectionIds.includes(collectionId);
};

/** `vendor`/`product_type` match when the line's single value is among the
 * item's candidates; `tag` matches when the line's tag list overlaps them —
 * `hasAnyTag` semantics, mirroring the widget's own "any of these tags". */
const matchesValuesItem = (item, singleValue, listValue) => {
    const candidates = Array.isArray(item?.values) ? item.values.map(String) : [];
    if (listValue) return listValue.some((value) => candidates.includes(value));
    return candidates.includes(singleValue);
};

const isExcluded = (group, line) => {
    const excluded = Array.isArray(group.excludeProducts) ? group.excludeProducts : [];
    return excluded.some((entry) => {
        if (entry?.variantId) return String(entry.variantId) === line.variantId;
        return String(entry?.id ?? "") === line.productId;
    });
};

/**
 * Returns a skip reason, or null when the buyer qualifies for the campaign.
 *
 * Fails CLOSED on the one case that cannot be told apart from a real miss:
 * `customerScope: "new"` needs `customerNumberOfOrders`, which is null for a
 * guest (no `buyerIdentity.customer`) — a guest is therefore never "new"
 * rather than assumed to be.
 *
 * `tagged` checks this campaign's own `eligibility.customerTags` against
 * `context.customerTags` — the customer's tags among the input query's
 * `$customerTags` union (see MIX_MATCH_FLOW.md §2.4 for why that variable is a
 * dedup union across every tagged-scope bundle in the cart). Each bundle is
 * still checked against its OWN required list, so two bundles live at once
 * with DIFFERENT required tags are each judged correctly.
 */
const checkEligibility = (eligibility, context) => {
    if (!eligibility) return null;

    switch (eligibility.customerScope) {
        case "logged_in":
            if (!context.isAuthenticated) return "customer not logged in";
            break;
        case "new":
            if (context.customerNumberOfOrders !== 0) return "customer is not new";
            break;
        case "tagged": {
            const required = Array.isArray(eligibility.customerTags) ? eligibility.customerTags : [];
            if (required.length && !required.some((tag) => context.customerTags.includes(tag))) {
                return "customer has none of the required tags";
            }
            break;
        }
        default:
            break;
    }

    const countries = Array.isArray(eligibility.countries) ? eligibility.countries : [];
    if (countries.length && !countries.includes(context.countryIsoCode)) {
        return "customer country not in selected list";
    }

    return null;
};

/** Per-group Min/Max, checked against EVERY configured group — a group left
 * empty still has to satisfy its own minimum, which is what stops a partial
 * bundle from earning the full-bundle discount. */
const checkGroupGates = (facts, groupIndex) => {
    for (const [groupId, group] of groupIndex) {
        const quantity = facts.quantityByGroup.get(groupId) || 0;
        const min = Math.floor(Number(group?.min) || 0);
        if (quantity < min) return `group "${groupId}" needs ${min}, cart has ${quantity}`;

        if (group?.max == null) continue;
        const max = Math.floor(Number(group.max));
        if (Number.isFinite(max) && quantity > max) return `group "${groupId}" allows ${max}, cart has ${quantity}`;
    }
    return null;
};

/** Cart money is in the presentment currency; campaign money is in the shop's.
 * A missing or nonsensical rate is treated as 1:1 rather than as a reason to
 * skip — on a single-currency shop it is exactly 1 anyway. */
const presentmentRate = (context) => {
    const rate = Number(context.presentmentCurrencyRate);
    return Number.isFinite(rate) && rate > 0 ? rate : 1;
};

/** Config money fields are plain currency units in the SHOP currency; prices
 * here are cents in the PRESENTMENT currency. */
const toPresentmentCents = (amount, rate) => Math.round((Number(amount) || 0) * 100 * rate);

/** Back to shop currency units, for comparing against a config threshold. */
const toShopUnits = (cents, rate) => cents / 100 / rate;

/** Every method defaults to 0 until the merchant types a number, and a method
 * left at its default must apply NOTHING rather than its degenerate case (a $0
 * bundle price giving the bundle away, "0 free items", …). Mirrors
 * `isConfiguredAmount` in the widget. */
const isConfigured = (value) => {
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0;
};

/** Units the bundle must hold before "cheapest" applies, so the single cheapest
 * one never discounts itself. Only an amount minimum asks for it
 * (`minQtyInBundle`); a quantity minimum already floors at 2. */
const cheapestMinimumItems = (discount) =>
    discount.minBasis === "amount" ? Math.max(2, Math.floor(Number(discount.minQtyInBundle) || 2)) : 2;

/** "Cheapest item" by quantity needs 2+ items so one stays at full price — the
 * builder enforces it on the field, this keeps older saves behaving the same. */
const quantityMinimumToQualify = (discount) => {
    const minimum = Number(discount.minValue) || 0;
    return discount.method === "cheapest" ? Math.max(2, minimum) : minimum;
};

/**
 * Discount in cents. This MUST agree with `computeDiscount` in
 * CroMixMatchBundleWidget.js — that function shows the shopper a number, this
 * one is what they are actually charged, and a mismatch is a support ticket.
 *
 * Both sides work in presentment cents and convert every config amount with
 * the same `toPresentmentCents` / `toShopUnits` pair — the widget takes its
 * rate from `window.Shopify.currency.rate`, this one from
 * `presentmentCurrencyRate` on the cart input.
 */
const computeDiscountCents = (discount, facts, rate) => {
    if (!discount) return 0;
    const { subtotalCents, itemsSubtotalCents, totalQuantity } = facts;

    if (discount.method === "tiers") {
        const metric = discount.tierBasis === "total_amount" ? toShopUnits(itemsSubtotalCents, rate) : totalQuantity;
        const tier = qualifyingTier(discount.tiers, metric);
        if (!tier) return 0;
        const amount = tier.type === "percentage"
            ? Math.round(subtotalCents * (Number(tier.value) || 0) / 100)
            : toPresentmentCents(tier.value, rate);
        return clampToSubtotal(amount, subtotalCents);
    }

    const qualifies = discount.minBasis === "amount"
        ? toShopUnits(itemsSubtotalCents, rate) >= (Number(discount.minValue) || 0)
        : totalQuantity >= quantityMinimumToQualify(discount);
    if (!qualifies) return 0;

    switch (discount.method) {
        case "percentage":
            if (!isConfigured(discount.pct)) return 0;
            return clampToSubtotal(Math.round(subtotalCents * Number(discount.pct) / 100), subtotalCents);

        case "fixed":
            if (!isConfigured(discount.fixed)) return 0;
            return clampToSubtotal(toPresentmentCents(discount.fixed, rate), subtotalCents);

        case "bundle":
            if (!isConfigured(discount.bundlePrice)) return 0;
            return clampToSubtotal(subtotalCents - toPresentmentCents(discount.bundlePrice, rate), subtotalCents);

        case "free":
            // No gift line in the cart (the shopper removed it) means nothing to
            // give away; an empty bundle never earns it, whatever the minimum.
            if (totalQuantity <= 0 || facts.giftCents <= 0) return 0;
            return clampToSubtotal(facts.giftCents, subtotalCents);

        case "cheapest": {
            if (!isConfigured(discount.cheapPct)) return 0;
            if (totalQuantity < cheapestMinimumItems(discount)) return 0;
            const cheapestTotal = cheapestUnitsTotal(facts.lines, 1);
            return clampToSubtotal(Math.round(cheapestTotal * Number(discount.cheapPct) / 100), subtotalCents);
        }

        default:
            return 0;
    }
};

/** Highest tier the metric has reached, or null — same rule as `qualifyingTier`
 * in the widget. */
const qualifyingTier = (tiers, metric) =>
    (Array.isArray(tiers) ? tiers : [])
        .filter((tier) => metric >= (Number(tier?.threshold) || 0))
        .sort((left, right) => (Number(right.threshold) || 0) - (Number(left.threshold) || 0))[0] || null;

/** Total of the `units` cheapest units in the bundle, where a line of quantity 3
 * is three units at that line's own price. Walks the lines cheapest-first
 * instead of materialising one entry per unit — a cart line can hold 2000. */
const cheapestUnitsTotal = (lines, units) => {
    let remaining = Math.max(0, units);
    let total = 0;
    for (const line of [...lines].sort((left, right) => left.unitCents - right.unitCents)) {
        if (remaining <= 0) break;
        const taken = Math.min(line.quantity, remaining);
        total += taken * line.unitCents;
        remaining -= taken;
    }
    return total;
};

const clampToSubtotal = (cents, subtotalCents) => Math.min(Math.max(0, cents), subtotalCents);

/**
 * The percentage `linesMerge` will actually apply.
 *
 * Returns a number; the caller formats it. Six decimals, not two: the operation
 * can only express a percentage, so a
 * discount the merchant entered as a round amount (`$15 off`, `bundle price
 * $99`) has to be re-expressed as a fraction of the subtotal, and a coarse
 * percentage would land whole cents away from the amount the widget showed. Six
 * decimals keeps a cart worth up to ~$10,000 within a cent. A sub-cent
 * difference from the widget's figure is inherent to having no fixed-price
 * adjustment for merges and cannot be removed here.
 */
const percentageDecrease = (subtotalCents, discountCents) => {
    if (subtotalCents <= 0 || discountCents <= 0) return 0;
    const percent = (Math.min(discountCents, subtotalCents) / subtotalCents) * 100;
    return Math.min(100, Math.max(0, percent));
};
