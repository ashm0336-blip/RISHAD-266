/* V7 · 53 (uiqa) — S13 قواعدُ استدراك الجولات (المختبرُ المعزول · العاملُ الحقيقي · الإنفاذ · TEST_ONLY).
   (١) فتحُ يومٍ في شهرٍ ماضٍ مقفل كان يُحفظ «فتحَ اليوم» وحده بلا أثر (الشهرُ يبقى مقفلاً). الآن يفتح ما يلزمه: الشهرُ {mo:1} واليومُ معاً في حفظةٍ واحدة،
       ويقبلها الخادم، ويصير اليومُ قابلاً للتعديل، وتبقى أيامُ الشهر الأخرى مقفلة.
   (٢) اعتمادُ شهرٍ ماضٍ بلا جولات يُحذَّر منه في نافذة الاعتماد قبل الاعتماد. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, LAB, openAs, chromium, A, until } from './d7_cov_lib.mjs';

const T = (() => { const o = {}; new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date(Date.now() - 3 * 3600e3)).forEach((p) => { o[p.type] = p.value; }); return { y: parseInt(o.year, 10), m: +o.month }; })();
const PM = T.m === 1 ? { y: T.y - 1, m: 12 } : { y: T.y, m: T.m - 1 }, KR = 'bsdept:' + A + ':bassam_rounds_v1';
const L = `(() => { for (const h of document.querySelectorAll('.sc-host')) { const key = Object.keys(h).find((k) => k.startsWith('__reactFiber$')); let f = h[key]; while (f && !(f.stateNode && f.stateNode.logic && f.stateNode.logic._toggleDayLock)) f = f.return; if (f) return f.stateNode.logic; } return null; })()`;

test('S13 — فتحُ يومٍ في شهرٍ ماضٍ يفتح شهرَه معه · واعتمادُ شهرٍ بلا جولات يُحذَّر منه', { timeout: 300000 }, async () => {
  const lab = await world(), b = await chromium.launch();
  try {
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw), p = m.page; p.setDefaultTimeout(15000);
    await m.go('#/daily', 5000);
    await until(() => p.evaluate(`!!${L}`), 'the rounds page logic');
    const st0 = await p.evaluate(`(() => { const c = ${L}; return { mon: c.isMonthAp(c.state.rounds, ${PM.y}, ${PM.m}), day: c.dayLockedDS(c.state.rounds, ${PM.y}, ${PM.m}, 10) }; })()`);
    assert.deepEqual(st0, { mon: true, day: true }, 'the past month and its day 10 start locked');
    /* (١) */
    const res = p.waitForResponse((r) => /\/api\/save/.test(r.url()) && r.request().method() === 'POST');
    await p.evaluate(`${L}._toggleDayLock(${PM.y}, ${PM.m}, 10, false)`);
    const r = await res; assert.equal(r.status(), 200, 'the server accepts the save: ' + (await r.text()).slice(0, 300));
    await lab.idle();
    const g = await m.api('/api/operations/read?keys=' + encodeURIComponent(KR)), R = (g.j.resources || {})[KR] || {}, mk = 'm:' + PM.y + '-' + PM.m;
    assert.equal(R[mk] && R[mk].mo, 1, 'the month is opened for retro with the day: ' + JSON.stringify(R[mk]));
    assert.equal(R[mk].dopen && R[mk].dopen[10], 1, 'and the day itself');
    const st1 = await until(() => p.evaluate(`(() => { const c = ${L}; const s = c.state.rounds; return c.isMonthAp(s, ${PM.y}, ${PM.m}) ? null : { day10: c.dayLockedDS(s, ${PM.y}, ${PM.m}, 10), day11: c.dayLockedDS(s, ${PM.y}, ${PM.m}, 11) }; })()`), 'the page to see it');
    assert.deepEqual(st1, { day10: false, day11: true }, 'day 10 is editable, the other days stay locked');
    /* (٢) */
    await p.evaluate(`${L}.setState({ year: ${PM.y}, mLock2: { n: ${PM.m}, locked: false } })`);
    const txt = await until(() => p.evaluate(() => { const t = document.body.innerText; return /اعتماد الشهر وإغلاقه/.test(t) ? t : ''; }), 'the approve dialog');
    assert.match(txt, /لا جولات مسجّلة في هذا الشهر/, 'the warning before approving an empty month');
    assert.deepEqual(m.errs, []);
  } finally { await b.close(); await lab.close(); }
});

/* S13 في الخادم: حفظٌ يفتح يوماً وحده (dopen) في شهرٍ ماضٍ مقفل — كما كانت ترسله الصفحةُ قبل الإصلاح — يُرفض برسالة ولا يتغيّر شيء */
test('S13 — الخادم يرفض فتحَ يومٍ وحده في شهرٍ ماضٍ مقفل برسالةٍ صريحة · ومع فتح الشهر يُقبل', { timeout: 300000 }, async () => {
  const lab = await world(), b = await chromium.launch();
  try {
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw), p = m.page; let n = 0;
    const EP = () => Number(lab.env.DB.q("SELECT v FROM meta WHERE k='restore_epoch'")[0]?.v || 0), mk = 'm:' + PM.y + '-' + PM.m;
    const send = async (rec) => { const g = await m.api('/api/operations/read?keys=' + encodeURIComponent(KR)); const v = Object.assign({}, (g.j.resources || {})[KR] || {}, { [mk]: rec });
      return m.api('/api/save', { method: 'POST', body: JSON.stringify({ requestId: 'TEST_ONLY_s13_' + (++n) + '_xxxx', epoch: EP(), set: { [KR]: JSON.stringify(v) }, base: { [KR]: (g.j.base || {})[KR] || 0 } }) }); };
    const r = await send({ dopen: { 10: 1 } });
    assert.equal(r.status, 403, JSON.stringify(r.j).slice(0, 300));
    assert.equal(r.j.denied[KR].why, 'day-needs-month');
    const g = await m.api('/api/operations/read?keys=' + encodeURIComponent(KR));
    assert.ok(!(((g.j.resources || {})[KR] || {})[mk]), 'nothing saved');
    const t = await p.evaluate((d) => KIVO.__BS_SRV.operations.explain({ details: { denied: d } }), r.j.denied);
    assert.match(t, /اليومُ في شهرٍ مقفل لا يُفتح وحده/, t);
    const r2 = await send({ mo: 1, dopen: { 10: 1 } });
    assert.equal(r2.status, 200, JSON.stringify(r2.j).slice(0, 300));
  } finally { await b.close(); await lab.close(); }
});
