#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO_263 · SOT-157 — جردُ حالات الشاشات (تحميل · فارغ · خطأ · بلا اتصال · أعد المحاولة) مولَّدٌ من الكود لا مكتوبٌ باليد
(كان docs/ux-states.md جرداً ساكناً من KIVO_252 فتقادم: لافتةُ «بلا اتصال» أُضيفت في 254 والجردُ يقول «لا تنبيه»).
     python3 tools/ux_states.py           يكتب docs/ux-states.md
     python3 tools/ux_states.py --check   يعيد التوليد ويقارن (exit 1 عند فرق) + الآلياتُ العامة موجودةٌ في مواضعها + سقّاطةٌ لكل وحدة
المنهج لكل وحدة (view.html والمنطق وأجزاؤه المعلنة في Manifest؛ يشمل catch لمعالجة async): عدُّ المواضع بأنماطٍ ثابتة (أدناه) — مقياسٌ للحضور لا للجودة؛ والتحقّقُ الحيّ في
k253offline.mjs (اللافتة والطابور) · k254ux.mjs (الهيكل · أعد المحاولة · h1) · ack.mjs (لا «تمّ» قبل الإقرار)."""
import os, re, sys, json
from page_modules import read_logic
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
]
def mods():
    d = os.path.join(ROOT, 'src', 'modules')
    return sorted(m for m in os.listdir(d) if os.path.isdir(os.path.join(d, m)))
def count(m):
    d=os.path.join(ROOT,'src','modules',m)
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
    try: title = json.load(open(os.path.join(ROOT, 'src', 'modules', m, 'meta.json'), encoding='utf-8')).get('name', '')
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
    for x in bad: print('  ✘', x)
    print('النتيجة: حالاتُ الشاشات — %d وحدة · %d آليةً عامة · %d مخالفة' % (len(cur), len(GLOBAL), len(bad)))
    return 1 if bad else 0
if __name__ == '__main__':
    sys.exit(main())
