/* Operational source contracts only. Every container has its own fixed table.
   These descriptors preserve transport shape/order/absence/null; they do not
   grant writes, normalize legacy identities or run the old client migrations.
   Source: 019c employee transition;031 fields;062c/070–074 Tasks;
   Employees.logic and DailyReport.logic. The common compiler owns execution. */
@@SYS:oc.people.taskCodec@@@@SYS:oc.people.reportCodec.dreport@@var OC_PEOPLE_TASK_RESOURCES = [
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
@@SYS:oc.people.reportResources.dreport@@@@SYS:oc.people.taskResources@@];
