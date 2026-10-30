/* RM-4 · SOT-126 — أدواتُ النسخ والاستعادة لقاعدة D1 مثبتةٌ محلياً (بلا شبكة): قاعدةٌ مأهولة (إعدادٌ أول + حفظٌ + بذرة TEST_ONLY) →
   تُكتب إلى ملف SQLite → snapshot_local.py يصدّرها SQL بصيغة wrangler → verify.py يقرأها ويكتب manifest → تُستعاد في قاعدةٍ جديدة
   → العاملُ الحقيقي يعمل عليها: الدخولُ بالحسابات نفسِها · البياناتُ والنسخُ (rev) كما هي · الأعدادُ في /api/ping متطابقة · meta كما هي
   · --diff بين نسختين يكشف التغيير بعد حفظٍ لاحق. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { BASH, PYTHON, makeEnv, makeTestEnv, client, applySql, ROOT, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
const T = path.join(ROOT, 'tools', 'd1');
function seedSql() {
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach(p => { o[p.type] = +p.value; });
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_d1_')); execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', o.year + '-' + o.month + '-' + o.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
function toFile(shim, file) {
  // Persist the real SQLite database without a second hand-written dump loader
  // whose table order could fail before snapshot_local.py itself is exercised.
  assert.equal(fs.existsSync(file), false);
  shim.db.exec("VACUUM INTO '" + file.replace(/'/g, "''") + "'");
}
test('نسخةٌ احتياطية → تحقّق → استعادة → العاملُ يعمل على المستعاد بالبيانات نفسِها', async () => {
  const env = makeTestEnv(); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dR', name: 'إدارة', gid: '' }]) });
  const rk = await C.api('/api/recovery/new', { method: 'POST', cookie: su.ck, body: { pw: TEST_SUPER_PIN } }); assert.equal(rk.j.ok, 1, 'مفتاحُ استعادة جديد (ليُختبر حجبُه في manifest)');
  await applySql(env.DB, seedSql());
  const emp = await C.login('0000000113', '70113'); assert.ok(emp.ok);
  env.DB.exec("INSERT INTO daily_stats_days(site,hijri_date,field_mask,worshippers,umrah) VALUES('haram','1499-01-01',3,0,NULL); INSERT INTO daily_stats_month_locks(site,hijri_year,hijri_month,approved,reopened,legacy_boolean) VALUES('haram',1499,1,1,0,0); INSERT INTO daily_stats_day_locks(site,hijri_year,hijri_month,hijri_day,is_open,is_shut) VALUES('haram',1499,1,1,0,1)");
  const notice = await C.api('/api/notifications/act', { method: 'POST', cookie: su.ck, body: { op: 'emit', type: 'task_new', dept: 'tst_d1', own: ['tst_e_emp1'], vars: { 'المهمة': 'TEST_ONLY backup relationships', 'الوقت': 'TEST_ONLY' } } });
  assert.equal(notice.status, 200); assert.equal(notice.j.ok, 1); assert.ok(notice.j.id);
  const acknowledged = await C.api('/api/notifications/act', { method: 'POST', cookie: emp.ck, body: { op: 'state', action: 'ack', id: notice.j.id } }); assert.equal(acknowledged.status, 200); assert.equal(acknowledged.j.ok, 1);
  const sv0 = await C.save(su.ck, { 'bsdept:dR:bassam_options_v1': JSON.stringify({ probe: 'نسخة' }) }); assert.ok(sv0.j.ok === 1 && !Object.keys(sv0.j.denied || {}).length, 'حفظُ مفتاح إدارة قبل النسخ');
  const ping0 = (await C.api('/api/ping', { cookie: su.ck })).j; const get0 = (await C.api('/api/get?keys=bassam_depts_v1,bsdept:dR:bassam_options_v1', { cookie: su.ck })).j;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_d1_')); const sqlite = path.join(dir, 'preview.sqlite'), dump = path.join(dir, 'bassam-db-preview_T0.sql'), man = path.join(dir, 'T0.json');
  toFile(env.DB, sqlite);
  execFileSync(PYTHON, [T + '/snapshot_local.py', sqlite, dump], { stdio: 'pipe' });
  const v = execFileSync(PYTHON, [T + '/verify.py', dump, '--manifest', man], { encoding: 'utf8' });
  assert.match(v, /✔ /); assert.doesNotMatch(v, /✘/);
  const M = JSON.parse(fs.readFileSync(man, 'utf8'));
  assert.ok(M.tables.kv > 0 && M.tables.sess >= 2 && M.tables.meta >= 1 && M.kvKeys >= 2, JSON.stringify(M.tables));
  assert.ok(M.kv['bassam_depts_v1'] && M.revs['bassam_depts_v1'] >= 1, 'manifest يذكر المفاتيح والنسخ');
  assert.equal(M.meta.rk, '«محجوب»', 'مفتاحُ الاستعادة لا يُطبع في manifest');
  /* الاستعادةُ في قاعدةٍ جديدة فارغة ثم تشغيلُ العامل عليها (بلا initDb مسبق: كما wrangler d1 execute --file) */
  const env2 = makeEnv(); env2.DB.db.exec('PRAGMA foreign_keys=ON'); env2.DB.db.exec(fs.readFileSync(dump, 'utf8'));
  assert.deepEqual(env2.DB.db.prepare('PRAGMA foreign_key_check').all(), []);
  for (const table of ['daily_stats_days', 'daily_stats_month_locks', 'daily_stats_day_locks', 'notification_messages', 'notification_targets', 'notification_user_state']) {
    const normalize = db => JSON.parse(JSON.stringify(db.prepare('SELECT * FROM ' + table).all()));
    assert.deepEqual(normalize(env2.DB.db), normalize(env.DB.db), table + ': typed records and foreign-key relationships are restored exactly');
  }
  const C2 = client(env2);
  const su3 = await C2.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su3.ok, 'حسابُ مدير النظام يدخل على المستعاد بكلمة المرور نفسِها');
  assert.equal((await C2.login(TEST_SUPER_USERNAME, 'wrong')).ok, false, 'وكلمةٌ خاطئة تُرفض (التجزئة مستعادة لا مُعاد ضبطها)');
  const emp2 = await C2.login('0000000113', '70113'); assert.ok(emp2.ok, 'حسابُ الاختبار يدخل');
  const get1 = (await C2.api('/api/get?keys=bassam_depts_v1,bsdept:dR:bassam_options_v1', { cookie: su3.ck })).j;
  assert.deepEqual(get1.keys, get0.keys, 'القيمُ والنسخ (rev) كما كانت'); assert.ok(get0.keys['bsdept:dR:bassam_options_v1'] && get0.keys['bsdept:dR:bassam_options_v1'].rev >= 1, 'مفتاحُ الإدارة موجودٌ قبل النسخ');
  const ping1 = (await C2.api('/api/ping', { cookie: su3.ck })).j;
  assert.equal(ping1.users, ping0.users, 'عددُ المستخدمين كما كان'); assert.equal(ping1.rev, ping0.rev, 'النسخةُ العامة كما كانت');
  assert.equal(env2.DB.db.prepare("SELECT v FROM meta WHERE k='authz_mode'").get()?.v, env.DB.db.prepare("SELECT v FROM meta WHERE k='authz_mode'").get()?.v, 'meta.authz_mode كما كان');
  /* --diff: حفظٌ لاحق يظهر مفتاحاً واحداً متغيّراً */
  const sv = await C2.save(su3.ck, { 'bsdept:dR:bassam_options_v1': JSON.stringify({ probe: 'بعد' }) }); assert.ok(sv.j.ok === 1 && !(sv.j.denied || {})['bsdept:dR:bassam_options_v1'], 'حفظٌ على المستعاد يمرّ: ' + JSON.stringify(sv.j).slice(0, 120));
  const sqlite2 = path.join(dir, 'after.sqlite'), dump2 = path.join(dir, 'T1.sql'); toFile(env2.DB, sqlite2); execFileSync(PYTHON, [T + '/snapshot_local.py', sqlite2, dump2], { stdio: 'pipe' });
  const D = JSON.parse(execFileSync(PYTHON, [T + '/verify.py', '--diff', dump, dump2], { encoding: 'utf8' }));
  assert.ok(D.kvChanged.includes('bsdept:dR:bassam_options_v1') && !D.kvChanged.includes('bassam_depts_v1'), JSON.stringify(D.kvChanged));
  assert.deepEqual(D.tablesOnlyA, []); assert.ok(D.metaChanged.includes('rev'), 'meta.rev تقدّمت بعد الحفظ: ' + JSON.stringify(D.metaChanged));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('snapshot creates every table and unique index before restoring parent-first rows with foreign keys enabled', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_d1_fk_order_')), sqlite = path.join(dir, 'source.sqlite'), dump = path.join(dir, 'dump.sql');
  try {
    const source = new DatabaseSync(sqlite); source.exec("PRAGMA foreign_keys=ON; CREATE TABLE z_parent(code TEXT); CREATE UNIQUE INDEX TEST_ONLY_parent_code ON z_parent(code); CREATE TABLE a_child(parent_code TEXT REFERENCES z_parent(code)); INSERT INTO z_parent VALUES('TEST_ONLY_parent'); INSERT INTO a_child VALUES('TEST_ONLY_parent');"); source.close();
    execFileSync(PYTHON, [T + '/snapshot_local.py', sqlite, dump], { stdio: 'pipe' }); const sql = fs.readFileSync(dump, 'utf8');
    assert.doesNotMatch(sql, /^\s*(?:BEGIN\b|PRAGMA\s+foreign_keys\s*=\s*OFF)/im, 'The dump relies on neither a D1 BEGIN nor disabling FK enforcement');
    assert.ok(sql.lastIndexOf('CREATE ') < sql.indexOf('INSERT INTO '), 'All schema statements precede data');
    assert.ok(sql.indexOf('INSERT INTO "z_parent"') < sql.indexOf('INSERT INTO "a_child"'), 'FK parent rows precede child rows regardless of alphabetical names');
    const restored = new DatabaseSync(':memory:'); restored.exec('PRAGMA foreign_keys=ON'); restored.exec(sql);
    assert.equal(restored.prepare('SELECT COUNT(*) n FROM a_child').get().n, 1); assert.deepEqual(restored.prepare('PRAGMA foreign_key_check').all(), []); restored.close();
    execFileSync(PYTHON, [T + '/verify.py', dump, '--expect-tables', 'a_child,z_parent'], { stdio: 'pipe' });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('snapshot rejects cyclic table dependencies before creating or replacing its output', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_d1_fk_cycle_')), sqlite = path.join(dir, 'source.sqlite'), dump = path.join(dir, 'dump.sql');
  try {
    const source = new DatabaseSync(sqlite); source.exec('CREATE TABLE TEST_ONLY_a(id INTEGER PRIMARY KEY,b INTEGER REFERENCES TEST_ONLY_b(id)); CREATE TABLE TEST_ONLY_b(id INTEGER PRIMARY KEY,a INTEGER REFERENCES TEST_ONLY_a(id));'); source.close();
    fs.writeFileSync(dump, 'TEST_ONLY_existing_output');
    const failed = spawnSync(PYTHON, [T + '/snapshot_local.py', sqlite, dump], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
    assert.notEqual(failed.status, 0); assert.match(failed.stderr + failed.stdout, /cycle|cyclic|دور/i); assert.equal(fs.readFileSync(dump, 'utf8'), 'TEST_ONLY_existing_output');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('verification rejects missing FK parents even when a dump tries to disable enforcement, without a success manifest', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_d1_fk_invalid_'));
  try {
    for (const disabling of [false, true]) {
      const dump = path.join(dir, 'bad-' + disabling + '.sql'), manifest = path.join(dir, 'bad-' + disabling + '.json');
      fs.writeFileSync(dump, (disabling ? 'PRAGMA foreign_keys=OFF;\n' : '') + 'CREATE TABLE TEST_ONLY_parent(id INTEGER PRIMARY KEY);\nCREATE TABLE TEST_ONLY_child(parent_id INTEGER REFERENCES TEST_ONLY_parent(id));\nINSERT INTO TEST_ONLY_child VALUES(7);\n' + (disabling ? 'PRAGMA foreign_keys=ON;\n' : ''));
      const failed = spawnSync(PYTHON, [T + '/verify.py', dump, '--expect-tables', 'TEST_ONLY_parent,TEST_ONLY_child', '--manifest', manifest], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
      assert.notEqual(failed.status, 0); assert.match(failed.stderr + failed.stdout, /foreign key|علاق|مرجع/i); assert.equal(fs.existsSync(manifest), false); assert.doesNotMatch(failed.stdout, /✔/);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('D1 snapshot and verification succeed with cp1256 or no PYTHONIOENCODING and produce a valid UTF-8 dump', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_d1_stdio_')), sqlite = path.join(dir, 'source.sqlite');
  try {
    const source = new DatabaseSync(sqlite); source.exec("CREATE TABLE TEST_ONLY_values(value TEXT); INSERT INTO TEST_ONLY_values VALUES('TEST_ONLY بيانات');"); source.close();
    for (const setting of ['cp1256', null]) {
      const environment = { ...process.env }; delete environment.PYTHONIOENCODING;
      if (setting) environment.PYTHONIOENCODING = setting;
      const dump = path.join(dir, 'نسخة-' + (setting || 'default') + '.sql'), manifest = dump + '.json';
      const snapshot = spawnSync(PYTHON, [T + '/snapshot_local.py', sqlite, dump], { encoding: 'utf8', env: environment });
      assert.equal(snapshot.status, 0, snapshot.stderr || snapshot.error?.message); assert.match(snapshot.stdout, /snapshot →/); assert.doesNotMatch(snapshot.stderr, /charmap|UnicodeEncodeError/);
      const restored = new DatabaseSync(':memory:'); restored.exec('PRAGMA foreign_keys=ON'); restored.exec(fs.readFileSync(dump, 'utf8')); assert.equal(restored.prepare('SELECT value FROM TEST_ONLY_values').get().value, 'TEST_ONLY بيانات'); restored.close();
      const verified = spawnSync(PYTHON, [T + '/verify.py', dump, '--expect-tables', 'TEST_ONLY_values', '--manifest', manifest], { encoding: 'utf8', env: environment });
      assert.equal(verified.status, 0, verified.stderr || verified.error?.message); assert.match(verified.stdout, /✔/); assert.doesNotMatch(verified.stderr, /charmap|UnicodeEncodeError/);
      assert.equal(JSON.parse(fs.readFileSync(manifest, 'utf8')).tables.TEST_ONLY_values, 1);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('أدوات D1 ترفض Production دائمًا وواجهة استعادة SQL القديمة ولا تنفذ دون موافقة صريحة', () => {
  const r = (args, envx = {}) => { try { execFileSync(BASH, ['--noprofile', '--norc', ...args.map(arg => process.platform === 'win32' ? arg.replace(/\\/g, '/') : arg)], { encoding: 'utf8', stdio: 'pipe', env: Object.assign({}, process.env, { KIVO_PYTHON: process.platform === 'win32' ? PYTHON.replace(/\\/g, '/') : PYTHON, PATH: process.platform === 'win32' && path.isAbsolute(BASH) ? path.dirname(BASH) : '/usr/bin:/bin' }, envx) }); return 0; } catch (e) { return e.status; } };
  const bookmarkArgs = ['--bookmark', '00000001-00000002-00000003-' + 'a'.repeat(32), '--review', '/unused-review.json', '--evidence-dir', '/unused-evidence'];
  assert.equal(r([T + '/restore.sh', 'bassam-db', ...bookmarkArgs, '--yes']), 2, 'restore إلى Production: خروج 2 قبل أي نقل');
  assert.equal(r([T + '/backup.sh', 'bassam-db']), 2, 'backup من Production بلا علم: خروج 2');
  assert.equal(r([T + '/restore.sh', 'bassam-db-preview', ...bookmarkArgs]), 2, 'بلا --yes: رفض قبل قراءة أي قاعدة');
  assert.equal(r([T + '/restore.sh', 'bassam-db-preview', '/tmp/x.sql', '--yes']), 2, 'واجهة SQL المدمرة القديمة أزيلت');
  assert.equal(r([T + '/backup.sh', 'bassam-db-preview', '/tmp/kivo_bk_test']), 3, 'بلا wrangler: خروج 3 (لا يحاول شيئاً)');
  /* KIVO_249 · AUD-022: migrate.sh — Production مرفوضة بلا علم · مجلدٌ مفقود 5 · بلا wrangler 3 */
  assert.equal(r([T + '/migrate.sh', 'bassam-db', ROOT + '/migrations']), 2, 'migrate إلى Production بلا علم: خروج 2');
  assert.equal(r([T + '/migrate.sh', 'bassam-db-preview', '/nonexistent_dir']), 5, 'مجلدُ ترحيلات مفقود: خروج 5');
  assert.equal(r([T + '/migrate.sh', 'bassam-db-preview', ROOT + '/migrations']), 3, 'بلا wrangler: خروج 3 (لا يحاول شيئاً)');
});
