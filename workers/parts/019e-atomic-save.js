/* Existing save workflows use the SAME private applySave preparation and the
   SAME atomic rsCommit executor. No client may select a trusted transition. */
function rsSaveNeedsAtomic(body) {
  return Object.keys((body && body.set) || {})
    .concat((body && body.del) || [])
    .some(function (k) {
      return k === K_DEPTS || k === K_USERS || k === K_PERM || opIsResource(k);
    });
}
function rsImageIn(column, values, args) {
  var selects = [];
  rsChunks(
    values.map(function (value) {
      return { value: value };
    }),
  ).forEach(function (part) {
    args.push(JSON.stringify(part));
    selects.push("SELECT json_extract(value,'$.value') FROM json_each(?" + args.length + ')');
  });
  return column + ' IN (' + (selects.length ? selects.join(' UNION ALL ') : 'SELECT NULL WHERE 0') + ')';
}
/* Backup bodies may only prove reuse of an already bound image. Never call
   imgResolve/imgVerdict (which can adopt ownership), image writes or R2 GC.
   R2 equality is checked at validation; concurrent R2 changes remain current. */
function rsImageArchiveShape(images) {
  if (!isObj(images)) throw rsError('backup-image-reuse-rejected', 409);
  var ids = Object.keys(images);
  if (
    ids.length > IMG_CAP ||
    ids.some(function (id) {
      return !/^(?:img|szp)_[a-z0-9]+_[a-z0-9]+$/.test(id) || typeof images[id] !== 'string' || !imgTypeOk(images[id]);
    })
  )
    throw rsError('backup-image-reuse-rejected', 409);
  return ids;
}
async function rsImageArchivePlan(env, A, plan, reference, archive) {
  var images = archive || {},
    ids = rsImageArchiveShape(images);
  function reject() {
    throw rsError('backup-image-reuse-rejected', 409);
  }
  if (!ids.length) {
    plan.imagesReused = 0;
    return;
  }
  var finalKeys = Object.assign(Object.create(null), reference.inputKeys, plan.relationalImageBefore || {}, plan.relationalImageReferences || {}),
    mentions = new Map(
      ids.map(function (id) {
        return [id, []];
      }),
    );
  plan.kv.pend.forEach(function (pd) {
    if (pd.act === 'del') delete finalKeys[pd.k];
    else finalKeys[pd.k] = pd.v;
  });
  (plan.imgTouch||[]).forEach(function(t){finalKeys[t.k]=t.v;});
  Object.keys(finalKeys).forEach(function (key) {
    if (
      isDeviceKey(key) ||
      !resOf(key) ||
      (plan.body.scope.kind === 'dept' && parseKey(key).dept !== plan.body.scope.departmentId) ||
      !canRead(A, key)
    )
      return;
    var found = imgIdsIn(finalKeys[key]);
    ids.forEach(function (id) {
      if (found[id]) mentions.get(id).push(key);
    });
  });
  if (
    ids.some(function (id) {
      return !mentions.get(id).length;
    })
  )
    reject();
  var ownArgs = [],
    ownWhere = rsImageIn('img', ids, ownArgs),
    metadata = await env.DB.batch([
      rsBound(env.DB.prepare('SELECT img,st,k,uid,dept,ts FROM imgown WHERE ' + ownWhere), ownArgs),
      rsBound(env.DB.prepare('SELECT img,k FROM imgref WHERE ' + ownWhere), ownArgs),
    ]),
    owners = metadata[0].results || [],
    refs = metadata[1].results || [],
    ownerMap = new Map(
      owners.map(function (row) {
        return [row.img, row];
      }),
    );
  var checkedKeys = new Set();
  for (var id of ids) {
    var owner = ownerMap.get(id);
    if (!owner || owner.st !== 'bound' || !owner.k || !resOf(owner.k) || isDeviceKey(owner.k) || !canRead(A, owner.k)) reject();
    for (var key of mentions.get(id))
      if (!checkedKeys.has(key)) {
        checkedKeys.add(key);
        if (await imgForeignIn(env, A, key, finalKeys[key], (plan.relationalImageCurrent||{})[key] || (plan.relationalImageBefore||{})[key] || reference.inputKeys[key] || '')) reject();
      }
  }
  // Include any upload fragments for these exact IDs. A late fragment or owner
  // change rejects the SQL transaction even if it appeared after body matching.
  var bodyArgs = [],
    bodyWhere = rsImageIn("CASE WHEN substr(k,1,5)='~stg~' THEN substr(k,6,instr(substr(k,6),'~')-1) ELSE k END", ids, bodyArgs),
    rows = (await rsBound(env.DB.prepare('SELECT k,seq,v FROM imgs WHERE ' + bodyWhere + ' ORDER BY k,seq'), bodyArgs).all()).results || [];
  var values = new Map();
  for (var row of rows) {
    if (row.k.indexOf(IMG_STG) === 0) reject();
    values.set(row.k, (values.get(row.k) || '') + row.v);
  }
  for (var id of ids) {
    if (!values.has(id)) reject();
    // Inline content is the exact ordered D1 concatenation used by imgLoad;
    // its rows are guarded below. Only the R2 marker needs an object read.
    var actual = values.get(id);
    if (actual === IMG_R2_MARK) {
      try {
        actual = await imgLoad(env, id);
      } catch (e) {
        reject();
      }
    }
    if (actual !== images[id]) reject();
  }
  plan.guards.push.apply(plan.guards, rsWitness(env, 'imgs', ['k', 'seq', 'v'], rows, bodyWhere, bodyArgs));
  plan.guards.push.apply(plan.guards, rsWitness(env, 'imgown', ['img', 'st', 'k', 'uid', 'dept', 'ts'], owners, ownWhere, ownArgs));
  plan.guards.push.apply(plan.guards, rsWitness(env, 'imgref', ['img', 'k'], refs, ownWhere, ownArgs));
  plan.imagesReused = ids.length;
}
/* Same image ownership/reference semantics as imgSync, prepared before commit.
   Bodies and R2 garbage collection are deliberately never called by this path. */
