#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO_258 · SOT-143 — المقاييسُ التقنية من السجلّ المنظَّم (لوحةُ صحةٍ قابلةٌ للقياس بلا اعتماديةٍ على لوحةٍ خارجية):
   يقرأ أسطر JSON (مخرجاتُ Workers Logs/Logpush NDJSON · أو مخرجاتُ console من Miniflare — أيُّ سطرٍ يبدأ بـ{"v":1) ويحسب ما يعرّفه
   src/observability/events.json: معدّلُ الطلبات · نسبةُ الأخطاء والرفض · الكمونُ p50/p95/p99 (كلّياً ولكل مسار) · أحداثُ الخطأ والحماية والحرّاس
   — ويقيّم التنبيهات A1..A5 على نوافذها الزمنية. المخرجات: نصٌّ + JSON (--json) + صفحةُ HTML مستقلة (--html).
     python3 tools/obs/metrics_report.py <log.ndjson ...> [--json out.json] [--html out.html] [--strict]   (--strict: خروجٌ 1 إن أطلق تنبيه)"""
import sys, os, json, math, collections, datetime, html as H
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEF = json.load(open(os.path.join(ROOT, 'src/observability/events.json'), encoding='utf-8'))
def pct(xs, q):
    if not xs: return None
    s = sorted(xs); i = max(0, min(len(s) - 1, int(math.ceil(q / 100.0 * len(s))) - 1)); return s[i]
RE_V1 = __import__('re').compile(r'\{\s*"v"\s*:\s*1\s*,')   # بدايةُ سطر المخطّط v1 (JSON.stringify: {"v":1,…) — بعد بادئةٍ إن وُجدت
def load(paths):
    out, bad = [], 0
    for p in paths:
        for line in open(p, encoding='utf-8', errors='replace'):
            mv = RE_V1.search(line)
            if not mv: continue
            i = mv.start()
            try: o = json.loads(line[i:].strip())
            except Exception: bad += 1; continue
            if not (isinstance(o, dict) and o.get('ev')): continue
            if isinstance(o.get('t'), str):   # t في المخطّط v1 نصُّ ISO — يُحوَّل مللي ثانية للنوافذ الزمنية
                try: o['t'] = int(datetime.datetime.fromisoformat(o['t'].replace('Z', '+00:00')).timestamp() * 1000)
                except Exception: o['t'] = 0
            out.append(o)
    return out, bad
def evaluate(rows):
    req = [r for r in rows if r['ev'] == 'req']; ts = sorted(r.get('t', 0) for r in rows if r.get('t'))
    span = (ts[-1] - ts[0]) / 60000.0 if len(ts) > 1 else 0
    byp = collections.defaultdict(list)
    for r in req: byp[r.get('p', '?')].append(r)
    def lat(rs): d = [r.get('dur', 0) for r in rs if isinstance(r.get('dur'), (int, float))]; return {'n': len(d), 'p50': pct(d, 50), 'p95': pct(d, 95), 'p99': pct(d, 99), 'max': max(d) if d else None}
    err = [r for r in req if (r.get('st') or 0) >= 500]; den = [r for r in req if r.get('st') in (401, 403)]
    cnt = collections.Counter(r['ev'] for r in rows)
    M = {
        'req_rate': {'total': len(req), 'perMin': round(len(req) / span, 1) if span else None, 'spanMin': round(span, 2)},
        'error_ratio': {'n': len(err), 'ratio': (len(err) / len(req)) if req else 0},
        'denied_ratio': {'n': len(den), 'ratio': (len(den) / len(req)) if req else 0},
        'latency': dict(lat(req), byPath={p: lat(rs) for p, rs in sorted(byp.items(), key=lambda kv: -len(kv[1]))}),
        'latency_excl_longpoll': lat([r for r in req if r.get('p') != '/api/changes']),   # KIVO_260: بلا قناة الانتظار الطويل (A4)
        'server_errors': sum(cnt[e] for e in ('worker-error', 'save-failed', 'img-failed', 'assets-error')),
        'protect_mode': cnt['authz-unavailable'],
        'security_guards': sum(cnt[e] for e in ('ph-redacted', 'users-unparseable', 'users-stale-ph', 'origin-reject')),
        'swallowed_errors': dict(collections.Counter(r.get('op', '?') for r in rows if r['ev'] == 'swallowed')),
        'events': dict(cnt), 'unknownEvents': sorted(e for e in cnt if e not in DEF['events'])}
    # التنبيهات على نوافذها: أسوأ نافذةٍ متحرّكة
    def worst(pred, minutes, ratio=False):
        W = minutes * 60000; best = 0.0; rs = sorted((r for r in rows if r.get('t')), key=lambda r: r['t']); j = 0
        for i in range(len(rs)):
            while rs[i]['t'] - rs[j]['t'] > W: j += 1
            win = rs[j:i + 1]
            if ratio:
                rq = [r for r in win if r['ev'] == 'req']
                if len(rq) >= 20: best = max(best, sum(1 for r in rq if pred(r)) / len(rq))
            else: best = max(best, sum(1 for r in win if pred(r)))
        return best
    # KIVO_260 (كشفته البطاقةُ المستقلة النهائية — §٢-أ-5): A4 كان يُطلق زوراً لأن /api/changes قناةُ انتظارٍ طويل بالتصميم (wait=1 حتى 25 ث)
    # فيرفع p95 وحده — تُستثنى من نافذة الكمون (والكمونُ بلاها معروضٌ أيضاً latency_excl_longpoll)
    LONGPOLL = ('/api/changes',)
    def p95win(minutes):
        W = minutes * 60000; rs = sorted((r for r in req if r.get('t') and r.get('p') not in LONGPOLL), key=lambda r: r['t']); best = 0; j = 0
        for i in range(len(rs)):
            while rs[i]['t'] - rs[j]['t'] > W: j += 1
            d = [r.get('dur', 0) for r in rs[j:i + 1]]
            if len(d) >= 20: best = max(best, pct(d, 95))
        return best
    mins = lambda w: int(w.rstrip('mh')) * (60 if w.endswith('h') else 1)
    A = []
    for a in DEF['alerts']:
        m, w = a['metric'], mins(a['window'])
        if m == 'error_ratio': v = worst(lambda r: (r.get('st') or 0) >= 500, w, ratio=True)
        elif m == 'protect_mode': v = worst(lambda r: r['ev'] == 'authz-unavailable', w)
        elif m == 'security_guards': v = worst(lambda r: r['ev'] in ('ph-redacted', 'users-unparseable', 'users-stale-ph', 'origin-reject'), w)
        elif m == 'latency_p95': v = p95win(w)
        elif m == 'server_errors': v = worst(lambda r: r['ev'] in ('worker-error', 'save-failed', 'img-failed', 'assets-error'), w)
        else: v = None
        op, th = a['when'].split()[0], float(a['when'].split()[1])
        fired = v is not None and ((op == '>' and v > th) or (op == '>=' and v >= th))
        A.append({'id': a['id'], 'severity': a['severity'], 'metric': m, 'window': a['window'], 'when': a['when'], 'value': v, 'fired': fired, 'runbook': a['runbook'], 'desc': a['desc']})
    return M, A
def html(M, A, src):
    rows = ''.join('<tr><td>%s</td><td>%d</td><td>%s</td><td>%s</td><td>%s</td></tr>' % (H.escape(p), v['n'], v['p50'], v['p95'], v['p99']) for p, v in M['latency']['byPath'].items())
    al = ''.join('<tr class="%s"><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>' % ('fire' if a['fired'] else 'ok', a['id'], a['severity'], H.escape(a['desc']), a['when'] + ' / ' + a['window'], a['value'], 'أُطلق' if a['fired'] else 'هادئ') for a in A)
    return ('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>KIVO — صحة المنصة</title><style>body{font:14px system-ui;margin:24px;color:#1f2937}'
            'table{border-collapse:collapse;margin:12px 0}td,th{border:1px solid #d1d5db;padding:4px 10px;text-align:right}.fire{background:#fee2e2}.ok{background:#ecfdf5}h1{font-size:20px}</style>'
            '<h1>صحةُ المنصة — من السجلّ المنظَّم</h1><p>المصدر: %s · الطلبات %d · الأخطاء %d (%.3f٪) · الرفض %d · الكمون p50 %s · p95 %s · p99 %s ms</p>'
            '<h2>التنبيهات</h2><table><tr><th>المعرّف</th><th>الخطورة</th><th>الوصف</th><th>الشرط</th><th>القيمة</th><th>الحالة</th></tr>%s</table>'
            '<h2>الكمونُ لكل مسار (ms داخل العامل)</h2><table><tr><th>المسار</th><th>العدد</th><th>p50</th><th>p95</th><th>p99</th></tr>%s</table></html>') % (
        H.escape(src), M['req_rate']['total'], M['error_ratio']['n'], 100 * M['error_ratio']['ratio'], M['denied_ratio']['n'], M['latency']['p50'], M['latency']['p95'], M['latency']['p99'], al, rows)
if __name__ == '__main__':
    a = sys.argv[1:]; files = [x for x in a if not x.startswith('--') and (a.index(x) == 0 or a[a.index(x) - 1] not in ('--json', '--html'))]
    rows, bad = load(files); M, A = evaluate(rows)
    print('══ صحةُ المنصة من السجلّ: %d سطراً (%d غيرُ مقروء) · %s ══' % (len(rows), bad, ', '.join(os.path.basename(f) for f in files)))
    print('  الطلبات %d (%s/د) · الأخطاء %d (%.3f٪) · الرفض 401/403 %d · الكمون p50 %s · p95 %s · p99 %s · max %s ms' % (M['req_rate']['total'], M['req_rate']['perMin'], M['error_ratio']['n'], 100 * M['error_ratio']['ratio'], M['denied_ratio']['n'], M['latency']['p50'], M['latency']['p95'], M['latency']['p99'], M['latency']['max']))
    print('  أخطاءُ الخادم %d · وضعُ الحماية %d · الحرّاسُ الأمنية %d · المبتلَع %s · أحداثٌ غيرُ معرَّفة %s' % (M['server_errors'], M['protect_mode'], M['security_guards'], json.dumps(M['swallowed_errors'], ensure_ascii=False), M['unknownEvents'] or '—'))
    for x in A: print('  %s %s [%s] %s: %s %s / %s → %s' % ('🔴' if x['fired'] else '🟢', x['id'], x['severity'], x['desc'], x['metric'], x['when'], x['window'], x['value']))
    if '--json' in a: json.dump({'metrics': M, 'alerts': A, 'lines': len(rows), 'unparsed': bad}, open(a[a.index('--json') + 1], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    if '--html' in a: open(a[a.index('--html') + 1], 'w', encoding='utf-8').write(html(M, A, ', '.join(os.path.basename(f) for f in files)))
    sys.exit(1 if ('--strict' in a and any(x['fired'] for x in A)) else 0)
