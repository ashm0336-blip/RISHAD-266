/* V7 · 53 (uiqa) — «بيانات الموظفين» في متصفحٍ حقيقي (المختبر المعزول · العاملُ الحقيقي · الإنفاذ · TEST_ONLY · بلا شبكة).
   البند 10: بعد اعتماد الاستيراد تظهر الصفوفُ الجديدة في الجدول فوراً بلا إعادة تحميل.
   البند 11: بعد «إضافة موظف» رسالةُ نجاحٍ بالشكل الموجود في المنصة (#bs-toast «✓»). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';
import { replaceOperationalFixture } from '../unit/operational_legacy_seed_fx.mjs';

const A = 'TEST_ONLY_A', TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'd53emp-'));
const HEAD = ['اسم الموظف', 'الجنس', 'رقم الهوية', 'الرقم الوظيفي', 'رقم الجوال', 'البريد الإلكتروني', 'نوع التوظيف', 'نوع العمل'];
const R = (name, nid) => [name, 'ذكر', nid || '', '', '', '', '', ''];
const until = async (fn, what, ms = 20000) => { const t0 = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t0 > ms) throw new Error('timed out waiting for ' + what); await new Promise((r) => setTimeout(r, 150)); } };
async function emps(s) { const k = 'bsdept:' + A + ':bassam_employees_v1'; const r = await s.api('/api/operations/read?keys=' + encodeURIComponent(k)); return (r.j && r.j.resources && r.j.resources[k]) || []; }
async function xlsx(p, rows, name) {
  const b64 = await p.evaluate(async (rows) => { const out = await KIVO.BassamXLSX.build(rows); const u = out instanceof Uint8Array ? out : new Uint8Array(out.buffer || out); let s = ''; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }, rows);
  const f = path.join(TMP, name); fs.writeFileSync(f, Buffer.from(b64, 'base64')); return f;
}
const tableHas = (p, n) => p.evaluate((n) => [...document.querySelectorAll('main table tbody tr')].some((r) => r.innerText.includes(n)), n);

test('V7 · 53 — البند 10: الاستيراد يحدّث جدولَ الموظفين فوراً · البند 11: رسالةُ نجاحٍ بعد إضافة موظف', { timeout: 300000 }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    const N = 500;   /* حجمُ الفحص الحي: 500 موظف (الترتيبُ يضع المستوردَ في صفحةٍ أخرى) */
    if (N) await replaceOperationalFixture(lab.env, 'bsdept:' + A + ':bassam_employees_v1', [{ eid: 'TEST_ONLY_eA1', name: 'TEST_ONLY موظف أ', nid: LAB.empA }, { eid: 'TEST_ONLY_eA2', name: 'TEST_ONLY موظف أ٢', nid: '1200000002' }].concat(Array.from({ length: N }, (_, i) => ({ eid: 'TEST_ONLY_n' + i, name: 'TEST_ONLY كثير ' + i, nid: String(1400000000 + i) }))));
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw), p = m.page; p.setDefaultTimeout(15000);
    await m.go('#/employees', 4000);
    await until(() => tableHas(p, 'TEST_ONLY موظف أ'), 'the table');
    /* ── البند 10 ── */
    const NEW = 'TEST_ONLY مستورد ٥٣';
    await p.locator('main button', { hasText: 'ملفات' }).first().click(); await p.waitForTimeout(500);
    const f = await xlsx(p, [HEAD, R(NEW, '1300005301')], 'd53.xlsx');
    const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 20000 }), p.locator('[data-emp-imp="menu"]').first().click()]);
    await fc.setFiles(f);
    await until(() => p.evaluate(() => !!document.querySelector('[data-imp="add"]') && !/جارٍ تأكيد/.test(document.body.innerText)), 'the preview');
    const res = p.waitForResponse((r) => /\/api\/employees\/transition/.test(r.url()) && r.request().method() === 'POST');
    await p.locator('[data-imp="add"]').click();
    assert.equal((await res).status(), 200, 'the import is accepted');
    await until(async () => (await emps(m)).some((e) => e.name === NEW), 'the row on the server');
    await until(() => tableHas(p, NEW), 'the imported row in the table without a reload', 8000);
    /* ── البند 11 ── */
    const ADD = 'TEST_ONLY مضاف ٥٣';
    await p.locator('main button[title="إضافة موظف"]').click();
    await p.locator('input[placeholder="مثال: أحمد بن سالم الحربي"]').fill(ADD);
    const save = p.waitForResponse((r) => /\/api\/(save|operations)/.test(r.url()) && r.request().method() === 'POST');
    await p.locator('button', { hasText: /^\s*(إضافة|إضافة الموظف|حفظ)\s*$/ }).last().click();
    assert.equal((await save).status(), 200);
    const t = await until(() => p.evaluate((n) => { const x = document.getElementById('bs-toast'); return x && x.textContent.includes('✓') && x.textContent.includes(n) ? x.textContent : ''; }, ADD), 'the success message', 8000);
    assert.match(t, /أُضيف/, t);
    assert.ok((await emps(m)).some((e) => e.name === ADD), 'the added employee is on the server');
    assert.deepEqual(m.errs, [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});
