#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO_258 · SOT-125/SOT-140/SOT-165 — أداة أمن مشتركة لفحص الأسرار، جزء من السياسات والأدوات الأمنية لا اكتمال المجال الأمني.
   مسحُ الأسرار: لا سرَّ في المصدر المتتبَّع ولا في الحزمة المنشورة.
   الأنماط: رموزُ Cloudflare/GitHub/AWS/Google · مفاتيحُ خاصة PEM · JWT · بصماتُ كلمات المرور (p1$/p2$ — PBKDF2 للمنصة) · إسنادُ «password/secret/token = "…"» بقيمةٍ حرفية
   · كلمةُ مرور البذر (بيانات الاختبار المعلنة) خارج العُدّة. الملفاتُ: كلُّ ما يتتبّعه git في الشجرة (عدا العُدّة tests/ cfbench/ المسموحِ لها ببيانات الاختبار المعلنة) + الحزمةُ dist (كلُّها).
     python3 tools/sec/secrets_scan.py [pkDir] [--json out.json]     — خروجٌ 1 عند أيّ اكتشاف"""
import os, re, sys, json, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
A = sys.argv[1:]; PK = os.path.join(ROOT, next((x for x in A if not x.startswith('--') and (A.index(x) == 0 or A[A.index(x) - 1] != '--json')), 'pk258'))
PAT = [
    ('cloudflare-token', re.compile(r'(?<![A-Za-z0-9_-])[A-Za-z0-9_-]{40}(?![A-Za-z0-9_-])'), lambda m, line: re.search(r'(?i)(cf|cloudflare|api)[_-]?(token|key)', line) is not None),
    ('github-token', re.compile(r'\bgh[pousr]_[A-Za-z0-9]{36,}\b'), None),
    ('aws-key', re.compile(r'\bAKIA[0-9A-Z]{16}\b'), None),
    ('google-key', re.compile(r'\bAIza[0-9A-Za-z_-]{35}\b'), None),
    ('private-key', re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----'), None),
    ('jwt', re.compile(r'\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b'), None),
    ('pw-hash', re.compile(r'\bp[12]\$\d+\$[A-Za-z0-9+/=]{16,}\$[A-Za-z0-9+/=]{16,}'), None),
    ('secret-assign', re.compile(r'(?i)\b(password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token)\b\s*[:=]\s*["\'][^"\'\s]{8,}["\']'), None),
    ('fixture-password', re.compile(r'(?<![0-9])482917(?![0-9])'), None),   # secrets-scan: allow — النمطُ نفسُه (كلمةُ مرور بذر العُدّة المعلنة)
]
FIXTURE_DIRS = ('tests/', 'cfbench/')                     # العُدّة: بياناتُ الاختبار المعلنة (كلمةُ مرور البذر · مفاتيحُ تجريبية) مسموحةٌ فيها وحدها
ALLOW_LINE = re.compile(r'secrets-scan:\s*allow')           # استثناءٌ معلنٌ بعينه في السطر نفسِه (مع سببه)
SKIP_EXT = ('.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.zip', '.br', '.gz', '.pdf', '.webp')
def tracked():
    result = subprocess.run(['git', '--no-optional-locks', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=ROOT, capture_output=True, check=True)
    out = result.stdout.decode('utf-8').split('\0')
    return sorted({f for f in out if f and not f.endswith(SKIP_EXT) and os.path.isfile(os.path.join(ROOT, f))})
def scan(path, rel, fixture_ok):
    hits = []
    try: t = open(path, encoding='utf-8', errors='ignore').read()
    except Exception: return hits
    if len(t) > 8_000_000: return hits
    for i, line in enumerate(t.split('\n'), 1):
        if ALLOW_LINE.search(line): continue
        for kind, rx, cond in PAT:
            if fixture_ok and kind in ('fixture-password', 'secret-assign', 'pw-hash'): continue
            for m in rx.finditer(line):
                if cond and not cond(m, line): continue
                hits.append({'file': rel, 'line': i, 'kind': kind, 'match': '<redacted>'})
    return hits
STRICT = ('src/', 'workers/', 'public/', 'migrations/', 'config/', 'build/', 'tools/', 'scripts/', 'docs/', 'lint/', 'sbom/', 'tests/baselines/', 'hotfix/')   # المستودعُ الرسمي وحزمةُ الإصلاح (AUD-029: scripts/ build/ lint/ sbom/ انتقلت إلى tools/ tests/baselines/ docs/compliance/ — الأسماءُ القديمة باقيةٌ لفحص الشجرات السابقة)
H, LAB = [], []
src = tracked()
if not src:
    print('✘ مسح الأسرار: لا توجد ملفات مصدر للفحص؛ لا تُقبل نتيجة فارغة', file=sys.stderr)
    sys.exit(2)
for f in src:
    if f.startswith(('docs/sot/',)): continue              # وثائقُ التدقيق الأصلية مدخلاتٌ ثابتة ببصمتها
    if f.startswith(STRICT) or '/' not in f: H += scan(os.path.join(ROOT, f), f, False)
    elif f.startswith(FIXTURE_DIRS): H += scan(os.path.join(ROOT, f), f, True)
    else: LAB += scan(os.path.join(ROOT, f), f, False)      # أجيالُ المختبر (k2NN/ · registry*/ …) خارج المستودع الرسمي (AUD-029) — تُعدّ للعلم
dist = []
if os.path.isdir(PK):
    for r, ds, fs in os.walk(PK):
        for f in fs:
            if f.endswith(SKIP_EXT): continue
            q = os.path.join(r, f); dist.append(q); H += scan(q, os.path.relpath(q, ROOT), False)
by = {}
for h in H: by[h['kind']] = by.get(h['kind'], 0) + 1
labBy = {}
for h in LAB: labBy[h['kind']] = labBy.get(h['kind'], 0) + 1
print(('✔' if not H else '✘') + ' مسحُ الأسرار: ' + str(len(src)) + ' ملفاً مرشحاً للرفع (متتبَّعاً أو جديداً) + ' + str(len(dist)) + ' ملفاً في ' + os.path.relpath(PK, ROOT) + ' — ' + (str(len(H)) + ' اكتشافاً ' + json.dumps(by) if H else '0 اكتشاف في المصدر الرسمي والعُدّة والحزمة') + (' · للعلم في أجيال المختبر: ' + json.dumps(labBy) if LAB else ''))
for h in H[:20]: print('   ✘ %s:%d  %s  %s' % (h['file'], h['line'], h['kind'], h['match']))
print('══ النتيجة: نجح %d | أخفق %d ══' % (0 if H else 1, 1 if H else 0))   # KIVO_259: سطرُ النتيجة الموحَّد (حكمٌ واحد — تجمعه البوابة كسائر البراهين)
if '--json' in A: json.dump({'files': len(src), 'dist': len(dist), 'findings': H, 'labInfo': labBy, 'labFindings': LAB[:50]}, open(A[A.index('--json') + 1], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
sys.exit(1 if H else 0)
