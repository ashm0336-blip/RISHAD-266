import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { ROOT, PYTHON } from './harness.mjs';

const prelude = `import importlib.util,pathlib,sqlite3,json
root=pathlib.Path(${JSON.stringify(ROOT)})
spec=importlib.util.spec_from_file_location('provision',root/'tools/provision_preview_admin.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
db=sqlite3.connect(':memory:')
db.executescript((root/'migrations/0001_baseline.sql').read_text(encoding='utf-8'))
`;
function run(script) {
  const r=spawnSync(PYTHON,['-I','-c',prelude+script],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);
}
test('Preview administrator keeps numeric account policy and salted PBKDF2 with full existing super role',()=>run(`
for data in [{'username':'invalid','password':'583927'},{'username':'0501234567','password':'123456'},{'username':'0501234567','password':'111111'},{'username':'0501234567','password':'12345'},{'username':'0501234567','password':'1234567'}]:
 try:module.validate_input(data)
 except module.SafeError:pass
 else:raise AssertionError('Invalid account policy accepted')
queries=module.plan('0501234567','583927')
assert all('583927' not in q['sql'] and '0501234567' not in q['sql'] for q in queries)
with db:
 for q in queries:db.execute(q['sql'],q.get('params',[]))
u=json.loads(db.execute("SELECT v FROM kv WHERE k='bassam_auth_users_v1'").fetchone()[0])[0]
assert u['role']=='super' and u['mc']==0 and u['dis']==0 and u['un']=='0501234567'
assert u['ph'].startswith('p2$100000$') and '583927' not in u['ph']
assert db.execute("SELECT rev FROM revs WHERE k='bassam_auth_users_v1'").fetchone()[0]==1
assert not db.execute('SELECT un FROM sec WHERE un IS NOT NULL').fetchall()
`));
test('Existing identities are refused before revision or credential changes',()=>run(`
with db:
 db.execute("INSERT INTO kv VALUES('bassam_auth_users_v1',0,'[]')")
 db.execute("INSERT INTO meta VALUES('rev','42')")
try:
 with db:
  for q in module.plan('0501234567','583927'):db.execute(q['sql'],q.get('params',[]))
except sqlite3.OperationalError:pass
else:raise AssertionError('Existing account document overwritten')
assert db.execute('SELECT v FROM kv').fetchone()[0]=='[]'
assert db.execute("SELECT v FROM meta WHERE k='rev'").fetchone()[0]=='42'
assert db.execute('SELECT COUNT(*) FROM sec').fetchone()[0]==0
`));
test('A late failure rolls back the entire administrator provisioning batch',()=>run(`
db.executescript("CREATE TRIGGER fail_provision BEFORE INSERT ON sec BEGIN SELECT RAISE(ABORT,'TEST_ONLY'); END;")
try:
 with db:
  for q in module.plan('0501234567','583927'):db.execute(q['sql'],q.get('params',[]))
except sqlite3.IntegrityError:pass
else:raise AssertionError('Injected failure did not run')
assert db.execute('SELECT COUNT(*) FROM kv').fetchone()[0]==0
assert db.execute('SELECT COUNT(*) FROM revs').fetchone()[0]==0
assert not db.execute("SELECT v FROM meta WHERE k='rev'").fetchall()
`));
