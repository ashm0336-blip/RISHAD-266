/* V7 · د7 (أ) — العدساتُ في «الإدارات والصلاحيات»، في المتصفح الحقيقي فوق المختبر المعزول (TEST_ONLY، بلا شبكة). كلُّ خطوةٍ حفظٌ حقيقي عبر الخادم.
   ① مديرُ المنصة يطفئ عدسةً لإدارة من تبويب «الأنظمة» (المفتاحُ تحت «التشغيل الميداني» · «مراجعة وحفظ») ← قسمُها يراها مقفلةً «مطفأ من: <الإدارة>» ←
      مديرُ الإدارة لا يراها (لا في «الإعدادات ← الصلاحيات» ولا في أزرار الخريطة: lensOn) والخادمُ لا يطبّق فعلَها (بوابةٌ في جولة اليوم) ← إعادةُ التشغيل تعيدها كما كانت.
   ② محرّرُ الأدوار: صفُّ العدسة تحت مضيفها بالمستويات؛ موظفٌ بدورٍ فيه العدسةُ «مشاهدة» يحمل عرضَها بلا تعديل، و«تعديل» (من القائمة في المحرّر) يحمل تعديلَها. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';
import { DAY } from '../unit/world_fx.mjs';

const KP = 'bassam_perms_v1', A = 'TEST_ONLY_A', S1 = 'TEST_ONLY_A_S1', AN = 'TEST_ONLY إدارة أ';
const ALL = ['zones', 'paths', 'gates', 'marks', 'dist', 'dens'];
const norm = (s) => String(s).replace(/[‎‏‪-‮⁦-⁩]/g, '').replace(/\s+/g, ' ').trim();
const readKV = (lab, k) => { const v = lab.env.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', k).map((r) => r.v).join(''); return v ? JSON.parse(v) : null; };
const TS = 'main [data-org-tab="systems"]';
const open = async (s, hash, sel) => { await s.go(hash, 1500); await s.page.reload({ waitUntil: 'domcontentloaded' }); await s.page.waitForSelector(sel, { timeout: 30000 }); await s.page.waitForTimeout(1500); };
const lz = (p, k) => p.locator(TS + ' .p44-lrow[data-sys="' + k + '"]').first();
/* بوابةٌ في جولة اليوم بطريق الكتابة الحقيقي (operations read → /api/save) — قُبلت إن بقيت في المخزَّن */
let gn = 0;
async function addGate(lab, s, d) {
  const key = 'bsdept:' + d + ':bassam_rounds_v1', n = ++gn;
  const rd = await s.api('/api/operations/read?' + new URLSearchParams({ keys: key }));
  assert.equal(rd.status, 200, JSON.stringify(rd.j || rd).slice(0, 200));
  const cur = (rd.j.resources || {})[key], v = cur ? (typeof cur === 'string' ? JSON.parse(cur) : cur) : {};
  const day = v[DAY] || { t: 1, d: [{ sid: 'TEST_ONLY_S1', zones: [], paths: [], gates: [], marks: [] }] };
  day.d[0].gates = (day.d[0].gates || []).concat([{ uid: 'TEST_ONLY_bg' + n, id: 'TEST_ONLY_bg' + n, num: String(n), label: 'TEST_ONLY بوابة', x: 10, y: 10 }]);
  v[DAY] = day;
  const r = await s.api('/api/save', { method: 'POST', body: JSON.stringify({ requestId: 'TEST_ONLY_blens_' + n, epoch: rd.j.epoch, base: rd.j.base, set: { [key]: JSON.stringify(v) }, del: [], why: { [key]: 'TEST_ONLY' } }) });
  await lab.idle();
  if (process.env.LDBG) console.log('DBG', JSON.stringify(rd.j).slice(0, 300), JSON.stringify(r).slice(0, 500), JSON.stringify(await gatesOf(s, d)));
  return r.status === 200 && (await gatesOf(s, d)).includes('TEST_ONLY_bg' + n);
}
/* البواباتُ المخزَّنة في جولة اليوم كما يقرؤها الخادم لمدير المنصة (المجالُ التشغيلي — لا kv) */
let SU = null;
async function gatesOf(s, d) {
  const key = 'bsdept:' + d + ':bassam_rounds_v1', rd = await (SU || s).api('/api/operations/read?' + new URLSearchParams({ keys: key }));
  const cur = (rd.j.resources || {})[key], v = cur ? (typeof cur === 'string' ? JSON.parse(cur) : cur) : {};
  return (((v[DAY] || {}).d || [{}])[0].gates || []).map((g) => g.uid);
}

