// V7 · د5-د: مواردُ الجدولة المسجَّلة = ما يعلنه كلُّ برنامجٍ حاضر (قطعةٌ من مجلده) ثم مواردُ القاعدة ثم الخطة.
var OC_SCHEDULING_RESOURCES = [].concat(
@@SYS:oc.sched.resources@@  osSchemaBaseResources(),
@@SYS:oc.sched.resources.plan@@  osSchemaRoundsResources(),
);
