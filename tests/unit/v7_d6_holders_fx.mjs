/* V7 · د6 (أ1 · ب4) — عُدّةُ «الحاملين»: هيكلٌ مصطنع (TEST_ONLY) فوق عالَم الاختبار القياسي (world_fx · العاملُ الحقيقي فوق D1 البديل · وضعُ الإنفاذ)
   والواجهةُ الحقيقية لكل حساب في node:vm (280 · 320 · 330 · 331 · 334 · 340 · 345 — تُقلع من العامل بجلسة الحساب نفسِه).
     قطاع S ← إدارة عامة G ← إدارة A (قسم A_S1) · إدارة B
   الحسابات: مديرُ المنصة · مديرُ القطاع (gm) · حسابُ الإدارة A (dept) · مديرُ A بالشارة (staff + mgr) · مديرُ القسم · موظفٌ بدورٍ مخصّص ·
   موظفٌ بلا دور · موظفٌ باستثناءٍ مؤقت سارٍ وآخرَ منتهٍ. كلماتُ الدخول تُولَّد عشوائياً في كل تشغيل (لا كلمةَ في ملف).
   الحالاتُ الأربع تُبنى بحفظٍ حقيقي من واجهة مدير المنصة عبر العامل (setDeptCap · setDeptSubs · BassamPlat.set) ثم تُقلع الواجهاتُ من جديد. */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { world, stored, putKV, addAccount } from './world_fx.mjs';
import { loadClient, until, sleep } from './k264_vm.mjs';
import { SRC } from './harness.mjs';
import { SEEN_SRC, SIDEBAR_SRC } from '../support/one_menu.mjs';

