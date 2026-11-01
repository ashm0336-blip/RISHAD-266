async function rsReferenceSnapshot(env, uid, options) {
  /* One coherent reference snapshot feeds actor construction and applySave. Its
     complete row witness is rechecked INSIDE the eventual write transaction. */
  var inputs = await env.DB.batch([
      env.DB.prepare('SELECT k,seq,v FROM kv ORDER BY k,seq'),
      env.DB.prepare("SELECT k,v FROM meta WHERE k<>'rev' ORDER BY k"),
      env.DB.prepare('SELECT k,rev FROM revs'),
    ]),
    inputRows = inputs[0].results || [],
    inputKeys = kvJoin(inputRows),
    inputMeta = {},
    inputRevs = {};
  (inputs[1].results || []).forEach(function (r) {
    inputMeta[r.k] = r.v;
  });
  (inputs[2].results || []).forEach(function (r) {
    inputRevs[r.k] = r.rev;
  });
  var operational = await opCaptureReferences(env, inputKeys, options && options.operationalKeys);
  inputKeys = operational.keys; Object.assign(inputRevs, operational.revs);
  env = Object.assign({}, env, { __pre: { live: true, kv: inputKeys, meta: inputMeta, revs: inputRevs }, __opCapture: operational });
  var currentActor = actorFromKeys(inputKeys, uid);
  if (!currentActor) throw rsError('session', 401);
  var currentMode = await enfModeOf(env);
  if (currentMode.mode === 'unavailable') throw rsError('authz-unavailable', 503);
  if (currentMode.mode === 'enforce') {
    currentActor.enf = currentMode;
    enfAttachGrantsKeys(currentActor, inputKeys);
  }
  return {
    env: env,
    A: currentActor,
    inputRows: inputRows,
    inputKeys: inputKeys,
    inputMeta: inputMeta,
    inputRevs: inputRevs,
    inputRevRows: inputs[2].results || [],
    operational: operational,
    metaRows: inputs[1].results || [],
  };
}
function rsReferenceGuards(env, reference, allRevisions) {
  if (!reference || !reference.operational) throw rsError('reference-unavailable', 503);
  var guards = rsWitness(env, 'kv', ['k', 'seq', 'v'], reference.inputRows)
    .concat(rsWitness(env, 'meta', ['k', 'v'], reference.metaRows, "k<>'rev'"))
    .concat(reference.operational.guards);
  if (allRevisions) {
    if (!Array.isArray(reference.inputRevRows)) throw rsError('reference-revisions', 503);
    guards.push.apply(guards, rsWitness(env, 'revs', ['k', 'rev'], reference.inputRevRows));
  }
  return guards;
}
async function rsCompileKV(env, A, kv, plan, inputRows) {
  var operational = kv.pend.filter(function (pd) { return opIsResource(pd.k); });
  if (operational.length) {
    plan.counts.operations = operational.length;
    // The save/restore caller fences its complete operational reference once.
    await opCompilePending(env, plan, operational, env.__opCapture);
  }
  var put = [],
    remove = [];
  for (var pd of kv.pend) {
    if (opIsResource(pd.k)) {
      if ((imgLike(pd.cur || '') || imgLike(pd.v || '')) && pd.cur !== pd.v)
        (plan.imgTouch || (plan.imgTouch = [])).push({k: pd.k, v: pd.act === 'set' ? pd.v : ''});
      continue;
    }
    plan.guards.push(revGuard(env, pd.k, pd.have));
    var rows = inputRows.filter(function (row) {
      return row.k === pd.k;
    });
    plan.snapshots.push({ domain: 'kv', table: pd.k, rows: rows.length ? rows : [{ k: pd.k, absent: true }] });
    if ((imgLike(pd.cur || '') || imgLike(pd.v || '')) && pd.cur !== pd.v)
      (plan.imgTouch || (plan.imgTouch = [])).push({ k: pd.k, v: pd.act === 'set' ? pd.v : '' });
    remove.push({ k: pd.k });
    if (pd.act === 'set')
      rsTextParts(pd.v).forEach(function (part, j) {
        put.push({ k: pd.k, seq: j, v: part });
      });
    plan.revisionKeys.push(pd.k);
    if (pd.k === K_USERS) {
      var a = parseJson(pd.cur, []),
        b = parseJson(pd.v, []),
        sessionIds = usersSessStmts(
          {
            DB: {
              prepare: function () {
                return {
                  bind: function (id) {
                    return id;
                  },
                };
              },
            },
          },
          a,
          b,
          A.u.id,
          plan.operation === 'save' ? A.tok || '' : '',
        );
      var old = new Map(
        a.map(function (u) {
          return [u.id, u];
        }),
      );
      if (plan.operation !== 'save')
        b.forEach(function (u) {
          var x = old.get(u.id);
          if (
            x &&
            ['un', 'alt', 'role', 'deptId', 'gid', 'ekey', 'mgr'].some(function (k) {
              return !deq(x[k], u[k]);
            })
          )
            sessionIds.push(u.id);
        });
      sessionIds = Array.from(new Set(sessionIds));
      /* RISHAD-266 · unify (batch 2): AUD-035 — a self password change keeps the requester's own session and ends
         only his other sessions (usersSessStmts above already says so, but the stub prepare dropped the token here,
         so the bulk delete below ended the requester's session too and the next request failed with 'session'). */
      var keepTok = plan.operation === 'save' && A.tok ? A.tok : '',
        actorRow = b.filter(function (u) {
          return u && u.id === A.u.id;
        })[0],
        actorOld = old.get(A.u.id);
      if (keepTok && sessionIds.indexOf(A.u.id) >= 0 && actorRow && actorOld && !actorRow.dis && actorRow.ph !== actorOld.ph) {
        sessionIds = sessionIds.filter(function (id) {
          return id !== A.u.id;
        });
        plan.statements.push(env.DB.prepare('DELETE FROM sess WHERE uid = ?1 AND tok <> ?2').bind(A.u.id, keepTok));
      }
      plan.reauth = sessionIds.indexOf(A.u.id) >= 0;
      rsChunks(
        sessionIds.map(function (id) {
          return { id: id };
        }),
      ).forEach(function (part) {
        plan.statements.push(
          env.DB.prepare("DELETE FROM sess WHERE uid IN (SELECT json_extract(value,'$.id') FROM json_each(?1))").bind(JSON.stringify(part)),
        );
      });
      plan.counts.accountsWithoutCredential = b.filter(function (u) {
        return !u.ph && !old.has(u.id);
      }).length;
      var sec = usersSecEvents(a, b, kv.ident, Date.now());
      plan.statements.push.apply(
        plan.statements,
        rsBulk(env, 'sec', ['ts', 'uid', 'un', 'act', 'target', 'detail', 'ip', 'city', 'dev'], sec),
      );
    }
    if (pd.k === K_PERM)
      plan.statements.push(
        secStmt(env, { uid: A.u.id, act: 'perm_change', detail: permChangeDetail(parseJson(pd.cur, {}), parseJson(pd.v, {})) }),
      );
  }
  rsChunks(remove).forEach(function (part) {
    plan.statements.push(
      env.DB.prepare("DELETE FROM kv WHERE k IN (SELECT json_extract(value,'$.k') FROM json_each(?1))").bind(JSON.stringify(part)),
    );
  });
  plan.statements.push.apply(plan.statements, rsBulk(env, 'kv', ['k', 'seq', 'v'], put));
}
/* Closed domain compiler; exactly one atomic D1 batch. */
var RESTORE_INTERNAL_TOKEN = {};
function rsError(code, status) {
  var e = new Error(code);
  e.rs = code;
  e.status = status || 400;
  return e;
}
function rsShape(o, keys) {
  if (
    !isObj(o) ||
    Object.keys(o).some(function (k) {
      return keys.indexOf(k) < 0;
    })
  )
    throw rsError('restore-shape');
  return o;
}
function rsNat(n) {
  if (!Number.isSafeInteger(n) || n < 0) throw rsError('restore-base');
  return n;
}
function rsChunks(rows) {
  var all = [],
    part = [],
    n = 2;
  rows.forEach(function (r) {
    var len = new TextEncoder().encode(JSON.stringify(r)).byteLength + 1;
    if (len > 500000) throw rsError('restore-row-large', 413);
    if (n + len > 500000 && part.length) {
      all.push(part);
      part = [];
      n = 2;
    }
    part.push(r);
    n += len;
  });
  if (part.length) all.push(part);
  return all;
}
function rsTextParts(s) {
  var parts = [],
    at = 0;
  while (at < s.length) {
    var end = Math.min(s.length, at + 100000);
    if (end < s.length && s.charCodeAt(end - 1) >= 0xd800 && s.charCodeAt(end - 1) <= 0xdbff) end--;
    parts.push(s.slice(at, end));
    at = end;
  }
  return parts.length ? parts : [''];
}
async function rsEpoch(env) {
  var r = await env.DB.prepare("SELECT v FROM meta WHERE k='restore_epoch'").first();
  return r ? rsNat(+r.v) : 0;
}
function rsEpochGuard(db, epoch) {
  return db
    .prepare(
      "SELECT CASE WHEN COALESCE((SELECT CAST(v AS INTEGER) FROM meta WHERE k='restore_epoch'),0)<>?1 THEN json_extract('{}','KIVO_RESTORE_EPOCH') END",
    )
    .bind(epoch);
}
/* Exact row witness, including extra/missing rows. Bounded transport chunks are
   each checked as subsets; total cardinality makes the union exact. */
