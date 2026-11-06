/* RISHAD CORE-02 step 4 (d)(e)(f) — displayed information in «مركز إدارة رشاد» says what it shows (client only; synthetic TEST_ONLY data).
   The real Admin component (src/modules/admin/logic.js) in a stub context; no network, no server change:
     (d) «آخر الحسابات المضافة — آخر ٧ أيام» lists the last 7 days only (the server sends 30 days for the accounts tab's «أُضيف» column);
     (e) «اليوم» in the security-log filter starts at midnight Asia/Riyadh whatever the browser's time zone, and says so;
     (f) recovery / reset / authz_unavailable events are reachable under the right kind (they were in «الكل» only) and are shown
         in plain words, never as a raw event code; kinds the server filters exactly are still sent to the server. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT } from './harness.mjs';

const H = 36e5, DAY = 864e5;
const cp = (o) => JSON.parse(JSON.stringify(o));   /* vm values come from another realm */
function admin(state = {}, { tz } = {}) {
  const owner = { id: 'TEST_ONLY_su', role: 'super', un: '9000002000', name: 'TEST_ONLY owner' };
  const fetched = [];
  const KIVO = {
    BassamPageKit: { base: () => class {} },
    BassamAuth: { user: () => owner, users: () => [owner], usersVer: () => 1, isSuper: () => true },
    BassamDepts: { active: () => 'TEST_ONLY_d', list: () => [] },
    BassamLink: { get: () => 'on' },
    BassamFind: { dig: (s) => String(s) },
  };
  const ctx = { KIVO, DCLogic: class {}, console, setTimeout, clearTimeout, __BS_BOOT: { cf: 1, srv: 1 }, localStorage: { getItem: () => null }, document: { hidden: false, querySelector: () => null }, location: { hash: '#/sysadmin/sec' } };
  ctx.Date = Date;
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/services/440-count.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/modules/admin/logic.js'), 'utf8') + '\nglobalThis.TEST_ONLY_Admin=Component;', ctx);
  const page = Object.create(ctx.TEST_ONLY_Admin.prototype);
  page.state = Object.assign({ admTab: 'sec', adOv: { ok: 1 }, adSecPeriod: 'today', adSecKind: 'all' }, state);
  page.setState = function (v, cb) { Object.assign(this.state, v); cb && cb(); };
  page._fullStamp = () => ''; page._expInfo = () => ({}); page.adUsersVals = () => ({});
  page.adOnSrv = () => true; page._adRetry = () => {};
  page.adFetch = (u) => (fetched.push(u), Promise.resolve({ ok: 1, rows: [] }));
  return { page, fetched };
}
const since = (u) => Number(/[?&]since=(\d+)/.exec(u)[1]);
const secUrl = (f) => f.fetched.filter((u) => u.startsWith('/api/sec?limit=')).pop();

/* ── (d) ── */
test('(d) «آخر الحسابات المضافة — آخر ٧ أيام» lists the last 7 days only', () => {
  const now = Date.now(), tg = (n) => ({ id: 'TEST_ONLY_a' + n, name: 'TEST_ONLY a' + n, role: 'staff' });
  const added = [1, 6.9, 7.1, 20, 29].map((d, i) => ({ ts: now - d * DAY, by: 'TEST_ONLY owner', tg: tg(i), lastLogin: 0 }));
  const { page } = admin({ admTab: 'overview', adOv: { ok: 1, added } });
  const v = page.adVals();
  assert.deepEqual(v.ovAdded.map((r) => r.name), ['TEST_ONLY a0', 'TEST_ONLY a1'], 'only the accounts added in the last 7 days');
  assert.equal(v.ovAddedN, 'حسابان');
  const view = fs.readFileSync(path.join(ROOT, 'src/modules/admin/view.html'), 'utf8');
  assert.match(view, /<b>آخر الحسابات المضافة<\/b><small>آخر ٧ أيام · \{\{ovAddedN\}\}<\/small>/, 'the label is unchanged and now true');
  const old = admin({ admTab: 'overview', adOv: { ok: 1, added: added.slice(2) } }).page.adVals();
  assert.equal(old.ovAddedEmpty, true, '«لم يُضَف حساب خلال ٧ أيام» when the only additions are older');
});

