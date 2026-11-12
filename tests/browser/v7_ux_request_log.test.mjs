/* V7 UX states · owner condition 1 — the UX-states work must not change WHAT is fetched: for the same scenario the API requests of
   a page (their number, their order, URL, method and body) are the same as on develop.
   Scenario per page (seized · award · one operational page: the monthly schedule), as the department manager in the isolated lab:
     first   — the page is opened by a full reload on its address;
     refresh — a colleague's change to the page's data arrives (the `bassam:remote` event the sync layer raises, with the page's key);
     return  — leave to another page and come back.
   Fixture: tests/browser/fixtures/v7_ux_request_log.develop.json — recorded by THIS test file on develop@5add483:
     git worktree add <dir> 5add483 && (cd <dir> && npm run -s build)
     KIVO_UX_RECORD=1 KIVO_WORKER=<dir>/workers/_worker.js KIVO_DIST=<dir>/pk265 KIVO_SRC=<dir>/src node --test tests/browser/v7_ux_request_log.test.mjs
   Kept out of the log, and why: the sync long-poll and presence beats (/api/changes · /api/presence — timer-driven, not page-driven),
   page-file and static assets (not API). No request in these scenarios carries a random value; the browser clock is pinned. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const FIXTURE = new URL('./fixtures/v7_ux_request_log.develop.json', import.meta.url);
const RECORD = process.env.KIVO_UX_RECORD === '1';
const PAGES = [['seized', '#/seized/records', 'bassam_seized_v1'], ['award', '#/award/new', 'bassam_award_v1'], ['staffing', '#/staffing', 'bassam_staffing_v1']];
const TIMER = /^\/api\/(?:changes|presence)\b/;
const CAP = ['tasks', 'daily', 'dreport', 'admin', 'emps', 'dstats', 'staff', 'plan', 'planning', 'irshad', 'seized', 'award', 'links', 'help'];
async function widen(lab) {   /* the lab departments get every page in their ceiling (TEST_ONLY data) so the manager can open seized and award */
  const P = JSON.parse(lab.env.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', 'bassam_perms_v1').map((r) => r.v).join(''));
  for (const d of Object.keys(P.caps)) P.caps[d] = CAP;
  await lab.env.DB.batch([lab.env.DB.prepare('DELETE FROM kv WHERE k=?1').bind('bassam_perms_v1'), ...lab.W.kvPutStmts(lab.env, 'kv', 'bassam_perms_v1', JSON.stringify(P)),
    lab.env.DB.prepare('INSERT INTO revs (k, rev) VALUES (?1, 1) ON CONFLICT(k) DO UPDATE SET rev=rev+1').bind('bassam_perms_v1')]);
}

async function record() {
  const lab = await startLab(); await widen(lab); const b = await chromium.launch(); const out = {};
  try {
    /* the browser clock is pinned (the calendar reads carry today's Hijri date in their query) */
    const s = await openAs(b, lab, LAB.mgrA, LAB.pw, { context: { timezoneId: 'Asia/Riyadh' }, onPage: (p) => p.clock.setSystemTime(new Date('2026-11-12T09:00:00+03:00')) }); const page = s.page; let log = [];
    page.on('request', (r) => { const u = new URL(r.url()); if (!u.pathname.startsWith('/api/') || TIMER.test(u.pathname)) return; log.push(r.method() + ' ' + u.pathname + u.search + (r.postData() ? ' ' + r.postData() : '')); });
    /* a phase ends when no API request has started for 2.5 s */
    const settle = async () => { let n = -1; while (n !== log.length) { n = log.length; await page.waitForTimeout(2500); } };
    const take = () => { const x = log; log = []; return x; };
    for (const [name, hash, key] of PAGES) {
      await page.evaluate(() => { history.replaceState(null, '', location.pathname + '#/links'); }); await page.reload({ waitUntil: 'domcontentloaded' }); await settle(); take();
      await page.evaluate((h) => { history.replaceState(null, '', location.pathname + h); }, hash); await page.reload({ waitUntil: 'domcontentloaded' }); await settle();
      const first = take();
      await page.evaluate((k) => { const d = window.KIVO.BassamDepts.active(); window.dispatchEvent(new CustomEvent('bassam:remote', { detail: { keys: ['bsdept:' + d + ':' + k] } })); }, key); await settle();
      const refresh = take();
      await page.evaluate(() => { location.hash = '#/links'; }); await settle(); take();
      await page.evaluate((h) => { location.hash = h; }, hash); await settle();
      out[name] = { first, refresh, return: take() };
    }
    assert.deepEqual(s.errs, [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
  return out;
}

test('the API requests of seized, award and the monthly schedule — number, order, URL, method, body — equal the develop recording', { timeout: 600000 }, async () => {
  const got = await record();
  if (RECORD) { fs.mkdirSync(new URL('./fixtures/', import.meta.url), { recursive: true }); fs.writeFileSync(FIXTURE, JSON.stringify(got, null, 1) + '\n'); return; }
  const want = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  for (const [name] of PAGES) for (const phase of ['first', 'refresh', 'return']) {
    assert.ok(want[name][phase].length > 0 || phase !== 'first', name + '/' + phase + ': the recording is not empty');
    assert.deepEqual(got[name][phase], want[name][phase], name + ' · ' + phase + ': same requests in the same order as develop');
  }
});
