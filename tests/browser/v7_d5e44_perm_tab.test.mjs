/* V7 · د5-هـ (44) — تبويبُ «الصلاحيات» في صفحة العقدة، في المختبر المعزول (TEST_ONLY، بلا شبكة).
   التوحيد: المحرّكُ KIVO.Perm44 الحقيقيُّ (345) ومسارا الخادم الحقيقيان /api/perm44/check و/api/perm44/log — لا بديلَ ولا page.route:
   أدوارُ الإدارة سجلٌّ مبذورٌ في قاعدة المختبر (bsdept:<A>:bassam_roles_v1)، والسجلُّ حدثا تدقيقٍ مبذوران بشكل ما يكتبه الخادم (etype perm44).
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
const ROLES = {
  v: 1,
  roles: [
    { id: 'TEST_ONLY_r1', name: 'TEST_ONLY مراقب', desc: 'TEST_ONLY يرصد ويُدخل', sys: { tasks: { lvl: 'input' }, staff: { lvl: 'view' } } },
    { id: 'TEST_ONLY_r2', name: 'TEST_ONLY رئيس وردية', desc: '', sys: { staff: { lvl: 'edit' }, dreport: { lvl: 'edit' } } },
  ],
  people: { TEST_ONLY_eA1: { role: 'TEST_ONLY_r1', ex: [] } },
};
/* البذرُ في قاعدة المختبر: سجلُّ الأدوار، وحدثا تدقيقٍ بشكل perm44AudEv (تغييرُ دور · سقفُ الإدارة) */
async function seed(lab) {
  const DB = lab.env.DB, k = 'bsdept:' + A + ':bassam_roles_v1';
  const ev = (cid, ts, dept, key, aft) => DB.prepare("INSERT INTO aud(cid,ts,uid,un,dept,k,rev,etype,eid,ename,act,ctx,bef,aft,ip,dev,city) VALUES(?1,?2,'TEST_ONLY_mgrA','TEST_ONLY مدير أ',?3,?4,1,'perm44',?5,'الصلاحيات','change',?6,'',?7,'','','')").bind(cid, ts, dept, key, dept || 'platform', A, JSON.stringify(aft));
  await DB.batch([DB.prepare('DELETE FROM kv WHERE k=?1').bind(k), ...lab.W.kvPutStmts(lab.env, 'kv', k, JSON.stringify(ROLES)), DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,1) ON CONFLICT(k) DO UPDATE SET rev=rev+1').bind(k),
    ev('TEST_ONLY_ev1', Date.UTC(2026, 10, 19, 8), A, k, { unit: A, units: [A], changes: [{ what: 'sys', role: 'TEST_ONLY_r1', sys: 'tasks', from: { lvl: 'view' }, to: { lvl: 'input' } }], affected: ['TEST_ONLY_eA1'] }),
    ev('TEST_ONLY_ev2', Date.UTC(2026, 10, 18, 8), '', 'bassam_perms_v1', { unit: null, units: [A], changes: [{ what: 'ceil.caps', unit: A, from: ['tasks', 'daily', 'dreport', 'admin', 'emps', 'dstats', 'staff', 'plan', 'seized'], to: ['tasks', 'daily', 'dreport', 'admin', 'emps', 'dstats', 'staff', 'plan'] }], affected: [] })]);
}
const shot = async (p, name) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: true }); };

