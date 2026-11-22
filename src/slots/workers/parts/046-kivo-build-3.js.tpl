/* ═══ V7 · د5-هـ (44): نوافذُ الاستدراك (ir.rec.retro.open · sz.rec.retro.open) — حالةٌ خادمية لكل (إدارة · نظام) يقرؤها /api/retro (047) والإنفاذ (062 enfSavePrep · 010 KIVO_SCOPE).
   كانت هنا طبقةُ القياس الظلّية PERMV3 (R196 · Phase 3: عدّاداتُ import.run · backup.restore · بوابات العدسات · الاستدراك — permv3After · permv3Batch) — حُذفت: لم تحكم يوماً. ═══ */
var RETRO = { @@SYS:retro.table|sep=",\n              "@@ };
var RETRO_SYS_OF = { @@SYS:retro.sysOf|sep=", "@@ };
function retroKey(d, sys) { return 'bsdept:' + d + ':' + RETRO[sys].state; }
async function retroState(env, d, sys) {
@@SYS:retro.state@@  throw rsError('retro-resource');
}
/* من يفتح نافذةَ استدراك: مدير النظام، أو حاملُ approve على ورقة السجلات في الإدارة — ذرّةُ G‑08 نفسُها التي تفتح الشهرَ واجهياً اليوم (وهي ترجمةُ ir/sz.rec.retro.open) */
function retroMay(A, d, sys) { return enfRetroMay(A, d, sys); }   /* V7 · د5-ح (القفل): المحرّكُ النافذ وحده */
function retroScopeKey(sc) { return sc.y + '-' + sc.m + (sc.d == null ? '' : '-' + sc.d); }
/* سياقُ الاستدراك للحفظة: نوافذُ كلِّ (إدارة · نظام) تمسّه الكتابةُ — قراءةٌ واحدة لكلٍّ (الاسمُ باقٍ توافقاً: يقرؤه الإنفاذ والإحصائيات) */
async function permv3RetroLoad(env, set, del) {
  var out = {}, k, i, ks = Object.keys(set || {}); for (i = 0; i < (del || []).length; i++) ks.push(String(del[i]));
  for (i = 0; i < ks.length; i++) { k = ks[i]; var sys = RETRO_SYS_OF[resName(k)]; if (!sys) continue; var d = parseKey(k).dept; if (!d) continue; var id = d + '|' + sys; if (out[id]) continue; out[id] = (await retroState(env, d, sys)).windows; }
  return out;
}
