/* سجلُّ موظفٍ بمعرّفه الثابت الفريد — ما تكتبه مساراتُ الخادم في العمود 14 (IX اختياريّ: فهرسُ tkAcctIx المبنيّ للطلب) */
function tkAcctOf(users, emps, d, emp, IX) {
  if (!emp || emp.eid == null || emp.eid === '') return { st: 'none' };
  var X = IX || tkAcctIx(users, emps, d);
  if (X.rec(String(emp.eid)) !== emp) return { st: 'none' };
  return tkAcctTok(users, emps, d, String(emp.eid), X);
}
/* KIVO_265 · المراجعةُ الموحّدة (R-1): نشاطُ الموظف في الصفّ — مرآةُ _tkHasActivity في صفحة «المهام» (RC-13) — أو صفٌّ أغلقه الخادم (أُلغي · أُعيد إسنادُه) */
function tkRowActive(r) {
  if (!Array.isArray(r)) return false;
  if (r[11] || r[12] || r[20] || r[21] || (r[3] && r[3] !== 'pending')) return true;
  var x = r.length > 23 && isObj(r[23]) ? r[23] : null;
  return !!(x && (x.asg === 'cancelled' || x.asg === 'reassigned'));
}
/* ربطُ صفٍّ بسجلّ موظف (للمدير — ق4: لا إعادةَ كتابةٍ تلقائية): eid ⇒ مرتبطة · nid فريد ⇒ مرتبطةٌ وقتَ القراءة · اسمٌ أو غيرُه ⇒ «غير مرتبطة»
   KIVO_265 · L-2: الاسمُ لا يربط أبداً — ومرشَّحُ الربط اليدوي (cand) يُعطى إن تفرّد الاسمُ في السجل (لا أوّلُ مطابِق)، والواجهةُ تعرضه اقتراحاً لا اختياراً */
function tkLink(emps, tok) {
  if (tok == null || tok === '') return { by: 'none', emp: null };
  var t = String(tok), T = tkTokN(emps, t);
  if (T.n === 1) return T.c.eid != null && String(T.c.eid) === t ? { by: 'eid', emp: T.c } : { by: 'nid', emp: T.c };
  if (T.n > 1) return { by: 'ambiguous', emp: null };
  var nm = 0, cand = null;
  for (var i = 0; i < emps.length; i++) if (emps[i].name && String(emps[i].name) === t) { nm++; if (!cand) cand = emps[i]; }
  if (nm) return { by: 'name', emp: null, cand: nm === 1 ? cand : null };
  return { by: 'unknown', emp: null };
}
/* KIVO_265 · H-1: وسمُ الخادم — الفاعلُ في مسارات المسؤول (071) والتكرار (073) يكتب العمود 23 (018 taskXWhy). يُبنى في الخادم من الجلسة ولا يصل إليه
   مدخلٌ من الطلب (كوسم الذات __tkSelf في 062c) — والحفظُ المركزي يحكم صلاحيتَه كما كان (canWrite · enfDecide) */
function tkSrvMark(A) { if (A) { try { Object.defineProperty(A, '__tkSrv', { value: 1, enumerable: false, configurable: true }); } catch (e) { A.__tkSrv = 1; } } return A; }
/* ── صلاحيةُ مفتاحٍ بعينه للفاعل في إدارة — الإنفاذُ من السجل (enfHeld) · V7 · د5-ح (القفل): وحده ── */
function tkHeld(A, d, key) {
  if (!A || !A.u) return false;
  if (A.u.role === 'super') return true;
  if (!d) return false;
  return enfHeld(A, d, key);
}
/* ── مفاتيحُ المخازن ── */
function tkK(d) { return 'bsdept:' + d + ':bassam_tasks_v1'; }
async function tkRev(env, k) { var r = await env.DB.prepare('SELECT rev FROM revs WHERE k = ?1').bind(k).first(); return (r && r.rev) || 0; }
function tkYm(k) { return String(k).slice(0, 7); }   /* V7 · 53 تقويم: شهرُ يومٍ ISO ('2026-11-24' ⇐ '2026-11') — المفتاحُ مبطَّنٌ دائماً (METK_DAY_RX) */
/* V7 · 53 (قرارا المالك ٧ و٨): قاعدةُ الصفحة نفسُها — الشهرُ الماضي مقفلٌ اعتُمد أو لم يُعتمد ولا يُفتح إلا للاستدراك ({mo:1}).
   الرسالةُ بحسب القارئ: من يملك فتحَ الشهر (task.month.reopen) يُقال له افتحه، وغيرُه يُحال إلى مدير الإدارة */
