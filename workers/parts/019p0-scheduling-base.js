// V7 · د5-د: مواردُ الجدولة التي للقاعدة لا لبرنامج — خياراتُ الورديات، ووردياتُ اليوم، وتركيزُ اليوم القديم.
// كانت في جزء الجدول الشهري (019p1) مع موارده؛ فُصلت ليخرج الجدولُ ببرنامجه وتبقى هذه.
function osSchemaBaseResources() {
  return [
    {
      resource: "bassam_shift_options_v1",
      name: "shifts",
      schema: ocArray("ops_shift_options", osSchemaShift("ops_shift_option")),
    },
    {
      resource: "bassam_dayshift_v1",
      name: "dayShift",
      schema: ocMap("ops_day_shifts", ocScalar("text")),
    },
    // Current day-focus is per-tab/device. This describes old cloud bytes only.
    {
      resource: "bassam_dayfocus_v1",
      name: "legacyDayFocus",
      schema: ocObject("ops_legacy_day_focus", osSchemaFields(["y", "m", "d"])),
    },
  ];
}
/* V7 · 53 (التخزين بالفترة): هنا وحده يُقرأ نصُّ مفتاح الفترة القائم ('1448-6-14' · 'm:1448-6' · '1448-6') — طبقةُ الفترات (019w) لا تعرف شكلَ التاريخ.
   grp: الشهرُ الذي تنتمي إليه الفترة (نصُّه كما هو) · seq: ترتيبٌ عددي (لا نصّي: '1448-10' بعد '1448-9') · kind: day | mctl | month (لحدّ الحجم).
   ctx: ما يلزم أحكامَ الحفظ من فتراتٍ أخرى (اليومُ ⇐ علامةُ شهره). إن اعتُمد التقويمُ لاحقاً تغيّر هذا الموضعُ وحده. */
function osPeriodIndex(p) {
  var m = /^(m:)?(\d+)-(\d+)(?:-(\d+))?/.exec(String(p));
  if (!m) return { grp: '', seq: 0, kind: 'day' };
  return { grp: m[2] + '-' + m[3], seq: (Number(m[2]) * 100 + Number(m[3])) * 100 + (m[4] ? Number(m[4]) : 0), kind: m[1] ? 'mctl' : m[4] ? 'day' : 'month' };
}
function osPeriodCtx(p) { var m = /^(\d+-\d+)-\d+/.exec(String(p)); return m ? ['m:' + m[1]] : []; }
function osSumNum(x) { return typeof x === 'number' && isFinite(x) ? x : 0; }
/* ملخّصاتُ الفترة (ops_period_summary): أعدادٌ تُحسب من قيمة الفترة المحفوظة في الدفعة نفسِها — لا يحملها سجلٌّ شخصي */
function osSumRounds(p, v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return { kind: 'scalar' };
  if (/^m:/.test(p)) return { ap: v.ap ? 1 : 0, mo: v.mo ? 1 : 0, open: Object.keys(v.dopen || {}).length, shut: Object.keys(v.dshut || {}).length };
  var out = { floors: 0, zones: 0, readings: 0, observed: 0, capacity: 0, ap: v.ap ? 1 : 0, fst: {}, prayers: {} };
  (Array.isArray(v.d) ? v.d : []).forEach(function (f) {
    if (!f || typeof f !== 'object') return; out.floors++;
    (Array.isArray(f.zones) ? f.zones : []).forEach(function (z) {
      if (!z || typeof z !== 'object') return; out.zones++;
      if (z.fst) out.fst[z.fst] = (out.fst[z.fst] || 0) + 1;
      var pc = z.pc && typeof z.pc === 'object' ? z.pc : {};
      Object.keys(pc).forEach(function (k) {
        var r = pc[k], n = typeof r === 'number' ? r : r && typeof r === 'object' ? osSumNum(r.n) : 0, cap = r && typeof r === 'object' ? osSumNum(r.cap) : 0;
        if (r == null) return; var P = out.prayers[k] || (out.prayers[k] = { readings: 0, observed: 0, capacity: 0 });
        P.readings++; P.observed += n; P.capacity += cap; out.readings++; out.observed += n; out.capacity += cap;
      });
    });
  });
  return out;
}
function osSumStaffing(p, v) {
  var out = { employees: 0, byShift: {}, leaves: 0, perms: 0 };
  Object.keys(v && typeof v === 'object' ? v : {}).forEach(function (e) {
    var r = v[e]; if (e === '__shifts' || !r || typeof r !== 'object') return; out.employees++;
    if (r.shift) out.byShift[r.shift] = (out.byShift[r.shift] || 0) + 1;
    if (Array.isArray(r.leaves) && r.leaves.length) out.leaves++;
    if (Array.isArray(r.perm) && r.perm.length) out.perms++;
  });
  return out;
}
function osSumPlan(p, v) { var d = v && typeof v === 'object' ? (Array.isArray(v) ? v : v.d) : null; return { floors: Array.isArray(d) ? d.length : 0, zones: (Array.isArray(d) ? d : []).reduce(function (n, f) { return n + (f && Array.isArray(f.zones) ? f.zones.length : 0); }, 0) }; }
function osSumReport(p, v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return { kind: 'scalar' };
  if (/^m:/.test(p)) return { ap: v.ap ? 1 : 0, mo: v.mo ? 1 : 0, open: Object.keys(v.dopen || {}).length, shut: Object.keys(v.dshut || {}).length };
  var out = { shifts: 0, roster: 0, byStatus: {}, byShift: {} };
  Object.keys(v.shifts && typeof v.shifts === 'object' ? v.shifts : {}).forEach(function (sh) {
    var s = v.shifts[sh]; out.shifts++;
    (s && Array.isArray(s.roster) ? s.roster : []).forEach(function (r) { out.roster++; var st = r && r.st ? String(r.st) : ''; out.byStatus[st] = (out.byStatus[st] || 0) + 1; out.byShift[sh] = (out.byShift[sh] || 0) + 1; });
  });
  return out;
}
function osSumTasks(p, v) { var out = { total: 0, byStatus: {} }; (Array.isArray(v) ? v : []).forEach(function (r) { out.total++; var st = Array.isArray(r) && r[3] != null ? String(r[3]) : ''; out.byStatus[st] = (out.byStatus[st] || 0) + 1; }); return out; }
/* V7 · 53: شهرُ اليوم التشغيلي بنصّ المفتاح القائم ('1448-6') — مرجعُ الإسقاط في القراءة بالفترة (019r) يقرأ شهرَه وحده من الجدول */
function osPeriodNowMonth() { var T = dsToday(Date.now()); return T ? T.y + '-' + T.m : ''; }
