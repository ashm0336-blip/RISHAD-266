/* V7 · د7 (52 · الكامن): تعديلُ الأدوار بعد تضييق سقف الوحدة — في المختبر المعزول (TEST_ONLY، الإنفاذ، بلا page.route):
   (١) مديرُ المنصة يمنح موظفاً بدورٍ صلاحياتٍ في نظام، ثم يطفئ النظامَ من سقف الإدارة؛ مديرُ الإدارة يغيّر مستوى دور الموظف، وينشئ دوراً جديداً،
       ويسند للموظف دوراً آخر — كلُّه يُحفظ (لا رفضَ «الحفظُ يحذف صلاحياتٍ مخفيّة»)؛ ثم مديرُ المنصة يعيد تشغيل النظام فتعود صلاحيةُ الموظف كما كانت.
   (٢) نسخةُ Production مستوردة (مولَّدة TEST_ONLY بعُدّة v7_d6_import_fx، وكلُّ موردٍ يُقرأ بعد الاعتماد — readBack): إطفاءُ نظامٍ فيه إسنادات ثم تعديلُ الأدوار يُحفظ.
   كان قبل الإصلاح: recompile (345) يكتب منحَ الدور بمفاتيح السقف وحدها فيحذف المفتاحَ المخفيّ (links.view في Preview) فيرفض الخادمُ الحفظةَ كلَّها. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';
import { target, oldFile, protocol, readBack } from '../unit/v7_d6_import_fx.mjs';

const A = 'TEST_ONLY_A', EMP = 'TEST_ONLY_eA1', KR = 'bsdept:' + A + ':bassam_roles_v1', KG = 'bsdept:' + A + ':bassam_grants_v1';
const OFF = { k: 'dstats', n: 'الإحصائيات اليومية' };
const P = (p, sel, o) => p.locator('main .p44 ' + sel, o);
const T = (p, o) => p.locator('main .og-tabs .og-tab', o);
const kv = (lab, k) => { const r = lab.env.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', k).map((x) => x.v).join(''); return r ? JSON.parse(r) : null; };
async function settle(lab, p, ms = 900) { await p.waitForTimeout(ms); await lab.idle(); }
const LATENT = /يحذف صلاحياتٍ مخفيّة|بيانات المنصة|صلاحيتك لا تشمله/;

/* مديرُ المنصة: يقلب نظاماً لوحدة A في «الأنظمة» ويحفظ */
async function flip(b, lab, sys, wantOn) {
  const s = await openAs(b, lab, LAB.superUn, LAB.superPw); s.page.setDefaultTimeout(15000);
  await s.go('#/sysadmin/org/' + A + '/systems', 3000);
  await P(s.page, 'button.p44-sw[aria-label="' + sys.n + '"]').click(); await s.page.waitForTimeout(200);
  await P(s.page, '.p44-bar button', { hasText: 'مراجعة وحفظ' }).click(); await P(s.page, '[role=dialog].p44-rev').waitFor();
  await P(s.page, '[role=dialog].p44-rev button', { hasText: 'حفظ' }).click(); await settle(lab, s.page, 1500);
  assert.equal((kv(lab, 'bassam_perms_v1').caps[A] || []).includes(sys.k), wantOn, sys.k + ' ' + (wantOn ? 'ON' : 'OFF') + ' for A');
  await s.ctx.close();
}
/* مديرُ المنصة يمنح بدورٍ (المسارُ الواحد KIVO.Perm44: مسودةٌ تُثبَّت مرة) */
async function grantByRole(b, lab, role, ekey) {
  const s = await openAs(b, lab, LAB.superUn, LAB.superPw); s.page.setDefaultTimeout(15000);
  await s.go('#/sysadmin/org/' + A + '/roles', 3000);
  const r = await s.page.evaluate(async ([d, role, e]) => {
    const E = KIVO.Perm44, rec = E.rolesOf(d), dr = E.draft(d);
    rec.roles.push(role); rec.people[e] = { role: role.id, ex: [] };
    const w = E.setRoles(dr, d, rec); if (!w.ok) return w;
    return E.commit(dr);
  }, [A, role, ekey]);
  await settle(lab, s.page, 1200);
  assert.equal(r.ok, true, 'the platform admin grants by role: ' + JSON.stringify(r));
  await s.ctx.close();
}
/* مديرُ الإدارة: الحفظاتُ الثلاث من الواجهة — كلٌّ بلا رفض */
async function managerEdits(b, lab, roleName, newRole, ekeyName) {
  const m = await openAs(b, lab, LAB.mgrA, LAB.pw, { viewport: { width: 1366, height: 1100 } }); const p = m.page; p.setDefaultTimeout(15000);
  const answers = []; p.on('response', async (r) => { if (r.request().method() === 'POST' && /\/api\/save$/.test(new URL(r.url()).pathname)) { let j = null; try { j = await r.json(); } catch (e) { j = null; } answers.push(j || {}); } });
  const toasts = []; await p.exposeFunction('__d7toast', (t) => toasts.push(t));
  await p.addInitScript(() => { new MutationObserver(() => document.querySelectorAll('.bs-toast, [role=status], [role=alert]').forEach((n) => { if (!n.__d7) { n.__d7 = 1; window.__d7toast(n.textContent || ''); } })).observe(document, { childList: true, subtree: true }); });
  const noRefusal = (what) => {
    const den = answers.map((j) => j.denied || {}).filter((d) => Object.keys(d).length);
    assert.deepEqual(den, [], what + ': no refusal from the server');
    assert.ok(!toasts.some((t) => LATENT.test(t)), what + ': no refusal message: ' + JSON.stringify(toasts));
  };
  const save = async (what) => {
    answers.length = 0;
    await P(p, '.p44-bar button', { hasText: 'مراجعة وحفظ' }).click(); await p.waitForTimeout(400);
    await P(p, '.p44-rev button', { hasText: 'حفظ' }).last().click(); await settle(lab, p, 2500);
    assert.ok(answers.length >= 1, what + ': a save was sent');
    noRefusal(what);
    assert.equal(await P(p, '.p44-rev').count(), 0, what + ': saved (the review closed)');
  };
  await m.go('#/admin/perm/' + A + '/roles', 3000);
  /* ① the employee's role: «المهام» from «مشاهدة فقط» to «كامل» */
  await P(p, '.p44-role', { hasText: roleName }).click(); await p.waitForTimeout(300);
  await P(p, 'select[aria-label="مستوى المهام"]').selectOption('full'); await p.waitForTimeout(300);
  await save('role level');
  assert.deepEqual(kv(lab, KR).roles.find((r) => r.name === roleName).sys.tasks, { lvl: 'full' }, 'the level is stored');
  /* ② a new role */
  await P(p, 'button', { hasText: '+ دور جديد' }).click(); await p.waitForTimeout(400);
  await P(p, 'input[maxlength="60"]').fill(newRole); await P(p, 'input[maxlength="60"]').dispatchEvent('change'); await p.waitForTimeout(300);
  await P(p, 'button[aria-label="تفعيل المهام لهذا الدور"]').click(); await p.waitForTimeout(300);
  await P(p, 'select[aria-label="مستوى المهام"]').selectOption('input'); await p.waitForTimeout(300);
  await save('new role');
  const nr = kv(lab, KR).roles.find((r) => r.name === newRole); assert.ok(nr, 'the new role is stored');
  /* ③ assign the other role to the employee */
  await T(p, { hasText: 'الأشخاص' }).click(); await p.waitForTimeout(600);
  await P(p, 'table.p44-people button', { hasText: ekeyName }).first().click(); await p.waitForTimeout(400);
  await P(p, 'aside[aria-label="تفاصيل الشخص"] [role=radio]', { hasText: newRole }).click(); await p.waitForTimeout(300);
  await save('assign another role');
  assert.deepEqual(m.errs, [], 'no page errors (manager)');
  await m.ctx.close();
  return nr;
}

