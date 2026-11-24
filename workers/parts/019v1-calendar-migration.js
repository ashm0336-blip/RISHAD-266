/* ══ V7 · 53 تقويم: الترحيل 0014 (التصميم §3 · ق2–ق12 · REVIEW 33) — منسِّقٌ رقيق فوق المحوِّل الواحد (019v: calConv* فوق calHtoG*، ويستعمله الاستيرادُ نفسُه).
   ① calMigPrepare(env) — خطةُ بيانات 0014 عند التهيئة (052 migrateDb): جدولُ المطابقة · الصفوفُ العلائقية (أقفالُ الإحصائيات ق3 · نوافذُ الاستدراك ق7 ·
      الجائزة · الرصد · dedup) · العلامة cal_pend · اليومُ المرجعي cal_mig_t.
   ② calLazyEnsure — البياناتُ التشغيلية المرمَّزة تُحوَّل فترةً فترة عند أول قراءةٍ أو كتابةٍ لها (019r opLoadMany · opReadOnce)، وcalLazyDept للمسار الخلفي (019w).
   ③ calLegacyEnv — خطواتُ 0004/0006/0008/0009 القديمة تكتب hijri_* حتى يحوّلها 0014 (قرارُ الاقتران في cal_api.md). ══ */
var CAL_MIG_TKEY = 'cal_mig_t', CAL_MIG_SUM = 'cal_migration_summary:';
/* V7 · 53 تقويم (قرارُ الاقتران مع cal-rest، cal_api.md): خطواتُ 0004/0006/0008/0009 تكتب بخرائط أعمدةٍ صارت greg_* والجداولُ بعدُ hijri_* — تُشغَّل
   على قاعدةٍ تعيد كتابة الأسماء إلى hijri_* ما دام 0014 لم يُطبَّق، فيحوّلها 0014 بالمطابقة نفسِها كأيِّ صفٍّ آخر. */
function calLegacyEnv(env) {
  /* المعرّفاتُ وحدها: مساراتُ json_extract ('$.greg_year') تقرأ مفاتيحَ الصفوف المربوطة كما هي (greg_*) فلا تُمسّ — وإلا عادت القيمُ NULL */
  var DB = env.DB, rx = /(?<!\$\.)\bgreg_(year|month|day|date)\b/g, out = Object.assign({}, env);
  out.DB = { prepare: function (s) { return DB.prepare(String(s).replace(rx, 'hijri_$1')); }, batch: function (a) { return DB.batch(a); }, exec: function (s) { return DB.exec(String(s).replace(rx, 'hijri_$1')); } };
  return out;
}
/* ── المرحلة ١: خطةُ بيانات 0014 (تُقرأ قبل الدفعة · كلُّ كتابتها في الدفعة الذرّية نفسِها خلف حارس الترحيل) ── */
var CAL_MIG_TABLES = [['daily_stats_days', null], ['custody_movements', 'hijri_year,hijri_month,hijri_day'], ['irshad_reports', 'hijri_year,hijri_month,hijri_day'], ['seized_reports', 'hijri_year,hijri_month,hijri_day'],
  ['irshad_retro_windows', 'hijri_year,hijri_month,hijri_day'], ['seized_retro_windows', 'hijri_year,hijri_month,hijri_day'], ['daily_stats_month_locks', 'hijri_year,hijri_month,1']];
