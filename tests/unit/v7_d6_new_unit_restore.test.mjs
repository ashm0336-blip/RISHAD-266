/* V7 · د6 (ب4) — أثرُ «الوحدة الجديدة تبدأ مطفأة» على الاستيراد والاستعادة: لا تغييرَ في مسارهما — السقفُ المرفق بالنسخة يبقى هو الحاكم.
   العاملُ الحقيقي (POST /api/backup/restore · نطاقُ إدارة · شريحةُ الصلاحيات permissionSlice) على وحدةٍ سجلُّها كما يكتبه البذرُ الجديد «مطفأة كلها»
   (v7_d6_holders_fx.offRecord — والاختبارُ v7_d6_new_unit_off يثبت أن البذرَ يكتب هذا السجلَّ بعينه). TEST_ONLY.
     · «استبدال» بنسخةٍ تحمل سقفاً (capSet:true) ⇒ سقفُ الوحدة = سقفُ النسخة (مصفّىً بصفحات المنصة) — لا تبقى مطفأة
     · «استبدال» بنسخةٍ بلا سجلّ سقف (capSet:false) ⇒ يُحذف سجلُّ الوحدة فتعود إلى افتراضها (مفتوحة / ترث) — كما كان
     · «دمج» في وحدةٍ لها سجلّ (والوحدةُ الجديدة لها سجلٌّ دائماً) ⇒ لا تُكتب الشريحة: تبقى الوحدةُ كما ضُبطت
     · سجلُّ الأقسام (subs: «العهد») لا تحمله الشريحة فلا يتغيّر · وكلُّ وحدةٍ أخرى كما هي
   وحكمُ الخادم = حكمُ الواجهة (320 BassamDepts.permSlice) على السجلّ نفسِه. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { world, ok } from './atomic_restore_review_fx.mjs';
import { D1, D2, copy } from './notifications_review_fx.mjs';
import { needs, blockFile, SRC } from './harness.mjs';
import { offRecord } from './v7_d6_holders_fx.mjs';

const KP = 'bassam_perms_v1', OFF = offRecord();
const pages = JSON.parse(fs.readFileSync(path.join(SRC, 'manifests', 'pages.json'), 'utf8')).pages.map((p) => p.key);
const lenses = fs.readdirSync(path.join(SRC, 'plugins', 'lenses')).map((d) => JSON.parse(fs.readFileSync(path.join(SRC, 'plugins', 'lenses', d, 'manifest.json'), 'utf8'))).sort((a, b) => a.order - b.order).map((m) => m.key);
/* 320 الحقيقية في vm — permSlice دالةٌ نقيّة */
function clientDepts() {
  class Storage { constructor() { this._m = new Map(); } getItem(k) { return this._m.has(k) ? this._m.get(k) : null; } setItem(k, v) { this._m.set(String(k), String(v)); } removeItem(k) { this._m.delete(k); } }
  const ls = new Storage(), w = { __BS_BOOT: { srv: 1, cf: 1 }, addEventListener() {}, localStorage: ls, console };
  const ctx = vm.createContext({ window: w, Storage, localStorage: ls, console, setTimeout, clearTimeout, document: { body: null, addEventListener() {}, getElementById() { return null; }, createElement() { return { remove() {}, addEventListener() {} }; } } });
  vm.runInContext(fs.readFileSync(blockFile('005-kivo-ns.js'), 'utf8'), ctx); ctx.KIVO = w.KIVO; ctx.KIVO.__BS_SRV = { flushAsync: async () => true };
  vm.runInContext(fs.readFileSync(blockFile('320-dept-storage.js'), 'utf8'), ctx);
  return w.KIVO.BassamDepts;
}
const DEPTS = clientDepts();
const readPerms = (B) => JSON.parse(B.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', KP).map((r) => r.v).join(''));
/* الوحدةُ D1 كأنها أُنشئت للتوّ بالافتراضي الجديد */
async function seeded(B) {
  const pm = copy(B.keys[KP]);
  pm.caps[D1] = OFF.caps.slice(); pm.subs = Object.assign({}, pm.subs, { [D1]: copy(OFF.subs) });
  await B.DB.batch(B.W.kvPutStmts(B.env, 'kv', KP, JSON.stringify(pm)));
  return pm;
}
const rest = (pm) => { const o = copy(pm); for (const m of ['caps', 'emps', 'lenses']) if (o[m]) delete o[m][D1]; if (o.lenses && !Object.keys(o.lenses).length) delete o.lenses; return o; };   /* ما سوى شريحة D1 (وخريطةُ العدسات الفارغة = غيابُها) */

test('V7 · د6 · ب4 — import / restore into a unit created «all OFF»: the ceiling attached to the copy still decides (replace · no-ceiling copy · merge), exactly as before', needs('award', 'custody', 'dstats', 'seized'), async () => {
  /* ① استبدال بنسخةٍ تحمل سقفاً */
  let B = await world(), pm = await seeded(B);
  let slice = { capSet: true, cap: ['emps', 'tasks', 'daily', 'admin', 'TEST_ONLY_unknown'], emps: {}, lenses: ['zones'] };
  ok(await B.restore(await B.body({ scope: { kind: 'dept', departmentId: D1 }, permissionSlice: slice })));
  let v = readPerms(B);
  assert.deepEqual(v.caps[D1], ['emps', 'tasks', 'daily', 'admin'], 'replace: the unit takes the copy\'s ceiling — it is no longer all OFF');
  assert.deepEqual(v.subs[D1], OFF.subs, 'the sections record is not part of the slice: «العهد» stays as the unit had it');
  assert.deepEqual(rest(v), rest(pm), 'every other unit as it was');
  assert.deepEqual(v, copy(DEPTS.permSlice(copy(pm), D1, copy(slice), 'replace', pages, lenses)), 'server = the client rule (320 permSlice)');
  /* ② استبدال بنسخةٍ بلا سجلّ سقف */
  B = await world(); pm = await seeded(B); slice = { capSet: false, emps: {} };
  ok(await B.restore(await B.body({ scope: { kind: 'dept', departmentId: D1 }, permissionSlice: slice })));
  v = readPerms(B);
  assert.equal(Object.prototype.hasOwnProperty.call(v.caps, D1), false, 'replace with a copy that has no ceiling record: the unit\'s record is removed (it follows its ancestors / is open) — unchanged behaviour');
  assert.deepEqual(v.subs[D1], OFF.subs); assert.deepEqual(rest(v), rest(pm));
  assert.deepEqual(v, copy(DEPTS.permSlice(copy(pm), D1, copy(slice), 'replace', pages, lenses)));
  /* ③ دمج: للوحدة سجلّ ⇒ لا تُكتب الشريحة */
  B = await world(); pm = await seeded(B); slice = { capSet: true, cap: pages.slice(), emps: {}, lenses: ['zones'] };
  const before = copy(B.DB.q('SELECT * FROM kv WHERE k=?1', KP));
  assert.equal(DEPTS.permSlice(copy(pm), D1, copy(slice), 'merge', pages, lenses), null, 'client rule: merge does not write over an existing ceiling');
  ok(await B.restore(await B.body({ scope: { kind: 'dept', departmentId: D1 }, mode: 'merge', permissionSlice: slice })));
  assert.deepEqual(copy(B.DB.q('SELECT * FROM kv WHERE k=?1', KP)), before, 'merge: the registry is byte-identical — the unit stays as it was set (all OFF)');
  void D2;
});
