#!/usr/bin/env python3
"""KIVO_263 · SOT-098 — محرّكُ نطاقٍ واحد: أبعادُ النطاق (Department · Branch · Site · Zone/Element · Shift · Assigned · Own · Source · DateRange)
تُقيَّم في الخادم وحده (KIVO_SCOPE: workers/parts/009–010 · ومقيّماتُ الإنفاذ المركَّبة عليه في 058 · والإسقاطُ في 061)،
والواجهةُ لا تقيّم بُعداً بنفسها: تستهلك قرارَ الخادم (__BS_AUTHZ في 331-perm-model · البياناتُ المُسقَطة في الإقلاع و/api/get).

  python3 tools/scope_single_engine.py --check   → يُخفق إن ظهر تقييمُ بُعدٍ في الواجهة أو مقيّمٌ لبُعدٍ خارج أجزائه المعلنة
"""
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# في الواجهة: لا محرّكَ نطاق ولا قراءةَ لسجلّ السقف لترشيح البيانات
CLIENT_TOKENS = [r'KIVO_SCOPE\s*\.\s*evaluate', r'\bevaluateRead\s*\(', r'\bevaluateWrite\s*\(', r'\bdeptCeiling\s*\(', r'\bscopeValues\b', r'\benfProject', r'\benfFloorProj']
CLIENT_ALLOW = {
    'src/permissions/340-registry-v24-9.js': 'مولَّد: نسخةُ السجلّ v24.9 للواجهة (بياناتٌ ومحرّكُ الترجمة — لا مقيّمَ أبعاد)',
    'src/modules/admin/logic.js': 'محرّرُ سجلّ النطاق (تبويبُ «سقف النطاق» · ADR-029): يكتب السجلَّ ويعرضه — لا يرشّح به بيانات',
}
SERVER_DIM_RX = re.compile(r"\bD\[\s*'(Department|Branch|Site|Zone/Element|Shift|Assigned|Own|Source|DateRange)'\s*\]\s*=")
SERVER_ALLOW = {'010-kivo-scope-2.js', '058-enf-scope.js', '061-enf-read.js'}

def main(a):
    bad = []
    for d, _, fs in os.walk(os.path.join(ROOT, 'src')):
        for f in fs:
            if not f.endswith(('.js', '.html')): continue
            p = os.path.relpath(os.path.join(d, f), ROOT).replace(os.sep, '/')
            if p in CLIENT_ALLOW or p.startswith('src/pages/'): continue   # الصفحاتُ مولَّدةٌ من src/modules (تُفحص مصادرُها)
            t = open(os.path.join(ROOT, p), encoding='utf-8', errors='replace').read()
            for rx in CLIENT_TOKENS:
                for m in re.finditer(rx, t): bad.append('الواجهة تقيّم النطاق بنفسها: %s:%d (%s)' % (p, t.count('\n', 0, m.start()) + 1, m.group(0)))
    PD = os.path.join(ROOT, 'workers', 'parts'); seen = set()
    for f in sorted(os.listdir(PD)):
        t = open(os.path.join(PD, f), encoding='utf-8').read()
        for m in SERVER_DIM_RX.finditer(t):
            seen.add(m.group(1))
            if f not in SERVER_ALLOW: bad.append('مقيّمُ البُعد %s خارج أجزاء المحرّك: %s' % (m.group(1), f))
    need = {'Department', 'Branch', 'Site', 'Zone/Element', 'Shift'}
    if not need <= seen: bad.append('مقيّماتُ أبعادٍ غائبة من المحرّك: ' + str(sorted(need - seen)))
    for b in bad: print('  ✘', b)
    print('النتيجة: محرّكُ نطاقٍ واحد في الخادم (%d بُعداً بمقيّم) · الواجهةُ تستهلك قراره · %d مخالفة' % (len(seen), len(bad)))
    return 1 if bad else 0

if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
