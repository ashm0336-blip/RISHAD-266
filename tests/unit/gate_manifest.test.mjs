/* KIVO_263 · غيابُ اختبارٍ إلزامي = إخفاق: tools/gate_manifest.py يستخرج القائمةَ الإلزامية من نصّ البوابة ويرفض
   الاسمَ الذي يقطّعه الفاصل «:» (عيبُ k261tree في 261) والملفَّ الغائب والاسمَ المكرّر — والقائمةُ المختلفة عن النصّ. */
import { fileURLToPath } from 'node:url';
import { PYTHON } from './harness.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TOOL = path.join(ROOT, 'tools', 'gate_manifest.py');
const mk = (body) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'gman-')); fs.mkdirSync(path.join(d, 'cfbench')); fs.writeFileSync(path.join(d, 'cfbench', 'a.mjs'), ''); fs.writeFileSync(path.join(d, 'cfbench', 'b.mjs'), ''); const g = path.join(d, 'g.sh'); fs.writeFileSync(g, body); return { d, g }; };
const run = (...a) => spawnSync(PYTHON, [TOOL, ...a], { encoding: 'utf8' });
const LOOP = (items) => `for t in ${items.map(x => '"' + x + '"').join(' ')}; do\n  n=\${t%%:*}; r=\${t#*:}; f=\${r%%:*}; to=\${r##*:}\ndone\n`;
test('بوابةٌ سليمة ⇒ القائمةُ بأسمائها · --check يطابق', () => {
  const { d, g } = mk('n="فحصٌ أول"; printf x\n' + LOOP(['حزمة أ:a.mjs:300', 'حزمة ب:b.mjs:300']));
  const r = run(g); assert.equal(r.status, 0, r.stdout); assert.deepEqual(r.stdout.trim().split(/\r?\n/).slice(0, 3), ['فحصٌ أول', 'حزمة أ', 'حزمة ب']);
  const man = path.join(d, 'm.txt'); assert.equal(run(g, '--write', man).status, 0); assert.equal(run(g, '--check', man).status, 0);
  fs.writeFileSync(man, 'فحصٌ أول\nحزمة أ\n'); const c = run(g, '--check', man); assert.equal(c.status, 1); assert.match(c.stdout, /في البوابة وليس في القائمة: حزمة ب/);
});
test('«:» داخل الاسم ⇒ إخفاق (الحلقةُ كانت ستقطّعه فلا تُشغَّل الحزمة)', () => {
  const { g } = mk(LOOP(['الشجرة = المنصة 1:1:a.mjs:300']));
  const r = run(g); assert.equal(r.status, 1); assert.match(r.stdout, /الفاصلُ «:» داخل الاسم/);
});
test('ملفٌّ غائب واسمٌ مكرّر ⇒ إخفاق', () => {
  const { g } = mk(LOOP(['حزمة:غائب.mjs:300', 'حزمة أ:a.mjs:300', 'حزمة أ:b.mjs:300']));
  const r = run(g); assert.equal(r.status, 1); assert.match(r.stdout, /ملفٍّ غير موجود: غائب\.mjs/); assert.match(r.stdout, /اسمٌ مكرّر: حزمة أ/);
});
test('قرارُ المالك «غيرُ إلزامي مؤقتاً» صريحٌ في سطر الاسم وحده ⇒ يُستثنى ويُطبع · وبلا العلامة يبقى إلزامياً', () => {
  const { g } = mk('n="إلزامي"; printf x\nn="مؤجَّل"; printf x   # gate:optional-by-owner 2026-10-13\nn="بلا علامة"; printf x   # تعليقٌ آخر\n');
  const r = run(g); assert.equal(r.status, 0, r.stdout);
  const lines = r.stdout.trim().split(/\r?\n/);
  assert.ok(lines.includes('إلزامي') && lines.includes('بلا علامة') && !lines.includes('مؤجَّل'), r.stdout);
  assert.match(r.stdout, /غيرُ إلزامي بقرار المالك: مؤجَّل/); assert.match(r.stdout, /2 اختباراً إلزامياً · 1 غيرُ إلزامي بقرار المالك/);
});
