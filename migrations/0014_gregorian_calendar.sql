-- V7 · 53 تقويم: الترحيل 0014 — التقويمُ الميلادي أساساً (وثيقة التصميم §3 · قرارات ق1–ق12)، المرحلة ١ (ق8): الجداولُ العلائقية وحدها.
-- ① جدولُ المطابقة cal_hg_days (يومٌ هجري ← يومٌ ميلادي، تقابلٌ واحدٌ لواحد) يملؤه العاملُ في الدفعة نفسِها (calMigPrepare في 019v عبر 052 migrateDb)
--    بدالة cal-base calHtoG لكل يومٍ هجري بين أدنى تاريخٍ وأعلاه في البيانات. يبقى بعد الترحيل (يقرؤه المشغّل والمرحلةُ ٢).
-- ② أعمدةُ hijri_* ← greg_* بإعادة التسمية (ق2) — الفهارسُ تتبع العمودَ بأسمائها نفسِها.
-- ③ إعادةُ بناء الجدولين اللذين يتغيّر قيدُهما (SQLite لا يعدّل CHECK): daily_stats_day_locks (اليوم 1–31) · custody_movements (اليوم 0–31؛ الصفرُ يومٌ غير معروف).
-- ④ تحويلُ القيم بالمطابقة — صفٌّ بلا مطابقة يرفض الدفعةَ كلَّها (KIVO_CAL_UNMAPPED) فلا يُسقط يومٌ بصمت. العهدةُ بيوم 0: شهرُ اليوم الأول من شهرها الهجري (ق10).
-- ⑤ ما يحتاج منطقاً (أقفالُ الإحصائيات ق3 · نوافذُ الاستدراك ق7 · مفاتيحُ dedup · الرصدُ في KV) تكتبه خطةُ البيانات بعد هذه العبارات في الدفعة نفسِها.
-- ⑥ الإداراتُ التي لها وثائقُ تقويمية مرمَّزة تُدرج في meta.cal_ops_pending — كتابتُها التشغيلية مرفوضةٌ 503 calendar-pending حتى المرحلة ٢
--    (POST /api/operations/calendar-migrate، مديرُ المنصة وحده).
CREATE TABLE IF NOT EXISTS cal_hg_days (hy INTEGER NOT NULL, hm INTEGER NOT NULL, hd INTEGER NOT NULL, gy INTEGER NOT NULL, gm INTEGER NOT NULL, gd INTEGER NOT NULL, PRIMARY KEY (hy, hm, hd)) WITHOUT ROWID;
SELECT CASE WHEN EXISTS (SELECT 1 FROM daily_stats_days WHERE NOT EXISTS (SELECT 1 FROM cal_hg_days WHERE hy = CAST(substr(hijri_date, 1, 4) AS INTEGER) AND hm = CAST(substr(hijri_date, 6, 2) AS INTEGER) AND hd = CAST(substr(hijri_date, 9, 2) AS INTEGER)))
  OR EXISTS (SELECT 1 FROM custody_movements WHERE NOT EXISTS (SELECT 1 FROM cal_hg_days WHERE hy = hijri_year AND hm = hijri_month AND hd = MAX(hijri_day, 1)))
  OR EXISTS (SELECT 1 FROM irshad_reports WHERE hijri_year IS NOT NULL AND NOT EXISTS (SELECT 1 FROM cal_hg_days WHERE hy = hijri_year AND hm = hijri_month AND hd = MAX(COALESCE(hijri_day, 1), 1)))
  OR EXISTS (SELECT 1 FROM seized_reports WHERE hijri_year IS NOT NULL AND NOT EXISTS (SELECT 1 FROM cal_hg_days WHERE hy = hijri_year AND hm = hijri_month AND hd = MAX(COALESCE(hijri_day, 1), 1)))
  OR EXISTS (SELECT 1 FROM award_records WHERE hijri_date GLOB '1[3-6][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND NOT EXISTS (SELECT 1 FROM cal_hg_days WHERE hy = CAST(substr(hijri_date, 1, 4) AS INTEGER) AND hm = CAST(substr(hijri_date, 6, 2) AS INTEGER) AND hd = CAST(substr(hijri_date, 9, 2) AS INTEGER)))
  THEN json_extract('{}', 'KIVO_CAL_UNMAPPED') END;
ALTER TABLE daily_stats_days RENAME COLUMN hijri_date TO greg_date;
ALTER TABLE daily_stats_month_locks RENAME COLUMN hijri_year TO greg_year;
ALTER TABLE daily_stats_month_locks RENAME COLUMN hijri_month TO greg_month;
CREATE TABLE daily_stats_day_locks_g (
  site TEXT NOT NULL,
  greg_year INTEGER NOT NULL,
  greg_month INTEGER NOT NULL,
  greg_day INTEGER NOT NULL CHECK (greg_day BETWEEN 1 AND 31),
  is_open INTEGER NOT NULL CHECK (is_open IN (0,1)),
  is_shut INTEGER NOT NULL CHECK (is_shut IN (0,1)),
  PRIMARY KEY (site,greg_year,greg_month,greg_day),
  FOREIGN KEY (site,greg_year,greg_month) REFERENCES daily_stats_month_locks(site,greg_year,greg_month) ON DELETE CASCADE
) WITHOUT ROWID;
INSERT INTO daily_stats_day_locks_g (site, greg_year, greg_month, greg_day, is_open, is_shut) SELECT site, hijri_year, hijri_month, hijri_day, is_open, is_shut FROM daily_stats_day_locks;
DROP TABLE daily_stats_day_locks;
ALTER TABLE daily_stats_day_locks_g RENAME TO daily_stats_day_locks;
CREATE TABLE custody_movements_g (
  department_id TEXT NOT NULL, move_id TEXT NOT NULL, issue_id TEXT NOT NULL, item_id TEXT NOT NULL,
  sequence INTEGER NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('out','in','dmg','lost')),
  holder_key TEXT NOT NULL, greg_year INTEGER NOT NULL, greg_month INTEGER NOT NULL CHECK(greg_month BETWEEN 1 AND 12),
  greg_day INTEGER NOT NULL CHECK(greg_day BETWEEN 0 AND 31), condition TEXT, note TEXT, color_snapshot TEXT,
  actor_uid TEXT, actor_label TEXT, holder_nid_snapshot TEXT, holder_empno_snapshot TEXT, holder_name_snapshot TEXT,
  presence_mask INTEGER NOT NULL, created_at INTEGER,
  PRIMARY KEY(department_id,move_id), UNIQUE(department_id,sequence),
  FOREIGN KEY(department_id,issue_id) REFERENCES custody_issues(department_id,issue_id),
  FOREIGN KEY(department_id,item_id) REFERENCES custody_items(department_id,item_id)
) WITHOUT ROWID;
INSERT INTO custody_movements_g (department_id, move_id, issue_id, item_id, sequence, kind, holder_key, greg_year, greg_month, greg_day, condition, note, color_snapshot, actor_uid, actor_label, holder_nid_snapshot, holder_empno_snapshot, holder_name_snapshot, presence_mask, created_at)
  SELECT c.department_id, c.move_id, c.issue_id, c.item_id, c.sequence, c.kind, c.holder_key, g.gy, g.gm, CASE WHEN c.hijri_day = 0 THEN 0 ELSE g.gd END, c.condition, c.note, c.color_snapshot, c.actor_uid, c.actor_label, c.holder_nid_snapshot, c.holder_empno_snapshot, c.holder_name_snapshot, c.presence_mask, c.created_at
  FROM custody_movements c JOIN cal_hg_days g ON g.hy = c.hijri_year AND g.hm = c.hijri_month AND g.hd = MAX(c.hijri_day, 1);
