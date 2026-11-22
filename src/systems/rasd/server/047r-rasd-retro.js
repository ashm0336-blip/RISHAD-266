/* ═══ V7 · د6 (رصد الحالات · قرار المالك): فتحُ الشهر أو اليوم المقفل يُنفَّذ على الخادم بالآلية القائمة نفسِها للمضبوطات والاسترشاد ═══
   /api/retro (047: الفتحُ والإغلاقُ بالسبب والتدقيق · الحدُّ الزمني · retroMay = rz.rec.retro.open) · الإنفاذُ عند الحفظ (permv3RetroLoad ← RETRO_SYS_OF ·
   010 DateRange ← RETRO_SYS: كتابةٌ في فترةٍ مغلقة بلا نافذةٍ سارية تُرفض). ما يخصّ هذا النظام: حالةُ النوافذ مفتاحُ إدارةٍ في المخزن
   bsdept:<d>:bassam_rasd_retro_v1 = { windows: [{ id, scope:{y,m,d|null}, by, at, until, hours, reason, closedAt }] } — في RES_REG بعلامة srv (V7 · د6: لا يكتبه حفظٌ عادي ولا مديرُ المنصة؛ تعيده الاستعادةُ الخادمية المتحقَّقة كما في النسخة؛
   قراءتُه المعلنة GET /api/retro) — ومحوّلُ النافذة لـ047 (retroDomainAdapter) فوق المخزن بدل الجداول. */
function rzRetroParse(rows) {
  var v = parseJson(rows.length ? rows.map(function (r) { return r.v; }).join('') : null, null);
  return { windows: isObj(v) && Array.isArray(v.windows) ? v.windows.filter(isObj) : [] };
}
async function rzRetroRows(env, d) {
  var r = await env.DB.prepare('SELECT k, seq, v FROM kv WHERE k=?1 ORDER BY seq').bind(retroKey(d, 'rasd')).all();
  return (r && r.results) || [];
}
async function rzRetroState(env, d) { return rzRetroParse(await rzRetroRows(env, d)); }
function rzRetroAdapter() {
  return {
    context: async function (env, A, d) { return { env: env, A: A, d: d, guards: [] }; },
    retired: async function () {},
    retiredGuard: function (env) { return env.DB.prepare('SELECT 1'); },
    /* لقطةُ الحالة مع شاهدِ صفوفها: فتحان متزامنان لا يكتب أحدُهما فوق الآخر (يُرفض المتأخر) */
    snapshot: async function (env, d) {
      var rows = await rzRetroRows(env, d);
      return { state: rzRetroParse(rows), guards: rsWitness(env, 'kv', ['k', 'seq', 'v'], rows, 'k=?1', [retroKey(d, 'rasd')]) };
    },
    install: function (env, d, state) { return kvPutStmts(env, 'kv', retroKey(d, 'rasd'), JSON.stringify({ windows: state.windows })); },
  };
}
