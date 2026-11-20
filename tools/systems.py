#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""V7 · المرحلة 2 · د2 — مقبسُ الأنظمة (وقتَ البناء): القاعدةُ تعرف النظام من src/systems/<key>/system.json وحده.
   python3 tools/systems.py [--list|--check|--write|--variants] [--src src]
     --list   الأنظمةُ الحاضرة بترتيبها وما تتطلبه (JSON)
     --check  system.json صالحٌ (المخطط · المفتاح = اسم المجلد · requires حاضرة وبلا دورة) والملفاتُ المحقونة = الملتزَم
     --write  يكتب الملفات المحقونة (يستدعيه tools/generate.py أيضاً قبل بقية التوليد)
     --regen  بعد إضافة مجلد نظامٍ أو حذفه: يعيد توليدَ كل مشتقٍّ يتبدّل بحضور الأنظمة (generate · فهرس الأيقونات · docs/routes.md ·
              docs/api-routes.md · docs/ux-states.md · src/types/kivo.d.ts)، ثم يحذف الملفات المولَّدة لنظامٍ غائب (صفحتُه · أجزاؤه المولَّدة). في شجرةٍ لم يتبدّل فيها شيء لا يغيّر ملفاً.

   الفتحات: قالبٌ في src/slots/ (مسجَّلٌ في src/slots/slots.json: tpl ← out) يحمل علاماتٍ مسمّاة
       @@SYS:name@@            أو        @@SYS:name|sep=","|pre="["|post="]"|empty="false"@@
   يستبدلها المولِّدُ بقطع الأنظمة الحاضرة (system.json ← slots.name = {order, text} أو {order, file} أو قائمةٌ منها)
   مرتَّبةً بـ(order ثم مفتاح النظام) وموصولةً بـsep؛ و pre/post لا يُكتبان إلا إذا وُجدت قطعة. بلا نظامٍ تخرج الفتحةُ فارغة،
   أو بنصّها المحايد empty (حيث يحتاج الكودُ قيمةً: false · [] · null). وللقطعة بدائلُ بحسب موضعها بين الحاضر:
   first (الأولى) · last (الأخيرة) · only (وحدها) — لتعبيرٍ يتبدّل شكلُه بغياب جاره (A.concat(B) · a ? f : g).
   بالأنظمة الأربعة يخرج النصُّ الملتزَم حرفاً بحرف (generate.py --check يحرس ذلك)؛ وحذفُ مجلد نظامٍ يُخرجه من كل قالب."""
import os, sys, re, json, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARK = re.compile(r'@@SYS:([A-Za-z0-9_.\-]+)((?:\|[a-z]+="(?:[^"\\]|\\.)*")*)@@')
OPT = re.compile(r'\|([a-z]+)=("(?:[^"\\]|\\.)*")')

def load(S):
    """الأنظمةُ الحاضرة مرتَّبةً بالمفتاح؛ كلٌّ منها system.json مع _dir (مجلدُه)."""
    out = []
    for p in sorted(glob.glob(os.path.join(S, 'systems', '*', 'system.json'))):
        d = json.load(open(p, encoding='utf-8')); d['_dir'] = os.path.dirname(p)
        # V7 · د5-د2: قطعُ النظام قد تتوزّع على ملفات مجموعات slots/<اسم>.slots.json ({اسمُ الفتحة: قطعة أو قائمة}) تُضمّ إلى slots في system.json —
        #            لنظامٍ قطعُه بالمئات (الجدول الشهري). الاسمُ الواحد في ملفين: القائمتان تُضمّان (order يرتّب).
        slots = dict(d.get('slots') or {})
        for g in sorted(glob.glob(os.path.join(d['_dir'], 'slots', '*.slots.json'))):
            for name, v in json.load(open(g, encoding='utf-8')).items():
                if name == '_note': continue
                add = v if isinstance(v, list) else [v]
                slots[name] = ((slots[name] if isinstance(slots[name], list) else [slots[name]]) + add) if name in slots else v
        if slots: d['slots'] = slots
        out.append(d)
    return sorted(out, key=lambda d: d.get('key', ''))

def shared(S):
    """القطعُ المشتركة المعلنة: {key: shared.json مع _dir} من src/systems/_shared/<key>/shared.json (د4-أ)."""
    out = {}
    for p in sorted(glob.glob(os.path.join(S, 'systems', '_shared', '*', 'shared.json'))):
        d = json.load(open(p, encoding='utf-8')); d['_dir'] = os.path.dirname(p); out[os.path.basename(d['_dir'])] = d
    return out

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
    # د4-أ: القطعُ المشتركة المعلنة — كلُّ ما يعلنه نظامٌ موجودٌ ويسمّيه مالكاً، وكلُّ مالكٍ حاضر يعلنها، وملفاتُها موجودة
    pieces = shared(S)
    for d in systems:
        for s in d.get('shared') or []:
            if s not in pieces: bad.append('%s: shared «%s» بلا src/systems/_shared/%s/shared.json' % (d.get('key'), s, s))
            elif d.get('key') not in pieces[s].get('owners', []): bad.append('%s: shared «%s» لا يسمّيه مالكاً' % (d.get('key'), s))
    for s, p in pieces.items():
        if p.get('key') != s or p.get('kind') != 'shared': bad.append('_shared/%s/shared.json: key/kind' % s)
        for f in p.get('files') or []:
            if not os.path.isfile(os.path.join(p['_dir'], f)): bad.append('_shared/%s: %s غير موجود' % (s, f))
        if not set(p.get('owners') or []) & set(keys): bad.append('قطعة مشتركة بلا مالك: %s — احذفها' % os.path.relpath(p['_dir'], os.path.dirname(S)).replace(os.sep, '/'))
        for o in p.get('owners') or []:
            if o in keys and s not in (next(d for d in systems if d.get('key') == o).get('shared') or []): bad.append('%s: مالكٌ للقطعة المشتركة «%s» ولا يعلنها (shared)' % (o, s))
    req = {d.get('key'): list(d.get('requires') or []) for d in systems}
    def cyc(k, seen):
        if k in seen: return True
        return any(cyc(r, seen | {k}) for r in req.get(k, []))
    for k in req:
        if cyc(k, frozenset()): bad.append('%s: requires دائرية' % k)
    return bad

def fragments(S, systems=None):
    """{name: [(order, key, {text[, first, last, only]})]} مرتَّبةً — نصُّ القطعة من system.json أو من ملفٍ في مجلد النظام."""
    systems = load(S) if systems is None else systems; out = {}
    for d in systems:
        for name, v in (d.get('slots') or {}).items():
            for it in (v if isinstance(v, list) else [v]):
                text = it['text'] if 'text' in it else open(os.path.join(d['_dir'], it['file']), encoding='utf-8', newline='').read()
                out.setdefault(name, []).append((it.get('order', 0), d['key'], dict({k: it[k] for k in ('first', 'last', 'only') if k in it}, text=text)))
    for name in out: out[name].sort(key=lambda t: (t[0], t[1]))
    return out

def pick(items):
    """نصُّ كل قطعةٍ بحسب موضعها بين الحاضر: only (وحدها) ثم last (الأخيرة) ثم first (الأولى) ثم text."""
    n = len(items); out = []
    for i, it in enumerate(items):
        if n == 1 and 'only' in it: out.append(it['only'])
        elif i == n - 1 and 'last' in it: out.append(it['last'])
        elif i == 0 and 'first' in it: out.append(it['first'])
        else: out.append(it['text'])
    return out

def expand(text, frags, used=None):
    """يستبدل كلَّ علامةٍ بقطعها. used (اختياري): مجموعةٌ تُسجَّل فيها أسماءُ الفتحات التي مرّت.
       خياراتُ العلامة: sep (الوصل) · pre/post (حول القطع إن وُجدت) · empty (النصُّ المحايد حين لا قطعة — وإلا فراغ)."""
    def rep(m):
        name = m.group(1); o = {k: json.loads(v) for k, v in OPT.findall(m.group(2) or '')}
        if used is not None: used.add(name)
        parts = pick([it for _, _, it in frags.get(name, [])])
        return (o.get('pre', '') + o.get('sep', '').join(parts) + o.get('post', '')) if parts else o.get('empty', '')
    for _ in range(4):   # القطعةُ نفسُها قد تحمل علامة (ما يتبدّل داخل قطعة نظامٍ بحضور نظامٍ آخر) — تُحقن حتى لا تبقى علامة
        text, n = MARK.subn(rep, text)
        if not n or not MARK.search(text): break
    return text

def manifest(S, systems=None):
    """القوالب: ما في src/slots/slots.json (tpl نسبةً إلى src/slots) — و V7 · د5-هـ: قوالبُ الأنظمة الحاضرة (system.json ← templates:
       [{tpl, out}] نسبةً إلى مجلد النظام): ملفٌّ للنظام نفسِه تُحقن فيه قطعُ أنظمةٍ أخرى (صفحةُ المتابعة يضيف إليها التقريرُ والمهام تبويباتِهما)،
       يغيب بغيابه. لكل مدخلٍ path (المسارُ الكامل للقالب) و out (نسبةً إلى جذر المستودع)."""
    p = os.path.join(S, 'slots', 'slots.json')
    out = [dict(t, path=os.path.join(S, 'slots', t['tpl'])) for t in (json.load(open(p, encoding='utf-8'))['templates'] if os.path.isfile(p) else [])]
    root = os.path.dirname(S)
    for d in (load(S) if systems is None else systems):
        for t in d.get('templates') or []:
            out.append({'tpl': os.path.relpath(os.path.join(d['_dir'], t['tpl']), os.path.join(S, 'slots')).replace(os.sep, '/'), 'out': os.path.relpath(os.path.join(d['_dir'], t['out']), root).replace(os.sep, '/'), 'path': os.path.join(d['_dir'], t['tpl'])})
    return out

def optional(S):
    """فتحاتٌ علامتُها داخل قطعة نظامٍ آخر (slots.json ← optional): تغيب العلامةُ بغياب ذلك النظام، فقطعتُها ليست خطأً إملائياً."""
    p = os.path.join(S, 'slots', 'slots.json')
    return set(json.load(open(p, encoding='utf-8')).get('optional', [])) if os.path.isfile(p) else set()

def outputs(S, systems=None):
    """{المسارُ نسبةً إلى جذر المستودع: bytes} لكل قالبٍ مسجَّل — ويرفض قطعةً لا فتحةَ لها (خطأٌ إملائي في الاسم)."""
    systems = load(S) if systems is None else systems
    bad = problems(S, systems)
    if bad: raise SystemExit('✘ systems: ' + ' · '.join(bad))
    frags = fragments(S, systems); used = set(); out = {}
    for t in manifest(S, systems):
        src = open(t['path'], encoding='utf-8', newline='').read()
        out[t['out']] = expand(src, frags, used).encode('utf-8')
    orphan = sorted(set(frags) - used - RESERVED - optional(S))
    if orphan: raise SystemExit('✘ systems: قطعٌ بلا فتحة في أي قالب: ' + ', '.join(orphan))
    return out

def parts_order(S, PD, systems=None):
    """ترتيبُ ضمّ الخادم: أجزاءُ القاعدة (workers/parts.base.json) وبعد كلٍّ منها أجزاءُ الأنظمة المرساة عليه (server.parts و server.generated)
       مرتَّبةً بـ(order ثم مفتاح النظام). PD = مجلد workers/parts. يعيد مداخلَ parts.json بمفاتيحها وترتيبها (lines · bytes · sha256 فارغةٌ يملؤها المولِّد)؛
       file اسمٌ أو مسارٌ نسبيٌّ إلى PD."""
    systems = load(S) if systems is None else systems
    base = json.load(open(os.path.join(PD, '..', 'parts.base.json'), encoding='utf-8'))['parts']; ins = {}
    def entry(f, p):
        e = {'file': f}
        if 'new' in p: e['new'] = p['new']       # د4-ب: وصفُ الجزء كما كان في سجل القاعدة قبل نقله
        if 'new' not in p: e['lines'] = None
        e.update({'bytes': None, 'sha256': None}); e.update({'head': p['head']} if 'head' in p else {})
        return e
    for d in systems:
        for p in d['server'].get('parts', []):
            f = os.path.relpath(os.path.join(d['_dir'], p['file']), PD).replace(os.sep, '/')
            ins.setdefault(p['after'], []).append((p['order'], d['key'], entry(f, p)))
        for g in d['server'].get('generated', []):
            ins.setdefault(g['after'], []).append((g['order'], d['key'], entry(g['part'], g)))
    names = {b['file'] for b in base}; lost = sorted(set(ins) - names)
    if lost: raise SystemExit('✘ systems: مرسى غير موجود في workers/parts.base.json: ' + ', '.join(lost))
    out = []
    for b in base:
        out.append(dict(b)); out.extend(e for _, _, e in sorted(ins.get(b['file'], []), key=lambda t: (t[0], t[1])))
    return out

def generated_parts(S, systems=None):
    """[(اسمُ الجزء في workers/parts, مسارُ الأداة من جذر المستودع, مفتاحُ النظام)] — أجزاءٌ تولَّد من كود النظام."""
    systems = load(S) if systems is None else systems
    return [(g['part'], g['tool'], d['key']) for d in systems for g in d['server'].get('generated', [])]

RESERVED = set()   # أسماءُ فتحاتٍ يستهلكها مولِّدٌ آخر غير القوالب (تُضاف عند الحاجة)

REGEN = [  # ما يُعاد توليدُه حين يتبدّل حضورُ نظام — بالترتيب (generate أولاً: السجلاتُ تسبق من يقرؤها)
    ['tools/generate.py', '--src', 'src'], ['tools/icons.py', 'extract', '--src', 'src'], ['tools/icons.py', 'index', '--src', 'src'],
    ['tools/route_registry.py', '--write'], ['tools/api_routes.py', '--write'], ['tools/ux_states.py'], ['node:tools/gen_types.mjs'],
    ['tools/perm_tree.py', 'emit'],            # د3: شجرةُ الصلاحيات (perm-tree24.json) من السجلّ المجموع والصفحات الحاضرة — قبل المواثيق لأنها تقرؤها
    ['tools/module_charter.py', '--write'],   # حقلُ «data» في مواثيق الوحدات مشتقٌّ من المصدر المولَّد
    ['tools/generate.py', '--src', 'src'],     # بيانُ الصفحات (manifests) مشتقٌّ من المواثيق — يُولَّد بعدها
    ['tools/route_registry.py', '--write'],   # د4-ج: docs/routes.md تقرأ المواثيقَ وشجرةَ الصلاحيات المولَّدتين أعلاه (تبويبٌ يغيب مع نظامه يبدّل سطرَ صفحته) — تُكتب ثانيةً بعدهما
    ['tools/trace.py'],                        # مصفوفةُ التتبّع (docs/traceability.md) تقرأ الكودَ والاختبارات
]
KEEP_EOL = {'tools/api_routes.py': 'docs/api-routes.md', 'tools/trace.py': 'docs/traceability.md'}   # الأداةُ تكتب LF والوثيقةُ الملتزَمة CRLF (.gitattributes: -text) — تُحفظ نهاياتُ سطورها

def prune(S):
    """الملفاتُ المولَّدة لنظامٍ غائب: صفحتُه في src/pages (ليست في modules.json بعد التوليد) وأجزاؤه المولَّدة في workers/parts
       (ليست من أجزاء القاعدة ولا في ترتيب الضمّ). المولِّدُ يكتب ولا يحذف — فتُحذف هنا، وتُطبع."""
    root = os.path.dirname(S); gone = []
    L = json.load(open(os.path.join(S, 'layout.json'), encoding='utf-8'))
    pages = os.path.join(S, L['pages']); names = {p['name'] for p in json.load(open(os.path.join(S, L['modules'], 'modules.json'), encoding='utf-8'))['pages']}
    for f in sorted(glob.glob(os.path.join(pages, '*.dc.html'))):
        if os.path.basename(f)[:-len('.dc.html')] not in names: gone.append(f)
    PD = os.path.normpath(os.path.join(S, L['workersParts'])); base = {b['file'] for b in json.load(open(os.path.join(PD, '..', 'parts.base.json'), encoding='utf-8'))['parts']}
    order = {os.path.basename(e['file']) for e in parts_order(S, PD)}
    for f in sorted(glob.glob(os.path.join(PD, '*.js'))):
        if os.path.basename(f) not in base and os.path.basename(f) not in order: gone.append(f)
    for f in gone: os.remove(f); print('  − ' + os.path.relpath(f, root) + ' (مولَّدٌ لنظامٍ غائب — حُذف)')
    return gone

def regen(S):
    import subprocess
    root = os.path.dirname(S)
    for cmd in REGEN:
        if cmd[0].startswith('node:'):
            r = subprocess.run([os.environ.get('KIVO_NODE', 'node'), cmd[0][5:]] + cmd[1:], cwd=root, capture_output=True, text=True, encoding='utf-8')
            print(('  ✔ ' if r.returncode == 0 else '  ✘ ') + cmd[0][5:] + ' — ' + (r.stdout.strip().split('\n') or [''])[-1][:150])
            if r.returncode: print(r.stderr[-400:]); return 1
            continue
        keep = os.path.join(root, KEEP_EOL[cmd[0]]) if cmd[0] in KEEP_EOL else None
        crlf = bool(keep) and os.path.isfile(keep) and b'\r\n' in open(keep, 'rb').read()
        r = subprocess.run([sys.executable] + cmd, cwd=root, capture_output=True, text=True, encoding='utf-8')
        if crlf:
            data = open(keep, 'rb').read()
            if b'\r\n' not in data: open(keep, 'wb').write(data.replace(b'\n', b'\r\n'))
        last = (r.stdout.strip().split('\n') or [''])[-1]
        print(('  ✔ ' if r.returncode == 0 else '  ✘ ') + ' '.join(cmd) + ' — ' + last[:150])
        if r.returncode and cmd[0] != 'tools/ux_states.py': print(r.stderr[-400:]); return 1   # ux_states: يكتب الوثيقة ثم يخبر بما نقص عن خطّ الأساس (يُراجَع)
    return 0

def main(argv):
    S = os.path.abspath(argv[argv.index('--src') + 1]) if '--src' in argv else os.path.join(ROOT, 'src')
    if '--regen' in argv:
        rc = regen(S)
        if rc == 0: prune(S)
        return rc
    systems = load(S)
    if '--variants' in argv:
        # د4-أ: نصُّ كل ملفٍ محقون كما يخرج بغياب الأنظمة — بلا أي نظام، ثم بغياب كل نظامٍ وحده (ومعه من يتطلبه). لا يكتب شيئاً.
        #       [{gone: [مفاتيح الغائب], files: {المسار: النص}}] — يستعمله فحصُ قائمة الاستثناء (tests/removal/names_allow.mjs)
        res = []
        def dependents(k):
            gone = {k}
            while True:
                more = {d['key'] for d in systems if d['key'] not in gone and gone & set(d.get('requires') or [])}
                if not more: return gone
                gone |= more
        cases = [set(d['key'] for d in systems)] + [dependents(d['key']) for d in systems]
        for gone in [g for i, g in enumerate(cases) if g and g not in cases[:i]]:
            frags = fragments(S, [d for d in systems if d['key'] not in gone])
            res.append({'gone': sorted(gone), 'names': [n for d in systems if d['key'] in gone for n in d.get('names') or []], 'files': {t['out']: expand(open(t['path'], encoding='utf-8', newline='').read(), frags) for t in manifest(S, [d for d in systems if d['key'] not in gone]) if t['out'].endswith('.js')}})
        print(json.dumps(res, ensure_ascii=False)); return 0
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
