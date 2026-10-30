import { withinSchedule } from "../lib/schedule.js";
import { readCroData } from "../lib/cro-data.js";

const TYPE = "bxgy";
const CART_LINE_BUDGET = 25;
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
            campaigns: { byId: indexCampaigns(envelope), processedLines: 0 },
            bytes: null,
        };
    },

    run(lines, context) {
        const state = context.campaigns.get(TYPE);
        if (state.processedLines + lines.length > CART_LINE_BUDGET) {
            return null;
        }
        state.processedLines += lines.length;

        const firstData = readBxgyData(lines[0]);
        if (!firstData) return null;
        const campaignId = firstData.campaign;
        const bundleId = firstData.bundle;

        const facts = [];
        for (const line of lines) {
            const data = readBxgyData(line);
            if (!data) return null;
            if (data.campaign !== campaignId) return null;
            if (line.sellingPlanAllocation) return null;
            if (line.parentRelationship) return null;
            if (line.merchandise?.__typename !== "ProductVariant") return null;
            facts.push(readFact(line, data));
        }

        const campaign = state.byId.get(campaignId);
        if (!campaign) return null;

        const parentVariantId = toNumericId(campaign.parentProduct?.variantId);
        if (!parentVariantId) return null;

        if (campaign.schedule?.enabled && !context.today) return null;
        if (!withinSchedule(campaign.schedule, context.today)) return null;

        const multiplier = bundleMultiplier(facts);
        const triggerUnits = [];
        const rewardUnits = [];
        let subtotalCents = 0;

        for (const fact of facts) {
            fact.quantity = Math.floor(fact.cartQuantity / multiplier);
            if (fact.quantity <= 0) return null;

            const itemIndex = matchItem(campaign, fact);
            if (itemIndex === NOT_OFFERED) return null;
            if (itemIndex === MATCHES_SEVERAL) return null;

            const unitsByItem = fact.role === "trigger" ? triggerUnits : rewardUnits;
            if (unitsByItem[itemIndex]) unitsByItem[itemIndex].push(fact);
            else unitsByItem[itemIndex] = [fact];
            subtotalCents += fact.unitCents * fact.cartQuantity;
        }

        const rate = presentmentRate(context);
        if (!triggerQualifies(campaign.trigger, triggerUnits, rate)) {
            return null;
        }

        const rewardCents = rewardCentsPerSet(campaign.reward, rewardUnits);
        if (rewardCents <= 0) return null;

        const sets = allowedSets(campaign, multiplier);
        if (sets <= 0) return null;

        const discountPerSet = discountCentsPerSet(campaign.reward?.discountOffer, rewardCents, rate);
        const discountCents = discountPerSet * sets;
        const percent = percentageDecrease(subtotalCents, discountCents);

        campaign.usedSets += sets;

        const cartLines = [];
        for (const fact of facts) cartLines.push({ cartLineId: fact.cartLineId, quantity: fact.quantity });

        const linesMerge = {
            parentVariantId: `${VARIANT_GID_PREFIX}${parentVariantId}`,
            cartLines,
            attributes: [
                { key: "_cro_bundle", value: bundleId },
                { key: "_cro_data", value: JSON.stringify({ type: TYPE, campaign: campaignId, bundle: bundleId, lines: facts.length }) },
            ],
        };
        if (percent > 0) linesMerge.price = { percentageDecrease: { value: percent.toFixed(6) } };

        return { linesMerge };
    },
};

const SUPPORTED_ENVELOPE_VERSION = 1;
const NOT_OFFERED = -1;
const MATCHES_SEVERAL = -2;

const indexCampaigns = (envelope) => {
    const map = new Map();
    const campaigns = envelope?.campaigns;
    if (envelope?.version !== SUPPORTED_ENVELOPE_VERSION || !Array.isArray(campaigns)) return map;

    for (const campaign of campaigns) {
        if (campaign?.id) map.set(String(campaign.id), { ...campaign, usedSets: 0, itemsByProduct: {} });
    }
    return map;
};

const toNumericId = (value) => {
    const text = String(value ?? "");
    const id = Number(text.slice(text.lastIndexOf("/") + 1));
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
    const role = parsed.role === "trigger" || parsed.role === "reward" ? parsed.role : null;
    if (!campaign || !bundle || !role) return null;

    return parsed;
};

