/* CORE-02 (B1): platform name — never saved empty or blank (whitespace, zero-width and direction marks count as blank), both modes and any role.
   Only a value that carries «name» is judged (a value without it keeps the default); a restore writes what its backup holds. */
var PLAT_BLANK = /^[\s؜​-‏‪-‮⁠-⁤⁦-⁩]*$/;
function platNameWhy(k, v, ctx) {
  if (k !== K_PLAT || v == null || (ctx && (ctx.rst || (ctx.enf && ctx.enf.restore)))) return '';
  var o = parseJson(String(v), null);
  if (!o || typeof o !== 'object' || Array.isArray(o) || !Object.prototype.hasOwnProperty.call(o, 'name')) return '';
  return typeof o.name === 'string' && !PLAT_BLANK.test(o.name) ? '' : 'plat-name';
}
function canWrite(A, k, newVal, curVal, ctx) {
  var lw = latentLossWhy(A, k, newVal, curVal, ctx);   /* caps-own: latent items are not lost by accident — any role, both modes (021) */
  if (lw) return enfNo('perms', { detail: 'latent: ' + lw + ' | ' + LATENT_MSG });
  var pnw = platNameWhy(k, newVal, ctx);
  if (pnw) return enfNo(pnw);
  return canWriteEnf(A, k, newVal, curVal, ctx);              /* KIVO_243: الكتابة من سجل v24.9 · V7 · د5-ح (القفل): وحده — حُذف فرعُ النظام القديم */
}
