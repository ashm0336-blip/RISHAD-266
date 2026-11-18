/* V7 · د4-ب — محمِّل: هذا الاختبار يحتاج نظام المهام (tasks)؛ بغيابه يُتخطّى ولا يُستورد جسمُه (scoped_snapshot_lazy_race.body.mjs). */
import { runIfSystems } from './harness.mjs';
await runIfSystems(['tasks'], () => import('./scoped_snapshot_lazy_race.body.mjs'), 'scoped_snapshot_lazy_race');
