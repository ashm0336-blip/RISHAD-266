/* CORE-01 · step 3 — switching the active unit (and adding a section) never drops unsaved edits.
   The real root-logic runs in vm (core01_root_world.mjs). The unit-picker row's pick() goes through _switchUnit:
   pending edits ⇒ KIVO.bsConfirm; then __BS_SRV.flushAsync(4000); setActive + location.reload() only when the flush resolved true.
   A failed or rejected flush, or a declined confirm, keeps the active unit and does not reload; the user sees a plain message. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, rd, UNITS } from './core01_root_world.mjs';

const settle = async () => { for (let i = 0; i < 6; i++) await new Promise((r) => setImmediate(r)); };
const srv = (o) => ({ dirty: () => !!o.dirty, inflight: () => false, flushAsync: (ms) => { o.calls = (o.calls || 0) + 1; o.ms = ms; return o.reject ? Promise.reject(new Error('TEST_ONLY')) : Promise.resolve(o.result); } });
const pick = async (W, id) => { await W.c._switchUnit(id, UNITS.find((u) => u.id === id).name); await settle(); };

test('failed flush ⇒ no reload, active unit unchanged, plain message', async () => {
  for (const o of [{ dirty: true, result: false }, { dirty: true, reject: true }, { dirty: false, result: false }]) {
    const W = world({ srv: srv(o) });
    await pick(W, UNITS[1].id);
    assert.equal(W.reloads.length, 0, 'no reload ' + JSON.stringify(o));
    assert.equal(W.active(), UNITS[0].id, 'active unit unchanged');
    assert.equal(W.lastToast(), 'لم تُحفظ تعديلاتك بعد — لن ننتقل حتى تُحفظ', 'through the one toast (KIVO.bsToast)');
    assert.equal(o.calls, 1); assert.equal(o.ms, 4000);
  }
});

test('pending edits: the user is asked first; declining keeps everything as is', async () => {
  const o = { dirty: true, result: true };
  const W = world({ srv: srv(o), confirm: false });
  await pick(W, UNITS[1].id);
  assert.equal(W.confirms.length, 1); assert.equal(W.confirms[0].title, 'تعديلات لم تُحفظ بعد');
  assert.equal(o.calls, undefined, 'no flush after a decline'); assert.equal(W.reloads.length, 0); assert.equal(W.active(), UNITS[0].id);
});

test('successful flush ⇒ setActive then one reload (after the flush, not before)', async () => {
  let atFlush = null;
  const o = { dirty: true, result: true };
  const S = srv(o); const f = S.flushAsync; S.flushAsync = (ms) => { atFlush = W.active(); return f(ms); };
  const W = world({ srv: S, confirm: true });
  await pick(W, UNITS[1].id);
  assert.equal(atFlush, UNITS[0].id, 'the unit is still the old one while flushing');
  assert.equal(W.active(), UNITS[1].id); assert.deepEqual(W.reloads, [UNITS[1].id]);
  const clean = world({ srv: srv({ dirty: false, result: true }) });
  await pick(clean, UNITS[1].id);
  assert.equal(clean.confirms.length, 0, 'nothing pending: no question'); assert.equal(clean.reloads.length, 1);
});

test('the picker row and «+ قسم» both go through the guard', async () => {
  const R = rd('layouts/root-logic.js');
  assert.match(R, /pick: \(\) => \{ this\.setState\(\{ deptOpen: false \}\); if \(d\.id !== act\) this\._switchUnit\(d\.id, d\.name\); \}/);
  assert.doesNotMatch(R, /\.then\(go, go\)/, 'no reload on a failed flush');
  assert.doesNotMatch(R, /D\.setActive\(d\.id\); this\.setState/, 'setActive is not called before the flush');
  assert.match(R, /if \(!\(await this\._unsavedGuard\(\)\)\) return;   \/\* CORE-01/);
  /* «+ قسم» with a failed flush: no name prompt, no section, no reload */
  const o = { dirty: true, result: false };
  const W = world({ srv: srv(o) });
  let added = 0; W.KIVO.BassamDepts.sectionAdd = () => { added++; return { ok: true }; }; W.KIVO.BassamDepts.isSection = () => false;
  const v = W.vals(); assert.equal(v.secAddOn, true);
  await v.secAdd(); await settle();
  assert.equal(added, 0); assert.equal(W.reloads.length, 0); assert.ok(!W.c.state.cfm, 'no name dialog');
});
