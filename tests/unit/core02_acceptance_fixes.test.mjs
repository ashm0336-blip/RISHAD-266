/* RISHAD CORE-02 — fixes for the independent acceptance audit (B1–B4) on the real worker and the real admin source; synthetic TEST_ONLY values only.
   B1 platform name: an empty or blank name (spaces, zero-width, direction marks) is refused by the server in both modes, the stored value is kept;
      the client store refuses it before anything is queued, and «حفظ ونشر للجميع» stops before any save (the notification tree included).
   B2 security policies: a value outside its range is refused by name (400 policy-invalid) and nothing changes — no silent clamp under «حُفظت»;
      the form checks the same ranges before asking, shows the server's reason, and claims «حُفظت» only after the server accepted.
   B3 lock entry in the security log: the account counter writes its count (was the word «attempts»); the text names a number or none, and says the
      account counter only alerts (the lock is on the source of the attempts).
   B4 temporary password: clicking outside the dialog or Escape (a click on the overlay) keeps it open with a note; «تم» alone closes it. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';
import { makeTestEnv, client, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const L = fs.readFileSync(path.join(ROOT, 'src/modules/admin/logic.js'), 'utf8');
const V = fs.readFileSync(path.join(ROOT, 'src/modules/admin/view.html'), 'utf8');
const P = fs.readFileSync(path.join(ROOT, 'src/layouts/260-bassam-plat.js'), 'utf8');
const TREE = parse(L, { ecmaVersion: 'latest' });
const klass = TREE.body.find((n) => n.type === 'ClassDeclaration' && n.id.name === 'Component');
const tick = () => new Promise((r) => setImmediate(r));
const PLAT = 'bassam_platform_v1';

async function env(mode) {
  const e = makeTestEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce' } : {});
  if (mode === 'enforce') e.DB.exec("INSERT INTO meta(k,v) VALUES('authz_mode','enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const C = client(e); const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok, 'TEST super signs in');
  return { e, C, ck: su.ck };
}
const stored = (e) => e.DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', PLAT).map((r) => r.v).join('');

/* ── B1 · server ── */
for (const mode of ['legacy', 'enforce']) {
  test('B1 [' + mode + '] the server refuses an empty or blank platform name and keeps the stored value', async () => {
    const { e, C, ck } = await env(mode);
    const ok = await C.save(ck, { [PLAT]: JSON.stringify({ name: 'TEST_ONLY منصة', short: 'TEST_ONLY' }) });
    assert.equal(ok.status, 200); assert.deepEqual(ok.j.denied, {}, 'a real name is saved'); assert.match(stored(e), /TEST_ONLY منصة/);
    for (const name of ['', '   ', '‏ ‎', ' \t', null, 7]) {
      const r = await C.save(ck, { [PLAT]: JSON.stringify({ name, short: 'TEST_ONLY' }) });
      assert.equal(r.j.denied && r.j.denied[PLAT] && r.j.denied[PLAT].why, 'plat-name', JSON.stringify(name) + ' is refused: ' + JSON.stringify(r.j).slice(0, 160));
      assert.match(stored(e), /TEST_ONLY منصة/, JSON.stringify(name) + ': the stored name stays');
    }
    const noName = await C.save(ck, { [PLAT]: JSON.stringify({ short: 'TEST_ONLY_2' }) });
    assert.deepEqual(noName.j.denied, {}, 'a value without «name» is not judged (the default name applies)');
    const brand = await C.api('/api/brand'); assert.notEqual(String(brand.j.brand && brand.j.brand.name || 'x').trim(), '', 'the public brand never carries a blank name');
  });
}

