/* ═══ KIVO_264 · KIVO-Tasks (المرحلة الثانية) — أهليةُ الإسناد وقتَ التنفيذ لا لحظةَ الإنشاء (TO_BE §4) ═══
   المصدرُ المعتمد: الخطةُ التشغيلية ← الجدولُ الشهري (bassam_staffing_v3[Y-M][مفتاح الموظف]: shift · rest[] · perm[] · leaves[] · muk)
   + أوقاتُ الورديات (bassam_shift_options_v1: tStart/tEnd — الليليةُ تعبر منتصف الليل فيومُها يومُ بدئها) + تقريرُ اليوم المسحوب
   (bassam_dreport_v1: غياب ab · إجازة lv · استئذان pm) + مهامُه الأخرى (التعارض) + صلاحياتُه التشغيلية التي تحتاجها المهمة (needs).
   النتيجة لكل (موظف × موعد): «متاح» · «غير متاح» (بالسبب) · «بانتظار التحقق» (لا جدول · لا صفّ · لا وقتَ للوردية · استئذان · تتجاوز الوردية).
   يُسمح بإنشاء مهامٍ مستقبلية لغائبٍ اليوم ما دام متاحاً يومَ التنفيذ — والحكمُ إفصاحٌ للمسؤول: «غير متاح» لا يُنشأ إلا بتأكيده (force).
   «التكليف» (muk) ساعاتُ عملٍ إضافية في الجدول الشهري — يُذكر ولا يُخلط بالمهمة ولا تُنشئه.
   الخصوصية: سببُ «غير متاح» التفصيليّ (راحة · إجازة · غياب) لمن يقرأ الجدولَ الشهري وحده — وإلا فحكمٌ مجرّد.
     GET /api/tasks/eligibility?ekeys=a,b&s=<ms>[&e=<ms>][&needs=plan.edit,…][&dept=]   (task.assign أو task.create في الإدارة) */
var TK_EL_OK = 'متاح', TK_EL_NO = 'غير متاح', TK_EL_WAIT = 'بانتظار التحقق';
async function tkEligCtx(env, A, d) {
  var g = async function (n) { return parseJson(await kvGet(env, 'kv', 'bsdept:' + d + ':' + n), null); };
  var C = { d: d, emps: tkEmps(await kvGet(env, 'kv', 'bsdept:' + d + ':bassam_employees_v1')), staff: await g('bassam_staffing_v3'), locks: await g('bassam_staffing_locks_v1'),
    shifts: await g('bassam_shift_options_v1'), rep: await g('bassam_dreport_v1'), tasks: await g('bassam_tasks_v1'), users: (await usersList(env)) || [] };
  C.detail = A && A.u ? (A.u.role === 'super' || canRead(A, 'bsdept:' + d + ':bassam_staffing_v3')) : false;
  /* KIVO_265 · F-3 (RBAC_AUDIT_265): عناوينُ المهام المتعارضة (conf[].t) لمن يقرأ مخزنَ المهام (task.view) وحده — كان حاملُ task.create/assign بلا task.view يقرؤها */
  C.view = A && A.u ? (A.u.role === 'super' || canRead(A, tkK(d))) : false;
  return C;
}
function tkShiftWin(C, name) {
  var L = Array.isArray(C.shifts) ? C.shifts : [], sd = null;
  for (var i = 0; i < L.length; i++) if (isObj(L[i]) && L[i].name === name) sd = L[i];
  if (!sd || !sd.tStart || !sd.tEnd) return null;
  var p1 = String(sd.tStart).split(':'), p2 = String(sd.tEnd).split(':'), a = (+p1[0]) * 60 + (+p1[1] || 0), b = (+p2[0]) * 60 + (+p2[1] || 0);
  if (!isFinite(a) || !isFinite(b)) return null;
  return { a: a, b: b, over: b <= a, name: name, s: tkHm(a), e: tkHm(b) };
}
/* رموزُ الموظف في الجدول والتقرير والمهام: المعرّفُ الثابت · ورقمُ الهوية والاسمُ (صيغُ 242 القديمة) إن تفرّدا في سجلّ الإدارة وحدهما —
   SR-2.2 · F-1 (المراجعةُ المستقلة): رمزٌ مكرَّرٌ لا يجلب صفَّ جدولِ غيره ولا تقريرَه ولا مهامَه (حكمُ أهليةٍ خاطئ) — [{v, by}] */
