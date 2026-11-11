/* KIVO_264 · KIVO-Tasks — اختباراتُ القبول للمرحلة الثانية (reports/k264/tasks/TO_BE.md §9) — على العامل الحقيقي فوق D1 بديل، بالوضعين.
   كانت AT-01…08 «todo» في المرحلة الأولى (تُخفق لأن القدرة لم تُبنَ)؛ صارت بواباتٍ بأشكال الواجهة النهائية، وأُضيف ما يغطي قراراتِ المالك الافتراضية:
     ق2 سياسةُ الإثبات لكل مهمة (الافتراضيّ «صورة أو ملاحظة») · ق3 المراجِعُ منشئُ المهمة افتراضياً · ق6 لا بدءَ بعد المهلة إلا بتمديد ·
     ق5 التكرارُ في الخادم بلا Cron ومتساوي القوى · ق4 لا إعادةَ كتابةٍ تلقائية («غير مرتبطة» يدوياً · nid وقتَ القراءة) · ق7 (في رقعة «ملفي»).
   بياناتٌ اصطناعيةٌ وحدها (tests/unit/tasks_fx.mjs). */
import './clock.mjs';   /* V7 P3: ساعةُ الاختبار المثبَّتة (1448-5-9) — كان يُخفق في أول الشهر الهجري وبعد تبدّل الشهر (يُستورد أولاً) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, workerUnderTest, ME, MATE, KT, notificationMessages, KE, D, DAY, TOMORROW, YESTERDAY, PDAY, row, stored, rowsOf, putKV, hij, MID, HR, WD_AR, wdOf, ymOf, PNG, IMG_MATE, taskCommandBody, replaceOperationalFixture, operationSaveBody } from './tasks_fx.mjs';

const WU = workerUnderTest();
const KS = 'bsdept:' + D + ':bassam_staffing_v3', KR = 'bsdept:' + D + ':bassam_dreport_v1', KL = 'bsdept:' + D + ':bassam_tasks_locks_v1';
const DM = ['0000000101', '70101'], SUP = ['0000000111', '70111'], EMP1 = ['0000000113', '70113'], DM2 = ['0000000102', '70102'];
const post = (W, ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body: operationSaveBody(W.env, p, taskCommandBody(W.env, p, body)) });
const get = (W, ck, p) => W.C.api(p, { cookie: ck });
const act = (W, ck, body) => post(W, ck, '/api/me/tasks/act', body);
const mine = async (W, ck, id) => (await get(W, ck, '/api/me/tasks')).j.rows.find(r => String(r.id) === String(id));
const notifs = (W) => notificationMessages(W.env);
const N0 = Date.now(), TM = MID(N0) + 864e5;                      /* منتصفُ ليل الغد (الرياض) — مواعيدُ حتميةُ الساعة لاختبارات الوردية */
const mk = (W, ck, o = {}) => { const s = o.s || (Date.now() + HR), e = o.e || (s + 2 * HR); return post(W, ck, '/api/tasks/create', Object.assign({ k: hij(s), t: 'TEST_ONLY ' + (o.title || 'مهمة المرحلة الثانية'), s, e, asg: o.asg || [ME.eid], win: { early: 240 } }, o.body || {})); };   /* KIVO_265 · نافذةُ التنفيذ: المهامُ هنا تبدأ بعد ساعة وتُبدأ فوراً ⇒ سماحُ بدءٍ مبكر (tests/unit/tasks_win.test.mjs يفحص القاعدة نفسَها) */
const staff = async (W, k, ek, entry) => { const S = stored(W.env, KS) || {}; const ym = ymOf(k); S[ym] = S[ym] || {}; S[ym][ek] = Object.assign({ shift: 'TST-A', rest: [], cs: '', muk: false }, entry || {}); await replaceOperationalFixture(W.env, KS, S); };
async function upImg(W, ck, id) { const r = await W.C.api('/api/img/' + id, { method: 'PUT', cookie: ck, body: PNG, headers: { 'Content-Type': 'text/plain' } }); assert.equal(r.status, 200, 'رفعُ ' + id); return id; }

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';
  test(M + 'AT-01 تأكيدُ الاستلام مستقلٌّ عن بدء التنفيذ (ack لا يبدأ عدّاد التنفيذ) — والصفُّ القديم كذلك', async () => {
    const W = await world({ worker: WU.file, mode }); const me = await W.login(ME.un, ME.pw);
    const r = await act(W, me.ck, { k: DAY, id: 1760000000101, act: 'ack' });
    assert.equal(r.status, 200, JSON.stringify(r.j)); const x = await mine(W, me.ck, 1760000000101);
    assert.ok(x.ack && !x.acc, 'ack مسجَّل والتنفيذُ لم يبدأ'); assert.equal(x.asg, 'acknowledged'); assert.equal(x.exe, 'not_started'); assert.equal(x.st, 'pending');
    assert.equal((await act(W, me.ck, { k: DAY, id: 1760000000101, act: 'ack' })).j.noop, 1, 'تأكيدٌ مكرَّر بلا أثر');
    const st = await act(W, me.ck, { k: DAY, id: 1760000000101, act: 'start' });
    assert.equal(st.status, 200); assert.ok(st.j.row.acc >= x.ack, 'البدءُ وقتٌ مستقلٌّ بعد التأكيد'); assert.equal(st.j.row.exe, 'in_progress');
  });

  test(M + 'AT-02 التسليمُ للمراجعة ثم إعادتُه بسببٍ ثم الاعتماد — المراجِعُ منشئُ المهمة (ق3) · الإثباتُ يُضاف ولا يُستبدل · تنبيهُ الخادم', async () => {
    const W = await world({ worker: WU.file, mode }); const me = await W.login(ME.un, ME.pw), dm = await W.login(...DM), sup = await W.login(...SUP);
    const c = await mk(W, dm.ck); assert.equal(c.status, 200, JSON.stringify(c.j)); const id = c.j.rows[0].id, k = c.j.rows[0].k;
    /* ق3: المراجِعُ يعتمد بحفظٍ باسمه — حسابٌ بلا تعديل المهام وإنهائها لا يُسمّى مراجِعاً (يُرفض عند الإنشاء لا عند الاعتماد) */
    const bad = await mk(W, dm.ck, { body: { rv: { u: 'tst_emp1' } } }); assert.equal(bad.status, 400, JSON.stringify(bad.j)); assert.equal(bad.j.at, 'rv'); assert.match(bad.j.msg, /لا يملك صلاحيةَ اعتماد/);
    let v = await mine(W, me.ck, id); assert.ok(v, 'المهمةُ الجديدة في «مهامي»'); assert.equal(v.pol.m, 'any', 'ق2: الافتراضيّ «صورة أو ملاحظة»'); assert.match(v.rv, /مدير الإدارة/, 'ق3: المراجِعُ منشئُها');
    assert.ok(notifs(W).some(n => n.type === 'task_new' && n.server_origin === 1 && n.employee_targets.includes(ME.eid)), 'تنبيهُ الإسناد كتبه الخادم (RC-10)');
    assert.equal((await act(W, me.ck, { k, id, act: 'start' })).status, 200);
    const A = await upImg(W, me.ck, 'img_tskp2a_a1'), B = await upImg(W, me.ck, 'img_tskp2b_b1');
    const d1 = await act(W, me.ck, { k, id, act: 'doc', imgs: [A], note: 'مسودّة' }); assert.equal(d1.status, 200, JSON.stringify(d1.j)); assert.equal(d1.j.row.proof.draft, 1);
    assert.equal(W.env.DB.q('SELECT st FROM imgown WHERE img = ?', A)[0].st, 'bound', 'المسودّةُ ربطت الصورةَ بالمخزن');
    const s1 = await act(W, me.ck, { k, id, act: 'submit', note: 'TEST_ONLY أُنجز' }); assert.equal(s1.status, 200, JSON.stringify(s1.j));
    v = await mine(W, me.ck, id); assert.equal(v.review, 'pending'); assert.equal(v.ph, 'review'); assert.equal(v.st, 'in_progress', 'الملخّصُ المتوافق: لم تُغلق بعد');
    assert.equal((await act(W, me.ck, { k, id, act: 'doc', note: 'x' })).status, 409, 'لا تعديلَ أثناء المراجعة');
    assert.ok(notifs(W).some(n => n.type === 'task_chg' && n.employee_targets.includes('mgr:tst_d1') && /للمراجعة/.test(n.body)), 'المراجِعُ نُبِّه بالتسليم');
    const ns = await post(W, sup.ck, '/api/tasks/review', { k, id, ekey: ME.eid, decision: 'approve' });
    assert.equal(ns.status, 403, 'غيرُ المراجِع المسمّى (ولو حمل تعديلَ المهام) لا يعتمد: ' + JSON.stringify(ns.j)); assert.equal(ns.j.err, 'not-reviewer');
    assert.equal((await post(W, dm.ck, '/api/tasks/review', { k, id, ekey: ME.eid, decision: 'return' })).status, 400, 'الإعادةُ بلا سبب ⇒ 400');
    const rt = await post(W, dm.ck, '/api/tasks/review', { k, id, ekey: ME.eid, decision: 'return', why: 'TEST_ONLY نقصُ صورة' }); assert.equal(rt.status, 200, JSON.stringify(rt.j));
    v = await mine(W, me.ck, id); assert.equal(v.review, 'returned'); assert.equal(v.ph, 'returned'); assert.equal(v.revd.why, 'TEST_ONLY نقصُ صورة');
    assert.ok(notifs(W).some(n => n.type === 'task_chg' && n.employee_targets.includes(ME.eid) && /لاستكمال/.test(n.body)), 'الموظفُ نُبِّه بالإعادة');
    assert.equal((await act(W, me.ck, { k, id, act: 'doc', rm: [A] })).j.err, 'img-locked', 'صورةُ التسليم السابق لا تُحذف');
    const s2 = await act(W, me.ck, { k, id, act: 'submit', imgs: [B], note: 'أُكملت' }); assert.equal(s2.status, 200, JSON.stringify(s2.j));
    v = await mine(W, me.ck, id); assert.deepEqual(v.proof.imgs, [A, B], 'الإثباتُ يُضاف ولا يُستبدل'); assert.equal(v.proof.h.length, 2, 'جولتا تسليم في السجل');
    const ap = await post(W, dm.ck, '/api/tasks/review', { k, id, ekey: ME.eid, decision: 'approve' }); assert.equal(ap.status, 200, JSON.stringify(ap.j));
    v = await mine(W, me.ck, id); assert.equal(v.st, 'done'); assert.equal(v.review, 'approved'); assert.equal(v.ph, 'done');
    assert.equal((await act(W, me.ck, { k, id, act: 'doc', note: 'x' })).status, 409, 'المعتمدةُ مغلقة');
    assert.equal((await post(W, dm.ck, '/api/tasks/review', { k, id, ekey: ME.eid, decision: 'approve' })).status, 409, 'لا اعتمادَ مكرّر');
    const x = rowsOf(stored(W.env, KT), ME.eid).find(q => q.r[13] === id).r;
    assert.equal(x[23].revh.length, 2, 'سجلُّ قرارات المراجعة'); assert.equal(typeof x[22], 'string', 'طابعُ هوية الكيان (22) قائم');
  });

  test(M + 'AT-03 المهمةُ الجماعية: نسخةٌ لكل مكلَّف بهويةٍ فريدة · إنجازُ واحدٍ لا يغلق الباقين · ملخّصُ المسؤول الفرديّ والجماعي', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), me = await W.login(ME.un, ME.pw), mate = await W.login(MATE.un, MATE.pw);
    const c = await mk(W, dm.ck, { asg: [ME.eid, MATE.eid], body: { rv: 'none', grpL: 'TEST_ONLY فريق' } }); assert.equal(c.status, 200, JSON.stringify(c.j));
    assert.equal(new Set(c.j.rows.map(r => r.id)).size, 2, 'هويةٌ فريدة (13) لكل نسخة');
    const S = stored(W.env, KT), rs = c.j.rows.map(q => S[q.k].find(r => r[13] === q.id)); assert.ok(rs[0][17] && rs[0][17] === rs[1][17], 'الأصلُ المشترك في 17');
    const gid = rs[0][17], k = c.j.rows[0].k;
    let g = await get(W, dm.ck, '/api/tasks/group?id=' + gid); assert.equal(g.status, 200); assert.equal(g.j.summary.n, 2); assert.equal(g.j.summary.pending, 2);
    const myId = c.j.rows.find(r => r.ekey === ME.eid).id;
    await act(W, me.ck, { k, id: myId, act: 'start' }); const f = await act(W, me.ck, { k, id: myId, act: 'submit', note: 'تم' });
    assert.equal(f.status, 200); assert.equal(f.j.row.st, 'done', 'بلا مراجعة («none») ⇒ التسليمُ إنجاز');
    g = await get(W, dm.ck, '/api/tasks/group?id=' + gid); assert.equal(g.j.summary.done, 1); assert.equal(g.j.summary.pending, 1); assert.equal(g.j.summary.pct, 50);
    const mv = await mine(W, mate.ck, c.j.rows.find(r => r.ekey === MATE.eid).id); assert.equal(mv.st, 'pending', 'نسخةُ الزميل لم تُغلق'); assert.equal(mv.grp.label, 'TEST_ONLY فريق');
    const lg = await get(W, dm.ck, '/api/tasks/group?id=gTST1'); assert.equal(lg.j.summary.n, 2, 'المجموعةُ القديمة (13 مشترك) تُقرأ كذلك');
    assert.equal((await get(W, me.ck, '/api/tasks/group?id=' + gid)).status, 403, 'الموظفُ لا يقرأ ملخّصَ الجماعة (task.view)');
  });

  test(M + 'AT-07 إعادةُ الإسناد تحفظ التاريخ وتُبلغ الطرفين — نسخةٌ جديدة بهويةٍ فريدة · القديمةُ لا تختفي من سجلّ الأول', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), me = await W.login(ME.un, ME.pw), mate = await W.login(MATE.un, MATE.pw);
    await act(W, me.ck, { k: DAY, id: 1760000000101, act: 'ack' });
    const r = await post(W, dm.ck, '/api/tasks/reassign', { k: DAY, id: 1760000000101, from: ME.eid, to: MATE.eid, why: 'TEST_ONLY' });
    assert.equal(r.status, 200, JSON.stringify(r.j)); assert.notEqual(r.j.row.id, 1760000000101, 'هويةٌ جديدة');
    const x = await mine(W, me.ck, 1760000000101); assert.equal(x && x.asg, 'reassigned'); assert.equal(x.ph, 'reassigned'); assert.equal(x.ack > 0, true, 'تأكيدُه السابق محفوظ');
    assert.equal((await act(W, me.ck, { k: DAY, id: 1760000000101, act: 'start' })).status, 409, 'الأولُ لا يفعل فيها بعد الإعادة');
    const y = await mine(W, mate.ck, r.j.row.id); assert.ok(y, 'الجديدُ يراها'); assert.equal(y.st, 'pending'); assert.equal(y.ack, null, 'لا يرث تأكيدَ غيره (RC-13)');
    assert.equal((await act(W, mate.ck, { k: DAY, id: r.j.row.id, act: 'start' })).status, 200);
    assert.ok(notifs(W).some(n => n.type === 'task_new' && n.employee_targets.includes(MATE.eid)) && notifs(W).some(n => n.type === 'task_chg' && n.employee_targets.includes(ME.eid) && /أُعيد إسناد/.test(n.body)), 'الطرفان نُبِّها');
    assert.equal((await post(W, dm.ck, '/api/tasks/reassign', { k: DAY, id: 1760000000101, from: ME.eid, to: MATE.eid })).status, 409, 'لا إعادةَ مكرّرة');
    assert.equal((await post(W, dm.ck, '/api/tasks/reassign', { k: DAY, id: 1760000000102, from: ME.eid, to: 'TEST_ONLY اسم موظف' })).j.err, 'asg', 'الإسنادُ بالمعرّف وحده — لا اسم');
    /* المعتذَرُ عنها تُعاد إسنادها (الاستعمالُ الأصلي) — والمعتذِرُ لا يُنبَّه */
    const dcl = await act(W, me.ck, { k: DAY, id: 1760000000102, act: 'decline', why: 'TEST_ONLY ظرف' }); assert.equal(dcl.status, 200);
    assert.ok(notifs(W).some(n => n.type === 'task_chg' && /اعتُذر/.test(n.body)), 'الاعتذارُ نُبِّه به من الخادم');
    assert.equal((await post(W, dm.ck, '/api/tasks/reassign', { k: DAY, id: 1760000000102, from: ME.eid, to: MATE.eid, why: 'بعد اعتذار' })).status, 200);
  });

  test(M + 'AT-G3 الموظفُ لا يصل إلى مسارات المسؤول (إنشاء · مراجعة · تمديد · إعادة · إلغاء · ربط · تكرار · مجموعة · ربط · أهلية) — ولا مديرُ إدارةٍ أخرى', async () => {
    const W = await world({ worker: WU.file, mode }); const me = await W.login(ME.un, ME.pw), dm2 = await W.login(...DM2), emp1 = await W.login(...EMP1);
    /* جسمٌ صحيحُ الشكل لكل مسار (الرقعة 05 تفرض المخطّطَ قبل الصلاحية: الحقلُ الغريب ⇒ 400) — فالرفضُ هنا للصلاحية وحدها */
    const B0 = { k: DAY, id: 1760000000101 }, BY = { '/api/tasks/review': { ekey: ME.eid, decision: 'approve', why: 'x' }, '/api/tasks/extend': { ekey: ME.eid, e: Date.now() + 5 * HR, why: 'x' },
      '/api/tasks/reassign': { from: ME.eid, to: MATE.eid, why: 'x' }, '/api/tasks/cancel': { ekey: ME.eid, why: 'x' }, '/api/tasks/relink': { from: ME.eid, to: MATE.eid } };
    const B = Object.assign({}, B0, BY['/api/tasks/review']);
    for (const p of Object.keys(BY)) {
      const r = await post(W, me.ck, p, Object.assign({}, B0, BY[p])); assert.ok(r.status === 403, p + ' ⇒ ' + r.status + ' ' + JSON.stringify(r.j));
    }
    assert.equal((await mk(W, me.ck)).status, 403, 'الموظفُ لا ينشئ (قرار المالك)');
    assert.equal((await mk(W, emp1.ck)).status, 403, 'حاملُ «عرض المهام» وحده لا ينشئ');
    assert.equal((await post(W, me.ck, '/api/tasks/recur', { id: 'rX', op: 'pause' })).status, 403);
    for (const p of ['/api/tasks/group?id=gTST1', '/api/tasks/linkage', '/api/tasks/eligibility?ekeys=' + ME.eid + '&s=' + (Date.now() + HR)]) assert.equal((await get(W, me.ck, p)).status, 403, p);
    assert.equal((await post(W, me.ck, '/api/tasks/recur/run', {})).status, 403, 'تشغيلُ التكرار الصريح لمن يقرأ المهام');
    assert.equal((await post(W, dm2.ck, '/api/tasks/create', { dept: D, k: DAY, t: 'x', s: Date.now() + HR, e: Date.now() + 2 * HR, asg: [ME.eid] })).status, 403, 'مديرُ إدارةٍ أخرى');
    assert.equal((await post(W, dm2.ck, '/api/tasks/review', Object.assign({ dept: D }, B))).status, 403);
    /* لا حقلَ إدارةٍ من المسار الذاتي: x (23) لا يُكتب مهما أُرسل */
    await act(W, me.ck, { k: DAY, id: 1760000000101, act: 'ack', x: { rv: null, pol: { m: 'none' } }, 23: 1 });
    assert.equal(rowsOf(stored(W.env, KT), ME.eid).find(q => q.r[13] === 1760000000101).r[23], undefined, 'العمودُ 23 لم يُمسّ');
  });
}

