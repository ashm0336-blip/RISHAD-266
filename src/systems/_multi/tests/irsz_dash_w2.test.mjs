/* V7 · د2-ب — محمِّل: هذا الاختبار يحتاج irshad + seized؛ بغياب أحدها يُتخطّى ولا يُستورد جسمُه (irsz_dash_w2.body.mjs). */
import { runIfSystems } from '../../../../tests/unit/harness.mjs';
await runIfSystems(['irshad', 'seized'], () => import('./irsz_dash_w2.body.mjs'), 'irsz_dash_w2');
