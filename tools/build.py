# -*- coding: utf-8 -*-
"""KIVO_242 — deterministic builder.

  monolith (single index.html, everything embedded — the KIVO_240 form):
      python3 tools/build.py --src src --mode monolith --out OUT/index.html
  split (deploy root for Cloudflare Pages: shell + content-hashed assets):
      python3 tools/build.py --src src --mode split --pages bundled|lazy --out dist [--retain PREV_DIST ...]

Same input → same bytes (no clocks, no random, sorted iteration).  Python's zlib (level 9) is used on purpose: it is the
compressor that produced KIVO_240's pages, so the monolith output can be compared with the frozen file byte for byte."""
import os, re, json, base64, zlib, hashlib, urllib.parse, shutil, argparse, subprocess

ap = argparse.ArgumentParser()
ap.add_argument('--src', required=True); ap.add_argument('--mode', choices=['monolith', 'split'], required=True)
ap.add_argument('--pages', choices=['bundled', 'lazy'], default='bundled'); ap.add_argument('--out', required=True)
ap.add_argument('--retain', action='append', default=[])
ap.add_argument('--minify-worker', action='store_true', help='Token-proved Worker minification preserving production-strip boundaries')
ap.add_argument('--verify', action='store_true', help='Read-only verification of a built manifest, file set, source Worker and token proof')
A = ap.parse_args()
SRC = A.src
sha = lambda b: hashlib.sha256(b).hexdigest()
def rdb(rel): return open(os.path.join(SRC, rel), 'rb').read()
def rd(rel): return rdb(rel).decode('utf-8')
# KIVO_251 · ADR-012: تخطيطُ المصدر من src/layout.json (الشجرةُ المستهدفة)؛ غيابُه = التخطيطُ الانتقالي القديم (k2NN/src) — فالبناءُ نفسُه يخدم الاثنين
LAYOUT = {'assets': {'fonts': 'client/fonts', 'img': 'client/img'}, 'pages': 'client/pages', 'shell': 'shell/index.template.html', 'rootLogic': 'shell/xdc/root-logic.js',
          'manifest': 'client/manifest/manifest.webmanifest.json', 'legacyManifest': 'client/manifest/legacy-inline.json', 'public': 'root', 'workerOut': 'root/_worker.js'}
if os.path.exists(os.path.join(SRC, 'layout.json')): LAYOUT.update(json.loads(rd('layout.json')))
def L(k): return LAYOUT[k]
if A.verify:
    # This verifies the artifact already present; it never rebuilds or rewrites it.
    with open(os.path.abspath(A.out).rstrip('/\\') + '.build.json', encoding='utf-8') as manifest_file:
        manifest = json.load(manifest_file)
    actual = {}
    for directory, _, names in os.walk(A.out):
        for name in names:
            target = os.path.join(directory, name)
            data = open(target, 'rb').read()
            rel = os.path.relpath(target, A.out).replace(os.sep, '/')
            actual[rel] = {'bytes': len(data), 'sha256': sha(data)}
    assert actual == manifest['files'], 'Build manifest does not match the exact artifact file set and bytes'
    assert manifest['retained'] == [os.path.basename(os.path.normpath(r)) for r in A.retain], 'Unexpected retained releases'
    assert manifest['mode'] == A.mode and manifest['pages'] == A.pages, 'Build mode differs from requested verification'
    source_worker = rdb(L('workerOut'))
    built_worker = open(os.path.join(A.out, '_worker.js'), 'rb').read()
    transform = manifest.get('workerTransform')
    if A.minify_worker:
        assert transform and transform['mode'] == 'tokens' and transform['proof'] == 'tokens-equal', 'Missing Worker transformation proof'
        assert transform['preservesTestToolMarkers'] is True, 'Worker marker preservation metadata is incorrect'
        assert transform['sourceSha256'] == sha(source_worker) and transform['sourceBytes'] == len(source_worker), 'Built Worker source differs from current generated source'
        assert transform['sha256'] == sha(built_worker) and transform['bytes'] == len(built_worker), 'Worker transformation output metadata differs'
        assert built_worker.count(b'@@KIVO_TEST_TOOL_BEGIN') == 1 and built_worker.count(b'@@KIVO_TEST_TOOL_END') == 1, 'Worker operator-tool boundaries missing'
        proof = subprocess.run(['node', os.path.join(os.path.dirname(__file__), 'jsmin_tokens.mjs'), '--same', os.path.join(SRC, L('workerOut')), os.path.join(A.out, '_worker.js')], capture_output=True, text=True, encoding='utf-8', timeout=120)
        assert proof.returncode == 0, 'Worker token-stream proof failed'
    else:
        assert built_worker == source_worker and not transform, 'Expected untransformed legacy Worker'
    print('verified', A.out, 'files', len(actual), 'retained', len(manifest['retained']), 'worker', 'tokens-equal' if A.minify_worker else 'source-bytes-equal')
    raise SystemExit(0)
