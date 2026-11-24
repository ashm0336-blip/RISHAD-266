/* V7 · د6 (walkfix2 · قرار المالك: قاعدةٌ واحدة لكل من في الوحدة عدا مدير المنصة) — في المختبر المعزول (TEST_ONLY، بلا شبكة) على العامل الحقيقي:
   الموظفُ ومديرُ الإدارة وحسابُ الإدارة يفتحون كلَّ بندٍ في قائمتهم و«صفحتي» والمهامُ مطفأةٌ لإدارتهم، ثم و«المهام» و«الخطة التشغيلية» مطفأتان على المنصة:
   لا طلبَ يُرفض (لا 4xx) من فتح الصفحات، ولا طلبَ لـ«مهامي» أصلاً؛ والخادمُ يرفضها لو طُلبت (الضابط). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const A = 'TEST_ONLY_A', B = 'TEST_ONLY_B', G = 'TEST_ONLY_G', S1 = 'TEST_ONLY_A_S1';
const FULL = ['dstats', 'planning', 'staff', 'plan', 'daily', 'dreport', 'tasks', 'irshad', 'seized', 'award', 'links', 'help', 'admin', 'emps'];
async function put(lab, k, v) {
  const DB = lab.env.DB;
  await DB.batch([DB.prepare('DELETE FROM kv WHERE k=?1').bind(k), ...lab.W.kvPutStmts(lab.env, 'kv', k, JSON.stringify(v)), DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,1) ON CONFLICT(k) DO UPDATE SET rev=rev+1').bind(k)]);
}
const caps = (lab, a) => put(lab, 'bassam_perms_v1', { caps: { [G]: FULL, [A]: a, [B]: FULL, [S1]: a }, subs: {}, emps: {} });
const log0 = console.log; console.log = (...a) => { if (typeof a[0] === 'string' && a[0].startsWith('{"v":1,"t":')) return; log0(...a); };
function watch(s) {
  const seen = [];
  s.page.on('request', (r) => { try { const u = new URL(r.url()); if (u.pathname.startsWith('/api/')) seen.push(r.method() + ' ' + u.pathname); } catch (e) { /* ليس لنا */ } });
  s.page.on('response', (r) => { if (r.status() >= 400) seen.push('!' + r.status() + ' ' + new URL(r.url()).pathname); });
  return { mark: () => seen.length, since: (n, rx) => seen.slice(n).filter((x) => rx.test(x)) };
}
/* كلُّ بندٍ في القائمة الجانبية ثم «صفحتي» — بإعادة تحميلٍ أولاً (الحالةُ الجديدة تُقرأ من الخادم) */
async function walkMenu(s) {
  await s.page.reload({ waitUntil: 'domcontentloaded' }); await s.page.waitForSelector('aside.bsb nav.s-nav', { timeout: 30000 }); await s.page.waitForTimeout(2500);
  const keys = await s.page.evaluate(() => [...document.querySelectorAll('aside.bsb a.n[data-key]')].filter((a) => a.getBoundingClientRect().width > 0).map((a) => a.getAttribute('data-key')));
  for (const k of keys) { await s.page.locator('aside.bsb a.n[data-key="' + k + '"]').first().click(); await s.page.waitForTimeout(2200); }
  await s.go('#/profile', 3000);
  return keys;
}

test('V7 · د6 (walkfix2) · employee and managers open every page of their menu and «صفحتي» with tasks OFF for their unit, then with containers OFF on the platform: no refused request, no request for «مهامي»', { timeout: 900000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    await caps(lab, FULL);
    const S = { emp: await openAs(b, lab, LAB.empA, LAB.pw), mgr: await openAs(b, lab, LAB.mgrA, LAB.pw), dm: await openAs(b, lab, LAB.dmA, LAB.pw) };
    const Wt = Object.fromEntries(Object.entries(S).map(([k, s]) => [k, watch(s)]));
    /* ON (الضابط): «صفحتي» تطلب «مهامي» */
    let n = Wt.emp.mark(); await walkMenu(S.emp);
    assert.ok(Wt.emp.since(n, /^GET \/api\/me\/tasks$/).length > 0, 'ON: «صفحتي» reads «مهامي»');
    for (const [label, apply] of [['tasks OFF for the unit', () => caps(lab, FULL.filter((k) => k !== 'tasks'))],
      ['tasks and «الخطة التشغيلية» OFF on the platform', async () => { await caps(lab, FULL); await put(lab, 'bassam_platform_v1', { mods: { off: ['tasks', 'planning'] } }); }]]) {
      await apply();
      for (const [who, s] of Object.entries(S)) {
        n = Wt[who].mark(); const keys = await walkMenu(s);
        if (who !== 'emp') assert.ok(keys.length > 0, who + ': has a menu');   /* الموظفُ بلا دور: «صفحتي» وحدها */
        assert.ok(!keys.includes('tasks'), label + ': ' + who + ' has no «المهام» link');
        assert.deepEqual(Wt[who].since(n, /^!4\d\d /), [], label + ': ' + who + ' — no refused request from opening ' + keys.join(' · ') + ' · profile');
        assert.deepEqual(Wt[who].since(n, /\/api\/me\/tasks/), [], label + ': ' + who + ' — «مهامي» is not requested');
      }
      /* الضابط: الخادمُ يرفضها لو طُلبت — للموظف وللمدير معاً */
      for (const who of ['emp', 'mgr']) {
        const st = await S[who].page.evaluate(async () => (await fetch('/api/me/tasks', { credentials: 'same-origin' })).status);
        assert.equal(st, 403, label + ': the server refuses «مهامي» for ' + who);
      }
    }
    assert.deepEqual(Object.values(S).flatMap((s) => s.errs).filter((x) => !/ResizeObserver|403/.test(x)), [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});
