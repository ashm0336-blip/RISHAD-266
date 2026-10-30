/* Notification ACK and browser-state checks against the actual 441/442 implementation. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { parse } from 'acorn';
import { ROOT } from './harness.mjs';
import { world, IDS, EKEYS, D1 } from './notifications_review_fx.mjs';

const copy = value => JSON.parse(JSON.stringify(value));
const record = () => ({ id: 'nf:TEST_ONLY_message', type: 'task_new', k: 'task', t: 'TEST_ONLY title', b: 'TEST_ONLY body', at: Date.now() - 10, un: true, acked: false, TEST_ONLY_nested: { values: ['TEST_ONLY_value'] }, dept: 'TEST_ONLY_department' });
const feed = (rev = 1, items = [record()]) => ({ ok: 1, rev, configRev: rev, broadcastRev: rev, items, unread: items.filter(x => x.un).length, counters: { total: items.length, unread: items.filter(x => x.un).length, actionable: 0, urgentUnread: 0, pendingAck: 0, unreadAll: items.filter(x => x.un).length, byKind: { task: items.length } }, next: '', cfg: { t: {} }, broadcasts: [], stats: {}, bcNext: '', bcTotal: 0 });
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const tick = () => new Promise(resolve => setImmediate(resolve));
function browser(transport, role = 'staff', identity = {}) {
  const calls = [], persistence = [], events = [], warnings = [], timers = new Map(), listeners = new Map();
  let timer = 0, user = { id: 'TEST_ONLY_uid', ekey: 'TEST_ONLY_ekey', role, deptId: 'TEST_ONLY_department', name: 'TEST_ONLY actor', ...identity }, department = user.deptId || 'TEST_ONLY_department';
  class Storage {
    constructor() { this.data = new Map(); }
    getItem(key) { persistence.push(['get', key]); if (/bassam_(notif_v1|notif_sys_v1|bc_v1|notif_cfg_v1)$/.test(key)) throw new Error('Retired business storage must never be read'); return this.data.get(key) ?? null; }
    setItem(key, value) { persistence.push(['set', key]); if (/bassam_(notif_v1|notif_sys_v1|bc_v1|notif_cfg_v1)$/.test(key)) throw new Error('Retired business storage must never be written'); this.data.set(key, String(value)); }
  }
  const KIVO = {
    BassamAuth: { user: () => user, users: () => [user] },
    BassamDepts: { active: () => department, list: () => [{ id: department, name: 'TEST_ONLY department' }], raw: { allKeys: () => [] } },
    BassamPerm: { can: () => true, on: () => true },
  };
  const ctx = { KIVO, Storage, localStorage: new Storage(), __BS_BOOT: { srv: 1, cf: 1, uid: user.id },
    Response, Request, URL, URLSearchParams, AbortController, TextEncoder, TextDecoder,
    console: { log() {}, warn: (...args) => warnings.push(args), error() {} }, navigator: { userAgent: 'TEST_ONLY browser' },
    setTimeout: (fn, ms) => { timers.set(++timer, { fn, ms }); return timer; }, clearTimeout: id => timers.delete(id), setInterval: () => 0,
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
    addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name),
    dispatchEvent: event => { events.push({ type: event.type, detail: event.detail }); listeners.get(event.type)?.(event); return true; },
    document: { addEventListener() {} }, window: null,
  };
  ctx.window = ctx;
  ctx.fetch = async (url, options = {}) => { calls.push({ url, ...options }); return await transport(url, options); };
  vm.createContext(ctx);
  for (const file of ['441-notif-core.js', '442-notif-observer.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/services', file), 'utf8'), ctx, { filename: file });
  return { N: KIVO.BassamNotif, ctx, calls, persistence, events, warnings,
    switchUser(id) { user = { ...user, id }; ctx.__BS_BOOT.uid = id; },
    switchDepartment(id) { department = id; },
    async flushEvents() { for (const [id, t] of [...timers]) if (t.ms === 0) { timers.delete(id); await t.fn(); } },
  };
}

let adminAst;
function adminMethod(name, context) {
  if (!adminAst) { const source = fs.readFileSync(path.join(ROOT, 'src/modules/admin/logic.js'), 'utf8'); adminAst = { source, tree: parse(source, { ecmaVersion: 'latest', sourceType: 'script' }) }; }
  let method;
  const visit = node => {
    if (!node || typeof node !== 'object' || method) return;
    if (node.type === 'MethodDefinition' && node.key.name === name) { method = node; return; }
    for (const value of Object.values(node)) { if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value); }
  };
  visit(adminAst.tree); assert.ok(method, 'The actual admin method exists: ' + name);
  return vm.runInContext('({' + adminAst.source.slice(method.start, method.end) + '}).' + name, context);
}
function settingsPage(B) {
  const acknowledgements = [], errors = [];
  const page = { state: { nfDraft: null, nfDraftBase: null, plDraft: null },
    setState(update) { this.state = { ...this.state, ...(typeof update === 'function' ? update(this.state) : update) }; },
    bsAck: text => acknowledgements.push(text), bsToast: text => errors.push(text), plP: () => ({}) };
  for (const name of ['nfN', 'nfDraftAll', 'nfDirtyIds', 'nfSet', 'nfSave', 'plSave']) page[name] = adminMethod(name, B.ctx);
  return { page, acknowledgements, errors };
}

test('notification public reads cannot mutate the authoritative in-memory cache', async () => {
  const authoritative = feed(); authoritative.broadcasts = [{ id: 'TEST_ONLY_bc', title: 'TEST_ONLY', target: { mode: 'dept', sel: ['TEST_ONLY_department'] } }];
  const B = browser(async () => response(authoritative), 'super'); assert.equal((await B.N.refresh()).ok, 1); assert.equal((await B.N.refreshManagement()).ok, 1);
  const exposed = B.N.list({ all: true }); exposed[0].un = false; exposed[0].TEST_ONLY_nested.values.push('TEST_ONLY_forged_value');
  assert.equal(B.N.list({ all: true })[0].un, true, 'A render consumer must not mark a notification read without server acknowledgement');
  assert.deepEqual(copy(B.N.list({ all: true })[0].TEST_ONLY_nested.values), ['TEST_ONLY_value']);
  B.N.bcAll()[0].target.sel.push('TEST_ONLY_other_department');
  assert.deepEqual(copy(B.N.bcAll()[0].target.sel), ['TEST_ONLY_department']);
  assert.deepEqual(B.persistence, []);
});

test('malformed, rejected, older and disconnected mutation acknowledgements leave read state unchanged', async () => {
  const invalid = [
    () => response({}), () => response({ ok: true, rev: 5 }), () => response({ ok: 1, rev: '5' }),
    () => response({ ok: 1, rev: 3 }), () => response({ ok: 0, err: 'denied' }, 403),
    () => { throw new TypeError('TEST_ONLY offline'); }
  ];
  for (const bad of invalid) {
    const B = browser(async (url, opts) => opts.method === 'POST' ? bad() : response(feed(4)));
    await B.N.refresh(); const before = copy(B.N.list());
    const outcome = await B.N.markRead(before[0].id);
    assert.equal(outcome.ok, 0); assert.deepEqual(copy(B.N.list()), before); assert.equal(B.N.status().rev, 4);
    assert.ok(B.events.some(event => event.type === 'bassam:notif-error')); assert.deepEqual(B.persistence, []);
  }
});

test('read state changes only after a real mutation ACK and a complete authoritative refresh', async () => {
  let settle, acknowledged = false;
  const initial = feed(7);
  const B = browser(async (url, opts) => {
    if (opts.method === 'POST') return await new Promise(resolve => { settle = resolve; });
    const fresh = copy(initial); if (acknowledged) { fresh.rev = 8; fresh.items[0].un = false; }
    return response(fresh);
  });
  await B.N.refresh(); const pending = B.N.markRead(initial.items[0].id);
  assert.equal(B.N.list()[0].un, true); assert.equal(B.N.status().rev, 7);
  acknowledged = true; settle(response({ ok: 1, rev: 8 }));
  assert.equal((await pending).ok, 1); assert.equal(B.N.list()[0].un, false); assert.equal(B.N.status().rev, 8);
  assert.deepEqual(B.persistence, []);
});

test('an identity or department switch rejects an in-flight ACK and clears the previous identity cache', async () => {
  for (const change of ['identity', 'department']) {
    let settle;
    const B = browser(async (url, opts) => opts.method === 'POST' ? await new Promise(resolve => { settle = resolve; }) : response(feed(2)));
    await B.N.refresh(); const pending = B.N.ack(B.N.list()[0].id);
    if (change === 'identity') B.switchUser('TEST_ONLY_other_uid'); else B.switchDepartment('TEST_ONLY_other_department');
    settle(response({ ok: 1, rev: 3 }));
    assert.equal((await pending).ok, 0, change); assert.deepEqual(copy(B.N.list()), []); assert.equal(B.N.status().ready, false);
    assert.deepEqual(B.persistence, []);
  }
});

test('a late old refresh cannot erase a subsequently acknowledged read state', async () => {
  let reads = 0, oldRead, write;
  const initial = feed(1), fresh = copy(initial); fresh.rev = 2; fresh.items[0].un = false;
  const B = browser(async (url, opts) => {
    if (opts.method === 'POST') return await new Promise(resolve => { write = resolve; });
    if (++reads === 1) return response(initial);
    if (reads === 2) return await new Promise(resolve => { oldRead = resolve; });
    return response(fresh);
  });
  await B.N.refresh(); const reading = B.N.refresh(), marking = B.N.markRead(initial.items[0].id);
  write(response({ ok: 1, rev: 2 })); assert.equal((await marking).ok, 1);
  oldRead(response(initial)); await reading;
  assert.equal(B.N.status().rev, 2); assert.equal(B.N.list()[0].un, false); assert.deepEqual(B.persistence, []);
});

test('history is fetched only on demand, and an inconsistent or malformed next page keeps the accepted page', async () => {
  for (const bad of ['mixed revision', 'duplicate id', 'malformed item']) {
    let reads = 0;
    const original = feed(1), page1 = feed(2), page2 = feed(2, [{ ...record(), id: 'nf:TEST_ONLY_second' }]); page1.next = '2:1';
    if (bad === 'mixed revision') page2.rev = 3;
    if (bad === 'duplicate id') page2.items[0].id = page1.items[0].id;
    if (bad === 'malformed item') delete page2.items[0].t;
    const B = browser(async () => response(++reads === 1 ? original : reads === 2 ? page1 : page2));
    await B.N.refresh(); assert.equal((await B.N.refresh()).ok, 1); assert.equal(reads, 2, 'Refresh loads exactly one page');
    const before = copy(B.N.list());
    assert.equal((await B.N.loadMore()).ok, 0, bad); assert.deepEqual(copy(B.N.list()), before, bad); assert.equal(B.N.status().rev, 2);
  }
});

test('observer emission failures resolve and report an error without persisting a seen or notification document', async () => {
  const B = browser(async (url, opts) => { if (opts.method === 'POST') throw new TypeError('TEST_ONLY disconnected observer'); return response(feed(1, [])); });
  await B.N.refresh(); const pending = B.N.emit('task_new', { dept: 'TEST_ONLY_department', own: ['TEST_ONLY_ekey'], once: 'TEST_ONLY_event' });
  await B.flushEvents(); const outcome = await pending; await tick();
  assert.equal(outcome.ok, 0); assert.deepEqual(copy(B.N.list()), []);
  assert.ok(B.events.some(event => event.type === 'bassam:notif-error')); assert.deepEqual(B.persistence, []);
});

test('actual admin settings keep their captured draft base and draft when the server rejects an old revision', async () => {
  let reads = 0, settle;
  const B = browser(async (url, opts) => opts.method === 'POST' ? await new Promise(resolve => { settle = resolve; }) : response(feed(++reads === 1 ? 4 : 5)), 'super');
  await B.N.refresh(); const { page, acknowledgements, errors } = settingsPage(B);
  page.nfSet('task_new', { on: false }); const original = page.state.nfDraft;
  assert.equal(page.state.nfDraftBase, 4);
  await B.N.refresh(); assert.equal(B.N.status().rev, 5);
  const saving = page.plSave();
  const sent = JSON.parse(B.calls.at(-1).body);
  assert.equal(sent.base, 4, 'Polling must not silently rebase an already edited settings draft');
  assert.equal(page.state.nfDraft, original); assert.equal(acknowledgements.length, 0);
  settle(response({ ok: 0, err: 'conflict' }, 409)); await saving;
  assert.equal(page.state.nfDraft, original); assert.equal(page.state.nfDraftBase, 4);
  assert.equal(acknowledgements.length, 0); assert.equal(errors.length, 1); assert.deepEqual(B.persistence, []);
});

test('actual admin settings clear only the exact submitted draft after a complete ACK', async () => {
  for (const editedWhileSaving of [false, true]) {
    let settle, approved = false;
    const B = browser(async (url, opts) => {
      if (opts.method === 'POST') return await new Promise(resolve => { settle = resolve; });
      const state = feed(approved ? 3 : 2); if (approved) state.cfg.t.task_new = { on: false }; return response(state);
    }, 'super');
    await B.N.refresh(); const { page, acknowledgements } = settingsPage(B);
    page.nfSet('task_new', { on: false }); const saving = page.plSave();
    assert.ok(page.state.nfDraft); assert.equal(acknowledgements.length, 0);
    if (editedWhileSaving) page.nfSet('task_new', { txt: 'TEST_ONLY later edit' });
    const atAck = page.state.nfDraft;
    approved = true; settle(response({ ok: 1, rev: 3, configRev: 3 })); await saving;
    if (editedWhileSaving) { assert.equal(page.state.nfDraft, atAck); assert.equal(page.state.nfDraft.task_new.txt, 'TEST_ONLY later edit'); }
    else assert.equal(page.state.nfDraft, null);
    assert.equal(acknowledgements.length, 1); assert.deepEqual(B.persistence, []);
  }
});

test('message feed changes do not change the captured configuration resource revision', async () => {
  let reads = 0, approved = false, sent;
  const B = browser(async (url, opts) => {
    if (opts.method === 'POST') { sent = JSON.parse(opts.body); approved = true; return response({ ok: 1, rev: 12, configRev: 4 }); }
    const state = feed(approved ? 12 : ++reads === 1 ? 10 : 11); state.configRev = approved ? 4 : 3; state.broadcastRev = 2;
    if (approved) state.cfg.t.task_new = { on: false }; return response(state);
  }, 'super');
  await B.N.refresh(); const { page } = settingsPage(B); page.nfSet('task_new', { on: false });
  assert.equal(page.state.nfDraftBase, 3);
  await B.N.refresh(); assert.equal(B.N.status().rev, 11); assert.equal(B.N.status().configRev, 3);
  const outcome = await page.nfSave(); assert.equal(outcome.ok, 1); assert.equal(sent.base, 3); assert.equal(page.state.nfDraft, null);
});

test('configuration and broadcast receipts require their complete resource-specific acknowledgement', async () => {
  for (const ack of [{ ok: 1, rev: 5 }, { ok: 1, rev: 5, configRev: '5' }, { ok: 1, rev: 5, configRev: 3 }]) {
    const B = browser(async (url, opts) => opts.method === 'POST' ? response(ack) : response(feed(4)), 'super');
    await B.N.refresh(); const { page, acknowledgements } = settingsPage(B); page.nfSet('task_new', { on: false }); const draft = page.state.nfDraft;
    await page.plSave(); assert.equal(page.state.nfDraft, draft); assert.equal(acknowledgements.length, 0);
  }
  for (const ack of [{ ok: 1, rev: 5, broadcastRev: 5 }, { ok: 1, rev: 5, broadcastRev: 5, id: '', n: 2 }, { ok: 1, rev: 5, broadcastRev: 5, id: 'TEST_ONLY_id', n: -1 }]) {
    const B = browser(async (url, opts) => opts.method === 'POST' ? response(ack) : response(feed(4)), 'super');
    await B.N.refresh(); const outcome = await B.N.bcSend({ title: 'TEST_ONLY draft', body: 'TEST_ONLY draft body' });
    assert.equal(outcome.ok, 0, 'An incomplete broadcast receipt must not acknowledge or clear its editor'); assert.deepEqual(B.persistence, []);
  }
});

test('server session revocation clears the cached notification payload and resource revisions', async () => {
  const B = browser(async (url, opts) => opts.method === 'POST' ? response({ ok: 0, err: 'session' }, 401) : response(feed(4)));
  await B.N.refresh(); assert.equal(B.N.list().length, 1);
  assert.equal((await B.N.markRead(B.N.list()[0].id)).ok, 0);
  assert.deepEqual(copy(B.N.list()), []); assert.equal(B.N.status().ready, false); assert.equal(B.N.status().rev, null);
  assert.equal(B.N.status().configRev, null); assert.equal(B.N.status().broadcastRev, null); assert.deepEqual(B.persistence, []);
});

test('the real notification client accepts the canonical API and confirms a read without a fixture-only contract', async () => {
  const W = await world();
  const event = await W.act('manager1', { op: 'emit', type: 'task_new', dept: D1, own: [EKEYS.employee1], title: 'TEST_ONLY integration', vars: {} });
  assert.equal(event.status, 200); assert.equal(event.json.ok, 1);
  const B = browser(async (url, opts) => {
    const result = await W.api('employee1', url, { method: opts.method || 'GET', ...(opts.body ? { body: JSON.parse(opts.body) } : {}) });
    return response(result.json, result.status);
  }, 'staff', W.users.find(user => user.id === IDS.employee1));
  assert.equal((await B.N.refresh()).ok, 1, 'An actual API response satisfies the client contract');
  const item = B.N.list().find(item => item.id === event.json.id); assert.ok(item); assert.equal(item.un, true);
  assert.equal((await B.N.markRead(item.id)).ok, 1); assert.equal(B.N.list().find(candidate => candidate.id === item.id).un, false);
  assert.equal(B.N.status().counters.unread, 0); assert.deepEqual(B.persistence, []);
});

test('polling an expanded history requests only a summary and preserves history until an explicit refresh', async () => {
  let page = 0;
  const B = browser(async url => {
    if (url.includes('summary=1')) { const value = feed(2, []); value.counters.total = 3; return response(value); }
    const value = feed(page++ > 1 ? 2 : 1, [{ ...record(), id: 'nf:TEST_ONLY_page_' + page }]); value.next = page === 1 ? 'TEST_ONLY_next' : ''; return response(value);
  });
  assert.equal((await B.N.refresh()).ok, 1); assert.equal((await B.N.loadMore()).ok, 1);
  const accepted = copy(B.N.list()), requests = B.calls.length; assert.equal(accepted.length, 2);
  assert.equal((await B.N.bcDue()).ok, 1); assert.equal(B.calls.length, requests + 1); assert.match(B.calls.at(-1).url, /summary=1/);
  assert.deepEqual(copy(B.N.list()), accepted); assert.equal(B.N.status().rev, 1); assert.equal(B.N.status().hasUpdates, true); assert.equal(B.N.status().counters.total, 3);
  assert.equal((await B.N.refresh()).ok, 1); assert.equal(B.N.list().length, 1); assert.equal(B.N.status().hasUpdates, false); assert.equal(B.N.status().rev, 2); assert.deepEqual(B.persistence, []);
});
