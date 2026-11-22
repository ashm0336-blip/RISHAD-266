  /* EMP_FIELDS: الجدولُ الشهري يكتب في سجل الموظفين حقلَي نوع العمل/التوظيف (والهوية القانونية eid) وحدها */
  if (rn === 'bassam_employees_v1' && diffs().length && diffs().every(EMP_FIELDS)) {
    for (i = 0; i < ds.length; i++) { f = ds[i].p.split('.').pop(); if (f === 'work') need['staff.work_type.assign'] = 1; else if (f === 'type') need['staff.employment_type.assign'] = 1; }
    var ks = Object.keys(need);
    if (!ks.length) return enfHeld(A, d, 'staff.work_type.assign') || enfHeld(A, d, 'staff.employment_type.assign') ? { keys: [enfHeld(A, d, 'staff.work_type.assign') ? 'staff.work_type.assign' : 'staff.employment_type.assign'], tag: 'via:EMP_FIELDS(eid)' } : null;
    for (i = 0; i < ks.length; i++) if (!enfHeld(A, d, ks[i])) return null;
    return { keys: ks, tag: 'via:EMP_FIELDS' };
  }
  /* CS_ONLY · SNAP_CS_ONLY: التقريرُ اليومي يُسند رمزَ النداء في الجدول (حقل cs وحده) */
  if ((rn === 'bassam_staffing_v3' && diffs().length && diffs().every(CS_ONLY)) || (rn === 'bassam_staffing_snap_v1' && diffs().length && diffs().every(SNAP_CS_ONLY))) {
@@SYS:enf.via.cs.dreport@@    if (enfHeld(A, d, 'staff.callsign.assign')) return { keys: ['staff.callsign.assign'], tag: 'via:CS_ONLY(staff)' };
    return null;
  }
