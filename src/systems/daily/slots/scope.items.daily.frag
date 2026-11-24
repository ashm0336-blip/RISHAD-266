  /* ═══ الجولات اليومية ═══ */
  X.roundsItems = function (a, b, ctx) {
    a = obj(a); b = obj(b); var items = [], i, k, q, ks = union(a, b), T = ctx.today;
    for (i = 0; i < ks.length; i++) {
      k = ks[i]; if (deq(a[k], b[k])) continue;
      if (/^m:(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])$/.test(k)) {   /* V7 · 53 تقويم: ISO */
      items.push(it({ what: 'monthLock', kind: kindOf(a[k], b[k]), id: k, path: k, period: pair(parseMonth(k), parseMonth(k)), lockOp: true })); continue; }
      var day = parseDay(k); if (!day) { items.push(it({ what: 'dayOther', kind: kindOf(a[k], b[k]), id: k, path: k })); continue; }
      var rec = a[mkOf(day)], x = a[k], y = b[k];
      var locked = !!(isObj(x) && x.ap) || lockedIn(rec, day.y, day.m, day.d, T), lk = { locked: locked, why: (isObj(x) && x.ap) ? 'day-approved' : (locked ? 'period-locked (m:y-m/dsLockedIn)' : 'open') };
      if (x === undefined) {
        items.push(it({ what: 'day', kind: 'added', id: k, path: k, period: pair(null, day), lock: { locked: lockedIn(rec, day.y, day.m, day.d, T), why: 'period-locked' } }));
        if (ctx.read) { var yd = obj(y), dl0 = arr(yd.d), q1; for (q1 = 0; q1 < dl0.length; q1++) { var fl1 = obj(dl0[q1]), sid1 = roundsSite(fl1, '#' + q1); items.push(it({ what: 'floor', kind: 'added', id: '#' + q1, path: k + '.d[#' + q1 + ']', site: pair(null, sid1), period: pair(null, day), lock: lk })); floorElems(items, {}, fl1, sid1, day, k + '.d[#' + q1 + ']', lk); } }
        continue;
      }
      if (y === undefined) { items.push(it({ what: 'day', kind: 'removed', id: k, path: k, period: pair(day, null), lock: lk })); continue; }
      x = obj(x); y = obj(y); var fk = union(x, y), other = 0;
      for (q = 0; q < fk.length; q++) {
        var f = fk[q]; if (deq(x[f], y[f])) continue;
        if (f === 'ap') { items.push(it({ what: 'dayAp', kind: 'changed', id: k, path: k + '.ap', period: pair(day, day), lockOp: true })); continue; }
        if (f === 'shAp') { var sx = obj(x.shAp), sy = obj(y.shAp), sk = union(sx, sy), z; for (z = 0; z < sk.length; z++) if (!deq(sx[sk[z]], sy[sk[z]])) items.push(it({ what: 'shiftAp', kind: 'changed', id: k + '|' + sk[z], path: k + '.shAp[' + sk[z] + ']', period: pair(day, day), shift: pair(sk[z], sk[z]), lockOp: true })); continue; }
        if (f === 'd') {
          var m = matchById(arr(x.d), arr(y.d), function (e, i2) { return '#' + i2; }), z2;
          for (z2 = 0; z2 < m.changed.length; z2++) { var fla = obj(m.changed[z2].a), flb = obj(m.changed[z2].b); floorElems(items, m.changed[z2].a, m.changed[z2].b, roundsSite((fla.sid != null && fla.sid !== '') ? fla : flb, m.changed[z2].id), day, k + '.d[' + m.changed[z2].id + ']', lk); }
          for (z2 = 0; z2 < m.added.length; z2++) items.push(it({ what: 'floor', kind: 'added', id: m.added[z2].id, path: k + '.d[' + m.added[z2].id + ']', site: pair(null, roundsSite(m.added[z2].b, m.added[z2].id)), period: pair(null, day), lock: lk }));
          for (z2 = 0; z2 < m.removed.length; z2++) items.push(it({ what: 'floor', kind: 'removed', id: m.removed[z2].id, path: k + '.d[' + m.removed[z2].id + ']', site: pair(roundsSite(m.removed[z2].a, m.removed[z2].id), null), period: pair(day, null), lock: lk }));
          continue;
        }
        other++;
      }
      if (other) items.push(it({ what: 'dayEdit', kind: 'changed', id: k, path: k, period: pair(day, day), lock: lk }));
    }
    if (!items.length) items.push(it({ what: 'resource', kind: kindOf(a, b), id: 'rounds', path: '*' }));
    return items;
  };
