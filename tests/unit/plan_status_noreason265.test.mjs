/* KIVO_265 · قرارُ المالك 2026-10-20 («هذا الإجراء يتطلب سبباً … لا أرغب بها — أزلها»): تغييرُ حالة عناصر الخطة التشغيلية من «التشغيل الميداني»
   (المصلى · البوابة · المعلم · المسار) بلا سببٍ إلزامي — على العامل الحقيقي بوضع الإنفاذ:
     (أ) مديرُ الإدارة يغيّر حالةَ بوابةٍ ومصلى ومعلمٍ ومسار (closed · fst · off · active) ويحفظ بلا سبب ⇒ مقبول، وسجلُّ التدقيق يحمل الفعل
     (ب) الصلاحيةُ ما زالت تُحكم: موظفٌ بلا صلاحية الخطة ⇒ مرفوض كما كان (لا «سبب» بل «perm»)
     (ج) فهرسُ الإنفاذ: مفاتيحُ الحالة الأربعة خارج قائمة السبب · وما سواها باقٍ (map.replace · plan.reopen · backup.restore …) — والمرجعُ v24.9 لم يُمسّ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, workerUnderTest, D, ME, stored } from './tasks_fx.mjs';
import { internals } from './internals.mjs';

const WU = workerUnderTest();
const PK = 'bsdept:' + D + ':bassam_plan_v1';
const DM = ['0000000101', '70101'];
async function getPlan(W, ck) { const g = await W.C.api('/api/get?keys=' + encodeURIComponent(PK), { cookie: ck }); return { v: JSON.parse(g.j.keys[PK].v), rev: g.j.keys[PK].rev }; }
const save = (W, ck, v, rev, why) => W.C.api('/api/save', { method: 'POST', cookie: ck, body: Object.assign({ set: { [PK]: JSON.stringify(v) }, base: { [PK]: rev } }, why ? { why: { [PK]: why } } : {}) });
const deniedWhy = (r) => r.j && r.j.denied && r.j.denied[PK] ? String(r.j.denied[PK].why || '') : '';

test('(أ) مديرُ الإدارة: تغييرُ حالة البوابة والمصلى والمعلم والمسار يُحفظ بلا سبب — ويُسجَّل في التدقيق', async () => {
  const W = await world({ worker: WU.file, mode: 'enforce' }); const dm = await W.login(...DM);
  const cases = [
    ['البوابة', (P) => { P.floors[0].gates[0].closed = 1; P.floors[0].gates[0].cWhy = 'زحام'; }],
    ['المصلى', (P) => { P.floors[0].zones[0].fst = 'full'; }],
    ['المعلم', (P) => { P.floors[0].marks[0].off = 1; }],
    ['المسار', (P) => { P.floors[0].paths[0].active = !P.floors[0].paths[0].active; }],
  ];
  for (const [name, mut] of cases) {
    const { v, rev } = await getPlan(W, dm.ck); mut(v);
    const r = await save(W, dm.ck, v, rev);
    assert.equal(deniedWhy(r), '', name + ': لا رفض — ' + JSON.stringify(r.j).slice(0, 300));
    assert.ok(r.j && r.j.revs && r.j.revs[PK] > rev, name + ': حُفظ');
  }
  const P = stored(W.env, PK);
  assert.equal(P.floors[0].gates[0].closed, 1); assert.equal(P.floors[0].zones[0].fst, 'full'); assert.equal(P.floors[0].marks[0].off, 1);
  const n = W.env.DB.q('SELECT COUNT(*) AS n FROM aud WHERE k = ?', PK)[0].n, z = W.env.DB.q('SELECT COUNT(*) AS n FROM authz WHERE k = ?', PK)[0].n;
  assert.ok(n >= 4, 'كلُّ حفظٍ في سجل التدقيق كما كان (aud ' + n + ')'); assert.ok(z >= 4, 'وقرارُ الإنفاذ مسجَّل (authz ' + z + ')');
  const last = W.env.DB.q('SELECT aft FROM aud WHERE k = ? ORDER BY id DESC LIMIT 4', PK).map((q) => q.aft).join(' ');
  assert.match(last, /gates\.0\.closed/, 'التدقيقُ يحمل الحقلَ المتغيّر');
});

test('(ب) الصلاحيةُ باقية: موظفٌ بلا صلاحية الخطة يُرفض كما كان — والرفضُ «perm» لا «reason»', async () => {
  const W = await world({ worker: WU.file, mode: 'enforce' }); const me = await W.login(ME.un, ME.pw), dm = await W.login(...DM);
  const { v, rev } = await getPlan(W, dm.ck); v.floors[0].gates[0].closed = 1;
  const r = await save(W, me.ck, v, rev);
  assert.ok(!(r.j && r.j.revs && r.j.revs[PK]), 'لم يُحفظ: ' + JSON.stringify(r.j).slice(0, 200));
  assert.notEqual(deniedWhy(r), 'reason', 'ليس سبباً');
});

test('(ج) فهرسُ الإنفاذ: مفاتيحُ الحالة الأربعة خارج قائمة السبب · وسائرُ مفاتيح السبب باقية · والمرجعُ يحمل audit.reason كما هو', async () => {
  const W = await internals(['KIVO_REGISTRY', 'ENF_REASON_OFF', 'enfIx']);
  const ix = W.enfIx(), R = W.KIVO_REGISTRY, off = ['lens.zones.status.change', 'lens.gates.status.change', 'lens.marks.status.change', 'lens.paths.status.change'];
  for (const k of off) { assert.ok(!ix.reason[k], k + ' بلا سبب'); assert.equal(R.byKey[k].audit.reason, true, k + ': المرجعُ v24.9 كما هو'); }
  for (const k of ['map.replace', 'plan.reopen', 'backup.restore', 'task.reopen', 'staff.reopen', 'report.reopen', 'emp.record.bulk.delete']) assert.ok(ix.reason[k], k + ' ما زال يطلب سبباً');
  assert.deepEqual(Object.keys(W.ENF_REASON_OFF).sort(), off.slice().sort(), 'الاستثناءُ هذه الأربعة وحدها');
});