async function rsImageMetadataPlan(env, A, plan, reference) {
  if (!plan.imgTouch || !plan.imgTouch.length) return;
  var list = plan.imgTouch,
    keys = list.map(function (v) {
      return v.k;
    }),
    keySet = new Set(keys),
    ids = new Set(),
    values = Object.assign(Object.create(null), reference.inputKeys);
  plan.kv.pend.forEach(function (pd) {
    if (pd.act === 'del') delete values[pd.k];
    else values[pd.k] = pd.v;
  });
  list.forEach(function(t){values[t.k]=t.v;});
  list.forEach(function (v) {
    Object.keys(imgIdsIn((plan.relationalImageBefore||{})[v.k] || reference.inputKeys[v.k] || ''))
      .concat(Object.keys(imgIdsIn(v.v || '')))
      .forEach(function (id) {
        ids.add(id);
      });
  });
  var args = [],
    where = rsImageIn('k', keys, args) + ' OR ' + rsImageIn('img', Array.from(ids), args),
    oldRefs = (await rsBound(env.DB.prepare('SELECT img,k FROM imgref WHERE ' + where), args).all()).results || [];
  oldRefs.forEach(function (r) {
    ids.add(r.img);
  });
  if (plan.operation !== 'save') {
    var newIds = Array.from(
        new Set(
          list.flatMap(function (v) {
            return Object.keys(imgIdsIn(v.v || ''));
          }),
        ),
      ),
      bodyArgs = [],
      bodyWhere = rsImageIn('k', newIds, bodyArgs),
      knownBodies =
        (await rsBound(env.DB.prepare('SELECT k,seq,v FROM imgs WHERE ' + bodyWhere + ' ORDER BY k,seq'), bodyArgs).all()).results || [],
      known = new Set(
        knownBodies.map(function (r) {
          return r.k;
        }),
      );
    if (
      newIds.some(function (id) {
        return !known.has(id);
      })
    )
      throw rsError('restore-image-body-missing', 409);
    plan.guards.push.apply(plan.guards, rsWitness(env, 'imgs', ['k', 'seq', 'v'], knownBodies, bodyWhere, bodyArgs));
  }
  var ownArgs = [],
    ownWhere = rsImageIn('img', Array.from(ids), ownArgs),
    oldOwn = (await rsBound(env.DB.prepare('SELECT img,st,k,uid,dept,ts FROM imgown WHERE ' + ownWhere), ownArgs).all()).results || [],
    owners = new Map(
      oldOwn.map(function (r) {
        return [r.img, r];
      }),
    );
  plan.guards.push.apply(plan.guards, rsWitness(env, 'imgref', ['img', 'k'], oldRefs, where, args));
  plan.guards.push.apply(plan.guards, rsWitness(env, 'imgown', ['img', 'st', 'k', 'uid', 'dept', 'ts'], oldOwn, ownWhere, ownArgs));
  if (plan.snapshotRequired) {
    plan.snapshots.push({ domain: 'images', table: 'imgref', rows: oldRefs }, { domain: 'images', table: 'imgown', rows: oldOwn });
  }
  var live = new Set();
  Object.keys(values).forEach(function (k) {
    Object.keys(imgIdsIn(values[k] || '')).forEach(function (id) {
      live.add(id);
    });
  });
  var refs = [],
    updates = new Map(),
    now = Date.now();
  list.forEach(function (v) {
    Object.keys(imgIdsIn(v.v || '')).forEach(function (id) {
      refs.push({ img: id, k: v.k });
      var o = owners.get(id);
      if (o && (o.st === 'orphan' || (o.st === 'claim' && (o.uid === A.u.id || A.u.role === 'super'))))
        updates.set(id, Object.assign({}, o, { st: 'bound', k: v.k, dept: parseKey(v.k).dept || '', uid: o.st === 'orphan' ? '' : o.uid }));
    });
  });
  ids.forEach(function (id) {
    if (
      live.has(id) ||
      oldRefs.some(function (r) {
        return r.img === id && !keySet.has(r.k);
      })
    )
      return;
    var o = owners.get(id);
    if (o && o.st === 'bound' && !keySet.has(o.k)) return;
    updates.set(id, Object.assign({ img: id, uid: '', dept: '' }, o || {}, { st: 'orphan', k: '', ts: now }));
  });
  var dropArgs = [],
    dropWhere = rsImageIn('k', keys, dropArgs);
  plan.statements.push(rsBound(env.DB.prepare('DELETE FROM imgref WHERE ' + dropWhere), dropArgs));
  plan.statements.push.apply(plan.statements, rsBulk(env, 'imgref', ['img', 'k'], refs));
  plan.statements.push.apply(plan.statements, rsBulk(env, 'imgown', ['img', 'st', 'k', 'uid', 'dept', 'ts'], Array.from(updates.values())));
  plan.imgTouch = [];
}
function rsSaveAudit(env, plan, A, meta, sid) {
  var allowed = Object.create(null);
  plan.kv.pend.forEach(function (p) {
    allowed[p.k] = 1;
  });
  var supplied = audClean(plan.sourceBody.aud, allowed),
    rows = [],
    now = Date.now();
  if (!A.__tkSrv && !plan.serverTrusted)
    supplied = supplied.filter(function (e) {
      return !/^tk/i.test(e.cid);
    });
  plan.kv.pend.forEach(function (pd) {
    var incoming = supplied.filter(function (e) {
      return e.k === pd.k;
    });
    if (!incoming.length)
      incoming = [
        {
          cid: sid + '_' + rows.length,
          k: pd.k,
          etype: 'dataset',
          eid: resName(pd.k),
          ename: resName(pd.k),
          act: pd.act === 'del' ? 'deleted' : 'changed',
          ctx: JSON.stringify({ atomic: true, snapshot: plan.snapshotRequired ? sid : undefined }),
          bef: '',
          aft:
            pd.act === 'del'
              ? ''
              : audClip(pd.k === K_USERS ? jsonDiff(stripPh(pd.cur || '[]'), stripPh(pd.v || '[]')) : jsonDiff(pd.cur, pd.v), AUD_STR),
        },
      ];
    incoming.forEach(function (e) {
      rows.push(
        Object.assign({}, e, {
          ts: now,
          uid: A.u.id,
          un: String(A.u.un || ''),
          dept: parseKey(pd.k).dept || '',
          ip: (meta && meta.ip) || '',
          dev: (meta && meta.dev) || '',
          city: (meta && meta.city) || '',
        }),
      );
    });
  });
  var cols = ['cid', 'ts', 'uid', 'un', 'dept', 'k', 'rev', 'etype', 'eid', 'ename', 'act', 'ctx', 'bef', 'aft', 'ip', 'dev', 'city'],
    st = [];
  rsChunks(rows).forEach(function (part) {
    st.push(
      env.DB.prepare(
        'INSERT OR IGNORE INTO aud(' +
          cols.join(',') +
          ') SELECT ' +
          cols
            .map(function (c) {
              return c === 'rev' ? "CAST((SELECT v FROM meta WHERE k='rev') AS INTEGER)" : "json_extract(j.value,'$." + c + "')";
            })
            .join(',') +
          ' FROM json_each(?1) j',
      ).bind(JSON.stringify(part)),
    );
  });
  return st;
}
/* This is the existing super-only whole-department lifecycle, not a public
   per-resource delete override. Fence all resource revisions, including absent
   resources, and compile physical deletion through the same atomic save plan. */
