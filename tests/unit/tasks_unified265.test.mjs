/* KIVO_265 — إصلاحُ المراجعة الأمنية المستقلة الموحّدة (reports/k265/reviews/review_265_unified.md · FIX FIRST: عالٍ 1 · متوسط 4 · منخفض 4)
   على العامل المولَّد بالوضعين — بياناتٌ اصطناعية وحدها (tasks_fx · TEST_ONLY). تُخفق على acf31dc أولاً (reports/k265/unified/*_on_acf31dc.txt):
     (R-1 عالٍ) تغييرُ المكلَّف بحفظٍ خامّ بعد نشاط الموظف (بدأ · أنجز · اعتذر …) — بدمج الواجهة الحقيقي (280 merge3) من نسخةٍ قديمة، وعلى النسخة
               الحالية، ونزعُه (مهمةٌ عامة بإثبات غيره) ⇒ رفضٌ مسمّى 'task-asg' والصفُّ لصاحبه بإثباته · وما يمضي كما هو: تغييرُه قبل النشاط ·
               إعادةُ الإسناد بالمسار (RC-13) · تنظيفُ حذف الموظف
     (R-2) قاعدةُ الحساب النشط (البند 4) على الحفظ الخامّ: صفٌّ جديد · تغييرُ المكلَّف · إسنادُ عامّةٍ «قبولاً نيابةً» · إلى معطَّل · إلى حسابٍ برقم الهوية
           ⇒ 'task-acct' — والصفوفُ القائمة لا تُمسّ والنشطُ يُسند إليه
     (R-3) حسابٌ مفتاحُه رقمُ الهوية لا يُعدّ «نشطاً» (كان يُسند إليه فتعلق المهمة: يراها ولا ينفّذها) — الأهليةُ acct_nid قاطعة والإنشاءُ 409 acct
     (R-4) حفظٌ من نسخةٍ قديمة لصفٍّ كتب الخادمُ عمودَه 23 بعد قراءتها (تمديدٌ ثم تغييرُ المكلَّف · حذفُ مديرٍ آخر) ⇒ تعارضٌ يُدمج لا رفضٌ 'task-x'
     (R-5) استعادةُ مدير الإدارة نسخةَ إدارته في الوضع القديم (كما في 264) — ومعها سجلُّ الموظفين — والعمودُ 23 بلا علامة استعادة يبقى للخادم
     (R-6) الربطُ اليدوي: صفٌّ مرتبطٌ برقم الهوية لا يُنقل لغير صاحبه · صفٌّ فيه نشاطٌ لا يُربط إلا بصاحب اسمه · المفتوحُ بشرط الحساب النشط
     (R-7) المراجِعُ لا يكون المكلَّفَ: إعادةُ الإسناد إليه (400) والحفظُ الخامّ ('task-rv')
     (R-8) العمودُ 23 بهوية الصفّ (13 · 14) حين تحمل الهويةُ صفّين: تبديلُ x بينهما · نزعُها بتغيير المكلَّف ⇒ رفض
     (R-9) تنبيهُ «لم تُولَّد» المخزَّن (يقرؤه أعضاءُ الإدارة) بلا حالة حساب الزميل — والتفصيلُ في ردّ التوليد لمن يملكه */
