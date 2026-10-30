/* KIVO_265 · طلبُ المالك (2026-10-19): سحبُ الإدارات والعقد في شجرة «مدير النظام ← الإدارات» وإفلاتُها — قبل/بعد صفٍّ للترتيب،
   وعلى وسطه للنقل تحته — وتتبعها القائمةُ الجانبية لأنها تقرأ railTree من السجلّ نفسِه. يُثبت هنا على النموذج الحقيقي (320 محمّلاً
   في vm بتخزينٍ وهمي): الترتيبُ داخل الأب · النقلُ تحت عقدة · الإدارةُ ورقةٌ لا تُوضع تحت إدارة · لا دورة · railTree يعكس الترتيب ·
   والربطُ في القالب والمنطق والنمط وخريطة أحداث المحرّك (ondrop). */
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function world() {
  class Storage {
    constructor() { this._m = new Map(); }
    getItem(k) { return this._m.has(k) ? this._m.get(k) : null; }
    setItem(k, v) { this._m.set(String(k), String(v)); }
    removeItem(k) { this._m.delete(k); }
    clear() { this._m.clear(); }
    key(i) { return [...this._m.keys()][i] ?? null; }
    get length() { return this._m.size; }
  }
  const localStorage = new Storage(), sessionStorage = new Storage();
  const doc = { addEventListener() {}, body: { appendChild() {}, classList: { add() {}, remove() {} } }, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), getElementById: () => null };
  const ctx = { Storage, localStorage, sessionStorage, KIVO: { __BS_SRV: { flushAsync: async () => true } }, document: doc, console, JSON, Date, Math, Object, Array, String, Number, Promise, setTimeout, clearTimeout };
  ctx.window = { __BS_BOOT: { srv: 1, cf: 1 }, localStorage, sessionStorage, addEventListener() {}, document: doc };
  ctx.globalThis = ctx;
  vm.runInNewContext(rd('src/services/320-dept-storage.js'), ctx);
  const D = ctx.KIVO.BassamDepts; assert.ok(D && D.moveNode, 'BassamDepts.moveNode موجودة');
  D.saveNodes([{ id: 'top', name: 'الإدارة العليا', kind: 'إدارة عليا' }, { id: 'sec', name: 'القطاع', kind: 'قطاع', pid: 'top' }, { id: 'g1', name: 'الإدارة العامة 1', kind: 'إدارة عامة', pid: 'sec' }, { id: 'g2', name: 'الإدارة العامة 2', kind: 'إدارة عامة', pid: 'sec' }]);
  D.save([{ id: 'a', name: 'إدارة أ', gid: 'g1' }, { id: 'b', name: 'إدارة ب', gid: 'g1' }, { id: 'c', name: 'إدارة ج', gid: 'g1' }, { id: 'd', name: 'إدارة د', gid: 'g2' }]);
  return D;
}
const J = (x) => JSON.parse(JSON.stringify(x));   /* قيمُ vm من عالمٍ آخر — تُطبَّع قبل deepEqual */
const order = (D, pid) => J(D.childrenOf(pid).map((n) => n.id));
const rail = (D) => J(D.railTree().map((r) => r.id));

test('الترتيب داخل الأب نفسه: قبل/بعد — وينعكس في railTree (القائمة الجانبية)', () => {
  const D = world();
  assert.deepEqual(order(D, 'g1'), ['a', 'b', 'c']);
  let r = D.moveNode('c', 'a', 'before'); assert.equal(r.ok, true); assert.match(r.msg, /رُتّبت «إدارة ج» قبل «إدارة أ»/);
  assert.deepEqual(order(D, 'g1'), ['c', 'a', 'b']);
  r = D.moveNode('c', 'b', 'after'); assert.equal(r.ok, true);
  assert.deepEqual(order(D, 'g1'), ['a', 'b', 'c']);
  r = D.moveNode('g2', 'g1', 'before'); assert.equal(r.ok, true); assert.match(r.msg, /رُتّبت «الإدارة العامة 2» قبل/);
  assert.deepEqual(order(D, 'sec'), ['g2', 'g1']);
  assert.deepEqual(rail(D), ['top', 'sec', 'g2', 'd', 'g1', 'a', 'b', 'c'], 'الشجرةُ المعروضة تتبع ترتيب السجلّ');
});

