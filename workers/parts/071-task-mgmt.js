/* ═══ KIVO_264 · KIVO-Tasks (المرحلة الثانية) — مساراتُ المسؤول: الإنشاء · المراجعة · التمديد · إعادةُ الإسناد · الإلغاء · الربط · المجموعة ═══
   كلُّ مسارٍ يبني القيمةَ الجديدة في الخادم ثم يمرّ بالحفظ المركزي applySave نفسِه بهوية الفاعل — فالصلاحيةُ يحكم بها النظامُ القائم
   (canWrite/selfTaskOnly · enfDecide بالتصنيف 006) لا هذا الملف؛ وما هنا قواعدُ سيرِ العمل فوقها (المراجِعُ المسمّى · سببُ الإعادة · حالةُ الصفّ).
   لا مفاتيحَ جديدة: task.create · task.assign · task.edit · task.delete · task.accept · task.reopen · task.view (TO_BE §8).
   والتنبيهُ يكتبه الخادم بعد نجاح الفعل (RC-10) — لا متصفحُ المسؤول.
     POST /api/tasks/create    {k,t,desc?,prio?,s,e,asg[]|shift{name},grpL?,wt?,pol?,rv?,dec?,win?,needs?,rec?,force?}  إنشاءٌ وإسنادٌ بعد فحص الأهلية (§4)
                                 KIVO_265 · البند 12: shift {name} بدل asg — الورديةُ كيانٌ: مكلَّفوها يومَها من الجدول الشهري وتقرير اليوم (072 tkShiftAsg) بسقف 500 صفّ · والمتخطَّون في skipped
     POST /api/tasks/review    {k,id,ekey,decision:approve|return,why?}   اعتمادُ التسليم أو إعادتُه لاستكمال الإثبات (بسببٍ إلزامي)
     POST /api/tasks/extend    {k,id,ekey,e,why?}                          تمديدُ المهلة (ق6: لا قبولَ بعد انقضائها إلا بتمديد)
     POST /api/tasks/reassign  {k,id,from,to,why,e?,force?}                نسخةٌ جديدة للمكلَّف الجديد · القديمةُ «أُعيد إسنادها» بسجلّها وإثباتها
     POST /api/tasks/cancel    {k,id,ekey?,why}                            إلغاءٌ منطقيّ — لا حذفَ للصفّ ولا لصوره
     POST /api/tasks/relink    {k,id,from,to}                              ربطٌ يدويٌّ لصفٍّ «غير مرتبط» (اسمٌ/رقمٌ قديم) بسجلّ موظف — ق4: يدويٌّ وحده
     POST /api/tasks/settings  {k,id|grp,ekey?,pol?,rv?,dec?,win?}         KIVO_265 · H-1: إعداداتُ المهمة (سياسةُ الإثبات · المراجِع · الاعتذار · نافذةُ التنفيذ win) في العمود 23
     POST /api/tasks/reopen    {k,id,ekey?,why?}                           KIVO_265 · H-1: إعادةُ فتح منجزة (وقرارُ المراجعة «أُعيدت» إن كان لها تسليم)
     GET  /api/tasks/group?id=<r17>                                        ملخّصُ المهمة الجماعية الفرديُّ والجماعي (task.view)
     GET  /api/tasks/linkage[?ym=]                                         الصفوفُ «غير المرتبطة» (اسم · مجهول · رقمُ هويةٍ مكرّر) والمرتبطةُ بالهوية وقتَ القراءة */
function tkRoutePath(p) { return p === '/api/me/tasks' || p.slice(0, 14) === '/api/me/tasks/' || p.slice(0, 11) === '/api/tasks/'; }
function tkDeptOf(A, given) {
  var d = String(given || A.u.deptId || '');
  if (!d) return { err: json({ ok: 0, err: 'dept', msg: 'حدّد الإدارة' }, 400) };
  if (A.u.role !== 'super' && !deptInScope(A, d)) return { err: json({ ok: 0, err: 'forbidden' }, 403) };
  return { d: d };
}
function tkNo(st, err, msg, x) { var o = { ok: 0, err: err }; if (msg) o.msg = msg; if (x) for (var q in x) o[q] = x[q]; return { err: json(o, st) }; }
function tkStrOk(v, n, req) { return v == null ? !req : typeof v === 'string' && v.length <= n && (!req || v.trim().length > 0); }
function tkIdOk(v) { return (typeof v === 'number' && isFinite(v)) || (typeof v === 'string' && v.length > 0 && v.length <= 40); }
function tkWhyOf(b) { return String(b.why || '').trim().slice(0, METK_WHY_MAX); }
/* يعيد x جديداً (نسخة) مع دفعِ عنصرٍ إلى قائمةٍ محدودة */
function tkXPush(x, f, v, cap) { var a = Array.isArray(x[f]) ? x[f].slice() : []; a.push(v); x[f] = a.slice(-(cap || TK_HIST_MAX)); return x; }
function tkRowCols(r1) { while (r1.length <= TK_X) r1.push(null); return r1; }
/* ── سياسةُ الإثبات والمراجِع من جسم الطلب ── */
function tkPolIn(p) {
  if (p == null) return { pol: { m: 'any' } };
  if (!isObj(p) || !TK_POL_M[p.m]) return { bad: 'pol' };
  var o = { m: p.m };
  if (p.m === 'img' || p.m === 'both') { if (!(typeof p.n === 'number' && p.n >= 1 && p.n <= 4)) return { bad: 'pol.n' }; o.n = Math.floor(p.n); }
  if (p.steps != null) {
    if (!Array.isArray(p.steps) || p.steps.length > TK_STEPS_MAX) return { bad: 'pol.steps' };
    var st = [], i; for (i = 0; i < p.steps.length; i++) { var s = p.steps[i]; if (typeof s !== 'string' || !s.trim() || s.length > TK_STEP_LEN) return { bad: 'pol.steps' }; if (st.indexOf(s.trim()) === -1) st.push(s.trim()); }
    if (st.length) o.steps = st;
  }
  return { pol: o };
}
/* المراجِعُ يعتمد بحفظٍ باسمه هو (لا استعارةَ صلاحية): الإعادةُ تكتب x (task.edit) والاعتمادُ يُنهي (task.finish) — فيُفحص عند الإنشاء
   لا عند أوّل اعتمادٍ يرفضه الخادم بعد أن ينتظر الموظف */
