  /* ═══ المهام ═══ */
  var TASK_SELF = { 3: 1, 6: 1, 11: 1, 12: 1, 20: 1, 21: 1 }, TASK_ST = { pending: 1, in_progress: 1, done: 1, declined: 1 }, ASSIGN_COLS = { 7: 1, 8: 1, 14: 1, 17: 1, 18: 1 };
  function taskIds(x, y) { var dup = {}; function scan(rows) { var seen = {}, i, k; for (i = 0; i < rows.length; i++) { k = String(Array.isArray(rows[i]) ? rows[i][13] : ''); if (seen[k]) dup[k] = 1; seen[k] = 1; } } scan(x); scan(y); return function (r) { if (!Array.isArray(r) || r[13] == null) return null; var id = String(r[13]); return dup[id] ? id + '|' + String(r[14] == null ? '' : r[14]) : id; }; }
  function classifyTaskRow(R, r0, r1, p, ctx) {
    var n = Math.max(r0.length, r1.length), j, C = [], self = !!(ctx && ctx.actor && ctx.actor.ekey && String(r0[14] == null ? '' : r0[14]) === String(ctx.actor.ekey));
    for (j = 0; j < n; j++) { var v0 = r0[j] === undefined ? null : r0[j], v1 = r1[j] === undefined ? null : r1[j]; if (!deq(v0, v1)) C.push(j); }
    var selfOk = self && !(r0[3] === 'done' || r0[3] === 'declined') && TASK_ST[String(r1[3])], q;
    for (q = 0; q < C.length && selfOk; q++) if (!TASK_SELF[C[q]]) selfOk = false;
    if (selfOk) R.alt.push('self.task.respond');
    var abs = {}, rest = [];
    if (C.indexOf(3) !== -1) {
      var f = String(r0[3]), t = String(r1[3]), key;
      if (f === 'pending' && (t === 'in_progress' || t === 'declined')) { key = 'task.accept'; abs[11] = abs[12] = abs[20] = 1; }
      else if (t === 'done') { key = 'task.finish'; abs[12] = abs[6] = 1; }
      else if ((f === 'done' || f === 'declined') && (t === 'in_progress' || t === 'pending')) { key = 'task.reopen'; abs[11] = abs[12] = abs[6] = 1; }
      else key = 'task.edit';
      R.op(key, p + '[3] ' + f + '→' + t);
    }
    if (C.indexOf(21) !== -1) R.op('task.evidence', p + '[21]');
    var asg = []; for (q = 0; q < C.length; q++) if (ASSIGN_COLS[C[q]]) asg.push(C[q]);
    if (asg.length) R.op('task.assign', p + '[' + asg.join('/') + ']');
    for (q = 0; q < C.length; q++) { j = C[q]; if (j === 3 || j === 21 || ASSIGN_COLS[j] || abs[j]) continue; rest.push(j); }
    if (rest.length) R.op('task.edit', p + '[' + rest.join('/') + ']');
  }
  C['bassam_tasks_v1'] = function (R, a, b, ctx) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    var ks = union(a, b), i, removed = [], q;
    for (i = 0; i < ks.length; i++) {
      var day = ks[i], x = arr(a[day]), y = arr(b[day]); if (deq(x, y)) continue;
      var m = matchById(x, y, taskIds(x, y));
      for (q = 0; q < m.added.length; q++) R.op('task.create', day + '[' + m.added[q].id + ']');
      for (q = 0; q < m.removed.length; q++) removed.push(day + '[' + m.removed[q].id + ']');
      for (q = 0; q < m.changed.length; q++) {
        var c = m.changed[q];
        if (Array.isArray(c.a) && Array.isArray(c.b) && gone(ctx, c.a[14]) && c.b[14] === '' && c.b[8] === '' && Array.isArray(c.b[7]) && !c.b[7].length) { R.op(ctx && ctx.empsEmpty ? 'emp.record.bulk.delete' : 'emp.record.delete', day + '[' + c.id + ']', 'cleanup-gone'); continue; }
        if (Array.isArray(c.a) && Array.isArray(c.b)) classifyTaskRow(R, c.a, c.b, day + '[' + c.id + ']', ctx); else R.res(day + '[' + c.id + ']', 'row-shape');
      }
    }
    if (removed.length >= 2) R.op('task.bulk.delete', removed.join(' · '), 'n=' + removed.length); else for (q = 0; q < removed.length; q++) R.op('task.delete', removed[q]);
  };
