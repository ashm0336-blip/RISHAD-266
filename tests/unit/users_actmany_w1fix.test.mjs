/* SOT-079 · SOT-110: جزء محلي من الإدارة الذاتية والتكامل: واجهتا الحسابات والتخزين الحقيقيتان مع Worker وSQLite
   لتفعيل دفعة موظفين ورفض التصادم وإظهار سببه دون تدخل منشئ المنصة. لا يثبت قبول التشغيل اليومي كاملًا، ولا تكامل Cloudflare/D1 الفعلي.
   مراجعةُ التكامل W1-R2 (متوسط — أدخلته الموجة 1: تفعيلُ الدفعة يتعطّل): activateStaffMany/activateStaff (330) يفحصان تصادمَ اسم الدخول على rawUsers() —
   وصارت إسقاطاً (لا هويةَ ولا جوالَ لحسابٍ لا يديره المدير). فموظفٌ هويتُه أو جوالُه اسمُ دخولِ حسابٍ محجوب لا يُتخطّى في الواجهة، ويرفض الخادمُ
   (usersDupNew) مفتاحَ الحسابات كلَّه: لا يُحفظ أيٌّ من التفعيلات الـN، وتُعاد القيمةُ برسالةٍ عامّة، ويعيد التفعيلُ التلقائيُّ المحاولةَ مع كلّ حفظٍ للموظفين
   بلا اسم. الإصلاح: الخادمُ يسمّي صفوفَ الفاعل المخالفة (054 usersDupIds · denied.dup — من قائمته هو وحده) · الواجهةُ (280 settle) تُسقطها وحدها وتعيد إرسالَ
   الباقي برسالةٍ واحدةٍ تسمّيهم · وتذكرهم 330 للجلسة (dupNote) فيُتخطّون بسببٍ مسمّى بلا إعادة محاولة. على العامل الحقيقي بالوضعين (tasks_fx · TEST_ONLY):
     (أ) الخادم: رفضُ دفعةٍ فيها صفٌّ مصادم يحمل dup = [معرّفُه] وحده — لا معرّفَ الحساب المحجوب · والمخزَّنُ كما هو
     (ب) واجهتا 280 و330 الحقيقيتان (node:vm): دفعةٌ من ثلاثة أحدُهم مصادم ⇒ يُفعَّل الاثنان · يُسمّى الثالثُ برسالةٍ واحدة · والحفظُ التالي للموظفين يتخطّاه
         بسببه بلا طلب حفظ؛ وتفعيلُه منفرداً يُرفض في الواجهة · ورفضٌ بلا dup (حسابٌ في إدارةٍ لا يديرها) يبقى كما كان: القيمةُ كلُّها تعود */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, workerUnderTest, D, TAG, stored } from './tasks_fx.mjs';
import { loadClient, until, sleep, pageText } from './k264_vm.mjs';

