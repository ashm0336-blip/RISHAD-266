/* ═════════════════════════════════════════════════════════════════════════════════════════════════════════
   ║  KIVO_243 · ENFORCE — سجلُّ الصلاحيات v24.9 مصدرُ القرار النافذ (كلُّ بيئة — V7 · د5-ح: القفل)          ║
   ═════════════════════════════════════════════════════════════════════════════════════════════════════════
   V7 · د5-ح (القفل): لا وضعَ قديماً بعد اليوم — الخادمُ يقرّر بمحرّك الإنفاذ وحده في كل بيئة، بلا متغيّر بيئة. سطرُ D1 meta.authz_mode يقول
   هل نُقلت بياناتُ القاعدة إليه:
     • 'enforce'                        ⇒ «enforce»: المحرّكُ يقرّر للجميع.
     • غائبٌ أو أيُّ قيمةٍ أخرى ('legacy') ⇒ «unmigrated» (fail-closed بحالةٍ معلنة): مديرُ المنصة وحده يدخل ويعمل (بالمحرّك نفسِه) ليرحّل
       (/api/authz-migrate: perm · perm44-roles … ثم act:'activate')، وكلُّ طلبٍ لغيره 503 authz_unmigrated برسالةٍ صريحة — لا سماحَ صامتاً
       ولا قفلَ صامتاً، ولا مسارَ قديماً يقرّر.
     • تعذّرُ القراءة                    ⇒ «unavailable» (وضعُ الحماية · ADR-003) كما كان.
   • القاعدةُ الجديدة تولد مقفلة: أداةُ المدير الأول (tools/provision_first_admin.mjs) تكتب authz_mode='enforce' — لا بياناتٍ قديمة فيها تُرحَّل.
   • KIVO_AUTHZ_MODE لم يعد مفتاحَ المحرّك؛ يبقى شرطاً لأداة الاختبار وحدها (enfFixtureOn) كما كانت (Preview وحدها).
   الأجزاء: (1) الوضع والمفاتيح المحمولة · (2) النطاق · (3) الكتابة · (4) القراءة والإسقاط والدمج · (5) الحفظة والتدقيق ·
            (6) واجهاتُ الحالة والترحيل والرجوع · (7) حقنُ الإقلاع. */
