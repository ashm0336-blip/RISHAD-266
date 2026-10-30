/* RISHAD 266 — regression gate: preserve owner-approved employee/admin credential format. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const ROOT = path.resolve(import.meta.dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
function policySlice(file, from, to) {
  const s = read(file), a = s.indexOf(from), b = s.indexOf(to, a);
  assert.ok(a !== -1 && b > a, `policy declarations missing in ${file}`);
  return s.slice(a, b);
}
const backend = () => vm.runInNewContext(
  'var PW_MIN=6;\n' + policySlice('workers/parts/052-aud-events.js', 'function unCheck(un)', '/* ── قاعدة D1:') + '\n({unCheck, pwCheck})', {});
const frontend = () => vm.runInNewContext(
  'var PW_MIN=6; function cur(){return {role:"super"}};\n' + policySlice('src/auth/330-auth.js', 'function pinRole(role)', '/* ── المستخدمون') + '\n({unCheck,pwCheck})', {});

test('username format remains 10 digits for employee and platform administrator', () => {
  const b=backend(), f=frontend();
  for(const value of ['0501234567','1234567890']) {
    assert.equal(b.unCheck(value),true);
    assert.equal(f.unCheck(value).ok,true);
  }
  for(const value of ['admin','12345','12345678901','abc1234567']) {
    assert.equal(b.unCheck(value),false);
    assert.equal(f.unCheck(value).ok,false);
  }
});
test('employee and manager roles retain owner-approved numeric PIN policy, frontend equals backend', () => {
  const b=backend(), f=frontend();
  const cases=[
    ['staff','45678',true],['staff','583927',true],['staff','1234',false],
    ['gm','45678',true],['gm','583927',true],
    ['super','583927',true],['dept','583927',true],
    ['super','45678',false],['dept','45678',false],
    ['super','123456',false],['super','111111',false],
    ['super','Password123!',false],['staff','Password123!',false]
  ];
  for(const [role,pw,accepted] of cases) {
    assert.equal(b.pwCheck(pw,role),accepted,`Worker role=${role}, pw=${pw}`);
    assert.equal(f.pwCheck(pw,role).ok,accepted,`Frontend role=${role}, pw=${pw}`);
  }
});
