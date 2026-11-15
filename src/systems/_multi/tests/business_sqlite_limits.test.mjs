/* V7 · د2-ب — محمِّل: هذا الاختبار يحتاج seized + award؛ بغياب أحدها يُتخطّى ولا يُستورد جسمُه (business_sqlite_limits.body.mjs). */
import { runIfSystems } from '../../../../tests/unit/harness.mjs';
await runIfSystems(['seized', 'award'], () => import('./business_sqlite_limits.body.mjs'), 'business_sqlite_limits');
