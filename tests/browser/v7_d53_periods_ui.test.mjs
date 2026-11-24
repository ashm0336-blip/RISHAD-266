/* V7 · 53 (periodsui) — الصفحاتُ على التخزين بالفترة، في مختبرٍ معزول بعالمٍ بشكل S1 (TEST_ONLY، أصغر حجماً افتراضاً؛ PU_EMP · PU_M · PU_RD تكبّره).
   كلُّ صفحة (الخطة · الجدول الشهري · التقرير اليومي · الجولات · المهام · «صفحتي») تفتح وتطلب الفترات التي تعرضها وحدها (لا مفتاحَ منطقياً لموردٍ مقسَّم)،
   وحفظُ شهرٍ أو يومٍ يرسل تلك الفترةَ وحدها (بايتاتُ الطلب ≈ الفترة)، وما لم يُعرض مخزَّنٌ كما كان بايتاً. يحتاج خادمَ «periods» (عقد periods_api.md). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';
import { hasSystem } from '../unit/harness.mjs';
import { T as TODAY } from '../unit/world_fx.mjs';
import { replaceOperationalFixture } from '../unit/operational_legacy_seed_fx.mjs';

const A = 'TEST_ONLY_A', K = (r) => 'bsdept:' + A + ':' + r;
const need = hasSystem('plan', 'daily', 'dreport', 'staff', 'tasks') ? {} : { skip: 'يحتاج أنظمةَ الخطة والجولات والتقرير والجدول والمهام' };
const SPLIT = ['bassam_plan_v1', 'bassam_staffing_v3', 'bassam_rounds_v1', 'bassam_rounds_arc_v1', 'bassam_dreport_v1', 'bassam_tasks_v1'];
const E = (k, d) => (process.env[k] == null ? d : +process.env[k]);
const CUR = TODAY.y + '-' + TODAY.m, DAY = CUR + '-' + TODAY.d;

/* عالمٌ بشكل S1: موقعان بمصلياتٍ وأبواب ومسارات · أشهرٌ من الخطة والجدول تنتهي بالشهر الجاري · أيامُ جولاتٍ وتقريرٍ ومهامّ (الأحدثُ أولاً) */
function docs() {
  const EMP = E('PU_EMP', 120), M = E('PU_M', 6), RD = E('PU_RD', 40), DR = E('PU_DR', 6), TK = E('PU_TK', 20);
  const months = []; { let y = TODAY.y, m = TODAY.m; for (let i = 0; i < M; i++) { months.unshift(y + '-' + m); m--; if (m < 1) { m = 12; y--; } } }
  const days = (n) => { const out = []; for (let mi = months.length - 1; mi >= 0 && out.length < n; mi--) for (let d = mi === months.length - 1 ? TODAY.d : 29; d >= 1 && out.length < n; d--) out.push(months[mi] + '-' + d); return out; };
  const eids = Array.from({ length: EMP }, (_, i) => (i ? 'TEST_ONLY_e' + i : 'TEST_ONLY_eA1'));
  const employees = eids.map((eid, i) => ({ eid, name: 'TEST_ONLY · موظف ' + i, nid: i ? String(1900000000 + i) : LAB.empA }));
  const zone = (s, z) => ({ uid: 'tz' + s + 'x' + z, code: 'Z' + s + '-' + z, name: 'TEST_ONLY · مصلى ' + s + '-' + z, d: 'M' + z + ' 0 L' + (z + 10) + ' 0 L' + (z + 10) + ' 10 L' + z + ' 10 Z', cx: z, cy: s, area: 100 + z, emp: [eids[(s * 40 + z * 3) % EMP]] });
  const site = (s) => ({ sid: 'ts' + s, name: 'TEST_ONLY · موقع ' + s, num: s + 1, zones: Array.from({ length: 10 }, (_, z) => zone(s, z)),
    gates: Array.from({ length: 6 }, (_, g) => ({ uid: 'tg' + s + 'x' + g, id: 'G' + s + g, num: String(g + 1), x: g * 10, y: 10, emp: [] })), marks: [], paths: [] });
  const plan = { floors: [site(0), site(1)], months: Object.fromEntries(months.map((ym) => [ym, { c: 1, d: [site(0), site(1)] }])), delMonths: {} };
  const staffing = Object.fromEntries(months.map((ym, mi) => [ym, Object.fromEntries(eids.map((e, i) => [e, { shift: ['TEST_ONLY-A', 'TEST_ONLY-B'][(i + mi) % 2], rest: [['fri', 'sat'][i % 2]] }]))]));
  const rounds = { __pMig: 2 }; months.forEach((ym) => { rounds['m:' + ym] = { ap: 0 }; });
  days(RD).forEach((k, n) => { rounds[k] = { t: 1795000000000 - n * 864e5, d: [site(0), site(1)] }; });
  const dreport = Object.fromEntries(days(DR).map((k, n) => [k, { created: 1795000000000 - n * 864e5, shifts: { 'TEST_ONLY-A': { pulled: true, roster: eids.slice(0, 40).map((e) => ({ ekey: e, st: 'pr' })) } } }]));
  return { months, docs: { bassam_employees_v1: employees, bassam_staffing_v3: staffing, bassam_plan_v1: plan, bassam_rounds_v1: rounds, bassam_dreport_v1: dreport } };
}
const ready = (p, ms = 60000) => p.waitForFunction(() => { const m = document.querySelector('main.bs-main'); if (!m || m.hasAttribute('data-ps-wait')) return false; for (let n = m.firstElementChild; n; n = n.nextElementSibling) if (n.classList.contains('sc-host')) return !n.querySelector('.sc-ps[data-ps="loading"]'); return false; }, null, { timeout: ms, polling: 50 });
const wholeSplit = (url) => { const q = new URL(url).searchParams.get('keys') || ''; return q.split(',').filter((k) => SPLIT.some((r) => k === K(r))); };

