import { withinSchedule } from "../lib/schedule.js";
import { readCroData } from "../lib/cro-data.js";

const TYPE = "bxgy";
const ROLES = ["trigger", "reward"];

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
            bytes: envelope == null ? 0 : JSON.stringify(envelope).length,
        };
    },

    run(lines, context) {
        const parsed = lines.map((line) => ({ line, data: readBxgyData(line) }));
        if (parsed.some((entry) => !entry.data)) return skip(context, "line has no readable _cro_data");

        const campaignId = parsed[0].data.campaign;
        if (parsed.some((entry) => entry.data.campaign !== campaignId)) return skip(context, "lines of one bundle disagree on campaign");
        const bundleId = parsed[0].data.bundle;

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

        const multiplier = bundleMultiplier(parsed);
        const facts = readLines(parsed, multiplier);
        if (facts.some((fact) => fact.quantity <= 0)) return skip(context, "line has no usable quantity");

        const matchError = assignItems(facts, campaign);
        if (matchError) return skip(context, `campaign ${tailOf(campaignId)}: ${matchError}`);

        const rate = presentmentRate(context);
        const triggerLines = facts.filter((fact) => fact.role === "trigger");
        const rewardLines = facts.filter((fact) => fact.role === "reward");

        if (!triggerQualifies(campaign.trigger, triggerLines, rate)) {
            return skip(context, `campaign ${tailOf(campaignId)} trigger ${campaign.trigger?.type ?? "?"} not met`);
        }

        const rewardCents = rewardCentsPerSet(campaign.reward, rewardLines);
        if (rewardCents <= 0) return skip(context, `campaign ${tailOf(campaignId)} has no reward to discount`);

        const discountPerSet = discountCentsPerSet(campaign.reward?.discountOffer, rewardCents, rate);
        if (discountPerSet <= 0) return skip(context, `campaign ${tailOf(campaignId)} reward offer gives no discount`);

        const sets = allowedSets(campaign, multiplier);
        if (sets <= 0) return skip(context, `campaign ${tailOf(campaignId)} reached its repeat limit`);

        const subtotalCents = facts.reduce((total, fact) => total + fact.unitCents * fact.cartQuantity, 0);
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
                parentVariantId: `gid://shopify/ProductVariant/${parentVariantId}`,
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
        if (campaign?.id) map.set(String(campaign.id), { ...campaign, usedSets: 0 });
    }
    return map;
};

const skip = (context, reason) => {
    context.skipReasons.add(`${TYPE}/${reason}`);
    return null;
};

const tailOf = (id) => (String(id ?? "").split("/").pop() || "").slice(-6) || "?";

const toNumericId = (value) => {
    const id = Number(String(value ?? "").split("/").pop());
    return Number.isSafeInteger(id) && id > 0 ? id : 0;
};

const positiveInteger = (value) => {
    const number = Math.floor(Number(value));
    return Number.isFinite(number) && number > 0 ? number : 0;
};

const readBxgyData = (line) => {
    const parsed = readCroData(line);
    if (parsed?.type !== TYPE) return null;

    const campaign = String(parsed.campaign ?? "");
    const bundle = String(parsed.bundle ?? "");
    const role = ROLES.includes(parsed.role) ? parsed.role : null;
    if (!campaign || !bundle || !role) return null;

    return { campaign, bundle, role, unitQuantity: Math.floor(Number(parsed.qty) || 0) };
};

const bundleMultiplier = (parsed) => {
    let multiplier = 0;

    for (const { line, data } of parsed) {
        const cartQuantity = Math.floor(Number(line.quantity) || 0);
        if (data.unitQuantity <= 0 || cartQuantity <= 0) return 1;
        if (cartQuantity % data.unitQuantity !== 0) return 1;

        const factor = cartQuantity / data.unitQuantity;
        if (multiplier && factor !== multiplier) return 1;
        multiplier = factor;
    }

    return multiplier || 1;
};

