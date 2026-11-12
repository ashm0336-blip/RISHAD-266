/* V7-F · shared helpers for the image-orphan tests (real worker · legacy AND enforce · stored rows AND R2 bytes). TEST_ONLY identities. */
import assert from 'node:assert/strict';
import { world, workerUnderTest, D, PNG, TAG, stored, taskCommandBody, operationSaveBody, putKV, replaceOperationalFixture } from './tasks_fx.mjs';
export { D, PNG, TAG, stored, putKV };
export const WU = workerUnderTest();
export const K_USERS = 'bassam_auth_users_v1', K_DEPTS = 'bassam_depts_v1';
export const D2 = 'tst_d2', DAYMS = 864e5;
export const dk = (d, r) => 'bsdept:' + d + ':bassam_' + r + '_v1';
export const MODES = ['legacy', 'enforce'];
export const WHO = { mgr: ['0000000101', '70101'], mgr2: ['0000000102', '70102'], gm: ['0000000103', '70103'], mgr3: ['0000000104', '70104'], emp2: ['0000000121', '70121'], staff: ['0000000111', '70111'] };
let seq = 0;
export const uniq = (mode) => mode.slice(0, 1) + (++seq).toString(36) + Date.now().toString(36).slice(-4);
const isDay = (k) => /^\d+-\d+-\d+$/.test(k);
export const img = (W, ck, id, method = 'GET', body) => W.C.api('/api/img/' + id, Object.assign({ method, cookie: ck }, method === 'PUT' ? { body: body || PNG, headers: { 'Content-Type': 'text/plain' } } : {}));
/* the whole stored truth of one image: body rows · R2 object · owner row · references */
export async function state(W, id) {
  const rows = W.env.DB.q('SELECT v FROM imgs WHERE k = ? ORDER BY seq', id).map((r) => r.v).join(''), o = W.env.IMG_R2 && W.env.IMG_R2.get ? await W.env.IMG_R2.get('img/' + id) : null;
  const ow = W.env.DB.q('SELECT st, k, uid, dept FROM imgown WHERE img = ?', id)[0] || null;
  return { body: rows === '' ? null : rows === '~r2~' ? 'r2' : 'inline', r2: o ? await o.text() : null, st: ow ? ow.st : null, k: ow ? ow.k : null, dept: ow ? ow.dept : null, uid: ow ? ow.uid : null,
    refs: W.env.DB.q('SELECT k FROM imgref WHERE img = ? ORDER BY k', id).map((r) => r.k) };
}
export const gone = (s) => s.body === null && s.r2 === null && s.st === null;
export async function read(W, ck, k) { const g = await W.C.api('/api/operations/read?keys=' + encodeURIComponent(k), { cookie: ck }); return { v: g.j.resources && g.j.resources[k], base: g.j.base && g.j.base[k], raw: g }; }
export async function save(W, ck, k, v, base) {
  const p = '/api/save', body = { set: { [k]: JSON.stringify(v) }, del: [], base: { [k]: base }, why: { [k]: TAG + ' v7f' } };
  const r = await W.C.api(p, { method: 'POST', cookie: ck, body: operationSaveBody(W.env, p, taskCommandBody(W.env, p, body)) });
  return { status: r.status, ok: r.status === 200 && !(r.j.denied || {})[k] && !(r.j.conflicts || {})[k], why: ((r.j.denied || {})[k] || {}).why || null, j: r.j };
}
export const planEdit = (id) => (v) => { v.floors[0].iid = id; };
export const roundEdit = (id) => (v) => { const day = Object.keys(v).filter(isDay).sort().pop(); v[day].d[0].iid = id; };
export const EDIT = { plan: planEdit, rounds: roundEdit };
/* read → edit → typed save of one resource of a unit, as the browser does */
export async function edit(W, ck, dept, res, fn) {
  const k = dk(dept, res), g = await read(W, ck, k);
  if (!g.v) return { status: g.raw.status, ok: false, why: 'no-read', j: g.raw.j };
  fn(g.v); return save(W, ck, k, g.v, g.base);
}
export async function upload(W, ck, id, body) { const r = await img(W, ck, id, 'PUT', body); assert.equal(r.status, 200, 'upload ' + id + ' ' + JSON.stringify(r.j)); }
export async function bind(W, ck, dept, res, id) { await upload(W, ck, id); const s = await edit(W, ck, dept, res, EDIT[res](id)); assert.ok(s.ok, 'bind ' + res + ' ' + JSON.stringify(s.j).slice(0, 300)); }
export async function scene(mode) {
  const W = await world({ worker: WU.file, mode }), x = uniq(mode), S = { super: W.su.ck };
  /* the second unit gets a round document of its own (a copy of the first unit's, before any image is bound) so its manager has a round map to save into */
  if (!stored(W.env, dk(D2, 'rounds'))) await replaceOperationalFixture(W.env, dk(D2, 'rounds'), stored(W.env, dk(D, 'rounds')));
  for (const [n, [u, p]] of Object.entries(WHO)) S[n] = (await W.login(u, p)).ck;
  return { W, S, x, id: (n) => 'img_v7f' + x + '_' + n };
}
/* the platform admin's unit delete / wipe, exactly as the console does it (inventory → base → POST) */
export async function unitOp(W, route, dept) {
  const run = async () => { const inv = await W.C.api('/api/admin/' + route + '?dept=' + dept, { cookie: W.su.ck });
    return W.C.api('/api/admin/' + route, { method: 'POST', cookie: W.su.ck, body: { uid: W.su.j.uid, dept, requestId: 'TEST_ONLY_v7f_' + route + (++seq), base: inv.j.base, reason: TAG + ' v7f' } }); };
  let r = await run();
  if (r.status === 403 && r.j.err === 'unit-unknown-data') {   /* a fixture-only key the platform does not classify: removed from the fixture, never by the worker */
    for (const k of Object.keys(r.j.denied || {})) { W.env.DB.db.prepare('DELETE FROM kv WHERE k = ?').run(k); W.env.DB.db.prepare('DELETE FROM revs WHERE k = ?').run(k); }
    r = await run();
  }
  assert.equal(r.status, 200, route + ' ' + JSON.stringify(r.j).slice(0, 300));
  return r;
}
/* the sweep runs at most once per 10 minutes for the whole platform (guard 'rl:img-sweep', n = the time of the last pass): `due` is those minutes passing */
export const due = (W) => W.env.DB.exec("DELETE FROM guard WHERE gk = 'rl:img-sweep'");
/* `days` pass for one image (its clock moves back) — and so do the sweep's minutes */
export const age = (W, id, days) => { W.env.DB.exec("UPDATE imgown SET ts = ts - " + Math.round(days * DAYMS) + " WHERE img = '" + id.replace(/'/g, "''") + "'"); due(W); };
/* what a refusal looks like from outside: status · body · the headers a caller can compare (the request id and timing are per request by design) */
export const shape = (r) => JSON.stringify({ status: r.status, body: r.j, ct: r.h.get('content-type'), cc: r.h.get('cache-control'), len: r.h.get('content-length') });
export const both = (test, name, fn) => { for (const mode of MODES) test(name + ' [' + mode + ']', { timeout: 600000 }, () => fn(mode)); };