function tkCanReview(Ar, d) { return !!(Ar && Ar.u) && (Ar.u.role === 'super' || (tkHeld(Ar, d, 'task.edit') && tkHeld(Ar, d, 'task.finish'))); }
async function tkRvIn(env, A, d, v) {
  if (v == null || v === 'creator') {                                              /* ق3: الافتراضيّ منشئُ المهمة */
    if (!tkCanReview(A, d)) return { bad: 'rv', msg: 'لا تملك صلاحيةَ اعتماد التسليم في هذه الإدارة — اختر مراجِعاً يملكها أو «بلا مراجعة»' };
    return { rv: tkWho(A) };
  }
  if (v === 'none') return { rv: null };
  if (!isObj(v) || !tkStrOk(v.u, 80, true)) return { bad: 'rv' };
  var users = (await usersList(env)) || [], u = users.filter(function (x) { return x && x.id === v.u; })[0];
  if (!u || u.dis || (u.role !== 'super' && u.role !== 'gm' && String(u.deptId || '') !== d)) return { bad: 'rv', msg: 'المراجِعُ ليس حساباً قائماً في الإدارة' };
  if (!tkCanReview(await actorOf(env, u.id), d)) return { bad: 'rv', msg: 'المراجِعُ المختار لا يملك صلاحيةَ اعتماد المهام (التعديل والإنهاء) في الإدارة' };
  return { rv: { u: String(u.id), e: String(u.ekey || ''), n: String(u.name || u.un || '').slice(0, 120) } };
}
function tkNeedsIn(v) {
  if (v == null) return { needs: [] };
  if (!Array.isArray(v) || v.length > 8) return { bad: 'needs' };
  for (var i = 0; i < v.length; i++) if (typeof v[i] !== 'string' || !KIVO_REGISTRY.byKey[v[i]]) return { bad: 'needs', at: String(v[i]).slice(0, 60) };
  return { needs: v.filter(function (k, n) { return v.indexOf(k) === n; }) };
}
/* ── POST /api/tasks/create ── */
async function tkCreate(env, request, A, b) {
  var command = await tkCommandContext(env, A, b, 'tasks.create', (b.shift || (Array.isArray(b.asg) && b.asg.length)) ? ['task.create', 'task.assign'] : ['task.create']);
  if (command.err) return command.err;
  if (command.receipt) return json(tkCommandReply(command, command.receipt));
  env = command.env; A = command.A; var d = command.d, K = command.key;
  var asg = Array.isArray(b.asg) ? b.asg : null, SH = b.shift != null ? b.shift : null, shName = '';
  if (!METK_DAY_RX.test(String(b.k || ''))) return tkNo(400, 'bad-body', '', { at: 'k' }).err;
  if (!tkStrOk(b.t, 300, true)) return tkNo(400, 'bad-body', 'اكتب عنوان المهمة', { at: 't' }).err;
  if (!tkStrOk(b.desc, 4000)) return tkNo(400, 'bad-body', '', { at: 'desc' }).err;
  if (b.prio != null && !TK_PRIO[b.prio]) return tkNo(400, 'bad-body', '', { at: 'prio' }).err;
  if (!(typeof b.s === 'number' && typeof b.e === 'number' && isFinite(b.s) && isFinite(b.e) && b.e > b.s && b.e - b.s <= 14 * 864e5)) return tkNo(400, 'bad-body', 'نهايةُ المهمة يجب أن تكون بعد بدايتها (≤ 14 يوماً)', { at: 's' }).err;
  /* يومُ الصفّ = اليومُ الهجريّ لبدايتها (± يومٌ لحدود منتصف الليل والوردية الليلية) */
  var kOk = [b.s - 864e5, b.s, b.s + 864e5].some(function (t) { var h = tkHij(t); return h && h.k === String(b.k).replace(/-0(\d)/g, '-$1'); });
  if (!kOk) return tkNo(400, 'bad-body', 'يومُ المهمة لا يطابق وقتَ بدايتها', { at: 'k' }).err;
  /* KIVO_265 · البند 12: shift {name} بدل asg (الورديةُ كيانٌ — لا سقفَ 50) · وكلاهما معاً التباسٌ يُرفض */
  if (SH !== null) {
    if (!isObj(SH) || !tkStrOk(SH.name, 80, true)) return tkNo(400, 'bad-body', 'حدّد اسمَ الوردية', { at: 'shift' }).err;
    if (asg && asg.length) return tkNo(400, 'bad-body', 'الإسنادُ للوردية كاملةً أو لقائمة مكلَّفين — لا كليهما', { at: 'asg' }).err;
    shName = String(SH.name).trim(); asg = [];
  } else if (!asg || asg.length > 50 || !asg.every(function (x) { return typeof x === 'string' && x && x.length <= 80; })) return tkNo(400, 'bad-body', '', { at: 'asg' }).err;
  if (!tkStrOk(b.grpL, 120) || !tkStrOk(b.wt, 80)) return tkNo(400, 'bad-body', '', { at: 'grpL' }).err;
  if (b.dec != null && b.dec !== 0 && b.dec !== 1) return tkNo(400, 'bad-body', '', { at: 'dec' }).err;
  var P = tkPolIn(b.pol); if (P.bad) return tkNo(400, 'bad-body', '', { at: P.bad }).err;
  var WI = b.win === undefined ? { win: null } : tkWinIn(b.win); if (WI.bad) return tkNo(400, 'bad-body', 'نافذةُ التنفيذ: الدقائقُ قبل الموعد 0–240 والساعاتُ بعد المهلة 0–24', { at: WI.bad }).err;   /* KIVO_265 · نافذةُ التنفيذ */
  var NE = tkNeedsIn(b.needs); if (NE.bad) return tkNo(400, 'bad-body', 'صلاحيةٌ غير معروفة في سجلّ الصلاحيات', { at: NE.bad }).err;
  var RC = typeof tkRecIn === 'function' ? tkRecIn(b.rec, b.k) : { rec: null }; if (RC.bad) return tkNo(400, 'bad-body', RC.msg || '', { at: RC.bad }).err;
  asg = asg.filter(function (x, n) { return asg.indexOf(x) === n; });
  /* KIVO_265 · srvrec: سلسلةٌ بلا مكلَّف لا تولِّد شيئاً أبداً (نسخةٌ لكل مكلَّف) — تُرفض بدل أن تُقبل صامتة */
  if (RC.rec && !asg.length && !SH) return tkNo(400, 'rec-asg', 'المهمةُ المتكررة تحتاج مكلَّفاً واحداً على الأقل — تُولَّد نسخةٌ لكل مكلَّف', { at: 'rec' }).err;   /* S10: مفاتيحُ 400 المعقودة (ok · err · at) */
  if (!tkHeld(A, d, 'task.create') || ((asg.length || SH) && !tkHeld(A, d, 'task.assign'))) return tkNo(403, 'denied', 'إنشاءُ المهام وإسنادُها للمديرين والمخوَّلين').err;
  if (await tkLocked(env, d, tkYm(b.k))) return tkNo(409, 'locked', 'شهرُ المهمة معتمدٌ ومقفل').err;
  if (await tkDayShut(env, d, b.k)) return tkNo(409, 'locked', 'اليومُ مُغلق — افتحه من صفحة المهام أولاً').err;
  var RV = await tkRvIn(env, A, d, b.rv); if (RV.bad) return tkNo(400, 'bad-body', RV.msg || '', { at: RV.bad }).err;
  if (RV.rv && RV.rv.e && asg.indexOf(RV.rv.e) !== -1) return tkNo(400, 'bad-body', 'المراجِعُ لا يكون المكلَّفَ نفسَه', { at: 'rv' }).err;
  var emps = tkEmps(await opResourceGet(env, 'bsdept:' + d + ':bassam_employees_v1')), byE = nmap(), EL = [], skipped = [], i;
  if (SH) {
    /* KIVO_265 · البند 12: مكلَّفو الوردية يومَها بسياق الأهلية (072 tkShiftAsg) — بلا حسابٍ نشط (hard) أو بلا معرّفٍ فريد أو المراجِعُ نفسُه ⇒ يُتخطّى بسببه
       (لا 409 كالقائمة: الورديةُ كيانٌ والقائمةُ تُطهَّر هنا) · وما بعد سقف 500 يُقطع ويُبلَّغ · ثم «غير متاح» بقاعدة القائمة نفسِها (409 elig إلا بـforce) */
    var SA = await tkShiftAsg(env, A, d, shName, b.k, b.s, b.e, NE.needs); emps = SA.C.emps;
    if (!SA.n) return tkNo(400, 'shift', 'لا موظفَ في وردية «' + shName + '» يومَ المهمة — لا في الجدول الشهري لشهر ' + tkYm(b.k) + ' ولا في تقرير اليوم', { at: 'shift' }).err;
    SA.items.forEach(function (q) {
      var skip = function (why, code) { skipped.push({ ekey: q.ekey, name: q.name, why: why, code: code }); };
      if (q.hard || q.code === 'unknown_emp') return skip(q.why, q.code);
      if (RV.rv && RV.rv.e && RV.rv.e === q.ekey) return skip('المراجِعُ لا يكون المكلَّفَ نفسَه', 'reviewer');
      if (asg.length >= TK_SHIFT_MAX) return skip('تجاوزَ سقفَ ' + TK_SHIFT_MAX + ' مكلَّفاً للمهمة الواحدة', 'cap');
      asg.push(q.ekey); byE[q.ekey] = tkEmpByEid(emps, q.ekey); EL.push(q);
    });
    if (!asg.length) return tkNo(409, 'acct', 'لا مكلَّفَ في وردية «' + shName + '» يمكن إسنادُه — ' + (skipped[0] ? skipped[0].why : ''), { items: SA.items, skipped: skipped }).err;
  } else {
    for (i = 0; i < asg.length; i++) { var em = tkEmpByEid(emps, asg[i]); if (!em) return tkNo(400, 'asg', tkEidShared(emps, asg[i]) ? TK_EID_DUP : 'موظفٌ غير معروف بمعرّفه الثابت في سجل الإدارة — الإسنادُ بالمعرّف وحده', { at: asg[i] }).err; byE[asg[i]] = em; }
    /* الأهليةُ وقتَ التنفيذ (§4): «غير متاح» يُكشف للمسؤول ولا يُنشأ إلا بتأكيده (force) — و«بانتظار التحقق» تحذيرٌ لا منع */
    EL = asg.length && typeof tkEligEval === 'function' ? await tkEligEval(env, A, d, asg, b.s, b.e, NE.needs) : [];
    /* KIVO_265 · قرارُ المالك 15:13 (البند 4): بلا حسابِ مستخدمٍ نشط ⇒ لا إسنادَ — قاطعٌ قبل «غير متاح» فلا يتجاوزه force */
    var noAc = EL.filter(function (q) { return q.hard; });
    if (noAc.length) return tkNo(409, 'acct', noAc.length === 1 ? '«' + (noAc[0].name || noAc[0].ekey) + '»: ' + noAc[0].why : noAc.length + ' من المكلَّفين بلا حسابِ مستخدمٍ نشط — لا تُسند إليهم مهمةٌ إلكترونية', { items: EL }).err;
  }
  var hard = EL.filter(function (q) { return q.result === 'غير متاح'; });
  if (hard.length && b.force !== true) return tkNo(409, 'elig', 'بعضُ المكلَّفين غيرُ متاحين في موعد التنفيذ', SH ? { items: EL, skipped: skipped } : { items: EL }).err;
  var created = [], now = Date.now();
  var R = await tkSave(env, request, A, K, function (S) {
    var used = tkIdsUsed(S), base = now, rows = [], aud = [], recId = RC.rec ? 'r' + now.toString(36) + Math.floor(Math.random() * 1e6).toString(36) : '';
    var grp = asg.length > 1 ? 'g' + now + Math.floor(1e3 * Math.random()) : null, grpL = asg.length > 1 ? (String(b.grpL || '').trim() || (SH ? shName + ' كاملة' : asg.length + ' موظفين')) : null;   /* البند 12: وسمُ الوردية */
    var dur = Math.round((b.e - b.s) / 6e4) || null, who = tkWho(A), kN = String(b.k).replace(/-0(\d)/g, '-$1');
    var mk = function (ek) {
      var em = ek ? byE[ek] : null, el = ek ? EL.filter(function (q) { return q.ekey === ek; })[0] : null;
      var x = { v: 2, by: who, pol: P.pol, rv: RV.rv, dec: b.dec === 0 ? 0 : 1 };
      if (WI.win) x.win = WI.win;
      if (NE.needs.length) x.needs = NE.needs;
      if (el) x.elig = { res: el.result, code: el.code, at: now };
      /* srvrec: مفتاحُ النسخة بيومٍ بلا أصفار (كما يحسبه tkRecurRun من tkHij) — يومٌ مُرسَلٌ «1447-04-05» كان مفتاحاً لا يطابقه التوليد فتُولَّد نسخةُ يوم البدء مرتين */
      if (RC.rec) { x.rec = Object.assign({}, RC.rec, { id: recId, ver: 1, from: kN, paused: 0, asg: asg.slice() }); if (ek) x.idem = 'r:' + recId + ':' + kN + ':' + ek; }
      var r = [String(b.t).trim(), String(b.desc || '').trim(), b.prio || 'normal', 'pending', 'normal', 'مضافة', null, em ? [String(em.name || '؟').charAt(0)] : [], em ? String(em.name || '') : '',
        who.n, dur, null, null, tkNewId(used, base), ek || null, b.s, b.e, grp, grpL, ek ? null : (String(b.wt || '').trim() || null), null, null, null, x];
      r[TK_STAMP] = tkEntId(r);
      return r;
    };
    if (asg.length) asg.forEach(function (ek) { rows.push(mk(ek)); }); else rows.push(mk(null));
    /* KIVO_265 · H-1/L-5: سلسلةُ التكرار تُعرف في سجل الخادم بمعرّفها ومفتاحِ نسختها (rec · idem) — منه يتحقّق التكرارُ من صاحبها (073) ولا يُعيد نسخةً حُذفت */
    rows.forEach(function (r) { var xr = tkX(r) || {}, cx = RC.rec ? { day: b.k, via: 'srv', rec: recId, idem: xr.idem || undefined } : { day: b.k, via: 'srv' }; if (SH) cx.shift = shName; aud.push(tkAud(K, r, 'created', cx, null, { asg: r[8] || '', s: r[15], e: r[16], pol: tkPolTxt(tkPolOf(r)), rv: RV.rv ? RV.rv.n : '', rec: RC.rec ? RC.rec.t : '', win: tkWinTxt(tkWinOf(r)) })); });
    var S2 = Object.assign({}, S); S2[b.k] = (Array.isArray(S[b.k]) ? S[b.k] : []).concat(rows);
    created = rows;
    return { S2: S2, aud: aud, result: { rows: rows.map(function (r) { return { k: b.k, id: r[13], ekey: r[14] }; }), elig: EL, skipped: skipped } };
  }, null, command);
  if (R.err) return R.err;
  if (!R.receipt.duplicate) await tkNotify(env, request, A, d, created.filter(function (r) { return r[14]; }).map(function (r) { return { type: 'task_new', own: [String(r[14])], vars: { 'المهمة': r[0], 'الوقت': tkClock(r[16]) } }; }));
  if (!R.receipt.duplicate && RC.rec && typeof tkGateReset === 'function') await tkGateReset(env, 'rec', d);   /* الفحصُ العميق · R8: سلسلةٌ جديدة ⇒ القراءةُ التالية في «ملفي» تولّد نسخَها (074) */
  return json(tkCommandReply(command, R.receipt));
}
/* صفٌّ بعينه للمسؤول: هويتُه (13) ومكلَّفُه (14) في يومه */
function tkPick(S, k, id, ekey) {
  var L = Array.isArray(S[k]) ? S[k] : null; if (!L) return null;
  if (ekey == null) {                                                    /* بلا مكلَّف: صفٌّ واحدٌ بهذه الهوية وإلا فالطلبُ ملتبس (مجموعةٌ قديمةٌ تتشارك 13) */
    var n = 0; for (var q = 0; q < L.length; q++) if (Array.isArray(L[q]) && L[q][13] != null && String(L[q][13]) === String(id)) n++;
    if (n > 1) return null;
  }
  var idx = tkFind(L, id, ekey == null ? null : ekey);
  if (idx < 0) return null;
  return { L: L, idx: idx, r0: L[idx] };
}
function tkPut(S, k, L, idx, r1, extra) { var S2 = Object.assign({}, S), L2 = L.slice(); L2[idx] = r1; if (extra) L2.splice(idx + 1, 0, extra); S2[k] = L2; return S2; }
/* ── POST /api/tasks/review ── */
async function tkReview(env, request, A, b) {
  var D0 = tkDeptOf(A, b.dept); if (D0.err) return D0.err; var d = D0.d, K = tkK(d);
  if (!METK_DAY_RX.test(String(b.k || '')) || !tkIdOk(b.id) || !tkStrOk(b.ekey, 80, true)) return tkNo(400, 'bad-body', '', { at: 'k' }).err;
  if (b.decision !== 'approve' && b.decision !== 'return') return tkNo(400, 'bad-body', '', { at: 'decision' }).err;
  if (!tkStrOk(b.why, METK_WHY_MAX)) return tkNo(400, 'bad-body', '', { at: 'why' }).err;
  var why = tkWhyOf(b); if (b.decision === 'return' && !why) return tkNo(400, 'bad-body', 'اذكر ما ينقص الإثبات', { at: 'why' }).err;
  if (!canRead(A, K)) return tkNo(403, 'forbidden').err;
  if (await tkLocked(env, d, tkYm(b.k))) return tkNo(409, 'locked', 'شهرُ المهمة معتمدٌ ومقفل').err;
  var out = null;
  var R = await tkSave(env, request, A, K, function (S) {
    var P0 = tkPick(S, b.k, b.id, b.ekey); if (!P0) return tkNo(404, 'not-found');
    var now = Date.now(), r0 = P0.r0, S0 = tkState(r0, now);
    if (S0.rev !== 'pending') return tkNo(409, 'state', 'لا تسليمَ بانتظار المراجعة في هذه المهمة', { rev: S0.rev });
    var rv = S0.rv, mine = rv && ((rv.u && rv.u === A.u.id) || (rv.e && A.u.ekey && rv.e === A.u.ekey));
    if (!(A.u.role === 'super' || isMgrOf(A, d) || mine)) return tkNo(403, 'not-reviewer', 'مراجعةُ هذه المهمة للمسؤول المسمّى: ' + String((rv && rv.n) || '—'));
    var r1 = tkRowCols(tkPad(r0)), x = Object.assign({}, tkX(r0) || {}), dec = { st: b.decision === 'approve' ? 'approved' : 'returned', at: now, by: tkWhoN(tkWho(A)), sub: S0.sub };
    if (why) dec.why = why;
    x.rev = dec; tkXPush(x, 'revh', dec); r1[TK_X] = x;
    if (b.decision === 'approve') r1[3] = 'done';
    out = { r0: r0, r1: r1, act: dec.st };
    return { S2: tkPut(S, b.k, P0.L, P0.idx, r1), aud: [tkAud(K, r0, dec.st, { day: b.k, via: 'srv' }, { rev: 'pending' }, { rev: dec.st, why: why || undefined })] };
  });
  if (R.err) return R.err;
  var t = String(out.r1[0] || 'مهمة');
  await tkNotify(env, request, A, d, [{ type: 'task_chg', own: [String(b.ekey)], vars: out.act === 'approved' ? { 'الفعل': 'اعتُمد إنجاز', 'المهمة': t, 'التفصيل': 'بواسطة ' + (A.u.name || 'المسؤول') } : { 'الفعل': 'أُعيدت لاستكمال', 'المهمة': t, 'التفصيل': why } }]);
  return json({ ok: 1, rev: R.rev, st: tkState(out.r1, Date.now()) });
}
/* ── POST /api/tasks/extend (ق6) ── */
async function tkExtend(env, request, A, b) {
  var D0 = tkDeptOf(A, b.dept); if (D0.err) return D0.err; var d = D0.d, K = tkK(d);
  if (!METK_DAY_RX.test(String(b.k || '')) || !tkIdOk(b.id) || !(b.ekey == null || tkStrOk(b.ekey, 80))) return tkNo(400, 'bad-body', '', { at: 'k' }).err;
  if (!(typeof b.e === 'number' && isFinite(b.e))) return tkNo(400, 'bad-body', '', { at: 'e' }).err;
  if (!tkStrOk(b.why, METK_WHY_MAX)) return tkNo(400, 'bad-body', '', { at: 'why' }).err;
  if (!tkHeld(A, d, 'task.edit')) return tkNo(403, 'denied', 'تمديدُ المهلة يحتاج صلاحية تعديل المهام').err;
  if (await tkLocked(env, d, tkYm(b.k))) return tkNo(409, 'locked', 'شهرُ المهمة معتمدٌ ومقفل').err;
  var out = null;
  var R = await tkSave(env, request, A, K, function (S) {
    var P0 = tkPick(S, b.k, b.id, b.ekey); if (!P0) return tkNo(404, 'not-found');
    var now = Date.now(), r0 = P0.r0, S0 = tkState(r0, now);
    if (S0.closed) return tkNo(409, 'state', 'المهمة مغلقة', { asg: S0.asg });
    if (b.e < now + 5 * 6e4 || (r0[15] && b.e <= r0[15]) || b.e - Math.max(now, r0[15] || 0) > 30 * 864e5) return tkNo(400, 'bad-body', 'المهلةُ الجديدة يجب أن تكون في المستقبل وبعد بداية المهمة (≤ 30 يوماً)', { at: 'e' });
    var r1 = tkRowCols(tkPad(r0)), x = Object.assign({}, tkX(r0) || {}), r20 = tkObj(r0[20]);
    tkXPush(x, 'ext', { at: now, by: tkWhoN(tkWho(A)), from: r0[16] || null, to: b.e, why: tkWhyOf(b) }); r1[TK_X] = x; r1[16] = b.e;
    if (r20 && r20.exp) { var c = Object.assign({}, r20); delete c.exp; r1[20] = Object.keys(c).length ? c : null; }   /* انقضاءٌ سابق يُرفع فيُقبل من جديد */
    out = { r0: r0, r1: r1 };
    return { S2: tkPut(S, b.k, P0.L, P0.idx, r1), aud: [tkAud(K, r0, 'extended', { day: b.k, via: 'srv' }, { e: r0[16] || null }, { e: b.e, why: tkWhyOf(b) || undefined })] };
  });
  if (R.err) return R.err;
  if (out.r1[14]) await tkNotify(env, request, A, d, [{ type: 'task_chg', own: [String(out.r1[14])], vars: { 'الفعل': 'مُدّدت مهلة', 'المهمة': String(out.r1[0] || 'مهمة'), 'التفصيل': 'حتى ' + tkClock(b.e) + (tkHij(b.e) ? ' · ' + tkHij(b.e).k.split('-').reverse().join('/') : '') } }]);
  return json({ ok: 1, rev: R.rev, e: b.e });
}
/* ── POST /api/tasks/reassign — نسخةٌ جديدة بهويةٍ فريدة (13) للمكلَّف الجديد، والقديمةُ تبقى بسجلّها وإثباتها موسومةً «أُعيد إسنادها» (RC-13) ── */
async function tkReassign(env, request, A, b) {
  var D0 = tkDeptOf(A, b.dept); if (D0.err) return D0.err; var d = D0.d, K = tkK(d);
  if (!METK_DAY_RX.test(String(b.k || '')) || !tkIdOk(b.id) || !tkStrOk(b.from, 80, true) || !tkStrOk(b.to, 80, true)) return tkNo(400, 'bad-body', '', { at: 'k' }).err;
  if (!tkStrOk(b.why, METK_WHY_MAX)) return tkNo(400, 'bad-body', '', { at: 'why' }).err;
  if (b.e != null && !(typeof b.e === 'number' && isFinite(b.e))) return tkNo(400, 'bad-body', '', { at: 'e' }).err;
  if (String(b.from) === String(b.to)) return tkNo(400, 'bad-body', 'المكلَّفُ الجديد هو نفسُه', { at: 'to' }).err;
  if (!tkHeld(A, d, 'task.assign')) return tkNo(403, 'denied', 'إعادةُ الإسناد للمديرين والمخوَّلين').err;
  if (await tkLocked(env, d, tkYm(b.k))) return tkNo(409, 'locked', 'شهرُ المهمة معتمدٌ ومقفل').err;
  var emps = tkEmps(await opResourceGet(env, 'bsdept:' + d + ':bassam_employees_v1')), em = tkEmpByEid(emps, b.to);
  if (!em) return tkNo(400, 'asg', tkEidShared(emps, b.to) ? TK_EID_DUP : 'موظفٌ غير معروف بمعرّفه الثابت في سجل الإدارة', { at: 'to' }).err;
  var S00 = parseJson(await opResourceGet(env, K), {}), P00 = isObj(S00) ? tkPick(S00, b.k, b.id, b.from) : null; if (!P00) return tkNo(404, 'not-found').err;
  /* KIVO_265 · المراجعةُ الموحّدة (R-7): المراجِعُ المسمّى لا يكون المكلَّفَ — كالإنشاء (:86) والإعدادات — وإلا سلّم ثم اعتمد تسليمَه بنفسه (ق3) */
  var RV_TO = function (r) { var x = tkX(r) || {}; return isObj(x.rv) && x.rv.e != null && String(x.rv.e) === String(b.to); };
  if (RV_TO(P00.r0)) return tkNo(400, 'bad-body', 'المراجِعُ لا يكون المكلَّفَ نفسَه — غيّر المراجِعَ من إعدادات المهمة أولاً', { at: 'to' }).err;
  var s0 = P00.r0[15] || Date.now(), e0 = b.e || P00.r0[16] || (s0 + 36e5);
  var EL = typeof tkEligEval === 'function' ? await tkEligEval(env, A, d, [String(b.to)], s0, e0, (tkX(P00.r0) || {}).needs || []) : [];
  if (EL.length && EL[0].hard) return tkNo(409, 'acct', '«' + (EL[0].name || String(b.to)) + '»: ' + EL[0].why, { items: EL }).err;   /* KIVO_265 · البند 4: لا يتجاوزه force */
  if (EL.length && EL[0].result === 'غير متاح' && b.force !== true) return tkNo(409, 'elig', 'المكلَّفُ الجديد غيرُ متاحٍ في موعد التنفيذ', { items: EL }).err;
  var out = null;
  var R = await tkSave(env, request, A, K, function (S) {
    var P0 = tkPick(S, b.k, b.id, b.from); if (!P0) return tkNo(404, 'not-found');
    var now = Date.now(), r0 = P0.r0, S0 = tkState(r0, now);
    if (r0[3] === 'done' || S0.asg === 'cancelled' || S0.asg === 'reassigned') return tkNo(409, 'state', 'لا تُعاد مهمةٌ منجزةٌ أو ملغاةٌ أو أُعيد إسنادُها', { asg: S0.asg });
    if (RV_TO(r0)) return tkNo(400, 'bad-body', 'المراجِعُ لا يكون المكلَّفَ نفسَه — غيّر المراجِعَ من إعدادات المهمة أولاً', { at: 'to' });   /* R-7 على القيمة الحالية */
    if (b.e != null && (b.e < now + 5 * 6e4 || (r0[15] && b.e <= r0[15]))) return tkNo(400, 'bad-body', 'المهلةُ الجديدة يجب أن تكون في المستقبل', { at: 'e' });
    var L = P0.L; for (var q = 0; q < L.length; q++) if (Array.isArray(L[q]) && r0[17] && L[q][17] === r0[17] && String(L[q][14]) === String(b.to) && (tkX(L[q]) || {}).asg !== 'reassigned' && (tkX(L[q]) || {}).asg !== 'cancelled') return tkNo(409, 'dup', 'المكلَّفُ الجديد مسنَدةٌ إليه هذه المهمةُ الجماعيةُ أصلاً');
    var used = tkIdsUsed(S), who = tkWho(A), x0 = tkX(r0) || {}, why = tkWhyOf(b);
    var r1 = tkRowCols(tkPad(r0)), x1 = Object.assign({}, x0, { asg: 'reassigned', re: { at: now, by: tkWhoN(who), why: why, to: { e: String(b.to), n: String(em.name || '') } } }); r1[TK_X] = x1;
    var x2 = { v: 2, by: x0.by || who, pol: x0.pol || { m: 'any' }, rv: Object.prototype.hasOwnProperty.call(x0, 'rv') ? x0.rv : null, dec: x0.dec === 0 ? 0 : 1, from: { id: r0[13], e: String(r0[14] == null ? '' : r0[14]), at: now } };
    if (x0.needs) x2.needs = x0.needs; if (isObj(x0.win)) x2.win = x0.win; if (EL.length) x2.elig = { res: EL[0].result, code: EL[0].code, at: now };   /* KIVO_265: نافذةُ التنفيذ تنتقل مع المهمة */
    if (x0.rec) { x2.rec = x0.rec; x2.det = 1; }
    var r2 = [r0[0], r0[1], r0[2], 'pending', r0[4] || 'normal', r0[5] || 'مضافة', null, [String(em.name || '؟').charAt(0)], String(em.name || ''), r0[9], r0[10], null, null,
      tkNewId(used, now), String(b.to), r0[15] || null, b.e || r0[16] || null, r0[17] || null, r0[18] || null, r0[19] || null, null, null, null, x2];
    r2[TK_STAMP] = tkEntId(r2);
    out = { r0: r0, r1: r1, r2: r2 };
    return { S2: tkPut(S, b.k, P0.L, P0.idx, r1, r2), aud: [tkAud(K, r0, 'reassigned', { day: b.k, via: 'srv' }, { asg: r0[8] || String(r0[14] || '') }, { to: String(em.name || ''), why: why || undefined }),
      tkAud(K, r2, 'created', { day: b.k, via: 'srv', from: String(r0[13]) }, null, { asg: r2[8], s: r2[15], e: r2[16] })] };
  });
  if (R.err) return R.err;
  var t = String(out.r2[0] || 'مهمة'), N = [{ type: 'task_new', own: [String(b.to)], vars: { 'المهمة': t, 'الوقت': out.r2[16] ? tkClock(out.r2[16]) : '—' } }];
  if (out.r0[3] !== 'declined') N.push({ type: 'task_chg', own: [String(b.from)], vars: { 'الفعل': 'أُعيد إسناد', 'المهمة': t, 'التفصيل': 'لم تعد مسندةً إليك' + (tkWhyOf(b) ? ' — ' + tkWhyOf(b) : '') } });
  await tkNotify(env, request, A, d, N);
  return json({ ok: 1, rev: R.rev, row: { k: b.k, id: out.r2[13], ekey: String(b.to) }, elig: EL });
}
/* ── POST /api/tasks/cancel — منطقيّ: يبقى الصفُّ وصورُه وسجلُّه ── */
async function tkCancel(env, request, A, b) {
  var D0 = tkDeptOf(A, b.dept); if (D0.err) return D0.err; var d = D0.d, K = tkK(d);
  if (!METK_DAY_RX.test(String(b.k || '')) || !tkIdOk(b.id) || !(b.ekey == null || tkStrOk(b.ekey, 80))) return tkNo(400, 'bad-body', '', { at: 'k' }).err;
  if (!tkStrOk(b.why, METK_WHY_MAX, true)) return tkNo(400, 'bad-body', 'اذكر سبب الإلغاء', { at: 'why' }).err;
  if (!(tkHeld(A, d, 'task.delete') || tkHeld(A, d, 'task.edit'))) return tkNo(403, 'denied', 'الإلغاءُ للمديرين والمخوَّلين').err;
  if (await tkLocked(env, d, tkYm(b.k))) return tkNo(409, 'locked', 'شهرُ المهمة معتمدٌ ومقفل').err;
  var out = null;
  var R = await tkSave(env, request, A, K, function (S) {
    var P0 = tkPick(S, b.k, b.id, b.ekey == null ? null : b.ekey); if (!P0) return tkNo(404, 'not-found');
    var now = Date.now(), r0 = P0.r0, S0 = tkState(r0, now);
    if (r0[3] === 'done' || S0.asg === 'cancelled' || S0.asg === 'reassigned') return tkNo(409, 'state', 'لا تُلغى مهمةٌ منجزةٌ أو ملغاةٌ أو أُعيد إسنادُها', { asg: S0.asg });
    var r1 = tkRowCols(tkPad(r0)), x = Object.assign({}, tkX(r0) || {}, { asg: 'cancelled', can: { at: now, by: tkWhoN(tkWho(A)), why: tkWhyOf(b) } }); r1[TK_X] = x;
    out = { r0: r0, r1: r1 };
    return { S2: tkPut(S, b.k, P0.L, P0.idx, r1), aud: [tkAud(K, r0, 'cancelled', { day: b.k, via: 'srv' }, { asg: S0.asg, exe: S0.exe }, { asg: 'cancelled', why: tkWhyOf(b) })] };
  });
  if (R.err) return R.err;
  if (out.r0[14] && out.r0[3] !== 'declined') await tkNotify(env, request, A, d, [{ type: 'task_chg', own: [String(out.r0[14])], vars: { 'الفعل': 'أُلغيت', 'المهمة': String(out.r0[0] || 'مهمة'), 'التفصيل': tkWhyOf(b) } }]);
  return json({ ok: 1, rev: R.rev });
}
/* ── POST /api/tasks/relink — ق4: ربطٌ يدويٌّ لصفٍّ غير مرتبط (اسمٌ أو رمزٌ لا يطابق معرّفاً) بسجلّ موظف — بقرار المسؤول وحده، لا تلقائياً ── */
async function tkRelink(env, request, A, b) {
  var D0 = tkDeptOf(A, b.dept); if (D0.err) return D0.err; var d = D0.d, K = tkK(d);
  if (!METK_DAY_RX.test(String(b.k || '')) || !tkIdOk(b.id) || !tkStrOk(b.from, 160, true) || !tkStrOk(b.to, 80, true)) return tkNo(400, 'bad-body', '', { at: 'k' }).err;
  if (!tkHeld(A, d, 'task.assign')) return tkNo(403, 'denied', 'ربطُ الإسناد للمديرين والمخوَّلين').err;
  if (await tkLocked(env, d, tkYm(b.k))) return tkNo(409, 'locked', 'شهرُ المهمة معتمدٌ ومقفل').err;
  var emps = tkEmps(await opResourceGet(env, 'bsdept:' + d + ':bassam_employees_v1')), em = tkEmpByEid(emps, b.to);
  if (!em) return tkNo(400, 'asg', tkEidShared(emps, b.to) ? TK_EID_DUP : 'موظفٌ غير معروف بمعرّفه الثابت', { at: 'to' }).err;
  /* KIVO_265 · المراجعةُ الموحّدة (R-6 — منخفض): الربطُ تصحيحُ هويةٍ لا إسنادٌ لغير صاحب الصفّ — كان يقبل صفّاً «مرتبطاً برقم الهوية» وصفّاً منجزاً
     أو ملغى وموظفاً بلا حساب، فينقل عملاً منجزاً وإثباتَه إلى غير صاحبه (P0) ويربط مهمةً مفتوحة بمن لن يراها:
     · المرتبطُ برقم هويةٍ فريد ⇒ إلى صاحب الرقم وحده (معرّفِه الثابت) · وما فيه نشاطٌ أو أُغلق ⇒ إلى صاحب رمزه وحده (رقمُ هويته · اسمُه الفريد في السجل)
     · والمفتوحُ بلا نشاط إسنادٌ لمن لم يكن يراه ⇒ قاعدةُ الحساب النشط (قرارُ المالك 15:13 · البند 4) — 409 acct بسببها */
  var AC9 = tkAcctOf(parseJson(await kvGet(env, 'kv', K_USERS), []), emps, d, em);
  var out = null;
  var R = await tkSave(env, request, A, K, function (S) {
    var P0 = tkPick(S, b.k, b.id, b.from); if (!P0) return tkNo(404, 'not-found');
    var r0 = P0.r0, lk = tkLink(emps, r0[14]);
    if (lk.by === 'eid' || lk.by === 'none') return tkNo(409, 'linked', 'الصفُّ مرتبطٌ بمعرّفٍ ثابت أصلاً — استعمل إعادةَ الإسناد');
    var xr = tkX(r0) || {};                                                          /* إعادةُ المراجعة (N-4): المراجِعُ لا يكون المكلَّفَ — كإعادة الإسناد (R-7) */
    if (isObj(xr.rv) && xr.rv.e != null && String(xr.rv.e) === String(b.to)) return tkNo(400, 'bad-body', 'المراجِعُ لا يكون المكلَّفَ نفسَه — غيّر المراجِعَ من إعدادات المهمة أولاً', { at: 'to' });
    var own = lk.by === 'nid' ? lk.emp : lk.by === 'name' ? lk.cand : null;
    if (lk.by === 'nid' && own !== em) return tkNo(409, 'linked', 'الصفُّ مرتبطٌ برقم هويةِ «' + String(own.name || '') + '» في السجل — يُربط بمعرّفه الثابت وحده؛ ولغيره استعمل إعادةَ الإسناد');
    if (tkRowActive(r0) && own !== em) return tkNo(409, 'linked', 'في الصفّ نشاطُ موظفٍ أو أُغلق — لا يُربط إلا بصاحب رمزه في السجل (فإنجازُه وإثباتُه له)');
    if (!tkRowActive(r0) && AC9.st !== 'active') return tkNo(409, 'acct', '«' + String(em.name || b.to) + '»: ' + TK_ACCT_WHY[AC9.st], { acct: AC9.st });
    var now = Date.now(), r1 = tkRowCols(tkPad(r0)), x = Object.assign({}, tkX(r0) || {});
    tkXPush(x, 'relink', { at: now, by: tkWhoN(tkWho(A)), from: String(r0[14]).slice(0, 160), to: String(b.to) }); r1[TK_X] = x;
    if (!(typeof r1[TK_STAMP] === 'string' && r1[TK_STAMP])) r1[TK_STAMP] = tkEntId(r0);          /* هويةُ الكيان تبقى هي فيلتقي سجلُّه قبل الربط وبعده */
    r1[14] = String(b.to); r1[7] = [String(em.name || '؟').charAt(0)]; r1[8] = String(em.name || '');
    out = { r1: r1 };
    return { S2: tkPut(S, b.k, P0.L, P0.idx, r1), aud: [tkAud(K, r1, 'relinked', { day: b.k, via: 'srv' }, { by: lk.by }, { to: String(em.name || '') })] };
  });
  if (R.err) return R.err;
  return json({ ok: 1, rev: R.rev, row: { k: b.k, id: out.r1[13], ekey: String(b.to) } });
}
/* ── POST /api/tasks/settings {k, id, ekey?, grp?, pol?, rv?, dec?} — KIVO_265 · H-1: إعداداتُ المهمة في العمود 23 (سياسةُ الإثبات ق2 · المراجِع ق3 ·
   الاعتذار) من الخادم وحده — كانت صفحةُ المهام تكتبها في x بحفظٍ خامّ عند التعديل (_tkXEdit). grp: صفوفُ المهمة الجماعية في يومها كلُّها ── */
