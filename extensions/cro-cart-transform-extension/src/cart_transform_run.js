import { buildContext } from "./lib/context";
import { readCroData } from "./lib/cro-data";
import { bxgyHandler } from "./handlers/bxgy";
import { mixMatchHandler } from "./handlers/mix-match";

const NO_CHANGES = { operations: [] };

/**
 * The registry is the ONLY place a cro type is named in this file. Everything
 * below deals in handlers and jobs, so a new campaign kind is added by writing
 * its handler and listing it here — no branch in this file, and none in
 * lib/context.js, has to learn about it.
 *
 * A handler declares four things about itself: its `type` (the `type` field
 * inside its lines' `_cro_data`), `groupKey`/`groupAttribute` (how much of the
 * cart it needs to see at once), `readCampaigns(input)` (where its campaign
 * metafield lives and how to index it), and `run(lines, context)`.
 */
const HANDLERS = [bxgyHandler, mixMatchHandler];
const HANDLER_BY_TYPE = new Map(HANDLERS.map((handler) => [handler.type, handler]));

/**
 * One pass over the cart, sorting every line into the job its handler will run
 * on. A job is `{ handler, lines }`, and lines land in the same job
 * when their handler returns the same `groupKey` for them: BXGY keys by the
 * line's own id so each line gets a job to itself. The key is namespaced by
 * type, so two handlers can never collide on one.
 */
function groupCartLines(lines, croDataByLine) {
    const jobsByKey = new Map();

    for (const line of lines) {
        const croData = readCroData(line);
        const croType = croData?.type;
        const handler = croType ? HANDLER_BY_TYPE.get(croType) : null;
        if (!handler) continue;

        const groupKey = handler.groupKey(line, croData);
        if (!groupKey) continue;

        croDataByLine.set(line, croData);
        const key = `${handler.type}/${groupKey}`;
        let job = jobsByKey.get(key);
        if (!job) {
            job = { handler, lines: [] };
            jobsByKey.set(key, job);
        }
        job.lines.push(line);
    }

    return [...jobsByKey.values()];
}

export function cartTransformRun(input) {
    const lines = input?.cart?.lines ?? [];
    const croDataByLine = new Map();
    const jobs = groupCartLines(lines, croDataByLine);
    if (!jobs.length) return NO_CHANGES;

    const context = buildContext(input, HANDLERS);
    context.croDataByLine = croDataByLine;
    const operations = jobs.map((job) => job.handler.run(job.lines, context)).filter(Boolean);

    return operations.length ? { operations } : NO_CHANGES;
}
