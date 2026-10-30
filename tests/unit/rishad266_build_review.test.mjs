/* Independent artifact verification: temporary outputs only; no Git history or old release input. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { ROOT, PYTHON } from './harness.mjs';
import { minProved, sig } from '../../tools/jsmin_tokens.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const env = { ...process.env, PATH: path.dirname(process.execPath) + path.delimiter + process.env.PATH, PYTHONIOENCODING: 'utf-8' };
function run(args) { return spawnSync(PYTHON, [path.join(ROOT, 'tools/build.py'), ...args], { cwd: ROOT, env, encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024 }); }
function ok(result) { assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout); }

test('token proof keeps observable ASI, regex, templates and Unicode line breaks in executable examples', () => {
  const samples = [
    'function f(){return /* TEST_ONLY */\n{value:1};}globalThis.result=f();',
    'let a=1,b=2; a\n++b; globalThis.result=[a,b];',
    'globalThis.result=/a\\/b/.test("a/b") && /[/*]/.test("/");',
    'function t(s,...v){return [s.raw,...v]}globalThis.result=t`TEST_ONLY\\n${2+3}`;',
    'function f(){return\u2028{value:1}}globalThis.result=f();',
    'let x=1;globalThis.result=x/* TEST_ONLY same-line comment */+ +2;',
  ];
  for (const source of samples) {
    const minified = minProved(source); assert.deepEqual(sig(minified), sig(source));
    const before = vm.createContext({}), after = vm.createContext({}); vm.runInContext(source, before); vm.runInContext(minified, after);
    assert.equal(JSON.stringify(after.result), JSON.stringify(before.result));
  }
});

test('the default launcher discovers local runtimes and reaches the existing workflow without KIVO runtime overrides', () => {
  const environment = { ...env }; delete environment.KIVO_BASH; delete environment.KIVO_PYTHON; delete environment.PYTHONPATH;
  // An intentionally unsupported release reaches the existing shell guard and
  // exits before generating or deleting an artifact; this still exercises the
  // real runtime discovery and cross-platform launch that previously hit ENOENT.
  const result = spawnSync(process.execPath, [path.join(ROOT, 'tools/build_chain.mjs'), '266', '--current'], { cwd: ROOT, env: environment, encoding: 'utf8', timeout: 60000 });
  assert.equal(result.status, 2, result.error?.message || result.stderr || result.stdout);
  assert.match(result.stderr, /No current contract is configured for this release/); assert.doesNotMatch(result.stderr, /setup error|ENOENT/);
  const scripts = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts;
  assert.equal(scripts['build:265'], 'node tools/build_chain.mjs 265 --current'); assert.equal(scripts['check:265'], 'node tools/build_chain.mjs 265 --check-current');
});

test('fresh current artifact verifies exact files, source SHA and token proof, and rejects extras or an obsolete Worker', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'rishad266-build-review-')), out = path.join(temp, 'candidate');
  const args = ['--src', path.join(ROOT, 'src'), '--mode', 'split', '--pages', 'lazy', '--minify-worker', '--out', out];
  try {
    ok(run(args)); ok(run([...args, '--verify']));
    const manifestPath = out + '.build.json', manifestBytes = fs.readFileSync(manifestPath), manifest = JSON.parse(manifestBytes);
    assert.deepEqual(manifest.retained, []); assert.deepEqual(manifest.retainedFiles, []);
    const source = fs.readFileSync(path.join(ROOT, 'workers/_worker.js')), workerPath = path.join(out, '_worker.js'), currentWorker = fs.readFileSync(workerPath);
    assert.equal(manifest.workerTransform.sourceSha256, digest(source)); assert.equal(manifest.workerTransform.sourceBytes, source.length);
    assert.equal(manifest.workerTransform.sha256, digest(currentWorker)); assert.equal(manifest.workerTransform.proof, 'tokens-equal');
    assert.equal((currentWorker.toString().match(/@@KIVO_TEST_TOOL_BEGIN/g) || []).length, 1); assert.equal((currentWorker.toString().match(/@@KIVO_TEST_TOOL_END/g) || []).length, 1);

    const foreign = path.join(out, 'TEST_ONLY_unexpected.txt'); fs.writeFileSync(foreign, 'TEST_ONLY');
    const extra = run([...args, '--verify']); assert.notEqual(extra.status, 0); assert.match(extra.stderr, /exact artifact file set/); fs.unlinkSync(foreign);

    const oldSource = source.toString().replace(/\bKIVO_SCHEMA_VERSION\s*=\s*\d+/, 'KIVO_SCHEMA_VERSION = 0'); assert.notEqual(oldSource, source.toString());
    const obsolete = Buffer.from(minProved(oldSource, { preserveTestToolMarkers: true })); fs.writeFileSync(workerPath, obsolete);
    manifest.files['_worker.js'] = { bytes: obsolete.length, sha256: digest(obsolete) };
    Object.assign(manifest.workerTransform, { bytes: obsolete.length, sha256: digest(obsolete) });
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    const fakeProof = run([...args, '--verify']); assert.notEqual(fakeProof.status, 0); assert.match(fakeProof.stderr, /token-stream proof failed/, 'A claimed proof in a coherent manifest cannot override the actual token comparison');
    Object.assign(manifest.workerTransform, { sourceBytes: Buffer.byteLength(oldSource), sourceSha256: digest(oldSource) }); fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    const old = run([...args, '--verify']); assert.notEqual(old.status, 0); assert.match(old.stderr, /source differs from current generated source/);

    fs.writeFileSync(workerPath, currentWorker); fs.writeFileSync(manifestPath, manifestBytes); ok(run([...args, '--verify']));
  } finally {
    const resolved = fs.realpathSync(temp), parent = fs.realpathSync(os.tmpdir()); assert.equal(path.dirname(resolved), parent); assert.ok(path.basename(resolved).startsWith('rishad266-build-review-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});
