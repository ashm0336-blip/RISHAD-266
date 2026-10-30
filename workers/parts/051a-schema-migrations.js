/* ═══ KIVO_249 · AUD-022 — الترحيلاتُ المرقَّمة (schema): مولَّدةٌ من migrations/NNNN_<name>.sql بأداة tools/generate.py؛ لا تُحرَّر يدوياً.
   يطبّقها initDb (052) مرّةً لكل قاعدة بترتيبها ويسجّل كلَّ اسمٍ في d1_migrations (جدولُ wrangler نفسُه) — فيتبادل العاملُ وwrangler d1 migrations apply السجلَّ نفسَه.
   KIVO_SCHEMA_VERSION = عددُ الترحيلات المعروفة لهذا الإصدار؛ meta.schema_version يختمه آخرُ ترحيلٍ مطبَّق. ═══ */
var KIVO_MIGRATIONS = [
 {
  "name": "0001_baseline",
  "sql": [
   "CREATE TABLE IF NOT EXISTS kv (k TEXT NOT NULL, seq INTEGER NOT NULL, v TEXT NOT NULL, PRIMARY KEY (k, seq))",
   "CREATE TABLE IF NOT EXISTS imgs (k TEXT NOT NULL, seq INTEGER NOT NULL, v TEXT NOT NULL, PRIMARY KEY (k, seq))",
   "CREATE TABLE IF NOT EXISTS revs (k TEXT PRIMARY KEY, rev INTEGER NOT NULL)",
   "CREATE TABLE IF NOT EXISTS imgown (img TEXT PRIMARY KEY, st TEXT NOT NULL, k TEXT, uid TEXT, dept TEXT, ts INTEGER NOT NULL)",
   "CREATE TABLE IF NOT EXISTS imgref (img TEXT NOT NULL, k TEXT NOT NULL, PRIMARY KEY (img, k))",
   "CREATE INDEX IF NOT EXISTS imgref_k ON imgref (k)",
   "CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)",
   "CREATE TABLE IF NOT EXISTS sess (tok TEXT PRIMARY KEY, uid TEXT NOT NULL, ts INTEGER NOT NULL, la INTEGER NOT NULL, dev TEXT, city TEXT)",
   "CREATE TABLE IF NOT EXISTS guard (gk TEXT PRIMARY KEY, n INTEGER NOT NULL, until INTEGER NOT NULL)",
   "CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, uid TEXT NOT NULL, un TEXT, k TEXT NOT NULL, act TEXT NOT NULL, rev INTEGER NOT NULL, diff TEXT, ip TEXT, dev TEXT, city TEXT)",
   "CREATE INDEX IF NOT EXISTS audit_ts ON audit (ts)",
   "CREATE INDEX IF NOT EXISTS audit_k ON audit (k, ts)",
   "CREATE TABLE IF NOT EXISTS sec (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, uid TEXT, un TEXT, act TEXT NOT NULL, target TEXT, detail TEXT, ip TEXT, city TEXT, dev TEXT)",
   "CREATE INDEX IF NOT EXISTS sec_ts ON sec (ts)",
   "CREATE INDEX IF NOT EXISTS sec_act ON sec (act, ts)",
   "CREATE TABLE IF NOT EXISTS aud (id INTEGER PRIMARY KEY AUTOINCREMENT, cid TEXT NOT NULL, ts INTEGER NOT NULL, uid TEXT NOT NULL, un TEXT, dept TEXT NOT NULL, k TEXT NOT NULL, rev INTEGER NOT NULL, etype TEXT NOT NULL, eid TEXT NOT NULL, ename TEXT, act TEXT NOT NULL, ctx TEXT, bef TEXT, aft TEXT, ip TEXT, dev TEXT, city TEXT)",
   "CREATE UNIQUE INDEX IF NOT EXISTS aud_cid ON aud (cid)",
   "CREATE INDEX IF NOT EXISTS aud_dept_ts ON aud (dept, ts)",
   "CREATE INDEX IF NOT EXISTS aud_ent ON aud (etype, eid, ts)",
   "CREATE INDEX IF NOT EXISTS aud_uid_ts ON aud (uid, ts)",
   "CREATE INDEX IF NOT EXISTS aud_ts ON aud (ts)",
   "INSERT INTO meta (k, v) VALUES ('schema_version', '1') ON CONFLICT(k) DO UPDATE SET v = excluded.v"
  ]
 },
 {
  "name": "0002_enforcement_tables",
  "sql": [
   "CREATE TABLE IF NOT EXISTS authz (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, uid TEXT, role TEXT, dept TEXT, k TEXT, res TEXT, keys TEXT, scope TEXT, decision TEXT NOT NULL, why TEXT, reason TEXT, path TEXT, mode TEXT, cid TEXT)",
   "CREATE INDEX IF NOT EXISTS authz_ts ON authz (ts)",
   "CREATE INDEX IF NOT EXISTS authz_uid ON authz (uid, ts)",
   "CREATE INDEX IF NOT EXISTS authz_dec ON authz (decision, ts)",
   "CREATE TABLE IF NOT EXISTS authz_snap (snap TEXT NOT NULL, k TEXT NOT NULL, seq INTEGER NOT NULL, existed INTEGER NOT NULL, rev INTEGER, v TEXT, PRIMARY KEY (snap, k, seq))",
   "CREATE TABLE IF NOT EXISTS authz_snaps (snap TEXT PRIMARY KEY, ts INTEGER NOT NULL, uid TEXT, un TEXT, kind TEXT NOT NULL, n INTEGER NOT NULL, meta TEXT, restored INTEGER NOT NULL DEFAULT 0, rts INTEGER, ruid TEXT)",
   "INSERT INTO meta (k, v) VALUES ('schema_version', '2') ON CONFLICT(k) DO UPDATE SET v = excluded.v"
  ]
 },
 {
  "name": "0003_aud_legacy_import",
  "sql": [
   "INSERT OR IGNORE INTO aud (cid, ts, uid, un, dept, k, rev, etype, eid, ename, act, ctx, bef, aft, ip, dev, city) SELECT 'legacy_' || id, ts, uid, COALESCE(un, ''), CASE WHEN k LIKE 'bsdept:%' THEN substr(k, 8, instr(substr(k, 8), ':') - 1) ELSE '' END, k, rev, 'legacy', CASE WHEN k LIKE 'bsdept:%' THEN substr(k, 8 + instr(substr(k, 8), ':')) ELSE k END, '', CASE WHEN act = 'del' THEN 'deleted' ELSE 'changed' END, '{\"legacy\":1}', '', COALESCE(diff, ''), COALESCE(ip, ''), COALESCE(dev, ''), COALESCE(city, '') FROM audit",
   "INSERT INTO meta (k, v) VALUES ('aud_mig', '1') ON CONFLICT(k) DO UPDATE SET v = '1'",
   "INSERT INTO meta (k, v) VALUES ('schema_version', '3') ON CONFLICT(k) DO UPDATE SET v = excluded.v"
  ]
 },
 {
  "name": "0004_daily_stats",
  "sql": [
   "SELECT CASE WHEN EXISTS ( SELECT 1 FROM kv WHERE k = 'bassam_dstats_v1' OR k LIKE 'bsdept:%:bassam_dstats_v1' ) AND COALESCE((SELECT v FROM meta WHERE k = 'ds_cutover_ready'), '') != 'validated' THEN json_extract('{}', 'KIVO_DSTATS_OFFLINE_CUTOVER_REQUIRED') END",
   "CREATE TABLE IF NOT EXISTS daily_stats_days ( site TEXT NOT NULL CHECK (site IN ('haram','nabawi')), hijri_date TEXT NOT NULL CHECK (hijri_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'), field_mask INTEGER NOT NULL CHECK (field_mask BETWEEN 0 AND 2047), worshippers REAL, umrah REAL, hijr_ismail REAL, carts REAL, salam_corridor REAL, rawdah_men_published REAL, rawdah_men_reserved REAL, rawdah_men_actual REAL, rawdah_women_published REAL, rawdah_women_reserved REAL, rawdah_women_actual REAL, meta_json TEXT CHECK (meta_json IS NULL OR json_valid(meta_json)), fields_json TEXT CHECK (fields_json IS NULL OR json_valid(fields_json)), PRIMARY KEY (site, hijri_date) ) WITHOUT ROWID",
   "CREATE TABLE IF NOT EXISTS daily_stats_month_locks ( site TEXT NOT NULL CHECK (site IN ('haram','nabawi')), hijri_year INTEGER NOT NULL CHECK (hijri_year BETWEEN 1000 AND 9999), hijri_month INTEGER NOT NULL CHECK (hijri_month BETWEEN 1 AND 12), approved INTEGER NOT NULL CHECK (approved IN (0,1)), reopened INTEGER NOT NULL CHECK (reopened IN (0,1)), legacy_boolean INTEGER NOT NULL DEFAULT 0 CHECK (legacy_boolean IN (0,1)), PRIMARY KEY (site,hijri_year,hijri_month) ) WITHOUT ROWID",
   "CREATE TABLE IF NOT EXISTS daily_stats_day_locks ( site TEXT NOT NULL, hijri_year INTEGER NOT NULL, hijri_month INTEGER NOT NULL, hijri_day INTEGER NOT NULL CHECK (hijri_day BETWEEN 1 AND 30), is_open INTEGER NOT NULL CHECK (is_open IN (0,1)), is_shut INTEGER NOT NULL CHECK (is_shut IN (0,1)), PRIMARY KEY (site,hijri_year,hijri_month,hijri_day), FOREIGN KEY (site,hijri_year,hijri_month) REFERENCES daily_stats_month_locks(site,hijri_year,hijri_month) ON DELETE CASCADE ) WITHOUT ROWID",
   "DELETE FROM meta WHERE k = 'ds_cutover_ready'",
   "INSERT INTO meta (k, v) VALUES ('schema_version', '4') ON CONFLICT(k) DO UPDATE SET v = excluded.v"
  ]
 },
 {
  "name": "0005_notifications",
  "sql": [
   "SELECT CASE WHEN EXISTS (SELECT 1 FROM kv WHERE k IN ('bassam_notif_sys_v1','bassam_bc_v1','bassam_notif_cfg_v1','bassam_notif_v1') OR k LIKE 'bsdept:%:bassam_notif_v1') AND COALESCE((SELECT v FROM meta WHERE k='nf_cutover_ready'),'') != 'validated' THEN json_extract('{}','KIVO_NOTIFICATION_VALIDATED_CUTOVER_REQUIRED') END",
   "CREATE TABLE IF NOT EXISTS notification_messages ( scope TEXT NOT NULL, id TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('event','broadcast')), department TEXT NOT NULL DEFAULT '', type TEXT NOT NULL, category TEXT NOT NULL, priority TEXT NOT NULL CHECK(priority IN ('info','act','urg')), channel TEXT NOT NULL CHECK(channel IN ('bell','toast')), title TEXT NOT NULL, body TEXT NOT NULL, created_at INTEGER NOT NULL, author_key TEXT NOT NULL DEFAULT '', author_name TEXT NOT NULL DEFAULT '', action_text TEXT NOT NULL DEFAULT '', link TEXT NOT NULL DEFAULT '', requires_ack INTEGER NOT NULL DEFAULT 0 CHECK(requires_ack IN (0,1)), pinned INTEGER NOT NULL DEFAULT 0 CHECK(pinned IN (0,1)), preview INTEGER NOT NULL DEFAULT 0 CHECK(preview IN (0,1)), department_broadcast INTEGER NOT NULL DEFAULT 0 CHECK(department_broadcast IN (0,1)), expires_at INTEGER NOT NULL DEFAULT 0, withdrawn_at INTEGER NOT NULL DEFAULT 0, reminders INTEGER NOT NULL DEFAULT 0 CHECK(reminders IN (0,1)), scheduled INTEGER NOT NULL DEFAULT 0 CHECK(scheduled IN (0,1)), target_mode TEXT NOT NULL DEFAULT 'message' CHECK(target_mode IN ('message','all','dept','role','shift','emp')), recipient_count INTEGER NOT NULL DEFAULT 0, server_origin INTEGER NOT NULL DEFAULT 0 CHECK(server_origin IN (0,1)), reminded_at INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(scope,id) ) WITHOUT ROWID",
   "CREATE INDEX IF NOT EXISTS notification_messages_time ON notification_messages(scope,created_at,id)",
   "CREATE INDEX IF NOT EXISTS notification_messages_kind_scope ON notification_messages(kind,scope,created_at,id)",
   "CREATE TABLE IF NOT EXISTS notification_targets ( scope TEXT NOT NULL, message_id TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('employee','role','department','shift','all')), value TEXT NOT NULL, PRIMARY KEY(scope,message_id,kind,value), FOREIGN KEY(scope,message_id) REFERENCES notification_messages(scope,id) ON DELETE CASCADE ) WITHOUT ROWID",
   "CREATE TABLE IF NOT EXISTS notification_user_state ( account_uid TEXT NOT NULL, message_scope TEXT NOT NULL, message_id TEXT NOT NULL, read_at INTEGER NOT NULL DEFAULT 0, acknowledged_at INTEGER NOT NULL DEFAULT 0, dismissed_at INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(account_uid,message_scope,message_id), FOREIGN KEY(message_scope,message_id) REFERENCES notification_messages(scope,id) ON DELETE CASCADE ) WITHOUT ROWID",
   "CREATE INDEX IF NOT EXISTS notification_targets_audience ON notification_targets(kind,value,scope,message_id)",
   "CREATE INDEX IF NOT EXISTS notification_user_state_message ON notification_user_state(message_scope,message_id,account_uid)",
   "CREATE TABLE IF NOT EXISTS notification_dedup ( scope TEXT NOT NULL, once_key TEXT NOT NULL, created_at INTEGER NOT NULL, message_id TEXT, PRIMARY KEY(scope,once_key) ) WITHOUT ROWID",
   "CREATE TABLE IF NOT EXISTS notification_type_overrides ( type_id TEXT PRIMARY KEY, enabled INTEGER CHECK(enabled IS NULL OR enabled IN (0,1)), priority TEXT CHECK(priority IS NULL OR priority IN ('info','act','urg')), channel TEXT CHECK(channel IS NULL OR channel IN ('bell','toast')), template_text TEXT, target_override INTEGER NOT NULL DEFAULT 0 CHECK(target_override IN (0,1)), target_own INTEGER NOT NULL DEFAULT 0 CHECK(target_own IN (0,1)), target_lead INTEGER NOT NULL DEFAULT 0 CHECK(target_lead IN (0,1)), target_mgr INTEGER NOT NULL DEFAULT 0 CHECK(target_mgr IN (0,1)), target_sys INTEGER NOT NULL DEFAULT 0 CHECK(target_sys IN (0,1)) ) WITHOUT ROWID",
   "CREATE TABLE IF NOT EXISTS notification_checkpoints ( scope TEXT NOT NULL, name TEXT NOT NULL, value INTEGER NOT NULL, PRIMARY KEY(scope,name) ) WITHOUT ROWID",
   "DELETE FROM meta WHERE k='nf_cutover_ready'",
   "INSERT INTO meta (k, v) VALUES ('schema_version', '5') ON CONFLICT(k) DO UPDATE SET v=excluded.v"
  ]
 },
 {
  "name": "0006_custody",
  "sql": [
   "SELECT CASE WHEN EXISTS (SELECT 1 FROM kv WHERE k='bassam_custody_v1' OR k GLOB 'bsdept:*:bassam_custody_v1') AND COALESCE((SELECT v FROM meta WHERE k='cu_cutover_ready'),'')!='validated' THEN json_extract('{}','KIVO_CUSTODY_VALIDATED_CUTOVER_REQUIRED') END",
   "CREATE TABLE IF NOT EXISTS custody_items ( department_id TEXT NOT NULL, item_id TEXT NOT NULL, name TEXT NOT NULL, qty REAL NOT NULL CHECK(qty>=0), prefix TEXT, color TEXT, presence_mask INTEGER NOT NULL, PRIMARY KEY(department_id,item_id), UNIQUE(department_id,name) ) WITHOUT ROWID",
   "CREATE TABLE IF NOT EXISTS custody_issues ( department_id TEXT NOT NULL, issue_id TEXT NOT NULL, item_id TEXT NOT NULL, serial TEXT NOT NULL, serial_number INTEGER NOT NULL DEFAULT 0, legacy_identity TEXT, PRIMARY KEY(department_id,issue_id), FOREIGN KEY(department_id,item_id) REFERENCES custody_items(department_id,item_id) ) WITHOUT ROWID",
   "CREATE UNIQUE INDEX IF NOT EXISTS custody_serial ON custody_issues(department_id,item_id,serial) WHERE serial!=''",
   "CREATE INDEX IF NOT EXISTS custody_serial_number ON custody_issues(department_id,item_id,serial_number)",
   "CREATE TABLE IF NOT EXISTS custody_movements ( department_id TEXT NOT NULL, move_id TEXT NOT NULL, issue_id TEXT NOT NULL, item_id TEXT NOT NULL, sequence INTEGER NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('out','in','dmg','lost')), holder_key TEXT NOT NULL, hijri_year INTEGER NOT NULL, hijri_month INTEGER NOT NULL CHECK(hijri_month BETWEEN 1 AND 12), hijri_day INTEGER NOT NULL CHECK(hijri_day BETWEEN 0 AND 30), condition TEXT, note TEXT, color_snapshot TEXT, actor_uid TEXT, actor_label TEXT, holder_nid_snapshot TEXT, holder_empno_snapshot TEXT, holder_name_snapshot TEXT, presence_mask INTEGER NOT NULL, created_at INTEGER, PRIMARY KEY(department_id,move_id), UNIQUE(department_id,sequence), FOREIGN KEY(department_id,issue_id) REFERENCES custody_issues(department_id,issue_id), FOREIGN KEY(department_id,item_id) REFERENCES custody_items(department_id,item_id) ) WITHOUT ROWID",
   "CREATE INDEX IF NOT EXISTS custody_move_timeline ON custody_movements(department_id,hijri_year,hijri_month,hijri_day,sequence,move_id)",
   "CREATE INDEX IF NOT EXISTS custody_issue_timeline ON custody_movements(department_id,issue_id,hijri_year DESC,hijri_month DESC,hijri_day DESC,sequence DESC)",
   "CREATE INDEX IF NOT EXISTS custody_holder ON custody_movements(department_id,holder_key,issue_id)",
   "CREATE TABLE IF NOT EXISTS custody_requests ( department_id TEXT NOT NULL, account_uid TEXT NOT NULL, request_id TEXT NOT NULL, fingerprint TEXT NOT NULL, resource_rev INTEGER NOT NULL, operation TEXT NOT NULL, result_n INTEGER NOT NULL, item_id TEXT, created_at INTEGER NOT NULL, PRIMARY KEY(department_id,account_uid,request_id) ) WITHOUT ROWID",
   "CREATE TABLE IF NOT EXISTS custody_request_outputs ( department_id TEXT NOT NULL, account_uid TEXT NOT NULL, request_id TEXT NOT NULL, position INTEGER NOT NULL, issue_id TEXT NOT NULL, move_id TEXT NOT NULL, serial TEXT NOT NULL, PRIMARY KEY(department_id,account_uid,request_id,position), FOREIGN KEY(department_id,account_uid,request_id) REFERENCES custody_requests(department_id,account_uid,request_id) ) WITHOUT ROWID",
   "DELETE FROM meta WHERE k='cu_cutover_ready'",
   "INSERT INTO meta(k,v) VALUES ('schema_version', '6') ON CONFLICT(k) DO UPDATE SET v=excluded.v"
  ]
 },
 {
  "name": "0007_atomic_restore",
  "sql": [
   "CREATE TABLE IF NOT EXISTS restore_operations ( account_uid TEXT NOT NULL,request_id TEXT NOT NULL,fingerprint TEXT NOT NULL, revision INTEGER NOT NULL,snapshot_id TEXT NOT NULL,scope TEXT NOT NULL,mode TEXT NOT NULL, counts_json TEXT NOT NULL CHECK(json_valid(counts_json)),reauth_required INTEGER NOT NULL, created_at INTEGER NOT NULL,result_json TEXT CHECK(result_json IS NULL OR json_valid(result_json)),PRIMARY KEY(account_uid,request_id) ) WITHOUT ROWID",
   "CREATE TABLE IF NOT EXISTS restore_preimage ( snapshot_id TEXT NOT NULL,domain TEXT NOT NULL,table_key TEXT NOT NULL,row_number INTEGER NOT NULL, row_json TEXT NOT NULL CHECK(json_valid(row_json)), PRIMARY KEY(snapshot_id,domain,table_key,row_number) ) WITHOUT ROWID",
   "CREATE TABLE IF NOT EXISTS restore_snapshot_manifest ( snapshot_id TEXT NOT NULL,domain TEXT NOT NULL,table_key TEXT NOT NULL,row_count INTEGER NOT NULL, PRIMARY KEY(snapshot_id,domain,table_key) ) WITHOUT ROWID",
   "INSERT INTO meta(k,v) VALUES('restore_epoch','0') ON CONFLICT(k) DO NOTHING",
   "INSERT INTO meta(k,v) VALUES ('schema_version', '7') ON CONFLICT(k) DO UPDATE SET v=excluded.v"
  ]
 }
];
var KIVO_SCHEMA_VERSION = 7;
