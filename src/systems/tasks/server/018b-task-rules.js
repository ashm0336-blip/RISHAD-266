/* مهام الموظف: يقبل مهمته ويعتذر عنها وينهيها بتوثيقها — على صفّه هو وحده، وبحقوله وحدها.
   لا يضيف صفاً ولا يحذفه ولا يمسّ عنوان المهمة ولا وقتها ولا إسنادها. */
var TASK_SELF = { 3: 1, 6: 1, 11: 1, 12: 1, 20: 1, 21: 1 };
var TASK_ST = { pending: 1, in_progress: 1, done: 1, declined: 1 };
function selfTaskOnly(A, newJson, curJson) {
  var a = parseJson(curJson, null), b = parseJson(newJson, null);
  /* KIVO_264 · KIVO-Tasks (الرقعة 06): كتابةُ الذات على مخزن المهام من المسار الذاتي وحده (POST /api/me/tasks/act — 062c يسِم الفاعلَ في الخادم
     A.__tkSelf ولا يصل إليه مدخلٌ من الطلب). الحفظُ الخامّ /api/save ممّن يقرأ المخزن (task.view) كان يصنع «منجزة» وأداءً وطوابعَ بلا سياسة إثبات
     ولا مراجِع (ق2 · ق3) — يُرفض الآن ما لم يملك صاحبُه مفاتيحَ الفعل نفسَها */
  if (!isObj(a) || !isObj(b) || !A.u.ekey || !A.__tkSelf) return false;
  var ks = {}, k, hits = 0;
  Object.keys(a).forEach(function (x) { ks[x] = 1; }); Object.keys(b).forEach(function (x) { ks[x] = 1; });
  for (k in ks) {
    var x = a[k], y = b[k];
    if (deq(x, y)) continue;
    if (!Array.isArray(x) || !Array.isArray(y) || x.length !== y.length) return false;   /* لا إضافة ولا حذف */
    for (var i = 0; i < x.length; i++) {
      var r0 = x[i], r1 = y[i];
      if (deq(r0, r1)) continue;
      if (!Array.isArray(r0) || !Array.isArray(r1)) return false;
      if (String(r0[14] == null ? '' : r0[14]) !== String(A.u.ekey)) return false;        /* ليست مهمّته */
      if (r0[3] === 'done' || r0[3] === 'declined') return false;                          /* المنتهية لا تُمسّ */
      if (!TASK_ST[String(r1[3])]) return false;
      var n = Math.max(r0.length, r1.length);
      for (var j = 0; j < n; j++) {
        if (TASK_SELF[j]) continue;
        var v0 = r0[j] === undefined ? null : r0[j], v1 = r1[j] === undefined ? null : r1[j];
        if (!deq(v0, v1)) return false;
      }
      if (++hits > 12) return false;
    }
  }
  return hits > 0;
}
/* KIVO_265 · H-1 (المراجعةُ المستقلة لدمج 265 — عالٍ · بالوضعين): العمودُ 23 (x — حقولُ الإدارة) في مخزن المهام يكتبه الخادمُ وحده.
   كان محرّكُ التكرار (073) يكتب باسم x.by.u المخزَّن، وحاملُ task.edit يعيد كتابةَ x بحفظٍ خامّ /api/save ⇒ نسخٌ «باسم مدير النظام».
   حقولُه كلُّها للخادم (x كلُّها تُقارَن حرفاً — وما لم يُعدَّ هنا كذلك): v · by المنشئ · pol سياسةُ الإثبات · rv المراجِع · dec · needs · elig ·
   ext التمديد · rev/revh قرارُ المراجعة · asg/can/re/from الإلغاءُ وإعادةُ الإسناد · rec التكرار · idem · det · relink.
   تُكتب من مسارات /api/tasks/* ومن التكرار وحدها بوسمِ الخادم A.__tkSrv (071 tkSrvMark — كوسم الذات __tkSelf: الفاعلُ يُبنى في الخادم
   من الجلسة ولا يصل إليه مدخلٌ من الطلب). الحفظُ الخامّ — مهما كانت صلاحيةُ صاحبه، مديرُ النظام أيضاً — يحمل x كلِّ صفٍّ كما هي حرفاً
   أو يحذف الصفَّ كلَّه: إضافتُها · تغييرُها · نسخُها إلى صفٍّ آخر · نزعُها عن صفٍّ باقٍ ⇒ رفضٌ 'task-x'. ويُستثنى وحده الاستعادةُ المخوَّلة
   (taskSrvExempt: الإنفاذ ctx.enf.restore بعد سياسة enfSavePrep · القديم ctx.rst = علامةُ الاستعادة في الحفظة — 054 applySave).
   المراجعةُ الموحّدة (R-8 — منخفض): x صفِّها هو بهويته (13 · 14) — كانت المطابقةُ بـ13 وحدها فتتبادل صفوفُ هويةٍ مشتركة (المجموعاتُ القديمة) x
   بحفظٍ خامّ (يُفتح الملغى ويُلغى غيرُه) أو تُنزع بتغيير المكلَّف. صفُّ الهوية الوحيد يبقى صفَّها وإن تغيّر مكلَّفُه (نموذجُ التعديل قبل النشاط — R-1).
   a/b القيمتان محلَّلتين (المخزَّنة · الواردة) ⇒ '' مقبول أو 'task-x' */