/* ── ما يلي بالوضع القديم (Production يعمل به) — وحكمُ الإنفاذ مغطّى فيما سبق ── */
test('AT-04 التكرار (ق5): قالبٌ + توليدٌ خادميّ متساوي القوى بلا Cron — مرتان ⇒ نسخةٌ واحدة لكل موعد · غيرُ المتاح يُتخطّى ويُبلَّغ · إيقافٌ وإنهاء', async () => {
  const W = await world({ worker: WU.file }); const dm = await W.login(...DM), me = await W.login(ME.un, ME.pw);
  const s = TM + 8 * HR, k1 = hij(s + 12 * HR);
  /* راحتُه الأسبوعية يومُ (الغد+2) — تُكتب في كل شهرٍ يمرّ به الأفق (الأسبوعُ الواحد لا يتكرر فيه اليومُ نفسُه) */
  const restDay = hij(TM + 2 * 864e5 + 12 * HR), restWd = WD_AR[wdOf(TM + 2 * 864e5 + 12 * HR)];
  for (const ym of new Set([0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => hij(TM + i * 864e5 + 12 * HR)))) await staff(W, ym, 'tst_e_emp1', { rest: [restWd] });
  const c = await mk(W, dm.ck, { s, e: s + HR, asg: ['tst_e_emp1', ME.eid], body: { rec: { t: 'daily' }, rv: 'none' } });
  assert.equal(c.status, 200, JSON.stringify(c.j)); const recId = stored(W.env, KT)[k1].find(r => r[13] === c.j.rows[0].id)[23].rec.id;
  const a = await post(W, W.su.ck, '/api/tasks/recur/run?dept=' + D + '&day=' + DAY, {}), b = await post(W, W.su.ck, '/api/tasks/recur/run?dept=' + D + '&day=' + DAY, {});
  assert.equal(a.status, 200, JSON.stringify(a.j)); assert.ok(a.j.created >= 5, 'وُلّدت نُسخُ الأفق: ' + JSON.stringify(a.j)); assert.equal(b.j.created, 0, 'لا تكرارَ عند إعادة التشغيل');
  const all = Object.values(stored(W.env, KT)).flat().filter(r => Array.isArray(r) && r[23] && r[23].rec && r[23].rec.id === recId);
  for (let i = 1; i <= 4; i++) assert.ok(all.some(r => r[14] === ME.eid && hij(r[15]) === hij(TM + i * 864e5 + 12 * HR)), 'نسخةٌ لكل يومٍ في الأفق: الغد+' + i);   /* الأفقُ = اليومُ التشغيلي + 6 ≥ الغد + 4 */
  const idem = all.map(r => r[23].idem); assert.equal(new Set(idem).size, idem.length, 'مفتاحُ عدم التكرار فريد'); assert.equal(new Set(all.map(r => r[13])).size, all.length, 'هويةٌ فريدة لكل نسخة');
  assert.ok(!all.some(r => r[14] === 'tst_e_emp1' && hij(r[15]) === restDay), 'لا نسخةَ لغير المتاح يومَ راحته');
  assert.ok(a.j.skipped.some(q => q.ekey === 'tst_e_emp1' && q.k === restDay && /راحته/.test(q.why)), 'وتُخطّي معلَّلاً');
  assert.ok(notifs(W).some(n => /لم تُولَّد/.test(n.body)), 'وأُبلغ صاحبُ القالب');
  assert.ok((await get(W, me.ck, '/api/me/tasks')).j.rows.filter(r => r.rec).length >= 5, 'النُّسخُ في «مهامي» لكل موعد');
  /* الكسول: قراءةُ «مهامي» تولِّد ما ينقص بعد حذفِ نسخةٍ قادمة؟ لا — المحذوفُ يُولَّد ثانيةً (المفتاحُ غاب)؛ والملغاةُ لا تُولَّد */
  const p = await post(W, dm.ck, '/api/tasks/recur', { id: recId, op: 'pause' }); assert.equal(p.status, 200, JSON.stringify(p.j));
  const st = await post(W, dm.ck, '/api/tasks/recur', { id: recId, op: 'stop' }); assert.equal(st.status, 200); assert.ok(st.j.cancelled >= 1, 'إنهاءُ السلسلة يلغي نُسخَها القادمة غيرَ المبدوءة');
  const c2 = await post(W, W.su.ck, '/api/tasks/recur/run?dept=' + D, {}); assert.equal(c2.j.created, 0, 'الموقوفةُ لا تُولَّد');
  assert.equal((await post(W, W.su.ck, '/api/tasks/recur/run?dept=' + D + '&day=1400-1-1', {})).status, 400, 'لا توليدَ ليومٍ غيرِ اليوم');
});

