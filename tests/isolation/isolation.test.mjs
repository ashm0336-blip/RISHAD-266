/* V7 · د5-ب — اختبارُ العزل الدائم.
   يمسح المصدرَ الحالي (tools/contracts.py --scan) ويفشل عند:
     · استيرادٍ من مجلد برنامجٍ آخر (import) · كتابةِ مفتاحٍ لا يملكه البرنامج (write) · قراءةِ مفتاحِ برنامجٍ آخر بلا إعلان (read)
     · نشرِ حدثٍ أو توفيرِ قراءةٍ/أمرٍ غير معلنٍ في عقده، أو استهلاكِ ما لم يُعلَن (bus)
   إلا ما في قائمة الاستثناءات tests/isolation/exceptions.json — وهي الروابطُ القائمة يوم بُني الاختبار. القائمة **تتقلّص ولا تكبر**:
     · خرقٌ ليس فيها، أو زاد عددُ أسطره ⇒ فشل (رابطٌ جديد).
     · استثناءٌ لم يعد له خرقٌ في المصدر، أو نقص عددُ أسطره ⇒ فشل حتى يُحذف/يُنقَّص (فلا يبقى فيها ما يُعاد استعمالُه).
     · عددُ الاستثناءات ومجموعُ أسطرها لا يتجاوزان السقفَين أدناه؛ كلُّ خطوةٍ في د5 تُنزل السقفَين، وفي د5-ح يصيران صفراً.
   وعقودُ البرامج نفسُها يجب أن تكون سليمة (tools/contracts.py --check). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const CEILING = { entries: 74, lines: 146 };   /* د5-ب: الوضعُ القائم. لا يُرفعان أبداً. */

const scan = () => JSON.parse(execFileSync('python3', [path.join(ROOT, 'tools/contracts.py'), '--src', path.join(ROOT, 'src'), '--scan'], { encoding: 'utf8', maxBuffer: 1 << 26 }));
const allowed = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/isolation/exceptions.json'), 'utf8')).exceptions;

test('the contracts are complete and consistent', () => {
  assert.deepEqual(scan().errors, []);
});

test('no new link between programs: every violation is a listed exception, with no more lines than listed', () => {
  const now = scan().violations, ok = allowed();
  const fresh = Object.keys(now).filter((k) => !(k in ok)).sort(), grown = Object.keys(now).filter((k) => k in ok && now[k] > ok[k]).map((k) => k + ' (' + ok[k] + ' → ' + now[k] + ')').sort();
  assert.deepEqual(fresh, [], 'رابطٌ جديد بين برنامجين — حوّله إلى عقد (قراءة معلنة · أمر · حدث · مشارك) بدل الوصول المباشر:\n' + fresh.join('\n'));
  assert.deepEqual(grown, [], 'رابطٌ قائم زادت أسطرُه:\n' + grown.join('\n'));
});

test('the exception list only shrinks: nothing stale stays in it, and it never exceeds its ceiling', () => {
  const now = scan().violations, ok = allowed();
  const stale = Object.keys(ok).filter((k) => !(k in now)).sort(), loose = Object.keys(ok).filter((k) => k in now && now[k] < ok[k]).map((k) => k + ' (' + ok[k] + ' → ' + now[k] + ')').sort();
  assert.deepEqual(stale, [], 'استثناءٌ لم يعد له وجود — احذفه من tests/isolation/exceptions.json وأنزل السقف:\n' + stale.join('\n'));
  assert.deepEqual(loose, [], 'استثناءٌ نقصت أسطرُه — نقِّص عددَه في القائمة:\n' + loose.join('\n'));
  const entries = Object.keys(ok).length, lines = Object.values(ok).reduce((a, b) => a + b, 0);
  assert.ok(entries <= CEILING.entries && lines <= CEILING.lines, 'القائمة تجاوزت سقفها: ' + entries + ' استثناءً / ' + lines + ' سطراً (السقف ' + CEILING.entries + ' / ' + CEILING.lines + ') — لا يُضاف استثناء');
  for (const k of Object.keys(ok)) assert.match(k, /^[a-z]+\|(read|write|import|bus)\|[^|]+\|[^|]+$/, k);
});

