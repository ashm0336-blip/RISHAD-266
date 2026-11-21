/* V7 · د5-هـ (أمن ٣) — «الموظفون»: تعارضٌ لا علاقة له بالحفظ. سياجُ المرجع (019d) كان يشهد على كلّ صفوف meta في نطاق الإدارة ومنها طوابعُ
   حارس المهام (tkg:<kind>:<dept> — يكتبها التوليدُ والمسحُ الكسولان كلَّ 5–10 دقائق) وعلى كلّ صفٍّ عامّ (الحسابات · الصلاحيات) — فكتابةٌ
   متزامنةٌ غيرُ ذات صلة كانت تحوّل حفظَ الموظفين أو قراءةَ التشغيل إلى 409. تداخلٌ مفروض: الكتابةُ المنافسة تقع بعد لقطة المرجع وقبل الدفعة
   التالية (خطّافٌ على DB.batch). التعارضُ الحقيقي (تعديلٌ متزامنٌ للموظف نفسِه) يبقى 409. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, D, KE, stored, operationSaveBody } from './world_fx.mjs';

const SNAP = /substr\(k,1,7\)<>'bsdept:'|SELECT k,seq,v FROM kv ORDER BY k,seq/;
/* run `change` once (or on every batch with every:true) right before the first batch that follows the reference snapshot */
async function race(B, change, run, every) {
  const DB = B.env.DB, batch = DB.batch.bind(DB); let seen = false, n = 0, snaps = 0;
  DB.batch = async (st) => {
    if (st.some((s) => SNAP.test(s.sql))) { seen = true; if (st.some((s) => /^SELECT k,v FROM meta WHERE/.test(s.sql))) snaps++; }   /* rsReferenceSnapshot: kv · meta · revs */
    else if (seen && (every || !n)) { n++; seen = !!every; change(DB.db); }
    return batch(st);
  };
  try { return { r: await run(), n, snaps }; } finally { DB.batch = batch; }
}
const tkgStamp = (db) => db.prepare("INSERT INTO meta(k,v) VALUES('tkg:rec:" + D + "',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v").run(String(Date.now() + Math.random()));
const permsWrite = (db) => {   /* an unrelated permissions write: a TEST_ONLY field nobody reads, new revision */
  const row = db.prepare("SELECT v FROM kv WHERE k='bassam_perms_v1' ORDER BY seq").all().map((x) => x.v).join('');
  const p = row ? JSON.parse(row) : {}; p.TEST_ONLY_unrelated = (p.TEST_ONLY_unrelated || 0) + 1;
  db.prepare("DELETE FROM kv WHERE k='bassam_perms_v1'").run(); db.prepare("INSERT INTO kv(k,seq,v) VALUES('bassam_perms_v1',0,?)").run(JSON.stringify(p));
  db.prepare("UPDATE meta SET v=CAST(CAST(v AS INTEGER)+1 AS TEXT) WHERE k='rev'").run();
  db.prepare("INSERT INTO revs(k,rev) VALUES('bassam_perms_v1',(SELECT CAST(v AS INTEGER) FROM meta WHERE k='rev')) ON CONFLICT(k) DO UPDATE SET rev=excluded.rev").run();
};
async function setup() {
  const B = await world({ mode: 'enforce' });
  const api = (path, body) => B.C.api(path, { cookie: B.su.ck, ...(body === undefined ? {} : { method: 'POST', body }) });
  return { ...B, api };
}
const read = (B) => B.api('/api/operations/read?keys=' + encodeURIComponent(KE));
async function saveBody(B, tag) {
  const r = await read(B); assert.equal(r.status, 200, JSON.stringify(r.j));
  const list = r.j.resources[KE]; assert.ok(Array.isArray(list) && list.length, 'employees present');
  const next = list.map((e, i) => (i === 0 ? { ...e, name: 'TEST_ONLY ' + tag } : e));
  return operationSaveBody(B.env, '/api/save', { set: { [KE]: JSON.stringify(next) }, del: [], base: { [KE]: r.j.base[KE] } });
}
const firstName = (B) => (stored(B.env, KE) || [])[0].name;

test('حفظُ الموظفين وكتابةُ طابع حارس المهام (tkg) بعد اللقطة: يُحفظ (كان 409)', async () => {
  const B = await setup(); const body = await saveBody(B, 'gate');
  const out = await race(B, tkgStamp, () => B.api('/api/save', body));
  assert.equal(out.n, 1, 'the gate stamp was written in between');
  assert.equal(out.r.status, 200, '★ ' + JSON.stringify(out.r.j)); assert.equal(out.r.j.ok, 1);
  assert.equal(firstName(B), 'TEST_ONLY gate');
});

test('حفظُ الموظفين وكتابةُ صلاحياتٍ غيرِ ذات صلة بعد اللقطة: يُحفظ (كان 409)', async () => {
  const B = await setup(); const body = await saveBody(B, 'perms');
  const out = await race(B, permsWrite, () => B.api('/api/save', body));
  assert.equal(out.n, 1);
  assert.equal(out.r.status, 200, '★ ' + JSON.stringify(out.r.j)); assert.equal(out.r.j.ok, 1);
  assert.equal(firstName(B), 'TEST_ONLY perms');
});

test('تعديلٌ متزامنٌ للموظف نفسِه بعد اللقطة: يبقى 409 ولا يُكتب شيء', async () => {
  const B = await setup(); const body = await saveBody(B, 'mine');
  const rival = await saveBody(B, 'rival'); rival.requestId += '_rival';
  const DB = B.env.DB, batch = DB.batch.bind(DB); let seen = false, done = null;
  DB.batch = async (st) => {
    if (st.some((s) => SNAP.test(s.sql))) seen = true;
    else if (seen && !done) { done = 'running'; DB.batch = batch; done = await B.api('/api/save', rival); DB.batch = hook; }
    return batch(st);
  };
  const hook = DB.batch;
  const r = await B.api('/api/save', body); DB.batch = batch;
  assert.equal(done.status, 200, 'the rival edit of the same employee committed: ' + JSON.stringify(done.j));
  assert.equal(r.status, 409, '★ the real conflict is still detected: ' + r.status + ' ' + JSON.stringify(r.j));
  assert.equal(firstName(B), 'TEST_ONLY rival', 'nothing of the losing save is written');
});

test('قراءةُ التشغيل وكتابةُ طابع حارس المهام أو صلاحياتٍ بعد اللقطة: القراءةُ تنجح (كانت 409)', async () => {
  for (const change of [tkgStamp, permsWrite]) {
    const B = await setup();
    const out = await race(B, change, () => read(B));
    assert.equal(out.n, 1);
    assert.equal(out.r.status, 200, '★ ' + change.name + ': ' + JSON.stringify(out.r.j)); assert.ok(Array.isArray(out.r.j.resources[KE]));
  }
});

test('قراءةٌ يتغيّر مرجعُها في كلّ محاولة: تعارضٌ صريح بعد إعادةٍ واحدة (لا حلقة)', async () => {
  const B = await setup();
  const out = await race(B, permsWrite, () => read(B), true);
  assert.equal(out.r.status, 409, JSON.stringify(out.r.j)); assert.equal(out.snaps, 2, 'one retry (two reference snapshots), then the conflict');
});
