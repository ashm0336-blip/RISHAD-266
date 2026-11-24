/* ══ V7 · 53 تقويم: الترحيل 0014 (التصميم §3 · §4 · ق2–ق12) — منسِّقٌ رقيق فوق المحوِّل الواحد (019v: calConv* فوق calHtoG*، ويستعمله الاستيرادُ نفسُه — REVIEW 28).
   ① calMigPrepare(env) — خطةُ بيانات المرحلة ١ (052 migrateDb): جدولُ المطابقة · أقفالُ الإحصائيات (ق3) · نوافذُ الاستدراك (ق7) · الجائزة · الرصد · dedup.
   ② calMigRoute — المرحلة ٢: POST /api/operations/calendar-migrate {dept|'all'} (مديرُ المنصة) — إدارةً إدارة، دفعاتٌ ذرّية صغيرة، قابلةٌ للاستئناف من حالتها:
      قراءةُ الصفوف الهجرية بمخطّطٍ موسَّع · calConvDoc وأجزاؤه للقيم · إعادةُ الترميز بالمرمِّز الحالي في مواضعها.
   ③ calLegacyEnv — خطواتُ 0004/0006/0008/0009 القديمة تكتب hijri_* حتى يحوّلها 0014 (قرارُ الاقتران في cal_api.md). ══ */
