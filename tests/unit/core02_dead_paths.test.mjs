/* RISHAD CORE-02 step 5 — dead code and real duplication removed from the admin center (src/modules/admin), nothing useful lost.
     (1) the removed symbols are gone from the module source, its template and the generated page (src/pages/Admin.dc.html);
     (2) the kept entry points still exist — including the functions that show the same data in different useful places
         (presence: overview «المتصلون الآن» + security sessions; frozen accounts: overview card + the accounts filter);
     (3) «+ إدارة عامة جديدة…» goes through BassamDepts.nodeAdd + setDeptParent (no direct saveGroups) — run on the real 320 service;
     (4) the unit branch of ndGo obeys placeWhy and takes its id from freshId — valid input behaves as before, a unit under a unit is refused.
   The handlers are taken verbatim from logic.js and run against BassamDepts loaded in vm (in-memory storage). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { orgWorld } from './org_world.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const SRC = process.env.KIVO_SRC ? path.resolve(process.env.KIVO_SRC) : path.join(ROOT, 'src');
const rd = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');
const L = rd('modules/admin/logic.js'), V = rd('modules/admin/view.html'), PG = rd('pages/Admin.dc.html'), CSS = rd('modules/admin/helmet.css');
const J = (x) => JSON.parse(JSON.stringify(x));
/* V7 · د6: صفحتا «الهيكل» و«الوحدة» وشجرتُهما وأفعالُ الهيكل نُقلت إلى صفحة «الإدارات والصلاحيات» (src/modules/org) — نقاطُ دخولها تُثبَّت هناك،
   وقواعدُها تُشغَّل على صفحتها الفعلية فوق خدمة الهيكل الحقيقية (org_world.mjs) */
const OL = rd('modules/org/logic.js'), OV = rd('modules/org/view.html');
const word = (s, w) => new RegExp('(^|[^A-Za-z0-9_$])' + w.replace(/\$/g, '\\$') + '(?![A-Za-z0-9_$])').test(s);

