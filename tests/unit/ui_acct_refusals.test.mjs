/* دفعة الواجهات (2أ · RESUME «بعد الدفعة 2»): الواجهةُ لا تعرض أفعالاً يرفضها الخادم على الحسابات — بقواعد الخادم نفسِها (018):
   · حسابُ «الإدارة» الملغى (role dept) لا يُعدَّل لأحد ('dept-role') — ولا يُجمَّد ولا تُعاد كلمتُه.
   · حسابٌ «staff» مفتاحُه mgr: بلا الشارة لا يُعدَّل إلا تجميداً ('mgr-key') — ولا تُنزع الشارةُ عن حسابٍ مفتاحُه mgr:.
   · لغير مدير النظام: حسابُ المدير لا يُمسّ ('mgr')، وحسابٌ بمفتاح مدير (mgr:/gm: أو مفتاحِ حسابِ مديرٍ قائم) يُجمَّد ويُحذف فقط ('ekey').
   القواعدُ تُقرأ من مصدر الخادم (workers/parts) ومن العميل (src) وتُقارن صفّاً صفّاً — بياناتٌ اصطناعية (TEST_ONLY). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT, SRC } from './harness.mjs';

const rdW = (f) => fs.readFileSync(path.join(ROOT, 'workers', 'parts', f), 'utf8');
const rdS = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');
/* نصُّ دالةٍ بموازنة الأقواس من «function name(» */
function fnSrc(text, name) {
  const i = text.indexOf('function ' + name + '('); assert.ok(i >= 0, name);
  let d = 0, j = text.indexOf('{', i);
  for (; j < text.length; j++) { if (text[j] === '{') d++; else if (text[j] === '}' && --d === 0) break; }
  return text.slice(i, j + 1);
}
const A017 = rdW('017-authorize-core.js'), A018 = rdW('018-ancestry.js'), A054 = rdW('054-image-contract.js');
const server = vm.runInNewContext([
  fnSrc(A017, 'isObj'), fnSrc(A017, 'deq'), fnSrc(A017, 'nmap'), fnSrc(A017, 'eqExcept'),
  "function isMgrKey(k) { return String(k || '').slice(0, 4) === 'mgr:'; }",
  fnSrc(A054, 'usersSynKey'), fnSrc(A018, 'usersFreezeOnly'), fnSrc(A018, 'usersA1'), fnSrc(A018, 'usersA1Why'),
  fnSrc(A018, 'usersMgrEkSet'), fnSrc(A018, 'usersMgrEk'), fnSrc(A018, 'usersEkeyWhy'),
  '({ usersA1Why, usersEkeyWhy, usersMgrEkSet, usersMgrEk })'].join('\n'), {});
const AUTH = rdS('auth/330-auth.js');
const client = vm.runInNewContext(["function isMgrKey(k){ return String(k||'').slice(0,4) === 'mgr:'; }", fnSrc(AUTH, 'acctFixedWhy'), '({ acctFixedWhy })'].join('\n'), {});

const ROWS = {
  dept: { id: 'TEST_ONLY_d', role: 'dept', deptId: 'tst_d1', un: '1000000001', ekey: '', dis: 0, ph: 'p2$x' },
  deptFrozen: { id: 'TEST_ONLY_df', role: 'dept', deptId: 'tst_d1', un: '1000000002', dis: 1, ph: 'p2$x' },
  a1: { id: 'TEST_ONLY_a1', role: 'staff', deptId: 'tst_d1', un: '1000000003', ekey: 'mgr:tst_d1', dis: 0, ph: 'p2$x' },
  a1Frozen: { id: 'TEST_ONLY_a1f', role: 'staff', deptId: 'tst_d1', un: '1000000004', ekey: 'mgr:tst_d1:2', dis: 1, ph: 'p2$x' },
  mgr: { id: 'TEST_ONLY_m', role: 'staff', mgr: true, deptId: 'tst_d1', un: '1000000005', ekey: 'mgr:tst_d1:3', dis: 1, ph: 'p2$x' },
  staff: { id: 'TEST_ONLY_s', role: 'staff', deptId: 'tst_d1', un: '1000000006', ekey: '1000000006', dis: 1, ph: 'p2$x' },
};
const ACTS = { freeze: (a) => Object.assign({}, a, { dis: 1 }), unfreeze: (a) => Object.assign({}, a, { dis: 0 }), resetPw: (a) => Object.assign({}, a, { ph: 'p2$TEST_ONLY_new', mc: 1, dis: 0 }) };

