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
