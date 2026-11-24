/* V7 · 53 (port-sync · بند 8 · 0013): كرتُ المؤشرات الحلقي — «بطاقة المؤشرات الموحّدة» — بانيه الواحد (كان في صفحة «رصد الحالات» وحدها: _rzKpiCards).
   تستعمله صفحاتُ رصد الحالات والمضبوطات والاسترشاد بقالب الكرت نفسِه: حلقةٌ برقمٍ وشريحةِ نسبة · عنوانٌ بتلميح · خطٌّ متدرّج · سطرٌ فرعي · مفتاحُ الشرائح.
   o: { title, tip, val, chip, sub, accent, parts:[{ label, color, n }], T?: المقام (افتراضاً مجموعُ الشرائح), unit?: وحدةُ العدّ في التلميح (حالة) } */
Object.assign(Component.prototype, {
  _kpiRing(o) {
    const C = 2 * Math.PI * 41,
      parts = o.parts || [],
      T = null != o.T ? o.T : parts.reduce((a, p) => a + (p.n || 0), 0),
      pct = (k) => (T ? Math.round((100 * k) / T) + "٪" : "—"),
      live = parts.filter((p) => p.n > 0),
      gap = live.length > 1;
    let off = 0;
    const ring = live.map((p) => {
      const len = (C * p.n) / (T || 1),
        g = gap ? Math.min(3, 0.12 * len) : 0,
        r = { color: p.color, dash: Math.round(10 * Math.max(0.5, len - g)) / 10 + " " + Math.round(10 * C) / 10, off: String(-Math.round(10 * off) / 10), tip: p.label + ": " + p.n + " (" + pct(p.n) + ")" };
      off += len;
      return r;
    });
    return {
      ...o,
      ring,
      rows: parts.map((p) => ({ label: p.label, color: "width:8px;height:8px;border-radius:3px;flex-shrink:0;background:" + p.color, n: String(p.n), pct: pct(p.n), tip: p.label + " — " + KIVO.BassamCount(p.n, o.unit || "حالة") + " (" + pct(p.n) + ")" })),
      lineStyle: "display:block;width:82px;height:1px;margin:6px 0 5px;background:linear-gradient(90deg,transparent," + o.accent + ",transparent);opacity:.5",
    };
  },
  /* أعلى القيم: أربعٌ — أو ثلاثٌ ثم «غيرها» إن زادت — وفي الشهر الفارغ أوائلُ القيم المعتمدة بصفر */
  _kpiTop(map, colorOf, fallback) {
    const CH = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"],
      e = Object.keys(map).map((k) => ({ label: k, n: map[k] })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
    let L = e.length > 4 ? e.slice(0, 3).concat([{ label: "غيرها", n: e.slice(3).reduce((a, x) => a + x.n, 0), other: !0 }]) : e;
    L.length || (L = (fallback || []).filter(Boolean).slice(0, 4).map((k) => ({ label: String(k), n: 0 })));
    return L.map((x, i) => ({ ...x, color: x.other ? "var(--fg-x94a3b8)" : (colorOf && colorOf(x.label)) || CH[i % CH.length] }));
  },
});