META = json.loads(rd('blocks.json'))
PAGES_LOADER = [b['id'] for b in META['blocks'] if b['id'].endswith('-pages-loader.js')][0]   # حارسُ الجلب الكسول بجوار المحمِّل
BLK = {b['id']: b for b in META['blocks']}
MIME = {'.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/manifest+json'}
OUTFILES = {}                                     # dist-relative path → bytes  (split)
URL_OF = {}                                       # block id → hashed URL (split)

def asset_path(rel):
    d, f = rel.split('/', 1); return L('assets')[d] + '/' + f
def data_uri(rel):
    a = META['assets'].get(rel); b = rdb(asset_path(rel))
    if a and a['enc'] == 'urlquote-safe-slash': return a['prefix'] + urllib.parse.quote(b.decode('utf-8'), safe='/')
    prefix = a['prefix'] if a else 'data:' + MIME[os.path.splitext(rel)[1]] + ';base64,'
    return prefix + base64.b64encode(b).decode('ascii')
def hashed(dirname, stem, ext, data):
    h = sha(data)[:10]; path = 'assets/' + dirname + '/' + stem + '.' + h + ext
    if path in OUTFILES: assert OUTFILES[path] == data, path
    OUTFILES[path] = data; return '/' + path
def asset_url(rel):
    b = rdb(asset_path(rel)); d, f = rel.split('/', 1); stem, ext = os.path.splitext(f)
    return hashed({'img': 'img', 'fonts': 'fonts'}[d], stem, ext, b)
def resolve_assets(text, mode):
    # monolith: every asset back as the exact data: URI of KIVO_240 · split: content-hashed file URL (fonts too — print and map-image
    # export get their data:font rules from BassamCssText.fontData()/fontSheets(), see client/js/115-css-text.js)
    return re.sub(r'@@KIVO_ASSET:([^@]+)@@', lambda m: data_uri(m.group(1)) if mode == 'monolith' else asset_url(m.group(1)), text)
# KIVO_253 (AUD-024 · SOT-148): في الوضع المُصرَّف لا يُشحن نصُّ المنطق مرتين — جسدُ <script data-dc-script> في نصّ الصفحة وفي الغلاف يُفرَّغ
# (السماتُ data-props تبقى؛ dc-runtime يقرأ الجسدَ فقط حين لا منطقَ مُصرَّفاً، وهو مسارٌ ميت تحت CSP بلا unsafe-eval). الغلافُ −33 KB مضغوطاً وكلُّ صفحةٍ −منطقُها.
PAGE_SCRIPT_TAG = re.compile(r'(<script(?: type="text/x-dc")? data-dc-script[^>]*>)([\s\S]*?)(</script>)')
# الجسدُ لا يُفرَّغ تماماً: dc-runtime يستدعي updateJs فقط حين يكون نصُّ السكربت غيرَ فارغ (parsed.js) ثم يفضّل المنطقَ المُصرَّف — فيبقى تعليقٌ قصيرٌ علامةً
LOGIC_STUB = '/* KIVO · precompiled — logic in *.logic.js */'
def strip_logic(raw): return PAGE_SCRIPT_TAG.sub(lambda m: m.group(1) + LOGIC_STUB + m.group(3), raw) if PRECOMPILED else raw
def pages_json():
    out = []
    for name in META['pages']['order']:
        raw = strip_logic(rd(L('pages') + '/' + name + '.dc.html')).encode('utf-8')
        out.append(json.dumps(name) + ':' + json.dumps(base64.b64encode(zlib.compress(raw, 9)).decode('ascii')))
    return '{' + ','.join(out) + '}'
