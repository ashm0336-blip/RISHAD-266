/* ═══ R180: «الإحصائيات اليومية» — مخزنٌ عامٌّ واحد تحكمه أوراقُ الصفحة ═══
   كان المفتاحُ لمدير النظام وحده في الخادم، والشاشةُ تفتح الإدخالَ لكلِّ من مُنح الصفحة — فيُرفض حفظُه
   ويُعاد ما في الخادم. صار لكلِّ مسجدٍ ورقتُه (dstats/haram · dstats/nabawi)، ومَن يكتب أرقامَ مسجدٍ
   يملك على ورقته — في إدارةٍ من نطاقه — كلَّ فعلٍ في كتابته، بتصنيف المنصّة نفسِه (cmpMap):
     يومٌ بلا أرقامٍ صار فيه أرقام = إضافة · يومٌ فيه أرقامٌ تغيّر = تعديل · يومٌ زالت أرقامُه = حذف
     وأقفالُ شهرِ المسجد وأيامِه (locks["site|y-m"]) = اعتماد.
   واليومُ بلا رقمٍ واحدٍ لا يُعدّ يوماً (البصمةُ وحدَها لا تكفي) — كما تعدّه الشاشة. وما كُتب من يومٍ
   أو قفلٍ يُفحص شكلُه: أرقامٌ لا نصوص، ومفاتيحُ أيامٍ وأقفالٍ بصيغتها — فالكاتبُ صار غيرَ مدير النظام.
   وما سوى المسجدين والأقفال لا يكتبه إلا مدير النظام. */
var K_DSTATS = 'bassam_dstats_v1', DS_SITES = ['haram', 'nabawi'];
/* R181: أوراقُ القراءة — المسجدان والتحليلاتُ الأربع؛ «عرض» على أيٍّ منها في إدارةٍ من النطاق يفتح المخزن */
var DS_READ = ['haram', 'nabawi', 'anHaram', 'anNabawi', 'anCmp', 'anTime'];
function dsDepts(A) {
  var u = A.u;
  if (u.role === 'gm') return (A.depts || []).map(function (x) { return x && x.id; }).filter(function (d) { return !!d && deptInScope(A, d); });
  /* AD-7 (F01): إدارةُ الحساب وحدةُ بياناتٍ قائمة · ومديرُ الإدارة الأم يحمل أوراقَ أقسامها (deptInScope) */
  var out = u.deptId && isUnitId(A, String(u.deptId)) ? [u.deptId] : [];
  (A.depts || []).forEach(function (x) { var d = x && x.id; if (d && d !== u.deptId && secMgrOf(A, d)) out.push(d); });
  return out;
}
function dsHeld(A, sites, acts) {
  var ds = dsDepts(A);
  for (var s = 0; s < sites.length; s++) for (var i = 0; i < ds.length; i++) if (actsHeldOn(A, ds[i], 'dstats/' + sites[s], acts)) return true;
  return false;
}
function dsHasNum(r) {
  if (!isObj(r)) return r != null && r !== '';
  for (var f in r) if (f !== '__m' && f !== '__f' && r[f] != null && r[f] !== '') return true;
  return false;
}
function dsDays(m) { var o = {}; for (var k in m) if (dsHasNum(m[k])) o[k] = m[k]; return o; }
function dsStampOk(x) { return isObj(x) && Object.keys(x).length <= 6; }
function dsDayOk(r) {
  if (!isObj(r)) return false;
  var ks = Object.keys(r); if (ks.length > 40) return false;
  for (var i = 0; i < ks.length; i++) {
    var f = ks[i], v = r[f];
    if (f.length > 40) return false;
    if (f === '__m') { if (!dsStampOk(v)) return false; continue; }
    if (f === '__f') { if (!isObj(v)) return false; for (var q in v) if (!(v[q] === 0 || dsStampOk(v[q]))) return false; continue; }
    if (!(v === null || (typeof v === 'number' && isFinite(v)))) return false;
  }
  return true;
}
function dsLockOk(v) {
  if (v === undefined || v === true) return true;
  if (!isObj(v)) return false;
  for (var k in v) {
    if (k === 'ap' || k === 'mo') { if (!(v[k] === 1 || v[k] === true)) return false; continue; }
    if (k === 'dopen' || k === 'dshut') { if (!isObj(v[k])) return false; for (var d in v[k]) if (!/^\d{1,2}$/.test(d) || !(v[k][d] === 1 || v[k][d] === true)) return false; continue; }
    return false;
  }
  return true;
}
/* R183 (الملاحظة ٩): أقفالُ الأيام والأشهر — قاعدةُ الشاشة نفسُها (dayLocked · mLocked في «الإحصائيات اليومية»):
     locks["haram|1448-4"] = true (شكلٌ قديم = معتمد) أو { ap: معتمد · mo: شهرٌ منقضٍ فُتح بأثر رجعي ·
     dopen: أيامٌ منقضية فُتحت · dshut: أيامٌ لم تنقضِ أُقفلت يدوياً }. */
