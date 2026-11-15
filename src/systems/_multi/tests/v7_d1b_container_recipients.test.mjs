/* V7 · د2-ب — محمِّل: هذا الاختبار يحتاج irshad + seized + award؛ بغياب أحدها يُتخطّى ولا يُستورد جسمُه (v7_d1b_container_recipients.body.mjs). */
import { runIfSystems } from '../../../../tests/unit/harness.mjs';
await runIfSystems(['irshad', 'seized', 'award'], () => import('./v7_d1b_container_recipients.body.mjs'), 'v7_d1b_container_recipients');
