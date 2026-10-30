/* ══ سجل عقود الحقول — FIELDS ═══════════════════════════════════════════════
   سجلٌّ مركزيٌّ واحد لا مدقّقاتٌ متناثرة. لا يُعلَن فيه حقلٌ ولا نوعٌ إلا ما
   أثبته قارئُ الواجهة أو كاتبُها. ويُطبَّق على الكيان الذي تغيّر في هذا
   الطلب وحده — فالبياناتُ القديمة التي لم تُمسّ لا تُعاقب.
     req    : حقولٌ لا يخلو منها كيانٌ جديد أو مُعدَّل
     type   : str · num · bool — تُفحص عند وجود الحقل لا عند غيابه
     enum   : قيمٌ مغلقة
     maxLen : حد نصّي عند وجود الحقل؛ لا يفرض صيغة هوية جديدة
     closed : عقدٌ مغلق — لا حقلَ خارج المعلَن (لا يُعلَن إلا حيث ثبت الانغلاق)
     uniq   : تفرّدٌ على الحالة النهائية بعد الطلب، بصيغةٍ قانونية معلَنة */
var NID10 = /^[0-9]{10}$/;
var FIELDS = {
  /* ── A: الموظفون — أنواعٌ مثبَتة، والحقولُ الزائدة تُحتمل (سجلاتٌ قديمة) ── */
  'bassam_employees_v1': { at: '', req: ['eid', 'name'],
    type: { eid: 'str', name: 'str', nid: 'str', phone: 'str', empno: 'str', email: 'str',
            type: 'str', work: 'str', gender: 'str', shift: 'str', group: 'str', account: 'str', contact: 'str' },
    uniq: [{ f: 'nid', re: NID10, why: 'nid' }] },
  /* ── A: الورديات — sfAdd/sfRename وحدهما يكتبانها، فالعقد مغلق ── */
  'bassam_shift_options_v1': { at: '', closed: 1, req: ['name'],
    type: { name: 'str', color: 'str', tStart: 'str', tEnd: 'str' } },
  /* ── A: العهد — cuAddItemType و cuHandOut و cuCloseItem وحدها ── */
  'bassam_custody_v1': { cols: {
    items: { closed: 1, req: ['name'], type: { name: 'str', qty: 'num', prefix: 'str', color: 'str' } },
    moves: { closed: 1, req: ['t', 'eid', 'item', 'ser', 'y', 'm', 'd'],
             /* cuEmpSnap/cuHandOut write these optional historical snapshots.
                They are text, not new employee identities: no uniqueness or NID
                format is imposed, and an unchanged legacy row stays untouched. */
             type: { t: 'str', eid: 'str', item: 'str', ser: 'str', color: 'str', y: 'num', m: 'num', d: 'num', cond: 'str', note: 'str', by: 'str', nid: 'str', empno: 'str', name: 'str' },
             maxLen: { nid: 4096, empno: 4096, name: 4096 },
             enum: { t: ['out', 'in', 'dmg', 'lost'] } } } },
  /* ── A: قوالب الصلاحيات ── */
  'bassam_perm_tpls_v1': { at: '', req: ['id', 'name'], type: { id: 'str', name: 'str' } },
  /* ── B: الثابتُ وحده — وما داخلَه يتوسّع بحرّيته ── */
  'bassam_award_v1':      { cols: { recs:    { req: ['id', 'st'], type: { id: 'str', st: 'str' } } } },
  'bassam_irshad_v1':     { cols: { reports: { req: ['id'], type: { id: 'str' } } } },
  'bassam_seized_v1':     { cols: { reports: { req: ['id'], type: { id: 'str' } } } },
  'bassam_seized_cat_v1': { cols: { cats:    { req: ['name'], type: { name: 'str' } } } },
  'bassam_seized_acts_v1':{ at: '', req: ['name'], type: { id: 'str', name: 'str' } }
};
function fieldsOf(k) { return FIELDS[resName(k)] || null; }
function typeOk(t, v) {
  if (t === 'str') return typeof v === 'string';
  if (t === 'num') return typeof v === 'number' && isFinite(v);
  if (t === 'bool') return typeof v === 'boolean';
  return true;
}
/* كيانٌ تغيّر في هذا الطلب: ليس له في الطرف القديم نظيرٌ مطابقٌ حرفاً */
function entChanged(la, e) { for (var i = 0; i < la.length; i++) if (deq(la[i], e)) return false; return true; }
/* نظيرُ الكيان في الطرف القديم — لتمييز «حقلٌ أُسقط الآن» من «لم يكن أصلاً» */
function twinOf(la, e, ch) {
  if (!ch) return null;
  var lock = ch.lock || [], idf = ch.idf || [], i, id;
  if (lock.length) {
    id = idOf(e, lock);
    if (id) { for (i = 0; i < la.length; i++) if (isObj(la[i]) && idOf(la[i], lock) === id) return la[i]; return null; }
  }
  /* سجلٌّ بلا هويةٍ قانونية: يُطابَق بالمفتاح المتدرّج بين نظرائه من الإرث */
  if (!idf.length) return null;
  id = idOf(e, idf); if (!id) return null;
  for (i = 0; i < la.length; i++) {
    var o = la[i]; if (!isObj(o)) continue;
    if (lock.length && idOf(o, lock)) continue;
    if (idOf(o, idf) === id) return o;
  }
  return null;
}
function hasF(o, f) { return !!o && Object.prototype.hasOwnProperty.call(o, f) && o[f] !== null && o[f] !== ''; }
function specViolation(sp, la, lb, idf) {
  var i, j, q;
  for (i = 0; i < lb.length; i++) {
    var e = lb[i];
    if (!isObj(e)) return 'field';
    if (!entChanged(la, e)) continue;                       /* لم يتغيّر: لا يُعاقَب */
    var tw = twinOf(la, e, idf);
    for (j = 0; j < (sp.req || []).length; j++) {
      var rq = sp.req[j];
      /* الحقل الواجب لا يُسقَط ولا يُنشأ كيانٌ بدونه — أمّا سجلٌّ قديم لم يكن
         يحمله أصلاً فيبقى قابلاً للتعديل كما هو (رفقاً بالإرث). */
      if (!hasF(e, rq) && !(tw && !hasF(tw, rq))) return 'field';
    }
    for (q in e) {
      if (sp.closed && !(sp.type && Object.prototype.hasOwnProperty.call(sp.type, q))) return 'field';
      if (sp.type && sp.type[q] && e[q] !== undefined && e[q] !== null && !typeOk(sp.type[q], e[q])) return 'field';
      if (sp.maxLen && Object.prototype.hasOwnProperty.call(sp.maxLen, q) && (typeof e[q] !== 'string' || e[q].length > sp.maxLen[q])) return 'field';
      if (sp.enum && sp.enum[q] && sp.enum[q].indexOf(e[q]) === -1) return 'field';
    }
  }
  return '';
}
/* تفرّدٌ على الحالة النهائية: الفارغ والغائب و null ليست هويةً فلا تدخل فيه،
   وما تغيّر في هذا الطلب لا بدّ أن يكون بصيغته القانونية. ولا يُرفض تصادمٌ
   بين سجلَّين قديمين لم يُمسّ أيٌّ منهما. */