function rsDepartmentOperationalDeletes(env, reference, A, body, departments) {
  if (!Array.isArray(departments) || departments.length !== 1 || A.u.role !== 'super' ||
      !A.depts.some(function (d) { return d.id === departments[0]; })) throw rsError('forbidden', 403);
  var pending = [], guards = [], keys = [];
  opDefinitions().forEach(function (definition) {
    var key = 'bsdept:' + departments[0] + ':' + definition.resource,
      have = reference.inputRevs[key] || 0, base = (body.base || {})[key], current = reference.inputKeys[key];
    if (!Number.isSafeInteger(base) || base < 0 || base !== have) throw rsError('conflict', 409);
    keys.push(key); guards.push(revGuard(env, key, have));
    if (current != null) pending.push({k:key,act:'del',cur:current,v:null,have:have});
  });
  return {pending:pending,guards:guards,keys:keys};
}
async function rsSaveCommit(env, A, body, meta, opt) {
  opt = opt || {};
  var reference = opt.__reference || (await rsReferenceSnapshot(env, A.u.id)),
    actor = reference.A;
  ['tok', 'sessTs', '__tkSrv', '__tkSelf'].forEach(function (k) {
    if (A[k] !== undefined) actor[k] = A[k];
  });
  env = reference.env;
  A = actor;
  var operationKeys = Object.keys(body.set || {}).concat(body.del || []),
    operationalSave = operationKeys.some(opIsResource), referenceDependentSave = operationKeys.includes(K_USERS) || operationKeys.includes(K_PERM), operationFingerprint, operationRequestId, operationReadGuards=[];
  if (operationalSave && !opt.__employeeRequestId && !opt.__wipeRequestId) {
    operationRequestId = opt.__operationRequestId || body.requestId || (opt.srv ? enfSnapId('ops') : '');
    if (typeof operationRequestId !== 'string' || !/^[-A-Za-z0-9_]{8,100}$/.test(operationRequestId)) throw rsError('operations-request-id');
    if (!opt.srv && (!Number.isSafeInteger(body.epoch) || body.epoch < 0)) throw rsError('operations-epoch');
    operationFingerprint = opt.__operationFingerprint || await cuFingerprint({uid:A.u.id,body:body});
    var oldOperation = await env.DB.prepare('SELECT * FROM restore_operations WHERE account_uid=?1 AND request_id=?2').bind(A.u.id,operationRequestId).first();
    if (oldOperation) {
      if (oldOperation.fingerprint !== operationFingerprint || oldOperation.mode !== 'operations') throw rsError('operations-request-reused',409);
      if (!opt.srv&&operationKeys.some(function(k){return !canRead(A,k);})) throw rsError('operations-denied',403);
      await env.DB.batch(rsReferenceGuards(env, reference));
      return Object.assign(JSON.parse(oldOperation.result_json),{duplicate:1,v:oldOperation.revision});
    }
    if (!opt.srv && body.epoch !== Number(reference.inputMeta.restore_epoch || 0)) throw rsError('restore-epoch-changed',409);
    opt = Object.assign({},opt,{__allRequestedKeysRequired:true});
  }
  if(operationalSave){
    for(var readKey of Object.keys(body.base||{}).filter(opIsResource)){
      var readBase=body.base[readKey],writeKey=operationKeys.find(opIsResource),denied={},conflicts={};
      opInfo(readKey);
      if(!Number.isSafeInteger(readBase)||readBase<0)throw rsError('operations-base');
      if(!opt.srv&&!canRead(A,readKey)){
        denied[writeKey]={why:'read-reference-denied'};
        return {ok:0,requestId:operationRequestId,epoch:body.epoch,revs:{},denied:denied,conflicts:{},atomic:1};
      }
      if(readBase!==(reference.inputRevs[readKey]||0)){
        conflicts[writeKey]={why:'read-reference-changed'};
        return {ok:0,requestId:operationRequestId,epoch:body.epoch,revs:{},denied:{},conflicts:conflicts,atomic:1};
      }
      operationReadGuards.push(revGuard(env,readKey,readBase));
    }
  }
  var kv = await applySave(env, body, A, meta, Object.assign({}, opt, { quiet: true, __restorePlan: RESTORE_INTERNAL_TOKEN }));
  kv.revs = kv.revs || reference.inputRevs;
  if (opt.__serverDepartmentWipes) {
    var wipeOperations = rsDepartmentOperationalDeletes(env, reference, A, body, opt.__serverDepartmentWipes);
    kv.serverDepartmentWipes = opt.__serverDepartmentWipes;
    kv.pend.push.apply(kv.pend, wipeOperations.pending);
    operationReadGuards.push.apply(operationReadGuards, wipeOperations.guards);
    operationKeys = operationKeys.concat(wipeOperations.keys);
    operationalSave = true;
  }
  if (opt.__serverEmployeeIntent) kv.serverEmployeeIntent = opt.__serverEmployeeIntent;
  var transition = await cuPlanSaveTransition(env, A, body, kv);
  if (transition.blocked || !kv.ok) {
    if (transition.coupled || opt.__allRequestedKeysRequired || operationalSave) {
      var denied = Object.assign({}, kv.denied || (kv.out && kv.out.denied) || {}),
        conflicts = kv.conflicts || (kv.out && kv.out.conflicts) || {};
      var logs = Object.keys(denied).map(function (k) {
        return secStmt(env, { uid: A.u.id, act: 'denied', target: k, detail: denied[k].why || 'custody-transition' });
      });
      (kv.authzRows || []).forEach(function (r) {
        logs.push(enfLogStmt(env, r));
      });
      if (logs.length) await env.DB.batch(logs);
      return { ok:0, requestId:operationRequestId, epoch:body.epoch, v: await curRev(env), revs: {}, denied: denied, conflicts: conflicts, atomic: operationalSave ? 1 : kv.protectedOp || 'custody-transition' };
    }
    return await applySave(env, body, A, meta, Object.assign({}, opt, { __cuPass: RESTORE_INTERNAL_TOKEN }));
  }
  if (!transition.transitions.length && !opt.__serverDepartmentWipes && !opt.__employeeRequestId && !operationalSave && !referenceDependentSave)
    return await applySave(env, body, A, meta, Object.assign({}, opt, { __cuPass: RESTORE_INTERNAL_TOKEN }));
  kv.pend = kv.pend.filter(function (pd) {
    var changed = pd.act === 'del' ? pd.cur != null : pd.v !== pd.cur;
    // Canonical merges can turn an authorized write into a no-op (notably a
    // credential-redacted account list). Its current revision still settles
    // the requested key; the reference guards below fence that exact value.
    if (!changed) kv.out.revs[pd.k] = pd.have;
    return changed;
  });
  if (opt.__physicalDeleteKeys) rsPhysicalDeletes(kv, reference, opt.__physicalDeleteKeys);
  var departments = Array.from(
      new Set(
        transition.transitions
          .map(function (t) {
            return t.departmentId;
          })
          .concat(opt.__employeeDept ? [opt.__employeeDept] : [])
          .concat(opt.__serverDepartmentWipes || [])
          .concat(operationalSave ? operationKeys.filter(opIsResource).map(function(k){return opInfo(k).dept;}) : []),
      ),
    ),
    scope = { kind: departments.length === 1 ? 'dept' : 'full' };
  if (departments.length === 1) scope.departmentId = departments[0];
  var plan = {
    operation: 'save',
    body: {
      requestId: opt.__wipeRequestId || opt.__employeeRequestId || operationRequestId,
      scope: scope,
      mode: opt.__employeeIntent || (opt.__serverDepartmentWipes ? 'dept-' + (opt.__wipeKind || 'wipe') : operationalSave ? 'operations' : 'save'),
      reason: String(body.reason || ''),
    },
    sourceBody: body,
    serverTrusted: !!opt.srv,
    author: A,
    epoch: env.__restoreEpoch === undefined ? await rsEpoch(env) : env.__restoreEpoch,
    guards: [],
    statements: [],
    snapshots: [],
    revisionKeys: [],
    counts: { keys: kv.pend.length, custody: transition.transitions.length, notifications: 0 },
    authz: kv.authzRows || [],
    kv: kv,
    reauth: false,
    bumpEpoch: !!(opt.__wipeRequestId || opt.__employeeRequestId || transition.transitions.length),
    receiptRequired: !!(opt.__wipeRequestId || opt.__employeeRequestId || operationRequestId),
    forceFence: !!opt.__wipeRequestId,
    snapshotRequired: transition.transitions.some(function (t) {
      return /wipe|replace/.test(t.intent);
    }),
  };
  if (operationRequestId) { plan.fingerprint=operationFingerprint; plan.intent='operations'; plan.operationKeys=Array.from(new Set(operationKeys)); plan.operationResult=opt.__operationResult||{}; }
  plan.guards.push.apply(plan.guards,operationReadGuards);
  if (referenceDependentSave || operationalSave) plan.guards.push.apply(plan.guards, reference.operational.guards);
  if (opt.__operationSourceGuards) plan.guards.push.apply(plan.guards,opt.__operationSourceGuards);
  plan.guards.push.apply(plan.guards, rsWitness(env, 'kv', ['k', 'seq', 'v'], reference.inputRows));
  plan.guards.push.apply(plan.guards, rsWitness(env, 'meta', ['k', 'v'], reference.metaRows, "k<>'rev'"));
  await rsCompileKV(env, A, kv, plan, reference.inputRows);
  plan.guards.push.apply(plan.guards, transition.guards);
  plan.statements.push.apply(plan.statements, transition.statements);
  plan.revisionKeys.push.apply(plan.revisionKeys, transition.revisionKeys);
  var irWipeDepartments = Array.from(new Set(transition.transitions.filter(function (t) {
    return t.intent === 'dept-wipe';
  }).map(function (t) { return t.departmentId; }).concat(opt.__serverDepartmentWipes || [])));
  var irDepartmentChange = kv.pend.find(function (pd) { return pd.k === K_DEPTS; }),
    irFinalDepartments = irDepartmentChange ? (irDepartmentChange.act === 'del' ? [] : parseJson(irDepartmentChange.v, [])) : A.depts;
  plan.snapshotRequired = plan.snapshotRequired || irWipeDepartments.length > 0;
  for (var irDept of irWipeDepartments) {
    var irBase = opt.__irshadBase;
    if (!irBase) {
      irBase = {};
      IR_RES_NAMES.forEach(function (name, i) { irBase[name] = (body.base || {})[irKey(irDept, i)]; });
    }
    var irWipe = await irPlanWipe(env, A, {
      dept: irDept, base: irBase, intent: opt.__wipeKind === 'delete' ||
        !irFinalDepartments.some(function (d) { return d.id === irDept; }) ? 'dept-delete' : 'dept-wipe',
      reason: body.reason || '',
    });
    plan.guards.push.apply(plan.guards, irWipe.guards);
    plan.statements.push.apply(plan.statements, irWipe.statements);
    plan.revisionKeys.push.apply(plan.revisionKeys, irWipe.revisionKeys);
    plan.counts.irshad = (plan.counts.irshad || 0) + irWipe.snapshotRows.reports.length + irWipe.snapshotRows.catalogs.length + irWipe.snapshotRows.windows.length;
    Object.keys(irWipe.snapshotRows).forEach(function (kind) {
      plan.snapshots.push({ domain: 'irshad', table: irDept + ':' + kind, rows: irWipe.snapshotRows[kind] });
    });
  }
  await bdWipePlans(env,A,body,plan,irWipeDepartments,opt,irFinalDepartments);
  await bdEmployeeCleanupPlan(env,A,body,plan,reference,opt,irWipeDepartments);
  if (!plan.snapshotRequired) plan.snapshots = [];
  else
    for (var dept of departments) {
      var full = await cuSnapshotRows(env, dept);
      Object.keys(full).forEach(function (n) {
        plan.snapshots.push({ domain: 'custody', table: dept + ':' + n, rows: full[n] });
      });
    }
  if (opt.__employeeRequestId) {
    plan.fingerprint = opt.__employeeFingerprint;
    plan.intent = opt.__employeeIntent;
    Object.assign(plan.counts, opt.__employeeResult.counts);
    plan.warnings = opt.__employeeResult.warnings || [];
  }
  if (opt.__serverDepartmentWipes) {
    var d = departments[0],
      emptyNF = { version: 1, messages: [], targets: [], states: [], dedup: [], overrides: [], checkpoints: [] },
      np = await rsNFPlan(env, emptyNF, { kind: 'dept', departmentId: d }, opt.__notificationBase, 'replace');
    plan.guards.push.apply(plan.guards, np.guards);
    plan.statements.push.apply(plan.statements, np.statements);
    plan.revisionKeys.push.apply(plan.revisionKeys, np.revisionKeys);
    plan.snapshots.push.apply(plan.snapshots, np.snapshots);
    plan.counts.notifications = opt.__notificationCount || 0;
    plan.counts.accounts = opt.__accountCount || 0;
    plan.counts.irshad = opt.__irshadCount || 0;
    plan.counts.seized = opt.__seizedCount || 0;
    plan.counts.awards = opt.__awardsCount || 0;
    await rsCustodyReceiptPreimage(env, d, plan);
    plan.fingerprint = opt.__wipeFingerprint;
  }
  await rsImageMetadataPlan(env, A, plan, reference);
  var ack = await rsCommit(env, A, plan, meta);
  if (operationRequestId) return Object.assign(ack,{v:ack.rev,denied:{},conflicts:{},atomic:1});
  if (opt.__employeeRequestId) return ack;
  if (opt.__serverDepartmentWipes) return Object.assign(ack, { dept: departments[0], requestId: opt.__wipeRequestId });
  var out = kv.out || { revs: {}, denied: {}, conflicts: {} };
  out.v = ack.rev;
  out.atomic = kv.protectedOp || 'custody-transition';
  plan.revisionKeys.forEach(function (k) {
    out.revs[k] = ack.rev;
  });
  return out;
}
async function rsWipeInventory(env, A, dept, kind) {
  kind = kind || 'wipe';
  if (A.u.role !== 'super') throw rsError('forbidden', 403);
  await irGuardRetired(env);
  var reference = await rsReferenceSnapshot(env, A.u.id);
  A = reference.A;
  if (
    A.u.role !== 'super' ||
    !A.depts.some(function (d) {
      return d.id === dept;
    })
  )
    throw rsError('forbidden', 403);
  var kv = Object.create(null);
  Object.keys(reference.inputKeys).forEach(function (k) {
    if (parseKey(k).dept === dept && !opIsResource(k)) kv[k] = reference.inputRevs[k] || 0;
  });
  var scopedCount = Object.keys(kv).length;
  opDefinitions().forEach(function (definition) {
    var key = 'bsdept:' + dept + ':' + definition.resource;
    kv[key] = reference.inputRevs[key] || 0;
    if (reference.inputKeys[key] != null) scopedCount++;
  });
  var businessBase=await bdRestoreRevisions(env,[dept],false), businessCounts={};
  for(var def of bdDefinitions())businessCounts[def.name]=await bdCount(env,def,dept);
  if (kind === 'delete')
    [K_DEPTS, K_USERS, K_PERM].forEach(function (k) {
      kv[k] = reference.inputRevs[k] || 0;
    });
  var counts = await env.DB.batch([
      env.DB.prepare('SELECT COUNT(*) n FROM custody_items WHERE department_id=?1').bind(dept),
      env.DB.prepare('SELECT COUNT(*) n FROM custody_movements WHERE department_id=?1').bind(dept),
      env.DB.prepare('SELECT COUNT(*) n FROM notification_messages WHERE scope=?1').bind('d:' + dept),
      env.DB.prepare('SELECT (SELECT COUNT(*) FROM irshad_reports WHERE department_id=?1)+(SELECT COUNT(*) FROM irshad_catalog_entries WHERE department_id=?1)+(SELECT COUNT(*) FROM irshad_retro_windows WHERE department_id=?1) n').bind(dept),
      irRevisionRowsStatement(env, dept),
    ]),
    nf = await nfRead(env);
  return {
    reference: reference,
    public: {
      ok: 1,
      kind: kind,
      dept: dept,
      department: {
        id: dept,
        name: String(
          (
            A.depts.find(function (d) {
              return d.id === dept;
            }) || {}
          ).name || '',
        ),
      },
      base: {
        epoch: await rsEpoch(env),
        kv: kv,
        custody: await cuRev(env, dept),
        irshad: irRevisionResult(counts[4].results || [], dept),
        seized: businessBase.seized[dept],
        awards: businessBase.awards[dept],
        notifications: { rev: nf.rev, configRev: nf.configRev, broadcastRev: nf.broadcastRev },
      },
      counts: {
        keys: scopedCount,
        accounts:
          kind === 'delete'
            ? A.users.filter(function (u) {
                return u && (u.role === 'dept' || u.role === 'staff') && u.deptId === dept;
              }).length
            : 0,
        custody: Number(counts[0].results[0].n) + Number(counts[1].results[0].n),
        notifications: Number(counts[2].results[0].n),
        irshad: Number(counts[3].results[0].n),
        seized: businessCounts.seized,
        awards: businessCounts.awards,
      },
    },
  };
}
async function rsWipeRoute(env, request, url, ss) {
  var kind = url.pathname === '/api/admin/dept-delete' ? 'delete' : 'wipe';
  try {
    var A = await actorOf(env, ss.uid);
    if (!A) throw rsError('session', 401);
    if (A.u.role !== 'super') throw rsError('forbidden', 403);
    if (request.method === 'GET') return json((await rsWipeInventory(env, A, url.searchParams.get('dept') || '', kind)).public);
    if (request.method !== 'POST') throw rsError('method', 405);
    var bytes = await request.arrayBuffer();
    if (bytes.byteLength > 1024 * 1024) throw rsError('body-large', 413);
    var input;
    try {
      input = JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) {
      throw rsError('bad-body');
    }
    var shapeError = bodyCheck(url.pathname,input); if(shapeError) return json({ok:0,err:'bad-body',at:shapeError},400);
    rsShape(input, ['uid', 'dept', 'requestId', 'base', 'reason']);
    if (input.uid !== undefined && input.uid !== ss.uid) throw rsError('session-changed', 409);
    if (typeof input.dept !== 'string' || typeof input.requestId !== 'string' || !/^[-A-Za-z0-9_]{8,100}$/.test(input.requestId))
      throw rsError('bad-body');
    rsShape(input.base, ['epoch', 'kv', 'custody', 'notifications', 'irshad', 'seized', 'awards']);
    var fingerprint = hex(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify({ kind: kind, input: cuCanonical(input) }))),
      ),
      old = await env.DB.prepare('SELECT * FROM restore_operations WHERE account_uid=?1 AND request_id=?2')
        .bind(A.u.id, input.requestId)
        .first();
    if (old) {
      if (old.fingerprint !== fingerprint) throw rsError('restore-request-reused', 409);
      return json(Object.assign(await rsCommit(env, A, { receipt: old }, reqMeta(request)), { dept: input.dept }));
    }
    var inventory = await rsWipeInventory(env, A, input.dept, kind),
      observed = inventory.public;
    if (!deq(cuCanonical(input.base), cuCanonical(observed.base))) throw rsError('conflict', 409);
    var set = Object.create(null),
      del = [],
      base = Object.assign(Object.create(null), input.base.kv),
      why = Object.create(null);
    Object.keys(input.base.kv).forEach(function (k) {
      if (parseKey(k).dept !== input.dept) return;
      if (input.reason !== undefined) {
        if (typeof input.reason !== 'string' || input.reason.length > 300) throw rsError('bad-reason');
        why[k] = input.reason.trim();
      }
      if (opIsResource(k)) return;
      if (cuLegacyKey(k) || nfLegacyKey(k) || (irLegacyKey(k) || bdLegacyKey(k))) throw rsError('domain-moved');
      var e = ENT[resName(k)];
      if (e && typeof e.empty === 'string') set[k] = e.empty;
      else del.push(k);
    });
    base[cuKey(input.dept)] = input.base.custody;
    if (kind === 'delete') {
      var current = inventory.reference.A;
      set[K_DEPTS] = JSON.stringify(
        current.depts.filter(function (d) {
          return d.id !== input.dept;
        }),
      );
      set[K_USERS] = JSON.stringify(
        current.users.filter(function (u) {
          return !((u.role === 'dept' || u.role === 'staff') && u.deptId === input.dept);
        }),
      );
      if (input.reason) {
        why[K_DEPTS] = input.reason.trim();
        why[K_USERS] = input.reason.trim();
      }
    }
    var outcome = await rsSaveCommit(
      env,
      A,
      { set: set, del: del, base: base, why: why, reason: typeof input.reason === 'string' ? input.reason.trim() : '' },
      reqMeta(request),
      {
        __reference: inventory.reference,
        __serverDepartmentWipes: [input.dept],
        __wipeRequestId: input.requestId,
        __wipeFingerprint: fingerprint,
        __notificationBase: input.base.notifications,
        __notificationCount: observed.counts.notifications,
        __irshadBase: input.base.irshad,
        __seizedBase: input.base.seized,
        __awardsBase: input.base.awards,
        __irshadCount: observed.counts.irshad,
        __seizedCount: observed.counts.seized,
        __awardsCount: observed.counts.awards,
        __accountCount: observed.counts.accounts,
        __wipeKind: kind,
        __physicalDeleteKeys:
          kind === 'delete'
            ? Object.keys(input.base.kv).filter(function (k) {
                return parseKey(k).dept === input.dept;
              })
            : [],
      },
    );
    if (outcome.ok !== 1)
      return json(
        {
          ok: 0,
          err: Object.keys(outcome.conflicts || {}).length ? 'conflict' : 'denied',
          denied: outcome.denied,
          conflicts: outcome.conflicts,
        },
        Object.keys(outcome.conflicts || {}).length ? 409 : 403,
      );
    return json(outcome);
  } catch (e) {
    if (e.rs) return json({ ok: 0, err: e.rs }, e.status);
    if (e.szCode || e.awCode) return bdErrorResponse(e);
    if (e.irCode) return json({ ok: 0, err: e.irCode, at: e.irPath }, e.irStatus);
    if (e.cuCode) return json({ ok: 0, err: e.cuCode }, e.cuStatus);
    if (e.nf) return json({ ok: 0, err: e.nf }, e.status);
    if (/KIVO_IRSHAD_LEGACY_SOURCE/.test(String(e))) return json({ ok: 0, err: 'irshad-legacy-source-present' }, 503);
    if (/KIVO_RESTORE_EPOCH|KIVO_RESTORE_TARGET|KIVO_REV_CONFLICT|KIVO_CUSTODY_TARGET_CHANGED/.test(String(e)))
      return json({ ok: 0, err: 'conflict' }, 409);
    throw e;
  }
}
async function rsEmployeeRoute(env, request, url, ss) {
  try {
    var caller = await actorOf(env, ss.uid);
    if (!caller) throw rsError('session', 401);
    var reference = await rsReferenceSnapshot(env, ss.uid),
      A = reference.A;
    env = reference.env;
    env.__employeeReference = { keys: reference.inputKeys, revs: reference.inputRevs };
    if (request.method === 'GET') {
      var context = await empTransitionContext(env, A, url.searchParams.get('dept') || '', url.searchParams.get('intent') || '');
      context.base.epoch = env.__restoreEpoch === undefined ? await rsEpoch(env) : env.__restoreEpoch;
      context.employees = privEmpOut(A, context.dept, context.employees);   // PRIVACY (019u): personal fields by purpose (a delete-only holder)
      await privPrepDepts(env, A, [context.dept]); context.staffAccountKeys = context.staffAccountKeys.map(function (k) { return privKeyOut(A, context.dept, k); });   // 019u (9)
      return json(context);
    }
    if (request.method !== 'POST') throw rsError('method', 405);
    var bytes = await request.arrayBuffer();
    if (bytes.byteLength > 8 * 1024 * 1024) throw rsError('body-large', 413);
    var input;
    try {
      input = JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) {
      throw rsError('bad-body');
    }
    var shapeError = bodyCheck(url.pathname,input); if(shapeError) return json({ok:0,err:'bad-body',at:shapeError},400);
    if (!isObj(input) || (input.uid !== undefined && input.uid !== ss.uid)) throw rsError('session-changed', 409);
    if (typeof input.requestId !== 'string' || !/^[-A-Za-z0-9_]{8,100}$/.test(input.requestId)) throw rsError('employee-request-id');
    var fingerprint = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(cuCanonical(input))))),
      old = await env.DB.prepare('SELECT * FROM restore_operations WHERE account_uid=?1 AND request_id=?2')
        .bind(A.u.id, input.requestId)
        .first();
    if (old) {
      if (old.fingerprint !== fingerprint) throw rsError('restore-request-reused', 409);
      return json(await rsCommit(env, A, { receipt: old }, reqMeta(request)));
    }
    if (!isObj(input.base) || input.base.epoch !== +(reference.inputMeta.restore_epoch || 0)) throw rsError('restore-epoch-changed', 409);
    var prepared = await empPrepareTransition(env, A, input),
      outcome = await rsSaveCommit(env, A, prepared.body, reqMeta(request), {
        __reference: reference,
        __serverEmployeeIntent: prepared.context.serverEmployeeIntent,
        __allRequestedKeysRequired: true,
        __employeeRequestId: input.requestId,
        __employeeFingerprint: fingerprint,
        __employeeDept: input.dept,
        __employeeIntent: input.intent,
        __employeeResult: prepared.result,
        __operationSourceGuards: prepared.context.sourceGuards,
        __awardsBase: input.base.awards,
      });
    if (outcome.ok !== 1)
      return json(
        {
          ok: 0,
          err: Object.keys(outcome.conflicts || {}).length ? 'conflict' : 'denied',
          denied: outcome.denied,
          conflicts: outcome.conflicts,
        },
        Object.keys(outcome.conflicts || {}).length ? 409 : 403,
      );
    return json(outcome);
  } catch (e) {
    if (e.rs) return json({ ok: 0, err: e.rs }, e.status);
    if (e.szCode || e.awCode) return bdErrorResponse(e);
    if (e.irCode) return json({ ok: 0, err: e.irCode, at: e.irPath }, e.irStatus);
    if (e.cuCode) return json({ ok: 0, err: e.cuCode }, e.cuStatus);
    if (e.nf) return json({ ok: 0, err: e.nf }, e.status);
    if (/KIVO_IRSHAD_LEGACY_SOURCE/.test(String(e))) return json({ ok: 0, err: 'irshad-legacy-source-present' }, 503);
    if (/KIVO_RESTORE_EPOCH|KIVO_RESTORE_TARGET|KIVO_REV_CONFLICT|KIVO_CUSTODY_TARGET_CHANGED/.test(String(e)))
      return json({ ok: 0, err: 'conflict' }, 409);
    throw e;
  }
}

