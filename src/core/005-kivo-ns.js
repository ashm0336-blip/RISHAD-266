/* ═══ KIVO — الواجهةُ العامة الواحدة (KIVO_258 · AUD-016 · ENG-07) ═══
   كلُّ ما تعرّفه المنصةُ للتشارك بين كتلها ووحداتها يعيش في window.KIVO (غيرِ قابلٍ للعدّ ولا للكتابة). الأسماءُ القديمة على window
   (103 اسماً) باقيةٌ توافقاً خلفياً: موصِّلاتٌ غيرُ قابلةٍ للعدّ إلى KIVO[الاسم] قراءةً وكتابة — فـwindow.X ≡ KIVO.X دائماً.
   تُحمَّل أوّلاً، وتنقل أيَّ قيمةٍ سبقتها (سكربتٌ مضمَّن · تهيئةُ اختبار) قبل تركيب الموصِّل. مولَّدةٌ بـtools/kivo_ns.mjs — لا تُحرَّر يدوياً. */
(function () {
  "use strict";
  var K = {};
  var N = [
    "BassamAck", "BassamAudit", "BassamAuth", "BassamBkTime", "BassamBusy", "BassamConfirm", "BassamCount", "BassamCrypt",
    "BassamCssText", "BassamCurve", "BassamDay", "BassamDayFocus", "BassamDayShift", "BassamDeptBackup", "BassamDepts", "BassamDigits",
    "BassamEmp", "BassamEmpImp", "BassamField", "BassamFind", "BassamHijri", "BassamHistImport", "BassamIDB", "BassamIdent",
    "BassamImgCache", "BassamImgFit", "BassamImgPut", "BassamImgRefs", "BassamImgVerify", "BassamKeyLabels", "BassamLeaf", "BassamLink",
    "BassamMapNight", "BassamMix", "BassamMyShift", "BassamNav", "BassamNeed", "BassamNotif", "BassamPageKit", "BassamPerm",
    "BassamPermV2", "BassamPick", "BassamPlat", "BassamPointer", "BassamPrintCore", "BassamRing", "BassamRound", "BassamSup",
    "BassamTheme", "BassamTip", "BassamXLSX", "DCLogic", "KIVO_MANIFEST", "KIVO_REGISTRY", "KIVO_REGISTRY_DATA", "PageStates",
    "StreamableLogic", "__ADMIN_MODE", "__ADMIN_OPEN_DTAB", "__ADMIN_OPEN_TAB", "__BS_AUTHZ", "__BS_I", "__BS_IMG_INFLIGHT", "__BS_OPEN_TAB",
    "__BS_QUOTA_WARN", "__BS_RAWLS", "__BS_RES_EMPTY", "__BS_SRV", "__BS_STORAGE_FAIL", "__BS_TOK", "__BS_VER", "__bsAfterQuiet",
    "__bsDirtySince", "__bsFromStore", "__bsMemo", "__bsMixOn", "__bsParseScope", "__bsQuiet", "__bsReadHook", "__bsSilentSet",
    "__bsThemeSet", "__bsTick", "__bsTokVal", "__dcAnnotatedTemplate", "__dcBoot", "__dcContentKeyed", "__dcKeyVer", "__dcLogic",
    "__dcLogicDefs", "__dcRegistry", "__dcRootName", "__dcSetProps", "__dcStreaming", "__dcTemplateSource", "__dcUpdate", "__dcWorld",
    "__dcWrite", "__resourceBlobs", "__resources", "bsAskPassword", "bsConfirm", "bsPct", "getDC"
  ];
  for (var i = 0; i < N.length; i++) {
    (function (n) {
      if (Object.prototype.hasOwnProperty.call(window, n)) { try { K[n] = window[n]; } catch (e) { /* موصِّلٌ سابقٌ رمى — تبدأ القيمةُ فارغة */ } }
      try { Object.defineProperty(window, n, { configurable: true, enumerable: false, get: function () { return K[n]; }, set: function (v) { K[n] = v; } }); }
      catch (e) { /* خاصيةٌ غيرُ قابلةٍ للضبط — يبقى الاسمُ القديمُ كما هو، وKIVO يقرؤه */ Object.defineProperty(K, n, { enumerable: true, get: function () { return window[n]; }, set: function (v) { window[n] = v; } }); }
    })(N[i]);
  }
  Object.defineProperty(window, "KIVO", { value: K, enumerable: false, configurable: false, writable: false });
})();
