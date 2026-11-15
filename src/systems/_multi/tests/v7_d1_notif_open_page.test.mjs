/* V7 · د2-ب — محمِّل: هذا الاختبار يحتاج irshad + seized؛ بغياب أحدها يُتخطّى ولا يُستورد جسمُه (v7_d1_notif_open_page.body.mjs). */
import { runIfSystems } from '../../../../tests/unit/harness.mjs';
await runIfSystems(['irshad', 'seized'], () => import('./v7_d1_notif_open_page.body.mjs'), 'v7_d1_notif_open_page');
