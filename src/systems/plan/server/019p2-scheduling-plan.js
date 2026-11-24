function osSchemaPlanMonth(table) {
  return ocUnion(table, [
    osSchemaFloors(table + "_legacy_array"),
    ocObject(table + "_record", {
      c: ocScalar("scalar"),
      mo: ocScalar("scalar"),
      d: osSchemaFloors(table + "_floors"),
    }),
  ]);
}
function osSchemaPlan(table) {
  var fields = osSchemaFields(["pMig"]);
  fields.floors = osSchemaFloors(table + "_live_floors");
  ["zones", "gates", "marks", "paths"].forEach(function (kind) {
    fields[kind] = ocArray(
      table + "_root_" + kind,
      osSchemaElement(table + "_root_" + kind + "_element", kind),
    );
  });
  /* V7 · 53 تقويم (ق١ · الخطر ٤): نسخُ الأشهر بمفتاح YYYY-MM وحده (019p0) — كان أيَّ مفتاح */
  fields.months = ocMap(table + "_months", null, { patterns: [{ pattern: OS_RX_YM, schema: osSchemaPlanMonth(table + "_month") }] });
  /* delMonths يبقى مدخلاً عاماً: شكلُه (خريطةُ قيم) يشاركه جدولُه أشكالٌ أخرى (shift_needs · 019o توقيعُ الشكل) — ومفتاحُه يُحرس في المصنِّف (guard.classify.plan) */
  fields.delMonths = ocMap(table + "_deleted_months", ocScalar("scalar"));
  // No inner cfg writer exists in the current source. Unknown legacy members
  // fail before DDL instead of being hidden in a JSON/attribute fallback.
  fields.cfg = ocObject(table + "_legacy_cfg", {});
  return ocObject(table, fields);
}