const WU = workerUnderTest();
const K = 'bassam_auth_users_v1';
const DM = { un: '0000000101', pw: '70101', uid: 'tst_dm1' };
const P2 = (c) => 'p2$100000$' + c.repeat(32) + '$' + 'e'.repeat(64);
const MSG = 'رقم الهوية أو الجوال مستخدمٌ في حسابٍ آخر';

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';

  test(M + '(أ) الخادم: رفضُ الدفعة يسمّي صفَّ الفاعل المصادم وحده (dup) — لا الحسابَ المحجوب — والمخزَّنُ كما هو', async () => {
    const W = await world({ worker: WU.file, mode });
    const dm = await W.login(DM.un, DM.pw), S0 = stored(W.env, K), far = S0.find((u) => u.id === 'tst_emp2');
    const g = await W.C.api('/api/get?keys=' + K, { cookie: dm.ck }), L = JSON.parse(g.j.keys[K].v);
    assert.ok(!L.some((u) => u.id === far.id), 'المديرُ لا يرى tst_emp2');
    const row = (id, un, alt, n) => ({ id, un, alt, ph: P2('f'), role: 'staff', deptId: D, ekey: 'tst_e_am' + n, name: TAG + ' · تفعيل ' + n, dis: 0 });
    const rows = [row('w1am_a' + mode, far.un, '', 'a'), row('w1am_b' + mode, '0000000991', '0500000991', 'b'), row('w1am_c' + mode, '0000000992', '', 'c')];
    const s = await W.C.api('/api/save', { method: 'POST', cookie: dm.ck, body: { set: { [K]: JSON.stringify(L.concat(rows)) }, del: [], base: { [K]: g.j.keys[K].rev }, uscope: g.j.uscope } });
    const dn = (s.j.denied || {})[K];
    assert.ok(dn && dn.why === 'users', 'رُفض: ' + JSON.stringify(s.j).slice(0, 300));
    assert.deepEqual(dn.dup, [rows[0].id], 'الصفُّ المصادمُ وحده');
    assert.ok(!dn.dup.includes(far.id) && !JSON.parse(dn.cur).some((u) => u.id === far.id), 'لا شيءَ من الحساب المحجوب: ' + JSON.stringify(dn.dup));
    assert.ok(typeof dn.uscope === 'string' && dn.uscope === g.j.uscope, 'والرفضُ يحمل بصمةَ العدسة (W1-R1)');
    assert.deepEqual(stored(W.env, K), S0, 'المخزَّنُ كما هو');
  });

  test(M + '(ب) واجهتا 280 و330: دفعةٌ من ثلاثة أحدُهم مصادمٌ لحسابٍ محجوب ⇒ يُفعَّل الاثنان ويُسمّى الثالث · ولا إعادةَ محاولةٍ في الحفظ التالي', async () => {
    const W = await world({ worker: WU.file, mode });
    const dm = await W.login(DM.un, DM.pw), far = stored(W.env, K).find((u) => u.id === 'tst_emp2');
    const boot = (await W.C.boot(dm.ck)).boot, now = Date.now();
    const T = loadClient({ C: W.C, boot, jar: { cookie: dm.ck }, blocks: ['280-server-storage.js', '310-image-refs.js', '320-dept-storage.js', '330-auth.js', '332-find-day.js', '440-count.js'] });
    T.W.localStorage.setItem('bassam_session_v1', JSON.stringify({ uid: DM.uid, ts: now, la: now, mc: 0 }));
    T.W.document.hidden = true;
    const I = T.W.KIVO.__BS_I.auth;
    /* كما يفعل 334 في الصفحة: تغيّرُ مفتاح الحسابات من الخادم يُسقط ذاكرةَ 330 */
    T.W.addEventListener('bassam:store', (e) => { if (e && e.detail && e.detail.key === K) I._bustUsers(); });
    const S = T.W.KIVO.__BS_SRV, settled = () => until(() => !S.dirty() && !S.inflight(), 8000);
    const items = [{ ekey: 'tst_e_am_a', nid: far.un, phone: '', empno: '81001', name: TAG + ' · مصادم' },
                   { ekey: 'tst_e_am_b', nid: '0000000993', phone: '0500000993', empno: '81002', name: TAG + ' · سليم ب' },
                   { ekey: 'tst_e_am_c', nid: '', phone: '0500000994', empno: '81003', name: TAG + ' · سليم ج' }];
    try {
      const r = await I.activateStaffMany(items, D);
      assert.equal(r.n, 3, 'الواجهةُ لا ترى التصادم (الإسقاط): ' + JSON.stringify(r));
      assert.ok(await until(() => T.saves().length >= 2, 8000) && await settled(), 'أُرسلت ثم أُعيد الباقي');
      await sleep(400);
      const st = stored(W.env, K), has = (ek) => st.some((u) => u.deptId === D && u.ekey === ek && !u.dis);
      assert.ok(has('tst_e_am_b') && has('tst_e_am_c'), 'فُعِّل الاثنان');
      assert.ok(!has('tst_e_am_a'), 'ولم يُفعَّل المصادم');
      assert.equal(st.filter((u) => String(u.un) === String(far.un)).length, 1, 'ولا اسمَ دخولٍ مكرَّر');
      const txt = pageText(T.W);
      assert.ok(txt.includes('«' + TAG + ' · مصادم»') && txt.includes(MSG) && txt.includes('لم يُفعَّل حسابه'), 'رسالةٌ تسمّيه بسببه: ' + txt.slice(-400));
      assert.ok(!txt.includes('«' + TAG + ' · سليم ب»'), 'ولا تسمّي غيرَه');
      const L = JSON.parse(T.get(K));
      assert.ok(L.some((u) => u.ekey === 'tst_e_am_b') && !L.some((u) => u.ekey === 'tst_e_am_a'), 'والتبويبُ كالخادم');
      /* الحفظُ التالي لسجلّ الموظفين: التفعيلُ التلقائيُّ يعيد من بلا حساب ⇒ يُتخطّى المصادمُ بسببه بلا طلب حفظ */
      const n0 = T.saves().length, ready = items.filter((o) => !I.staffMap(D)[o.ekey]);
      assert.deepEqual(ready.map((o) => o.ekey), ['tst_e_am_a'], 'بلا حسابٍ: المصادمُ وحده');
      const r2 = await I.activateStaffMany(ready, D);
      assert.equal(r2.n, 0, 'لا تفعيل'); assert.equal(r2.skipped.length, 1); assert.ok(/مصادم/.test(r2.skipped[0]) && /مستخدم في حساب آخر/.test(r2.skipped[0]), 'يُتخطّى باسمه وسببه: ' + JSON.stringify(r2));
      await sleep(300);
      assert.equal(T.saves().length, n0, 'ولا طلبَ حفظ');
      const r3 = await I.activateStaff({ ekey: 'tst_e_am_a', deptId: D, nid: far.un, phone: '', empno: '81001', name: TAG + ' · مصادم' });
      assert.equal(r3.ok, false, 'منفرداً: يُرفض في الواجهة'); assert.ok(/مستخدم في حساب آخر/.test(r3.err));
      /* رفضٌ بلا dup (حسابٌ في إدارةٍ لا يديرها) يبقى كما كان: القيمةُ كلُّها تعود */
      const before = T.get(K);
      T.set(K, JSON.stringify(JSON.parse(before).concat([{ id: 'w1am_x' + mode, un: '0000000995', ph: P2('a'), role: 'staff', deptId: 'tst_d2', ekey: 'tst_e_am_x', name: TAG + ' · خارج', dis: 0 }])));
      assert.ok(await until(() => T.saves().length > n0, 6000) && await settled(), 'أُرسل');
      await sleep(200);
      const srv = (await W.C.api('/api/get?keys=' + K, { cookie: dm.ck })).j.keys[K].v;
      assert.equal(T.get(K), srv, 'عادت القيمةُ كلُّها كما في الخادم');
      assert.ok(!JSON.parse(T.get(K)).some((u) => u.ekey === 'tst_e_am_x'), 'بلا الصفّ المرفوض');
      assert.ok(pageText(T.W).includes('لم يُحفظ تعديلك على'), 'برسالة الرفض العامّة كما كانت');
    } finally { T.dispose(); }
  });

  test(M + '(ج) واجهةُ 280: صفٌّ قائمٌ مخالفٌ (إعادةُ تفعيل حسابٍ مجمَّد باسم دخولٍ مصادم) يعود إلى نسخة الأساس — وبقيةُ الحفظة نفسِها تُكتب', async () => {
    const W = await world({ worker: WU.file, mode });
    const dm = await W.login(DM.un, DM.pw), far = stored(W.env, K).find((u) => u.id === 'tst_emp2');
    const g = await W.C.api('/api/get?keys=' + K, { cookie: dm.ck });
    const s0 = await W.C.api('/api/save', { method: 'POST', cookie: dm.ck, body: { set: { [K]: JSON.stringify(JSON.parse(g.j.keys[K].v).map((u) => u.id === 'tst_snop' ? Object.assign({}, u, { dis: 1 }) : u)) }, del: [], base: { [K]: g.j.keys[K].rev } } });
    assert.ok(s0.j.revs && s0.j.revs[K], 'التجميدُ أولاً');
    const snop0 = stored(W.env, K).find((u) => u.id === 'tst_snop');
    const T = loadClient({ C: W.C, boot: (await W.C.boot(dm.ck)).boot, jar: { cookie: dm.ck }, blocks: ['280-server-storage.js', '440-count.js'] });
    T.W.document.hidden = true;
    const S = T.W.KIVO.__BS_SRV;
    try {
      /* حفظةٌ واحدة: إعادةُ تفعيل tst_snop باسم دخول حسابٍ لا يراه · وتجميدُ tst_fld */
      T.set(K, JSON.stringify(JSON.parse(T.get(K)).map((u) => u.id === 'tst_snop' ? Object.assign({}, u, { un: far.un, ph: P2('b'), dis: 0 }) : u.id === 'tst_fld' ? Object.assign({}, u, { dis: 1 }) : u)));
      assert.ok(await until(() => T.saves().length >= 2 && !S.dirty() && !S.inflight(), 8000), 'رُفضت ثم أُعيد الباقي');
      await sleep(300);
      const st = stored(W.env, K);
      assert.equal(st.find((u) => u.id === 'tst_fld').dis, 1, 'بقيةُ الحفظة كُتبت');
      assert.deepEqual(st.find((u) => u.id === 'tst_snop'), snop0, 'والمخالفُ كما في الخادم (مجمَّداً باسم دخوله)');
      assert.equal(JSON.parse(T.get(K)).find((u) => u.id === 'tst_snop').un, snop0.un, 'والتبويبُ كالخادم');
      const txt = pageText(T.W);
      assert.ok(txt.includes(MSG) && txt.includes('لم يُفعَّل حسابه'), 'رسالةُ التفعيل: ' + txt.slice(-300));
      assert.equal(T.saves().length, 2, 'بلا حلقة');
    } finally { T.dispose(); }
  });
}
