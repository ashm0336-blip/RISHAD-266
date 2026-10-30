#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO_259 · SOT-128 — مصفوفةُ التتبّع «المتطلب → الكود → الاختبار → الدليل» آلياً من المرجع الرسمي والمستودع (لا تُحرَّر يدوياً).
     python3 tools/trace.py            يكتب docs/traceability.md و reports/traceability.json
     python3 tools/trace.py --check    يعيد التوليد ويقارن الملتزَم (exit 1 عند فرق) ويفشل على «مكتمل بلا دليل» في P0/P1
   المصادر:
     · المرجع: docs/sot/KIVO_MASTER_REQUIREMENTS_v6.json — المعرّف · العنوان · الأولوية · الحالة · آخرُ تحقّقٍ مسجَّل (الإصدار · المستوى · الأدلة) أو حقلُ evidence.
     · المستودعُ الرسمي (ذكرُ المعرّف SOT-NNN/AUD-NNN): الكود (src · workers/parts · tools · scripts · build · migrations · config · public) ·
       الاختبارات (tests · cfbench للمرشّحات 251+ وحزمُ البوابة الدائمة المذكورة في gateall أحدث مرشّح) · الوثائق (docs عدا sot · CHANGELOG · README).
     · الأدلةُ المسجَّلة نفسُها: كلُّ مسارٍ متتبَّعٍ تذكره (اختبار · كود · تقرير) وكلُّ اسمِ حزمةٍ (k2NNxxx · pNNxxx · rNNNxxx) يُحلّ إلى ملفّها.
   الأحكام: «مكتمل» في P0/P1 بلا دليلٍ مسجَّل = فجوةٌ تُفشل الفحص · وما سواها يُعدّ (بندٌ مفتوح بلا ذكرٍ في الكود ولا الاختبارات = «بلا أثر» للعلم)."""
import os, re, sys, json, glob, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOT = os.path.join(ROOT, 'docs', 'sot', 'KIVO_MASTER_REQUIREMENTS_v6.json')
OUT_MD = os.path.join(ROOT, 'docs', 'traceability.md'); OUT_JS = os.path.join(ROOT, 'reports', 'traceability.json')
RX = re.compile(r'\b((?:SOT|AUD)-\d{3})\b')
CODE = ('src/', 'workers/parts/', 'tools/', 'scripts/', 'build/', 'migrations/', 'config/', 'public/')
DOCS = ('docs/',)

def tracked():
    out = subprocess.run(['git', 'ls-files', '--cached', '--others', '--exclude-standard'], cwd=ROOT, capture_output=True, text=True).stdout.split('\n')   # المتتبَّعُ والجديدُ غيرُ المستثنى — النتيجةُ لا تتعلّق بلحظة الالتزام
    return sorted(set(f for f in out if f and 'node_modules/' not in f))

def gate_suites():
    """حزمُ البوابة الدائمة في أحدث gateallNNN.sh (أسماءُ ملفات cfbench) — اختباراتٌ نشطة وإن سبقت 251."""
    gs = sorted(glob.glob(os.path.join(ROOT, 'gateall2[0-9][0-9].sh')))
    if not gs: return set()
    t = open(gs[-1], encoding='utf-8').read()
    return set(re.findall(r'([A-Za-z0-9_]+\.mjs)', t))

def kind(f, suites):
    if f.startswith('docs/sot/') or f in ('docs/traceability.md',): return None
    if f.startswith(CODE) and not f.startswith('src/pages/'): return 'code'
    if f.startswith('tests/'): return 'test'
    if f.startswith('cfbench/'):
        b = os.path.basename(f)
        if re.match(r'k2(5[1-9]|6\d)', b) or b in suites: return 'test'
        return None
    if f.startswith(DOCS) or f in ('CHANGELOG.md', 'README.md'): return 'doc'
    if re.match(r'gateall2\d\d\.sh$', f): return 'test'
    return None

def build():
    S = json.load(open(SOT, encoding='utf-8')); suites = gate_suites()
    refs = {}
    for f in tracked():
        k = kind(f, suites)
        if not k: continue
        p = os.path.join(ROOT, f)
        if not os.path.isfile(p) or os.path.getsize(p) > 6_000_000: continue
        try: t = open(p, encoding='utf-8', errors='ignore').read()
        except Exception: continue
        for i in set(RX.findall(t)):
            refs.setdefault(i, {'code': [], 'test': [], 'doc': []})[k].append(f)
    files = set(tracked())
    def from_evidence(ev):
        """المسارُ المذكور في الدليل (موجودٌ متتبَّعاً) أو اسمُ حزمةٍ (k2NNxxx · pNNxxx · rNNNxxx) يُحلّ إلى ملفّها: اختبارٌ أو كودٌ أو تقرير."""
        out = {'code': set(), 'test': set(), 'report': set()}
        for e in ev:
            for m in re.findall(r'[A-Za-z0-9_.-]+(?:/[A-Za-z0-9_.-]+)+', str(e)):
                m = m.rstrip('.,:;)')
                hit = m if m in files else next((f for f in files if f.startswith(m.rstrip('/') + '/')), None)
                if not hit: continue
                k = 'report' if m.startswith(('reports/', 'docs/evidence/')) else kind(hit, suites)   # KIVO_260: أدلةُ التدقيق المنسوخة تقاريرُ
                if k in ('code', 'test'): out[k].add(m)
                elif k == 'report' or m.startswith(('reports/', 'pk')): out['report'].add(m)
            for m in re.findall(r'\b((?:k2\d\d|p\d{1,3}|r1\d\d)[a-z][a-z0-9]*)\b', str(e)):
                for cand in ('cfbench/' + m + '.mjs', 'tests/source/' + m + '.py', 'tests/unit/' + m + '.test.mjs'):
                    if cand in files: out['test'].add(cand)
        return out
    rows = []
    for x in S['DATA']:
        v = (x.get('verifications') or [])
        last = v[-1] if v else None
        ev = (last.get('evidence') if last else None) or ([x['evidence']] if x.get('evidence') else [])
        # KIVO_260 (كشفته البطاقةُ المستقلة النهائية — §٤ بند 11): بندٌ رفعه تدقيقُ 2026-10-09 إلى «مكتمل» بلا تحقّقٍ لاحق كان يُعرض بدليل v5
        # القديم («لم يُثبت» · «غير موجود حاليًا في Preview») فيناقض حالتَه — يُعرض دليلُ التدقيق نفسُه بمساراته في docs/evidence/k243 (نسخةُ المختبر)
        au = x.get('audit_2026_10_09') or {}
        auev = [str(e).replace('k243/evidence/', 'docs/evidence/k243/') for e in (au.get('evidence') or [])] if (not last and au.get('status') == x['status']) else []
        if auev: ev = ['تدقيقُ 2026-10-09: ' + auev[0]] + auev[1:]
        r = refs.get(x['id'], {'code': [], 'test': [], 'doc': []})
        allev = [e for vv in v for e in (vv.get('evidence') or [])] + ([x['evidence']] if x.get('evidence') else []) + auev
        fe = from_evidence(allev)
        rows.append({'id': x['id'], 'title': x['title'], 'priority': x['priority'], 'status': x['status'],
                     'verified': ({'version': last.get('version'), 'level': last.get('level'), 'date': last.get('date')} if last else None),
                     'evidence': [str(e) for e in ev][:6],
                     'code': sorted(set(r['code']) | fe['code']), 'tests': sorted(set(r['test']) | fe['test']), 'docs': sorted(r['doc']), 'reports': sorted(fe['report'])})
    return S, rows

def md(S, rows):
    esc = lambda s: str(s).replace('|', '¦').replace('\n', ' ')
    short = lambda L, n=3: (' · '.join('`' + esc(x) + '`' for x in L[:n]) + (' (+' + str(len(L) - n) + ')' if len(L) > n else '')) if L else '—'
    L = ['# مصفوفةُ التتبّع — المتطلب → الكود → الاختبار → الدليل (SOT-128)', '',
         '> مولَّدةٌ آلياً بـ`python3 tools/trace.py` من المرجع الرسمي (`docs/sot/KIVO_MASTER_REQUIREMENTS_v6.json` · مراجعته ' + str(S['META'].get('revision', '?')) + ' · ' + str(S['META'].get('updated', '')) + ') ومن ذكر المعرّف في المستودع الرسمي؛ لا تُحرَّر يدوياً.',
         '> الكود: `src` · `workers/parts` · `tools` · `scripts` · `build` · `migrations` · `config` · `public` — الاختبارات: `tests` · `cfbench` (مرشّحات 251+ وحزمُ البوابة الدائمة) — الوثائق: `docs` · `CHANGELOG`.', '']
    for pr in ('P0', 'P1', 'P2', 'P3'):
        R = [r for r in rows if r['priority'] == pr]
        if not R: continue
        st = {}
        for r in R: st[r['status']] = st.get(r['status'], 0) + 1
        traced = sum(1 for r in R if r['code'] or r['tests'])
        L += ['## ' + pr + ' — ' + str(len(R)) + ' بنداً · ' + ' · '.join(k + ' ' + str(v) for k, v in sorted(st.items(), key=lambda a: -a[1])) + ' · له أثرٌ في الكود أو الاختبارات: ' + str(traced), '',
              '| المعرّف | العنوان | الحالة | آخرُ تحقّق | الكود | الاختبارات | الوثائق | التقارير | الدليل |', '|---|---|---|---|---|---|---|---|---|']
        for r in R:
            vv = (str(r['verified']['version']) + ' · ' + str(r['verified']['level'])) if r['verified'] else '—'
            L.append('| ' + ' | '.join([r['id'], esc(r['title'])[:70], r['status'], esc(vv), short(r['code']), short(r['tests']), str(len(r['docs'])) if r['docs'] else '—', short(r['reports'], 2), esc(' ؛ '.join(r['evidence']))[:140] or '—']) + ' |')
        L.append('')
    return '\n'.join(L) + '\n'

def release_disclosure_errors(requirements, text):
    """SOT-176 is a release-audit disclosure criterion, not an R185 test PASS.
    Validate that exact source criterion and its bounded release disclosure;
    engineering requirements keep the existing code/test trace gate unchanged.
    """
    item = next((x for x in requirements['DATA'] if x['id'] == 'SOT-176'), {})
    expected = {
        'kind': 'تدقيق إصدار',
        'status': 'يحتاج إثبات',
        'acceptance': 'ذكر الاختبارات غير المنفذة وحدود اعتمادها في تقرير الإصدار النهائي.',
        'next': 'إعادة الاختبارات الحقيقية حين تتوافر المدخلات المرجعية، ولا تحسب ضمن PASS الحالي.',
    }
    errors = ['SOT-176 source disclosure criterion changed: ' + key for key, value in expected.items() if item.get(key) != value]
    begin, end = '<!-- SOT-176_RELEASE_DISCLOSURE_BEGIN -->', '<!-- SOT-176_RELEASE_DISCLOSURE_END -->'
    if text.count(begin) != 1 or text.count(end) != 1 or text.index(begin) >= text.index(end):
        return errors + ['SOT-176 release disclosure block is missing or ambiguous']
    block = text.split(begin, 1)[1].split(end, 1)[0]
    required = (
        'حالة SOT-176: يحتاج إثبات.',
        'R185: لم يُشغّل؛ r185_fixture.json وملف المقارنة والخريطة الواقعية غير متوفرة.',
        'alpha/racebase: لم تُشغّل التأكيدات السالبة الستة (3+3) لغياب مرجع KIVO_201.',
        'هذه الاختبارات لا تُحتسب ضمن PASS الحالي.',
        'يلزم توفير المدخلات المرجعية وإعادة تشغيل الاختبارات الحقيقية قبل اعتماد نتائجها.',
        'اختبارات الاستيراد الاصطناعية الحالية لا تعوّض تلك المقارنات المرجعية.',
    )
    if any(line not in block for line in required):
        errors.append('SOT-176 required non-execution or acceptance-limit disclosure is missing')
    # A success claim elsewhere in the release report cannot override the
    # bounded disclosure. The one permitted PASS sentence explicitly excludes it.
    remaining = block.replace('هذه الاختبارات لا تُحتسب ضمن PASS الحالي.', '')
    if re.search(r'\b(?:PASS|passed|success)\b|ناجح|نجح', remaining, re.IGNORECASE) or re.search(r'(?:R185|alpha/racebase|KIVO_201)[^\n]*(?:\bPASS\b|\bpassed\b|ناجح|نجح)', text, re.IGNORECASE):
        errors.append('SOT-176 unexecuted reference tests must not claim PASS')
    return errors


def main():
    S, rows = build()
    gaps = [r['id'] for r in rows if r['priority'] in ('P0', 'P1') and r['status'] == 'مكتمل' and not r['evidence']]
    noTrace = [r['id'] for r in rows if r['status'] != 'مكتمل' and not r['code'] and not r['tests']]
    # KIVO_263 · SOT-128: «مفتوح P0/P1 هندسيٌّ بلا أثر» = 0 شرطٌ للفحص. غيرُ الهندسي (قرارُ المالك · ما بعد Production) مسمّى صراحةً بسببه في tools/trace_nonengineering.json
    NE = json.load(open(os.path.join(ROOT, 'tools', 'trace_nonengineering.json'), encoding='utf-8'))['items']
    byId = {r['id']: r for r in rows}
    engGap = [i for i in noTrace if byId[i]['priority'] in ('P0', 'P1') and byId[i]['status'] != 'معلّق بقرار' and i not in NE]
    txt = md(S, rows); js = json.dumps({'sotRevision': S['META'].get('revision'), 'rows': rows}, ensure_ascii=False, indent=1) + '\n'
    if '--check' in sys.argv:
        report = os.path.join(ROOT, 'docs', 'RISHAD266_PLAYBOOK.md')
        disclosure = open(report, encoding='utf-8').read() if os.path.isfile(report) else ''
        disclosure_errors = release_disclosure_errors(S, disclosure)
        for error in disclosure_errors: print('✘ ' + error)
        cur = open(OUT_MD, encoding='utf-8').read() if os.path.exists(OUT_MD) else ''
        same = cur == txt
        if subprocess.run(['git', 'rev-parse', '--git-dir'], cwd=ROOT, capture_output=True).returncode != 0:
            # KIVO_259 · AUD-029: المستودعُ الرسمي وحده (تصديرٌ بلا git ولا مختبر) — المصفوفةُ تُولَّد في المستودع الانتقالي بأدلته كلِّها؛ هنا يُفحص «لا مكتمل بلا دليل» وحده
            print(('✔' if not gaps and not disclosure_errors else '✘') + ' مصفوفةُ التتبّع: ' + str(len(rows)) + ' بنداً · المستودعُ الرسمي وحده (بلا git) — المساواةُ مع التوليد تُفحص في المستودع الانتقالي · «مكتمل» P0/P1 بلا دليل: ' + str(len(gaps)))
            sys.exit(0 if not gaps and not disclosure_errors else 1)
        print(('✔' if same and not gaps and not engGap and not disclosure_errors else '✘') + ' مصفوفةُ التتبّع: ' + str(len(rows)) + ' بنداً · ' + ('= التوليد' if same else '≠ التوليد (شغّل tools/trace.py)') +
              ' · «مكتمل» P0/P1 بلا دليل: ' + str(len(gaps)) + (' ' + json.dumps(gaps[:8]) if gaps else '') + ' · مفتوحٌ بلا أثرٍ في الكود/الاختبارات (للعلم): ' + str(len(noTrace)) +
              ' · مفتوحٌ P0/P1 هندسيٌّ بلا أثر: ' + str(len(engGap)) + (' ' + json.dumps(engGap) if engGap else ''))
        sys.exit(0 if same and not gaps and not engGap and not disclosure_errors else 1)
    open(OUT_MD, 'w', encoding='utf-8').write(txt)
    os.makedirs(os.path.dirname(OUT_JS), exist_ok=True); open(OUT_JS, 'w', encoding='utf-8').write(js)
    tr = sum(1 for r in rows if r['code'] or r['tests'])
    print('✎ docs/traceability.md · reports/traceability.json — ' + str(len(rows)) + ' بنداً · له أثرٌ في الكود أو الاختبارات ' + str(tr) + ' · «مكتمل» P0/P1 بلا دليل ' + str(len(gaps)) + ' · مفتوحٌ بلا أثر ' + str(len(noTrace)))

if __name__ == '__main__':
    main()
