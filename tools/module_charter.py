#!/usr/bin/env python3
"""KIVO_263 · SOT-092 — ميثاقُ كل وحدة مقروءٌ آلياً ومُتحقَّقٌ منه: src/modules/<وحدة>/meta.json → "charter".

  python3 tools/module_charter.py --write   → يملأ ما يُشتقّ من المصدر (الصفحة · المسار · الواجهة/المنطق · البيانات · أوراق الصلاحية · الاختبارات)
                                              ويُبقي ما كتبه الإنسان (owner · purpose) كما هو
  python3 tools/module_charter.py --check   → يُخفق إن نقص حقل، أو اختلف المشتقُّ عن المصدر (البياناتُ المقروءة فعلاً من logic.js ·
                                              الأوراقُ الموجودة في perm-tree24 · الاختباراتُ الموجودة والمشغَّلة في البوابة أو الوحدة)

المعيار (SOT-092): «كل Module له owner وUI/domain/data/permissions/tests واضحة». المصدرُ الوصفيُّ الكامل docs/module-charters.md.
"""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = lambda p: json.load(open(os.path.join(ROOT, p), encoding='utf-8'))
PAGE_OF = {'employees': 'emps'}          # slug ⇒ مفتاحُ الصفحة في الشجرة/pages.json حين يختلف
NAV_OF = {'employees': 'employees', 'staff': 'staffing', 'admin': 'admin'}
# المالكُ التشغيلي والغاية — من docs/module-charters.md (§3 «المستخدمون والأدوار» · «الغاية التشغيلية») — يُكتب يدوياً ويُحفظ
HUMAN = {
    'admin':     ('مدير النظام (الحوكمة) · مدير الإدارة (إعدادات إدارته)', 'حوكمةُ المنصة والإدارة: الهيكل والسقوف والحسابات والصلاحيات والورديات والقوالب والنسخ والسياسات'),
    'employees': ('مدير الإدارة', 'سجلُّ القوة (البيانات الأساسية · التوظيف · حساب الدخول) والعُهد ومؤشرات الجاهزية'),
    'staff':     ('مدير الإدارة', 'الجدولُ الشهري للورديات واعتمادُه (يفتح سحب التقرير اليومي)'),
    'planning':  ('مدير الإدارة', 'حاويةُ الخطة التشغيلية (الحلقات ٤–٦)'),
    'plan':      ('مدير الإدارة', 'التشغيلُ الميداني: المواقع وخرائطها وعدساتها والاحتياج والتسكين'),
    'daily':     ('مدير الإدارة · المشرفون الميدانيون', 'المتابعةُ اليومية: الجولات ولوحاتها'),
    'dreport':   ('مدير الإدارة · المشرفون', 'التقريرُ اليومي: الحضور واعتماد الوردية'),
    'tasks':     ('مدير الإدارة', 'المهام: التكليف والمتابعة'),
    'profile':   ('الموظف نفسُه', 'صفحتي: المتابعةُ من الميدان للموظف'),
    'irshad':    ('مدير الإدارة · موظفو الاسترشاد', 'نظامُ الاسترشاد: سجلٌّ ميداني يومي بالوردية والموظف'),
    'seized':    ('مدير الإدارة · موظفو الضبط', 'نظامُ المضبوطات: سجلٌّ ميداني يومي بالوردية والموظف'),
    'dstats':    ('مدير النظام · مدخلو الإحصاءات', 'الإحصائياتُ اليومية: أرقام الحرمين (سجلٌّ عام)'),
    'award':     ('مدير الإدارة · لجنة التقييم', 'جائزةُ التميز: ترشيحُ الموظفين وتقييمُهم'),
    'kpis':      ('مدير الإدارة (عارض — المالكُ هو الصفحةُ الأصلية)', 'مؤشراتُ الإدارة: عارضٌ لا مالك (SOT-012)'),
}
NODATA = {'planning': 'none — حاويةٌ لا تكتب ولا تقرأ مفتاحاً بنفسها (التبويباتُ في وحداتها)', 'kpis': 'none — عارضٌ يرسم لوحاتِ الوحدات الأخرى بمحرّكاتها (المالكُ هو الصفحةُ الأصلية)'}
KEY_RX = re.compile(r"\bbassam_[a-z0-9_]+_v\d+\b")

