/* الموجة 1 · ES-3 · PLAN-03 · DG-08 — أشرطةُ تبويبات الصفحات كانت تأخذ تخطيطَ الشريط (bs-hbar bs-tabstrip) بعد أول رسم:
   190-tabstrip-unify.js يضيف الصنفين من MutationObserver ثم setTimeout(80) ثم __bsAfterQuiet، فعلى الجوال يُرسم الشريطُ كومةً عمودية
   (موظفو الإدارة 303px ← 85px) ثم ينطوي فتقفز الصفحةُ 100–200px (CLS 0.12–0.31) — وtransition:all .3s على بطاقة التبويب يُحرّك العرضَ والحشوة.
   الآن: الصنفان في المصدر من أول رسم لكل شريطٍ يحمل بصمةَ التوحيد (والسكربتُ يبقى احتياطاً لا يجد ما يضيفه) · والانتقالُ للألوان وحدها.
   فحصٌ للمصدر (لا متصفح) — القياسُ الحيّ على TEST في تقرير الموجة. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SRC } from './harness.mjs';

const rd = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');
/* بصمةُ 190-tabstrip-unify.js: display:flex · align-items:center · justify-content:center · flex-wrap:wrap · gap:8px · padding:4px 0 */
const SIG = /<div(?: class="([^"]*)")? style="display:flex;align-items:center;justify-content:center;gap:8px;padding:4px 0;flex-wrap:wrap">/g;
const EXPECT = { admin: 2, award: 1, daily: 1, dstats: 1, employees: 1, irshad: 1, planning: 1, seized: 1 };

test('ES-3 · PLAN-03 · DG-08: كلُّ شريط تبويباتٍ يحمل بصمةَ التوحيد يحمل «bs-hbar bs-tabstrip» في المصدر من أول رسم', () => {
  const mods = JSON.parse(rd('modules/modules.json')).pages.map((p) => p.slug);
  const found = {};
  for (const m of mods) {
    const f = path.join(SRC, 'modules', m, 'view.html');
    if (!fs.existsSync(f)) continue;
    for (const x of fs.readFileSync(f, 'utf8').matchAll(SIG)) {
      found[m] = (found[m] || 0) + 1;
      assert.match(x[1] || '', /(^| )bs-hbar( |$)/, m + ': الشريطُ بلا bs-hbar');
      assert.match(x[1] || '', /(^| )bs-tabstrip( |$)/, m + ': الشريطُ بلا bs-tabstrip — يُضاف بعد الرسم فيقفز على الجوال');
    }
  }
  assert.deepEqual(found, EXPECT, 'الأشرطةُ التسعة (والتعدادُ يكشف شريطاً جديداً بلا صنف)');
});

test('ES-3 · PLAN-03 · DG-08: الصفحاتُ المولَّدة تحمل الصنفين (generate.py) · والسكربتُ باقٍ احتياطاً يتخطّى ما يحمل الصنف', () => {
  for (const p of ['Employees', 'Planning', 'Daily Sessions', 'Irshad', 'Seized', 'Admin', 'Award', 'Daily Stats']) {
    const h = rd('pages/' + p + '.dc.html');
    assert.ok(h.indexOf('class="bs-hbar bs-tabstrip" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:4px 0;flex-wrap:wrap"') >= 0, p + '.dc.html');
  }
  const u = rd('components/190-tabstrip-unify.js');
  assert.match(u, /!el\.classList\.contains\('bs-tabstrip'\)/, 'check() يتخطّى الشريطَ ذا الصنف');
  const g = rd('layouts/helmet-global.css');
  assert.match(g, /@media \(max-width:600px\)\{[^}]*\.bs-tabstrip\{justify-content:flex-start!important\}\s*\.bs-tabstrip > \*\{min-width:118px!important;padding:9px 10px!important;gap:4px!important\}/, 'قواعدُ الجوال التي تنطبق الآن من أول رسم');
});

test('PLAN-03 · DG-08: بطاقاتُ التبويب لا تُحرّك العرضَ والحشوة — الانتقالُ للألوان والظلّ وحدها', () => {
  const pl = rd('modules/planning/helmet.css');
  const tab = /#bsPtRoot \.pt-tab\{[^}]*\}/.exec(pl)[0], ico = /#bsPtRoot \.pt-ico\{[^}]*\}/.exec(pl)[0];
  assert.doesNotMatch(tab, /transition:all/); assert.match(tab, /transition:color \.3s,background-color \.3s,box-shadow \.3s,border-color \.3s/);
  assert.doesNotMatch(ico, /transition:all/); assert.match(ico, /transition:background-color \.3s,color \.3s/);
  const dl = rd('modules/daily/logic.js');
  const i = dl.indexOf('    const ti = (t) =>'), blk = dl.slice(i, dl.indexOf('si = (t) =>', i));
  assert.ok(i > 0, 'نمطُ بطاقة تبويب المتابعة اليومية');
  assert.doesNotMatch(blk, /transition:all/, 'لا transition:all على بطاقة التبويب ولا أيقونتها');
  assert.match(blk, /transition:background-color \.3s,border-color \.3s,color \.3s,box-shadow \.3s;flex-shrink:0;min-width:170px/);
});
