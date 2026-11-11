/* RISHAD V7 sec — enfFieldOnly fails closed when the grants record cannot be read (deferred note of V7 P3, STATE.md).
   The Assigned confinement of a field observer needs the explicit-grants record. Two different situations looked the same:
     · legacy: there is no grants record by design (the actor has no A.enf) ⇒ the stored sheet alone decides, as before;
     · enforce: the record is always attached when the actor is built (017 · 063), so a missing or unreadable record is a real
       error ⇒ the actor is confined to assigned elements (was: not confined — an error opened the confinement).
   The real server function, called directly (no requests); every other behaviour is covered by v7_p3_sec_field_assigned. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { internals } from './internals.mjs';
const { enfFieldOnly } = await internals(['enfFieldOnly']);

const D = 'TEST_ONLY_d';
const actor = (o = {}) => Object.assign({ u: { role: 'staff', ekey: 'TEST_ONLY_e', deptId: D }, perms: { caps: {}, emps: {} } }, o);
const grants = (plus) => ({ [D]: { v: 1, emp: { TEST_ONLY_e: { plus, minus: [] } } } });

test('legacy (no A.enf): no grants record by design ⇒ the sheet alone decides — not confined without a field sheet', () => {
  assert.equal(enfFieldOnly(actor(), D), false);
});
test('enforce (A.enf): the grants record is missing ⇒ confined (fail closed)', () => {
  assert.equal(enfFieldOnly(actor({ enf: { mode: 'enforce' } }), D), true, 'was false: a read error lifted the confinement');
});
test('enforce: an unreadable grants record (the lookup throws) ⇒ confined', () => {
  const A = actor({ enf: { mode: 'enforce' } });
  Object.defineProperty(A, '__grants', { get() { throw new Error('TEST_ONLY read error'); } });
  assert.equal(enfFieldOnly(A, D), true);
});
test('enforce: a readable record without field.view ⇒ not a field observer (the full matrix on real worlds is v7_p3_sec_field_assigned)', () => {
  assert.equal(enfFieldOnly(actor({ enf: { mode: 'enforce' }, __grants: grants([]) }), D), false);
  assert.equal(enfFieldOnly(actor({ enf: { mode: 'enforce' }, __grants: grants(['round.view', 'round.edit']) }), D), false);
});
test('the platform administrator and the unit account are never confined, with or without a record', () => {
  for (const role of ['super', 'dept']) { assert.equal(enfFieldOnly(actor({ u: { role, ekey: 'x' }, enf: { mode: 'enforce' } }), D), false, role); assert.equal(enfFieldOnly(actor({ u: { role, ekey: 'x' } }), D), false, role + ' legacy'); }
});
