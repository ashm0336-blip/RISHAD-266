/* Cloud-only replacement of the former device task queue acceptance suite.
   Real profile logic and Worker HTTP, both permission modes. Device bytes stay
   untouched; drafts stay open and only an explicit retry can mutate a task. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT } from './harness.mjs';
import { world, workerUnderTest, ME, KT, DAY, TAG, stored, rowsOf, putKV, HR, PNG } from './tasks_fx.mjs';

const WU = workerUnderTest();
const LOGIC = process.env.PROFILE_LOGIC || path.join(ROOT, 'src/modules/profile/logic.js');
const DM = ['0000000101', '70101'];
function page(W, ck, o = {}) {
  const KIVO = {}, acts = [], puts = [], net = o.net || { down: false, lossy: false }, ls = o.ls || new Map(), onl = [];
  const ctx = { KIVO, console, Intl, Date, Math, JSON, Promise, Object, Array, String, Number, RegExp, Set, Map, Error, TypeError, isNaN, parseInt, encodeURIComponent, decodeURIComponent,
    setTimeout: () => 0, clearTimeout: () => 0, setInterval: () => 0, clearInterval: () => 0,
    localStorage: { getItem: (k) => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)), removeItem: (k) => ls.delete(k) },
    document: { hidden: false, querySelector: () => null }, navigator: { userAgent: 'node', onLine: !net.down } };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.__BS_BOOT = { srv: 1, cf: 1 };
  ctx.CustomEvent = class { constructor(t, q) { this.type = t; this.detail = q && q.detail; } };
  ctx.addEventListener = (t, f) => { if (t === 'online') onl.push(f); }; ctx.dispatchEvent = () => true;
  ctx.fetch = async (url, opt = {}) => {
    const u = String(url);
    if (net.down) throw new ctx.TypeError('Failed to fetch');
    if (/\/api\/me\/tasks\/act$/.test(u) && opt.body) acts.push(JSON.parse(opt.body));
    if (/\/api\/img\//.test(u) && opt.method === 'PUT') puts.push(u.replace(/^.*\/api\/img\//, '').replace(/\?.*$/, ''));
    const r = await W.C.req(u, { method: opt.method || 'GET', cookie: ck, headers: opt.headers, body: opt.body });
    if (net.lossy && /\/api\/me\/tasks\/act$/.test(u)) throw new ctx.TypeError('NetworkError: response lost');
    return { ok: r.status < 300, status: r.status, text: () => r.text(), json: () => r.json() };
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/services/545-task-self.js'), 'utf8'), ctx);
  KIVO.BassamCount = (n, w) => n + ' ' + w;
  class DCLogic { constructor() { this.state = {}; } setState(p) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); } }
  KIVO.BassamPageKit = { base: (Bc) => class extends Bc { bsOn() { return true; } bsToast(m) { (this.__toasts = this.__toasts || []).push(m); } bsAck(m) { (this.__acks = this.__acks || []).push(m); return Promise.resolve(true); } MONTHS() { return '١ ٢ ٣ ٤ ٥ ٦ ٧ ٨ ٩ ١٠ ١١ ١٢'.split(' '); } } };
  ctx.DCLogic = DCLogic;
  vm.runInContext(fs.readFileSync(LOGIC, 'utf8') + '\n;globalThis.__C = Component;', ctx, { filename: 'profile/logic.js' });
  const c = new ctx.__C(); c.state = Object.assign({ pfPanel: '' }, c.state || {}); c._pfAlive = true;
  const setNet = (on) => { net.down = !on; ctx.navigator.onLine = on; if (on) onl.forEach((f) => f()); };
  return { c, MT: KIVO.BassamMyTasks, acts, puts, net, ls, setNet, ctx };
}
const T = { y: +DAY.split('-')[0], m: +DAY.split('-')[1], d: +DAY.split('-')[2] };
const E = { isStaff: true, T, myKey: ME.eid, keyOfTok: (x) => x, myRec: { name: TAG + ' موظف' } };
const V = (P) => JSON.parse(JSON.stringify(P.c._tkVals({}, E, P.c.state), (k, v) => (typeof v === 'function' ? undefined : v)));
const Vf = (P) => P.c._tkVals({}, E, P.c.state);
const post = (W, ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body });
const refOf = (P, id) => P.c._tkMine(E).find((x) => x.r.__x && String(x.r.__x.id) === String(id));
const srvRow = (W, id) => (rowsOf(stored(W.env, KT), ME.eid).find((x) => x.r[13] === id) || {}).r || [];
const own = (W, img) => W.env.DB.q('SELECT st FROM imgown WHERE img = ?', img)[0] || null;
async function until(f, ms = 5000) { const t0 = Date.now(); for (;;) { let v = false; try { v = f(); } catch (e) { v = false; } if (v || Date.now() - t0 > ms) return v; await new Promise((r) => setTimeout(r, 10)); } }
const mkTask = (W, ck, t, extra) => post(W, ck, '/api/tasks/create', Object.assign({ k: DAY, t: TAG + ' ' + t, s: Date.now() - 60e3, e: Date.now() + 2 * HR, asg: [ME.eid], rv: 'none' }, extra || {}));
function wipe(W, eid) { const S = stored(W.env, KT); for (const d in S) S[d] = S[d].filter((r) => !(Array.isArray(r) && r[14] === eid)); putKV(W.env, KT, S); }
const toasts = (P) => P.c.__toasts || [];

for (const mode of ['legacy', 'enforce']) {
  test('[' + mode + '] offline proof keeps the profile fields and image metadata; reconnection and reopening do not submit; explicit retry saves', async () => {
    const W = await world({ worker: WU.file, mode });
    const me = await W.login(ME.un, ME.pw), dm = await W.login(...DM); wipe(W, ME.eid);
    const legacyKey = 'bassam_tkq_v1:me', legacyBytes = JSON.stringify([{ id: 'TEST_ONLY_old', body: { act: 'start' } }]);
    const ls = new Map([[legacyKey, legacyBytes]]), net = { down: false, lossy: false };
    const P = page(W, me.ck, { ls, net }); await P.MT.queue.init();
    const c = await mkTask(W, dm.ck, 'explicit proof'); assert.equal(c.status, 200, JSON.stringify(c.j));
    const id = c.j.rows[0].id; await P.MT.load(true); let R = refOf(P, id);
    P.setNet(false); P.c.tkAck(R.day, R.i);
    assert.ok(await until(() => toasts(P).length === 1)); assert.match(toasts(P)[0], /لم يُحفظ/);
    assert.equal((P.c.__acks || []).length, 0); assert.equal(P.acts.length, 0); assert.equal(P.MT.queue.state().n, 0);
    assert.equal(srvRow(W, id)[11], null); assert.equal(srvRow(W, id)[20], null);
    P.setNet(true); await P.MT.load(true); assert.equal(P.acts.length, 0);
    P.c.tkAck(R.day, R.i); assert.ok(await until(() => srvRow(W, id)[20] && srvRow(W, id)[20].ack));
    P.c.tkAccept(R.day, R.i); assert.ok(await until(() => srvRow(W, id)[11]));
    R = refOf(P, id); P.c.tkFinishOpen(R.day, R.i);
    const meta = [{ at: Date.now() - 1000, lat: 24.7136, lng: 46.6753, acc: 9 }];
    P.c.setState({ tkNote: TAG + ' proof', tkImgs: [PNG], tkMeta: meta }); P.setNet(false);
    const before = toasts(P).length; Vf(P).tkFinGo();
    assert.ok(await until(() => toasts(P).length > before && !P.c.state.tkBusy));
    assert.equal(P.c.state.pfPanel, 'tkfin'); assert.equal(P.c.state.tkImgs[0], PNG); assert.equal(P.c.state.tkNote, TAG + ' proof');
    assert.equal(P.c.state.tkMeta[0].lat, 24.7136); assert.notEqual(srvRow(W, id)[3], 'done');
    assert.equal(P.puts.length, 0); assert.equal(P.acts.length, 2); assert.equal(V(P).tkQOn, false);
    const P2 = page(W, me.ck, { ls, net }); await P2.MT.queue.init(); assert.equal(P2.MT.queue.state().n, 0);
    P2.setNet(true); await P2.MT.load(true); await P2.MT.queue.flush(); assert.equal(P2.acts.length, 0); assert.equal(P2.puts.length, 0);
    assert.equal(ls.get(legacyKey), legacyBytes, 'No silent import or deletion of the retired queue');
    P.setNet(true); assert.equal(P.acts.length, 2); Vf(P).tkFinGo();
    assert.ok(await until(() => srvRow(W, id)[3] === 'done' && !P.c.state.tkBusy));
    assert.deepEqual(P.acts.map(b => b.act), ['ack', 'start', 'submit']); assert.equal(P.puts.length, 1);
    const r = srvRow(W, id), imgId = P.puts[0];
    assert.deepEqual(r[21].imgs, [imgId]); assert.equal(r[21].meta[0].lat, 24.7136); assert.equal(r[21].note, TAG + ' proof');
    assert.equal(own(W, imgId).st, 'bound'); assert.equal(r[20].q.length, 3); assert.deepEqual(r[20].q, P.acts.map(b => b.idem));
    assert.equal(P.c.state.pfPanel, ''); assert.equal(P.MT.queue.state().n, 0); assert.equal(ls.get(legacyKey), legacyBytes);
  });

  test('[' + mode + '] a cancelled task is refused on explicit retry; reconnect and reads never retry it; another task remains independent', async () => {
    const W = await world({ worker: WU.file, mode });
    const me = await W.login(ME.un, ME.pw), dm = await W.login(...DM); wipe(W, ME.eid);
    const P = page(W, me.ck), a = await mkTask(W, dm.ck, 'cancelled'), b = await mkTask(W, dm.ck, 'independent');
    const idA = a.j.rows[0].id, idB = b.j.rows[0].id; await P.MT.load(true);
    const R = refOf(P, idA); P.setNet(false); P.c.tkAccept(R.day, R.i); assert.ok(await until(() => toasts(P).length === 1));
    const cx = await post(W, dm.ck, '/api/tasks/cancel', { k: DAY, id: idA, why: TAG + ' cancel' }); assert.equal(cx.status, 200, JSON.stringify(cx.j));
    P.setNet(true); assert.equal(P.acts.length, 0);
    const refused = await P.MT.act(R.r.__x, 'start'); assert.equal(refused.ok, false); assert.equal(refused.err, 'state'); assert.match(refused.msg, /أُلغيت/);
    const B = refOf(P, idB), saved = await P.MT.act(B.r.__x, 'ack'); assert.equal(saved.ok, true);
    assert.ok(srvRow(W, idB)[20].ack); assert.equal(srvRow(W, idA)[11], null);
    P.setNet(true); await P.MT.load(true); await P.MT.queue.flush();
    assert.equal(P.acts.filter(q => q.id === idA).length, 1); assert.equal(P.acts.length, 2); assert.equal(V(P).tkQOn, false);
  });

  test('[' + mode + '] a lost response retries with the same idem only explicitly; duplicate noop and invalid idem still obey the real server', async () => {
    const W = await world({ worker: WU.file, mode });
    const me = await W.login(ME.un, ME.pw), dm = await W.login(...DM); wipe(W, ME.eid);
    const net = { down: false, lossy: false }, P = page(W, me.ck, { net });
    const c = await mkTask(W, dm.ck, 'lost response'), id = c.j.rows[0].id; await P.MT.load(true);
    net.lossy = true; const R = refOf(P, id); P.c.tkAccept(R.day, R.i);
    assert.ok(await until(() => toasts(P).length === 1)); assert.match(toasts(P)[0], /لم يُحفظ/);
    const t0 = srvRow(W, id)[11]; assert.ok(t0); assert.equal(P.acts.length, 1);
    const idem = P.acts[0].idem; assert.match(idem, /^q[a-z0-9]+_[a-z0-9]+$/);
    net.lossy = false; P.setNet(true); await P.MT.load(true); await P.MT.queue.flush(); assert.equal(P.acts.length, 1);
    const retried = await P.MT.act(R.r.__x, 'start'); assert.equal(retried.ok, true); assert.equal(retried.noop, true);
    assert.equal(P.acts.length, 2); assert.equal(P.acts[1].idem, idem); assert.equal(srvRow(W, id)[11], t0); assert.deepEqual(srvRow(W, id)[20].q, [idem]);
    let x = await post(W, me.ck, '/api/me/tasks/act', { k: DAY, id, act: 'start', idem });
    assert.equal(x.status, 200); assert.equal(x.j.noop, 1); assert.equal(srvRow(W, id)[11], t0);
    x = await post(W, me.ck, '/api/me/tasks/act', { k: DAY, id, act: 'start', idem: 'q2' }); assert.equal(x.status, 400); assert.equal(x.j.at, 'idem');
    x = await post(W, me.ck, '/api/me/tasks/act', { k: DAY, id, act: 'start', idem: 'a'.repeat(41) }); assert.equal(x.status, 400);
    x = await post(W, me.ck, '/api/me/tasks/act', { k: DAY, id, act: 'start' }); assert.equal(x.status, 409);
    P.setNet(false); P.c.tkDeclineOpen(R.day, R.i, 'stall'); P.c.setState({ tkWhy: 'ظرف طارئ' }); P.c.tkDecline();
    assert.ok(await until(() => toasts(P).length === 2)); assert.equal(P.acts.length, 2); assert.equal(P.c.state.pfPanel, 'tkdec'); assert.equal(P.c.state.tkWhy, 'ظرف طارئ');
    P.setNet(true); assert.equal(P.acts.length, 2); P.c.tkDecline(); assert.ok(await until(() => srvRow(W, id)[20].stall));
    assert.equal(srvRow(W, id)[20].stall.why, 'ظرف طارئ'); assert.equal(P.c.state.pfPanel, '');
  });
}