var TK_PAST_MGR = 'الشهر مقفل — افتحه للاستدراك أولاً', TK_PAST_EMP = 'الشهر مقفل — راجع مدير الإدارة';
function tkPastMsg(A, d) { return tkHeld(A, d, 'task.month.reopen') ? TK_PAST_MGR : TK_PAST_EMP; }
/* V7 · 53 (قرار المالك ٧ — «قاعدةُ الفترة المقفلة نفسُها كبقية الأنظمة»): حكمُ الفترة لكل كتابةٍ على مهمة (المسؤول · الموظف · التكرار) — قاعدةُ الصفحة
   (tasks/client): الشهرُ المعتمد مقفل · الشهرُ الماضي مقفلٌ ما لم يُفتح ({mo:1}) — لكل كتابة (monthLockedT). day = true (الإنشاء — tasksCanAdd):
   اليومُ المُغلق بيده مقفل · واليومُ المنقضي من الشهر الجاري مقفلٌ ما لم يُفتح هو أو شهرُه. day = 'shut' (التعديل — كما كان tkDayShut): المُغلقُ بيده وحده. أفعالُ سير العمل (المراجعة · التمديد ·
   إعادةُ الإسناد · الإلغاء · أفعالُ الموظف) على قفل الشهر وحده كما في الصفحة (_tkP2Menu). يعيد نصَّ الرفض بحسب القارئ أو '' */
var TK_DAY_MGR = 'اليوم مقفل — افتحه للاستدراك أولاً', TK_DAY_EMP = 'اليوم مقفل — راجع مدير الإدارة';
async function tkPeriodMsg(env, A, d, k, day) {
  var p = String(k).split('-'), y = +p[0], m = +p[1], dd = +p[2], ym = calGYm(y, m), dk = calGKey(y, m, dd);   /* V7 · 53 تقويم: أقفالُ YYYY-MM / YYYY-MM-DD */
  var L = parseJson(await opResourceGet(env, 'bsdept:' + d + ':bassam_tasks_locks_v1'), {}); if (!isObj(L)) L = {};
  var mv = L[ym], dv = L[dk], mo = isObj(mv) && !!mv.mo, T = calToday(Date.now());
  if (mv === true || mv === 1) return 'شهرُ المهمة معتمدٌ ومقفل';
  if (day && dv === true) return 'اليومُ مُغلق — افتحه من صفحة المهام أولاً';
  if (!T || !(y > 0 && m > 0)) return '';
  if (12 * y + m < 12 * T.y + T.m) return mo ? '' : tkPastMsg(A, d);
  if (day === true && 12 * y + m === 12 * T.y + T.m && dd > 0 && dd < T.d && !mo && !(isObj(dv) && dv.mo)) return tkHeld(A, d, 'task.month.reopen') ? TK_DAY_MGR : TK_DAY_EMP;
  return '';
}
/* KIVO_265 · قفلُ اليوم: اليومُ المُغلق بيده (true على مفتاح «y-m-d» في مخزن الأقفال) لا تُضاف إليه مهامٌ جديدة — الإنشاءُ يُرفض والتكرارُ يتخطّاه */
/* ── حدثُ تدقيقٍ للمهمة (etype=task · eid = هويةُ الكيان) ── */
function tkAud(K, r, act, ctx, bef, aft) {
  var now = Date.now();
  return { cid: 'tk' + now.toString(36) + '_' + Math.floor(Math.random() * 1e9).toString(36), k: K, etype: 'task', act: act, eid: tkEntId(r),
    ename: String(r[0] || 'مهمة').slice(0, 160), ctx: JSON.stringify(ctx || {}), before: bef == null ? null : JSON.stringify(bef), after: aft == null ? null : JSON.stringify(aft) };
}
/* ── الحفظُ عبر الحفظ المركزي نفسِه — بحارس النسخة (CAS): fn(S) تعيد {S2, aud, out} أو {err:Response} ──
   meta (KIVO_265 · L-3): هويةُ المصدر في التدقيق والأمن — الافتراضيُّ عنوانُ الطلب وجهازُه؛ والتكرارُ (073) يمرّر هويةَ الخادم الثابتة
   فلا يُنسب عنوانُ الموظف الذي فتح «ملفي» وجهازُه إلى كتابةٍ باسم صاحب القالب.
   F-10 (من SR-2.3 · KIVO_242 — بقرار المالك: «ضمّن الإصلاح في خط التطوير المستقبلي حتى لا يعود العطل»): ما سبقه حفظٌ متزامن يُعاد بقراءةٍ جديدة
   حتى TK_TRIES مرة بمهلةٍ بقدر زمن القاعدة (لا «تم» إلا بعد ثبوت الكتابة) · والرفضُ على نسخةٍ تحرّكت (الحكمُ في الحفظ المركزي يسبق فحصَ النسخة —
   صفٌّ أضافه المديرُ بين القراءة والكتابة) يُعاد كذلك ولا يُسجَّل «رفضاً» أمنياً؛ والرفضُ على نسخةٍ لم تتحرّك صريحٌ: حدثٌ أمنيٌّ واحد ويُردّ كما هو.
   opt.srv: مسارُ مهامٍ في الخادم يبني من القيمة الحالية — فلا يمسّه حفظُ أفعال الموظف (tkKeepSelf) المخصّصُ للحفظ الخامّ من الواجهة. */
