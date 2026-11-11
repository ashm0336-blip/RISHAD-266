/* ══ R169-CC · عقدُ الصورة الأصلية ══════════════════════════════════════════
   STG: بادئةُ أجزاء الرفع المرحَّلة — خارج [a-z0-9_] فلا يطابقها معرّفُ صورةٍ ولا تُنسب إليها ملكية.
   R2_MARK: سطرُ المرجع في D1 حين يكون الأصلُ في المستودع الكائنيّ.
   IMG_TOTAL_MAX: سقفُ الصورة المجمَّعة — يسع خريطةً متّجهةً أو نقطيّةً بـ٥٠٠٠ بكسل، ودون سعة الأجزاء (٢٥٫٦ م.ب) هامشٌ آمن. */
var IMG_STG = '~stg~', IMG_R2_MARK = '~r2~', IMG_TOTAL_MAX = 24 * 1024 * 1024, IMG_PARTS_MAX = 64;
/* KIVO_261 · SOT-068 (التحقّقُ في الخادم): ما يُرفع إلى /api/img صورةٌ بصيغة data:image/… وحدها — العميلُ لا يرفع غيرها (toDataURL · readAsDataURL)؛
   فنصٌّ آخر (HTML · نصٌّ حرّ · data:text/… · data:application/…) يُرفض 415 قبل أيّ كتابة. والاستعادةُ الشاملة تتجاوز ما يُرفض وتعدّه («تعذّر رفع N صورة»)،
   واستعادةُ الإدارة لا تقبل نجاحاً جزئياً (R169-CC): خريطةٌ تشير إليها بياناتُها وتُرفض ⇒ تُعاد بياناتُ الإدارة كما كانت مع سبب الرفض. */
var IMG_TYPE_RX = /^data:image\/[a-z0-9.+-]{1,40}(?:;[a-z0-9=.+-]{1,60}){0,4};base64,/i;
var B64_RX = /^[A-Za-z0-9+\/=\r\n]*$/;
/* KIVO_261 (تشديد — كشفه المراجعُ الأمنيّ المستقل): الترويسةُ وحدها كانت تُفحص فيمرّ «data:image/png,<html>…» — والعميلُ لا يرفع إلا base64
   (readAsDataURL · toDataURL) ⇒ الترويسةُ تحمل ;base64 وما بعدها أبجديةُ base64 وحدها؛ والأجزاءُ التالية base64 كلُّها */
function imgTypeOk(text) { var s = String(text || ''), m = IMG_TYPE_RX.exec(s.slice(0, 200)); return !!m && B64_RX.test(s.slice(m[0].length)); }
function imgPartOk(text) { return B64_RX.test(String(text || '')); }
var IMG_TYPE_ERR = 'نوعُ الملف غيرُ مدعوم — الصورُ وحدها (data:image/…)';
/* KIVO_264 · SOT-101 — العقدُ الخامُّ للصورة (src/schemas/api/bodies.schema.json raw['/api/img/']): رأسُ Content-Type إن حضر فنوعُه الأوّل text/plain
   (بأيّ معاملات — العميلُ يرسل text/plain; charset=utf-8) وإلا 415 قبل قراءة الجسم؛ غيابُه مقبول (جسمٌ متدفّق/بايتات) — والحكمُ الأخير للصيغة (imgTypeOk) */