test('AT-05 الأهلية وقتَ التنفيذ من الجدول الشهري: ضمن الوردية · خارجها · تتجاوزها · راحةٌ أسبوعية · إجازةٌ بتقرير اليوم · بلا صفّ · تعارضُ المهام', async () => {
  const W = await world({ worker: WU.file }); const dm = await W.login(...DM), sup = await W.login(...SUP);
  const kT = hij(TM + 12 * HR); await staff(W, kT, 'tst_e_emp1', {}); await staff(W, kT, 'tst_e_supB', { shift: 'TST-B' });
  const el = async (ek, s, e, ck = dm.ck) => (await get(W, ck, '/api/tasks/eligibility?ekeys=' + ek + '&s=' + s + '&e=' + e)).j.items[0];
  let x = await el('tst_e_emp1', TM + 8 * HR, TM + 9 * HR); assert.equal(x.result, 'متاح', JSON.stringify(x)); assert.equal(x.shift.name, 'TST-A');
  x = await el('tst_e_emp1', TM + 15 * HR, TM + 16 * HR); assert.equal(x.result, 'غير متاح'); assert.equal(x.code, 'off_shift');
  x = await el('tst_e_emp1', TM + 13.5 * HR, TM + 14.5 * HR); assert.equal(x.result, 'بانتظار التحقق'); assert.equal(x.code, 'beyond_shift'); assert.match(x.why, /تكليف/);
  x = await el('tst_e_supB', TM + 15 * HR, TM + 16 * HR); assert.equal(x.result, 'متاح', 'ورديةُ ب (14–22)');
  await staff(W, kT, 'tst_e_emp1', { rest: [WD_AR[wdOf(TM + 12 * HR)]] });
  x = await el('tst_e_emp1', TM + 8 * HR, TM + 9 * HR); assert.equal(x.result, 'غير متاح'); assert.equal(x.code, 'rest');
  await staff(W, kT, 'tst_e_emp1', {});
  const R = stored(W.env, KR) || {}; R[kT] = { shifts: { 'TST-A': { pulled: true, roster: [{ ekey: 'tst_e_emp1', st: 'lv' }] } } }; await replaceOperationalFixture(W.env, KR, R);
  x = await el('tst_e_emp1', TM + 8 * HR, TM + 9 * HR); assert.equal(x.result, 'غير متاح'); assert.equal(x.code, 'leave');
  await replaceOperationalFixture(W.env, KR, {});
  x = await el(ME.eid, Date.now() + 864e5, Date.now() + 864e5 + HR); assert.equal(x.result, 'بانتظار التحقق', 'بلا صفٍّ في الجدول'); assert.ok(['no_row', 'no_month'].includes(x.code));
  x = await el(ME.eid, Date.now(), Date.now() + HR); assert.ok(x.conf.some(c => c.id === 1760000000103), 'تعارضٌ مع مهمته الجارية'); assert.ok(x.warn.some(w => /تتعارض/.test(w)));
  x = await el('tst_e_emp1', TM + 15 * HR, TM + 16 * HR, sup.ck); assert.equal(x.result, 'غير متاح', 'المشرفُ (task.create) يفحص'); assert.ok(x.why);
  /* «غير متاح» عند الإنشاء ⇒ 409 بالسبب · وبتأكيد المسؤول (force) يُنشأ ويُحفظ الحكمُ في x.elig */
  const c0 = await mk(W, dm.ck, { s: TM + 15 * HR, e: TM + 16 * HR, asg: ['tst_e_emp1'] }); assert.equal(c0.status, 409); assert.equal(c0.j.err, 'elig'); assert.equal(c0.j.items[0].code, 'off_shift');
  const c1 = await mk(W, dm.ck, { s: TM + 15 * HR, e: TM + 16 * HR, asg: ['tst_e_emp1'], body: { force: true } }); assert.equal(c1.status, 200);
  assert.equal(stored(W.env, KT)[c1.j.rows[0].k].find(r => r[13] === c1.j.rows[0].id)[23].elig.res, 'غير متاح');
});