function rsBound(statement, args) {
  return statement.bind.apply(statement, args);
}
function rsWitness(env, table, cols, rows, where, args) {
  args = args || [];
  var predicate = (where || '1').replace(/\?([1-9][0-9]*)/g, function (_, n) {
      return '?' + (+n + 1);
    }),
    count = env.DB.prepare(
      'SELECT CASE WHEN (SELECT COUNT(*) FROM ' + table + ' WHERE ' + predicate + ")<>?1 THEN json_extract('{}','KIVO_RESTORE_TARGET') END",
    ),
    st = [rsBound(count, [rows.length].concat(args))],
    expr = cols.join(',');
  /* Legacy CHUNK is 700,000 characters. Guard it by exact UTF-8 byte slices;
     never send that complete value as a parameter or hash it with weaker SQL. */
  if (table === 'kv' || table === 'imgs') {
    var pieces = [];
    rows.forEach(function (r) {
      var offset = 1,
        total = new TextEncoder().encode(r.v).byteLength;
      rsTextParts(r.v).forEach(function (text) {
        var bytes = new TextEncoder().encode(text).byteLength;
        pieces.push({ k: r.k, seq: r.seq, offset: offset, bytes: bytes, total: total, text: text });
        offset += bytes;
      });
    });
    rsChunks(pieces).forEach(function (part) {
      st.push(
        env.DB.prepare(
          'SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(?1) j WHERE NOT EXISTS(SELECT 1 FROM ' +
            table +
            " t WHERE t.k=json_extract(j.value,'$.k') AND t.seq=json_extract(j.value,'$.seq') AND length(CAST(t.v AS BLOB))=json_extract(j.value,'$.total') AND (json_extract(j.value,'$.bytes')=0 OR substr(CAST(t.v AS BLOB),json_extract(j.value,'$.offset'),json_extract(j.value,'$.bytes'))=CAST(json_extract(j.value,'$.text') AS BLOB)))) THEN json_extract('{}','KIVO_RESTORE_TARGET') END",
        ).bind(JSON.stringify(part)),
      );
    });
    return st;
  }
  // Compare SQL values, not JSON text: REAL 0.0 and the same D1 number 0
  // serialize differently, while EXCEPT preserves null/text/number semantics.
  rsChunks(rows).forEach(function (part) {
    st.push(
      rsBound(
        env.DB.prepare(
          'SELECT CASE WHEN EXISTS(SELECT ' +
            cols
              .map(function (c) {
                return "json_extract(j.value,'$." + c + "')";
              })
              .join(',') +
            ' FROM json_each(?1) j EXCEPT SELECT ' +
            expr +
            ' FROM ' +
            table +
            ' WHERE ' +
            predicate +
            ") THEN json_extract('{}','KIVO_RESTORE_TARGET') END",
        ),
        [JSON.stringify(part)].concat(args),
      ),
    );
  });
  return st;
}
function rsBulk(env, table, cols, rows) {
  return nfBulk(env, table, cols, rows, '');
}
function rsSnapshotRows(sid, domain, table, rows) {
  var physical = [];
  rows.forEach(function (r, rowIndex) {
    var value = JSON.stringify(r);
    if (new TextEncoder().encode(value).byteLength <= 200000) physical.push(value);
    else {
      var parts = rsTextParts(value);
      parts.forEach(function (text, index) {
        physical.push(JSON.stringify({ __restore_fragment: 1, rowIndex: rowIndex, index: index, count: parts.length, text: text }));
      });
    }
  });
  return physical.map(function (value, i) {
    return { snapshot_id: sid, domain: domain, table_key: table, row_number: i, row_json: value };
  });
}
function rsMergeRows(old, next, cols, pk) {
  var map = new Map();
  old.concat(next).forEach(function (r) {
    map.set(
      JSON.stringify(
        pk.map(function (c) {
          return r[c];
        }),
      ),
      r,
    );
  });
  return Array.from(map.values());
}
function rsSameRows(a, b) {
  return (
    JSON.stringify(
      a
        .map(function (r) {
          return JSON.stringify(cuCanonical(r));
        })
        .sort(),
    ) ===
    JSON.stringify(
      b
        .map(function (r) {
          return JSON.stringify(cuCanonical(r));
        })
        .sort(),
    )
  );
}
/* A closed full/dept deletion first authorizes the canonical legal-empty
   transition, then physically removes only the server-derived scoped keys. */
function rsPhysicalDeletes(kv, reference, keys) {
  var by = new Map(
    kv.pend.map(function (p) {
      return [p.k, p];
    }),
  );
  keys.forEach(function (k) {
    if (!parseKey(k).dept) throw rsError('atomic-delete-scope');
    if (!Object.prototype.hasOwnProperty.call(reference.inputKeys, k)) return;
    if (opIsResource(k) && reference.inputKeys[k] == null) return;
    var pd = by.get(k);
    if (!pd) {
      var e = ENT[resName(k)];
      if (!e || reference.inputKeys[k] !== e.empty) throw rsError('atomic-delete-validation');
      pd = { k: k, cur: reference.inputKeys[k], have: reference.inputRevs[k] || 0 };
    }
    by.set(k, Object.assign({}, pd, { act: 'del', v: null }));
  });
  kv.pend = Array.from(by.values());
}
/* Match the existing backup callers: full merge only adds NEW departments;
   department merge only creates missing documents. Never invent a row merge. */
