/* RISHAD V7 P3 — the unified permissions editor in the account window (isolated lab, TEST_ONLY data), legacy and enforce.
     · a NEW grant starts with «عرض» alone: the leaf checkbox (legacy: the six-action sheet · enforce: the leaf's first view key);
       every other act/key is chosen explicitly;
     · stored grants are shown and saved as they are: opening is not dirty, «تحديد الكل» only adds «عرض» to ungranted leaves;
     · before saving, the review lists what will be added and withdrawn; the sources line shows ceiling · role · basis;
     · a unit manager returns to inheriting the unit ceiling with an explicit «إعادة إلى التوريث» (legacy) — no six-act ticking;
     · the save goes through the existing writers (setEmpPerms · p24.setGrant): the stored record is exactly what was chosen. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const A = 'TEST_ONLY_A', KP = 'bassam_perms_v1', KG = 'bsdept:' + A + ':bassam_grants_v1';
const readK = (lab, k) => JSON.parse(lab.env.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', k).map((r) => r.v).join('') || 'null');
async function setPerms(lab, f) {
  const P = readK(lab, KP); f(P);
  await lab.env.DB.batch([lab.env.DB.prepare('DELETE FROM kv WHERE k=?1').bind(KP), ...lab.W.kvPutStmts(lab.env, 'kv', KP, JSON.stringify(P)), lab.env.DB.prepare('UPDATE revs SET rev=rev+1 WHERE k=?1').bind(KP)]);
}
async function dialog(b, lab, who) {
  const s = await openAs(b, lab, LAB.superUn, LAB.superPw); s.page.setDefaultTimeout(15000); const p = s.page;
  await s.go('#/sysadmin/org/' + A, 3000);
  await p.locator('main [aria-label="أقسام صفحة العقدة"] button', { hasText: 'المسؤولون والحسابات' }).first().click(); await p.waitForTimeout(800);
  const r = p.locator('main .mk.ac7 .adm-tr.g-us', { hasText: who }).filter({ has: p.locator('.adm-rmb') }).first();
  await r.locator('.adm-rmb').click(); await p.waitForTimeout(400);
  await r.locator('[data-bs-dd] [role=menuitem]', { hasText: 'تعديل الصلاحيات' }).first().click(); await p.waitForTimeout(1200);
  const D = p.locator('[role=dialog]').last();
  const txt = async (sel) => ((await D.locator(sel).count()) ? (await D.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim() : '');
  const save = async () => { await D.locator('button', { hasText: 'حفظ الصلاحيات' }).click(); await p.waitForTimeout(1500); await lab.idle(); };
  return { s, p, D, txt, save };
}

test('V7 P3 · legacy: a new grant is «عرض» alone; stored grants stay; review before save; explicit return to inheritance', { timeout: 600000 }, async () => {
  const lab = await startLab({ mode: 'legacy' }); const b = await chromium.launch();
  try {
    let v = await dialog(b, lab, 'TEST_ONLY موظف أ');
    assert.match(await v.txt('[data-ed="sources"]'), /الدور: موظف/); assert.match(await v.txt('[data-ed="sources"]'), /الأساس: بلا منح/);
    assert.equal(await v.D.locator('[data-ed="review"]').count(), 0, 'nothing to review on open');
    await v.D.locator('[data-bs="permtree"] button', { hasText: 'فرد الكل' }).click(); await v.p.waitForTimeout(400);
    const leaf = v.D.locator('[data-bs="permtree"] > div', { hasText: 'المهام' }).filter({ has: v.p.locator('span[title]') }).last();
    assert.match(await leaf.locator('span[title]').first().getAttribute('title'), /^منحُ العرض وحده/);
    await leaf.locator('span[title]').first().click(); await v.p.waitForTimeout(400);
    const rv = await v.txt('[data-ed="review"]');
    assert.match(rv, /سيُضاف/); assert.match(rv, /المهام — عرض$/, 'review: only «عرض» on «المهام»: ' + rv); assert.doesNotMatch(rv, /إضافة|تعديل|حذف|اعتماد|تصدير/);
    await v.save();
    assert.deepEqual(readK(lab, KP).emps[A].TEST_ONLY_eA1, { tasks: ['view'] }, 'stored: view alone');
    assert.deepEqual(v.s.errs, []); await v.s.ctx.close();

    /* a stored six-act grant is shown and kept: «تحديد الكل» adds «عرض» to the others and leaves «المهام» as it is */
    await setPerms(lab, (P) => { P.emps[A] = { TEST_ONLY_eA1: { tasks: ['view', 'add', 'edit', 'del', 'approve', 'export'] } }; });
    v = await dialog(b, lab, 'TEST_ONLY موظف أ');
    assert.equal(await v.D.locator('[data-ed="review"]').count(), 0, 'a stored grant is not re-interpreted on open');
    await v.D.locator('[data-bs="permtree"] button', { hasText: 'تحديد الكل' }).click(); await v.p.waitForTimeout(500);
    const rv2 = await v.txt('[data-ed="review"]');
    assert.doesNotMatch(rv2, /سيُسحب/, 'select-all withdraws nothing'); assert.doesNotMatch(rv2, /المهام —/, '«المهام» is not touched');
    await v.save();
    const sh = readK(lab, KP).emps[A].TEST_ONLY_eA1;
    assert.deepEqual(sh.tasks, ['view', 'add', 'edit', 'del', 'approve', 'export'], 'the stored six acts kept');
    assert.ok(Object.keys(sh).filter((k) => k !== 'tasks').every((k) => JSON.stringify(sh[k]) === '["view"]'), 'every other leaf: «عرض» alone');
    assert.deepEqual(v.s.errs, []); await v.s.ctx.close();

    /* a unit manager: inheriting (no sheet) → narrowed → «إعادة إلى التوريث» */
    v = await dialog(b, lab, 'TEST_ONLY مدير أ');
    assert.match(await v.txt('[data-ed="sources"]'), /الأساس: توريثُ سقف الإدارة/);
    assert.equal(await v.D.locator('[data-ed="inherit"]').count(), 0, 'already inheriting');
    await v.D.locator('[data-bs="permtree"] button', { hasText: 'فرد الكل' }).click(); await v.p.waitForTimeout(400);
    await v.D.locator('[data-bs="permtree"] > div', { hasText: 'المهام' }).filter({ has: v.p.locator('span[title]') }).last().locator('span[title]').first().click(); await v.p.waitForTimeout(400);
    assert.match(await v.txt('[data-ed="review"]'), /سيُسحب.*المهام — كلُّها/);
    await v.save(); assert.ok(readK(lab, KP).emps[A]['mgr:' + A], 'narrowed: an own sheet'); await v.s.ctx.close();
    v = await dialog(b, lab, 'TEST_ONLY مدير أ');
    await v.D.locator('[data-ed="inherit"]').click(); await v.p.waitForTimeout(400);
    assert.match(await v.txt('[data-ed="review"]'), /سيُضاف.*المهام/);
    await v.save(); assert.equal(readK(lab, KP).emps[A]['mgr:' + A], undefined, 'back to inheriting: the sheet is removed');
    assert.deepEqual(v.s.errs, []); await v.s.ctx.close();
  } finally { await b.close(); await lab.close(); }
});

