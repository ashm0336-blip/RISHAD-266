# مكوّناتُ الواجهة المشتركة وحالاتُها (SOT-152 · SOT-093 · KIVO_263)

> كتالوجُ المكوّنات التي تشترك فيها الصفحاتُ الأربعَ عشرة — كلُّ مكوّنٍ بملفّه وواجهته وحالاته المعلنة.
> **مفحوصٌ آلياً**: `tests/unit/components_catalog.test.mjs` يقرأ الجدول أدناه ويتحقّق أنّ لكل صفٍّ ملفاً موجوداً، وأنّ الواجهةَ المذكورة
> وكلَّ «دليل حالة» (النصُّ بين `«»` في العمود الأخير) موجودٌ في ملفه حرفياً — فلا تُعلَن حالةٌ لا كودَ لها.
> الرموزُ (الألوان والمسافات) في `docs/design-system.md` · عقدُ السمة (فاتح/داكن) هناك أيضاً · حالاتُ الشاشات لكل وحدة في `docs/ux-states.md` (مولَّد).

| المكوّن | الملف | الواجهة | الحالات (ودليلُ كلٍّ منها في الكود) |
|---|---|---|---|
| مؤشرُ التحميل الموحَّد | `src/components/550-bassam-busy.js` | `KIVO.BassamBusy` | خامل «host.hidden = true» · جارٍ بنسبة «pct» · انتهى «done» · فشل «fail(» · إشعارٌ قصير «flash» · لقارئ الشاشة «aria-live» |
| حالاتُ الصفحة الموحَّدة | `src/components/555-page-states.js` | `KIVO.PageStates` (host · enter · describe · tabs · trim · STR) | أول تحميل: الهيكلُ الواحد لكل الصفحات بعد ٣٠٠ م.ث «st === "loading"» (صفُّ بطاقات مؤشرات «ps-kpis» + بطاقةُ محتوى «ps-panel») · قاعدةُ الغلاف الواحدة للتنقّل: محتوى الذاكرة «ps-snap» مع الخط والشارة، وإلا تبويباتُ الصفحة «ps-tabbox» (بأيقوناتها من شريط الصفحة نفسِه «pageTabs») والهيكل تحتها — في «ps-shell» · فشلُ إعادة القراءة والمحتوى معروض: شريطُ «ps-stale» فوق المحتوى الباقي «تعذّر التحديث — المعروض قد لا يكون الأحدث» · تحديث «يُحدَّث من الخادم» · فشل «تعذّر تحميل {name}» بزرٍّ واحد «أعد المحاولة» وإعادةٍ عند «"online"» · فارغ «ps-card ps-» بأزرارٍ لمن يمرّ فحصُه «allowed(a.can)» · وصل المحتوى «ps-enter» · صيغةُ القسم «ps-region» · بوابةُ الغلاف «KIVO.__dcStates» |
| حالةُ الاتصال (القائمة الجانبية) | `src/components/240-bassam-link.js` | `KIVO.BassamLink` | متصل «on: "متصل"» · منقطع «off: "انقطع الاتصال"» · محلي «local: "محلي"» |
| لافتةُ الشبكة (الجوال) | `src/components/240-bassam-link.js` | `.bs-netbar` | ظاهرةٌ لحظةَ الانقطاع «bs-netbar» · لقارئ الشاشة «role» |
| إقرارُ الحفظ | `src/core/300-bassam-ack.js` | `KIVO.BassamAck` | معلَّق «حُفظ محلياً — بانتظار المزامنة» · مرفوض «denied» · مُقَرّ «ack» |
| شريطُ الخطأ | `src/core/130-error-bar.js` | `#bsErrBar` | ظاهر «bsErrBar» · يُغلق بالنقر «d.remove()» |
| محرّكُ الجداول | `src/components/180-tables-engine.js` | `.bs-rtable` | ملائمةُ الأعمدة «bs-fitcols» · أعمدةُ الهوية المثبّتة «data-bsfz» · مخفيٌّ يُعاد فحصُه «تعذّر قياسُه» |
| ممرُّ الجدول الكبير | `src/components/670-big-table-lane.js` | الجدولُ نفسُه حاويةُ التمرير | الرأسُ اللاصق «barBottom» |
| شريطُ التبويبات | `src/layouts/helmet-global.css` | `.bs-tabstrip` (في قالب كل وحدة من أول رسم) | أفقيٌّ ينزلق على الجوال «bs-tabstrip» · تلاشي الحافة التي خلفها تبويبات «animation-timeline:scroll(self inline)» · بلا خطّ زمن التمرير: ظلُّ الخلفية «.bs-hscroll,.bs-tabstrip,.bs-grid{» |
| الزرّ الموحَّد (CORE-01) | `src/layouts/helmet-global.css` | `.bs-btn` | افتراضي «.bs-btn{» · رئيس «.bs-btn--primary{» · خَطِر «.bs-btn--danger{» · بلا إطار «.bs-btn--ghost{» · أيقونة 38×38 «.bs-btn--icon{width:38px;height:38px» · التركيز «.bs-btn:focus-visible» · معطَّل «.bs-btn:disabled» |
| البطاقة (CORE-01) | `src/layouts/helmet-global.css` | `.bs-card` · `.bs-card-h` · `.bs-card-b` | سطح «.bs-card{» · رأس «.bs-card-h{» · جسم «.bs-card-b{» |
| الحوار (CORE-01) | `src/layouts/helmet-global.css` | `.bs-dlg` · `.bs-dlg-box` | الطبقة «.bs-dlg{position:fixed» · الصندوق «.bs-dlg-box{» · لوحٌ سفليٌّ بعرض الشاشة على الجوال «.bs-dlg{align-items:flex-end;padding:0}» |
| هيكلُ التحميل (CORE-01) | `src/layouts/helmet-global.css` | `.bs-skel` | وميض «animation:sc-shine 1.4s ease infinite» · بلا حركة «prefers-reduced-motion:reduce){.bs-skel» · هيكلُ الشاشة الكسولة نفسُه «.sc-placeholder::before{background-image» |
| الحالةُ الفارغة (CORE-01) | `src/layouts/helmet-global.css` | `.bs-empty` | فارغ «.bs-empty{» · العنوان «.bs-empty b{» |
| القوائمُ المنسدلة | `src/components/650-dropdown-unify.js` | كلُّ قائمةٍ مخصّصة | محبوسةٌ تُحرَّر «clipAncestor» · مثبّتةٌ فوق القصّ «"fixed"» |
| أشرطةُ البحث | `src/components/680-search-bars.js` | كلُّ حقلٍ «بحث» | فارغٌ بلا نتائج «لا نتائج مطابقة لـ «» على الحالة الفارغة الموحَّدة «bs-empty bs-noqres» وزرّها «bs-btn» · المسحُ بـEsc «Escape» |
| التلميحات | `src/components/600-tooltip-portal.js` | `.bs-tip` وما يماثله | — (عرضٌ فقط · بديلُ التركيز في `helmet-global.css` — SOT-058) |
| التلميحاتُ على اللمس | `src/components/470-touch-tooltips.js` | — | — |
| طبقةُ الإتاحة | `src/components/660-a11y-enhancer.js` | تسمياتٌ وأدوار | زرٌّ غيرُ أصلي «role» · قابلٌ للتركيز «tabindex» |
| مناهجُ الصفحات المشتركة | `src/components/565-page-kit.js` | `window.BassamPageKit.base` | — (مناهجُ لا حالات؛ مولَّدٌ ومبرهَن بـ`tools/page_kit.mjs`) |

## القواعد
1. **حالةٌ جديدة لمكوّن** تُضاف صفاً هنا بدليلها في الكود — وإلا أخفق الاختبار؛ والمكوّنُ الجديد المشترك بين وحدتين يُضاف هنا لا داخل وحدة.
2. **لا مكوّنَ داخل وحدة يكرّر مكوّناً هنا** (مؤشرُ تحميلٍ خاص · شريطُ خطأٍ خاص) — `tools/dup_nested.mjs --check` يمنع زيادةَ التكرار بين الوحدات.
3. **المتبقّي** (SOT-086/093 — تدريجيّ): أصنافُ الحوار والحالة الفارغة والزرّ والبطاقة والهيكل موجودةٌ الآن (CORE-01 · `docs/design-system.md` «المكوّنات الأساسية»)؛
   الباقي نقلُ الأنماط المضمَّنة في الغلاف (CORE-01 · الخطوة 3) ثم في قوالب الوحدات إليها، ومكوّنُ الجدول الموحَّد.
   خطّتها: استخراجُ الدوالّ النقية المكرّرة الـ11 (`tools/dup_nested.json`) أولاً، ثم مكوّنُ الحالة الفارغة لأنّه الأكثرُ تكراراً (`docs/ux-states.md` عمود «فارغ»).
