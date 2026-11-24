function osSchemaRoundDay(table) {
  var fields = osSchemaFields([
    "t",
    "ap",
    "auto",
    "from",
    "synced",
    "off",
  ]);
  fields.imp = ocUnion(table + "_import", [
    ocScalar("scalar"),
    ocObject(table + "_import_source", osSchemaFields(["src", "day"])),
  ]);
  fields.d = osSchemaFloors(table + "_floors");
  fields.shAp = ocMap(
    table + "_shift_approvals",
    ocObject(table + "_shift_approval", {
      ap: ocScalar("scalar"),
      at: ocScalar("scalar"),
      byRep: ocScalar("scalar"),
      snap: osSchemaFloors(table + "_approved_floors"),
    }),
  );
  fields.mvLog = ocArray(
    table + "_moves",
    ocObject(
      table + "_move",
      osSchemaFields([
        "t",
        "kind",
        "key",
        "tok",
        "fromI",
        "toI",
        "fromLbl",
        "toLbl",
        "by",
        "name",
        // V7 · د6 (schemafix): سطرُ التقرير اليومي في سجلّ التسكين — rm (رفعٌ من الموقع) · src ("dr") كما يكتبهما Production والعميل
        "rm",
        "src",
      ]),
    ),
  );
  return ocObject(table, fields);
}
function osSchemaMonthControl(table) {
  var fields = osSchemaFields(["ap", "mo", "auto", "perm"]);
  fields.dopen = ocMap(table + "_open_days", ocScalar("scalar"));
  fields.dshut = ocMap(table + "_closed_days", ocScalar("scalar"));
  return ocUnion(table, [
    ocScalar("scalar"),
    ocObject(table + "_record", fields),
  ]);
}
// V7 · د5-هـ (م1): موردُ الجولات يسجّله جزؤها (كان في جزء خيارات الخطة 019p4).
function osSchemaRoundsResources() {
  return [
    {
      resource: "bassam_rounds_v1",
      name: "rounds",
      period: { root: 1, index: osPeriodIndex, ctx: osPeriodCtx, summary: osSumRounds, kpi: osKpiRounds, arc: { res: DAILY_ARC_RES, due: dailyArcDue }, me: 'today' },   // V7 · 53: كلُّ يومٍ وعلامةُ كلِّ شهرٍ فترة (019w)
      schema: ocMap("ops_rounds", null, {
        fixed: { __pMig: ocScalar("scalar") },
        patterns: [
          {
            pattern: OS_RX_MCTL,
            schema: osSchemaMonthControl("ops_round_month"),
          },
          {
            pattern: OS_RX_DAY_LEGACY,
            schema: osSchemaRoundDay("ops_round_day"),
          },
        ],
      }),
    },
    /* V7 · د5-ح (13): أرشيفُ الجولات — أيامُ الأشهر المقفلة. شكلُه شكلُ الجولات حرفاً فيشارك جداولَها (الصفوفُ بمفتاح المورد)،
       فلا جدولَ جديدَ ولا ترحيلَ D1: اسمُه الجذريُّ وحده في خريطة الأسماء (ops_rounds_arc ← ops_rounds). يكتبه خطوةُ الأرشفة وحدها (dailyArcPend · rounds-arc). */
    {
      resource: DAILY_ARC_RES,
      name: "rounds_arc",
      period: { root: 1, index: osPeriodIndex, ctx: osPeriodCtx, summary: osSumRounds, kpi: osKpiRounds, me: 'today' },
      late: 1,   /* نسخٌ احتياطية قبل هذه الحزمة لا تحمله: يُستعاد منها فارغاً (019t opValidateBackupDomains) */
      schema: ocMap("ops_rounds_arc", null, {
        fixed: { __pMig: ocScalar("scalar") },
        patterns: [
          {
            pattern: OS_RX_MCTL,
            schema: osSchemaMonthControl("ops_round_month"),
          },
          {
            pattern: OS_RX_DAY_LEGACY,
            schema: osSchemaRoundDay("ops_round_day"),
          },
        ],
      }),
    },
  ];
}
/* ══ V7 · د5-ح (13) · أرشيفُ الجولات: الحلُّ الجذري لملفٍّ يكبر مع الأيام ══════════════════════════════
   ملفُّ الجولات الحيّ (bsdept:<d>:bassam_rounds_v1) يحمل الأشهرَ المفتوحة وحدها + علاماتِ الأشهر كلِّها (m:y-m صغيرة: حالةُ الإقفال نفسُها)؛
   وأيامُ الشهر المقفل في الأرشيف (bsdept:<d>:bassam_rounds_arc_v1) بالشكل نفسِه { 'y-m-d': يوم }.
   الشهرُ مقفلٌ للأرشفة (dailyArcClosed) — مرآةُ isMonthAp في الصفحة مع هامش شهر:
     ① علامتُه ap (اعتمادُ الشهر صراحةً · أو تلقائياً حين اعتُمدت أيامُه كلُّها) ⇒ مقفل؛
     ② وإلا فتحُه صراحةً (mo) أو يومٌ مفتوحٌ فيه (dopen) ⇒ مفتوح؛
     ③ وإلا الشهرُ قبل الشهر الماضي (يومُ الرياض بهامش DS_GRACE) ⇒ مقفل — الشهرُ الماضي يبقى حيّاً (وردياتُ الليل · الاعتمادُ المتأخر).
   خطوةُ الأرشفة (dailyArcStep) دالّةٌ نقية: أيامُ الشهر المقفل من الحيّ إلى الأرشيف (الحيُّ يغلب)، وأيامُ الأرشيف لشهرٍ عاد مفتوحاً (أُعيد فتحُه)
   إلى الحيّ (الحيُّ يغلب) — فتطبيقُها مرّتين لا يغيّر شيئاً (idempotent). تجري في حفظة الجولات نفسِها (dailyArcPend · الدفعةُ الذرّية الواحدة)
   وفي ترحيل «rounds-arc» المحمي لما سبقها. لا يكتب الأرشيفَ العميلُ أبداً (RES_REG srv) — يُقرأ بسياسة الجولات حرفاً (RES_READ_AS). */
