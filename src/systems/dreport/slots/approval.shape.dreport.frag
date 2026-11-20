  /* التقرير اليومي: اعتماد الوردية ap=1 ومعه apAt و apBy نصّان — والفكّ يحذفها جميعاً */
  dreport: function (oa, nb) {
    for (var d in nb) {
      var rec = nb[d]; if (!isObj(rec) || !isObj(rec.shifts)) continue;
      for (var sh in rec.shifts) {
        var r = rec.shifts[sh]; if (!isObj(r)) continue;
        if (!r.ap) { if (('apAt' in r) || ('apBy' in r)) return 'approve'; continue; }
        if (r.ap !== 1 && r.ap !== true) return 'approve';
        if (typeof r.apAt !== 'string' || !r.apAt) return 'approve';
        if (typeof r.apBy !== 'string' || !r.apBy) return 'approve';
      }
    }
    return '';
  },