/* DS_GRACE → 016-base-shared.js (V7 · المرحلة 2 · الحزمة أ) */
/* dsToday → 016-base-shared.js (V7 · المرحلة 2 · الحزمة أ) */
function dsLockRec(L, site, y, m) { var v = isObj(L) ? L[site + '|' + y + '-' + m] : undefined; return v === true ? { ap: 1 } : (isObj(v) ? v : {}); }
function dsLockedIn(L, site, y, m, d, T) {
  var r = dsLockRec(L, site, y, m);
  if (r.ap) return true;
  var mPast = !!T && (y < T.y || (y === T.y && m < T.m)), dPast = mPast || (!!T && y === T.y && m === T.m && d < T.d);
  if (mPast && !r.mo) return true;
  return dPast ? !(isObj(r.dopen) && r.dopen[d]) : !!(isObj(r.dshut) && r.dshut[d]);
}
/* الأيامُ التي تغيّرت أرقامُها (إضافةً أو تعديلاً أو حذفاً) — مقفلةٌ قبل الحفظ وبعده معاً ⇒ مرفوضة */
function dsLockHit(site, a9, b9, oL, nL, T) {
  var A9 = dsDays(a9), B9 = dsDays(b9), ks = {}, q;
  Object.keys(A9).concat(Object.keys(B9)).forEach(function (x) { ks[x] = 1; });
  for (q in ks) {
    if (deq(A9[q], B9[q])) continue;
    var mq = /^(\d{4})-(\d{2})-(\d{2})$/.exec(q); if (!mq) continue;
    var y = +mq[1], m = +mq[2], d = +mq[3];
    if (dsLockedIn(oL, site, y, m, d, T) && dsLockedIn(nL, site, y, m, d, T)) return q;
  }
  return '';
}
function dstatsRule(A, newJson, curJson) {
  var n = parseJson(newJson, null), o = curJson == null ? {} : parseJson(curJson, null);
  if (!isObj(n) || !isObj(o)) return { ok: false, why: 'dstats' };
  var need = {}, top = {}, k, q, lockQ = '', T9 = dsToday(Date.now());
  Object.keys(n).concat(Object.keys(o)).forEach(function (x) { top[x] = 1; });
  for (k in top) {
    if (deq(o[k], n[k])) continue;
    if (DS_SITES.indexOf(k) !== -1) {
      var a9 = o[k] === undefined ? {} : o[k], b9 = n[k] === undefined ? {} : n[k];
      if (!isObj(a9) || !isObj(b9)) return { ok: false, why: 'dstats' };
      for (q in b9) if (!deq(a9[q], b9[q]) && (!/^\d{4}-\d{2}-\d{2}$/.test(q) || !dsDayOk(b9[q]))) return { ok: false, why: 'dstats' };
      if (!lockQ) lockQ = dsLockHit(k, a9, b9, o.locks, n.locks, T9);
      var m9 = {}; cmpMap(dsDays(a9), dsDays(b9), m9, '');
      for (q in m9) (need[k] = need[k] || {})[q] = 1;
      continue;
    }
    if (k === 'locks') {
      var la = o.locks === undefined ? {} : o.locks, lb = n.locks === undefined ? {} : n.locks;
      if (!isObj(la) || !isObj(lb)) return { ok: false, why: 'dstats' };
      var lk = {}; Object.keys(la).concat(Object.keys(lb)).forEach(function (x) { lk[x] = 1; });
      for (q in lk) {
        if (deq(la[q], lb[q])) continue;
        var mq = /^(haram|nabawi)\|\d{4}-\d{1,2}$/.exec(String(q));
        if (!mq) return { ok: false, why: 'super' };
        if (!dsLockOk(lb[q])) return { ok: false, why: 'dstats' };
        (need[mq[1]] = need[mq[1]] || {}).approve = 1;
      }
      continue;
    }
    return { ok: false, why: 'super' };                /* ما سوى المسجدين والأقفال لمدير النظام وحده */
  }
  var ss = Object.keys(need);
  /* حفظٌ لا يغيّر يوماً ولا قفلاً يُعامل تعديلاً — قاعدةُ النواة نفسُها */
  if (!ss.length) return dsHeld(A, DS_SITES, ['edit']) ? { ok: true } : { ok: false, why: 'act' };
  for (var i = 0; i < ss.length; i++) if (!dsHeld(A, [ss[i]], Object.keys(need[ss[i]]))) return { ok: false, why: 'act' };
  if (lockQ) return { ok: false, why: 'dslock' };
  return { ok: true };
}

