import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { parse } from '../../node_modules/acorn/dist/acorn.mjs';
import { world, ok, OPTIONS, snap, phase5AppBackup } from './atomic_restore_review_fx.mjs';
import { D1, IDS, copy } from './notifications_review_fx.mjs';
import { SRC } from './harness.mjs';
import { currentOperationResources } from './backup_review_fx.mjs';
const CLIENT = SRC;
function sourcePart(file, type, name, root = CLIENT) {
  const source = fs.readFileSync(path.join(root, file), 'utf8'),
    tree = parse(source, { ecmaVersion: 'latest', sourceType: 'script' });
  let found;
  function visit(o) {
    if (!o || typeof o !== 'object') return;
    if (o.type === type && (o.key?.name || o.id?.name) === name) {
      found = o;
      return;
    }
    Object.values(o).forEach((v) => (Array.isArray(v) ? v.forEach(visit) : visit(v)));
  }
  visit(tree);
  assert.ok(found, name);
  return source.slice(found.start, found.end);
}
async function browser(B) {
  const requests = [],
    writes = [],
    toasts = [],
    data = ok(await B.api('super', '/api/get?keys=' + encodeURIComponent(Object.keys(B.keys).concat([OPTIONS]).join(',')))),
    storage = new Map(
      Object.entries(data.keys)
        .filter(([k, r]) => r.v !== null)
        .map(([k, r]) => [k, r.v]),
    ),
    KIVO = {
      BassamAuth: { user: () => B.users.find((u) => u.id === IDS.super), isSuper: () => true },
      BassamDepts: {
        active: () => D1,
        activeName: () => 'TEST_ONLY department',
        list: () => B.keys.bassam_depts_v1,
        allScopedKeys: () => Array.from(storage.keys()).filter((k) => k.startsWith('bsdept:')),
        keysOf: (d) => Array.from(storage.keys()).filter((k) => k.startsWith('bsdept:' + d + ':')),
        raw: {
          getItem: (k) => storage.get(k) ?? null,
          setItem: () => {
            writes.push('set');
            throw Error('No local overlay');
          },
          removeItem: () => {
            writes.push('del');
            throw Error('No local overlay');
          },
        },
      },
      BassamCrypt: { ok: () => true },
      BassamIDB: { allForBackup: async () => ({}) },
      DailyStats: {
        refresh: async () => (await B.W.dsDomainRead(B.env)).data,
        revision: () => B.DB.q('SELECT rev FROM revs WHERE k=?1', 'bassam_dstats_v1')[0]?.rev || 0,
      },
      BassamNotif: {
        exportDomain: async (dept) => ok(await B.api('super', '/api/notifications/export' + (dept ? '?dept=' + dept : ''))),
        refresh: async () => ({ ok: 1 }),
      },
      Custody: { exportDomain: async (dept) => ok(await B.api('super', '/api/custody/export' + (dept ? '?dept=' + dept : ''))) },
      __BS_SRV: { askReason: (k, keys, cb) => cb('TEST_ONLY actual user reason'), resync: async () => ({ ok: 1 }),
        dirty: () => false, inflight: () => false, sesChanged: () => false, rev: key => data.keys[key]?.rev || 0,
        operations: { resources: currentOperationResources() } },   /* schema 10: the actual Operations resource registry (280) */
      bsConfirm: async () => true,
    },
    page = {
      state: {},
      setState(v) {
        Object.assign(this.state, v);
      },
      bkToast: (...args) => toasts.push(args),
    };
  let intercept, exportBlob;
  const fetch = async (url, options = {}) => {
    const request = { url: String(url), method: options.method || 'GET', body: options.body };
    requests.push(request);
    const headers = new Headers(options.headers || {});
    headers.set('Cookie', 'bs_tok=TEST_ONLY_session_super');
    if (request.method !== 'GET') headers.set('Origin', 'http://x');
    const response = await B.W.default.fetch(new Request('http://x' + url, { ...options, headers }), B.env);
    const dto = await response.clone().json();
    request.status = response.status;
    request.err = dto.err;
    return intercept ? await intercept(request, response) : response;
  };
  const context = vm.createContext({
    KIVO,
    window: { __BS_BOOT: { srv: 1, cf: 1, uid: IDS.super, v: data.v }, crypto: webcrypto, confirm: () => true },
    localStorage: {},
    URL: { createObjectURL: (blob) => ((exportBlob = blob), 'TEST_ONLY_blob'), revokeObjectURL() {} },
    document: { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } },
    fetch,
    AbortController,
    setTimeout,
    clearTimeout,
    Uint8Array,
    URLSearchParams,
    Blob,
    Date,
    FileReader: class {
      readAsText(file) {
        this.result = JSON.stringify(file);
        this.onload();
      }
    },
  });
  vm.runInContext(fs.readFileSync(path.join(CLIENT, 'services/548-atomic-backup.js'), 'utf8'), context);
  for (const helper of ['_wpActor', '_irBackupCapture', '_irBackupFence'])
    page[helper] = vm.runInContext('({' + sourcePart('modules/admin/logic.js', 'MethodDefinition', helper) + '}).' + helper, context);
  return {
    KIVO,
    context,
    page,
    requests,
    writes,
    toasts,
    exportedBlob: () => exportBlob,
    intercept(fn) {
      intercept = fn;
    },
    method(file, name) {
      return vm.runInContext('({' + sourcePart(file, 'MethodDefinition', name) + '}).' + name, context);
    },
    property(file, name) {
      return vm.runInContext('(function(){const s=true;return {' + sourcePart(file, 'Property', name) + '};})', context).call(page)[name];
    },
  };
}
async function exported(B, C) {
  const exportBackup = C.property('modules/admin/logic.js', 'exportBackup');
  exportBackup.call(C.page);
  /* time-bounded: the export awaits real WebCrypto work, so a fixed tick count is load-dependent */
  for (let n = 0, end = Date.now() + 20000; (n < 100 || Date.now() < end) && !C.page._encPend; n++) await new Promise((r) => setImmediate(r));
  assert.ok(C.page._encPend, JSON.stringify(C.page.state));
  const file = JSON.parse(C.page._encPend.json);
  assert.equal(file.manifest.version, 4);   /* schema 10: manifest v4 carries the typed operations domain */
  assert.equal(file.manifest.domains.irshad, 1);
  assert.equal(file.manifest.domains.operations, 1);
  assert.deepEqual(file.domains.irshad.map(d => d.scope.departmentId).sort(), file.manifest.departments.slice().sort());
  assert.deepEqual(file.domains.operations.map(d => d.scope.departmentId + ':' + d.resource).sort(), file.manifest.departments.flatMap(d => currentOperationResources().map(r => d + ':' + r)).sort());
  assert.ok(C.requests.some(request => request.url.startsWith('/api/operations/export?') && request.status === 200), 'Typed operations must come from the actual canonical HTTP export');
  assert.ok(C.requests.some(request => request.url.startsWith('/api/irshad/export?') && request.status === 200), 'Typed Irshad must come from the actual canonical HTTP export');
  assert.equal(/p[12]\$/.test(file.data.bassam_auth_users_v1), false);
  return file;
}
test('actual full export → importBackup → fbkCommit uses one shared atomic restore writer and no local overlay', async () => {
  const B = await world();
  await B.DB.batch(B.W.kvPutStmts(B.env, 'kv', OPTIONS, '{"TEST_ONLY":"backup value"}'));
  const C = await browser(B),
    file = await exported(B, C);
  await B.DB.batch([
    ...B.W.kvPutStmts(B.env, 'kv', OPTIONS, '{"TEST_ONLY":"newer target"}'),
    B.DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,2) ON CONFLICT(k) DO UPDATE SET rev=2').bind(OPTIONS),
    B.DB.prepare("UPDATE meta SET v='2' WHERE k='rev'"),
  ]);
  C.property('modules/admin/logic.js', 'importBackup')({ target: { files: [file], value: 'file' } });
  assert.ok(C.page._fbkPend);
  C.KIVO.bsConfirm = async () => {
    assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n, 0, 'Inspection and confirmation precede the only mutation');
    return true;
  };
  await C.method('modules/admin/logic.js', 'fbkCommit').call(C.page, 'replace');
  assert.equal(C.page._fbkPend, null, JSON.stringify(C.page.state));
  assert.equal(B.DB.q('SELECT v FROM kv WHERE k=?1', OPTIONS)[0].v, '{"TEST_ONLY":"backup value"}');
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n, 1);
  assert.deepEqual(C.writes, []);
  const commits = C.requests.filter((r) => r.method === 'POST' && JSON.parse(r.body).phase === 'commit');
  assert.equal(commits.length, 1);
  assert.equal(
    C.requests.some((r) => r.url.includes('/api/img')),
    false,
  );
});
test('lost restore ACK keeps file/ticket and retries byte-identical body/requestId without resending inspection', async () => {
  const B = await world(),
    C = await browser(B),
    file = await exported(B, C);
  C.property('modules/admin/logic.js', 'importBackup')({ target: { files: [file], value: '' } });
  let lost = false;
  C.intercept(async (request, response) => {
    if (!lost && request.method === 'POST' && JSON.parse(request.body).phase === 'commit') {
      lost = true;
      throw Error('TEST_ONLY response lost after commit');
    }
    return response;
  });
  const commit = C.method('modules/admin/logic.js', 'fbkCommit');
  await commit.call(C.page, 'replace');
  const pending = C.page._fbkPend;
  assert.ok(pending?.ticket, JSON.stringify({ state: C.page.state, requests: C.requests.map((r) => ({ status: r.status, err: r.err })) }));
  assert.equal(pending.uncertain, true);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n, 1);
  await commit.call(C.page, 'replace');
  assert.equal(C.page._fbkPend, null);
  const commits = C.requests.filter((r) => r.method === 'POST' && JSON.parse(r.body).phase === 'commit');
  assert.equal(commits.length, 2);
  assert.equal(commits[0].body, commits[1].body);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n, 1);
  assert.deepEqual(C.writes, []);
});
test('malformed restore success ACK and known conflict retain drafts and never display success', async () => {
  for (const malformed of [true, false]) {
    const B = await world(),
      C = await browser(B),
      file = await exported(B, C);
    C.property('modules/admin/logic.js', 'importBackup')({ target: { files: [file], value: '' } });
    C.intercept(async (request, response) => {
      if (request.method === 'POST' && JSON.parse(request.body).phase === 'commit') {
        if (malformed) {
          const data = await response.json();
          delete data.revs;
          return new Response(JSON.stringify(data), { status: 200 });
        }
        return new Response(JSON.stringify({ ok: 0, err: 'conflict' }), { status: 409 });
      }
      return response;
    });
    await C.method('modules/admin/logic.js', 'fbkCommit').call(C.page, 'replace');
    assert.ok(C.page._fbkPend);
    assert.notEqual(C.page.state.backupMsg, 'اكتملت الاستعادة وأُنشئت لقطة ما قبلها على الخادم');
    assert.deepEqual(C.writes, []);
    if (malformed) {
      assert.ok(
        C.page._fbkPend.ticket,
        JSON.stringify({ state: C.page.state, requests: C.requests.map((r) => ({ status: r.status, err: r.err })) }),
      );
      assert.equal(C.page._fbkPend.uncertain, true);
    } else assert.equal(C.page._fbkPend.ticket, null);
  }
});
test('authenticated 335 restore delegates to the same service; an unauthenticated gate never mutates local or remote data', async () => {
  const B = await world(),
    C = await browser(B),
    file = await exported(B, C),
    method = vm.runInContext('(' + sourcePart('auth/335-identity-gate.js', 'FunctionDeclaration', 'doRestore') + ')', C.context),
    messages = [];
  await method(file, (message) => messages.push(message), { setAttribute() {} });
  assert.match(messages.at(-1), /اكتملت/, JSON.stringify({ requests: C.requests.map((r) => ({ status: r.status, err: r.err })) }));
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n, 1);
  C.KIVO.BassamAuth.user = () => null;
  const before = snap(B.DB),
    requests = C.requests.length;
  await method(file, (message) => messages.push(message), { setAttribute() {} });
  assert.match(messages.at(-1), /سجّل الدخول/);
  assert.equal(C.requests.length, requests);
  assert.deepEqual(snap(B.DB), before);
  assert.deepEqual(C.writes, []);
});

