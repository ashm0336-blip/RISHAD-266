/* ══ authorize — السؤال الواحد الذي يُسأل قبل كل قراءةٍ أو كتابة ══════════
   يعيد { ok, why, cap } — و why مفيدةٌ للتدقيق لا للواجهة. */
function authorize0(A, key, act) {
  if (!A || !A.u) return { ok: false, why: 'session' };
  var R = resOf(key);
  if (!R) return { ok: false, why: 'unknown' };                  /* مورد مجهول = رفض */
  if (R.scope === 'device') return { ok: false, why: 'device' };
  var P = parseKey(key);
  if (R.scope === 'global') {
    if (P.dept) return { ok: false, why: 'scope' };
    return A.u.role === 'super' ? { ok: true, cap: '*' } : { ok: false, why: 'super' };
  }
  if (!P.dept) return { ok: false, why: 'scope' };               /* مورد إدارةٍ بلا إدارة */
  if (!deptInScope(A, P.dept)) return { ok: false, why: 'dept' };
  if (R.rule) return { ok: false, why: 'rule' };                 /* سياسته الخاصة تُفحص في موضعها */
  if (A.u.role === 'super') return { ok: true, cap: '*' };   /* V7 · د1-ج (قرار صاحب المنصة): مدير المنصة بلا قيد صلاحية — قبل السقف والوحدات المطفأة والعدسة والأوراق */
  /* مدير النظام لا يُستثنى هنا: myPermsOf تعطيه سقف الإدارة كاملاً (وهو ما
     تفعله الواجهة)، فيبقى خاضعاً لسقف الإدارة وللوحدة المطفأة على مستوى
     المنصة. وصفحة «الإعدادات» وحدها له دائماً — كما في myPerms حرفاً بحرف. */
  var caps = capForAct(R, act);
  var perms = myPermsOf(A, P.dept), any = false;
  var admFree = A.u.role === 'super';
  for (var i = 0; i < caps.length; i++) {
    var c = caps[i];
    if (!(admFree && c.indexOf('admin') === 0) && !capOnDept(A, P.dept, c)) continue;
    var acts = perms[c] || [];
    if (acts.length) any = true;
    if (acts.indexOf(act) !== -1) return { ok: true, cap: c };
  }
  return { ok: false, why: any ? 'act' : (Object.keys(perms).length ? 'page' : 'view') };
}
