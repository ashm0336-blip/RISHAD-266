# -*- coding: utf-8 -*-
"""KIVO_253 · RM-3 (AUD-018 أيقونات · SOT-157 بلا اتصال · AUD-015 routeNames) — إثباتُ الفرق بالضبط عن KIVO_252 (الوسم git KIVO_252 · Python · بلا خادم):
   (أ) الشجرةُ المتتبَّعة = KIVO_252 بايتاً عدا الملفاتِ المعلنة (الإصدار · الخادم وجزآه 002/056 · pages.json ومشتقُّه · 280-server-storage · قوالبُ الوحدات الـ14 والغلاف ·
       الصفحاتُ المولَّدة) + ملفاتٌ جديدة معلنة (tools/icons.py · assets/icons/catalog.json) + خطّافا التركيب في build.py وpage_modules.py
   (ب) كلُّ ملفٍّ متغيّر = ملفُّ 252 بعد عكس التحويل المعلن وحده:
       · القوالب: إعادةُ تركيب <svg data-i> من الفهرس ثم توحيدُ فراغات الأجساد = قالبُ 252 بعد توحيد الفراغات نفسِه (الأيقونةُ ذاتُها بكسلاً — البوابةُ البصرية تثبتها)
       · الصفحاتُ المولَّدة: الصفحةُ بعد توحيد فراغات <svg> = صفحةُ 252 بعد التوحيد نفسِه
       · 280: نزعُ كتلة KIVO_253 · 002/056: الإصدار · pages.json: نزعُ routeNames.help
   (ج) المشتقّات (20) = مصادرها · الفهرسُ متّسق (icons.py check) · الخادم = ضمُّ الأجزاء · لا catch فارغاً
   (د) الحزمة pk253 = pk252 الخاصة عدا الإصدار و_worker.js وindex.html والصفحات الـ11 ذاتِ الأيقونات و255-page-manifest · بناءٌ حتمي
       python3 tests/source/k253src.py [pk253]        (KIVO_PREV_TAG يبدّل الوسمَ المرجعي عند الحاجة)"""
import os, sys, hashlib, subprocess, tempfile, json, re, glob
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'tools')); import icons as ICONS
DIR = os.path.abspath(os.path.join(ROOT, sys.argv[1] if len(sys.argv) > 1 else 'pk253'))
PREV_PK = os.environ.get('KIVO_PREV_PK', os.path.join(ROOT, 'pk252') if os.path.exists(os.path.join(ROOT, 'pk252.build.json')) else os.path.join(os.path.dirname(ROOT), 'h', 'pk252'))
TAG = os.environ.get('KIVO_PREV_TAG', 'KIVO_252')
P, F = [0], [0]
def ok(c, n, x=''):
    (P if c else F)[0] += 1
    print(('  ✔ ' if c else '  ✘ ') + n + (('   ← ' + str(x)[:500]) if x else ''))
sha = lambda b: hashlib.sha256(b).hexdigest(); rb = lambda p: open(p, 'rb').read(); rd = lambda p: open(p, encoding='utf-8', newline='').read()
git = lambda *a: subprocess.run(['git'] + list(a), capture_output=True, text=True, cwd=ROOT).stdout
gitb = lambda *a: subprocess.run(['git'] + list(a), capture_output=True, cwd=ROOT).stdout
tmp = tempfile.mkdtemp(prefix='k253src_')
print('╔═ (أ) الشجرةُ = ' + TAG + ' عدا الملفات المعلنة ═╗')
CODE_DIRS = ('src/', 'workers/', 'public/', 'migrations/', 'config/', 'build/', 'tools/')
prev = {l.split('\t')[1]: l.split()[2] for l in git('ls-tree', '-r', TAG).split('\n') if l and l.split('\t')[1].startswith(CODE_DIRS)}
ok(bool(prev), '   الوسمُ المرجعي ' + TAG + ' موجود (' + str(len(prev)) + ' ملفَّ كود)')
def blob(path): return subprocess.run(['git', 'hash-object', path], capture_output=True, text=True, cwd=ROOT).stdout.strip()
cur = {q: blob(os.path.join(ROOT, q)) for q in git('ls-files', '--', *[d.rstrip('/') for d in CODE_DIRS]).split('\n') if q}
untracked = [q for q in git('ls-files', '--others', '--exclude-standard', '--', *[d.rstrip('/') for d in CODE_DIRS]).split('\n') if q]
diff = sorted(k for k in set(prev) | set(cur) if prev.get(k) != cur.get(k))
VIEWS = sorted('src/modules/%s/view.html' % m for m in ['admin', 'award', 'daily', 'dreport', 'dstats', 'employees', 'irshad', 'kpis', 'plan', 'planning', 'profile', 'seized', 'staff', 'tasks'])
PAGES = sorted('src/pages/' + p + '.dc.html' for p in ['Award', 'Daily Report', 'Daily Sessions', 'Daily Stats', 'Employees', 'Irshad', 'Operational Plan', 'Profile', 'Seized', 'Staffing', 'Tasks'])
CODE = sorted(['src/core/270-bs-ver.js', 'workers/_worker.js', 'workers/parts/002-seclog.js', 'workers/parts/056-enforce.js', 'workers/parts/054-image-contract.js', 'workers/parts/055-sec-headers.js', 'workers/parts/063-enf-api-and-handler.js',
               'src/manifests/pages.json', 'src/manifests/255-page-manifest.js', 'src/api/280-server-storage.js', 'src/layouts/index.template.html', 'src/styles/tokens/tokens.json', 'src/schemas/tokens.schema.json',
               'build/build.py', 'tools/page_modules.py'] + VIEWS + PAGES)