/* Daily statistics is an independent relational domain. K_DSTATS remains a permission/audit
   resource identifier only; no business document is read from or written to kv. */
var DS_METRICS = ['worshippers', 'umrah', 'hijr_ismail', 'carts', 'salam_corridor', 'rawdah_men_published', 'rawdah_men_reserved', 'rawdah_men_actual', 'rawdah_women_published', 'rawdah_women_reserved', 'rawdah_women_actual'];
var DS_FIELDS = { haram: DS_METRICS.slice(0, 4), nabawi: [DS_METRICS[0]].concat(DS_METRICS.slice(4)) };
function dsDomainShape(v) {
  if (!isObj(v) || Object.keys(v).some(function (k) { return DS_SITES.concat(['locks']).indexOf(k) < 0; })) return false;
  for (var s of DS_SITES) {
    if (v[s] === undefined) continue;
    if (!isObj(v[s])) return false;
    for (var date in v[s]) {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date), r = v[s][date];
      if (!m || +m[1] < 1000 || +m[2] < 1 || +m[2] > 12 || +m[3] < 1 || +m[3] > 30 || !dsDayOk(r)) return false;
      if (Object.keys(r).some(function (k) { return k !== '__m' && k !== '__f' && DS_FIELDS[s].indexOf(k) < 0; })) return false;
      if (r.__f && Object.keys(r.__f).some(function (k) { return DS_FIELDS[s].indexOf(k) < 0; })) return false;
      if (JSON.stringify(r).length > 60000) return false;
    }
  }
  if (v.locks !== undefined) {
    if (!isObj(v.locks)) return false;
    for (var k in v.locks) {
      if (!/^(haram|nabawi)\|[1-9]\d{3}-(?:[1-9]|1[0-2])$/.test(k) || !dsLockOk(v.locks[k])) return false;
      var lock = v.locks[k];
      for (var f of ['dopen', 'dshut']) if (isObj(lock) && lock[f]) for (var d in lock[f]) if (!/^(?:[1-9]|[12]\d|30)$/.test(d)) return false;
    }
  }
  return true;
}
function dsDomainRows(v) {
  var rows = { days: [], months: [], locks: [] };
  DS_SITES.forEach(function (s) { Object.keys(v[s] || {}).sort().forEach(function (date) {
    var r = v[s][date], row = { site: s, hijri_date: date, field_mask: 0, meta_json: r.__m === undefined ? null : JSON.stringify(r.__m), fields_json: r.__f === undefined ? null : JSON.stringify(r.__f) };
    DS_METRICS.forEach(function (f, i) { if (Object.prototype.hasOwnProperty.call(r, f)) row.field_mask |= (1 << i); row[f] = r[f] == null ? null : r[f]; });
    rows.days.push(row);
  }); });
  Object.keys(v.locks || {}).sort().forEach(function (key) {
    var m = /^(haram|nabawi)\|(\d{4})-(\d{1,2})$/.exec(key), r0 = v.locks[key], r = r0 === true ? { ap: 1 } : r0;
    rows.months.push({ site: m[1], hijri_year: +m[2], hijri_month: +m[3], approved: r.ap ? 1 : 0, reopened: r.mo ? 1 : 0, legacy_boolean: r0 === true ? 1 : 0 });
    var days = {}; Object.keys(r.dopen || {}).concat(Object.keys(r.dshut || {})).forEach(function (d) { days[d] = 1; });
    Object.keys(days).forEach(function (d) { rows.locks.push({ site: m[1], hijri_year: +m[2], hijri_month: +m[3], hijri_day: +d, is_open: r.dopen && r.dopen[d] ? 1 : 0, is_shut: r.dshut && r.dshut[d] ? 1 : 0 }); });
  });
  return rows;
}
function dsDomainInflate(rows) {
  var v = { haram: {}, nabawi: {}, locks: {} };
  rows.days.forEach(function (r) { var day = {}; DS_METRICS.forEach(function (f, i) { if (r.field_mask & (1 << i)) day[f] = r[f]; });
    if (r.meta_json != null) day.__m = JSON.parse(r.meta_json); if (r.fields_json != null) day.__f = JSON.parse(r.fields_json); v[r.site][r.hijri_date] = day; });
  rows.months.forEach(function (r) { var key = r.site + '|' + r.hijri_year + '-' + r.hijri_month, lock = {}; if (r.approved) lock.ap = 1; if (r.reopened) lock.mo = 1; v.locks[key] = r.legacy_boolean ? true : lock; });
  rows.locks.forEach(function (r) { var key = r.site + '|' + r.hijri_year + '-' + r.hijri_month, lock = v.locks[key]; if (lock === true) lock = v.locks[key] = { ap: 1 };
    if (r.is_open) (lock.dopen || (lock.dopen = {}))[r.hijri_day] = 1; if (r.is_shut) (lock.dshut || (lock.dshut = {}))[r.hijri_day] = 1; });
  return v;
}
async function dsDomainRead(env) {
  /* One D1 batch gives a consistent snapshot, including the revision used for CAS. */
  var b = await env.DB.batch([
    env.DB.prepare('SELECT * FROM daily_stats_days ORDER BY site,hijri_date'),
    env.DB.prepare('SELECT * FROM daily_stats_month_locks ORDER BY site,hijri_year,hijri_month'),
    env.DB.prepare('SELECT * FROM daily_stats_day_locks ORDER BY site,hijri_year,hijri_month,hijri_day'),
    env.DB.prepare('SELECT rev FROM revs WHERE k = ?1').bind(K_DSTATS)
  ]);
  return { data: dsDomainInflate({ days: b[0].results || [], months: b[1].results || [], locks: b[2].results || [] }), rev: b[3].results && b[3].results[0] ? b[3].results[0].rev : 0 };
}
function dsDomainStatements(env, before, after) {
  var a = dsDomainRows(before), b = dsDomainRows(after), st = [];
  /* json_each is a parameter transport, never a stored JSON business document. Each
     table has one delete and one upsert; even a historical import is a single transaction. */
  var specs = [
    { name: 'days', table: 'daily_stats_days', pk: ['site', 'hijri_date'], cols: ['site', 'hijri_date', 'field_mask'].concat(DS_METRICS, ['meta_json', 'fields_json']) },
    { name: 'months', table: 'daily_stats_month_locks', pk: ['site', 'hijri_year', 'hijri_month'], cols: ['site', 'hijri_year', 'hijri_month', 'approved', 'reopened', 'legacy_boolean'] },
    { name: 'locks', table: 'daily_stats_day_locks', pk: ['site', 'hijri_year', 'hijri_month', 'hijri_day'], cols: ['site', 'hijri_year', 'hijri_month', 'hijri_day', 'is_open', 'is_shut'] }
  ];
  var changes = {};
  /* Bound every parameter below D1's value limit while keeping ALL chunks in the
     caller's one atomic batch (never commit a historical import in pieces). */
  var chunks = function (rows) { var all = [], part = [], bytes = 2; rows.forEach(function (r) { var size = new TextEncoder().encode(JSON.stringify(r)).byteLength + 1;
    if (part.length && bytes + size > 500000) { all.push(part); part = []; bytes = 2; } part.push(r); bytes += size; }); if (part.length) all.push(part); return all; };
  specs.forEach(function (sp) {
    var key = function (r) { return sp.pk.map(function (f) { return r[f]; }).join('|'); }, old = {}, next = {}, put = [], drop = [];
    a[sp.name].forEach(function (r) { old[key(r)] = r; }); b[sp.name].forEach(function (r) { next[key(r)] = r; if (!deq(old[key(r)], r)) put.push(r); });
    a[sp.name].forEach(function (r) { if (!next[key(r)]) drop.push(r); }); changes[sp.name] = { put: put, drop: drop };
  });
  /* Drop children first and create parents first, so FK enforcement never needs disabling. */
  [specs[2], specs[0], specs[1]].forEach(function (sp) { var drop = changes[sp.name].drop; if (!drop.length) return;
    chunks(drop).forEach(function (part) { st.push(env.DB.prepare('DELETE FROM ' + sp.table + ' WHERE EXISTS (SELECT 1 FROM json_each(?1) AS j WHERE ' + sp.pk.map(function (f) { return sp.table + '.' + f + " = json_extract(j.value, '$." + f + "')"; }).join(' AND ') + ')').bind(JSON.stringify(part))); }); });
  [specs[1], specs[0], specs[2]].forEach(function (sp) { var put = changes[sp.name].put; if (!put.length) return;
    chunks(put).forEach(function (part) { st.push(env.DB.prepare('INSERT INTO ' + sp.table + ' (' + sp.cols.join(',') + ') SELECT ' + sp.cols.map(function (f) { return "json_extract(j.value, '$." + f + "')"; }).join(',') + ' FROM json_each(?1) AS j WHERE 1 ON CONFLICT(' + sp.pk.join(',') + ') DO UPDATE SET ' + sp.cols.filter(function (f) { return sp.pk.indexOf(f) < 0; }).map(function (f) { return f + '=excluded.' + f; }).join(',')).bind(JSON.stringify(part))); }); });
  return st;
}
async function dsDomainView(env, A, data, refs) {
  var raw = JSON.stringify(data);
  if (A.enf) raw = enfProjectStr(A, K_DSTATS, raw, refs || await enfRefsFor(env, enfDeptsOf(A), null));
  return JSON.parse(raw);
}
async function dsDomainDeny(env, A, why, ip, verdict) {
  var meta = ip || {}, v = verdict || enfNo(why), st = [secStmt(env, { uid: A.u.id, act: 'denied', target: K_DSTATS, detail: why, ip: meta.ip || '', city: meta.city || '', dev: meta.dev || '' })];
  if (A.enf) { var row = enfLogRow(A, K_DSTATS, v, '/api/dstats', meta); if (row) st.push(enfLogStmt(env, row)); }
  await env.DB.batch(st);
  return { status: 403, body: { ok: 0, err: 'denied', why: why, reasonKeys: v.reasonKeys || v.keys || [] } };
}
async function dsDomainCommit(env, A, body, ip) {
  if (!canRead(A, K_DSTATS)) return await dsDomainDeny(env, A, 'view', ip);
  if (body.operation !== undefined && body.operation !== 'historical-import') return { status: 400, body: { ok: 0, err: 'operation' } };
  if (!dsDomainShape(body.data)) return { status: 400, body: { ok: 0, err: 'dstats-shape' } };
  var current = await dsDomainRead(env), cur = JSON.stringify(current.data), raw = JSON.stringify(body.data), refs = null, X = null, ctx = {};
  var set = {}; set[K_DSTATS] = raw; var keys = {}; keys[K_DSTATS] = 1;
  var markers = KIVO_BUILD.markers(body.ops || {}, keys), restore = markers.ops[K_DSTATS] && markers.ops[K_DSTATS].op === 'backup.restore' ? markers.ops[K_DSTATS] : null;
  if (restore) return { status: 400, body: { ok: 0, err: 'full-restore-unsupported' } };
  var historical = body.operation === 'historical-import';
  /* Historical import is the existing super-only operation, with its mandatory reason. */
  if (historical && (A.u.role !== 'super' || !String(body.reason || '').trim())) { var hw = A.u.role !== 'super' ? 'super' : 'reason'; return await dsDomainDeny(env, A, hw, ip, enfNo(hw, { keys: ['sys.histimp.run'], reasonKeys: ['sys.histimp.run'] })); }
  if (A.enf) {
    var why = {}; why[K_DSTATS] = String(body.reason || '').trim();
    X = await enfSavePrep(env, A, { why: why }, set, [], keys, markers, restore, false, historical, await permv3RetroLoad(env, set, []), await permv4RefsLoad(env, set, []));
    X.refs = await enfRefsFor(env, enfDeptsOf(A), null);
    refs = X.refs;
    var merged = enfMergeChk(A, K_DSTATS, raw, cur, refs); if (merged.hidden) return await dsDomainDeny(env, A, 'scope', ip); raw = merged.v;
    ctx.enf = enfCtxFor(X, K_DSTATS, '');
  }
  /* Canonical numeric lock flags prevent true/1 presentation changes being misclassified. */
  var next = dsDomainInflate(dsDomainRows(JSON.parse(raw))); raw = JSON.stringify(next);
  var verdict = X && X.batchDeny ? enfNo(X.batchDeny.why, X.batchDeny) : canWrite(A, K_DSTATS, raw, cur, ctx);
  if (!verdict.ok) return await dsDomainDeny(env, A, verdict.why, ip, verdict);
  if (body.base !== current.rev) return { status: 409, body: { ok: 0, err: 'conflict', rev: current.rev, data: await dsDomainView(env, A, current.data, refs) } };
  var st = dsDomainStatements(env, current.data, next);
  if (!st.length) return { status: 200, body: { ok: 1, rev: current.rev, data: await dsDomainView(env, A, next, refs) } };
  var rev = await nextRev(env), meta = ip || {};
  st.unshift(revGuard(env, K_DSTATS, current.rev));
  st.push(env.DB.prepare('INSERT INTO revs (k,rev) VALUES (?1,?2) ON CONFLICT(k) DO UPDATE SET rev=excluded.rev').bind(K_DSTATS, rev));
  st.push(audEvStmt(env, { cid: 'dstats_' + rev, ts: Date.now(), uid: A.u.id, un: '', dept: '', k: K_DSTATS, rev: rev, etype: 'dataset', eid: 'daily-stats', ename: 'الإحصائيات اليومية', act: historical ? 'import' : 'updated', ctx: JSON.stringify({ domain: 'daily-stats', reason: String(body.reason || '').slice(0, 300) }), bef: '', aft: '', ip: meta.ip || '', city: meta.city || '', dev: meta.dev || '' }));
  if (X) { var log = enfLogRow(A, K_DSTATS, verdict, '/api/dstats', meta); if (log) st.push(enfLogStmt(env, log)); }
  try { await env.DB.batch(st); } catch (e) {
    if (!isRevConflict(e)) throw e;
    current = await dsDomainRead(env); return { status: 409, body: { ok: 0, err: 'conflict', rev: current.rev, data: await dsDomainView(env, A, current.data, refs) } };
  }
  return { status: 200, body: { ok: 1, rev: rev, data: await dsDomainView(env, A, next, refs) } };
}
async function dsDomainRoute(env, request, url, ss) {
  if (request.method !== 'GET' && request.method !== 'POST') return json({ ok: 0, err: 'method' }, 405);
  var mismatch = sessUidMismatch(env, url, ss, '/api/dstats'); if (mismatch) return mismatch;
  var A = await actorOf(env, ss.uid); if (!A) return json({ ok: 0, err: 'session' }, 401);
  if (await dsLegacyPresent(env)) return json({ ok: 0, err: 'dstats-legacy-source-present' }, 503);
  if (!canRead(A, K_DSTATS)) { if (request.method === 'GET') return json({ ok: 0, err: 'denied', why: 'view' }, 403); var denied = await dsDomainDeny(env, A, 'view', reqMeta(request)); return json(denied.body, denied.status); }
  if (request.method === 'GET') { var current = await dsDomainRead(env); return json({ ok: 1, rev: current.rev, data: await dsDomainView(env, A, current.data) }); }
  var bytes = await request.arrayBuffer(); if (bytes.byteLength > bodyLimit('/api/dstats')) return json({ ok: 0, err: 'body-large' }, 413);
  var body; try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch (e) { return json({ ok: 0, err: 'bad-body', at: '$' }, 400); }
  var bad = bodyCheck('/api/dstats', body);
  if (!bad && (!isObj(body) || !Number.isSafeInteger(body.base) || body.base < 0 || !isObj(body.data))) bad = '$';
  if (bad) return json({ ok: 0, err: 'bad-body', at: bad }, 400);
  if (body.uid != null && String(body.uid) !== String(ss.uid)) return json({ ok: 0, err: 'session-changed' }, 409);
  var limit = await rlHit(env, 'sv', A.u.id, RL_SAVE); if (limit) return tooMany(limit);
  var result = await dsDomainCommit(env, A, body, reqMeta(request)); return json(result.body, result.status);
}
/* lensesUpgradeOnly → workers/parts/016-base-shared.js (V7 · د1) */


