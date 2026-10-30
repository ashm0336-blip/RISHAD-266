import { replaceOperationalFixture } from './operational_legacy_seed_fx.mjs';
import { taskText, saveTaskDocuments } from './tasks_vm_operations_fx.mjs';
import { taskCommandBody, operationSaveBody } from './tasks_fx.mjs';
/* KIVO_264 · KIVO-Tasks — رقعةُ «ملفي ← مهامي» (reports/k264/tasks/patches/03-profile-mytasks.patch · يملك الملفَّ وكيلُ «ملفي»):
   منطقُ الصفحة الحقيقي (src/modules/profile/logic.js بعد الرقعة) + طبقةُ البيانات الذاتية (src/services/545-task-self.js) في vm واحد،
   و fetch بجلسة الموظف إلى العامل الحقيقي (tests/unit/tasks_fx.mjs). ما دامت الرقعةُ لم تُدمج تُطبَّق هنا على نسخةٍ مؤقتة (git apply) —
   فإن دُمجت يُختبر الملفُّ نفسُه. السيناريو هو عطلُ P0 حرفياً: المدير يُسند مهمةً (لليوم ولغدٍ) ⇒ تظهر في بطاقة «مهامك» للموظف بلا task.view.
   والمرحلةُ الثانية (TO_BE §2 · ق2 · ق3): استلامٌ مستقلٌّ عن البدء · تعثّرٌ واستئناف · مسودّة · تسليمٌ للمراجعة ⇒ إعادةٌ بسبب ⇒ استكمالٌ بصورة ⇒
   اعتماد · سجلُّ المهمة بفاعلٍ ووقت · وسياسةُ إثباتٍ بخطوات عمل بلا مراجِع ولا اعتذار — كلُّها بأفعال الواجهة نفسِها على الخادم الحقيقي. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import vm from 'node:vm';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT } from './harness.mjs';
import { world, workerUnderTest, ME, KT, DAY, TOMORROW, YESTERDAY, PDAY, row, stored, rowsOf, putKV, HR, PNG } from './tasks_fx.mjs';

const WU = workerUnderTest();
const PATCH = path.join(ROOT, 'reports/k264/tasks/patches/03-profile-mytasks.patch');
function patchedLogic() {
  const src = path.join(ROOT, 'src/modules/profile/logic.js');
  if (fs.readFileSync(src, 'utf8').includes('KIVO.BassamMyTasks')) return src;            /* دُمجت الرقعة */
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_pf03_'));
  fs.mkdirSync(path.join(d, 'src/modules/profile'), { recursive: true });
  for (const f of ['logic.js', 'view.html']) fs.copyFileSync(path.join(ROOT, 'src/modules/profile', f), path.join(d, 'src/modules/profile', f));
  execFileSync('git', ['apply', '-p1', '--directory=', PATCH], { cwd: d, stdio: 'pipe' });
  return path.join(d, 'src/modules/profile/logic.js');
}
function page(W, ck, logicFile, opts = {}) {
  const KIVO = {}, B = { offline: false };
  const ctx = { KIVO, console, Intl, Date, Math, JSON, Promise, Object, Array, String, Number, RegExp, Set, Map, Error, isNaN, parseInt, encodeURIComponent, decodeURIComponent,
    setTimeout: (f) => (opts.timers ? opts.timers.push(f) : 0), clearTimeout: () => 0, setInterval: () => 0, clearInterval: () => 0,   /* opts.timers: تُجمع لتُشغَّل صراحةً */
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, document: { hidden: false, querySelector: () => null }, navigator: { userAgent: 'node' } };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.__BS_BOOT = { srv: 1, cf: 1 };
  ctx.CustomEvent = class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } };
  ctx.addEventListener = () => {}; ctx.dispatchEvent = () => true;
  ctx.fetch = async (url, opt = {}) => { if (B.offline) throw new TypeError('Failed to fetch'); if (opts.calls && /\/api\/me\/tasks\/act$/.test(String(url))) opts.calls.push(JSON.parse(opt.body)); const r = await W.C.req(url, { method: opt.method || 'GET', cookie: ck, headers: opt.headers, body: opt.body }); return { ok: r.status < 300, status: r.status, text: () => r.text(), json: () => r.json() }; };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/services/545-task-self.js'), 'utf8'), ctx);
  KIVO.BassamCount = (n, w) => n + ' ' + w;
  const toasts = [];
  class DCLogic { constructor() { this.state = {}; } setState(p) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); } }
  KIVO.BassamPageKit = { base: (Bc) => class extends Bc { bsOn() { return true; } bsToast(m, k) { toasts.push(['toast', m, k]); } bsAck(m, k) { toasts.push(['ack', m, k]); return Promise.resolve(true); } MONTHS() { return '١ ٢ ٣ ٤ ٥ ٦ ٧ ٨ ٩ ١٠ ١١ ١٢'.split(' '); } } };
  ctx.DCLogic = DCLogic;
  vm.runInContext(fs.readFileSync(logicFile, 'utf8') + '\n;globalThis.__C = Component;', ctx, { filename: 'profile/logic.js' });
  const c = new ctx.__C(); c.state = Object.assign({ pfPanel: '' }, c.state || {}); c._pfAlive = true;
  return { c, MT: KIVO.BassamMyTasks, B, toasts };
}
const T = { y: +DAY.split('-')[0], m: +DAY.split('-')[1], d: +DAY.split('-')[2] };
const E = { isStaff: true, T, myKey: ME.eid, keyOfTok: (x) => x, myRec: { name: ME.name } };

