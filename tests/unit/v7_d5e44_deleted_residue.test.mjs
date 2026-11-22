/* V7 · د5-هـ (44) — ما حُذف لا يبقى له أثر (اختبارُ بحث على شجرة الواجهة كلِّها: المصادرُ والقوالبُ والمولَّد والصفحاتُ المبنية):
   خريطةُ الصلاحيات (تبويب perms) · صفحةُ الوحدات (plat/mods) · محرّرُ ترتيب الصفحات · كتلةُ «الأنظمة» في الخريطة · قوالبُ الصلاحيات (الواجهة والكُتّاب
   والإسنادُ tplOf ومساعداتُ المحرّك في 334 وقرّاؤها في البرامج) · نافذةُ صلاحيات الموظف وشجرتُها القديمة · زرُّ «+ قسم» في القائمة الجانبية.
   الخادمُ خارج هذا البحث عمداً: موردُ القوالب ومفاتيحُ tpl.* في السجلّ يبقيان ليقرأهما الترحيلُ «perm44-roles» (والقرارُ في الخادم لمرحلة القفل).
   ويُثبَّت أن قرّاءَ القوالب صاروا يقرؤون الأدوار (KIVO.Perm44 · BassamSup.isSupRole) وأن «تعديل الصلاحيات» يفتح «الأشخاص» في تبويب «الصلاحيات». */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SRC } from './harness.mjs';

/* الأسماءُ المحذوفة — كلٌّ معرّفٌ برمجيّ أو نصُّ واجهة لا يُكتب إلا لها */
const NAMES = [
  /* قوالبُ الصلاحيات: مساعداتُ المحرّك (334 · 331) وقرّاؤها */
  'tplOfEmp', 'grantTplByName', 'grantTpl', 'tplsMigrate', 'tplsList', 'tplHolders', 'tplCut', 'tplSig', 'grantSig', 'permSig', 'setEmpTpl', 'dropEmpTpl', 'empTpl',
  'p24AfterTpl', 'afterTpl', 'PERM_TPLS', 'isSupTpl', 'TPL_NAMES_FLAG', 'TPL_RENAME',
  /* واجهةُ القوالب في إعدادات الإدارة */
  'tpVals', 'tpSave', 'tpRead', 'tpWrite', 'tpNewDo', 'tpAskDel', 'tpDelDo', 'tp24Base', 'showDeptTp', 'dTabTpOn', 'dTabGoTp', 'data-d-tab="ptpls"', 'قوالب الصلاحيات</',
  /* نافذةُ صلاحيات الموظف وشجرتُها القديمة (الصفحة × الأفعال الستة) */
  'treeModel', 'togActIn', 'togLeafIn', 'viewAllIn', 'sheetDiff', 'keyDiff', 'tskRecLegacy', 'upTplRows', 'upSave', 'up24Save', 'up24Model', '_upDeptOf', '_edReview', '_edSources',
  '{{upOn}}', 'upLegacy', 'upGmDept',
  /* خريطةُ الصلاحيات (تبويب perms) وكتلةُ «الأنظمة» فيها */
  'admOnPerms', '_pmMap', '_pmEff', '_pmCapRow', '_pmTplRows', 'pmCaps', 'pmTpls', 'pmRows', 'pmMapRows', 'adPmLog', 'data-pm="map"', 'خريطة الأنظمة والصلاحيات', '#/sysadmin/perms',
  '"perms", "org"', '["perms", null', 'خريطة الصلاحيات',
  /* صفحةُ الوحدات ومحرّرُ ترتيب الصفحات */
  'plOnMods', '_plMods', 'plModTog', 'plMods', 'plNav', 'plHideTog', 'plUp', 'plDown', '["plat", "mods"', '"mods", "الوحدات"', 'وحدات المنصة</', 'ترتيب الصفحات</',
  /* زرُّ «+ قسم» */
  'secAddOn', 'secAdd', 's-secadd',
  /* V7 · د5-هـ (44 · التوحيد): تبويبُ «سقف الصفحات» ومحرّرُه وشجرتُه القديمة (الصفحة × الفعل · t24Rows) وقطعةُ المتابعة فيه */
  'capTog', 'capSubTog', 'capTabTog', 'capLensTog', 'capLensAll', 'capExpand', 'capSave', 'capUndo', 'cap24Leaf', 'cap24Sync', '_cap24Synced', '_capNormalize',
  'capOwnTog', '_loadDraft', 'capDraft', 'capBase', 'capOpenRows', 'capLegacy', 'capRows24', 'tabCapShow', 'onTabCap', 'goTabCap', 'حفظ السقف', 'admin.cap24.daily',
  't24Rows', 't24TogLeaf', 't24ViewAll', 't24Add', 't24Drop', 't24Shown', 't24TogKey', 't24LeafKeys',
];
const SKIP = /(^|\/)(systems\/[^/]+\/server|slots\/workers|slots\/tools|systems\/[^/]+\/permissions\.json|permissions\/registry|permissions\/340-registry|manifests\/perm-tree24\.json|types\/kivo\.d\.ts)/;
function files(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name), rel = path.relative(SRC, p).split(path.sep).join('/');
    if (e.isDirectory()) { if (!/^(systems\/[^/]+\/tests|assets)$/.test(rel)) files(p, out); continue; }
    if (/\.(js|tpl|html|css|json|frag|mjs)$/.test(e.name) && !SKIP.test(rel)) out.push([rel, p]);
  }
  return out;
}
const word = (n) => (/^[A-Za-z_$][\w$]*$/.test(n) ? new RegExp('(?<![\\w$])' + n.replace(/\$/g, '\\$') + '(?![\\w$])') : null);

