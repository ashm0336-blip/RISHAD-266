/* V7 · د6 (walkfix2 · قرار المالك) — قاعدةٌ واحدة لكل من في الوحدة عدا مدير المنصة: النظامُ المطفأ لوحدته (بالوراثة) أو على المنصة لا يُخدم ولا يُكتب.
   موضعُها الواحد في الخادم: 050 sysOffAt · sysServed · resLeafOffAt (والمحرّكُ العام بـcapOnDept). العاملُ الحقيقي · TEST_ONLY · بلا شبكة:
   ① «مهامي»: الموظفُ ومديرُ الإدارة ومديرُ القسم وحسابُ الإدارة ومديرُ العقدة معاً — قراءةً وكتابةً، ومنها طلباتٌ مزوّرة (الفعلُ · السجلّ · الصورة ·
      الإدارةُ /api/tasks/* · الحفظُ العام /api/save) — مرفوضةٌ والمهامُ مطفأةٌ لوحدتهم أو على المنصة؛ ومديرُ المنصة كما كان.
   ② «ملفي» (/api/me/today · /api/me/history): لا يحمل من موارد نظامٍ مطفأ شيئاً (الجدول الشهري · التقرير اليومي · الخطة · الجولات)، ويعود بعودته. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { holdersWorld, clientOf, applyState, seedRoles, A, B, S, ACC } from './v7_d6_holders_fx.mjs';
import { PYTHON, makeTestEnv, client, applySql, ROOT, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
import { installCurrentSchemaFixture } from './current_schema_fx.mjs';
import { isOperationalFixtureKey, inspectOperationalFixture, replaceOperationalFixture } from './operational_legacy_seed_fx.mjs';

async function asSuper(W, did, fn) { const c = await clientOf(W, 'su', did); try { const r = fn(c); await c.settle(); assert.equal(c.denied(), 0, 'saved by the worker'); return r; } finally { c.dispose(); } }
async function platOff(W, off) { const c = await clientOf(W, 'su', B); try { const pl = c.K.BassamPlat.get(); c.K.BassamPlat.set(Object.assign({}, pl, { mods: Object.assign({}, pl.mods, { off }) })); await c.settle(); assert.equal(c.denied(), 0); } finally { c.dispose(); } }

test('V7 · د6 (walkfix2 ①) · one rule for «مهامي» and the tasks system: employee, unit managers and the node manager are all refused — read and write, forged requests included — while tasks is OFF for their unit or the platform; the platform admin unchanged', { timeout: 600000 }, async () => {
  const W = await holdersWorld();
  await applyState(W, 'allOn');
  await seedRoles(W, { live: 'task.view', gone: 'staff.view' });
  const uid = (who) => (who === 'su' ? '' : ACC[who].uid);
  const me = (who) => W.C.api('/api/me/tasks?uid=' + uid(who), { cookie: W.ck[who] });
  const post = (who, p, body) => W.C.api(p + '?uid=' + uid(who), { method: 'POST', cookie: W.ck[who], body: Object.assign({ uid: uid(who) }, body) });
  const forged = async (who) => ({
    act: (await post(who, '/api/me/tasks/act', { act: 'start', k: '1447-1-1', id: 'TEST_ONLY_t1' })).status,
    log: (await W.C.api('/api/me/tasks/log?uid=' + uid(who), { cookie: W.ck[who] })).status,
    img: (await W.C.api('/api/me/tasks/img?uid=' + uid(who) + '&id=TEST_ONLY_img', { cookie: W.ck[who] })).status,
    linkage: (await W.C.api('/api/tasks/linkage?uid=' + uid(who) + '&dept=' + A, { cookie: W.ck[who] })).status,
    create: (await post(who, '/api/tasks/create', { dept: A, k: '1447-1-1', t: 'TEST_ONLY', ekeys: [] })).status,
    save: (await W.C.save(W.ck[who], { ['bsdept:' + A + ':bassam_tasks_v1']: JSON.stringify({ '1447-1-1': [['TEST_ONLY forged']] }) })).j,
  });
  const PEOPLE = ['role', 'none', 'mgr', 'dept', 'sec', 'gm'];
  /* ON: every one is answered (the control) — the node manager is «not linked», no «off» flag */
  for (const who of PEOPLE) { const r = await me(who); assert.equal(r.status, 200, 'ON: ' + who + ' ' + JSON.stringify(r.j)); assert.ok(!(r.j.me && r.j.me.off), 'ON: no «off» for ' + who); }
  assert.equal((await me('gm')).j.me.linked, false, 'the node manager has no «مهامي» of his own');
  assert.equal((await W.C.api('/api/tasks/linkage?uid=' + uid('mgr') + '&dept=' + A, { cookie: W.ck.mgr })).status, 200, 'ON: the manager reads the task linkage');

  /* OFF for the department A (and so for its section): employee and managers alike */
  await asSuper(W, B, (c) => c.I.setDeptCap(A, c.ev('KIVO.BassamPerm.PAGE_KEYS').filter((k) => k !== 'tasks')));
  const stored0 = W.env.DB.q("SELECT COUNT(*) AS n FROM kv WHERE k = 'bsdept:" + A + ":bassam_tasks_v1'")[0].n;
  for (const who of ['role', 'none', 'mgr', 'dept', 'sec']) {
    const r = await me(who);
    assert.deepEqual([r.status, r.j.err, !!r.j.rows], [403, 'off', false], 'OFF for the unit: read refused for ' + who + ': ' + JSON.stringify(r.j));
    const f = await forged(who);
    assert.equal(f.act, 403, who + ': forged «مهامي» action refused'); assert.equal(f.log, 403, who + ': log refused'); assert.equal(f.img, 403, who + ': image refused');
    assert.ok(f.linkage >= 400, who + ': management read refused (' + f.linkage + ')'); assert.ok(f.create >= 400, who + ': management write refused (' + f.create + ')');
    assert.notEqual(f.save && f.save.ok, 1, who + ': a forged save of the tasks store is refused: ' + JSON.stringify(f.save).slice(0, 160));
  }
  assert.equal(W.env.DB.q("SELECT COUNT(*) AS n FROM kv WHERE k = 'bsdept:" + A + ":bassam_tasks_v1'")[0].n, stored0, 'nothing was written');
  assert.equal((await me('gm')).status, 200, 'the node manager\'s own unit (the sector) keeps tasks ON: not refused (he has no «مهامي»)');
  let su = await W.C.api('/api/me/tasks', { cookie: W.ck.su });
  assert.deepEqual([su.status, su.j.me && su.j.me.off], [200, 1], 'the platform admin\'s answer is unchanged');

  /* OFF for the node manager's own unit (the sector S) */
  await asSuper(W, B, (c) => c.I.setDeptCap(A, c.ev('KIVO.BassamPerm.PAGE_KEYS')));
  await asSuper(W, B, (c) => c.I.setDeptCap(S, c.ev('KIVO.BassamPerm.PAGE_KEYS').filter((k) => k !== 'tasks')));
  let g = await me('gm'); assert.deepEqual([g.status, g.j.err], [403, 'off'], 'OFF for his sector: the node manager is refused like the others (was 200 me.off): ' + JSON.stringify(g.j));
  for (const who of ['role', 'mgr']) assert.equal((await me(who)).status, 403, 'and the units under it: ' + who);
  await asSuper(W, B, (c) => c.I.setDeptCap(S, c.ev('KIVO.BassamPerm.PAGE_KEYS')));

  /* OFF on the platform: everyone in a unit, the node manager included */
  await platOff(W, ['tasks']);
  for (const who of PEOPLE) { const r = await me(who); assert.deepEqual([r.status, r.j.err], [403, 'off'], 'OFF on the platform: ' + who + ' ' + JSON.stringify(r.j)); }
  const fm = await forged('mgr'); assert.equal(fm.act, 403); assert.ok(fm.create >= 400 && fm.linkage >= 400);
  su = await W.C.api('/api/me/tasks', { cookie: W.ck.su });
  assert.deepEqual([su.status, su.j.me && su.j.me.off], [200, 1], 'the platform admin unchanged');
  /* back ON */
  await platOff(W, []);
  for (const who of PEOPLE) assert.equal((await me(who)).status, 200, 'ON again: ' + who);
});

