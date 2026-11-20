#!/usr/bin/env node
/* V7 · د5-د2 — خريطةُ أسماء جداول العمليات الثابتة (workers/parts/019o1-table-names.js ← OC_TABLE_NAMES).
   كلُّ اسمٍ معلنٍ في تعريفات الموارد مثبَّتٌ على { t: جدولُ الشكل (schema_id في الصفوف) · e: جدولُ الكيان في D1 }، فلا يتبع الاسمُ ترتيبَ
   التسجيل ولا حضورَ برنامج. الخريطةُ مصدرٌ ملتزَم: شكلٌ جديد يُضاف اسمُه إليها صراحةً.
     node tools/oc_tables.mjs --check     (داخل generate --check) على الشجرة الحالية — بأي أنظمةٍ حاضرة:
        ① التعريفاتُ الحاضرة تُحضَّر بالخريطة بلا خطأ (اسمٌ معلنٌ ليس فيها ⇒ فشل: «أضف اسمَه»)
        ② كلُّ جدول كيانٍ تستعمله موجودٌ في ترحيلات D1 (migrations/*.sql) — أو معلنٌ في الخريطة «جديداً» بترحيله
        ③ الخريطةُ متّسقة: الاسمُ الواحد لا يُثبَّت على جدولين
     node tools/oc_tables.mjs --census    ما تعطيه التسميةُ القديمة (بالترتيب) لكل اسمٍ معلن — JSON (للاختبار وللمقارنة)
     node tools/oc_tables.mjs --seed      يكتب الخريطة من التسمية القديمة على الشجرة الكاملة (استُعمل مرةً واحدة عند إنشائها)
   KIVO_OC_EXTRA=ملف.js : تعريفاتٌ إضافية تُضمّ بعد الأجزاء (للاختبار: شكلٌ جديد بلا اسم). */
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), PD = path.join(ROOT, 'workers', 'parts');
const NAMES = '019o1-table-names.js', MODE = process.argv[2] || '--check';
export function load(root = ROOT) {
  const pd = path.join(root, 'workers', 'parts'), C = vm.createContext({});
  const files = JSON.parse(fs.readFileSync(path.join(root, 'workers', 'parts.json'), 'utf8')).parts.map((p) => p.file).filter((f) => /^019[opq]/.test(path.basename(f)));
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(pd, f), 'utf8'), C, { filename: f });
  if (process.env.KIVO_OC_EXTRA) vm.runInContext(fs.readFileSync(process.env.KIVO_OC_EXTRA, 'utf8'), C);
  vm.runInContext('var __DEFS = OC_SCHEDULING_RESOURCES.concat(OC_PEOPLE_TASK_RESOURCES).concat(typeof OC_EXTRA_RESOURCES !== "undefined" ? OC_EXTRA_RESOURCES : []);', C);
  return C;
}
/* كلُّ اسمٍ معلن (ومنه ما تحت شكلٍ مدموجٍ في سابقه) ← الجدولان اللذان يعطيهما التحضير P */
export function census(C, withNames) {
  return JSON.parse(vm.runInContext(`(function (withNames) {
    var P = ocPrepare(__DEFS, withNames ? OC_TABLE_NAMES : undefined), out = {}, bad = [];
    function put(name, spec) { var v = { t: spec.table, e: spec.entityTable || null }; if (out[name] && (out[name].t !== v.t || out[name].e !== v.e)) bad.push(name); out[name] = v; }
    function walk(node, spec, declared) {
      put(declared, spec); (spec.segments || []).forEach(function (g) { put(g.declared || g.table, g); });
      var fields = ocFields(node);
      Object.keys(fields).forEach(function (key) { var child = fields[key]; if (child && child.kind !== 'scalar') walk(child, spec.children[key], child.table); });
      if (node.entry) walk(node.entry, spec.entry, node.entry.table || spec.table + '_values');
      (node.patterns || []).forEach(function (p, i) { walk(p.schema, spec.patterns[i].spec, p.schema.table || spec.table + '_pattern_' + i); });
      (node.choices || []).forEach(function (c, i) { walk(c, spec.choices[i], c.table || spec.table + '_choice_' + i); });
    }
    __DEFS.forEach(function (d) { walk(d.schema, P.resources[d.resource].spec, d.schema.table); });
    return JSON.stringify({ names: out, conflicts: bad, entities: Object.keys(P.entities).sort(), resources: __DEFS.map(function (d) { return d.resource; }) });
  })(${withNames ? 'true' : 'false'})`, C));
}
function migrated() { const out = new Set(); for (const f of fs.readdirSync(path.join(ROOT, 'migrations')).filter((f) => f.endsWith('.sql'))) for (const m of fs.readFileSync(path.join(ROOT, 'migrations', f), 'utf8').matchAll(/CREATE TABLE IF NOT EXISTS\s+"?([A-Za-z0-9_]+)"?/g)) out.add(m[1]); return out; }
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (MODE === '--seed') {
    const full = fs.readFileSync(path.join(PD, NAMES), 'utf8'); const C = load(); const c = census(C, false);
    if (c.conflicts.length) { console.error('✘ اسمٌ معلنٌ على جدولين: ' + c.conflicts.join(', ')); process.exit(1); }
    const body = Object.keys(c.names).sort().map((k) => '  ' + k + ': { t: ' + JSON.stringify(c.names[k].t) + ', e: ' + JSON.stringify(c.names[k].e) + ' },').join('\n');
    fs.writeFileSync(path.join(PD, NAMES), full.slice(0, full.indexOf('var OC_TABLE_NAMES')) + 'var OC_TABLE_NAMES = {\n' + body + '\n};\n');
    console.log('✎ ' + NAMES + ': ' + Object.keys(c.names).length + ' اسماً'); process.exit(0);
  }
  if (MODE === '--census') { console.log(JSON.stringify(census(load(), process.argv.includes('--names')))); process.exit(0); }
  const bad = []; let c = null;
  try { c = census(load(), true); } catch (e) { bad.push(/unnamed-table/.test(String(e.message)) ? 'اسمُ جدولٍ معلنٌ ليس في الخريطة: «' + (e.ocTable || '?') + '» — شكلٌ جديد يُضاف اسمُه صراحةً إلى workers/parts/' + NAMES + ' (t · e) مع ترحيل جدوله' : 'التحضير بالخريطة فشل: ' + e.message); }
  if (c) {
    if (c.conflicts.length) bad.push('اسمٌ معلنٌ على جدولين: ' + c.conflicts.join(', '));
    const have = migrated(); const lost = c.entities.filter((t) => !have.has(t)); if (lost.length) bad.push('جدولُ كيانٍ ليس في ترحيلات D1: ' + lost.join(', '));
  }
  for (const b of bad) console.log('  ✘ ' + b);
  console.log(bad.length ? '✘ خريطة أسماء الجداول: ' + bad.length + ' خللاً' : '✔ خريطة أسماء الجداول: ' + Object.keys(c.names).length + ' اسماً معلناً حاضراً مثبَّتاً · ' + c.entities.length + ' جدولَ كيانٍ كلُّها في الترحيلات');
  process.exit(bad.length ? 1 : 0);
}
