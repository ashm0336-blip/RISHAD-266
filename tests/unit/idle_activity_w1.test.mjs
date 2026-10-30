/* W1 · R9 — ما يُعدّ نشاطاً للمستخدم (src/auth/335-identity-gate.js) داخل node:vm بمساحة auth بديلة صغيرة (touch() جاسوسٌ بقاعدة 330 نفسِها:
   لا يكتب «آخر نشاط» أكثرَ من مرةٍ في الدقيقة). كان النشاطُ النقرَ ولوحةَ المفاتيح وحركةَ الفأرة وحدَها: مستخدمُ اللوحي الذي يمرّر أو يسحب
   أو يرسم على الخريطة بالإصبع أو القلم ساعتين بلا نقرة يُعدّ خاملاً فتُقفل جلستُه («انتهت الجلسة») وهو يعمل.
   الآن: الضغطُ والسحبُ باللمس والقلم والتمريرُ والعجلة نشاطٌ — في الالتقاط (فلا يحجبها معالجٌ يوقف الحدث) ومخفَّفاً (مرةً كلَّ 15 ثانية).
   GATE_SRC=<مسار> يبدّل الملف (لإثبات أنّ الاختبار يُخفق على النسخة السابقة). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { SRC } from './harness.mjs';

const FILE = process.env.GATE_SRC || path.join(SRC, 'auth', '335-identity-gate.js');

function gate() {
  const T = { now: 1760000000000 }, W = { capture: {}, bubble: {} }, Dl = { capture: {}, bubble: {} }, la = { v: T.now - 5 * 60000, writes: 0, calls: 0 };
  const reg = (M) => (t, f, o) => { const c = o === true || !!(o && o.capture); (M[c ? 'capture' : 'bubble'][t] = M[c ? 'capture' : 'bubble'][t] || []).push(f); };
  class FDate extends Date { constructor(...a) { if (a.length) super(...a); else super(T.now); } static now() { return T.now; } }
  /* touch() بقاعدة 330-auth.js: لا كتابةَ إن كان آخرُ نشاطٍ قبل أقلَّ من دقيقة */
  const touch = () => { la.calls++; if (T.now - la.v < 60000) return; la.v = T.now; la.writes++; };
  const u0 = { id: 'TEST_ONLY_u1', role: 'staff', deptId: 'tst_d1', name: 'TEST_ONLY' };
  const I = { D: { setScopeGuard() {}, active: () => 'tst_d1', setActive() {} }, u0, touch, needsPwChange: () => false, cur: () => u0, curDept: () => 'tst_d1',
    gmDepts: () => [], gmEnsureActive() {}, isMgrKey: () => false, rawUsers: () => [], permStore: () => ({ emps: {}, tplOf: {}, empLens: {} }) };
  const win = { KIVO: { __BS_I: { auth: I } }, Date: FDate, setTimeout: () => 0, setInterval: () => 0, clearInterval() {}, localStorage: { getItem: () => null },
    addEventListener: reg(W), document: { hidden: false, addEventListener: reg(Dl), createElement: () => ({ style: {}, setAttribute() {} }) } };
  win.window = win;
  vm.createContext(win);
  vm.runInContext(fs.readFileSync(FILE, 'utf8'), win, { filename: '335-identity-gate.js' });
  /* حدثٌ كما يوزّعه المتصفح: التقاطُ النافذة ← الوثيقة ← فقاعتُهما — ومعالجٌ في الصفحة قد يوقفه (stop) */
  const fire = (type, stopAt) => { const ev = { type, stop: false, stopPropagation() { this.stop = true; } };
    for (const [M, ph] of [[W, 'capture'], [Dl, 'capture'], [null, 'page'], [Dl, 'bubble'], [W, 'bubble']]) {
      if (M === null) { if (stopAt === 'page') ev.stop = true; continue; }
      for (const f of (M[ph][type] || [])) { f(ev); }
      if (ev.stop) return; } };
  const idle = (ms) => { T.now += ms; };
  return { T, la, fire, idle, W, Dl };
}

test('R9: سحبُ الإصبع على الخريطة (لمسٌ وحركةُ مؤشّرٍ بلا نقرة) يُجدّد «آخر نشاط» — ولو أوقف معالجُ الخريطة الحدث', () => {
  const G = gate();
  const before = G.la.v;
  G.fire('pointerdown', 'page'); G.fire('touchstart', 'page');
  for (let k = 0; k < 30; k++) { G.idle(16); G.fire('pointermove', 'page'); G.fire('touchmove', 'page'); }
  assert.ok(G.la.v > before, 'تجدّد آخرُ نشاط بالسحب وحدَه');
});

test('R9: التمريرُ باللمس (touchmove ثمّ scroll) والعجلةُ وقلمُ الرسم نشاط', () => {
  for (const seq of [['touchstart', 'touchmove', 'scroll'], ['wheel'], ['pointerdown', 'pointermove']]) {
    const G = gate(); const before = G.la.v;
    for (const t of seq) G.fire(t);
    assert.ok(G.la.v > before, 'نشاط: ' + seq.join(' ← '));
  }
});

test('R9: مستخدمٌ يواصل الرسمَ باللمس ساعتين بلا نقرة يبقى نشطاً — «آخر نشاط» لا يتقادم أكثرَ من دقيقتين', () => {
  const G = gate();
  let worst = 0;
  for (let s = 0; s < 2 * 3600; s += 2) { G.idle(2000); G.fire('pointermove', 'page'); worst = Math.max(worst, G.T.now - G.la.v); }
  assert.ok(worst <= 2 * 60000, 'أقصى تقادمٍ لآخر نشاط أثناء الرسم المتواصل: ' + Math.round(worst / 1000) + ' ث (الحدُّ ساعتان)');
});

test('R9: مخفَّف — سيلُ الحركة (120 حدثاً في الثانية) لا يستدعي touch() إلا مرةً كلَّ 15 ثانية · والنقرُ والمفاتيح والفأرة كما كانت', () => {
  const G = gate();
  for (let k = 0; k < 120 * 30; k++) { G.idle(1000 / 120); G.fire('pointermove'); }
  assert.ok(G.la.calls >= 1 && G.la.calls <= 3, 'استدعاءاتُ touch() في 30 ثانية من الحركة المتواصلة (3,600 حدث): ' + G.la.calls);
  assert.equal(G.la.writes, 1, 'وكتابةٌ واحدة لآخر نشاط');
  for (const t of ['click', 'keydown', 'mousemove']) { const H = gate(); const b = H.la.v; H.fire(t); assert.ok(H.la.v > b, t + ' ما زال نشاطاً'); }
});

test('R9: الصفحةُ الخاملة فعلاً لا تُجدِّد شيئاً — بلا أحداثٍ يبقى «آخر نشاط» حيث هو', () => {
  const G = gate(); const before = G.la.v; G.idle(3 * 3600 * 1000);
  assert.equal(G.la.v, before);
});
