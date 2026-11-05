/* W1 · CANVAS-2 — السحبُ للتحديث في التطبيق المثبّت (src/components/450-pull-refresh.js) داخل node:vm:
   كان سحبُ الخريطة إلى الأسفل بإصبعٍ واحد (تحريكُ العرض أو سحبُ مصلّى) والصفحةُ في أعلاها يُظهر «اسحب للتحديث ← حرّر للتحديث»
   ثمّ يُعيد تحميلَ الصفحة كلِّها عند الرفع في منتصف التحرير. الآن: لمسةٌ بدأت على سطحٍ يملك إيماءاتِه (خريطةُ الخطة · خريطةُ الجولات ·
   أيُّ عنصرٍ بـtouch-action:none) ليست سحباً للصفحة — والسحبُ من رأس الصفحة يُحدّث كما كان.
   PULL_SRC=<مسار> يبدّل الملف (لإثبات أنّ الاختبار يُخفق على النسخة السابقة). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { SRC } from './harness.mjs';

const FILE = process.env.PULL_SRC || path.join(SRC, 'components', '450-pull-refresh.js');

function app(srv) {
  const L = {}, timers = [], log = [];
  class El {
    constructor(tag, parent, attrs = {}) { this.tagName = tag.toUpperCase(); this.nodeType = 1; this.attrs = attrs; this.style = {}; this.parentNode = parent || null; this.parentElement = parent || null; }
    matches(sel) { return sel.split(',').some((s) => { const m = /^\s*([a-z]+)(?:\[([\w-]+)\])?\s*$/i.exec(s); return !!m && m[1].toLowerCase() === this.tagName.toLowerCase() && (!m[2] || m[2] in this.attrs); }); }
    setAttribute(k, v) { this.attrs[k] = v; } appendChild(c) { return c; }
    set innerHTML(v) { this._h = v; }
  }
  const html = new El('html'), body = new El('body', html);
  const ids = { bsPtrTxt: { textContent: '' }, bsPtrIco: { style: {} } };
  const doc = { body, documentElement: Object.assign(html, { style: {} }), scrollingElement: { scrollTop: 0 }, activeElement: body,
    querySelector: () => null, createElement: (t) => new El(t), getElementById: (k) => ids[k] || null };
  const toasts = [];
  const win = { KIVO: { __BS_SRV: srv, bsToast: (m, o) => toasts.push({ m, o }) }, document: doc, navigator: { standalone: true }, scrollY: 0, ontouchstart: null,
    matchMedia: () => ({ matches: false }), location: { reload: () => log.push('reload') },
    setTimeout: (f) => { timers.push(f); return timers.length; }, addEventListener: (t, f) => { (L[t] = L[t] || []).push(f); } };
  win.window = win;
  vm.createContext(win);
  vm.runInContext(fs.readFileSync(FILE, 'utf8'), win, { filename: '450-pull-refresh.js' });
  const fire = (t, target, y) => (L[t] || []).forEach((f) => f({ target, touches: y == null ? [] : [{ clientY: y }] }));
  /* سحبٌ بإصبعٍ واحد إلى الأسفل 340px ثمّ رفع (كما في قياس اللوحي: الحبّةُ تبلغ «حرّر للتحديث») */
  const pull = (target) => { fire('touchstart', target, 100); for (let y = 120; y <= 440; y += 20) fire('touchmove', target, y); const txt = ids.bsPtrTxt.textContent; fire('touchend', target); timers.splice(0).forEach((f) => f()); return txt; };
  const main = new El('main', body), card = new El('div', main), header = new El('header', body);
  return { El, log, pull, main, card, header, ids, toasts };
}

test('CANVAS-2: سحبُ خريطة الخطة إلى الأسفل (تحريكُ العرض أو سحبُ مصلّى) لا يُظهر «حرّر للتحديث» ولا يُعيد تحميلَ الصفحة', () => {
  const A = app();
  const svg = new A.El('svg', A.card, { 'data-map-zoom': '1' }), g = new A.El('g', svg), zone = new A.El('path', g);
  assert.equal(A.pull(svg), '', 'لا حبّةَ سحبٍ للتحديث على الخريطة الفارغة');
  assert.equal(A.pull(zone), '', 'ولا عند سحب مصلّى إلى الأسفل');
  assert.deepEqual(A.log, [], 'لا إعادةَ تحميل في منتصف التحرير');
});

test('CANVAS-2: خريطةُ الجولات اليومية وأيُّ سطحٍ بـtouch-action:none يملك إيماءاتِه كذلك', () => {
  const A = app();
  const ds = new A.El('svg', A.card, { 'data-ds-zoom': '1' }), c = new A.El('circle', ds);
  const pad = new A.El('div', A.card); pad.style.touchAction = 'none'; const inner = new A.El('span', pad);
  A.pull(c); A.pull(inner);
  assert.deepEqual(A.log, []);
});

const tick = () => new Promise((r) => setImmediate(r));

test('CANVAS-2: السحبُ من رأس الصفحة أو من محتواها العادي ما زال يُحدّث الصفحة', async () => {
  const A = app();
  assert.equal(A.pull(A.header), 'حرّر لجلب الأحدث', 'الحبّةُ تبلغ عتبة التحديث');
  await tick();
  assert.deepEqual(A.log, ['reload'], 'وعند الرفع تُعاد الصفحة');
  A.pull(A.card); await tick();
  assert.deepEqual(A.log, ['reload', 'reload']);
});

/* CORE-01: الإعادةُ بعد حفظٍ ناجحٍ وحده — كان go9 يُستدعى نجح الحفظ أم فشل (وبعد 4.2 ث في كل حال) فتضيع التعديلات المعلّقة */
test('CORE-01: السحبُ يحفظ أولاً — يُعاد التحميل بعد flushAsync صادق وحده، والحفظُ الفاشل يُبقي الصفحة برسالة', async () => {
  const calls = [];
  const ok = app({ flushAsync: (ms) => { calls.push(ms); return Promise.resolve(true); } });
  ok.pull(ok.header); await tick();
  assert.deepEqual(calls, [4000]); assert.deepEqual(ok.log, ['reload']); assert.equal(ok.toasts.length, 0);
  for (const result of [() => Promise.resolve(false), () => Promise.reject(new Error('TEST_ONLY')), () => { throw new Error('TEST_ONLY'); }]) {
    const bad = app({ flushAsync: result });
    bad.pull(bad.header); await tick(); await tick();
    assert.deepEqual(bad.log, [], 'لا إعادةَ تحميل والتعديلاتُ لم تُحفظ');
    assert.equal(bad.toasts.length, 1); assert.match(bad.toasts[0].m, /لم تُحفظ تعديلاتك بعد/); assert.equal(bad.toasts[0].o.tone, 'err');
  }
});
