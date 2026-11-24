-- V7 · 53: التخزينُ بالفترة (§3ب) — المرحلة ١، ترحيلٌ مستقلٌّ عن التقويم (رد المراجع §4 الشرط ١). لا تُمسّ صفوفُ ops_nodes ولا جداولُ الكيانات:
-- الفترةُ عضوٌ من حاوية موردها يُقرأ ويُكتب بمدى على row_key (019w). يُضاف جدولُ ملخّصات الفترات (المؤشرات والأرشيف يقرأانه بصفٍّ لكل فترة)،
-- وتُدرج الإداراتُ التي لها صفوفٌ في الموارد المقسَّمة في meta.ops_layout_pending (خطةُ البيانات في 052 migrateDb) — كتابتُها التشغيلية مرفوضةٌ
-- 503 ops-layout-pending حتى تُتمّ المرحلةَ ٢ بأمر مدير المنصة (063 /api/authz-migrate part:'ops-periods'): تحقّقُ opJoin(opSplit)=الأصل فترةً
-- فترة وبناءُ الملخّصات ثم إخراجُ الإدارة من القائمة.
CREATE TABLE IF NOT EXISTS ops_period_summary (department_id TEXT NOT NULL, resource TEXT NOT NULL, period TEXT NOT NULL, rev INTEGER NOT NULL, v_json TEXT NOT NULL, PRIMARY KEY (department_id, resource, period)) WITHOUT ROWID;
INSERT INTO meta (k, v) VALUES ('schema_version', '13') ON CONFLICT(k) DO UPDATE SET v = excluded.v;