/* الاستثناءُ الوحيد من أحكام الحفظ الخامّ لمخزن المهام (H-1 · R-1 · R-2): وسمُ الخادم · والاستعادةُ المخوَّلة — في الإنفاذ بسياستها (X.restore)،
   وفي القديم بعلامتها لمدير النظام ولمدير الإدارة نفسِها (isMgrOf — المراجعةُ الموحّدة R-5: كانت لمدير النظام وحده فتُرفض استعادةُ مدير الإدارة
   نسخةَ إدارته — ومعها سجلُّ الموظفين ذرّياً — وكانت تمضي في 264؛ ومرآةُ سياسة الإنفاذ: «لمدير النظام أو لمدير الإدارة الممنوح مفتاحها»).
   إعادةُ المراجعة (N-6): والعلامةُ على مفتاح المهام نفسِه (ctx.rst لكل مفتاح — 054) بالوضعين — كانت علامةُ أيّ مفتاحٍ في الحفظة تستثنيه */
function taskSrvExempt(A, d, ctx) {
  if (A && A.__tkSrv) return true;
  if (!(ctx && ctx.rst)) return false;
  if (ctx.enf) return !!ctx.enf.restore;                                             /* الإنفاذ: سياسةُ الاستعادة (المفتاحُ · السببُ · النسخةُ قبلها) */
  /* KIVO_265 · F-2/R-21 (RBAC_AUDIT_265 — بديلُ R-21 الموصى به): في القديم العلامةُ يدّعيها العميل فلا تُقبل إلا لمدير النظام — كان مديرُ الإدارة (ومعه
     staff+mgr وgm على فرعه · F-4) يزوّر بها العمودَ 23 (صاحبَ سلسلة تكرارٍ يكتب الخادمُ نُسخَها باسمه). استعادةُ مدير الإدارة لمهام إدارته تُرفض كما في acf31dc */
  return !!(A && A.u && A.u.role === 'super');
}
function taskXRows(S) {
  var o = nmap(), dk, L, i, r, id;                                                   /* بلا نموذجٍ أب: هويةُ صفٍّ «__proto__» مفتاحٌ عاديّ */
  if (!isObj(S)) return o;
  for (dk in S) {
    L = S[dk]; if (!Array.isArray(L)) continue;
    for (i = 0; i < L.length; i++) {
      r = L[i]; if (!Array.isArray(r)) continue;
      /* صفٌّ بلا هوية (13) لا يُعفى: صفوفُه تحت هويةٍ محجوزةٍ واحدة — وإلا حمل x مزوَّرةً (سلسلةً بمعرّفٍ حقيقيٍّ وإصدارٍ أعلى تصير نموذجَها في 073) */
      id = r[13] == null ? '\u0000' : String(r[13]); (o[id] = o[id] || []).push({ x: r.length > 23 && r[23] != null ? r[23] : null, e: String(r[14] == null ? '' : r[14]), u: 0, r: r });
    }
  }
  return o;
}
function taskXWhy(A, a, b, d, ctx) {
  if (taskSrvExempt(A, d, ctx)) return '';
  if (!isObj(b)) return '';
  var O = taskXRows(a), N = taskXRows(b), id, i, j;
  /* إعادةُ المراجعة (N-1 — انحدارٌ من R-8): تنظيفُ حذف الموظف (040 tasksGoneOk) يفرّغ مكلَّفَ صفوف المحذوف ويُبقي x في موضعها — فصفُّه (13 · المحذوف)
     هو صفُّ (13 · '') في الحفظة. كانت مطابقةُ المكلَّف نفسِه في الهوية المشتركة (المجموعاتُ القديمة) ترفضه 'task-x' فيُرفض حذفُ الموظف ذرّياً */
  var same = function (oe, ne) { return oe === ne || (ne === '' && goneKey(ctx, oe)); };
  for (id in N) {
    var nl = N[id], ol = O[id] || [], one = ol.length === 1 && nl.length === 1;
    for (i = 0; i < nl.length; i++) {
      if (nl[i].x == null) continue;
      var hit = -1;
      for (j = 0; j < ol.length && hit < 0; j++) if (!ol[j].u && ol[j].x != null && ol[j].e === nl[i].e && deq(ol[j].x, nl[i].x)) hit = j;   /* صفُّه بعينه أولاً */
      for (j = 0; j < ol.length && hit < 0; j++) if (!ol[j].u && ol[j].x != null && (one || same(ol[j].e, nl[i].e)) && deq(ol[j].x, nl[i].x)) hit = j;
      if (hit < 0) return 'task-x';                                                 /* x جديدة · معدَّلة · منسوخةٌ إلى صفٍّ آخر أو مكلَّفٍ آخر في هويةٍ مشتركة */
      ol[hit].u = 1;
    }
  }
  for (id in O) {                                                                    /* نزعُ x عن صفٍّ باقٍ */
    var ol2 = O[id], nl2 = N[id]; if (!nl2) continue;                                /* حُذفت صفوفُ الهوية كلُّها ⇒ حذفٌ لا نزع */
    var one2 = ol2.length === 1 && nl2.length === 1, oe = nmap();
    for (j = 0; j < ol2.length; j++) oe[ol2[j].e] = 1;
    for (i = 0; i < ol2.length; i++) {
      if (ol2[i].x == null || ol2[i].u) continue;
      /* صفُّه (13 · 14) في الحفظة بلا x · أو صفُّ الهوية الوحيد · أو مكلَّفٌ جديدٌ في هويةٍ مشتركة بلا x (نُقل الصفُّ وسقطت x — R-8) */
      for (j = 0; j < nl2.length; j++) if (nl2[j].x == null && (one2 || nl2[j].e === ol2[i].e || !oe[nl2[j].e])) return 'task-x';
    }
  }
  return '';
}
/* KIVO_265 · المراجعةُ الموحّدة (R-1 — عالٍ · بالوضعين): RC-13 في الخادم — مهمةٌ بدأها الموظفُ أو أنهاها أو اعتذر عنها أو أغلقها الخادم (070 tkRowActive)
   لا يُغيَّر مكلَّفُها بالحفظ الخامّ: لا يدخل هويتَها (13) مكلَّفٌ جديد — ولا تُنزع منه (مهمةٌ عامة بإثبات غيره) — وإعادةُ الإسناد بمسارها
   (/api/tasks/reassign: نسخةٌ جديدة ويبقى سجلُّ الأول وإثباتُه). كان الحكمُ في صفحة «المهام» وحدها على نسختها (_tkHasActivity) فيمرّ تعديلُ نسخةٍ
   قديمة، ويُركّب دمجُ 280 (merge3) الصفَّ: المكلَّفُ الجديد مع «تم» الأول وإثباته — فيقرأ الزميلُ صورتَه (P0) ويختفي «تم» صاحبه (F-10) ⇒ 'task-asg'.
   «النشاطُ» لصفٍّ مسنَد (14 غيرُ فارغ — كالواجهة). ويمضي: تنظيفُ حذف الموظف (040 tasksGoneOk: إسنادُ المحذوف في الدفعة نفسِها يُفرَّغ) ·
   مساراتُ الخادم والاستعادةُ المخوَّلة (taskSrvExempt).
   R-7 (منخفض): ولا يصير المكلَّفُ الجديدُ مراجِعَ المهمة نفسَه (x.rv.e) فيعتمد تسليمَه بنفسه ⇒ 'task-rv' (والمساراتُ في 071 تمنعه) */
