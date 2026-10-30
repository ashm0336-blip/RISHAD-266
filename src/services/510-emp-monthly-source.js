/* ── مصدر بيانات الموظف الشهرية ───────────────────────────────────────────────
   القاعدة (بطلب المستخدم، بعد تجربة «بيان الشهر» المجمّد وإلغائها):
   ١) اليوم الذي لا تقرير يومياً مسحوباً له: بيانات الموظف (الوردية والراحة
      والتكليف) تُقرأ من الجدول الشهري الحي كما هو الآن — أي تعديل فيه ينعكس
      فوراً على صفحة الموظف وباقي الصفحات.
   ٢) اليوم الذي سُحب تقريره: التقرير مكتفٍ بنفسه — يُنسخ إليه لحظة السحب كل
      ما يخصّ كل موظف (الوردية وتعريفها، أيام الراحة، التكليف)، فلا يتأثر
      بتعديل الجدول الشهري بعد ذلك إلا بإعادة سحبه من التقرير نفسه.
   بقيت هذه الواجهة لأن الصفحات تقرأ الجدول عبرها: all() تعيد الجدول الحي
   بلا استبدال، وبقية الدوال بلا أثر — فلا لقطة تُكتب ولا تُقرأ.               */
(function () {
  var LIVE = 'bassam_staffing_v3';
  function readLive() { var value = KIVO.__BS_SRV.operations.get(LIVE); return value && typeof value === 'object' ? value : {}; }
  function all(live) { return live && typeof live === 'object' ? live : readLive(); }
  function bucket(ym) { var live = readLive(); return (live && live[ym]) || null; }
  var no = function () { return null; };
  KIVO.BassamStaffSnap = { KEY: 'bassam_staffing_snap_v1', get: no, take: no, release: function () { return { kept: false, existed: false }; }, drop: function () {}, ensure: no, all: all, bucket: bucket, has: function () { return false; }, meta: no, consumed: function () { return false; }, ym: function (y, m) { return y + '-' + m; } };
})();
