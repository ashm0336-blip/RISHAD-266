/* Backup normalization. Read/validate only: the existing restore compiler
   remains the only writer and the only source of authorization/account policy. */
function rsBCFail(code) {
  throw rsError('backup-' + code);
}
function rsBCParse(raw) {
  if (typeof raw !== 'string') rsBCFail('value-shape');
  try {
    return JSON.parse(raw);
  } catch (e) {
    rsBCFail('value-json');
  }
}
function rsBCClone(value) {
  return JSON.parse(JSON.stringify(value));
}
function rsBCOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}
function rsBCDeptIds(raw) {
  var rows = rsBCParse(raw);
  if (!Array.isArray(rows)) rsBCFail('departments');
  var ids = rows.map(function (d) {
    if (!isObj(d) || typeof d.id !== 'string' || !d.id || d.id.indexOf(':') >= 0) rsBCFail('departments');
    return d.id;
  });
  if (new Set(ids).size !== ids.length) rsBCFail('departments');
  return ids;
}
function rsBCNF(domain, scope) {
  return Object.assign({ version: 1 }, rsNFValidate(domain, scope));
}
function rsBCEmptyNF() {
  var d = { version: 1 };
  Object.keys(NF_TABLES).forEach(function (n) {
    d[n] = [];
  });
  return d;
}
function rsBCRemapNF(domain, source, target) {
  var next = rsBCClone(domain);
  if (source === target) return next;
  Object.keys(NF_TABLES).forEach(function (n) {
    next[n].forEach(function (r) {
      var col = n === 'states' ? 'message_scope' : 'scope';
      if (r[col] === 'd:' + source) r[col] = 'd:' + target;
      if (n === 'messages' && r.department === source) r.department = target;
      if (n === 'targets' && r.kind === 'department' && r.value === source) r.value = target;
    });
  });
  return next;
}
function rsBCRemapCU(domain, source, target) {
  var original = cuValidateDomain(domain, source),
    next = { version: 1, scope: { departmentId: target }, rows: rsBCClone(original) };
  Object.keys(CU_TABLES).forEach(function (n) {
    next.rows[n].forEach(function (r) {
      r.department_id = target;
    });
  });
  cuValidateDomain(next, target);
  return next;
}
function rsBCRemapIR(domain, source, target) {
  var next = rsBCClone(irValidateDomain(domain, source));
  next.scope.departmentId = target;
  Object.keys(IR_TABLES).forEach(function (kind) {
    next.rows[kind].forEach(function (row) { row.department_id = target; });
  });
  return irValidateDomain(next, target);
}
function rsBCForbiddenKey(key) {
  var n = resName(key);
  return isDeviceKey(key) || isDeviceKey(n) || /(?:^|_)(?:sessions?|recovery|recover|cookies?|tokens?|credentials?)(?:_|$)/i.test(n);
}
function rsBCManifest(manifest, scope, keys, domains, departments) {
  rsShape(manifest, ['version', 'scope', 'domains', 'departments', 'keys']);
  var required = scope.kind === 'full' ? ['kv', 'dailyStats', 'notifications', 'custody'] : ['kv', 'notifications', 'custody'];
  if (manifest.version >= 2) required.push('irshad');
  if (manifest.version >= 3) required.push('seized','awards');
  if (manifest.version >= 4) required.push('operations');
  rsShape(manifest.domains, required);
  if (
    ![1, 2, 3, 4].includes(manifest.version) ||
    manifest.scope !== scope.kind ||
    required.some(function (k) {
      return manifest.domains[k] !== 1;
    }) ||
    !Array.isArray(manifest.departments) ||
    new Set(manifest.departments).size !== manifest.departments.length ||
    !deq(manifest.departments.slice().sort(), departments.slice().sort()) ||
    !Array.isArray(manifest.keys) ||
    new Set(manifest.keys).size !== manifest.keys.length
  )
    rsBCFail('incomplete-manifest');
  var declared = Object.keys(keys).map(function (k) {
    return scope.kind === 'dept' ? resName(k) : k;
  });
  if (
    !deq(manifest.keys.slice().sort(), declared.slice().sort()) ||
    !domains.notifications ||
    !Array.isArray(domains.custody) ||
    (scope.kind === 'full' && !domains.dailyStats)
  )
    rsBCFail('incomplete-manifest');
  var custody = domains.custody.map(function (d) {
    return d && d.scope && d.scope.departmentId;
  });
  if (!deq(custody.slice().sort(), departments.slice().sort())) rsBCFail('incomplete-custody');
  if (manifest.version >= 2) {
    if (!Array.isArray(domains.irshad) || !deq(domains.irshad.map(function (d) {
      return d && d.scope && d.scope.departmentId;
    }).sort(), departments.slice().sort())) rsBCFail('incomplete-irshad');
  } else if (domains.irshad !== undefined) rsBCFail('irshad-manifest-version');
  for(var def of bdDefinitions()) {
    if(manifest.version>=3) {
      var expected=departments.concat(def.name==='awards'&&scope.kind==='full'?['']:[]).sort();
      if(!Array.isArray(domains[def.name])||!deq(domains[def.name].map(bdScope).sort(),expected))rsBCFail('incomplete-'+def.name);
    } else if(domains[def.name]!==undefined)rsBCFail(def.name+'-manifest-version');
  }
  if(manifest.version>=4)opValidateBackupDomains(domains.operations,departments);
  else if(domains.operations!==undefined)rsBCFail('operations-manifest-version');
}
async function rsConvertBackup(env, A, file, opt) {
  opt = opt || {};
  rsShape(opt, ['scope', 'mode', 'legacyConsent', 'reference']);
  rsShape(opt.scope, ['kind', 'departmentId']);
  if (
    !A ||
    !A.u ||
    !['full', 'dept'].includes(opt.scope.kind) ||
    !['replace', 'merge'].includes(opt.mode) ||
    (opt.scope.kind === 'dept' && (typeof opt.scope.departmentId !== 'string' || !opt.scope.departmentId))
  )
    rsBCFail('scope');
  if (!isObj(file) || !isObj(file.data)) rsBCFail('file-shape');
  if (privRedacted(file)) throw rsError('restore-redacted', 409);   // PRIVACY batch (019u): a copy exported without personal data restores nothing
  rsShape(file, ['app', 'version', 'kind', 'data', 'domains', 'manifest', 'perms', 'idbImages', 'dept', 'exportedAt', 'preImport']);
  var modern = rsBCOwn(file, 'manifest'),
    legacy = !modern,
    target = opt.scope.departmentId || '',
    scope = opt.scope,
    kind = file.kind || scope.kind,
    summary = { legacy: legacy, emptyDomains: [], preservedGlobals: [], ignoredDevicePreferences: [], remapped: false },
    readGuards = [];
  if (modern && (file.app !== 'bassam-crowd' || ![1, 2, 3, 4].includes(file.version) || file.kind !== scope.kind)) rsBCFail('identity');
  if (
    legacy &&
    (opt.legacyConsent !== true ||
      (file.app !== undefined && file.app !== 'bassam-crowd') ||
      (file.version !== undefined && ![1, 2, 3].includes(file.version)) ||
      !['full', 'dept'].includes(kind))
  )
    rsBCFail(opt.legacyConsent !== true ? 'legacy-consent-required' : 'identity');
  if (scope.kind === 'full' && (A.u.role !== 'super' || kind !== 'full')) throw rsError('restore-policy', 403);
  if (scope.kind === 'dept' && kind === 'full' && (!legacy || A.u.role !== 'super')) throw rsError('restore-policy', 403);
  if (file.idbImages !== undefined) rsImageArchiveShape(file.idbImages);
  if (file.perms !== undefined && scope.kind !== 'dept') rsBCFail('permissions-scope');
  var reference = opt.reference && opt.reference.inputKeys;
  if (!isObj(reference)) rsBCFail('reference-required');
  var input = Object.create(null),
    keys = Object.create(null),
    domains = file.domains === undefined ? {} : rsBCClone(file.domains);
  rsShape(domains, ['dailyStats', 'notifications', 'custody', 'irshad', 'seized', 'awards', 'operations']);
  Object.keys(file.data).forEach(function (k) {
    if (k === 'bassam_active_dept_v1') {
      summary.ignoredDevicePreferences.push(k);
      return;
    }
    if (['__proto__', 'constructor', 'prototype'].indexOf(k) >= 0 || typeof file.data[k] !== 'string') rsBCFail('data-shape');
    if (rsBCForbiddenKey(k)) rsBCFail('sensitive-device-key');
    if (irLegacyKey(k)) {
      var part = parseKey(k), i = IR_RES.indexOf(resName(k));
      if (k !== (part.dept ? irKey(part.dept, i) : IR_RES[i])) rsBCFail('irshad-namespace');
    }
    rsBCParse(file.data[k]);
    input[k] = file.data[k];
  });
  var prefixes = Array.from(
      new Set(
        Object.keys(input)
          .filter(function (k) {
            return /^bsdept:/.test(k);
          })
          .map(function (k) {
            var p = parseKey(k);
            if (!p.dept) rsBCFail('scope');
            return p.dept;
          }),
      ),
    ),
    source = target,
    deptIds = [];
  if (scope.kind === 'full') {
    if (!rsBCOwn(input, K_DEPTS)) rsBCFail('flat-requires-explicit-department');
    deptIds = rsBCDeptIds(input[K_DEPTS]);
    prefixes.forEach(function (d) {
      if (deptIds.indexOf(d) < 0) rsBCFail('unknown-department');
    });
    Object.keys(input).forEach(function (k) {
      if (!parseKey(k).dept && resOf(k) && resOf(k).scope === 'dept' && !AW_RES.slice(1).includes(k)) rsBCFail('unscoped-department-key');
      keys[k] = input[k];
    });
  } else {
    if (prefixes.length > 1) rsBCFail('ambiguous-department');
    var declared = modern ? file.manifest && file.manifest.departments : undefined;
    if (declared !== undefined && (!Array.isArray(declared) || declared.length !== 1)) rsBCFail('manifest-scope');
    var typed =
      Array.isArray(domains.custody) && domains.custody.length === 1
        ? domains.custody[0].scope && domains.custody[0].scope.departmentId
        : null;
    var irTyped = Array.isArray(domains.irshad) && domains.irshad.length === 1 ? domains.irshad[0].scope && domains.irshad[0].scope.departmentId : null;
    var hints = [prefixes[0], declared && declared[0], typed, irTyped].filter(Boolean);
    if (new Set(hints).size > 1) rsBCFail('ambiguous-department');
    source = hints[0] || target;
    deptIds = [target];
    summary.remapped = source !== target;
    Object.keys(input).forEach(function (k) {
      var p = parseKey(k),
        name = p.name;
      if (p.dept && p.dept !== source) rsBCFail('scope');
      if (
        (!p.dept && [K_DEPTS, K_GDEPTS, K_USERS, K_PERM, K_PLAT].indexOf(k) >= 0) ||
        ['bassam_notif_sys_v1', 'bassam_notif_cfg_v1', 'bassam_bc_v1'].indexOf(name) >= 0
      )
        rsBCFail('global-in-department');
      var dest = 'bsdept:' + target + ':' + name;
      if (rsBCOwn(keys, dest)) rsBCFail('duplicate-key');
      keys[dest] = input[k];
    });
  }
  Object.keys(keys).filter(bdLegacyKey).forEach(function(k){
    var def=bdDefinitions().find(function(def){return def.resources.includes(resName(k));}),part=parseKey(k),index=def.resources.indexOf(resName(k));
    if(k!==(part.dept?def.key(part.dept,index):def.resources[index]))rsBCFail('business-namespace');
    if(!part.dept&&!(def.name==='awards'&&index>0&&scope.kind==='full'))rsBCFail('business-global-scope');
    if(part.dept&&!deptIds.includes(part.dept))rsBCFail('business-department');
  });
  var cuKeys = Object.keys(keys).filter(cuLegacyKey),
    irKeys = Object.keys(keys).filter(irLegacyKey),
    businessKeys = Object.keys(keys).filter(bdLegacyKey),
    nfKeys = Object.keys(keys).filter(nfLegacyKey),
    dsKeys = Object.keys(keys).filter(function (k) {
      return resName(k) === K_DSTATS;
    });
  if (
    (cuKeys.length && rsBCOwn(domains, 'custody')) ||
    (nfKeys.length && rsBCOwn(domains, 'notifications')) ||
    (dsKeys.length && rsBCOwn(domains, 'dailyStats')) ||
    (irKeys.length && rsBCOwn(domains, 'irshad'))
  )
    rsBCFail('duplicate-domain-source');
  for(var def of bdDefinitions()) if(businessKeys.some(function(k){return def.resources.includes(resName(k));})&&rsBCOwn(domains,def.name))rsBCFail('duplicate-domain-source');
  if (modern && (cuKeys.length || nfKeys.length || dsKeys.length || (file.manifest && file.manifest.version >= 2 && irKeys.length))) rsBCFail('retired-key-in-modern-file');
  if(modern&&file.manifest.version>=3&&businessKeys.length)rsBCFail('retired-key-in-modern-file');
  if(modern&&file.manifest.version>=4&&Object.keys(keys).some(opIsResource))rsBCFail('retired-key-in-modern-file');
  if (scope.kind === 'dept' && (dsKeys.length || domains.dailyStats !== undefined)) rsBCFail('global-domain-in-department');
  if (modern) {
    // Validate the source declaration before an explicit scoped remap. Missing
    // modern domains cannot obtain legacy empty/preservation fallbacks.
    var sourceScope = scope.kind === 'dept' ? { kind: 'dept', departmentId: source } : scope,
      sourceKeys = Object.create(null);
    Object.keys(keys).forEach(function (k) {
      sourceKeys[scope.kind === 'dept' ? 'bsdept:' + source + ':' + resName(k) : k] = keys[k];
    });
    rsBCManifest(file.manifest, sourceScope, sourceKeys, domains, scope.kind === 'dept' ? [source] : deptIds);
  }
  if (domains.irshad !== undefined) {
    if (!Array.isArray(domains.irshad)) rsBCFail('irshad-shape');
    domains.irshad = domains.irshad.map(function (domain) {
      var d = domain && domain.scope && domain.scope.departmentId;
      if (typeof d !== 'string' || (scope.kind === 'full' ? deptIds.indexOf(d) < 0 : d !== source)) rsBCFail('irshad-scope');
      return rsBCRemapIR(domain, d, scope.kind === 'dept' ? target : d);
    });
    if (new Set(domains.irshad.map(function (d) { return d.scope.departmentId; })).size !== domains.irshad.length) rsBCFail('irshad-duplicate');
  } else if (legacy || file.manifest.version === 1) {
    domains.irshad = deptIds.map(function (d) {
      var docs = {};
      IR_RES_NAMES.forEach(function (name, i) {
        var key = irKey(d, i);
        if (rsBCOwn(keys, key)) docs[name] = rsBCParse(keys[key]);
      });
      if (!Object.keys(docs).length) summary.emptyDomains.push('irshad:' + d);
      return irValidateDomain(irConvert(d, docs), d);
    });
  }
  for(var def of bdDefinitions()) {
    if(domains[def.name]!==undefined) {
      if(!Array.isArray(domains[def.name]))rsBCFail(def.name+'-shape');
      domains[def.name]=domains[def.name].map(function(domain){
        var d=bdScope(domain),global=def.name==='awards'&&d==='';
        if(typeof d!=='string'||(global&&scope.kind!=='full')||(!global&&(scope.kind==='full'?!deptIds.includes(d):d!==source)))rsBCFail(def.name+'-scope');
        var next=rsBCClone(def.validate(domain,d)),targetDept=scope.kind==='dept'?target:d;
        if(targetDept!==d){next.scope={departmentId:targetDept};Object.keys(def.tables).forEach(function(kind){next.rows[kind].forEach(function(row){row.department_id=targetDept;});});}
        return def.validate(next,targetDept);
      });
      if(new Set(domains[def.name].map(bdScope)).size!==domains[def.name].length)rsBCFail(def.name+'-duplicate');
    } else if(legacy||file.manifest.version<3) {
      domains[def.name]=deptIds.concat(def.name==='awards'&&scope.kind==='full'?['']:[]).map(function(d){
        var docs={};def.names.forEach(function(name,i){var k=d?def.key(d,i):def.resources[i];if(rsBCOwn(keys,k))docs[name]=rsBCParse(keys[k]);});
        if(!Object.keys(docs).length)summary.emptyDomains.push(def.name+':'+d);
        return def.validate(def.convert(d,docs),d);
      });
    }
  }
  if (domains.custody !== undefined) {
    if (!Array.isArray(domains.custody)) rsBCFail('custody-shape');
    domains.custody = domains.custody.map(function (domain) {
      var d = domain && domain.scope && domain.scope.departmentId;
      if (typeof d !== 'string' || (scope.kind === 'full' ? deptIds.indexOf(d) < 0 : d !== source)) rsBCFail('custody-scope');
      return rsBCRemapCU(domain, d, scope.kind === 'dept' ? target : d);
    });
    var seenCU = domains.custody.map(function (d) {
      return d.scope.departmentId;
    });
    if (new Set(seenCU).size !== seenCU.length) rsBCFail('custody-duplicate');
  } else if (legacy) {
    domains.custody = deptIds.map(function (d) {
      var key = 'bsdept:' + d + ':' + CU_RESOURCE,
        doc = rsBCOwn(keys, key) ? rsBCParse(keys[key]) : { items: [], moves: [] };
      if (!rsBCOwn(keys, key)) summary.emptyDomains.push('custody:' + d);
      var domain = { version: 1, scope: { departmentId: d }, rows: cuConvert(d, doc) };
      cuValidateDomain(domain, d);
      return domain;
    });
  }
  if (legacy && domains.custody) {
    var included = new Set(
      domains.custody.map(function (d) {
        return d.scope.departmentId;
      }),
    );
    deptIds.forEach(function (d) {
      if (!included.has(d)) {
        domains.custody.push({ version: 1, scope: { departmentId: d }, rows: { items: [], issues: [], moves: [] } });
        summary.emptyDomains.push('custody:' + d);
      }
    });
  }
  if (domains.dailyStats !== undefined) {
    rsShape(domains.dailyStats, ['version', 'rev', 'data']);
    if (domains.dailyStats.version !== 1 || !dsDomainShape(domains.dailyStats.data)) rsBCFail('daily-stats-shape');
  } else if (scope.kind === 'full' && legacy) {
    if (dsKeys.length > 1 || (dsKeys.length === 1 && dsKeys[0] !== K_DSTATS)) rsBCFail('daily-stats-scope');
    if (dsKeys.length) domains.dailyStats = { version: 1, data: dsLegacyConvert(keys[dsKeys[0]]) };
    else {
      var current = await rsDSCurrent(env);
      domains.dailyStats = { version: 1, data: current.data };
      summary.preservedGlobals.push('dailyStats');
      [
        ['days', 'daily_stats_days', ['site', 'hijri_date', 'field_mask'].concat(DS_METRICS, ['meta_json', 'fields_json'])],
        ['months', 'daily_stats_month_locks', ['site', 'hijri_year', 'hijri_month', 'approved', 'reopened', 'legacy_boolean']],
        ['locks', 'daily_stats_day_locks', ['site', 'hijri_year', 'hijri_month', 'hijri_day', 'is_open', 'is_shut']],
      ].forEach(function (spec) {
        readGuards.push.apply(readGuards, rsWitness(env, spec[1], spec[2], current.rows[spec[0]]));
      });
    }
  }
  if (domains.notifications !== undefined) {
    if (scope.kind === 'dept') {
      var normalized = rsBCNF(domains.notifications, { kind: 'dept', departmentId: source });
      domains.notifications = rsBCNF(rsBCRemapNF(normalized, source, target), scope);
    } else domains.notifications = rsBCNF(domains.notifications, scope);
  } else if (legacy) {
    var identity = Object.create(null),
      legacyNF = Object.create(null),
      nativeUsers = rsBCOwn(input, K_USERS) ? input[K_USERS] : reference[K_USERS],
      nativeDepts = rsBCOwn(input, K_DEPTS) ? input[K_DEPTS] : reference[K_DEPTS];
    if (nfKeys.length && (typeof nativeUsers !== 'string' || typeof nativeDepts !== 'string')) rsBCFail('notifications-identity-required');
    identity[K_USERS] = nativeUsers;
    identity[K_DEPTS] = nativeDepts;
    nfKeys.forEach(function (k) {
      var old = scope.kind === 'dept' ? 'bsdept:' + source + ':' + resName(k) : k;
      legacyNF[old] = keys[k];
    });
    Object.keys(identity).forEach(function (k) {
      legacyNF[k] = identity[k];
    });
    // Only explicit department references may be remapped. Plain local payload
    // fields never invent a source department or an account identity.
    if (scope.kind === 'dept' && nfKeys.length) {
      var ds = rsBCParse(identity[K_DEPTS]);
      if (
        !ds.some(function (d) {
          return d && d.id === source;
        })
      )
        rsBCFail('notifications-unknown-source-department');
    }
    var converted = nfKeys.length ? nfLegacyConvert(legacyNF) : rsBCEmptyNF();
    if (scope.kind === 'dept') {
      converted = rsBCRemapNF(converted, source, target);
      domains.notifications = rsBCNF(converted, scope);
      if (!nfKeys.length) summary.emptyDomains.push('notifications:' + target);
    } else {
      var saved = await nfRead(env),
        hasSys = rsBCOwn(input, 'bassam_notif_sys_v1'),
        hasBC = rsBCOwn(input, 'bassam_bc_v1'),
        hasConfig = rsBCOwn(input, 'bassam_notif_cfg_v1');
      Object.keys(NF_TABLES).forEach(function (n) {
        if (n === 'overrides') {
          if (!hasConfig) converted[n] = rsBCClone(saved[n]);
          return;
        }
        var preserved = saved[n].filter(function (r) {
          var s = n === 'states' ? r.message_scope : r.scope;
          return (s === 'sys' && !hasSys) || (s === 'bc' && !hasBC);
        });
        converted[n] = converted[n].concat(rsBCClone(preserved));
      });
      var preservedScopes = [];
      if (!hasSys) preservedScopes.push('sys');
      if (!hasBC) preservedScopes.push('bc');
      Object.keys(NF_TABLES).forEach(function (n) {
        var spec = NF_TABLES[n];
        if (n === 'overrides') {
          if (!hasConfig) readGuards.push.apply(readGuards, rsWitness(env, spec[0], spec[1], saved[n]));
          return;
        }
        if (!preservedScopes.length) return;
        var col = n === 'states' ? 'message_scope' : 'scope',
          rows = saved[n].filter(function (r) {
            return preservedScopes.indexOf(r[col]) >= 0;
          }),
          where =
            col +
            ' IN (' +
            preservedScopes
              .map(function (_, i) {
                return '?' + (i + 1);
              })
              .join(',') +
            ')';
        readGuards.push.apply(readGuards, rsWitness(env, spec[0], spec[1], rows, where, preservedScopes));
      });
      if (!hasSys) summary.preservedGlobals.push('notifications:sys');
      if (!hasBC) summary.preservedGlobals.push('notifications:bc');
      if (!hasConfig) summary.preservedGlobals.push('notifications:config');
      domains.notifications = rsBCNF(converted, scope);
      deptIds.forEach(function (d) {
        if (
          !nfKeys.some(function (k) {
            return parseKey(k).dept === d;
          })
        )
          summary.emptyDomains.push('notifications:' + d);
      });
    }
  }
  cuKeys.concat(nfKeys, dsKeys, irKeys, businessKeys).forEach(function (k) {
    delete keys[k];
  });
  opConvertBackupBoundary(keys,domains,deptIds,scope,source,modern?file.manifest.version:0,summary);
  // Conversion preserves credentials byte-for-byte; applySave/restore retains
  // its existing hash, final-owner and session policy for the eventual commit.
  Object.keys(keys).forEach(function (k) {
    if (!resOf(k)) rsBCFail('unknown-resource');
    if (scope.kind === 'dept' && parseKey(k).dept !== target) rsBCFail('scope');
  });
  var manifest = modern
    ? rsBCClone(file.manifest)
    : {
        version: 1,
        scope: scope.kind,
        domains: scope.kind === 'full' ? { kv: 1, dailyStats: 1, notifications: 1, custody: 1 } : { kv: 1, notifications: 1, custody: 1 },
        departments: deptIds.slice(),
        keys: Object.keys(keys).map(function (k) {
          return scope.kind === 'dept' ? resName(k) : k;
        }),
      };
  if (modern && scope.kind === 'dept') {
    manifest.departments = [target];
    manifest.keys = Object.keys(keys).map(resName);
  }
  // A v1 source is validated before conversion. The compiled destination always
  // declares the complete typed Irshad domain; v2 never receives empty fallbacks.
  manifest.version = 4;
  manifest.domains.irshad = 1;
  manifest.domains.seized = 1;
  manifest.domains.awards = 1;
  manifest.domains.operations = 1;
  manifest.keys = Object.keys(keys).map(function (k) { return scope.kind === 'dept' ? resName(k) : k; });
  rsBCManifest(manifest, scope, keys, domains, deptIds);
  var result = { keys: keys, domains: domains, manifest: manifest, summary: summary, readGuards: readGuards, images: file.idbImages || {} };
  if (file.perms !== undefined) result.permissionSlice = rsBCClone(file.perms);
  return result;
}