test('2أ · قاعدةُ العميل acctFixedWhy تطابق الخادم (usersA1Why) لكل صفٍّ وفعل — ولكل أحدٍ بما فيه مدير النظام', () => {
  for (const [rk, a] of Object.entries(ROWS)) for (const [ak, f] of Object.entries(ACTS)) {
    const b = f(a);
    if (JSON.stringify(a) === JSON.stringify(b)) continue;   /* تجميدُ مجمَّدٍ أو فكُّ نشطٍ: لا تعديل */
    const srv = server.usersA1Why([b], [a]);
    const cli = client.acctFixedWhy(a, ak === 'freeze');
    assert.equal(!!cli, !!srv, rk + ' · ' + ak + ': الخادم «' + srv + '» والعميل «' + cli + '»');
    if (srv === 'dept-role') assert.match(cli, /^«حسابات الإدارة» أُلغيت: .*احذفه بزرّ «تنظيف»/);
    if (srv === 'mgr-key') assert.match(cli, /لا يُعاد تفعيله.*احذفه ثم عيّن المدير من جديد/);
  }
});

test('2أ · مفاتيحُ المديرين في صفحة الموظفين (mkS) = usersMgrEk في الخادم — مفتاحٌ صناعي أو مفتاحُ حسابِ مديرٍ قائم (نشطاً أو مجمَّداً)', () => {
  const users = [
    { id: 'u1', role: 'staff', mgr: true, deptId: 'tst_d1', ekey: 'TEST_ONLY_badge', dis: 0 },
    { id: 'u2', role: 'gm', gid: 'tst_g', ekey: 'TEST_ONLY_old_gm', dis: 1 },
    { id: 'u3', role: 'staff', deptId: 'tst_d1', ekey: 'TEST_ONLY_plain', dis: 0 },
  ];
  const L = rdS('modules/employees/logic.js'), i = L.indexOf('mkS = (() => {'), j = L.indexOf('})(),', i) + 4;
  assert.ok(i > 0 && j > i, 'mkS');
  const mkS = vm.runInNewContext('const KIVO = { BassamAuth: { users: () => U } }; const ' + L.slice(i, j) + '; mkS', { U: users });
  const S = server.usersMgrEkSet(users);
  for (const k of ['mgr:tst_d1', 'mgr:tst_d1:2', 'gm:tst_g', 'TEST_ONLY_badge', 'TEST_ONLY_old_gm', 'TEST_ONLY_plain', '1000000099', ''])
    assert.equal(mkS(k), server.usersMgrEk(k, S), k);
  /* والخادمُ يرفض لغير مدير النظام إعادةَ تفعيل حسابٍ بمفتاح مدير ويقبل تجميدَه */
  const frozen = { id: 'x', role: 'staff', deptId: 'tst_d1', ekey: 'TEST_ONLY_badge', dis: 1 };
  assert.equal(server.usersEkeyWhy(frozen, Object.assign({}, frozen, { dis: 0 }), S), 'ekey');
  assert.equal(server.usersEkeyWhy(Object.assign({}, frozen, { dis: 0 }), frozen, S), '');
});

