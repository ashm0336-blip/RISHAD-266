/* RISHAD CORE-02 step 3 — sensitive actions in «مركز إدارة رشاد» (client only; synthetic TEST_ONLY values, no network).
   Runs the real source of src/modules/admin/logic.js (class methods and the render-time handlers) with stubbed services:
     (a) «التهيئة والاستعادة» step 1 calls the existing full-backup export (exportBackup) and cannot advance without its reported
         success AND an explicit acknowledgement that the file was saved; failure or cancel keeps step 1 with a plain message;
     (b) the recovery-key dialog cannot be dismissed (backdrop / Escape reach the same handler) once the key is shown, «نُسخ» only
         after the clipboard promise resolves, a blocked print window says so, and creating the key cannot be submitted twice;
     (c) every sensitive action asks first through KIVO.bsConfirm, and cancelling sends and changes nothing. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const L = fs.readFileSync(path.join(ROOT, 'src/modules/admin/logic.js'), 'utf8');
const V = fs.readFileSync(path.join(ROOT, 'src/modules/admin/view.html'), 'utf8');
const TREE = parse(L, { ecmaVersion: 'latest' });
const klass = TREE.body.find((n) => n.type === 'ClassDeclaration' && n.id.name === 'Component');
const tick = () => new Promise((r) => setImmediate(r));

function walk(node, fn) { if (!node || typeof node !== 'object') return; fn(node); for (const v of Object.values(node)) Array.isArray(v) ? v.forEach((x) => walk(x, fn)) : (v && typeof v.type === 'string' && walk(v, fn)); }
/* a render-time handler: the Property `name` whose source contains `has` (the handler names repeat across tabs) */
function propSrc(name, has) {
  const found = [];
  walk(TREE, (n) => { if (n.type === 'Property' && (n.key.name === name || n.key.value === name)) { const s = L.slice(n.start, n.end); if (!has || s.includes(has)) found.push(s); } });
  assert.equal(found.length, 1, 'exactly one handler ' + name + (has ? ' containing ' + has : '') + ' (found ' + found.length + ')');
  return found[0];
}
function world(opts = {}) {
  const calls = { confirm: [], fetch: [], act: [], toast: [], ack: [], state: [], purge: [], nodeDel: [], rmMgr: [], dis: [], send: [], clip: [], open: 0 };
  const KIVO = {
    bsConfirm: async (o) => { calls.confirm.push(o); return typeof opts.answer === 'function' ? opts.answer(o) : !!opts.answer; },
    BassamCount: (n, w) => n + ' ' + String(w || '').split('|')[0],
    BassamPerm: { purgeDeptAccounts: () => (calls.purge.push(1), { ok: 1 }) },
    BassamAuth: { isSuper: () => true, groupManagers: () => [{ id: 'TEST_ONLY_gm' }], removeGroupManager: (o) => calls.rmMgr.push(o) },
    BassamCssText: { byId: () => '' },
    __BS_SRV: null,
  };
  const ctx = { KIVO, console, setTimeout, clearTimeout, Promise, Date, JSON, Object, String, Math, URL, Blob: class { constructor(p) { this.p = p; } } };
  ctx.window = ctx;
  ctx.navigator = { clipboard: opts.clipboard === null ? null : { writeText: (t) => (calls.clip.push(t), opts.clipboard || Promise.resolve()) } };
  ctx.window.open = () => (calls.open++, opts.popup === undefined ? null : opts.popup);
  ctx.window.getSelection = () => ({ removeAllRanges() {}, addRange() {} });
  ctx.document = { querySelector: () => null, createRange: () => ({ selectNodeContents() {} }), createElement: () => ({ click() { calls.download = this.download; }, remove() {} }), body: { appendChild() {} } };
  vm.createContext(ctx);
  const page = {
    state: Object.assign({ plRs: { step: 0, keepBrand: true }, plBusy: false, plRkKey: '', plRkAskOn: false, plRkPw: '', plRkInfo: '' }, opts.state || {}),
    setState(v) { calls.state.push(v); Object.assign(this.state, typeof v === 'function' ? v(this.state) : v); },
    bsToast: (...a) => calls.toast.push(a), bsAck: (...a) => calls.ack.push(a),
    adAct: (...a) => (calls.act.push(a), Promise.resolve({ ok: 1 })),
    adFetch: (...a) => (calls.fetch.push(a), opts.fetch ? opts.fetch(...a) : Promise.resolve({ ok: 1, policy: {} })),
    plRkLoad() {}, adOnSrv: () => true,
  };
  for (const n of klass.body.body) {
    if (n.type !== 'MethodDefinition' || !/^(_adAsk|_adKill|_adFreeze|plRsNext|plRsBackup|plRkNew|plRkOut|plRkClose|plRkCopy|plRkPrint|pwDlgCancel|pwDlgGo)$/.test(n.key.name)) continue;
    page[n.key.name] = vm.runInContext('({' + L.slice(n.start, n.end) + '}).' + n.key.name, ctx);
  }
  /* a render-time handler with its free variables bound, `this` = page */
  page.handler = (name, has, free = {}) => vm.runInContext('(function(' + Object.keys(free).join(',') + '){return ({' + propSrc(name, has) + '})[' + JSON.stringify(name) + '];})', ctx).call(page, ...Object.values(free));
  return { page, calls, KIVO, ctx };
}

