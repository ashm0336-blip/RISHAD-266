  X.staffingItems = function (a, b, ctx) {
    a = obj(a); b = obj(b); var items = [], i, k, q, ks = union(a, b), L = ctx.locks ? ctx.locks.staffing : undefined;
    for (i = 0; i < ks.length; i++) {
      k = ks[i]; if (deq(a[k], b[k])) continue; var per = parseMonth(k), ls = lockState(L, k), lk = { locked: ls, why: ls === null ? 'lock-evidence-missing (bassam_staffing_locks_v1 not loaded)' : (ls ? 'month-locked' : 'open') };
      if (a[k] === undefined) {
        items.push(it({ what: 'month', kind: 'added', id: k, path: k, period: pair(null, per), lock: lk }));
        if (ctx.read) { var ym = obj(b[k]), q3; for (q3 in ym) { if (q3 === '__shifts') continue; var r3 = obj(ym[q3]); items.push(it({ what: 'row', kind: 'added', id: k + '|' + q3, path: k + '[' + q3 + ']', period: pair(null, per), owner: pair(null, q3), shift: pair(null, r3.shift || null), lock: lk })); } }
        continue;
      }
      if (b[k] === undefined) { items.push(it({ what: 'month', kind: 'removed', id: k, path: k, period: pair(per, null), lock: lk })); continue; }
      var x = obj(a[k]), y = obj(b[k]), eks = union(x, y);
      for (q = 0; q < eks.length; q++) {
        var ek = eks[q]; if (deq(x[ek], y[ek])) continue;
        if (ek === '__shifts') { items.push(it({ what: 'snapshot', kind: kindOf(x[ek], y[ek]), id: k + '|__shifts', path: k + '[__shifts]', period: pair(per, per), lockOp: true })); continue; }
        var r0 = obj(x[ek]), r1 = obj(y[ek]), kd = kindOf(x[ek], y[ek]);
        items.push(it({ what: 'row', kind: kd, id: k + '|' + ek, path: k + '[' + ek + ']', period: pair(kd === 'added' ? null : per, kd === 'removed' ? null : per), owner: pair(kd === 'added' ? null : ek, kd === 'removed' ? null : ek), shift: pair(kd === 'added' ? null : (r0.shift || null), kd === 'removed' ? null : (r1.shift || null)), lock: lk }));
      }
    }
    if (!items.length) items.push(it({ what: 'resource', kind: kindOf(a, b), id: 'staffing', path: '*' }));
    return items;
  };
