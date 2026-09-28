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
// Fixed Bundle adds its bundle product as ONE cart line (no cart-transform),
// and only that parent line carries `_cro_ext`/`_cro_campaign` — unlike Mix &
// Match, attribution itself has no fan-out. But Shopify's native Product
// Bundles feature (`productBundleCreate`, see
// app/lib/bundle/shopify-bundle.server.ts) does populate `lineComponents` on
// that line with the bundle's underlying products, so once a parent line is
// attributed, `groupLines` fans out to its components for reporting — same as
// Mix & Match's `trackableLines`, just attributed one level up.
//
// Everything past attribution — transport, payload shape, both event
// subscriptions — lives in ./core.

import { registerCheckoutPixel } from "./core";
import type { CroGroup, PixelApi, TrackedLine } from "./core";

const FALLBACK_EXTENSION_TYPE = "cro_fixed_bundle";

type CroLineAttribution = { extensionType: string | null; ruleId: string; sign?: string };

/** Fixed Bundle tags its single cart line with flat properties — `_cro_ext` /
 * `_cro_campaign` (see `_addBundleToCart` in CroFixedBundleWidget.js) — rather
 * than packing them into `_cro_data`: it adds one line with no cart-transform
 * function reading it, so there is no input-query byte budget to economize on. */
const parseCroAttribution = (line: any): CroLineAttribution | null => {
    const properties = new Map((line.properties ?? []).map((property: any) => [property.key, property.value]));

    const ruleId = properties.get("_cro_campaign") as string | undefined;
    if (!ruleId) return null;

    return {
        extensionType: (properties.get("_cro_ext") as string | undefined) ?? null,
        ruleId,
        sign: properties.get("_cro_sign") as string | undefined,
    };
};

// The parent bundle line is only where attribution lives — `lineComponents[]`
// entries carry no `_cro_ext`/`_cro_campaign` of their own. Once a parent line
// is attributed, its components (when Shopify has emitted them) are what
// actually get reported as `group.lines`, same as Mix & Match's fan-out, so
// `amount`/`quantity`/product dimensions describe the real products bought
// instead of the single wrapper SKU. A bundle with component emission off (or
// not yet synced as a native Product Bundle) falls back to the parent line
// itself, exactly like `trackableLines` in mix-match-pixel.ts.
const groupLines = (lines: any[]): Map<string, CroGroup> => {
    const byRule = new Map<string, CroGroup>();

    for (const line of lines ?? []) {
        const attribution = parseCroAttribution(line);
        if (!attribution) continue;
        // `_cro_campaign` is Fixed Bundle's own property name today, so nothing
        // else lands here — the guard is what keeps that true if another
        // extension ever adopts it, since two modules claiming one line send
        // the same checkout twice.
        if (attribution.extensionType && attribution.extensionType !== FALLBACK_EXTENSION_TYPE) continue;

        const { ruleId } = attribution;
        const extensionType = attribution.extensionType || FALLBACK_EXTENSION_TYPE;
        const group = byRule.get(ruleId) ?? { extensionType, lines: [] as TrackedLine[] };
        const components = line.lineComponents ?? [];
        const sources = components.length ? components : [line];
        // Components carry no properties of their own, so each inherits the
        // parent line's `_cro_sign`.
        for (const source of sources) {
            group.lines.push({
                finalLinePrice: source.finalLinePrice,
                quantity: source.quantity ?? 0,
                variant: source.variant,
                sign: attribution.sign,
            });
        }
        byRule.set(ruleId, group);
    }
    return byRule;
};

export function registerFixedBundlePixel(api: PixelApi) {
    registerCheckoutPixel(api, {
        label: "Fixed Bundle Pixel",
        layoutId: "cro-fixed-bundle",
        groupLines,
    });
}
