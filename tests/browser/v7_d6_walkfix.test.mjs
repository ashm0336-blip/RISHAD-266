/* V7 · د6 (walkfix) — ما كشفته «الجولة الكاملة» في الصفحات، مُثبَتاً كلٌّ باختباره، في المختبر المعزول (TEST_ONLY، بلا شبكة) على العامل الحقيقي:
   ① الصفحةُ لا تطلب بياناتِ نظامٍ مطفأ: «صفحتي» لا تطلب /api/me/tasks والمهامُ مطفأة · «موظفو الإدارة» لا تطلب /api/custody والعهدُ مطفأ ولو كان تبويبُه محفوظاً
   ② أزرارُ تصفية «سجل الحركة» لا تسمّي نظاماً مطفأ
   ③ العنوانُ = التبويبُ المعروض: لكل لوحةٍ في «مؤشرات الإدارة» وتبويبٍ في «الخطة التشغيلية» عنوانُه (يعمل بعد إعادة التحميل · العنوانُ القديم يُصحَّح) ·
      والعنوانُ الأساس الذي يعرض تبويباً محفوظاً يُصحَّح إليه بالاستبدال (لا مدخلَ تاريخٍ جديداً) ولا يتغيّر التبويبُ المعروض */
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
const caps = (lab, a, subs) => put(lab, 'bassam_perms_v1', { caps: { [G]: FULL, [A]: a, [B]: FULL, [S1]: a }, subs: subs || {}, emps: {} });
const log0 = console.log; console.log = (...a) => { if (typeof a[0] === 'string' && a[0].startsWith('{"v":1,"t":')) return; log0(...a); };   /* سجلُّ طلبات الخادم يُسكَت هنا */
/* طلباتُ الصفحة إلى /api منذ العلامة */
function watch(s) { const seen = []; s.page.on('request', (r) => { try { const u = new URL(r.url()); if (u.pathname.startsWith('/api/')) seen.push(r.method() + ' ' + u.pathname); } catch (e) { /* ليس لنا */ } }); s.page.on('response', (r) => { if (r.status() >= 400) seen.push('!' + r.status() + ' ' + new URL(r.url()).pathname); }); return { mark: () => seen.length, since: (n, rx) => seen.slice(n).filter((x) => rx.test(x)) }; }
const reloadAt = async (s, hash, ms) => { await s.page.evaluate((h) => { location.hash = h; }, hash); await s.page.reload({ waitUntil: 'domcontentloaded' }); await s.page.waitForSelector('aside.bsb nav.s-nav', { timeout: 30000 }); await s.page.waitForTimeout(ms || 3000); };
/* التبويبُ المعروض في شريط الصفحة (الخطُّ تحته) · وأسماءُ التبويبات */
const strip = (p) => p.evaluate(() => { const lit = (e) => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.display !== 'none' && c.visibility !== 'hidden' && +c.opacity > 0.05 && c.backgroundColor !== 'rgba(0, 0, 0, 0)'; };
  const tabs = [...document.querySelectorAll('main .bs-tabstrip > *')].filter((e) => e.getBoundingClientRect().width > 2).map((e) => ({ n: (e.getAttribute('aria-label') || e.textContent).replace(/\s+/g, ' ').trim(), on: [...e.querySelectorAll(':scope > span:empty')].some(lit) }));
  return { hash: location.hash, all: tabs.map((t) => t.n), shown: (tabs.find((t) => t.on) || {}).n || '', n: history.length }; });
/* V7 · د6 (قرار المالك): رمزُ عنوان كل لوحة — يعلنه نظامُها (شريحة kpis.panels) */
const KPI_TOK = { 'مؤشرات الجاهزية': 'readiness', 'مؤشرات التشغيل اليومي': 'daily', 'مؤشرات الإشغال': 'occupancy', 'مؤشرات المصليات': 'zones', 'لوحة مؤشرات المضبوطات': 'seized', 'لوحة مؤشرات الاسترشاد': 'irshad', 'مؤشرات المهام': 'tasks', 'تحليل المسجد الحرام': 'haram-analysis', 'تحليل المسجد النبوي': 'nabawi-analysis', 'مقارنة الحرمين': 'comparison', 'المقارنة الزمنية': 'over-time' };
const clickTab = async (p, name) => { await p.locator('main .bs-tabstrip > *', { hasText: name }).first().click(); await p.waitForTimeout(900); };

