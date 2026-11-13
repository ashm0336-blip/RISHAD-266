/* V7 UX states · owner condition 5 — a nomination form being filled is NOT cleared when a refresh happens (lab: TEST_ONLY data).
   On develop@5add483 a refresh (a colleague's change arriving, a confirmed save) hid the whole tab — the wizard included — behind
   the loading bar until the re-read came back. Now, in a real browser over the built package:
   · the typed values stay on screen and editable during the refresh, the refresh line and badge show, nothing is disabled;
   · the save guards are exactly as before: while the re-read is in flight nothing is «confirmed» (no stamp base) and a save is
     refused with its existing message before any request is sent;
   · after the re-read the same values are still there and the guards pass again;
   · a re-read that FAILS (owner decision): the form stays on screen with its values, still editable, under the component strip
     «تعذّر التحديث — المعروض قد لا يكون الأحدث» with «أعد المحاولة» — no failure card in place of the form; the guards refuse
     as during a refresh; the button re-reads and the strip leaves. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const CAP = ['tasks', 'daily', 'dreport', 'admin', 'emps', 'dstats', 'staff', 'plan', 'planning', 'irshad', 'seized', 'award', 'links', 'help'];
async function widen(lab) {   /* the lab department gets the award page in its ceiling (TEST_ONLY data) */
  const P = JSON.parse(lab.env.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', 'bassam_perms_v1').map((r) => r.v).join(''));
  for (const d of Object.keys(P.caps)) P.caps[d] = CAP;
  await lab.env.DB.batch([lab.env.DB.prepare('DELETE FROM kv WHERE k=?1').bind('bassam_perms_v1'), ...lab.W.kvPutStmts(lab.env, 'kv', 'bassam_perms_v1', JSON.stringify(P)),
    lab.env.DB.prepare('INSERT INTO revs (k, rev) VALUES (?1, 1) ON CONFLICT(k) DO UPDATE SET rev=rev+1').bind('bassam_perms_v1')]);
}
const PHONE = 'input[placeholder="05XXXXXXXX"]', MAIL = 'input[placeholder="name@example.gov.sa"]', WORK = 'textarea';
const form = (page) => page.evaluate(([P, M, W]) => {
  const main = document.querySelector('main.bs-main'), v = (s) => { const e = main.querySelector(s); return e ? { value: e.value, disabled: e.disabled, shown: e.getBoundingClientRect().height > 0 } : null; };
  const ps = [...main.querySelectorAll('.ps')].filter((e) => !e.hidden).map((e) => e.getAttribute('data-ps'));
  return { phone: v(P), mail: v(M), work: v(W), states: ps, badge: (main.querySelector('.ps-badge') || {}).textContent || '', bar: [...main.querySelectorAll('.ps-bar')].map((e) => e.textContent.trim()),
    inert: !!main.querySelector('[inert]'), busyBlock: getComputedStyle(main).pointerEvents };
}, [PHONE, MAIL, WORK]);
/* the page's own logic instance (through the React fibre of its host) — to read its guards exactly as a save would */
const guards = (page) => page.evaluate(async () => {
  const host = document.querySelector('.sc-host[data-sc-name="Award"]'), key = Object.keys(host).find((k) => k.startsWith('__reactFiber$'));
  let f = host[key]; while (f && !(f.stateNode && f.stateNode.logic && f.stateNode.logic._bcMutate)) f = f.return;
  const L = f.stateNode.logic, stamp = L._bcStamp(), result = await L._bcMutate('create', { data: {} });
  return { confirmed: !!L._bcData('records'), base: stamp ? !!stamp.base : null, ok: result.ok, err: result.err, message: result.message };
});

