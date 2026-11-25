/* V7 · د7 (ك1 — ملف المالك 53): نسخةُ Production فيها perms.lenses = [zones, paths, dens]، وبعد استيرادها في المختبر ظهرت الإدارة بالعدسات الست مفعّلة.
   السبب: 019d rsDeptPermsKeep (قرارُ المالك ب3) كان يُسقط قائمةَ العدسات من النسخة كلياً — ووحدةٌ بلا سجلّ عدسات = الستُّ مفعّلة (057 enfLensDeptOn · 331 deptLenses).
   القاعدةُ (019d rsDeptLensNarrow): عدساتُ الوحدة بعد الاستيراد = عدساتُها قبله ∩ عدساتُ النسخة — لمدير المنصة ولمدير الإدارة (تضييقٌ لا توسيع: مديرُ الإدارة
   لا يوسّع سقفَ نفسه، والاستيرادُ لا يوسّع السقف). ما يُثبته على العامل المبنيّ الحقيقي وبالنسخة المصطنعة بشكل Production (v7_d6_import_fx oldFile):
     ① وحدةٌ بلا سجلّ عدسات ← العدساتُ الثلاث بالضبط: في المخزن · في عدسات الجلسة (/api/authz) · في سقف الأدوار (/api/perm44/check) · وفي الواجهة (deptLenses)
     ② وحدةٌ عدساتُها صريحة [zones, paths, gates, marks] ← [zones, paths] — ما لم يكن مفعّلاً في الهدف (dens) لا يُفعَّل، وما أطفأته النسخة (gates · marks) يُطفأ
     ③ نسخةٌ بلا قائمة عدسات (الغيابُ في Production = كلُّ العدسات) لا تكتب سجلَّ عدسات
   وبعد كل اعتماد تُقرأ كلُّ موارد الإدارة (readBack). TEST_ONLY — بياناتٌ مولَّدة في الذاكرة وحدها. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { WORKER, hasSystem, client } from './harness.mjs';
import { target, oldFile, protocol, staged, readBack, wantOf, LAB, PROD_LENSES } from './v7_d6_import_fx.mjs';
import { clientOf } from './v7_d6_holders_fx.mjs';
import { load } from './v7_cal_migrate_fx.mjs';

const B = 'TEST_ONLY_B', SCOPE = { kind: 'dept', departmentId: B }, ALL = ['zones', 'paths', 'gates', 'marks', 'dist', 'dens'];
const need = hasSystem('plan', 'daily', 'tasks', 'staff', 'dreport', 'custody') ? {} : { skip: 'يحتاج أنظمة بيانات العرض المصدر' };
const quiet = console.log; console.log = (...a) => { if (!/^\{"v":1/.test(String(a[0]))) quiet(...a); };
/* الاستيرادُ يحوّل الهجريَّ إلى الميلادي (53 تقويم) — فالمتوقَّعُ لموارد التقويم هو الوثيقةُ المحوَّلة بدالة العامل نفسها (كما في v7_cal_import14) */
const CALR = ['bassam_rounds_v1', 'bassam_dreport_v1', 'bassam_tasks_v1', 'bassam_staffing_v3', 'bassam_plan_v1', 'bassam_tasks_locks_v1', 'bassam_staffing_locks_v1', 'bassam_dayshift_v1', 'bassam_dayfocus_v1'];
let NEW = null;
const permsOf = (T) => JSON.parse(T.DB.q("SELECT group_concat(v,'') v FROM (SELECT v FROM kv WHERE k='bassam_perms_v1' ORDER BY seq)")[0].v);

