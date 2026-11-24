/* V7 · د7 — ذاكرةُ استيراد «النسخة الشاملة — كل الإدارات» تحت السقف الصلب نفسِه (TEST_ONLY · بياناتٌ مولَّدة).
   العاملُ في العملية الابنة نفسِها (v7_d6_import_mem_child.mjs) بكومةٍ محدودة بـ 64MB، والمجموعُ المعيَّن (heapUsed + external) ≤ 80MB في كل مرحلة — قاعدةُ د6 كما هي.
   (أ) [ثقيل] نسخةٌ شاملة لثلاث إدارات بالشكل المقيس (≈93MB: ثلاثُ نسخ إدارةٍ قديمة كلٌّ ≈31MB) إلى منصةٍ إداراتُها فارغة
   (ب) [ثقيل] والنسخةُ نفسُها تستبدل منصةً تحملها (≈21,000 عقدة جولاتٍ قائمة) — لا يحمّل المرجعُ أسرةَ أيِّ إدارة
   (ج) والمسارُ الواحد (بلا دفعات) للنسخة نفسِها يُرفض عند البدء بكلفته — الاختبارُ يميّز. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { hasSystem } from './harness.mjs';
import { protocol } from './v7_d6_import_fx.mjs';
import { fullOf, GLOBALS_SQL } from './v7_d7_fullcopy_fx.mjs';

const HEAP_CAP = 64, TOTAL_CAP = 80e6, CHILD = fileURLToPath(new URL('./v7_d6_import_mem_child.mjs', import.meta.url));
const need = hasSystem('plan', 'daily', 'tasks', 'staff', 'dreport', 'custody') ? {} : { skip: 'يحتاج أنظمة بيانات العرض المصدر' };
const mb = (n) => Math.round(n / 1e5) / 10, FULL = { kind: 'full' };
const LIST = [['TEST_ONLY_A', { scale: 1 }, 'a'], ['TEST_ONLY_B', { scale: 1 }, 'b'], ['TEST_ONLY_A_S1', { scale: 1 }, 's']];

async function measure({ preload = false, slice = 'auto' } = {}) {
  const child = fork(CHILD, [], { execArgv: ['--no-warnings', '--expose-gc', '--max-old-space-size=' + HEAP_CAP, '--max-semi-space-size=2'], env: { ...process.env, D6_NO_R2: '1' }, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
  let err = '', dead = null;
  child.stderr.on('data', (d) => { err += d; });
  child.once('exit', (c, s) => { dead = 'exit ' + c + ' ' + (s || '') + ' ' + ((/(FATAL ERROR[^\n]*)/.exec(err) || [])[1] || ''); });
  const next = (op) => new Promise((ok, no) => { const h = (m) => { if (m.op === op) { child.off('message', h); ok(m); } }; child.on('message', h); child.once('exit', () => no(new Error('child ' + dead))); });
  const ask = async (msg) => { child.send(msg); return next(msg.op); };
  try {
    const ready = await next('ready'), O = ready.base;
    const call = async (p, o = {}) => {
      let r;
      try { r = await fetch(O + p, { method: o.body !== undefined ? 'POST' : 'GET', headers: { ...(o.body !== undefined ? { 'Content-Type': 'application/json', origin: O } : {}), ...(o.ck ? { cookie: o.ck } : {}) }, body: o.body === undefined ? undefined : JSON.stringify(o.body) }); }
      catch (e) { await new Promise((go) => setTimeout(go, 300)); throw new Error('request failed (' + (dead || e.message) + ')'); }
      const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { /* نص */ }
      return { status: r.status, j, t, h: r.headers };
    };
    const lg = await call('/api/login', { body: { u: ready.un, p: ready.pw } }), who = { ck: (lg.h.get('set-cookie') || '').split(';')[0] };
    /* السجلاتُ العامة من منصة العملية الابنة نفسِها (الحساباتُ بكلمات مرورها كما هي) */
    const { full } = await fullOf({ globals: (await ask({ op: 'sql', sql: GLOBALS_SQL })).rows }, LIST);
    let held = 0;
    if (preload) { const pre = await protocol({ call }, who, full, { scope: FULL, reason: 'TEST_ONLY mem preload' }).run(); assert.equal(pre.commit && pre.commit.status, 200, 'preload ' + JSON.stringify((pre.commit || pre.inspect || pre.begin).j).slice(0, 300)); held = (await ask({ op: 'report' })).nodes; }
    const P = protocol({ call }, who, full, { scope: FULL, reason: 'TEST_ONLY mem', slice });
    if (slice === false) return { refused: await P.begin() };
    const phases = {}, ok = (r, what) => { assert.equal(r.status, 200, what + ': ' + String(r.t).slice(0, 300)); return r; };
    const phase = async (label, fn) => { const b = await ask({ op: 'reset', label }); const r = await fn(); const rep = await ask({ op: 'report' }); phases[label] = { base: b.base, heap: rep.peak.heap, external: rep.peak.external, total: rep.peak.total, at: rep.peak.at }; return { r, rep }; };
    await phase('upload', async () => { ok(await P.begin(), 'begin'); for (let i = 0; i < P.parts.length; i++) ok(await P.part(i), 'part ' + i); });
    const sl = await phase('slice', async () => { for (let i = 0; i < P.sliceCount; i++) ok(await P.sliceStep(i), 'slice ' + i); });
    const ins = await phase('inspect', async () => ok(await P.inspect(), 'inspect'));
    const com = await phase('commit', async () => ok(await P.commit(ins.r.j.inspection.base), 'commit'));
    return { parts: P.parts.length, slices: P.sliceCount, phases, held, rowStatements: sl.rep.q, imageRows: sl.rep.i, pre: com.rep.pre, rounds: com.rep.rounds, images: com.rep.images, staged: com.rep.staged, audits: com.rep.audits, limit: com.rep.limit, commit: com.r.j };
  } finally { child.kill(); }
}
const line = (p) => Object.entries(p).map(([k, v]) => k + ' ' + mb(v.heap) + '+' + mb(v.external) + '=' + mb(v.total)).join(' · ');

