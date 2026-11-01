/* «فحص الصلاحيات العميق (2026-10-21)» — المرحلة 0 (أمن): قاعدةُ المانح وحساباتُ المديرين وسقفُ الوحدة الفعليّ
   العاملُ الحقيقي (KIVO_WORKER وإلا workers/_worker.js) فوق D1 البديل بالمُثبِّت القياسي — في الوضعين (legacy · enforce).
     N1         : المانحُ لا يضيف لموظفٍ إلا ما يحمله هو — في الإنفاذ بمفاتيح v24.9 (تضييقُ مدير النظام بالإسقاط) وفي القديم بالورقة
                  (حاملُ الشارة بلا ورقةٍ لا يملك صفحةً فلا يمنح صفحة)
     M4 (self)  : لا يعدّل غيرُ مدير النظام ورقتَه — خُزِّنت له ورقةٌ أم لا
     D1         : لا يُنشئ غيرُ مدير النظام حساباً مفتاحُه mgr:/gm: ولا يغيّر إليه
     M5/PAR-4   : أوراقُ المديرين ومديري العقد وقوالبُهم ومنحُهم لمدير النظام أو لمدير الفرع الأعلى — لا لمدير الإدارة
     PAR-1/DX-04: permsRule بالسقف الفعليّ للوحدة وعلى الأوراق المتغيّرة وحدها
     DX-05      : أولُ سجلّ منحٍ/نطاقٍ في وحدةٍ لا سجلَّ لها يُقبل بـ v:1 من مديرها
   وكتلةُ «الاستعمال العاديّ» تمرّ قبل الإصلاح وبعده حرفاً (قالبٌ من مديرٍ يرث · عدسات · تضييق · حسابُ موظفٍ عاديّ · مديرُ الفرع على مدير إدارته ·
   المضيَّقُ عليه بورقةٍ يمنح مما يملك ولا يمنح ما سُحب منه · السقف). */
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const { world, stored } = await import('./tasks_fx.mjs');
const { internals } = await import('./internals.mjs');

const KU = 'bassam_auth_users_v1', KP = 'bassam_perms_v1';
const ACC = { dm1: ['0000000101', '70101'], dm2: ['0000000102', '70102'], gm1: ['0000000103', '70103'], dm3: ['0000000104', '70104'], emp1: ['0000000113', '70113'], snop: ['0000000117', '70117'] };
const ALL = ['view', 'add', 'edit', 'del', 'approve', 'export'];
const cp = (o) => JSON.parse(JSON.stringify(o));
const PH = (pw, tag) => { const salt = crypto.createHash('sha256').update('ps0|' + tag).digest().subarray(0, 16); return 'p2$100000$' + salt.toString('hex') + '$' + crypto.pbkdf2Sync(pw, salt, 100000, 32, 'sha256').toString('hex'); };
async function W(mode) {
  const w = await world({ mode });
  w.su2 = w.su.ck;   /* PORT: super session from the line's own fixture (ours admin/admin · codex provisioned admin) */
  w.as = async (n) => (await w.login(ACC[n][0], ACC[n][1])).ck;
  return w;
}
/* حفظُ مفتاحٍ واحد برقم نسخته الحالي (والحساباتُ ببصمة العدسة uscope كما يرسلها العميل) */
async function put(w, ck, k, v) {
  const g = await w.C.api('/api/get?keys=' + encodeURIComponent(k), { cookie: ck });
  const body = { set: { [k]: JSON.stringify(v) }, del: [], base: { [k]: ((g.j.keys || {})[k] || {}).rev || 0 } };
  if (k === KU && g.j.uscope !== undefined) body.uscope = g.j.uscope;
  const r = await w.C.api('/api/save', { method: 'POST', cookie: ck, body });
  const d = (r.j.denied || {})[k] || (r.j.conflicts || {})[k] || null;
  return { ok: !!(r.j.revs && r.j.revs[k]), why: d ? (d.why || 'conflict') : '', detail: d ? String(d.detail || '') : '', show: d ? JSON.stringify(Object.assign({}, d, { cur: undefined })).slice(0, 240) : 'OK' };
}
const listOf = async (w, ck) => { const g = await w.C.api('/api/get?keys=' + KU, { cookie: ck }); return JSON.parse(g.j.keys[KU].v); };
const P = (w) => cp(stored(w.env, KP));
const ok = (r, m) => assert.ok(r.ok, m + ' — ' + r.show);
const no = (r, why, m) => { assert.ok(!r.ok, m + ' — قُبل وكان يجب رفضه'); assert.equal(r.why, why, m + ' — ' + r.show); };
const acct = (id, un, ekey) => ({ id, un, ph: PH('70999', id), name: 'TEST_ONLY · ' + id, role: 'staff', deptId: 'tst_d1', ekey, dis: 0, test: 'TEST_ONLY' });
const tplOf = (p, d, ek, t) => { p.tplOf = p.tplOf || {}; p.tplOf[d] = Object.assign({}, p.tplOf[d], { [ek]: t }); return p; };
const lensOf = (p, d, ek, arr) => { p.empLens = p.empLens || {}; p.empLens[d] = Object.assign({}, p.empLens[d], { [ek]: arr }); return p; };

