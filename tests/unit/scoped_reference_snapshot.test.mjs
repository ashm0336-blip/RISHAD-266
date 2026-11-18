/* V7 · د4-ب — محمِّل: هذا الاختبار يحتاج نظام المهام (tasks)؛ بغيابه يُتخطّى ولا يُستورد جسمُه (scoped_reference_snapshot.body.mjs). */
import { runIfSystems } from './harness.mjs';
await runIfSystems(['tasks'], () => import('./scoped_reference_snapshot.body.mjs'), 'scoped_reference_snapshot');