test('V7 · د7 (أ) ① — the platform admin switches a lens OFF for a department: its section is locked «مطفأ من»; its manager does not see it and the server does not apply its action; ON again brings it back as it was', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    const su = await openAs(b, lab, LAB.superUn, LAB.superPw); su.page.setDefaultTimeout(15000); const p = su.page;
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw); m.page.setDefaultTimeout(15000); const q = m.page;
    SU = su;
    assert.equal(await addGate(lab, m, A), true, 'control: the manager adds a gate while the lens is ON');
    await open(su, '#/sysadmin/org/' + A + '/systems', TS + ' .p44-lrow');
    for (const h of ['plan', 'daily']) assert.deepEqual(await p.locator(TS + ' .p44-row[data-sys="' + h + '"] + .p44-lz .p44-lrow').evaluateAll((L) => L.map((e) => e.dataset.sys)), ALL.map((L) => 'lens.' + L), 'the six lenses under ' + h);
    assert.equal(await p.locator(TS + ' .p44-lrow[data-on="true"]').count(), 12, 'all ON (no lens record) — under both hosts');
    /* OFF → «أثر الحفظ» → «مراجعة وحفظ» → «حفظ» */
    await lz(p, 'lens.gates').locator('button.p44-sw').click(); await p.waitForTimeout(300);
    assert.deepEqual(await p.locator(TS + ' .p44-lrow[data-sys="lens.gates"]').evaluateAll((L) => L.map((e) => e.dataset.on)), ['false', 'false'], 'one switch: both hosts mirror it');
    assert.match(norm(await p.locator('main [data-og="sys-effect"]').innerText()), /سيُطفأ: عدسة البوابات/);
    await p.locator('main .p44-bar button', { hasText: 'مراجعة وحفظ' }).click(); await p.locator('[role=dialog].p44-rev').waitFor();
    assert.match(norm(await p.locator('[role=dialog].p44-rev').innerText()), /عدسة البوابات/);
    await p.locator('.p44-rev button', { hasText: 'حفظ' }).click(); await p.waitForTimeout(1500); await lab.idle();
    assert.deepEqual(readKV(lab, KP).lenses[A], ALL.filter((k) => k !== 'gates'), 'server: the lens record of A');
    /* the section: inherited, locked, its source named */
    await open(su, '#/sysadmin/org/' + S1 + '/systems', TS + ' .p44-lrow');
    assert.equal(norm(await lz(p, 'lens.gates').locator('[data-og="lock"]').innerText()), 'مطفأ من: ' + AN);
    assert.equal(await lz(p, 'lens.gates').locator('button.p44-sw').isDisabled(), true);
    /* the manager: not in his «الإعدادات ← الصلاحيات», not on the map (lensOn), and the server does not apply its action */
    await open(m, '#/admin/perm/' + A + '/systems', 'main .p44-row');
    const mine = await q.locator('main .p44-lrow').evaluateAll((L) => [...new Set(L.map((e) => e.dataset.sys))]);
    assert.deepEqual(mine, ALL.filter((k) => k !== 'gates').map((L) => 'lens.' + L), 'his read-only list: the ON lenses only');
    assert.doesNotMatch(await q.locator('main [data-org-tab="systems"]').innerText(), /البوابات/, 'the OFF lens is not even named');
    assert.equal(await q.evaluate((d) => KIVO.BassamPerm.lensOn('gates', d), A), false, 'map buttons · panels · KPIs: lensOn false');
    assert.equal(await q.evaluate((d) => KIVO.BassamPerm.lensOn('zones', d), A), true);
    assert.equal(await addGate(lab, m, A), false, 'the server does not apply a gate written by the manager');
    /* ON again */
    await open(su, '#/sysadmin/org/' + A + '/systems', TS + ' .p44-lrow');
    await lz(p, 'lens.gates').locator('button.p44-sw').click(); await p.waitForTimeout(300);
    await p.locator('main .p44-bar button', { hasText: 'مراجعة وحفظ' }).click(); await p.locator('[role=dialog].p44-rev').waitFor();
    await p.locator('.p44-rev button', { hasText: 'حفظ' }).click(); await p.waitForTimeout(1500); await lab.idle();
    assert.deepEqual(readKV(lab, KP).lenses[A], ALL, 'server: back as it was');
    await open(m, '#/admin/perm/' + A + '/systems', 'main .p44-lrow');
    assert.equal(await q.locator('main .p44-lrow').count(), 12);
    assert.equal(await q.evaluate((d) => KIVO.BassamPerm.lensOn('gates', d), A), true, 'the map has it again');
    assert.equal(await addGate(lab, m, A), true, 'the server applies it again');
    const gates = await gatesOf(su, A);
    assert.ok(gates.includes('TEST_ONLY_bg1'), 'the gate added before the OFF is still there (data kept)');
    assert.deepEqual(su.errs, [], 'no page errors (platform admin)'); assert.deepEqual(m.errs, [], 'no page errors (manager)');
  } finally { await b.close(); await lab.close(); }
});

