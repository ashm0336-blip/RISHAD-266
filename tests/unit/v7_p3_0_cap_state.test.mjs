/* RISHAD V7 P3-0 — the unit ceiling's state from ONE logical source, and the removal of the unused cap patterns.
   · KIVO.BassamPerm.capState(d) (331) reads the existing engine only (hasCap · capSetAnywhere · deptCap · capOwnOf):
       'open'    no record in the unit nor any ancestor ⇒ every page (not a decision anyone took)
       'inherit' no own record, an ancestor with a record limits it
       'own'     its own record (independent when capOwn) — n = effective pages, empty when none
   · the admin center formats it once (_capStateTxt) for the tree, the overview checklist and the ceiling editor; «open» is a warning,
     never a ✓ («موروثٌ من الأعلى» was shown for every unit without its own record, open or not — V7 P1).
   · the five patterns' UI and helpers (never rendered, never called) are gone; the one live effect stays: a child under a parent whose
     effective ceiling is empty is seeded «أساسي» (a stored patterns.basic still wins) — tests/browser seeding parity proves no change. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const M = rd('src/permissions/331-perm-model.js'), T = rd('src/permissions/334-perm-tree-tpl.js'), L = rd('src/modules/admin/logic.js'), V = rd('src/modules/admin/view.html');
function fnSrc(src, name, lead = '\n  function ') {
  const i = src.indexOf(lead + name + '('); assert.ok(i >= 0, name + ' exists');
  let j = src.indexOf('{', i), d = 0;
  for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) { j = k + 1; break; } }
  return src.slice(i + 3, j);   /* from «function …» or the method name */
}
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');   /* without comments */
const PAGES = ['emps', 'tasks', 'plan', 'admin', 'help'];
function state(caps, anc, own, id) {
  const hasCap = (d) => Array.isArray(caps[d]);
  const ctx = {
    hasCap, curDept: () => id, PAGE_KEYS: PAGES,
    capSetAnywhere: (d) => hasCap(d) || (anc[d] || []).some(hasCap),
    deptCap: (d) => { if (!(hasCap(d) || (anc[d] || []).some(hasCap))) return PAGES.slice(); let out = hasCap(d) ? caps[d].slice() : PAGES.slice(); if (hasCap(d) && own[d]) return out; for (const a of anc[d] || []) if (hasCap(a)) out = out.filter((k) => caps[a].includes(k)); return out; },
    capOwnOf: (d) => !!own[d],
  };
  return JSON.parse(JSON.stringify(vm.runInNewContext('(' + fnSrc(M, 'capState') + ')', ctx)(id)));
}

test('capState: open · inherit · own · independent · empty — from the existing engine', () => {
  assert.deepEqual(state({}, { u: ['g'] }, {}, 'u'), { kind: 'open', independent: false, n: 5, all: 5, empty: false }, 'no record anywhere ⇒ open, every page');
  assert.deepEqual(state({ g: ['emps', 'tasks'] }, { u: ['g'] }, {}, 'u'), { kind: 'inherit', independent: false, n: 2, all: 5, empty: false }, 'an ancestor limits it ⇒ inherit');
  assert.deepEqual(state({ g: ['emps', 'tasks'], u: ['emps', 'help'] }, { u: ['g'] }, {}, 'u'), { kind: 'own', independent: false, n: 1, all: 5, empty: false }, 'own record cut by the ancestor');
  assert.deepEqual(state({ g: ['emps'], u: ['emps', 'help'] }, { u: ['g'] }, { u: true }, 'u'), { kind: 'own', independent: true, n: 2, all: 5, empty: false }, 'independent: its record alone');
  assert.deepEqual(state({ u: [] }, { u: [] }, {}, 'u'), { kind: 'own', independent: false, n: 0, all: 5, empty: true }, 'an explicit empty record');
  assert.deepEqual(state({ g: [] }, { u: ['g'] }, {}, 'u'), { kind: 'inherit', independent: false, n: 0, all: 5, empty: true }, 'an empty ancestor empties it');
  assert.deepEqual(state({ u: ['emps', 'legacy_x', 'help'] }, { u: [] }, {}, 'u'), { kind: 'own', independent: false, n: 2, all: 5, empty: false }, 'only known pages are counted (n ≤ all)');
  assert.match(T, /capState: I\.capState,/, 'exported on KIVO.BassamPerm');
});

