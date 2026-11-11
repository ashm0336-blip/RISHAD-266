/* RISHAD V7 port b4 — a two-way path is ONE line of alternating colours on the stored axis, drawn by the shared renderer
   (src/components/565-page-kit.js · bsPathVisual) on the operational plan map and on the daily rounds map.
   Isolated lab, TEST_ONLY data: one site with one two-way path is installed as the unit's plan (current Hijri month) and as
   today's round through the typed operational fixture; a unit manager opens both pages in a real browser.
     · SVG: one <g> per path, one hit line, two colour passes (green with the point order, red against it) with complementary
       dashes, every polyline on the stored points (no offset · no transform), arrowheads on the axis pointing their own way;
     · the same geometry on both pages;
     · pixels: on the first (horizontal) segment every sampled column shows one contiguous band centred on the stored axis,
       green and red alternating repeatedly — at the opening zoom and after zooming in with the map's own «+» button;
     · display only: opening and zooming never writes the plan or the rounds (revisions and contents are what was installed). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';
import { replaceOperationalFixture, inspectOperationalFixture } from '../unit/operational_legacy_seed_fx.mjs';

const A = 'TEST_ONLY_A', KPLAN = 'bsdept:' + A + ':bassam_plan_v1', KROUNDS = 'bsdept:' + A + ':bassam_rounds_v1';
const GREEN = '#16a34a', RED = '#dc2626';
const PTS = [{ x: 140, y: 300 }, { x: 620, y: 300 }, { x: 780, y: 430 }, { x: 900, y: 430 }];
const PATH = { uid: 'TEST_ONLY_p1', id: 'TEST_ONLY_path_id', name: 'TEST_ONLY', code: 'P01', pts: PTS, type: 'in', dir: 'two', line: 'solid', w: 'bold', active: true, anim: false, hideLabel: true };
const site = () => ({ sid: 's_TEST_ONLY_1', name: 'TEST_ONLY', num: 1, zones: [{ uid: 'TEST_ONLY_z1', name: 'TEST_ONLY', code: '01', ser: '01', cat: 'men', d: 'M100 100 L400 100 L400 250 L100 250 Z', cx: 250, cy: 175, emp: [] }], gates: [], marks: [], paths: [JSON.parse(JSON.stringify(PATH))], sectors: [] });
const numbers = (s) => (String(s).match(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi) || []).map(Number);

/* the browser's own screenshot, decoded here (8-bit RGB/RGBA PNG) — no synthetic SVG and no new dependency */
function png(buffer) {
  assert.equal(buffer.subarray(1, 4).toString(), 'PNG');
  let offset = 8, width, height, channels; const data = [];
  while (offset < buffer.length) {
    const size = buffer.readUInt32BE(offset), kind = buffer.toString('ascii', offset + 4, offset + 8), part = buffer.subarray(offset + 8, offset + 8 + size);
    if (kind === 'IHDR') { width = part.readUInt32BE(0); height = part.readUInt32BE(4); assert.equal(part[8], 8); channels = { 2: 3, 6: 4 }[part[9]]; assert.ok(channels, 'RGB/RGBA screenshot'); }
    if (kind === 'IDAT') data.push(part);
    offset += size + 12;
  }
  const raw = inflateSync(Buffer.concat(data)), stride = width * channels, px = Buffer.alloc(height * stride);
  const paeth = (a, b, c) => { const q = a + b - c, x = Math.abs(q - a), y = Math.abs(q - b), z = Math.abs(q - c); return x <= y && x <= z ? a : y <= z ? b : c; };
  for (let y = 0, src = 0; y < height; y++) {
    const f = raw[src++];
    for (let x = 0; x < stride; x++) {
      const i = y * stride + x, left = x >= channels ? px[i - channels] : 0, up = y ? px[i - stride] : 0, corner = y && x >= channels ? px[i - stride - channels] : 0;
      px[i] = (raw[src++] + (f === 0 ? 0 : f === 1 ? left : f === 2 ? up : f === 3 ? Math.floor((left + up) / 2) : paeth(left, up, corner))) & 255;
    }
  }
  return { width, height, at(x, y) { const i = (Math.max(0, Math.min(height - 1, y)) * width + Math.max(0, Math.min(width - 1, x))) * channels; return [px[i], px[i + 1], px[i + 2]]; } };
}
const hue = ([r, g, b]) => (g > 105 && r < 90 && b < 135 ? 'green' : r > 150 && g < 100 && b < 110 ? 'red' : null);

