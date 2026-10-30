/* مراجعةُ التكامل R2-OLDTAB (متوسط — انتقالُ النشر): تبويبٌ بقي مفتوحاً من قبل نشر الموجة يشغّل العميلَ القديم (لا يعرف uscope). بعد النشر يجلب مع أيّ تغييرٍ
   في الحسابات القائمةَ المُسقَطة من /api/get ولا يرسل body.uscope أبداً — و«حفظٌ بلا بصمة ⇒ السلوكُ السابق» كان يحسب ما صار يراه بعد تغيّر عدسته (إدارةٌ نُقلت
   تحت عقدته) ولم يصله حذفاً فيحذف حساباتِها بصمت (ولا إعادةَ تحميلٍ تلقائيةً عند تغيّر الإصدار). الإصلاح (الخادم 054):
     (أ) usersScopeIn/usersAsSent: صفٌّ واردٌ هو أيُّ صورةٍ أُرسل بها المخزَّن (هو · ما يراه الآن · صفُّ دليلٍ بمفتاحه أو بدونه) ⇒ لم يتغيّر فيعود المخزَّنُ حرفاً
         — فصفُّ دليلٍ وصله في عدسةٍ سابقة لا يُحكم عليه «تعديلاً يمحو حقولَه» حين صار يراه كاملاً (آمنٌ لكلّ عميل).
     (ب) حفظٌ لغير مدير النظام بلا uscope قائمتُه إسقاطٌ (تُسقط محجوباً عنه الآن) وتُسقط معه حساباً يراه الآن (تحذف بالإغفال) ⇒ رفضُ المفتاح ('users' ·
         السجلُّ الأمنيّ users-stale-client) لا حذف: يعود العميلُ القديم إلى قيمة الخادم ويعيد المستخدمُ التحميل. والقائمةُ الكاملةُ القديمة والمُسقَطةُ التي
         لا تحذف شيئاً تمضيان كما كانتا.
   على العامل الحقيقي بالوضعين (tasks_fx · TEST_ONLY):
     (أ) مديرُ الفرع بقائمةٍ مُسقَطةٍ بلا بصمة بعد نقل إدارةٍ تحت عقدته ⇒ رفضٌ مسمّى · صفرُ حسابٍ محذوف · سطرٌ أمنيّ
     (ب) الحفظُ القديمُ العاديّ يمضي: تجميدٌ بلا تغيّر عدسة · كلمةُ مرور الموظف · القائمةُ الكاملةُ القديمة بعد النقل — وحذفُ حسابٍ مرئيٍّ من قائمةٍ مُسقَطةٍ بلا بصمة رفض
     (ج) صفُّ دليلٍ (حسابُ مديرٍ عامٍّ في إدارةٍ خارج الفرع) صار يُرى كاملاً بعد النقل ⇒ يُعدّ «لم يتغيّر» فيمضي الحفظ والصفُّ المخزَّنُ حرفاً
     (د) واجهةُ 280 الحقيقية بلا بصمةٍ في أيّ جواب (= العميلُ القديم): التدفّقُ كلُّه — صفرُ حسابٍ محذوف · يعود التبويبُ إلى قيمة الخادم · وبعد إعادة التحميل يمضي التجميد
     (هـ) وعلى نسخةٍ قديمة (أُضيفت بعدها حساباتٌ يراها وأخرى محجوبة) يبقى تعارضاً يُدمج لا رفضاً — والمعادُ على قيمته يُقبل بلا حذف */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, workerUnderTest, ME, TAG, stored, putKV, addAccount } from './tasks_fx.mjs';
import { loadClient, until, sleep } from './k264_vm.mjs';

