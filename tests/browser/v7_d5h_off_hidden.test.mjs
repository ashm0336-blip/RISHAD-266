/* V7 · د5-ح (قرار المالك) — النظامُ المطفأ لا يراه أحد، ولا مديرُ المنصة، في المختبر المعزول (TEST_ONLY، بلا شبكة):
   · مطفأٌ على المنصة كلها (bassam_platform_v1.mods.off) ⇒ غائبٌ لمدير المنصة في كل إدارة: القائمةُ الجانبية · العنوانُ المباشر · مصدرُ القائمة (visiblePages · can).
   · مطفأٌ في سقف إدارة ⇒ غائبٌ لمدير المنصة داخل مساحتها (الإدارةُ النشطة) وحاضرٌ في إدارةٍ أخرى مفعّلٌ فيها.
   · لا عرضَ باهتاً بنقطة «خارج السقف» (.n.out) في أي حال.
   · موضعُه الوحيد «الصلاحيات ← الأنظمة» لمدير المنصة (بمفتاحه ليعيد تشغيله).
   · الصلاحياتُ لا تتغيّر لمدير المنصة فيما سوى ذلك: الخادمُ يجيبه عن بيانات النظام المطفأ كما كان (لا يُحجب الوصولُ للنسخ والاستعادة). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const A = 'TEST_ONLY_A', B = 'TEST_ONLY_B', G = 'TEST_ONLY_G';
async function put(lab, k, v) {
  const DB = lab.env.DB;
  await DB.batch([DB.prepare('DELETE FROM kv WHERE k=?1').bind(k), ...lab.W.kvPutStmts(lab.env, 'kv', k, JSON.stringify(v)), DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,1) ON CONFLICT(k) DO UPDATE SET rev=rev+1').bind(k)]);
}
const cap = ['tasks', 'daily', 'dreport', 'admin', 'emps', 'dstats', 'staff', 'plan', 'award'];   /* «جائزة التميز» في كل سقف — فغيابُها من إطفاء المنصة وحده */
/* ما تُظهره الواجهةُ لمفتاح صفحة: رابطُ القائمة الجانبية ظاهرٌ؟ · مصدرُ القائمة · can */
const seen = (p, k) => p.evaluate((k) => {
  const a = [...document.querySelectorAll('aside.bsb nav.s-nav a.n')].find((x) => x.dataset.key === k || (KIVO.BassamPerm.PAGE_REG.find((r) => r.key === k) || {}).name === x.title);
  return { dom: !!a && !a.classList.contains('gone') && a.offsetParent !== null, vis: KIVO.BassamPerm.visiblePages().includes(k), can: KIVO.BassamPerm.can(k, 'view') };
}, k);
async function inDept(s, d) {
  await s.page.evaluate((d) => KIVO.BassamDepts.setActive(d), d);
  await s.page.reload({ waitUntil: 'domcontentloaded' }); await s.page.waitForSelector('aside.bsb nav.s-nav', { timeout: 30000 }); await s.page.waitForTimeout(2000);
  await s.go('#/profile', 1500);
}

