  X.awardItems = function (a, b) {
    var m = matchById(arr(obj(a).recs), arr(obj(b).recs), function (e) { return isObj(e) && e.id != null ? String(e.id) : null; }), items = [], i;
    for (i = 0; i < m.added.length; i++) items.push(it({ what: 'nomination', kind: 'added', id: m.added[i].id, path: 'recs[' + m.added[i].id + ']', owner: pair(null, str(obj(m.added[i].b).ekey)) }));
    for (i = 0; i < m.removed.length; i++) items.push(it({ what: 'nomination', kind: 'removed', id: m.removed[i].id, path: 'recs[' + m.removed[i].id + ']', owner: pair(str(obj(m.removed[i].a).ekey), null) }));
    for (i = 0; i < m.changed.length; i++) items.push(it({ what: 'nomination', kind: 'changed', id: m.changed[i].id, path: 'recs[' + m.changed[i].id + ']', owner: pair(str(obj(m.changed[i].a).ekey), str(obj(m.changed[i].b).ekey)) }));
    if (!items.length) items.push(it({ what: 'resource', kind: kindOf(a, b), id: 'award', path: '*' }));
    return items;
  };