/* ── (a) reset step 1: the backup before reset ── */
test('reset step 1 calls the existing export and stays on step 1 when it fails or is cancelled', async () => {
  const { page, calls } = world();
  let done = null, n = 0; const exp = (cb) => { n++; done = cb; };
  page.plRsNext(exp);
  assert.equal(n, 1, 'the click starts the full-backup export'); assert.equal(page.state.plRs.bk, 'busy'); assert.equal(page.state.plRs.step, 0);
  page.plRsNext(exp); assert.equal(n, 1, 'a second click while it runs does not start another export'); assert.match(page.state.plRsMsg, /جارٍ تجهيز/);
  done(false, 'أُلغي التصدير');
  assert.equal(page.state.plRs.step, 0, 'cancel keeps step 1'); assert.notEqual(page.state.plRs.bk, 'ok'); assert.match(page.state.plRsMsg, /لم تكتمل النسخة الكاملة.*أُلغي التصدير/);
  page.plRsNext(exp); done(false, 'تعذّر التصدير'); assert.equal(page.state.plRs.step, 0, 'failure keeps step 1');
  page.plRsNext(undefined); assert.equal(page.state.plRs.step, 0, 'no export function → no advance'); assert.match(page.state.plRsMsg, /تعذّر بدء النسخة/);
  assert.equal(calls.fetch.length, 0, 'nothing is sent to the server');
});

test('reset step 1 needs the export success AND the explicit «تأكدت من حفظ ملف النسخة» before step 2', async () => {
  const { page } = world();
  page.plRsNext((cb) => cb(true, 'نسخة-شاملة-كل-الإدارات-2026-11-06.json'));
  assert.equal(page.state.plRs.bk, 'ok'); assert.equal(page.state.plRs.bkFile, 'نسخة-شاملة-كل-الإدارات-2026-11-06.json'); assert.equal(page.state.plRs.step, 0, 'success alone does not advance');
  page.plRsNext(() => assert.fail('a reported success is not exported again by «متابعة»'));
  assert.equal(page.state.plRs.step, 0, 'no acknowledgement → still step 1'); assert.match(page.state.plRsMsg, /أكّد أولاً.*لا يستطيع المتصفح التحقق/);
  page.state.plRs.ack = true; page.plRsNext(() => assert.fail('no second export'));
  assert.equal(page.state.plRs.step, 1, 'success + acknowledgement → step 2'); assert.ok(page.state.plRs.taken > 0);
  /* the old fake path is gone: it advanced after looking for a backup service that does not exist, or clicking a button by its text */
  assert.doesNotMatch(L, /BassamFullBackup|window\.BassamBackup|النسخة الشاملة\|تصدير نسخة شاملة/);
  assert.match(L, /v\.plRsNext = \(\) => this\.plRsNext\(v\.exportBackup\)/, 'the wizard is wired to the one existing exportBackup');
  assert.match(V, /type="checkbox" checked="\{\{plRsAck\}\}" onChange="\{\{plRsAckTog\}\}"> تأكدت من حفظ ملف النسخة/);
  assert.match(V, /لا يستطيع المتصفح التأكد من أن الملف حُفظ فعلاً على جهازك/, 'the verification limit is stated plainly');
});