/* ── (e) ── */
test('(e) «اليوم» starts at midnight Asia/Riyadh (UTC+3) whatever the browser time zone', () => {
  const { page } = admin();
  for (const [iso, want] of [
    ['2026-11-06T00:30:00Z', '2026-11-05T21:00:00Z'],   // 03:30 Riyadh → that Riyadh day began 21:00Z the day before
    ['2026-11-05T20:59:00Z', '2026-11-04T21:00:00Z'],   // 23:59 Riyadh
    ['2026-11-05T21:00:00Z', '2026-11-05T21:00:00Z'],   // exactly Riyadh midnight
    ['2026-11-06T12:00:00Z', '2026-11-05T21:00:00Z'],
  ]) assert.equal(new Date(page._adDay0(Date.parse(iso))).toISOString(), new Date(want).toISOString(), iso);
  const now = Date.now(), d0 = page._adDay0(now);
  assert.ok(d0 <= now && now - d0 < DAY && ((d0 + 3 * H) % DAY) === 0, 'a Riyadh midnight within the last 24 h');
});

test('(e) the security-log request for «اليوم» uses that boundary; 7 / 30 days are rolling; the chips say what they mean', async () => {
  const f = admin({ adSecPeriod: 'today' });
  f.page.adLoad(true); await new Promise((r) => setImmediate(r));
  const t0 = since(secUrl(f));
  assert.equal(t0, f.page._adDay0(Date.now()), 'since = the Riyadh day start');
  assert.equal((t0 + 3 * H) % DAY, 0, 'since = midnight Riyadh');
  for (const [p, d] of [['7d', 7], ['30d', 30]]) {
    const g = admin({ adSecPeriod: p }); const t = Date.now(); g.page.adLoad(true);
    assert.ok(Math.abs(t - d * DAY - since(secUrl(g))) < 5000, p + ' is rolling');
  }
  const v = admin().page.adVals();
  assert.deepEqual(cp(v.secPeriods.map((x) => [x.t, x.tip])), [['اليوم', 'منذ منتصف الليل بتوقيت الرياض'], ['٧ أيام', 'آخر ٧ أيام حتى الآن'], ['٣٠ يوماً', 'آخر ٣٠ يوماً حتى الآن']]);
  const view = fs.readFileSync(path.join(ROOT, 'src/modules/admin/view.html'), 'utf8');
  assert.match(view, /<sc-for list="\{\{secPeriods\}\}"[^>]*><span onClick="\{\{k\.go\}\}" title="\{\{k\.tip\}\}"/);
  const ov = admin({ admTab: 'overview', adOv: { ok: 1, failsToday: 2, deniedToday: 1 } }).page.adVals();
  const card = ov.ovCards.find((c) => c.l === 'محاولات دخول فاشلة اليوم');
  assert.equal(card.go && typeof card.go, 'function');
  assert.match(view, /«اليوم» في بطاقتي المحاولات الفاشلة والكتابات المرفوضة يعدّه الخادم من الثالثة فجراً بتوقيت الرياض، وفلتر «اليوم» في سجل الأمن يبدأ من منتصف الليل بتوقيت الرياض/,
    'the overview says where the server-counted «اليوم» starts (server unchanged) and where the log filter starts');
});

/* ── (f) ── */
const ROWS = ['login_ok', 'login_fail', 'recover_ok', 'recover_fail', 'recovery_key', 'reset', 'authz_unavailable', 'policy_change', 'pw_change', 'acct_add', 'perm_change', 'denied', 'sess_kill', 'TEST_ONLY_unknown']
  .map((act, i) => ({ id: i + 1, ts: Date.now() - i * 1000, act, uid: 'TEST_ONLY_su', un: '9000002000', detail: act === 'reset' ? '{"newAdmin":"TEST_ONLY n"}' : '', target: '' }));
