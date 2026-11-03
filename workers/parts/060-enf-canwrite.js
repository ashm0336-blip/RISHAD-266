/* مفتاحُ سجلّ الإنفاذ لحذف بقايا وحدةٍ أُزيلت — مفتاحُ كتابة سجلّ الوحدات نفسُه (sys.*) */
function enfUnitDelKeys() { var gk = enfIx().byRes[K_DEPTS] || [], gs = gk.filter(function (x) { return x.indexOf('sys.') === 0; }); return gs.length ? [gs[0]] : ['sys.modules.toggle']; }
/* ══ canWrite في وضع الإنفاذ — البنيةُ نفسُها، والقرارُ من السجل ══ */
function canWriteEnf(A, k, newVal, curVal, ctx) {
  var u = A.u, P = parseKey(k), rn = resName(k), X = (ctx && ctx.enf) || {};
  /* RISHAD-266: سقفُ النطاق القديم أُلغي — قبل كل استثناء (059 scopeRetiredWhy) */
  if (P.dept && rn === ENF_SCOPE_RES) return scopeRetiredWhy(A, newVal, ctx) ? enfNo('scope-retired', { detail: SCOPE_RETIRED_DETAIL }) : enfOk(enfUnitDelKeys());
  /* F01 (مرآةُ 044): حذفُ مفاتيح وحدةٍ لم تعد وحدة لمدير النظام · ولا كتابةَ في معرّفٍ ليس وحدةَ بيانات إلا وحدةً في الحفظة نفسِها أو استعادة */
  /* قرار المالك (ب) 2026-11-03: لا يُحذف مفتاحٌ مجهولٌ بصمت — الإذنُ لبيانات الوحدة المعروفة وحدها (سجلّ الموارد RES_REG كما في 044 · سجلُّ المنح ENF_GRANTS_RES · الموارد التشغيلية opIsResource)،
     وما سواه يُرفض مشكلةَ سلامة بيانات (unknown) فيُرفض حذفُ الوحدة كلُّه ذرّياً */
  if (P.dept && newVal == null && u.role === 'super' && unitGoneOf(A, P.dept)) return (resOf(k) || rn === ENF_GRANTS_RES || opIsResource(k)) ? enfOk(enfUnitDelKeys()) : enfNo('unknown', { detail: 'unit-unknown-data' });
  if (P.dept && newVal != null && u.role === 'super' && !isUnitId(A, P.dept)) {
    if (!(X.restore && !isNodeId(A, P.dept))) return enfNo('unit', { detail: P.dept });
    (A.__batchUnits || (A.__batchUnits = nmap()))[String(P.dept)] = 1; enfMemoDrop(A, String(P.dept));
  }
  if (P.dept && rn === ENF_GRANTS_RES) return enfGrantsWrite(A, k, newVal, curVal, ctx);   /* «فحص الصلاحيات العميق · المرحلة 0 (الجولة 2)» · R3-4: ctx.pa */
  var R0 = resOf(k);
  if (!R0) return enfNo('unknown');
  if (R0.scope === 'device') return enfNo('device');
  if (!P.dept) {
    if (R0.scope !== 'global') return enfNo('scope');
    if (P.name === K_USERS) return newVal == null ? enfNo('users') : enfUsersWrite(A, k, newVal, curVal, ctx, X);
    if (P.name === K_PERM) return newVal == null ? enfNo('super') : enfPermsWrite(A, k, newVal, curVal, ctx, X);
    if (P.name === K_DSTATS) return newVal == null ? enfNo('keydel') : enfDstatsWrite(A, k, newVal, curVal, ctx, X);
    /* F01: مديرُ الإدارة يُنشئ أقسامَ إدارته (018 deptSecMgrWhy) — بمفتاح الإدارة perm.assign في الإدارة الأم */
    if (P.name === K_DEPTS && newVal != null && u.role !== 'super') { var smw = deptSecMgrWhy(A, newVal, curVal); if (smw) return enfNo(smw); unitBatchAdd(A, newVal); return enfOk([]); }
    if (u.role !== 'super') return enfNo('super');
    if (P.name === K_DEPTS && newVal != null) { var dsE = deptShapeWhy(A, newVal, curVal, !!X.restore); if (dsE) return enfNo(dsE); unitBatchAdd(A, newVal); }
    if (P.name === K_DEPTS && newVal == null && !(X.restore && A.__srvRst)) return enfNo('unit-delete-route');   /* RISHAD266: حذفُ سجلّ الوحدات كلِّه ليس طريقَ حذف وحدات */
    if (P.name === K_GDEPTS && newVal != null) { var nsE = nodeShapeWhy(A, newVal, curVal, !!X.restore); if (nsE) return enfNo(nsE); nodeBatchAdd(A, newVal); }
    var gk = enfIx().byRes[P.name] || [], gsys = gk.filter(function (x) { return x.indexOf('sys.') === 0; });
    return enfOk(gsys.length ? [gsys[0]] : ['sys.modules.toggle']);
  }
  if (!deptInScope(A, P.dept)) return enfNo('dept');
  var nm = P.name;
  if (nm.indexOf('bassam_page_v1') === 0) return enfOk([]);
  if (nm.indexOf('bassam_notif_dev_v1:') === 0) return nm === 'bassam_notif_dev_v1:' + u.id ? enfOk(['self.notif.device']) : enfNo('own');
  if (nm === K_NOTIF) { var nr = notifRule(A, P.dept, newVal, curVal); return nr.ok ? enfOk([isMgrOf(A, P.dept) ? 'notif.dept.broadcast' : 'self.notif.device']) : enfNo(nr.why); }
  if (FLAG_KEYS[nm]) return isMgrOf(A, P.dept) ? enfOk([]) : enfNo('flag');
  var rule9 = R0.rule || '';
  if (rule9 === 'tech') return enfAnyWriterDept(A, P.dept) ? enfOk([]) : enfNo('view');
  if (rule9) return enfNo(rule9);
  if (newVal == null) return enfNo('keydel');
  var E9 = entOf(k), O9 = opsOf(k);
  var PV9 = (function () { var a, b, ha = 0, hb = 0; return { a: function () { if (!ha) { ha = 1; a = curVal == null ? undefined : parseJson(curVal, undefined); } return a; }, b: function () { if (!hb) { hb = 1; b = parseJson(newVal, undefined); } return b; } }; })();
  if (E9 || O9) { var inv9 = invariantViolation(k, curVal, newVal, E9, O9, PV9, ctx); if (inv9) return enfNo(inv9, { invariant: 1 }); }
  if (E9 && E9.append && curVal != null && appendViolation(E9, alignOld(E9, PV9.a() === undefined ? null : PV9.a(), PV9.b()), PV9.b() === undefined ? null : PV9.b())) return enfNo('append', { invariant: 1 });
  var a = curVal == null ? parseJson((E9 && E9.empty) || 'null', null) : PV9.a(), b = PV9.b();
  if (a === undefined) a = null;
  if (b === undefined || b === null) return enfNo('shape');
  /* KIVO_265 · H-1: العمودُ 23 في مخزن المهام للخادم وحده (018 taskXWhy — كالوضع القديم في 044) — قبل التصنيف (059 enfDecide) وكلِّ مفتاح؛
     والمراجعةُ الموحّدة: المكلَّفُ بعد نشاط الموظف (R-1 · R-7) والحسابُ النشط (R-2) — 018 taskRawWhy */
  if (rn === 'bassam_tasks_v1') { var xwE = taskRawWhy(A, a, b, P.dept, ctx); if (xwE) return enfNo(xwE); }
  if (rn === 'bassam_employees_v1') { var xdE = empDupWhy(A, a, b, P.dept, ctx); if (xdE) return enfNo(xdE); }   /* KIVO_265 · أمن: 018 empDupWhy */
  return enfDecide(A, k, rn, P.dept, a, b, curVal, newVal, ctx, X);
}
/* «authorize» في وضع الإنفاذ لمن يسأل عن فعلٍ على مورد (رقمُ المراجعة · صاحبُ الصورة): أيُّ مفتاحٍ كتابيٍّ مربوطٍ بالمورد محمول */
function enfImgWriteOk(A, k) {
  var R8 = resOf(k); if (!R8 || R8.scope === 'device') return false;
  var P8 = parseKey(k);
  if (R8.scope === 'global' || !P8.dept) return A.u.role === 'super';
  if (!deptInScope(A, P8.dept)) return false;
  if (R8.rule) return enfAnyWriterDept(A, P8.dept);
  return enfResWriter(A, P8.dept, resName(k));
}
