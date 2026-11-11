/* RISHAD V7 — «who lifts the Assigned confinement» is written twice and must stay one rule.
   Server: workers/parts/057-enf-index.js enfFieldLift() — the keys whose holder is NOT confined to assigned elements (an explicit,
   non-derived write on the rounds or their lenses). Console: src/modules/admin/logic.js _edSources `lift` — the same rule, used only
   to word the sources line («المسندة إليه فقط»). If they drift apart the console would describe a confinement the server does not
   apply (or hide one it does). This test compares the two SETS over the whole registry, and the derived map they both exclude. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { internals } from './internals.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const L = rd('src/modules/admin/logic.js'), M = rd('src/permissions/331-perm-model.js');
const REG = JSON.parse(rd('src/permissions/registry/registry-v24.9.json')).registry;
const { enfFieldLift, ENF_DERIVE } = await internals(['enfFieldLift', 'ENF_DERIVE']);

test('the derived map is the same on both sides (ENF_DERIVE = P24_DERIVE)', () => {
  const m = /var P24_DERIVE = (\{[^\n;]+\});/.exec(M); assert.ok(m, 'P24_DERIVE in 331');
  assert.deepEqual(JSON.parse(JSON.stringify(vm.runInNewContext('(' + m[1] + ')'))), JSON.parse(JSON.stringify(ENF_DERIVE)));
});

test('the console\'s lift rule selects exactly the server\'s lift keys, over the whole registry', () => {
  const m = /lift = (\(k\) => \{[^\n]+\}),\r?\n/.exec(L); assert.ok(m, 'the lift rule in _edSources');
  const byKey = {}; REG.forEach((e) => { byKey[e.key] = e; });
  const dvx = {}; Object.keys(ENF_DERIVE).forEach((s) => ENF_DERIVE[s].forEach((k) => { dvx[k] = 1; }));
  const lift = vm.runInNewContext('(' + m[1] + ')', { RG: byKey, dvx });
  const client = REG.map((e) => e.key).filter((k) => lift(k)).sort(), server = enfFieldLift().slice().sort();
  assert.ok(server.length > 10, 'the server set is not empty: ' + server.length);
  assert.deepEqual(client, server);
  /* what the rule means, pinned on both: an explicit write lifts; views, lens gates, references and the derived keys do not */
  for (const k of ['round.edit', 'round.create', 'lens.zones.data.edit', 'lens.paths.status.change', 'lens.dist.assign.edit']) assert.ok(server.includes(k), k + ' lifts');
  for (const k of ['round.view', 'plan.view', 'field.view', 'lens.zones.view', 'lens.zones.enable', 'ref.zone.type.create', 'lens.zones.status.change', 'lens.gates.status.change', 'lens.marks.status.change', 'task.edit', 'plan.create']) assert.ok(!server.includes(k), k + ' does not lift');
});
