/* KIVO_262 · منعُ تخفيض بصمة كلمة المرور: غيرُ مدير النظام لا يكتب بصمةً جديدة إلا بصيغة p2$ وبعدد التكرارات المضبوط —
   في المسار القديم (usersRule) ومسار الإنفاذ (enfUsersWrite)؛ والبصمةُ القائمةُ دون تغيير تمرّ؛ ومديرُ النظام مستثنى (الاستعادة) */
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = ['016-identity-preflight-2.js', '018-ancestry.js'].map(f => fs.readFileSync(path.join(ROOT, 'workers', 'parts', f), 'utf8'));
const ctx = vm.createContext({});
/* phNewOk وحدها مع ثوابتها — دون تشغيل بقية الجزأين */
const grab = (s, re) => { const m = re.exec(s); assert.ok(m, 'missing ' + re); return m[0]; };
vm.runInContext(grab(src[0], /var PBKDF2_ITER = \d+, PBKDF2_MAX = \d+;/) + '\n' + grab(src[1], /var PH_NEW_RX = [^\n]+\nfunction phNewOk\(a, b\) \{[\s\S]*?\n\}/), ctx);
const ok = (a, b) => vm.runInContext('phNewOk(' + JSON.stringify(a) + ',' + JSON.stringify(b) + ')', ctx);
const P2 = 'p2$100000$' + 'a'.repeat(32) + '$' + 'b'.repeat(64);
test('بصمةٌ حديثة صحيحة تُقبل · والقائمةُ دون تغيير تمرّ ولو كانت قديمة', () => {
  assert.equal(ok(null, { ph: P2 }), true);
  assert.equal(ok({ ph: 'p1$abc.def' }, { ph: 'p1$abc.def' }), true);
  assert.equal(ok({ ph: P2 }, { name: 'x' }), true);
});
test('التخفيضُ والاعتباطيُّ والتكراراتُ الشاذّة تُرفض', () => {
  assert.equal(ok(null, { ph: 'p1$abc.def' }), false);
  assert.equal(ok({ ph: P2 }, { ph: 'p1$abc.def' }), false);
  assert.equal(ok(null, { ph: 'plain' }), false);
  assert.equal(ok(null, { ph: 'p2$1000$' + 'a'.repeat(32) + '$' + 'b'.repeat(64) }), false);
  assert.equal(ok(null, { ph: 'p2$9999999$' + 'a'.repeat(32) + '$' + 'b'.repeat(64) }), false);
  assert.equal(ok(null, { ph: 'p2$100000$' + 'A'.repeat(32) + '$' + 'b'.repeat(64) }), false);
});
test('الحارسُ موصولٌ في المسارين (usersRule · enfUsersWrite) لغير مدير النظام', () => {
  const r018 = src[1], r059 = fs.readFileSync(path.join(ROOT, 'workers', 'parts', '059-protected-ops-2.js'), 'utf8');
  assert.equal((r018.match(/(?<!function )phNewOk\(a, b\)/g) || []).length, 2);
  assert.equal((r059.match(/phNewOk\(a, b\)/g) || []).length, 2);
  assert.match(r059, /\(sup \|\| \(userRecOk\(b\) && phNewOk\(a, b\)\)\)/);
});