import './clock.mjs';   /* V7 P3: ساعةُ الاختبار المثبَّتة (1448-5-9) — كان يُخفق في أول الشهر الهجري وبعد تبدّل الشهر (يُستورد أولاً) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, workerUnderTest, ME, MATE, P0, KT, KE, notificationMessages, assertNotificationKVRetired, TAG, DAY, IMG_MATE, stored, putKV, addAccount, row, hij, HR, taskCommandBody, replaceOperationalFixture, operationSaveBody } from './tasks_fx.mjs';
import { MgrClient, upImg, act, reviewAndApply } from './tasks_conc_fx.mjs';
import { loadClient } from './k264_vm.mjs';

const WU = workerUnderTest();
const DM = ['0000000101', '70101'], SUP = ['0000000111', '70111'];
const NOACCT = 'tst_e_noacct', NIDACCT = 'tst_e_nidacct', NID = '1999000777', NIDUN = ['2000000377', '70377'];
const post = (W, ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body:operationSaveBody(W.env,p,taskCommandBody(W.env, p, body)) });
const get = (W, ck, p) => W.C.api(p, { cookie: ck });
const allRows = (W) => Object.values(stored(W.env, KT) || {}).flat().filter(Array.isArray);
const find = (W, id, ek) => allRows(W).find((r) => r[13] === id && (ek === undefined || r[14] === ek)) || null;
const saved = (r) => !!(r.j && r.j.revs && r.j.revs[KT]);
const deniedWhy = (r) => (r.j && r.j.denied && r.j.denied[KT] ? r.j.denied[KT].why : '');
const isConflict = (r) => !!(r.j && r.j.conflicts && r.j.conflicts[KT]);
const show = (r) => JSON.stringify(r.j || r).slice(0, 260);
async function cur(W, ck) { const g = await get(W, ck, "/api/operations/read?keys=" + encodeURIComponent(KT)); return { S: g.j.resources[KT], v: JSON.stringify(g.j.resources[KT]), rev: g.j.base[KT] }; }
async function raw(W, ck, mut, extra) { const c = await cur(W, ck); mut(c.S); return post(W, ck, '/api/save', Object.assign({ set: { [KT]: JSON.stringify(c.S) }, del: [], base: { [KT]: c.rev } }, extra || {})); }
const at = (S, k, id, ek) => (S[k] || []).findIndex((r) => Array.isArray(r) && r[13] === id && (ek === undefined || r[14] === ek));
const setCol = (S, k, id, cols, ek) => { const i = at(S, k, id, ek); assert.ok(i >= 0, 'الصفّ ' + id); const r = S[k][i].slice(); while (r.length < 15) r.push(null); for (const c in cols) r[c] = cols[c]; S[k][i] = r; };
/* دمجُ الواجهة الحقيقي (280 merge3 بهوية الصفّ — المفتاحُ يُمرَّر كما تمرّره settle) */
function mergeOf() {
  const T = loadClient({ C: { req: async () => { throw new Error('offline'); } }, boot: { srv: 1, cf: 1, v: 1, keys: {}, revs: {} } });
  const M = T.W.KIVO.__BS_SRV.merge3;
  return { merge3: (b, m, t) => M(b == null ? null : b, m, t, KT), dispose: () => T.dispose() };
}
/* موظفان اصطناعيان: بلا حساب · بحسابٍ مفتاحُه رقمُ هويته (فريد) */
async function seed(W) {
  const E = stored(W.env, KE), base = E.find((e) => e.eid === ME.eid);
  const mk = (eid, name, nid) => Object.assign({}, base, { eid, name: TAG + ' · ' + name, empno: '', nid });
  E.push(mk(NOACCT, 'بلا حساب'), mk(NIDACCT, 'حسابُه برقم الهوية', NID));
  await replaceOperationalFixture(W.env, KE, E);
  addAccount(W.env, { uid: 'tst_nidacct', un: NIDUN[0], pw: NIDUN[1], ekey: NID });
}
const setDis = (W, uid, dis) => { const U = stored(W.env, 'bassam_auth_users_v1'); U.find((u) => u.id === uid).dis = dis; putKV(W.env, 'bassam_auth_users_v1', U); };
const create = (W, ck, asg, extra) => { const s = (extra && extra.s) || Date.now() + 2 * HR; return post(W, ck, '/api/tasks/create', Object.assign({ k: hij(s), t: TAG + ' اختبارُ المراجعة الموحّدة', s, e: s + HR, asg, rv: 'none' }, extra || {}, { s })); };

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';
  const WHY = mode === 'enforce' ? { why: { [KT]: 'TEST_ONLY سببٌ كما ترسله نافذةُ السبب' } } : {};

  test(M + '(R-1 عالٍ) تغييرُ المكلَّف بعد إنجاز الموظف — بدمج الواجهة الحقيقي من نسخةٍ قديمة وعلى النسخة الحالية ونزعُه ⇒ task-asg والصفُّ لصاحبه بإثباته', async () => {
    const MG = mergeOf();
    try {
      const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), me = await W.login(ME.un, ME.pw), mate = await W.login(MATE.un, MATE.pw);
      const s = Date.now() - 10 * 60e3, c = await create(W, dm.ck, [ME.eid], { s, e: s + 3 * HR, force: true });
      assert.equal(c.status, 200, show(c)); const k = c.j.rows[0].k, id = c.j.rows[0].id;
      const Mc = new MgrClient(W, dm.ck, MG.merge3, KT, 'M'); await Mc.load();                     /* المديرُ فتح الصفحة: الصفُّ بلا نشاط */
      const img = await upImg(W, me.ck, 'u265r1');
      assert.equal((await act(W, me.ck, { k, id, act: 'start' })).status, 200);
      assert.equal((await act(W, me.ck, { k, id, act: 'submit', imgs: [img], note: TAG + ' أنجزتُها' })).status, 200);
      /* نموذجُ «تعديل المهمة» (m[14] = المختار) على نسخته القديمة — الواجهةُ تسمح (لا نشاطَ فيها) والخادمُ يحكم */
      const er = await reviewAndApply(Mc, (T) => setCol(T, k, id, { 14: MATE.eid, 8: MATE.name, 7: [MATE.name.charAt(0)] }), WHY);
      assert.ok(!er.ok && er.denied === 'task-asg', 'بالدمج الحقيقي: رفضٌ مسمّى لا كتابة — ' + JSON.stringify(er));
      const r = find(W, id);
      assert.ok(r && r[14] === ME.eid && r[3] === 'done' && r[21] && r[21].imgs.includes(img), 'الصفُّ لصاحبه بإنجازه وإثباته: ' + JSON.stringify(r && [r[14], r[3]]));
      assert.equal(allRows(W).filter((q) => q[13] === id).length, 1, 'ولا صفَّ آخرَ بالهوية نفسِها');
      const L1 = await get(W, me.ck, '/api/me/tasks'), L2 = await get(W, mate.ck, '/api/me/tasks');
      assert.ok((L1.j.rows || []).some((x) => String(x.id) === String(id)), 'يراها صاحبُها في «مهامي»');
      assert.ok(!(L2.j.rows || []).some((x) => String(x.id) === String(id)), 'ولا يراها الزميل');
      assert.equal((await get(W, mate.ck, '/api/me/tasks/img?id=' + encodeURIComponent(img))).status, 403, 'ولا يقرأ الزميلُ صورةَ إثباته (P0)');
      /* على النسخة الحالية (لا دمج): الرفضُ نفسُه — وكذلك نزعُ المكلَّف (مهمةٌ عامة بإثبات غيره) */
      const d = await raw(W, dm.ck, (S) => setCol(S, k, id, { 14: MATE.eid, 8: MATE.name }), WHY);
      assert.equal(deniedWhy(d), 'task-asg', 'النسخةُ الحالية: ' + show(d));
      const u = await raw(W, dm.ck, (S) => setCol(S, k, id, { 14: null, 8: '', 7: [] }), WHY);
      assert.equal(deniedWhy(u), 'task-asg', 'نزعُ المكلَّف بعد النشاط: ' + show(u));
      /* الاعتذارُ نشاطٌ كذلك (مهمةُ العُدّة 1760000000108 — اعتذر عنها الموظف) */
      const dc = await raw(W, dm.ck, (S) => { const kk = Object.keys(S).find((q) => at(S, q, 1760000000108) >= 0); setCol(S, kk, 1760000000108, { 14: MATE.eid }); }, WHY);
      assert.equal(deniedWhy(dc), 'task-asg', 'بعد الاعتذار: ' + show(dc));
      assert.equal(find(W, 1760000000108)[14], ME.eid);
    } finally { MG.dispose(); }
  });

  test(M + '(R-1) ما يمضي كما هو: تغييرُ المكلَّف قبل النشاط · إعادةُ الإسناد بالمسار بعده (بلا قبولٍ مستعار) · تنظيفُ حذف الموظف لصفوفه المنجزة', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), me = await W.login(ME.un, ME.pw);
    const c = await create(W, dm.ck, [ME.eid]); assert.equal(c.status, 200, show(c)); const k = c.j.rows[0].k, id = c.j.rows[0].id;
    const a = await raw(W, dm.ck, (S) => setCol(S, k, id, { 14: MATE.eid, 8: MATE.name, 7: [MATE.name.charAt(0)] }), WHY);
    assert.ok(saved(a), 'قبل النشاط يُغيَّر المكلَّفُ بالتعديل: ' + show(a)); assert.equal(find(W, id)[14], MATE.eid);
    const s = Date.now() - 10 * 60e3, c2 = await create(W, dm.ck, [ME.eid], { s, e: s + 3 * HR, force: true }); const k2 = c2.j.rows[0].k, id2 = c2.j.rows[0].id;
    assert.equal((await act(W, me.ck, { k: k2, id: id2, act: 'start' })).status, 200);
    const ra = await post(W, dm.ck, '/api/tasks/reassign', { k: k2, id: id2, from: ME.eid, to: MATE.eid, force: true });
    assert.equal(ra.status, 200, 'إعادةُ الإسناد بالمسار: ' + show(ra));
    const old = find(W, id2, ME.eid), nw = find(W, ra.j.row.id, MATE.eid);
    assert.ok(old && old[11] && old[23] && old[23].asg === 'reassigned', 'الأولُ بسجلّه وقبوله موسوماً «أُعيد إسنادها»');
    assert.ok(nw && !nw[11] && nw[3] === 'pending', 'والجديدُ بلا قبولٍ مستعار');
    /* حذفُ الموظف (عمليةٌ محمية): تنظيفُ إسناد صفوفه — ومنها منجزةٌ بإثبات — يمضي كما في 264 */
    const g = await get(W, dm.ck, "/api/operations/read?keys=" + encodeURIComponent(KT + ',' + KE));
    const E = g.j.resources[KE].filter((e) => e.eid !== MATE.eid), S = JSON.parse(JSON.stringify(g.j.resources[KT]));
    let n = 0; for (const d in S) S[d] = S[d].map((r) => { if (!Array.isArray(r) || r[14] !== MATE.eid) return r; n++; const q = r.slice(); q[7] = []; q[8] = ''; q[14] = ''; return q; });
    assert.ok(n >= 2 && Object.values(g.j.resources[KT]).flat().some((r) => r[14] === MATE.eid && r[3] === 'done'), 'للزميل صفوفٌ منها منجزة');
    const del = await post(W, dm.ck, '/api/save', Object.assign({ set: { [KE]: JSON.stringify(E), [KT]: JSON.stringify(S) }, del: [], base: { [KE]: g.j.base[KE], [KT]: g.j.base[KT] } }, mode === 'enforce' ? { why: { [KE]: 'TEST_ONLY حذفُ موظف', [KT]: 'TEST_ONLY حذفُ موظف' } } : {}));
    assert.ok(saved(del) && del.j.revs[KE], 'تنظيفُ حذف الموظف يُكتب: ' + show(del));
  });

  test(M + '(R-2) قاعدةُ الحساب النشط على الحفظ الخامّ ⇒ task-acct · والقائمُ لا يُمسّ والنشطُ يُسند إليه', async () => {
    const W = await world({ worker: WU.file, mode }); await seed(W); setDis(W, MATE.uid, 1); const dm = await W.login(...DM);
    const s = Date.now() + 2 * HR, n0 = allRows(W).length;
    const a = await raw(W, dm.ck, (S) => { S[DAY].push(row({ id: 1760000055501, title: 'صفٌّ خامٌّ جديد', eid: NOACCT, s, e: s + HR })); });
    assert.equal(deniedWhy(a), 'task-acct', '(أ) صفٌّ جديد لمن لا حسابَ له: ' + show(a)); assert.equal(allRows(W).length, n0);
    const c = await create(W, dm.ck, [ME.eid]); assert.equal(c.status, 200, show(c)); const k = c.j.rows[0].k, id = c.j.rows[0].id;
    const b = await raw(W, dm.ck, (S) => setCol(S, k, id, { 14: NOACCT, 8: TAG + ' · بلا حساب' }), WHY);
    assert.equal(deniedWhy(b), 'task-acct', '(ب) تغييرُ المكلَّف إلى من لا حسابَ له: ' + show(b)); assert.equal(find(W, id)[14], ME.eid);
    const g = await create(W, dm.ck, []); assert.equal(g.status, 200, show(g)); const gk = g.j.rows[0].k, gid = g.j.rows[0].id;
    const cc = await raw(W, dm.ck, (S) => setCol(S, gk, gid, { 11: Date.now(), 12: null, 3: 'in_progress', 7: ['ب'], 8: TAG + ' · بلا حساب', 14: NOACCT }), WHY);   /* _doAccept */
    assert.equal(deniedWhy(cc), 'task-acct', '(ج) «قبولٌ نيابةً» لعامّةٍ بإسنادها لمن لا حسابَ له: ' + show(cc));
    for (const [to, lbl] of [[MATE.eid, '(د) حسابُه معطَّل'], [NIDACCT, '(هـ) حسابُه برقم الهوية']]) {
      const r = await raw(W, dm.ck, (S) => setCol(S, k, id, { 14: to }), WHY);
      assert.equal(deniedWhy(r), 'task-acct', lbl + ': ' + show(r));
    }
    assert.equal(find(W, id)[14], ME.eid, 'لم يتغيّر شيء');
    /* القائمُ لا يُمسّ: صفوفٌ قائمةٌ لمن عُطِّل حسابُه (MATE) وتعديلٌ لا يمسّها يمضي · والإسنادُ لصاحب حسابٍ نشط يمضي */
    assert.ok(allRows(W).some((r) => r[14] === MATE.eid), 'للمعطَّل صفوفٌ قائمة');
    const t = await raw(W, dm.ck, (S) => { const q = at(S, DAY, 1760000000901); S[DAY][q] = S[DAY][q].slice(); S[DAY][q][0] = TAG + ' عامة ١ — عدّلها المدير'; }, WHY);
    assert.ok(saved(t), 'تعديلُ صفٍّ آخر يمضي: ' + show(t));
    const ok = await raw(W, dm.ck, (S) => { S[DAY].push(row({ id: 1760000055502, title: 'صفٌّ خامٌّ لصاحب حسابٍ نشط', eid: P0[2].eid, s, e: s + HR })); }, WHY);
    assert.ok(saved(ok) && find(W, 1760000055502, P0[2].eid), 'صاحبُ الحساب النشط يُسند إليه: ' + show(ok));
  });

  test(M + '(R-3) حسابٌ مفتاحُه رقمُ الهوية: الأهليةُ acct_nid قاطعةٌ بسببها والإنشاءُ وإعادةُ الإسناد 409 acct — فلا مهمةَ عالقة يراها ولا ينفّذها', async () => {
    const W = await world({ worker: WU.file, mode }); await seed(W); const dm = await W.login(...DM), s = Date.now() + 2 * HR;
    const el = await get(W, dm.ck, '/api/tasks/eligibility?ekeys=' + NIDACCT + '&s=' + s + '&e=' + (s + HR)), it = el.j.items && el.j.items[0];
    const c = await create(W, dm.ck, [NIDACCT], { force: true });
    if (c.status === 200) {                                                                                     /* لو أُسند: يجب أن ينفّذها صاحبُها */
      const nid = await W.login(...NIDUN), r = await act(W, nid.ck, { k: c.j.rows[0].k, id: c.j.rows[0].id, act: 'ack' });
      assert.equal(r.status, 200, 'أُسندت إليه فيجب أن يستطيع تنفيذها (لا 409 identity): ' + show(r));
    }
    assert.ok(it && it.hard === 1 && it.acct === 0 && it.code === 'acct_nid' && /رقم الهوية/.test(it.why), 'الأهلية: ' + JSON.stringify(it));
    assert.equal(c.status, 409, show(c)); assert.equal(c.j.err, 'acct'); assert.ok(/رقم الهوية/.test(c.j.msg || ''), 'السببُ: ' + c.j.msg);
    const c2 = await create(W, dm.ck, [ME.eid]); const ra = await post(W, dm.ck, '/api/tasks/reassign', { k: c2.j.rows[0].k, id: c2.j.rows[0].id, from: ME.eid, to: NIDACCT, force: true });
    assert.equal(ra.status, 409, 'إعادةُ الإسناد: ' + show(ra)); assert.equal(ra.j.err, 'acct');
    assert.equal(allRows(W).filter((r) => r[14] === NIDACCT || r[14] === NID).length, 0, 'لا صفَّ له');
  });

  test(M + '(R-4) نسخةٌ قديمة لصفٍّ كتب الخادمُ عمودَه 23 بعدها ⇒ تعارضٌ يُدمج لا task-x — بتغيير المكلَّف وبحذف مديرٍ آخر', async () => {
    const MG = mergeOf();
    try {
      const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), s = Date.now() + 2 * HR;
      const c = await create(W, dm.ck, [ME.eid], { s }); const k = c.j.rows[0].k, id = c.j.rows[0].id;
      const old = await cur(W, dm.ck);
      const ex = await post(W, dm.ck, '/api/tasks/extend', { k, id, ekey: ME.eid, e: s + 3 * HR }); assert.equal(ex.status, 200, show(ex));   /* مسارُ خادمٍ كتب 23 */
      const t2 = JSON.parse(old.v); setCol(t2, k, id, { 14: MATE.eid, 8: MATE.name });
      const b = await post(W, dm.ck, '/api/save', { set: { [KT]: JSON.stringify(t2) }, del: [], base: { [KT]: old.rev } });
      assert.ok(isConflict(b) && !deniedWhy(b), 'تغييرُ المكلَّف من نسخةٍ قديمة ⇒ تعارضٌ لا رفض: ' + show(b));
      const Mc = new MgrClient(W, dm.ck, MG.merge3, KT, 'M'); Mc.mem = old.v; Mc.baseVal = old.v; Mc.krev = old.rev;
      const er = await reviewAndApply(Mc, (T) => setCol(T, k, id, { 14: MATE.eid, 8: MATE.name }), WHY);
      assert.ok(er.ok, 'بالدمج يُكتب: ' + JSON.stringify(er));
      const r = find(W, id);
      assert.ok(r[14] === MATE.eid && r[16] === s + 3 * HR && r[23] && Array.isArray(r[23].ext) && r[23].ext.length === 1, 'المكلَّفُ من المدير والتمديدُ من الخادم: ' + JSON.stringify([r[14], r[16], r[23] && r[23].ext]));
      /* مديرٌ آخر حذف صفّاً أنشأه الخادم ثم يحفظ الأولُ تعديلاً لا يمسّه من نسخته القديمة */
      const c2 = await create(W, dm.ck, [ME.eid], { s }); const k2 = c2.j.rows[0].k, id2 = c2.j.rows[0].id;
      const A = new MgrClient(W, dm.ck, MG.merge3, KT, 'A'); await A.load();
      const B = new MgrClient(W, W.su.ck, MG.merge3, KT, 'B'); await B.load();
      const bd = await reviewAndApply(B, (T) => { T[k2] = T[k2].filter((q) => q[13] !== id2); if (!T[k2].length) delete T[k2]; });
      assert.ok(bd.ok, 'حذفُ B: ' + JSON.stringify(bd));
      const ae = await reviewAndApply(A, (T) => { const q = at(T, DAY, 1760000000901); T[DAY][q] = T[DAY][q].slice(); T[DAY][q][0] = TAG + ' عدّلها A'; }, WHY);
      assert.ok(ae.ok, 'تعديلُ A يُدمج ويُكتب (لا «صلاحيتك لا تشمله»): ' + JSON.stringify(ae));
      assert.equal(stored(W.env, KT)[DAY].find((q) => q[13] === 1760000000901)[0], TAG + ' عدّلها A');
      assert.equal(find(W, id2), null, 'المحذوفةُ لا تعود بالدمج');
      /* والحكمُ على النسخة الحالية باقٍ: x مزوَّرةٌ بنسخةٍ حديثة ⇒ task-x */
      const fx = await raw(W, dm.ck, (S) => { const i = at(S, k, id); const q = S[k][i].slice(); q[23] = Object.assign({}, q[23], { rv: null, dec: 0 }); S[k][i] = q; }, WHY);
      assert.equal(deniedWhy(fx), 'task-x', 'H-1 على النسخة الحالية: ' + show(fx));
    } finally { MG.dispose(); }
  });

  test(M + '(R-5) مديرُ الإدارة يستعيد نسخةَ إدارته (المهام وحدها · ومعها سجلُّ الموظفين) كما في 264 — والعمودُ 23 بلا علامة استعادة للخادم', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), s = Date.now() + 2 * HR;
    const c = await create(W, dm.ck, [ME.eid], { s }); const k = c.j.rows[0].k, id = c.j.rows[0].id;
    const snapT = JSON.stringify(stored(W.env, KT)), snapE = JSON.stringify(stored(W.env, KE));
    assert.equal((await post(W, dm.ck, '/api/tasks/cancel', { k, id, ekey: ME.eid, why: TAG + ' بعد النسخة' })).status, 200);
    const ops = (ks) => Object.fromEntries(ks.map((q) => [q, { op: 'backup.restore', scope: 'dept', mode: 'replace', reason: TAG + ' استعادة' }]));
    /* كما يرسلها bkCommit (root-logic): علامةُ backup.restore بنطاق dept + نمطُ تدقيق import */
    const aud = (ks) => ks.map((q, i) => ({ cid: 'rst' + i + Date.now().toString(36), k: q, etype: 'dataset', act: 'import', eid: q.split(':').pop(), ename: TAG }));
    const why = (ks) => Object.fromEntries(ks.map((q) => [q, TAG + ' استعادة']));
    let g = await get(W, dm.ck, "/api/operations/read?keys=" + encodeURIComponent(KT + ',' + KE));
    /* KIVO_265 · F-2/R-21 (بديلُ R-21 الموصى به — بانتظار قرار المالك): في القديم علامةُ الاستعادة لمدير النظام وحده ⇒ استعادةُ مدير الإدارة لمهام إدارته
       تُرفض (task-x — كما في acf31dc) وتمضي بيد مدير النظام؛ والإنفاذُ بسياسته كما كان (مديرُ الإدارة بمفتاح backup.restore وسببه) */
    const rs = mode === 'legacy' ? W.su : dm;
    if (mode === 'legacy') {
      const a0 = await post(W, dm.ck, '/api/save', { set: { [KT]: snapT }, del: [], base: { [KT]: g.j.base[KT] }, ops: ops([KT]), aud: aud([KT]), why: why([KT]) });
      assert.equal(deniedWhy(a0), 'task-x', 'القديم: استعادةُ مدير الإدارة للعمود 23 ⇒ task-x (F-2): ' + show(a0));
      g = await get(W, dm.ck, "/api/operations/read?keys=" + encodeURIComponent(KT + ',' + KE));
    }
    const a = await post(W, rs.ck, '/api/save', { set: { [KT]: snapT }, del: [], base: { [KT]: g.j.base[KT] }, ops: ops([KT]), aud: aud([KT]), why: why([KT]) });
    assert.ok(saved(a), '(أ) المهامُ وحدها: ' + show(a));
    assert.ok(!(find(W, id)[23] || {}).asg, 'عادت كما في النسخة (قبل الإلغاء)');
    assert.equal((await post(W, dm.ck, '/api/tasks/cancel', { k, id, ekey: ME.eid, why: TAG + ' مرةً أخرى' })).status, 200);
    const E2 = JSON.parse(snapE); E2.push({ eid: 'tst_e_restored', name: TAG + ' · من النسخة' });
    g = await get(W, dm.ck, "/api/operations/read?keys=" + encodeURIComponent(KT + ',' + KE));
    const b = await post(W, rs.ck, '/api/save', { set: { [KT]: snapT, [KE]: JSON.stringify(E2) }, del: [], base: { [KT]: g.j.base[KT], [KE]: g.j.base[KE] }, ops: ops([KT, KE]), aud: aud([KT, KE]), why: why([KT, KE]) });
    assert.ok(saved(b) && b.j.revs[KE] && b.j.atomic===1, '(ب) ومعها سجلُّ الموظفين في حفظ ذري واحد: ' + show(b));
    assert.equal(b.j.revs[KE],b.j.revs[KT],'المهام والموظفون بمراجعة واحدة');
    /* بلا علامة استعادة: H-1 كما هو لمدير الإدارة */
    const x = await raw(W, dm.ck, (S) => { const i = at(S, k, id); const q = S[k][i].slice(); q[23] = Object.assign({}, q[23], { asg: 'cancelled' }); S[k][i] = q; }, WHY);
    assert.equal(deniedWhy(x), 'task-x', 'بلا علامة استعادة: ' + show(x));
  });

  test(M + '(R-6) الربطُ اليدوي: رقمُ الهوية لصاحبه وحده · ما فيه نشاطٌ لصاحب اسمه وحده · المفتوحُ بشرط الحساب النشط', async () => {
    const W = await world({ worker: WU.file, mode }); await seed(W);
    const E = stored(W.env, KE); E.forEach((e) => { if (e.eid === MATE.eid) e.nid = '1999000555'; }); await replaceOperationalFixture(W.env, KE, E);
    const S = stored(W.env, KT), now = Date.now();
    S[DAY].push(row({ id: 1760000066601, title: 'مسندةٌ بالاسم — مفتوحة', eid: TAG + ' اسمٌ قديم', s: now + HR, e: now + 2 * HR }));
    S[DAY].push(row({ id: 1760000066602, title: 'منجزةٌ برقم الهوية', eid: '1999000555', st: 'done', acc: now - 2 * HR, fin: now - HR, s: now - 3 * HR, e: now + HR, r21: { imgs: [IMG_MATE], note: TAG + ' إثباتُ الزميل', at: now - HR } }));
    S[DAY].push(row({ id: 1760000066603, title: 'منجزةٌ باسم الزميل', eid: MATE.name, st: 'done', acc: now - 2 * HR, fin: now - HR, s: now - 3 * HR, e: now + HR, r21: { imgs: [IMG_MATE], note: TAG + ' إثباتُه', at: now - HR } }));
    await replaceOperationalFixture(W.env, KT, S);
    const dm = await W.login(...DM), rl = (id, from, to) => post(W, dm.ck, '/api/tasks/relink', { k: DAY, id, from, to });
    const a = await rl(1760000066601, TAG + ' اسمٌ قديم', NOACCT);
    assert.equal(a.status, 409, '(أ) المفتوحةُ لمن لا حسابَ له: ' + show(a)); assert.equal(a.j.err, 'acct');
    const b = await rl(1760000066602, '1999000555', ME.eid);
    assert.equal(b.status, 409, '(ب) المرتبطةُ برقم هوية الزميل لا تُنقل إلى غيره: ' + show(b));
    const me = await W.login(ME.un, ME.pw);
    assert.equal((await get(W, me.ck, '/api/me/tasks/img?id=' + encodeURIComponent(IMG_MATE))).status, 403, 'ولا يقرأ صورةَ الزميل');
    const c = await rl(1760000066603, MATE.name, ME.eid);
    assert.equal(c.status, 409, '(ج) منجزةٌ بإثبات صاحب الاسم لا تُربط بغيره: ' + show(c));
    /* ما يمضي: المفتوحةُ لصاحب حسابٍ نشط · رقمُ الهوية لصاحبه · المنجزةُ لصاحب اسمها */
    for (const [id, from, to] of [[1760000066601, TAG + ' اسمٌ قديم', ME.eid], [1760000066602, '1999000555', MATE.eid], [1760000066603, MATE.name, MATE.eid]]) {
      const r = await rl(id, from, to); assert.equal(r.status, 200, id + ' ⇒ ' + to + ': ' + show(r)); assert.equal(find(W, id)[14], to);
    }
  });

  test(M + '(R-7) المراجِعُ لا يكون المكلَّفَ: إعادةُ الإسناد إليه ⇒ 400 · والحفظُ الخامّ ⇒ task-rv', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), s = Date.now() + 2 * HR;
    const c = await post(W, dm.ck, '/api/tasks/create', { k: hij(s), t: TAG + ' بمراجِع', s, e: s + HR, asg: [ME.eid], rv: { u: 'tst_sup1' }, force: true });
    assert.equal(c.status, 200, show(c)); const k = c.j.rows[0].k, id = c.j.rows[0].id;
    assert.equal(find(W, id)[23].rv.e, 'tst_e_sup1', 'المراجِعُ المسمّى');
    const ra = await post(W, dm.ck, '/api/tasks/reassign', { k, id, from: ME.eid, to: 'tst_e_sup1', force: true });
    assert.equal(ra.status, 400, 'إعادةُ الإسناد إلى المراجِع: ' + show(ra)); assert.ok(/المراجِعُ لا يكون المكلَّفَ/.test(ra.j.msg || ''), ra.j.msg);
    const r = await raw(W, dm.ck, (S) => setCol(S, k, id, { 14: 'tst_e_sup1' }), WHY);
    assert.equal(deniedWhy(r), 'task-rv', 'الحفظُ الخامّ: ' + show(r));
    assert.equal(allRows(W).filter((q) => q[14] === 'tst_e_sup1' && q[13] === id).length, 0);
    const ok = await post(W, dm.ck, '/api/tasks/reassign', { k, id, from: ME.eid, to: MATE.eid, force: true });
    assert.equal(ok.status, 200, 'لغيره تمضي: ' + show(ok));
  });

  test(M + '(R-8) العمودُ 23 بهوية الصفّ (13 · 14) حين تحمل الهويةُ صفّين — تبديلُ x بينهما ونزعُها بتغيير المكلَّف ⇒ رفض', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), G = 1760000000110;   /* مجموعةُ العُدّة القديمة: صفّان يتشاركان 13 */
    assert.equal((await post(W, dm.ck, '/api/tasks/settings', { k: DAY, grp: 'gTST1', pol: { m: 'note' } })).status, 200);
    assert.equal((await post(W, dm.ck, '/api/tasks/cancel', { k: DAY, id: G, ekey: ME.eid, why: TAG + ' إلغاء' })).status, 200);
    const before = JSON.stringify(stored(W.env, KT)[DAY].filter((r) => r[13] === G));
    const a = await raw(W, dm.ck, (S) => { const L = S[DAY], i1 = at(S, DAY, G, ME.eid), i2 = at(S, DAY, G, MATE.eid); const x1 = L[i1][23], x2 = L[i2][23]; L[i1] = L[i1].slice(); L[i2] = L[i2].slice(); L[i1][23] = x2; L[i2][23] = x1; }, WHY);
    assert.equal(deniedWhy(a), 'task-x', '(أ) تبديلُ x: ' + show(a));
    const b = await raw(W, dm.ck, (S) => { S[DAY].forEach((r, i) => { if (r[13] === G && r[14] === MATE.eid) { const q = r.slice(0, 23); q[14] = 'tst_e_emp1'; S[DAY][i] = q; } }); }, WHY);
    assert.equal(deniedWhy(b), 'task-x', '(ب) نزعُ x بتغيير مكلَّف صفٍّ لم يبدأ: ' + show(b));
    const b2 = await raw(W, dm.ck, (S) => { S[DAY].forEach((r, i) => { if (r[13] === G && r[14] === MATE.eid) { const q = r.slice(); q[14] = 'tst_e_emp1'; S[DAY][i] = q; } }); }, WHY);
    assert.equal(deniedWhy(b2), 'task-x', '(ج) نقلُ x إلى مكلَّفٍ آخر في هويةٍ مشتركة: ' + show(b2));
    assert.equal(JSON.stringify(stored(W.env, KT)[DAY].filter((r) => r[13] === G)), before, 'لم يتغيّر شيء');
    const t = await raw(W, dm.ck, (S) => { S[DAY].forEach((r, i) => { if (r[13] === G) { const q = r.slice(); q[1] = TAG + ' وصفٌ جديد'; S[DAY][i] = q; } }); }, WHY);
    assert.ok(saved(t), 'تعديلُ الحقول المشتركة يمضي: ' + show(t));
  });

  test(M + '(R-9) تنبيهُ «لم تُولَّد» المخزَّن بلا حالة حساب الزميل — والتفصيلُ في ردّ التوليد', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    const s = Date.now() + 30 * 60e3, to = hij(s + 6 * 864e5);
    const c = await post(W, dm.ck, '/api/tasks/create', { k: hij(s), t: TAG + ' سلسلة', s, e: s + HR, asg: [ME.eid, MATE.eid], rv: 'none', force: true, rec: { t: 'daily', to } });
    assert.equal(c.status, 200, show(c));
    setDis(W, MATE.uid, 1);
    const run = await post(W, dm.ck, '/api/tasks/recur/run', {});
    assert.equal(run.status, 200, show(run));
    const sk = (run.j.skipped || []).filter((x) => x.ekey === MATE.eid);
    assert.ok(sk.length > 0 && sk.every((x) => /معطَّل/.test(x.why)), 'التفصيلُ في ردّ التوليد (لمن يقرأ الجدول — M-1): ' + JSON.stringify(sk.slice(0, 2)));
    const gen = notificationMessages(W.env).filter(message => /لم تُولَّد/.test(message.body));
    assert.ok(gen.length > 0 && gen.every(message => message.employee_targets.includes('tst_dm1') || message.employee_targets.includes('mgr:tst_d1')), 'التنبيه محفوظ لصاحب السلسلة في typed targets');
    assert.ok(gen.every(message => !/حساب|معطَّل/.test(message.body) && /غيرُ متاحٍ في موعد التنفيذ/.test(message.body)), 'التنبيه المخزن لا يحتوي حالة حساب الزميل');
    const owner = await get(W, dm.ck, '/api/notifications?dept=tst_d1'); assert.equal(owner.status, 200); assert.equal(owner.j.ok, 1);
    assert.ok(owner.j.items.some(message => /لم تُولَّد/.test(message.b)), 'صاحب السلسلة يقرأ تنبيهه من API الفعلي');
    const e3 = await W.login(P0[2].un, P0[2].pw), g = await get(W, e3.ck, '/api/notifications?dept=tst_d1'); assert.equal(g.status, 200); assert.equal(g.j.ok, 1);
    assert.ok(!g.j.items.some(message => /لم تُولَّد|حساب|معطَّل/.test(message.b)), 'الموظف الآخر لا يقرأ تنبيه صاحب السلسلة أو حالة حساب زميله'); assertNotificationKVRetired(W.env);
  });
}
