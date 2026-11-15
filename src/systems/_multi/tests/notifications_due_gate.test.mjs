/* V7 · د2-ب — محمِّل: هذا الاختبار يحتاج irshad + seized؛ بغياب أحدها يُتخطّى ولا يُستورد جسمُه (notifications_due_gate.body.mjs). */
import { runIfSystems } from '../../../../tests/unit/harness.mjs';
await runIfSystems(['irshad', 'seized'], () => import('./notifications_due_gate.body.mjs'), 'notifications_due_gate');
