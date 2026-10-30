#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO_259 · AUD-029 — المستودعُ الرسمي منفصلاً عن المختبر: تصديرُه وإثباتُ أنه يكفي نفسَه.
     python3 tools/export_official.py [--out DIR] [--check] [--zip FILE]
   التصدير: كلُّ ملفٍّ متتبَّع في البنية الرسمية (src · workers · public · migrations · config · tools · tests · docs · .github + package.json ·
   package-lock.json · README.md · CHANGELOG.md · eslint.config.mjs · .gitignore) بمحتواه في شجرة العمل — ولا شيءَ من المختبر
   (أجيالُ k2NN/ · registry*/ · cfbench/ · gateall*.sh · pk*/ · reports/ …). يكتب EXPORT.json (الملفات ببصماتها · مدخلاتُ الجذر).
   --check: داخل النسخة المصدَّرة وحدها (node_modules مربوطةٌ من المستودع = npm ci على package-lock نفسِه) يُشغَّل:
     المولِّد --check · الأيقونات · الإضافات · طبقتا الرموز · قواعدُ الاعتماد · الفضاءُ العام KIVO · البنيةُ الرسمية · مرجعُ SOT ·
     البناءُ (split + monolith) · اختباراتُ الوحدة كلُّها على عامل النسخة وحزمتها · إضافةُ صفحة · إضافةُ عدسة · الوثائق —
     وأيُّ إشارةٍ إلى مسار مختبر في الكود الرسمي (tools · tests · workers · src · .github) تُعدّ إخفاقاً.
   لا يَمسّ المستودعَ نفسَه: كلُّ الكتابة في DIR (افتراضياً مجلدٌ مؤقت يُحذف بعد --check)."""
import os, sys, json, hashlib, shutil, subprocess, tempfile, re, zipfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIRS = ('src/', 'workers/', 'public/', 'migrations/', 'config/', 'tools/', 'tests/', 'docs/', '.github/')
FILES = ('package.json', 'package-lock.json', 'README.md', 'CHANGELOG.md', 'eslint.config.mjs', '.gitignore')
A = sys.argv[1:]
arg = lambda k, d=None: A[A.index(k) + 1] if k in A else d
sha = lambda b: hashlib.sha256(b).hexdigest()
def official_files():
    out = subprocess.run(['git', 'ls-files', '-z'], cwd=ROOT, capture_output=True).stdout.decode('utf-8').split('\0')
    return sorted(f for f in out if f and (f.startswith(DIRS) or f in FILES) and os.path.isfile(os.path.join(ROOT, f)))
def export(dst):
    fs = official_files(); man = []
    for f in fs:
        b = open(os.path.join(ROOT, f), 'rb').read(); p = os.path.join(dst, f)
        os.makedirs(os.path.dirname(p), exist_ok=True); open(p, 'wb').write(b)
        if os.access(os.path.join(ROOT, f), os.X_OK): os.chmod(p, 0o755)
        man.append({'path': f, 'bytes': len(b), 'sha256': sha(b)})
    root = sorted(os.listdir(dst))
    info = {'files': len(man), 'bytes': sum(m['bytes'] for m in man), 'root': root, 'rootCount': len(root), 'manifest': man}
    json.dump(info, open(os.path.join(dst, 'EXPORT.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    return info
P, F = [0], [0]
def ok(c, n, x=''):
    (P if c else F)[0] += 1
    print(('  ✔ ' if c else '  ✘ ') + n + (('   ← ' + str(x)[:400]) if x and not c else ('   · ' + str(x)[:160] if x else '')))
def run(cmd, cwd, env=None, timeout=1800):
    e = dict(os.environ); e.update(env or {})
    try: r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, env=e, timeout=timeout)
    except subprocess.TimeoutExpired: return 124, 'timeout'
    return r.returncode, (r.stdout + '\n' + r.stderr).strip()
def last(s): s = [l for l in s.split('\n') if l.strip()]; return s[-1] if s else ''
LAB = re.compile(r"(?<![A-Za-z0-9_])(?:k2[0-9]{2}/(?:src|tools|tests|build|pack|audit|fixture)\b|registry(?:[0-9]+|243)?/kivo_|cfbench/[a-z0-9_]+\.mjs|gateall2[0-9]{2}\.sh|/home/claude/)")
def check(dst):
    nm = os.path.join(ROOT, 'node_modules')
    if os.path.isdir(nm): os.symlink(nm, os.path.join(dst, 'node_modules'))
    py = sys.executable
    print('╔═ المستودعُ الرسمي وحده: ' + dst + ' ═╗')
    info = json.load(open(os.path.join(dst, 'EXPORT.json'), encoding='utf-8'))
    ok(info['rootCount'] <= 15, '★ جذرُ المستودع الرسمي ' + str(info['rootCount']) + ' مدخلاً ≤ 15', ' '.join(info['root']))
    # إشاراتُ المختبر في الكود الرسمي (التعليقاتُ التاريخية في الوثائق والسجلّ مسموحة — الكودُ لا)
    hits = []
    for m in info['manifest']:
        f = m['path']
        if not f.startswith(('tools/', 'tests/unit/', 'workers/', 'src/', '.github/')) or not f.endswith(('.py', '.mjs', '.js', '.sh', '.yml', '.json')): continue
        if f.startswith(('src/pages/',)) or f in ('tools/restructure.py', 'tools/restructure_map.json', 'tools/restructure_applied.json', 'tools/restructure_official.py', 'tools/hotfix242.py', 'tools/export_official.py'): continue
        t = open(os.path.join(dst, f), encoding='utf-8', errors='ignore').read()
        if f.startswith('src/plugins/') and f.endswith('manifest.json'):   # «tests» تعلن حزمَ التكامل في المختبر الانتقالي أيضاً (tools/plugins.py يتحقّق منها حيث وُجدت)
            try: _m = json.loads(t); _m.pop('tests', None); t = json.dumps(_m, ensure_ascii=False)
            except Exception: pass
        if f.startswith('.github/workflows/') and '\n  full-gate:' in t: t = t.split('\n  full-gate:')[0]   # وظيفةُ البوابة الكاملة للمختبر الانتقالي وحده (مشروطةٌ بوجود gateall)
        code = re.sub(r'/\*[\s\S]*?\*/', '', t) if f.endswith(('.js', '.mjs')) else t
        if f.endswith('.py'): code = re.sub(r'(?s)("""|\'\'\').*?\1', '', code)              # سلاسلُ التوثيق (أمثلةُ الاستعمال والتاريخ)
        code = '\n'.join(re.sub(r'\s#\s.*$', '', l) if f.endswith(('.py', '.sh', '.yml')) else l for l in code.split('\n') if not l.lstrip().startswith(('#', '//', '*')))
        for mm in LAB.finditer(code): hits.append(f + ': ' + mm.group(0))
    ok(not hits, '★ لا إشارةَ إلى مسار مختبرٍ في كود الأدوات والاختبارات والعامل والواجهة', hits[:6])
    # سكربتاتُ npm: ما لا يبدأ بـ«lab:» يشغّل ملفاتٍ موجودةً في المستودع الرسمي (ما يحتاج المختبرَ الانتقالي مسمّىً lab:* صراحةً)
    scr = json.load(open(os.path.join(dst, 'package.json'), encoding='utf-8')).get('scripts', {}); miss = []
    for k, v in scr.items():
        if k.startswith('lab:'): continue
        for mm in re.finditer(r'(?:\b(?:python3|node|bash)\s+(?:--[\w-]+\s+)*|\bcd\s+)([^\s&|;*]+)', v):
            t = mm.group(1)
            if t.startswith(('-', '$')) or not re.search(r'\.(py|mjs|js|sh)$|^[\w.-]+$', t): continue
            if not os.path.exists(os.path.join(dst, t)): miss.append(k + ': ' + t)
    ok(not miss, '★ سكربتاتُ npm الرسمية (' + str(sum(1 for k in scr if not k.startswith('lab:'))) + ') تشغّل ملفاتٍ في المستودع الرسمي — والمختبريةُ lab:* (' + str(sum(1 for k in scr if k.startswith('lab:'))) + ')', miss[:6])
    steps = [
      ('المولِّد: المشتقّاتُ = مصادرها', [py, 'tools/generate.py', '--src', 'src', '--check']),
      ('الأيقونات', [py, 'tools/icons.py', 'check', '--src', 'src']),
      ('الإضافات (AUD-030)', [py, 'tools/plugins.py', 'check']),
      ('طبقتا الرموز (AUD-017)', [py, 'tools/tokens.py', 'check', 'src']),
      ('قواعدُ الاعتماد R1–R4 (SOT-091)', [py, 'tools/deps_check.py']),
      ('الفضاءُ العام KIVO (AUD-016)', ['node', 'tools/kivo_ns.mjs', 'tools/kivo_ns.json', '--check']),
      ('الأنواع (kivo.d.ts)', ['node', 'tools/gen_types.mjs', '--check']),
      ('البنيةُ الرسمية (AUD-029)', [py, 'tools/restructure_official.py']),
      ('مرجعُ SOT v6 متّسق', [py, 'tools/sot_verify.py']),
      ('البيئة والمخطّطات', [py, 'tools/env_check.py', 'src']),
      ('SBOM = التوليد (وقتُ التشغيل · أدواتُ المستودع)', [py, 'tools/sbom.py', '--src', 'src', '--check']),
      ('catch الفارغ (السقّاطة)', [py, 'tools/empty_catch_ratchet.py', 'src']),
      ('الألوانُ الخام (السقّاطة)', [py, 'tools/color_ratchet.py', 'src']),
      ('نقاطُ الكسر (السقّاطة)', [py, 'tools/bp_ratchet.py', 'src']),
      ('السطرُ الطويل في المصدر المحرَّر يدوياً (AUD-007)', [py, 'tools/long_lines.py', '--src', 'src', '--check']),
      ('ميثاقُ كل وحدة (SOT-092)', [py, 'tools/module_charter.py', '--check']),
      ('سجلُّ المسارات: عنوانٌ ومالكٌ وحارس (SOT-095)', [py, 'tools/route_registry.py', '--check']),
      ('مساراتُ الخادم = العقد · لكلٍّ مالك · سقفُ الموزِّع (SOT-106)', [py, 'tools/api_routes.py', '--check']),
      ('محرّكُ نطاقٍ واحد في الخادم — الواجهةُ تستهلك قراره (SOT-098)', [py, 'tools/scope_single_engine.py', '--check']),
      ('البناء: split + الصفحاتُ الكسولة', [py, 'tools/build.py', '--src', 'src', '--mode', 'split', '--pages', 'lazy', '--out', '_dist']),
      ('البناء: النسخةُ الكاملة (monolith)', [py, 'tools/build.py', '--src', 'src', '--mode', 'monolith', '--out', '_mono/index.html']),
      ('ميزانيةُ الحجم: الصفحاتُ والغلافُ والعامل تحت سقوفها (AUD-024)', [py, 'tools/perf_budget.py', '_dist']),
      ('السكربتات: رأسُ استعمال · لا شيءَ يلمس Production افتراضياً (SOT-119)', [py, 'tools/scripts_check.py']),
      ('لا اعتمادَ على hover: ما يُكشف بالمرور يُكشف بالتركيز (SOT-058)', [py, 'tools/hover_check.py']),
      ('الأصولُ الثابتة: مذكورةٌ ومستعمَلة وصغيرة وبلا بياناتٍ وصفية (SOT-085)', [py, 'tools/assets_check.py']),
      ('التكرارُ المتداخل بين الوحدات لا يزيد (AUD-012 · سقّاطة)', ['node', 'tools/dup_nested.mjs', '--check']),
    ]
    for name, cmd in steps:
        rc, out = run(cmd, dst); ok(rc == 0, name, last(out))
    rc, out = run(['node', '--no-warnings', '--test'] + sorted('tests/unit/' + f for f in os.listdir(os.path.join(dst, 'tests/unit')) if f.endswith('.test.mjs')), dst,
                  {'KIVO_WORKER': os.path.join(dst, 'workers/_worker.js'), 'KIVO_DIST': os.path.join(dst, '_dist'), 'KIVO_SRC': os.path.join(dst, 'src')}, 2400)
    m = re.search(r'# pass (\d+)\n# fail (\d+)', out)
    ok(rc == 0 and m and m.group(2) == '0', '★ اختباراتُ الوحدة كلُّها على عامل النسخة وحزمتها', (m.group(0).replace('\n', ' · ') if m else last(out)) + ('' if rc == 0 else ' · ' + ' | '.join(l for l in out.split('\n') if l.startswith('not ok'))[:300]))
    for name, f in (('إضافةُ صفحة = ملفٌّ واحد (AUD-015)', 'tests/source/page_add_check.py'), ('إضافةُ عدسة = مجلدٌ واحد (AUD-030)', 'tests/source/plugin_add_check.py'),
                    ('الوثائق: المسارات · ADR · الفهرس · الروابط (AUD-031)', 'tests/source/docs_check.py'), ('المراقبةُ معرَّفةٌ مركزياً (SOT-124/143)', 'tests/source/obs_check.py')):
        if os.path.exists(os.path.join(dst, f)):
            rc, out = run([py, f], dst); ok(rc == 0, name, last(out))
    print('\n══ النتيجة: نجح %d | أخفق %d ══' % (P[0], F[0]))
    return F[0] == 0
