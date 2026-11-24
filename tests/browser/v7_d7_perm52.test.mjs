/* V7 · د7 (52 · perm52): كتّابُ الأدوار والسقف يحملون ما خارج العرض — في المختبر المعزول (TEST_ONLY، الإنفاذ، بلا page.route):
   (١) الجرد ٢: دورٌ فيه صفٌّ لنظامٍ أُطفئ بعدُ وصفٌّ لعدسةٍ أُطفئت ← مديرُ الإدارة يضغط «إيقاف الكل» ويحفظ ← مديرُ المنصة يعيد تشغيل النظام والعدسة
       ← صفّا الدور كما كانا حرفاً، وصلاحيةُ الموظف فيهما تعود. كان قبل الإصلاح: «إيقاف الكل» يكتب r.sys = {} فيحذف الصفّين اللذين لا يعرضهما المحرّر.
   (٢) الجرد ٤: فتحُ الجدول الشهري بحساب المدير لا يكتب سجلَّ الصلاحيات — كان pruneOrphanEmpPerms يحذف صحيفةَ موظفٍ ليس في قائمة الحسابات المُرشَّحة. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const A = 'TEST_ONLY_A', EMP = 'TEST_ONLY_eA1', KR = 'bsdept:' + A + ':bassam_roles_v1', KG = 'bsdept:' + A + ':bassam_grants_v1';
const OFF = { k: 'dstats', n: 'الإحصائيات اليومية' }, LENS = 'zones', LROW = 'lens.' + LENS;
const P = (p, sel, o) => p.locator('main .p44 ' + sel, o);
const kv = (lab, k) => { const r = lab.env.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', k).map((x) => x.v).join(''); return r ? JSON.parse(r) : null; };
async function settle(lab, p, ms = 900) { await p.waitForTimeout(ms); await lab.idle(); }

async function superDo(b, lab, fn, arg) {
  const s = await openAs(b, lab, LAB.superUn, LAB.superPw); s.page.setDefaultTimeout(15000);
  await s.go('#/sysadmin/org/' + A + '/roles', 3000);
  const r = await s.page.evaluate(fn, arg);
  await s.page.evaluate(() => KIVO.__BS_SRV && KIVO.__BS_SRV.flushAsync && KIVO.__BS_SRV.flushAsync()); await settle(lab, s.page, 1500);
  assert.deepEqual(s.errs, [], 'no page errors (platform admin)');
  await s.ctx.close();
  return r;
}
/* مديرُ المنصة: سقفُ A — النظامُ والعدسة معاً (الكاتبان القائمان setDeptCap · setDeptLenses) */
const ceilA = (b, lab, on) => superDo(b, lab, ([d, sys, lens, on]) => {
  const P = KIVO.BassamPerm, cap = P.rawCap(d).filter((k) => k !== sys), L = P.deptLenses(d).filter((k) => k !== lens);
  const r1 = P.setDeptCap(d, on ? cap.concat([sys]) : cap), r2 = P.setDeptLenses(d, on ? L.concat([lens]) : L);
  return { r1, r2 };
}, [A, OFF.k, LENS, on]);