var DAILY_ARC_RES = 'bassam_rounds_arc_v1', DAILY_ARC_PART = 'rounds-arc';
function dailyArcDay(k) {   /* V7 · 53 تقويم: اليومُ ISO وعلامةُ شهره m:YYYY-MM من نصّه نفسِه (بلا تطبيع) */
  var m = /^(\d{4})-(\d{2})-(\d{2})(?:-.+)?$/.exec(String(k));
  return m ? { y: +m[1], m: +m[2], mk: 'm:' + m[1] + '-' + m[2] } : null;
}
function dailyArcClosed(ctrl, y, m, T) {
  var c = isObj(ctrl) ? ctrl : null;
  if (c && c.ap) return true;
  if (c && (c.mo || (isObj(c.dopen) && Object.keys(c.dopen).length))) return false;
  return !!(T && T.y > 0 && T.m > 0 && (y * 12 + m) <= (T.y * 12 + T.m) - 2);
}
/* V7 · 53 (periodsui 9): أيامُ الحيّ التي تنتقل إلى الأرشيف (شهرٌ مقفل) — حفظُ الفترة يضيفها إلى نطاقه فتنتقل في دفعته (dailyArcPend)؛ أقدمُها
   أولاً و31 يوماً على الأكثر في الحفظة (حيٌّ تراكمَ فيه تاريخٌ طويل يُفرَّغ على حفظات، لا في دفعةٍ تتجاوز الميزانية) */
/* V7 · 53 (kpi 9): v.kpi لليوم — مرآةُ _kLean (daily client) حرفاً */
var OS_KPI_ROUNDS = { top: ['ap'], zones: ['uid', 'code', 'name', 'ztype', 'zcat', 'off', 'cap', 'yard', 'region', 'level', 'pc', 'count', 'emp', 'needN', 'needS', 'fAt'],
  gates: ['gid', 'leafN', 'pOf', 'num', 'label', 'name', 'closed', 'cWhy', 'cAt', 'emp', 'needN', 'needS', 'fAt'], marks: ['label', 'name', 'kind', 'off', 'emp', 'needN', 'needS', 'fAt'] };
