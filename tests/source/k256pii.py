# -*- coding: utf-8 -*-
# KIVO_256: نسخةٌ من k255pii.py (الافتراضيُّ pk256) — لا تغييرَ في الفحص
"""KIVO_252 (مشتقٌّ من k243pii.py — إفصاح: الفحصُ الأخير وحده: _worker.js لم يعد = KIVO_240 بعد نزع إدراجات KIVO_243 (تعديلاتُ RM-1 خارج الوحدة: session · ping · مدخلا الإنفاذ)؛
     فصار: الأنماطُ نفسُها كلُّها تُفحص على نصّ _worker.js كاملاً مقابل KIVO_240 (لا مطابقةَ جديدة) — والفرقُ بالضبط عن KIVO_243 يثبته k244src.py بإعادة الرقعة)
   KIVO_243 (مشتقٌّ من k242pii.py — إفصاح: تغييرٌ واحد في الفحص الأخير وحده: _worker.js لم يعد = KIVO_240 بايتاً بالتصميم (وحدةُ الإنفاذ)؛
     فصار: نزعُ الإدراجات المعلنة يعيد KIVO_240 بايتاً (splice.py --unsplice) + الأنماطُ نفسُها كلُّها تُفحص على نصّ _worker.js كاملاً
     فلا يطابقها فيه شيءٌ غيرُ ما في خادم KIVO_240 — أي وحدةُ الإنفاذ لا تحمل رقماً أو هويةً أو بريداً أو بصمةً أو رمزاً)
   KIVO_242 · G9 — خصوصيةُ الأصول الثابتة (Python · بلا خادم)
   كلُّ ما يُقدَّم علناً من dist/ (الغلاف · /assets/** · البيان · الأيقونات · robots) — ومعه نصوصُ الصفحات المفكوكة — يُفحص:
   لا أرقامَ جوال · لا أرقامَ هوية (بخوارزمية التحقّق السعودية) سوى ثابتَين معروفَين · لا بريدَ سوى أمثلةٍ صريحة · لا بصماتِ كلمات مرور
   · لا مفاتيحَ ولا رموزَ وصول · لا كوكي جلسة · لا __BS_BOOT ببيانات · ونصوصُ الملفات الثنائية (PNG/woff2/ico) كذلك.
   ومجموعةُ كلِّ ما يطابق الأنماطَ في المرشَّح ⊆ مثيلتُها في KIVO_240 (المقدَّمة لكل زائرٍ اليوم) — فلا جديدَ يُكشف. (_worker.js لا يُقدَّم: k242cache)"""
import sys, os, re, json, base64, zlib, struct

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DIR = os.path.abspath(os.path.join(ROOT, sys.argv[1] if len(sys.argv) > 1 else 'pk256'))
npass = nfail = 0


def ok(c, n, x=''):
    global npass, nfail
    if c: npass += 1
    else: nfail += 1
    print(('  ✔ ' if c else '  ✘ ') + n + (('   ← ' + str(x)[:400]) if x != '' else ''))
    return bool(c)


def nid_valid(s):
    t = 0
    for i, ch in enumerate(s):
        d = int(ch)
        if i % 2 == 0: d *= 2; d = d // 10 + d % 10
        t += d
    return t % 10 == 0


PAT = {
    'جوال': re.compile(r'(?<![\w.])(?:\+?9665|009665|05)\d{8}(?!\w)'),
    'هوية': re.compile(r'(?<![\w.$#-])[12]\d{9}(?![\w])'),
    'بريد': re.compile(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}'),
    'بصمة كلمة مرور': re.compile(r'p1\$[0-9a-z]{4,}\.[0-9a-z]{4,}|pbkdf2[_$:]|\$2[aby]\$\d\d\$'),
    'مفتاح خاص': re.compile(r'-----BEGIN [A-Z ]*PRIVATE KEY-----'),
    'رمز وصول': re.compile(r'AKIA[0-9A-Z]{16}|eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|[Bb]earer\s+[A-Za-z0-9._-]{24,}|gh[pousr]_[A-Za-z0-9]{30,}|xox[baprs]-[A-Za-z0-9-]{10,}|sk_live_[A-Za-z0-9]{10,}'),
    'كوكي الجلسة': re.compile(r'bs_tok=[A-Za-z0-9._-]{8,}'),
    'بيانات إقلاع': re.compile(r'window\.__BS_BOOT\s*=\s*\{'),
}
ALLOW = {'هوية': {'2147482000': 'z-index في CSS (ليس هوية)', '1010101010': 'هويةُ الصفّ النموذجيّ في قالب استيراد الموظفين — يُتخطّى عمداً'},
         'بريد': {'name@example.com': 'مثالٌ في نصّ إرشادي', 'name@example.gov.sa': 'مثالٌ في نصّ إرشادي'}}
HIDDEN = {'_worker.js', '_routes.json', '_headers'}


def png_text(b):
    out, i = [], 8
    while i + 8 <= len(b):
        n, typ = struct.unpack('>I4s', b[i:i + 8])
        if typ in (b'tEXt', b'iTXt', b'zTXt'): out.append(b[i + 8:i + 8 + n].decode('latin-1', 'replace'))
        i += 12 + n
    return out


