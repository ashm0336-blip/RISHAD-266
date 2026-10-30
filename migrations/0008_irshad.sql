-- Typed Irshad cutover; validated preparation and one atomic migration batch are required.
SELECT CASE WHEN EXISTS(SELECT 1 FROM kv WHERE k IN ('bassam_irshad_v1','bassam_irshad_langs_v1','bassam_irshad_locs_v1','bassam_irshad_retro_v1') OR k GLOB 'bsdept:*:bassam_irshad_v1' OR k GLOB 'bsdept:*:bassam_irshad_v1:*' OR k GLOB 'bassam_irshad_v1:*' OR k GLOB 'bsdept:*:bassam_irshad_langs_v1' OR k GLOB 'bsdept:*:bassam_irshad_langs_v1:*' OR k GLOB 'bassam_irshad_langs_v1:*' OR k GLOB 'bsdept:*:bassam_irshad_locs_v1' OR k GLOB 'bsdept:*:bassam_irshad_locs_v1:*' OR k GLOB 'bassam_irshad_locs_v1:*' OR k GLOB 'bsdept:*:bassam_irshad_retro_v1' OR k GLOB 'bsdept:*:bassam_irshad_retro_v1:*' OR k GLOB 'bassam_irshad_retro_v1:*') AND COALESCE((SELECT v FROM meta WHERE k='ir_cutover_ready'),'')!='validated' THEN json_extract('{}','KIVO_IRSHAD_VALIDATED_CUTOVER_REQUIRED') END;
CREATE TABLE IF NOT EXISTS irshad_reports (
 department_id TEXT NOT NULL, report_id TEXT NOT NULL, sequence INTEGER NOT NULL,
 hijri_year REAL,hijri_month REAL,hijri_day REAL,created_at REAL,shift TEXT,
 employee_key TEXT,employee_name TEXT,location TEXT,actor_label TEXT,
 brochures REAL,prosecution REAL,police REAL,edited_at REAL,edited_by TEXT,
 legacy_language TEXT,legacy_count REAL,legacy_author TEXT,test_marker TEXT,
 presence_mask INTEGER NOT NULL,languages_null INTEGER NOT NULL,
 PRIMARY KEY(department_id,report_id),UNIQUE(department_id,sequence)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS irshad_report_timeline ON irshad_reports(department_id,hijri_year DESC,hijri_month DESC,hijri_day DESC,created_at DESC,sequence);
CREATE INDEX IF NOT EXISTS irshad_report_shift ON irshad_reports(department_id,shift,hijri_year,hijri_month,hijri_day,sequence);
CREATE TABLE IF NOT EXISTS irshad_report_languages (
 department_id TEXT NOT NULL,report_id TEXT NOT NULL,position INTEGER NOT NULL,
 language TEXT,count REAL,presence_mask INTEGER NOT NULL,
 PRIMARY KEY(department_id,report_id,position),
 FOREIGN KEY(department_id,report_id) REFERENCES irshad_reports(department_id,report_id) ON DELETE CASCADE
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS irshad_catalog_entries (
 department_id TEXT NOT NULL,kind TEXT NOT NULL,position INTEGER NOT NULL,value TEXT NOT NULL,
 PRIMARY KEY(department_id,kind,position)
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS irshad_retro_windows (
 department_id TEXT NOT NULL,window_id TEXT NOT NULL,sequence INTEGER NOT NULL,
 hijri_year REAL,hijri_month REAL,hijri_day REAL,scope_mask INTEGER NOT NULL,
 opened_at REAL,until_at REAL,hours REAL,reason TEXT,reason_missing INTEGER,
 closed_at REAL,by_id TEXT,by_username TEXT,by_employee_key TEXT,by_name TEXT,
 closed_by_id TEXT,closed_by_username TEXT,closed_by_employee_key TEXT,
 presence_mask INTEGER NOT NULL,by_kind INTEGER NOT NULL,by_mask INTEGER NOT NULL,
 closed_by_kind INTEGER NOT NULL,closed_by_mask INTEGER NOT NULL,
 PRIMARY KEY(department_id,window_id),UNIQUE(department_id,sequence)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS irshad_retro_scope ON irshad_retro_windows(department_id,hijri_year,hijri_month,hijri_day,until_at);
CREATE TABLE IF NOT EXISTS irshad_requests (
 department_id TEXT NOT NULL,account_uid TEXT NOT NULL,request_id TEXT NOT NULL,
 fingerprint TEXT NOT NULL,resource_key TEXT NOT NULL,resource_rev INTEGER NOT NULL,
 operation TEXT NOT NULL,result_n INTEGER NOT NULL,result_id TEXT,created_at INTEGER NOT NULL,
 PRIMARY KEY(department_id,account_uid,request_id)
) WITHOUT ROWID;
DELETE FROM meta WHERE k='ir_cutover_ready';
INSERT INTO meta(k,v) VALUES ('schema_version', '8') ON CONFLICT(k) DO UPDATE SET v=excluded.v;
