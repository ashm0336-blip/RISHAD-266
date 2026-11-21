-- V7 · د5-هـ (x1 · الجلسات): معرّفُ الجهاز لكل متصفح (كعكة bs_dv) واسمُ المتصفح على صفّ الجلسة — لقائمة «الجلسات والنشاط» ولتنبيه الجهاز الجديد.
-- عمودان اختياريان (NULL للجلسات القائمة قبل الترحيل) — لا تغيير في أيّ صفٍّ قائم ولا في رمز الجلسة.
ALTER TABLE sess ADD COLUMN dv TEXT;
ALTER TABLE sess ADD COLUMN br TEXT;
INSERT INTO meta(k,v)VALUES('schema_version','11')ON CONFLICT(k)DO UPDATE SET v=excluded.v;
