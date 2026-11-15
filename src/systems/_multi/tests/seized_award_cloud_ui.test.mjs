/* V7 · د2-ب — محمِّل: هذا الاختبار يحتاج seized + award؛ بغياب أحدها يُتخطّى ولا يُستورد جسمُه (seized_award_cloud_ui.body.mjs). */
import { runIfSystems } from '../../../../tests/unit/harness.mjs';
await runIfSystems(['seized', 'award'], () => import('./seized_award_cloud_ui.body.mjs'), 'seized_award_cloud_ui');