const readLines = (parsed, multiplier) => parsed.map(({ line, data }) => {
    const cartQuantity = Math.floor(Number(line.quantity) || 0);
    return {
        cartLineId: line.id,
        cartQuantity,
        quantity: Math.floor(cartQuantity / multiplier),
        unitCents: Math.round((Number(line.cost?.amountPerQuantity?.amount) || 0) * 100),
        role: data.role,
        productId: toNumericId(line.merchandise?.product?.id),
        variantId: toNumericId(line.merchandise?.id),
        itemIndex: -1,
    };
});

const itemMatchesLine = (item, fact) => {
    if (toNumericId(item?.productId) !== fact.productId) return false;
    const variantIds = Array.isArray(item?.variantIds) ? item.variantIds.map(toNumericId) : [];
    return variantIds.length === 0 || variantIds.includes(fact.variantId);
};

const assignItems = (facts, campaign) => {
    for (const fact of facts) {
        const items = Array.isArray(campaign[fact.role]?.items) ? campaign[fact.role].items : [];
        const matches = items.map((item, index) => (itemMatchesLine(item, fact) ? index : -1)).filter((index) => index >= 0);
        if (matches.length === 0) return `${fact.role} line ${tailOf(fact.variantId)} is not offered`;
        if (matches.length > 1) return `${fact.role} line ${tailOf(fact.variantId)} matches more than one item`;
        fact.itemIndex = matches[0];
    }
    return null;
};

const presentmentRate = (context) => {
    const rate = Number(context.presentmentCurrencyRate);
    return Number.isFinite(rate) && rate > 0 ? rate : 1;
};

const toPresentmentCents = (amount, rate) => Math.round(Math.round((Number(amount) || 0) * 100) * rate);

const itemUnits = (lines, itemIndex) => lines
    .filter((fact) => fact.itemIndex === itemIndex)
    .map((fact) => ({ unitCents: fact.unitCents, count: fact.quantity }));

const centsOf = (units) => units.reduce((total, unit) => total + unit.unitCents * unit.count, 0);

const countOf = (units) => units.reduce((total, unit) => total + unit.count, 0);

const triggerQualifies = (trigger, triggerLines, rate) => {
    const items = Array.isArray(trigger?.items) ? trigger.items : [];

    switch (trigger?.type) {
        case "fixed":
            return items.length > 0 && items.every((item, index) => countOf(itemUnits(triggerLines, index)) >= positiveInteger(item.quantity));
        case "mixMatch": {
            const units = triggerLines.reduce((total, fact) => total + fact.quantity, 0);
            return units >= Math.max(1, positiveInteger(trigger.minQuantity));
        }
        case "spend": {
            const spentCents = triggerLines.reduce((total, fact) => total + fact.unitCents * fact.quantity, 0);
            return spentCents >= Math.max(1, toPresentmentCents(trigger.minAmount, rate));
        }
        default:
            return false;
    }
};

const cheapestUnits = (units, limit) => {
    const taken = [];
    let remaining = Math.max(0, limit);
    for (const unit of [...units].sort((left, right) => left.unitCents - right.unitCents)) {
        if (remaining <= 0) break;
        const count = Math.min(unit.count, remaining);
        taken.push({ unitCents: unit.unitCents, count });
        remaining -= count;
    }
    return taken;
};


const rewardCentsPerSet = (reward, rewardLines) => {
    const items = Array.isArray(reward?.items) ? reward.items : [];

    if (reward?.type === "fixed") {
        let total = 0;
        for (let index = 0; index < items.length; index += 1) {
            const required = positiveInteger(items[index].quantity);
            const taken = cheapestUnits(itemUnits(rewardLines, index), required);
            if (!required || countOf(taken) < required) return 0;
            total += centsOf(taken);
        }
        return total;
    }

    if (reward?.type === "mixMatch") {
        const eligible = items.flatMap((item, index) => cheapestUnits(itemUnits(rewardLines, index), positiveInteger(item.quantity)));
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
