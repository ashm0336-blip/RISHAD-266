/* V7 · د6 — مجموعة م6 «الناس» في المختبر المعزول (العاملُ الحقيقي · الإنفاذ · TEST_ONLY · بلا شبكة):
   (1) ب6 · ب7 · ب8 · ب12 في الواجهة: «المسؤولون» مسؤولو العقدة وعددُهم واسمُها في العنوان · حاملو الدور · سطرُ مدير الوحدة فوق قائمته · المديرُ يرى قراءةً؛
   (2) ج5 · ج8: كلُّ ما هو «قراءة» عند مدير الإدارة مرفوضٌ كتابةً في الخادم ولو بطلبٍ مصنوع يدوياً — إضافةُ مسؤول · فعلٌ على حساب مسؤول ·
       كتابةُ الأنظمة (السقف · مفتاحُ المنصة) · تعديلُ سجلّه هو (الأدوار · الحساب) — وطلبٌ مثلُه على موظفه يُقبل (فالرفضُ للهدف لا للشكل)؛
   (3) ج6: لا سطرَ من فرعٍ آخر — لا في الواجهة ولا في ردود الخادم (سجلُّ الوحدة · اختبارُ الوصول · قراءةُ سجلّ أدوار الفرع الآخر). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const A = 'TEST_ONLY_A', B = 'TEST_ONLY_B', S1 = 'TEST_ONLY_A_S1', G = 'TEST_ONLY_G';
const KU = 'bassam_auth_users_v1', KP = 'bassam_perms_v1', KPL = 'bassam_platform_v1', RK = (d) => 'bsdept:' + d + ':bassam_roles_v1';
const ROLE_A = { id: 'TEST_ONLY_rA', name: 'TEST_ONLY دور أ', sys: { tasks: { lvl: 'view' } } };
const ROLE_B = { id: 'TEST_ONLY_rB', name: 'TEST_ONLY دور ب الخاص', sys: { tasks: { lvl: 'view' } } };
const B_MARKS = [ROLE_B.name, ROLE_B.id, 'TEST_ONLY_eB1', 'TEST_ONLY مدير ب', 'TEST_ONLY موظف ب'];
/* accounts compared by content without printing them (they carry password hashes): key order ignored */
const canon = (x) => (Array.isArray(x) ? x.map(canon) : x && typeof x === 'object' ? Object.keys(x).sort().reduce((o, k) => ((o[k] = canon(x[k])), o), {}) : x);
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const kv = (lab, k) => { const r = lab.env.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', k).map((x) => x.v).join(''); return r ? JSON.parse(r) : null; };
const T = (p, o) => p.locator('main .og-tabs .og-tab', o);
const until = async (fn, what, ms = 15000) => { const t0 = Date.now(); for (;;) { if (await fn()) return; if (Date.now() - t0 > ms) throw new Error('timed out waiting for ' + what); await new Promise((r) => setTimeout(r, 60)); } };
const open = async (s, hash, ready = 'main .og-tabs .og-tab[aria-selected="true"]') => { await s.page.evaluate((h) => { location.hash = h; }, hash); await s.page.waitForFunction((h) => location.hash === h, hash).catch(() => {}); await s.page.locator(ready).first().waitFor(); await s.page.waitForTimeout(500); };
/* حفظٌ خامّ بطلبٍ مصنوع: القيمةُ الحالية من /api/get ثم /api/save بالمفتاح وحده — يعيد { accepted, status, j } */
async function forge(s, k, mut) {
  const r = await s.api('/api/get?keys=' + encodeURIComponent(k)), e = r.j && r.j.keys && r.j.keys[k];
  const v = e && e.v != null ? JSON.parse(e.v) : null, n = mut(v);
  const w = await s.api('/api/save', { method: 'POST', body: JSON.stringify({ set: { [k]: JSON.stringify(n === undefined ? v : n) }, del: [], base: { [k]: e ? e.rev : 0 } }) });
  return { accepted: w.status === 200 && !!w.j && w.j.ok === 1 && !!(w.j.revs && w.j.revs[k]) && !(w.j.denied && w.j.denied[k]), status: w.status, j: w.j };
}
/* سجلُّ أدوارٍ لوحدةٍ يحفظه مديرُ المنصة بمسار المحرّك الواحد (المسودة ثم الحفظ) */
async function seedRoles(s, unit, role, ekey) {
  await open(s, '#/sysadmin/org/' + unit + '/roles');
  await s.page.waitForFunction(() => !document.querySelector('main .p44-empty[role=status]')).catch(() => {});
  const r = await s.page.evaluate(async ([d, role, ek]) => { const E = KIVO.Perm44, dr = E.draft(d); E.setRoles(dr, d, { v: 1, roles: [role], people: { [ek]: { role: role.id, ex: [] } } }); return E.commit(dr); }, [unit, role, ekey]);
  assert.equal(r && r.ok, true, 'seeded the roles of ' + unit + ': ' + JSON.stringify(r));
  /* the page's draft was read before the save: a fresh load reads what the server holds */
  await s.page.reload({ waitUntil: 'domcontentloaded' }); await s.page.waitForSelector('aside.bsb', { timeout: 30000 }); await s.page.waitForTimeout(1500);
}

test('V7 · د6 م6 · ب6 · ب7 · ب8 · ب12 in the real UI: the node\'s own admins (count + name in the title) · role holders · the unit manager line · the manager reads', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw); s.page.setDefaultTimeout(15000); const p = s.page;
    await seedRoles(s, A, ROLE_A, 'TEST_ONLY_eA1'); await lab.idle();
    /* ب6 */
    await open(s, '#/sysadmin/org/' + A + '/admins', 'main [data-org-tab="admins"] .mk.ac7');
    const h3 = (await p.locator('main .p44-ttl h3').innerText()).replace(/\s+/g, ' ');
    assert.match(h3, /المسؤولون [·-] TEST_ONLY إدارة أ [·-] مدير واحد/, 'the tab title carries the node name and its admin count: ' + h3);
    const rows = await p.evaluate(() => [...document.querySelectorAll('main .mk.ac7 .adm-tr.g-us:not(.adm-th) .adm-b')].map((x) => x.textContent.trim()));
    assert.deepEqual(rows, ['TEST_ONLY مدير أ'], 'its own admins only');
    assert.equal(await p.locator('main .mk.ac7 .top button.add').count(), 1, '«+ إضافة مدير» for the platform admin');
    await open(s, '#/sysadmin/org/' + G + '/admins', 'main [data-org-tab="admins"] .mk.ac7');
    assert.match(await p.locator('main [data-org-tab="admins"]').innerText(), /لا مدير/, 'a node without its own admin: one clear empty state');
    await open(s, '#/sysadmin/org/platform/admins', 'main [data-org-tab="admins"]');
    assert.match(await p.locator('main [data-org-tab="admins"]').innerText(), /مدير المنصة[\s\S]*صلاحية كاملة بلا أي قيد/, 'root row: the «مدير المنصة» card');
    /* ب7 */
    await open(s, '#/sysadmin/org/' + A + '/roles', 'main .p44-role');
    const rl = (await p.locator('main .p44-rail').innerText()).replace(/\s+/g, ' ');
    assert.match(rl, /TEST_ONLY دور أ شخص واحد/, 'the list: each role with its holders: ' + rl); assert.doesNotMatch(rl, /مدير المنصة|مدير الوحدة/, 'no fixed cards in «الأدوار»');
    const hold = p.locator('main [data-og="role-holders"] button', { hasText: 'TEST_ONLY موظف أ' });
    assert.equal(await hold.count(), 1, 'the role\'s holders by name');
    await hold.click(); await p.waitForFunction((h) => location.hash === h, '#/sysadmin/org/' + A + '/people');
    await p.locator('main aside[aria-label="تفاصيل الشخص"]').waitFor();
    assert.match(await p.locator('main aside[aria-label="تفاصيل الشخص"]').innerText(), /TEST_ONLY موظف أ[\s\S]*TEST_ONLY دور أ/, 'opens the holder in «الأشخاص»');
    /* ب8: the unit manager — one line above his real menu */
    await p.locator('main table.p44-people button', { hasText: 'TEST_ONLY مدير أ' }).first().click();
    await p.locator('main [data-og="mgr-line"]').waitFor();
    assert.match((await p.locator('main [data-og="mgr-line"]').innerText()).trim(), /^مدير الوحدة [·-] يعمل بسقف وحدته كله$/, 'the one line (the page draws «·» as «-») — V7 · 53 · REVIEW بند 4: بلا «كامل»');
    const menu = await p.evaluate(() => { const l = document.querySelector('main [data-og="mgr-line"]').nextElementSibling; return l && l.matches('ul.p44-menu') ? [...l.querySelectorAll('li')].map((li) => (li.querySelector('span') || li).textContent.trim()) : null; });
    const real = await p.evaluate((d) => KIVO.BassamPerm.seenBy({ kind: 'mgr', did: d }).map((x) => x.n), A);
    assert.deepEqual(menu, real, 'the list below the line is his real menu (seenBy)');
    assert.deepEqual(s.errs, [], 'no page errors (platform admin)');
    await s.ctx.close();

    /* ب12: the department manager — the same screen, read-only where the order says */
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw); m.page.setDefaultTimeout(15000); const q = m.page;
    await open(m, '#/admin/perm/' + A + '/admins', 'main [data-org-tab="admins"]');
    assert.deepEqual((await T(q).allInnerTexts()).map((x) => x.trim()), ['نظرة عامة', 'الأنظمة', 'المسؤولون', 'الأدوار', 'الأشخاص', 'السجل'], 'no «البيانات»');
    assert.equal(await q.locator('main .mk.ac7').count(), 0, 'no accounts table (no row menu)'); assert.equal(await q.locator('main [data-org-tab="admins"] button').count(), 0, 'no add, no action');
    assert.match(await q.locator('main [data-org-tab="admins"]').innerText(), /TEST_ONLY مدير أ/, 'his unit\'s admins, read-only');
    await open(m, '#/admin/perm/' + A + '/systems', 'main .p44-row');
    assert.equal(await q.locator('main [role=switch]').count(), 0, '«الأنظمة» read-only'); assert.equal(await q.locator('main .p44-row[data-on="false"]').count(), 0, 'ON only');
    await open(m, '#/admin/perm/' + A + '/roles', 'main .p44-role');
    assert.equal(await q.locator('main button', { hasText: '+ دور جديد' }).count(), 1, 'roles: full within his ceiling');
    await open(m, '#/admin/perm/' + A + '/people', 'main table.p44-people');
    await q.locator('main table.p44-people button', { hasText: 'TEST_ONLY مدير أ' }).first().click(); await q.waitForTimeout(300);
    assert.match(await q.locator('main aside[aria-label="تفاصيل الشخص"]').innerText(), /هذا سجلّك أنت/, 'not his own record');
    assert.equal(await q.locator('main aside[aria-label="تفاصيل الشخص"] [role=radio]').count(), 0);
    assert.deepEqual(m.errs, [], 'no page errors (manager)');
  } finally { await b.close(); await lab.close(); }
});

