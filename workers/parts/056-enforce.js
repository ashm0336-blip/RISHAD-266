/* ═════════════════════════════════════════════════════════════════════════════════════════════════════════
   ║  KIVO_243 · ENFORCE — سجلُّ الصلاحيات v24.9 مصدرُ القرار النافذ (بيئة Preview وحدها)                    ║
   ═════════════════════════════════════════════════════════════════════════════════════════════════════════
   القرار:  ENV (KIVO_AUTHZ_MODE = enforce)  ∧  D1 (meta.authz_mode = enforce)  ⇒  الإنفاذ
            وأيُّ حالةٍ غيرِها (متغيّرٌ غائب · قيمةٌ أخرى · سطرٌ غائب · خطأُ قراءة)  ⇒  النظامُ القديم حرفاً بحرف.
   • Production بلا المتغيّر ⇒ لا قراءةَ لـD1 لأجله أصلاً، ولا يتغيّر مسارٌ واحد من مسارات KIVO_242.
   • مفتاحُ الطوارئ: UPDATE meta SET v = 'legacy' WHERE k = 'authz_mode' ⇒ يعود النظامُ القديم من الطلب التالي بلا نشر.
   • كلُّ خطّافٍ في الكود القائم مشروطٌ بـ A.enf (لا يُضبط إلا في وضع الإنفاذ) — فالمسارُ القديم لا يرى شيئاً جديداً.
   الأجزاء: (1) الوضع والمفاتيح المحمولة · (2) النطاق · (3) الكتابة · (4) القراءة والإسقاط والدمج · (5) الحفظة والتدقيق ·
            (6) واجهاتُ الحالة والترحيل والرجوع · (7) حقنُ الإقلاع. */