test('(f) recovery, reset and authz_unavailable events are reachable under their kind (not only «الكل»)', async () => {
  const kinds = cp(admin().page.adVals().secKinds.map((k) => k.t));
  assert.deepEqual(kinds, ['الكل', 'دخول', 'كلمات مرور', 'حسابات', 'صلاحيات', 'مرفوض', 'مسؤول المنصة', 'تعذّر التحقق']);
  const under = (kind) => { const { page } = admin({ adSecKind: kind, adSec: ROWS }); return cp(page._adSecRows().map((r) => r.act)); };
  assert.ok(['recover_ok', 'recover_fail'].every((a) => under('login').includes(a)), 'login-screen recovery under «دخول»');
  assert.ok(['recovery_key', 'reset', 'policy_change'].every((a) => under('admin').includes(a)), 'recovery key and reset under «مسؤول المنصة»');
  assert.deepEqual(under('authz'), ['authz_unavailable']);
  const KK = cp(admin().page._adSecKind()), every = new Set(Object.values(KK).flatMap((k) => k.acts));   /* kinds the server filters are not re-filtered here */
  assert.deepEqual(ROWS.map((r) => r.act).filter((a) => !every.has(a)), ['TEST_ONLY_unknown'], 'every known event has a kind');
  /* the request: kinds the server filters exactly are sent; the others read everything in the period and filter here */
  for (const [k, sent] of [['pw', true], ['acct', true], ['perm', true], ['denied', true], ['login', false], ['admin', false], ['authz', false], ['all', false]]) {
    const f = admin({ adSecKind: k }); f.page.adLoad(true);
    assert.equal(/&kind=/.test(secUrl(f)), sent, k + (sent ? ' sent to the server' : ' filtered in the browser'));
  }
  /* the server filter lists (063 /api/sec) are exactly the ones marked srv */
  const W = fs.readFileSync(path.join(ROOT, 'workers/parts/063-enf-api-and-handler.js'), 'utf8');
  const lit = /var acts = (\{ login:[^}]+\})\[kind\]/.exec(W)[1];   /* a plain object literal of string arrays in the worker source → JSON */
  const srv = JSON.parse(lit.replace(/'/g, '"').replace(/([{,]\s*)([a-z]+):/g, '$1"$2":'));
  const K = admin().page._adSecKind();
  for (const k of Object.keys(K)) if (K[k].srv) assert.deepEqual(cp(K[k].acts), srv[k], k + ' = the server list');
  for (const k of Object.keys(srv)) assert.ok(srv[k].every((a) => K[k].acts.includes(a)), k + ' keeps every server event');
});

test('(f) plain labels: authz_unavailable and unknown events are never shown as a raw event code', () => {
  const { page } = admin({ adSec: ROWS, adSecKind: 'all' });
  const rows = page.adVals().secRows;
  assert.equal(rows.length, ROWS.length);
  rows.forEach((r, i) => assert.ok(!/[a-z]+_[a-z]+/.test(r.txt) && r.txt !== ROWS[i].act, ROWS[i].act + ' → «' + r.txt + '»'));
  assert.match(page.adSecTxt({ act: 'authz_unavailable' }).t, /تعذّر على الخادم التحقق من الصلاحيات/);
  assert.equal(page.adSecTxt({ act: 'TEST_ONLY_unknown' }).t, 'حدث أمني آخر');
  /* the CSV export follows the same kind filter as the list */
  const g = admin({ adSec: ROWS, adSecKind: 'authz' });
  assert.deepEqual(cp(g.page._adSecRows().map((r) => r.act)), ['authz_unavailable']);
  const L = fs.readFileSync(path.join(ROOT, 'src/modules/admin/logic.js'), 'utf8');
  assert.match(L, /adSecExport\(\) \{\r?\n\s*const t = this\._adSecRows\(\),/);
});
