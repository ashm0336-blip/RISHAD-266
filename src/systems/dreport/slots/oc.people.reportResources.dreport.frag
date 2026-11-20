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
