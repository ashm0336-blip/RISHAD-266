/* RISHAD-266 · the daily «no backup for 7 days» check (sy_nobk) with a fixed test clock (Asia/Riyadh), before and after 08:00.
   Opening the platform writes nothing: the device no longer writes bassam_first_boot_v1, and the platform start is read from the
   server (GET /api/aud?first=1, platform administrator only). The alert still fires when there is data, no backup and the platform is
   7+ days old, once per day. Pages opened by the administrator and a manager save nothing. Lab: TEST_ONLY data, no network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const H = 3600e3, DAY = 24 * H;
/* epoch ms of hh:mm Riyadh time (UTC+3, no DST), `days` from today */
const riyadh = (hh, mm, days = 0) => { const d = new Date(Date.now() + 3 * H); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hh, mm) - 3 * H + days * DAY; };

/* every non-GET request: only sign-in, the administrator's security-log poll and the alert itself are allowed — no data save */
const ALLOWED = /^(POST \/api\/login|POST \/api\/notifications\/act op=(security-poll|emit:sy_nobk))$/;
function watch(page) {
  const w = { writes: [], first: 0, nobk: 0 };
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.pathname === '/api/aud' && u.searchParams.get('first') === '1') w.first++;
    if (r.method() === 'GET' || r.method() === 'HEAD') return;
    let j = {}; try { j = JSON.parse(r.postData() || '{}'); } catch (e) { j = { op: 'unparsable' }; }
    const ev = j.op === 'emit-batch' ? j.events || [] : j.op === 'emit' ? [j] : [];
    w.nobk += ev.filter((e) => e && e.type === 'sy_nobk').length;
    const op = j.op === 'emit' || j.op === 'emit-batch' ? 'emit:' + ev.map((e) => e && e.type).join('+') : j.op;
    w.writes.push(r.method() + ' ' + u.pathname + (op ? ' op=' + op : '') + (j.set ? ' set=' + Object.keys(j.set).join('|') : '') + (j.del && j.del.length ? ' del=' + j.del.join('|') : ''));
  });
  return w;
}
const unexpected = (w) => w.writes.filter((x) => !ALLOWED.test(x));
async function open(b, lab, at, un = LAB.superUn, pw = LAB.superPw) {
  let w; const s = await openAs(b, lab, un, pw, { context: { timezoneId: 'Asia/Riyadh' }, onPage: async (p) => { w = watch(p); await p.clock.setSystemTime(at); } });
  await s.page.waitForTimeout(9000);   /* the observer's first check runs 6 s after load */
  const hour = await s.page.evaluate(() => new Date().getHours());
  return { s, w, hour };
}

