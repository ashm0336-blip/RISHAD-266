/* V7 · د6: عنوانُ شاشة «الإدارات والصلاحيات» — مصدرٌ واحد (KIVO.BassamOrgRoute) يقرؤه الإطارُ وصفحةُ الإعدادات وصفحةُ الشاشة نفسُها:
     مركز إدارة رشاد:  #/sysadmin/org/<الوحدة>/<التبويب>      (الوحدة «platform» = صف «المنصة كلها»)
     مدير الوحدة:      #/admin/perm/<الوحدة>/<التبويب>        (الإعدادات ← الصلاحيات)
   والعناوينُ القديمة تُقرأ بالقاعدة نفسها وتُحوَّل (canon هو العنوانُ الجديد):
     #/sysadmin/depts · #/sysadmin/org                    ← صفحةُ «الهيكل» القديمة        ⇒ …/org/platform/overview
     #/sysadmin/org/<id>                                  ← صفحةُ الوحدة القديمة          ⇒ …/org/<id>/overview
     #/sysadmin/org/<id>/perm/<systems|roles|people|log>  ← تبويبُ «الصلاحيات» القديم     ⇒ …/org/<id>/<القسم>
     #/admin/perm · #/admin/perm/<systems|roles|people|log> ← عنوانُ المدير القديم         ⇒ #/admin/perm/<وحدته>/<القسم>
   دالةٌ نقيّة: لا DOM ولا تخزين ولا شبكة — والعنوانُ لا يمنح شيئاً: الصفحةُ تفتح وحدةً موجودةً في نطاق الناظر وحدها، والخادمُ هو الحَكَم. */
(function () {
  var ROOT = "__plat", ROOT_SEG = "platform";
  var TABS = ["overview", "systems", "admins", "roles", "people", "log", "data"];
  var OLD_SUBS = ["systems", "roles", "people", "log"];
  function has(a, x) { return a.indexOf(x) !== -1; }
  function dec(s) {
    try {
      var id = decodeURIComponent(String(s || ""));
      return id.length <= 128 && !/[\u0000-\u001f<>"'`\\]/.test(id) ? id : "";
    } catch (e) { return ""; }
  }
  function segOf(unit) { return !unit || unit === ROOT ? ROOT_SEG : encodeURIComponent(unit); }
  /* العنوانُ القانوني لوحدةٍ وتبويب في أحد الموضعين */
  function href(mode, unit, tab) {
    var t = has(TABS, tab) ? tab : "overview";
    return ("dept" === mode ? "#/admin/perm/" : "#/sysadmin/org/") + segOf(unit) + "/" + t;
  }
  /* parse(hash) ⇒ null (ليس عنوانَ الشاشة) أو { mode, unit, tab, legacy } — unit "" = لم يُذكر (الصفحةُ تختار الافتراضي) */
  function parse(hash) {
    var h = String(hash || "").split("?")[0], m, p, out;
    if ((m = /^#\/sysadmin\/(org|depts)(?:\/(.*))?$/.exec(h))) {
      p = (m[2] || "").split("/").filter(function (x) { return x !== ""; });
      out = { mode: "site", unit: "", tab: "overview", legacy: "depts" === m[1] };
      if (!p.length) { out.unit = ROOT; out.legacy = true; return out; }                 /* صفحةُ «الهيكل» القديمة */
      out.unit = p[0] === ROOT_SEG ? ROOT : dec(p[0]);
      if (p.length === 1) { out.legacy = true; return out; }                             /* صفحةُ الوحدة القديمة */
      if (p[1] === "perm") { out.legacy = true; out.tab = has(OLD_SUBS, p[2]) ? p[2] : "systems"; return out; }
      if (has(TABS, p[1]) && p.length === 2) { out.tab = p[1]; return out; }
      out.legacy = true; return out;
    }
    if ((m = /^#\/admin\/perm(?:\/(.*))?$/.exec(h))) {
      p = (m[1] || "").split("/").filter(function (x) { return x !== ""; });
      out = { mode: "dept", unit: "", tab: "", legacy: false };
      if (!p.length) { out.legacy = true; return out; }
      if (p.length === 1) { out.legacy = true; if (has(TABS, p[0])) out.tab = p[0]; else out.unit = dec(p[0]); return out; }
      out.unit = dec(p[0]);
      if (has(TABS, p[1]) && p.length === 2) out.tab = p[1]; else out.legacy = true;
      return out;
    }
    return null;
  }
  KIVO.BassamOrgRoute = { ROOT: ROOT, ROOT_SEG: ROOT_SEG, TABS: TABS, parse: parse, href: href };
})();
