/* V7 · د6 (أ1 — قرار المالك): «ما يراه حامل» من مصدرٍ واحد — KIVO.BassamPerm.seenBy (334) = menuFor على صلاحيات الحامل.
   هيكلٌ مصطنع (TEST_ONLY — v7_d6_holders_fx) والواجهةُ الحقيقية لكل حساب تُقلع من العامل الحقيقي بجلسته، في الحالات الأربع
   (كلُّ الأنظمة مفعّلة · كلُّها مطفأة لإدارة · واحدٌ مطفأ لإدارة · واحدٌ مطفأ على المنصة) المبنيّة بحفظٍ حقيقي عبر العامل، ولكل حامل:
     مديرُ المنصة خارج مساحة الإدارة وداخلها · مديرُ القطاع · حسابُ الإدارة · مديرُ الإدارة بالشارة · مديرُ القسم · موظفٌ بدورٍ مخصّص · موظفٌ بلا دور
     · موظفٌ باستثناءٍ مؤقت.
   يُثبت أنّ العروضَ الأربعة قائمةٌ واحدة تساوي مصدرَ القائمة الجانبية الفعلية:
     ① القائمةُ الجانبية (جلسةُ الحساب — مفاتيحُ الخادم)  ② «ما يراه مدير هذه الإدارة» (p44NavOf)  ③ «ماذا يرى حامل الدور» (_p44Menu على مفاتيح الدور)
     ④ «ما يراه الآن» للشخص (_p44Menu: المحفوظ، ومن مسودة المحرّر) — ②③④ دوالُّ الصفحة نفسُها (logic-perm44.js) من حساب مدير المنصة،
   وأنّ «اختبار الوصول» (جوابُ الخادم /api/perm44/check) يطابق مفاتيحَ الدور التي بُنيت منها القائمة، وأنّ اشتقاقَ الواجهة لشخصٍ بعينه
   يساوي جوابَ الخادم لحسابه (قائمتُه في جلسته هو). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { needs } from './harness.mjs';
import { holdersWorld, clientOf, permViews, applyState, seedRoles, namesOf, STATES, OFF_ONE, OFF_PLAT, ROLE_DOC, ACC, A, B, A_S1, E_ROLE, E_NONE, E_EX } from './v7_d6_holders_fx.mjs';
import { assertOneSource } from '../support/one_menu.mjs';

const SYS = ['tasks', 'staff', 'irshad', 'daily', 'award'];
const PERMANENT = ['profile', 'emps', 'admin'];

test('V7 · د6 · أ1 — one source for «what a holder sees»: sidebar · manager card · role view · person view are the same list, for every holder kind in the four states; the server agrees', Object.assign({ timeout: 900000 }, needs(...SYS)), async () => {
  const W = await holdersWorld();
  /* مفاتيحُ الاستثناء: سارٍ من «المهام» ومنتهٍ من «جائزة التميز» */
  const c0 = await clientOf(W, 'su', A);
  const exKey = { live: c0.ev('KIVO.Perm44.keysFor("tasks", "view")')[0], gone: c0.ev('KIVO.Perm44.keysFor("award", "view")')[0] };
  const sensitive = c0.ev('[].concat.apply([], Object.keys(' + JSON.stringify(ROLE_DOC.sys) + ').map(function (s) { return KIVO.Perm44.keysFor(s, "sensitive"); }))');
  c0.dispose();
  assert.ok(exKey.live && exKey.gone && sensitive.length > 10, 'engine keys');
  await applyState(W, 'allOn');
  await seedRoles(W, exKey);

  const seenIn = {};   /* state → who → list — للمقارنة بين الحالات */
  for (const st of STATES) {
    await applyState(W, st);
    const L = '[' + st + '] ';
    const su = await clientOf(W, 'su', A), V = permViews(su), roles = [ROLE_DOC];
    const session = async (who, did) => { const c = await clientOf(W, who, did); try { const s = c.seen(), b = c.sidebar(); assert.deepEqual(s, b, L + who + '@' + did + ': seenBy(session) = the sidebar source (menuFor())'); return s; } finally { c.dispose(); } };
    try {
      const out = seenIn[st] = {};
      /* ── مديرُ المنصة: خارج مساحة الإدارة (في ب) وداخلها (في أ) ── */
      out.suOut = await session('su', B); out.suIn = await session('su', A);
      /* ── المديرون: القائمةُ الجانبية = بطاقةُ «ما يراه مدير هذه الإدارة» = «ما يراه الآن» لحسابه ── */
      const mgrA = V.mgrCard(A), mgrS1 = V.mgrCard(A_S1);
      assert.deepEqual(mgrA, su.seen({ kind: 'mgr', did: A }), L + 'the card is seenBy(mgr)');
      out.gm = await session('gm', A); out.dept = await session('dept', A); out.mgr = await session('mgr', A); out.sec = await session('sec', A_S1);
      assertOneSource(assert, { 'sidebar · sector manager in A': out.gm, 'sidebar · department account': out.dept, 'sidebar · badge manager': out.mgr, 'manager card of A': mgrA,
        'person view · badge manager (saved)': su.seen({ kind: 'person', did: A, ekey: ACC.mgr.ekey, mgr: true }) }, L + 'department managers');
      assert.deepEqual(V.personNames({ ekey: ACC.mgr.ekey, mgr: 1 }, A, null, roles), namesOf(su, mgrA), L + '«ما يراه الآن» of the manager account shows his real list');
      assertOneSource(assert, { 'sidebar · section manager': out.sec, 'manager card of the section': mgrS1, 'person view · section manager': su.seen({ kind: 'person', did: A_S1, ekey: ACC.sec.ekey, mgr: true }) }, L + 'section manager');
      /* ── موظفٌ بدورٍ مخصّص: القائمةُ الجانبية = «ماذا يرى حامل الدور» = «ما يراه الآن» (المحفوظ · ومن المسودة) ── */
      const rk = V.roleKeys(ROLE_DOC, A);
      out.role = await session('role', A);
      assertOneSource(assert, { 'sidebar · employee with the role': out.role, 'role view': su.seen({ kind: 'role', did: A, keys: rk }), 'person view (saved)': su.seen({ kind: 'person', did: A, ekey: E_ROLE }),
        'person view (editor draft)': su.seen({ kind: 'person', did: A, ekey: E_ROLE, keys: su.ev('KIVO.Perm44.effective(' + JSON.stringify({ role: ROLE_DOC.id, ex: [] }) + ', ' + JSON.stringify({ roles }) + ', KIVO.Perm44.ceiling(' + JSON.stringify(A) + ').key).keys') }) }, L + 'custom role');
      assert.deepEqual(V.roleNames(ROLE_DOC, A), namesOf(su, out.role), L + '«ماذا يرى حامل الدور» lists his real menu');
      assert.deepEqual(su.seen({ kind: 'role', did: A, keys: su.ev('KIVO.Perm44.compileRole(' + JSON.stringify(ROLE_DOC) + ')') }), out.role, L + 'keys outside the ceiling open nothing: the function itself cuts by the unit ceiling');
      assert.deepEqual(V.personNames({ ekey: E_ROLE }, A, { role: ROLE_DOC.id, ex: [] }, roles), namesOf(su, out.role), L + '«ما يراه الآن» lists his real menu');
      /* ── موظفٌ بلا دور ── */
      out.none = await session('none', A);
      assertOneSource(assert, { 'sidebar · employee without a role': out.none, 'person view (saved)': su.seen({ kind: 'person', did: A, ekey: E_NONE }), 'role view of an empty role': su.seen({ kind: 'role', did: A, keys: [] }) }, L + 'no role');
      assert.deepEqual(out.none, ['profile'], L + 'no role ⇒ «صفحتي» alone');
      assert.deepEqual(V.personNames({ ekey: E_NONE }, A, null, roles), ['صفحتي'], L + 'person view of no role');
      /* ── استثناءٌ مؤقت: السارِي يُرى والمنتهي لا — والخادمُ يوافق ── */
      out.ex = await session('ex', A);
      assertOneSource(assert, { 'sidebar · employee with a live exception': out.ex, 'person view (saved)': su.seen({ kind: 'person', did: A, ekey: E_EX }) }, L + 'temporary exception');
      assert.ok(!out.ex.includes('award'), L + 'an expired exception shows nothing');
      /* ── «اختبار الوصول»: جوابُ الخادم لكل مفتاح = مفاتيحُ الدور التي بُنيت منها القائمة · والأنظمةُ المشغَّلة واحدة ── */
      const srvOn = (await W.C.api('/api/perm44/check?d=' + A + '&role=' + ROLE_DOC.id + '&key=' + encodeURIComponent(sensitive[0]), { cookie: W.ck.su })).j.on;
      assert.deepEqual(su.ev('KIVO.Perm44.ceiling(' + JSON.stringify(A) + ').on').slice().sort(), srvOn.slice().sort(), L + 'systems ON by inheritance: client = server');
      for (const k of sensitive) {
        const r = await W.C.api('/api/perm44/check?d=' + A + '&role=' + ROLE_DOC.id + '&key=' + encodeURIComponent(k), { cookie: W.ck.su });
        assert.equal(r.status, 200); assert.equal(r.j.allow, rk.includes(k), L + 'access test «' + k + '»: server ' + r.j.allow + ' (' + r.j.why + ') vs the role keys');
      }
      for (const [ek, who] of [[E_ROLE, 'role'], [E_EX, 'ex']]) {
        const mine = su.ev('KIVO.BassamPerm.holderPerms(' + JSON.stringify({ kind: 'person', did: A, ekey: ek }) + ')');
        const c = await clientOf(W, who, A); try { assert.deepEqual(mine, c.ev('KIVO.BassamPerm.myPerms()'), L + who + ': the permissions derived for the person = his own session (server keys)'); } finally { c.dispose(); }
      }
      /* ── القواعد ── */
      for (const who of Object.keys(out)) for (const k of out[who]) assert.ok(su.ev('KIVO.BassamPerm.menuFor().map(function (x) { return x.k; })').concat(['profile']).includes(k), L + who + ': only menu keys');
      if (st === 'allOn') {
        for (const who of ['suOut', 'suIn', 'gm', 'dept', 'mgr', 'sec']) assert.deepEqual(out[who], ['profile', 'kpis', 'dstats', 'emps', 'planning', 'daily', 'irshad', 'seized', 'award', 'links', 'help', 'admin'], L + who + ' sees the whole menu');
        assert.deepEqual(out.role, ['profile', 'kpis', 'dstats', 'planning', 'daily', 'irshad', 'links'], L + 'the role opens its systems (container for a child · KPIs for a drawn panel)');
        assert.deepEqual(out.ex, ['profile', 'kpis', 'daily'], L + 'the live exception opens its page through its container, and «مؤشرات الإدارة» for its drawn panel');
      }
      if (st === 'allOff') {
        for (const who of ['suIn', 'gm', 'dept', 'mgr', 'sec']) assert.deepEqual(out[who], PERMANENT, L + who + ': every switchable system OFF ⇒ the permanent pages alone');
        assert.deepEqual(out.suOut, seenIn.allOn.suOut, L + 'the platform admin outside that department still sees all');
        for (const who of ['role', 'ex']) assert.deepEqual(out[who], ['profile'], L + who + ': nothing of an OFF system');
      }
      if (st === 'oneOff') {
        for (const who of ['suIn', 'gm', 'dept', 'mgr', 'sec', 'role']) { assert.ok(!out[who].includes(OFF_ONE), L + who + ': the OFF system is absent'); assert.deepEqual(out[who], seenIn.allOn[who].filter((k) => k !== OFF_ONE), L + who + ': only it'); }
        assert.ok(out.suOut.includes(OFF_ONE), L + 'ON outside that department');
      }
      if (st === 'platOff') for (const who of Object.keys(out)) { assert.ok(!out[who].includes(OFF_PLAT), L + who + ': OFF on the platform ⇒ absent'); assert.deepEqual(out[who], seenIn.allOn[who].filter((k) => k !== OFF_PLAT), L + who + ': only it'); }
    } finally { su.dispose(); }
  }
});

