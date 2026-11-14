/* Irshad commands: affected typed rows, existing authorization, and one batch
   for data, resource revision, audit, notification plan and request receipt. */
function irRequestString(v, max) {
  if (typeof v !== 'string' || !v || v.length > max) throw irError('irshad-request');
  return v;
}
function irCheckBase(base) {
  irShape(base, ['epoch'].concat(IR_RES_NAMES), 'base');
  ['epoch'].concat(IR_RES_NAMES).forEach(function (k) {
    if (!Number.isSafeInteger(base[k]) || base[k] < 0) throw irError('irshad-base');
  });
}
function irActResource(b) {
  return b.op === 'catalog-replace' ? b.kind : 'reports';
}
async function irReceipt(env, A, b, fingerprint) {
  var row = await env.DB.prepare('SELECT * FROM irshad_requests WHERE department_id=?1 AND account_uid=?2 AND request_id=?3')
    .bind(b.dept, A.u.id, b.requestId).first();
  if (!row) return null;
  if (row.fingerprint !== fingerprint) throw irError('irshad-request-reused', 409);
  var base = Object.assign({}, b.base), resource = IR_RES_NAMES[IR_RES.indexOf(row.resource_key)];
  if (!resource) resource = IR_RES_NAMES.find(function (_, i) { return irKey(b.dept, i) === row.resource_key; });
  if (!resource || !Number.isSafeInteger(row.resource_rev) || row.resource_rev < 0) throw irError('irshad-receipt-invalid', 503);
  base[resource] = row.resource_rev;
  var ack = { ok: 1, requestId: b.requestId, op: row.operation, rev: row.resource_rev, n: row.result_n, base: base };
  if (row.result_id !== null) ack.id = row.result_id;
  return ack;
}
function irReceiptAuthority(ctx, b) {
  var k = irKey(ctx.d, IR_RES_NAMES.indexOf(irActResource(b))), A = ctx.A;
  if (!deptInScope(A, ctx.d) || !resOnCeiling(A, ctx.d, resOf(k))) throw irError('irshad-denied', 403);
  var permitted = A.enf ? enfResWriter(A, ctx.d, resName(k)) :
    authorizeActs(A, k, [b.op === 'create' ? 'add' : b.op.indexOf('delete') === 0 ? 'del' : 'edit']).ok;
  if (!permitted) throw irError('irshad-denied', 403);
}
async function irRetroSnapshot(env, d) {
  var out = await env.DB.batch([
    env.DB.prepare('SELECT * FROM irshad_retro_windows WHERE department_id=?1 ORDER BY sequence').bind(d),
    env.DB.prepare('SELECT k,v FROM meta WHERE k=?1 OR k=?2 ORDER BY k').bind(irMetaKey(d), irMetaKey(d) + ':retro-version'),
  ]), domain = irEmptyDomain(d), meta = {};
  (out[1].results || []).forEach(function (r) { meta[r.k] = r.v; });
  var mask = Number(meta[irMetaKey(d)] || 0);
  domain.resources.retro = !!(mask & 8);
  domain.resources.retroVersionPresent = !!(mask & 16);
  domain.resources.retroVersion = mask & 16 ? parseJson(meta[irMetaKey(d) + ':retro-version'], null) : null;
  domain.resources.retroWindowsPresent = !!(mask & 32);
  domain.rows.windows = out[0].results || [];
  var state = irInflate(domain).retro;
  if (!Number.isSafeInteger(mask) || mask < 0 || mask > 63) throw irError('irshad-presence-invalid', 503);
  irValidateDomain(domain, d);
  if (!isObj(state)) state = { v: 1, windows: [] };
  else if (!Array.isArray(state.windows)) state = Object.assign({}, state, { windows: [] });
  return { state: state, rows: domain.rows.windows, metaRows: out[1].results || [] };
}
async function irPermission(ctx, resource, before, after, reason) {
  var k = irKey(ctx.d, IR_RES_NAMES.indexOf(resource)), retro = await irRetroSnapshot(ctx.env, ctx.d),
    retroWin = {}, pv4 = {};
  retroWin[ctx.d + '|irshad'] = retro.state.windows;
  pv4[ctx.d] = ctx.pv4;
  var set = {}, keys = {}, body = { why: {} }, X = null, c = {};
  set[k] = JSON.stringify(after); keys[k] = 1;
  if (reason) body.why[k] = reason;
  if (ctx.A.enf) {
    X = await enfSavePrep(ctx.env, ctx.A, body, set, [], keys, KIVO_BUILD.markers({}, keys), null, false, false, retroWin, pv4);
    c.enf = enfCtxFor(X, k, ctx.d);
  }
  var result = X && X.batchDeny ? enfNo(X.batchDeny.why, X.batchDeny) :
    canWrite(ctx.A, k, JSON.stringify(after), JSON.stringify(before), c);
  if (!result.ok) {
    var error = irError('irshad-denied', 403);
    error.irDecision = result;
    throw error;
  }
  var guards = rsWitness(ctx.env, IR_TABLES.windows[0], IR_TABLES.windows[1], retro.rows, 'department_id=?1', [ctx.d]);
  return { decision: result, guards: guards, key: k };
}
function irMutationData(ctx, b, before, now) {
  var create = b.op === 'create', fields = ['shift', 'eid', 'loc', 'langs', 'bro', 'pros', 'pol'];
  irShape(b.data, create ? fields.concat(['y', 'm', 'd']) : fields, 'data');
  fields.forEach(function (f) { if (!irOwn(b.data, f)) throw irError('irshad-data'); });
  var out = Object.assign({}, before || {}, b.data);
  ['shift', 'eid', 'loc'].forEach(function (f) { irText(out[f], 'data.' + f); });
  if (!out.shift || !out.eid) throw irError('irshad-data');
  ['bro', 'pros', 'pol'].forEach(function (f) {
    if (!Number.isSafeInteger(out[f]) || out[f] < 0) throw irError('irshad-number');
  });
  if (!Array.isArray(out.langs)) throw irError('irshad-languages-shape');
  out.langs.forEach(function (value) {
    irShape(value, ['lang', 'count'], 'data.langs');
    if (typeof value.lang !== 'string' || !value.lang || !Number.isSafeInteger(value.count) || value.count < 0)
      throw irError('irshad-language-count');
  });
  if (create) {
    if (!Number.isSafeInteger(out.y) || out.y < 1 || out.y > 9999 || !Number.isSafeInteger(out.m) || out.m < 1 || out.m > 12 ||
        !Number.isSafeInteger(out.d) || out.d < 1 || out.d > 30) throw irError('irshad-date');
    out.id = 'ir-' + randTok(); out.ts = now; out.actor = String(ctx.A.u.name || ctx.A.u.un || ctx.A.u.id);
  } else { out.editedTs = now; out.editedBy = String(ctx.A.u.name || ctx.A.u.un || ctx.A.u.id); }
  // A historical employee snapshot remains historical when its identity is unchanged.
  if (create || out.eid !== before.eid || out.shift !== before.shift) {
    var employees = parseJson(ctx.rawKeys['bsdept:' + ctx.d + ':bassam_employees_v1'], null);
    if (!Array.isArray(employees)) throw irError('irshad-employees-unavailable', 503);
    var matches = employees.filter(function (e) { return isObj(e) && e.eid === out.eid; });
    if (matches.length !== 1) throw irError('irshad-employee');
    if (create || out.eid !== before.eid) out.name = String(matches[0].name || 'بدون اسم');
    if (capOnDept(ctx.A, ctx.d, 'staff')) {
      var month = ctx.refs.staffing[ctx.d], schedule = isObj(month) && month[out.y + '-' + out.m], row = isObj(schedule) && schedule[out.eid];
      if (!isObj(row) || row.shift !== out.shift || (Array.isArray(row.rest) && row.rest.indexOf(out.d) >= 0))
        throw irError('irshad-employee-shift');
    }
  }
  // The canonical codec validates every language child and optional historical field.
  irConvert(ctx.d, { reports: { reports: [out] } });
  return out;
}
async function irNotificationPlan(ctx, b, before, after) {
  var events = [], statements = [], guards = [], active = 0;
  if (b.op === 'create') events.push({ type: 'ir_new', row: after[0] });
  if (b.op === 'edit') events.push({ type: 'ir_edit', row: after[0], action: 'عُدّل' });
  if (b.op === 'delete' || b.op === 'delete-month') before.forEach(function (row) { events.push({ type: 'ir_edit', row: row, action: 'حُذف' }); });
  for (var start = 0; start < events.length; start += 200) {
    var part = [];
    for (var event of events.slice(start, start + 200)) {
      var once = 'irshad:' + await cuFingerprint({ request: b.requestId, actor: ctx.A.u.id, report: event.row.id });
      // Preserve the existing observer's valid-report template values; no new counting policy.
      var vars = event.type === 'ir_new' ? { 'الرقم': '—', 'العدد': 0, 'الموقع': event.row.loc || '—', 'الموظف': event.row.name || '' } :
        { 'الفعل': event.action, 'الرقم': '—', 'المُعدّل': String(ctx.A.u.name || ctx.A.u.un || ctx.A.u.id) };
      Object.keys(vars).forEach(function (key) { if (typeof vars[key] === 'string') vars[key] = vars[key].slice(0, 4000); });
      part.push({ type: event.type, dept: ctx.d, vars: vars, once: once });
    }
    var plan = await nfPlanEvents(ctx.env, ctx.A, part, true);
    guards.push.apply(guards, plan.guards);
    statements.push.apply(statements, plan.statements);
    statements.push.apply(statements, nfRetention(ctx.env, Date.now(), plan.scopes));
    active += plan.plans.length;
  }
  return { guards: guards, statements: statements, active: active };
}
async function irAct(env, A, b, meta) {
  irShape(b, ['uid', 'dept', 'base', 'requestId', 'op', 'reason', 'data', 'id', 'year', 'month', 'kind', 'values'], 'body');
  var fields = { create: ['data'], edit: ['id', 'data'], delete: ['id'], 'delete-month': ['year', 'month'], 'catalog-replace': ['kind', 'values'] };
  if (!Object.prototype.hasOwnProperty.call(fields, b.op)) throw irError('irshad-operation');
  irShape(b, ['uid', 'dept', 'base', 'requestId', 'op', 'reason'].concat(fields[b.op]), 'body');
  irRequestString(b.requestId, 100); irRequestString(b.dept, 200); irCheckBase(b.base);
  if (b.uid !== undefined && b.uid !== A.u.id) throw irError('session-changed', 409);
  if (b.reason !== undefined && typeof b.reason !== 'string') throw irError('irshad-reason');
  if (b.op === 'catalog-replace' && ['languages', 'locations'].indexOf(b.kind) < 0) throw irError('irshad-catalog-kind');
  await irGuardRetired(env);
  var ctx = await irQueryContext(env, A, b.dept, { write: true });
  env = ctx.env; A = ctx.A;
  if (b.base.epoch !== ctx.base.epoch) throw irError('restore-epoch-changed', 409);
  irReceiptAuthority(ctx, b);
  var fingerprint = await cuFingerprint({ body: b }), receipt = await irReceipt(env, A, b, fingerprint);
  if (receipt) return receipt;
  if (['epoch'].concat(IR_RES_NAMES).some(function (name) { return ctx.base[name] !== b.base[name]; })) throw irError('irshad-conflict', 409);
  var resource = irActResource(b), resourceIndex = IR_RES_NAMES.indexOf(resource), k = irKey(ctx.d, resourceIndex),
    before = [], after = [], statements = [], guards = ctx.guards.concat([rsEpochGuard(env.DB, b.base.epoch), irRetiredGuard(env)]),
    now = Date.now(), resultId = null, n = 1, reason = String(b.reason || '').trim().slice(0, 300), where, args, raw;
  if (b.op === 'catalog-replace') {
    if (!Array.isArray(b.values)) throw irError('irshad-catalog-shape');
    b.values.forEach(function (value) { irText(value, 'values'); });
    raw = (await env.DB.prepare('SELECT * FROM irshad_catalog_entries WHERE department_id=?1 AND kind=?2 ORDER BY position').bind(ctx.d, b.kind).all()).results || [];
    before = raw.map(function (row) { return row.value; }); after = b.values.slice(); n = after.length;
    guards.push.apply(guards, rsWitness(env, IR_TABLES.catalogs[0], IR_TABLES.catalogs[1], raw, 'department_id=?1 AND kind=?2', [ctx.d, b.kind]));
    statements.push(env.DB.prepare('DELETE FROM irshad_catalog_entries WHERE department_id=?1 AND kind=?2').bind(ctx.d, b.kind));
    statements.push.apply(statements, rsBulk(env, IR_TABLES.catalogs[0], IR_TABLES.catalogs[1], after.map(function (value, position) { return { department_id: ctx.d, kind: b.kind, position: position, value: value }; })));
  } else {
    if (b.op === 'create') {
      var sequence = await env.DB.prepare('SELECT COALESCE(MAX(sequence),-1)+1 n FROM irshad_reports WHERE department_id=?1').bind(ctx.d).first();
      guards.push(env.DB.prepare("SELECT CASE WHEN (SELECT COALESCE(MAX(sequence),-1)+1 FROM irshad_reports WHERE department_id=?1)<>?2 THEN json_extract('{}','KIVO_IRSHAD_TARGET_CHANGED')END").bind(ctx.d, sequence.n));
      after = [irMutationData(ctx, b, null, now)];
      var created = irConvert(ctx.d, { reports: { reports: after } }); created.rows.reports[0].sequence = sequence.n;
      statements.push.apply(statements, rsBulk(env, IR_TABLES.reports[0], IR_TABLES.reports[1], created.rows.reports));
      statements.push.apply(statements, rsBulk(env, IR_TABLES.languages[0], IR_TABLES.languages[1], created.rows.languages));
      resultId = after[0].id;
    } else {
      if (b.op === 'delete-month') {
        if (!canRead(A, k)) throw irError('irshad-denied', 403);
        if (!Number.isSafeInteger(b.year) || !Number.isSafeInteger(b.month) || b.month < 1 || b.month > 12) throw irError('irshad-date');
        var scope = irQueryScope(ctx, 'irshad_reports'); args = scope.args.slice();
        args.push(b.year); var yearSlot = '?' + args.length; args.push(b.month);
        where = scope.sql + ' AND hijri_year=' + yearSlot + ' AND hijri_month=?' + args.length;
      } else { irRequestString(b.id, 100000); where = 'department_id=?1 AND report_id=?2'; args = [ctx.d, b.id]; }
      raw = (await rsBound(env.DB.prepare('SELECT * FROM irshad_reports WHERE ' + where + ' ORDER BY sequence'), args).all()).results || [];
      if (!raw.length) throw irError('irshad-report-missing', 404);
      var ids = raw.map(function (row) { return row.report_id; }), children = [], parts = rsChunks(ids);
      for (var idPart of parts) {
        var childRows = (await env.DB.prepare('SELECT * FROM irshad_report_languages WHERE department_id=?1 AND report_id IN(SELECT value FROM json_each(?2)) ORDER BY report_id,position').bind(ctx.d, JSON.stringify(idPart)).all()).results || [];
        children.push.apply(children, childRows);
        guards.push.apply(guards, rsWitness(env, IR_TABLES.languages[0], IR_TABLES.languages[1], childRows,
          'department_id=?1 AND report_id IN(SELECT value FROM json_each(?2))', [ctx.d, JSON.stringify(idPart)]));
      }
      guards.push.apply(guards, rsWitness(env, IR_TABLES.reports[0], IR_TABLES.reports[1], raw, where, args));
      var selected = irEmptyDomain(ctx.d); selected.resources.reports = true; selected.rows.reports = raw; selected.rows.languages = children;
      before = irInflate(selected).reports.reports;
      if (b.op === 'edit') {
        after = [irMutationData(ctx, b, before[0], now)]; resultId = b.id;
        var edited = irConvert(ctx.d, { reports: { reports: after } }); edited.rows.reports[0].sequence = raw[0].sequence;
        statements.push(env.DB.prepare('DELETE FROM irshad_report_languages WHERE department_id=?1 AND report_id=?2').bind(ctx.d, b.id));
        statements.push(env.DB.prepare('DELETE FROM irshad_reports WHERE department_id=?1 AND report_id=?2').bind(ctx.d, b.id));
        statements.push.apply(statements, rsBulk(env, IR_TABLES.reports[0], IR_TABLES.reports[1], edited.rows.reports));
        statements.push.apply(statements, rsBulk(env, IR_TABLES.languages[0], IR_TABLES.languages[1], edited.rows.languages));
      } else {
        n = before.length; resultId = b.op === 'delete' ? b.id : null;
        parts.forEach(function (part) { statements.push(env.DB.prepare('DELETE FROM irshad_reports WHERE department_id=?1 AND report_id IN(SELECT value FROM json_each(?2))').bind(ctx.d, JSON.stringify(part))); });
      }
    }
  }
  var permission = await irPermission(ctx, resource, resource === 'reports' ? { reports: before } : before,
    resource === 'reports' ? { reports: after } : after, reason);
  guards.push.apply(guards, permission.guards);
  var notifications = await irNotificationPlan(ctx, b, before, after);
  guards.push.apply(guards, notifications.guards);
  statements.push.apply(statements, irMarkResourceStatements(env, ctx.d, resource));
  statements.push.apply(statements, bdBumpStatements(env, k, notifications.active > 0));
  statements.push.apply(statements, notifications.statements);
  statements.push(env.DB.prepare("INSERT INTO irshad_requests(department_id,account_uid,request_id,fingerprint,resource_key,resource_rev,operation,result_n,result_id,created_at)VALUES(?1,?2,?3,?4,?5,CAST((SELECT v FROM meta WHERE k='rev')AS INTEGER),?6,?7,?8,?9)").bind(ctx.d, A.u.id, b.requestId, fingerprint, k, b.op, n, resultId, now));
  statements.push(env.DB.prepare("INSERT INTO aud(cid,ts,uid,un,dept,k,rev,etype,eid,ename,act,ctx,bef,aft,ip,dev,city)VALUES(?1,?2,?3,?4,?5,?6,CAST((SELECT v FROM meta WHERE k='rev')AS INTEGER),'dataset',?7,'irshad',?8,?9,'','',?10,?11,?12)").bind(
    'irshad_' + randTok(), now, A.u.id, String(A.u.un || ''), ctx.d, k, resultId || b.requestId, b.op,
    JSON.stringify({ requestId: b.requestId, n: n, reason: reason }), (meta && meta.ip) || '', (meta && meta.dev) || '', (meta && meta.city) || ''));
  var authzLog = A.enf && enfLogRow(A, k, permission.decision, '/api/irshad/act', meta || {});
  if (authzLog) statements.push(enfLogStmt(env, authzLog));
  try { await env.DB.batch(guards.concat(statements)); }
  catch (error) {
    preOff(env); receipt = await irReceipt(env, A, b, fingerprint);
    if (receipt) return receipt;
    if (isRevConflict(error) || /KIVO_RESTORE_TARGET|KIVO_IRSHAD_TARGET_CHANGED|UNIQUE constraint/.test(String(error))) throw irError('irshad-conflict', 409);
    throw error;
  }
  preOff(env);
  var ack = await irReceipt(env, A, b, fingerprint);
  if (!ack) throw irError('irshad-receipt-unavailable', 503);
  return ack;
}
async function irRoute(env, request, url, ss) {
  try {
    if (!((url.pathname === '/api/irshad' || url.pathname === '/api/irshad/export') && request.method === 'GET') &&
        !(url.pathname === '/api/irshad/act' && request.method === 'POST')) return json({ ok: 0, err: 'method' }, 405);
    var mismatch = sessUidMismatch(env, url, ss, '/api/irshad'); if (mismatch) return mismatch;
    var A = await actorOf(env, ss.uid); if (!A) return json({ ok: 0, err: 'session' }, 401);
    if (url.pathname === '/api/irshad/export') return json(await irExport(env, A, url));
    if (request.method === 'GET') return json(await irRead(env, A, Object.fromEntries(url.searchParams)));
    var read = await bodyRead(request, '/api/irshad/act'); if (read.res) return read.res;
    var limit = await rlHit(env, 'sv', A.u.id, RL_SAVE); if (limit) return tooMany(limit);
    return json(await irAct(env, A, read.v, reqMeta(request)));
  } catch (error) { return irErrorResponse(error); }
}
function irErrorResponse(error) {
    if (error.irCode) {
      var data = { ok: 0, err: error.irCode };
      if (error.irPath) data.at = error.irPath;
      if (error.irDecision) { data.why = error.irDecision.why; data.keys = error.irDecision.reasonKeys || error.irDecision.keys || []; data.details = error.irDecision.detail || ''; }
      return json(data, error.irStatus);
    }
    if (/KIVO_IRSHAD_LEGACY_SOURCE/.test(String(error))) return json({ ok: 0, err: 'irshad-legacy-source-present' }, 503);
    if (/KIVO_NOTIFICATION_LEGACY_SOURCE/.test(String(error))) return json({ ok: 0, err: 'notification-legacy-source-present' }, 503);
    if (/KIVO_IRSHAD_ORPHAN_SCOPE/.test(String(error))) return json({ ok: 0, err: 'irshad-orphan-scope' }, 503);
    if (/KIVO_RESTORE_EPOCH/.test(String(error))) return json({ ok: 0, err: 'restore-epoch-changed' }, 409);
    if (/KIVO_RESTORE_TARGET|KIVO_REV_CONFLICT/.test(String(error))) return json({ ok: 0, err: 'irshad-conflict' }, 409);
    if (error.nf) return json({ ok: 0, err: error.nf }, error.status);
    throw error;
}