const WU = workerUnderTest();
const K = 'bassam_auth_users_v1', KD = 'bassam_depts_v1', KP = 'bassam_perms_v1';
const GM = ['0000000103', '70103'];
const P2 = (c) => 'p2$100000$' + c.repeat(32) + '$' + 'e'.repeat(64);
const show = (s) => JSON.stringify(s.j).slice(0, 300);
const getList = async (W, ck) => { const g = await W.C.api('/api/get?keys=' + K, { cookie: ck }); return { L: JSON.parse(g.j.keys[K].v), rev: g.j.keys[K].rev }; };
/* العميلُ القديم: لا uscope في جسم الحفظ */
const saveOld = (W, ck, L, rev) => W.C.api('/api/save', { method: 'POST', cookie: ck, body: { set: { [K]: JSON.stringify(L) }, del: [], base: { [K]: rev } } });
const ok = (s) => !!(s.j && s.j.revs && s.j.revs[K]);
const setDis = (id, dis) => (L) => L.map((u) => u.id === id ? Object.assign({}, u, { dis }) : u);
function addDept(W, id, n) {
  const D0 = stored(W.env, KD); D0.push({ id, name: TAG + ' · ' + id, gid: '' }); putKV(W.env, KD, D0);
  const P = stored(W.env, KP); P.caps[id] = P.caps.tst_d1.slice(); putKV(W.env, KP, P);
  for (let i = 1; i <= n; i++) addAccount(W.env, { uid: id + '_x' + i, un: String(2000009100 + i), pw: '7091' + i, dept: id, ekey: 'tst_e_' + id + '_' + i });
}
async function moveUnderGm(W, id) {
  const g = await W.C.api('/api/get?keys=' + KD, { cookie: W.su.ck });
  const s = await W.C.api('/api/save', { method: 'POST', cookie: W.su.ck, body: { set: { [KD]: JSON.stringify(JSON.parse(g.j.keys[KD].v).map((d) => d.id === id ? Object.assign({}, d, { gid: 'tst_g1' }) : d)) }, del: [], base: { [KD]: g.j.keys[KD].rev } } });
  assert.ok(s.j.revs && s.j.revs[KD], 'النقل: ' + show(s));
}
const inDept = (W, d) => stored(W.env, K).filter((u) => u.deptId === d).length;
const secStale = (W) => W.env.DB.q("SELECT detail FROM sec WHERE act = 'denied' AND target = ?", K).filter((r) => /users-stale-client/.test(r.detail)).length;

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';

  test(M + '(أ) قائمةٌ مُسقَطةٌ بلا بصمة بعد نقل إدارةٍ تحت عقدة المدير ⇒ رفضٌ مسمّى لا حذف · صفرُ حسابٍ محذوف · سطرٌ أمنيّ', async () => {
    const W = await world({ worker: WU.file, mode });
    addDept(W, 'tst_d9', 3);
    const gm = await W.login(GM[0], GM[1]), g = await getList(W, gm.ck);
    assert.equal(g.L.filter((u) => u.deptId === 'tst_d9').length, 0, 'قبل النقل: لا يرى tst_d9');
    await moveUnderGm(W, 'tst_d9');
    const s = await saveOld(W, gm.ck, setDis('tst_snop', 1)(g.L), g.rev), dn = (s.j.denied || {})[K];
    assert.ok(dn && !ok(s), 'رُفض: ' + show(s));
    assert.equal(dn.why, 'users'); assert.equal(dn.detail, 'users-stale-client', 'السببُ معلَن');
    assert.equal(inDept(W, 'tst_d9'), 3, 'صفرُ حسابٍ محذوف');
    assert.equal(stored(W.env, K).find((u) => u.id === 'tst_snop').dis, 0, 'ولا كتابة');
    assert.equal(JSON.parse(dn.cur).filter((u) => u.deptId === 'tst_d9').length, 3, 'والقيمةُ المُعادة تحمل حساباتِ الإدارة المنقولة');
    assert.equal(secStale(W), 1, 'السجلُّ الأمنيّ: users-stale-client');
  });

  test(M + '(ب) الحفظُ القديمُ العاديّ يمضي (تجميد · كلمةُ مرور الموظف · القائمةُ الكاملة القديمة بعد النقل) — وحذفُ مرئيٍّ من إسقاطٍ بلا بصمة رفض', async () => {
    const W = await world({ worker: WU.file, mode });
    addDept(W, 'tst_d9', 3);
    const gm = await W.login(GM[0], GM[1]);
    let g = await getList(W, gm.ck), s = await saveOld(W, gm.ck, setDis('tst_snop', 1)(g.L), g.rev);
    assert.ok(ok(s), 'تجميدٌ بلا تغيّر عدسة: ' + show(s)); assert.equal(stored(W.env, K).find((u) => u.id === 'tst_snop').dis, 1);
    const me = await W.login(ME.un, ME.pw), gme = await getList(W, me.ck);
    assert.ok(gme.L.length < stored(W.env, K).length, 'قائمةُ الموظف مُسقَطة');
    s = await saveOld(W, me.ck, gme.L.map((u) => u.id === ME.uid ? Object.assign({}, u, { ph: P2('7') }) : u), gme.rev);
    assert.ok(ok(s), 'كلمةُ مرور الموظف: ' + show(s)); assert.equal(stored(W.env, K).find((u) => u.id === ME.uid).ph, P2('7'));
    /* القائمةُ الكاملةُ القديمة (إقلاعُ الخادم القديم: الكلُّ بلا بصمات) بعد النقل */
    const full = stored(W.env, K).map((u) => { const c = Object.assign({}, u); delete c.ph; return c; }), rv = (await getList(W, gm.ck)).rev;
    await moveUnderGm(W, 'tst_d9');
    s = await saveOld(W, gm.ck, setDis('tst_snop', 0)(full), rv);
    assert.ok(ok(s), 'القائمةُ الكاملة القديمة بعد النقل: ' + show(s));
    assert.equal(inDept(W, 'tst_d9'), 3, 'ولا حذف'); assert.equal(stored(W.env, K).find((u) => u.id === 'tst_snop').dis, 0);
    /* حذفُ حسابٍ مرئيٍّ من قائمةٍ مُسقَطةٍ بلا بصمة: لا يُعرف أحذفه أم لم يصله ⇒ رفض */
    const n0 = stored(W.env, K).length; g = await getList(W, gm.ck);
    s = await saveOld(W, gm.ck, g.L.filter((u) => u.id !== 'tst_snop'), g.rev);
    assert.ok(!ok(s) && s.j.denied[K].detail === 'users-stale-client', 'حذفٌ بالإغفال من إسقاطٍ بلا بصمة: ' + show(s));
    assert.equal(stored(W.env, K).length, n0, 'لا حذف');
  });

  test(M + '(ج) صفُّ دليلٍ وصل في عدسةٍ سابقة وصار يُرى كاملاً ⇒ «لم يتغيّر»: يمضي الحفظ والصفُّ المخزَّنُ حرفاً', async () => {
    const W = await world({ worker: WU.file, mode });
    /* tst_d8 خارج الفرع وفيها حسابُ مديرٍ عامٍّ وحده بمفتاحٍ قديمٍ غيرِ صناعيّ (يصل مديرَ الفرع صفَّ دليلٍ بلا مفتاحٍ ولا اسمِ دخول) */
    addDept(W, 'tst_d8', 0);
    const U = stored(W.env, K); U.push({ id: 'tst_gmx', un: '0000000188', ph: P2('8'), name: TAG + ' · مدير عام قديم', role: 'gm', deptId: 'tst_d8', ekey: '2000008888', dis: 0, test: TAG }); putKV(W.env, K, U);
    const gm = await W.login(GM[0], GM[1]), g = await getList(W, gm.ck), row = g.L.find((u) => u.id === 'tst_gmx');
    assert.ok(row && !('un' in row) && !('ekey' in row), 'قبل النقل: صفُّ دليلٍ بلا اسم دخولٍ ولا مفتاح');
    await moveUnderGm(W, 'tst_d8');
    const g2 = await getList(W, gm.ck); assert.ok('un' in g2.L.find((u) => u.id === 'tst_gmx'), 'بعد النقل: يراه كاملاً');
    const before = stored(W.env, K).find((u) => u.id === 'tst_gmx');
    const s = await saveOld(W, gm.ck, setDis('tst_snop', 1)(g.L), g.rev);
    assert.ok(ok(s), 'يمضي الحفظ: ' + show(s));
    assert.deepEqual(stored(W.env, K).find((u) => u.id === 'tst_gmx'), before, 'الصفُّ المخزَّنُ حرفاً (اسمُ الدخول والمفتاحُ والبصمة)');
    assert.equal(stored(W.env, K).find((u) => u.id === 'tst_snop').dis, 1, 'والتجميدُ مطبَّق');
  });

  test(M + '(د) واجهةُ 280 بلا بصمةٍ في أيّ جواب (العميلُ القديم): صفرُ حسابٍ محذوف · يعود التبويبُ إلى قيمة الخادم · وبعد إعادة التحميل يمضي التجميد', async () => {
    const W = await world({ worker: WU.file, mode });
    addDept(W, 'tst_d9', 3);
    /* الخادمُ كما يراه العميلُ القديم: لا uscope في الإقلاع ولا في /api/get ولا في جواب الحفظ */
    const strip = (j) => { if (!j || typeof j !== 'object') return j; delete j.uscope; for (const g of ['conflicts', 'denied']) for (const k in (j[g] || {})) delete j[g][k].uscope; return j; };
    const resp = [], C2 = { req: async (p, o) => {
      const r = await W.C.req(p, o); if (!/^\/api\/(get|save)/.test(p)) return r;
      const j = strip(JSON.parse(await r.text())); if (/^\/api\/save/.test(p)) resp.push(j);
      return new Response(JSON.stringify(j), { status: r.status, headers: { 'Content-Type': 'application/json' } });
    } };
    const open = async () => { const gm = await W.login(GM[0], GM[1]), boot = (await W.C.boot(gm.ck)).boot; delete boot.uscope; return loadClient({ C: C2, boot, jar: { cookie: gm.ck }, blocks: ['280-server-storage.js', '440-count.js'] }); };
    const T = await open();
    try {
      T.W.document.hidden = false;
      /* تغييرٌ في الحسابات بيد مدير النظام ⇒ يسحب التبويبُ القائمةَ (مُسقَطة) */
      const a = await getList(W, W.su.ck);
      await W.C.api('/api/save', { method: 'POST', cookie: W.su.ck, body: { set: { [K]: JSON.stringify(a.L.map((u) => u.id === 'tst_emp2' ? Object.assign({}, u, { name: u.name + ' *' }) : u)) }, del: [], base: { [K]: a.rev } } });
      assert.ok(await until(() => JSON.parse(T.get(K)).some((u) => /\*$/.test(u.name || '')), 8000), 'سحب القائمة');
      await moveUnderGm(W, 'tst_d9'); await sleep(200);
      T.set(K, JSON.stringify(setDis('tst_snop', 1)(JSON.parse(T.get(K)))));
      const S = T.W.KIVO.__BS_SRV;
      assert.ok(await until(() => T.saves().length >= 1 && !S.dirty() && !S.inflight(), 8000), 'حُسم');
      await sleep(800);
      assert.ok(T.saves().every((x) => !JSON.parse(x.body).uscope), 'بلا بصمةٍ في أيّ حفظ (عميلٌ قديم)');
      assert.equal(inDept(W, 'tst_d9'), 3, 'صفرُ حسابٍ محذوف');
      assert.equal(resp[resp.length - 1].denied[K].detail, 'users-stale-client', 'رُفض بسببه');
      assert.equal(T.get(K), resp[resp.length - 1].denied[K].cur, 'التبويبُ على قيمة الخادم');
      assert.equal(T.saves().length, 1, 'ولا إعادة');
    } finally { T.dispose(); }
    /* «إعادةُ التحميل»: تبويبٌ جديد (ما زال عميلاً قديماً) قائمتُه من إقلاعٍ حديث ⇒ التجميدُ يمضي */
    const T2 = await open();
    try {
      T2.set(K, JSON.stringify(setDis('tst_snop', 1)(JSON.parse(T2.get(K)))));
      const S2 = T2.W.KIVO.__BS_SRV;
      assert.ok(await until(() => T2.saves().length >= 1 && !S2.dirty() && !S2.inflight(), 8000), 'حُسم');
      assert.ok(resp[resp.length - 1].revs && resp[resp.length - 1].revs[K], 'قُبل: ' + JSON.stringify(resp[resp.length - 1]).slice(0, 200));
      assert.equal(stored(W.env, K).find((u) => u.id === 'tst_snop').dis, 1, 'التجميدُ مطبَّق'); assert.equal(inDept(W, 'tst_d9'), 3);
    } finally { T2.dispose(); }
  });

  test(M + '(هـ) قائمةٌ قديمةٌ بلا بصمة على نسخةٍ قديمة (حساباتٌ جديدةٌ مرئيةٌ ومحجوبة بعدها) ⇒ تعارضٌ يُدمج لا رفض · والمعادُ يُقبل بلا حذف', async () => {
    const W = await world({ worker: WU.file, mode });
    const gm = await W.login(GM[0], GM[1]), rv = (await getList(W, gm.ck)).rev;
    const full = stored(W.env, K).map((u) => { const c = Object.assign({}, u); delete c.ph; return c; });   /* إقلاعُ الخادم القديم */
    const a = await getList(W, W.su.ck), add = [['w1r2_vis', 'tst_d1', '0000000171'], ['w1r2_hid', 'tst_d3', '0000000172']].map(([id, d, un]) => ({ id, un, ph: P2('9'), name: TAG + ' · ' + id, role: 'staff', deptId: d, ekey: 'tst_e_' + id, dis: 0 }));
    const sa = await W.C.api('/api/save', { method: 'POST', cookie: W.su.ck, body: { set: { [K]: JSON.stringify(a.L.concat(add)) }, del: [], base: { [K]: a.rev } } });
    assert.ok(sa.j.revs && sa.j.revs[K], 'مديرُ النظام يضيف: ' + show(sa));
    const n0 = stored(W.env, K).length;
    const s = await saveOld(W, gm.ck, setDis('tst_snop', 1)(full), rv), cf = (s.j.conflicts || {})[K];
    assert.ok(cf && !(s.j.denied || {})[K], 'تعارضٌ لا رفض: ' + show(s));
    const fresh = JSON.parse(cf.cur); assert.ok(fresh.some((u) => u.id === 'w1r2_vis') && !fresh.some((u) => u.id === 'w1r2_hid'), 'قيمتُه الإسقاطُ الحالي');
    const s2 = await saveOld(W, gm.ck, setDis('tst_snop', 1)(fresh), cf.rev);
    assert.ok(ok(s2), 'المعادُ يُقبل: ' + show(s2));
    assert.equal(stored(W.env, K).length, n0, 'لا حذف'); assert.equal(stored(W.env, K).find((u) => u.id === 'tst_snop').dis, 1);
  });
}
