/* V7 · د7 (ج) — بنود الواجهة المؤجَّلة من د6: ٧ «نسخة الإدارة» المعطّلة · ٩ حذفُ «قسم» باسم نوعه · ١٤ العنوانُ غيرُ المتاح ← «صفحتي» ·
   ١٠ الجوال (iPhone 13): الأشرطةُ تبدأ من الشهر واليوم الحاليين، الشارةُ بلا قصّ، وحقلا رئيس الوردية ونائبه بلا سحب ·
   اسمُ الملف المنزَّل (القالب وتصديرٌ آخر) ينتهي بـ .xlsx. المختبرُ المعزول (العاملُ الحقيقي · TEST_ONLY · بلا شبكة). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';
import { replaceOperationalFixture } from '../unit/operational_legacy_seed_fx.mjs';
const { devices } = createRequire(process.env.KIVO_PLAYWRIGHT || (execSync('npm root -g').toString().trim() + '/'))('playwright');
const PHONE = devices['iPhone 13'];
const phoneCtx = { viewport: PHONE.viewport, context: { userAgent: PHONE.userAgent, deviceScaleFactor: PHONE.deviceScaleFactor, isMobile: true, hasTouch: true } };

test('(٧) «نسخة الإدارة» لإدارةٍ غيرِ نشطة: معطّلةٌ فعلاً وشكلُها معطّل، وتحتها سطرٌ ظاهر «بدّل إلى هذه الإدارة أولاً»', { timeout: 300000 }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw), p = s.page;
    const look = () => p.evaluate(() => {
      const x = Array.from(document.querySelectorAll('main button')).find((e) => e.textContent.trim() === 'نسخة الإدارة');
      if (!x) return null;
      const c = getComputedStyle(x), why = document.querySelector('main [data-dh="exp-why"]');
      return { dis: x.disabled, aria: x.getAttribute('aria-disabled'), op: +c.opacity, cur: c.cursor, why: why && why.offsetParent ? why.innerText : '' };
    });
    await p.evaluate(() => KIVO.BassamDepts.setActive('TEST_ONLY_A')).catch(() => {});
    await s.go('#/sysadmin/org/TEST_ONLY_A/data', 4500);
    const on = await look();
    assert.ok(on, 'the button exists on the active unit');
    assert.equal(on.dis, false, 'active unit: enabled');
    assert.equal(on.why, '', 'active unit: no «switch first» line');
    await s.go('#/sysadmin/org/TEST_ONLY_B/data', 4500);
    const off = await look();
    assert.ok(off, 'the button exists on the other unit');
    assert.equal(off.dis, true, 'other unit: the button is really disabled (the bare `disabled` attribute was dropped by the template)');
    assert.equal(off.aria, 'true');
    assert.ok(off.op < 0.6, 'faded: opacity ' + off.op);
    assert.equal(off.cur, 'not-allowed');
    assert.match(off.why, /بدّل إلى هذه الإدارة أولاً/, 'the reason is a visible line, not a tooltip only');
    /* المرورُ لا يلوّنه ولا يرفعه */
    const btn = p.locator('main button:has-text("نسخة الإدارة")').first();
    await btn.hover({ force: true }); await p.waitForTimeout(250);
    const hv = await btn.evaluate((e) => { const c = getComputedStyle(e); return { tr: c.transform, op: +c.opacity }; });
    assert.ok(hv.tr === 'none' && hv.op < 0.6, 'no hover lift on the disabled button: ' + JSON.stringify(hv));
    assert.deepEqual(s.errs, []);
  } finally { await b.close(); await lab.close(); }
});

