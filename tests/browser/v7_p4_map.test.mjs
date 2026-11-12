/* RISHAD V7 P4 — «خريطة الأنظمة والصلاحيات» on the screen (isolated lab, TEST_ONLY data, the real built worker and package).
     · enforce: the map is drawn in «خريطة الصلاحيات», collapsed by default (no key chip is rendered until a leaf is opened); its three
       views are the platform availability, a chosen unit's ceiling and a chosen account's effective keys;
     · A8: for an employee with a known ceiling, sheet and explicit grant/withdrawal, every key shown in «الفعلي لحساب» is on exactly when
       the server holds it for him (the held set the server sends that employee in /api/authz, read in his own session);
     · the three cards, the matrix, its export and the change log are still there (A9); the matrix says the map is the reference (Q8);
     · legacy (not enforce): no key map — a note says why (Q7), the matrix stays;
     · «الوحدات» lists every page that carries activation; only the five that had a switch have one; «موظفو الإدارة» and «الإعدادات»
       say why they are locked; clicking a row without a switch saves nothing;
     · «خريطة المنصة» lists the centre tabs from the one list (incl. «سجل الأنشطة والتغييرات»), the lenses with their hosts, and names
       the unit the ceiling badge was computed for;
     · phone width: no horizontal page scroll. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const A = 'TEST_ONLY_A', KP = 'bassam_perms_v1', KG = 'bsdept:' + A + ':bassam_grants_v1', EK = 'TEST_ONLY_eA1';
const readK = (lab, k) => JSON.parse(lab.env.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', k).map((r) => r.v).join('') || 'null');
async function putK(lab, k, v) {
  await lab.env.DB.batch([lab.env.DB.prepare('DELETE FROM kv WHERE k=?1').bind(k), ...lab.W.kvPutStmts(lab.env, 'kv', k, JSON.stringify(v)), lab.env.DB.prepare('INSERT INTO revs (k, rev) VALUES (?1, 1) ON CONFLICT(k) DO UPDATE SET rev=rev+1').bind(k)]);
}
const openAll = async (p) => {   /* open every container, then every leaf: all chips on the screen */
  const map = p.locator('[data-pm="map"]');
  if ((await map.locator('[data-t24="expall"]').innerText()).trim() === 'فرد الكل') { await map.locator('[data-t24="expall"]').click(); await p.waitForTimeout(500); }
  await p.evaluate(() => { document.querySelectorAll('[data-pm="map"] [data-t24l]').forEach((r) => { if (!r.nextElementSibling || !r.nextElementSibling.hasAttribute('data-t24keys')) r.querySelector('[data-t24="open"]').click(); }); });
  await p.waitForTimeout(900);
};
const chips = (p) => p.evaluate(() => [...document.querySelectorAll('[data-pm="map"] [data-t24k]')].map((c) => ({ k: c.getAttribute('data-t24k'), kind: c.getAttribute('data-kind'), on: c.getAttribute('data-on') === 'true' })));
const lat = (x) => String(x).replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x660));   /* the display layer shows Arabic-Indic digits */
const noXScroll = async (p, what) => { const w = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]); assert.ok(w[0] <= w[1], what + ': no horizontal page scroll ' + w); };

