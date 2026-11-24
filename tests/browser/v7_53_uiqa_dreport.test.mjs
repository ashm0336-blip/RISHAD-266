/* V7 · 53 (uiqa) — التقرير اليومي في متصفحٍ حقيقي (المختبرُ المعزول · العاملُ الحقيقي · الإنفاذ · مدير الإدارة أ · TEST_ONLY).
   البند 7: عمودُ «الحالة» في الكشف يقرأ تأشيرَ تقرير اليوم (كنافذة الموظف والتصدير): حاضرٌ خارج ساعات ورديته «حاضر» لا «غير متاح».
   البند 8: تقريرُ ورديةٍ معتمد في يومٍ منقضٍ — زرُّ «فتح للتعديل» ظاهرٌ لمن يعتمد، وتأكيدُه وحده (بلا سبب) يفتح التقرير ويومَه. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';
import { replaceOperationalFixture, inspectOperationalFixture } from '../unit/operational_legacy_seed_fx.mjs';
import { present, openRoute, today, logicOf } from '../removal/boundary_fx.mjs';

const A = 'TEST_ONLY_A', SHIFT = 'TEST_ONLY_S', H = today(), YM = H.y + '-' + H.m, DAY = YM + '-' + H.d;
const PD = H.d > 1 ? H.d - 1 : null, PDAY = PD ? YM + '-' + PD : null;
const EMPS = [1, 2, 3].map((i) => ({ eid: 'TEST_ONLY_eA' + i, name: 'TEST_ONLY موظف أ' + i, nid: '12000000' + String(i).padStart(2, '0') }));
/* نافذةُ الوردية لا تشمل الساعةَ الآن (الرياض) */
const hNow = +new Intl.DateTimeFormat('en-u-nu-latn', { timeZone: 'Asia/Riyadh', hour: 'numeric', hourCycle: 'h23' }).format(new Date());
const hh = (h) => String((h + 24) % 24).padStart(2, '0') + ':00', WIN = { tStart: hh(hNow + 3), tEnd: hh(hNow + 4) };
const setDay = (p, d) => p.evaluate(([y, m, d]) => { for (const el of document.querySelectorAll('main *')) { const fk = Object.keys(el).find((k) => k.indexOf('__reactFiber') === 0); let f = fk ? el[fk] : null; while (f && !(f.stateNode && f.stateNode.logic && typeof f.stateNode.logic.rpSetLeader === 'function')) f = f.return; if (f) { f.stateNode.logic.setState({ rpY: y, rpM: m, rpD: d }); return true; } } return false; }, [H.y, H.m, d]);
const shift = (ap) => ({ pulled: true, roster: EMPS.map((e) => ({ ekey: e.eid, name: e.name, st: 'pr' })), leaders: { chief: '', deputy: '' }, def: Object.assign({ color: '#b99751' }, WIN), ...(ap ? { ap: 1, apBy: 'TEST_ONLY', apAt: '2026-01-01T00:00:00.000Z' } : {}) });

for (const item of [7, 8]) test('V7 · 53 — ' + (item === 7 ? 'البند 7: «الحالة» حاضر لا «غير متاح»' : 'البند 8: فتحُ تقريرٍ معتمد في يومٍ منقضٍ بزرٍّ ظاهر وتأكيدٍ وحده'), { timeout: 420000, skip: !present('dreport') || !present('staff') }, async () => {
  const lab = await startLab();
  await replaceOperationalFixture(lab.env, 'bsdept:' + A + ':bassam_employees_v1', EMPS);
  await replaceOperationalFixture(lab.env, 'bsdept:' + A + ':bassam_staffing_v3', { [YM]: Object.assign({ __shifts: [Object.assign({ name: SHIFT, color: '#b99751' }, WIN)] }, Object.fromEntries(EMPS.map((e) => [e.eid, { shift: SHIFT }]))) });
  const R0 = { [DAY]: { created: 1, shifts: { [SHIFT]: shift(false) } } }; if (PDAY) R0[PDAY] = { created: 1, shifts: { [SHIFT]: shift(true) } };
  await replaceOperationalFixture(lab.env, 'bsdept:' + A + ':bassam_dreport_v1', R0);
  const b = await chromium.launch();
  try {
    const s = await openAs(b, lab, LAB.mgrA, LAB.pw), p = s.page; p.setDefaultTimeout(30000);
    await openRoute(s, present('daily') ? '#/daily/dreport' : '#/dreport');
    await logicOf(p, 'rpSetLeader');
    /* ── البند 7 ── */
    if (item === 7) {
    const cells = () => p.evaluate(() => [...document.querySelectorAll('main td[data-label="الحالة"]')].map((td) => td.textContent.replace(/\s+/g, ' ').trim()));
    let c = []; for (let i = 0; i < 80 && c.length < 3; i++) { c = await cells(); if (c.length < 3) await p.waitForTimeout(250); }
    assert.equal(c.length, 3, 'the sheet lists the three employees: ' + JSON.stringify(c));
    for (const t of c) { assert.doesNotMatch(t, /غير متاح/, 'a present employee outside his shift hours is not «غير متاح»: ' + t); assert.match(t, /حاضر/, t); }
    }
    /* ── البند 8 ── */
    if (item === 8) {
    if (!PDAY) { test.diagnostic('first day of the month: item 8 needs a past day in the current month — skipped this run'); return; }
    assert.equal(await setDay(p, PD), true);
    const btn = p.locator('main button[title*="معتمد ومقفل — اضغط لفتحه للتعديل"]:visible');
    await btn.first().waitFor({ timeout: 20000 });
    await btn.first().click();
    const ok = p.locator('button:visible', { hasText: 'فتح للتعديل' }); await ok.first().waitFor();
    assert.equal(await p.locator('textarea:visible, input[placeholder*="السبب"]:visible').count(), 0, 'confirm only — no reason asked');
    const res = p.waitForResponse((r) => /\/api\/save/.test(r.url()) && r.request().method() === 'POST');
    await ok.first().click();
    const r = await res; assert.equal(r.status(), 200, 'accepted: ' + (await r.text()).slice(0, 300));
    await lab.idle();
    const R = inspectOperationalFixture(lab.env, 'bsdept:' + A + ':bassam_dreport_v1');
    assert.ok(!R[PDAY].shifts[SHIFT].ap, 'the shift report is reopened');
    assert.equal(((R['m:' + YM] || {}).dopen || {})[PD], 1, 'and its past day is opened with it');
    }
    assert.deepEqual(s.errs, [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});
