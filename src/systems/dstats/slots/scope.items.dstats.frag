  X.dstatsItems = function (a, b, ctx) {
    a = obj(a); b = obj(b); var items = [], i, q, T = ctx.today, sites = ['haram', 'nabawi'];
    for (i = 0; i < sites.length; i++) {
      var s = sites[i], x = obj(a[s]), y = obj(b[s]), ks = union(x, y);
      for (q = 0; q < ks.length; q++) { var dk = ks[q]; if (deq(x[dk], y[dk])) continue; var dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dk), day = dm ? { y: +dm[1], m: +dm[2], d: +dm[3] } : null, locked = day ? (lockedIn(obj(a.locks)[s + '|' + day.y + '-' + day.m], day.y, day.m, day.d, T) && lockedIn(obj(b.locks)[s + '|' + day.y + '-' + day.m], day.y, day.m, day.d, T)) : false;
        items.push(it({ what: 'dsDay', kind: kindOf(x[dk], y[dk]), id: s + '|' + dk, path: s + '[' + dk + ']', source: s, period: pair(day, day), lock: { locked: locked, why: locked ? 'dslock (locked before and after)' : 'open' } })); }
    }
    var la = obj(a.locks), lb = obj(b.locks), lk = union(la, lb);
    for (q = 0; q < lk.length; q++) { if (deq(la[lk[q]], lb[lk[q]])) continue; var lm = /^(haram|nabawi)\|(\d{4})-(\d{1,2})$/.exec(lk[q]); items.push(it({ what: 'dsLock', kind: kindOf(la[lk[q]], lb[lk[q]]), id: lk[q], path: 'locks[' + lk[q] + ']', source: lm ? lm[1] : null, period: pair(lm ? { y: +lm[2], m: +lm[3], d: null } : null, lm ? { y: +lm[2], m: +lm[3], d: null } : null), lockOp: true })); }
    if (!items.length) items.push(it({ what: 'resource', kind: kindOf(a, b), id: 'dstats', path: '*' }));
    return items;
  };
