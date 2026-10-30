/* ── KIVO_264 · KIVO-Tasks — «مهامي»: طبقةُ بيانات الموظف لمهامه هو وحده ──────────────────────────────────────
   كانت «ملفي ← مهامي» تقرأ مخزنَ المهام كاملاً من التخزين المحلي (localStorage → bsdept:<d>:bassam_tasks_v1)، والخادمُ لا يحقنه
   إلا لحامل task.view — فالموظفُ العاديّ يصله تنبيهُ «أُسندت إليك» ولا يجد المهمة (العطلُ الإنتاجي P0). وكانت تكتب المخزنَ كلَّه
   لتغيّر صفّاً واحداً. هنا مصدرٌ واحدٌ من الخادم بنطاق «صفوفي أنا» — بلا task.view ولا أيِّ مفتاحٍ إداري:
     load()            GET /api/me/tasks (?since=rev: ردٌّ رخيص إن لم يتغيّر شيء) — القديمةُ والجديدة، ولا إخفاءَ لانقضاء الموعد
     view(now, T)      تصنيفٌ نقيّ لكل صفّ في قسمٍ واحد بالضبط (أُعيدت · اليوم · جارية · بانتظار المراجعة · قادمة · منقضية · سجلّ)
     act(row, a, x)    POST /api/me/tasks/act — المرحلةُ الثانية (TO_BE §2): ack تأكيدُ الاستلام · start البدء · decline اعتذار (بسبب) ·
                       stall/resume تعثّر/استئناف · doc توثيقٌ مسودّة · submit تسليم (للمراجِع إن وُجد) · expire انقضاء — وأسماءُ المرحلة
                       الأولى accept/finish باقية. الحكمُ للخادم، والفشلُ لا يُعلَن نجاحاً (لا تحديثَ متفائل)
     can(row, now)     الأفعالُ المتاحة لصفٍّ — مرآةُ قواعد الخادم للعرض فقط (الخادمُ يحكم)
     need(row)         ما يتطلبه التسليمُ بحسب سياسة المهمة (ق2): نصُّ السياسة · الخطواتُ الباقية · هل يكفي ما وُثّق
     log(row)          GET /api/me/tasks/log — سجلُّ مهمتي بفاعلٍ ووقت
     uploadProof(d)    رفعُ صورة التوثيق بالمسار القائم (KIVO.BassamIDB.set ⇒ PUT /api/img/img_tsk… مقطَّعاً بتحقّق الطول) قبل التوثيق
     submitProof(row, a, body, dataUrls, meta) الصور ثم الفعل؛ النتيجة الملتبسة تبقي الطلب والصور في ذاكرة الصفحة للمحاولة الصريحة بنفس idem.
     queue             واجهة قراءة فارغة للشاشة القائمة؛ لا استهلاك لطابور الجهاز ولا إرسال تلقائي عند الاتصال أو فتح الصفحة.
     img(id)           صورةُ توثيقٍ من صفوفي — GET /api/me/tasks/img?id=<id> (لا /api/img العامّ: يتطلّب قراءةَ المخزن كلِّه)
   الحالاتُ الصريحة للواجهة: linked=false «حسابك غير مرتبط بسجل موظف بمعرّف ثابت» ≠ «لا مهام مسندة إليك» ≠ err «تعذّر التحميل».
   (حزمةُ 242 SR-2 تحمل نسخةَ المرحلة الأولى من هذا الملف مثبَّتةً في tools/hotfix242_sr2 — هذا الملفُّ يتطوّر بعدها.) */