/* الماسحُ نفسُه يكشف كلَّ نوع خرق، وأداةُ العقود ترفض العقدَ الناقص والمتناقض — على شجرةٍ مصطنعة (TEST_ONLY) لا على المستودع */
import os from 'node:os';
function tree(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iso-'));
  for (const [rel, body] of Object.entries(files)) { const p = path.join(dir, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, typeof body === 'string' ? body : JSON.stringify(body)); }
  return dir;
}
const run = (dir, flag) => { try { return { code: 0, out: execFileSync('python3', [path.join(ROOT, 'tools/contracts.py'), '--src', dir, flag], { encoding: 'utf8' }) }; } catch (e) { return { code: e.status, out: String(e.stdout) }; } };
const contract = (system, extra) => ({ schema: 1, system, version: 1, owns: [], provides: {}, consumes: {}, crossEffects: [], ...extra });

test('the scanner catches each kind: undeclared read, foreign write, import, undeclared bus name — and a declared one passes', () => {
  const dir = tree({
    'systems/alpha/contract.json': contract('alpha', { owns: ['bassam_alpha_v1'], provides: { read: { 'alpha.value@1': 'x' }, events: { 'alpha.changed@1': 'x' } } }),
    'systems/beta/contract.json': contract('beta', { owns: ['bassam_beta_v1'], consumes: { 'alpha.value@1': { absent: 'none' } }, provides: { participants: { 'alpha.changed@1': 'x' } } }),
    'systems/alpha/client/a.js': 'KIVO.bus.provide("alpha.value@1", f); KIVO.bus.publish("alpha.changed@1", {});\n',
    'systems/beta/client/ok.js': 'KIVO.bus.read("alpha.value@1"); KIVO.bus.participant("alpha.changed@1", f); var own = "bassam_beta_v1";\n',
    'systems/beta/client/bad.js': 'var r = get("bassam_alpha_v1");\ndraft.set("bassam_alpha_v1", 1);\nimport "../../systems/alpha/client/a.js";\nKIVO.bus.publish("alpha.changed@1", {});\nKIVO.bus.read("alpha.secret@1");\n',
  });
  try {
    const got = JSON.parse(run(dir, '--scan').out);
    assert.deepEqual(got.errors, []);
    assert.deepEqual(Object.keys(got.violations).sort(), [
      'beta|bus|systems/beta/client/bad.js|publish alpha.changed@1',
      'beta|bus|systems/beta/client/bad.js|read alpha.secret@1',
      'beta|import|systems/beta/client/bad.js|alpha',
      'beta|read|systems/beta/client/bad.js|bassam_alpha_v1',
      'beta|write|systems/beta/client/bad.js|bassam_alpha_v1',
    ]);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('an incomplete or contradictory contract fails the check', () => {
  const cases = {
    'no contract file': { 'systems/alpha/x.js': '' },
    'a key owned twice': { 'systems/alpha/contract.json': contract('alpha', { owns: ['bassam_x_v1'] }), 'systems/beta/contract.json': contract('beta', { owns: ['bassam_x_v1'] }) },
    'consumes nothing provides': { 'systems/alpha/contract.json': contract('alpha', { consumes: { 'beta.value@1': { absent: 'none' } } }), 'systems/beta/contract.json': contract('beta') },
    'no absence behaviour': { 'systems/alpha/contract.json': contract('alpha', { provides: { read: { 'alpha.v@1': 'x' } } }), 'systems/beta/contract.json': contract('beta', { consumes: { 'alpha.v@1': {} } }) },
    'a name outside its owner': { 'systems/alpha/contract.json': contract('alpha', { provides: { events: { 'beta.changed@1': 'x' } } }) },
    'participates in an undeclared event': { 'systems/alpha/contract.json': contract('alpha', { provides: { participants: { 'alpha.none@1': 'x' } } }) },
    'a missing field': { 'systems/alpha/contract.json': { schema: 1, system: 'alpha', version: 1, owns: [] } },
  };
  for (const [name, files] of Object.entries(cases)) {
    const dir = tree(files);
    try { assert.equal(run(dir, '--check').code, 1, name); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
  const good = tree({ 'systems/alpha/contract.json': contract('alpha', { owns: ['bassam_x_v1'], provides: { read: { 'alpha.v@1': 'x' } } }), 'systems/beta/contract.json': contract('beta', { consumes: { 'alpha.v@1': { absent: 'none' }, 'key:bassam_x_v1': { absent: 'none' } } }) });
  try { assert.equal(run(good, '--check').code, 0); } finally { fs.rmSync(good, { recursive: true, force: true }); }
});
