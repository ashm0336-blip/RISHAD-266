/* V7 · د1-ج · قرار صاحب المنصة: مدير المنصة (role=super) بلا أي قيد صلاحية — كلُّ عملية في كل نظام وكل إدارة، مهما كان سقفُ الإدارة
   وتفعيلُ الأدوات (الوحدات المطفأة على مستوى المنصة) وأوراقُ الصلاحيات. في الوضعين (القديم · الإنفاذ).
   العالم: عُدّة KIVO_264 (tests/fixtures/gen_fixture.py · TEST_ONLY)، ثم يُفرَّغ سقفُ tst_d1 (caps = []) وتُطفأ كلُّ وحدات المنصة (mods.off).
   المسارات: قراءةُ كل نظام وكتابةٌ في كل نظام بحساب مدير المنصة الأول (admin). الرفضُ «لسبب صلاحية» = 403 · أو مفتاحٌ في denied ·
   أو خطأٌ اسمُه رفض (denied · perm · ceiling · scope · page). أخطاءُ التحقق من البيانات (400 · 409 · 422) ليست رفضاً — فحوصُ السلامة تبقى.
   يطبع قائمةَ كلّ رفضٍ وُجد (t.diagnostic) ثم يشترط أن تكون فارغة. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeLegacyTestEnv as makeEnv, client, applySql, ROOT } from './harness.mjs';
import { installCurrentSchemaFixture } from './current_schema_fx.mjs';

const D = 'tst_d1', dk = (r) => 'bsdept:' + D + ':bassam_' + r;
const OPS = ['employees_v1', 'tasks_v1', 'plan_v1', 'rounds_v1', 'dreport_v1', 'staffing_v3'].map(dk);
const PAGES = ['emps', 'tasks', 'daily', 'dreport', 'plan', 'staff', 'planning', 'irshad', 'seized', 'award', 'dstats', 'kpis', 'links', 'help', 'admin', 'profile'];

function seed() {
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {};
  f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach((p) => { o[p.type] = +p.value; });
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_d1c_'));
  execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', o.year + '-' + o.month + '-' + o.day, '--out', out], { stdio: 'pipe' });
  return { sql: fs.readFileSync(out + '/test_seed.sql', 'utf8'), fx: JSON.parse(fs.readFileSync(out + '/fixture.json', 'utf8')) };
}
function kvSet(env, k, v) {
  const db = env.DB.db; db.prepare('DELETE FROM kv WHERE k=?').run(k); db.prepare('INSERT INTO kv (k, seq, v) VALUES (?, 0, ?)').run(k, JSON.stringify(v));
  db.prepare('INSERT INTO revs (k, rev) VALUES (?, 1) ON CONFLICT(k) DO UPDATE SET rev=rev+1').run(k);
}
function kvGet(env, k) { const r = env.DB.db.prepare('SELECT v FROM kv WHERE k=? ORDER BY seq').all(k); return r.length ? JSON.parse(r.map((x) => x.v).join('')) : null; }

async function build(mode) {
  const env = makeEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce' } : {}); const C = client(env);
  const su = await C.login('admin', 'admin'); assert.ok(su.ok, 'admin');
  const { sql, fx } = seed(); await applySql(env.DB, sql);
  await installCurrentSchemaFixture(env);
  if (mode === 'enforce') env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  /* سقفٌ فارغ لـ tst_d1 · كلُّ وحدات المنصة مطفأة */
  const perms = kvGet(env, 'bassam_perms_v1') || {}; perms.caps = Object.assign({}, perms.caps || {}, { [D]: [] }); kvSet(env, 'bassam_perms_v1', perms);
  const plat = kvGet(env, 'bassam_platform_v1') || {}; plat.mods = Object.assign({}, plat.mods || {}, { off: PAGES.slice() }); kvSet(env, 'bassam_platform_v1', plat);
  const l = await C.login('admin', 'admin');
  return { env, C, fx, ck: l.ck, uid: l.j.uid };
}

