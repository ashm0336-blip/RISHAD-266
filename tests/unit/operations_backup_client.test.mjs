/* V7 · د4-ب — محمِّل: هذا الاختبار يعدّ موارد العمليات الواحد والعشرين (اثنان منها للمهام)؛ بغياب نظام المهام يُتخطّى ولا يُستورد جسمُه (operations_backup_client.body.mjs). */
import { runIfSystems } from './harness.mjs';
await runIfSystems(['tasks'], () => import('./operations_backup_client.body.mjs'), 'operations_backup_client');