/* صفوفٌ إلى جدولٍ بعبارةٍ لكل جزءٍ (≤ 500KB) — cols بترتيب أعمدة كل صف */
function calRowsInsert(D, table, cols, rows, verb) { return rsChunks(rows).map(function (part) { return D.prepare((verb || 'INSERT') + ' INTO ' + table + '(' + cols.join(',') + ') SELECT ' + cols.map(function (c, i) { return "json_extract(j.value,'$[" + i + "]')"; }).join(',') + ' FROM json_each(?1) j WHERE 1' + (verb ? '' : ' ON CONFLICT DO NOTHING')).bind(JSON.stringify(part)); }); }
async function calMigPrepare(env) {
  var D = env.DB, now = Date.now(), T = calToday(now).k, before = [], after = [], need = {}, i;
  before.push(D.prepare('CREATE TABLE IF NOT EXISTS cal_hg_days (hy INTEGER NOT NULL, hm INTEGER NOT NULL, hd INTEGER NOT NULL, gy INTEGER NOT NULL, gm INTEGER NOT NULL, gd INTEGER NOT NULL, PRIMARY KEY (hy, hm, hd)) WITHOUT ROWID'));
  /* ① الأيامُ الهجرية الموجودة في الجداول ⇐ المطابقة (السنواتُ كاملةً بين أدناها وأعلاها) — صفٌّ بلا تحويل يوقف الترحيلَ باسمه قبل أي كتابة */
  for (i = 0; i < CAL_MIG_TABLES.length; i++) {
    var t = CAL_MIG_TABLES[i], sel = t[1] ? 'SELECT DISTINCT ' + t[1].split(',').map(function (c, j) { return c + ' AS ' + 'ymd'.charAt(j); }).join(',') + ' FROM ' + t[0] + ' WHERE hijri_year IS NOT NULL' :
      "SELECT DISTINCT CAST(substr(hijri_date,1,4) AS INTEGER) y,CAST(substr(hijri_date,6,2) AS INTEGER) m,CAST(substr(hijri_date,9,2) AS INTEGER) d FROM " + t[0] + " WHERE hijri_date GLOB '1[3-6][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'";
    (((await D.prepare(sel).all()).results) || []).forEach(function (r) {
      var y = +r.y, m = +r.m, d = r.d == null || +r.d === 0 ? 1 : +r.d;
      if (!calHDay(y, m, d)) throw new Error('db-cal-unmapped: ' + t[0] + ' ' + r.y + '-' + r.m + '-' + r.d);
      need[y] = 1;
    });
  }
  var rows = [];
  Object.keys(need).map(Number).sort(function (a, b) { return a - b; }).forEach(function (y) {
    for (var m = 1; m <= 12; m++) for (var d = 1; d <= 30; d++) { var g = calHDay(y, m, d); if (g) { var p = calGParse(g); rows.push([y, m, d, p.y, p.m, p.d]); } }
  });
  before.push.apply(before, calRowsInsert(D, 'cal_hg_days', ['hy', 'hm', 'hd', 'gy', 'gm', 'gd'], rows));
  /* ①ب تاريخُ الجائزة نصٌّ (YYYY-MM-DD أو y-m-d كما كتبه العميل) ⇐ ميلاديٌّ مبطَّن */
  var aw = [];
  (((await D.prepare('SELECT department_id d,record_id r,hijri_date x FROM award_records WHERE hijri_date IS NOT NULL').all()).results) || []).forEach(function (r) {
    var g = calConvDay(String(r.x), 'award_records ' + r.r); if (g !== String(r.x)) aw.push([r.d, r.r, g]);
  });
  rsChunks(aw).forEach(function (part) { after.push(D.prepare("UPDATE award_records SET greg_date=json_extract(j.value,'$[2]') FROM json_each(?1) j WHERE award_records.department_id=json_extract(j.value,'$[0]') AND award_records.record_id=json_extract(j.value,'$[1]')").bind(JSON.stringify(part))); });
  /* ② أقفالُ الإحصائيات (ق3): الجدولان ⇐ شكلُ النسخة {'site|y-m': true|{ap,mo,dopen,dshut}} ⇐ calConvDstats (القاعدةُ نفسُها للاستيراد) ⇐ الجدولان ميلادياً */
  var ml = ((await D.prepare('SELECT site,hijri_year y,hijri_month m,approved a,reopened r,legacy_boolean l FROM daily_stats_month_locks').all()).results) || [],
    dl = ((await D.prepare('SELECT site,hijri_year y,hijri_month m,hijri_day d,is_open o,is_shut s FROM daily_stats_day_locks').all()).results) || [], L = {};
  ml.forEach(function (r) { var o = L[r.site + '|' + r.y + '-' + r.m] = r.l && r.a ? true : {}; if (o !== true) { if (r.a) o.ap = 1; if (r.r) o.mo = 1; } });
  dl.forEach(function (r) { var o = L[r.site + '|' + r.y + '-' + r.m]; if (o === true) o = L[r.site + '|' + r.y + '-' + r.m] = { ap: 1 }; if (r.o) (o.dopen = o.dopen || {})[r.d] = 1; if (r.s) (o.dshut = o.dshut || {})[r.d] = 1; });
  if (ml.length) {
    var G = calConvDstats({ locks: L }, { T: T, rep: null }).locks, mrows = [], drows = [];
    Object.keys(G).forEach(function (k) {
      var q = k.split('|'), p = calGParse(q[1]), v = G[k], o = v === true ? { ap: 1 } : v, days = {};
      mrows.push([q[0], p.y, p.m, o.ap ? 1 : 0, o.mo ? 1 : 0, v === true ? 1 : 0]);
      Object.keys(o.dopen || {}).concat(Object.keys(o.dshut || {})).forEach(function (d) { days[d] = 1; });
      Object.keys(days).forEach(function (d) { drows.push([q[0], p.y, p.m, +d, (o.dopen || {})[d] ? 1 : 0, (o.dshut || {})[d] ? 1 : 0]); });
    });
    after.push(D.prepare('DELETE FROM daily_stats_day_locks'), D.prepare('DELETE FROM daily_stats_month_locks'));
    after.push.apply(after, calRowsInsert(D, 'daily_stats_month_locks', ['site', 'greg_year', 'greg_month', 'approved', 'reopened', 'legacy_boolean'], mrows, 'INSERT'));
    after.push.apply(after, calRowsInsert(D, 'daily_stats_day_locks', ['site', 'greg_year', 'greg_month', 'greg_day', 'is_open', 'is_shut'], drows, 'INSERT'));
  }
  /* ③ نوافذُ الاستدراك (ق7): نافذةُ يومٍ ⇐ يومُها · نافذةُ شهرٍ ساريةٌ ⇐ تُكرَّر في الشهرين الميلاديين بالمهلة نفسِها (معرّفٌ جديد «~g») ·
       المنتهيةُ والمغلقة ⇐ الشهرُ الميلادي لأول يومٍ من شهرها الهجري */
  for (var tw of ['irshad_retro_windows', 'seized_retro_windows']) {
    var cols = (((await D.prepare('PRAGMA table_info(' + tw + ')').all()).results) || []).map(function (c) { return c.name; }),
      ws = ((await D.prepare('SELECT department_id d,window_id w,sequence q,hijri_year y,hijri_month m,hijri_day dd,until_at u,closed_at c FROM ' + tw).all()).results) || [], upd = [], dup = [], maxq = {};
    ws.forEach(function (r) { maxq[r.d] = Math.max(maxq[r.d] || 0, +r.q || 0); });
    ws.forEach(function (r) {
      if (r.y == null || calYearCal(+r.y) !== 'h') return;
      var s = calHtoGScope({ y: +r.y, m: +r.m, d: r.dd == null ? null : +r.dd }); if (!s) throw new Error('db-cal-unmapped: ' + tw + ' ' + r.w);
      upd.push([r.d, r.w, s[0].y, s[0].m, s[0].d]);
      if (s.length > 1 && r.c == null && +r.u > now) s.slice(1).forEach(function (x, j) { dup.push([r.d, r.w, r.w + '~g' + (j + 2), (maxq[r.d] = maxq[r.d] + 1), x.y, x.m]); });
    });
    rsChunks(upd).forEach(function (part) { after.push(D.prepare('UPDATE ' + tw + " SET greg_year=json_extract(j.value,'$[2]'),greg_month=json_extract(j.value,'$[3]'),greg_day=json_extract(j.value,'$[4]') FROM json_each(?1) j WHERE " + tw + ".department_id=json_extract(j.value,'$[0]') AND " + tw + ".window_id=json_extract(j.value,'$[1]')").bind(JSON.stringify(part))); });
    var gc = cols.map(function (c) { return c.replace(/^hijri_/, 'greg_'); }), pick = gc.map(function (c) { return c === 'window_id' ? '?3' : c === 'sequence' ? '?4' : c === 'greg_year' ? '?5' : c === 'greg_month' ? '?6' : c === 'greg_day' ? 'NULL' : c; });
    dup.forEach(function (x) { after.push(D.prepare('INSERT INTO ' + tw + '(' + gc.join(',') + ') SELECT ' + pick.join(',') + ' FROM ' + tw + ' WHERE department_id=?1 AND window_id=?2').bind(x[0], x[1], x[2], x[3], x[4], x[5])); });
  }
  /* ④ الرصد (KV): reports[].{y,m,d} · نوافذُه windows[].scope (ق7 كما فوق) */
  var kvs = kvJoin(((await D.prepare("SELECT k,seq,v FROM kv WHERE EXISTS(SELECT 1 FROM json_each(?1) j WHERE kv.k GLOB '*' || j.value) ORDER BY k,seq").bind(JSON.stringify(Object.keys(CAL_CONV_SLOTS).filter(function (r) { return calConvKind(r) === 'retroDoc'; }))).all()).results) || []);
  Object.keys(kvs).forEach(function (k) {
    var v = parseJson(kvs[k], null); if (!calConvRasd(v, now, k)) return;
    after.push.apply(after, kvPutStmts(env, 'kv', k, JSON.stringify(v)));
    after.push(D.prepare('INSERT INTO revs(k,rev) VALUES(?1,1) ON CONFLICT(k) DO UPDATE SET rev=rev+1').bind(k));
  });
  /* ⑤ notification_dedup: مفاتيحُ آخر سبعة أيام تأخذ نسخةً ميلادية (الأصلُ يبقى وتُسقطه مدةُ الحفظ) — فلا يتكرر تنبيهٌ يومَ الترحيل */
  var dd = ((await D.prepare('SELECT scope,once_key,created_at,message_id FROM notification_dedup WHERE created_at>?1').bind(now - 7 * 864e5).all()).results) || [], drows2 = [];
  dd.forEach(function (r) { calConvOnce(String(r.once_key)).forEach(function (k2) { drows2.push([r.scope, k2, r.created_at, r.message_id]); }); });
  after.push.apply(after, calRowsInsert(D, 'notification_dedup', ['scope', 'once_key', 'created_at', 'message_id'], drows2, 'INSERT OR IGNORE'));
  /* ⑥ب العلامة cal_pend {إدارة: [موارد]} (كما في ملف 0014) — تُعاد هنا في آخر الدفعة: على قاعدةٍ أقدم من 10 تُكتب صفوفُ 0010 التشغيلية بعد عبارات 0014 */
  after.push(D.prepare("INSERT INTO meta (k, v) SELECT 'cal_pend', x FROM (SELECT json_group_object(d, json(r)) x, COUNT(*) n FROM (SELECT department_id d, json_group_array(resource) r FROM (SELECT DISTINCT department_id, resource FROM ops_nodes WHERE resource IN (SELECT value FROM json_each(?1)) ORDER BY 1, 2) GROUP BY department_id)) WHERE n > 0 ON CONFLICT(k) DO UPDATE SET v = excluded.v").bind(JSON.stringify(Object.keys(CAL_CONV_SLOTS).filter(calConvIs))));
  /* ⑥ اليومُ المرجعي T للتحويل الكسول (ثابتٌ لكل فترة، فالقفلُ كما كان لحظةَ النشر) */
  after.push(D.prepare("INSERT INTO meta(k,v) SELECT '" + CAL_MIG_TKEY + "',?1 WHERE EXISTS(SELECT 1 FROM meta WHERE k='cal_pend') ON CONFLICT(k) DO NOTHING").bind(T));
  return { before: before, after: after };
}
/* قراءةُ الصفوف المخزَّنة بمخطّطٍ «موسَّع»: أنماطُ مفاتيح التاريخ في المخطّط الحالي قد ضُيّقت إلى ISO (cal-ops) — والصفوفُ الهجرية تُفكّ بنسخةٍ من التعريفات
   نفسِها (الجداولُ نفسُها) أنماطُ تاريخها تقبل الصيغتين. للقراءة وحدها؛ الكتابةُ بالمخطّط الحالي. */
