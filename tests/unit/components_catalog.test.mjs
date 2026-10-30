/* KIVO_263 · SOT-152 — كتالوجُ المكوّنات المشتركة (docs/components.md) مطابقٌ للكود: لكل صفٍّ ملفٌّ موجود، والواجهةُ وكلُّ دليل حالةٍ («…») فيه حرفياً */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './harness.mjs';
test('كلُّ مكوّنٍ في الكتالوج بملفّه وحالاته المعلنة موجودةٌ في كوده', () => {
  const md = fs.readFileSync(path.join(ROOT, 'docs', 'components.md'), 'utf8');
  const rows = md.split('\n').filter(l => /^\| [^-|][^|]* \| `src\//.test(l));
  assert.ok(rows.length >= 12, 'صفوفُ الكتالوج: ' + rows.length);
  let states = 0;
  for (const r of rows) {
    const c = r.split(' | ').map(s => s.replace(/^\| |\s\|$/g, ''));
    const file = /`([^`]+)`/.exec(c[1])[1]; const p = path.join(ROOT, file);
    assert.ok(fs.existsSync(p), 'الملف: ' + file);
    const src = fs.readFileSync(p, 'utf8');
    const api = /`(KIVO\.\w+|window\.\w+)/.exec(c[2]); if (api) assert.ok(src.includes(api[1].replace(/^window\./, '').replace(/^KIVO\./, 'KIVO.')) || src.includes(api[1].split('.').pop()), c[0] + ': الواجهة ' + api[1]);
    const needles = [...c[3].matchAll(/«([^»]+(?:»[^\s·]*)?)»/g)].map(m => m[1]);
    for (const n of needles) { const nn = n.replace(/»$/, ''); assert.ok(src.includes(nn), c[0] + ': دليلُ الحالة «' + nn + '» غائبٌ عن ' + file); states++; }
  }
  assert.ok(states >= 25, 'أدلةُ الحالات: ' + states);
});
