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

function app() {
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
  const win = { KIVO: {}, document: doc, navigator: { standalone: true }, scrollY: 0, ontouchstart: null,
    matchMedia: () => ({ matches: false }), location: { reload: () => log.push('reload') },
    setTimeout: (f) => { timers.push(f); return timers.length; }, addEventListener: (t, f) => { (L[t] = L[t] || []).push(f); } };
  win.window = win;
  vm.createContext(win);
  vm.runInContext(fs.readFileSync(FILE, 'utf8'), win, { filename: '450-pull-refresh.js' });
  const fire = (t, target, y) => (L[t] || []).forEach((f) => f({ target, touches: y == null ? [] : [{ clientY: y }] }));
  /* سحبٌ بإصبعٍ واحد إلى الأسفل 340px ثمّ رفع (كما في قياس اللوحي: الحبّةُ تبلغ «حرّر للتحديث») */
  const pull = (target) => { fire('touchstart', target, 100); for (let y = 120; y <= 440; y += 20) fire('touchmove', target, y); const txt = ids.bsPtrTxt.textContent; fire('touchend', target); timers.splice(0).forEach((f) => f()); return txt; };
  const main = new El('main', body), card = new El('div', main), header = new El('header', body);
  return { El, log, pull, main, card, header, ids };
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

test('CANVAS-2: السحبُ من رأس الصفحة أو من محتواها العادي ما زال يُحدّث الصفحة', () => {
  const A = app();
  assert.equal(A.pull(A.header), 'حرّر للتحديث', 'الحبّةُ تبلغ عتبة التحديث');
  assert.deepEqual(A.log, ['reload'], 'وعند الرفع تُعاد الصفحة');
  A.pull(A.card);
  assert.deepEqual(A.log, ['reload', 'reload']);
});
