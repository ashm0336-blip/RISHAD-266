/* V7 · د4-أ — قائمةُ الاستثناء لاختبار الحذف (tests/removal/names.allow.json): كلُّ مدخلٍ ما زال له موضع.
     · المستودع (الشجرةُ الكاملة): لا مدخلَ بلا موضع — في حالة حذفٍ ما يبقى المقطعُ في ملفه ويسمّي نظاماً غائباً فيها
     · السلوك: مدخلٌ مختلَق (مقطعٌ ليس في الملف · مقطعٌ بلا اسم نظام · ملفٌ ليس من المبحوث فيها · نمطٌ لا يطابق) يُبلَّغ عنه باسمه */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, SRC, SYSTEMS } from './harness.mjs';
import { staleAllow } from '../removal/names_allow.mjs';

const ALLOW = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'removal', 'names.allow.json'), 'utf8'));
/* الشجرةُ الكاملة = كلُّ أنظمة KIVO_FULL_SRC حاضرةٌ هنا (في نسخة حذفٍ يضبطه tools/removal_test.py؛ وفي المستودع هو المصدرُ نفسُه) */
const FULL_SRC = process.env.KIVO_FULL_SRC || SRC, ALL_SYS = fs.existsSync(path.join(FULL_SRC, 'systems')) ? fs.readdirSync(path.join(FULL_SRC, 'systems')).filter((k) => fs.existsSync(path.join(FULL_SRC, 'systems', k, 'system.json'))) : [];
const FULL = ALL_SYS.every((k) => SYSTEMS.includes(k));

test('V7 · د4-أ: المستودع — كلُّ مدخلٍ في قائمة الاستثناء له موضع', { skip: FULL ? false : 'يُفحص على الشجرة الكاملة (نظامٌ غائب هنا)' }, () => {
  assert.deepEqual(staleAllow(ALLOW, ROOT, SRC), []);
  for (const e of ALLOW.skipFiles.concat(ALLOW.patterns, ALLOW.entries)) assert.equal(e.kind, 'legit', 'لا مؤجَّلَ في القائمة');
});

test('V7 · د4-أ: السلوك — المدخلُ الذي زال موضعُه يُبلَّغ عنه', { skip: FULL ? false : 'يُفحص على الشجرة الكاملة (نظامٌ غائب هنا)' }, () => {
  const F = 'workers/parts/016-base-shared.js', mk = (over) => Object.assign({ skipFiles: [], patterns: [], entries: [] }, over);
  let r = staleAllow(mk({ entries: [{ file: F, match: ["swallow('dstats', e)"], kind: 'legit', why: 'x' }] }), ROOT, SRC);
  assert.deepEqual(r, [], 'مقطعٌ موجود في ملفه: مقبول');
  r = staleAllow(mk({ entries: [{ file: F, match: ["TEST_ONLY_award_gone('x')"], kind: 'legit', why: 'x' }] }), ROOT, SRC);
  assert.equal(r.length, 1); assert.match(r[0], /TEST_ONLY_award_gone.*لا موضعَ له/);
  r = staleAllow(mk({ entries: [{ file: F, match: ['function dsToday']   /* د4-ج: مقطعٌ موجود في ملفه ولا يسمّي نظاماً (cuClock صار اسماً معلناً لنظام العهد وله مدخلُه) */, kind: 'legit', why: 'x' }] }), ROOT, SRC);
  assert.equal(r.length, 1); assert.match(r[0], /لا موضعَ له/);
  r = staleAllow(mk({ entries: [{ file: 'workers/parts/TEST_ONLY-none.js', match: ['award'], kind: 'legit', why: 'x' }] }), ROOT, SRC);
  assert.equal(r.length, 1); assert.match(r[0], /ليس من الملفات المبحوث فيها/);
  r = staleAllow(mk({ patterns: [{ pattern: 'TEST_ONLY_[a-z]+_seized_never', kind: 'legit', why: 'x' }], skipFiles: [{ file: 'workers/parts/TEST_ONLY-none.js', kind: 'legit', why: 'x' }] }), ROOT, SRC);
  assert.equal(r.length, 2); assert.match(r.join('\n'), /patterns: .*لا يطابق/); assert.match(r.join('\n'), /skipFiles: .*ليس من الملفات/);
  /* مقطعٌ لا يظهر إلا بغياب نظام (النصُّ المحايد لفتحة) له موضع */
  r = staleAllow(mk({ entries: [{ file: 'workers/parts/019c-employee-transition.js', match: ['awards: {}'], kind: 'legit', why: 'x' }] }), ROOT, SRC);
  assert.deepEqual(r, [], 'النصُّ المحايد لفتحةٍ يُحسب موضعاً');
});

