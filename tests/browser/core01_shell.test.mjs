/* RISHAD CORE-01 · the App Shell in a real browser over the built package (lab: TEST_ONLY data, no network), desktop and mobile:
   (1) every role sees exactly the sidebar links it saw before CORE-01 (fixture captured on develop@34d5b8a);
   (2) the platform administrator keeps the same role label across a real unit switch, and platform pages are titled «المنصة»;
   (3) a unit switch with unsaved edits asks first and, when they cannot be saved, stays on the current unit;
   (4) no technical «الخادم» wording and no routine refresh button on the shared surfaces; dark theme applies;
   (5) mobile: the drawer and the unit picker open, nothing overflows sideways; no page errors anywhere. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const BEFORE = JSON.parse(fs.readFileSync(new URL('./fixtures/core01_nav_before.json', import.meta.url), 'utf8')).roles;

/* V7 · د5-ح (قرار المالك — موثَّق، اللقطةُ نفسُها لا تُعدَّل): النظامُ المطفأ لا يراه أحد ولا مديرُ المنصة. ما كانت القائمةُ تعرضه له باهتاً
   «خارج السقف» (صنفُ n out وتلميحُ «— خارج سقف «…» · مرئية لك بصلاحية المشرف») صار غائباً كما لغيره (n gone)، والتلميحُ اسمُ الصفحة وحده */
const OFF5H = (L) => (L || []).map((x) => { const [c, t, n] = x.split('|'), m = / — خارج سقف «[^»]*» - مرئية لك بصلاحية المشرف$/.exec(t || ''); return m ? [c.replace(' out', ' gone'), t.slice(0, m.index), n].join('|') : x; });
/* V7 · د5-ح (off2 — قرار المالك): «المساعدة» نظامٌ يُطفأ (help) وليست في سقف إدارة المختبر (أ) — فلا يراها مديرُ المنصة فيها (كانت له دائماً: 260 helpOk · root _pageAllowed) */
const NOHELP5H = (L) => (L || []).filter((x) => !/^n bs-plat-help\|/.test(x));
for (const h of Object.keys(BEFORE.super || {})) BEFORE.super[h] = NOHELP5H(OFF5H(BEFORE.super[h]));
const MOBILE = { viewport: { width: 390, height: 844 }, context: { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } };
/* V7 · د6 (م7 «رصد الحالات» — موثَّق كـOFF5H/NOHELP5H؛ اللقطةُ نفسُها لا تُعدَّل): نظامٌ لم يكن موجوداً يوم أُخذت اللقطة يُضاف رابطُه إلى القائمة
   مخفياً (n gone) ما دام مطفأً — مثلُ «رصد الحالات» (optIn: لا يفتحه السقفُ المفتوح). يُرفع من المقارنة مشتقّاً لا بالاسم: عنصرُ القائمة الذي يسمّي نظاماً
   من KIVO.Perm44.sysList() لا يرد اسمُه في اللقطة كلِّها، وهو مخفيّ، ونظامُه مطفأٌ لهذا الحامل الآن (BassamPerm.platOff · سقفُ الوحدة النشطة Perm44.ceiling،
   وبلا وحدةٍ نشطة: optIn) — ويُثبَّت ذلك لكلّ مرفوع. نظامٌ جديدٌ مفعّل (رابطُه ظاهر) يبقى في المقارنة فتفشل كما يجب */
