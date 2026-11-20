/* RISHAD V7 — «who lifts the Assigned confinement» is written twice and must stay one rule.
   Server: workers/parts/057-enf-index.js enfFieldLift() — the keys whose holder is NOT confined to assigned elements (an explicit,
   non-derived write on the rounds or their lenses). Console: src/modules/admin/logic.js _edSources `lift` — the same rule, used only
   to word the sources line («المسندة إليه فقط»). If they drift apart the console would describe a confinement the server does not
   apply (or hide one it does). This test compares the two SETS over the whole registry, and the derived map they both exclude.
   V7 · د5-هـ (44): the console copy went with the employee-permissions window — what stays pinned is the server rule and the shared derived map. */
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
const { enfFieldLift, ENF_DERIVE } = await internals(['enfFieldLift', 'ENF_DERIVE']);

test('the derived map is the same on both sides (ENF_DERIVE = P24_DERIVE)', () => {
  const m = /var P24_DERIVE = (\{[^\n;]+\});/.exec(M); assert.ok(m, 'P24_DERIVE in 331');
  assert.deepEqual(JSON.parse(JSON.stringify(vm.runInNewContext('(' + m[1] + ')'))), JSON.parse(JSON.stringify(ENF_DERIVE)));
});

/* V7 · د5-هـ (44): نصفُ الواجهة (_edSources في نافذة صلاحيات الموظف) حُذف مع النافذة — فلا قاعدةَ ثانية تُقارَن؛ ويبقى معنى القاعدة مثبَّتاً في الخادم */
test('the server\'s lift rule (enfFieldLift) over the whole registry: an explicit write lifts; views, gates, references and derived keys do not', () => {
  const server = enfFieldLift().slice().sort();
  assert.ok(server.length > 10, 'the server set is not empty: ' + server.length);
  assert.ok(!/\n  _edSources\(/.test(L), 'the console copy of the rule was deleted with the employee-permissions window');
  /* what the rule means, pinned on both: an explicit write lifts; views, lens gates, references and the derived keys do not */
  for (const k of ['round.edit', 'round.create', 'lens.zones.data.edit', 'lens.paths.status.change', 'lens.dist.assign.edit']) assert.ok(server.includes(k), k + ' lifts');
  for (const k of ['round.view', 'plan.view', 'field.view', 'lens.zones.view', 'lens.zones.enable', 'ref.zone.type.create', 'lens.zones.status.change', 'lens.gates.status.change', 'lens.marks.status.change', 'task.edit', 'plan.create']) assert.ok(!server.includes(k), k + ' does not lift');
});
