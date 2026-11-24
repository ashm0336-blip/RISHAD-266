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
 },
 {
  "name": "0008_irshad",
  "sql": [
   "SELECT CASE WHEN EXISTS(SELECT 1 FROM kv WHERE k IN ('bassam_irshad_v1','bassam_irshad_langs_v1','bassam_irshad_locs_v1','bassam_irshad_retro_v1') OR k GLOB 'bsdept:*:bassam_irshad_v1' OR k GLOB 'bsdept:*:bassam_irshad_v1:*' OR k GLOB 'bassam_irshad_v1:*' OR k GLOB 'bsdept:*:bassam_irshad_langs_v1' OR k GLOB 'bsdept:*:bassam_irshad_langs_v1:*' OR k GLOB 'bassam_irshad_langs_v1:*' OR k GLOB 'bsdept:*:bassam_irshad_locs_v1' OR k GLOB 'bsdept:*:bassam_irshad_locs_v1:*' OR k GLOB 'bassam_irshad_locs_v1:*' OR k GLOB 'bsdept:*:bassam_irshad_retro_v1' OR k GLOB 'bsdept:*:bassam_irshad_retro_v1:*' OR k GLOB 'bassam_irshad_retro_v1:*') AND COALESCE((SELECT v FROM meta WHERE k='ir_cutover_ready'),'')!='validated' THEN json_extract('{}','KIVO_IRSHAD_VALIDATED_CUTOVER_REQUIRED') END",
   "CREATE TABLE IF NOT EXISTS irshad_reports ( department_id TEXT NOT NULL, report_id TEXT NOT NULL, sequence INTEGER NOT NULL, hijri_year REAL,hijri_month REAL,hijri_day REAL,created_at REAL,shift TEXT, employee_key TEXT,employee_name TEXT,location TEXT,actor_label TEXT, brochures REAL,prosecution REAL,police REAL,edited_at REAL,edited_by TEXT, legacy_language TEXT,legacy_count REAL,legacy_author TEXT,test_marker TEXT, presence_mask INTEGER NOT NULL,languages_null INTEGER NOT NULL, PRIMARY KEY(department_id,report_id),UNIQUE(department_id,sequence) ) WITHOUT ROWID",
   "CREATE INDEX IF NOT EXISTS irshad_report_timeline ON irshad_reports(department_id,hijri_year DESC,hijri_month DESC,hijri_day DESC,created_at DESC,sequence)",
   "CREATE INDEX IF NOT EXISTS irshad_report_shift ON irshad_reports(department_id,shift,hijri_year,hijri_month,hijri_day,sequence)",
   "CREATE TABLE IF NOT EXISTS irshad_report_languages ( department_id TEXT NOT NULL,report_id TEXT NOT NULL,position INTEGER NOT NULL, language TEXT,count REAL,presence_mask INTEGER NOT NULL, PRIMARY KEY(department_id,report_id,position), FOREIGN KEY(department_id,report_id) REFERENCES irshad_reports(department_id,report_id) ON DELETE CASCADE ) WITHOUT ROWID",
   "CREATE TABLE IF NOT EXISTS irshad_catalog_entries ( department_id TEXT NOT NULL,kind TEXT NOT NULL,position INTEGER NOT NULL,value TEXT NOT NULL, PRIMARY KEY(department_id,kind,position) ) WITHOUT ROWID",
   "CREATE TABLE IF NOT EXISTS irshad_retro_windows ( department_id TEXT NOT NULL,window_id TEXT NOT NULL,sequence INTEGER NOT NULL, hijri_year REAL,hijri_month REAL,hijri_day REAL,scope_mask INTEGER NOT NULL, opened_at REAL,until_at REAL,hours REAL,reason TEXT,reason_missing INTEGER, closed_at REAL,by_id TEXT,by_username TEXT,by_employee_key TEXT,by_name TEXT, closed_by_id TEXT,closed_by_username TEXT,closed_by_employee_key TEXT, presence_mask INTEGER NOT NULL,by_kind INTEGER NOT NULL,by_mask INTEGER NOT NULL, closed_by_kind INTEGER NOT NULL,closed_by_mask INTEGER NOT NULL, PRIMARY KEY(department_id,window_id),UNIQUE(department_id,sequence) ) WITHOUT ROWID",
   "CREATE INDEX IF NOT EXISTS irshad_retro_scope ON irshad_retro_windows(department_id,hijri_year,hijri_month,hijri_day,until_at)",
   "CREATE TABLE IF NOT EXISTS irshad_requests ( department_id TEXT NOT NULL,account_uid TEXT NOT NULL,request_id TEXT NOT NULL, fingerprint TEXT NOT NULL,resource_key TEXT NOT NULL,resource_rev INTEGER NOT NULL, operation TEXT NOT NULL,result_n INTEGER NOT NULL,result_id TEXT,created_at INTEGER NOT NULL, PRIMARY KEY(department_id,account_uid,request_id) ) WITHOUT ROWID",
   "DELETE FROM meta WHERE k='ir_cutover_ready'",
   "INSERT INTO meta(k,v) VALUES ('schema_version', '8') ON CONFLICT(k) DO UPDATE SET v=excluded.v"
  ]
 },
 {
  "name": "0009_seized_awards",
  "sql": [
   "SELECT CASE WHEN EXISTS(SELECT 1 FROM kv WHERE k IN ('bassam_award_v1','bassam_award_docs_v1','bassam_award_docs_v2') OR k GLOB 'bsdept:*:bassam_award_v1' OR k GLOB 'bsdept:*:bassam_award_v1:*' OR k GLOB 'bassam_award_v1:*' OR k GLOB 'bsdept:*:bassam_award_docs_v1' OR k GLOB 'bsdept:*:bassam_award_docs_v1:*' OR k GLOB 'bassam_award_docs_v1:*' OR k GLOB 'bsdept:*:bassam_award_docs_v2' OR k GLOB 'bsdept:*:bassam_award_docs_v2:*' OR k GLOB 'bassam_award_docs_v2:*') AND COALESCE((SELECT v FROM meta WHERE k='aw_cutover_ready'),'')<>'validated' THEN json_extract('{}','KIVO_AWARD_CUTOVER_REQUIRED') END",
   "SELECT CASE WHEN EXISTS(SELECT 1 FROM kv WHERE k IN ('bassam_seized_v1','bassam_seized_cat_v1','bassam_seized_acts_v1','bassam_seized_locs_v1','bassam_seized_jew_v1','bassam_seized_retro_v1') OR k GLOB 'bsdept:*:bassam_seized_v1' OR k GLOB 'bsdept:*:bassam_seized_v1:*' OR k GLOB 'bassam_seized_v1:*' OR k GLOB 'bsdept:*:bassam_seized_cat_v1' OR k GLOB 'bsdept:*:bassam_seized_cat_v1:*' OR k GLOB 'bassam_seized_cat_v1:*' OR k GLOB 'bsdept:*:bassam_seized_acts_v1' OR k GLOB 'bsdept:*:bassam_seized_acts_v1:*' OR k GLOB 'bassam_seized_acts_v1:*' OR k GLOB 'bsdept:*:bassam_seized_locs_v1' OR k GLOB 'bsdept:*:bassam_seized_locs_v1:*' OR k GLOB 'bassam_seized_locs_v1:*' OR k GLOB 'bsdept:*:bassam_seized_jew_v1' OR k GLOB 'bsdept:*:bassam_seized_jew_v1:*' OR k GLOB 'bassam_seized_jew_v1:*' OR k GLOB 'bsdept:*:bassam_seized_retro_v1' OR k GLOB 'bsdept:*:bassam_seized_retro_v1:*' OR k GLOB 'bassam_seized_retro_v1:*') AND COALESCE((SELECT v FROM meta WHERE k='seized_cutover_ready'),'')!='validated' THEN json_extract('{}','KIVO_SEIZED_VALIDATED_CUTOVER_REQUIRED') END",
   "CREATE TABLE IF NOT EXISTS seized_resource_state( department_id TEXT NOT NULL, resource TEXT NOT NULL, value_kind INTEGER NOT NULL, list_kind INTEGER NOT NULL, version_kind INTEGER NOT NULL, version_number REAL, version_text TEXT, PRIMARY KEY(department_id,resource) ) WITHOUT ROWID",
   "CREATE TABLE IF NOT EXISTS seized_reports( department_id TEXT NOT NULL, sequence INTEGER NOT NULL, report_id TEXT NOT NULL, hijri_year REAL, hijri_month REAL, hijri_day REAL, created_at REAL, location TEXT, actor_label TEXT, actor_key TEXT, record_number TEXT, note TEXT, shift TEXT, employee_key TEXT, employee_name TEXT, edited_at REAL, edited_by TEXT, legacy_author TEXT, test_marker TEXT, presence_mask INTEGER NOT NULL, items_kind INTEGER NOT NULL, PRIMARY KEY(department_id,report_id), UNIQUE(department_id,sequence) ) WITHOUT ROWID",
   "CREATE TABLE IF NOT EXISTS seized_items( department_id TEXT NOT NULL, report_id TEXT NOT NULL, position INTEGER NOT NULL, id_kind INTEGER NOT NULL, id_number REAL, id_text TEXT, id_token TEXT, quantity REAL, value REAL, action_key TEXT, kind TEXT, kind_text TEXT, presence_mask INTEGER NOT NULL, photos_kind INTEGER NOT NULL, history_kind INTEGER NOT NULL, PRIMARY KEY(department_id,report_id,position), FOREIGN KEY(department_id,report_id) REFERENCES seized_reports(department_id,report_id) ON DELETE CASCADE ) WITHOUT ROWID",
   "CREATE TABLE IF NOT EXISTS seized_item_photos( department_id TEXT NOT NULL, report_id TEXT NOT NULL, item_position INTEGER NOT NULL, position INTEGER NOT NULL, image_id TEXT, PRIMARY KEY(department_id,report_id,item_position,position), FOREIGN KEY(department_id,report_id,item_position) REFERENCES seized_items(department_id,report_id,position) ON DELETE CASCADE ) WITHOUT ROWID",
   "CREATE TABLE IF NOT EXISTS seized_item_history( department_id TEXT NOT NULL, report_id TEXT NOT NULL, item_position INTEGER NOT NULL, position INTEGER NOT NULL, from_action TEXT, to_action TEXT, at_label TEXT, actor_label TEXT, created_at REAL, presence_mask INTEGER NOT NULL, PRIMARY KEY(department_id,report_id,item_position,position), FOREIGN KEY(department_id,report_id,item_position) REFERENCES seized_items(department_id,report_id,position) ON DELETE CASCADE ) WITHOUT ROWID",
   "CREATE TABLE IF NOT EXISTS seized_categories( department_id TEXT NOT NULL, position INTEGER NOT NULL, id_kind INTEGER NOT NULL, id_number REAL, id_text TEXT, id_token TEXT, name TEXT, color TEXT, default_action TEXT, presence_mask INTEGER NOT NULL, items_kind INTEGER NOT NULL, PRIMARY KEY(department_id,position) ) WITHOUT ROWID",
   "CREATE TABLE IF NOT EXISTS seized_catalog_items( department_id TEXT NOT NULL, category_position INTEGER NOT NULL, position INTEGER NOT NULL, id_kind INTEGER NOT NULL, id_number REAL, id_text TEXT, id_token TEXT, name TEXT, description TEXT, unit TEXT, presence_mask INTEGER NOT NULL, PRIMARY KEY(department_id,category_position,position), FOREIGN KEY(department_id,category_position) REFERENCES seized_categories(department_id,position) ON DELETE CASCADE ) WITHOUT ROWID",
   "CREATE TABLE IF NOT EXISTS seized_actions( department_id TEXT NOT NULL, position INTEGER NOT NULL, id_kind INTEGER NOT NULL, id_number REAL, id_text TEXT, id_token TEXT, action_key TEXT, name TEXT, color TEXT, presence_mask INTEGER NOT NULL, PRIMARY KEY(department_id,position) ) WITHOUT ROWID",
   "CREATE TABLE IF NOT EXISTS seized_list_values( department_id TEXT NOT NULL, resource TEXT NOT NULL, position INTEGER NOT NULL, value TEXT, PRIMARY KEY(department_id,resource,position) ) WITHOUT ROWID",
   "CREATE TABLE IF NOT EXISTS seized_retro_windows( department_id TEXT NOT NULL, sequence INTEGER NOT NULL, window_id TEXT NOT NULL, opened_at REAL, until_at REAL, hours REAL, reason TEXT, reason_missing REAL, closed_at REAL, hijri_year REAL, hijri_month REAL, hijri_day REAL, scope_mask INTEGER NOT NULL, by_id TEXT, by_username TEXT, by_employee_key TEXT, by_name TEXT, closed_by_id TEXT, closed_by_username TEXT, closed_by_employee_key TEXT, presence_mask INTEGER NOT NULL, by_kind INTEGER NOT NULL, by_mask INTEGER NOT NULL, closed_by_kind INTEGER NOT NULL, closed_by_mask INTEGER NOT NULL, PRIMARY KEY(department_id,window_id), UNIQUE(department_id,sequence) ) WITHOUT ROWID",
   "CREATE INDEX IF NOT EXISTS seized_report_timeline ON seized_reports(department_id,hijri_year,hijri_month,hijri_day DESC,created_at DESC,sequence)",
   "CREATE INDEX IF NOT EXISTS seized_item_action ON seized_items(department_id,action_key,report_id)",
   "CREATE INDEX IF NOT EXISTS seized_photo_reference ON seized_item_photos(image_id,department_id,report_id)",
   "CREATE INDEX IF NOT EXISTS seized_item_identity ON seized_items(department_id,id_token,report_id)",
   "CREATE INDEX IF NOT EXISTS seized_item_kind ON seized_items(department_id,kind,report_id)",
   "CREATE INDEX IF NOT EXISTS seized_report_location ON seized_reports(department_id,location)",
   "CREATE TABLE IF NOT EXISTS seized_requests(department_id TEXT NOT NULL,account_uid TEXT NOT NULL,request_id TEXT NOT NULL,fingerprint TEXT NOT NULL,resource_key TEXT NOT NULL,resource_rev INTEGER NOT NULL,operation TEXT NOT NULL,result_n INTEGER NOT NULL,result_id TEXT,permission_mode TEXT NOT NULL,permission_keys TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(department_id,account_uid,request_id))WITHOUT ROWID",
   "DELETE FROM meta WHERE k='seized_cutover_ready'",
   "CREATE TABLE IF NOT EXISTS award_resources(department_id TEXT NOT NULL,resource TEXT NOT NULL,root_kind INTEGER NOT NULL,list_kind INTEGER NOT NULL,PRIMARY KEY(department_id,resource)) WITHOUT ROWID",
   "CREATE TABLE IF NOT EXISTS award_records(department_id TEXT NOT NULL,record_id TEXT NOT NULL,sequence INTEGER NOT NULL,business_id TEXT,employee_key TEXT,category TEXT,hijri_date TEXT,score REAL,case_count REAL,file_ok INTEGER,eligible INTEGER,status TEXT,employee_number TEXT,city TEXT,work_field TEXT,phone TEXT,email TEXT,declarer_name TEXT,approver_name TEXT,approver_title TEXT,work_description TEXT,work_evidence TEXT,picture TEXT,employee_signature TEXT,approver_signature TEXT,author_name TEXT,legacy_name TEXT,test_marker TEXT,legacy_employee_key TEXT,legacy_status TEXT,legacy_employee_name TEXT,legacy_award TEXT,status_reason TEXT,legacy_reason TEXT,reason TEXT,presence_mask INTEGER NOT NULL,case_text_kind INTEGER NOT NULL,answers_kind INTEGER NOT NULL,scores_kind INTEGER NOT NULL,PRIMARY KEY(department_id,record_id),UNIQUE(department_id,sequence)) WITHOUT ROWID",
   "CREATE INDEX IF NOT EXISTS award_record_order ON award_records(department_id,sequence DESC)",
   "CREATE INDEX IF NOT EXISTS award_record_employee ON award_records(department_id,employee_key)",
   "CREATE TABLE IF NOT EXISTS award_case_texts(department_id TEXT NOT NULL,record_id TEXT NOT NULL,position INTEGER NOT NULL,value TEXT,PRIMARY KEY(department_id,record_id,position),FOREIGN KEY(department_id,record_id)REFERENCES award_records(department_id,record_id)ON DELETE CASCADE) WITHOUT ROWID",
   "CREATE TABLE IF NOT EXISTS award_answers(department_id TEXT NOT NULL,record_id TEXT NOT NULL,position INTEGER NOT NULL,value INTEGER,PRIMARY KEY(department_id,record_id,position),FOREIGN KEY(department_id,record_id)REFERENCES award_records(department_id,record_id)ON DELETE CASCADE) WITHOUT ROWID",
   "CREATE TABLE IF NOT EXISTS award_score_rows(department_id TEXT NOT NULL,record_id TEXT NOT NULL,row_number INTEGER NOT NULL,PRIMARY KEY(department_id,record_id,row_number),FOREIGN KEY(department_id,record_id)REFERENCES award_records(department_id,record_id)ON DELETE CASCADE) WITHOUT ROWID",
   "CREATE TABLE IF NOT EXISTS award_scores(department_id TEXT NOT NULL,record_id TEXT NOT NULL,row_number INTEGER NOT NULL,column_number INTEGER NOT NULL,value REAL,PRIMARY KEY(department_id,record_id,row_number,column_number),FOREIGN KEY(department_id,record_id,row_number)REFERENCES award_score_rows(department_id,record_id,row_number)ON DELETE CASCADE) WITHOUT ROWID",
   "CREATE TABLE IF NOT EXISTS award_documents(department_id TEXT NOT NULL,version INTEGER NOT NULL,group_key TEXT NOT NULL,title TEXT,lead TEXT,foot TEXT,presence_mask INTEGER NOT NULL,sections_kind INTEGER NOT NULL,PRIMARY KEY(department_id,version,group_key)) WITHOUT ROWID",
   "CREATE TABLE IF NOT EXISTS award_doc_sections(department_id TEXT NOT NULL,version INTEGER NOT NULL,group_key TEXT NOT NULL,position INTEGER NOT NULL,title TEXT,header TEXT,body TEXT,presence_mask INTEGER NOT NULL,items_kind INTEGER NOT NULL,PRIMARY KEY(department_id,version,group_key,position),FOREIGN KEY(department_id,version,group_key)REFERENCES award_documents(department_id,version,group_key)ON DELETE CASCADE) WITHOUT ROWID",
   "CREATE TABLE IF NOT EXISTS award_doc_items(department_id TEXT NOT NULL,version INTEGER NOT NULL,group_key TEXT NOT NULL,section_position INTEGER NOT NULL,position INTEGER NOT NULL,kind TEXT,text TEXT,presence_mask INTEGER NOT NULL,PRIMARY KEY(department_id,version,group_key,section_position,position),FOREIGN KEY(department_id,version,group_key,section_position)REFERENCES award_doc_sections(department_id,version,group_key,position)ON DELETE CASCADE) WITHOUT ROWID",
   "CREATE TABLE IF NOT EXISTS award_requests(department_id TEXT NOT NULL,account_uid TEXT NOT NULL,request_id TEXT NOT NULL,fingerprint TEXT NOT NULL,resource_key TEXT NOT NULL,resource_rev INTEGER NOT NULL,operation TEXT NOT NULL,result_n INTEGER NOT NULL,result_id TEXT,permission_mode TEXT NOT NULL,permission_count INTEGER NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(department_id,account_uid,request_id)) WITHOUT ROWID",
   "CREATE TABLE IF NOT EXISTS award_request_checks(department_id TEXT NOT NULL,account_uid TEXT NOT NULL,request_id TEXT NOT NULL,position INTEGER NOT NULL,check_kind TEXT NOT NULL,permission_key TEXT NOT NULL,PRIMARY KEY(department_id,account_uid,request_id,position),FOREIGN KEY(department_id,account_uid,request_id)REFERENCES award_requests(department_id,account_uid,request_id)ON DELETE CASCADE) WITHOUT ROWID",
   "INSERT INTO meta(k,v)VALUES('schema_version','9')ON CONFLICT(k)DO UPDATE SET v=excluded.v"
  ]
 },
 {
  "name": "0010_operational_domains",
  "oc": {
   "head": [
    "SELECT CASE WHEN EXISTS(SELECT 1 FROM kv WHERE EXISTS(SELECT 1 FROM json_each('[\"bassam_staffing_v3\",\"bassam_staffing_v2\",\"bassam_staffing_snap_v1\",\"bassam_staffing_locks_v1\",\"bassam_callsigns_v1\",\"bassam_perm_limit_v1\",\"bassam_shift_options_v1\",\"bassam_dayshift_v1\",\"bassam_dayfocus_v1\",\"bassam_plan_v1\",\"bassam_zone_opts_v1\",\"bassam_gate_opts_v1\",\"bassam_mark_kinds_v1\",\"bassam_rounds_v1\",\"bassam_employees_v1\",\"bassam_options_v1\",\"bassam_dreport_v1\",\"bassam_leave_kinds_v1\",\"bassam_dr_grp_v1\",\"bassam_tasks_v1\",\"bassam_tasks_locks_v1\"]') op_legacy WHERE k=op_legacy.value OR k GLOB op_legacy.value||':*' OR k GLOB '*:'||op_legacy.value OR k GLOB '*:'||op_legacy.value||':*')) AND COALESCE((SELECT v FROM meta WHERE k='operations_cutover_ready'),'')<>'validated' THEN json_extract('{}','KIVO_OPERATIONS_VALIDATED_CUTOVER_REQUIRED')END"
   ],
   "tail": [
    "DELETE FROM meta WHERE k='operations_cutover_ready'",
    "INSERT INTO meta(k,v)VALUES('schema_version','10')ON CONFLICT(k)DO UPDATE SET v=excluded.v"
   ],
   "skip": [
    "ops_zone_prayer_capacity"
   ],
   "pin": {
    "ops_round_day_move": "CREATE TABLE IF NOT EXISTS ops_round_day_move(\"department_id\" TEXT NOT NULL,\"resource\" TEXT NOT NULL,\"row_key\" TEXT NOT NULL,\"entity_kind\" TEXT NOT NULL,\"f_by_kind\" INTEGER,\"f_by_text\" TEXT,\"f_by_number\" REAL,\"f_by_position\" INTEGER,\"f_from_u49__kind\" INTEGER,\"f_from_u49__text\" TEXT,\"f_from_u49__number\" REAL,\"f_from_u49__position\" INTEGER,\"f_from_u4c_bl_kind\" INTEGER,\"f_from_u4c_bl_text\" TEXT,\"f_from_u4c_bl_number\" REAL,\"f_from_u4c_bl_position\" INTEGER,\"f_key_kind\" INTEGER,\"f_key_text\" TEXT,\"f_key_number\" REAL,\"f_key_position\" INTEGER,\"f_kind_kind\" INTEGER,\"f_kind_text\" TEXT,\"f_kind_number\" REAL,\"f_kind_position\" INTEGER,\"f_name_kind\" INTEGER,\"f_name_text\" TEXT,\"f_name_number\" REAL,\"f_name_position\" INTEGER,\"f_t_kind\" INTEGER,\"f_t_text\" TEXT,\"f_t_number\" REAL,\"f_t_position\" INTEGER,\"f_to_u49__kind\" INTEGER,\"f_to_u49__text\" TEXT,\"f_to_u49__number\" REAL,\"f_to_u49__position\" INTEGER,\"f_to_u4c_bl_kind\" INTEGER,\"f_to_u4c_bl_text\" TEXT,\"f_to_u4c_bl_number\" REAL,\"f_to_u4c_bl_position\" INTEGER,\"f_tok_kind\" INTEGER,\"f_tok_text\" TEXT,\"f_tok_number\" REAL,\"f_tok_position\" INTEGER,CHECK(entity_kind='ops_round_day_move'),PRIMARY KEY(department_id,resource,row_key),FOREIGN KEY(department_id,resource,row_key,entity_kind) REFERENCES ops_nodes(department_id,resource,row_key,entity_kind) ON DELETE CASCADE) WITHOUT ROWID"
   },
   "n": 59,
   "fnv": "7a11714b"
  }
 },
 {
  "name": "0011_session_device",
  "sql": [
   "ALTER TABLE sess ADD COLUMN dv TEXT",
   "ALTER TABLE sess ADD COLUMN br TEXT",
   "INSERT INTO meta(k,v)VALUES('schema_version','11')ON CONFLICT(k)DO UPDATE SET v=excluded.v"
  ]
 },
 {
  "name": "0012_prayer_readings",
  "sql": [
   "CREATE TABLE IF NOT EXISTS ops_zone_prayer_capacity(\"department_id\" TEXT NOT NULL,\"resource\" TEXT NOT NULL,\"row_key\" TEXT NOT NULL,\"entity_kind\" TEXT NOT NULL,\"f_cap_kind\" INTEGER,\"f_cap_text\" TEXT,\"f_cap_number\" REAL,\"f_cap_position\" INTEGER,\"f_n_kind\" INTEGER,\"f_n_text\" TEXT,\"f_n_number\" REAL,\"f_n_position\" INTEGER,\"f_p_kind\" INTEGER,\"f_p_text\" TEXT,\"f_p_number\" REAL,\"f_p_position\" INTEGER,CHECK(entity_kind='ops_zone_prayer_capacity'),PRIMARY KEY(department_id,resource,row_key),FOREIGN KEY(department_id,resource,row_key,entity_kind) REFERENCES ops_nodes(department_id,resource,row_key,entity_kind) ON DELETE CASCADE) WITHOUT ROWID",
   "ALTER TABLE ops_round_day_move ADD COLUMN \"f_rm_kind\" INTEGER",
   "ALTER TABLE ops_round_day_move ADD COLUMN \"f_rm_text\" TEXT",
   "ALTER TABLE ops_round_day_move ADD COLUMN \"f_rm_number\" REAL",
   "ALTER TABLE ops_round_day_move ADD COLUMN \"f_rm_position\" INTEGER",
   "ALTER TABLE ops_round_day_move ADD COLUMN \"f_src_kind\" INTEGER",
   "ALTER TABLE ops_round_day_move ADD COLUMN \"f_src_text\" TEXT",
   "ALTER TABLE ops_round_day_move ADD COLUMN \"f_src_number\" REAL",
   "ALTER TABLE ops_round_day_move ADD COLUMN \"f_src_position\" INTEGER",
   "UPDATE ops_round_day_move SET f_rm_kind=0,f_src_kind=0",
   "INSERT INTO ops_nodes(department_id,resource,row_key,parent_key,member_key,position,node_kind,variant,tuple_length,schema_id,entity_kind) SELECT e.department_id,e.resource,e.row_key||'/v:0',e.row_key,'@',0,7,NULL,NULL,'ops_staffing_month_shifts_entry_choice_0','ops_staffing_month_shifts_entry_choice_0' FROM ops_nodes e JOIN ops_nodes m ON m.department_id=e.department_id AND m.resource=e.resource AND m.row_key=e.parent_key JOIN ops_nodes z ON z.department_id=m.department_id AND z.resource=m.resource AND z.row_key=m.parent_key WHERE e.node_kind=7 AND e.schema_id='ops_staffing_month_shifts_entry_choice_0' AND m.schema_id='ops_plan_deleted_months' AND m.member_key='pc' AND z.schema_id='ops_plan_live_floors_floor_zones_element'",
   "INSERT INTO ops_staffing_month_shifts_entry_choice_0(department_id,resource,row_key,entity_kind,value_kind,value_text,value_number) SELECT v.department_id,v.resource,v.row_key||'/v:0',v.entity_kind,v.value_kind,v.value_text,v.value_number FROM ops_staffing_month_shifts_entry_choice_0 v JOIN ops_nodes e ON e.department_id=v.department_id AND e.resource=v.resource AND e.row_key=v.row_key JOIN ops_nodes m ON m.department_id=e.department_id AND m.resource=e.resource AND m.row_key=e.parent_key JOIN ops_nodes z ON z.department_id=m.department_id AND z.resource=m.resource AND z.row_key=m.parent_key WHERE e.node_kind=7 AND e.schema_id='ops_staffing_month_shifts_entry_choice_0' AND m.schema_id='ops_plan_deleted_months' AND m.member_key='pc' AND z.schema_id='ops_plan_live_floors_floor_zones_element'",
   "DELETE FROM ops_staffing_month_shifts_entry_choice_0 WHERE (department_id,resource,row_key) IN(SELECT e.department_id,e.resource,e.row_key FROM ops_nodes e JOIN ops_nodes m ON m.department_id=e.department_id AND m.resource=e.resource AND m.row_key=e.parent_key JOIN ops_nodes z ON z.department_id=m.department_id AND z.resource=m.resource AND z.row_key=m.parent_key WHERE e.schema_id='ops_staffing_month_shifts_entry_choice_0' AND m.schema_id='ops_plan_deleted_months' AND m.member_key='pc' AND z.schema_id='ops_plan_live_floors_floor_zones_element')",
   "UPDATE ops_nodes SET node_kind=CASE WHEN node_kind=7 THEN 6 ELSE node_kind END,variant=CASE WHEN node_kind=7 THEN 0 ELSE NULL END,schema_id='ops_zone_prayer_reading',entity_kind=NULL WHERE schema_id='ops_staffing_month_shifts_entry_choice_0' AND (department_id,resource,parent_key) IN(SELECT m.department_id,m.resource,m.row_key FROM ops_nodes m JOIN ops_nodes z ON z.department_id=m.department_id AND z.resource=m.resource AND z.row_key=m.parent_key WHERE m.schema_id='ops_plan_deleted_months' AND m.member_key='pc' AND z.schema_id='ops_plan_live_floors_floor_zones_element')",
   "UPDATE ops_nodes SET schema_id='ops_zone_prayer_counts' WHERE schema_id='ops_plan_deleted_months' AND member_key='pc' AND (department_id,resource,parent_key) IN(SELECT z.department_id,z.resource,z.row_key FROM ops_nodes z WHERE z.schema_id='ops_plan_live_floors_floor_zones_element')",
   "INSERT INTO meta(k,v)VALUES('schema_version','12')ON CONFLICT(k)DO UPDATE SET v=excluded.v"
  ]
 },
 {
  "name": "0013_period_storage",
  "sql": [
   "CREATE TABLE IF NOT EXISTS ops_period_summary (department_id TEXT NOT NULL, resource TEXT NOT NULL, period TEXT NOT NULL, rev INTEGER NOT NULL, v_json TEXT NOT NULL, PRIMARY KEY (department_id, resource, period)) WITHOUT ROWID",
   "INSERT INTO meta (k, v) VALUES ('schema_version', '13') ON CONFLICT(k) DO UPDATE SET v = excluded.v"
  ]
 },
 {
  "name": "0014_gregorian_calendar",
  "sql": [
   "CREATE TABLE IF NOT EXISTS cal_hg_days (hy INTEGER NOT NULL, hm INTEGER NOT NULL, hd INTEGER NOT NULL, gy INTEGER NOT NULL, gm INTEGER NOT NULL, gd INTEGER NOT NULL, PRIMARY KEY (hy, hm, hd)) WITHOUT ROWID",
   "SELECT CASE WHEN EXISTS (SELECT 1 FROM daily_stats_days WHERE NOT EXISTS (SELECT 1 FROM cal_hg_days WHERE hy = CAST(substr(hijri_date, 1, 4) AS INTEGER) AND hm = CAST(substr(hijri_date, 6, 2) AS INTEGER) AND hd = CAST(substr(hijri_date, 9, 2) AS INTEGER))) OR EXISTS (SELECT 1 FROM custody_movements WHERE NOT EXISTS (SELECT 1 FROM cal_hg_days WHERE hy = hijri_year AND hm = hijri_month AND hd = MAX(hijri_day, 1))) OR EXISTS (SELECT 1 FROM irshad_reports WHERE hijri_year IS NOT NULL AND NOT EXISTS (SELECT 1 FROM cal_hg_days WHERE hy = hijri_year AND hm = hijri_month AND hd = MAX(COALESCE(hijri_day, 1), 1))) OR EXISTS (SELECT 1 FROM seized_reports WHERE hijri_year IS NOT NULL AND NOT EXISTS (SELECT 1 FROM cal_hg_days WHERE hy = hijri_year AND hm = hijri_month AND hd = MAX(COALESCE(hijri_day, 1), 1))) THEN json_extract('{}', 'KIVO_CAL_UNMAPPED') END",
   "ALTER TABLE daily_stats_days RENAME COLUMN hijri_date TO greg_date",
   "ALTER TABLE daily_stats_month_locks RENAME COLUMN hijri_year TO greg_year",
   "ALTER TABLE daily_stats_month_locks RENAME COLUMN hijri_month TO greg_month",
   "CREATE TABLE daily_stats_day_locks_g ( site TEXT NOT NULL, greg_year INTEGER NOT NULL, greg_month INTEGER NOT NULL, greg_day INTEGER NOT NULL CHECK (greg_day BETWEEN 1 AND 31), is_open INTEGER NOT NULL CHECK (is_open IN (0,1)), is_shut INTEGER NOT NULL CHECK (is_shut IN (0,1)), PRIMARY KEY (site,greg_year,greg_month,greg_day), FOREIGN KEY (site,greg_year,greg_month) REFERENCES daily_stats_month_locks(site,greg_year,greg_month) ON DELETE CASCADE ) WITHOUT ROWID",
   "INSERT INTO daily_stats_day_locks_g (site, greg_year, greg_month, greg_day, is_open, is_shut) SELECT site, hijri_year, hijri_month, hijri_day, is_open, is_shut FROM daily_stats_day_locks",
   "DROP TABLE daily_stats_day_locks",
   "ALTER TABLE daily_stats_day_locks_g RENAME TO daily_stats_day_locks",
   "CREATE TABLE custody_movements_g ( department_id TEXT NOT NULL, move_id TEXT NOT NULL, issue_id TEXT NOT NULL, item_id TEXT NOT NULL, sequence INTEGER NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('out','in','dmg','lost')), holder_key TEXT NOT NULL, greg_year INTEGER NOT NULL, greg_month INTEGER NOT NULL CHECK(greg_month BETWEEN 1 AND 12), greg_day INTEGER NOT NULL CHECK(greg_day BETWEEN 0 AND 31), condition TEXT, note TEXT, color_snapshot TEXT, actor_uid TEXT, actor_label TEXT, holder_nid_snapshot TEXT, holder_empno_snapshot TEXT, holder_name_snapshot TEXT, presence_mask INTEGER NOT NULL, created_at INTEGER, PRIMARY KEY(department_id,move_id), UNIQUE(department_id,sequence), FOREIGN KEY(department_id,issue_id) REFERENCES custody_issues(department_id,issue_id), FOREIGN KEY(department_id,item_id) REFERENCES custody_items(department_id,item_id) ) WITHOUT ROWID",
   "INSERT INTO custody_movements_g (department_id, move_id, issue_id, item_id, sequence, kind, holder_key, greg_year, greg_month, greg_day, condition, note, color_snapshot, actor_uid, actor_label, holder_nid_snapshot, holder_empno_snapshot, holder_name_snapshot, presence_mask, created_at) SELECT c.department_id, c.move_id, c.issue_id, c.item_id, c.sequence, c.kind, c.holder_key, g.gy, g.gm, CASE WHEN c.hijri_day = 0 THEN 0 ELSE g.gd END, c.condition, c.note, c.color_snapshot, c.actor_uid, c.actor_label, c.holder_nid_snapshot, c.holder_empno_snapshot, c.holder_name_snapshot, c.presence_mask, c.created_at FROM custody_movements c JOIN cal_hg_days g ON g.hy = c.hijri_year AND g.hm = c.hijri_month AND g.hd = MAX(c.hijri_day, 1)",
   "DROP TABLE custody_movements",
   "ALTER TABLE custody_movements_g RENAME TO custody_movements",
   "CREATE INDEX IF NOT EXISTS custody_move_timeline ON custody_movements(department_id,greg_year,greg_month,greg_day,sequence,move_id)",
   "CREATE INDEX IF NOT EXISTS custody_issue_timeline ON custody_movements(department_id,issue_id,greg_year DESC,greg_month DESC,greg_day DESC,sequence DESC)",
   "CREATE INDEX IF NOT EXISTS custody_holder ON custody_movements(department_id,holder_key,issue_id)",
   "ALTER TABLE irshad_reports RENAME COLUMN hijri_year TO greg_year",
   "ALTER TABLE irshad_reports RENAME COLUMN hijri_month TO greg_month",
   "ALTER TABLE irshad_reports RENAME COLUMN hijri_day TO greg_day",
   "ALTER TABLE irshad_retro_windows RENAME COLUMN hijri_year TO greg_year",
   "ALTER TABLE irshad_retro_windows RENAME COLUMN hijri_month TO greg_month",
   "ALTER TABLE irshad_retro_windows RENAME COLUMN hijri_day TO greg_day",
   "ALTER TABLE seized_reports RENAME COLUMN hijri_year TO greg_year",
   "ALTER TABLE seized_reports RENAME COLUMN hijri_month TO greg_month",
   "ALTER TABLE seized_reports RENAME COLUMN hijri_day TO greg_day",
   "ALTER TABLE seized_retro_windows RENAME COLUMN hijri_year TO greg_year",
   "ALTER TABLE seized_retro_windows RENAME COLUMN hijri_month TO greg_month",
   "ALTER TABLE seized_retro_windows RENAME COLUMN hijri_day TO greg_day",
   "ALTER TABLE award_records RENAME COLUMN hijri_date TO greg_date",
   "UPDATE daily_stats_days SET greg_date = (SELECT printf('%04d-%02d-%02d', gy, gm, gd) FROM cal_hg_days WHERE hy = CAST(substr(greg_date, 1, 4) AS INTEGER) AND hm = CAST(substr(greg_date, 6, 2) AS INTEGER) AND hd = CAST(substr(greg_date, 9, 2) AS INTEGER)) WHERE CAST(substr(greg_date, 1, 4) AS INTEGER) < 1700",
   "UPDATE irshad_reports SET (greg_year, greg_month, greg_day) = (SELECT gy, gm, CASE WHEN COALESCE(irshad_reports.greg_day, 0) = 0 THEN irshad_reports.greg_day ELSE gd END FROM cal_hg_days WHERE hy = irshad_reports.greg_year AND hm = irshad_reports.greg_month AND hd = MAX(COALESCE(irshad_reports.greg_day, 1), 1)) WHERE greg_year IS NOT NULL AND greg_year < 1700",
   "UPDATE seized_reports SET (greg_year, greg_month, greg_day) = (SELECT gy, gm, CASE WHEN COALESCE(seized_reports.greg_day, 0) = 0 THEN seized_reports.greg_day ELSE gd END FROM cal_hg_days WHERE hy = seized_reports.greg_year AND hm = seized_reports.greg_month AND hd = MAX(COALESCE(seized_reports.greg_day, 1), 1)) WHERE greg_year IS NOT NULL AND greg_year < 1700",
   "INSERT INTO meta (k, v) SELECT 'cal_pend', x FROM (SELECT json_group_object(d, json(r)) x, COUNT(*) n FROM (SELECT department_id d, json_group_array(resource) r FROM (SELECT DISTINCT department_id, resource FROM ops_nodes WHERE resource IN ('bassam_rounds_v1', 'bassam_rounds_arc_v1', 'bassam_dreport_v1', 'bassam_tasks_v1', 'bassam_tasks_locks_v1', 'bassam_staffing_v3', 'bassam_staffing_v2', 'bassam_staffing_locks_v1', 'bassam_plan_v1', 'bassam_dayshift_v1', 'bassam_dayfocus_v1') ORDER BY 1, 2) GROUP BY department_id)) WHERE n > 0 ON CONFLICT(k) DO UPDATE SET v = excluded.v",
   "INSERT INTO meta (k, v) VALUES ('schema_version', '14') ON CONFLICT(k) DO UPDATE SET v = excluded.v"
  ]
 }
];
var KIVO_SCHEMA_VERSION = 14;
function kivoMigOcExpand(m, prepared) {
  var c = m.oc, mid = ocCreateStatements(prepared || ocPrepare(opDefinitions(), OC_TABLE_NAMES)).filter(function (s) { var t = /IF NOT EXISTS (\w+)/.exec(s); return !(t && c.skip.indexOf(t[1]) >= 0); })
    .map(function (s) { var t = /IF NOT EXISTS (\w+)/.exec(s); return t && Object.prototype.hasOwnProperty.call(c.pin, t[1]) ? c.pin[t[1]] : s; });
  var u = mid.map(function (s) { return s + '\n'; }).join(''), h = 0x811c9dc5, i;
  for (i = 0; i < u.length; i++) { h ^= u.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  if (mid.length !== c.n || ('00000000' + h.toString(16)).slice(-8) !== c.fnv) throw new Error('migration-compact-drift: ' + m.name);
  return c.head.concat(mid, c.tail);
}
KIVO_MIGRATIONS.forEach(function (m) { if (!m.oc) return; var v = null; Object.defineProperty(m, 'sql', { enumerable: true, get: function () { return v || (v = kivoMigOcExpand(m)); } }); });
