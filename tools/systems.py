#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""V7 · المرحلة 2 · د2 — مقبسُ الأنظمة (وقتَ البناء): القاعدةُ تعرف النظام من src/systems/<key>/system.json وحده.
   python3 tools/systems.py [--list|--check|--write] [--src src]
     --list   الأنظمةُ الحاضرة بترتيبها وما تتطلبه (JSON)
     --check  system.json صالحٌ (المخطط · المفتاح = اسم المجلد · requires حاضرة وبلا دورة) والملفاتُ المحقونة = الملتزَم
     --write  يكتب الملفات المحقونة (يستدعيه tools/generate.py أيضاً قبل بقية التوليد)

   الفتحات: قالبٌ في src/slots/ (مسجَّلٌ في src/slots/slots.json: tpl ← out) يحمل علاماتٍ مسمّاة
       @@SYS:name@@            أو        @@SYS:name|sep=","|pre="["|post="]"@@
   يستبدلها المولِّدُ بقطع الأنظمة الحاضرة (system.json ← slots.name = {order, text} أو {order, file} أو قائمةٌ منها)
   مرتَّبةً بـ(order ثم مفتاح النظام) وموصولةً بـsep؛ و pre/post لا يُكتبان إلا إذا وُجدت قطعة. بلا نظامٍ تخرج الفتحةُ فارغة.
   بالأنظمة الأربعة يخرج النصُّ الملتزَم حرفاً بحرف (generate.py --check يحرس ذلك)؛ وحذفُ مجلد نظامٍ يُخرجه من كل قالب."""
import os, sys, re, json, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARK = re.compile(r'@@SYS:([A-Za-z0-9_.\-]+)((?:\|[a-z]+="(?:[^"\\]|\\.)*")*)@@')
OPT = re.compile(r'\|([a-z]+)=("(?:[^"\\]|\\.)*")')

def load(S):
    """الأنظمةُ الحاضرة مرتَّبةً بالمفتاح؛ كلٌّ منها system.json مع _dir (مجلدُه)."""
    out = []
    for p in sorted(glob.glob(os.path.join(S, 'systems', '*', 'system.json'))):
        d = json.load(open(p, encoding='utf-8')); d['_dir'] = os.path.dirname(p); out.append(d)
    return sorted(out, key=lambda d: d.get('key', ''))

def problems(S, systems=None):
    """ما يمنع قراءة الأنظمة: مخططٌ · مفتاحٌ ≠ المجلد · تكرار · requires غائبة أو دائرية · قطعةٌ بلا نص."""
    systems = load(S) if systems is None else systems; bad = []
    sch_path = os.path.join(S, 'schemas', 'system.schema.json'); validator = None
    if os.path.isfile(sch_path):
        try:
            import jsonschema; validator = jsonschema.Draft202012Validator(json.load(open(sch_path, encoding='utf-8')))
        except ImportError: validator = None
    keys = [d.get('key') for d in systems]
    for d in systems:
        k = d.get('key'); folder = os.path.basename(d['_dir'])
        if validator:
            inst = {x: v for x, v in d.items() if x != '_dir'}
            for e in sorted(validator.iter_errors(inst), key=lambda e: list(e.path))[:5]: bad.append('%s/system.json: %s: %s' % (folder, '/'.join(map(str, e.path)), e.message[:140]))
        if k != folder: bad.append('%s/system.json: key «%s» ≠ اسم المجلد' % (folder, k))
        if keys.count(k) > 1: bad.append('%s: مفتاحٌ مكرر' % k)
        for r in d.get('requires') or []:
            if r not in keys: bad.append('%s يتطلب «%s» وهو غير حاضر في src/systems/' % (k, r))
        for name, v in (d.get('slots') or {}).items():
            for it in (v if isinstance(v, list) else [v]):
                if ('text' in it) == ('file' in it): bad.append('%s: slots.%s يحمل text أو file (واحداً منهما)' % (k, name))
                elif 'file' in it and not os.path.isfile(os.path.join(d['_dir'], it['file'])): bad.append('%s: slots.%s ← %s غير موجود' % (k, name, it['file']))
    req = {d.get('key'): list(d.get('requires') or []) for d in systems}
    def cyc(k, seen):
        if k in seen: return True
        return any(cyc(r, seen | {k}) for r in req.get(k, []))
    for k in req:
        if cyc(k, frozenset()): bad.append('%s: requires دائرية' % k)
    return bad

def fragments(S, systems=None):
    """{name: [(order, key, text)]} مرتَّبةً — نصُّ القطعة من system.json أو من ملفٍ في مجلد النظام."""
    systems = load(S) if systems is None else systems; out = {}
    for d in systems:
        for name, v in (d.get('slots') or {}).items():
            for it in (v if isinstance(v, list) else [v]):
                text = it['text'] if 'text' in it else open(os.path.join(d['_dir'], it['file']), encoding='utf-8', newline='').read()
                out.setdefault(name, []).append((it.get('order', 0), d['key'], text))
    for name in out: out[name].sort(key=lambda t: (t[0], t[1]))
    return out

def expand(text, frags, used=None):
    """يستبدل كلَّ علامةٍ بقطعها. used (اختياري): مجموعةٌ تُسجَّل فيها أسماءُ الفتحات التي مرّت."""
    def rep(m):
        name = m.group(1); o = {k: json.loads(v) for k, v in OPT.findall(m.group(2) or '')}
        if used is not None: used.add(name)
        parts = [t for _, _, t in frags.get(name, [])]
        return (o.get('pre', '') + o.get('sep', '').join(parts) + o.get('post', '')) if parts else ''
    return MARK.sub(rep, text)

def manifest(S):
    p = os.path.join(S, 'slots', 'slots.json')
    return json.load(open(p, encoding='utf-8'))['templates'] if os.path.isfile(p) else []

def outputs(S, systems=None):
    """{المسارُ نسبةً إلى جذر المستودع: bytes} لكل قالبٍ مسجَّل — ويرفض قطعةً لا فتحةَ لها (خطأٌ إملائي في الاسم)."""
    systems = load(S) if systems is None else systems
    bad = problems(S, systems)
    if bad: raise SystemExit('✘ systems: ' + ' · '.join(bad))
    frags = fragments(S, systems); used = set(); out = {}
    for t in manifest(S):
        src = open(os.path.join(S, 'slots', t['tpl']), encoding='utf-8', newline='').read()
        out[t['out']] = expand(src, frags, used).encode('utf-8')
    orphan = sorted(set(frags) - used - RESERVED)
    if orphan: raise SystemExit('✘ systems: قطعٌ بلا فتحة في أي قالب: ' + ', '.join(orphan))
    return out

RESERVED = set()   # أسماءُ فتحاتٍ يستهلكها مولِّدٌ آخر غير القوالب (تُضاف عند الحاجة)

def main(argv):
    S = os.path.abspath(argv[argv.index('--src') + 1]) if '--src' in argv else os.path.join(ROOT, 'src')
    systems = load(S)
    if '--list' in argv:
        print(json.dumps([{'key': d['key'], 'name': d.get('name'), 'requires': d.get('requires') or []} for d in systems], ensure_ascii=False)); return 0
    bad = problems(S, systems)
    if bad:
        for b in bad: print('  ✘ ' + b)
        print('✘ systems: %d مخالفة' % len(bad)); return 1
    out = outputs(S, systems); root = os.path.dirname(S); diff = []
    for rel, data in sorted(out.items()):
        p = os.path.join(root, rel); cur = open(p, 'rb').read() if os.path.isfile(p) else None
        if cur == data: continue
        diff.append(rel)
        if '--write' in argv:
            os.makedirs(os.path.dirname(p), exist_ok=True); open(p, 'wb').write(data); print('  → ' + rel)
    if diff and '--write' not in argv:
        for r in diff: print('  ✘ ' + r + ' ≠ قالبه (شغّل python3 tools/systems.py --write)')
        print('✘ systems: %d ملفاً محقوناً يخالف قالبه' % len(diff)); return 1
    print('✔ systems: %d نظاماً (%s) · %d قالباً محقوناً = الملتزَم' % (len(systems), ' · '.join(d['key'] for d in systems) or '—', len(out))); return 0

if __name__ == '__main__': sys.exit(main(sys.argv[1:]))
