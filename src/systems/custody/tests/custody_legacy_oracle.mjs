/* Test-only inverse projection of normalized custody rows to the historical
   items/moves document. Copied verbatim from workers/parts/019a-custody.js
   before removing its unreferenced production definition.
   Source function SHA-256: 7519a4b9ebf1f6de15faddbd6a51787586e7d825e1763e342138e376b89afc86
   Current export/restore APIs remain normalized; no Worker uses this oracle. */
function cuInflate(rows) {
  var names = new Map(
      rows.items.map(function (r) {
        return [r.item_id, r.name];
      }),
    ),
    issues = new Map(
      rows.issues.map(function (r) {
        return [r.issue_id, r];
      }),
    );
  return {
    items: rows.items.map(function (r) {
      var x = { name: r.name };
      if (r.presence_mask & 1) x.qty = r.qty;
      if (r.presence_mask & 2) x.prefix = r.prefix;
      if (r.presence_mask & 4) x.color = r.color;
      return x;
    }),
    moves: rows.moves
      .slice()
      .sort(function (a, b) {
        return a.sequence - b.sequence;
      })
      .map(function (r) {
        var x = {
          t: r.kind,
          eid: r.holder_key,
          item: names.get(r.item_id),
          ser: issues.get(r.issue_id).serial,
          y: r.hijri_year,
          m: r.hijri_month,
          d: r.hijri_day,
        };
        var opts = {
          cond: 'condition',
          note: 'note',
          color: 'color_snapshot',
          by: 'actor_label',
          nid: 'holder_nid_snapshot',
          empno: 'holder_empno_snapshot',
          name: 'holder_name_snapshot',
        };
        Object.keys(opts).forEach(function (k, i) {
          if (r.presence_mask & (1 << i)) x[k] = r[opts[k]];
        });
        return x;
      }),
  };
}

export const CU_LEGACY_ORACLE_SOURCE_SHA256="7519a4b9ebf1f6de15faddbd6a51787586e7d825e1763e342138e376b89afc86";
export {cuInflate};