DROP TABLE custody_movements;
ALTER TABLE custody_movements_g RENAME TO custody_movements;
CREATE INDEX IF NOT EXISTS custody_move_timeline ON custody_movements(department_id,greg_year,greg_month,greg_day,sequence,move_id);
CREATE INDEX IF NOT EXISTS custody_issue_timeline ON custody_movements(department_id,issue_id,greg_year DESC,greg_month DESC,greg_day DESC,sequence DESC);
CREATE INDEX IF NOT EXISTS custody_holder ON custody_movements(department_id,holder_key,issue_id);
ALTER TABLE irshad_reports RENAME COLUMN hijri_year TO greg_year;
ALTER TABLE irshad_reports RENAME COLUMN hijri_month TO greg_month;
ALTER TABLE irshad_reports RENAME COLUMN hijri_day TO greg_day;
ALTER TABLE irshad_retro_windows RENAME COLUMN hijri_year TO greg_year;
ALTER TABLE irshad_retro_windows RENAME COLUMN hijri_month TO greg_month;
ALTER TABLE irshad_retro_windows RENAME COLUMN hijri_day TO greg_day;
ALTER TABLE seized_reports RENAME COLUMN hijri_year TO greg_year;
ALTER TABLE seized_reports RENAME COLUMN hijri_month TO greg_month;
ALTER TABLE seized_reports RENAME COLUMN hijri_day TO greg_day;
ALTER TABLE seized_retro_windows RENAME COLUMN hijri_year TO greg_year;
ALTER TABLE seized_retro_windows RENAME COLUMN hijri_month TO greg_month;
ALTER TABLE seized_retro_windows RENAME COLUMN hijri_day TO greg_day;
ALTER TABLE award_records RENAME COLUMN hijri_date TO greg_date;
UPDATE daily_stats_days SET greg_date = (SELECT printf('%04d-%02d-%02d', gy, gm, gd) FROM cal_hg_days WHERE hy = CAST(substr(greg_date, 1, 4) AS INTEGER) AND hm = CAST(substr(greg_date, 6, 2) AS INTEGER) AND hd = CAST(substr(greg_date, 9, 2) AS INTEGER)) WHERE CAST(substr(greg_date, 1, 4) AS INTEGER) < 1700;
UPDATE irshad_reports SET (greg_year, greg_month, greg_day) = (SELECT gy, gm, CASE WHEN COALESCE(irshad_reports.greg_day, 0) = 0 THEN irshad_reports.greg_day ELSE gd END FROM cal_hg_days WHERE hy = irshad_reports.greg_year AND hm = irshad_reports.greg_month AND hd = MAX(COALESCE(irshad_reports.greg_day, 1), 1)) WHERE greg_year IS NOT NULL AND greg_year < 1700;
UPDATE seized_reports SET (greg_year, greg_month, greg_day) = (SELECT gy, gm, CASE WHEN COALESCE(seized_reports.greg_day, 0) = 0 THEN seized_reports.greg_day ELSE gd END FROM cal_hg_days WHERE hy = seized_reports.greg_year AND hm = seized_reports.greg_month AND hd = MAX(COALESCE(seized_reports.greg_day, 1), 1)) WHERE greg_year IS NOT NULL AND greg_year < 1700;
UPDATE award_records SET greg_date = (SELECT printf('%04d-%02d-%02d', gy, gm, gd) FROM cal_hg_days WHERE hy = CAST(substr(greg_date, 1, 4) AS INTEGER) AND hm = CAST(substr(greg_date, 6, 2) AS INTEGER) AND hd = CAST(substr(greg_date, 9, 2) AS INTEGER)) WHERE greg_date GLOB '1[3-6][0-9][0-9]-[0-9][0-9]-[0-9][0-9]';
INSERT INTO meta (k, v) SELECT 'cal_ops_pending', x FROM (SELECT json_group_array(d) x, COUNT(*) n FROM (SELECT DISTINCT department_id d FROM ops_nodes WHERE resource IN ('bassam_rounds_v1', 'bassam_rounds_arc_v1', 'bassam_dreport_v1', 'bassam_tasks_v1', 'bassam_tasks_locks_v1', 'bassam_staffing_v3', 'bassam_staffing_v2', 'bassam_staffing_locks_v1', 'bassam_plan_v1', 'bassam_dayshift_v1', 'bassam_dayfocus_v1') ORDER BY d)) WHERE n > 0 ON CONFLICT(k) DO UPDATE SET v = excluded.v;
INSERT INTO meta (k, v) VALUES ('schema_version', '14') ON CONFLICT(k) DO UPDATE SET v = excluded.v;
