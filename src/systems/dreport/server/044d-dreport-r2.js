/* ══ التقرير اليومي — قراءاتٌ معلنة على ناقل الخادم لبرامجَ أخرى (V7 · د5-هـ · r2) ═══
   المهام (أهليةُ الإسناد) والمضبوطات (سياقُ اليوم) لا تسمّي موردَ التقرير: تسأل بالاسم (srvBusRead).
   بغياب هذا الجزء القراءةُ undefined وسلوكُ المستهلك عند الغياب مكتوبٌ في عقده (consumes ← absent).
     dreport.doc@1(env, d)         وعدٌ بوثيقة التقرير كلِّها من المخزن التشغيلي (أو null) — قراءةُ خادمٍ بلا إسقاط: المستهلكُ يحكم بها ولا يعرضها.
     dreport.docSeen@1(ctx)        وثيقةُ التقرير كما يراها صاحبُ الطلب في السياق الملتقَط (canRead ثم الإسقاط) — أو null.
     dreport.resources@1(…kinds)   أسماءُ موارد التقرير بحسب النوع: doc · leaveKinds (بلا نوعٍ: كلُّها). */
var DREPORT_BUS_RES = { doc: 'bassam_dreport_v1', leaveKinds: 'bassam_leave_kinds_v1' };
function dreportBusKey(d, kind) { return 'bsdept:' + d + ':' + DREPORT_BUS_RES[kind]; }
srvBusProvide('dreport.doc@1', async function (env, d) { return parseJson(await opResourceGet(env, dreportBusKey(d, 'doc')), null); });
srvBusProvide('dreport.docSeen@1', function (ctx) {
  var k = dreportBusKey(ctx.d, 'doc');
  if (!canRead(ctx.A, k)) return null;
  return parseJson(enfProjectStr(ctx.A, k, ctx.rawKeys[k], ctx.refs), null);
});
srvBusProvide('dreport.resources@1', function () {
  var kinds = arguments.length ? Array.prototype.slice.call(arguments) : Object.keys(DREPORT_BUS_RES);
  return kinds.map(function (kind) { return DREPORT_BUS_RES[kind]; }).filter(Boolean);
});