/* V7 · د4-أ — القطعةُ المشتركة المعلنة (src/systems/_shared/<key>/shared.json): يعلنها كلُّ مالكٍ حاضر، وتسمّي من يعلنها */
test('V7 · د4-أ: القطعةُ المشتركة — مالكوها يعلنونها، ونقصُ الإعلان من أحد الطرفين يُرفض', { skip: FULL ? false : 'يُفحص على الشجرة الكاملة (نظامٌ غائب هنا)' }, async () => {
  const { spawnSync } = await import('node:child_process'); const { PYTHON } = await import('./harness.mjs');
  const piece = JSON.parse(fs.readFileSync(path.join(SRC, 'systems', '_shared', 'business', 'shared.json'), 'utf8'));
  assert.deepEqual(piece.owners, ['award', 'seized']); assert.ok(fs.existsSync(path.join(SRC, 'systems', '_shared', 'business', 'business-cloud.js')));
  assert.ok(!fs.existsSync(path.join(SRC, 'modules', 'business-cloud.js')), 'لم تعد في مجلد وحدات القاعدة');
  for (const k of piece.owners) {
    /* V7 · 53 (basefix): المالكُ يعلن كلَّ قطعةٍ مشتركة تسمّيه مالكاً، لا «business» وحدها — port-sync (بند 8) أضاف «kpiring» (الاسترشاد · الرصد · المضبوطات) */
    const mine = fs.readdirSync(path.join(SRC, 'systems', '_shared')).filter((x) => { const f = path.join(SRC, 'systems', '_shared', x, 'shared.json'); return fs.existsSync(f) && JSON.parse(fs.readFileSync(f, 'utf8')).owners.includes(k); }).sort();
    assert.ok(mine.includes('business'), k + ' مالكٌ للقطعة');
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(SRC, 'systems', k, 'system.json'), 'utf8')).shared.slice().sort(), mine, k + ' يعلن القطعةَ وكلَّ قطعةٍ يملكها — لا أقلّ ولا أكثر');
    assert.ok(JSON.parse(fs.readFileSync(path.join(SRC, 'systems', k, 'client', 'meta.json'), 'utf8')).logicParts.includes('../../_shared/business/business-cloud.js'), k + ' يضمّها إلى صفحته');
  }
  const code = `
import json, systems as SY
S = ${JSON.stringify(SRC)}; base = SY.load(S); out = {'ok': SY.problems(S, base)}
a = [dict(d) for d in base]
for d in a:
    if d['key'] == 'award': d.pop('shared', None)
out['undeclared'] = SY.problems(S, a)
b = [dict(d) for d in base]
for d in b:
    if d['key'] == 'dstats': d['shared'] = ['business']
out['stranger'] = SY.problems(S, b)
c = [dict(d) for d in base]
for d in c:
    if d['key'] == 'seized': d['shared'] = list(d['shared']) + ['nosuch']   # V7 · 53: قطعُه المعلنة كلُّها (business · kpiring) وقطعةٌ مجهولة
out['missing'] = SY.problems(S, c)
out['ownerless'] = SY.problems(S, [d for d in base if d['key'] not in ('award', 'seized', 'irshad')])
print(json.dumps(out, ensure_ascii=False))`;
  const r = spawnSync(PYTHON, ['-c', code], { cwd: ROOT, encoding: 'utf8', env: Object.assign({}, process.env, { PYTHONPATH: path.join(ROOT, 'tools') }) });
  assert.equal(r.status, 0, r.stderr); const o = JSON.parse(r.stdout);
  assert.deepEqual(o.ok, []);
  assert.equal(o.undeclared.length, 1); assert.match(o.undeclared[0], /award: مالكٌ للقطعة المشتركة «business» ولا يعلنها/);
  assert.equal(o.stranger.length, 1); assert.match(o.stranger[0], /dstats: shared «business» لا يسمّيه مالكاً/);
  assert.deepEqual(o.ownerless, ['قطعة مشتركة بلا مالك: src/systems/_shared/business — احذفها'], 'غاب المالكان: الفحصُ يطلب الحذف ولا يحذف');
  assert.equal(o.missing.length, 1); assert.match(o.missing[0], /seized: shared «nosuch» بلا/);
});
