/* V7 · د5-ح — محمِّل: نواةُ الطباعة قطعةٌ مشتركة (src/systems/_shared/print) لنظامَي plan و daily — يعمل الجسمُ (print_vector.body.mjs) ما حضر أحدُهما،
   وبغيابهما معاً (والقطعةُ محذوفةٌ معهما) يُتخطّى ولا يُستورد. */
import { hasSystem } from '../../../../tests/unit/harness.mjs';
if (hasSystem('plan') || hasSystem('daily')) await import('./print_vector.body.mjs');
else { const { default: test } = await import('node:test'); test('print_vector — نظامٌ غير حاضر: plan + daily', { skip: 'نظامٌ غير حاضر: plan + daily' }, () => {}); }
