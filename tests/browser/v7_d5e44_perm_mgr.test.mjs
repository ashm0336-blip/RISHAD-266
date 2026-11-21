/* V7 · د5-هـ (44 · المدير) — مستويان: مديرُ المنصة يضبط سقفَ الوحدة، ومديرُ الإدارة يمنح موظفيه داخله — في المختبر المعزول (TEST_ONLY، الإنفاذ، بلا page.route):
   (أ) مديرُ المنصة يطفئ نظاماً مفعّلاً لإدارة أ في «الصلاحيات ← الأنظمة»؛
   (ب) مديرُ الإدارة (TEST_ONLY_mgrA) يفتح «الإعدادات ← الصلاحيات» (#/admin/perm/roles): الأدوار · الأشخاص · السجل بلا «الأنظمة» ولا «شاهد الصفحة كـ»،
       ومحرّرُ الدور لا يعرض إلا أنظمةَ سقفه (المطفأُ غائبٌ عن الصفحة كلها)؛
   (ج) ينشئ دوراً على «إدخال» لنظامٍ واحد ويحفظ — طلبُ /api/save واحد بالمفتاحين (الأدوار + المنحُ المترجَم)؛
   (د) يُسنده لموظف في «الأشخاص» ويحفظ — طلبٌ واحد بالمفتاحين؛ فاسمُ الدور هو اسمُ الصلاحية (permLabel · الجدول · «صفحتي» الموظف)
       و/api/perm44/check يوافق (مفتاحُ الإنشاء مسموح «role»، والتعديلُ ممنوع «level»)؛
   (هـ) لا يرفع شيئاً فوق سقفه: دورٌ بالنظام المطفأ يُرفض في الخادم (والواجهةُ لا تعرضه أصلاً)، ولا يغيّر سجلَّه هو (الواجهةُ تقول ذلك، والخادمُ يرفض)؛
   (و) السجلُّ يعرض تغييراته — لا تغييرَ السقف ولا اسمَ النظام المطفأ؛
   (ز) الموظفُ العادي لا يرى التبويب ولا يفتحه العنوان.
   KIVO_P44_SHOTS=<مجلد> يحفظ لقطاتٍ (deviceScaleFactor 1). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const SHOTS = process.env.KIVO_P44_SHOTS || '';
const A = 'TEST_ONLY_A', EMP = 'TEST_ONLY_eA1', ROLE = 'TEST_ONLY مدخل المهام', OFF = { k: 'dstats', n: 'الإحصائيات اليومية' };
const P = (p, sel, o) => p.locator('main .p44 ' + sel, o);
const shot = async (p, name) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await p.evaluate(() => window.scrollTo(0, 0)); await p.screenshot({ path: path.join(SHOTS, name + '.png') }); };
const kv = (lab, k) => { const r = lab.env.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', k).map((x) => x.v).join(''); return r ? JSON.parse(r) : null; };
async function settle(lab, p, ms = 900) { await p.waitForTimeout(ms); await lab.idle(); }

test('V7 · د5-هـ (44 · المدير) · the department manager builds a role inside his ceiling and assigns it: one save, the server agrees; nothing above the ceiling, not himself; an employee has no tab', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    /* (أ) super turns one ON system OFF for A */
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw); s.page.setDefaultTimeout(15000);
    await s.go('#/sysadmin/org/' + A + '/perm/systems', 3000);
    const row = P(s.page, '.p44-row', { hasText: OFF.n }).first();
    assert.equal(await row.getAttribute('data-on'), 'true', OFF.n + ' is ON for A before');
    await P(s.page, 'button.p44-sw[aria-label="' + OFF.n + '"]').click(); await s.page.waitForTimeout(200);
    await P(s.page, '.p44-bar button', { hasText: 'حفظ الأنظمة' }).click(); await settle(lab, s.page, 1500);
    assert.ok(!(kv(lab, 'bassam_perms_v1').caps[A] || []).includes(OFF.k), 'the ceiling record of A no longer holds ' + OFF.k);
    await s.ctx.close();

    /* (ب) the department manager: his «الصلاحيات» */
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw, { viewport: { width: 1366, height: 1100 }, context: { deviceScaleFactor: 1 } }); const p = m.page; p.setDefaultTimeout(15000);
    const saves = []; p.on('request', (r) => { if (r.method() === 'POST' && /\/api\/save$/.test(new URL(r.url()).pathname)) saves.push(JSON.parse(r.postData() || '{}')); });
    const answers = []; p.on('response', async (r) => { if (r.request().method() === 'POST' && /\/api\/save$/.test(new URL(r.url()).pathname)) { let j = null; try { j = await r.json(); } catch (e) { j = null; } answers.push({ st: r.status(), j }); } });
    await m.go('#/admin', 3000);
    const tabs = (await p.locator('main .adm-tabbar--d [role=tab]').allInnerTexts()).map((x) => x.trim());
    assert.ok(tabs.includes('الصلاحيات'), 'his settings offer «الصلاحيات»: ' + JSON.stringify(tabs));
    await p.locator('main .adm-tabbar--d [role=tab]', { hasText: 'الصلاحيات' }).click(); await p.waitForTimeout(700);
    assert.equal(await p.evaluate(() => location.hash), '#/admin/perm/roles');
    assert.deepEqual(await P(p, 'nav[aria-label="أقسام الصلاحيات"] button').allInnerTexts(), ['الأدوار', 'الأشخاص', 'السجل'], 'no «الأنظمة» — the ceiling is the platform admin\'s');
    assert.equal(await P(p, '[aria-label="شاهد الصفحة كـ"]').count(), 0, 'no view-as');
    assert.match(await P(p, '').first().innerText(), /أدوار موظفي إدارتك فقط/);
    const ceil = await p.evaluate((d) => { const E = KIVO.Perm44, on = E.ceiling(d).on; return E.sysList().filter((x) => on.includes(x.key)).map((x) => x.name); }, A);
    assert.ok(!ceil.includes(OFF.n) && ceil.includes('المهام'), 'his ceiling (engine): ' + JSON.stringify(ceil));
    await shot(p, 'mgr_1_roles_empty');

    /* (ج) a role at «إدخال» for one system */
    await P(p, 'button', { hasText: '+ دور جديد' }).click(); await p.waitForTimeout(400);
    const ed = (await P(p, '.p44-rows .p44-row b').allInnerTexts()).map((x) => x.trim());
    assert.deepEqual(ed, ceil, 'the role editor offers exactly the systems ON in his ceiling');
    assert.ok(!(await P(p, '').first().innerText()).includes(OFF.n), 'the OFF system appears nowhere on his page');
    await P(p, 'input[maxlength="60"]').fill(ROLE); await P(p, 'input[maxlength="60"]').dispatchEvent('change'); await p.waitForTimeout(300);
    await P(p, 'button[aria-label="تفعيل المهام لهذا الدور"]').click(); await p.waitForTimeout(300);
    await P(p, 'select[aria-label="مستوى المهام"]').selectOption('input'); await p.waitForTimeout(300);
    assert.match(await P(p, 'aside[aria-label="المعاينة"] .p44-menu').first().innerText(), /المهام\s*إدخال/, 'what the holder sees, live');
    await shot(p, 'mgr_2_role_editor');
    await P(p, '.p44-bar button', { hasText: 'مراجعة وحفظ' }).click(); await p.waitForTimeout(400);
    await shot(p, 'mgr_3_review');
    saves.length = 0;
    await P(p, '.p44-rev button', { hasText: 'حفظ' }).last().click(); await settle(lab, p, 2500);
    assert.equal(await P(p, '.p44-rev').count(), 0, 'saved: the review is closed (no refusal)');
    assert.equal(saves.length, 1, 'exactly one save request');
    assert.deepEqual(Object.keys(saves[0].set || {}).sort(), ['bsdept:' + A + ':bassam_grants_v1', 'bsdept:' + A + ':bassam_roles_v1'], 'roles + compiled grants in the same request');
    const role = kv(lab, 'bsdept:' + A + ':bassam_roles_v1').roles.find((r) => r.name === ROLE);
    assert.ok(role, 'the server holds the role'); assert.deepEqual(role.sys, { tasks: { lvl: 'input' } });

    /* (د) assign it */
    await P(p, 'nav[aria-label="أقسام الصلاحيات"] button', { hasText: 'الأشخاص' }).click(); await p.waitForTimeout(600);
    assert.equal(await p.evaluate(() => location.hash), '#/admin/perm/people');
    await P(p, 'table.p44-people button', { hasText: 'TEST_ONLY موظف أ' }).first().click(); await p.waitForTimeout(400);
    await P(p, 'aside[aria-label="تفاصيل الشخص"] [role=radio]', { hasText: ROLE }).click(); await p.waitForTimeout(300);
    await P(p, '.p44-bar button', { hasText: 'مراجعة وحفظ' }).click(); await p.waitForTimeout(300);
    saves.length = 0;
    await P(p, '.p44-rev button', { hasText: 'حفظ' }).last().click(); await settle(lab, p, 2500);
    assert.equal(await P(p, '.p44-rev').count(), 0, 'the assignment saved (no refusal)');
    assert.equal(saves.length, 1, 'exactly one save request for the assignment');
    assert.deepEqual(Object.keys(saves[0].set || {}).sort(), ['bsdept:' + A + ':bassam_grants_v1', 'bsdept:' + A + ':bassam_roles_v1']);
    const G = kv(lab, 'bsdept:' + A + ':bassam_grants_v1');
    assert.equal(G.emp[EMP].src, 'role:' + role.id, 'the compiled grant names its role');
    const K = await p.evaluate(() => { const E = KIVO.Perm44, R = KIVO.KIVO_REGISTRY.byKey, inp = E.keysFor('tasks', 'input'); return { inp, create: inp.filter((k) => R[k].type === 'create'), edit: E.keysFor('tasks', 'edit').filter((k) => R[k].type === 'edit') }; });
    assert.deepEqual(G.emp[EMP].plus.slice().sort(), K.inp.slice().sort(), 'grant = tasks · input');
    assert.ok(K.create.length && K.edit.length, JSON.stringify(K));
    const chk = (key, q) => m.api('/api/perm44/check?d=' + A + '&' + q + '&key=' + encodeURIComponent(key)).then((r) => r.j || {});
    const yes = await chk(K.create[0], 'ekey=' + EMP), no = await chk(K.edit[0], 'ekey=' + EMP);
    assert.equal(yes.allow, true, 'the server allows the input key: ' + JSON.stringify(yes)); assert.equal(yes.why, 'role');
    assert.equal(no.allow, false, 'the server denies the edit key: ' + JSON.stringify(no)); assert.equal(no.why, 'level');
    assert.ok(!yes.on.includes(OFF.k), 'the server\'s ceiling of A has no ' + OFF.k);
    assert.equal(await p.evaluate(([e, d]) => KIVO.BassamAuth.permLabel(e, d), [EMP, A]), ROLE, 'permLabel = the role name');
    assert.match(await P(p, 'table.p44-people').innerText(), new RegExp('TEST_ONLY موظف أ[\\s\\S]*' + ROLE), 'his people table carries the role');
    /* «اختبار الوصول» from the roles section: the button's answer is the server's */
    await P(p, 'nav[aria-label="أقسام الصلاحيات"] button', { hasText: 'الأدوار' }).click(); await p.waitForTimeout(500);
    await P(p, '.p44-role', { hasText: ROLE }).click(); await p.waitForTimeout(300);
    await P(p, 'section[aria-label="اختبار الوصول"] select').selectOption(K.create[0]); await p.waitForTimeout(200);
    await P(p, 'section[aria-label="اختبار الوصول"] button', { hasText: 'اسأل الخادم' }).click(); await p.waitForTimeout(1200);
    assert.match(await P(p, '.p44-res').innerText(), /مسموح بمستوى الدور/, 'the access test answers from the server');

    /* (هـ) nothing above the ceiling: the server refuses a role holding the OFF system (built through the same engine draft) */
    const r0 = JSON.stringify(kv(lab, 'bsdept:' + A + ':bassam_roles_v1'));
    const up = await p.evaluate(async ([d, off]) => {
      const E = KIVO.Perm44, rec = E.rolesOf(d), dr = E.draft(d);
      rec.roles.push({ id: 'TEST_ONLY_rx', name: 'TEST_ONLY فوق السقف', sys: { [off]: { lvl: 'view' } } });
      E.setRoles(dr, d, rec);
      return E.commit(dr);
    }, [A, OFF.k]);
    await settle(lab, p, 1200);
    assert.equal(up.ok, false, 'the server refuses a role above his ceiling: ' + JSON.stringify(up));
    const why = () => { const d = (answers.at(-1) || {}).j || {}; return ((d.denied || {})['bsdept:' + A + ':bassam_roles_v1'] || {}).why; };
    assert.equal(why(), 'cap', 'refused for the ceiling (perm44RolesWhy)');
    assert.equal(JSON.stringify(kv(lab, 'bsdept:' + A + ':bassam_roles_v1')), r0, 'nothing stored');
    /* …and not himself: the UI says so, and the server refuses */
    await m.go('#/admin/perm/people', 2500);
    await P(p, 'table.p44-people button', { hasText: 'TEST_ONLY مدير أ' }).first().click(); await p.waitForTimeout(400);
    const side = P(p, 'aside[aria-label="تفاصيل الشخص"]');
    assert.match(await side.innerText(), /هذا سجلّك أنت/, 'his own row says he cannot change it');
    assert.equal(await side.locator('[role=radio]').count(), 0, 'no role choice on his own row');
    assert.equal(await side.locator('button', { hasText: '+ استثناء مؤقت' }).count(), 0, 'no exception on his own row');
    assert.match(await P(p, 'table.p44-people').innerText(), /TEST_ONLY مدير أ[\s\S]*أنت[\s\S]*مدير الإدارة/, 'his row: «أنت» · مدير الإدارة');
    await shot(p, 'mgr_4_people_self');
    const me = await p.evaluate(async (d) => { const E = KIVO.Perm44, rec = E.rolesOf(d), dr = E.draft(d); E.setPerson(dr, d, KIVO.BassamAuth.user().ekey, { role: rec.roles[0].id, ex: [] }); return E.commit(dr); }, A);
    await settle(lab, p, 1200);
    assert.equal(me.ok, false, 'the server refuses his own record: ' + JSON.stringify(me));
    assert.equal(why(), 'self', 'refused: nobody grants himself');
    assert.equal(JSON.stringify(kv(lab, 'bsdept:' + A + ':bassam_roles_v1')), r0, 'nothing stored');

    /* a fresh session of the manager reads both records (the base of his next save): the engine sees what the server holds */
    await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForSelector('aside.bsb nav.s-nav', { timeout: 30000 }); await p.waitForTimeout(2500);
    const seen = await p.evaluate((d) => [localStorage.getItem('bsdept:' + d + ':bassam_roles_v1'), localStorage.getItem('bsdept:' + d + ':bassam_grants_v1')].map((x) => (x ? JSON.parse(x) : null)), A);
    assert.deepEqual(seen, [kv(lab, 'bsdept:' + A + ':bassam_roles_v1'), kv(lab, 'bsdept:' + A + ':bassam_grants_v1')], 'roles + grants readable by the unit manager in enforce mode');
    /* (و) his log */
    await m.go('#/admin/perm/log', 3000);
    const items = P(p, '.p44-log > li');
    assert.ok((await items.count()) >= 2, 'his two saves are listed: ' + await items.count());
    assert.match(await items.first().innerText(), new RegExp('TEST_ONLY مدير أ[\\s\\S]*TEST_ONLY موظف أ[\\s\\S]*' + ROLE), 'the latest: his assignment');
    const logTxt = await P(p, '').first().innerText();
    assert.ok(!logTxt.includes(OFF.n) && !logTxt.includes('سقف إدارة') && !logTxt.includes('سقوف الإدارات'), 'the ceiling change (the platform admin\'s) and the OFF system are not in his log');
    await shot(p, 'mgr_5_log');
    assert.deepEqual(m.errs, [], 'no page errors (manager)');

    /* the employee: the role name is his permission name; and the tab is not his */
    const e = await openAs(b, lab, LAB.empA, LAB.pw);
    await e.go('#/profile', 3000);
    assert.match(await e.page.locator('main').innerText(), new RegExp('TEST_ONLY إدارة أ [·-] ' + ROLE), '«صفحتي» role line');
    assert.deepEqual(await e.page.evaluate(() => [KIVO.BassamPerm.can('tasks', 'add'), KIVO.BassamPerm.can('tasks', 'edit')]), [true, false], 'he can add tasks, not edit them');
    await e.go('#/admin/perm/roles', 3000);
    assert.doesNotMatch(await e.page.evaluate(() => location.hash), /^#\/admin\/perm/, 'the address does not open it for an employee');
    assert.equal(await e.page.locator('main .p44').count(), 0, 'no «الصلاحيات» for an employee');
    const deny = await e.api('/api/perm44/check?d=' + A + '&ekey=' + EMP + '&key=' + encodeURIComponent(K.create[0]));
    assert.equal(deny.status, 403, 'the server refuses the access test to an employee');
    assert.deepEqual(e.errs, [], 'no page errors (employee)');
  } finally { await b.close(); await lab.close(); }
});
