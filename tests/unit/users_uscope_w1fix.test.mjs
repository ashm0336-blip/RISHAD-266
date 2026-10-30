import { TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
/* مراجعةُ التكامل W1-R1 (عالٍ — أدخلته الموجة 1: حذفٌ صامتٌ للحسابات): usersScopeIn يعيد حسابَ عدسة الفاعل وقتَ الحفظ — فإن تغيّرت بعد أن جلب العميلُ
   القائمة (نقلُ إدارةٍ تحت عقدة مدير الفرع · منحُ صفحاتٍ تقرأ سجلَّ الموظفين) فما صار يراه ولم يُرسَل إليه يُحسب حذفاً (والجلساتُ معه) أو يُرفض الحفظُ كلُّه،
   ومراجعةُ الحسابات لا تتغيّر بنقل إدارة فيمرّ فحصُ النسخة. الإصلاح: بصمةُ العدسة (054 usersLensFp) في الإقلاع (boot.uscope) و/api/get (uscope) وكلِّ
   تعارضٍ أو رفضٍ لمفتاح الحسابات؛ يعيدها العميلُ (280 payload: uscope) فإن خالفت عدستَه الآن ⇒ تعارضٌ بالإسقاط الحالي قبل أيّ حكم، فيدمج العميلُ تعديلَه
   عليه (merge3 بالمعرّف) ويعيد. وتغيّرُ نصيبه من الإدارات/الصلاحيات يجدّد القائمةَ المُسقَطة في التبويب (280 rsRun9). على العامل الحقيقي بالوضعين:
     (أ) البصمةُ واحدةٌ في الإقلاع و/api/get ومسار الحفظ لكلّ دور · ولا بصمةَ لمدير النظام · وتتغيّر بتغيّر العدسة
     (ب) الحفظُ ببصمةٍ قديمة ⇒ تعارضٌ لا يحذف شيئاً · والمعادُ على الإسقاط الحالي يُقبل (والحفظُ بلا بصمة — تبويبٌ قديم — بلا تعارض)
     (ج) واجهةُ 280 الحقيقية (node:vm): مديرُ الفرع يجمّد موظفاً من قائمةٍ قديمة بعد نقل إدارةٍ تحت عقدته ⇒ تعارضٌ واحدٌ ثم يُقبل — صفرُ حسابٍ محذوف ·
         التجميدُ مطبَّق · لا حلقةَ تعارض؛ والموظفُ بعد منحه صفحةً تقرأ الموظفين يغيّر كلمةَ مروره من قائمته القديمة ⇒ يُقبل بلا حذفٍ ولا رفض
     (د) التبويبُ المفتوح يجدّد قائمتَه المُسقَطة حين ينتقل إلى نطاقه ما لم يكن فيه — فيُرى بلا إعادة تحميل ويمضي الحفظُ بلا تعارض
     (هـ) مراجعةُ التكامل R2-FPCHURN: إدارةٌ قراراتُها كلُّها صفرٌ لا تدخل البصمة — إنشاءُ إدارةٍ لا تمسّ عدسةَ أحدٍ لا يغيّر بصمةَ أحد (فلا تعارضَ زائدٌ
         عند الحفظ التالي) · ونقلُها تحت عقدة مدير الفرع يغيّر بصمتَه وحده · والبصمةُ واحدةٌ في الإقلاع و/api/get ومسار الحفظ بعد كلٍّ منهما */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, workerUnderTest, ME, TAG, stored, putKV, addAccount } from './tasks_fx.mjs';
import { loadClient, until, sleep } from './k264_vm.mjs';

