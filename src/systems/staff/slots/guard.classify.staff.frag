  C['bassam_staffing_locks_v1'] = lockMap('staff.lock', 'staff.reopen');
  /* ═══ الجدول الشهري ═══ */
  function staffing(R, a, b, ctx) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    var ks = union(a, b), i, mk, x, y;
    for (i = 0; i < ks.length; i++) {
      mk = ks[i]; x = a[mk]; y = b[mk]; if (deq(x, y)) continue;
      if (x === undefined) { R.op('staff.create', mk); continue; }
      if (y === undefined) { R.op('staff.bulk.delete', mk, 'month-removed'); continue; }
      if (!isObj(x) || !isObj(y)) { R.res(mk, 'shape'); continue; }
      var eks = union(x, y), q, removed = [], cleaned = 0, rowsBefore = 0, ek, r0, r1, p;
      for (ek in x) if (ek !== '__shifts') rowsBefore++;
      for (q = 0; q < eks.length; q++) {
        ek = eks[q]; r0 = x[ek]; r1 = y[ek]; if (deq(r0, r1)) continue; p = mk + '[' + ek + ']';
        if (ek === '__shifts') { R.op(r1 !== undefined ? 'staff.lock' : 'staff.reopen', p, 'snapshot'); continue; }
        if (r0 === undefined) { R.op('staff.shift.assign', p, 'row-added (D-18)'); continue; }
        if (r1 === undefined) { if (gone(ctx, ek)) { cleaned++; R.op(ctx && ctx.empsEmpty ? 'emp.record.bulk.delete' : 'emp.record.delete', p, 'cleanup-gone'); } else removed.push(p); continue; }
        if (!isObj(r0) || !isObj(r1)) { R.res(p, 'shape'); continue; }
        var fs = union(r0, r1), z;
        for (z = 0; z < fs.length; z++) {
          var f = fs[z]; if (deq(r0[f], r1[f])) continue;
          if (f === 'shift') R.op('staff.shift.assign', p + '.shift');
          else if (f === 'rest' || f === 'leaves' || f === 'perm') R.op('staff.rest', p + '.' + f);
          else if (f === 'cs') R.op('staff.callsign.assign', p + '.cs');
          else if (f === 'muk') R.op('staff.tasking.assign', p + '.muk');
          else R.res(p + '.' + f, 'unlisted-field');
        }
      }
      if (removed.length && rowsBefore > 0 && removed.length + cleaned >= rowsBefore) R.op('staff.bulk.delete', mk, 'all-rows-removed');
      else if (removed.length >= 2) R.op('staff.bulk.delete', removed.join(' · '), 'n=' + removed.length);
      else for (q = 0; q < removed.length; q++) R.op('staff.delete', removed[q]);
    }
  }
  C['bassam_staffing_v3'] = staffing; C['bassam_staffing_v2'] = staffing;
