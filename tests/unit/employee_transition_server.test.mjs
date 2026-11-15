/* V7 · د2-ب — محمِّل: هذا الاختبار يحتاج award؛ بغياب أحدها يُتخطّى ولا يُستورد جسمُه (employee_transition_server.body.mjs). */
import { runIfSystems } from './harness.mjs';
await runIfSystems(['award'], () => import('./employee_transition_server.body.mjs'), 'employee_transition_server');
