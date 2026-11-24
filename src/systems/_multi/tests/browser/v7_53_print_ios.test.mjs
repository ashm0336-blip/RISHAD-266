/* V7 · 53 (ملحق 6 · البندان 9 و10) — محمِّل: PDF على الآيباد والآيفون وغلافُ التقرير — يحتاج plan + daily؛ بغياب أحدهما يُتخطّى ولا يُستورد جسمُه */
import { runIfSystems } from '../../../../../tests/unit/harness.mjs';
await runIfSystems(['plan', 'daily'], () => import('./v7_53_print_ios.body.mjs'), 'v7_53_print_ios');