function imgCtypeOk(ct) { var s = String(ct == null ? '' : ct).split(',')[0].split(';')[0].trim().toLowerCase(); return !s || s === 'text/plain'; }
function imgBucket(env) { return (env && env.IMG_R2 && typeof env.IMG_R2.put === 'function') ? env.IMG_R2 : null; }
/* الكتابةُ الوحيدة للصورة: المستودعُ الكائنيّ إن وُجد وإلا D1 المقطَّع — والعباراتُ تُعاد لتُنفَّذ في دفعةٍ واحدة */
async function imgStoreStmts(env, ik, text) {
  var B = imgBucket(env);
  if (B) { await B.put('img/' + ik, text, { httpMetadata: { contentType: 'text/plain; charset=utf-8' } }); return kvPutStmts(env, 'imgs', ik, IMG_R2_MARK); }
  return kvPutStmts(env, 'imgs', ik, text);
}
async function imgLoad(env, ik) {
  var v = await kvGet(env, 'imgs', ik);
  if (v !== IMG_R2_MARK) return v;
  var B = imgBucket(env); if (!B) return null;                 /* مرجعٌ بلا مستودع: لا تُختلق قيمة */
  var o = await B.get('img/' + ik);
  return o ? await o.text() : null;
}
async function imgDropR2(env, ik) { var B = imgBucket(env); if (B) { try { await B.delete('img/' + ik); } catch (e) { swallow('r2-delete', e, env.__rid); } } }
var IMG_PFX = ['img_', 'szp_'];
var IMG_CAP = 5000;
function imgLike(s9) { for (var i9 = 0; i9 < IMG_PFX.length; i9++) if (s9.indexOf(IMG_PFX[i9]) >= 0) return true; return false; }
function imgIdsIn(v) {
  var out = {}, s9 = String(v == null ? '' : v);
  if (!imgLike(s9)) return out;
  var re = /(?:img|szp)_[a-z0-9]+_[a-z0-9]+/g, m9, n9 = 0;
  while ((m9 = re.exec(s9)) && n9 < IMG_CAP) { out[m9[0]] = 1; n9++; }
  return out;
}
function ownStmt(env, img, st, k, uid, dept) {
  return env.DB.prepare('INSERT OR IGNORE INTO imgown (img, st, k, uid, dept, ts) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
    .bind(img, st, k || '', uid || '', dept || '', Date.now());
}
async function imgOwnOf(env, ik) { return await env.DB.prepare('SELECT img, st, k, uid, dept FROM imgown WHERE img = ?1').bind(ik).first(); }
/* مفاتيحُ القيم التي تذكر هذه الصورةَ ذكراً حقيقياً — لا مطابقةً جزئية.
   instr وحدَه يقبل أن يكون المعرّفُ جزءاً من معرّفٍ أطول (img_a_b داخل
   img_a_b9) فيُنسب الأقصرُ ملكاً لمفتاحٍ لا يذكره البتّة. فيُشترط معه حدٌّ
   في آخر المطابقة بنفس دلالة imgIdsIn: الحرفُ التالي ليس [a-z0-9]، أو
   انتهى النصُّ عنده. والمعرَّفُ غيرُ السليم لا يُبحث له أصلاً (ولئلا تتسرّب
   رموزُ GLOB إلى النمط)، فيبقى غيرَ محسوم. */
async function imgKeysMentioning(env, ik, lim) {
  if (!/^[a-z0-9_]+$/.test(ik)) return [];
  // Operational image references are maintained with the typed row mutation
  // (and at cutover) in the existing canonical D1 relation, never in R2 here.
  var typed = (await env.DB.prepare('SELECT k FROM imgref WHERE img=?1').bind(ik).all()).results || [];
  var typedKeys = typed.map(function(row){return row.k;}).filter(opIsResource);
  var r = await env.DB.prepare('SELECT k FROM kv WHERE instr(v, ?1) > 0 AND (v GLOB ?2 OR v GLOB ?3) LIMIT ' + lim)
    .bind(ik, '*' + ik + '[^a-z0-9]*', '*' + ik).all();
  return Array.from(new Set(typedKeys.concat(((r && r.results) || []).map(function (x) { return x.k; })))).slice(0,lim);
}
/* مَن يملك هذه الصورة؟ — سؤالٌ عن صورةٍ واحدة، لا مسحٌ للقاعدة كلها.
   كان البناءُ الأول يقرأ جدول kv كاملاً داخل طلب المستخدم ويمسحه بتعبيرٍ
   نمطيّ، فتتجاوز كلفةُ المعالج سقفَ العامل في قاعدةٍ حقيقية ويسقط الطلب —
   ولا تُكتب رايةُ الاكتمال فيتكرّر السقوط أبداً. هنا يتولّى محرّكُ القاعدة
   البحثَ (instr) فلا يعبر إلى العامل إلا اسمُ المفتاح، والدلالةُ هي هي:
   مرجعٌ واحدٌ حاسم ⇒ مالكٌ ثابت يُثبَّت ويُحفظ · مرجعان فأكثر أو لا مرجع ⇒
   غيرُ محسومة ولا تُتبنّى (ولا تُكتب حالتُها حتى لا تُسمَّم صورةٌ قيد الرفع). */
async function imgResolve(env, ik) {
  var o = await imgOwnOf(env, ik);
  if (o) return o;
  /* صورةٌ لا وجودَ لها بعد = رفعٌ جديد: لا شيءَ يُحسم، فلا يُدفع ثمنُ بحثٍ أصلاً */
  var ex = await env.DB.prepare('SELECT k FROM imgs WHERE k = ?1 LIMIT 1').bind(ik).first();
  if (!ex) return null;
  var ks = (await imgKeysMentioning(env, ik, 2)).filter(function (k) { return !isDeviceKey(k); });
  /* موجودةٌ ولا مرجعَ حاسماً: غيرُ محسومةٍ كما كانت — تُغلق دون غير مدير النظام،
     ولا تُكتب حالتُها في السجل حتى لا تُثبَّت على حالٍ قد يحسمها حفظٌ لاحق. */
  if (ks.length !== 1) return { img: ik, st: 'amb', k: '', uid: '', dept: '' };
  var kOwn = ks[0], dOwn = (parseKey(kOwn) || {}).dept || '';
  await env.DB.batch([ownStmt(env, ik, 'bound', kOwn, '', dOwn),
    env.DB.prepare('INSERT OR IGNORE INTO imgref (img, k) VALUES (?1, ?2)').bind(ik, kOwn)]);
  return { img: ik, st: 'bound', k: kOwn, uid: '', dept: dOwn };
}
/* جردُ الصور لفاعلٍ بعينه: مفاتيحُ لا صور. لا يُقرأ جسمُ صورةٍ واحدة لبناء
   قائمة، ولو كان الطالبُ مديرَ النظام — فكلفةُ الطلب تتبع عددَ المفاتيح لا
   حجمَ المخزن. والصلاحيةُ من المالك وحده: claim لصاحبها · bound بـ canRead ·
   amb لمدير النظام. ومن أراد صورةً بعينها فلها مسارُها الفرديُّ بتفويضه.
   ودالّةٌ واحدةٌ تخدم صيغتَي المسار كلتيهما كي لا تفترق صلاحيتاهما يوماً. */
async function imgListFor(env, A) {
  var supL = A.u.role === 'super', okL = {}, sawL = {};
  if (!supL) {
    var owL = await env.DB.prepare('SELECT img, st, k, uid FROM imgown').all();
    ((owL && owL.results) || []).forEach(function (o) {
      if (o.st === 'claim') { if (o.uid === A.u.id) okL[o.img] = 1; return; }
      if (o.st !== 'bound' || !o.k) return;                                /* amb: لمدير النظام وحده */
      if (sawL[o.k] === undefined) sawL[o.k] = !isDeviceKey(o.k) && canRead(A, o.k);
      if (sawL[o.k]) okL[o.img] = 1;
    });
  }
  var rkL = await env.DB.prepare('SELECT DISTINCT k FROM imgs').all(), outL = {};
  ((rkL && rkL.results) || []).forEach(function (r) { if (String(r.k).indexOf(IMG_STG) === 0) return; if (supL || okL[r.k]) outL[r.k] = ''; });
  return outL;
}
async function imgRefsOfImg(env, ik) {
  var r = await env.DB.prepare('SELECT k FROM imgref WHERE img = ?1').bind(ik).all();
  return ((r && r.results) || []).map(function (x) { return x.k; });
}
async function imgRefsOfKey(env, k) {
  var r = await env.DB.prepare('SELECT img FROM imgref WHERE k = ?1').bind(k).all();
  return ((r && r.results) || []).map(function (x) { return x.img; });
}
function imgDeptWriter(A, d) { var wp = writePages(A, d); return wp === null || wp.length > 0; }
/* كتابةُ الصورة = كتابةُ مورد مالكها. لا anyWriter، ولا دورٌ يعلو على سجل الموارد. */
function imgWriteOk(A, k) {
  if (A && A.enf) return enfImgWriteOk(A, k);                                 /* KIVO_243 */
  var R8 = resOf(k); if (!R8 || R8.scope === 'device') return false;
  var P8 = parseKey(k);
  if (R8.scope === 'global' || !P8.dept) return A.u.role === 'super';
  if (!deptInScope(A, P8.dept)) return false;
  if (R8.rule) return imgDeptWriter(A, P8.dept);
  return authorize(A, k, 'edit').ok || authorize(A, k, 'add').ok || authorize(A, k, 'del').ok;
}
/* mode: 'read' | 'put' | 'del' — الحكمُ من المالك وحده */
async function imgVerdict(env, A, ik, mode) {
  if (!A || !A.u) return { ok: false, why: 'session' };
  /* الحسمُ أولاً ولو كان الفاعلُ مدير النظام: قراءتُه هي التي تُثبّت مالكَ
     الصورة القديمة مرّةً واحدة، فلا تبقى بلا سجلٍّ حتى يأتي من لا يملكها. */
  var o = await imgResolve(env, ik);
  if (A.u.role === 'super') return { ok: true, why: 'super' };
  /* صورةُ توثيق مهمّة: يرفعها الموظفُ المكلَّف وإن لم تكن له صفحةٌ يكتبها — عقدٌ قائمٌ في المعتمدة */
  var selfProof = ik.indexOf('img_tsk') === 0 && !!A.u.ekey;
  if (!o) return mode === 'put' && (anyWriter(A) || selfProof) ? { ok: true, why: 'new' } : { ok: false, why: 'none' };
  if (o.st === 'amb') return { ok: false, why: 'amb' };                    /* قديمةٌ غيرُ محسومة: لمدير النظام وحده */
  if (o.st === 'orphan') return { ok: false, why: 'orphan' };              /* KIVO_265 · حادثةُ الصور: أزيل مرجعُها وتنتظر الكنسَ بعد مهلة السماح — لمدير النظام وحده */
  if (o.st === 'claim') return o.uid === A.u.id ? { ok: true, why: 'own' } : { ok: false, why: 'claim' };
  if (mode === 'read') return canRead(A, o.k) ? { ok: true, why: 'bound' } : { ok: false, why: 'bound' };
  if (!imgWriteOk(A, o.k)) return { ok: false, why: 'bound' };
  if (mode === 'del') {
    /* لا يُحذف الملفُّ ما دام موردٌ آخر يعرضه — ولو كان الفاعلُ يكتبه. وإزالةُ
       المرجع من مورده هي الطريق: عند زوال آخر مرجعٍ يكنسه الخادم نفسه. */
    var refs = await imgRefsOfImg(env, ik);
    for (var i9 = 0; i9 < refs.length; i9++) if (refs[i9] !== o.k) return { ok: false, why: 'inuse' };
  }
  return { ok: true, why: 'bound' };
}
/* قبل الكتابة: هل يُدخل هذا المفتاحُ صورةً يملكها مفتاحٌ آخر لا يكتبه الفاعل؟
   الرفعُ المعلّق لصاحبه وحده، والغامضةُ القديمة تبقى معروضةً كما هي. */
async function imgForeignIn(env, A, k, v, cur) {
  var ids = imgIdsIn(v), had = imgIdsIn(cur), id9;
  for (id9 in ids) {
    if (had[id9]) continue;                               /* مرجعٌ قائمٌ سلفاً في هذا المفتاح: بياناتٌ قديمة تبقى تعمل */
    var o = await imgOwnOf(env, id9);
    if (!o) {
      /* لا مالكَ لها: إن كانت في المخزن فهي صورةٌ قائمة لا تُتبنّى بإدخال مفتاحها
         هنا (الملكيةُ لا تُكتسب بالإشارة). وإن لم تصل بعدُ فهي رفعٌ في الطريق. */
      var exI = await env.DB.prepare('SELECT k FROM imgs WHERE k = ?1 LIMIT 1').bind(id9).first();
      if (exI) return id9;
      continue;
    }
    if (o.st === 'amb' || o.st === 'orphan') continue;                   /* KIVO_265: اليتيمةُ (مهلةُ السماح) يعيد ربطَها من يكتب المفتاح (imgSync) */
    if (o.st === 'claim') { if (o.uid !== A.u.id && A.u.role !== 'super') return id9; continue; }
    if (o.k !== k && !(A.u.role === 'super' || imgWriteOk(A, o.k))) return id9;
  }
  return '';
}
/* بعد ثبوت الكتابة: تثبيتُ الملكية لأول ربطٍ مشروع · تحديثُ الاستعمال · الكنس */
async function imgSync(env, A, list) {
  if (!list || !list.length) return;
  var st = [], drop = {}, i9, j9, id9;
  for (i9 = 0; i9 < list.length; i9++) {
    var k9 = list[i9].k, nv = imgIdsIn(list[i9].v), old = await imgRefsOfKey(env, k9);
    st.push(env.DB.prepare('DELETE FROM imgref WHERE k = ?1').bind(k9));
    for (id9 in nv) {
      st.push(env.DB.prepare('INSERT OR IGNORE INTO imgref (img, k) VALUES (?1, ?2)').bind(id9, k9));
      var o9 = await imgOwnOf(env, id9);
      /* أولُ ربطٍ مشروع: رفعٌ لصاحبه يربطه بمورده — ولا تنتقل ملكيةٌ ثابتة بعدها */
      if (o9 && o9.st === 'claim' && (o9.uid === A.u.id || A.u.role === 'super'))
        st.push(env.DB.prepare('UPDATE imgown SET st = ?2, k = ?3, dept = ?4 WHERE img = ?1 AND st = ?5')
          .bind(id9, 'bound', k9, (parseKey(k9) || {}).dept || '', 'claim'));
      /* KIVO_265 · حادثةُ الصور: يتيمةٌ داخل مهلة السماح يذكرها مفتاحٌ من جديد (استعادةٌ · إعادةُ صفّ) ⇒ تعود مربوطةً به */
      else if (o9 && o9.st === 'orphan')
        st.push(env.DB.prepare('UPDATE imgown SET st = ?2, k = ?3, dept = ?4, uid = ?6 WHERE img = ?1 AND st = ?5')
          .bind(id9, 'bound', k9, (parseKey(k9) || {}).dept || '', 'orphan', ''));
    }
    for (j9 = 0; j9 < old.length; j9++) if (!nv[old[j9]]) drop[old[j9]] = k9;
  }
  for (j9 = 0; j9 < st.length; j9 += 90) await env.DB.batch(st.slice(j9, j9 + 90));
  var st2 = [], now9 = Date.now();
  for (id9 in drop) {
    var rest = await imgRefsOfImg(env, id9);
    if (rest.length) continue;                                             /* مرجعٌ آخر حيّ: لا كنس */
    /* وقد يكون المرجعُ الآخر في مفتاحٍ لم يُفهرس بعد (بياناتٌ سابقة لهذه
       الطبقة) — فيُسأل عنه سؤالاً محدوداً قبل الحذف، لا بمسح القاعدة. */
    var stillR = await imgKeysMentioning(env, id9, 2);
    /* F-10 · F-6 (من SR-2.3): أيُّ مفتاحٍ يذكرها الآن — ومنه المفتاحُ نفسُه إن أعاد حفظٌ متزامنٌ (أو حمايةُ أفعال الموظف) ذكرَها — يمنع الكنس */
    if (stillR.length) continue;
    var ow = await imgOwnOf(env, id9);
    if (ow && ow.st === 'bound' && ow.k !== drop[id9]) continue;           /* المالكُ غيرُ من أزال مرجعه */
    /* KIVO_265 · حادثةُ الصور (سقيا زمزم): لا كنسَ فوريّ — الصورةُ التي زال مرجعُها تُوسم «يتيمة» وتبقى (الجسمُ في R2/D1) مدةَ IMG_ORPHAN_GRACE
       فتُسترجع بحفظٍ يذكرها من جديد (imgForeignIn · أعلاه)، ثم تُكنس بعدها (أدناه) */
    if (ow) st2.push(env.DB.prepare('UPDATE imgown SET st = ?2, k = ?3, ts = ?4 WHERE img = ?1').bind(id9, 'orphan', '', now9));
    else st2.push(ownStmt(env, id9, 'orphan', '', '', (parseKey(drop[id9]) || {}).dept || ''));
  }
  for (j9 = 0; j9 < st2.length; j9 += 90) await env.DB.batch(st2.slice(j9, j9 + 90));
  await imgSweepOrphans(env, now9);
}
var IMG_ORPHAN_GRACE = 30 * 864e5;
/* كنسُ اليتيمات التي جاوزت مهلةَ السماح — دفعةٌ صغيرة في كل مزامنةٍ (لا مسحَ للقاعدة) */
async function imgSweepOrphans(env, now) {
  var r = await env.DB.prepare('SELECT img FROM imgown WHERE st = ?1 AND ts < ?2 LIMIT 40').bind('orphan', now - IMG_ORPHAN_GRACE).all();
  var L = ((r && r.results) || []).map(function (x) { return x.img; }), st = [], i;
  for (i = 0; i < L.length; i++) {
    if ((await imgRefsOfImg(env, L[i])).length) { st.push(env.DB.prepare('UPDATE imgown SET st = ?2 WHERE img = ?1').bind(L[i], 'amb')); continue; }   /* مرجعٌ عاد بلا ربطٍ: لا تُكنس */
    await imgDropR2(env, L[i]);
    st.push(env.DB.prepare('DELETE FROM imgs WHERE k = ?1').bind(L[i]));
    st.push(env.DB.prepare('DELETE FROM imgown WHERE img = ?1').bind(L[i]));
  }
  for (i = 0; i < st.length; i += 90) await env.DB.batch(st.slice(i, i + 90));
}
async function kvAll(env, table) {
  var r = await env.DB.prepare('SELECT k, seq, v FROM ' + table + ' ORDER BY k, seq').all();
  var rows = (r && r.results) || [], out = {}, i;
  for (i = 0; i < rows.length; i++) out[rows[i].k] = (out[rows[i].k] || '') + rows[i].v;
  return out;
}
async function metaGet(env, k) {
  var P = env.__pre;   /* KIVO_255 · AUD-037: من اللقطة إن كان المفتاحُ فيها وهي حيّة */
  if (P && P.live && Object.prototype.hasOwnProperty.call(P.meta, k)) return P.meta[k];
  if (P && P.live && P.track && k !== 'rev' && !rsScopeHas(P.track, k, 1)) throw rsError('reference-scope', 503);   /* RISHAD-266 · s1: another unit's meta row is outside a scoped reference (019d) — refused, never read unfenced */
  var r = await env.DB.prepare('SELECT v FROM meta WHERE k = ?1').bind(k).first();
  return r ? r.v : null;
}
async function curRev(env) { var v = await metaGet(env, 'rev'); return v ? parseInt(v, 10) : 0; }
/* تخصيصُ رقمِ مراجعةٍ جديد — عبارةٌ واحدةٌ ذرّيّة: الزيادةُ والقراءةُ معاً داخل
   القاعدة، فلا تقع بينهما فجوةٌ يقرأ فيها طلبٌ آخر الرقمَ نفسَه. لا تُنادى
   إلا بعد ثبوت وجود تغييرٍ سيُنفَّذ، فلا يتقدّم العدّادُ بلا أثر. */
async function nextRev(env) {
  var r = await env.DB.prepare("INSERT INTO meta (k, v) VALUES ('rev', '1') ON CONFLICT(k) DO UPDATE SET v = CAST(CAST(meta.v AS INTEGER) + 1 AS TEXT) RETURNING CAST(v AS INTEGER) AS rev").first();
  return (r && r.rev) || 0;
}
/* KIVO_259 · حارسُ النسخة (مقارنةٌ ومبادلة داخل المعاملة): يُخفق — فتُلغى الدفعةُ كلُّها — إن لم تعد نسخةُ المفتاح ما قُرئ أوّلَ الطلب
   (json_extract بمسارٍ غير صالح يرفع خطأً يحمل العلامة — في D1 وMiniflare وnode:sqlite) */
function revGuard(env, k, have) { var s = env.DB.prepare("SELECT CASE WHEN COALESCE((SELECT rev FROM revs WHERE k = ?1), 0) != ?2 THEN json_extract('{}', 'KIVO_REV_CONFLICT') END AS g").bind(k, have || 0); /* RISHAD-266 (g): tagged so an atomic restore may fold adjacent scalar guards in order (019d rsMergeGuards) */ if (s && typeof s === 'object') Object.defineProperty(s, 'kivoGuard', { value: { cond: 'COALESCE((SELECT rev FROM revs WHERE k = ?1), 0) != ?2', args: [k, have || 0], sentinel: 'KIVO_REV_CONFLICT' }, configurable: true }); return s; }
function isRevConflict(e) { return /KIVO_REV_CONFLICT/.test(String((e && (e.message || e.cause && e.cause.message)) || e)); }
/* مجموعاتُ المفاتيح في دفعاتٍ لا تشطر مجموعةً (إلا مجموعةً أكبر من دفعةٍ وحدها: حارسُها وقيمتُها ونسختُها في أوّل أجزائها) — دفعةٌ أخفقها حارسٌ
   تُعاد مجموعةً مجموعة فيُكتب ما لم يُسبق ويُردّ المسبوقُ تعارضاً؛ والعمليةُ المحمية (atomic) لا يُكتب منها شيءٌ بعد أوّل تعارض */
async function commitGroups(env, pend, atomic) {
  var lost = [], chunk = [], keys = [], i, j, total = 0;
  /* KIVO_259 · SR-2 (المراجعةُ الأمنية المستقلة): عمليةٌ محمية أكبرُ من دفعةٍ واحدة تُكتب على دفعات — فحفظٌ متزامنٌ يقع على مفتاحٍ في دفعةٍ
     لاحقة كان يُلغي تلك الدفعةَ وحدها بعد أن ثبتت سابقتُها (تطبيقٌ جزئي). الآن تُفحص نسخُ مفاتيحها كلِّها قبل أوّل كتابة: المسبوقُ قبلها ⇒
     لا يُكتب منها شيء. ما يبقى نافذةُ ما بين الدفعات (ميلي ثوانٍ) — فـD1 لا يعرف معاملةً تتجاوز الدفعة */
  for (i = 0; i < pend.length; i++) total += pend[i].g.length;
  if (atomic && total > 90) {
    var gs = pend.map(function (p) { return p.g[0]; });
    try { for (j = 0; j < gs.length; j += 90) await env.DB.batch(gs.slice(j, j + 90)); }
    catch (eG) { if (!isRevConflict(eG)) throw eG; return pend.map(function (p) { return p.k; }); }
  }
  async function flush() {
    if (!chunk.length) return;
    var c = chunk, ks = keys; chunk = []; keys = [];
    try { await env.DB.batch(c); }
    catch (e) {
      if (!isRevConflict(e)) throw e;
      if (atomic || ks.length === 1) { for (j = 0; j < ks.length; j++) lost.push(ks[j].k); return; }
      for (j = 0; j < ks.length; j++) { try { await env.DB.batch(ks[j].g); } catch (e2) { if (!isRevConflict(e2)) throw e2; lost.push(ks[j].k); } }
    }
  }
  for (i = 0; i < pend.length; i++) {
    var g = pend[i].g;
    if (atomic && lost.length) { lost.push(pend[i].k); continue; }
    if (g.length > 90) {
      await flush(); if (atomic && lost.length) { lost.push(pend[i].k); continue; }
      try { await env.DB.batch(g.slice(0, 90)); } catch (e3) { if (!isRevConflict(e3)) throw e3; lost.push(pend[i].k); continue; }
      for (j = 90; j < g.length; j += 90) await env.DB.batch(g.slice(j, j + 90));
      continue;
    }
    if (chunk.length && chunk.length + g.length > 90) await flush();
    if (atomic && lost.length) { lost.push(pend[i].k); continue; }
    chunk = chunk.concat(g); keys.push(pend[i]);
  }
  await flush();
  return lost;
}
async function revsAll(env) {
  var P = env.__pre;   /* KIVO_255 · AUD-037: نسخةٌ من اللقطة إن كانت حيّة (المستدعي قد يعدّل الكائن) */
  if (P && P.live && P.revs) return Object.assign({}, P.revs);
  var r = await env.DB.prepare('SELECT k, rev FROM revs').all();
  var rows = (r && r.results) || [], out = {};
  for (var i = 0; i < rows.length; i++) out[rows[i].k] = rows[i].rev;
  return out;
}

/* ── الحسابات ── */
/* لا حسابات مسجّلة: لا يُنشأ حساب افتراضي ولا تُفتح تهيئة عبر صفحة الدخول. */
function isVirgin(users) {
  return !Array.isArray(users) || users.length === 0;
}
async function usersList(env) {
  var raw = await kvGet(env, 'kv', K_USERS);
  if (raw == null) return null;
  try { var v = JSON.parse(raw); return Array.isArray(v) && v.length ? v : null; } catch (e) { return null; }
}
function stripPh(rawJson) {
  /* نسخة العرض: بلا بصمات. KIVO_254 · AUD-033 (ج): إن تعذّر التحليل (JSON تالف أو ليس مصفوفة) لا تُعاد القيمةُ خاماً أبداً —
     قائمةٌ فارغة + تحذيرٌ في السجل بلا محتوى؛ قائمةُ حساباتٍ غيرُ صالحة لا يقبلها الخادمُ أصلاً (usersList → null) فلا تعطيلَ هنا */
  try {
    var v = JSON.parse(rawJson);
    if (!Array.isArray(v)) { logEv('warn', 'users-unparseable', { kind: 'not-array' }); return '[]'; }
    return JSON.stringify(v.map(function (u) { var c = {}; for (var k in u) if (k !== 'ph') c[k] = u[k]; return c; }));
  } catch (e) { logEv('warn', 'users-unparseable', { kind: 'parse' }); return '[]'; }
}
/* KIVO_259 · SR-1 (المراجعةُ الأمنية المستقلة): الرقمُ الوظيفي «no» في حسابات مديري الإدارات ومديري الإدارة العامة هو كلمةُ مرورهم الأولى
   (ph = hash(no) بلا إلزامٍ بالتغيير) وكان يُرسل نصّاً لكل جلسةٍ في قائمة الحسابات العامة ⇒ يدخل أيُّ موظفٍ بحساب أيِّ مدير. الآن لا يغادر
   الخادمَ إلا لمدير النظام ولصاحب الحساب نفسِه (صفحتُه الشخصية تعرضه)؛ وكتابةُ غيرِ مدير النظام لقائمةٍ بلا «no» ترثه من القيمة الحالية. */
function usersNoOut(json, A) {
  if (json == null || !A || !A.u || A.u.role === 'super') return json;
  var v = parseJson(json, null); if (!Array.isArray(v)) return json;   /* stripPh سبقها: غيرُ المصفوفة صار '[]' */
  var me = A.u.id, cut = 0;
  var o = v.map(function (u) { if (!u || u.id === me || !Object.prototype.hasOwnProperty.call(u, 'no')) return u; var c = {}; for (var k in u) if (k !== 'no') c[k] = u[k]; cut++; return c; });
  return cut ? JSON.stringify(o) : json;
}
function usersNoIn(incJson, curJson, A) {
  if (incJson == null || curJson == null || !A || !A.u || A.u.role === 'super') return incJson;
  var inc = parseJson(incJson, null), cur = parseJson(curJson, null);
  if (!Array.isArray(inc) || !Array.isArray(cur)) return incJson;
  /* مراجعةُ التكامل R2-LEGACYLOCK/R2-SUBSET: النسخةُ رقم n من معرّفٍ مكرَّر ترث «no» من النسخة المخزَّنة رقم n (لا من آخرها) — فلا تتغيّر نسخةٌ قديمةٌ أُعيدت كما هي */
  var byId = nmap(), oc = nmap(), put = 0; cur.forEach(function (u) { if (u && u.id) (byId[u.id] = byId[u.id] || []).push(u); });   /* KIVO_261: null-prototype */
  var o = inc.map(function (u) {
    if (!u || !u.id) return u;
    var cs = byId[u.id], n = oc[u.id] || 0; oc[u.id] = n + 1;
    var s = cs ? cs[Math.min(n, cs.length - 1)] : null;
    if (!s || Object.prototype.hasOwnProperty.call(u, 'no') || !Object.prototype.hasOwnProperty.call(s, 'no')) return u;
    var c = {}; for (var k in u) c[k] = u[k]; c.no = s.no; put++; return c;   /* كما تُورَث البصمة (mergeUsers) */
  });
  return put ? JSON.stringify(o) : incJson;
}
/* ═══ الفحصُ العميق 2026-10-21 · R4 · IRSZ-3 · DG-07 · AUX-14 (أمنٌ وسرعة): قائمةُ الحسابات بأقلّ امتياز ═══
   كانت bassam_auth_users_v1 (موردٌ عامّ يقرؤه كلُّ فاعل) تُحقن في كلّ إقلاعٍ وتعود من /api/get كاملةً — بلا البصمة والرقم الوظيفي وحدهما:
   الموظفُ بلا صلاحياتٍ يستلم اسمَ الدخول (رقمَ الهوية) والجوالَ والاسمَ والدورَ والإدارةَ لكلّ حسابات المنصة (Test: 13,005 حساباً · 2.45 MB ≈ 88% من الصفحة).
   الآن لكلّ فاعلٍ غيرِ مدير النظام إسقاطٌ (usersScopeOut — بعد stripPh/usersNoOut في الإقلاع و/api/get وقيمةِ الرفض/التعارض) بحكم usersLens:
     · حسابُه هو كما كان · حساباتُ إدارةٍ يديرها (isMgrOf: مديرُ الإدارة · المديرُ المعيَّن · مديرُ العقدة على إدارات فرعه) كما كانت.
     · إدارةٌ في نطاقه لا يديرها (deptInScope — الموظفُ في إدارته): صفُّ دليلٍ لكلّ حسابٍ فيها (USERS_DIR_F: بلا اسم دخولٍ ولا جوالٍ ولا بريد)
       إن قرأ سجلَّ موظفيها (أيُّ صفحةٍ تشغيلية: بها تعمل خرائطُ الحسابات في الموظفين والتوزيع والتقرير والمهام) — وإلا مديروها وحدهم («ملفي»).
     · خارج نطاقه: صفوفُ دليلٍ لمديري المنصة والعقد وحدهم (super · gm — المراجِعون في المهام وسلسلةُ «الإدارة» في «ملفي») بالاسم والدور بلا مفتاحٍ
       غيرِ صناعيّ (قد يكون رقمَ هويةٍ في الحسابات القديمة)؛ وحساباتُ الإدارات الأخرى (موظفوها ومديروها) لا تُرسل أصلاً.
   الكتابةُ (usersScopeIn بعد usersNoIn — قبل كلّ حكم): ما لم يُرسَل إلى الفاعل يعود من القيمة الحالية — الحسابُ المحجوب في موضعه والحقلُ المحجوب
   في سجلّه، والسجلُّ الذي لم يتغيّر ما يراه منه يعود كما خُزِّن حرفاً (فالحفظةُ بلا تغييرٍ «noop» كما كانت) — فلا تُحذف حساباتٌ ولا تُمحى هوياتٌ.
   والسجلُّ الوارد الذي يخالف المخزَّنَ فيما يراه يبقى كما ورد فيحكم عليه usersRule/enfUsersWrite كما كان (رفضُ «mgr» لمن لا يملكه).
   مديرُ النظام بلا تغيير. والفحصُ على الخادم بقائمته الكاملة (A.users · usersDupNew · empDupWhy) لا يتغيّر. */
var USERS_DIR_F = ['id', 'name', 'role', 'deptId', 'gid', 'ekey', 'dis', 'mgr', 'title', 'bk', 'test'];
function usersSynKey(ek) { ek = String(ek == null ? '' : ek); return ek.slice(0, 4) === 'mgr:' || ek.slice(0, 3) === 'gm:'; }
function usersDirRow(u) { return u.role !== 'staff' || !!u.mgr || usersSynKey(u.ekey); }   /* مديرٌ في إدارته بدوره (dept) أو بصفته (mgr · mgr:<d>) — ومديرو المنصة */
function usersPick(u, ek) {
  var c = {};
  for (var i = 0; i < USERS_DIR_F.length; i++) { var f = USERS_DIR_F[i]; if ((f !== 'ekey' || ek || usersSynKey(u.ekey)) && Object.prototype.hasOwnProperty.call(u, f)) c[f] = u[f]; }
  return c;
}
/* القراءةُ بلا ظلّ القياس (permv2NoteRead في canRead) — الإسقاطُ لا يغيّر عدّاداتِ /api/permv2 */
function usersReadsEmps(A, d) { var k = 'bsdept:' + d + ':bassam_employees_v1'; return A.enf ? canReadEnf(A, k) : canRead0(A, k); }
/* عدسةُ الفاعل: سجلٌّ مخزَّن (بعد نزع البصمة والرقم) ⇒ هو نفسُه (يُرى كاملاً) · نسخةُ دليلٍ مقلَّصة · null (لا يُرسل) — الحكمُ مرةً لكل إدارة */
function usersLens(A) {
  var memo = nmap();
  return function (u) {
    if (!u || typeof u !== 'object' || Array.isArray(u) || u.id == null || u.id === '') return null;   /* سجلٌّ تالفٌ بلا معرّف لا يُرسل (ويبقى في موضعه عند الكتابة) */
    if (u.id === A.u.id) return u;
    var d = u.deptId == null ? '' : String(u.deptId), m = null;
    if (d) { m = memo[d]; if (!m) m = memo[d] = { mgr: isMgrOf(A, d), sc: deptInScope(A, d), rd: null }; }
    if (m && m.mgr) return u;
    if (m && m.sc) { if (m.rd === null) m.rd = usersReadsEmps(A, d); return m.rd ? privUserRow(A, d, usersPick(u, true)) : (usersDirRow(u) ? usersPick(u, false) : null); }   /* 019u (9): an ekey that is a hidden nid ⇒ its token */
    return (u.role === 'super' || u.role === 'gm') ? usersPick(u, false) : null;   /* خارج نطاقه: مديرو المنصة والعقد وحدهم (أسماءٌ بلا أرقام) */
  };
}
function usersScopeOut(json, A) {
  if (json == null || !A || !A.u || A.u.role === 'super') return json;
  var v = parseJson(json, null); if (!Array.isArray(v)) return json;   /* stripPh سبقها: غيرُ المصفوفة صار '[]' */
  var L = usersLens(A), o = [], cut = 0;
  for (var i = 0; i < v.length; i++) { var w = L(v[i]); if (w !== v[i]) cut++; if (w) o.push(w); }
  return cut ? JSON.stringify(o) : json;
}
/* مراجعةُ التكامل W1-R1 (عالٍ — حذفٌ صامتٌ للحسابات): بصمةُ عدسة الفاعل — قراراتُ usersLens لا صفوفُ الحسابات: معرّفُه ودورُه وإدارتُه، ولكلّ إدارةٍ
   يعرفها نموذجُه (A.depts وإدارتُه هو) مرتّبةً: يديرها (isMgrOf) · في نطاقه (deptInScope) · ويقرأ سجلَّ موظفيها حين لا يديرها (usersReadsEmps).
   إدارةٌ غيرُهما لا يحكم فيها لغير مدير النظام شيء (سلسلةُ أسلافها فارغة) فلا تُحسب. FNV-1a بـ32 بتاً بأساس 36 · ومديرُ النظام بلا إسقاطٍ ⇒ ''.
   تصل العميلَ مع القائمة (الإقلاع boot.uscope · /api/get uscope · قيمةُ الرفض والتعارض) ويعيدها مع حفظها (body.uscope)؛ فإن خالفت بصمةَ الحفظ فقائمتُه
   إسقاطُ عدسةٍ سابقة (نُقلت إدارةٌ إلى عقدته · تغيّرت صلاحياتُه) وما صار يراه ولم يصله كان سيُحسب حذفاً ⇒ تعارضٌ بالإسقاط الحالي (applySave) */
function usersLensFp(A) {
  if (!A || !A.u || A.u.role === 'super') return '';
  var u = A.u, ds = nmap(), ks, s, i, d, mg, sc;
  (Array.isArray(A.depts) ? A.depts : []).forEach(function (x) { if (x && x.id != null && x.id !== '') ds[String(x.id)] = 1; });
  if (u.deptId != null && u.deptId !== '') ds[String(u.deptId)] = 1;
  ks = Object.keys(ds).sort();
  s = String(u.id) + '\u0001' + String(u.role || '') + '\u0001' + String(u.deptId == null ? '' : u.deptId);
  /* مراجعةُ التكامل R2-FPCHURN: إدارةٌ قراراتُها كلُّها صفر (لا يديرها ولا في نطاقه) تُسقط حساباتِها كأيّ إدارةٍ لا يعرفها — فلا تدخل البصمة،
     وإلا غيّر إنشاءُ أيّ إدارةٍ أو حذفُها بصمةَ كلّ فاعلٍ فدار تعارضٌ زائدٌ عند كلّ حفظٍ لقائمة الحسابات */
  for (i = 0; i < ks.length; i++) { d = ks[i]; mg = isMgrOf(A, d); sc = deptInScope(A, d); if (!mg && !sc) continue; s += '\u0002' + d + ':' + (mg ? 1 : 0) + (sc ? 1 : 0) + (sc && !mg && usersReadsEmps(A, d) ? 1 : 0); }
  return fpHash(s);
}
/* ما رآه الفاعلُ من السجل المخزَّن c (نزعُ البصمة ثم رقمِ غيره ثم العدسة — كما أرسلته إليه usersScopeOut): { s: ما رآه · full: رآه كاملاً } أو null (محجوب) */
function usersSeen(L, A, c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return null;
  var st = {}; for (var k in c) if (k !== 'ph' && (k !== 'no' || c.id === A.u.id)) st[k] = c[k];
  var v = L(st); return v === null ? null : { s: v, full: v === st };
}
/* مراجعةُ التكامل R2-OLDTAB (أ): u هو السجلُّ المخزَّن c كما يُرسَل إلى أيّ فاعلٍ في أيّ عدسة — هو نفسُه · ما يراه الفاعلُ منه الآن (usersSeen) ·
   أو صفُّ دليلٍ بمفتاح الموظف أو بدونه (usersPick) — عدا ph وno الغائبين، والحاضرُ منهما يساوي المخزَّن. فصفٌّ وصل العميلَ بصورة الدليل في عدسةٍ سابقة
   ولم يُمسّ لا يُحسب «تعديلاً يمحو حقولَه» حين صار الفاعلُ يراه كاملاً (نقلُ إدارةٍ إلى نطاقه · تبويبٌ من قبل الإسقاط) — وإعادتُه المخزَّنَ حرفاً لا تكتب شيئاً */
function usersAsSent(L, A, u, c) {
  if (!isObj(u) || !isObj(c)) return false;
  if ((u.ph && u.ph !== c.ph) || (Object.prototype.hasOwnProperty.call(u, 'no') && u.no !== c.no)) return false;
  if (eqExcept(c, u, ['ph', 'no'])) return true;
  var S = usersSeen(L, A, c); if (S && eqExcept(S.s, u, ['ph', 'no'])) return true;
  return usersDirAs(c, u);
}
/* u صفُّ دليلٍ للسجلّ المخزَّن c (usersPick بمفتاح الموظف أو بدونه) عدا ph وno — وكلُّ صورةٍ غيرِ كاملةٍ يُرسَل بها السجلُّ في أيّ عدسةٍ هي إحداهما */
function usersDirAs(c, u) { return eqExcept(usersPick(c, true), u, ['ph', 'no']) || eqExcept(usersPick(c, false), u, ['ph', 'no']); }
/* مراجعةُ التكامل R2-OLDTAB (ب): قائمةٌ واردةٌ بلا بصمة عدسة (تبويبٌ من قبل الموجة لا يعرف uscope) تُسقط حساباً محجوباً عن الفاعل الآن (فهي إسقاطٌ
   جاءه من /api/get) وتُسقط معه حساباً يراه الآن ⇒ لا يُعرف أحذفه أم لم يصله قطّ (إدارةٌ نُقلت إلى نطاقه بعد جلبها) — فلا يُحذف بالإغفال: يُرفض المفتاح
   مراجعةُ التكامل R3-OLDTAB-ALL (منخفض — انتقالُ النشر): فإن صار الفاعلُ يرى المخزَّنَ كلَّه (نُقلت إليه آخرُ إدارةٍ محجوبة · مديرٌ عامٌّ جذر) فلا محجوبَ
   يُغفَل فلا تُعرف القائمةُ إسقاطاً بالعلامة الأولى، وكان ما صار يراه يُحذف بالإغفال. العلامةُ الثانية: صفٌّ واردٌ هو صفُّ دليلٍ لسجلّه المخزَّن (usersDirAs)
   لا السجلُّ نفسُه — صفُّ مدير النظام ومديري العقد بلا اسم دخولٍ مثلاً — والقائمةُ الكاملة القديمة لا تحمل صفَّ دليل (فتمضي كما كانت) */
function usersOmitsSeen(incJson, curJson, A) {
  var inc = parseJson(incJson, null), cur = parseJson(curJson, null);
  if (!Array.isArray(inc) || !Array.isArray(cur)) return false;
  var ids = nmap(), L = usersLens(A), hid = 0, vis = 0, by = nmap(), i, c, u, id;
  for (i = 0; i < inc.length; i++) if (isObj(inc[i]) && inc[i].id != null) ids[String(inc[i].id)] = 1;
  for (i = 0; i < cur.length; i++) {
    c = cur[i]; if (!isObj(c) || c.id == null) continue;
    id = String(c.id); if (id in ids) { (by[id] = by[id] || []).push(c); continue; }
    if (usersSeen(L, A, c) === null) hid++; else vis++;
  }
  if (!vis) return false;                                                     /* لا يحذف مرئياً */
  if (hid) return true;                                                       /* أغفل محجوباً: إسقاط */
  for (i = 0; i < inc.length; i++) {
    u = inc[i]; if (!isObj(u) || u.id == null || !(String(u.id) in by)) continue;
    if (by[String(u.id)].some(function (x) { return !eqExcept(x, u, ['ph', 'no']) && usersDirAs(x, u); })) return true;   /* R3-OLDTAB-ALL */
  }
  return false;
}
function usersScopeIn(incJson, curJson, A) {
  if (incJson == null || curJson == null || !A || !A.u || A.u.role === 'super') return incJson;
  var inc = parseJson(incJson, null), cur = parseJson(curJson, null);
  if (!Array.isArray(inc) || !Array.isArray(cur)) return incJson;
  var L = usersLens(A), ixI = nmap(), ixC = nmap(), hid = [], put = 0, i, u, c, id;
  var idOf = function (x) { return x && typeof x === 'object' && !Array.isArray(x) && x.id != null ? String(x.id) : null; };
  /* 019u (9): an ekey received as its token (the row as this reader saw it) goes back to the stored key of that account */
  var byI = nmap(); cur.forEach(function (x) { var k = idOf(x); if (k !== null && !(k in byI)) byI[k] = x; });
  inc = inc.map(function (x) { var k = idOf(x), s = k !== null ? byI[k] : null, v = s && L(s); if (!v || !isObj(x) || x.ekey === s.ekey || v.ekey !== x.ekey) return x; x = Object.assign({}, x); x.ekey = s.ekey; put++; return x; });
  for (i = 0; i < inc.length; i++) { id = idOf(inc[i]); if (id !== null && !(id in ixI)) ixI[id] = i; }
  for (i = 0; i < cur.length; i++) {
    c = cur[i]; id = idOf(c);
    if (id !== null) (ixC[id] = ixC[id] || []).push(i);                      /* R2-SUBSET: كلُّ نسخ المعرّف بترتيبها — النسخةُ n تُطابَق بالمخزَّنة n */
    if (id !== null && id in ixI) continue;                                   /* أُرسل: يُطابَق أدناه */
    if (usersSeen(L, A, c) === null) hid.push({ ci: i, rec: c });            /* محجوبٌ عنه ⇒ يبقى في موضعه */
  }
  /* السجلّ الوارد: ما يراه منه لم يتغيّر ⇒ المخزَّن حرفاً · وإلا يُعاد إليه ما حُجب عنه من حقوله (بترتيب حقول المخزَّن) ويُترك الباقي للحكم */
  var back = function (u, c) {
    if (!isObj(u) || !isObj(c)) return u;
    /* يطابق المخزَّنَ نفسَه (ومنه نسخةٌ كاملةٌ قديمة لدى عميلٍ قبل الإسقاط) أو أيَّ صورةٍ أُرسل بها (usersAsSent) ⇒ المخزَّن حرفاً · ومحجوبٌ تغيّر ⇒ كما ورد ⇒ الحكم */
    if (usersAsSent(L, A, u, c)) { put++; return c; }
    var S = usersSeen(L, A, c);
    if (!S || S.full) return u;                                               /* رآه كاملاً: لا محجوبَ فيه يُعاد (البصمةُ والرقم: mergeUsers · usersNoIn) */
    var r = {}, k, hit = 0;
    for (k in c) { if (Object.prototype.hasOwnProperty.call(u, k)) r[k] = u[k]; else if (k !== 'ph' && k !== 'no' && !Object.prototype.hasOwnProperty.call(S.s, k)) { r[k] = c[k]; hit++; } }
    for (k in u) if (!Object.prototype.hasOwnProperty.call(r, k)) r[k] = u[k];
    if (!hit) return u;
    put++; return r;
  };
  var last = -1; for (i = inc.length - 1; i >= 0; i--) { id = idOf(inc[i]); if (id !== null && id in ixC) { last = i; break; } }
  var out = [], hp = 0, oc = nmap();
  for (i = 0; i < inc.length; i++) {
    u = inc[i]; id = idOf(u); var cs = id !== null && id in ixC ? ixC[id] : null, cx = -1;
    if (cs) { cx = cs[Math.min(oc[id] || 0, cs.length - 1)]; oc[id] = (oc[id] || 0) + 1; }
    if (cx >= 0) { while (hp < hid.length && hid[hp].ci < cx) out.push(hid[hp++].rec); }
    else if (i > last) { while (hp < hid.length) out.push(hid[hp++].rec); }   /* المضافُ في الذيل يبقى في الذيل */
    out.push(cx >= 0 ? back(u, cur[cx]) : u);
  }
  while (hp < hid.length) out.push(hid[hp++].rec);
  return (put || hid.length) ? JSON.stringify(out) : incJson;
}
/* مراجعةُ التكامل W1-CRIT (حرج — تصعيدُ صلاحية · قائمٌ قبل الموجة): معرّفٌ يتكرّر في القائمة الواردة — usersRule/enfUsersWrite تحكمان على آخر نسخةٍ منه
   والفاعلُ والدخولُ (actorOf · /api/login) يأخذان أوّلَها: نسخةٌ معدَّلةٌ أوّلاً (role:'super' · اسمُ دخولِ غيره) ثم الأصلُ كما هو ⇒ «لم يتغيّر» فتُكتب الأولى.
   الآن لغير مدير النظام قبل كلّ تحويلٍ وحكم (applySave): المعرّفُ المكرَّر (String(id)) يُرفض إلا تكراراً قديماً في المخزَّن لم يُمسّ — كلُّ نسخةٍ واردةٍ تطابق
   نسخةً مخزَّنةً بترتيبها (هي أو ما رآه الفاعلُ منها: usersSeen) عدا ph وno — والحاضرُ منهما يساوي المخزَّن — فتُستبدل بها حرفاً (فلا تُورَث بصمةُ نسخةٍ
   أخرى في mergeUsers). يعيد { id: المكرَّرُ المرفوض } أو { v: القائمة }
   مراجعةُ التكامل (الجولة الثانية):
   · R2-LEGACYLOCK (منخفض — قفلٌ أدخلته الجولةُ الأولى): تكرارٌ قديمٌ متطابقُ النسخ في المخزَّن كان يرفض كلَّ تعديلٍ لصاحبه (كلمةُ مروره ولو في الدخول
     الأوّل الإجباري · تجميدُه بيد مديره). الآن يُقبل المعرّفُ المكرَّر إن كانت نسخُه الواردةُ لا تزيد على المخزَّنة وكلُّها متطابقةٌ حرفاً (ومنه حضورُ ph وno
     وقيمتُهما) — فالنسخةُ التي يأخذها الدخولُ (الأولى) هي التي يُحكم عليها (الأخيرة)، ولا تفترق بعد البوابة: usersNoIn وusersScopeIn وmergeUsers تُكمِل
     النسخةَ n من المخزَّنة n والمخزَّنةُ متطابقة. ويبقى استثناءُ «كلُّ نسخةٍ نسخةٌ مخزَّنةٌ بترتيبها».
   · R2-SUBSET (منخفض — قائمٌ قبل الموجة): تكرارٌ مخزَّنٌ نسخُه مختلفة (الأولى staff والتالية mgr مثلاً) — كان غيرُ مدير النظام يرسل بعضَ نسخه
     (التاليةَ وحدها) فيُحكم عليها «لم تتغيّر» (usersRule: آخرُ نسخةٍ بآخر نسخة) وتصير هي الحيّة. الآن نسخُه الواردة هي نسخُه المخزَّنة التي يراها الفاعل
     بترتيبها وعددها حرفاً (أو كما أُرسلت إليه) وإلا رُفض (dup-id) — فتُستبدل بالمخزَّنة كلِّها ومنها ما حُجب عنه في موضعه؛ ولا ينظّفها إلا مديرُ النظام */
function usersDupIdIn(incJson, curJson, A) {
  var inc = parseJson(incJson, null); if (!Array.isArray(inc)) return { v: incJson };
  var cur = parseJson(curJson, null); if (!Array.isArray(cur)) cur = [];
  var idOf = function (x) { return isObj(x) && x.id != null ? String(x.id) : null; };
  /* مراجعةُ التكامل (الجولة الثالثة · كلفةُ usersDupIdIn): مسحةٌ واحدةٌ لكلّ قائمة تحفظ موضعَ أوّل نسخة، ولا تُبنى مصفوفةُ النسخ إلا لمعرّفٍ تكرّر — فالحالةُ الشائعة
     (لا تكرارَ في الواردة ولا في المخزَّن) بلا مصفوفةٍ لكلّ حساب (13,005 حساباً في Test) */
  var fI = nmap(), fC = nmap(), byI = nmap(), byC = nmap(), hot = [], i, j, id, q;
  for (i = 0; i < inc.length; i++) { id = idOf(inc[i]); if (id === null) continue; q = fI[id]; if (q === undefined) fI[id] = i; else (byI[id] = byI[id] || [q]).push(i); }
  for (i = 0; i < cur.length; i++) { id = idOf(cur[i]); if (id === null) continue; q = fC[id]; if (q === undefined) fC[id] = i; else (byC[id] = byC[id] || [cur[q]]).push(cur[i]); }
  for (id in byI) hot.push(id);
  for (id in byC) if (!(id in byI)) hot.push(id);
  if (!hot.length) return { v: incJson };
  var L = usersLens(A), sub = nmap(), nsub = 0;
  for (var h = 0; h < hot.length; h++) {
    id = hot[h]; var is = byI[id] || (id in fI ? [fI[id]] : []), cs = byC[id] || (id in fC ? [cur[fC[id]]] : []);
    if (!cs.every(function (c) { return deq(c, cs[0]); })) {                  /* R2-SUBSET: نسخٌ مخزَّنةٌ مختلفة */
      var vis = []; for (j = 0; j < cs.length; j++) if (usersSeen(L, A, cs[j]) !== null) vis.push(j);
      if (is.length !== vis.length) return { id: id };
      for (j = 0; j < is.length; j++) if (!usersAsSent(L, A, inc[is[j]], cs[vis[j]])) return { id: id };
      /* كلُّ المخزَّنة في موضع الواردة بترتيبها (المحجوبةُ مع جارتها المرئية) — وإن لم يرَ منها شيئاً ولم يرسل شيئاً أعادها usersScopeIn في موضعها */
      for (j = 0; j < is.length; j++) { sub[is[j]] = cs.slice(j ? vis[j - 1] + 1 : 0, j === is.length - 1 ? cs.length : vis[j] + 1); nsub++; }
      continue;
    }
    if (is.length < 2) continue;                                              /* نسخةٌ واحدةٌ من تكرارٍ متطابق: يُحكم عليها كأيّ سجلّ */
    if (is.length <= cs.length && is.every(function (q) { return deq(inc[q], inc[is[0]]); })) continue;   /* R2-LEGACYLOCK */
    var p = 0;
    for (j = 0; j < is.length; j++) {
      while (p < cs.length && !usersAsSent(L, A, inc[is[j]], cs[p])) p++;   /* بالترتيب: نسخةٌ مخزَّنةٌ واحدةٌ لكلّ واردة */
      if (p >= cs.length) return { id: id };
      sub[is[j]] = [cs[p++]]; nsub++;
    }
  }
  if (!nsub) return { v: incJson };
  var out = [];
  for (i = 0; i < inc.length; i++) { if (sub[i]) Array.prototype.push.apply(out, sub[i]); else out.push(inc[i]); }
  return { v: JSON.stringify(out) };
}
/* «فحص الصلاحيات العميق · المرحلة 0 (الجولة 2)» · R3-2: سجلاتُ المنح الصريح لكلّ وحدةٍ في قائمة الإدارات (A.depts) — بالمفتاح المفهرس كما enfAttachGrants
   (057) لا بمسحٍ للجدول — { recs: {وحدة: سجل}, byEk: {مفتاح: [وحداتٌ له فيها مدخل]} } يحكم بها usersGrantWhy (018) ربطَ حسابٍ بمفتاحٍ له منحٌ باقٍ */
async function usersGrantsLoad(env, A) {
  var recs = nmap(), byEk = nmap(), ds = [], seen = nmap(), i, j;
  (Array.isArray(A.depts) ? A.depts : []).forEach(function (x) { var d = x && x.id != null ? String(x.id) : ''; if (d && !seen[d]) { seen[d] = 1; ds.push(d); } });
  for (i = 0; i < ds.length; i += 80) {
    var part = ds.slice(i, i + 80), ph = part.map(function (x, n) { return '?' + (n + 1); }).join(', ');
    var acc = {};
    if (env.__pre && env.__pre.live && env.__pre.track) acc = await kvMany(env, 'kv', part.map(enfGrantsKey));   /* RISHAD-266 · s1: fenced by the scoped reference (019d) */
    else {
      var stmt = env.DB.prepare('SELECT k, v FROM kv WHERE k IN (' + ph + ') ORDER BY k, seq');
      var r = await stmt.bind.apply(stmt, part.map(enfGrantsKey)).all();
      ((r && r.results) || []).forEach(function (row) { acc[row.k] = (acc[row.k] || '') + row.v; });
    }
    for (j = 0; j < part.length; j++) {
      var g = enfGrantRec(acc[enfGrantsKey(part[j])] == null ? null : acc[enfGrantsKey(part[j])]); if (!g) continue;
      recs[part[j]] = g; for (var e in g.emp) (byEk[e] = byEk[e] || []).push(part[j]);
    }
  }
  return { recs: recs, byEk: byEk };
}
/* KIVO_264 · D14 · OD-7: حالةُ «cur» لحفظةٍ تمسّ اسمَ دخول صاحبها (un/alt) — null حين لا يتغيّر؛ وإلا { ok, forced } يقرؤها selfAcctWhy (018):
   ok: كلمةُ المرور الحالية «cur» (حقلٌ في جسم /api/save) صحيحة — تُفحص بحارس pw:<uid> نفسِه (كـ /api/checkpw · /api/recovery/new):
       الخاطئةُ محاولةٌ محسوبة والصحيحةُ تصفّره، والحارسُ المقفل يُسقطها؛ لا تُخزَّن ولا تُسجَّل في أيّ جدول.
   forced: الدخولُ الأوّل الإجباري (شاشةُ الدخول 335) — اسمُ الدخول المخزَّن بصيغةٍ غير صالحة · الحسابُ في حالة «يجب التغيير» (مديرُ النظام
       وكلُّ دورٍ غيرِ staff/gm باسمٍ غير صالح دائماً — قاعدةُ mustChange في /api/login — وstaff/gm بعلم mc) · جلسةٌ حديثة (≤ SELF_FRESH_MS على الدخول) · وكلمةُ مرورٍ جديدة في الحفظة نفسِها. */
var SELF_FRESH_MS = 15 * 60 * 1000;
async function selfCurState(env, A, incJson, cur) {
  var inc = parseJson(incJson, null); if (!Array.isArray(inc)) return null;
  var a = A.u, b = inc.filter(function (x) { return x && x.id === a.id; })[0];
  if (!b || !selfLoginMoved(a, b)) return null;
  /* KIVO_264 (البوابة run1b · bkstamp): «يجب التغيير» = قاعدةُ /api/login نفسُها حرفاً (062a: mc ‖ دورٌ غيرُ staff/gm باسمٍ غير صالح) — كان الشرطُ
     «مديرُ النظام ‖ mc» فيُرفض الإجباريُّ لحسابٍ قديمٍ بدورٍ آخر (dept) يطلب الدخولُ تغييرَ اسمه، فلا يكمل الدخولَ الأولَ أبداً */
  var mustUn = !!a.mc || (a.role !== 'staff' && a.role !== 'gm');
  var st = { ok: false, forced: !unCheck(a.un) && mustUn && !!b.ph && b.ph !== a.ph && !!A.sessTs && Date.now() - A.sessTs <= SELF_FRESH_MS };
  if (cur == null || cur === '') return st;
  var gk = 'pw:' + a.id;
  if (await guardLeft(env, gk) > 0) { st.locked = true; return st; }   /* KIVO_264 (المراجعة F6): الحارسُ مقفل ⇒ 'self-lock' لا 'self-cur' */
  var good = await verifyPw(String(cur), a.ph);
  if (good === true) { await guardReset(env, gk); st.ok = true; }
  else if (good !== 'unsupported') await guardFail(env, gk);
  return st;
}
/* KIVO_259 · SR-8: اسمُ الدخول (un/alt) فريدٌ في الخادم — الدخولُ يأخذ أوّلَ مطابق، فحسابٌ جديدٌ (أو معدَّل) يحمل اسمَ دخولِ غيره يحجبه
   (حرمانٌ من الدخول حتى لمدير النظام إن وُضع قبله). يُرفض التصادمُ الجديد وحده — المخزَّنُ القديم لا يُعطّل حفظاً */
function usersTstNew(inc, cur) {
  var had = nmap(); (Array.isArray(cur) ? cur : []).forEach(function (x) { if (x && x.id) had[String(x.id)] = 1; });   /* KIVO_261: null-prototype */
  return (Array.isArray(inc) ? inc : []).some(function (x) { return x && /^tst_/i.test(String(x.id || '')) && !had[String(x.id)]; });
}
/* مراجعةُ التكامل W1-R2 (متوسط): all ⇒ كلُّ المعرّفات المخالفة بترتيبها لا أوّلُها — صفوفٌ تغيّر اسمُ دخولها (جديدةٌ أو معدَّلة) فلا يكون فيها حسابٌ
   محجوبٌ عن الفاعل لم يُمسّ (يعود من المخزَّن كما هو: usersScopeIn) — ويسمّيها الرفضُ (denied.dup) فيُسقطها العميلُ وحدها ويُعيد إرسالَ الباقي */
function usersDupNew(inc, cur, all) {
  var byA = nmap(), seen = nmap(), out = [], i, u, n, ks;
  (Array.isArray(cur) ? cur : []).forEach(function (x) { if (x && x.id) byA[x.id] = x; });   /* KIVO_261: null-prototype */
  var names = function (x) { var a = []; ['un', 'alt'].forEach(function (f) { var s = String((x && x[f]) || '').trim().toLowerCase(); if (s) a.push(s); }); return a; };
  for (i = 0; i < inc.length; i++) { u = inc[i]; if (!u || !u.id) continue; ks = names(u); for (n = 0; n < ks.length; n++) (seen[ks[n]] = seen[ks[n]] || []).push(u.id); }
  for (i = 0; i < inc.length; i++) {
    u = inc[i]; if (!u || !u.id) continue;
    var a = byA[u.id], was = a ? names(a).join('|') : null, now = names(u);
    if (was === now.join('|')) continue;                                  /* لم يتغيّر اسمُ دخوله: لا يُسأل عن تصادمٍ قديم */
    for (n = 0; n < now.length; n++) if (seen[now[n]].some(function (id) { return id !== u.id; })) break;
    if (n < now.length) { if (!all) return u.id; out.push(u.id); }
  }
  return all ? out : '';
}
/* KIVO_265 · F-1/R-24 (RBAC_AUDIT_265 — متوسط · بالوضعين): مفتاحُ الموظف (ekey) لحسابٍ نشطٍ واحدٍ في الإدارة — كان يُنشأ حسابٌ نشطٌ ثانٍ بمعرّف موظفٍ قائم
   (أو يُربط به حسابٌ آخر) فيصير «هو» الموظف في «ملفي ← مهامي» (062c meTkIdent): يقرأ مهامَه وصورَ إثباته ويفعل باسمه. يُعاد معرّفُ أوّل حسابٍ صار حاملاً
   جديداً لمفتاحٍ يحمله غيرُه نشطاً (إنشاءٌ · ربطٌ · إعادةُ تفعيل · نقلُ إدارة) — والتكرارُ القائم قبل الحفظة لا يمنع حفظاً لا يمسّه. مفاتيحُ المديرين
   (mgr: · gm:) ومديرو النظام والعموم خارجُه كما في 070 tkAcctIx */
/* المراجعةُ المستقلة بعد 7a8af5c (ثغرةُ رقم الهوية): المفتاحُ يُحلّ إلى سجلّ الموظف لا يُقارن حرفاً — tkTokRec (eid ∪ nid · كـ062c) ثم pfLink («ملفي» · 062b) على
   سجلّ موظفي إدارته E[d] (من الدفعة إن حملته وإلا المخزَّن · 054 applySave) — فرقمُ هوية الموظف مفتاحاً لحسابٍ ثانٍ تكرارٌ كمعرّفه الثابت؛ والحرفيُّ لما لا يحلّ */
function usersDupEkey(inc, cur, E) {
  if (!Array.isArray(inc)) return '';
  var key = function (u) {
    var ek = String((u && u.ekey) || '');
    if (!u || !u.id || u.dis || !ek || u.role === 'super' || u.role === 'gm' || isMgrKey(ek) || ek.indexOf('gm:') === 0) return '';
    var d = String(u.deptId || ''), L = (E && E[d]) || [], r = tkTokRec(L, ek) || pfLink(u, L).rec, n = r ? L.indexOf(r) : -1;
    return n >= 0 ? d + '#' + n : d + '|' + ek;
  };
  var was = nmap(), by = nmap(), i, q;
  (Array.isArray(cur) ? cur : []).forEach(function (x) { if (x && x.id) was[String(x.id)] = key(x); });
  /* مراجعةُ التكامل R2-LEGACYLOCK: الحاملُ حسابٌ لا نسخة — نسختا تكرارٍ متطابق (054 usersDupIdIn) حسابٌ واحدٌ لا حاملان (إعادةُ تفعيله لا تُرفض بنفسه) */
  for (i = 0; i < inc.length; i++) { q = key(inc[i]); if (q && (by[q] = by[q] || []).indexOf(String(inc[i].id)) < 0) by[q].push(String(inc[i].id)); }
  for (i = 0; i < inc.length; i++) { q = key(inc[i]); if (q && by[q].length > 1 && was[String(inc[i].id)] !== q) return String(inc[i].id); }
  return '';
}
/* KIVO_254 · AUD-033 (ج) — الحارسُ الأخير على كل ما يغادر الخادم: أيُّ بصمةٍ ("ph":"p1$…/p2$…" أو صيغةُ PBKDF2 p2$<n>$<b64> أو الصيغةُ القديمة p1$<b36>.<b36>)
   تُحجب قبل الإرسال ويُسجَّل الحدثُ (ph-redacted) بلا محتوى — فتُكتشف أيُّ قناةٍ جديدة في الاختبارات والسجل بدل أن تسرّب. المصادرُ المعروفة
   (get · الإقلاع · denied/conflicts · التدقيق) تُنزع فيها البصماتُ قبل ذلك، فالحارسُ لا يعمل في المسار السليم. */
var PH_REDACT_RE = /"ph"\s*:\s*"(?:p1\$|p2\$)[^"]*"|p2\$\d+\$[A-Za-z0-9+\/=._-]{16,}|p1\$[a-z0-9]{4,}\.[a-z0-9]{4,}/g;
function redactPh(s, where) {
  if (typeof s !== 'string' || s.indexOf('p1$') < 0 && s.indexOf('p2$') < 0) return s;
  var n = 0, out = s.replace(PH_REDACT_RE, function (m) { n++; return m.charAt(0) === '"' ? '"ph":""' : '[redacted]'; });
  if (n) logEv('warn', 'ph-redacted', { where: where || '', n: n });
  return out;
}
/* دمج الحفظ القادم من المتصفح: سجل وصل بلا ph يرث بصمته المخزونة */
function mergeUsers(incomingJson, currentList, actorUid, rid) {
  var inc;
  try { inc = JSON.parse(incomingJson); } catch (e) { return null; }
  if (!Array.isArray(inc) || !inc.length) return null;
  var byId = nmap(), oc = nmap(), stale = 0;
  (currentList || []).forEach(function (u) { if (u && u.id) (byId[u.id] = byId[u.id] || []).push(u); });   /* KIVO_261: null-prototype */
  var merged = inc.map(function (u) {
    /* مراجعةُ التكامل R2-LEGACYLOCK/R2-SUBSET: النسخةُ رقم n من معرّفٍ مكرَّر ترث بصمةَ المخزَّنة رقم n (لا آخرها) — فنسخُ التكرار المتطابق تبقى متطابقة،
       ولا تكسب نسخةٌ مخزَّنةٌ بلا بصمة بصمةَ نسخةٍ أخرى (والمعرّفُ غيرُ المكرَّر كما كان) */
    var cs = u && u.id ? byId[u.id] : null, n = cs ? (oc[u.id] || 0) : 0; if (cs) oc[u.id] = n + 1;
    var s = cs ? cs[Math.min(n, cs.length - 1)] : null;
    if (u && !u.ph && u.id && s && s.ph) { var c = {}; for (var k in u) c[k] = u[k]; c.ph = s.ph; return c; }
    /* KIVO_253 · AUD-035 (ب): بصمةٌ قديمة p1$ لحسابٍ بصمتُه المخزَّنة p2$ = نسخةٌ قديمة لدى الكاتب لا كلمةٌ جديدة (العملاءُ يولّدون p2$ دائماً) —
       تُحفظ المخزَّنة فلا تُنزَّل البصمةُ ولا تُبطَل جلساتُ صاحبها؛ الاستثناء: تعيينٌ مؤقت جديد (mc يُرفع) أو صاحبُ الحساب نفسُه (سقوطُ متصفحٍ بلا WebCrypto) */
    if (u && u.id && u.ph && String(u.ph).indexOf('p2$') !== 0 && s && String(s.ph || '').indexOf('p2$') === 0 && u.ph !== s.ph
        && !(u.mc && !s.mc) && u.id !== actorUid) { var c2 = {}; for (var k2 in u) c2[k2] = u[k2]; c2.ph = s.ph; stale++; return c2; }
    return u;
  });
  if (stale) logEv('warn', 'users-stale-ph', { rid: rid, n: stale });
  /* درع أخير: لا يُقبل جدول حسابات بلا أي مشرف عام ببصمة — قفلٌ ذاتي للجميع */
  var hasSuper = merged.some(function (u) { return u && u.role === 'super' && u.ph && !u.dis; });
  return hasSuper ? JSON.stringify(merged) : null;
}

