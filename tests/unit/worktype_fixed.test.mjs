/* KIVO_265 · قرارُ المالك (2026-10-19): نوعُ العمل في الجدول الشهري قائمةٌ مغلقة — «إداري» و«ميداني» فقط.
   كان يُقرأ من bassam_options_v1 → options.work[] ويُضاف إليه ويُعاد تسميتُه ويُحذف؛ ومؤشّراتُ الإدارة (الميدانيون ÷ الإجمالي) والمهامُ
   والتقريرُ اليومي تطابق «ميداني» حرفياً — فأيُّ نوعٍ ثالث يُفسد الحسابَ بصمت. يُثبت هنا: لا واجهةَ إضافةٍ أو تعديلٍ أو حذف ·
   القائمةُ ثابتةٌ في المصدر · القيمةُ خارجها لا تُكتب · والاستيرادُ من Excel يطبّع القيمةَ إلى القائمة أو يتركها فارغة. */
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('الجدولُ الشهري: لا إضافةَ ولا تسميةَ ولا حذفَ لنوع العمل في الواجهة', () => {
  const all = rd('src/modules/staff/view.html');
  const i = all.indexOf('data-label="نوع العمل"'); assert.ok(i > 0, 'خانةُ نوع العمل موجودة');
  const v = all.slice(i, all.indexOf('<td ', i + 10));   /* كتلةُ خانة نوع العمل وحدها (خاناتُ الرمز والوردية لها قوائمُها الحرّة) */
  assert.doesNotMatch(v, /إضافة نوع عمل/, 'حقلُ «إضافة نوع عمل» أُزيل');
  assert.doesNotMatch(v, /\{\{o\.edit\}\}|\{\{o\.del\}\}|\{\{o\.editing\}\}/, 'أزرارُ تعديل الاسم وحذف الخيار أُزيلت');
  assert.doesNotMatch(v, /\{\{e\.wkAdd\}\}|\{\{wkNew\}\}/, 'لا زرَّ إضافةٍ ولا حقلَ نصٍّ حرّ');
  assert.match(v, /\{\{e\.wkOpts\}\}/, 'القائمةُ نفسُها باقية للاختيار');
  assert.doesNotMatch(v, /data-sd="src"/, 'سطرُ «تُعرَّف الورديات في الإعدادات» ليس في قائمة نوع العمل');
  const col = (lab) => { const j = all.indexOf('data-label="' + lab + '"'); return all.slice(j, all.indexOf('<td ', j + 10)); };
  assert.doesNotMatch(col('رمز النداء'), /data-sd="src"/, 'ولا في قائمة رمز النداء');
  assert.doesNotMatch(col('الصلاحيات'), /data-pm="src"/, 'ولا في قائمة الصلاحيات');
  assert.match(col('الوردية المسندة'), /data-sd="src"/, 'وباقٍ في قائمة الوردية المسندة وحدها');
});

test('المنطق: القائمةُ ثابتة (ميدانيـ / ـة · إداريـ / ـة) ولا تُقرأ من bassam_options_v1 · القيمةُ خارجها لا تُكتب · الإضافةُ والتسميةُ والحذف تُرفض', () => {
  const l = rd('src/modules/staff/logic.js');
  assert.match(l, /wkFixed\(\) \{\s*return \["ميدانيـ \/ ـة", "إداريـ \/ ـة"\];/, 'القائمةُ المغلقة معلنةٌ في المصدر');
  const load = l.slice(l.indexOf('  loadWkOpts() {'), l.indexOf('  wkFixedMsg() {'));
  assert.doesNotMatch(load, /bassam_options_v1/, 'loadWkOpts لا يقرأ القائمةَ الحرّة القديمة');
  assert.match(load, /wkFixed\(\)\.slice\(\)/, 'loadWkOpts يعيد القائمةَ الثابتة');
  for (const fn of ['wkAdd() {', 'wkRename(t, e) {', 'wkDel(t) {']) {
    const body = l.slice(l.indexOf('  ' + fn), l.indexOf('  ' + fn) + 220);
    /* d5a08a6: the guard became unconditional — the whole body is the refusal message (stricter than the former `if (wkFixed()) return void`) */
    assert.match(body, /^  [^\n]*\{\n\s*this\.wkFixedMsg\(\);\n\s*\}/, fn + ' يُرفض برسالة');
  }
  const set = l.slice(l.indexOf('  async wkSetEmp(t, e) {'), l.indexOf('  async wkSetEmp(t, e) {') + 260);   /* d5a08a6: async (Operations save) */
  assert.match(set, /!this\.wkCanon\(e\)\) return void this\.wkFixedMsg\(\)/, 'wkSetEmp لا يكتب قيمةً خارج القائمة');
  assert.match(l, /غير معتمد/, 'القيمةُ القديمة خارج القائمة تُعلَّم «غير معتمد» حتى يُعاد اختيارُها');
});

test('الاستيرادُ من Excel: نوعُ العمل يُطبَّع إلى القائمة المغلقة أو يُترك فارغاً', () => {
  const s = rd('src/services/590-employees-import.js');
  assert.match(s, /work: wkNorm9\(g\(ix\.work\)\)/, 'حقلُ work يمرّ بالتطبيع');
  const m = /function wkNorm9\(v\)\{[^\n]*\}/.exec(s); assert.ok(m, 'دالةُ التطبيع موجودة');
  const wkNorm9 = vm.runInNewContext('(' + m[0].replace(/^function wkNorm9/, 'function') + ')', {});   /* نصُّ المستودع نفسُه لا مدخلٌ خارجي */
  assert.equal(wkNorm9('إداري'), 'إداريـ / ـة'); assert.equal(wkNorm9('اداري'), 'إداريـ / ـة'); assert.equal(wkNorm9(' ميداني '), 'ميدانيـ / ـة'); assert.equal(wkNorm9('ميدانى'), 'ميدانيـ / ـة'); assert.equal(wkNorm9('ميدانيـ / ـة'), 'ميدانيـ / ـة'); assert.equal(wkNorm9('إداريـ / ـة'), 'إداريـ / ـة');
  assert.equal(wkNorm9('مراقبة'), ''); assert.equal(wkNorm9('ميداني مؤقت'), ''); assert.equal(wkNorm9(''), ''); assert.equal(wkNorm9(null), '');
});
