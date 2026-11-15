/* V7 · د2-ب — محمِّل: هذا الاختبار يحتاج seized + award؛ بغياب أحدها يُتخطّى ولا يُستورد جسمُه (v7_ux_business_states.body.mjs). */
import { runIfSystems } from '../../../../tests/unit/harness.mjs';
await runIfSystems(['seized', 'award'], () => import('./v7_ux_business_states.body.mjs'), 'v7_ux_business_states');