var TK_TRIES = 8;
function tkPause(n, ms) { return Math.min(1500, Math.max(5, ms || 0) * (0.5 + Math.random()) + 15 * n); }
async function tkSave(env, request, A, K, fn, meta, command) {
  var mq = meta || (request ? reqMeta(request) : {}), last = 0;
  await calLazyEnsure(env, [K], null);   /* V7 · 53 تقويم (REVIEW 45): الوثيقةُ تُحوَّل قبل أخذ نسختها (tkRev) — وإلا رفعها التحويلُ داخل applySave فتعارضَ الأمرُ مع نفسه (409) */
  for (var attempt = 0; attempt < (command ? 1 : TK_TRIES); attempt++) {
    if (attempt) await new Promise(function (r) { setTimeout(r, tkPause(attempt, last)); });
    var t0 = Date.now();
    var rev = await tkRev(env, K), S = parseJson(await opResourceGet(env, K), {}); if (!isObj(S)) S = {};
    var R = await fn(S, rev, attempt);
    if (!R || R.err) return R || { err: json({ ok: 0, err: 'state' }, 409) };
    if (R.noop) return R;
    var B = { set: {}, base: {}, aud: R.aud || [] }; B.set[K] = JSON.stringify(R.S2); B.base[K] = rev;
    if (R.why) { B.why = {}; B.why[K] = String(R.why).slice(0, 300); }               /* KIVO_265: سببُ الفعل للإنفاذ حين يلزمه سجلُّه (task.reopen — §12 audit.reason) */
    if (command) { B.requestId = command.body.requestId; B.epoch = command.body.epoch; }
    var options = { srv: 1, quiet: 1 };
    if (command) {
      var classification = KIVO_GUARDS.classify('bassam_tasks_v1', S, R.S2, {});
      R.result = Object.assign({}, R.result || {}, { commandActions: Array.from(new Set(command.actions.concat(classification ? classification.keys() : []))) });
    }
    if (command) Object.assign(options, { __reference: command.reference, __operationRequestId: command.body.requestId,
      __operationFingerprint: command.fingerprint, __operationResult: R.result || {} });
    var res;
    try { res = await applySave(env, B, A, mq, options); }
    catch (error) {
      var epochChanged = /KIVO_RESTORE_EPOCH/.test(String(error));
      if (!epochChanged && !/KIVO_REV_CONFLICT|KIVO_RESTORE_TARGET/.test(String(error)) && !(error.rs === 'conflict' && error.status === 409)) throw error;
      last = Date.now() - t0;
      // Interactive commands retain their original base/ticket. Existing
      // server/self intents may retry against current data, never across restore.
      if (command) return { err: json({ ok: 0, err: 'conflict' }, 409) };
      if (epochChanged) return { err: json({ ok: 0, err: 'busy', msg: 'تغيّرت نسخة البيانات — راجع المهمة وأعد المحاولة' }, 409) };
      continue;
    }
    last = Date.now() - t0;
    if ((!command || res.ok === 1) && res.revs && Object.prototype.hasOwnProperty.call(res.revs, K) && Number.isSafeInteger(res.revs[K]) && res.revs[K] >= 0) {
      R.rev = res.revs[K]; if (command) R.receipt = res; return R;
    }
    if (res.denied && res.denied[K]) {
      if ((await tkRev(env, K)) !== rev) continue;                                 /* رفضٌ على نسخةٍ تجاوزها حفظٌ متزامن ⇒ قراءةٌ جديدة */
      await secLog(env, { ts: Date.now(), uid: A.u.id, un: String(A.u.un || ''), act: 'denied', target: K, detail: String(res.denied[K].why || ''), ip: mq.ip, city: mq.city, dev: mq.dev });
      return { err: json({ ok: 0, err: 'denied', why: String(res.denied[K].why || ''), reasonKeys: Array.isArray(res.denied[K].reasonKeys) ? res.denied[K].reasonKeys : undefined }, 403) };   /* k265-fix: مفاتيحُ السبب لنافذة 280 (askReason) */
    }
    if (!(res.conflicts && res.conflicts[K])) break;
  }
  return { err: json({ ok: 0, err: 'busy', msg: 'تعذّر الحفظ لتعديلٍ متزامن — أعد المحاولة' }, 409) };
}
/* ── F-10 (من SR-2.3 · KIVO_242): أفعالُ الموظف لا يمحوها حفظٌ خامٌّ لمخزن المهام مبنيٌّ على نسخةٍ لم ترها ──
   يُنادى من applySave (054) للحفظ الخامّ وحده (صفحةُ «المهام»: تعديلٌ · قبولٌ أو إنهاءٌ نيابةً · إعادةُ فتح) — لا للمسار الذاتي (A.__tkSelf) ولا لمسارات
   المهام في الخادم (opt.srv: تبني من القيمة الحالية) ولا للاستعادة والاستيراد. الحالة: المديرُ يحفظ المخزنَ كلَّه من نسخةٍ قديمة فيردّ الخادمُ تعارضاً،
   ودمجُ الواجهة يرجّح نسختَه للصفّ نفسِه ثم يعيد الحفظ ⇒ يضيع ما فعله الموظفُ بينهما وقد قيل له «تم». الآن صفٌّ باقٍ في الحفظة وفي الخادم بالهوية
   نفسِها (اليوم · 13 · 14 — أو 13·14 إن تفرّدا) يأخذ من القيمة الحالية:
     · العمودين 20 و21 كما هما: ملكُ الموظف (المسارُ الذاتي يكتبهما · ومساراتُ الخادم تمدّد وتلغي وتعيد الإسناد) وصفحةُ «المهام» لا تؤلّف فيهما شيئاً —
       تنسخهما مع الصف — فما تحمله الحفظةُ منهما نسخةٌ قد تكون أقدم: الاستلامُ · التعثّرُ ورفعُه · الانقضاء · الاعتذار · التوثيقُ ومسوّدتُه والتسليم.
     · وفي المشتركة (3 · 6 · 11 · 12) ما لم تره الحفظةُ من تقدّمه: الإنجازُ بتوثيقٍ أحدث · التسليمُ للمراجعة (12 · 6) · وقتُ البدء وحالةُ «جارية» · الاعتذار.
   ويمضي المقصود: إعادةُ الفتح والإنجازُ والقبولُ نيابةً تحمل التوثيقَ نفسَه (لا أحدث) فتمضي · الإسنادُ لغيره والحذفُ يغيّران الهوية فلا يُمسّان.
   صفٌّ هويتُه مكرّرةٌ في أحد الطرفين لا يُخمَّن له. */
