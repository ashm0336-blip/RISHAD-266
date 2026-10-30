
/* الفرعية تحت المصليات: مؤشرات المصليات/المسارات/التوزيع/الكثافة — أيّها مضاء */
KIVO.__bsMixOn = function(k, s){
  if (k === "dens") return s.lens === "density";
  if (s.lens === "density") return false;
  if (k === "paths") return s.panelTab === "paths";
  if (s.panelTab === "paths") return false;
  return k === (s.brkDim === "dsum" ? "dsum" : (s.brkDim === "cov" ? "cov" : "summary"));
};