NEW_OK = ('tools/icons.py', 'src/assets/icons/catalog.json')
diff = [k for k in diff if k not in NEW_OK]; untracked = [k for k in untracked if k not in NEW_OK]
ok(diff == CODE and not untracked, '★ ملفاتُ الكود المتغيّرة عن ' + TAG + ' (على القرص) = الـ' + str(len(CODE)) + ' المعلنة فقط · لا ملفَّ كودٍ جديداً (عدا tools/icons.py وassets/icons/catalog.json)',
   json.dumps({'extra': [k for k in diff if k not in CODE], 'missing': [k for k in CODE if k not in diff], 'untracked': untracked}, ensure_ascii=False))
ok(all(k in cur for k in NEW_OK), '   الملفّان الجديدان متتبَّعان', NEW_OK)
ok(rd(ROOT + '/src/core/270-bs-ver.js') == 'window.__BS_VER = "2026.10.10-253";', '   الإصدار 2026.10.10-253')

print('\n╔═ (ب) عكسُ التحويلات المعلنة يعيد ملفاتِ ' + TAG + ' حرفاً ═╗')
CAT = ICONS.load(ROOT + '/src')
def normsvg(s):
    def rep(m):
        a, b = m.group(1), m.group(2)
        return '<svg' + a.rstrip() + '>' + ICONS.norm(b) + '</svg>' if b.strip() else m.group(0)
    return re.sub(r'<svg\b([^>]*)>(.*?)</svg>', rep, s, flags=re.S)
