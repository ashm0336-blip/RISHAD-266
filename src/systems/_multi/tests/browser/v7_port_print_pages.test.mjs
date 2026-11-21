/* V7 · د5-ح — محمِّل: زرُّ الطباعة الحقيقي على خريطتَي التشغيل الميداني والمتابعة اليومية — يحتاج plan + daily؛ بغياب أحدهما يُتخطّى ولا يُستورد جسمُه
   (v7_port_print_pages.body.mjs — كان tests/browser/v7_port_print_pages.test.mjs، وانتقل مع نواة الطباعة إلى ما يتبع النظامين). */
import { runIfSystems } from '../../../../../tests/unit/harness.mjs';
await runIfSystems(['plan', 'daily'], () => import('./v7_port_print_pages.body.mjs'), 'v7_port_print_pages');
