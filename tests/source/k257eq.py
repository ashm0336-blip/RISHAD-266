# -*- coding: utf-8 -*-
# KIVO_257: نسخةٌ من k256eq.py (الافتراضيُّ pk257) — والإفصاح (عُدّة): عدُّ السكربتات الخارجية 60 → 68 (AUD-010: 330 → 6 أجزاء · 440 → 3 · AUD-012: 565-page-kit) و61 → 69 وسماً — لا تغييرَ آخر في الفحص
"""KIVO_253 (إفصاح — تكييفُ العُدّة لتصميم المنطق المُصرَّف مسبقاً، لا إضعاف): ① سكربتٌ خارجيٌّ تاسعٌ وخمسون (root-logic — منطقُ الغلاف المُصرَّف)
     فالعدُّ 59 خارجياً و60 وسماً · ② محمِّلُ الصفحات الكسول يحمل سطراً إضافياً window.__dcLogic (خريطةُ ملفات المنطق) ويُعاد في التركيب محمِّلَ
     المونوليث + التعريفاتِ المضمَّنة (من ملفات المنطق نفسها) · ③ ملفاتُ /assets/pages نوعان: <name>.<h>.dc.txt و<name>.logic.<h>.js.
   KIVO_243 (مشتقٌّ من k242eq.py — إفصاح: تغييران فقط، كلاهما في العُدّة لا في الحكم:
     ① مصدرُ الكتل src/ (الشجرةُ المستهدفة — KIVO_253) بدل k242/src (والملفّان المقروءان منه blocks.json و030-pages-loader*.js = KIVO_242 بايتاً — k243src.py (ب))
     ② عدُّ الأصناف على أصول الإصدار الحالي: نافذةُ الإصدارين تُبقي أصولَ KIVO_242 القديمة للملفات المتغيّرة (6)، فتُستثنى من العدّ
        بعد إثبات أنها = أصولُ KIVO_242 المسلَّمة بايتاً، وأن عددَها = عددُ الأصول الجديدة، وأن الإصدارَ الحاليّ لا يشير إليها — الأعدادُ المتوقعة نفسُها)
   KIVO_242 · G2 — تكافؤُ التنفيذ ساكناً (Python · بلا خادم)
   ★ إعادةُ التركيب: من dist/ وحده — كلُّ <script src> يعود كتلتَه، وكلُّ <link stylesheet> يعود <style>، وكلُّ عنوان صورةٍ أو خطّ
     يعود data: نفسَه، وروابطُ preload للخطوط (إضافةُ البنية المقسَّمة وحدها) تُحذف — فيخرج النصُّ الكامل = pk203.mono/index.html بايتاً ببايت.
     أي: ما يُنفَّذ في المتصفح هو الكودُ نفسُه بالترتيب نفسِه، والفحوصُ الساكنة في البوابة (على النصّ الكامل) تفحص ما يُسلَّم.
   البصمات: اسمُ كلّ أصلٍ = sha256(محتواه)[:10] · كلُّ مرجعٍ موجود · لا أصلَ يتيماً · السكربتاتُ كلاسيكيةٌ حاجبة (لا async/defer/module)
   الغلاف: <!--BS_BOOT--> مرةً واحدة قبل طبقة التخزين · منطقُ x-dc الجذر وأنماطُه مضمّنة · لا بيانات ولا data: كبيرة في الغلاف"""
import sys, os, re, json, base64, hashlib, urllib.parse, zlib

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DIR = os.path.abspath(os.path.join(ROOT, sys.argv[1] if len(sys.argv) > 1 else "pk257"))
npass = nfail = 0


def ok(c, n, x=''):
    global npass, nfail
    if c: npass += 1
    else: nfail += 1
    print(('  ✔ ' if c else '  ✘ ') + n + (('   ← ' + str(x)[:400]) if x != '' else ''))
    return bool(c)


def rdb(rel): return open(os.path.join(DIR, rel), 'rb').read()
def sha(b): return hashlib.sha256(b).hexdigest()


shell = rdb('index.html').decode('utf-8')
mono = open(DIR + '.mono/index.html', 'rb').read()
files = {}
for r, _, fs in os.walk(os.path.join(DIR, 'assets')):
    for f in fs: p = os.path.join(r, f); files['/' + os.path.relpath(p, DIR)] = open(p, 'rb').read()
