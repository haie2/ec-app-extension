/**
 * Every cro-bundle cart line packs its `type` plus everything its handler
 * needs into ONE JSON attribute, `_cro_data`, instead of one attribute per
 * field — the input query has a hard 3000-character deploy limit and each
 * attribute costs it a block of its own (see the top of
 * cart_transform_run.graphql).
 *
 * Returns null for anything not readable — no field here has a safe
 * default, so a null leaves the line untouched by any handler.
 */
export const readCroData = (line) => {
    const raw = line.croData?.value;
    if (typeof raw !== "string" || !raw) return null;

    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
        return null;
    }
};