for (const mode of ['legacy', 'enforce']) {
  test('[' + mode + '] رقعةُ «ملفي»: مهمةُ المدير (لليوم ولغد) تظهر في «مهامك» للموظف بلا task.view · ولا اسمَ يُطابَق · والقبولُ من الخادم', async () => {
    const W = await world({ worker: WU.file, mode });
    const me = await W.login(ME.un, ME.pw), dm = await W.login('0000000101', '70101');
    const S = stored(W.env, KT);
    S[DAY].push(row({ id: 1760000055501, title: 'P0 اليوم من المدير', eid: ME.eid, s: Date.now() - 60e3, e: Date.now() + 3600e3 }));
    (S[TOMORROW] = S[TOMORROW] || []).push(row({ id: 1760000055502, title: 'P0 غداً من المدير', eid: ME.eid, s: Date.now() + 24 * 3600e3, e: Date.now() + 26 * 3600e3 }));
    assert.ok((await saveTaskDocuments(W, dm.ck, { [KT]: JSON.stringify(S) })).j.revs[KT], 'المدير يحفظ بطلب Operations موثق');
    const P = page(W, me.ck, patchedLogic());
    await P.MT.load(true);
    const t = P.c._tkVals({}, E, P.c.state);
    assert.equal(t.tkOn, true); assert.equal(t.tkEmpty, false, 'البطاقةُ ليست «لا مهام»');
    const titles = [t.tkFTitle].concat((t.tkRest || []).map(x => x.title));
    assert.ok(titles.some(x => /P0 اليوم من المدير/.test(x)) || +t.tkNewNz >= 1, 'مهمةُ اليوم في البطاقة: ' + titles.join(' | '));
    assert.ok(+t.tkUpN >= 2, 'القادمةُ (ومنها مهمةُ الغد) محسوبة: ' + t.tkUpN);
    P.c.state.pfPanel = 'tklog'; P.c.state.tkLogY = +YESTERDAY.split('-')[0]; P.c.state.tkLogM = +YESTERDAY.split('-')[1];   /* شهرُ «أمس» (قد يكون الشهرَ الماضي في أوّل الشهر) */
    const lg = P.c._tkVals({}, E, P.c.state);
    const all = (lg.tkLogDays || []).flatMap(d => d.rows.map(r => r.title));
    assert.ok(all.some(x => /انقضت مهلتها/.test(x)), 'المنقضيةُ في السجل لا تُحذف');
    /* القبولُ من الخادم (POST /api/me/tasks/act) — لا كتابةَ للمخزن الكامل */
    const mine = P.c._tkMine(E).find(x => x.r[13] === 1760000055501);
    P.c.tkAccept(mine.day, mine.i); await new Promise(r => setImmediate(r)); await new Promise(r => setTimeout(r, 30));
    assert.ok(P.toasts.some(x => x[0] === 'ack'), 'إشعارُ النجاح بعد ردّ الخادم: ' + JSON.stringify(P.toasts));
    const srv = rowsOf(stored(W.env, KT), ME.eid).find(x => x.r[13] === 1760000055501).r;
    assert.equal(srv[3], 'in_progress'); assert.ok(srv[11], 'وقتُ القبول في الخادم');
  });

  test('[' + mode + '] رقعةُ «ملفي»: حسابٌ غيرُ مرتبطٍ بسجلّ ⇒ رسالةٌ صريحة لا «لا مهام» · وانقطاعُ الاتصال ⇒ لا ادّعاءَ بحفظ', async () => {
    const W = await world({ worker: WU.file, mode });
    const dm = await W.login('0000000101', '70101');
    const P = page(W, dm.ck, patchedLogic()); await P.MT.load(true);
    const t = P.c._tkVals({}, Object.assign({}, E, { isStaff: true }), P.c.state);
    assert.match(t.tkEmptyT, /غير مرتبط/, 'حالةُ «غير مرتبط»');
    const me = await W.login(ME.un, ME.pw);
    const Q = page(W, me.ck, patchedLogic()); await Q.MT.load(true);
    const mine = Q.c._tkMine(E).find(x => x.r[13] === 1760000000101);
    Q.B.offline = true; Q.c.tkAccept(mine.day, mine.i); await new Promise(r => setTimeout(r, 30));
    assert.ok(Q.toasts.some(x => x[0] === 'toast' && /لم يُحفظ/.test(x[1])), 'تنبيهُ فشلٍ صريح: ' + JSON.stringify(Q.toasts));
    assert.ok(!Q.toasts.some(x => x[0] === 'ack'), 'لا «قُبلت» كاذبة');
    assert.equal(rowsOf(stored(W.env, KT), ME.eid).find(x => x.r[13] === 1760000000101).r[11], null);
  });
}