test('(1) removed symbols are gone from the admin module, its template and the generated page', () => {
  const GONE = [
    '_grpRows',                                                      /* fallback for a BassamDepts without railTree — it always has one */
    'grpDel', 'grpDelTip', 'grpDelStyle', 'grpArm', 'grpGmDel', 'grpGmArm', 'grpGmDelTip', 'grpGmDelStyle', 'grpDisGo', 'grpDisTip', 'grpDisStyle',
    'grpPermOpen', 'grpPermTip', 'grpSaveName', 'grpStartEdit', 'grpEdit', 'grpNotEdit', 'grpDraft', 'grpStop', 'grpOnName', 'grpEditStyle',
    'grpAddGo', 'grpAddTip', 'grpAddStyle', 'grpMgrOpen', 'grpMgrBtnStyle', 'grpMgrLbl', 'grpMgrLblStyle', 'grpCapLbl', 'grpCapTip', 'grpCapStyle',
    'grpStyle', 'grpCntStyle', 'grpKindStyle', 'grpCanEdit', 'grpNid', 'admGrpEdit', 'admGrpName', 'admGrpArm', 'admGrpArmTs', 'admGmArm', '_gmArmT',
    'deptAddOpen', 'deptAddSave', 'deptAddOn', 'deptAddClose', 'newDeptName', 'newDeptPid', 'onNewDeptPid', 'newDeptPidOpts', 'newDeptPathTxt', 'onNewDept', 'addDept',
    'dhNever', 'dhRename', 'dhCap', 'dhDisOn', 'dhDis', 'dhDisLbl', 'dhMgr',
    'deptIntro', 'fbkCur', 'fbkOver', 'fbkFresh', 'ovGo', 'trIsSector', 'trIsRow', 'depOn', 'depStyle', 'kidOpen',
  ];
  for (const [n, s] of [['logic.js', L], ['view.html', V], ['Admin.dc.html', PG]]) assert.deepEqual(GONE.filter((w) => word(s, w)), [], n + ': no removed symbol is left');
  assert.ok(!/saveGroups/.test(L), 'the admin module never writes the groups record directly');
  assert.ok(!/adm-ov-go|اختصارات/.test(V) && !/adm-ov-go/.test(CSS), 'the overview quick-links strip (a copy of the tab bar) is gone, with its style');
  assert.ok(!/class="tr-sec/.test(V) && !/\.tr-sec/.test(CSS), 'the never-shown sector bar is gone, with its style');
  assert.ok(!/S\.key\.uid,/.test(L), 'the dead comma expression in plRkNote is gone');
  for (const t of ['إدارات حالية', 'موجودة في الاثنين', 'إدارات جديدة']) assert.ok(!V.includes('>' + t + '<'), 'full-restore dialog: the always-«—» box «' + t + '» is gone');
});

test('(2) kept entry points still exist (same data shown in different useful places is not duplication)', () => {
  /* what the settings page still owns */
  const METHODS = ['deptDel', '_deptDelGo', 'fbkCommit', 'gmOpen', 'mgrOpen', 'wpOpen', '_admGo', '_plGo', 'plRkLoad', 'audLoad'];
  for (const m of METHODS) assert.match(L, new RegExp('\\n  (async )?' + m.replace(/\$/g, '\\$') + '\\('), 'method ' + m);
  const KEYS = ['dhSwitch', 'dhExp', 'dhImpPick', 'dhImpStop', 'dhWipe', 'dhNotActive',
    'fbkFile', 'fbkMerge', 'fbkAskReplace', 'fbkDoReplace', 'fbkCancel',
    'ovPres', 'ovPresEmpty', 'secSess', 'secSessN', 'ovFrozen', 'ovFrozenN', 'usFilters', 'usCards', 'admGoBackup'];   /* CORE-02 S7: admSubLnkGo left with the in-page strip — «التهيئة والاستعادة» is one sidebar item */
  for (const k of KEYS) {
    assert.ok(word(L, k), 'logic.js still provides ' + k);
    assert.ok(V.includes('{{' + k + '}}') || V.includes('{{' + k + '.'), 'view.html still renders ' + k);
  }
  /* V7 · د6: what moved with the structure — each old entry point has its one new place in the «الإدارات والصلاحيات» page */
  for (const m of ['_ogTreeRows', '_ogParentOpts', '_ogDragProps', '_ogDndMove', '_ogSetAll', '_ogAddOpen', '_ogAddGo', '_ogRenGo', '_ogMoveGo', '_ogDelWhy', '_ogDelAsk', 'go', 'canLeave'])
    assert.match(OL, new RegExp('\\n  (async )?' + m + '\\('), 'org method ' + m);
  const MOVED = { dhAdd: 'ogAddUnder', dhSecAdd: 'ogAddUnder', dhDel: 'ogDelOpen', selRenameSave: 'ogRenGo', selSetGid: 'ogMoveGo', gdeptOpts: 'ogMoveParents', ndToggle: 'ogAddOpen', ndGo: 'ogAddGo', ndPidOpts: 'ogAddParents', ndKinds: 'ogAddKinds',
    deptRows: 'ogRows', trExpandAll: 'ogExpandAll', trCollapseAll: 'ogCollapseAll', trOnQ: 'ogOnQ', sdGo: 'sdGo', goTabOv: 'ogTabs', goTabData: 'ogTabs', goTabPerm: 'ogTabs' };
  for (const [old, now] of Object.entries(MOVED)) {
    assert.ok(old === now || (!word(L, old) && !V.includes('{{' + old + '}}')), old + ' left the settings page');
    assert.ok(word(OL, now), 'org logic provides ' + now + ' (was ' + old + ')');
    assert.ok(OV.includes('{{' + now + '}}') || OV.includes('"{{' + now + '}}"'), 'org view renders ' + now);
  }
  for (const gone of ['_nodeRows', '_nodeHead', '_parentOpts', 'nodePick', 'sysPick', '_trDragProps', '_trMove', '_trFilter', '_trSetAll', '_grpFlip', 'orgBack', 'userDis', 'userDel'])   /* V7 · 53: userDis/userDel — أفعالُ صفّ الشجرة القديمة، لا مستدعيَ لهما بعد انتقالها إلى صفحة الإدارات */
    assert.ok(!word(L, gone) && !V.includes(gone), gone + ' is not kept twice');
  /* the security-log row icon draws its per-kind path through the icon catalog body (<path d="{{r.icoPath}}">): icoPath is live, kept */
  assert.ok(word(L, 'icoPath') && PG.includes('{{r.icoPath}}'), 'security-log icons keep their per-kind path');
  /* the tree row props that the org view reads are produced by _ogTreeRows (one row per unit) */
  const rows = OL.slice(OL.indexOf('\n  _ogTreeRows('), OL.indexOf('\n  _ogDragProps('));
  for (const p of ['name', 'cls', 'level', 'sel', 'exp', 'kidsOn', 'leaf', 'toggle', 'pick', 'tip', 'kind', 'kindKey', 'kids', 'mgrHas', 'mgr', 'people', 'sys', 'cur', 'chkOn', 'chk', 'chkFlip', 'drag']) {
    assert.ok(new RegExp('\\n        ' + p + ': ').test(rows), '_ogTreeRows sets ' + p);
    assert.ok(OV.includes('{{r.' + p + '}}'), 'org view reads r.' + p);
  }
  assert.ok(rows.includes('this._ogDragProps(b.id)'), 'rows stay draggable');
});

/* V7 · د6: (3) و(4) كانتا تأخذان المعالجَين selSetGid و ndGo حرفاً من منطق صفحة الإعدادات؛ صارا _ogMoveGo و _ogAddGo في صفحة «الإدارات والصلاحيات»
   (نافذتا «نقل إلى…» و«إضافة إلى الهيكل») — القواعدُ نفسُها تُشغَّل الآن على الصفحة الفعلية فوق خدمة الهيكل الحقيقية */
const SEED = {
  nodes: [{ id: 'top', name: 'الإدارة العليا', kind: 'إدارة عليا' }, { id: 'g1', name: 'الإدارة العامة 1', kind: 'إدارة عامة', pid: 'top' }],
  depts: [{ id: 'a', name: 'إدارة أ', gid: 'g1' }, { id: 'b', name: 'إدارة ب' }, { id: 's1', name: 'قسم أ-1', gid: 'a', kind: 'قسم' }],
  users: [{ id: 'TEST_ONLY_OWNER', name: 'TEST_ONLY', un: '1000000001', role: 'super' }],
};
const moveTo = (W, id, pid) => { const v = W.open('#/sysadmin/org/' + id + '/overview'); v.ogMoveOpen(); W.render().ogMoveOnPid({ target: { value: pid } }); W.render().ogMoveGo(); return W.render(); };

test('(3) «+ إدارة عامة جديدة…» uses nodeAdd + setDeptParent: a real node with kind, placement rule, fresh id and seeded ceiling', () => {
  const W = orgWorld(SEED), D = W.D;
  const nodes0 = D.nodes().length;
  moveTo(W, 'b', '__new');
  const fresh = D.nodes().filter((x) => x.name === 'إدارة عامة جديدة');
  assert.equal(D.nodes().length, nodes0 + 1, 'one node was created');
  assert.equal(fresh.length, 1);
  assert.deepEqual(J({ kind: fresh[0].kind, pid: fresh[0].pid || null }), { kind: 'إدارة عامة', pid: null }, 'a general department in the root, as before — now with its kind');
  assert.match(fresh[0].id, /^n[0-9a-z]+$/, 'id from freshId (the node prefix), not "g"+time');
  assert.equal(D.nodeOf('b').pid, fresh[0].id, 'the unit is assigned under it (setDeptParent)');
  assert.deepEqual(J(W.seeded.map((x) => x.slice(0, 3))), [['seedCapFrom', fresh[0].id, null]], 'its page ceiling is opened at creation (seedCapFrom), as for every node');
  assert.match(W.acks.at(-1)[0], /^أُنشئت «إدارة عامة جديدة» وأُسندت إليها هذه الإدارة/);
  /* a second one gets the next free name */
  moveTo(W, 'a', '__new');
  assert.ok(D.nodes().some((x) => x.name === 'إدارة عامة جديدة 2') && D.nodeOf('a').pid !== 'g1', 'next name; unit a moved under it');
  /* a section cannot sit under a general department: the option is not offered, and a forged choice is refused before anything is written */
  const before = D.nodes().length, s0 = D.nodeOf('s1').pid;
  let v = W.open('#/sysadmin/org/s1/overview'); v.ogMoveOpen(); v = W.render();
  assert.equal(v.ogMoveNewOn, false, 'not offered to a section');
  v.ogMoveOnPid({ target: { value: '__new' } }); W.render().ogMoveGo();
  assert.equal(D.nodes().length, before, 'nothing created for a section'); assert.equal(D.nodeOf('s1').pid, s0, 'the section stays under its unit');
  assert.match(W.render().ogMove.msg, /القسم يكون تحت إدارةٍ مباشرةً/);
  /* the ordinary re-parent path is unchanged */
  moveTo(W, 'b', 'g1');
  assert.equal(D.nodeOf('b').pid, 'g1', 'choosing an existing parent still re-parents through setDeptParent');
});

test('(4) the add dialog\'s unit branch: placeWhy + freshId — valid input as before, a unit under a unit refused', () => {
  const W = orgWorld(SEED), D = W.D;
  const add = (name, kind, pid) => { const v = W.open('#/sysadmin/org/platform/overview'); v.ogAddOpen(); W.render().ogAddOnName({ target: { value: name } }); W.render().ogAddOnKind({ target: { value: kind } }); W.render().ogAddOnPid({ target: { value: pid } }); W.render().ogAddGo(); return W.render(); };
  /* valid: a unit under a general department (folded in the tree before) */
  W.page.setState({ ogShut: { g1: 1 } });
  let v = add('إدارة ج', 'إدارة', 'g1');
  const c = D.list().find((x) => x.name === 'إدارة ج');
  assert.ok(c, 'the unit was created'); assert.equal(c.gid, 'g1', 'under its parent');
  assert.match(c.id, /^d[0-9a-z]+$/, 'id format unchanged ("d" + base36), now from freshId (no clash with a node or unit id)');
  assert.deepEqual(J(W.seeded.map((x) => x.slice(0, 3))), [['seedCapFrom', c.id, 'g1']], 'its ceiling is seeded through the creation path, as before');
  assert.match(W.acks.at(-1)[0], /^أُنشئت «إدارة ج»/, 'the success is said after the server\'s acknowledgement');
  assert.deepEqual(J(W.page.state.ogShut), {}, 'the parent is unfolded, as before'); assert.equal(v.ogAddOn, false);
  /* valid: a unit in the root */
  add('إدارة د', 'إدارة', '');
  assert.ok(D.list().some((x) => x.name === 'إدارة د' && !x.gid), 'a root unit is still allowed');
  /* invalid: a unit under a unit, or under a section — refused by the shared placement rule, nothing written */
  for (const pid of ['a', 's1']) {
    const n0 = D.list().length;
    v = add('إدارة تحت ' + pid, 'إدارة', pid);
    assert.equal(D.list().length, n0, 'nothing created under ' + pid);
    assert.equal(v.ogAdd.msg, D.placeWhy({ id: '', dept: true }, pid), 'the placeWhy reason is shown');
  }
  /* missing parent: the existing message */
  v = add('إدارة هـ', 'إدارة', 'nope');
  assert.equal(v.ogAdd.msg, 'الأب غير موجود');
});
