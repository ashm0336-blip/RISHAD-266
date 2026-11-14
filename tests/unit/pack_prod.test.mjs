/* KIVO_263 · SOT-173 (مراجعةٌ مستقلة): التغليفُ لا يُخرج مرشّحَ إنتاجٍ فيه أداةُ الاختبار —
   (أ) بلا <pk>.prod يرفض · (ب) <pk>.prod قديمٌ (المرشّحُ تغيّر بعده) يرفض · (ج) Production_upload بلا الأداة ومحتواه في الجذر، وPreview_upload بها
   KIVO_263 · N4: (د) تغيّرُ عامل المرشّح وحده بعد prod_strip ⇒ يرفض (عاملُ إنتاجٍ قديم) · وبعد إعادة prod_strip يقبل وعاملُ الإنتاج هو الجديدُ منزوعاً
   · (هـ) ملفٌّ زائد في <pk>.prod ليس في المرشّح ⇒ يرفض · وإعادةُ prod_strip تزيله فلا يصل Production */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import zlib from 'node:zlib';
import { PYTHON, ROOT } from './harness.mjs';
const W = "var WORKER_COMMIT = 'unpacked';   // @@KIVO_COMMIT@@\nfunction json(o, s) { return { o: o, s: s }; }\n/* @@KIVO_TEST_TOOL_BEGIN · أداةُ الاختبار */\nasync function enfTestApi() { return enfIsTestUser(tu); }\n/* @@KIVO_TEST_TOOL_END */\nexport default { fetch() { return enfTestApi(); } };\n";
function mk() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_pack_')), pk = path.join(d, 'pk999');
  fs.mkdirSync(path.join(pk, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(pk, '_worker.js'), W); fs.writeFileSync(path.join(pk, 'index.html'), '<!doctype html><title>t</title>'); fs.writeFileSync(path.join(pk, 'assets', 'a.js'), 'var a=1;');
  return { d, pk, out: path.join(d, 'out') };
}
const py = (...a) => spawnSync(PYTHON, a, { encoding: 'utf8' });
const pack = (x) => py(path.join(ROOT, 'tools', 'pack.py'), 'KIVO_999', x.pk, x.out);
/* قارئُ zip صغير (بلا اعتماديات): أسماءُ المدخلات ومحتواها من الدليل المركزي */
function unzip(f) {
  const b = fs.readFileSync(f), out = {}; let i = b.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])); const n = b.readUInt16LE(i + 10); let p = b.readUInt32LE(i + 16);
  for (let k = 0; k < n; k++) {
    const meth = b.readUInt16LE(p + 10), csz = b.readUInt32LE(p + 20), nl = b.readUInt16LE(p + 28), el = b.readUInt16LE(p + 30), cl = b.readUInt16LE(p + 32), off = b.readUInt32LE(p + 42);
    const name = b.slice(p + 46, p + 46 + nl).toString('utf8'); const lnl = b.readUInt16LE(off + 26), lel = b.readUInt16LE(off + 28);
    const raw = b.slice(off + 30 + lnl + lel, off + 30 + lnl + lel + csz); out[name] = meth === 8 ? zlib.inflateRawSync(raw).toString('utf8') : raw.toString('utf8');
    p += 46 + nl + el + cl;
  }
  return out;
}
test('(أ) بلا <pk>.prod ⇒ التغليفُ يرفض', () => {
  const x = mk(); const r = pack(x);
  assert.notEqual(r.status, 0); assert.match(r.stderr + r.stdout, /غائب — شغّل أولاً/);
});
test('(ب) <pk>.prod قديم ⇒ يرفض · (ج) السليم: Production_upload بلا الأداة في الجذر · Preview_upload بها', () => {
  const x = mk();
  assert.equal(py(path.join(ROOT, 'tools', 'prod_strip.py'), x.pk + '/').status, 0, 'prod_strip (والشرطةُ في الآخر لا تنسخ داخل المرشّح)');
  assert.ok(fs.existsSync(x.pk + '.prod') && !fs.existsSync(path.join(x.pk, '.prod')));
  fs.writeFileSync(path.join(x.pk, 'index.html'), '<!doctype html><title>changed</title>');
  const r1 = pack(x); assert.notEqual(r1.status, 0); assert.match(r1.stderr + r1.stdout, /ليس مشتقّاً/);
  assert.equal(py(path.join(ROOT, 'tools', 'prod_strip.py'), x.pk).status, 0);
  const r2 = pack(x); assert.equal(r2.status, 0, r2.stderr);
  const prod = unzip(path.join(x.out, 'KIVO_999_Production_upload.zip')), prev = unzip(path.join(x.out, 'KIVO_999_Preview_upload.zip'));
  assert.ok(prod['_worker.js'] && prod['index.html'] && prod['assets/a.js'], 'المحتوى في الجذر: ' + Object.keys(prod));
  assert.ok(!prod['_worker.js'].includes('@@KIVO_TEST_TOOL') && !prod['_worker.js'].includes('enfIsTestUser(tu)') && prod['_worker.js'].includes("err: 'not-found' }, 404"), 'الإنتاجُ بلا الأداة');
  assert.ok(prev['_worker.js'].includes('@@KIVO_TEST_TOOL_BEGIN'), 'Preview بالأداة المحمية');
  assert.ok(fs.existsSync(path.join(x.out, 'KIVO_999_Preview_MANIFEST.sha256')) && fs.existsSync(path.join(x.out, 'KIVO_999_dist_Candidate.zip')));
});
test('(د) KIVO_263 · N4: تغيّرُ عامل المرشّح وحده بعد prod_strip ⇒ يرفض · وبعد إعادة prod_strip يقبل بالعامل الجديد منزوعاً', () => {
  const x = mk(), strip = (...a) => py(path.join(ROOT, 'tools', 'prod_strip.py'), x.pk, ...a);
  assert.equal(strip().status, 0, 'prod_strip الأول');
  fs.appendFileSync(path.join(x.pk, '_worker.js'), 'var changedAfterStrip = 263;\n');   /* خارجَ العلامتين — وبقيةُ الملفات كما هي */
  const r1 = pack(x); assert.notEqual(r1.status, 0, 'عاملُ إنتاجٍ قديم لا يُغلَّف'); assert.match(r1.stderr + r1.stdout, /ليس مشتقّاً/); assert.match(r1.stderr + r1.stdout, /ليس نزعَ عامل المرشّح/);
  assert.ok(!fs.existsSync(path.join(x.out, 'KIVO_999_Production_upload.zip')), 'لا Production_upload من عاملٍ قديم');
  const c = strip('--check'); assert.notEqual(c.status, 0); assert.match(c.stdout, /ليس نزعَ عامل المرشّح/);
  assert.equal(strip().status, 0, 'إعادةُ prod_strip'); const r2 = pack(x); assert.equal(r2.status, 0, r2.stderr);
  const pw = unzip(path.join(x.out, 'KIVO_999_Production_upload.zip'))['_worker.js'];
  assert.ok(pw.includes('var changedAfterStrip = 263;') && !pw.includes('@@KIVO_TEST_TOOL') && !pw.includes('enfIsTestUser(tu)') && pw.includes("err: 'not-found' }, 404"), 'عاملُ الإنتاج = المرشّحُ الحالي منزوعاً');
});
test('(هـ) KIVO_263 · N4: ملفٌّ زائد في <pk>.prod ليس في المرشّح ⇒ يرفض · وإعادةُ prod_strip تزيله', () => {
  const x = mk(), strip = () => py(path.join(ROOT, 'tools', 'prod_strip.py'), x.pk);
  assert.equal(strip().status, 0);
  fs.writeFileSync(path.join(x.pk + '.prod', 'assets', 'extra.js'), 'var extra = 1;');
  const r1 = pack(x); assert.notEqual(r1.status, 0, 'ملفٌّ زائد لا يُغلَّف'); assert.match(r1.stderr + r1.stdout, /ليس مشتقّاً/); assert.match(r1.stderr + r1.stdout, /زائدٌ في حزمة الإنتاج: assets[\\/]extra\.js/);
  assert.ok(!fs.existsSync(path.join(x.out, 'KIVO_999_Production_upload.zip')), 'لا Production_upload فيه ملفٌّ زائد');
  assert.equal(strip().status, 0, 'إعادةُ prod_strip'); const r2 = pack(x); assert.equal(r2.status, 0, r2.stderr);
  assert.ok(!('assets/extra.js' in unzip(path.join(x.out, 'KIVO_999_Production_upload.zip'))), 'الزائدُ لا يصل Production');
});
