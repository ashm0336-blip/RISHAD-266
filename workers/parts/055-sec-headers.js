/* ═══ درع الطلبات والاستجابات ═══
   · رؤوس حماية على كل استجابة: منع التضمين في مواقع أخرى، فرض HTTPS، منع تخمين نوع المحتوى، سياسة محتوى تقيّد
     ما تحمّله الصفحة بمصدرها (السكربتات والأنماط مضمّنة في الملف الواحد، فيلزم السماح بها كما هي).
   · حد لحجم الطلب: الحفظ 8MB · الصور 6MB · الباقي 64KB — فلا يملأ حسابٌ مخترق القاعدة.
   · مصدر الطلب: عمليات الكتابة تُقبل من الموقع نفسه فقط (طبقة ثانية فوق SameSite للكوكي). */
/* سقفُ حمولة الصورة: الواجهةُ تضغط إلى ٣٥٠ك ولا ترسل فوق ٥٠٠ك، والخادمُ
   يردّ ما فوق ٥١٢ك قبل قراءة الجسم. الصورةُ الضخمة كانت تمرّ فتتجاوز كلفةُ
   معالجتها سقفَ العامل فيُقتل الطلبُ ويصل المستخدمَ 503 بلا بيان. */
var BODY_MAX = { '/api/save': 8 * 1024 * 1024, '/api/dstats': 8 * 1024 * 1024, '/api/notifications/act': 8 * 1024 * 1024, '/api/img/': 512 * 1024 };
/* رسالةُ الحدّ بوحدةٍ يفهمها القارئ: الميغا للحفظ، والكيلو للصور */
function limMsg(path) {
  var n = bodyLimit(path);
  return n >= 1048576
    ? 'الطلب أكبر من الحد المسموح (' + Math.round(n / 1048576) + 'MB)'
    : 'الصورة أكبر من الحد المسموح (' + Math.round(n / 1024) + 'KB) — صغّرها ثم أعد المحاولة';
}
function bodyLimit(path) { if(path === '/api/backup/restore'||path === '/api/employees/transition'||path === '/api/irshad/act')return 8*1024*1024;if(path === '/api/admin/dept-wipe'||path === '/api/admin/dept-delete')return 1024*1024; if (path === '/api/custody/act') return 1024 * 1024; if (path === '/api/save' || path === '/api/dstats' || path === '/api/notifications/act') return BODY_MAX[path]; if (path.indexOf('/api/img/') === 0) return BODY_MAX['/api/img/']; return 64 * 1024; }
/* KIVO_253 · AUD-005 خطوة ٢ (SOT-048): script-src بلا 'unsafe-inline' — السكربتُ المضمَّن الوحيد في غلاف الإنتاج هو حقنُ __BS_BOOT ويحمل nonce الطلب؛
   كلُّ ما سواه أصولٌ خارجية من الأصل نفسِه ('self'). style-src تبقى 'unsafe-inline' (الأنماطُ المضمَّنة في الصفحات والمكوّنات — خطوةٌ لاحقة).
   بلا nonce (مسارٌ لا يحقن سكربتاً) يبقى الرأسُ صارماً أيضاً: لا 'unsafe-inline'. الصيغتان (الرأس · <meta> في الغلاف) من مصدرٍ واحد هنا. */
function cspHeader(nonce) { return "default-src 'self'; script-src 'self'" + (nonce ? " 'nonce-" + nonce + "'" : '') + "; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'; worker-src 'self' blob:"; }
function cspMeta(nonce) { return "default-src 'self' data: blob:; script-src 'self'" + (nonce ? " 'nonce-" + nonce + "'" : '') + "; connect-src 'self' blob: data:; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-src 'self' blob: data:; object-src 'none'; base-uri 'self'; form-action 'none'"; }
function secHeaders(url, isHtml, nonce) {
  var h = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Cross-Origin-Opener-Policy': 'same-origin'
  };
  if (!isLocal(url)) h['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  if (isHtml) h['Content-Security-Policy'] = cspHeader(nonce);
  return h;
}
function withSec(res, url, rid, nonce) {
  try {
    var ct = res.headers.get('Content-Type') || '', isHtml = ct.indexOf('text/html') >= 0;
    var h = new Headers(res.headers), add = secHeaders(url, isHtml, nonce);
    for (var k in add) h.set(k, add[k]);
    if (rid) h.set('X-Kivo-Rid', rid);   /* KIVO_250 · SOT-144: معرّفُ الطلب — يطابق rid في السجل المنظَّم وفي أجسام الأخطاء */
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
  } catch (e) { return res; }
}
