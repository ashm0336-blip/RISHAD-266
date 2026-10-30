/* Retirement regression; positive ACK/failure coverage is in employee_transition_ui. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {ROOT} from './custody_review_fx.mjs';
const source=fs.readFileSync(path.join(ROOT,'src/services/590-employees-import.js'),'utf8');
test('import owns preparation only: no browser account cleanup or retired custody/related-document writes remain',()=>{
  assert.doesNotMatch(source,/localStorage\.(?:setItem|removeItem)/);
  assert.doesNotMatch(source,/cleanupAssignments|purgeStaffing|activateStaffMany|removeStaffAccount|bassam_custody_v1/);
  assert.match(source,/await transitionSend\(ST\.ticket\)/);
});