/* ── المرحلة الثانية ── */
const post = (W, ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body: operationSaveBody(W.env, p, taskCommandBody(W.env, p, body)) });
const V = (P) => P.c._tkVals({}, E, P.c.state);
const refOf = (P, id) => P.c._tkMine(E).find((x) => x.r.__x && String(x.r.__x.id) === String(id));
const srvRow = (W, id) => (rowsOf(stored(W.env, KT), ME.eid).find((x) => x.r[13] === id) || {}).r || [];
async function until(f, ms = 5000) { const t0 = Date.now(); for (;;) { let v = false; try { v = f(); } catch (e) { v = false; } if (v || Date.now() - t0 > ms) return v; await new Promise((r) => setTimeout(r, 10)); } }
const mkTask = (W, ck, t, extra) => post(W, ck, '/api/tasks/create', Object.assign({ k: DAY, t: 'TEST_ONLY ' + t, s: Date.now() - 60e3, e: Date.now() + 2 * HR, asg: [ME.eid] }, extra || {}));

for (const mode of ['legacy', 'enforce']) {
  test('[' + mode + '] رقعةُ «ملفي» · المرحلة الثانية: استلامٌ مستقلٌّ عن البدء · تعثّرٌ واستئناف · مسودّة · تسليمٌ للمراجعة ⇒ إعادةٌ بسبب ⇒ استكمالٌ بصورة ⇒ اعتماد · سجلُّ المهمة', async () => {
    const W = await world({ worker: WU.file, mode });
    const me = await W.login(ME.un, ME.pw), dm = await W.login('0000000101', '70101');
    const c = await mkTask(W, dm.ck, 'P2 رحلة ملفي'); assert.equal(c.status, 200, JSON.stringify(c.j));
    const id = c.j.rows[0].id;
    const P = page(W, me.ck, patchedLogic()); await P.MT.load(true);
    let t = V(P), R = refOf(P, id);
    assert.ok(R, 'المهمةُ الجديدة في «مهامك»');
    P.c.setState({ tkFocus: R.day + '#' + R.i }); t = V(P);
    assert.equal(t.tkFTitle, 'TEST_ONLY P2 رحلة ملفي');
    assert.match(t.tkFLbl, /تنتظر استلامك/); assert.equal(t.tkFStartOn, true); assert.match(t.tkFStartTxt, /بدء التنفيذ/);
    assert.equal(t.tkFAckOn, true, 'زرُّ «استلمتُها» مستقلّ'); assert.equal(t.tkFDecOn, true); assert.equal(t.tkFTlOn, true);
    assert.deepEqual([...t.tkFSteps.map((q) => q.t)], ['استلام', 'تنفيذ', 'توثيق', 'مراجعة', 'معتمدة'], 'ق3: المراجِعُ منشئُها ⇒ مرحلةُ «مراجعة»');
    /* 1) الاستلام وحده: لا يبدأ عدّادُ التنفيذ */
    P.c.tkAck(R.day, R.i); await until(() => (srvRow(W, id)[20] || {}).ack);
    let r = srvRow(W, id); assert.ok(r[20] && r[20].ack && !r[11], 'الاستلامُ في الخادم والتنفيذُ لم يبدأ');
    t = V(P); assert.equal(t.tkFAckOn, false); assert.match(t.tkFLbl, /استلمتَها ولم تبدأ/); assert.match(t.tkFSub, /استلمتَها/);
    /* 2) البدء */
    R = refOf(P, id); P.c.tkAccept(R.day, R.i); await until(() => srvRow(W, id)[11]);
    r = srvRow(W, id); assert.equal(r[3], 'in_progress'); assert.ok(r[11] >= r[20].ack, 'البدءُ وقتٌ مستقلّ بعد الاستلام');
    t = V(P); assert.equal(t.tkFRun, true); assert.match(t.tkFFinTxt, /التوثيق والتسليم/); assert.equal(t.tkFStallOn, true); assert.equal(t.tkFResumeOn, false);
    /* 3) التعثّر بسبب ثم الاستئناف */
    R = refOf(P, id); P.c.tkDeclineOpen(R.day, R.i, 'stall'); t = V(P);
    assert.equal(t.pfPanelTkDec, true); assert.match(t.tkDecHead, /تعثّر/); assert.equal(t.tkDecStall, true); assert.equal(t.tkDecDec, false);
    P.c.tkDecline(); assert.ok(P.toasts.some((x) => x[0] === 'toast' && /سبب التعثّر/.test(x[1])), 'لا تعثّرَ بلا سبب');
    P.c.setState({ tkWhy: 'بانتظار جهةٍ أخرى' }); P.c.tkDecline(); await until(() => (srvRow(W, id)[20] || {}).stall);
    assert.equal(srvRow(W, id)[20].stall.why, 'بانتظار جهةٍ أخرى');
    t = V(P); assert.match(t.tkFLbl, /متعثّرة/); assert.equal(t.tkFResumeOn, true); assert.equal(t.tkFStallOn, false); assert.match(t.tkFNote, /بانتظار جهةٍ أخرى/);
    R = refOf(P, id); P.c.tkResume(R.day, R.i); await until(() => !(srvRow(W, id)[20] || {}).stall);
    assert.ok(!(srvRow(W, id)[20] || {}).stall, 'استُؤنفت'); t = V(P); assert.match(t.tkFLbl, /جارية/);
    /* 4) «التوثيق والتسليم»: سياسةُ «صورة أو ملاحظة» (ق2) · مسودّة ثم تسليمٌ للمراجِع */
    R = refOf(P, id); P.c.tkFinishOpen(R.day, R.i); t = V(P);
    assert.equal(t.pfPanelTkFin, true); assert.equal(t.tkFinHead, 'التوثيق والتسليم');
    assert.match(t.tkFinPol, /صورةٌ أو ملاحظة/); assert.match(t.tkFinPol, /يراجعها/);
    assert.equal(t.tkFinDis, true); assert.match(t.tkFinHint, /صورة التوثيق أو اكتب ملاحظة/);
    P.c.setState({ tkNote: 'TEST_ONLY مسودّة' }); t = V(P);
    assert.equal(t.tkFinDis, false); assert.equal(t.tkFinBtn, 'تسليم للمراجعة'); assert.equal(t.tkFinDraftOn, true);
    t.tkFinDraft(); await until(() => (srvRow(W, id)[21] || {}).draft);
    r = srvRow(W, id); assert.equal(r[21].draft, 1); assert.equal(r[21].note, 'TEST_ONLY مسودّة'); assert.ok(!r[21].sub, 'المسودّةُ ليست تسليماً');
    t = V(P); assert.match(t.tkFNote, /مسودّة/);
    R = refOf(P, id); P.c.tkFinishOpen(R.day, R.i); assert.equal(P.c.state.tkNote, 'TEST_ONLY مسودّة', 'المسودّةُ تُستكمل لا تُكتب من جديد');
    P.c.setState({ tkNote: 'TEST_ONLY أنجزت' }); t = V(P); t.tkFinGo(); await until(() => (srvRow(W, id)[21] || {}).sub);
    r = srvRow(W, id); assert.ok(r[21].sub, 'سُلّمت'); assert.equal(r[3], 'in_progress', 'بانتظار المراجعة لا إنجاز');
    assert.ok(P.toasts.some((x) => x[0] === 'ack' && /للمراجعة/.test(x[1])), 'إشعارُ التسليم بعد ردّ الخادم');
    /* KIVO_265 · «ملفي» (قرارُ المالك 2026-10-16): المسلَّمةُ للمراجعة في قسمها «بانتظار اعتماد المسؤول» بحالتها — لا «الأهم الآن» ولا «بقية مهامك» ولا منجزة */
    t = V(P); assert.notEqual(t.tkFTitle, 'TEST_ONLY P2 رحلة ملفي', 'ليست «الأهم الآن» (ولو بقي tkFocus عليها)'); assert.equal(t.tkRevN, '1');
    assert.ok(!(t.tkRest || []).some((q) => q.title === 'TEST_ONLY P2 رحلة ملفي'), 'ولا في «بقية مهامك»');
    assert.equal(t.tkRvOn, true); assert.equal(t.tkRvHead, 'بانتظار اعتماد المسؤول (1)');
    const rq = t.tkRv.find((q) => q.title === 'TEST_ONLY P2 رحلة ملفي');
    assert.ok(rq, 'في قسم «بانتظار اعتماد المسؤول»'); assert.match(rq.meta, /^سُلّمت — بانتظار مراجعة /); assert.equal(rq.pill, 'للمراجعة');
    /* 5) المراجِع يعيدها بسبب ⇒ «أُعيدت إليك» بالسبب · استكمالٌ بصورة ⇒ تسليمٌ ثانٍ */
    const rt = await post(W, dm.ck, '/api/tasks/review', { k: DAY, id, ekey: ME.eid, decision: 'return', why: 'TEST_ONLY أرفق صورة الموقع' });
    assert.equal(rt.status, 200, JSON.stringify(rt.j));
    await P.MT.load(true); t = V(P);
    assert.match(t.tkFLbl, /أُعيدت إليك/); assert.match(t.tkFNote, /أرفق صورة الموقع/); assert.equal(t.tkRetN, '1'); assert.match(t.tkFFinTxt, /استكمال الإثبات/);
    R = refOf(P, id); P.c.tkFinishOpen(R.day, R.i); t = V(P);
    assert.match(t.tkFinHead, /استكمال الإثبات/); assert.match(t.tkFinRet, /أرفق صورة الموقع/);
    P.c.setState({ tkImgs: [PNG] }); t = V(P); t.tkFinGo(); await until(() => ((srvRow(W, id)[21] || {}).h || []).length === 2);
    r = srvRow(W, id); assert.equal(r[21].imgs.length, 1, 'الصورةُ رُفعت ثم رُبطت بالتسليم'); assert.equal(r[21].h.length, 2, 'جولتا تسليم');
    /* 6) الاعتماد ⇒ «اعتمدها …» */
    const ap = await post(W, dm.ck, '/api/tasks/review', { k: DAY, id, ekey: ME.eid, decision: 'approve' }); assert.equal(ap.status, 200, JSON.stringify(ap.j));
    /* KIVO_265 · «ملفي»: المعتمَدةُ تخرج من «الحالية» كلِّها (الأهم الآن · بقية مهامك · بانتظار الاعتماد) — وتبقى في «سجل مهامك» بقرارها وإثباتها (7) */
    await P.MT.load(true); t = V(P);
    assert.notEqual(t.tkFTitle, 'TEST_ONLY P2 رحلة ملفي'); assert.notEqual(t.tkFState, 'done', 'لا منجزةَ في «الأهم الآن»');
    assert.ok(![...(t.tkRest || []), ...(t.tkRv || [])].some((q) => q.title === 'TEST_ONLY P2 رحلة ملفي'), 'ولا في صفوف «الحالية»'); assert.equal(t.tkRvOn, false);
    assert.equal(srvRow(W, id)[3], 'done'); assert.equal(srvRow(W, id)[21].imgs.length, 1, 'الإثباتُ باقٍ في الخادم');
    /* 7) سجلُّ المهمة: من «الأهم الآن» ومن «سجل مهامك» (ويعود إليه) */
    R = refOf(P, id); P.c.tkTlOpen(R.day, R.i); await until(() => P.c.state.tkTl && P.c.state.tkTl.st !== 'loading'); t = V(P);
    assert.equal(t.pfPanelTkTl, true);
    const tl = t.tkTlRows.map((q) => q.txt).join(' | ');
    for (const w of ['أُنشئت', 'أُكّد استلامُها', 'قُبلت', 'تعثّرت', 'استُؤنفت', 'وُثّقت', 'سُلّمت للمراجعة', 'أُعيدت للاستكمال', 'اعتُمدت'])
      assert.ok(tl.includes(w), 'السجلُّ يحوي «' + w + '»: ' + tl);
    assert.ok(t.tkTlRows.some((q) => q.by === 'أنت'), 'أفعالي باسم «أنت»');
    assert.ok(t.tkTlRows.some((q) => /أرفق صورة الموقع/.test(q.why)), 'سببُ الإعادة في السجل');
    t.tkTlBack(); assert.equal(P.c.state.pfPanel, '');
    P.c.setState({ pfPanel: 'tklog', tkLogY: E.T.y, tkLogM: E.T.m, tkLogF: 'all' }); t = V(P);
    const lr = (t.tkLogDays || []).flatMap((d) => d.rows).find((q) => q.title === 'TEST_ONLY P2 رحلة ملفي');
    assert.ok(lr, 'المهمةُ في «سجل مهامك»'); assert.equal(lr.rowStyle, 'cursor:pointer');
    assert.match(lr.meta, /اعتمدها/, 'بقرار الاعتماد: ' + lr.meta); assert.equal(lr.thumbOn, true, 'وصورةُ إثباتها مصغّرة'); assert.match(lr.thumb, /^data:image\/png/);
    lr.open(); assert.equal(P.c.state.pfPanel, 'tktl'); await until(() => P.c.state.tkTl && P.c.state.tkTl.st !== 'loading');
    V(P).tkTlBack(); assert.equal(P.c.state.pfPanel, 'tklog', '«رجوع» يعيد إلى السجل');
  });

  test('[' + mode + '] رقعةُ «ملفي» · المرحلة الثانية: سياسةُ «صورة وملاحظة» بخطوات عمل · بلا مراجِع (التسليمُ إنجاز) · بلا اعتذار', async () => {
    const W = await world({ worker: WU.file, mode });
    const me = await W.login(ME.un, ME.pw), dm = await W.login('0000000101', '70101');
    const c = await mkTask(W, dm.ck, 'P2 سياسة', { pol: { m: 'both', n: 1, steps: ['تنظيف الموقع', 'تصوير النتيجة'] }, rv: 'none', dec: 0 });
    assert.equal(c.status, 200, JSON.stringify(c.j)); const id = c.j.rows[0].id;
    const P = page(W, me.ck, patchedLogic()); await P.MT.load(true);
    let R = refOf(P, id); P.c.setState({ tkFocus: R.day + '#' + R.i }); let t = V(P);
    assert.equal(t.tkFDecOn, false, 'سياسةُ المهمة لا تسمح بالاعتذار ⇒ لا زرّ');
    assert.deepEqual([...t.tkFSteps.map((q) => q.t)], ['استلام', 'تنفيذ', 'توثيق', 'منجزة'], 'بلا مراجِع: لا مرحلةَ «مراجعة»');
    P.c.tkAccept(R.day, R.i); await until(() => srvRow(W, id)[11]);
    R = refOf(P, id); P.c.tkFinishOpen(R.day, R.i); t = V(P);
    assert.match(t.tkFinPol, /صورة وملاحظة/); assert.match(t.tkFinPol, /2 خطوات/); assert.match(t.tkFinPol, /تُعدّ منجزةً عند التسليم/);
    assert.equal(t.tkFinStepsOn, true); assert.equal(t.tkFinSteps.length, 2);
    P.c.setState({ tkImgs: [PNG], tkNote: 'TEST_ONLY تم' }); t = V(P);
    assert.equal(t.tkFinDis, true); assert.match(t.tkFinHint, /تنظيف الموقع/, 'خطواتُ العمل ناقصة ⇒ لا تسليم');
    t.tkFinSteps[0].tog(); t = V(P); t.tkFinSteps[1].tog(); t = V(P);
    assert.deepEqual([...t.tkFinSteps.map((q) => q.cls)], ['pf-whychip on', 'pf-whychip on']);
    assert.equal(t.tkFinDis, false); assert.equal(t.tkFinBtn, 'تسليم وإنهاء');
    /* Cloud-only: failure keeps every proof field in the open dialog. A read
       and the retired queue facade cannot submit; the user retries explicitly. */
    P.B.offline = true; const nT = P.toasts.length; t.tkFinGo();
    await until(() => P.toasts.length > nT && !P.c.state.tkBusy);
    assert.ok(P.toasts.slice(nT).some((x) => x[0] === 'toast' && /لم تُرفع|لم يُحفظ/.test(x[1])), 'Explicit failure: ' + JSON.stringify(P.toasts.slice(nT)));
    assert.ok(!P.toasts.slice(nT).some((x) => x[0] === 'ack')); assert.notEqual(srvRow(W, id)[3], 'done');
    assert.equal(P.c.state.pfPanel, 'tkfin'); assert.equal(P.c.state.tkImgs[0], PNG); assert.equal(P.c.state.tkNote, 'TEST_ONLY تم');
    assert.equal(P.MT.queue.state().n, 0); assert.equal(V(P).tkQOn, false);
    P.B.offline = false; await P.MT.queue.flush(); await P.MT.load(true); assert.notEqual(srvRow(W, id)[3], 'done');
    V(P).tkFinGo(); await until(() => srvRow(W, id)[3] === 'done' && !P.c.state.tkBusy);
    const r = srvRow(W, id);
    assert.equal(r[3], 'done'); assert.deepEqual(Object.keys(r[21].st).sort(), ['تصوير النتيجة', 'تنظيف الموقع'].sort()); assert.equal(r[21].imgs.length, 1);
    t = V(P); assert.equal(t.tkQOn, false); assert.equal(P.c.state.pfPanel, '');
    assert.ok(P.toasts.some((x) => x[0] === 'ack' && /أُنجزت المهمة/.test(x[1])), 'Confirmed receipt after explicit retry');
  });
}