test('exportBackup reports its result to the caller: failure, cancel, encryption error, and success only after the download', async () => {
  const exportSrc = propSrc('exportBackup', 'allForBackup');
  const run = (w, sup) => vm.runInContext('(function(s){return ({' + exportSrc + '}).exportBackup;})', w.ctx).call(w.page, sup);
  { const w = world(); const r = []; run(w, false)((ok, m) => r.push([ok, m])); assert.deepEqual(r, [[false, 'صلاحية غير كافية — تصدير النسخة الشاملة لمسؤول المنصة فقط']]); assert.match(w.page.state.backupMsg, /صلاحية غير كافية/, 'the backup tab message is unchanged'); }
  { const w = world(); const r = []; run(w, true)((ok, m) => r.push([ok, m])); assert.equal(r.length, 1); assert.equal(r[0][0], false); assert.match(r[0][1], /نظام الإدارات غير متاح/); }
  { const w = world(); const r = []; run(w, true)({ type: 'click' }); assert.deepEqual(r, [], 'a click event is not taken for a callback'); }
  /* the password dialog: cancel → false; success → true with the file name after the browser was handed the file */
  { const w = world(); const r = []; w.page._encPend = { done: (ok, m) => r.push([ok, m]), json: '{}' }; w.page.state.pwDlg = { mode: 'exp' }; w.page.pwDlgCancel(); assert.deepEqual(r, [[false, 'أُلغي التصدير']]); assert.equal(w.page._encPend, null); }
  for (const good of [true, false]) {
    const w = world(); const r = [];
    w.KIVO.BassamCrypt = { enc: () => (good ? Promise.resolve('TEST_ONLY_cipher') : Promise.reject(new Error('TEST_ONLY'))) };
    w.KIVO.BassamDepts = { raw: { setItem() {} } };
    w.ctx.URL = { createObjectURL: () => 'blob:TEST_ONLY', revokeObjectURL() {} }; w.ctx.localStorage = {};
    w.page._encPend = { done: (ok, m) => r.push([ok, m]), json: '{}', dt: new Date('2026-11-06T09:00:00Z'), depts: 1, items: 1, imgsN: 0 };
    w.page.state.pwDlg = { mode: 'exp', p1: 'TEST_ONLY_pw1', p2: 'TEST_ONLY_pw1' };
    w.page.pwDlgGo(); assert.deepEqual(r, [], 'nothing is reported before the encryption finishes');
    for (let i = 0; i < 5; i++) await tick();
    if (good) { assert.deepEqual(r, [[true, 'نسخة-شاملة-كل-الإدارات-2026-11-06.json']]); assert.equal(w.calls.download, r[0][1], 'reported after the file was handed to the browser'); }
    else assert.deepEqual(r, [[false, 'تعذّر تشفير النسخة']]);
  }
});

/* ── (b) recovery-key dialog ── */
test('recovery key dialog: once the key is shown, backdrop and Escape do not close it; only «حفظته في مكان آمن» does', () => {
  const { page } = world({ state: { plRkAskOn: true, plRkKey: 'TEST-ONLY-KEY-0000' } });
  page.plRkOut();
  assert.equal(page.state.plRkAskOn, true, 'backdrop / Escape keep it open'); assert.equal(page.state.plRkKey, 'TEST-ONLY-KEY-0000'); assert.match(page.state.plRkInfo, /لا يظهر مرة أخرى/);
  page.plRkClose(); assert.equal(page.state.plRkAskOn, false); assert.equal(page.state.plRkKey, '');
  const p2 = world({ state: { plRkAskOn: true } }).page; p2.plRkOut(); assert.equal(p2.state.plRkAskOn, false, 'before a key exists the backdrop still cancels');
  const p3 = world({ state: { plRkAskOn: true, plBusy: true } }).page; p3.plRkOut(); p3.plRkClose(); assert.equal(p3.state.plRkAskOn, true, 'not while the key is being created');
  /* Escape: the shell dispatches a click on the overlay, so the overlay must carry plRkOut and not plRkClose */
  assert.match(V, /<div class="bs-dlg bs-dlg--modal" onClick="\{\{plRkOut\}\}">/);
  assert.match(V, /onClick="\{\{plRkGo\}\}" disabled="\{\{plRkBusy\}\}"/, 'the create button is disabled while busy');
});

