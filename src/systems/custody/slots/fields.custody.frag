  /* ── A: العهد — cuAddItemType و cuHandOut و cuCloseItem وحدها ── */
  'bassam_custody_v1': { cols: {
    items: { closed: 1, req: ['name'], type: { name: 'str', qty: 'num', prefix: 'str', color: 'str' } },
    moves: { closed: 1, req: ['t', 'eid', 'item', 'ser', 'y', 'm', 'd'],
             /* cuEmpSnap/cuHandOut write these optional historical snapshots.
                They are text, not new employee identities: no uniqueness or NID
                format is imposed, and an unchanged legacy row stays untouched. */
             type: { t: 'str', eid: 'str', item: 'str', ser: 'str', color: 'str', y: 'num', m: 'num', d: 'num', cond: 'str', note: 'str', by: 'str', nid: 'str', empno: 'str', name: 'str' },
             maxLen: { nid: 4096, empno: 4096, name: 4096 },
             enum: { t: ['out', 'in', 'dmg', 'lost'] } } } },
