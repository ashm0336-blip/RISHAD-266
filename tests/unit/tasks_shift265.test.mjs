/* KIVO_265 · البند 12 (قائمةُ صفحة المهام) — الإسنادُ للوردية ككيان: POST /api/tasks/create يقبل shift {name} بدل asg (071 tkCreate · 072 tkShiftAsg)
   فيحلّ الخادمُ مكلَّفي الوردية يومَ المهمة من الجدول الشهري (صفُّ الموظف shift) ومن كشف الوردية في تقرير اليوم المسحوب، ويُنشئ صفاً لكل مكلَّف بالقواعد
   نفسِها (الأهلية · الحسابُ النشط · force لغير المتاح · grp واحد · تنبيه task_new) بسقف 500 صفّ، ويعيد skipped بأسبابه. كانت ورديةٌ فيها أكثرُ من 50
   موظفاً لا تُسند (سقفُ asg). بالوضعين (القديم · الإنفاذ) وببياناتٍ اصطناعية وحدها (tasks_fx + 60 موظفاً اصطناعياً هنا):
     (أ) 60 موظفاً بالقائمة ⇒ 400 at:asg كما كان · بالوردية ⇒ صفٌّ لكل واحدٍ (ومعهم محوَّلٌ إليها من تقرير اليوم) بمجموعةٍ واحدة ووسمها وتنبيهٍ لكلٍّ وحدثِ تدقيقٍ يذكر الوردية
     (ب) التخطّي بأسبابه: بلا حسابٍ نشط · بلا معرّفٍ ثابت · المراجِعُ نفسُه — والغائبُ بتقرير اليوم 409 elig حتى force · والرفض: shift مع asg · بلا اسم · ورديةٌ لا موظفَ فيها · بلا task.assign
     (ج) السقف: 520 موظفاً ⇒ 500 صفّ و20 متخطًّى (cap)
     (د) متكررةٌ بالوردية: rec.asg مكلَّفو الوردية والتوليدُ ينسخها لهم */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, workerUnderTest, ME, KT, notificationMessages, KE, D, TAG, stored, putKV, hij, MID, HR, ymOf, taskCommandBody, replaceOperationalFixture, operationSaveBody } from './tasks_fx.mjs';