for (const mode of ['legacy', 'enforce']) {
  test(mode + ' · الاستعمالُ العاديّ كما كان (يمرّ قبل الإصلاح وبعده)', async () => {
    const w = await W(mode), dm = await w.as('dm1');
    /* مديرُ الإدارة (يرث سقفَ إدارته): قالبٌ وعدساتٌ وتضييقٌ وحسابُ موظف */
    let p = tplOf(P(w), 'tst_d1', 'tst_e_snop', 'tPs0'); p.emps.tst_d1.tst_e_snop = { plan: ['view', 'edit'], 'daily/rounds': ['view', 'edit'] };
    ok(await put(w, dm, KP, p), 'قالبٌ لموظفٍ (ورقة + هويةُ القالب)');
    ok(await put(w, dm, KP, lensOf(P(w), 'tst_d1', 'tst_e_emp1', ['zones', 'paths'])), 'عدساتُ موظف');
    p = P(w); p.emps.tst_d1.tst_e_sup1 = Object.assign({}, p.emps.tst_d1.tst_e_sup1, { 'irshad/records': ['view', 'add'] });
    ok(await put(w, dm, KP, p), 'تضييقُ ورقة موظف');
    p = P(w); delete p.emps.tst_d1.tst_e_pnos;
    ok(await put(w, dm, KP, p), 'حذفُ ورقة موظف');
    const L0 = await listOf(w, dm);
    ok(await put(w, dm, KU, L0.concat([acct('ps0_ok', '1888888883', 'tst_e_ps0ok')])), 'حسابُ موظفٍ عاديّ');
    const L1 = await listOf(w, dm); L1.find((x) => x.id === 'tst_snop').name = 'TEST_ONLY · اسم جديد';
    ok(await put(w, dm, KU, L1), 'تعديلُ اسم حسابٍ عاديّ');
    if (mode === 'enforce') {
      const G = 'bsdept:tst_d1:bassam_grants_v1', g = cp(stored(w.env, G)); g.emp.tst_e_emp1 = { plus: [], minus: ['ir.rec.edit'], at: Date.now(), by: 'tst_dm1' };
      ok(await put(w, dm, G, g), 'إسقاطٌ صريح عن موظفٍ في سجلّ المنح');
    }
    /* مديرُ النظام: مفتاحُ mgr: لحسابٍ جديد */
    /* «فحص الصلاحيات العميق · المرحلة 0 (الجولة 2)» · I4w: حسابُ mgr: يُنشأ بالشارة (شكلُ setDeptManager في 330) — وبلا الشارة مرفوضٌ لكلّ أحد */
    const L3 = await listOf(w, w.su2); L3.push(Object.assign(acct('ps0_su', '1888888884', 'mgr:tst_d1:5'), { mgr: true }));
    ok(await put(w, w.su2, KU, L3), 'مديرُ النظام يُنشئ مفتاح mgr:');
    /* مديرُ الفرع (gm) على مدير إدارةٍ تحته وعلى موظفٍ في إدارةٍ أخرى من فرعه */
    const gm = await w.as('gm1');
    p = P(w); p.emps.tst_d1['mgr:tst_d1'] = { 'emps/data': ALL.slice(), 'daily/rounds': ['view', 'edit'], help: ['view'] };
    ok(await put(w, gm, KP, p), 'مديرُ الفرع يضيّق على مدير الإدارة بورقة');
    p = P(w); p.emps.tst_d2.tst_e_emp2 = { 'irshad/records': ['view', 'add'] };
    ok(await put(w, gm, KP, p), 'مديرُ الفرع على موظفٍ في tst_d2 (ويمحو الورقة القديمة خارج السقف)');
    /* المضيَّقُ عليه بورقةٍ (أعلاه): يمنح مما يملك ولا يمنح ما سُحب منه ولا يوسّع ورقتَه */
    const dmN = await w.as('dm1');
    p = P(w); p.emps.tst_d1.tst_e_snop = { 'daily/rounds': ['view', 'edit'] };
    ok(await put(w, dmN, KP, p), 'المضيَّقُ عليه يمنح مما يملك');
    p = P(w); p.emps.tst_d1.tst_e_snop = { plan: ALL.slice() };
    no(await put(w, dmN, KP, p), 'grant', 'ولا يمنح الخطة وقد سُحبت منه');
    p = P(w); p.emps.tst_d1['mgr:tst_d1'] = { 'emps/data': ALL.slice(), 'daily/rounds': ALL.slice(), help: ['view'] };
    no(await put(w, dmN, KP, p), 'self', 'ولا يوسّع ورقتَه');
    /* السقف: ما خارج سقف الوحدة مرفوض · وما داخله يُمنح */
    const dm2 = await w.as('dm2');
    p = P(w); p.emps.tst_d2.tst_e_emp2 = { seized: ['view'], 'seized/records': ['view'] };
    no(await put(w, dm2, KP, p), 'cap', 'صفحةٌ خارج سقف tst_d2');
    p = P(w); p.emps.tst_d2.tst_e_emp2 = { 'irshad/records': ['view'], plan: ['view'] };
    ok(await put(w, dm2, KP, p), 'صفحاتٌ داخل السقف');
  });

  test(mode + ' · D1 · لا يُنشئ مديرُ الإدارة حساباً مفتاحُه mgr:/gm: ولا يغيّر إليه', async () => {
    const w = await W(mode), dm = await w.as('dm1'), L0 = await listOf(w, dm);
    no(await put(w, dm, KU, L0.concat([acct('ps0_p1', '1888888881', 'mgr:tst_d1:9')])), 'ekey', 'حسابٌ «staff» مفتاحُه mgr:tst_d1:9 (الدمية)');
    no(await put(w, dm, KU, L0.concat([acct('ps0_p2', '1888888882', 'gm:tst_g1:9')])), 'ekey', 'حسابٌ مفتاحُه gm:tst_g1:9');
    const L1 = cp(L0); L1.find((x) => x.id === 'tst_snop').ekey = 'mgr:tst_d1:7';
    no(await put(w, dm, KU, L1), 'ekey', 'تغييرُ مفتاح حسابٍ قائم إلى mgr:');
    assert.equal((stored(w.env, KU) || []).filter((x) => /^(mgr|gm):/.test(String(x.ekey)) && x.role === 'staff' && !x.mgr).length, 0, 'لم يُخزَّن حسابٌ دمية');
    assert.ok(!(await w.C.login('1888888881', '70999')).ok, 'ولا يدخل به أحد');
  });

  test(mode + ' · M5/PAR-4 · مديرُ الإدارة لا يكتب ورقةَ مديره العام ولا ورقةَ زميله ولا قالبَهما', async () => {
    const w = await W(mode), dm = await w.as('dm1');
    let p = P(w); p.emps.tst_d1['gm:tst_g1'] = { 'emps/data': ['view'] };
    no(await put(w, dm, KP, p), 'target', 'ورقةُ تضييقٍ للمدير العام gm:tst_g1');
    p = P(w); p.emps.tst_d1['mgr:tst_d1:2'] = { 'emps/data': ['view'] };
    no(await put(w, dm, KP, p), 'target', 'ورقةٌ لمفتاح زميلٍ mgr:tst_d1:2');
    no(await put(w, dm, KP, tplOf(P(w), 'tst_d1', 'gm:tst_g1', 'tPs0')), 'target', 'قالبٌ للمدير العام');
    no(await put(w, dm, KP, lensOf(P(w), 'tst_d1', 'gm:tst_g1', [])), 'target', 'عدساتٌ للمدير العام');
    assert.equal(P(w).emps.tst_d1['gm:tst_g1'], undefined, 'لم تُخزَّن ورقةُ المدير العام');
  });

  test(mode + ' · M4 (self) · المديرُ الذي يرث (بلا ورقة) لا يكتب ورقتَه', async () => {
    const w = await W(mode), dm = await w.as('dm1');
    const p = P(w); p.emps.tst_d1['mgr:tst_d1'] = { plan: ALL.slice() };
    no(await put(w, dm, KP, p), 'self', 'ورقتُه هو وهو بلا ورقة');
    no(await put(w, dm, KP, lensOf(P(w), 'tst_d1', 'mgr:tst_d1', ['zones'])), 'self', 'وعدساتُه');
  });

  test(mode + ' · N1 · M4 · حاملُ الشارة بلا ورقة: لا يمنح ما لا يملكه ولا يكتب ورقتَه · ومديرُ الإدارة لا يكتب ورقتَه', async () => {
    const w = await W(mode);
    const U = cp(stored(w.env, KU)); U.find((x) => x.id === 'tst_emp1').mgr = true;
    ok(await put(w, w.su2, KU, U), 'مديرُ النظام يعيّن tst_emp1 مديراً (الشارة)');
    let p = P(w); delete p.emps.tst_d1.tst_e_emp1;
    ok(await put(w, w.su2, KP, p), 'ومسحُ ورقته (بلا ورقة)');
    const em = await w.as('emp1');
    p = P(w); p.emps.tst_d1.tst_e_snop = { plan: ALL.slice(), staff: ALL.slice() };
    no(await put(w, em, KP, p), 'grant', 'حاملُ الشارة بلا صفحاتٍ يمنح الخطة والجدول كاملين');
    p = P(w); p.emps.tst_d1.tst_e_emp1 = { plan: ALL.slice(), 'admin/import': ALL.slice(), 'emps/data': ALL.slice() };
    no(await put(w, em, KP, p), 'self', 'يكتب لنفسه سقفَ الإدارة');
    assert.equal(P(w).emps.tst_d1.tst_e_emp1, undefined, 'لم تُخزَّن ورقتُه');
    const dm = await w.as('dm1');
    p = P(w); p.emps.tst_d1.tst_e_emp1 = { 'emps/data': ['view'] };
    no(await put(w, dm, KP, p), 'target', 'مديرُ الإدارة على زميله حامل الشارة');
    /* ومديرُ النظام يوسّع حاملَ الشارة فيمنح مما يملك وحده */
    p = P(w); p.emps.tst_d1.tst_e_emp1 = { plan: ['view', 'edit'] };
    ok(await put(w, w.su2, KP, p), 'مديرُ النظام يعطي حاملَ الشارة الخطة');
    const em2 = await w.as('emp1');
    p = P(w); p.emps.tst_d1.tst_e_snop = { plan: ['view', 'edit'] };
    ok(await put(w, em2, KP, p), 'حاملُ الشارة يمنح مما يملك');
    p = P(w); p.emps.tst_d1.tst_e_snop = { plan: ['view', 'edit', 'del'] };
    no(await put(w, em2, KP, p), 'grant', 'ولا يزيد عليه');
  });

  test(mode + ' · PAR-1/DX-04 · السقفُ الفعليّ للوحدة والأوراقُ المتغيّرة وحدها', async () => {
    const w = await W(mode), dm = await w.as('dm2');
    /* المُثبِّت: tst_e_emp2 له seized/records وسقفُ tst_d2 بلا seized (ورقةٌ قديمة) — لا تُسقط حفظاً لا شأن له بها */
    let p = P(w); p.emps.tst_d2.tst_e_ps0n = { 'irshad/records': ['view'] };
    ok(await put(w, dm, KP, p), 'ورقةٌ لموظفٍ جديد');
    ok(await put(w, dm, KP, lensOf(P(w), 'tst_d2', 'tst_e_emp2', ['zones'])), 'عدساتُ موظفٍ ورقتُه قديمة');
    p = P(w); p.emps.tst_d2.tst_e_ps0n = { seized: ['view'], 'seized/records': ['view'] };
    no(await put(w, dm, KP, p), 'cap', 'وصفحةٌ خارج سقف الوحدة مرفوضةٌ كما كانت');
    /* وحدةٌ بلا سجلّ سقفٍ في سلسلتها = مفتوحة (deptCapOf — نصُّ شاشة الصلاحيات) */
    p = P(w); delete p.caps.tst_d2; ok(await put(w, w.su2, KP, p), 'مديرُ النظام يمحو سجلّ سقف tst_d2');
    const dm2 = await w.as('dm2');
    p = P(w); p.emps.tst_d2.tst_e_emp2 = { 'irshad/records': ['view'] };
    ok(await put(w, dm2, KP, p), 'وحدةٌ مفتوحة: تضييقُ ورقة موظف');
    p = P(w); p.emps.tst_d2.tst_e_ps0n = { plan: ['view', 'edit'] };
    ok(await put(w, dm2, KP, p), 'وحدةٌ مفتوحة: قالبٌ لموظف');
  });

  test(mode + ' · N1 → PAR-5/DX-03 (أثرٌ مقصود) · المضيَّقُ عليه بورقةٍ يسند هويةَ القالب وعدسةً يملكها — يُحكم بالمفاتيح لا بوجود ورقته', async () => {
    const w = await W(mode);
    let p = P(w); p.emps.tst_d1['mgr:tst_d1'] = { 'emps/data': ALL.slice(), 'daily/rounds': ['view', 'edit'], help: ['view'] };
    ok(await put(w, w.su2, KP, p), 'مديرُ النظام يضيّق على مدير الإدارة بورقة');
    const dm = await w.as('dm1');
    ok(await put(w, dm, KP, tplOf(P(w), 'tst_d1', 'tst_e_snop', 'tRounds')), 'هويةُ القالب لموظفه (لا تمنح بنفسها) — كانت «grant» لكل تغيير');
    ok(await put(w, dm, KP, lensOf(P(w), 'tst_d1', 'tst_e_emp1', ['paths'])), 'عدسةٌ يملكها (تضييق) — كانت «grant»');
  });
}

