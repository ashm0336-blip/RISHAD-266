/* V7 · د2-ب — محمِّل: هذا الاختبار يحتاج irshad + seized + award؛ بغياب أحدها يُتخطّى ولا يُستورد جسمُه (irshad_backup_ui.body.mjs). */
import { runIfSystems } from '../../../../tests/unit/harness.mjs';
await runIfSystems(['irshad', 'seized', 'award'], () => import('./irshad_backup_ui.body.mjs'), 'irshad_backup_ui');
