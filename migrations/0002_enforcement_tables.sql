-- KIVO · migrations/0002_enforcement_tables.sql — جداولُ الإنفاذ (كانت تُنشأ كسولاً في enfInitDb في بيئة الإنفاذ وحدها منذ KIVO_243)
-- المخطّطُ واحدٌ في كل البيئات (ADR-011): وجودُ الجدول لا يغيّر سلوكاً — وضعُ الإنفاذ يقرّره ENV ∧ meta.authz_mode كما كان.

-- سجلُّ قرارات الصلاحية: الفاعل (معرّفُ الحساب) · المفاتيح · المورد · النطاق · القرار · السبب · الوقت —
-- بلا قيمٍ ولا بصماتٍ ولا رموز جلسة، ولا اسمِ المستخدم ولا عنوانِ IP (بياناتٌ شخصية يحملها سجلُّ الأمن sec أصلاً)
CREATE TABLE IF NOT EXISTS authz (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, uid TEXT, role TEXT, dept TEXT, k TEXT, res TEXT, keys TEXT, scope TEXT, decision TEXT NOT NULL, why TEXT, reason TEXT, path TEXT, mode TEXT, cid TEXT);
CREATE INDEX IF NOT EXISTS authz_ts ON authz (ts);
CREATE INDEX IF NOT EXISTS authz_uid ON authz (uid, ts);
CREATE INDEX IF NOT EXISTS authz_dec ON authz (decision, ts);
-- نسخُ ما قبل العملية (الترحيل · الاستعادة · الاستبدال): القيمةُ كاملةً مقطَّعةً كـkv، وهل كان المفتاحُ موجوداً، ورقمُ مراجعته
CREATE TABLE IF NOT EXISTS authz_snap (snap TEXT NOT NULL, k TEXT NOT NULL, seq INTEGER NOT NULL, existed INTEGER NOT NULL, rev INTEGER, v TEXT, PRIMARY KEY (snap, k, seq));
CREATE TABLE IF NOT EXISTS authz_snaps (snap TEXT PRIMARY KEY, ts INTEGER NOT NULL, uid TEXT, un TEXT, kind TEXT NOT NULL, n INTEGER NOT NULL, meta TEXT, restored INTEGER NOT NULL DEFAULT 0, rts INTEGER, ruid TEXT);
INSERT INTO meta (k, v) VALUES ('schema_version', '2') ON CONFLICT(k) DO UPDATE SET v = excluded.v;
