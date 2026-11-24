#!/usr/bin/env python3
"""KIVO_263 · AUD-024 — ميزانيةُ الحجم: كلُّ صفحةٍ كسولة (قالبُها + منطقُها) والغلافُ والعامل بحجمٍ مضغوطٍ (gzip -9) لا يتجاوز سقفَه المسجَّل.
«تجاوزُ الميزانية يُفشل البناء» — السقفُ = حجمُ KIVO_263 + 5٪ هامشاً (سقّاطة: تُخفَّض ولا تُرفع إلا بقرارٍ مكتوبٍ في tools/perf_budget.json).

  python3 tools/perf_budget.py pk263            → يقيس ويقارن (exit 1 عند تجاوز)
  python3 tools/perf_budget.py pk263 --write    → يكتب السقوفَ من القياس الحالي (+5٪) — للإصدار الذي يعتمدها فقط

الصفحاتُ التي تتجاوز 300 KB خاماً تُذكر بأسمائها («تقسيمُ الصفحات > 300 KB» عملٌ مفتوح — AUD-024): السقّاطةُ تمنع نموَّها حتى تُقسَّم.
"""
import gzip, json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUD = os.environ.get('KIVO_PERF_BUDGET') or os.path.join(ROOT, 'tools', 'perf_budget.json')   # V7 · 53: KIVO_PERF_BUDGET لاختبار القاعدة وحده

def measure(pk, assets=()):
    D = os.path.join(ROOT, pk)
    bj = json.load(open(D + '.build.json', encoding='utf-8'))
    ret = set(bj.get('retainedFiles') or [])
    groups = {}
    for f in bj['files']:
        if f in ret: continue
        m = re.match(r'assets/pages/([A-Za-z-]+)\.(?:logic\.)?[0-9a-f]{10}\.(?:dc\.txt|js)$', f)
        if m: groups.setdefault('page:' + m.group(1), []).append(f)
        # V7 · د6: ملفُّ خدمةٍ في الغلاف له سقفٌ مسمّى (asset:<الاسم بلا بصمة>) — يُقاس ما سُمّي في الميزانية وحده
        a = re.match(r'assets/js/([0-9A-Za-z_-]+)\.[0-9a-f]{10}\.js$', f)
        if a and 'asset:' + a.group(1) in assets: groups.setdefault('asset:' + a.group(1), []).append(f)
    groups['shell:index.html'] = ['index.html']; groups['worker:_worker.js'] = ['_worker.js']
    out = {}
    for g, fs in sorted(groups.items()):
        raw = b''.join(open(os.path.join(D, f), 'rb').read() for f in fs)
        out[g] = {'raw': len(raw), 'gz': len(gzip.compress(raw, 9))}
    return out

def prod_worker(pk, rule, B):
    """V7 · 53 (REVIEW.md البند ١٦ — قرارُ المراجع بتفويض المالك، الخيار أ): بوابةُ الميزانية تقيس العاملَ الذي يُشحن للشركة —
       عاملُ المرشّح منزوعاً بـtools/prod_strip.strip_worker نفسِه (الدالةُ التي تكتب حزمةَ الإنتاج pk<N>.prod) — وهامشُه ≥ rule.minMarginPct
       من سقف rule.group؛ وعاملُ Preview (المرشّح مع أداة الاختبار) يبقى تحت السقف دائماً (فحصُ السقف المعتاد أعلاه)."""
    if not rule: return None
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import prod_strip
    w = open(os.path.join(ROOT, pk, '_worker.js'), encoding='utf-8').read()
    s = prod_strip.strip_worker(w)
    g, mn = rule['group'], float(rule['minMarginPct'])
    if s is None or g not in B: return {'group': g, 'gz': 0, 'margin': 0.0, 'min': rule['minMarginPct'], 'ok': False}
    gz = len(gzip.compress(s.encode('utf-8'), 9)); margin = (B[g] - gz) * 100.0 / B[g]
    return {'group': g, 'gz': gz, 'margin': margin, 'min': rule['minMarginPct'], 'ok': margin >= mn}

def main(a):
    if not a: print(__doc__); return 2
    try: named = [g for g in json.load(open(BUD, encoding='utf-8'))['budget'] if g.startswith('asset:')]
    except Exception: named = []
    M = measure(a[0], named)
    if '--write' in a:
        json.dump({'note': 'KIVO_263 · AUD-024: السقفُ = gz عند الاعتماد × 1.05 — يُخفَّض ولا يُرفع إلا بقرارٍ مكتوب', 'budget': {g: int(v['gz'] * 1.05) for g, v in M.items()}},
                  open(BUD, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print('✎ tools/perf_budget.json (' + str(len(M)) + ' سقفاً)')
    BJ = json.load(open(BUD, encoding='utf-8')); B = BJ['budget']
    bad = [g for g in M if g in B and M[g]['gz'] > B[g]] + [g + ' (بلا سقف)' for g in M if g not in B] + [g + ' (سقفٌ بلا ملف)' for g in named if g not in M]
    prod = prod_worker(a[0], BJ.get('prodWorker'), B)
    if prod and not prod['ok']: bad.append(prod['group'] + ' (الإنتاج)')
    big = [g + ' ' + str(round(M[g]['raw'] / 1024)) + 'KB' for g in M if g.startswith('page:') and M[g]['raw'] > 300 * 1024]
    for g in sorted(M): print('  %s %-28s gz %8d / %8s   raw %9d' % ('✘' if g in bad else '✔', g, M[g]['gz'], B.get(g, '—'), M[g]['raw']))
    if prod:
        g = prod['group']
        print('  %s %-28s gz %8d / %8s   (Preview · مع أداة الاختبار — تحت السقف دائماً)' % ('✘' if M.get(g, {}).get('gz', 0) > B.get(g, 0) else '✔', g, M.get(g, {}).get('gz', 0), B.get(g, '—')))
        print('  %s %-28s gz %8d / %8s   هامش %.2f٪ (الحدُّ الأدنى %s٪ — العاملُ الذي يُشحن: نزعُ tools/prod_strip.py)' % ('✔' if prod['ok'] else '✘', g + ' prod', prod['gz'], B.get(g, '—'), prod['margin'], prod['min']))
    print('   صفحاتٌ > 300 KB خاماً (تقسيمُها مفتوح — السقّاطةُ تمنع نموَّها): ' + (' · '.join(big) or 'لا شيء'))
    print('النتيجة: %d حجماً تحت سقوفها · %d تجاوز' % (len(M) - len(bad), len(bad)))
    return 1 if bad else 0

if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