function rsSelectMerge(body, A, inputKeys, inputRevs, keys, del, base) {
  var domains = Object.assign({}, body.domains || {}),
    newDepts = [],
    kept = 0;
  if (body.mode !== 'merge') return { keys: keys, del: del, base: base, domains: domains, newDepts: newDepts, kept: kept };
  if (del.length) throw rsError('restore-merge-delete');
  if (body.scope.kind === 'full') {
    var fileDepts = parseJson(keys[K_DEPTS], null);
    if (!Array.isArray(fileDepts)) throw rsError('restore-merge-departments');
    var existing = new Set(
      A.depts.map(function (d) {
        return d.id;
      }),
    );
    newDepts = fileDepts.filter(function (d) {
      return d && typeof d.id === 'string' && !existing.has(d.id);
    });
    var allowed = new Set(
        newDepts.map(function (d) {
          return d.id;
        }),
      ),
      selected = Object.create(null);
    Object.keys(keys).forEach(function (k) {
      if (allowed.has(parseKey(k).dept)) selected[k] = keys[k];
      else kept++;
    });
    if (newDepts.length) {
      selected[K_DEPTS] = JSON.stringify(A.depts.concat(newDepts));
      base[K_DEPTS] = Object.prototype.hasOwnProperty.call(base, K_DEPTS) ? base[K_DEPTS] : inputRevs[K_DEPTS] || 0;
      if (Object.prototype.hasOwnProperty.call(keys, K_PERM)) {
        var pm = parseJson(inputKeys[K_PERM], {}),
          incoming = parseJson(keys[K_PERM], null);
        if (!isObj(incoming)) throw rsError('restore-permissions');
        pm = JSON.parse(JSON.stringify(pm));
        var permissionChanges = false;
        ['caps', 'emps', 'lenses'].forEach(function (f) {
          newDepts.forEach(function (d) {
            if (incoming[f] && Object.prototype.hasOwnProperty.call(incoming[f], d.id)) {
              pm[f] = pm[f] || {};
              pm[f][d.id] = incoming[f][d.id];
              permissionChanges = true;
            }
          });
        });
        if (permissionChanges) selected[K_PERM] = JSON.stringify(pm);
        base[K_PERM] = Object.prototype.hasOwnProperty.call(base, K_PERM) ? base[K_PERM] : inputRevs[K_PERM] || 0;
      }
    }
    keys = selected;
    if (domains.notifications) {
      var validated = rsNFValidate(domains.notifications, { kind: 'full' }),
        nf = { version: 1 };
      Object.keys(NF_TABLES).forEach(function (n) {
        nf[n] = validated[n].filter(function (r) {
          var s = n === 'states' ? r.message_scope : r.scope;
          return s && s.slice(0, 2) === 'd:' && allowed.has(s.slice(2));
        });
      });
      if (newDepts.length) domains.notifications = nf;
      else delete domains.notifications;
    }
    if (domains.custody)
      domains.custody = domains.custody.filter(function (c) {
        return c && c.scope && allowed.has(c.scope.departmentId);
      });
    if (domains.irshad) domains.irshad = domains.irshad.filter(function (domain) {
      return domain && domain.scope && allowed.has(domain.scope.departmentId);
    });
    ['seized','awards'].forEach(function(name){if(domains[name])domains[name]=domains[name].filter(function(domain){return allowed.has(bdScope(domain));});});
  } else {
    Object.keys(keys).forEach(function (k) {
      if ((opIsResource(k) ? inputKeys[k]!=null : Object.prototype.hasOwnProperty.call(inputKeys, k)) && k !== K_PERM) {
        delete keys[k];
        kept++;
      }
    });
    /* A typed domain is initialized by its migration for known departments. Its
       empty rowset is still an existing domain, not a missing legacy document. */
    delete domains.notifications;
    delete domains.custody;
    delete domains.irshad;
    delete domains.seized;
    delete domains.awards;
  }
  if (domains.dailyStats) {
    delete domains.dailyStats;
    kept++;
  }
  return {
    keys: keys,
    del: [],
    base: base,
    domains: domains,
    newDepts: newDepts.map(function (d) {
      return d.id;
    }),
    kept: kept,
  };
}
function rsNFValidate(domain, scope) {
  rsShape(domain, [
    'version',
    'rev',
    'configRev',
    'broadcastRev',
    'scope',
    'messages',
    'targets',
    'states',
    'dedup',
    'overrides',
    'checkpoints',
  ]);
  if (domain.version !== 1) throw rsError('restore-notifications-version');
  var seen = {},
    out = {};
  Object.keys(NF_TABLES).forEach(function (n) {
    if (!Array.isArray(domain[n])) throw rsError('restore-notifications-shape');
    out[n] = domain[n].map(function (row) {
      var cols = NF_TABLES[n][1];
      rsShape(row, cols);
      if (
        cols.some(function (c) {
          return !Object.prototype.hasOwnProperty.call(row, c);
        })
      )
        throw rsError('restore-notifications-shape');
      if (
        Object.values(row).some(function (v) {
          return v !== null && typeof v !== 'string' && (!Number.isSafeInteger(v) || v < 0);
        })
      )
        throw rsError('restore-notifications-value');
      if (JSON.stringify(row).length > 100000) throw rsError('restore-notifications-row-large');
      return Object.assign({}, row);
    });
  });
  var scoped = scope.kind === 'dept' ? 'd:' + scope.departmentId : null;
  function allowed(s) {
    return s === 'sys' || s === 'bc' || /^d:[^:]+$/.test(s);
  }
  Object.keys(out).forEach(function (n) {
    out[n].forEach(function (r) {
      var s = n === 'states' ? r.message_scope : r.scope;
      if (s !== undefined && (!allowed(s) || (scoped && s !== scoped))) throw rsError('restore-notifications-scope', 403);
      if (scoped && (n === 'overrides' || n === 'checkpoints')) throw rsError('restore-notifications-scope', 403);
    });
  });
  out.messages.forEach(function (m) {
    if (
      !m.id ||
      !['event', 'broadcast'].includes(m.kind) ||
      !['info', 'act', 'urg'].includes(m.priority) ||
      !['bell', 'toast'].includes(m.channel) ||
      !['message', 'all', 'dept', 'role', 'shift', 'emp'].includes(m.target_mode) ||
      m.department !== (/^d:/.test(m.scope) ? m.scope.slice(2) : '')
    )
      throw rsError('restore-notifications-message');
    ['requires_ack', 'pinned', 'preview', 'department_broadcast', 'reminders', 'scheduled', 'server_origin'].forEach(function (k) {
      if (m[k] !== 0 && m[k] !== 1) throw rsError('restore-notifications-boolean');
    });
    var id = JSON.stringify([m.scope, m.id]);
    if (seen[id]) throw rsError('restore-notifications-duplicate');
    seen[id] = 1;
  });
  out.targets.forEach(function (t) {
    if (!seen[JSON.stringify([t.scope, t.message_id])] || !['employee', 'role', 'department', 'shift', 'all'].includes(t.kind) || !t.value)
      throw rsError('restore-notifications-target');
  });
  out.states.forEach(function (s) {
    if (!seen[JSON.stringify([s.message_scope, s.message_id])] || !s.account_uid) throw rsError('restore-notifications-state');
  });
  out.overrides.forEach(function (o) {
    if (!NF_TYPES[o.type_id]) throw rsError('restore-notifications-type');
  });
  var primary = {
    messages: ['scope', 'id'],
    targets: ['scope', 'message_id', 'kind', 'value'],
    states: ['account_uid', 'message_scope', 'message_id'],
    dedup: ['scope', 'once_key'],
    overrides: ['type_id'],
    checkpoints: ['scope', 'name'],
  };
  Object.keys(out).forEach(function (n) {
    var ids = new Set();
    out[n].forEach(function (r) {
      var key = JSON.stringify(
        primary[n].map(function (c) {
          if (typeof r[c] !== 'string' || !r[c] || r[c].length > 4096) throw rsError('restore-notifications-identity');
          return r[c];
        }),
      );
      if (ids.has(key)) throw rsError('restore-notifications-duplicate');
      ids.add(key);
    });
  });
  out.messages.forEach(function (r) {
    NF_MESSAGE_COLS.forEach(function (c) {
      var numeric = [
        'created_at',
        'requires_ack',
        'pinned',
        'preview',
        'department_broadcast',
        'expires_at',
        'withdrawn_at',
        'reminders',
        'scheduled',
        'recipient_count',
        'server_origin',
        'reminded_at',
      ].includes(c);
      if (numeric) rsNat(r[c]);
      else if (typeof r[c] !== 'string' || r[c].length > (c === 'body' ? 16000 : 4096)) throw rsError('restore-notifications-type');
    });
  });
  out.targets.forEach(function (r) {
    if (typeof r.value !== 'string') throw rsError('restore-notifications-type');
  });
  out.states.forEach(function (r) {
    ['read_at', 'acknowledged_at', 'dismissed_at'].forEach(function (c) {
      rsNat(r[c]);
    });
  });
  out.dedup.forEach(function (r) {
    rsNat(r.created_at);
    if (r.message_id !== null && (typeof r.message_id !== 'string' || !r.message_id)) throw rsError('restore-notifications-type');
  });
  out.checkpoints.forEach(function (r) {
    rsNat(r.value);
    if (r.scope !== 'sys' || !['security-ts', 'security-id'].includes(r.name)) throw rsError('restore-notifications-checkpoint');
  });
  out.overrides.forEach(function (r) {
    ['enabled', 'target_override', 'target_own', 'target_lead', 'target_mgr', 'target_sys'].forEach(function (c) {
      if (r[c] !== 0 && r[c] !== 1 && !(c === 'enabled' && r[c] === null)) throw rsError('restore-notifications-boolean');
    });
    if (
      (r.priority !== null && !['info', 'act', 'urg'].includes(r.priority)) ||
      (r.channel !== null && !['bell', 'toast'].includes(r.channel)) ||
      (r.template_text !== null && typeof r.template_text !== 'string')
    )
      throw rsError('restore-notifications-type');
  });
  return out;
}
async function rsNFPlan(env, domain, scope, base, mode, newDepts) {
  rsShape(base, ['rev', 'configRev', 'broadcastRev']);
  ['rev', 'configRev', 'broadcastRev'].forEach(function (k) {
    rsNat(base[k]);
  });
  var before = await nfRead(env),
    next = rsNFValidate(domain, scope),
    guards = [revGuard(env, NF_REV, base.rev), revGuard(env, NF_CFG_REV, base.configRev), revGuard(env, NF_BC_REV, base.broadcastRev)],
    st = [],
    snaps = [];
  var pks = {
    messages: ['scope', 'id'],
    targets: ['scope', 'message_id', 'kind', 'value'],
    states: ['account_uid', 'message_scope', 'message_id'],
    dedup: ['scope', 'once_key'],
    overrides: ['type_id'],
    checkpoints: ['scope', 'name'],
  };
  if (
    mode === 'merge' &&
    Object.keys(NF_TABLES).some(function (n) {
      return before[n].some(function (r) {
        var s = n === 'states' ? r.message_scope : r.scope;
        return s && s.slice(0, 2) === 'd:' && (newDepts || []).indexOf(s.slice(2)) >= 0;
      });
    })
  )
    throw rsError('restore-merge-identity-collision', 409);
  Object.keys(NF_TABLES).forEach(function (n) {
    var spec = NF_TABLES[n],
      rows = before[n];
    guards.push.apply(guards, rsWitness(env, spec[0], spec[1], rows));
    snaps.push({ domain: 'notifications', table: spec[0], rows: rows });
    if (mode === 'merge') next[n] = rsMergeRows(rows, next[n], spec[1], pks[n]);
    else if (scope.kind === 'dept')
      next[n] = rows
        .filter(function (r) {
          return (n === 'states' ? r.message_scope : r.scope) !== 'd:' + scope.departmentId;
        })
        .concat(next[n]);
  });
  ['states', 'targets', 'messages', 'dedup', 'overrides', 'checkpoints'].forEach(function (n) {
    st.push(env.DB.prepare('DELETE FROM ' + NF_TABLES[n][0]));
  });
  ['messages', 'targets', 'states', 'dedup', 'overrides', 'checkpoints'].forEach(function (n) {
    st.push.apply(st, rsBulk(env, NF_TABLES[n][0], NF_TABLES[n][1], next[n]));
  });
  var unchanged = Object.keys(NF_TABLES).every(function (n) {
    return rsSameRows(before[n], next[n]);
  });
  var revisionKeys = unchanged ? [] : [NF_REV];
  if (!unchanged && !rsSameRows(before.overrides, next.overrides)) revisionKeys.push(NF_CFG_REV);
  if (
    !unchanged &&
    (!rsSameRows(
      before.messages.filter(function (r) {
        return r.scope === 'bc';
      }),
      next.messages.filter(function (r) {
        return r.scope === 'bc';
      }),
    ) ||
      !rsSameRows(
        before.targets.filter(function (r) {
          return r.scope === 'bc';
        }),
        next.targets.filter(function (r) {
          return r.scope === 'bc';
        }),
      ))
  )
    revisionKeys.push(NF_BC_REV);
  return {
    guards: guards,
    statements: unchanged ? [] : st,
    snapshots: unchanged ? [] : snaps,
    revisionKeys: revisionKeys,
    count: next.messages.length,
  };
}
async function rsDSCurrent(env) {
  var b = await env.DB.batch([
      env.DB.prepare('SELECT * FROM daily_stats_days'),
      env.DB.prepare('SELECT * FROM daily_stats_month_locks'),
      env.DB.prepare('SELECT * FROM daily_stats_day_locks'),
      env.DB.prepare('SELECT rev FROM revs WHERE k=?1').bind(K_DSTATS),
    ]),
    rows = { days: b[0].results || [], months: b[1].results || [], locks: b[2].results || [] };
  return { rows: rows, data: dsDomainInflate(rows), rev: b[3].results[0] ? b[3].results[0].rev : 0 };
}
async function rsCustodyReceiptPreimage(env, dept, plan) {
  var specs = [
      [
        'custody_requests',
        ['department_id', 'account_uid', 'request_id', 'fingerprint', 'resource_rev', 'operation', 'result_n', 'item_id', 'created_at'],
      ],
      ['custody_request_outputs', ['department_id', 'account_uid', 'request_id', 'position', 'issue_id', 'move_id', 'serial']],
    ],
    b = await env.DB.batch(
      specs.map(function (s) {
        return env.DB.prepare('SELECT * FROM ' + s[0] + ' WHERE department_id=?1').bind(dept);
      }),
    );
  specs.forEach(function (s, i) {
    var rows = b[i].results || [];
    plan.guards.push.apply(plan.guards, rsWitness(env, s[0], s[1], rows, "department_id='" + dept.replace(/'/g, "''") + "'"));
    plan.snapshots.push({ domain: 'custody', table: dept + ':' + s[0], rows: rows });
  });
  return b.reduce(function (n, result) {
    return n + (result.results || []).length;
  }, 0);
}
async function rsPrepare(env, A, body, meta, internal) {
  rsShape(body, [
    'version',
    'requestId',
    'scope',
    'mode',
    'reason',
    'base',
    'keys',
    'delete',
    'domains',
    'manifest',
    'permissionSlice',
    'uid',
  ]);
  if (body.version !== 1 || typeof body.requestId !== 'string' || !/^[-A-Za-z0-9_]{8,100}$/.test(body.requestId))
    throw rsError('restore-shape');
  if (privRedacted(body)) throw rsError('restore-redacted', 409);   // PRIVACY batch (019u): before any shape, plan or write
  rsShape(body.scope, ['kind', 'departmentId']);
  if (
    !['full', 'dept'].includes(body.scope.kind) ||
    (body.scope.kind === 'dept' && (typeof body.scope.departmentId !== 'string' || !body.scope.departmentId))
  )
    throw rsError('restore-scope');
  if (!['merge', 'replace'].includes(body.mode) || typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 300)
    throw rsError('restore-reason');
  /* A full backup declares its complete input. Never infer missing domains from
     its mode or silently reinterpret a sparse save as a complete backup. */
  if (body.scope.kind === 'full') {
    var manifest = body.manifest;
    if (!manifest) throw rsError('restore-incomplete-manifest');
    rsShape(manifest, ['version', 'scope', 'domains', 'departments', 'keys']);
    rsShape(manifest.domains, ['kv', 'dailyStats', 'notifications', 'custody', 'irshad', 'seized', 'awards','operations']);
    if (
      manifest.version !== 4 ||
      manifest.scope !== 'full' ||
      ['kv', 'dailyStats', 'notifications', 'custody', 'irshad', 'seized', 'awards','operations'].some(function (k) {
        return manifest.domains[k] !== 1;
      })
    )
      throw rsError('restore-incomplete-manifest');
    var declaredDepts = parseJson(body.keys && body.keys[K_DEPTS], null);
    if (
      !Array.isArray(declaredDepts) ||
      !isObj(body.domains) ||
      !body.domains.dailyStats ||
      !body.domains.notifications ||
      !Array.isArray(body.domains.custody) || !Array.isArray(body.domains.irshad)
    )
      throw rsError('restore-incomplete-manifest');
    var ids = declaredDepts.map(function (d) {
      if (!isObj(d) || typeof d.id !== 'string' || !d.id || d.id.length > 200 || BAD_ID_RX.test(d.id)) throw rsError('restore-departments');
      return d.id;
    });
    if (
      new Set(ids).size !== ids.length ||
      !Array.isArray(manifest.departments) ||
      !deq(ids.slice().sort(), manifest.departments.slice().sort()) ||
      !Array.isArray(manifest.keys) ||
      !deq(Object.keys(body.keys).sort(), manifest.keys.slice().sort())
    )
      throw rsError('restore-incomplete-manifest');
    var scopes = body.domains.custody.map(function (c) {
      return c && c.scope && c.scope.departmentId;
    });
    if (!deq(ids.slice().sort(), scopes.sort())) throw rsError('restore-incomplete-custody');
    if (!deq(ids.slice().sort(), body.domains.irshad.map(function (d) {
      return d && d.scope && d.scope.departmentId;
    }).sort())) throw rsError('restore-incomplete-irshad');
  } else {
    var manifest = body.manifest;
    if (!manifest) throw rsError('restore-incomplete-manifest');
    rsShape(manifest, ['version', 'scope', 'domains', 'departments', 'keys']);
    rsShape(manifest.domains, ['kv', 'notifications', 'custody', 'irshad', 'seized', 'awards','operations']);
    if (
      manifest.version !== 4 ||
      manifest.scope !== 'dept' ||
      ['kv', 'notifications', 'custody', 'irshad', 'seized', 'awards','operations'].some(function (k) {
        return manifest.domains[k] !== 1;
      }) ||
      !deq(manifest.departments, [body.scope.departmentId]) ||
      !body.domains ||
      !body.domains.notifications ||
      !Array.isArray(body.domains.custody) ||
      body.domains.custody.length !== 1 ||
      body.domains.custody[0].scope.departmentId !== body.scope.departmentId ||
      !Array.isArray(body.domains.irshad) || body.domains.irshad.length !== 1 ||
      !body.domains.irshad[0] || !body.domains.irshad[0].scope ||
      body.domains.irshad[0].scope.departmentId !== body.scope.departmentId
    )
      throw rsError('restore-incomplete-manifest');
    var prefix = 'bsdept:' + body.scope.departmentId + ':',
      localKeys = Object.keys(body.keys || {})
        .filter(function (k) {
          return k !== K_PERM;
        })
        .map(function (k) {
          return k.slice(0, prefix.length) === prefix ? k.slice(prefix.length) : k;
        });
    if (!Array.isArray(manifest.keys) || !deq(localKeys.sort(), manifest.keys.slice().sort())) throw rsError('restore-incomplete-manifest');
  }
  if (!A || (body.uid !== undefined && String(body.uid) !== String(A.u.id))) throw rsError('session-changed', 409);
  var reference = (internal && internal.reference) || (await rsReferenceSnapshot(env, A.u.id));
  env = reference.env;
  A = reference.A;
  var inputRows = reference.inputRows,
    inputKeys = reference.inputKeys,
    inputRevs = reference.inputRevs;
  var dept = body.scope.departmentId || '',
    sup = A.u.role === 'super';
  if (
    body.scope.kind === 'dept' &&
    !A.depts.some(function (d) {
      return d.id === dept;
    })
  )
    throw rsError('restore-scope', 403);
  if (!sup && (body.scope.kind !== 'dept' || !isMgrOf(A, dept) || !enfHeld(A, dept, 'backup.restore')))
    throw rsError('restore-policy', 403);
  rsShape(body.base, ['epoch', 'kv', 'dailyStats', 'notifications', 'custody', 'irshad', 'seized', 'awards']);
  for(var def of bdDefinitions()) {
    var expected=(body.manifest.departments||[]).concat(def.name==='awards'&&body.scope.kind==='full'?['']:[]).sort();
    if(!Array.isArray((body.domains||{})[def.name])||!deq(body.domains[def.name].map(bdScope).sort(),expected))throw rsError('restore-incomplete-'+def.name);
  }
  rsNat(body.base.epoch);
  rsShape(body.domains || {}, ['dailyStats', 'notifications', 'custody', 'irshad', 'seized', 'awards','operations']);
  var fingerprint =
      (internal && internal.fingerprint) ||
      hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(cuCanonical(body))))),
    oldReceipt = await env.DB.prepare('SELECT * FROM restore_operations WHERE account_uid=?1 AND request_id=?2')
      .bind(A.u.id, body.requestId)
      .first();
  if (oldReceipt) {
    if (oldReceipt.fingerprint !== fingerprint) throw rsError('restore-request-reused', 409);
    await env.DB.batch(rsReferenceGuards(env,reference));
    return { receipt: oldReceipt };
  }
  if (body.base.epoch !== (await rsEpoch(env))) throw rsError('restore-epoch-changed', 409);
  await nfGuardRetired(env);
  if (await dsLegacyPresent(env)) throw rsError('dstats-legacy-source-present', 503);
  if (await cuLegacyPresent(env)) throw rsError('custody-legacy-source-present', 503);
  await irGuardRetired(env);
  await bdGuardRetired(env);
  if (!isObj(body.keys || {}) || !isObj(body.base.kv || {}) || !Array.isArray(body.delete || [])) throw rsError('restore-keys');
  var keys = Object.assign(Object.create(null), body.keys || {}),
    del = (body.delete || []).slice(),
    base = Object.assign(Object.create(null), body.base.kv || {}),
    ops = Object.create(null),
    why = Object.create(null),
    removedDepartments = [];
  if (
    del.some(function (k) {
      return typeof k !== 'string';
    })
  )
    throw rsError('restore-keys');
  Object.keys(keys)
    .concat(del)
    .forEach(function (k) {
      if (nfLegacyKey(k) || cuLegacyKey(k) || (irLegacyKey(k) || bdLegacyKey(k)) || opIsResource(k) || resName(k) === K_DSTATS) throw rsError('domain-moved');
      if (isDeviceKey(k)) throw rsError('restore-device-excluded');
    });
  var operationalInput=opRestoreDocuments(body,reference,A);
  Object.assign(keys,operationalInput.keys);
  var selection = rsSelectMerge(body, A, inputKeys, inputRevs, keys, del, base);
  keys = selection.keys;
  del = selection.del;
  base = selection.base;
  var blanks = await privRestoreBlanks(env, inputKeys, keys, selection.domains);   // PRIVACY (019u (7)): a copy that would blank stored personal data — before any write
  if (blanks.length) throw Object.assign(rsError('restore-personal-blank', 409), { details: { n: blanks.length, at: blanks.slice(0, 20) } });
  var physicalDeletes =
    body.scope.kind === 'full' && body.mode === 'replace'
      ? Object.keys(inputKeys).filter(function (k) {
          return !!parseKey(k).dept && !opIsResource(k) && !Object.prototype.hasOwnProperty.call(keys, k);
        })
      : [];
  physicalDeletes.push.apply(physicalDeletes,operationalInput.physicalDeletes);
  if (body.scope.kind === 'dept' && (body.permissionSlice !== undefined || Object.prototype.hasOwnProperty.call(keys, K_PERM))) {
    var requestedPerms = body.permissionSlice;
    if (requestedPerms === undefined) {
      var map = parseJson(keys[K_PERM], null);
      if (!isObj(map)) throw rsError('restore-permissions');
      requestedPerms = {
        capSet: !!(map.caps && Object.prototype.hasOwnProperty.call(map.caps, dept)),
        cap: map.caps && map.caps[dept],
        emps: map.emps && map.emps[dept],
        lenses: map.lenses && map.lenses[dept],
      };
    }
    rsShape(requestedPerms, ['capSet', 'cap', 'emps', 'lenses']);
    var retainedPerms = rsPermSlice(
      JSON.parse(JSON.stringify(parseJson(inputKeys[K_PERM], {}))),
      dept,
      requestedPerms,
      body.mode,
      PG_KEYS,
      KIVO_LENS_PLUGINS.keys,
    );
    if (retainedPerms !== null) {
      keys[K_PERM] = JSON.stringify(retainedPerms);
      if (!Object.prototype.hasOwnProperty.call(base, K_PERM)) base[K_PERM] = inputRevs[K_PERM] || 0;
    } else delete keys[K_PERM];
  }
  /* 330-auth.pruneDeptAccounts: restore only removes staff/dept identities bound
     to removed departments, never GM/Super accounts. The result still traverses
     applySave's unchanged password, uniqueness and final-super validators. */
  if (body.scope.kind === 'full' && body.mode === 'replace' && Object.prototype.hasOwnProperty.call(keys, K_DEPTS)) {
    var targetDepts = parseJson(keys[K_DEPTS], null);
    if (!Array.isArray(targetDepts)) throw rsError('restore-departments');
    var validDepts = new Set(
      targetDepts.map(function (d) {
        return d && d.id;
      }),
    );
    removedDepartments = A.depts
      .filter(function (d) {
        return d && !validDepts.has(d.id);
      })
      .map(function (d) {
        return d.id;
      });
    var candidates = parseJson(Object.prototype.hasOwnProperty.call(keys, K_USERS) ? keys[K_USERS] : inputKeys[K_USERS], null);
    if (!Array.isArray(candidates)) throw rsError('restore-users');
    var retained = candidates.filter(function (u) {
      return u && ((u.role !== 'dept' && u.role !== 'staff') || validDepts.has(u.deptId));
    });
    if (retained.length !== candidates.length) {
      keys[K_USERS] = JSON.stringify(retained);
      if (!Object.prototype.hasOwnProperty.call(base, K_USERS)) base[K_USERS] = inputRevs[K_USERS] || 0;
    }
    Object.keys(inputKeys).forEach(function (k) {
      if (removedDepartments.indexOf(parseKey(k).dept) >= 0) {
        if(opIsResource(k)){
          if(inputKeys[k]==null)return;
          var operationalEmpty=ENT[resName(k)]&&ENT[resName(k)].empty;
          if(typeof operationalEmpty!=='string')throw rsError('restore-operations-empty');
          keys[k]=operationalEmpty;physicalDeletes.push(k);
          if(base[k]===undefined)base[k]=inputRevs[k]||0;return;
        }
        if (Object.prototype.hasOwnProperty.call(keys, k)) throw rsError('restore-removed-department-payload');
        var empty = ENT[resName(k)] && ENT[resName(k)].empty;
        if (typeof empty === 'string') {
          keys[k] = empty;
          del = del.filter(function (x) {
            return x !== k;
          });
        } else if (del.indexOf(k) < 0) del.push(k);
        if (!Object.prototype.hasOwnProperty.call(base, k)) base[k] = inputRevs[k] || 0;
      }
    });
  }
  if (
    new Set(del).size !== del.length ||
    del.some(function (k) {
      return Object.prototype.hasOwnProperty.call(keys, k);
    })
  )
    throw rsError('restore-keys');
  if (body.scope.kind === 'full' && body.mode === 'replace')
    Object.keys(inputKeys).forEach(function (k) {
      if (!parseKey(k).dept || opIsResource(k) || Object.prototype.hasOwnProperty.call(keys, k)) return;
      var empty = ENT[resName(k)] && ENT[resName(k)].empty;
      if (typeof empty === 'string') {
        keys[k] = empty;
        del = del.filter(function (x) {
          return x !== k;
        });
      } else if (del.indexOf(k) < 0) del.push(k);
      if (!Object.prototype.hasOwnProperty.call(base, k)) base[k] = inputRevs[k] || 0;
    });
  var finalDeptIds = new Set(
    parseJson(Object.prototype.hasOwnProperty.call(keys, K_DEPTS) ? keys[K_DEPTS] : inputKeys[K_DEPTS], []).map(function (d) {
      return d.id;
    }),
  );
  Object.keys(keys)
    .concat(del)
    .forEach(function (k) {
      var d = parseKey(k).dept;
      if (d && !finalDeptIds.has(d) && removedDepartments.indexOf(d) < 0) throw rsError('restore-scope', 403);
    });
  Object.keys(keys)
    .concat(del)
    .forEach(function (k) {
      if (typeof keys[k] !== 'string' && del.indexOf(k) < 0) throw rsError('restore-key-value');
      if (nfLegacyKey(k) || cuLegacyKey(k) || (irLegacyKey(k) || bdLegacyKey(k)) || resName(k) === K_DSTATS) throw rsError('domain-moved');
      if (body.scope.kind === 'dept' && parseKey(k).dept !== dept && k !== K_PERM) throw rsError('restore-scope', 403);
      rsNat(base[k]);
      ops[k] = { op: 'backup.restore', scope: body.scope.kind, mode: body.mode, reason: body.reason };
      why[k] = body.reason;
    });
  if (Object.prototype.hasOwnProperty.call(keys, K_USERS)) {
    var incomingAccounts = parseJson(keys[K_USERS], null),
      storedAccounts = new Map(),
      occurrence = new Map();
    (A.users || []).forEach(function (u) {
      if (u && u.id) {
        if (!storedAccounts.has(u.id)) storedAccounts.set(u.id, []);
        storedAccounts.get(u.id).push(u);
      }
    });
    if (Array.isArray(incomingAccounts))
      incomingAccounts.forEach(function (u) {
        if (!u || !u.id || !storedAccounts.has(u.id)) return;
        var prior = storedAccounts.get(u.id),
          index = occurrence.get(u.id) || 0,
          old = prior[Math.min(index, prior.length - 1)];
        occurrence.set(u.id, index + 1);
        if (u.ph && u.ph !== old.ph) throw rsError('restore-credential-change', 409);
        if (
          u.id === A.u.id &&
          ['un', 'alt'].some(function (k) {
            return String(u[k] || '') !== String(old[k] || '');
          })
        )
          throw rsError('restore-self-identity-change', 409);
      });
  }
  var kv = await applySave(env, { set: keys, del: del, base: base, ops: ops, why: why }, A, meta, {
    quiet: true,
    __restorePlan: RESTORE_INTERNAL_TOKEN,
  });
  if (!kv.__plan || !kv.ok)
    throw Object.assign(
      rsError(
        Object.keys(kv.conflicts || {}).length ? 'conflict' : 'restore-key-denied',
        Object.keys(kv.conflicts || {}).length ? 409 : 403,
      ),
      { details: { denied: kv.denied, conflicts: Object.keys(kv.conflicts || {}) } },
    );
  kv.pend = kv.pend.filter(function (pd) {
    return pd.act === 'del'
      ? pd.cur != null
      : pd.v !== pd.cur &&
          !(pd.k === K_USERS && JSON.stringify(cuCanonical(parseJson(pd.v, []))) === JSON.stringify(cuCanonical(parseJson(pd.cur, []))));
  });
  rsPhysicalDeletes(kv, reference, physicalDeletes);
  var plan = {
    body: body,
    author: A,
    fingerprint: fingerprint,
    epoch: body.base.epoch,
    guards: [],
    statements: [],
    snapshots: [],
    revisionKeys: [],
    counts: { kv: kv.pend.filter(function(pd){return !opIsResource(pd.k);}).length, operations:0, dailyStats: 0, notifications: 0, custody: 0, irshad: 0, seized: 0, awards: 0, kept: selection.kept },
    authz: kv.authzRows || [],
    reauth: false,
    kv: kv,
  };
  /* This also covers explicit grants, scoped locks, import references and policy;
     a permission edit between actor construction and commit cannot grant a stale request. */
  plan.guards.push.apply(plan.guards, rsWitness(env, 'kv', ['k', 'seq', 'v'], inputRows));
  plan.guards.push.apply(plan.guards, rsWitness(env, 'meta', ['k', 'v'], reference.metaRows, "k<>'rev'"));
  plan.guards.push.apply(plan.guards, reference.operational.guards);
  await rsCompileKV(env, A, kv, plan, inputRows);
  var domains = selection.domains;
  if (domains.notifications) {
    var normalizedNF = rsNFValidate(domains.notifications, body.scope);
    Object.keys(normalizedNF).forEach(function (n) {
      normalizedNF[n].forEach(function (r) {
        var scope = n === 'states' ? r.message_scope : r.scope;
        if (scope && scope.slice(0, 2) === 'd:' && !finalDeptIds.has(scope.slice(2))) throw rsError('restore-notifications-scope', 403);
      });
    });
  }
  if (domains.dailyStats) {
    if (!sup) throw rsError('restore-policy', 403);
    var ds = domains.dailyStats;
    rsShape(ds, ['version', 'rev', 'data']);
    if (ds.rev !== undefined) rsNat(ds.rev);
    if (ds.version !== 1 || !dsDomainShape(ds.data)) throw rsError('restore-dstats-shape');
    rsNat(body.base.dailyStats);
    var current = await rsDSCurrent(env),
      next = ds.data;
    if (body.mode === 'merge') {
      next = {
        haram: Object.assign({}, current.data.haram, ds.data.haram),
        nabawi: Object.assign({}, current.data.nabawi, ds.data.nabawi),
        locks: Object.assign({}, current.data.locks, ds.data.locks),
      };
    }
    plan.guards.push(revGuard(env, K_DSTATS, body.base.dailyStats));
    var specs = [
      ['daily_stats_days', ['site', 'hijri_date', 'field_mask'].concat(DS_METRICS, ['meta_json', 'fields_json'])],
      ['daily_stats_month_locks', ['site', 'hijri_year', 'hijri_month', 'approved', 'reopened', 'legacy_boolean']],
      ['daily_stats_day_locks', ['site', 'hijri_year', 'hijri_month', 'hijri_day', 'is_open', 'is_shut']],
    ];
    var dsChanges = dsDomainStatements(env, current.data, next);
    for (var sp of specs) {
      var rr = current.rows[sp[0] === 'daily_stats_days' ? 'days' : sp[0] === 'daily_stats_month_locks' ? 'months' : 'locks'];
      plan.guards.push.apply(plan.guards, rsWitness(env, sp[0], sp[1], rr));
      if (dsChanges.length) plan.snapshots.push({ domain: 'dailyStats', table: sp[0], rows: rr });
    }
    plan.statements.push.apply(plan.statements, dsChanges);
    if (dsChanges.length) plan.revisionKeys.push(K_DSTATS);
    plan.counts.dailyStats = dsDomainRows(next).days.length;
  }
  if (domains.notifications) {
    var np = await rsNFPlan(env, domains.notifications, body.scope, body.base.notifications, body.mode, selection.newDepts);
    plan.guards.push.apply(plan.guards, np.guards);
    plan.statements.push.apply(plan.statements, np.statements);
    plan.snapshots.push.apply(plan.snapshots, np.snapshots);
    plan.revisionKeys.push.apply(plan.revisionKeys, np.revisionKeys);
    plan.counts.notifications = np.count;
  }
  if (domains.custody) {
    if (!Array.isArray(domains.custody)) throw rsError('restore-custody-shape');
    var seenDept = new Set();
    for (var cd of domains.custody) {
      var d = cd && cd.scope && cd.scope.departmentId;
      if (!d || !finalDeptIds.has(d) || seenDept.has(d) || removedDepartments.indexOf(d) >= 0 || (body.scope.kind === 'dept' && d !== dept))
        throw rsError('restore-custody-scope');
      seenDept.add(d);
      var cp = await cuPlanRestore(env, A, cd, {
        dept: d,
        base: (body.base.custody || {})[d],
        scope: body.scope.kind,
        mode: 'replace',
        reason: body.reason,
        finalKeys: keys,
      });
      if (
        body.mode === 'merge' &&
        ((body.base.custody || {})[d] !== 0 ||
          Object.values(cp.snapshotRows).some(function (rows) {
            return rows.length;
          }))
      )
        throw rsError('restore-merge-identity-collision', 409);
      var snapshotStart = plan.snapshots.length,
        receiptRows = await rsCustodyReceiptPreimage(env, d, plan),
        emptyUnchanged =
          receiptRows === 0 &&
          Object.keys(cp.snapshotRows).every(function (n) {
            return cp.snapshotRows[n].length === 0 && cd.rows[n].length === 0;
          });
      plan.guards.push.apply(plan.guards, cp.guards);
      if (!emptyUnchanged) {
        plan.statements.push.apply(plan.statements, cp.statements);
        plan.revisionKeys.push.apply(plan.revisionKeys, cp.revisionKeys);
        Object.keys(cp.snapshotRows || {}).forEach(function (n) {
          plan.snapshots.push({ domain: 'custody', table: d + ':' + n, rows: cp.snapshotRows[n] });
        });
      } else plan.snapshots.splice(snapshotStart);
      plan.counts.custody++;
    }
  }
  if (domains.irshad) {
    var irSeen = new Set();
    for (var irDomain of domains.irshad) {
      var irDept = irDomain && irDomain.scope && irDomain.scope.departmentId;
      if (!irDept || !finalDeptIds.has(irDept) || irSeen.has(irDept) || removedDepartments.indexOf(irDept) >= 0 ||
          (body.scope.kind === 'dept' && irDept !== dept)) throw rsError('restore-irshad-scope');
      irSeen.add(irDept);
      var ip = await irPlanRestore(env, A, irDomain, {
        dept: irDept, base: (body.base.irshad || {})[irDept], scope: body.scope.kind,
        mode: 'replace', reason: body.reason, finalKeys: keys,
      });
      if (body.mode === 'merge' && (Object.values((body.base.irshad || {})[irDept] || {}).some(function (v) { return v !== 0; }) ||
          Object.values(ip.snapshotRows).some(function (rows) { return rows.length; })))
        throw rsError('restore-merge-identity-collision', 409);
      plan.guards.push.apply(plan.guards, ip.guards);
      if (ip.changed) {
        plan.statements.push.apply(plan.statements, ip.statements);
        plan.revisionKeys.push.apply(plan.revisionKeys, ip.revisionKeys);
        Object.keys(ip.snapshotRows).forEach(function (kind) {
          plan.snapshots.push({ domain: 'irshad', table: irDept + ':' + kind, rows: ip.snapshotRows[kind] });
        });
      }
      plan.counts.irshad++;
    }
  }
  /* Employee cleanup shares the same planner/transaction. An explicit restored
     custody candidate is its final state and must be validated by cuPlanRestore. */
  var cleaned = new Set();
  for (var ep of kv.pend) {
    if (resName(ep.k) !== 'bassam_employees_v1') continue;
    var d = parseKey(ep.k).dept;
    cleaned.add(d);
    if (
      (domains.custody || []).some(function (c) {
        return c.scope.departmentId === d;
      })
    )
      continue;
    var oldEmployees = parseJson(ep.cur, []),
      newEmployees = ep.act === 'del' ? [] : parseJson(ep.v, []);
    /* Backup replace is not the import wizard's trusted start-clean operation.
       An absent custody domain preserves history, apart from the established
       cleanup for employees actually removed. Metadata-only edits do nothing. */
    if (removedDepartments.indexOf(d) < 0 && !cuRemovedHolderKeys(oldEmployees, newEmployees).length) continue;
    var cl = await cuPlanCleanup(env, A, {
      dept: d,
      base: (body.base.custody || {})[d],
      intent: removedDepartments.indexOf(d) >= 0 ? 'dept-wipe' : 'employee-delete',
      oldEmployees: oldEmployees,
      newEmployees: newEmployees,
      reason: body.reason,
      finalKeys: keys,
    });
    plan.guards.push.apply(plan.guards, cl.guards);
    plan.statements.push.apply(plan.statements, cl.statements);
    plan.revisionKeys.push.apply(plan.revisionKeys, cl.revisionKeys);
    Object.keys(cl.snapshotRows || {}).forEach(function (n) {
      plan.snapshots.push({ domain: 'custody', table: d + ':' + n, rows: cl.snapshotRows[n] });
    });
  }
  for (var removed of removedDepartments) {
    if (cleaned.has(removed)) continue;
    var wipe = await cuPlanCleanup(env, A, {
      dept: removed,
      base: (body.base.custody || {})[removed],
      intent: 'dept-wipe',
      oldEmployees: [],
      newEmployees: [],
      reason: body.reason,
      finalKeys: keys,
    });
    await rsCustodyReceiptPreimage(env, removed, plan);
    plan.guards.push.apply(plan.guards, wipe.guards);
    plan.statements.push.apply(plan.statements, wipe.statements);
    plan.revisionKeys.push.apply(plan.revisionKeys, wipe.revisionKeys);
    Object.keys(wipe.snapshotRows || {}).forEach(function (n) {
      plan.snapshots.push({ domain: 'custody', table: removed + ':' + n, rows: wipe.snapshotRows[n] });
    });
  }
  for (var irRemoved of removedDepartments) {
    var irWipe = await irPlanWipe(env, A, {
      dept: irRemoved, base: (body.base.irshad || {})[irRemoved], intent: 'dept-delete',
      reason: body.reason, finalKeys: keys,
    });
    plan.guards.push.apply(plan.guards, irWipe.guards);
    plan.statements.push.apply(plan.statements, irWipe.statements);
    plan.revisionKeys.push.apply(plan.revisionKeys, irWipe.revisionKeys);
    Object.keys(irWipe.snapshotRows).forEach(function (kind) {
      plan.snapshots.push({ domain: 'irshad', table: irRemoved + ':' + kind, rows: irWipe.snapshotRows[kind] });
    });
  }
  await bdRestorePlan(env,A,body,plan,domains,finalDeptIds,removedDepartments,keys);
  if (internal && internal.images) await rsImageArchivePlan(env, A, plan, reference, internal.images);
  await rsImageMetadataPlan(env, A, plan, reference);
  return plan;
}
async function rsCommit(env, A, plan, meta) {
  await irGuardRetired(env);
  await bdGuardRetired(env);
  await opGuardRetired(env);
  if (plan.receipt && plan.receipt.result_json) {
    var replay = JSON.parse(plan.receipt.result_json);
    replay.reauthRequired = !!replay.reauthRequired;
    replay.duplicate = 1;
    return replay;
  }
  if (plan.receipt)
    return {
      ok: 1,
      requestId: plan.receipt.request_id,
      scope: JSON.parse(plan.receipt.scope),
      mode: plan.receipt.mode,
      rev: plan.receipt.revision,
      snapshot: plan.receipt.snapshot_id,
      counts: JSON.parse(plan.receipt.counts_json),
      reauthRequired: !!plan.receipt.reauth_required,
      duplicate: 1,
    };
  A = plan.author || A;
  var sid = enfSnapId('atomic'),
    st = [rsEpochGuard(env.DB, plan.epoch), bdCommitRetiredGuard(env), opRetiredGuard(env)].concat(plan.guards),
    keys = Array.from(new Set(plan.revisionKeys)),
    now = Date.now(),
    changed = keys.length > 0 || !!plan.forceFence;
  var snapshotRows=[],snapshotManifest=[];
  plan.snapshots.forEach(function(snapshot){
    snapshotManifest.push({snapshot_id:sid,domain:snapshot.domain,table_key:snapshot.table,row_count:snapshot.rows.length});
    for(var row of rsSnapshotRows(sid,snapshot.domain,snapshot.table,snapshot.rows))snapshotRows.push(row);
  });
  st.push.apply(st,rsBulk(env,'restore_snapshot_manifest',['snapshot_id','domain','table_key','row_count'],snapshotManifest));
  st.push.apply(st,rsBulk(env,'restore_preimage',['snapshot_id','domain','table_key','row_number','row_json'],snapshotRows));
  if (changed)
    st.push(
      env.DB.prepare(
        "INSERT INTO meta(k,v) VALUES('rev',CAST(MAX(COALESCE((SELECT CAST(v AS INTEGER) FROM meta WHERE k='rev'),0),COALESCE((SELECT MAX(rev) FROM revs),0))+1 AS TEXT)) ON CONFLICT(k) DO UPDATE SET v=excluded.v",
      ),
    );
  st.push.apply(st, plan.statements);
  rsChunks(
    keys.map(function (k) {
      return { k: k };
    }),
  ).forEach(function (part) {
    st.push(
      env.DB.prepare(
        "INSERT INTO revs(k,rev) SELECT json_extract(j.value,'$.k'),CAST((SELECT v FROM meta WHERE k='rev') AS INTEGER) FROM json_each(?1) j WHERE 1 ON CONFLICT(k) DO UPDATE SET rev=excluded.rev",
      ).bind(JSON.stringify(part)),
    );
  });
  plan.authz.forEach(function (r) {
    st.push(enfLogStmt(env, r));
  });
  if (plan.operation === 'save') st.push.apply(st, rsSaveAudit(env, plan, A, meta, sid));
  else
    st.push(
      env.DB.prepare(
        "INSERT INTO aud(cid,ts,uid,un,dept,k,rev,etype,eid,ename,act,ctx,bef,aft,ip,dev,city) SELECT ?1,?2,?3,'',?4,'atomic_restore',CAST(v AS INTEGER),'dataset','atomic_restore','استعادة','restore',?5,'','',?6,?7,?8 FROM meta WHERE k='rev'",
      ).bind(
        sid,
        now,
        A.u.id,
        plan.body.scope.departmentId || '',
        JSON.stringify({ reason: plan.body.reason, counts: plan.counts, scope: plan.body.scope, mode: plan.body.mode }),
        (meta && meta.ip) || '',
        (meta && meta.dev) || '',
        (meta && meta.city) || '',
      ),
    );
  if (changed && (plan.operation !== 'save' || plan.bumpEpoch))
    st.push(
      env.DB.prepare("INSERT INTO meta(k,v) VALUES('restore_epoch',?1) ON CONFLICT(k) DO UPDATE SET v=excluded.v").bind(
        String(plan.epoch + 1),
      ),
    );
  if (plan.operation !== 'save' || plan.receiptRequired)
    st.push(
      env.DB.prepare(
        "INSERT INTO restore_operations(account_uid,request_id,fingerprint,revision,snapshot_id,scope,mode,counts_json,reauth_required,created_at,result_json) SELECT ?1,?2,?3,CAST(v AS INTEGER),?4,?5,?6,?7,?8,?9,json_object('ok',1,'requestId',?2,'rev',CAST(v AS INTEGER),'snapshot',?4,'scope',json(?5),'mode',?6,'intent',?12,'dept',?11,'counts',json(?7),'reauthRequired',?8,'warnings',json(?13),'imagesReused',?14,'revs',json(COALESCE((SELECT json_group_object(k,rev) FROM revs WHERE k IN (SELECT value FROM json_each(?10))),'{}'))) FROM meta WHERE k='rev'",
      ).bind(
        A.u.id,
        plan.body.requestId,
        plan.fingerprint,
        sid,
        JSON.stringify(plan.body.scope),
        plan.body.mode,
        JSON.stringify(plan.counts),
        plan.reauth ? 1 : 0,
        now,
        JSON.stringify(keys),
        plan.body.scope.departmentId || '',
        plan.intent || plan.body.mode,
        JSON.stringify(plan.warnings || []),
        plan.imagesReused || 0,
      ),
    );
  if (plan.intent === 'operations') st.push(env.DB.prepare(
    "UPDATE restore_operations SET result_json=json_set(json_patch(json(?5),result_json),'$.atomic',1,'$.epoch',?3,'$.v',revision,'$.revs',json(COALESCE((SELECT json_group_object(j.value,COALESCE(r.rev,0))FROM json_each(?4)j LEFT JOIN revs r ON r.k=j.value),'{}'))) WHERE account_uid=?1 AND request_id=?2"
  ).bind(A.u.id,plan.body.requestId,plan.epoch,JSON.stringify(plan.operationKeys),JSON.stringify(plan.operationResult||{})));
  var receiptExpected = plan.operation !== 'save' || plan.receiptRequired;
  st.push(
    receiptExpected
      ? env.DB.prepare('SELECT * FROM restore_operations WHERE account_uid=?1 AND request_id=?2').bind(A.u.id, plan.body.requestId)
      : env.DB.prepare("SELECT v FROM meta WHERE k='rev'"),
  );
  var batchResult = await env.DB.batch(st),
    last = batchResult[batchResult.length - 1],
    finalRows = (last && last.results) || [];
  preOff(env);
  if (!receiptExpected) {
    var clock = finalRows[0];
    return { ok: 1, rev: Number(clock && clock.v) || 0, snapshot: sid, counts: plan.counts };
  }
  var receipt = finalRows[0];
  if (!receipt) throw rsError('restore-receipt-unavailable', 503);
  if (receipt.result_json) {
    var result = JSON.parse(receipt.result_json);
    result.reauthRequired = !!result.reauthRequired;
    return result;
  }
  return {
    ok: 1,
    requestId: plan.body.requestId,
    scope: plan.body.scope,
    mode: plan.body.mode,
    rev: receipt.revision,
    snapshot: receipt.snapshot_id,
    counts: plan.counts,
    reauthRequired: plan.reauth,
  };
}
async function rsRestoreInventory(env, A, scope, requestedDepartments) {
  var reference = await rsReferenceSnapshot(env, A.u.id);
  env = reference.env;
  A = reference.A;
  if (!scope || !['full', 'dept'].includes(scope.kind) || (scope.kind === 'full' && A.u.role !== 'super'))
    throw rsError('restore-policy', 403);
  if (
    scope.kind === 'dept' &&
    (!A.depts.some(function (d) {
      return d.id === scope.departmentId;
    }) ||
      (A.u.role !== 'super' && (!isMgrOf(A, scope.departmentId) || !enfHeld(A, scope.departmentId, 'backup.restore'))))
  )
    throw rsError('restore-policy', 403);
  var kv = Object.create(null),
    r = reference.inputRevs;
  Object.keys(reference.inputKeys)
    .concat(Object.keys(r))
    .forEach(function (k) {
      if (scope.kind === 'full' || parseKey(k).dept === scope.departmentId || [K_USERS, K_PERM, K_DEPTS, K_GDEPTS, K_PLAT].includes(k))
        kv[k] = r[k] || 0;
    });
  var depts =
      scope.kind === 'dept'
        ? [scope.departmentId]
        : Array.from(
            new Set(
              A.depts
                .map(function (d) {
                  return d.id;
                })
                .concat(requestedDepartments || []),
            ),
          ),
    custody = Object.create(null), irshad = Object.create(null);
  for (var d of depts) {
    if (typeof d !== 'string' || !d || d.length > 200 || BAD_ID_RX.test(d) || d.includes(':')) throw rsError('restore-departments');
    custody[d] = r[cuKey(d)] || 0;
    opDefinitions().forEach(function(def){var k='bsdept:'+d+':'+def.resource;kv[k]=r[k]||0;});
    irshad[d] = await irRevs(env, d);
  }
  var businessBase=await bdRestoreRevisions(env,depts,scope.kind==='full');
  return {
    ok: 1,
    scope: scope,
    base: {
      epoch: +(reference.inputMeta.restore_epoch || 0),
      kv: kv,
      dailyStats: r[K_DSTATS] || 0,
      notifications: { rev: r[NF_REV] || 0, configRev: r[NF_CFG_REV] || 0, broadcastRev: r[NF_BC_REV] || 0 },
      custody: custody,
      irshad: irshad,
      seized: businessBase.seized,
      awards: businessBase.awards,
    },
    counts: { keys: Object.keys(kv).length, departments: depts.length },
  };
}
async function rsRoute(env, request, url, ss) {
  var A = await actorOf(env, ss.uid);
  if (!A) return json({ ok: 0, err: 'session' }, 401);
  try {
    if (request.method === 'GET') {
      var scope = { kind: url.searchParams.get('kind') || 'full' };
      if (scope.kind === 'dept') scope.departmentId = url.searchParams.get('dept') || '';
      var depts = [];
      try {
        depts = JSON.parse(url.searchParams.get('departments') || '[]');
      } catch (e) {
        throw rsError('restore-departments');
      }
      if (!Array.isArray(depts)) throw rsError('restore-departments');
      return json(await rsRestoreInventory(env, A, scope, depts));
    }
    if (request.method !== 'POST') throw rsError('method', 405);
    var bytes = await request.arrayBuffer();
    if (bytes.byteLength > bodyLimit('/api/backup/restore')) throw rsError('body-large', 413);
    var body;
    try {
      body = JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) {
      throw rsError('bad-body');
    }
    var shapeError = bodyCheck('/api/backup/restore', body); if(shapeError) return json({ok:0,err:'bad-body',at:shapeError},400);
    if (Object.prototype.hasOwnProperty.call(body, 'backup')) {
      rsShape(body, ['version', 'uid', 'requestId', 'scope', 'mode', 'reason', 'base', 'backup', 'legacyConsent', 'phase']);
      if (body.uid !== undefined && body.uid !== ss.uid) throw rsError('session-changed', 409);
      if (
        body.version !== 1 ||
        !['inspect', 'commit', undefined].includes(body.phase) ||
        typeof body.requestId !== 'string' ||
        !/^[-A-Za-z0-9_]{8,100}$/.test(body.requestId)
      )
        throw rsError('restore-shape');
      var reference = await rsReferenceSnapshot(env, A.u.id);
      env = reference.env;
      A = reference.A;
      if (
        !body.scope ||
        (body.scope.kind === 'full' && A.u.role !== 'super') ||
        (body.scope.kind === 'dept' &&
          A.u.role !== 'super' &&
          (!isMgrOf(A, body.scope.departmentId) || !enfHeld(A, body.scope.departmentId, 'backup.restore')))
      )
        throw rsError('restore-policy', 403);
      var rawFingerprint = hex(
          await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(JSON.stringify(cuCanonical(Object.assign({}, body, { phase: 'commit' })))),
          ),
        ),
        existing = await env.DB.prepare('SELECT * FROM restore_operations WHERE account_uid=?1 AND request_id=?2')
          .bind(A.u.id, body.requestId)
          .first();
      if (existing) {
        if (existing.fingerprint !== rawFingerprint) throw rsError('restore-request-reused', 409);
        await env.DB.batch(rsReferenceGuards(env,reference));
        return json(await rsCommit(env, A, { receipt: existing }, reqMeta(request)));
      }
      var converted = await rsConvertBackup(env, A, body.backup, {
          scope: body.scope,
          mode: body.mode,
          legacyConsent: body.phase === 'inspect' || body.legacyConsent === true,
          reference: reference,
        }),
        base = JSON.parse(JSON.stringify(body.base || {}));
      base.kv = base.kv || {};
      Object.keys(converted.keys).forEach(function (k) {
        if (base.kv[k] === undefined && !Object.prototype.hasOwnProperty.call(reference.inputKeys, k) && !reference.inputRevs[k])
          base.kv[k] = 0;
      });
      var normalized = {
        version: 1,
        uid: body.uid,
        requestId: body.requestId,
        scope: body.scope,
        mode: body.mode,
        reason: body.reason,
        base: base,
        keys: converted.keys,
        delete: [],
        domains: converted.domains,
        manifest: converted.manifest,
      };
      if (converted.permissionSlice !== undefined) normalized.permissionSlice = converted.permissionSlice;
      var plan = await rsPrepare(env, A, normalized, reqMeta(request), {
        reference: reference,
        fingerprint: rawFingerprint,
        images: converted.images,
      });
      plan.guards.push.apply(plan.guards, converted.readGuards || []);
      converted.summary.imagesReused = plan.imagesReused;
      if (body.phase === 'inspect')
        return json({ ok: 1, inspection: { scope: body.scope, base: base, counts: plan.counts, summary: converted.summary || {} } });
      return json(await rsCommit(env, A, plan, reqMeta(request)));
    }
    return json(await rsCommit(env, A, await rsPrepare(env, A, body, reqMeta(request)), reqMeta(request)));
  } catch (e) {
    if (e.ocCode) return json({ok:0,err:e.ocCode},e.status||400);
    if (e.rs) return json({ ok: 0, err: e.rs, details: e.details }, e.status);
    if (e.szCode || e.awCode) return bdErrorResponse(e);
    if (e.irCode) return json({ ok: 0, err: e.irCode, at: e.irPath }, e.irStatus);
    if (e.cuCode) return json({ ok: 0, err: e.cuCode }, e.cuStatus);
    if (e.nf) return json({ ok: 0, err: e.nf }, e.status);
    if (/KIVO_IRSHAD_LEGACY_SOURCE/.test(String(e))) return json({ ok: 0, err: 'irshad-legacy-source-present' }, 503);
    if (/KIVO_RESTORE_EPOCH/.test(String(e))) return json({ ok: 0, err: 'restore-epoch-changed' }, 409);
    if (/KIVO_RESTORE_TARGET|KIVO_REV_CONFLICT|KIVO_CUSTODY_TARGET_CHANGED/.test(String(e))) return json({ ok: 0, err: 'conflict' }, 409);
    throw e;
  }
}
