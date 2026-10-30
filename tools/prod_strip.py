#!/usr/bin/env python3
"""KIVO_263 · SOT-173 — حزمةُ الإنتاج بلا أداة الاختبار: يُنسخ المرشّحُ (pk<N>) إلى pk<N>.prod ويُستبدل فيه كودُ أداة الاختبار الداخلية
(/api/authz-test — بين علامتَي @@KIVO_TEST_TOOL_BEGIN/END في workers/parts/063) بدالةٍ تردّ 404 دائماً — فلا تصل Production كوداً، لا تعطيلاً بالمتغيّرات وحده.
قرارُ المالك (2026-10-12): «احتفظ بأدوات الاختبار اللازمة أثناء الاختبار على Preview بصورة محمية، مع ضمان استبعادها من نسخة الإنتاج النهائية».

  python3 tools/prod_strip.py pk263            → pk263.prod/ (+ pk263.prod.MANIFEST.sha256) ويتحقّق
  python3 tools/prod_strip.py pk263 --check    → يتحقّق من pk263.prod الموجود وحده

التحقق: العلامتان غائبتان · لا «enfIsTestUser(tu)» ولا «INSERT INTO sess … 'test'» في العامل · البديلُ (404) حاضر · يُحلَّل بـnode --check
  · (KIVO_263 · N4) عاملُ الإنتاج = نزعُ عامل المرشّح «الحالي» بايتاً (فلا يمرّ pk<N>.prod قديمٌ إن تغيّر العاملُ وحده بعد آخر نزع)
  · بقيةُ الملفات = المرشّحُ بايتاً · ولا ملفَّ في حزمة الإنتاج ليس في المرشّح (لا زائد).
"""
import hashlib, os, re, shutil, subprocess, sys, tempfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STUB = ("/* KIVO_263 · SOT-173: أداةُ الاختبار الداخلية مستبعَدةٌ من حزمة الإنتاج (tools/prod_strip.py) */\n"
        "async function enfTestApi() { return json({ ok: 0, err: 'not-found' }, 404); }\n")
RX = re.compile(r'/\* @@KIVO_TEST_TOOL_BEGIN[^\n]*\*/\n.*?/\* @@KIVO_TEST_TOOL_END \*/\n', re.S)
sha = lambda b: hashlib.sha256(b).hexdigest()

def verify(src, dst):
    bad = []
    w = open(os.path.join(dst, '_worker.js'), encoding='utf-8').read()
    if '@@KIVO_TEST_TOOL' in w: bad.append('علامةُ الأداة باقية في العامل')
    if 'enfIsTestUser(tu)' in w or "'test', 'TEST_ONLY').run()" in w: bad.append('كودُ جلسة الاختبار باقٍ في العامل')
    if STUB not in w: bad.append('البديلُ (404) غائب')
    # KIVO_263 · N4 (سلامةُ الإنتاج): عاملُ الإنتاج = نزعُ عامل المرشّح «الحالي» بايتاً — كانت الموازنةُ تتخطّى _worker.js فيمرّ pk<N>.prod قديمٌ إن تغيّر
    #   العاملُ وحده بعد آخر prod_strip، فيغلّف pack.py عاملَ إنتاجٍ قديماً. المتوقَّعُ يُحسب كما يكتبه main() نفسُه: قراءةٌ نصّية ثم RX.sub(STUB, …)
    sp = os.path.join(src, '_worker.js'); sw = open(sp, encoding='utf-8').read() if os.path.isfile(sp) else ''
    if len(RX.findall(sw)) != 1: bad.append('علامتا أداة الاختبار غيرُ موجودتين مرةً واحدة في عامل المرشّح')
    elif open(os.path.join(dst, '_worker.js'), 'rb').read() != RX.sub(STUB, sw).encode('utf-8'):
        bad.append('عاملُ الإنتاج ليس نزعَ عامل المرشّح الحالي (تغيّر العاملُ بعد آخر prod_strip — أعد: python3 tools/prod_strip.py %s)' % os.path.relpath(src, ROOT))
    # KIVO_263 (مراجعةٌ مستقلة): العاملُ المنزوع يُحمَّل فعلاً — فحصُ الصياغة بـnode على نسخةٍ .mjs (العاملُ وحدةُ ES)
    try:
        td = tempfile.mkdtemp(prefix='kivo_ps_chk_'); tp = os.path.join(td, '_worker.mjs'); open(tp, 'w', encoding='utf-8').write(w)
        r = subprocess.run(['node', '--check', tp], capture_output=True, text=True, timeout=120); shutil.rmtree(td, ignore_errors=True)
        if r.returncode != 0: bad.append('العاملُ المنزوع لا يُحلَّل: ' + (r.stderr or r.stdout).strip()[:200])
    except FileNotFoundError: bad.append('node غيرُ متاح لفحص صياغة العامل المنزوع')
    for d, _, fs in os.walk(src):
        for f in fs:
            rel = os.path.relpath(os.path.join(d, f), src)
            if rel == '_worker.js': continue
            q = os.path.join(dst, rel)
            if not os.path.exists(q) or sha(open(q, 'rb').read()) != sha(open(os.path.join(d, f), 'rb').read()): bad.append('يختلف عن المرشّح: ' + rel)
    # KIVO_263 · N4: الاتجاهُ المعاكس — ملفٌّ في حزمة الإنتاج ليس في المرشّح كان يمرّ ثم يُغلَّف في Production_upload دون أن يُرى
    for d, _, fs in os.walk(dst):
        for f in fs:
            rel = os.path.relpath(os.path.join(d, f), dst)
            if not os.path.isfile(os.path.join(src, rel)): bad.append('زائدٌ في حزمة الإنتاج: ' + rel)
    return bad

def main(a):
    if not a: print(__doc__); return 2
    src = os.path.join(ROOT, a[0].rstrip('/\\')); dst = src + '.prod'   # «pk263/» ⇒ pk263 (لا نسخَ داخل المرشّح نفسِه)
    if '--check' not in a:
        w = open(os.path.join(src, '_worker.js'), encoding='utf-8').read()
        if len(RX.findall(w)) != 1: print('✘ علامتا أداة الاختبار غيرُ موجودتين مرةً واحدة في', a[0]); return 1
        if os.path.exists(dst): shutil.rmtree(dst)
        shutil.copytree(src, dst)
        open(os.path.join(dst, '_worker.js'), 'w', encoding='utf-8', newline='').write(RX.sub(STUB, w))
        lines = []
        for d, _, fs in os.walk(dst):
            for f in sorted(fs):
                p = os.path.join(d, f); lines.append(sha(open(p, 'rb').read()) + '  ' + os.path.relpath(p, ROOT))
        open(dst + '.MANIFEST.sha256', 'w', encoding='utf-8').write('\n'.join(sorted(lines, key=lambda x: x.split('  ')[1])) + '\n')
    bad = verify(src, dst)
    for b in bad: print('  ✘', b)
    print('النتيجة: حزمةُ الإنتاج %s بلا أداة الاختبار (العاملُ وحده يختلف عن المرشّح) · %d مخالفة' % (os.path.basename(dst), len(bad)))
    return 1 if bad else 0

if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
