#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO_259 · AUD-029 — جذرُ المستودع الرسمي ≤ 15 مدخلاً: نقلٌ حتميّ لأربع مجموعاتٍ إلى مجلداتٍ رسمية قائمة + إعادةُ كتابة كلّ مرجعٍ إليها في الملفات الرسمية.
     python3 tools/restructure_official.py --apply      (git mv + إعادةُ الكتابة) · --check: لا مرجعَ قديماً باقٍ في الملفات الرسمية
   النقل (المصدر ← الوجهة):
     scripts/*            → tools/*                 أدواتُ الإصدار والفحص (release_check · build_chain · pack · sbom · sot · السقّاطات · env_check · onboard_check)
     build/build.py       → tools/build.py          المجمِّع الحتمي
     lint/*               → tests/baselines/*       خطوطُ أساس السقّاطات (ESLint · الألوان · catch · نقاط الكسر · اللمس · a11y · البصري)
     sbom/* · LICENSES.md → docs/compliance/        SBOM (CycloneDX) وجدولُ التراخيص — مولَّدان بـtools/sbom.py
   ونسختان مرجعيّتان (المختبرُ يحتفظ بأصلهما): وثيقةُ v24.9 → docs/reference/v24_9_FINAL.html (شجرةُ الصلاحيات تُشتقّ منها) ·
   مولِّدُ بيانات الاختبار → tests/fixtures/gen_fixture.py (سبق).
   الملفاتُ الرسمية = src · workers · public · migrations · config · tools · tests · docs · .github · package.json · README.md · CHANGELOG.md · eslint.config.mjs
   + حزمُ البوابة الدائمة النشطة (cfbench المذكورة في أحدث gateall) — وما سواها (أجيالُ المختبر · سجلاتُ الإصدارات السابقة) تاريخٌ لا يُعاد كتابتُه."""
import os, re, sys, glob, subprocess, shutil
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MOVES = [('scripts/', 'tools/'), ('build/build.py', 'tools/build.py'), ('lint/', 'tests/baselines/'), ('sbom/', 'docs/compliance/sbom/'), ('LICENSES.md', 'docs/compliance/LICENSES.md')]
COPIES = [('registry10/v24_9_FINAL.html', 'docs/reference/v24_9_FINAL.html')]
OFFICIAL = ('src/', 'workers/', 'public/', 'migrations/', 'config/', 'tools/', 'tests/', 'docs/', '.github/', 'scripts/', 'build/', 'lint/', 'sbom/')
OFFICIAL_FILES = ('package.json', 'README.md', 'CHANGELOG.md', 'eslint.config.mjs', 'LICENSES.md', '.gitignore')
TEXT = ('.py', '.mjs', '.js', '.json', '.md', '.sh', '.yml', '.yaml', '.toml', '.html', '.txt', '.css')
git = lambda *a: subprocess.run(['git'] + list(a), cwd=ROOT, capture_output=True, text=True)
def gate_suites():
    gs = sorted(glob.glob(os.path.join(ROOT, 'gateall2[0-9][0-9].sh')))
    t = open(gs[-1], encoding='utf-8').read() if gs else ''
    return ['cfbench/' + x for x in sorted(set(re.findall(r'([A-Za-z0-9_]+\.mjs)', t)) | {g + '.mjs' for g in re.findall(r'x/([A-Za-z0-9_]+):', t)}) if os.path.exists(os.path.join(ROOT, 'cfbench', x))]   # x/<اسم> = حزمةٌ عبر k243xdiff + ([os.path.relpath(gs[-1], ROOT)] if gs else [])
def targets():
    fs = [f for f in git('ls-files').stdout.split('\n') if f and (f.startswith(OFFICIAL) or f in OFFICIAL_FILES)]
    fs = [f for f in fs if not f.startswith(('docs/sot/', 'tests/source/k24', 'tests/source/k250', 'tests/source/k251', 'tests/source/k252', 'tests/source/k253', 'tests/source/k254', 'tests/source/k255', 'tests/source/k256', 'tests/source/k257', 'tests/source/k258'))]
    fs += gate_suites()
    SELF = ('tools/restructure_official.py', 'tools/restructure.py', 'tools/restructure_map.json', 'tools/restructure_applied.json')   # هذه الأداةُ وسجلُّ نقل 251 التاريخي
    return sorted(set(f for f in fs if (f.endswith(TEXT) or f in OFFICIAL_FILES) and f not in SELF and not f.startswith(('scripts/restructure', 'docs/traceability.md')) and os.path.isfile(os.path.join(ROOT, f))))
# أنماطُ المرجع: مسارٌ نصّيّ (بحدٍّ لا يسبقه حرفُ اسم) · ومقاطعُ os.path.join · وCHANGELOG تاريخٌ (يُترك)
NOT_NAME = r'(?<![A-Za-z0-9_@.-])(?<![A-Za-z0-9_@.-]/)'   # ولا مقطعَ مسارٍ قبله: k243/build/build.py مسارُ المختبر يبقى (ROOT + '/scripts/…' يُعاد كتابتُه)
RULES = [
    (re.compile(NOT_NAME + r'scripts/(?=[A-Za-z0-9_]+\.(?:py|sh)\b)'), 'tools/'),
    (re.compile(NOT_NAME + r'build/build\.py\b'), 'tools/build.py'),
    (re.compile(NOT_NAME + r'lint/(?=[A-Za-z0-9_.]+\.json\b|\*|\b)'), 'tests/baselines/'),
    (re.compile(NOT_NAME + r'(?<!compliance/)sbom/'), 'docs/compliance/sbom/'),
    (re.compile(NOT_NAME + r'(?<!compliance/)LICENSES\.md\b'), 'docs/compliance/LICENSES.md'),
    (re.compile(NOT_NAME + r'registry10/v24_9_FINAL\.html'), 'docs/reference/v24_9_FINAL.html'),
    (re.compile(r"(['\"])lint\1(\s*,\s*)"), r"\1tests\1\2\1baselines\1\2"),                 # os.path.join(ROOT, 'lint', …)
    (re.compile(r"(['\"])/lint\1"), r"\1/tests/baselines\1"),                                       # ROOT + '/lint' (mkdirSync قبل الكتابة)
    (re.compile(r"(os\.path\.join\(H,\s*)'sbom'"), r"\1'docs', 'compliance', 'sbom'"),
]
SPECIAL = {   # ملفاتٌ تُعدَّل بنصٍّ محدَّد لا بالقواعد العامة (أسماءٌ داخل مجلدٍ مؤقت ليست مسارات المستودع)
    'tools/sec/secrets_scan.py': [],
    'docs/adr/ADR-020-official-repository-structure.md': [],   # قرارُ النقل نفسُه: يذكر المساراتِ القديمة عمداً   # STRICT يحمل البادئاتِ القديمة عمداً (scripts/ lint/ sbom/) لفحص الشجرات السابقة — والجديدةُ مضافةٌ بجانبها يدوياً
    'tools/sbom.py': [("else 'sbom')", "else 'docs/compliance/sbom')"), ("LIC_ROOT = os.path.join(H, 'LICENSES.md')", "LIC_ROOT = os.path.join(H, 'docs', 'compliance', 'LICENSES.md')"),
                      ('[--out sbom]   (LICENSES.md في جذر المستودع)', '[--out docs/compliance/sbom]   (docs/compliance/LICENSES.md)'), ('python3 scripts/sbom.py', 'python3 tools/sbom.py'),
                      ("'tools': [{'name': 'scripts/sbom.py', 'vendor': 'KIVO'}]", "'tools': [{'name': 'tools/sbom.py', 'vendor': 'KIVO'}]"),
                      ('المصدر: `scripts/sbom.py` (CycloneDX 1.5 في `sbom/`؛', 'المصدر: `tools/sbom.py` (CycloneDX 1.5 في `docs/compliance/sbom/`؛')],
}
def rewrite(path, text):
    if path == 'CHANGELOG.md': return text                                        # السجلُّ تاريخ: مساراتُه وقتَ كتابتها
    if path in SPECIAL:
        out = text
        for a, b in SPECIAL[path]: out = out.replace(a, b)
        return out
    out = text
    for rx, rep in RULES: out = rx.sub(rep, out)
    return out
def apply():
    for src, dst in MOVES:
        s = os.path.join(ROOT, src)
        if not os.path.exists(s): continue
        if src.endswith('/'):
            os.makedirs(os.path.join(ROOT, dst), exist_ok=True)
            for f in sorted(git('ls-files', src).stdout.split('\n')):
                if f: r = git('mv', f, dst + f[len(src):]); assert r.returncode == 0, r.stderr
            try: shutil.rmtree(s) if not os.listdir(s) else None
            except Exception: pass
        else:
            os.makedirs(os.path.dirname(os.path.join(ROOT, dst)) or ROOT, exist_ok=True)
            r = git('mv', src, dst); assert r.returncode == 0, r.stderr
        bd = os.path.join(ROOT, os.path.dirname(src.rstrip('/'))) if '/' in src.rstrip('/') else None
        if bd and os.path.isdir(bd) and not os.listdir(bd): os.rmdir(bd)
    for src, dst in COPIES:
        os.makedirs(os.path.dirname(os.path.join(ROOT, dst)), exist_ok=True); shutil.copyfile(os.path.join(ROOT, src), os.path.join(ROOT, dst))
    n = 0
    for f in targets():
        p = os.path.join(ROOT, f); t = open(p, encoding='utf-8', newline='').read(); u = rewrite(f, t)
        if u != t: open(p, 'w', encoding='utf-8', newline='').write(u); n += 1
    print('✔ نُقلت المجموعات · نسختان مرجعيّتان · أُعيدت كتابةُ المراجع في ' + str(n) + ' ملفاً')
def check():
    bad = []
    for f in targets():
        t = open(os.path.join(ROOT, f), encoding='utf-8', newline='').read()
        if f == 'CHANGELOG.md': continue
        if rewrite(f, t) != t: bad.append(f)
    left = [s for s, _ in MOVES if os.path.exists(os.path.join(ROOT, s))]
    root = sorted(e for e in os.listdir(ROOT))
    off = [e for e in root if (e + '/') in OFFICIAL or e in OFFICIAL_FILES or e in ('package-lock.json',)]
    print(('✔' if not bad and not left else '✘') + ' البنيةُ الرسمية: لا مرجعَ قديماً في ' + str(len(targets())) + ' ملفاً رسمياً' + (' (باقٍ: ' + ', '.join(bad[:6]) + ')' if bad else '') +
          ' · المجموعاتُ المنقولة غائبة' + (' (باقٍ: ' + ', '.join(left) + ')' if left else '') + ' · مدخلاتُ الجذر الرسمية: ' + str(len(off)) + ' ' + ' '.join(off))
    return not bad and not left
if __name__ == '__main__':
    if '--apply' in sys.argv: apply()
    sys.exit(0 if check() else 1)