CSP_OLD_LINE = "  if (isHtml) h['Content-Security-Policy'] = \"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'; worker-src 'self' blob:\";"
OFF = re.compile(r"\n  /\* ── KIVO_253 \(SOT-157 · حالةُ «بلا اتصال»\).*?\n  \}\)\(\);\n", re.S)
def revert(name, t):
    if name == 'workers/parts/002-seclog.js': t = re.sub(r"/\* KIVO_253 · AUD-005 خطوة ٢: nonce[^\n]*\n", '', t.replace("var WORKER_VER = '2026.10.10-153';", "var WORKER_VER = '2026.10.10-152';", 1)); t = re.sub(r"function nonceNew\(\) \{[^\n]*\n", '', t)
    if name == 'workers/parts/056-enforce.js': t = t.replace("var ENF_VER = 'KIVO_253 · enforce 2", "var ENF_VER = 'KIVO_252 · enforce 2", 1)
    if name == 'src/api/280-server-storage.js': t = OFF.sub('', t)
    if name == 'src/manifests/pages.json': t = t.replace('  "links": "مواقع ذات صلة",\n  "help": "المساعدة",\n', '  "links": "مواقع ذات صلة",\n', 1)
    if name == 'src/manifests/255-page-manifest.js': t = t.replace('"links":"مواقع ذات صلة","help":"المساعدة",', '"links":"مواقع ذات صلة",', 1)
    if name == 'workers/parts/054-image-contract.js':
        t = t.replace("function inject(html, boot, nonce) {", "function inject(html, boot) {", 1)
        t = re.sub(r"  /\* KIVO_253 · AUD-005: السكربتُ المحقون[^\n]*\n  html = html\.replace\(/<meta http-equiv[^\n]*\n", '', t)
        t = t.replace("  return html.replace('<!--BS_BOOT-->', '<script' + (nonce ? ' nonce=\"' + nonce + '\"' : '') + '>window.__BS_BOOT=' + js + ';</script>\\n<!--BS_BOOT-->');", "  return html.replace('<!--BS_BOOT-->', '<script>window.__BS_BOOT=' + js + ';</script>\\n<!--BS_BOOT-->');", 1)
        # AUD-035 (ب): حارسُ البصمة القديمة في mergeUsers + التوقيع + الاستدعاء
        t = t.replace("function mergeUsers(incomingJson, currentList, actorUid, rid) {", "function mergeUsers(incomingJson, currentList) {", 1).replace("  var byId = {}, stale = 0;\n", "  var byId = {};\n", 1)
        t = re.sub(r"    /\* KIVO_253 · AUD-035 \(ب\): بصمةٌ قديمة p1\$.*?return c2; \}\n", '', t, flags=re.S)
        t = t.replace("  if (stale) logEv('warn', 'users-stale-ph', { rid: rid, n: stale });\n", '', 1).replace("      var m = mergeUsers(v, curUsers, A.u.id, env.__rid);\n", "      var m = mergeUsers(v, curUsers);\n", 1)
    if name == 'workers/parts/055-sec-headers.js':
        t = re.sub(r"/\* KIVO_253 · AUD-005 خطوة ٢ \(SOT-048\).*?\nfunction cspMeta\(nonce\)[^\n]*\n", '', t, flags=re.S)
        t = t.replace("function secHeaders(url, isHtml, nonce) {", "function secHeaders(url, isHtml) {", 1).replace("  if (isHtml) h['Content-Security-Policy'] = cspHeader(nonce);", CSP_OLD_LINE, 1)
        t = t.replace("function withSec(res, url, rid, nonce) {", "function withSec(res, url, rid) {", 1).replace("add = secHeaders(url, isHtml, nonce);", "add = secHeaders(url, isHtml);", 1)
    if name == 'workers/parts/063-enf-api-and-handler.js':
        t = re.sub(r"    var nonce = nonceNew\(\);[^\n]*\n", '', t).replace("env = Object.assign({}, env, { __rid: rid, __nonce: nonce });", "env = Object.assign({}, env, { __rid: rid });", 1)
        t = t.replace(", url0, rid, nonce); }", ", url0, rid); }", 1).replace(", 413), url0, rid, nonce);", ", 413), url0, rid);", 1).replace("return withSec(res0, url0, rid, nonce);", "return withSec(res0, url0, rid);", 1)
        t = re.sub(r"            /\* KIVO_253 · AUD-035 \(ب\): الترقيةُ كتابةٌ كغيرها.*?\n            st2\.push\(env\.DB\.prepare\('INSERT INTO revs \(k, rev\) VALUES \(\?1, \?2\) ON CONFLICT\(k\) DO UPDATE SET rev = \?2'\)\.bind\(K_USERS, rv2\)\);\n", '', t, flags=re.S)
        t = re.sub(r"    var nonceH = env\.__nonce \|\| '';[^\n]*\n", '', t).replace("inject(await res.text(), boot, nonceH)", "inject(await res.text(), boot)", 1)
        t = re.sub(r"    return new HTMLRewriter\(\)\.on\('meta\[http-equiv=\"Content-Security-Policy\"\]', \{\n      element: function \(el\) \{ el\.setAttribute\('content', cspMeta\(nonceH\)\); \}\n    \}\)\.onDocument\(\{\n", "    return new HTMLRewriter().onDocument({\n", t)
        t = t.replace("c.replace('<script' + (nonceH ? ' nonce=\"' + nonceH + '\"' : '') + '>window.__BS_BOOT=' + bootJs + ';</script>\\n<!--BS_BOOT-->', { html: true });", "c.replace('<script>window.__BS_BOOT=' + bootJs + ';</script>\\n<!--BS_BOOT-->', { html: true });", 1)
    if name == 'src/styles/tokens/tokens.json':
        j = json.loads(t); j.pop('breakpoints', None); t = json.dumps(j, ensure_ascii=False, indent=1) + ('\n' if t.endswith('\n') else '')
    if name == 'src/schemas/tokens.schema.json':
        j = json.loads(t); j['properties'].pop('breakpoints', None); t = json.dumps(j, ensure_ascii=False, indent=1) + '\n'
    if name in VIEWS:   # AUD-020: تسمياتُ الإتاحة المضافة (aria-label على الأزرار الأيقونية · alt على الصور) تُنزع — لم يكن في القوالب aria-label قطّ، وalt الأصلية (admin 7 · award 3) تبقى
        t = re.sub(r'(<button\b[^>]*) aria-label="(?:إغلاق|حذف|إضافة صنف|تعديل|الصفحة الأولى|الصفحة السابقة|الصفحة التالية|الصفحة الأخيرة|إزالة الصورة)"', r'\1', t)
        t = re.sub(r'(<img\b[^>]*) alt="(?:خريطة الموقع|خريطة الموقع — الوضع الليلي|صورة مرفقة|صورة مصغّرة للمهمة|صورة الملف الشخصي|صورة المضبوطات|صورة المهمة|صورة إثبات الإنجاز)"', r'\1', t)
    if name in VIEWS or name == 'src/layouts/index.template.html': t = normsvg(ICONS.materialize_text(t, CAT, name))
    return t
