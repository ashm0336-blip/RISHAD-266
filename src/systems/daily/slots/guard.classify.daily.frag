  /* ═══ الجولات اليومية ═══ */
  function classifyShAp(R, x, y, p) { x = isObj(x) ? x : {}; y = isObj(y) ? y : {}; var ks = union(x, y), i; for (i = 0; i < ks.length; i++) { if (deq(x[ks[i]], y[ks[i]])) continue; var on = isObj(y[ks[i]]) && !!y[ks[i]].ap; R.op(on ? 'round.approve' : 'round.reopen', p + '[' + ks[i] + ']'); } }
  function classifyDay(R, x, y, k, ctx) {
    if (x === undefined) { R.op('round.create', k); return; }
    if (y === undefined) { R.op('round.delete', k); return; }
    if (!isObj(x) || !isObj(y)) { R.res(k, 'shape'); return; }
    var synced = !deq(x.synced, y.synced) && y.synced != null, ks = union(x, y), i, f;
    for (i = 0; i < ks.length; i++) {
      f = ks[i]; if (deq(x[f], y[f])) continue;
      if (f === 'ap') { R.op(y.ap ? 'round.approve' : 'round.reopen', k + '.ap'); continue; }
      if (f === 'shAp') { classifyShAp(R, x.shAp, y.shAp, k + '.shAp'); continue; }
      if (f === 'synced') { R.op('round.sync.plan', k + '.synced'); continue; }
      if (f === 'd') {
        if (synced) { R.op('round.sync.plan', k + '.d', 'collapsed'); continue; }
        var m = matchById(arr(x.d), arr(y.d), function (e, i2) { return '#' + i2; }), q;
        for (q = 0; q < m.added.length; q++) R.op('round.edit', k + '.d[' + m.added[q].id + ']', 'site-added');
        for (q = 0; q < m.removed.length; q++) R.op('round.edit', k + '.d[' + m.removed[q].id + ']', 'site-removed');
        for (q = 0; q < m.changed.length; q++) classifyFloor(R, m.changed[q].a, m.changed[q].b, k + '.d[' + m.changed[q].id + ']', 'rounds', ctx);
        continue;
      }
      if (f === 'off') { R.op('__unmapped:rounds.day.off(reserved:round.day.disable)', k + '.off', 'v24.3 F-05 — محجوز؛ لا قدرة يومية في المصدر'); continue; }
      if (f === 'mvLog') { R.op('lens.dist.assign.edit', k + '.mvLog', 'coverage-log'); continue; }
      if (f === 't' || f === 'from' || f === 'imp' || f === 'auto') { R.op('round.edit', k + '.' + f); continue; }
      R.res(k + '.' + f, 'unlisted-day-field');
    }
  }
  C['bassam_rounds_v1'] = function (R, a, b, ctx) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    var ks = union(a, b), i, k;
    for (i = 0; i < ks.length; i++) {
      k = ks[i]; if (deq(a[k], b[k])) continue;
      if (k === '__pMig') { R.tec(k); continue; }
      if (/^m:(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])$/.test(k)) {   /* V7 · 53 تقويم: ISO وحده — الهجريُّ من عميلٍ قديم unknown-root-key */
      if (b[k] === undefined && a[k] && normLock(a[k]).ap) { R.op('round.reopen', k, 'month-record-removed'); continue; } classifyMonthRec(R, a[k], b[k], k, 'round.approve', 'round.reopen'); continue; }
      if (/^(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(k)) { classifyDay(R, a[k], b[k], k, ctx); continue; }
      if (/^(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])-/.test(k)) { R.op(b[k] === undefined ? 'round.delete' : 'round.edit', k, 'legacy-key'); continue; }
      R.res(k, 'unknown-root-key');
    }
  };
