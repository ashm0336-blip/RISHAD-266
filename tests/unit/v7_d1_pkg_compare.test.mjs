/* V7 · المرحلة 2 · الحزمة د1 — أداةُ مقارنة حزمتين (tools/pkg_compare.py) تتجاهل سطرَ رقم الالتزام وحده.
   والعاملُ المولَّد يحمل سطرَ العلامة مرّةً واحدة بقيمة «unpacked» (القيمةُ الحقيقية يحقنها tools/pack.py في الحزمة وحدها). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, PYTHON, WORKER } from './harness.mjs';

const MARK = /^var WORKER_COMMIT = '[^'\n]*';   \/\/ @@KIVO_COMMIT@@$/gm;
const pkg = (worker, other = 'TEST_ONLY same') => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'v7d1pkg_')); fs.writeFileSync(path.join(d, '_worker.js'), worker); fs.mkdirSync(path.join(d, 'assets')); fs.writeFileSync(path.join(d, 'assets', 'a.txt'), other); return d; };
const cmp = (a, b) => spawnSync(PYTHON, [path.join(ROOT, 'tools', 'pkg_compare.py'), a, b], { encoding: 'utf8' });
const W = (commit, tail = 'var B = 2;') => "var A = 1;\nvar WORKER_COMMIT = '" + commit + "';   // @@KIVO_COMMIT@@\n" + tail + '\n';

test('العاملُ المولَّد: سطرُ العلامة مرّةً واحدة بقيمة unpacked، و/api/ping يعيده', () => {
  const src = fs.readFileSync(WORKER, 'utf8'), m = src.match(MARK);
  assert.equal(m && m.length, 1, 'سطرٌ واحد');
  assert.equal(m[0], "var WORKER_COMMIT = 'unpacked';   // @@KIVO_COMMIT@@");
  assert.match(src, /pingOut = \{ ok: 1, cf: 1, ver: WORKER_VER, commit: WORKER_COMMIT, fresh:/);
});

test('المقارنة: سطرُ الرقم وحده يُتجاهل · أيُّ سطرٍ آخر أو ملفٍّ آخر فرق · غيابُ العلامة أو تكرارُها فرق', () => {
  const c1 = '0'.repeat(40), c2 = 'a'.repeat(40) + '-dirty';
  assert.equal(cmp(pkg(W(c1)), pkg(W(c2))).status, 0, 'الرقمُ وحده يختلف ⇒ متطابقتان');
  assert.equal(cmp(pkg(W(c1)), pkg(W(c1, 'var B = 3;'))).status, 1, 'سطرٌ آخر في العامل ⇒ فرق');
  assert.equal(cmp(pkg(W(c1)), pkg(W(c1), 'TEST_ONLY other')).status, 1, 'ملفٌّ آخر ⇒ فرق');
  assert.equal(cmp(pkg(W(c1)), pkg('var A = 1;\nvar B = 2;\n')).status, 1, 'بلا علامة ⇒ فرق');
  assert.equal(cmp(pkg(W(c1) + W(c1)), pkg(W(c1) + W(c1))).status, 1, 'علامةٌ مكرّرة ⇒ فرق');
  const r = cmp(pkg(W(c1)), pkg(W(c2))); assert.match(r.stdout, new RegExp(c1 + '  ·  ' + c2), 'يطبع الرقمين');
});