def corpus(d, public_only=True):
    out = []
    for r, _, fs in os.walk(d):
        for f in fs:
            p = os.path.join(r, f); rel = os.path.relpath(p, d)
            if public_only and rel in HIDDEN: continue
            b = open(p, 'rb').read()
            if f.endswith(('.woff2', '.png', '.ico')):
                out.append(('BIN:' + rel, ' '.join(s.decode('ascii') for s in re.findall(rb'[\x20-\x7e]{6,}', b))))
                if f.endswith('.png'): out += [(rel + ' (tEXt)', t) for t in png_text(b)]
                continue
            t = b.decode('utf-8'); out.append((rel, t))
            m = re.search(r'var pages *= *(\{.*?\});\s*\n', t, re.S)
            if m:
                for k, v in json.loads(m.group(1)).items(): out.append((rel + '#' + k, zlib.decompress(base64.b64decode(v)).decode('utf-8')))
    return out


def scan(c):
    hits = {k: {} for k in PAT}
    for rel, t in c:
        for k, rx in PAT.items():
            if rel.startswith('BIN:') and k in ('جوال', 'هوية', 'بريد'): continue   # بايتاتٌ مضغوطة تُخرج شبيهَ بريدٍ ورقمٍ عشوائياً؛ نصوصُ PNG الوصفية (tEXt) تُفحص بكل الأنماط
            for m in rx.finditer(t):
                v = m.group(0)
                if k == 'هوية' and not nid_valid(v): continue
                hits[k].setdefault(v, rel)
    return hits


C = corpus(DIR); H = scan(C)
# KIVO_252: خطُّ الأساس (ما كان مطابقاً للأنماط في KIVO_240 المقدَّمة) يُقرأ من pk240 إن وُجدت، وإلا من اللقطة المُلتزَمة tests/source/pii_baseline_240.json
# (الملفُ يُكتب من pk240 بـ --write-baseline مرّةً؛ pk240 غيرُ قابلةٍ لإعادة الإنتاج ولا تُلتزَم) — فالبرهانُ يعمل في استنساخٍ نظيف
BASE_J = os.path.join(ROOT, 'tests', 'source', 'pii_baseline_240.json')
if os.path.isdir(os.path.join(ROOT, 'pk240')):
    K = scan(corpus(os.path.join(ROOT, 'pk240'))); WK = scan([('_worker.js', open(os.path.join(ROOT, 'pk240/_worker.js'), 'rb').read().decode('utf-8'))])
    if '--write-baseline' in sys.argv: json.dump({'K': {k: sorted(v) for k, v in K.items()}, 'WK': {k: sorted(v) for k, v in WK.items()}}, open(BASE_J, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print('baseline written:', BASE_J)
else:
    BJ = json.load(open(BASE_J, encoding='utf-8')); K = {k: {v: 'baseline' for v in BJ['K'].get(k, [])} for k in PAT}; WK = {k: {v: 'baseline' for v in BJ['WK'].get(k, [])} for k in PAT}
    print('   (pk240 غيرُ متاح — خطُّ الأساس من ' + os.path.relpath(BASE_J, ROOT) + ')')
nfiles = len([1 for r, _, fs in os.walk(DIR) for f in fs if os.path.relpath(os.path.join(r, f), DIR) not in HIDDEN])
print('╔═ الملفاتُ العلنية في المرشَّح (%d) ونصوصُ الصفحات المفكوكة — %d نصّاً مفحوصاً ═╗' % (nfiles, len(C)))
for k in PAT:
    found = H[k]; allow = ALLOW.get(k, {})
    bad = {v: r for v, r in found.items() if v not in allow}
    ok(not bad, ('★ ' if k in ('جوال', 'هوية', 'بريد', 'بصمة كلمة مرور', 'رمز وصول', 'بيانات إقلاع') else '   ') + k + ': ' + ('لا شيء' if not found else 'لا شيءَ سوى المعروف المعلَّل (' + ' · '.join(v + ' = ' + allow.get(v, '؟') for v in found) + ')'),
       json.dumps(dict(list(bad.items())[:3]), ensure_ascii=False) if bad else '')
newer = {k: sorted(set(H[k]) - set(K[k])) for k in PAT}
ok(all(not v for v in newer.values()), '★ كلُّ ما يطابق الأنماطَ في المرشَّح موجودٌ أصلاً في KIVO_240 المقدَّمة اليوم — لا جديدَ يُكشف', json.dumps({k: v for k, v in newer.items() if v}, ensure_ascii=False))
WH = scan([('_worker.js', open(os.path.join(DIR, '_worker.js'), 'rb').read().decode('utf-8'))])
wnew = {k: sorted(set(WH[k]) - set(WK[k])) for k in PAT}
ok(all(not v for v in wnew.values()), '   _worker.js (غيرُ مُقدَّم علناً): كلُّ الأنماط على نصّه كاملاً — لا مطابقةَ جديدة عن KIVO_240 (KIVO_252: الفرقُ عن KIVO_243 يثبته k244src.py)', json.dumps({'new': {k: v for k, v in wnew.items() if v}}, ensure_ascii=False))
print('\n══ النتيجة: نجح %d | أخفق %d ══' % (npass, nfail))
sys.exit(1 if nfail else 0)
