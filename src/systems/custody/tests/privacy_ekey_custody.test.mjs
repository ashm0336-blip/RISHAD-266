/* V7 · د4-ب — محمِّل: هذا الاختبار يحتاج نظام المهام (tasks)؛ بغيابه يُتخطّى ولا يُستورد جسمُه (privacy_ekey_custody.body.mjs). */
import { runIfSystems } from '../../../../tests/unit/harness.mjs';
await runIfSystems(['tasks'], () => import('./privacy_ekey_custody.body.mjs'), 'privacy_ekey_custody');
