/* ═══ KIVO_265 · KIVO-Tasks — التذكيرُ قبل المهلة والتصعيدُ عند التأخر من الخادم (البند 10 — قرارُ المالك 2026-10-19) ═══
   كانا من متصفّح المسؤول وحده (442). الآن مسحٌ كسولٌ بلا Cron (كـ073) لصفوف اليوم وأمسِ وقبله كلَّ TK_DUE_GAP لكل إدارة — يحرّكه «مهامي» (062c) وفتحُ صفحة المهام
   (073): soon ≤ ساعة ⇒ task_soon للمكلَّف · late ⇒ task_late له ولصاحبها ومراجِعها ولأدوار الإدارة · لم تبدأ وانقضت نافذتُها (tkWinTo) ⇒ r20.exp + «لم تُقبل»
   لصاحبها — مرةً لكل صفّ (once) · الأقدمُ من METK_EXP_WIN لا يُمسّ · الكتابةُ باسم صاحب المهمة وإلا مديرِ الإدارة عبر الحفظ المركزي · المصدرُ srv:due. التفصيلُ في CHANGELOG. */
var TK_DUE_LAST = nmap(), TK_DUE_GAP = 5 * 6e4, TK_DUE_SOON = 60 * 6e4, TK_DUE_MAX = 60, TK_DUE_META = { ip: 'srv:due', city: '', dev: 'srv:due' };
function tkDueMin(ms) { var m = Math.max(1, Math.round(ms / 6e4)); return m === 1 ? 'دقيقة' : m === 2 ? 'دقيقتان' : m <= 10 ? m + ' دقائق' : m + ' دقيقة'; }
function tkDueBoss(r, d) {
  var x = tkX(r) || {}, boss = [];
  [x.rv, x.by].forEach(function (w) { if (isObj(w) && (w.e || w.u) && boss.indexOf(String(w.e || w.u)) === -1) boss.push(String(w.e || w.u)); });
  return boss.length ? boss : ['mgr:' + d];
}
async function tkDueActor(env, d, uid, cache) {
  var k = uid || 'mgr';
  if (cache[k] === undefined) {
    var A = uid ? await actorOf(env, uid) : null;
    if (!A && cache.mgr === undefined) {
      var m = ((await usersList(env)) || []).filter(function (u) { return isObj(u) && !u.dis && String(u.deptId || '') === d && (u.role === 'dept' || !!u.mgr || isMgrKey(u.ekey)); })[0];
      cache.mgr = m ? tkSrvMark(await actorOf(env, m.id)) : null;
    }
    cache[k] = A ? tkSrvMark(A) : cache.mgr;
  }
  return cache[k];
}
async function tkDueRun(env, request, d) {
  var K = tkK(d), now = Date.now(), rep = { soon: 0, late: 0, exp: 0, skipped: 0, sent: 0 };
  var S = parseJson(await kvGet(env, 'kv', K), {}); if (!isObj(S)) return rep;
  var days = []; [0, 1, 2].forEach(function (b) { var H = tkHij(now - b * 864e5); if (H && days.indexOf(H.k) === -1) days.push(H.k); });   /* مفاتيحُ الصفوف أيامٌ مدنية (هجريُّ الرياض لبدايتها) لا تشغيلية: اليوم وأمس وقبله */
  var plan = nmap(), n = 0;
  for (var q = 0; q < days.length; q++) {
    var dk = days[q], L = Array.isArray(S[dk]) ? S[dk] : [];
    for (var i = 0; i < L.length && n < TK_DUE_MAX; i++) {
      var r = L[i]; if (!Array.isArray(r) || !r[14] || !r[16] || now - r[16] > METK_EXP_WIN) continue;
      var St = tkState(r, now); if (St.closed || St.exe === 'submitted') continue;
      var x = tkX(r) || {}, au = isObj(x.by) && x.by.u ? String(x.by.u) : '', id = r[13] != null && r[13] !== '' ? String(r[13]) : 'i' + i;
      var P = plan[au] = plan[au] || { N: [], exp: [] }, title = String(r[0] || 'مهمة'), nm = String(r[8] || '—');
      if (now < r[16]) { if (r[16] - now <= TK_DUE_SOON) { P.N.push({ type: 'task_soon', own: [String(r[14])], once: 'soon:' + dk + ':' + id, vars: { 'المدة': tkDueMin(r[16] - now), 'المهمة': title } }); n++; } continue; }
      P.N.push({ type: 'task_late', own: [String(r[14])].concat(tkDueBoss(r, d)), once: 'late:' + dk + ':' + id, vars: { 'المهمة': title, 'الاسم': nm, 'الوقت': tkClock(r[16]) } }); n++;
      if (!r[11] && !(tkObj(r[20]) || {}).exp && now > tkWinTo(r)) {
        P.exp.push({ dk: dk, id: r[13], i: i });
        P.N.push({ type: 'task_chg', own: tkDueBoss(r, d), once: 'exp:' + dk + ':' + id, vars: { 'الفعل': 'لم تُقبل', 'المهمة': title, 'التفصيل': 'انقضت مهلة قبول ' + nm + ' بلا ردّ · مدّدها أو أعِد إسنادها' } });
      }
    }
  }
  var authors = Object.keys(plan), cache = nmap();
  for (var a = 0; a < authors.length; a++) {
    var P2 = plan[authors[a]], Aa = await tkDueActor(env, d, authors[a], cache);
    if (!Aa) { rep.skipped += P2.N.length; continue; }
    if (P2.exp.length) {
      var marked = 0;
      var R = await tkSave(env, request, Aa, K, function (Sx) {
        var S2 = Object.assign({}, Sx), aud = [], t = Date.now(); marked = 0;
        P2.exp.forEach(function (p) {
          var L2 = Array.isArray(S2[p.dk]) ? S2[p.dk] : [], j = -1;
          for (var m = 0; m < L2.length; m++) if (Array.isArray(L2[m]) && (p.id != null && p.id !== '' ? String(L2[m][13]) === String(p.id) : m === p.i)) { j = m; break; }
          if (j < 0) return;
          var r0 = L2[j], g = Object.assign({}, tkObj(r0[20]) || {});
          if (tkState(r0, t).closed || r0[11] || g.exp || !(t > tkWinTo(r0))) return;   /* على القيمة الطازجة */
          g.exp = t; var r1 = r0.slice(); r1[20] = g;
          S2[p.dk] = L2.map(function (z, w) { return w === j ? r1 : z; }); marked++;
          aud.push(tkAud(K, r1, 'expired', { day: p.dk, i: j, via: 'due', sys: 1 }, { st: r0[3] || null, acc: null }, { st: r1[3], acc: null, exp: t }));
        });
        return marked ? { S2: S2, aud: aud } : { noop: 1 };
      }, TK_DUE_META);
      if (R && R.err) P2.N = P2.N.filter(function (it) { return it.type !== 'task_chg'; }); else rep.exp += marked;
    }
    rep.sent += await tkNotify(env, request, Aa, d, P2.N, TK_DUE_META);
    P2.N.forEach(function (it) { if (it.type === 'task_soon') rep.soon++; else if (it.type === 'task_late') rep.late++; });
  }
  return rep;
}
async function tkDueLazy(env, request, d, seen) {
  if (!(await tkGateTake(env, 'due', d, TK_DUE_GAP, TK_DUE_LAST, seen))) return null;
  try { return await tkDueRun(env, request, d); } catch (e) { swallow('tk-due', e); return null; }
}
/* ═══ الفحصُ العميق 2026-10-21 · R8: «مهامك» في «ملفي» تبقى على «جارٍ تحميل مهامك…» 4–6 ث بعد كل تحميل (GET /api/me/tasks 4–5 ث على Test) ═══
   الجذر: التوليدُ الكسول (073 tkRecurLazy) والمسحُ الكسول (tkDueLazy) يجريان داخل القراءة، وحارسُهما ذاكرةُ العزلة وحدها (TK_REC_LAST · TK_DUE_LAST) —
   والطلباتُ المتتالية على Cloudflare تقع في عزلاتٍ مختلفة فيجريان في كلّ طلبٍ تقريباً: ≈24 جولةَ D1 من 29 (عُدّةُ الوحدة) ≈ 3.3 ث على Test.
   الآن حارسٌ مشترك بين العزلات لكل إدارة في جدول meta (tkg:rec:<d> · tkg:due:<d> — طابعُ آخر تشغيل): يُقرأ الطابعان بجولةٍ واحدة لا تُدفع إلا إذا
   انقضت مهلةُ ذاكرة العزلة، ويجري العملُ إذا انقضت مهلتُه منذ آخر تشغيلٍ في أيّ عزلة (10 د للتوليد · 5 د للمسح — كما كانتا) فيُختم قبل أن يبدأ.
   النتيجةُ كما كانت: ما يجري يجري قبل بناء الردّ (النسخُ المولَّدة ووسمُ الانقضاء في الردّ نفسِه)، ولم يتغيّر إلا مَن يدفع الكلفة: طلبٌ واحدٌ لكل
   إدارةٍ في المهلة بدل كلّ طلب. وعطلُ القراءة أو الختم ⇒ السلوكُ القديم (ذاكرةُ العزلة) — لا يُحجب عملٌ بخلل الحارس. والتشغيلُ الصريح
   (POST /api/tasks/recur/run من صفحة المهام) يختم الطابعين بعد أن يجري. */
