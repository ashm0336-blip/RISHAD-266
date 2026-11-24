  {
    resource:'bassam_dreport_v1',name:'dailyReports',
    period:{root:1,index:osPeriodIndex,ctx:osPeriodCtx,summary:osSumReport,kpi:osKpiReport,me:'monthWeek'},   // V7 · 53: كلُّ يومٍ وعلامةُ كلِّ شهرٍ فترة (019w)
    schema:ocMap('ops_daily_reports',null, {
      fixed:{__ldcs:ocMap('ops_report_leader_callsigns',ocScalar('text'))},
      patterns:[
        {pattern:OS_RX_MCTL,schema:ocptReportMonth('ops_report_month')},   // V7 · 53 تقويم: m:YYYY-MM · YYYY-MM-DD وحدهما (019p0) — مفتاحٌ هجريٌّ من عميلٍ قديم يُرفض
        {pattern:OS_RX_DAY,schema:ocptReportDay('ops_report_day')}
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