/* ── «ملفي» على المُثبِّت (tests/fixtures/gen_fixture.py) كما في me_history.test.mjs ── */
/* يومُ الرياض التقويميّ — V7 · 53 تقويم: ميلاديٌّ بمفاتيح ISO (YYYY-MM · YYYY-MM-DD) كما يكتبها المُثبِّت وتقرؤها الصفحة */
const hij = (ts) => { const o = {}; new Intl.DateTimeFormat('en-u-ca-gregory-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' }).formatToParts(new Date(ts)).forEach((p) => { o[p.type] = p.type === 'weekday' ? p.value : +p.value; }); return o; };
const P2 = (n) => String(n).padStart(2, '0');
const T = hij(Date.now()), MK = T.year + '-' + P2(T.month), DAY = MK + '-' + P2(T.day);
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const stored = (env, k) => { if (isOperationalFixtureKey(env, k)) return inspectOperationalFixture(env, k); const r = env.DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', k); return r.length ? JSON.parse(r.map((x) => x.v).join('')) : null; };
async function putKey(env, k, v) {
  if (isOperationalFixtureKey(env, k)) { await replaceOperationalFixture(env, k, v); return; }
  await applySql(env.DB, ['DELETE FROM kv WHERE k = ' + q(k) + ';', 'INSERT INTO kv (k, seq, v) VALUES (' + q(k) + ', 0, ' + q(JSON.stringify(v)) + ');',
    "INSERT INTO meta (k, v) VALUES ('rev', '1') ON CONFLICT(k) DO UPDATE SET v = CAST(CAST(meta.v AS INTEGER) + 1 AS TEXT);",
    'INSERT INTO revs (k, rev) VALUES (' + q(k) + ", (SELECT CAST(v AS INTEGER) FROM meta WHERE k = 'rev')) ON CONFLICT(k) DO UPDATE SET rev = excluded.rev;"].join('\n'));
}
async function fxWorld() {
  const env = makeTestEnv({ KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow' }), C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dR', name: 'إدارة', gid: '' }]) });
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_wf2_')); execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', DAY, '--out', out], { stdio: 'pipe' });
  await applySql(env.DB, fs.readFileSync(out + '/test_seed.sql', 'utf8'));
  await installCurrentSchemaFixture(env);
  env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const login = async (u, p) => { const r = await C.login(u, p); assert.ok(r.ok, u); return r.ck; };
  return { env, C, su, login, get: (p, ck) => C.api(p, { cookie: ck }) };
}
const PAGES = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/manifests/pages.json'), 'utf8')).pages.map((p) => p.key);