/* what the page really drew for the path: its group, lines and arrowheads */
const shape = (page, svg) => page.evaluate((svg) => {
  const S = document.querySelector(svg); if (!S || !S.getClientRects().length) return null;
  const hits = [...S.querySelectorAll('polyline[data-path-role="hit"]')], g = hits[0] && hits[0].parentElement;
  if (!g) return { hits: 0, polylines: S.querySelectorAll('polyline').length };
  return { hits: hits.length, viewBox: S.getAttribute('viewBox'), groupTag: g.tagName.toLowerCase(), transform: g.getAttribute('transform'), text: g.textContent,
    lines: [...g.querySelectorAll('polyline')].map((n) => ({ role: n.getAttribute('data-path-role'), points: n.getAttribute('points'), stroke: n.getAttribute('stroke'), width: +n.getAttribute('stroke-width'),
      dash: n.getAttribute('stroke-dasharray'), phase: +n.getAttribute('stroke-dashoffset') || 0, offset: +n.getAttribute('data-path-offset') || 0, transform: n.getAttribute('transform'),
      type: n.getAttribute('data-path-type'), dir: n.getAttribute('data-path-direction'), fill: n.getAttribute('fill') })),
    groups: [...g.querySelectorAll('g[data-path-direction]')].map((n) => ({ dir: n.getAttribute('data-path-direction'), arrows: [...n.querySelectorAll('path')].filter((a) => a.getAttribute('fill') !== 'none' && !a.querySelector('animateMotion')).map((a) => ({ d: a.getAttribute('d'), fill: a.getAttribute('fill') })) })) };
}, svg);

function assertOneLine(g, label) {
  const axis = PTS.map((q) => q.x + ',' + q.y).join(' ');
  assert.ok(g && g.hits === 1, label + ': exactly one path group / one hit line on the map: ' + JSON.stringify(g && { hits: g.hits, polylines: g.polylines }));
  assert.equal(g.groupTag, 'g'); assert.equal(g.transform, null, label + ': the group is not transformed');
  assert.ok(g.lines.every((n) => n.points === axis && !n.offset && !n.transform && n.fill === 'none'), label + ': every line (hit · edge · colours) is on the stored points, no side offset');
  const strokes = g.lines.filter((n) => n.role === 'stroke');
  assert.deepEqual(strokes.map((n) => [n.stroke, n.type, n.dir]), [[GREEN, 'in', 'forward'], [RED, 'out', 'reverse']], label + ': two colour passes — green with the point order, red against it');
  assert.equal(strokes[0].width, strokes[1].width, label + ': one width for both colours');
  const d0 = numbers(strokes[0].dash), d1 = numbers(strokes[1].dash);
  assert.ok(d0.length === 2 && d0[0] > 0 && Math.abs(d0[0] - d0[1]) < 1e-9, label + ': solid two-way alternation = equal on/off dashes: ' + strokes[0].dash);
  assert.deepEqual(d1, d0); assert.equal(strokes[0].phase, 0); assert.ok(Math.abs(strokes[1].phase + d0[0]) < 1e-9, label + ': the red pass is shifted by exactly one slot (complementary, never side by side)');
  assert.doesNotMatch(g.text, /دخول|خروج/, label + ': no direction legend on the canvas');
  assert.deepEqual(g.groups.map((x) => x.dir), ['forward', 'reverse'], label + ': one arrow group per direction');
  const tips = [];
  for (const grp of g.groups) {
    const reverse = grp.dir === 'reverse'; assert.ok(grp.arrows.length >= 2, label + ': repeated ' + grp.dir + ' arrowheads');
    for (const a of grp.arrows) {
      const n = numbers(a.d), tip = { x: n[0], y: n[1] }, tail = { x: (n[2] + n[6]) / 2, y: (n[3] + n[7]) / 2 };
      let best = null;
      for (let i = 1; i < PTS.length; i++) {
        const p = PTS[i - 1], q = PTS[i], dx = q.x - p.x, dy = q.y - p.y, len = dx * dx + dy * dy, t = Math.max(0, Math.min(1, ((tip.x - p.x) * dx + (tip.y - p.y) * dy) / len));
        const dist = Math.hypot(tip.x - p.x - t * dx, tip.y - p.y - t * dy);
        if (!best || dist < best.dist) best = { dist, dot: (tip.x - tail.x) * dx + (tip.y - tail.y) * dy };
      }
      assert.ok(best.dist < 0.01 && (reverse ? best.dot < 0 : best.dot > 0), label + ': arrow tip on the axis, pointing ' + grp.dir);
      assert.equal(a.fill, reverse ? RED : GREEN, label + ': an arrowhead has its direction colour');
      tips.push({ reverse, x: tip.x, y: tip.y });
    }
  }
  for (const a of tips.filter((t) => !t.reverse)) for (const b of tips.filter((t) => t.reverse)) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 1, label + ': no two opposing arrowheads share a tip');
  return { strokes, key: g.lines.map((n) => [n.role, n.points, n.stroke, n.dash, n.phase]) };
}