if __name__ == '__main__':
    tmp = arg('--out') is None
    dst = arg('--out') or tempfile.mkdtemp(prefix='kivo_official_')
    if os.path.exists(dst) and os.listdir(dst) and not tmp: raise SystemExit('✘ المجلد غيرُ فارغ: ' + dst)
    os.makedirs(dst, exist_ok=True)
    info = export(dst)
    print('✔ صُدِّر المستودعُ الرسمي: ' + str(info['files']) + ' ملفاً · ' + str(info['bytes']) + ' بايت · الجذر ' + str(info['rootCount']) + ': ' + ' '.join(info['root']))
    if arg('--zip'):
        with zipfile.ZipFile(arg('--zip'), 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
            for m in info['manifest'] + [{'path': 'EXPORT.json'}]:
                zi = zipfile.ZipInfo('kivo/' + m['path'], date_time=(1980, 1, 1, 0, 0, 0)); zi.compress_type = zipfile.ZIP_DEFLATED; zi.external_attr = 0o644 << 16
                z.writestr(zi, open(os.path.join(dst, m['path']), 'rb').read())
        print('✔ ' + arg('--zip') + ' ' + str(os.path.getsize(arg('--zip'))) + ' بايت · SHA-256 ' + sha(open(arg('--zip'), 'rb').read()))
    good = check(dst) if '--check' in A else True
    if tmp and '--check' in A: shutil.rmtree(dst, ignore_errors=True)
    sys.exit(0 if good else 1)
