/* V7 · د6 — ذاكرةُ الاستيراد تحت سقفٍ صلب (TEST_ONLY · بياناتٌ مولَّدة).
   العاملُ في عمليةٍ ابنة (v7_d6_import_mem_child.mjs) كومتُها محدودة بـ node --max-old-space-size=HEAP_CAP؛ النسخةُ تُولَّد هنا وتصلها طلباتٍ كما تصل العاملَ الحقيقي.
   لماذا 64MB للكومة و80MB للمجموع: عازلُ Cloudflare 128MB للكومة وما خارجها معاً (أجسامُ الطلبات · النصوصُ الخارجية). 64MB نصفُه — هامشٌ لاختلاف المحرّك
   (workerd غيرُ Node) ولما لا يُقاس هنا؛ والمجموعُ المعيَّن (heapUsed + external عند كل نداء قاعدة وكل 5 مث) يجب ألا يتجاوز 80MB في أي مرحلة.
   (١) [ثقيل] النسخةُ القديمة ≈31MB تُستورد كاملة تحت السقف — (٢) [ثقيل] وضعفُها ≈62MB كذلك — (٣) [ثقيل] والمسارُ الواحد (بلا دفعات) للنسخة نفسِها لا يسعه السقف:
   الاختبارُ يميّز فعلاً. القياسُ يُطبع في التشخيص. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { hasSystem } from './harness.mjs';
import { oldFile, sizeOf, protocol } from './v7_d6_import_fx.mjs';

const HEAP_CAP = 64, TOTAL_CAP = 80e6, CHILD = fileURLToPath(new URL('./v7_d6_import_mem_child.mjs', import.meta.url));
const need = hasSystem('plan', 'daily', 'tasks', 'staff', 'dreport', 'custody') ? {} : { skip: 'يحتاج أنظمة بيانات العرض المصدر' };
const mb = (n) => Math.round(n / 1e5) / 10;

async function measure(scale, { slice = 'auto', inline = true, preload = false, mode = 'replace' } = {}) {
  const file = await oldFile({ scale }), size = sizeOf(file), first = preload ? await oldFile({ scale: 1 }) : null;
  const child = fork(CHILD, [], { execArgv: ['--no-warnings', '--expose-gc', '--max-old-space-size=' + HEAP_CAP, '--max-semi-space-size=2'], env: { ...process.env, D6_NO_R2: inline ? '1' : '' }, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
  let err = '', dead = null;
  child.stderr.on('data', (d) => { err += d; });
  child.once('exit', (c, s) => { dead = 'exit ' + c + ' ' + (s || '') + ' ' + ((/(FATAL ERROR[^\n]*)/.exec(err) || [])[1] || ''); });
  const next = (op) => new Promise((ok, no) => { const h = (m) => { if (m.op === op) { child.off('message', h); ok(m); } }; child.on('message', h); child.once('exit', () => no(new Error('child ' + dead))); });
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
    const scope = { kind: 'dept', departmentId: 'TEST_ONLY_B' };
    let held = 0;
    /* الإدارةُ الهدف تحمل قبل القياس جولاتٍ ≈8MB (استيرادٌ أول تحت السقف نفسِه) */
    if (first) { const pre = await protocol({ call }, who, first, { scope, reason: 'TEST_ONLY mem preload' }).run(); assert.equal(pre.commit && pre.commit.status, 200, 'preload'); child.send({ op: 'report' }); held = (await next('report')).nodes; }
    const P = protocol({ call }, who, file, { scope, reason: 'TEST_ONLY mem', slice, mode });
    if (slice === false) { const r = await P.begin(); return { refused: r }; }
    const phases = {}, ok = (r, what) => { assert.equal(r.status, 200, what + ': ' + String(r.t).slice(0, 200)); return r; };
    const phase = async (label, fn) => { child.send({ op: 'reset', label }); const b = await next('reset'); const r = await fn(); child.send({ op: 'report' }); const rep = await next('report'); phases[label] = { base: b.base, heap: rep.peak.heap, external: rep.peak.external, total: rep.peak.total }; return { r, rep }; };
    await phase('upload', async () => { ok(await P.begin(), 'begin'); for (let i = 0; i < P.parts.length; i++) ok(await P.part(i), 'part ' + i); });
    const sl = await phase('slice', async () => { for (let i = 0; i < P.sliceCount; i++) ok(await P.sliceStep(i), 'slice ' + i); });
    const ins = await phase('inspect', async () => ok(await P.inspect(), 'inspect'));
    const com = await phase('commit', async () => ok(await P.commit(ins.r.j.inspection.base), 'commit'));
    return { size, parts: P.parts.length, slices: P.sliceCount, phases, held, rowStatements: sl.rep.q, imageRows: sl.rep.i, pre: com.rep.pre, nodes: com.rep.nodes, limit: com.rep.limit, rounds: com.rep.rounds, images: com.rep.images, staged: com.rep.staged, audits: com.rep.audits, commit: com.r.j };
  } finally { child.kill(); }
}
const line = (p) => Object.entries(p).map(([k, v]) => k + ' ' + mb(v.heap) + '+' + mb(v.external) + '=' + mb(v.total)).join(' · ');

