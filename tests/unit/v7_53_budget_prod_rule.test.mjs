/* V7 · 53 (REVIEW.md البند ١٦ — الخيار أ بشرطين): قاعدةُ ميزانية العامل في tools/perf_budget.py.
   ① الحقيقة: tools/perf_budget.json يعلن prodWorker (worker:_worker.js · ≥ 4٪) وسببَه، والسقفُ 488000 كما هو.
   ② القياسُ هو ما يُشحن: perf_budget يقيس نزعَ tools/prod_strip.strip_worker (الدالةُ التي تكتب pk<N>.prod) — لا نزعاً مكتوباً من جديد.
   ③ السلوك (حزمةٌ مصطنعة في مجلدٍ مؤقت · ميزانيةٌ مؤقتة عبر KIVO_PERF_BUDGET):
      · الإنتاجُ بهامش ≥ 4٪ وPreview تحت السقف ⇒ ينجح ويطبع الرقمين؛
      · الإنتاجُ بهامش < 4٪ (وPreview تحت السقف) ⇒ يفشل؛
      · Preview فوق السقف (والإنتاجُ بهامشٍ وافر) ⇒ يفشل. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { ROOT, PYTHON } from './harness.mjs';

const BUD = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'perf_budget.json'), 'utf8'));
const PB = fs.readFileSync(path.join(ROOT, 'tools', 'perf_budget.py'), 'utf8');

test('V7 · 53 ①②: الميزانيةُ تعلن قاعدةَ عامل الإنتاج بسببها، وperf_budget يقيس بنزع prod_strip نفسِه', () => {
  assert.deepEqual({ group: BUD.prodWorker.group, min: BUD.prodWorker.minMarginPct }, { group: 'worker:_worker.js', min: 4 });
  assert.equal(BUD.budget['worker:_worker.js'], 488000, 'السقفُ لم يُرفع');
  assert.ok(BUD.d53Review16Decision && /REVIEW\.md/.test(BUD.d53Review16Decision.authority) && BUD.d53Review16Decision.rule.length > 40, 'سببٌ مكتوب');
  assert.match(PB, /import prod_strip/); assert.match(PB, /prod_strip\.strip_worker\(/);
  assert.ok(!/KIVO_TEST_TOOL_BEGIN/.test(PB) && !/re\.compile/.test(PB), 'لا نزعَ مكتوباً من جديد في perf_budget');
  assert.match(fs.readFileSync(path.join(ROOT, 'tools', 'prod_strip.py'), 'utf8'), /write\(strip_worker\(w\)\)/, 'حزمةُ الإنتاج تُكتب بالدالة نفسِها');
});

/* حزمةٌ مصطنعة: عاملٌ فيه كتلةُ أداة الاختبار (نصٌّ عشوائي لا يُضغط ⇒ فرقٌ واضح بين Preview والإنتاج) */
function fakePk() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'k53pb-')), pk = path.join(dir, 'pkT');
  fs.mkdirSync(pk);
  let rnd = ''; for (let i = 0; i < 6000; i++) rnd += Math.random().toString(36).slice(2);
  const tool = "/* @@KIVO_TEST_TOOL_BEGIN — TEST_ONLY */\nasync function enfTestApi() { return '" + rnd + "'; }\n/* @@KIVO_TEST_TOOL_END */\n";
  const w = "function json(x) { return x; }\n" + 'var A = 1;\n'.repeat(50) + tool + 'export default {};\n';
  fs.writeFileSync(path.join(pk, '_worker.js'), w);
  fs.writeFileSync(path.join(pk, 'index.html'), '<!doctype html><title>TEST_ONLY</title>');
  fs.writeFileSync(pk + '.build.json', JSON.stringify({ files: ['index.html', '_worker.js'], retainedFiles: [] }));
  const r = spawnSync(PYTHON, ['-c', 'import sys; sys.path.insert(0, sys.argv[1]); import prod_strip; sys.stdout.write(prod_strip.strip_worker(open(sys.argv[2], encoding="utf-8").read()))', path.join(ROOT, 'tools'), path.join(pk, '_worker.js')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const gz = (s) => zlib.gzipSync(Buffer.from(s), { level: 9 }).length;
  return { dir, pk, preview: gz(w), prod: gz(r.stdout) };
}
function run(F, cap) {
  const b = path.join(F.dir, 'budget.json');
  fs.writeFileSync(b, JSON.stringify({ budget: { 'shell:index.html': 100000, 'worker:_worker.js': cap }, prodWorker: BUD.prodWorker }));
  const r = spawnSync(PYTHON, [path.join(ROOT, 'tools', 'perf_budget.py'), F.pk], { encoding: 'utf8', env: Object.assign({}, process.env, { KIVO_PERF_BUDGET: b }) });
  return { status: r.status, out: r.stdout + r.stderr };
}

/* الرقمان كما يطبعهما perf_budget (gzip -9 في بايثون) */
const nums = (out) => ({ preview: +/worker:_worker\.js +gz +(\d+) .*Preview/.exec(out)[1], prod: +/worker:_worker\.js prod +gz +(\d+) /.exec(out)[1] });

test('V7 · 53 ③: ينجح بهامش إنتاجٍ ≥ 4٪ وPreview تحت السقف · ويفشل إن نزل الإنتاجُ عن 4٪ · ويفشل إن تجاوز Preview السقف', () => {
  const F = fakePk();
  try {
    let r = run(F, 10000000); assert.equal(r.status, 0, r.out);
    const n = nums(r.out);
    assert.ok(n.preview > n.prod * 1.5, 'أداةُ الاختبار تفرق بين الرقمين: ' + JSON.stringify(n));
    /* ينجح: السقفُ فوق Preview بقليل — وهامشُ الإنتاج وافر */
    r = run(F, n.preview + 10); assert.equal(r.status, 0, r.out);
    /* يفشل: Preview فوق السقف (السقفُ أدنى من Preview بقليل) والإنتاجُ بهامشٍ وافر */
    r = run(F, n.preview - 10);
    assert.notEqual(r.status, 0, 'Preview فوق السقف يُفشل: ' + r.out);
    assert.match(r.out, /✘ worker:_worker\.js +gz/); assert.match(r.out, /✔ worker:_worker\.js prod/, 'والإنتاجُ ناجحٌ وحده');
    /* يفشل: الإنتاجُ بهامش 3٪ — وPreview تحت السقف: حزمةٌ أداتُها صغيرة (الرقمان متقاربان) */
    const G = fakePk(); fs.writeFileSync(path.join(G.pk, '_worker.js'), fs.readFileSync(path.join(G.pk, '_worker.js'), 'utf8').replace(/'[a-z0-9]{1000,}'/, "'x'"));
    r = run(G, 10000000); const m = nums(r.out);
    const cap = Math.ceil(m.prod / 0.97);
    assert.ok(m.preview <= cap, 'Preview تحت هذا السقف: ' + JSON.stringify(m) + ' / ' + cap);
    r = run(G, cap);
    assert.notEqual(r.status, 0, 'هامشُ إنتاجٍ < 4٪ يُفشل: ' + r.out);
    assert.match(r.out, /✘ worker:_worker\.js prod/); assert.doesNotMatch(r.out, /✘ worker:_worker\.js +gz/, 'وPreview نفسُه تحت السقف');
    /* والحدّ: هامشُ 4٪ بالضبط ينجح */
    r = run(G, Math.ceil(m.prod / 0.96) + 1); assert.equal(r.status, 0, r.out);
    fs.rmSync(G.dir, { recursive: true, force: true });
  } finally { fs.rmSync(F.dir, { recursive: true, force: true }); }
});
