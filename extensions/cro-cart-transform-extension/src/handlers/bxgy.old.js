import { withinSchedule } from "../lib/schedule.js";
import { readCroData } from "../lib/cro-data.js";

/**
 * BXGY cart-transform handler.
 *
 * The widget adds ONE parent line (the campaign's bundle parent variant, priced
 * at 0) carrying the whole offer as its `_cro_data` JSON property. This
 * handler expands that parent line into its real components with per-unit
 * prices: trigger units at full price, reward units discounted.
 *
 * Trust boundary: the parent line is priced 0, so we must ALWAYS expand it —
 * otherwise the shopper would check out the whole bundle for free. We only apply
 * the reward discount when the offer re-validates against the campaign config,
 * and we cap the number of discounted reward units to what the campaign earns.
 */
const TYPE = "bxgy";

export const bxgyHandler = {
    type: TYPE,

    /** One job per cart line: a BXGY parent line already carries the whole offer
     * in `_cro_data`, so it needs no sibling to be expanded. Grouping by
     * the line's own id is what expresses that — every line lands in a job of
     * its own. */
    groupAttribute: "id",
    groupKey: (line) => line.id,

    /** Shop-owned, plain `cro_hub` namespace, raw JSON string. Functions cannot
     * read shop-owned metafields, so this arrives null in production and every
     * BXGY campaign is skipped — see the `cartTransform` block in
     * cart_transform_run.graphql for the app-owned form that does work. */
    readCampaigns(input) {
        const raw = input?.shop?.bxgy?.value;
        return {
            campaigns: indexById(raw),
            bytes: typeof raw === "string" ? raw.length : 0,
        };
    },

    run(lines, context) {
        const [line] = lines;
        if (line.sellingPlanAllocation) return null;

        const croData = readCroData(line);
        const campaignId = croData?.campaign;
        if (!campaignId) return null;

        const components = normalizeComponents(croData?.components);
        if (!components.length) return null;

        const config = context.campaigns.get(TYPE).get(String(campaignId))?.config;
        const plan = config ? buildDiscountPlan(config, components, context.today) : null;
        const rewardProducts = config?.reward?.products ?? [];

        const expandedCartItems = [];
        let rewardBudget = plan ? plan.discountableRewardUnits : 0;

        for (const component of components) {
            const eligible = plan && component.role === "reward" && matches(component, rewardProducts);
            if (eligible && rewardBudget > 0) {
                const discounted = Math.min(component.quantity, rewardBudget);
                rewardBudget -= discounted;
                pushItem(expandedCartItems, component, discounted, component.price * (1 - plan.rate));
                pushItem(expandedCartItems, component, component.quantity - discounted, component.price);
            } else {
                pushItem(expandedCartItems, component, component.quantity, component.price);
            }
        }

        if (!expandedCartItems.length) return null;
        return { lineExpand: { cartLineId: line.id, expandedCartItems } };
    },
};

/** BXGY's envelope is a flat array of `{ id, config }` campaign entries, so the
 * map value holds the config under `.config` rather than being it. */
function indexById(raw) {
    const map = new Map();

    let entries;
    try {
        entries = raw ? JSON.parse(raw) : null;
    } catch {
        return map;
    }
    if (!Array.isArray(entries)) return map;

    for (const entry of entries) {
        if (entry?.id && entry?.config) map.set(String(entry.id), entry);
    }
    return map;
}

function buildDiscountPlan(config, components, today) {
    if (!withinSchedule(config.schedule, today)) return null;

    const minQuantity = positiveInteger(config.trigger?.minQuantity);
    const rewardQuantity = positiveInteger(config.reward?.quantity);
    if (!minQuantity || !rewardQuantity) return null;

    const autoAddGift = config.autoAddGift === true;
    const triggerProducts = config.trigger?.products ?? [];
    const rewardProducts = config.reward?.products ?? [];

    let triggerUnits = 0;
    let rewardUnits = 0;
    for (const component of components) {
        if (component.role === "trigger" && matches(component, triggerProducts)) {
            triggerUnits += component.quantity;
        } else if (component.role === "reward" && matches(component, rewardProducts)) {
            rewardUnits += component.quantity;
        }
    }

    // In-place rewards are part of what the shopper buys, so they count toward
    // the trigger threshold; cross-product gifts are counted separately.
    const buyUnits = autoAddGift ? triggerUnits : triggerUnits + rewardUnits;
    const maxSets = positiveInteger(config.maxRewardSets) || Number.MAX_SAFE_INTEGER;
    const setsByTrigger = Math.floor(buyUnits / minQuantity);
    const setsByReward = autoAddGift ? Math.floor(rewardUnits / rewardQuantity) : Number.MAX_SAFE_INTEGER;
    const sets = Math.min(setsByTrigger, setsByReward, maxSets);
    if (sets < 1) return null;

    const rate = config.reward?.discount?.type === "percentage"
        ? clamp(Number(config.reward.discount.value) || 0, 0, 100) / 100
        : 1;
    if (!(rate > 0)) return null;

    const discountableRewardUnits = Math.min(rewardQuantity * sets, rewardUnits);
    if (discountableRewardUnits < 1) return null;

    return { rate, discountableRewardUnits };
}

function normalizeComponents(list) {
    if (!Array.isArray(list)) return [];

    return list
        .map((item) => ({
            id: String(item?.id ?? ""),
            productId: String(item?.productId ?? ""),
            quantity: Math.floor(Number(item?.quantity) || 0),
            price: Math.max(0, Number(item?.price) || 0),
            role: item?.role === "reward" ? "reward" : "trigger",
        }))
        .filter((item) => item.id && item.quantity > 0);
}

function matches(component, products) {
    if (!Array.isArray(products)) return false;
    return products.some((product) => {
        if (String(product.id) !== String(component.productId)) return false;
        const variantIds = Array.isArray(product.variantIds) ? product.variantIds.map(String) : [];
        return variantIds.length === 0 || variantIds.includes(String(component.id));
    });
}

function pushItem(items, component, quantity, unitCents) {
    if (quantity <= 0) return;
    const amount = (Math.max(0, Math.round(unitCents)) / 100).toFixed(2);
    items.push({
        merchandiseId: component.id,
        quantity,
        price: { adjustment: { fixedPricePerUnit: { amount } } },
    });
}

function positiveInteger(value) {
    const parsed = Math.floor(Number(value));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