const KNOWN_TXT = JSON.stringify(BEFORE);
const links = async (page) => {
  const r = await page.evaluate((known) => {
    const P4 = KIVO.Perm44, Pm = KIVO.BassamPerm, d = KIVO.BassamDepts && KIVO.BassamDepts.active ? KIVO.BassamDepts.active() : '';
    const on = d && P4 && P4.ceiling ? (P4.ceiling(d).on || []) : null, po = Pm && Pm.platOff ? Pm.platOff() : [], sys = P4 && P4.sysList ? P4.sysList() : [];
    const keep = [], drop = [];
    [...document.querySelectorAll('aside.bsb a, aside.bsb .n')].forEach((a) => {
      const cls = a.className || '', title = a.getAttribute('title') || '', txt = (a.textContent || '').replace(/\s+/g, ' ').trim(), e = cls + '|' + title + '|' + txt;
      const s = sys.filter((x) => x && x.name && (x.name === txt || x.name === title))[0];
      if (s && known.indexOf(s.name) === -1) {
        const off = po.indexOf(s.key) !== -1 || (on ? on.indexOf(s.key) === -1 : s.optIn === true);
        if (off && /(^|\s)gone(\s|$)/.test(cls)) { drop.push({ e, key: s.key, optIn: s.optIn === true, off, hidden: getComputedStyle(a).display === 'none' || a.getBoundingClientRect().width === 0 }); return; }
      }
      keep.push(e);
    });
    return { keep, drop };
  }, KNOWN_TXT);
  for (const x of r.drop) assert.ok(x.off && x.hidden && KNOWN_TXT.indexOf(x.e.split('|')[2]) === -1, 'a system the capture did not know is dropped only while OFF and hidden: ' + JSON.stringify(x));
  return r.keep;
};
const text = (page) => page.evaluate(() => document.body.innerText);
const cred = (who) => (who === 'super' ? [LAB.superUn, LAB.superPw] : [LAB[who], LAB.pw]);

