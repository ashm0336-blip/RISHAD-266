# -*- coding: utf-8 -*-
"""KIVO · RM-2 — الصفحات كوحدات (modules): فكُّ كل <name>.dc.html إلى مجلد src/modules/<slug>/ (meta.json · helmet.css · view.html · logic.js) وإعادةُ تركيبه.
   python3 page_modules.py split <pagesDir> <modulesDir> [--pretty]   — --pretty يعيد تنسيق السكربتات المضغوطة (prettier) ليصير logic.js مقروءاً
   python3 page_modules.py join  <modulesDir> <pagesDir> [--minify]   — يعيد <name>.dc.html؛ --minify يضغط logic.js (esbuild) للصفحات التي كان سكربتُها مضغوطاً أصلاً
   python3 page_modules.py verify <modulesDir> <pagesDir>             — بلا --pretty/--minify: الفكُّ ثم التركيب يعيد الملفَ بايتاً (برهانُ الأداة)
   الفكُّ حرفي: كلُّ ما قبل <helmet> وما بين الأقسام يُحفظ في meta.json كي يكون التركيبُ بايتاً عند عدم التغيير.
   KIVO_265 · البند 19 (الدَّين التقني): منطقُ الوحدة الكبيرة يُقسَّم إلى logic.js (الصنفُ Component) + أجزاء logic-<جزء>.js تُعلَن مرتَّبةً في
   meta.json "logicParts" (كلٌّ منها Object.assign(Component.prototype, {…}) صالحٌ وحده للفحص) وتُجمع نصاً واحداً بعد logic.js عند التركيب —
   فالحزمةُ المولَّدة سكربتٌ واحد كما كانت. split لا يعرف الأجزاءَ (استخراجٌ أوليٌّ من الصفحة) فيرفض الكتابةَ فوق وحدةٍ مقسَّمة."""
import os, sys, re, json, hashlib, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # KIVO_251: tools/ في الجذر
sha = lambda b: hashlib.sha256(b).hexdigest()
SLUG = {'Employees': 'employees', 'Tasks': 'tasks', 'Daily Sessions': 'daily', 'Operational Plan': 'plan', 'Staffing': 'staff', 'Admin': 'admin', 'Profile': 'profile', 'Irshad': 'irshad', 'Award': 'award', 'Daily Report': 'dreport', 'Planning': 'planning', 'Seized': 'seized', 'KPIs': 'kpis', 'Daily Stats': 'dstats'}
RE = re.compile(r'^(?P<pre>[\s\S]*?<x-dc>\n<helmet>\n?)(?P<helmet>[\s\S]*?)(?P<mid>\n?</helmet>\n)(?P<view>[\s\S]*?)(?P<mid2>\n</x-dc>\n)(?P<stag><script(?: type="text/x-dc")? data-dc-script[^>]*>)(?P<script>[\s\S]*?)(?P<post></script>\n?[\s\S]*)$')
def logic_files(meta): return ['logic.js'] + list(meta.get('logicParts') or [])   # KIVO_265 · البند 19: الأجزاءُ بترتيب الإعلان
def read_logic(d, meta):
    ts = [open(os.path.join(d, f), encoding='utf-8', newline='').read() for f in logic_files(meta)]
    return ts[0] if len(ts) == 1 else ''.join(t if t.endswith('\n') else t + '\n' for t in ts)   # وحدةٌ بلا أجزاء: النصُّ كما هو (التركيبُ بايتاً)