test('enforce · N1 (المفاتيح) · مديرٌ ضيّق عليه مديرُ النظام بالإسقاط لا يعطي موظفَه الورقةَ فيملك ما سُحب منه', async () => {
  const w = await W('enforce'), G = 'bsdept:tst_d1:bassam_grants_v1';
  const g = cp(stored(w.env, G)); g.emp['mgr:tst_d1'] = Object.assign({}, g.emp['mgr:tst_d1'], { minus: ['site.edit', 'site.create', 'site.delete'], at: Date.now(), by: 'sa' });
  ok(await put(w, w.su2, G, g), 'مديرُ النظام يسقط site.* عن مدير الإدارة (ما يكتبه محرّرُ المستخدم)');
  const dm = await w.as('dm1'), PL = 'bsdept:tst_d1:bassam_plan_v1';
  const pl = cp(stored(w.env, PL)); pl.floors[0].name += ' N';
  assert.ok(!(await put(w, dm, PL, pl)).ok, 'المديرُ نفسُه لا يعدّل اسم الموقع');
  let p = P(w); p.emps.tst_d1.tst_e_snop = { plan: ALL.slice() };
  const r = await put(w, dm, KP, p);
  no(r, 'grant', 'يعطي موظفَه ورقةَ الخطة كاملة');
  assert.match(r.detail, /^site\.(edit|create|delete) /, 'والسببُ المفتاحُ الذي لا يحمله: ' + r.detail);
  const sn = await w.as('snop'), pl2 = cp(stored(w.env, PL)); pl2.floors[0].name += ' M';
  assert.ok(!(await put(w, sn, PL, pl2)).ok, 'والموظفُ لا يعدّل الموقع');
  p = P(w); p.emps.tst_d1.tst_e_snop = { 'daily/rounds': ['view', 'edit'], plan: ['view'] };
  ok(await put(w, dm, KP, p), 'ويعطي ما يحمله');
});