test('V7 · د7 (أ) ② — the role editor: a lens row under its host with the systems\' levels; «مشاهدة» gives its view without edit, «تعديل» gives its edit', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    const su = await openAs(b, lab, LAB.superUn, LAB.superPw); su.page.setDefaultTimeout(15000); const p = su.page;
    /* a role for the employee (the editor's own save path: KIVO.Perm44 draft → commit) */
    const r0 = await p.evaluate(async (A) => {
      const dr = KIVO.Perm44.draft(A), role = { id: 'TEST_ONLY_rl', name: 'TEST_ONLY دور العدسات', desc: '', sys: { plan: { lvl: 'edit' }, 'lens.zones': { lvl: 'view' } } };
      const a = KIVO.Perm44.setRoles(dr, A, { v: 1, roles: [role], people: { TEST_ONLY_eA1: { role: role.id, ex: [] } } });
      return a.ok ? await KIVO.Perm44.commit(dr) : a;
    }, A);
    assert.equal(r0.ok, true, JSON.stringify(r0)); await lab.idle();
    await open(su, '#/sysadmin/org/' + A + '/roles', 'main .p44-lrow');
    const row = p.locator('main .p44-lrow[data-sys="lens.zones"]').first();
    assert.equal(await row.getAttribute('data-on'), 'true'); assert.equal(await row.locator('select').inputValue(), 'view', 'the lens row at «مشاهدة»');
    assert.equal(await p.locator('main .p44-lrow').count(), 12, 'every lens enabled for the unit is a row (under both hosts)');
    if (process.env.LDBG) console.log('DBGO', JSON.stringify(await p.locator('main section[aria-label="اختبار الوصول"] option').evaluateAll((L) => L.map((o) => o.textContent))).slice(0, 600));
    assert.ok((await p.locator('main section[aria-label="اختبار الوصول"] option').evaluateAll((L) => L.map((o) => o.textContent))).some((t) => /^عدسة المصليات/.test(t)), '«اختبار الوصول» lists the lens actions');
    const held = async () => { const e = await openAs(b, lab, LAB.empA, LAB.pw); try { const r = await e.api('/api/authz'); return (((r.j.me || {}).depts || {})[A] || {}).p || []; } finally { await e.ctx.close(); } };
    let k = await held();
    assert.ok(k.includes('lens.zones.view') && !k.includes('lens.zones.data.edit') && !k.includes('lens.zones.create'), '«مشاهدة»: view, no edit tools — ' + JSON.stringify(k));
    assert.ok(k.includes('lens.gates.edit'), 'the other lenses follow the host level');
    /* «تعديل» from the editor, then save the roles */
    await row.locator('select').selectOption('edit'); await p.waitForTimeout(300);
    await p.locator('main .p44-bar button', { hasText: 'مراجعة وحفظ' }).click(); await p.locator('[role=dialog].p44-rev').waitFor();
    await p.locator('.p44-rev button', { hasText: 'حفظ' }).click(); await p.waitForTimeout(1500); await lab.idle();
    k = await held();
    assert.ok(k.includes('lens.zones.data.edit') && k.includes('lens.zones.create'), '«تعديل»: edits — ' + JSON.stringify(k));
    assert.deepEqual(su.errs, [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});

test('V7 · د7 (أ) ③ — carry what is outside the view: a lens grant outside the ceiling (lens OFF) survives the manager\'s role edit in the editor and is back unchanged when the lens is ON again', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    const su = await openAs(b, lab, LAB.superUn, LAB.superPw); su.page.setDefaultTimeout(15000); const p = su.page;
    const setL = async (L) => { const r = await p.evaluate(async ([A, L]) => { const x = KIVO.BassamPerm.setDeptLenses(A, L); await KIVO.__BS_SRV.flushAsync(15000); return x; }, [A, L]); assert.equal(r.ok, true); await lab.idle(); };
    const r0 = await p.evaluate(async (A) => {
      const dr = KIVO.Perm44.draft(A), role = { id: 'TEST_ONLY_rk', name: 'TEST_ONLY دور', desc: '', sys: { plan: { lvl: 'view' }, 'lens.gates': { lvl: 'edit' } } };
      const a = KIVO.Perm44.setRoles(dr, A, { v: 1, roles: [role], people: { TEST_ONLY_eA1: { role: role.id, ex: [] } } });
      return a.ok ? await KIVO.Perm44.commit(dr) : a;
    }, A);
    assert.equal(r0.ok, true, JSON.stringify(r0)); await lab.idle();
    const held = async () => { const e = await openAs(b, lab, LAB.empA, LAB.pw); try { const r = await e.api('/api/authz'); return (((r.j.me || {}).depts || {})[A] || {}).p || []; } finally { await e.ctx.close(); } };
    assert.ok((await held()).includes('lens.gates.edit'), 'ON: held');
    await setL(ALL.filter((k) => k !== 'gates'));
    assert.ok(!(await held()).includes('lens.gates.edit'), 'OFF: not held');
    const g0 = readKV(lab, 'bsdept:' + A + ':bassam_grants_v1').emp.TEST_ONLY_eA1;
    /* the manager edits the role in his editor (الإعدادات ← الصلاحيات ← الأدوار): renames it — he does not see the gates row */
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw); m.page.setDefaultTimeout(15000); const q = m.page;
    await open(m, '#/admin/perm/' + A + '/roles', 'main .p44-role');
    assert.equal(await q.locator('main .p44-lrow[data-sys="lens.gates"]').count(), 0, 'the OFF lens row is not shown to him');
    await q.locator('main input[maxlength="60"]').fill('TEST_ONLY دور معدّل'); await q.locator('main input[maxlength="60"]').dispatchEvent('change'); await q.waitForTimeout(300);
    await q.locator('main .p44-bar button', { hasText: 'مراجعة وحفظ' }).click(); await q.locator('[role=dialog].p44-rev').waitFor();
    await q.locator('.p44-rev button', { hasText: 'حفظ' }).click(); await q.waitForTimeout(2000); await lab.idle();
    const R1 = readKV(lab, 'bsdept:' + A + ':bassam_roles_v1').roles[0];
    assert.equal(R1.name, 'TEST_ONLY دور معدّل', 'his edit is saved');
    assert.deepEqual(R1.sys['lens.gates'], { lvl: 'edit' }, 'the hidden lens row is carried exactly as stored');
    const g1 = readKV(lab, 'bsdept:' + A + ':bassam_grants_v1').emp.TEST_ONLY_eA1;
    assert.deepEqual(g1.plus.filter((k) => /^lens\.gates\./.test(k)).sort(), g0.plus.filter((k) => /^lens\.gates\./.test(k)).sort(), 'the out-of-ceiling grant is carried unchanged');
    await setL(ALL);
    assert.ok((await held()).includes('lens.gates.edit'), 'ON again: back unchanged');
    assert.deepEqual(m.errs, [], 'no page errors (manager)'); assert.deepEqual(su.errs, [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});
