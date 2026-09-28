// Synced into the parent app's existing Web Pixel Extension
// (extensions/e-composer-pixel/src/) — see share-extensions/sync-manifest.json
// `pixelModules` and scripts/sync-widgets.js `syncPixelModules`. A Web Pixel
// bundle only supports ONE top-level `register()` call, so this file must NOT
// call `register()` itself — it exports `registerVolumeDiscountPixel`, which
// index.ts imports and calls, same pattern as `fixed-bundle-pixel.ts`.
//
// Volume Discount never adds its own cart line — the widget only bumps the
// quantity on the theme's own add-to-cart form for the product being viewed
// (see `applyCroAttribution`/`handleThemeFormSubmit` in
// VolumeDiscountWidget.js) and tags that form's hidden inputs with
// `_cro_ext`/`_cro_rule`. There is no cart-transform and no
// `lineComponents` fan-out — attribution is 1:1 with the cart line, exactly
// like Fixed Bundle's parent-line case.
//
// Everything past attribution — transport, payload shape, both event
// subscriptions — lives in ./core.

import { registerCheckoutPixel } from "./core";
import type { CroGroup, PixelApi } from "./core";

const EXTENSION_TYPE = "volume_discount";
const LOG_LABEL = "Volume Discount Pixel";

/** Every discount this extension's Shopify Function applies carries `EC-VD` in
 * its checkout message. Attribution properties alone are not enough: a line
 * keeps its `_cro_*` properties even after the function stops discounting it
 * (tier no longer earned, campaign paused), and reporting those lines credits
 * the rule with revenue it did not create. */
const DISCOUNT_TITLE_MARKER = "EC-VD";

const hasVolumeDiscountAllocation = (line: any): boolean =>
    (line.discountAllocations ?? []).some((allocation: any) =>
        String(allocation?.discountApplication?.title ?? "").includes(DISCOUNT_TITLE_MARKER),
    );

type CroLineAttribution = { extensionType: string | null; ruleId: string; viaCroData: boolean; sign?: string };

/** `_cro_ext` / `_cro_rule` — the property contract every extension's line
 * attribution follows (docs/CRO_REVENUE_INTEGRATION.md), unlike Fixed Bundle's
 * older `_cro_ext`/`_cro_campaign` pair. The contract's optional `_cro_tier` is
 * not read: the widget rides the theme's own add-to-cart form, which can submit
 * at any moment, so no tier stamped there reliably describes the order. */
const parseCroAttribution = (line: any): CroLineAttribution | null => {
    const properties = new Map((line.properties ?? []).map((property: any) => [property.key, property.value]));

    const sign = properties.get("_cro_sign") as string | undefined;

    const ruleId = properties.get("_cro_rule") as string | undefined;
    if (ruleId) {
        return { extensionType: (properties.get("_cro_ext") as string | undefined) ?? null, ruleId, viaCroData: false, sign };
    }

    // Gift / add-on lines are added by the widget itself (`giftAddonCartItems`),
    // which packs its attribution into `_cro_data` instead of the property pair
    // above. Without this branch those lines are in the order but in no rule's
    // group, so the rule is reported as having earned less than it did.
    const rawCroData = properties.get("_cro_data") as string | undefined;
    if (!rawCroData) {
        return null;
    }

    try {
        const parsed = JSON.parse(rawCroData) as { type?: string; campaignId?: string | number };
        if (parsed.type !== "volumeDiscount" || !parsed.campaignId) {
            return null;
        }
        return { extensionType: EXTENSION_TYPE, ruleId: String(parsed.campaignId), viaCroData: true, sign };
    } catch {
        return null;
    }
};

/** Rule ids whose actual discounted product line survived to this checkout —
 * i.e. carries `_cro_rule` (not a `_cro_data` gift/add-on line) AND still has
 * the `EC-VD` allocation. Shipping/customer eligibility can strip the
 * discounted product itself (out-of-zone destination, etc.) while the
 * gift/add-on line the widget added earlier stays in the cart — a gift line
 * with no surviving main line is not revenue for that rule and must not be
 * grouped under it. */
const ruleIdsWithSurvivingMainLine = (lines: any[]): Set<string> => {
    const ruleIds = new Set<string>();
    for (const line of lines ?? []) {
        const attribution = parseCroAttribution(line);
        if (!attribution || attribution.viaCroData) continue;
        if (attribution.extensionType && attribution.extensionType !== EXTENSION_TYPE) continue;
        if (!hasVolumeDiscountAllocation(line)) continue;
        ruleIds.add(attribution.ruleId);
    }
    return ruleIds;
};

const groupLines = (lines: any[]): Map<string, CroGroup> => {
    const byRule = new Map<string, CroGroup>();
    const ruleIdsWithMainLine = ruleIdsWithSurvivingMainLine(lines);

    for (const line of lines ?? []) {
        const attribution = parseCroAttribution(line);
        if (!attribution) continue;
        // Gift/add-on lines carry their own dedicated discount title ("Free
        // gift", "Add-on discount"), never the `EC-VD` marker — `_cro_data`
        // itself is already the widget's attribution, so the marker check
        // only applies to the flat `_cro_rule` path below.
        if (!attribution.viaCroData && !hasVolumeDiscountAllocation(line)) {
            continue;
        }
        // A line another extension tagged carries its own `_cro_rule`; claiming
        // it here would report the same checkout twice, once per extension.
        if (attribution.extensionType && attribution.extensionType !== EXTENSION_TYPE) {
            continue;
        }
        if (attribution.viaCroData && !ruleIdsWithMainLine.has(attribution.ruleId)) {
            continue;
        }
        // A fully-discounted line (100% off, or a $0 gift/add-on whose value the
        // merchant zeroed out) carries no revenue — counting it would report
        // real quantity/product attribution for money that was never charged.
        if (Number(line.finalLinePrice?.amount ?? 0) === 0) {
            continue;
        }

        const { ruleId } = attribution;
        const group = byRule.get(ruleId) ?? { extensionType: attribution.extensionType || EXTENSION_TYPE, lines: [] };
        group.lines.push({
            finalLinePrice: line.finalLinePrice,
            quantity: line.quantity ?? 0,
            variant: line.variant,
            sign: attribution.sign,
        });
        byRule.set(ruleId, group);
    }

    return byRule;
};

export function registerVolumeDiscountPixel(api: PixelApi) {
    registerCheckoutPixel(api, {
        label: LOG_LABEL,
        layoutId: "cro-volume-discount",
        groupLines,
    });
}