/* رفضٌ لسبب صلاحية؟ */
const PERM_ERR = /denied|forbidden|perm|ceiling|scope|page|not-allowed|super/i;
function why(r) {
  if (!r) return 'no-response';
  if (r.status === 403) return '403 ' + JSON.stringify(r.j).slice(0, 160);
  const j = r.j || {};
  if (j.denied && typeof j.denied === 'object' && !Array.isArray(j.denied) && Object.keys(j.denied).length) return 'denied ' + JSON.stringify(j.denied).slice(0, 200);
  if (Array.isArray(j.denied) && j.denied.length) return 'denied ' + JSON.stringify(j.denied).slice(0, 200);
  if (j.ok === 0 && typeof j.err === 'string' && PERM_ERR.test(j.err)) return r.status + ' ' + j.err;
  return '';
}

async function sweep(W) {
  const { C, fx, ck, uid } = W, q = (o) => '?' + new URLSearchParams(Object.assign({ uid, dept: D }, o));
  const get = (u) => C.api(u, { cookie: ck }), post = (u, body) => C.api(u, { method: 'POST', cookie: ck, body });
  const R = []; const rec = async (name, p) => { let r; try { r = await p; } catch (e) { r = { status: 0, j: { err: String(e).slice(0, 120) } }; } R.push({ name, status: r.status, why: why(r) }); return r; };
  let rq = 0; const rid = () => 'TEST_ONLY_d1c_' + (++rq);
  /* ── قراءة ── */
  const allKeys = OPS.concat([dk('irshad_v1'), dk('seized_v1'), dk('custody_v1'), dk('award_v1'), dk('grants_v1'), dk('scope_v1'), 'bassam_perms_v1', 'bassam_auth_users_v1', 'bassam_depts_v1', 'bassam_notif_sys_v1']);
  const g = await rec('read /api/get (dept + global keys)', get('/api/get?keys=' + allKeys.map(encodeURIComponent).join(',')));
  /* القراءةُ ليست «لا رفض» وحده: كلُّ مفتاحٍ مخزَّنٍ في المصدر يعود بقيمته (لا null مُصفّى) */
  const stored = allKeys.filter((k) => W.env.DB.db.prepare('SELECT 1 FROM kv WHERE k=? LIMIT 1').get(k));
  for (const k of stored) { const it = ((g.j && g.j.keys) || {})[k]; if (!it || it.v == null) R.push({ name: 'read /api/get value ' + k, status: g.status, why: 'filtered (v=null)' }); }
  R.push({ name: 'read /api/get stored keys checked: ' + stored.length, status: g.status, why: '' });
  const ops = await rec('read /api/operations/read (employees · tasks · plan · rounds · dreport · staffing)', get('/api/operations/read?keys=' + OPS.map(encodeURIComponent).join(',')));
  const ir = await rec('read /api/irshad (calendar)', get('/api/irshad' + q({})));
  await rec('read /api/irshad (records)', get('/api/irshad' + q({ view: 'records', year: fx.today.y, month: fx.today.m, limit: 200 })));
  const irc = await rec('read /api/irshad (catalogs)', get('/api/irshad' + q({ view: 'catalogs' })));
  await rec('read /api/irshad/export', get('/api/irshad/export' + q({ year: fx.today.y })));
  const sz = await rec('read /api/seized (calendar)', get('/api/seized' + q({})));
  await rec('read /api/seized (records)', get('/api/seized' + q({ view: 'records', year: fx.today.y, month: fx.today.m, limit: 200 })));
  await rec('read /api/seized/export', get('/api/seized/export' + q({ year: fx.today.y })));
  const aw = await rec('read /api/award', get('/api/award' + q({})));
  await rec('read /api/award/export', get('/api/award/export' + q({})));
  const cu = await rec('read /api/custody (month)', get('/api/custody' + q({ view: 'month' })));
  await rec('read /api/custody (catalog)', get('/api/custody' + q({ view: 'catalog' })));
  const ds = await rec('read /api/dstats', get('/api/dstats'));
  await rec('read /api/retro (irshad)', get('/api/retro' + q({ res: 'irshad' })));
  await rec('read /api/retro (seized)', get('/api/retro' + q({ res: 'seized' })));
  await rec('read /api/notifications (dept)', get('/api/notifications' + q({ limit: 50 })));
  await rec('read /api/aud (dept)', get('/api/aud' + q({})));
  await rec('read /api/tasks/linkage', get('/api/tasks/linkage' + q({})));
  await rec('read /api/admin/dept-delete (inventory)', get('/api/admin/dept-delete' + q({})));
  await rec('read /api/imgs', get('/api/imgs'));
  await rec('read /api/changes', get('/api/changes?since=0'));
  /* ── كتابة ── */
  if (ops.j && ops.j.resources) for (const k of OPS) {
    const v = ops.j.resources[k]; if (v === undefined || v === null) { R.push({ name: 'write /api/save ' + k.split(':').pop(), status: 0, why: 'absent-in-read' }); continue; }
    await rec('write /api/save ' + k.split(':').pop(), post('/api/save', { requestId: rid(), epoch: ops.j.epoch, set: { [k]: JSON.stringify(v) }, del: [], base: { [k]: ops.j.base[k] } }));
    const again = await get('/api/operations/read?keys=' + OPS.map(encodeURIComponent).join(',')); if (again.j && again.j.base) ops.j = again.j;
  }
  if (irc.j && irc.j.base) await rec('write /api/irshad/act catalog-replace', post('/api/irshad/act', { uid, dept: D, requestId: rid(), base: irc.j.base, op: 'catalog-replace', kind: 'locations', values: ['TEST_ONLY موقع د1-ج'] }));
  else R.push({ name: 'write /api/irshad/act catalog-replace', status: 0, why: 'no-base ' + JSON.stringify(irc.j).slice(0, 100) });
  if (aw.j && aw.j.base) await rec('write /api/award/act edit', post('/api/award/act', { dept: D, requestId: rid(), base: aw.j.base, op: 'edit', id: 'tstaw2', data: { phone: '0599999277', email: 'tst_aw_2@example.test', comp: '70277' } }));
  else R.push({ name: 'write /api/award/act edit', status: 0, why: 'no-base ' + JSON.stringify(aw.j).slice(0, 100) });
  if (sz.j && sz.j.base) await rec('write /api/seized/act delete', post('/api/seized/act', { dept: D, requestId: rid(), base: sz.j.base, op: 'delete', id: 'tstsz1' }));
  else R.push({ name: 'write /api/seized/act delete', status: 0, why: 'no-base ' + JSON.stringify(sz.j).slice(0, 100) });
  if (cu.j && typeof cu.j.rev === 'number') await rec('write /api/custody/act type-create', post('/api/custody/act', { dept: D, base: cu.j.rev, requestId: rid(), op: 'type-create', item: { name: 'TEST_ONLY صنف د1-ج', qty: 2, prefix: 'QC', color: '#b99751' } }));
  else R.push({ name: 'write /api/custody/act type-create', status: 0, why: 'no-rev ' + JSON.stringify(cu.j).slice(0, 100) });
  if (ds.j && ds.j.ok) await rec('write /api/dstats', post('/api/dstats', { uid, base: ds.j.rev, data: ds.j.data }));
  await rec('write /api/retro open (irshad)', post('/api/retro', { res: 'irshad', dept: D, act: 'open', scope: { y: fx.prevMonth.y, m: fx.prevMonth.m }, reason: 'TEST_ONLY د1-ج' }));
  await rec('write /api/notifications/act emit (dept)', post('/api/notifications/act', { op: 'emit', type: 'task_new', dept: D, own: ['tst_e_emp1'], vars: { 'المهمة': 'TEST_ONLY د1-ج', 'الوقت': 'TEST_ONLY' } }));
  await rec('write /api/notifications/act emit ir_edit (dept)', post('/api/notifications/act', { op: 'emit', type: 'ir_edit', dept: D, vars: { 'الفعل': 'عُدّل', 'الرقم': '—', 'المُعدّل': 'TEST_ONLY' } }));
  return R;
}

for (const mode of ['legacy', 'enforce']) {
  test('V7 · د1-ج · ' + mode + ': مدير المنصة على إدارةٍ سقفُها فارغ ووحداتُها مطفأة — لا رفضَ لسبب صلاحية في أي مسار قراءة أو كتابة', { timeout: 600000 }, async (t) => {
    const W = await build(mode);
    const R = await sweep(W);
    const denied = R.filter((x) => x.why);
    t.diagnostic('المسارات: ' + R.length + ' · الرفض: ' + denied.length);
    for (const x of R) t.diagnostic((x.why ? '✘ ' : '✔ ') + x.name + ' → ' + x.status + (x.why ? ' · ' + x.why : ''));
    assert.ok(R.length >= 30, 'المسارات كلُّها شُغّلت');
    assert.deepEqual(denied.map((x) => x.name + ' · ' + x.why), [], 'مدير المنصة رُفض لسبب صلاحية');
  });
}