/* ── الجلسات ── */
async function session(env, req) {
  var tok = readCookie(req, COOKIE);
  if (!tok) return null;
  var P = env.__pre, s;   /* KIVO_255 · AUD-037: صفُّ الجلسة من لقطة الطلب (جُلب بالرمز نفسِه في دفعة المقدّمة) ما دامت حيّة */
  if (P && P.live && P.hasSess && P.tok === tok) s = P.sess;
  else s = await env.DB.prepare('SELECT tok, uid, ts, la, dev FROM sess WHERE tok = ?1').bind(tok).first();
  if (!s) return null;
  var now = Date.now();
  if (now - s.ts > SESSION_MAX || now - s.la > IDLE_MAX || (s.dev === 'test' && now - s.ts > ENF_TEST_TTL)) {   /* KIVO_244 · ADR-004: جلسةُ الاختبار تنتهي بعد ENF_TEST_TTL مهما بقيت في الجدول */
    await env.DB.prepare('DELETE FROM sess WHERE tok = ?1').bind(tok).run();
    return null;
  }
  if (now - s.la > 60000) {
    /* KIVO_255 · AUD-037: لمسُ الجلسة لا يؤخّر الردّ — يكتمل بعده (waitUntil) حين يتاح سياقُ التنفيذ، وإلا يُنتظَر كما كان؛
       ويمرّ على القاعدة الخام لا الغلاف كي لا يُطفئ لقطةَ القراءة (ليس تعديلاً لما تحمله) */
    var tp = (env.__rawDB || env.DB).prepare('UPDATE sess SET la = ?2 WHERE tok = ?1').bind(tok, now).run();
    if (env.__ctx && typeof env.__ctx.waitUntil === 'function') env.__ctx.waitUntil(tp.then(null, function (eT) { swallow('sess-touch', eT, env.__rid); }));
    else await tp;
  }
  return s;
}
/* على النطاق الحقيقي (https) تُوسم الكوكي Secure؛ وعلى localhost وقت
   التطوير تُترك بلا الوسم كي لا تسقط بصمت على http */