test('V7 · د6 م6 · ج5 · ج8: what is read-only for the unit manager is refused as a write by the server — even a hand-made request', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw); m.page.setDefaultTimeout(15000);
    await open(m, '#/admin/perm/' + A + '/overview');
    const U0 = kv(lab, KU), P0 = JSON.stringify(kv(lab, KP)), PL0 = JSON.stringify(kv(lab, KPL)), R0 = JSON.stringify(kv(lab, RK(A)));
    const tryUsers = (fn) => forge(m, KU, (list) => { const l = JSON.parse(JSON.stringify(list)); fn(l); return l; });
    const by = (l, id) => l.find((u) => u.id === id);
    /* the control: the same hand-made shape on his own employee is accepted (the refusals below are about the target) */
    const ok1 = await tryUsers((l) => { by(l, 'TEST_ONLY_empA').dis = 1; }); await lab.idle();
    assert.equal(ok1.accepted, true, 'control: he freezes his own employee: ' + JSON.stringify(ok1.j).slice(0, 300));
    const ok2 = await tryUsers((l) => { by(l, 'TEST_ONLY_empA').dis = 0; }); await lab.idle();
    assert.equal(ok2.accepted, true, 'control: and re-enables him');
    const U1 = kv(lab, KU);
    const refused = [];
    const expectNo = async (what, r) => { await lab.idle(); refused.push(what); assert.equal(r.accepted, false, what + ' must be refused: ' + JSON.stringify(r.j).slice(0, 300)); };
    /* adding an admin */
    await expectNo('add an admin (mgr: key)', await tryUsers((l) => { l.push({ id: 'TEST_ONLY_fakeMgr', un: '1100000077', name: 'TEST_ONLY مدير مصنوع', role: 'staff', deptId: A, ekey: 'mgr:' + A + ':2', mgr: 1, dis: 0, mc: 1 }); }));
    await expectNo('add an admin (badge on a new staff account)', await tryUsers((l) => { l.push({ id: 'TEST_ONLY_fakeMgr2', un: '1100000078', name: 'TEST_ONLY مدير مصنوع ٢', role: 'staff', deptId: A, ekey: 'TEST_ONLY_eA2', mgr: 1, dis: 0, mc: 1 }); }));
    await expectNo('promote his employee to admin', await tryUsers((l) => { by(l, 'TEST_ONLY_empA').mgr = 1; }));
    /* acting on an admin account */
    await expectNo('freeze an admin account of his unit (legacy manager login)', await tryUsers((l) => { by(l, 'TEST_ONLY_dmA').dis = 1; }));
    /* another unit's admin is not even in what he reads (ج6) — the forged request carries a made-up copy of it */
    const mB = (o) => Object.assign({ id: 'TEST_ONLY_mgrB', un: LAB.mgrB, name: 'TEST_ONLY مدير ب', role: 'staff', deptId: B, ekey: 'mgr:' + B, mgr: 1, mc: 0, dis: 0 }, o);
    await expectNo('freeze another unit\'s admin', await tryUsers((l) => { assert.ok(!by(l, 'TEST_ONLY_mgrB'), 'B\'s admin is outside what he reads'); l.push(mB({ dis: 1 })); }));
    await expectNo('rename another unit\'s admin', await tryUsers((l) => { l.push(mB({ name: 'TEST_ONLY اسم مصنوع' })); }));
    await expectNo('delete an admin account', await tryUsers((l) => { const i = l.findIndex((u) => u.id === 'TEST_ONLY_dmA'); l.splice(i, 1); }));
    /* writing systems */
    await expectNo('switch a system OFF in his ceiling', await forge(m, KP, (v) => { v.caps[A] = v.caps[A].filter((k) => k !== 'tasks'); return v; }));
    await expectNo('switch a system ON above his ceiling', await forge(m, KP, (v) => { v.caps[A] = v.caps[A].concat(['seized']); return v; }));
    await expectNo('switch a system OFF on the platform', await forge(m, KPL, (v) => { v = v || {}; v.mods = v.mods || {}; v.mods.off = (v.mods.off || []).concat(['tasks']); return v; }));
    /* editing himself */
    await expectNo('make himself platform admin', await tryUsers((l) => { by(l, 'TEST_ONLY_mgrA').role = 'super'; }));
    await expectNo('move himself to another unit', await tryUsers((l) => { by(l, 'TEST_ONLY_mgrA').deptId = B; }));
    const me = await m.page.evaluate(async (d) => { const E = KIVO.Perm44, rec = E.rolesOf(d) || { v: 1, roles: [], people: {} }, dr = E.draft(d); const roles = (rec.roles || []).length ? rec.roles : [{ id: 'TEST_ONLY_rx', name: 'TEST_ONLY دور', sys: { tasks: { lvl: 'view' } } }]; E.setRoles(dr, d, { v: 1, roles, people: Object.assign({}, rec.people || {}, { [KIVO.BassamAuth.user().ekey]: { role: roles[0].id, ex: [] } }) }); return E.commit(dr); }, A);
    await lab.idle(); refused.push('give himself a role');
    assert.equal(me && me.ok, false, 'his own record in the roles: refused ' + JSON.stringify(me));
    /* nothing of the above was stored */
    assert.ok(same(kv(lab, KU), U1), 'accounts unchanged by the refused requests'); assert.ok(same(U1, U0), 'and the control left them as they were');
    assert.equal(JSON.stringify(kv(lab, KP)), P0, 'ceilings unchanged'); assert.equal(JSON.stringify(kv(lab, KPL)), PL0, 'platform switches unchanged');
    assert.equal(JSON.stringify(kv(lab, RK(A))), R0, 'roles record unchanged');
    assert.equal(refused.length, 13, 'every case ran');
  } finally { await b.close(); await lab.close(); }
});

