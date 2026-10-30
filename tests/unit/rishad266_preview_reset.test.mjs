/* Preparation is offline; executing the resulting SQL still requires a verified Preview UI. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { ROOT, PYTHON } from './harness.mjs';

function check(script) {
  const prelude = `import importlib.util,json,sqlite3,pathlib,tomllib,copy
root=pathlib.Path(${JSON.stringify(ROOT)})
spec=importlib.util.spec_from_file_location('preview_reset',root/'tools/d1/prepare_preview_reset.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
config=tomllib.loads((root/'config/wrangler.preview.toml').read_text(encoding='utf-8'))
inventory={'database_id':module.PREVIEW,'database_name':'bassam-db-preview','tables':['kv','meta','d1_migrations','kr268_job']}
`;
  const result = spawnSync(PYTHON, ['-c', prelude + script], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  assert.equal(result.status, 0, result.stderr);
}

test('Disposable Preview reset prepares clean source migrations and enforced permissions without default accounts', () => {
  check(`db=sqlite3.connect(':memory:')
db.executescript("CREATE TABLE kv(k TEXT,seq INTEGER,v TEXT); CREATE TABLE meta(k TEXT,v TEXT); CREATE TABLE d1_migrations(name TEXT); CREATE TABLE kr268_job(sid TEXT); INSERT INTO kr268_job VALUES('TEST_ONLY');")
sql=module.prepare(inventory,config,root/'migrations')
db.executescript(sql)
assert not db.execute("SELECT name FROM sqlite_master WHERE name='kr268_job'").fetchall()
assert db.execute("SELECT count(*) FROM kv WHERE k='bassam_auth_users_v1'").fetchone()[0]==0
assert db.execute("SELECT v FROM meta WHERE k='authz_mode'").fetchone()[0]=='enforce'
assert int(db.execute("SELECT v FROM meta WHERE k='schema_version'").fetchone()[0])==len(list((root/'migrations').glob('*.sql')))
assert not db.execute('PRAGMA foreign_key_check').fetchall()
assert 'R2' not in sql.replace('-- All current Preview tables/data are removed; no R2 operations are included.','')
`);
});

test('Preview reset rejects other targets, extra resources, and unsafe table names', () => {
  check(`cases=[]
c=copy.deepcopy(config);c['d1_databases'][0]['database_name']='bassam-db';cases.append((inventory,c))
c=copy.deepcopy(config);c['d1_databases'][0]['database_id']='00000000-0000-0000-0000-000000000001';cases.append((inventory,c))
c=copy.deepcopy(config);c['r2_buckets']=[{'bucket_name':'TEST_ONLY'}];cases.append((inventory,c))
i=copy.deepcopy(inventory);i['database_id']='other';cases.append((i,config))
i=copy.deepcopy(inventory);i['tables']=['sqlite_sequence'];cases.append((i,config))
i=copy.deepcopy(inventory);i['tables']=['kv;DROP TABLE meta'];cases.append((i,config))
for i,c in cases:
 try:module.prepare(i,c,root/'migrations')
 except ValueError:pass
 else:raise AssertionError('Unsafe target or identifier accepted')
`);
});

test('A stale Preview table inventory fails before any reset write', () => {
  check(`db=sqlite3.connect(':memory:')
db.executescript("CREATE TABLE kv(k TEXT,seq INTEGER,v TEXT); CREATE TABLE meta(k TEXT,v TEXT); CREATE TABLE d1_migrations(name TEXT); CREATE TABLE kr268_job(sid TEXT); CREATE TABLE unexpected_new_domain(id INTEGER); INSERT INTO kv VALUES('TEST_ONLY',0,'preserve');")
before=list(db.execute("SELECT name,sql FROM sqlite_master ORDER BY name"))
try:db.executescript(module.prepare(inventory,config,root/'migrations'))
except sqlite3.OperationalError as error:assert 'KIVO_PREVIEW_INVENTORY_CHANGED' in str(error)
else:raise AssertionError('A stale inventory was accepted')
assert list(db.execute("SELECT name,sql FROM sqlite_master ORDER BY name"))==before
assert db.execute('SELECT v FROM kv').fetchone()[0]=='preserve'
`);
});