function isLocal(url) { return url.protocol === 'http:' && /^(localhost|127\.0\.0\.1)(:|$)/.test(url.host); }
function setCookie(tok, url) {
  return { 'Set-Cookie': COOKIE + '=' + tok + '; Path=/; HttpOnly; ' + (isLocal(url) ? '' : 'Secure; ') + 'SameSite=Lax; Max-Age=' + Math.floor(SESSION_MAX / 1000) };
}
function clearCookie(url) {
  return { 'Set-Cookie': COOKIE + '=; Path=/; HttpOnly; ' + (isLocal(url) ? '' : 'Secure; ') + 'SameSite=Lax; Max-Age=0' };
}

/* ── حارس محاولات الدخول — نفس سياسة المنصة: ٥ ثم تضاعف حتى ٥ دقائق ── */
/* KIVO_259 (إصلاح — كشفه التقييمُ المستقل · SOT-168): «حجزُ» المحاولة ذرّياً قبل التحقّق البطيء (PBKDF2). كان الحارسُ يقرأ القفلَ ثم يتحقّق ثم يقرأ
   العدّادَ ويكتبه (guardFail) — فيعبر دفعٌ متزامنٌ من مصدرٍ واحدٍ القفلَ كلُّه قبل أن يُكتب أيُّ إخفاق، وتضيع زياداتٌ بين القراءة والكتابة.
   الآن: قراءةُ الحالة وزيادةُ العدّاد في معاملةٍ واحدة (batch) — المقفلُ يُردّ بلا زيادة، والمحاولةُ التي تبلغ الحدَّ (LOCK_N) تضع القفلَ عند حجزها
   فتُردّ المتزامنةُ بعدها وتمضي هي إلى التحقّق: نجاحُها يرفع القفل (guardReset) وإخفاقُها يُبقيه — السلوكُ المتتابع كما كان (القفلُ بعد الخامسة · التضاعفُ). */
/* KIVO_260 (كشفته البطاقةُ المستقلة النهائية — scorecard_final §٤ بند 10): القفلُ الذي يضعه «الحجز» كان قفلاً كاملاً (5 ث فما فوق) ولو كانت
   المحاولاتُ المتزامنة صحيحةً كلُّها — فمكتبٌ خلف عنوانٍ واحد يدخل منه أكثرُ من lockN في اللحظة نفسِها يُعطَّل زرُّه بعدٍّ تنازليّ كامل وإن رفع
   أوّلُ نجاحٍ القفلَ بعد أجزاءٍ من الثانية. الآن قفلُ الحجز «مؤقّت» قصير (LOCK_PROV_MS) يكفي لتحقّق المحاولات المحجوزة، والقفلُ الكامل
   المتضاعف يضعه الإخفاقُ المؤكَّد (guardFail) من لحظته — فحدُّ الدفع المتزامن كما هو (لا يبلغ التحقّقَ أكثرُ من lockN)، والسلوكُ المتتابع كما هو
   (القفلُ بعد الإخفاق الخامس · التضاعف)، والنجاحُ يرفع القفلَ كما كان. */
var LOCK_PROV_MS = 1500;
async function guardLeft(env, gk) {
  var now = Date.now();
  var rs = await env.DB.batch([
    env.DB.prepare('SELECT n, until FROM guard WHERE gk = ?1').bind(gk),
    env.DB.prepare('INSERT INTO guard (gk, n, until) VALUES (?1, 1, 0) ON CONFLICT(gk) DO UPDATE SET n = CASE WHEN guard.until > ?2 THEN guard.n ELSE guard.n + 1 END, ' +
      'until = CASE WHEN guard.until > ?2 THEN guard.until WHEN guard.n + 1 >= ?3 THEN ?2 + ?4 ELSE guard.until END').bind(gk, now, LOCK_N, LOCK_PROV_MS)
  ]);
  var g = rs && rs[0] && rs[0].results && rs[0].results[0];
  return g ? Math.max(0, (g.until || 0) - now) : 0;
}
/* إخفاقٌ مؤكَّد بعد الحجز: المحاولةُ عُدّت عند حجزها؛ فإن بلغ العدُّ الحدَّ وُضع القفلُ الكامل المتضاعف من الآن (5 ث × 2^(n−lockN) حتى lockMin)
   — ذرّياً في عبارةٍ واحدة (MAX: إخفاقان متزامنان لا يقصّر أحدُهما قفلَ الآخر) — ويبقى إشعارُ القفل لمدير النظام عند بلوغ الحدّ */
async function guardFail(env, gk) {
  var now = Date.now();
  var g = await env.DB.prepare('UPDATE guard SET until = MAX(until, ?2 + MIN(?4, 5000 * (1 << MIN(30, MAX(0, n - ?3))))) WHERE gk = ?1 AND n >= ?3 RETURNING n').bind(gk, now, LOCK_N, LOCK_MS).first();
  if (g && g.n === LOCK_N) await secLog(env, { un: gk.indexOf('u:') === 0 ? gk.slice(2) : '', act: 'lock', target: gk, detail: String(g.n) });
}
/* KIVO_260 (كشفته البطاقةُ المستقلة النهائية — §٤ بند 12): «انتظر ٣ ثانية» تخالف قاعدةَ العدد والمعدود التي تلتزمها المنصة (R183 · BassamCount):
   ١ «ثانية واحدة» · ٢ «ثانيتين» · ٣–١٠ «ثوانٍ» · ١١–٩٩ «ثانية» · المئات «ثانية» — والحكمُ لآخر رقمين، كما في BassamCount نفسِها */
function secAr(n) {
  n = Math.max(1, Math.ceil(+n || 0)); var r = n % 100;
  if (n === 1) return 'ثانية واحدة';
  if (n === 2) return 'ثانيتين';
  return n + (r >= 3 && r <= 10 ? ' ثوانٍ' : ' ثانية');
}
async function guardReset(env, gk) {
  await env.DB.prepare('DELETE FROM guard WHERE gk = ?1').bind(gk).run();
}
/* عدّادٌ للإنذار لا للحجب: يُحصي محاولاتِ حسابٍ بعينه ليراها مديرُ النظام،
   ولا يضع until أبداً — فلا يقفل مهاجمٌ حسابَ غيره. */