def page_url(name):
    raw = strip_logic(rd(L('pages') + '/' + name + '.dc.html')).encode('utf-8')
    return hashed('pages', name.replace(' ', '-'), '.dc.txt', raw)
# KIVO_246 (blocks.json: "dcLogic": "precompiled") — منطقُ كل صفحة (<script data-dc-script>) يُلَفّ في دالةٍ عادية تُقدَّم سكربتاً: في الوضع
# الكسول ملفٌّ ذو بصمة /assets/pages/<name>.logic.<hash>.js وخريطتُه window.__dcLogic في محمِّل الصفحات؛ وفي المونوليث/المضمَّن تُلحَق
# التعريفاتُ بعد محمِّل الصفحات. dc-runtime يفضّلها على new Function، فيستغني CSP عن 'unsafe-eval'. بلا العلامة: لا تغييرَ في الناتج.
PRECOMPILED = META.get('dcLogic') == 'precompiled'
PAGE_SCRIPT = re.compile(r'<script(?: type="text/x-dc")? data-dc-script[^>]*>([\s\S]*?)</script>')
def page_logic(name):
    m = PAGE_SCRIPT.search(rd(L('pages') + '/' + name + '.dc.html')); src = m.group(1) if m else ''
    return ('/* KIVO · ' + name + ' — منطقُ الصفحة مُصرَّفٌ عند البناء من ' + L('pages') + '/' + name + '.dc.html (<script data-dc-script>) */\n'
            '(window.__dcLogicDefs = window.__dcLogicDefs || {})[' + json.dumps(name, ensure_ascii=False) + '] = function (DCLogic, StreamableLogic, React) {\n'
            + src + '\n;return (typeof Component!=="undefined"&&Component)||undefined;\n};\n')
def logic_url(name): return hashed('pages', name.replace(' ', '-') + '.logic', '.js', page_logic(name).encode('utf-8'))
def logic_inline(): return '\n' + ''.join(page_logic(n) for n in META['pages']['order'])
ROOT_LOGIC = L('rootLogic')                     # منطقُ الغلاف (الجذر «Root»؛ و«index» إن فُتح /index.html) — يُصرَّف مثل الصفحات
def root_logic():
    return ('/* KIVO · Root — منطقُ الغلاف مُصرَّفٌ عند البناء من ' + ROOT_LOGIC + ' */\n(function () {\nvar f = function (DCLogic, StreamableLogic, React) {\n' + rd(ROOT_LOGIC)
            + '\n;return (typeof Component!=="undefined"&&Component)||undefined;\n};\nvar D = window.__dcLogicDefs = window.__dcLogicDefs || {}; D["Root"] = f; D["index"] = f;\n})();\n')
LAZY_HEAD = ('/* ═══ KIVO_242 · المرحلة ٢ — الصفحاتُ تُجلب عند أول فتحٍ لها ═══\n'
             '   dc-runtime يسأل window.__resources["./<الاسم>.dc.html"] قبل أن يجلب (ensureFetched) — مسارٌ قائم لم يُعدَّل.\n'
             '   كانت الصفحاتُ الأربع عشرة تُفكّ كلُّها هنا عند كل تحميل (base64 ثم inflate بـ fflate ثم Blob)؛ الآن تبقى ملفاتٍ ذاتَ بصمة\n'
             '   في /assets/pages تُخزَّن سنة، ولا يُنزَّل منها إلا ما يُفتح. ولا شيءَ يُفكّ هنا، فلا يُشحن fflate (لم يستعمله غيرُ هذا الملف).\n'
             '   حارسُ الجلب في آخر الملف. */\n')