async function tkSettingsPrepare(env, A, b, d, K, S) {
  if (!METK_DAY_RX.test(String(b.k || '')) || !(b.grp != null ? tkStrOk(b.grp, 60, true) : tkIdOk(b.id)) || !(b.ekey == null || tkStrOk(b.ekey, 80))) return tkNo(400, 'bad-body', '', { at: 'k' }).err;
  if (b.pol === undefined && b.rv === undefined && b.dec === undefined && b.win === undefined) return tkNo(400, 'bad-body', 'لا إعداداتَ للتعديل', { at: 'pol' }).err;
  var WI = b.win === undefined ? null : tkWinIn(b.win); if (WI && WI.bad) return tkNo(400, 'bad-body', 'نافذةُ التنفيذ: الدقائقُ قبل الموعد 0–240 والساعاتُ بعد المهلة 0–24', { at: WI.bad }).err;   /* KIVO_265 · نافذةُ التنفيذ (null = الافتراضي) */
  if (b.dec != null && b.dec !== 0 && b.dec !== 1) return tkNo(400, 'bad-body', '', { at: 'dec' }).err;
  var P = b.pol === undefined ? null : tkPolIn(b.pol); if (P && P.bad) return tkNo(400, 'bad-body', '', { at: P.bad }).err;
  if (!tkHeld(A, d, 'task.edit')) return tkNo(403, 'denied', 'تعديلُ إعدادات المهمة يحتاج صلاحية تعديل المهام').err;
  if (await tkLocked(env, d, tkYm(b.k))) return tkNo(409, 'locked', 'شهرُ المهمة معتمدٌ ومقفل').err;
  /* المراجِع: «المنشئ» = منشئُ المهمة المسجَّل (x.by) إن ملك الاعتماد — وإلا أنت (كما في الإنشاء) · «بلا» · أو حسابٌ مسمّى يملك الاعتماد */
  var S00 = S, L00 = isObj(S00) && Array.isArray(S00[b.k]) ? S00[b.k] : [];
  var pick = function (L) {
    if (b.grp != null) { var o = []; for (var q = 0; q < L.length; q++) if (Array.isArray(L[q]) && String(L[q][17] || '') === String(b.grp)) o.push(q); return o; }
    var P0 = tkPick({ x: L }, 'x', b.id, b.ekey == null ? null : b.ekey); return P0 ? [P0.idx] : [];
  };
  var ix0 = pick(L00); if (!ix0.length) return tkNo(404, 'not-found').err;
  var by0 = (tkX(L00[ix0[0]]) || {}).by, RV = null;
  if (b.rv !== undefined) {
    if ((b.rv == null || b.rv === 'creator') && isObj(by0) && by0.u && by0.u !== A.u.id) {
      var Ab = await actorOf(env, String(by0.u));
      RV = tkCanReview(Ab, d) ? { rv: { u: String(by0.u), e: String(by0.e || ''), n: String(by0.n || '').slice(0, 120) } } : { bad: 'rv', msg: 'منشئُ المهمة لا يملك اعتمادَ المهام الآن — اختر مراجِعاً آخر أو «بلا مراجعة»' };
    } else RV = await tkRvIn(env, A, d, b.rv);
    if (RV.bad) return tkNo(400, 'bad-body', RV.msg || '', { at: RV.bad }).err;
  }
  var out = { n: 0 };
  var R = (function (S) {
    var L = Array.isArray(S[b.k]) ? S[b.k] : [], ix = pick(L), now = Date.now(), aud = [], L2 = L.slice(); out = { n: 0 };
    if (!ix.length) return tkNo(404, 'not-found');
    for (var q = 0; q < ix.length; q++) {
      var r0 = L[ix[q]], S0 = tkState(r0, now);
      if (S0.asg === 'cancelled' || S0.asg === 'reassigned') continue;               /* المغلقةُ بالإلغاء أو إعادةِ الإسناد تبقى بسجلّها */
      if (RV && RV.rv && RV.rv.e && String(r0[14] == null ? '' : r0[14]) === RV.rv.e) return tkNo(400, 'bad-body', 'المراجِعُ لا يكون المكلَّفَ نفسَه', { at: 'rv' });
      var x0 = tkX(r0) || {}, x = Object.assign({ v: 2 }, x0), r1 = tkRowCols(tkPad(r0));
      if (!x.by) x.by = tkWho(A);                                                     /* صفٌّ قديمٌ بلا x: صاحبُ الإعدادات منشئُها */
      var bef = { pol: tkPolTxt(tkPolOf(r0)), rv: isObj(x0.rv) ? String(x0.rv.n || '') : '', dec: x0.dec === 0 ? 0 : 1, win: tkWinTxt(tkWinOf(r0)) };
      if (P) x.pol = P.pol;
      if (WI) { if (WI.win) x.win = WI.win; else delete x.win; }
      if (RV) x.rv = RV.rv;
      if (b.dec != null) x.dec = b.dec;
      r1[TK_X] = x; if (!(typeof r1[TK_STAMP] === 'string' && r1[TK_STAMP])) r1[TK_STAMP] = tkEntId(r0);
      L2[ix[q]] = r1; out.n++;
      aud.push(tkAud(K, r1, 'edited', { day: b.k, via: 'srv', what: 'settings' }, bef, { pol: tkPolTxt(tkPolOf(r1)), rv: isObj(x.rv) ? String(x.rv.n || '') : '', dec: x.dec === 0 ? 0 : 1, win: tkWinTxt(tkWinOf(r1)) }));
    }
    if (!out.n) return tkNo(409, 'state', 'المهمة ملغاةٌ أو أُعيد إسنادُها', {});
    var S2 = Object.assign({}, S); S2[b.k] = L2;
    return { S2: S2, aud: aud };
  })(S);
  if (!R.err) R.result = { n: out.n };
  return R;
}
async function tkSettings(env, request, A, b) {
  return await tkEditSettingsCommand(env, request, A, b);
}
/* Editing, settings and an optional recurrence change are planned against one
   fresh source and committed once. The existing raw policy judges the edit
   before the server-owned settings/recurrence planners add their columns. */
