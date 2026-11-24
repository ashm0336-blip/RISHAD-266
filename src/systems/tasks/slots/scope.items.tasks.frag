  /* ═══ المهام ═══ */
  X.tasksItems = function (a, b, ctx) {
    a = obj(a); b = obj(b); var items = [], i, k, q, ks = union(a, b), L = ctx.locks ? ctx.locks.tasks : undefined;
    for (i = 0; i < ks.length; i++) {
      k = ks[i]; var x = arr(a[k]), y = arr(b[k]); if (deq(x, y)) continue; var day = parseDay(k), mk = day ? day.y + '-' + day.m : '', ls = lockState(L, mk), lk = { locked: ls, why: ls === null ? 'lock-evidence-missing (bassam_tasks_locks_v1 not loaded)' : (ls ? 'month-locked' : 'open') };
      /* V7 · 53 (قرار المالك ٧): قاعدةُ الصفحة نفسُها — الشهرُ الماضي مقفلٌ اعتُمد أو لم يُعتمد، ولا يُفتح إلا للاستدراك ({mo:1}) */
      if (ls === false && day && closedPeriod(ctx.today, day.y, day.m) && !(isObj(obj(L)[mk]) && obj(L)[mk].mo)) lk = { locked: true, why: 'month-past' };
      var m = matchById(x, y, function (r) { return Array.isArray(r) && r[13] != null ? String(r[13]) : null; });
      for (q = 0; q < m.added.length; q++) items.push(it({ what: 'task', kind: 'added', id: m.added[q].id, path: k + '[' + m.added[q].id + ']', period: pair(null, day), owner: pair(null, str(arr(m.added[q].b)[14])), lock: lk }));
      for (q = 0; q < m.removed.length; q++) items.push(it({ what: 'task', kind: 'removed', id: m.removed[q].id, path: k + '[' + m.removed[q].id + ']', period: pair(day, null), owner: pair(str(arr(m.removed[q].a)[14]), null), lock: lk }));
      for (q = 0; q < m.changed.length; q++) items.push(it({ what: 'task', kind: 'changed', id: m.changed[q].id, path: k + '[' + m.changed[q].id + ']', period: pair(day, day), owner: pair(str(arr(m.changed[q].a)[14]), str(arr(m.changed[q].b)[14])), lock: lk }));
    }
    if (!items.length) items.push(it({ what: 'resource', kind: kindOf(a, b), id: 'tasks', path: '*' }));
    return items;
  };
