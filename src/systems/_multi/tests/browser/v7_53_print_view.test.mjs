/* V7 · 53 (ملحق 6 · البند 1) — محمِّل: الطابعةُ لكل من يرى صفحة الخطة أو المتابعة — يحتاج plan + daily؛ بغياب أحدهما يُتخطّى ولا يُستورد جسمُه */
import { runIfSystems } from '../../../../../tests/unit/harness.mjs';
await runIfSystems(['plan', 'daily'], () => import('./v7_53_print_view.body.mjs'), 'v7_53_print_view');