test('award: the nomination form being filled survives a refresh; the save guards still refuse during it', { timeout: 300000 }, async () => {
  const lab = await startLab(); await widen(lab); const b = await chromium.launch(); let s = null;
  try {
    s = await openAs(b, lab, LAB.mgrA, LAB.pw); const page = s.page; page.setDefaultTimeout(20000);
    const gate = { slow: false, reads: 0 };
    await page.route('**/api/award**', async (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      gate.reads++; if (gate.fail) return route.abort('failed').catch(() => {});
      if (gate.slow) await new Promise((r) => setTimeout(r, 5000));
      return route.continue().catch(() => {});
    });
    await s.go('#/award/new', 3500);
    await page.getByText('فئة العمل المتميز').first().click();
    await page.getByRole('button', { name: 'التالي' }).click();
    await page.waitForSelector('main ' + PHONE);
    await page.fill('main ' + PHONE, '0500000001'); await page.fill('main ' + MAIL, 'TEST_ONLY@example.gov.sa'); await page.locator('main ' + WORK).first().fill('TEST_ONLY وصف العمل المتميز');
    await page.waitForTimeout(300);
    const before = await form(page);
    assert.equal(before.phone.value, '0500000001'); assert.equal(before.work.value, 'TEST_ONLY وصف العمل المتميز'); assert.deepEqual(before.states, [], 'no state shown when idle');

    /* a colleague's change arrives ⇒ the page re-reads (slowed to 5 s here) */
    gate.slow = true; const reads = gate.reads; const posts = s.writes.length;
    await page.evaluate(() => { const d = window.KIVO.BassamDepts.active(); window.dispatchEvent(new CustomEvent('bassam:remote', { detail: { keys: ['bsdept:' + d + ':bassam_award_v1'] } })); });
    await page.waitForTimeout(1200);
    assert.ok(gate.reads > reads, 'the refresh re-read is in flight');
    const during = await form(page);
    assert.ok(during.phone && during.phone.shown, 'the form is still on screen during the refresh');
    assert.equal(during.phone.value, '0500000001'); assert.equal(during.mail.value, 'TEST_ONLY@example.gov.sa'); assert.equal(during.work.value, 'TEST_ONLY وصف العمل المتميز');
    assert.equal(during.phone.disabled, false); assert.equal(during.work.disabled, false); assert.equal(during.inert, false, 'nothing is disabled or blocked');
    assert.deepEqual(during.states, ['refreshing']); assert.equal(during.badge, 'يُحدَّث من الخادم'); assert.deepEqual(during.bar, [], 'the notice bar says nothing about loading');
    await page.locator('main ' + WORK).first().pressSequentially(' — تكملة');                      // typing goes on during the refresh
    assert.equal((await form(page)).work.value, 'TEST_ONLY وصف العمل المتميز — تكملة');
    /* the guards during the refresh: nothing confirmed, no stamp base, the save refused before any request — as on develop */
    const g = await guards(page);
    assert.deepEqual(g, { confirmed: false, base: false, ok: 0, err: 'invalid', message: 'لم يصل تأكيد كامل من الخادم؛ أعد الإجراء نفسه لتأكيد طلبك' });
    assert.equal(s.writes.length, posts, 'no save request left the browser during the refresh');

    gate.slow = false;
    await page.waitForFunction(() => ![...document.querySelectorAll('main .ps')].some((e) => !e.hidden), null, { timeout: 15000 });
    const after = await form(page);
    assert.equal(after.phone.value, '0500000001'); assert.equal(after.mail.value, 'TEST_ONLY@example.gov.sa'); assert.equal(after.work.value, 'TEST_ONLY وصف العمل المتميز — تكملة');
    assert.deepEqual(after.states, []);
    const ok = await page.evaluate(() => { const host = document.querySelector('.sc-host[data-sc-name="Award"]'), key = Object.keys(host).find((k) => k.startsWith('__reactFiber$'));
      let f = host[key]; while (f && !(f.stateNode && f.stateNode.logic && f.stateNode.logic._bcMutate)) f = f.return; const L = f.stateNode.logic; return { confirmed: !!L._bcData('records'), base: !!L._bcStamp().base }; });
    assert.deepEqual(ok, { confirmed: true, base: true }, 'after the re-read the guards pass again');

    /* the re-read fails while the form is open */
    gate.fail = true; const posts2 = s.writes.length;
    await page.evaluate(() => { const d = window.KIVO.BassamDepts.active(); window.dispatchEvent(new CustomEvent('bassam:remote', { detail: { keys: ['bsdept:' + d + ':bassam_award_v1'] } })); });
    await page.waitForSelector('main .ps-stale', { timeout: 15000 });
    const stale = await form(page), strip = await page.evaluate(() => { const e = document.querySelector('main .ps-stale'); return { text: e.querySelector('span').textContent, buttons: [...e.querySelectorAll('button')].map((x) => x.textContent), role: e.getAttribute('role'), cards: document.querySelectorAll('main .ps-card.ps-fail').length }; });
    assert.deepEqual(strip, { text: 'تعذّر التحديث — المعروض قد لا يكون الأحدث', buttons: ['أعد المحاولة'], role: 'alert', cards: 0 }, 'the strip, and no failure card');
    assert.deepEqual(stale.states, ['stale']);
    assert.ok(stale.phone && stale.phone.shown && stale.work.shown, 'the form stays on screen when the re-read fails');
    assert.equal(stale.phone.value, '0500000001'); assert.equal(stale.mail.value, 'TEST_ONLY@example.gov.sa'); assert.equal(stale.work.value, 'TEST_ONLY وصف العمل المتميز — تكملة');
    assert.equal(stale.phone.disabled, false); assert.equal(stale.work.disabled, false); assert.equal(stale.inert, false);
    await page.locator('main ' + WORK).first().pressSequentially(' ٢');                              // still editable
    assert.equal((await form(page)).work.value, 'TEST_ONLY وصف العمل المتميز — تكملة ٢');
    const g2 = await guards(page);
    assert.deepEqual(g2, { confirmed: false, base: false, ok: 0, err: 'invalid', message: 'لم يصل تأكيد كامل من الخادم؛ أعد الإجراء نفسه لتأكيد طلبك' }, 'nothing is confirmed on stale content');
    assert.equal(s.writes.length, posts2, 'no save request left the browser');
    gate.fail = false; const reads2 = gate.reads;
    await page.locator('main .ps-stale button').click();
    await page.waitForFunction(() => ![...document.querySelectorAll('main .ps')].some((e) => !e.hidden), null, { timeout: 15000 });
    assert.ok(gate.reads > reads2, 'the retry re-reads');
    const healed = await form(page); assert.deepEqual(healed.states, []); assert.equal(healed.work.value, 'TEST_ONLY وصف العمل المتميز — تكملة ٢');
    assert.deepEqual(s.errs, [], 'no page errors');
  } finally { try { if (s) await s.ctx.close(); } catch (e) { /* closed */ } await b.close(); await lab.close(); }
});
