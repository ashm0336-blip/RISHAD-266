/* V7 · د7 (52 · §3) — كرت «الصلاحيات» في التقرير اليومي يعدّ حاملي كلِّ دورٍ في الوردية، والرئيسُ والنائب خانتان مستقلّتان من القائمتين المنسدلتين.
   الخلل (قبل): الكرت عامل أولَ دورين من أدوار الإدارة على أنهما خانتا الرئيس والنائب (r[0] = chief?1:0 · r[1] = deputy?1:0) ولم يعدّ إلا من الدور الثالث،
   فإدارةٌ بدورين فقط تُظهر 0 مهما كان عددُ حامليهما في الوردية.
   متصفحٌ حقيقي على المختبر المعزول (مدير الإدارة أ · بيانات TEST_ONLY):
     ① إدارةٌ بدورين فقط، والوردية فيها حاملوهما، والقائمتان فارغتان ⇒ الكرت يعدّ الحاملين جميعاً (5 من 6) والخانتان صفر.
     ② اختيارُ الرئيس والنائب من القائمتين (rpSetLeader — طريقُ القائمة المنسدلة نفسُه) ⇒ الخانتان 1 و1، والدوران يعدّان بقيةَ حامليهما (لا يُعدّ المعيَّنان مرّتين).
     ③ التلميحات تتبع ذلك. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from '../../../../tests/browser/local_server.mjs';
import { chromium, openAs } from '../../../../tests/browser/lab_browser.mjs';
import { replaceOperationalFixture } from '../../../../tests/unit/operational_legacy_seed_fx.mjs';
import { present, openRoute, today, logicOf, callLogic } from '../../../../tests/removal/boundary_fx.mjs';

const A = 'TEST_ONLY_A', SHIFT = 'TEST_ONLY_S', H = today(), YM = H.y + '-' + H.m, DAY = H.y + '-' + H.m + '-' + H.d;
const R1 = { id: 'TEST_ONLY_r1', name: 'TEST_ONLY دور أول', sys: {} }, R2 = { id: 'TEST_ONLY_r2', name: 'TEST_ONLY دور ثانٍ', sys: {} };
const EMPS = [1, 2, 3, 4, 5, 6].map((i) => ({ eid: 'TEST_ONLY_eA' + i, name: 'TEST_ONLY موظف أ' + i, nid: '12000000' + String(i).padStart(2, '0') }));
/* حملةُ الأدوار: eA1 · eA3 · eA4 ← الدور الأول · eA2 · eA5 ← الدور الثاني · eA6 بلا دور */
const HOLD = { TEST_ONLY_eA1: R1.id, TEST_ONLY_eA3: R1.id, TEST_ONLY_eA4: R1.id, TEST_ONLY_eA2: R2.id, TEST_ONLY_eA5: R2.id };

/* الكرت كما يُرسم: الرقمُ الأوسط وصفوفُه (الاسم · العدد · التلميح) وتلميحُه العام — الأرقامُ تُرسم هندية بعلامات اتجاه فتُوحَّد للمقارنة */
const readCard = (p) => p.evaluate(() => {
  const N = (t) => String(t || '').replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '').replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x660)).trim();
  const host = [...document.querySelectorAll('main .bs-tip-host')].find((e) => /^الصلاحيات/.test(e.textContent.trim()));
  if (!host) return null;
  const card = host.parentElement.parentElement, b = card.querySelector('b');
  const rows = [...card.querySelectorAll('div[title]')].map((d) => { const sp = d.querySelector('span'), num = d.querySelector('span[dir=ltr]'), em = num && num.querySelector('em'); return { label: N(sp.textContent), n: N(num ? num.textContent.slice(0, num.textContent.length - (em ? em.textContent.length : 0)) : ''), tip: N(d.getAttribute('title')) }; });
  return { tot: b ? N(b.textContent) : '', tip: N(host.querySelector('.bs-tip').textContent), rows };
});
const waitCard = (p, tot) => p.waitForFunction((tot) => {
  const N = (t) => String(t || '').replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '').replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x660)).trim();
  const host = [...document.querySelectorAll('main .bs-tip-host')].find((e) => /^الصلاحيات/.test(e.textContent.trim()));
  const b = host && host.parentElement.parentElement.querySelector('b'); return !!b && N(b.textContent) === tot;
}, tot, { timeout: 30000, polling: 250 }).then(() => true, () => false);
const row = (c, label) => c.rows.find((r) => r.label === label);