function tkDocTs(o) {
  if (!isObj(o)) return 0;
  var t = Math.max(+o.at || 0, +o.sub || 0);
  if (Array.isArray(o.h) && o.h.length && isObj(o.h[o.h.length - 1])) t = Math.max(t, +o.h[o.h.length - 1].at || 0);
  return t;
}
/* o.x (KIVO_265 · H-1 مع F-10): حفظةٌ مبنيّةٌ على نسخةٍ تجاوزها الخادم (base قديم) تأخذ العمودَ 23 (x — للخادم وحده) من القيمة الحالية لصفوفها
   المطابَقة — فلا يُحكم عليها بـ«task-x» لعمودٍ لم تكن لتعرفه (مسارُ خادمٍ كتبه بعد قراءتها) فتصير تعارضاً يدمجه العميل ثم يعيد الإرسال؛
   والحفظةُ على النسخة الحالية تُحكَم بـx كما أرسلتها (تغييرُها رفضٌ صريح · H-1). لا كتابةَ على base قديم أصلاً (فحصُ النسخة بعد الحكم). */
function tkKeepSelf(incJson, curJson, o) {
  var b = parseJson(incJson, null), a = parseJson(curJson, null);
  if (!isObj(a) || !isObj(b)) return { v: incJson, n: 0 };
  var idOf = function (r) { return String(r[13]) + '|' + String(r[14] == null ? '' : r[14]); };
  var I3 = Object.create(null), I2 = Object.create(null), J3 = Object.create(null), J2 = Object.create(null), d, i, r, k3, k2;
  for (d in a) {
    if (!Array.isArray(a[d])) continue;
    for (i = 0; i < a[d].length; i++) { r = a[d][i]; if (!Array.isArray(r) || r[13] == null) continue; k3 = d + '#' + idOf(r); k2 = idOf(r); I3[k3] = k3 in I3 ? -1 : r; I2[k2] = k2 in I2 ? -1 : r; }
  }
  for (d in b) {
    if (!Array.isArray(b[d])) continue;
    for (i = 0; i < b[d].length; i++) { r = b[d][i]; if (!Array.isArray(r) || r[13] == null) continue; k3 = d + '#' + idOf(r); k2 = idOf(r); J3[k3] = (J3[k3] || 0) + 1; J2[k2] = (J2[k2] || 0) + 1; }
  }
  var n = 0, s = function (q) { return q == null ? '' : String(q); }, js = function (q) { return JSON.stringify(q === undefined ? null : q); };
  for (d in b) {
    if (!Array.isArray(b[d])) continue;
    for (i = 0; i < b[d].length; i++) {
      r = b[d][i]; if (!Array.isArray(r) || r[13] == null) continue;
      k3 = d + '#' + idOf(r); k2 = idOf(r);
      var c = J3[k3] === 1 && Array.isArray(I3[k3]) ? I3[k3] : (J2[k2] === 1 && Array.isArray(I2[k2]) ? I2[k2] : null);
      if (!c) continue;
      var x = r.slice(), ch = 0;
      var put = function (j, v) { while (x.length <= j) x.push(null); x[j] = v; ch++; };
      /* التوثيقُ أو التسليمُ في الخادم أحدثُ ممّا تحمله الحفظة (لم ترَه) — يُقاس قبل استبدال 21 */
      var nw = isObj(c[21]) && tkDocTs(c[21]) > tkDocTs(x[21]);
      if (c[3] === 'done' && c[12] && nw && s(x[3]) !== 'done') {                                  /* لم ترَ الإنجاز: يعود بتوثيقه */
        put(3, 'done'); put(12, c[12]); if (c[6] != null && x[6] == null) put(6, c[6]);
      } else if (c[12] && !x[12] && nw && s(x[3]) !== 'done') {                                  /* لم ترَ التسليمَ للمراجعة */
        put(12, c[12]); if (c[6] != null && x[6] == null) put(6, c[6]);
      }
      if (c[11] && !x[11]) put(11, c[11]);                                                         /* وقتُ البدء */
      if (x[11] && (s(x[3]) === '' || s(x[3]) === 'pending') && (c[3] === 'in_progress' || c[3] === 'done')) put(3, 'in_progress');
      if (c[3] === 'declined' && isObj(c[20]) && c[20].at && !(isObj(x[20]) && x[20].at) && s(x[3]) !== 'declined' && !x[11]) put(3, 'declined');   /* الاعتذار */
      if (js(x[20]) !== js(c[20])) put(20, c[20] == null ? null : c[20]);                          /* ملكُ الموظف — كما في الخادم */
      if (js(x[21]) !== js(c[21])) put(21, c[21] == null ? null : c[21]);
      if (o && o.x && js(x.length > 23 ? x[23] : null) !== js(c.length > 23 ? c[23] : null)) put(23, c.length > 23 && c[23] != null ? c[23] : null);   /* H-1: للخادم */
      if (ch) { b[d][i] = x; n++; }
    }
  }
  return n ? { v: JSON.stringify(b), n: n } : { v: incJson, n: 0 };
}
/* Notification templates and targeting have one owner: the relational domain. */
var TK_NOTIFICATION_TYPES = ['task_new', 'task_done', 'task_chg', 'task_soon', 'task_late'];
var TK_TFMT = null;
function tkClock(ms) { try { if (!TK_TFMT) TK_TFMT = new Intl.DateTimeFormat('ar-SA', { timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit' }); return TK_TFMT.format(new Date(ms)); } catch (e) { return tkHm(tkMinOfDay(ms)); } }
/* items: [{type, own:[ekeys/uids], vars:{}, once?}] — يُكتب بعد نجاح الفعل؛ إخفاقُه لا يُبطل الفعل (best effort مع إعادةٍ عند التعارض) */
async function tkNotify(env, request, A, d, items, meta) {
  if (!items || !items.length || !d) return 0;
  try {
    var events = items.filter(function(it){ return TK_NOTIFICATION_TYPES.indexOf(it.type) !== -1; }).map(function(it){ var e={type:it.type,dept:d,own:it.own||[],vars:it.vars||{}}; if(it.once)e.once=it.once; if(it.sys)e.sys=1; /* V7 · 53: حدثُ الخادم بلا فاعل (019 nfPlanEvents) */ return e; });
    if (!events.length) return 0;
    return (await nfEmitEvents(env,A,events,true)).n || 0;
  } catch(e) { swallow('tk-notify',e,env.__rid); return 0; }
}
/* ── قراءةُ الجسم بسقفٍ وحارسِ شكل ── */
async function tkBody(request, path, lim) {
  var raw = await request.arrayBuffer();
  if (raw.byteLength > (lim || 8192)) return { err: json({ ok: 0, err: 'too-large' }, 413) };
  /* KIVO_264 · SOT-101/E5 (عقدُ 051b bodyRead): JSON غيرُ مفهوم ⇒ 400 bad-body at:'$' كسائر المسارات المغيِّرة */
  var b; try { b = JSON.parse(new TextDecoder().decode(raw)); } catch (e) { return { err: json({ ok: 0, err: 'bad-body', at: '$' }, 400) }; }
  var bad = typeof bodyCheck === 'function' ? bodyCheck(path, b) : null; if (bad) return { err: json({ ok: 0, err: 'bad-body', at: bad }, 400) };
  if (!isObj(b)) return { err: json({ ok: 0, err: 'bad-body', at: 'body' }, 400) };
  return { b: b };
}
/* KIVO_264 · C1 (عقدُ 063 لـ/api/save نفسُه — التدقيقُ المعماري D-3): uid في الجسم = هويةُ التبويب الذي بُني لها (BOOT.uid)؛ إن خالف صاحبَ الجلسة
   ⇒ 409 session-changed قبل أيّ قراءةٍ أو كتابة — فلا يُنفَّذ فعلُ تبويبٍ بُني لحسابٍ باسم حسابٍ آخر دخل في المتصفح نفسِه. الغائبُ وnull = كما كان.
   والقراءةُ (GET) بـ?uid= عبر sessUidMismatch في 063. */
function tkSessBody(env, b, ss, path) {
  if (!b || b.uid == null || String(b.uid) === String(ss.uid)) return null;
  logEv('warn', 'session-changed', { rid: env.__rid, p: path, st: 409 });
  return json({ ok: 0, err: 'session-changed' }, 409);
}
/* هويةٌ جديدة فريدة للعمود 13 (ق: الهويةُ تبقى في 13 — والدمجُ في العميل يعتمد عليها): طابعُ الآن مزاحاً حتى لا يتكرّر في المخزن كلّه */
function tkIdsUsed(S) { var u = nmap(); for (var dk in S) if (Array.isArray(S[dk])) S[dk].forEach(function (r) { if (Array.isArray(r) && r[13] != null) u[String(r[13])] = 1; }); return u; }
function tkNewId(used, base) { var id = Math.max(base || 0, Date.now()); while (used[String(id)]) id++; used[String(id)] = 1; return id; }
/* البحثُ عن صفٍّ بهويته (13) ومكلَّفه (14) — والموضعُ تلميحٌ لا مرجع */
function tkFind(L, id, ekey, hint) {
  if (!Array.isArray(L)) return -1;
  var ok = function (r) { return Array.isArray(r) && r[13] != null && String(r[13]) === String(id) && (ekey == null || String(r[14] == null ? '' : r[14]) === String(ekey)); };
  if (typeof hint === 'number' && ok(L[hint])) return hint;
  for (var j = 0; j < L.length; j++) if (ok(L[j])) return j;
  return -1;
}

/* Interactive commands carry the original request fingerprint into the existing
   operational receipt. The fresh reference also fences every derived input. */
async function tkCommandContext(env, A, body, command, actions) {
  var append = command === 'tasks.create';
  if (!Number.isSafeInteger(body.epoch) || body.epoch < 0 ||
      ((!append || body.base !== undefined) && (!Number.isSafeInteger(body.base) || body.base < 0)))
    return tkNo(400, 'bad-body', '', { at: 'base' });
  // RISHAD-266 · s1: the command's department (and what it reads beyond it, fenced on first read) — never every department.
  var d0 = String(body.dept || A.u.deptId || '');
  await calLazyEnsure(env, ['bassam_tasks_v1', 'bassam_tasks_locks_v1', 'bassam_staffing_v3', 'bassam_staffing_locks_v1', 'bassam_dayshift_v1'].map(function (r) { return 'bsdept:' + d0 + ':' + r; }), null);   /* V7 · 53 تقويم (REVIEW 45): ما يقرؤه أمرُ المهام يُحوَّل قبل لقطة المرجع (نسخُها أساسُ الأمر وسياجُه) — لا تعارضَ يصنعه تحويلُنا */
  var reference = await rsReferenceSnapshot(env, A.u.id, { departments: [String(body.dept || A.u.deptId || '')] }), actor = reference.A;
  if (!actor || !actor.u) return tkNo(401, 'session');
  ['tok', 'sessTs', '__tkSrv', '__tkSelf'].forEach(function (key) { if (A[key] !== undefined) actor[key] = A[key]; });
  env = reference.env; A = actor;
  var D = tkDeptOf(A, body.dept); if (D.err) return D;
  if (!(A.depts || []).some(function (row) { return row && row.id === D.d; })) return tkNo(403, 'forbidden');
  if (!(actions || []).every(function (action) { return tkHeld(A, D.d, action); })) return tkNo(403, 'denied');
  if (body.epoch !== Number(reference.inputMeta.restore_epoch || 0)) return tkNo(409, 'restore-epoch-changed');
  var receipt = await opCommandReceipt(env, A, command, body.requestId, body), key = tkK(D.d);
  if (receipt.receipt && (!Array.isArray(receipt.receipt.commandActions) || !receipt.receipt.commandActions.every(function (action) { return tkHeld(A, D.d, action); }))) return tkNo(403, 'denied');
  if (receipt.receipt) {
    try { await env.DB.batch(rsReferenceGuards(env, reference)); }
    catch (error) {
      if (/KIVO_RESTORE_TARGET|KIVO_REV_CONFLICT|KIVO_RESTORE_EPOCH/.test(String(error))) throw rsError('conflict', 409);
      throw error;
    }
  }
  // Create appends to this freshly captured source; it never replaces a client
  // document. Its server-side CAS remains in tkSave/the atomic compiler.
  if (!append && !receipt.receipt && body.base !== Number(reference.inputRevs[key] || 0)) return tkNo(409, 'busy');
  return { actions: actions || [], env: env, A: A, d: D.d, key: key, reference: reference, fingerprint: receipt.fingerprint, receipt: receipt.receipt, body: body };
}
function tkCommandReply(command, receipt) {
  var reply = Object.assign({}, receipt, { rev: receipt.revs && receipt.revs[command.key] || receipt.v || 0 });
  delete reply.commandActions;
  return reply;
}
async function tkPreparedCommand(env, request, A, body, name, prepare, recurrence) {
  var actions = recurrence && body.op === 'start' ? ['task.edit', 'task.create', 'task.assign'] : ['task.edit'];
  var command = await tkCommandContext(env, A, body, name, actions);
  if (command.err) return command.err;
  if (command.receipt) return json(tkCommandReply(command, command.receipt));
  var R = await tkSave(command.env, request, command.A, command.key, async function (S) {
    var plan = await prepare(command.env, command.A, body, command.d, command.key, S);
    return plan instanceof Response ? { err: plan } : plan;
  }, null, command);
  if (R.err) return R.err;
  if (recurrence && !R.receipt.duplicate && typeof tkGateReset === 'function') await tkGateReset(command.env, 'rec', command.d);
  return json(tkCommandReply(command, R.receipt));
}
