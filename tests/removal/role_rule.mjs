/* V7 · د5-د2 (قرار المراجع على «لا رمزَ لنظامٍ غائب») — اسمُ مجلدٍ هو أيضاً كلمةٌ أخرى في المنصة: «staff» دورُ الحساب (موظف) قبل أن يكون الجدولَ الشهري.
   القاعدة (tests/removal/names.allow.json ← roles) ضيّقةٌ وحرفية، ولا تُطبَّق إلا حين يكون ذلك النظامُ غائباً:
     · patterns   أنماطُ «سطر الدور» وحدها (role === 'staff' · role: 'staff' · kind: 'staff' …). يُمحى من السطر **المقطعُ المقتبس 'staff' داخل المطابقة**
                  فقط، وبقيةُ السطر تُفحص كما هي — فسطرٌ يبدو سطرَ دورٍ ويقرأ الجدولَ يُكشف.
     · identifiers معرّفاتٌ بأسمائها واحداً واحداً، ولكلٍّ سببُه (isStaff · staffMap · plainStaff …): تُمحى بحدود الكلمة كاملةً، لا بادئةً ولا جزءاً.
   ولا شيءَ غير ذلك: لا نمطَ عام ولا بادئة. وما لا تغطيه القاعدة يبقى في مداخل الملفات الحرفية (entries) كما كان.
   عددُ المداخل مثبَّتٌ في LIMITS أدناه: ينزل ولا يرتفع، وكلُّ مدخلٍ جديد يحتاج موافقةَ المراجع. */
export const LIMITS = { skipFiles: 1, patterns: 1, entries: 32, matches: 75, rolePatterns: 8, identifiers: 19, roles: 2 };   /* د5-هـ: المداخلُ 45→32 والمقاطع 103→75 (أسماءُ الناقل الحرفية الثلاثة عشر صارت قاعدةً مكتوبة: bus_rule.mjs) · +1 قاعدة (plan · substring:false) و+4 أنماط لقيمة 'plan' المحلية — بانتظار موافقة المراجع */

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');

/* rules: ALLOW.roles · gone: الأنظمةُ الغائبة. يعيد دالةً تنظّف سطراً بقاعدة الدور (للأنظمة الغائبة التي لها قاعدة) */
export function roleCleaner(rules, gone) {
  const active = (rules || []).filter((r) => gone.includes(r.name));
  if (!active.length) return (line) => line;
  const steps = active.map((r) => {
    const quoted = new RegExp('([\'"])' + esc(r.name) + '\\1');
    const pats = (r.patterns || []).map((p) => new RegExp(p.re, 'g'));
    const ids = (r.identifiers || []).map((x) => x.name);
    const idRx = ids.length ? new RegExp('(?<![\\w$])(?:' + ids.map(esc).join('|') + ')(?![\\w$])', 'g') : null;
    return (line) => {
      let out = line;
      for (const p of pats) out = out.replace(p, (m) => m.replace(quoted, '""'));
      if (idRx) out = out.replace(idRx, '');
      return out;
    };
  });
  return (line) => steps.reduce((l, f) => f(l), line);
}

/* مداخلُ القاعدة بلا موضع في الشجرة الكاملة: نمطٌ لا يطابق أي سطر · معرّفٌ لا يرد في أي ملفٍ مبحوث */
export function staleRoles(rules, texts) {
  const out = [];
  for (const r of rules || []) {
    for (const p of r.patterns || []) { const rx = new RegExp(p.re); if (!texts.some((t) => rx.test(t))) out.push('roles.' + r.name + '.patterns: «' + p.re + '» لا يطابق سطراً'); }
    for (const x of r.identifiers || []) { const rx = new RegExp('(?<![\\w$])' + esc(x.name) + '(?![\\w$])'); if (!texts.some((t) => rx.test(t))) out.push('roles.' + r.name + '.identifiers: «' + x.name + '» لا يرد في ملفٍ مبحوث'); }
  }
  return out;
}

/* أعدادُ القائمة كما تُقاس على LIMITS */
export function allowCounts(allow) {
  const roles = allow.roles || [];
  return {
    skipFiles: allow.skipFiles.length, patterns: allow.patterns.length, entries: allow.entries.length,
    matches: allow.entries.reduce((a, e) => a + e.match.length, 0),
    rolePatterns: roles.reduce((a, r) => a + (r.patterns || []).length, 0), identifiers: roles.reduce((a, r) => a + (r.identifiers || []).length, 0),
    roles: roles.length,
  };
}