LAZY_KEEP = 'window.__resourceBlobs = {};\n'                    # dc-runtime's bundledBlob() still looks here — stays (empty)
FFLATE_HEAD = '/* fflate — inflate for compressed pages (sync, no worker) */\n'
def lazy_loader(body):
    a = '\nwindow.__resources = {};\n'                  # the block's text starts with a newline (as extracted from KIVO_240)
    i0 = body.index('\n(function () {\n  var pages = @@KIVO_PAGES@@;')
    i1 = body.index('\n})();', i0) + len('\n})();')
    assert body.startswith(a) and body.count('var pages = @@KIVO_PAGES@@;') == 1, 'pages-loader anchors'
    tail = body[i1:]                                  # Runtime hooks after the bundled-only inflater stay authoritative source.
    mid = body[len(a):i0]                               # = LAZY_KEEP + fflate (comment line, library line, empty line) — nothing else
    assert mid.startswith(LAZY_KEEP + FFLATE_HEAD) and mid.count('\n') == 3 and '.fflate=f()' in mid, 'pages-loader middle: blobs + fflate only'
    mp = {'./' + urllib.parse.quote(n, safe='') + '.dc.html': page_url(n) for n in META['pages']['order']}
    lg = ('window.__dcLogic = ' + json.dumps({n: logic_url(n) for n in META['pages']['order']}, ensure_ascii=False, separators=(',', ':')) + ';\n') if PRECOMPILED else ''
    return '\n' + LAZY_HEAD + 'window.__resources = ' + json.dumps(mp, ensure_ascii=False, separators=(',', ':')) + ';\n' + lg + LAZY_KEEP + tail + '\n' + rd(os.path.dirname(PAGES_LOADER) + '/030-pages-loader.lazy-guard.js')

ASSET_REF = re.compile(r'/assets/(?:js|css|fonts|img|pages)/[A-Za-z0-9._-]+')
def own_assets(d):
    """The assets a deployed release reaches by reference: its shell, manifest and 404 page, then every referenced script,
    stylesheet and page text in turn (fonts, icons and the lazy pages' URLs are found inside those)."""
    seen, todo = set(), [os.path.join(d, f) for f in ('index.html', 'manifest.webmanifest', '404.html') if os.path.exists(os.path.join(d, f))]
    while todo:
        text = open(todo.pop(), 'rb').read().decode('utf-8', 'replace')
        for u in ASSET_REF.findall(text):
            rel = u[1:]
            if rel in seen: continue
            assert os.path.exists(os.path.join(d, rel)), 'release ' + d + ' references a missing asset ' + rel
            seen.add(rel)
            if rel.endswith(('.js', '.css', '.txt')): todo.append(os.path.join(d, rel))
    return sorted(seen)

# KIVO_257 · AUD-024 (SOT-148): blocks.json «minify»: "tokens" ⇒ كلُّ كتلة js (عدا محمِّل الصفحات بعلاماته) تُصغَّر حافظةً للرموز
# (tools/jsmin_tokens.mjs: حذفُ التعليقات والمسافات البادئة · كلُّ رمزٍ حرفاً بحرف · فواصلُ الأسطر بين الرموز باقية) — في الوضعين فيبقى
# تكافؤُ التركيب (dist ↔ monolith) بايتاً؛ والبرهانُ مدمَج: تيّارُ الرموز في الناتج = الأصل لكل كتلة وإلا يتوقف البناء.
# CORE-01 · step 0: comments are source documentation, not shipped bytes. The inline-CSS blocks (blocks.json kind inline-css), the
# <style> elements of the shell template and the template's own <!--…--> are emitted without comments. Both modes share these
# functions, so the monolith and the split shell stay byte-equal. Sources keep every comment.
_NAME = re.compile(r'[A-Za-z0-9_%\\-]|[^\x00-\x7f]')
def _cut(t, s, e, out):
    """Drop t[s:e]. A comment alone on its lines takes its line with it; otherwise the text around it stays as it is, and a single
    space is put back only where removal would fuse two name characters into one token (1px/**/solid)."""
    ls = t.rfind('\n', 0, s) + 1; le = t.find('\n', e); le = len(t) if le < 0 else le
    if t[ls:s].strip() == '' and t[e:le].strip() == '':
        while out:
            last = out[-1].rstrip(' \t')
            if last: out[-1] = last; break
            out.pop()
        return le + 1 if le < len(t) else le
    if s > 0 and e < len(t) and _NAME.match(t[s - 1]) and _NAME.match(t[e]): out.append(' ')
    return e
