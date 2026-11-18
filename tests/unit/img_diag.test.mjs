/* V7 · د4-ب — محمِّل: هذا الاختبار يحتاج نظام المهام (tasks)؛ بغيابه يُتخطّى ولا يُستورد جسمُه (img_diag.body.mjs). */
import { runIfSystems } from './harness.mjs';
await runIfSystems(['tasks'], () => import('./img_diag.body.mjs'), 'img_diag');