test('(٩) حذفُ «قسم»: نافذةُ الجرد ورسالةُ النجاح وسجلُّ الحركة تسمّيه «قسماً» لا «إدارة»', { timeout: 300000 }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw), p = s.page, SEC = 'TEST_ONLY قسم أ١';
    await s.go('#/sysadmin/org/TEST_ONLY_A_S1/overview', 3500);
    await p.locator('main [data-org-tab="overview"] [data-og-act="delete"]').first().click();
    await p.waitForSelector('#bsCfm', { timeout: 10000 });
    const dlg = await p.evaluate(() => document.getElementById('bsCfm').innerText);
    assert.match(dlg, new RegExp('حذف قسم «' + SEC + '»'), 'the inventory dialog title names a section: ' + dlg);
    assert.doesNotMatch(dlg, /إدارة/, 'no «إدارة» anywhere in the section dialog: ' + dlg);
    if (await p.locator('#bsCfmTyped').count()) await p.fill('#bsCfmTyped', SEC);
    await p.click('#bsCfmOk');
    await p.waitForFunction((n) => document.body.innerText.includes('اعتمد الخادم حذف قسم «' + n + '»'), SEC, { timeout: 15000 });
    assert.ok(!(await p.evaluate(() => document.body.innerText)).includes('حذف إدارة «' + SEC), 'the success message does not call it «إدارة»');
    await lab.idle();
    /* سجلُّ الحركة: حدثُ «الإدارات» يُقرأ باسم الوحدة المحذوفة ونوعها (سجلُّها في فرق الحدث) — لا «عُدِّل — الإدارات» */
    await s.go('#/sysadmin/oplog', 4000);
    await p.waitForFunction((n) => document.querySelector('main') && document.querySelector('main').innerText.includes('حُذف القسم «' + n + '»'), SEC, { timeout: 20000 });
    assert.ok(!(await p.evaluate(() => document.querySelector('main').innerText)).includes('حُذفت الإدارة «TEST_ONLY قسم'), 'the log does not call the section «إدارة»');
    assert.deepEqual(s.errs, []);
  } finally { await b.close(); await lab.close(); }
});

test('(٩) حذفُ «إدارة» يبقى «إدارة» (النوعُ من جرد الخادم)', { timeout: 300000 }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw), p = s.page, B = 'TEST_ONLY إدارة ب';
    await s.go('#/sysadmin/org/TEST_ONLY_B/overview', 3500);
    await p.locator('main [data-org-tab="overview"] [data-og-act="delete"]').first().click();
    await p.waitForSelector('#bsCfm', { timeout: 10000 });
    const dlg = await p.evaluate(() => document.getElementById('bsCfm').innerText);
    assert.match(dlg, new RegExp('حذف إدارة «' + B + '»'), dlg);
    assert.doesNotMatch(dlg, /قسم/, dlg);
    await p.click('#bsCfmNo');
    assert.deepEqual(s.errs, []);
  } finally { await b.close(); await lab.close(); }
});

test('(١٤) عنوانٌ غيرُ متاح (نظامٌ مطفأ أو مجهول) يحوّل إلى «صفحتي» برسالة «هذه الصفحة غير متاحة لك» — والرجوعُ لا يعيده', { timeout: 300000 }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw), p = m.page;
    for (const bad of ['#/rasd', '#/custody', '#/emps', '#/notifications', '#/award', '#/zzqq']) {
      await m.go('#/employees', 2500);
      assert.equal(await p.evaluate(() => location.hash), '#/employees');
      await p.evaluate(() => { window.__d7msg = ''; const o = new MutationObserver(() => { if (document.body.innerText.includes('هذه الصفحة غير متاحة لك')) window.__d7msg = 'yes'; }); o.observe(document.body, { childList: true, subtree: true, characterData: true }); });
      await p.evaluate((h) => { location.hash = h; }, bad);
      await p.waitForFunction(() => location.hash === '#/profile' && !!document.querySelector('main [data-screen-label="صفحتي"]'), null, { timeout: 8000 })
        .catch(async () => { throw new Error(bad + ': stays at ' + (await p.evaluate(() => location.hash))); });
      await p.waitForFunction(() => window.__d7msg === 'yes', null, { timeout: 4000 }).catch(() => { throw new Error(bad + ': no «هذه الصفحة غير متاحة لك» message'); });
    }
    /* الرجوعُ من «صفحتي» يعود إلى الصفحة السابقة، لا إلى العنوان المرفوض */
    await p.goBack(); await p.waitForTimeout(2000);
    assert.notEqual(await p.evaluate(() => location.hash), '#/zzqq', 'the refused address is not left in the history');
    /* القواعدُ القائمة: الصفحةُ المتاحة تُفتح، وتبويبُ الإعدادات المتاح يُفتح كما هو */
    await m.go('#/dreport', 2500); assert.equal(await p.evaluate(() => location.hash), '#/dreport');
    await m.go('#/admin/backup', 2500); assert.equal(await p.evaluate(() => location.hash), '#/admin/backup');
    assert.deepEqual(m.errs, []);
    /* مديرُ المنصة في «مركز إدارة رشاد»: عنوانٌ مجهول ← «صفحتي» */
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw);
    await s.go('#/sysadmin/org/platform/overview', 2500);
    await s.page.evaluate(() => { location.hash = '#/zzqq'; });
    await s.page.waitForFunction(() => location.hash === '#/profile', null, { timeout: 8000 });
    assert.deepEqual(s.errs, []);
  } finally { await b.close(); await lab.close(); }
});

