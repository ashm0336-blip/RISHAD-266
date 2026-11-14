// Usage: import { moduleDir, partPath } from './systems_paths.mjs'   (مكتبةٌ تستوردها الأدواتُ والاختبارات — لا تُشغَّل وحدها)
/* V7 · المرحلة 2 · الحزمة ب — مرآةُ tools/systems_paths.py للأدوات والاختبارات بلغة JS (مساراتٌ فقط، لا سلوك).
   وحدةُ الصفحة: src/modules/<slug>/ أو src/systems/<key>/client/ (الـslug من meta.json) · جزءُ الخادم: كما يسمّيه workers/parts.json. */
import fs from 'node:fs';
import path from 'node:path';

export function moduleDirs(src) {
  const out = {}, m = path.join(src, 'modules');
  if (fs.existsSync(m)) for (const d of fs.readdirSync(m).sort()) if (fs.existsSync(path.join(m, d, 'meta.json'))) out[d] = path.join(m, d);
  const s = path.join(src, 'systems');
  if (fs.existsSync(s)) for (const k of fs.readdirSync(s).sort()) {
    const meta = path.join(s, k, 'client', 'meta.json');
    if (fs.existsSync(meta)) out[JSON.parse(fs.readFileSync(meta, 'utf8')).slug] = path.dirname(meta);
  }
  return out;
}
export function moduleDir(src, slug) { return moduleDirs(src)[slug] || path.join(src, 'modules', slug); }
export function workerParts(partsDir) {
  const order = JSON.parse(fs.readFileSync(path.join(partsDir, '..', 'parts.json'), 'utf8')).parts;
  return order.map((p) => [p.file, path.normalize(path.join(partsDir, p.file))]);
}
export function partPath(partsDir, name) {
  for (const [f, p] of workerParts(partsDir)) if (path.basename(f) === name) return p;
  return path.join(partsDir, name);
}
