/* Server-only plans: no batch, revision allocation, session effect or audit write here. */
function cuSelection(dept, column, ids) {
  var args = [dept],
    where = 'department_id=?1';
  if (column) {
    if (['holder_key', 'issue_id'].indexOf(column) < 0) throw cuError('custody-plan-column');
    var chunks = cuJsonChunks(ids),
      queries = chunks.map(function (chunk) {
        args.push(chunk);
        return 'SELECT value FROM json_each(?' + args.length + ')';
      });
    where += ' AND ' + column + ' IN (' + (queries.length ? queries.join(' UNION ALL ') : 'SELECT NULL WHERE 0') + ')';
  }
  return { where: where, args: args };
}
function cuRowsGuard(env, table, columns, rows, selection) {
  var args = selection.args.slice(),
    expected = cuJsonChunks(rows).map(function (chunk) {
      args.push(chunk);
      return (
        'SELECT ' +
        columns
          .map(function (c) {
            return "json_extract(value,'$." + c + "')";
          })
          .join(',') +
        ' FROM json_each(?' +
        args.length +
        ')'
      );
    });
  var count = '(SELECT COUNT(*) FROM ' + table + ' WHERE ' + selection.where + ')!=' + rows.length;
  var diff = expected.length
    ? ' OR EXISTS(SELECT ' +
      columns
        .map(function (c) {
          return '"' + c + '"';
        })
        .join(',') +
      ' FROM ' +
      table +
      ' WHERE ' +
      selection.where +
      ' EXCEPT SELECT * FROM (' +
      expected.join(' UNION ALL ') +
      '))'
    : '';
  var guard = cuBind(env, 'SELECT CASE WHEN ' + count + diff + " THEN json_extract('{}','KIVO_CUSTODY_TARGET_CHANGED') END", args);
  /* Only the count-only form (no expected rows) is a small scalar guard that the
     atomic restore may fold with its neighbours (rsMergeGuards, decision g). */
  return diff ? guard : rsGuardTag(guard, count, args, 'KIVO_CUSTODY_TARGET_CHANGED');
}
async function cuSnapshotRows(env, dept) {
  var rows = {};
  for (var k of Object.keys(CU_TABLES))
    rows[k] =
      (
        await env.DB.prepare(
          'SELECT * FROM ' +
            CU_TABLES[k][0] +
            ' WHERE department_id=?1 ORDER BY ' +
            (k === 'items' ? 'item_id' : k === 'issues' ? 'issue_id' : 'sequence'),
        )
          .bind(dept)
          .all()
      ).results || [];
  return rows;
}
function cuLiveEmployees(employees) {
  if (!Array.isArray(employees)) throw cuError('custody-employees-shape');
  var live = Object.create(null);
  employees.forEach(function (e) {
    if (typeof e === 'string' && e) {
      live[e] = 1;
      return;
    }
    if (!isObj(e)) throw cuError('custody-employees-shape');
    ['eid', 'nid', 'name', 'empno'].forEach(function (k) {
      if (e[k]) live[String(e[k])] = 1;
    });
  });
  return live;
}