/* ── ١٠ · الجوال ── */
const inView = (p) => p.evaluate(() => [...document.querySelectorAll('[data-strip-cur="true"]')].filter((e) => e.offsetParent).map((e) => {
  const r = e.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), vw: innerWidth, t: e.innerText.replace(/\s+/g, ' ').trim().slice(0, 24) };
}));
const header = (p) => p.evaluate(() => {
  const btn = document.querySelector('main button[title="السنة السابقة"]'); if (!btn) return null;
  const h = btn.closest('.bs-hbar'), r = h.getBoundingClientRect();
  const kids = [...h.children].map((x) => { const q = x.getBoundingClientRect(); return { l: q.left, r: q.right }; });
  return { over: h.scrollWidth - h.clientWidth, inside: kids.every((q) => q.l >= r.left - 1 && q.r <= r.right + 1), txt: h.innerText.replace(/\s+/g, ' ') };
});

test('(١٠) iPhone 13: كلُّ شريط أشهرٍ وأيامٍ يبدأ عند الشهر واليوم الحاليين · شارةُ الأيام المسجّلة بلا قصّ', { timeout: 600000 }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw, phoneCtx), p = m.page;
    for (const [h, n] of [['#/daily', 2], ['#/dreport', 2], ['#/dstats', 2], ['#/plan', 1], ['#/staffing', 1], ['#/tasks', 1]]) {
      await m.go(h, 4500);
      assert.equal(await p.evaluate(() => location.hash.split('/')[1]), h.split('/')[1], h + ' opens');
      const cur = await inView(p);
      assert.ok(cur.length >= n, h + ': ' + n + ' strip card(s) marked current: ' + JSON.stringify(cur));
      for (const c of cur) assert.ok(c.l >= 0 && c.r <= c.vw, h + ': the current card «' + c.t + '» is on screen without swiping: ' + JSON.stringify(c));
      const hd = await header(p);
      assert.ok(hd && hd.over <= 0 && hd.inside, h + ': the year header (with «يوماً مسجّلاً» where shown) is not clipped: ' + JSON.stringify(hd));
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0, h + ': no page-level horizontal scroll');
    }
    /* لا يعاند المستخدم: سحبُ الشريط يدوياً ثم اختيارُ شهرٍ آخر يبقي الشريط حيث تركه */
    await m.go('#/daily', 4000);
    const sl = await p.evaluate(() => { const e = document.querySelector('[data-strip-cur="true"]'); let n = e.parentElement; while (n && getComputedStyle(n).overflowX !== 'auto') n = n.parentElement; n.scrollLeft = 0; return n.scrollLeft; });
    await p.evaluate(() => { const cards = [...document.querySelectorAll('[data-strip-cur]')]; cards[0].click(); });
    await p.waitForTimeout(1500);
    const sl2 = await p.evaluate(() => { const e = document.querySelector('[data-strip-cur]'); let n = e.parentElement; while (n && getComputedStyle(n).overflowX !== 'auto') n = n.parentElement; return n.scrollLeft; });
    assert.ok(Math.abs(sl2 - sl) < 2, 'the strip stays where the user left it: ' + sl + ' → ' + sl2);
    assert.deepEqual(m.errs, []);
  } finally { await b.close(); await lab.close(); }
});

test('(١٠) على كل الأحجام: الحاسوبُ الضيّق (1024) يبدأ عند الشهر الحالي أيضاً', { timeout: 300000 }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw, { viewport: { width: 1024, height: 800 } }), p = m.page;
    await m.go('#/daily', 4500);
    const cur = await inView(p);
    assert.ok(cur.length >= 1, JSON.stringify(cur));
    for (const c of cur) assert.ok(c.l >= 0 && c.r <= c.vw, 'on screen: ' + JSON.stringify(c));
    assert.deepEqual(m.errs, []);
  } finally { await b.close(); await lab.close(); }
});

