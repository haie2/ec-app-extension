import { withinSchedule } from "../lib/schedule.js";
import { readCroData } from "../lib/cro-data.js";

const TYPE = "bxgy";
const MAX_BUNDLE_LINES = 25;
const ROLES = ["trigger", "reward"];
const PRODUCT_GID_PREFIX = "gid://shopify/Product/";
const VARIANT_GID_PREFIX = "gid://shopify/ProductVariant/";

export const bxgyHandler = {
    type: TYPE,

    groupKey: (line) => {
        const bundle = readCroData(line)?.bundle;
        return bundle ? String(bundle) : null;
    },

    readCampaigns(input) {
        const envelope = input?.cartTransform?.bxgy?.jsonValue;
        return {
            campaigns: indexCampaigns(envelope),
            bytes: null,
        };
    },

    run(lines, context) {
        if (lines.length > MAX_BUNDLE_LINES) return skip(context, `bundle has ${lines.length} lines, more than ${MAX_BUNDLE_LINES}`);

        const facts = [];
        for (const line of lines) {
            const fact = readFact(line);
            if (!fact) return skip(context, "line has no readable _cro_data");
            facts.push(fact);
        }

        const campaignId = facts[0].campaign;
        const bundleId = facts[0].bundle;
        for (const fact of facts) {
            if (fact.campaign !== campaignId) return skip(context, "lines of one bundle disagree on campaign");
        }

        const campaign = context.campaigns.get(TYPE).get(campaignId);
        if (!campaign) {
            const known = [...context.campaigns.get(TYPE).keys()].map(tailOf).join(",");
            return skip(context, `campaign ${tailOf(campaignId)} not in metafield [${known || "empty"}]`);
        }

        const parentVariantId = toNumericId(campaign.parentProduct?.variantId);
        if (!parentVariantId) return skip(context, `campaign ${tailOf(campaignId)} has no parent variant`);

        if (campaign.schedule?.enabled && !context.today) return skip(context, `campaign ${tailOf(campaignId)} is scheduled but today is unknown`);
        if (!withinSchedule(campaign.schedule, context.today)) {
            return skip(
                context,
                `campaign ${tailOf(campaignId)} outside ${campaign.schedule?.startsAt ?? "-"}..${campaign.schedule?.endsAt ?? "-"}`
                + ` (today ${context.today})`
            );
        }

        for (const line of lines) {
            if (line.sellingPlanAllocation) return skip(context, "line has a selling plan");
            if (line.parentRelationship) return skip(context, "line is already a bundle component");
            if (line.merchandise?.__typename !== "ProductVariant") return skip(context, "line is not a product variant");
        }

        const multiplier = bundleMultiplier(facts);
        for (const fact of facts) {
            fact.quantity = Math.floor(fact.cartQuantity / multiplier);
            if (fact.quantity <= 0) return skip(context, "line has no usable quantity");
        }

        const matchError = assignItems(facts, campaign);
        if (matchError) return skip(context, `campaign ${tailOf(campaignId)}: ${matchError}`);

        const rate = presentmentRate(context);
        const triggerLines = facts.filter((fact) => fact.role === "trigger");
        const rewardLines = facts.filter((fact) => fact.role === "reward");

        if (!triggerQualifies(campaign.trigger, triggerLines, groupFactsByItem(triggerLines), rate)) {
            return skip(context, `campaign ${tailOf(campaignId)} trigger ${campaign.trigger?.type ?? "?"} not met`);
        }

        const rewardCents = rewardCentsPerSet(campaign.reward, groupFactsByItem(rewardLines));
        if (rewardCents <= 0) return skip(context, `campaign ${tailOf(campaignId)} has no reward to discount`);

        const discountPerSet = discountCentsPerSet(campaign.reward?.discountOffer, rewardCents, rate);
        if (discountPerSet <= 0) return skip(context, `campaign ${tailOf(campaignId)} reward offer gives no discount`);

        const sets = allowedSets(campaign, multiplier);
        if (sets <= 0) return skip(context, `campaign ${tailOf(campaignId)} reached its repeat limit`);

        let subtotalCents = 0;
        for (const fact of facts) subtotalCents += fact.unitCents * fact.cartQuantity;
        const discountCents = discountPerSet * sets;
        const percent = percentageDecrease(subtotalCents, discountCents);
        if (percent <= 0) return skip(context, "discount rounds to 0%");

        campaign.usedSets += sets;

        context.applied.push(
            `bxgy/${tailOf(campaignId)} n=${facts.length} sets=${sets}/${multiplier}`
            + ` sub=${subtotalCents} off=${discountCents} pct=${percent.toFixed(4)}`
            + ` parent=${tailOf(parentVariantId)} inst=${bundleId}`
        );

        return {
            linesMerge: {
                parentVariantId: `${VARIANT_GID_PREFIX}${parentVariantId}`,
                cartLines: facts.map((fact) => ({ cartLineId: fact.cartLineId, quantity: fact.cartQuantity })),
                price: { percentageDecrease: { value: percent.toFixed(6) } },
                attributes: [
                    { key: "_cro_bundle", value: bundleId },
                    { key: "_cro_data", value: JSON.stringify({ type: TYPE, campaign: campaignId, bundle: bundleId }) },
                ],
            },
        };
    },
};

