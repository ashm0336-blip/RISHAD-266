/* V7 · 53 (تقليصُ العامل): تتبّعُ القرّاء لحقلٍ داخل حاويةٍ مقروءة — عُدّةُ v7_53_trim_server_data.
   traceReads(root, isSeed): «البذرة» تعبيرٌ يعطي عنصراً من الحاوية (مثل S.bindings[i] · BYKEY[k]). يُجمع:
     · الأسماءُ المسنَدة من بذرة (var x = <بذرة> · x = <بذرة> · <بذرة> || … · c ? <بذرة> : …) — محافظ: الاسمُ في أي موضعٍ من الجذر
     · الدوالُّ التي تُرجع بذرةً (فنداؤها بذرة) — حتى الثبات
     · reads: أسماءُ الخصائص المقروءة على البذرة أو اسمِها (a.b · a['b'])
     · escapes: مواضعُ يُستعمل فيها العنصر كاملاً (وسيطٌ · قيمةُ خاصية · إرجاع · إسناد) — تُعلن في الاختبار بسببها
   ويُفحص: kids(prop) — بذورُ المستوى التالي (عناصرُ مصفوفةٍ في الحقل prop). */
export function traceReads(root, isSeed) {
  const all = [], parents = new Map();
  (function walk(n, p) { if (!n || typeof n.type !== 'string') return; parents.set(n, p); all.push(n); for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach((x) => x && typeof x.type === 'string' && walk(x, n)); else if (v && typeof v.type === 'string') walk(v, n); } })(root, null);
  /* النطاق: الدالةُ (أو الجذر) التي تعلن الاسم — معاملاً أو var/let/const في جسدها (لا في دالةٍ متداخلة) */
  const decl = new Map();
  const declOf = (f) => { if (decl.has(f)) return decl.get(f); const s = new Set();
    const pat = (p) => { if (!p) return; if (p.type === 'Identifier') s.add(p.name); else if (p.type === 'AssignmentPattern') pat(p.left); else if (p.type === 'RestElement') pat(p.argument); else if (p.type === 'ObjectPattern') p.properties.forEach((x) => pat(x.value || x.argument)); else if (p.type === 'ArrayPattern') p.elements.forEach(pat); };
    if (f.params) f.params.forEach(pat);
    (function w(n) { if (!n || typeof n.type !== 'string') return; if (n !== f && /Function/.test(n.type)) { if (n.type === 'FunctionDeclaration' && n.id) s.add(n.id.name); return; } if (n.type === 'VariableDeclarator') pat(n.id); for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(w); else if (v && typeof v.type === 'string') w(v); } })(f.body || f);
    decl.set(f, s); return s; };
  const scopeOf = (id) => { let f = parents.get(id); while (f) { if (/Function/.test(f.type) && declOf(f).has(id.name)) return f; f = parents.get(f); } return root; };
  const key = (id) => { const f = scopeOf(id); return (f.start) + ':' + id.name; };
  const ids = new Set(), fns = new Set();
  const isS = (e) => { if (!e) return false; if (e.type === 'LogicalExpression') return e.operator === '&&' ? isS(e.right) : isS(e.left) || isS(e.right);   /* a && b ⇒ قيمتُه b (a حارسٌ) */ if (e.type === 'ConditionalExpression') return isS(e.consequent) || isS(e.alternate);
    if (e.type === 'Identifier') return ids.has(key(e)); if (e.type === 'CallExpression' && e.callee.type === 'Identifier' && fns.has(key(e.callee))) return true; return isSeed(e); };
  for (let grew = true; grew;) {
    grew = false;
    for (const n of all) {
      let id = null, rhs = null;
      if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier') { id = n.id; rhs = n.init; }
      if (n.type === 'AssignmentExpression' && n.left.type === 'Identifier' && n.operator === '=') { id = n.left; rhs = n.right; }
      if (id && rhs && !ids.has(key(id)) && isS(rhs)) { ids.add(key(id)); grew = true; }
      if (n.type === 'ReturnStatement' && isS(n.argument)) { let f = parents.get(n); while (f && !/Function/.test(f.type)) f = parents.get(f); if (f && f.id && !fns.has(key(f.id))) { fns.add(key(f.id)); grew = true; } }
    }
  }
  const reads = new Set(), escapes = [];
  const isAlias = (n) => n.type === 'Identifier' && ids.has(key(n));
  for (const n of all) {
    if (n.type === 'MemberExpression' && (isAlias(n.object) || (n.object.type !== 'Identifier' && isS(n.object)))) {
      if (!n.computed) reads.add(n.property.name); else if (n.property.type === 'Literal') reads.add(String(n.property.value)); else reads.add('[computed]');
      continue;
    }
    if (isAlias(n)) {
      const up = parents.get(n);
      if (up.type === 'MemberExpression' && up.object === n) continue;
      if ((up.type === 'VariableDeclarator' && up.id === n) || (up.type === 'AssignmentExpression' && up.left === n)) continue;
      if (up.type === 'UnaryExpression' || up.type === 'IfStatement' || up.type === 'BinaryExpression' || (up.type === 'ConditionalExpression' && up.test === n) || (up.type === 'LogicalExpression' && up.left === n)) continue;
      escapes.push(up.type + '@' + n.start);
    }
  }
  return { ids: [...ids].map((x) => x.split(':')[1]).sort(), fns: [...fns].map((x) => x.split(':')[1]).sort(), reads: [...reads].sort(), escapes };
}
