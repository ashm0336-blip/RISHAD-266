/* مراجعةُ التكامل (الجولة الثالثة) — مسارُ كتابة الحسابات bassam_auth_users_v1 على العامل الحقيقي بالوضعين (tasks_fx · TEST_ONLY):
   R3-OLDTAB-ALL (منخفض — انتقالُ النشر): تبويبٌ قديمٌ (عميلٌ لا يعرف uscope) يحفظ القائمةَ المُسقَطة التي جلبها؛ كان usersOmitsSeen لا يعدّها إسقاطاً إلا إن
     أغفلت حساباً محجوباً عن الفاعل الآن — فإن جعل تغيّرُ العدسة كلَّ المخزَّن مرئياً (نُقلت إليه آخرُ إدارةٍ محجوبة) حُذفت حساباتُها بالإغفال. الآن صفٌّ واردٌ
     هو صفُّ دليلٍ لسجلّه المخزَّن (usersDirAs) لا السجلُّ نفسُه علامةُ إسقاطٍ ثانية ⇒ الحكمُ نفسُه: رفضٌ 'users-stale-client' حين يحذف مرئياً، وتعارضٌ على
     نسخةٍ قديمة. والقائمةُ الكاملةُ القديمة والمُسقَطةُ التي لا تحذف شيئاً تمضيان كما كانتا:
     (أ) الخادم: إسقاطٌ بلا بصمة بعد تغيّرٍ يجعل الكلَّ مرئياً ⇒ رفضٌ مسمّى · صفرُ حسابٍ محذوف · سطرٌ أمنيّ — وعلى نسخةٍ قديمة تعارضٌ والمعادُ يُقبل بلا حذف
     (ب) واجهةُ 280 الحقيقية من fcac90a (قبل uscope) في node:vm: تجميدٌ وكلمةُ مرور المدير نفسِه من القائمة الكاملة ثم من المُسقَطة (بلا حذف) تُقبل ·
         وبعد النقل يُرفض الحفظُ بلا حذف ويعود التبويبُ إلى قيمة الخادم فيمضي الحفظُ التالي منها
   R3-ORDER (منخفض): بوابةُ المعرّف المكرَّر كانت قبل تعارض البصمة القديمة (W1-R1) — فحفظٌ ببصمةٍ قديمة يمسّ تكراراً قديماً مختلفَ النسخ (صارت نسختُه المحجوبة
     مرئية) يُرفض 'dup-id' زائفاً بدل التعارض. الآن التعارضُ أوّلاً (لا يكتب شيئاً) ثم البوابةُ على المعاد:
     (ج) تكرارٌ مختلفٌ صارت نسختُه المحجوبة مرئية: بصمةٌ قديمة ⇒ تعارضٌ بلا سطرٍ أمنيّ ولا كتابة · والمعادُ على قيمته يُقبل والنسختان كما هما
     (د) هجومُ المعرّف المكرَّر: ببصمةٍ حديثة رفضٌ وسطرٌ أمنيّ · وببصمةٍ قديمة تعارضٌ وحده (لا كتابة) ثم يُرفض ويُسجَّل حين يُعاد بالبصمة الحديثة
   (هـ) دوالُّ الخادم مباشرةً: usersOmitsSeen (العلامتان · والقائمةُ الكاملة وصفُّ دليلٍ بلا إغفالٍ لا يُعدّان) · وusersDupIdIn بمسحته الواحدة (كلفةُ الحالة
        الشائعة) حكمُها كما كان: بلا تكرارٍ تعود الواردةُ نصّاً · تكرارٌ في الموضع 0 من الواردة أو المخزَّن يُحكم عليه كغيره */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { world, workerUnderTest, TAG, stored, putKV, addAccount } from './tasks_fx.mjs';
import { loadClient, until, sleep } from './k264_vm.mjs';
import { ROOT } from './harness.mjs';
import { internals } from './internals.mjs';