test('recovery key: no double submit; «نُسخ» only after the clipboard resolves; plain fallbacks for clipboard and blocked print', async () => {
  let release; const w = world({ state: { plRkPw: 'TEST_ONLY_pw', plRkAskOn: true }, fetch: () => new Promise((r) => { release = r; }) });
  w.page.plRkNew(); w.page.plRkNew();
  assert.equal(w.calls.fetch.length, 1, 'one request'); assert.equal(w.calls.fetch[0][0], '/api/recovery/new');
  release({ ok: 1, key: 'TEST-ONLY-KEY-1111' }); await tick();
  assert.equal(w.page.state.plRkKey, 'TEST-ONLY-KEY-1111'); assert.equal(w.page.state.plBusy, false);
  let resolveClip; const c = world({ state: { plRkKey: 'TEST-ONLY-KEY-2222' }, clipboard: new Promise((r) => { resolveClip = r; }) });
  c.page.plRkCopy(); assert.deepEqual(c.calls.toast, [], 'nothing claimed before the clipboard answers'); assert.deepEqual(c.calls.clip, ['TEST-ONLY-KEY-2222']);
  resolveClip(); await tick(); assert.deepEqual(c.calls.toast, [['نُسخ المفتاح', 'ok']]);
  const d = world({ state: { plRkKey: 'TEST-ONLY-KEY-3333' }, clipboard: Promise.reject(new Error('TEST_ONLY denied')) });
  d.page.plRkCopy(); await tick(); await tick(); assert.deepEqual(d.calls.toast, [], 'a refused clipboard is not reported as copied'); assert.match(d.page.state.plRkInfo, /تعذّر النسخ التلقائي/);
  const e = world({ state: { plRkKey: 'TEST-ONLY-KEY-4444' }, clipboard: null }); e.page.plRkCopy(); assert.match(e.page.state.plRkInfo, /انسخه يدوياً/);
  const f = world({ state: { plRkKey: 'TEST-ONLY-KEY-5555' } }); f.page.plRkPrint('TEST_ONLY'); assert.equal(f.calls.open, 1); assert.match(f.page.state.plRkInfo, /منع المتصفح نافذة الطباعة/);
});

