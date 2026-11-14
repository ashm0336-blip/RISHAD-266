#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO — التغليفُ الحتمي لأي مرشّح (مشتقٌّ من k243/pack/pack243.py):
   python3 tools/pack.py KIVO_244 [pkDir=pk244] [outDir=/mnt/user-data/outputs/KIVO_244]
   يكتب: <NAME>_dist_Candidate.zip (dist/ + MANIFEST) · <NAME>_Preview_upload.zip (المحتوى في الجذر للسحب والإفلات) · <NAME>_MANIFEST.sha256 · pack.json
   KIVO_263 · SOT-173 (قرارُ المالك): مرشّحُ الإنتاج من <pkDir>.prod وحده (tools/prod_strip.py — بلا أداة الاختبار):
     <NAME>_Production_upload.zip (المحتوى في الجذر — هو ما يُرفع إلى Production يومَ اعتماد المالك) · <NAME>_dist_Candidate.zip (dist/ + MANIFEST للأرشفة)
     و<NAME>_Preview_upload.zip من <pkDir> نفسه (فيه الأداةُ المحمية — لـPreview وحدها) + <NAME>_Preview_MANIFEST.sha256.
   يرفض التغليفَ إن غاب <pkDir>.prod أو لم يكن مشتقّاً من <pkDir> الحالي (prod_strip.verify: العاملُ وحده يختلف · بلا الأداة · يُحلَّل بـnode).
   الحتمية: ترتيبٌ ثابت · تاريخٌ ثابت 1980-01-01 · صلاحياتٌ ثابتة."""
import os, sys, json, hashlib, zipfile
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAME = sys.argv[1]; DIST = os.path.abspath(sys.argv[2] if len(sys.argv) > 2 else os.path.join(H, 'pk' + NAME.split('_')[1])); OUT = os.path.abspath(sys.argv[3] if len(sys.argv) > 3 else '/mnt/user-data/outputs/' + NAME); os.makedirs(OUT, exist_ok=True)
sha = lambda b: hashlib.sha256(b).hexdigest(); FIXED = (1980, 1, 1, 0, 0, 0); rb = lambda p: open(p, 'rb').read()
def walk(d):
    out = []
    for r, ds, fs in os.walk(d):
        ds[:] = sorted(x for x in ds if x not in ('node_modules', '__pycache__'))
        for f in sorted(fs):
            if '.bak' in f or f.endswith('.pyc'): continue
            out.append(os.path.join(r, f))
    return sorted(out)
def zwrite(path, entries):
    with zipfile.ZipFile(path, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for name, data in entries:
            zi = zipfile.ZipInfo(name, date_time=FIXED); zi.compress_type = zipfile.ZIP_DEFLATED; zi.external_attr = 0o644 << 16; zi.create_system = 3; z.writestr(zi, data)
files = [(os.path.relpath(p, DIST).replace(os.sep, '/'), rb(p)) for p in walk(DIST)]   # Preview_upload
PROD = DIST.rstrip('/') + '.prod'
if not os.path.isdir(PROD): sys.exit('✘ %s غائب — شغّل أولاً: python3 tools/prod_strip.py %s (مرشّحُ الإنتاج بلا أداة الاختبار — SOT-173)' % (PROD, os.path.relpath(DIST, H)))
import importlib.util as _ilu
_sp = _ilu.spec_from_file_location('prod_strip', os.path.join(H, 'tools', 'prod_strip.py')); _ps = _ilu.module_from_spec(_sp); _sp.loader.exec_module(_ps)
_bad = _ps.verify(DIST, PROD)
if _bad: sys.exit('✘ %s ليس مشتقّاً من %s الحالي (أعد: python3 tools/prod_strip.py %s):\n  ' % (os.path.basename(PROD), os.path.basename(DIST), os.path.relpath(DIST, H)) + '\n  '.join(_bad[:8]))
pfiles = [(os.path.relpath(p, PROD).replace(os.sep, '/'), rb(p)) for p in walk(PROD)]   # مرشّحُ الإنتاج (بلا أداة الاختبار)
# V7 · د1: رقمُ التزام البناء يُحقن هنا في _worker.js داخل الحزمة وحدها (لا في ملفٍّ متتبَّع ولا في مجلد البناء) — سطرُ العلامة مرةً واحدة بالضبط.
#   الشجرةُ غيرُ النظيفة (git status --porcelain غيرُ فارغ) تُوسم ‎-dirty‎. tools/pkg_compare.py يقارن حزمتين متجاهلاً هذا السطر وحده.
import re as _re, subprocess as _sp2
COMMIT_RX = _re.compile(rb"^var WORKER_COMMIT = '[^'\n]*';(   // @@KIVO_COMMIT@@)$", _re.M)
def _commit():
    try:
        c = _sp2.run(['git', '-C', H, 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
        d = _sp2.run(['git', '-C', H, 'status', '--porcelain'], capture_output=True, text=True, check=True).stdout.strip()
    except Exception as e: sys.exit('✘ رقمُ الالتزام: git غيرُ متاح (' + str(e)[:120] + ')')
    if not _re.fullmatch(r'[0-9a-f]{40}', c): sys.exit('✘ رقمُ الالتزام غيرُ صالح: ' + c[:60])
    return c + ('-dirty' if d else '')
COMMIT = _commit()
def _stamp(entries):
    out, n = [], 0
    for rel, b in entries:
        if rel == '_worker.js':
            b, k = COMMIT_RX.subn(b"var WORKER_COMMIT = '" + COMMIT.encode('ascii') + b"';\\1", b); n += k
            if k != 1: sys.exit('✘ _worker.js: سطرُ العلامة @@KIVO_COMMIT@@ وُجد %d مرّة (المتوقَّع 1)' % k)
        out.append((rel, b))
    if n != 1: sys.exit('✘ _worker.js غائبٌ عن الحزمة — لا مكانَ لرقم الالتزام')
    return out
files = _stamp(files); pfiles = _stamp(pfiles)
man = ''.join(f'{sha(b)}  dist/{rel}\n' for rel, b in pfiles)
manj = json.dumps({'package': NAME, 'root': 'dist/', 'production': os.path.isdir(PROD), 'files': [{'path': rel, 'bytes': len(b), 'sha256': sha(b)} for rel, b in pfiles]}, ensure_ascii=False, indent=1).encode('utf-8')
readme = f"""{NAME} — حزمةُ النشر dist/ (مرشَّحُ الإنتاج بلا أداة الاختبار — tools/prod_strip.py · لم يُنشر على Production؛ النشرُ بقرار المالك الصريح وحده)
التحقق قبل أي رفع (من المجلد الذي فيه dist/):  sha256sum -c MANIFEST.sha256
الرفع إلى Preview وحدها: Cloudflare ← Workers & Pages ← المشروع 0 ← Deployments ← Create deployment ← Preview · الفرع test ← إسقاط {NAME}_Preview_upload.zip (فيه أداةُ الاختبار المحمية)
Production (بعد اعتماد المالك الصريح وحده): {NAME}_Production_upload.zip — بلا أداة الاختبار؛ لا يُرفع Preview_upload إلى Production أبداً (docs/runbooks/production-release.md)
متغيّرات بيئة Preview: KIVO_AUTHZ_MODE=enforce · KIVO_TEST_FIXTURE=allow (أثناء الاختبار فقط) · KIVO_TEST_HOST=test.kivo-d81.pages.dev (جديد في KIVO_244)
الإيقافُ الفوري للإنفاذ بلا نشر: UPDATE meta SET v = 'legacy' WHERE k = 'authz_mode';   (Console قاعدة bassam-db-preview)
الرجوع: Deployments ← آخرُ نشرٍ ناجح على test ← Rollback. التفاصيل: docs/runbooks/preview-deploy.md في المستودع.
""".encode('utf-8')
zwrite(os.path.join(OUT, f'{NAME}_dist_Candidate.zip'), [('dist/' + rel, b) for rel, b in pfiles] + [('MANIFEST.json', manj), ('MANIFEST.sha256', man.encode('utf-8')), ('README_AR.txt', readme)])
zwrite(os.path.join(OUT, f'{NAME}_Preview_upload.zip'), [(rel, b) for rel, b in files])
zwrite(os.path.join(OUT, f'{NAME}_Production_upload.zip'), [(rel, b) for rel, b in pfiles])   # KIVO_263: ما يُرفع إلى Production (بعد اعتماد المالك وحده)
open(os.path.join(OUT, f'{NAME}_Preview_MANIFEST.sha256'), 'w', encoding='utf-8').write(''.join(f'{sha(b)}  {rel}\n' for rel, b in files))
open(os.path.join(OUT, f'{NAME}_MANIFEST.sha256'), 'w', encoding='utf-8').write(man)
res = {}
for f in sorted(os.listdir(OUT)):
    p = os.path.join(OUT, f)
    if os.path.isfile(p) and not f.startswith('SHA256SUMS') and f != 'pack.json': res[f] = {'bytes': os.path.getsize(p), 'sha256': sha(rb(p))}
json.dump({'package': NAME, 'commit': COMMIT, 'dist': DIST, 'prod': PROD, 'files': len(files), 'distBytes': sum(len(b) for _, b in files), 'outputs': res}, open(os.path.join(OUT, 'pack.json'), 'w'), ensure_ascii=False, indent=1)
with open(os.path.join(OUT, 'SHA256SUMS.txt'), 'w') as f:
    for k, v in res.items(): f.write(v['sha256'] + '  ' + k + '\n')
print(json.dumps(res, ensure_ascii=False, indent=1))
