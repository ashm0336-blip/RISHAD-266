  {
    resource:'bassam_tasks_v1',name:'tasks',
    period:{root:1,index:osPeriodIndex,summary:osSumTasks},   // V7 · 53: كلُّ يومٍ فترة (019w)
    schema:ocMap('ops_tasks',null, {patterns:[
      {pattern:OS_RX_DAY,schema:ocArray('ops_task_day',ocptTaskRow('ops_task_row'))}   // V7 · 53 تقويم: YYYY-MM-DD وحده (019p0)
    ]})
  },
  {
    resource:'bassam_tasks_locks_v1',name:'taskLocks',
    /* V7 · 53 تقويم: اعتمادُ الشهر YYYY-MM وقفلُ اليوم YYYY-MM-DD وحدهما — كان أيَّ مفتاح (مدخلٌ عام) فيُقبل الهجريُّ من عميلٍ قديم */
    schema:ocMap('ops_task_locks',null,{patterns:[{pattern:OS_RX_YM_OR_DAY,schema:ocUnion('ops_task_lock', [
      ocScalar('scalar'),ocObject('ops_task_lock_record',{mo:ocScalar('scalar')})
    ])}]})
  }
