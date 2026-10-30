# -*- coding: utf-8 -*-
"""KIVO_258 · AUD-031 — بوابةُ الوثائق: «كلُّ مسارٍ موثَّق · كلُّ قرارٍ له ADR» آلياً.
   (أ) الوثائقُ الستّ المطلوبة موجودةٌ وغيرُ فارغة: architecture · api · security · admin · developer · runbooks/* (+ الملاحق القائمة)
   (ب) كلُّ مسارٍ في العقد الآلي src/api/contracts.json (= مساراتُ العامل — api_contracts.test.mjs) مذكورٌ في docs/api.md
   (ج) كلُّ ADR يُشار إليه في المصدر/الوثائق/الأدوات/الاختبارات موجودٌ ملفاً · وكلُّ ملف ADR له «الحالة» · والفهرسُ docs/adr/README.md = التوليد
   (د) كلُّ دليلٍ تشغيليّ (runbook) يُشار إليه بمساره موجود · وكلُّ روابط docs/*.md النسبية تشير إلى ملفاتٍ موجودة
       python3 tests/source/docs_check.py"""
import os, re, sys, json, glob, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P, F = [0], [0]
def ok(c, n, x=''):
    (P if c else F)[0] += 1
    print(('  ✔ ' if c else '  ✘ ') + n + (('   ← ' + str(x)[:400]) if x else ''))
rd = lambda p: open(os.path.join(ROOT, p), encoding='utf-8').read()
print('╔═ (أ) الوثائقُ المطلوبة ═╗')
need = ['docs/architecture.md', 'docs/api.md', 'docs/security.md', 'docs/admin.md', 'docs/developer.md', 'docs/threat-model.md', 'docs/observability.md', 'docs/slo.md', 'docs/due-diligence.md']
missing = [p for p in need if not os.path.exists(os.path.join(ROOT, p)) or len(rd(p).strip()) < 200]
ok(not missing, 'الوثائقُ (' + str(len(need)) + ') موجودةٌ بمحتوى', json.dumps(missing, ensure_ascii=False))
rb = sorted(glob.glob(os.path.join(ROOT, 'docs/runbooks/*.md')))
ok(len(rb) >= 5 and all(len(open(f, encoding='utf-8').read().strip()) > 200 for f in rb), 'أدلةُ التشغيل (runbooks): ' + str(len(rb)) + ' — ' + ' · '.join(os.path.basename(f)[:-3] for f in rb))
print('\n╔═ (ب) كلُّ مسارٍ موثَّق ═╗')
C = json.load(open(os.path.join(ROOT, 'src/api/contracts.json'), encoding='utf-8')); api = rd('docs/api.md')
und = [r['path'] for r in C['routes'] if r['path'] not in api]
ok(len(C['routes']) >= 35 and not und, '★ ' + str(len(C['routes'])) + ' مساراً في العقد الآلي — كلُّها في docs/api.md', json.dumps(und))
meth = [r['path'] + ':' + m for r in C['routes'] for m in r['methods'] if not re.search(re.escape(r['path']) + r'[^\n]*\b' + m + r'\b', api)]
ok(not meth, '   وطرائقُ كلِّ مسار مذكورةٌ في سطره', json.dumps(meth[:8]))
print('\n╔═ (ج) كلُّ قرارٍ له ADR ═╗')
adr = {os.path.basename(f)[4:7]: f for f in glob.glob(os.path.join(ROOT, 'docs/adr/ADR-*.md'))}
scan = []
for d in ('src', 'workers/parts', 'tools', 'scripts', 'tests', 'docs', 'build', 'config', 'migrations'):
    for f in glob.glob(os.path.join(ROOT, d, '**/*'), recursive=True):
        if os.path.isfile(f) and f.endswith(('.js', '.mjs', '.py', '.md', '.json', '.html', '.css', '.sh', '.toml', '.sql')) and '/pages/' not in f: scan.append(f)
for f in ('CHANGELOG.md', 'STATE.md', 'README.md'):
    if os.path.exists(os.path.join(ROOT, f)): scan.append(os.path.join(ROOT, f))
refs = {}
for f in scan:
    try: t = open(f, encoding='utf-8').read()
    except Exception: continue
    for m in re.findall(r'\bADR-(\d{3})\b', t): refs.setdefault(m, os.path.relpath(f, ROOT))