/* ── B2 · server ── */
test('B2 the policy route refuses an out-of-range value by name and changes nothing; valid values and partial bodies still save', async () => {
  const { C, ck } = await env('legacy');
  const pol = async () => (await C.api('/api/policy', { cookie: ck })).j.policy;
  const p0 = await pol();
  const bad = [[{ lockN: 0 }, 'lockN', 3, 20], [{ lockN: 2 }, 'lockN', 3, 20], [{ lockN: 21 }, 'lockN', 3, 20], [{ lockN: 5.5 }, 'lockN', 3, 20], [{ lockN: '' }, 'lockN', 3, 20],
    [{ lockN: 'abc' }, 'lockN', 3, 20], [{ sessH: 0 }, 'sessH', 1, 72], [{ sessH: 73 }, 'sessH', 1, 72], [{ idleH: 0.1 }, 'idleH', 0.25, 24], [{ lockMin: 61 }, 'lockMin', 1, 60],
    [{ wrMin: 29 }, 'wrMin', 30, 5000], [{ sessH: 12, lockN: -1 }, 'lockN', 3, 20]];
  for (const [body, field, min, max] of bad) {
    const r = await C.api('/api/policy', { method: 'POST', cookie: ck, body });
    assert.equal(r.status, 400, JSON.stringify(body)); assert.equal(r.j.ok, 0); assert.equal(r.j.err, 'policy-invalid');
    assert.equal(r.j.field, field, JSON.stringify(body)); assert.equal(r.j.min, min); assert.equal(r.j.max, max); assert.ok(typeof r.j.msg === 'string' && r.j.msg.length > 5, 'a reason in Arabic');
    assert.deepEqual(await pol(), p0, JSON.stringify(body) + ': the policy is unchanged');
  }
  const good = await C.api('/api/policy', { method: 'POST', cookie: ck, body: { sessH: '24', idleH: 0.25, lockN: '7', lockMin: 10, pwMin: 6, wrMin: '1500' } });
  assert.equal(good.status, 200); assert.equal(good.j.ok, 1);
  assert.deepEqual(await pol(), Object.assign({}, p0, { sessH: 24, idleH: 0.25, lockN: 7, lockMin: 10, pwMin: 6, wrMin: 1500 }), 'the form strings are saved as numbers');
  /* pwMin keeps the approved KIVO_259 rule on the server: stored as 6 whatever is sent (the form itself never sends another value) */
  const pw = await C.api('/api/policy', { method: 'POST', cookie: ck, body: { pwMin: 12 } }); assert.equal(pw.status, 200); assert.equal(pw.j.policy.pwMin, 6);
  const part = await C.api('/api/policy', { method: 'POST', cookie: ck, body: { lockN: 4 } }); assert.equal(part.j.ok, 1);
  assert.equal((await pol()).lockN, 4); assert.equal((await pol()).sessH, 24, 'a field left out keeps its value');
});

/* ── B3 · server ── */
test('B3 the account counter writes its count into the lock entry (not the word «attempts»)', async () => {
  const { e, C } = await env('legacy');
  for (let i = 0; i < 5; i++) await C.api('/api/login', { method: 'POST', body: { u: TEST_SUPER_USERNAME, p: 'TEST_ONLY_bad' + i }, headers: { 'CF-Connecting-IP': '10.0.0.' + (i + 1) } });
  const rows = e.DB.q("SELECT target, detail FROM sec WHERE act = 'lock'");
  const acct = rows.filter((r) => String(r.target).startsWith('u:'));
  assert.equal(acct.length, 1, 'one alert at the threshold: ' + JSON.stringify(rows));
  assert.equal(acct[0].detail, '5', 'the count'); assert.ok(rows.every((r) => /^\d+$/.test(String(r.detail))), 'every lock entry carries a number');
});

/* ── client: the real source with stubbed services ── */
function page(state = {}, opts = {}) {
  const calls = { toast: [], fetch: [], confirm: [], state: [] };
  const KIVO = { bsConfirm: async (o) => (calls.confirm.push(o), opts.answer !== false), BassamCount: (n, w) => n + ' ' + String(w || '').split('|')[0] };
  const ctx = vm.createContext({ KIVO, Object, String, Math, JSON, Promise, isFinite, NaN });
  const pg = {
    state: Object.assign({}, state), setState(v) { calls.state.push(v); Object.assign(this.state, v); },
    bsToast: (...a) => calls.toast.push(a),
    adFetch: (...a) => (calls.fetch.push(a), Promise.resolve(opts.reply || { ok: 1, policy: a[1] })),
    _adWho: () => '',
  };
  for (const n of klass.body.body) if (n.type === 'MethodDefinition' && /^(_adAsk|_adPolRange|_adPolBadOf|_adPolBad|adSecTxt)$/.test(n.key.name)) pg[n.key.name] = vm.runInContext('({' + L.slice(n.start, n.end) + '}).' + n.key.name, ctx);
  const prop = (name, has) => { const f = []; (function w(x) { if (!x || typeof x !== 'object') return; if (x.type === 'Property' && x.key && (x.key.name === name) && L.slice(x.start, x.end).includes(has || '')) f.push(L.slice(x.start, x.end)); for (const v of Object.values(x)) Array.isArray(v) ? v.forEach(w) : v && typeof v.type === 'string' && w(v); })(TREE); assert.equal(f.length, 1, name); return f[0]; };
  pg.handler = (name, has, free = {}) => vm.runInContext('(function(' + Object.keys(free).join(',') + '){return ({' + prop(name, has) + '})[' + JSON.stringify(name) + '];})', ctx).call(pg, ...Object.values(free));
  return { pg, calls, ctx };
}