test('AT-06 سجلُّ المهمة للموظف: الإنشاء · الإسناد · البدء · التسليم · الإعادة · الاعتماد — بفاعلٍ ووقت، بلا حساباتٍ ولا ما لا يخصّه', async () => {
  const W = await world({ worker: WU.file }); const me = await W.login(ME.un, ME.pw), dm = await W.login(...DM), mate = await W.login(MATE.un, MATE.pw);
  await act(W, me.ck, { k: DAY, id: 1760000000101, act: 'accept' });
  let l = await get(W, me.ck, '/api/me/tasks/log?k=' + DAY + '&id=1760000000101');
  assert.equal(l.status, 200); assert.ok(l.j.events.some(e => e.act === 'accepted' && e.by === 'أنت')); assert.ok(l.j.events.some(e => e.act === 'created' && e.src === 'row'), 'الإنشاءُ من طابع الصفّ القديم (موسوم)');
  const c = await mk(W, dm.ck); const id = c.j.rows[0].id, k = c.j.rows[0].k;
  await act(W, me.ck, { k, id, act: 'start' }); await act(W, me.ck, { k, id, act: 'submit', note: 'تم' });
  await post(W, dm.ck, '/api/tasks/review', { k, id, ekey: ME.eid, decision: 'return', why: 'TEST_ONLY ناقص' });
  await act(W, me.ck, { k, id, act: 'submit', note: 'أُكملت' }); await post(W, dm.ck, '/api/tasks/review', { k, id, ekey: ME.eid, decision: 'approve' });
  l = await get(W, me.ck, '/api/me/tasks/log?k=' + k + '&id=' + id);
  assert.deepEqual(l.j.events.map(e => e.act), ['created', 'accepted', 'submitted', 'returned', 'submitted', 'approved']);
  assert.match(l.j.events[0].by, /مدير الإدارة/); assert.equal(l.j.events[3].why, 'TEST_ONLY ناقص');
  assert.ok(l.j.events.every(e => !('uid' in e) && !('un' in e) && !('ip' in e)), 'بلا حساباتٍ ولا عناوين');
  assert.equal((await get(W, mate.ck, '/api/me/tasks/log?k=' + k + '&id=' + id)).status, 404, 'الزميلُ لا يقرأ سجلَّ مهمتي');
  const ma = await get(W, dm.ck, '/api/aud?dept=' + D + '&etype=task&eid=' + encodeURIComponent(stored(W.env, KT)[k].find(r => r[13] === id)[22]));
  assert.equal(ma.status, 200); assert.equal(ma.j.rows.length, 6, 'المسؤولُ يقرأ السجلَّ نفسَه بهوية الكيان (22) من /api/aud');
});