test('V7 · د6 (walkfix2 ②) · «ملفي» serves nothing from an OFF system\'s resources (monthly schedule · daily report · plan · rounds) — for the unit or the platform — and everything returns when ON', { timeout: 600000 }, async () => {
  const W = await fxWorld();
  const K = (r) => 'bsdept:tst_d1:' + r;
  /* راصدُ الميدان: بابُ الجولة الأول له — فيعرض موقعَه من الخطة والجولة */
  const rd = stored(W.env, K('bassam_rounds_v1')); rd[DAY].d[0].gates[0].emp = ['tst_e_field']; await putKey(W.env, K('bassam_rounds_v1'), rd);
  const emp = await W.login('0000000113', '70113'), field = await W.login('0000000118', '70118');
  const read = async () => ({ e: (await W.get('/api/me/today', emp)).j, f: (await W.get('/api/me/today', field)).j, h: (await W.get('/api/me/history', emp)).j });
  const facts = (x) => ({ staff: x.e.facts.month.has, report: x.e.facts.report.mine, monPr: x.e.mon.pr, plan: x.f.site.plan, round: x.f.site.round, histReports: x.h.evidence.reports });
  const ON = facts(await read());
  assert.deepEqual(ON, { staff: true, report: true, monPr: 1, plan: true, round: true, histReports: ON.histReports }, 'ON: the profile shows each system\'s part');
  assert.ok(ON.histReports > 0, 'ON: the history counts the reports');
  const perms = stored(W.env, 'bassam_perms_v1');
  const setCap = async (keys) => { const p = JSON.parse(JSON.stringify(perms)); p.caps = Object.assign({}, p.caps, { tst_d1: keys }); await putKey(W.env, 'bassam_perms_v1', p); };
  /* OFF for the unit: the monthly schedule and the daily report */
  await setCap(PAGES.filter((k) => k !== 'staff' && k !== 'dreport'));
  let x = await read();
  assert.equal(x.e.ok, 1, 'the profile still opens'); assert.equal(x.e.identity.linked, true, 'his identity stays (not a system)');
  assert.deepEqual([facts(x).staff, facts(x).report, facts(x).monPr, facts(x).histReports], [false, false, 0, 0], 'OFF: nothing from the schedule or the report: ' + JSON.stringify(x.e.facts).slice(0, 300));
  assert.equal(facts(x).plan, true, 'a system that is ON keeps its part (the plan)');
  assert.deepEqual(x.h.changes, [], 'no schedule changes from the log while the schedule is OFF');
  /* OFF: the plan and the rounds tab */
  await setCap(PAGES.filter((k) => k !== 'plan'));
  const pr = stored(W.env, 'bassam_perms_v1'); pr.subs = Object.assign({}, pr.subs, { tst_d1: Object.assign({}, (pr.subs || {}).tst_d1, { 'daily:tabs': ['kpiDaily', 'kpiOcc', 'kpiZones', 'field'] }) }); await putKey(W.env, 'bassam_perms_v1', pr);
  x = await read();
  assert.deepEqual([facts(x).plan, facts(x).round, x.f.site.today, x.f.site.draft], [false, false, null, null], 'OFF: no site from the plan or from the rounds: ' + JSON.stringify(x.f.site));
  assert.equal(facts(x).staff, true, 'the schedule is ON again here');
  /* OFF on the platform: a container takes what lives in it («الخطة التشغيلية» ⇒ الجدول الشهري · الخطة) */
  await putKey(W.env, 'bassam_perms_v1', perms);
  const pl = stored(W.env, 'bassam_platform_v1') || {}; await putKey(W.env, 'bassam_platform_v1', Object.assign({}, pl, { mods: Object.assign({}, pl.mods, { off: ['planning'] }) }));
  x = await read();
  assert.deepEqual([facts(x).staff, facts(x).plan], [false, false], 'OFF on the platform: the schedule and the plan inside the container');
  assert.equal(facts(x).report, true, 'the daily report is ON');
  /* back ON */
  await putKey(W.env, 'bassam_platform_v1', pl);
  assert.deepEqual(facts(await read()), ON, 'ON again: everything returns');
});