# KIVO_257 (إفصاح — عُدّة): build.json المونوليث يكتبه k253cache (G6) لا البناء؛ فإن غاب يُقرأ وضعُ الصفحات من build.json الحزمة نفسِها (يكتبه البناء) بدل افتراض «bundled»
info = json.load(open(DIR + '.mono/build.json', encoding='utf-8')) if os.path.exists(DIR + '.mono/build.json') else (json.load(open(DIR + '.build.json', encoding='utf-8')) if os.path.exists(DIR + '.build.json') else {'pages': 'bundled'})

print('╔═ البصماتُ والمراجع ═╗')
bad = [u for u, b in files.items() if not re.fullmatch(r'/assets/(js|css|fonts|img|pages)/[A-Za-z0-9_.-]+\.([0-9a-f]{10})\.[a-z0-9.]+', u) or re.search(r'\.([0-9a-f]{10})\.[a-z0-9.]+$', u).group(1) != sha(b)[:10]]
ok(not bad and len(files) > 60, '★ اسمُ كلّ أصلٍ = sha256(محتواه)[:10] — ' + str(len(files)) + ' أصلاً', bad[:3])
# KIVO_244 (إفصاح — تعميمُ فحص النافذة لا إضعافُه): كان الفحصُ مكتوباً لمرشَّحٍ يلي KIVO_242 مباشرةً (المُبقى = أصولُ KIVO_242 وحدها).
# مع تتابع الإصدارات تنزلق النافذةُ (ADR في build.py: إصداران سابقان بالإحالة) — فالفحصُ الآن: غيرُ المشار إليه من الإصدار الحالي
# = retainedFiles المعلنة في <dist>.build.json بالضبط، وكلُّ واحدٍ منها = ملفُّ إصداره المُبقى بايتاً، وكلُّ ما سواه مشارٌ إليه من الغلاف.
bjw = json.load(open(DIR + '.build.json', encoding='utf-8')) if os.path.exists(DIR + '.build.json') else {'retained': [], 'retainedFiles': []}
RETD = {os.path.basename(r): os.path.join(os.path.dirname(DIR.rstrip('/')), r) for r in bjw.get('retained', [])}
_JS0 = re.findall(r'<script[^>]* src="(/assets/js/[^"]+)"></script>', shell); _CSS0 = re.findall(r'<link rel="stylesheet"[^>]* href="(/assets/css/[^"]+)">', shell)
cur = set(_JS0) | set(_CSS0) | set(re.findall(r'(/assets/(?:img|fonts|pages)/[A-Za-z0-9_.-]+)', shell))
for u in list(cur):
    if u in files and (u.endswith('.css') or u.endswith('.js')): cur |= set(re.findall(r'(/assets/(?:img|fonts|pages)/[A-Za-z0-9_.-]+)', files[u].decode('utf-8')))
cur |= set(i['src'] for i in json.loads(rdb('manifest.webmanifest').decode('utf-8')).get('icons', []))
oldonly = sorted(u for u in files if u not in cur)
retained = sorted('/' + p for p in bjw.get('retainedFiles', []))
def _from_prev(u):
    for d in RETD.values():
        q = os.path.join(d, u.lstrip('/'))
        if os.path.exists(q) and open(q, 'rb').read() == files[u]: return True
    return False
ok(oldonly == retained and all(_from_prev(u) for u in retained) and all(u in cur for u in files if u not in retained),
   '★ نافذةُ الإصدارين: غيرُ المشار إليه من الإصدار الحالي (' + str(len(oldonly)) + ') = الأصولُ المُبقاة المعلنة من ' + ('·'.join(sorted(RETD)) or '—') + ' بايتاً، وكلُّ ما سواه مشارٌ إليه من الغلاف', json.dumps({'old': oldonly[:6], 'retained': retained[:6]}))
kinds = {}
for u in files:
    if u in retained: continue   # أصولُ الإصدارات السابقة المُبقاة (أُثبتت أعلاه) لا تُعدّ في أصناف الإصدار الحالي
    kinds[u.split('/')[2]] = kinds.get(u.split('/')[2], 0) + 1
