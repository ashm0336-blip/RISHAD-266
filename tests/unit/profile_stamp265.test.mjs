/* V7 · د4-ب — محمِّل: هذا الاختبار يحتاج نظام المهام (tasks)؛ بغيابه يُتخطّى ولا يُستورد جسمُه (profile_stamp265.body.mjs). */
import { runIfSystems } from './harness.mjs';
await runIfSystems(['tasks'], () => import('./profile_stamp265.body.mjs'), 'profile_stamp265');
