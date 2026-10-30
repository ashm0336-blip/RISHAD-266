-- Clean schema for the daily-statistics domain. This is not the retired Preview migration.
-- Metrics live in typed columns; JSON is limited to attribution metadata.
-- migrateDb prepares and validates existing documents before any DDL. Source CAS,
-- this DDL, the typed backfill, retirement and migration stamp share one D1 batch.
-- Direct SQL migration without that validated plan remains fail-closed.
SELECT CASE WHEN EXISTS (
  SELECT 1 FROM kv WHERE k = 'bassam_dstats_v1' OR k LIKE 'bsdept:%:bassam_dstats_v1'
) AND COALESCE((SELECT v FROM meta WHERE k = 'ds_cutover_ready'), '') != 'validated'
THEN json_extract('{}', 'KIVO_DSTATS_OFFLINE_CUTOVER_REQUIRED') END;
CREATE TABLE IF NOT EXISTS daily_stats_days (
  site TEXT NOT NULL CHECK (site IN ('haram','nabawi')),
  hijri_date TEXT NOT NULL CHECK (hijri_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  field_mask INTEGER NOT NULL CHECK (field_mask BETWEEN 0 AND 2047),
  worshippers REAL, umrah REAL, hijr_ismail REAL, carts REAL, salam_corridor REAL,
  rawdah_men_published REAL, rawdah_men_reserved REAL, rawdah_men_actual REAL,
  rawdah_women_published REAL, rawdah_women_reserved REAL, rawdah_women_actual REAL,
  meta_json TEXT CHECK (meta_json IS NULL OR json_valid(meta_json)),
  fields_json TEXT CHECK (fields_json IS NULL OR json_valid(fields_json)),
  PRIMARY KEY (site, hijri_date)
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS daily_stats_month_locks (
  site TEXT NOT NULL CHECK (site IN ('haram','nabawi')),
  hijri_year INTEGER NOT NULL CHECK (hijri_year BETWEEN 1000 AND 9999),
  hijri_month INTEGER NOT NULL CHECK (hijri_month BETWEEN 1 AND 12),
  approved INTEGER NOT NULL CHECK (approved IN (0,1)),
  reopened INTEGER NOT NULL CHECK (reopened IN (0,1)),
  legacy_boolean INTEGER NOT NULL DEFAULT 0 CHECK (legacy_boolean IN (0,1)),
  PRIMARY KEY (site,hijri_year,hijri_month)
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS daily_stats_day_locks (
  site TEXT NOT NULL,
  hijri_year INTEGER NOT NULL,
  hijri_month INTEGER NOT NULL,
  hijri_day INTEGER NOT NULL CHECK (hijri_day BETWEEN 1 AND 30),
  is_open INTEGER NOT NULL CHECK (is_open IN (0,1)),
  is_shut INTEGER NOT NULL CHECK (is_shut IN (0,1)),
  PRIMARY KEY (site,hijri_year,hijri_month,hijri_day),
  FOREIGN KEY (site,hijri_year,hijri_month) REFERENCES daily_stats_month_locks(site,hijri_year,hijri_month) ON DELETE CASCADE
) WITHOUT ROWID;
DELETE FROM meta WHERE k = 'ds_cutover_ready';
INSERT INTO meta (k, v) VALUES ('schema_version', '4') ON CONFLICT(k) DO UPDATE SET v = excluded.v;
