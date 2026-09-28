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
// Everything past attribution — transport, payload shape, both event
// subscriptions — lives in ./core.

import { registerCheckoutPixel } from "./core";
import type { CroGroup, PixelApi, TrackedLine } from "./core";

// A line whose attribution carries no extension type would be dropped by every
// report (the queries filter on it). Lines written before the widgets stamped
// `ext` still arrive this way, and Mix & Match is the only extension that ever
// wrote `_cro_data` without it.
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
const trackableLines = (line: any): any[] => {
    const components = line.lineComponents ?? [];
    return components.length ? components : [line];
};

const groupLines = (lines: any[]): Map<string, CroGroup> => {
    const byRule = new Map<string, CroGroup>();

    for (const line of lines ?? []) {
        for (const source of trackableLines(line)) {
            const attribution = parseCroAttribution(source);
            if (!attribution) continue;
            // Volume Discount tags its lines with the documented `_cro_ext` /
            // `_cro_rule` pair, which the branch above happily parses. Without
            // this guard Mix & Match claimed those lines too and every Volume
            // Discount checkout sent `ext_checkout_started` twice.
            if (attribution.extensionType && attribution.extensionType !== FALLBACK_EXTENSION_TYPE) continue;

            const { ruleId } = attribution;
            const extensionType = attribution.extensionType || FALLBACK_EXTENSION_TYPE;
            const group = byRule.get(ruleId) ?? { extensionType, ruleName: attribution.ruleName, lines: [] as TrackedLine[] };
            group.lines.push({ finalLinePrice: source.finalLinePrice, quantity: source.quantity ?? 0, variant: source.variant });
            byRule.set(ruleId, group);
        }
    }
    return byRule;
};

export function registerMixMatchPixel(api: PixelApi) {
    registerCheckoutPixel(api, {
        label: "Mix & Match Pixel",
        layoutId: "cro-mix-match",
        groupLines,
    });
}