allok = True; n_t = 0
for p in CODE:
    if p in ('src/core/270-bs-ver.js', 'workers/_worker.js', 'build/build.py', 'tools/page_modules.py'): continue
    r = revert(p, rd(ROOT + '/' + p)); o = gitb('show', TAG + ':' + p).decode('utf-8')
    if p in VIEWS or p in PAGES or p == 'src/layouts/index.template.html': o = normsvg(o); r = normsvg(r) if p in PAGES else r
    if p in PAGES: r = re.sub(r'(<button\b[^>]*) aria-label="(?:إغلاق|حذف|إضافة صنف|تعديل|الصفحة الأولى|الصفحة السابقة|الصفحة التالية|الصفحة الأخيرة|إزالة الصورة)"', r'\1', r); r = re.sub(r'(<img\b[^>]*) alt="(?:خريطة الموقع|خريطة الموقع — الوضع الليلي|صورة مرفقة|صورة مصغّرة للمهمة|صورة الملف الشخصي|صورة المضبوطات|صورة المهمة|صورة إثبات الإنجاز)"', r'\1', r)
    if p.endswith('.json'): r, o = json.dumps(json.loads(r), sort_keys=True, ensure_ascii=False), json.dumps(json.loads(o), sort_keys=True, ensure_ascii=False)   # ملفاتُ JSON تُقارَن بنيةً (التنسيقُ ليس جزءاً من العقد)
    n_t += 1
    if r != o:
        allok = False; import difflib; d = [l for l in difflib.unified_diff(o.split('\n'), r.split('\n'), lineterm='', n=0) if l.startswith(('+', '-')) and not l.startswith(('+++', '---'))]
        print('     ✘ ' + p + ': ' + ' ‖ '.join(x[:110] for x in d[:4]))
ok(allok, '★ ' + str(n_t) + ' ملفاً: عكسُ التحويلات المعلنة (تركيبُ الأيقونات + توحيدُ فراغات svg · نزعُ تسميات الإتاحة · نزعُ كتلة «بلا اتصال» · الإصدار · routeNames.help) = ملفاتُ ' + TAG + ' حرفاً')
# خطّافا التركيب: الفرقُ في build.py وpage_modules.py محصورٌ في إضافة خطّاف AUD-018 (أسطرٌ مضافة قليلة · سطرٌ واحد معدَّل في page_modules)
for p, must, maxdel in (('build/build.py', ['def icons_cat():', "_ic.materialize_text(t, cat, L('shell'))", 'def strip_logic(raw)', "return b['openTag'] + LOGIC_STUB + b['closeTag'] + tail"], 3), ('tools/page_modules.py', ['icons.materialize_text(view, ICONS,'], 1)):
    o = gitb('show', TAG + ':' + p).decode('utf-8').split('\n'); r = rd(ROOT + '/' + p).split('\n')
    import difflib; d = [l for l in difflib.unified_diff(o, r, lineterm='', n=0) if l.startswith(('+', '-')) and not l.startswith(('+++', '---'))]
    add = [l for l in d if l.startswith('+')]; dele = [l for l in d if l.startswith('-')]
    ok(all(m in rd(ROOT + '/' + p) for m in must) and len(add) <= 20 and len(dele) <= maxdel and any('AUD-018' in l for l in add) and all(('strip_logic' in l or 'PAGE_SCRIPT_TAG' in l or 'KIVO_253' in l or 'icon' in l.lower() or 'AUD-018' in l or 'AUD-024' in l or 'data-props' in l or 'view' in l or '_s.path' in l or '_ic' in l or 'cat' in l or 'return json.load' in l or 'p = os.path.join(SRC' in l or 'LOGIC_STUB' in l or 'updateJs' in l) for l in add), '   ' + p + ': خطّافا التركيب (AUD-018) وتفريغِ نصّ المنطق المُصرَّف (AUD-024) فقط (' + str(len(add)) + ' سطراً مضافاً · ' + str(len(dele)) + ' محذوفاً)', ' ‖ '.join(x[:80] for x in d[:3]))
