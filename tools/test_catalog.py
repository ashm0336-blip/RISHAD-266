#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO_259 · SOT-132 · SOT-109/110/111/112/113 — كتالوجُ الاختبارات وهرمُها آلياً (لا يُحرَّر يدوياً):
     python3 tools/test_catalog.py [--gate gateall259.sh] [--log reports/k25N/gate_25N_run1.txt]   → docs/testing.md + reports/test_catalog.json
     python3 tools/test_catalog.py --check                                                        (= التوليد · وكلُّ بندٍ P0 «مكتمل» له اختبارٌ أو دليلُ تحقّقٍ مسجَّل)
   المصادر: حزمُ البوابة الدائمة (أحدث gateallNNN.sh) + tests/unit + tests/source + الحزمُ المستقلة (k2NN*) — يُصنَّف كلُّ ملفٍّ بمحتواه:
     وحدة (Node بلا خادمٍ ولا متصفح · tests/unit) · براهينُ المصدر (Python ساكن: tests/source · chk*/gate.py) · تكامل (Miniflare بلا متصفح) ·
     طرفٌ لطرف (متصفح Playwright + الخادم) · بصريّ/إتاحة/أجهزة (vis · visual · layout · devices · a11y · theme) · أداء (perf · load · soak · latency · cache).
   ومن آخر سجلّ بوابة: عددُ التأكيدات الناجحة لكل حزمة (حين يُعرَف اسمُها في السجل). والتغطيةُ لكل P0 من مصفوفة التتبّع (tools/trace.py)."""
import os, re, sys, json, glob, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_MD = os.path.join(ROOT, 'docs', 'testing.md'); OUT_JS = os.path.join(ROOT, 'reports', 'test_catalog.json')
def arg(n, d):
    return sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
def latest(pat):
    xs = sorted(glob.glob(os.path.join(ROOT, pat)), key=lambda p: [int(x) for x in re.findall(r'\d+', os.path.basename(p))] or [0])
    return xs[-1] if xs else None
GATE = arg('--gate', None) or latest('gateall2[0-9][0-9].sh')
# KIVO_260 (كشفته البطاقةُ المستقلة النهائية — §٤ بند 7): كان السجلُّ «آخرَ run1» دائماً (جولةٌ أخفقت في 259) — الآن آخرُ جولةٍ بأجزاء استئنافها:
#   أعلى رقمِ جولةٍ في أحدث مجلد إصدار (runK ثم runKb · runKc …) والنتيجةُ لكل حزمةٍ من آخر جزءٍ ذكرها (الاستئنافُ يحسم).
def latest_logs():
    if '--log' in sys.argv: return [arg('--log', None)]
    for d in sorted(glob.glob(os.path.join(ROOT, 'reports', 'k2[0-9][0-9]')), key=lambda p: int(re.findall(r'\d+', os.path.basename(p))[0]), reverse=True):
        fs = glob.glob(os.path.join(d, 'gate_2[0-9][0-9]_run[0-9]*.txt'))
        parts = []
        for f in fs:
            m = re.match(r'gate_\d+_run(\d+)([a-z]?)\.txt$', os.path.basename(f))
            if m: parts.append((int(m.group(1)), m.group(2), f))
        if not parts: continue
        k = max(x[0] for x in parts)
        return [f for _, _, f in sorted(x for x in parts if x[0] == k)]
    return []
LOGS = latest_logs()
LOG = LOGS[0] if LOGS else None
LAYERS = [('unit', 'وحدة (Node · بلا خادم ولا متصفح)'), ('source', 'براهينُ المصدر (Python · ساكن)'), ('static', 'فحوصٌ ساكنة على الحزمة'), ('integration', 'تكامل (Miniflare · بلا متصفح)'),
          ('e2e', 'طرفٌ لطرف (متصفح + خادم)'), ('visual', 'بصريّ · إتاحة · أجهزة'), ('performance', 'أداء · حِمل · تحمّل')]

def classify(path, text):
    b = os.path.basename(path)
    if path.startswith('tests/unit/'): return 'unit'
    if path.endswith('.py'): return 'source' if path.startswith('tests/source/') else 'static'
    if re.search(r'(vis|visual|layout|devices|a11y|theme|focus|touch|pointer)', b): return 'visual'
    if re.search(r'(perf|load|soak|latency|cache|lazy|bigmap|bkbig|night)', b): return 'performance'
    # KIVO_259 (كشفته مراجعةُ التغطية المستقلة): استيرادُ عُدّة k205.mjs وحده لا يعني متصفحاً (audunify · read01 · restoreimg خادمٌ بلا متصفح) — العبرةُ بالإطلاق
    br = re.search(r"from ['\"]playwright['\"]|chromium\.launch|\blaunch\(\)|newPage\(", text)
    mf = re.search(r"from ['\"]miniflare['\"]|new Miniflare|harness\(", text)
    if br: return 'e2e'
    if mf: return 'integration'
    return 'unit'

def gate_files():
    t = open(GATE, encoding='utf-8').read() if GATE else ''
    files = set(re.findall(r'([A-Za-z0-9_./-]+\.(?:mjs|py|sh))', t))
    out = {}
    for f in files:
        for cand in (f, 'cfbench/' + f, 'cfbench/' + os.path.basename(f), f.replace('../', '')):
            p = os.path.join(ROOT, cand)
            if os.path.isfile(p) and not cand.endswith('.sh'): out[os.path.normpath(cand)] = True; break
    labels = {}
    for lab, f in re.findall(r'"([^":]+(?:\([^)]*\))?[^":]*):([A-Za-z0-9_./-]+\.(?:mjs|py|sh))', t):
        labels[os.path.basename(f)] = lab.strip()
    return out, labels

def log_counts(labels):
    cnt = {}
    for lg in LOGS:                                                       # بالترتيب: الجزءُ اللاحق (استئناف) يحسم
        if not lg or not os.path.exists(lg): continue
        L = open(lg, encoding='utf-8').read().split('\n')
        for f, lab in labels.items():
            for line in L:
                if line.startswith(lab[:40]):
                    if 'يُتخطّى' in line: break                          # مكتملٌ في جزءٍ سابق — نتيجتُه هناك
                    m = re.search(r'نجح (\d+) \| أخفق (\d+)', line) or re.search(r'(\d+) نجاح · (\d+) إخفاق', line)
                    if m: cnt[f] = (int(m.group(1)), int(m.group(2)))
                    elif 'FAIL' in line: cnt[f] = (None, 'FAIL')
                    break
    return cnt

def build():
    gf, labels = gate_files()
    rows = {}
    gt = open(GATE, encoding='utf-8').read() if GATE else ''
    for f in sorted(glob.glob(os.path.join(ROOT, 'tests', 'unit', '*.test.mjs'))): gf[os.path.relpath(f, ROOT)] = 'tests/unit/*.test.mjs' in gt   # البوابةُ تشغّلها كلَّها
    for f in sorted(glob.glob(os.path.join(ROOT, 'tests', 'source', '*.py'))): gf[os.path.relpath(f, ROOT)] = os.path.basename(f) in gt
    for f in sorted(glob.glob(os.path.join(ROOT, 'cfbench', 'k2[5-9]*.mjs'))): gf.setdefault(os.path.relpath(f, ROOT), False)
    cnt = log_counts(labels)
    for f in sorted(gf):
        p = os.path.join(ROOT, f)
        try: t = open(p, encoding='utf-8', errors='ignore').read()
        except Exception: continue
        layer = classify(f, t)
        n_tests = len(re.findall(r"^test\(", t, re.M)) if f.startswith('tests/unit/') else None
        c = cnt.get(os.path.basename(f))
        rows[f] = {'file': f, 'layer': layer, 'inGate': bool(gf[f]), 'label': labels.get(os.path.basename(f), ''), 'unitTests': n_tests,
                   'lastGate': ({'pass': c[0], 'fail': c[1]} if c else None)}
    tr = os.path.join(ROOT, 'reports', 'traceability.json')
    T = json.load(open(tr, encoding='utf-8'))['rows'] if os.path.exists(tr) else []
    # KIVO_260: الحالةُ من المرجع نفسِه (لا من traceability.json الذي قد يسبق آخرَ تحديثٍ للمرجع — كان «55/52» يخالف «61/49»)
    try: _st = {x['id']: x['status'] for x in json.load(open(os.path.join(ROOT, 'docs', 'sot', 'KIVO_MASTER_REQUIREMENTS_v6.json'), encoding='utf-8'))['DATA']}
    except Exception: _st = {}
    for r in T:
        if r.get('id') in _st: r['status'] = _st[r['id']]
    p0 = [r for r in T if r['priority'] == 'P0']
    return list(rows.values()), p0

def md(rows, p0):
    L = ['# الاختبارات — الكتالوجُ والهرم (SOT-132 · SOT-109…113)', '',
         '> مولَّدٌ آلياً بـ`python3 tools/test_catalog.py` من حزم البوابة الدائمة (`' + (os.path.relpath(GATE, ROOT) if GATE else '—') + '`) و`tests/` وآخر جولة بوابة بأجزاء استئنافها (`' + (' + '.join(os.path.relpath(x, ROOT) for x in LOGS) if LOGS else '—') + '`)؛ لا يُحرَّر يدوياً.',
         '> التصنيفُ بمحتوى الملف: متصفحٌ ⇒ طرفٌ لطرف · Miniflare بلا متصفح ⇒ تكامل · Node بلا خادم ⇒ وحدة · Python ⇒ براهينُ ساكنة · وأسماءُ الحزم البصرية والأداء.', '',
         '## الهرم', '', '| الطبقة | الحزم | في البوابة | تأكيداتٌ ناجحة في آخر بوابة | اختباراتُ الوحدة |', '|---|---|---|---|---|']
    for k, name in LAYERS:
        R = [r for r in rows if r['layer'] == k]
        if not R: continue
        ps = sum(r['lastGate']['pass'] for r in R if r['lastGate'] and isinstance(r['lastGate']['pass'], int))
        L.append('| ' + name + ' | ' + str(len(R)) + ' | ' + str(sum(1 for r in R if r['inGate'])) + ' | ' + (format(ps, ',') if ps else '—') + ' | ' + (str(sum(r['unitTests'] or 0 for r in R)) if k == 'unit' else '—') + ' |')
    L += ['', '## تغطيةُ بنود P0 (من مصفوفة التتبّع)', '']
    done = [r for r in p0 if r['status'] == 'مكتمل']; dt = [r for r in done if r['tests']]; dv = [r for r in done if not r['tests'] and r.get('verified')]
    L.append('- P0 «مكتمل»: ' + str(len(done)) + ' — باختبارٍ مُشارٍ إليه ' + str(len(dt)) + ' · بتحقّقٍ مسجَّلٍ في المرجع (Preview/إجراء/ساكن) ' + str(len(dv)) + ' · بدليلٍ نصّيٍّ وحده ' + str(len(done) - len(dt) - len(dv)))
    op = [r for r in p0 if r['status'] != 'مكتمل']
    L.append('- P0 مفتوح: ' + str(len(op)) + ' — له اختبارٌ أو كودٌ مُشارٌ إليه ' + str(sum(1 for r in op if r['tests'] or r['code'])) + ' (التفاصيل: `docs/traceability.md`)')
    L += ['', '## الحزم', '', '| الملف | الطبقة | في البوابة | آخر بوابة | العنوان |', '|---|---|---|---|---|']
    for r in sorted(rows, key=lambda r: ([k for k, _ in LAYERS].index(r['layer']), r['file'])):
        lg = (('نجح ' + str(r['lastGate']['pass']) if isinstance(r['lastGate']['pass'], int) else 'FAIL') if r['lastGate'] else '—')
        L.append('| `' + r['file'] + '` | ' + dict(LAYERS)[r['layer']].split(' (')[0] + ' | ' + ('✔' if r['inGate'] else '—') + ' | ' + lg + ' | ' + r['label'].replace('|', '¦')[:90] + ' |')
    return '\n'.join(L) + '\n'

def main():
    rows, p0 = build(); txt = md(rows, p0)
    if '--check' in sys.argv:
        cur = open(OUT_MD, encoding='utf-8').read() if os.path.exists(OUT_MD) else ''
        print(('✔' if cur == txt else '✘') + ' كتالوجُ الاختبارات docs/testing.md ' + ('= التوليد' if cur == txt else '≠ التوليد (شغّل tools/test_catalog.py)') + ' · ' + str(len(rows)) + ' حزمة')
        sys.exit(0 if cur == txt else 1)
    open(OUT_MD, 'w', encoding='utf-8').write(txt)
    os.makedirs(os.path.dirname(OUT_JS), exist_ok=True); json.dump({'gate': os.path.relpath(GATE, ROOT) if GATE else None, 'log': [os.path.relpath(x, ROOT) for x in LOGS], 'rows': rows}, open(OUT_JS, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    by = {}
    for r in rows: by[r['layer']] = by.get(r['layer'], 0) + 1
    print('✎ docs/testing.md · reports/test_catalog.json — ' + str(len(rows)) + ' حزمة ' + json.dumps(by, ensure_ascii=False))

if __name__ == '__main__':
    main()