export const T = 'TEST_ONLY_d6_';
export const S = T + 'S', G = T + 'G', A = T + 'A', B = T + 'B', A_S1 = T + 'A_S1';
/* وحدةٌ قائمة بلا سجلّ سقفٍ قط، تحت عقدةٍ في الجذر بلا سجلّ (سقفٌ «مفتوح») — لا تمسّها الحالاتُ الأربع: دليلُ «الوحدات القائمة لا تتغيّر» (ب4) */
export const NO = T + 'NO', OP = T + 'OP';
export const E_ROLE = T + 'e_role', E_NONE = T + 'e_none', E_EX = T + 'e_ex', ROLE = T + 'r1';
export const KP = 'bassam_perms_v1';
export const BLOCKS = ['255-page-manifest.js', '260-bassam-plat.js', '280-server-storage.js', '310-image-refs.js', '320-dept-storage.js', '330-auth.js', '331-perm-model.js', '332-find-day.js', '333-platform-map.js', '334-perm-tree-tpl.js', '340-registry-v24-9.js', '345-perm44.js', '440-count.js'];
/* ملفُّ الصفحة الذي يحمل عروضَ «الصلاحيات» (ما يراه المدير · حاملُ الدور · الشخص) — إن نُقلت الدوالُّ إلى ملف صفحةٍ آخر يُحدَّث هذا المسارُ وحده */
export const PERM_VIEWS = path.join(SRC, 'modules', 'org', 'logic-perm44.js');
const pin = () => String(crypto.randomInt(100000, 999999));
/* الحسابات: who → { uid, un, role, dept, ekey, extra } */
export const ACC = {
  gm:    { uid: T + 'u_gm',    un: '2100000901', role: 'gm',    dept: '',   ekey: 'gm:' + S, extra: { gid: S } },
  dept:  { uid: T + 'u_dept',  un: '2100000902', role: 'dept',  dept: A,    ekey: 'mgr:' + A },
  mgr:   { uid: T + 'u_mgr',   un: '2100000903', role: 'staff', dept: A,    ekey: 'mgr:' + A + ':2', extra: { mgr: 1 } },
  sec:   { uid: T + 'u_sec',   un: '2100000904', role: 'staff', dept: A_S1, ekey: 'mgr:' + A_S1, extra: { mgr: 1 } },
  role:  { uid: T + 'u_role',  un: '2100000905', role: 'staff', dept: A,    ekey: E_ROLE },
  none:  { uid: T + 'u_none',  un: '2100000906', role: 'staff', dept: A,    ekey: E_NONE },
  ex:    { uid: T + 'u_ex',    un: '2100000907', role: 'staff', dept: A,    ekey: E_EX },
  open:  { uid: T + 'u_open',  un: '2100000908', role: 'staff', dept: OP,   ekey: 'mgr:' + OP, extra: { mgr: 1 } },
};
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
/* قبل التحويل القانوني للبذرة: الهيكلُ والموظفون مفاتيحُ قديمةٌ عادية */
function seedOrg(env) {
  const put = (k, v) => { env.DB.exec('DELETE FROM kv WHERE k = ' + q(k) + ';'); env.DB.exec('INSERT INTO kv (k, seq, v) VALUES (' + q(k) + ', 0, ' + q(JSON.stringify(v)) + ');');
    env.DB.exec("INSERT INTO meta (k, v) VALUES ('rev', '1') ON CONFLICT(k) DO UPDATE SET v = CAST(CAST(meta.v AS INTEGER) + 1 AS TEXT);");
    env.DB.exec('INSERT INTO revs (k, rev) VALUES (' + q(k) + ", (SELECT CAST(v AS INTEGER) FROM meta WHERE k = 'rev')) ON CONFLICT(k) DO UPDATE SET rev = excluded.rev;"); };
  const rd = (k) => { const r = env.DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', k); return r.length ? JSON.parse(r.map((x) => x.v).join('')) : null; };
  put('bassam_gdepts_v1', (rd('bassam_gdepts_v1') || []).concat([{ id: S, name: T + 'قطاع', kind: 'قطاع' }, { id: G, name: T + 'إدارة عامة', kind: 'إدارة عامة', pid: S }, { id: NO, name: T + 'عقدة مفتوحة', kind: 'إدارة عامة' }]));
  put('bassam_depts_v1', (rd('bassam_depts_v1') || []).concat([{ id: A, name: T + 'إدارة أ', gid: G }, { id: B, name: T + 'إدارة ب', gid: G }, { id: A_S1, name: T + 'قسم أ١', gid: A, kind: 'قسم' }, { id: OP, name: T + 'إدارة مفتوحة', gid: NO }]));
  put('bsdept:' + A + ':bassam_employees_v1', [E_ROLE, E_NONE, E_EX].map((e, i) => ({ eid: e, name: T + 'موظف ' + (i + 1), empno: String(79001 + i), type: T + 'رسمي', work: T + 'مراقب' })));
}
export async function holdersWorld() {
  const W = await world({ mode: 'enforce', beforeCutover: seedOrg });
  const pw = {};
  for (const who of Object.keys(ACC)) { const a = ACC[who]; pw[who] = pin(); addAccount(W.env, { uid: a.uid, un: a.un, pw: pw[who], name: T + who, ekey: a.ekey, dept: a.dept, role: a.role }); }
  const U = stored(W.env, 'bassam_auth_users_v1');
  for (const who of Object.keys(ACC)) { const a = ACC[who], u = U.find((x) => x.id === a.uid); Object.assign(u, a.extra || {}); if (!a.dept) delete u.deptId; }
  putKV(W.env, 'bassam_auth_users_v1', U);
  W.ck = { su: W.su.ck };
  for (const who of Object.keys(ACC)) W.ck[who] = (await W.login(ACC[who].un, pw[who])).ck;
  return W;
}
/* حسابٌ لوحدةٍ أُنشئت في الاختبار: who اسمُه في W.ck · mgr: يحمل شارةَ مدير الوحدة did */
let accN = 0;
export async function addHolder(W, who, did, mgr) {
  const n = ++accN, pw = pin(), un = String(2100001000 + n), uid = T + 'u_new' + n;
  addAccount(W.env, { uid, un, pw, name: T + who, ekey: mgr ? 'mgr:' + did : T + 'e_new' + n, dept: did, role: 'staff' });
  if (mgr) { const U = stored(W.env, 'bassam_auth_users_v1'); U.find((x) => x.id === uid).mgr = 1; putKV(W.env, 'bassam_auth_users_v1', U); }
  W.ck[who] = (await W.login(un, pw)).ck;
  return who;
}
/* سجلُّ «مطفأة كلها» المتوقَّع — محسوباً مستقلاً من بيانات المحرّك المولَّدة (345: الأنظمةُ التي تُطفأ) وسجلّ الصفحات: الصفحاتُ الدائمة وحدها، والأقسامُ
   التي هي أنظمةٌ (العهد) مطفأة */
export function offRecord() {
  const m = /var KIVO_PERM44_DATA = (\{[\s\S]*?\});\n/.exec(fs.readFileSync(path.join(SRC, 'permissions', '345-perm44.js'), 'utf8'));
  const sys = JSON.parse(m[1]).systems.filter((s) => s.toggle !== false && s.key !== 'admin'), pages = JSON.parse(fs.readFileSync(path.join(SRC, 'manifests', 'pages.json'), 'utf8')).pages;
  const offPages = sys.map((s) => s.leaves[0]).filter((l) => !l.includes('/')), offSubs = sys.map((s) => s.leaves[0]).filter((l) => l.includes('/')).map((l) => l.split('/'));
  const subs = {};
  for (const [pk, sk] of offSubs) subs[pk] = (subs[pk] || pages.find((p) => p.key === pk).subs.map((x) => x.key)).filter((k) => k !== sk);
  return { caps: pages.map((p) => p.key).filter((k) => !offPages.includes(k)), subs, systems: sys.map((s) => s.key), all: pages.map((p) => p.key) };
}
/* الواجهةُ الحقيقية لحساب who والوحدةُ النشطة did — تُقلع من العامل؛ تُغلق بـdispose */
export async function clientOf(W, who, did) {
  const boot = (await W.C.boot(W.ck[who])).boot;
  assert.ok(boot && boot.uid, 'boot ' + who);
  const Tm = loadClient({ C: W.C, boot, jar: { cookie: W.ck[who] }, blocks: [] });
  Tm.W.atob = globalThis.atob; Tm.W.btoa = globalThis.btoa;
  Tm.W.localStorage._m.set('bassam_session_v1', JSON.stringify({ uid: boot.uid, ts: Date.now(), la: Date.now() }));
  if (did) Tm.W.localStorage._m.set('bassam_active_dept_v1', did);
  Tm.W.document.hidden = true;
  for (const e of [Tm.W.document.documentElement, Tm.W.document.body, Tm.W.document.head]) e.classList.toggle = function (c, on) { on ? this.add(c) : this.remove(c); };   /* 260 يبدّل أصنافَ الجذر */
  Tm.run(BLOCKS);
  if (!Tm.W.KIVO.KIVO_REGISTRY && Tm.W.KIVO_REGISTRY) Tm.W.KIVO.KIVO_REGISTRY = Tm.W.KIVO_REGISTRY;
  const K = Tm.W.KIVO, SV = K.__BS_SRV, I = K.__BS_I.auth;
  assert.ok(I && !I.dead && SV && K.Perm44 && K.BassamPerm.seenBy, 'client loaded: ' + who);
  if (did) assert.equal(K.BassamDepts.active(), did, who + ' is in ' + did);
  const settle = async () => { await sleep(30); assert.ok(await until(() => !SV.dirty() && !SV.inflight(), 8000), 'saved'); await sleep(30); };
  const ev = (src) => JSON.parse(JSON.stringify(vm.runInContext(src, Tm.ctx)));
  const c = { T: Tm, K, I, P: K.BassamPerm, SV, settle, denied: () => SV.denied(), dispose: () => Tm.dispose(), ev,
    seen: (h) => ev('(' + SEEN_SRC + ')(' + JSON.stringify(h || { kind: 'session' }) + ')'),
    sidebar: () => ev('(' + SIDEBAR_SRC + ')()') };
  return c;
}
/* عروضُ صفحة «الصلاحيات» الحقيقية (دوالُّ logic-perm44.js نفسُها) فوق واجهةٍ محمَّلة — بلا رسم: p44NavOf · _p44Menu · _p44Compile · _p44Eff */
export function permViews(c) {
  if (!c.T.W.Component) { vm.runInContext('var Component = function () { this.state = { p44: {} }; }; Component.prototype.setState = function () {}; Component.prototype.bsToast = function () {};', c.T.ctx);
    vm.runInContext(fs.readFileSync(PERM_VIEWS, 'utf8'), c.T.ctx, { filename: 'logic-perm44.js' }); }
  const ui = vm.runInContext('new Component()', c.T.ctx), keys = (rows) => JSON.parse(JSON.stringify(rows));
  return {
    ui,
    mgrCard: (u) => keys(ui.p44NavOf(u)).map((x) => x.k),
    /* الأسماءُ (n) هي ما يُعرض — تُقارن بأسماء المصدر */
    roleNames: (role, did) => keys(ui._p44Menu(ui._p44Compile(role, did), role, did)).map((x) => x.n),
    personNames: (sel, did, rec, roles) => keys(ui._p44Menu(rec ? ui._p44Eff(rec, roles, did, Date.now()) : null, null, did, sel)).map((x) => x.n),
    roleKeys: (role, did) => keys(ui._p44Compile(role, did)),
    roleRows: (role, did) => keys(ui._p44Menu(ui._p44Compile(role, did), role, did)),
  };
}
export const namesOf = (c, ks) => c.ev('(function (ks) { var m = {}; KIVO.BassamPerm.menuFor({}, "").forEach(function (x) { m[x.k] = x.n; }); m.profile = "صفحتي"; return ks.map(function (k) { return m[k] || k; }); })(' + JSON.stringify(ks) + ')');

/* ── الحالاتُ الأربع (حفظٌ حقيقي من واجهة مدير المنصة) ── */
export const OFF_ONE = 'dstats', OFF_PLAT = 'irshad';   /* كلاهما رابطٌ في القائمة الجانبية */
export async function applyState(W, name) {
  const c = await clientOf(W, 'su', B);
  try {
    const ALL = c.ev('KIVO.BassamPerm.PAGE_KEYS'), subs = c.ev('KIVO.BassamPerm.subKeysOf("emps")');
    const R = [];
    for (const u of [S, G, A, B, A_S1]) { R.push(c.I.setDeptCap(u, ALL), c.I.setDeptSubs(u, 'emps', subs)); }
    let off = [];
    if (name === 'allOff') { const perm = ALL.filter((k) => c.ev('KIVO.Perm44.sysList().filter(function (s) { return s.toggle !== false && s.key !== "admin"; }).map(function (s) { return s.leaves[0]; })').indexOf(k) === -1);
      R.push(c.I.setDeptCap(A, perm), c.I.setDeptSubs(A, 'emps', ['data'])); }
    else if (name === 'oneOff') R.push(c.I.setDeptCap(A, ALL.filter((k) => k !== OFF_ONE)));
    else if (name === 'platOff') off = [OFF_PLAT];
    else assert.equal(name, 'allOn');
    for (const r of R) assert.equal(r && r.ok, true, 'ceiling written');
    const pl = c.K.BassamPlat.get(), r2 = c.K.BassamPlat.set(Object.assign({}, pl, { mods: Object.assign({}, pl.mods, { off }) }));
    assert.notEqual(r2 && r2.ok, false, 'platform switch written');
    await c.settle();
    assert.equal(c.denied(), 0, 'the worker accepted the state «' + name + '»');
  } finally { c.dispose(); }
}
export const STATES = ['allOn', 'allOff', 'oneOff', 'platOff'];
/* الدورُ المخصّص والأشخاص — حفظٌ واحد من محرّك الأدوار الحقيقي (السجلّان معاً، يحكمه الخادمُ ذرّياً) */
export const ROLE_DOC = { id: ROLE, name: T + 'دور', desc: '', sys: { tasks: { lvl: 'edit' }, staff: { lvl: 'view' }, irshad: { lvl: 'view' }, dstats: { lvl: 'view' }, links: { lvl: 'view' }, daily: { lvl: 'view' } } };
export async function seedRoles(W, exKey) {
  const c = await clientOf(W, 'su', A);
  try {
    const now = Date.now(), dr = c.K.Perm44.draft(A);
    const people = { [E_ROLE]: { role: ROLE, ex: [] }, [E_EX]: { role: null, ex: [{ key: exKey.live, until: now + 6 * 3600 * 1000, by: 'su', at: now }] } };
    const r = c.K.Perm44.setRoles(dr, A, { v: 1, roles: [ROLE_DOC], people });
    assert.equal(r.ok, true, 'roles record: ' + JSON.stringify(r.err || ''));
    const x = await c.K.Perm44.commit(dr);
    assert.equal(x.ok, true, 'roles + grants saved by the worker: ' + JSON.stringify(x));
  } finally { c.dispose(); }
  /* استثناءٌ تنتهي مهلتُه بعد حفظه: المحرّكُ لا يكتب منتهياً، فتُقدَّم مهلةُ مفتاحٍ محفوظ في سجلّ المنح نفسِه (TEST_ONLY) — الخادمُ يُسقطه وقتَ القرار
     (057 enfGrantOf) والواجهةُ يجب أن تُسقطه في «ما يراه الآن» */
  const GK = 'bsdept:' + A + ':bassam_grants_v1', g = stored(W.env, GK);
  assert.ok(g && g.emp && g.emp[E_EX] && g.emp[E_EX].plus.includes(exKey.live), 'the live exception was compiled into the grant');
  g.emp[E_EX].plus.push(exKey.gone); g.emp[E_EX].until = Object.assign({}, g.emp[E_EX].until, { [exKey.gone]: Date.now() - 1000 });
  putKV(W.env, GK, g);
}
