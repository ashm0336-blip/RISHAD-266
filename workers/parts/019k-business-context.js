/* Shared capture of current authority, scope and revision witnesses.
   Domain definitions are server constants; no business document or device storage. */
async function bdQueryContext(env, actor, d, definition, options) {
  options = options || {};
  var global = options.global === true && definition.global === true;
  var fail = definition.error || function (code, status) { return rsError(code, status); };
  var natural = function (value) { if (!Number.isSafeInteger(value) || value < 0) throw fail('revision', 503); return value; };
  if (!actor || !actor.u || typeof actor.u.id !== 'string') throw fail('denied', 403);
  if ((options.global === true && !global) || typeof d !== 'string' || (!global && !d) || (global && d !== '') || d.length > 200 || d.indexOf(':') >= 0) throw fail('scope');
  var keys = [K_USERS, K_PERM, K_DEPTS, K_GDEPTS, K_PLAT].concat(global ? [] : [enfGrantsKey(d),
      'bsdept:' + d + ':bassam_staffing_v3', 'bsdept:' + d + ':bassam_shift_options_v1',
      'bsdept:' + d + ':bassam_employees_v1']).concat(definition.extraKeys ? definition.extraKeys(d) : []),
    resourceKeys = definition.resourceKeys ? definition.resourceKeys(d) : definition.resources.map(function (name) { return 'bsdept:' + d + ':' + name; }),
    revisionKeys = keys.concat(resourceKeys),
    metaKeys = ['restore_epoch', 'authz_mode', 'authz_perm_mig', 'authz_scope_mig', 'authz_id_mig'].concat(definition.metaKeys ? definition.metaKeys(d) : []),
    result = await env.DB.batch([
      env.DB.prepare('SELECT k,seq,v FROM kv WHERE k IN(SELECT value FROM json_each(?1)) ORDER BY k,seq').bind(JSON.stringify(keys.filter(function (k) { return !opIsResource(k); }))),
      env.DB.prepare('SELECT k,rev FROM revs WHERE k IN(SELECT value FROM json_each(?1)) ORDER BY k').bind(JSON.stringify(revisionKeys)),
      env.DB.prepare('SELECT k,v FROM meta WHERE k IN(SELECT value FROM json_each(?1)) ORDER BY k').bind(JSON.stringify(metaKeys)),
    ]),
    rows = result.map(function (r) { if (!r || r.success === false) throw fail('context', 503); return r.results || []; }),
    raw = Object.create(null), revs = Object.create(null), meta = Object.create(null);
  keys.forEach(function (k) { raw[k] = null; });
  var grouped = Object.create(null);
  rows[0].forEach(function (r) {
    var chunks = grouped[r.k] || (grouped[r.k] = []);
    if (r.seq !== chunks.length || typeof r.v !== 'string') throw fail('reference-chunks', 503);
    chunks.push(r.v);
  });
  Object.keys(grouped).forEach(function (k) { raw[k] = grouped[k].join(''); });
  rows[1].forEach(function (r) { revs[r.k] = natural(r.rev); });
  rows[2].forEach(function (r) { meta[r.k] = r.v; });
  var operational = await opCaptureReferences(env,raw,keys.filter(opIsResource));
  raw = operational.keys; Object.assign(revs,operational.revs);
  if (definition.validateMeta) definition.validateMeta(meta, d);
  var pre = Object.assign({}, env.__pre || {}, { live: true, kv: raw, revs: revs, meta: meta });
  delete pre.track;   // RISHAD-266 · s1: this context carries its own exact witness; it never grows a caller's scoped reference (019d)
  var captured = Object.assign({}, env, { __pre: pre, __opCapture: operational }),
    mode = await enfModeOf(captured),
    A = actorFromKeys(raw, actor.u.id);
  if (!A || (!global && (!deptInScope(A, d) || !(A.depts || []).some(function (department) { return department && String(department.id) === d; }))))
    throw fail('denied', 403);
  if (mode.mode === 'unavailable') throw fail('context', 503);
  if (mode.mode === 'enforce') { A.enf = mode; enfAttachGrantsKeys(A, raw); }
  captured.__enf = A.enf || null;
  if (!options.write && !canRead(A, resourceKeys[0])) throw fail('denied', 403);
  var refs = await enfRefsFor(captured, global ? [] : [d], raw),
    base = { epoch: natural(meta.restore_epoch == null ? 0 : Number(meta.restore_epoch)) },
    resources = definition.resourceNames;
  resources.forEach(function (name, i) { base[name] = revs[resourceKeys[i]] || 0; });
  var guards = rsWitness(env, 'kv', ['k', 'seq', 'v'], rows[0], 'k IN(SELECT value FROM json_each(?1))', [JSON.stringify(keys)])
    .concat(rsWitness(env, 'revs', ['k', 'rev'], rows[1], 'k IN(SELECT value FROM json_each(?1))', [JSON.stringify(revisionKeys)]))
    .concat(rsWitness(env, 'meta', ['k', 'v'], rows[2], 'k IN(SELECT value FROM json_each(?1))', [JSON.stringify(metaKeys)]))
    .concat(operational.guards);
  return { env: captured, A: A, d: d, base: base, guards: guards, refs: refs, rawKeys: raw,
    resourceKeys: resourceKeys, meta: meta, pv4: { staffing: refs.staffing[d] },
    witness: await cuFingerprint({ uidValue: A.u.id, mode: mode, capture: rows }) };
}

function bdBumpStatements(env, k, notify) {
  var st = [env.DB.prepare("INSERT INTO meta(k,v) VALUES('rev',CAST(COALESCE((SELECT MAX(rev) FROM revs),0)+1 AS TEXT)) ON CONFLICT(k) DO UPDATE SET v=CAST(MAX(CAST(meta.v AS INTEGER),COALESCE((SELECT MAX(rev) FROM revs),0))+1 AS TEXT)"),
    env.DB.prepare("INSERT INTO revs(k,rev)VALUES(?1,CAST((SELECT v FROM meta WHERE k='rev')AS INTEGER)) ON CONFLICT(k)DO UPDATE SET rev=excluded.rev").bind(k)];
  if (notify) st.push(env.DB.prepare("INSERT INTO revs(k,rev)VALUES(?1,CAST((SELECT v FROM meta WHERE k='rev')AS INTEGER)) ON CONFLICT(k)DO UPDATE SET rev=excluded.rev").bind(NF_REV));
  return st;
}

/* One absence guard for several empty relational tables, with bound scope.
   Table names/predicates are server schema constants, never request input. */
function bdEmptyTableGuard(env, tables, where, args) {
  if (!Array.isArray(tables) || !tables.length || tables.some(function (name) { return !/^[a-z][a-z0-9_]*$/.test(name); })) throw rsError('domain-table');
  return rsBound(env.DB.prepare('SELECT CASE WHEN ' + tables.map(function (name) {
    return 'EXISTS(SELECT 1 FROM ' + name + ' WHERE ' + (where || '1') + ')';
  }).join(' OR ') + " THEN json_extract('{}','KIVO_RESTORE_TARGET') END"), args || []);
}
