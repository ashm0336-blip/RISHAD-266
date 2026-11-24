# tests/load — load test for the S1 world (package 53, addendum 2 §أ.4)

These are measurements, not assertions. Group «loadtest» extends this harness (browser timings, Preview, more pages).

## Files
- `s1_world.mjs`: generator and seeder for a TEST_ONLY department (`TEST_ONLY_A` in the lab). The data is synthetic only.
  - 500 employees.
  - A plan of `PLAN_M` months, with 2 sites. Each site has zones (with need and priority), gates, marks and paths.
  - A monthly schedule of `STF_M` months: 4 shifts, rest days, leaves and permissions.
  - Every day of the last `DAYS` days: rounds with prayer readings (`pc{n,cap}`), a daily report with every employee rostered by shift, and tasks.
  - Seeding uses the worker's own codec (`ocConvert` / `ocPhysicalRows`) and writes straight into SQLite, period chunk by period chunk, so two years never sit in memory at once. Live `/api/save` of whole documents collapses at this size, which is the "before" evidence.
- `s1_run.mjs`: the measurement run. It covers:
  - every page as the current client reads it (logical keys);
  - every page by period (the contract in `scratchpad/d7/periods_api.md`);
  - «صفحتي» (`/api/me`) as an employee;
  - month ranges and the KPI summaries for 24 months;
  - the phase-2 rebuild;
  - day and month saves in the first and the last month;
  - concurrent saves while reads run;
  - a whole-document save;
  - the image-drop proof query (`rsImageHeldSql`) on this world, and a site-with-map delete.

  The run is done under real D1 ceilings (`D1Shim.limits`: 32 MiB per call by `v8.serialize`, SQL 100 KB, 100 params, 2 MB value).

## Run
```
node --max-old-space-size=6144 tests/load/s1_run.mjs                                  # after (this tree)
KIVO_WORKER=<path to an older _worker.js> node --max-old-space-size=6144 tests/load/s1_run.mjs   # before (e.g. git show 3486e01:workers/_worker.js)
```
Environment variables:
- `EMP` (500), `PLAN_M` (26), `STF_M` (24), `DAYS` (730), `ZONES` (12 per site), `TASKS` (6 per day): the size of the world.
- `REPEAT` (3): how many times each page opens; p95 is reported over these.
- `LIMITS=0`: run without the D1 ceilings.
- `OUT=<file.json>`: write a summary file.
- `VERBOSE=1`: show the worker logs.

Each line of output is one measurement:
- `status` (all statuses seen) and `err`;
- `p95ms`;
- `peakMB`: the largest single D1 call, arguments or results;
- `respKB`;
- `failed`: the number of keys that failed alone inside a 200 read.

## Acceptance (addendum 2 §أ.4) — what the run checks
- Every page under 3 s (p95), and «صفحتي» under 2 s.
- A day or month save under 3 s, the same in the last month as in the first.
- No 500 and no 503 anywhere, including the concurrent step.
- The peak D1 call stays far below 32 MiB.

The lab is local SQLite in-process. Real D1 adds a network round trip per call, so on Preview the numbers will be higher (group «loadtest»).
