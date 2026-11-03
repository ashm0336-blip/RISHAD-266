/* STAGED: server-owned effects of 590/setEmp and 330/activateStaffMany.
   This module only reads and prepares canonical applySave input. It neither
   commits nor allocates revisions. The common compiler owns the sole batch. */
var EMP_TRANSITION_RELATED = [
  'bassam_employees_v1',
  'bassam_options_v1',
  'bassam_staffing_v2',
  'bassam_staffing_v3',
  'bassam_staffing_locks_v1',
  'bassam_plan_v1',
  'bassam_rounds_v1',
  'bassam_tasks_v1',
  'bassam_dreport_v1',
  'bassam_shift_options_v1',
  'bassam_perm_tpls_v1',
  'bassam_grants_v1',
];
function empTransitionKey(d, n) {
  return 'bsdept:' + d + ':' + n;
}
function empStableKey(e) {
  return typeof e === 'string' ? e : String((e && (e.eid || e.nid || e.name)) || '');
}
function empRecordKey(e) {
  return typeof e === 'string' ? e : String((e && (e.eid || e.name)) || '');
}
function empClone(v) {
  return JSON.parse(JSON.stringify(v));
}
function empSensitiveSource(v) {
  if (!v || typeof v !== 'object') return false;
  return Object.keys(v).some(function (k) {
    return /^(?:ph|pw|password|pin|token|cookies?|recovery|api_?key|secret|credentials?)$/i.test(k) || empSensitiveSource(v[k]);
  });
}
function empShape(v, keys) {
  if (
    !isObj(v) ||
    Object.keys(v).some(function (k) {
      return keys.indexOf(k) < 0 || ['__proto__', 'constructor', 'prototype'].indexOf(k) >= 0;
    })
  )
    throw cuError('employee-transition-shape');
}
function empActionAllowed(A, d, intent) {
  if (
    !A ||
    !A.u ||
    !['delete', 'import'].includes(intent) ||
    !deptInScope(A, d) ||
    !(A.depts || []).some(function (x) {
      return x && x.id === d;
    })
  )
    throw cuError('employee-transition-forbidden', 403);
  var ok = A.enf
    ? enfHeld(A, d, intent === 'delete' ? 'emp.record.delete' : 'emp.record.create')
    : actsHeldOn(A, d, 'emps/data', [intent === 'delete' ? 'del' : 'add']);
  if (!ok) throw cuError('employee-transition-forbidden', 403);
}
async function empTransitionSource(env) {
  var known = env.__employeeReference,
    raw = known && isObj(known.keys) ? known.keys : await kvAll(env, 'kv'),
    // RISHAD-266 · s1: a department-scoped reference (019e) sources every operational resource of its department(s) only.
    capture = await opCaptureReferences(env, raw, known && known.scope ? rsScopeOperationalKeys(known.scope.departments) : undefined),
    revs = Object.assign({},known && isObj(known.revs) ? known.revs : await revsAll(env),capture.revs);
  // Validate the read context after the revision header. A changed source
  // must fail rather than pair an old employee/schedule with a newer base.
  if (capture.guards.length) await env.DB.batch(capture.guards);
  return { keys:capture.keys,revs:revs,guards:capture.guards,snapshots:capture.snapshots };
}
function empTransitionContextOf(A, d, intent, source, cuRevision) {
  empActionAllowed(A, d, intent);
  var keys = EMP_TRANSITION_RELATED.map(function (n) {
      return empTransitionKey(d, n);
    }).concat([K_USERS, K_PERM, K_DEPTS, K_GDEPTS, K_PLAT]),
    base = {};
  keys.forEach(function (k) {
    base[k] = source.revs[k] || 0;
  });
  var employees = parseJson(source.keys[empTransitionKey(d, 'bassam_employees_v1')] || '[]', null),
    options = parseJson(source.keys[empTransitionKey(d, 'bassam_options_v1')] || 'null', null);
  if (!Array.isArray(employees)) throw cuError('employee-transition-source-shape');
  if (empSensitiveSource(employees)) throw cuError('employee-transition-sensitive-source');
  if (!isObj(options) || !Array.isArray(options.type) || !Array.isArray(options.work))
    options = { type: ['دائم', 'موسمي', 'متعاون'], work: ['ميداني', 'إداري'] };
  else options = { type: empClone(options.type), work: empClone(options.work) };
  if (empSensitiveSource(options)) throw cuError('employee-transition-sensitive-source');
  return {
    ok: 1,
    dept: d,
    intent: intent,
    base: { kv: base, custody: cuRevision, awards: Object.fromEntries(AW_NAMES.map(function(name,i){return [name,source.revs[awKey(d,i)]||0];})) },
    employees: empClone(employees),
    staffAccountKeys: (A.users || [])
      .filter(function (u) {
        return u && u.role === 'staff' && u.deptId === d && u.ekey;
      })
      .map(function (u) {
        return String(u.ekey);
      }),
    options: empClone(options),
    clock: cuClock(),
  };
}
async function empTransitionContext(env, A, d, intent) {
  return empTransitionContextOf(A, d, intent, await empTransitionSource(env), await cuRev(env, d));
}
function empTransitionValidateRows(before, after, intent, mode) {
  if (!Array.isArray(after)) throw cuError('employee-transition-rows');
  var old = new Map(),
    fresh = new Map();
  before.forEach(function (e) {
    var k = empRecordKey(e);
    if (!k || old.has(k)) throw cuError('employee-transition-identity-ambiguous');
    old.set(k, e);
  });
  after.forEach(function (e) {
    if (typeof e !== 'string' && !isObj(e)) throw cuError('employee-transition-rows');
    var k = empRecordKey(e),
      stored = old.get(k);
    if (
      isObj(e) &&
      ['ph', 'pw', 'password', 'pin', 'role', 'mgr', 'deptId', 'un', 'alt', 'dis'].some(function (k) {
        return Object.prototype.hasOwnProperty.call(e, k) && (!isObj(stored) || !deq(stored[k], e[k]));
      })
    )
      throw cuError('employee-transition-account-fields');
    if (!k || fresh.has(k)) throw cuError('employee-transition-identity-ambiguous');
    fresh.set(k, e);
    if (intent === 'delete' && (!old.has(k) || !deq(e, old.get(k)))) throw cuError('employee-transition-delete-shape');
  });
  if (intent === 'import' && mode !== 'replace') {
    var aligned = alignOld(entOf('bassam_employees_v1'), before, after, {}),
      alignedBy = new Map(
        aligned.map(function (e) {
          return [empRecordKey(e), e];
        }),
      );
    for (var pair of alignedBy)
      if (!fresh.has(pair[0]) || (mode === 'add' && !deq(pair[1], fresh.get(pair[0])))) throw cuError('employee-transition-import-shape');
  }
  if (intent === 'import' && mode !== 'replace') return [];
  return before.filter(function (e) {
    return !fresh.has(empRecordKey(e));
  });
}
function empDropPermission(p, d, key) {
  ['emps', 'tplOf', 'empLens'].forEach(function (n) {
    if (isObj(p[n]) && isObj(p[n][d])) delete p[n][d][key];
  });
}
function empPrunePermissions(p, d, users, A) {
  var live = new Set();
  users.forEach(function (u) {
    if (u && u.ekey && ((u.role === 'staff' && u.deptId === d) || (u.role === 'gm' && ancChain(A, d).indexOf(u.gid) >= 0)))
      live.add(u.ekey);
  });
  Object.keys((p.emps || {})[d] || {}).forEach(function (k) {
    if (!live.has(k)) empDropPermission(p, d, k);
  });
}
function empCleanupValues(values, removed, after, replace, wipe, staffOn) {
  var drop = new Set(cuRemovedHolderKeys(removed, after)),
    names = new Set(
      after.map(function (e) {
        return typeof e === 'string' ? e : e && e.name;
      }),
    );
  removed.forEach(function (e) {
    var name = typeof e === 'string' ? e : e && e.name;
    if (name && !names.has(name)) drop.add(name);
  });
  var filter = function (a) {
    return Array.isArray(a)
      ? a.filter(function (k) {
          return !drop.has(String(k));
        })
      : a;
  };
  if (staffOn)
    ['bassam_staffing_v2', 'bassam_staffing_v3'].forEach(function (n) {
      var st = values[n];
      if (!isObj(st)) return;
      Object.keys(st).forEach(function (k) {
        var b = st[k];
        if (drop.has(k) && isObj(b) && (b.shift !== undefined || b.rest !== undefined)) delete st[k];
        else if (isObj(b))
          drop.forEach(function (x) {
            delete b[x];
          });
      });
    });
  function fd(v) {
    if (!isObj(v)) return;
    ['zones', 'gates'].forEach(function (n) {
      if (Array.isArray(v[n]))
        v[n].forEach(function (r) {
          if (r && Array.isArray(r.emp)) r.emp = filter(r.emp);
        });
    });
  }
  var pl = values.bassam_plan_v1;
  if (isObj(pl)) {
    fd(pl);
    if (Array.isArray(pl.floors)) pl.floors.forEach(fd);
    if (isObj(pl.months))
      Object.keys(pl.months).forEach(function (k) {
        var a = pl.months[k],
          d = Array.isArray(a) ? a : a && a.d;
        if (Array.isArray(d)) d.forEach(fd);
      });
  }
  var rounds = values.bassam_rounds_v1;
  if (isObj(rounds))
    Object.keys(rounds).forEach(function (k) {
      if (rounds[k] && Array.isArray(rounds[k].d)) rounds[k].d.forEach(fd);
    });
  var tasks = values.bassam_tasks_v1;
  if (isObj(tasks))
    Object.keys(tasks).forEach(function (k) {
      if (Array.isArray(tasks[k]))
        tasks[k].forEach(function (r) {
          if (Array.isArray(r) && ((r[14] && drop.has(String(r[14]).trim())) || (r[8] && drop.has(String(r[8]).trim())))) {
            r[7] = [];
            r[8] = '';
            r[14] = '';
          }
        });
    });
  if (replace || wipe) {
    if (staffOn) {
      var st = values.bassam_staffing_v3,
        lk = values.bassam_staffing_locks_v1;
      if (!isObj(st)) st = {};
      if (!isObj(lk)) lk = {};
      Object.keys(st).forEach(function (m) {
        var b = st[m];
        if (!isObj(b)) {
          delete st[m];
          delete lk[m];
          return;
        }
        Object.keys(b).forEach(function (k) {
          if (k !== '__shifts') delete b[k];
        });
        if (
          !Object.keys(b).some(function (k) {
            return k !== '__shifts';
          })
        ) {
          delete st[m];
          delete lk[m];
        }
      });
      values.bassam_staffing_v3 = st;
      values.bassam_staffing_locks_v1 = lk;
    }
    if (values.__dreportOn) values.bassam_dreport_v1 = {};
  }
}
function empApplySchedule(values, meta, validKeys, result) {
  var rows = meta.schedule || [];
  if (!rows.length) return;
  if (!values.__staffOn) {
    result.warnings.push('schedule-disabled');
    return;
  }
  var mk = meta.year + '-' + meta.month,
    locks = values.bassam_staffing_locks_v1 || {};
  if (locks[mk]) {
    result.warnings.push('schedule-locked');
    return;
  }
  var options = values.bassam_shift_options_v1;
  if (
    !Array.isArray(options) ||
    !options.length ||
    !options.every(function (x) {
      return x && x.name && x.color;
    })
  )
    options = [
      { name: 'الوردية الأولى', color: '#b99751' },
      { name: 'الوردية الثانية', color: '#0891b2' },
      { name: 'الوردية الثالثة', color: '#4f46e5' },
      { name: 'الوردية الرابعة', color: '#166534' },
    ];
  var palette = ['#be185d', '#166534', '#7c3aed', '#b45309', '#0e7490'],
    days = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
    st = values.bassam_staffing_v3 || {},
    bucket = st[mk] || {},
    newOpt = 0,
    nShift = 0;
  rows.forEach(function (sr) {
    empShape(sr, ['key', 'shift', 'rest', 'cs', 'muk']);
    if (typeof sr.key !== 'string' || !validKeys.has(sr.key)) throw cuError('employee-transition-schedule-key');
    ['shift', 'rest', 'cs', 'muk'].forEach(function (k) {
      if (sr[k] !== undefined && typeof sr[k] !== 'string' && !(k === 'muk' && typeof sr[k] === 'boolean'))
        throw cuError('employee-transition-schedule-shape');
    });
    var entry = Object.assign({}, bucket[sr.key] || {});
    if (sr.shift) {
      var n = sr.shift.trim(),
        o = options.find(function (x) {
          return x.name === n || x.name === 'ال' + n || 'ال' + x.name === n;
        });
      if (!o && n.length >= 2) {
        o = { name: n, color: palette[(options.length + newOpt) % palette.length] };
        options = options.concat([o]);
        newOpt++;
      }
      if (o) {
        entry.shift = o.name;
        nShift++;
      } else result.warnings.push('schedule-shift-unknown');
    }
    if (sr.rest) {
      var txt = sr.rest.replace(/[أإآ]/g, 'ا'),
        found = [];
      days.forEach(function (d) {
        var bare = d.replace(/^ال/, '').replace(/[أإآ]/g, 'ا').replace(/ة$/, '[ةه]'),
          m = txt.match(new RegExp('(?:ال)?' + bare));
        if (m) found.push({ d: d, at: m.index });
      });
      found.sort(function (a, b) {
        return a.at - b.at;
      });
      var unique = Array.from(
        new Set(
          found.map(function (x) {
            return x.d;
          }),
        ),
      );
      if (unique.length) entry.rest = unique;
    }
    if (sr.cs) entry.cs = sr.cs.trim();
    if (sr.muk !== undefined && String(sr.muk).trim()) {
      var m = String(sr.muk).trim().replace(/[أإآ]/g, 'ا').replace(/ّ/g, '');
      entry.muk = /^(نعم|مكلف|منتدب|صح|صحيح|✓|✔|x|yes|true|1)$/i.test(m);
    }
    delete entry.leaves;
    if (entry.muk === undefined) entry.muk = false;
    bucket[sr.key] = entry;
  });
  st[mk] = bucket;
  values.bassam_staffing_v3 = st;
  if (newOpt || nShift) values.bassam_shift_options_v1 = options;
  result.counts.schedule = rows.length;
}
function empCleanTemplate(A, d, sheet) {
  var clean = {},
    src = expandPermsOf(A, d, sheet || {}),
    cap = deptCapOf(A, d);
  Object.keys(src).forEach(function (k) {
    var sp = pgSplit(k);
    if (cap.indexOf(sp.page) < 0) return;
    if (sp.sub) {
      if (
        deptSubsOf(A, d, sp.page)
          .concat(deptTabsOf(A, d, sp.page))
          .indexOf(sp.sub) < 0
      )
        return;
    } else if (pgIsContainer(sp.page) || !PG_OF[sp.page]) return;
    var acts = (src[k] || []).filter(function (a) {
      return ACTS_ALL.indexOf(a) >= 0;
    });
    if (acts.length) {
      if (acts.indexOf('view') < 0) acts.push('view');
      clean[k] = acts;
    }
  });
  return clean;
}
function empApplyTemplates(A, d, values, p, users, meta, validKeys, result) {
  var rows = meta.templates || [];
  if (!rows.length) return;
  if (!capOnDept(A, d, 'admin/ptpls')) {
    result.warnings.push('templates-disabled');
    return;
  }
  if (!isMgrOf(A, d)) {
    result.warnings.push('templates-manager-required');
    return;
  }
  var templates = values.bassam_perm_tpls_v1 || [],
    lens = (p.lenses || {})[d];
  var accountByKey = new Map();
  users.forEach(function (u) {
    if (u && u.role === 'staff' && u.deptId === d) accountByKey.set(u.ekey, u);
  });
  if (!Array.isArray(lens))
    lens = Object.keys(enfIx().lens)
      .map(function (k) {
        return enfIx().lens[k];
      })
      .filter(function (v, i, a) {
        return a.indexOf(v) === i;
      });
  var grants = values.bassam_grants_v1;
  if (!isObj(grants) || !isObj(grants.emp)) grants = { v: 1, emp: {} };
  rows.forEach(function (row) {
    empShape(row, ['key', 'name']);
    if (typeof row.key !== 'string' || !validKeys.has(row.key) || typeof row.name !== 'string')
      throw cuError('employee-transition-template-key');
    var norm = function (n) {
        return String(n || '')
          .trim()
          .replace(/\s+/g, ' ');
      },
      t = templates.find(function (t) {
        return norm(t.name) === norm(row.name);
      });
    if (!t) {
      result.warnings.push('template-unknown');
      return;
    }
    var cut = empCleanTemplate(A, d, t.perms);
    if (!Object.keys(cut).length) {
      result.warnings.push('template-empty');
      return;
    }
    ['emps', 'tplOf', 'empLens'].forEach(function (n) {
      p[n] = p[n] || {};
      p[n][d] = p[n][d] || {};
    });
    p.emps[d][row.key] = cut;
    p.tplOf[d][row.key] = t.id;
    p.empLens[d][row.key] = Array.isArray(t.lens)
      ? t.lens.filter(function (k) {
          return lens.indexOf(k) >= 0;
        })
      : lens.slice();
    if (A.enf) {
      if (A.u.role !== 'super' && A.u.ekey === row.key) {
        result.warnings.push('template-self-grant-unchanged');
        return;
      }
      if (Array.isArray(t.keys24)) {
        var target = accountByKey.get(row.key) || { role: 'staff', deptId: d, ekey: row.key },
          targetA = Object.assign({}, A, { u: target, perms: p, __enfT: null, __enfH: null }),
          translated = enfTranslated(targetA, d).keys,
          E = new Set(t.keys24),
          prev = (grants.emp[row.key] || {}).plus || [],
          plus = [],
          minus = [];
        KIVO_REGISTRY.keys.forEach(function (k) {
          var e = KIVO_REGISTRY.byKey[k],
            ix = enfIx();
          if (
            !e ||
            e.status !== 'active' ||
            e.grant !== 'assignable' ||
            /^lens\.[a-z]+\.enable$/.test(k) ||
            (ix.needMgr[k] && (ix.atomless[k] || !isMgrKey(row.key))) ||
            !enfKeyOnCeiling(A, d, k)
          )
            return;
          var L = ix.lens[k];
          if (L && p.empLens[d][row.key].indexOf(L) < 0) return;
          var T = !!translated[k] && !(enfPermMigrated(A) && ENF_COMPAT[k]);
          if (E.has(k) && !T) {
            if (A.u.role === 'super' || prev.indexOf(k) >= 0 || enfHeld(A, d, k)) plus.push(k);
            else result.warnings.push('template-unheld-key-omitted');
          }
          if (T && !E.has(k)) minus.push(k);
        });
        if (plus.length || minus.length)
          grants.emp[row.key] = { plus: plus.sort(), minus: minus.sort(), at: Date.now(), by: A.u.id, src: 'tpl:' + t.id };
        else delete grants.emp[row.key];
      } else delete grants.emp[row.key];
    }
    result.counts.templates++;
  });
  if (A.enf) values.bassam_grants_v1 = grants;
}
async function empPrepareTransition(env, A, input) {
  if (!A || !A.u) throw cuError('employee-transition-forbidden', 403);
  empShape(input, [
    'uid',
    'dept',
    'intent',
    'deleteMode',
    'requestId',
    'base',
    'finalRows',
    'options',
    'import',
    'accountProposals',
    'reason',
  ]);
  if (input.reason !== undefined && typeof input.reason !== 'string') throw cuError('employee-transition-shape');
  if (
    typeof input.dept !== 'string' ||
    typeof input.requestId !== 'string' ||
    !/^[-A-Za-z0-9_]{8,100}$/.test(input.requestId) ||
    (input.uid !== undefined && input.uid !== A.u.id)
  )
    throw cuError('employee-transition-shape');
  empActionAllowed(A, input.dept, input.intent);
  if (!Array.isArray(input.finalRows)) throw cuError('employee-transition-rows');
  var d = input.dept,
    source = await empTransitionSource(env),
    context = empTransitionContextOf(A, d, input.intent, source, await cuRev(env, d));
  empShape(input.base, ['epoch', 'kv', 'custody', 'awards']);
  if(!deq(cuCanonical(input.base.awards),cuCanonical(context.base.awards)))throw cuError('award-conflict',409);
  if (!isObj(input.base.kv) || !Number.isSafeInteger(input.base.custody) || input.base.custody < 0)
    throw cuError('employee-transition-base');
  for (var key of Object.keys(context.base.kv))
    if (input.base.kv[key] !== context.base.kv[key]) throw cuError('employee-transition-conflict', 409);
  // RISHAD-266: the reference set is exactly the server context (no client-added keys), so 019e may trust it
  if (Object.keys(input.base.kv).length !== Object.keys(context.base.kv).length) throw cuError('employee-transition-conflict', 409);
  if (input.base.custody !== context.base.custody) throw cuError('custody-conflict', 409);
  var mode = input.intent === 'import' && input.import && input.import.mode,
    replace = mode === 'replace',
    wipe = input.intent === 'delete' && input.deleteMode === 'all';
  if (input.intent === 'delete') {
    if (
      (input.deleteMode !== undefined && !['selected', 'all'].includes(input.deleteMode)) ||
      input.import !== undefined ||
      input.options !== undefined ||
      (wipe && input.finalRows.length)
    )
      throw cuError('employee-transition-shape');
  } else {
    empShape(input.import, ['mode', 'year', 'month', 'schedule', 'templates']);
    if (
      !['add', 'update', 'replace'].includes(mode) ||
      !Number.isInteger(input.import.year) ||
      !/^\d{4}$/.test(String(input.import.year)) ||
      !Number.isInteger(input.import.month) ||
      input.import.month < 1 ||
      input.import.month > 12 ||
      !Array.isArray(input.import.schedule) ||
      !Array.isArray(input.import.templates) ||
      input.deleteMode !== undefined
    )
      throw cuError('employee-transition-import-shape');
    var act = replace ? 'del' : mode === 'update' ? 'edit' : 'add';
    if (
      !(A.enf
        ? enfHeld(A, d, { del: 'emp.record.delete', edit: 'emp.record.edit', add: 'emp.record.create' }[act])
        : actsHeldOn(A, d, 'emps/data', [act]))
    )
      throw cuError('employee-transition-forbidden', 403);
    if (replace && !(A.enf ? enfHeld(A, d, 'import.replace') : actsHeldOn(A, d, 'admin/import', ['del'])))
      throw cuError('employee-transition-forbidden', 403);
  }
  /* PRIVACY (019u): the context reached a delete-only holder projected (019e GET) — hidden fields come back from storage before any
     rule; one sent with another value, or an unknown 'nx:' token, is refused (lossless, never silently applied) */
  var stP = {}, rows0 = privPersonalOk(A, d) ? input.finalRows : privEmpIn(A, d, input.finalRows, context.employees, stP, 1);
  if (stP.bad) throw cuError('privacy-hidden', 409);
  var after = empClone(rows0),
    before = context.employees,
    removed = empTransitionValidateRows(before, after, input.intent, mode),
    values = {},
    original = {},
    set = Object.create(null),
    base = Object.assign(Object.create(null), input.base.kv),
    ops = {},
    result = {
      counts: { removed: removed.length, employees: after.length, accountsCreated: 0, accountsRemoved: 0, schedule: 0, templates: 0 },
      warnings: [],
    };
  EMP_TRANSITION_RELATED.forEach(function (n) {
    var k = empTransitionKey(d, n),
      raw = source.keys[k];
    original[n] = raw == null ? null : parseJson(raw, null);
    values[n] = raw == null ? null : empClone(original[n]);
  });
  /* Ordinary delete called 590 cleanup without skip flags; only import replace
     skips disabled modules. The canonical resource guards still decide writes. */
  values.__staffOn = input.intent === 'delete' || capOnDept(A, d, 'staff');
  values.__dreportOn = input.intent === 'delete' || capOnDept(A, d, 'dreport');
  empCleanupValues(values, replace ? before : removed, after, replace, wipe, values.__staffOn);
  if (replace && values.__staffOn) {
    var mk = input.import.year + '-' + input.import.month;
    delete values.bassam_staffing_locks_v1[mk];
  }
  values.bassam_employees_v1 = after;
  if (input.options !== undefined) {
    empShape(input.options, ['type', 'work']);
    ['type', 'work'].forEach(function (k) {
      if (
        !Array.isArray(input.options[k]) ||
        input.options[k].some(function (v) {
          return typeof v !== 'string' || !v;
        })
      )
        throw cuError('employee-transition-options');
    });
    values.bassam_options_v1 = empClone(input.options);
  }
  var users = empClone(A.users || parseJson(source.keys[K_USERS] || '[]', [])),
    p = empClone(A.perms || {}),
    manager = isMgrOf(A, d),
    alive = new Set(after.map(empStableKey));
  var proposals = new Map(),
    consumed = new Set();
  if (input.accountProposals !== undefined && !Array.isArray(input.accountProposals))
    throw cuError('employee-transition-account-proposals');
  (input.accountProposals || []).forEach(function (proposal) {
    empShape(proposal, ['ekey', 'ph']);
    if (
      typeof proposal.ekey !== 'string' ||
      !proposal.ekey ||
      proposals.has(proposal.ekey) ||
      typeof proposal.ph !== 'string' ||
      !proposal.ph ||
      !phNewOk(null, { ph: proposal.ph })
    )
      throw cuError('employee-transition-account-proposals');
    proposals.set(proposal.ekey, proposal.ph);
  });
  if (!manager && proposals.size) throw cuError('employee-transition-account-manager', 403);
  if (manager) {
    var removedAccounts = users.filter(function (u) {
      return u && u.role === 'staff' && u.deptId === d && !isMgrKey(u.ekey) && !alive.has(u.ekey);
    });
    var removedAccountSet = new Set(removedAccounts);
    users = users.filter(function (u) {
      return !removedAccountSet.has(u);
    });
    removedAccounts.forEach(function (u) {
      empDropPermission(p, d, u.ekey);
    });
    result.counts.accountsRemoved = removedAccounts.length;
    var occupied = new Set(),
      existingStaff = new Set();
    users.forEach(function (u) {
      if (u.un) occupied.add(String(u.un).toLowerCase());
      if (u.alt) occupied.add(String(u.alt).toLowerCase());
      if (u && u.role === 'staff' && u.deptId === d) existingStaff.add(u.ekey);
    });
    for (var e of after) {
      if (!isObj(e)) continue;
      var ek = empStableKey(e),
        nid = String(e.nid || '').trim(),
        phone = String(e.phone || '').trim(),
        pw = String(e.empno || '').trim(),
        name = String(e.name || '').trim();
      if (!ek || (!nid && !phone) || !pw || existingStaff.has(ek)) continue;
      var un = nid || phone,
        alt = nid ? phone : '';
      if (proposals.has(ek)) consumed.add(ek);
      if (occupied.has(un.toLowerCase()) || (alt && occupied.has(alt.toLowerCase()))) {
        result.warnings.push('account-login-unavailable');
        continue;
      }
      if (!/^\d{5,6}$/.test(pw) || !/^\d{10}$/.test(un) || (alt && !/^\d{10}$/.test(alt)))
        throw cuError('employee-transition-initial-credentials');
      if (!proposals.has(ek)) throw cuError('employee-transition-account-proposal-required');
      occupied.add(un.toLowerCase());
      if (alt) occupied.add(alt.toLowerCase());
      users.push({
        id: 's' + crypto.randomUUID().replace(/-/g, ''),
        un: un,
        alt: alt,
        ph: proposals.get(ek),
        role: 'staff',
        deptId: d,
        ekey: ek,
        name: name || 'موظف',
        dis: 0,
      });
      existingStaff.add(ek);
      result.counts.accountsCreated++;
    }
    if (removed.length || replace || wipe) empPrunePermissions(p, d, users, A);
  }
  if (
    Array.from(proposals.keys()).some(function (k) {
      return !consumed.has(k);
    })
  )
    throw cuError('employee-transition-account-proposal-ineligible');
  var validKeys = new Set(after.map(empStableKey));
  if (input.intent === 'import') {
    empApplySchedule(values, input.import, validKeys, result);
    empApplyTemplates(A, d, values, p, users, input.import, validKeys, result);
  }
  EMP_TRANSITION_RELATED.forEach(function (n) {
    if (n === 'bassam_perm_tpls_v1') return;
    // An absent ledger has no rows to clean. Do not turn cleanup into an
    // unrelated resource creation solely by materializing its empty shape.
    if (original[n] === null && isObj(values[n]) && !Object.keys(values[n]).length) return;
    if (values[n] !== null && !deq(values[n], original[n])) set[empTransitionKey(d, n)] = JSON.stringify(values[n]);
  });
  var employeeKey = empTransitionKey(d, 'bassam_employees_v1');
  set[employeeKey] = JSON.stringify(after);
  if (!deq(users, A.users)) set[K_USERS] = JSON.stringify(users);
  if (!deq(p, A.perms)) set[K_PERM] = JSON.stringify(p);
  Object.keys(set).forEach(function (k) {
    if (input.intent === 'import' && KIVO_BUILD.isImportRes(resName(k))) ops[k] = { op: 'import.run', mode: mode, n: after.length };
  });
  base[cuKey(d)] = input.base.custody;
  var body = { uid: A.u.id, set: set, del: [], base: base, ops: ops };
  if (typeof input.reason === 'string' && input.reason.trim()) {
    body.why = Object.create(null);
    Object.keys(set).forEach(function (k) {
      body.why[k] = input.reason.trim().slice(0, 300);
    });
  }
  if (set[K_USERS]) body.uscope = usersLensFp(A);
  if (set[K_PERM]) body.pscope = privPermsFp(A);   // PRIVACY batch (019u): built from the stored registry, on the current projection
  return {
    body: body,
    context: {
      serverEmployeeIntent: {
        dept: d,
        kind: replace ? 'import-replace' : wipe ? 'employee-wipe' : 'employee-delete',
        requestId: input.requestId,
      },
      allRequestedKeysRequired: true,
      sourceGuards: source.guards,
    },
    result: result,
  };
}
