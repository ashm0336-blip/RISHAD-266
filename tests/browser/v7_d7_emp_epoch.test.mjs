/* V7 · د7 — «409 restore-epoch-changed» عند إضافة موظف مباشرةً بعد حذف (المختبر المعزول · العاملُ الحقيقي · الإنفاذ · TEST_ONLY).
   السببُ الجذري: الحذفُ (POST /api/employees/transition) يرفع حقبةَ الاستعادة في الخادم (019e bumpEpoch)، وطبقةُ الحفظ (280) كانت تعلّم
   مفاتيحَ الإيصال «من فعلي» (mine) وتُبقي حقبتَها القديمة حتى يصل إشعارُ التغييرات — فالإضافةُ قبل وصوله ترسل الحقبةَ القديمة ⇒ 409.
   ليكون الاختبارُ حتمياً يُؤخَّر إشعارُ التغييرات (/api/changes) كما يتأخّر على شبكةٍ بطيئة؛ الإضافةُ تُنفَّذ فور إغلاق نافذة الحذف. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const K = (d) => 'bsdept:' + d + ':bassam_employees_v1';
const empsOf = async (s, d) => { const r = await s.api('/api/operations/read?keys=' + encodeURIComponent(K(d))); return (r.j && r.j.resources && r.j.resources[K(d)]) || []; };
const until = async (fn, what, ms = 20000) => { const t0 = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t0 > ms) throw new Error('timed out waiting for ' + what); await new Promise((r) => setTimeout(r, 150)); } };
const norm = (x) => x.replace(/[‎‏‪-‮⁦-⁩]/g, '').replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660)).replace(/\s+/g, ' ').trim();

test('V7 · د7 — delete an employee, then add one immediately: the save is accepted (200), no restore-epoch-changed', { timeout: 300000 }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    const D = 'TEST_ONLY_A', s = await openAs(b, lab, LAB.mgrA, LAB.pw), p = s.page; p.setDefaultTimeout(15000);
    /* إشعارُ التغييرات يتأخّر (شبكةٌ بطيئة) — فلا يجدّد طبقةَ الحفظ قبل الإضافة */
    await p.route(/\/api\/changes/, async (route) => { await new Promise((r) => setTimeout(r, 20000)); await route.continue().catch(() => {}); });
    const before = await empsOf(s, D);
    assert.ok(before.length >= 2, 'the lab department has employees');
    const victim = before[0].name;
    await s.go('#/employees', 4000);
    await until(() => p.evaluate((n) => [...document.querySelectorAll('main table tbody tr')].some((r) => r.innerText.includes(n)), victim), 'the row');
    await p.evaluate((n) => { const tr = [...document.querySelectorAll('main table tbody tr')].find((r) => r.innerText.includes(n)); tr.setAttribute('data-qa-row', '1'); }, victim);
    const row = p.locator('main tr[data-qa-row="1"]');
    await row.locator('button[title="إجراءات هذا السجل"]').click();
    await row.locator('button[title="حذف"]').click();
    const ok = p.locator('button', { hasText: 'تأكيد الحذف' }); await ok.waitFor();
    await until(async () => !(await ok.isDisabled()), 'the delete review');
    const del = p.waitForResponse((r) => /\/api\/employees\/transition/.test(r.url()) && r.request().method() === 'POST');
    await ok.click();
    assert.equal((await del).status(), 200, 'the delete is accepted');
    await until(async () => !(await p.locator('button', { hasText: 'تأكيد الحذف' }).count()), 'the dialog to close');
    /* فوراً: إضافةُ موظف */
    await p.locator('main button[title="إضافة موظف"]').click();
    await p.locator('input[placeholder="مثال: أحمد بن سالم الحربي"]').fill('TEST_ONLY مضاف بعد الحذف');
    const save = p.waitForResponse((r) => /\/api\/(save|operations)/.test(r.url()) && r.request().method() === 'POST');
    await p.locator('button', { hasText: /^\s*(إضافة|إضافة الموظف|حفظ)\s*$/ }).last().click();
    const res = await save, body = await res.text();
    assert.equal(res.status(), 200, 'the add right after the delete is accepted: ' + body.slice(0, 200));
    assert.doesNotMatch(body, /restore-epoch-changed/);
    await lab.idle();
    const after = await empsOf(s, D);
    assert.ok(after.some((e) => e.name === 'TEST_ONLY مضاف بعد الحذف'), 'the added employee is on the server');
    assert.ok(!after.some((e) => e.name === victim), 'the deleted employee stays deleted');
    assert.equal(after.length, before.length, 'one removed, one added');
    const text = norm(await p.evaluate(() => document.body.innerText));
    assert.doesNotMatch(text, /لم يصل تأكيد الحفظ|لم يُحفظ التغيير/, 'no save failure toast');
    assert.deepEqual(s.errs, [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});
