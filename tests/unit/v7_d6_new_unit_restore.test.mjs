/* V7 · د6 (ب4 — قرار المالك: «الاستيرادُ والاستعادة يُبقيان السقف المرفق»): استيرادُ نسخة إدارة / استعادتُها في وحدةٍ جديدة يعمل كما كان قبل ب4.
   قبل ب4 كانت الوحدةُ الجديدة (تحت أبٍ بلا سقف) بلا سجلّ سقف فيكتب لها الدمجُ والاستبدالُ سقفَ النسخة؛ وبعد ب4 لها سجلٌّ مبذور دائماً. فالسجلُّ المبذور
   معلَّمٌ صراحةً (bassam_perms_v1.capSeed[<الوحدة>] = { seed, caps, subs } — يكتبه 331 seedUnit ويمحوه أوّلُ ضبطٍ حقيقي للسقف؛ v7_d6_new_unit_off يثبت
   ذلك من الواجهة الحقيقية) وما دام لم يضبطه أحد يعامله الاستيرادُ كأن الوحدة بلا سجلّ. العاملُ الحقيقي (POST /api/backup/restore · نطاقُ إدارة ·
   permissionSlice) — وحكمُه = حكمُ الواجهة (320 permSlice، والخادمُ مولَّدٌ منها). TEST_ONLY.
     · وحدةٌ جديدة ('off' و'parent') + نسخةٌ تحمل سقفاً، دمجاً واستبدالاً ⇒ سقفُ الوحدة = سقفُ النسخة، والعلامةُ وسجلُّ الأقسام المبذور يزولان
     · نسخةٌ بلا سجلّ سقف ⇒ الوحدةُ بلا سجلّ (مفتوحة / ترث) — ما كان الكودُ القديم يُنتجه لوحدةٍ بلا سجلّ
     · بعد أن ضبط مديرُ المنصة السقفَ مرة (العلامةُ مُحيت) أو تغيّر السجلُّ عن نسخة العلامة ⇒ القاعدةُ القائمة: الدمجُ لا يكتب · الاستبدالُ يكتب
     · الدمجُ لا يكتب إن كان لموظفي الوحدة منحٌ قائم (كما كان لوحدةٍ بلا سجلّ) · وكلُّ وحدةٍ أخرى كما هي */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { world, ok } from './atomic_restore_review_fx.mjs';
import { D1, copy } from './notifications_review_fx.mjs';
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
/* ما يكتبه البذرُ لوحدةٍ جديدة (v7_d6_new_unit_off يثبت الشكلَ نفسَه من الواجهة الحقيقية): 'off' الصفحاتُ الدائمة و«العهد» مطفأ · 'parent' (أبٌ مفتوح) كلُّ الصفحات */
const SEED = { off: { caps: OFF.caps, subs: OFF.subs }, parent: { caps: OFF.all, subs: null } };
/* D1 كأنها أُنشئت للتوّ · f: تعديلٌ بعد البذر (ضبطُ شخص) */
async function unit(B, kind, f) {
  const pm = copy(B.keys[KP]), s = SEED[kind];
  pm.caps[D1] = s.caps.slice(); pm.emps[D1] = {};
  pm.subs = Object.assign({}, pm.subs); if (s.subs) pm.subs[D1] = copy(s.subs); else delete pm.subs[D1];
  if (pm.lenses) delete pm.lenses[D1];
  pm.capSeed = { [D1]: { seed: kind, caps: s.caps.slice(), subs: s.subs ? copy(s.subs) : null }, TEST_ONLY_other_unit: { seed: 'off', caps: OFF.caps.slice(), subs: copy(OFF.subs) } };
  if (f) f(pm);
  await B.DB.batch(B.W.kvPutStmts(B.env, 'kv', KP, JSON.stringify(pm)));
  return pm;
}
const norm = (pm) => { const o = copy(pm); for (const m of ['subs', 'lenses', 'capSeed']) if (o[m] && !Object.keys(o[m]).length) delete o[m]; return o; };
const rest = (pm) => { const o = copy(pm); for (const m of ['caps', 'emps', 'lenses', 'subs', 'capSeed']) if (o[m]) delete o[m][D1]; return norm(o); };   /* ما سوى الوحدة D1 */
const WITH = { capSet: true, cap: ['emps', 'tasks', 'daily', 'admin', 'TEST_ONLY_unknown'], emps: {}, lenses: ['zones'] }, COPY_CAP = ['emps', 'tasks', 'daily', 'admin'];
const NONE = { capSet: false, emps: {} };
async function run(kind, mode, slice, f) {
  const B = await world(), pm = await unit(B, kind, f), raw = copy(B.DB.q('SELECT * FROM kv WHERE k=?1', KP));
  const want = DEPTS.permSlice(copy(pm), D1, copy(slice), mode, pages, lenses);
  ok(await B.restore(await B.body({ scope: { kind: 'dept', departmentId: D1 }, mode, permissionSlice: slice })));
  const v = readPerms(B);
  if (want === null) assert.deepEqual(copy(B.DB.q('SELECT * FROM kv WHERE k=?1', KP)), raw, kind + ' · ' + mode + ': nothing written — byte-identical');
  else assert.deepEqual(v, copy(want), kind + ' · ' + mode + ': server = the client rule (320 permSlice)');
  assert.deepEqual(rest(v), rest(pm), kind + ' · ' + mode + ': every other unit (and its mark) as it was');
  return { v, pm, wrote: want !== null };
}

