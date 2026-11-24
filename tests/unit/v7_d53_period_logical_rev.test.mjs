/* V7 · 53 (periodsui · basefix): the real worker over the D1 stand-in and the actual 280 in vm (TEST_ONLY).
   A task command (/api/tasks/settings · recur) carries the logical revision of bassam_tasks_v1 as `base` (070b tkCommandContext).
   After the page's own period save (K@<day>), KIVO.__BS_SRV.rev(K) must already be the server's logical revision — taken from
   the save receipt, with no extra read — or the next command is refused 409 'busy' once.
   Before the fix: rev(K) stayed at the last read's value and the settings command answered 409 busy. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, D1, IDS } from './canonical_fx.mjs';
import { installOperationalFixture } from './operational_legacy_seed_fx.mjs';
import { loadClient } from './k264_vm.mjs';

const K = 'bsdept:' + D1 + ':bassam_tasks_v1';
const today = () => { const p = new Intl.DateTimeFormat('en-u-ca-gregory-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'Asia/Riyadh' }).formatToParts(new Date()); const n = (t) => +p.find((x) => x.type === t).value; return { y: n('year'), m: n('month'), d: n('day') }; };

test('after its own period save the client holds the logical revision: the next task command is accepted (no 409 busy)', async (t) => {
  const B = await world(); await installOperationalFixture(B.env, B.W);
  const H = today(), day = H.y + '-' + String(H.m).padStart(2, '0') + '-' + String(H.d).padStart(2, '0');
  const initial = (await B.api('super', '/api/get?keys=' + encodeURIComponent('bassam_perms_v1,bassam_depts_v1'))).json;
  const T = loadClient({ jar: { cookie: 'bs_tok=TEST_ONLY_session_super' },
    boot: { srv: 1, cf: 1, uid: IDS.super, v: initial.v, keys: {}, revs: {} },
    C: { req: async (route, { method = 'GET', cookie, body } = {}) => {
      const headers = new Headers({ Cookie: cookie });
      if (method !== 'GET') { headers.set('Origin', 'http://x'); headers.set('Content-Type', 'application/json'); }
      return B.W.default.fetch(new Request(new URL(route, 'http://x'), { method, headers, ...(body === undefined ? {} : { body }) }), B.env);
    } } });
  t.after(() => T.dispose());
  const W = T.W, KV = W.KIVO; W.document.hidden = true; W.URLSearchParams = URLSearchParams;
  KV.BassamAuth = { user: () => B.users.find((u) => u.id === IDS.super) }; KV.BassamDepts = { active: () => D1 };
  KV.BassamCal = { gAt: () => ({ ...H }) };   /* V7 · 53 تقويم: «الآن» الميلادي للفترات (280 periodNow9) */
  const ops = KV.__BS_SRV.operations;
  assert.equal((await ops.read([K])).ok, 1);
  const post = async (route, body) => { const r = await W.fetch(route, { method: 'POST', body: JSON.stringify(body) }); return { status: r.status, j: await r.json() }; };
  const s = Date.now() + 3600e3, e = s + 7200e3;
  for (const name of ['TEST_ONLY أ', 'TEST_ONLY ب']) {
    const c = await post('/api/tasks/create', { dept: D1, uid: IDS.super, k: day, t: name, desc: '', prio: 'normal', s, e, asg: [], pol: { m: 'any' }, rv: 'creator', dec: 1, win: { early: 0, late: 2 }, epoch: ops.status().epoch, requestId: W.crypto.randomUUID() });
    assert.equal(c.status, 200, JSON.stringify(c.j));
  }
  assert.equal((await ops.read([K])).ok, 1);
  const rows = ops.get('bassam_tasks_v1')[day];
  assert.equal(rows.length, 2, 'two tasks today');
  /* the page's own raw save (mutateStore: one row removed) — a period save of K@<today> */
  const keep = rows[1], saved = await ops.patch({}, 'TEST_ONLY:del', 'bassam_tasks_v1', (doc) => { doc[day] = doc[day].filter((r) => r[13] !== rows[0][13]); return doc; });
  assert.equal(saved.ok, 1, JSON.stringify(saved));
  const logical = (await B.api('super', '/api/operations/read?uid=' + IDS.super + '&keys=' + encodeURIComponent(K + '@') + '&range=' + encodeURIComponent(K + '@' + H.y + '-' + String(H.m).padStart(2, '0')))).json.logical;
  assert.ok(logical && Number.isSafeInteger(logical[K]), 'the server reports the logical revision: ' + JSON.stringify(logical));
  assert.equal(KV.__BS_SRV.rev(K), logical[K], 'rev(K) after the own period save = the server logical revision (from the save receipt)');
  /* the next command with that base: accepted */
  const cmd = await post('/api/tasks/settings', { dept: D1, uid: IDS.super, k: day, id: keep[13], ekey: keep[14] == null ? null : String(keep[14]), pol: { m: 'any' }, rv: 'creator', dec: 1, win: { early: 0, late: 3 },
    epoch: ops.status().epoch, base: KV.__BS_SRV.rev(K), requestId: W.crypto.randomUUID() });
  assert.equal(cmd.status, 200, 'the task command right after the raw save is not refused busy: ' + JSON.stringify(cmd.j));
  assert.equal(cmd.j.ok, 1);
});