function osKpiRounds(p, v) { if (!v || typeof v !== 'object') return v; if (/^m:/.test(p) || Array.isArray(v)) return null; return Object.assign(osKpiPick(v, OS_KPI_ROUNDS.top), { d: osKpiFloors(v.d, OS_KPI_ROUNDS, 1) }); }
function dailyArcDue(names, ctl) {
  var T = calToday(Date.now());
  return names.filter(function (p) { var d = dailyArcDay(p); return d && dailyArcClosed(ctl[d.mk], d.y, d.m, T); })
    .sort(function (a, b) { var x = dailyArcDay(a), y = dailyArcDay(b); return (x.y * 12 + x.m) - (y.y * 12 + y.m); }).slice(0, 31);
}
function dailyArcStep(live, arc, T) {
  var L = {}, R = {}, moved = [], back = [], gone = Object.create(null), k, p;
  live = isObj(live) ? live : {}; arc = isObj(arc) ? arc : {};
  for (k in arc) if (Object.prototype.hasOwnProperty.call(arc, k)) R[k] = arc[k];
  for (k in live) {
    if (!Object.prototype.hasOwnProperty.call(live, k)) continue;
    p = dailyArcDay(k);
    if (p && dailyArcClosed(live[p.mk], p.y, p.m, T)) { R[k] = live[k]; moved.push(k); gone[k] = 1; }
    else L[k] = live[k];
  }
  for (k in R) {
    if (gone[k] || !Object.prototype.hasOwnProperty.call(R, k)) continue;
    p = dailyArcDay(k);
    if (p && dailyArcClosed(live[p.mk], p.y, p.m, T)) continue;
    if (!Object.prototype.hasOwnProperty.call(L, k)) L[k] = R[k];
    delete R[k]; back.push(k);
  }
  return { live: L, arc: R, moved: moved, back: back };
}
/* الحفظُ (019e rsSaveCommit) — الجولاتُ وثيقةٌ منطقيةٌ واحدة = الأرشيفُ تحت الحيّ؛ والتخزينُ وحده مقسوم:
   ① dailyArcPre (قبل applySave): لكل مفتاح جولاتٍ في الحفظة تُحمَّل نسختا الحيّ والأرشيف في مرجع الحفظة (مسيَّجتين)، ويصير «الحاليُّ» الذي تراه
      أحكامُ الحفظ كلُّها (الخصوصية · الدمجُ عند الكتابة · التصنيفُ · الأقفال) الوثيقةَ المنطقية — فاليومُ المؤرشف ليس «جديداً» ولا «محذوفاً» عندها.
   ② dailyArcFill (في applySave بعد الدمج عند الكتابة · قبل الحكم): يومٌ مؤرشف، أو يومٌ حيٌّ في شهرٍ مقفل، غاب عمّا أرسله العميلُ (الصفحةُ لا ترسل
      ما لم يتغيّر من الأرشيف) يبقى كما هو — الغيابُ ليس حذفاً؛ وما أُرسل منه يغلب.
   ③ dailyArcPend (بعد الحكم · قبل تصفية غير المتغيّر): القيمةُ المقبولة تُقسم بخطوة الأرشفة إلى الحيّ (الأشهرُ المفتوحة + العلامات) والأرشيف
      (الأشهرُ المقفلة) — كتابتان في الدفعة الذرّية نفسِها بنسختيهما المقروءتين (حارسُ النسخة يرفض التزامن)، ويعود المرجعُ إلى المخزَّن.
   الردُّ يسمّي ما طلبه العميلُ وحده (revs ← plan.operationKeys). والاستعادةُ (019d) تقسم ما تستعيده بالخطوة نفسِها (③ بلا ①②). */
/* V7 · 53 (S13): يومٌ يُفتح (dopen جديد) في شهرٍ مقفل — معتمد، أو ماضٍ لم يُفتح للاستدراك (mo) — لا يُقبل وحده: كان يُحفظ ولا أثرَ له
   (قاعدةُ الصفحة isMonthAp والخادم lockedIn: الشهرُ المقفل يغلب أيامَه). يعيد خريطةَ الرفض لمفتاحه أو null */