const WU = workerUnderTest();
const K = 'bassam_auth_users_v1', KD = 'bassam_depts_v1', KP = 'bassam_perms_v1';
const P2 = (c) => 'p2$100000$' + c.repeat(32) + '$' + 'e'.repeat(64);
const ROLES = { super: [TEST_SUPER_USERNAME, TEST_SUPER_PIN], gm: ['0000000103', '70103'], dept: ['0000000131', '761310'], dm: ['0000000101', '70101'], sup: ['0000000111', '70111'], plain: [ME.un, ME.pw], emp2: ['0000000121', '70121'] };
const getList = async (W, ck) => { const g = await W.C.api('/api/get?keys=' + K, { cookie: ck }); return { L: JSON.parse(g.j.keys[K].v), rev: g.j.keys[K].rev, us: g.j.uscope }; };
const save = (W, ck, L, rev, uscope) => W.C.api('/api/save', { method: 'POST', cookie: ck, body: Object.assign({ set: { [K]: JSON.stringify(L) }, del: [], base: { [K]: rev } }, uscope === undefined ? {} : { uscope }) });
const show = (s) => JSON.stringify(s.j).slice(0, 300);
/* إدارةٌ tst_d9 خارج فرع tst_g1 بثلاثة حساباتٍ نشطة · ونقلُها تحت tst_g1 بيد مدير النظام (حفظٌ عاديّ لسجلّ الإدارات) */
function addD9(W) {
  const D0 = stored(W.env, KD); D0.push({ id: 'tst_d9', name: TAG + ' · إدارة تاسعة', gid: '' }); putKV(W.env, KD, D0);
  const P = stored(W.env, KP); P.caps.tst_d9 = P.caps.tst_d1.slice(); putKV(W.env, KP, P);
  for (let i = 1; i <= 3; i++) addAccount(W.env, { uid: 'tst_x9_' + i, un: String(2000009100 + i), pw: '7091' + i, dept: 'tst_d9', ekey: 'tst_e_x9_' + i });
}
async function moveD9(W) {
  const g = await W.C.api('/api/get?keys=' + KD, { cookie: W.su.ck });
  const DL = JSON.parse(g.j.keys[KD].v).map((d) => d.id === 'tst_d9' ? Object.assign({}, d, { gid: 'tst_g1' }) : d);
  const s = await W.C.api('/api/save', { method: 'POST', cookie: W.su.ck, body: { set: { [KD]: JSON.stringify(DL) }, del: [], base: { [KD]: g.j.keys[KD].rev } } });
  assert.ok(s.j.revs && s.j.revs[KD], 'نقلُ الإدارة: ' + show(s));
}
/* منحُ الموظف ME ورقةَ المشرف tst_sup1 (صفحاتٌ تقرأ سجلَّ موظفي إدارته) */
async function grantME(W) {
  const g = await W.C.api('/api/get?keys=' + KP, { cookie: W.su.ck }), P = JSON.parse(g.j.keys[KP].v);
  P.emps.tst_d1[ME.eid] = JSON.parse(JSON.stringify(P.emps.tst_d1.tst_e_sup1));
  const s = await W.C.api('/api/save', { method: 'POST', cookie: W.su.ck, body: { set: { [KP]: JSON.stringify(P) }, del: [], base: { [KP]: g.j.keys[KP].rev } } });
  assert.ok(s.j.revs && s.j.revs[KP], 'المنح: ' + show(s));
}
const d9n = (W) => stored(W.env, K).filter((u) => u.deptId === 'tst_d9').length;
/* إدارةٌ جديدةٌ في فرعٍ آخر (tst_g2) بلا حسابات — بيد مدير النظام (حفظٌ عاديّ لسجلّ الإدارات) */
async function addD7(W) {
  const g = await W.C.api('/api/get?keys=' + KD, { cookie: W.su.ck });
  const DL = JSON.parse(g.j.keys[KD].v).concat([{ id: 'tst_d7', name: TAG + ' · إدارة سابعة', gid: 'tst_g2' }]);
  const s = await W.C.api('/api/save', { method: 'POST', cookie: W.su.ck, body: { set: { [KD]: JSON.stringify(DL) }, del: [], base: { [KD]: g.j.keys[KD].rev } } });
  assert.ok(s.j.revs && s.j.revs[KD], 'إضافةُ الإدارة: ' + show(s));
}

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';

  test(M + '(أ) بصمةُ العدسة واحدةٌ في الإقلاع و/api/get ومسار الحفظ لكلّ دور — ولا بصمةَ لمدير النظام — وتتغيّر بتغيّر العدسة', async () => {
    const W = await world({ worker: WU.file, mode });
    addAccount(W.env, { uid: 'tst_w1dept', un: '0000000131', pw: '761310', name: TAG + ' · حساب إدارة tst_d2', dept: 'tst_d2', role: 'dept' });
    addD9(W);
    const fps = {};
    for (const [role, [u, p]] of Object.entries(ROLES)) {
      const l = await W.login(u, p), b = (await W.C.boot(l.ck)).boot, g = await getList(W, l.ck);
      const s = await save(W, l.ck, g.L, g.rev, 'stale-fp');                         /* بصمةٌ لا تطابق ⇒ التعارضُ يحمل بصمةَ مسار الحفظ */
      if (role === 'super') {
        assert.equal(b.uscope, undefined, 'مديرُ النظام: لا بصمةَ في الإقلاع'); assert.equal(g.us, undefined, 'ولا في /api/get');
        assert.ok(s.j.revs && s.j.revs[K] != null && !(s.j.conflicts || {})[K], 'ولا تعارضَ على حفظه: ' + show(s));
        continue;
      }
      const cf = (s.j.conflicts || {})[K];
      assert.ok(typeof b.uscope === 'string' && b.uscope.length > 0, role + ': بصمةٌ في الإقلاع');
      assert.equal(g.us, b.uscope, role + ': /api/get = الإقلاع');
      assert.ok(cf && cf.uscope === b.uscope, role + ': مسارُ الحفظ = الإقلاع: ' + show(s));
      assert.deepEqual(JSON.parse(cf.cur), g.L, role + ': قيمةُ التعارض إسقاطُ العدسة نفسِها');
      fps[role] = b.uscope;
    }
    assert.equal(new Set(Object.values(fps)).size, Object.keys(fps).length, 'لكلّ فاعلٍ بصمتُه: ' + JSON.stringify(fps));
    /* تتغيّر بتغيّر العدسة: نقلُ إدارةٍ تحت عقدة مدير الفرع · منحُ الموظف صفحاتٍ تقرأ الموظفين — ولا تتغيّر لمن لم تتغيّر عدستُه */
    await moveD9(W); await grantME(W);
    const now = async (role) => { const l = await W.login(ROLES[role][0], ROLES[role][1]); const b = (await W.C.boot(l.ck)).boot, g = await getList(W, l.ck); assert.equal(g.us, b.uscope, role + ': بعد التغيير'); return b.uscope; };
    assert.notEqual(await now('gm'), fps.gm, 'مديرُ الفرع: نُقلت إدارةٌ تحت عقدته');
    assert.notEqual(await now('plain'), fps.plain, 'الموظف: صار يقرأ سجلَّ موظفي إدارته');
    assert.equal(await now('dm'), fps.dm, 'مديرُ الإدارة: عدستُه كما هي');
    assert.equal(await now('emp2'), fps.emp2, 'موظفُ الإدارة الأخرى: كما هي');
  });

  test(M + '(ب) الحفظُ ببصمةٍ قديمة ⇒ تعارضٌ بالإسقاط الحالي لا يحذف شيئاً · والمعادُ عليه يُقبل', async () => {
    const W = await world({ worker: WU.file, mode });
    addD9(W);
    const gm = await W.login(ROLES.gm[0], ROLES.gm[1]), g = await getList(W, gm.ck);
    assert.equal(g.L.filter((u) => u.deptId === 'tst_d9').length, 0, 'قبل النقل: لا يرى tst_d9');
    await moveD9(W);
    const tgt = g.L.find((u) => u.id === 'tst_snop'), L2 = g.L.map((u) => u.id === tgt.id ? Object.assign({}, u, { dis: 1 }) : u);
    const s = await save(W, gm.ck, L2, g.rev, g.us), cf = (s.j.conflicts || {})[K];
    assert.ok(cf && !(s.j.revs || {})[K], 'تعارض: ' + show(s));
    assert.equal(d9n(W), 3, 'لا حسابَ محذوف');
    assert.equal(stored(W.env, K).find((u) => u.id === tgt.id).dis, 0, 'ولا كتابة');
    const fresh = JSON.parse(cf.cur);
    assert.equal(fresh.filter((u) => u.deptId === 'tst_d9').length, 3, 'الإسقاطُ الحالي يحمل حساباتِ الإدارة المنقولة');
    assert.ok(cf.uscope && cf.uscope !== g.us, 'وبصمتَه');
    const s2 = await save(W, gm.ck, fresh.map((u) => u.id === tgt.id ? Object.assign({}, u, { dis: 1 }) : u), cf.rev, cf.uscope);
    assert.ok(s2.j.revs && s2.j.revs[K], 'المعادُ يُقبل: ' + show(s2));
    assert.equal(stored(W.env, K).find((u) => u.id === tgt.id).dis, 1, 'التجميدُ مطبَّق'); assert.equal(d9n(W), 3, 'ولا حسابَ محذوف');
    /* حفظٌ بلا بصمة (تبويبٌ من قبل هذا الإصدار) على قائمةٍ حديثة: بلا تعارضٍ كما كان */
    const g3 = await getList(W, gm.ck), s3 = await save(W, gm.ck, g3.L.map((u) => u.id === tgt.id ? Object.assign({}, u, { dis: 0 }) : u), g3.rev);
    assert.ok(s3.j.revs && s3.j.revs[K], 'بلا بصمة: ' + show(s3));
  });

  test(M + '(ج) واجهةُ 280 الحقيقية: الحفظُ من قائمةٍ قديمة بعد تغيّر العدسة — تعارضٌ واحدٌ ثم يُقبل: صفرُ حسابٍ محذوف · التعديلُ مطبَّق · لا حلقة', async () => {
    const W = await world({ worker: WU.file, mode });
    addD9(W);
    const run = async (who, ck, change, edit, check) => {
      const resp = [], C2 = { req: async (p, o) => { const r = await W.C.req(p, o); if (/^\/api\/save/.test(p)) { try { resp.push(JSON.parse(await r.clone().text())); } catch (e) { resp.push(null); } } return r; } };
      const boot = (await W.C.boot(ck)).boot, T = loadClient({ C: C2, boot, jar: { cookie: ck }, blocks: ['280-server-storage.js', '440-count.js'] });
      T.W.document.hidden = true;                                                    /* بلا سحبٍ حيّ: القائمةُ في التبويب تبقى قديمة */
      try {
        await change();
        T.set(K, JSON.stringify(edit(JSON.parse(T.get(K)))));
        const S = T.W.KIVO.__BS_SRV;
        assert.ok(await until(() => T.saves().length >= 2 && !S.dirty() && !S.inflight(), 8000), who + ': حفظتان: ' + JSON.stringify(resp).slice(0, 400));
        await sleep(1200);
        const bodies = T.saves().map((x) => JSON.parse(x.body));
        assert.equal(bodies.length, 2, who + ': لا حلقةَ تعارض — حفظتان فقط');
        assert.equal(bodies[0].uscope, boot.uscope, who + ': الأولى ببصمة الإقلاع');
        assert.ok(resp[0] && resp[0].conflicts && resp[0].conflicts[K] && resp[0].conflicts[K].uscope, who + ': الأولى تعارض: ' + JSON.stringify(resp[0]).slice(0, 300));
        assert.equal(bodies[1].uscope, resp[0].conflicts[K].uscope, who + ': الثانية ببصمة الإسقاط الحالي');
        assert.ok(resp[1] && resp[1].revs && resp[1].revs[K] && !Object.keys(resp[1].denied || {}).length, who + ': الثانية قُبلت: ' + JSON.stringify(resp[1]).slice(0, 300));
        check(JSON.parse(T.get(K)));
      } finally { T.dispose(); }
    };
    /* مديرُ الفرع يجمّد موظفاً — ومديرُ النظام نقل tst_d9 تحت عقدته بعد أن جُلبت القائمة */
    const gm = await W.login(ROLES.gm[0], ROLES.gm[1]);
    await run('مديرُ الفرع', gm.ck, () => moveD9(W), (L) => L.map((u) => u.id === 'tst_snop' ? Object.assign({}, u, { dis: 1 }) : u), (mine) => {
      assert.equal(d9n(W), 3, 'صفرُ حسابٍ محذوف'); assert.equal(stored(W.env, K).find((u) => u.id === 'tst_snop').dis, 1, 'التجميدُ مطبَّق');
      assert.equal(mine.filter((u) => u.deptId === 'tst_d9').length, 3, 'والتبويبُ صار يرى حساباتِ الإدارة المنقولة');
    });
    /* الموظفُ يغيّر كلمةَ مروره — ومُنح بعد الجلب صفحاتٍ تقرأ سجلَّ موظفي إدارته (زملاؤه صاروا صفوفَ دليلٍ في عدسته) */
    const n0 = stored(W.env, K).length, me = await W.login(ME.un, ME.pw);
    await run('الموظف', me.ck, () => grantME(W), (L) => L.map((u) => u.id === ME.uid ? Object.assign({}, u, { ph: P2('7') }) : u), () => {
      assert.equal(stored(W.env, K).length, n0, 'صفرُ حسابٍ محذوف'); assert.equal(stored(W.env, K).find((u) => u.id === ME.uid).ph, P2('7'), 'كلمةُ المرور مطبَّقة');
    });
  });

  test(M + '(د) التبويبُ المفتوح يجدّد قائمتَه المُسقَطة حين تنتقل إدارةٌ إلى نطاقه — فتُرى بلا إعادة تحميل ويمضي الحفظُ بلا تعارض', async () => {
    const W = await world({ worker: WU.file, mode });
    addD9(W);
    const gm = await W.login(ROLES.gm[0], ROLES.gm[1]), boot = (await W.C.boot(gm.ck)).boot;
    const T = loadClient({ C: W.C, boot, jar: { cookie: gm.ck }, blocks: ['280-server-storage.js', '440-count.js'] });
    try {
      await sleep(1500);
      await moveD9(W);
      const seen = await until(() => JSON.parse(T.get(K)).filter((u) => u.deptId === 'tst_d9').length === 3, 8000);
      assert.ok(seen, 'حساباتُ الإدارة المنقولة وصلت التبويب بلا إعادة تحميل');
      const n0 = T.saves().length;
      T.set(K, JSON.stringify(JSON.parse(T.get(K)).map((u) => u.id === 'tst_snop' ? Object.assign({}, u, { dis: 1 }) : u)));
      const S = T.W.KIVO.__BS_SRV;
      assert.ok(await until(() => T.saves().length > n0 && !S.dirty() && !S.inflight(), 6000), 'حُفظ');
      await sleep(600);
      assert.equal(T.saves().length - n0, 1, 'حفظةٌ واحدة بلا تعارض');
      assert.equal(stored(W.env, K).find((u) => u.id === 'tst_snop').dis, 1); assert.equal(d9n(W), 3);
      assert.ok(!T.log.includes('reload'), 'بلا إعادة تحميل');
    } finally { T.dispose(); }
  });

  test(M + '(هـ) R2-FPCHURN: إنشاءُ إدارةٍ لا تمسّ عدسةَ أحدٍ لا يغيّر بصمةَ أحد · ونقلُها تحت عقدة المدير يغيّر بصمتَه وحده · والمساراتُ الثلاثة متطابقة', async () => {
    const W = await world({ worker: WU.file, mode });
    addAccount(W.env, { uid: 'tst_w1dept', un: '0000000131', pw: '761310', name: TAG + ' · حساب إدارة tst_d2', dept: 'tst_d2', role: 'dept' });
    addD9(W);
    const fp = async (role) => {
      const l = await W.login(ROLES[role][0], ROLES[role][1]), b = (await W.C.boot(l.ck)).boot, g = await getList(W, l.ck);
      const s = await save(W, l.ck, g.L, g.rev, 'stale-fp'), cf = (s.j.conflicts || {})[K];
      assert.equal(g.us, b.uscope, role + ': /api/get = الإقلاع'); assert.ok(cf && cf.uscope === b.uscope, role + ': مسارُ الحفظ = الإقلاع: ' + show(s));
      return b.uscope;
    };
    const roles = Object.keys(ROLES).filter((r) => r !== 'super'), f0 = {};
    for (const r of roles) f0[r] = await fp(r);
    await addD7(W);
    for (const r of roles) assert.equal(await fp(r), f0[r], r + ': إدارةٌ لا تمسّ عدستَه لا تغيّر بصمتَه');
    /* والحفظُ بالبصمة السابقة بعد الإنشاء يمضي بلا تعارض */
    const gm = await W.login(ROLES.gm[0], ROLES.gm[1]), g = await getList(W, gm.ck);
    const s = await save(W, gm.ck, g.L.map((u) => u.id === 'tst_snop' ? Object.assign({}, u, { dis: 1 }) : u), g.rev, f0.gm);
    assert.ok(s.j.revs && s.j.revs[K] && !(s.j.conflicts || {})[K], 'بلا تعارضٍ زائد: ' + show(s));
    await moveD9(W);
    for (const r of roles) { const f = await fp(r); if (r === 'gm') assert.notEqual(f, f0[r], 'مديرُ الفرع: نُقلت إدارةٌ تحت عقدته'); else assert.equal(f, f0[r], r + ': كما هي'); }
  });
}