/* pixel profile of the first, horizontal segment (y = 300, x = 140 … 620) on the screenshot of the map itself */
async function assertBand(page, svg, g, label) {
  await page.locator(svg).scrollIntoViewIfNeeded();
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const geo = await page.locator(svg).evaluate((s) => { const r = s.getBoundingClientRect(), m = s.getScreenCTM(); return { x: r.x, y: r.y, w: r.width, a: m.a, d: m.d, e: m.e, f: m.f }; });
  const img = png(await page.locator(svg).screenshot({ animations: 'disabled' })), ratio = img.width / geo.w;
  const width = g.lines.find((n) => n.role === 'stroke').width, band = width * Math.abs(geo.d) * ratio, cy = (geo.d * 300 + geo.f - geo.y) * ratio;
  /* columns under an arrowhead are not line profile: skip the real arrow extents (taken from the DOM), not a fixed pattern */
  const arrows = g.groups.flatMap((x) => x.arrows).map((a) => { const n = numbers(a.d), xs = n.filter((_, i) => i % 2 === 0); return [Math.min(...xs) - 1.5, Math.max(...xs) + 1.5]; });
  let samples = 0, greens = 0, reds = 0, transitions = 0, last = null;
  for (let ux = 146; ux <= 612; ux += 1) {
    if (arrows.some(([lo, hi]) => ux >= lo && ux <= hi)) continue;
    const x = Math.round((geo.a * ux + geo.e - geo.x) * ratio), rows = [], seen = [];
    for (let y = Math.floor(cy - band - 9); y <= Math.ceil(cy + band + 9); y++) { const c = hue(img.at(x, y)); if (c) { rows.push(y); seen.push(c); } }
    if (!rows.length) continue;   /* a column exactly on a colour change may be a blend of both — it is neither green nor red */
    assert.equal(rows.at(-1) - rows[0] + 1, rows.length, label + ': one contiguous band at x=' + ux + ' (not two tracks)');
    assert.ok(rows.length <= Math.ceil(band) + 2, label + ': the band is as thin as the stroke at x=' + ux + ' (' + rows.length + ' px for a ' + band.toFixed(2) + ' px stroke)');
    assert.ok(Math.abs((rows[0] + rows.at(-1)) / 2 - cy) < 1.6, label + ': the band is centred on the stored axis at x=' + ux);
    const cur = seen[Math.floor(seen.length / 2)]; cur === 'red' ? reds++ : greens++;
    if (last && cur !== last) transitions++; last = cur; samples++;
  }
  assert.ok(samples > 150 && greens > 40 && reds > 40 && transitions >= 6, label + ': the pixels alternate green/red repeatedly on one band: ' + JSON.stringify({ samples, greens, reds, transitions, band }));
  return { band, samples, greens, reds, transitions };
}