test('AT-08 المهمةُ المسندة لا تمنح الموظف صلاحية — تعارضُ صلاحيةٍ تشغيلية يُكشف للمسؤول عند الإسناد (needs)', async () => {
  const W = await world({ worker: WU.file }); const dm = await W.login(...DM);
  const r = await get(W, dm.ck, '/api/tasks/eligibility?ekeys=' + ME.eid + ',tst_e_lens_on&s=' + (Date.now() + HR) + '&needs=site.edit');
  assert.equal(r.status, 200, JSON.stringify(r.j)); assert.equal(r.j.items[0].perm, 'missing:site.edit'); assert.equal(r.j.items[1].perm, 'ok', 'حاملُ «تعديل الخطة» يملكها');
  assert.equal((await get(W, dm.ck, '/api/tasks/eligibility?ekeys=' + ME.eid + '&s=' + (Date.now() + HR) + '&needs=plan.edit')).status, 400, 'مفتاحٌ غيرُ موجودٍ في السجل ⇒ 400');
  const c = await mk(W, dm.ck, { body: { needs: ['site.edit'] } }); assert.equal(c.status, 200); assert.equal(c.j.elig[0].perm, 'missing:site.edit');
  const me = await W.login(ME.un, ME.pw); const g = await W.C.api("/api/operations/read?keys=" + encodeURIComponent('bsdept:tst_d1:bassam_plan_v1'), { cookie: me.ck });
  assert.ok(g.j.denied.includes('bsdept:tst_d1:bassam_plan_v1') && !Object.hasOwn(g.j.resources,'bsdept:tst_d1:bassam_plan_v1') && !Object.hasOwn(g.j.base,'bsdept:tst_d1:bassam_plan_v1'), 'والإسنادُ لم يمنحه قراءةَ الخطة أو رقم نسختها');
});