function taskAsgRows(S) {
  var o = nmap(), dk, L, i, r, id, e, x;
  if (!isObj(S)) return o;
  for (dk in S) {
    L = S[dk]; if (!Array.isArray(L)) continue;
    for (i = 0; i < L.length; i++) {
      r = L[i]; if (!Array.isArray(r)) continue;
      id = r[13] == null ? '\u0000' : String(r[13]); e = String(r[14] == null ? '' : r[14]);
      var g = o[id] || (o[id] = { n: nmap(), act: nmap(), rows: [] });
      g.n[e] = (g.n[e] || 0) + 1; if (e && tkRowActive(r)) g.act[e] = (g.act[e] || 0) + 1;
      x = r.length > 23 && isObj(r[23]) ? r[23] : null; g.rows.push({ e: e, rv: x && isObj(x.rv) && x.rv.e != null ? String(x.rv.e) : '' });
    }
  }
  return o;
}
function taskAsgWhy(A, a, b, d, ctx) {
  if (taskSrvExempt(A, d, ctx) || !isObj(b)) return '';
  var O = taskAsgRows(a), N = taskAsgRows(b), id, e, i;
  for (id in N) {
    var o = O[id], n = N[id], added = [], gone = true, act = 0;
    for (i = 0; i < n.rows.length; i++) if (n.rows[i].e && n.rows[i].rv && n.rows[i].e === n.rows[i].rv && (!o || (o.n[n.rows[i].e] || 0) < (n.n[n.rows[i].e] || 0))) return 'task-rv';
    if (!o) continue;                                                                /* هويةٌ جديدة: لا نشاطَ قائمٌ لها (وحسابُ مكلَّفها في taskAcctWhy) */
    for (e in n.n) if (n.n[e] > (o.n[e] || 0)) added.push(e);
    if (!added.length) continue;                                                     /* لا مكلَّفَ جديد (تعديلٌ أو حذف) */
    for (e in o.act) act += o.act[e];
    if (!act) continue;
    /* تنظيفُ حذف الموظف: المضافُ «بلا مكلَّف» وحده وكلُّ من خرج من الهوية موظفٌ محذوفٌ في الدفعة نفسِها */
    for (e in o.n) if ((n.n[e] || 0) < o.n[e] && !goneKey(ctx, e)) gone = false;
    if (gone && added.length === 1 && added[0] === '') continue;
    return 'task-asg';
  }
  return '';
}
/* KIVO_265 · المراجعةُ الموحّدة (R-2 — متوسط · بالوضعين): قاعدةُ الحساب النشط (قرارُ المالك 15:13 · البند 4: «تطبيق المنع في الخادم») على الحفظ
   الخامّ أيضاً — كلُّ مكلَّفٍ جديدٍ في الحفظة بهوية صفّه (13 · 14): صفٌّ جديد · تغييرُ المكلَّف · إسنادُ مهمةٍ عامة («قبولٌ نيابةً» في صفحة «المهام») ·
   التبويباتُ القديمة — حسابُه نشطٌ بالمعرّف الذي يُسند به (070 tkAcctTok) وإلا 'task-acct'. الصفوفُ القائمة بهويتها لا تُمسّ (ومنها صفوفُ من عُطِّل
   حسابُه بعد إسنادها) · ومساراتُ الخادم والاستعادةُ المخوَّلة (taskSrvExempt). ctx.tk = {users · emps} لإدارة المفتاح (054 applySave) */
