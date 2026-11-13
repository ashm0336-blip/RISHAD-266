import { TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
/* KIVO_265 · حادثةُ الصور (إدارة سقيا زمزم · 2026-10-19) — البنود 2–5 من قائمة صفحة المهام، على العامل الحقيقي بالوضعين:
     task-own  الحفظُ الخامّ لا يمحو توثيقَ الموظف: صورةُ إثباتٍ تغيب · تسليمٌ (21.sub) أو بدءٌ (11) يقلّ — ولو كان الصفُّ مكرّرَ الهوية (لا يحميه tkKeepSelf)
     task-del  لا حذفَ فعلياً لصفٍّ عليه نشاط (قبول · توثيق · تسليم · إنجاز) — الحذفُ للأخطاء الحديثة (صفٌّ بلا نشاط) وحدها
     orphan    الصورةُ التي زال مرجعُها لا تُكنس فوراً: تُوسم «يتيمة» وتبقى في المخزن مدةَ السماح (30 يوماً) ثم تُكنس — ولا يقرؤها غيرُ مدير النظام */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { candidateWorker } from './irshad_domain_fx.mjs';
import { world, workerUnderTest, ME, KT, TAG, stored, putKV, hij, HR, PNG, taskCommandBody, operationSaveBody } from './tasks_fx.mjs';

const WU = workerUnderTest();
const DM = ['0000000101', '70101'];
const post = (W, ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body:operationSaveBody(W.env,p,taskCommandBody(W.env, p, body)) });
const get = (W, ck, p) => W.C.api(p, { cookie: ck });
async function upImg(W, ck, id) { const r = await W.C.api('/api/img/' + id, { method: 'PUT', cookie: ck, body: PNG, headers: { 'Content-Type': 'text/plain' } }); assert.equal(r.status, 200, 'رفعُ ' + id); return id; }
async function mk(W, ck, o = {}) {
  const s = o.s || Date.now() - HR, e = o.e || s + 3 * HR;
  const c = await post(W, ck, '/api/tasks/create', Object.assign({ k: hij(s), t: TAG + ' ' + (o.t || 'guard'), s, e, asg: [ME.eid], rv: 'none' }, o.body || {}));
  assert.equal(c.status, 200, JSON.stringify(c.j)); return { k: c.j.rows[0].k, id: c.j.rows[0].id };
}
async function raw(W, ck, mut) {
  const g = await get(W, ck, "/api/operations/read?keys=" + encodeURIComponent(KT)), S = g.j.resources[KT];
  const r = mut(S); if (r === false) return null;
  return post(W, ck, '/api/save', { set: { [KT]: JSON.stringify(S) }, base: { [KT]: g.j.base[KT] } });
}
const denied = (sv) => (sv.j && sv.j.denied && sv.j.denied[KT] ? String(sv.j.denied[KT].why || '?') : '');
const saved = (sv) => !!(sv.j && sv.j.revs && sv.j.revs[KT]);
const own = (W, img) => W.env.DB.q('SELECT st, k, ts FROM imgown WHERE img = ?', img)[0] || null;
const inStore = (W, img) => W.env.DB.q('SELECT COUNT(*) AS n FROM imgs WHERE k = ?', img)[0].n > 0;
const rowOf = (S, id) => { for (const d in S) { const r = (S[d] || []).find((q) => Array.isArray(q) && q[13] === id); if (r) return { d, r, i: S[d].indexOf(r) }; } return null; };

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';

  test(M + 'task-own: حفظُ المدير لا يُنقص توثيقَ الموظف — صورةٌ تغيب · تسليمٌ يُنزع · بدءٌ يُنزع ⇒ مرفوض · وتعديلُ العنوان مع التوثيق كما هو يمرّ', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), me = await W.login(ME.un, ME.pw);
    const a = await mk(W, dm.ck, { t: 'own' });
    assert.equal((await post(W, me.ck, '/api/me/tasks/act', { k: a.k, id: a.id, act: 'start' })).status, 200);
    const A = await upImg(W, me.ck, 'img_tskown_a1');
    assert.equal((await post(W, me.ck, '/api/me/tasks/act', { k: a.k, id: a.id, act: 'submit', imgs: [A], note: TAG + ' تم' })).status, 200);
    assert.equal(own(W, A).st, 'bound');
    /* (أ) تعديلٌ عادي مع التوثيق كما هو: يمرّ */
    let sv = await raw(W, dm.ck, (S) => { rowOf(S, a.id).r[0] = TAG + ' own معدَّل'; });
    assert.ok(saved(sv), 'التعديلُ العادي يمرّ: ' + JSON.stringify(sv.j).slice(0, 200));
    /* (ب) صفٌّ مكرّرُ الهوية (نسخةٌ ثانية بالمعرّف نفسِه في اليوم نفسِه — لا يطابقه tkKeepSelf) ثم حفظٌ يمحو العمودَ 21 من إحداهما */
    sv = await raw(W, dm.ck, (S) => { const o = rowOf(S, a.id); const dup = o.r.slice(); S[o.d].push(dup); });
    assert.ok(saved(sv) || denied(sv), 'نسخةٌ مكرّرة: ' + JSON.stringify(sv.j).slice(0, 120));
    if (saved(sv)) {
      sv = await raw(W, dm.ck, (S) => { for (const d in S) S[d].forEach((r) => { if (r[13] === a.id) { r[21] = null; r[12] = null; r[3] = 'in_progress'; } }); });
      assert.equal(denied(sv), 'task-own', 'محوُ التوثيق من صفٍّ مكرّر الهوية مرفوض: ' + JSON.stringify(sv.j).slice(0, 200));
      sv = await raw(W, dm.ck, (S) => { for (const d in S) S[d].forEach((r) => { if (r[13] === a.id) { r[11] = null; r[12] = null; r[3] = 'pending'; } }); });
      assert.equal(denied(sv), 'task-own', 'نزعُ البدء مرفوض');
      assert.ok(inStore(W, A) && own(W, A).st === 'bound', 'الصورةُ باقيةٌ مربوطة');
    }
  });

  test(M + 'task-del: حذفُ صفٍّ عليه نشاطٌ مرفوض (ويبقى التوثيق) · حذفُ صفٍّ جديدٍ بلا نشاط يمرّ · نقلُ الصفّ إلى يومٍ آخر ليس حذفاً', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), me = await W.login(ME.un, ME.pw);
    const a = await mk(W, dm.ck, { t: 'del-active' }), b = await mk(W, dm.ck, { t: 'del-fresh', s: Date.now() + 2 * HR });
    assert.equal((await post(W, me.ck, '/api/me/tasks/act', { k: a.k, id: a.id, act: 'ack' })).status, 200, 'استلامٌ فقط = نشاط');
    let sv = await raw(W, dm.ck, (S) => { const o = rowOf(S, a.id); S[o.d].splice(o.i, 1); });
    assert.equal(denied(sv), 'task-del', 'حذفُ المستلَمة مرفوض: ' + JSON.stringify(sv.j).slice(0, 200));
    sv = await raw(W, dm.ck, (S) => { const o = rowOf(S, b.id); S[o.d].splice(o.i, 1); if (!S[o.d].length) delete S[o.d]; });
    assert.ok(saved(sv), 'حذفُ الجديدة يمرّ: ' + JSON.stringify(sv.j).slice(0, 200));
    assert.ok(!rowOf(stored(W.env, KT), b.id), 'حُذفت');
    /* نقلُ الصفّ النشط إلى يومٍ آخر (الهويةُ نفسُها): ليس حذفاً */
    sv = await raw(W, dm.ck, (S) => { const o = rowOf(S, a.id); const r = o.r; S[o.d].splice(o.i, 1); if (!S[o.d].length) delete S[o.d]; const d2 = hij(Date.now() + 2 * 864e5); r[15] = Date.now() + 2 * 864e5; r[16] = r[15] + HR; (S[d2] = S[d2] || []).push(r); });
    assert.ok(saved(sv), 'النقلُ يمرّ: ' + JSON.stringify(sv.j).slice(0, 200));
    assert.ok(rowOf(stored(W.env, KT), a.id), 'الصفُّ باقٍ في يومه الجديد');
  });

  /* V7-F (owner decision 2) — REWRITTEN ON PURPOSE. This test pinned «the atomic save never sweeps»: an orphan past its 30 days stayed for ever,
     because every real save is atomic. The owner's decision: «التنظيف يعمل من مسار الحفظ الجديد فعلاً». Inside the grace nothing changes (still pinned
     here); past it the next accepted write deletes rows and R2 object — after the commit, never inside the SQL transaction. */
  test(M + 'orphan: الحفظ الذري يبقي الصورة اليتيمة وجسمها داخل مهلة السماح ويكنسها بعدها؛ الصلاحيات تحجبها عن الموظف والمدير وتسمح لمدير النظام', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), me = await W.login(ME.un, ME.pw), su = await W.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN);
    const a = await mk(W, dm.ck, { t: 'orphan' });
    assert.equal((await post(W, me.ck, '/api/me/tasks/act', { k: a.k, id: a.id, act: 'start' })).status, 200);
    const A = await upImg(W, me.ck, 'img_tskorph_a1'), B = await upImg(W, me.ck, 'img_tskorph_b2');
    assert.equal((await post(W, me.ck, '/api/me/tasks/act', { k: a.k, id: a.id, act: 'doc', imgs: [A, B], note: 'مسودّة' })).status, 200);
    assert.equal(own(W, A).st, 'bound');
    assert.equal((await post(W, me.ck, '/api/me/tasks/act', { k: a.k, id: a.id, act: 'doc', rm: [A] })).status, 200, 'حذفُ صورةٍ من المسودّة');
    const o = own(W, A); assert.ok(o, 'سجلُّ الملكية باقٍ'); assert.equal(o.st, 'orphan', 'يتيمةٌ لا محذوفة'); assert.ok(inStore(W, A), 'الجسمُ باقٍ في المخزن');
    assert.equal((await get(W, me.ck, '/api/me/tasks/img?id=' + A)).status, 403, 'الموظفُ لا يقرؤها (لم تعد في صفّه)');
    assert.equal((await get(W, dm.ck, '/api/img/' + A)).status, 403, 'المديرُ لا يقرؤها');
    assert.equal((await get(W, su.ck, '/api/img/' + A)).status, 200, 'مديرُ النظام يقرؤها (استرجاع)');
    assert.equal(own(W, B).st, 'bound', 'الأخرى كما هي');
    /* inside the grace (day 29) an atomic save leaves the orphan, its body and R2 alone */
    W.env.DB.exec("UPDATE imgown SET ts = ts - 29 * 86400000 WHERE img = '" + A + "'");
    const oldOwner=own(W,A),removed=[],drop=W.env.IMG_R2.delete.bind(W.env.IMG_R2);
    W.env.IMG_R2.delete=async key=>{removed.push(key);return drop(key);};
    assert.equal((await post(W, me.ck, '/api/me/tasks/act', { k: a.k, id: a.id, act: 'doc', note: 'مسودّة ٢' })).status, 200);
    assert.deepEqual(own(W,A),oldOwner,'داخل المهلة: لا كنس');assert.ok(inStore(W,A),'الجسم باقٍ');assert.deepEqual(removed,[],'لا حذفَ R2 داخل المهلة');
    /* past it (day 31) the next accepted atomic write sweeps it */
    W.env.DB.exec("UPDATE imgown SET ts = ts - 2 * 86400000 WHERE img = '" + A + "'");
    W.env.DB.exec("DELETE FROM guard WHERE gk = 'rl:img-sweep'");   /* V7-F (review, finding 5): a pass runs at most once per 10 minutes — two days went by */
    assert.equal((await post(W, me.ck, '/api/me/tasks/act', { k: a.k, id: a.id, act: 'doc', note: 'مسودّة ٣' })).status, 200);
    assert.equal(own(W,A),null,'بعد المهلة: سجلُّ الملكية كُنس');assert.equal(inStore(W,A),false,'والجسم');assert.deepEqual(removed,['img/'+A],'وكائنُ R2 — مرّةً واحدة');
    assert.ok(inStore(W, B) && own(W, B).st === 'bound', 'ولم تُمسّ الأخرى');
  });
}

