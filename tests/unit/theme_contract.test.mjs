/* KIVO_263 · SOT-088 — عقدُ السمة: الداكنةُ تعيد تعريفَ رموزٍ موجودةٍ في الفاتحة وحدها (لا اسمَ جديد · لا بدائية · لا مرشِّح) — كلُّ مكوّنٍ يقرأ الرمزَ نفسَه في السمتين */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SRC } from './harness.mjs';
const rd = (f) => { const p = [path.join(SRC, 'styles', f), path.join(SRC, 'client', 'css', f)].find(fs.existsSync); return p ? fs.readFileSync(p, 'utf8') : null; };
test('السمةُ الداكنة ⊆ رموز الفاتحة · دلاليةٌ وحدها · داخل @media screen · بلا مرشِّحات', (t) => {
  const L = rd('070-theme-tokens.css'), D = rd('080-theme-dark.css');
  if (!L || !D) return t.skip('ملفّا السمة غيرُ موجودَين في هذا المصدر');
  const names = (s) => new Set([...s.matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)].map(m => m[1]));
  const lt = names(L), dt = names(D);
  assert.ok(dt.size > 100, 'السمةُ الداكنة معرَّفة (' + dt.size + ')');
  const extra = [...dt].filter(x => !lt.has(x)); assert.deepEqual(extra, [], 'رموزٌ داكنةٌ بلا مقابلٍ فاتح');
  assert.deepEqual([...dt].filter(x => x.startsWith('--p-')), [], 'لا بدائيةَ تُعاد تعريفُها في الداكن');
  assert.match(D.trim(), /^@media screen\s*\{\s*html\[data-theme="dark"\]/, 'الداكنُ داخل @media screen (الطباعةُ فاتحة)');
  assert.doesNotMatch(D, /filter\s*:\s*[^;]*(invert|hue-rotate)/, 'لا مرشِّحات لتوليد الداكن');
});