test('(١٠) iPhone 13 · التقرير اليومي: حقلا «رئيس الوردية» و«نائبه» سطران كاملا العرض بلا سحبٍ أفقي', { timeout: 300000 }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  lab.env.KIVO_TEST_FIXTURE = 'allow'; lab.env.KIVO_TEST_HOST = 'lab.local';   /* أداةُ بيانات العرض على مضيف المختبر وحده (كما في v7_d5e_demo_pages) */
  try {
    const su = await openAs(b, lab, LAB.superUn, LAB.superPw);
    const seed = await su.api('/api/demo-data', { method: 'POST', body: JSON.stringify({ act: 'seed', reveal: true }) });
    assert.equal(seed.status, 200, JSON.stringify(seed.j && seed.j.err));
    const m1 = seed.j.secrets.find((x) => x.id === 'tst_demo_u_m1'); assert.ok(m1);
    const m = await openAs(b, lab, m1.un, m1.pw, phoneCtx), p = m.page;
    await m.go('#/dreport', 5000);
    const r = await p.evaluate(() => {
      const lead = [...document.querySelectorAll('main span')].filter((x) => /رئيس.*الوردية/.test(x.textContent) && x.children.length === 0).map((x) => x.parentElement);
      if (lead.length < 2) return { n: lead.length };
      const row = lead[0].parentElement, R = row.getBoundingClientRect();
      const box = lead.map((x) => { const q = x.getBoundingClientRect(); return { l: Math.round(q.left), r: Math.round(q.right), t: Math.round(q.top), w: Math.round(q.width) }; });
      return { n: lead.length, over: row.scrollWidth - row.clientWidth, rowW: Math.round(R.width), box, vw: innerWidth, doc: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    assert.equal(r.n, 2, 'the two leader fields are shown: ' + JSON.stringify(r));
    assert.ok(r.over <= 0, 'the shift row does not scroll sideways: ' + JSON.stringify(r));
    for (const q of r.box) assert.ok(q.l >= 0 && q.r <= r.vw, 'each leader field is on screen: ' + JSON.stringify(r));
    assert.ok(r.box[0].t !== r.box[1].t, 'chief and deputy are on two lines: ' + JSON.stringify(r));
    for (const q of r.box) assert.ok(q.w >= r.rowW - 2, 'full row width: ' + JSON.stringify(r));
    assert.equal(r.doc, 0);
    assert.deepEqual(m.errs, []);
  } finally { await b.close(); await lab.close(); }
});

test('اسمُ الملف المنزَّل: قالبُ استيراد الموظفين وتصديرُ «موظفو الإدارة» باسمَيهما وامتداد .xlsx (لا «download»)', { timeout: 300000 }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    await replaceOperationalFixture(lab.env, 'bsdept:TEST_ONLY_A:bassam_employees_v1', []);
    const s = await openAs(b, lab, LAB.mgrA, LAB.pw, { context: { acceptDownloads: true } }), p = s.page;
    await s.go('#/employees', 4000);
    const tpl = p.locator('[data-emp-imp="empty-tpl"]'); await tpl.waitFor({ timeout: 15000 });
    const d1p = p.waitForEvent('download', { timeout: 20000 }); await tpl.click();
    const d1 = await d1p;
    assert.equal(d1.suggestedFilename(), 'أعمدة-استيراد-الموظفين.xlsx');
    assert.match(d1.suggestedFilename(), /\.xlsx$/);
    /* تصديرٌ آخر بالدالة المشتركة نفسها: «ملفات ← تصدير Excel» في «موظفو الإدارة» (إدارة ب، فيها موظفون) */
    const t = await openAs(b, lab, LAB.mgrB, LAB.pw, { context: { acceptDownloads: true } }), q = t.page;
    await t.go('#/employees', 4500);
    await q.locator('main button', { hasText: 'ملفات' }).first().click(); await q.waitForTimeout(500);
    const d2p = q.waitForEvent('download', { timeout: 20000 });
    await q.getByText('تصدير Excel', { exact: true }).first().click();
    const d2 = await d2p;
    assert.match(d2.suggestedFilename(), /^employees-[\d-]+\.xlsx$/, d2.suggestedFilename());
    assert.deepEqual(s.errs, []); assert.deepEqual(t.errs, []);
  } finally { await b.close(); await lab.close(); }
});