test('the admin center shows the state from that one source in the tree, the overview checklist and the ceiling editor', () => {
  const f = fnSrc(L, '_capStateTxt', '\n  ');
  assert.match(f, /P\.capState\(o\)/, 'reads capState');
  assert.match(L, /step\("سقف الصفحات", capSt\.txt, capSt\.ok, "cap"\)/, 'checklist: its text and ✓/! from the source (open is not ✓)');
  assert.match(L, /capSt = this\._capStateTxt\(o\),/);
  assert.doesNotMatch(L, /"موروثٌ من الأعلى"/, 'the P1 text that called every unit without a record «inherited» is gone');
  assert.match(L, /trCapTxt: this\._capStateTxt\(r\.id\)\.short,/, 'tree');
  assert.doesNotMatch(L, /: "السقف مفتوح";/, 'the tree no longer calls a limited unit «open»');
  assert.match(L, /const cs = this\._capStateTxt\(o\);[^\n]*\s+return \{ capStateTxt: cs\.txt \? "المحفوظ: " \+ cs\.txt : "", capStateTone: cs\.tone, capStateOn: !!cs\.txt && !cs\.empty \};/, 'editor: the SAVED state; hidden when empty (capEmptyOn warns)');
  assert.match(V, /<div class="capst" data-tone="\{\{capStateTone\}\}">\{\{capStateTxt\}\}<\/div>/, 'editor header line');
  assert.doesNotMatch(L, /subLine:/, 'the unrendered tree subtitle (a second ceiling count) is gone');
  /* the texts: open is a warning, never ✓ */
  const g = fnSrc(L, '_capOwnRecEmpty', '\n  ');
  const ctx = { KIVO: { BassamCount: (n) => String(n), BassamPerm: { PAGE_KEYS: ['emps', 'tasks', 'admin'], capState: () => ({ kind: 'open', independent: false, n: 14, all: 14, empty: false }) } } };
  /* rec: the unit's own stored record (undefined = none) — the formatter reads it only to tell WHERE an empty ceiling comes from */
  const run = (st, rec) => { Object.assign(ctx.KIVO.BassamPerm, { capState: () => st, hasCap: () => Array.isArray(rec), rawCap: () => (Array.isArray(rec) ? rec.slice() : []) }); return vm.runInNewContext('({' + f + ',' + g + '})._capStateTxt("x")', ctx); };
  let r = run({ kind: 'open', n: 14, all: 14, empty: false });
  assert.equal(r.ok, false); assert.equal(r.tone, 'warn'); assert.match(r.txt, /^مفتوح — لم يُضبط/); assert.equal(r.short, 'السقف مفتوح — لم يُضبط');
  r = run({ kind: 'inherit', n: 3, all: 14, empty: false }); assert.equal(r.ok, true); assert.match(r.txt, /^موروثٌ من الأصل/); assert.match(r.short, /^يرث سقف الأصل · 3 من/);
  r = run({ kind: 'own', independent: true, n: 5, all: 14, empty: false }); assert.equal(r.ok, true); assert.match(r.txt, /^سقفٌ خاصّ مستقلّ: 5 من/); assert.match(r.short, /· مستقلّ$/);
  /* V7 P3-0 acceptance fix — where an empty ceiling comes from */
  r = run({ kind: 'own', n: 0, all: 14, empty: true }, []);
  assert.equal(r.txt, 'سقفٌ خاصّ فارغ — لا صفحة مفعّلة لهذه الوحدة', 'its own record is []'); assert.equal(r.short, 'السقف فارغ'); assert.equal(r.ownEmpty, true); assert.equal(r.tone, 'warn'); assert.equal(r.ok, false);
  r = run({ kind: 'own', n: 0, all: 14, empty: true }, ['emps', 'tasks']);
  assert.equal(r.txt, 'السقف الفعلي فارغ بحكم سقوف الأصول — لا صفحة مفعّلة', 'its own record is NOT empty — an ancestor empties it (the live FAIL)'); assert.equal(r.short, 'السقف فارغ بحكم الأصول'); assert.equal(r.ownEmpty, false);
  r = run({ kind: 'own', n: 0, all: 14, empty: true }, ['legacy_only']);
  assert.equal(r.ownEmpty, true, 'a record of unknown pages only counts as empty (n ≤ all)');
  r = run({ kind: 'inherit', n: 0, all: 14, empty: true }, undefined);
  assert.equal(r.txt, 'السقف الفعلي فارغ بحكم سقوف الأصول — لا صفحة مفعّلة', 'inherited and empty: the ancestor'); assert.equal(r.short, 'السقف فارغ بحكم الأصول');
  r = run({ kind: 'own', independent: true, n: 0, all: 14, empty: true }, []);
  assert.equal(r.txt, 'سقفٌ خاصّ مستقلّ فارغ — لا صفحة مفعّلة لهذه الوحدة', 'independent and empty: its own record, no ancestor assumed');
  assert.match(L, /capEmptyTxt:\s+this\._capOwnRecEmpty\(o\)\s+\? "سقف الصفحات فارغ — لا صفحة مفعّلة لهذه الإدارة/, 'the editor alert picks its text by the same rule (own record empty ⇒ «tick pages»; otherwise the ancestors)');
});

test('the unused patterns are gone; the live seed keeps its behaviour (and a stored «أساسي» still wins)', () => {
  for (const n of ['PATTERN_META', 'PATTERN_DEF', 'patternMeta', 'patternApply', 'patternSet', 'function patterns(']) {
    assert.ok(!code(M).includes(n), '331 no longer has ' + n); assert.ok(!code(T).includes(n), '334 no longer has ' + n);
  }
  for (const n of ['capPatRows', 'capPatSaveDo', 'capPatSaveTip', 'capPat']) { assert.ok(!L.includes(n), 'admin logic: no ' + n); assert.ok(!V.includes(n), 'admin view: no ' + n); }
  assert.match(M, /if \(!inh\.length\) \{ var sd = patternSeed\(id\);/, 'seedCapFrom still seeds «أساسي» under an empty parent');
  const sb = fnSrc(M, 'seedBasic');
  const SEED = /var SEED_BASIC = (\{[^\n]+\});/.exec(M)[1];
  const run = (store) => vm.runInNewContext('var SEED_BASIC = ' + SEED + ';(' + sb + ')()', { permStore: () => store, JSON, Array });
  assert.deepEqual(run({}).cap, ['emps', 'tasks', 'planning', 'staff', 'links', 'help', 'admin'], 'the built-in «أساسي» (unchanged)');
  assert.deepEqual(run({}).subs, { emps: ['data', 'custody'], planning: ['readiness'], admin: ['shifts', 'backup', 'ptpls', 'import'] });
  assert.deepEqual(run({ patterns: { basic: { cap: ['help'], subs: {}, tabs: {}, lenses: [] } } }).cap, ['help'], 'a stored patterns.basic wins, as before');
  assert.deepEqual(run({ patterns: { basic: { cap: 'x' } } }).cap.length, 7, 'a malformed stored pattern falls back');
  assert.ok(!/والجذر يبدأ فارغاً/.test(M), 'the stale comment («the root starts empty») is corrected');
});