/* SR-2.2 (المراجعةُ المستقلة لحزمة 242 — والعيبُ نفسُه هنا): F-3 الانقضاءُ التلقائيّ عند فتح «ملفي» لِما انتهت مهلتُه خلال 48 ساعة وحده — كانت أوّلُ زيارةٍ
   بعد الترقية من بيانات 242 تُسجّل انقضاءَ كلِّ متأخرةٍ قديمة (كتابةٌ للمخزن كاملاً وتنبيهٌ للمسؤول لكلٍّ منها) · F-7 صفحةُ المهام غيرُ المفعّلة لإدارة
   الموظف (أو المطفأةُ للمنصة) لا تُظهر بطاقةَ «مهامك» — والخادمُ لا يعيد شيئاً (me.off) */
for (const mode of ['legacy', 'enforce']) {
  test('[' + mode + '] SR-2.2 · F-3 + F-7 في «ملفي»: الانقضاءُ التلقائيّ للحديث (≤ 48 ساعة) وحده — بلا موجةٍ للمتأخرات القديمة ولا تكرار · وصفحةُ المهام المطفأة لا بطاقةَ لها', async () => {
    const W = await world({ worker: WU.file, mode });
    const me = await W.login(ME.un, ME.pw), OLD = 1760000000778, t0 = Date.now() - 20 * 864e5;
    const S = stored(W.env, KT); S[PDAY].push(row({ id: OLD, title: 'منقضيةٌ قديمة بلا ردّ', eid: ME.eid, s: t0, e: t0 + 3600e3 })); await replaceOperationalFixture(W.env, KT, S);
    await replaceOperationalFixture(W.env, 'bsdept:tst_d1:bassam_tasks_locks_v1', {});   /* الشهرُ الماضي غيرُ معتمدٍ صراحةً (المُثبِّت يعتمده) — كما أغلبُ الأشهر في Production (F-9) */
    const timers = [], calls = [];
    const P = page(W, me.ck, patchedLogic(), { timers, calls }); await P.MT.load(true);
    for (let n = 0; n < 4; n++) { P.c._tkVals({}, E, P.c.state); timers.splice(0).forEach((f) => f()); await new Promise((r) => setTimeout(r, 40)); }
    const ex = calls.filter((c) => c.act === 'expire').map((c) => c.id);
    /* KIVO_265 · البند 10 (074 tkDueRun): الخادمُ يسم الحديثَ منقضياً عند أول قراءةٍ لـ«مهامي» (via due) — فلا يبقى للواجهة فعلُ expire تُرسله؛ وإن أرسلته فللحديث وحده */
    assert.ok(ex.every((id) => id === 1760000000105), 'لا فعلَ انقضاءٍ إلا للحديث: ' + JSON.stringify(ex));
    const rs = rowsOf(stored(W.env, KT), ME.eid);
    assert.ok((rs.find((q) => q.r[13] === 1760000000105).r[20] || {}).exp, 'الحديثُ سُجّل');
    const dueEv = W.env.DB.q("SELECT ctx FROM aud WHERE k = ? AND act = 'expired' AND ename LIKE '%انقضت مهلتها بلا قبول%'", KT).map((q) => JSON.parse(q.ctx || '{}'));
    assert.equal(dueEv.length, 1, 'مرةً واحدة: ' + JSON.stringify(dueEv)); assert.ok(dueEv[0].via === 'due' && dueEv[0].sys === 1 && dueEv[0].day === YESTERDAY, 'وسمه الخادمُ (via due)');
    assert.ok(!(rs.find((q) => q.r[13] === OLD).r[20] || {}).exp, 'القديمُ لم يُمسّ');
    const PR = stored(W.env, 'bassam_perms_v1'); PR.caps.tst_d1 = PR.caps.tst_d1.filter((k) => k !== 'tasks'); putKV(W.env, 'bassam_perms_v1', PR);
    const Q = page(W, me.ck, patchedLogic()); await Q.MT.load(true);
    assert.equal(Q.c._tkVals({}, E, Q.c.state).tkOn, false, 'صفحةُ المهام غيرُ مفعّلةٍ للإدارة ⇒ لا بطاقة');
  });
}
