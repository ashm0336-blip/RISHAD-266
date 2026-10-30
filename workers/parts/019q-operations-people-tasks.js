/* Operational source contracts only. Every container has its own fixed table.
   These descriptors preserve transport shape/order/absence/null; they do not
   grant writes, normalize legacy identities or run the old client migrations.
   Source: 019c employee transition;031 fields;062c/070–074 Tasks;
   Employees.logic and DailyReport.logic. The common compiler owns execution. */
function ocptWho(table) {
  return ocObject(table, {u:ocScalar('text'),e:ocScalar('text'),n:ocScalar('text')});
}
function ocptTaskDecision(table) {
  return ocObject(table, {st:ocScalar('text'),at:ocScalar('number'),by:ocptWho(table+'_by'),sub:ocScalar('number'),why:ocScalar('text')});
}
function ocptTaskCancellation(table) {
  return ocObject(table, {at:ocScalar('number'),by:ocptWho(table+'_by'),why:ocScalar('text'),rec:ocScalar('scalar')});
}
function ocptTaskManagement(table) {
  return ocObject(table, {
    v:ocScalar('number'),
    by:ocptWho(table+'_by'),
    pol:ocObject(table+'_policy', {m:ocScalar('text'),n:ocScalar('number'),steps:ocArray(table+'_policy_steps',ocScalar('text'))}),
    rv:ocptWho(table+'_reviewer'),
    dec:ocScalar('scalar'),
    needs:ocArray(table+'_needs',ocScalar('text')),
    elig:ocObject(table+'_eligibility', {res:ocScalar('text'),code:ocScalar('text'),at:ocScalar('number')}),
    win:ocObject(table+'_window', {early:ocScalar('number'),late:ocScalar('number')}),
    ext:ocArray(table+'_extensions',ocObject(table+'_extension', {at:ocScalar('number'),by:ocptWho(table+'_extension_by'),from:ocScalar('number'),to:ocScalar('number'),why:ocScalar('text')})),
    rev:ocptTaskDecision(table+'_decision'),
    revh:ocArray(table+'_decision_history',ocptTaskDecision(table+'_history_decision')),
    asg:ocScalar('text'),
    can:ocptTaskCancellation(table+'_cancellation'),
    canh:ocArray(table+'_cancellation_history',ocptTaskCancellation(table+'_old_cancellation')),
    re:ocObject(table+'_reassignment', {at:ocScalar('number'),by:ocptWho(table+'_reassign_by'),why:ocScalar('text'),to:ocObject(table+'_reassign_target', {e:ocScalar('text'),n:ocScalar('text')})}),
    from:ocObject(table+'_predecessor', {id:ocScalar('scalar'),e:ocScalar('text'),at:ocScalar('number')}),
    relink:ocArray(table+'_relinks',ocObject(table+'_relink', {at:ocScalar('number'),by:ocptWho(table+'_relink_by'),from:ocScalar('text'),to:ocScalar('text')})),
    rec:ocObject(table+'_recurrence', {
      id:ocScalar('text'),ver:ocScalar('number'),t:ocScalar('text'),
      wd:ocArray(table+'_recurrence_weekdays',ocScalar('number')),
      md:ocScalar('scalar'),n:ocScalar('number'),from:ocScalar('text'),to:ocScalar('text'),
      paused:ocScalar('scalar'),stop:ocScalar('scalar'),by:ocptWho(table+'_recurrence_by'),
      asg:ocArray(table+'_recurrence_assignees',ocScalar('text'))
    }),
    idem:ocScalar('text'),det:ocScalar('scalar')
  });
}
function ocptTaskSelf(table) {
  return ocObject(table, {
    at:ocScalar('number'),why:ocScalar('text'),exp:ocScalar('number'),ack:ocScalar('number'),
    stall:ocObject(table+'_stall', {at:ocScalar('number'),why:ocScalar('text')}),
    q:ocArray(table+'_idempotency',ocScalar('text'))
  });
}
function ocptTaskProof(table) {
  return ocObject(table, {
    imgs:ocArray(table+'_images',ocScalar('text')),note:ocScalar('text'),at:ocScalar('number'),
    st:ocMap(table+'_steps',ocScalar('number')),sub:ocScalar('number'),draft:ocScalar('scalar'),
    h:ocArray(table+'_history',ocObject(table+'_submission', {
      at:ocScalar('number'),imgs:ocArray(table+'_submission_images',ocScalar('text')),
      note:ocScalar('text'),n:ocScalar('number')
    })),
    meta:ocArray(table+'_image_metadata',ocObject(table+'_image_metadata_entry', {
      img:ocScalar('text'),at:ocScalar('number'),lat:ocScalar('number'),lng:ocScalar('number'),acc:ocScalar('number')
    }))
  });
}
function ocptTaskRow(table) {
  // 071:135 creation and Tasks.logic:3012 preserve the established tuple.
  // Slot13 is an existing number|string business identity, not a SQL row key.
  return ocTuple(table, [
    ocScalar('text'),ocScalar('text'),ocScalar('text'),ocScalar('text'),
    ocScalar('text'),ocScalar('text'),
    ocArray(table+'_performance',ocScalar('text')),
    ocArray(table+'_initials',ocScalar('text')),
    ocScalar('text'),ocScalar('text'),ocScalar('number'),ocScalar('number'),
    ocScalar('number'),ocScalar('scalar'),ocScalar('scalar'),ocScalar('number'),
    ocScalar('number'),ocScalar('scalar'),ocScalar('text'),ocScalar('text'),
    ocptTaskSelf(table+'_self'),ocptTaskProof(table+'_proof'),
    ocScalar('text'),ocptTaskManagement(table+'_management')
  ]);
}
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
  {
    resource:'bassam_tasks_v1',name:'tasks',
    schema:ocMap('ops_tasks',null, {patterns:[
      {pattern:'^\\d{4}-\\d{1,2}-\\d{1,2}$',schema:ocArray('ops_task_day',ocptTaskRow('ops_task_row'))}
    ]})
  },
  {
    resource:'bassam_tasks_locks_v1',name:'taskLocks',
    schema:ocMap('ops_task_locks',ocUnion('ops_task_lock', [
      ocScalar('scalar'),ocObject('ops_task_lock_record',{mo:ocScalar('scalar')})
    ]))
  }
];
