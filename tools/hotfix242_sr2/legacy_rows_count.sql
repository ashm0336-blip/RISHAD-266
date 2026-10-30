-- KIVO_242 · SR-2.2 — READ-ONLY queries for the D1 console (SELECT only · write nothing). Run the THREE statements below ONE AT A TIME.
-- Source: the independent review of SR-2.1 (review_sr2.md §3 — validated on synthetic data), updated to SR-2.2 rules (F-1: an id links only
-- when exactly ONE employee record in the department carries it · F-3: only rows whose deadline passed within the last 48 h are auto-marked).
-- Re-validated on synthetic data by tests/unit/tasks_hotfix242_sql.test.mjs.
--
-- Query 1 — task rows by how they are assigned.
-- Under SR-2.2 «ملفي ← مهامي» shows a row to an employee ONLY when column 14 (r[14]) is that employee's eid (unique in the department)
-- or their national id when it is unique in the department. Rows assigned by NAME only are never shown.
-- Classes:
--   eid_ok                 r[14] = an employee eid carried by exactly one record     -> shown, employee can act
--   eid_shared_hidden      r[14] = an eid carried by 2+ records (data error)         -> NOT shown to anyone (SR-2.2 · F-1)
--   nid_unique_readonly    r[14] = a national id unique in the department            -> shown, actions refused (409) unless the account key is that nid
--   nid_shared_hidden      r[14] = a national id shared by 2+ employee records       -> NOT shown to anyone
--   name_only_r8_hidden    r[14] empty but r[8] (assignee name) filled               -> NOT shown (KIVO_242 showed it by name to task.view holders)
--   r14_name_or_unknown    r[14] filled but matches no eid / nid in the department   -> NOT shown (names, deleted employees, old keys)
--   general_unassigned     r[14] and r[8] empty (general task)                       -> not shown in «ملفي» (same as 242)
-- Values longer than 700,000 characters are stored in several kv rows (seq 0,1,2,...); the recursive CTE re-joins them in order.
WITH RECURSIVE
parts(k, seq, v) AS (
  SELECT k, seq, v FROM kv
  WHERE k LIKE 'bsdept:%:bassam_tasks_v1' OR k LIKE 'bsdept:%:bassam_employees_v1'
),
cat(k, seq, j) AS (
  SELECT k, seq, v FROM parts WHERE seq = 0
  UNION ALL
  SELECT c.k, p.seq, c.j || p.v FROM cat c JOIN parts p ON p.k = c.k AND p.seq = c.seq + 1
),
whole(k, j) AS (
  SELECT c.k, c.j FROM cat c WHERE c.seq = (SELECT MAX(p.seq) FROM parts p WHERE p.k = c.k)
),
tasks(dept, j) AS (
  SELECT substr(k, 8, length(k) - 7 - length(':bassam_tasks_v1')), j FROM whole WHERE k LIKE 'bsdept:%:bassam_tasks_v1' AND json_valid(j)
),
emp(dept, eid, nid) AS (
  SELECT substr(w.k, 8, length(w.k) - 7 - length(':bassam_employees_v1')),
         CAST(json_extract(x.value, '$.eid') AS TEXT), CAST(json_extract(x.value, '$.nid') AS TEXT)
  FROM whole w, json_each(w.j) x
  WHERE w.k LIKE 'bsdept:%:bassam_employees_v1' AND json_valid(w.j) AND x.type = 'object'
),
r(dept, day, idx, st, nm, a) AS (
  SELECT t.dept, d.key, x.key, json_extract(x.value, '$[3]'), json_extract(x.value, '$[8]'), CAST(json_extract(x.value, '$[14]') AS TEXT)
  FROM tasks t, json_each(t.j) d, json_each(d.value) x
  WHERE d.type = 'array' AND x.type = 'array' AND d.key GLOB '[0-9][0-9][0-9][0-9]-[0-9]*-[0-9]*'
),
c(dept, st, cls) AS (
  SELECT r.dept, r.st,
    CASE
      WHEN r.a IS NULL OR r.a = '' THEN CASE WHEN r.nm IS NOT NULL AND trim(r.nm) <> '' THEN 'name_only_r8_hidden' ELSE 'general_unassigned' END
      WHEN (SELECT COUNT(*) FROM emp e WHERE e.dept = r.dept AND e.eid IS NOT NULL AND e.eid <> '' AND e.eid = r.a) = 1 THEN 'eid_ok'
      WHEN (SELECT COUNT(*) FROM emp e WHERE e.dept = r.dept AND e.eid IS NOT NULL AND e.eid <> '' AND e.eid = r.a) > 1 THEN 'eid_shared_hidden'
      WHEN (SELECT COUNT(*) FROM emp e WHERE e.dept = r.dept AND e.nid IS NOT NULL AND e.nid <> '' AND e.nid = r.a) = 1 THEN 'nid_unique_readonly'
      WHEN (SELECT COUNT(*) FROM emp e WHERE e.dept = r.dept AND e.nid IS NOT NULL AND e.nid <> '' AND e.nid = r.a) > 1 THEN 'nid_shared_hidden'
      ELSE 'r14_name_or_unknown'
    END
  FROM r
)
SELECT dept AS department, cls AS assignment_class,
       COUNT(*) AS rows_total,
       SUM(CASE WHEN st IN ('done', 'declined') THEN 0 ELSE 1 END) AS rows_still_open