function dailyLoneDayOpen(cur, next, T) {
  var c = isObj(cur) ? cur : {}, n = isObj(next) ? next : {}, q, m, r, o, d;
  for (q in n) {
    if (!Object.prototype.hasOwnProperty.call(n, q) || !(m = /^m:(\d{4})-(\d{2})$/.exec(q))) continue;
    r = n[q] === true || n[q] === 1 ? { ap: 1 } : isObj(n[q]) ? n[q] : {}; o = isObj(c[q]) ? c[q] : {};
    var past = !!(T && T.y > 0 && (+m[1] * 12 + +m[2]) < (T.y * 12 + T.m)), locked = !!r.ap || (past && !r.mo);
    if (!locked || !isObj(r.dopen)) continue;
    for (d in r.dopen) if (Object.prototype.hasOwnProperty.call(r.dopen, d) && r.dopen[d] && !(isObj(o.dopen) && o.dopen[d])) return { why: 'day-needs-month', detail: q + '-' + d };
  }
  return null;
}
async function dailyArcPre(env, body) {
  var set = (body && body.set) || {}, cap = env.__opCapture, T = calToday(Date.now()), k, no = null;
  for (k in set) {
    if (!Object.prototype.hasOwnProperty.call(set, k) || set[k] == null || resName(k) !== 'bassam_rounds_v1') continue;
    var lone = dailyLoneDayOpen(parseJson(await opResourceGet(env, k), null), parseJson(set[k], null), T);
    if (lone) (no = no || {})[k] = lone;
  }
  if (no) return no;
  if (!cap || !cap.keys || !env.__pre || !env.__pre.live) return null;
  for (k in set) {
    if (!Object.prototype.hasOwnProperty.call(set, k) || set[k] == null || resName(k) !== 'bassam_rounds_v1') continue;
    var d = parseKey(k).dept; if (!d) continue;
    var ak = 'bsdept:' + d + ':' + DAILY_ARC_RES, liveRaw = await opResourceGet(env, k), arcRaw = await opResourceGet(env, ak);
    if (!Object.prototype.hasOwnProperty.call(cap.keys, k)) continue;   /* مرجعٌ لا يحمل القيمة: لا وثيقةَ منطقية — الخطوةُ ③ وحدها كما في الاستعادة */
    var live = parseJson(liveRaw, null), arc = parseJson(arcRaw, null), keep = Object.create(null), L = {}, q, p;
    if (!isObj(arc)) arc = {};
    for (q in arc) if (Object.prototype.hasOwnProperty.call(arc, q) && dailyArcDay(q)) { keep[q] = 1; L[q] = arc[q]; }
    if (isObj(live)) for (q in live) {
      if (!Object.prototype.hasOwnProperty.call(live, q)) continue;
      p = dailyArcDay(q); if (p && dailyArcClosed(live[p.mk], p.y, p.m, T)) keep[q] = 1;
      L[q] = live[q];
    }
    (env.__dailyArc = env.__dailyArc || Object.create(null))[k] = { live: liveRaw, keep: keep };
    if (Object.keys(arc).length && isObj(live)) cap.keys[k] = JSON.stringify(L);
  }
  return null;
}

