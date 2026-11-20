/* رصد الميدان: موظف صلاحيته على المتابعة اليومية هي ورقة «رصد الميدان» وحدها (بلا كتابة على الجولات) —
   يكتب على جولة اليوم حقولَ الرصد فقط، وعلى الباب الذي يحوي مفتاحه فقط */
var FIELD_KEYS = { fst: 1, flow: 1, fAt: 1, fBy: 1, fKind: 1, fLog: 1, closed: 1, off: 1, cAt: 1, cAtMs: 1, cWhy: 1, cBy: 1 };
/* الرصد يجري على موقع تسكين الموظف أياً كان نوعه: باب · مصلى · معلم */
var FIELD_KINDS = { gates: 1, zones: 1, marks: 1 };
function dailyFieldOnly(A, d) {
  var u = A.u; if (u.role === 'super' || u.role === 'dept') return false;
  var ep = ((A.perms.emps || {})[d] || {})[u.ekey] || {}; var writes = [], field = false;
  Object.keys(ep).forEach(function (k) { if (String(k).split('/')[0] !== 'daily' || !capOnDept(A, d, k)) return; var acts = ep[k] || []; if (k === 'daily/field' && acts.length) field = true; if (k !== 'daily/field' && acts.some(function (a) { return WRITE_ACTS[a]; })) writes.push(k); });
  return field && !writes.length;
}
function pickIdx(arr, seg) { if (!Array.isArray(arr)) return null; if (/^\d+$/.test(seg)) return arr[+seg] || null; var id = seg.slice(1, -1); return arr.filter(function (x) { return isObj(x) && (String(x.id) === id || String(x.eid) === id || String(x.key) === id || String(x.k) === id); })[0] || null; }
function fieldObsOnly(A, newVal, curVal, dp) {
  var T = dp && A.__obsToks && A.__obsToks[dp];   /* RISHAD266: مفتاحُ الحساب ∪ رقمُه وهويتُه واسمُه في سجلّ الموظفين (061 enfToksOf) — التسكينُ يقبلها كلَّها */
  var diffs = walkDiff(curVal, newVal); if (!diffs.length) return false;
  var NV = parseJson(newVal, null); if (!isObj(NV)) return false;
  return diffs.every(function (d) {
    var m = /^([^.]+)\.d\.(\d+|\[[^\]]*\])\.(gates|zones|marks)\.(\d+|\[[^\]]*\])\.([A-Za-z]+)(?:\..*)?$/.exec(d.p); if (!m || !FIELD_KINDS[m[3]] || !FIELD_KEYS[m[5]]) return false;
    var day = NV[m[1]]; var fl = day ? pickIdx(day.d, m[2]) : null; var g = fl ? pickIdx(fl[m[3]], m[4]) : null;
    return !!(g && Array.isArray(g.emp) && g.emp.some(function (x) { return T ? T[String(x)] : x === A.u.ekey; }));
  });
}
/* RISHAD266 (بلاغ راصد الميدان · الحالة ١ في الوضع القديم): ما لا يُسنَد إلى الراصد يعود من الخادم قبل الحكم — كدمج الإنفاذ (061 enfFloorMerge):
   حقولُ الرصد (FIELD_KEYS) على عنصرٍ ليس في تسكينه المخزَّن (بمفتاحه ورموز سجلّه) تُستعاد من القيمة المخزَّنة، فالحالةُ التي نسختها الواجهة من الخطة
   على بابٍ غيرِ مسنَد لا تُكتب ولا تُسقط حفظَه. للراصد وحده (عرضُ daily/field بلا كتابةٍ على الجولات) — وما سوى حقول الرصد يحكم فيه fieldObsOnly كما هو */
function obsKeepOthers(A, d, newJson, curJson) {
  var mp = myPermsOf(A, d) || {}, wr = function (k) { return (mp[k] || []).some(function (a) { return WRITE_ACTS[a]; }); };
  if (A.u.role === 'super' || (mp['daily/field'] || []).indexOf('view') === -1 || !capOnDept(A, d, 'daily/field') || wr('daily/rounds') || wr('daily')) return newJson;
  var T = A.__obsToks && A.__obsToks[d], n = parseJson(newJson, null), c = parseJson(curJson, null), ch = 0;
  if (!isObj(n) || !isObj(c)) return newJson;
  var pair = function (arr, x, i) { return Array.isArray(arr) ? (x.uid != null ? arr.filter(function (y) { return isObj(y) && y.uid === x.uid; })[0] : arr[i]) || null : null; };
  Object.keys(n).forEach(function (day) {
    var nd = n[day], cd = c[day]; if (!isObj(nd) || !Array.isArray(nd.d)) return;
    nd.d.forEach(function (nf, fi) {
      if (!isObj(nf)) return; var cf = isObj(cd) ? pair(cd.d, nf, fi) : null;
      Object.keys(FIELD_KINDS).forEach(function (kd) {
        (Array.isArray(nf[kd]) ? nf[kd] : []).forEach(function (ne, ei) {
          if (!isObj(ne)) return; var ce = isObj(cf) ? pair(cf[kd], ne, ei) : null;
          if (ce && Array.isArray(ce.emp) && ce.emp.some(function (x) { return T ? T[String(x)] : x === A.u.ekey; })) return;
          Object.keys(FIELD_KEYS).forEach(function (f) { var cv = ce ? ce[f] : undefined; if (!deq(ne[f], cv)) { if (cv === undefined) delete ne[f]; else ne[f] = cv; ch = 1; } });
        });
      });
    });
  });
  return ch ? JSON.stringify(n) : newJson;
}