/* ── (c) one confirmation for sensitive actions ── */
const CASES = [
  ['end one account’s sessions (accounts menu)', 'go', 'this._adKill(a)', (w) => ({ a: { id: 'TEST_ONLY_u1', name: 'TEST_ONLY' } }), (w) => w.calls.act.length],
  ['end one account’s sessions (overview)', 'kill', 'this._adKill(t.u)', (w) => ({ t: { u: { id: 'TEST_ONLY_u1', name: 'TEST_ONLY' } } }), (w) => w.calls.act.length, 0],
  ['end one account’s sessions (security)', 'kill', 'this._adKill(t.u)', (w) => ({ t: { u: { id: 'TEST_ONLY_u1', name: 'TEST_ONLY' } } }), (w) => w.calls.act.length, 1],
  ['end all other sessions', 'secKillAll', '', (w) => ({ i: 'TEST_ONLY_me' }), (w) => w.calls.act.length],
  ['freeze an account (accounts menu)', 'go', 's.setDisById(a.id, !a.dis)', (w) => ({ fx: '', a: { id: 'TEST_ONLY_u1', name: 'TEST_ONLY', dis: 0 }, s: { setDisById: (...x) => (w.calls.dis.push(x), { ok: 1 }) } }), (w) => w.calls.dis.length],
  ['unfreeze an account (overview)', 'unfreeze', '', (w) => ({ s: { id: 'TEST_ONLY_u1', name: 'TEST_ONLY' }, a: { setDisById: (...x) => (w.calls.dis.push(x), { ok: 1 }) }, t: {} }), (w) => w.calls.dis.length],
  ['freeze / unfreeze a manager (units)', 'dis', 'setDeptManagerDis', (w) => ({ n: false, o: 'TEST_ONLY_A', g: { id: 'TEST_ONLY_m', name: 'TEST_ONLY', dis: 0 }, A: { setDeptManagerDis: (...x) => (w.calls.dis.push(x), { ok: 1 }) } }), (w) => w.calls.dis.length],
  ['save the security policies', 'secPolSave', '', () => ({}), (w) => w.calls.fetch.length],
  ['clean up the legacy unit accounts', 'oldAccDo', '', () => ({ i: 2 }), (w) => w.calls.purge.length],
  ['delete a unit node', 'dhDel', 'nodeDel', (w) => ({ n: true, o: 'TEST_ONLY_G', p: { name: 'TEST_ONLY' }, t: { nodeDel: (x) => (w.calls.nodeDel.push(x), { ok: 1 }), list: () => [] } }), (w) => w.calls.nodeDel.length + w.calls.rmMgr.length],
  ['delete a manager account', 'del', 'removeDeptManager', (w) => ({ n: false, o: 'TEST_ONLY_A', g: { id: 'TEST_ONLY_m', name: 'TEST_ONLY' }, A: { removeDeptManager: (...x) => (w.calls.rmMgr.push(x), { ok: 1 }) } }), (w) => w.calls.rmMgr.length],
  ['platform-wide broadcast', 'nfBcSend', '', (w) => ({ E: true, k: { mode: 'all', title: 'TEST_ONLY', body: 'TEST_ONLY', when: 'now' }, _: 3, v: { ready: true }, M: (x) => w.calls.send.push(x) }), (w) => w.calls.send.length],
];
for (const [label, name, has, free, effect, nth] of CASES) {
  test('asks first, and cancelling changes nothing: ' + label, async () => {
    for (const answer of [false, true]) {
      const w = world({ answer });
      let fn;
      if (nth !== undefined) {   /* the same handler text in two tabs: take the nth */
        const all = []; walk(TREE, (x) => { if (x.type === 'Property' && x.key.name === name && L.slice(x.start, x.end).includes(has)) all.push(L.slice(x.start, x.end)); });
        assert.equal(all.length, 2); const f = free(w);
        fn = vm.runInContext('(function(' + Object.keys(f).join(',') + '){return ({' + all[nth] + '})[' + JSON.stringify(name) + '];})', w.ctx).call(w.page, ...Object.values(f));
      } else fn = w.page.handler(name, has, free(w));
      fn(); for (let i = 0; i < 4; i++) await tick();
      assert.equal(w.calls.confirm.length, 1, label + ': one KIVO.bsConfirm');
      assert.ok(w.calls.confirm[0].title && w.calls.confirm[0].msg && w.calls.confirm[0].ok, label + ': titled, explained, named action');
      assert.equal(effect(w), answer ? (name === 'dhDel' ? 2 : 1) : 0, label + (answer ? ': runs once after confirming' : ': cancelling sends and changes nothing'));
      if (!answer) { assert.deepEqual(w.calls.ack, []); assert.deepEqual(w.calls.fetch, []); assert.deepEqual(w.calls.act, []); }
    }
  });
}

test('a broadcast to a unit or chosen people is not interrupted; the platform-wide one cannot be asked twice at once', async () => {
  const w = world({ answer: true }); const fn = w.page.handler('nfBcSend', '', { E: true, k: { mode: 'dept', sel: ['TEST_ONLY_A'], title: 'TEST_ONLY', body: 'TEST_ONLY', when: 'now' }, _: 2, v: { ready: true }, M: (x) => w.calls.send.push(x) });
  fn(); assert.equal(w.calls.confirm.length, 0); assert.deepEqual(w.calls.send, [false]);
  let open; const z = world({ answer: () => new Promise((r) => { open = r; }) }); const g = z.page.handler('nfBcSend', '', { E: true, k: { mode: 'all', title: 'TEST_ONLY', body: 'TEST_ONLY', when: 'now' }, _: 3, v: { ready: true }, M: (x) => z.calls.send.push(x) });
  g(); g(); await tick(); assert.equal(z.calls.confirm.length, 1, 'a second click while the dialog is open does not open another'); open(true); for (let i = 0; i < 4; i++) await tick(); assert.deepEqual(z.calls.send, [false]);
});

test('the 4-second two-click confirmations are gone from the reachable delete buttons', () => {
  for (const [name, has] of [['dhDel', 'nodeDel'], ['del', 'removeDeptManager']]) assert.doesNotMatch(propSrc(name, has), /setTimeout|Arm/, name + ': no arming timer');
  assert.doesNotMatch(L, /mgArm|_mgArmT|dhDelArm|admArm\s*:\s*\{/, 'no arming state left for nodes, managers or empty units');
  assert.doesNotMatch(V, /dhDelCls|g\.delCls/);
});
