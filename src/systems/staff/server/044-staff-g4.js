/* ══ الجدول الشهري — قراءاتٌ معلنة على ناقل الخادم لبرامجَ أخرى (V7 · د5-د2) ═══
   المهام (أهليةُ الإسناد) والمضبوطات (سياقُ اليوم) والاسترشاد (ورديةُ الموظف) لا تسمّي مفاتيحَ الجدول: تسأل بالاسم (srvBusRead).
   بغياب هذا الجزء القراءةُ undefined وسلوكُ المستهلك عند الغياب مكتوبٌ في عقده (consumes ← absent).
     staff.schedule@1(env, d)      وعدٌ بالجدول كلِّه من المخزن التشغيلي (أو null) — قراءةُ خادمٍ بلا إسقاط: المستهلكُ يحكم بها ولا يعرضها.
     staff.locks@1(env, d)         وعدٌ بالأشهر المعتمدة (أو null).
     staff.readable@1(A, d)        هل يقرأ صاحبُ الطلب الجدولَ في الإدارة (canRead) — لتفصيل السبب.
     staff.enabled@1(A, d)         هل الجدولُ مفعَّلٌ لصاحب الطلب في الإدارة (مفتاحُ النظام).
     staff.scheduleRef@1(ctx)      الجدولُ المرجعي في سياق الطلب الملتقَط (ctx.refs) — للحكم لا للعرض.
     staff.scheduleSeen@1(ctx)     الجدولُ كما يراه صاحبُ الطلب في السياق الملتقَط (canRead ثم الإسقاط) — أو null.
     staff.resources@1(…kinds)     أسماءُ موارد الجدول بحسب النوع: schedule · legacy · snap · locks · callsigns · permLimit (بلا نوعٍ: كلُّها). */
var STAFF_BUS_RES = { schedule: 'bassam_staffing_v3', legacy: 'bassam_staffing_v2', snap: 'bassam_staffing_snap_v1', locks: 'bassam_staffing_locks_v1', callsigns: 'bassam_callsigns_v1', permLimit: 'bassam_perm_limit_v1' };
function staffBusKey(d, kind) { return 'bsdept:' + d + ':' + STAFF_BUS_RES[kind]; }
srvBusProvide('staff.schedule@1', async function (env, d) { return parseJson(await opResourceGet(env, staffBusKey(d, 'schedule')), null); });
srvBusProvide('staff.locks@1', async function (env, d) { return parseJson(await opResourceGet(env, staffBusKey(d, 'locks')), null); });
srvBusProvide('staff.readable@1', function (A, d) { return canRead(A, staffBusKey(d, 'schedule')); });
srvBusProvide('staff.enabled@1', function (A, d) { return capOnDept(A, d, 'staff'); });
srvBusProvide('staff.scheduleRef@1', function (ctx) { return ctx.refs.staffing[ctx.d]; });
srvBusProvide('staff.scheduleSeen@1', function (ctx) {
  var k = staffBusKey(ctx.d, 'schedule');
  if (!canRead(ctx.A, k)) return null;
  return parseJson(enfProjectStr(ctx.A, k, ctx.rawKeys[k], ctx.refs), null);
});
srvBusProvide('staff.resources@1', function () {
  var kinds = arguments.length ? Array.prototype.slice.call(arguments) : Object.keys(STAFF_BUS_RES);
  return kinds.map(function (kind) { return STAFF_BUS_RES[kind]; }).filter(Boolean);
});
