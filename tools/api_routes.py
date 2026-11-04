#!/usr/bin/env python3
"""KIVO_263 · SOT-106 — كلُّ مسارٍ في الخادم له مالك: جدولٌ مولَّد «المسار → الجزء → الدالة → الحارس» من workers/parts نفسِها
مطابَقٌ مع العقد المقروء آلياً src/api/contracts.json — لا مسارَ في الخادم بلا عقد، ولا عقدَ بلا مسار.

  python3 tools/api_routes.py --write   → docs/api-routes.md
  python3 tools/api_routes.py --check   → يُخفق عند مسارٍ بلا عقد/عقدٍ بلا مسار/وثيقةٍ متقادمة
"""
import json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARTS = os.path.join(ROOT, 'workers', 'parts')
OUT = os.path.join(ROOT, 'docs', 'api-routes.md')
HANDLE_MAX = 635   # 633 بعد SOT-096 · +2 سطرَي فحص الشكل (SOT-101)
GUARD = {
    'public':  'بلا جلسة (حارسُ المحاولات/المصدر حيث يلزم)',
    'session': 'جلسةٌ صالحة (session) وحسابٌ قائمٌ غيرُ مجمَّد',
    'actor':   'جلسة + فاعلٌ قائم — كلُّ مفتاحٍ يمرّ بـcanWrite/canRead (أو الإنفاذ: enfCanWrite/enfRead)',
    'super':   'مديرُ النظام وحده (isAdminPath ⇒ role super)',
    'enforce': 'بيئةُ الإنفاذ (enfEnvOn: المتغيّر KIVO_AUTHZ_MODE = enforce وحده، ومنها Production — config/wrangler.toml) ∧ مديرُ النظام · و/api/authz-test وحده يشترط أداةَ الاختبار (KIVO_TEST_FIXTURE + مضيف Test) ويُنزع من Production',
}
FN_RX = re.compile(r'^(?:async\s+)?function\s+(\w+)\s*\(|^\s{2}(?:async\s+)?(?!(?:if|for|while|switch|catch|return)\b)(\w+)\s*\([^)]*\)\s*\{', re.M)
RT_RX = re.compile(r"path === '(/api/[A-Za-z0-9/_-]+)'|path\.indexOf\('(/api/[A-Za-z0-9/_-]+)'\) === 0")

def scan():
    found = {}
    for f in sorted(os.listdir(PARTS)):
        if not f.endswith('.js'): continue
        t = open(os.path.join(PARTS, f), encoding='utf-8').read()
        fns = [(m.start(), m.group(1) or m.group(2)) for m in FN_RX.finditer(t)]
        for m in RT_RX.finditer(t):
            r = m.group(1) or m.group(2)
            fn = ([n for (p, n) in fns if p < m.start()] or ['(أعلى الجزء)'])[-1]
            found.setdefault(r, set()).add((f, fn))
    return found

def main(a):
    C = json.load(open(os.path.join(ROOT, 'src/api/contracts.json'), encoding='utf-8'))
    con = {r['path']: r for r in C['routes']}
    found = scan(); bad = []
    for r in sorted(set(found) - set(con)): bad.append('مسارٌ في الخادم بلا عقد: ' + r + ' ' + str(sorted(found[r])))
    for r in sorted(set(con) - set(found)): bad.append('عقدٌ بلا مسارٍ في الخادم: ' + r)
    for r, c in con.items():
        if c.get('access') not in GUARD: bad.append(r + ': مستوى وصولٍ غيرُ معروف ' + str(c.get('access')))
    # سقّاطةُ حجم الموزِّع (لا Worker monolith يتضخّم): handle كان 788 سطراً في 262 ⇒ 633 بعد فصل المصادقة (SOT-096) — لا يزيد
    h = open(os.path.join(PARTS, '063-enf-api-and-handler.js'), encoding='utf-8').read().split('\n')
    s0 = next((i for i, l in enumerate(h) if l.startswith('  async handle(request, env) {')), None)
    n = next((i - s0 for i in range(s0 + 1, len(h)) if re.match(r'^  \},?$', h[i])), 0) if s0 is not None else 0
    if not n or n > HANDLE_MAX: bad.append('الموزِّعُ handle = %d سطراً > السقف %d (افصل المساراتِ الجديدة في جزءٍ كما في 062a)' % (n, HANDLE_MAX))
    L = ['# مساراتُ الخادم ومالكوها — KIVO (مولَّد: `python3 tools/api_routes.py --write` — لا يُحرَّر يدوياً)', '',
         '> SOT-106: «كل route له owner» — المالكُ هو الجزءُ والدالةُ اللذان يعالجان المسار في `workers/parts/` (يُجمَعان في `workers/_worker.js` بترتيب `workers/parts.json`)،',
         '> والحارسُ مستوى الوصول في العقد `src/api/contracts.json` (الشكلُ والأخطاء في `docs/api.md`).', '',
         '| المسار | الطرائق | الحارس | المالك (الجزء · الدالة) |', '|---|---|---|---|']
    for r in sorted(con):
        c = con[r]; own = ' · '.join('`%s` `%s`' % x for x in sorted(found.get(r, [])))
        L.append('| `%s` | %s | %s — %s | %s |' % (r, ' / '.join(c.get('methods', [])), c.get('access'), GUARD.get(c.get('access'), '?'), own or '—'))
    text = '\n'.join(L) + '\n'
    if '--write' in a: open(OUT, 'w', encoding='utf-8').write(text)
    elif not os.path.exists(OUT) or open(OUT, encoding='utf-8').read() != text: bad.append('docs/api-routes.md متقادمة — أعد --write')
    for b in bad: print('  ✘', b)
    print('النتيجة: %d مساراً في الخادم = %d عقداً — لكلٍّ مالكٌ وحارس · %d مخالفة' % (len(found), len(con), len(bad)))
    return 1 if bad else 0

if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