ok(kinds.get('js') == 68 and kinds.get('css') == 10 and kinds.get('fonts') == 6 and kinds.get('img') == 4 and (kinds.get('pages', 0) >= 14 if info.get('pages') == 'lazy' else 'pages' not in kinds), '   الأصناف: ' + json.dumps(kinds, ensure_ascii=False), '')
JS = re.findall(r'<script([^>]*) src="(/assets/js/[^"]+)"></script>', shell)
CSS = re.findall(r'<link rel="stylesheet"([^>]*) href="(/assets/css/[^"]+)">', shell)
tags = re.findall(r'<script\b[^>]*>', shell)
ok(len(JS) == 68 and all(not re.search(r'\b(async|defer|type=|nomodule)\b', a) for a, _ in JS), '★ ٦٨ سكربتاً خارجياً كلاسيكياً حاجباً بترتيبها (٦٦ + منطقُ الغلاف المُصرَّف + manifest الصفحات · لا async/defer/module) — التنفيذُ بالتسلسل نفسِه كالمضمَّن', len(JS))
ok(len(tags) == 69 and tags.count('<script type="text/x-dc" data-dc-script="">') == 1, '   في الغلاف ٦٩ وسمَ script: ٦٨ خارجياً + منطقُ x-dc الجذر مضمَّناً (نصاً؛ تنفيذُه من root-logic المُصرَّف)', len(tags))
refs = set(u for _, u in JS) | set(u for _, u in CSS) | set(re.findall(r'(/assets/(?:img|fonts|pages)/[A-Za-z0-9_.-]+)', shell))
for u in list(files):
    if u.endswith('.css') or u.endswith('.js'): refs |= set(re.findall(r'(/assets/(?:img|fonts|pages)/[A-Za-z0-9_.-]+)', files[u].decode('utf-8')))
man = json.loads(rdb('manifest.webmanifest').decode('utf-8'))
refs |= set(i['src'] for i in man.get('icons', []))
missing = sorted(u for u in refs if u not in files)
orphan = sorted(u for u in files if u not in refs and not u.startswith('/assets/pages/'))
ok(not missing, '★ كلُّ مرجعٍ في الغلاف والأنماط والسكربتات والبيان موجودٌ في dist/', missing[:3])
ok(not orphan or info.get('retainPaths'), '   لا أصلَ يتيماً (كلُّ ملفٍّ في assets مُشارٌ إليه) — الإصداراتُ السابقة وحدها مستثناة', orphan[:3])

PRE = re.findall(r'<link rel="preload" href="(/assets/(?:js|css)/[^"]+)" as="(script|style)"(?: fetchpriority="low")?>', shell)
LOWP = re.findall(r'<link rel="preload" href="(/assets/js/[^"]+)" as="script" fetchpriority="low">', shell)
tagpos = [(m.start(), m.group(1)) for m in re.finditer(r'<script[^>]* src="(/assets/js/[^"]+)"></script>', shell)] + \
         [(m.start(), m.group(1)) for m in re.finditer(r'<link rel="stylesheet"[^>]* href="(/assets/css/[^"]+)">', shell) if m.start() < shell.find('<x-dc')]
want = [u for _, u in sorted(tagpos)]
ok([u for u, _ in PRE] == want and all((a == 'script') == ('/js/' in u) for u, a in PRE) and shell.find('<link rel="preload" href="/assets/') > shell.find('http-equiv="Content-Security-Policy"'),
   '★ preload لكل سكربتٍ (' + str(len(JS)) + ') وورقةٍ قبل x-dc بترتيب التنفيذ، بعد وسم CSP — وسمُ CSP يوقف ماسحَ التحميل المسبق في كروم، فبدونها يُطلب كلٌّ حين يبلغه المحلّل', len(PRE))

META = json.load(open(os.path.join(ROOT, 'src/blocks.json'), encoding='utf-8'))   # KIVO_253: الشجرةُ المستهدفة (ADR-012)
if META.get('gateBlock'):
    # المرحلة ٢: كتلةُ البوابة المعلنة تبني شاشةَ الدخول فعلاً · السكربتاتُ بعدها بالضبط بأولويةٍ منخفضة · وما قبلها (ومنها البوابة) بالأولوية العادية
    gsrc = open(os.path.join(ROOT, 'src', META['gateBlock']), encoding='utf-8').read()
    gurl = [u for _, u in JS if os.path.basename(u).startswith(os.path.basename(META['gateBlock'])[:-3] + '.')]
    jsu = [u for _, u in JS]; gi = jsu.index(gurl[0]) if len(gurl) == 1 else -1
    ok(gi > 0 and 'function gate(){' in gsrc and 'bsLoginGate' in gsrc,
       '   كتلةُ البوابة المعلنة (' + META['gateBlock'].split('/')[-1] + ') تبني شاشةَ الدخول (gate · bsLoginGate)', gi)
    ok(gi > 0 and LOWP == jsu[gi + 1:],
       '★ preload بأولويةٍ منخفضة للسكربتات بعد البوابة وحدها (' + str(len(LOWP)) + ' من ' + str(len(jsu)) + ') — ما قبلها بالأولوية العادية · التنفيذُ حاجبٌ بترتيبه كما هو', len(LOWP))

