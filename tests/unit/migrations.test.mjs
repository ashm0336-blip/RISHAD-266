/* RM-4 · AUD-022 · ADR-011 — الترحيلاتُ المرقَّمة (migrations/NNNN_<name>.sql → KIVO_MIGRATIONS) بدل DDL على كل بدء:
   قاعدةٌ جديدة تُبنى كاملةً وتُسجَّل · قاعدةٌ قائمة (مخطّطُ 248 بلا d1_migrations) تُستوعَب بلا خطأ وبلا مساس بالبيانات · قاعدةٌ أقدم من الأساس
   (sess/audit بلا dev/city) تُستوعَب بإضافة الأعمدة · مسارُ wrangler (تطبيقُ الملفات مباشرةً) يوافق مسارَ العامل حرفاً · التهيئة مرة واللقطة تتحقق من المخطط لكل طلب
   · فشلُ ترحيلٍ لا يترك أثراً جزئياً (الدفعةُ ذرّيّة) ويُعاد في الطلب التالي · /api/ping يُظهر إصدارَ المخطّط لمدير النظام وحده. */
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeEnv, seedLegacyTestAdmin, client, worker, ROOT, WORKER, srcDir, allowTestSchemaUpgrade } from './harness.mjs';
const MIG_DIR = srcDir('migrations');
const files = fs.readdirSync(MIG_DIR).filter(f => f.endsWith('.sql')).sort();
const tables = (DB) => DB.q("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").map(r => r.name);
const cols = (DB, t) => DB.q('PRAGMA table_info(' + t + ')').map(r => r.name);
const applied = (DB) => DB.q('SELECT name FROM d1_migrations ORDER BY id').map(r => r.name);
/* The Worker flattens statement formatting; quoted defaults/identifiers remain exact. */
const normalizeSql = sql => sql == null ? sql : sql.match(/'(?:''|[^'])*'|"(?:""|[^"])*"|`(?:``|[^`])*`|\[(?:\]\]|[^\]])*\]|[^'"`\[]+/g)
  .map(part => /^['"`\[]/.test(part) ? part : part.replace(/\s+/g, ' ')).join('').trim();
const schemaOf = (DB) => DB.q("SELECT type, name, tbl_name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND name <> 'd1_migrations' ORDER BY type, name")
  .map(row => ({ ...row, sql: normalizeSql(row.sql) }));
/* تطبيقُ الملفات كما يفعل wrangler d1 migrations apply: كلُّ ملفٍ كما هو ثم تسجيلُ اسمه */
function wranglerApply(DB) {
  DB.exec('CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  for (const f of files) { DB.exec(fs.readFileSync(path.join(MIG_DIR, f), 'utf8')); DB.exec("INSERT INTO d1_migrations (name) VALUES ('" + f.slice(0, -4) + "')"); }
}
const EXPECT = ['aud', 'audit', 'authz', 'authz_snap', 'authz_snaps', 'award_answers', 'award_case_texts', 'award_doc_items', 'award_doc_sections', 'award_documents', 'award_records', 'award_request_checks', 'award_requests', 'award_resources', 'award_score_rows', 'award_scores', 'custody_issues', 'custody_items', 'custody_movements', 'custody_request_outputs', 'custody_requests', 'd1_migrations', 'daily_stats_day_locks', 'daily_stats_days', 'daily_stats_month_locks', 'guard', 'imgown', 'imgref', 'imgs', 'irshad_catalog_entries', 'irshad_report_languages', 'irshad_reports', 'irshad_requests', 'irshad_retro_windows', 'kv', 'meta', 'notification_checkpoints', 'notification_dedup', 'notification_messages', 'notification_targets', 'notification_type_overrides', 'notification_user_state', 'ops_day_shifts_values', 'ops_employee_record', 'ops_legacy_day_focus', 'ops_nodes', 'ops_plan', 'ops_plan_live_floors_floor', 'ops_plan_live_floors_floor_gates_element', 'ops_plan_live_floors_floor_gates_element_field_log_entry', 'ops_plan_live_floors_floor_gates_element_fields_1', 'ops_plan_live_floors_floor_marks_element', 'ops_plan_live_floors_floor_marks_element_fields_1', 'ops_plan_live_floors_floor_paths_element', 'ops_plan_live_floors_floor_paths_element_points_point', 'ops_plan_live_floors_floor_sector', 'ops_plan_live_floors_floor_zones_element', 'ops_plan_live_floors_floor_zones_element_fields_1', 'ops_plan_month_record', 'ops_report_day', 'ops_report_day_legacy_definition', 'ops_report_day_legacy_roster_entry', 'ops_report_day_shift', 'ops_report_day_shift_transfer', 'ops_report_groups', 'ops_report_month_record', 'ops_round_day', 'ops_round_day_import_source', 'ops_round_day_move', 'ops_round_day_shift_approval', 'ops_round_month_record', 'ops_rounds', 'ops_staffing_lock_choice_0', 'ops_staffing_lock_open', 'ops_staffing_month_employee', 'ops_staffing_month_employee_leave_range', 'ops_staffing_month_shifts_definition', 'ops_staffing_month_shifts_entry_choice_0', 'ops_task_row', 'ops_task_row_management', 'ops_task_row_management_by', 'ops_task_row_management_cancellation', 'ops_task_row_management_decision', 'ops_task_row_management_eligibility', 'ops_task_row_management_extension', 'ops_task_row_management_policy', 'ops_task_row_management_predecessor', 'ops_task_row_management_reassign_target', 'ops_task_row_management_recurrence', 'ops_task_row_management_relink', 'ops_task_row_management_window', 'ops_task_row_proof', 'ops_task_row_proof_image_metadata_entry', 'ops_task_row_proof_steps_values', 'ops_task_row_proof_submission', 'ops_task_row_self', 'ops_task_row_self_stall', 'ops_zone_options', 'ops_zone_options_category_style', 'ops_zone_options_level_option_record', 'restore_operations', 'restore_preimage', 'restore_snapshot_manifest', 'revs', 'sec', 'seized_actions', 'seized_catalog_items', 'seized_categories', 'seized_item_history', 'seized_item_photos', 'seized_items', 'seized_list_values', 'seized_reports', 'seized_requests', 'seized_resource_state', 'seized_retro_windows', 'sess'];
test('الملفاتُ مرقَّمة متصلة من 0001 · كلُّ ملف يختم meta.schema_version برقمه · المولَّد (KIVO_MIGRATIONS) يطابق الملفات', () => {
  assert.ok(files.length >= 3, files.join());
  files.forEach((f, i) => { assert.match(f, /^\d{4}_[a-z0-9_]+\.sql$/); assert.equal(+f.slice(0, 4), i + 1, 'ترقيمٌ متصل: ' + f); assert.match(fs.readFileSync(path.join(MIG_DIR, f), 'utf8'), new RegExp("'schema_version',\\s*'" + (i + 1) + "'"), f + ' يختم schema_version'); });
  const part = fs.readFileSync(path.join(srcDir('workersParts'), '051a-schema-migrations.js'), 'utf8');
  assert.match(part, new RegExp('var KIVO_SCHEMA_VERSION = ' + files.length + ';'));
  const M = JSON.parse(/var KIVO_MIGRATIONS = (\[[\s\S]*?\n\]);/.exec(part)[1]);
  assert.deepEqual(M.map(m => m.name), files.map(f => f.slice(0, -4)));
  const w = fs.readFileSync(WORKER, 'utf8'); assert.ok(w.includes('var KIVO_MIGRATIONS = '), 'العاملُ المختبَر يحمل الترحيلات');
  assert.ok(!/CREATE TABLE IF NOT EXISTS kv \(/.test(w.replace(/var KIVO_MIGRATIONS = \[[\s\S]*?\n\];/, '')), 'لا DDL لجدول kv خارج الترحيلات المولَّدة');
});
test('قاعدةٌ جديدة: أول طلب يطبّق كلَّ الترحيلات بترتيبها ويسجّلها · الجداولُ كاملة · meta.schema_version = العدد · المنصةُ تعمل (إعدادٌ أول + دخول)', async () => {
  const env = makeEnv(); const C = client(env);
  const p0 = (await C.api('/api/ping')).j; assert.equal(p0.ok, 1); assert.equal(p0.fresh, 1);
  assert.deepEqual(tables(env.DB), EXPECT);
  assert.deepEqual(applied(env.DB), files.map(f => f.slice(0, -4)));
  assert.equal(env.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, String(files.length));
  assert.ok(cols(env.DB, 'sess').includes('dev') && cols(env.DB, 'sess').includes('city') && cols(env.DB, 'audit').includes('city'), 'الأساسُ يحمل dev/city من البداية');
  seedLegacyTestAdmin(env);
  const su = await C.login('admin', 'admin'); assert.ok(su.ok, 'الإعدادُ الأول يعمل على المخطّط المرحَّل');
  const p1 = (await C.api('/api/ping', { cookie: su.ck })).j;
  assert.equal(p1.schema, files.length, 'ping لمدير النظام: إصدارُ المخطّط المعروف'); assert.equal(p1.schemaDb, String(files.length), 'والمختومُ في القاعدة');
  const anon = (await C.api('/api/ping')).j; assert.equal(anon.schema, undefined, 'الزائرُ لا يرى إصدار المخطّط');
});
test('الحالة المستقرة: isolate جديد يتحقق عند التهيئة وفي لقطة الطلب، دون DDL أو إعادة تسجيل', async () => {
  const env = makeEnv(); const C = client(env); await C.api('/api/ping');
  const env2 = Object.assign({}, env); delete env2.__worker;   /* وحدةٌ جديدة = isolate جديد بذاكرة _init فارغة، القاعدةُ نفسُها */
  env.DB.log.length = 0; await (await worker(env2)).fetch(new Request('http://x/api/brand'), env2);
  const ddl = env.DB.log.filter(s => /^(CREATE|ALTER|INSERT OR IGNORE INTO d1_migrations)/i.test(s));
  assert.deepEqual(ddl, [], 'لا DDL: ' + JSON.stringify(ddl));
  assert.deepEqual(env.DB.log.filter(s => /d1_migrations/.test(s)), Array(2).fill('SELECT name FROM d1_migrations'), 'قراءة السجل عند التهيئة وفي لقطة الطلب نفسها');
  assert.deepEqual(applied(env.DB), files.map(f => f.slice(0, -4)), 'لا تسجيلَ مكرّر');
});
test('قاعدةٌ قائمة بمخطّط KIVO_248 (بلا d1_migrations) وفيها بيانات: تُستوعَب بلا خطأ · البياناتُ والجلساتُ كما هي · تُسجَّل الترحيلات · الحسابُ يدخل', async () => {
  const W = process.env.KIVO_WORKER_PREV || path.join(ROOT, 'tests', 'fixtures', 'worker-248.js');   /* KIVO_259 · AUD-029: عاملُ 248 (= k248/src/root/_worker.js بايتاً) عُدّةً في المستودع الرسمي */
  const env = makeEnv(); const prev = (await import(pathToFileURL(W).href + '?prev=1')).default;
  const C0 = { api: (p, o = {}) => prev.fetch(new Request('http://x' + p, { method: o.method || 'GET', headers: Object.assign({}, o.cookie ? { cookie: o.cookie } : {}, o.method ? { origin: 'http://x', 'Content-Type': 'application/json' } : {}), body: o.body ? JSON.stringify(o.body) : undefined }), env) };
  const r = await C0.api('/api/login', { method: 'POST', body: { u: 'admin', p: 'admin' } }); const ck = (r.headers.get('set-cookie') || '').split(';')[0]; assert.equal((await r.json()).ok, 1, 'دخولٌ على عامل 248');
  await C0.api('/api/save', { method: 'POST', cookie: ck, body: { set: { bassam_depts_v1: JSON.stringify([{ id: 'dQ', name: 'قديمة', gid: '' }]) }, del: [], base: { bassam_depts_v1: 0 } } });
  assert.ok(!tables(env.DB).includes('d1_migrations'), 'المخطّطُ القديم بلا سجل ترحيلات');
  /* جداولُ الإنفاذ كما كان ينشئها enfInitDb في 248 (بيئةُ إنفاذ): الترحيلُ 0002 عليها لا يمسّ شيئاً */
  env.DB.exec('CREATE TABLE IF NOT EXISTS authz (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, uid TEXT, role TEXT, dept TEXT, k TEXT, res TEXT, keys TEXT, scope TEXT, decision TEXT NOT NULL, why TEXT, reason TEXT, path TEXT, mode TEXT, cid TEXT); CREATE INDEX IF NOT EXISTS authz_ts ON authz (ts); CREATE INDEX IF NOT EXISTS authz_uid ON authz (uid, ts); CREATE INDEX IF NOT EXISTS authz_dec ON authz (decision, ts); CREATE TABLE IF NOT EXISTS authz_snap (snap TEXT NOT NULL, k TEXT NOT NULL, seq INTEGER NOT NULL, existed INTEGER NOT NULL, rev INTEGER, v TEXT, PRIMARY KEY (snap, k, seq)); CREATE TABLE IF NOT EXISTS authz_snaps (snap TEXT PRIMARY KEY, ts INTEGER NOT NULL, uid TEXT, un TEXT, kind TEXT NOT NULL, n INTEGER NOT NULL, meta TEXT, restored INTEGER NOT NULL DEFAULT 0, rts INTEGER, ruid TEXT)');
  env.DB.exec("INSERT INTO authz (ts, decision) VALUES (1, 'deny')");
  const before = { kv: env.DB.q('SELECT k, seq, v FROM kv ORDER BY k, seq'), sess: env.DB.q('SELECT tok, uid FROM sess'), meta: env.DB.q("SELECT k, v FROM meta WHERE k NOT IN ('schema_version') ORDER BY k") };
  allowTestSchemaUpgrade(env.DB);
  const C = client(env);   /* العاملُ المختبَر (249) على القاعدة نفسِها */
  const p = (await C.api('/api/ping', { cookie: ck })).j; assert.equal(p.ok, 1); assert.equal(p.schema, files.length);
  assert.deepEqual(applied(env.DB), files.map(f => f.slice(0, -4)));
  assert.deepEqual(env.DB.q('SELECT k, seq, v FROM kv ORDER BY k, seq'), before.kv, 'kv كما هو'); assert.deepEqual(env.DB.q('SELECT tok, uid FROM sess'), before.sess, 'الجلساتُ كما هي');
  assert.deepEqual(env.DB.q("SELECT k, v FROM meta WHERE k NOT IN ('schema_version', 'restore_epoch') ORDER BY k"), before.meta, 'قيم meta القائمة كما كانت؛ حقبة الاستعادة إضافة مستقلة');
  assert.deepEqual(env.DB.q("SELECT v FROM meta WHERE k='restore_epoch'").map(r => r.v), ['0'], 'تبدأ حقبة الاستعادة الجديدة من الصفر دون تغيير القيم القائمة');
  assert.equal(env.DB.q('SELECT COUNT(*) AS n FROM authz')[0].n, 1, 'جدولُ authz القائم لم يُمسّ'); assert.deepEqual(tables(env.DB), EXPECT);
  assert.equal(env.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, String(files.length));
  const g = (await C.api('/api/get?keys=bassam_depts_v1', { cookie: ck })).j; assert.ok(g.keys && g.keys.bassam_depts_v1 && /قديمة/.test(g.keys.bassam_depts_v1.v), 'البياناتُ تُقرأ بالجلسة نفسِها');
});
test('قاعدةٌ أقدم من الأساس (sess/audit بلا dev/city): تُستوعَب بإضافة الأعمدة الناقصة وحدها ثم تُسجَّل الترحيلات · صفوفُ audit القديمة تُنقل إلى aud مرةً', async () => {
  const env = makeEnv();
  env.DB.exec("CREATE TABLE kv (k TEXT NOT NULL, seq INTEGER NOT NULL, v TEXT NOT NULL, PRIMARY KEY (k, seq)); CREATE TABLE revs (k TEXT PRIMARY KEY, rev INTEGER NOT NULL); CREATE TABLE meta (k TEXT PRIMARY KEY, v TEXT NOT NULL);" +
    'CREATE TABLE sess (tok TEXT PRIMARY KEY, uid TEXT NOT NULL, ts INTEGER NOT NULL, la INTEGER NOT NULL); CREATE TABLE audit (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, uid TEXT NOT NULL, un TEXT, k TEXT NOT NULL, act TEXT NOT NULL, rev INTEGER NOT NULL, diff TEXT, ip TEXT);' +
    "INSERT INTO audit (ts, uid, un, k, act, rev, diff, ip) VALUES (1700000000000, 'u1', 'admin', 'bsdept:dX:bassam_options_v1', 'set', 3, '{\"a\":1}', '1.1.1.1'); INSERT INTO meta (k, v) VALUES ('rev', '7');");
  allowTestSchemaUpgrade(env.DB);
  const C = client(env); const p = (await C.api('/api/ping')).j; assert.equal(p.ok, 1);
  assert.ok(cols(env.DB, 'sess').includes('dev') && cols(env.DB, 'sess').includes('city') && cols(env.DB, 'audit').includes('dev') && cols(env.DB, 'audit').includes('city'), 'الأعمدةُ أُضيفت');
  assert.deepEqual(tables(env.DB), EXPECT); assert.deepEqual(applied(env.DB), files.map(f => f.slice(0, -4)));
  const aud = env.DB.q("SELECT cid, dept, eid, etype, act, aft FROM aud"); assert.equal(aud.length, 1); assert.equal(JSON.stringify(aud[0]), JSON.stringify({ cid: 'legacy_1', dept: 'dX', eid: 'bassam_options_v1', etype: 'legacy', act: 'changed', aft: '{"a":1}' }));
  assert.equal(env.DB.q("SELECT v FROM meta WHERE k='aud_mig'")[0].v, '1'); assert.equal(env.DB.q("SELECT v FROM meta WHERE k='rev'")[0].v, '7', 'meta القديم محفوظ');
  const env2 = Object.assign({}, env); delete env2.__worker; await (await worker(env2)).fetch(new Request('http://x/api/brand'), env2);
  assert.equal(env.DB.q('SELECT COUNT(*) AS n FROM aud')[0].n, 1, 'لا نقلَ مكرّر في isolate لاحق');
});
test('مسارُ wrangler: تطبيقُ الملفات مباشرةً على قاعدةٍ فارغة = مخطّطُ مسار العامل حرفاً · والعاملُ بعده لا يطبّق شيئاً', async () => {
  assert.equal(normalizeSql("CREATE TABLE t (\n  v TEXT DEFAULT 'a  b'\n)"), normalizeSql("CREATE TABLE t ( v TEXT DEFAULT 'a  b' )"), 'التنسيق خارج النص فقط لا يغيّر تعريف SQL');
  assert.notEqual(normalizeSql("CREATE TABLE t (v TEXT DEFAULT 'a  b')"), normalizeSql("CREATE TABLE t (v TEXT DEFAULT 'a b')"), 'المسافة داخل DEFAULT جزء من القيمة ولا تُطمس');
  const a = makeEnv(); const C = client(a); await C.api('/api/ping');
  const b = makeEnv(); wranglerApply(b.DB);
  assert.deepEqual(schemaOf(b.DB), schemaOf(a.DB), 'sqlite_master متطابق (الجداول والفهارس وتعريفاتها)');
  assert.deepEqual(applied(b.DB), applied(a.DB)); assert.equal(b.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, String(files.length));
  b.DB.log.length = 0; const Cb = client(b); const p = (await Cb.api('/api/ping')).j; assert.equal(p.ok, 1);
  assert.deepEqual(b.DB.log.filter(s => /^(CREATE|ALTER|INSERT OR IGNORE INTO d1_migrations)/i.test(s)), [], 'لا DDL بعد wrangler');
});
test('فشلُ ترحيل: الدفعةُ ذرّيّة — لا جدولَ ولا تسجيلَ جزئياً · الطلبُ يفشل بوضوح (500) · الطلبُ التالي يكمل بنجاح', async () => {
  const env = makeEnv(); let n = 0; env.DB.failIf = (sql) => /CREATE INDEX IF NOT EXISTS aud_ts/.test(sql) && ++n === 1;   /* آخرُ عبارةٍ في الأساس تفشل مرةً */
  const C = client(env); const r = await C.api('/api/ping'); assert.equal(r.status, 500, 'فشلٌ صريح لا صامت');
  assert.ok(!tables(env.DB).includes('kv') && !tables(env.DB).includes('aud'), 'لا أثرَ جزئياً للأساس: ' + tables(env.DB).join());
  assert.deepEqual(env.DB.q("SELECT name FROM d1_migrations"), [], 'لم يُسجَّل شيء');
  const r2 = await C.api('/api/ping'); assert.equal(r2.status, 200); assert.deepEqual(tables(env.DB), EXPECT); assert.deepEqual(applied(env.DB), files.map(f => f.slice(0, -4)));
});
