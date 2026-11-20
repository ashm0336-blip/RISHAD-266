    if (staffOn) {
      var st = values.bassam_staffing_v3,
        lk = values.bassam_staffing_locks_v1;
      if (!isObj(st)) st = {};
      if (!isObj(lk)) lk = {};
      Object.keys(st).forEach(function (m) {
        var b = st[m];
        if (!isObj(b)) {
          delete st[m];
          delete lk[m];
          return;
        }
        Object.keys(b).forEach(function (k) {
          if (k !== '__shifts') delete b[k];
        });
        if (
          !Object.keys(b).some(function (k) {
            return k !== '__shifts';
          })
        ) {
          delete st[m];
          delete lk[m];
        }
      });
      values.bassam_staffing_v3 = st;
      values.bassam_staffing_locks_v1 = lk;
    }
