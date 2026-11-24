/* Canonical SQL resource access and row compiler. Policy engines consume a
   derived projection in memory; no operational JSON is read/written in KV. */
var OP_PREPARED = null;
function opDefinitions() { return OC_SCHEDULING_RESOURCES.concat(OC_PEOPLE_TASK_RESOURCES); }
function opRegistry() {
  if (!OP_PREPARED) {
    var out = Object.create(null), all = ocPrepare(opDefinitions(), OC_TABLE_NAMES);
    opDefinitions().forEach(function (definition) { out[definition.resource] = { definition: definition, prepared: ocForResource(all, definition.resource) }; });
    OP_PREPARED = out;
  }
  return OP_PREPARED;
}
function opPrepared(resource) { var entry = opRegistry()[resource]; if (!entry) throw ocError('resource'); return entry.prepared; }
function opIsResource(k) { return !!opRegistry()[resName(k)]; }
function opInfo(k) {
  var resource = resName(k), entry = opRegistry()[resource]; if (!entry) return null;
  var p = parseKey(k), dept = p.dept;
  if (typeof dept !== 'string' || !dept || dept.length > 200 || dept.indexOf(':') >= 0 || k !== 'bsdept:' + dept + ':' + resource) throw ocError('resource-scope');
  return { dept: dept, resource: resource, definition: entry.definition, prepared: entry.prepared };
}
function opPhysicalTables() {
  var out = {}; opDefinitions().forEach(function (definition) { Object.assign(out, ocPhysicalTables(opPrepared(definition.resource))); }); return out;
}
function opResetStatements(env) {
  return Object.keys(opPhysicalTables()).filter(function (table) { return table !== 'ops_nodes'; })
    .map(function (table) { return env.DB.prepare('DELETE FROM ' + table); })
    .concat([env.DB.prepare('UPDATE ops_nodes SET parent_key=NULL'),env.DB.prepare('DELETE FROM ops_nodes'),env.DB.prepare('DELETE FROM ops_period_summary')]);   /* V7 · 53: والملخّصاتُ معها */
}
function opBulkInstall(env, resource, domain) {
  var statements = [], prepared = opPrepared(resource), rows = ocPhysicalRows(prepared, domain), tables = ocPhysicalTables(prepared);
  Object.keys(tables).forEach(function (table) { statements.push.apply(statements, opUpsertRows(env, {table: table, columns: tables[table]}, rows[table] || [])); });
  return statements;
}
function opUpsertRows(env, spec, rows) {
  var columns = spec.columns, mutable = columns.filter(function (c) { return c !== 'department_id' && c !== 'resource' && c !== 'row_key'; });
  return rsChunks(rows).map(function (part) {
    return env.DB.prepare('INSERT INTO ' + spec.table + '(' + columns.join(',') + ') SELECT ' + columns.map(function (c) { return "json_extract(j.value,'$." + c + "')"; }).join(',') +
      ' FROM json_each(?1) j WHERE 1 ON CONFLICT(department_id,resource,row_key) DO UPDATE SET ' + mutable.map(function (c) { return c + '=excluded.' + c; }).join(',')).bind(JSON.stringify(part));
  });
}
/* V7 · 53 */
function opRevGuards(env, pairs) {
  return rsChunks(pairs).map(function (part) {
    return env.DB.prepare("SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(?1)j WHERE COALESCE((SELECT rev FROM revs WHERE k=json_extract(j.value,'$[0]')),0)<>json_extract(j.value,'$[1]'))THEN json_extract('{}','KIVO_REV_CONFLICT')END").bind(JSON.stringify(part));
  });
}
function opLegacyError(error) {
  if (!/KIVO_OPERATIONS_LEGACY_SOURCE/.test(String(error && error.message || error))) return error;
  var e = ocError('legacy-source-present'); e.status = 503; return e;
}
// retired: also run opRetiredGuard inside the read batch (replaces a separate opGuardRetired round trip).
/* V7 · 53: scopes { <key>: { periods:[…], base? , bases:{p:rev}? } } */
async function opLoadMany(env, keys, retired, scopes) {
  scopes = scopes || env.__opScope || {};
  var wanted = Array.from(new Set(keys)), requests = [], batch = [], revs = {}, tableRequests = {}, physicalByKey = {}, revKeys = [];
  wanted.forEach(function (key) {
    var info = opInfo(key); if (!info) throw ocError('resource');
    var def = opPeriodDef(info), scope = def && ocOwn(scopes, key) ? Object.assign({}, scopes[key], { periods: Array.from(new Set(scopes[key].periods)) }) : null, ranges = [['', '￿']];
    if (scope) {
      ranges = opHeadRanges(def);
      scope.periods.forEach(function (p) { ranges = ranges.concat(opPeriodRanges(def, p)); });
      revKeys.push(key + '@', key + '@*'); scope.periods.forEach(function (p) { revKeys.push(key + '@' + p); });
    }
    var request = { key: key, info: info, def: def, scope: scope, tables: ocPhysicalTables(info.prepared) }; physicalByKey[key] = {};
    Object.keys(request.tables).forEach(function (table) {
      if (!tableRequests[table]) tableRequests[table] = { columns:request.tables[table], ranges:[] };
      ranges.forEach(function (r) { tableRequests[table].ranges.push([info.dept, info.resource, r[0], r[1]]); });
      physicalByKey[key][table] = [];
    });
    requests.push(request);
  });
  var tableNames=Object.keys(tableRequests), later=[];
  /* V7 · 53: مدياتٌ كثيرة (فتراتٌ كثيرة) تُقرأ قطعاً في استدعاءات D1 متتالية بعد هذه الدفعة (مراجعاتُها فيها، وحارسُ CAS عند الاعتماد) — فلا يقترب استدعاءٌ من سقف 32MiB */
  tableNames.forEach(function(table){
    var query=tableRequests[table], sel='SELECT '+query.columns.map(function(c){return 't.'+c;}).join(',')+' FROM json_each(?1) q JOIN '+table+" t ON t.department_id=json_extract(q.value,'$[0]') AND t.resource=json_extract(q.value,'$[1]') AND t.row_key>=json_extract(q.value,'$[2]') AND t.row_key<json_extract(q.value,'$[3]')";
    for (var c0 = 0; c0 < query.ranges.length || !c0; c0 += 48) { var st0 = env.DB.prepare(sel).bind(JSON.stringify(query.ranges.slice(c0, c0 + 48))); if (!c0) batch.push(st0); else (later[c0 / 48 - 1] = later[c0 / 48 - 1] || []).push({ table: table, st: st0 }); }
  });
  if (!batch.length) { if (retired) await opGuardRetired(env); return { values: {}, domains: {}, guards: [], snapshots: [], revs: {}, members: {}, globalRev:await bdGlobalRevision(env) }; }
  if (retired) batch.unshift(opRetiredGuard(env));
  var offset = retired ? 1 : 0;
  var revisionIndex=batch.length-offset, scoped = requests.filter(function (r) { return r.scope; });
  batch.push(env.DB.prepare('SELECT k,rev FROM revs WHERE k IN(SELECT value FROM json_each(?1))').bind(JSON.stringify(wanted.concat(revKeys))));
  batch.push(env.DB.prepare("SELECT v FROM meta WHERE k='rev'"));
  batch.push(opLayoutStatement(env));
  /* أعضاءُ الحاوية (اسمُ الفترة · row_key · موضعُها) لكل موردٍ منطاق — من فهرس ops_nodes_parent، صفٌّ لكل فترة لا شجرتُها */
  if (scoped.length) batch.push(env.DB.prepare("SELECT n.department_id d,n.resource r,n.member_key m,n.row_key k,n.position p FROM json_each(?1) q JOIN ops_nodes n ON n.department_id=json_extract(q.value,'$[0]') AND n.resource=json_extract(q.value,'$[1]') AND n.parent_key=json_extract(q.value,'$[2]')")
    .bind(JSON.stringify(scoped.map(function (r) { return [r.info.dept, r.info.resource, opContainerKey(r.def)]; }))));
  var result, values = {}, domains = {}, guards = [], snapshots = [], revPairs = [], periodItems = [], members = {};
  try { result = await env.DB.batch(batch); } catch (error) { throw opLegacyError(error); }
  result.forEach(function (entry) { if (!entry || entry.success === false) throw ocError('read'); });
  result = result.slice(offset);
  tableNames.forEach(function(table,index){(result[index].results||[]).forEach(function(row){
    var key='bsdept:'+row.department_id+':'+row.resource;
    if(!physicalByKey[key]||!physicalByKey[key][table])throw ocError('read-scope');
    physicalByKey[key][table].push(row);
  });});
  for (var piece of later) {
    var got = await env.DB.batch(piece.map(function (x) { return x.st; }));
    piece.forEach(function (x, i) { (got[i].results || []).forEach(function (row) { var key = 'bsdept:' + row.department_id + ':' + row.resource; if (!physicalByKey[key] || !physicalByKey[key][x.table]) throw ocError('read-scope'); physicalByKey[key][x.table].push(row); }); });
  }
  (result[revisionIndex].results || []).forEach(function (row) { revs[row.k] = rsNat(row.rev); });
  var pending = opLayoutPendingOf(((result[revisionIndex + 2].results) || [])[0]);
  if (scoped.length) (result[revisionIndex + 3].results || []).forEach(function (row) { var k = 'bsdept:' + row.d + ':' + row.r; (members[k] = members[k] || []).push({ p: row.m, k: row.k, pos: row.p }); });
  requests.forEach(function (request) {
    var info = request.info, physical = physicalByKey[request.key], key = request.key;
    var domain = ocFromPhysical(info.prepared, info.dept, info.resource, physical, { skip: 1 }), projection = ocInflate(info.prepared, domain, request.scope ? { partial: 1 } : { trust: 1 });
    values[key] = projection.present ? JSON.stringify(projection.value) : null;
    domains[key] = domain;
    if (request.scope) {
      domain.scope = { periods: request.scope.periods.slice(), members: members[key] || [], pending: pending.indexOf(info.dept) >= 0 };
      /* الحفظُ بالفترة (063 opPeriodSave): ما قرأه العميلُ لكل فترةٍ يطابق الآن — وإلا تعارض؛ ومراجعةُ المفتاح كلِّه لا تُحرس (فتراتٌ أخرى تُكتب بالتوازي بلا تعارض) */
      var bases = request.scope.bases || {};
      Object.keys(bases).forEach(function (p) { if (opPeriodRev(revs, key, p) !== bases[p]) { var e = rsError('conflict', 409); e.period = p; e.key = key; throw e; } });
      if (request.scope.base !== undefined) revs[key] = request.scope.base;
      periodItems.push([key, '', opPeriodRev(revs, key, '')]);
      request.scope.periods.forEach(function (p) { periodItems.push([key, p, opPeriodRev(revs, key, p)]); });
    } else domain.scope = { pending: pending.indexOf(info.dept) >= 0 };
    Object.keys(request.tables).forEach(function (table) { snapshots.push({ domain: 'operations', table: key + ':' + table, rows: physical[table] }); });
    if (!ocOwn(revs, key)) revs[key] = 0;
    if (!request.scope) revPairs.push([key, revs[key]]);
  });
  guards.push.apply(guards, opRevGuards(env, revPairs).concat(periodItems.length ? opPeriodRevGuards(env, periodItems) : []));
  return { values: values, domains: domains, guards: guards, snapshots: snapshots, revs: revs, members: members, pending: pending, globalRev:opGlobalRevOf(result[revisionIndex+1]) };
}
function opGlobalRevOf(r) { var row=(r&&r.results||[])[0];if(!row)return 0;var value=Number(row.v);if(!Number.isSafeInteger(value)||value<0)throw rsError('domain-revision',503);return value; }   // RISHAD-266: an absent global rev row is 0 (as every writer COALESCEs it); a corrupt one is a named 503, not a TypeError 500
async function opResourceMany(env, keys) {
  var sql = [], kv = [], result = {}, cached = env.__opCapture;
  keys.forEach(function (key) {
    if (!opIsResource(key)) {
      if(env.__pre&&env.__pre.live&&ocOwn(env.__pre.kv,key))result[key]=env.__pre.kv[key];else kv.push(key);
    }
    else if (cached && env.__pre && env.__pre.live && ocOwn(cached.keys, key)) result[key] = cached.keys[key];
    else sql.push(key);
  });
  if (kv.length) Object.assign(result, await kvMany(env, 'kv', kv));
  // RISHAD-266 · s1: a department-scoped reference loads what it was not given into its own capture (fenced, 019d).
  if (sql.length && cached && env.__pre && env.__pre.live && env.__pre.track) {
    await rsScopeOperational(env, cached, sql);
    sql.forEach(function (key) { result[key] = cached.keys[key]; });
    sql = [];
  }
  if (sql.length) Object.assign(result, (await opLoadMany(env, sql, 1)).values);
  return result;
}
async function opResourceGet(env, key) { return (await opResourceMany(env, [key]))[key]; }
async function opCommandReceipt(env,A,command,requestId,body) {
  if(typeof requestId!=='string'||!/^[-A-Za-z0-9_]{8,100}$/.test(requestId))throw rsError('operations-request-id');
  var fingerprint=await cuFingerprint({uid:A.u.id,command:command,body:body}),
    row=await env.DB.prepare('SELECT * FROM restore_operations WHERE account_uid=?1 AND request_id=?2').bind(A.u.id,requestId).first();
  if(row&&(row.mode!=='operations'||row.fingerprint!==fingerprint))throw rsError('operations-request-reused',409);
  return {fingerprint:fingerprint,receipt:row?Object.assign(JSON.parse(row.result_json),{duplicate:1,v:row.revision}):null};
}
async function opCaptureReferences(env, raw, wanted) {
  var keys = Object.assign(Object.create(null), raw), scoped = wanted;
  if (!scoped) {
    var departments = parseJson(raw[K_DEPTS] || '[]', null); if (!Array.isArray(departments)) throw ocError('departments');
    scoped = []; departments.forEach(function (department) {
      if (!department || typeof department.id !== 'string' || !department.id || department.id.includes(':')) throw ocError('departments');
      opDefinitions().forEach(function (definition) { scoped.push('bsdept:' + department.id + ':' + definition.resource); });
    });
  }
  scoped = scoped.filter(opIsResource);
  var state = await opLoadMany(env, scoped, 1); Object.assign(keys, state.values);
  return { keys: keys, guards: [opRetiredGuard(env)].concat(state.guards), snapshots: state.snapshots, domains: state.domains, revs: state.revs, globalRev:state.globalRev };
}
async function opChangeStatements(env, key, nextRaw, options) {
  options = options || {};
  var info = opInfo(key); if (!info) throw ocError('resource');
  if (options.state) await opGuardRetired(env);
  var state = options.state || await opLoadMany(env, [key], 1), before = state.domains[key],
    base = options.base === undefined ? state.revs[key] : rsNat(options.base);
  if (base !== state.revs[key]) throw rsError('conflict', 409);
  var next;
  try { next = nextRaw == null ? undefined : JSON.parse(nextRaw); } catch (e) { throw ocError('json'); }
  var def = opPeriodDef(info), scope = before && before.scope && before.scope.periods ? before.scope : null;
  /* V7 · 53: إدارةٌ لم تُتمَّ المرحلةَ الثانية من 0013 */
  if (def && before && before.scope && before.scope.pending) throw opLimError('ops-layout-pending', 503);
  var after = ocConvert(info.prepared, info.dept, info.resource, next, nextRaw != null), statements = [], changed = false, extra = [], periodKeys = [], sums = [];
  if (def) {
    /* ما تغيّر من الفترات والرأس (بالقيمة) — لمراجعاتها وملخّصاتها وحدّ حجمها */
    var prevRaw = state.values && ocOwn(state.values, key) ? state.values[key] : null, prev = prevRaw == null ? undefined : JSON.parse(prevRaw),
      A0 = opSplit(info, prev), B0 = opSplit(info, next), names = new Set(Object.keys(A0.periods).concat(Object.keys(B0.periods)));
    if (scope) Array.from(names).forEach(function (p) { if (scope.periods.indexOf(p) < 0) throw ocError('period-scope'); });
    names.forEach(function (p) {
      var x = ocOwn(A0.periods, p) ? JSON.stringify(A0.periods[p]) : undefined, y = ocOwn(B0.periods, p) ? JSON.stringify(B0.periods[p]) : undefined;
      if (x === y) return;
      if (y !== undefined) opPeriodSizeCheck(def, p, B0.periods[p]);
      periodKeys.push(key + '@' + p); sums.push({ p: p, value: y === undefined ? undefined : B0.periods[p] });
    });
    if (JSON.stringify(A0.head) !== JSON.stringify(B0.head)) { opPeriodSizeCheck(def, '', B0.head); periodKeys.push(key + '@'); }
    if (scope) extra = opScopedPositions(env, info, def, before, after, scope, next);
  }
  var physicalBefore = ocPhysicalRows(info.prepared, before), physicalAfter = ocPhysicalRows(info.prepared, after), tables = ocPhysicalTables(info.prepared);
  Object.keys(tables).reverse().forEach(function (table) {
    var keep = new Set(physicalAfter[table].map(function (row) { return row.row_key; })), remove = physicalBefore[table].filter(function (row) { return !keep.has(row.row_key); });
    if (!remove.length) return; changed = true;
    var chunks=rsChunks(remove.map(function (row) { return row.row_key; }));
    // D1 limits cascading triggers more tightly than schema depth. Detach only
    // removed nodes, in every chunk, before deleting any anchor. All statements
    // stay in the guarded transaction; surviving rows retain their exact FKs.
    if(table==='ops_nodes')chunks.forEach(function(part){
      statements.push(env.DB.prepare('UPDATE ops_nodes SET parent_key=NULL WHERE department_id=?1 AND resource=?2 AND row_key IN(SELECT value FROM json_each(?3))').bind(info.dept,info.resource,JSON.stringify(part)));
    });
    chunks.forEach(function (part) {
      statements.push(env.DB.prepare('DELETE FROM ' + table + ' WHERE department_id=?1 AND resource=?2 AND row_key IN(SELECT value FROM json_each(?3))').bind(info.dept, info.resource, JSON.stringify(part)));
    });
  });
  Object.keys(tables).forEach(function (table) {
    var spec = {table: table, columns: tables[table]}, prior = new Map(physicalBefore[table].map(function (row) { return [row.row_key, JSON.stringify(spec.columns.map(function (c) { return row[c]; }))]; }));
    var write = physicalAfter[table].filter(function (row) { return prior.get(row.row_key) !== JSON.stringify(spec.columns.map(function (c) { return row[c]; })); });
    if (write.length) changed = true;
    statements.push.apply(statements, opUpsertRows(env, spec, write));
  });
  if (extra.length) { changed = true; statements.push.apply(statements, extra); }
  if (changed && def) statements.push.apply(statements, opSummaryStatements(env, info, sums));
  statements.forEach(function (st) { opTag(st, [key]); });
  return { guards: [opRetiredGuard(env)].concat(state.guards), statements: statements, snapshots: state.snapshots,
    revisionKeys: changed ? [key].concat(periodKeys) : [], changed: changed, domain: after };
}
/* V7 · 53: حفظٌ منطاق (الرأس + فتراتٌ بعينها): ocConvert رقّم أعضاءَ */
function opScopedPositions(env, info, def, before, after, scope, next) {
  var C = opContainerKey(def), cspec = opContainerSpec(info), oldPos = {}, members = scope.members || [];
  members.forEach(function (m) { if (typeof m.p === 'string') oldPos[m.p] = m.pos; });
  var crow = function (rows, table, rk) { return (rows[table] || []).filter(function (r) { return r.row_key === rk; })[0]; };
  Object.keys(cspec.fields || {}).forEach(function (f) {
    if (cspec.fields[f].kind !== 'scalar') return;
    var seg = cspec.fieldSpecs[f], rk = seg === cspec ? C : C + '/p:' + cspec.segments.indexOf(seg), r = crow(before.rows, seg.table, rk);
    if (r && r[ocField(f) + '_kind'] !== 0) oldPos[f] = r[ocField(f) + '_position'];
  });
  var box = def.field ? (next && ocObj(next) && ocObj(next[def.field]) ? next[def.field] : null) : (ocObj(next) ? next : null);
  if (!box) return [];
  var nextKeys = Object.keys(box), inNext = new Set(nextKeys), inScope = new Set(scope.periods);
  var fixed = function (k) { return ocOwn(cspec.fields || {}, k); };
  var order = Object.keys(oldPos).sort(function (a, b) { return oldPos[a] - oldPos[b]; })
    .filter(function (k) { return inNext.has(k) || !(inScope.has(k) || fixed(k)); });
  nextKeys.forEach(function (k) { if (!ocOwn(oldPos, k)) order.push(k); });
  var newPos = {}; order.forEach(function (k, i) { newPos[k] = i; });
  /* الصفوفُ المكتوبة: مواضعُ أعضاء الحاوية والحقولِ الثابتة المفردة */
  Object.keys(after.rows).forEach(function (table) {
    after.rows[table].forEach(function (r) {
      if (r.parent_key === C && typeof r.member_key === 'string' && ocOwn(newPos, r.member_key)) r.position = newPos[r.member_key];
      if (r.row_key === C || r.row_key.indexOf(C + '/p:') === 0 && r.parent_key === C)
        Object.keys(cspec.fields || {}).forEach(function (f) { if (cspec.fields[f].kind === 'scalar' && ocOwn(r, ocField(f) + '_position') && r[ocField(f) + '_kind'] !== 0 && ocOwn(newPos, f)) r[ocField(f) + '_position'] = newPos[f]; });
    });
  });
  var moved = members.filter(function (m) { return !inScope.has(m.p) && !fixed(m.p) && ocOwn(newPos, m.p) && newPos[m.p] !== m.pos; }).map(function (m) { return [m.k, newPos[m.p]]; });
  return rsChunks(moved).map(function (part) {
    return env.DB.prepare("UPDATE ops_nodes SET position=(SELECT json_extract(j.value,'$[1]') FROM json_each(?3)j WHERE json_extract(j.value,'$[0]')=ops_nodes.row_key) WHERE department_id=?1 AND resource=?2 AND row_key IN(SELECT json_extract(value,'$[0]') FROM json_each(?3))").bind(info.dept, info.resource, JSON.stringify(part));
  });
}
async function opCompilePending(env, plan, pending, capture) {
  for (var item of pending) {
    if(plan.operation!=='save'&&plan.body.mode==='merge'){
      var current=capture&&capture.domains[item.k]|| (await opLoadMany(env,[item.k])).domains[item.k];
      if(ocInflate(opInfo(item.k).prepared,current).present)throw rsError('restore-operations-merge-target-not-empty',409);
    }
    var addition = await opChangeStatements(env, item.k, item.act === 'del' ? null : item.v, { base: item.have, state: capture && capture.domains[item.k] ? {
      domains: capture.domains, revs: capture.revs, values: capture.keys, guards: [] , snapshots: capture.snapshots.filter(function (s) { return s.table.startsWith(item.k + ':'); })
    } : undefined });
    plan.guards.push.apply(plan.guards, addition.guards); plan.statements.push.apply(plan.statements, addition.statements);
    plan.revisionKeys.push.apply(plan.revisionKeys, addition.revisionKeys); plan.snapshots.push.apply(plan.snapshots, addition.snapshots);
  }
  if (plan.operation === 'save') opSaveBudget(plan.statements);   /* V7 · 53: حدٌّ مبكر برسالة لا سقفُ D1 */
}
/* V7 · د5-هـ (أمن ٣): القراءةُ تُعاد مرّةً واحدة إن أخفق سياجُها — السياجُ يثبت أن جولاتِها لقطةٌ واحدة متّسقة (السلطةُ والبيانات من لحظةٍ واحدة)
   ولا يحمي كتابة؛ فكتابةٌ متزامنة في جولاتها تعني لقطةً جديدة لا تعارضاً يُعرض. القراءةُ بلا أثر فإعادتُها آمنة، وإخفاقان ⇒ 409 كما كان (لا حلقة).
   تغيّرُ حقبة الاستعادة (KIVO_RESTORE_EPOCH) لا يُعاد: العميلُ يعيد التحميل. */