function taskAcctWhy(A, a, b, d, ctx) {
  if (taskSrvExempt(A, d, ctx) || !isObj(b)) return '';
  var cnt = function (S) {                                                           /* المكلَّف ⇒ الهوية (13) ⇒ عددُ الصفوف */
    var o = nmap(), dk, L, i, r, t, id;
    if (!isObj(S)) return o;
    for (dk in S) {
      L = S[dk]; if (!Array.isArray(L)) continue;
      for (i = 0; i < L.length; i++) {
        r = L[i]; if (!Array.isArray(r) || r[14] == null || r[14] === '') continue;
        t = String(r[14]); id = r[13] == null ? '\u0000' : String(r[13]);
        var m = o[t] || (o[t] = nmap()); m[id] = (m[id] || 0) + 1;
      }
    }
    return o;
  };
  var O = cnt(a), N = cnt(b), tok, id, T = ctx && ctx.tk;
  for (tok in N) {
    var nw = false, om = O[tok] || nmap();
    for (id in N[tok]) if (N[tok][id] > (om[id] || 0)) { nw = true; break; }
    if (!nw) continue;
    if (!T) return 'task-acct';                                                      /* بلا سياقٍ لا حكمَ بالإيجاب (fail-closed) */
    if (!T.ix) T.ix = tkAcctIx(T.users, T.emps, d);                                  /* فهرسٌ واحدٌ للحفظة (إعادةُ المراجعة N-3) */
    if (tkAcctTok(null, null, d, tok, T.ix).st !== 'active') return 'task-acct';
    /* KIVO_265 · G-2 (تحقّقُ الخلفية — منخفض · بالوضعين): حفظةٌ تحمل سجلَّ الحسابات أيضاً ⇒ نشطٌ في القائمتين: قبل الدفعة (أعلاه) وبعدها (T.users2 — 054).
       كان تعطيلُ الحساب وإسنادُ مهمةٍ إليه في حفظةٍ واحدة يمضي (حساباتُ ما قبل الدفعة وحدها) */
    if (T.users2) { if (!T.ix2) T.ix2 = tkAcctIx(T.users2, T.emps, d); if (tkAcctTok(null, null, d, tok, T.ix2).st !== 'active') return 'task-acct'; }
  }
  return '';
}
/* إعادةُ المراجعة (N-5 — منخفض · P0): العمودان 20 و21 (الاستلامُ والاعتذارُ والتعثّر · التوثيقُ وصورُ الإثبات) ملكُ الموظف — يكتبهما المسارُ الذاتي
   (A.__tkSelf) ومساراتُ الخادم وحدها، وصفحةُ «المهام» تنسخهما مع الصفّ ولا تؤلّف فيهما (F-10). فالحفظُ الخامّ لا يزيد صفوفَ (13 · 14) التي تحملهما:
   كان حفظٌ مصنوعٌ ينقل صفَّ الموظف المنجزَ أو ينسخه إلى زميلٍ بهويةٍ جديدة (13) فيقرأ الزميلُ صورةَ إثباته ⇒ 'task-asg' (استعمل إعادةَ الإسناد)
   تحقّقُ 648242f (V-2 — منخفض · P0): ولا يزيد الحفظُ الخامّ معرّفاتِ الصور في 21 (imgs · h[].imgs) لأيّ مكلَّفٍ عمّا في الخادم لصفوفه كلِّها — فقراءةُ
   صورة الإثبات (062c meTkImg) بذكرها في 21 صفٍّ له. صفوفُ الهوية المطابَقة يعيد tkKeepSelf (054) عمودَيها من الخادم قبل الحكم؛ وكان الصفُّ القديمُ
   بلا هوية (13) — لا يطابقه — يحمل صورةَ زميلٍ أُضيفت إليه فيقرؤها صاحبُه ⇒ 'task-asg' */
