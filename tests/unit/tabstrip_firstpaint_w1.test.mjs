/* الموجة 1 · ES-3 · PLAN-03 · DG-08 — أشرطةُ تبويبات الصفحات كانت تأخذ تخطيطَ الشريط (bs-hbar bs-tabstrip) بعد أول رسم:
   مراقبٌ بعد الرسم كان يضيف الصنفين من MutationObserver ثم setTimeout(80) ثم __bsAfterQuiet، فعلى الجوال يُرسم الشريطُ كومةً عمودية
   (موظفو الإدارة 303px ← 85px) ثم ينطوي فتقفز الصفحةُ 100–200px (CLS 0.12–0.31) — وtransition:all .3s على بطاقة التبويب يُحرّك العرضَ والحشوة.
   الآن: الصنفان في المصدر من أول رسم لكل شريطٍ يحمل بصمةَ التوحيد — وحُذف المراقب (التنظيف L-06): شريطٌ بلا صنفٍ يُفشل الاختبارَ الأول · والانتقالُ للألوان وحدها.
   فحصٌ للمصدر (لا متصفح) — القياسُ الحيّ على TEST في تقرير الموجة. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SRC, moduleDir } from './harness.mjs';

const rd = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');
/* بصمةُ شريط التبويبات: display:flex · align-items:center · justify-content:center · flex-wrap:wrap · gap:8px · padding:4px 0 */
const SIG = /<div(?: class="([^"]*)")? style="display:flex;align-items:center;justify-content:center;gap:8px;padding:4px 0;flex-wrap:wrap">/g;
const EXPECT = { award: 1, daily: 1, dstats: 1, employees: 1, irshad: 1, planning: 1, seized: 1 };
/* CORE-01: شريطا admin (مدير النظام · إعدادات الإدارة) صارا صنفاً بلا نمطٍ مضمَّن — «bs-hbar bs-tabstrip adm-tabs»، ولا بصمةَ قديمة فيهما.
   CORE-02 S7 (تغييرٌ مقصود): شريطُ «مركز إدارة رشاد» داخل الصفحة حُذف — تنقّلُه في الشريط الجانبي — فبقي شريطُ إعدادات الإدارة وحده */
const ADM = /<div class="bs-hbar bs-tabstrip adm-tabs" role="tablist"/g;

test('ES-3 · PLAN-03 · DG-08: كلُّ شريط تبويباتٍ يحمل بصمةَ التوحيد يحمل «bs-hbar bs-tabstrip» في المصدر من أول رسم', () => {
  const mods = JSON.parse(rd('modules/modules.json')).pages.map((p) => p.slug);
  const found = {};
  for (const m of mods) {
    const f = path.join(moduleDir(m), 'view.html');
    if (!fs.existsSync(f)) continue;
    for (const x of fs.readFileSync(f, 'utf8').matchAll(SIG)) {
      found[m] = (found[m] || 0) + 1;
      assert.match(x[1] || '', /(^| )bs-hbar( |$)/, m + ': الشريطُ بلا bs-hbar');
      assert.match(x[1] || '', /(^| )bs-tabstrip( |$)/, m + ': الشريطُ بلا bs-tabstrip — يُضاف بعد الرسم فيقفز على الجوال');
    }
  }
  assert.deepEqual(found, EXPECT, 'الأشرطةُ (والتعدادُ يكشف شريطاً جديداً بلا صنف)');
  assert.equal([...rd('modules/admin/view.html').matchAll(ADM)].length, 1, 'admin: شريطُ إعدادات الإدارة بالصنفين من أول رسم');
});

test('ES-3 · PLAN-03 · DG-08: الصفحاتُ المولَّدة تحمل الصنفين (generate.py) · وقواعدُ الجوال للصنف', () => {
  assert.equal([...rd('pages/Admin.dc.html').matchAll(ADM)].length, 1, 'Admin.dc.html');
  for (const p of ['Employees', 'Planning', 'Daily Sessions', 'Irshad', 'Seized', 'Award', 'Daily Stats']) {
    const h = rd('pages/' + p + '.dc.html');
    assert.ok(h.indexOf('class="bs-hbar bs-tabstrip" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:4px 0;flex-wrap:wrap"') >= 0, p + '.dc.html');
  }
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
