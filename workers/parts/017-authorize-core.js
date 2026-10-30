/* ═══ التفويض في الخادم ═══════════════════════════════════════════════════
   كانت البوابة تتحقق أن الحافظ مسجّل دخول فحسب، وتأخذ منه أي مفتاح بأي
   قيمة — فالصلاحيات كلها كانت تُطبَّق في المتصفح وحده. هنا تُعاد قراءة
   الأدوار والصلاحيات المخزونة نفسها (bassam_auth_users_v1 وbassam_perms_v1)
   ويُقاس عليها كل مفتاح قبل كتابته:
   · مفتاح إدارة (bsdept:<id>:…) لا يكتبه إلا من الإدارةُ في نطاقه، وبشرط
     أن يملك فعل كتابة على صفحةٍ تخصّ هذا المفتاح.
   · الحسابات والصلاحيات: مدير النظام حرّ، ومدير الإدارة داخل إدارته وعلى
     حسابات موظفيه فقط، والموظف على كلمة مروره وحدها.
   · الإدارات والإدارات العامة: مدير النظام وحده.
   المفتاح المرفوض لا يُكتب ويعود للمتصفح مع قيمته الحالية ليرجع عنه. */
var WRITE_ACTS = { add: 1, edit: 1, del: 1, approve: 1 };
/* KIVO_264 · D14 · OD-7 (ب): ما يغيّره صاحبُ الحساب في سجلّه هو — بحسب دوره. كانت القائمةُ واحدةً لكل الأدوار ['ph','name','email','phone','un','alt']
   فيغيّر الموظفُ ومديرُ العقدة اسمَ دخولهما (الهوية/الجوال) واسمَيهما بحفظٍ مصنوع والواجهةُ تمنعهما — فيُعاد نسبُ أحداثهما في سجلّ الأنشطة
   ويُعرض رقمٌ يختاره المستخدمُ هويةً له. ما ليس في قائمة الدور (الدور · الإدارة · المفتاح · الرقم الوظيفي · الحالة · …) لا يغيّره صاحبُه أبداً.
   واسمُ الدخول (SELF_CUR_FIELDS) لا يتغيّر — حيث تسمح القائمة — إلا بكلمة المرور الحالية «cur» في الطلب نفسِه وبصيغة 10 أرقام (selfAcctWhy · 018). */
var SELF_FIELDS_BY_ROLE = {
  staff: ['ph'],                                        /* الموظف · مديرُ الإدارة المعيَّن (mgr:<did>) · الموظفُ بصفة مدير — كلمةُ المرور وحدها */
  gm: ['ph', 'email', 'phone'],                         /* مديرُ العقدة — كلمةُ المرور وبياناتُ الاتصال (لا الاسمُ ولا أسماءُ الدخول) */
  super: ['ph', 'name', 'email', 'phone', 'un', 'alt']  /* مديرُ النظام — كلُّها، واسمُ الدخول بـ cur */
};
var SELF_CUR_FIELDS = ['un', 'alt'];
function selfFieldsOf(u) { return (u && Object.prototype.hasOwnProperty.call(SELF_FIELDS_BY_ROLE, u.role)) ? SELF_FIELDS_BY_ROLE[u.role] : ['ph']; }   /* دورٌ آخر (حسابُ إدارةٍ قديم dept …) ⇒ كلمةُ المرور وحدها */
/* أي صفحة تكتب هذا المفتاح: pages = كتابة كاملة بفعل كتابة على إحداها؛
   via = صفحات تكتب فيه كتابةً ضيّقة (كرمز النداء الذي يسجّله التقرير اليومي في
   الجدول الشهري) — تُقبل إن انحصر الفرق في المواضع المسموحة فقط */
