function ocptReportRoster(table) {
  return ocArray(table,ocObject(table+'_entry', {
    ekey:ocScalar('text'),name:ocScalar('text'),empno:ocScalar('scalar'),shift:ocScalar('text'),
    st:ocScalar('text'),pmk:ocScalar('text'),lvk:ocScalar('text'),
    tin:ocScalar('scalar'),tfrom:ocScalar('text'),treason:ocScalar('text'),
    // Historical read-only shape in442, not a new command input.
    loc:ocScalar('scalar')
  }));
}
function ocptReportShiftFields(table) {
  return {
    pulled:ocScalar('scalar'),roster:ocptReportRoster(table+'_roster'),
    leaders:ocMap(table+'_leaders',ocScalar('text')),
    sig:ocScalar('text'),
    def:ocObject(table+'_definition', {color:ocScalar('text'),tStart:ocScalar('text'),tEnd:ocScalar('text')}),
    rest:ocMap(table+'_rest',ocArray(table+'_rest_days',ocScalar('text'))),
    muk:ocMap(table+'_extra_duty',ocScalar('scalar')),
    restSrc:ocMap(table+'_rest_source',ocScalar('text')),
    tout:ocMap(table+'_transferred_out',ocObject(table+'_transfer', {to:ocScalar('text'),why:ocScalar('text')})),
    ap:ocScalar('scalar'),apBy:ocScalar('text'),apAt:ocScalar('text'),
    // Historical442 notification reader exposes the continued-from day.
    cont:ocScalar('scalar')
  };
}
function ocptReportDay(table) {
  // Old pulled/roster days and current shifts coexist losslessly. Do not run
  // rpLoad's destructive conversion or remove historical leaders.coord.
  return ocObject(table,Object.assign({
    created:ocScalar('scalar'),
    shifts:ocMap(table+'_shifts',ocObject(table+'_shift',ocptReportShiftFields(table+'_shift')))
  },ocptReportShiftFields(table+'_legacy')));
}
function ocptReportMonth(table) {
  return ocUnion(table, [
    ocScalar('scalar'),
    ocObject(table+'_record', {
      ap:ocScalar('scalar'),mo:ocScalar('scalar'),auto:ocScalar('scalar'),
      dopen:ocMap(table+'_open_days',ocScalar('scalar')),
      dshut:ocMap(table+'_shut_days',ocScalar('scalar')),
      perm:ocMap(table+'_permission_days',ocArray(table+'_employee_permission_days',ocScalar('scalar')))
    })
  ]);
}