test('B1 client: the platform store refuses a blank name; «حفظ ونشر للجميع» stops before any save; the field is marked', async () => {
  const store = {}, KIVO = { BassamAuth: { isSuper: () => true }, KIVO_MANIFEST: { clone: () => [] } };
  class Storage { getItem(k) { return store[k] ?? null; } setItem(k, v) { store[k] = String(v); } }
  const ctx = vm.createContext({ KIVO, Storage, window: { addEventListener() {} }, localStorage: new Storage(), document: { documentElement: { getAttribute: () => null }, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [] }, JSON, Object, Array, String });
  try { vm.runInContext(P, ctx); } catch (e) { /* apply() touches the DOM after set(); the store contract is what is checked */ }
  const BP = KIVO.BassamPlat; assert.ok(BP && BP.set && BP.blankName, 'BassamPlat.set / blankName');
  for (const n of ['', '  ', '‏', '⁧ ⁩', null]) { const r = BP.set({ name: n }); assert.equal(r.ok, false, JSON.stringify(n)); assert.equal(r.field, 'name'); assert.match(r.err, /اسم المنصة مطلوب/); }
  assert.equal(Object.keys(store).length, 0, 'nothing written for a blank name');
  assert.equal(BP.blankName('TEST_ONLY'), false);
  /* plSave: the draft is checked first — no notification-tree save, no platform write */
  const m = klass.body.body.find((n) => n.key && n.key.name === 'plSave'); const src = L.slice(m.start, m.end);
  assert.ok(src.indexOf('t.blankName(d0.name)') > 0 && src.indexOf('t.blankName(d0.name)') < src.indexOf('this.nfSave()'), 'the name is checked before nfSave');
  const calls = []; const fake = { state: { plDraft: { name: ' ' } }, plP: () => ({ blankName: BP.blankName, NAME_REQ: BP.NAME_REQ, set: () => (calls.push('set'), { ok: true }) }), plDraft: () => ({ name: ' ' }), nfSave: async () => (calls.push('nf'), {}), bsToast: (...a) => calls.push(a), bsAck: () => calls.push('ack') };
  await vm.runInContext('({' + src + '}).plSave', vm.createContext({})).call(fake);
  assert.deepEqual(calls, [[BP.NAME_REQ, 'warn']], 'only the warning: ' + JSON.stringify(calls));
  assert.match(V, /data-k="name" onChange="\{\{plOn\}\}" placeholder="" required aria-invalid="\{\{plNameBad\}\}"/);
  assert.match(L, /w\.plNameBad = !!\(i && KIVO\.BassamPlat && KIVO\.BassamPlat\.blankName && KIVO\.BassamPlat\.blankName\(i\.name\)\)/);
});

