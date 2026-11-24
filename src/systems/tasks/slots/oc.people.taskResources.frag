  {
    resource:'bassam_tasks_v1',name:'tasks',
    period:{root:1,index:osPeriodIndex,summary:osSumTasks},   // V7 · 53: كلُّ يومٍ فترة (019w)
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