print('\n╔═ إعادةُ التركيب = النصُّ الكامل بايتاً ═╗')
DATA = {'.png': lambda b: 'data:image/png;base64,' + base64.b64encode(b).decode('ascii'),
        '.woff2': lambda b: 'data:font/woff2;base64,' + base64.b64encode(b).decode('ascii'),
        '.svg': lambda b: 'data:image/svg+xml,' + urllib.parse.quote(b.decode('utf-8'), safe='/')}


def as_data(text):
    return re.sub(r'/assets/(?:img|fonts)/[A-Za-z0-9_.-]+\.[0-9a-f]{10}(\.png|\.woff2|\.svg)', lambda m: DATA[m.group(1)](files[m.group(0)]), text)


SRC = os.path.join(ROOT, 'src')
LOADER_DIR = os.path.dirname([b['id'] for b in META['blocks'] if b['id'].endswith('-pages-loader.js')][0])   # KIVO_253: مجلدُ محمِّل الصفحات بحسب blocks.json


def lazy_back(body):
    """المرحلة ٢: محمِّلُ الصفحات الكسول يعود محمِّلَ الحزمة كما في البناء الأحادي — والملفُّ نفسُه يجب أن يكون بالضبط:
       الرأسُ + خريطةُ العناوين + window.__resourceBlobs = {} (من الأصل) + حارسُ الجلب (من src) — وfflate الذي كان لفكّ الحزمة وحده لا يُشحن."""
    m = re.match(r'\n(/\* ═══ KIVO_242 · المرحلة ٢[\s\S]*?\*/\n)window\.__resources = (\{[^\n]*\});\nwindow\.__dcLogic = (\{[^\n]*\});\n', body)
    if not m: return body
    mp = json.loads(m.group(2)); lmap = json.loads(m.group(3)); rest = body[m.end():]
    guard = open(os.path.join(SRC, LOADER_DIR, '030-pages-loader.lazy-guard.js'), encoding='utf-8').read()
    orig = open(os.path.join(SRC, LOADER_DIR, '030-pages-loader.js'), encoding='utf-8').read()
    a = '\nwindow.__resources = {};\n'; i0 = orig.index('\n(function () {\n  var pages = @@KIVO_PAGES@@;')
    keep = 'window.__resourceBlobs = {};\n'; mid = orig[len(a):i0]
    # الجزءُ الأوسط في الأصل = keep + fflate (سطرُ تعليق · المكتبة · سطرٌ فارغ) وحده؛ والكسولُ يُبقي keep ويُسقط fflate (كان لفكّ الحزمة وحده)
    LAZY_OK.append(rest == keep + '\n' + guard and mid.startswith(keep + '/* fflate') and mid.count('\n') == 3)
    pages = []
    for k, u in mp.items():
        name = urllib.parse.unquote(k[2:-len('.dc.html')])
        pages.append(json.dumps(name) + ':' + json.dumps(base64.b64encode(zlib.compress(files[u], 9)).decode('ascii')))
    # KIVO_253: المونوليث يُلحِق التعريفاتِ المضمَّنة بعد المحمِّل = محتوى ملفات المنطق نفسِها بترتيب الصفحات (blocks.json)
    order = json.load(open(os.path.join(SRC, 'blocks.json'), encoding='utf-8'))['pages']['order']
    LAZY_OK.append(sorted(lmap) == sorted(order) and all(lmap[n] in files for n in order))
    DEFS.append('\n' + ''.join(files[lmap[n]].decode('utf-8') for n in order))   # KIVO_253: التعريفاتُ المضمَّنة كتلةٌ مستقلة قبل </body> (لا بعد المحمِّل)
    return orig[:i0].replace('@@KIVO_PAGES@@', '') + orig[i0:].replace('@@KIVO_PAGES@@', '{' + ','.join(pages) + '}')


LAZY_OK = []
DEFS = []


def back(m):
    if m.group(1):
        return '<script' + m.group(2) + '>' + as_data(lazy_back(files[m.group(3)].decode('utf-8'))) + '</script>'
    return '<style' + m.group(5) + '>' + as_data(files[m.group(6)].decode('utf-8')) + '</style>'


