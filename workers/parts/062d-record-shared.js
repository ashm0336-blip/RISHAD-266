/* KIVO_265 · F-1/R-24 (المراجعةُ المستقلة — ثغرةُ رقم الهوية · fail-closed): سجلُّ الموظف rec «له» حسابٌ نشطٌ آخرُ غيرُ selfId في الإدارة d يحلّ إليه
   (tkTokRec: eid ∪ nid · أو ربطُ «ملفي» pfLink — 062b) ⇒ لا يُعدّ أيٌّ منهما مرتبطاً به (062c meTkIdent · 062b meIdent): لا مهامَه ولا صورَه ولا جدولَه.
   يغلق كلَّ طريقٍ إلى حسابين لسجلٍّ واحد — ومنه تعديلُ سجلّ الموظفين بعد إنشاء الحساب (والكتابةُ تمنع الحاملَ الجديد: 054 usersDupEkey) */
function tkRecShared(users, emps, d, rec, selfId) {
  if (!rec) return false;
  var E = (Array.isArray(emps) ? emps : []).filter(isObj), L = Array.isArray(users) ? users : [], i, u, ek;
  for (i = 0; i < L.length; i++) {
    u = L[i]; if (!u || !u.id || String(u.id) === String(selfId) || u.dis || String(u.deptId || '') !== String(d)) continue;
    ek = String(u.ekey || ''); if (!ek || u.role === 'super' || u.role === 'gm' || isMgrKey(ek) || ek.indexOf('gm:') === 0) continue;
    if (tkTokRec(E, ek) === rec || pfLink(u, E).rec === rec) return true;
  }
  return false;
}
