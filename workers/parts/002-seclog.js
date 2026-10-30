/* ═══ سجل أحداث الأمن — منفصل عن تدقيق البيانات ═══
   act: login_ok · login_fail · lock · logout · sess_kill · pw_change · acct_add · acct_del · acct_freeze · acct_unfreeze ·
        perm_change · denied · policy_change · guard_unlock · admin */
function secStmt(env, e) {
  return env.DB.prepare('INSERT INTO sec (ts, uid, un, act, target, detail, ip, city, dev) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)')
    .bind(e.ts || Date.now(), e.uid || '', e.un || '', e.act, e.target || '', e.detail == null ? '' : String(e.detail).slice(0, 600), e.ip || '', e.city || '', e.dev || '');
}
async function secLog(env, e) { try { await secStmt(env, e).run(); } catch (x) { swallow('seclog', x, env && env.__rid); } }   /* KIVO_250: سجلُّ الأمن لا يُسقط طلباً — لكنّ فشلَه يُرى */
function reqMeta(request) {
  var cf = request.cf || {};
  var ua = request.headers.get('User-Agent') || '';
  var dev = /Mobi|Android|iPhone|iPad/i.test(ua) ? 'm' : 'd';
  var city = [cf.city, cf.country].filter(Boolean).join(' · ');
  return { ip: request.headers.get('CF-Connecting-IP') || '', city: city, dev: dev, ua: ua.slice(0, 200) };
}
var CHUNK = 700000;                       /* حجم قطعة التخزين للقيم الكبيرة */
var COOKIE = 'bs_tok';
/* مفاتيح جهازٍ لا فريق: لا تُقبل حفظاً ولا تُحقن — لكل متصفح نسخته */
var DEVICE_KEYS = { 'bassam_session_v1':1, 'bslg_v1':1, 'bassam_theme':1, 'bassam_active_dept_v1':1, 'bassam_fresh_login_v1':1 };
/* «آخر صفحة مفتوحة» (bassam_page_v1:…) تفضيلُ جهاز كذلك — لا يُخزَّن ولا يُحقن */
/* R187: و«مجموعات | قائمة» في الجدول الشهري (bassam_st_grp_v1، لكل إدارة) تفضيلُ عرضٍ لهذا الجهاز كذلك */
function isDeviceKey(k) { return !!DEVICE_KEYS[k] || /(^|:)bassam_page_v1:/.test(String(k)) || /(^|:)bassam_st_grp_v1$/.test(String(k)); }
var PW_MIN = 6;
var WORKER_VER = '2026.10.14-165';
/* ══ KIVO_250 · SOT-142/144 · AUD-021 — سجلٌّ منظَّم: سطرُ JSON واحد لكل حدث عبر console (يلتقطه Workers Logs/Logpush) ══
   المخطّط v1: { v, t, lvl: error|warn|info, ev, ver, rid?, m?, p?, st?, op?, err?, … } — بلا بياناتٍ شخصية (لا un/ip/قيم)؛ معرّفُ الطلب rid يربط
   الواجهة (ردُّ الخطأ ورأسُ X-Kivo-Rid) بالسجل. swallow(): الاستثناءُ المبتلَع عمداً (أثرٌ جانبي best-effort) يُسجَّل تحذيراً بوسمه بدل catch فارغ. */
var LOG_SCHEMA = 1;
function logEv(lvl, ev, f) {
  var o = { v: LOG_SCHEMA, t: new Date().toISOString(), lvl: lvl, ev: ev, ver: WORKER_VER }, k;
  if (f) for (k in f) if (f[k] !== undefined && f[k] !== null && f[k] !== '') o[k] = f[k];
  try { var s = JSON.stringify(o); if (lvl === 'error') console.error(s); else if (lvl === 'warn') console.warn(s); else console.log(s); } catch (eL) { /* السجلُّ نفسُه لا يُسقط طلباً */ }
}
function errMsg(e) { return String((e && e.message) || e || '').slice(0, 200); }
function swallow(op, e, rid) { logEv('warn', 'swallowed', { op: op, err: errMsg(e), rid: rid }); }
function ridNew() { try { return crypto.randomUUID().replace(/-/g, '').slice(0, 12); } catch (eR) { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); } }
/* KIVO_253 · AUD-005 خطوة ٢: nonce لكل طلب — السكربتُ المضمَّن الوحيد (__BS_BOOT) يحمله، ورأسُ CSP يقبله بدل 'unsafe-inline' */
function nonceNew() { try { var a = new Uint8Array(16); crypto.getRandomValues(a); var s = ''; for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); } catch (eN) { return btoa(ridNew() + Math.random().toString(36).slice(2, 10)); } }
