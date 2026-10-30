-- KIVO · migrations/0001_baseline.sql — المخطّطُ الأساس (مطابقٌ لما كان يُنشئه initDb في KIVO_242…248 بعبارات IF NOT EXISTS)
-- الصيغةُ صيغةُ wrangler d1 migrations: ملفٌ مرقَّم · عباراتٌ تنتهي بـ ; · يُطبَّق مرّةً ويُسجَّل اسمُه في d1_migrations.
-- القاعدةُ: لا يُعدَّل ملفٌ بعد تطبيقه على أي بيئة؛ التغييرُ اللاحق ملفٌ جديد برقمٍ أعلى (docs/runbooks/migrations.md).

-- المخزنُ الرئيس: قيمٌ مقطَّعة (k, seq) · نسخُ المفاتيح (rev)
CREATE TABLE IF NOT EXISTS kv (k TEXT NOT NULL, seq INTEGER NOT NULL, v TEXT NOT NULL, PRIMARY KEY (k, seq));
CREATE TABLE IF NOT EXISTS imgs (k TEXT NOT NULL, seq INTEGER NOT NULL, v TEXT NOT NULL, PRIMARY KEY (k, seq));
CREATE TABLE IF NOT EXISTS revs (k TEXT PRIMARY KEY, rev INTEGER NOT NULL);
-- ملكيةُ الصورة: صفٌّ واحدٌ لكل صورة — st: claim (رفعٌ لم يُربط) · bound (مالكٌ ثابت) · amb (قديمةٌ غيرُ محسومة)
CREATE TABLE IF NOT EXISTS imgown (img TEXT PRIMARY KEY, st TEXT NOT NULL, k TEXT, uid TEXT, dept TEXT, ts INTEGER NOT NULL);
-- الاستعمال: أين تُعرض الصورة — للكنس وحده، ولا يُسأل في التفويض أبداً
CREATE TABLE IF NOT EXISTS imgref (img TEXT NOT NULL, k TEXT NOT NULL, PRIMARY KEY (img, k));
CREATE INDEX IF NOT EXISTS imgref_k ON imgref (k);
-- meta: إعداداتُ المنصة وأختامُ الترحيل (rev · authz_mode · aud_mig · schema_version …)
CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL);
-- الجلسات (dev/city أُضيفا في إصدارٍ لاحق لـKIVO_242 وصارا جزءاً من الأساس)
CREATE TABLE IF NOT EXISTS sess (tok TEXT PRIMARY KEY, uid TEXT NOT NULL, ts INTEGER NOT NULL, la INTEGER NOT NULL, dev TEXT, city TEXT);
-- حارسُ المحاولات (دخول · استعادة): عدّادٌ ومهلة
CREATE TABLE IF NOT EXISTS guard (gk TEXT PRIMARY KEY, n INTEGER NOT NULL, until INTEGER NOT NULL);
-- سجلُّ تدقيق البيانات القديم (مستوى المفتاح) — يبقى للقراءة؛ R169 نقله إلى aud
CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, uid TEXT NOT NULL, un TEXT, k TEXT NOT NULL, act TEXT NOT NULL, rev INTEGER NOT NULL, diff TEXT, ip TEXT, dev TEXT, city TEXT);
CREATE INDEX IF NOT EXISTS audit_ts ON audit (ts);
CREATE INDEX IF NOT EXISTS audit_k ON audit (k, ts);
-- سجلُّ أحداث الأمن — منفصلٌ عن تدقيق البيانات
CREATE TABLE IF NOT EXISTS sec (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, uid TEXT, un TEXT, act TEXT NOT NULL, target TEXT, detail TEXT, ip TEXT, city TEXT, dev TEXT);
CREATE INDEX IF NOT EXISTS sec_ts ON sec (ts);
CREATE INDEX IF NOT EXISTS sec_act ON sec (act, ts);
-- R169: سجلُّ الأنشطة والتغييرات — إلحاقٌ فقط، يبقى بعد حذف الكيان، لا يُكنَس
CREATE TABLE IF NOT EXISTS aud (id INTEGER PRIMARY KEY AUTOINCREMENT, cid TEXT NOT NULL, ts INTEGER NOT NULL, uid TEXT NOT NULL, un TEXT, dept TEXT NOT NULL, k TEXT NOT NULL, rev INTEGER NOT NULL, etype TEXT NOT NULL, eid TEXT NOT NULL, ename TEXT, act TEXT NOT NULL, ctx TEXT, bef TEXT, aft TEXT, ip TEXT, dev TEXT, city TEXT);
CREATE UNIQUE INDEX IF NOT EXISTS aud_cid ON aud (cid);
CREATE INDEX IF NOT EXISTS aud_dept_ts ON aud (dept, ts);
CREATE INDEX IF NOT EXISTS aud_ent ON aud (etype, eid, ts);
CREATE INDEX IF NOT EXISTS aud_uid_ts ON aud (uid, ts);
CREATE INDEX IF NOT EXISTS aud_ts ON aud (ts);
-- ختمُ الإصدار
INSERT INTO meta (k, v) VALUES ('schema_version', '1') ON CONFLICT(k) DO UPDATE SET v = excluded.v;