const SUPPORTED_ENVELOPE_VERSION = 1;

const indexCampaigns = (envelope) => {
    const map = new Map();
    const campaigns = envelope?.campaigns;
    if (envelope?.version !== SUPPORTED_ENVELOPE_VERSION || !Array.isArray(campaigns)) return map;

    for (const campaign of campaigns) {
        if (campaign?.id) map.set(String(campaign.id), { ...campaign, usedSets: 0, itemsByProduct: {} });
    }
    return map;
};

const skip = (context, reason) => {
    context.skipReasons.add(`${TYPE}/${reason}`);
    return null;
};

const tailOf = (id) => (String(id ?? "").split("/").pop() || "").slice(-6) || "?";

const toNumericId = (value) => {
    const text = String(value ?? "");
    const id = Number(text.slice(text.lastIndexOf("/") + 1));
    return Number.isSafeInteger(id) && id > 0 ? id : 0;
};

const positiveInteger = (value) => {
    const number = Math.floor(Number(value));
    return Number.isFinite(number) && number > 0 ? number : 0;
};

const readFact = (line) => {
    const parsed = readCroData(line);
    if (parsed?.type !== TYPE) return null;

    const campaign = String(parsed.campaign ?? "");
    const bundle = String(parsed.bundle ?? "");
    const role = ROLES.includes(parsed.role) ? parsed.role : null;
    if (!campaign || !bundle || !role) return null;

    return {
        campaign,
        bundle,
        role,
        cartLineId: line.id,
        unitQuantity: Math.floor(Number(parsed.qty) || 0),
        cartQuantity: Math.floor(Number(line.quantity) || 0),
        quantity: 0,
        unitCents: Math.round((Number(line.cost?.amountPerQuantity?.amount) || 0) * 100),
        productGid: String(line.merchandise?.product?.id ?? ""),
        variantId: toNumericId(line.merchandise?.id),
        itemIndex: -1,
    };
};

const bundleMultiplier = (facts) => {
    let multiplier = 0;

    for (const fact of facts) {
        if (fact.unitQuantity <= 0 || fact.cartQuantity <= 0) return 1;
        if (fact.cartQuantity % fact.unitQuantity !== 0) return 1;

        const factor = fact.cartQuantity / fact.unitQuantity;
        if (multiplier && factor !== multiplier) return 1;
        multiplier = factor;
    }

    return multiplier || 1;
};

const indexItemsByProduct = (items) => {
    const itemsByProduct = new Map();
    items.forEach((item, index) => {
        const productGid = `${PRODUCT_GID_PREFIX}${toNumericId(item?.productId)}`;
        const variantIds = Array.isArray(item?.variantIds) ? item.variantIds : [];
        const entries = itemsByProduct.get(productGid) ?? [];
        entries.push({ index, variantIds });
        itemsByProduct.set(productGid, entries);
    });
    return itemsByProduct;
};

const itemsByProductOf = (campaign, role) => {
    if (!campaign.itemsByProduct[role]) {
        const items = Array.isArray(campaign[role]?.items) ? campaign[role].items : [];
        campaign.itemsByProduct[role] = indexItemsByProduct(items);
    }
    return campaign.itemsByProduct[role];
};

