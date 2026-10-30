CREATE TABLE IF NOT EXISTS restore_operations (
 account_uid TEXT NOT NULL,request_id TEXT NOT NULL,fingerprint TEXT NOT NULL,
 revision INTEGER NOT NULL,snapshot_id TEXT NOT NULL,scope TEXT NOT NULL,mode TEXT NOT NULL,
 counts_json TEXT NOT NULL CHECK(json_valid(counts_json)),reauth_required INTEGER NOT NULL,
 created_at INTEGER NOT NULL,result_json TEXT CHECK(result_json IS NULL OR json_valid(result_json)),PRIMARY KEY(account_uid,request_id)
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS restore_preimage (
 snapshot_id TEXT NOT NULL,domain TEXT NOT NULL,table_key TEXT NOT NULL,row_number INTEGER NOT NULL,
 row_json TEXT NOT NULL CHECK(json_valid(row_json)),
 PRIMARY KEY(snapshot_id,domain,table_key,row_number)
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS restore_snapshot_manifest (
 snapshot_id TEXT NOT NULL,domain TEXT NOT NULL,table_key TEXT NOT NULL,row_count INTEGER NOT NULL,
 PRIMARY KEY(snapshot_id,domain,table_key)
) WITHOUT ROWID;
INSERT INTO meta(k,v) VALUES('restore_epoch','0') ON CONFLICT(k) DO NOTHING;
INSERT INTO meta(k,v) VALUES ('schema_version', '7') ON CONFLICT(k) DO UPDATE SET v=excluded.v;
