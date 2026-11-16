  /* المصدر: المسجدُ الذي لا يقرؤه الفاعل يُحجب بأيامه وأقفاله */
  'bassam_dstats_v1': {
    on: function (V) { return V.restrict.Source && !(V.sources.haram && V.sources.nabawi); },
    proj: function (v, V) {
      if (!isObj(v)) return v; var o = {}, q;
      for (q in v) {
        if ((q === 'haram' || q === 'nabawi') && !V.sources[q]) continue;
        if (q === 'locks' && isObj(v.locks)) { var L = {}, lk; for (lk in v.locks) { var s = String(lk).split('|')[0]; if ((s === 'haram' || s === 'nabawi') && !V.sources[s]) continue; L[lk] = v.locks[lk]; } o.locks = L; continue; }
        o[q] = v[q];
      }
      return o;
    },
    merge: function (c, n, V) {
      if (!isObj(n)) return n; c = isObj(c) ? c : {};
      var o = enfShallow(n), s, lk, L = isObj(n.locks) ? enfShallow(n.locks) : {}, hadL = Object.prototype.hasOwnProperty.call(n, 'locks') || isObj(c.locks);
      ['haram', 'nabawi'].forEach(function (s0) { if (V.sources[s0]) return; if (c[s0] !== undefined) o[s0] = c[s0]; else delete o[s0]; });
      for (lk in L) { s = String(lk).split('|')[0]; if ((s === 'haram' || s === 'nabawi') && !V.sources[s]) delete L[lk]; }
      if (isObj(c.locks)) for (lk in c.locks) { s = String(lk).split('|')[0]; if ((s === 'haram' || s === 'nabawi') && !V.sources[s]) L[lk] = c.locks[lk]; }
      if (hadL) o.locks = L;
      return o;
    }
  },