/* KIVO_265 · M-2: التفرّدُ في الحقلين معاً (070 tkTokRec — eid ∪ nid): المعرّفُ الثابت ورقمُ الهوية رمزان إن لم يحملهما سجلٌّ آخر في أيٍّ من الحقلين ·
   والاسمُ (المعلَن I-2 · قراءةٌ للحكم وحده) إن تفرّد في الأسماء ولم يكن معرّفاً أو رقمَ هويةٍ لسجلّ */
function tkToks(emp, emps) {
  var o = [], L = Array.isArray(emps) ? emps : [emp];
  if (emp.eid != null && emp.eid !== '' && tkTokRec(L, emp.eid) === emp) o.push({ v: String(emp.eid), by: 'eid' });
  if (emp.nid != null && emp.nid !== '' && tkTokRec(L, emp.nid) === emp) o.push({ v: String(emp.nid), by: 'nid' });
  if (emp.name != null && emp.name !== '' && tkEmpOne(L, 'name', emp.name) && !tkTokN(L, emp.name).n) o.push({ v: String(emp.name), by: 'name' });
  return o;
}
/* صفُّ الموظف في شهر الجدول — المعرّفُ أولاً ثم الصيغُ القديمة (BassamEmp.entryKey) — قراءةٌ للحكم لا إسنادٌ بالاسم */
function tkEntryOf(C, ym, emp) {
  var bk = isObj(C.staff) && isObj(C.staff[ym]) ? C.staff[ym] : null; if (!bk) return { bk: null, e: null };
  var t = tkToks(emp, C.emps); for (var i = 0; i < t.length; i++) if (isObj(bk[t[i].v])) return { bk: bk, e: bk[t[i].v], by: t[i].by };
  return { bk: bk, e: null };
}
function tkRestOn(rest, wd) { return (Array.isArray(rest) ? rest : []).some(function (r) { r = String(r); return r === wd || ('ال' + r) === wd || r === ('ال' + wd); }); }
function tkLeaveOn(leaves, H) {
  if (!Array.isArray(leaves)) return null; var n = H.y * 10000 + H.m * 100 + H.d;
  for (var i = 0; i < leaves.length; i++) { var l = leaves[i]; if (!isObj(l) || !l.fd || !l.fm || !l.td || !l.tm) continue;
    var f = (+(l.fy || H.y)) * 10000 + (+l.fm) * 100 + (+l.fd), t = (+(l.ty || l.fy || H.y)) * 10000 + (+l.tm) * 100 + (+l.td);
    if (n >= f && n <= t) return l; }
  return null;
}
function tkRepMark(C, dk, emp) {
  var rec = isObj(C.rep) && isObj(C.rep[dk]) && isObj(C.rep[dk].shifts) ? C.rep[dk].shifts : null; if (!rec) return null;
  var t = tkToks(emp, C.emps).map(function (x) { return x.v; }), out = null;
  Object.keys(rec).forEach(function (sn) { var s0 = rec[sn]; if (!isObj(s0) || !s0.pulled) return;
    (Array.isArray(s0.roster) ? s0.roster : []).forEach(function (r) { if (isObj(r) && r.ekey && t.indexOf(String(r.ekey)) !== -1) out = { st: String(r.st || 'pr'), sh: sn }; }); });
  return out;
}
function tkEligOne(C, ek, s, e, needsMiss) {
  var emp = tkEmpByEid(C.emps, ek), it = { ekey: String(ek), name: emp ? String(emp.name || '') : '', result: TK_EL_WAIT, code: '', why: '', day: '', shift: null, warn: [], conf: [], perm: 'ok', acct: 0 };
  if (!emp) { it.result = TK_EL_NO; it.code = 'unknown_emp'; it.why = tkEidShared(C.emps, ek) ? TK_EID_DUP : 'ليس في سجل الإدارة بمعرّفه الثابت'; return it; }
  /* KIVO_265 · قرارُ المالك 15:13 (البند 4): بلا حسابِ مستخدمٍ نشط ⇒ «غير متاح» قاطعٌ (hard) لا يتجاوزه التأكيد (force) — والسببُ للمسؤول دائماً
     (حالةُ الحساب ليست تفصيلَ الجدول). كان: تحذيرٌ «لن يرى المهمة في «ملفي»» ويُنشأ — وحسابٌ بغير دور staff لا يُحسب.
     المراجعةُ الموحّدة (R-3): الحسابُ الذي مفتاحُه رقمُ الهوية قاطعٌ بسببه (acct_nid) — يرى المهمة ولا ينفّذها (062c: العمود 14 = مفتاحُ الحساب حرفاً) */
  var AC = tkAcctOf(C.users, C.emps, C.d, emp, C.acIx || (C.acIx = tkAcctIx(C.users, C.emps, C.d))); it.acct = AC.st === 'active' ? 1 : 0; it.acctSt = AC.st;   /* فهرسٌ واحدٌ للسياق (N-3) */
  if (AC.st !== 'active') { it.result = TK_EL_NO; it.code = AC.st === 'disabled' ? 'acct_disabled' : AC.st === 'nid' ? 'acct_nid' : 'no_acct'; it.why = TK_ACCT_WHY[AC.st]; it.hard = 1; return it; }
  var H = tkHij(s); if (!H) { it.code = 'no_date'; it.why = 'تعذّر حسابُ يوم التنفيذ'; return it; }
  var m0 = tkMinOfDay(s), dur = Math.max(1, Math.round((e - s) / 6e4)), E = tkEntryOf(C, H.ym, emp), win = E.e ? tkShiftWin(C, String(E.e.shift || '')) : null, opMs = s;
  /* الورديةُ الليلية: ما بعد منتصف الليل وقبل نهايتها تابعٌ ليوم بدئها */
  if (win && win.over && m0 < win.b) { var Hp = tkHij(s - 864e5); if (Hp) { H = Hp; opMs = s - 864e5; E = tkEntryOf(C, H.ym, emp); win = E.e ? tkShiftWin(C, String(E.e.shift || '')) : null; } }
  it.day = H.k;
  var wd = TK_WD[tkWdOf(opMs)], set = function (res, code, why) { it.result = res; it.code = code; it.why = C.detail || res === TK_EL_OK ? why : (res === TK_EL_NO ? 'غيرُ متاحٍ في موعد التنفيذ' : 'يحتاج تحقّقاً من الجدول'); };
  /* التعارضُ مع مهامه الأخرى (تحذيرٌ لا منع) */
  var T = isObj(C.tasks) ? C.tasks : {}, tk = tkToks(emp, C.emps).map(function (x) { return x.v; }), now = Date.now();
  Object.keys(T).forEach(function (dk) { if (!Array.isArray(T[dk])) return; T[dk].forEach(function (r) {
    if (!Array.isArray(r) || r[14] == null || tk.indexOf(String(r[14])) === -1 || !r[15] || !r[16]) return;
    if (tkState(r, now).closed) return;
    if (r[15] < e && r[16] > s && it.conf.length < 5) { var cf = { k: dk, id: r[13], s: r[15], e: r[16] }; if (C.view) cf.t = String(r[0] || '').slice(0, 120); it.conf.push(cf); }   /* F-3: العنوانُ لقارئ المخزن */
  }); });
  if (it.conf.length) it.warn.push('تتعارض مع ' + it.conf.length + ' من مهامه في الوقت نفسِه');
  if (needsMiss) { it.perm = needsMiss; if (needsMiss !== 'ok') it.warn.push(needsMiss === 'no-account' ? 'لا حسابَ له فلا صلاحيات — يعالَج بالتفويض النظامي' : 'لا يملك صلاحيةً تحتاجها المهمة (' + needsMiss.slice(8) + ') — يعالَج بالتفويض النظامي لا بالإسناد'); }
  if (!E.bk) { set(TK_EL_WAIT, 'no_month', 'لا جدولَ شهريّاً لشهر ' + H.ym); return it; }
  if (!E.e) { set(TK_EL_WAIT, 'no_row', 'لا صفَّ له في الجدول الشهري لشهر ' + H.ym); return it; }
  if (!(isObj(C.locks) && (C.locks[H.ym] === true || C.locks[H.ym] === 1))) it.warn.push('الجدولُ الشهري لـ' + H.ym + ' غيرُ معتمدٍ بعد');
  var rm = tkRepMark(C, H.k, emp);
  if (rm && rm.st === 'ab') { set(TK_EL_NO, 'absent', 'غائبٌ بتقرير اليوم (' + rm.sh + ')'); return it; }
  if (rm && rm.st === 'lv') { set(TK_EL_NO, 'leave', 'في إجازةٍ بتقرير اليوم (' + rm.sh + ')'); return it; }
  if (tkRestOn(E.e.rest, wd)) { set(TK_EL_NO, 'rest', 'يومُ راحته الأسبوعية (' + wd + ')'); return it; }
  var lv = tkLeaveOn(E.e.leaves, H); if (lv) { set(TK_EL_NO, 'leave', 'في إجازة' + (lv.kind ? ' ' + String(lv.kind) : '')); return it; }
  if (rm && rm.st === 'pm') { set(TK_EL_WAIT, 'perm_day', 'مستأذنٌ بتقرير اليوم — تحقّق من وقت الاستئذان'); return it; }
  if (Array.isArray(E.e.perm) && E.e.perm.map(Number).indexOf(H.d) !== -1) { set(TK_EL_WAIT, 'perm_day', 'استئذانٌ مقرَّرٌ في هذا اليوم — تحقّق من وقته'); return it; }
  var shName = String(E.e.shift || '');
  if (!shName) { set(TK_EL_WAIT, 'no_shift', 'بلا ورديةٍ في الجدول الشهري'); return it; }
  if (!win) { set(TK_EL_WAIT, 'no_shift_time', 'ورديةُ «' + shName + '» بلا وقتٍ محدَّد'); return it; }
  it.shift = C.detail ? { name: win.name, s: win.s, e: win.e } : null;
  var a = win.a, b = win.b + (win.over ? 1440 : 0), ms = m0 + (win.over && m0 < win.b ? 1440 : 0);
  if (ms < a || ms > b) { set(TK_EL_NO, 'off_shift', 'خارج وقت ورديته «' + shName + '» (' + win.s + '–' + win.e + ')'); return it; }
  if (ms + dur > b) { set(TK_EL_WAIT, 'beyond_shift', 'تمتدّ بعد نهاية ورديته (' + win.e + ')' + (E.e.muk === true ? ' — مكلَّفٌ بساعاتٍ إضافية (التكليف)' : ' — يحتاج تكليفاً بساعاتٍ إضافية')); return it; }
  set(TK_EL_OK, 'ok', 'ضمن ورديته «' + shName + '» (' + win.s + '–' + win.e + ')');
  return it;
}
/* الصلاحياتُ التشغيلية التي تحتاجها المهمة — بحساب الموظف نفسِه (لا بمنحٍ تلقائي: المهمةُ لا تمنح صلاحية) */
async function tkNeedsMiss(env, C, ek, needs) {
  if (!needs || !needs.length) return 'ok';
  var acct = C.users.filter(function (u) { return u && !u.dis && String(u.deptId || '') === C.d && String(u.ekey || '') === String(ek); })[0];
  if (!acct) return 'no-account';
  var Ae = await actorOf(env, acct.id); if (!Ae) return 'no-account';
  var miss = needs.filter(function (k) { return !tkHeld(Ae, C.d, k); });
  return miss.length ? 'missing:' + miss.join(',') : 'ok';
}
async function tkEligEval(env, A, d, ekeys, s, e, needs) {
  var C = await tkEligCtx(env, A, d), out = [];
  for (var i = 0; i < ekeys.length; i++) out.push(tkEligOne(C, ekeys[i], s, e, await tkNeedsMiss(env, C, ekeys[i], needs || [])));
  return out;
}
/* KIVO_265 · البند 12: الإسنادُ للوردية ككيان — مكلَّفو وردية «name» يومَ المهمة k: صفُّ الموظف في الجدول الشهري لشهرها (shift) ∪ كشفُ تلك الوردية في
   تقرير اليوم المسحوب (محوَّلٌ إليها يومَها) — بسياق الأهلية نفسِه (tkEligCtx) ثم الحكمُ لكل واحدٍ (tkEligOne) كالإسناد بالقائمة. كان المنتقي يرسل
   قائمةَ المعرّفات فتُرفض ورديةٌ فيها أكثرُ من 50 (سقفُ asg) — الورديةُ كيانٌ لا قائمة، وسقفُها 500 صفّ (TK_SHIFT_MAX) يُقطع ما بعده ويُبلَّغ.
   الناتج: items (حكمُ كل مرشَّح · بلا معرّفٍ ثابت ⇒ unknown_emp) — ولا سقفَ 50 لأن الحكمَ يُحسب هنا لا يُرسل */