test('V7 · د5-ح · an OFF system is visible to nobody, not even the platform admin — platform-wide, and inside the department where it is OFF', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    /* «جائزة التميز» (award) مطفأةٌ على المنصة · «الإحصائيات اليومية» (dstats) مطفأةٌ في سقف إدارة أ وحدها */
    await put(lab, 'bassam_perms_v1', { caps: { [G]: cap, [A]: cap.filter((k) => k !== 'dstats'), [B]: cap, TEST_ONLY_A_S1: cap.filter((k) => k !== 'dstats') }, emps: {} });
    await put(lab, 'bassam_platform_v1', { mods: { off: ['award'] } });
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw); const p = s.page; p.setDefaultTimeout(15000);
    /* in A: both absent */
    await inDept(s, A);
    assert.equal(await p.evaluate(() => KIVO.BassamDepts.active()), A);
    for (const k of ['award', 'dstats']) assert.deepEqual(await seen(p, k), { dom: false, vis: false, can: false }, 'in A, for super: ' + k);
    assert.deepEqual(await seen(p, 'daily'), { dom: true, vis: true, can: true }, 'an ON system stays');
    assert.equal(await p.locator('aside.bsb .n.out').count(), 0, 'no faded «خارج السقف» item');
    const nav = (k) => p.evaluate((k) => '#/' + KIVO.BassamPerm.PERM2NAV[k], k);
    for (const h of [await nav('dstats'), await nav('award')]) {
      await s.go(h, 2000);
      assert.notEqual(await p.evaluate(() => location.hash), h, 'the deep link does not open an OFF system: ' + h);
    }
    /* in B: dstats is ON there ⇒ present; award is OFF on the platform ⇒ still absent */
    await inDept(s, B);
    assert.deepEqual(await seen(p, 'dstats'), { dom: true, vis: true, can: true }, 'in B (ON there): dstats is present for super');
    assert.deepEqual(await seen(p, 'award'), { dom: false, vis: false, can: false }, 'platform-wide OFF: absent in B too');
    const hd = await nav('dstats'); await s.go(hd, 2000);
    assert.equal(await p.evaluate(() => location.hash), hd, 'in B the dstats link opens');
    /* the only place: «الصلاحيات ← الأنظمة» for the platform admin, with its switch */
    await s.go('#/sysadmin/org/' + A + '/perm/systems', 2500);
    const row = (n) => p.locator('main .p44 .p44-row', { hasText: n }).first();
    assert.equal(await row('الإحصائيات اليومية').getAttribute('data-on'), 'false'); assert.equal(await row('الإحصائيات اليومية').locator('button.p44-sw').isDisabled(), false, 'switchable here');
    assert.match(await row('جائزة التميز').innerText(), /مطفأ من المنصة/);
    await p.locator('main .p44 .p44-unit', { hasText: 'المنصة كلها' }).click(); await p.waitForTimeout(300);
    assert.equal(await row('جائزة التميز').locator('button.p44-sw').isDisabled(), false, 'the platform switch turns it back on');
    /* the server: super's access is unchanged (data kept reachable for backup / restore) */
    const r = await s.api('/api/perm44/check?d=' + A + '&role=x&key=task.view');
    assert.equal(r.status, 200, 'super still reads the OFF system\'s unit through the server');
    assert.deepEqual(s.errs.filter((e) => !/ResizeObserver/.test(e)), [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});

/* ── V7 · د5-ح (off2 — ملاحظاتُ تجربة المالك على 3f579f6): لوحاتُ «مؤشرات الإدارة» · «المساعدة» · «مواقع ذات صلة» · بطاقةُ قائمة المدير ── */
const TOGGLE = ['dstats', 'planning', 'staff', 'plan', 'daily', 'dreport', 'tasks', 'irshad', 'seized', 'award', 'links', 'help'];
const FULL = TOGGLE.concat(['admin', 'emps']);
/* القائمةُ الجانبية كما تُرسم فعلاً: روابطُها الظاهرة بمفاتيحها (والمساعدةُ رابطُ الإطار bs-plat-help) */
const sideKeys = (p) => p.evaluate(() => [...document.querySelectorAll('aside.bsb nav.s-nav a.n')].filter((a) => a.offsetParent !== null && !a.classList.contains('gone') && getComputedStyle(a).display !== 'none')
  .map((a) => a.dataset.key || (a.classList.contains('bs-plat-help') ? 'help' : a.getAttribute('sc-camel-on-click') || (a.title || '').split(' — ')[0])).map((k) => ({ 'الإعدادات': 'admin', 'مواقع ذات صلة': 'links' }[k] || k)));
