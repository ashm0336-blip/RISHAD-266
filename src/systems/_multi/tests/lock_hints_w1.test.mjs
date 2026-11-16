/* V7 · د2-ب — محمِّل: هذا الاختبار يحتاج irshad + seized؛ بغياب أحدها يُتخطّى ولا يُستورد جسمُه (lock_hints_w1.body.mjs). */
import { runIfSystems } from '../../../../tests/unit/harness.mjs';
await runIfSystems(['irshad', 'seized'], () => import('./lock_hints_w1.body.mjs'), 'lock_hints_w1');
