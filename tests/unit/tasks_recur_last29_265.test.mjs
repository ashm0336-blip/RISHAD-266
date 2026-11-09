/* The task-recurrence tests (tasks_recur_patterns265) once more, anchored where the generation horizon ends a 29-day Hijri month
   (tasks_recur_clock.mjs · m29), so md:"last" is checked on a 29-day month and a 30-day month on every run, whatever the date.
   The anchor is chosen before the shared file (and its fixture) is loaded — hence the dynamic import. */
globalThis.__KIVO_RECUR_ANCHOR = 'm29';
await import('./tasks_recur_patterns265.test.mjs');
