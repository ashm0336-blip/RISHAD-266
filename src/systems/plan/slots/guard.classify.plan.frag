  /* ═══ الخطة التشغيلية ═══ */
  C['bassam_plan_v1'] = function (R, a, b, ctx) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    var m = matchById(arr(a.floors), arr(b.floors), ID.floors), i, k;
    for (i = 0; i < m.added.length; i++) R.op('site.create', 'floors[' + m.added[i].id + ']');
    for (i = 0; i < m.removed.length; i++) R.op('site.delete', 'floors[' + m.removed[i].id + ']');
    for (i = 0; i < m.changed.length; i++) classifyFloor(R, m.changed[i].a, m.changed[i].b, 'floors[' + m.changed[i].id + ']', 'plan', ctx);
    var cols = ['zones', 'gates', 'marks', 'paths'];
    for (i = 0; i < cols.length; i++) if (!deq(a[cols[i]], b[cols[i]])) classifyLensCol(R, cols[i], arr(a[cols[i]]), arr(b[cols[i]]), cols[i], ctx);   /* مرآةُ الموقع النشط في الجذر */
    var ma = isObj(a.months) ? a.months : {}, mb = isObj(b.months) ? b.months : {}, ks = union(ma, mb);
    for (i = 0; i < ks.length; i++) {
      k = ks[i]; if (deq(ma[k], mb[k])) continue;
      if (ma[k] === undefined) { R.op('plan.create', 'months[' + k + ']'); continue; }
      if (mb[k] === undefined) { R.op('plan.delete', 'months[' + k + ']'); continue; }
      var x = normMonth(ma[k]), y = normMonth(mb[k]);
      if (!!x.mo !== !!y.mo) R.op(y.mo ? 'plan.reopen' : 'plan.approve', 'months[' + k + '].mo');
      var mm = matchById(arr(x.d), arr(y.d), ID.floors), q;
      for (q = 0; q < mm.added.length; q++) R.op('site.create', 'months[' + k + '].d[' + mm.added[q].id + ']');
      for (q = 0; q < mm.removed.length; q++) R.op('site.delete', 'months[' + k + '].d[' + mm.removed[q].id + ']');
      for (q = 0; q < mm.changed.length; q++) classifyFloor(R, mm.changed[q].a, mm.changed[q].b, 'months[' + k + '].d[' + mm.changed[q].id + ']', 'plan', ctx);
    }
    var da = isObj(a.delMonths) ? a.delMonths : {}, db = isObj(b.delMonths) ? b.delMonths : {}; ks = union(da, db);
    for (i = 0; i < ks.length; i++) { if (deq(da[ks[i]], db[ks[i]])) continue; R.op(db[ks[i]] === undefined ? 'plan.create' : 'plan.delete', 'delMonths[' + ks[i] + ']'); }
    if (!deq(a.cfg, b.cfg)) R.tec('cfg'); if (!deq(a.pMig, b.pMig)) R.tec('pMig');
    ks = union(a, b); for (i = 0; i < ks.length; i++) { k = ks[i]; if (k === 'floors' || k === 'months' || k === 'delMonths' || k === 'cfg' || k === 'pMig' || LENS_COLS[k]) continue; if (!deq(a[k], b[k])) R.res(k, 'unknown-root-key'); }
  };