FROM c
GROUP BY dept, cls
ORDER BY dept, cls;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- Query 2 (run separately) — READ-ONLY: active staff accounts and whether SR-2.2 links them to an employee record.
-- NOT_LINKED accounts will see «حسابك غير مرتبط بسجل موظف بمعرّف ثابت» instead of their tasks. Prints account ids only (no password data).
-- «NOT_LINKED (… shared by 2+ records)» = an account keyed by an id that 2+ employee records carry (a data-entry error). SR-2.1 linked such an
-- account to the FIRST record and showed that record's tasks and proof images (finding F-1); SR-2.2 refuses to link it — fix the employee records.
WITH RECURSIVE
parts(k, seq, v) AS (
  SELECT k, seq, v FROM kv WHERE k = 'bassam_auth_users_v1' OR k LIKE 'bsdept:%:bassam_employees_v1'
),
cat(k, seq, j) AS (
  SELECT k, seq, v FROM parts WHERE seq = 0
  UNION ALL
  SELECT c.k, p.seq, c.j || p.v FROM cat c JOIN parts p ON p.k = c.k AND p.seq = c.seq + 1
),
whole(k, j) AS (
  SELECT c.k, c.j FROM cat c WHERE c.seq = (SELECT MAX(p.seq) FROM parts p WHERE p.k = c.k)
),
emp(dept, eid, nid) AS (
  SELECT substr(w.k, 8, length(w.k) - 7 - length(':bassam_employees_v1')),
         CAST(json_extract(x.value, '$.eid') AS TEXT), CAST(json_extract(x.value, '$.nid') AS TEXT)
  FROM whole w, json_each(w.j) x
  WHERE w.k LIKE 'bsdept:%:bassam_employees_v1' AND json_valid(w.j) AND x.type = 'object'
),
acc(id, dept, ekey) AS (
  SELECT json_extract(x.value, '$.id'), json_extract(x.value, '$.deptId'), CAST(json_extract(x.value, '$.ekey') AS TEXT)
  FROM whole w, json_each(w.j) x
  WHERE w.k = 'bassam_auth_users_v1' AND json_valid(w.j) AND x.type = 'object'
    AND json_extract(x.value, '$.role') = 'staff' AND COALESCE(json_extract(x.value, '$.dis'), 0) = 0
)
SELECT dept AS department,
  CASE
    WHEN ekey IS NULL OR ekey = '' THEN 'NOT_LINKED (no key)'
    WHEN ekey LIKE 'mgr:%' OR ekey LIKE 'gm:%' THEN 'manager account (not linked by design)'
    WHEN (SELECT COUNT(*) FROM emp e WHERE e.dept = acc.dept AND e.eid IS NOT NULL AND e.eid <> '' AND e.eid = acc.ekey) = 1 THEN 'linked_by_eid'
    WHEN (SELECT COUNT(*) FROM emp e WHERE e.dept = acc.dept AND e.eid IS NOT NULL AND e.eid <> '' AND e.eid = acc.ekey) > 1 THEN 'NOT_LINKED (employee id shared by 2+ records — fix the records)'
    WHEN (SELECT COUNT(*) FROM emp e WHERE e.dept = acc.dept AND e.nid IS NOT NULL AND e.nid <> '' AND e.nid = acc.ekey) > 1 THEN 'NOT_LINKED (national id shared by 2+ records — fix the records)'
    WHEN (SELECT COUNT(*) FROM emp e WHERE e.dept = acc.dept AND e.nid IS NOT NULL AND e.nid <> '' AND e.nid = acc.ekey) = 1 THEN 'linked_by_nid (read; actions on nid rows only)'
    ELSE 'NOT_LINKED (no matching employee record)'
  END AS link_state,
  COUNT(*) AS accounts,
  group_concat(id, ' ') AS account_ids
