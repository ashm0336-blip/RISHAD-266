/* RISHAD-266 · P9 — «مؤشرات المهام» in «مؤشرات الإدارة» is now the Tasks system's own panel (<dc-import name="Tasks" solo="kpi">).
   Real built worker + browser over TEST_ONLY data: a manager with tasks:view opens #/kpis, picks the tasks tab and sees exactly what the
   owner logic computes on the store the page holds (title · summary · four cards), for the current month and after next / previous.
   Opening and navigating saves nothing; the full Tasks page still renders without the panel; a manager whose unit has no «tasks» in its
   ceiling gets no tasks tab. KIVO_TK_REF=<old kpis/logic.js> computes the expectation with the pre-move code instead (parity check). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';
import { replaceOperationalFixture } from '../unit/operational_legacy_seed_fx.mjs';
import { tasksStore, T } from '../unit/tasks_fx.mjs';

const SRC = process.env.KIVO_SRC || path.resolve('src');
const A = 'TEST_ONLY_A', B = 'TEST_ONLY_B';

/* the expectation: the owner logic (or, with KIVO_TK_REF, the pre-move KPIs logic) over the very store the browser loaded */
function expected(store, y, m) {
  const KIVO = { BassamHijri: { now: () => T }, __BS_SRV: { operations: { get: (k) => (k === 'bassam_tasks_v1' ? store : null) } }, BassamDepts: { context: () => ({ state: 'ready' }) } };
  let c;
  if (process.env.KIVO_TK_REF) { const Old = new Function('DCLogic', 'KIVO', fs.readFileSync(process.env.KIVO_TK_REF, 'utf8') + ';return Component')(class { setState(p) { Object.assign(this.state, p); } }, KIVO); c = new Old(); }
  else { function C() {} C.prototype.setState = function (p) { Object.assign(this.state, p); }; new Function('Component', 'KIVO', fs.readFileSync(path.join(SRC, 'modules/tasks/logic-kpi.js'), 'utf8'))(C, KIVO); c = new C(); }
  c.state = { tkY: y, tkM: m }; const e = {}; c._tkKpiVals(e);
  return normV({ title: 'مؤشرات المهام — ' + e.tkKpiTitle, sub: e.tkKpiSub, cards: (e.tkKpiCards || []).map((k) => [k.t, k.v]) });
}
/* what the page shows: the panel's title, summary line and cards. The display layer shows Arabic-Indic digits, adds direction marks and
   renders «·» as «-»; both sides are normalised the same way before comparing. */
const norm = (x) => String(x).replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x660)).replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '').replace(/\s*[·-]\s*/g, ' · ').replace(/\s+/g, ' ').trim();
const normV = (v) => ({ title: norm(v.title), sub: norm(v.sub), cards: v.cards.map((c) => c.map(norm)) });
const shown = async (page) => { const v = await page.evaluate(() => {
  const t = [...document.querySelectorAll('div')].find((d) => !d.querySelector('div') && /^مؤشرات المهام — /.test(d.textContent.trim()));
  if (!t) return null;
  const head = t.parentElement, isGrid = (d) => /grid-template-columns:\s*repeat\(auto-fit/.test(d.getAttribute('style') || '');
  let box = head; while (box && ![...box.querySelectorAll('div')].some(isGrid)) box = box.parentElement;
  const grid = box && [...box.querySelectorAll('div')].find(isGrid);
  const cards = grid ? [...grid.children].map((c) => [c.children[0].textContent, c.children[1].textContent]) : [];
  return { title: t.textContent, sub: head.children[1] ? head.children[1].textContent : '', cards };
}); return v && normV(v); };
const track = (page) => { const out = []; page.on('request', (r) => { if (!/\/api\/save\b/.test(r.url())) return; let j = {}; try { j = JSON.parse(r.postData() || '{}'); } catch (e) { j = { set: { unparsable: 1 } }; } const keys = Object.keys(j.set || {}).concat((j.del || []).map((k) => 'del:' + k)); if (keys.length) out.push(keys.join(',')); }); return out; };
const click = (page, text) => page.evaluate((text) => { const el = [...document.querySelectorAll('button, span')].find((x) => x.textContent.trim() === text); if (!el) return false; el.click(); return true; }, text);
const step = (y, m, d) => { m += d; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } return [y, m]; };