async function open(b, lab, hash, un, opts) {
  const s = await openAs(b, lab, un || LAB.mgrA, LAB.pw, opts), reads = [], saves = [];
  s.page.on('request', (r) => { if (/\/api\/operations\/read/.test(r.url())) reads.push(r.url()); if (r.method() === 'POST' && /\/api\/save\b/.test(r.url())) saves.push({ body: JSON.parse(r.postData() || '{}'), bytes: Buffer.byteLength(r.postData() || '') }); });
  await s.page.evaluate(() => { location.hash = '#/links'; }); await s.page.waitForTimeout(800);
  reads.length = 0;
  const t0 = Date.now();
  await s.page.evaluate((h) => { location.hash = h; }, hash);
  await s.page.waitForTimeout(100); await ready(s.page); await s.page.waitForTimeout(600);
  return { ...s, reads, saves, ms: Date.now() - t0 };
}
/* حفظُ الفترة الحالية عبر خدمة الصفحة نفسِها (الوثيقةُ كما تراها الصفحة ⇒ الطبقةُ ترسل ما تغيّر) */
const patchIn = (p, name, src, arg) => p.evaluate(async ([name, src, arg]) => {
  const svc = KIVO.__BS_SRV.operations, r = await svc.patch({}, 'TEST_ONLY:' + name, name, (doc) => { (0, eval)('(' + src + ')')(doc, arg); return doc; });
  return { ok: r && r.ok, err: r && r.err, status: r && r.status };
}, [name, src.toString(), arg]);

