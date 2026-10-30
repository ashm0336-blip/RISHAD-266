-- Schema9: Seized and Award relational cutovers. App dataPlan and permit are mandatory.
SELECT CASE WHEN EXISTS(SELECT 1 FROM kv WHERE k IN ('bassam_award_v1','bassam_award_docs_v1','bassam_award_docs_v2') OR k GLOB 'bsdept:*:bassam_award_v1' OR k GLOB 'bsdept:*:bassam_award_v1:*' OR k GLOB 'bassam_award_v1:*' OR k GLOB 'bsdept:*:bassam_award_docs_v1' OR k GLOB 'bsdept:*:bassam_award_docs_v1:*' OR k GLOB 'bassam_award_docs_v1:*' OR k GLOB 'bsdept:*:bassam_award_docs_v2' OR k GLOB 'bsdept:*:bassam_award_docs_v2:*' OR k GLOB 'bassam_award_docs_v2:*') AND COALESCE((SELECT v FROM meta WHERE k='aw_cutover_ready'),'')<>'validated' THEN json_extract('{}','KIVO_AWARD_CUTOVER_REQUIRED') END;
-- STAGED seized portion of schema9. Never execute independently against cloud.
SELECT CASE WHEN EXISTS(SELECT 1 FROM kv WHERE k IN ('bassam_seized_v1','bassam_seized_cat_v1','bassam_seized_acts_v1','bassam_seized_locs_v1','bassam_seized_jew_v1','bassam_seized_retro_v1') OR k GLOB 'bsdept:*:bassam_seized_v1' OR k GLOB 'bsdept:*:bassam_seized_v1:*' OR k GLOB 'bassam_seized_v1:*' OR k GLOB 'bsdept:*:bassam_seized_cat_v1' OR k GLOB 'bsdept:*:bassam_seized_cat_v1:*' OR k GLOB 'bassam_seized_cat_v1:*' OR k GLOB 'bsdept:*:bassam_seized_acts_v1' OR k GLOB 'bsdept:*:bassam_seized_acts_v1:*' OR k GLOB 'bassam_seized_acts_v1:*' OR k GLOB 'bsdept:*:bassam_seized_locs_v1' OR k GLOB 'bsdept:*:bassam_seized_locs_v1:*' OR k GLOB 'bassam_seized_locs_v1:*' OR k GLOB 'bsdept:*:bassam_seized_jew_v1' OR k GLOB 'bsdept:*:bassam_seized_jew_v1:*' OR k GLOB 'bassam_seized_jew_v1:*' OR k GLOB 'bsdept:*:bassam_seized_retro_v1' OR k GLOB 'bsdept:*:bassam_seized_retro_v1:*' OR k GLOB 'bassam_seized_retro_v1:*') AND COALESCE((SELECT v FROM meta WHERE k='seized_cutover_ready'),'')!='validated' THEN json_extract('{}','KIVO_SEIZED_VALIDATED_CUTOVER_REQUIRED') END;
CREATE TABLE IF NOT EXISTS seized_resource_state(
 department_id TEXT NOT NULL,
 resource TEXT NOT NULL,
 value_kind INTEGER NOT NULL,
 list_kind INTEGER NOT NULL,
 version_kind INTEGER NOT NULL,
 version_number REAL,
 version_text TEXT,
 PRIMARY KEY(department_id,resource)
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS seized_reports(
 department_id TEXT NOT NULL,
 sequence INTEGER NOT NULL,
 report_id TEXT NOT NULL,
 hijri_year REAL,
 hijri_month REAL,
 hijri_day REAL,
 created_at REAL,
 location TEXT,
 actor_label TEXT,
 actor_key TEXT,
 record_number TEXT,
 note TEXT,
 shift TEXT,
 employee_key TEXT,
 employee_name TEXT,
 edited_at REAL,
 edited_by TEXT,
 legacy_author TEXT,
 test_marker TEXT,
 presence_mask INTEGER NOT NULL,
 items_kind INTEGER NOT NULL,
 PRIMARY KEY(department_id,report_id),
 UNIQUE(department_id,sequence)
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS seized_items(
 department_id TEXT NOT NULL,
 report_id TEXT NOT NULL,
 position INTEGER NOT NULL,
 id_kind INTEGER NOT NULL,
 id_number REAL,
 id_text TEXT,
 id_token TEXT,
 quantity REAL,
 value REAL,
 action_key TEXT,
 kind TEXT,
 kind_text TEXT,
 presence_mask INTEGER NOT NULL,
 photos_kind INTEGER NOT NULL,
 history_kind INTEGER NOT NULL,
 PRIMARY KEY(department_id,report_id,position),
 FOREIGN KEY(department_id,report_id) REFERENCES seized_reports(department_id,report_id) ON DELETE CASCADE
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS seized_item_photos(
 department_id TEXT NOT NULL,
 report_id TEXT NOT NULL,
 item_position INTEGER NOT NULL,
 position INTEGER NOT NULL,
 image_id TEXT,
 PRIMARY KEY(department_id,report_id,item_position,position),
 FOREIGN KEY(department_id,report_id,item_position) REFERENCES seized_items(department_id,report_id,position) ON DELETE CASCADE
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS seized_item_history(
 department_id TEXT NOT NULL,
 report_id TEXT NOT NULL,
 item_position INTEGER NOT NULL,
 position INTEGER NOT NULL,
 from_action TEXT,
 to_action TEXT,
 at_label TEXT,
 actor_label TEXT,
 created_at REAL,
 presence_mask INTEGER NOT NULL,
 PRIMARY KEY(department_id,report_id,item_position,position),
 FOREIGN KEY(department_id,report_id,item_position) REFERENCES seized_items(department_id,report_id,position) ON DELETE CASCADE
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS seized_categories(
 department_id TEXT NOT NULL,
 position INTEGER NOT NULL,
 id_kind INTEGER NOT NULL,
 id_number REAL,
 id_text TEXT,
 id_token TEXT,
 name TEXT,
 color TEXT,
 default_action TEXT,
 presence_mask INTEGER NOT NULL,
 items_kind INTEGER NOT NULL,
 PRIMARY KEY(department_id,position)
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS seized_catalog_items(
 department_id TEXT NOT NULL,
 category_position INTEGER NOT NULL,
 position INTEGER NOT NULL,
 id_kind INTEGER NOT NULL,
 id_number REAL,
 id_text TEXT,
 id_token TEXT,
 name TEXT,
 description TEXT,
 unit TEXT,
 presence_mask INTEGER NOT NULL,
 PRIMARY KEY(department_id,category_position,position),
 FOREIGN KEY(department_id,category_position) REFERENCES seized_categories(department_id,position) ON DELETE CASCADE
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS seized_actions(
 department_id TEXT NOT NULL,
 position INTEGER NOT NULL,
 id_kind INTEGER NOT NULL,
 id_number REAL,
 id_text TEXT,
 id_token TEXT,
 action_key TEXT,
 name TEXT,
 color TEXT,
 presence_mask INTEGER NOT NULL,
 PRIMARY KEY(department_id,position)
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS seized_list_values(
 department_id TEXT NOT NULL,
 resource TEXT NOT NULL,
 position INTEGER NOT NULL,
 value TEXT,
 PRIMARY KEY(department_id,resource,position)
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS seized_retro_windows(
 department_id TEXT NOT NULL,
 sequence INTEGER NOT NULL,
 window_id TEXT NOT NULL,
 opened_at REAL,
 until_at REAL,
 hours REAL,
 reason TEXT,
 reason_missing REAL,
 closed_at REAL,
 hijri_year REAL,
 hijri_month REAL,
 hijri_day REAL,
 scope_mask INTEGER NOT NULL,
 by_id TEXT,
 by_username TEXT,
 by_employee_key TEXT,
 by_name TEXT,
 closed_by_id TEXT,
 closed_by_username TEXT,
 closed_by_employee_key TEXT,
 presence_mask INTEGER NOT NULL,
 by_kind INTEGER NOT NULL,
 by_mask INTEGER NOT NULL,
 closed_by_kind INTEGER NOT NULL,
 closed_by_mask INTEGER NOT NULL,
 PRIMARY KEY(department_id,window_id),
 UNIQUE(department_id,sequence)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS seized_report_timeline ON seized_reports(department_id,hijri_year,hijri_month,hijri_day DESC,created_at DESC,sequence);
CREATE INDEX IF NOT EXISTS seized_item_action ON seized_items(department_id,action_key,report_id);
CREATE INDEX IF NOT EXISTS seized_photo_reference ON seized_item_photos(image_id,department_id,report_id);
CREATE INDEX IF NOT EXISTS seized_item_identity ON seized_items(department_id,id_token,report_id);
CREATE INDEX IF NOT EXISTS seized_item_kind ON seized_items(department_id,kind,report_id);
CREATE INDEX IF NOT EXISTS seized_report_location ON seized_reports(department_id,location);
CREATE TABLE IF NOT EXISTS seized_requests(department_id TEXT NOT NULL,account_uid TEXT NOT NULL,request_id TEXT NOT NULL,fingerprint TEXT NOT NULL,resource_key TEXT NOT NULL,resource_rev INTEGER NOT NULL,operation TEXT NOT NULL,result_n INTEGER NOT NULL,result_id TEXT,permission_mode TEXT NOT NULL,permission_keys TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(department_id,account_uid,request_id))WITHOUT ROWID;
DELETE FROM meta WHERE k='seized_cutover_ready';

-- Award relational domain. Migration9 orchestration owns permit/ledger/version.
-- No JSON business columns and no R2/image operation.
CREATE TABLE IF NOT EXISTS award_resources(department_id TEXT NOT NULL,resource TEXT NOT NULL,root_kind INTEGER NOT NULL,list_kind INTEGER NOT NULL,PRIMARY KEY(department_id,resource)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS award_records(department_id TEXT NOT NULL,record_id TEXT NOT NULL,sequence INTEGER NOT NULL,business_id TEXT,employee_key TEXT,category TEXT,hijri_date TEXT,score REAL,case_count REAL,file_ok INTEGER,eligible INTEGER,status TEXT,employee_number TEXT,city TEXT,work_field TEXT,phone TEXT,email TEXT,declarer_name TEXT,approver_name TEXT,approver_title TEXT,work_description TEXT,work_evidence TEXT,picture TEXT,employee_signature TEXT,approver_signature TEXT,author_name TEXT,legacy_name TEXT,test_marker TEXT,legacy_employee_key TEXT,legacy_status TEXT,legacy_employee_name TEXT,legacy_award TEXT,status_reason TEXT,legacy_reason TEXT,reason TEXT,presence_mask INTEGER NOT NULL,case_text_kind INTEGER NOT NULL,answers_kind INTEGER NOT NULL,scores_kind INTEGER NOT NULL,PRIMARY KEY(department_id,record_id),UNIQUE(department_id,sequence)) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS award_record_order ON award_records(department_id,sequence DESC);
CREATE INDEX IF NOT EXISTS award_record_employee ON award_records(department_id,employee_key);
CREATE TABLE IF NOT EXISTS award_case_texts(department_id TEXT NOT NULL,record_id TEXT NOT NULL,position INTEGER NOT NULL,value TEXT,PRIMARY KEY(department_id,record_id,position),FOREIGN KEY(department_id,record_id)REFERENCES award_records(department_id,record_id)ON DELETE CASCADE) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS award_answers(department_id TEXT NOT NULL,record_id TEXT NOT NULL,position INTEGER NOT NULL,value INTEGER,PRIMARY KEY(department_id,record_id,position),FOREIGN KEY(department_id,record_id)REFERENCES award_records(department_id,record_id)ON DELETE CASCADE) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS award_score_rows(department_id TEXT NOT NULL,record_id TEXT NOT NULL,row_number INTEGER NOT NULL,PRIMARY KEY(department_id,record_id,row_number),FOREIGN KEY(department_id,record_id)REFERENCES award_records(department_id,record_id)ON DELETE CASCADE) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS award_scores(department_id TEXT NOT NULL,record_id TEXT NOT NULL,row_number INTEGER NOT NULL,column_number INTEGER NOT NULL,value REAL,PRIMARY KEY(department_id,record_id,row_number,column_number),FOREIGN KEY(department_id,record_id,row_number)REFERENCES award_score_rows(department_id,record_id,row_number)ON DELETE CASCADE) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS award_documents(department_id TEXT NOT NULL,version INTEGER NOT NULL,group_key TEXT NOT NULL,title TEXT,lead TEXT,foot TEXT,presence_mask INTEGER NOT NULL,sections_kind INTEGER NOT NULL,PRIMARY KEY(department_id,version,group_key)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS award_doc_sections(department_id TEXT NOT NULL,version INTEGER NOT NULL,group_key TEXT NOT NULL,position INTEGER NOT NULL,title TEXT,header TEXT,body TEXT,presence_mask INTEGER NOT NULL,items_kind INTEGER NOT NULL,PRIMARY KEY(department_id,version,group_key,position),FOREIGN KEY(department_id,version,group_key)REFERENCES award_documents(department_id,version,group_key)ON DELETE CASCADE) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS award_doc_items(department_id TEXT NOT NULL,version INTEGER NOT NULL,group_key TEXT NOT NULL,section_position INTEGER NOT NULL,position INTEGER NOT NULL,kind TEXT,text TEXT,presence_mask INTEGER NOT NULL,PRIMARY KEY(department_id,version,group_key,section_position,position),FOREIGN KEY(department_id,version,group_key,section_position)REFERENCES award_doc_sections(department_id,version,group_key,position)ON DELETE CASCADE) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS award_requests(department_id TEXT NOT NULL,account_uid TEXT NOT NULL,request_id TEXT NOT NULL,fingerprint TEXT NOT NULL,resource_key TEXT NOT NULL,resource_rev INTEGER NOT NULL,operation TEXT NOT NULL,result_n INTEGER NOT NULL,result_id TEXT,permission_mode TEXT NOT NULL,permission_count INTEGER NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(department_id,account_uid,request_id)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS award_request_checks(department_id TEXT NOT NULL,account_uid TEXT NOT NULL,request_id TEXT NOT NULL,position INTEGER NOT NULL,check_kind TEXT NOT NULL,permission_key TEXT NOT NULL,PRIMARY KEY(department_id,account_uid,request_id,position),FOREIGN KEY(department_id,account_uid,request_id)REFERENCES award_requests(department_id,account_uid,request_id)ON DELETE CASCADE) WITHOUT ROWID;

INSERT INTO meta(k,v)VALUES('schema_version','9')ON CONFLICT(k)DO UPDATE SET v=excluded.v;