/* V7-F: the sweeper is imgSweep now (it also runs after every accepted write) — its three rules are unchanged */
test('The orphan sweeper: grace and live references protect images; only a stale unreferenced image is removed',async()=>{
  const B=await world({worker:WU.file,mode:'enforce'}),W=await candidateWorker(['imgSweep','IMG_ORPHAN_GRACE']);
  try{
    const now=Date.now(),ids=['img_tskgc_grace','img_tskgc_bound','img_tskgc_stale'],removed=[],drop=B.env.IMG_R2.delete.bind(B.env.IMG_R2);
    B.env.IMG_R2.delete=async key=>{removed.push(key);return drop(key);};
    for(const [i,id]of ids.entries()){
      B.env.DB.db.prepare('INSERT INTO imgs(k,seq,v)VALUES(?,0,?)').run(id,PNG);
      B.env.DB.db.prepare('INSERT INTO imgown(img,st,k,uid,dept,ts)VALUES(?,?,?,?,?,?)').run(id,'orphan','','TEST_ONLY', 'tst_d1',now-(i?W.IMG_ORPHAN_GRACE+1:W.IMG_ORPHAN_GRACE-1));
    }
    B.env.DB.db.prepare('INSERT INTO imgref(img,k)VALUES(?,?)').run(ids[1],KT);
    await W.imgSweep(B.env,now,40);
    assert.ok(inStore(B,ids[0])&&own(B,ids[0]).st==='orphan','Grace protects the recent orphan');
    assert.ok(inStore(B,ids[1])&&own(B,ids[1]).st==='amb','A live bound reference prevents deletion');
    assert.equal(own(B,ids[2]),null);assert.equal(inStore(B,ids[2]),false);
    assert.equal(removed.length,1);assert.ok(removed[0].includes(ids[2]));
    assert.deepEqual(JSON.parse(JSON.stringify(B.env.DB.q('SELECT img,k FROM imgref WHERE img=?',ids[1]))),[{img:ids[1],k:KT}]);
  }finally{B.env.DB.db.close();}
});
