/* V7 · د5-هـ (44) — تبويبُ «الصلاحيات» في صفحة العقدة، في المختبر المعزول (TEST_ONLY، بلا شبكة).
   محرّكُ KIVO.Perm44 ومسارا /api/perm44/check و/api/perm44/log يكتبهما وكيلٌ آخر بالتوازي: هنا بديلٌ صغير في الاختبار وحده (يُحقن في الصفحة بعد
   الدخول، ويُجاب المساران بـpage.route) بعقد الوكلاء — لا في كود الإنتاج.
   · مديرُ المنصة: «الصلاحيات» مكانَ «سقف الصفحات» · العنوانُ …/perm/<قسم> ذهاباً وإعادةَ تحميل · الأنظمةُ بمفاتيحها وملاحظةُ «إطفاء نظام لا يحذف بياناته…»
     · بطاقةُ «صلاحية كاملة بلا أي قيد» · تغييرُ مستوى ⇒ شريطُ «مراجعة وحفظ» ⇒ المراجعةُ بالفرق ومن يتأثر · «اختبار الوصول» يعرض جوابَ الخادم
     · الأشخاص · السجلّ بزرّ «تراجع عن هذا التغيير».
   · «شاهد الصفحة كـ مدير الإدارة»: لا «الأنظمة»، ولا نظامٌ مطفأٌ في سقف الإدارة في المحرّر، ولا دورُ مدير المنصة.
   · مديرُ الإدارة الحقيقي: «مركز إدارة رشاد» ليس له — العنوانُ لا يفتح التبويب.
   لا كتابةَ غيرُ الدخول، ولا أخطاءَ في الصفحة. KIVO_P44_SHOTS=<مجلد> يحفظ لقطاتٍ (deviceScaleFactor 1). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const SHOTS = process.env.KIVO_P44_SHOTS || '';
const A = 'TEST_ONLY_A';
const LOG = [
  { id: 'TEST_ONLY_ev1', who: 'TEST_ONLY_mgrA', whoName: 'TEST_ONLY مدير أ', unit: A, at: Date.UTC(2026, 10, 19, 8), affected: ['TEST_ONLY_eA1'], changes: [{ what: 'role:TEST_ONLY_r1/sys/tasks', from: { lvl: 'view' }, to: { lvl: 'input' } }] },
  { id: 'TEST_ONLY_ev2', who: 'TEST_ONLY_SUPER', whoName: 'مدير المنصة', unit: A, at: Date.UTC(2026, 10, 18, 8), affected: [], changes: [{ what: 'ceil:' + A + '/seized', from: true, to: false }] },
];
/* بديلُ المحرّك في الصفحة (TEST_ONLY) */
function installEngine() {
  const all = (sk) => ['view', 'create', 'edit', 'delete', 'approve'].map((a) => sk + '.' + a);
  const keysFor = (sk, lvl, custom) => (lvl === 'custom' ? (custom || []).filter((k) => all(sk).includes(k)) : all(sk).slice(0, { view: 1, input: 2, edit: 3, full: 4, sensitive: 5 }[lvl] || 0));
  const compileRole = (r, ceil) => Object.keys((r && r.sys) || {}).filter((sk) => ceil(sk)).flatMap((sk) => keysFor(sk, r.sys[sk].lvl, r.sys[sk].keys));
  const doc = {
    roles: [
      { id: 'TEST_ONLY_r1', name: 'TEST_ONLY مراقب', desc: 'TEST_ONLY يرصد ويُدخل', sys: { tasks: { lvl: 'input' }, staff: { lvl: 'view' } } },
      { id: 'TEST_ONLY_r2', name: 'TEST_ONLY رئيس وردية', desc: '', sys: { staff: { lvl: 'edit' }, dreport: { lvl: 'edit' } } },
    ],
    people: { TEST_ONLY_eA1: { role: 'TEST_ONLY_r1', ex: [] } },
  };
  KIVO.Perm44 = {
    levels: () => ['view', 'input', 'edit', 'full', 'sensitive', 'custom'],
    sysList: () => ['staff', 'plan', 'daily', 'dreport', 'tasks', 'irshad', 'seized', 'award', 'dstats'].map((k) => ({ k })),
    keysFor, compileRole,
    effective: (rec, roles, ceil, now) => compileRole((roles || []).find((x) => x.id === (rec || {}).role), ceil).concat(((rec || {}).ex || []).filter((x) => !x.until || x.until > now).map((x) => x.key)),
    roleNameOf: () => '',
    diff: (a, b) => {
      const out = [];
      b.roles.forEach((r) => { const o = a.roles.find((x) => x.id === r.id) || { sys: {} }; Object.keys({ ...o.sys, ...r.sys }).forEach((sk) => { if (JSON.stringify(o.sys[sk] || null) !== JSON.stringify(r.sys[sk] || null)) out.push({ what: 'role:' + r.id + '/sys/' + sk, from: o.sys[sk] || null, to: r.sys[sk] || null }); }); });
      return out;
    },
    rolesOf: () => JSON.parse(JSON.stringify(doc)),
    setRoles: () => {}, setPerson: () => {},
  };
}
async function route(p) {
  await p.route('**/api/perm44/check**', (r) => { const u = new URL(r.request().url()); const k = u.searchParams.get('key') || ''; r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ allow: /\.view$/.test(k), why: /\.view$/.test(k) ? 'TEST_ONLY مسموح بدوره' : 'TEST_ONLY يحتاج مستوى أعلى' }) }); });
  await p.route('**/api/perm44/log**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: 1, events: LOG }) }));
}
const shot = async (p, name) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: true }); };

