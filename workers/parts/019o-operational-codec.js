/* Fixed relational shapes for operational resources. These descriptors contain
   server constants, never user-selected SQL identifiers. JSON exists only at
   the transport/policy boundary; every persisted business field has a column. */
function ocScalar(type) {
  if (['text', 'number', 'boolean', 'scalar'].indexOf(type) < 0) throw ocError('scalar-definition');
  return { kind: 'scalar', type: type };
}
function ocObject(table, fields) { return { kind: 'object', table: table, fields: fields }; }
function ocTuple(table, slots) { return { kind: 'tuple', table: table, slots: slots }; }
function ocArray(table, entry) { return { kind: 'array', table: table, entry: entry }; }
function ocMap(table, entry, options) { return Object.assign({ kind: 'map', table: table, entry: entry }, options || {}); }
function ocUnion(table, choices) { return { kind: 'union', table: table, choices: choices }; }
function ocError(code) { var e = new Error('operations-' + code); e.ocCode = 'operations-' + code; return e; }
function ocOwn(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
function ocObj(o) { return o !== null && typeof o === 'object' && !Array.isArray(o) && Object.prototype.toString.call(o) === '[object Object]'; }
function ocSet(o, k, v) { Object.defineProperty(o, k, { value: v, enumerable: true, configurable: true, writable: true }); }
function ocIdentifier(s) { if (typeof s !== 'string' || !/^[a-z][a-z0-9_]*$/.test(s)) throw ocError('sql-identifier'); return s; }
function ocField(k) {
  if (!/^[A-Za-z0-9_]+$/.test(k)) throw ocError('field-definition');
  // SQLite identifiers ignore case; cAt and cat are distinct business fields.
  // Escape underscores too, so a literal escape-looking key cannot collide.
  return 'f_' + k.replace(/[_A-Z]/g,function(c){return c==='_'?'__':'_u'+c.charCodeAt(0).toString(16)+'_';});
}
var OC_BASE_COLUMNS = ['department_id', 'resource', 'row_key', 'parent_key', 'member_key', 'position', 'node_kind', 'variant', 'tuple_length', 'value_kind', 'value_text', 'value_number'];
var OC_NODE_COLUMNS = ['department_id', 'resource', 'row_key', 'parent_key', 'member_key', 'position', 'node_kind', 'variant', 'tuple_length', 'schema_id', 'entity_kind'];
function ocSignature(node) {
  var fields = ocFields(node);
  return JSON.stringify([node.kind, node.type || '', Object.keys(fields).sort().map(function (key) { return [key, ocSignature(fields[key])]; }),
    node.entry ? ocSignature(node.entry) : '', (node.patterns || []).map(function (p) { return [p.pattern, ocSignature(p.schema)]; }),
    (node.choices || []).map(ocSignature)]);
}
function ocFields(node) {
  if (node.kind === 'object') return node.fields || {};
  if (node.kind === 'tuple') { var out = {}; (node.slots || []).forEach(function (s, i) { out[String(i)] = s; }); return out; }
  return node.kind === 'map' ? node.fixed || {} : {};
}
function ocPrepare(definitions) {
  var tables = {}, nodes = new WeakSet(), resources = {}, order = [], declared = new Set(), signatures = new Map(), entities = {}, entitySignatures = new Map();
  function entityFor(spec, scalarFields) {
    var value = spec.node.kind === 'scalar', signature = value ? 'value:' + spec.node.type : JSON.stringify(scalarFields.map(function (key) { return [key, spec.fields[key].type]; }).sort());
    if (!value && !scalarFields.length) { spec.entityTable = null; return; }
    var prior = entitySignatures.get(signature);
    if (prior) { spec.entityTable = prior; return; }
    var name = spec.table, columns = ['department_id', 'resource', 'row_key', 'entity_kind'];
    if (value) columns.push('value_kind', 'value_text', 'value_number');
    scalarFields.forEach(function (key) { var c = ocField(key); columns.push(c + '_kind', c + '_text', c + '_number', c + '_position'); });
    if (columns.length > 100) throw ocError('column-limit');
    entities[name] = { table: name, columns: columns }; entitySignatures.set(signature, name); spec.entityTable = name;
  }
  function visit(node, parent, autoTable) {
    if (!node || ['object', 'tuple', 'array', 'map', 'union', 'scalar'].indexOf(node.kind) < 0) throw ocError('definition');
    if (nodes.has(node)) throw ocError('shared-container-definition');
    nodes.add(node);
    var declaredTable = ocIdentifier(node.table || autoTable), signature = ocSignature(node);
    if (declared.has(declaredTable)) throw ocError('duplicate-table'); declared.add(declaredTable);
    var prior = signatures.get(signature); if (prior) return prior;
    var table = declaredTable, fields = ocFields(node), columns = OC_BASE_COLUMNS.slice();
    var spec = { table: table, node: node, parent: parent, fields: fields, fieldSpecs: {}, segments: [], children: {}, columns: columns, entry: null, patterns: [], choices: [] };
    ocSet(tables, table, spec); order.push(spec); signatures.set(signature, spec);
    var fieldSpec = spec;
    Object.keys(fields).sort().forEach(function (key) {
      var child = fields[key], column = ocField(key);
      if (!child) throw ocError('field-definition');
      if (child.kind === 'scalar') {
        // D1 allows100 columns per table. Wide records use fixed one-to-one
        // detail tables, each with named business columns and a parent FK.
        if (fieldSpec.columns.length + 4 > 100) {
          var segmentTable = ocIdentifier(table + '_fields_' + (spec.segments.length + 1));
          if (ocOwn(tables, segmentTable)) throw ocError('duplicate-table');
          fieldSpec = { table: segmentTable, node: { kind: 'fields' }, parent: table, columns: OC_BASE_COLUMNS.slice(), fields: {}, scalarFields: [] };
          spec.segments.push(fieldSpec); ocSet(tables, segmentTable, fieldSpec); order.push(fieldSpec);
        }
        fieldSpec.columns.push(column + '_kind', column + '_text', column + '_number', column + '_position');
        if (fieldSpec !== spec) fieldSpec.fields[key] = child;
        ocSet(spec.fieldSpecs, key, fieldSpec);
      }
      else ocSet(spec.children, key, visit(child, table));
    });
    if (node.kind === 'tuple' && !Array.isArray(node.slots)) throw ocError('tuple-definition');
    if (node.kind === 'array' || node.kind === 'map') {
      if (node.entry) spec.entry = visit(node.entry, table, table + '_values');
      if (node.kind === 'array' && !spec.entry) throw ocError('entry-definition');
      (node.patterns || []).forEach(function (pattern, index) {
        if (typeof pattern.pattern !== 'string') throw ocError('pattern-definition');
        spec.patterns.push({ re: new RegExp(pattern.pattern), spec: visit(pattern.schema, table, table + '_pattern_' + index) });
      });
    }
    if (node.kind === 'union') {
      if (!Array.isArray(node.choices) || !node.choices.length) throw ocError('union-definition');
      node.choices.forEach(function (choice, i) { spec.choices.push(visit(choice, table, table + '_choice_' + i)); });
    }
    entityFor(spec, Object.keys(fields).filter(function (key) { return fields[key].kind === 'scalar' && spec.fieldSpecs[key] === spec; }).sort());
    spec.segments.forEach(function (segment) { entityFor(segment, Object.keys(segment.fields).sort()); });
    return spec;
  }
  definitions.forEach(function (definition) {
    if (!definition || !/^bassam_[a-z0-9_]+$/.test(definition.resource) || ocOwn(resources, definition.resource)) throw ocError('resource-definition');
    ocSet(resources, definition.resource, { definition: definition, spec: visit(definition.schema, null) });
  });
  return { resources: resources, tables: tables, order: order, entities: entities };
}
function ocForResource(prepared, resource) {
  var root = prepared.resources[resource], selected = new Set(); if (!root) throw ocError('resource');
  function walk(spec) {
    if (!spec || selected.has(spec.table)) return; selected.add(spec.table);
    (spec.segments || []).forEach(walk); Object.values(spec.children || {}).forEach(walk);
    walk(spec.entry); (spec.patterns || []).forEach(function (p) { walk(p.spec); }); (spec.choices || []).forEach(walk);
  }
  walk(root.spec);
  var out = { resources: {}, order: prepared.order.filter(function (spec) { return selected.has(spec.table); }), tables: {}, entities: {} };
  out.resources[resource] = root;
  out.order.forEach(function (spec) { out.tables[spec.table] = spec; if (spec.entityTable) out.entities[spec.entityTable] = prepared.entities[spec.entityTable]; });
  return out;
}
function ocScalarPack(value, type) {
  if (value === null) return [1, null, null];
  if ((type === 'text' || type === 'scalar') && typeof value === 'string') return [2, value, null];
  if ((type === 'number' || type === 'scalar') && typeof value === 'number' && Number.isFinite(value)) return [3, null, value];
  if ((type === 'boolean' || type === 'scalar') && typeof value === 'boolean') return [4, null, value ? 1 : 0];
  throw ocError('scalar-type');
}
function ocScalarUnpack(row, prefix, type, missing) {
  var kind = row[prefix + 'kind'], text = row[prefix + 'text'], number = row[prefix + 'number'];
  if (kind === 0 && missing) { if (text !== null || number !== null) throw ocError('noncanonical-scalar'); return undefined; }
  var value = kind === 1 ? null : kind === 2 ? text : kind === 3 ? number : kind === 4 && (number === 0 || number === 1) ? !!number : undefined;
  if (value === undefined || JSON.stringify(ocScalarPack(value, type)) !== JSON.stringify([kind, text, number])) throw ocError('noncanonical-scalar');
  return value;
}
function ocEntry(spec, key) {
  for (var i = 0; i < spec.patterns.length; i++) if (spec.patterns[i].re.test(key)) return spec.patterns[i].spec;
  if (!spec.entry) throw ocError('unknown-map-key');
  return spec.entry;
}
function ocKindMatches(node, value) {
  if (node.kind === 'scalar') { try { ocScalarPack(value, node.type); return true; } catch (e) { return false; } }
  if (node.kind === 'array' || node.kind === 'tuple') return Array.isArray(value);
  return (node.kind === 'object' || node.kind === 'map') && ocObj(value);
}
function ocConvert(prepared, department, resource, value, present) {
  if (typeof department !== 'string' || !department || department.length > 200 || department.indexOf(':') >= 0) throw ocError('department');
  var root = prepared.resources[resource]; if (!root) throw ocError('resource');
  var rows = {}; prepared.order.forEach(function (spec) { rows[spec.table] = []; });
  function freshRow(spec, key, parent, member, position) {
    var row = {}; spec.columns.forEach(function (column) { row[column] = /_kind$/.test(column) ? 0 : null; });
    Object.assign(row, { department_id: department, resource: resource, row_key: key, parent_key: parent, member_key: member, position: position });
    rows[spec.table].push(row); return row;
  }
  function write(spec, item, key, parent, member, position) {
    var row = freshRow(spec, key, parent, member, position), fieldRows = {};
    if (item === null) { row.node_kind = 1; return; }
    var node = spec.node, kind = node.kind;
    if (kind === 'scalar') {
      row.node_kind = 7; var scalar = ocScalarPack(item, node.type);
      row.value_kind = scalar[0]; row.value_text = scalar[1]; row.value_number = scalar[2]; return;
    }
    if (kind === 'union') {
      var choices = spec.choices.filter(function (choice) { return ocKindMatches(choice.node, item); });
      if (choices.length !== 1) throw ocError('ambiguous-union');
      row.node_kind = 6; row.variant = spec.choices.indexOf(choices[0]);
      write(choices[0], item, key + '/v:' + row.variant, key, '@', 0); return;
    }
    if (!ocKindMatches(node, item)) throw ocError('container-type');
    row.node_kind = kind === 'object' ? 2 : kind === 'map' ? 3 : kind === 'array' ? 4 : 5;
    fieldRows[spec.table] = row;
    spec.segments.forEach(function (segment, index) {
      var extra = freshRow(segment, key + '/p:' + index, key, null, index); extra.node_kind = 8; fieldRows[segment.table] = extra;
    });
    if (kind === 'tuple') { if (item.length > node.slots.length) throw ocError('tuple-length'); row.tuple_length = item.length; }
    if (kind === 'array') {
      for (var i = 0; i < item.length; i++) { if (!ocOwn(item, i)) throw ocError('array-hole'); write(spec.entry, item[i], key + '/i:' + i, key, null, i); }
      return;
    }
    Object.keys(item).forEach(function (field, i) {
      if (kind === 'tuple' && (!/^(0|[1-9]\d*)$/.test(field) || Number(field) >= item.length)) throw ocError('tuple-field');
      var child = ocOwn(spec.fields, field) ? spec.fields[field] : null;
      if (!child) {
        if (kind !== 'map') throw ocError('unknown-field-' + field);
        write(ocEntry(spec, field), item[field], key + '/e:' + encodeURIComponent(field), key, field, i); return;
      }
      if (child.kind === 'scalar') {
        var column = ocField(field), packed = ocScalarPack(item[field], child.type);
        var target = fieldRows[spec.fieldSpecs[field].table];
        target[column + '_kind'] = packed[0]; target[column + '_text'] = packed[1]; target[column + '_number'] = packed[2];
        target[column + '_position'] = i;
      } else write(spec.children[field], item[field], key + '/f:' + encodeURIComponent(field), key, field, i);
    });
    if (kind === 'tuple') for (var t = 0; t < item.length; t++) if (!ocOwn(item, t)) throw ocError('array-hole');
  }
  if (present !== false) write(root.spec, value, '$', null, null, 0);
  return { departmentId: department, resource: resource, rows: rows };
}
function ocInflate(prepared, domain) {
  var root = prepared.resources[domain.resource], rows = domain.rows, used = new Set(), byTable = {};
  if (!root || !rows || !ocObj(rows)) throw ocError('domain');
  prepared.order.forEach(function (spec) {
    var list = rows[spec.table] || [], map = new Map();
    if (!Array.isArray(list)) throw ocError('rows');
    list.forEach(function (row) {
      if (!ocObj(row) || row.department_id !== domain.departmentId || row.resource !== domain.resource || typeof row.row_key !== 'string' || map.has(row.row_key) ||
          Object.keys(row).length !== spec.columns.length || spec.columns.some(function (c) { return !ocOwn(row, c); })) throw ocError('row');
      map.set(row.row_key, row);
    }); byTable[spec.table] = map;
  });
  function read(spec, row) {
    used.add(spec.table + '\0' + row.row_key);
    if (row.node_kind === 1) return null;
    var kind = spec.node.kind, value;
    if (kind === 'scalar') return ocScalarUnpack(row, 'value_', spec.node.type, false);
    if (kind === 'union') {
      var alternative = spec.choices[row.variant];
      if (!alternative) throw ocError('variant');
      var branch = byTable[alternative.table].get(row.row_key + '/v:' + row.variant);
      if (!branch) throw ocError('missing-variant');
      return read(alternative, branch);
    }
    value = kind === 'array' || kind === 'tuple' ? [] : {};
    if (kind === 'array') {
      var entries = Array.from(byTable[spec.entry.table].values()).filter(function (r) { return r.parent_key === row.row_key; }).sort(function (a, b) { return a.position - b.position; });
      entries.forEach(function (entry, index) { if (entry.position !== index) throw ocError('array-position'); value.push(read(spec.entry, entry)); });
      return value;
    }
    var members = [], fieldRows = {}; fieldRows[spec.table] = row;
    spec.segments.forEach(function (segment, index) {
      var extra = byTable[segment.table].get(row.row_key + '/p:' + index);
      if (!extra || extra.node_kind !== 8) throw ocError('missing-record-details');
      used.add(segment.table + '\0' + extra.row_key); fieldRows[segment.table] = extra;
    });
    Object.keys(spec.fields).forEach(function (field) {
      if (kind === 'tuple' && Number(field) >= row.tuple_length) return;
      var schema = spec.fields[field];
      if (schema.kind === 'scalar') {
        var source = fieldRows[spec.fieldSpecs[field].table], scalar = ocScalarUnpack(source, ocField(field) + '_', schema.type, kind !== 'tuple');
        if (scalar !== undefined) members.push({ key: field, value: scalar, position: source[ocField(field) + '_position'] });
      } else {
        var child = byTable[spec.children[field].table].get(row.row_key + '/f:' + encodeURIComponent(field));
        if (child) members.push({ key: field, value: read(spec.children[field], child), position: child.position });
        else if (kind === 'tuple') throw ocError('tuple-value');
      }
    });
    if (kind === 'map') {
      var candidates = [spec.entry].concat(spec.patterns.map(function (p) { return p.spec; })).filter(Boolean), entries = [], visited = new Set();
      candidates.forEach(function (candidate) { if (visited.has(candidate.table)) return; visited.add(candidate.table); byTable[candidate.table].forEach(function (entry) { if (entry.parent_key === row.row_key && entry.row_key.startsWith(row.row_key + '/e:')) entries.push({ spec: candidate, row: entry }); }); });
      entries.sort(function (a, b) { return a.row.position - b.row.position; }).forEach(function (entry) {
        var key = entry.row.member_key;
        if (typeof key !== 'string' || members.some(function (m) { return m.key === key; }) || ocOwn(spec.fields, key) || ocEntry(spec, key) !== entry.spec) throw ocError('map-member');
        members.push({ key: key, value: read(entry.spec, entry.row), position: entry.row.position });
      });
    }
    members.sort(function (a, b) { return a.position - b.position; }).forEach(function (member, index) {
      if (member.position !== index) throw ocError('member-position');
      ocSet(value, member.key, member.value);
    });
    if (kind === 'tuple' && (!Number.isSafeInteger(row.tuple_length) || row.tuple_length < 0 || row.tuple_length > spec.node.slots.length || value.length !== row.tuple_length)) throw ocError('tuple-length');
    return value;
  }
  var rootRow = byTable[root.spec.table].get('$'), result = rootRow ? { present: true, value: read(root.spec, rootRow) } : { present: false };
  prepared.order.forEach(function (spec) { byTable[spec.table].forEach(function (row) { if (!used.has(spec.table + '\0' + row.row_key)) throw ocError('orphan-row'); }); });
  var canonical = ocConvert(prepared, domain.departmentId, domain.resource, result.value, result.present);
  prepared.order.forEach(function (spec) {
    function sorted(list) { return list.slice().sort(function (a, b) { return a.row_key.localeCompare(b.row_key); }).map(function (r) { return spec.columns.map(function (c) { return r[c]; }); }); }
    if (JSON.stringify(sorted(canonical.rows[spec.table])) !== JSON.stringify(sorted(rows[spec.table] || []))) throw ocError('noncanonical-rows');
  });
  return result;
}
function ocPhysicalTables(prepared) {
  var tables = { ops_nodes: OC_NODE_COLUMNS };
  Object.keys(prepared.entities).forEach(function (name) { tables[name] = prepared.entities[name].columns; });
  return tables;
}
function ocPhysicalRows(prepared, domain) {
  var out = { ops_nodes: [] };
  Object.keys(prepared.entities).forEach(function (name) { out[name] = []; });
  prepared.order.forEach(function (spec) {
    (domain.rows[spec.table] || []).forEach(function (row) {
      var node = {}; OC_NODE_COLUMNS.forEach(function (column) { node[column] = column === 'schema_id' ? spec.table : column === 'entity_kind' ? spec.entityTable : row[column]; });
      out.ops_nodes.push(node);
      if (spec.entityTable) {
        var entity = {}; prepared.entities[spec.entityTable].columns.forEach(function (column) { entity[column] = column === 'entity_kind' ? spec.entityTable : row[column]; });
        out[spec.entityTable].push(entity);
      }
    });
  });
  out.ops_nodes.sort(function (a, b) { return a.row_key.split('/').length - b.row_key.split('/').length || a.row_key.localeCompare(b.row_key); });
  return out;
}
function ocFromPhysical(prepared, department, resource, physical) {
  var domain = { departmentId: department, resource: resource, rows: {} }, entities = {}, used = new Set();
  var physicalTables = ocPhysicalTables(prepared), nodeIds = new Set();
  if (!ocObj(physical) || Object.keys(physical).some(function (table) { return !ocOwn(physicalTables, table); })) throw ocError('physical-tables');
  Object.keys(physicalTables).forEach(function (table) {
    if (!Array.isArray(physical[table])) throw ocError('physical-table');
    physical[table].forEach(function (row) { if (!ocObj(row) || Object.keys(row).length !== physicalTables[table].length || physicalTables[table].some(function (c) { return !ocOwn(row, c); })) throw ocError('physical-columns'); });
  });
  Object.keys(prepared.entities).forEach(function (name) {
    var map = new Map(); (physical[name] || []).forEach(function (row) {
      if (row.department_id !== department || row.resource !== resource || row.entity_kind !== name || map.has(row.row_key)) throw ocError('physical-row');
      map.set(row.row_key, row);
    }); entities[name] = map;
  });
  prepared.order.forEach(function (spec) { domain.rows[spec.table] = []; });
  (physical.ops_nodes || []).forEach(function (node) {
    if (nodeIds.has(node.row_key)) throw ocError('duplicate-node'); nodeIds.add(node.row_key);
    var spec = prepared.tables[node.schema_id];
    if (!spec || node.department_id !== department || node.resource !== resource || node.entity_kind !== spec.entityTable) throw ocError('node-schema');
    var entity = spec.entityTable ? entities[spec.entityTable].get(node.row_key) : {};
    if (!entity) throw ocError('missing-entity');
    if (spec.entityTable) used.add(spec.entityTable + '\0' + node.row_key);
    var row = {}; spec.columns.forEach(function (column) { row[column] = ocOwn(node, column) ? node[column] : ocOwn(entity, column) ? entity[column] : /_kind$/.test(column) ? 0 : null; });
    domain.rows[spec.table].push(row);
  });
  Object.keys(entities).forEach(function (name) { entities[name].forEach(function (row) { if (!used.has(name + '\0' + row.row_key)) throw ocError('orphan-entity'); }); });
  ocInflate(prepared, domain); return domain;
}
function ocCreateStatements(prepared) {
  var out = ["CREATE TABLE IF NOT EXISTS ops_nodes(department_id TEXT NOT NULL,resource TEXT NOT NULL,row_key TEXT NOT NULL,parent_key TEXT,member_key TEXT,position INTEGER NOT NULL,node_kind INTEGER NOT NULL,variant INTEGER,tuple_length INTEGER,schema_id TEXT NOT NULL,entity_kind TEXT,PRIMARY KEY(department_id,resource,row_key),UNIQUE(department_id,resource,row_key,entity_kind),FOREIGN KEY(department_id,resource,parent_key)REFERENCES ops_nodes(department_id,resource,row_key)ON DELETE CASCADE)WITHOUT ROWID",
    'CREATE INDEX IF NOT EXISTS ops_nodes_parent ON ops_nodes(department_id,resource,parent_key,member_key,position)'];
  Object.keys(prepared.entities).forEach(function (name) {
    var spec = prepared.entities[name], columns = spec.columns.map(function (column) {
      var numeric = column === 'position' || column === 'node_kind' || column === 'variant' || column === 'tuple_length' || column !== 'entity_kind' && /_(kind|position)$/.test(column), number = /_number$/.test(column);
      return '"' + column + '" ' + (numeric ? 'INTEGER' : number ? 'REAL' : 'TEXT') + (['department_id', 'resource', 'row_key', 'entity_kind'].indexOf(column) >= 0 ? ' NOT NULL' : '');
    });
    columns.push('CHECK(entity_kind=\'' + spec.table + '\')', 'PRIMARY KEY(department_id,resource,row_key)',
      'FOREIGN KEY(department_id,resource,row_key,entity_kind) REFERENCES ops_nodes(department_id,resource,row_key,entity_kind) ON DELETE CASCADE');
    out.push('CREATE TABLE IF NOT EXISTS ' + spec.table + '(' + columns.join(',') + ') WITHOUT ROWID');
  });
  return out;
}