test('2أ · صفحة الموظفين لغير مدير النظام: حسابُ المدير بلا أدوات (السبب بدلها) · بمفتاح مدير: التجميدُ وحده · والإجراءُ الجماعي يتخطّاهما بسبب', () => {
  const L = rdS('modules/employees/logic.js');
  assert.match(L, /lk =\s+u \|\| "none" === r\s+\? ""\s+: h\s+\? "حساب مدير الإدارة يديره مدير النظام وحده — [^"]+"\s+: mkS\(a\)\s+\? "مفتاحُ هذا الحساب مفتاحُ مدير — صلاحيتك تجميدُه أو حذفُه فقط؛ إعادةُ تفعيله وتحديثُ بيانات دخوله لمدير النظام"/);
  assert.match(L, /accActivate: \(\) => \{\s+if \(lk\) return void \(this\.setState\(\{ accOpen: null \}\), this\.impToast\(lk\)\);/, 'السببُ قبل أيّ كتابة');
  assert.match(L, /accFreeze: \(\) => \{\s+if \("active" !== r\) return void this\.setState\(\{ accOpen: null \}\);\s+if \(lk && h\) return void/, 'حسابُ المدير لا يُجمَّد من هنا');
  assert.match(L, /accHint: lk\s+\? lk/);
  assert.match(L, /if \(sp && "none" !== s\(t\) && mkS\(o\(t\)\)\) return void k\+\+;/);
  assert.match(L, /if \(sp && r\.staffIsMgr && r\.staffIsMgr\(o\(a\)\)\) return void k\+\+;/);
  assert.match(L, /" · تُخطّي " \+ k \+ " \(حساب مدير أو بمفتاح مدير — إعادة تفعيله لمدير النظام\)"/);
  /* نزعُ الشارة لا يُعرض لحسابٍ مفتاحُه mgr: */
  assert.match(L, /accMgrShow: u && "active" === r && !\(h && \/\^mgr:\/\.test\(String\(a \|\| ""\)\)\),/);
});

test('2أ · setStaffMgr لا يرسل نزعَ الشارة عن حسابٍ مفتاحُه mgr: (الخادم: mgr-key) — والتعيينُ ونزعُها عن غيره كما كانا', () => {
  let writes = 0;
  const users = [{ id: 'm', role: 'staff', mgr: true, deptId: 'tst_d1', ekey: 'mgr:tst_d1' }, { id: 's', role: 'staff', mgr: true, deptId: 'tst_d1', ekey: 'TEST_ONLY_e1' }];
  const f = vm.runInNewContext(["function isMgrKey(k){ return String(k||'').slice(0,4) === 'mgr:'; }", 'function requireSuper(){ return null; } function curDept(){ return "tst_d1"; }',
    'function rawUsers(){ return U; } function writeUsers(l){ W.n++; U = l; }', fnSrc(AUTH, 'setStaffMgr'), 'setStaffMgr'].join('\n'), { U: users, W: { get n() { return writes; }, set n(v) { writes = v; } } });
  const r = f('mgr:tst_d1', false);
  assert.equal(r.ok, false); assert.match(r.err, /لا تُنزع عنه الإدارة — احذف الحساب أو أبقه مديراً/); assert.equal(writes, 0);
  assert.equal(f('TEST_ONLY_e1', false).ok, true); assert.equal(writes, 1);
  assert.equal(f('mgr:tst_d1', true).ok, true, 'تأكيدُ الشارة على حساب المدير يمرّ');
});

test('2أ · مدير النظام: setDisById وresetPwById يردّان السببَ قبل الكتابة · قائمةُ الحسابات العامة تعرض «غير متاح» مع السبب · وصفُّ الإدارة يجمّد حسابَ صاحبه لا أوّلَ مديرٍ', () => {
  const T = rdS('permissions/334-perm-tree-tpl.js');
  const dis = T.slice(T.indexOf('setDisById: function'), T.indexOf('usernameTaken'));
  assert.ok(dis.indexOf('I.acctFixedWhy(hit, !!on)') > 0 && dis.indexOf('I.acctFixedWhy(hit, !!on)') < dis.indexOf('writeUsers'));
  const rs = T.slice(T.indexOf('resetPwById: function'), T.indexOf('setDisById: function'));
  assert.ok(rs.indexOf('I.acctFixedWhy(hit, false)') > 0 && rs.indexOf('I.acctFixedWhy(hit, false)') < rs.indexOf('writeUsers'));
  assert.match(T, /acctFixedWhy: I\.acctFixedWhy,/);
  const A = rdS('modules/admin/logic.js');
  assert.match(A, /fx = s\.acctFixedWhy \? s\.acctFixedWhy\(a, !a\.dis\) : "";/);
  assert.match(A, /t: \(a\.dis \? "إعادة التفعيل" : "تجميد الحساب"\) \+ \(fx \? " — غير متاح" : ""\),\r?\n\s+go: \(\) => \{\r?\n\s+if \(fx\) return void this\.bsToast\(fx, "warn"\);/);
  const ud = A.slice(A.indexOf('  userDis(t, e, s) {'), A.indexOf('  _nodeRows('));
  assert.match(ud, /const fx = a\.acctFixedWhy \? a\.acctFixedWhy\(t, !t\.dis\) : "";\r?\n\s+if \(fx\) return void this\.bsToast\(fx, "warn"\);/);
  assert.match(ud, /a\.setDeptManagerDis\(e, !t\.dis, t\.id\)/, 'الصفُّ نفسُه (كان أوّلَ مديرٍ للوحدة)');
});

/* RISHAD266 (قرار المالك على aae024c): شيفرةُ «حساب الإدارة» الملغى حُذفت بعد إثبات أنها غيرُ مستعملة (لا ربطَ لها في القالب) — وحسابُ مدير الإدارة العادي باقٍ */
test('حسابُ الإدارة الملغى: لا upsertDeptAccount/removeDeptAccount ولا حقولُ accSave/accDel — ومسارُ مدير الإدارة باقٍ', () => {
  const rd = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');
  const auth = rd('auth/330-auth.js'), tree = rd('permissions/334-perm-tree-tpl.js'), adm = rd('modules/admin/logic.js'), view = rd('modules/admin/view.html');
  for (const [n, s] of [['330', auth], ['334', tree], ['admin', adm]]) assert.ok(!/upsertDeptAccount|removeDeptAccount/.test(s), n + ': لا شيفرةَ لحساب الإدارة الملغى');
  assert.ok(!/\baccSave\b|\baccDel\b|\baccArm\b|"ua_un_"/.test(adm), 'لا حقولَ نموذج حساب الإدارة في صفحة الإدارة');
  assert.ok(!/\{\{[^}]*\b(accSave|accDel|accUn|accPw)\b/.test(view), 'ولا ربطَ لها في القالب');
  assert.ok(/function setDeptManager\(/.test(auth) && /function removeDeptManager\(/.test(auth) && /deptManager/.test(adm), 'مسارُ مدير الإدارة العادي باقٍ');
  assert.ok(/oldAccDo/.test(adm) && /purgeDeptAccounts/.test(auth), 'وتنظيفُ الحسابات القديمة الظاهر في الصفحة باقٍ');
});
