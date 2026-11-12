/* ════════════════════════════════════════════════════════════════════════════
   خادم المنصة على Cloudflare — ملف واحد (‎_worker.js) بجانب index.html
   ────────────────────────────────────────────────────────────────────────────
   ماذا يفعل؟
   ① يقدّم ملف المنصة نفسه، وقبل تسليمه يحقن window.__BS_BOOT — تماماً كما
      يفعل خادم الجهاز المحلي — فتعمل طبقة التخزين الموجودة في المنصة أصلاً
      بلا أي تغيير: القراءات من الذاكرة، والكتابات إلى POST /api/save.
   ② بيانات الفريق كلها نسخة واحدة في قاعدة D1 (جداول مجزّأة chunked حتى لا
      يصطدم مفتاح كبير بحدود حجم الصف).
   ③ تسجيل دخول حقيقي: التحقق هنا في الخادم ضد بصمات كلمات المرور
      (PBKDF2-SHA256 فقط بصيغة p2$)،
      وجلسة بكوكي HttpOnly لا تصلها يد جافاسكربت، وعمرها نفس سياسة المنصة:
      ١٢ ساعة كحد أقصى وساعتا خمول.
   ④ مخزن الحسابات bassam_auth_users_v1 يُقدَّم للمتصفحات دائماً بلا حقل ph
      (البصمات لا تغادر الخادم)، وعند حفظه القادم من المتصفح تُدمَج البصمات
      المخزونة في السجلات التي وصلت بلا ph — فتغيير كلمة مرور يمرّ، وسرقة
      البصمات من متصفح موظف لا تحدث.
   ⑤ مفاتيح خاصة بالجهاز (الجلسة، حارس المحاولات، السمة، الإدارة النشطة)
      لا تُخزَّن مركزياً إطلاقاً — لكل جهاز حاله، كأي موقع محترم.
   ⑥ صور المنصة عبر ‎/api/img/* بنفس بروتوكول خادم الجهاز حرفياً.
   ════════════════════════════════════════════════════════════════════════════ */

/* ── الثوابت ── */
var K_USERS = 'bassam_auth_users_v1';
var SESSION_MAX = 12 * 3600 * 1000;      /* عمر الجلسة الأقصى — كسياسة المنصة (يُستبدل بالسياسة المضبوطة) */
var IDLE_MAX    = 2  * 3600 * 1000;      /* الخمول الأقصى */
var LOCK_N = 5;                           /* محاولات قبل القفل */
var LOCK_MS = 300000;                     /* أقصى مدة قفل */
/* v7-C · Issue 2 (ب): إبطاءُ الحساب المستهدَف من عناوين مختلفة — مطفأ افتراضياً؛ تضبطه سياسةُ الأمن (thrOn · thrN · thrWin · thrSec) */
var THR_ON = false, THR_N = 10, THR_WIN_MS = 1800000, THR_MS = 3000;
var PRESENCE_MS = 120000;                 /* «نشط الآن» = تفاعل خلال دقيقتين */
/* ── ثوابتُ الدخول والاستعادة والمنصة (نُقلت كما هي من 016-identity-preflight-2.js عند حذفه · RISHAD-266 P5) ── */
/* سقف Cloudflare لتكرارات PBKDF2 في Web Crypto هو 100,000 — ما فوقه يُرمى NotSupportedError.
   البصمات الجديدة تُولَّد بهذا الحدّ، وما خُزّن قبله بعددٍ أعلى لا يمكن التحقق منه هنا فيُصرَّح بذلك بدل «غير صحيحة» المضلِّلة */
var PBKDF2_ITER = 100000, PBKDF2_MAX = 100000;
var ERR_ITER = 'كلمة مرور هذا الحساب محفوظة بصيغة أقوى مما يدعمه خادم Cloudflare — أعد تعيينها (للموظف: من صفحة الموظفين، ولمدير النظام: سطر إعادة الضبط في قاعدة D1)';
var K_PERM = 'bassam_perms_v1', K_DEPTS = 'bassam_depts_v1', K_GDEPTS = 'bassam_gdepts_v1';
var K_NOTIF = 'bassam_notif_v1', K_NSYS = 'bassam_notif_sys_v1';
var K_PLAT = 'bassam_platform_v1';
/* ما يجوز كشفه من إعدادات المنصة قبل الدخول: الهوية ونصوص شاشة الدخول وخيارات التطبيق — لا الرخصة ولا الدعم ولا الوحدات */
function brandPublic(plat) {
  var p = isObj(plat) ? plat : {}, L = isObj(p.login) ? p.login : {}, A = isObj(p.app) ? p.app : {};
  var pick = function (o, ks) { var r = {}; ks.forEach(function (k) { if (o[k] != null) r[k] = o[k]; }); return r; };
  var out = pick(p, ['name', 'short', 'org', 'logo', 'themeDef']);
  out.login = pick(L, ['title', 'desc', 'footer', 'legal', 'rights', 'sub', 'state', 'helpStaff', 'helpNoKey', 'showVer', 'remember', 'help']);
  out.app = pick(A, ['name', 'statusBar', 'install']);
  return out;
}
async function platGet(env) { return parseJson(await kvGet(env, 'kv', K_PLAT), {}); }
/* مفتاح الاستعادة: XXXXX-XXXXX-XXXXX-XXXXX من أحرف لا تلتبس */
function newRecoveryKey() {
  var AL = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', b = new Uint8Array(20), out = '';
  crypto.getRandomValues(b);
  for (var i = 0; i < 20; i++) { out += AL[b[i] % AL.length]; if (i % 5 === 4 && i < 19) out += '-'; }
  return out;
}
function normKey(k) { return String(k || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
async function hashKey(k) { return hashPw('rk:' + normKey(k)); }
/* سقف حجم فرق التدقيق المخزون لكل حفظة (حرفاً) */
var AUDIT_MAX = 24000;