async function guardCount(env, gk) {
  /* KIVO_259: زيادةٌ ذرّية (كان يقرأ ثم يكتب فتضيع زياداتٌ تحت التزامن) */
  var g = await env.DB.prepare('INSERT INTO guard (gk, n, until) VALUES (?1, 1, 0) ON CONFLICT(gk) DO UPDATE SET n = guard.n + 1, until = 0 RETURNING n').bind(gk).first();
  var n = g ? g.n : 0;
  if (n === LOCK_N) await secLog(env, { un: gk.indexOf('u:') === 0 ? gk.slice(2) : '', act: 'lock', target: gk, detail: String(n) });   /* CORE-02 (B3): the count, as guardFail writes it — was the word 'attempts' */
}
/* ── حدُّ معدّل الكتابة ─────────────────────────────────────────────────────
   نافذةٌ ثابتةٌ من دقيقة، ومفتاحُها الحسابُ لا عنوانُ الشبكة: مكتبٌ كاملٌ خلف
   عنوانٍ واحد لا يحجب بعضُه بعضاً، وحسابٌ واحدٌ من عشرة أجهزة يُحسب معاً.
   والزيادةُ والقراءةُ في عبارةٍ ذرّيّةٍ واحدة فلا يفلت طلبٌ من العدّ. */
/* العتبةُ مقيسةٌ لا مُخمَّنة: أسوأُ حملٍ مشروعٍ رُصد ٦١٣ حفظة/دقيقة (تحريرٌ
   متواصلٌ يرسل طلباً لكل كتابة)، فالسقفُ ضِعفُه. وخفضُه إلى المئات يحتاج
   تجميعَ الكتابات في طبقة المزامنة — بندٌ موثَّقٌ لجولةٍ لاحقة. */
var RL_SAVE = 1200;                         /* في الدقيقة لكل حساب — KIVO_255: يضبطه السياسةُ wrMin (loadPolicy) · رفعُ الصور بسقف RL_SAVE/4 (SOT-139) */
async function rlHit(env, scope, uid, lim) {
  var now = Date.now(), win = Math.floor(now / 60000), end = (win + 1) * 60000;
  var gk = 'rl:' + scope + ':' + uid + ':' + win;
  var g = await env.DB.prepare('INSERT INTO guard (gk, n, until) VALUES (?1, 1, ?2) ON CONFLICT(gk) DO UPDATE SET n = guard.n + 1 RETURNING n').bind(gk, end).first();
  var n = (g && g.n) || 1;
  /* كنسُ نوافذَ مضت — نادراً وبعبارةٍ واحدة، فلا ينتفخ الجدول */
  if (n === 1 && Math.random() < 0.03) { try { await env.DB.prepare("DELETE FROM guard WHERE until > 0 AND until < ?1 AND gk LIKE 'rl:%'").bind(now - 120000).run(); } catch (eC) { swallow('guard-prune', eC, env.__rid); } }
  return n > lim ? Math.max(1, Math.ceil((end - now) / 1000)) : 0;
}
/* KIVO_261 · AUD-050 (SR-5): انتظارُ /api/changes?wait=1 يقرأ رقمَ المراجعة كلَّ ثانية حتى 25 ث — بلا حدٍّ كان حسابٌ واحد يفتح منه ما شاء فيضاعف قراءاتِ D1.
   الحدّ في ذاكرة المعزول (بلا كتابةٍ في D1 لكل طلب): 3 انتظاراتٍ متزامنة لكل حساب و400 للمعزول كلِّه — ما زاد يُجاب فوراً بلا انتظار (والواجهةُ تعيد
   بعد 1.5 ث حين يعود الجوابُ سريعاً — فلا حلقةَ ضيّقة ولا خطأ). حدٌّ «أفضلُ جهد»: المعزولاتُ متعدّدة، والقصدُ ألّا يضخّم طلبٌ واحدٌ القراءاتِ بلا سقف. */
var LP_MAX_UID = 3, LP_MAX_ALL = 400, LP_TTL = 35000, LP_ACT = new Map();   /* uid ⇒ [لحظةُ دخول كلّ مقعد] */
/* KIVO_261 (إصلاح — كشفه المراجعُ الأمنيّ المستقل): قطعُ العميل للاتصال يُلغي الطلبَ في Workers فلا يُنفَّذ finally ولا يتحرّر مقعدُه — فالمقعدُ الآن
   محدودُ العمر (35 ث > أطولِ انتظار 25 ث) ويُكنس عند كلّ دخول؛ والحسابُ مفتاحٌ في Map (لا «__proto__» في كائن) */
function lpPrune(now) { LP_ACT.forEach(function (a, u) { var b = a.filter(function (t) { return now - t < LP_TTL; }); if (b.length) LP_ACT.set(u, b); else LP_ACT.delete(u); }); }
function lpEnter(uid) { var u = String(uid || ''), now = Date.now(), n = 0; lpPrune(now); LP_ACT.forEach(function (a) { n += a.length; }); var a = LP_ACT.get(u) || [];
  if (a.length >= LP_MAX_UID || n >= LP_MAX_ALL) return 0; a.push(now); LP_ACT.set(u, a); return now; }
function lpLeave(uid, t) { var u = String(uid || ''), a = LP_ACT.get(u); if (!a) return; var i = a.indexOf(t); if (i !== -1) a.splice(i, 1); if (!a.length) LP_ACT.delete(u); }
/* KIVO_261 (المراجعةُ الأمنية المستقلة · البند 5): حصّةُ رفع الصور اليومية لكل حساب — 256 MB في اليوم (UTC) شاملةً أجزاءَ الرفع المقطَّع ومحاولاتِه.
   كان المعدّلُ وحده (≈ 300 طلب/د × 512 KB) يسمح لحسابٍ واحد بنحو 150 MB في الدقيقة من بياناتٍ لا تُجرد ولا تُكنس فتُستنزف سعةُ القاعدة.
   الحصّةُ سخيّةٌ لا تمسّ الاستعمال (الخريطةُ 1–5 MB · صورُ المهام مئاتُ KB) ومديرُ النظام مستثنى (الاستعادةُ الشاملة). العدّادُ صفٌّ في guard
   ببادئة rl: (لا يُحتسب قفلاً في «نظرة عامة» ويُكنس مع نوافذ المعدّل بعد انقضاء يومه) — زيادةٌ ذرّيةٌ واحدة لكل رفع. */
var IMG_DAY_MAX = 256 * 1024 * 1024;
var IMG_QUOTA_ERR = 'تجاوزتَ حصّةَ رفع الصور اليومية لحسابك (256 MB) — أعد المحاولة غداً أو راجع مدير النظام';
async function imgQuotaHit(env, uid, bytes) {
  var now = Date.now(), day = Math.floor(now / 86400000), end = (day + 1) * 86400000;
  var g = await env.DB.prepare('INSERT INTO guard (gk, n, until) VALUES (?1, ?2, ?3) ON CONFLICT(gk) DO UPDATE SET n = guard.n + ?2 RETURNING n').bind('rl:iq:' + uid + ':' + day, bytes, end).first();
  var n = (g && g.n) || bytes;
  return n > IMG_DAY_MAX ? Math.max(1, Math.ceil((end - now) / 1000)) : 0;
}
function tooMany(sec) {
  return json({ ok: 0, err: 'طلباتٌ كثيرة من حسابك — أعد المحاولة بعد ' + secAr(sec), retry: sec }, 429, { 'Retry-After': String(sec) });   /* KIVO_260: secAr */
}

/* KIVO_265 · G-1 (تحقّقُ الخلفية — متوسط · بالوضعين): حمايةُ أفعال الموظف (tkKeepSelf · F-10) لا تُرفع إلا لاستعادةٍ أو استيرادٍ مخوَّلٍ على المفتاح نفسِه —
   الاستعادةُ ببوّابة استثناء H-1 نفسِها (018 taskSrvExempt: الإنفاذ بسياسة enfSavePrep · القديم بعلامتها لمن يقبلها) · والاستيرادُ لحامل admin/import
   (القديم) أو import.replace (الإنفاذ). كان حدثُ {etype:'dataset', act:'import'|'restore'} يدّعيه العميلُ على أيّ مفتاحٍ يكفي — فيمحو حاملُ task.edit
   توثيقَ الموظف (21) وتُكنس صورةُ إثباته ويعيد كتابةَ ملاحظته. rst/imp: علامتا المفتاح (rstK9 · impK9) · X: سياقُ الإنفاذ (ENFX) أو null */
function tkKeepOff(A, k, d, rst, imp, X) {
  if (rst[k] && taskSrvExempt(A, d, { rst: 1, enf: X ? { restore: !!X.restore } : null })) return true;
  if (imp[k]) return X ? enfHeld(A, d, 'import.replace') : actsHeldOn(A, d, 'admin/import', ['del']);
  return false;
}
/* ── تنفيذ الحفظ: {set, del, base} → القاعدة ──
   لكل مفتاح: (١) التفويض — يُرفض ما لا يحق للفاعل كتابته ويعود بقيمته
   الحالية ليرتدّ المتصفح عنها؛ (٢) التعارض — إن أرسل المتصفح رقم النسخة
   التي بنى عليها تعديله (base) وكان الخادم قد تجاوزها فلا تُكتب القيمة بل
   تعود الأحدث ليدمج المتصفح عليها ويعيد الإرسال؛ (٣) التدقيق — كل كتابة
   نافذة تُسجَّل بفاعلها ووقتها وفرقها. */
/* V7 · issue #4 (018 nodeCapSweep): the answer of a save whose registry the server cleaned (out.__nc — set once in applySave, read once here).
   · hide: the request did not carry bassam_perms_v1 — nothing about that key is reported (280 saveAck9 refuses an answer naming a key the
     request did not send); the page learns the new registry as any change by another writer (live pull · a conflict on its next save);
   · echo: the request carried it and the server wrote it without the swept records — answered as conflicts[k] = { cur: the written value,
     rev: its revision } so the page adopts exactly what was stored (its merge over cur is cur: nothing re-sent, nothing announced). */