test('enforce · M5/PAR-4 (المنح) · مديرُ الإدارة لا يسقط عن المدير العام ولا عن زميله', async () => {
  const w = await W('enforce'), dm = await w.as('dm1'), G = 'bsdept:tst_d1:bassam_grants_v1';
  const g = cp(stored(w.env, G)); g.emp['gm:tst_g1'] = { plus: [], minus: ['emp.view'], at: Date.now(), by: 'tst_dm1' };
  no(await put(w, dm, G, g), 'target', 'إسقاطُ emp.view عن المدير العام');
  const g2 = cp(stored(w.env, G)); g2.emp['mgr:tst_d1:2'] = { plus: [], minus: ['emp.view'], at: Date.now(), by: 'tst_dm1' };
  no(await put(w, dm, G, g2), 'target', 'إسقاطٌ عن مفتاح زميل');
  const gm = await w.as('gm1'), g3 = cp(stored(w.env, G)); g3.emp['mgr:tst_d1'] = Object.assign({}, g3.emp['mgr:tst_d1'], { minus: ['emp.record.delete'] });
  ok(await put(w, gm, G, g3), 'ومديرُ الفرع يسقط عن مدير إدارته');
});

test('legacy · DX-05 · سجلُّ المنح مجهولٌ في النظام القديم — كما كان', async () => {
  const w = await W('legacy'), dm = await w.as('dm2');
  assert.ok(!(await put(w, dm, 'bsdept:tst_d2:bassam_grants_v1', { v: 1, emp: { tst_e_emp2: { plus: [], minus: ['ir.rec.edit'] } } })).ok, 'المنح');
});

