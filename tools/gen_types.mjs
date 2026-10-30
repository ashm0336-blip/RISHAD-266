#!/usr/bin/env node
/* KIVO_258 · SOT-102 — العقودُ البنيوية للـIDE والاختبارات والوثائق: src/types/kivo.d.ts مولَّدٌ (لا يُحرَّر يدوياً) من المصادر الرسمية نفسِها:
   (١) الكياناتُ: عقودُ الحقول FIELDS في الخادم (النوع · الواجب · المغلق · التعداد) — الواجبُ غيرُ اختياري · المغلقُ بلا فهرسٍ مفتوح
   (٢) الموارد: سجلُّ الموارد RES_REG (النطاق · الورقة · القاعدة) × سجلُّ الكيانات ENT (الجذر · المجموعات · الخريطة · القوائمُ البدائية) ⇒ نوعُ القيمة المخزَّنة لكل مفتاح
   (٣) الواجهةُ البرمجية: src/api/contracts.json (المسار · الطرائق · الوصول · مفاتيحُ الردّ لكل حالة)
   (٤) سجلُّ الصفحات: src/manifests/pages.json (الصفحات · الحاويات) والعدساتُ من الإضافات src/plugins/lenses (KIVO_259 · ADR-018) — بأسمائها مفاتيحَ حرفية
   (٥) الفضاءُ العام window.KIVO: الأسماءُ الـ94 (tools/kivo_ns.mjs --list) — والأسماءُ القديمة على window للتوافق
     node tools/gen_types.mjs [--check] */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src/types/kivo.d.ts');