/* Existing reset transaction, delegated from the authenticated admin router. */
async function rsResetRoute(env, request, path, url, AX, superX) {
  if (!superX) return json({ ok: 0, err: 'forbidden' }, 403);
  var rbz = await bodyRead(request, path); if (rbz.res) return rbz.res; var bz = rbz.v;   /* KIVO_264 · SOT-101 · E5: null كان 500 */
  var gkZ = 'pw:' + AX.u.id;
  if (await guardLeft(env, gkZ) > 0) return json({ ok: 0, err: 'محاولات كثيرة — انتظر قليلاً' });
  var okZ = await verifyPw(String(bz.pw == null ? '' : bz.pw), AX.u.ph);
  if (okZ === 'unsupported') return json({ ok: 0, err: ERR_ITER });
  if (okZ !== true) { await guardFail(env, gkZ); return json({ ok: 0, err: 'كلمة المرور غير صحيحة' }); }
  var rkZ = await metaGet(env, 'rk');
  if (!rkZ) return json({ ok: 0, err: 'أنشئ مفتاح استعادة أولاً — التهيئة لا تُنفَّذ بدونه' });
  if ((await verifyPw('rk:' + normKey(bz.key), rkZ)) !== true) { await guardFail(env, gkZ); return json({ ok: 0, err: 'مفتاح الاستعادة غير صحيح' }); }
  if (String(bz.confirm || '') !== 'تهيئة') return json({ ok: 0, err: 'اكتب كلمة «تهيئة» للتأكيد' });
  var adZ = isObj(bz.admin) ? bz.admin : {};
  var unZ = String(adZ.un || '').trim(), nmZ = String(adZ.name || '').trim() || 'مدير النظام', pwZ = String(adZ.pw || '');
  if (!unCheck(unZ)) return json({ ok: 0, err: 'اسم مستخدم مدير النظام: رقم جوال أو هوية من 10 أرقام' });
  if (!pwCheck(pwZ, 'super')) return json({ ok: 0, err: 'كلمة مرور مدير النظام الجديد ضعيفة — 6 أرقام' });
  await guardReset(env, gkZ);
  var rmZ = reqMeta(request);
  var keepBrand = !!bz.keepBrand, platZ = keepBrand ? await kvGet(env, 'kv', K_PLAT) : null;
  var phZ = await hashPw(pwZ);
  var usersZ = [{ id: 'su', un: unZ, ph: phZ, name: nmZ, role: 'super', mc: 1 }];
  var stZ = [
    env.DB.prepare('DELETE FROM notification_user_state'), env.DB.prepare('DELETE FROM notification_targets'), env.DB.prepare('DELETE FROM notification_messages'),
    env.DB.prepare('DELETE FROM notification_dedup'), env.DB.prepare('DELETE FROM notification_type_overrides'), env.DB.prepare('DELETE FROM notification_checkpoints'),
    env.DB.prepare('DELETE FROM irshad_requests'), env.DB.prepare('DELETE FROM irshad_report_languages'), env.DB.prepare('DELETE FROM irshad_reports'), env.DB.prepare('DELETE FROM irshad_catalog_entries'), env.DB.prepare('DELETE FROM irshad_retro_windows'),
    env.DB.prepare("DELETE FROM meta WHERE k GLOB 'irshad:*:presence*'"),
    env.DB.prepare('DELETE FROM custody_request_outputs'), env.DB.prepare('DELETE FROM custody_requests'), env.DB.prepare('DELETE FROM custody_movements'), env.DB.prepare('DELETE FROM custody_issues'), env.DB.prepare('DELETE FROM custody_items'),
    env.DB.prepare('DELETE FROM restore_operations'), env.DB.prepare('DELETE FROM restore_preimage'), env.DB.prepare('DELETE FROM restore_snapshot_manifest'),
    env.DB.prepare('DELETE FROM daily_stats_day_locks'), env.DB.prepare('DELETE FROM daily_stats_month_locks'), env.DB.prepare('DELETE FROM daily_stats_days'),
    env.DB.prepare('DELETE FROM kv'), env.DB.prepare('DELETE FROM imgs'), env.DB.prepare('DELETE FROM revs'),
    env.DB.prepare('DELETE FROM imgown'), env.DB.prepare('DELETE FROM imgref'), env.DB.prepare("DELETE FROM meta WHERE k = 'imgown'"),
    env.DB.prepare('DELETE FROM audit'), env.DB.prepare('DELETE FROM sess'), env.DB.prepare('DELETE FROM guard'),
    env.DB.prepare('DELETE FROM meta WHERE k IN (?1, ?2, ?3, ?4, ?5)').bind('rev', 'rk', 'rk_uid', 'rk_meta', 'rk_used')
  ];
  stZ = opResetStatements(env).concat(bdResetStatements(env),stZ);
  stZ = stZ.concat(kvPutStmts(env, 'kv', K_USERS, JSON.stringify(usersZ)));
  stZ.push(env.DB.prepare('INSERT INTO revs (k, rev) VALUES (?1, ?2)').bind(K_USERS, 1));
  if (platZ) { stZ = stZ.concat(kvPutStmts(env, 'kv', K_PLAT, platZ)); stZ.push(env.DB.prepare('INSERT INTO revs (k, rev) VALUES (?1, ?2)').bind(K_PLAT, 1)); }
  stZ.push(env.DB.prepare('INSERT INTO meta (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = ?2').bind('rev', '1'));
  if(!Number.isSafeInteger(env.__restoreEpoch)||env.__restoreEpoch>=Number.MAX_SAFE_INTEGER)throw dbGuardError('db-restore-epoch-invalid');
  stZ.push(env.DB.prepare("INSERT INTO meta(k,v) VALUES('restore_epoch',?1) ON CONFLICT(k) DO UPDATE SET v=excluded.v").bind(String(env.__restoreEpoch+1)),env.DB.prepare('DELETE FROM sec'),audEvStmt(env, { cid: 'reset_' + Date.now().toString(36), ts: Date.now(), uid: AX.u.id, un: AX.u.un, dept: '', k: 'system', rev: 1, etype: 'system', eid: 'platform', ename: 'المنصة', act: 'reset', ctx: JSON.stringify({ keepBrand: keepBrand, newAdmin: unZ }), bef: '', aft: '' }),secStmt(env, { uid: AX.u.id, un: AX.u.un, act: 'reset', detail: JSON.stringify({ keepBrand: keepBrand, newAdmin: unZ, byName: AX.u.name || '' }), ip: rmZ.ip, city: rmZ.city, dev: rmZ.dev }));
  await env.DB.batch(stZ);
  return json({ ok: 1 }, 200, clearCookie(url));
}
