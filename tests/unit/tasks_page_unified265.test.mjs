/* KIVO_265 — المراجعةُ الأمنية الموحّدة (reports/k265/reviews/review_265_unified.md) في الواجهة: صفحةُ «المهام» الحقيقية (src/modules/tasks/logic.js في vm
   + KIVO.BassamPageKit الحقيقي + 546 الحقيقي) وطبقةُ البيانات الحقيقية (src/api/280 — k264_vm) على العامل الحقيقي (tasks_fx · بياناتٌ اصطناعية وحدها):
     (أ) R-2: نافذةُ «قبول المهمة وإسنادها» (قبولٌ نيابةً لمهمةٍ عامة — إسنادٌ جديد بالحفظ الخامّ): من لا حسابَ له · ومعطَّلُ الحساب · وحسابُه برقم الهوية
         (R-3) معلَّمون بالسبب ولا يُختارون (تنبيهٌ بالسبب وما يُصلحه) — وصاحبُ الحساب النشط يُختار فيُسند إليه
     (ب) R-1/R-2/R-7: رفضُ الخادم للحفظ الخامّ يُبلَّغ بسببه المسمّى (task-asg · task-acct · task-rv) لا «صلاحيتك لا تشمله» — وتعود القيمةُ كما في الخادم */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT, moduleLogic } from './harness.mjs';
import { loadClient, pageText, until as untilV } from './k264_vm.mjs';
import { world, workerUnderTest, ME, MATE, KT, KE, D, TAG, DAY, stored, putKV, addAccount, row, hij, HR } from './tasks_fx.mjs';
import { act, upImg } from './tasks_conc_fx.mjs';