(function () {
  /* لا تعمل خدمة المهام الذاتية دون تهيئة الخادم. */
  if (!(window.__BS_BOOT && window.__BS_BOOT.srv)) return;
  /* مساحةُ الأسماء: KIVO (≥ 258 · AUD-016) وإلا window */
  var NS = window.KIVO || window;
  var API = '/api/me/tasks';
  /* KIVO_264 · C1 (عقدُ /api/save نفسُه — 280 UID9): كلُّ طلبٍ يحمل هويةَ الجلسة التي بُنيت لها الصفحة (BOOT.uid) — إن دخل حسابٌ آخر في المتصفح نفسِه
     ردّ الخادمُ 409 session-changed قبل أيّ قراءةٍ أو كتابة، فلا يُنفَّذ فعلٌ من هذه الصفحة باسم غير صاحبها */
  var UID = typeof window.__BS_BOOT.uid === 'string' ? window.__BS_BOOT.uid : '';
  function withUid(u) { return UID ? u + (u.indexOf('?') >= 0 ? '&' : '?') + 'uid=' + encodeURIComponent(UID) : u; }
  var S = { rev: 0, me: null, rows: null, months: [], at: 0, err: '', loading: null, imgs: {} };
  var subs = [];
  var SECTIONS = ['returned', 'today', 'running', 'review', 'upcoming', 'overdue', 'history'];
  function emit() { for (var i = 0; i < subs.length; i++) { try { subs[i](S); } catch (e) { /* مشتركٌ معطوب لا يوقف بقيةَ المشتركين */ } } try { window.dispatchEvent(new CustomEvent('bassam:mytasks', { detail: { rev: S.rev } })); } catch (e) { /* إعلانٌ إضافيّ — المشتركون أُبلغوا */ } }
  function req(url, opt) {
    return fetch(url, Object.assign({ credentials: 'same-origin', cache: 'no-store' }, opt || {}))
      .then(function (r) { return r.text().then(function (t) { var j = null; try { j = JSON.parse(t); } catch (e) { /* ردٌّ غيرُ JSON (صفحةُ خطأ) ⇒ j=null فيُعامَل فشلاً صريحاً */ } return { status: r.status, j: j, t: t }; }); });
  }
  /* حالةُ المهمة من منظور الموظف: ما يقرّره الخادمُ وحده (مراجعة · إعادة · تعثّر · إلغاء · إعادةُ إسناد) يُؤخذ منه، وما يتغيّر بالساعة يُعاد
     حسابُه هنا (جديدة ⇐ منقضية ⇐ قادمة) — وصفٌّ من خادمٍ أقدم بلا ph يُشتقّ كما في المرحلة الأولى */
  function phase(r, now) {
    if (r.ph && r.ph !== 'new' && r.ph !== 'upcoming' && r.ph !== 'expired' && r.ph !== 'running') return r.ph;
    if (r.st === 'declined') return 'declined';
    if (r.st === 'done') return 'done';
    if (r.acc) return r.stall ? 'stalled' : 'running';
    var toW = r.win && r.win.to ? r.win.to : r.e;                      /* KIVO_265 · نافذةُ التنفيذ: الانقضاءُ بعد المهلة + سماحِ التأخر (الخادمُ يحسبه win.to) */
    if (toW && now > toW) return 'expired';
    if (r.s && now < r.s) return 'upcoming';
    return 'new';
  }
  function load(force) {
    if (S.loading) return S.loading;
    var url = withUid(API + (!force && S.rev ? '?since=' + S.rev : ''));
    S.loading = req(url).then(function (x) {
      S.loading = null;
      if (x.status === 401 || (x.status === 409 && x.j && x.j.err === 'session-changed')) { S.err = 'session'; emit(); return S; }
      if (!x.j || x.j.ok !== 1) { S.err = 'load'; emit(); return S; }
      S.err = ''; S.at = Date.now(); S.me = x.j.me || S.me;
      if (!x.j.same) { S.rev = x.j.rev || 0; S.rows = x.j.rows || []; S.months = x.j.months || []; S.more = !!x.j.more; }
      emit(); return S;
    }, function () { S.loading = null; S.err = 'offline'; emit(); return S; });
    return S.loading;
  }
  function dayKey(T) { return T.y + '-' + T.m + '-' + T.d; }
  function cmpDay(a, b) { return (a.y - b.y) || (a.m - b.m) || (a.d - b.d); }
  /* كلُّ صفٍّ في قسمٍ واحد: returned (أُعيدت لاستكمال الإثبات — أولاً) · today (يومُه اليوم ولم يُغلق) · running (جاريةٌ/متعثّرةٌ من يومٍ آخر) ·
     review (سُلّمت وتنتظر قرار المراجِع) · upcoming (يومٌ قادم) · overdue (منقضيةُ المهلة بلا بدء — تبقى ظاهرةً حتى يمدّدها المسؤول أو يعيد إسنادها) ·
     history (منجزة · معتذَر عنها · ملغاة · أُعيد إسنادُها) — لا إخفاءَ لصفّ */
  function view(now, T) {
    now = now || Date.now();
    var out = { linked: !!(S.me && S.me.linked), err: S.err, loaded: S.rows !== null, n: 0, sections: SECTIONS.slice() };
    SECTIONS.forEach(function (k) { out[k] = []; });
    if (!S.rows) return out;
    var tk = T ? { y: T.y, m: T.m, d: T.d } : null;
    for (var i = 0; i < S.rows.length; i++) {
      var r = S.rows[i], ph = phase(r, now), x = Object.assign({}, r, { ph: ph });
      out.n++;
      if (ph === 'done' || ph === 'declined' || ph === 'cancelled' || ph === 'reassigned') out.history.push(x);
      else if (ph === 'returned') out.returned.push(x);
      else if (ph === 'review') out.review.push(x);
      else if (ph === 'expired') out.overdue.push(x);
      else if ((ph === 'running' || ph === 'stalled') && (!tk || cmpDay(r, tk) !== 0)) out.running.push(x);
      else if (tk && cmpDay(r, tk) > 0) out.upcoming.push(x);
      else if (tk && cmpDay(r, tk) < 0) out.running.push(x);            /* يومٌ مضى والمهمة لم تُغلق ولم تنقضِ مهلتُها (مهلةٌ ممتدّة) */
      else out.today.push(x);
    }
    var byStart = function (a, b) { return (a.s || a.at || 0) - (b.s || b.at || 0); };
    var closedAt = function (a) { return a.fin || (a.dec && a.dec.at) || (a.can && a.can.at) || (a.re && a.re.at) || a.at || 0; };
    out.today.sort(byStart); out.running.sort(byStart); out.upcoming.sort(byStart); out.review.sort(byStart);
    out.returned.sort(function (a, b) { return ((b.revd && b.revd.at) || 0) - ((a.revd && a.revd.at) || 0); });
    out.overdue.sort(function (a, b) { return (b.e || 0) - (a.e || 0); });
    out.history.sort(function (a, b) { return closedAt(b) - closedAt(a); });
    out.empty = out.n === 0;
    return out;
  }
  /* الأفعالُ المتاحة — مرآةُ 062c (meTkAct) للعرض؛ الحكمُ في الخادم */
  function can(r, now) {
    now = now || Date.now();
    var ph = phase(r, now), open = !(ph === 'done' || ph === 'declined' || ph === 'cancelled' || ph === 'reassigned');
    var o = { ack: false, start: false, decline: false, stall: false, resume: false, doc: false, submit: false, log: true };
    if (!open || !r.w) return o;
    /* KIVO_265 · نافذةُ التنفيذ (062c): البدءُ من win.from (الموعد − الدقائق المسموحة) · والتسليمُ حتى win.to (المهلة + الساعات المسموحة) — القبولُ (ack) حرّ */
    var fromW = r.win && r.win.from ? r.win.from : 0, toW = r.win && r.win.to ? r.win.to : 0;
    o.startAt = fromW; o.endAt = toW;
    if (!r.acc) {
      o.ack = !r.ack;
      o.start = ph !== 'expired' && !(fromW && now < fromW);
      o.early = !!(fromW && now < fromW);
      o.decline = r.decOk !== 0;
    } else if (ph !== 'review') {                                          /* بانتظار قرار المراجِع: لا تعديل */
      var stl = r.exe ? r.exe === 'stalled' : ph === 'stalled';            /* التنفيذُ لا حالةُ العرض: المُعادةُ قد تكون متعثّرةً أيضاً (exe=stalled) */
      o.stall = !stl;
      o.resume = stl;
      o.doc = true; o.submit = !(toW && now > toW);
      o.late = !!(toW && now > toW);
    }
    return o;
  }
  /* ما يتطلبه التسليم (ق2) — بحسب ما وُثّق حتى الآن + ما سيُرفق (add = {imgs, note, steps}) */
  function need(r, add) {
    var P = r.pol || { m: 'any', n: 1, steps: [], txt: 'صورةٌ أو ملاحظة' }, pr = r.proof || {}, a = add || {};
    var n = (pr.imgs || []).length + (a.imgs || []).length, note = String(a.note != null ? a.note : (pr.note || '')).trim();
    var done = {}; (pr.st || []).forEach(function (k) { done[k] = 1; });
    Object.keys(a.steps || {}).forEach(function (k) { if (a.steps[k]) done[k] = 1; else delete done[k]; });
    var steps = P.steps || [], left = steps.filter(function (k) { return !done[k]; }), m = P.m || 'any', pn = P.n || 1, why = '';
    if (m === 'any' && !n && !note) why = 'أرفق صورة التوثيق أو اكتب ملاحظة الإنجاز';
    else if ((m === 'img' || m === 'both') && n < pn) why = pn > 1 ? 'المهمة تتطلب ' + pn + ' صور توثيقٍ على الأقل' : 'المهمة تتطلب صورة توثيق';
    else if ((m === 'note' || m === 'both') && !note) why = 'المهمة تتطلب ملاحظةَ إنجاز';
    else if (left.length) why = 'أكمل خطوات العمل: «' + left[0] + '»';
    return { txt: P.txt || '', m: m, n: pn, steps: steps, left: left, imgs: n, ok: !why, why: why, review: !!r.rv, rv: r.rv || '' };
  }
  function patchRow(row) {
    if (!S.rows || !row) return;
    for (var i = 0; i < S.rows.length; i++) if (S.rows[i].k === row.k && String(S.rows[i].id) === String(row.id)) { S.rows[i] = row; return; }
    S.rows.push(row);
  }
  var MSG = { 'not-found': 'لم تعد هذه المهمة مسندةً إليك — حدّث الصفحة', state: 'تغيّرت حالة المهمة — حدّث الصفحة', locked: 'شهرُ المهمة معتمدٌ ومقفل',
    identity: 'المهمة مسندةٌ بمعرّفٍ قديم — يعيد المدير إسنادها', proof: 'أرفق صورة التوثيق أو اكتب ملاحظة الإنجاز', img: 'لم تُرفع صورة التوثيق — أعد الرفع',
    busy: 'تعذّر الحفظ لتعديلٍ متزامن — أعد المحاولة', denied: 'رفض الخادم الحفظ', 'not-linked': 'حسابك غير مرتبط بسجل موظف', session: 'انتهت الجلسة — سجّل الدخول',
    expired: 'انقضت مهلةُ المهمة — يمدّدها المسؤول أو يعيد إسنادها', early: 'لا يمكن البدء قبل موعد المهمة', late: 'انقضت مهلةُ التسليم — يمدّدها المسؤول أو يعيد إسنادها', policy: 'سياسةُ هذه المهمة لا تسمح بالاعتذار — تواصل مع المسؤول',
    'img-locked': 'صورةُ تسليمٍ سابق جزءٌ من سجلّ المهمة ولا تُحذف', imgs: 'بلغت المهمةُ حدَّ صور التوثيق', 'bad-body': 'طلبٌ غيرُ صالح — حدّث الصفحة وأعد المحاولة',
    'session-changed': 'تغيّرت الجلسة في هذا المتصفح (دخل حسابٌ آخر) — لم يُحفظ شيء · أعد تحميل الصفحة' };
  /* Cloud ACK only. Unconfirmed requests and image bytes stay in this page's
     memory for an explicit retry; reconnecting and reading never mutate data. */
  var drafts = Object.create(null), expired = false;
  function newIdem() { return 'q' + Date.now().toString(36) + '_' + Math.floor(1e9 * Math.random()).toString(36); }
  function online() { try { return !(typeof navigator !== 'undefined' && navigator && navigator.onLine === false); } catch (e) { return true; } }
  function sessionChanged() { return expired || !!(NS.__BS_SRV && NS.__BS_SRV.sesChanged && NS.__BS_SRV.sesChanged()); }
  function failure(err, status, uncertain) {
    return { ok: false, err: err, status: status || 0, uncertain: !!uncertain,
      msg: MSG[err] || (err === 'uncertain' ? 'لم يُحسم تأكيد الطلب السابق — أعد محاولة الإجراء نفسه قبل تغيير المسودة'
        : err === 'invalid' ? 'لم يصل إقرار كامل من الخادم — المسودة باقية في هذه الصفحة؛ أعد المحاولة بالطلب نفسه'
        : 'لم يُحفظ — لا اتصال بالخادم. المسودة باقية في هذه الصفحة؛ أعد المحاولة عند عودة الاتصال') };
  }
  function send(body) {
    if (sessionChanged()) return Promise.resolve(failure('session', 401, true));
    return req(API + '/act', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (x) {
      if (sessionChanged()) return failure('session', 401, true);
      if (x.status >= 200 && x.status < 300 && x.j && x.j.ok === 1) {
        var r = x.j.row;
        if (!Number.isSafeInteger(x.j.rev) || x.j.rev < 0 || !r || r.k !== body.k || String(r.id) !== String(body.id) || !Number.isSafeInteger(r.i) || r.i < 0)
          return failure('invalid', x.status, true);
        S.rev = x.j.rev; patchRow(r); emit(); return { ok: true, row: r, noop: !!x.j.noop };
      }
      var err = x.status === 401 ? 'session' : (x.j && x.j.err) || (x.status >= 200 && x.status < 300 ? 'invalid' : 'http-' + x.status);
      if (err === 'session' || err === 'session-changed') expired = true;
      if (err === 'not-found' || err === 'state' || err === 'busy') load(true);
      var result = failure(err, x.status, !x.j || x.status >= 500 || x.status === 429 || err === 'session' || err === 'session-changed' || err === 'invalid');
      result.msg = (x.j && x.j.msg) || MSG[err] || result.msg; return result;
    }, function () { return failure('offline', 0, true); });
  }
  function upload(im) {
    var I = NS.BassamIDB;
    return Promise.resolve().then(function () {
      if (sessionChanged()) throw new Error('session-changed');
      if (I && I.set) return I.set(im.id, im.v);
      return req('/api/img/' + encodeURIComponent(im.id), { method: 'PUT', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: im.v })
        .then(function (x) { if (!(x.status >= 200 && x.status < 300 && x.j && x.j.ok === 1 && x.j.n === im.v.length)) throw new Error('لم يصل إقرار كامل لرفع الصورة'); return true; });
    });
  }
  function attempt(draft) {
    if (draft.sending) return draft.sending;
    if (sessionChanged()) return Promise.resolve(failure('session', 401, true));
    if (!online()) return Promise.resolve(failure('offline'));
    var next = function (i) {
      if (i >= draft.imgs.length) return send(draft.body);
      var im = draft.imgs[i]; if (im.up) return next(i + 1);
      return upload(im).then(function () { im.up = 1; return next(i + 1); }, function (e) {
        return { ok: false, err: 'img', msg: 'لم تُرفع الصورة — ' + String((e && e.message) || 'تعذّر الرفع') + ' · المسودة باقية؛ أعد المحاولة' };
      });
    };
    draft.sending = Promise.resolve().then(function () { return next(0); }).then(function (result) {
      draft.sending = null; draft.uncertain = !!result.uncertain;
      if (result.ok) { delete drafts[draft.key]; if (draft.proof) result.imgs = draft.imgs.map(function (im) { return im.id; }); }
      return result;
    });
    return draft.sending;
  }
  function mutation(row, a, extra, dataUrls, meta, proof) {
    if (sessionChanged()) return Promise.resolve(failure('session', 401, true));
    var key = String(row.k) + '\u0000' + String(row.id), signature = JSON.stringify({ act: a, extra: extra || {}, images: dataUrls || [], meta: meta || [] }), draft = drafts[key];
    if (draft && draft.signature !== signature && (draft.uncertain || draft.sending)) return Promise.resolve(failure('uncertain'));
    if (!draft || draft.signature !== signature) {
      var body = Object.assign({}, JSON.parse(JSON.stringify(extra || {})), { k: row.k, id: row.id, i: row.i, act: a, idem: newIdem() });
      if (UID) body.uid = UID;
      var imgs = (dataUrls || []).map(function (v) { return { id: newImgId(), v: v, up: 0 }; });
      if (proof) {
        body.imgs = imgs.map(function (im) { S.imgs[im.id] = im.v; return im.id; });
        if (imgs.length) body.meta = imgs.map(function (im, i) { var m = meta && meta[i] && meta[i].at ? meta[i] : { at: Date.now(), lat: null, lng: null, acc: null }; return { img: im.id, at: m.at, lat: m.lat == null ? null : m.lat, lng: m.lng == null ? null : m.lng, acc: m.acc == null ? null : m.acc }; });
      }
      draft = drafts[key] = { key: key, signature: signature, body: body, imgs: imgs, proof: proof, uncertain: false, sending: null };
    }
    return attempt(draft);
  }
  function act(row, a, extra) { return mutation(row, a, extra, [], [], false); }
  function submitProof(row, a, extra, dataUrls, meta) { return mutation(row, a, extra, dataUrls, meta, true); }
  /* Keep the current profile's queue view empty. No device store is opened,
     consumed, changed or erased, and flush never sends a business request. */
  var Q = { init: function () { return Promise.resolve([]); }, forRow: function () { return []; },
    state: function () { return { n: 0, sending: false, loaded: true, items: [], failed: [] }; },
    flush: function () { return Promise.resolve({ done: true, sent: 0, n: 0 }); }, drop: function () { return Promise.resolve(); } };
  var QACT = { ack: 'تأكيد الاستلام', start: 'بدء التنفيذ', accept: 'بدء التنفيذ', decline: 'الاعتذار', stall: 'الإبلاغ بالتعثّر', resume: 'الاستئناف', doc: 'حفظ المسودّة', submit: 'التسليم', finish: 'التسليم', expire: 'الانقضاء' };
  /* سجلُّ المهمة: أحداثُ صفّي وحده بأسماء الفاعلين — والمستمدُّ من طوابع الصفّ القديم موسومٌ src:'row' */
  function log(row) {
    return req(withUid(API + '/log?k=' + encodeURIComponent(row.k) + '&id=' + encodeURIComponent(row.id))).then(function (x) {
      return x.j && x.j.ok === 1 ? { ok: true, events: x.j.events || [] } : { ok: false, err: (x.j && x.j.err) || 'http-' + x.status, events: [] };
    }, function () { return { ok: false, err: 'offline', events: [] }; });
  }
  function newImgId() { return 'img_tsk' + Date.now().toString(36) + '_' + Math.floor(1e9 * Math.random()).toString(36); }
  /* رفعُ صورة التوثيق: مسارُ الصور القائم (claim لي حتى يربطها التوثيق) — ويُعاد المعرّفُ بعد ثبوت الرفع وحده */
  function uploadProof(dataUrl) {
    var id = newImgId(), p = upload({ id: id, v: dataUrl });
    return Promise.resolve(p).then(function () { S.imgs[id] = dataUrl; return id; });
  }
  function img(id) {
    if (S.imgs[id]) return Promise.resolve(S.imgs[id]);
    return fetch(withUid(API + '/img?id=' + encodeURIComponent(id)), { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.ok ? r.text() : null; }).then(function (t) { if (t) S.imgs[id] = t; return t; }, function () { return null; });
  }
  function subscribe(fn) { subs.push(fn); return function () { subs = subs.filter(function (x) { return x !== fn; }); }; }
  function reset() { S = { rev: 0, me: null, rows: null, months: [], at: 0, err: '', loading: null, imgs: {} }; }
  /* تنبيهُ مهمةٍ جديد أو تغيّرُها: تُعاد القراءة فوراً (لا انتظارَ لدورة الدقيقة). التنبيهُ يصل الموظفَ عبر /api/changes كتغيّرٍ في مخزن التنبيهات
     (bassam:notif بعد readmodel خادمي أحدث) — لا يعتمد على مخزن تنبيهات KV متقاعد. القراءةُ بـ?since=rev فإن لم يتغيّر مخزنُ المهام فالردُّ {same:1} */
  try { window.addEventListener('bassam:notif', function (e) { var it = e && e.detail && e.detail.item; if (it && it.k === 'task') load(); }); } catch (e) { /* بلا مستمع: القراءةُ الدورية من «ملفي» تكفي */ }
  try { window.addEventListener('bassam:notif',function(e){if(e && e.detail && e.detail.changed && S.rows !== null)load();}); } catch(e) { /* Periodic profile reads remain available. */ }
  NS.BassamMyTasks = { load: load, view: view, act: act, can: can, need: need, log: log, uploadProof: uploadProof, submitProof: submitProof, img: img, phase: phase, subscribe: subscribe,
    queue: { state: Q.state, flush: Q.flush, drop: Q.drop, forRow: Q.forRow, init: Q.init, ACT: QACT }, online: online,
    state: function () { return S; }, reset: reset, dayKey: dayKey, MSG: MSG, SECTIONS: SECTIONS };
})();