FROM acc
GROUP BY 1, 2
ORDER BY 1, 2;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- Query 3 (run separately) — READ-ONLY: the «expired, never answered» backlog seen by «ملفي ← مهامي».
-- SR-2.2 auto-marks ONLY rows whose deadline passed within the last 48 h (column marked_on_first_visit): each is one write of the department's
-- tasks store and one «لم تُقبل … أعِد إسنادها» notification to managers. Older rows (left_as_is_older_than_48h) are NOT marked and send nothing;
-- they stay visible to the employee as «منقضية». (Only rows assigned by a unique eid / unique national id are reachable; months approved &
-- locked with true|1 are refused by the server.) SR-2.1 marked ALL of them on the first visit (finding F-3).
WITH RECURSIVE
parts(k, seq, v) AS (
  SELECT k, seq, v FROM kv WHERE k LIKE 'bsdept:%:bassam_tasks_v1' OR k LIKE 'bsdept:%:bassam_employees_v1' OR k LIKE 'bsdept:%:bassam_tasks_locks_v1'
),
cat(k, seq, j) AS (
  SELECT k, seq, v FROM parts WHERE seq = 0
  UNION ALL
  SELECT c.k, p.seq, c.j || p.v FROM cat c JOIN parts p ON p.k = c.k AND p.seq = c.seq + 1
),
whole(k, j) AS (
  SELECT c.k, c.j FROM cat c WHERE c.seq = (SELECT MAX(p.seq) FROM parts p WHERE p.k = c.k)
),
emp(dept, eid, nid) AS (
  SELECT substr(w.k, 8, length(w.k) - 7 - length(':bassam_employees_v1')),
         CAST(json_extract(x.value, '$.eid') AS TEXT), CAST(json_extract(x.value, '$.nid') AS TEXT)
  FROM whole w, json_each(w.j) x
  WHERE w.k LIKE 'bsdept:%:bassam_employees_v1' AND json_valid(w.j) AND x.type = 'object'
),
locks(dept, ym, v) AS (
  SELECT substr(w.k, 8, length(w.k) - 7 - length(':bassam_tasks_locks_v1')), x.key, x.value
  FROM whole w, json_each(w.j) x WHERE w.k LIKE 'bsdept:%:bassam_tasks_locks_v1' AND json_valid(w.j)
),
r(dept, day, st, a, acc, e, exp) AS (
  SELECT substr(w.k, 8, length(w.k) - 7 - length(':bassam_tasks_v1')), d.key, json_extract(x.value, '$[3]'),
         CAST(json_extract(x.value, '$[14]') AS TEXT), json_extract(x.value, '$[11]'), json_extract(x.value, '$[16]'), json_extract(x.value, '$[20].exp')
  FROM whole w, json_each(w.j) d, json_each(d.value) x
  WHERE w.k LIKE 'bsdept:%:bassam_tasks_v1' AND json_valid(w.j) AND d.type = 'array' AND x.type = 'array'
    AND d.key GLOB '[0-9][0-9][0-9][0-9]-[0-9]*-[0-9]*'
)
SELECT r.dept AS department,
       COUNT(*) AS expired_unanswered_rows,
       SUM(CASE WHEN r.e >= (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 2 * 86400000) THEN 1 ELSE 0 END) AS marked_on_first_visit,
       SUM(CASE WHEN r.e < (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 2 * 86400000) THEN 1 ELSE 0 END) AS left_as_is_older_than_48h,
       COUNT(DISTINCT r.a) AS employees_affected
FROM r
WHERE (r.st IS NULL OR r.st NOT IN ('done', 'declined')) AND (r.acc IS NULL OR r.acc = 0)
  AND r.e IS NOT NULL AND r.e < CAST(strftime('%s', 'now') AS INTEGER) * 1000 AND r.exp IS NULL
  AND r.a IS NOT NULL AND r.a <> ''
  AND ((SELECT COUNT(*) FROM emp e WHERE e.dept = r.dept AND e.eid IS NOT NULL AND e.eid <> '' AND e.eid = r.a) = 1
       OR (SELECT COUNT(*) FROM emp e WHERE e.dept = r.dept AND e.nid IS NOT NULL AND e.nid <> '' AND e.nid = r.a) = 1)
  AND NOT EXISTS (SELECT 1 FROM locks l WHERE l.dept = r.dept
                  AND l.ym = (CAST(substr(r.day, 1, 4) AS INTEGER) || '-' || CAST(substr(r.day, 6, instr(substr(r.day, 6), '-') - 1) AS INTEGER))
                  AND (l.v = 1 OR l.v = 'true'))
GROUP BY r.dept
ORDER BY r.dept;