test('AT-09 ق6 لا بدءَ بعد انقضاء المهلة — المسؤولُ يمدّدها فيُقبل (والانقضاءُ السابق يُرفع)', async () => {
  const W = await world({ worker: WU.file }); const me = await W.login(ME.un, ME.pw), dm = await W.login(...DM);
  await act(W, me.ck, { k: YESTERDAY, id: 1760000000105, act: 'expire' });
  const s0 = await act(W, me.ck, { k: YESTERDAY, id: 1760000000105, act: 'start' }); assert.equal(s0.status, 409); assert.equal(s0.j.err, 'expired');
  assert.equal((await post(W, dm.ck, '/api/tasks/extend', { k: YESTERDAY, id: 1760000000105, ekey: ME.eid, e: Date.now() - HR })).status, 400, 'مهلةٌ ماضية ⇒ 400');
  const ex = await post(W, dm.ck, '/api/tasks/extend', { k: YESTERDAY, id: 1760000000105, ekey: ME.eid, e: Date.now() + 2 * HR, why: 'TEST_ONLY' }); assert.equal(ex.status, 200, JSON.stringify(ex.j));
  const v = await mine(W, me.ck, 1760000000105); assert.equal(v.dec, null, 'الانقضاءُ السابق رُفع'); assert.ok(v.ext && v.ext.to > Date.now());
  assert.equal((await act(W, me.ck, { k: YESTERDAY, id: 1760000000105, act: 'start' })).status, 200, 'بعد التمديد يُقبل');
  assert.ok(notifs(W).some(n => n.employee_targets.includes(ME.eid) && /مُدّدت/.test(n.body)));
});

test('AT-10 سياسةُ الإثبات لكل مهمة (ق2) · الاعتذار بحسب السياسة · التعثّر والاستئناف', async () => {
  const W = await world({ worker: WU.file }); const me = await W.login(ME.un, ME.pw), dm = await W.login(...DM);
  const run = async (pol, extra) => { const c = await mk(W, dm.ck, { body: Object.assign({ pol, rv: 'none' }, extra || {}) }); assert.equal(c.status, 200, JSON.stringify(c.j)); const q = c.j.rows[0]; await act(W, me.ck, { k: q.k, id: q.id, act: 'start' }); return q; };
  let q = await run({ m: 'img', n: 2 }); const A = await upImg(W, me.ck, 'img_tskpol_a'), B = await upImg(W, me.ck, 'img_tskpol_b');
  let r = await act(W, me.ck, { k: q.k, id: q.id, act: 'submit', imgs: [A], note: 'x' }); assert.equal(r.status, 400); assert.match(r.j.msg, /2 صور/);
  assert.equal((await act(W, me.ck, { k: q.k, id: q.id, act: 'submit', imgs: [A, B] })).status, 200, 'صورتان تكفيان (بلا ملاحظة)');
  q = await run({ m: 'note' }); const Cimg = await upImg(W, me.ck, 'img_tskpol_c');
  assert.equal((await act(W, me.ck, { k: q.k, id: q.id, act: 'submit', imgs: [Cimg] })).status, 400, 'تتطلب ملاحظة');
  q = await run({ m: 'none' }); assert.equal((await act(W, me.ck, { k: q.k, id: q.id, act: 'submit' })).status, 200, 'بلا إثبات');
  q = await run({ m: 'any', steps: ['TEST_ONLY الخطوة ١', 'TEST_ONLY الخطوة ٢'] });
  r = await act(W, me.ck, { k: q.k, id: q.id, act: 'submit', note: 'x' }); assert.equal(r.status, 400); assert.match(r.j.msg, /خطوات/);
  assert.equal((await act(W, me.ck, { k: q.k, id: q.id, act: 'doc', steps: { 'TEST_ONLY الخطوة ١': true } })).status, 200);
  assert.equal((await act(W, me.ck, { k: q.k, id: q.id, act: 'submit', note: 'x', steps: { 'TEST_ONLY الخطوة ٢': true } })).status, 200, 'اكتملت الخطوتان');
  assert.equal((await mk(W, dm.ck, { body: { pol: { m: 'img', n: 9 } } })).status, 400, 'سياسةٌ غيرُ صالحة');
  /* الاعتذار: ممنوعٌ بسياسة المهمة (dec:0) · مسموحٌ بسببٍ افتراضياً · ويُنبَّه المنشئ */
  let c = await mk(W, dm.ck, { body: { dec: 0 } }); r = await act(W, me.ck, { k: c.j.rows[0].k, id: c.j.rows[0].id, act: 'decline', why: 'x' }); assert.equal(r.j.err, 'policy');
  c = await mk(W, dm.ck); assert.equal((await act(W, me.ck, { k: c.j.rows[0].k, id: c.j.rows[0].id, act: 'decline', why: 'TEST_ONLY ظرف' })).status, 200);
  assert.ok(notifs(W).some(n => n.employee_targets.includes('mgr:tst_d1') && /اعتُذر/.test(n.body)), 'المنشئُ نُبِّه بالاعتذار');
  /* التعثّر */
  c = await mk(W, dm.ck); const t = c.j.rows[0]; await act(W, me.ck, { k: t.k, id: t.id, act: 'start' });
  assert.equal((await act(W, me.ck, { k: t.k, id: t.id, act: 'stall' })).status, 400, 'التعثّرُ بسبب');
  r = await act(W, me.ck, { k: t.k, id: t.id, act: 'stall', why: 'TEST_ONLY نقصُ معدّات' }); assert.equal(r.j.row.ph, 'stalled'); assert.equal(r.j.row.stall.why, 'TEST_ONLY نقصُ معدّات');
  assert.equal((await act(W, me.ck, { k: t.k, id: t.id, act: 'stall', why: 'x' })).status, 409);
  r = await act(W, me.ck, { k: t.k, id: t.id, act: 'resume' }); assert.equal(r.j.row.ph, 'running'); assert.equal(r.j.row.stall, null);
});

