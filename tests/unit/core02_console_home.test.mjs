/* RISHAD CORE-02 S8 — «الرئيسية» of «مركز إدارة رشاد» (#/sysadmin/overview): the real Admin component in a stub context (synthetic TEST_ONLY
   data; no network, no server change). Pins: four status cards from data the page already has (exact counts), a skeleton instead of «٠»
   before the first read, alerts that appear only when there is something to decide, the recent platform events from the bell's own list,
   the two header actions, and no shortcut tiles to the platform settings (they are named sidebar items). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT } from './harness.mjs';

const cp = (o) => JSON.parse(JSON.stringify(o));
const VIEW = fs.readFileSync(path.join(ROOT, 'src/modules/admin/view.html'), 'utf8');
const LOGIC = fs.readFileSync(path.join(ROOT, 'src/modules/admin/logic.js'), 'utf8');
const OVERVIEW = VIEW.slice(VIEW.indexOf('<sc-if value="{{admOnOverview}}" hint-placeholder-val="{{ false }}">\n<div class="adm-ov">'), VIEW.indexOf('<sc-if value="{{admOnSec}}"'));

function admin(state = {}, { notif = [], depts, users, mgrs = {} } = {}) {
  const owner = { id: 'TEST_ONLY_su', role: 'super', un: '9000002000', name: 'TEST_ONLY owner' };
  const U = users || [owner, { id: 'TEST_ONLY_a', role: 'staff' }, { id: 'TEST_ONLY_b', role: 'staff', dis: 1 }, { id: 'TEST_ONLY_c', role: 'dept' }];
  const D = depts || [{ id: 'TEST_ONLY_d1', name: 'TEST_ONLY d1' }, { id: 'TEST_ONLY_d2', name: 'TEST_ONLY d2' }, { id: 'TEST_ONLY_s1', name: 'TEST_ONLY s1', kind: 'قسم' }];
  const went = [];
  const KIVO = {
    BassamPageKit: { base: () => class {} },
    BassamAuth: { user: () => owner, users: () => U, usersVer: () => 1, isSuper: () => true, deptManager: (id) => mgrs[id] || null },
    BassamDepts: { active: () => 'TEST_ONLY_d1', list: () => D, isSection: (id) => D.some((d) => d.id === id && d.kind === 'قسم') },
    BassamLink: { get: () => 'on' },
    BassamFind: { dig: (s) => String(s) },
    BassamNotif: { list: () => notif, status: () => ({ rev: notif.length }) },
    BassamNav: { conGo: (tab, sub) => went.push([tab, sub]) },
    __BS_VER: 'TEST_ONLY-ver',
  };
  const ctx = { KIVO, DCLogic: class {}, console, setTimeout, clearTimeout, Date, __BS_BOOT: { cf: 1, srv: 1 }, localStorage: { getItem: () => null }, document: { hidden: false, querySelector: () => null }, location: { hash: '#/sysadmin/overview' } };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/services/440-count.js'), 'utf8'), ctx);
  vm.runInContext(LOGIC + '\nglobalThis.TEST_ONLY_Admin=Component;', ctx);
  const page = Object.create(ctx.TEST_ONLY_Admin.prototype);
  page.state = Object.assign({ admTab: 'overview' }, state);
  page.setState = function (v, cb) { Object.assign(this.state, v); cb && cb(); };
  page._fullStamp = () => ''; page._expInfo = () => ({}); page.adUsersVals = () => ({});
  page.adOnSrv = () => true;
  return { page, went, v: () => page.adVals() };
}
const card = (v, k) => v.ovStats.find((c) => c.k === k);
const val = (c, l) => { const r = c.rows.find((x) => x.l === l); return r ? r.v : undefined; };
const OV = { ok: 1, failsToday: 4, lockedNow: 1, deniedToday: 3, employeeCount: 7, employeeNoAccountCount: 2, oldHash: [], fails: [], added: [], frozen: [], deniedBy: [] };
const PRES = { active: 2, list: [] };

test('the four status cards carry exact counts from data the page already has', () => {
  const v = admin({ adOv: OV, adPres: PRES }, { mgrs: { TEST_ONLY_d1: { id: 'TEST_ONLY_c', name: 'm' } } }).v();
  assert.deepEqual(cp(v.ovStats.map((c) => c.t)), ['حالة المنصة', 'الحسابات', 'الوحدات التنظيمية', 'الأمن اليوم']);
  const p = card(v, 'plat'), a = card(v, 'acc'), o = card(v, 'org'), s = card(v, 'sec');
  assert.equal(val(p, 'الاتصال'), '● متصل');
  assert.equal(val(p, 'الإصدار'), 'TEST_ONLY-ver');
  assert.equal(val(p, 'آخر نسخة شاملة'), 'لم تُؤخذ بعد');
  assert.equal(p.sub, 'النسخة الشاملة كما سُجّلت على هذا الجهاز', 'the backup stamp is labelled as this device\'s (owner decision O1)');
  assert.deepEqual([val(a, 'نشطة'), val(a, 'مجمّدة'), val(a, 'موظفون بلا حساب'), val(a, 'متصلون الآن')], ['3', '1', '2', '2']);
  assert.equal(a.sub, '7 موظفين في كل الإدارات');
  assert.equal(val(a, 'بصيغة كلمة مرور قديمة'), undefined, 'no old-hash row at 0');
  assert.deepEqual([val(o, 'الإدارات'), val(o, 'الأقسام'), val(o, 'بلا مدير')], ['2', '1', '2']);
  assert.deepEqual([val(s, 'محاولات دخول فاشلة'), val(s, 'أقفال نشطة'), val(s, 'كتابات مرفوضة')], ['4', '1', '3']);
  assert.equal(s.sub, '«اليوم» يبدأ من الثالثة فجراً بتوقيت الرياض');
  assert.deepEqual(cp(v.ovStats.map((c) => [c.href, c.lnk])), [['#/sysadmin/backup', 'إلى النسخة الاحتياطية'], ['#/sysadmin/users', 'إلى مراقبة الحسابات'], ['#/sysadmin/depts', 'إلى الإدارات'], ['#/sysadmin/sec', 'إلى صفحة الأمن']]);
  assert.ok(v.ovStats.every((c) => c.rows.every((r) => r.val && !r.skel)), 'all values are shown once read');
});

test('before the first read: skeleton flags, never «٠» for a server-read value; a failed read says so and invents no empty list', () => {
  const v = admin({ adOv: null, adPres: null }).v();
  assert.equal(v.ovLoading, true);
  const skel = v.ovStats.flatMap((c) => c.rows.filter((r) => r.skel).map((r) => r.l));
  assert.deepEqual(cp(skel), ['موظفون بلا حساب', 'متصلون الآن', 'محاولات دخول فاشلة', 'أقفال نشطة', 'كتابات مرفوضة']);
  assert.ok(v.ovStats.every((c) => c.rows.every((r) => !r.skel || (!r.val && !r.act))), 'a skeleton row shows no number and no action');
  assert.equal(card(v, 'sec').busy, 'true');
  assert.equal(v.ovAlertsEmpty, false, 'no «لا شيء يحتاج قرارك» before the read');
  assert.ok(!v.ovFailsEmpty && !v.ovAddedEmpty && !v.ovPresEmpty && v.ovPresLoading, 'lists show a skeleton, not «لا …»');
  assert.equal(v.ovMeta, 'جارٍ القراءة…');
  const e = admin({ adOv: null, adPres: null, adErr: true }).v();
  assert.equal(e.ovErrOn, true);
  assert.equal(e.ovLoading, false, 'a failed read is not an endless skeleton');
  assert.ok(!e.ovAlertsEmpty && !e.ovFailsEmpty && !e.ovAddedEmpty && !e.ovPresEmpty, 'no «nothing here» claim without data');
  assert.equal(val(card(e, 'acc'), 'موظفون بلا حساب'), '—');
  assert.match(OVERVIEW, /<div class="adm-ov-err" role="status">[^]*?تعذّرت القراءة، نعيد المحاولة تلقائياً/);
  assert.doesNotMatch(OVERVIEW, /تحديث<\/button>|>تحديث</, 'no «تحديث» button: the read repeats on its own');
});

test('«يحتاج قرارك»: units without a manager and old-hash accounts appear only when there are some; nothing pending is one status row', () => {
  const none = admin({ adOv: OV, adPres: PRES }, { mgrs: { TEST_ONLY_d1: {}, TEST_ONLY_d2: {}, TEST_ONLY_s1: {} } });
  none.page._fullStamp = () => new Date().toISOString();
  const n = none.v();
  assert.deepEqual(cp(n.ovAlerts), []);
  assert.equal(n.ovAlertsEmpty, true); assert.equal(n.ovAlertsOn, false);
  assert.match(OVERVIEW, /<div class="adm-ov-ok" role="status"><span class="d"><\/span>لا شيء يحتاج قرارك الآن<\/div>/);
  const f = admin({ adOv: { ...OV, oldHash: ['TEST_ONLY_a', 'TEST_ONLY_b'] }, adPres: PRES }, { mgrs: { TEST_ONLY_d1: {} } });
  const v = f.v(), txt = cp(v.ovAlerts.map((a) => a.txt));
  assert.ok(txt.includes('وحدتان بلا مدير — لا يعتمد فيها أحدٌ الجدول أو التقرير اليومي'), JSON.stringify(txt));
  assert.ok(txt.includes('حسابان بصيغة كلمة مرور قديمة التشفير'), JSON.stringify(txt));
  assert.equal(v.ovAlertsT, 'يحتاج قرارك (' + v.ovAlerts.length + ')');
  assert.equal(val(card(v, 'acc'), 'بصيغة كلمة مرور قديمة'), '2');
  v.ovAlerts.find((a) => a.act === 'الإدارات').go();
  assert.deepEqual(cp(f.went.pop()), ['depts', null]);
  v.ovAlerts.find((a) => a.act === 'مراقبة الحسابات').go();
  assert.deepEqual(cp(f.went.pop()), ['users', null]); assert.equal(f.page.state.usF, 'old', 'opens the accounts filtered to the old format');
});

test('one «بلا مدير» rule: _deptsNoMgr is defined once and is what the home page counts', () => {
  assert.equal((LOGIC.match(/\n  _deptsNoMgr\(\) \{/g) || []).length, 1);
  assert.ok((LOGIC.match(/this\._deptsNoMgr\(\)/g) || []).length >= 1);
  const f = admin({ adOv: OV }, { mgrs: { TEST_ONLY_d2: {} } });
  assert.deepEqual(cp(f.page._deptsNoMgr().map((d) => d.id)), ['TEST_ONLY_d1', 'TEST_ONLY_s1']);
});

test('navigation from home goes through the console sidebar (conGo): card links, filtered rows, «عرض الكل» and «إرسال تعميم»', () => {
  const f = admin({ adOv: OV, adPres: PRES }), v = f.v();
  let prevented = 0; card(v, 'acc').go({ preventDefault: () => prevented++ });
  assert.equal(prevented, 1); assert.deepEqual(cp(f.went.pop()), ['users', null]);
  card(v, 'sec').rows.find((r) => r.l === 'محاولات دخول فاشلة').go();
  assert.deepEqual(cp(f.went.pop()), ['sec', null]); assert.equal(f.page.state.adSecKind, 'login'); assert.equal(f.page.state.adSecPeriod, 'today');
  card(v, 'sec').rows.find((r) => r.l === 'كتابات مرفوضة').go();
  assert.equal(f.page.state.adSecKind, 'denied');
  v.ovFrozenAll(); assert.deepEqual(cp(f.went.pop()), ['users', null]); assert.equal(f.page.state.usF, 'frozen');
  v.ovAddedAll(); assert.equal(f.page.state.usF, 'week');
  v.ovSendBc(); assert.deepEqual(cp(f.went.pop()), ['plat', 'notif']); assert.equal(f.page.state.nfSec, 'bc', '«إرسال تعميم» opens the broadcast view');
  assert.match(VIEW, /<div class="con-ph-a"><button type="button" class="bs-btn" onClick="\{\{ovSendBc\}\}">إرسال تعميم<\/button><button type="button" class="bs-btn" onClick="\{\{admGoBackup\}\}">أخذ نسخة شاملة<\/button><\/div>/);
});

test('«أحداث المنصة الأخيرة»: platform and security notifications from the bell\'s own list, newest five', () => {
  const now = Date.now(), N = [];
  for (let i = 0; i < 7; i++) N.push({ id: 'n' + i, k: i % 2 ? 'sec' : 'sys', t: 'TEST_ONLY e' + i, at: now - i * 6e4 });
  N.push({ id: 'x', k: 'task', t: 'TEST_ONLY task', at: now + 1 });
  const v = admin({ adOv: OV }, { notif: N.slice().reverse() }).v();
  assert.deepEqual(cp(v.ovEvents.map((e) => e.t)), ['TEST_ONLY e0', 'TEST_ONLY e1', 'TEST_ONLY e2', 'TEST_ONLY e3', 'TEST_ONLY e4']);
  assert.equal(v.ovEvents[1].tone, 'bad');
  assert.equal(admin({ adOv: OV }).v().ovEventsEmpty, true);
});

test('lists show five rows at most, with the full count in the header; no shortcut tiles to the platform settings on home', () => {
  const now = Date.now(), added = Array.from({ length: 8 }, (_, i) => ({ ts: now - i * 36e5, by: 'TEST_ONLY o', tg: { id: 'TEST_ONLY_n' + i, name: 'TEST_ONLY n' + i, role: 'staff' } }));
  const v = admin({ adOv: { ...OV, added } }).v();
  assert.equal(v.ovAdded.length, 5); assert.equal(v.ovAddedN, '8 حسابات');
  for (const x of ['plat/id', 'plat/mods', 'plat/notif', 'هوية المنصة', 'الوحدات<', 'adm-ov-kpi"', 'ovCards']) assert.ok(!OVERVIEW.includes(x), 'no «' + x + '» on home');
  assert.ok(!/\bovCards\b/.test(LOGIC), 'the old tile model is gone');
  for (const h of ['ov-h-dec', 'ov-h-fail', 'ov-h-add', 'ov-h-pres', 'ov-h-frz', 'ov-h-ev']) assert.match(OVERVIEW, new RegExp('<h3 id="' + h + '">'), h + ' is a heading under the page h2');
  for (const b of ['ovFailsAll', 'ovAddedAll', 'ovPresAll', 'ovFrozenAll', 'ovEventsAll']) assert.match(OVERVIEW, new RegExp('class="adm-ov-more" onClick="\\{\\{' + b + '\\}\\}"'));
});