test('B2 client: an out-of-range value is refused by name before asking; the server reason is shown; «حُفظت» only after acceptance', async () => {
  const save = (state, opts) => { const w = page(state, opts); return { w, run: () => w.pg.handler('secPolSave', '_adPolBad') }; };
  /* refused before any question or request */
  let { w, run } = save({ adPol: { sessH: 12, idleH: 2, lockN: 0, lockMin: 5, pwMin: 6, wrMin: 1200 } }); run()(); await tick();
  assert.equal(w.calls.confirm.length, 0); assert.equal(w.calls.fetch.length, 0); assert.match(w.pg.state.adPolMsg, /^لم تُحفظ — محاولات قبل القفل: أدخل عدداً صحيحاً من 3 إلى 20$/);
  assert.equal(w.calls.toast[0][1], 'warn');
  for (const [k, v] of [['sessH', 0], ['idleH', 0.1], ['lockMin', 61], ['wrMin', 29], ['pwMin', 8], ['lockN', '']]) {
    ({ w, run } = save({ adPol: Object.assign({ sessH: 12, idleH: 2, lockN: 5, lockMin: 5, pwMin: 6, wrMin: 1200 }, { [k]: v }) })); run()(); await tick();
    assert.equal(w.calls.fetch.length, 0, k + '=' + v); assert.match(w.pg.state.adPolMsg, /^لم تُحفظ — /);
  }
  /* the server refuses: its reason, no «حُفظت» */
  ({ w, run } = save({ adPol: { lockN: 7 } }, { reply: { ok: 0, err: 'policy-invalid', msg: 'TEST_ONLY سبب الخادم' } })); run()(); for (let i = 0; i < 4; i++) await tick();
  assert.equal(w.calls.fetch.length, 1); assert.equal(w.calls.fetch[0][2], true, 'the refusal body is asked for'); assert.equal(w.pg.state.adPolMsg, 'لم تُحفظ — TEST_ONLY سبب الخادم');
  /* accepted: «حُفظت» with the server's values */
  ({ w, run } = save({ adPol: { lockN: '7' } }, { reply: { ok: 1, policy: { lockN: 7 } } })); run()(); for (let i = 0; i < 4; i++) await tick();
  assert.equal(w.pg.state.adPolMsg, 'حُفظت — تسري من الدخول التالي'); assert.deepEqual(w.pg.state.adPol, { lockN: 7 });
  /* inputs carry the same ranges and mark an invalid value */
  assert.match(V, /type="number" inputmode="decimal" min="\{\{p\.min\}\}" max="\{\{p\.max\}\}" step="\{\{p\.step\}\}" aria-invalid="\{\{p\.bad\}\}"/);
  const R = page().pg._adPolRange(); assert.equal(JSON.stringify(R.lockN), '[3,20,1]'); assert.equal(JSON.stringify(R.pwMin), '[6,6,1]');
  const W = fs.readFileSync(path.join(ROOT, 'workers/parts/001-policy.js'), 'utf8');
  for (const [k, r] of Object.entries(R)) assert.ok(W.includes(k + ': [' + r.join(', ') + ']'), 'client range = server range for ' + k);
});

test('B3 client: the lock entry shows a count or none — never «attempts» — and says what the account alert is', () => {
  const { pg } = page();
  const txt = (row) => pg.adSecTxt(Object.assign({ act: 'lock', un: 'TEST_ONLY_u' }, row)).t;
  const legacyRow = txt({ detail: 'attempts', target: 'u:TEST_ONLY_u' });
  assert.doesNotMatch(legacyRow, /attempts/); assert.match(legacyRow, /^تنبيه: محاولات فاشلة متتالية باسم TEST_ONLY_u — لا يُقفل الحساب نفسه/);
  assert.match(txt({ detail: '5', target: 'u:TEST_ONLY_u' }), /^تنبيه: 5 محاولة باسم TEST_ONLY_u/);
  assert.match(txt({ detail: '6', target: 'p:TEST_ONLY_u|10.0.0.1' }), /^قُفل الدخول مؤقتاً بعد 6 محاولة باسم TEST_ONLY_u$/);
  assert.match(txt({ detail: '', target: 'ip:10.0.0.1', un: '' }), /^قُفل الدخول مؤقتاً بعد محاولات فاشلة متتالية$/);
});

test('B4 client: clicking outside or Escape keeps the temporary-password dialog open with a note; «تم» closes it', () => {
  assert.match(V, /<div class="bs-dlg bs-dlg--modal" style="z-index:var\(--z-confirm\)" onClick="\{\{usTmpOut\}\}">/, 'the overlay (click outside · Escape) carries usTmpOut');
  assert.match(V, /role="alert">\{\{usTmpInfo\}\}<\/div>/);
  assert.match(V, /onClick="\{\{usTmpClose\}\}">تم<\/button>/, '«تم» closes');
  const { pg } = page({ usTmp: { name: 'TEST_ONLY', pw: 'TEST_ONLY_pw' } });
  const out = pg.handler('usTmpOut', 'usTmp'), close = pg.handler('usTmpClose', 'usTmp: null');
  out(); assert.equal(pg.state.usTmp.pw, 'TEST_ONLY_pw', 'still shown'); assert.match(pg.state.usTmp.info, /لا تظهر مرة أخرى/);
  close(); assert.equal(pg.state.usTmp, null);
  const none = page({ usTmp: null }).pg; none.handler('usTmpOut', 'usTmp')(); assert.equal(none.state.usTmp, null, 'nothing to keep');
});
