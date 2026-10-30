/* KIVO_265 · مراجعةُ الخادم لتكرار المهام (rev_review_server — srv2): ما أعاده المراجِعُ بمجسّاته — بالوضعين (القديم 018/044 · الإنفاذ 059) وببياناتٍ اصطناعية وحدها:
     S1  إيقافٌ أو إنهاءٌ أو تعديلٌ حُفظ أثناء تشغيل التوليد: لا نسخةَ بعده بالقاعدة القديمة (كانت 5 نسخٍ بعد الإنهاء)
     S2  تضييقٌ ثم توسيع: النسخةُ التي ألغاها التعديلُ تعود إن صارت موعداً (نسخةٌ حيّةٌ واحدة لكل يوم) — وإلغاءُ المسؤول والإنهاء لا يعودان · مفتاحُ النسخة فريد
     S3  نسخُ السلسلة كلُّها في شهرٍ معتمد: 409 month-locked برسالةٍ تقول ما العمل (لا تجاوزَ لقفل الشهر — قرارُ المالك)
     S4  صاحبُ القالب بلا الإسناد (أو بلا الإنشاء) لا تُولَّد باسمه نسخة — denied بسببه
     S5  حدثُ تدقيقٍ من حفظٍ خامّ لا يُلغي موعداً ولا يُثبت صاحباً (معرّفُ 'tk…' للخادم وحده) — والمسارُ الذاتيّ والخادم يكتبان أحداثهما كما كانا
     S6  الوردية الليلية (يومُ الصفّ k وبدايتُه فجرَ k+1): لا نسختان في الوقت نفسِه للموظف نفسِه
     S7  /api/tasks/create: rec بمخطّط /api/tasks/recur نفسِه (لا مفاتيحَ زائدة · to نصٌّ)
     S8  سلسلةٌ أنهاها الإصدارُ السابق (to = اليوم بلا stop · وحدثُ rec_stop من الخادم) منتهيةٌ: لا تعديلَ ولا استئناف
     S9  الإنهاءُ والتعديل: حدثُ «أُلغيت» لكل نسخةٍ ملغاة — يراه كلُّ مكلَّفٍ في «سجل المهمة» · والحدثُ المجمَّع باقٍ · ولا تنبيه (كما كان)
     S10 rec-asg بمفاتيح 400 المعقودة (at)
     U1  stop {k, row}: نسخةُ هذه السلسلة المحدَّدة تبقى آخرَ موعدٍ لها */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, workerUnderTest, ME, MATE, KT, D, DAY, PDAY, TAG, stored, putKV, hij, MID, HR, wdOf, ymOf } from './tasks_fx.mjs';