function dailyArcFill(env, k, v, cur) {
  var X = env.__dailyArc && env.__dailyArc[k]; if (!X || v == null || cur == null) return v;
  var n = parseJson(v, null), c = parseJson(cur, null), add = 0, q;
  if (!isObj(n) || !isObj(c)) return v;
  for (q in X.keep) if (!Object.prototype.hasOwnProperty.call(n, q) && Object.prototype.hasOwnProperty.call(c, q)) { n[q] = c[q]; add++; }
  return add ? JSON.stringify(n) : v;
}
async function dailyArcPend(env, kv, reference) {
  var T = calToday(Date.now()), cap = env.__opCapture, n = kv.pend.length, i;
  for (i = 0; i < n; i++) {
    var pd = kv.pend[i];
    if (!pd || resName(pd.k) !== 'bassam_rounds_v1') continue;
    var d = parseKey(pd.k).dept; if (!d) continue;
    var X = env.__dailyArc && env.__dailyArc[pd.k];
    if (X) { pd.cur = X.live; if (cap && cap.keys) cap.keys[pd.k] = X.live; }   /* المرجعُ يعود إلى المخزَّن — والحاليُّ للمقارنة والتدقيق هو الحيُّ المخزَّن */
    if (pd.act !== 'set' || pd.v == null) continue;
    var ak = 'bsdept:' + d + ':' + DAILY_ARC_RES, ap = kv.pend.filter(function (x) { return x && x.k === ak; })[0] || null;
    var live = parseJson(pd.v, null); if (!isObj(live)) continue;
    /* الاستعادةُ تحمل الأرشيفَ كما في النسخة (ap): الخطوةُ عليه نفسِه — والعميلُ لا يحمله أبداً (srv يرفضه قبل هنا) */
    var arcRaw = ap ? (ap.act === 'set' ? ap.v : null) : await opResourceGet(env, ak), arc0 = parseJson(arcRaw, null), S = dailyArcStep(live, arc0, T);
    pd.v = JSON.stringify(S.live);
    if (ap) { if (S.moved.length || S.back.length) { ap.act = 'set'; ap.v = JSON.stringify(S.arc); } continue; }
    if (deq(S.arc, isObj(arc0) ? arc0 : {})) continue;
    var have = cap && cap.revs && Object.prototype.hasOwnProperty.call(cap.revs, ak) ? cap.revs[ak] : ((reference && reference.inputRevs && reference.inputRevs[ak]) || 0);
    kv.pend.push({ k: ak, act: 'set', cur: arcRaw == null ? null : arcRaw, v: JSON.stringify(S.arc), have: have, kvS: [], secS: [], dep9: false, img9: null });
  }
}
/* ترحيلُ «rounds-arc» (063 /api/authz-migrate · مديرُ المنصة وحده · بيئةُ الإنفاذ): ينقل الأيامَ المقفلة الموجودة قبل هذه الحزمة — المسارُ المحميّ نفسُه:
   خطةٌ حتمية (البذرة · لحظةُ التوليد · القيم ونسخُها) ⇒ تغيّرٌ بينها وبين التطبيق = plan-changed؛ لقطةٌ كاملة (الحيّ والأرشيف) قبل الكتابة؛ الرجوعُ يعيدهما حرفاً.
   الثانيةُ بلا كتابة (applied:0). لكل إدارة: الأيامُ المنقولة وحجمُ الملف الحيّ قبل/بعد. */
async function dailyArcMigPlan(env, seed, now, T, keys, revs, capture) {
  var W = {}, sig = [DAILY_ARC_PART, seed], tot = { moved: 0, back: 0, liveBefore: 0, liveAfter: 0 };
  var plan = { version: ENF_VER, seed: seed, today: T, generated: now, parts: [DAILY_ARC_PART], writes: [], arc: [] };
  Object.keys(keys).filter(function (k) { return /^bsdept:[^:]+:bassam_rounds_v1$/.test(k); }).sort().forEach(function (lk) {
    var d = parseKey(lk).dept, ak = 'bsdept:' + d + ':' + DAILY_ARC_RES, live = parseJson(keys[lk], null);
    if (!isObj(live)) return;
    var S = dailyArcStep(live, parseJson(keys[ak], {}), T);
    if (!S.moved.length && !S.back.length) return;
    var lv = JSON.stringify(S.live), av = JSON.stringify(S.arc);
    [[lk, lv], [ak, av]].forEach(function (x) {
      W[x[0]] = { v: x[1], kind: DAILY_ARC_PART };
      plan.writes.push({ k: x[0], kind: DAILY_ARC_PART, bytes: x[1].length, existed: keys[x[0]] != null, rev: revs[x[0]] || 0 });
      sig.push(x[0] + '\u0001' + (revs[x[0]] || 0) + '\u0001' + (keys[x[0]] == null ? '\u0000' : keys[x[0]]) + '\u0001' + x[1]);
    });
    tot.moved += S.moved.length; tot.back += S.back.length; tot.liveBefore += String(keys[lk]).length; tot.liveAfter += lv.length;
    plan.arc.push({ dept: d, moved: S.moved.slice(0, 400), back: S.back.slice(0, 400), liveBefore: String(keys[lk]).length, liveAfter: lv.length });
  });
  plan.hash = await enfSha(sig.join('\u0002'));
  plan.counts = { writes: plan.writes.length, moved: tot.moved, back: tot.back, liveBefore: tot.liveBefore, liveAfter: tot.liveAfter };
  return { plan: plan, W: W, keys: keys, revs: revs, guards: capture.guards, snapshots: capture.snapshots };
}
