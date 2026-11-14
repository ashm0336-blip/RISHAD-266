#!/usr/bin/env python3
"""KIVO · AUD-018 — منظومةُ الأيقونات (KIVO_253):
المصدرُ الواحد لكل أيقونة هو src/assets/icons/catalog.json (id → viewBox + body + مواضعُ الاستعمال)؛ قوالبُ الوحدات والغلاف تشير إليها
بـ <svg data-i="ID" …سماتُ الموضع…></svg> بلا جسدٍ مضمَّن، ويُعاد تركيبُ الجسد عند توليد الصفحات (tools/page_modules.py join) وعند بناء الغلاف
(tools/build.py) — فالناتجُ المُرسَل للمتصفح هو الـSVG المضمَّن نفسُه (لا <use> ولا sprite في زمن التشغيل: وثائقُ الطباعة والتصدير والنسخُ
المستنسخة من DOM تبقى مكتفيةً بذاتها كما كانت).

  python3 tools/icons.py extract --src src        يمسح القوالب، يبني الفهرس، ويستبدل الأجساد المضمَّنة بإشاراتٍ (يُشغَّل مرةً عند الاعتماد ثم عند إضافة أيقونات)
  python3 tools/icons.py check   --src src        القوالبُ بلا <svg> ذاتِ جسد · كلُّ data-i في الفهرس · الفهرسُ بلا يتيم · docs/icons.html محدَّث
  python3 tools/icons.py index   --src src        يولّد docs/icons.html (فهرسٌ مرئي: الرقم · viewBox · عددُ المواضع · الوحدات)
  python3 tools/icons.py materialize <file> --src src   يطبع الملفَّ بعد إعادة تركيب الأجساد (للاختبار)

المفتاح: sha1(viewBox + الجسدُ بعد توحيد الفراغات) — الأيقونةُ الواحدة بأشكالها المتطابقة (ولو اختلفت سماتُ الموضع width/height/class) = مدخلٌ واحد.
"""
import os, re, sys, json, hashlib

SVG_RE = re.compile(r'<svg\b([^>]*)>(.*?)</svg>', re.S)
REF_RE = re.compile(r'<svg\b([^>]*)\sdata-i="(i-[0-9a-f]{8})"([^>]*)></svg>')
TEMPLATES = ('modules/*/view.html', 'systems/*/client/view.html', 'layouts/index.template.html')   # V7 · الحزمة ب: وحداتُ الأنظمة المنقولة

def norm(body):
    if '<text' in body: return body.strip()                       # نصٌّ داخل الأيقونة: الفراغاتُ ذاتُ معنى — يُحفظ كما هو
    b = re.sub(r'\s+', ' ', body).strip()
    return re.sub(r'>\s+<', '><', b)

def key(view_box, body): return 'i-' + hashlib.sha1((view_box + '|' + body).encode('utf-8')).hexdigest()[:8]

def view_box(attrs):
    m = re.search(r'viewBox="([^"]*)"', attrs); return m.group(1) if m else ''

def templates(S):
    import glob
    out = []
    for pat in TEMPLATES: out += sorted(glob.glob(os.path.join(S, pat)))
    return out

def load(S):
    p = os.path.join(S, 'assets', 'icons', 'catalog.json')
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {'version': 1, 'icons': {}}

def save(S, cat):
    p = os.path.join(S, 'assets', 'icons', 'catalog.json'); os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'w', encoding='utf-8').write(json.dumps(cat, ensure_ascii=False, indent=1, sort_keys=True) + '\n')

def materialize_text(text, cat, where='?'):
    """<svg data-i="ID" …></svg> → <svg …>BODY</svg>  (سماتُ الموضع كما هي؛ data-i يُنزع)."""
    icons = cat['icons']
    def rep(m):
        a, i, b = m.group(1), m.group(2), m.group(3)
        if i not in icons: raise SystemExit('✘ ' + where + ': أيقونةٌ غيرُ موجودة في الفهرس ' + i)
        return '<svg' + a + b + '>' + icons[i]['body'] + '</svg>'
    return REF_RE.sub(rep, text)

def extract(S):
    cat = load(S); icons = cat['icons']; n_rep = 0
    for f in templates(S):
        s = open(f, encoding='utf-8', newline='').read()
        def rep(m):
            nonlocal n_rep
            attrs, body = m.group(1), m.group(2)
            if 'data-i="' in attrs or not body.strip(): return m.group(0)   # إشارةٌ قائمة، أو <svg> فارغٌ يُملأ برمجياً — لا أيقونة
            vb = view_box(attrs); nb = norm(body); i = key(vb, nb)
            icons.setdefault(i, {'viewBox': vb, 'body': nb, 'uses': {}}); n_rep += 1
            return '<svg' + attrs.rstrip() + ' data-i="' + i + '"></svg>'
        s2 = SVG_RE.sub(rep, s)
        if s2 != s: open(f, 'w', encoding='utf-8', newline='').write(s2)
    for e in icons.values(): e['uses'] = {}
    for f in templates(S):                                        # عدُّ المواضع من الإشارات نفسِها (المصدرُ الواحد للعدّ)
        rel = os.path.relpath(f, S).replace(os.sep, '/'); s = open(f, encoding='utf-8', newline='').read()
        for m in REF_RE.finditer(s):
            e = icons.get(m.group(2))
            if e is not None: e['uses'][rel] = e['uses'].get(rel, 0) + 1
    orphans = [i for i, e in icons.items() if not e['uses']]
    for i in orphans: del icons[i]
    save(S, cat)
    print('✔ icons: %d مدخلاً في الفهرس · %d موضعاً استُبدل · %d يتيماً حُذف' % (len(icons), n_rep, len(orphans)))