test('AT-11 الإلغاءُ منطقيّ (يبقى الصفُّ وسجلُّه) · قفلُ الشهر = الاعتمادُ الصريح وحده ({mo:1} شهرٌ مفتوح)', async () => {
  const W = await world({ worker: WU.file }); const me = await W.login(ME.un, ME.pw), dm = await W.login(...DM);
  assert.equal((await post(W, dm.ck, '/api/tasks/cancel', { k: DAY, id: 1760000000102, ekey: ME.eid })).status, 400, 'الإلغاءُ بسبب');
  assert.equal((await post(W, dm.ck, '/api/tasks/cancel', { k: DAY, id: 1760000000102, ekey: ME.eid, why: 'TEST_ONLY' })).status, 200);
  const v = await mine(W, me.ck, 1760000000102); assert.equal(v.ph, 'cancelled'); assert.equal(v.can.why, 'TEST_ONLY');
  assert.equal((await act(W, me.ck, { k: DAY, id: 1760000000102, act: 'start' })).status, 409);
  assert.equal((await post(W, dm.ck, '/api/tasks/cancel', { k: DAY, id: 1760000000110, why: 'x' })).status, 404, 'مجموعةٌ قديمةٌ تتشارك الهوية بلا مكلَّف ⇒ ملتبسة');
  /* قفلُ الشهر: {mo:1} شهرٌ منقضٍ فُتح — لا يمنع · true اعتمادٌ — يمنع (كان الخادمُ يعدّ {mo:1} قفلاً — عيبٌ في المرحلة الأولى أُصلح) */
  const ym = ymOf(PDAY); await replaceOperationalFixture(W.env, KL, { [ym]: { mo: 1 } });
  assert.equal((await act(W, me.ck, { k: PDAY, id: 1760000000107, act: 'ack' })).j.err, 'state', 'مفتوح ⇒ يُحكم بالحالة لا بالقفل');
  await replaceOperationalFixture(W.env, KL, { [ym]: true });
  assert.equal((await act(W, me.ck, { k: PDAY, id: 1760000000107, act: 'ack' })).j.err, 'locked');
  assert.equal((await post(W, dm.ck, '/api/tasks/extend', { k: PDAY, id: 1760000000108, ekey: ME.eid, e: Date.now() + HR })).j.err, 'locked', 'ومساراتُ المسؤول كذلك');
});

test('AT-12 ق4 لا إعادةَ كتابةٍ تلقائية: الصفُّ المسنَد بالاسم «غير مرتبطة» للمسؤول ويُربط يدوياً · المسنَدُ برقم الهوية مرتبطٌ وقتَ القراءة', async () => {
  const W = await world({ worker: WU.file }); const me = await W.login(ME.un, ME.pw), dm = await W.login(...DM);
  const E = stored(W.env, KE); E.find(e => e.eid === ME.eid).nid = '1088888888'; await replaceOperationalFixture(W.env, KE, E);
  const S = stored(W.env, KT); S[DAY].push(row({ id: 1760000055501, title: 'مسندةٌ بالاسم', eid: ME.name }), row({ id: 1760000055502, title: 'مسندةٌ برقم الهوية', eid: '1088888888' })); await replaceOperationalFixture(W.env, KT, S);
  const L = await get(W, dm.ck, '/api/tasks/linkage'); assert.equal(L.status, 200);
  const byName = L.j.rows.find(r => r.id === 1760000055501), byNid = L.j.rows.find(r => r.id === 1760000055502);
  assert.equal(byName.by, 'name'); assert.equal(byName.label, 'غير مرتبطة'); assert.equal(byName.cand.eid, ME.eid, 'مرشَّحٌ للربط اليدوي — لا ربط');
  assert.equal(byNid.by, 'nid'); assert.equal(byNid.emp.eid, ME.eid);
  const l = await get(W, me.ck, '/api/me/tasks'); assert.ok(l.j.rows.some(r => r.id === 1760000055502), 'المسنَدةُ برقم هويتي تظهر لي (قراءة)'); assert.ok(!l.j.rows.some(r => r.id === 1760000055501), 'لا مطابقةَ بالاسم');
  assert.equal((await act(W, me.ck, { k: DAY, id: 1760000055502, act: 'ack' })).j.err, 'identity', 'والفعلُ يحتاج ربطَ المسؤول');
  assert.equal(stored(W.env, KT)[DAY].find(r => r[13] === 1760000055502)[14], '1088888888', 'لم يُعَد كتابةُ الصفّ (لا ترحيلَ تلقائي)');
  assert.equal((await post(W, dm.ck, '/api/tasks/relink', { k: DAY, id: 1760000055501, from: ME.name, to: ME.eid })).status, 200);
  assert.ok((await get(W, me.ck, '/api/me/tasks')).j.rows.some(r => r.id === 1760000055501), 'بعد الربط اليدوي تظهر');
  assert.equal((await post(W, dm.ck, '/api/tasks/relink', { k: DAY, id: 1760000000101, from: ME.eid, to: MATE.eid })).j.err, 'linked', 'المرتبطةُ بالمعرّف تُعاد إسنادُها لا تُربط');
  const r = stored(W.env, KT)[DAY].find(q => q[13] === 1760000055501); assert.equal(r[14], ME.eid); assert.equal(r[23].relink[0].from, ME.name, 'وسجلُّ الربط محفوظ');
});

