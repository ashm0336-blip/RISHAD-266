// V7 · د5-د: مواردُ الجدولة التي للقاعدة لا لبرنامج — خياراتُ الورديات، ووردياتُ اليوم، وتركيزُ اليوم القديم.
// كانت في جزء الجدول الشهري (019p1) مع موارده؛ فُصلت ليخرج الجدولُ ببرنامجه وتبقى هذه.
function osSchemaBaseResources() {
  return [
    {
      resource: "bassam_shift_options_v1",
      name: "shifts",
      schema: ocArray("ops_shift_options", osSchemaShift("ops_shift_option")),
    },
    {
      resource: "bassam_dayshift_v1",
      name: "dayShift",
      schema: ocMap("ops_day_shifts", ocScalar("text")),
    },
    // Current day-focus is per-tab/device. This describes old cloud bytes only.
    {
      resource: "bassam_dayfocus_v1",
      name: "legacyDayFocus",
      schema: ocObject("ops_legacy_day_focus", osSchemaFields(["y", "m", "d"])),
    },
  ];
}
