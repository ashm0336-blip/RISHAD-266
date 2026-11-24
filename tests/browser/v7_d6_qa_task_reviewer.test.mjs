/* V7 · د6 (QA) البند ٣ — موظفٌ دورُه «المهام = تعديل» (لا يملك اعتماد التسليم task.finish) ينشئ مهمةً من أول محاولة:
   المراجِعُ الافتراضي له «بلا مراجعة» وخيارُ «أنا — منشئ المهمة» لا يُعرض · ومديرُ الإدارة يبقى افتراضيُّه «أنا». TEST_ONLY */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';
import { needs } from '../unit/harness.mjs';

const A = 'TEST_ONLY_A', ROLE = { id: 'TEST_ONLY_qa_tasks_edit', name: 'TEST_ONLY مهام تعديل' };

async function createTask(s, title) {
  const resp = [];
  s.page.on('response', async (r) => { if (/\/api\/tasks\/create\b/.test(r.url())) { let j = null; try { j = await r.json(); } catch (e) {} resp.push({ status: r.status(), j }); } });
  await s.go('#/tasks', 4000);
  await s.page.locator('button[title="مهمة جديدة"]:visible, button:visible:has-text("إضافة أول مهمة")').first().click();
  await s.page.waitForTimeout(800);
  await s.page.locator('[aria-label="إعدادات متقدمة"]').first().click(); await s.page.waitForTimeout(500);
  const opts = await s.page.evaluate(() => Array.from(document.querySelectorAll('select option')).map((o) => ({ t: o.textContent.trim(), sel: o.selected })).filter((o) => /منشئ المهمة|بلا مراجعة|— مدير/.test(o.t)));
  await s.page.locator('input[placeholder^="مثال: تفقد"]').first().fill(title);
  await s.page.locator('input[placeholder^="مثال: تفقد"]').first().dispatchEvent('change');
  await s.page.getByText('إنشاء المهمة', { exact: true }).last().click();
  await s.page.waitForTimeout(3000);
  const toast = await s.page.evaluate(() => document.body.innerText.includes('لا تملك صلاحيةَ اعتماد التسليم'));
  return { resp, opts, toast };
}

test('(٣) موظفُ «المهام = تعديل» ينشئ مهمةً من أول محاولة بلا خيار «أنا» · ومديرُ الإدارة افتراضيُّه «أنا»', Object.assign({ timeout: 300000 }, needs('tasks')), async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw);
    const saved = await m.page.evaluate(async ([d, role, ekey]) => {
      const E = KIVO.Perm44, dr = E.draft(d), rec = E.rolesOf(d);
      rec.roles = rec.roles.filter((r) => r.id !== role.id).concat([{ id: role.id, name: role.name, sys: { tasks: { lvl: 'edit' } } }]);
      rec.people[ekey] = { role: role.id, ex: [] };
      const r = E.setRoles(dr, d, rec); if (!r.ok) return r;
      return E.commit(dr);
    }, [A, ROLE, 'TEST_ONLY_eA1']);
    assert.ok(saved && saved.ok, JSON.stringify(saved));
    await lab.idle();
    /* مديرُ الإدارة: يملك الاعتماد ⇒ «أنا» ظاهرٌ ومختارٌ افتراضياً */
    const mo = await createTask(m, 'TEST_ONLY مهمة المدير');
    assert.ok(mo.opts.some((o) => /^أنا — منشئ المهمة/.test(o.t) && o.sel), 'المدير: «أنا» افتراضي ' + JSON.stringify(mo.opts));
    assert.equal(mo.resp[0] && mo.resp[0].status, 200, JSON.stringify(mo.resp));
    /* الموظف: تعديلٌ بلا اعتماد */
    const e = await openAs(b, lab, LAB.empA, LAB.pw);
    const held = await e.page.evaluate((d) => ({ edit: KIVO.BassamPerm.key('task.edit', d), finish: KIVO.BassamPerm.key('task.finish', d) }), A);
    assert.notEqual(held.edit === true && held.finish === true, true, 'الدورُ «تعديل» لا يملك الاعتماد: ' + JSON.stringify(held));
    const eo = await createTask(e, 'TEST_ONLY مهمة الموظف');
    assert.ok(!eo.opts.some((o) => /^أنا — منشئ المهمة/.test(o.t)), '«أنا» لا يُعرض ' + JSON.stringify(eo.opts));
    assert.ok(eo.opts.some((o) => /^بلا مراجعة/.test(o.t) && o.sel), '«بلا مراجعة» افتراضي');
    assert.equal(eo.resp.length, 1, 'طلبُ إنشاءٍ واحد: ' + JSON.stringify(eo.resp));
    assert.equal(eo.resp[0].status, 200, JSON.stringify(eo.resp));
    assert.equal(eo.toast, false, 'لا رسالةَ رفض');
    assert.deepEqual(e.errs, [], 'أخطاء صفحة');
  } finally { await b.close(); await lab.close(); }
});
