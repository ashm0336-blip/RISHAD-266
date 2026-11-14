#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO_263 · SOT-157 — جردُ حالات الشاشات (تحميل · فارغ · خطأ · بلا اتصال · أعد المحاولة) مولَّدٌ من الكود لا مكتوبٌ باليد
(كان docs/ux-states.md جرداً ساكناً من KIVO_252 فتقادم: لافتةُ «بلا اتصال» أُضيفت في 254 والجردُ يقول «لا تنبيه»).
     python3 tools/ux_states.py           يكتب docs/ux-states.md
     python3 tools/ux_states.py --check   يعيد التوليد ويقارن (exit 1 عند فرق) + الآلياتُ العامة موجودةٌ في مواضعها + سقّاطةٌ لكل وحدة
     python3 tools/ux_states.py --report  يطبع القائمة الكاملة للقاعدة الجديدة (V7 UX — وضعُ تقريرٍ لا يُفشل البناء): حالاتُ صفحةٍ خارج المكوّن الموحَّد
المنهج لكل وحدة (view.html والمنطق وأجزاؤه المعلنة في Manifest؛ يشمل catch لمعالجة async): عدُّ المواضع بأنماطٍ ثابتة (أدناه) — مقياسٌ للحضور لا للجودة؛ والتحقّقُ الحيّ في
k253offline.mjs (اللافتة والطابور) · k254ux.mjs (الهيكل · أعد المحاولة · h1) · ack.mjs (لا «تمّ» قبل الإقرار)."""
import os, re, sys, json
from page_modules import read_logic
import systems_paths   # V7 · الحزمة ب
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'ux-states.md'); BL = os.path.join(ROOT, 'tools', 'ux_states.json')
PAT = {
    'فارغ': r'(?:["\'>«]\s*)(?:لا (?:توجد|يوجد|بيانات|نتائج|[؀-ۿ]{2,}\s[؀-ۿ]{2,})|(?:الملف|القائمة) فارغ(?:ة)?)',
    'تحميل': r'BassamBusy|bsBusy|جارٍ|جاري |skeleton|bs-skel',
    'خطأ': r'تعذّر|تعذر|فشل|bsErrBar|(?:\.catch|\bcatch)\s*\(',
    'بلا اتصال': r'onLine|[\'"]offline[\'"]|BassamLink|انقطع الاتصال',
    'أعد المحاولة': r'أعد المحاولة|إعادة المحاولة|retry\(',
}
# These flows moved out of page methods into shared services. Attribute their
# states only to pages that directly use the namespace, once per service.
SHARED = {
    'BassamEmpImp': 'src/services/590-employees-import.js',
    'Custody': 'src/services/547-custody-api.js',
    'BackupRestore': 'src/services/548-atomic-backup.js',
}
GLOBAL = [  # (الحالة · الآلية · الملف · نصٌّ يجب أن يوجد فيه)
    ('تحميلُ الصفحة', 'الصفحاتُ كسولة؛ مؤشرُ التحميل الموحَّد `KIVO.BassamBusy` (start · wrap · run · flash)', 'src/components/550-bassam-busy.js', 'KIVO.BassamBusy ='),
    ('فشلُ جلب الصفحة/المنطق', 'إعادةُ المحاولة تلقائياً عند عودة الاتصال (`online`)', 'src/core/050-dc-runtime.js', 'addEventListener("online", retry)'),
    ('خطأٌ عام في الواجهة', 'شريطُ الخطأ الموحَّد `#bsErrBar`', 'src/core/130-error-bar.js', 'bsErrBar'),
    ('بلا اتصال (الحاسوب)', 'مؤشرُ «حالة الاتصال» الدائم في القائمة الجانبية: متصل · انقطع الاتصال · محلي', 'src/components/240-bassam-link.js', 'انقطع الاتصال'),
    ('بلا اتصال (الجوال)', 'لافتةُ `.bs-netbar` لحظةَ الانقطاع (role=status) وتتحوّل عند العودة — KIVO_254', 'src/components/240-bassam-link.js', 'bs-netbar'),
    ('الكتابةُ المعلَّقة', '`KIVO.BassamAck`: رسالةُ النجاح بعد إقرار الخادم وحده', 'src/core/300-bassam-ack.js', 'KIVO.BassamAck ='),
    ('أولُ تحميلٍ وفشلُ تحميل الشاشة', 'مكوّنُ حالات الصفحة الموحَّد `KIVO.PageStates` (هيكلٌ واحد · تحديث · فشل · فارغ) — به قاعدةُ الغلاف الواحدة لكل مسار: رأسٌ وهيكل، أو محتوى الذاكرة مع الخط والشارة (V7 UX)', 'src/components/555-page-states.js', 'KIVO.__dcStates ='),
]
# ── V7 UX · القاعدةُ الجديدة — وضعُ «تقرير» فقط (تُطبع المخالفات ولا يفشل البناء بعد؛ تنقلب «إفشالاً» عند إغلاق الترحيل) ──────────────
# حالاتُ الصفحة (تحميل · تحديث · فشل تحميل · فارغ) تمرّ بمكوّنٍ واحد. خارج المكوّن يُعدّ مخالفةً:
#   U1 نصُّ تحميلِ قراءة («جارٍ قراءة/تحميل/جلب…») · U2 هيكلٌ .bs-skel · U3 زرُّ/نصُّ «أعد المحاولة» · U4 صفحةٌ في pages.json بلا المكوّن ولا إعفاء.
# ما ليس تحميلَ صفحة مسموحٌ بسببه المكتوب (ALLOW): تقدّمُ العمليات والحفظ · «تحميل المزيد» · الحوارات (مؤجَّلة للمرحلة الثانية).
UNIFIED = 'src/components/555-page-states.js'
U_PAT = {
    'U1': r'(?:جارٍ|جاري) (?:قراءة|تحميل|جلب|التحميل|القراءة|التحقّق)',
    'U2': r'bs-skel',
    'U3': r'أعد المحاولة|إعادة المحاولة',
}
U_SCAN = ('src/modules', 'src/layouts', 'src/components', 'src/services', 'src/core', 'src/systems')   # V7 · الحزمة ب: واجهةُ الأنظمة المنقولة (client/ وحده — أدناه)
ALLOW = [  # (بادئةُ المسار · القاعدة أو * · نمطُ السطر · السبب)
    (UNIFIED, '*', r'', 'المكوّنُ نفسُه'),
    ('src/styles/555-page-states.css', '*', r'', 'أنماطُ المكوّن'),
    ('src/components/550-bassam-busy.js', '*', r'', 'تقدّمُ العمليات (تصدير · استيراد · طباعة · رفع) — ليس تحميلَ صفحة'),
    ('src/layouts/helmet-global.css', 'U2', r'', 'تعريفُ ‎.bs-skel‎ نفسِه (يستعمله المكوّن)'),
    ('src/core/030-pages-loader.lazy-guard.js', 'U3', r'', 'بطاقةُ انتهاء الجلسة وبديلُ غياب المكوّن — خارج المكوّن بقرار (البند ٣)'),
    ('src/', 'U3', r'(?:أعد|إعادة) المحاولة(?![^"\'`<]*</button>)[^"\'`]*(?:مسودت|الحفظ|حفظ|الإجراء|الاعتماد|الرفع|التصدير|الاستيراد|الطباعة)|(?:مسودت|الحفظ|حفظ|الإجراء|الاعتماد|الرفع|التصدير|الاستيراد|الطباعة)[^"\'`]*(?:أعد|إعادة) المحاولة', 'جملةٌ في رسالة حفظٍ أو عملية — ليست زرَّ إعادة تحميل'),
    ('src/', 'U1', r'تحميل (?:المزيد|بقية|حركات أخرى|أصناف أخرى)', '«تحميل المزيد» — ذيلُ قائمة (البند ١٨)'),
]
EXEMPT = {  # صفحاتٌ لا تحميلَ خاصاً لها (U4) — وسببُ كلٍّ
    'planning': 'حاوية: تعرض هيكلَ صفحتها المضمَّنة وحده (وهامشُ حجمها ٣٧ بايتاً)', 'daily': 'حاويةُ تبويبات', 'links': 'من ذاكرة الإقلاع — بلا تحميل', 'help': 'بلا قالب صفحة',
}
def unified_report(root=None):
    """يعيد قائمة (القاعدة، الملف، السطر، النص) لكل موضعٍ خارج المكوّن — للتقرير وحده."""
    root = root or ROOT; out = []
    def allowed(rel, rule, line):
        for prefix, r, pat, _why in ALLOW:
            if rel.startswith(prefix) and r in ('*', rule) and (not pat or re.search(pat, line)): return True
        return False
    for base in U_SCAN:
        for d, _dirs, files in os.walk(os.path.join(root, base)):
            for f in sorted(files):
                if not f.endswith(('.js', '.html', '.css')): continue
                p = os.path.join(d, f); rel = os.path.relpath(p, root).replace(os.sep, '/')
                if rel.startswith('src/systems/') and rel.split('/')[3] != 'client': continue
                try: lines = open(p, encoding='utf-8').read().split('\n')
                except (OSError, UnicodeDecodeError): continue
                for i, line in enumerate(lines, 1):
                    for rule, pat in U_PAT.items():
                        m = re.search(pat, line)
                        if m and not allowed(rel, rule, line): out.append((rule, rel, i, line[max(0, m.start() - 30):m.end() + 40].strip()))
    try:
        pages = json.load(open(os.path.join(root, 'src', 'manifests', 'pages.json'), encoding='utf-8'))['pages']
    except (OSError, ValueError, KeyError): pages = []
    for pg in pages:
        if pg['key'] in EXEMPT: continue
        slug = pg.get('module')
        d = systems_paths.module_dir(os.path.join(root, 'src'), slug) if slug else os.path.join(root, 'src', 'modules', '')   # V7 · الحزمة ب
        if not slug or not os.path.isdir(d): out.append(('U4', 'src/manifests/pages.json', 0, pg['key'] + ': بلا وحدةٍ ولا إعفاء')); continue
        try: meta = json.load(open(os.path.join(d, 'meta.json'), encoding='utf-8'))
        except (OSError, ValueError): meta = {}
        src = read_logic(d, meta) if os.path.exists(os.path.join(d, 'logic.js')) else ''
        if not re.search(r'\bPageStates\b', src): out.append(('U4', 'src/' + systems_paths.module_rel(os.path.join(root, 'src'), slug), 0, pg['key'] + ': لا تستعمل KIVO.PageStates لحالاتها الخاصة (بوابةُ الغلاف تغطي أول تحميلها وفشله)'))
    return out
def print_report(full):
    found = unified_report(); by = {}
    for rule, rel, _i, _s in found: by.setdefault(rule, {}).setdefault(rel, 0); by[rule][rel] += 1
    names = {'U1': 'نصُّ تحميل قراءة', 'U2': 'هيكل .bs-skel', 'U3': '«أعد المحاولة»', 'U4': 'صفحةٌ بلا المكوّن'}
    print('  ⓘ تقرير (لا يُفشل البناء): حالاتٌ خارج مكوّن حالات الصفحة — ' + ' · '.join(k + ' ' + names[k] + ': ' + str(sum(by.get(k, {}).values())) + ' في ' + str(len(by.get(k, {}))) + ' ملفاً' for k in names))
    if full:
        for rule, rel, i, s in found: print('    ' + rule + ' ' + rel + (':' + str(i) if i else '') + '  ' + s)
    else: print('    (القائمة الكاملة: python3 tools/ux_states.py --report)')
    return found
def mods():
    d = os.path.join(ROOT, 'src', 'modules')
    return sorted([m for m in os.listdir(d) if os.path.isdir(os.path.join(d, m))] + [m for m, p in systems_paths.module_dirs(os.path.join(ROOT, 'src')).items() if not p.startswith(d + os.sep)])   # V7 · الحزمة ب
def count(m):
    d=systems_paths.module_dir(os.path.join(ROOT,'src'),m)   # V7 · الحزمة ب
    try: meta=json.load(open(os.path.join(d,'meta.json'),encoding='utf-8'))
    except (OSError,ValueError): meta={}
    t=read_logic(d,meta) if os.path.exists(os.path.join(d,'logic.js')) else ''
    view=os.path.join(d,'view.html')
    if os.path.exists(view):t+='\n'+open(view,encoding='utf-8').read()
    direct = t
    for namespace, rel in SHARED.items():
        if re.search(r'\bKIVO\.' + re.escape(namespace) + r'\b', direct):
            t += '\n' + open(os.path.join(ROOT, rel), encoding='utf-8').read()
    title = ''
    try: title = json.load(open(os.path.join(systems_paths.module_dir(os.path.join(ROOT, 'src'), m), 'meta.json'), encoding='utf-8')).get('name', '')
    except Exception: pass
    return title, {k: len(re.findall(v, t)) for k, v in PAT.items()}
def render():
    L = ['# جردُ حالات الشاشات: تحميل · فارغ · خطأ · بلا اتصال · أعد المحاولة (SOT-157)', '',
         '> **مولَّدٌ** بـ`python3 tools/ux_states.py` من الكود (لا يُحرَّر يدوياً) · `--check` في `npm run check` (سكربتُ `check:<N>` للإصدار الجاري) يفشل عند الفرق أو غياب آليةٍ عامة أو نقصِ حالةٍ عن خطّ الأساس (`tools/ux_states.json`).',
         '> العدُّ مقياسُ حضورٍ بأنماطٍ ثابتة (`PAT` في الأداة) لا مقياسُ جودة؛ والتحقّقُ الحيّ: `k253offline.mjs` · `k254ux.mjs` · `ack.mjs` في البوابة الدائمة.', '',
         '> تُحتسب حالات خدمات الاستيراد والعهد والاستعادة المشتركة مرة واحدة للوحدة التي تستدعيها مباشرة؛ نقل الوظيفة إلى خدمة لا يلغي حالتها من الجرد.', '',
         '## الآلياتُ العامة (كل الشاشات — مُتحقَّقٌ من وجودها في موضعها)', '| الحالة | الآلية | الموضع |', '|---|---|---|']
    for s, mech, f, _ in GLOBAL: L.append('| ' + s + ' | ' + mech + ' | `' + f + '` |')
    L += ['', '## لكل وحدة', '| الوحدة | ' + ' | '.join(PAT) + ' |', '|---|' + '---|' * len(PAT)]
    for m in mods():
        title, c = count(m)
        L.append('| ' + m + (' (' + title + ')' if title else '') + ' | ' + ' | '.join(str(c[k]) for k in PAT) + ' |')
    L += ['', '## القراءة',
          '- **بلا اتصال وأعد المحاولة** آليتان عامتان: المؤشر واللافتة يعلنان الانقطاع. الموارد القديمة تتزامن عبر `/api/changes`، والمجالات العلائقية تستعمل واجهاتها الخادمية وتبقي المسودة عند الفشل حتى تأكيد الحفظ؛ صفر الوحدة وحده لا يثبت غياب المعالجة.',
          '- **حاويةُ التبويبات** `planning` بلا حالاتٍ خاصة (حالاتُها في staff/plan).',
          '- ما يحتاج قرارَ تصميم (توحيدُ صياغة «لا توجد …» ↔ «لا …» في النصوص المركزية) مرتبطٌ بـSOT-116 (i18n — غيرُ منفَّذ).', '']
    return '\n'.join(L)
def main():
    txt = render(); bad = []
    for s, _, f, needle in GLOBAL:
        p = os.path.join(ROOT, f)
        if not os.path.exists(p) or needle not in open(p, encoding='utf-8').read(): bad.append('آليةٌ عامة غائبة: ' + s + ' ← ' + f)
    cur = {m: count(m)[1] for m in mods()}
    if '--write-baseline' in sys.argv:
        json.dump({'note': 'KIVO_263 · SOT-157: خطُّ أساس حالات الشاشات — لا تنقص حالةٌ لوحدة', 'modules': cur}, open(BL, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    if os.path.exists(BL):
        b = json.load(open(BL, encoding='utf-8'))['modules']
        for m, c in b.items():
            for k, v in c.items():
                if cur.get(m, {}).get(k, 0) < v: bad.append('نقصت حالةُ «' + k + '» في ' + m + ': ' + str(cur.get(m, {}).get(k, 0)) + ' < ' + str(v))
    if '--check' in sys.argv:
        same = os.path.exists(OUT) and open(OUT, encoding='utf-8').read() == txt
        if not same: bad.append('docs/ux-states.md ≠ التوليد (شغّل tools/ux_states.py)')
    else:
        open(OUT, 'w', encoding='utf-8').write(txt)
    print_report('--report' in sys.argv)                                  # V7 UX: تقريرٌ فقط — لا يدخل في bad ولا في رمز الخروج
    for x in bad: print('  ✘', x)
    print('النتيجة: حالاتُ الشاشات — %d وحدة · %d آليةً عامة · %d مخالفة' % (len(cur), len(GLOBAL), len(bad)))
    return 1 if bad else 0
if __name__ == '__main__':
    sys.exit(main())