test('V7 · د5-هـ (44) · «الصلاحيات»: super sees four sections and the unrestricted card; view-as manager hides every OFF system; a real manager cannot open it', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw, { context: { deviceScaleFactor: 1 }, onPage: route }); const p = s.page; p.setDefaultTimeout(15000);
    await p.evaluate(installEngine);
    const H = () => p.evaluate(() => location.hash);
    const tabs = () => p.locator('main [aria-label="أقسام صفحة العقدة"] button').allInnerTexts().then((x) => x.map((t) => t.replace(/[\d٠-٩]+/g, '').replace(/\s+/g, ' ').trim()));
    const subs = () => p.locator('main nav[aria-label="أقسام الصلاحيات"] button').allInnerTexts();
    const P = (sel, o) => p.locator('main .p44 ' + sel, o);
    await s.go('#/sysadmin/org/' + A, 2500);
    await lab.idle(); const w0 = s.writes.length;   /* what boot wrote is not this page's */
    const t = await tabs();
    assert.ok(t.includes('الصلاحيات') && !t.includes('سقف الصفحات'), 'the tab bar: ' + JSON.stringify(t));
    await p.locator('main [aria-label="أقسام صفحة العقدة"] button', { hasText: 'الصلاحيات' }).click(); await p.waitForTimeout(700);
    assert.equal(await H(), '#/sysadmin/org/' + A + '/perm/systems');
    assert.deepEqual(await subs(), ['الأنظمة', 'الأدوار', 'الأشخاص', 'السجل']);
    /* ① systems */
    const rows = await P('.p44-row').count(); assert.equal(rows, 9, 'a row per system');
    assert.equal(await P('.p44-row[data-on="true"]').count(), 6, 'six ON in this unit\'s ceiling (staff · plan · daily · dreport · tasks · dstats)');
    assert.equal(await P('button.p44-sw[role=switch][aria-label]').count(), 9, 'every switch is a labelled switch');
    assert.match(await P('').innerText(), /إطفاء نظام لا يحذف بياناته: تبقى محفوظة وتعود كما هي عند التفعيل\./);
    assert.match(await P('aside[aria-label="المعاينة"]').first().innerText(), /صفحتي/);
    await shot(p, 'p44_1_systems_super');
    /* ② roles: the platform-admin card, then a role */
    await P('nav button', { hasText: 'الأدوار' }).first().click(); await p.waitForTimeout(600);
    assert.equal(await H(), '#/sysadmin/org/' + A + '/perm/roles');
    await P('.p44-role', { hasText: 'مدير المنصة' }).click(); await p.waitForTimeout(400);
    assert.match(await P('.p44-super').innerText(), /صلاحية كاملة بلا أي قيد/);
    assert.equal(await P('select[aria-label^="مستوى"]').count(), 0, 'no level editor for the platform admin');
    await shot(p, 'p44_2_roles_super_card');
    await P('.p44-role', { hasText: 'TEST_ONLY مراقب' }).click(); await p.waitForTimeout(400);
    const ed = await P('.p44-rows .p44-row b').allInnerTexts();
    assert.equal(ed.length, 6, 'the editor lists the six ON systems only: ' + JSON.stringify(ed));
    await P('select[aria-label="مستوى المهام"]').selectOption('edit'); await p.waitForTimeout(400);
    assert.match(await P('.p44-bar').innerText(), /مراجعة وحفظ/);
    assert.match(await P('section[aria-label="المعاينة"], aside[aria-label="المعاينة"]').first().innerText(), /المهام\s*تعديل/);
    /* the access test asks the server */
    await P('section[aria-label="اختبار الوصول"] select').selectOption({ index: 1 });
    await P('section[aria-label="اختبار الوصول"] button', { hasText: 'اسأل الخادم' }).click(); await p.waitForTimeout(500);
    assert.match(await P('.p44-res').innerText(), /TEST_ONLY (مسموح بدوره|يحتاج مستوى أعلى)/);
    await P('.p44-bar button', { hasText: 'مراجعة وحفظ' }).click(); await p.waitForTimeout(400);
    const rev = await P('.p44-rev').innerText();
    assert.match(rev, /TEST_ONLY مراقب [·-] المهام/); assert.match(rev, /إدخال/); assert.match(rev, /تعديل/); assert.match(rev, /TEST_ONLY موظف أ/);
    await shot(p, 'p44_3_roles_review');
    await P('.p44-rev button', { hasText: 'رجوع' }).click(); await P('.p44-bar button', { hasText: 'تراجع' }).click(); await p.waitForTimeout(300);
    assert.equal(await P('.p44-bar').count(), 0, 'undo ⇒ nothing unsaved');
    /* ③ people, by address */
    await s.go('#/sysadmin/org/' + A + '/perm/people', 1500);
    assert.equal(await H(), '#/sysadmin/org/' + A + '/perm/people'); assert.deepEqual(await P('nav button[aria-current=page]').allInnerTexts(), ['الأشخاص'], 'the address opens its section');
    assert.deepEqual((await P('table.p44-people th').allInnerTexts()).map((x) => x.trim()), ['الشخص', 'الدور', 'القسم', 'استثناءات', 'آخر دخول']);
    await P('table.p44-people button', { hasText: 'TEST_ONLY موظف أ' }).first().click(); await p.waitForTimeout(400);
    assert.match(await P('aside[aria-label="تفاصيل الشخص"]').innerText(), /ما يراه الآن[\s\S]*صفحتي/);
    assert.equal(await P('aside[aria-label="تفاصيل الشخص"] [role=radio][aria-checked=true]').count(), 1, 'exactly one role');
    await P('button', { hasText: '+ استثناء مؤقت' }).click(); await p.waitForTimeout(300);
    assert.equal(await P('input[type=date]').count(), 1, 'the exception has an expiry field');
    await shot(p, 'p44_4_people');
    /* ④ log */
    await P('nav button', { hasText: 'السجل' }).first().click(); await p.waitForTimeout(800);
    assert.equal(await P('.p44-log > li').count(), 2);
    assert.equal(await P('.p44-log button', { hasText: 'تراجع عن هذا التغيير' }).count(), 2);
    await shot(p, 'p44_5_log');
    /* view as the department manager: no «الأنظمة», no OFF system, no platform-admin role */
    await P('[aria-label="شاهد الصفحة كـ"] button', { hasText: 'مدير الإدارة' }).click(); await p.waitForTimeout(400);
    assert.deepEqual(await subs(), ['الأدوار', 'الأشخاص', 'السجل']);
    await P('nav button', { hasText: 'الأدوار' }).first().click(); await p.waitForTimeout(500);
    const txt = await P('').innerText();
    for (const off of ['الاسترشاد', 'المضبوطات', 'جائزة']) assert.ok(!new RegExp(off).test(txt), 'an OFF system is never shown to the manager: ' + off);
    assert.equal(await P('.p44-role', { hasText: 'مدير المنصة' }).count(), 0);
    assert.match(txt, /أدوار موظفي إدارتك فقط/);
    await shot(p, 'p44_6_roles_as_manager');
    await lab.idle();
    assert.deepEqual(s.writes.slice(w0).filter((w) => !/\/api\/notif/.test(w)), [], 'opening and editing without saving writes nothing');
    assert.deepEqual(s.errs, [], 'no page errors');
    /* a real department manager: the console is not his */
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw, { context: { deviceScaleFactor: 1 } });
    await m.go('#/sysadmin/org/' + A + '/perm/roles', 3000);
    assert.equal(await m.page.locator('main .p44').count(), 0, 'the manager cannot open the console tab');
    assert.deepEqual(m.errs, []);
  } finally { await b.close(); await lab.close(); }
});