/* سجلّاتُ الخادم من العامل المركَّب نفسِه (نسخةٌ مؤقتة يُلحق بها export — كما tests/unit/internals.mjs) */
const wsrc = fs.readFileSync(path.join(ROOT, 'workers/_worker.js'), 'utf8');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_types_')), wf = path.join(tmp, 'w.mjs');
fs.writeFileSync(wf, wsrc + '\nexport { FIELDS, ENT, RES_REG, OPS, IDF_ANY };\n');
const Wk = await import(pathToFileURL(wf).href); fs.rmSync(tmp, { recursive: true, force: true });
const { FIELDS, ENT, RES_REG, OPS } = Wk;
const C = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/api/contracts.json'), 'utf8'));
const M = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/manifests/pages.json'), 'utf8'));
const NS = JSON.parse(execFileSync('node', ['tools/kivo_ns.mjs', 'tools/kivo_ns.json', '--list'], { cwd: ROOT, encoding: 'utf8' }));
const pascal = (s) => s.replace(/^bassam_/, '').replace(/_v\d+$/, '').split(/[_\-]/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join('');
const TS = { str: 'string', num: 'number', bool: 'boolean' };
const q = (s) => JSON.stringify(s);
const L = [];
L.push('/* ═══ KIVO — العقودُ البنيوية (SOT-102 · KIVO_258) — مولَّدٌ بـtools/gen_types.mjs من: FIELDS · ENT · RES_REG · OPS (الخادم) ·');
L.push('   src/api/contracts.json · src/manifests/pages.json · tools/kivo_ns.json. لا يُحرَّر يدوياً؛ `node tools/gen_types.mjs --check` في البوابة. ═══ */');
L.push('/* eslint-disable */', '');
L.push('/* ── (١) الكيانات — عقودُ الحقول (يُفحص المتغيّرُ وحدَه عند الحفظ؛ الإرثُ لا يُعاقَب) ── */');
const entIface = {};
const iface = (name, sp, note) => {
  const req = new Set(sp.req || []), out = ['/** ' + note + (sp.closed ? ' · عقدٌ مغلق' : ' · حقولٌ إضافية تُحتمل (سجلّاتٌ قديمة)') + (sp.uniq ? ' · تفرّد: ' + sp.uniq.map(u => u.f).join('،') : '') + ' */', 'export interface ' + name + ' {'];
  const fields = Object.keys(sp.type || {});
  for (const f of fields) { const en = sp.enum && sp.enum[f]; out.push('  ' + f + (req.has(f) ? '' : '?') + ': ' + (en ? en.map(q).join(' | ') : (TS[sp.type[f]] || 'unknown')) + ';'); }
  for (const f of req) if (fields.indexOf(f) === -1) out.push('  ' + f + ': unknown;');
  if (!sp.closed) out.push('  [field: string]: unknown;');
  out.push('}'); return out;
};
for (const rn of Object.keys(FIELDS).sort()) {
  const F = FIELDS[rn];
  if (F.cols) for (const at of Object.keys(F.cols).sort()) { const n = pascal(rn) + at[0].toUpperCase() + at.slice(1).replace(/s$/, ''); entIface[rn + '|' + at] = n; L.push(...iface(n, F.cols[at], rn + ' · ' + at + '[]')); }
  else { const n = pascal(rn).replace(/s$/, ''); entIface[rn + '|'] = n; L.push(...iface(n, F, rn + (F.at ? ' · ' + F.at : ' (الجذر)'))); }
}
L.push('', '/* ── (٢) الموارد — نوعُ القيمة المخزَّنة لكل مفتاح (bsdept:<إدارة>:<المورد> لموارد الإدارة) ── */');
const valueType = (rn) => {
  const E = ENT[rn]; if (!E) return 'unknown';
  if (E.primRoot) return 'string[]';
  if (E.map) return 'Record<string, ' + (E.sub === 'list' ? 'unknown[]' : E.sub === 'map' ? 'Record<string, unknown>' : 'unknown') + '>';
  if (E.cols) {
    const root = E.cols.find(c => !c.at); if (root) return (entIface[rn + '|'] || 'Record<string, unknown>') + '[]';
    const parts = E.cols.map(c => c.at + ': ' + (entIface[rn + '|' + c.at] || 'Record<string, unknown>') + '[]');
    if (E.mapAt) parts.push(E.mapAt + '?: Record<string, unknown>');
    return '{ ' + parts.join('; ') + '; [field: string]: unknown }';
  }
  if (E.prim) return '{ ' + E.prim.map(f => f + '?: string[]').join('; ') + '; [field: string]: unknown }';
  if (E.empty === '0') return 'number';
  if (E.empty === '[]') return 'unknown[]';
  return 'Record<string, unknown>';
};
L.push('export interface KivoResources {');
for (const rn of Object.keys(RES_REG).sort()) {
  const R = RES_REG[rn], caps = Array.isArray(R.cap) ? R.cap.join(' | ') : (R.cap || ''), ops = OPS[rn] ? ' · اعتماد: ' + OPS[rn].approve.join('، ') : '';
  L.push('  /** ' + R.scope + (caps ? ' · الورقة: ' + caps : '') + (R.rule ? ' · قاعدة: ' + R.rule : '') + ops + ' */');
  L.push('  ' + q(rn) + ': ' + (R.scope === 'device' ? 'unknown /* تفضيلُ جهاز — لا يُخزَّن مركزياً */' : valueType(rn)) + ';');
}
L.push('}', 'export type KivoResourceName = keyof KivoResources;', 'export type KivoDeptKey<R extends KivoResourceName = KivoResourceName> = `bsdept:${string}:${R & string}`;', '');
L.push('/* ── (٣) الواجهةُ البرمجية /api/* — العقدُ الآلي (المسار · الطرائق · الوصول · مفاتيحُ الردّ لكل حالة) ── */');
L.push('export interface KivoApi {');
for (const r of C.routes) {
  const resp = Object.keys(r.responses || {}).map(st => q(st) + ': { ' + ((r.responses[st].keys || []).map(k => k + ': unknown').join('; ') || '[k: string]: unknown') + ' }').join('; ');
  L.push('  ' + q(r.path) + ': { methods: ' + r.methods.map(q).join(' | ') + '; access: ' + q(r.access) + '; responses: { ' + resp + ' } };');
}
L.push('}', 'export type KivoApiPath = keyof KivoApi;', '');
L.push('/* ── (٤) سجلُّ الصفحات (src/manifests/pages.json) ── */');
L.push('export type KivoPageKey = ' + M.pages.map(p => q(p.key)).join(' | ') + ';');
L.push('export type KivoNavKey = ' + M.navOrder.map(q).join(' | ') + ';');
/* KIVO_259 · AUD-030 (ADR-018): العدساتُ من الإضافات (src/plugins/lenses/<key>/manifest.json) — pages.json لم يعد يحملها */
const PLUG = path.join(ROOT, 'src/plugins/lenses');
const LENSES = M.lenses || (fs.existsSync(PLUG) ? fs.readdirSync(PLUG).filter(k => fs.existsSync(path.join(PLUG, k, 'manifest.json'))).map(k => JSON.parse(fs.readFileSync(path.join(PLUG, k, 'manifest.json'), 'utf8'))).sort((a, b) => a.order - b.order || (a.key < b.key ? -1 : 1)) : []);
L.push('export type KivoLensKey = ' + LENSES.map(x => q(x.key)).join(' | ') + ';');
L.push('/** عدسةٌ كإضافة — src/plugins/lenses/<key>/manifest.json (المخطّط src/schemas/lens-plugin.schema.json) */');
L.push('export interface KivoLensPlugin { schema: 1; kind: "lens"; key: KivoLensKey; name: string; label: string; order: number; owner: string; hosts: string[];',
       '  keys: { own: string[]; managedRefs: string[]; reserved: string[] };',
       '  resources: { column?: { name: string; seq: number; hideFlag?: string; identity: string; geometry: string[]; derived?: string[]; editKey: string; status: { fields: string[]; op: string } };',
       '    elementFields?: { cols: string[]; fields: string[]; op: string }[]; floorFields?: { field: string; op: string }[]; indicators?: string[] };',
       '  guards: { enable: string; resources: ("bassam_plan_v1" | "bassam_rounds_v1")[] }; tests: string[] }');
L.push('export interface KivoPage { key: KivoPageKey; nav?: string; name: string; under?: string; seq?: string[]; subs?: { key: string; name: string }[]; tabs?: { key: string; name: string; offPage?: boolean }[] }', '');
L.push('/* ── (٥) الفضاءُ العام window.KIVO (AUD-016 · ADR-017) — ' + NS.names.length + ' اسماً؛ الأسماءُ نفسُها على window موصِّلاتٌ غيرُ قابلةٍ للعدّ (توافقٌ خلفي) ── */');
L.push('export interface KivoNamespace {');
for (const n of NS.names) L.push('  ' + (/^[A-Za-z_$][\w$]*$/.test(n) ? n : q(n)) + ': any;');
L.push('  Custody: any;', '  BackupRestore: any;');
L.push('}', 'declare global {', '  var KIVO: KivoNamespace;', '  interface Window extends Omit<KivoNamespace, "Custody" | "BackupRestore"> { KIVO: KivoNamespace }', '}', 'export {};', '');
const txt = L.join('\n');
/* صحّةُ الصيغة: esbuild يحلّل الملفَّ TypeScript (الأنواعُ وحدها — الناتجُ فارغ) */
let parseErr = ''; try { const { createRequire } = await import('module'); createRequire(ROOT + '/package.json')('esbuild').transformSync(txt, { loader: 'ts' }); } catch (e) { parseErr = String(e.message || e).slice(0, 300); }
if (parseErr) { console.log('✘ src/types/kivo.d.ts: صيغةُ TypeScript غيرُ صالحة — ' + parseErr); process.exit(1); }
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  const okk = cur === txt;
  console.log((okk ? '✔ ' : '✘ ') + 'src/types/kivo.d.ts ' + (okk ? '= التوليد' : '≠ التوليد — شغّل tools/gen_types.mjs') + ' (كيانات ' + Object.keys(entIface).length + ' · موارد ' + Object.keys(RES_REG).length + ' · مسارات ' + C.routes.length + ' · صفحات ' + M.pages.length + ' · أسماء ' + NS.names.length + ')');
  process.exit(okk ? 0 : 1);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, txt);
console.log('✎ src/types/kivo.d.ts (' + txt.split('\n').length + ' سطراً)');
