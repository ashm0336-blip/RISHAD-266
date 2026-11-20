  /* الخطة: علم الاعتماد منطقيّ، وعلم فتح الشهر واحدٌ لا غير */
  plan: function (oa, nb) {
    var fl = Array.isArray(nb.floors) ? nb.floors : [];
    for (var i = 0; i < fl.length; i++) if (isObj(fl[i]) && ('approved' in fl[i]) && typeof fl[i].approved !== 'boolean') return 'approve';
    var ms = isObj(nb.months) ? nb.months : {};
    for (var m in ms) {
      var mv = ms[m]; if (!isObj(mv)) continue;
      if (('mo' in mv) && mv.mo !== 1) return 'approve';
      var dd = Array.isArray(mv.d) ? mv.d : [];
      for (var j = 0; j < dd.length; j++) if (isObj(dd[j]) && ('approved' in dd[j]) && typeof dd[j].approved !== 'boolean') return 'approve';
    }
    return '';
  },