def check(S):
    cat = load(S); icons = cat['icons']; bad = []
    used = {}
    for f in templates(S):
        rel = os.path.relpath(f, S).replace(os.sep, '/'); s = open(f, encoding='utf-8', newline='').read()
        for m in SVG_RE.finditer(s):
            if m.group(2).strip() and 'data-i="' not in m.group(1): bad.append(rel + ': <svg> بجسدٍ مضمَّن (' + m.group(2).strip()[:40] + '…)')
        for m in REF_RE.finditer(s):
            if m.group(2) not in icons: bad.append(rel + ': إشارةٌ إلى أيقونة غير موجودة ' + m.group(2))
            used[m.group(2)] = used.get(m.group(2), 0) + 1
    for i, e in icons.items():
        if i not in used: bad.append('الفهرس: أيقونةٌ يتيمة ' + i)
        if key(e['viewBox'], e['body']) != i: bad.append('الفهرس: مفتاحٌ لا يطابق جسدَه ' + i)
        if sum(e['uses'].values()) != used.get(i, 0): bad.append('الفهرس: عددُ مواضع ' + i + ' = %d لكن القوالب فيها %d' % (sum(e['uses'].values()), used.get(i, 0)))
    idx = os.path.join(S, '..', 'docs', 'icons.html')
    if os.path.exists(idx) and open(idx, encoding='utf-8').read() != render_index(cat): bad.append('docs/icons.html غيرُ محدَّث (شغّل tools/icons.py index)')
    for b in bad: print('  ✘ ' + b)
    print(('✔ icons: القوالبُ بلا <svg> مضمَّن · %d أيقونة في الفهرس · %d موضعاً · الفهرسُ المرئي محدَّث' % (len(icons), sum(used.values()))) if not bad else ('✘ icons: %d مخالفة' % len(bad)))
    return not bad

def render_index(cat):
    icons = cat['icons']
    rows = []
    for i in sorted(icons, key=lambda k: (-sum(icons[k]['uses'].values()), k)):
        e = icons[i]; n = sum(e['uses'].values())
        mods = ' · '.join(sorted(set(u.split('/')[1] if u.startswith(('modules/', 'systems/')) else 'الغلاف' for u in e['uses'])))
        rows.append('<div class="c"><svg viewBox="%s" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">%s</svg><code>%s</code><span>%d موضع</span><small>%s</small></div>' % (e['viewBox'] or '0 0 24 24', e['body'], i, n, mods))
    return ('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>KIVO · فهرسُ الأيقونات (AUD-018)</title>'
            '<style>body{font:14px/1.7 Cairo,Tahoma,Arial;margin:24px;color:#0f172a;background:#fff}h1{font-size:20px}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}'
            '.c{border:1px solid #e2e8f0;border-radius:10px;padding:10px;display:flex;flex-direction:column;align-items:center;gap:4px}code{font-size:11px;color:#475569}small{color:#64748b;font-size:11px;text-align:center}</style></head><body>'
            '<h1>فهرسُ الأيقونات — %d أيقونة · %d موضعاً · المصدر <code>src/assets/icons/catalog.json</code></h1>'
            '<p>كلُّ أيقونة تُستعمل في القوالب بـ <code>&lt;svg data-i="ID" …&gt;&lt;/svg&gt;</code> وتُركَّب أجسادُها عند التوليد (tools/icons.py). الترتيب: الأكثرُ استعمالاً أولاً. مولَّدٌ آلياً — لا يُحرَّر يدوياً.</p>'
            '<div class="g">%s</div></body></html>\n') % (len(icons), sum(sum(e['uses'].values()) for e in icons.values()), '\n'.join(rows))

def index(S):
    p = os.path.join(S, '..', 'docs', 'icons.html'); open(p, 'w', encoding='utf-8').write(render_index(load(S))); print('✔ docs/icons.html')

if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'check'
    S = os.path.abspath(sys.argv[sys.argv.index('--src') + 1]) if '--src' in sys.argv else os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src')
    if cmd == 'extract': extract(S); index(S)
    elif cmd == 'check': sys.exit(0 if check(S) else 1)
    elif cmd == 'index': index(S)
    elif cmd == 'materialize': sys.stdout.write(materialize_text(open(sys.argv[2], encoding='utf-8', newline='').read(), load(S), sys.argv[2]))
    else: raise SystemExit(__doc__)