test('V7 P3 · enforce: a new leaf grant is its view key alone; the review names the keys; the explicit grant holds exactly that', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    const v = await dialog(b, lab, 'TEST_ONLY موظف أ');
    assert.match(await v.txt('[data-ed="sources"]'), /المنح الصريح: لا شيء فوق الأساس/);
    await v.D.locator('[data-t24="expall"]').click(); await v.p.waitForTimeout(500);
    const chk = v.D.locator('[data-t24l="tasks"] [data-t24="leafchk"]');
    assert.match(await chk.getAttribute('title'), /^منحُ مفتاح العرض وحده/);
    await chk.click(); await v.p.waitForTimeout(500);
    const rv = await v.txt('[data-ed="review"]');
    assert.match(rv, /سيُضاف بند واحد/, rv); assert.doesNotMatch(rv, /سيُسحب/);
    await v.save();
    const G = readK(lab, KG);
    assert.deepEqual(G.emp.TEST_ONLY_eA1.plus, ['task.view'], 'the explicit grant: task.view alone');
    assert.deepEqual(G.emp.TEST_ONLY_eA1.minus, []);
    /* a partial leaf is withdrawn by its checkbox, never silently widened */
    const v2 = await dialog(b, lab, 'TEST_ONLY موظف أ');
    await v2.D.locator('[data-t24="expall"]').click(); await v2.p.waitForTimeout(500);
    assert.match(await v2.D.locator('[data-t24l="tasks"] [data-t24="leafchk"]').getAttribute('title'), /^إلغاءُ كلّ مفاتيح الورقة/);
    await v2.D.locator('[data-t24="all"]').click(); await v2.p.waitForTimeout(600);
    const rv2 = await v2.txt('[data-ed="review"]');
    assert.doesNotMatch(rv2, /سيُسحب/); assert.doesNotMatch(rv2, /إنشاء مهمة|تعديل مهمة|حذف مهمة/, 'select-all adds view keys only: ' + rv2);
    await v2.save();
    /* what select-all granted: view keys and the keys derived from them (field.view ⇒ lens status changes), nothing else; the
       result does not depend on leaf order (independent review) */
    const R = JSON.parse(fs.readFileSync(new URL('../../src/permissions/registry/registry-v24.9.json', import.meta.url), 'utf8')), T = {}; R.registry.forEach((e) => { T[e.key] = e.type; });
    const plus = readK(lab, KG).emp.TEST_ONLY_eA1.plus, DER = ['lens.zones.status.change', 'lens.gates.status.change', 'lens.marks.status.change'];
    assert.ok(plus.includes('task.view') && plus.length > 5, JSON.stringify(plus));
    assert.deepEqual(plus.filter((k) => T[k] !== 'access' && T[k] !== 'view' && !DER.includes(k)), [], 'no act beyond view was granted');
    /* the sources line names the keys derived from field.view, granted here by explicit grant (live acceptance FAIL: «لا شيء») */
    const v3 = await dialog(b, lab, 'TEST_ONLY موظف أ'); const src = await v3.txt('[data-ed="sources"]');
    assert.match(src, /المفاتيح المشتقة: تغيير حالة المصلى [·-] تغيير حالة البوابة [·-] تغيير حالة العلامة\/المعلم — من «الوصول إلى رصد الميدان»/, src);
    assert.deepEqual(v3.s.errs, []); await v3.s.ctx.close();
    assert.deepEqual(v.s.errs, []); assert.deepEqual(v2.s.errs, []);
    await v.s.ctx.close(); await v2.s.ctx.close();
  } finally { await b.close(); await lab.close(); }
});