# القوالبُ بعد التركيب تُطابق ما يصل المتصفح: الصفحاتُ المولَّدة تحمل الأجسادَ المضمَّنة لا الإشارات
ok(all('data-i="' not in rd(ROOT + '/' + p) for p in PAGES) and all('<use ' not in rd(ROOT + '/' + p) for p in PAGES), '   الصفحاتُ المولَّدة بلا data-i ولا <use> (الأيقوناتُ مضمَّنةٌ كما كانت)')
ok('data-i="' not in rd(DIR + '/index.html'), '   غلافُ الحزمة بلا data-i (رُكِّبت أيقوناتُه الـ' + str(sum(e['uses'].get('layouts/index.template.html', 0) for e in CAT['icons'].values())) + ')')
w = rd(ROOT + '/workers/_worker.js')
ok("script-src 'self' 'unsafe-inline'" not in w and "function cspHeader(nonce)" in w and "function cspMeta(nonce)" in w and 'nonceNew()' in w and w.count("'unsafe-eval'") == 0, "★ الخادم: لا 'unsafe-inline' في script-src ولا 'unsafe-eval' إطلاقاً · cspHeader/cspMeta/nonceNew موجودة")

# AUD-024: نصوصُ الصفحات في الحزمة بلا جسدِ منطق (السماتُ باقية) وملفاتُ المنطق تحمل الجسدَ الأصلي من src/pages حرفاً
import glob as _g
SCR = re.compile(r'(<script(?: type="text/x-dc")? data-dc-script[^>]*>)([\s\S]*?)(</script>)')
bj = json.load(open(DIR + '.build.json', encoding='utf-8')); own_files = [k for k in bj['files'] if k not in set(bj.get('retainedFiles', []))]
txts = [k for k in own_files if k.startswith('assets/pages/') and k.endswith('.dc.txt')]; logics = {re.sub(r'\.logic\.[0-9a-f]{10}\.js$', '', k.split('/')[-1]): k for k in own_files if '.logic.' in k}
sm = []
for k in txts:
    t = rd(DIR + '/' + k); m = SCR.search(t); name = re.sub(r'\.[0-9a-f]{10}\.dc\.txt$', '', k.split('/')[-1])
    src = rd(ROOT + '/src/pages/' + name.replace('-', ' ') + '.dc.html'); ms = SCR.search(src)
    lj = rd(DIR + '/' + logics[name]); inner = lj.split('= function (DCLogic, StreamableLogic, React) {\n', 1)[1].rsplit('\n;return (typeof Component!=="undefined"&&Component)||undefined;\n};\n', 1)[0]
    STUB = '/* KIVO · precompiled — logic in *.logic.js */'
    sm.append(bool(m) and m.group(2) == STUB and m.group(1) == (ms.group(1) if ms else None) and bool(ms) and inner == ms.group(2) and SCR.sub(lambda x: x.group(1) + STUB + x.group(3), src) == t)
ok(len(txts) == 14 and all(sm), '★ AUD-024: 14 نصَّ صفحة بلا جسدِ منطق (علامةٌ قصيرة بدل النصّ · وسمُ <script> بسماته كما في المصدر) · كلُّ *.logic.js = جسدُ <script data-dc-script> الأصلي حرفاً · النصُّ = المصدرُ بعد التفريغ فقط', str(sum(sm)) + '/14')
sh = rd(DIR + '/index.html'); mh = SCR.search(sh)
ok(bool(mh) and mh.group(2) == '/* KIVO · precompiled — logic in *.logic.js */' and re.search(r'<script src="/assets/js/root-logic\.[0-9a-f]{10}\.js"></script>', sh) is not None, '   الغلاف: جسدُ x-dc علامةٌ قصيرة ومنطقُ الجذر في root-logic.js وحده')
print('\n╔═ (ج) المشتقّاتُ والفهرسُ والخادم ═╗')
rg = subprocess.run([sys.executable, ROOT + '/tools/generate.py', '--src', ROOT + '/src', '--check'], capture_output=True, text=True)
ok(rg.returncode == 0 and 'all 20' in rg.stdout, '★ 20 مشتقاً = مصادرها بايتاً')
ri = subprocess.run([sys.executable, ROOT + '/tools/icons.py', 'check', '--src', ROOT + '/src'], capture_output=True, text=True)
ok(ri.returncode == 0, '★ الفهرس: القوالبُ بلا <svg> مضمَّن · كلُّ إشارةٍ في الفهرس · بلا يتيم · docs/icons.html محدَّث', ri.stdout.strip().splitlines()[-1][:160])
ok(len(CAT['icons']) >= 300 and sum(sum(e['uses'].values()) for e in CAT['icons'].values()) >= 1200, '   ' + str(len(CAT['icons'])) + ' أيقونةً في ' + str(sum(sum(e['uses'].values()) for e in CAT['icons'].values())) + ' موضعاً')
ok(w == ''.join(rd(ROOT + '/workers/parts/' + p['file']) for p in json.load(open(ROOT + '/workers/parts.json', encoding='utf-8'))['parts']), '   الخادم = ضمُّ الأجزاء (65)')
ok(not re.search(r'catch \(\w*\) \{\s*\}', w), '   لا catch فارغاً')