def strip_css_comments(t):
    """/*…*/ out of CSS text, string-aware: quoted strings and unquoted url(…) are copied untouched."""
    out, i, n = [], 0, len(t)
    while i < n:
        c = t[i]
        if c in '"\'':
            j = i + 1
            while j < n and t[j] != c and t[j] != '\n': j += 2 if t[j] == '\\' else 1
            out.append(t[i:j + 1]); i = j + 1
        elif c == '/' and t.startswith('/*', i):
            e = t.find('*/', i + 2); assert e >= 0, 'unterminated CSS comment'
            i = _cut(t, i, e + 2, out)
        elif t[i:i + 4].lower() == 'url(' and (i == 0 or not _NAME.match(t[i - 1])):
            k = i + 4
            while k < n and t[k] in ' \t\n': k += 1
            if k < n and t[k] in '"\'': out.append(t[i:k]); i = k
            else: e = t.find(')', k); e = n if e < 0 else e + 1; out.append(t[i:e]); i = e
        else: out.append(c); i += 1
    return ''.join(out)
_KEEP_HTML_COMMENT = re.compile(r'<!--(?:BS_BOOT--|\[if|<!\[endif|\s*sc-)')
_RAW = re.compile(r'(<(style|script)\b[^>]*>)([\s\S]*?)(</\2>)', re.I)
def strip_shell_comments(t):
    """<!--…--> out of the shell template (BS_BOOT, conditional comments and sc- markers stay) and /*…*/ out of its <style>
    elements; <script> elements are copied untouched. Runs on the template before any block is substituted."""
    out, pos = [], 0
    def html(seg):
        o, i = [], 0
        while True:
            s = seg.find('<!--', i)
            if s < 0: o.append(seg[i:]); break
            e = seg.find('-->', s + 4); assert e >= 0, 'unterminated HTML comment'
            o.append(seg[i:s])
            if _KEEP_HTML_COMMENT.match(seg, s): o.append(seg[s:e + 3]); i = e + 3
            else: i = _cut(seg, s, e + 3, o)
        return ''.join(o)
    for m in _RAW.finditer(t):
        out.append(html(t[pos:m.start()]))
        out.append(m.group(1) + (strip_css_comments(m.group(3)) if m.group(2).lower() == 'style' else m.group(3)) + m.group(4))
        pos = m.end()
    out.append(html(t[pos:]))
    return ''.join(out)
_TMIN = {'p': None}
def tmin_js(body, bid, preserve_test_tool=False):
    if _TMIN['p'] is None:
        _TMIN['p'] = subprocess.Popen(['node', os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'tools', 'jsmin_tokens.mjs'), '--serve'],
                                      stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, encoding='utf-8')
    pr = _TMIN['p']; pr.stdin.write(json.dumps({'t': body, 'preserveTestToolMarkers': preserve_test_tool}, ensure_ascii=False) + '\n'); pr.stdin.flush()
    r = json.loads(pr.stdout.readline())
    assert 'err' not in r, 'jsmin_tokens failed for ' + bid + ': ' + r.get('err', '')
    return r['t']