test('actual department exporter → bkImportFile/bkCommit replaces only its declared scope through shared HTTP', async () => {
  const B = await world();
  await B.DB.batch(B.W.kvPutStmts(B.env, 'kv', OPTIONS, '{"TEST_ONLY":"department archive"}'));
  const C = await browser(B);
  let done = false;
  C.method('layouts/root-logic.js', 'bkExportRun').call(C.page, {
    preImport: true,
    cb() {
      done = true;
    },
  });
  for (let n = 0, end = Date.now() + 20000; (n < 100 || Date.now() < end) && !done; n++) await new Promise((r) => setImmediate(r));   /* time-bounded: real WebCrypto work */
  assert.equal(done, true);
  const file = JSON.parse(await C.exportedBlob().text());
  assert.equal(file.manifest.scope, 'dept');
  await B.DB.batch([
    ...B.W.kvPutStmts(B.env, 'kv', OPTIONS, '{"TEST_ONLY":"target change"}'),
    B.DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,3) ON CONFLICT(k) DO UPDATE SET rev=3').bind(OPTIONS),
  ]);
  C.method('layouts/root-logic.js', 'bkImportFile').call(C.page, file, D1);
  assert.ok(C.page._bkPend);
  await C.method('layouts/root-logic.js', 'bkCommit').call(C.page, 'replace');
  assert.equal(C.page._bkPend, null, JSON.stringify(C.toasts));
  assert.equal(B.DB.q('SELECT v FROM kv WHERE k=?1', OPTIONS)[0].v, '{"TEST_ONLY":"department archive"}');
  assert.deepEqual(C.writes, []);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n, 1);
});