test('النقل تحت عقدة (inside) وبجوار عقدة تحت أبٍ آخر — الأبُ يتغيّر ويُفتح له', () => {
  const D = world();
  let r = D.moveNode('a', 'g2', 'inside'); assert.equal(r.ok, true); assert.equal(r.pid, 'g2'); assert.match(r.msg, /نُقلت «إدارة أ» تحت «الإدارة العامة 2»/);
  assert.deepEqual(order(D, 'g2'), ['d', 'a']); assert.deepEqual(order(D, 'g1'), ['b', 'c']);
  r = D.moveNode('b', 'd', 'before'); assert.equal(r.ok, true); assert.equal(r.pid, 'g2'); assert.match(r.msg, /نُقلت «إدارة ب» تحت «الإدارة العامة 2» قبل «إدارة د»/);
  assert.deepEqual(order(D, 'g2'), ['b', 'd', 'a']);
  r = D.moveNode('g2', 'top', 'inside'); assert.equal(r.ok, true); assert.deepEqual(order(D, 'top').map(String), ['sec', 'g2']);
  r = D.moveNode('c', 'g1', 'after'); assert.equal(r.ok, true); assert.equal(r.pid, 'sec', 'بجوار الإدارة العامة ⇒ تحت القطاع'); assert.equal(D.nodeOf('c').pid, 'sec');
});

test('الحدود: الإدارة ورقةٌ لا تُوضع تحت إدارة · لا دورة · العقدة نفسُها · عقدةٌ مجهولة', () => {
  const D = world();
  let r = D.moveNode('a', 'b', 'inside'); assert.equal(r.ok, false); assert.match(r.err, /الإدارة ورقةٌ/);
  r = D.moveNode('sec', 'g1', 'inside'); assert.equal(r.ok, false); assert.match(r.err, /دورة/);
  r = D.moveNode('sec', 'a', 'before'); assert.equal(r.ok, false, 'بجوار إدارة تحت ذرّيته = دورة'); assert.match(r.err, /دورة/);
  r = D.moveNode('a', 'a', 'before'); assert.equal(r.ok, false);
  r = D.moveNode('a', 'zz', 'before'); assert.equal(r.ok, false);
  assert.deepEqual(order(D, 'g1'), ['a', 'b', 'c'], 'لا تغييرَ بعد الرفض');
  r = D.moveNode('g2', 'a', 'inside'); assert.equal(r.ok, true, 'قسمٌ (عقدة) تحت إدارة مسموح'); assert.equal(D.nodeOf('g2').pid, 'a');
});

test('الربط: ondrop في خريطة أحداث المحرّك · صفوفُ الشجرة قابلةٌ للسحب في القالب · الدرجاتُ في المنطق والنمط', () => {
  assert.match(rd('src/core/050-dc-runtime.js'), /ondrop: "onDrop"/, 'المحرّك يترجم ondrop');
  const v = rd('src/modules/admin/view.html');
  const rows = v.match(/class="tr-rw two \{\{d\.trDepCls\}\} \{\{d\.trSelCls\}\} \{\{d\.trDragCls\}\}" draggable="true" onDragStart="\{\{d\.trDragStart\}\}" onDragOver="\{\{d\.trDragOver\}\}" onDragLeave="\{\{d\.trDragLeave\}\}" onDrop="\{\{d\.trDrop\}\}" onDragEnd="\{\{d\.trDragEnd\}\}"/g) || [];
  assert.equal(rows.length, 2, 'صفُّ العقدة وصفُّ الإدارة كلاهما قابلٌ للسحب');
  assert.match(v, /class="tr-hint"/);
  const l = rd('src/modules/admin/logic.js');
  assert.match(l, /_trDragProps\(id, e\)/); assert.match(l, /pos = y < 0\.3 \* h \? "before" : y > 0\.7 \* h \? "after" : leaf \? \(y < h \/ 2 \? "before" : "after"\) : "inside"/, 'الثلثُ الأعلى قبل · الأسفل بعد · الوسطُ تحت (لا «تحت» لإدارة)');
  assert.match(l, /D\.moveNode\(s, id, pos\)/);
  assert.match(l, /Object\.assign\(t, this\._trDragProps\(s\.id, e\)\)/, 'صفوفُ الإدارات'); assert.match(l, /Object\.assign\(o, p \? \{\} : this\._trDragProps\(s\.id, e\)\)/, 'صفوفُ العقد (لا دلوَ «بلا أب»)');
  const c = rd('src/modules/admin/helmet.css');
  ['.tr-rw.dragging', '.tr-rw.dz-before', '.tr-rw.dz-after', '.tr-rw.dz-inside', '.tr-hint'].forEach((k) => assert.ok(c.includes(k), k));
});
