/* V7 · 53 (S2 — تقليصُ العامل بلا تغيير سلوك): الترحيل 0010 في KIVO_MIGRATIONS بلا عبارات CREATE لجداول الكيانات — تُستعاد في العامل من
   ocCreateStatements (المرمِّز نفسُه) عند أول قراءة لـ sql (tools/migration_compact.json · tools/generate.py MIG_OC_JS).
   ① بايتاً وبالترتيب: KIVO_MIGRATIONS[0010].sql (المستعاد) = عباراتُ migrations/0010_operational_domains.sql كما يقسمها المولِّد (split_sql)، عبارةً
      عبارة، والجزءُ المولَّد (051a) لا يحمل الوسط (فالمطابقةُ من المرمِّز لا من نسخةٍ مخبّأة)؛ وبقيةُ الترحيلات كما في ملفاتها.
   ② الانحراف يُكتشف ويُغلق: وصفٌ واحدٌ يتغيّر (عمودٌ يُضاف لجدول كيانٍ من 0010) ⇒ الاستعادةُ ترمي migration-compact-drift (لا قاعدةَ بمخطّطٍ آخر)،
      وبلا التغيير تعود كما هي.
   ③ قاعدةٌ جديدة: migrateDb يطبّق المستعادَ فتنشأ الجداولُ نفسُها التي ينشئها تطبيقُ الملفات مباشرةً (مسارُ wrangler) — مخطّطٌ واحد. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { D1Shim, ROOT, PYTHON } from './harness.mjs';

const parts = JSON.parse(fs.readFileSync(path.join(ROOT, 'workers/parts.json'), 'utf8')).parts;
const MIG = path.join(ROOT, 'migrations'), files = fs.readdirSync(MIG).filter((f) => f.endsWith('.sql')).sort();
const SPEC = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'migration_compact.json'), 'utf8')).migrations;
let isolate = 0;
async function worker(mutate) {
  let source = parts.map((p) => fs.readFileSync(path.join(ROOT, 'workers/parts', p.file), 'utf8')).join('');
  if (mutate) source = mutate(source);
  return import('data:text/javascript;base64,' + Buffer.from(source + '\nexport { migrateDb, KIVO_MIGRATIONS, kivoMigOcExpand, ocPrepare, opDefinitions, OC_TABLE_NAMES };\n// compact isolate ' + ++isolate).toString('base64'));
}
/* split_sql من المولِّد نفسِه — لا تقسيمٌ ثانٍ */
function splitSql(file) {
  const r = spawnSync(PYTHON, ['-c', 'import sys, json; sys.path.insert(0, sys.argv[1]); import generate as G; sys.stdout.write(json.dumps(G.split_sql(open(sys.argv[2], encoding="utf-8").read())))', path.join(ROOT, 'tools'), path.join(MIG, file)], { encoding: 'utf8', maxBuffer: 1 << 26 });
  assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout);
}

test('V7 · 53 S2 ①: كلُّ ترحيلٍ (و0010 المستعاد) = ملفُّه عبارةً عبارة بالترتيب · والجزءُ 051a لا يحمل وسط 0010', async () => {
  assert.deepEqual(Object.keys(SPEC), ['0010_operational_domains'], 'المضغوطُ 0010 وحده');
  const W = await worker();
  assert.deepEqual(W.KIVO_MIGRATIONS.map((m) => m.name), files.map((f) => f.slice(0, -4)));
  for (const f of files) assert.deepEqual(W.KIVO_MIGRATIONS.find((m) => m.name === f.slice(0, -4)).sql, splitSql(f), f + ' عبارةً عبارة بالترتيب');
  const part = fs.readFileSync(path.join(ROOT, 'workers/parts/051a-schema-migrations.js'), 'utf8');
  const lit = JSON.parse(/var KIVO_MIGRATIONS = (\[[\s\S]*?\n\]);/.exec(part)[1]), m10 = lit.find((m) => m.name === '0010_operational_domains');
  assert.equal(m10.sql, undefined, 'لا sql حرفيّ لـ0010 في الجزء'); assert.equal(m10.oc.n, splitSql('0010_operational_domains.sql').length - 3);
  assert.ok(!part.includes('CREATE TABLE IF NOT EXISTS ops_task_row('), 'جدولُ كيانٍ غيرُ مثبَّت ليس في الجزء');
  assert.deepEqual(Object.keys(m10.oc.pin), ['ops_round_day_move'], 'المثبَّتُ حرفاً: الجدولُ الذي غيّره 0012 وحده');
});

test('V7 · 53 S2 ②: وصفٌ واحدٌ يتغيّر ⇒ الاستعادةُ ترمي (مغلقة) — وبلا التغيير تطابق', async () => {
  const W = await worker(), m10 = W.KIVO_MIGRATIONS.find((m) => m.name === '0010_operational_domains');
  const prepared = W.ocPrepare(W.opDefinitions(), W.OC_TABLE_NAMES);
  assert.deepEqual(W.kivoMigOcExpand(m10, prepared), splitSql('0010_operational_domains.sql'));
  /* الطفرة: عمودٌ إضافي في وصف جدولٍ من 0010 (ops_task_row) */
  const spec = Object.values(prepared.entities).find((s) => s.table === 'ops_task_row');
  assert.ok(spec, 'ops_task_row في الأوصاف');
  spec.columns = spec.columns.concat(['TEST_ONLY_extra']);
  assert.throws(() => W.kivoMigOcExpand(m10, prepared), /migration-compact-drift: 0010_operational_domains/);
  /* والطفرةُ في مصدر الأوصاف نفسِه (OC_TABLE_NAMES: اسمُ جدول الكيان ops_task_row يتبدّل) ⇒ قراءةُ sql نفسُها ترمي */
  const M = await worker((src) => { const n = src.length, out = src.replace('ops_task_row: { t: "ops_task_row", e: "ops_task_row" },', 'ops_task_row: { t: "ops_task_row", e: "ops_task_row_mut" },'); assert.ok(out.length > n, 'الطفرةُ وقعت'); return out; });
  assert.throws(() => M.KIVO_MIGRATIONS.find((m) => m.name === '0010_operational_domains').sql, /migration-compact-drift/);
});

test('V7 · 53 S2 ③: قاعدةٌ جديدة بـmigrateDb = تطبيقُ الملفات مباشرةً (مخطّطٌ واحد)', async () => {
  const W = await worker();
  const A = new D1Shim(); await W.migrateDb({ DB: A });
  const B = new D1Shim(); B.exec('CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  for (const f of files) { B.exec(fs.readFileSync(path.join(MIG, f), 'utf8')); B.exec("INSERT INTO d1_migrations (name) VALUES ('" + f.slice(0, -4) + "')"); }
  const shape = (DB) => DB.q("SELECT type, name, tbl_name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name").map((r) => r.type + ':' + r.name + ':' + r.tbl_name + ':' + DB.q('PRAGMA table_info("' + r.name + '")').map((c) => c.name + '/' + c.type + '/' + c.notnull + '/' + c.pk).join(','));
  assert.deepEqual(shape(A), shape(B));
  assert.deepEqual(A.q('SELECT name FROM d1_migrations ORDER BY id').map((r) => r.name), files.map((f) => f.slice(0, -4)));
});