test('uncertain restore blocks cancelling, replacing a file or switching mode until the original receipt is confirmed', async () => {
  const B = await world(),
    C = await browser(B),
    file = await exported(B, C);
  C.property('modules/admin/logic.js', 'importBackup')({ target: { files: [file] } });
  C.intercept(async (request, response) => {
    if (request.method === 'POST' && JSON.parse(request.body).phase === 'commit') throw Error('TEST_ONLY lost reply');
    return response;
  });
  const commit = C.method('modules/admin/logic.js', 'fbkCommit');
  await commit.call(C.page, 'replace');
  const pending = C.page._fbkPend,
    count = C.requests.length;
  assert.equal(pending.uncertain, true);
  C.property('modules/admin/logic.js', 'fbkCancel')();
  C.property('modules/admin/logic.js', 'importBackup')({ target: { files: [file] } });
  await commit.call(C.page, 'merge');
  assert.equal(C.page._fbkPend, pending);
  assert.equal(C.requests.length, count);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n, 1);
  C.intercept(null);
  await commit.call(C.page, 'replace');
  assert.equal(C.page._fbkPend, null);
});

test('a historical phase5 AppBackup file converts through inspect/explicit consent and commits once without changing existing credentials', async () => {
  const B = await world(),
    C = await browser(B),
    identity = copy(B.DB.q("SELECT * FROM kv WHERE k='bassam_auth_users_v1'")),
    file = phase5AppBackup(await exported(B, C));
  assert.equal(file.manifest, undefined);
  assert.ok(file.domains.notifications);
  C.property('modules/admin/logic.js', 'importBackup')({ target: { files: [file] } });
  let asked = false;
  C.KIVO.bsConfirm = async (options) => {
    asked = true;
    assert.match(options.msg, /القديمة/);
    assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n, 0);
    return true;
  };
  await C.method('modules/admin/logic.js', 'fbkCommit').call(C.page, 'replace');
  assert.equal(C.page._fbkPend, null, JSON.stringify(C.page.state));
  assert.equal(asked, true);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n, 1);
  assert.deepEqual(copy(B.DB.q("SELECT * FROM kv WHERE k='bassam_auth_users_v1'")), identity);
  assert.equal(
    C.requests
      .filter((r) => r.method === 'POST' && JSON.parse(r.body).phase === 'commit')
      .every((r) => JSON.parse(r.body).legacyConsent === true),
    true,
  );
  assert.deepEqual(C.writes, []);
});

