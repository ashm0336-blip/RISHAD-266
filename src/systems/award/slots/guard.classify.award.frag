  /* ═══ جائزةُ التميز ═══ */
  C['bassam_award_v1'] = function (R, a, b, ctx) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    var ra = arr(a.recs), rb = arr(b.recs), i;
    if (!rb.length && ra.length && deq(strip(a, 'recs'), strip(b, 'recs'))) { R.op(ctx && ctx.imp ? 'import.replace' : (ctx && ctx.empsEmpty ? 'emp.record.bulk.delete' : '__unmapped:award.recs.wipe'), 'recs', 'wipe'); return; }
    var m = matchById(ra, rb, function (e) { return isObj(e) && e.id != null ? 'r:' + e.id : null; });
    for (i = 0; i < m.added.length; i++) R.op('award.new.create', 'recs[' + m.added[i].id + ']');
    for (i = 0; i < m.removed.length; i++) R.op(gone(ctx, isObj(m.removed[i].a) ? m.removed[i].a.ekey : null) ? (ctx && ctx.empsEmpty ? 'emp.record.bulk.delete' : 'emp.record.delete') : 'award.res.delete', 'recs[' + m.removed[i].id + ']');
    for (i = 0; i < m.changed.length; i++) {
      var c = m.changed[i], p = 'recs[' + c.id + ']', ks = union(c.a, c.b), q, other = [];
      for (q = 0; q < ks.length; q++) { if (deq(c.a[ks[q]], c.b[ks[q]])) continue; if (ks[q] === 'st') continue; other.push(ks[q]); }
      if (!deq(c.a.st, c.b.st)) {
        var to = String(c.b.st);
        if (to === 'معتمد') R.op('award.res.approve', p + '.st ' + c.a.st + '→' + to);
        else if (to === 'مستبعد') { R.op('award.res.reject', p + '.st ' + c.a.st + '→' + to); if (!(c.b.stWhy || c.b.why || c.b.reason)) R.flags.rejectNoReason = (R.flags.rejectNoReason || 0) + 1; }
        else R.op('__unmapped:award.st.back(reserved:award.res.reopen)', p + '.st ' + c.a.st + '→' + to, 'v24.3 F-09 — يُرفض ما دام محجوزاً');
      }
      if (other.length) R.op('award.res.edit', p + '.' + other.join('/'));
    }
    var rk = union(a, b); for (i = 0; i < rk.length; i++) if (rk[i] !== 'recs' && !deq(a[rk[i]], b[rk[i]])) R.res(rk[i], 'unknown-root-key');
  };
  C['bassam_award_docs_v2'] = function (R, a, b) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    var ks = union(a, b), i, g, x, y;
    for (i = 0; i < ks.length; i++) {
      g = ks[i]; x = a[g]; y = b[g]; if (deq(x, y)) continue;
      if (x === undefined) { R.op('award.doc.create', g, 'group-created'); continue; }
      if (y === undefined) { R.op('award.doc.delete', g, 'group-removed'); continue; }
      x = isObj(x) ? x : {}; y = isObj(y) ? y : {};
      var sx = arr(x.secs), sy = arr(y.secs), meta = 0, q, diff = 0, n = Math.max(sx.length, sy.length);
      if (!deq(x.title, y.title)) meta++; if (!deq(x.lead, y.lead)) meta++; if (!deq(x.foot, y.foot)) meta++;
      for (q = 0; q < n; q++) if (!deq(sx[q], sy[q])) diff++;
      var reset = (meta === 3 && !deq(sx, sy)) || (n >= 2 && diff === n && meta >= 1);                  /* كلُّ الأقسام تبدّلت ومعها الترويسة = استبدالٌ كامل */
      if (reset) { R.op('award.doc.reset', g, 'full-replace-shape'); continue; }
      if (!deq(sx, sy)) { if (sy.length > sx.length && prefixEq(sx, sy)) R.op('award.doc.create', g + '.secs', 'appended'); else if (sy.length < sx.length) R.op('award.doc.delete', g + '.secs'); else R.op('award.doc.edit', g + '.secs'); }
      if (meta) R.op('award.doc.edit', g + '.meta');
    }
  };