function taskOwnWhy(A, a, b, d, ctx) {
  if (taskSrvExempt(A, d, ctx) || (A && A.__tkSelf) || !isObj(b)) return '';
  var ims = function (v, m) { if (Array.isArray(v)) for (var k = 0; k < v.length; k++) if (v[k] != null && v[k] !== '') m[String(v[k])] = 1; };
  var cnt = function (S) {                                                           /* 14 ⇒ { n: (13) ⇒ عددُ صفوفه التي تحمل 20 أو 21 · im: معرّفاتُ صور 21 في صفوفه } */
    var o = nmap(), dk, L, i, r, j;
    if (!isObj(S)) return o;
    for (dk in S) {
      L = S[dk]; if (!Array.isArray(L)) continue;
      for (i = 0; i < L.length; i++) {
        r = L[i]; if (!Array.isArray(r) || r[14] == null || r[14] === '' || !(r[20] || r[21])) continue;
        var q = String(r[14]), g = o[q] || (o[q] = { n: nmap(), im: nmap(), sub: 0, acc: 0 }), id = r[13] == null ? '\u0000' : String(r[13]); g.n[id] = (g.n[id] || 0) + 1;
        if (isObj(r[21])) { ims(r[21].imgs, g.im); if (Array.isArray(r[21].h)) for (j = 0; j < r[21].h.length; j++) if (isObj(r[21].h[j])) ims(r[21].h[j].imgs, g.im); if (r[21].sub) g.sub++; }
        if (r[11]) g.acc++;
      }
    }
    return o;
  };
  var O = cnt(a), N = cnt(b), e, id;
  for (e in N) {
    var og = O[e] || { n: nmap(), im: nmap(), sub: 0, acc: 0 };
    for (id in N[e].n) if (N[e].n[id] > (og.n[id] || 0)) return 'task-asg';
    for (id in N[e].im) if (!og.im[id]) return 'task-asg';                          /* V-2: صورةٌ ليست في صفوفه في الخادم */
  }
  /* KIVO_265 · حادثةُ الصور (سقيا زمزم): ولا يُنقص الحفظُ الخامّ توثيقَ الموظف في صفٍّ باقٍ له بهويته (13 · 14): صورةُ إثباتٍ في الخادم تغيب ·
     تسليمٌ (21.sub) أو بدءٌ (11) يُنزع — كان حفظُ مديرٍ من نسخةٍ قديمة لصفٍّ مكرّر الهوية (لا يحميه tkKeepSelf) يمحو العمودَ 21 فتُكنس الصورُ ⇒ 'task-own'.
     الهويةُ التي تغيّر مكلَّفُها (تنظيفُ حذف الموظف · إسنادُ العامة) أو غابت (حذف) ليست هنا: يحكمها taskAsgWhy وtaskDelWhy. والمكرّرةُ تُجمع: يكفي أن يبقى
     الإثباتُ في إحدى نسخها */
  var own = function (S) {
    var o = nmap(), dk, L, i, r, j, k;
    if (!isObj(S)) return o;
    for (dk in S) {
      L = S[dk]; if (!Array.isArray(L)) continue;
      for (i = 0; i < L.length; i++) {
        r = L[i]; if (!Array.isArray(r) || r[13] == null || r[14] == null || r[14] === '') continue;
        k = String(r[13]) + '|' + String(r[14]); var g = o[k] || (o[k] = { im: nmap(), sub: 0, acc: 0, n: 0 }); g.n++;
        if (isObj(r[21])) { ims(r[21].imgs, g.im); if (Array.isArray(r[21].h)) for (j = 0; j < r[21].h.length; j++) if (isObj(r[21].h[j])) ims(r[21].h[j].imgs, g.im); if (r[21].sub) g.sub = 1; }
        if (r[11]) g.acc = 1;
      }
    }
    return o;
  };
  var OA = own(a), NA = own(b), k;
  for (k in OA) {
    var ng = NA[k]; if (!ng) continue;
    for (id in OA[k].im) if (!ng.im[id]) return 'task-own';
    if (ng.sub < OA[k].sub || ng.acc < OA[k].acc) return 'task-own';
  }
  return '';
}
/* KIVO_265 · حادثةُ الصور (البند 5 من قائمة صفحة المهام): الحذفُ الفعليُّ (الصفُّ يغيب من المخزن) للأخطاء الحديثة وحدها — صفٌّ عليه نشاطٌ
   (قبولٌ · بدءٌ · توثيقٌ · تسليمٌ · إنجازٌ · اعتذارٌ · أغلقه الخادم) يبقى بسجلّه ويُلغى من قائمته ⇒ 'task-del'. الهويةُ (13) وحدها عبر الأيام كلِّها:
   نقلُ الصفّ إلى يومٍ آخر وتغييرُ مكلَّفه (تنظيفُ حذف الموظف · إسنادُ العامة — يحكمهما taskAsgWhy) ليسا حذفاً · ومساراتُ الخادم والاستعادةُ المخوَّلة
   معفاة (taskSrvExempt) · والحكمُ بعد taskOwnWhy فيبقى «نقلُ الإثبات إلى زميل» task-asg كما كان */