def render_block(bid, mode):
    b = BLK[bid]; body = rd(bid)
    is_pages = bid.endswith('-pages-loader.js')
    # KIVO_247 (blocks.json: "dcLogicInline": "body-end"): في المونوليث/المضمَّن تُوضع تعريفاتُ المنطق في كتلةٍ مستقلة قبل </body> لا بعد المحمِّل في <head>
    # (نصُّ منطق الصفحات في الرأس كان يُربك الفحوصَ الساكنة التي تبحث عن أول </head>) — بلا العلامة: السلوكُ السابق (KIVO_246)
    if is_pages and (mode == 'monolith' or A.pages == 'bundled'): body = body.replace('@@KIVO_PAGES@@', pages_json()) + (logic_inline() if PRECOMPILED and META.get('dcLogicInline') != 'body-end' else '')
    elif is_pages: body = lazy_loader(body)
    if b['kind'] == 'inline-css': body = strip_css_comments(body)
    body = resolve_assets(body, mode)
    if META.get('minify') == 'tokens' and b['kind'] == 'js' and not is_pages: body = tmin_js(body, bid)
    if PRECOMPILED and bid == ROOT_LOGIC:
        tail = ('\n<script>' + root_logic() + '</script>') if mode == 'monolith' else ('\n<script src="' + hashed('js', 'root-logic', '.js', root_logic().encode('utf-8')) + '"></script>')
        return b['openTag'] + LOGIC_STUB + b['closeTag'] + tail   # KIVO_253: جسدُ x-dc للغلاف لا يُشحن مرتين (المنطقُ في root-logic.js) — علامةٌ قصيرة بدل النصّ
    if mode == 'monolith' or b['kind'].startswith('inline'): return b['openTag'] + body + b['closeTag']
    stem, ext = os.path.splitext(os.path.basename(bid))
    if b['kind'] == 'js':
        url = hashed('js', stem, ext, body.encode('utf-8')); URL_OF[bid] = url
        return b['openTag'][:-1] + ' src="' + url + '">' + '</script>'
    url = hashed('css', stem, ext, body.encode('utf-8'))
    attrs = b['openTag'][len('<style'):-1]
    return '<link rel="stylesheet"' + attrs + ' href="' + url + '">'
def icons_cat():
    # KIVO_253 · AUD-018: فهرسُ الأيقونات (assets/icons/catalog.json) — إشاراتُ <svg data-i> في الغلاف تُركَّب أجساداً مضمَّنة عند البناء (tools/icons.py)
    p = os.path.join(SRC, 'assets', 'icons', 'catalog.json')
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else None
def render_shell(mode):
    t = strip_shell_comments(rd(L('shell')))
    cat = icons_cat()
    if cat:
        import sys as _s; _s.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'tools')); import icons as _ic
        t = _ic.materialize_text(t, cat, L('shell'))
    t = re.sub(r'@@KIVO_(?:BLOCK|INLINE):([^@]+)@@', lambda m: render_block(m.group(1), mode), t)
    if '@@KIVO_MANIFEST_LEGACY@@' in t:
        t = t.replace('@@KIVO_MANIFEST_LEGACY@@', 'data:application/manifest+json;base64,' + base64.b64encode(rdb(L('legacyManifest'))).decode('ascii'))
    t = re.sub(r'@@KIVO_FONT_PRELOAD:([^@]+)@@', lambda m: '' if mode == 'monolith' else
               '<link rel="preload" href="' + asset_url(m.group(1)) + '" as="font" type="font/woff2" crossorigin>', t)
    # preload لكل سكربتٍ وورقةٍ خارجية بترتيبها: وسمُ <meta http-equiv="Content-Security-Policy"> في الرأس يوقف «ماسحَ التحميل المسبق»
    # في كروم، فلولا هذه الروابط لطُلب كلُّ سكربتٍ حين يبلغه المحلّل واحداً بعد واحد (رحلةٌ كاملة لكلٍّ منها). التنفيذُ وترتيبُه لا يتغيّران.
    if mode == 'monolith':
        t = t.replace('@@KIVO_PRELOADS@@', '')
    else:
        pre = [('script', u) for u in re.findall(r'<script[^>]* src="(/assets/js/[^"]+)"></script>', t)]
        pre += [('style', u) for u in re.findall(r'<link rel="stylesheet"[^>]* href="(/assets/css/[^"]+)">', t[:t.find('<x-dc')])]
        order = {u: t.find(u) for _, u in pre}
        # السكربتاتُ بعد كتلة بوابة الدخول (blocks.json · gateBlock) لا تحتاجها شاشةُ الدخول: preload بأولويةٍ منخفضة كي يصل ما قبلها أولاً
        gate_at = order[URL_OF[META['gateBlock']]] if META.get('gateBlock') else None
        low = lambda a, u: a == 'script' and gate_at is not None and order[u] > gate_at
        t = t.replace('@@KIVO_PRELOADS@@', ''.join('\n<link rel="preload" href="' + u + '" as="' + a + '"' + (' fetchpriority="low"' if low(a, u) else '') + '>'
                                                   for a, u in sorted(pre, key=lambda x: order[x[1]])))
    if PRECOMPILED and META.get('dcLogicInline') == 'body-end' and (mode == 'monolith' or A.pages == 'bundled'):
        assert t.count('</body>') == 1, 'body-end placement needs a single </body>'
        t = t.replace('</body>', '<script>' + logic_inline() + '</script>\n</body>')
    t = resolve_assets(t, mode)
    assert '@@KIVO_' not in t, 'unresolved marker'
    return t