const superView = async (p) => p.evaluate(() => ({
  kpis: KIVO.BassamPerm.navLeaves('kpis').filter((x) => KIVO.BassamPerm.kpiPanelOk(x[0], x[1])).map((x) => x.join('/')),
  help: !!document.querySelector('aside.bsb .bs-plat-help'),
  links: KIVO.BassamPerm.can('links', 'view'),
  side: [...document.querySelectorAll('aside.bsb nav.s-nav a.n')].filter((a) => a.offsetParent !== null && !a.classList.contains('gone')).map((a) => a.dataset.key || a.title),
}));
async function scenario(lab, b, label, caps, off) {
  await put(lab, 'bassam_perms_v1', { caps: Object.assign({ [G]: FULL, [B]: FULL, TEST_ONLY_A_S1: FULL }, caps), subs: caps[A] && !caps[A].includes('emps') ? {} : { [A]: { emps: ['data'] } }, emps: {} });
  await put(lab, 'bassam_platform_v1', { mods: { off } });
  const s = await openAs(b, lab, LAB.superUn, LAB.superPw); const p = s.page; p.setDefaultTimeout(15000);
  await inDept(s, A);
  const sv = await superView(p);
  assert.deepEqual(sv.kpis, [], label + ': no KPI panel is drawn for super (kpiPanelOk)');
  assert.equal(sv.help, false, label + ': no «المساعدة» link for super');
  assert.equal(sv.links, false, label + ': no «مواقع ذات صلة» for super');
  assert.deepEqual(await seen(p, 'kpis').then((x) => x.dom), false, label + ': no «مؤشرات الإدارة» link');
  for (const h of ['#/kpis', '#/help', '#/links']) { await s.go(h, 1800); assert.notEqual(await p.evaluate(() => location.hash), h, label + ': ' + h + ' does not open for super'); assert.equal(await p.locator('#bs-plat-about').count(), 0, label + ': no help dialog'); }
  /* the card «ما يراه مدير هذه الإدارة» = the manager's real side menu (the same source: BassamPerm.menuFor) */
  await s.go('#/sysadmin/org/' + A + '/perm/systems', 2500);
  const card = await p.locator('main .p44 section[aria-label="القائمة الجانبية لمدير الوحدة"] li[data-k]').evaluateAll((L) => L.map((x) => x.dataset.k));
  const m = await openAs(b, lab, LAB.mgrA, LAB.pw); m.page.setDefaultTimeout(15000);
  await m.go('#/profile', 2500);
  const real = await sideKeys(m.page);
  assert.deepEqual(card.filter((k) => k !== 'profile'), real, label + ': the card equals the manager\'s actual side menu ' + JSON.stringify({ card, real }));
  assert.ok(real.includes('emps') && real.includes('admin'), label + ': his permanent pages are in it: ' + JSON.stringify(real));
  assert.equal(card[0], 'profile');
  /* his own «الصلاحيات ← الأنظمة» card: the same list */
  await m.go('#/admin/perm/systems', 2500);
  assert.deepEqual(await m.page.locator('main .p44 section[aria-label="القائمة الجانبية لمدير الوحدة"] li[data-k]').evaluateAll((L) => L.map((x) => x.dataset.k)), card, label + ': his own card too');
  /* the permanent pages work with every system OFF: «الإعدادات ← الورديات» · الموظفون · صفحتي — no read error, no blank page */
  for (const h of ['#/admin/shifts', '#/employees', '#/profile']) {
    await m.go(h, 2500);
    const t = await m.page.evaluate(() => (document.querySelector('main') || document.body).innerText);
    assert.doesNotMatch(t, /operations-read-required|renderVals\(\)/, label + ': ' + h + ' renders');
    assert.ok(t.replace(/\s+/g, '').length > 40, label + ': ' + h + ' is not blank');
  }
  await m.go('#/admin/shifts', 2000);
  assert.equal(await m.page.locator('[data-sf="panel"]').count(), 1, label + ': «الورديات» is shown to the manager');
  assert.deepEqual(m.errs.concat(s.errs).filter((e) => !/ResizeObserver/.test(e)), [], label + ': no page errors');
  await m.ctx.close();
  return s;
}

test('V7 · د5-ح (off2) · every system OFF for one department: no KPI panel, «المساعدة» or «مواقع ذات صلة» for super inside it — present in another; the card = the manager\'s real menu', { timeout: 900000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    const s = await scenario(lab, b, 'OFF for A', { [A]: ['admin', 'emps'] }, []);
    /* another department where they are ON: present for super */
    await inDept(s, B);
    const sv = await superView(s.page);
    assert.ok(sv.kpis.length > 0, 'in B the KPI panels are drawn: ' + JSON.stringify(sv.kpis));
    assert.equal(sv.help, true, 'in B «المساعدة» shows'); assert.equal(sv.links, true, 'in B «مواقع ذات صلة» shows');
    assert.equal((await seen(s.page, 'kpis')).dom, true, 'in B the «مؤشرات الإدارة» link shows');
  } finally { await b.close(); await lab.close(); }
});

test('V7 · د5-ح (off2) · every system OFF on the platform: absent for super everywhere; the card = the manager\'s real menu', { timeout: 900000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    const s = await scenario(lab, b, 'OFF on the platform', { [A]: FULL }, TOGGLE.concat(['custody']));
    await inDept(s, B);
    const sv = await superView(s.page);
    assert.deepEqual(sv.kpis, [], 'platform OFF: no KPI panel in B either'); assert.equal(sv.help, false); assert.equal(sv.links, false);
  } finally { await b.close(); await lab.close(); }
});

/* البند ٥: إطفاءُ كلِّ الأنظمة من «الصلاحيات ← الأنظمة» بالحفظ الحقيقي (العاملُ الحقيقي) لا يمسّ تبويباتِ «الإعدادات» ولا صفحةً دائمة —
   السببُ الجذري كان قراءةَ أقفال الجدول الشهري (staff.shiftUsage@1) والجدولُ مطفأ: رمت «operations-read-required» من renderVals فصارت «الإعدادات» فارغة */