const WU = workerUnderTest();
const DM = ['0000000101', '70101'], EMP1 = ['0000000113', '70113'], DM_UID = 'tst_dm1';
const KL = 'bsdept:' + D + ':bassam_tasks_locks_v1', PK = 'bassam_perms_v1', PMK = ymOf(PDAY);
const post = (W, ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body });
const get = (W, ck, p) => W.C.api(p, { cookie: ck });
const op = (W, ck, body) => post(W, ck, '/api/tasks/recur', body);
const run = (W) => post(W, W.su.ck, '/api/tasks/recur/run?dept=' + D, {});
const show = (r) => JSON.stringify({ st: r && r.status, j: r && r.j }).slice(0, 600);
const N0 = Date.now(), TM = MID(N0) + 864e5;
const at = (i, h) => TM + i * 864e5 + (h == null ? 8 : h) * HR;
const kOf = (i) => hij(at(i, 12)), wdI = (i) => wdOf(at(i, 12));
const allRows = (W) => { const S = stored(W.env, KT) || {}, o = []; for (const dk in S) (S[dk] || []).forEach((r, i) => { if (Array.isArray(r)) o.push({ dk, i, r }); }); return o; };
const ser = (W, id) => allRows(W).filter((q) => q.r[23] && q.r[23].rec && q.r[23].rec.id === id);
const recIdOf = (W, c) => { const q = c.j.rows[0]; return stored(W.env, KT)[q.k].find((r) => r[13] === q.id)[23].rec.id; };
const mk = (W, ck, o = {}) => post(W, ck, '/api/tasks/create', Object.assign({ k: kOf(0), t: TAG + ' ' + (o.title || 'سلسلة'), s: at(0), e: at(0) + HR, asg: [ME.eid], rv: 'none', force: true }, o.body || {}));
const setPerm = (W, eid, acts) => { const P = stored(W.env, PK); P.emps = P.emps || {}; P.emps[D] = P.emps[D] || {}; P.emps[D][eid] = { tasks: acts }; putKV(W.env, PK, P); };
const dn = (k) => { const p = String(k).split('-').map(Number); return p[0] * 10000 + p[1] * 100 + p[2]; };
const live = (W, id, dk, ek) => ser(W, id).filter((q) => q.dk === dk && !q.r[23].asg && (!ek || q.r[14] === ek));
const LKMSG = 'كلُّ مواعيد هذه السلسلة في شهرٍ معتمد مقفل — يمكن إيقافها أو تعديلها عند ظهور موعدها القادم (قبل استحقاقه بشهر)، أو بعد فتح الشهر';
/* S1: يُحفظ الفعلُ during() لحظةَ يسأل التوليدُ سجلَّ الخادم عن صاحب السلسلة (tkRecurAuthorOk) — بعد بناء الخطة من قراءتها وقبل كتابتها */
async function runWith(W, during) {
  let armed = true, res = null, interleavings = 0;
  const DB = W.env.DB, orig = DB.prepare.bind(DB), batch = DB.batch.bind(DB);
  const authorRead = sql => /act IN \('created', 'rec_start'\) AND uid = \?2/.test(sql);
  const interleave = async () => { if (armed) { armed = false; interleavings++; res = await during(); } };
  DB.prepare = (sql) => {
    const st = orig(sql);
    if (authorRead(sql)) {
      const f0 = st.first.bind(st);
      st.first = async (col) => { await interleave(); return f0(col); };
    }
    return st;
  };
  /* The guarded Worker sends first() through one DB.batch containing its
     schema/epoch witness and the author SELECT. Interleave BEFORE that atomic
     batch starts; never await a nested transaction inside SQLite's batch. The
     direct first hook above still covers historical unguarded Workers. */
  DB.batch = async statements => {
    if (armed && statements.some(statement => authorRead(statement.sql))) await interleave();
    return batch(statements);
  };
  try {
    const r = await run(W);
    assert.equal(interleavings, 1, 'The concurrent action must execute once at the real author-read boundary');
    assert.ok(res, 'The concurrent action returned its actual HTTP result');
    return { r, res };
  } finally { DB.prepare = orig; DB.batch = batch; }
}

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';

  test(M + 'S1 إيقافٌ · إنهاءٌ · تعديلٌ حُفظ أثناء التوليد: لا نسخةَ بالقاعدة القديمة بعده', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    /* الإنهاء */
    const c = await mk(W, dm.ck, { title: 'تُنهى أثناء التوليد', body: { rec: { t: 'daily', open: 1 } } }); assert.equal(c.status, 200, show(c));
    const id = recIdOf(W, c), rid = c.j.rows[0].id;
    const a = await runWith(W, () => op(W, dm.ck, { id, op: 'stop' }));
    assert.equal(a.res.status, 200, show(a.res)); assert.equal(a.r.status, 200, show(a.r));
    const after = ser(W, id).filter((q) => q.r[13] !== rid && !q.r[23].asg && q.r[3] === 'pending');
    assert.deepEqual(after.map((q) => q.dk + ' v' + q.r[23].rec.ver), [], 'لا نسخةَ حيّةً بعد الإنهاء');
    assert.equal(a.r.j.created, 0, show(a.r));
    /* الإيقافُ المؤقت */
    const p = await mk(W, dm.ck, { title: 'تُوقف أثناء التوليد', body: { rec: { t: 'daily', open: 1 } } }); assert.equal(p.status, 200, show(p));
    const idp = recIdOf(W, p), ridp = p.j.rows[0].id;
    const b = await runWith(W, () => op(W, dm.ck, { id: idp, op: 'pause' }));
    assert.equal(b.res.status, 200, show(b.res)); assert.equal(b.r.status, 200, show(b.r));
    assert.deepEqual(ser(W, idp).filter((q) => q.r[13] !== ridp).map((q) => q.dk + ' v' + q.r[23].rec.ver), [], 'لا نسخةَ لسلسلةٍ موقوفة');
    /* التعديل: يوميّةٌ تصير أسبوعيةً بيومٍ واحد — لا نسخةَ بالإصدار 1 · والتشغيلُ التالي بالقاعدة الجديدة وحدها */
    const e = await mk(W, dm.ck, { title: 'تُعدَّل أثناء التوليد', body: { rec: { t: 'daily', open: 1 } } }); assert.equal(e.status, 200, show(e));
    const ide = recIdOf(W, e), ride = e.j.rows[0].id, wd = [wdI(2)];
    const x = await runWith(W, () => op(W, dm.ck, { id: ide, op: 'edit', rec: { t: 'weekly', wd } }));
    assert.equal(x.res.status, 200, show(x.res)); assert.equal(x.res.j.ver, 2);
    assert.deepEqual(ser(W, ide).filter((q) => q.r[13] !== ride).map((q) => q.dk + ' v' + q.r[23].rec.ver), [], 'لا نسخةَ بالقاعدة المستبدَلة');
    const n2 = await run(W); assert.equal(n2.status, 200, show(n2));
    const g = ser(W, ide).filter((q) => q.r[13] !== ride);
    assert.ok(g.length >= 1, 'التوليدُ التالي بالقاعدة الجديدة: ' + show(n2));
    assert.ok(g.every((q) => q.r[23].rec.ver === 2 && wd.includes(wdOf(q.r[15]))), 'كلُّها بالإصدار 2 وفي يوم القاعدة: ' + JSON.stringify(g.map((q) => q.dk)));
  });

  test(M + 'S2 تضييقٌ ثم توسيع: نسخةٌ حيّةٌ واحدة لكل يوم · وإلغاءُ المسؤول والإنهاء لا يعودان · ومفتاحُ النسخة فريد', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    const c = await mk(W, dm.ck, { title: 'تضيق ثم تتّسع', body: { rec: { t: 'daily', open: 1 } } }); assert.equal(c.status, 200, show(c));
    const id = recIdOf(W, c); const r0 = await run(W); assert.ok(r0.j.created >= 4, show(r0));
    const man = live(W, id, kOf(3))[0]; assert.ok(man, 'نسخةُ الغد+3');
    assert.equal((await post(W, dm.ck, '/api/tasks/cancel', { k: man.dk, id: man.r[13], ekey: ME.eid, why: TAG + ' إلغاءُ المسؤول' })).status, 200);
    const e1 = await op(W, dm.ck, { id, op: 'edit', rec: { t: 'weekly', wd: [wdI(1)] } }); assert.equal(e1.status, 200, show(e1));
    const can = ser(W, id).filter((q) => q.r[23].asg === 'cancelled' && q.r[23].can && q.r[23].can.why === 'عُدّل التكرار');
    assert.equal(can.length, e1.j.cancelled); assert.ok(can.length >= 3, show(e1));
    const e2 = await op(W, dm.ck, { id, op: 'edit', rec: { t: 'daily' } }); assert.equal(e2.status, 200, show(e2));
    const r2 = await run(W); assert.equal(r2.status, 200, show(r2));
    for (const i of [0, 1, 2, 4]) assert.equal(live(W, id, kOf(i)).length, 1, 'نسخةٌ حيّةٌ واحدة: الغد+' + i + ' ' + JSON.stringify(ser(W, id).filter((q) => q.dk === kOf(i)).map((q) => q.r[23].asg || 'live')));
    assert.equal(r2.j.created, 0, 'لا نسخةَ ثانية ليومٍ عادت نسختُه');
    assert.equal(e2.j.restored, can.length, 'عادت كلُّها: ' + show(e2)); assert.equal(e2.j.cancelled, 0);
    assert.equal(live(W, id, kOf(3)).length, 0, 'إلغاءُ المسؤول لا يعود'); assert.equal(ser(W, id).filter((q) => q.dk === kOf(3)).length, 1);
    const back = ser(W, id).filter((q) => Array.isArray(q.r[23].canh));
    assert.equal(back.length, can.length);
    assert.ok(back.every((q) => q.r[23].canh[0].why === 'عُدّل التكرار' && q.r[23].canh[0].rec === 1 && !q.r[23].can && q.r[23].rec.ver === 3), 'الإلغاءُ السابق في سجلّ الصفّ (canh)');
    const rv = W.env.DB.q("SELECT eid FROM aud WHERE k = ? AND act = 'rec_edit' AND ctx LIKE ?", KT, '%"restored":1%');
    assert.deepEqual(rv.map((q) => q.eid).sort(), back.map((q) => q.r[22]).sort(), 'حدثُ العودة على هوية كل نسخة');
    const idem = ser(W, id).map((q) => q.r[23].idem).filter(Boolean); assert.equal(new Set(idem).size, idem.length, 'مفتاحُ النسخة فريد');
    /* إلغاءُ الإنهاء لا يعود: غيرُ موسوم · وبعد الإنهاء لا تعديل */
    const st = await op(W, dm.ck, { id, op: 'stop' }); assert.equal(st.status, 200, show(st));
    const cs = ser(W, id).filter((q) => q.r[23].asg === 'cancelled' && q.r[23].can.why === 'أُنهي التكرار'); assert.ok(cs.length >= 3);
    assert.ok(cs.every((q) => !q.r[23].can.rec), 'إلغاءُ الإنهاء غيرُ موسومٍ للعودة');
    assert.equal((await op(W, dm.ck, { id, op: 'edit', rec: { t: 'daily', open: 1 } })).status, 409);
    assert.equal(ser(W, id).filter((q) => dn(q.dk) > dn(DAY) && !q.r[23].asg && q.r[3] === 'pending').length, 0, 'الإنهاءُ ألغى القادمة');
  });

  test(M + 'S3 نسخُ السلسلة كلُّها في شهرٍ معتمد: 409 month-locked برسالةٍ تقول ما العمل — ولا كتابة', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    const T = DAY.split('-').map(Number), d0 = T[2] > 1 ? T[2] - 1 : 15;          /* يومٌ من الشهر الماضي — KIVO_265 · البند 15: الأفقُ 30 يوماً يشمل موعدَ الشهر الجاري/القادم فتُوقف السلسلةُ مؤقتاً قبل القفل لتبقى بنسخة الشهر المقفل وحدها */
    let i0 = -1; while (i0 > -70 && hij(MID(N0) + i0 * 864e5 + 12 * HR) !== PMK + '-' + d0) i0--;
    const sP = MID(N0) + i0 * 864e5 + 8 * HR, kP = hij(sP); assert.equal(kP, PMK + '-' + d0);
    putKV(W.env, KL, {});
    const c = await post(W, dm.ck, '/api/tasks/create', { k: kP, t: TAG + ' شهرية', s: sP, e: sP + HR, asg: [ME.eid], rv: 'none', force: true, rec: { t: 'monthly', md: d0, open: 1 } });
    assert.equal(c.status, 200, show(c)); const id = recIdOf(W, c);
    const pz = await op(W, dm.ck, { id, op: 'pause' }); assert.equal(pz.status, 200, show(pz));
    assert.equal((await run(W)).status, 200); assert.equal(ser(W, id).length, 1, 'موقوفةٌ مؤقتاً — لا نسخةَ في الأفق');
    putKV(W.env, KL, { [PMK]: true });                                              /* اعتُمد الشهرُ الماضي */
    const L0 = JSON.stringify(ser(W, id).map((q) => q.r));
    for (const b of [{ id, op: 'stop' }, { id, op: 'resume' }, { id, op: 'edit', rec: { t: 'monthly', md: 1, open: 1 } }]) {
      const r = await op(W, dm.ck, b); assert.equal(r.status, 409, b.op + ': ' + show(r)); assert.equal(r.j.err, 'month-locked'); assert.equal(r.j.msg, LKMSG, b.op);
    }
    assert.equal(JSON.stringify(ser(W, id).map((q) => q.r)), L0, 'لا تجاوزَ لقفل الشهر: لا كتابة');
  });

  test(M + 'S4 صاحبُ القالب بلا الإسناد أو بلا الإنشاء: لا تُولَّد باسمه نسخة', async () => {
    const W = await world({ worker: WU.file, mode });
    setPerm(W, 'tst_e_emp1', ['view', 'add', 'edit']); const e1 = await W.login(...EMP1);
    const c = await mk(W, e1.ck, { title: 'صاحبُها يفقد الإسناد', body: { rec: { t: 'daily', open: 1 } } }); assert.equal(c.status, 200, show(c));
    const id = recIdOf(W, c);
    const WHY = 'صاحبُ القالب لا يملك صلاحيةَ الإنشاء والإسناد الآن';
    for (const acts of [['view', 'add'], ['view', 'edit']]) {
      setPerm(W, 'tst_e_emp1', acts);
      const r = await run(W); assert.equal(r.status, 200, show(r));
      assert.equal(ser(W, id).length, 1, acts.join('+') + ': لا نسخةَ مولَّدة ' + show(r));
      assert.ok(r.j.denied.some((q) => q.why === WHY && q.n >= 1), acts.join('+') + ': ' + JSON.stringify(r.j.denied));
    }
    setPerm(W, 'tst_e_emp1', ['view', 'add', 'edit']);
    const ok = await run(W); assert.ok(ok.j.created >= 4 && ser(W, id).length >= 5, 'بالصلاحيتين يعود التوليد: ' + show(ok));
  });

  test(M + 'S5 حدثٌ من حفظٍ خامّ لا يُلغي موعداً ولا يُثبت صاحباً — وأحداثُ الخادم والمسار الذاتي كما هي', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), me = await W.login(ME.un, ME.pw);
    const c = await mk(W, dm.ck, { title: 'لا يُلغيها مزوِّر', body: { rec: { t: 'daily', open: 1 } } }); assert.equal(c.status, 200, show(c));
    const id = recIdOf(W, c);
    setPerm(W, 'tst_e_emp1', ['view', 'add']); const e1 = await W.login(...EMP1);
    assert.equal((await op(W, e1.ck, { id, op: 'stop' })).status, 403, 'لا يملك الإنهاء');
    let n = 0;
    for (const [cid, i] of [['tkforge' + Date.now().toString(36), 2], ['cforge' + Date.now().toString(36), 3]]) {
      const g = await get(W, e1.ck, '/api/get?keys=' + encodeURIComponent(KT)), kv = g.j.keys[KT], S = JSON.parse(kv.v), s = at(i, 14);
      S[kOf(i)] = (S[kOf(i)] || []).concat([[TAG + ' طُعم', '', 'normal', 'pending', 'normal', 'مضافة', null, [], '', TAG, 60, null, null, 1790000000555 + (n++), null, s, s + HR, null, null, null, null, null]]);
      const sv = await post(W, e1.ck, '/api/save', { set: { [KT]: JSON.stringify(S) }, base: { [KT]: kv.rev },
        aud: [{ cid, k: KT, etype: 'task', act: 'created', eid: 'Tdecoy' + i, ename: 'x', ctx: JSON.stringify({ idem: 'r:' + id + ':' + kOf(i) + ':' + ME.eid }) }] });
      assert.ok(sv.j && sv.j.revs && sv.j.revs[KT], 'الحفظُ الخامّ نفسُه يمضي: ' + show(sv));
    }
    const r = await run(W); assert.equal(r.status, 200, show(r));
    for (const i of [1, 2, 3, 4]) assert.equal(live(W, id, kOf(i)).length, 1, 'الموعدُ قائم: الغد+' + i);
    assert.equal(W.env.DB.q("SELECT COUNT(*) AS n FROM aud WHERE cid LIKE 'tkforge%'")[0].n, 0, 'معرّفُ الخادم من العميل يُسقط');
    assert.equal(W.env.DB.q("SELECT COUNT(*) AS n FROM aud WHERE cid LIKE 'cforge%'")[0].n, 1, 'وحدثُ العميل بمعرّفه يُكتب كما كان');
    /* حدثُ «حُوِّلت إلى متكررة» مزوَّرٌ بهوية المزوِّر نفسِه (مديرُ النظام يستعيد نموذجاً صاحبُه هو) لا يُثبت صاحباً — بمعرّف العميل ولا بمعرّف الخادم */
    const su = (await get(W, W.su.ck, '/api/whoami')).j.uid; assert.ok(su);
    for (const [rid, cid] of [['rforgeA', 'rforgeev' + Date.now().toString(36)], ['rforgeB', 'tkforgeev' + Date.now().toString(36)]]) {
      const g2 = await get(W, W.su.ck, '/api/get?keys=' + encodeURIComponent(KT)), S2 = JSON.parse(g2.j.keys[KT].v), s2 = at(0, 10), who = { u: su, e: '', n: TAG + ' مدير' };
      const x = { v: 2, by: who, pol: { m: 'none' }, rv: null, dec: 1, idem: 'r:' + rid + ':' + kOf(0) + ':' + MATE.eid, rec: { t: 'daily', id: rid, ver: 1, from: kOf(0), paused: 0, asg: [MATE.eid], by: who } };
      S2[kOf(0)] = (S2[kOf(0)] || []).concat([[TAG + ' ' + rid, '', 'normal', 'pending', 'normal', 'مضافة', null, ['T'], MATE.name, TAG, 60, null, null, 1790000000700 + (n++), MATE.eid, s2, s2 + HR, null, null, null, null, null, 'T' + rid, x]]);
      const w = await post(W, W.su.ck, '/api/save', { set: { [KT]: JSON.stringify(S2) }, del: [], base: { [KT]: g2.j.keys[KT].rev },
        aud: [{ cid: 'rforge' + rid + Date.now().toString(36), k: KT, etype: 'dataset', act: 'restore', eid: 'bassam_tasks_v1', ename: 'bassam_tasks_v1' },
          { cid, k: KT, etype: 'task', act: 'rec_start', eid: 'T' + rid, ename: 'x', ctx: JSON.stringify({ rec: rid, idem: x.idem }) }],
        ops: { [KT]: { op: 'backup.restore', scope: 'dept', mode: 'replace', reason: TAG } }, why: { [KT]: TAG } });
      assert.ok(w.j && w.j.revs && w.j.revs[KT], 'النموذجُ مكتوبٌ باستعادةٍ مخوَّلة: ' + show(w));
      const rr = await run(W); assert.equal(rr.status, 200, show(rr));
      assert.equal(ser(W, rid).length, 1, rid + ': لا نُسخَ مولَّدة');
      assert.ok(rr.j.denied.some((q) => q.id === rid && /سجلَّ إنشائها/.test(q.why)), rid + ': ' + JSON.stringify(rr.j.denied));
    }
    /* المسارُ الذاتيّ: حدثُه بمعرّف الخادم يُكتب كما كان (سجلُّ المهمة) */
    const q = live(W, id, kOf(1))[0], ak = await post(W, me.ck, '/api/me/tasks/act', { k: q.dk, id: q.r[13], act: 'ack' }); assert.equal(ak.status, 200, show(ak));
    assert.ok(W.env.DB.q("SELECT COUNT(*) AS n FROM aud WHERE k = ? AND eid = ? AND cid LIKE 'tk%'", KT, q.r[22])[0].n >= 2, 'أُنشئت · أُكّد استلامُها');
  });

  test(M + 'S6 الوردية الليلية: يومُ الصفّ k وبدايتُه فجرَ k+1 — لا نسختان في الوقت نفسِه · والموعدُ في يومه التالي لكل يوم', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    const s = at(1, 1);
    const c = await post(W, dm.ck, '/api/tasks/create', { k: kOf(0), t: TAG + ' ليلية', s, e: s + HR, asg: [ME.eid], rv: 'none', force: true, rec: { t: 'daily', open: 1 } });
    assert.equal(c.status, 200, show(c)); const id = recIdOf(W, c);
    const one = await post(W, dm.ck, '/api/tasks/create', { k: kOf(0), t: TAG + ' ليلية للتحويل', s, e: s + HR, asg: [MATE.eid], rv: 'none', force: true }); assert.equal(one.status, 200, show(one));
    const st = await op(W, dm.ck, { op: 'start', k: kOf(0), id: one.j.rows[0].id, rec: { t: 'daily', open: 1 } }); assert.equal(st.status, 200, show(st));
    assert.equal((await run(W)).status, 200);
    for (const [rid, ek] of [[id, ME.eid], [st.j.rec.id, MATE.eid]]) {
      const L = ser(W, rid).filter((q) => q.r[14] === ek), ts = L.map((q) => q.r[15]);
      assert.equal(new Set(ts).size, ts.length, 'لا وقتان متطابقان: ' + JSON.stringify(L.map((q) => q.dk + '@' + q.r[15])));
      for (let i = 1; i <= 4; i++) {
        const q = L.filter((x) => x.dk === kOf(i)); assert.equal(q.length, 1, 'نسخةُ الغد+' + i);
        assert.equal(q[0].r[15], at(i + 1, 1), 'بدايتُها فجرَ يومها التالي: الغد+' + i); assert.equal(q[0].r[16] - q[0].r[15], HR);
      }
    }
    /* والحكمُ بيوم الصفّ لا بيوم بدايته (تعديلٌ أسبوعيّ): يومُ القاعدة باقٍ وغيرُه يُلغى */
    const e = await op(W, dm.ck, { id, op: 'edit', rec: { t: 'weekly', wd: [wdI(2)] } }); assert.equal(e.status, 200, show(e));
    assert.equal(live(W, id, kOf(2), ME.eid).length, 1, 'يومُ القاعدة'); for (const i of [1, 3, 4]) assert.equal(live(W, id, kOf(i), ME.eid).length, 0, 'ليس موعداً: الغد+' + i);
  });

  test(M + 'S7 /api/tasks/create: rec بمخطّط /api/tasks/recur نفسِه (لا مفاتيحَ زائدة · to نصٌّ)', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    const n0 = allRows(W).length;
    for (const [rec, at2] of [[{ t: 'daily', open: 1, stop: 1, by: { u: 'tst_sup1' } }, 'rec.stop'], [{ t: 'daily', zz: 1 }, 'rec.zz'], [{ t: 'daily', to: [kOf(5)] }, 'rec.to'], [{ t: 'weekly', wd: ['1'] }, 'rec.wd[0]'], [{ t: 1 }, 'rec.t']]) {
      const r = await mk(W, dm.ck, { body: { rec } }); assert.equal(r.status, 400, JSON.stringify(rec) + ' ⇒ ' + show(r)); assert.equal(r.j.err, 'bad-body'); assert.equal(r.j.at, at2);
    }
    assert.equal(allRows(W).length, n0, 'لم يُكتب شيء');
    const ok = await mk(W, dm.ck, { body: { rec: { t: 'weekly', wd: [wdI(1)], to: kOf(20) } } }); assert.equal(ok.status, 200, show(ok));
    const ok2 = await mk(W, dm.ck, { body: { rec: { t: 'monthly', md: 3, open: true, wd: null, to: null } } }); assert.equal(ok2.status, 200, show(ok2));
  });

  test(M + 'S8 سلسلةٌ أنهاها الإصدارُ السابق (to = اليوم · حدثُ rec_stop من الخادم · بلا stop): منتهية', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    const o = await mk(W, dm.ck, { title: 'أنهاها الإصدارُ السابق', body: { rec: { t: 'daily', to: kOf(10) } } }); assert.equal(o.status, 200, show(o));
    const ctl = await mk(W, dm.ck, { title: 'نهايتُها اليوم', body: { rec: { t: 'daily', to: kOf(10) } } }); assert.equal(ctl.status, 200, show(ctl));
    const ido = recIdOf(W, o), idc = recIdOf(W, ctl);
    const S = stored(W.env, KT); for (const dk in S) for (const r of S[dk]) if (r && r[23] && r[23].rec && (r[23].rec.id === ido || r[23].rec.id === idc)) r[23].rec = Object.assign({}, r[23].rec, { to: DAY });
    putKV(W.env, KT, S);
    const ins = (cid, rid) => W.env.DB.db.prepare('INSERT INTO aud (cid, ts, uid, un, dept, k, rev, etype, eid, ename, act, ctx, bef, aft, ip, dev, city) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(cid, Date.now() - 6e4, DM_UID, '', D, KT, 'task', 'Told', 'x', 'rec_stop', JSON.stringify({ via: 'srv', rec: rid }), '', JSON.stringify({ n: 2, cancelled: 1 }), '', '', '');   /* صيغةُ الإصدار السابق (896573c) */
    ins('tk' + Date.now().toString(36) + '_old', ido);
    ins('cforgestop' + Date.now().toString(36), idc);                                /* حدثُ عميلٍ لا يُنهي سلسلة (S5) */
    for (const b of [{ id: ido, op: 'edit', rec: { t: 'daily', open: 1 } }, { id: ido, op: 'resume' }, { id: ido, op: 'pause' }, { id: ido, op: 'stop' }]) {
      const r = await op(W, dm.ck, b); assert.equal(r.status, 409, b.op + ': ' + show(r)); assert.equal(r.j.err, 'rec-ended');
    }
    assert.ok(ser(W, ido).every((q) => q.r[23].rec.to === DAY && !('stop' in q.r[23].rec) && q.r[23].rec.ver === 1), 'لم تُحيَ ولم تُكتب');
    const ce = await op(W, dm.ck, { id: idc, op: 'edit', rec: { t: 'daily', open: 1 } }); assert.equal(ce.status, 200, 'نهايةٌ طبيعيةٌ اليوم (بلا حدث إنهاءٍ من الخادم) تُعدَّل كما كانت ' + show(ce));
  });

  test(M + 'S9 الإنهاءُ والتعديل: حدثُ «أُلغيت» لكل نسخةٍ ملغاة — يراه كلُّ مكلَّفٍ في «سجل المهمة» · والحدثُ المجمَّع باقٍ · ولا تنبيه', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), me = await W.login(ME.un, ME.pw), mate = await W.login(MATE.un, MATE.pw);
    const c = await mk(W, dm.ck, { title: 'يُلغى تكرارُها', body: { asg: [ME.eid, MATE.eid], rec: { t: 'daily', open: 1 } } }); assert.equal(c.status, 200, show(c));
    const id = recIdOf(W, c); assert.ok((await run(W)).j.created >= 8);
    const NK = 'bsdept:' + D + ':bassam_notif_v1', nOf = () => { const nt = stored(W.env, NK); return nt && Array.isArray(nt.items) ? nt.items.filter((x) => x.type === 'task_chg').length : 0; }, n0 = nOf();
    const evOf = (why) => W.env.DB.q("SELECT eid, ctx, aft FROM aud WHERE k = ? AND act = 'cancelled' AND ctx LIKE ?", KT, '%"rec":"' + id + '"%').filter((q) => JSON.parse(q.aft).why === why);
    const e = await op(W, dm.ck, { id, op: 'edit', rec: { t: 'weekly', wd: [wdI(1)] } }); assert.equal(e.status, 200, show(e));
    const ce = ser(W, id).filter((q) => q.r[23].asg === 'cancelled');
    assert.ok(ce.length >= 6 && ce.length === e.j.cancelled, show(e));
    assert.deepEqual(evOf('عُدّل التكرار').map((q) => q.eid).sort(), ce.map((q) => q.r[22]).sort(), 'حدثٌ لكل نسخةٍ ألغاها التعديل');
    const st = await op(W, dm.ck, { id, op: 'stop' }); assert.equal(st.status, 200, show(st)); assert.ok(st.j.cancelled >= 2, show(st));
    const cs = ser(W, id).filter((q) => q.r[23].asg === 'cancelled' && q.r[23].can.why === 'أُنهي التكرار');
    assert.equal(cs.length, st.j.cancelled);
    const es = evOf('أُنهي التكرار'); assert.deepEqual(es.map((q) => q.eid).sort(), cs.map((q) => q.r[22]).sort(), 'حدثٌ لكل نسخةٍ ألغاها الإنهاء');
    assert.ok(es.every((q) => { const x = JSON.parse(q.ctx); return x.via === 'srv' && x.rec === id && x.why === 'أُنهي التكرار' && x.day; }), 'ctx {day, via, rec, why}');
    for (const [ck, ek, why] of [[me.ck, ME.eid, 'أُنهي التكرار'], [mate.ck, MATE.eid, 'أُنهي التكرار'], [me.ck, ME.eid, 'عُدّل التكرار'], [mate.ck, MATE.eid, 'عُدّل التكرار']]) {
      const q = ser(W, id).filter((x) => x.r[14] === ek && x.r[23].asg === 'cancelled' && x.r[23].can.why === why)[0]; assert.ok(q, ek + ' ' + why);
      const lg = await get(W, ck, '/api/me/tasks/log?k=' + encodeURIComponent(q.dk) + '&id=' + encodeURIComponent(q.r[13])); assert.equal(lg.status, 200, show(lg));
      assert.ok(lg.j.events.some((v) => v.act === 'cancelled' && v.why === why), ek + ' ' + why + ': ' + JSON.stringify(lg.j.events.map((v) => v.act)));
    }
    for (const a of ['rec_edit', 'rec_stop']) assert.equal(W.env.DB.q('SELECT COUNT(*) AS n FROM aud WHERE k = ? AND act = ? AND ctx LIKE ?', KT, a, '%"rec":"' + id + '"%')[0].n, 1, a + ': حدثٌ مجمَّعٌ واحد');
    assert.equal(nOf(), n0, 'لا تنبيهَ إلغاءٍ (كما كان)');
  });

  test(M + 'S10 rec-asg بمفاتيح 400 المعقودة (ok · err · at)', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    const na = await mk(W, dm.ck, { body: { asg: [], rec: { t: 'daily' } } });
    assert.equal(na.status, 400, show(na)); assert.equal(na.j.err, 'rec-asg'); assert.equal(na.j.at, 'rec'); assert.ok(na.j.msg);
  });

  test(M + 'U1 stop {k, row}: نسخةُ هذه السلسلة المحدَّدة تبقى آخرَ موعدٍ لها · وما سواها كما هو', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    const c = await mk(W, dm.ck, { title: 'تُنهى من موعدٍ قادم', body: { asg: [ME.eid, MATE.eid], rec: { t: 'daily', open: 1 } } }); assert.equal(c.status, 200, show(c));
    const id = recIdOf(W, c); assert.ok((await run(W)).j.created >= 8);
    const other = await mk(W, dm.ck, { title: 'سلسلةٌ أخرى', body: { rec: { t: 'daily', open: 1 } } }); assert.equal(other.status, 200); const ido = recIdOf(W, other); await run(W);
    const keep = live(W, id, kOf(2), ME.eid)[0], foreign = live(W, ido, kOf(3), ME.eid)[0]; assert.ok(keep && foreign);
    const st = await op(W, dm.ck, { id, op: 'stop', k: keep.dk, row: String(keep.r[13]) }); assert.equal(st.status, 200, show(st));
    const k2 = ser(W, id).find((q) => q.dk === keep.dk && q.r[13] === keep.r[13]);
    assert.ok(!k2.r[23].asg, 'النسخةُ المحدَّدة باقية'); assert.equal(k2.r[3], 'pending');
    assert.equal(st.j.kept, 1, show(st)); assert.equal(st.j.restored, 0);
    assert.equal(k2.r[23].rec.stop, 1); assert.equal(k2.r[23].rec.to, DAY, 'وما سواها كما هو: النهايةُ اليوم');
    const can = ser(W, id).filter((q) => q.r[23].asg === 'cancelled'); assert.equal(can.length, st.j.cancelled);
    /* المهمةُ جماعية (مكلَّفان): «لمرة واحدة» من نموذج المجموعة يُبقي صفَّ كلِّ عضوٍ في مجموعة الصفّ المعدَّل يومَها (r[17]) — وما سواهما أُلغي */
    const grpOf = keep.r[17]; assert.ok(grpOf, 'صفُّ المهمة الجماعية يحمل معرّفَ مجموعتها');
    const keptRows = (q) => q.dk === keep.dk && q.r[17] === grpOf;
    const rest = ser(W, id).filter((q) => dn(q.dk) > dn(DAY) && !q.r[23].asg && q.r[3] === 'pending' && !keptRows(q));
    assert.ok(can.length >= 6 && rest.length === 0, 'وما سواها أُلغي: ' + show(st) + ' ' + JSON.stringify(rest.map((q) => q.dk)));
    assert.equal(live(W, id, kOf(2), MATE.eid).length, 1, 'نسخةُ الزميل في المجموعة نفسِها يومَها باقية (المهمةُ الجماعية كلُّها)');
    assert.equal(live(W, id, kOf(3), MATE.eid).length, 0, 'ونسخُ الزميل في الأيام التالية أُلغيت');
    assert.equal(live(W, ido, foreign.dk, ME.eid).length, 1, 'السلسلةُ الأخرى لا تُمسّ');
    const ag = W.env.DB.q("SELECT ctx FROM aud WHERE k = ? AND act = 'rec_stop'", KT).map((q) => JSON.parse(q.ctx)).filter((q) => q.rec === id);
    assert.equal(ag.length, 1, 'الحدثُ المجمَّع'); assert.deepEqual(ag[0].keep, { k: keep.dk, row: String(keep.r[13]) });
    assert.equal(stored(W.env, KT)[keep.dk].filter((r) => r[13] === keep.r[13]).length, 1, 'لا نسخةَ ثانية');
    assert.equal((await run(W)).j.created, 0, 'والمنتهيةُ لا تُولَّد');
    /* صفٌّ ليس من هذه السلسلة: لا يُحفظ شيءٌ له (kept 0) — والإنهاءُ كما هو */
    const st2 = await op(W, dm.ck, { id: ido, op: 'stop', k: keep.dk, row: String(keep.r[13]) }); assert.equal(st2.status, 200, show(st2)); assert.equal(st2.j.kept, 0);
    assert.equal(live(W, ido, foreign.dk, ME.eid).length, 0);
    /* الشكل: row لـstop وحده · نصٌّ ≤ 40 غيرُ فارغ · ومعه k */
    const s3 = await mk(W, dm.ck, { title: 'للشكل', body: { rec: { t: 'daily', open: 1 } } }); const id3 = recIdOf(W, s3);
    for (const [b, at2] of [[{ id: id3, op: 'pause', k: keep.dk, row: String(keep.r[13]) }, 'row'], [{ id: id3, op: 'edit', k: keep.dk, row: '1', rec: { t: 'daily' } }, 'row'],
      [{ id: id3, op: 'stop', row: String(keep.r[13]) }, 'k'], [{ id: id3, op: 'stop', k: 'x', row: '1' }, 'k'], [{ id: id3, op: 'stop', k: keep.dk, row: keep.r[13] }, 'row'],
      [{ id: id3, op: 'stop', k: keep.dk, row: 'x'.repeat(41) }, 'row'], [{ id: id3, op: 'stop', k: keep.dk, row: '' }, 'row']]) {
      const r = await op(W, dm.ck, b); assert.equal(r.status, 400, JSON.stringify(b) + ' ⇒ ' + show(r)); assert.equal(r.j.err, 'bad-body'); assert.equal(r.j.at, at2, JSON.stringify(b));
    }
    assert.ok(ser(W, id3).every((q) => !q.r[23].rec.stop && !q.r[23].rec.paused), 'لا كتابةَ لجسمٍ مرفوض');
    const st4 = await op(W, dm.ck, { id: id3, op: 'stop', k: null, row: null }); assert.equal(st4.status, 200, 'null = غائب ' + show(st4)); assert.equal(st4.j.kept, 0);
  });
}