function opFenceRetry(error) { return !dbGuardFailure(error) && (error && error.rs === 'conflict' || /KIVO_RESTORE_TARGET|KIVO_REV_CONFLICT/.test(String(error))) && !/KIVO_RESTORE_EPOCH/.test(String(error)); }
async function opReadRoute(env, request, url, session) {
  if (request.method !== 'GET') return json({ ok: 0, err: 'method' }, 405);
  var mismatch = sessUidMismatch(env, url, session, '/api/operations/read'); if (mismatch) return mismatch;
  for (var attempt = 0; ; attempt++) {
    try { return await opReadOnce(env, url, session); }
    catch (error) { if (attempt || !opFenceRetry(error)) return opReadFailed(error); }
  }
}
function opReadFailed(error) {
  var guard = dbGuardFailure(error); if (guard) return json({ ok: 0, err: guard.err }, guard.status);
  if (error.rs || error.ocCode) return json(Object.assign({ ok: 0, err: error.rs || error.ocCode }, error.msg ? { msg: error.msg } : {}, error.details ? { at: error.details } : {}), error.status || 400);
  if (/KIVO_RESTORE_TARGET|KIVO_REV_CONFLICT|KIVO_RESTORE_EPOCH/.test(String(error))) return json({ ok: 0, err: 'conflict' }, 409);
  var limit = dbLimitResponse(null, error, '/api/operations/read'); if (limit) return limit;   /* V7 · 53: لا 500 لخطأ D1 */
  throw error;
}
/* V7 · 53 */
var OP_READ_REFS = [@@SYS:oc.read.refs.staff@@'bassam_shift_options_v1', 'bassam_employees_v1'];
function opReadList(url, name) { return Array.from(new Set(String(url.searchParams.get(name) || '').split(',').filter(Boolean))); }
async function opReadOnce(env, url, session) {
  {
    var wanted = opReadList(url, 'keys'), rangeIn = opReadList(url, 'range'), indexIn = opReadList(url, 'index'), groups = {}, mixed = false;
    var group = function (K) { return groups[K] || (groups[K] = { periods: new Set(), full: false, info: opInfo(K) }); };
    if ((!wanted.length && !rangeIn.length && !indexIn.length) || wanted.length > GET_MAX || rangeIn.length > OP_LIM.rangeGroups || indexIn.length > GET_MAX) throw ocError('read-keys');
    wanted.forEach(function (key) {
      var pk = key.indexOf('@') >= 0 ? opPeriodKey(key) : null;
      if (pk) { if (pk.period === '*') throw ocError('read-keys'); group(pk.key).periods.add(pk.period); return; }
      if (!opInfo(key)) throw ocError('read-keys'); group(key).full = true;
    });
    var rangeOf = {};
    rangeIn.forEach(function (r) { var i = r.lastIndexOf('@'), K = r.slice(0, i), g = r.slice(i + 1); if (i < 0 || !g || !opSplitResource(K)) throw ocError('read-keys'); (rangeOf[K] = rangeOf[K] || []).push(g); group(K); });
    indexIn.forEach(function (K) { if (!opSplitResource(K)) throw ocError('read-keys'); group(K); });
    Object.keys(groups).forEach(function (K) { if (groups[K].full && (groups[K].periods.size || rangeOf[K])) mixed = true; });
    if (mixed) throw ocError('period-mixed');
    var depts = Array.from(new Set(Object.keys(groups).map(function (K) { return groups[K].info.dept; })));
    // Establish authority before loading any business rows, including rows of
    // a foreign department requested by a malicious/obsolete client.
    var reference = await rsReferenceSnapshot(env, session.uid, { operationalKeys: [], departments: depts }), A = reference.A;
    env = reference.env;
    var eligible = new Set(Object.keys(groups).filter(function (K) { return canRead(A, K); }));
    /* أعضاءُ الحاوية للمديات والفهارس (صفٌّ لكل فترة) — قبل تحميل أي محتوى */
    var listed = Object.keys(groups).filter(function (K) { return eligible.has(K) && opPeriodDef(groups[K].info) && (rangeOf[K] || indexIn.indexOf(K) >= 0 || groups[K].full); }), memberOf = {}, nodesOf = {};
    if (listed.length) {
      var lr = await env.DB.batch([
        env.DB.prepare("SELECT n.department_id d,n.resource r,n.member_key m FROM json_each(?1) q JOIN ops_nodes n ON n.department_id=json_extract(q.value,'$[0]') AND n.resource=json_extract(q.value,'$[1]') AND n.parent_key=json_extract(q.value,'$[2]')")
          .bind(JSON.stringify(listed.map(function (K) { var I = groups[K].info; return [I.dept, I.resource, opContainerKey(opPeriodDef(I))]; }))),
        env.DB.prepare("SELECT q.value AS k,(SELECT COUNT(*) FROM ops_nodes n WHERE n.department_id=json_extract(q.value,'$[1]') AND n.resource=json_extract(q.value,'$[2]')) AS n FROM json_each(?1) q")
          .bind(JSON.stringify(listed.filter(function (K) { return groups[K].full; }).map(function (K) { var I = groups[K].info; return [K, I.dept, I.resource]; })))]);
      (lr[0].results || []).forEach(function (row) { var K = 'bsdept:' + row.d + ':' + row.r, I = groups[K].info; if (typeof row.m === 'string' && !ocOwn(opContainerSpec(I).fields || {}, row.m) || opPeriodDef(I).field) (memberOf[K] = memberOf[K] || []).push(row.m); });
      (lr[1].results || []).forEach(function (row) { var x = parseJson(row.k, null); if (Array.isArray(x)) nodesOf[x[0]] = Number(row.n) || 0; });
    }
    var ranges = {};
    Object.keys(rangeOf).forEach(function (K) {
      if (!eligible.has(K)) return; var def = opPeriodDef(groups[K].info);
      rangeOf[K].forEach(function (g) {
        var hit = opPeriodOrder(def, (memberOf[K] || []).filter(function (p) { return opPeriodIdx(def, p).grp === g; }));
        ranges[K + '@' + g] = hit.map(function (p) { groups[K].periods.add(p); return K + '@' + p; });
      });
    });
    var periodCount = 0; Object.keys(groups).forEach(function (K) { periodCount += groups[K].periods.size; });
    if (periodCount > OP_LIM.readPeriods) throw opLimError('read-too-large', 413, { periods: periodCount, cap: OP_LIM.readPeriods });
    var failed = {}, scopes = {}, loadKeys = [];
    Object.keys(groups).forEach(function (K) {
      if (!eligible.has(K)) return;
      var G = groups[K];
      if (G.full) { if (opPeriodDef(G.info) && (nodesOf[K] || 0) > OP_LIM.readNodes) { failed[K] = 'read-too-large'; return; } loadKeys.push(K); }
      else if (G.periods.size) { scopes[K] = { periods: Array.from(G.periods).filter(function (p) { return p !== ''; }) }; loadKeys.push(K); }
    });
    /* مراجعُ الإسقاط لكل إدارةٍ مقروءة: الموظفون وخياراتُ الورديات كاملين (صغيران)، والجدولُ الشهريُّ بشهوره اللازمة وحدها */
    var refKeys = [];
    Array.from(new Set(loadKeys.map(function (K) { return groups[K].info.dept; }))).forEach(function (d) {
      var pj = loadKeys.some(function (K) { return groups[K].info.dept === d && ocOwn(ENF_PROJ, resName(resReadAs(K))); });   // uiqa (البند 6): مراجعُ البرامج للإسقاط وحده
      OP_READ_REFS.forEach(function (r) {
        if (!pj && r !== 'bassam_shift_options_v1' && r !== 'bassam_employees_v1') return;
        var R = 'bsdept:' + d + ':' + r, I = opSplitResource(R);
        if (ocOwn(groups, R) && groups[R].full) return;
        if (I) {
          var months = new Set(), cur = typeof opPeriodDef(I).current === 'function' ? opPeriodDef(I).current() : '';
          if (cur) months.add(cur);
          loadKeys.filter(function (K) { return groups[K].info.dept === d; }).forEach(function (K) { var def = opPeriodDef(groups[K].info); if (def) groups[K].periods.forEach(function (p) { if (p) { var g = opPeriodIdx(def, p).grp; if (g) months.add(g); } }); });
          if (!ocOwn(scopes, R)) { scopes[R] = { periods: Array.from(months) }; refKeys.push(R); }
        } else if (refKeys.indexOf(R) < 0 && loadKeys.indexOf(R) < 0) refKeys.push(R);
      });
    });
    var state = { values: {}, domains: {}, guards: [], snapshots: [], revs: {}, globalRev: 0 }, merge = function (x) { ['values', 'domains', 'revs'].forEach(function (f) { Object.assign(state[f], x[f]); }); state.guards = state.guards.concat(x.guards); state.globalRev = Math.max(state.globalRev, x.globalRev || 0); };
    var all = loadKeys.concat(refKeys.filter(function (k) { return loadKeys.indexOf(k) < 0; }));
    if (all.length) {
      try { merge(await opLoadMany(env, all, 1, scopes)); }
      catch (error) {
        if (!dbLimitFailure(error) && !(error && error.rs === 'period-too-large')) throw error;
        /* فشلُ دفعةٍ واحدة لا يُسقط القراءة: كلُّ موردٍ في دفعته، وما فشل وحده في failed */
        for (var one of all) {
          try { merge(await opLoadMany(env, [one], 1, scopes)); }
          catch (e1) { var f1 = dbLimitFailure(e1); if (!f1) throw e1; if (loadKeys.indexOf(one) >= 0) failed[one] = f1.err; }
        }
      }
    }
    reference.operational = { guards: state.guards, keys: state.values, domains: state.domains, revs: state.revs, globalRev: state.globalRev, snapshots: [] };
    Object.assign(reference.inputRevs, state.revs);
    var projKeys = Object.assign(Object.create(null), reference.inputKeys, state.values);
    var resources = {}, absent = [], denied = [], base = {}, enfRefs = await enfRefsFor(env, depts, projKeys), index = {};
    var out = function (key, has, value, rev) { if (has) resources[key] = value; else absent.push(key); base[key] = rev; };
    Object.keys(groups).forEach(function (K) {
      var G = groups[K], def = opPeriodDef(G.info), periodKeys = Array.from(G.periods).map(function (p) { return K + '@' + p; });
      var named = (G.full ? [K] : []).concat(periodKeys.filter(function (pk) { return wanted.indexOf(pk) >= 0 || Object.keys(ranges).some(function (r) { return ranges[r].indexOf(pk) >= 0; }); }));
      if (!eligible.has(K) || !canRead(A, K)) { named.forEach(function (k) { denied.push(k); }); return; }
      if (failed[K]) { periodKeys.forEach(function (pk) { if (named.indexOf(pk) >= 0) failed[pk] = failed[K]; }); if (!G.full) delete failed[K]; return; }
      if (indexIn.indexOf(K) >= 0) index[K] = opPeriodOrder(def, memberOf[K] || []).map(function (p) { var x = opPeriodIdx(def, p); return { p: p, grp: x.grp, seq: x.seq, rev: opPeriodRev(state.revs, K, p) }; });
      if (!named.length) return;
      var raw = ocOwn(state.values, K) ? state.values[K] : null;
      try {
        if (raw != null) raw = enfProjectStr(A, K, raw, enfRefs);
        raw = privOut(A, K, raw, projKeys);   // PRIVACY batch (019u): personal fields by purpose · old nid references as eid
      } catch (eP) { if (eP && (eP.rs || eP.ocCode)) { named.forEach(function (k) { failed[k] = eP.rs || eP.ocCode; }); return; } throw eP; }
      if (G.full) { out(K, raw != null, raw == null ? null : JSON.parse(raw), state.revs[K] || reference.inputRevs[K] || 0); }
      if (!periodKeys.length) return;
      var parts = opSplit(G.info, raw == null ? undefined : JSON.parse(raw));
      named.forEach(function (pk) {
        if (pk === K) return; var p = pk.slice(K.length + 1);
        if (p === '') out(pk, raw != null, parts.head, opPeriodRev(state.revs, K, ''));
        else out(pk, ocOwn(parts.periods, p), parts.periods[p], opPeriodRev(state.revs, K, p));
      });
    });
    await env.DB.batch(rsReferenceGuards(env,reference));
    var body = { ok: 1, uid: session.uid, v:reference.operational.globalRev, epoch: Number(reference.inputMeta.restore_epoch || 0), resources: resources, absent: absent, denied: denied, base: base };
    if (Object.keys(failed).length) body.failed = failed;
    if (rangeIn.length) body.ranges = ranges;
    if (indexIn.length) body.index = index;
    return json(body);
  }
}