test('actual legacy HTTP conversion guards preserved global NF state and DS even when concurrent writers do not advance revisions', async () => {
  for (const domain of ['NF', 'DS']) {
    const B = await world();
    await B.DB.batch([
      B.DB.prepare(
        "INSERT INTO notification_messages(scope,id,kind,type,category,priority,channel,title,body,created_at) VALUES('sys','TEST_ONLY_sys','event','sc_deny','sec','info','bell','TEST_ONLY','TEST_ONLY',1)",
      ),
    ]);
    const file = { app: 'bassam-crowd', version: 3, kind: 'full', data: { bassam_depts_v1: JSON.stringify(B.keys.bassam_depts_v1) } },
      context = ok(await B.api('super', '/api/backup/restore?kind=full')),
      body = {
        version: 1,
        uid: IDS.super,
        requestId: 'TEST_ONLY_legacy_race_' + domain,
        scope: { kind: 'full' },
        mode: 'replace',
        reason: 'TEST_ONLY user supplied reason',
        base: context.base,
        backup: file,
        legacyConsent: true,
        phase: 'commit',
      },
      rawBatch = B.DB.batch.bind(B.DB);
    let injected = false,
      afterConcurrent;
    B.DB.batch = async (statements) => {
      const result = await rawBatch(statements);
      if (
        !injected &&
        statements.some((s) => s.sql === 'SELECT * FROM ' + (domain === 'NF' ? 'notification_messages' : 'daily_stats_days'))
      ) {
        injected = true;
        if (domain === 'NF')
          await rawBatch([
            B.DB.prepare(
              "INSERT INTO notification_user_state(account_uid,message_scope,message_id,read_at) VALUES(?1,'sys','TEST_ONLY_sys',2)",
            ).bind(IDS.super),
          ]);
        else
          await rawBatch([
            B.DB.prepare("INSERT INTO daily_stats_days(site,hijri_date,field_mask,worshippers) VALUES('haram','1448-01-01',1,0)"),
          ]);
        afterConcurrent = snap(B.DB);
      }
      return result;
    };
    const response = await B.api('super', '/api/backup/restore', body);
    B.DB.batch = rawBatch;
    assert.equal(injected, true);
    assert.equal(response.status, 409, JSON.stringify(response.json));
    assert.deepEqual(snap(B.DB), afterConcurrent);
    assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n, 0);
  }
});

