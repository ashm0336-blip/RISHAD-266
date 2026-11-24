function empApplySchedule(values, meta, validKeys, result) {
  var rows = meta.schedule || [];
  if (!rows.length) return;
  if (!values.__staffOn) {
    result.warnings.push('schedule-disabled');
    return;
  }
  var mk = calGYm(meta.year, meta.month),   /* V7 · 53 تقويم: شهرُ الجدول ISO YYYY-MM كما في empPrepareTransition (كان «2026-3» غيرَ مبطَّن) */
    locks = values.bassam_staffing_locks_v1 || {};
  if (locks[mk]) {
    result.warnings.push('schedule-locked');
    return;
  }
  var options = values.bassam_shift_options_v1;
  if (
    !Array.isArray(options) ||
    !options.length ||
    !options.every(function (x) {
      return x && x.name && x.color;
    })
  )
    options = [
      { name: 'الوردية الأولى', color: '#b99751' },
      { name: 'الوردية الثانية', color: '#0891b2' },
      { name: 'الوردية الثالثة', color: '#4f46e5' },
      { name: 'الوردية الرابعة', color: '#166534' },
    ];
  var palette = ['#be185d', '#166534', '#7c3aed', '#b45309', '#0e7490'],
    days = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
    st = values.bassam_staffing_v3 || {},
    bucket = st[mk] || {},
    newOpt = 0,
    nShift = 0;
  rows.forEach(function (sr) {
    empShape(sr, ['key', 'shift', 'rest', 'cs', 'muk']);
    if (typeof sr.key !== 'string' || !validKeys.has(sr.key)) throw cuError('employee-transition-schedule-key');
    ['shift', 'rest', 'cs', 'muk'].forEach(function (k) {
      if (sr[k] !== undefined && typeof sr[k] !== 'string' && !(k === 'muk' && typeof sr[k] === 'boolean'))
        throw cuError('employee-transition-schedule-shape');
    });
    var entry = Object.assign({}, bucket[sr.key] || {});
    if (sr.shift) {
      var n = sr.shift.trim(),
        o = options.find(function (x) {
          return x.name === n || x.name === 'ال' + n || 'ال' + x.name === n;
        });
      if (!o && n.length >= 2) {
        o = { name: n, color: palette[(options.length + newOpt) % palette.length] };
        options = options.concat([o]);
        newOpt++;
      }
      if (o) {
        entry.shift = o.name;
        nShift++;
      } else result.warnings.push('schedule-shift-unknown');
    }
    if (sr.rest) {
      var txt = sr.rest.replace(/[أإآ]/g, 'ا'),
        found = [];
      days.forEach(function (d) {
        var bare = d.replace(/^ال/, '').replace(/[أإآ]/g, 'ا').replace(/ة$/, '[ةه]'),
          m = txt.match(new RegExp('(?:ال)?' + bare));
        if (m) found.push({ d: d, at: m.index });
      });
      found.sort(function (a, b) {
        return a.at - b.at;
      });
      var unique = Array.from(
        new Set(
          found.map(function (x) {
            return x.d;
          }),
        ),
      );
      if (unique.length) entry.rest = unique;
    }
    if (sr.cs) entry.cs = sr.cs.trim();
    if (sr.muk !== undefined && String(sr.muk).trim()) {
      var m = String(sr.muk).trim().replace(/[أإآ]/g, 'ا').replace(/ّ/g, '');
      entry.muk = /^(نعم|مكلف|منتدب|صح|صحيح|✓|✔|x|yes|true|1)$/i.test(m);
    }
    delete entry.leaves;
    if (entry.muk === undefined) entry.muk = false;
    bucket[sr.key] = entry;
  });
  st[mk] = bucket;
  values.bassam_staffing_v3 = st;
  if (newOpt || nShift) values.bassam_shift_options_v1 = options;
  result.counts.schedule = rows.length;
}