async function tkEditPrepare(env, A, b, d, K, S, rev) {
  var edit = b.edit;
  if (!isObj(edit) || Object.keys(edit).some(function (key) { return ['k', 't', 'desc', 'prio', 's', 'e', 'ekey', 'wt'].indexOf(key) < 0; }) ||
      !METK_DAY_RX.test(String(b.k || '')) || !METK_DAY_RX.test(String(edit.k || '')) ||
      !(b.grp != null ? tkStrOk(b.grp, 60, true) : tkIdOk(b.id)) ||
      !tkStrOk(edit.t, 300, true) || !tkStrOk(edit.desc, 4000) || !(edit.prio === null || typeof edit.prio === 'string') ||
      !Number.isFinite(edit.s) || !Number.isFinite(edit.e) || edit.e <= edit.s ||
      !(edit.ekey == null || tkStrOk(edit.ekey, 80)) || !tkStrOk(edit.wt, 80)) return tkNo(400, 'bad-body', '', { at: 'edit' });
  if (await tkLocked(env, d, tkYm(b.k)) || await tkLocked(env, d, tkYm(edit.k)) ||
      await tkDayShut(env, d, b.k) || await tkDayShut(env, d, edit.k)) return tkNo(409, 'locked');
  var L = Array.isArray(S[b.k]) ? S[b.k] : [], ix = [];
  if (b.grp != null) L.forEach(function (row, index) { if (Array.isArray(row) && String(row[17] || '') === String(b.grp)) ix.push(index); });
  else { var picked = tkPick(S, b.k, b.id, b.ekey == null ? null : b.ekey); if (picked) ix.push(picked.idx); }
  if (!ix.length) return tkNo(404, 'not-found');
  if (b.grp != null && edit.ekey != null) return tkNo(400, 'bad-body', '', { at: 'edit.ekey' });
  var emps = tkEmps(await opResourceGet(env, 'bsdept:' + d + ':bassam_employees_v1')), rows = [];
  for (var q = 0; q < ix.length; q++) {
    var old = L[ix[q]], row = old.slice(), changedAssignee = b.grp == null && String(edit.ekey || '') !== String(old[14] || ''),
      orphan = !String(old[14] || ''), oldManagement = tkX(old), orphanProtected = old[3] === 'done' || old[12] || old[21] || (oldManagement && (oldManagement.asg === 'cancelled' || oldManagement.asg === 'reassigned'));
    if (!TK_PRIO[edit.prio] && edit.prio !== old[2]) return tkNo(400, 'bad-body', '', { at: 'edit.prio' });
    if (changedAssignee && ((!orphan && tkRowActive(old)) || (orphan && orphanProtected))) return tkNo(409, 'state', 'استعمل إعادة الإسناد لمهمة بدأ عليها نشاط أو لها توثيق');
    row[0] = edit.t.trim(); row[1] = String(edit.desc || '').trim(); row[2] = edit.prio;
    row[10] = Math.round((edit.e - edit.s) / 60000) || null; row[15] = edit.s; row[16] = edit.e;
    if (b.grp == null) {
      var token = edit.ekey == null || edit.ekey === '' ? null : String(edit.ekey), employee = token ? tkTokRec(emps, token) : null;
      if (changedAssignee && token && !employee) return tkNo(400, 'asg');
      if (changedAssignee) {
        row[14] = token; row[7] = employee ? [String(employee.name || '').charAt(0)] : []; row[8] = employee ? String(employee.name || '') : '';
        // HEAD9 V1/V5: an unassigned orphan must not lend the former holder's
        // start/ACK/decline state to a new assignee. Proof/history stay intact.
        if (orphan && token) { row[3] = 'pending'; row[6] = null; row[11] = null; row[12] = null; row[20] = null; }
      }
      row[17] = null; row[18] = null; row[19] = token ? null : String(edit.wt || '') || null;
    }
    if (row[3] === 'done' && row[11] && row[12]) row[6] = tkPerfOf(row, row[12]);
    rows.push(row);
  }
  var S2 = Object.assign({}, S); S2[b.k] = L.filter(function (_, index) { return ix.indexOf(index) < 0; });
  if (!S2[b.k].length) delete S2[b.k];
  S2[edit.k] = (Array.isArray(S2[edit.k]) ? S2[edit.k] : []).concat(rows);
  var body = { set: {}, base: {} }; body.set[K] = JSON.stringify(S2); body.base[K] = rev;
  var rawActor = Object.assign({}, A); delete rawActor.__tkSrv; delete rawActor.__tkSelf;
  var permission = await applySave(env, body, rawActor, {}, { quiet: true, __restorePlan: RESTORE_INTERNAL_TOKEN });
  if (!permission.ok) {
    var deniedMap = permission.denied || (permission.out && permission.out.denied), denied = deniedMap && deniedMap[K];
    return tkNo(denied ? 403 : 409, denied ? 'denied' : 'busy', '', denied ? { why: denied.why, reasonKeys: denied.reasonKeys } : {});
  }
  var written = permission.pend && permission.pend.find(function (entry) { return entry.k === K; });
  if (written) S2 = parseJson(written.v, null);
  if (!isObj(S2)) return tkNo(409, 'state');
  return { S2: S2, aud: rows.map(function (row) { return tkAud(K, row, 'edited', { day: edit.k, via: 'srv' }, null, { t: row[0], s: row[15], e: row[16] }); }),
    result: { n: rows.length }, target: { k: edit.k, id: rows[0][13], ekey: rows[0][14], grp: b.grp } };
}
async function tkEditSettingsCommand(env, request, A, b) {
  var command = await tkCommandContext(env, A, b, 'tasks.settings', ['task.edit']);
  if (command.err) return command.err;
  if (command.receipt) return json(tkCommandReply(command, command.receipt));
  var R = await tkSave(command.env, request, command.A, command.key, async function (S, rev) {
    var plan = { S2: S, aud: [], result: {} }, target = { k: b.k, id: b.id, ekey: b.ekey, grp: b.grp };
    if (b.edit !== undefined) {
      plan = await tkEditPrepare(command.env, command.A, b, command.d, command.key, S, rev);
      if (plan.err) return plan;
      target = plan.target;
    }
    var settings = ['pol', 'rv', 'dec', 'win'].some(function (key) { return b[key] !== undefined; });
    if (!settings && b.edit === undefined && b.recur === undefined) return tkNo(400, 'bad-body', '', { at: 'pol' });
    if (settings) {
      var next = await tkSettingsPrepare(command.env, command.A, Object.assign({}, b, target), command.d, command.key, plan.S2);
      if (next instanceof Response) return { err: next };
      if (next.err) return next;
      plan.S2 = next.S2; plan.aud = plan.aud.concat(next.aud); plan.result.settings = next.result;
      if (!plan.result.n) plan.result.n = next.result.n;
    }
    if (b.recur !== undefined) {
      if (!isObj(b.recur) || Object.keys(b.recur).some(function (key) { return ['op', 'id', 'rec', 'row'].indexOf(key) < 0; })) return tkNo(400, 'bad-body', '', { at: 'recur' });
      var recBody = Object.assign({}, b.recur, { dept: command.d, k: target.k });
      if (recBody.op === 'start') Object.assign(recBody, target);
      var recPlan = await tkRecurPrepare(command.env, command.A, recBody, command.d, command.key, plan.S2);
      if (recPlan instanceof Response) return { err: recPlan };
      if (recPlan.err) return recPlan;
      plan.S2 = recPlan.S2; plan.aud = plan.aud.concat(recPlan.aud); plan.result.recurrence = recPlan.result;
      if (!plan.result.n) plan.result.n = recPlan.result.n;
    }
    return plan;
  }, null, command);
  if (R.err) return R.err;
  if (b.recur && !R.receipt.duplicate && typeof tkGateReset === 'function') await tkGateReset(command.env, 'rec', command.d);
  return json(tkCommandReply(command, R.receipt));
}
/* ── POST /api/tasks/reopen {k, id, ekey?, why?} — KIVO_265 · H-1: إعادةُ فتح مهمةٍ منجزة (منجزة ⇒ جارية) من الخادم، ومعها قرارُ المراجعة «أُعيدت»
   في العمود 23 حين كان لها تسليمٌ ومراجِع — كانت صفحةُ المهام تكتبه بحفظٍ خامّ (_tkReopenX). الحفظُ المركزي يحكم الفعل (task.reopen في الإنفاذ) ── */
