/* Typed Irshad business domain. Plans never commit or allocate revisions. */
var IR_RES = ['bassam_irshad_v1', 'bassam_irshad_langs_v1', 'bassam_irshad_locs_v1', 'bassam_irshad_retro_v1'];
var IR_RES_NAMES = ['reports', 'languages', 'locations', 'retro'];
var IR_REQUEST_COLS = ['department_id', 'account_uid', 'request_id', 'fingerprint', 'resource_key', 'resource_rev', 'operation', 'result_n', 'result_id', 'created_at'];
var IR_FIELDS = [
  ['id', 'report_id', 'text'],
  ['y', 'hijri_year', 'number'],
  ['m', 'hijri_month', 'number'],
  ['d', 'hijri_day', 'number'],
  ['ts', 'created_at', 'number'],
  ['shift', 'shift', 'text'],
  ['eid', 'employee_key', 'text'],
  ['name', 'employee_name', 'text'],
  ['loc', 'location', 'text'],
  ['actor', 'actor_label', 'text'],
  ['bro', 'brochures', 'number'],
  ['pros', 'prosecution', 'number'],
  ['pol', 'police', 'number'],
  ['editedTs', 'edited_at', 'number'],
  ['editedBy', 'edited_by', 'text'],
  // Existing supported legacy probe fields; preserve their exact field names
  // and values. Do not reinterpret n/lang as current language beneficiaries.
  ['lang', 'legacy_language', 'text'],
  ['n', 'legacy_count', 'number'],
  ['by', 'legacy_author', 'text'],
  ['test', 'test_marker', 'text'],
];
var IR_LANG_BIT = Math.pow(2, IR_FIELDS.length);
var IR_WIN_FIELDS = [
  ['id', 'window_id', 'text'],
  ['at', 'opened_at', 'number'],
  ['until', 'until_at', 'number'],
  ['hours', 'hours', 'number'],
  ['reason', 'reason', 'text'],
  ['reasonMissing', 'reason_missing', 'boolean'],
  ['closedAt', 'closed_at', 'number'],
];
var IR_SCOPE_FIELDS = [
  ['y', 'hijri_year', 'number'],
  ['m', 'hijri_month', 'number'],
  ['d', 'hijri_day', 'number'],
];
var IR_BY_FIELDS = [
  ['id', 'by_id', 'text'],
  ['un', 'by_username', 'text'],
  ['ekey', 'by_employee_key', 'text'],
  ['name', 'by_name', 'text'],
];
var IR_CLOSED_FIELDS = [
  ['id', 'closed_by_id', 'text'],
  ['un', 'closed_by_username', 'text'],
  ['ekey', 'closed_by_employee_key', 'text'],
];
var IR_TABLES = {
  reports: [
    'irshad_reports',
    ['department_id', 'sequence'].concat(
      IR_FIELDS.map(function (f) {
        return f[1];
      }),
      ['presence_mask', 'languages_null'],
    ),
  ],
  languages: [
    'irshad_report_languages',
    ['department_id', 'report_id', 'position', 'language', 'count', 'presence_mask'],
  ],
  catalogs: ['irshad_catalog_entries', ['department_id', 'kind', 'position', 'value']],
  windows: [
    'irshad_retro_windows',
    ['department_id', 'sequence'].concat(
      IR_WIN_FIELDS.map(function (f) {
        return f[1];
      }),
      IR_SCOPE_FIELDS.map(function (f) {
        return f[1];
      }),
      ['scope_mask'],
      IR_BY_FIELDS.map(function (f) {
        return f[1];
      }),
      IR_CLOSED_FIELDS.map(function (f) {
        return f[1];
      }),
      ['presence_mask', 'by_kind', 'by_mask', 'closed_by_kind', 'closed_by_mask'],
    ),
  ],
};
function irError(code, status, path) {
  var e = new Error(code);
  e.irCode = code;
  e.irStatus = status || 400;
  if (path) e.irPath = path;
  return e;
}
function irOwn(o, k) {
  return Object.prototype.hasOwnProperty.call(o, k);
}
function irShape(o, allowed, path) {
  if (
    !isObj(o) ||
    Object.keys(o).some(function (k) {
      return allowed.indexOf(k) < 0;
    })
  )
    throw irError('irshad-shape', 400, path);
}
function irText(v, path) {
  if (typeof v !== 'string') throw irError('irshad-text', 400, path);
  return v;
}
function irKey(d, i) {
  return 'bsdept:' + d + ':' + IR_RES[i || 0];
}
function irMetaKey(d) {
  return 'irshad:' + d + ':presence';
}
function irLegacyKey(k) {
  return IR_RES.indexOf(resName(k)) >= 0;
}
function irLegacyPredicate() {
  /* Include malformed suffixes so a cutover cannot stamp success while an
     ambiguous known resource remains outside its canonical department key. */
  return 'k IN(SELECT value FROM json_each(?1))' + IR_RES.map(function (name) {
    return " OR k GLOB 'bsdept:*:" + name + "' OR k GLOB 'bsdept:*:" + name + ":*' OR k GLOB '" + name + ":*'";
  }).join('');
}
function irScalar(v, type, path) {
  if (v === null) return null;
  if (type === 'number' && (typeof v !== 'number' || !Number.isFinite(v))) throw irError('irshad-number', 400, path);
  if (type === 'text') irText(v, path);
  if (type === 'boolean' && typeof v !== 'boolean') throw irError('irshad-boolean', 400, path);
  return type === 'boolean' ? (v ? 1 : 0) : v;
}
function irEncodeFields(value, fields, row, path) {
  var mask = 0;
  fields.forEach(function (f, i) {
    row[f[1]] = null;
    if (irOwn(value, f[0])) {
      mask += Math.pow(2, i);
      row[f[1]] = irScalar(value[f[0]], f[2], path + '.' + f[0]);
    }
  });
  return mask;
}
function irDecodeFields(row, fields, mask) {
  var out = {};
  fields.forEach(function (f, i) {
    if (mask & Math.pow(2, i)) out[f[0]] = row[f[1]] === null ? null : f[2] === 'boolean' ? !!row[f[1]] : row[f[1]];
  });
  return out;
}
function irEncodePerson(value, fields, row, prefix, path) {
  if (value === undefined) {
    fields.forEach(function (f) {
      row[f[1]] = null;
    });
    row[prefix + '_kind'] = 0;
    row[prefix + '_mask'] = 0;
    return;
  }
  if (value === null) {
    fields.forEach(function (f) {
      row[f[1]] = null;
    });
    row[prefix + '_kind'] = 1;
    row[prefix + '_mask'] = 0;
    return;
  }
  irShape(
    value,
    fields.map(function (f) {
      return f[0];
    }),
    path,
  );
  row[prefix + '_kind'] = 2;
  row[prefix + '_mask'] = irEncodeFields(value, fields, row, path);
}
function irEmptyDomain(d) {
  return {
    version: 1,
    scope: { departmentId: d },
    resources: {
      reports: false,
      languages: false,
      locations: false,
      retro: false,
      retroVersionPresent: false,
      retroVersion: null,
      retroWindowsPresent: false,
    },
    rows: { reports: [], languages: [], catalogs: [], windows: [] },
  };
}
function irConvert(d, docs) {
  irText(d, 'scope');
  if (!d || d.indexOf(':') >= 0) throw irError('irshad-scope');
  irShape(docs, ['reports', 'languages', 'locations', 'retro'], 'resources');
  var out = irEmptyDomain(d),
    seen = new Set();
  if (irOwn(docs, 'reports')) {
    irShape(docs.reports, ['reports'], 'reports');
    if (!Array.isArray(docs.reports.reports)) throw irError('irshad-reports-shape');
    out.resources.reports = true;
    docs.reports.reports.forEach(function (r, sequence) {
      irShape(
        r,
        IR_FIELDS.map(function (f) {
          return f[0];
        }).concat(['langs']),
        'reports[' + sequence + ']',
      );
      if (typeof r.id !== 'string' || seen.has(r.id))
        throw irError('irshad-report-identity', 400, 'reports[' + sequence + '].id');
      seen.add(r.id);
      var row = { department_id: d, sequence: sequence, languages_null: 0 };
      row.presence_mask = irEncodeFields(r, IR_FIELDS, row, 'reports[' + sequence + ']');
      if (irOwn(r, 'langs')) {
        row.presence_mask += IR_LANG_BIT;
        if (r.langs === null) row.languages_null = 1;
        else {
          if (!Array.isArray(r.langs)) throw irError('irshad-languages-shape');
          r.langs.forEach(function (l, position) {
            irShape(l, ['lang', 'count'], 'reports[' + sequence + '].langs[' + position + ']');
            var lr = { department_id: d, report_id: r.id, position: position };
            lr.presence_mask = irEncodeFields(
              l,
              [
                ['lang', 'language', 'text'],
                ['count', 'count', 'number'],
              ],
              lr,
              'reports[' + sequence + '].langs[' + position + ']',
            );
            out.rows.languages.push(lr);
          });
        }
      }
      out.rows.reports.push(row);
    });
  }
  ['languages', 'locations'].forEach(function (kind) {
    if (!irOwn(docs, kind)) return;
    var list = docs[kind];
    if (!Array.isArray(list)) throw irError('irshad-catalog-shape');
    out.resources[kind] = true;
    list.forEach(function (value, position) {
      out.rows.catalogs.push({
        department_id: d,
        kind: kind,
        position: position,
        value: irText(value, kind + '[' + position + ']'),
      });
    });
  });
  if (irOwn(docs, 'retro')) {
    irShape(docs.retro, ['v', 'windows'], 'retro');
    out.resources.retro = true;
    out.resources.retroVersionPresent = irOwn(docs.retro, 'v');
    out.resources.retroVersion = out.resources.retroVersionPresent ? irScalar(docs.retro.v, 'number', 'retro.v') : null;
    out.resources.retroWindowsPresent = irOwn(docs.retro, 'windows');
    var wins = out.resources.retroWindowsPresent ? docs.retro.windows : [];
    if (!Array.isArray(wins)) throw irError('irshad-retro-shape');
    var ids = new Set();
    wins.forEach(function (w, sequence) {
      irShape(
        w,
        IR_WIN_FIELDS.map(function (f) {
          return f[0];
        }).concat(['scope', 'by', 'closedBy']),
        'retro.windows[' + sequence + ']',
      );
      if (typeof w.id !== 'string' || ids.has(w.id)) throw irError('irshad-retro-identity');
      ids.add(w.id);
      irShape(w.scope, ['y', 'm', 'd'], 'retro.scope');
      var row = { department_id: d, sequence: sequence };
      row.presence_mask = irEncodeFields(w, IR_WIN_FIELDS, row, 'retro.windows[' + sequence + ']');
      row.scope_mask = irEncodeFields(w.scope, IR_SCOPE_FIELDS, row, 'retro.scope');
      irEncodePerson(w.by, IR_BY_FIELDS, row, 'by', 'retro.by');
      irEncodePerson(w.closedBy, IR_CLOSED_FIELDS, row, 'closed_by', 'retro.closedBy');
      out.rows.windows.push(row);
    });
  }
  return out;
}
function irInflate(domain) {
  var docs = {},
    rows = domain.rows,
    flags = domain.resources;
  if (flags.reports) {
    docs.reports = {
      reports: rows.reports
        .slice()
        .sort(function (a, b) {
          return a.sequence - b.sequence;
        })
        .map(function (r) {
          var v = irDecodeFields(r, IR_FIELDS, r.presence_mask);
          if (r.presence_mask & IR_LANG_BIT)
            v.langs = r.languages_null
              ? null
              : rows.languages
                  .filter(function (l) {
                    return l.report_id === r.report_id;
                  })
                  .sort(function (a, b) {
                    return a.position - b.position;
                  })
                  .map(function (l) {
                    return irDecodeFields(
                      l,
                      [
                        ['lang', 'language', 'text'],
                        ['count', 'count', 'number'],
                      ],
                      l.presence_mask,
                    );
                  });
          return v;
        }),
    };
  }
  ['languages', 'locations'].forEach(function (kind) {
    if (flags[kind])
      docs[kind] = rows.catalogs
        .filter(function (r) {
          return r.kind === kind;
        })
        .sort(function (a, b) {
          return a.position - b.position;
        })
        .map(function (r) {
          return r.value;
        });
  });
  if (flags.retro) {
    var retro = {};
    if (flags.retroVersionPresent) retro.v = flags.retroVersion;
    if (flags.retroWindowsPresent)
      retro.windows = rows.windows
        .slice()
        .sort(function (a, b) {
          return a.sequence - b.sequence;
        })
        .map(function (r) {
          var w = irDecodeFields(r, IR_WIN_FIELDS, r.presence_mask);
          w.scope = irDecodeFields(r, IR_SCOPE_FIELDS, r.scope_mask);
          if (r.by_kind) w.by = r.by_kind === 1 ? null : irDecodeFields(r, IR_BY_FIELDS, r.by_mask);
          if (r.closed_by_kind)
            w.closedBy = r.closed_by_kind === 1 ? null : irDecodeFields(r, IR_CLOSED_FIELDS, r.closed_by_mask);
          return w;
        });
    docs.retro = retro;
  }
  return docs;
}
function irFlags(flags) {
  return (
    (flags.reports ? 1 : 0) +
    (flags.languages ? 2 : 0) +
    (flags.locations ? 4 : 0) +
    (flags.retro ? 8 : 0) +
    (flags.retroVersionPresent ? 16 : 0) +
    (flags.retroWindowsPresent ? 32 : 0)
  );
}
function irMetaStatements(env, domain) {
  var key = irMetaKey(domain.scope.departmentId),
    st = [
      env.DB.prepare('INSERT INTO meta(k,v)VALUES(?1,?2) ON CONFLICT(k)DO UPDATE SET v=excluded.v').bind(
        key,
        String(irFlags(domain.resources)),
      ),
    ];
  st.push(env.DB.prepare('DELETE FROM meta WHERE k=?1').bind(key + ':retro-version'));
  if (domain.resources.retroVersionPresent)
    st.push(
      env.DB.prepare('INSERT INTO meta(k,v)VALUES(?1,?2)').bind(
        key + ':retro-version',
        JSON.stringify(domain.resources.retroVersion),
      ),
    );
  return st;
}
function irValidateDomain(domain, d) {
  irShape(domain, ['version', 'scope', 'resources', 'rows'], 'domain');
  irShape(domain.scope, ['departmentId'], 'domain.scope');
  if (domain.version !== 1 || domain.scope.departmentId !== d) throw irError('irshad-domain-scope');
  irShape(
    domain.resources,
    ['reports', 'languages', 'locations', 'retro', 'retroVersionPresent', 'retroVersion', 'retroWindowsPresent'],
    'domain.resources',
  );
  irShape(domain.rows, Object.keys(IR_TABLES), 'domain.rows');
  for (var kind in IR_TABLES) {
    if (!Array.isArray(domain.rows[kind])) throw irError('irshad-domain-rows');
    var cols = IR_TABLES[kind][1];
    domain.rows[kind].forEach(function (r) {
      irShape(r, cols, 'domain.rows.' + kind);
      if (
        r.department_id !== d ||
        cols.some(function (c) {
          return !irOwn(r, c);
        })
      )
        throw irError('irshad-domain-row');
    });
  }
  // Row deletion leaves stable sequence gaps. Validate their exact values rather
  // than compacting unrelated history as though it were a new legacy array.
  var sequences = {};
  ['reports', 'windows'].forEach(function (kind) {
    var seen = new Set(), ids = new Map(), idColumn = kind === 'reports' ? 'report_id' : 'window_id';
    domain.rows[kind].forEach(function (row) {
      if (!Number.isSafeInteger(row.sequence) || row.sequence < 0 || seen.has(row.sequence))
        throw irError('irshad-domain-sequence');
      seen.add(row.sequence); ids.set(row[idColumn], row.sequence);
    });
    sequences[kind] = ids;
  });
  var canonical = irConvert(d, irInflate(domain));
  ['reports', 'windows'].forEach(function (kind) {
    var idColumn = kind === 'reports' ? 'report_id' : 'window_id';
    canonical.rows[kind].forEach(function (row) { row.sequence = sequences[kind].get(row[idColumn]); });
  });
  function comparable(value) {
    var x = cuCanonical(value);
    Object.keys(IR_TABLES).forEach(function (k) {
      x.rows[k].sort(function (a, b) {
        return JSON.stringify(a).localeCompare(JSON.stringify(b));
      });
    });
    return x;
  }
  if (!deq(comparable(canonical), comparable(domain))) throw irError('irshad-domain-invalid');
  return canonical;
}
function irSnapshotStatements(env, d) {
  var statements = Object.keys(IR_TABLES).map(function (k) {
    return env.DB.prepare('SELECT * FROM ' + IR_TABLES[k][0] + ' WHERE department_id=?1').bind(d);
  });
  statements.push(
    env.DB.prepare('SELECT k,v FROM meta WHERE k=?1 OR k=?2').bind(irMetaKey(d), irMetaKey(d) + ':retro-version'),
  );
  return statements;
}
function irSnapshotResult(result, d) {
  var domain = irEmptyDomain(d);
  Object.keys(IR_TABLES).forEach(function (k, i) {
    domain.rows[k] = result[i].results || [];
  });
  var meta = {};
  (result[4].results || []).forEach(function (r) {
    meta[r.k] = r.v;
  });
  var mask = Number(meta[irMetaKey(d)] || 0);
  if (!Number.isSafeInteger(mask) || mask < 0 || mask > 63) throw irError('irshad-presence-invalid', 503);
  if (irOwn(meta, irMetaKey(d) + ':retro-version') !== !!(mask & 16)) throw irError('irshad-presence-invalid', 503);
  domain.resources = {
    reports: !!(mask & 1),
    languages: !!(mask & 2),
    locations: !!(mask & 4),
    retro: !!(mask & 8),
    retroVersionPresent: !!(mask & 16),
    retroVersion: mask & 16 ? parseJson(meta[irMetaKey(d) + ':retro-version'], null) : null,
    retroWindowsPresent: !!(mask & 32),
  };
  return domain;
}
async function irSnapshot(env, d) {
  return irSnapshotResult(await env.DB.batch(irSnapshotStatements(env, d)), d);
}
async function irLegacyPresent(env) {
  return !!(await env.DB.prepare(
    'SELECT 1 FROM kv WHERE ' + irLegacyPredicate() + ' LIMIT 1',
  )
    .bind(JSON.stringify(IR_RES))
    .first());
}
function irInstallStatements(env, domain) {
  var st = [];
  Object.keys(IR_TABLES).forEach(function (k) {
    st.push.apply(st, rsBulk(env, IR_TABLES[k][0], IR_TABLES[k][1], domain.rows[k]));
  });
  return st.concat(irMetaStatements(env, domain));
}
async function irLegacyPrepare(env) {
  var predicate = irLegacyPredicate(),
    args = [JSON.stringify(IR_RES)],
    rows =
      (
        await env.DB.prepare('SELECT k,seq,v FROM kv WHERE ' + predicate + ' ORDER BY k,seq')
          .bind(args[0])
          .all()
      ).results || [];
  var departmentRows = (await env.DB.prepare('SELECT k,seq,v FROM kv WHERE k=?1 ORDER BY seq').bind(K_DEPTS).all()).results || [],
    departments = parseJson(kvJoin(departmentRows)[K_DEPTS] || '[]', null), known = new Set();
  if (!Array.isArray(departments)) throw irError('irshad-cutover-departments');
  departmentRows.forEach(function (r, i) {
    if (r.seq !== i || typeof r.v !== 'string') throw irError('irshad-cutover-departments');
  });
  departments.forEach(function (d) {
    if (!isObj(d) || typeof d.id !== 'string' || !d.id || d.id.indexOf(':') >= 0 || known.has(d.id))
      throw irError('irshad-cutover-departments');
    known.add(d.id);
  });
  var grouped = new Map(),
    docs = new Map();
  rows.forEach(function (r) {
    var p = parseKey(r.k), resource = IR_RES.indexOf(resName(r.k));
    if (!p.dept || resource < 0 || r.k !== irKey(p.dept, resource)) throw irError('irshad-cutover-scope-unknown');
    if (!known.has(p.dept)) throw irError('irshad-cutover-department-unregistered');
    var list = grouped.get(r.k) || [];
    if (r.seq !== list.length || typeof r.v !== 'string') throw irError('irshad-cutover-chunks');
    list.push(r);
    grouped.set(r.k, list);
  });
  grouped.forEach(function (list, key) {
    var v;
    try {
      v = JSON.parse(
        list
          .map(function (r) {
            return r.v;
          })
          .join(''),
      );
    } catch (e) {
      throw irError('irshad-cutover-json');
    }
    var d = parseKey(key).dept,
      obj = docs.get(d) || {};
    obj[['reports', 'languages', 'locations', 'retro'][IR_RES.indexOf(resName(key))]] = v;
    docs.set(d, obj);
  });
  var domains = [];
  docs.forEach(function (doc, d) {
    domains.push(irConvert(d, doc));
  });
  var names = Object.keys(IR_TABLES)
      .map(function (k) {
        return IR_TABLES[k][0];
      })
      .concat(['irshad_requests']),
    existing =
      (
        await env.DB.prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name IN(SELECT value FROM json_each(?1))",
        )
          .bind(JSON.stringify(names))
          .all()
      ).results || [];
  for (var t of existing)
    if (await env.DB.prepare('SELECT 1 FROM ' + t.name + ' LIMIT 1').first())
      throw irError('irshad-cutover-target-not-empty');
  var metadata = (await env.DB.prepare("SELECT k,v FROM meta WHERE k GLOB 'irshad:*:presence*'").all()).results || [];
  if (metadata.length) throw irError('irshad-cutover-target-not-empty');
  var before = rsWitness(env, 'kv', ['k', 'seq', 'v'], rows, predicate, args);
  before.push.apply(before, rsWitness(env, 'kv', ['k', 'seq', 'v'], departmentRows, 'k=?1', [K_DEPTS]));
  before.push(
    env.DB.prepare(
      "INSERT INTO meta(k,v)VALUES('ir_cutover_ready','validated') ON CONFLICT(k)DO UPDATE SET v=excluded.v",
    ),
  );
  var after = [
    env.DB.prepare(
      'SELECT CASE WHEN EXISTS(' +
        names
          .map(function (n) {
            return 'SELECT 1 FROM ' + n;
          })
          .join(' UNION ALL ') +
        " LIMIT 1) OR EXISTS(SELECT 1 FROM meta WHERE k GLOB 'irshad:*:presence*') THEN json_extract('{}','KIVO_IRSHAD_TARGET_CHANGED') END",
    ),
  ];
  domains.forEach(function (domain) {
    after.push.apply(after, irInstallStatements(env, domain));
  });
  after.push(env.DB.prepare('DELETE FROM kv WHERE ' + predicate).bind(args[0]));
  // Keep per-resource revisions exactly; only the global revision moves above all
  // legacy resource revisions. The shared compiler owns future mutation stamps.
  if (rows.length)
    after.push(
      env.DB.prepare(
        "INSERT INTO meta(k,v)VALUES('rev',CAST((SELECT MAX(n)+1 FROM(SELECT COALESCE(MAX(rev),0) n FROM revs UNION ALL SELECT COALESCE(CAST(v AS INTEGER),0) FROM meta WHERE k='rev')) AS TEXT)) ON CONFLICT(k)DO UPDATE SET v=excluded.v",
      ),
    );
  return {
    before: before,
    after: after,
    domains: domains,
    n: domains.reduce(function (n, d) {
      return n + d.rows.reports.length;
    }, 0),
  };
}

