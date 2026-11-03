/* RISHAD-266 decision (g): a 13,006-account restore fits the approved <=100-statement
   batch by folding adjacent small scalar guards into one ordered CASE (rsMergeGuards).
   This suite proves the fold is not a weaker guard: for every single member condition and
   every pair of member conditions, the merged batch rejects exactly when the original
   sequential guards reject, with the same sentinel (the first failing one in order), and
   no write in the batch survives. Untagged guards stay barriers in their own position.
   The merged SQL is also replayed under D1's measured SQLite limits. TEST_ONLY data only. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { PYTHON, ROOT, WORKER } from './harness.mjs';
import { world } from './atomic_restore_review_fx.mjs';
import { D1 } from './notifications_review_fx.mjs';

const PROBE = 'TEST_ONLY_guard_probe',
  MARKER = 'TEST_ONLY_guard_marker',
  META_KEY = 'TEST_ONLY_guard_meta_key';

const NAMED = ['revGuard', 'rsWitness', 'rsEpoch', 'rsEpochGuard', 'rsMergeGuards', 'cuRowsGuard', 'cuSelection'];
let instance = 0;
/* The actual generated Worker (the same source the fixtures run), with the guard
   builders and the merge exported for direct inspection. */
async function guardWorker() {
  return import(
    'data:text/javascript;base64,' +
      Buffer.from(fs.readFileSync(WORKER, 'utf8') + '\nexport {' + NAMED.join(',') + '};\n// TEST_ONLY guard merge isolate ' + ++instance).toString('base64')
  );
}
async function setup() {
  const B = await world(),
    { env, DB } = B,
    W = await guardWorker();
  DB.exec('CREATE TABLE ' + PROBE + '(department_id TEXT)');
  DB.exec('CREATE TABLE ' + MARKER + '(v TEXT)');
  const epoch = await W.rsEpoch(env);
  /* Original order: three tagged guards, an untagged barrier, two tagged guards. */
  const build = () => [
    W.revGuard(env, 'TEST_ONLY_rev_a', 0),
    W.rsWitness(env, 'meta', ['k', 'v'], [], 'k=?1', [META_KEY])[0],
    W.cuRowsGuard(env, PROBE, ['department_id'], [], W.cuSelection(D1)),
    W.rsEpochGuard(DB, epoch),
    W.revGuard(env, 'TEST_ONLY_rev_b', 0),
    W.rsWitness(env, PROBE, ['department_id'], [], 'department_id=?1', ['TEST_ONLY_other_department'])[0],
  ];
  /* One trip per original guard, in the original order. */
  const trips = [
    () => DB.exec("INSERT INTO revs(k,rev) VALUES('TEST_ONLY_rev_a',5)"),
    () => DB.exec("INSERT INTO meta(k,v) VALUES('" + META_KEY + "','x')"),
    () => DB.exec('INSERT INTO ' + PROBE + "(department_id) VALUES('" + D1 + "')"),
    () => DB.exec("INSERT INTO meta(k,v) VALUES('restore_epoch','" + (epoch + 7) + "') ON CONFLICT(k) DO UPDATE SET v=excluded.v"),
    () => DB.exec("INSERT INTO revs(k,rev) VALUES('TEST_ONLY_rev_b',3)"),
    () => DB.exec('INSERT INTO ' + PROBE + "(department_id) VALUES('TEST_ONLY_other_department')"),
  ];
  const sentinels = ['KIVO_REV_CONFLICT', 'KIVO_RESTORE_TARGET', 'KIVO_CUSTODY_TARGET_CHANGED', 'KIVO_RESTORE_EPOCH', 'KIVO_REV_CONFLICT', 'KIVO_RESTORE_TARGET'];
  return { B, W, env, DB, build, trips, sentinels };
}
async function outcome(DB, guards) {
  const write = DB.prepare('INSERT INTO ' + MARKER + "(v) VALUES('written')");
  try {
    await DB.batch(guards.concat([write]));
  } catch (error) {
    const n = DB.q('SELECT COUNT(*) n FROM ' + MARKER)[0].n;
    assert.equal(n, 0, 'a rejected guard batch must not leave its write behind');
    const m = String(error && error.message).match(/KIVO_[A-Z_]+/);
    assert.ok(m, 'rejection must carry a guard sentinel: ' + error);
    return m[0];
  }
  DB.exec('DELETE FROM ' + MARKER);
  return 'ok';
}
function snapshot(DB) {
  return JSON.stringify([DB.q('SELECT k,rev FROM revs ORDER BY k'), DB.q('SELECT k,v FROM meta ORDER BY k'), DB.q('SELECT * FROM ' + PROBE + ' ORDER BY department_id')]);
}

