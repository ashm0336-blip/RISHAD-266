/* ══ تبادلُ الأسماء ══════════════════════════════════════════════════════
   في مجموعةٍ هويتُها اسمُها: إن بقيت مجموعةُ الأسماء كما هي وتبدّلت نسبةُ
   الأجساد إليها — تبادلٌ أو دوران — فليست تسميةً واحدة ولا تعديلاً مفهوماً،
   وتبعتُها في سواها لا تُعرف. تُرفض. */
function nameSwap(E, col, la, lb) {
  if (!E.rename || E.rename.at !== col.at) return false;
  var fld = E.rename.field, i, na = {}, nb = {}, ba = [], bb = [], q;
  for (i = 0; i < la.length; i++) { if (!isObj(la[i])) return false; q = String(la[i][fld]); na[q] = JSON.stringify(bodyNoId(la[i], [fld])); ba.push(na[q]); }
  for (i = 0; i < lb.length; i++) { if (!isObj(lb[i])) return false; q = String(lb[i][fld]); nb[q] = JSON.stringify(bodyNoId(lb[i], [fld])); bb.push(nb[q]); }
  var ka = Object.keys(na).sort(), kb = Object.keys(nb).sort();
  if (ka.join('\u0000') !== kb.join('\u0000')) return false;          /* مجموعة الأسماء تغيّرت */
  if (ba.sort().join('\u0000') !== bb.sort().join('\u0000')) return false;  /* الأجساد تغيّرت: تعديلٌ عاديّ */
  for (i = 0; i < ka.length; i++) if (na[ka[i]] !== nb[ka[i]]) return true;
  return false;
}
function colIdentity(E, col, la, lb, imp) {
  var idf = col.lock, fb = fbChain(col), i, j, seen = {}, oldIds = {}, newIds = {}, id, e;
  if (nameSwap(E, col, la, lb)) return 'identity';
  for (i = 0; i < la.length; i++) { if (!isObj(la[i])) continue; id = idOf(la[i], idf); if (id) oldIds[id] = la[i]; }
  for (i = 0; i < lb.length; i++) { if (!isObj(lb[i])) continue; id = idOf(lb[i], idf); if (id) newIds[id] = lb[i]; }
  for (i = 0; i < lb.length; i++) {
    e = lb[i];
    if (!isObj(e)) return 'shape';
    id = idOf(e, idf);
    /* هويةٌ من فراغٍ أو مسافاتٍ ليست هوية */
    if (id && !normId(id)) return 'identity';
    if (id) { if (seen[normId(id)]) return 'dup'; seen[normId(id)] = 1; }
    if (id && oldIds[id]) continue;                        /* كيانٌ قائم بمعرّفه */
    var same = false, swapped = false, legacy = false, adoptBad = false, reid = false;
    var fbe = fb.length ? idOf(e, fb) : '';
    for (j = 0; j < la.length; j++) {
      var o = la[j]; if (!isObj(o)) continue;
      if (deq(o, e)) { same = true; break; }               /* سجلٌّ قديم لم يُمسّ */
      var oid = idOf(o, idf), fbo = fb.length ? idOf(o, fb) : '';
      if (id && oid && oid !== id && deq(bodyNoId(o, idf), bodyNoId(e, idf))) { swapped = true; break; }
      if (id && !oid && fbe && fbo === fbe) { if (adoptOk(E, o, e, col)) { same = true; break; } adoptBad = true; }
      if (id && oid && !newIds[oid] && fbe && fbo === fbe) reid = true;
      if (!id && !oid && fbe && fbo === fbe) legacy = true;
    }
    if (same) continue;
    if (swapped) return 'identity';                        /* بُدِّلت هوية كيانٍ قائم */
    if (adoptBad) return 'identity';                       /* تبنٍّ مع تغييرٍ آخر */
    if (reid && !imp) return 'identity';                   /* إعادةُ تعريفٍ خارج الاستيراد */
    if (id) continue;                                      /* كيانٌ جديد بهويةٍ قانونية */
    if (legacy) continue;                                  /* سجلُّ إرثٍ يُعدَّل بمفتاحه المتدرّج */
    if (la.length === lb.length && isObj(la[i]) && !idOf(la[i], idf)) continue;   /* إرثٌ في موضعه */
    return 'identity';                                     /* كيانٌ جديد بلا هوية قانونية */
  }
  return '';
}
function identityViolation(E, a, b, imp) {
  if (!E || !E.cols) return '';
  for (var c = 0; c < E.cols.length; c++) {
    var col = E.cols[c]; if (!col.lock) continue;
    var la = colList(a, col.at), lb = colList(b, col.at);
    if (!lb) continue;
    var v = colIdentity(E, col, la || [], lb, imp);
    if (v) return v;
  }
  return '';
}