for (const preload of [false, true]) {
  test('(' + (preload ? 'ب' : 'أ') + ') [ثقيل] نسخةٌ شاملة لثلاث إدارات ≈93MB ' + (preload ? 'تستبدل منصةً تحملها' : 'إلى إداراتٍ فارغة') + ' — العاملُ تحت سقف كومةٍ ' + HEAP_CAP + 'MB والمجموعُ ≤ 80MB في كل مرحلة', { timeout: 1800000, ...need }, async (t) => {
    const m = await measure({ preload });
    assert.ok(m.slices >= 3 * 14, 'كلُّ إدارةٍ دفعات (' + m.slices + ')');
    if (preload) { assert.ok(m.held > 3 * 7000, 'في المنصة جولاتٌ قائمة لثلاث إدارات (' + m.held + ' عقدة)'); assert.ok(m.pre >= m.held, 'لقطةُ ما قبله داخل القاعدة (' + m.pre + ' صفاً)'); }
    assert.equal(m.commit.ok, 1); if (!preload) assert.equal(m.commit.imagesNew, 30);
    assert.equal(m.rounds, 3 * 26, 'أيامُ الجولات هي أيامُ النسخة وحدها'); assert.equal(m.staged, 0); assert.equal(m.audits, preload ? 2 : 1);
    for (const [name, p] of Object.entries(m.phases)) assert.ok(p.total <= TOTAL_CAP, 'مرحلة ' + name + ': ' + mb(p.total) + 'MB ≤ 80MB (' + p.at + ')');
    assert.ok(m.limit < 128 * 1024 * 1024);
    t.diagnostic((preload ? 'فوق ' + m.held + ' عقدة قائمة · ' : '') + m.parts + ' جزءاً · ' + m.slices + ' دفعة — heapUsed+external=المجموع بالـMB: ' + line(m.phases) + ' · عباراتُ دفعة الاعتماد للصفوف المودَعة: ' + m.rowStatements + ' + ' + m.imageRows + ' لأجسام الصور');
  });
}
test('(ج) المسارُ الواحد للنسخة الشاملة ≈93MB لا يُحاوَل: يُرفض عند البدء بكلفته المقدَّرة', { timeout: 600000, ...need }, async (t) => {
  const m = await measure({ slice: false });
  assert.equal(m.refused.status, 413); assert.equal(m.refused.j.err, 'import-too-heavy'); assert.equal(m.refused.j.details.kind, 'full');
  t.diagnostic('بلا دفعات: ' + m.refused.j.details.cost + 'MB فوق ' + m.refused.j.details.budget);
});