function tkRowActiveRaw(r) {
  var x = r.length > 23 && isObj(r[23]) ? r[23] : null;
  return !!(r[11] || r[12] || r[20] || r[21] || (r[3] && r[3] !== 'pending') || (x && (x.asg === 'cancelled' || x.asg === 'reassigned')));
}
function taskDelWhy(A, a, b, d, ctx) {
  if (taskSrvExempt(A, d, ctx) || (A && A.__tkSelf) || !isObj(a) || !isObj(b)) return '';
  var cnt = function (S, act) {
    var o = nmap(), dk, L, i, r, k;
    for (dk in S) {
      L = S[dk]; if (!Array.isArray(L)) continue;
      for (i = 0; i < L.length; i++) { r = L[i]; if (!Array.isArray(r) || r[13] == null) continue; if (act && !tkRowActiveRaw(r)) continue; k = String(r[13]); o[k] = (o[k] || 0) + 1; }
    }
    return o;
  };
  var O = cnt(a, true), N = cnt(b, false), k;
  for (k in O) if ((N[k] || 0) < O[k]) return 'task-del';
  return '';
}
/* أحكامُ الحفظ الخامّ لمخزن المهام بترتيبها (044 القديم · 060 الإنفاذ — قبل كلّ صلاحيةٍ ومسارٍ مختصر): العمودُ 23 · المكلَّفُ بعد النشاط · ملكُ الموظف ·
   الحسابُ النشط. TK_RAW_WHY: أسبابُها — على base قديمٍ تعارضٌ لا رفض (054 applySave · R-4) */
var TK_RAW_WHY = { 'task-x': 1, 'task-asg': 1, 'task-rv': 1, 'task-acct': 1, 'task-own': 1, 'task-del': 1 };