var CAL_WIDE = null;
function calWidePattern(p) {
  var re; try { re = new RegExp(p); } catch (e) { return p; }
  if (re.test('zz') || re.test('')) return p;
  if (re.test('m:2026-11')) return '^m:\\d{4}-\\d{1,2}$';
  if (re.test('2026-11-24-r')) return '^\\d{4}-\\d{1,2}-\\d{1,2}(?:-.+)?$';
  if (re.test('2026-11-24') && re.test('2026-11')) return '^\\d{4}-\\d{1,2}(?:-\\d{1,2})?$';
  if (re.test('2026-11-24')) return '^\\d{4}-\\d{1,2}-\\d{1,2}$';
  if (re.test('2026-11')) return '^\\d{4}-\\d{1,2}$';
  return p;
}
function calWideRegistry() {
  if (CAL_WIDE) return CAL_WIDE;
  var memo = new Map();
  function clone(n) {
    if (!n || typeof n !== 'object') return n;
    if (memo.has(n)) return memo.get(n);
    var o = Array.isArray(n) ? [] : {}; memo.set(n, o);
    Object.keys(n).forEach(function (k) { o[k] = k === 'pattern' && typeof n[k] === 'string' ? calWidePattern(n[k]) : clone(n[k]); });
    return o;
  }
  var defs = opDefinitions().map(function (d) { return Object.assign({}, d, { schema: clone(d.schema) }); }), all = ocPrepare(defs, OC_TABLE_NAMES), out = Object.create(null);
  defs.forEach(function (d) { out[d.resource] = ocForResource(all, d.resource); });
  CAL_WIDE = out;
  return out;
}
/* صفوفُ مداياتٍ من row_key لموردٍ واحد ⇐ القيمةُ (partial: الرأسُ وما طُلب من الأعضاء) */
async function calMigRead(env, dept, resource, ranges, partial) {
  var prepared = calWideRegistry()[resource], tables = ocPhysicalTables(prepared), physical = {}, names = Object.keys(tables), st = [];
  names.forEach(function (t) {
    physical[t] = [];
    for (var c = 0; c < ranges.length; c += 24) st.push({ t: t, s: env.DB.prepare('SELECT ' + tables[t].map(function (c2) { return 'x.' + c2; }).join(',') + ' FROM json_each(?3) q CROSS JOIN ' + t + " x ON x.department_id=?1 AND x.resource=?2 AND x.row_key>=json_extract(q.value,'$[0]') AND x.row_key<json_extract(q.value,'$[1]')").bind(dept, resource, JSON.stringify(ranges.slice(c, c + 24))) });
  });
  for (var i = 0; i < st.length; i += 40) {
    var part = st.slice(i, i + 40), got = await env.DB.batch(part.map(function (x) { return x.s; }));
    part.forEach(function (x, j) { (got[j].results || []).forEach(function (r) { physical[x.t].push(r); }); });
  }
  var read = ocFromPhysicalRead(prepared, dept, resource, physical, partial ? { partial: 1 } : { trust: 1 });
  return read.projection.present ? read.projection.value : undefined;
}
function calMigMemberRanges(container, names) { var out = []; names.forEach(function (p) { var r = container + '/e:' + encodeURIComponent(p); out.push([r, r + '\u0001'], [r + '/', r + '0']); }); return out; }
function calMigHeadRanges(container) { var e = container + '/e'; return [['', e + ':'], [e + ';', '\uffff']]; }
/* حذفُ مدى (فصلُ الآباء ثم الحذف: كياناتُ العقد تتبعها بقيدها) — موسومٌ بمفتاح المورد (dbGuardRevised) */
function calMigDrop(env, dept, resource, ranges) {
  var K = 'bsdept:' + dept + ':' + resource, out = [];
  ranges.forEach(function (r) {
    out.push(opTag(env.DB.prepare('UPDATE ops_nodes SET parent_key=NULL WHERE department_id=?1 AND resource=?2 AND row_key>=?3 AND row_key<?4').bind(dept, resource, r[0], r[1]), [K]));
    Object.keys(ocPhysicalTables(opPrepared(resource))).reverse().forEach(function (t) { out.push(opTag(env.DB.prepare('DELETE FROM ' + t + ' WHERE department_id=?1 AND resource=?2 AND row_key>=?3 AND row_key<?4').bind(dept, resource, r[0], r[1]), [K])); });
  });
  return out;
}
/* صفوفُ عضوٍ واحد بالمرمِّز الحالي: يُرمَّز داخل وثيقةٍ تحمله وحده ثم يُترك ما فوقه؛ موضعُه في حاويته pos */
function calMigMemberRows(env, dept, resource, container, wrap, name, pos) {
  var prepared = opPrepared(resource), dom = ocConvert(prepared, dept, resource, wrap, true), rows = ocPhysicalRows(prepared, dom), key = container + '/e:' + encodeURIComponent(name), K = 'bsdept:' + dept + ':' + resource, out = [];
  Object.keys(ocPhysicalTables(prepared)).forEach(function (t) {
    var list = (rows[t] || []).filter(function (r) { return r.row_key === key || r.row_key.indexOf(key + '/') === 0; });
    list.forEach(function (r) { if (r.row_key === key && t === 'ops_nodes') r.position = pos; });
    if (list.length) opUpsertRows(env, { table: t, columns: ocPhysicalTables(prepared)[t] }, list).forEach(function (s) { out.push(opTag(s, [K])); });
  });
  return out;
}
function calMigAllRows(env, dept, resource, doc) {
  var prepared = opPrepared(resource), rows = ocPhysicalRows(prepared, ocConvert(prepared, dept, resource, doc, true)), K = 'bsdept:' + dept + ':' + resource, out = [];
  Object.keys(ocPhysicalTables(prepared)).forEach(function (t) { opUpsertRows(env, { table: t, columns: ocPhysicalTables(prepared)[t] }, rows[t] || []).forEach(function (s) { out.push(opTag(s, [K])); }); });
  return { st: out, rows: rows };
}
function calMigRevs(env, keys) {
  return [env.DB.prepare("INSERT INTO meta(k,v) VALUES('rev',CAST(MAX(COALESCE((SELECT CAST(v AS INTEGER) FROM meta WHERE k='rev'),0),COALESCE((SELECT MAX(rev) FROM revs),0))+1 AS TEXT)) ON CONFLICT(k) DO UPDATE SET v=excluded.v"),
    env.DB.prepare("INSERT INTO revs(k,rev) SELECT j.value,CAST((SELECT v FROM meta WHERE k='rev') AS INTEGER) FROM json_each(?1) j WHERE 1 ON CONFLICT(k) DO UPDATE SET rev=excluded.rev").bind(JSON.stringify(keys))];
}
async function calMigRev(env, K) { var r = await env.DB.prepare('SELECT rev FROM revs WHERE k=?1').bind(K).first(); return rsNat((r && r.rev) || 0); }
/* ── التحويلُ الكسول (REVIEW 33): الفترةُ القديمة تُحوَّل بالمحوِّل الواحد عند أول قراءةٍ أو كتابةٍ لها، ذرّياً بنسختها، ثم تُعلَّم فلا يُعاد ──
   العلامة: meta.cal_pend = { <إدارة>: [مواردُ ما زال فيها عضوٌ هجري] } — يكتبها 0014 عند التهيئة، وتُقرأ في لقطة مقدّمة الطلب (052 PRE_META_BASE) فلا رحلةَ
   زائدة؛ وحين تفرغ يُحفظ ذلك في الـisolate فلا يُفحص بعدها. الموردُ يخرج من القائمة في الدفعة التي تحوّل آخرَ عضوٍ هجريٍّ فيه.
   الوحدة الذرّية (دفعةٌ واحدة بحارس نسخة المورد K — كاتبٌ متزامن ⇐ KIVO_REV_CONFLICT فيُعاد مرةً على الحالة الجديدة، فلا يُحوَّل شيءٌ مرتين):
     · خريطةُ الأيام (الجولات وأرشيفُها · التقرير · المهام): علاماتُ m: كلُّها معاً (ق3 يحتاج الشهرين) ثم الأيامُ المطلوبة، كلُّ يومٍ في موضعه نفسِه؛
     · الأشهرُ (الجدول ق4 · الخطة ق5): الشهرُ الميلادي من مصادره، والمصدرُ الهجري يُحذف مع آخر شهرٍ ميلاديٍّ يحتاجه؛
     · الصغيرة (الأقفال · dayshift · dayfocus · الجدولُ القديم): الوثيقةُ كلُّها.
   T = meta.cal_mig_t (يومُ النشر): القفلُ كما كان لحظةَ الترحيل وإن حُوِّلت الفترةُ بعد أشهر. ما لا يتمّ في ميزانية الطلب ⇐ 503 calendar-preparing بتقدّمه
   (الصفحةُ تعرض «تُجهَّز البيانات» وتعيد الطلب) — لا قراءةَ صامتةٌ ولا فشل. */