test('AT-12b SR-2.2 · F-1 في جهة المسؤول: معرّفٌ يحمله سجلّان (رقمُ هويةٍ أو معرّفٌ ثابت) «غيرُ مرتبطة» في التقرير كما في «مهامي» · لا إسنادَ إليه ولا ربط · والأهليةُ تسمّي السبب', async () => {
  const W = await world({ worker: WU.file }); const me = await W.login(ME.un, ME.pw), mate = await W.login(MATE.un, MATE.pw), dm = await W.login(...DM);
  const DUP_N = '1088888877', TWIN = 'TEST_ONLY twin eid (خطأُ إدخال)', E = stored(W.env, KE);
  E.find(e => e.eid === ME.eid).nid = DUP_N;
  E.push({ eid: 'tst_e_twinN', name: 'TEST_ONLY twin nid', nid: DUP_N }, { eid: MATE.eid, name: TWIN }); await replaceOperationalFixture(W.env, KE, E);
  const S = stored(W.env, KT); S[DAY].push(row({ id: 1760000055511, title: 'مسندةٌ برقم هويةٍ مكرَّر', eid: DUP_N }), row({ id: 1760000055512, title: 'مسندةٌ بالاسم', eid: ME.name })); await replaceOperationalFixture(W.env, KT, S);
  const L = await get(W, dm.ck, '/api/tasks/linkage'); assert.equal(L.status, 200, JSON.stringify(L.j));
  const dN = L.j.rows.find(r => r.id === 1760000055511), dE = L.j.rows.filter(r => r.tok === MATE.eid);
  assert.ok(dN && dN.by === 'ambiguous' && dN.label === 'غير مرتبطة' && !dN.emp, 'رقمُ هويةٍ مكرَّر ⇒ غيرُ مرتبطة: ' + JSON.stringify(dN));
  assert.ok(dE.length >= 1 && dE.every(r => r.by === 'ambiguous' && r.label === 'غير مرتبطة' && !r.emp), 'معرّفٌ ثابتٌ مكرَّر ⇒ غيرُ مرتبطة (لا «مرتبطة» بأوّل سجلٍّ مطابِق): ' + JSON.stringify(dE.slice(0, 2)));
  assert.ok(L.j.counts.ambiguous >= 1 + dE.length, JSON.stringify(L.j.counts));
  /* التقريرُ يطابق «مهامي»: لا يرى أحدٌ صفَّ المعرّف المكرَّر — وصفوفُ معرّفي الفريد باقيةٌ لي */
  const lm = await get(W, me.ck, '/api/me/tasks'); assert.ok(lm.j.me.linked && !lm.j.rows.some(r => r.id === 1760000055511) && lm.j.rows.some(r => r.id === 1760000000101), 'أنا: صفّي بمعرّفي وحده');
  const lt = await get(W, mate.ck, '/api/me/tasks'); assert.equal(lt.j.me.linked, false, 'حسابُ المعرّف المكرَّر غيرُ مرتبط'); assert.equal(lt.j.rows.length, 0);
  /* لا إسنادَ ولا ربطَ بمعرّفٍ مكرَّر — والسببُ مسمّى */
  const c = await mk(W, dm.ck, { asg: [MATE.eid] }); assert.equal(c.status, 400, JSON.stringify(c.j)); assert.equal(c.j.err, 'asg'); assert.match(c.j.msg, /أكثرُ من سجلٍّ/);
  const rl = await post(W, dm.ck, '/api/tasks/relink', { k: DAY, id: 1760000055512, from: ME.name, to: MATE.eid }); assert.equal(rl.status, 400, JSON.stringify(rl.j)); assert.match(rl.j.msg, /أكثرُ من سجلٍّ/);
  assert.equal(stored(W.env, KT)[DAY].find(r => r[13] === 1760000055512)[14], ME.name, 'لم يُكتب شيء');
  const el = (await get(W, dm.ck, '/api/tasks/eligibility?ekeys=' + MATE.eid + '&s=' + (Date.now() + HR) + '&e=' + (Date.now() + 2 * HR))).j.items[0];
  assert.equal(el.result, 'غير متاح', JSON.stringify(el)); assert.equal(el.code, 'unknown_emp'); assert.match(el.why, /أكثرُ من سجلٍّ/);
  /* وبعد تصحيح السجل يعود كلُّ شيء */
  await replaceOperationalFixture(W.env, KE, stored(W.env, KE).filter(e => e.name !== TWIN));
  assert.equal((await mk(W, dm.ck, { asg: [MATE.eid] })).status, 200, 'الإسنادُ بعد التصحيح');
  assert.ok((await get(W, mate.ck, '/api/me/tasks')).j.me.linked, 'والزميلُ مرتبطٌ من جديد');
});

test('AT-G4 التوافق: صفوفُ المرحلة الأولى والصفوفُ القديمة بلا x تعمل كما كانت (بلا مراجعة · «صورة أو ملاحظة») · والتعديلُ في الصفحة يحفظ 22 و23', async () => {
  const W = await world({ worker: WU.file }); const me = await W.login(ME.un, ME.pw);
  await act(W, me.ck, { k: DAY, id: 1760000000101, act: 'accept' });
  assert.equal((await act(W, me.ck, { k: DAY, id: 1760000000101, act: 'finish' })).status, 400, 'بلا صورة ولا ملاحظة ⇒ 400 كما كان');
  const f = await act(W, me.ck, { k: DAY, id: 1760000000101, act: 'finish', note: 'TEST_ONLY' }); assert.equal(f.j.row.st, 'done', 'الصفُّ القديم: التسليمُ إنجاز (بلا مراجِع)');
  assert.equal(f.j.row.review, 'none');
});