test('adjacent tagged guards fold into ordered CASE statements; untagged guards stay barriers in place', async () => {
  const { W, env, build } = await setup(),
    original = build(),
    merged = W.rsMergeGuards(env, original);
  assert.equal(merged.length, 3, 'three tagged + barrier + two tagged -> one + barrier + one');
  assert.equal(merged[1], original[3], 'the untagged epoch guard keeps its own statement and position');
  assert.match(merged[0].sql, /^SELECT CASE WHEN .+ THEN json_extract\('\{\}','KIVO_REV_CONFLICT'\) WHEN .+ THEN json_extract\('\{\}','KIVO_RESTORE_TARGET'\) WHEN .+ THEN json_extract\('\{\}','KIVO_CUSTODY_TARGET_CHANGED'\) END$/);
  assert.deepEqual(merged[0].args, ['TEST_ONLY_rev_a', 0, 0, META_KEY, D1]);
  assert.deepEqual(merged[2].args, ['TEST_ONLY_rev_b', 0, 0, 'TEST_ONLY_other_department']);
  /* A lone tagged guard is returned unchanged; a guard list without tags is untouched. */
  const lone = W.revGuard(env, 'TEST_ONLY_rev_lone', 2);
  assert.deepEqual(W.rsMergeGuards(env, [lone]), [lone]);
  const plain = [original[3], original[3]];
  assert.deepEqual(W.rsMergeGuards(env, plain), plain);
});

test('merged guards trip for each original condition alone, with the same sentinel and no write', async () => {
  for (let i = -1; i < 6; i++) {
    const { W, env, DB, build, trips, sentinels } = await setup();
    if (i >= 0) trips[i]();
    const before = snapshot(DB),
      sequential = await outcome(DB, build()),
      merged = await outcome(DB, W.rsMergeGuards(env, build()));
    assert.equal(sequential, i < 0 ? 'ok' : sentinels[i], 'original guard ' + i);
    assert.equal(merged, sequential, 'merged guards must reject exactly like the original guard ' + i);
    assert.equal(snapshot(DB), before);
  }
});

test('with two conditions tripped the merged guards raise the first sentinel in original order', async () => {
  for (let i = 0; i < 6; i++)
    for (let j = i + 1; j < 6; j++) {
      const { W, env, DB, build, trips, sentinels } = await setup();
      trips[i]();
      trips[j]();
      const sequential = await outcome(DB, build()),
        merged = await outcome(DB, W.rsMergeGuards(env, build()));
      assert.equal(sequential, sentinels[i]);
      assert.equal(merged, sequential, 'pair ' + i + ',' + j);
    }
});

test('a guard whose literal contains a placeholder is not renumbered; it stays its own statement', async () => {
  const { W, env, DB } = await setup(),
    risky = W.rsWitness(env, PROBE, ['department_id'], [], "department_id='TEST_ONLY_?1'")[0],
    a = W.revGuard(env, 'TEST_ONLY_rev_a', 0),
    b = W.revGuard(env, 'TEST_ONLY_rev_b', 0),
    merged = W.rsMergeGuards(env, [a, risky, b]);
  assert.deepEqual(merged, [a, risky, b]);
  assert.equal(merged[1].sql, risky.sql, 'the merge never rewrites a guard it did not tag');
  assert.equal(await outcome(DB, merged), await outcome(DB, [a, risky, b]));
});

const REPLAY = String.raw`
import json,sqlite3,sys
p=json.load(sys.stdin)
db=sqlite3.connect(':memory:',isolation_level=None)
db.setlimit(sqlite3.SQLITE_LIMIT_VARIABLE_NUMBER,100)
db.setlimit(sqlite3.SQLITE_LIMIT_SQL_LENGTH,100000)
db.setlimit(sqlite3.SQLITE_LIMIT_EXPR_DEPTH,100)
db.setlimit(sqlite3.SQLITE_LIMIT_COMPOUND_SELECT,5)
db.execute('CREATE TABLE revs(k TEXT PRIMARY KEY,rev INTEGER)')
def run():
    for s in p['statements']:
        try:db.execute(s['sql'],s['args']).fetchall()
        except sqlite3.Error as e:return str(e)
    return 'ok'
out={'clean':run()}
db.execute('INSERT INTO revs VALUES(?,?)',(p['trip'],9))
out['tripped']=run()
print(json.dumps(out))
`;
test('long runs split within D1 limits (<=100 variables, <100 KB SQL, flat CASE) and still trip on the last member', async () => {
  const { W, env } = await setup(),
    guards = Array.from({ length: 150 }, (_, i) => W.revGuard(env, 'TEST_ONLY_rev_' + i, 0)),
    merged = W.rsMergeGuards(env, guards);
  assert.equal(merged.length, 3, '150 guards x 2 variables -> three statements of 50');
  for (const s of merged) {
    assert.ok(s.args.length <= 100, 'bound variables ' + s.args.length);
    assert.ok(new TextEncoder().encode(s.sql).byteLength < 100000);
  }
  assert.deepEqual(merged.flatMap((s) => s.args), guards.flatMap((s) => s.args));
  const out = spawnSync(PYTHON, ['-c', REPLAY], {
    cwd: ROOT,
    input: JSON.stringify({ statements: merged.map((s) => ({ sql: s.sql, args: s.args })), trip: 'TEST_ONLY_rev_149' }),
    encoding: 'utf8',
    windowsHide: true,
    timeout: 10000,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  });
  assert.equal(out.status, 0, out.stderr || out.stdout);
  const r = JSON.parse(out.stdout);
  assert.equal(r.clean, 'ok');
  assert.match(r.tripped, /KIVO_REV_CONFLICT/);
});