var CAL_PEND = 'cal_pend', CAL_LAZY_MS = 10000, CAL_LAZY_DONE = false;
/* المراجعة: K وحده (dbGuardRevised) — لا K@* ولا فترة: المحتوى نفسُه بأسمائه الميلادية، فحفظُ فترةٍ بنسختها المقروءة لا يتعارض مع تحويلٍ سبقه */
async function calCommit(env, guards, st, keys) { var all = guards.concat(st, calMigRevs(env, keys)); opSaveBudget(all); await env.DB.batch(all); }
function calPendDrop(env, dept, res) {
  return env.DB.prepare("UPDATE meta SET v=(SELECT COALESCE(json_group_object(t.key,json(CASE WHEN t.key=?1 THEN (SELECT json_group_array(x.value) FROM json_each(t.value) x WHERE x.value<>?2) ELSE t.value END)),'{}') FROM json_each(meta.v) t WHERE NOT (t.key=?1 AND json_array_length(t.value)=1 AND json_extract(t.value,'$[0]')=?2)) WHERE k='" + CAL_PEND + "'").bind(dept, res);
}
function calPrepError(done, total) { var e = rsError('calendar-preparing', 503); e.msg = 'تُجهَّز البيانات للتقويم الميلادي (' + done + ' من ' + total + '). تُعرض بعد لحظات.'; e.details = { done: done, total: total }; return e; }
async function calPend(env) {
  var P = env.__pre, v = P && P.live && P.meta && ocOwn(P.meta, CAL_PEND) ? P.meta[CAL_PEND] : ((await env.DB.prepare('SELECT v FROM meta WHERE k=?1').bind(CAL_PEND).first()) || {}).v;
  var o = parseJson(v, null); return isObj(o) ? o : {};
}
/* أعضاءُ حاويةٍ بمواضعها: صفوفُ العقد ومعها الحقولُ الثابتة القياسية (موضعُها عمودٌ في صفّ الجذر — كما 019g rsiMembers) */
async function calLayout(env, dept, R, container) {
  var spec = opPrepared(R).resources[R].spec, rows = (await env.DB.prepare('SELECT row_key k,member_key m,position p FROM ops_nodes WHERE department_id=?1 AND resource=?2 AND parent_key=?3').bind(dept, R, container).all()).results || [], out = [];
  rows.forEach(function (r) { if (typeof r.m === 'string') out.push({ m: r.m, p: r.p, rk: r.k }); });
  if (container === '$') for (var f of Object.keys(spec.fields)) {
    if (spec.fields[f].kind !== 'scalar') continue;
    var fs = spec.fieldSpecs[f], rk = fs === spec ? '$' : '$/p:' + spec.segments.indexOf(fs), c = ocField(f), q = await env.DB.prepare('SELECT ' + c + '_kind k,' + c + '_position p FROM ' + fs.entityTable + " WHERE department_id=?1 AND resource=?2 AND row_key=?3").bind(dept, R, rk).first();
    if (q && q.k) out.push({ m: f, p: q.p, sc: { t: fs.entityTable, rk: rk, c: c + '_position' } });
  }
  return out.sort(function (a, b) { return a.p - b.p; });
}
/* المواضعُ 0..n-1 بالترتيب المعطى لما بقي — عبارةٌ واحدة للعقد (json_each) وعبارةٌ لكل حقلٍ ثابتٍ تغيّر موضعُه */
function calRenum(env, dept, R, order) {
  var K = 'bsdept:' + dept + ':' + R, map = [], st = [];
  order.forEach(function (x, i) { if (x.g || x.p === i) return; if (x.sc) st.push(opTag(env.DB.prepare('UPDATE ' + x.sc.t + ' SET ' + x.sc.c + '=?4 WHERE department_id=?1 AND resource=?2 AND row_key=?3').bind(dept, R, x.sc.rk, i), [K])); else if (x.rk) map.push([x.rk, i]); });
  rsChunks(map).forEach(function (part) { st.push(opTag(env.DB.prepare("UPDATE ops_nodes SET position=(SELECT json_extract(j.value,'$[1]') FROM json_each(?3) j WHERE json_extract(j.value,'$[0]')=ops_nodes.row_key) WHERE department_id=?1 AND resource=?2 AND row_key IN (SELECT json_extract(value,'$[0]') FROM json_each(?3))").bind(dept, R, JSON.stringify(part)), [K])); });
  return st;
}
/* الجولات · التقرير · المهام. want(g) — هل اليومُ الميلادي مطلوب (null = كلُّها) */
async function calLazyDays(env, info, want, ctx, deadline) {
  var d = info.dept, R = info.resource, K = opKeyOf(info), lay = await calLayout(env, d, R, '$'), H = lay.filter(function (x) { return !x.sc && calKeyCal(x.m) === 'h'; });
  if (!H.length) { await env.DB.batch([calPendDrop(env, d, R)]); return; }
  var mk = H.filter(function (x) { return calGParse(x.m).kind === 'mctl'; }), days = H.filter(function (x) { return calGParse(x.m).kind === 'day'; }), gd = lay.filter(function (x) { var p = !x.sc && calGParse(x.m); return p && p.cal === 'g' && p.kind === 'day'; }).length, total = gd + days.length;   /* التقدّم: أيامُ المورد كلُّها، والمحوَّلُ منها */
  if (mk.length) {
    /* ق3: علاماتُ المورد كلُّها في دفعةٍ واحدة — تحلّ الميلاديةُ محلَّ أولى الهجرية في الترتيب، والمواضعُ تُعاد متصلة */
    var got = (await calMigRead(env, d, R, calMigHeadRanges('$').concat(calMigMemberRanges('$', mk.map(function (x) { return x.m; }))), true)) || {}, src = {};
    mk.forEach(function (x) { var p = calGParse(x.m); if (ocOwn(got, x.m)) src[p.y + '-' + p.m] = got[x.m]; });
    var G = calConvMarks(src, ctx, R), names = Object.keys(G), at = lay.indexOf(mk[0]), order = [], st = calMigDrop(env, d, R, calMigMemberRanges('$', mk.map(function (x) { return x.m; })));
    lay.forEach(function (x, i) { if (i === at) names.forEach(function (g) { order.push({ m: g, p: -1, g: 1 }); }); if (mk.indexOf(x) < 0) order.push(x); });
    var w = {}; names.forEach(function (g) { ocSet(w, g, G[g]); });
    order.forEach(function (x, i) { if (x.g) st = st.concat(calMigMemberRows(env, d, R, '$', w, x.m, i)); });
    st = st.concat(calRenum(env, d, R, order));
    st = st.concat(opSummaryStatements(env, info, names.map(function (g) { return { p: g, value: G[g] }; }).concat(mk.map(function (x) { return { p: x.m, value: undefined }; }))));
    if (!days.length) st.push(calPendDrop(env, d, R));
    await calCommit(env, [revGuard(env, K, await calMigRev(env, K))], st, [K]);
    return calLazyDays(env, info, want, ctx, deadline);
  }
  var todo = days.filter(function (x) { return !want || want(calConvDay(x.m, R + '/' + x.m)); });
  for (var i = 0; i < todo.length; i += 8) {
    if (Date.now() > deadline) throw calPrepError(gd + i, total);
    var part = todo.slice(i, i + 8), all = days.length - i - part.length === 0 && todo.length === days.length, st2 = [], sums = [], rd = (await calMigRead(env, d, R, calMigHeadRanges('$').concat(calMigMemberRanges('$', part.map(function (x) { return x.m; }))), true)) || {};
    part.forEach(function (x) {
      if (!ocOwn(rd, x.m)) throw calConvError('calendar-read', R + '/' + x.m);
      var g = calConvDay(x.m, R + '/' + x.m), v = calConvDayValue(R, rd[x.m], ctx, R + '/' + x.m), w2 = {}; ocSet(w2, g, v);
      st2 = st2.concat(calMigDrop(env, d, R, calMigMemberRanges('$', [x.m])), calMigMemberRows(env, d, R, '$', w2, g, x.p));   /* اليومُ في موضعه نفسِه */
      sums.push({ p: g, value: v }, { p: x.m, value: undefined }); ctx.rep.days++;
    });
    st2 = st2.concat(opSummaryStatements(env, info, sums));
    if (all) st2.push(calPendDrop(env, d, R));
    await calCommit(env, [revGuard(env, K, await calMigRev(env, K))], st2, [K]);
  }
}
/* الجدول (ق4) والخطة (ق5): الشهرُ الميلادي من مصادره الهجرية؛ المصدرُ يُحذف مع آخر شهرٍ ميلاديٍّ يحتاجه، والمواضعُ متصلة بترتيب الأشهر */
async function calLazyMonths(env, info, want, ctx, deadline) {
  var d = info.dept, R = info.resource, K = opKeyOf(info), fld = (opPeriodDef(info) || {}).field, plan = !!fld, C = plan ? '$/f:' + encodeURIComponent(fld) : '$';
  var lay = await calLayout(env, d, R, C), H = lay.filter(function (x) { return calKeyCal(x.m) === 'h'; }), byH = {}, months = {};
  var delH = plan ? (await calLayout(env, d, R, '$/f:delMonths')).filter(function (x) { return calKeyCal(x.m) === 'h'; }) : [];
  if (!H.length && !delH.length) { await env.DB.batch([calPendDrop(env, d, R)]); return; }
  H.forEach(function (x) { var p = calGParse(x.m); byH[p.y + '-' + p.m] = x; calGMonthsOfH(p.y, p.m).forEach(function (g) { months[g.g] = 1; }); });
  var G = Object.keys(months).sort(), have = {}, total = G.length;
  lay.forEach(function (x) { have[x.m] = 1; });
  /* المصدرُ الهجري h يبقى ما دام شهرٌ ميلاديٌّ يحتاجه لم يُكتب */
  var needs = function (h, done) { var p = calGParse(h.m); return calGMonthsOfH(p.y, p.m).some(function (g) { return !done[g.g]; }); };
  for (var gi = 0; gi < G.length; gi++) {
    var gm = G[gi]; if (have[gm] || (want && !want(gm))) continue;
    if (Date.now() > deadline) throw calPrepError(gi, total);
    var srcN = calHMonthsOfG(gm).filter(function (x) { return ocOwn(byH, x.h); });
    var got = (await calMigRead(env, d, R, calMigHeadRanges(C).concat(calMigMemberRanges(C, srcN.map(function (x) { return byH[x.h].m; }))), true)) || {}, box = plan ? (got[fld] || {}) : got, src = {};
    srcN.forEach(function (x) { if (ocOwn(box, byH[x.h].m)) src[x.h] = box[byH[x.h].m]; });
    var v = plan ? calConvPlanMonth(gm, src, ctx) : calConvStaffMonth(gm, src, ctx, R + '/' + gm);
    have[gm] = 1;
    var gone = srcN.map(function (x) { return byH[x.h]; }).filter(function (h) { return !needs(h, have); }), cur = await calLayout(env, d, R, C);
    /* الترتيب: ما ليس شهراً كما هو · ثم الأشهرُ الميلادية مرتّبةً (القائمةُ والجديد) · ثم الهجريةُ الباقية بترتيبها — والمصادرُ المنتهيةُ تُحذف */
    var st = [], isG = function (x) { return calKeyCal(x.m) === 'g'; }, isH = function (x) { return calKeyCal(x.m) === 'h'; };
    var gs = cur.filter(isG).concat(v !== undefined ? [{ m: gm, g: 1 }] : []).sort(function (a, b) { return a.m < b.m ? -1 : a.m > b.m ? 1 : 0; });
    var order = cur.filter(function (x) { return !isG(x) && !isH(x); }).concat(gs, cur.filter(function (x) { return isH(x) && gone.indexOf(x) < 0 && !gone.some(function (h) { return h.m === x.m; }); }));
    if (gone.length) st = st.concat(calMigDrop(env, d, R, calMigMemberRanges(C, gone.map(function (h) { return h.m; }))));
    if (v !== undefined) {
      var w = {}, inner = {}; ocSet(inner, gm, v);
      if (plan) { Object.keys(got).forEach(function (k) { if (k !== fld) ocSet(w, k, got[k]); }); ocSet(w, fld, inner); } else w = inner;
      st = st.concat(calMigMemberRows(env, d, R, C, w, gm, order.findIndex(function (x) { return x.g; })), opSummaryStatements(env, info, [{ p: gm, value: v }]));
      ctx.rep.months++;
    }
    st = st.concat(calRenum(env, d, R, order), gone.length ? opSummaryStatements(env, info, gone.map(function (h) { return { p: h.m, value: undefined }; })) : []);
    var left = H.filter(function (h) { return needs(h, have); }).length;
    if (!left && !delH.length) st.push(calPendDrop(env, d, R));
    await calCommit(env, [revGuard(env, K, await calMigRev(env, K))], st, [K]);
  }
  if (plan && delH.length && (!want || !H.some(function (h) { return needs(h, have); }))) {
    /* delMonths (الرأس): الشهرُ الميلادي محذوفٌ إن حُذفت مصادرُه كلُّها (ق5) */
    var dm = (await calMigRead(env, d, R, calMigHeadRanges(C), true)) || {}, del = isObj(dm.delMonths) ? dm.delMonths : {}, conv = calConvPlanMap(del, ctx, true, 'plan/delMonths');
    var keep = (await calLayout(env, d, R, '$/f:delMonths')).filter(function (x) { return calKeyCal(x.m) !== 'h'; }), st3 = calMigDrop(env, d, R, calMigMemberRanges('$/f:delMonths', delH.map(function (x) { return x.m; }))), n = keep.length;
    st3 = st3.concat(calRenum(env, d, R, keep));
    Object.keys(conv).forEach(function (k) { if (ocOwn(del, k)) return; var w2 = {}, d2 = {}; Object.keys(dm).forEach(function (f) { if (f !== 'delMonths' && f !== fld) ocSet(w2, f, dm[f]); }); ocSet(d2, k, conv[k]); ocSet(w2, fld, {}); ocSet(w2, 'delMonths', d2); st3 = st3.concat(calMigMemberRows(env, d, R, '$/f:delMonths', w2, k, n++)); });
    if (!H.some(function (h) { return needs(h, have); })) st3.push(calPendDrop(env, d, R));
    await calCommit(env, [revGuard(env, K, await calMigRev(env, K))], st3, [K]);
  }
}
async function calLazySmall(env, info, ctx) {
  var d = info.dept, R = info.resource, K = opKeyOf(info), doc = await calMigRead(env, d, R, [['', '￿']], false), next = doc === undefined ? doc : calConvDoc(R, doc, ctx);
  var st = JSON.stringify(next) === JSON.stringify(doc) ? [] : calMigDrop(env, d, R, [['$/', '$0']]).concat(calMigAllRows(env, d, R, next).st);
  st.push(calPendDrop(env, d, R));
  await calCommit(env, [revGuard(env, K, await calMigRev(env, K))], st, [K]);
}
/* نقطةُ الدخول الواحدة (019r: قبل قراءة الصفوف في opLoadMany وقبل جرد الأعضاء في opReadOnce) — keys مفاتيحُ الموارد · want: { <مفتاح>: [فترات/مديات ميلادية] | null } */
async function calLazyEnsure(env, keys, want, opts) {
  if (CAL_LAZY_DONE) return 0;
  var pend = await calPend(env); if (!Object.keys(pend).length) { CAL_LAZY_DONE = true; return 0; }
  var Trow = await env.DB.prepare("SELECT v FROM meta WHERE k='" + CAL_MIG_TKEY + "'").first(), ctx = { T: (Trow && Trow.v) || calToday(Date.now()).k, rep: calConvRep() }, H = env.__calReq || {}, deadline = H.dl || (H.dl = Date.now() + ((opts && opts.budget) || +env.KIVO_CAL_LAZY_MS || CAL_LAZY_MS)), n = 0;   /* REVIEW 45: مهلةٌ واحدة للطلب كلِّه (env.__calReq، 063) · فترةُ الرأس '' لا تطابق كلَّ يوم (كانت تحوّل المورد كلَّه في كل قراءةٍ معها الرأس) */   /* KIVO_CAL_LAZY_MS: ميزانيةُ المختبر وحده */
  for (var k of Array.from(new Set(keys))) {
    var info = null; try { info = opInfo(k); } catch (e) { info = null; }
    if (!info || (pend[info.dept] || []).indexOf(info.resource) < 0) continue;
    var w = want && want[k], f = w && w.length ? function (g) { return w.some(function (p) { return p && (p === g || g.indexOf(p) === 0); }); } : null;
    for (var tries = 0; ; tries++) {
      try {
        var kd = calConvKind(info.resource);
        if (kd === 'dayMap' || kd === 'dayMapRec') await calLazyDays(env, info, f, ctx, deadline);
        else if (kd === 'monthStaff' && opPeriodDef(info) || kd === 'monthPlan') await calLazyMonths(env, info, f, ctx, deadline);
        else await calLazySmall(env, info, ctx);
        break;
      } catch (e) { if (/KIVO_REV_CONFLICT/.test(String(e && e.message || e))) { if (tries < 2) continue; throw calPrepError(0, 0); } throw e; }   /* كاتبٌ آخر سبق: يُعاد على حالته فلا يُحوَّل مرتين */
    }
    n++;
  }
  if (n && (ctx.rep.conflicts.length || ctx.rep.recurring.length || ctx.rep.major.length)) {
    /* ملخّصُ ما حُوِّل (ق4 · ق5 · ق6) لمدير الإدارة — يُضاف إلى ما سبق */
    var d0 = opInfo(keys[0]).dept, row = await env.DB.prepare('SELECT v FROM meta WHERE k=?1').bind(CAL_MIG_SUM + d0).first(), sum = calConvMergeRep(Object.assign(calConvRep(), parseJson(row && row.v, {}) || {}), ctx.rep);
    sum.conflicts = sum.conflicts.slice(-200); sum.recurring = sum.recurring.slice(-500);
    await env.DB.batch([env.DB.prepare('INSERT INTO meta(k,v) VALUES(?1,?2) ON CONFLICT(k) DO UPDATE SET v=excluded.v').bind(CAL_MIG_SUM + d0, JSON.stringify(sum))]);
  }
  return n;
}
/* المسارُ الخلفي للمدير (اختياري — 019w periods-migrate نفسُه): كلُّ موارد الإدارة المعلَّقة بالمحوِّل نفسِه وبميزانيةٍ وتقدّم ⇒ { left } */
async function calLazyDept(env, dept, budget) {
  var pend = await calPend(env), list = (pend[dept] || []).map(function (r) { return 'bsdept:' + dept + ':' + r; });
  if (!list.length) return { left: 0 };
  try { await calLazyEnsure(env, list, null, { budget: budget }); } catch (e) { if (!(e && e.rs === 'calendar-preparing')) throw e; return { left: ((await calPend(env))[dept] || []).length, progress: e.details }; }
  return { left: ((await calPend(env))[dept] || []).length };
}
/* ما تطلبه القراءةُ أو الكتابة من فترات (ميلادية) لكل مفتاح — null = الموردُ كلُّه */
function calWantScopes(scopes) { var out = {}; Object.keys(scopes || {}).forEach(function (k) { var s = scopes[k]; if (s && Array.isArray(s.periods)) out[k] = s.periods.slice(); }); return out; }
function calWantRead(groups, rangeOf) { var out = {}; Object.keys(groups).forEach(function (K) { var g = groups[K]; if (!g.full) out[K] = Array.from(g.periods).concat(rangeOf[K] || []); }); return out; }