rec = re.sub(r'<(script)([^>]*) src="(/assets/js/[^"]+)"></script>|<link rel="(stylesheet)"([^>]*) href="(/assets/css/[^"]+)">', back, shell)
rec = re.sub(r'<link rel="preload" href="/assets/fonts/[^"]+" as="font" type="font/woff2" crossorigin>', '', rec)
rec = re.sub(r'\n<link rel="preload" href="/assets/(?:js|css)/[^"]+" as="(?:script|style)"(?: fetchpriority="low")?>', '', rec)
if DEFS: rec = rec.replace('</body>', '<script>' + DEFS[0] + '</script>\n</body>')   # KIVO_253: كتلةُ التعريفات قبل </body> كما يضعها البناء في المونوليث
rec = as_data(rec).encode('utf-8')
ok(rec == mono, '★ إعادةُ تركيب dist/ = pk203.mono/index.html بايتاً ببايت (' + str(len(rec)) + ' B)', sha(rec)[:16] + ' / ' + sha(mono)[:16])
if info.get('pages') == 'lazy':
    pfiles = sorted(u for u in files if u.startswith('/assets/pages/'))
    ok(LAZY_OK == [True, True], '★ المرحلة ٢: محمِّلُ الصفحات = الرأس + خريطةُ ١٤ عنواناً + خريطةُ منطق ١٤ ملفاً (موجودةٌ كلُّها) + __resourceBlobs الفارغ + حارسُ الجلب — لا شيءَ غيرُها (fflate لا يُشحن)', LAZY_OK)
    ok(len(pfiles) >= 28 and all(re.fullmatch(r'/assets/pages/[A-Za-z-]+(\.logic)?\.[0-9a-f]{10}\.(dc\.txt|js)', u) for u in pfiles) and sum(1 for u in pfiles if '.logic.' in u) >= 14, '   ملفاتُ الصفحات في /assets/pages بأسماءٍ ذات بصمة: نصٌّ ومنطقٌ لكل صفحة (' + str(len(pfiles)) + ')')
    ok(os.path.exists(os.path.join(DIR, '404.html')) and '<script' not in rdb('404.html').decode('utf-8'), '★ 404.html في الجذر (بلا سكربت) — الملفُّ المفقود يُجاب 404 لا بالغلاف (تراجعُ SPA)')
if rec != mono:
    i = next((k for k in range(min(len(rec), len(mono))) if rec[k] != mono[k]), min(len(rec), len(mono)))
    print('     أولُ فرقٍ عند', i, repr(rec[max(0, i - 80):i + 80].decode('utf-8', 'replace')), '≠', repr(mono[max(0, i - 80):i + 80].decode('utf-8', 'replace')))

print('\n╔═ الغلاف ═╗')
ok(shell.count('<!--BS_BOOT-->') == 1 and shell.index('<!--BS_BOOT-->') < shell.index('<script src="/assets/js/280-server-storage.'), '★ <!--BS_BOOT--> مرةً واحدة وقبل طبقة التخزين (280-server-storage) — يُحقن __BS_BOOT في موضعه نفسِه')
x0, x1 = shell.find('<x-dc'), shell.find('</x-dc>')
ok(x0 > 0 and x1 > x0 and '<style' in shell[x0:x1] and shell.find('<script type="text/x-dc" data-dc-script="">') > x1, '   قالبُ x-dc مضمَّن (helmet بأنماطه العامة) ومنطقُه الجذر بعده مضمَّناً كما في KIVO_240')
big = re.findall(r'data:[a-z/+.-]+;base64,[A-Za-z0-9+/=]{2000,}', shell)
ok(not big and len(shell) < 230000, '   لا data: كبيرة في الغلاف (الخطوطُ والأيقوناتُ والبيانُ ملفاتٌ) · الغلاف ' + str(len(shell.encode('utf-8'))) + ' B', len(big))
ok('var pages' not in shell and 'window.__BS_BOOT=' not in shell, '   الغلافُ بلا صفحاتٍ مضمّنة وبلا __BS_BOOT ثابت (يُحقن من الخادم وقتَ الطلب)')
ok(re.search(r'<link rel="manifest" href="/manifest\.webmanifest">', shell) and man.get('name') == 'المنصة التشغيلية' and man.get('display') == 'standalone' and any(i.get('sizes') == '512x512' for i in man['icons']) and any(i.get('sizes') == '192x192' for i in man['icons']), '★ البيان: /manifest.webmanifest ملفٌّ من الأصل نفسه (لا data:) · الاسم · standalone · أيقونتا 192 و512 ملفّان')
print('\n══ النتيجة: نجح %d | أخفق %d ══' % (npass, nfail))
sys.exit(1 if nfail else 0)
