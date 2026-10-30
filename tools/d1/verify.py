#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO · RM-4 — فحصُ نسخة D1 (ملف SQL من `wrangler d1 export` أو من snapshot_local.py) بلا شبكة:
   python3 tools/d1/verify.py <dump.sql> [--manifest out.json] [--expect-tables kv,meta,...]
   python3 tools/d1/verify.py --diff <a.sql> <b.sql>
   يحمّل الملف في SQLite بالذاكرة ويطبع: الجداول وعددَ صفوفها · آخرَ نسخة لكل مفتاح kv (أحدث seq) · meta · بصمة الملف.
   --manifest يكتب JSON (الأعداد والبصمات) للمقارنة لاحقاً. --diff يقارن نسختين (الجداول · الأعداد · مفاتيح kv المتغيّرة · meta)."""
import sys, os, json, hashlib, sqlite3, time
# The success/error symbols and Arabic diagnostics must work with inherited
# Windows encodings as well as with a terminal or a subprocess pipe.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, 'reconfigure'):
        _stream.reconfigure(encoding='utf-8', errors='backslashreplace')

sha = lambda b: hashlib.sha256(b).hexdigest()
CORE = ['kv', 'revs', 'meta', 'sess', 'guard', 'audit', 'sec', 'aud', 'imgs', 'imgown', 'imgref']
def load(path):
    raw = open(path, 'rb').read(); db = sqlite3.connect(':memory:')
    try:
        db.execute('PRAGMA foreign_keys=ON')
        db.executescript(raw.decode('utf-8'))
        if db.execute('PRAGMA foreign_keys').fetchone()[0] != 1:
            raise ValueError('foreign key enforcement was disabled by the dump')
        # A dump can toggle enforcement while importing. Check final integrity
        # too, so --manifest and --diff cannot silently bless an orphan.
        if db.execute('PRAGMA foreign_key_check').fetchone():
            raise ValueError('foreign key integrity check failed')
    except Exception as e:
        db.close()
        raise SystemExit('✘ تعذّر تحميل ' + path + ': ' + str(e)[:200])
    return db, raw
def summary(db, raw, path):
    tabs = [r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")]
    counts = {t: db.execute('SELECT COUNT(*) FROM "%s"' % t).fetchone()[0] for t in tabs}
    out = {'file': os.path.basename(path), 'bytes': len(raw), 'sha256': sha(raw), 'tables': counts, 'checkedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}
    if 'kv' in counts:
        rows = db.execute('SELECT k, MAX(seq) AS seq, LENGTH(v) FROM kv GROUP BY k ORDER BY k').fetchall()
        out['kv'] = {k: {'seq': s, 'bytes': n} for k, s, n in rows}; out['kvKeys'] = len(rows)
        if 'revs' in counts: out['revs'] = {k: r for k, r in db.execute('SELECT k, rev FROM revs ORDER BY k')}
    if 'meta' in counts: out['meta'] = {k: (v if k not in ('rk',) else '«محجوب»') for k, v in db.execute('SELECT k, v FROM meta ORDER BY k')}
    if 'sess' in counts: out['sessions'] = counts['sess']
    if 'd1_migrations' in counts: out['migrations'] = [r[0] for r in db.execute('SELECT name FROM d1_migrations ORDER BY id')]   # KIVO_249 · AUD-022
    return out
def main():
    a = sys.argv[1:]
    if a and a[0] == '--diff':
        A, ra = load(a[1]); B, rb = load(a[2]); sa, sb = summary(A, ra, a[1]), summary(B, rb, a[2])
        d = {'tablesOnlyA': sorted(set(sa['tables']) - set(sb['tables'])), 'tablesOnlyB': sorted(set(sb['tables']) - set(sa['tables'])),
             'countDiff': {t: [sa['tables'].get(t), sb['tables'].get(t)] for t in sorted(set(sa['tables']) | set(sb['tables'])) if sa['tables'].get(t) != sb['tables'].get(t)},
             'kvChanged': sorted(k for k in set(sa.get('kv', {})) | set(sb.get('kv', {})) if sa.get('kv', {}).get(k) != sb.get('kv', {}).get(k)),
             'metaChanged': sorted(k for k in set(sa.get('meta', {})) | set(sb.get('meta', {})) if sa.get('meta', {}).get(k) != sb.get('meta', {}).get(k))}
        print(json.dumps(d, ensure_ascii=False, indent=1)); return
    path = a[0]; db, raw = load(path); s = summary(db, raw, path)
    exp = [x for x in (a[a.index('--expect-tables') + 1].split(',') if '--expect-tables' in a else CORE)]
    missing = [t for t in exp if t not in s['tables']]
    print('✔ ' + s['file'] + ' · ' + str(s['bytes']) + ' B · sha256 ' + s['sha256'][:16] + ' · ' + str(len(s['tables'])) + ' جدولاً · kv: ' + str(s.get('kvKeys', 0)) + ' مفتاحاً · جلسات: ' + str(s.get('sessions', 0)))
    for t, n in s['tables'].items(): print('   ' + t.ljust(12) + str(n))
    if s.get('meta'): print('   meta: ' + json.dumps(s['meta'], ensure_ascii=False))
    if s.get('migrations') is not None: print('   migrations: ' + ', '.join(s['migrations']))
    if missing: print('✘ جداولُ النواة الناقصة: ' + ', '.join(missing))
    if '--manifest' in a: json.dump(s, open(a[a.index('--manifest') + 1], 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print('   manifest → ' + a[a.index('--manifest') + 1])
    sys.exit(1 if missing else 0)
if __name__ == '__main__': main()
