/* V7 · د4-ب — محمِّل: هذا الاختبار يحتاج نظام المهام (tasks)؛ بغيابه يُتخطّى ولا يُستورد جسمُه (rishad266_open_writes.body.mjs). */
import { runIfSystems } from './harness.mjs';
await runIfSystems(['tasks'], () => import('./rishad266_open_writes.body.mjs'), 'rishad266_open_writes');