test('enforce · DX-05 · أولُ سجلّ منحٍ في وحدةٍ لا سجلَّ لها يُقبل بـ v:1 من مديرها — وما سوى v:1 لمدير النظام ', async () => {
  const w = await W('enforce'), dm2 = await w.as('dm2'), G = 'bsdept:tst_d2:bassam_grants_v1';
  assert.equal(stored(w.env, G), null, 'لا سجلَّ منحٍ في tst_d2');
  const e = { tst_e_emp2: { plus: [], minus: ['ir.rec.edit'], at: Date.now(), by: 'tst_dm2' } };
  no(await put(w, dm2, G, { v: 2, emp: e }), 'super', 'إصدارٌ غيرُ 1 عند الإنشاء');
  ok(await put(w, dm2, G, { v: 1, emp: e }), 'أولُ منحٍ صريح {v:1, emp} (شكلُ الواجهة 331)');
  const g = cp(stored(w.env, G)); g.v = 2;
  no(await put(w, dm2, G, g), 'super', 'تغييرُ v بعد الإنشاء لمدير النظام');
  /* (إفصاح) في المسار السابق كان هنا أيضاً «أولُ سجلّ نطاقٍ {v:1, emp}» — لم يُنقل في هذه الدفعة: استثناءُ v:1 لسجلّ النطاق خارج نطاقها (حذفُ سقف النطاق دفعةٌ لاحقة بموافقة المالك) */
});

