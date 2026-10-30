/* Private F-10 probes for guarded D1 requests. The SQLite batch primitive is
   delegated unchanged; hooks run only outside its completed transaction. */
import assert from 'node:assert/strict';
import { who, sleep } from './tasks_conc_fx.mjs';
import { KT } from './tasks_fx.mjs';
export function instrument(env, opt = {}) {
  const DB = env.DB,
    prepare = DB.prepare.bind(DB),
    batch = DB.batch.bind(DB),
    S = { jitter: opt.jitter ?? 2, hooks: [], trace: {} };
  const trace = (c) => {
    const tag = who();
    S.trace[tag] = (S.trace[tag] || '') + c;
  };
  const delay = () => (S.jitter <= 0 ? new Promise((r) => setImmediate(r)) : sleep(Math.random() * S.jitter));
  async function fire(sql, kind, phase) {
    for (const h of S.hooks.slice()) {
      if (
        h.done ||
        (h.who && h.who !== who()) ||
        (h.kind && h.kind !== kind) ||
        (h.phase || 'before') !== phase ||
        (h.match && !h.match(sql))
      )
        continue;
      if (h.nth && ++h.seen < h.nth) continue;
      h.done = !h.repeat;
      assert.equal(DB._inBatch, false, 'A concurrency hook must run outside the SQLite transaction');
      await h.run(sql);
    }
  }
  DB.prepare = (sql) => {
    const s = prepare(sql);
    for (const name of ['first', 'all', 'run', 'raw']) {
      const call = s[name].bind(s);
      s[name] = async (...args) => {
        await fire(sql, 'stmt', 'before');
        await delay();
        const result = await call(...args);
        if (/^SELECT rev FROM revs WHERE k = \?1$/.test(sql)) trace('r');
        await fire(sql, 'stmt', 'after');
        return result;
      };
    }
    return s;
  };
  DB.batch = async (stmts) => {
    // A matching statement identifies its containing transaction. Before/after
    // hooks bracket the entire batch; they never split SQL statements inside it.
    const sql = stmts.map((s) => s.sql).join(' ;; ');
    await fire(sql, 'batch', 'before');
    for (const s of stmts) await fire(s.sql, 'stmt', 'before');
    await delay();
    const guarded = stmts.some((s) => /KIVO_REV_CONFLICT/.test(s.sql) && (s.args || []).includes(KT)),
      security = stmts.some((s) => /^INSERT INTO sec/.test(s.sql));
    let result;
    try {
      result = await batch(stmts);
    } catch (error) {
      if (guarded && /KIVO_REV_CONFLICT/.test(String(error))) trace('L');
      throw error;
    }
    if (guarded) trace('G');
    else if (security && !stmts.some((s) => /INTO kv/.test(s.sql))) trace('d');
    // Even a read-only multi-statement preload is indivisible. Its after hooks
    // see the captured result and run before the Worker starts its next round.
    for (const s of stmts) {
      if (/^SELECT rev FROM revs WHERE k = \?1$/.test(s.sql)) trace('r');
      await fire(s.sql, 'stmt', 'after');
    }
    await fire(sql, 'batch', 'after');
    return result;
  };
  S.hook = (h) => {
    h.seen = 0;
    S.hooks.push(h);
    return h;
  };
  S.lost = () => Object.values(S.trace).reduce((n, t) => n + (t.match(/L/g) || []).length, 0);
  return S;
}
