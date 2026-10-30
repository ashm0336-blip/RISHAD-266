-- Typed notification domain. Existing KV documents are validated by nfLegacyPrepare
-- and cut over in the SAME migrateDb batch as this DDL; direct SQL migration with
-- nonempty legacy documents is deliberately rejected by the guard below.
SELECT CASE WHEN EXISTS (SELECT 1 FROM kv WHERE k IN ('bassam_notif_sys_v1','bassam_bc_v1','bassam_notif_cfg_v1','bassam_notif_v1') OR k LIKE 'bsdept:%:bassam_notif_v1') AND COALESCE((SELECT v FROM meta WHERE k='nf_cutover_ready'),'') != 'validated' THEN json_extract('{}','KIVO_NOTIFICATION_VALIDATED_CUTOVER_REQUIRED') END;
CREATE TABLE IF NOT EXISTS notification_messages (
  scope TEXT NOT NULL, id TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('event','broadcast')),
  department TEXT NOT NULL DEFAULT '', type TEXT NOT NULL, category TEXT NOT NULL,
  priority TEXT NOT NULL CHECK(priority IN ('info','act','urg')), channel TEXT NOT NULL CHECK(channel IN ('bell','toast')),
  title TEXT NOT NULL, body TEXT NOT NULL, created_at INTEGER NOT NULL,
  author_key TEXT NOT NULL DEFAULT '', author_name TEXT NOT NULL DEFAULT '',
  action_text TEXT NOT NULL DEFAULT '', link TEXT NOT NULL DEFAULT '',
  requires_ack INTEGER NOT NULL DEFAULT 0 CHECK(requires_ack IN (0,1)), pinned INTEGER NOT NULL DEFAULT 0 CHECK(pinned IN (0,1)),
  preview INTEGER NOT NULL DEFAULT 0 CHECK(preview IN (0,1)), department_broadcast INTEGER NOT NULL DEFAULT 0 CHECK(department_broadcast IN (0,1)),
  expires_at INTEGER NOT NULL DEFAULT 0, withdrawn_at INTEGER NOT NULL DEFAULT 0,
  reminders INTEGER NOT NULL DEFAULT 0 CHECK(reminders IN (0,1)), scheduled INTEGER NOT NULL DEFAULT 0 CHECK(scheduled IN (0,1)),
  target_mode TEXT NOT NULL DEFAULT 'message' CHECK(target_mode IN ('message','all','dept','role','shift','emp')),
  recipient_count INTEGER NOT NULL DEFAULT 0, server_origin INTEGER NOT NULL DEFAULT 0 CHECK(server_origin IN (0,1)), reminded_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(scope,id)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS notification_messages_time ON notification_messages(scope,created_at,id);
CREATE INDEX IF NOT EXISTS notification_messages_kind_scope ON notification_messages(kind,scope,created_at,id);
CREATE TABLE IF NOT EXISTS notification_targets (
  scope TEXT NOT NULL, message_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('employee','role','department','shift','all')),
  value TEXT NOT NULL, PRIMARY KEY(scope,message_id,kind,value),
  FOREIGN KEY(scope,message_id) REFERENCES notification_messages(scope,id) ON DELETE CASCADE
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS notification_user_state (
  account_uid TEXT NOT NULL, message_scope TEXT NOT NULL, message_id TEXT NOT NULL,
  read_at INTEGER NOT NULL DEFAULT 0, acknowledged_at INTEGER NOT NULL DEFAULT 0, dismissed_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(account_uid,message_scope,message_id),
  FOREIGN KEY(message_scope,message_id) REFERENCES notification_messages(scope,id) ON DELETE CASCADE
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS notification_targets_audience ON notification_targets(kind,value,scope,message_id);
CREATE INDEX IF NOT EXISTS notification_user_state_message ON notification_user_state(message_scope,message_id,account_uid);
CREATE TABLE IF NOT EXISTS notification_dedup (
  scope TEXT NOT NULL, once_key TEXT NOT NULL, created_at INTEGER NOT NULL, message_id TEXT,
  PRIMARY KEY(scope,once_key)
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS notification_type_overrides (
  type_id TEXT PRIMARY KEY, enabled INTEGER CHECK(enabled IS NULL OR enabled IN (0,1)),
  priority TEXT CHECK(priority IS NULL OR priority IN ('info','act','urg')),
  channel TEXT CHECK(channel IS NULL OR channel IN ('bell','toast')), template_text TEXT,
  target_override INTEGER NOT NULL DEFAULT 0 CHECK(target_override IN (0,1)),
  target_own INTEGER NOT NULL DEFAULT 0 CHECK(target_own IN (0,1)), target_lead INTEGER NOT NULL DEFAULT 0 CHECK(target_lead IN (0,1)),
  target_mgr INTEGER NOT NULL DEFAULT 0 CHECK(target_mgr IN (0,1)), target_sys INTEGER NOT NULL DEFAULT 0 CHECK(target_sys IN (0,1))
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS notification_checkpoints (
  scope TEXT NOT NULL, name TEXT NOT NULL, value INTEGER NOT NULL, PRIMARY KEY(scope,name)
) WITHOUT ROWID;
DELETE FROM meta WHERE k='nf_cutover_ready';
INSERT INTO meta (k, v) VALUES ('schema_version', '5') ON CONFLICT(k) DO UPDATE SET v=excluded.v;