const WU = workerUnderTest();
const LOGIC = moduleLogic('tasks');
const DM = ['0000000101', '70101'], NOACCT = 'tst_e_noacct', NIDACCT = 'tst_e_nidacct', NID = '1999000777';
function seed(W) {
  const E = stored(W.env, KE), base = E.find((e) => e.eid === ME.eid);
  const mk = (eid, name, nid) => Object.assign({}, base, { eid, name: TAG + ' · ' + name, empno: '', nid });
  E.push(mk(NOACCT, 'بلا حساب'), mk(NIDACCT, 'حسابُه برقم الهوية', NID)); putKV(W.env, KE, E);
  addAccount(W.env, { uid: 'tst_nidacct', un: '2000000377', pw: '70377', ekey: NID });
  const U = stored(W.env, 'bassam_auth_users_v1'); U.find((u) => u.id === MATE.uid).dis = 1; putKV(W.env, 'bassam_auth_users_v1', U);
}
/* الصفحةُ لمدير الإدارة (كما في tasks_page_acct265) — users: قائمةُ حسابات إدارته كما تعطيها طبقةُ الحسابات */
function page(W, ck, storeJson, emps, users) {
  const store = new Map([['bassam_tasks_v1', storeJson], ['bassam_employees_v1', JSON.stringify(emps)]]);
  const KIVO = {}, toasts = [], calls = [];
  const ctx = { KIVO, console, Intl, Date, Math, JSON, Promise, Object, Array, String, Number, RegExp, Set, Map, Error, isNaN, parseInt, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => 0,
    localStorage: { getItem: (k) => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    document: { hidden: false, querySelector: () => null, addEventListener: () => {}, removeEventListener: () => {} }, navigator: { userAgent: 'node' }, addEventListener: () => {}, removeEventListener: () => {},
    __BS_BOOT: { srv: 1 },
    fetch: (u, o) => { calls.push(String(u)); return W.C.req(u, { method: (o && o.method) || 'GET', body: o && o.body, cookie: ck, headers: (o && o.headers) || {} }); } };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['src/services/490-emp-key.js', 'src/services/440-count.js', 'src/services/546-task-model.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
  KIVO.BassamPerm = { can: () => true, on: () => true }; KIVO.bsPct = (a, b) => (b ? Math.round(100 * a / b) : 0) + '٪';
  KIVO.BassamAuth = { user: () => ({ id: 'tst_dm1', role: 'staff', mgr: true, ekey: 'mgr:tst_d1', deptId: D, name: 'TEST_ONLY مدير' }), display: () => ({ name: 'TEST_ONLY مدير' }), users: () => users };
  KIVO.BassamDepts = { active: () => D };
  KIVO.BassamSup = { isSup: () => false };
  KIVO.__BS_SRV = { flushAsync: async () => true };
  class DCLogic { constructor() { this.state = {}; } setState(p, cb) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); cb && cb(); } }
  ctx.DCLogic = DCLogic;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/components/565-page-kit.js'), 'utf8'), ctx);
  /* بلا جدولٍ شهريّ في الصفحة: الموظفون كلُّهم «مداومون» (onDutyToday بلا التسكين) */
  const B0 = KIVO.BassamPageKit.base; KIVO.BassamPageKit.base = (B, a) => class extends B0(B, a) { bsOn(k) { return k !== 'staff'; } bsToast(m, k) { toasts.push([m, k]); } bsAck(m, k) { toasts.push([m, k || 'ok']); return Promise.resolve(true); } };
  vm.runInContext(LOGIC + '\n;globalThis.__C = Component;', ctx, { filename: 'tasks/logic.js' });
  const c = new ctx.__C(); c._tkDayDef = () => 0;   /* اختباراتُ الشهر كاملاً (KIVO_265 · كروتُ الأيام: الافتراضي يومُ اليوم) */ c.state = Object.assign({}, c.state || {}, { locked: {} });
  c.bsToast = (m, k) => toasts.push([m, k || 'err']);
  return { c, store, toasts, calls };
}
const usersOf = (W) => stored(W.env, 'bassam_auth_users_v1').filter((u) => u.deptId === D).map((u) => ({ id: u.id, role: u.role, deptId: u.deptId, ekey: u.ekey, dis: u.dis, mgr: u.mgr }));

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';

  test(M + '(أ) R-2 «قبولٌ نيابةً»: بلا حساب · معطَّل · برقم الهوية معلَّمون بالسبب ولا يُختارون — والنشطُ يُختار', async () => {
    const W = await world({ worker: WU.file, mode }); seed(W); const dm = await W.login(...DM);
    const g = await W.C.api('/api/get?keys=' + encodeURIComponent(KT + ',' + KE), { cookie: dm.ck });
    const P = page(W, dm.ck, g.j.keys[KT].v, JSON.parse(g.j.keys[KE].v), usersOf(W));
    const S = JSON.parse(g.j.keys[KT].v), gi = S[DAY].findIndex((r) => r[13] === 1760000000902 || r[13] === 1760000000901);
    const day = +DAY.split('-')[2], [y, m] = DAY.split('-').map(Number);
    P.c.setState({ year: y, month: m, acceptRef: { d: day, i: gi, title: S[DAY][gi][0], wt: '' } });
    const V = typeof P.c._tkDutyVals === 'function' ? P.c._tkDutyVals() : P.c.renderVals(), by = Object.fromEntries(V.dutyList.map((x) => [x.name, x]));   /* قبل 265 الموحّد: داخل renderVals */
    const nm = (s) => TAG + ' · ' + s;
    assert.equal(by[nm('بلا حساب')].acct, 'none', JSON.stringify(by[nm('بلا حساب')]));
    assert.equal(by[MATE.name].acct, 'disabled'); assert.equal(by[nm('حسابُه برقم الهوية')].acct, 'nid');
    assert.ok(/بلا حسابِ مستخدم — لا تُسند إليه/.test(by[nm('بلا حساب')].shiftLabel) && /برقم الهوية/.test(by[nm('حسابُه برقم الهوية')].shiftLabel), 'السببُ ظاهرٌ بجانب الاسم');
    assert.ok(by[ME.name] && !by[ME.name].acct, 'النشطُ غيرُ معلَّم');
    for (const [n, re] of [[nm('بلا حساب'), /بلا حسابِ مستخدم — أنشئ له حساباً/], [MATE.name, /حسابُه معطَّل — فعِّل حسابه/], [nm('حسابُه برقم الهوية'), /برقم الهوية — اربط حسابَ دخوله بمعرّفه الثابت/]]) {
      P.toasts.length = 0; const before = P.store.get('bassam_tasks_v1');
      by[n].click();
      assert.ok(P.toasts.some((t) => /لا تُسند مهمةٌ إلكترونية/.test(t[0]) && re.test(t[0])), n + ': ' + JSON.stringify(P.toasts));
      assert.equal(P.store.get('bassam_tasks_v1'), before, n + ': لا إسنادَ ولا حفظ');
    }
    by[ME.name].click();
    const after = JSON.parse(P.store.get('bassam_tasks_v1'))[DAY][gi];
    assert.ok(after[14] === ME.eid && after[11] && after[3] === 'in_progress', 'النشطُ يُسند إليه ويُقبل: ' + JSON.stringify([after[14], after[3]]));
  });

  test(M + '(ب) رفضُ الحفظ الخامّ يُبلَّغ بسببه المسمّى — task-asg (بعد الإنجاز) · task-acct · task-rv — والقيمةُ كما في الخادم', async () => {
    const W = await world({ worker: WU.file, mode }); seed(W); const dm = await W.login(...DM), me = await W.login(ME.un, ME.pw);
    const s = Date.now() - 10 * 60e3;
    const c = await W.C.api('/api/tasks/create', { method: 'POST', cookie: dm.ck, body: { k: hij(s), t: TAG + ' للواجهة', s, e: s + 3 * HR, asg: [ME.eid], rv: { u: 'tst_sup1' }, force: true } });
    assert.equal(c.status, 200, JSON.stringify(c.j).slice(0, 200)); const k = c.j.rows[0].k, id = c.j.rows[0].id;
    const T = loadClient({ C: W.C, boot: (await W.C.boot(dm.ck)).boot, jar: { cookie: dm.ck }, blocks: ['280-server-storage.js', '440-count.js'] });
    try {
      assert.ok(await untilV(() => T.get(KT) && JSON.parse(T.get(KT))[k], 4000), 'قيمةُ المهام في الصفحة');
      /* الموظفُ يُنجزها بعد أن فتح المديرُ الصفحة */
      const img = await upImg(W, me.ck, 'pgu');
      assert.equal((await act(W, me.ck, { k, id, act: 'start' })).status, 200);
      assert.equal((await act(W, me.ck, { k, id, act: 'submit', imgs: [img], note: TAG + ' أنجزتُ' })).status, 200);
      const edit = (fn) => { const v = JSON.parse(T.get(KT)); const i = v[k].findIndex((r) => r[13] === id); v[k][i] = v[k][i].slice(); fn(v, v[k][i]); T.set(KT, JSON.stringify(v)); };
      const why = { 'task-asg': /لا يُغيَّر مكلَّفُها بالتعديل؛ استعمل «إعادة إسناد»/, 'task-acct': /حسابُ مستخدمٍ نشطٌ مربوطٌ بالمعرّف الذي يُسند به/, 'task-rv': /المراجِعُ لا يكون المكلَّفَ نفسَه/ };
      edit((v, r) => { r[14] = MATE.eid; r[8] = MATE.name; });                                       /* نسختُه بلا نشاط ⇒ يغيّر المكلَّف */
      assert.ok(await untilV(() => why['task-asg'].test(pageText(T.W)), 8000), 'task-asg بسببه: ' + pageText(T.W).slice(0, 300));
      assert.ok(await untilV(() => { const r = (JSON.parse(T.get(KT))[k] || []).find((q) => q[13] === id); return r && r[14] === ME.eid && r[11] && r[21] && r[21].imgs && r[21].imgs.includes(img); }, 4000), 'أُعيدت القيمةُ كما في الخادم (لصاحبها بتسليمه)');
      /* صفٌّ جديد لمن لا حسابَ له (تبويبٌ قديم) */
      { const v = JSON.parse(T.get(KT)); v[DAY].push(row({ id: 1760000077701, title: 'بلا حساب', eid: NOACCT, s: Date.now() + HR, e: Date.now() + 2 * HR })); T.set(KT, JSON.stringify(v)); }
      assert.ok(await untilV(() => why['task-acct'].test(pageText(T.W)), 8000), 'task-acct بسببه: ' + pageText(T.W).slice(0, 300));
      /* المراجِعُ مكلَّفاً — على مهمةٍ بمراجِعٍ مسمّى لم تبدأ */
      const c2 = await W.C.api('/api/tasks/create', { method: 'POST', cookie: dm.ck, body: { k: hij(s + 4 * HR), t: TAG + ' بمراجِع', s: s + 4 * HR, e: s + 5 * HR, asg: [ME.eid], rv: { u: 'tst_sup1' }, force: true } });
      const k2 = c2.j.rows[0].k, id2 = c2.j.rows[0].id;
      assert.ok(await untilV(() => (JSON.parse(T.get(KT))[k2] || []).some((q) => q[13] === id2), 8000), 'وصلت المهمةُ الثانية بالسحب');
      { const v = JSON.parse(T.get(KT)); const i = v[k2].findIndex((r) => r[13] === id2); v[k2][i] = v[k2][i].slice(); v[k2][i][14] = 'tst_e_sup1'; T.set(KT, JSON.stringify(v)); }
      assert.ok(await untilV(() => why['task-rv'].test(pageText(T.W)), 8000), 'task-rv بسببه: ' + pageText(T.W).slice(0, 300));
      assert.doesNotMatch(pageText(T.W), /صلاحيتك لا تشمله/, 'لا السببُ العامّ');
    } finally { T.dispose(); }
  });
}
