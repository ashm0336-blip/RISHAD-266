/* Reference clock for the task-recurrence tests (tasks_recur_patterns265 · tasks_recur_last29_265). Imported FIRST, before tasks_fx:
   that fixture fixes «today» (T · DAY · NOW) and seeds the world from it when it is imported, and the worker reads Date.now() — so the
   whole test process must see one «now».
   Why: the generation horizon is ~28 days from tomorrow, and a Hijri month is 29 or 30 days. On the days whose tomorrow is the last or the
   first day of a month (about 18 days a year — e.g. 2026-11-09, tomorrow 1448-5-30) the horizon holds no month-end, and the md:"last"
   test failed by date alone. The clock keeps running in real time, shifted to a fixed anchor (10:00 Riyadh), so the run is the same on any day:
     m30 — 2026-03-03: tomorrow 1447-9-15, the horizon ends a 30-day month (1447-9-30)  · the default (tasks_recur_patterns265)
     m29 — 2026-02-01: tomorrow 1447-8-14, the horizon ends a 29-day month (1447-8-29)  · tasks_recur_last29_265 (globalThis.__KIVO_RECUR_ANCHOR)
   Only Date.now() is shifted: the worker's own clock reads go through it (its one `new Date()` is a log timestamp). */
export const RECUR_ANCHORS = { m30: Date.parse('2026-03-03T07:00:00Z'), m29: Date.parse('2026-02-01T07:00:00Z') };
export const RECUR_ANCHOR = Object.prototype.hasOwnProperty.call(RECUR_ANCHORS, globalThis.__KIVO_RECUR_ANCHOR) ? globalThis.__KIVO_RECUR_ANCHOR : 'm30';
const REAL_NOW = Date.now.bind(Date), OFFSET = RECUR_ANCHORS[RECUR_ANCHOR] - REAL_NOW();
Date.now = () => REAL_NOW() + OFFSET;
