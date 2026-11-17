#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""V7 · د2-ب — اختبارُ الحذف: حذفُ مجلد نظامٍ يُخرجه من القاعدة نظيفاً (مقبسُ الأنظمة · tools/systems.py).
   python3 tools/removal_test.py [all | none | award | dstats | seized | tasks | custody]... [--units] [--no-browser] [--no-check] [--keep] [--jobs N]
     none   حذفُ الأنظمة كلِّها معاً (الستة)        award · dstats · seized · tasks · custody   حذفُ نظامٍ واحد      all = الحالاتُ الست (الافتراضي)
     (الاسترشاد لا يُحذف وحده: المضبوطات تتطلبه — requires في system.json)
   لكل حالة، في نسخةٍ مؤقتة من شجرة العمل خارج المستودع (لا يُمسّ المستودع):
     ① حذفُ المجلد ثم  tools/systems.py --regen  (يعيد التوليد ويحذف ما وُلّد للنظام الغائب)
     ② لا جزءَ من القاعدة يذكر اسماً معرَّفاً في أجزاء خادم نظامٍ غائب (خارج التعليقات والنصوص)
     ③ البناء (npm run build) · التوليد --check · npm run check          (‎--no-check يتخطّى check)
     ④ الخادمُ المبني على قاعدة بياناتٍ جديدة: tests/removal/server.test.mjs
        + د4-ج: تنبيهاتُ نظامٍ غائب خارج الجرس وعدّاده، محفوظةٌ، وتعود بعودة النظام (عاملُ الشجرة الكاملة على القاعدة نفسِها)
        + د3: tests/removal/perms.test.mjs — لا مفتاحَ ولا ورقةَ ولا ذرّةَ ولا عَلمَ لنظامٍ غائب في السجلّ (340 · 004) والشجرة وروابط 006 · 008 · 010 ولا في أجزاء
          القاعدة · validate وperm_tree.py check · أعدادُ /api/permv2 = المحسوب · شجرةُ الواجهة بلا نظامٍ غائب · منحُ مفتاحه مرفوض والمخزَّنُ عليه باقٍ
          · بحثٌ نصي عن أسماء الأنظمة الغائبة في أجزاء الخادم وكتل الواجهة (خارج التعليقات والترحيلات): ما يبقى معلنٌ بسببه في tests/removal/names.allow.json
     ⑤ المتصفح: tests/removal/browser.test.mjs                              (‎--no-browser يتخطّاه)
        + د4-ج: بغياب العهد — صفحةُ الموظفين بتبويب البيانات وحده · حذفُ موظف · نسخةُ الإدارة واستعادتُها (في browser.test) · واستيرادُ الموظفين (v7_d1d_emp_import)
     ⑥ ‎--units: وحداتُ القاعدة كلها (ملفاً ملفاً، ‎--jobs بالتوازي) — طويل
   يخرج بـ0 إن نجحت كل الحالات. ‎--keep يبقي النسخ المؤقتة ويطبع مساراتها."""
import os, sys, re, json, glob, shutil, subprocess, tempfile, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CASES = {'none': ['award', 'custody', 'dstats', 'irshad', 'seized', 'tasks'], 'award': ['award'], 'dstats': ['dstats'], 'seized': ['seized'], 'tasks': ['tasks'], 'custody': ['custody']}

def sh(cmd, cwd, env=None, timeout=3600):
    r = subprocess.run(cmd, cwd=cwd, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=timeout)
    return r.returncode, (r.stdout or '') + (r.stderr or '')

def idents(text):
    out = set()
    for m in re.finditer(r'^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)', text, re.M): out.add(m.group(1))
    for m in re.finditer(r'^(?:var|let|const)\s+([^;]*?);', text, re.M | re.S):
        depth = 0; cur = ''
        for ch in m.group(1) + ',':
            if ch in '([{': depth += 1
            elif ch in ')]}': depth -= 1
            if ch == ',' and depth == 0:
                n = re.match(r'\s*([A-Za-z_$][\w$]*)', cur)
                if n: out.add(n.group(1))
                cur = ''
            else: cur += ch
    return out

def strip(code):
    """يُبقي الكودَ ويفرّغ التعليقات والنصوص (النصُّ العادي لا يعبر السطر)."""
    code = re.sub(r'/\*.*?\*/', lambda m: re.sub(r'[^\n]', ' ', m.group(0)), code, flags=re.S)
    out = []; i = 0; n = len(code); q = None
    while i < n:
        c = code[i]
        if q:
            if c == '\\': out.append('  '); i += 2; continue
            if c == q: q = None; out.append(c)
            elif c == '\n' and q != '`': q = None; out.append(c)
            else: out.append(c if c == '\n' else ' ')
        else:
            if c in '\'"`': q = c; out.append(c)
            elif c == '/' and code[i:i + 2] == '//' and (i == 0 or code[i - 1] != ':'):
                j = code.find('\n', i); j = n if j < 0 else j; out.append(' ' * (j - i)); i = j; continue
            else: out.append(c)
        i += 1
    return ''.join(out)

def scan(copy, gone):
    """[(الجزء, السطر, الاسم, النظام)] — أسماءُ الأنظمة الغائبة (من المستودع الكامل) في أجزاء الخادم المولَّد في النسخة."""
    owner = {}
    for k in gone:
        sp = os.path.join(ROOT, 'src', 'systems', k, 'system.json'); d = json.load(open(sp, encoding='utf-8'))
        files = [os.path.join(os.path.dirname(sp), p['file']) for p in d['server']['parts']] + [os.path.join(ROOT, 'workers', 'parts', g['part']) for g in d['server'].get('generated', [])]
        for f in files:
            for i in idents(open(f, encoding='utf-8').read()): owner[i] = k
    if not owner: return []
    rx = re.compile(r'(?<![\w$.])(' + '|'.join(sorted(map(re.escape, owner), key=len, reverse=True)) + r')(?![\w$])'); hits = []
    for p in json.load(open(os.path.join(copy, 'workers', 'parts.json'), encoding='utf-8'))['parts']:
        f = os.path.normpath(os.path.join(copy, 'workers', 'parts', p['file']))
        for ln, line in enumerate(strip(open(f, encoding='utf-8').read()).split('\n'), 1):
            for m in rx.finditer(line): hits.append((os.path.basename(p['file']), ln, m.group(1), owner[m.group(1)]))
    return hits

def copy_tree(dst):
    files = subprocess.run(['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], cwd=ROOT, capture_output=True).stdout.decode('utf-8').split('\0')
    for rel in files:
        if not rel or rel.startswith('node_modules/'): continue
        src = os.path.join(ROOT, rel)
        if not os.path.isfile(src): continue
        d = os.path.join(dst, rel); os.makedirs(os.path.dirname(d), exist_ok=True); shutil.copy2(src, d)
    nm = os.path.realpath(os.path.join(ROOT, 'node_modules'))
    if os.path.isdir(nm): os.symlink(nm, os.path.join(dst, 'node_modules'))

def units(copy, env, jobs):
    """وحداتُ القاعدة ملفاً ملفاً — (ملفات, فاشلة[أسماء], اختبارات, نجح, فشل, تُخطّي)."""
    files = sorted(glob.glob(os.path.join(copy, 'tests', 'unit', '*.test.mjs')) + glob.glob(os.path.join(copy, 'src', 'systems', '*', 'tests', '*.test.mjs')))
    procs = {}; done = []; q = list(files); tot = [0, 0, 0, 0]
    def reap(block):
        for f, (p, t0) in list(procs.items()):
            if p.poll() is None and time.time() - t0 < 1800: continue
            if p.poll() is None: p.kill()
            p.wait(); lg = p._log; lg.seek(0); out = lg.read().decode('utf-8', 'replace'); lg.close(); del procs[f]
            for i, key in enumerate(('tests', 'pass', 'fail', 'skipped')):
                m = re.search(r'^# %s (\d+)' % key, out, re.M); tot[i] += int(m.group(1)) if m else 0
            done.append((f, p.returncode))
        if block and procs: time.sleep(0.5)
    while q or procs:
        while q and len(procs) < jobs:
            f = q.pop(0); lg = tempfile.TemporaryFile()   # المخرجاتُ إلى ملف: أنبوبٌ لا يُقرأ يمتلئ فيعلَّق الاختبار
            pr = subprocess.Popen(['node', '--no-warnings', '--test', f], cwd=copy, env=env, stdout=lg, stderr=subprocess.STDOUT); pr._log = lg; procs[f] = (pr, time.time())
        reap(True)
    bad = [os.path.relpath(f, copy) for f, rc in done if rc != 0]
    return len(files), bad, tot

def run_case(name, opts):
    gone = CASES[name]; copy = tempfile.mkdtemp(prefix='kivo-removal-' + name + '-'); res = []; ok = True
    def step(label, good, note=''):
        nonlocal ok; ok = ok and good; res.append((label, good, note)); print('  %s %s%s' % ('✔' if good else '✘', label, (' — ' + note) if note else ''), flush=True)
    print('══ حالة الحذف «%s»: %s ══' % (name, ' · '.join(gone)), flush=True)
    try:
        copy_tree(copy)
        # مصفوفةُ التتبّع وفحصُ الأسرار وأدواتُ التحزيم تقرأ git: النسخةُ مستودعٌ مستقل (لا صلة له بمستودع المشروع) — التزامٌ قبل الحذف وآخرُ بعد التوليد
        def commit(msg):
            for g in (['add', '-A'], ['-c', 'user.name=removal', '-c', 'user.email=removal@test.invalid', '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', msg]): sh(['git'] + g, copy)
        sh(['git', 'init', '-q'], copy); commit('full tree')
        for k in gone: shutil.rmtree(os.path.join(copy, 'src', 'systems', k))
        # د4-ب: القطعةُ المشتركة التي غاب مالكوها كلُّهم يحذفها الاختبارُ نفسُه (الأدواتُ لا تحذف ملفَّ مصدر — systems.py --check يرفض بقاءها)
        for sj in glob.glob(os.path.join(copy, 'src', 'systems', '_shared', '*', 'shared.json')):
            if not any(os.path.isfile(os.path.join(copy, 'src', 'systems', o, 'system.json')) for o in json.load(open(sj, encoding='utf-8')).get('owners', [])): shutil.rmtree(os.path.dirname(sj))
        env = dict(os.environ, KIVO_WORKER=os.path.join(copy, 'workers', '_worker.js'), KIVO_DIST=os.path.join(copy, 'pk265'), KIVO_SRC=os.path.join(copy, 'src'), KIVO_FULL_SRC=os.path.join(ROOT, 'src'))
        rc, out = sh([sys.executable, 'tools/systems.py', '--regen'], copy); step('① الحذف ثم --regen', rc == 0 and '✘' not in out, (out.strip().split('\n') or [''])[-1][:140] if rc else '%d ملفاً مولَّداً حُذف' % out.count('  − '))
        commit('removal ' + name)
        left = [os.path.relpath(f, copy) for f in glob.glob(os.path.join(copy, 'src', 'pages', '*.dc.html')) if os.path.basename(f)[:-8] not in {p['name'] for p in json.load(open(os.path.join(copy, 'src', 'modules', 'modules.json'), encoding='utf-8'))['pages']}]
        step('① لا صفحةَ مولَّدة يتيمة', not left, ' · '.join(left))
        hits = scan(copy, gone); step('② لا اسمَ نظامٍ غائب في أجزاء القاعدة', not hits, ' · '.join('%s:%d %s' % h[:3] for h in hits[:6]))
        rc, out = sh(['npm', 'run', '-s', 'build'], copy, env); step('③ البناء', rc == 0, (out.strip().split('\n') or [''])[-1][:140])
        rc, out = sh([sys.executable, 'tools/generate.py', '--src', 'src', '--check'], copy, env); step('③ التوليد --check', rc == 0, next((l for l in out.split('\n') if 'generated =' in l or 'differ' in l), '')[:120])
        if not opts['nocheck']:
            rc, out = sh(['npm', 'run', '-s', 'check'], copy, env); step('③ check', rc == 0, next((l.strip() for l in out.split('\n') if '✘' in l), '')[:160])
        rc, out = sh(['node', '--no-warnings', '--test', 'tests/removal/server.test.mjs'], copy, env, 600); step('④ الخادم على قاعدة بياناتٍ جديدة', rc == 0, next((l.strip() for l in out.split('\n') if l.strip().startswith('error:')), '')[:200])
        # د3: الصلاحيات — لا رمزَ لنظامٍ غائب في السجلّ والشجرة والروابط وأجزاء القاعدة · validate · perm_tree check · شجرةُ الواجهة
        rc, out = sh(['node', '--no-warnings', '--test', 'tests/removal/perms.test.mjs'], copy, env, 600); step('④ الصلاحيات: السجلُّ والشجرةُ والروابطُ بلا نظامٍ غائب', rc == 0, next((l.strip() for l in out.split('\n') if l.strip().startswith('error:') or '!==' in l), '')[:260])
        if not opts['nobrowser']:
            rc, out = sh(['node', '--no-warnings', '--test', 'tests/removal/browser.test.mjs'], copy, env, 1200); step('⑤ المتصفح', rc == 0, next((l.strip() for l in out.split('\n') if l.strip().startswith('error:')), '')[:200])
        # د4-ج: بغياب العهد — قبولُ استيراد الموظفين القائم (tests/browser/v7_d1d_emp_import: القالب · الدمج · التعديل · الاستبدال بحذف، من الواجهة الحقيقية) يعمل كما هو
        if not opts['nobrowser'] and 'custody' in gone:
            rc, out = sh(['node', '--no-warnings', '--test', 'tests/browser/v7_d1d_emp_import.test.mjs'], copy, env, 1500); step('⑤ استيراد الموظفين بلا العهد (القبول 1–10)', rc == 0, next((l.strip() for l in out.split('\n') if l.strip().startswith('error:')), '')[:200])
        if opts['units']:
            n, bad, tot = units(copy, env, opts['jobs']); step('⑥ وحداتُ القاعدة', not bad, '%d ملفاً · %d اختباراً: نجح %d · فشل %d · تُخطّي %d%s' % (n, tot[0], tot[1], tot[2], tot[3], (' · الفاشلة: ' + ' '.join(os.path.basename(b) for b in bad[:8])) if bad else ''))
    finally:
        if opts['keep']: print('  النسخة: ' + copy)
        else: shutil.rmtree(copy, ignore_errors=True)
    return ok

def main(argv):
    names = [a for a in argv if not a.startswith('--') and not a.isdigit()] or ['all']
    if 'all' in names: names = ['none', 'award', 'dstats', 'seized', 'tasks', 'custody']
    for n in names:
        if n not in CASES: print('حالةٌ غير معروفة: ' + n + ' (none · award · dstats · seized · tasks · custody · all)'); return 2
    jobs = int(argv[argv.index('--jobs') + 1]) if '--jobs' in argv else 6
    opts = {'units': '--units' in argv, 'nobrowser': '--no-browser' in argv, 'nocheck': '--no-check' in argv, 'keep': '--keep' in argv, 'jobs': jobs}
    results = {n: run_case(n, opts) for n in names}
    print('══ اختبارُ الحذف: ' + ' · '.join('%s %s' % (n, '✔' if ok else '✘') for n, ok in results.items()) + ' ══')
    return 0 if all(results.values()) else 1

if __name__ == '__main__': sys.exit(main(sys.argv[1:]))