test('V7 · د6 (walkfix ①②) · a page does not ask for an OFF system\'s data («مهامي» · «العهد») and the log filter does not name it', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    await caps(lab, FULL);
    const e = await openAs(b, lab, LAB.empA, LAB.pw), m = await openAs(b, lab, LAB.mgrA, LAB.pw), we = watch(e), wm = watch(m);
    /* ON: the requests are made (the control) */
    let n = we.mark(); await reloadAt(e, '#/profile');
    assert.ok(we.since(n, /^GET \/api\/me\/tasks$/).length > 0, 'ON: «صفحتي» reads «مهامي»');
    n = wm.mark(); await reloadAt(m, '#/employees/store');
    assert.ok(wm.since(n, /^GET \/api\/custody$/).length > 0, 'ON: «مستودع العهد» reads the custody catalogue');
    assert.equal((await strip(m.page)).shown, 'مستودع العهد');
    await m.go('#/admin/oplog', 2500);
    const chips = () => m.page.evaluate(() => [...document.querySelectorAll('main button')].filter((x) => x.getBoundingClientRect().width > 2).map((x) => x.textContent.trim()));
    assert.ok((await chips()).includes('المهام') && (await chips()).includes('التقرير اليومي'), 'ON: the log filter offers «المهام» and «التقرير اليومي»');
    /* OFF for the department: «المهام» and «العهد» (the store tab stays remembered in this session) */
    await caps(lab, FULL.filter((k) => k !== 'tasks'), { [A]: { emps: ['data'] }, [S1]: { emps: ['data', 'custody'] } });
    n = we.mark(); await reloadAt(e, '#/profile', 4500);
    assert.deepEqual(we.since(n, /\/api\/me\/tasks/), [], 'OFF: «صفحتي» does not ask for «مهامي» (no request, no refusal)');
    assert.equal(await e.page.evaluate(() => /مهامك/.test(document.querySelector('main').innerText)), false, 'and draws no «مهامك» card');
    assert.ok((await e.page.evaluate(() => document.querySelector('main').innerText.replace(/\s+/g, '').length)) > 40, '«صفحتي» is not blank');
    n = wm.mark(); await reloadAt(m, '#/employees/store', 4500);
    assert.deepEqual(wm.since(n, /\/api\/custody/), [], 'OFF: «موظفو الإدارة» does not ask for custody though its tab was the remembered one');
    const st = await strip(m.page);
    assert.ok(!st.all.includes('مستودع العهد') && !st.all.includes('عهد الموظفين'), 'no custody tab: ' + JSON.stringify(st));
    assert.equal(st.hash, '#/employees', 'the address is corrected to the tab that is shown');
    await m.go('#/admin/oplog', 2500);
    assert.ok(!(await chips()).includes('المهام'), 'OFF: the log filter does not name «المهام»');
    assert.ok((await chips()).includes('التقرير اليومي'), 'a system that is ON keeps its filter');
    /* the section manager of A\'s section: «عهد الموظفين» is OFF for him too, though his section\'s own record keeps it */
    const U = JSON.parse(lab.env.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', 'bassam_auth_users_v1').map((r) => r.v).join(''));
    U.push({ id: 'TEST_ONLY_wf_sec', un: '1100000021', name: 'TEST_ONLY مدير قسم', role: 'staff', deptId: S1, ekey: 'mgr:' + S1, mgr: 1, ph: U.find((x) => x.id === 'TEST_ONLY_mgrA').ph, mc: 0, dis: 0 });
    await put(lab, 'bassam_auth_users_v1', U);
    const sec = await openAs(b, lab, '1100000021', LAB.pw), ws = watch(sec);
    n = ws.mark(); await reloadAt(sec, '#/employees/custody', 4500);
    const ss = await strip(sec.page);
    assert.ok(!ss.all.includes('عهد الموظفين') && !ss.all.includes('مستودع العهد'), 'the section manager has no custody tab: ' + JSON.stringify(ss));
    assert.deepEqual(ws.since(n, /\/api\/custody|^!4/), [], 'and his page asks for none of it, with no refused request');
    assert.equal(await sec.page.evaluate(() => [...document.querySelectorAll('aside.bsb a.n[data-key="emps"] .nlbl')].map((x) => x.textContent.trim())[0]), 'موظفو القسم', 'his menu names the section');
    assert.equal(await sec.page.evaluate(() => KIVO.BassamPerm.menuFor().filter((x) => x.k === 'emps')[0].n), 'موظفو القسم', 'from the one source');
    assert.deepEqual([e, m, sec].flatMap((s) => s.errs).filter((x) => !/ResizeObserver/.test(x)), [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});

test('V7 · د6 (walkfix ③) · the address is the tab that is shown: every KPI panel and planning tab has its own address (works after a reload; the old address is corrected); a base address showing a remembered tab is corrected to it without a new history entry', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    await caps(lab, FULL);
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw), p = m.page;
    /* «مؤشرات الإدارة»: the old address opens the first allowed panel and is corrected to it */
    await reloadAt(m, '#/kpis');
    let s = await strip(p);
    assert.ok(s.all.length > 3, 'the KPI strip is there: ' + JSON.stringify(s.all));
    assert.equal(s.shown, s.all[0], 'the first allowed panel is shown');
    assert.match(s.hash, /^#\/kpis\/[a-z]+(?:-[a-z]+)*$/, 'and the old address #/kpis is corrected to its own: ' + s.hash);
    const first = s.hash, seenAddr = new Set([first]);
    for (const name of s.all.slice(1)) {
      await clickTab(p, name); s = await strip(p);
      assert.equal(s.shown, name, 'the clicked panel is shown');
      if (KPI_TOK[name]) assert.equal(s.hash, '#/kpis/' + KPI_TOK[name], 'V7 · د6 (قرار المالك): the readable token its system declares');
      assert.match(s.hash, /^#\/kpis\/[a-z]+(?:-[a-z]+)*$/); assert.ok(!seenAddr.has(s.hash), 'the panel «' + name + '» has an address of its own: ' + s.hash); seenAddr.add(s.hash);
    }
    const last = { name: s.shown, hash: s.hash };
    await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
    s = await strip(p);
    assert.deepEqual([s.hash, s.shown], [last.hash, last.name], 'after a reload the address still opens its panel');
    /* V7 · د6 (قرار المالك): the old internal addresses redirect to the readable ones, and the readable one opens its panel after a reload */
    for (const [old, tok, name] of [['tk', 'tasks', 'مؤشرات المهام'], ['dsh', 'haram-analysis', 'تحليل المسجد الحرام'], ['dy', 'daily', 'مؤشرات التشغيل اليومي']]) {
      await reloadAt(m, '#/kpis/' + old); s = await strip(p);
      assert.deepEqual([s.hash, s.shown], ['#/kpis/' + tok, name], '#/kpis/' + old + ' ⇒ #/kpis/' + tok);
      await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500); s = await strip(p);
      assert.deepEqual([s.hash, s.shown], ['#/kpis/' + tok, name], 'the deep link #/kpis/' + tok + ' after a reload');
    }
    /* a panel that is not allowed in the address ⇒ the shown one, and the address says so */
    await caps(lab, FULL.filter((k) => k !== 'tasks'));
    await reloadAt(m, '#/kpis/tk');
    s = await strip(p);
    assert.ok(!s.all.includes('مؤشرات المهام'), 'the OFF panel is not offered');
    assert.notEqual(s.hash, '#/kpis/tk'); assert.match(s.hash, /^#\/kpis\/[a-z]+(?:-[a-z]+)*$/); assert.ok(s.shown, 'a panel is shown, and the address is its own: ' + JSON.stringify(s));
    await caps(lab, FULL);
    /* «الخطة التشغيلية» */
    await reloadAt(m, '#/planning');
    s = await strip(p);
    assert.deepEqual([s.hash, s.shown], ['#/planning/staff', 'الجدول الشهري'], 'the old address #/planning is corrected to the first tab\'s');
    await clickTab(p, 'التشغيل الميداني'); s = await strip(p);
    assert.deepEqual([s.hash, s.shown], ['#/planning/plan', 'التشغيل الميداني']);
    await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
    s = await strip(p);
    assert.deepEqual([s.hash, s.shown], ['#/planning/plan', 'التشغيل الميداني'], 'the deep link works after a reload');
    await clickTab(p, 'الجدول الشهري'); assert.deepEqual([(await strip(p)).hash, (await strip(p)).shown], ['#/planning/staff', 'الجدول الشهري']);
    /* a base address that shows the tab remembered in this session is corrected to that tab — replace, not a new entry; the tab does not change */
    for (const [base, tab, tail, deflt] of [['#/award', 'لوحة النتائج', '/res', '/new'], ['#/employees', 'عهد الموظفين', '/custody', '/data'], ['#/dstats', 'المسجد النبوي', '/nabawi', '/haram'], ['#/daily', 'الجولات اليومية', '/rounds', '']]) {
      await m.go(base, 2500); await clickTab(p, tab);
      assert.equal((await strip(p)).hash, base + tail, base + ': the tab has its address');
      await m.go('#/profile', 1500);
      const before = await p.evaluate(() => history.length);
      await m.go(base, 2500);
      s = await strip(p);
      assert.equal(s.shown, tab, base + ': the remembered tab is still the one shown');
      assert.equal(s.hash, base + tail, base + ': and the address is corrected to it');
      assert.equal(s.n, before + 1, base + ': by replacing — the visit itself is the only new history entry');
      /* the default tab\'s own address is kept as typed */
      if (deflt) { await reloadAt(m, base + deflt, 2500); assert.equal((await strip(p)).hash, base + deflt, base + deflt + ' is kept'); }
    }
    assert.deepEqual(m.errs.filter((x) => !/ResizeObserver/.test(x)), [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});
