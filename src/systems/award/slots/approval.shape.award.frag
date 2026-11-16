  /* الجائزة: حالة الترشيح من ثلاثٍ لا رابعَ لها، والترشيح الجديد يبدأ «قيد التحكيم» */
  award: function (oa, nb) {
    var no = Array.isArray(nb.recs) ? nb.recs : [], oo = Array.isArray(oa.recs) ? oa.recs : [], i;
    var old = {};
    for (i = 0; i < oo.length; i++) if (isObj(oo[i]) && oo[i].id != null) old[String(oo[i].id)] = oo[i];
    for (i = 0; i < no.length; i++) {
      var r = no[i]; if (!isObj(r)) continue;
      if (('st' in r) && !AW_ST[String(r.st)]) return 'approve';
      if (!old[String(r.id)] && String(r.st) !== 'قيد التحكيم') return 'approve';   /* ترشيحٌ يُولد معتمَداً */
    }
    return '';
  }