function nodeCapAck(out) {
  var m = out && out.__nc; if (!m) return out;
  delete out.__nc;
  if (m.hide) { if (out.revs) delete out.revs[K_PERM]; if (out.conflicts) delete out.conflicts[K_PERM]; }
  else if (out.revs && out.revs[K_PERM] != null) { out.conflicts = out.conflicts || {}; out.conflicts[K_PERM] = { cur: m.echo, rev: out.revs[K_PERM], by: '', at: Date.now(), self: true }; delete out.revs[K_PERM]; }
  return out;
}
async function applySave(env, body, A, ip, opt) {   /* opt: { srv } مسارُ مهامٍ في الخادم يبني من القيمة الحالية · { quiet } الرفضُ لا يُسجَّل هنا (يحكم المستدعي) — F-10 */
  var planOnly=!!(opt && opt.__restorePlan===RESTORE_INTERNAL_TOKEN);
  if (planOnly && opt.__serverDepartmentWipes) A.__udel = 1;
  if (planOnly && opt.__srvRestore === RESTORE_INTERNAL_TOKEN) A.__srvRst = 1;   /* RISHAD266 (مراجعة المالك على aae024c): الاستعادةُ الخادمية المتحقَّقة (019d) وحدها — علامةُ الاستعادة القادمة من العميل لا تستثني من سلامة العلاقات */   /* RISHAD266: حفظةُ الحذف الذرّيّ نفسُه (019e rsWipeRoute · رمزٌ داخليّ) — الطريقُ الوحيد لحذف وحدة (018 deptShapeWhy) */
 if(!planOnly&&!(opt&&opt.__cuPass===RESTORE_INTERNAL_TOKEN)&&rsSaveNeedsAtomic(body))return nodeCapAck(await rsSaveCommit(env,A,body,ip,opt));
  var set = (body && body.set) || {}, del = (body && body.del) || [], base = (body && body.base) || {};
  /* Retired document key: reject the entire mixed batch before any mutation. In
     particular a full restore must never acknowledge a partial relational restore. */
  var moved = Object.keys(set).concat(del.map(String)).filter(function (k) { return resName(k) === K_DSTATS || nfLegacyKey(k) || cuLegacyKey(k) || (irLegacyKey(k) || bdLegacyKey(k)); });
  if (moved.length) { var denied = {}; moved.forEach(function (k) { denied[k] = { why: 'domain-moved', path: szLegacyKey(k) ? '/api/seized' : awLegacyKey(k) ? '/api/award' : irLegacyKey(k) ? '/api/irshad' : cuLegacyKey(k) ? '/api/custody' : nfLegacyKey(k) ? '/api/notifications' : '/api/dstats' }; }); return { v: await curRev(env), revs: {}, denied: denied, conflicts: {}, atomic: 'domain-moved' }; }
  /* R169: أحداثُ السجل المرافقة — تُقبل فقط لمفاتيح هذا الطلب، وتُكتب مع القيمة في الدفعة نفسِها */
  var audKeysOk = {}; for (var ka9 in set) audKeysOk[String(ka9)] = 1; for (var da9 = 0; da9 < del.length; da9++) audKeysOk[String(del[da9])] = 1;
  var audIn = audClean(body && body.aud, audKeysOk);
  /* PRIVACY batch (019u header · privIn/privPermsStale): hidden parts come back from the stored value BEFORE any context or rule, so every rule
     judges the value as it will be written; a registry built on another projection (body.pscope) and a changed hidden reference stop here (pvNo9). */
  var pvNo9 = nmap();
  if (A.u.role !== 'super') await privPrep(env, A, Object.keys(set).concat(del.map(String)));
  if (A.u.role !== 'super' && Object.prototype.hasOwnProperty.call(set, K_USERS)) await privPrepDepts(env, A, (A.depts || []).map(function (x) { return x && x.id; }));   /* 019u (9): the accounts lens */
  for (k in set) {
    if (!Object.prototype.hasOwnProperty.call(set, k) || set[k] == null || A.u.role === 'super') continue;
    var rnPv = resName(k), dPv = parseKey(k).dept;
    if (k !== K_PERM && rnPv !== 'bassam_employees_v1' && rnPv !== 'bassam_dreport_v1' && !(dPv && A.__privTok && A.__privTok[dPv])) continue;
    var curPv = await opResourceGet(env, k); if (curPv == null) continue;
    if (k === K_PERM && (pvNo9[k] = privPermsStale(A, body && body.pscope, set[k], curPv))) continue;
    var pv9 = privIn(A, k, String(set[k]), curPv); if (pv9 === PRIV_NO) pvNo9[k] = 'privacy-hidden'; else set[k] = pv9;
  }
  /* KIVO_265 · S5 (مراجعةُ الخادم): معرّفُ الحدث 'tk…' لأحداث مسارات المهام في الخادم وحدها (070 tkAud — ومنها يُثبت التكرارُ صاحبَ السلسلة ونُسخَها
     المحذوفة: 073) — والحفظُ الخامّ من العميل معرّفاتُه 'c…' (290). حدثٌ بمعرّف الخادم في حفظةٍ من العميل يُسقط ولا يُكتب (كان مستخدمٌ يملك الإضافةَ وحدها
     يُلغي موعدَ سلسلةِ غيره بحدث «أُنشئت» مزوَّر) — ومساراتُ الخادم (A.__tkSrv · tkSave: opt.srv — والمسارُ الذاتي منها) كما هي */
  if (!A.__tkSrv && !(opt && opt.srv)) audIn = audIn.filter(function (e) { return !/^tk/i.test(e.cid); });
  /* R194 · Phase 2 (باقٍ في Phase 3 دليلاً مسانداً): حفظةُ استعادةِ نسخة من أحداث التدقيق (dataset · import|restore) — للظلّ فقط */
  var pv2Restore = false; for (var pr9 = 0; pr9 < audIn.length; pr9++) if (audIn[pr9].etype === 'dataset' && (audIn[pr9].act === 'import' || audIn[pr9].act === 'restore')) pv2Restore = true;
  /* R196 · Phase 3: علاماتُ العمليات الصريحة (body.ops) — بياناتٌ غيرُ موثوقة تُعقَّم (KIVO_BUILD.markers) وتُقرأ للظلّ فقط؛ لا تصل إلى canWrite ولا إلى أي قاعدة */
  var pv3M = { ops: {}, n: 0, bad: 0, byOp: {} }; try { pv3M = KIVO_BUILD.markers(body && body.ops, audKeysOk); } catch (e3m) { swallow('pv3-markers', e3m, env.__rid); }
  var pv3Restore = null; for (var pm9 in pv3M.ops) if (pv3M.ops[pm9].op === 'backup.restore') { pv3Restore = pv3M.ops[pm9]; break; }
  /* KIVO_265 · H-1 (018 taskXWhy): علامةُ الاستعادة تُضيّق — لا تمنح — استثناءَ العمود 23 في مخزن المهام: في الوضع القديم لمدير النظام وحده
     (صاحبُ الصلاحية كلِّها أصلاً) أثناء استعادة نسخة؛ ولا يصل بها أحدٌ غيرُه إلى شيء. وفي الإنفاذ تحكم سياسةُ الاستعادة (enfSavePrep) */
  /* KIVO_265 · H-1: علامةُ الاستعادة لكل مفتاح (ctx.rst — 018 taskSrvExempt) — إعادةُ المراجعة (N-6): على المفتاح نفسِه (علامتُه في ops أو حدثُ «استعادة»
     لمجموعته) لا أيُّ علامةٍ في الحفظة: كانت علامةُ مفتاحٍ آخر (سجلُّ الموظفين مثلاً) تستثني مخزنَ المهام من أحكام الحفظ الخامّ كلِّها */
  var rstK9 = nmap(); for (var rs9 = 0; rs9 < audIn.length; rs9++) if (audIn[rs9].etype === 'dataset' && audIn[rs9].act === 'restore') rstK9[audIn[rs9].k] = 1;
  for (var rp9 in pv3M.ops) if (pv3M.ops[rp9] && pv3M.ops[rp9].op === 'backup.restore') rstK9[rp9] = 1;
  /* KIVO_265 · G-1 (تحقّقُ الخلفية · BACKEND_VERIFY_265): وعلامةُ الاستيراد لكل مفتاح — يحكم بهما tkKeepOff على المفتاح نفسِه وبصلاحية صاحبه (لا أيُّ حدثٍ في الحفظة) */
  var impK9 = nmap(); for (var im9 = 0; im9 < audIn.length; im9++) if (audIn[im9].etype === 'dataset' && audIn[im9].act === 'import') impK9[audIn[im9].k] = 1;
  var pv3RetroCtx = {}; try { pv3RetroCtx = await permv3RetroLoad(env, set, del); } catch (e3r) { swallow('pv3-retroLoad', e3r, env.__rid); }
  /* R197 · Phase 4: مرجعياتُ النطاق المخزّنة (أقفالُ الجدول/المهام · جدولُ الورديات) لكل إدارة — للظلّ فقط */
  var pv4Refs = {}; try { pv4Refs = await permv4RefsLoad(env, set, del); } catch (e4r) { swallow('pv4-refsLoad', e4r, env.__rid); }
  /* KIVO_243 · الإنفاذ: سياقُ الحفظة (سجلّاتُ النطاق · جداولُ الورديات · الأسباب · سياستا الاستيراد والاستعادة) — في وضع الإنفاذ وحده */
  var ENFX = null;
  if (A.enf) {
    var enfAudRestore = false, enfAudHist = false;
    for (var ah9 = 0; ah9 < audIn.length; ah9++) if (audIn[ah9].etype === 'dataset') { if (audIn[ah9].act === 'restore') enfAudRestore = true; else if (audIn[ah9].act === 'import' && resName(audIn[ah9].k) === K_DSTATS) enfAudHist = true; }
    ENFX = await enfSavePrep(env, A, body, set, del, audKeysOk, pv3M, pv3Restore, enfAudRestore, enfAudHist, pv3RetroCtx, pv4Refs);
  } else if (A.u.ekey) for (var ob9 in set) { var od9 = parseKey(ob9).dept; if (od9 && resName(ob9) === 'bassam_rounds_v1') (A.__obsToks = A.__obsToks || nmap())[od9] = enfToksOf(await opResourceGet(env, 'bsdept:' + od9 + ':bassam_employees_v1'), String(A.u.ekey)); }   /* RISHAD266 (F24 في الوضع القديم): هويّاتُ راصد الميدان في التسكين — كالإنفاذ */
  /* الرقمُ يُخصَّص بعد المرور كلِّه، حين يُعرف أن ثمّة ما يُنفَّذ فعلاً */
  var rev = 0, pend = [];
  var st = [], k, changed = 0, i;
  var revs = await revsAll(env);
  var out = { revs: {}, denied: {}, conflicts: {} };
  /* READ-01: لا تُسلَّم قيمةٌ حاليةٌ إلا لمن يقرأ المفتاح — الرفضُ لا يكون قناةَ تسريب */
  var curSafe = function (kq, cq) { if (!canRead(A, kq)) return null; if (ENFX && cq != null) { try { cq = enfProjectStr(A, kq, cq, ENFX.refs); } catch (eP9) { return null; } } if (kq === K_USERS && cq != null) cq = usersScopeOut(usersNoOut(stripPh(cq), A), A); return privOut(A, kq, cq); };   /* KIVO_248 · AUD-033: القيمةُ الحالية في denied/conflicts كانت تحمل بصمات كلمات المرور — تُنزع كما في /api/get والإقلاع · KIVO_254 (ج): لكل الأدوار بلا استثناء (كان مدير النظام يُستثنى) */
  var curUsers = null, now = Date.now();
  var ident = { uid: A.u.id, un: String(A.u.un || ''), ip: (ip && ip.ip) || '', city: (ip && ip.city) || '', dev: (ip && ip.dev) || '' };
  /* KIVO_264 · D14 · OD-7: حفظةٌ تغيّر اسمَ دخول صاحبها (un/alt) ⇒ كلمةُ المرور الحالية «cur» في جسمها تُفحص هنا مرّةً (PBKDF2 غيرُ متزامن) — والحكمُ في selfAcctWhy (018) */
  var selfCurSt = Object.prototype.hasOwnProperty.call(set, K_USERS) ? await selfCurState(env, A, String(set[K_USERS]), body && body.cur) : null;
  /* مراجعةُ التكامل W1-R1: بصمةُ عدسة الفاعل الآن (usersLensFp) — تُقارن ببصمة القائمة التي بنى عليها حفظَه (body.uscope) وتُرفق بكلّ تعارضٍ أو رفضٍ
     لمفتاح الحسابات (usOut9) مع القيمة الحالية المُسقَطة بها، فيعيد العميلُ بناءَ تعديله على الإسقاط الحالي. حفظٌ بلا body.uscope (تبويبٌ من قبل هذا
     الإصدار يحمل القائمةَ الكاملةَ قبل الإسقاط) يبقى على السلوك السابق حرفاً */
  var usFp9 = null, usFp = function () { if (usFp9 === null) usFp9 = usersLensFp(A); return usFp9; };
  var usStale9 = Object.prototype.hasOwnProperty.call(set, K_USERS) && A.u.role !== 'super' && typeof (body && body.uscope) === 'string' && body.uscope !== '' && body.uscope !== usFp();
  var usOut9 = function (k, o, ev) { if (k === K_USERS && usFp()) o.uscope = usFp(); if (k === K_USERS && ev && ev.dup) o.dup = ev.dup; if (k === K_PERM && A.u.role !== 'super') { o.pscope = privPermsFp(A); if (pvNo9[k] === 'scope') o.why = 'perms-scope-changed'; } return o; };
  /* سياق الطلب: هل صار سجل موظفي الإدارة فارغاً في هذه الحفظة نفسها؟
     يُحسب مرّةً لكل إدارةٍ يمسّ الطلبُ تقريرَها اليومي — ولا يُحسب بلا حاجة. */
  /* سياق الطلب لكل إدارةٍ يمسّها: سجل الموظفين كما سيصير بعد هذا الطلب —
     فارغاً كان أو ممتلئاً — ومفاتيحُه الحيّة التي يُقاس عليها ما زال وما بقي.
     يُحسب مرّةً واحدة لكل إدارة، ولا يُحسب لمن لا يحتاجه. */
  var CTX_RES = { 'bassam_dreport_v1': 1, 'bassam_custody_v1': 1, 'bassam_award_v1': 1, 'bassam_employees_v1': 1,
                  'bassam_staffing_v3': 1, 'bassam_staffing_v2': 1, 'bassam_tasks_v1': 1, 'bassam_plan_v1': 1, 'bassam_rounds_v1': 1 };
  var wipeCtx = {}, empCtx = {}, empRaw9 = {};
  for (k in set) {
    var rnW = resName(k);
    if (!CTX_RES[rnW]) continue;
    var dW = parseKey(k).dept; if (!dW || wipeCtx[dW] !== undefined) continue;
    var ekW = 'bsdept:' + dW + ':bassam_employees_v1';
    var evW = Object.prototype.hasOwnProperty.call(set, ekW) ? String(set[ekW]) : await opResourceGet(env, ekW);
    empRaw9[dW] = evW;
    var elW = parseJson(evW, null);
    wipeCtx[dW] = Array.isArray(elW) ? !elW.length : false;
    var liveW = {};
    if (Array.isArray(elW)) for (var eW = 0; eW < elW.length; eW++) {
      var exW = elW[eW]; if (!isObj(exW)) continue;
      if (exW.eid) liveW[String(exW.eid)] = 1;
      if (exW.nid) liveW[String(exW.nid)] = 1;
      if (exW.name) liveW[String(exW.name)] = 1;
      if (exW.empno) liveW[String(exW.empno)] = 1;
    }
    empCtx[dW] = { live: liveW };
  }
  /* KIVO_265 · المراجعةُ الموحّدة (R-2): سياقُ قاعدة الحساب النشط للحفظ الخامّ لمخزن المهام (018 taskAcctWhy) — حساباتُ الدخول بقيمتها الحالية وسجلُّ
     موظفي الإدارة كما بعد هذه الدفعة (كسياق حذف الموظف أعلاه) — ولا يُقرأ لمسارات الخادم (taskSrvExempt).
     إعادةُ المراجعة (N-3): الحساباتُ من الفاعل نفسِه (A.users — قرأها actorOf لهذا الطلب) فلا قراءةَ ثانيةً لسجلّها في كل حفظٍ للمهام */
  var tkCtx9 = {}, tkUs9 = null, tkUs9b = null;
  if (!A.__tkSrv) for (k in set) {
    if (resName(k) !== 'bassam_tasks_v1') continue;
    var dT9 = parseKey(k).dept; if (!dT9 || tkCtx9[dT9]) continue;
    if (tkUs9 === null) { tkUs9 = Array.isArray(A.users) ? A.users : parseJson(await kvGet(env, 'kv', K_USERS), []); if (!Array.isArray(tkUs9)) tkUs9 = []; }
    /* KIVO_265 · G-2 (تحقّقُ الخلفية): والحساباتُ كما بعد هذه الدفعة إن حملت سجلَّ الحسابات — users2 (018 taskAcctWhy: نشطٌ في القائمتين) */
    /* الفحصُ العميق (R4): الحفظةُ تحمل القائمةَ كما رآها الفاعل — فتُكمَّل بما حُجب عنه (usersNoIn · usersScopeIn) كما ستُكتب */
    /* مراجعةُ التكامل W1-R1: قائمةٌ من إسقاطٍ قديم لا تُكتب (تعارض) ⇒ الحساباتُ بعد الدفعة هي الحالية */
    if (tkUs9b === null) { if (Object.prototype.hasOwnProperty.call(set, K_USERS) && !usStale9) { var tkUc9 = await kvGet(env, 'kv', K_USERS); tkUs9b = parseJson(usersScopeIn(usersNoIn(String(set[K_USERS]), tkUc9, A), tkUc9, A), []); } else tkUs9b = false; if (tkUs9b !== false && !Array.isArray(tkUs9b)) tkUs9b = []; }
    tkCtx9[dT9] = { users: tkUs9, users2: tkUs9b || null, emps: tkEmps(Object.prototype.hasOwnProperty.call(empRaw9, dT9) ? empRaw9[dT9] : await opResourceGet(env, 'bsdept:' + dT9 + ':bassam_employees_v1')) };
  }
  /* KIVO_265 · ملاحظةُ المالك (أمن): سياقُ تفرّد الهوية/الجوال/الرقم الوظيفي (018 empDupWhy) — قوائمُ موظفي الإدارات الأخرى
     بقيمتها الحالية (من سجلّ الإدارات) وحساباتُ الدخول من الفاعل نفسه؛ تُقرأ مرةً واحدة للدفعة ولمفاتيح الموظفين وحدها */
  var edCtx9 = null;
  for (k in set) {
    if (resName(k) !== 'bassam_employees_v1' || !parseKey(k).dept || edCtx9) continue;
    /* لا قراءةَ لبقية الإدارات إلا إذا حملت الدفعةُ هويةً أو جوالاً أو رقماً وظيفياً ليس في القيمة الحالية (تعديلُ اسمٍ أو حالة لا يقرأ شيئاً) */
    /* القيمةُ الحالية من المخزن لا من empRaw9 (يحمل قيمةَ الدفعة نفسِها لمفاتيحها — فكان القديمُ = الجديد والقاعدةُ لا تعمل: فحصُ Test 2026-10-19) */
    var oldE9 = empIdents(parseJson(await opResourceGet(env, k), [])), newE9 = empIdents(parseJson(String(set[k]), [])), chg9 = false, q9;
    for (q9 in newE9.n) if (!oldE9.n[q9]) chg9 = true; for (q9 in newE9.p) if (!oldE9.p[q9]) chg9 = true; for (q9 in newE9.o) if (!oldE9.o[q9]) chg9 = true;
    if (!chg9) continue;
    var dl9 = parseJson(await kvGet(env, 'kv', 'bassam_depts_v1'), null), ids9 = [];
    (Array.isArray(dl9) ? dl9 : (dl9 && Array.isArray(dl9.list) ? dl9.list : [])).forEach(function (x) { if (x && x.id) ids9.push(String(x.id)); });
    var em9 = ids9.length ? await opResourceMany(env, ids9.map(function (id) { return 'bsdept:' + id + ':bassam_employees_v1'; })) : {};
    edCtx9 = { others: {}, users: Array.isArray(A.users) ? A.users : parseJson(await kvGet(env, 'kv', K_USERS), []) };
    for (var ei9 = 0; ei9 < ids9.length; ei9++) { var ek9 = 'bsdept:' + ids9[ei9] + ':bassam_employees_v1'; edCtx9.others[ids9[ei9]] = parseJson(em9[ek9] == null ? '[]' : String(em9[ek9]), []); }
  }
  /* إعادة تسمية الوردية في هذا الطلب نفسه: تُلتقط من مورد الإعدادات ليُقاس
     عليها ما يتبعها في الجدول الشهري — ولا تُستنتج من الجدول وحده. */
  var shRenCtx = {};
  for (k in set) {
    if (resName(k) !== 'bassam_shift_options_v1') continue;
    var dS = parseKey(k).dept; if (!dS) continue;
    var oldS = parseJson(await opResourceGet(env, k), null), newS = parseJson(String(set[k]), null);
    if (!Array.isArray(oldS) || !Array.isArray(newS) || oldS.length !== newS.length) continue;
    var inO = {}, inN = {}, goneS = [], bornS = [], qS;
    for (qS = 0; qS < oldS.length; qS++) if (isObj(oldS[qS]) && oldS[qS].name != null) inO[String(oldS[qS].name)] = 1;
    for (qS = 0; qS < newS.length; qS++) if (isObj(newS[qS]) && newS[qS].name != null) inN[String(newS[qS].name)] = 1;
    for (qS in inO) if (!inN[qS]) goneS.push(qS);
    for (qS in inN) if (!inO[qS]) bornS.push(qS);
    if (goneS.length === 1 && bornS.length === 1) shRenCtx[dS] = { o: goneS[0], n: bornS[0] };
  }
  /* ══ مسحُ العمليات المحمية — من شكل الطلب لا من نتيجة الحكم ════════════
     فلو رُفض جزءُ العملية الآخر بقيت العملية «محمية» ورُدّ الطلب كاملاً. */
  var CLEAN_RES = { 'bassam_staffing_v3': 1, 'bassam_staffing_v2': 1, 'bassam_tasks_v1': 1,
                    'bassam_custody_v1': 1, 'bassam_award_v1': 1, 'bassam_plan_v1': 1, 'bassam_rounds_v1': 1 };
  var protOp = '';
  var hasEmp = {}, hasClean = {}, hasStaff = {};
  for (k in set) {
    var rnP = resName(k), dP = parseKey(k).dept; if (!dP) continue;
    if (rnP === 'bassam_employees_v1') hasEmp[dP] = k;
    if (CLEAN_RES[rnP]) hasClean[dP] = 1;
    if (rnP === 'bassam_staffing_v3' || rnP === 'bassam_staffing_v2') hasStaff[dP] = 1;
  }
  for (var dQ in hasEmp) if (hasClean[dQ]) protOp = 'empDelete';
  for (var dR in shRenCtx) if (hasStaff[dR]) protOp = protOp || 'shiftRename';
  if (!protOp) for (k in set) {
    var rnQ = resName(k);
    if (rnQ !== 'bassam_custody_v1' && rnQ !== 'bassam_employees_v1') continue;
    var EQ = entOf(k); if (!EQ || (!EQ.rename && !EQ.adopt)) continue;
    var aQ = parseJson(await opResourceGet(env, k), null), bQ = parseJson(String(set[k]), null);
    if (aQ == null || bQ == null) continue;
    var infQ = {}; alignOld(EQ, aQ, bQ, infQ);
    if (infQ.ren) { protOp = 'custodyRename'; break; }
    if (infQ.adopt) { protOp = 'adopt'; break; }
  }
  var todo = [];
  /* F01 · الأقسام: سجلّا الهيكل (الوحدات ثم العقد) يُحكم عليهما قبل كلِّ مفتاح — فوحدةٌ جديدةٌ في الحفظة وحدةٌ لمفاتيحها أيّاً كان ترتيبُها؛
     وكلٌّ منهما يُحكم على الهيكل كما سيصير بالسجلّين معاً (A.__regNext — 018 shapeList) */
  A.__regNext = nmap();
  [K_DEPTS, K_GDEPTS].forEach(function (kr) {
    if (!Object.prototype.hasOwnProperty.call(set, kr)) return;
    todo.push({ k: kr, v: String(set[kr]), act: 'set' });
    var pr9 = parseJson(String(set[kr]), null); if (Array.isArray(pr9)) A.__regNext[kr] = pr9;
  });
  for (k in set) if (k !== K_DEPTS && k !== K_GDEPTS) todo.push({ k: k, v: String(set[k]), act: 'set' });
  for (i = 0; i < del.length; i++) todo.push({ k: String(del[i]), v: null, act: 'del' });
  /* «فحص الصلاحيات العميق · المرحلة 0 (الجولة 2)» · R3-4: إسنادُ القالب يكتب الورقةَ (bassam_perms_v1) والمنحَ الصريح (bsdept:<d>:bassam_grants_v1)
     في حفظةٍ واحدة، ورفعُ الإسقاط يُحكم بما سيحمله الموظفُ بعد الحفظ (059 enfMinusLiftWhy) — فتُقيَّم الصلاحياتُ أوّلاً، وتُعطى سجلاتُ المنح صلاحياتِ ما بعد
     الحفظ إن قُبلت (pa9) وإلا المخزَّنة؛ ومنحٌ حُكم بها لا يُكتب إلا إن كُتبت هي في الحفظة نفسها (حارسُ نسختها في مجموعته: dep9) */
  var pa9 = null, paOn9 = false;
  if (A.enf && A.u.role !== 'super' && Object.prototype.hasOwnProperty.call(set, K_PERM) && todo.some(function (t) { return resName(t.k) === ENF_GRANTS_RES; })) {
    paOn9 = true; var rk9 = function (x) { return x.act !== 'set' ? 0 : (x.k === K_DEPTS || x.k === K_GDEPTS) ? 2 : x.k === K_PERM ? 1 : 0; }; todo.sort(function (x, y) { return rk9(y) - rk9(x); });
  }
  /* «… (الجولة 2)» · R3-2: ربطُ حسابٍ بمفتاحٍ يحمل منحاً صريحاً باقياً يُحكم كمنح (018 usersGrantWhy) — سجلاتُ المنح لكلّ الوحدات تُقرأ مرّةً لحفظ الحسابات */
  var gx9 = Object.prototype.hasOwnProperty.call(set, K_USERS) && A.u.role !== 'super' ? await usersGrantsLoad(env, A) : null;
  /* ══ المرحلة الأولى: تقييمٌ كامل بلا كتابة ══════════════════════════════
     يُقاس كلُّ مفتاحٍ أولاً، ويُعرف هل في الطلب عمليةٌ محمية. فإن كانت ومعها
     رفضٌ واحد، رجع الطلب كلُّه بلا كتابةٍ ولا rev — ولا تبعةَ جزئية. وما خلا
     العمليات المحمية يبقى على عقد /api/save القديم: قبولٌ جزئيّ كما كان. */
  var evald = [], regMk9 = null, regMks9 = [], regRst9 = [], regN9 = 0;
  while (regN9 < todo.length && todo[regN9].act === 'set' && (todo[regN9].k === K_DEPTS || todo[regN9].k === K_GDEPTS)) regN9++;
  /* F01: سجلُّ هيكلٍ قُبل حكمُه ثم لم يُكتب (تعارضُ نسخة · رفضٌ بعد الحكم) ⇒ تُنقض وحداتُه وعقدُه الجديدة قبل أيّ مفتاحٍ بعده (018 batchRegUndo) */
  var regUndo9 = function (q) { if (!regMk9) return; var rv9 = evald[q]; if (!(rv9 && (rv9.ok || rv9.noop))) batchRegUndo(A, regMk9); regMk9 = null; };
  /* والسجلّان معاً وأحدُهما لم يُكتب ⇒ يُعاد الحكمُ على المكتوب بالمخزَّن من الآخر (018 regPairWhy) قبل أيّ مفتاحٍ بعدهما */
  var regPair9 = function () {
    if (regN9 !== 2) return;
    var g0 = !!(evald[0] && (evald[0].ok || evald[0].noop)), g1 = !!(evald[1] && (evald[1].ok || evald[1].noop));
    if (g0 === g1) return;
    var j = g0 ? 0 : 1, e9 = evald[j];
    if (!e9 || !e9.ok) return;
    var w9 = regPairWhy(A, todo[j].k, todo[j].v, e9.cur, regRst9[j], todo[1 - j].k);
    if (!w9) return;
    batchRegUndo(A, regMks9[j]);
    var vn9 = ENFX ? enfNo(w9) : null;
    evald[j] = { deny: w9, cur: e9.cur, x: vn9 };
    if (ENFX) { var lp9 = enfLogRow(A, todo[j].k, vn9, '/api/save', { ip: ident.ip }); if (lp9) ENFX.log.push(lp9); }
  };
  for (i = 0; i < todo.length; i++) {
    regUndo9(i - 1);
    if (i === regN9) regPair9();
    var it0 = todo[i], k0 = it0.k;
    if (paOn9 && i === regN9 + 1 && todo[regN9] && todo[regN9].k === K_PERM) pa9 = evald[regN9] && evald[regN9].ok ? parseJson(todo[regN9].v, null) : null;   /* R3-4: الصلاحياتُ قُيّمت أوّلاً (بعد سجلّي الهيكل) */
    if (it0.act === 'set' && (k0 === K_DEPTS || k0 === K_GDEPTS)) regMks9[i] = regMk9 = batchRegMark(A);
    if (isDeviceKey(k0)) { evald.push(null); continue; }
    if (it0.act === 'del' && k0 === K_USERS) { evald.push({ deny: 'users' }); continue; }
    var cur0 = await opResourceGet(env, k0), P00 = parseKey(k0), d00 = P00 ? P00.dept : '', raw0 = it0.v;
    /* PRIVACY batch (019u): registry built on another projection ⇒ conflict with the current one (usOut9: pscope · why) · projection without
       pscope omitting a visible entry, or a changed hidden reference ⇒ refused — nothing of it is judged or written */
    if (it0.act === 'set' && pvNo9[k0] && !(ENFX && ENFX.batchDeny)) { evald.push(pvNo9[k0] === 'scope' ? { conflict: 1, cur: cur0 } : { deny: pvNo9[k0], cur: cur0, sd: pvNo9[k0] }); continue; }
    if (it0.act === 'set' && k0 === K_USERS && A.u.role !== 'super') {
      /* مراجعةُ التكامل W1-R1: قائمةٌ بُنيت على عدسةٍ غير عدسته الآن (usStale9) ⇒ تعارضٌ قبل usersNoIn/usersScopeIn/canWrite — فلا يُحكم على إسقاطٍ قديم
         ولا يُكتب منه شيء (ما صار يراه ولم يصله لا يُحسب حذفاً). ورفضُ الدفعة كلِّها في الإنفاذ (batchDeny) يبقى رفضاً
         مراجعةُ التكامل R3-ORDER (منخفض): والتعارضُ قبل بوابة المعرّف المكرَّر — كان تكرارٌ قديمٌ مختلفُ النسخ صارت نسخُه المحجوبةُ مرئيةً بتغيّر العدسة
         يُرفض «dup-id» (سطرٌ أمنيٌّ زائفٌ وإعادةٌ كاملة) بدل التعارض. لا يكتب التعارضُ شيئاً، والمعادُ ببصمةٍ حديثة يمرّ بالبوابة كاملةً (فيُرفض ويُسجَّل إن خالف) */
      if (usStale9 && !(ENFX && ENFX.batchDeny)) { evald.push({ conflict: 1, cur: cur0 }); continue; }
      /* مراجعةُ التكامل W1-CRIT: معرّفٌ مكرَّرٌ في الواردة ⇒ رفضٌ (السجلُّ الأمنيّ: dup-id) إلا تكراراً قديماً لم يُمسّ (usersDupIdIn) — قبل كلّ تحويلٍ وحكم وبالوضعين */
      var dI9 = usersDupIdIn(it0.v, cur0, A);
      if (dI9.id != null) { evald.push({ deny: 'users', cur: cur0, x: { detail: 'dup-id' }, sd: 'users · dup-id ' + String(dI9.id).slice(0, 80) }); continue; }
      it0.v = dI9.v;
      /* مراجعةُ التكامل R2-OLDTAB (متوسط — انتقالُ النشر): تبويبٌ بقي مفتوحاً من قبل الموجة (عميلٌ لا يعرف uscope) يجلب بعد أيّ تغييرٍ قائمةً مُسقَطة
         ثم يحفظها بلا بصمة؛ فإن انتقلت إدارةٌ إلى نطاقه بعدها حُسب ما لم يصله حذفاً. قائمةٌ بلا بصمةٍ هي إسقاطٌ (تُسقط محجوباً · أو تحمل صفَّ دليل:
         R3-OLDTAB-ALL) وتُسقط مرئياً ⇒ رفضٌ لا حذف
         (يعود العميلُ القديم إلى قيمة الخادم ويعيد المستخدمُ التحميل) — والقائمةُ الكاملة القديمة والمُسقَطةُ التي لا تحذف شيئاً تمضيان كما كانتا */
      if (!(typeof (body && body.uscope) === 'string' && body.uscope !== '') && usersOmitsSeen(it0.v, cur0, A)) {
        /* وعلى نسخةٍ قديمة (عبارةُ فحص النسخة نفسُها): تعارضٌ بالإسقاط الحالي — يدمجه العميلُ القديمُ (merge3) فيحمل ما صار يراه ويعيد بنسخةٍ حديثة */
        if (Object.prototype.hasOwnProperty.call(base, k0) && (revs[k0] || 0) && Number(base[k0]) !== (revs[k0] || 0) && !(ENFX && ENFX.batchDeny)) { evald.push({ conflict: 1, cur: cur0 }); continue; }
        evald.push({ deny: 'users', cur: cur0, x: { detail: 'users-stale-client' }, sd: 'users · users-stale-client' }); continue;
      }
    }
    /* KIVO_259 · SR-1: ما لم يُرسَل إلى الفاعل («no» لحسابات غيره) يُورَث من القيمة الحالية قبل الحكم — فلا يُحسب حذفاً ولا يُمحى */
    if (it0.act === 'set' && k0 === K_USERS) it0.v = usersNoIn(it0.v, cur0, A);
    /* الفحصُ العميق (R4 · IRSZ-3): وما حُجب عنه بالإسقاط (حساباتُ غيره · حقولُها) يعود من القيمة الحالية نفسِها قبل الحكم — usersScopeIn */
    if (it0.act === 'set' && k0 === K_USERS) it0.v = usersScopeIn(it0.v, cur0, A);
    /* الترتيب: الشكل والثوابت والتفويض أولاً، ثم فحصُ النسخة. فالكتابةُ غير
       المصرَّح بها لا تتحوّل إلى «تعارض» لمجرّد قِدَم النسخة. */
    /* F-10 (من SR-2.3 · KIVO_242): حفظٌ خامٌّ لمخزن المهام لا يمحو أفعالَ الموظف التي لم يرها (tkKeepSelf في 070) — قبل الحكم فيُحكَم على ما سيُكتب؛
       لا للمسار الذاتي ولا لمسارات المهام في الخادم (opt.srv) ولا للاستعادة والاستيراد المخوَّلين على هذا المفتاح (G-1: tkKeepOff — كان أيُّ حدثٍ يدّعيه العميل يكفي) */
    if (it0.act === 'set' && cur0 != null && resName(k0) === 'bassam_tasks_v1' && !A.__tkSelf && !(opt && opt.srv) && !tkKeepOff(A, k0, d00, rstK9, impK9, ENFX)) {
      var st9 = Object.prototype.hasOwnProperty.call(base, k0) && (revs[k0] || 0) && Number(base[k0]) !== (revs[k0] || 0);   /* KIVO_265: base قديم ⇒ x من الخادم (H-1 · تعارضٌ لا رفض) */
      var kp9 = tkKeepSelf(it0.v, cur0, { x: !!st9 }); if (kp9.n) { it0.v = kp9.v; logEv('warn', 'tk-kept', { n: kp9.n, rid: env.__rid }); }
    }
    if (!ENFX && it0.act === 'set' && it0.v != null && cur0 != null && d00 && resName(k0) === 'bassam_rounds_v1') it0.v = obsKeepOthers(A, d00, it0.v, cur0);   /* RISHAD266: راصد الميدان في الوضع القديم (018) */
    var ctx0 = {
      empsEmpty: wipeCtx[d00] === true, emps: empCtx[d00] || null, shRen: shRenCtx[d00] || null,
      imp: !!d00 && actsHeldOn(A, d00, 'admin/import', ['del']),
      selfCur: k0 === K_USERS ? selfCurSt : null,                                 /* KIVO_264 · D14 */
      gx: k0 === K_USERS ? gx9 : null,                                            /* «فحص الصلاحيات العميق · المرحلة 0 (الجولة 2)» · R3-2 */
      pa: pa9 && resName(k0) === ENF_GRANTS_RES ? pa9 : null,                     /* «… (الجولة 2)» · R3-4 */
      cl: A.u.role === 'super' && !!body && body.clearLatent === true,           /* caps-own: the system administrator's explicit clearing of latent items (021 latentLossWhy) */
      rst: !!rstK9[k0],                                                           /* KIVO_265 · H-1: علامةُ الاستعادة على هذا المفتاح (الوضع القديم · N-6) — ولمن تُقبل: 018 taskSrvExempt (R-5) */
      tk: tkCtx9[d00] || null,                                                    /* KIVO_265 · R-2: سياقُ الحساب النشط (018 taskAcctWhy) */
      ed: edCtx9 && d00 && resName(k0) === 'bassam_employees_v1' ? edCtx9 : null,  /* KIVO_265 · أمن: تفرّدُ الهوية عبر الإدارات (018 empDupWhy) */
      dw: !!(d00 && opt && Array.isArray(opt.__serverDepartmentWipes) && opt.__serverDepartmentWipes.indexOf(d00) !== -1)   /* RISHAD-266: مسحُ الإدارة أو حذفُها في الخادم (059 scopeRetiredWhy) */
    };
    if (ENFX) {
      /* merge-on-write: ما يُحجب عن الفاعل في القراءة يعود من القيمة الحالية قبل التصنيف — فلا يمحوه ولا يكتب فيه */
      /* …ومحاولةُ الكتابة في المحجوب (أو فشلُ الدمج) رفضٌ صريح — fail-closed */
      if (it0.act === 'set' && it0.v != null && cur0 != null) { try { var mc9 = enfMergeChk(A, k0, it0.v, cur0, ENFX.refs); it0.v = mc9.v; if (mc9.hidden) ctx0.enfHidden = 'hidden-data (outside the actor view: shift · site/zone · assignment · lens · source)'; } catch (eM9) { ctx0.enfHidden = 'merge-failed'; } }
      ctx0.imp = !!d00 && enfHeld(A, d00, 'import.replace');
      ctx0.enf = enfCtxFor(ENFX, k0, d00);
    }
    if (i < regN9) regRst9[i] = ENFX ? !!(ctx0.enf && ctx0.enf.restore) : !!ctx0.rst;   /* F01: علامةُ الاستعادة كما رآها حكمُه (044 · 060) */
    var vd0 = ENFX && ENFX.batchDeny ? enfNo(ENFX.batchDeny.why, ENFX.batchDeny) : (ENFX && ctx0.enfHidden ? enfNo('scope', { detail: ctx0.enfHidden }) : canWrite(A, k0, it0.v, cur0, ctx0));
    /* KIVO_265 · المراجعةُ الموحّدة (R-4): أحكامُ مخزن المهام الخامّ (018 taskRawWhy) تقيس الحفظةَ على القيمة الحالية — فعلى base قديمٍ قد يكون الحكمُ
       أثرَ ما كتبه الخادمُ أو غيرُه بعد قراءتها (تمديدٌ في 23 · حذفُ صفٍّ · إعادةُ إسناد) لا فعلَها هي. ولا كتابةَ على base قديمٍ أصلاً (فحصُ النسخة أدناه)
       ⇒ تعارضٌ يدمجه العميلُ ثم يعيد الإرسالَ بنسخةٍ حديثة فيُحكم عليه كاملاً (والرفضُ حينها صريح). كانت تُرفض «task-x» فتُسقط الواجهةُ تعديلاتِ
       المفتاح كلَّها («صلاحيتك لا تشمله») */
    if (!vd0.ok && it0.act === 'set' && TK_RAW_WHY[vd0.why] && resName(k0) === 'bassam_tasks_v1' && Object.prototype.hasOwnProperty.call(base, k0) && (revs[k0] || 0) && Number(base[k0]) !== (revs[k0] || 0)) {
      evald.push({ conflict: 1, cur: cur0 }); continue;
    }
    if (ENFX) { var lr9 = enfLogRow(A, k0, vd0, '/api/save', { ip: ident.ip }); if (lr9) ENFX.log.push(lr9); }
    /* R194…R203 — الظلّ: يقيس حكمَ السجل الحالي v24.9 (ربطُ الحرّاس + آلياتُ Phase 3 + نطاقُ Phase 4/4.1/4.1.1 — وPhase 4.2 جردٌ تجريبي لا يمسّ الكتابة — وPhase 4.3 هويةٌ ثابتة يقرؤها المحرّك — وPhase 4.4 بروفةُ ترحيلٍ لا تكتب — وPhase 4.5 تمهيدٌ مُدمَج هوية→نطاق لا يكتب) بجانب حكم canWrite ولا يغيّره؛ canWrite نفسُها لم تُمسّ.
       علاماتُ العمليات (ops) وسياقُ الاستدراك يُضافان إلى ctx0 هنا — بعد صدور الحكم — فلا تراهما canWrite ولا أيُّ قاعدة */
    try { ctx0.restore = !!(pv2Restore || pv3Restore); ctx0.op = pv3M.ops[k0] || null; ctx0.retroWin = pv3RetroCtx; ctx0.pv4 = pv4Refs[d00] || {}; if (!PERMV2.mute && !ENFX) permv2Bind(A, k0, it0.v, cur0, ctx0, vd0); } catch (e9b) { swallow('permv2-batch', e9b, env.__rid); }
    if (!vd0.ok) { evald.push({ deny: vd0.why, cur: cur0, x: ENFX || vd0.detail ? vd0 : null }); continue; }
    /* KIVO_259 · SR-8: اسمُ دخولٍ جديد (أو معدَّل) يصادم حساباً آخر ⇒ رفض — لكل الأدوار ومنها مدير النظام (الواجهةُ تمنعه أصلاً: taken · empHolder) */
    /* مراجعةُ التكامل W1-R2: ولغير مدير النظام يسمّي الرفضُ الصفوفَ المخالفة (dup) — مما أرسله الفاعلُ نفسُه وحده، لا من حسابٍ محجوب */
    if (it0.act === 'set' && k0 === K_USERS) {
      var dN9 = usersDupNew(parseJson(it0.v, []), parseJson(cur0, []), true), dR9 = null;
      if (dN9.length && A.u.role !== 'super') {
        var rI9 = nmap(), rP9 = parseJson(raw0, null);
        (Array.isArray(rP9) ? rP9 : []).forEach(function (x) { if (isObj(x) && x.id != null) rI9[String(x.id)] = 1; });
        dR9 = dN9.map(String).filter(function (q) { return rI9[q]; }).slice(0, 1000);
      }
      /* مراجعةُ التكامل R2-LOOP (متوسط — حلقةُ حفظٍ لا تنتهي): قائمةٌ على نسخةٍ قديمة تحمل صفاً نقل الخادمُ اسمَ دخوله بعدها إلى حسابٍ لا يراه الفاعل
         (حُذف حسابُه ثم فُعّل الشخصُ في إدارةٍ أخرى) — كان يُرفض بصفّه (dup) فيعيده العميلُ إلى نسخة أساسه وهي ما أرسله حرفاً فيعود الرفضُ بلا نهاية.
         النسخةُ القديمة (عبارةُ فحص النسخة أدناه نفسُها) ⇒ تعارضٌ بالإسقاط الحالي: يُدمج تعديلُه على القيمة الحديثة (وليس فيها الصفُّ المحذوف) ويُعاد بنسختها */
      if (dN9.length && A.u.role !== 'super' && Object.prototype.hasOwnProperty.call(base, k0) && (revs[k0] || 0) && Number(base[k0]) !== (revs[k0] || 0)) { evald.push({ conflict: 1, cur: cur0 }); continue; }
      if (dN9.length) { evald.push({ deny: 'users', cur: cur0, x: null, dup: dR9 && dR9.length ? dR9 : null }); continue; }
    }
    /* KIVO_265 · F-1/R-24 (RBAC_AUDIT_265): حسابٌ نشطٌ جديدٌ أو مربوطٌ أو مُعادُ التفعيل بمفتاح موظفٍ يحمله حسابٌ نشطٌ آخر في الإدارة ⇒ رفض — لكل الأدوار وبالوضعين */
    if (it0.act === 'set' && k0 === K_USERS) {
      /* المراجعةُ المستقلة (ثغرةُ رقم الهوية): سجلُّ موظفي كلِّ إدارةٍ فيها حسابٌ جديدٌ أو تغيّر مفتاحُه أو تعطيلُه أو إدارتُه أو دورُه — من الدفعة إن حملته وإلا المخزَّن */
      var uI9 = parseJson(it0.v, []), uC9 = parseJson(cur0, []), uB9 = nmap(), uE9 = nmap(), uq9;
      (Array.isArray(uC9) ? uC9 : []).forEach(function (x) { if (x && x.id) uB9[String(x.id)] = x; });
      (Array.isArray(uI9) ? uI9 : []).forEach(function (x) { var w = x && x.id ? uB9[String(x.id)] : null; if (x && x.deptId && (!w || ['ekey', 'dis', 'deptId', 'role'].some(function (f) { return String(w[f] == null ? '' : w[f]) !== String(x[f] == null ? '' : x[f]); }))) uE9[String(x.deptId)] = 1; });
      for (uq9 in uE9) { var uk9 = 'bsdept:' + uq9 + ':bassam_employees_v1'; uE9[uq9] = tkEmps(Object.prototype.hasOwnProperty.call(set, uk9) ? String(set[uk9]) : await opResourceGet(env, uk9)); }
      if (usersDupEkey(uI9, uC9, uE9)) { evald.push({ deny: 'users', cur: cur0, x: null }); continue; }
    }
    /* KIVO_261 (AUD-056 — كشفه المراجعُ الأمنيّ المستقل): بادئةُ المعرّف tst_ محجوزةٌ لحسابات عُدّة الاختبار (إشعاراتُ النظام تتجاهلها · SOT-183) —
       حسابٌ جديدٌ بها يُرفض إلا حيث أداةُ الاختبار مفعَّلة (Preview بـKIVO_TEST_FIXTURE)، فلا تُسكَت إنذاراتُ حسابٍ حقيقيٍّ في Production */
    if (it0.act === 'set' && k0 === K_USERS && !enfFixtureOn(env) && usersTstNew(parseJson(it0.v, []), parseJson(cur0, []))) { evald.push({ deny: 'users', cur: cur0, x: null }); continue; }
    /* عقدُ base: لا مفتاحَ يُكتب أو يُحذف بلا نسخةٍ يبني عليها العميل. الواجهة
       ترسلها لكل مفتاح أصلاً (payload)، فالمخالفُ عميلٌ آخر — ولا يُخمَّن له. */
    if (!Object.prototype.hasOwnProperty.call(base, k0)) { evald.push({ deny: 'base', cur: cur0 }); continue; }
    /* لا كتابةَ بلا تغيير: مطابقةٌ نصّيةٌ صرفة — لا تطبيعَ ولا إعادةَ ترتيب.
       تُحسب قبل فحص النسخة، فإعادةُ الإرسال بعد انقطاعٍ تصير بلا أثرٍ لا تعارضاً.
       والعملياتُ المحميّة تبقى على عقدها كما هي. */
    if (!protOp) {
      if (it0.act === 'set' && cur0 != null && String(it0.v) === String(cur0)) { evald.push({ noop: 1, cur: cur0 }); continue; }
      if (it0.act === 'del' && cur0 == null) { evald.push({ noop: 1, cur: null }); continue; }
    }
    /* ربطٌ أجنبيّ: صورةٌ مملوكةٌ لموردٍ آخر لا يكتبه الفاعل — يُرفض ولا يُفهرس */
    if (it0.act === 'set' && imgLike(String(it0.v == null ? '' : it0.v))) {
      if (await imgForeignIn(env, A, k0, it0.v, cur0)) { evald.push({ deny: 'imgown', cur: cur0 }); continue; }
    }
    if (Object.prototype.hasOwnProperty.call(base, k0) && (revs[k0] || 0) && Number(base[k0]) !== (revs[k0] || 0)) { evald.push({ conflict: 1, cur: cur0 }); continue; }
    evald.push({ ok: 1, cur: cur0, keys: ENFX ? vd0.keys : null, dep9: !!ctx0.pa });   /* R3-4: منحٌ حُكم بصلاحيات ما بعد الحفظ */
  }
  if (todo.length === regN9) { regUndo9(todo.length - 1); regPair9(); }               /* F01: حفظةٌ فيها السجلّان وحدهما */
  /* V7 · issue #4 (018 nodeCapSweep): the node registry was accepted ⇒ the ceiling records of the nodes it removes go in this same save, and a
     node it adds does not inherit a record stored before it. The registry is the request's own when it carries one (cleaned, and answered
     with what was written — nodeCapAck), otherwise a write the server derives from the stored one. Either way the batch is all-or-nothing
     (protOp): a refusal or a conflict on any key writes nothing, and the registry is never cleaned for a node that stays. */
  var ncG9 = -1, ncP9 = -1, ncD9 = null, ncM9 = null;
  for (i = 0; i < todo.length; i++) if (todo[i].act === 'set') { if (todo[i].k === K_GDEPTS) ncG9 = i; else if (todo[i].k === K_PERM) ncP9 = i; }
  if (ncG9 !== -1 && evald[ncG9]) {
    var ncS9 = await opResourceGet(env, K_PERM), ncE9 = ncP9 !== -1 ? evald[ncP9] : null,
      nc9 = nodeCapSweep(A, todo[ncG9].v, await opResourceGet(env, K_GDEPTS), ncP9 !== -1 ? todo[ncP9].v : null, ncS9, !!A.__srvRst);
    if (nc9.couple) protOp = protOp || 'nodeCap';
    if (nc9.v != null && evald[ncG9].ok) {
      protOp = protOp || 'nodeCap';
      if (ncP9 === -1) { ncD9 = { cur: ncS9, v: nc9.v }; if (!A.__srvRst) ncM9 = { hide: 1 }; }
      else if (ncE9 && (ncE9.ok || ncE9.noop)) { todo[ncP9].v = nc9.v; if (ncE9.noop) evald[ncP9] = { ok: 1, cur: ncE9.cur, keys: null, dep9: false }; ncM9 = { echo: nc9.v }; }
    }
  }
  /* caps-own (021 capStaleBatch): an older page that narrows a ceiling and deletes what fell outside it in the same request ⇒ the whole request
     is refused, nothing written (why 'perms' — the text an older page already shows: «الصلاحيات لم تُقبل … أُعيدت القيمة كما في الخادم») */
  if (capStaleBatch(A, todo, evald)) {
    protOp = protOp || 'capStale';
    for (i = 0; i < todo.length; i++) if (evald[i] && !evald[i].conflict && !evald[i].deny) evald[i] = { deny: 'perms', cur: evald[i].cur, x: { detail: 'stale-client: ' + CAP_STALE_MSG }, sd: 'perms · stale-client' };
  }
  /* R196 · Phase 3 — حسابُ الحفظة ظلّياً (العلامات · سياسةُ الاستعادة) بعد تقييم كلِّ المفاتيح وقبل أي كتابة */
  try { if (!PERMV2.mute && !ENFX) permv3Batch(A, set, del, evald, todo, pv3M, pv3Restore, pv2Restore); } catch (e3c) { swallow('permv3-batch', e3c, env.__rid); }
  if (protOp || planOnly) {
    /* مانعٌ واحدٌ يكفي: رفضاً كان أو تعارضاً — فالعملية المترابطة لا تُنفَّذ
       نصفَين. وتبقى معلومات التعارض في الردّ ليُعيد العميلُ المحاولة. */
    var stopN = 0;
    for (i = 0; i < evald.length; i++) if (evald[i] && (evald[i].deny || evald[i].conflict)) stopN++;
    if (stopN) {
      for (i = 0; i < todo.length; i++) {
        var ev1 = evald[i]; if (!ev1) continue;
        if (ev1.conflict) {
          var lwA = null; try { lwA = await env.DB.prepare('SELECT ts, uid, un FROM aud WHERE k = ?1 ORDER BY ts DESC LIMIT 1').bind(todo[i].k).first(); } catch (eLA) { lwA = null; }
          out.conflicts[todo[i].k] = usOut9(todo[i].k, { cur: curSafe(todo[i].k, ev1.cur), rev: revs[todo[i].k] || 0, by: (lwA && lwA.uid !== A.u.id) ? String(lwA.un || '') : '', at: lwA ? (lwA.ts || 0) : 0, self: !!(lwA && lwA.uid === A.u.id) });
          continue;
        }
        if (!ev1.deny) continue;
        out.denied[todo[i].k] = usOut9(todo[i].k, enfDenyInfo({ why: ev1.deny, cur: curSafe(todo[i].k, ev1.cur), rev: revs[todo[i].k] || 0 }, ev1), ev1);
        if (!(opt && opt.quiet)) st.push(secStmt(env, { ts: now, uid: ident.uid, un: ident.un, act: 'denied', target: todo[i].k, detail: ev1.sd || ev1.deny, ip: ident.ip, city: ident.city, dev: ident.dev }));
      }
      out.atomic = protOp;                                          /* عمليةٌ محمية رُدَّت كاملة */
      if (ENFX) for (var lz = 0; lz < ENFX.log.length; lz++) st.push(enfLogStmt(env, ENFX.log[lz]));
      if(planOnly)return Object.assign(out,{__plan:1,ok:0,protectedOp:protOp,authzRows:ENFX?ENFX.log:[]});
      for (var jz = 0; jz < st.length; jz += 90) await env.DB.batch(st.slice(jz, jz + 90));
      out.v = rev - 1;
      return out;
    }
  }
  /* KIVO_243 · §12: نسخةُ ما قبل العملية للاستعادة والاستبدال (import.replace) — تُكتب قبل أي تغيير في الدفعة نفسِها */
  if (ENFX && !planOnly) {
    var snapIt = [], replace9 = false;
    for (i = 0; i < todo.length; i++) { var ev9 = evald[i]; if (!ev9 || !ev9.ok) continue; if (ev9.keys && ev9.keys.indexOf('import.replace') !== -1) replace9 = true; }
    if (ENFX.restore || replace9) for (i = 0; i < todo.length; i++) if (evald[i] && evald[i].ok) snapIt.push({ k: todo[i].k, cur: evald[i].cur });
    if ((ENFX.restore || replace9) && ncD9) snapIt.push({ k: K_PERM, cur: ncD9.cur });   /* issue #4: the derived registry write is part of the operation */
    if (snapIt.length) { var sid9 = enfSnapId(ENFX.restore ? 'restore' : 'replace'); st = st.concat(enfSnapStmts(env, sid9, ENFX.restore ? 'restore' : 'replace', A, snapIt, revs, { keys: snapIt.length })); out.snap = sid9; }
  }
  /* ══ المرحلة الثانية: الكتابة ══ */
  var imgTouch = [];
  for (i = 0; i < todo.length; i++) {
    var it = todo[i], ev = evald[i]; k = it.k;
    if (isDeviceKey(k)) continue;                                   /* مفاتيح الجهاز لا تُخزَّن مركزياً */
    /* مطابقٌ للمخزَّن: لا كتابة ولا مراجعة ولا تدقيق ولا إخطار — ويُعاد في revs
       بنسخته الحالية حتى يَعُدّ العميلُ طلبَه ناجحاً ويُفرغ طابوره. */
    if (ev && ev.noop) { out.revs[k] = revs[k] || 0; continue; }
    if (it.act === 'del' && k === K_USERS) { out.denied[k] = usOut9(k, { why: 'users', rev: revs[k] || 0 }); continue; }
    /* حكمُ المرحلة الأولى وقيمتُها هما المعتمدان — فلا تُعاد قراءةٌ ولا حساب */
    var cur = ev ? ev.cur : await opResourceGet(env, k);
    var P0 = parseKey(k);
    var have = revs[k] || 0;
    /* التعارض: قيمةٌ بُنيت على نسخةٍ تجاوزها الخادم — وقد حُكم عليها سلفاً */
    if (ev && ev.conflict) {
      /* مَن سبقك ومتى: من سجل التدقيق — فتُخبَر الشاشة باسمه لا بـ«زميل»، وتسكت إن كان الحساب نفسه من جهاز آخر */
      var lw = null; try { lw = await env.DB.prepare('SELECT ts, uid, un FROM aud WHERE k = ?1 ORDER BY ts DESC LIMIT 1').bind(k).first(); } catch (eLw) { lw = null; }
      var lwName = '';
      if (lw && lw.uid) { if (curUsers === null) curUsers = await usersList(env); var lwU = (curUsers || []).filter(function (x) { return x && x.id === lw.uid; })[0]; lwName = (lwU && (lwU.name || lwU.un)) || lw.un || ''; }
      out.conflicts[k] = usOut9(k, { cur: curSafe(k, cur), rev: have, by: lwName, at: lw ? (lw.ts || 0) : 0, self: !!(lw && lw.uid === A.u.id) });
      continue;
    }
    var v = it.v;
    var verdict = ev && ev.ok ? { ok: true } : { ok: false, why: (ev && ev.deny) || 'view' };
    if (!verdict.ok) { out.denied[k] = usOut9(k, enfDenyInfo({ why: verdict.why, cur: curSafe(k, cur), rev: have }, ev), ev); if (!(opt && opt.quiet)) st.push(secStmt(env, { ts: now, uid: ident.uid, un: ident.un, act: 'denied', target: k, detail: (ev && ev.sd) || verdict.why, ip: ident.ip, city: ident.city, dev: ident.dev })); continue; }
    if (it.act === 'set' && k === K_USERS) {
      if (curUsers === null) curUsers = await usersList(env);
      var m = mergeUsers(v, curUsers, A.u.id, env.__rid);
      if (m === null) { out.denied[k] = usOut9(k, { why: 'users', cur: curSafe(k, cur), rev: have }); continue; }
      /* من غيّر كلمة مروره بنفسه يسقط عنه علم «كلمة مؤقتة» */
      try { var mj = JSON.parse(m), cm = {}; (curUsers || []).forEach(function (x) { if (x && x.id) cm[x.id] = x; });
        mj.forEach(function (x) { if (x && x.id === A.u.id && x.mc && cm[x.id] && x.ph && x.ph !== cm[x.id].ph) delete x.mc; }); m = JSON.stringify(mj); } catch (e) { swallow('users-mc-strip', e, env.__rid); }
      v = m;
    }
    /* KIVO_259 (إصلاح — كشفه k258load): عباراتُ المفتاح مجموعةٌ واحدة تُنفَّذ في معاملةٍ واحدة يتقدّمها حارسُ النسخة (revGuard — مقارنةٌ
       ومبادلة) — كان التحقّقُ من base يسبق الكتابةَ بجولاتٍ فيعبر حفظان متزامنان على النسخة نفسِها ويكتب الثاني فوق الأوّل بلا تعارض
       (تحديثٌ ضائع: 12 جلسة × 40 ث على عدّادٍ مشترك ⇒ 748 زيادةً «ناجحة» والعدّادُ 300). المجموعة: الحارس · القيمة · النسخة · أحداثُ الأمن · التدقيق */
    var kvS = it.act === 'set' ? kvPutStmts(env, 'kv', k, v) : [env.DB.prepare('DELETE FROM kv WHERE k = ?1').bind(k)], secS = [];
    /* الصور: لا يُدفع ثمنٌ لقيمةٍ لا تحمل مفتاحَ صورة */
    if (imgLike(String(cur == null ? '' : cur)) || (it.act === 'set' && imgLike(String(v == null ? '' : v))))
      imgTouch.push({ k: k, v: it.act === 'set' ? v : '' });
    /* سجلُّ المراجعة والتدقيق يحملان الرقم، فيُؤجَّلان إلى ما بعد تخصيصه */
    pend.push({ k: k, act: it.act, cur: cur, v: v, have: have, kvS: kvS, secS: secS, dep9: !!(ev && ev.dep9) });
    if (k === K_USERS) { usersSecEvents(parseJson(cur, []), parseJson(v, []), ident, now).forEach(function (e) { secS.push(secStmt(env, e)); }); secS.push.apply(secS, usersSessStmts(env, parseJson(cur, []), parseJson(v, []), A.u.id, A.tok || '')); }   /* KIVO_252 · AUD-034/035 */
    if (k === K_PERM) secS.push(secStmt(env, { ts: now, uid: ident.uid, un: ident.un, act: 'perm_change', target: '', detail: permChangeDetail(parseJson(cur, {}), parseJson(v, {})), ip: ident.ip, city: ident.city, dev: ident.dev }));
    changed++;
  }
  /* V7 · issue #4: the registry write derived from the accepted node registry — same batch, same revision, guarded by the registry's own revision */
  if (ncD9 && pend.some(function (x) { return x.k === K_GDEPTS; })) {
    pend.push({ k: K_PERM, act: 'set', cur: ncD9.cur, v: ncD9.v, have: revs[K_PERM] || 0, kvS: kvPutStmts(env, 'kv', K_PERM, ncD9.v), dep9: false,
      secS: [secStmt(env, { ts: now, uid: ident.uid, un: ident.un, act: 'perm_change', target: '', detail: permChangeDetail(parseJson(ncD9.cur, {}), parseJson(ncD9.v, {})), ip: ident.ip, city: ident.city, dev: ident.dev })] });
    changed++;
  }
  if (ncM9) out.__nc = ncM9;
  if(planOnly)return {__plan:1,ok:!Object.keys(out.denied).length&&!Object.keys(out.conflicts).length,protectedOp:protOp,pend:pend,out:out,revs:revs,ident:ident,authzRows:ENFX ? ENFX.log : []};
  /* لحظةُ التخصيص: بعد أن عُرف أن ثمّة تغييراً واحداً على الأقل سيُنفَّذ */
  if (changed) {
    rev = await nextRev(env);
    if (ENFX && out.snap) st.push(env.DB.prepare("UPDATE authz_snaps SET meta = json_set(COALESCE(meta, '{}'), '$.rev', ?2) WHERE snap = ?1").bind(out.snap, rev));   /* KIVO_243: رقمُ العملية — لكشف الانجراف عند الرجوع */
    for (var p9 = 0; p9 < pend.length; p9++) {
      var pd = pend[p9];
      /* «فحص الصلاحيات العميق · المرحلة 0 (الجولة 2)» · R3-4: منحٌ حُكم بصلاحيات ما بعد الحفظ (dep9) يُكتب بعد أن كُتبت هي بنسخة هذه الحفظة — وإلا تعارض */
      pd.g = [revGuard(env, pd.k, pd.have)].concat(pd.dep9 ? [revGuard(env, K_PERM, rev)] : [], pd.kvS, [env.DB.prepare('INSERT INTO revs (k, rev) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET rev = ?2').bind(pd.k, rev)], pd.secS);
      out.revs[pd.k] = rev;
      /* ══ R169-CC: مخزنٌ واحد، وتسجيلٌ واحدٌ للفعل الواحد ══
         للمفتاح الذي له مخطّطُ كيانات: أحداثُ كيانِه هي السجل. ولمن لا مخطّطَ له (الصلاحيات، الحسابات،
         الإدارات، قوائمُ الخيارات…) أو لم يصل منه حدث: سطرٌ واحدٌ على مستوى مجموعة البيانات يحمل فرقَها —
         وهو ما كان يفعله جدولُ audit، صار هنا. فلا مفتاحَ بلا أثر، ولا فعلٌ يُسجَّل مرتين. */
      var dA9 = parseKey(pd.k).dept || '', nEv9 = 0;
      for (var a9 = 0; a9 < audIn.length; a9++) if (audIn[a9].k === pd.k) {
        nEv9++;
        pd.g.push(audEvStmt(env, Object.assign({}, audIn[a9], { ts: now, uid: ident.uid, un: ident.un, dept: dA9, rev: rev, ip: ident.ip, dev: ident.dev, city: ident.city })));
      }
      if (!nEv9 && pd.act !== 'del') pd.g.push(audEvStmt(env, { cid: 'ds' + rev + '_' + pd.k.replace(/[^A-Za-z0-9_-]/g, '').slice(-48), ts: now, uid: ident.uid, un: ident.un, dept: dA9, k: pd.k, rev: rev,
        etype: 'dataset', eid: resName(pd.k), ename: resName(pd.k), act: 'changed', ctx: '',
        bef: '', aft: audClip(pd.k === K_USERS ? jsonDiff(stripPh(pd.cur || '[]'), stripPh(pd.v || '[]')) : jsonDiff(pd.cur, pd.v), AUD_STR),
        ip: ident.ip, dev: ident.dev, city: ident.city }));
      /* حذفُ مفتاحٍ كامل (حذفُ إدارة مثلاً): حدثٌ على مستوى مجموعة البيانات ليبقى أثرُه */
      if (pd.act === 'del') pd.g.push(audEvStmt(env, { cid: 'del_' + rev + '_' + pd.k.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40), ts: now, uid: ident.uid, un: ident.un, dept: dA9, k: pd.k, rev: rev, etype: 'dataset', eid: pd.k, ename: resName(pd.k), act: 'deleted', ctx: '', bef: '', aft: '', ip: ident.ip, dev: ident.dev, city: ident.city }));
    }
  }
  if (ENFX) for (var lw9 = 0; lw9 < ENFX.log.length; lw9++) st.push(enfLogStmt(env, ENFX.log[lw9]));
  /* العباراتُ العامة (لقطةُ الاستعادة · سجلُّ الرفض · رقمُ اللقطة · سجلُّ الإنفاذ) أوّلاً، ثم مجموعاتُ المفاتيح — دفعات مقسّمة: دفعة D1 الواحدة لها سقف عبارات */
  for (var j0 = 0; j0 < st.length; j0 += 90) await env.DB.batch(st.slice(j0, j0 + 90));
  if (changed) {
    /* العدّادُ كُتب داخل عبارة التخصيص الذرّيّة — فلا يُعاد كتابتُه هنا */
    /* R169-CC: لا كنسَ لسجل التدقيق — السجلُّ إلحاقٌ فقط، ولا سياسةَ احتفاظٍ إلا باعتمادٍ صريح */
    var lost = await commitGroups(env, pend, !!protOp);
    /* KIVO_259: ما سبقه حفظٌ متزامنٌ بين القراءة والكتابة تعارضٌ كسائر التعارضات — بقيمة الخادم الآن ونسختِه ومَن سبق — فيدمج العميلُ ويعيد */
    for (var q9 = 0; q9 < lost.length; q9++) {
      var kq9 = lost[q9]; delete out.revs[kq9];
      /* F-10 · F-2 (من SR-2.3): النسخةُ أوّلاً ثم القيمة — فإن كُتب بينهما فالقيمةُ أحدثُ من النسخة والحفظُ التالي يتعارض مرةً أخرى (آمن)؛
         والعكسُ (قيمةٌ قديمة بنسخةٍ أحدث) يجعل الحفظَ التالي يمرّ فيمحو ما كُتب بينهما ولم يره العميل */
      var rvQ = null; try { rvQ = await env.DB.prepare('SELECT rev FROM revs WHERE k = ?1').bind(kq9).first(); } catch (eRq) { rvQ = null; }
      var curQ = await opResourceGet(env, kq9);
      var lwQ = null; try { lwQ = await env.DB.prepare('SELECT ts, uid, un FROM aud WHERE k = ?1 ORDER BY ts DESC LIMIT 1').bind(kq9).first(); } catch (eLq) { lwQ = null; }
      var lwNameQ = ''; if (lwQ && lwQ.uid) { if (curUsers === null) curUsers = await usersList(env); var lwUQ = (curUsers || []).filter(function (x) { return x && x.id === lwQ.uid; })[0]; lwNameQ = (lwUQ && (lwUQ.name || lwUQ.un)) || lwQ.un || ''; }
      out.conflicts[kq9] = usOut9(kq9, { cur: curSafe(kq9, curQ), rev: (rvQ && rvQ.rev) || 0, by: lwNameQ, at: lwQ ? (lwQ.ts || 0) : 0, self: !!(lwQ && lwQ.uid === A.u.id) });
    }
    if (lost.length) { imgTouch = imgTouch.filter(function (x) { return lost.indexOf(x.k) === -1; }); if (protOp) out.atomic = protOp; }
    out.v = lost.length < pend.length ? rev : await curRev(env);
  } else out.v = await curRev(env);
  /* بعد ثبوت الكتابة لا قبلها: الملكيةُ والاستعمالُ يتبعان الحالة المستقرّة */
  if (changed && imgTouch.length) await imgSync(env, A, imgTouch);
  if (ENFX) await enfLogPrune(env);
  return opt && opt.__cuPass === RESTORE_INTERNAL_TOKEN ? out : nodeCapAck(out);   /* issue #4: inside rsSaveCommit the caller answers (above) */
}

/* ── حقن __BS_BOOT في صفحة المنصة ── */
function inject(html, boot, nonce) {
  var js = redactPh(JSON.stringify(boot), 'inject').replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  /* KIVO_253 · AUD-005: السكربتُ المحقون يحمل nonce الطلب، و<meta> CSP في الغلاف تُعاد كتابتُها بالصيغة نفسِها (cspMeta) */
  html = html.replace(/<meta http-equiv="Content-Security-Policy" content="[^"]*">/, '<meta http-equiv="Content-Security-Policy" content="' + cspMeta(nonce) + '">');
  return html.replace('<!--BS_BOOT-->', '<script' + (nonce ? ' nonce="' + nonce + '"' : '') + '>window.__BS_BOOT=' + js + ';</script>\n<!--BS_BOOT-->');
}