test('53 · كل صفحة تفتح بفتراتها، وحفظُ شهرٍ أو يومٍ يرسل تلك الفترةَ وحدها، وما لم يُعرض مخزَّنٌ كما كان', { timeout: 1800000, ...need }, async (t) => {
  const lab = await startLab(), b = await chromium.launch(), W = docs();
  try {
    for (const [r, v] of Object.entries(W.docs)) await replaceOperationalFixture(lab.env, K(r), v);
    const su = await openAs(b, lab, LAB.superUn, LAB.superPw);
    const get = async (k) => (await su.api('/api/operations/read?keys=' + encodeURIComponent(k))).j;
    const old = W.months[0], times = {};
    const before = {};
    for (const r of ['bassam_plan_v1', 'bassam_staffing_v3']) before[r] = (await get(K(r) + '@' + old)).resources[K(r) + '@' + old];
    before.rounds = (await get(K('bassam_rounds_v1') + '@' + W.months[W.months.length - 2] + '-10')).resources;
    assert.ok(before.bassam_plan_v1 && before.bassam_staffing_v3, 'the server answers period keys (periods contract): ' + JSON.stringify(Object.keys(before)));

    const cases = [
      ['#/plan', 'bassam_plan_v1', CUR, (d, cur) => { d.months[cur].d[0].zones[0].name += ' (TEST_ONLY 53)'; }],
      ['#/staffing', 'bassam_staffing_v3', CUR, (d, cur) => { d[cur].TEST_ONLY_e1.cs = 'TEST_ONLY-53'; }],
      ['#/dreport', 'bassam_dreport_v1', DAY, (d, day) => { d[day].note53 = 'TEST_ONLY'; }],
      ['#/daily/rounds', 'bassam_rounds_v1', DAY, (d, day) => { d[day].d[0].zones[0].name += ' (TEST_ONLY 53)'; }],
      ['#/tasks', null],
    ];
    for (const [hash, name, period, edit] of cases) {
      const s = await open(b, lab, hash);
      try {
        times[hash] = s.ms;
        t.diagnostic(hash + ' open ' + s.ms + ' ms · reads ' + JSON.stringify(s.reads.map((u) => decodeURIComponent(new URL(u).search).replace(/bsdept:[^:]+:/g, '').slice(0, 220))));
        assert.deepEqual(s.reads.flatMap(wholeSplit), [], hash + ': no whole-document read of a split resource');
        assert.ok(s.reads.length > 0, hash + ': the page read its data');
        assert.ok((await s.page.evaluate(() => document.querySelector('main.bs-main').innerText.length)) > 50, hash + ': the page shows content');
        if (!name) continue;
        const n0 = s.saves.length, r = await patchIn(s.page, name, edit, period);
        assert.equal(r.ok, 1, hash + ' save: ' + JSON.stringify(r));
        const sent = s.saves.slice(n0);
        assert.equal(sent.length, 1, hash + ': one request');
        assert.deepEqual(Object.keys(sent[0].body.set), [K(name) + '@' + period], hash + ': only the edited period is sent');
        assert.deepEqual(sent[0].body.del, []);
        const stored = (await get(K(name) + '@' + period)).resources[K(name) + '@' + period], periodBytes = Buffer.byteLength(JSON.stringify(JSON.stringify(stored)));
        assert.ok(sent[0].bytes < periodBytes + 4096, hash + ': request bytes ≈ the period (' + sent[0].bytes + ' vs ' + periodBytes + ')');
        assert.match(JSON.stringify(stored), /TEST_ONLY.53|TEST_ONLY-53|note53/, hash + ': stored');
        assert.deepEqual(s.errs, [], hash + ': no page errors');
      } finally { await s.ctx.close(); }
    }
    for (const r of ['bassam_plan_v1', 'bassam_staffing_v3']) assert.deepEqual((await get(K(r) + '@' + old)).resources[K(r) + '@' + old], before[r], r + ': the month not shown is stored as it was');
    assert.deepEqual((await get(K('bassam_rounds_v1') + '@' + W.months[W.months.length - 2] + '-10')).resources, before.rounds, 'a day not shown is stored as it was');

    /* «صفحتي»: سطح المكتب وiPhone 13 — اليومُ والشهرُ الحاليان وحدهما */
    for (const [label, opts] of [['desktop', undefined], ['iphone13', { viewport: { width: 390, height: 844 }, context: { isMobile: true, hasTouch: true, deviceScaleFactor: 3, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1' } }]]) {
      const s = await open(b, lab, '#/profile', LAB.empA, opts);
      try {
        times['#/profile ' + label] = s.ms;
        assert.deepEqual(s.reads.flatMap(wholeSplit), [], 'profile ' + label + ': no whole-document read');
        assert.deepEqual(s.errs, [], 'profile ' + label + ': no page errors');
      } finally { await s.ctx.close(); }
    }
    t.diagnostic('open times (ms): ' + JSON.stringify(times));
  } finally { await b.close(); await lab.close(); }
});
