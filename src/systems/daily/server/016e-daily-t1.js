/* ══ المتابعة اليومية (الجولات) — قراءاتٌ معلنة على ناقل الخادم لبرامجَ أخرى (V7 · د5-هـ · t1) ═══
   المضبوطات (سياقُ اليوم) لا تسمّي موردَ الجولات: تسأل بالاسم (srvBusRead).
   بغياب هذا الجزء القراءةُ undefined وسلوكُ المستهلك عند الغياب مكتوبٌ في عقده (consumes ← absent).
     daily.daysSeen@1(ctx)    وثيقةُ الجولات كما يراها صاحبُ الطلب في السياق الملتقَط (canRead ثم الإسقاط) — أو null.
     daily.resources@1()      [مفتاحُ مورد الجولات] — لمن يلتقطه في سياق الطلب دون أن يسمّيه. */
var DAILY_BUS_RES = 'bassam_rounds_v1';
srvBusProvide('daily.daysSeen@1', function (ctx) {
  var k = 'bsdept:' + ctx.d + ':' + DAILY_BUS_RES;
  if (!canRead(ctx.A, k)) return null;
  return parseJson(enfProjectStr(ctx.A, k, ctx.rawKeys[k], ctx.refs), null);
});
srvBusProvide('daily.resources@1', function () { return [DAILY_BUS_RES]; });
