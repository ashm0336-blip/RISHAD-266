/* V7 · 53: التخزين بالفترة (§3ب) — طبقةٌ لا تعرف شكل التاريخ؛ التفصيل في تقرير periods ووثيقة العقد. */
var OP_LIM = { day: 1048576, mctl: 524288, month: 3145728, head: 3145728, readPeriods: 40, readNodes: 30000, batchBytes: 30000000, batchStmts: 900, rangeGroups: 26, summaryRows: 800 };
var OP_LIM_MSG = {
  'read-too-large': 'طُلبت فترات أكثر من المسموح في قراءة واحدة. اختر مدى أقصر.',
  'period-too-large': 'بيانات هذه الفترة تجاوزت الحد المسموح. راجع الإدخال أو تواصل مع مدير المنصة.',
  'batch-budget': 'العملية أكبر من أن تُنفَّذ مرة واحدة. احفظ شهراً واحداً أو يوماً واحداً في كل مرة.',
  'ops-layout-pending': 'جارٍ تحويل تخزين بيانات هذه الإدارة. أعد المحاولة بعد دقائق.',
  'operations-period-required': 'حُدِّثت المنصة. أعد تحميل الصفحة ثم احفظ.'
};
var OP_PERIOD_RX = /^[^,@*;\u0000-\u001f\u007f]{1,64}$/, OP_LAYOUT_KEY = 'ops_layout_pending';
function opLimError(code, status, extra) { var e = rsError(code, status || 413); e.msg = OP_LIM_MSG[code] || ''; if (extra) e.details = extra; return e; }
function opPeriodDef(info) { return (info && info.definition && info.definition.period) || null; }
function opSplitResource(key) { var info = null; try { info = opInfo(key); } catch (e) { info = null; } return info && opPeriodDef(info) ? info : null; }
function opPeriodKey(k) {
  var s = String(k), i = s.indexOf('@'); if (i < 0) return null;
  var key = s.slice(0, i), p = s.slice(i + 1), info = opSplitResource(key);
  if (!info || (p !== '' && p !== '*' && !OP_PERIOD_RX.test(p))) return null;
  return { key: key, period: p, info: info };
}
function opContainerKey(def) { return def.field ? '$/f:' + encodeURIComponent(def.field) : '$'; }
function opPeriodRoot(def, p) { return opContainerKey(def) + '/e:' + encodeURIComponent(p); }
function opContainerSpec(info) { var spec = info.prepared.resources[info.resource].spec, def = opPeriodDef(info); return def.field ? spec.children[def.field] : spec; }
function opPeriodIdx(def, p) {
  var x = typeof def.index === 'function' ? def.index(p) : null;
  return { grp: x && typeof x.grp === 'string' ? x.grp : '', seq: x && Number.isSafeInteger(x.seq) ? x.seq : 0, kind: (x && x.kind) || 'day' };
}
function opPeriodOrder(def, list) {
  return list.slice().sort(function (a, b) { var x = opPeriodIdx(def, a), y = opPeriodIdx(def, b); return x.seq - y.seq || (a < b ? -1 : a > b ? 1 : 0); });
}
function opPeriodCtx(def, p) { var c = typeof def.ctx === 'function' ? def.ctx(p) : []; return Array.isArray(c) ? c.filter(function (x) { return typeof x === 'string' && x !== p; }) : []; }
function opSplit(info, doc) {
  var def = opPeriodDef(info), out = { head: doc, hpos: {}, periods: {}, pos: {} };
  if (doc === undefined || doc === null) return out;
  if (def.field) {
    if (!ocObj(doc) || !ocObj(doc[def.field])) return out;
    var head = {}; Object.keys(doc).forEach(function (k) { ocSet(head, k, k === def.field ? {} : doc[k]); });
    Object.keys(doc[def.field]).forEach(function (p, i) { ocSet(out.periods, p, doc[def.field][p]); out.pos[p] = i; });
    out.head = head; return out;
  }
  if (!ocObj(doc)) return out;
  var spec = opContainerSpec(info), h = {};
  Object.keys(doc).forEach(function (k, i) {
    if (ocOwn(spec.fields, k)) { ocSet(h, k, doc[k]); out.hpos[k] = i; }
    else { ocSet(out.periods, k, doc[k]); out.pos[k] = i; }
  });
  out.head = h; return out;
}
function opJoin(info, parts) {
  var def = opPeriodDef(info), head = parts.head, names = Object.keys(parts.periods || {});
  if (head === undefined || head === null) { if (names.length) throw ocError('period-without-head'); return head; }
  var byPos = function (pos) { return function (a, b) { var x = ocOwn(pos, a) ? pos[a] : Infinity, y = ocOwn(pos, b) ? pos[b] : Infinity; return x - y; }; };
  if (def.field) {
    if (!ocObj(head) || !ocObj(head[def.field])) { if (names.length) throw ocError('period-container'); return head; }
    var out = {}, box = {};
    names.slice().sort(byPos(parts.pos || {})).forEach(function (p) { ocSet(box, p, parts.periods[p]); });
    Object.keys(head).forEach(function (k) { ocSet(out, k, k === def.field ? box : head[k]); });
    return out;
  }
  if (!ocObj(head)) { if (names.length) throw ocError('period-container'); return head; }
  var pos = Object.assign({}, parts.pos || {}), all = Object.keys(head).concat(names);
  Object.keys(head).forEach(function (k) { pos[k] = parts.hpos && ocOwn(parts.hpos, k) ? parts.hpos[k] : -1; });
  var r = {}; all.slice().sort(byPos(pos)).forEach(function (k) { ocSet(r, k, ocOwn(head, k) ? head[k] : parts.periods[k]); });
  return r;
}
function opHeadRanges(def) { var e = opContainerKey(def) + '/e'; return [['', e + ':'], [e + ';', '￿']]; }
function opPeriodRanges(def, p) { var r = opPeriodRoot(def, p); return [[r, r + '\u0001'], [r + '/', r + '0']]; }
function opPeriodRev(revs, key, p) { return Math.max(rsNat(revs[key + '@' + p] || 0), rsNat(revs[key + '@*'] || 0)); }
function opPeriodRevGuards(env, items) {
  return rsChunks(items.map(function (x) { return { a: x[0] + '@' + x[1], b: x[0] + '@*', r: x[2] }; })).map(function (part) {
    return env.DB.prepare("SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(?1)j WHERE MAX(COALESCE((SELECT rev FROM revs WHERE k=json_extract(j.value,'$.a')),0),COALESCE((SELECT rev FROM revs WHERE k=json_extract(j.value,'$.b')),0))<>json_extract(j.value,'$.r'))THEN json_extract('{}','KIVO_REV_CONFLICT')END").bind(JSON.stringify(part));
  });
}
function opPeriodSizeCheck(def, p, value) {
  var kind = p === '' ? 'head' : opPeriodIdx(def, p).kind, cap = OP_LIM[kind] || OP_LIM.day, n = value === undefined ? 0 : JSON.stringify(value).length;
  if (n > cap) throw opLimError('period-too-large', 413, { period: p, bytes: n, cap: cap });
}
function opSummaryValue(info, p, value) {
  var def = opPeriodDef(info); if (p === '' || typeof def.summary !== 'function') return null;
  try { var out = def.summary(p, value); if (out && typeof out === 'object' && typeof def.kpi === 'function') out.kpi = def.kpi(p, value); return out; } catch (e) { return null; }
}
function opSummaryStatements(env, info, changes) {
  var put = [], drop = [];
  changes.forEach(function (c) { if (c.p === '') return; var v = c.value === undefined ? undefined : opSummaryValue(info, c.p, c.value); if (v == null) drop.push(c.p); else put.push({ p: c.p, v: JSON.stringify(v) }); });
  var st = [];
  if (drop.length) st.push(opTag(env.DB.prepare('DELETE FROM ops_period_summary WHERE department_id=?1 AND resource=?2 AND period IN(SELECT value FROM json_each(?3))').bind(info.dept, info.resource, JSON.stringify(drop)), [opKeyOf(info)]));
  rsChunks(put).forEach(function (part) {
    st.push(opTag(env.DB.prepare("INSERT INTO ops_period_summary(department_id,resource,period,rev,v_json) SELECT ?1,?2,json_extract(j.value,'$.p'),COALESCE((SELECT CAST(v AS INTEGER) FROM meta WHERE k='rev'),0),json_extract(j.value,'$.v') FROM json_each(?3)j WHERE 1 ON CONFLICT(department_id,resource,period) DO UPDATE SET rev=excluded.rev,v_json=excluded.v_json")
      .bind(info.dept, info.resource, JSON.stringify(part)), [opKeyOf(info)]));
  });
  return st;
}
function opKeyOf(info) { return 'bsdept:' + info.dept + ':' + info.resource; }
function opTag(statement, keys) { try { statement.__opKeys = keys; } catch (e) { return statement; } return statement; }
function opLayoutPendingOf(row) { var v = parseJson(row && row.v, []); return Array.isArray(v) ? v.filter(function (d) { return typeof d === 'string'; }) : []; }
function opLayoutStatement(env) { return env.DB.prepare("SELECT v FROM meta WHERE k='" + OP_LAYOUT_KEY + "'"); }
function opSplitResources() { return opDefinitions().filter(function (d) { return !!d.period; }).map(function (d) { return d.resource; }); }
function opPeriodsLegacyPrepare(env) {
  return { before: [], after: [env.DB.prepare("INSERT INTO meta(k,v) SELECT '" + OP_LAYOUT_KEY + "',x FROM (SELECT json_group_array(d) x,COUNT(*) n FROM (SELECT DISTINCT department_id d FROM ops_nodes WHERE resource IN (SELECT value FROM json_each(?1)) ORDER BY d)) WHERE n>0 ON CONFLICT(k) DO UPDATE SET v=excluded.v").bind(JSON.stringify(opSplitResources()))] };
}
function opRouteError(error) {
  var guard = dbGuardFailure(error); if (guard) return json({ ok: 0, err: guard.err }, guard.status);
  if (error && (error.rs || error.ocCode)) return json(Object.assign({ ok: 0, err: error.rs || error.ocCode }, error.msg ? { msg: error.msg } : {}), error.status || 400);
  if (/KIVO_RESTORE_TARGET|KIVO_REV_CONFLICT|KIVO_RESTORE_EPOCH/.test(String(error))) return json({ ok: 0, err: 'conflict' }, 409);
  var lim = dbLimitResponse(null, error, '/api/operations'); if (lim) return lim;
  throw error;
}
async function opPeriodMembers(env, info) {
  var def = opPeriodDef(info), spec = opContainerSpec(info);
  var rows = (await env.DB.prepare('SELECT member_key AS m, position AS p FROM ops_nodes WHERE department_id=?1 AND resource=?2 AND parent_key=?3 ORDER BY position, member_key').bind(info.dept, info.resource, opContainerKey(def)).all()).results || [];
  return rows.filter(function (r) { return typeof r.m === 'string' && (def.field || !ocOwn(spec.fields || {}, r.m)); });
}
async function opSummaryRoute(env, request, url, session) {
  if (request.method !== 'GET') return json({ ok: 0, err: 'method' }, 405);
  var mismatch = sessUidMismatch(env, url, session, '/api/operations/summary'); if (mismatch) return mismatch;
  try {
    var K = String(url.searchParams.get('key') || ''), info = opSplitResource(K); if (!info) throw ocError('read-keys');
    var def = opPeriodDef(info), grps = String(url.searchParams.get('grp') || '').split(',').filter(Boolean), from = url.searchParams.get('from'), to = url.searchParams.get('to');
    if ((!grps.length && (from == null || to == null)) || grps.length > OP_LIM.rangeGroups) throw ocError('read-keys');
    var reference = await rsReferenceSnapshot(env, session.uid, { operationalKeys: [], departments: [info.dept] }), A = reference.A; env = reference.env;
    if (!canRead(A, K)) return json({ ok: 0, err: 'operations-denied' }, 403);
    var lo = from == null ? 0 : opPeriodIdx(def, from).seq, hi = to == null ? 0 : opPeriodIdx(def, to).seq;
    var names = opPeriodOrder(def, (await opPeriodMembers(env, info)).map(function (r) { return r.m; }).filter(function (p) {
      var x = opPeriodIdx(def, p); return grps.length ? grps.indexOf(x.grp) >= 0 : x.seq >= lo && x.seq <= hi;
    }));
    if (names.length > OP_LIM.summaryRows) throw opLimError('read-too-large', 413, { periods: names.length, cap: OP_LIM.summaryRows });
    var got = await env.DB.batch([env.DB.prepare('SELECT k,rev FROM revs WHERE k IN(SELECT value FROM json_each(?1))').bind(JSON.stringify(names.map(function (p) { return K + '@' + p; }).concat([K + '@*'])))]);
    var have = {}, revs = {}; (got[0].results || []).forEach(function (r) { revs[r.k] = rsNat(r.rev); });
    for (var c1 = 0; c1 < names.length; c1 += 31) (((await env.DB.prepare('SELECT period,rev,v_json FROM ops_period_summary WHERE department_id=?1 AND resource=?2 AND period IN(SELECT value FROM json_each(?3))').bind(info.dept, info.resource, JSON.stringify(names.slice(c1, c1 + 31))).all()).results) || []).forEach(function (r) { have[r.period] = r; });   /* v.kpi يكبر بالفترة: شهرٌ في كل استدعاء */
    var stale = names.filter(function (p) { return !have[p] || rsNat(have[p].rev) < opPeriodRev(revs, K, p); }), fresh = {}, later = stale.slice(OP_LIM.readPeriods * 3);
    stale = stale.slice(0, OP_LIM.readPeriods * 3);
    for (var i = 0; i < stale.length; i += OP_LIM.readPeriods) {
      var part = stale.slice(i, i + OP_LIM.readPeriods), sc = {}; sc[K] = { periods: part };
      var st = await opLoadMany(env, [K], 1, sc), parts = opSplit(info, st.values[K] == null ? undefined : JSON.parse(st.values[K]));
      part.forEach(function (p) { fresh[p] = ocOwn(parts.periods, p) ? opSummaryValue(info, p, parts.periods[p]) : null; });
    }
    await env.DB.batch(rsReferenceGuards(env, reference));
    return json({ ok: 1, key: K, rows: names.map(function (p) { var x = opPeriodIdx(def, p); return { p: p, grp: x.grp, seq: x.seq, rev: opPeriodRev(revs, K, p), v: ocOwn(fresh, p) ? fresh[p] : later.indexOf(p) >= 0 ? null : parseJson(have[p].v_json, null), stale: later.indexOf(p) >= 0 ? 1 : undefined }; }) });
  } catch (error) { return opRouteError(error); }
}
async function opReceiptRoute(env, request, url, session) {
  if (request.method !== 'GET') return json({ ok: 0, err: 'method' }, 405);
  var mismatch = sessUidMismatch(env, url, session, '/api/operations/receipt'); if (mismatch) return mismatch;
  var id = String(url.searchParams.get('id') || '');
  if (!/^[-A-Za-z0-9_]{8,100}$/.test(id)) return json({ ok: 0, err: 'operations-request-id' }, 400);
  var row = await env.DB.prepare("SELECT revision,result_json FROM restore_operations WHERE account_uid=?1 AND request_id=?2 AND mode='operations'").bind(session.uid, id).first();
  if (!row) return json({ ok: 1, found: 0 });
  var r = parseJson(row.result_json, {}) || {};
  return json({ ok: 1, found: 1, v: rsNat(row.revision), revs: isObj(r.revs) ? r.revs : {} });
}
async function opPeriodsMigrateRoute(env, request, session) {
  if (request.method !== 'POST') return json({ ok: 0, err: 'method' }, 405);
  try {
    var A = await actorOf(env, session.uid); if (!A) return json({ ok: 0, err: 'session' }, 401);
    if (A.u.role !== 'super') return json({ ok: 0, err: 'operations-periods-migrate-permission' }, 403);
    var body = parseJson(await request.text(), null); if (!isObj(body) || typeof body.dept !== 'string') return json({ ok: 0, err: 'bad-body' }, 400);
    var pending = opLayoutPendingOf(await opLayoutStatement(env).first()), list = body.dept === 'all' ? pending.slice() : rsScopeDepartments([body.dept]) || [], out = [];       var t0 = Date.now(), budget = Math.min(Math.max(Number(body.budgetMs) || 20000, 1000), 25000), from = isObj(body.from) ? body.from : null;
    for (var d of list) {
      var rep = { dept: d, resources: {}, ok: 0 }, revPairs = [], Rs = opSplitResources(), r0 = from && d === body.dept ? Math.max(0, Rs.indexOf(from.r)) : 0;
      try {
        for (var ri = 0; ri < Rs.length; ri++) {
          var R = Rs[ri];
          var K = 'bsdept:' + d + ':' + R, info = opInfo(K), def = opPeriodDef(info), tables = ocPhysicalTables(info.prepared);
          var members = await opPeriodMembers(env, info), rv = await env.DB.prepare('SELECT rev FROM revs WHERE k=?1').bind(K).first();
          revPairs.push([K, rsNat(rv && rv.rev || 0)]);
          var pos = members.map(function (m) { return m.p; }).sort(function (a, b) { return a - b; });
          var tnames = Object.keys(tables), sum = function (where) { return 'SELECT ' + tnames.map(function (t2) { return '(SELECT COUNT(*) FROM ' + where(t2) + ')'; }).join('+') + ' AS n'; };
          var total = Number((await env.DB.prepare(sum(function (t2) { return t2 + ' WHERE department_id=?1 AND resource=?2'; })).bind(d, R).first('n')) || 0);
          if (!total) { rep.resources[R] = { periods: 0, rows: 0 }; continue; }
          var names = members.map(function (m) { return m.m; }), sums = [];
                    /* تغطيةٌ بلا مدياتٍ كثيرة: كلُّ عقدةٍ تحت الحاوية/e: جذرُها عضوٌ في الحاوية (صفُّ جذرها موجود) — والكياناتُ مربوطةٌ بعقدها (FK) */
          var E = opContainerKey(def) + '/e:', L = E.length, orphans = Number((await env.DB.prepare("SELECT COUNT(*) n FROM ops_nodes x WHERE x.department_id=?1 AND x.resource=?2 AND x.row_key>=?3 AND x.row_key<?4 AND NOT EXISTS(SELECT 1 FROM ops_nodes m WHERE m.department_id=?1 AND m.resource=?2 AND m.parent_key=?5 AND m.row_key=CASE WHEN instr(substr(x.row_key,?6),'/')>0 THEN substr(x.row_key,1,?7+instr(substr(x.row_key,?6),'/')-1) ELSE x.row_key END)").bind(d, R, E, opContainerKey(def) + '/e;', opContainerKey(def), L + 1, L).first('n')) || 0), covered = orphans ? total - orphans : total;
          if (ri < r0) { rep.resources[R] = { periods: names.length, rows: total, earlier: 1 }; if (covered !== total) throw Object.assign(ocError('period-coverage'), { rows: total, covered: covered }); continue; }
          var i0 = from && ri === r0 && d === body.dept ? Math.max(0, Number(from.i) || 0) : 0;
          for (var i = i0; i < names.length; i += 20) {
            if (Date.now() - t0 > budget) { if (sums.length) for (var j0 = 0; j0 < sums.length; j0 += 200) await env.DB.batch(opSummaryStatements(env, info, sums.slice(j0, j0 + 200))); rep.more = 1; rep.next = { r: R, i: i }; out.push(rep); return json({ ok: 0, more: 1, departments: out, next: { dept: d, from: rep.next }, pending: opLayoutPendingOf(await opLayoutStatement(env).first()) }); }
            var part = names.slice(i, i + 20), sc = {}; sc[K] = { periods: part };
            var st = await opLoadMany(env, [K], 1, sc), parts = opSplit(info, st.values[K] == null ? undefined : JSON.parse(st.values[K]));
            part.forEach(function (p) { if (!ocOwn(parts.periods, p)) throw Object.assign(ocError('period-verify'), { period: p }); sums.push({ p: p, value: parts.periods[p] }); });
          }
          if (covered !== total) throw Object.assign(ocError('period-coverage'), { rows: total, covered: covered });
          if (new Set(pos).size !== pos.length) throw ocError('period-positions');             for (var j = 0; j < sums.length; j += 200) await env.DB.batch(opSummaryStatements(env, info, sums.slice(j, j + 200)));
          rep.resources[R] = { periods: names.length, rows: total };
        }
                await env.DB.batch(opRevGuards(env, revPairs).concat([env.DB.prepare("UPDATE meta SET v=(SELECT COALESCE(json_group_array(value),'[]') FROM json_each(meta.v) WHERE value<>?1) WHERE k='" + OP_LAYOUT_KEY + "'").bind(d)]));
        rep.ok = 1;
        logEv('info', 'ops-periods-migrate', { rid: env.__rid, dept: d, res: Object.keys(rep.resources).length });
      } catch (e) {
        if (!(e && (e.ocCode || e.rs)) && !dbLimitFailure(e)) throw e;
        rep.err = e.ocCode || e.rs || dbLimitFailure(e).err; if (e.period) rep.period = e.period;
      }
      out.push(rep);
    }
    var left = opLayoutPendingOf(await opLayoutStatement(env).first());
    return json({ ok: out.every(function (r) { return r.ok; }) ? 1 : 0, departments: out, pending: left });
  } catch (error) { return opRouteError(error); }
}
function opSaveBudget(statements) {
  /* حجمُ المسلسل كما يقيسه D1 (نصٌّ فيه حرفٌ فوق U+00FF بايتان للحرف) — 30MB تحت سقف 32MiB للاستدعاء */
  var size = function (t) { return /[^\u0000-\u00ff]/.test(t) ? t.length * 2 : t.length; }, n = 0;
  statements.forEach(function (s) { n += size(String((s && s.__sql) || '')); ((s && s.__args) || []).forEach(function (v) { if (typeof v === 'string') n += size(v); }); });
  if (statements.length > OP_LIM.batchStmts || n > OP_LIM.batchBytes) throw opLimError('batch-budget', 413, { statements: statements.length, bytes: n });
}
