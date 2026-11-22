  var pl = values.bassam_plan_v1;
  if (isObj(pl)) {
    fd(pl);
    if (Array.isArray(pl.floors)) pl.floors.forEach(fd);
    if (isObj(pl.months))
      Object.keys(pl.months).forEach(function (k) {
        var a = pl.months[k],
          d = Array.isArray(a) ? a : a && a.d;
        if (Array.isArray(d)) d.forEach(fd);
      });
  }