/* Validated one-time cutover. These helpers are used only by migrateDb before
   migration 0004; application reads and writes never fall back to the retired KV. */
async function dsLegacyPresent(env) {
  return !!await env.DB.prepare("SELECT k FROM kv WHERE k = ?1 OR k GLOB 'bsdept:*:bassam_dstats_v1' LIMIT 1").bind(K_DSTATS).first();
}
function dsLegacyConvert(raw) {
  var data;
  try { data = JSON.parse(raw); } catch (e) { throw new Error('dstats-cutover-shape'); }
  if (!isObj(data) || (data.locks !== undefined && !isObj(data.locks))) throw new Error('dstats-cutover-shape');
  if (data.locks !== undefined) {
    var locks = {};
    Object.keys(data.locks).forEach(function (key) {
      var m = /^(haram|nabawi)\|(\d{4})-(\d{1,2})$/.exec(key);
      if (!m || +m[2] < 1000 || +m[3] < 1 || +m[3] > 12) throw new Error('dstats-cutover-lock');
      var canonical = m[1] + '|' + (+m[2]) + '-' + (+m[3]);
      if (Object.prototype.hasOwnProperty.call(locks, canonical)) throw new Error('dstats-cutover-lock-ambiguous');
      var old = data.locks[key];
      if (old === true) { locks[canonical] = true; return; }
      if (!isObj(old)) throw new Error('dstats-cutover-lock');
      var lock = {};
      Object.keys(old).forEach(function (field) {
        if (field === 'ap' || field === 'mo') {
          if (old[field] !== 1 && old[field] !== true) throw new Error('dstats-cutover-lock');
          lock[field] = 1; return;
        }
        if ((field !== 'dopen' && field !== 'dshut') || !isObj(old[field])) throw new Error('dstats-cutover-lock');
        var days = {};
        Object.keys(old[field]).forEach(function (day) {
          if (!/^\d{1,2}$/.test(day) || +day < 1 || +day > 30 || (old[field][day] !== 1 && old[field][day] !== true)) throw new Error('dstats-cutover-lock');
          var normalized = String(+day);
          if (Object.prototype.hasOwnProperty.call(days, normalized)) throw new Error('dstats-cutover-day-ambiguous');
          days[normalized] = 1;
        });
        lock[field] = days;
      });
      locks[canonical] = lock;
    });
    data.locks = locks;
  }
  if (!dsDomainShape(data)) throw new Error('dstats-cutover-shape');
  return data;
}
async function dsLegacyPrepare(env) {
  var result = await env.DB.prepare("SELECT k,seq,v FROM kv WHERE k = ?1 OR k GLOB 'bsdept:*:bassam_dstats_v1' ORDER BY k,seq").bind(K_DSTATS).all();
  var rows = result.results || [];
  if (!rows.length) return { before: [], after: [], n: 0 };
  if (rows.some(function (r) { return r.k !== K_DSTATS; })) throw new Error('dstats-cutover-scope-unknown');
  if (rows.some(function (r, i) { return !Number.isSafeInteger(r.seq) || r.seq !== i || typeof r.v !== 'string'; })) throw new Error('dstats-cutover-chunks-unknown');
  var data = dsLegacyConvert(rows.map(function (r) { return r.v; }).join(''));
  var tables = (await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('daily_stats_days','daily_stats_month_locks','daily_stats_day_locks')").all()).results || [];
  for (var i = 0; i < tables.length; i++) {
    var table = tables[i].name;
    if (['daily_stats_days','daily_stats_month_locks','daily_stats_day_locks'].indexOf(table) < 0) throw new Error('dstats-cutover-target-unknown');
    if (await env.DB.prepare('SELECT 1 AS present FROM ' + table + ' LIMIT 1').first()) throw new Error('dstats-cutover-target-not-empty');
  }
  var before = [env.DB.prepare("SELECT CASE WHEN (SELECT COUNT(*) FROM kv WHERE k = ?1 OR k GLOB 'bsdept:*:bassam_dstats_v1') != ?2 THEN json_extract('{}','KIVO_DSTATS_CUTOVER_SOURCE_CHANGED') END").bind(K_DSTATS,rows.length)];
  rows.forEach(function (r) {
    before.push(env.DB.prepare("SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM kv WHERE k=?1 AND seq=?2 AND v=?3) THEN json_extract('{}','KIVO_DSTATS_CUTOVER_SOURCE_CHANGED') END").bind(r.k,r.seq,r.v));
  });
  before.push(env.DB.prepare("INSERT INTO meta(k,v) VALUES('ds_cutover_ready','validated') ON CONFLICT(k) DO UPDATE SET v=excluded.v"));
  var after = dsDomainStatements(env,{haram:{},nabawi:{},locks:{}},data);
  after.unshift(env.DB.prepare("SELECT CASE WHEN EXISTS(SELECT 1 FROM daily_stats_days UNION ALL SELECT 1 FROM daily_stats_month_locks UNION ALL SELECT 1 FROM daily_stats_day_locks LIMIT 1) THEN json_extract('{}','KIVO_DSTATS_CUTOVER_TARGET_CHANGED') END"));
  after.push(env.DB.prepare('DELETE FROM kv WHERE k=?1').bind(K_DSTATS));
  after.push(env.DB.prepare("INSERT INTO meta(k,v) VALUES('rev',CAST(COALESCE((SELECT MAX(rev) FROM revs),0)+1 AS TEXT)) ON CONFLICT(k) DO UPDATE SET v=CAST(MAX(CAST(meta.v AS INTEGER),COALESCE((SELECT MAX(rev) FROM revs),0))+1 AS TEXT)"));
  after.push(env.DB.prepare("INSERT INTO revs(k,rev) VALUES(?1,CAST((SELECT v FROM meta WHERE k='rev') AS INTEGER)) ON CONFLICT(k) DO UPDATE SET rev=excluded.rev").bind(K_DSTATS));
  return { before: before, after: after, n: dsDomainRows(data).days.length };
}