test('V7 · د6 · أ1 — «المساعدة» needs the platform switch, and a link hidden by the platform is drawn for nobody: the same rule in every view', Object.assign({ timeout: 300000 }, needs(...SYS)), async () => {
  const W = await holdersWorld();
  await applyState(W, 'allOn');
  let c = await clientOf(W, 'su', A);
  try {
    const pl = c.K.BassamPlat.get();
    c.K.BassamPlat.set(Object.assign({}, pl, { side: Object.assign({}, pl.side, { help: false, hidden: ['links'] }) }));
    await c.settle(); assert.equal(c.denied(), 0);
  } finally { c.dispose(); }
  c = await clientOf(W, 'su', A);
  try {
    const V = permViews(c), card = V.mgrCard(A), mine = c.seen();
    for (const [n, l] of [['sidebar source', c.sidebar()], ['seenBy(session)', mine], ['manager card', card], ['person view of the manager', c.seen({ kind: 'person', did: A, ekey: ACC.mgr.ekey, mgr: true })]]) {
      assert.ok(!l.includes('help'), n + ': no «المساعدة» without the platform switch'); assert.ok(!l.includes('links'), n + ': a hidden side link is not listed'); assert.ok(l.includes('emps') && l.includes('daily'), n + ': the rest stays');
    }
    const m = await clientOf(W, 'mgr', A); try { assert.deepEqual(m.seen(), card, 'the manager\'s own sidebar = the card'); } finally { m.dispose(); }
  } finally { c.dispose(); }
});
