#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO_255 · SOT-134 — بوابةُ سلامة البيانات (D1): فحوصٌ صريحة على نسخةٍ مصدَّرة (wrangler d1 export) أو ملف SQLite أو قاعدةٍ مفتوحة:
   python3 tools/d1/integrity.py <dump.sql | db.sqlite> [--json out.json] [--strict]
   الفحوص (كلُّ مخالفةٍ تُطبع وتُعدّ؛ --strict يجعل الخروجَ 1 عند أيّ مخالفة):
     kv-chunks     قِطعُ كلّ مفتاح متصلةٌ 0..n−1 بلا فجوة (كتابةٌ جزئية = فجوة)
     kv-json       قيمُ المفاتيح البنيوية (الحسابات · الصلاحيات · الإدارات · العقد · المنصة · مفاتيحُ الإدارات) JSON صالح
     users         معرّفاتٌ وأسماءُ دخولٍ فريدة · بصمةٌ بصيغة p1$/p2$ أو فارغة · دورٌ معروف
     revs-orphan   مراجعاتٌ لمفاتيحَ غيرِ موجودة (يُسمح بها بعد الحذف — تُعدّ للعلم)
     revs-missing  مفاتيحُ kv بلا رقم مراجعة (كتابةٌ خارج مسار الحفظ)
     meta-rev      meta.rev ≥ أكبر رقمٍ في revs
     sess-orphan   جلساتٌ لحساباتٍ غيرِ موجودة أو مجمَّدة
     imgown-orphan ملكيةُ صورٍ لصورٍ غيرِ موجودة · صورٌ بلا مالك (للعلم)
     dup-rows      تكرارُ (k, seq) في kv أو k في meta/revs (المفاتيحُ الأساسية تمنعه — يُفحص لنسخٍ مصدَّرة بلا قيود)
   يعمل الملفُ أيضاً وحدةً: integrity.check(conn) → {'violations': [...], 'info': [...], 'counts': {...}}"""
import sys, os, json, sqlite3, re
K_USERS, K_PERM, K_DEPTS, K_GDEPTS, K_PLAT = 'bassam_auth_users_v1', 'bassam_perms_v1', 'bassam_depts_v1', 'bassam_gdepts_v1', 'bassam_platform_v1'
ROLES = {'super', 'gm', 'dept', 'staff'}
def check(db):
    V, I = [], []
    tabs = {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    counts = {t: db.execute('SELECT COUNT(*) FROM "%s"' % t).fetchone()[0] for t in sorted(tabs) if not t.startswith('sqlite_')}
    def viol(kind, what): V.append({'kind': kind, 'what': what})
    if 'kv' in tabs:
        rows = db.execute('SELECT k, seq FROM kv ORDER BY k, seq').fetchall(); byk = {}
        for k, s in rows: byk.setdefault(k, []).append(s)
        for k, seqs in byk.items():
            if seqs != list(range(len(seqs))): viol('kv-chunks', k + ': ' + str(seqs[:6]))
        seen = set()
        for k, s in rows:
            if (k, s) in seen: viol('dup-rows', 'kv ' + k + '#' + str(s))
            seen.add((k, s))
        def val(k):
            parts = db.execute('SELECT v FROM kv WHERE k = ? ORDER BY seq', (k,)).fetchall()
            return ''.join(p[0] for p in parts) if parts else None
        for k in [K_USERS, K_PERM, K_DEPTS, K_GDEPTS, K_PLAT] + [x for x in byk if x.startswith('bsdept:')]:
            v = val(k)
            if v is None: continue
            try: json.loads(v)
            except Exception as e: viol('kv-json', k + ': ' + str(e)[:80])
        us = val(K_USERS)
        if us is not None:
            try: arr = json.loads(us)
            except Exception: arr = None
            if isinstance(arr, list):
                ids, uns = set(), set()
                for u in arr:
                    if not isinstance(u, dict): viol('users', 'عنصرٌ ليس كائناً'); continue
                    i, un, ph, role = u.get('id'), str(u.get('un', '')).lower(), u.get('ph'), u.get('role')
                    if not i or i in ids: viol('users', 'معرّفٌ مكرَّر/فارغ: ' + str(i))
                    ids.add(i)
                    if un and un in uns: viol('users', 'اسمُ دخولٍ مكرَّر')
                    if un: uns.add(un)
                    if ph not in (None, '') and not (isinstance(ph, str) and re.match(r'^p[12]\$', ph)): viol('users', 'بصمةٌ بصيغةٍ غير معروفة للحساب ' + str(i))
                    if role not in ROLES: viol('users', 'دورٌ غيرُ معروف: ' + str(role))
                I.append('users: %d حساباً' % len(arr))
                if 'sess' in tabs:
                    live = {u.get('id') for u in arr if isinstance(u, dict) and not u.get('dis')}
                    for (uid,) in db.execute('SELECT DISTINCT uid FROM sess'):
                        if uid not in live: viol('sess-orphan', 'جلسةٌ لحسابٍ غيرِ قائم أو مجمَّد: ' + str(uid))
        if 'revs' in tabs:
            revs = {k: r for k, r in db.execute('SELECT k, rev FROM revs')}
            orph = [k for k in revs if k not in byk]; miss = [k for k in byk if k not in revs and not k.startswith('bsdev:')]
            if orph: I.append('revs-orphan: %d (مفاتيحُ حُذفت وبقي رقمُها — مقبول)' % len(orph))
            for k in miss: viol('revs-missing', k)
            if 'meta' in tabs:
                mr = db.execute("SELECT v FROM meta WHERE k = 'rev'").fetchone()
                top = max(revs.values()) if revs else 0
                if revs and (not mr or int(mr[0] or 0) < top): viol('meta-rev', 'meta.rev=%s < أكبر مراجعة %d' % (mr[0] if mr else None, top))
    for t in ('meta', 'revs'):
        if t in tabs:
            d = db.execute('SELECT k, COUNT(*) FROM "%s" GROUP BY k HAVING COUNT(*) > 1' % t).fetchall()
            for k, n in d: viol('dup-rows', t + ' ' + k + ' ×' + str(n))
    if 'imgs' in tabs and 'imgown' in tabs:
        imgs = {r[0] for r in db.execute('SELECT DISTINCT k FROM imgs')}; own = {r[0] for r in db.execute('SELECT DISTINCT img FROM imgown')}
        for i in sorted(own - imgs): viol('imgown-orphan', i)
        if imgs - own: I.append('imgs بلا مالك: %d (للعلم)' % len(imgs - own))
    return {'violations': V, 'info': I, 'counts': counts}
def main():
    a = [x for x in sys.argv[1:] if not x.startswith('--')]
    if not a: print(__doc__); sys.exit(2)
    p = a[0]; strict = '--strict' in sys.argv; outj = sys.argv[sys.argv.index('--json') + 1] if '--json' in sys.argv else None
    if p.endswith('.sql'):
        db = sqlite3.connect(':memory:'); db.executescript(open(p, 'rb').read().decode('utf-8'))
    else: db = sqlite3.connect(p)
    r = check(db)
    for i in r['info']: print('   · ' + i)
    for v in r['violations']: print('  ✘ ' + v['kind'] + ': ' + v['what'])
    print(('✔ سلامةُ البيانات: 0 مخالفة' if not r['violations'] else '✘ سلامةُ البيانات: %d مخالفة' % len(r['violations'])) + ' · الجداول ' + json.dumps(r['counts'], ensure_ascii=False))
    if outj: json.dump(r, open(outj, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    sys.exit(1 if (strict and r['violations']) else 0)
if __name__ == '__main__': main()