/* V7 · 53 */
async function opPeriodSaveBody(env, A, bs) {
  var keys = Object.keys(bs.set || {}).concat(bs.del || []).map(String);
  if (!keys.some(function (k) { return k.indexOf('@') >= 0; })) return null;
  var byK = {}, origin = {};
  keys.forEach(function (k) {
    if (k.indexOf('@') < 0) return;
    var x = opPeriodKey(k); if (!x || x.period === '*') throw ocError('period-key');
    var G = byK[x.key] || (byK[x.key] = { info: x.info, set: {}, del: [], keys: [] });
    G.keys.push(k); origin[k] = x.key;
    if (ocOwn(bs.set || {}, k)) G.set[x.period] = bs.set[k]; else { if (x.period === '') throw ocError('period-head'); G.del.push(x.period); }
    if (!bs.base || !Number.isSafeInteger(bs.base[k]) || bs.base[k] < 0) throw ocError('period-base');
  });
  keys.forEach(function (k) { if (ocOwn(byK, k)) throw ocError('period-mixed'); });
  var Ks = Object.keys(byK), scopes = {}, fp = await cuFingerprint({ uid: A.u.id, body: bs });
  if (Ks.some(function (K) { return !canRead(A, K); })) throw rsError('operations-denied', 403);   /* السلطةُ قبل أي صفّ */
  var replay = typeof bs.requestId === 'string' && await env.DB.prepare('SELECT 1 AS x FROM restore_operations WHERE account_uid=?1 AND request_id=?2').bind(A.u.id, bs.requestId).first();
  Ks.forEach(function (K) {
    var G = byK[K], def = opPeriodDef(G.info), written = Object.keys(G.set).filter(function (p) { return p !== ''; }).concat(G.del), ctx = [];
    written.forEach(function (p) { opPeriodCtx(def, p).forEach(function (c) { if (written.indexOf(c) < 0 && ctx.indexOf(c) < 0) ctx.push(c); }); });
    G.written = written; scopes[K] = { periods: written.concat(ctx) };
  });
  var cur = await opLoadMany(env, Ks, 1, scopes), out = { set: {}, del: [], base: {} }, conflicts = {};
  Object.keys(bs.base || {}).forEach(function (k) { if (k.indexOf('@') < 0) out.base[k] = bs.base[k]; });
  Object.keys(bs.set || {}).forEach(function (k) { if (k.indexOf('@') < 0) out.set[k] = bs.set[k]; });
  (bs.del || []).forEach(function (k) { if (String(k).indexOf('@') < 0) out.del.push(k); });
  Ks.forEach(function (K) {
    var G = byK[K], raw = cur.values[K], doc = raw == null ? undefined : JSON.parse(raw), parts = opSplit(G.info, doc), bases = {};
    G.keys.forEach(function (k) { var p = k.slice(K.length + 1); if (!replay && opPeriodRev(cur.revs, K, p) !== bs.base[k]) conflicts[k] = { why: 'conflict' }; bases[p] = bs.base[k]; });
    /* ما قرأته الترجمةُ من رأسٍ وسياق يبقى كما هو حتى الاعتماد — وإلا تعارضٌ فيُعاد البناء */
    scopes[K].periods.concat(['']).forEach(function (p) { if (!ocOwn(bases, p)) bases[p] = opPeriodRev(cur.revs, K, p); });
    var head = ocOwn(G.set, '') ? JSON.parse(G.set['']) : parts.head;
    if (head === undefined || head === null) head = opPeriodDef(G.info).field ? (function () { var h = {}; h[opPeriodDef(G.info).field] = {}; return h; })() : {};
    var pos = Object.assign({}, parts.pos), top = Math.max.apply(null, [-1].concat(Object.keys(parts.pos).map(function (p) { return parts.pos[p]; }), Object.keys(parts.hpos).map(function (k) { return parts.hpos[k]; })));
    G.del.forEach(function (p) { delete parts.periods[p]; });
    Object.keys(G.set).forEach(function (p) { if (p === '') return; var v; try { v = JSON.parse(G.set[p]); } catch (e) { throw ocError('json'); } ocSet(parts.periods, p, v); if (!ocOwn(pos, p)) pos[p] = ++top; });
    var next = opJoin(G.info, { head: head, hpos: parts.hpos, periods: parts.periods, pos: pos });
    out.set[K] = JSON.stringify(next); out.base[K] = cur.revs[K] || 0;
    scopes[K] = { periods: scopes[K].periods, bases: replay ? {} : bases, base: cur.revs[K] || 0 };
  });
  /* V7 · 53: مراجعُ أحكام الحفظ بنطاقها كذلك — الجدولُ الشهري بشهور الفترات المكتوبة والشهر الجاري (048 actorShift)، وأرشيفُ الجولات بأيامها (019p3 dailyArcPre) */
  Ks.forEach(function (K) {
    var I = byK[K].info, def = opPeriodDef(I), S = 'bsdept:' + I.dept + ':bassam_staffing_v3', SI = opSplitResource(S), months = new Set();
    if (SI && !ocOwn(scopes, S)) {
      var cur0 = typeof opPeriodDef(SI).current === 'function' ? opPeriodDef(SI).current() : ''; if (cur0) months.add(cur0);
      byK[K].written.forEach(function (p) { var g = opPeriodIdx(def, p).grp; if (g) months.add(g); });
      scopes[S] = { periods: Array.from(months) };
    }
    var AR = typeof DAILY_ARC_RES === 'string' && I.resource === 'bassam_rounds_v1' ? 'bsdept:' + I.dept + ':' + DAILY_ARC_RES : null;
    if (AR && opSplitResource(AR) && !ocOwn(scopes, AR)) scopes[AR] = { periods: scopes[K].periods.slice() };
  });
  var body = Object.assign({}, bs, out);
  if (Array.isArray(bs.aud)) body.aud = bs.aud.map(function (e) { return e && ocOwn(origin, e.k) ? Object.assign({}, e, { k: origin[e.k] }) : e; });
  return { body: body, scopes: scopes, byK: byK, fp: fp, conflicts: conflicts, origin: origin };
}
/* نتيجةُ الحفظ المنطقي بمفاتيح الفترة التي أرسلها العميل: مراجعةُ كلِّ فترةٍ بعد الاعتماد (MAX(K@p, K@*)) · الرفضُ والتعارضُ لكلِّ مفتاحٍ منها */
async function opPeriodSaveResult(env, ps, r) {
  var out = Object.assign({}, r), map = function (obj) { var m = {}; Object.keys(obj || {}).forEach(function (K) { if (ocOwn(ps.byK, K)) ps.byK[K].keys.forEach(function (k) { m[k] = obj[K]; }); else m[K] = obj[K]; }); return m; };
  out.denied = map(r.denied); out.conflicts = map(r.conflicts);
  if (r.revs) {
    var want = []; Object.keys(ps.byK).forEach(function (K) { want.push(K + '@*'); ps.byK[K].keys.forEach(function (k) { want.push(k); }); });
    var rows = (await env.DB.prepare('SELECT k,rev FROM revs WHERE k IN(SELECT value FROM json_each(?1))').bind(JSON.stringify(want)).all()).results || [], revs = {};
    rows.forEach(function (row) { revs[row.k] = rsNat(row.rev); });
    out.revs = {}; Object.keys(r.revs).forEach(function (K) { if (ocOwn(ps.byK, K)) ps.byK[K].keys.forEach(function (k) { out.revs[k] = opPeriodRev(revs, K, k.slice(K.length + 1)); }); else out.revs[K] = r.revs[K]; });
  }
  return out;
}