def split(pages, mods, pretty):
    order = json.load(open(os.path.join(os.path.dirname(pages.rstrip('/')), '..', 'blocks.json'), encoding='utf-8'))['pages']['order'] if os.path.exists(os.path.join(os.path.dirname(pages.rstrip('/')), '..', 'blocks.json')) else [f[:-8] for f in sorted(os.listdir(pages)) if f.endswith('.dc.html')]
    idx = []
    for name in order:
        raw = open(os.path.join(pages, name + '.dc.html'), encoding='utf-8', newline='').read(); m = RE.match(raw)
        if not m: raise SystemExit('unrecognized page structure: ' + name)
        d = os.path.join(mods, SLUG.get(name, name.lower().replace(' ', '-'))); os.makedirs(d, exist_ok=True)
        if os.path.exists(os.path.join(d, 'meta.json')) and json.load(open(os.path.join(d, 'meta.json'), encoding='utf-8')).get('logicParts'): raise SystemExit('split refuses to overwrite a module with logicParts: ' + d)
        g = m.groupdict(); minified = len(g['script']) / max(1, g['script'].count('\n') + 1) > 1000   # متوسطُ طول السطر > 1000 حرف = مضغوطٌ/شبهُ مضغوط
        logic = g['script']
        if pretty and minified:
            r = subprocess.run([os.environ.get('KIVO_NODE', 'node'), os.path.join(ROOT, 'node_modules', 'prettier', 'bin', 'prettier.cjs'), '--parser', 'babel', '--print-width', '140', '--stdin-filepath', 'logic.js'], input=logic, capture_output=True, text=True, encoding='utf-8')
            if r.returncode != 0: raise SystemExit('prettier failed for ' + name + ': ' + r.stderr[:300])
            logic = r.stdout
        open(os.path.join(d, 'helmet.css'), 'w', encoding='utf-8', newline='').write(g['helmet'])
        open(os.path.join(d, 'view.html'), 'w', encoding='utf-8', newline='').write(g['view'])
        open(os.path.join(d, 'logic.js'), 'w', encoding='utf-8', newline='').write(logic)
        meta = {'name': name, 'slug': os.path.basename(d), 'pre': g['pre'], 'mid': g['mid'], 'mid2': g['mid2'], 'scriptTag': g['stag'], 'post': g['post'], 'minifiedSource': minified, 'prettified': bool(pretty and minified), 'originalSha256': sha(raw.encode('utf-8'))}
        json.dump(meta, open(os.path.join(d, 'meta.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        idx.append({'name': name, 'slug': meta['slug'], 'minifiedSource': minified, 'bytes': len(raw.encode('utf-8')), 'logicLines': logic.count('\n') + 1})
    json.dump({'pages': idx}, open(os.path.join(mods, 'modules.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('split', len(idx), 'pages →', mods)
# KIVO_256 · AUD-007/AUD-012: أصلٌ ثنائيٌّ يُضمَّن في نصّ الصفحة نفسِه (data: URI) يُكتب في المصدر مرّةً واحدةً ملفّاً تحت src/assets ويُشار إليه
# بـ@@KIVO_INLINE:<img|fonts>/<ملف>@@ — يُضمَّن عند التركيب قبل الضغط فيبقى الناتجُ بايتاً كما كان (وثائقُ الطباعة مكتفيةٌ بذاتها) ولا يتكرّر
# الأصلُ في المصادر (شعارُ الطباعة كان منسوخاً 80 KB في ثلاث وحدات). خلافُ @@KIVO_ASSET@@ في الغلاف الذي يصير رابطاً في الوضع المُصرَّف.
INLINE_RE = re.compile(r'@@KIVO_INLINE:(img|fonts)/([^@/]+)@@')
INLINE_MIME = {'.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg'}
def inline_assets(text, mods):
    import base64
    lay = {}
    try: lay = json.load(open(os.path.join(mods, '..', 'layout.json'), encoding='utf-8')).get('assets', {})
    except Exception: pass
    def rep(m):
        d = lay.get(m.group(1), 'assets/' + ('images' if m.group(1) == 'img' else m.group(1)))
        b = open(os.path.join(mods, '..', d, m.group(2)), 'rb').read()
        return 'data:' + INLINE_MIME[os.path.splitext(m.group(2))[1].lower()] + ';base64,' + base64.b64encode(b).decode('ascii')
    return INLINE_RE.sub(rep, text)
def join(mods, pages, minify):
    os.makedirs(pages, exist_ok=True); idx = json.load(open(os.path.join(mods, 'modules.json'), encoding='utf-8'))['pages']
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import icons
    ICONS = icons.load(os.path.join(mods, '..')) if os.path.exists(os.path.join(mods, '..', 'assets', 'icons', 'catalog.json')) else None
    for it in idx:
        d = os.path.join(mods, it['slug']); meta = json.load(open(os.path.join(d, 'meta.json'), encoding='utf-8'))
        logic = inline_assets(read_logic(d, meta), mods)   # KIVO_265 · البند 19: logic.js + أجزاؤه
        if minify and meta['minifiedSource']:
            r = subprocess.run([os.environ.get('KIVO_NODE', 'node'), os.path.join(ROOT, 'node_modules', 'esbuild', 'bin', 'esbuild'), '--minify-whitespace', '--minify-syntax', '--target=es2020', '--charset=utf8', '--log-level=error'], input=logic, capture_output=True, text=True, encoding='utf-8')
            if r.returncode != 0: raise SystemExit('esbuild failed for ' + it['name'] + ': ' + r.stderr[:300])
            logic = r.stdout.rstrip('\n')
        view = inline_assets(open(os.path.join(d, 'view.html'), encoding='utf-8', newline='').read(), mods)
        if ICONS: view = icons.materialize_text(view, ICONS, it['slug'] + '/view.html')   # KIVO_253 · AUD-018: <svg data-i> → الجسدُ المضمَّن من الفهرس
        out = meta['pre'] + open(os.path.join(d, 'helmet.css'), encoding='utf-8', newline='').read() + meta['mid'] + view + meta['mid2'] + meta['scriptTag'] + logic + meta['post']
        open(os.path.join(pages, it['name'] + '.dc.html'), 'w', encoding='utf-8', newline='').write(out)
    print('join', len(idx), 'pages →', pages)
if __name__ != '__main__': cmd = ''   # يُستورد (module_charter · الاختبارات) بلا تنفيذ
else: cmd = sys.argv[1]
if cmd == 'split': split(sys.argv[2], sys.argv[3], '--pretty' in sys.argv)
elif cmd == 'join': join(sys.argv[2], sys.argv[3], '--minify' in sys.argv)
elif cmd == 'verify':
    import tempfile, filecmp
    t = tempfile.mkdtemp(prefix='pm_'); split(sys.argv[3], os.path.join(t, 'm'), False); join(os.path.join(t, 'm'), os.path.join(t, 'p'), False)
    bad = [f for f in os.listdir(sys.argv[3]) if f.endswith('.dc.html') and open(os.path.join(sys.argv[3], f), 'rb').read() != open(os.path.join(t, 'p', f), 'rb').read()]
    print(('✔' if not bad else '✘') + ' split→join byte-identical for all pages' + ('' if not bad else ': differs ' + str(bad))); sys.exit(1 if bad else 0)