var TK_GATE_SKEW = 6e4;                                                     /* طابعٌ «من المستقبل» أبعدُ من دقيقة (ساعةُ عزلةٍ منحرفة) لا يحجب شيئاً */
async function tkGateSeen(env, d, kinds) {
  var o = nmap(); if (!d || !kinds.length) return o;
  try {
    var ks = kinds.map(function (q) { return 'tkg:' + q + ':' + d; });
    var st = (env.__rawDB || env.DB).prepare('SELECT k, v FROM meta WHERE k IN (' + ks.map(function (_, i) { return '?' + (i + 1); }).join(', ') + ')');
    var r = await st.bind.apply(st, ks).all();
    ((r && r.results) || []).forEach(function (x) { var m = /^tkg:(\w+):/.exec(String(x.k)); if (m) o[m[1]] = String(x.v); });
  } catch (e) { swallow('tk-gate-read', e, env.__rid); }
  return o;
}
/* أيجري العملُ kind الآن؟ ذاكرةُ العزلة أولاً (كما كانت) ثم الطابعُ المشترك (seen: نصُّه كما قُرئ · undefined ⇒ يُقرأ هنا) — وإن جرى خُتم قبل بدئه */
async function tkGateTake(env, kind, d, gap, mem, seen) {
  var now = Date.now(); if (!d || now - (mem[d] || 0) < gap) return false;
  if (seen === undefined) seen = (await tkGateSeen(env, d, [kind]))[kind];
  var at = seen == null ? 0 : (parseInt(seen, 10) || 0);
  if (at && at <= now + TK_GATE_SKEW && now - at < gap) { mem[d] = Math.min(at, now); return false; }   /* جرى في عزلةٍ أخرى منذ قليل */
  mem[d] = now;
  await tkGateStamp(env, [kind], d, now);
  return true;
}
async function tkGateStamp(env, kinds, d, now) {
  if (!d || !kinds.length) return;
  try {
    var args = [String(now || Date.now())], vals = kinds.map(function (q, i) { args.push('tkg:' + q + ':' + d); return '(?' + (i + 2) + ', ?1)'; });
    var st = (env.__rawDB || env.DB).prepare('INSERT INTO meta (k, v) VALUES ' + vals.join(', ') + ' ON CONFLICT(k) DO UPDATE SET v = excluded.v');
    await st.bind.apply(st, args).run();
  } catch (e) { swallow('tk-gate-stamp', e, env.__rid); }
}
/* تغيّرت سلسلةُ تكرار (إنشاءٌ · تعديلٌ · إيقافٌ · استئنافٌ · تحويل — 071 · 073): يُمحى طابعُ التوليد وذاكرةُ هذه العزلة فتولّد القراءةُ التالية في «ملفي»
   فوراً — كان التوليدُ بعد التغيير رهنَ عزلةٍ لم تولّد منذ 10 د؛ صار حتمياً */