for (const preload of [false, true]) for (const scale of [1, 2]) {
  test('(' + (preload ? 'ب' : 'أ') + scale + ') [ثقيل] النسخةُ القديمة ≈' + 31 * scale + 'MB ' + (preload ? 'تستبدل إدارةً تحمل جولاتٍ ≈8MB' : 'إلى إدارةٍ فارغة') + ' — العاملُ تحت سقف كومةٍ ' + HEAP_CAP + 'MB والمجموعُ المعيَّن ≤ 80MB في كل مرحلة', { timeout: 600000, ...need }, async (t) => {
    const m = await measure(scale, { preload });
    assert.ok(m.size.total > 31e6 * scale * 0.98); assert.ok(m.size.maxKey > 8.2e6 * scale, 'المفتاحُ الكبير');
    assert.ok(m.slices >= 12 * scale, 'المفتاحُ الكبير أُرسل دفعاتٍ (' + m.slices + ')');
    if (preload) { assert.ok(m.held > 7000, 'في الهدف جولاتٌ قائمة قبل الاستبدال (' + m.held + ' عقدة)'); assert.ok(m.pre >= m.held, 'لقطةُ ما قبله نُسخت داخل القاعدة (' + m.pre + ' صفاً)'); }
    assert.equal(m.commit.ok, 1); if (!preload) assert.equal(m.commit.imagesNew, 10 * scale);
    assert.equal(m.rounds, 26 * scale, 'أيامُ الجولات في القاعدة هي أيامُ النسخة وحدها'); assert.ok(m.images >= 10 * scale, 'الصورُ كلُّها (والقديمةُ غيرُ المذكورة تنتظر الكنس): ' + m.images); assert.equal(m.staged, 0); assert.equal(m.audits, preload ? 2 : 1);
    for (const [name, p] of Object.entries(m.phases)) assert.ok(p.total <= TOTAL_CAP, 'مرحلة ' + name + ': ' + mb(p.total) + 'MB ≤ 80MB');
    assert.ok(m.limit < 128 * 1024 * 1024, 'حدُّ كومة العملية الابنة دون 128MB (' + mb(m.limit) + 'MB)');
    t.diagnostic((preload ? 'فوق ' + m.held + ' عقدة قائمة · ' : '') + 'scale ' + scale + ' (' + mb(m.size.total) + 'MB · مفتاح ' + mb(m.size.maxKey) + 'MB · ' + m.parts + ' جزءاً · ' + m.slices + ' دفعة) — heapUsed+external=المجموع بالـMB: ' + line(m.phases) + ' · عباراتُ دفعة الاعتماد للصفوف المودَعة: ' + m.rowStatements + ' (كلٌّ ≤ 500KB) + ' + m.imageRows + ' لأجسام الصور (كلٌّ ≤ 200KB)');
  });
}
test('(ج) المسارُ الواحد (بلا دفعات) للنسخة ≈31MB لا يُحاوَل: يُرفض عند البدء بكلفته المقدَّرة — قبل أي رفع', { timeout: 600000, ...need }, async (t) => {
  const m = await measure(1, { slice: false });
  assert.equal(m.refused.status, 413); assert.equal(m.refused.j.err, 'import-too-heavy'); assert.ok(m.refused.j.details.cost > m.refused.j.details.budget);
  t.diagnostic('بلا دفعات: الكلفةُ المقدَّرة ' + m.refused.j.details.cost + 'MB فوق ' + m.refused.j.details.budget + 'MB (' + m.refused.j.details.chars + ' حرفاً)');
});
