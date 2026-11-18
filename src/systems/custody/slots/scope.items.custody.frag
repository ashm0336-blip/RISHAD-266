  X.custodyItems = function (a, b) {
    a = obj(a); b = obj(b); var items = [], i;
    var m = matchById(arr(a.items), arr(b.items), function (e) { return isObj(e) && e.name != null ? String(e.name) : null; });
    for (i = 0; i < m.added.length; i++) items.push(it({ what: 'custodyType', kind: 'added', id: m.added[i].id, path: 'items[' + m.added[i].id + ']' }));
    for (i = 0; i < m.removed.length; i++) items.push(it({ what: 'custodyType', kind: 'removed', id: m.removed[i].id, path: 'items[' + m.removed[i].id + ']' }));
    for (i = 0; i < m.changed.length; i++) items.push(it({ what: 'custodyType', kind: 'changed', id: m.changed[i].id, path: 'items[' + m.changed[i].id + ']' }));
    var ma = arr(a.moves), mb = arr(b.moves);
    for (i = ma.length; i < mb.length; i++) items.push(it({ what: 'move', kind: 'added', id: '#' + i, path: 'moves[' + i + ']', period: pair(null, ymd(mb[i])), lock: { locked: false, why: 'no-temporal-lock' } }));
    if (mb.length < ma.length) items.push(it({ what: 'move', kind: 'removed', id: 'moves', path: 'moves', lock: { locked: false, why: 'no-temporal-lock' } }));
    if (!items.length && !deq(a, b)) items.push(it({ what: 'resource', kind: 'changed', id: 'custody', path: '*' }));
    if (!items.length) items.push(it({ what: 'resource', kind: kindOf(a, b), id: 'custody', path: '*' }));
    return items;
  };
