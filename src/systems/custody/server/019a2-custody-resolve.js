function cuResolvedCte(allMoves) {
  var where = allMoves ? 'm.department_id=?1 AND m.greg_year*12+m.greg_month=?2' : cuLatest('?1', '?2');
  return (
    "WITH employees AS (SELECT COALESCE(NULLIF(json_extract(value,'$.eid'),''),json_extract(value,'$.name')) AS ek,json_extract(value,'$.nid') AS nid,json_extract(value,'$.empno') AS empno,json_extract(value,'$.name') AS name FROM json_each(?3)), base AS (SELECT m.*,s.serial,i.name AS item_name FROM custody_movements m JOIN custody_issues s ON s.department_id=m.department_id AND s.issue_id=m.issue_id JOIN custody_items i ON i.department_id=m.department_id AND i.item_id=m.item_id WHERE " +
    where +
    "), matches AS (SELECT b.*,(SELECT MIN(ek) FROM employees e WHERE e.ek=b.holder_key) AS exact_key,(SELECT COUNT(DISTINCT ek) FROM employees e WHERE (b.holder_nid_snapshot!='' AND e.nid=b.holder_nid_snapshot) OR (b.holder_empno_snapshot!='' AND e.empno=b.holder_empno_snapshot) OR (b.holder_key!='' AND e.nid=b.holder_key)) AS alias_n,(SELECT MIN(ek) FROM employees e WHERE (b.holder_nid_snapshot!='' AND e.nid=b.holder_nid_snapshot) OR (b.holder_empno_snapshot!='' AND e.empno=b.holder_empno_snapshot) OR (b.holder_key!='' AND e.nid=b.holder_key)) AS alias_key FROM base b), resolved AS (SELECT *,COALESCE(exact_key,CASE WHEN alias_n=1 THEN alias_key END,holder_key) AS hkey FROM matches) "
  );
}