test('V7 · د5-ح (off2) · turning every system OFF through «الصلاحيات ← الأنظمة» (a real save) changes neither the «الإعدادات» tabs nor a permanent page', { timeout: 900000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    await put(lab, 'bassam_perms_v1', { caps: { [G]: FULL, [A]: FULL, [B]: FULL, TEST_ONLY_A_S1: FULL }, emps: {} });
    const before = await (async () => { const m = await openAs(b, lab, LAB.mgrA, LAB.pw); await m.go('#/admin', 2500); const r = await m.page.evaluate(() => ({ subs: ['backup', 'oplog', 'shifts', 'import'].filter((k) => KIVO.BassamPerm.subOn('admin', k)), emps: KIVO.BassamPerm.can('emps', 'view') })); await m.ctx.close(); return r; })();
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw); const p = s.page; p.setDefaultTimeout(15000);
    await s.go('#/sysadmin/org/' + A + '/perm/systems', 3000);
    for (;;) { const on = p.locator('main .p44 button.p44-sw[aria-checked="true"]:not([disabled])'); if (!(await on.count())) break; await on.first().click(); await p.waitForTimeout(120); }
    await p.locator('main .p44 .p44-bar button', { hasText: 'مراجعة وحفظ' }).click(); await p.locator('main .p44 [role=dialog]').waitFor();
    await p.locator('main .p44 [role=dialog] button', { hasText: 'حفظ' }).click(); await p.waitForTimeout(2500); await lab.idle();
    const pm = JSON.parse(lab.env.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', 'bassam_perms_v1').map((r) => r.v).join(''));
    assert.deepEqual(pm.caps[A].slice().sort(), ['admin', 'emps'], 'only the permanent pages stay in the ceiling');
    assert.ok(!pm.subs || !pm.subs[A] || !pm.subs[A].admin, 'the «الإعدادات» subs are not rewritten');
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw); m.page.setDefaultTimeout(15000);
    await m.go('#/admin/shifts', 3000); await m.page.reload({ waitUntil: 'domcontentloaded' }); await m.page.waitForTimeout(3500);
    const after = await m.page.evaluate(() => ({ subs: ['backup', 'oplog', 'shifts', 'import'].filter((k) => KIVO.BassamPerm.subOn('admin', k)), emps: KIVO.BassamPerm.can('emps', 'view') }));
    assert.deepEqual(after, before, 'the «الإعدادات» subs and the employees page are as before');
    assert.equal(await m.page.locator('[data-sf="panel"]').count(), 1, '«الورديات» is drawn after a reload');
    assert.equal(await m.page.evaluate(() => location.hash), '#/admin/shifts');
    assert.deepEqual(m.errs.concat(s.errs).filter((e) => !/ResizeObserver/.test(e)), [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});

/* البند ٦: تبويبٌ غيرُ مسموح في العنوان ⇒ لا يُرسم ولو لحظة (مراقبُ تحوّلات منذ أول سطر) · ينتقل إلى أول تبويبٍ مسموح ويُصحَّح العنوان */
test('V7 · د5-ح (off2) · a disallowed «الإعدادات» tab in the address is never drawn: the first allowed tab opens and the address is corrected, on every refresh', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    await put(lab, 'bassam_perms_v1', { caps: { [G]: FULL, [A]: FULL, [B]: FULL, TEST_ONLY_A_S1: FULL }, subs: { [A]: { admin: ['backup', 'oplog'] } }, emps: {} });
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw); const p = m.page; p.setDefaultTimeout(15000);
    await p.addInitScript(() => { window.__sfSeen = 0; new MutationObserver(() => { if (document.querySelector('[data-sf="panel"]')) window.__sfSeen++; }).observe(document, { childList: true, subtree: true }); });
    for (let i = 0; i < 2; i++) {
      await p.evaluate(() => { location.hash = '#/admin/shifts'; }); await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(4000);
      assert.equal(await p.evaluate(() => window.__sfSeen), 0, 'refresh ' + i + ': the disallowed «الورديات» never entered the DOM');
      assert.equal(await p.evaluate(() => location.hash), '#/admin/backup', 'refresh ' + i + ': the address is corrected to the first allowed tab');
      assert.equal(await p.locator('main .adm-tabbar--d [role=tab][aria-selected="true"]').count(), 1, 'a tab is selected');
      assert.ok((await p.evaluate(() => (document.querySelector('main') || document.body).innerText.replace(/\s+/g, '').length)) > 40, 'not a blank page');
    }
    assert.deepEqual(m.errs.filter((e) => !/ResizeObserver/.test(e)), [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});
