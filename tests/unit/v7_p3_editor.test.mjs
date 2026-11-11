/* RISHAD V7 P3 — the unified permissions editor: the grant rules, the review before saving, and ONE template-grant processor for
   every entry point (the account window · the unit's templates · the monthly table · the daily report), with each entry point's
   existing behaviour kept exactly (a recorded call sequence, before and after).
   · a new leaf grant is «عرض» alone (legacy togLeafIn · enforce t24TogLeaf ⇒ p24.primView); a stored grant is never re-interpreted;
   · «تحديد الكل» adds «عرض» to ungranted leaves only (viewAllIn · t24ViewAll);
   · sheetDiff / keyDiff name what will be added and withdrawn;
   · grantTpl = tplCut ⇒ setEmpPerms ⇒ setEmpTpl (⇒ setEmpLens when the caller set lenses before) — no new store, no new writer. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const T = rd('src/permissions/334-perm-tree-tpl.js'), L = rd('src/modules/admin/logic.js'), ST = rd('src/modules/staff/logic.js'), DR = rd('src/modules/dreport/logic.js');
const REG = JSON.parse(rd('src/permissions/registry/registry-v24.9.json'));
function fnSrc(src, name, lead = '\n  function ') {
  const i = src.indexOf(lead + name + '('); assert.ok(i >= 0, name + ' exists');
  let j = src.indexOf('{', i), d = 0;
  for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) { j = k + 1; break; } }
  return src.slice(i + 1, j);
}
const ALL = ['view', 'add', 'edit', 'del', 'approve', 'export'];
const ctx0 = () => ({ ALL_ACTS: ALL, ACT_NAMES: { view: 'عرض', add: 'إضافة', edit: 'تعديل', del: 'حذف', approve: 'اعتماد', export: 'تصدير' }, JSON, nameOf: (k) => 'ن:' + k });
const load = (names, ctx) => { vm.createContext(ctx); vm.runInContext(names.map((n) => fnSrc(T, n)).join('\n'), ctx); return ctx; };
const J = (x) => JSON.parse(JSON.stringify(x));   /* the vm realm's objects ⇒ this realm's, for deepEqual */

test('legacy: a new leaf grant is «عرض» alone; a stored grant is untouched; off removes it', () => {
  const c = load(['togLeafIn', 'viewAllIn'], ctx0());
  assert.deepEqual(J(c.togLeafIn({}, 'tasks', true)), { tasks: ['view'] }, 'new grant ⇒ view alone (was: the six acts)');
  const six = { tasks: ALL.slice() };
  assert.deepEqual(J(c.togLeafIn(six, 'tasks', true)), six, 'a stored six-act grant is not re-interpreted');
  assert.deepEqual(J(c.togLeafIn({ tasks: ['view', 'edit'] }, 'tasks', false)), {}, 'off ⇒ withdrawn');
  assert.deepEqual(J(c.viewAllIn({ tasks: ['view', 'edit'] }, ['tasks', 'emps/data'])), { tasks: ['view', 'edit'], 'emps/data': ['view'] }, 'select-all: view on the ungranted only');
  const src = { a: ['view'] }; c.togLeafIn(src, 'b', true); assert.deepEqual(src, { a: ['view'] }, 'the draft is copied, not mutated');
  assert.doesNotMatch(fnSrc(T, 'togLeafIn'), /ALL_ACTS\.slice\(\)/, 'no automatic six-act grant left in the leaf toggle');
  assert.match(T, /'منحُ العرض وحده — ثم اختر باقي الأفعال صراحةً'/, 'the leaf checkbox says what it grants');
});

test('the review before saving: what will be added and withdrawn, by name and act', () => {
  const c = load(['sheetDiff'], ctx0());
  const d = c.sheetDiff({ tasks: ['view', 'edit'], plan: ['view'] }, { tasks: ['view'], 'emps/data': ['view', 'add'] });
  assert.deepEqual(JSON.parse(JSON.stringify(d.add)), [{ key: 'emps/data', name: 'ن:emps/data', acts: ['عرض', 'إضافة'], whole: true }]);
  assert.deepEqual(JSON.parse(JSON.stringify(d.drop)), [{ key: 'tasks', name: 'ن:tasks', acts: ['تعديل'], whole: false }, { key: 'plan', name: 'ن:plan', acts: ['عرض'], whole: true }]);
  assert.equal(d.n, 3); assert.equal(c.sheetDiff({ a: ['view'] }, { a: ['view'] }).n, 0, 'no change ⇒ nothing to review');
  const k = load(['keyDiff'], Object.assign(ctx0(), { p24R: () => ({ byKey: { 'task.view': { label: 'عرض المهام' }, 'task.create': { label: 'إنشاء مهمة' } } }) }));
  const kd = k.keyDiff({ 'task.create': true }, { 'task.view': true });
  assert.deepEqual(JSON.parse(JSON.stringify(kd)), { add: [{ key: 'task.view', name: 'عرض المهام' }], drop: [{ key: 'task.create', name: 'إنشاء مهمة' }], n: 2 });
});

