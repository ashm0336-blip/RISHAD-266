"""Replay actual compiler SQL with native-equivalent FK depth and parser caps.

Only synthetic Node fixture rows arrive through stdin. No files/network/auth.
"""
import json
import sqlite3
import sys


def main():
    payload = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    db = sqlite3.connect(":memory:", isolation_level=None)
    db.row_factory = sqlite3.Row
    for name, value in [
        (sqlite3.SQLITE_LIMIT_TRIGGER_DEPTH, 10),
        (sqlite3.SQLITE_LIMIT_COMPOUND_SELECT, 5),
        (sqlite3.SQLITE_LIMIT_EXPR_DEPTH, 100),
        (sqlite3.SQLITE_LIMIT_FUNCTION_ARG, 32),
        (sqlite3.SQLITE_LIMIT_VARIABLE_NUMBER, 100),
        (sqlite3.SQLITE_LIMIT_COLUMN, 100),
        (sqlite3.SQLITE_LIMIT_SQL_LENGTH, 100000),
    ]:
        db.setlimit(name, value)
        assert db.getlimit(name) == value
    db.execute("PRAGMA foreign_keys=ON")
    # Positive/negative engine control: a real depth11 cascade is prohibited.
    db.execute("CREATE TABLE TEST_ONLY_FK_CONTROL(id INTEGER PRIMARY KEY,parent INTEGER REFERENCES TEST_ONLY_FK_CONTROL(id)ON DELETE CASCADE)")
    db.executemany("INSERT INTO TEST_ONLY_FK_CONTROL VALUES(?,?)", [(i, i - 1 if i > 1 else None) for i in range(1, 12)])
    try:
        db.execute("DELETE FROM TEST_ONLY_FK_CONTROL WHERE id=1")
    except sqlite3.Error as error:
        assert "too many levels of trigger recursion" in str(error)
    else:
        raise AssertionError("The local depth11 negative control must fail")
    db.execute("UPDATE TEST_ONLY_FK_CONTROL SET parent=NULL")
    db.execute("DROP TABLE TEST_ONLY_FK_CONTROL")
    for table in payload["tables"]:
        db.execute(table["sql"])
    for sql in payload["indexes"]:
        db.execute(sql)
    for table in sorted(payload["tables"], key=lambda table: table["name"] != "ops_nodes"):
        for row in table["rows"]:
            columns = list(row)
            db.execute("INSERT INTO " + table["name"] + "(" + ",".join(columns) + ")VALUES(" + ",".join("?" for _ in columns) + ")", [row[c] for c in columns])

    def rows(table, where="", args=()):
        values = [dict(r) for r in db.execute("SELECT * FROM " + table + where, args)]
        return sorted(values, key=lambda r: json.dumps(r, sort_keys=True, ensure_ascii=False))

    def snapshot():
        return {table["name"]: rows(table["name"]) for table in payload["tables"]}

    before = snapshot()
    statements = payload["statements"]
    faults = []
    for position in payload["faultPositions"]:
        db.execute("BEGIN")
        try:
            for index, statement in enumerate(statements):
                if index == position:
                    db.execute("INSERT INTO TEST_ONLY_INJECTED_MISSING_TABLE VALUES(1)")
                db.execute(statement["sql"], statement["args"]).fetchall()
            if position == len(statements):
                db.execute("INSERT INTO TEST_ONLY_INJECTED_MISSING_TABLE VALUES(1)")
        except sqlite3.Error as error:
            db.execute("ROLLBACK")
            assert "TEST_ONLY_INJECTED_MISSING_TABLE" in str(error), str(error)
        else:
            raise AssertionError("Injected transaction failure was not reached")
        assert snapshot() == before, "Every application row must survive the failed transaction exactly"
        assert not db.execute("PRAGMA foreign_key_check").fetchall()
        faults.append(position)
    db.execute("BEGIN")
    for statement in statements:
        db.execute(statement["sql"], statement["args"]).fetchall()
    db.execute("COMMIT")
    assert not db.execute("PRAGMA foreign_key_check").fetchall()
    if payload["mode"] == "reset":
        for table in payload["operationalTables"]:
            assert not rows(table), table
        for table, values in before.items():
            if table not in payload["operationalTables"]:
                assert rows(table) == values, table
    else:
        department, resource = payload["scope"]
        for table in payload["operationalTables"]:
            actual = rows(table, " WHERE department_id=? AND resource=?", [department, resource])
            expected = sorted(payload["expected"].get(table, []), key=lambda r: json.dumps(r, sort_keys=True, ensure_ascii=False))
            assert actual == expected, table
            kept_before = [r for r in before[table] if not (r["department_id"] == department and r["resource"] == resource)]
            kept_after = [r for r in rows(table) if not (r["department_id"] == department and r["resource"] == resource)]
            assert kept_before == kept_after, "Unrelated department/resource rows changed in " + table
        for table, values in before.items():
            if table not in payload["operationalTables"]:
                assert rows(table) == values, table
    print(json.dumps({"success": True, "triggerDepth": 10, "depth11ControlRejected": True, "faultPositions": faults, "allRowsExactAfterRollback": True, "unrelatedRowsUnchanged": True, "fkViolations": 0}))


if __name__ == "__main__":
    main()