test('V7 P4 · enforce: the map, its three views, and «الفعلي لحساب» = the server\'s held keys (A8)', { timeout: 900000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    /* a known ceiling (the fixture's), a known sheet, a lens gate, and one explicit grant + one explicit withdrawal */
    const P = readK(lab, KP); P.emps = P.emps || {}; P.emps[A] = { [EK]: { tasks: ['view', 'add'], 'daily/rounds': ['view'], plan: ['view'] } }; P.empLens = P.empLens || {}; P.empLens[A] = { [EK]: ['zones'] };
    await putK(lab, KP, P);
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw); const p = s.page; p.setDefaultTimeout(20000);
    const pre = await p.evaluate(([A, EK]) => { const P24 = KIVO.BassamPerm.p24, C = P24.ceil(A), E = P24.effective({ did: A, ekey: EK, ceil: C, mgr: false }); const on = Object.keys(E.keys), all = P24.assignable(C, { mgr: false });
      return { on, plus: all.filter((k) => !E.keys[k] && /^task\./.test(k)).slice(0, 1), minus: on.filter((k) => /^task\./.test(k) && k !== 'task.view').slice(0, 1) }; }, [A, EK]);
    assert.ok(pre.plus.length === 1 && pre.minus.length === 1, 'a key to grant and a key to withdraw: ' + JSON.stringify(pre));
    await putK(lab, KG, { v: 1, emp: { [EK]: { plus: pre.plus, minus: pre.minus, at: 1, by: 'TEST_ONLY' } } });
    await s.ctx.close();

    /* the server's decision for that employee, as his own session receives it */
    const e = await openAs(b, lab, LAB.empA, LAB.pw);
    const held = await e.page.evaluate((A) => { const R = KIVO.KIVO_REGISTRY, P = KIVO.BassamPerm; return { mode: (P.authz() || {}).mode, keys: R.keys.filter((k) => P.key(k, A) === true) }; }, A);
    assert.equal(held.mode, 'enforce'); assert.ok(held.keys.includes('task.view') && held.keys.includes(pre.plus[0]) && !held.keys.includes(pre.minus[0]), 'the server applies the sheet, the grant and the withdrawal');
    await e.ctx.close();

    const su = await openAs(b, lab, LAB.superUn, LAB.superPw); const q = su.page; q.setDefaultTimeout(20000);
    await su.go('#/sysadmin/perms', 4000);
    const map = q.locator('[data-pm="map"]');
    assert.equal(await map.count(), 1, 'the map card is in «خريطة الصلاحيات»');
    /* A9: the cards, the matrix, its export and the change log are still there */
    for (const name of ['سقوف الإدارات والعدسات', 'قوالب الصلاحيات', 'مصفوفة الصلاحيات', 'آخر تغييرات الصلاحيات']) assert.equal(await q.locator('section[aria-label="' + name + '"]').count(), 1, name);
    assert.equal(await q.locator('section[aria-label="مصفوفة الصلاحيات"] button', { hasText: 'تصدير' }).count(), 1);
    assert.match(await q.locator('[data-pm="ref"]').innerText(), /المرجعُ هو خريطة الأنظمة والصلاحيات/, 'Q8: the matrix says the map is the reference');
    /* collapsed by default: containers only — no leaf row, no key chip rendered */
    assert.equal(await map.locator('[data-t24k]').count(), 0, 'no key chip until opened'); assert.equal(await map.locator('[data-t24l]').count(), 0, 'no leaf row until a container is opened');
    assert.equal(await map.locator('[data-t24c]').count(), 14, '13 containers + the display container');
    assert.match(lat(await map.locator('[data-pm="stat"]').innerText()), /الأنظمة 12 .* الأوراق 44 .* المفاتيح النشطة 255 .* المحجوزة 14/);
    assert.equal(await map.locator('[data-pm-lens="plat"]').getAttribute('aria-pressed'), 'true', 'the default view: platform availability');

    /* view 1 — availability: everything in the registry, each active key once */
    await openAll(q);
    let C = await chips(q);
    assert.equal(C.filter((c) => c.kind !== 'resv').length, 255); assert.equal(new Set(C.filter((c) => c.kind !== 'resv').map((c) => c.k)).size, 255); assert.equal(C.filter((c) => c.kind === 'resv').length, 14);
    assert.ok(C.filter((c) => c.kind === 'info').every((c) => c.on), 'nothing is switched off at platform level in the fixture: every ceiling-bound key is available');
    assert.deepEqual(await q.evaluate(() => [...new Set([...document.querySelectorAll('[data-pm="map"] [data-cls]')].map((r) => r.getAttribute('data-cls')))].sort()), ['container', 'lens', 'page', 'panel', 'platform', 'reference', 'system', 'tab'], 'A3: the eight classes on the screen');
    assert.equal(await map.locator('[data-cls="system"]').count(), 12); assert.equal(await map.locator('[data-cls="panel"]').count(), 11, 'A5: eleven panels');
    assert.match(await map.locator('[data-t24p="daily/kpiOcc"] [data-t24="req"]').innerText(), /تظهر بشرط: عدسة المصليات في سقف الوحدة وعدسة الكثافة في سقف الوحدة/);
    assert.match(await map.locator('[data-t24p="tasks#panel"]').innerText(), /مؤشرات المهام/);
    assert.match((await map.locator('[data-t24l="lens.gates"] [data-t24="route"]').innerText()).trim(), /^#\/plan [·-] #\/daily\/rounds$/, 'the lens row shows its hosts (the display layer draws «·» as «-»)');

    /* view 2 — a unit's ceiling: what is outside the fixture ceiling of unit A is off */
    await map.locator('[data-pm-lens="cap"]').click(); await q.waitForTimeout(500);
    await q.selectOption('[data-pm="dept"]', A); await q.waitForTimeout(600);
    C = await chips(q);
    const capWant = await q.evaluate((A) => { const P24 = KIVO.BassamPerm.p24, C = P24.ceil(A), R = KIVO.KIVO_REGISTRY; return R.keys.filter((k) => R.byKey[k].status === 'active' && P24.keyOn(k, C)); }, A);
    assert.deepEqual(C.filter((c) => c.kind === 'info' && c.on).map((c) => c.k).sort(), capWant.filter((k) => C.some((c) => c.k === k && c.kind === 'info')).sort(), 'ceiling view = p24.keyOn over the unit ceiling');
    assert.ok(C.some((c) => c.k === 'sz.rec.view' && !c.on) && C.some((c) => c.k === 'task.view' && c.on), 'seized is outside the ceiling of unit A, tasks inside');

    /* view 3 — the effective keys of the employee = the server's decision (A8) */
    await map.locator('[data-pm-lens="user"]').click(); await q.waitForTimeout(500);
    const uid = await q.evaluate(() => [...document.querySelectorAll('[data-pm="user"] option')].find((o) => /موظف أ/.test(o.textContent)).value);
    await q.selectOption('[data-pm="user"]', uid); await q.waitForTimeout(800);
    assert.match(await map.locator('[data-pm="sub"]').innerText(), /TEST_ONLY موظف أ/);
    C = await chips(q);
    assert.equal(new Set(C.map((c) => c.k)).size, C.length, 'each key once');
    const grantable = C.filter((c) => ['asg', 'gate', 'out', 'mgr'].includes(c.kind));
    assert.ok(grantable.length > 200, 'the grantable keys are on the screen: ' + grantable.length);
    const shownOn = grantable.filter((c) => c.on).map((c) => c.k).sort(), serverOn = held.keys.filter((k) => grantable.some((c) => c.k === k)).sort();
    assert.deepEqual(shownOn, serverOn, 'every grantable key: shown on ⇔ held on the server');
    assert.ok(shownOn.includes(pre.plus[0]) && !shownOn.includes(pre.minus[0]) && shownOn.includes('lens.zones.view') && !shownOn.includes('lens.gates.view'), 'the explicit grant, the withdrawal and the lens gate are visible in the map');
    /* the self keys the server holds for everyone are shown on as well; nothing shown on is denied by the server */
    const allOn = C.filter((c) => c.on).map((c) => c.k);
    assert.deepEqual(allOn.filter((k) => !held.keys.includes(k)), [], 'no key is shown on that the server does not hold');
    assert.deepEqual(su.errs, []);
    assert.equal(su.writes.filter((w) => /\/api\/save/.test(w)).length, 0, 'looking at the map saves nothing');

    /* «الوحدات» */
    await su.go('#/sysadmin/plat/mods', 3000);
    const mods = await q.evaluate(() => [...document.querySelectorAll('[data-mod]')].map((r) => ({ k: r.getAttribute('data-mod'), act: r.getAttribute('data-act'), sw: r.querySelector('[data-k]').getAttribute('data-sw') === 'true', why: (r.querySelector('[data-mod-why]') || {}).textContent || '' })));
    assert.deepEqual(mods.map((m) => m.k), ['dstats', 'emps', 'planning', 'staff', 'plan', 'daily', 'dreport', 'tasks', 'irshad', 'seized', 'award', 'links', 'help', 'admin'], 'every page with activation, in the manifest order');
    assert.deepEqual(mods.filter((m) => m.sw).map((m) => m.k), ['planning', 'daily', 'irshad', 'seized', 'award']);
    assert.match(mods.find((m) => m.k === 'emps').why, /^لا تُطفأ — أساسية/); assert.match(mods.find((m) => m.k === 'admin').why, /^دائمة — لا تُطفأ/); assert.equal(mods.find((m) => m.k === 'admin').act, 'always');
    const w0 = su.writes.length, plat0 = readK(lab, 'bassam_platform_v1');
    for (const k of ['dstats', 'emps', 'admin', 'tasks']) await q.locator('[data-mod="' + k + '"] [data-k]').click();
    await q.waitForTimeout(1200); await lab.idle();
    assert.deepEqual(su.writes.slice(w0), [], 'a row without a switch does nothing');
    assert.deepEqual(readK(lab, 'bassam_platform_v1'), plat0, 'the platform settings are unchanged');
    /* a unit that had a switch still switches: off, then on again */
    const note = async (k) => (await q.locator('[data-mod="' + k + '"] > span.adm-pl-mt').innerText()).trim();
    await q.locator('[data-mod="award"] [data-k]').click(); await q.waitForTimeout(700);
    assert.equal(await note('award'), 'مطفأة', '«جائزة التميز» can still be switched off');
    await q.locator('[data-mod="award"] [data-k]').click(); await q.waitForTimeout(700);
    assert.notEqual(await note('award'), 'مطفأة', 'and on again');

    /* «خريطة المنصة» */
    await su.go('#/sysadmin/plat/about', 3000);
    const sm = await q.evaluate(() => { const h = [...document.querySelectorAll('h3')].find((x) => x.textContent === 'خريطة المنصة'); return h.parentElement.innerText; });
    for (const t of ['سجل الأنشطة والتغييرات', 'الرئيسية', 'عدسة البوابات', 'على «التشغيل الميداني» و«الجولات اليومية»', 'مؤشرات المهام', 'الورديات']) assert.ok(sm.includes(t), 'site map lists «' + t + '»');
    assert.ok(!sm.includes('خادم فقط') && !sm.includes('نظرة عامة'), 'the stale centre list is gone');
    assert.match(sm, /خارج سقف «[^»]+»/, 'the ceiling badge names the unit it was computed for');
    assert.deepEqual(su.errs, []); await su.ctx.close();

    /* phone width */
    const m = await openAs(b, lab, LAB.superUn, LAB.superPw, { viewport: { width: 390, height: 844 } });
    await m.go('#/sysadmin/perms', 4000); await openAll(m.page); await noXScroll(m.page, 'map (all open)');
    await m.go('#/sysadmin/plat/mods', 2500); await noXScroll(m.page, 'units');
    assert.deepEqual(m.errs, []); await m.ctx.close();
  } finally { await b.close(); await lab.close(); }
});

test('V7 P4 · legacy: no key map outside enforce — a note says why; the matrix stays (Q7)', { timeout: 600000 }, async () => {
  const lab = await startLab({ mode: 'legacy' }); const b = await chromium.launch();
  try {
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw); const p = s.page;
    await s.go('#/sysadmin/perms', 4000);
    assert.equal(await p.locator('[data-pm="map"]').count(), 1);
    assert.equal(await p.locator('[data-pm="map"] [data-t24="map"]').count(), 0, 'no tree outside enforce');
    assert.equal(await p.locator('[data-pm-lens]').count(), 0);
    assert.match(await p.locator('[data-pm="map-off"]').innerText(), /في وضع الإنفاذ وحده.*المحرّكُ القديم/);
    assert.equal(await p.locator('section[aria-label="مصفوفة الصلاحيات"]').count(), 1); assert.equal(await p.locator('[data-pm="ref"]').count(), 0);
    await s.go('#/sysadmin/plat/mods', 2500); assert.equal(await p.locator('[data-mod]').count(), 14, '«الوحدات» is the same list in legacy');
    assert.deepEqual(s.errs, []); await s.ctx.close();
  } finally { await b.close(); await lab.close(); }
});