var ENF_VER = 'KIVO_265 · enforce 2 (fail-closed · host-guard · ph-strip · schema · logs · sess · pre · ph-new · first-plan · read-ceiling · self-fields · az-staffing · tasks)';
var ENF_SCOPE_RES = 'bassam_scope_v1';
function enfEnvOn(env) { return !!(env && String(env.KIVO_AUTHZ_MODE || '').trim().toLowerCase() === 'enforce'); }
/* V7 · د5-ح: المحرّكُ يقرّر في «enforce» و«unmigrated» (والثانيةُ لمدير المنصة وحده — enfUnmigratedFor) */
function enfDecides(M) { return !!M && (M.mode === 'enforce' || M.mode === 'unmigrated'); }
function enfUnmigratedFor(M, u) { return !!M && M.mode === 'unmigrated' && !(u && u.role === 'super'); }
var ENF_CLOSED = { mode: 'closed', closed: 1, ver: ENF_VER };   /* فاعلٌ خارج مسار الطلب: المحرّكُ يقرّر بلا سماحٍ زائد (017 actorOf) */
/* أداةُ بيانات الاختبار وجلسةُ الاختبار الداخلية: متغيّرٌ مستقلّ يُضبط لـPreview وحدها — لا أثر له بلا وضع الإنفاذ في ENV */
function enfFixtureOn(env) { return enfEnvOn(env) && String(env.KIVO_TEST_FIXTURE || '').trim().toLowerCase() === 'allow'; }
async function enfModeOf(env) {
  var out = { mode: 'unmigrated', env: enfEnvOn(env), d1: null, perm: null, scope: null, ident: null, fixture: enfFixtureOn(env), ver: ENF_VER };
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
  /* KIVO_244 · ADR-003 (SOT-172 / AUD-001): تعذّرُ قراءة meta ⇒ وضعُ الحماية «unavailable» (fail-closed).
     V7 · د5-ح: وسطرٌ يُقرأ بقيمة غير enforce (أو غائب) ⇒ «unmigrated» — لا نظامَ قديماً يعود. */
  out.mode = out.unavailable ? 'unavailable' : (out.d1 === 'enforce' ? 'enforce' : 'unmigrated');
  return out;
}
/* ── V7 · د5-ح: «لم تُرحَّل بعد» — قاعدةٌ لم تُختم enforce: غيرُ مدير المنصة يُرفض بلا تنفيذ برسالةٍ صريحة (503) حتى يُكمل مديرُ المنصة الترحيل ── */
var ENF_UNMIG_MSG = 'الصلاحيات قيد النقل إلى النظام الجديد: لا يعمل الحساب حتى يُكمل مدير المنصة الترحيل. لم يُنفَّذ الطلب.';
async function enfUnmigrated(env, request, path) {
  var rm = reqMeta(request);
  await secLog(env, { act: 'authz_unmigrated', detail: (request.method + ' ' + path).slice(0, 120), ip: rm.ip, city: rm.city, dev: rm.dev });
  logEv('warn', 'authz-unmigrated', { rid: env.__rid, m: request.method, p: path, st: 503 });
  return json({ ok: 0, err: 'authz_unmigrated', msg: ENF_UNMIG_MSG, rid: env.__rid }, 503, { 'Retry-After': '60' });
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
/* ═══ برومت 43 · الجذر 1: إعفاءُ مدير المنصة في نقطةٍ واحدة ═══
   قرارُ المالك: مديرُ المنصة بلا أي قيد (صلاحية · نطاق · فترة · سبب · قفل · تصنيف…) مع بقاء التدقيق. كلُّ قرار رفضٍ يخرج من قرار الإنفاذ (enfDecide)
   أو من فحص الكتابة (canWrite) يمرّ من هنا: إن كان الفاعلُ مديرَ المنصة والرفضُ «قيداً» رُفع (يُسجَّل ما رُفع في lifted). ويبقى حتى له ما هو
   «سلامةُ بيانات» لا صلاحية — القائمةُ ENF_SUPER_KEEPS — وما وُسم invariant أو structural. كلُّ نوع رفضٍ في الخادم يجب أن يُصنَّف في إحدى القائمتين
   (اختبارٌ حارس: tests/unit/v7_fix_super_gate.test.mjs) — نوعٌ جديد غيرُ مصنَّف يُفشله. */
var ENF_SUPER_KEEPS = { shape: 'شكلُ البيانات', unknown: 'موردٌ غير معروف', device: 'مفتاحُ جهاز', unit: 'معرّفٌ ليس وحدةَ بيانات', 'unit-delete-route': 'حذفُ الوحدات له مسارُه',
  keydel: 'حذفُ المفتاح كلِّه', append: 'سجلٌّ يُلحق به ولا يُعدَّل', users: 'شكلُ سجل الحسابات', perms: 'شكلُ سجل الصلاحيات', ph: 'بصمةُ كلمة المرور', self: 'حسابُ الفاعل نفسِه',
  target: 'هدفُ منحٍ غير صالح', grant: 'منحٌ غير صالح', cap: 'منحٌ خارج سقف الإدارة', 'scope-retired': 'حقلٌ قديمٌ أُلغي', 'p44-grants': 'منحُ الدور لا يطابق سجلَّ الأدوار', dstats: 'شكلُ الإحصائيات اليومية', unmapped: 'انتقالٌ محجوزٌ لا عمليةَ حيّةً له' };
var ENF_SUPER_LIFTS = { perm: 1, scope: 1, 'scope-unknown': 1, reason: 1, residual: 1, unbound: 1, dept: 1, view: 1, flag: 1, own: 1, mgr: 1, 'super': 1 };
function enfSuperGate(A, out) {
  if (!out || out.ok || !A || !A.u || A.u.role !== 'super') return out;
  if (out.invariant || out.structural || ENF_SUPER_KEEPS[out.why] || !ENF_SUPER_LIFTS[out.why]) return out;
  return enfOk(out.keys || [], { path: 'super', lifted: out.why, liftedDetail: out.detail || '', items: out.items || 0 });
}
function enfNo(why, x) { var o = { ok: false, why: String(why || 'deny') }; if (x) for (var q in x) o[q] = x[q]; return o; }
function enfUniq(a) { var s = {}, o = [], i; for (i = 0; i < (a || []).length; i++) if (!s[a[i]]) { s[a[i]] = 1; o.push(a[i]); } return o; }

