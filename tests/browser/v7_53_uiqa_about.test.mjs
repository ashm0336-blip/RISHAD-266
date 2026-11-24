/* V7 · 53 (uiqa) — البند 12: «المساعدة» زرٌّ يفتح نافذة «حول المنصة»، والنافذةُ تُغلق (إغلاق · Esc · أيُّ انتقال) ولا تبقى تحجب أزرار الصفحة.
   المختبرُ المعزول · العاملُ الحقيقي · TEST_ONLY. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const until = async (fn, what, ms = 10000) => { const t0 = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t0 > ms) throw new Error('timed out waiting for ' + what); await new Promise((r) => setTimeout(r, 100)); } };
const open = (p) => p.evaluate(() => !!document.getElementById('bs-plat-about'));

test('V7 · 53 — البند 12: «المساعدة» زرّ و«حول المنصة» نافذةٌ تُغلق بـEsc وعند الانتقال ولا تحجب شيئاً', { timeout: 240000 }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    /* «المساعدة» صفحةٌ في سقف الإدارة — تُضاف لسقف الإدارة أ */
    const cap = ['tasks', 'daily', 'dreport', 'admin', 'emps', 'dstats', 'staff', 'plan', 'help'], DB = lab.env.DB, K = 'bassam_perms_v1';
    const P = JSON.parse(DB.q("SELECT v FROM kv WHERE k=?1 ORDER BY seq", K).map((r) => r.v).join('')); P.caps.TEST_ONLY_A = cap; P.caps.TEST_ONLY_G = cap;   /* السقفُ يتقاطع مع سلسلة الأسلاف */
    await DB.batch([DB.prepare('DELETE FROM kv WHERE k=?1').bind(K), ...lab.W.kvPutStmts(lab.env, 'kv', K, JSON.stringify(P)), DB.prepare('UPDATE revs SET rev=rev+1 WHERE k=?1').bind(K)]);
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw), p = m.page; p.setDefaultTimeout(15000);
    await m.go('#/employees', 3000);
    await p.evaluate(() => { const o = document.getElementById('bs-plat-about'); if (o) o.remove(); });   /* «ما الجديد» مرةً لكل إصدار */
    const help = p.locator('aside.bsb .bs-plat-help');
    await help.waitFor();
    assert.equal(await help.getAttribute('role'), 'button', '«المساعدة» تفتح نافذةً — زرّ لا رابط');
    await help.click(); await until(() => open(p), 'the About dialog');
    assert.equal(await p.getAttribute('#bs-plat-about', 'role'), 'dialog');
    await p.keyboard.press('Escape');
    await until(async () => !(await open(p)), 'Esc closes the dialog');
    await help.click(); await until(() => open(p), 'the About dialog (2)');
    await p.evaluate(() => { location.hash = '#/profile'; });
    await until(async () => !(await open(p)), 'a navigation closes the dialog');
    await help.click(); await until(() => open(p), 'the About dialog (3)');
    await p.locator('#bsAboutX').click();
    await until(async () => !(await open(p)), '«إغلاق» closes the dialog');
    /* لا شيءَ فوق الصفحة: النقطةُ في وسط القائمة الجانبية تعود للقائمة نفسها */
    const top = await p.evaluate(() => { const a = document.querySelector('aside.bsb .bs-plat-help').getBoundingClientRect(); const e = document.elementFromPoint(a.left + a.width / 2, a.top + a.height / 2); return e ? (e.closest('.bs-plat-ov') ? 'overlay' : e.closest('aside.bsb') ? 'aside' : e.tagName) : 'none'; });
    assert.equal(top, 'aside', 'no overlay blocks the page');
    assert.deepEqual(m.errs, []);
  } finally { await b.close(); await lab.close(); }
});