test('KPIs page · tasks tab: owner panel values, month navigation, no saves; Tasks page intact; tab hidden without tasks', { timeout: 300000 }, async () => {
  const lab = await startLab(), { env, W } = lab, DB = env.DB;
  await replaceOperationalFixture(env, 'bsdept:' + A + ':bassam_tasks_v1', tasksStore());
  /* unit B loses «tasks» from its ceiling: its manager must not get the tasks tab */
  const kv = (k) => JSON.parse(DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', k).map((r) => r.v).join(''));
  const pm = kv('bassam_perms_v1'); pm.caps[B] = pm.caps[B].filter((x) => x !== 'tasks'); pm.lensZ = 1;
  await DB.batch([DB.prepare('DELETE FROM kv WHERE k=?1').bind('bassam_perms_v1'), ...W.kvPutStmts(env, 'kv', 'bassam_perms_v1', JSON.stringify(pm)), DB.prepare('UPDATE revs SET rev=rev+1 WHERE k=?1').bind('bassam_perms_v1')]);
  const b = await chromium.launch();
  try {
    let sv = []; const s = await openAs(b, lab, LAB.mgrA, LAB.pw, { onPage: (p) => { sv = track(p); } });
    await s.go('#/kpis', 4500);
    assert.ok(await click(s.page, 'مؤشرات المهام'), 'manager with tasks:view sees the tasks tab');
    await s.page.waitForTimeout(2500);
    const store = await s.page.evaluate(() => KIVO.__BS_SRV.operations.get('bassam_tasks_v1'));
    assert.ok(store && Object.keys(store).length > 3, 'the page holds the unit tasks store');
    let [y, m] = [T.y, T.m];
    const want0 = expected(store, y, m), got0 = await shown(s.page);
    assert.ok(want0.cards.length === 4, 'fixture month has tasks (4 cards)');
    assert.deepEqual(got0, want0, 'current month: panel = owner computation');
    for (const [label, d] of [['الشهر التالي', 1], ['الشهر السابق', -1], ['الشهر السابق', -1]]) {
      assert.ok(await click(s.page, label), label + ' button present'); await s.page.waitForTimeout(900);
      [y, m] = step(y, m, d);
      assert.deepEqual(await shown(s.page), expected(store, y, m), label + ' → ' + y + '-' + m);
    }
    assert.deepEqual(sv, [], 'opening the panel and navigating months saves nothing');
    /* the full Tasks page still renders its own view, without the KPI panel */
    await s.go('#/tasks', 5000);
    const tp = await s.page.evaluate(() => ({ panel: /مؤشرات المهام — /.test(document.body.innerText), rows: document.body.innerText.includes('TEST_ONLY') }));
    assert.equal(tp.panel, false, 'Tasks page: no solo panel in the full view');
    assert.equal(tp.rows, true, 'Tasks page: the full view renders the unit tasks');
    assert.deepEqual(sv, [], 'Tasks page open: nothing saved');
    assert.deepEqual(s.errs, [], 'manager A: no page errors');
    /* a manager whose ceiling has no «tasks»: no tasks tab, no panel */
    const x = await openAs(b, lab, LAB.mgrB, LAB.pw); await x.go('#/kpis', 4500);
    const xb = await x.page.evaluate(() => ({ can: !!KIVO.BassamPerm.can('tasks', 'view'), tab: [...document.querySelectorAll('span')].some((e) => e.textContent.trim() === 'مؤشرات المهام'), panel: /مؤشرات المهام — /.test(document.body.innerText) }));
    assert.deepEqual(xb, { can: false, tab: false, panel: false }, 'without tasks:view: no tab and no panel');
    assert.deepEqual(x.errs, [], 'manager B: no page errors');
  } finally { await b.close(); await lab.close(); }
});
