/* ══ حركات العهد: عمليتان مجاليّتان بفعليهما كما في الواجهة ══════════════════
   cuHandOut (تسليم) محروسةٌ في الواجهة بـedit أو add — فهي تمرّ بأيّهما.
   cuCloseItem (استرجاع · تلف · فقد) محروسةٌ بـedit وحده.
   وكلتاهما إلحاقٌ في الذيل لا يمسّ حركةً سابقة ولا العهد نفسها. */
function custodyMoveOp(A, k, curVal, newVal, PV) {
  if (resName(k) !== 'bassam_custody_v1' || newVal == null || curVal == null) return null;
  var a = PV ? PV.a() : parseJson(curVal, null), b = PV ? PV.b() : parseJson(newVal, null);
  if (!isObj(a) || !isObj(b)) return null;
  var ma = Array.isArray(a.moves) ? a.moves : null, mb = Array.isArray(b.moves) ? b.moves : null;
  if (!ma || !mb || mb.length <= ma.length) return null;
  if (!deq(stripKey(a, 'moves'), stripKey(b, 'moves'))) return null;
  var i;
  for (i = 0; i < ma.length; i++) if (!deq(ma[i], mb[i])) return null;
  var d = parseKey(k).dept, wantEdit = false, wantOut = false;
  for (i = ma.length; i < mb.length; i++) {
    var mv = mb[i];
    if (!isObj(mv)) return null;
    if (String(mv.t) === 'out') wantOut = true; else wantEdit = true;
  }
  /* العملية تُحاكم بفعلها المعلَن وحده: لا يُعوَّض نقصُه بتصنيفٍ عامّ بعدها */
  var hasEdit = actsHeldOn(A, d, 'emps/custody', ['edit']);
  if (wantEdit && !hasEdit) return false;
  if (wantOut && !hasEdit && !actsHeldOn(A, d, 'emps/custody', ['add'])) return false;
  return true;
}