test('V7 · د6 م6 · ج6: no person / role / admin / log line from another branch — in the UI and in the server responses', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw); s.page.setDefaultTimeout(15000);
    await seedRoles(s, B, ROLE_B, 'TEST_ONLY_eB1'); await lab.idle();
    await seedRoles(s, A, ROLE_A, 'TEST_ONLY_eA1'); await lab.idle();
    const has = (x, marks) => { const t = typeof x === 'string' ? x : JSON.stringify(x); return marks.filter((k) => t.includes(k)); };
    /* server: the unit's log carries its own changes only */
    const la = await s.api('/api/perm44/log?d=' + A + '&limit=50'), lb = await s.api('/api/perm44/log?d=' + B + '&limit=50');
    assert.equal(la.status, 200); assert.ok(JSON.stringify(lb.j).includes(ROLE_B.name), 'B\'s log has B\'s role');
    assert.deepEqual(has(la.j, B_MARKS), [], 'A\'s log response: nothing of B');
    assert.deepEqual(has((await s.api('/api/perm44/log?d=' + S1 + '&limit=50')).j, B_MARKS.concat([ROLE_A.name])), [], 'S1\'s log: nothing of A or B');
    /* UI (platform admin): every tab of A and of S1 */
    for (const u of [A, S1]) for (const t of ['admins', 'roles', 'people', 'log']) {
      await open(s, '#/sysadmin/org/' + u + '/' + t); await s.page.waitForTimeout(400);
      const txt = await s.page.locator('main .og-unit').innerText();
      assert.deepEqual(has(txt, B_MARKS), [], u + ' · ' + t + ': nothing of B in the unit column');
    }
    await s.ctx.close();
    /* the unit manager of A: his screen and every server response it reads */
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw); m.page.setDefaultTimeout(15000);
    const bodies = [];
    m.page.on('response', async (r) => { if (!/\/api\//.test(r.url()) || /\/api\/(?:changes|presence)\b/.test(r.url())) return; try { bodies.push([new URL(r.url()).pathname + new URL(r.url()).search, await r.text()]); } catch (e) {} });
    await m.page.reload({ waitUntil: 'domcontentloaded' }); await m.page.waitForSelector('aside.bsb', { timeout: 30000 }); await m.page.waitForTimeout(1500);
    for (const u of [A, S1]) for (const t of ['overview', 'admins', 'roles', 'people', 'log']) {
      await open(m, '#/admin/perm/' + u + '/' + t); await m.page.waitForTimeout(400);
      assert.deepEqual(has(await m.page.locator('main .og').innerText(), B_MARKS.concat(['TEST_ONLY إدارة ب'])), [], 'manager · ' + u + ' · ' + t + ': nothing of B (tree included)');
    }
    await lab.idle();
    const leak = bodies.filter(([, t]) => has(t, [ROLE_B.name, ROLE_B.id]).length).map(([u]) => u);
    assert.deepEqual(leak, [], 'no server response the manager\'s screen read carries B\'s roles');
    /* hand-made reads of the other branch: refused */
    for (const path of ['/api/perm44/log?d=' + B + '&limit=50', '/api/perm44/check?d=' + B + '&role=' + ROLE_B.id + '&key=' + encodeURIComponent('task.create'), '/api/perm44/log?d=' + G + '&limit=50']) {
      const r = await m.api(path); assert.equal(r.status, 403, path + ' → ' + r.status + ' ' + JSON.stringify(r.j));
    }
    const ub = await m.api('/api/get?keys=' + KU);
    assert.deepEqual(has(ub.j, ['TEST_ONLY مدير ب', 'TEST_ONLY_mgrB']), [], 'the accounts he reads: nothing of B');
    const rb = await m.api('/api/get?keys=' + encodeURIComponent(RK(B)));
    assert.deepEqual(has(rb.j, [ROLE_B.name, ROLE_B.id]), [], 'B\'s roles record is not readable by A\'s manager: ' + JSON.stringify(rb.j).slice(0, 200));
    assert.deepEqual(m.errs, [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});