/* سقفُ الهدف: النظامان المضيفان للعدسات (plan · daily) مفعّلان — فالعدسةُ تُحكم بقائمة العدسات وحدها · lens: سجلُّ عدسات الوحدة قبل الاستيراد (undefined = بلا سجلّ) */
async function prepare(T, lens) {
  const p0 = permsOf(T);
  p0.caps[B] = ['tasks', 'daily', 'dreport', 'admin', 'emps', 'staff', 'plan'];
  p0.lenses = { ...(p0.lenses || {}) };
  if (lens === undefined) delete p0.lenses[B]; else p0.lenses[B] = lens.slice();
  await T.DB.batch([...T.lab.W.kvPutStmts(T.lab.env, 'kv', 'bassam_perms_v1', JSON.stringify(p0)), T.DB.prepare('UPDATE revs SET rev=rev+1 WHERE k=?1').bind('bassam_perms_v1')]);
  return p0;
}
async function importAs(T, as, file) {
  const who = as === 'super' ? T.su : await T.login(LAB.mgrB, LAB.pw);
  const run = await protocol(T, who, file, { scope: SCOPE }).run();
  assert.equal(run.commit && run.commit.status, 200, as + ': ' + JSON.stringify((run.commit || run.inspect || run.begin).j).slice(0, 400));
  assert.equal(staged(T.DB), 0);
  NEW = NEW || await load(fs.readFileSync(WORKER, 'utf8'), 'new');
  const Tday = new Date().toISOString().slice(0, 10), expect = {};
  for (const [r, doc] of Object.entries(wantOf(T, file, B))) expect[r] = CALR.includes(r) ? NEW.calConvDoc(r, doc, { T: Tday, rep: null }) : doc;
  const got = await readBack(T, B, Object.fromEntries(Object.entries(expect).filter(([r]) => r !== 'bassam_rounds_v1')));   /* كلُّ موردٍ بعد الاعتماد — ومطابقةُ النسخة المحوَّلة */
  if (expect.bassam_rounds_v1) {   /* الجولات: الحيُّ + الأرشيف معاً = الجولاتُ المحوَّلة */
    const rounds = { ...(got.bassam_rounds_arc_v1 || {}), ...(got.bassam_rounds_v1 || {}) };
    assert.deepEqual(Object.keys(rounds).sort(), Object.keys(expect.bassam_rounds_v1).sort(), as + ': الجولات: المفاتيح');
    for (const k of Object.keys(expect.bassam_rounds_v1)) assert.deepEqual(rounds[k], expect.bassam_rounds_v1[k], as + ': الجولات ' + k);
  }
  return run;
}
/* العدساتُ الفعلية للوحدة من ثلاثة مصادر: الخادم (عدساتُ جلسة مديرها · سقفُ الأدوار) والواجهة الحقيقية (deptLenses في node:vm) */
async function effective(T) {
  const mgr = await T.login(LAB.mgrB, LAB.pw);
  const az = await T.call('/api/authz', { ck: mgr.ck });
  assert.equal(az.status, 200);
  const session = ((az.j.me.depts || {})[B] || {}).lens;
  const ceiling = [];
  for (const L of ALL) {
    const r = await T.call('/api/perm44/check?' + new URLSearchParams({ d: B, ekey: 'mgr:' + B, key: 'lens.' + L + '.view' }).toString(), { ck: T.su.ck });
    assert.equal(r.status, 200, JSON.stringify(r.j)); assert.equal(r.j.ok, 1);
    if (r.j.why !== 'ceiling') ceiling.push(L);
  }
  T.lab.env.__worker = T.lab.W.default;
  const c = await clientOf({ C: client(T.lab.env, 'https://lab.local'), ck: { mgr: mgr.ck } }, 'mgr', B);
  let ui;
  try { ui = c.ev('KIVO.BassamPerm.deptLenses(' + JSON.stringify(B) + ')'); } finally { c.dispose(); }
  return { session, ceiling, ui };
}
const exactly = (e, want, L) => { assert.deepEqual(e.session, want, L + ': عدساتُ الجلسة (الخادم)'); assert.deepEqual(e.ceiling, want, L + ': سقفُ الأدوار (/api/perm44/check)'); assert.deepEqual(e.ui, want, L + ': deptLenses (الواجهة)'); };

test('ك1 ① نسخةُ Production بعدساتٍ ثلاث [zones, paths, dens] تُستورد في وحدةٍ بلا سجلّ عدسات ← العدساتُ الثلاث بالضبط (لا الستّ) — مديرُ المنصة ومديرُ الإدارة', { timeout: 300000, ...need }, async () => {
  for (const as of ['super', 'mgr']) {
    const file = await oldFile({ small: true }), T = await target();
    try {
      assert.deepEqual(file.perms.lenses, PROD_LENSES); assert.deepEqual(PROD_LENSES, ['zones', 'paths', 'dens']);
      const before = await prepare(T, undefined);
      exactly(await effective(T), ALL, as + ' قبل الاستيراد (لا سجلّ = الستّ)');
      await importAs(T, as, file);
      const now = permsOf(T);
      assert.deepEqual(now.lenses[B], ['zones', 'paths', 'dens'], as + ': سجلُّ عدسات الوحدة = عدساتُ النسخة');
      exactly(await effective(T), ['zones', 'paths', 'dens'], as + ' بعد الاستيراد');
      assert.deepEqual(now.caps[B], before.caps[B], as + ': سقفُ الأنظمة كما في الهدف (ب3)');
      for (const d of Object.keys(before.caps)) if (d !== B) assert.deepEqual((now.lenses || {})[d], (before.lenses || {})[d], as + ': عدساتُ ' + d + ' لا تُمسّ');
    } finally { await T.close(); }
  }
});

test('ك1 ② وحدةٌ عدساتُها صريحة [zones, paths, gates, marks] ← [zones, paths] وحدها: ما أطفأته النسخة يُطفأ، وما لم يكن مفعّلاً في الهدف (dens) لا يُفعَّل (مديرُ الإدارة لا يوسّع سقفَ نفسه)', { timeout: 300000, ...need }, async () => {
  for (const as of ['mgr', 'super']) {
    const file = await oldFile({ small: true }), T = await target();
    try {
      await prepare(T, ['zones', 'paths', 'gates', 'marks']);   /* gates · marks: مخططُ النسخة يحملهما — مديرُ الإدارة لا يكتب بياناتِ عدسةٍ مطفأة في وحدته (يُرفض قبل الاعتماد) */
      await importAs(T, as, file);
      assert.deepEqual(permsOf(T).lenses[B], ['zones', 'paths'], as + ': الهدف ∩ النسخة');
      exactly(await effective(T), ['zones', 'paths'], as);
    } finally { await T.close(); }
  }
});

test('ك1 ③ نسخةٌ بلا قائمة عدسات (Production: الغيابُ = كلُّ العدسات) لا تكتب سجلَّ عدسات — والوحدةُ على حالها', { timeout: 300000, ...need }, async () => {
  const file = await oldFile({ small: true, lenses: null }), T = await target();
  try {
    assert.equal('lenses' in file.perms, false);
    await prepare(T, undefined);
    await importAs(T, 'mgr', file);
    assert.equal(Object.prototype.hasOwnProperty.call(permsOf(T).lenses || {}, B), false, 'لا سجلَّ عدسات');
    exactly(await effective(T), ALL, 'بلا قائمة');
  } finally { await T.close(); }
});