test('V7 · د5-هـ (44) · «الصلاحيات»: super sees four sections and the unrestricted card; view-as manager hides every OFF system; a real manager cannot open it', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    await seed(lab);
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw, { context: { deviceScaleFactor: 1 } }); const p = s.page; p.setDefaultTimeout(15000);
    const H = () => p.evaluate(() => location.hash);
    /* V7 · د6: الشاشةُ الواحدة — تبويبُ «الصلاحيات» وأقسامُه الأربعة صارت تبويباتِ الوحدة السبعة (#/sysadmin/org/<الوحدة>/<التبويب>) */
    const TAB = (o) => p.locator('main .og-tabs .og-tab', o);
    const tabs = () => TAB().allInnerTexts().then((x) => x.map((t) => t.replace(/[\d٠-٩]+/g, '').replace(/\s+/g, ' ').trim()));
    const SEVEN = ['نظرة عامة', 'الأنظمة', 'المسؤولون', 'الأدوار', 'الأشخاص', 'السجل', 'البيانات'];
    const P = (sel, o) => p.locator('main .p44 ' + sel, o);
    await s.go('#/sysadmin/org/' + A, 2500);
    await lab.idle(); const w0 = s.writes.length;   /* what boot wrote is not this page's */
    const t = await tabs();
    assert.deepEqual(t, SEVEN, 'the tab bar (no «سقف الصفحات», no «الصلاحيات» tab of sections): ' + JSON.stringify(t));
    await TAB({ hasText: 'الأنظمة' }).click(); await p.waitForTimeout(700);
    assert.equal(await H(), '#/sysadmin/org/' + A + '/systems');
    /* ① systems */
    const SYS = await p.evaluate(() => KIVO.Perm44.sysList().filter((x) => x.toggle !== false).map((x) => x.name));
    const rows = await P('.p44-row').count(); assert.equal(rows, SYS.length, 'a row per toggleable system of the engine (' + SYS.length + ')');
    assert.deepEqual((await P('.p44-row[data-on="true"] b').allInnerTexts()).map((x) => x.trim()), ['الإحصائيات اليومية', 'عهد الموظفين', 'الجدول الشهري', 'التشغيل الميداني', 'المتابعة اليومية', 'التقرير اليومي', 'المهام'], 'ON in this unit\'s ceiling');
    assert.equal(await P('.p44-row button.p44-sw[role=switch][aria-label]').count(), SYS.length, 'every system switch is a labelled switch');
    assert.equal(await P('.p44-lrow button.p44-sw[role=switch][aria-label]').count(), await P('.p44-lrow').count(), 'V7 · د7 (أ): every lens switch too (lens rows under their hosts)');
    assert.match(await P('').innerText(), /إطفاء نظام لا يحذف بياناته: تبقى محفوظة وتعود كما هي عند التفعيل\./);
    assert.match(await P('aside[aria-label="المعاينة"]').first().innerText(), /صفحتي/);
    await shot(p, 'p44_1_systems_super');
    /* ② roles: the platform-admin card, then a role */
    /* V7 · د6: بطاقةُ «مدير المنصة» الثابتة انتقلت من قائمة الأدوار إلى تبويب «المسؤولون» في صف «المنصة كلها» */
    await s.go('#/sysadmin/org/platform/admins', 1500);
    assert.match(await P('.p44-super').innerText(), /صلاحية كاملة بلا أي قيد/);
    assert.equal(await P('select[aria-label^="مستوى"]').count(), 0, 'no level editor for the platform admin');
    await shot(p, 'p44_2_roles_super_card');
    await s.go('#/sysadmin/org/' + A + '/systems', 1500);
    await TAB({ hasText: 'الأدوار' }).click(); await p.waitForTimeout(600);
    assert.equal(await H(), '#/sysadmin/org/' + A + '/roles');
    assert.equal(await P('.p44-role', { hasText: 'مدير المنصة' }).count(), 0, 'the fixed card is not in the roles list any more');
    await P('.p44-role', { hasText: 'TEST_ONLY مراقب' }).click(); await p.waitForTimeout(400);
    const ed = (await P('.p44-rows .p44-row b').allInnerTexts()).map((x) => x.trim());
    assert.deepEqual(ed, ['الإحصائيات اليومية', 'موظفو الإدارة', 'عهد الموظفين', 'الجدول الشهري', 'التشغيل الميداني', 'المتابعة اليومية', 'التقرير اليومي', 'المهام'], 'the editor lists the ON systems only');
    await P('select[aria-label="مستوى المهام"]').selectOption('edit'); await p.waitForTimeout(400);
    assert.match(await P('.p44-bar').innerText(), /مراجعة وحفظ/);
    assert.match(await P('section[aria-label="المعاينة"], aside[aria-label="المعاينة"]').first().innerText(), /المهام\s*تعديل/);
    /* the access test asks the server */
    await P('section[aria-label="اختبار الوصول"] select').selectOption({ index: 1 });
    await P('section[aria-label="اختبار الوصول"] button', { hasText: 'اسأل الخادم' }).click(); await p.waitForTimeout(500);
    assert.match(await P('.p44-res').innerText(), /مسموح بمستوى الدور|مستوى الدور لا يشمله/, 'the server\'s answer (perm44Decide), in Arabic');
    await P('.p44-bar button', { hasText: 'مراجعة وحفظ' }).click(); await p.waitForTimeout(400);
    assert.equal(await P('[role=dialog][aria-modal="true"].p44-rev').count(), 1, 'V7 · د5-ح: the review is a modal dialog');
    const rev = await P('.p44-rev').innerText();
    assert.match(rev, /TEST_ONLY مراقب [·-] المهام/); assert.match(rev, /إدخال/); assert.match(rev, /تعديل/); assert.match(rev, /TEST_ONLY موظف أ/);
    await shot(p, 'p44_3_roles_review');
    await P('.p44-rev button', { hasText: 'رجوع' }).click(); await P('.p44-bar button', { hasText: 'تراجع' }).click(); await p.waitForTimeout(300);
    assert.equal(await P('.p44-bar').count(), 0, 'undo ⇒ nothing unsaved');
    /* ③ people, by address */
    await s.go('#/sysadmin/org/' + A + '/perm/people', 1500);   /* the old address of the section: read, then rewritten */
    assert.equal(await H(), '#/sysadmin/org/' + A + '/people'); assert.deepEqual((await p.locator('main .og-tabs .og-tab[aria-selected="true"]').allInnerTexts()).map((x) => x.trim()), ['الأشخاص'], 'the address opens its tab');
    assert.deepEqual((await P('table.p44-people th').allInnerTexts()).map((x) => x.trim()), ['الشخص', 'الدور', 'القسم', 'استثناءات', 'آخر دخول']);
    await P('table.p44-people button', { hasText: 'TEST_ONLY موظف أ' }).first().click(); await p.waitForTimeout(400);
    assert.match(await P('aside[aria-label="تفاصيل الشخص"]').innerText(), /ما يراه الآن[\s\S]*صفحتي/);
    assert.equal(await P('aside[aria-label="تفاصيل الشخص"] [role=radio][aria-checked=true]').count(), 1, 'exactly one role');
    await P('button', { hasText: '+ استثناء مؤقت' }).click(); await p.waitForTimeout(300);
    assert.equal(await P('input[type=date]').count(), 1, 'the exception has an expiry field');
    await shot(p, 'p44_4_people');
    /* ④ log */
    await TAB({ hasText: 'السجل' }).click(); await p.waitForTimeout(800);
    assert.equal(await P('.p44-log > li').count(), 2);
    assert.equal(await P('.p44-log button', { hasText: 'تراجع عن هذا التغيير' }).count(), 2);
    await shot(p, 'p44_5_log');
    /* view as the department manager: «الأنظمة» read-only (V7 · د5-ح — was hidden), no OFF system, no platform-admin role */
    await P('[aria-label="شاهد الصفحة كـ"] button', { hasText: 'مدير الإدارة' }).click(); await p.waitForTimeout(400);
    assert.deepEqual(await tabs(), SEVEN, 'the viewer changes what the tabs show, not the tabs');
    await TAB({ hasText: 'الأنظمة' }).click(); await p.waitForTimeout(500);
    assert.deepEqual((await P('.p44-row b').allInnerTexts()).map((x) => x.trim()), ['الإحصائيات اليومية', 'عهد الموظفين', 'الجدول الشهري', 'التشغيل الميداني', 'المتابعة اليومية', 'التقرير اليومي', 'المهام'], 'only what is ON in his ceiling');
    assert.equal(await P('button.p44-sw').count(), 0, 'no switches'); assert.equal(await P('.p44-row[data-on="false"]').count(), 0, 'never an OFF one');
    assert.equal(await P('aside[aria-label="الهيكل"]').count(), 0, 'no unit chain');
    await shot(p, 'p44_6a_systems_as_manager');
    await TAB({ hasText: 'الأدوار' }).click(); await p.waitForTimeout(500);
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