function uniqViolation(sp, la, lb) {
  var u = sp.uniq || [], i, j;
  for (i = 0; i < u.length; i++) {
    var f = u[i].f, seen = {}, e, v;
    for (j = 0; j < lb.length; j++) {
      e = lb[j]; if (!isObj(e)) continue;
      v = e[f];
      if (v === undefined || v === null || v === '') continue;      /* «لا قيمة» */
      var ch = entChanged(la, e);
      if (ch && !(typeof v === 'string' && u[i].re.test(v))) return u[i].why || 'field';   /* صيغةٌ غير قانونية */
      var key = String(v);
      if (seen[key] !== undefined) { if (ch || seen[key]) return u[i].why || 'field'; }
      seen[key] = ch ? 1 : 0;
    }
  }
  return '';
}
/* سلسلةُ المطابقة المعلَنة لهذه المجموعة في سجل الكيانات */
function idfFor(k, at) {
  var E = entOf(k); if (!E || !E.cols) return null;
  for (var i = 0; i < E.cols.length; i++) if (E.cols[i].at === at) return { lock: E.cols[i].lock || [], idf: E.cols[i].idf || [] };
  return null;
}
function fieldViolation(k, FD, a, b) {
  if (!FD) return '';
  var v;
  if (FD.cols) {
    for (var at in FD.cols) {
      var lb = colList(b, at); if (!lb) continue;
      var la = colList(a, at) || [];
      v = specViolation(FD.cols[at], la, lb, idfFor(k, at)); if (v) return v;
      v = uniqViolation(FD.cols[at], la, lb); if (v) return v;
    }
    return '';
  }
  var lb2 = colList(b, FD.at || ''); if (!lb2) return '';
  var la2 = colList(a, FD.at || '') || [];
  v = specViolation(FD, la2, lb2, idfFor(k, FD.at || '')); if (v) return v;
  return uniqViolation(FD, la2, lb2);
}
/* قيمةُ القائمة البدائية نصٌّ غيرُ فارغ — هكذا تكتبها الواجهة في كل قوائمها */
function primBad(l) { for (var i = 0; i < l.length; i++) { if (typeof l[i] !== 'string' || !l[i].trim()) return true; } return false; }
function shapeViolation(E, a, b, fresh) {
  if (!E) return '';
  if (E.empty) {
    var e0 = parseJson(E.empty, null);
    if (Array.isArray(e0) && !Array.isArray(b)) return 'shape';
    if (isObj(e0) && !isObj(b)) return 'shape';
  }
  if (E.map && !isObj(b)) return 'shape';
  /* قوائمُ القيم البدائية لا تحتمل تكراراً — الواجهة نفسها تُسقطه عند الحفظ */
  if (E.primRoot && Array.isArray(b)) { if (primDup(b)) return 'dup'; if (primBad(b)) return 'field'; }
  if (E.prim && isObj(b)) for (var pz = 0; pz < E.prim.length; pz++)
    if (Array.isArray(b[E.prim[pz]])) { if (primDup(b[E.prim[pz]])) return 'dup'; if (primBad(b[E.prim[pz]])) return 'field'; }
  if (E.cols) for (var c = 0; c < E.cols.length; c++) {
    var at = E.cols[c].at;
    if (!at) { if (!Array.isArray(b)) return 'shape'; continue; }
    if (!isObj(b)) return 'shape';
    var hb = Object.prototype.hasOwnProperty.call(b, at);
    if (hb && !Array.isArray(b[at])) return 'shape';
    if (!fresh && Array.isArray(colList(a, at)) && !hb) return 'shape';   /* مجموعةٌ معلَنة أُسقطت */
  }
  return '';
}
/* جسدُ الكيان بلا حقول هويته — للكشف عن تبديل الهوية على كيانٍ قائم */
function bodyNoId(x, idf) { var o = {}, q; for (q in x) if (idf.indexOf(q) === -1) o[q] = x[q]; return o; }
/* سلسلةُ المطابقة التي تستعملها الواجهة بعد إسقاط الهوية القانونية */
function fbChain(col) { var out = [], i; for (i = 0; i < (col.idf || []).length; i++) if ((col.lock || []).indexOf(col.idf[i]) === -1) out.push(col.idf[i]); return out; }
function withCol(v, at, list) {
  if (!at) return list;
  var o = {}, q; for (q in v) o[q] = v[q]; o[at] = list; return o;
}
/* هل هذا تبنٍّ قانونيٌّ للهوية؟ السجلّ القديم بلا هويةٍ قانونية، والجديد هو هو
   حرفاً بحرف مضافاً إليه المعرّف ومطروحاً منه الحقول المهجورة لا غير. */
function adoptOk(E, o, e, col) {
  var skip = (col.lock || []).concat((E.adopt && E.adopt.drop) || []);
  if (!eqExcept(o, e, skip)) return false;
  var d = (E.adopt && E.adopt.drop) || [], i;
  for (i = 0; i < d.length; i++) if (Object.prototype.hasOwnProperty.call(e, d[i])) return false;   /* المهجور لا يعود */
  return true;
}
