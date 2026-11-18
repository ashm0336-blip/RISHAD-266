/* Operational source contracts only. Every container has its own fixed table.
   These descriptors preserve transport shape/order/absence/null; they do not
   grant writes, normalize legacy identities or run the old client migrations.
   Source: 019c employee transition;031 fields;062c/070–074 Tasks;
   Employees.logic and DailyReport.logic. The common compiler owns execution. */
@@SYS:oc.people.taskCodec@@function ocptReportRoster(table) {
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
var OC_PEOPLE_TASK_RESOURCES = [
  {
    resource:'bassam_employees_v1',name:'employees',
    schema:ocArray('ops_employees',ocUnion('ops_employee_entry', [
      //019c:112 explicitly accepts untouched historical string employees.
      ocScalar('text'),
      ocObject('ops_employee_record', {
        eid:ocScalar('text'),name:ocScalar('text'),nid:ocScalar('text'),phone:ocScalar('text'),
        empno:ocScalar('text'),email:ocScalar('text'),type:ocScalar('text'),work:ocScalar('text'),
        gender:ocScalar('text'),shift:ocScalar('text'),group:ocScalar('text'),
        account:ocScalar('text'),contact:ocScalar('text'),job:ocScalar('scalar')
      })
    ]))
  },
  {
    resource:'bassam_options_v1',name:'employeeOptions',
    schema:ocObject('ops_employee_options', {
      type:ocArray('ops_employment_types',ocScalar('text')),
      work:ocArray('ops_work_types',ocScalar('text'))
    })
  },
  {
    resource:'bassam_dreport_v1',name:'dailyReports',
    schema:ocMap('ops_daily_reports',null, {
      fixed:{__ldcs:ocMap('ops_report_leader_callsigns',ocScalar('text'))},
      patterns:[
        {pattern:'^m:\\d{4}-\\d{1,2}$',schema:ocptReportMonth('ops_report_month')},
        {pattern:'^\\d{4}-\\d{1,2}-\\d{1,2}$',schema:ocptReportDay('ops_report_day')}
      ]
      //__lv/__lvU have deletion readers but no proven current value shape.
      //Reject their presence before DDL rather than invent/drop business data.
    })
  },
  {resource:'bassam_leave_kinds_v1',name:'leaveKinds',schema:ocArray('ops_leave_kinds',ocScalar('text'))},
  {
    resource:'bassam_dr_grp_v1',name:'reportGroups',
    schema:ocObject('ops_report_groups', {on:ocScalar('scalar'),closed:ocMap('ops_report_closed_groups',ocScalar('scalar'))})
  },
@@SYS:oc.people.taskResources@@];