async function irGuardRetired(env) {
  if (await irLegacyPresent(env)) throw irError('irshad-legacy-source-present', 503);
}
function irRetiredGuard(env) {
  return env.DB.prepare('SELECT CASE WHEN EXISTS(SELECT 1 FROM kv WHERE ' + irLegacyPredicate() +
    ") THEN json_extract('{}','KIVO_IRSHAD_LEGACY_SOURCE') END").bind(JSON.stringify(IR_RES));
}
function irRevisionRowsStatement(env, d) {
  return env.DB.prepare('SELECT k,rev FROM revs WHERE k IN(SELECT value FROM json_each(?1))')
    .bind(JSON.stringify(IR_RES.map(function (_, i) { return irKey(d, i); })));
}
function irRevisionResult(rows, d) {
  var out = {};
  IR_RES_NAMES.forEach(function (name, i) {
    var row = rows.find(function (r) { return r.k === irKey(d, i); }), value = row ? row.rev : 0;
    if (!Number.isSafeInteger(value) || value < 0) throw irError('irshad-revision-invalid', 503);
    out[name] = value;
  });
  return out;
}
async function irRevs(env, d) {
  return irRevisionResult((await irRevisionRowsStatement(env, d).all()).results || [], d);
}
function irRevisionGuards(env, d, base, resources) {
  resources = resources || IR_RES_NAMES;
  if (!isObj(base) || !Array.isArray(resources) || !resources.length || new Set(resources).size !== resources.length)
    throw irError('irshad-base');
  var pairs = resources.map(function (name) {
    var i = IR_RES_NAMES.indexOf(name);
    if (i < 0 || !Number.isSafeInteger(base[name]) || base[name] < 0) throw irError('irshad-base');
    return { k: irKey(d, i), rev: base[name] };
  });
  return [env.DB.prepare("SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(?1) j WHERE COALESCE((SELECT rev FROM revs WHERE k=json_extract(j.value,'$.k')),0)<>json_extract(j.value,'$.rev')) THEN json_extract('{}','KIVO_REV_CONFLICT') END")
    .bind(JSON.stringify(pairs))];
}
function irMarkResourceStatements(env, d, resource) {
  var i = IR_RES_NAMES.indexOf(resource);
  if (i < 0) throw irError('irshad-resource');
  // Routine writes must preserve presence bits of independently edited resources.
  var mask = i === 3 ? 56 : Math.pow(2, i), expression = i === 3
    ? 'CASE WHEN (CAST(meta.v AS INTEGER)&8)=0 THEN (CAST(meta.v AS INTEGER)|56) ELSE (CAST(meta.v AS INTEGER)|40) END'
    : '(CAST(meta.v AS INTEGER)|CAST(excluded.v AS INTEGER))', st = [env.DB.prepare(
      'INSERT INTO meta(k,v)VALUES(?1,?2) ON CONFLICT(k)DO UPDATE SET v=CAST(' + expression + ' AS TEXT)',
    ).bind(irMetaKey(d), String(mask))];
  if (i === 3) st.push(env.DB.prepare('INSERT INTO meta(k,v) SELECT ?1,?2 WHERE (CAST((SELECT v FROM meta WHERE k=?3) AS INTEGER)&16)<>0 ON CONFLICT(k)DO NOTHING')
    .bind(irMetaKey(d) + ':retro-version', '1', irMetaKey(d)));
  return st;
}
async function irPlanState(env, d) {
  var statements = irSnapshotStatements(env, d);
  statements.push(env.DB.prepare('SELECT * FROM irshad_requests WHERE department_id=?1').bind(d));
  statements.push(irRevisionRowsStatement(env, d));
  var result = await env.DB.batch(statements), domain = irValidateDomain(irSnapshotResult(result, d), d),
    snapshots = Object.assign({}, domain.rows, { meta: result[4].results || [], requests: result[5].results || [] }),
    revs = irRevisionResult(result[6].results || [], d);
  return { domain: domain, snapshotRows: snapshots, revs: revs };
}
async function irReplacementPlan(env, d, domain, base) {
  await irGuardRetired(env);
  var before = await irPlanState(env, d), guards = [irRetiredGuard(env)].concat(irRevisionGuards(env, d, base));
  if (!deq(cuCanonical(before.revs), cuCanonical(base))) throw irError('irshad-conflict', 409);
  Object.keys(IR_TABLES).forEach(function (kind) {
    guards.push.apply(guards, rsWitness(env, IR_TABLES[kind][0], IR_TABLES[kind][1], before.snapshotRows[kind], 'department_id=?1', [d]));
  });
  guards.push.apply(guards, rsWitness(env, 'meta', ['k', 'v'], before.snapshotRows.meta, 'k=?1 OR k=?2', [irMetaKey(d), irMetaKey(d) + ':retro-version']));
  guards.push.apply(guards, rsWitness(env, 'irshad_requests', IR_REQUEST_COLS, before.snapshotRows.requests, 'department_id=?1', [d]));
  var statements = ['irshad_requests', 'irshad_report_languages', 'irshad_reports', 'irshad_catalog_entries', 'irshad_retro_windows']
    .map(function (table) { return env.DB.prepare('DELETE FROM ' + table + ' WHERE department_id=?1').bind(d); });
  statements.push.apply(statements, irInstallStatements(env, domain));
  return {
    guards: guards, statements: statements, revisionKeys: IR_RES.map(function (_, i) { return irKey(d, i); }),
    snapshotRows: before.snapshotRows, count: domain.rows.reports.length + domain.rows.catalogs.length + domain.rows.windows.length,
    changed: !deq(cuCanonical(before.domain), cuCanonical(domain)) || before.snapshotRows.requests.length > 0,
    metadata: { departmentId: d },
  };
}
async function irPlanRestore(env, A, domain, opt) {
  irShape(opt, ['dept', 'base', 'scope', 'mode', 'reason', 'finalKeys'], 'restore');
  if (opt.mode !== 'replace' || !['full', 'dept'].includes(opt.scope)) throw irError('irshad-restore-mode');
  irShape(opt.base, IR_RES_NAMES, 'restore.base');
  await cuRestorePermission(A, opt.dept, opt);
  return irReplacementPlan(env, opt.dept, irValidateDomain(domain, opt.dept), opt.base);
}
async function irPlanWipe(env, A, opt) {
  irShape(opt, ['dept', 'base', 'intent', 'reason', 'finalKeys'], 'wipe');
  if (!A || !A.u || A.u.role !== 'super' || !['dept-wipe', 'dept-delete'].includes(opt.intent)) throw irError('irshad-wipe-permission', 403);
  irShape(opt.base, IR_RES_NAMES, 'wipe.base');
  var plan = await irReplacementPlan(env, opt.dept, irValidateDomain(irEmptyDomain(opt.dept), opt.dept), opt.base);
  if (opt.intent === 'dept-delete') {
    plan.changed = plan.changed || plan.snapshotRows.meta.length > 0;
    plan.statements.push(env.DB.prepare('DELETE FROM meta WHERE k=?1 OR k=?2')
      .bind(irMetaKey(opt.dept), irMetaKey(opt.dept) + ':retro-version'));
  }
  return plan;
}
async function irExport(env, A, url) {
  var d = url.searchParams.get('dept') || '', uid = A && A.u && A.u.id;
  if (typeof uid !== 'string') throw irError('irshad-export-permission', 403);
  await irGuardRetired(env);
  for (var attempt = 0; attempt < 3; attempt++) {
    var revRow = await env.DB.prepare("SELECT v FROM meta WHERE k='rev'").first(), rev = Number(revRow && revRow.v) || 0,
      authorityGuards = [], contexts = [], known;
    if (!d) {
      // Full export may have zero departments. Capture its principal and registry
      // independently, then fence their raw bytes in the same read transaction.
      var keys = [K_USERS, K_PERM, K_DEPTS, K_GDEPTS, K_PLAT], predicate = 'k IN(SELECT value FROM json_each(?1))',
        rows = (await env.DB.prepare('SELECT k,seq,v FROM kv WHERE ' + predicate + ' ORDER BY k,seq').bind(JSON.stringify(keys)).all()).results || [],
        raw = kvJoin(rows), fresh = actorFromKeys(raw, uid), chunks = {};
      rows.forEach(function (row) {
        var next = chunks[row.k] || 0;
        if (row.seq !== next || typeof row.v !== 'string') throw irError('irshad-reference-chunks', 503);
        chunks[row.k] = next + 1;
      });
      if (!fresh || fresh.u.role !== 'super') throw irError('irshad-export-permission', 403);
      known = fresh.depts;
      authorityGuards.push.apply(authorityGuards, rsWitness(env, 'kv', ['k', 'seq', 'v'], rows, predicate, [JSON.stringify(keys)]));
    } else {
      var context = await irQueryContext(env, { u: { id: uid } }, d, { write: true });
      known = context.A.depts; contexts.push(context);
    }
    if (!Array.isArray(known)) throw irError('irshad-export-departments');
    if (known.some(function (x) { return !isObj(x) || typeof x.id !== 'string' || !x.id || x.id.indexOf(':') >= 0; }) ||
        new Set(known.map(function (x) { return x.id; })).size !== known.length ||
        (d && !known.some(function (x) { return x.id === d; }))) throw irError('irshad-export-departments');
    var depts = d ? [d] : known.map(function (x) { return x.id; }).sort(),
      statements = [irRetiredGuard(env), env.DB.prepare("SELECT v FROM meta WHERE k='rev'")], offsets = [];
    if (!d) for (var dept of depts) contexts.push(await irQueryContext(env, { u: { id: uid } }, dept, { write: true }));
    contexts.forEach(function (ctx) {
      var actor = ctx.A;
      if ((!d && actor.u.role !== 'super') || !canRead(actor, irKey(ctx.d)) || !deptInScope(actor, ctx.d) ||
          (actor.u.role !== 'super' && (actor.enf ? !enfHeld(actor, ctx.d, 'backup.view') : !actsHeldOn(actor, ctx.d, 'admin/backup', ['view']))))
        throw irError('irshad-export-permission', 403);
      authorityGuards.push.apply(authorityGuards, ctx.guards);
    });
    var registered = known.map(function (x) { return x.id; }), orphanSql = Object.keys(IR_TABLES).map(function (kind) {
      return 'SELECT department_id AS d FROM ' + IR_TABLES[kind][0];
    }).concat(["SELECT substr(k,8,length(k)-16) AS d FROM meta WHERE k GLOB 'irshad:*:presence'"]).join(' UNION ');
    statements.push(env.DB.prepare("SELECT CASE WHEN EXISTS(SELECT 1 FROM (" + orphanSql +
      ") o WHERE o.d IS NULL OR NOT EXISTS(SELECT 1 FROM json_each(?1) j WHERE j.value IS o.d)) THEN json_extract('{}','KIVO_IRSHAD_ORPHAN_SCOPE') END")
      .bind(JSON.stringify(registered)));
    statements.push.apply(statements, authorityGuards);
    depts.forEach(function (dept) { offsets.push(statements.length); statements.push.apply(statements, irSnapshotStatements(env, dept)); });
    var result;
    try { result = await env.DB.batch(statements); }
    catch (error) {
      if (/KIVO_RESTORE_TARGET/.test(String(error))) throw irError('irshad-export-race', 409);
      throw error;
    }
    var actual = Number((result[1].results[0] || {}).v) || 0;
    if (actual !== rev) continue;
    return { ok: 1, rev: actual, globalRev: actual, domains: depts.map(function (dept, i) {
      return irValidateDomain(irSnapshotResult(result.slice(offsets[i], offsets[i] + 5), dept), dept);
    }) };
  }
  throw irError('irshad-export-race', 409);
}
