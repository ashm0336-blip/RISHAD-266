/* KIVO_265 · البند 19 (تقسيمُ منطق صفحة المهام) — جزءُ «صور التوثيق»: جلبُ الصورة من مخزن الصور (360) بسببِ فشلها وإعادةُ المحاولة
   (حادثةُ الصور · البنود 2–5) وبياناتُ ختم الإثبات (البند 18). يُجمَع بعد logic.js بترتيب meta.json "logicParts". */
"use strict";
Object.assign(Component.prototype, {
  /* KIVO_265 · حادثةُ الصور (سقيا زمزم): كان الفشلُ (403 · 404 · لا اتصال) يُخزَّن فارغاً فيبقى «جارٍ تحميل الصورة…» إلى الأبد بلا سببٍ ولا إعادة.
     الآن: الذاكرةُ تحمل النصَّ عند النجاح أو {err} عند الفشل (_tkImgErr يسمّيه · _tkImgRetry يعيد المحاولة) */
  _tkImg(t) {
    if (!t) return "";
    const e = (this._tkImgCache = this._tkImgCache || {});
    if (t in e) return "string" === typeof e[t] ? e[t] : "";
    e[t] = "";
    const n = KIVO.BassamIDB,
      tick = () => this.setState({ tkImgTick: (this.state.tkImgTick || 0) + 1 }),
      why = (r) =>
        403 === r.status
          ? "غير مصرّح بعرض الصورة" + ("claim" === r.why ? " — لم تُربط بالمهمة بعد (رفعٌ لم يُسلَّم)" : "orphan" === r.why ? " — أُزيل مرجعُها وتنتظر الكنس" : "amb" === r.why ? " — ملكيتُها غيرُ محسومة" : "")
          : 404 === r.status
            ? "الصورة غير موجودة على الخادم (حُذفت أو لم يكتمل رفعُها)"
            : 0 === r.status
              ? "تعذّر الاتصال بالخادم"
              : "تعذّر جلب الصورة (HTTP " + r.status + ")";
    if (n && n.getInfo)
      return (
        n
          .getInfo(t)
          .then((r) => {
            ((e[t] = r && r.ok && r.v ? r.v : { err: why(r || { status: 0 }) }), tick());
          })
          .catch(() => {
            ((e[t] = { err: "تعذّر الاتصال بالخادم" }), tick());
          }),
        ""
      );
    return (
      n &&
        n.get &&
        n
          .get(t)
          .then((n) => {
            ((e[t] = n || { err: "تعذّر جلب الصورة" }), tick());
          })
          .catch(() => {
            ((e[t] = { err: "تعذّر جلب الصورة" }), tick());
          }),
      ""
    );
  },
  _tkImgErr(t) {
    const e = this._tkImgCache || {},
      v = t && e[t];
    return v && "object" === typeof v && v.err ? v.err : "";
  },
  _tkImgRetry(t) {
    const e = (this._tkImgCache = this._tkImgCache || {});
    (delete e[t], this.setState({ tkImgTick: (this.state.tkImgTick || 0) + 1 }));
  },
  /* KIVO_265 · البند 18 (عرضُ ختم الإثبات للمسؤول): r21.meta = [{img, at, lat, lng, acc}] بترتيب الصور كما ختمتها واجهةُ «ملفي» وحفظها 062c —
     تُقرأ بهوية الصورة أولاً ثم بموضعها (صورٌ قديمة بلا img)؛ الوقتُ بتوقيت الرياض صراحةً (لا بتوقيت جهاز المسؤول) والإحداثياتُ رابطَ خرائط
     (https://maps.google.com/?q=lat,lng) أو «بلا موقع» — شاهدٌ لا حكم، فلا يُلوَّن ولا يُمنع شيءٌ بسببه */
  _tkProofStamp(meta, id, i) {
    const M = Array.isArray(meta) ? meta : [],
      m = M.find((x) => x && x.img && id && String(x.img) === String(id)) || (M[i] && !M[i].img ? M[i] : null);
    if (!m || !(+m.at > 0)) return { stampOn: !1, stampAt: "", geoOn: !1, geoOff: !1, geoUrl: "", geoTxt: "" };
    const geo = "number" === typeof m.lat && "number" === typeof m.lng && isFinite(m.lat) && isFinite(m.lng),
      acc = "number" === typeof m.acc && isFinite(m.acc) && m.acc > 0 ? " (±" + Math.round(m.acc) + " م)" : "";
    return {
      stampOn: !0,
      stampAt: this._tkRiyadhClock(m.at),
      geoOn: geo,
      geoOff: !geo,
      geoUrl: geo ? "https://maps.google.com/?q=" + m.lat + "," + m.lng : "",
      geoTxt: geo ? "الموقع على الخريطة" + acc : "بلا موقع",
    };
  },
  _tkRiyadhClock(t) {
    try {
      return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn", { timeZone: "Asia/Riyadh", year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: !0 }).format(new Date(t));
    } catch (e) {
      return this.tkClock(t);
    }
  },
});
