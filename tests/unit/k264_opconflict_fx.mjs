/* RISHAD-266 · owner decision (d), 2026-11-03: concurrent edits of rounds and tasks (Operations resources) use
   conflict without data loss — the second save from the same base is refused with a clear conflict state, nothing of it
   is merged automatically, and the user re-reads and retries. This fixture drives that contract end to end:
   the real Worker over an isolated in-memory D1 (harness.mjs), the real 280 Operations service (KIVO.__BS_SRV.operations)
   in two isolated browser tabs, and the real page save paths (daily _opCommit · tasks _tkChange/_tkClose) extracted
   from src/ — no fake server, no merge helper, no live Test. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { parse } from 'acorn';
import { makeTestEnv, client, applySql, TEST_SUPER_USERNAME, TEST_SUPER_PIN, ROOT } from './harness.mjs';
import { installCurrentSchemaFixture } from './current_schema_fx.mjs';
import { inspectOperationalFixture } from './operational_legacy_seed_fx.mjs';
import { loadClient, fixture } from './k264_vm.mjs';

export const DEPT = 'tst_d1';
export const KR = 'bsdept:' + DEPT + ':bassam_rounds_v1', KT = 'bsdept:' + DEPT + ':bassam_tasks_v1';

/* The isolated world: legacy SQL seed → current schema storage (real canonical cutover), in either authorization mode. */
export async function world(mode) {
  const env = makeTestEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce', KIVO_TEST_FIXTURE: 'allow' } : { KIVO_TEST_FIXTURE: 'allow' }); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  await C.save(su.ck, { bassam_depts_v1: JSON.stringify([{ id: 'dR', name: 'إدارة', gid: '' }]) });
  await applySql(env.DB, fixture().seed);
  await installCurrentSchemaFixture(env);
  if (mode === 'enforce') env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  return { env, C, server: (key) => inspectOperationalFixture(env, key) };
}

/* One browser tab of a signed-in account: real 280 over the real Worker. The page is hidden so the background
   change poll cannot re-read between the two saves — the race under test is "both edited the same loaded base". */
export async function tab(W, user, pin) {
  const L = await W.C.login(user, pin); assert.ok(L.ok, 'login ' + user);
  const boot = (await W.C.boot(L.ck)).boot; assert.ok(boot && boot.uid, 'boot ' + user);
  const T = loadClient({ C: W.C, boot, jar: { cookie: L.ck }, blocks: ['280-server-storage.js', '440-count.js'] });
  T.W.document.hidden = true;
  T.W.KIVO.BassamAuth = { user: () => ({ id: boot.uid }) };
  T.W.KIVO.BassamDepts = { active: () => DEPT };
  T.ops = T.W.KIVO.__BS_SRV.operations;
  T.posts = () => T.saves().length;
  return T;
}

function member(file, name) {
  const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const found = [];
  (function visit(x) { if (!x || typeof x !== 'object') return; if (x.type === 'MethodDefinition' && x.key && x.key.name === name) found.push(x); Object.values(x).forEach(v => Array.isArray(v) ? v.forEach(visit) : visit(v)); })(parse(source, { ecmaVersion: 'latest', sourceType: 'script' }));
  assert.equal(found.length, 1, file + ' ' + name);
  return source.slice(found[0].start, found[0].end);
}
const methods = (T, file, names) => vm.runInContext('({' + names.map(n => member(file, n)).join(',') + '})', T.ctx);

/* Daily (rounds) page save path: the draft is captured when the page shows the loaded base (as the page does on load). */
export function roundsPage(T) {
  const M = methods(T, 'src/modules/daily/logic.js', ['_opCommit']), toasts = [];
  const page = { _opService: () => T.ops, _opDrafts: { bassam_rounds_v1: T.ops.draft() }, bsToast: (m, tone) => toasts.push({ m: String(m), tone }) };
  page._opCommit = M._opCommit;
  /* save(edit): the edit is applied to the value this page loaded (its draft base), exactly what the page submits */
  return { toasts, save: (edit) => page._opCommit({ bassam_rounds_v1: edit(page._opDrafts.bassam_rounds_v1.get('bassam_rounds_v1')) }) };
}
/* Tasks page save path: _tkChange (inline edit · same slot the page uses for add/edit) and _tkClose (the page's re-read). */
export function tasksPage(T) {
  const M = methods(T, 'src/modules/tasks/logic.js', ['_tkChange', '_tkClose']), toasts = [];
  /* the service the page calls, recording the commit result the page acts on (_tkChange itself returns true/false) */
  let last = null;
  const ops = { ...T.ops, commit: async (...a) => (last = await T.ops.commit(...a)) };
  const page = { _tkOps: () => ops, state: { year: 0, month: 0 }, bsToast: (m, tone) => toasts.push({ m: String(m), tone }),
    _tkLSBust() {}, setState() {}, loadAllTasks() { return null; }, loadLocks() { return null; } };
  page._tkChange = M._tkChange; page._tkClose = M._tkClose;
  return { toasts, page,
    save: async (edit) => {
      last = null;
      const shown = await page._tkChange('inline', (draft) => { const v = draft.get('bassam_tasks_v1') || {}; edit(v); draft.set('bassam_tasks_v1', v); });
      assert.equal(shown, !!(last && last.ok === 1), 'the page reports exactly what the service confirmed');
      return last;
    },
    reread: () => page._tkClose('inline', {}) };
}
