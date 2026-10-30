
/* ── هويةُ العنصر التشغيلي الثابتة (KIVO_238 · IH‑02) ────────────────────────────
   حقلٌ واحد ثابت uid لكل عنصرٍ تشغيلي (مصلًّى · باب · معلم · مسار): عشوائيٌّ يُولَّد مرّةً عند الإنشاء،
   لا يُشتقّ من الرمز/الرقم/الاسم، وليس eid الموظف ولا iid الخريطة، ويبقى كما هو عبر لقطات الشهر والجولات
   والمزامنة والنسخ (النسخُ العميق يحمله). العناصرُ القديمة بلا uid تبقى كما هي حتى ترحيلٍ معمَّد. */
(function(){
  /* KIVO_239 · IM‑01: عشوائيةٌ آمنة — crypto.getRandomValues (128 بت) → base36 بخمسٍ وعشرين خانة (بلا BigInt)؛ وعند غياب crypto يعود إلى المولِّد السابق كما هو. الشكلُ u[0-9a-z]+ نفسُه. */
  function b36(bytes){ var d = [0], i, j, c, v; for (i = 0; i < bytes.length; i++){ c = bytes[i]; for (j = 0; j < d.length; j++){ v = d[j] * 256 + c; d[j] = v % 36; c = Math.floor(v / 36); } while (c > 0){ d.push(c % 36); c = Math.floor(c / 36); } } var s = ''; for (i = d.length - 1; i >= 0; i--) s += d[i].toString(36); while (s.length < 25) s = '0' + s; return s; }
  function legacyUid(){ return 'u' + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36) + Math.floor(Math.random() * 1e9).toString(36); }
  function newUid(){ try { var c = (typeof crypto !== 'undefined' && crypto) || (typeof window !== 'undefined' && window.crypto) || null; if (c && typeof c.getRandomValues === 'function'){ var b = new Uint8Array(16); c.getRandomValues(b); return 'u' + b36(b); } } catch (e) {} return legacyUid(); }
  function has(el){ return !!(el && typeof el === 'object' && !Array.isArray(el) && el.uid != null && el.uid !== ''); }
  function ensure(el){ if (!el || typeof el !== 'object' || Array.isArray(el)) return el; if (!has(el)) el.uid = newUid(); return el; }
  function withUid(el){ if (!el || typeof el !== 'object' || Array.isArray(el) || has(el)) return el; var o = Object.assign({}, el); o.uid = newUid(); return o; }
  KIVO.BassamIdent = { VER: 2, FIELD: 'uid', KINDS: ['zones', 'gates', 'marks', 'paths'], newUid: newUid, has: has, ensure: ensure, withUid: withUid, secure: (function(){ try { var c = (typeof crypto !== 'undefined' && crypto) || (typeof window !== 'undefined' && window.crypto) || null; return !!(c && typeof c.getRandomValues === 'function'); } catch (e) { return false; } })() };
})();