const readFact = (line, data) => ({
    role: data.role,
    cartLineId: line.id,
    unitQuantity: Math.floor(Number(data.qty) || 0),
    cartQuantity: Math.floor(Number(line.quantity) || 0),
    quantity: 0,
    unitCents: Math.round((Number(line.cost?.amountPerQuantity?.amount) || 0) * 100),
    productGid: line.merchandise?.product?.id ?? "",
    variantGid: line.merchandise?.id ?? "",
});

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
    for (let index = 0; index < items.length; index += 1) {
        const productGid = `${PRODUCT_GID_PREFIX}${toNumericId(items[index]?.productId)}`;
        const indexes = itemsByProduct.get(productGid);
        if (indexes) indexes.push(index);
        else itemsByProduct.set(productGid, [index]);
    }
    return itemsByProduct;
};

const itemsByProductOf = (campaign, role) => {
    if (!campaign.itemsByProduct[role]) {
        const items = Array.isArray(campaign[role]?.items) ? campaign[role].items : [];
        campaign.itemsByProduct[role] = indexItemsByProduct(items);
    }
    return campaign.itemsByProduct[role];
};

const matchItem = (campaign, fact) => {
    const indexes = itemsByProductOf(campaign, fact.role).get(fact.productGid);
    if (!indexes) return NOT_OFFERED;
    return indexes.length > 1 ? MATCHES_SEVERAL : indexes[0];
};

const presentmentRate = (context) => {
    const rate = Number(context.presentmentCurrencyRate);
    return Number.isFinite(rate) && rate > 0 ? rate : 1;
};

const toPresentmentCents = (amount, rate) => Math.round(Math.round((Number(amount) || 0) * 100) * rate);

const countOf = (units) => {
    let count = 0;
    if (!units) return count;
    for (let index = 0; index < units.length; index += 1) count += units[index].quantity;
    return count;
};

const triggerQualifies = (trigger, triggerUnits, rate) => {
    const items = Array.isArray(trigger?.items) ? trigger.items : [];

    switch (trigger?.type) {
        case "fixed": {
            if (items.length === 0) return false;
            for (let index = 0; index < items.length; index += 1) {
                if (countOf(triggerUnits[index]) < positiveInteger(items[index].quantity)) return false;
            }
            return true;
        }
        case "mixMatch": {
            let units = 0;
            for (const itemUnits of triggerUnits) units += countOf(itemUnits);
            return units >= Math.max(1, positiveInteger(trigger.minQuantity));
        }
        case "spend": {
            let spentCents = 0;
            for (const itemUnits of triggerUnits) {
                if (!itemUnits) continue;
                for (let index = 0; index < itemUnits.length; index += 1) spentCents += itemUnits[index].unitCents * itemUnits[index].quantity;
            }
            return spentCents >= Math.max(1, toPresentmentCents(trigger.minAmount, rate));
        }
        default:
            return false;
    }
};

const byUnitCents = (left, right) => left.unitCents - right.unitCents;

const cheapestFirst = (units) => (units.length > 1 ? [...units].sort(byUnitCents) : units);

const cheapestCents = (units, limit) => {
    let remaining = limit;
    let cents = 0;
    for (const unit of cheapestFirst(units)) {
        if (remaining <= 0) break;
        const quantity = Math.min(unit.quantity, remaining);
        cents += unit.unitCents * quantity;
        remaining -= quantity;
    }
    return { cents, count: limit - remaining };
};

const rewardCentsPerSet = (reward, rewardUnits) => {
    const items = Array.isArray(reward?.items) ? reward.items : [];

    if (reward?.type === "fixed") {
        let total = 0;
        for (let index = 0; index < items.length; index += 1) {
            const required = positiveInteger(items[index].quantity);
            if (!required) return 0;
            const taken = cheapestCents(rewardUnits[index] ?? [], required);
            if (taken.count < required) return 0;
            total += taken.cents;
        }
        return total;
    }

    if (reward?.type === "mixMatch") {
        const eligible = [];
        for (let index = 0; index < items.length; index += 1) {
            let remaining = positiveInteger(items[index].quantity);
            for (const unit of cheapestFirst(rewardUnits[index] ?? [])) {
                if (remaining <= 0) break;
                const quantity = Math.min(unit.quantity, remaining);
                eligible.push({ unitCents: unit.unitCents, quantity });
                remaining -= quantity;
            }
        }
        return cheapestCents(eligible, positiveInteger(reward.maxQuantity)).cents;
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