function endsAny(p, arr) { for (var i = 0; i < arr.length; i++) if (p === arr[i] || p.slice(-(arr[i].length + 1)) === '.' + arr[i]) return true; return false; }
var CS_ONLY = function (d) { return /^\d{4}-\d{1,2}\.[^.]+\.cs$/.test(d.p) || (/^\d{4}-\d{1,2}\.[^.]+$/.test(d.p) && d.f === undefined && isObj(d.t) && Object.keys(d.t).every(function (q) { return q === 'cs'; })) || (/^\d{4}-\d{1,2}$/.test(d.p) && d.f === undefined && isObj(d.t) && Object.keys(d.t).every(function (ek) { return isObj(d.t[ek]) && Object.keys(d.t[ek]).every(function (q) { return q === 'cs'; }); })); };
/* بيان الشهر من التقرير اليومي: رمز النداء لموظف داخل البيان، أو أخذ بيان شهرٍ معتمد بلا بيان عند أول سحب (شهر كامل جديد لا تعديل موجود) */
var SNAP_CS_ONLY = function (d) { return /^\d{4}-\d{1,2}\.bucket\.[^.]+\.cs$/.test(d.p) || (/^\d{4}-\d{1,2}\.bucket\.[^.]+$/.test(d.p) && d.f === undefined && isObj(d.t) && Object.keys(d.t).every(function (q) { return q === 'cs'; })) || (/^\d{4}-\d{1,2}$/.test(d.p) && d.f === undefined && isObj(d.t) && isObj(d.t.bucket)); };
var EMP_FIELDS = function (d) { return /^(\d+|\[[^\]]*\])\.(work|type|eid)$/.test(d.p); };
var EMP_REFS = function (d) { return endsAny(d.p, ['emp']); };
var NO_APPROVAL = function (d) { return !endsAny(d.p, ['ap', 'shAp', 'apAt', 'apBy', 'closed', 'cWhy', 'off', 'needN', 'dopen']); };
var SEED_ONLY = function (d) { return d.p === '' && d.f === undefined; };
var VIA_FN = { EMP_FIELDS: EMP_FIELDS, EMP_REFS: EMP_REFS, CS_ONLY: CS_ONLY, SNAP_CS_ONLY: SNAP_CS_ONLY, NO_APPROVAL: NO_APPROVAL, SEED_ONLY: SEED_ONLY };
/* KEY_RULES حُذف: RESOURCE_REGISTRY هو توصيف الموارد الوحيد */
/* أعلام ترحيلٍ تُكتب مرةً واحدة — لمدير النظام ومدراء الإدارات؛ الموظف يُرفض بصمت */
/* صارت الخمسةُ رايات عامّة في سجل الموارد، فلم يبقَ مفتاحُ رايةٍ إدارية.
   ويبقى الجدولُ فارغاً لا محذوفاً: فرعُ canWrite يقرؤه فيسقط، فلا تُفتح
   بصيغة bsdept:<إدارة>:<راية> طريقٌ بديلٌ لأحد. */
var FLAG_KEYS = {};

function parseKey(k) { var m = /^bsdept:([^:]+):(.+)$/.exec(String(k)); return m ? { dept: m[1], name: m[2] } : { dept: '', name: String(k) }; }
function parseJson(s, d) { if (s == null) return d; try { var v = JSON.parse(s); return v == null ? d : v; } catch (e) { return d; } }
function isObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
function deq(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) { if (a.length !== b.length) return false; for (var i = 0; i < a.length; i++) if (!deq(a[i], b[i])) return false; return true; }
  var ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (var j = 0; j < ka.length; j++) { if (!Object.prototype.hasOwnProperty.call(b, ka[j]) || !deq(a[ka[j]], b[ka[j]])) return false; }
  return true;
}
/* KIVO_261 (المراجعةُ المستقلة · الجولة الثانية): مفاتيحُ الكائنات التي تُبنى من مُدخَل المستخدم (معرّفاتُ الحسابات · حقولُ السجلّ) تكون null-prototype،
   فمفتاحٌ خبيثٌ مثل «__proto__» يصير خاصيّةً عادية تُفحص لا مُسنِداً صامتاً يتخطّى الفحص. ومعرّفُ حسابٍ بهذه الأسماء يُرفض صراحةً (لا حسابَ شرعيٌّ يحملها). */
