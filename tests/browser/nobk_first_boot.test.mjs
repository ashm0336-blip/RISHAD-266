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

function watch(page) {
  const w = { saves: [], first: 0, nobk: 0 };
  page.on('request', (r) => {
    const u = r.url();
    if (/\/api\/aud\?first=1/.test(u)) w.first++;
    if (r.method() !== 'POST') return;
    let j = {}; try { j = JSON.parse(r.postData() || '{}'); } catch (e) { j = { set: { unparsable: 1 } }; }
    if (/\/api\/save\b/.test(u)) { const keys = Object.keys(j.set || {}).concat((j.del || []).map((k) => 'del:' + k)); if (keys.length) w.saves.push(keys.join(',')); }
    if (/\/api\/notifications\/act\b/.test(u)) { const ev = j.op === 'emit-batch' ? j.events || [] : [j]; w.nobk += ev.filter((e) => e && e.type === 'sy_nobk').length; }
  });
  return w;
}
async function open(b, lab, at, un = LAB.superUn, pw = LAB.superPw) {
  let w; const s = await openAs(b, lab, un, pw, { context: { timezoneId: 'Asia/Riyadh' }, onPage: async (p) => { w = watch(p); await p.clock.setSystemTime(at); } });
  await s.page.waitForTimeout(9000);   /* the observer's first check runs 6 s after load */
  const hour = await s.page.evaluate(() => new Date().getHours());
  return { s, w, hour };
}

test('sy_nobk: no write on open before or after 08:00; cloud start reference; alert after 7 days, once a day', { timeout: 420000 }, async () => {
  const lab = await startLab(), DB = lab.env.DB, W = lab.W, env = lab.env;
  /* as on Test: the permissions lens mark is already set (that read-time permStore upgrade is unrelated — client_migrations_gone does the same) */
  const pm = JSON.parse(DB.q("SELECT v FROM kv WHERE k='bassam_perms_v1' ORDER BY seq").map((r) => r.v).join('')); pm.lensZ = 1;
  await DB.batch([DB.prepare("DELETE FROM kv WHERE k='bassam_perms_v1'"), ...W.kvPutStmts(env, 'kv', 'bassam_perms_v1', JSON.stringify(pm)), DB.prepare("UPDATE revs SET rev=rev+1 WHERE k='bassam_perms_v1'")]);
  const msgs = () => DB.q("SELECT COUNT(*) n FROM notification_messages WHERE type='sy_nobk'")[0].n;
  const bootKeys = () => DB.q("SELECT COUNT(*) n FROM kv WHERE k LIKE '%bassam_first_boot_v1'")[0].n;
  const b = await chromium.launch();
  try {
    /* today 07:30 — before the daily check: nothing read, nothing written */
    let o = await open(b, lab, riyadh(7, 30));
    assert.equal(o.hour, 7, 'fixed clock: 07:xx Riyadh');
    assert.deepEqual(o.w.saves, [], '07:30: no data saved on open'); assert.equal(o.w.first, 0, '07:30: no check yet'); assert.equal(o.w.nobk, 0);
    await o.s.ctx.close();
    /* today 08:30 — the check runs: reads the platform start from the server, writes nothing; the platform is new ⇒ no alert */
    o = await open(b, lab, riyadh(8, 30));
    assert.equal(o.hour, 8, 'fixed clock: 08:xx Riyadh');
    assert.deepEqual(o.w.saves, [], '08:30: no data saved on open (before the fix: bsdept:…:bassam_first_boot_v1)');
    assert.equal(o.w.first, 1, '08:30: platform start read once from the server'); assert.equal(o.w.nobk, 0, 'new platform: no alert');
    /* the administrator's pages: opening them saves nothing either */
    for (const h of ['#/kpis', '#/tasks', '#/employees', '#/daily', '#/staffing', '#/plan', '#/admin', '#/sysadmin', '#/profile']) await o.s.go(h, 3000);
    assert.deepEqual(o.w.saves, [], 'administrator pages: no data saved'); assert.equal(o.w.first, 1, 'read once per session, kept in memory');
    assert.deepEqual(o.s.errs, [], 'no page errors');
    await o.s.ctx.close();
    assert.equal(msgs(), 0);
    /* ten days later, 08:30 — data, no backup, platform 7+ days old ⇒ the alert fires, still without any save */
    o = await open(b, lab, riyadh(8, 30, 10));
    assert.deepEqual(o.w.saves, [], '+10 d 08:30: no data saved'); assert.equal(o.w.nobk, 1, 'alert emitted'); await lab.idle();
    assert.equal(msgs(), 1, 'one sy_nobk message on the server');
    await o.s.page.reload({ waitUntil: 'domcontentloaded' }); await o.s.page.waitForTimeout(9000); await lab.idle();
    assert.equal(msgs(), 1, 'same day again: de-duplicated (once per day)');
    await o.s.ctx.close();
    /* ten days later, 07:30 — before the daily check: no alert */
    o = await open(b, lab, riyadh(7, 30, 10));
    assert.equal(o.w.nobk, 0, '+10 d 07:30: no alert before 08:00'); assert.equal(o.w.first, 0); assert.deepEqual(o.w.saves, []);
    await o.s.ctx.close();
    /* a department manager after 08:00: not the administrator's check, nothing saved */
    o = await open(b, lab, riyadh(8, 30, 10), LAB.mgrA, LAB.pw);
    for (const h of ['#/kpis', '#/tasks', '#/employees', '#/daily']) await o.s.go(h, 3000);
    assert.equal(o.w.first, 0, 'manager: no platform-start read'); assert.deepEqual(o.w.saves, [], 'manager pages: no data saved'); assert.deepEqual(o.s.errs, []);
    await o.s.ctx.close();
    assert.equal(bootKeys(), 0, 'bassam_first_boot_v1 never written');
  } finally { await b.close(); await lab.close(); }
});