test('M5/PAR-4 · permTargetOk: مديرُ العقدة يكتب لمدير عقدةٍ تحته وحده · ومديرُ الإدارة لموظفيه العاديين وحدهم (حسابُ gm قديمٌ بمفتاح هوية مديرٌ كذلك)', async () => {
  const { permTargetOk } = await internals(['permTargetOk']);
  const nodes = [{ id: 'g1' }, { id: 's1', pid: 'g1' }, { id: 's2', pid: 'g1' }];
  const users = [{ id: 'u1', role: 'gm', gid: 'g1', ekey: 'gm:g1' }, { id: 'u2', role: 'gm', gid: 's1', ekey: 'gm:s1' }, { id: 'u3', role: 'gm', gid: 's2', ekey: '1012345678' },
    { id: 'u4', role: 'staff', deptId: 'd1', ekey: 'mgr:d1' }, { id: 'u5', role: 'staff', deptId: 'd1', ekey: 'e5', mgr: true }, { id: 'u6', role: 'staff', deptId: 'd1', ekey: 'e6' }];
  const A = (u) => ({ u, users, nodes });
  const top = A(users[0]), mid = A(users[1]), dm = A(users[3]);
  assert.equal(permTargetOk(top, 'gm:s1'), true, 'مديرُ g1 على مدير s1 تحته');
  assert.equal(permTargetOk(top, '1012345678'), true, 'وعلى حساب gm قديمٍ تحته');
  assert.equal(permTargetOk(mid, 'gm:g1'), false, 'مديرُ s1 لا يكتب لمدير g1 فوقه');
  assert.equal(permTargetOk(mid, '1012345678'), false, 'ولا لزميله s2');
  assert.equal(permTargetOk(top, 'mgr:d1'), true, 'مديرُ العقدة على مدير الإدارة');
  assert.equal(permTargetOk(dm, 'e6'), true, 'مديرُ الإدارة على موظفه العاديّ');
  assert.equal(permTargetOk(dm, 'tst_no_account'), true, 'وعلى موظفٍ بلا حساب');
  for (const ek of ['gm:g1', '1012345678', 'mgr:d1:2', 'e5']) assert.equal(permTargetOk(dm, ek), false, 'مديرُ الإدارة لا يكتب لـ ' + ek);
  assert.equal(permTargetOk(A({ id: 'su', role: 'super' }), 'gm:g1'), true, 'مديرُ النظام بلا قيد');
});
