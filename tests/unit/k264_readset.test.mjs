/* V7 · د2-ب — محمِّل: هذا الاختبار يحتاج irshad؛ بغياب أحدها يُتخطّى ولا يُستورد جسمُه (k264_readset.body.mjs). */
import { runIfSystems } from './harness.mjs';
await runIfSystems(['irshad'], () => import('./k264_readset.body.mjs'), 'k264_readset');