print('\n╔═ (د) الحزمة ═╗')
def own(d):
    bj = json.load(open(d + '.build.json', encoding='utf-8')); ret = set(bj.get('retainedFiles', [])); return {k: v['sha256'] for k, v in bj['files'].items() if k not in ret}
stem = lambda f: re.sub(r'\.[0-9a-f]{10}\.(js|css|dc\.txt)$', r'.\1', f)
if os.path.exists(PREV_PK + '.build.json'):
    O0, O1 = own(PREV_PK), own(DIR); S0 = {stem(k): k for k in O0}; S1 = {stem(k): k for k in O1}
    changed = sorted(s for s in S0 if s in S1 and O0[S0[s]] != O1[S1[s]])
    EXP = sorted(['_worker.js', 'assets/js/270-bs-ver.js', 'index.html', 'assets/js/030-pages-loader.js', 'assets/js/255-page-manifest.js', 'assets/js/280-server-storage.js'] + ['assets/pages/' + p.replace(' ', '-') + '.dc.txt' for p in ['Admin', 'Award', 'Daily Report', 'Daily Sessions', 'Daily Stats', 'Employees', 'Irshad', 'KPIs', 'Operational Plan', 'Planning', 'Profile', 'Seized', 'Staffing', 'Tasks']])
    ok(sorted(S0) == sorted(S1) and changed == EXP, '★ أصولُ 253 الخاصة = أصولُ 252 عدا الإصدار و_worker.js وindex.html و030 (مراجعُ الصفحات) و255/280 ونصوصِ الصفحات الـ14 (الأيقونات + تفريغُ نصّ المنطق المُصرَّف) — ملفاتُ المنطق *.logic.js والأصولُ الأخرى كما هي', json.dumps({'changed': changed, 'expected': EXP}, ensure_ascii=False) if changed != EXP else str(len(changed)) + ' ملفاً')
else: print('   (pk252 غيرُ متاح هنا — المقارنةُ بالحزمة السابقة تُجرى في مجلد العمل الرئيس)')
def retain_path(r): return os.path.join(ROOT, r) if os.path.exists(os.path.join(ROOT, r)) else os.path.join(os.path.dirname(PREV_PK), r)
r2 = subprocess.run([sys.executable, ROOT + '/build/build.py', '--src', ROOT + '/src', '--mode', 'split', '--pages', 'lazy', '--out', tmp + '/dist2'] + sum([['--retain', retain_path(r)] for r in json.load(open(DIR + '.build.json'))['retained']], []), capture_output=True, text=True)
def walk(d):
    out = {}
    for base, dirs, files in os.walk(d):
        for f in files: p = os.path.join(base, f); out[os.path.relpath(p, d)] = sha(rb(p))
    return out
ok(r2.returncode == 0 and walk(tmp + '/dist2') == walk(DIR), '★ إعادةُ البناء حتمية (' + str(len(walk(DIR))) + ' ملفاً)', (r2.stdout or r2.stderr).strip()[-120:])
rc = subprocess.run([sys.executable, ROOT + '/scripts/empty_catch_ratchet.py', ROOT + '/src'], capture_output=True, text=True); ok(rc.returncode == 0, '★ سقّاطةُ catch الفارغ', (rc.stdout or rc.stderr).strip().splitlines()[0][:120])
print('\n══ النتيجة: نجح %d | أخفق %d ══' % (P[0], F[0]))
sys.exit(1 if F[0] else 0)
