/* KIVO_265 · KIVO-Tasks — المراجعةُ المستقلة لدمج 265 (review_265_tasks.md · الحكم FIX FIRST): اختباراتٌ تُخفق على العامل قبل الإصلاح ثم تنجح —
   بالوضعين حيث يختلف القرار (القديم 018/044 · الإنفاذ 059) وببياناتٍ اصطناعية وحدها (tests/unit/tasks_fx.mjs):
     H-1  العمودُ 23 (x) للخادم وحده — حفظٌ خامّ يضيف x أو يغيّرها أو ينزعها أو ينسخها يُرفض لأيّ دور · والتكرارُ يتحقّق من صاحب السلسلة في سجل الخادم
     M-1  سببُ «غير متاح» التفصيليّ لمن يقرأ الجدولَ الشهري وحده — والتنبيهُ المخزَّن (يقرؤه أعضاءُ الإدارة كلُّهم) مجرّد
     M-2  التفرّدُ في الحقلين معاً (eid ∪ nid) — في «مهامي» و«ملفي» (062b) وتقرير الربط
     L-1  سقفُ القراءات الذاتية · L-3 مصدرُ كتابات التكرار هويةُ الخادم · L-5 النسخةُ المحذوفة لا تُولَّد من جديد
     والمساران الجديدان: /api/tasks/settings · /api/tasks/reopen (ما كانت صفحةُ المهام تكتبه في x بحفظٍ خام) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, workerUnderTest, ME, MATE, KT, notificationMessages, assertNotificationKVRetired, KE, D, DAY, TAG, IMG_MATE, stored, putKV, addAccount, row, hij, HR, WD_AR, wdOf, ymOf, taskCommandBody, replaceOperationalFixture, operationSaveBody } from './tasks_fx.mjs';

const WU = workerUnderTest();
const DM = ['0000000101', '70101'], EMP1 = ['0000000113', '70113'];
const KS = 'bsdept:' + D + ':bassam_staffing_v3', PK = 'bassam_perms_v1';
const post = (W, ck, p, body, headers) => W.C.api(p, { method: 'POST', cookie: ck, body:operationSaveBody(W.env,p,taskCommandBody(W.env, p, body)), headers });
const get = (W, ck, p, headers) => W.C.api(p, { cookie: ck, headers });
const allRows = (W) => Object.values(stored(W.env, KT) || {}).flat().filter(Array.isArray);
const genOf = (W, recId) => allRows(W).filter((q) => q[23] && typeof q[23].idem === 'string' && q[23].idem.indexOf('r:' + recId + ':') === 0);
const superOf = (W) => stored(W.env, 'bassam_auth_users_v1').find((u) => u.role === 'super');
/* حفظٌ خامّ للمخزن كلِّه كما تفعل صفحةُ المهام: قيمةُ الخادم ⇐ تعديل ⇐ /api/save بنسختها */
async function raw(W, ck, mut) {
  const g = await get(W, ck, "/api/operations/read?keys=" + encodeURIComponent(KT)), S = g.j.resources[KT];
  mut(S);
  return post(W, ck, '/api/save', { set: { [KT]: JSON.stringify(S) }, base: { [KT]: g.j.base[KT] } });
}
const denied = (sv) => (sv.j && sv.j.denied && sv.j.denied[KT] ? String(sv.j.denied[KT].why || '?') : '');
const saved = (sv) => !!(sv.j && sv.j.revs && sv.j.revs[KT]);

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';

  test(M + 'H-1 (أ) الحفظُ الخامّ بانتحال المنشئ (x.by = مدير النظام) وسلسلةِ تكرار من حامل task.edit بلا task.create يُرفض · والتوليدُ الكسول لا يُنشئ شيئاً', async () => {
    const W = await world({ worker: WU.file, mode });
    const P = stored(W.env, PK); P.emps[D]['tst_e_emp1'] = { tasks: ['view', 'edit'] }; putKV(W.env, PK, P);
    const su = superOf(W), e1 = await W.login(...EMP1);
    const s0 = Date.now() + HR;
    assert.equal((await post(W, e1.ck, '/api/tasks/create', { k: hij(s0), t: TAG + ' probe', s: s0, e: s0 + HR, asg: [] })).status, 403, 'لا إنشاءَ بلا task.create');
    const T0 = DAY.split('-').map(Number);
    const sv = await raw(W, e1.ck, (S) => {
      const i = S[DAY].findIndex((r) => Array.isArray(r) && r[13] === 1760000000901), r = S[DAY][i].slice();
      while (r.length < 24) r.push(null);
      r[23] = { v: 2, by: { u: su.id, e: '', n: 'FORGED' }, pol: { m: 'none' }, rv: null, dec: 1,
        rec: { id: 'rFORGE', ver: 9, t: 'daily', from: DAY, to: (T0[0] + 1) + '-' + T0[1] + '-' + T0[2], paused: 0, asg: [MATE.eid, ME.eid] } };
      r[15] = Date.now() + 2 * HR; r[16] = Date.now() + 3 * HR; S[DAY][i] = r;
    });
    assert.equal(denied(sv), 'task-x', 'الحفظُ الخامّ مرفوض: ' + JSON.stringify(sv.j).slice(0, 300));
    const r1 = stored(W.env, KT)[DAY].find((q) => q[13] === 1760000000901);
    assert.ok(!(r1.length > 23 && r1[23]), 'لم يُكتب العمودُ 23');
    const me = await W.login(ME.un, ME.pw);
    assert.equal((await get(W, me.ck, '/api/me/tasks')).status, 200);                       /* المحرّكُ الكسول */
    assert.equal(genOf(W, 'rFORGE').length, 0, 'لا نسخَ مولَّدة');
    assert.equal(W.env.DB.q("SELECT COUNT(*) AS n FROM aud WHERE k = ? AND act = 'created' AND uid = ?", KT, su.id)[0].n, 0, 'ولا حدثَ «أُنشئت» باسم مدير النظام');
  });

  test(M + 'H-1 (أ) لأيّ دور — مديرُ الإدارة ومديرُ النظام: تعديلُ الصفّ وx كما هي يمرّ · تغييرُ x أو نزعُها (لسانٌ قديم) أو نسخُها يُرفض · وحذفُ الصفّ كلِّه يمرّ', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    const s = Date.now() + 2 * HR, c = await post(W, dm.ck, '/api/tasks/create', { k: hij(s), t: TAG + ' H1', s, e: s + HR, asg: [ME.eid], rv: 'none' });
    assert.equal(c.status, 200, JSON.stringify(c.j)); const k = c.j.rows[0].k, id = c.j.rows[0].id;
    const ix = (S) => S[k].findIndex((r) => r[13] === id);
    let sv = await raw(W, dm.ck, (S) => { S[k][ix(S)][0] = TAG + ' H1 معدَّل'; });
    assert.ok(saved(sv), 'تعديلُ العنوان وx كما هي: ' + JSON.stringify(sv.j).slice(0, 200));
    const x0 = stored(W.env, KT)[k].find((r) => r[13] === id)[23];
    sv = await raw(W, dm.ck, (S) => { const r = S[k][ix(S)]; r[23] = Object.assign({}, r[23], { rv: { u: 'tst_dm1', e: '', n: 'x' } }); });
    assert.equal(denied(sv), 'task-x', 'تغييرُ المراجِع بحفظٍ خامّ');
    sv = await raw(W, dm.ck, (S) => { const r = S[k][ix(S)]; r[23] = Object.assign({}, r[23], { by: { u: superOf(W).id, e: '', n: 'x' } }); });
    assert.equal(denied(sv), 'task-x', 'تغييرُ المنشئ بحفظٍ خامّ');
    sv = await raw(W, dm.ck, (S) => { S[k][ix(S)] = S[k][ix(S)].slice(0, 22); });
    assert.equal(denied(sv), 'task-x', 'نزعُ x (صفحةُ مهامٍ قديمة) — لا يُمحى الإلغاءُ والمراجعةُ والتكرار بصمت');
    sv = await raw(W, dm.ck, (S) => { const r = S[k][ix(S)].slice(); r[13] = id + 7; S[k].push(r); });
    assert.equal(denied(sv), 'task-x', 'نسخُ x إلى صفٍّ جديد');
    sv = await raw(W, dm.ck, (S) => { const r = S[k][ix(S)].slice(); r[13] = null; r[23] = Object.assign({}, r[23], { rec: { id: 'rnoid', ver: 9, t: 'daily', from: k, to: k, paused: 0, asg: [ME.eid] } }); S[k].push(r); });
    assert.equal(denied(sv), 'task-x', 'صفٌّ بلا هوية (13) يحمل x — لا إعفاءَ لغياب الهوية');
    sv = await raw(W, W.su.ck, (S) => { const r = S[k][ix(S)]; r[23] = Object.assign({}, r[23], { pol: { m: 'none' } }); });
    assert.equal(denied(sv), 'task-x', 'ولا مديرُ النظام بحفظٍ خامّ');
    assert.deepEqual(stored(W.env, KT)[k].find((r) => r[13] === id)[23], x0, 'x كما هي');
    sv = await raw(W, dm.ck, (S) => { S[k].splice(ix(S), 1); });
    assert.ok(saved(sv), 'حذفُ الصفّ كلِّه يمرّ (صلاحيةُ الحذف): ' + JSON.stringify(sv.j).slice(0, 200));
  });

  test(M + 'H-1 (ب) · L-3 · L-5 التكرار: سلسلةٌ في المخزن باسم مدير النظام بلا حدثِ إنشاءٍ له في سجل الخادم لا تولِّد · والحقيقيةُ تولِّد باسم صاحبها بمصدر الخادم · والنسخةُ المحذوفة لا تعود', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), su = superOf(W);
    const s = Date.now() + 30 * 60e3, c = await post(W, dm.ck, '/api/tasks/create', { k: hij(s), t: TAG + ' سلسلةٌ حقيقية', s, e: s + HR, asg: [ME.eid], rec: { t: 'daily' }, rv: 'none', force: true });
    assert.equal(c.status, 200, JSON.stringify(c.j));
    const recId = stored(W.env, KT)[c.j.rows[0].k].find((r) => r[13] === c.j.rows[0].id)[23].rec.id;
    /* صفُّ سلسلةٍ مزوَّر في المخزن مباشرةً (كما لو كُتب قبل الإصلاح بحفظٍ خامّ) */
    const S = stored(W.env, KT), T0 = DAY.split('-').map(Number), f = row({ id: 1760000077001, title: 'سلسلةٌ مزوّرة', eid: MATE.eid, s: Date.now() + 2 * HR, e: Date.now() + 3 * HR });
    while (f.length < 24) f.push(null);
    f[23] = { v: 2, by: { u: su.id, e: '', n: 'FORGED' }, pol: { m: 'none' }, rv: null, dec: 1, rec: { id: 'rforge2', ver: 9, t: 'daily', from: DAY, to: (T0[0] + 1) + '-' + T0[1] + '-' + T0[2], paused: 0, asg: [MATE.eid] } };
    S[DAY].push(f); await replaceOperationalFixture(W.env, KT, S);
    /* المحرّكُ من «ملفي» موظفٍ بعنوانٍ وجهازٍ مميَّزين (L-3) */
    const me = await W.login(ME.un, ME.pw), IP = '203.0.113.77';
    assert.equal((await get(W, me.ck, '/api/me/tasks', { 'cf-connecting-ip': IP, 'user-agent': 'TEST_ONLY employee device' })).status, 200);
    assert.equal(genOf(W, 'rforge2').length, 0, 'المزوَّرةُ لا تولِّد');
    const gen = genOf(W, recId); assert.ok(gen.length >= 2, 'الحقيقيةُ ولّدت: ' + gen.length);
    const rr = await post(W, dm.ck, '/api/tasks/recur/run', {});
    assert.ok(rr.j.denied.some((q) => q.id === 'rforge2' && /سجلَّ إنشائها/.test(q.why)), 'السببُ مسمّى: ' + JSON.stringify(rr.j.denied));
    const A = W.env.DB.q("SELECT uid, ip, ctx FROM aud WHERE k = ? AND act = 'created' AND ctx LIKE '%recur%'", KT);
    assert.ok(A.length >= 2 && A.every((a) => a.uid === 'tst_dm1'), 'باسم صاحب السلسلة');
    assert.ok(A.every((a) => a.ip === 'srv:recur' && a.ip !== IP), 'L-3: المصدرُ هويةُ الخادم لا عنوانُ الموظف: ' + JSON.stringify(A.map((a) => a.ip)));
    assert.ok(A.every((a) => /"sys":1/.test(a.ctx) && /"idem":"r:/.test(a.ctx)), 'L-3: موسومةٌ «ولّدها الخادم» بمفتاح نسختها');
    /* L-5: المسؤولُ يحذف نسخةً مولَّدة ⇒ لا تُولَّد من جديد */
    const del = gen[gen.length - 1], dk = Object.keys(stored(W.env, KT)).find((d) => (stored(W.env, KT)[d] || []).some((q) => Array.isArray(q) && q[13] === del[13]));
    const sv = await raw(W, dm.ck, (S2) => { S2[dk] = S2[dk].filter((q) => !(Array.isArray(q) && q[13] === del[13])); });
    assert.ok(saved(sv), 'حذفُ النسخة: ' + JSON.stringify(sv.j).slice(0, 200));
    await post(W, dm.ck, '/api/tasks/recur/run', {});
    assert.ok(!genOf(W, recId).some((q) => q[23].idem === del[23].idem), 'L-5: النسخةُ المحذوفة لم تعد');
  });

  test(M + 'M-1 سببُ «غير متاح» التفصيليّ لمن يقرأ الجدولَ الشهري وحده: التنبيهُ المخزَّن مجرّد · وردُّ التوليد مفصّلٌ لقارئ الجدول ومجرّدٌ لغيره', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), me = await W.login(ME.un, ME.pw);
    /* KIVO_265 · توقيتُ الاختبار (الوحدةُ الكاملة 23:44 بتوقيت الرياض): بدايةُ القالب بين 00:00 و04:00 تجعله هو يومَ الراحة فلا نسخةَ تُتخطّى بسببها —
       فتُدفع إلى 04:00 من يومها، ويومُ الراحة يومُ النسخة التالية (s + 24 ساعة) لا «الآن + 24» (الحكمُ نفسُه) */
    const s = (() => { let t = Date.now() + 30 * 60e3; const h = new Date(t + 3 * HR).getUTCHours(); if (h < 4) t += (4 - h) * HR; return t; })();
    const tm = s + 24 * HR, SS = stored(W.env, KS) || {}, ym = ymOf(hij(tm));
    SS[ym] = SS[ym] || {}; SS[ym][MATE.eid] = { shift: 'TST-A', rest: [WD_AR[wdOf(tm)]], cs: '', muk: false }; await replaceOperationalFixture(W.env, KS, SS);
    const c = await post(W, dm.ck, '/api/tasks/create', { k: hij(s), t: TAG + ' يومية', s, e: s + HR, asg: [MATE.eid], rec: { t: 'daily' }, rv: 'none', force: true });
    assert.equal(c.status, 200, JSON.stringify(c.j));
    const rr = await post(W, dm.ck, '/api/tasks/recur/run', {}), w1 = (rr.j.skipped || []).map((q) => q.why);
    assert.ok(w1.some((w) => /راحته الأسبوعية/.test(w)), 'مديرُ الإدارة يقرأ الجدول ⇒ السببُ مفصّل: ' + JSON.stringify(w1));
    const N = notificationMessages(W.env).filter((n) => /لم تُولَّد/.test(n.body || ''));
    assert.ok(N.length >= 1, 'وصل التنبيه');
    assert.ok(N.every((n) => !/راحته|إجازة|غائب/.test(n.body) && /غيرُ متاحٍ في موعد التنفيذ/.test(n.body)), 'التنبيهُ المخزَّن مجرّد: ' + JSON.stringify(N.map((n) => n.body)));
    const gN = await get(W, me.ck, '/api/notifications?dept=' + encodeURIComponent(D)); assert.equal(gN.status, 200); assert.equal(gN.j.ok, 1);
    const V = gN.j.items;
    assert.ok(!V.some((n) => /راحته الأسبوعية/.test(n.b || '')), 'القراءة الذاتية للتنبيهات لا تكشف السبب الخاص'); assertNotificationKVRetired(W.env);
    /* من لا يقرأ الجدولَ الشهري (صفحةُ الجدول خارج سقف الإدارة) ⇒ الحكمُ المجرّد في ردّ التوليد */
    const P = stored(W.env, PK); P.caps[D] = (P.caps[D] || []).filter((x) => x !== 'staff'); putKV(W.env, PK, P);
    const gs = await get(W, dm.ck, "/api/operations/read?keys=" + encodeURIComponent(KS));
    assert.ok(gs.j.denied.includes(KS) && !Object.hasOwn(gs.j.resources,KS) && !Object.hasOwn(gs.j.base,KS), 'المديرُ لا يقرأ الجدولَ أو نسخته الآن: ' + JSON.stringify(gs.j).slice(0, 160));
    const rr2 = await post(W, dm.ck, '/api/tasks/recur/run', {}), w2 = (rr2.j.skipped || []).map((q) => q.why);
    assert.ok(w2.length && w2.every((w) => !/راحته|إجازة|غائب/.test(w)) && w2.some((w) => /غيرُ متاحٍ في موعد التنفيذ/.test(w)), 'الحكمُ المجرّد: ' + JSON.stringify(w2));
  });

  test(M + 'M-2 التفرّدُ في الحقلين معاً: رقمُ هويةِ سجلٍّ = معرّفُ زميلٍ ثابت ⇒ لا صفوفَ الزميل ولا صورتُه ولا جدولُه لصاحب السجل · وفي «مهامي» المعرّفُ المشترك «غيرُ مرتبط» للطرفين حتى يُصحَّح السجل', async () => {
    const W = await world({ worker: WU.file, mode });
    const E = stored(W.env, KE); E.push({ eid: 'tst_x1', nid: MATE.eid, name: TAG + ' · X1', empno: '70299' }); await replaceOperationalFixture(W.env, KE, E);
    addAccount(W.env, { uid: 'tst_x1u', un: '2000000299', pw: '70299', ekey: 'tst_x1' });
    const SS = stored(W.env, KS) || {}, ym = ymOf(DAY); SS[ym] = SS[ym] || {}; SS[ym][MATE.eid] = { shift: 'TST-B', rest: [], cs: TAG + ' صفُّ الزميل', muk: false }; await replaceOperationalFixture(W.env, KS, SS);
    const x = await W.login('2000000299', '70299'), L = await get(W, x.ck, '/api/me/tasks');
    assert.equal(L.status, 200); assert.equal(L.j.me.linked, true, 'صاحبُ السجل مرتبطٌ بمعرّفه الفريد');
    assert.deepEqual(L.j.rows.map((r) => r.t), [], 'لا صفوفَ زميل');
    assert.equal((await get(W, x.ck, '/api/me/tasks/img?id=' + IMG_MATE)).status, 403, 'ولا صورتُه');
    const t = await get(W, x.ck, '/api/me/today');
    assert.equal(t.status, 200); assert.ok(!(t.j.facts && t.j.facts.month && t.j.facts.month.has), '«ملفي»: لا صفَّ جدولِ الزميل: ' + JSON.stringify(t.j.facts && t.j.facts.shift));
    const m = await W.login(MATE.un, MATE.pw), ML = await get(W, m.ck, '/api/me/tasks');
    assert.equal(ML.j.me.linked, false, 'المعرّفُ يحمله سجلّان ⇒ غيرُ مرتبط (لا أوّلُ مطابِق)'); assert.equal(ML.j.rows.length, 0);
    /* «ملفي» (062b · قاعدةُ 264: المعرّفُ الثابت أولاً في الربط) — صاحبُ المعرّف مرتبطٌ به ويقرأ صفَّه، ورقمُ الهوية المساوي له لا يصير رمزاً لغيره (أعلاه) */
    const mt = await get(W, m.ck, '/api/me/today'); assert.equal(mt.j.identity.linked, true); assert.equal(mt.j.identity.by, 'eid'); assert.ok(mt.j.facts && mt.j.facts.month && mt.j.facts.month.has, 'صاحبُ المعرّف يرى صفَّه');
    const dm = await W.login(...DM), lk = await get(W, dm.ck, '/api/tasks/linkage');
    const mr = lk.j.rows.filter((r) => r.tok === MATE.eid); assert.ok(mr.length && mr.every((r) => r.by === 'ambiguous' && r.label === 'غير مرتبطة'), 'تقريرُ الربط: ' + JSON.stringify(mr.slice(0, 2)));
    await replaceOperationalFixture(W.env, KE, stored(W.env, KE).map((e) => (e.eid === 'tst_x1' ? Object.assign({}, e, { nid: '1099999999' }) : e)));
    const ML2 = await get(W, m.ck, '/api/me/tasks'); assert.equal(ML2.j.me.linked, true, 'بعد التصحيح يعود الربط'); assert.ok(ML2.j.rows.length >= 3);
    assert.deepEqual((await get(W, x.ck, '/api/me/tasks')).j.rows.map((r) => r.t), [], 'وصاحبُ السجل كما كان');
  });

  test(M + 'H-1 المساران الجديدان: الإعداداتُ (سياسةُ الإثبات · المراجِع · الاعتذار) وإعادةُ الفتح من الخادم لمن يملكها — والموظفُ لا يصل إليهما', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), me = await W.login(ME.un, ME.pw);
    const s = Date.now() - 10 * 60e3, c = await post(W, dm.ck, '/api/tasks/create', { k: hij(s), t: TAG + ' إعدادات', s, e: s + 3 * HR, asg: [ME.eid], rv: 'creator', force: true });
    assert.equal(c.status, 200, JSON.stringify(c.j)); const k = c.j.rows[0].k, id = c.j.rows[0].id;
    const xOf = () => stored(W.env, KT)[k].find((r) => r[13] === id)[23];
    assert.equal((await post(W, me.ck, '/api/tasks/settings', { k, id, pol: { m: 'none' } })).status, 403, 'الموظفُ لا يغيّر سياسةَ إثبات مهمته');
    const st = await post(W, dm.ck, '/api/tasks/settings', { k, id, ekey: ME.eid, pol: { m: 'note' }, dec: 0 });
    assert.equal(st.status, 200, JSON.stringify(st.j)); assert.deepEqual(xOf().pol, { m: 'note' }); assert.equal(xOf().dec, 0); assert.equal(xOf().rv.u, 'tst_dm1', 'المراجِعُ كما هو');
    assert.equal((await post(W, dm.ck, '/api/tasks/settings', { k, id, rv: { u: 'tst_p0e1' } })).status, 400, 'مراجِعٌ لا يملك الاعتماد');
    assert.ok(W.env.DB.q("SELECT COUNT(*) AS n FROM aud WHERE k = ? AND act = 'edited' AND ctx LIKE '%settings%'", KT)[0].n >= 1, 'حدثُ تدقيقٍ للإعدادات');
    /* التسليمُ للمراجعة ⇒ الاعتماد ⇒ إعادةُ الفتح: قرارُ المراجعة «أُعيدت» في x من الخادم */
    assert.equal((await post(W, me.ck, '/api/me/tasks/act', { k, id, act: 'start' })).status, 200);
    assert.equal((await post(W, me.ck, '/api/me/tasks/act', { k, id, act: 'submit', note: TAG + ' أُنجز' })).status, 200);
    assert.equal((await post(W, dm.ck, '/api/tasks/review', { k, id, ekey: ME.eid, decision: 'approve' })).status, 200);
    assert.equal((await post(W, me.ck, '/api/tasks/reopen', { k, id, ekey: ME.eid })).status, 403, 'الموظفُ لا يعيد فتحَ مهمته');
    const ro = await post(W, dm.ck, '/api/tasks/reopen', { k, id, ekey: ME.eid, why: TAG + ' ينقص التوثيق' });
    assert.equal(ro.status, 200, JSON.stringify(ro.j)); const r2 = stored(W.env, KT)[k].find((r) => r[13] === id);
    assert.equal(r2[3], 'in_progress'); assert.equal(r2[12], null); assert.equal(r2[23].rev.st, 'returned'); assert.equal(r2[23].rev.why, TAG + ' ينقص التوثيق');
    assert.equal(ro.j.st.exe, 'in_progress'); assert.equal(ro.j.st.rev, 'returned');
    assert.equal((await post(W, dm.ck, '/api/tasks/reopen', { k, id, ekey: ME.eid })).status, 409, 'غيرُ المنجزة لا تُعاد فتحاً');
  });

  /* حارسُ عدم الانحدار (لا يُخفق قبل الإصلاح): الاستثناءُ الوحيد للحفظ الخامّ — استعادةُ نسخةٍ احتياطية لمدير النظام تعيد العمودَ 23 كما في النسخة */
  test(M + 'H-1 استعادةُ مدير النظام لنسخةٍ احتياطية (علامةُ backup.restore) تعيد العمودَ 23 كما في النسخة — ولا يمنعها الحارس', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    const s = Date.now() + 2 * HR, c = await post(W, dm.ck, '/api/tasks/create', { k: hij(s), t: TAG + ' نسخة', s, e: s + HR, asg: [ME.eid], rv: 'none' });
    assert.equal(c.status, 200, JSON.stringify(c.j)); const k = c.j.rows[0].k, id = c.j.rows[0].id;
    const snap = JSON.parse(JSON.stringify(stored(W.env, KT))), x0 = snap[k].find((r) => r[13] === id)[23];
    assert.equal((await post(W, dm.ck, '/api/tasks/cancel', { k, id, ekey: ME.eid, why: TAG + ' إلغاء' })).status, 200);
    assert.equal(stored(W.env, KT)[k].find((r) => r[13] === id)[23].asg, 'cancelled');
    const g = await get(W, W.su.ck, "/api/operations/read?keys=" + encodeURIComponent(KT));
    const sv = await post(W, W.su.ck, '/api/save', { set: { [KT]: JSON.stringify(snap) }, del: [], base: { [KT]: g.j.base[KT] },
      ops: { [KT]: { op: 'backup.restore', scope: 'full', mode: 'replace', reason: TAG + ' استعادةُ نسخة' } } });
    assert.ok(saved(sv), 'الاستعادة: ' + JSON.stringify(sv.j).slice(0, 300));
    assert.deepEqual(stored(W.env, KT)[k].find((r) => r[13] === id)[23], x0, 'العمودُ 23 كما في النسخة');
  });
}