async function tkGateReset(env, kind, d) {
  if (!d) return;
  (kind === 'rec' ? TK_REC_LAST : TK_DUE_LAST)[d] = 0;
  try { await (env.__rawDB || env.DB).prepare('DELETE FROM meta WHERE k = ?1').bind('tkg:' + kind + ':' + d).run(); } catch (e) { swallow('tk-gate-reset', e, env.__rid); }
}
/* «ملفي ← مهامي» (062c): التوليدُ (القراءةُ الكاملة وحدها) ثم المسح — كما كانا، بالحارس المشترك وجولةِ قراءةٍ واحدة للطابعين */
async function tkLazyJobs(env, request, d, withRec) {
  if (!d) return;
  var now = Date.now(), need = [];
  if (withRec && typeof tkRecurLazy === 'function' && now - (TK_REC_LAST[d] || 0) >= TK_REC_GAP) need.push('rec');
  if (now - (TK_DUE_LAST[d] || 0) >= TK_DUE_GAP) need.push('due');
  var seen = need.length ? await tkGateSeen(env, d, need) : nmap();
  if (withRec && typeof tkRecurLazy === 'function') { try { await tkRecurLazy(env, request, d, seen.rec === undefined ? null : seen.rec); } catch (eR) { swallow('tk-recur-lazy', eR); } }
  await tkDueLazy(env, request, d, seen.due === undefined ? null : seen.due);
}
