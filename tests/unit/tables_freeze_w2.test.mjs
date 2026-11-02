/* الموجة 2 · IRSZ-1 — سجلّ الحركة الشهري في «نظام الاسترشاد»: الترويسةُ 11 خليةً والصفُّ 12 (عمودُ الإجراءات بلا <th>)، ومحرّكُ الجداول
   (180-tables-engine.js · applyFrozen) كان يتجاوز كلَّ صفٍّ يختلف عددُ أبنائه عن الترويسة — فلا تُثبَّت أيُّ خليةٍ في الجسم وتبقى ترويسةُ
   «التاريخ والوقت» وحدها مثبّتةً فوق أعمدةٍ أخرى عند الانزلاق الأفقي، وأزرارُ ⋮ تظهر من خلال الترويسة اللاصقة.
   الإصلاح: (1) الخليةُ الناقصة في الترويسة · (2) المحرّكُ يحدّد خلايا الأعمدة المثبّتة بمواضع colSpan لا بعدد الأبناء، ويتجاوز كما كان
   الصفَّ الذي يمرّ فيه عمودٌ مثبّتٌ داخل خليةٍ ممتدّة (صفُّ الحالة الفارغة · صفُّ مجموع)، والترويسةُ ذاتُ الصفّين تبقى على المطابقة بالعدد.
   المحرّكُ الحقيقي في vm فوق DOM اصطناعي (عرضٌ ثابت لكل خلية) — لا متصفح. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { SRC, blockFile } from './harness.mjs';

class CL { constructor() { this.s = new Set(); } add(c) { this.s.add(c); } remove(c) { this.s.delete(c); } contains(c) { return this.s.has(c); } toggle(c, f) { if (f === undefined ? !this.s.has(c) : f) this.s.add(c); else this.s.delete(c); } }
class Style { constructor() { this.p = {}; this.minWidth = ''; } getPropertyValue(k) { return (this.p[k] || [''])[0]; } getPropertyPriority(k) { return (this.p[k] || ['', ''])[1]; } setProperty(k, v, pr) { this.p[k] = [v, pr || '']; } }
class El {
  constructor(tag, o = {}) { this.tagName = tag.toUpperCase(); this.children = []; this.classList = new CL(); this.style = new Style(); this.attrs = {}; this.isConnected = true; this.colSpan = o.span || 1; this.w = o.w || 100; }
  add(...k) { this.children.push(...k); return this; }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getBoundingClientRect() { return { width: this.w, height: 20, left: 0, right: this.w, top: 0, bottom: 20 }; }
  _sec(n) { return this.children.filter((c) => c.tagName === n); }
  querySelectorAll(sel) {
    if (sel === 'thead tr') return this._sec('THEAD').flatMap((s) => s.children);
    if (sel === 'tbody tr') return this._sec('TBODY').flatMap((s) => s.children);
    return [];
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
}
const th = (w, span) => new El('th', { w, span });
const td = (span) => new El('td', { span });
const tr = (...c) => new El('tr').add(...c);
const cells = (n) => Array.from({ length: n }, () => td());
function table(headRows, bodyRows, w = 1320) {
  const t = new El('table', { w }); t.classList.add('bs-rtable');
  t.add(new El('thead').add(...headRows), new El('tbody').add(...bodyRows));
  return t;
}
/* يشغّل المحرّكَ الحقيقي مرّةً على الجداول المعطاة (document.readyState='complete' ⇒ run() عند التحميل) */
function runEngine(tables) {
  const KIVO = { __bsTick: { add() {} }, __bsAfterQuiet: (f) => f() };
  const document = { readyState: 'complete', documentElement: {}, addEventListener() {},
    querySelectorAll: (sel) => (/^table\.bs-rtable/.test(sel) ? tables : []) };
  const ctx = { KIVO, document, window: { addEventListener() {} }, setTimeout: () => 0, clearTimeout() {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(blockFile('180-tables-engine.js'), 'utf8'), ctx);
}
const fz = (c) => ['bs-fz', 'bs-fz1', 'bs-fz2', 'bs-fz3', 'bs-fzkeep'].filter((k) => c.classList.contains(k));
/* ترويسةُ السجلّ: عمودُ التاريخ عريض (140) ثم عشرةُ أعمدة */
const ledgerHead = (n) => tr(th(140), ...Array.from({ length: n - 1 }, () => th(110)));

test('IRSZ-1 · ترويسةٌ تنقصها خليةُ عمود الإجراءات (11 مقابل 12): خلايا العمود المثبّت في الجسم تُثبَّت مع ترويستها — لا ترويسةَ تنزلق وحدها', () => {
  const rows = [tr(...cells(12)), tr(...cells(12)), tr(...cells(12))];
  const t = table([ledgerHead(11)], rows);
  runEngine([t]);
  assert.equal(t.getAttribute('data-bsfz'), '0', 'عمودُ الهوية: التاريخ والوقت');
  assert.deepEqual(fz(t.querySelector('thead tr').children[0]), ['bs-fz', 'bs-fz1', 'bs-fzkeep']);
  for (const r of rows) {
    assert.deepEqual(fz(r.children[0]), ['bs-fz', 'bs-fz1', 'bs-fzkeep'], 'خليةُ التاريخ في كل صفٍّ مثبّتة');
    assert.deepEqual(r.children.slice(1).flatMap(fz), [], 'ولا يُثبَّت غيرُها');
  }
});

test('IRSZ-1 · صفُّ الحالة الفارغة (خليةٌ واحدة colspan) يُتجاوز كما كان — والصفُّ المطابق يُثبَّت', () => {
  const empty = tr(td(12)), full = tr(...cells(12));
  const t = table([ledgerHead(12)], [empty, full]);
  runEngine([t]);
  assert.deepEqual(fz(empty.children[0]), [], 'الخليةُ الممتدّة لا تصير لاصقة');
  assert.deepEqual(fz(full.children[0]), ['bs-fz', 'bs-fz1', 'bs-fzkeep']);
});

test('IRSZ-1 · ثلاثةُ أعمدةٍ مثبّتة (تحديد · م · الاسم): صفُّ مجموعٍ يمرّ فيه عمودٌ مثبّت داخل خليةٍ ممتدّة يُتجاوز كلُّه · وصفٌّ ينقصه عمودٌ في آخره يُثبَّت', () => {
  const head = tr(th(40), th(50), th(220), ...Array.from({ length: 6 }, () => th(110)));
  const normal = tr(...cells(9)), total = tr(td(2), ...cells(7)), short = tr(...cells(8));
  const t = table([head], [normal, total, short]);
  runEngine([t]);
  assert.equal(t.getAttribute('data-bsfz'), '0,1,2');
  assert.deepEqual(normal.children.slice(0, 3).map(fz), [['bs-fz', 'bs-fz1'], ['bs-fz', 'bs-fz2'], ['bs-fz', 'bs-fz3', 'bs-fzkeep']]);
  assert.deepEqual(total.children.flatMap(fz), [], 'صفُّ المجموع (colspan=2 فوق التحديد و«م») لا تُثبَّت منه خلية');
  assert.deepEqual(short.children.slice(0, 3).map(fz), [['bs-fz', 'bs-fz1'], ['bs-fz', 'bs-fz2'], ['bs-fz', 'bs-fz3', 'bs-fzkeep']], 'نقصُ خليةٍ في آخر الصفّ لا يُسقط التثبيت');
});

test('IRSZ-1 · ترويسةٌ بصفّين: المطابقةُ بعدد الأبناء كما كانت (لا تُخمَّن مواضعُ الأعمدة من صفٍّ واحد)', () => {
  const top = tr(th(300, 3)), cols = tr(th(140), th(110), th(110));
  const ok = tr(...cells(3)), extra = tr(...cells(4));
  const t = table([top, cols], [ok, extra]);
  runEngine([t]);
  assert.deepEqual(fz(ok.children[0]), ['bs-fz', 'bs-fz1', 'bs-fzkeep']);
  assert.deepEqual(extra.children.flatMap(fz), [], 'عددٌ مختلف ⇒ يُتجاوز');
});

/* المصدر: كلُّ جدول .bs-rtable ثابتِ الترويسة (بلا sc-for فيها) في قوالب الوحدات — مجموعُ colspan في الترويسة = مجموعُه في كل صفٍّ متعدّد الخلايا */
function tablesOf(html) {
  const out = []; const re = /<table\b[^>]*class="[^"]*bs-rtable[^"]*"[^>]*>([\s\S]*?)<\/table>/g; let m;
  while ((m = re.exec(html))) {
    const t = m[1], head = (/<thead>([\s\S]*?)<\/thead>/.exec(t) || [, ''])[1], body = (/<tbody>([\s\S]*?)<\/tbody>/.exec(t) || [, ''])[1];
    if (!head || /<sc-for\b/.test(head)) continue;
    const span = (s, tag) => [...s.matchAll(new RegExp('<' + tag + '\\b([^>]*)>', 'g'))].reduce((a, x) => a + (+((/colspan="(\d+)"/i.exec(x[1]) || [, 1])[1])), 0);
    const rows = [...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((r) => ({ n: (r[1].match(/<td\b/g) || []).length, span: span(r[1], 'td') }));
    out.push({ at: html.slice(0, m.index).split('\n').length, th: span(head, 'th'), rows });
  }
  return out;
}
test('IRSZ-1 · المصدر: جداولُ الوحدات ذاتُ الترويسة الثابتة — عددُ أعمدة الترويسة = عددُ خلايا كل صفّ (وسجلُّ الاسترشاد 12 = 12)', () => {
  const bad = [];
  for (const slug of fs.readdirSync(path.join(SRC, 'modules'))) {
    const f = path.join(SRC, 'modules', slug, 'view.html'); if (!fs.existsSync(f)) continue;
    for (const t of tablesOf(fs.readFileSync(f, 'utf8'))) for (const r of t.rows) if (r.n > 1 && r.span !== t.th) bad.push(slug + ':' + t.at + ' th=' + t.th + ' td=' + r.span);
  }
  assert.deepEqual(bad, []);
  const ir = tablesOf(fs.readFileSync(path.join(SRC, 'modules/irshad/view.html'), 'utf8')).find((t) => t.th === 12 && t.rows.some((r) => r.n === 12));
  assert.ok(ir, 'سجلُّ الحركة الشهري: 12 عموداً في الترويسة والجسم');
  assert.match(fs.readFileSync(path.join(SRC, 'modules/irshad/view.html'), 'utf8'), /<th style="padding:8px 4px" aria-label="الإجراءات"><\/th>/);
});