var CAL_MIG_PENDING = 'cal_ops_pending', CAL_MIG_TKEY = 'cal_mig_t', CAL_MIG_SUM = 'cal_migration_summary:';
function calMigPendingOf(row) { var v = parseJson(row && row.c, []); return Array.isArray(v) ? v.filter(function (d) { return typeof d === 'string'; }) : []; }
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
function calMigChunks(rows) { return rsChunks(rows); }
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
  calMigChunks(rows).forEach(function (part) { before.push(D.prepare("INSERT INTO cal_hg_days(hy,hm,hd,gy,gm,gd) SELECT json_extract(j.value,'$[0]'),json_extract(j.value,'$[1]'),json_extract(j.value,'$[2]'),json_extract(j.value,'$[3]'),json_extract(j.value,'$[4]'),json_extract(j.value,'$[5]') FROM json_each(?1) j WHERE 1 ON CONFLICT DO NOTHING").bind(JSON.stringify(part))); });
  /* ①ب تاريخُ الجائزة نصٌّ (YYYY-MM-DD أو y-m-d كما كتبه العميل) ⇐ ميلاديٌّ مبطَّن */
  var aw = [];
  (((await D.prepare('SELECT department_id d,record_id r,hijri_date x FROM award_records WHERE hijri_date IS NOT NULL').all()).results) || []).forEach(function (r) {
    if (calKeyCal(r.x) !== 'h') return; var g = calHtoGDay(String(r.x)); if (!g) throw new Error('db-cal-unmapped: award_records ' + r.r + ' ' + r.x); aw.push([r.d, r.r, g]);
  });
  calMigChunks(aw).forEach(function (part) { after.push(D.prepare("UPDATE award_records SET greg_date=json_extract(j.value,'$[2]') FROM json_each(?1) j WHERE award_records.department_id=json_extract(j.value,'$[0]') AND award_records.record_id=json_extract(j.value,'$[1]')").bind(JSON.stringify(part))); });
  /* ② أقفالُ الإحصائيات (ق3 «السلوكُ اليومي المطابق»): لكل موقعٍ سجلُّ الشهر الهجري {ap · mo · dopen · dshut} ⇐ سجلاتُ الأشهر الميلادية */
  var ml = ((await D.prepare('SELECT site,hijri_year y,hijri_month m,approved a,reopened r,legacy_boolean l FROM daily_stats_month_locks').all()).results) || [],
    dl = ((await D.prepare('SELECT site,hijri_year y,hijri_month m,hijri_day d,is_open o,is_shut s FROM daily_stats_day_locks').all()).results) || [];
  if (ml.length) {
    var bySite = {}, legacy = {}, mrows = [], drows = [];
    ml.forEach(function (r) { var o = (bySite[r.site] = bySite[r.site] || {})[r.y + '-' + r.m] = {}; if (r.a) o.ap = 1; if (r.r) o.mo = 1; legacy[r.site + '|' + r.y + '-' + r.m] = !!r.l; });
    dl.forEach(function (r) { var o = ((bySite[r.site] = bySite[r.site] || {})[r.y + '-' + r.m] = (bySite[r.site] || {})[r.y + '-' + r.m] || {}); if (r.o) (o.dopen = o.dopen || {})[r.d] = 1; if (r.s) (o.dshut = o.dshut || {})[r.d] = 1; });
    Object.keys(bySite).forEach(function (site) {
      var src = bySite[site], months = {};
      Object.keys(src).forEach(function (h) { var p = h.split('-'); calGMonthsOfH(+p[0], +p[1]).forEach(function (x) { months[x.g] = 1; }); });
      Object.keys(months).sort().forEach(function (gm) {
        var r = calMonthRule(gm, src, T), G = calGParse(gm); if (!r.ok) throw new Error('db-cal-rule: daily_stats ' + site + ' ' + gm);
        if (!r.rec) return;
        var L = calHMonthsOfG(gm), lg = !!r.rec.ap && L.every(function (x) { return legacy[site + '|' + x.h]; }), days = {};
        mrows.push([site, G.y, G.m, r.rec.ap ? 1 : 0, r.rec.mo ? 1 : 0, lg ? 1 : 0]);
        Object.keys(r.rec.dopen || {}).concat(Object.keys(r.rec.dshut || {})).forEach(function (d) { days[d] = 1; });
        Object.keys(days).forEach(function (d) { drows.push([site, G.y, G.m, +d, (r.rec.dopen || {})[d] ? 1 : 0, (r.rec.dshut || {})[d] ? 1 : 0]); });
      });
    });
    after.push(D.prepare('DELETE FROM daily_stats_day_locks'), D.prepare('DELETE FROM daily_stats_month_locks'));
    calMigChunks(mrows).forEach(function (part) { after.push(D.prepare("INSERT INTO daily_stats_month_locks(site,greg_year,greg_month,approved,reopened,legacy_boolean) SELECT json_extract(j.value,'$[0]'),json_extract(j.value,'$[1]'),json_extract(j.value,'$[2]'),json_extract(j.value,'$[3]'),json_extract(j.value,'$[4]'),json_extract(j.value,'$[5]') FROM json_each(?1) j").bind(JSON.stringify(part))); });
    calMigChunks(drows).forEach(function (part) { after.push(D.prepare("INSERT INTO daily_stats_day_locks(site,greg_year,greg_month,greg_day,is_open,is_shut) SELECT json_extract(j.value,'$[0]'),json_extract(j.value,'$[1]'),json_extract(j.value,'$[2]'),json_extract(j.value,'$[3]'),json_extract(j.value,'$[4]'),json_extract(j.value,'$[5]') FROM json_each(?1) j").bind(JSON.stringify(part))); });
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
    calMigChunks(upd).forEach(function (part) { after.push(D.prepare('UPDATE ' + tw + " SET greg_year=json_extract(j.value,'$[2]'),greg_month=json_extract(j.value,'$[3]'),greg_day=json_extract(j.value,'$[4]') FROM json_each(?1) j WHERE " + tw + ".department_id=json_extract(j.value,'$[0]') AND " + tw + ".window_id=json_extract(j.value,'$[1]')").bind(JSON.stringify(part))); });
    var gc = cols.map(function (c) { return c.replace(/^hijri_/, 'greg_'); }), pick = gc.map(function (c) { return c === 'window_id' ? '?3' : c === 'sequence' ? '?4' : c === 'greg_year' ? '?5' : c === 'greg_month' ? '?6' : c === 'greg_day' ? 'NULL' : c; });
    dup.forEach(function (x) { after.push(D.prepare('INSERT INTO ' + tw + '(' + gc.join(',') + ') SELECT ' + pick.join(',') + ' FROM ' + tw + ' WHERE department_id=?1 AND window_id=?2').bind(x[0], x[1], x[2], x[3], x[4], x[5])); });
  }
  /* ④ الرصد (KV): reports[].{y,m,d} · نوافذُه windows[].scope (ق7 كما فوق) */
  var kvs = kvJoin(((await D.prepare("SELECT k,seq,v FROM kv WHERE k GLOB '*bassam_rasd_v1' OR k GLOB '*bassam_rasd_retro_v1' ORDER BY k,seq").all()).results) || []);
  Object.keys(kvs).forEach(function (k) {
    var v = parseJson(kvs[k], null); if (!calConvRasd(v, now, k)) return;
    after.push.apply(after, kvPutStmts(env, 'kv', k, JSON.stringify(v)));
    after.push(D.prepare('INSERT INTO revs(k,rev) VALUES(?1,1) ON CONFLICT(k) DO UPDATE SET rev=rev+1').bind(k));
  });
  /* ⑤ notification_dedup: مفاتيحُ آخر سبعة أيام تأخذ نسخةً ميلادية (الأصلُ يبقى وتُسقطه مدةُ الحفظ) — فلا يتكرر تنبيهٌ يومَ الترحيل */
  var dd = ((await D.prepare('SELECT scope,once_key,created_at,message_id FROM notification_dedup WHERE created_at>?1').bind(now - 7 * 864e5).all()).results) || [], drows2 = [];
  dd.forEach(function (r) { calConvOnce(String(r.once_key)).forEach(function (k2) { drows2.push([r.scope, k2, r.created_at, r.message_id]); }); });
  calMigChunks(drows2).forEach(function (part) { after.push(D.prepare("INSERT OR IGNORE INTO notification_dedup(scope,once_key,created_at,message_id) SELECT json_extract(j.value,'$[0]'),json_extract(j.value,'$[1]'),json_extract(j.value,'$[2]'),json_extract(j.value,'$[3]') FROM json_each(?1) j").bind(JSON.stringify(part))); });
  /* ⑥ب الإداراتُ المعلَّقة (كما في ملف 0014) — تُعاد هنا في آخر الدفعة: على قاعدةٍ أقدم من 10 تُكتب صفوفُ 0010 التشغيلية بعد عبارات 0014 */
  after.push(D.prepare("INSERT INTO meta (k, v) SELECT '" + CAL_MIG_PENDING + "', x FROM (SELECT json_group_array(d) x, COUNT(*) n FROM (SELECT DISTINCT department_id d FROM ops_nodes WHERE resource IN (SELECT value FROM json_each(?1)) ORDER BY d)) WHERE n > 0 ON CONFLICT(k) DO UPDATE SET v = excluded.v").bind(JSON.stringify(CAL_CONV_RES)));
  /* ⑥ اليومُ المرجعي T للمرحلة ٢ (ثابتٌ لكل إداراتها، فإعادتُها حتمية) */
  after.push(D.prepare("INSERT INTO meta(k,v) SELECT '" + CAL_MIG_TKEY + "',?1 WHERE EXISTS(SELECT 1 FROM meta WHERE k='" + CAL_MIG_PENDING + "') ON CONFLICT(k) DO NOTHING").bind(T));   /* لا إدارةَ معلَّقة ⇒ لا مرحلةَ ٢ ولا مفتاح */
  return { before: before, after: after };
}
/* ── المرحلة ٢ ── */
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
function calMigMembers(env, dept, resource, parent) {
  return env.DB.prepare('SELECT member_key m,position p FROM ops_nodes WHERE department_id=?1 AND resource=?2 AND parent_key=?3 ORDER BY position,member_key').bind(dept, resource, parent).all().then(function (r) { return (r.results || []).filter(function (x) { return typeof x.m === 'string'; }); });
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
function calMigHas(env, dept, resource) { return env.DB.prepare("SELECT COUNT(*) n FROM ops_nodes WHERE department_id=?1 AND resource=?2 AND row_key='$'").bind(dept, resource).first('n').then(Number); }
/* دفعةٌ واحدة: حارسُ النسخة لكل مورد (لا كاتبَ آخر — الإدارةُ معلَّقة) · الكتابات · المراجعات · الملخّص. فوق الميزانية ⇐ يُصغَّر الجزءُ (المستدعي) */
async function calMigCommit(env, guards, st, keys, sum, dept) {
  var all = guards.concat(st, calMigRevs(env, keys), [env.DB.prepare('INSERT INTO meta(k,v) VALUES(?1,?2) ON CONFLICT(k) DO UPDATE SET v=excluded.v').bind(CAL_MIG_SUM + dept, JSON.stringify(sum))]);
  opSaveBudget(all);
  await env.DB.batch(all);
}
function calMigSummary(sum, rep) {
  sum.days += rep.days; sum.months += rep.months;
  ['conflicts', 'recurring', 'plan', 'locks', 'extra'].forEach(function (f) { rep[f].forEach(function (x) { if (!sum[f].some(function (y) { return JSON.stringify(y) === JSON.stringify(x); })) sum[f].push(x); }); });
}
/* خرائطُ الأيام: الحيُّ + أرشيفُه (الجولات) أو موردٌ واحد. الأيامُ تُنقل أجزاءً (حذفُ الهجري وإدراجُ الميلادي في الدفعة نفسِها)، ثم العلاماتُ والرأسُ أخيراً.
   مواضعُ الحاوية: الحقولُ الثابتة ثم العلاماتُ ثم الأيام (كما يكتبها calConvDayMap للوثيقة كلِّها) — فالنتيجةُ حرفاً ما يكتبه الحفظُ الحي للوثيقة المحوَّلة. */
async function calMigDayMapPhase(env, dept, R, A, ctx, sum, budget) {
  var KR = 'bsdept:' + dept + ':' + R, KA = A ? 'bsdept:' + dept + ':' + A : null, Tp = calGParse(ctx.T), mem = {};
  for (var res of [R, A].filter(Boolean)) mem[res] = await calMigMembers(env, dept, res, '$');
  var fixedR = calConvFixed(R), hMarksR = mem[R].filter(function (x) { var p = calGParse(x.m); return p && p.kind === 'mctl' && p.cal === 'h'; }).map(function (x) { return x.m; });
  var hDays = [];
  [R, A].filter(Boolean).forEach(function (res) { mem[res].forEach(function (x) { var p = calGParse(x.m); if (p && p.kind === 'day' && p.cal === 'h') hDays.push({ res: res, m: x.m }); }); });
  var hMarksA = A ? mem[A].filter(function (x) { var p = calGParse(x.m); return p && p.kind === 'mctl' && p.cal === 'h'; }).map(function (x) { return x.m; }) : [];
  if (!hDays.length && !hMarksR.length && !hMarksA.length) return { done: 1 };
  /* العلاماتُ الهجرية كلُّها (صغيرة) ⇐ الميلادية — من الحيّ (والأرشيفُ لا يحمل علامات؛ إن حملها شيئاً فالحيُّ يغلب كما في الوثيقة المنطقية) */
  var headR = (await calMigRead(env, dept, R, calMigHeadRanges('$').concat(calMigMemberRanges('$', hMarksR)), true)) || {}, srcM = {};
  if (A && hMarksA.length) { var hA = (await calMigRead(env, dept, A, calMigHeadRanges('$').concat(calMigMemberRanges('$', hMarksA)), true)) || {}; hMarksA.forEach(function (k) { if (ocOwn(hA, k)) { var p = calGParse(k); srcM[p.y + '-' + p.m] = hA[k]; } }); }
  hMarksR.forEach(function (k) { if (ocOwn(headR, k)) { var p = calGParse(k); srcM[p.y + '-' + p.m] = headR[k]; } });
  var rep0 = calConvRep(), marksG = calConvMarks(srcM, { T: ctx.T, rep: rep0 }, R), head = {};
  Object.keys(headR).forEach(function (k) { if (ocOwn(fixedR, k)) ocSet(head, k, headR[k]); });
  var s = {}; s[R] = Object.keys(head).length + Object.keys(marksG).length;
  if (A) { var headA = (await calMigRead(env, dept, A, calMigHeadRanges('$'), true)) || {}; s[A] = Object.keys(headA).filter(function (k) { return ocOwn(calConvFixed(A), k); }).length; }
  var cnt = {}; [R, A].filter(Boolean).forEach(function (res) { cnt[res] = mem[res].filter(function (x) { var p = calGParse(x.m); return p && p.kind === 'day' && p.cal === 'g'; }).length; });
  var chunk = 8;
  for (var i = 0; i < hDays.length;) {
    if (Date.now() > budget) return { more: 1 };
    var part = hDays.slice(i, i + chunk), st = [], rep = calConvRep(), sums = {}, n2 = {}, keys = [KR + '@*', KR].concat(KA ? [KA + '@*', KA] : []), guards = [revGuard(env, KR, await calMigRev(env, KR))].concat(KA ? [revGuard(env, KA, await calMigRev(env, KA))] : []);
    Object.keys(cnt).forEach(function (k) { n2[k] = cnt[k]; });
    for (var res2 of [R, A].filter(Boolean)) {
      var names = part.filter(function (x) { return x.res === res2; }).map(function (x) { return x.m; }); if (!names.length) continue;
      var got = (await calMigRead(env, dept, res2, calMigHeadRanges('$').concat(calMigMemberRanges('$', names)), true)) || {};
      names.forEach(function (h) {
        if (!ocOwn(got, h)) throw calConvError('calendar-read', res2 + '/' + h);
        var g = calConvDay(h, res2 + '/' + h), v = calConvDayValue(R, got[h], { T: ctx.T, rep: rep }, res2 + '/' + h), G = calGParse(g), to = R;
        if (A && dailyArcClosed(marksG['m:' + calGYm(G.y, G.m)], G.y, G.m, Tp)) to = A;
        var w = {}; ocSet(w, g, v);
        st = st.concat(calMigDrop(env, dept, res2, calMigMemberRanges('$', [h])), calMigMemberRows(env, dept, to, '$', w, g, s[to] + n2[to]++));
        (sums[to] = sums[to] || []).push({ p: g, value: v }); rep.days++;
      });
    }
    Object.keys(sums).forEach(function (to) { st = st.concat(opSummaryStatements(env, opInfo('bsdept:' + dept + ':' + to), sums[to])); });
    var S2 = JSON.parse(JSON.stringify(sum)); calMigSummary(S2, rep);
    try { await calMigCommit(env, guards, st, keys, S2, dept); }
    catch (e) { if (e && e.rs === 'batch-budget' && chunk > 1) { chunk = Math.max(1, chunk >> 1); continue; } throw e; }
    calMigSummary(sum, rep); Object.keys(n2).forEach(function (k) { cnt[k] = n2[k]; }); i += part.length;
  }
  /* أخيراً: العلاماتُ الهجرية تُحذف، والرأسُ والعلاماتُ الميلادية بمواضعها 0..s-1 (صفُّ الجذر يُحدَّث في مكانه — لا حذفَ له فلا يتتابع الحذف) */
  var doc = {}; Object.keys(head).forEach(function (k) { ocSet(doc, k, head[k]); }); Object.keys(marksG).forEach(function (k) { ocSet(doc, k, marksG[k]); });
  var guards2 = [revGuard(env, KR, await calMigRev(env, KR))].concat(KA ? [revGuard(env, KA, await calMigRev(env, KA))] : []), fin = calMigAllRows(env, dept, R, doc);
  var st2 = calMigDrop(env, dept, R, calMigMemberRanges('$', hMarksR)).concat(A && hMarksA.length ? calMigDrop(env, dept, A, calMigMemberRanges('$', hMarksA)) : [], fin.st,
    opSummaryStatements(env, opInfo(KR), Object.keys(marksG).map(function (k) { return { p: k, value: marksG[k] }; })));
  [R, A].filter(Boolean).forEach(function (res) { st2.push(opTag(env.DB.prepare('DELETE FROM ops_period_summary WHERE department_id=?1 AND resource=?2 AND CAST(substr(replace(period,\'m:\',\'\'),1,4) AS INTEGER) BETWEEN 1300 AND 1599').bind(dept, res), ['bsdept:' + dept + ':' + res])); });
  calMigSummary(sum, rep0);
  await calMigCommit(env, guards2, st2, [KR + '@*', KR].concat(KA ? [KA + '@*', KA] : []), sum, dept);
  return { done: 1 };
}
/* أشهرٌ كفترات (الجدول v3 · months في الخطة): كلُّ شهرٍ ميلاديٍّ من مصادره الهجرية في دفعته، ثم تُحذف الأشهرُ الهجرية والرأس (delMonths) أخيراً */
async function calMigMonthsPhase(env, dept, R, ctx, sum, budget) {
  var K = 'bsdept:' + dept + ':' + R, plan = R === 'bassam_plan_v1', C = plan ? '$/f:months' : '$';
  var mem = await calMigMembers(env, dept, R, C), H = mem.filter(function (x) { var p = calGParse(x.m); return p && p.kind === 'month' && p.cal === 'h'; }).map(function (x) { return x.m; }),
    have = {}; mem.forEach(function (x) { have[x.m] = 1; });
  var delH = [];
  if (plan) { delH = (await calMigMembers(env, dept, R, '$/f:delMonths')).filter(function (x) { return calKeyCal(x.m) === 'h'; }).map(function (x) { return x.m; }); }
  if (!H.length && !delH.length) return { done: 1 };
  var byH = {}, months = {};
  H.forEach(function (h) { var p = calGParse(h); byH[p.y + '-' + p.m] = h; calGMonthsOfH(p.y, p.m).forEach(function (x) { months[x.g] = 1; }); });
  var G = Object.keys(months).sort(), base = mem.filter(function (x) { var p = calGParse(x.m); return !p; }).length;
  /* مواضعُ الأشهر الميلادية: ما يُكتب منها فقط (شهرٌ بلا مصدرٍ ذي قيمة لا عضوَ له) — بالترتيب، فتبقى متصلة */
  for (var i = 0, idx = mem.filter(function (x) { var p = calGParse(x.m); return p && p.cal === 'g'; }).length; i < G.length; i++) {
    var gm = G[i]; if (have[gm]) continue;
    if (Date.now() > budget) return { more: 1 };
    var srcN = calHMonthsOfG(gm).filter(function (x) { return ocOwn(byH, x.h); }), got = (await calMigRead(env, dept, R, calMigHeadRanges(C).concat(calMigMemberRanges(C, srcN.map(function (x) { return byH[x.h]; }))), true)) || {}, src = {};
    var box = plan ? (got.months || {}) : got;
    srcN.forEach(function (x) { if (ocOwn(box, byH[x.h])) src[x.h] = box[byH[x.h]]; });
    var rep = calConvRep(), v = plan ? calConvPlanMonth(gm, src, { T: ctx.T, rep: rep }) : calConvStaffMonth(gm, src, { T: ctx.T, rep: rep }, R + '/' + gm);
    if (v === undefined) continue;
    rep.months++;
    var w = {}, inner = {}; ocSet(inner, gm, v); if (plan) { Object.keys(got).forEach(function (k) { if (k !== 'months') ocSet(w, k, got[k]); }); ocSet(w, 'months', inner); } else w = inner;
    var st = calMigMemberRows(env, dept, R, C, w, gm, base + idx).concat(opSummaryStatements(env, opInfo(K), [{ p: gm, value: v }])), S2 = JSON.parse(JSON.stringify(sum)); calMigSummary(S2, rep);
    await calMigCommit(env, [revGuard(env, K, await calMigRev(env, K))], st, [K, K + '@*'], S2, dept);
    calMigSummary(sum, rep); idx++;
  }
  var st2 = calMigDrop(env, dept, R, calMigMemberRanges(C, H));
  if (plan) {
    /* delMonths (الرأس) ⇐ ميلادية: تُحذف المداخلُ الهجرية وتُكتب الميلادية في حاويتها بمواضع ما بقي ثم الجديد */
    var dm = (await calMigRead(env, dept, R, calMigHeadRanges(C), true)) || {}, del = isObj(dm.delMonths) ? dm.delMonths : {}, conv = calConvPlanMap(del, { T: ctx.T, rep: null }, true, 'plan/delMonths'), keepN = Object.keys(del).filter(function (k) { return calKeyCal(k) !== 'h'; }).length, j = 0;
    st2 = st2.concat(calMigDrop(env, dept, R, calMigMemberRanges('$/f:delMonths', delH)));
    Object.keys(conv).forEach(function (k) { if (ocOwn(del, k)) return; var w2 = {}, d2 = {}; Object.keys(dm).forEach(function (f) { if (f !== 'delMonths' && f !== 'months') ocSet(w2, f, dm[f]); }); ocSet(d2, k, conv[k]); ocSet(w2, 'months', {}); ocSet(w2, 'delMonths', d2); st2 = st2.concat(calMigMemberRows(env, dept, R, '$/f:delMonths', w2, k, keepN + j++)); });
  }
  st2.push(opTag(env.DB.prepare('DELETE FROM ops_period_summary WHERE department_id=?1 AND resource=?2 AND CAST(substr(period,1,4) AS INTEGER) BETWEEN 1300 AND 1599').bind(dept, R), [K]));
  await calMigCommit(env, [revGuard(env, K, await calMigRev(env, K))], st2, [K, K + '@*'], sum, dept);
  return { done: 1 };
}
/* مواردُ صغيرة (أقفالُ المهام والجدول · dayshift · dayfocus · الجدولُ القديم v2): الوثيقةُ كلُّها في دفعةٍ واحدة */
async function calMigSmallPhase(env, dept, R, ctx, sum) {
  var K = 'bsdept:' + dept + ':' + R, doc = await calMigRead(env, dept, R, [['', '\uffff']], false);
  if (doc === undefined) return { done: 1 };
  var rep = calConvRep(), next = calConvDoc(R, doc, { T: ctx.T, rep: rep });
  if (JSON.stringify(next) === JSON.stringify(doc)) return { done: 1 };
  var st = calMigDrop(env, dept, R, [['$/', '$0']]).concat(calMigAllRows(env, dept, R, next).st);
  calMigSummary(sum, rep);
  await calMigCommit(env, [revGuard(env, K, await calMigRev(env, K))], st, [K], sum, dept);
  return { done: 1 };
}
async function calMigDept(env, d, T, budget) {
  var row = await env.DB.prepare('SELECT v FROM meta WHERE k=?1').bind(CAL_MIG_SUM + d).first(), sum = Object.assign(calConvRep(), parseJson(row && row.v, {}) || {}), ctx = { T: T }, r;
  var plan = [['day', 'bassam_rounds_v1', 'bassam_rounds_arc_v1'], ['day', 'bassam_dreport_v1'], ['day', 'bassam_tasks_v1'], ['mon', 'bassam_staffing_v3'], ['mon', 'bassam_plan_v1'],
    ['small', 'bassam_tasks_locks_v1'], ['small', 'bassam_staffing_locks_v1'], ['small', 'bassam_staffing_v2'], ['small', 'bassam_dayshift_v1'], ['small', 'bassam_dayfocus_v1']];
  for (var p of plan) {
    if (!(await calMigHas(env, d, p[1])) && !(p[2] && await calMigHas(env, d, p[2]))) continue;
    r = p[0] === 'day' ? await calMigDayMapPhase(env, d, p[1], p[2] && (await calMigHas(env, d, p[2])) ? p[2] : null, ctx, sum, budget) : p[0] === 'mon' ? await calMigMonthsPhase(env, d, p[1], ctx, sum, budget) : await calMigSmallPhase(env, d, p[1], ctx, sum);
    if (r.more) return { more: 1, at: p[1], sum: sum };
  }
  /* الاكتمالُ: لا مفتاحَ هجريَّ باقٍ في مورد ⇐ الإدارةُ تخرج من القائمة (ذرّياً مع ملخّصها) */
  await env.DB.batch([env.DB.prepare("UPDATE meta SET v=(SELECT COALESCE(json_group_array(value),'[]') FROM json_each(meta.v) WHERE value<>?1) WHERE k='" + CAL_MIG_PENDING + "'").bind(d),
    env.DB.prepare('INSERT INTO meta(k,v) VALUES(?1,?2) ON CONFLICT(k) DO UPDATE SET v=excluded.v').bind(CAL_MIG_SUM + d, JSON.stringify(Object.assign(sum, { done: 1 })))]);
  logEv('info', 'cal-migrate', { rid: env.__rid, dept: d, days: sum.days, months: sum.months, conflicts: sum.conflicts.length });
  return { ok: 1, sum: sum };
}
async function calMigRoute(env, request, session) {
  if (request.method !== 'POST') return json({ ok: 0, err: 'method' }, 405);
  try {
    var A = await actorOf(env, session.uid); if (!A) return json({ ok: 0, err: 'session' }, 401);
    if (A.u.role !== 'super') return json({ ok: 0, err: 'calendar-migrate-permission' }, 403);
    var body = parseJson(await request.text(), null); if (!isObj(body) || typeof body.dept !== 'string') return json({ ok: 0, err: 'bad-body' }, 400);
    var P = parseJson((((await env.DB.prepare("SELECT v FROM meta WHERE k='" + CAL_MIG_PENDING + "'").first()) || {}).v), []) || [], L = opLayoutPendingOf(await env.DB.prepare("SELECT v FROM meta WHERE k='" + OP_LAYOUT_KEY + "'").first());
    var Trow = await env.DB.prepare("SELECT v FROM meta WHERE k='" + CAL_MIG_TKEY + "'").first(), T = (Trow && Trow.v) || calToday(Date.now()).k;
    var list = body.dept === 'all' ? P.slice() : P.indexOf(body.dept) >= 0 ? [body.dept] : [], out = [], t0 = Date.now(), budget = t0 + Math.min(Math.max(Number(body.budgetMs) || 20000, 1000), 25000);
    for (var d of list) {
      var rep = { dept: d, ok: 0 }, t1 = Date.now();
      /* ترتيبُ الأوامر على قاعدةٍ تحمل 0013 و0014 معاً: calendar-migrate أولاً (يعيد ترميز الموارد المقسومة كلِّها بملخّصاتها) ثم periods-migrate
         (يتحقق ويُخرج الإدارة من ops_layout_pending) — قراءةُ 0013 مرفوضةٌ ما دامت الإدارةُ معلَّقةً تقويمياً */
      if (L.indexOf(d) >= 0) rep.layout = 1;
      try {
        var r = await calMigDept(env, d, T, budget);
        if (r.more) { rep.more = 1; rep.at = r.at; rep.ms = Date.now() - t1; out.push(rep); return json({ ok: 0, more: 1, departments: out, next: { dept: d }, pending: P }); }
        rep.ok = 1; rep.ms = Date.now() - t1; rep.days = r.sum.days; rep.months = r.sum.months; rep.conflicts = r.sum.conflicts; rep.recurring = r.sum.recurring; rep.plan = r.sum.plan; rep.locks = r.sum.locks;
      } catch (e) {
        if (!(e && (e.ocCode || e.rs)) && !dbLimitFailure(e) && !/KIVO_REV_CONFLICT/.test(String(e))) throw e;
        rep.err = e.ocCode || e.rs || (dbLimitFailure(e) || {}).err || 'conflict'; if (e.path) rep.period = e.path;
      }
      out.push(rep);
    }
    var left = parseJson((((await env.DB.prepare("SELECT v FROM meta WHERE k='" + CAL_MIG_PENDING + "'").first()) || {}).v), []) || [];
    return json({ ok: out.every(function (r) { return r.ok; }) ? 1 : 0, departments: out, pending: left });
  } catch (error) { return opRouteError(error); }
}