test('sy_nobk: no write on open before or after 08:00; cloud start reference (reset-aware); alert after 7 days, once a day', { timeout: 420000 }, async () => {
  const lab = await startLab(), DB = lab.env.DB, W = lab.W, env = lab.env;
  /* as on Test: the permissions lens mark is already set (that read-time permStore upgrade is unrelated — client_migrations_gone does the same) */
  const pm = JSON.parse(DB.q("SELECT v FROM kv WHERE k='bassam_perms_v1' ORDER BY seq").map((r) => r.v).join('')); pm.lensZ = 1;
  await DB.batch([DB.prepare("DELETE FROM kv WHERE k='bassam_perms_v1'"), ...W.kvPutStmts(env, 'kv', 'bassam_perms_v1', JSON.stringify(pm)), DB.prepare("UPDATE revs SET rev=rev+1 WHERE k='bassam_perms_v1'")]);
  /* the platform's own history, seeded explicitly: an event 400 days ago, then a reset (تهيئة) an hour ago — the log survives a reset */
  const aud = (cid, ts, act) => DB.prepare("INSERT INTO aud (cid, ts, uid, un, dept, k, rev, etype, eid, ename, act) VALUES (?1, ?2, 'su', 'TEST_ONLY', '', 'system', 0, 'system', 'platform', 'المنصة', ?3)").bind(cid, ts, act);
  await DB.batch([aud('TEST_ONLY_old', Date.now() - 400 * DAY, 'set'), aud('TEST_ONLY_reset', Date.now() - H, 'reset')]);
  const msgs = () => DB.q("SELECT COUNT(*) n FROM notification_messages WHERE type='sy_nobk'")[0].n;
  const bootKeys = () => DB.q("SELECT COUNT(*) n FROM kv WHERE k LIKE '%bassam_first_boot_v1'")[0].n;
  const b = await chromium.launch();
  try {
    /* today 07:30 — before the daily check: nothing read, nothing written */
    let o = await open(b, lab, riyadh(7, 30));
    assert.equal(o.hour, 7, 'fixed clock: 07:xx Riyadh');
    assert.deepEqual(unexpected(o.w), [], '07:30: no data saved on open'); assert.equal(o.w.first, 0, '07:30: no check yet'); assert.equal(o.w.nobk, 0);
    await o.s.ctx.close();
    /* today 08:30 — the check runs: reads the platform start from the server (the reset an hour ago, not the 400-day-old history), writes nothing ⇒ no alert */
    o = await open(b, lab, riyadh(8, 30));
    assert.equal(o.hour, 8, 'fixed clock: 08:xx Riyadh');
    assert.deepEqual(unexpected(o.w), [], '08:30: no data saved on open (before the fix: bsdept:…:bassam_first_boot_v1)');
    assert.equal(o.w.first, 1, '08:30: platform start read once from the server'); assert.equal(o.w.nobk, 0, 'reset an hour ago: no alert (the 400-day-old history does not count)');
    /* the administrator's pages: opening them saves nothing either */
    for (const h of ['#/kpis', '#/tasks', '#/employees', '#/daily', '#/staffing', '#/plan', '#/admin', '#/sysadmin', '#/profile']) await o.s.go(h, 3000);
    assert.deepEqual(unexpected(o.w), [], 'administrator pages: no data saved'); assert.equal(o.w.first, 1, 'read once per session, kept in memory');
    assert.deepEqual(o.s.errs, [], 'no page errors');
    await o.s.ctx.close();
    assert.equal(msgs(), 0);
    /* ten days later, 08:30 — data, no backup, 10 days since the reset ⇒ the alert fires, still without any save */
    o = await open(b, lab, riyadh(8, 30, 10));
    assert.deepEqual(unexpected(o.w), [], '+10 d 08:30: no data saved'); assert.equal(o.w.nobk, 1, 'alert emitted'); await lab.idle();
    assert.equal(msgs(), 1, 'one sy_nobk message on the server');
    await o.s.page.reload({ waitUntil: 'domcontentloaded' }); await o.s.page.waitForTimeout(9000); await lab.idle();
    assert.equal(msgs(), 1, 'same day again: de-duplicated (once per day)');
    await o.s.ctx.close();
    /* ten days later, 07:30 — before the daily check: no alert */
    o = await open(b, lab, riyadh(7, 30, 10));
    assert.equal(o.w.nobk, 0, '+10 d 07:30: no alert before 08:00'); assert.equal(o.w.first, 0); assert.deepEqual(unexpected(o.w), []);
    await o.s.ctx.close();
    /* a department manager after 08:00: not the administrator's check, nothing saved */
    o = await open(b, lab, riyadh(8, 30, 10), LAB.mgrA, LAB.pw);
    for (const h of ['#/kpis', '#/tasks', '#/employees', '#/daily']) await o.s.go(h, 3000);
    assert.equal(o.w.first, 0, 'manager: no platform-start read'); assert.deepEqual(unexpected(o.w), [], 'manager pages: no data saved'); assert.deepEqual(o.s.errs, []);
    await o.s.ctx.close();
    /* a platform never reset, with 400 days of history and no backup: today 08:30 ⇒ the alert fires (a new day, a new message) */
    await DB.batch([DB.prepare("DELETE FROM aud WHERE cid='TEST_ONLY_reset'")]);
    o = await open(b, lab, riyadh(8, 30));
    assert.equal(o.w.first, 1); assert.equal(o.w.nobk, 1, 'old platform without backup: alert'); assert.deepEqual(unexpected(o.w), []); await lab.idle();
    assert.equal(msgs(), 2, 'one message per day');
    await o.s.ctx.close();
    assert.equal(bootKeys(), 0, 'bassam_first_boot_v1 never written');
  } finally { await b.close(); await lab.close(); }
});