var TK_SHIFT_MAX = 500;
async function tkShiftAsg(env, A, d, name, k, s, e, needs) {
  var C = await tkEligCtx(env, A, d), ym = tkYm(k), kN = String(k).replace(/-0(\d)/g, '-$1'), seen = nmap(), cand = [], tokIx = nmap(), i;
  var add = function (em) { var id = em.eid == null ? '' : String(em.eid); if (!id) { if (!seen['\u0001' + String(em.name || '')]) { seen['\u0001' + String(em.name || '')] = 1; cand.push({ ek: '', emp: em }); } return; } if (seen[id]) return; seen[id] = 1; cand.push({ ek: id, emp: em }); };
  for (i = 0; i < C.emps.length; i++) { var em0 = C.emps[i]; tkToks(em0, C.emps).forEach(function (t) { tokIx[t.v] = em0; }); }
  for (i = 0; i < C.emps.length; i++) { var E = tkEntryOf(C, ym, C.emps[i]); if (E.e && String(E.e.shift || '').trim() === name) add(C.emps[i]); }
  var rec = isObj(C.rep) && isObj(C.rep[kN]) && isObj(C.rep[kN].shifts) && isObj(C.rep[kN].shifts[name]) ? C.rep[kN].shifts[name] : null;
  if (rec && rec.pulled) (Array.isArray(rec.roster) ? rec.roster : []).forEach(function (r) { if (isObj(r) && r.ekey != null && tokIx[String(r.ekey)]) add(tokIx[String(r.ekey)]); });
  var items = [];
  for (i = 0; i < cand.length; i++) {
    if (!cand[i].ek) { items.push({ ekey: '', name: String(cand[i].emp.name || ''), result: TK_EL_NO, code: 'unknown_emp', why: 'بلا معرّفٍ ثابت في سجل الإدارة — الإسنادُ بالمعرّف وحده', warn: [], conf: [], perm: 'ok', acct: 0 }); continue; }
    items.push(tkEligOne(C, cand[i].ek, s, e, await tkNeedsMiss(env, C, cand[i].ek, needs || [])));
  }
  return { C: C, items: items, n: cand.length };
}
async function tkEligRoute(env, A, url) {
  var D0 = tkDeptOf(A, url.searchParams.get('dept')); if (D0.err) return D0.err; var d = D0.d;
  if (!(tkHeld(A, d, 'task.assign') || tkHeld(A, d, 'task.create'))) return tkNo(403, 'denied', 'فحصُ الأهلية لمن يُسند المهام').err;
  var ek = String(url.searchParams.get('ekeys') || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
  var s = +url.searchParams.get('s'), e = url.searchParams.get('e') != null ? +url.searchParams.get('e') : s + 36e5;
  var nd = String(url.searchParams.get('needs') || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
  if (!ek.length || ek.length > 50 || !ek.every(function (x) { return x.length <= 80; })) return tkNo(400, 'bad-query', '', { at: 'ekeys' }).err;
  if (!isFinite(s) || !s || !isFinite(e) || e <= s || e - s > 14 * 864e5) return tkNo(400, 'bad-query', '', { at: 's' }).err;
  var NE = tkNeedsIn(nd); if (NE.bad) return tkNo(400, 'bad-query', 'صلاحيةٌ غير معروفة في سجلّ الصلاحيات', { at: 'needs' }).err;
  return json({ ok: 1, s: s, e: e, items: await tkEligEval(env, A, d, ek, s, e, NE.needs) });
}