test('legacy credential-bearing file cannot change the active owner credential or use file content as reauthentication', async () => {
  const B = await world(),
    C = await browser(B),
    file = phase5AppBackup(await exported(B, C)),
    users = JSON.parse(file.data.bassam_auth_users_v1),
    old = copy(B.DB.q("SELECT * FROM kv WHERE k='bassam_auth_users_v1'")),
    otherCredential = await B.W.hashPw('TEST_ONLY_different_credential');
  users.find((u) => u.id === IDS.super).ph = otherCredential;
  file.data.bassam_auth_users_v1 = JSON.stringify(users);
  C.property('modules/admin/logic.js', 'importBackup')({ target: { files: [file] } });
  const before = snap(B.DB);
  await C.method('modules/admin/logic.js', 'fbkCommit').call(C.page, 'replace');
  assert.ok(C.page._fbkPend);
  assert.equal(C.requests.find((r) => r.err)?.err, 'restore-credential-change');
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n, 0);
  assert.deepEqual(copy(B.DB.q("SELECT * FROM kv WHERE k='bassam_auth_users_v1'")), old);
  assert.deepEqual(snap(B.DB), before);
  assert.deepEqual(C.writes, []);
});

test('authenticated gate retains its uncertain receipt and refuses a different file until byte-identical retry confirms it', async () => {
  const B = await world(),
    C = await browser(B),
    file = await exported(B, C),
    method = vm.runInContext('(' + sourcePart('auth/335-identity-gate.js', 'FunctionDeclaration', 'doRestore') + ')', C.context),
    messages = [],
    label = { setAttribute() {} };
  let fail = true;
  C.intercept(async (request, response) => {
    if (fail && request.method === 'POST' && JSON.parse(request.body).phase === 'commit') {
      fail = false;
      throw Error('TEST_ONLY gate lost receipt');
    }
    return response;
  });
  await method(file, (m) => messages.push(m), label);
  assert.equal(method.pending.uncertain, true);
  const ticket = method.pending.ticket,
    count = C.requests.length;
  await method(copy(file), (m) => messages.push(m), label);
  assert.equal(C.requests.length, count);
  assert.equal(method.pending.ticket, ticket);
  await method(file, (m) => messages.push(m), label);
  assert.equal(method.pending, null);
  const commits = C.requests.filter((r) => r.method === 'POST' && JSON.parse(r.body).phase === 'commit');
  assert.equal(commits.length, 2);
  assert.equal(commits[0].body, commits[1].body);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n, 1);
  assert.deepEqual(C.writes, []);
});

