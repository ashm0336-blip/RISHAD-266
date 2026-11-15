/* V7 · د2-ب — محمِّل: هذا الاختبار يحتاج seized + award؛ بغياب أحدها يُتخطّى ولا يُستورد جسمُه (business_browser_wiring.body.mjs). */
import { runIfSystems } from '../../../../tests/unit/harness.mjs';
await runIfSystems(['seized', 'award'], () => import('./business_browser_wiring.body.mjs'), 'business_browser_wiring');
