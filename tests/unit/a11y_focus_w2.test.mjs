/* الموجة 2 · DG-11 — نافذةُ «مهمة جديدة» لا تأخذ التركيزَ ولا تحبس Tab ولا تعيده عند الإغلاق: مديرُ تركيز الحوارات في الإطار (root-logic)
   يعرف الطبقةَ إمّا بنمطٍ مضمَّنٍ fixed بأطرافٍ أربعةٍ صفر أو بصنفٍ من قائمةٍ معروفة (_ovClassRe)، وطبقةُ النافذة .tkf-ov موضعُها في CSS
   (tasks/helmet.css) وصنفُها خارج القائمة — فلا يراها. الآن tkf-ov في القائمة: مرشِّحُ الطبقة (_ovCand) الحقيقيُّ يقبلها كما يقبل pf-ov. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { SRC } from './harness.mjs';

const rd = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');
/* مرشِّحُ الطبقة كما هو في الإطار (_ovClassRe · _ovCand) — منسوخاً من المصدر إلى vm بلا تعديلٍ إلا this ⇐ O */
function ovCand() {
  const s = rd('layouts/root-logic.js');
  const re = /this\._ovClassRe = (\/.*?\/);/.exec(s), cand = /this\._ovCand = (\(el\) => \{.*?\});\r?\n/.exec(s);   /* root-logic.js بنهايات CRLF في RISHAD-266 */
  assert.ok(re && cand, 'المرشِّحُ في root-logic');
  const O = {};
  vm.runInNewContext('O._ovClassRe = ' + re[1] + '; O._ovCand = ' + cand[1].replace(/this\./g, 'O.') + ';', { O });
  return O._ovCand;
}
const el = (className, style = {}) => ({ className, style: Object.assign({ position: '', top: '', left: '', right: '', bottom: '' }, style) });

test('DG-11 · مرشِّحُ طبقات الحوار يقبل طبقةَ «مهمة جديدة» (.tkf-ov — موضعُها في CSS) كما يقبل pf-ov وfd-ov — ولا يقبل صنفاً يشبهها', () => {
  const C = ovCand();
  assert.equal(C(el('tkf-ov')), true);
  assert.equal(C(el('x tkf-ov y')), true);
  for (const k of ['pf-ov', 'fd-ov', 'mbk', 'bs-plat-ov']) assert.equal(C(el(k)), true, k);
  for (const k of ['tkf-ovx', 'tkf', 'tkf-ov2', 'my-tkf-ov']) assert.equal(C(el(k)), false, k);
  assert.equal(C(el('', { position: 'fixed', top: '0px', left: '0px', right: '0px', bottom: '0px' })), true, 'النمطُ المضمَّن كما كان');
});

test('DG-11 · طبقةُ النافذة في القالب بصنف tkf-ov وموضعُها fixed ملءَ الشاشة في CSS — فيراها مديرُ التركيز «أعلى طبقة»: يضع التركيزَ في أول حقل ويحبس Tab ويعيده لزرّ «مهمة جديدة» عند الإغلاق', () => {
  assert.match(rd('modules/tasks/view.html'), /<div onClick="\{\{closeNewTask\}\}" class="tkf-ov">/);
  assert.match(rd('modules/tasks/helmet.css'), /\.tkf-ov\{position:fixed;inset:0;z-index:50;/);
  /* مديرُ التركيز نفسُه: حفظُ صاحب التركيز · أولُ حقل · حبسُ Tab · الإعادةُ عند الزوال */
  const s = rd('layouts/root-logic.js');
  assert.match(s, /this\._dlgStack\.push\(\{ el: top, prev \}\);/);
  assert.match(s, /const pick = top\.querySelector\('\[autofocus\]'\) \|\| f\.find\(el => \/\^\(INPUT\|SELECT\|TEXTAREA\)\$\/\.test\(el\.tagName\)\)/);
  assert.match(s, /\/\* Tab داخل حوارٍ مفتوح لا يخرج منه \*\//);
  assert.match(s, /cur\.prev\.focus\(\{ preventScroll: true \}\)/);
});