if A.mode == 'monolith':
    out = render_shell('monolith').encode('utf-8')
    os.makedirs(os.path.dirname(os.path.abspath(A.out)), exist_ok=True)
    open(A.out, 'wb').write(out)
    print('monolith', A.out, len(out), sha(out))
else:
    shell = render_shell('split').encode('utf-8'); OUTFILES['index.html'] = shell
    for f in sorted(os.listdir(os.path.join(SRC, L('public')))): OUTFILES[f] = rdb(L('public') + '/' + f)
    if L('workerOut') != L('public') + '/_worker.js': OUTFILES['_worker.js'] = rdb(L('workerOut'))
    worker_transform = None
    if A.minify_worker:
        source_worker = OUTFILES['_worker.js']
        worker_text = source_worker.decode('utf-8')
        assert worker_text.count('@@KIVO_TEST_TOOL_BEGIN') == 1 and worker_text.count('@@KIVO_TEST_TOOL_END') == 1, 'Worker tool boundaries must occur exactly once before minification'
        OUTFILES['_worker.js'] = tmin_js(worker_text, '_worker.js', preserve_test_tool=True).encode('utf-8')
        assert OUTFILES['_worker.js'].count(b'@@KIVO_TEST_TOOL_BEGIN') == 1 and OUTFILES['_worker.js'].count(b'@@KIVO_TEST_TOOL_END') == 1, 'Worker tool boundaries must survive minification'
        worker_transform = {'mode': 'tokens', 'proof': 'tokens-equal', 'sourceBytes': len(source_worker), 'sourceSha256': sha(source_worker), 'bytes': len(OUTFILES['_worker.js']), 'sha256': sha(OUTFILES['_worker.js']), 'preservesTestToolMarkers': True}
    if os.path.exists(os.path.join(SRC, L('manifest'))):
        OUTFILES['manifest.webmanifest'] = resolve_assets(rd(L('manifest')), 'split').encode('utf-8')
    # assets of the previous two releases stay reachable for tabs opened before the deploy.  Only each release's OWN assets are kept
    # (what its shell, manifest and 404 page reach by reference) — not what it had retained itself — so the window slides by two
    # releases and never accumulates.
    assert len(A.retain) <= 2, 'design: keep the assets of the previous two releases only'
    RETAINED = []
    for prev in A.retain:
        for p in own_assets(prev):
            data = open(os.path.join(prev, p), 'rb').read()
            if p in OUTFILES: assert OUTFILES[p] == data, 'retained asset differs ' + p
            else: OUTFILES[p] = data; RETAINED.append(p)
    if os.path.exists(A.out): shutil.rmtree(A.out)
    for p in sorted(OUTFILES):
        fp = os.path.join(A.out, p); os.makedirs(os.path.dirname(fp), exist_ok=True)
        with open(fp, 'wb') as f: f.write(OUTFILES[p])
    info = {'mode': 'split', 'pages': A.pages, 'retained': [os.path.basename(os.path.normpath(r)) for r in A.retain],
            'retainedFiles': sorted(RETAINED),
            'files': {p: {'bytes': len(OUTFILES[p]), 'sha256': sha(OUTFILES[p])} for p in sorted(OUTFILES)}}
    if worker_transform: info['workerTransform'] = worker_transform
    open(os.path.abspath(A.out).rstrip('/') + '.build.json', 'w', encoding='utf-8', newline='\n').write(json.dumps(info, indent=1, sort_keys=True))
    print('split', A.out, 'files', len(OUTFILES), 'shell', len(shell), sha(shell))
