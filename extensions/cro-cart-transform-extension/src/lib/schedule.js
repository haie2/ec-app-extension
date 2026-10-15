/** BXGY's schedule is an object on the campaign config (`{ enabled, startsAt,
 * endsAt }`) and an absent one means "always on", so this fails OPEN by design:
 * a campaign the merchant never scheduled must still run. Mix & Match's
 * equivalent (`withinDateRange` below, which fails CLOSED) is not
 * interchangeable with this one. */
export function withinSchedule(schedule, today) {
    if (!schedule || schedule.enabled === false || !today) return true;
    const start = schedule.startsAt ? String(schedule.startsAt).slice(0, 10) : null;
    const end = schedule.endsAt ? String(schedule.endsAt).slice(0, 10) : null;
    if (start && today < start) return false;
    if (end && today > end) return false;
    return true;
}

/**
 * Mix & Match keeps its window as two flat `YYYY-MM-DD` strings on the bundle
 * itself (`startsAt` / `endsAt`, written by `buildMmbEnvelope` in
 * app/lib/bundle/mix-match-bundle.server.ts).
 *
 * This fails CLOSED: no `today` means no discount. That is the safe direction
 * here because Mix & Match lines are real variants Shopify already priced
 * correctly, so skipping only means the shopper pays full price.
 */
export const withinDateRange = (startsAt, endsAt, today) => {
    if (!today) return false;
    const start = startsAt ? String(startsAt).slice(0, 10) : null;
    const end = endsAt ? String(endsAt).slice(0, 10) : null;
    if (start && today < start) return false;
    if (end && today > end) return false;
    return true;
};
