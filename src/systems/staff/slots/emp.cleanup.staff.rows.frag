  if (staffOn)
    ['bassam_staffing_v2', 'bassam_staffing_v3'].forEach(function (n) {
      var st = values[n];
      if (!isObj(st)) return;
      Object.keys(st).forEach(function (k) {
        var b = st[k];
        if (drop.has(k) && isObj(b) && (b.shift !== undefined || b.rest !== undefined)) delete st[k];
        else if (isObj(b))
          drop.forEach(function (x) {
            delete b[x];
          });
      });
    });