test('L-1 القراءاتُ الذاتية للمهام بسقف القراءة الذاتية في «ملفي» (120 في الدقيقة لكل حساب) — والحسابُ الآخر لا يتأثر', async () => {
  const W = await world({ worker: WU.file }); const me = await W.login(ME.un, ME.pw), mate = await W.login(MATE.un, MATE.pw);
  const rev = (await get(W, me.ck, '/api/me/tasks')).j.rev, st = [];
  for (let i = 0; i < 250 && !st.includes(429); i++) st.push((await get(W, me.ck, '/api/me/tasks?since=' + rev)).status);
  assert.ok(st.includes(429), 'تجاوزُ السقف ⇒ 429'); assert.ok(st.indexOf(429) >= 119, 'لا قبل 120 طلباً: ' + st.indexOf(429));
  assert.equal((await get(W, me.ck, '/api/me/tasks/img?id=' + IMG_MATE)).status, 429, 'والصورةُ في السقف نفسِه');
  assert.equal((await get(W, mate.ck, '/api/me/tasks')).status, 200, 'الزميلُ لا يتأثر');
});

test('L-2 مرشَّحُ الربط بالاسم لا يُعطى إلا إن تفرّد الاسم (لا أوّلُ مطابِق) — تقريرُ الربط', async () => {
  const W = await world({ worker: WU.file }); const dm = await W.login(...DM);
  const E = stored(W.env, KE); E.push({ eid: 'tst_twin_b', name: ME.name, nid: '1088880001' }); await replaceOperationalFixture(W.env, KE, E);
  const S = stored(W.env, KT); S[DAY].push(row({ id: 1760000088801, title: 'مسندةٌ باسمٍ مكرَّر', eid: ME.name }), row({ id: 1760000088802, title: 'مسندةٌ باسمٍ فريد', eid: MATE.name })); await replaceOperationalFixture(W.env, KT, S);
  const L = await get(W, dm.ck, '/api/tasks/linkage'), a = L.j.rows.find((r) => r.id === 1760000088801), b = L.j.rows.find((r) => r.id === 1760000088802);
  assert.equal(a.by, 'name'); assert.equal(a.cand, null, 'اسمٌ يحمله اثنان ⇒ لا مرشَّح');
  assert.equal(b.by, 'name'); assert.equal(b.cand.eid, MATE.eid, 'الاسمُ الفريد ⇒ مرشَّحٌ للاختيار اليدوي');
});