test('desktop: link set per role unchanged; administrator identity fixed across a unit switch; safe switch; plain wording', { timeout: 600000 }, async () => {
  const b = await chromium.launch();
  try {
    for (const who of ['super', 'mgrA', 'dmA', 'empA']) {
      const lab = await startLab(); let s = null;
      try {
        s = await openAs(b, lab, ...cred(who)); s.page.setDefaultTimeout(15000);
        for (const h of ['#/kpis', '#/tasks', '#/profile']) {
          await s.go(h, 2500);
          assert.deepEqual(await links(s.page), BEFORE[who][h], who + ' ' + h + ': the same sidebar links as before CORE-01');
          const t = await text(s.page);
          assert.doesNotMatch(t, /الخادم/, who + ' ' + h + ': no technical server wording');
        }
        const refresh = await s.page.evaluate(() => [...document.querySelectorAll('header button, aside button, #bs-nf button')].filter((x) => x.getClientRects().length && /^(↻\s*)?تحديث( القائمة)?$/.test(x.textContent.trim())).length);
        assert.equal(refresh, 0, who + ': no routine refresh button in the shell');
        if (who === 'super') {
          await s.go('#/sysadmin', 4000);
          assert.match(await s.page.textContent('.bs-crumb'), /^المنصة \//, 'platform page titled «المنصة»');
          const role0 = (await s.page.textContent('.s-ur')).trim();
          assert.ok(role0, 'role label shown');
          await s.go('#/kpis', 2500);
          const unit0 = await s.page.evaluate(() => KIVO.BassamDepts.active());
          /* a real unit switch through the picker */
          await s.page.click('.s-dept'); await s.page.waitForTimeout(500);
          /* the tree starts collapsed (by design): expand the nodes as a user would, then pick another unit it shows */
          for (let i = 0; i < 4; i++) { const has = await s.page.evaluate(() => [...document.querySelectorAll('.s-deptdd [role="button"]')].some((x) => x.getClientRects().length && /TEST_ONLY إدارة ب/.test(x.textContent))); if (has) break;
            const head = s.page.locator('.s-deptdd [role="button"][title]').filter({ hasText: 'TEST_ONLY' }).nth(i); if (!(await head.count())) break; await head.click({ timeout: 5000 }); await s.page.waitForTimeout(400); }
          const opts = await s.page.evaluate(() => [...document.querySelectorAll('.s-deptdd [role="button"]')].filter((x) => x.getClientRects().length).map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
          const curName = await s.page.evaluate((cur) => (KIVO.BassamDepts.list().find((d) => d.id === cur) || {}).name, unit0);
          const target = opts.find((t) => t && curName && !t.includes(curName) && /TEST_ONLY إدارة ب/.test(t)) ? 'TEST_ONLY إدارة ب' : null;
          assert.ok(target, 'another unit in the picker: ' + JSON.stringify({ opts, curName }));
          await s.page.locator('.s-deptdd [role="button"]:not([title])', { hasText: target }).first().click({ timeout: 10000 });
          await s.page.waitForLoadState('domcontentloaded'); await s.page.waitForTimeout(4500);
          const unit1 = await s.page.evaluate(() => KIVO.BassamDepts.active());
          assert.notEqual(unit1, unit0, 'the unit changed');
          assert.equal((await s.page.textContent('.s-ur')).trim(), role0, 'the administrator role label is unchanged after the switch');
          assert.match(await s.page.textContent('.bs-crumb'), new RegExp('^' + target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' /'), 'unit pages are titled with the new unit');
          /* unsaved edits that cannot be saved: asked first, then the unit stays */
          await s.page.evaluate(() => { const S = KIVO.__BS_SRV; S.dirty = () => true; S.flushAsync = () => Promise.resolve(false); });
          let reloaded = false; s.page.once('load', () => { reloaded = true; });
          await s.page.click('.s-dept'); await s.page.waitForTimeout(500);
          for (let i = 0; i < 4; i++) { const has = await s.page.evaluate((n) => [...document.querySelectorAll('.s-deptdd [role="button"]:not([title])')].some((x) => x.getClientRects().length && x.textContent.includes(n)), curName); if (has) break;
            const head = s.page.locator('.s-deptdd [role="button"][title]').filter({ hasText: 'TEST_ONLY' }).nth(i); if (!(await head.count())) break; await head.click({ timeout: 5000 }); await s.page.waitForTimeout(400); }
          await s.page.locator('.s-deptdd [role="button"]:not([title])', { hasText: curName }).first().click({ timeout: 10000 });
          await s.page.waitForSelector('#bsCfm', { state: 'visible', timeout: 5000 });
          assert.match(await s.page.textContent('#bsCfmTitle'), /تعديلات لم تُحفظ بعد/);
          await s.page.click('#bsCfmOk'); await s.page.waitForTimeout(2500);
          assert.equal(reloaded, false, 'no reload while edits are unsaved');
          assert.equal(await s.page.evaluate(() => KIVO.BassamDepts.active()), unit1, 'the unit stays');
          assert.match(await text(s.page), /لم تُحفظ تعديلاتك بعد — لن ننتقل حتى تُحفظ/, 'plain message');
          /* dark theme through the one theme path */
          await s.page.evaluate(() => KIVO.__bsThemeSet('dark')); await s.page.waitForTimeout(300);
          assert.equal(await s.page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark');
        }
        assert.deepEqual(s.errs, [], who + ': no page errors');
      } finally { try { if (s) await s.ctx.close(); } catch (e) { /* closed */ } await lab.close(); }   /* an open page keeps the lab's long-poll alive */
    }
  } finally { await b.close(); }
});

test('mobile 390×844: drawer and unit picker open, no sideways overflow, same links; no page errors', { timeout: 600000 }, async () => {
  const b = await chromium.launch();
  try {
    for (const who of ['super', 'mgrA']) {
      const lab = await startLab(); let s = null;
      try {
        s = await openAs(b, lab, ...cred(who), MOBILE); s.page.setDefaultTimeout(15000);
        for (const h of who === 'super' ? ['#/kpis', '#/tasks', '#/sysadmin', '#/profile'] : ['#/kpis', '#/tasks', '#/profile']) {
          await s.go(h, 3000);
          const ov = await s.page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
          assert.ok(ov.sw <= ov.w + 1, who + ' ' + h + ': no sideways overflow ' + JSON.stringify(ov));
          if (BEFORE[who][h]) assert.deepEqual(await links(s.page), BEFORE[who][h], who + ' ' + h + ': the same links on mobile');
        }
        await s.page.click('.bs-burger'); await s.page.waitForTimeout(600);
        const open = await s.page.evaluate(() => { const a = document.querySelector('aside.bsb'); const r = a && a.getBoundingClientRect(); return !!(r && r.width > 100 && r.right > 0 && r.left < window.innerWidth); });
        assert.ok(open, who + ': the drawer opens');
        if (who === 'super') {
          await s.page.click('.s-dept'); await s.page.waitForTimeout(500);
          const dd = await s.page.evaluate(() => { const d = document.querySelector('.s-deptdd'); const r = d && d.getBoundingClientRect(); return !!(r && r.height > 40 && r.left >= -1 && r.right <= window.innerWidth + 1); });
          assert.ok(dd, 'super: the unit picker opens inside the screen');
        }
        assert.deepEqual(s.errs, [], who + ': no page errors on mobile');
      } finally { try { if (s) await s.ctx.close(); } catch (e) { /* closed */ } await lab.close(); }   /* an open page keeps the lab's long-poll alive */
    }
  } finally { await b.close(); }
});