const WU = workerUnderTest();
const K = 'bassam_auth_users_v1', KD = 'bassam_depts_v1', KP = 'bassam_perms_v1';
const GM = ['0000000103', '70103'];
const P2 = (c) => 'p2$100000$' + c.repeat(32) + '$' + 'e'.repeat(64);
const show = (s) => JSON.stringify(s.j).slice(0, 300);
const getList = async (W, ck) => { const g = await W.C.api('/api/get?keys=' + K, { cookie: ck }); return { L: JSON.parse(g.j.keys[K].v), rev: g.j.keys[K].rev, us: g.j.uscope }; };
const save = (W, ck, L, rev, uscope) => W.C.api('/api/save', { method: 'POST', cookie: ck, body: Object.assign({ set: { [K]: JSON.stringify(L) }, del: [], base: { [K]: rev } }, uscope === undefined ? {} : { uscope }) });
const ok = (s) => !!(s.j && s.j.revs && s.j.revs[K]);
const setF = (id, patch) => (L) => L.map((u) => u.id === id ? Object.assign({}, u, patch) : u);
const inDept = (W, d) => stored(W.env, K).filter((u) => u.deptId === d).length;
const sec = (W, rx) => W.env.DB.q("SELECT detail FROM sec WHERE act = 'denied' AND target = ?", K).filter((r) => rx.test(r.detail)).length;
/* العميلُ القديم كما هو: 280 من fcac90a (قبل uscope) — من تاريخ git كاختبارات KIVO_263 */
const OLD280 = (() => { try { return execFileSync('git', ['show', 'fcac90a:src/api/280-server-storage.js'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { return null; } })();

/* tst_d9 خارج فرع tst_g1 بثلاثة حسابات · وكلُّ حسابٍ آخرَ محجوبٍ عن المدير العام يُزال من المخزَّن — فبعد نقل tst_d9 تحت عقدته يرى المخزَّنَ كلَّه */
async function setupAllVisible(W) {
  const D0 = stored(W.env, KD); D0.push({ id: 'tst_d9', name: TAG + ' · d9', gid: '' }); putKV(W.env, KD, D0);
  const P = stored(W.env, KP); P.caps.tst_d9 = P.caps.tst_d1.slice(); putKV(W.env, KP, P);
  for (let i = 1; i <= 3; i++) addAccount(W.env, { uid: 'tst_x9_' + i, un: String(2000009100 + i), pw: '7091' + i, dept: 'tst_d9', ekey: 'tst_e_x9_' + i });
  const gm = await W.login(GM[0], GM[1]), seen = new Set((await getList(W, gm.ck)).L.map((u) => u.id));
  putKV(W.env, K, stored(W.env, K).filter((u) => seen.has(u.id) || u.deptId === 'tst_d9'));
  return gm;
}
async function moveD9(W) {
  const g = await W.C.api('/api/get?keys=' + KD, { cookie: W.su.ck });
  const s = await W.C.api('/api/save', { method: 'POST', cookie: W.su.ck, body: { set: { [KD]: JSON.stringify(JSON.parse(g.j.keys[KD].v).map((d) => d.id === 'tst_d9' ? Object.assign({}, d, { gid: 'tst_g1' }) : d)) }, del: [], base: { [KD]: g.j.keys[KD].rev } } });
  assert.ok(s.j.revs && s.j.revs[KD], 'نقلُ الإدارة: ' + show(s));
}
async function suUsers(W, f) {
  const a = await getList(W, W.su.ck), s = await save(W, W.su.ck, f(a.L), a.rev);
  assert.ok(ok(s), 'مديرُ النظام: ' + show(s));
}

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';

  test(M + '(أ) R3-OLDTAB-ALL: إسقاطٌ بلا بصمة بعد تغيّر عدسةٍ يجعل الكلَّ مرئياً ⇒ رفضٌ لا حذف · وعلى نسخةٍ قديمة تعارضٌ يُدمج والمعادُ يُقبل بلا حذف', async () => {
    const W = await world({ worker: WU.file, mode });
    const gm = await setupAllVisible(W), g = await getList(W, gm.ck);
    assert.equal(g.L.filter((u) => u.deptId === 'tst_d9').length, 0, 'قبل النقل: لا يرى tst_d9');
    assert.ok(g.L.some((u) => u.id === 'su' && !('un' in u)), 'وصفُّ مدير النظام صفُّ دليل (إسقاط)');
    await moveD9(W);
    const all = await getList(W, gm.ck);
    assert.equal(all.L.length, stored(W.env, K).length, 'بعد النقل: يرى المخزَّنَ كلَّه (لا محجوبَ يُغفَل)');
    const n0 = stored(W.env, K).length;
    const s = await save(W, gm.ck, setF('tst_snop', { dis: 1 })(g.L), g.rev), dn = (s.j.denied || {})[K];
    assert.ok(dn && !ok(s), 'رُفض: ' + show(s));
    assert.equal(dn.why, 'users'); assert.equal(dn.detail, 'users-stale-client', 'السببُ معلَن');
    assert.equal(inDept(W, 'tst_d9'), 3, 'صفرُ حسابٍ محذوف'); assert.equal(stored(W.env, K).length, n0);
    assert.equal(stored(W.env, K).find((u) => u.id === 'tst_snop').dis, 0, 'ولا كتابة');
    assert.equal(JSON.parse(dn.cur).filter((u) => u.deptId === 'tst_d9').length, 3, 'والقيمةُ المُعادة تحمل حساباتِ الإدارة المنقولة');
    assert.equal(sec(W, /users-stale-client/), 1, 'السجلُّ الأمنيّ');
    /* على نسخةٍ قديمة (أضاف مديرُ النظام بعدها حساباً يراه المدير) ⇒ تعارضٌ بالإسقاط الحالي · والمعادُ عليه بلا بصمة يُقبل بلا حذف */
    await suUsers(W, (L) => L.concat([{ id: 'r3_vis', un: '0000000173', ph: P2('9'), name: TAG + ' · r3', role: 'staff', deptId: 'tst_d1', ekey: 'tst_e_r3_vis', dis: 0 }]));
    const n1 = stored(W.env, K).length;
    const s2 = await save(W, gm.ck, setF('tst_snop', { dis: 1 })(g.L), g.rev), cf = (s2.j.conflicts || {})[K];
    assert.ok(cf && !(s2.j.denied || {})[K], 'تعارضٌ لا رفض: ' + show(s2));
    const s3 = await save(W, gm.ck, setF('tst_snop', { dis: 1 })(JSON.parse(cf.cur)), cf.rev);
    assert.ok(ok(s3), 'المعادُ يُقبل: ' + show(s3));
    assert.equal(stored(W.env, K).length, n1, 'لا حذف'); assert.equal(inDept(W, 'tst_d9'), 3);
    assert.equal(stored(W.env, K).find((u) => u.id === 'tst_snop').dis, 1, 'والتجميدُ مطبَّق');
  });

  test(M + '(ب) R3-OLDTAB-ALL بواجهة 280 من fcac90a: القائمةُ الكاملة والمُسقَطةُ بلا حذف تُحفظان (تجميدٌ · كلمةُ مروره) · وبعد النقل رفضٌ بلا حذف ثم يمضي الحفظُ من قيمة الخادم', { skip: OLD280 ? false : 'لا تاريخ git (fcac90a)' }, async () => {
    assert.ok(!/uscope/.test(OLD280), 'العميلُ القديم لا يعرف uscope');
    const W = await world({ worker: WU.file, mode });
    const gm = await setupAllVisible(W), boot = (await W.C.boot(gm.ck)).boot;
    /* إقلاعُ الخادم القديم: القائمةُ الكاملة بلا بصمات ولا uscope */
    boot.keys[K] = JSON.stringify(stored(W.env, K).map((u) => { const c = Object.assign({}, u); delete c.ph; return c; }));
    delete boot.uscope;
    const T = loadClient({ C: W.C, boot, jar: { cookie: gm.ck }, blocks: [] });
    try {
      vm.runInContext(OLD280, T.ctx, { filename: '280-server-storage.js@fcac90a' });
      T.run(['440-count.js']);
      T.W.document.hidden = false;
      const S = T.W.KIVO.__BS_SRV, n0 = stored(W.env, K).length, gmId = stored(W.env, K).find((u) => u.un === GM[0]).id;
      const step = async (what, f, chk) => {
        const k0 = T.saves().length;
        T.set(K, JSON.stringify(f(JSON.parse(T.get(K)))));
        assert.ok(await until(() => T.saves().length > k0 && !S.dirty() && !S.inflight(), 8000), what + ': حُسم');
        await sleep(150);
        assert.ok(chk(), what + ': ' + JSON.stringify(stored(W.env, K).find((u) => u.id === 'tst_snop')));
      };
      const fullN = JSON.parse(T.get(K)).length;
      /* القائمةُ الكاملة */
      await step('تجميدٌ من القائمة الكاملة', setF('tst_snop', { dis: 1 }), () => stored(W.env, K).find((u) => u.id === 'tst_snop').dis === 1);
      await step('كلمةُ مروره من القائمة الكاملة', setF(gmId, { ph: P2('5') }), () => stored(W.env, K).find((u) => u.id === gmId).ph === P2('5'));
      assert.equal(stored(W.env, K).length, n0, 'لا حذف');
      /* تغييرٌ في الحسابات بيد مدير النظام ⇒ يسحب التبويبُ القائمةَ المُسقَطة */
      await suUsers(W, setF('tst_emp2', { name: TAG + ' · emp2 *' }));
      assert.ok(await until(() => JSON.parse(T.get(K)).length < fullN, 8000), 'سحبُ القائمة المُسقَطة');
      await step('فكُّ التجميد من المُسقَطة', setF('tst_snop', { dis: 0 }), () => stored(W.env, K).find((u) => u.id === 'tst_snop').dis === 0);
      await step('كلمةُ مروره من المُسقَطة', setF(gmId, { ph: P2('6') }), () => stored(W.env, K).find((u) => u.id === gmId).ph === P2('6'));
      assert.equal(stored(W.env, K).length, n0, 'لا حذف');
      /* النقلُ يجعل المخزَّنَ كلَّه مرئياً ⇒ الحفظُ من المُسقَطة القديمة رفضٌ بلا حذف · ويعود التبويبُ إلى قيمة الخادم */
      await moveD9(W); await sleep(200);
      await step('تجميدٌ بعد النقل', setF('tst_snop', { dis: 1 }), () => stored(W.env, K).find((u) => u.id === 'tst_snop').dis === 0);
      assert.equal(inDept(W, 'tst_d9'), 3, 'صفرُ حسابٍ محذوف'); assert.equal(stored(W.env, K).length, n0);
      assert.equal(sec(W, /users-stale-client/), 1, 'رُفض بسببه');
      assert.equal(JSON.parse(T.get(K)).filter((u) => u.deptId === 'tst_d9').length, 3, 'التبويبُ على قيمة الخادم (فيها حساباتُ الإدارة المنقولة)');
      await step('تجميدٌ من قيمة الخادم', setF('tst_snop', { dis: 1 }), () => stored(W.env, K).find((u) => u.id === 'tst_snop').dis === 1);
      assert.equal(inDept(W, 'tst_d9'), 3); assert.equal(stored(W.env, K).length, n0);
      assert.ok(T.saves().every((x) => !JSON.parse(x.body).uscope), 'بلا بصمةٍ في أيّ حفظ (عميلٌ قديم)');
    } finally { T.dispose(); }
  });

  test(M + '(ج) R3-ORDER: تكرارٌ مختلفٌ صارت نسختُه المحجوبة مرئية — البصمةُ القديمة تعارضٌ (لا dup-id ولا كتابة) · والمعادُ على قيمته يُقبل والنسختان كما هما', async () => {
    const W = await world({ worker: WU.file, mode });
    const D0 = stored(W.env, KD); D0.push({ id: 'tst_d9', name: TAG + ' · d9', gid: '' }); putKV(W.env, KD, D0);
    const P = stored(W.env, KP); P.caps.tst_d9 = P.caps.tst_d1.slice(); putKV(W.env, KP, P);
    addAccount(W.env, { uid: 'tst_x9_1', un: '2000009101', pw: '70911', dept: 'tst_d9', ekey: 'tst_e_x9_1' });
    /* تكرارٌ قديمٌ مختلف: الأولى في tst_d9 (محجوبةٌ عن المدير العام) والثانيةُ في tst_d1 (يراها) */
    const U = stored(W.env, K), x = U.find((u) => u.id === 'tst_x9_1'); U.push(Object.assign({}, x, { deptId: 'tst_d1', name: x.name + ' (copy)' })); putKV(W.env, K, U);
    const C0 = stored(W.env, K).filter((u) => u.id === 'tst_x9_1');
    const gm = await W.login(GM[0], GM[1]), g = await getList(W, gm.ck);
    assert.equal(g.L.filter((u) => u.id === 'tst_x9_1').length, 1, 'يرى نسخةً واحدة');
    await moveD9(W);
    const s = await save(W, gm.ck, setF('tst_snop', { dis: 1 })(g.L), g.rev, g.us), cf = (s.j.conflicts || {})[K];
    assert.ok(cf && !(s.j.denied || {})[K], 'تعارضٌ لا رفض: ' + show(s));
    assert.equal(sec(W, /./), 0, 'ولا سطرَ أمنيّ'); assert.equal(stored(W.env, K).find((u) => u.id === 'tst_snop').dis, 0, 'ولا كتابة');
    assert.ok(cf.uscope && cf.uscope !== g.us, 'ببصمة العدسة الحالية');
    const fresh = JSON.parse(cf.cur); assert.equal(fresh.filter((u) => u.id === 'tst_x9_1').length, 2, 'القيمةُ الحالية تحمل النسختين');
    const s2 = await save(W, gm.ck, setF('tst_snop', { dis: 1 })(fresh), cf.rev, cf.uscope);
    assert.ok(ok(s2), 'المعادُ يُقبل: ' + show(s2));
    assert.deepEqual(stored(W.env, K).filter((u) => u.id === 'tst_x9_1'), C0, 'النسختان كما هما');
    assert.equal(stored(W.env, K).find((u) => u.id === 'tst_snop').dis, 1, 'والتجميدُ مطبَّق');
  });

  test(M + '(د) R3-ORDER: هجومُ المعرّف المكرَّر — ببصمةٍ حديثة رفضٌ وسطرٌ أمنيّ · وببصمةٍ قديمة تعارضٌ وحده ثم رفضٌ وسطرٌ حين يُعاد بالحديثة', async () => {
    const W = await world({ worker: WU.file, mode });
    const D0 = stored(W.env, KD); D0.push({ id: 'tst_d9', name: TAG + ' · d9', gid: '' }); putKV(W.env, KD, D0);
    const P = stored(W.env, KP); P.caps.tst_d9 = P.caps.tst_d1.slice(); putKV(W.env, KP, P);
    const atk = (L) => { const o = []; for (const u of L) { if (u.id === 'tst_snop') o.push(Object.assign({}, u, { role: 'super' })); o.push(u); } return o; };
    const S0 = stored(W.env, K), gm = await W.login(GM[0], GM[1]);
    let g = await getList(W, gm.ck);
    const s = await save(W, gm.ck, atk(g.L), g.rev, g.us), dn = (s.j.denied || {})[K];
    assert.ok(dn && dn.why === 'users' && dn.detail === 'dup-id', 'ببصمةٍ حديثة: رفض dup-id: ' + show(s));
    assert.equal(sec(W, /dup-id/), 1, 'وسطرٌ أمنيّ'); assert.deepEqual(stored(W.env, K), S0, 'والمخزَّنُ كما هو');
    g = await getList(W, gm.ck);
    await moveD9(W);
    const S1 = stored(W.env, K);
    const s2 = await save(W, gm.ck, atk(g.L), g.rev, g.us), cf = (s2.j.conflicts || {})[K];
    assert.ok(cf && !(s2.j.denied || {})[K], 'ببصمةٍ قديمة: تعارضٌ وحده: ' + show(s2));
    assert.equal(sec(W, /dup-id/), 1, 'بلا سطرٍ جديد'); assert.deepEqual(stored(W.env, K), S1, 'ولا كتابة');
    const s3 = await save(W, gm.ck, atk(JSON.parse(cf.cur)), cf.rev, cf.uscope), dn3 = (s3.j.denied || {})[K];
    assert.ok(dn3 && dn3.detail === 'dup-id', 'المعادُ بالبصمة الحديثة: رفض dup-id: ' + show(s3));
    assert.equal(sec(W, /dup-id/), 2, 'وسطرٌ أمنيّ'); assert.deepEqual(stored(W.env, K), S1, 'والمخزَّنُ كما هو');
    assert.equal(stored(W.env, K).find((u) => u.id === 'tst_snop').role, 'staff');
  });
}

test('(هـ) usersOmitsSeen (R3-OLDTAB-ALL) وusersDupIdIn بمسحةٍ واحدة — على دوال الخادم مباشرة', async () => {
  const I = await internals(['actorFromKeys', 'usersOmitsSeen', 'usersDupIdIn']);
  const su = { id: 'su', un: '1000000001', ph: P2('a'), name: 'TEST_ONLY su', role: 'super' };
  const dm = { id: 'dm', un: '1000000002', ph: P2('b'), name: 'TEST_ONLY dm', role: 'staff', deptId: 'd1', ekey: 'mgr:d1', mgr: true };
  const s1 = { id: 's1', un: '1000000003', ph: P2('c'), name: 'TEST_ONLY s1', role: 'staff', deptId: 'd1', ekey: 'e1', dis: 0 };
  const s2 = { id: 's2', un: '1000000004', ph: P2('d'), name: 'TEST_ONLY s2', role: 'staff', deptId: 'd1', ekey: 'e2', dis: 0 };
  const h1 = { id: 'h1', un: '1000000005', ph: P2('e'), name: 'TEST_ONLY h1', role: 'staff', deptId: 'd2', ekey: 'e3', dis: 0 };
  const keysOf = (L) => ({ [K]: JSON.stringify(L), bassam_depts_v1: JSON.stringify([{ id: 'd1', name: 'd1' }, { id: 'd2', name: 'd2' }]), bassam_gdepts_v1: '[]', bassam_perms_v1: JSON.stringify({ caps: { d1: ['emps'] } }), bassam_platform_v1: '{}' });
  const noPh = (u) => { const c = Object.assign({}, u); delete c.ph; return c; };
  const dirSu = { id: 'su', name: su.name, role: 'super' };
  /* المخزَّن كلُّه مرئيٌّ لـdm (h1 غائب): صفُّ دليلٍ لمدير النظام + إغفالُ مرئيّ ⇒ إسقاط · والقائمةُ الكاملة بالإغفال نفسِه ليست إسقاطاً */
  let cur = [su, dm, s1, s2], A = I.actorFromKeys(keysOf(cur), 'dm');
  assert.equal(I.usersOmitsSeen(JSON.stringify([dirSu, noPh(dm), noPh(s1)]), JSON.stringify(cur), A), true, 'صفُّ دليلٍ وإغفالُ مرئيّ');
  assert.equal(I.usersOmitsSeen(JSON.stringify([noPh(su), noPh(dm), noPh(s1)]), JSON.stringify(cur), A), false, 'القائمةُ الكاملة (حذفٌ صريح كما كان)');
  assert.equal(I.usersOmitsSeen(JSON.stringify([dirSu, noPh(dm), noPh(s1), noPh(s2)]), JSON.stringify(cur), A), false, 'صفُّ دليلٍ بلا إغفال');
  /* والعلامةُ الأولى كما كانت: إغفالُ محجوبٍ ومرئيٍّ معاً */
  cur = [su, dm, s1, s2, h1]; A = I.actorFromKeys(keysOf(cur), 'dm');
  assert.equal(I.usersOmitsSeen(JSON.stringify([noPh(su), noPh(dm), noPh(s1)]), JSON.stringify(cur), A), true, 'محجوبٌ ومرئيّ');
  assert.equal(I.usersOmitsSeen(JSON.stringify([dirSu, noPh(dm), noPh(s1), noPh(s2)]), JSON.stringify(cur), A), false, 'محجوبٌ وحده');
  /* usersDupIdIn: بلا تكرار ⇒ الواردةُ نصّاً · تكرارٌ في الموضع 0 */
  const inc0 = JSON.stringify([noPh(su), noPh(dm), noPh(s1)]);
  assert.equal(I.usersDupIdIn(inc0, JSON.stringify(cur), A).v, inc0, 'بلا تكرار: الواردةُ نفسُها');
  assert.equal(I.usersDupIdIn(JSON.stringify([Object.assign(noPh(s1), { role: 'super' }), noPh(s1), noPh(dm)]), JSON.stringify([s1, dm, su]), A).id, 's1', 'نسخةٌ معدَّلةٌ في الموضع 0');
  const curD = [s1, dm, su, Object.assign({}, s1, { mgr: true, ekey: 'mgr:d1' })];
  assert.equal(I.usersDupIdIn(JSON.stringify([noPh(dm), noPh(su), noPh(curD[3])]), JSON.stringify(curD), I.actorFromKeys(keysOf(curD), 'dm')).id, 's1', 'تكرارٌ مخزَّنٌ مختلفٌ أوّلُه في الموضع 0: التاليةُ وحدها رفض');
  const curS = [s1, dm, su, s1], r = I.usersDupIdIn(JSON.stringify([noPh(s1), noPh(dm), noPh(su), noPh(s1)]), JSON.stringify(curS), I.actorFromKeys(keysOf(curS), 'dm'));
  assert.ok(r.v && !r.id, 'تكرارٌ متطابقٌ أوّلُه في الموضع 0 كما وصل: يُقبل');
});