test('V7 · د6 · ب4 — import / restore into a NEW unit (seeded record, untouched): the copy\'s attached ceiling is applied in merge and in replace, as before ب4', needs('award', 'custody', 'dstats', 'seized'), async () => {
  for (const kind of ['off', 'parent']) for (const mode of ['merge', 'replace']) {
    const { v, wrote } = await run(kind, mode, WITH), L = kind + ' · ' + mode + ': ';
    assert.equal(wrote, true, L + 'the slice is written');
    assert.deepEqual(v.caps[D1], COPY_CAP, L + 'the unit\'s ceiling = the copy\'s (filtered by the platform\'s pages)');
    assert.deepEqual(v.lenses[D1], ['zones'], L + 'and the copy\'s lenses');
    assert.equal(v.subs && v.subs[D1], undefined, L + 'the seeded sections record goes with the seed (a unit with no record had none)');
    assert.equal(v.capSeed && v.capSeed[D1], undefined, L + 'the mark is cleared — the ceiling is now a set one');
  }
});

test('V7 · د6 · ب4 — a copy with NO ceiling record into a new unit: the unit is left with no record (open / inherits), exactly what the old code produced for a unit without a record', needs('award', 'custody', 'dstats', 'seized'), async () => {
  for (const kind of ['off', 'parent']) for (const mode of ['merge', 'replace']) {
    const { v, wrote } = await run(kind, mode, NONE), L = kind + ' · ' + mode + ': ';
    assert.equal(wrote, true);
    assert.equal(Object.prototype.hasOwnProperty.call(v.caps, D1), false, L + 'no ceiling record');
    assert.equal(v.subs && v.subs[D1], undefined, L + 'no sections record'); assert.equal(v.lenses && v.lenses[D1], undefined); assert.equal(v.capSeed && v.capSeed[D1], undefined, L + 'no mark');
    assert.deepEqual(v.emps[D1], {});
  }
});

test('V7 · د6 · ب4 — once a person has set the ceiling (mark cleared, or the record no longer equals the marked seed) today\'s rule holds: merge writes nothing, replace takes the copy', needs('award', 'custody', 'dstats', 'seized'), async () => {
  const cleared = (pm) => { delete pm.capSeed[D1]; };                                   /* ضبطٌ بالقيمة نفسِها: العلامةُ مُحيت (331 setDeptCap) */
  const edited = (pm) => { pm.caps[D1] = pm.caps[D1].concat(['links']).filter((k, i, a) => a.indexOf(k) === i).filter((k) => k !== 'admin'); };   /* تغيّر السجلُّ والعلامةُ باقية (كتابةٌ لم تمرّ بالكاتب) */
  const subsEdited = (pm) => { pm.subs[D1] = { emps: ['data', 'custody'] }; };
  const lensSet = (pm) => { pm.lenses = Object.assign({}, pm.lenses, { [D1]: ['zones'] }); };
  const own = (pm) => { pm.capOwn = Object.assign({}, pm.capOwn, { [D1]: true }); };
  for (const [name, f] of [['cleared', cleared], ['edited', edited], ['sections edited', subsEdited], ['lenses set', lensSet], ['independent', own]]) {
    const m = await run('off', 'merge', WITH, f);
    assert.equal(m.wrote, false, name + ': merge does not write over a ceiling a person set');
    const r = await run('off', 'replace', WITH, f);
    assert.deepEqual(r.v.caps[D1], COPY_CAP, name + ': replace takes the copy\'s ceiling (as today)');
    assert.equal(r.v.capSeed && r.v.capSeed[D1], undefined, name + ': and no mark is left');
    if (name === 'cleared') assert.deepEqual(r.v.subs[D1], OFF.subs, 'a set unit keeps its sections record on replace (the slice does not carry it) — as today');
    const n = await run('off', 'replace', NONE, f);
    assert.equal(Object.prototype.hasOwnProperty.call(n.v.caps, D1), false, name + ': replace with a no-ceiling copy removes the record (as today)');
  }
  /* منحُ موظفين قائم في الوحدة الجديدة: الدمجُ لا يكتب — كما كان لوحدةٍ بلا سجلّ ولها منح */
  const g = await run('off', 'merge', WITH, (pm) => { pm.emps[D1] = { TEST_ONLY_e: { emps: ['view'] } }; });
  assert.equal(g.wrote, false, 'existing employee grants: merge is a no-op, the seed and its mark stay');
});

test('V7 · د6 · ب4 — the mark grants nothing and is not a logged change', () => {
  const W = fs.readFileSync(path.join(SRC, '..', 'workers', '_worker.js'), 'utf8'), uses = W.split('\n').filter((l) => /capSeed/.test(l) && !/^\s*(\/\*|\*)/.test(l));
  /* في الخادم: حذفُها مع العقدة (018) · ومع الإدارة (019e) · وقاعدةُ الشريحة (rsPermSlice) — لا قراءةَ في حكم صلاحية */
  assert.ok(uses.length >= 3 && uses.every((l) => /NODE_CAP_MAPS|'capOwn', 'capSeed', 'subs'|pm\.capSeed|sd\b/.test(l)), 'server: only the node / unit clean-up and the restore slice read it:\n' + uses.join('\n'));
  assert.match(W, /function perm44CeilDiff\(a, b\) \{\s*var ch = \[\], f, d;\s*\['caps', 'subs', 'lenses'\]\.forEach/, 'the permissions log diffs caps · subs · lenses only — the mark is never a logged change');
  const M = fs.readFileSync(path.join(SRC, 'permissions', '331-perm-model.js'), 'utf8').split('\n').filter((l) => /capSeed/.test(l) && !/^\s*(\/\*|\*| {5}\S)/.test(l));
  assert.ok(M.every((l) => /unseed|capSeeded|o\.capSeed|r\.capSeed|'capSeed'/.test(l)), 'client: the store, the seed, unseed, capSeeded and the orphan count only');
});