test('actual healthy AppBackup export with an identical image body uses the shared UI and ACK reports reuse only', async () => {
  const B = await world(),
    id = 'img_testonly_appbackup',
    image = 'data:image/png;base64,VEVTVF9PTkxZ';
  await B.DB.batch([
    ...B.W.kvPutStmts(B.env, 'kv', OPTIONS, JSON.stringify({ map: id })),
    ...B.W.kvPutStmts(B.env, 'imgs', id, image),
    B.DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,1)').bind(OPTIONS),
    B.DB.prepare("INSERT INTO imgown(img,st,k,uid,dept,ts) VALUES(?1,'bound',?2,'',?3,1)").bind(id, OPTIONS, D1),
    B.DB.prepare('INSERT INTO imgref(img,k) VALUES(?1,?2)').bind(id, OPTIONS),
  ]);
  const C = await browser(B);
  C.KIVO.BassamIDB.allForBackup = async () => ({ [id]: image });
  const file = await exported(B, C);
  assert.equal(file.idbImages[id], image);
  let receipt;
  C.intercept(async (request, response) => {
    if (request.method === 'POST' && JSON.parse(request.body).phase === 'commit') receipt = await response.clone().json();
    return response;
  });
  C.property('modules/admin/logic.js', 'importBackup')({ target: { files: [file] } });
  await C.method('modules/admin/logic.js', 'fbkCommit').call(C.page, 'replace');
  assert.equal(C.page._fbkPend, null, JSON.stringify(C.page.state));
  assert.equal(receipt.imagesReused, 1);
  assert.equal(Object.hasOwn(receipt, 'imagesRestored'), false);
  assert.equal(B.DB.q('SELECT v FROM imgs WHERE k=?1', id)[0].v, image);
  assert.deepEqual(C.writes, []);
});


test('a committed restore ACK missing its Irshad count remains uncertain until an identical explicit retry returns the complete receipt', async () => {
  const B = await world(), C = await browser(B), file = await exported(B, C);
  C.property('modules/admin/logic.js', 'importBackup')({ target: { files: [file], value: '' } });
  let lose = true;
  C.intercept(async (request, response) => {
    if (lose && request.method === 'POST' && JSON.parse(request.body).phase === 'commit') {
      lose = false;
      const data = await response.json(); delete data.counts.irshad;
      return new Response(JSON.stringify(data), { status: 200 });
    }
    return response;
  });
  const commit = C.method('modules/admin/logic.js', 'fbkCommit');
  await commit.call(C.page, 'replace');
  assert.ok(C.page._fbkPend?.ticket); assert.equal(C.page._fbkPend.uncertain, true);
  assert.notEqual(C.page.state.backupMsg, 'اكتملت الاستعادة وأُنشئت لقطة ما قبلها على الخادم');
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n, 1);
  await commit.call(C.page, 'replace'); assert.equal(C.page._fbkPend, null);
  const sent = C.requests.filter(request => request.method === 'POST' && JSON.parse(request.body).phase === 'commit');
  assert.equal(sent.length, 2); assert.equal(sent[0].body, sent[1].body);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n, 1); assert.deepEqual(C.writes, []);
});