test('V7 port b4 · a two-way path is one alternating line on the stored axis — plan map and daily rounds map, same shared renderer', { timeout: 600000 }, async () => {
  const lab = await startLab(), { env } = lab;
  /* the pages compute «today» with Intl umalqura (src/i18n/380-hijri-fallback.js); the fixture is keyed the same way and the
     browser's own answer is compared below before anything is asserted */
  const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
  const num = (t) => +parts.find((x) => x.type === t).value, T = { y: num('year'), m: num('month'), d: num('day') };
  const F = [site()];
  const plan = { pMig: 3, zones: F[0].zones, gates: [], marks: [], paths: F[0].paths, floors: F, months: { [T.y + '-' + T.m]: { c: 1, d: F } }, cfg: {}, delMonths: {} };
  const rounds = { [T.y + '-' + T.m + '-' + T.d]: { ap: false, t: 12345, d: [site()] } };
  await replaceOperationalFixture(env, KPLAN, plan); await replaceOperationalFixture(env, KROUNDS, rounds);
  const revs = () => [KPLAN, KROUNDS].map((k) => (env.DB.q('SELECT rev FROM revs WHERE k=?', k)[0] || {}).rev || 0), rev0 = revs();
  const before = { plan: JSON.stringify(inspectOperationalFixture(env, KPLAN)), rounds: JSON.stringify(inspectOperationalFixture(env, KROUNDS)) };
  assert.deepEqual(JSON.parse(before.plan).months[T.y + '-' + T.m].d[0].paths[0].pts, PTS, 'the stored plan holds the fixture path');
  assert.deepEqual(JSON.parse(before.rounds)[T.y + '-' + T.m + '-' + T.d].d[0].paths[0].pts, PTS, 'the stored round holds the fixture path');
  const b = await chromium.launch();
  try {
    const saved = [];   /* keys of every generic save the pages send */
    const s = await openAs(b, lab, LAB.mgrA, LAB.pw, { onPage: (pg) => pg.on('request', (r) => { if (!/\/api\/save\b/.test(r.url())) return; let j = {}; try { j = JSON.parse(r.postData() || '{}'); } catch (e) { j = { set: { unparsable: 1 } }; } saved.push(...Object.keys(j.set || {}), ...(j.del || []).map((k) => 'del:' + k)); }) }), p = s.page; p.setDefaultTimeout(15000);
    assert.deepEqual(await p.evaluate(() => KIVO.BassamHijri.now()), T, 'the page and the fixture agree on today');
    const seen = {};
    for (const [name, hash, svg] of [['plan', '#/plan', 'svg[data-map-zoom]'], ['daily', '#/daily/rounds', 'svg[data-ds-zoom]']]) {
      await s.go(hash, 5000); await p.locator(svg).waitFor({ state: 'visible' });
      await p.locator(svg + ' polyline[data-path-role="hit"]').first().waitFor({ state: 'attached' });
      let g = await shape(p, svg);
      const first = assertOneLine(g, name), band0 = await assertBand(p, svg, g, name + ' (opening zoom)');
      /* zoom in with the map's own button: the viewBox narrows, the path stays one centred band of the same screen thickness */
      const zoomIn = p.locator('button[title="تكبير"]:visible').first();
      assert.ok(await zoomIn.count(), name + ': the map has its «تكبير» button');
      await zoomIn.click(); await p.waitForTimeout(700);
      const g2 = await shape(p, svg);
      assert.ok(numbers(g2.viewBox)[2] < numbers(g.viewBox)[2], name + ': the zoom button narrowed the view: ' + g.viewBox + ' → ' + g2.viewBox);
      const second = assertOneLine(g2, name + ' (zoomed in)');
      assert.ok(second.strokes[0].width < first.strokes[0].width, name + ': the stroke follows the view scale');
      const band1 = await assertBand(p, svg, g2, name + ' (zoomed in)');
      assert.ok(Math.abs(band1.band - band0.band) < 0.05, name + ': the same screen thickness at both zooms: ' + band0.band + ' / ' + band1.band);
      seen[name] = first.key;
    }
    assert.deepEqual(seen.daily, seen.plan, 'plan and daily draw the path with identical lines (points · colours · dashes)');
    await lab.idle();
    assert.deepEqual(s.errs, [], 'no page errors');
    /* display only: the only generic save is the permission model's own one-time «lensZ» stamp on first load
       (src/permissions/331-perm-model.js — not a map write); the plan/round revisions and contents are untouched */
    assert.deepEqual(saved.filter((k) => k !== 'bassam_perms_v1'), [], 'no save other than the permission model\'s one-time stamp: ' + JSON.stringify(saved));
    assert.deepEqual(s.writes.filter((w) => !/^POST \/api\/(login|save)$/.test(w)), [], 'no other write request: ' + JSON.stringify(s.writes));
    assert.deepEqual(revs(), rev0, 'the plan and rounds revisions did not move');
    assert.equal(JSON.stringify(inspectOperationalFixture(env, KPLAN)), before.plan, 'the stored plan is unchanged');
    assert.equal(JSON.stringify(inspectOperationalFixture(env, KROUNDS)), before.rounds, 'the stored round is unchanged');
    await s.ctx.close();
  } finally { await b.close(); await lab.close(); }
});