function nmap() { return Object.create(null); }
var BAD_ID_RX = /^(__proto__|prototype|constructor)$/;
function badAcctId(id) { return BAD_ID_RX.test(String(id == null ? '' : id)); }
function eqExcept(a, b, skip) {
  var c1 = Object.create(null), c2 = Object.create(null), k;
  for (k in (a || {})) if (skip.indexOf(k) === -1) c1[k] = a[k];
  for (k in (b || {})) if (skip.indexOf(k) === -1) c2[k] = b[k];
  return deq(c1, c2);
}
/* الفاعل: حسابه وصلاحياته وسجل الإدارات — قراءة واحدة لكل طلب */
/* الفاعل من مفاتيحَ حُمِّلت سلفاً: فرعُ الصفحة يقرأ الجدول كله بـkvAll، ثم كانت
   actorOf تعيد قراءة users و perms و depts و gdepts و platform من D1 من جديد —
   خمس رحلاتٍ بلا داعٍ في كل تحميل صفحة. هذه تبني الفاعل نفسه مما في اليد.
   حذفُ البصمات لا يضرّها: الصلاحيات تُقرأ من الحقول لا من البصمة. وإن تعذّر
   البناء (مفتاحٌ ناقص) رجع الأمر إلى actorOf كما كان — فلا تتبدّل النتيجة أبداً. */
function actorFromKeys(keys, uid) {
  if (!keys) return null;
  var users = parseJson(keys[K_USERS], []);
  if (!Array.isArray(users)) return null;
  var u = users.filter(function (x) { return x && x.id === uid; })[0] || null;
  if (!u || u.dis) return null;                 /* حسابٌ حُذف أو جُمّد: لا فاعل */
  var plat = parseJson(keys[K_PLAT], {});
  var off = (isObj(plat) && isObj(plat.mods) && Array.isArray(plat.mods.off)) ? plat.mods.off : [];
  var perms = parseJson(keys[K_PERM], {}), depts = parseJson(keys[K_DEPTS], []), nodes = parseJson(keys[K_GDEPTS], []);
  return { u: u, users: users, perms: isObj(perms) ? perms : {}, depts: Array.isArray(depts) ? depts : [],
           nodes: Array.isArray(nodes) ? nodes : [], off: off };
}
async function actorOf(env, uid) {
  var users = (await usersList(env)) || [];
  var u = users.filter(function (x) { return x && x.id === uid; })[0] || null;
  if (!u || u.dis) return null;                 /* حسابٌ حُذف أو جُمّد: لا فاعل */
  var perms = parseJson(await kvGet(env, 'kv', K_PERM), {});
  var depts = parseJson(await kvGet(env, 'kv', K_DEPTS), []);
  /* سجل العقد الفوقية — كان معرَّفاً ولا يُقرأ يوم كانت الشجرة طبقتين، إذ كان
     حقل gid في الإدارة يكفي. وقد صارت أعمق فلا بدّ من العقد لمشي الشجرة صعوداً. */
  var nodes = parseJson(await kvGet(env, 'kv', K_GDEPTS), []);
  var plat = await platGet(env); var off = (isObj(plat) && isObj(plat.mods) && Array.isArray(plat.mods.off)) ? plat.mods.off : [];
  var A0 = { u: u, users: users, perms: isObj(perms) ? perms : {}, depts: Array.isArray(depts) ? depts : [],
           nodes: Array.isArray(nodes) ? nodes : [], off: off };
  if (env && env.__enf) { A0.enf = env.__enf; await enfAttachGrants(env, A0); }   /* KIVO_243: وضعُ الإنفاذ (ENV ∧ D1) وحده يضبطه · ويُرفق به المنحُ الصريح */
  return A0;
}
