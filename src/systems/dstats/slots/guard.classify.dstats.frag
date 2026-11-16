  /* ═══ الإحصائيات اليومية (عامّ) ═══ */
  C['bassam_dstats_v1'] = function (R, a, b) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    var ks = union(a, b), i, k, x, y, q;
    for (i = 0; i < ks.length; i++) {
      k = ks[i]; x = a[k]; y = b[k]; if (deq(x, y)) continue;
      if (k === 'haram' || k === 'nabawi') { x = isObj(x) ? x : {}; y = isObj(y) ? y : {}; var dk = union(x, y), n = 0; for (q = 0; q < dk.length; q++) if (!deq(x[dk[q]], y[dk[q]])) n++; if (n) R.op('dstats.' + k + '.entry', k, n + ' day(s)'); continue; }
      if (k === 'locks') { x = isObj(x) ? x : {}; y = isObj(y) ? y : {}; var lk = union(x, y); for (q = 0; q < lk.length; q++) { if (deq(x[lk[q]], y[lk[q]])) continue; var mt = /^(haram|nabawi)\|/.exec(lk[q]); if (!mt) { R.res('locks[' + lk[q] + ']', 'bad-lock-key'); continue; } classifyMonthRec(R, x[lk[q]], y[lk[q]], 'locks[' + lk[q] + ']', 'dstats.' + mt[1] + '.approve', 'dstats.' + mt[1] + '.reopen'); } continue; }
      R.res(k, 'unknown-root-key');
    }
  };