var ENF_VER = 'KIVO_265 · enforce 2 (fail-closed · host-guard · ph-strip · schema · logs · sess · pre · ph-new · first-plan · read-ceiling · self-fields · az-staffing · tasks)';
var ENF_SCOPE_RES = 'bassam_scope_v1';
function enfEnvOn(env) { return !!(env && String(env.KIVO_AUTHZ_MODE || '').trim().toLowerCase() === 'enforce'); }
/* أداةُ بيانات الاختبار وجلسةُ الاختبار الداخلية: متغيّرٌ مستقلّ يُضبط لـPreview وحدها — لا أثر له بلا وضع الإنفاذ في ENV */
function enfFixtureOn(env) { return enfEnvOn(env) && String(env.KIVO_TEST_FIXTURE || '').trim().toLowerCase() === 'allow'; }
async function enfModeOf(env) {
  var out = { mode: 'legacy', env: enfEnvOn(env), d1: null, perm: null, scope: null, ident: null, fixture: enfFixtureOn(env), ver: ENF_VER };
  if (!out.env) return out;
  try {
    var rows, i, P = env.__pre;
    if (P && P.live && P.meta) rows = ['authz_mode', 'authz_perm_mig', 'authz_scope_mig', 'authz_id_mig'].filter(function (k) { return P.meta[k] != null; }).map(function (k) { return { k: k, v: P.meta[k] }; });   /* KIVO_255 · AUD-037: من لقطة الطلب (جُلبت بدفعةٍ واحدة) — تعذّرُ الجلب يُبقي اللقطةَ غائبةً فيُقرأ هنا مباشرةً كما قبل 255 (fail-closed كما هو) */
    else { var r = await env.DB.prepare("SELECT k, v FROM meta WHERE k IN ('authz_mode', 'authz_perm_mig', 'authz_scope_mig', 'authz_id_mig')").all(); rows = (r && r.results) || []; }
    for (i = 0; i < rows.length; i++) {
      var k = rows[i].k, v = rows[i].v;
      if (k === 'authz_mode') out.d1 = String(v == null ? '' : v).trim().toLowerCase();
      else if (k === 'authz_perm_mig') out.perm = parseJson(v, null);
      else if (k === 'authz_scope_mig') out.scope = parseJson(v, null);
      else if (k === 'authz_id_mig') out.ident = parseJson(v, null);
    }
  } catch (e) { out.d1 = null; out.err = 'meta'; out.unavailable = 1; }
  /* KIVO_244 · ADR-003 (SOT-172 / AUD-001): تعذّرُ قراءة meta في بيئة الإنفاذ ⇒ وضعُ الحماية «unavailable» (fail-closed) لا legacy —
     الإيقافُ المقصود وحده (سطرٌ يُقرأ بنجاح بقيمة غير enforce) يعيد النظامَ القديم. Production بلا المتغيّر لا تصل هنا أصلاً. */
  out.mode = out.unavailable ? 'unavailable' : (out.d1 === 'enforce' ? 'enforce' : 'legacy');
  return out;
}
/* ── وضعُ الحماية (ADR-003): ما يُسمح به بلا قرار صلاحيات = ما لا يمسّ البيانات (الهوية العامة · النبض المختصر · الخروج)؛ وكلُّ ما سواه 503 بلا تنفيذ ── */
var ENF_UNAVAIL_OPEN = { '/api/brand': 1, '/api/ping': 1, '/api/logout': 1 };
var ENF_UNAVAIL_MSG = 'النظام في وضع الحماية: تعذّر التحقق من وضع الصلاحيات مؤقتاً — لم يُنفَّذ الطلب. أعد المحاولة بعد قليل.';
async function enfUnavailable(env, request, path) {
  if (ENF_UNAVAIL_OPEN[path]) return null;
  var rm = reqMeta(request);
  await secLog(env, { act: 'authz_unavailable', detail: (request.method + ' ' + path).slice(0, 120), ip: rm.ip, city: rm.city, dev: rm.dev });
  logEv('warn', 'authz-unavailable', { rid: env.__rid, m: request.method, p: path, st: 503 });   /* KIVO_250 · SOT-142 */
  return json({ ok: 0, err: 'authz_unavailable', msg: ENF_UNAVAIL_MSG, rid: env.__rid }, 503, { 'Retry-After': '10' });
}
/* ── أداةُ الاختبار الداخلية (ADR-004 · SOT-186 / AUD-002): قيدُ المضيف + عمرُ جلسة الاختبار + كنسٌ دفاعي ── */
var ENF_TEST_TTL = 5 * 60 * 1000;
function enfTestHostOk(env, url) {
  var h = String(url.hostname || '').toLowerCase(), want = String(env.KIVO_TEST_HOST || '').trim().toLowerCase(), prod = String(env.KIVO_PROD_HOST || 'kivo-d81.pages.dev').trim().toLowerCase();
  if (!h || h === prod) return false;
  if (want) return h === want;
  /* مضيفٌ أحاديُّ الاسم (بلا نقطة: localhost · x في Miniflare) = بيئةُ تطويرٍ محلية لا يمكن أن تكون مضيفاً عاماً */
  return h.indexOf('.') === -1 || /^test\./.test(h) || h === '127.0.0.1';
}
async function enfTestSweep(env) { try { await env.DB.prepare("DELETE FROM sess WHERE dev = 'test' AND ts < ?1").bind(Date.now() - ENF_TEST_TTL).run(); } catch (e) { swallow('test-sweep', e, env.__rid); } }
/* ── الأحكام: نتيجةٌ واحدة الشكل لكل قرار ── */
function enfOk(keys, x) { var o = { ok: true, keys: keys || [] }; if (x) for (var q in x) o[q] = x[q]; return o; }
function enfNo(why, x) { var o = { ok: false, why: String(why || 'deny') }; if (x) for (var q in x) o[q] = x[q]; return o; }
function enfUniq(a) { var s = {}, o = [], i; for (i = 0; i < (a || []).length; i++) if (!s[a[i]]) { s[a[i]] = 1; o.push(a[i]); } return o; }

