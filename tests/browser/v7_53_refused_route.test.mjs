/* V7 · 53 — بند (ج) من رد المالك REPLY_D7_1: عنوانٌ مرفوض عند فتحه مباشرةً أو عند إعادة التحميل — متصفحٌ حقيقي على المختبر (TEST_ONLY).
   كان: التحميلُ الأول يرتدّ بصمت إلى الصفحة المحفوظة (لا رسالة، ولا «صفحتي»). المطلوب: انتظارُ الصلاحيات ثم القرار —
     ① مديرُ إدارة يفتح «مركز إدارة رشاد» مباشرةً ⇒ «صفحتي» برسالة «هذه الصفحة غير متاحة لك»، ولا يُرسم شيءٌ من المركز قبل القرار.
     ② الشيءُ نفسُه عند إعادة التحميل على العنوان المرفوض.
     ③ والمسموحُ يُعرض: مديرُ المنصة يفتح المركز مباشرةً وبإعادة التحميل فيبقى عليه بلا رسالة. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const MSG = 'هذه الصفحة غير متاحة لك';
/* يُزرع قبل أي كود في كل تحميل: يسجّل كلَّ رسالة توست، وهل ظهر مكوّنُ المركز (Admin) في أي لحظة */
const WATCH = () => {
  window.__seen = { admin: false, toasts: [] };
  const look = () => {
    if (document.querySelector('[data-sc-name="Admin"]')) window.__seen.admin = true;
    for (const id of ['bs-toast', 'bs-stoast']) { const t = document.getElementById(id); if (t && t.textContent && !window.__seen.toasts.includes(t.textContent)) window.__seen.toasts.push(t.textContent); }
  };
  new MutationObserver(look).observe(document, { childList: true, subtree: true, characterData: true });
};

test('عنوانٌ مرفوض عند الفتح المباشر وعند إعادة التحميل ⇒ «صفحتي» برسالة ولا شيء من الصفحة قبل القرار — والمسموحُ يُعرض', { timeout: 600000 }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    const at = async (s) => s.page.evaluate(() => ({ hash: location.hash, seen: window.__seen }));
    const settle = async (s, want) => { for (let i = 0; i < 40; i++) { const x = await at(s); if (want(x)) return x; await s.page.waitForTimeout(250); } return at(s); };

    /* ① مدير الإدارة: فتحٌ مباشر للعنوان المرفوض */
    const mgr = await openAs(b, lab, LAB.mgrA, LAB.pw, { onPage: (p) => p.addInitScript(WATCH) });
    await mgr.page.goto(lab.base + '/#/sysadmin/overview', { waitUntil: 'domcontentloaded' });
    let x = await settle(mgr, (v) => v.seen && v.seen.toasts.some((t) => t.includes(MSG)));
    assert.ok(x.seen.toasts.some((t) => t.includes(MSG)), '① the message is shown: ' + JSON.stringify(x));
    assert.equal(x.hash, '#/profile', '① redirected to «صفحتي»');
    assert.equal(x.seen.admin, false, '① nothing of the refused page was drawn before the decision');
    /* ② إعادةُ التحميل على العنوان المرفوض */
    await mgr.page.evaluate(() => { history.replaceState(null, '', location.pathname + '#/sysadmin/overview'); });
    await mgr.page.reload({ waitUntil: 'domcontentloaded' });
    x = await settle(mgr, (v) => v.seen && v.seen.toasts.some((t) => t.includes(MSG)));
    assert.ok(x.seen.toasts.some((t) => t.includes(MSG)), '② the message is shown after reload: ' + JSON.stringify(x));
    assert.equal(x.hash, '#/profile'); assert.equal(x.seen.admin, false, '② nothing of the refused page before the decision');
    assert.deepEqual(mgr.errs, []);

    /* ③ مديرُ المنصة: المسموحُ يُعرض — فتحٌ مباشر ثم إعادةُ تحميل */
    const su = await openAs(b, lab, LAB.superUn, LAB.superPw, { onPage: (p) => p.addInitScript(WATCH) });
    await su.page.goto(lab.base + '/#/sysadmin/overview', { waitUntil: 'domcontentloaded' });
    x = await settle(su, (v) => v.seen && v.seen.admin);
    assert.ok(x.seen.admin && /^#\/sysadmin/.test(x.hash), '③ the allowed page is shown: ' + JSON.stringify(x));
    await su.page.reload({ waitUntil: 'domcontentloaded' });
    x = await settle(su, (v) => v.seen && v.seen.admin);
    assert.ok(x.seen.admin && /^#\/sysadmin/.test(x.hash), '③ and after reload: ' + JSON.stringify(x));
    await su.page.waitForTimeout(1500); x = await at(su);
    assert.ok(!x.seen.toasts.some((t) => t.includes(MSG)), '③ no refusal message for an allowed page');
    assert.deepEqual(su.errs, []);
  } finally { await b.close(); await lab.close(); }
});
