#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO_248 · RM-3 خطوة ١ (SOT-066/067 · ENG-13) — طبقاتُ الرموز: primitives → semantic → literal (الحرفية المسمّاة بالكود)
   python3 tools/tokens.py extract <src>     : يقرأ 070/080 ويكتب design/tokens.json (primitives المشتقّة من القيم الخام · semantic · literal · dark)
   python3 tools/tokens.py emit <src>        : يولّد 070-theme-tokens.css و 080-theme-dark.css من design/tokens.json (حتمي · بايتاً)
   python3 tools/tokens.py verify <src> <ref-src> : يثبت أن القيمةَ المحسوبة لكل رمز (فاتح وداكن · بعد حلّ var) = المرجع حرفاً — لا تغييرَ بصرياً
   القاعدة: القيمُ الخام (hex/rgba) لا تظهر إلا في primitives (--p-…)؛ semantic وliteral مراجعُ var(...) فقط."""
import os, sys, re, json, collections
import os, sys, json
# KIVO_251 · ADR-012: مساراتُ الرموز والأنماط من <src>/layout.json (styles · tokens)؛ غيابُه = التخطيطُ الانتقالي
def _lay(src):
    L = {'styles': 'client/css', 'tokens': 'design/tokens.json'}; p = os.path.join(src, 'layout.json')
    if os.path.exists(p): L.update({k: v for k, v in json.load(open(p, encoding='utf-8')).items() if k in L})
    return L
def CSS(src, name): return os.path.join(src, _lay(src)['styles'], name)
def TOK(src): return os.path.join(src, _lay(src)['tokens'])

RE_DECL = re.compile(r'--([a-z][a-z0-9-]*):([^;]+);')
LIT = re.compile(r'^(bg|fg|bd)-(x[0-9a-f]{3,8}|a[0-9]+p?[0-9]*)$')
norm = lambda v: re.sub(r'\s+', '', v.strip())
def pname(v):
    """اسمُ البدائيّ من قيمته: #B99751 → p-b99751 · rgba(185,151,81,0.35) → p-a185-151-81-35 · rgba(255,255,255,0) → p-a255-255-255-0"""
    v = norm(v).lower()
    if v.startswith('#'): return 'p-' + v[1:]
    m = re.match(r'rgba?\((\d+),(\d+),(\d+)(?:,([0-9.]+))?\)', v)
    if m:
        a = m.group(4); a = '' if a is None else ('-' + re.sub(r'^0\.', '', a).replace('.', 'p'))
        return 'p-a' + m.group(1) + '-' + m.group(2) + '-' + m.group(3) + a
    return None
def parse(src):
    L = open(CSS(src, '070-theme-tokens.css'), encoding='utf-8').read(); D = open(CSS(src, '080-theme-dark.css'), encoding='utf-8').read()
    assert L.startswith(':root{color-scheme:light;') and L.endswith('}') and D.startswith('@media screen{html[data-theme="dark"]{color-scheme:dark;') and D.endswith('}}')
    light = [(k, v) for k, v in RE_DECL.findall(L)]; dark = [(k, v) for k, v in RE_DECL.findall(D)]
    return light, dark