async function tkReopen(env, request, A, b) {
  var D0 = tkDeptOf(A, b.dept); if (D0.err) return D0.err; var d = D0.d, K = tkK(d);
  if (!METK_DAY_RX.test(String(b.k || '')) || !tkIdOk(b.id) || !(b.ekey == null || tkStrOk(b.ekey, 80))) return tkNo(400, 'bad-body', '', { at: 'k' }).err;
  if (!tkStrOk(b.why, METK_WHY_MAX)) return tkNo(400, 'bad-body', '', { at: 'why' }).err;
  if (!(tkHeld(A, d, 'task.reopen') || tkHeld(A, d, 'task.edit'))) return tkNo(403, 'denied', 'إعادةُ فتح المهمة للمديرين والمخوَّلين').err;
  if (await tkLocked(env, d, tkYm(b.k))) return tkNo(409, 'locked', 'شهرُ المهمة معتمدٌ ومقفل').err;
  var out = null;
  var R = await tkSave(env, request, A, K, function (S) {
    var P0 = tkPick(S, b.k, b.id, b.ekey == null ? null : b.ekey); if (!P0) return tkNo(404, 'not-found');
    var now = Date.now(), r0 = P0.r0, S0 = tkState(r0, now);
    if (r0[3] !== 'done' || S0.asg === 'cancelled' || S0.asg === 'reassigned') return tkNo(409, 'state', 'تُعاد فتحُ المهمة المنجزة وحدها', { asg: S0.asg });
    /* k265-fix (بوابة 265 · k259journeys بالإنفاذ): سببُ العميل وحده (cw) يُمرَّر للحفظ المركزي — فتطلب سياسةُ الإنفاذ سببَ task.reopen كما في 263/264
       (بلا سبب ⇒ رفضُ «يتطلب سبباً» · والواجهةُ تعرض نافذةَ السبب في 280 ثم تعيد الطلبَ به) — والنصُّ الافتراضيُّ للعرض وحده (التنبيه · قرارُ المراجعة · التدقيق).
       كان الافتراضيُّ يُرسل سبباً فيُستوفى الشرطُ بنصٍّ جاهز. القديمُ كما هو (لا سببَ مطلوب) */
    var r1 = tkRowCols(tkPad(r0)), cw = tkWhyOf(b), why = cw || 'أعاد المسؤولُ فتحَ المهمة', r21 = tkObj(r0[21]) || {}, sub = typeof r21.sub === 'number' ? r21.sub : 0;
    r1[3] = 'in_progress'; r1[12] = null; r1[6] = null;
    var x0 = tkX(r0);
    if (x0 && sub && tkRv(r0)) { var x = Object.assign({}, x0), dec = { st: 'returned', at: now, by: tkWhoN(tkWho(A)), why: why, sub: sub }; x.rev = dec; tkXPush(x, 'revh', dec); r1[TK_X] = x; }
    if (!(typeof r1[TK_STAMP] === 'string' && r1[TK_STAMP])) r1[TK_STAMP] = tkEntId(r0);
    out = { r1: r1, why: why };
    return { S2: tkPut(S, b.k, P0.L, P0.idx, r1), aud: [tkAud(K, r1, 'reopened', { day: b.k, via: 'srv' }, { st: 'done' }, { st: 'in_progress', why: why })], why: cw };
  });
  if (R.err) return R.err;
  if (out.r1[14]) await tkNotify(env, request, A, d, [{ type: 'task_chg', own: [String(out.r1[14])], vars: { 'الفعل': 'أُعيد فتح', 'المهمة': String(out.r1[0] || 'مهمة'), 'التفصيل': out.why } }]);
  return json({ ok: 1, rev: R.rev, st: tkState(out.r1, Date.now()) });
}
/* ── GET /api/tasks/group?id=<r17>[&k=] — المهمةُ الجماعية: أصلٌ واحد ونسخةٌ لكل مكلَّف، وإنجازُ واحدٍ لا يغلق غيره ── */
async function tkGroup(env, A, url) {
  var D0 = tkDeptOf(A, url.searchParams.get('dept')); if (D0.err) return D0.err; var d = D0.d, K = tkK(d);
  var gid = String(url.searchParams.get('id') || ''), k = String(url.searchParams.get('k') || '');
  if (!gid || gid.length > 60 || (k && !METK_DAY_RX.test(k))) return tkNo(400, 'bad-query').err;
  if (!canRead(A, K)) return tkNo(403, 'forbidden').err;
  var S = parseJson(await opResourceGet(env, K), {}), now = Date.now(), mem = [], dk;
  var sm = { n: 0, ack: 0, running: 0, stalled: 0, review: 0, returned: 0, done: 0, declined: 0, cancelled: 0, reassigned: 0, pending: 0, late: 0 };
  if (isObj(S)) for (dk in S) { if (!METK_DAY_RX.test(dk) || !Array.isArray(S[dk]) || (k && dk !== k)) continue;
    S[dk].forEach(function (r, i) {
      if (!Array.isArray(r) || String(r[17] || '') !== gid) return;
      var st = tkState(r, now), ph = tkPhase(r, now);
      if (st.asg !== 'reassigned' && st.asg !== 'cancelled') sm.n++;
      if (ph === 'cancelled') sm.cancelled++; else if (ph === 'reassigned') sm.reassigned++; else if (ph === 'declined') sm.declined++; else if (ph === 'done') sm.done++;
      else if (ph === 'review') sm.review++; else if (ph === 'returned') sm.returned++; else if (ph === 'stalled') sm.stalled++; else if (ph === 'running') sm.running++; else sm.pending++;
      if (st.asg === 'acknowledged' && !r[11]) sm.ack++;
      if (st.tim === 'late' || st.tim === 'overdue_ack' || st.tim === 'overdue_exec') sm.late++;
      mem.push({ k: dk, i: i, id: r[13], ekey: r[14] == null ? null : String(r[14]), name: String(r[8] || ''), ph: ph, asg: st.asg, exe: st.exe, rev: st.rev, tim: st.tim, acc: r[11] || null, fin: r[12] || null,
        imgs: isObj(r[21]) && Array.isArray(r[21].imgs) ? r[21].imgs.length : 0 });
    }); }
  if (!mem.length) return tkNo(404, 'not-found').err;
  sm.pct = sm.n ? Math.round(100 * sm.done / sm.n) : 0;
  return json({ ok: 1, id: gid, title: String(mem.length ? (S[mem[0].k][mem[0].i][0] || '') : ''), label: String(mem.length ? (S[mem[0].k][mem[0].i][18] || '') : ''), summary: sm, members: mem });
}
/* ── GET /api/tasks/linkage[?ym=] — ق4: «غير مرتبطة» للمسؤول (لا إعادةَ كتابةٍ تلقائية) ── */
async function tkLinkage(env, A, url) {
  var D0 = tkDeptOf(A, url.searchParams.get('dept')); if (D0.err) return D0.err; var d = D0.d, K = tkK(d);
  var ym = String(url.searchParams.get('ym') || ''); if (ym && !METK_YM_RX.test(ym)) return tkNo(400, 'bad-ym').err;
  if (!canRead(A, K)) return tkNo(403, 'forbidden').err;
  var KE0 = 'bsdept:' + d + ':bassam_employees_v1', S = parseJson(await opResourceGet(env, K), {}), H0 = {}; H0[KE0] = await opResourceGet(env, KE0);
  /* PRIVACY (019u (1b)/(4)): a row linked by nid shows the token the reader got in the register (eid · 'nx:'), never a nid he may not see */
  var emps = tkEmps(H0[KE0]), PT = privTok(A, d, H0), pt = function (t) { return PT && PT.M[t] !== undefined ? PT.M[t] : t; };
  var cnt = { eid: 0, nid: 0, name: 0, unknown: 0, ambiguous: 0, none: 0 }, rows = [], dk;
  if (isObj(S)) for (dk in S) { if (!METK_DAY_RX.test(dk) || !Array.isArray(S[dk]) || (ym && tkYm(dk) !== ym.replace(/-0(\d)$/, '-$1'))) continue;
    S[dk].forEach(function (r, i) {
      if (!Array.isArray(r)) return;
      var lk = tkLink(emps, r[14]); cnt[lk.by]++;
      if (lk.by === 'eid' || lk.by === 'none') return;
      var x = tkX(r) || {};
      rows.push({ k: dk, i: i, id: r[13], t: String(r[0] || '').slice(0, 300), tok: pt(String(r[14])).slice(0, 160), by: lk.by, st: String(r[3] || ''), asg: x.asg || '',
        emp: lk.emp ? { eid: String(lk.emp.eid || ''), name: String(lk.emp.name || '') } : null,
        cand: lk.cand && lk.cand.eid ? { eid: String(lk.cand.eid), name: String(lk.cand.name || '') } : null,
        label: lk.by === 'nid' ? 'مرتبطةٌ برقم الهوية (وقتَ القراءة)' : 'غير مرتبطة' });
    }); }
  return json({ ok: 1, counts: cnt, rows: rows.slice(0, 500), more: rows.length > 500 ? 1 : 0 });
}
/* ── الموزِّع: من meTasksRoutes (062c) لكل /api/tasks/* ── */
async function tasksMgmtRoutes(request, env, path, ss) {
  var POSTS = { '/api/tasks/create': tkCreate, '/api/tasks/review': tkReview, '/api/tasks/extend': tkExtend, '/api/tasks/reassign': tkReassign, '/api/tasks/cancel': tkCancel, '/api/tasks/relink': tkRelink,
    '/api/tasks/settings': tkSettings, '/api/tasks/reopen': tkReopen };   /* KIVO_265 · H-1: الإعداداتُ وإعادةُ الفتح من الخادم (العمود 23) */
  var known = path === '/api/tasks/create' || path === '/api/tasks/review' || path === '/api/tasks/extend' || path === '/api/tasks/reassign' || path === '/api/tasks/cancel' || path === '/api/tasks/relink' ||
    path === '/api/tasks/settings' || path === '/api/tasks/reopen' ||
    path === '/api/tasks/group' || path === '/api/tasks/linkage' || path === '/api/tasks/eligibility' || path === '/api/tasks/recur/run' || path === '/api/tasks/recur';
  if (!known) return null;
  var A = await actorOf(env, ss.uid);
  if (!A) return json({ ok: 0, err: 'session' }, 401);
  tkSrvMark(A);   /* KIVO_265 · H-1: كتاباتُ هذه المسارات وحدها تكتب العمود 23 (018 taskXWhy) — والحفظُ المركزي يحكم صلاحيتَها كما كان */
  var url = new URL(request.url);
  var sxU = sessUidMismatch(env, url, ss, path); if (sxU) return sxU;   /* KIVO_264 · C1 للقراءة: ?uid= = هويةُ التبويب (BOOT.uid) */
  if (path === '/api/tasks/group' || path === '/api/tasks/linkage' || path === '/api/tasks/eligibility') {
    if (request.method !== 'GET') return json({ ok: 0, err: 'method' }, 405);
    var rlG = await rlHit(env, 'sv', A.u.id, RL_SAVE); if (rlG) return tooMany(rlG);       /* قراءاتٌ تجمع مخازنَ عدّة — بسقف الحفظ نفسِه */
    if (path === '/api/tasks/group') return await tkGroup(env, A, url);
    if (path === '/api/tasks/linkage') return await tkLinkage(env, A, url);
    return await tkEligRoute(env, A, url);
  }
  if (request.method !== 'POST') return json({ ok: 0, err: 'method' }, 405);
  var rl = await rlHit(env, 'sv', A.u.id, RL_SAVE); if (rl) return tooMany(rl);
  var B0 = await tkBody(request, path, path === '/api/tasks/create' ? 32768 : 8192); if (B0.err) return B0.err;
  var sxB = tkSessBody(env, B0.b, ss, path); if (sxB) return sxB;   /* KIVO_264 · C1: uid في الجسم = هويةُ التبويب — قبل أيّ قراءةٍ أو كتابة */
  try {
    if (path === '/api/tasks/recur/run') return await tkRecurRoute(env, request, A, url, B0.b);
    if (path === '/api/tasks/recur') return await tkRecurOp(env, request, A, B0.b);
    return await POSTS[path](env, request, A, B0.b);
  } catch (error) {
    if (error && error.rs) return json({ ok: 0, err: error.rs }, error.status || 400);
    throw error;
  }
}