test('V7 · د7 (52 §3): كرت «الصلاحيات» — إدارةٌ بدورين فقط تُعدّ بحامليها، والرئيسُ والنائب من القائمتين', { timeout: 420000, skip: !present('dreport') || !present('staff') }, async () => {
  const lab = await startLab();
  await replaceOperationalFixture(lab.env, 'bsdept:' + A + ':bassam_employees_v1', EMPS);
  await replaceOperationalFixture(lab.env, 'bsdept:' + A + ':bassam_staffing_v3', { [YM]: Object.assign({ __shifts: [{ name: SHIFT, color: '#b99751', tStart: '07:00', tEnd: '15:00' }] }, Object.fromEntries(EMPS.map((e) => [e.eid, { shift: SHIFT }]))) });
  await replaceOperationalFixture(lab.env, 'bsdept:' + A + ':bassam_dreport_v1', { [DAY]: { created: 1, shifts: { [SHIFT]: {
    pulled: true, roster: EMPS.map((e) => ({ ekey: e.eid, name: e.name, st: 'pr' })), leaders: { chief: '', deputy: '' }, def: { color: '#b99751', tStart: '07:00', tEnd: '15:00' } } } } });
  const b = await chromium.launch();
  try {
    /* دوران فقط في الإدارة أ وحاملوهما — من مدير المنصة عبر KIVO.Perm44 (المسارُ الواحد) */
    const su = await openAs(b, lab, LAB.superUn, LAB.superPw); await su.go('#/admin', 3000);
    const saved = await su.page.evaluate(async ([d, roles, hold]) => {
      const E = KIVO.Perm44, dr = E.draft(d), rec = E.rolesOf(d);
      rec.roles = roles; rec.people = {}; Object.keys(hold).forEach((k) => { rec.people[k] = { role: hold[k], ex: [] }; });
      const r = E.setRoles(dr, d, rec); if (!r.ok) return r; return E.commit(dr);
    }, [A, [R1, R2], HOLD]);
    assert.ok(saved && saved.ok, 'الدوران حُفظا: ' + JSON.stringify(saved)); await lab.idle(); await su.ctx.close();

    const s = await openAs(b, lab, LAB.mgrA, LAB.pw), p = s.page; p.setDefaultTimeout(30000);
    await openRoute(s, present('daily') ? '#/daily/dreport' : '#/dreport');
    await logicOf(p, 'rpSetLeader');
    assert.deepEqual(await p.evaluate((d) => KIVO.Perm44.rolesOf(d).roles.map((r) => r.id), A), [R1.id, R2.id], 'الإدارةُ فيها دوران فقط');

    /* ① القائمتان فارغتان: كلُّ حاملٍ يُعدّ في دوره — 3 + 2 = 5 من 6 */
    await waitCard(p, '5');
    const c1 = await readCard(p);
    assert.ok(c1, 'الكرت مرسوم');
    assert.equal(c1.tot, '5', 'حاملو الدورين في الوردية يُعدّون (كان 0): ' + JSON.stringify(c1.rows));
    assert.deepEqual(c1.rows.map((r) => [r.label, r.n]), [['رئيس الوردية', '0'], ['نائب رئيس الوردية', '0'], [R1.name, '3'], [R2.name, '2']], 'الخانتان مستقلّتان عن الدورين');
    assert.match(row(c1, 'رئيس الوردية').tip, /القائمة المنسدلة/, 'تلميحُ الخانة: من القائمة المنسدلة');
    assert.match(row(c1, R1.name).tip, /حاملو الدور «TEST_ONLY دور أول» في هذه الوردية: 3 من 6/, 'تلميحُ الدور: عددُ حامليه');
    assert.doesNotMatch(c1.tip, /والبقية بحسب أدوار الإدارة/, 'التلميحُ العام لا يقول إن البقية وحدهم يُعدّون');
    assert.match(c1.tip, /كلُّ دورٍ من أدوار الإدارة يُعدّ بحامليه في الوردية/);

    /* ② الرئيسُ والنائب من القائمتين المنسدلتين (طريقُ الحفظ نفسُه) */
    assert.equal(await callLogic(p, 'rpSetLeader', ['chief', 'TEST_ONLY_eA1']), true, 'الرئيس حُفظ');
    assert.equal(await callLogic(p, 'rpSetLeader', ['deputy', 'TEST_ONLY_eA2']), true, 'النائب حُفظ');
    let c2 = null;
    for (let i = 0; i < 120; i++) { c2 = await readCard(p); const r0 = c2 && row(c2, 'رئيس الوردية'); if (r0 && r0.n === '1' && row(c2, 'نائب رئيس الوردية').n === '1') break; await p.waitForTimeout(250); }
    assert.equal(c2.tot, '5', 'المجموعُ لا يتكرّر فيه المعيَّنان');
    assert.deepEqual(c2.rows.map((r) => [r.label, r.n]), [['رئيس الوردية', '1'], ['نائب رئيس الوردية', '1'], [R1.name, '2'], [R2.name, '1']], 'الخانتان من القائمتين، والدوران ببقية حامليهما');
    assert.match(row(c2, 'رئيس الوردية').tip, /TEST_ONLY موظف أ1/, 'تلميحُ الخانة يسمّي المختار');
    assert.match(row(c2, R2.name).tip, /: 1 من 6/, 'تلميحُ الدور بعدده الجديد');
    assert.deepEqual(s.errs, [], 'بلا أخطاء صفحة');
  } finally { await b.close(); await lab.close(); }
});

/* ④ في الموضع نفسه (52 §3): تلميحُ «الطاقم الإشرافي» في الجولات يصف المعيارَ الحالي — دورٌ إشرافي (sup:true · KIVO.BassamSup) ورئيسُ/نائبُ الوردية من التقرير —
   لا «قالب صلاحيات موسوم إشرافي» (القوالبُ حُذفت). يُقرأ من القالبين ومن الملفّين المولَّدين معاً. */
test('V7 · د7 (52 §3): تلميحُ «الطاقم الإشرافي» في الجولات يشير إلى الأدوار لا إلى القوالب', { skip: !present('daily') }, async () => {
  const fs = await import('node:fs'), path = await import('node:path'), { fileURLToPath } = await import('node:url');
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
  for (const f of ['src/systems/daily/client/logic.js.tpl', 'src/systems/daily/client/logic.js', 'src/systems/daily/client/view.html.tpl', 'src/systems/daily/client/view.html']) {
    const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.doesNotMatch(s, /قالب صلاحيات موسوم/, f + ': لا ذكرَ لقالب الصلاحيات');
    assert.match(s, /دورٍ إشرافي من أدوار الإدارة ورئيس ونائب الوردية من تقرير اليوم/, f + ': التلميحُ يصف الأدوار');
  }
  const sup = fs.readFileSync(path.join(ROOT, 'src/slots/permissions/334-perm-tree-tpl.js.tpl'), 'utf8');
  assert.match(sup, /function isSupRole\(r\)\{ return !!\(r && r\.sup === true\); \}/, 'المعيارُ نفسُه: علامةُ الدور sup:true');
});
