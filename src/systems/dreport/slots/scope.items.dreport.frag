  /* ═══ التقرير اليومي ═══ */
  X.dreportItems = function (a, b, ctx) {
    a = obj(a); b = obj(b); var items = [], i, k, q, ks = union(a, b), T = ctx.today;
    for (i = 0; i < ks.length; i++) {
      k = ks[i]; if (deq(a[k], b[k])) continue;
      if (/^m:/.test(k)) { var lx = normLock(a[k]), ly = normLock(b[k]), per = parseMonth(k); if (!deq(lx.perm, ly.perm)) items.push(it({ what: 'monthPerm', kind: 'changed', id: k, path: k + '.perm', period: pair(per, per), lock: { locked: lockedIn(a[k], per.y, per.m, null, T), why: 'month-lock' } })); var rest = union(lx, ly).filter(function (f) { return f !== 'perm' && !deq(lx[f], ly[f]); }); if (rest.length) items.push(it({ what: 'monthLock', kind: kindOf(a[k], b[k]), id: k, path: k, period: pair(per, per), lockOp: true })); continue; }
      var day = parseDay(k); if (!day) { items.push(it({ what: 'dayOther', kind: kindOf(a[k], b[k]), id: k, path: k })); continue; }
      var rec = a['m:' + day.y + '-' + day.m], dayLocked = lockedIn(rec, day.y, day.m, day.d, T), lk = { locked: dayLocked, why: dayLocked ? 'period-locked (m:y-m/dsLockedIn)' : 'open' };
      var x = a[k], y = b[k];
      if (x === undefined) {
        items.push(it({ what: 'day', kind: 'added', id: k, path: k, period: pair(null, day), lock: lk }));
        if (ctx.read) { var sy0 = obj(obj(y).shifts), sk0 = union({}, sy0), q2; for (q2 = 0; q2 < sk0.length; q2++) { var sh0 = sk0[q2], p0 = k + '.shifts[' + sh0 + ']', ro0 = arr(obj(sy0[sh0]).roster), z0; items.push(it({ what: 'shift', kind: 'added', id: k + '|' + sh0, path: p0, period: pair(null, day), shift: pair(null, sh0), lock: lk })); for (z0 = 0; z0 < ro0.length; z0++) { var ek0 = isObj(ro0[z0]) && ro0[z0].ekey != null ? String(ro0[z0].ekey) : ('#' + z0); items.push(it({ what: 'roster', kind: 'added', id: ek0, path: p0 + '.roster[' + ek0 + ']', period: pair(null, day), shift: pair(null, sh0), owner: pair(null, ek0), lock: lk })); } } }
        continue;
      }
      if (y === undefined) { items.push(it({ what: 'day', kind: 'removed', id: k, path: k, period: pair(day, null), lock: lk })); continue; }
      x = obj(x); y = obj(y); var sx = obj(x.shifts), sy = obj(y.shifts), sk = union(sx, sy);
      for (q = 0; q < sk.length; q++) {
        var sh = sk[q]; if (deq(sx[sh], sy[sh])) continue; var p = k + '.shifts[' + sh + ']';
        if (sx[sh] === undefined) { items.push(it({ what: 'shift', kind: 'added', id: k + '|' + sh, path: p, period: pair(null, day), shift: pair(null, sh), lock: lk })); continue; }
        if (sy[sh] === undefined) { items.push(it({ what: 'shift', kind: 'removed', id: k + '|' + sh, path: p, period: pair(day, null), shift: pair(sh, null), lock: lk })); continue; }
        var ox = obj(sx[sh]), oy = obj(sy[sh]), shLock = { locked: dayLocked || !!ox.ap, why: dayLocked ? lk.why : (ox.ap ? 'shift-approved' : 'open') };
        if (!deq(ox.ap, oy.ap) || !deq(ox.apAt, oy.apAt) || !deq(ox.apBy, oy.apBy)) items.push(it({ what: 'shiftAp', kind: 'changed', id: k + '|' + sh, path: p + '.ap', period: pair(day, day), shift: pair(sh, sh), lockOp: true }));
        if (!deq(ox.roster, oy.roster)) {
          var m = matchById(arr(ox.roster), arr(oy.roster), function (e) { return isObj(e) && e.ekey != null ? String(e.ekey) : null; }), z;
          for (z = 0; z < m.added.length; z++) items.push(it({ what: 'roster', kind: 'added', id: m.added[z].id, path: p + '.roster[' + m.added[z].id + ']', period: pair(null, day), shift: pair(null, sh), lock: shLock }));
          for (z = 0; z < m.removed.length; z++) items.push(it({ what: 'roster', kind: 'removed', id: m.removed[z].id, path: p + '.roster[' + m.removed[z].id + ']', period: pair(day, null), shift: pair(sh, null), lock: shLock }));
          for (z = 0; z < m.changed.length; z++) items.push(it({ what: 'roster', kind: 'changed', id: m.changed[z].id, path: p + '.roster[' + m.changed[z].id + ']', period: pair(day, day), shift: pair(sh, sh), lock: shLock }));
        }
        var ok2 = union(ox, oy), other = 0, z3; for (z3 = 0; z3 < ok2.length; z3++) { var f2 = ok2[z3]; if (f2 === 'ap' || f2 === 'apAt' || f2 === 'apBy' || f2 === 'roster') continue; if (!deq(ox[f2], oy[f2])) other++; }
        if (other) items.push(it({ what: 'shiftEdit', kind: 'changed', id: k + '|' + sh, path: p, period: pair(day, day), shift: pair(sh, sh), lock: shLock }));
      }
      var dk = union(x, y), oth = 0, z4; for (z4 = 0; z4 < dk.length; z4++) if (dk[z4] !== 'shifts' && !deq(x[dk[z4]], y[dk[z4]])) oth++;
      if (oth) items.push(it({ what: 'dayEdit', kind: 'changed', id: k, path: k, period: pair(day, day), lock: lk }));
    }
    if (!items.length) items.push(it({ what: 'resource', kind: kindOf(a, b), id: 'dreport', path: '*' }));
    return items;
  };
