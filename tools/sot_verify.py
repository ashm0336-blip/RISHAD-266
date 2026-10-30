#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KIVO_259 · المرجعُ الرسمي SOT v6 — كتابةُ CSV من JSON والتحقّقُ المستمرّ (يستدعيهما tools/sot.py render · exit 1 عند أيّ إخفاق):
     python3 tools/sot_verify.py [--write-csv]        (SOT_DIR يبدّل docs/sot)
   لماذا (إفصاح — خللٌ اكتُشف في 259): مسارُ العرض كان يستدعي k243/audit/sot_v6_verify.py — محقِّقَ «لقطة» إنشاء v6 (224 بنداً · الحالةُ = حالةُ التدقيق)
   فصار يُخفق منذ أوّل تحديثٍ للحالات (8 فحوص) ولا يوقف العرض (يخرج بـ0)، وCSV لم يُعَد توليدُه منذ RM-0 (224 صفاً بحالات التدقيق الأولى بينما JSON 229 بنداً).
   الآن: CSV يُكتب من JSON في كلّ عرض، والمحقِّقُ يفحص الثوابتَ التي يجب أن تبقى صحيحةً بعد كلّ تحديث — وأيُّ إخفاقٍ يُفشل العرض.
   الثوابت:
     ① الهوية: المعرّفاتُ فريدة · SOT-001…192 بالترتيب ثم AUD-001…N متتالية · العدُّ في META = عددُ البنود · أبناءُ كلّ بندٍ موجودون.
     ② v5 محفوظ: حقولُ v5 الإحدى عشرة + status_v5 في البنود الـ192 = docs/sot/ref/sot_v5.json حرفاً · PHASES وTREE = مراجعُ v5.
     ③ التدقيق محفوظ: لكلٍّ من البنود الـ224 حالةُ التدقيق وفرقُه = سجلُّ التدقيق (docs/sot/ref/audit_register.json) — التحديثاتُ تُضاف تحققاتٍ ولا تمحوه.
     ④ الحالة: حالةٌ معروفة · = آخرُ تحقّق (verifications) إن وُجد وإلا = حالةُ التدقيق · = آخرُ سطرٍ في history · مستوى التحقق معروف.
     ⑤ لا ترقيةَ بلا دليل: كلُّ «مكتمل» له دليلٌ واحد على الأقل (آخرُ تحقّقٍ إن وُجد وإلا أدلةُ التدقيق).
     ⑥ CSV = JSON خليةً خلية (الأعمدةُ csv_cols.json · صفٌّ لكلّ بند) — أعمدةُ verification_* من آخر تحقّق إن وُجد وإلا من التدقيق.
     ⑦ HTML يضمّن JSON حرفياً ويعرض بصمتَه."""
import os, sys, json, csv, io, re, hashlib
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTD = os.environ.get('SOT_DIR') or os.path.join(H, 'docs', 'sot'); REF = os.path.join(OUTD, 'ref')
JP = os.path.join(OUTD, 'KIVO_MASTER_REQUIREMENTS_v6.json'); CP = os.path.join(OUTD, 'KIVO_MASTER_REQUIREMENTS_v6.csv'); HP = os.path.join(OUTD, 'KIVO_MASTER_SOURCE_OF_TRUTH_v6.html')
AK = 'audit_2026_10_09'
STATUSES = ['مكتمل', 'جزئي', 'غير منفذ', 'يحتاج إثبات', 'معلّق بقرار', 'متعارض']
LEVELS = ['Preview', 'محلي', 'ساكن', 'إجراء', 'لا تحقق']
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
def last_ver(x):
    v = x.get('verifications') or []
    return v[-1] if v else None
def csv_row(x):
    a = x[AK]; lv = last_ver(x); v = lv if lv else a['verification']
    return [x['id'], str(x['n']), x['added_in'], x['area'], x['title'], x['kind'], x['source'], x['owner'], x['priority'], x['phase'], x['status_v5'], x['status'], a['gap'],
            v.get('implementation', ''), v.get('level', ''), v.get('production', ''), 'نعم' if x['security'] else 'لا', 'نعم' if x['decision'] else 'لا',
            ' | '.join(x['blocked_by']), ' | '.join(x['blocks']), x['evidence'], x['next'], x['note'], x['acceptance'], ' | '.join(a['evidence']), a['action'], a['note'], a['source'],
            ' | '.join(a['findings']), ' | '.join(a['risks']), ' | '.join(a['roadmap'])]
def csv_text(S, cols):
    f = io.StringIO(); f.write('﻿'); w = csv.writer(f, quoting=csv.QUOTE_ALL, lineterminator='\n'); w.writerow(cols)
    for x in S['DATA']: w.writerow(csv_row(x))
    return f.getvalue()
def main():
    RAW = open(JP, encoding='utf-8').read(); S = json.loads(RAW); D = S['DATA']
    cols = json.load(open(os.path.join(OUTD, 'csv_cols.json'), encoding='utf-8'))['cols']
    if '--write-csv' in sys.argv:
        open(CP, 'w', encoding='utf-8', newline='').write(csv_text(S, cols))
    R = {'checks': [], 'ok': True}
    def chk(name, cond, detail=''):
        R['checks'].append({'name': name, 'ok': bool(cond), 'detail': detail if not cond else ''}); R['ok'] &= bool(cond)
    # ① الهوية
    ids = [x['id'] for x in D]; aud = [i for i in ids if i.startswith('AUD-')]
    chk('① المعرّفاتُ فريدة (' + str(len(ids)) + ')', len(set(ids)) == len(ids), str([i for i in ids if ids.count(i) > 1][:5]))
    chk('① SOT-001…192 بالترتيب ثم AUD-001…' + str(len(aud)).zfill(3) + ' متتالية', ids[:192] == ['SOT-%03d' % n for n in range(1, 193)] and ids[192:] == ['AUD-%03d' % n for n in range(1, len(ids) - 191)])
    chk('① العدُّ في META = عددُ البنود', S['META'].get('counts', {}).get('total') == len(D), str(S['META'].get('counts', {}).get('total')) + ' ≠ ' + str(len(D)))
    idset = set(ids); badkids = [(x['id'], c) for x in D for c in x.get('children', []) if c not in idset]
    chk('① أبناءُ كلّ بندٍ موجودون', not badkids, str(badkids[:5]))
    chk('① n متسلسل 1…' + str(len(D)), [x['n'] for x in D] == list(range(1, len(D) + 1)))
    # ② v5
    V5 = json.load(open(os.path.join(REF, 'sot_v5.json'), encoding='utf-8')); V5T = json.load(open(os.path.join(REF, 'sot_tree.json'), encoding='utf-8')); V5P = json.load(open(os.path.join(REF, 'sot_phases.json'), encoding='utf-8'))
    FIELDS = ['area', 'title', 'priority', 'evidence', 'next', 'phase', 'note', 'acceptance', 'source', 'owner', 'kind']
    diff = [(x['id'], f) for x, v in zip(D[:192], V5) for f in FIELDS if x[f] != v[f]] + [(x['id'], 'status_v5') for x, v in zip(D[:192], V5) if x['status_v5'] != v['status']]
    chk('② حقولُ v5 الإحدى عشرة + status_v5 مطابقةٌ حرفياً في البنود الـ192', len(V5) == 192 and not diff, str(diff[:5]))
    chk('② PHASES بمفاتيح v5 وحالاتها السابقة', [p['key'] for p in S['PHASES']] == [p[0] for p in V5P] and all(p['status_v5'] == v[2] and p['label'] == v[1] for p, v in zip(S['PHASES'], V5P)))
    chk('② TREE بمسارات v5 ووصفها', [t['path'] for t in S['TREE']] == [t[0] for t in V5T] and all(t['desc'] == v[1] for t, v in zip(S['TREE'], V5T)))
    # ③ التدقيق
    REG = json.load(open(os.path.join(REF, 'audit_register.json'), encoding='utf-8'))['register']
    need = ('status', 'gap', 'evidence', 'source', 'action', 'verification')
    chk('③ كلُّ بندٍ يحمل سجلَّ التدقيق بحقوله', all(all(k in x[AK] for k in need) and all(k in x[AK]['verification'] for k in ('implementation', 'level', 'production')) for x in D))
    drift = [x['id'] for x, r in zip(D, REG) if x['id'] != r['id'] or x[AK]['status'] != r['status'] or x[AK]['gap'] != r['delta']]
    chk('③ حالةُ التدقيق وفرقُه للبنود الـ' + str(len(REG)) + ' = سجلُّ التدقيق 2026-10-09 (التحديثاتُ تحقّقاتٌ مضافة لا محوٌ)', len(REG) == 224 and not drift, str(drift[:5]))
    chk('③ تعارضُ CSP في سجلّ التدقيق محفوظ (SOT-048: v5 مكتمل → التدقيق جزئي · متعارض مع المرجع)', D[47]['id'] == 'SOT-048' and D[47]['status_v5'] == 'مكتمل' and D[47][AK]['status'] == 'جزئي' and D[47][AK]['gap'] == 'متعارض مع المرجع')
    # ④ الحالة
    badst = [x['id'] for x in D if x['status'] not in STATUSES]
    chk('④ كلُّ حالةٍ من الحالات الست', not badst, str(badst[:5]))
    incons = [x['id'] for x in D if x['status'] != (last_ver(x)['status'] if last_ver(x) else x[AK]['status'])]
    chk('④ الحالةُ = آخرُ تحقّق (أو حالةُ التدقيق بلا تحقّق)', not incons, str(incons[:5]))
    hist = [x['id'] for x in D if x.get('history') and x['history'][-1]['status'] != x['status']]
    chk('④ آخرُ سطرٍ في history = الحالة', not hist, str(hist[:5]))
    badlv = [x['id'] for x in D for v in (x.get('verifications') or []) if v.get('level') not in LEVELS or v.get('status') not in STATUSES]
    chk('④ كلُّ تحقّقٍ بمستوى وحالةٍ معروفين', not badlv, str(badlv[:5]))
    # ⑤ الدليل
    noev = [x['id'] for x in D if x['status'] == 'مكتمل' and not ((last_ver(x) or {}).get('evidence') if last_ver(x) else x[AK]['evidence'])]
    chk('⑤ لا ترقيةَ بلا دليل: كلُّ «مكتمل» (' + str(sum(1 for x in D if x['status'] == 'مكتمل')) + ') له دليلٌ واحد على الأقل', not noev, str(noev[:5]))
    # ⑥ CSV
    with open(CP, encoding='utf-8-sig', newline='') as f: rows = list(csv.reader(f))
    chk('⑥ CSV: رأسُ الأعمدة (' + str(len(cols)) + ')', rows and rows[0] == cols)
    chk('⑥ CSV: صفٌّ لكلّ بند (' + str(len(D)) + ')', len(rows) - 1 == len(D), str(len(rows) - 1))
    bad = [x['id'] for x, r in zip(D, rows[1:]) if csv_row(x) != r]
    chk('⑥ CSV = JSON خليةً خلية', not bad, str(bad[:5]))
    # ⑦ HTML
    HT = open(HP, encoding='utf-8').read(); tag = '<script id="SOT" type="application/json">'; i = HT.find(tag) + len(tag); j = HT.find('</script>', i)
    chk('⑦ HTML يضمّن JSON حرفياً (بايتاً ببايت)', HT.find(tag) >= 0 and HT[i:j] == RAW)
    chk('⑦ HTML يعرض بصمةَ JSON الحالية وبادئةَ بصمة CSV', sha(JP) in HT and sha(CP)[:16] in HT)
    R['hashes'] = {os.path.basename(p): {'bytes': os.path.getsize(p), 'sha256': sha(p)} for p in (JP, CP, HP)}
    R['counts'] = {'total': len(D), 'sot': len(D) - len(aud), 'aud': len(aud), 'byStatus': {s: sum(1 for x in D if x['status'] == s) for s in STATUSES}, 'verified': sum(1 for x in D if x.get('verifications'))}
    json.dump(R, open(os.path.join(OUTD, 'verify.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for c in R['checks']: print(('✔ ' if c['ok'] else '✘ ') + c['name'] + (('   ← ' + c['detail']) if c['detail'] else ''))
    print(('✔ SOT v6 متّسق' if R['ok'] else '✘ SOT v6 غيرُ متّسق') + ' — ' + str(len(D)) + ' بنداً · ' + ' · '.join('%s %d' % (k, v) for k, v in R['counts']['byStatus'].items() if v) + ' · بتحقّقٍ مسجَّل ' + str(R['counts']['verified']))
    return 0 if R['ok'] else 1
if __name__ == '__main__':
    sys.exit(main())
