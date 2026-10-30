# src/plugins — الإضافات (ADR-018 · AUD-030 · SOT-089)
العدساتُ إضافات: `lenses/<key>/manifest.json` لكل عدسة (المخطّط `../schemas/lens-plugin.schema.json`) — المفاتيح (= سجلّ v24.9) · الموارد (عمودُ عناصر أو حقولٌ فوق العناصر/الطابق) · الحرّاس · الاختبارات.
منها بالتوليد (`tools/generate.py`): `KIVO_MANIFEST.lenses` في الواجهة (LENS_REG · LENS_KEYS · P24_LENSES) و`workers/parts/006a-lens-plugins.js` (KIVO_LENS_PLUGINS) لطبقة الإنفاذ.
الفحص: `python3 tools/plugins.py check` (المخطّط · السجلّ · جداولُ الحارس المرجعي · الاختبارات) · الصيغة: `python3 tools/plugins.py fmt`.
إضافةُ عدسة: `docs/developer.md` §5ب — والبرهان `tests/source/plugin_add_check.py`.
