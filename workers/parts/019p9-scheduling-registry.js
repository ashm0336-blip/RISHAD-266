/* ملف مولَّد — لا يُحرَّر يدوياً، المصدر: src/slots/workers/parts/019p9-scheduling-registry.js.tpl */
// V7 · د5-د: مواردُ الجدولة المسجَّلة = ما يعلنه كلُّ برنامجٍ حاضر (قطعةٌ من مجلده) ثم مواردُ القاعدة ثم الخطة.
var OC_SCHEDULING_RESOURCES = [].concat(
  osSchemaStaffResources(),
  osSchemaBaseResources(),
  osSchemaPlanResources(),
  osSchemaRoundsResources(),
);
