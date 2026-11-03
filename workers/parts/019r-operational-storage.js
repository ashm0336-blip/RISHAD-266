/* Canonical SQL resource access and row compiler. Policy engines consume a
   derived projection in memory; no operational JSON is read/written in KV. */
var OP_PREPARED = null;
function opDefinitions() { return OC_SCHEDULING_RESOURCES.concat(OC_PEOPLE_TASK_RESOURCES); }
function opRegistry() {
  if (!OP_PREPARED) {
    var out = Object.create(null), all = ocPrepare(opDefinitions());
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
    .concat([env.DB.prepare('UPDATE ops_nodes SET parent_key=NULL'),env.DB.prepare('DELETE FROM ops_nodes')]);
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
function opStateGuards(env, info, domain, empty) {
  var guards = [];
  var tables = ocPhysicalTables(info.prepared), physical = ocPhysicalRows(info.prepared, domain);
  Object.keys(tables).forEach(function (table) {
    var rows = physical[table] || [];
    if (!rows.length) (empty[table] = empty[table] || []).push([info.dept, info.resource]);
    else guards.push.apply(guards, rsWitness(env, table, tables[table], rows, 'department_id=?1 AND resource=?2', [info.dept, info.resource]));
  });
  return guards;
}
// Set-based form of the per-resource guards: one EXISTS per physical table over
// every (department, resource) pair that read empty, and one CAS over all revs.
function opEmptyGuards(env, empty) {
  var tables = Object.keys(empty), guards = [];
  for (var i = 0; i < tables.length; i += 24) {
    var part = tables.slice(i, i + 24);
    guards.push(rsBound(env.DB.prepare('SELECT CASE WHEN ' + part.map(function (table, n) {
      return 'EXISTS(SELECT 1 FROM ' + ocIdentifier(table) + " WHERE (department_id,resource) IN(SELECT json_extract(j.value,'$[0]'),json_extract(j.value,'$[1]')FROM json_each(?" + (n + 1) + ')j))';
    }).join(' OR ') + " THEN json_extract('{}','KIVO_RESTORE_TARGET') END"), part.map(function (table) { return JSON.stringify(empty[table]); })));
  }
  return guards;
}
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
async function opLoadMany(env, keys, retired) {
  var wanted = Array.from(new Set(keys)), requests = [], batch = [], revs = {}, tableRequests = {}, physicalByKey = {};
  wanted.forEach(function (key) {
    var info = opInfo(key); if (!info) throw ocError('resource');
    var request = { key: key, info: info, tables: ocPhysicalTables(info.prepared) }; physicalByKey[key] = {};
    Object.keys(request.tables).forEach(function (table) {
      if (!tableRequests[table]) tableRequests[table] = { columns:request.tables[table], pairs:[] };
      tableRequests[table].pairs.push({department_id:info.dept,resource:info.resource}); physicalByKey[key][table] = [];
    });
    requests.push(request);
  });
  var tableNames=Object.keys(tableRequests);
  tableNames.forEach(function(table){
    var query=tableRequests[table];
    batch.push(env.DB.prepare('SELECT '+query.columns.join(',')+' FROM '+table+" WHERE (department_id,resource) IN(SELECT json_extract(j.value,'$.department_id'),json_extract(j.value,'$.resource')FROM json_each(?1)j)").bind(JSON.stringify(query.pairs)));
  });
  if (!batch.length) { if (retired) await opGuardRetired(env); return { values: {}, domains: {}, guards: [], snapshots: [], revs: {}, globalRev:await bdGlobalRevision(env) }; }
  if (retired) batch.unshift(opRetiredGuard(env));
  var offset = retired ? 1 : 0;
  var revisionIndex=batch.length-offset;
  batch.push(env.DB.prepare('SELECT k,rev FROM revs WHERE k IN(SELECT value FROM json_each(?1))').bind(JSON.stringify(wanted)));
  batch.push(env.DB.prepare("SELECT v FROM meta WHERE k='rev'"));
  var result, values = {}, domains = {}, guards = [], snapshots = [], empty = {}, revPairs = [];
  try { result = await env.DB.batch(batch); } catch (error) { throw opLegacyError(error); }
  result.forEach(function (entry) { if (!entry || entry.success === false) throw ocError('read'); });
  result = result.slice(offset);
  tableNames.forEach(function(table,index){(result[index].results||[]).forEach(function(row){
    var key='bsdept:'+row.department_id+':'+row.resource;
    if(!physicalByKey[key]||!physicalByKey[key][table])throw ocError('read-scope');
    physicalByKey[key][table].push(row);
  });});
  (result[revisionIndex].results || []).forEach(function (row) { revs[row.k] = rsNat(row.rev); });
  requests.forEach(function (request) {
    var info = request.info, physical = physicalByKey[request.key];
    var domain = ocFromPhysical(info.prepared, info.dept, info.resource, physical), projection = ocInflate(info.prepared, domain);
    values[request.key] = projection.present ? JSON.stringify(projection.value) : null;
    domains[request.key] = domain;
    guards.push.apply(guards, opStateGuards(env, info, domain, empty));
    Object.keys(request.tables).forEach(function (table) { snapshots.push({ domain: 'operations', table: request.key + ':' + table, rows: physical[table] }); });
    if (!ocOwn(revs, request.key)) revs[request.key] = 0;
    revPairs.push([request.key, revs[request.key]]);
  });
  guards.push.apply(guards, opEmptyGuards(env, empty).concat(opRevGuards(env, revPairs)));
  return { values: values, domains: domains, guards: guards, snapshots: snapshots, revs: revs, globalRev:opGlobalRevOf(result[revisionIndex+1]) };
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
  var after = ocConvert(info.prepared, info.dept, info.resource, next, nextRaw != null), statements = [], changed = false,
    physicalBefore = ocPhysicalRows(info.prepared, before), physicalAfter = ocPhysicalRows(info.prepared, after), tables = ocPhysicalTables(info.prepared);
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
  return { guards: [opRetiredGuard(env)].concat(state.guards), statements: statements, snapshots: state.snapshots,
    revisionKeys: changed ? [key] : [], changed: changed, domain: after };
}
async function opCompilePending(env, plan, pending, capture) {
  for (var item of pending) {
    if(plan.operation!=='save'&&plan.body.mode==='merge'){
      var current=capture&&capture.domains[item.k]|| (await opLoadMany(env,[item.k])).domains[item.k];
      if(ocInflate(opInfo(item.k).prepared,current).present)throw rsError('restore-operations-merge-target-not-empty',409);
    }
    var addition = await opChangeStatements(env, item.k, item.act === 'del' ? null : item.v, { base: item.have, state: capture && capture.domains[item.k] ? {
      domains: capture.domains, revs: capture.revs, guards: [] , snapshots: capture.snapshots.filter(function (s) { return s.table.startsWith(item.k + ':'); })
    } : undefined });
    plan.guards.push.apply(plan.guards, addition.guards); plan.statements.push.apply(plan.statements, addition.statements);
    plan.revisionKeys.push.apply(plan.revisionKeys, addition.revisionKeys); plan.snapshots.push.apply(plan.snapshots, addition.snapshots);
  }
}
async function opReadRoute(env, request, url, session) {
  if (request.method !== 'GET') return json({ ok: 0, err: 'method' }, 405);
  var mismatch = sessUidMismatch(env, url, session, '/api/operations/read'); if (mismatch) return mismatch;
  try {
    var wanted = Array.from(new Set(String(url.searchParams.get('keys') || '').split(',').filter(Boolean)));
    if (!wanted.length || wanted.length > GET_MAX || wanted.some(function (key) { return !opInfo(key); })) throw ocError('read-keys');
    // Establish authority before loading any business rows, including rows of
    // a foreign department requested by a malicious/obsolete client.
    var reference = await rsReferenceSnapshot(env, session.uid, { operationalKeys: [] }), A = reference.A,
      eligible=new Set(wanted.filter(function(key){return canRead(A,key);})),refs=Array.from(eligible);
    eligible.forEach(function (key) { var d = opInfo(key).dept; ['bassam_staffing_v3', 'bassam_shift_options_v1', 'bassam_employees_v1'].forEach(function (r) { refs.push('bsdept:' + d + ':' + r); }); });
    var operational=await opCaptureReferences(reference.env,reference.inputKeys,refs);
    reference.operational=operational;reference.inputKeys=operational.keys;Object.assign(reference.inputRevs,operational.revs);
    reference.env=Object.assign({},reference.env,{__opCapture:operational,__pre:Object.assign({},reference.env.__pre,{kv:operational.keys,revs:reference.inputRevs})});
    env = reference.env;
    var resources = {}, absent = [], denied = [], base = {}, enfRefs = await enfRefsFor(env, Array.from(new Set(wanted.map(function (key) { return opInfo(key).dept; }))), reference.inputKeys);
    wanted.forEach(function (key) {
      if (!eligible.has(key)||!canRead(A, key)) { denied.push(key); return; }
      var raw = reference.inputKeys[key];
      if (A.enf && raw != null) raw = enfProjectStr(A, key, raw, enfRefs);
      raw = privOut(A, key, raw, reference.inputKeys);   // PRIVACY batch (019u): personal fields by purpose · old nid references as eid
      if (raw == null) absent.push(key); else resources[key] = JSON.parse(raw);
      base[key] = reference.inputRevs[key] || 0;
    });
    await env.DB.batch(rsReferenceGuards(env,reference));
    return json({ ok: 1, uid: session.uid, v:reference.operational.globalRev, epoch: Number(reference.inputMeta.restore_epoch || 0), resources: resources, absent: absent, denied: denied, base: base });
  } catch (error) {
    var guard = dbGuardFailure(error); if (guard) return json({ ok: 0, err: guard.err }, guard.status);
    if (error.rs || error.ocCode) return json({ ok: 0, err: error.rs || error.ocCode }, error.status || 400);
    if (/KIVO_RESTORE_TARGET|KIVO_REV_CONFLICT|KIVO_RESTORE_EPOCH/.test(String(error))) return json({ ok: 0, err: 'conflict' }, 409);
    throw error;
  }
}