dang = sorted(k for k in refs if k not in adr)
ok(len(adr) >= 18 and not dang, '★ كلُّ ADR مُشارٍ إليه (' + str(len(refs)) + ') موجودٌ ملفاً (' + str(len(adr)) + ' قراراً)', json.dumps({k: refs[k] for k in dang}, ensure_ascii=False))
nost = [os.path.basename(f) for f in adr.values() if not re.search(r'^- الحالة: \S', open(f, encoding='utf-8').read(), re.M)]
ok(not nost, '   لكل قرارٍ سطرُ «الحالة»', json.dumps(nost))
r = subprocess.run([sys.executable, 'tools/adr_index.py', '--check'], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
ok(r.returncode == 0, '★ فهرسُ القرارات docs/adr/README.md = التوليد من رؤوسها', r.stdout.strip()[:200])
print('\n╔═ (د) الروابطُ والأدلة ═╗')
bad = []
for f in glob.glob(os.path.join(ROOT, 'docs/**/*.md'), recursive=True):
    t = open(f, encoding='utf-8').read()
    for m in re.findall(r'\]\(([^)#\s]+)(?:#[^)]*)?\)', t):
        if re.match(r'^[a-z]+:', m): continue
        q = os.path.normpath(os.path.join(os.path.dirname(f), m))
        if not os.path.exists(q): bad.append(os.path.relpath(f, ROOT) + ' → ' + m)
ok(not bad, '★ كلُّ رابطٍ نسبيٍّ في docs/*.md يشير إلى ملفٍّ موجود', json.dumps(bad[:6], ensure_ascii=False))
rbr = []
for f in scan:
    rel = os.path.relpath(f, ROOT).replace('\\', '/')
    if rel.startswith('docs/sot/'): continue   # وثائقُ التدقيق الأصلية مدخلاتٌ ثابتة ببصمتها (SOT) — اقتراحُ «deploy.md» فيها نُفِّذ preview-deploy.md + production-release.md
    try: t = open(f, encoding='utf-8').read()
    except Exception: continue
    for m in re.findall(r'docs/runbooks/[A-Za-z0-9_.-]+\.md', t):
        if not os.path.exists(os.path.join(ROOT, m)): rbr.append(os.path.relpath(f, ROOT) + ' → ' + m)
ok(not rbr, '   كلُّ إشارةٍ إلى دليلٍ تشغيليّ بمساره موجودة', json.dumps(sorted(set(rbr))[:6], ensure_ascii=False))
tm = open(os.path.join(ROOT, 'docs/threat-model.md'), encoding='utf-8').read()
trefs = sorted(set(re.findall(r'`([A-Za-z0-9_./-]+\.(?:mjs|py|js|sh))`', tm)))
tmiss = [r for r in trefs if not any(os.path.exists(os.path.join(ROOT, c)) for c in ([r] if '/' in r else [os.path.join(d, r) for d in ('.', 'cfbench', 'tests/unit', 'tests/source', 'scripts', 'tools', 'tools/d1', 'src/api', 'workers')]))]
# KIVO_259 · AUD-029: المستودعُ الرسمي وحده (بلا cfbench/) — حزمُ التكامل التي يذكرها النموذجُ في المختبر الانتقالي تُعدّ للعلم، وما في الشجرة الرسمية يجب أن يوجد
LABONLY = not os.path.isdir(os.path.join(ROOT, 'cfbench'))
tlab = [r for r in tmiss if LABONLY and (r.startswith('cfbench/') or ('/' not in r and (r.endswith('.mjs') or r in ('gate.py', 'chkbal.py', 'chkvar.py', 'chksvg.py'))))]
tmiss = [r for r in tmiss if r not in tlab]
ok(len(trefs) >= 40 and not tmiss, '★ نموذجُ التهديد: كلُّ اختبارٍ مثبِتٍ مُشارٍ إليه (' + str(len(trefs)) + ') موجودٌ في العُدّة' + (' — منها ' + str(len(tlab)) + ' حزمةَ تكاملٍ في المختبر الانتقالي (المستودعُ الرسمي وحده)' if tlab else ''), json.dumps(tmiss))
tr = subprocess.run([sys.executable, 'tools/trace.py', '--check'], cwd=ROOT, capture_output=True, text=True, encoding='utf-8') if os.path.exists(os.path.join(ROOT, 'tools', 'trace.py')) else None
if tr is not None: ok(tr.returncode == 0, '★ مصفوفةُ التتبّع docs/traceability.md = التوليد من المرجع والمستودع · لا «مكتمل» P0/P1 بلا دليل (SOT-128)', tr.stdout.strip()[:240])
# KIVO_261 · SOT-117/SOT-163 (كشفه التدقيقُ المستقل): بندٌ معلَّمٌ «✔» في حزمة العناية الواجبة لا يستشهد بسجلٍّ ينتهي بإخفاق —
# كان «layout_259.txt» (9/1) و«devices_after_fix_259.txt» (28/3) دليلين لبندين «✔» وهما سجلّان استكشافيان سبقا الإصلاح. لكل سطرٍ في جدولٍ حالتُه ✔:
# كلُّ ملف .txt تحت reports/ يُذكر فيه وموجودٌ في الشجرة يجب أن يكون آخرُ سطر «النتيجة» فيه بلا إخفاق (المستودعُ الرسمي بلا reports/ يتخطّى الملفات الغائبة).
DD = open(os.path.join(ROOT, 'docs/due-diligence.md'), encoding='utf-8').read()
ddbad, ddn = [], 0
for line in DD.split('\n'):
    cells = [c.strip() for c in line.split('|')]
    if len(cells) < 4 or not cells[-2].startswith('✔'): continue
    for ref in re.findall(r'`(reports/[A-Za-z0-9_./-]+\.txt)`', line):
        fp = os.path.join(ROOT, ref)
        if not os.path.exists(fp): continue
        ddn += 1
        res = [l for l in open(fp, encoding='utf-8', errors='replace').read().split('\n') if 'النتيجة' in l]
        last = res[-1] if res else ''
        m = re.search(r'أخفق (\d+)', last) or re.search(r'(\d+) إخفاق', last)
        okL = (bool(m) and int(m.group(1)) == 0) or (not m and 'PASS' in last and 'FAIL' not in last)
        if not okL: ddbad.append(ref + ' ← ' + (last.strip()[:80] or 'بلا سطر نتيجة'))
ok(not ddbad, '★ حزمةُ العناية الواجبة: كلُّ بندٍ «✔» يستشهد بسجلٍّ ينتهي بلا إخفاق (' + str(ddn) + ' سجلاً مذكوراً)', ' | '.join(ddbad[:5]))
# (هـ) KIVO_263 · SOT-128 — المتطلباتُ ذاتُ الطبيعة الوثائقية لها فحصٌ آليّ لمحتواها (لا مجرّدُ وجود الملف):
print('╔═ (هـ) محتوى الوثائق المطلوبة بالبند ═╗')
AR = rd('docs/architecture.md')
ok(AR.count('```mermaid') >= 2 and 'erDiagram' in AR and re.search(r'flowchart|sequenceDiagram', AR) is not None, 'SOT-158 · نظرةُ المعمارية: مخطّطُ تدفّق الطلب ومخطّطُ البيانات (ER) بـmermaid')
adrs = sorted(glob.glob(os.path.join(ROOT, 'docs/adr/ADR-*.md'))); idx = rd('docs/adr/README.md')
miss = [os.path.basename(f) for f in adrs if os.path.basename(f)[:7] not in idx]
ok(len(adrs) >= 34 and not miss, 'SOT-118 · SOT-159 · سجلُّ القرارات المعمارية: ' + str(len(adrs)) + ' ADR وكلُّها في الفهرس', ' · '.join(miss[:5]))
TM = rd('docs/threat-model.md')
stride = set(''.join(re.findall(r'\(([STRIDE/]+)\)', ' '.join(l.split('|')[3] for l in TM.split('\n') if re.match(r'\| T\d+ \|', l)))).replace('/', ''))
ok(stride >= set('STRIDE'), 'SOT-135 · نموذجُ التهديد يغطّي فئات STRIDE الستّ (من عمود التهديد)', ''.join(sorted(set('STRIDE') - stride)))
AD = re.sub(r'[\u064B-\u0652]', '', rd('docs/admin.md'))
ok(all(w in AD for w in ('سقف النطاق', 'الخطة الأولى', 'الإنفاذ')), 'SOT-161 · دليلُ الإدارة يغطّي سقفَ النطاق والخطةَ الأولى والإنفاذ')
DP = rd('docs/dependencies-policy.md')
ok('SOT-090' in DP and os.path.exists(os.path.join(ROOT, 'tools/deps_check.py')) and 'LICENSES.md' in DP, 'SOT-090 · سياسةُ الاعتماديات موثّقةٌ ومفروضةٌ آلياً (tools/deps_check.py)')
print('\n══ النتيجة: نجح %d | أخفق %d ══' % (P[0], F[0]))
sys.exit(1 if F[0] else 0)