const assignItems = (facts, campaign) => {
    for (const fact of facts) {
        const candidates = itemsByProductOf(campaign, fact.role).get(fact.productGid);
        let matchedIndex = -1;
        for (const candidate of candidates ?? []) {
            if (candidate.variantIds.length > 0 && !candidate.variantIds.includes(fact.variantId)) continue;
            if (matchedIndex >= 0) return `${fact.role} line ${tailOf(fact.variantId)} matches more than one item`;
            matchedIndex = candidate.index;
        }
        if (matchedIndex < 0) return `${fact.role} line ${tailOf(fact.variantId)} is not offered`;
        fact.itemIndex = matchedIndex;
    }
    return null;
};

const presentmentRate = (context) => {
    const rate = Number(context.presentmentCurrencyRate);
    return Number.isFinite(rate) && rate > 0 ? rate : 1;
};

const toPresentmentCents = (amount, rate) => Math.round(Math.round((Number(amount) || 0) * 100) * rate);

const groupFactsByItem = (roleFacts) => {
    const factsByItem = new Map();
    for (const fact of roleFacts) {
        const itemFacts = factsByItem.get(fact.itemIndex) ?? [];
        itemFacts.push(fact);
        factsByItem.set(fact.itemIndex, itemFacts);
    }
    return factsByItem;
};

const itemUnits = (factsByItem, itemIndex) => factsByItem.get(itemIndex) ?? [];

const centsOf = (units) => units.reduce((total, unit) => total + unit.unitCents * unit.quantity, 0);

const countOf = (units) => units.reduce((total, unit) => total + unit.quantity, 0);

const triggerQualifies = (trigger, triggerLines, triggerUnits, rate) => {
    const items = Array.isArray(trigger?.items) ? trigger.items : [];

    switch (trigger?.type) {
        case "fixed":
            return items.length > 0 && items.every((item, index) => countOf(itemUnits(triggerUnits, index)) >= positiveInteger(item.quantity));
        case "mixMatch":
            return countOf(triggerLines) >= Math.max(1, positiveInteger(trigger.minQuantity));
        case "spend":
            return centsOf(triggerLines) >= Math.max(1, toPresentmentCents(trigger.minAmount, rate));
        default:
            return false;
    }
};

const cheapestUnits = (units, limit) => {
    const taken = [];
    let remaining = Math.max(0, limit);
    for (const unit of [...units].sort((left, right) => left.unitCents - right.unitCents)) {
        if (remaining <= 0) break;
        const quantity = Math.min(unit.quantity, remaining);
        taken.push({ unitCents: unit.unitCents, quantity });
        remaining -= quantity;
    }
    return taken;
};

const rewardCentsPerSet = (reward, rewardUnits) => {
    const items = Array.isArray(reward?.items) ? reward.items : [];

    if (reward?.type === "fixed") {
        let total = 0;
        for (let index = 0; index < items.length; index += 1) {
            const required = positiveInteger(items[index].quantity);
            const taken = cheapestUnits(itemUnits(rewardUnits, index), required);
            if (!required || countOf(taken) < required) return 0;
            total += centsOf(taken);
        }
        return total;
    }

    if (reward?.type === "mixMatch") {
        const eligible = items.flatMap((item, index) => cheapestUnits(itemUnits(rewardUnits, index), positiveInteger(item.quantity)));
        return centsOf(cheapestUnits(eligible, positiveInteger(reward.maxQuantity)));
    }

    return 0;
};

const discountCentsPerSet = (discountOffer, rewardCents, rate) => {
    const value = Number(discountOffer?.value);
    if (!Number.isFinite(value) || value <= 0) return 0;

    if (discountOffer.type === "percentage") {
        return Math.round(rewardCents * (Math.min(100, value) / 100));
    }
    if (discountOffer.type === "fixedAmount") {
        return Math.min(toPresentmentCents(value, rate), rewardCents);
    }
    return 0;
};

const allowedSets = (campaign, multiplier) => {
    if (campaign.repeatLimit?.enabled !== true) return multiplier;
    const remaining = positiveInteger(campaign.repeatLimit.max) - campaign.usedSets;
    return Math.max(0, Math.min(multiplier, remaining));
};

const PERCENT_DECIMALS_SCALE = 1e6;

const percentageDecrease = (subtotalCents, discountCents) => {
    if (subtotalCents <= 0 || discountCents <= 0) return 0;
    const percent = (Math.min(discountCents, subtotalCents) / subtotalCents) * 100;
    return Math.min(100, Math.ceil(percent * PERCENT_DECIMALS_SCALE) / PERCENT_DECIMALS_SCALE);
};
