function privAwardOk(A, d) {
  return privPersonalOk(A, d) || privMemo(A, '__privAw', d, function () { return privHeld(A, d, ['award.res.edit', 'award.res.approve', 'award.res.reject', 'award.res.delete', 'award.res.status'], ['award/res:edit', 'award/res:approve', 'award/res:del']); });
}
function privAwardRec(A, d, r) { return !isObj(r) || privAwardOk(A, d) || (r.ekey != null && String(r.ekey) === String(A.u.ekey || '\u0000')) ? r : privUserRow(A, d, privStrip(r, PRIV_AW_F)); }   /* (9) a plain reader: ekey too */