test('V7 · د7 (52 · perm52) ① «إيقاف الكل» after a system and a lens were turned OFF: saved; ON again ⇒ the role rows are back as before', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    const role = { id: 'TEST_ONLY_r_p52', name: 'TEST_ONLY دور الإيقاف', sys: { tasks: { lvl: 'view' }, [OFF.k]: { lvl: 'view' }, [LROW]: { lvl: 'full' } } };
    const g = await superDo(b, lab, async ([d, role, e]) => {
      const E = KIVO.Perm44, rec = E.rolesOf(d), dr = E.draft(d);
      rec.roles.push(role); rec.people[e] = { role: role.id, ex: [] };
      const w = E.setRoles(dr, d, rec); if (!w.ok) return w;
      return E.commit(dr);
    }, [A, role, EMP]);
    assert.equal(g.ok, true, 'the platform admin grants by role: ' + JSON.stringify(g));
    const g0 = kv(lab, KG).emp[EMP];
    assert.ok(g0.plus.some((k) => /^dstats\./.test(k)), 'the role grants ' + OFF.k + ' keys: ' + JSON.stringify(g0));
    assert.ok(g0.plus.some((k) => k.startsWith(LROW + '.')), 'the role grants ' + LROW + ' keys: ' + JSON.stringify(g0));
    const r0 = kv(lab, KR).roles.find((r) => r.id === role.id);
    const c0 = await ceilA(b, lab, false);
    assert.ok(c0.r1.ok && c0.r2.ok, 'OFF saved: ' + JSON.stringify(c0));
    assert.ok(!kv(lab, 'bassam_perms_v1').caps[A].includes(OFF.k) && !kv(lab, 'bassam_perms_v1').lenses[A].includes(LENS), 'the system and the lens are OFF for A');

    /* مديرُ الإدارة: «إيقاف الكل» ثم الحفظ من الواجهة */
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw, { viewport: { width: 1366, height: 1100 } }); const p = m.page; p.setDefaultTimeout(15000);
    const answers = []; p.on('response', async (r) => { if (r.request().method() === 'POST' && /\/api\/save$/.test(new URL(r.url()).pathname)) { let j = null; try { j = await r.json(); } catch (e) { j = null; } answers.push(j || {}); } });
    await m.go('#/admin/perm/' + A + '/roles', 3000);
    await P(p, '.p44-role', { hasText: role.name }).click(); await p.waitForTimeout(300);
    assert.equal(await P(p, 'select[aria-label="مستوى ' + OFF.n + '"]').count(), 0, 'the OFF system has no row in the editor');
    await P(p, '.p44-strip button', { hasText: 'إيقاف الكل' }).click(); await p.waitForTimeout(300);
    await P(p, '.p44-bar button', { hasText: 'مراجعة وحفظ' }).click(); await p.waitForTimeout(400);
    await P(p, '.p44-rev button', { hasText: 'حفظ' }).last().click(); await settle(lab, p, 2500);
    assert.ok(answers.length >= 1, 'a save was sent');
    assert.deepEqual(answers.map((j) => j.denied || {}).filter((d) => Object.keys(d).length), [], 'no refusal from the server');
    assert.deepEqual(m.errs, [], 'no page errors (manager)');
    await m.ctx.close();
    const r1 = kv(lab, KR).roles.find((r) => r.id === role.id);
    assert.equal(r1.sys.tasks, undefined, 'the shown row is OFF (what the manager changed)');
    assert.deepEqual(r1.sys[OFF.k], r0.sys[OFF.k], 'the OFF system row is carried as stored: ' + JSON.stringify(r1.sys));
    assert.deepEqual(r1.sys[LROW], r0.sys[LROW], 'the lens row is carried as stored: ' + JSON.stringify(r1.sys));

    /* مديرُ المنصة يعيد التشغيل ⇒ الصفّان كما كانا حرفاً، وصلاحيةُ الموظف فيهما تعود */
    const c1 = await ceilA(b, lab, true);
    assert.ok(c1.r1.ok && c1.r2.ok, 'ON saved: ' + JSON.stringify(c1));
    const r2 = kv(lab, KR).roles.find((r) => r.id === role.id);
    assert.deepEqual(r2.sys, { [OFF.k]: r0.sys[OFF.k], [LROW]: r0.sys[LROW] }, 'ON again ⇒ the role is back as before, less the row the manager turned off');
    const e = await openAs(b, lab, LAB.empA, LAB.pw); await e.go('#/profile', 3000);
    assert.equal(await e.page.evaluate(() => KIVO.BassamPerm.can('dstats', 'view')), true, 'ON again ⇒ his ' + OFF.k + ' right is back');
    const g2 = kv(lab, KG).emp[EMP];
    assert.deepEqual(g0.plus.filter((k) => k.startsWith(LROW + '.')).filter((k) => !g2.plus.includes(k)), [], 'ON again ⇒ his ' + LROW + ' keys are back: ' + JSON.stringify(g2));
    assert.deepEqual(e.errs, [], 'no page errors (employee)');
    await e.ctx.close();
  } finally { await b.close(); await lab.close(); }
});

test('V7 · د7 (52 · perm52) ② opening the monthly schedule as the manager writes no permissions (no automatic prune)', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    /* صحيفتان TEST_ONLY: موظفٌ بحساب، وموظفٌ في السجلّ بلا حساب (فلا يظهر في قائمة الحسابات التي يقرؤها العميل) */
    await superDo(b, lab, ([d]) => {
      const o = JSON.parse(localStorage.getItem('bassam_perms_v1') || '{}');
      o.emps = o.emps || {}; o.emps[d] = Object.assign({}, o.emps[d] || {}, { TEST_ONLY_eA1: { tasks: ['view'] }, TEST_ONLY_eA2: { tasks: ['view'] } });
      localStorage.setItem('bassam_perms_v1', JSON.stringify(o));
    }, [A]);
    const before = kv(lab, 'bassam_perms_v1');
    assert.ok(before.emps[A].TEST_ONLY_eA2, 'the sheet is stored');
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw); m.page.setDefaultTimeout(15000);
    await m.go('#/staffing', 5000); await settle(lab, m.page, 1500);
    assert.deepEqual(kv(lab, 'bassam_perms_v1'), before, 'the permissions registry is unchanged after opening the schedule');
    assert.deepEqual(m.errs, [], 'no page errors (manager)');
    await m.ctx.close();
  } finally { await b.close(); await lab.close(); }
});
