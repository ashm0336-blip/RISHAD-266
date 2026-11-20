/* V7 · د5-هـ (44) — بديلُ اختبارٍ لمحرّك الأدوار KIVO.Perm44 (للاختبارات وحدها؛ المحرّكُ الحقيقيُّ لمجموعة v1 — src/permissions/345-perm44.js).
   يطابق العقد في SPEC44 بالأسماء التي يقرؤها المستهلكون هنا: rolesOf(did) · roleOf(ekey, did) · roleNameOf(ekey, did) · setPerson(ekey, roleId|null, did).
   data = { <did>: { roles: [{ id, name, desc, sup, sys }], people: { <ekey>: { role } }, custom: { <ekey>: true } } } — TEST_ONLY */
export function perm44Stub(data, log = []) {
  const unit = (did) => data[did] || (data[did] = { roles: [], people: {}, custom: {} });
  const roleOf = (ekey, did) => { const U = unit(did), p = U.people[ekey]; return p && p.role ? U.roles.find((r) => r.id === p.role) || null : null; };
  return {
    rolesOf: (did) => unit(did).roles.slice(),
    roleOf,
    roleNameOf: (ekey, did) => { const r = roleOf(ekey, did); return r ? r.name : unit(did).custom[ekey] ? 'صلاحيات مخصّصة' : 'بلا صلاحيات'; },
    setPerson: (ekey, roleId, did) => { log.push(['setPerson', ekey, roleId, did]); const U = unit(did); if (roleId && !U.roles.some((r) => r.id === roleId)) return { ok: false, err: 'TEST_ONLY unknown role' }; if (roleId) U.people[ekey] = { role: roleId, ex: [] }; else delete U.people[ekey]; return { ok: true }; },
  };
}
