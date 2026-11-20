  /* ═══ الخطة التشغيلية ═══ */
  X.planItems = function (a, b, ctx) {
    a = obj(a); b = obj(b); var items = [], i, k, T = ctx.today;
    var fm = matchById(arr(a.floors), arr(b.floors), ID.floors);
    for (i = 0; i < fm.added.length; i++) { items.push(it({ what: 'floor', kind: 'added', id: fm.added[i].id, path: 'floors[' + fm.added[i].id + ']', site: pair(null, fm.added[i].id), lock: { locked: false, why: 'new-site' } })); if (ctx.read) floorElems(items, {}, fm.added[i].b, fm.added[i].id, null, 'floors[' + fm.added[i].id + ']', { locked: false, why: 'read' }); }
    for (i = 0; i < fm.removed.length; i++) items.push(it({ what: 'floor', kind: 'removed', id: fm.removed[i].id, path: 'floors[' + fm.removed[i].id + ']', site: pair(fm.removed[i].id, null), lock: { locked: !!obj(fm.removed[i].a).approved, why: 'site-approved' } }));
    for (i = 0; i < fm.changed.length; i++) {
      var fx = obj(fm.changed[i].a), fy = obj(fm.changed[i].b), fid = fm.changed[i].id, lk = { locked: !!fx.approved, why: fx.approved ? 'site-approved' : 'open' };
      if (!!fx.approved !== !!fy.approved) items.push(it({ what: 'floorAp', kind: 'changed', id: fid, path: 'floors[' + fid + '].approved', site: pair(fid, fid), lockOp: true }));
      floorElems(items, fx, fy, fid, null, 'floors[' + fid + ']', lk);
      var fk = union(fx, fy), q, other = 0; for (q = 0; q < fk.length; q++) { k = fk[q]; if (k === 'approved' || has(LENS_COLS, k)) continue; if (!deq(fx[k], fy[k])) other++; }
      if (other) items.push(it({ what: 'floorEdit', kind: 'changed', id: fid, path: 'floors[' + fid + ']', site: pair(fid, fid), lock: lk }));
    }
    /* مرآةُ الجذر (الموقعُ النشط): تُسجَّل فقط حين لا نظيرَ لها في floors/months */
    var mirror = [];
    floorElems(mirror, { zones: a.zones, gates: a.gates, marks: a.marks, paths: a.paths }, { zones: b.zones, gates: b.gates, marks: b.marks, paths: b.paths }, null, null, 'root', { locked: false, why: 'root-mirror' });
    var ma = obj(a.months), mb = obj(b.months), ks = union(ma, mb);
    for (i = 0; i < ks.length; i++) {
      k = ks[i]; if (deq(ma[k], mb[k])) continue; var per = parseMonth(k);
      if (ma[k] === undefined) {
        items.push(it({ what: 'month', kind: 'added', id: k, path: 'months[' + k + ']', period: pair(null, per), lock: { locked: false, why: 'new-month' } }));
        if (ctx.read) { var y0 = Array.isArray(mb[k]) ? { c: 1, d: mb[k] } : obj(mb[k]), d0 = arr(y0.d), q0; for (q0 = 0; q0 < d0.length; q0++) { var fid0 = ID.floors(d0[q0], q0); items.push(it({ what: 'floor', kind: 'added', id: fid0, path: 'months[' + k + '].d[' + fid0 + ']', site: pair(null, fid0), period: pair(null, per), lock: { locked: false, why: 'read' } })); floorElems(items, {}, d0[q0], fid0, per, 'months[' + k + '].d[' + fid0 + ']', { locked: false, why: 'read' }); } }
        continue;
      }
      if (mb[k] === undefined) { items.push(it({ what: 'month', kind: 'removed', id: k, path: 'months[' + k + ']', period: pair(per, null), lock: { locked: per ? (closedPeriod(T, per.y, per.m, null) && !obj(ma[k]).mo) : false, why: 'past-month' } })); continue; }
      var x = Array.isArray(ma[k]) ? { c: 1, d: ma[k] } : obj(ma[k]), y = Array.isArray(mb[k]) ? { c: 1, d: mb[k] } : obj(mb[k]);
      var mlock = { locked: !!(per && closedPeriod(T, per.y, per.m, null) && !x.mo), why: 'past-month-without-mo' };
      if (!!x.mo !== !!y.mo) items.push(it({ what: 'monthLock', kind: 'changed', id: k, path: 'months[' + k + '].mo', period: pair(per, per), lockOp: true }));
      var dm = matchById(arr(x.d), arr(y.d), ID.floors), q2;
      for (q2 = 0; q2 < dm.added.length; q2++) items.push(it({ what: 'floor', kind: 'added', id: dm.added[q2].id, path: 'months[' + k + '].d[' + dm.added[q2].id + ']', site: pair(null, dm.added[q2].id), period: pair(null, per), lock: mlock }));
      for (q2 = 0; q2 < dm.removed.length; q2++) items.push(it({ what: 'floor', kind: 'removed', id: dm.removed[q2].id, path: 'months[' + k + '].d[' + dm.removed[q2].id + ']', site: pair(dm.removed[q2].id, null), period: pair(per, null), lock: mlock }));
      for (q2 = 0; q2 < dm.changed.length; q2++) {
        var dx = obj(dm.changed[q2].a), dy = obj(dm.changed[q2].b), did = dm.changed[q2].id, dl = { locked: mlock.locked || !!dx.approved, why: mlock.locked ? mlock.why : (dx.approved ? 'site-approved' : 'open') };
        if (!!dx.approved !== !!dy.approved) items.push(it({ what: 'floorAp', kind: 'changed', id: did, path: 'months[' + k + '].d[' + did + '].approved', site: pair(did, did), period: pair(per, per), lockOp: true }));
        floorElems(items, dx, dy, did, per, 'months[' + k + '].d[' + did + ']', dl);
      }
    }
    for (i = 0; i < mirror.length; i++) { var dup = false; for (k = 0; k < items.length; k++) if (items[k].what === 'element' && items[k].col === mirror[i].col && items[k].id === mirror[i].id) { dup = true; break; } if (!dup) { mirror[i].mirror = true; items.push(mirror[i]); } }
    if (!items.length) items.push(it({ what: 'resource', kind: kindOf(a, b), id: 'plan', path: '*' }));
    return items;
  };