test('enforce: a new leaf grant is its first view key alone (p24.primView) — every assignable page and lens has one', () => {
  const byKey = {}, byOwner = {}; REG.registry.forEach((e) => { byKey[e.key] = e; (byOwner[e.owner] = byOwner[e.owner] || []).push(e.key); });
  const c = load(['p24PrimView'], Object.assign(ctx0(), { p24R: () => ({ byKey, byOwner }) }));
  assert.equal(c.p24PrimView('tasks'), 'task.view'); assert.equal(c.p24PrimView('staff'), 'staff.view'); assert.equal(c.p24PrimView('irshad/records'), 'ir.rec.view');
  assert.equal(c.p24PrimView('emps/custody'), 'cust.view', 'the owner\'s own view key, not a managed reference');
  assert.equal(c.p24PrimView('lens.zones'), 'lens.zones.view');
  const owners = [...new Set(REG.registry.filter((e) => e.status === 'active' && e.grant === 'assignable' && e.ownerKind !== 'platform').map((e) => e.owner))];
  for (const o of owners) assert.ok(c.p24PrimView(o), 'a view key for ' + o);
  const tl = fnSrc(L, 't24TogLeaf', '\n  ');
  assert.match(tl, /P24\.primView\(l\.owner, l\.keys\)/); assert.match(tl, /this\.t24Add\(d, L, pv\)/); assert.doesNotMatch(tl, /ks\.forEach\(\(k\) => this\.t24Add/, 'no longer every key of the leaf');
  assert.match(L, /o\.cb\.togLeaf\(l, !lOnState\)/, 'a partial leaf is withdrawn by its checkbox, never silently widened (was !all)');
  const va = fnSrc(L, 't24ViewAll', '\n  ');
  assert.match(va, /"plugin" === l\.type \? -1 !== \(lens \|\| \[\]\)\.indexOf\(l\.lens\) : ks\.some\(\(k\) => on\[k\] && !dv\[k\]\)/, 'granted = the tree\'s rule: a lens by its gate, a leaf by a non-derived key (independent review: derived keys made the result depend on leaf order)');
});

/* ── one template-grant processor; each entry point keeps its recorded behaviour ── */
function world() {
  const calls = [];
  const c = load(['grantTpl'], Object.assign(ctx0(), {
    isSuper: () => true, curDept: () => 'D',
    tplCut: (p, d) => { calls.push(['tplCut', d]); const o = {}; Object.keys(p || {}).forEach((k) => { if (k !== 'out') o[k] = p[k]; }); return o; },
    setEmpPerms: (e, o, d) => { calls.push(['setEmpPerms', e, JSON.stringify(o), d]); return { ok: true }; },
    setEmpTpl: (e, id, d) => calls.push(['setEmpTpl', e, id, d]),
    setEmpLens: (e, l, d) => calls.push(['setEmpLens', e, JSON.stringify(l), d]),
    deptLenses: () => ['zones', 'gates'],
  }));
  return { c, calls };
}
test('grantTpl: the monthly table (single) · monthly bulk · daily report · grantTplByName — each as before', () => {
  const tp = { id: 't1', name: 'رئيس', perms: { tasks: ['view', 'edit'], out: ['view'] }, lens: ['gates', 'paths'] };
  /* the monthly table, one employee (pmPick): cut · sheet · template id · lenses from the template ∩ the unit */
  let w = world(); w.c.grantTpl('e1', tp, undefined, { lens: true });
  assert.deepEqual(w.calls, [['tplCut', 'D'], ['setEmpPerms', 'e1', '{"tasks":["view","edit"]}', 'D'], ['setEmpTpl', 'e1', 't1', 'D'], ['setEmpLens', 'e1', '["gates"]', 'D']]);
  /* withdrawing (no template) with lenses: all unit lenses, as pmPick did */
  w = world(); w.c.grantTpl('e1', null, undefined, { lens: true });
  assert.deepEqual(w.calls, [['setEmpPerms', 'e1', '{}', 'D'], ['setEmpTpl', 'e1', '', 'D'], ['setEmpLens', 'e1', '["zones","gates"]', 'D']]);
  /* the monthly bulk and the daily report: no lens write (their existing behaviour) */
  w = world(); w.c.grantTpl('e2', tp);
  assert.deepEqual(w.calls, [['tplCut', 'D'], ['setEmpPerms', 'e2', '{"tasks":["view","edit"]}', 'D'], ['setEmpTpl', 'e2', 't1', 'D']]);
  /* an empty template: granted by default (bulk · daily report warn after), refused when asked (grantTplByName) */
  const em = { id: 't0', name: 'فارغ', perms: { out: ['view'] } };
  w = world(); let r = w.c.grantTpl('e3', em); assert.equal(r.ok, true); assert.equal(r.empty, true);
  w = world(); r = w.c.grantTpl('e3', em, 'D', { refuseEmpty: true, lens: true }); assert.equal(r.ok, false); assert.equal(r.empty, true);
  assert.deepEqual(w.calls, [['tplCut', 'D']], 'refused before any write');
  /* the callers */
  assert.match(fnSrc(ST, 'pmPick', '\n  '), /r\.grantTpl\(t, n, void 0, \{ lens: !0 \}\)/, 'monthly table: one employee, with lenses');
  assert.match(ST, /s\.grantTpl\(t, i \|\| null\)/, 'monthly bulk: no lenses');
  assert.match(DR, /var u = e\.grantTpl\(t, l\),/, 'daily report: no lenses');
  assert.match(fnSrc(T, 'grantTplByName'), /grantTpl\(ekey, t, d, \{ lens:true, refuseEmpty:true, strict:true \}\)/);
  assert.doesNotMatch(fnSrc(ST, 'pmPick', '\n  '), /setEmpPerms|setEmpLens/, 'no second writer left in the monthly table');
  assert.match(T, /viewAllIn: viewAllIn, sheetDiff: sheetDiff, keyDiff: keyDiff, grantTpl: grantTpl,/, 'exported on KIVO.BassamPerm');
});

test('the account window and the templates editor use the shared review and sources; the manager returns to inheritance explicitly', () => {
  assert.match(L, /return this\._edReview\(r\.sheetDiff\(lf\(h\), lf\(m\)\), "up", dL \? \[f, u\] : null\);/, 'account window (legacy): leaves only, lenses reviewed too');
  assert.match(L, /\.\.\.this\._edReview\(M\.dirty && r\.keyDiff \? r\.keyDiff\(M\.base, M\.draft\) : null, "up", M\.dL \? \[M\.lensBase, M\.lensNow\] : null\),/, 'account window (enforce)');
  assert.match(L, /\.\.\.this\._edReview\(g && a && a\.sheetDiff \? a\.sheetDiff\(l, p\) : null, "tp", g \? \[c, d\] : null\),/, 'templates (legacy)');
  assert.match(L, /\.\.\.this\._edReview\(g24 && a\.keyDiff \? a\.keyDiff\(b24, dr\) : null, "tp", g24 \? \[c, d\] : null\),/, 'templates (enforce)');
  assert.match(L, /upSrcRows: this\._edSources\(/);
  assert.match(L, /upInhDo: \(\) => \{\s+g && r && r\.capAllPerms && this\.setState\(\{ upDraft: r\.capAllPerms\(o\), upFor: i \}\);/, '«إعادة إلى التوريث» = the full ceiling as the draft — upSave clears the sheet as before');
  assert.match(L, /upDraft: r\.viewAllIn\(m, t\)/, 'select-all (legacy): view on the ungranted, the rest as it is');
  assert.doesNotMatch(L, /\(t\[e\.key\] = r\.ALL_ACTS\.slice\(\)\)/, 'no six-act select-all left');
});

test('sources: the keys derived from field.view are named whatever the source of the grant (live acceptance FAIL)', () => {
  const f = fnSrc(L, '_edSources', '\n  ');
  const DER = ['lens.zones.status.change', 'lens.gates.status.change', 'lens.marks.status.change'], byKey = {};
  REG.registry.forEach((e) => { byKey[e.key] = e; });
  const ctx = { KIVO: { BassamCount: (n, w) => n + ' ' + w, KIVO_REGISTRY: { byKey }, BassamAuth: {}, BassamPerm: { p24: { DERIVE: { 'field.view': DER } }, tplOfEmp: () => '', tplsList: () => [] } } };
  const row = (eff) => { const out = vm.runInNewContext('({' + f + ', _capStateTxt() { return { short: "س" }; } })._edSources(o)', Object.assign({ o: { did: 'd', user: { role: 'staff', ekey: 'e' }, sheet: {}, eff } }, ctx)); return J(out).find((r) => r.k === 'المفاتيح المشتقة').v; };
  const on = (ks) => Object.fromEntries(ks.map((k) => [k, true]));
  /* granted from the key-level editor: an explicit grant, nothing translated from a sheet — was «لا شيء» */
  const ex = row({ keys: on(['field.view'].concat(DER)), T: {}, plus: ['field.view'].concat(DER), minus: [] });
  assert.match(ex, /تغيير حالة المصلى · تغيير حالة البوابة · تغيير حالة العلامة\/المعلم/, ex); assert.match(ex, /من «الوصول إلى رصد الميدان»/); assert.match(ex, /المسندة إليه فقط/);
  /* from a stored sheet: the same line */
  assert.equal(row({ keys: on(['field.view'].concat(DER)), T: on(['field.view'].concat(DER)), plus: [], minus: [] }), ex);
  /* field.view not held, or the derived keys dropped: nothing is claimed */
  assert.equal(row({ keys: on(['task.view']), T: {}, plus: ['task.view'], minus: [] }), 'لا شيء');
  assert.equal(row({ keys: on(['field.view']), T: on(['field.view']), plus: [], minus: DER }), 'لا شيء');
  assert.doesNotMatch(f, /o\.eff\.T && o\.eff\.T\[s\]/, 'no longer read from the sheet translation alone');
});