def derive(slug, G=''):
    d = os.path.join(ROOT, 'src/modules', slug)
    parts = (json.load(open(os.path.join(d, 'meta.json'), encoding='utf-8')) if os.path.exists(os.path.join(d, 'meta.json')) else {}).get('logicParts') or []   # KIVO_265 · البند 19
    logic = ''.join(open(os.path.join(d, f), encoding='utf-8').read() for f in ['logic.js'] + parts)
    view = open(os.path.join(d, 'view.html'), encoding='utf-8').read() if os.path.exists(os.path.join(d, 'view.html')) else ''
    page = PAGE_OF.get(slug, slug)
    tree = J('src/manifests/perm-tree24.json')
    leaves = sorted({lf['owner'] for c in tree['containers'] for lf in c.get('leaves', []) if lf.get('page') == page})
    shown = sorted(k for k, v in tree.get('shownIn', {}).items() if slug == 'kpis' and v.get('container') == 'مؤشرات الإدارة')
    nav = NAV_OF.get(slug, slug)
    routes = ['#/' + nav] + (['#/sysadmin'] if slug == 'admin' else [])
    pat = re.compile(r"#/" + re.escape(nav) + r"\b|go\(\s*\w+\s*,\s*'" + re.escape(nav) + r"'|PAGES\s*=\s*\[[^\]]*'" + re.escape(nav) + r"'")   # المسار · go(p,'x') · قائمةُ صفحاتٍ تُزار كلُّها
    tests = []
    for sub in ('cfbench', 'tests/unit'):
        if not os.path.isdir(os.path.join(ROOT, sub)): continue   # المستودعُ الرسمي وحده: بلا cfbench (المختبر)
        for f in sorted(os.listdir(os.path.join(ROOT, sub))):
            if not f.endswith('.mjs'): continue
            try: s = open(os.path.join(ROOT, sub, f), encoding='utf-8').read()
            except OSError: continue
            if pat.search(s) and (sub == 'tests/unit' or f in G): tests.append(('gate:' + f) if sub == 'cfbench' else (sub + '/' + f))   # حزمُ البوابة باسمها لا بمسار المختبر (AUD-029)   # المشغَّلُ فعلاً: البوابةُ الدائمة أو اختبارُ وحدة
    return {
        'page': page, 'routes': routes,
        'ui': ['src/modules/%s/view.html' % slug, 'src/modules/%s/helmet.css' % slug],
        'domain': 'src/modules/%s/logic.js' % slug if not parts else ['src/modules/%s/%s' % (slug, f) for f in ['logic.js'] + parts],   # KIVO_265 · البند 19: الأجزاءُ مع الأصل
        'data': sorted(set(KEY_RX.findall(logic + view))) or [NODATA.get(slug, 'none')],
        'permissions': leaves if leaves else (['shownIn:' + k for k in shown] if shown else ['self (no tree leaf — every signed-in user)']),
        'tests': tests,
    }

def gate_files():
    gs = sorted(glob.glob(os.path.join(ROOT, 'gateall2[0-9][0-9].sh'))); g = gs[-1] if gs else ''   # أحدثُ بوابةٍ دائمة في المختبر (لا اسمَ مثبّتاً — AUD-029)
    return open(g, encoding='utf-8').read() if g and os.path.exists(g) else ''

def main(argv):
    mods = [p['slug'] for p in J('src/modules/modules.json')['pages']]
    write, bad = '--write' in argv, []
    G = gate_files()
    for slug in mods:
        mp = os.path.join(ROOT, 'src/modules', slug, 'meta.json')
        meta = json.load(open(mp, encoding='utf-8'))
        ch = meta.get('charter') or {}
        der = derive(slug, G)
        if write:
            own, pur = HUMAN[slug]
            meta['charter'] = dict({'owner': ch.get('owner') or own, 'purpose': ch.get('purpose') or pur}, **der)
            open(mp, 'w', encoding='utf-8').write(json.dumps(meta, ensure_ascii=False, indent=1) + '\n')
            continue
        for k in ('owner', 'purpose', 'page', 'routes', 'ui', 'domain', 'data', 'permissions', 'tests'):
            if not ch.get(k): bad.append(slug + ': الحقل «' + k + '» غائب أو فارغ')
        for k in ('page', 'routes', 'ui', 'domain', 'data', 'permissions', 'tests'):
            if k == 'tests' and not G:   # المستودعُ الرسمي بلا البوابة الدائمة (المختبر): الاختباراتُ المعلنة موجودةٌ وحسب
                miss = [t for t in ch.get(k) or [] if not os.path.exists(os.path.join(ROOT, t)) and not t.startswith(('cfbench/', 'gate:'))]
                if miss: bad.append(slug + ': اختبارٌ معلنٌ غائب ' + ', '.join(miss))
                continue
            if ch.get(k) and ch.get(k) != der[k]: bad.append(slug + ': «' + k + '» لا يطابق المصدر (أعد --write) — المصدر: ' + json.dumps(der[k], ensure_ascii=False)[:160])
        for f in (ch.get('ui') or []) + (ch.get('domain') if isinstance(ch.get('domain'), list) else [ch.get('domain') or '']):
            if f and not os.path.exists(os.path.join(ROOT, f)) and not f.endswith('helmet.css'): bad.append(slug + ': ملفٌّ غائب ' + f)
        if G and ch.get('tests') and not any(t.split(':', 1)[-1] in G or t.startswith('tests/unit/') for t in ch['tests']):
            bad.append(slug + ': لا اختبارَ من اختباراتها في البوابة الدائمة ولا اختبارَ وحدة')
    if write: print('كُتب الميثاقُ في ' + str(len(mods)) + ' وحدة'); return 0
    for b in bad: print('  ✘', b)
    print('النتيجة: ' + str(len(mods)) + ' وحدة بميثاقٍ كامل (owner · UI · domain · data · permissions · tests) · ' + str(len(bad)) + ' مخالفة')
    return 1 if bad else 0

if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