test('no reference to the deleted pieces remains in the client tree (sources · templates · generated · pages)', () => {
  const F = files(SRC), hits = [];
  assert.ok(F.length > 200, 'the tree is read');
  for (const [rel, p] of F) {
    const s = fs.readFileSync(p, 'utf8');
    for (const n of NAMES) { const re = word(n); if (re ? re.test(s) : s.includes(n)) hits.push(rel + ': ' + n); }
  }
  assert.deepEqual(hits, [], 'remaining references:\n' + hits.join('\n'));
});

test('no client writer of the templates or of the template assignment is left (the migration reads them on the server)', () => {
  const hits = [];
  for (const [rel, p] of files(SRC)) {
    const s = fs.readFileSync(p, 'utf8');
    if (/setItem\(\s*["'](?:bsdept:[^"']*:)?bassam_perm_tpls(?:_named)?_v1/.test(s)) hits.push(rel + ': setItem perm_tpls');
    if (/\.tplOf\[[^\]]+\]\[[^\]]+\]\s*=[^=]/.test(s) || /\btplOf\s*=\s*\{/.test(s.replace(/tplOf: o\.tplOf \|\| \{\}|tplOf: \{\}/g, ''))) hits.push(rel + ': tplOf write');
  }
  assert.deepEqual(hits, []);
});

test('the readers read roles: KIVO.Perm44 (rolesOf → {roles} · roleOf · assign — one draft committed once) and the role flag sup:true', () => {
  const rd = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');
  const PK = rd('components/565-page-kit.js'), ST = rd('systems/staff/client/logic.js'), DR = rd('systems/dreport/client/logic.js'), PL = rd('systems/plan/client/logic.js'),
    TK = rd('systems/tasks/client/logic-picker.js'), EM = rd('modules/employees/logic.js'), PF = rd('modules/profile/logic.js'), T334 = rd('permissions/334-perm-tree-tpl.js'), AD = rd('modules/admin/logic.js');
  assert.match(PK, /PERM_ROLES\(did\) \{/); assert.match(PK, /P4\.rolesOf\(this\._p44Dept\(did\)\) : null, L = R && R\.roles/); assert.match(PK, /P4\.roleOf\(ekey, this\._p44Dept\(did\)\)/); assert.match(PK, /P4\.assign\(this\._p44Dept\(did\), map\)/);
  assert.match(ST, /this\.PERM_ROLE_SET\(t, n \? n\.id : null\)/, 'staff: the picker assigns a role'); assert.match(ST, /\(a \? this\.PERM_ROLE_SET\(M\) : /, 'staff: bulk assignment — every selected person in one draft');
  assert.match(ST, /KIVO\.BassamSup\.isSupRole\(s\)/);
  assert.match(DR, /P4\.assign\(this\.drDept\(\), M4\)/, 'dreport: the report assigns a role'); assert.match(DR, /P4\.rolesOf\(this\.drDept\(\)\)/);
  assert.match(PL, /\(P4\.rolesOf\(D4\) \|\| \{\}\)\.roles/); assert.match(PL, /P4\.roleOf\(e, D4\)/);
  assert.match(TK, /n\.rolesOf\(/); assert.match(TK, /n\.roleOf\(r,/); assert.match(TK, /this\._tkLS\("bassam_roles_v1"\)/);
  assert.match(EM, /this\.PERM_ROLES\(\)/); assert.match(EM, /m\.permLabel\(a\)/);
  assert.match(PF, /\(P4\.rolesOf\(e\.deptId\) \|\| \{\}\)\.roles/); assert.match(PF, /P\.isSupRole\(t\)/); assert.match(PF, /P\.roleOf\(r\.ekey, e\.deptId\)/);
  assert.match(T334, /KIVO\.BassamSup = \{ roleOf: roleOf, isSupRole: isSupRole, isSup: isSup, supName: supName \}/);
  assert.doesNotMatch(T334, /رئيس\|نائب/, 'no runtime name rule for the supervisory crew');
  /* V7 · د6: «الأشخاص» تبويبُ الوحدة في شاشة «الإدارات والصلاحيات» (#/sysadmin/org/<unit>/people) — عبر نقطة تنقّلها */
  assert.match(AD, /if \("perm" === what\) return void \(u \? this\._orgGoto\(u, "people"\) : this\._ovGo\("depts"\)\);/, '«تعديل الصلاحيات» → the unit\'s «الأشخاص» tab');
});