test('V7 · د7 (52 · الكامن) ① a system turned OFF after a role grant: the manager changes the level, creates a role, assigns another — all saved; ON again ⇒ the grant is back', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    const role = { id: 'TEST_ONLY_r_d7', name: 'TEST_ONLY تجربة مشاهد', sys: { tasks: { lvl: 'view' }, [OFF.k]: { lvl: 'view' } } };
    await grantByRole(b, lab, role, EMP);
    const g0 = kv(lab, KG).emp[EMP], hidden = g0.plus.filter((k) => /^dstats\./.test(k));
    assert.ok(hidden.length, 'the role grants ' + OFF.k + ' keys: ' + JSON.stringify(g0));
    await flip(b, lab, OFF, false);
    const nr = await managerEdits(b, lab, role.name, 'TEST_ONLY دور جديد للكامن', 'TEST_ONLY موظف أ');
    const g1 = kv(lab, KG).emp[EMP];
    assert.equal(g1.src, 'role:' + nr.id, 'the employee now holds the other role');
    assert.deepEqual(hidden.filter((k) => !g1.plus.includes(k)), [], 'the hidden ' + OFF.k + ' keys are kept with his grant: ' + JSON.stringify(g1));
    await flip(b, lab, OFF, true);
    const e = await openAs(b, lab, LAB.empA, LAB.pw); await e.go('#/profile', 3000);
    assert.equal(await e.page.evaluate(() => KIVO.BassamPerm.can('dstats', 'view')), true, 'ON again ⇒ his ' + OFF.k + ' right is back as before');
    assert.deepEqual(e.errs, [], 'no page errors (employee)');
  } finally { await b.close(); await lab.close(); }
});

test('V7 · د7 (52 · الكامن) ② an imported Production-shaped copy: a system with assignments turned OFF, then the roles are edited — saved', { timeout: 600000 }, async () => {
  const Tt = await target(), lab = Tt.lab, b = await chromium.launch();
  try {
    /* the copy (TEST_ONLY, Production's old shape) imported into A — every resource read back after the commit */
    const file = await oldFile({ small: true });
    const run = await protocol(Tt, Tt.su, file, { scope: { kind: 'dept', departmentId: A } }).run();
    assert.equal(run.commit && run.commit.status, 200, 'the import commits: ' + JSON.stringify((run.commit || run.inspect || run.begin || {}).j).slice(0, 300));
    await readBack(Tt, A, null, Tt.su, { nonEmpty: false });
    /* after the import: roles assigned while the system was ON (as on Preview: role-derived grants holding the system's keys) */
    const role = { id: 'TEST_ONLY_r_imp', name: 'TEST_ONLY دور مستورد', sys: { tasks: { lvl: 'view' }, [OFF.k]: { lvl: 'view' } } };
    await grantByRole(b, lab, role, EMP);
    assert.ok(kv(lab, KG).emp[EMP].plus.some((k) => /^dstats\./.test(k)), 'the assignment holds ' + OFF.k + ' keys');
    await flip(b, lab, OFF, false);
    await managerEdits(b, lab, role.name, 'TEST_ONLY دور بعد الاستيراد', 'TEST_ONLY موظف أ');
  } finally { await b.close(); await Tt.close(); }
});
