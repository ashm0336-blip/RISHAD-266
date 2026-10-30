#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO · RM-4 — تصديرُ قاعدة SQLite محلية (Miniflare d1Persist أو بديلُ الاختبار) إلى SQL بصيغة `wrangler d1 export` نفسِها
   (كل DDL أولًا ثم INSERT للأصل قبل الفرع) — لاختبار أدوات النسخ/الاستعادة بلا شبكة:
   python3 tools/d1/snapshot_local.py <db.sqlite> <out.sql>"""
import heapq, os, sqlite3, sys, tempfile
from pathlib import Path

# Status output must not turn a completed snapshot into a failed process on
# Windows code pages; the SQL file and both CLI streams consistently use UTF-8.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, 'reconfigure'):
        _stream.reconfigure(encoding='utf-8', errors='backslashreplace')


def ident(name):
    return '"' + name.replace('"', '""') + '"'


def insertion_order(db, tables):
    """D1 enforces FKs: never rely on deferral across separate statements.
    Cycles, including self references, need a separate restore plan and are
    rejected before a dump can be produced or replace an existing output."""
    canonical = {name.casefold(): name for name in tables}
    parents = {name: set() for name in tables}
    children = {name: set() for name in tables}
    for name in tables:
        for fk in db.execute('PRAGMA foreign_key_list(' + ident(name) + ')'):
            parent = canonical.get(fk[2].casefold())
            if parent is None:
                raise ValueError('missing referenced table: ' + fk[2])
            parents[name].add(parent)
            children[parent].add(name)
    ready = [name for name in tables if not parents[name]]
    heapq.heapify(ready)
    order = []
    while ready:
        name = heapq.heappop(ready)
        order.append(name)
        for child in sorted(children[name]):
            parents[child].remove(name)
            if not parents[child]: heapq.heappush(ready, child)
    if len(order) != len(tables):
        raise ValueError('foreign key dependency cycle: ' + ', '.join(sorted(set(tables) - set(order))))
    return order


def main(src, out):
    source, target = Path(src).resolve(), Path(out).resolve()
    if source == target or (target.exists() and source.samefile(target)):
        raise ValueError('snapshot output cannot replace its source database')
    db = sqlite3.connect(source.as_uri() + '?mode=ro', uri=True)
    try:
        db.execute('PRAGMA foreign_keys=ON')
        db.execute('BEGIN')  # Local read snapshot only; no BEGIN is emitted to D1.
        tables = dict(db.execute("SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name"))
        order = insertion_order(db, tables)
        if db.execute('PRAGMA foreign_key_check').fetchone():
            raise ValueError('foreign key integrity check failed in source database')
        indexes = [sql for name, table, sql in db.execute("SELECT name,tbl_name,sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL ORDER BY name") if table in tables]
        fd, temporary = tempfile.mkstemp(prefix='.' + target.name + '.', dir=target.parent)
        try:
            with os.fdopen(fd, 'w', encoding='utf-8', newline='\n') as f:
                # A parent key can use a standalone UNIQUE index. All indexes,
                # as well as all tables, must exist before the first INSERT.
                for sql in list(tables.values()) + indexes:
                    f.write(sql.replace('CREATE TABLE IF NOT EXISTS', 'CREATE TABLE').replace('CREATE INDEX IF NOT EXISTS', 'CREATE INDEX') + ';\n')
                for name in order:
                    columns = ','.join(ident(r[1]) for r in db.execute('PRAGMA table_info(' + ident(name) + ')'))
                    for row in db.execute('SELECT ' + columns + ' FROM ' + ident(name)):
                        values = []
                        for value in row:
                            if value is None: values.append('NULL')
                            elif isinstance(value, (int, float)): values.append(repr(value) if isinstance(value, float) else str(value))
                            elif isinstance(value, bytes): values.append("X'" + value.hex() + "'")
                            else: values.append("'" + str(value).replace("'", "''") + "'")
                        f.write('INSERT INTO %s(%s) VALUES(%s);\n' % (ident(name), columns, ','.join(values)))
            os.replace(temporary, target)
        finally:
            if os.path.exists(temporary): os.unlink(temporary)
    finally:
        db.close()
    print('snapshot →', out)


if __name__ == '__main__':
    try: main(sys.argv[1], sys.argv[2])
    except (OSError, sqlite3.Error, ValueError) as error:
        raise SystemExit('✘ snapshot failed: ' + str(error)[:200])
