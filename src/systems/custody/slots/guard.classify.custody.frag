  /* ═══ العهد ═══ */
  var MOVE_KEY = { out: 'cust.move.issue', 'in': 'cust.move.return', dmg: 'cust.move.damage', lost: 'cust.move.lost' };
  C['bassam_custody_v1'] = function (R, a, b, ctx) {
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    var ia = arr(a.items), ib = arr(b.items), m = matchById(ia, ib, function (e) { return isObj(e) && e.name != null && e.name !== '' ? 'n:' + e.name : null; }), i;
    var ren = Math.min(m.added.length, m.removed.length);                                                /* إعادةُ تسمية صنف: زوالٌ وظهورٌ بعددٍ واحد */
    for (i = 0; i < ren; i++) R.op('ref.custody_type.edit', 'items[' + m.removed[i].id + '→' + m.added[i].id + ']', 'rename');
    for (i = ren; i < m.added.length; i++) R.op('ref.custody_type.create', 'items[' + m.added[i].id + ']');
    for (i = ren; i < m.removed.length; i++) R.op('ref.custody_type.delete', 'items[' + m.removed[i].id + ']');
    for (i = 0; i < m.changed.length; i++) R.op('ref.custody_type.edit', 'items[' + m.changed[i].id + ']');
    var ma = arr(a.moves), mb = arr(b.moves);
    if (deq(ma, mb)) { /* لا شيء في الحركات */ }
    else if (!mb.length && ma.length && deq(strip(a, 'moves'), strip(b, 'moves'))) R.op(ctx && ctx.imp ? 'import.replace' : (ctx && ctx.empsEmpty ? 'emp.record.bulk.delete' : '__unmapped:custody.moves.wipe'), 'moves', 'wipe');
    else if (mb.length > ma.length && prefixEq(ma, mb)) { for (i = ma.length; i < mb.length; i++) { var t = isObj(mb[i]) ? String(mb[i].t) : ''; R.op(MOVE_KEY[t] || ('__unmapped:custody.move.t=' + t), 'moves[' + i + '].t=' + t); } }
    else if (mb.length < ma.length && goneOnly(ma.map(function (mv) { return isObj(mv) ? mv.eid : null; }), mb.map(function (mv) { return isObj(mv) ? mv.eid : null; }), ctx) && deq(ma.filter(function (mv) { return !gone(ctx, isObj(mv) ? mv.eid : null); }), mb)) R.op(ctx && ctx.empsEmpty ? 'emp.record.bulk.delete' : 'emp.record.delete', 'moves', 'cleanup-gone');
    else if (mb.length === ma.length && ren > 0) { var onlyItem = true; for (i = 0; i < ma.length && onlyItem; i++) if (!deq(ma[i], mb[i]) && !deq(strip(ma[i], 'item'), strip(mb[i], 'item'))) onlyItem = false; if (onlyItem) R.op('ref.custody_type.edit', 'moves[].item', 'rename-cascade'); else R.res('moves', 'non-append-change'); }
    else R.res('moves', 'non-append-change');
    var ks = union(a, b); for (i = 0; i < ks.length; i++) if (ks[i] !== 'items' && ks[i] !== 'moves' && !deq(a[ks[i]], b[ks[i]])) R.res(ks[i], 'unknown-root-key');
  };