const WU = workerUnderTest();
const DM = ['0000000101', '70101'], EMP1 = ['0000000113', '70113'];
const KS = 'bsdept:' + D + ':bassam_staffing_v3', KO = 'bsdept:' + D + ':bassam_shift_options_v1', KR = 'bsdept:' + D + ':bassam_dreport_v1', PK = 'bassam_perms_v1';
const SHN = 'TST-SH265', OTHER = 'TST-A';                                          /* الورديةُ الأخرى بوقتٍ يشمل الموعد — فالمحوَّلُ متاحٌ بجدوله */
const post = (W, ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body:operationSaveBody(W.env,p,taskCommandBody(W.env, p, body)) });
const show = (r) => JSON.stringify({ st: r.status, j: r.j }).slice(0, 600);
const N0 = Date.now(), TM = MID(N0) + 864e5, S0 = TM + 8 * HR, K0 = hij(S0 + 4 * HR), YM = ymOf(K0);   /* غداً 08:00 — داخل وردية 06:00–14:00 */
const run = (W) => post(W, W.su.ck, '/api/tasks/recur/run?dept=' + D, {});
const notifs = (W) => notificationMessages(W.env);
const setPerm = (W, eid, acts) => { const P = stored(W.env, PK); P.emps = P.emps || {}; P.emps[D] = P.emps[D] || {}; P.emps[D][eid] = { tasks: acts }; putKV(W.env, PK, P); };
const eidOf = (n) => 'tst_e_sh' + n;
/* n موظفاً اصطناعياً في سجل الإدارة ولكلٍّ حسابُ دخولٍ نشط (بلا بصمةِ كلمة مرور — لا يدخلون) وصفٌّ في الجدول الشهري لشهر المهمة بالوردية sh */
async function seed(W, n, o = {}) {
  const E = stored(W.env, KE) || [], U = stored(W.env, 'bassam_auth_users_v1') || [], S = stored(W.env, KS) || {}; S[YM] = S[YM] || {};
  for (let i = 1; i <= n; i++) {
    const eid = eidOf(i), nm = TAG + ' · وردية ' + i;
    E.push({ eid, name: nm, empno: String(80000 + i), type: TAG + ' رسمي', work: TAG + ' مراقب' });
    if (!(o.noAcct || []).includes(i)) U.push({ id: 'tst_sh_u' + i, un: String(2000000400 + i), ph: 'x', name: nm, role: 'staff', deptId: D, ekey: eid, dis: 0, test: TAG });
    S[YM][eid] = { shift: (o.other || []).includes(i) ? OTHER : SHN, rest: [], leaves: {}, perm: {}, cs: '', muk: false };
  }
  await replaceOperationalFixture(W.env, KE, E); putKV(W.env, 'bassam_auth_users_v1', U); await replaceOperationalFixture(W.env, KS, S);
  const O = stored(W.env, KO) || []; if (!O.some((q) => q && q.name === SHN)) O.push({ name: SHN, color: '#000', tStart: '06:00', tEnd: '14:00' }); await replaceOperationalFixture(W.env, KO, O);
}
const mk = (W, ck, body) => post(W, ck, '/api/tasks/create', Object.assign({ k: K0, t: TAG + ' للوردية', s: S0, e: S0 + 2 * HR, rv: 'none' }, body || {}));
const rowsK = (W) => (stored(W.env, KT)[K0] || []).filter((r) => Array.isArray(r) && String(r[0]).indexOf('للوردية') !== -1);

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';

  test(M + '(أ) 60 موظفاً: بالقائمة 400 at:asg كما كان — وبالوردية صفٌّ لكل واحدٍ ومعهم المحوَّلُ إليها من تقرير اليوم · مجموعةٌ واحدة · تنبيهٌ لكلٍّ · حدثُ تدقيقٍ يذكر الوردية', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    await seed(W, 61, { other: [61] });                                                    /* الموظفُ 61 في ورديةٍ أخرى بالجدول — ومحوَّلٌ إلى الوردية في تقرير اليوم */
    await replaceOperationalFixture(W.env, KR, { [K0]: { created: N0, shifts: { [SHN]: { pulled: true, roster: [{ ekey: eidOf(61), st: 'pr', shift: SHN }] } } } });
    const L = Array.from({ length: 60 }, (q, i) => eidOf(i + 1));
    const byList = await mk(W, dm.ck, { asg: L }); assert.equal(byList.status, 400, show(byList)); assert.equal(byList.j.at, 'asg', 'سقفُ القائمة 50 كما كان');
    const c = await mk(W, dm.ck, { shift: { name: SHN } }); assert.equal(c.status, 200, show(c));
    assert.equal(c.j.rows.length, 61, 'صفٌّ لكل مكلَّف في الوردية ومعهم المحوَّل'); assert.deepEqual(c.j.skipped, [], 'لا متخطًّى');
    assert.equal(c.j.elig.length, 61); assert.ok(c.j.elig.every((q) => q.result === 'متاح'), 'الحكمُ لكلٍّ من سياق الأهلية: ' + JSON.stringify(c.j.elig.filter((q) => q.result !== 'متاح').slice(0, 2)));
    const R = rowsK(W); assert.equal(R.length, 61);
    assert.deepEqual(R.map((r) => r[14]).sort(), L.concat([eidOf(61)]).sort(), 'المكلَّفون بمعرّفاتهم');
    assert.ok(R[0][17] && R.every((r) => r[17] === R[0][17]), 'مجموعةٌ واحدة'); assert.equal(R[0][18], SHN + ' كاملة', 'وسمُ المجموعة اسمُ الوردية');
    assert.ok(R.every((r) => r[23] && r[23].by && r[23].elig && r[23].elig.res === 'متاح' && r[23].pol), 'إعداداتُ الخادم في العمود 23 لكل صفّ');
    assert.equal(new Set(R.map((r) => String(r[13]))).size, 61, 'هويةٌ فريدة لكل صفّ');
    const nf = notifs(W).filter((n) => n.type === 'task_new' && n.server_origin === 1); assert.equal(nf.length, 61, 'تنبيهُ task_new لكل مكلَّف من الخادم');
    const ev = W.env.DB.q("SELECT ctx FROM aud WHERE k = ? AND act = 'created' AND ctx LIKE ?", KT, '%"shift":"' + SHN + '"%'); assert.equal(ev.length, 61, 'حدثُ «أُنشئت» يذكر الوردية');
    assert.equal(c.j.rows.filter((q) => q.ekey).length, 61);
    /* القائمةُ القصيرة كما كانت — وبلا asg ولا shift 400 at:asg */
    const sm = await mk(W, dm.ck, { asg: [ME.eid] }); assert.equal(sm.status, 200, show(sm)); assert.deepEqual(sm.j.skipped, []);
    const none = await mk(W, dm.ck, {}); assert.equal(none.status, 400, show(none)); assert.equal(none.j.at, 'asg');
  });

  test(M + '(ب) التخطّي بأسبابه (بلا حساب · بلا معرّف · المراجِع) · الغائبُ 409 elig حتى force · والرفض: shift مع asg · بلا اسم · ورديةٌ خالية · بلا task.assign', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    await seed(W, 12, { noAcct: [3] });
    /* صفٌّ بالاسم وحده في الجدول (صيغةُ 242 القديمة) لموظفٍ بلا معرّفٍ ثابت */
    const E = stored(W.env, KE); E.push({ name: TAG + ' · بلا معرّف', empno: '89999', type: TAG + ' رسمي', work: TAG + ' مراقب' }); await replaceOperationalFixture(W.env, KE, E);
    const S = stored(W.env, KS); S[YM][TAG + ' · بلا معرّف'] = { shift: SHN, rest: [] }; S[YM].tst_e_emp1 = { shift: SHN, rest: [] }; await replaceOperationalFixture(W.env, KS, S);
    await replaceOperationalFixture(W.env, KR, { [K0]: { created: N0, shifts: { [SHN]: { pulled: true, roster: [{ ekey: eidOf(5), st: 'ab', shift: SHN }] } } } });   /* الموظفُ 5 غائبٌ بتقرير اليوم */
    const bad = await mk(W, dm.ck, { shift: { name: SHN }, rv: { u: 'tst_sh_u7' } }); assert.equal(bad.status, 400, show(bad)); assert.equal(bad.j.at, 'rv', 'مراجِعٌ بلا صلاحية الاعتماد يُرفض كالقائمة');
    setPerm(W, 'tst_e_emp1', ['view', 'edit']); const rv = { u: 'tst_emp1' };        /* المراجِعُ موظفٌ من الوردية يملك الاعتماد — يُتخطّى من الإسناد لا 400 كالقائمة */
    const e1 = await mk(W, dm.ck, { shift: { name: SHN }, rv }); assert.equal(e1.status, 409, show(e1)); assert.equal(e1.j.err, 'elig', 'الغائبُ «غير متاح» يحتاج force');
    assert.ok(e1.j.items.some((q) => q.ekey === eidOf(5) && q.result === 'غير متاح' && q.code === 'absent'), JSON.stringify(e1.j.items.filter((q) => q.result !== 'متاح')));
    assert.ok(Array.isArray(e1.j.skipped) && e1.j.skipped.some((q) => q.ekey === eidOf(3) && q.code === 'no_acct'), 'المتخطَّون مع الرفض: ' + JSON.stringify(e1.j.skipped));
    assert.equal(rowsK(W).length, 0, 'لم يُكتب شيء');
    const c = await mk(W, dm.ck, { shift: { name: SHN }, rv, force: true }); assert.equal(c.status, 200, show(c));
    const sk = c.j.skipped; assert.equal(sk.length, 3, JSON.stringify(sk));
    assert.ok(sk.some((q) => q.ekey === 'tst_e_emp1' && q.code === 'reviewer'), 'المراجِعُ نفسُه يُتخطّى');
    assert.ok(sk.some((q) => q.ekey === eidOf(3) && q.code === 'no_acct' && /حساب/.test(q.why)), 'بلا حسابٍ نشط');
    assert.ok(sk.some((q) => q.ekey === '' && q.code === 'unknown_emp' && /معرّف/.test(q.why)), 'بلا معرّفٍ ثابت');
    assert.equal(c.j.rows.length, 11, 'الباقون كلُّهم — ومعهم الغائبُ بالتأكيد (force)');
    assert.ok(c.j.rows.some((q) => q.ekey === eidOf(5)) && !c.j.rows.some((q) => q.ekey === eidOf(3)), JSON.stringify(c.j.rows));
    assert.equal(notifs(W).filter((n) => n.type === 'task_new' && n.server_origin === 1).length, 11);
    assert.ok(rowsK(W).every((r) => r[23].rv && r[23].rv.u === 'tst_emp1'), 'المراجِعُ المسمّى على كل صفّ');
    /* الرفض */
    const both = await mk(W, dm.ck, { shift: { name: SHN }, asg: [ME.eid] }); assert.equal(both.status, 400, show(both)); assert.equal(both.j.at, 'asg', 'لا كليهما');
    const nn = await mk(W, dm.ck, { shift: {} }); assert.equal(nn.status, 400, show(nn)); assert.equal(nn.j.at, 'shift');
    const ns = await mk(W, dm.ck, { shift: { name: 'TST-NOPE' } }); assert.equal(ns.status, 400, show(ns)); assert.equal(ns.j.err, 'shift'); assert.equal(ns.j.at, 'shift');
    const xx = await mk(W, dm.ck, { shift: { name: SHN, x: 1 } }); assert.equal(xx.status, 400, show(xx)); assert.equal(xx.j.at, 'shift.x', 'المخطّط: shift بحقله وحده');
    setPerm(W, 'tst_e_emp1', ['view', 'add']); const e1c = await W.login(...EMP1);
    const den = await mk(W, e1c.ck, { shift: { name: SHN }, force: true }); assert.equal(den.status, 403, show(den)); assert.equal(den.j.err, 'denied', 'الإسنادُ للوردية يحتاج task.assign كالقائمة');
    assert.equal(rowsK(W).length, 11, 'لم يُكتب غيرُ الدفعة المؤكَّدة');
  });

  test(M + '(ج) السقف: 520 موظفاً في الوردية ⇒ 500 صفّ و20 متخطًّى بسبب السقف', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    await seed(W, 520);
    const c = await mk(W, dm.ck, { shift: { name: SHN } }); assert.equal(c.status, 200, show(c));
    assert.equal(c.j.rows.length, 500); assert.equal(c.j.skipped.length, 20); assert.ok(c.j.skipped.every((q) => q.code === 'cap' && /500/.test(q.why)), JSON.stringify(c.j.skipped[0]));
    assert.equal(rowsK(W).length, 500); assert.equal(new Set(rowsK(W).map((r) => r[14])).size, 500, 'بلا تكرار');
  });

  test(M + '(د) متكررةٌ بالوردية: rec.asg مكلَّفو الوردية — والتوليدُ ينسخها لهم يومَ الغد+1', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    await seed(W, 8);
    const c = await mk(W, dm.ck, { shift: { name: SHN }, rec: { t: 'daily', open: 1 } }); assert.equal(c.status, 200, show(c));
    const r0 = rowsK(W)[0], rec = r0[23].rec; assert.equal(rec.t, 'daily'); assert.deepEqual(rec.asg.slice().sort(), Array.from({ length: 8 }, (q, i) => eidOf(i + 1)).sort());
    assert.ok(rowsK(W).every((r) => r[23].idem === 'r:' + rec.id + ':' + K0.replace(/-0(\d)/g, '-$1') + ':' + r[14]), 'مفتاحُ عدم التكرار لكل صفّ');
    const g = await run(W); assert.equal(g.status, 200, show(g)); assert.ok(g.j.created >= 8, show(g));
    const k1 = hij(S0 + 864e5 + 4 * HR), S = stored(W.env, KT);
    assert.equal((S[k1] || []).filter((r) => r[23] && r[23].rec && r[23].rec.id === rec.id).length, 8, 'نسخةٌ لكل مكلَّف من الوردية في الغد+1');
    assert.equal((await run(W)).j.created, 0, 'لا تكرارَ عند إعادة التشغيل');
  });
}
