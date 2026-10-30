-- Custody cutover requires the Worker's validated source plan when legacy rows exist.
SELECT CASE WHEN EXISTS (SELECT 1 FROM kv WHERE k='bassam_custody_v1' OR k GLOB 'bsdept:*:bassam_custody_v1') AND COALESCE((SELECT v FROM meta WHERE k='cu_cutover_ready'),'')!='validated' THEN json_extract('{}','KIVO_CUSTODY_VALIDATED_CUTOVER_REQUIRED') END;
CREATE TABLE IF NOT EXISTS custody_items (
  department_id TEXT NOT NULL, item_id TEXT NOT NULL, name TEXT NOT NULL,
  qty REAL NOT NULL CHECK(qty>=0), prefix TEXT, color TEXT, presence_mask INTEGER NOT NULL,
  PRIMARY KEY(department_id,item_id), UNIQUE(department_id,name)
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS custody_issues (
  department_id TEXT NOT NULL, issue_id TEXT NOT NULL, item_id TEXT NOT NULL,
  serial TEXT NOT NULL, serial_number INTEGER NOT NULL DEFAULT 0, legacy_identity TEXT,
  PRIMARY KEY(department_id,issue_id),
  FOREIGN KEY(department_id,item_id) REFERENCES custody_items(department_id,item_id)
) WITHOUT ROWID;
CREATE UNIQUE INDEX IF NOT EXISTS custody_serial ON custody_issues(department_id,item_id,serial) WHERE serial!='';
CREATE INDEX IF NOT EXISTS custody_serial_number ON custody_issues(department_id,item_id,serial_number);
CREATE TABLE IF NOT EXISTS custody_movements (
  department_id TEXT NOT NULL, move_id TEXT NOT NULL, issue_id TEXT NOT NULL, item_id TEXT NOT NULL,
  sequence INTEGER NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('out','in','dmg','lost')),
  holder_key TEXT NOT NULL, hijri_year INTEGER NOT NULL, hijri_month INTEGER NOT NULL CHECK(hijri_month BETWEEN 1 AND 12),
  hijri_day INTEGER NOT NULL CHECK(hijri_day BETWEEN 0 AND 30), condition TEXT, note TEXT, color_snapshot TEXT,
  actor_uid TEXT, actor_label TEXT, holder_nid_snapshot TEXT, holder_empno_snapshot TEXT, holder_name_snapshot TEXT,
  presence_mask INTEGER NOT NULL, created_at INTEGER,
  PRIMARY KEY(department_id,move_id), UNIQUE(department_id,sequence),
  FOREIGN KEY(department_id,issue_id) REFERENCES custody_issues(department_id,issue_id),
  FOREIGN KEY(department_id,item_id) REFERENCES custody_items(department_id,item_id)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS custody_move_timeline ON custody_movements(department_id,hijri_year,hijri_month,hijri_day,sequence,move_id);
CREATE INDEX IF NOT EXISTS custody_issue_timeline ON custody_movements(department_id,issue_id,hijri_year DESC,hijri_month DESC,hijri_day DESC,sequence DESC);
CREATE INDEX IF NOT EXISTS custody_holder ON custody_movements(department_id,holder_key,issue_id);
CREATE TABLE IF NOT EXISTS custody_requests (
  department_id TEXT NOT NULL, account_uid TEXT NOT NULL, request_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL, resource_rev INTEGER NOT NULL, operation TEXT NOT NULL,
  result_n INTEGER NOT NULL, item_id TEXT, created_at INTEGER NOT NULL,
  PRIMARY KEY(department_id,account_uid,request_id)
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS custody_request_outputs (
  department_id TEXT NOT NULL, account_uid TEXT NOT NULL, request_id TEXT NOT NULL, position INTEGER NOT NULL,
  issue_id TEXT NOT NULL, move_id TEXT NOT NULL, serial TEXT NOT NULL,
  PRIMARY KEY(department_id,account_uid,request_id,position),
  FOREIGN KEY(department_id,account_uid,request_id) REFERENCES custody_requests(department_id,account_uid,request_id)
) WITHOUT ROWID;
DELETE FROM meta WHERE k='cu_cutover_ready';
INSERT INTO meta(k,v) VALUES ('schema_version', '6') ON CONFLICT(k) DO UPDATE SET v=excluded.v;
