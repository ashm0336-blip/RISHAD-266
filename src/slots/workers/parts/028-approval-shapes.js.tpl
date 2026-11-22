/* ══ مشروعية عمليات الاعتماد — أشكالٌ حرفيةٌ مأخوذةٌ من الواجهة ══════════════ */
var AP_SH = ['ap', 'at', 'snap', 'byRep'];
var AW_ST = { 'قيد التحكيم': 1, 'معتمد': 1, 'مستبعد': 1 };
var OP_SHAPE = {
  /* الجولات: اعتمادٌ يدويّ {ap:1,at,snap} أو مرآةً عن التقرير {…,byRep:1}
     وفكٌّ {ap:0} وحدها. واللقطة لا تُقبل إلا مطابقةً لميدان اليوم القائم. */
  rounds: function (oa, nb) {
    for (var d in nb) {
      var rec = nb[d]; if (!isObj(rec)) continue;
      var orec = isObj(oa[d]) ? oa[d] : {};
      if ('ap' in rec && rec.ap !== 0 && rec.ap !== 1) return 'approve';
      if ('mo' in rec && rec.mo !== 1) return 'approve';
      if ('auto' in rec && rec.auto !== 1) return 'approve';
      if ('shAp' in rec) {
        var nsh = rec.shAp, osh = isObj(orec.shAp) ? orec.shAp : {};
        if (!isObj(nsh)) return 'approve';
        for (var s0 in osh) if (!(s0 in nsh)) return 'approve';   /* وردية حُذفت من شجرة الاعتماد */
        for (var sh in nsh) {
          var r = nsh[sh];
          if (deq(osh[sh], r)) continue;                          /* لم تتغيّر: لا تُفحص */
          if (!isObj(r)) return 'approve';
          var ks = Object.keys(r), q;
          for (q = 0; q < ks.length; q++) if (AP_SH.indexOf(ks[q]) === -1) return 'approve';
          if (r.ap === 1 || r.ap === true) {
            if (typeof r.at !== 'string') return 'approve';
            if (!Object.prototype.hasOwnProperty.call(r, 'snap')) return 'approve';
            if (!deq(r.snap, rec.d)) return 'approve';            /* لقطةٌ لا تطابق الميدان */
            if (('byRep' in r) && r.byRep !== 1) return 'approve';
          } else {
            if (ks.length !== 1 || ks[0] !== 'ap' || r.ap !== 0) return 'approve';
          }
        }
      }
      if (Array.isArray(rec.d)) for (var i = 0; i < rec.d.length; i++) {
        var f = rec.d[i];
        if (isObj(f) && ('ap' in f) && f.ap !== 0 && f.ap !== 1) return 'approve';
      }
    }
    return '';
  },
@@SYS:approval.shape.dreport@@@@SYS:approval.shape.plan@@@@SYS:approval.shape.award@@};
function needAdd(n) { n.add = 1; } function needDel(n) { n.del = 1; } function needEdit(n) { n.edit = 1; }
function idOf(x, idf) {
  if (!isObj(x)) return '';
  for (var i = 0; i < idf.length; i++) { var v = x[idf[i]]; if (v != null && v !== '') return String(v); }
  return '';
}
function colList(v, at) {
  if (!at) return Array.isArray(v) ? v : null;
  return (isObj(v) && Array.isArray(v[at])) ? v[at] : null;
}
/* مقارنة مجموعةٍ بهوية عناصرها: كيانٌ ظهر ⇒ add · زال ⇒ del · تبدّل ⇒ edit */
function cmpCol(a, b, idf, n) {
  var ma = {}, mb = {}, i, k, key;
  for (i = 0; i < a.length; i++) { key = idOf(a[i], idf) || ('#' + i); ma[key] = a[i]; }
  for (i = 0; i < b.length; i++) { key = idOf(b[i], idf) || ('#' + i); mb[key] = b[i]; }
  for (k in mb) { if (!(k in ma)) needAdd(n); else if (!deq(ma[k], mb[k])) needEdit(n); }
  for (k in ma) if (!(k in mb)) needDel(n);
}
/* مجموعةٌ بلا هوية: يُقصّ المتطابق من الطرفين ثم يُحكم على الوسط — فالإدراج
   في أوّل القائمة إضافةٌ صِرف ولا يتحوّل تعديلاً بإزاحة المواضع */
function cmpList(a, b, n) {
  var la = a.length, lb = b.length, i = 0, j = 0;
  while (i < la && i < lb && deq(a[i], b[i])) i++;
  while (j < la - i && j < lb - i && deq(a[la - 1 - j], b[lb - 1 - j])) j++;
  var ra = la - i - j, rb = lb - i - j;
  if (rb > ra) needAdd(n);
  if (ra > rb) needDel(n);
  if (Math.min(ra, rb) > 0) needEdit(n);
}
