  /* ═══ التقرير اليومي ═══ */
  function attKey(r) { if (!isObj(r)) return null; var st = String(r.st || 'pr'); if (st === 'ab') return 'report.att.absence'; if (st === 'lv') return 'report.att.leave'; if (st === 'pm') return String(r.pmk || 'out') === 'in' ? 'report.att.late_in' : 'report.att.early_out'; return null; }
  function classifyRoster(R, la, lb, p, pulledNow, toutGain) {
    var m = matchById(la, lb, function (e) { return isObj(e) && e.ekey != null ? String(e.ekey) : null; }), i, c, f, ks;
    for (i = 0; i < m.added.length; i++) { var nb = m.added[i].b; R.op(isObj(nb) && nb.tin ? 'report.transfer' : (pulledNow ? 'report.create' : 'report.edit'), p + '[' + m.added[i].id + ']', 'row-added'); }
    for (i = 0; i < m.removed.length; i++) R.op(toutGain[m.removed[i].id] ? 'report.transfer' : 'report.edit', p + '[' + m.removed[i].id + ']', 'row-removed');
    for (i = 0; i < m.changed.length; i++) {
      c = m.changed[i]; ks = union(c.a, c.b);
      var stCh = !deq(c.a.st, c.b.st), pmCh = !deq(c.a.pmk, c.b.pmk), lvCh = !deq(c.a.lvk, c.b.lvk), other = [];
      for (f = 0; f < ks.length; f++) { var fk = ks[f]; if (deq(c.a[fk], c.b[fk])) continue; if (fk === 'st' || fk === 'pmk' || fk === 'lvk') continue; if (fk === 'tin' || fk === 'tfrom' || fk === 'treason') { R.op('report.transfer', p + '[' + c.id + '].' + fk); continue; } other.push(fk); }
      if (stCh) R.op(attKey(c.b) || attKey(c.a) || 'report.edit', p + '[' + c.id + '].st ' + (c.a.st || 'pr') + '→' + (c.b.st || 'pr'));
      else if (pmCh && String(c.b.st) === 'pm') R.op(attKey(c.b), p + '[' + c.id + '].pmk');
      else if (lvCh && String(c.b.st) === 'lv') R.op('report.att.leave', p + '[' + c.id + '].lvk');
      else if (pmCh || lvCh) R.op('report.edit', p + '[' + c.id + '].pmk/lvk');
      if (other.length) R.op('report.edit', p + '[' + c.id + '].' + other.join('/'));
    }
  }
  function classifyShift(R, x, y, p) {
    x = isObj(x) ? x : {}; y = isObj(y) ? y : {};
    var pulledNow = !x.pulled && !!y.pulled, ks = union(x, y), i, f, toutGain = {}, ta = isObj(x.tout) ? x.tout : {}, tb = isObj(y.tout) ? y.tout : {}, tk;
    for (tk in tb) if (!deq(ta[tk], tb[tk])) toutGain[tk] = 1;
    for (i = 0; i < ks.length; i++) {
      f = ks[i]; if (deq(x[f], y[f])) continue;
      if (f === 'ap' || f === 'apAt' || f === 'apBy') { if (f === 'ap' || deq(x.ap, y.ap)) R.op(y.ap ? 'report.approve' : 'report.reopen', p + '.' + f); continue; }
      if (f === 'tout') { R.op('report.transfer', p + '.tout'); continue; }
      if (f === 'roster') { classifyRoster(R, arr(x.roster), arr(y.roster), p + '.roster', pulledNow, toutGain); continue; }
      if (pulledNow) { R.op('report.create', p + '.' + f, 'pull'); continue; }                          /* سحبُ الوردية: pulled · sig · def · rest · muk … عمليةٌ واحدة */
      R.op('report.edit', p + '.' + f);                                                                /* leaders · rest · restSrc · muk */
    }
  }
  C['bassam_dreport_v1'] = function (R, a, b, ctx) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    if (emptyObj(b) && !emptyObj(a) && ctx && (ctx.imp || ctx.empsEmpty)) { R.op(ctx.imp ? 'import.replace' : 'emp.record.bulk.delete', '*', 'wipe'); return; }
    var ks = union(a, b), i, k, x, y;
    for (i = 0; i < ks.length; i++) {
      k = ks[i]; x = a[k]; y = b[k]; if (deq(x, y)) continue;
      if (k === '__ldcs') { R.op('report.edit', k); continue; }
      if (/^m:/.test(k)) { x = isObj(x) ? x : {}; y = isObj(y) ? y : {}; classifyMonthRec(R, x, y, k, 'report.approve', 'report.reopen'); if (!deq(x.perm, y.perm)) R.anyOf(['report.att.late_in', 'report.att.early_out'], k + '.perm', 'rule.report.permission_quota (v24.3 F-03)'); continue; }
      if (x === undefined) { R.op('report.create', k); continue; }
      if (y === undefined) { R.op('report.day.delete', k, 'v24.3 F-08 (drRsDo)'); continue; }
      if (!isObj(x) || !isObj(y)) { R.res(k, 'shape'); continue; }
      var sx = isObj(x.shifts) ? x.shifts : {}, sy = isObj(y.shifts) ? y.shifts : {}, sk = union(sx, sy), q;
      for (q = 0; q < sk.length; q++) {
        var sh = sk[q]; if (deq(sx[sh], sy[sh])) continue;
        var p = k + '.shifts[' + sh + ']';
        if (sx[sh] === undefined) { var ro = isObj(sy[sh]) ? arr(sy[sh].roster) : [], tin = false, z; for (z = 0; z < ro.length; z++) if (isObj(ro[z]) && ro[z].tin) tin = true; R.op(tin ? 'report.transfer' : 'report.create', p, 'shift-added'); continue; }
        if (sy[sh] === undefined) { R.op('__unmapped:dreport.shift.delete', p); continue; }
        classifyShift(R, sx[sh], sy[sh], p);
      }
      var dk = union(x, y); for (q = 0; q < dk.length; q++) if (dk[q] !== 'shifts' && !deq(x[dk[q]], y[dk[q]])) { if (dk[q] === 'created') R.tec(k + '.created'); else R.res(k + '.' + dk[q], 'unlisted-day-field'); }
    }
  };