def extract(src):
    light, dark = parse(src)
    prims = collections.OrderedDict(); semantic = []; literal = []
    def ref(v):
        if 'var(' in v or pname(v) is None: return v
        n = pname(v); prims.setdefault(n, norm(v)); return 'var(--' + n + ')'
    for k, v in light:
        (literal if LIT.match(k) else semantic).append({'name': k, 'value': ref(v), 'was': norm(v)})
    darkOut = [{'name': k, 'value': ref(v), 'was': norm(v)} for k, v in dark]
    out = {'version': 1, 'note': 'مصدرُ الرموز: primitives (قيمٌ خام مسمّاة) → semantic (أدوارٌ) → literal (الحرفية المسمّاة بالكود، مراجعُ فقط)؛ tokens.py emit يولّد ملفَّي CSS بايتاً · verify يثبت تساوي القيم المحسوبة مع المرجع',
           'primitives': [{'name': n, 'value': v} for n, v in prims.items()], 'semantic': semantic, 'literal': literal, 'dark': darkOut}
    os.makedirs(os.path.join(src, 'design'), exist_ok=True)
    json.dump(out, open(TOK(src), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('extract: primitives', len(prims), '· semantic', len(semantic), '· literal', len(literal), '· dark', len(darkOut))
def emit(src):
    T = json.load(open(TOK(src), encoding='utf-8'))
    L = ':root{color-scheme:light;' + ''.join('--' + p['name'] + ':' + p['value'] + ';' for p in T['primitives']) + ''.join('--' + t['name'] + ':' + t['value'] + ';' for t in T['semantic'] + T['literal']) + '}'
    D = '@media screen{html[data-theme="dark"]{color-scheme:dark;' + ''.join('--' + t['name'] + ':' + t['value'] + ';' for t in T['dark']) + '}}'
    open(CSS(src, '070-theme-tokens.css'), 'w', encoding='utf-8', newline='').write(L)
    open(CSS(src, '080-theme-dark.css'), 'w', encoding='utf-8', newline='').write(D)
    print('emit: 070', len(L), 'B · 080', len(D), 'B')
def resolve(decls, dark=None):
    """القيمةُ المحسوبة لكل رمز بعد حلّ سلاسل var(...) (الداكن يُطبَّق فوق الفاتح)"""
    m = collections.OrderedDict(decls)
    if dark: m.update(dark)
    def val(v, depth=0):
        if depth > 12: return v
        return re.sub(r'var\(--([a-z][a-z0-9-]*)\)', lambda g: val(m.get(g.group(1), 'UNDEFINED(' + g.group(1) + ')'), depth + 1), v)
    return {k: norm(val(v)) for k, v in m.items()}
def verify(src, ref, declared=None):
    """KIVO_254: --declared <json> يحمل تغييراتٍ مقصودة {"tokens": {"<name>": "<السبب>"}, "new": {"<name>": "<السبب>"}} — كلُّ فرقٍ خارجها إخفاق،
       وكلُّ مُعلَنٍ لم يعد فرقاً يُطبع تنبيهاً (لا تغييرَ غيرَ مفهوم ولا إعلانَ ميّت)"""
    D = {'tokens': {}, 'new': {}}
    if declared: D.update(json.load(open(declared, encoding='utf-8')))
    l1, d1 = parse(src); l0, d0 = parse(ref)
    A, B = resolve(l0), resolve(l1); keys = [k for k, _ in l0]
    bad = [k for k in keys if A.get(k) != B.get(k)]
    Ad, Bd = resolve(l0, d0), resolve(l1, d1); badd = [k for k in keys if Ad.get(k) != Bd.get(k)]
    extra = [k for k in B if k not in A and not k.startswith('p-')]
    undefined = [k for k, v in list(B.items()) + list(Bd.items()) if 'UNDEFINED' in v]
    decl_ok = set(D['tokens']); new_ok = set(D['new'])
    badU = [k for k in bad if k not in decl_ok]; baddU = [k for k in badd if k not in decl_ok]; extraU = [k for k in extra if k not in new_ok]
    dead = [k for k in decl_ok if k not in bad and k not in badd] + [k for k in new_ok if k not in extra]
    print(('✔' if not (badU or baddU or extraU or undefined or dead) else '✘') + ' القيمُ المحسوبة لـ' + str(len(keys)) + ' رمزاً = المرجع حرفاً عدا المعلَن (فاتح: ' + str(len(bad)) + ' فرق منها ' + str(len(badU)) + ' غيرُ معلَن · داكن: ' + str(len(badd)) + ' منها ' + str(len(baddU)) + ' غيرُ معلَن · رموزٌ جديدة غيرُ بدائية: ' + str(len(extra)) + ' منها ' + str(len(extraU)) + ' غيرُ معلَن · مراجعُ غيرُ معرَّفة: ' + str(len(undefined)) + ' · إعلاناتٌ ميّتة: ' + str(len(dead)) + ')')
    if badU[:5] or baddU[:5] or extraU[:5] or dead[:5]: print('   ', badU[:5], baddU[:5], extraU[:5], dead[:5])
    for k in sorted(set(bad + badd)):
        if k in decl_ok: print('   ✎ ' + k + ': ' + (A.get(k) or '—') + ' → ' + (B.get(k) or '—') + (' · داكن ' + (Ad.get(k) or '—') + ' → ' + (Bd.get(k) or '—') if Ad.get(k) != Bd.get(k) else '') + ' — ' + D['tokens'][k])
    bad, badd, extra = badU, baddU, extraU
    if dead: bad = bad + dead
    isColor = lambda v: pname(v) is not None
    rawL = [k for k, v in l1 + d1 if not k.startswith('p-') and 'var(' not in v and isColor(v)]
    composite = [k for k, v in l1 if not k.startswith('p-') and 'var(' not in v and not isColor(v)]
    print(('✔' if not rawL else '✘') + ' لا لونَ خامٍ خارج primitives في 070/080 (' + str(len(rawL)) + ') — القيمُ المركّبة المسموحة (ظلال · نقش): ' + ', '.join(composite))
    return not (bad or badd or extra or undefined or rawL)
# ── KIVO_259 · AUD-017: الطبقتان primitives → semantic، والحرفيةُ أسماءٌ مستعارة (aliases) على الدلالية وحدها ──────────────────────────────
def _pairs(T):
    """القيمةُ المحلولة لكل رمزٍ (فاتح · داكن) من tokens.json نفسِه."""
    P = {x['name']: x['value'] for x in T['primitives']}; L = {}
    for x in T['semantic'] + T['literal']: L[x['name']] = x['value']
    Dk = {x['name']: x['value'] for x in T['dark']}
    def res(v, mode, depth=0):
        m = re.fullmatch(r'var\(--([a-z0-9-]+)\)', v.strip())
        if not m or depth > 12: return norm(v).lower()
        n = m.group(1)
        if n in P: return norm(P[n]).lower()
        if mode == 'dark' and n in Dk: return res(Dk[n], mode, depth + 1)
        if n in L: return res(L[n], mode, depth + 1)
        return 'UNDEFINED(' + n + ')'
    return lambda n: (res(L[n], 'light'), res(Dk[n], 'dark') if n in Dk else res(L[n], 'dark'))
def _family(v):
    """عائلةُ اللون ودرجتُه وشفافيتُه من قيمته الفاتحة — لتسمية الرموز الدلالية الجديدة تسميةً مقروءة (gold-40-a18 …)"""
    import colorsys
    v = norm(v).lower(); a = 1.0
    if v.startswith('#'):
        h = v[1:]; h = ''.join(c * 2 for c in h) if len(h) in (3, 4) else h
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        if len(h) == 8: a = int(h[6:8], 16) / 255
    else:
        m = re.match(r'rgba?\((\d+),(\d+),(\d+)(?:,([0-9.]+))?\)', v); r, g, b = int(m.group(1)), int(m.group(2)), int(m.group(3)); a = float(m.group(4)) if m.group(4) else 1.0
    hh, ll, ss = colorsys.rgb_to_hls(r / 255, g / 255, b / 255); deg = hh * 360
    if ss < 0.12 or ll < 0.06 or ll > 0.97: fam = 'neutral'
    else: fam = next(n for lim, n in ((15, 'red'), (38, 'orange'), (55, 'gold'), (80, 'olive'), (165, 'green'), (195, 'teal'), (250, 'blue'), (290, 'violet'), (345, 'pink'), (361, 'red')) if deg < lim)
    return fam + '-' + str(int(round(ll * 20)) * 5) + ('' if a >= 0.999 else '-a' + str(int(round(a * 100))))
def semanticize(src):
    """تحويلٌ لمرّةٍ واحدة (KIVO_259): كلُّ رمزٍ حرفيّ يصير اسماً مستعاراً var(--<دلالي>) — على رمزٍ دلاليٍّ قائمٍ يطابقه فاتحاً وداكناً، وإلا على رمزٍ دلاليٍّ
       جديدٍ لكل زوجِ قيمٍ (فاتح · داكن) بلا مطابق؛ ويُنقل الداكنُ كلُّه إلى الطبقة الدلالية (لا تجاوزَ داكناً لاسمٍ حرفيّ). القيمُ المحسوبة لكل رمزٍ كما هي."""
    T = json.load(open(TOK(src), encoding='utf-8')); pair = _pairs(T)
    if T.get('layers') == 2: print('semanticize: already done'); return
    prims = {x['name'] for x in T['primitives']}
    pref = lambda val, fallback: ('var(--' + pname(val) + ')') if pname(val) and pname(val) in prims else fallback   # مرجعُ البدائيّ للقيمة المحلولة
    semNames = [x['name'] for x in T['semantic']]; bySem = {}
    for n in semNames: bySem.setdefault(pair(n), n)
    darkBy = {x['name']: x for x in T['dark']}; litNames = {x['name'] for x in T['literal']}
    newSem, newDark, used = [], [], set(semNames)
    for x in T['literal']:
        pr = pair(x['name'])
        if pr not in bySem:
            roles = sorted({y['name'].split('-')[0] for y in T['literal'] if pair(y['name']) == pr})
            base = (roles[0] if len(roles) == 1 else 'tone') + '-' + _family(pr[0]); nm = base; i = 2
            while nm in used: nm = base + '-v' + str(i); i += 1
            used.add(nm); bySem[pr] = nm
            newSem.append({'name': nm, 'value': pref(pr[0], x['value']), 'was': x['was'], 'from': x['name']})
            d = darkBy.get(x['name'])
            if d: newDark.append({'name': nm, 'value': pref(pr[1], d['value']), 'was': d['was']})   # الداكنُ ينتقل من الحرفي إلى الدلالي الجديد
        x['value'] = 'var(--' + bySem[pr] + ')'
    T['semantic'] += newSem
    T['dark'] = [d for d in T['dark'] if d['name'] not in litNames] + newDark
    T['layers'] = 2
    T['note'] = ('مصدرُ الرموز (KIVO_259 · AUD-017 — طبقتان): primitives (قيمٌ خام مسمّاة) → semantic (أدوارٌ وألوانٌ مسمّاة؛ الداكنُ عليها وحدها) — '
                 'والحرفيةُ (المسمّاة بالكود، يُرجعها محوِّلُ وقت التشغيل) أسماءٌ مستعارة var(--<دلالي>) لا قيمَ لها ولا تجاوزَ داكناً؛ جدولُ التحويل docs/tokens-conversion.md. '
                 'tokens.py emit يولّد 070/080 بايتاً · check يثبت التوليدَ وقواعدَ الطبقتين · verify يثبت تساوي القيم المحسوبة مع المرجع')
    json.dump(T, open(TOK(src), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    after = _pairs(T)
    bad = [x['name'] for x in T['literal'] if after(x['name']) != pair(x['name'])]
    print('semanticize: literal', len(T['literal']), '· semantic existing', len(semNames), '· new', len(newSem), '· dark moved', len(newDark), '· value changes', len(bad))
def layers_check(src):
    T = json.load(open(TOK(src), encoding='utf-8')); sem = {x['name'] for x in T['semantic']}; lit = {x['name'] for x in T['literal']}
    v1 = [x['name'] for x in T['literal'] if not re.fullmatch(r'var\(--([a-z0-9-]+)\)', x['value']) or re.fullmatch(r'var\(--([a-z0-9-]+)\)', x['value']).group(1) not in sem]
    v2 = [x['name'] for x in T['dark'] if x['name'] in lit]
    v3 = [x['name'] for x in T['semantic'] if 'var(--' in x['value'] and re.findall(r'var\(--([a-z0-9-]+)\)', x['value']) and any(n in lit for n in re.findall(r'var\(--([a-z0-9-]+)\)', x['value']))]
    import io, contextlib
    L0 = open(CSS(src, '070-theme-tokens.css'), encoding='utf-8').read(); D0 = open(CSS(src, '080-theme-dark.css'), encoding='utf-8').read()
    L = ':root{color-scheme:light;' + ''.join('--' + p['name'] + ':' + p['value'] + ';' for p in T['primitives']) + ''.join('--' + t['name'] + ':' + t['value'] + ';' for t in T['semantic'] + T['literal']) + '}'
    D = '@media screen{html[data-theme="dark"]{color-scheme:dark;' + ''.join('--' + t['name'] + ':' + t['value'] + ';' for t in T['dark']) + '}}'
    ok = not v1 and not v2 and not v3 and L == L0 and D == D0
    print(('✔' if ok else '✘') + ' الرموز (AUD-017): ' + str(len(T['primitives'])) + ' بدائياً · ' + str(len(sem)) + ' دلالياً · ' + str(len(lit)) + ' حرفياً مستعاراً — حرفيٌّ لا يشير إلى دلالي: ' + str(len(v1)) +
          ' · تجاوزٌ داكنٌ لاسمٍ حرفيّ: ' + str(len(v2)) + ' · دلاليٌّ يشير إلى حرفيّ: ' + str(len(v3)) + ' · 070/080 = التوليد: ' + ('نعم' if L == L0 and D == D0 else 'لا'))
    return ok
def conversion_table(src, out):
    T = json.load(open(TOK(src), encoding='utf-8')); pair = _pairs(T)
    rows = ['# جدولُ تحويل الرموز الحرفية إلى الدلالية (AUD-017 · KIVO_259)', '',
            '> مولَّدٌ بـ`python3 tools/tokens.py table src docs/tokens-conversion.md` من `src/styles/tokens/tokens.json`. كلُّ رمزٍ حرفيّ (المسمّى بقيمته — يُرجعه محوِّلُ وقت التشغيل',
            '> للألوان المضمَّنة في القوالب) اسمٌ مستعار على رمزٍ دلاليٍّ واحد؛ القيمتان (فاتح · داكن) من الدلالي. «قائم» = رمزٌ دلاليٌّ سبق 259 · «جديد» = أُنشئ في 259 لزوجِ قيمٍ بلا مطابق.', '',
            '| الحرفي | الدلالي | فاتح | داكن | المنشأ |', '|---|---|---|---|---|']
    new = {x['name'] for x in T['semantic'] if x.get('from')}
    for x in T['literal']:
        s = re.fullmatch(r'var\(--([a-z0-9-]+)\)', x['value']).group(1); l, d = pair(x['name'])
        rows.append('| `' + x['name'] + '` | `' + s + '` | `' + l + '` | `' + d + '` | ' + ('جديد' if s in new else 'قائم') + ' |')
    open(out, 'w', encoding='utf-8').write('\n'.join(rows) + '\n'); print('table:', len(T['literal']), 'صفاً →', out)
if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'extract': extract(sys.argv[2])
    elif cmd == 'emit': emit(sys.argv[2])
    elif cmd == 'semanticize': semanticize(sys.argv[2])
    elif cmd == 'check': sys.exit(0 if layers_check(sys.argv[2]) else 1)
    elif cmd == 'table': conversion_table(sys.argv[2], sys.argv[3])
    elif cmd == 'verify':
        ref = sys.argv[3]
        if ref.startswith('git:'):   # KIVO_255: المرجعُ وسمُ git (مثل git:KIVO_254) — تُستخرج أوراقُ الرموز منه إلى مجلدٍ مؤقت
            import subprocess, tempfile
            tag = ref[4:]; tmp = tempfile.mkdtemp(prefix='tokens_ref_'); root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            subprocess.run('git archive ' + tag + ' src/styles src/layout.json | tar -x -C ' + tmp, shell=True, cwd=root, check=True); ref = os.path.join(tmp, 'src')
        sys.exit(0 if verify(sys.argv[2], ref, sys.argv[sys.argv.index('--declared') + 1] if '--declared' in sys.argv else None) else 1)
