# -*- coding: utf-8 -*-
"""KIVO_243 — TEST_ONLY fixture generator (deterministic: same --today ⇒ same bytes).

    python3 gen_fixture.py --today 1448-4-27 --out DIR

Outputs (DIR):
  fixture.json            the canonical fixture (users · depts · nodes · perms · per-department records · scope records)
  test_seed.sql           idempotent seed for Cloudflare D1 (re-runnable without duplication: removes previous TEST_ONLY data first)
  reset_test_fixture.sql  removes every TEST_ONLY row (keeps audit history; optional purge block at the end, commented)
  credentials.txt         test-only usernames / passwords (synthetic numbers; never real people)

Rules: no production data · no real personal data · every record is tagged TEST_ONLY (ids prefixed tst_, names prefixed TEST_ONLY,
users carry test:"TEST_ONLY") · global records are merged (never replaced) · the kill switch (meta.authz_mode) is never touched."""
import json, hashlib, argparse, os, re
from pathlib import Path

ap = argparse.ArgumentParser()
ap.add_argument('--today', required=True, help='Hijri today Y-M-D (server day, Umm al-Qura, Asia/Riyadh with 3h grace)')
ap.add_argument('--out', required=True)
ap.add_argument('--daily-stats-storage', choices=['relational', 'legacy-kv'], default='relational', help='legacy-kv is only for explicitly testing historical workers')
ap.add_argument('--custody-storage', choices=['relational', 'legacy-kv'], default='relational', help='legacy-kv is explicit historical-fixture data only; never a fallback')
A = ap.parse_args()
y, m, d = [int(x) for x in A.today.split('-')]
T = {'y': y, 'm': m, 'd': d}
PM = {'y': y - 1, 'm': 12} if m == 1 else {'y': y, 'm': m - 1}
MK, PMK = '%d-%d' % (y, m), '%d-%d' % (PM['y'], PM['m'])
DAY = '%d-%d-%d' % (y, m, d)
PDAY = '%d-%d-%d' % (PM['y'], PM['m'], 10)                           # a day in the previous (closed) month
TS0 = 1760000000000                                                  # fixed epoch for every stamp (deterministic)
TAG = 'TEST_ONLY'
J = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':'), sort_keys=False)

def pbkdf2(pw, uid):
    salt = hashlib.sha256(('kivo-243-fixture|' + uid).encode()).digest()[:16]
    h = hashlib.pbkdf2_hmac('sha256', pw.encode(), salt, 100000, 32)
    return 'p2$100000$' + salt.hex() + '$' + h.hex()
def unusable(uid):                                                   # no password matches (login impossible) — the test super is driven by the in-server test session only
    salt = hashlib.sha256(('kivo-243-fixture-nologin|' + uid).encode()).digest()[:16]
    return 'p2$100000$' + salt.hex() + '$' + ('0' * 64)

PG_KEYS = ['dstats', 'emps', 'planning', 'staff', 'plan', 'daily', 'dreport', 'tasks', 'irshad', 'seized', 'award', 'links', 'help', 'admin']
DEPTS = [{'id': 'tst_d1', 'name': TAG + ' · إدارة اختبار ١', 'gid': 'tst_g1'},
         {'id': 'tst_d2', 'name': TAG + ' · إدارة اختبار ٢', 'gid': 'tst_g1'},
         {'id': 'tst_d3', 'name': TAG + ' · إدارة اختبار ٣ (خارج الفرع)', 'gid': 'tst_g2'}]
NODES = [{'id': 'tst_g1', 'name': TAG + ' · إدارة عامة اختبار ١', 'kind': 'إدارة عامة'},
         {'id': 'tst_g2', 'name': TAG + ' · إدارة عامة اختبار ٢', 'kind': 'إدارة عامة'}]
SA, SB = 'TST-A', 'TST-B'                                            # test shifts
# ── accounts: (id, un, pw, role, dept, ekey, extra, scenario)
ACC = [
    ('tst_sa',   '0000000100', None,    'super', '',       '',               {},                 'System Admin (super) — driven only by the in-server test session'),
    ('tst_dm1',  '0000000101', '70101', 'staff', 'tst_d1', 'mgr:tst_d1',     {'mgr': True},      'Department Manager (tst_d1)'),
    ('tst_dm2',  '0000000102', '70102', 'staff', 'tst_d2', 'mgr:tst_d2',     {'mgr': True},      'Department Manager (tst_d2)'),
    ('tst_gm1',  '0000000103', '70103', 'gm',    '',       'gm:tst_g1',      {'gid': 'tst_g1'},  'Multi-department user (gm of branch tst_g1 = tst_d1 + tst_d2)'),
    ('tst_dm3',  '0000000104', '70104', 'staff', 'tst_d3', 'mgr:tst_d3',     {'mgr': True},      'Department Manager (tst_d3 — no scope ceiling migrated)'),
    ('tst_sup1', '0000000111', '70111', 'staff', 'tst_d1', 'tst_e_sup1',     {},                 'Supervisor — shift TST-A (inside shift)'),
    ('tst_supB', '0000000112', '70112', 'staff', 'tst_d1', 'tst_e_supB',     {},                 'Supervisor — shift TST-B (outside shift for TST-A data)'),
    ('tst_emp1', '0000000113', '70113', 'staff', 'tst_d1', 'tst_e_emp1',     {},                 'Employee — shift TST-A'),
    ('tst_lon',  '0000000114', '70114', 'staff', 'tst_d1', 'tst_e_lens_on',  {},                 'Lens zones enabled'),
    ('tst_loff', '0000000115', '70115', 'staff', 'tst_d1', 'tst_e_lens_off', {},                 'Same lens (zones) disabled'),
    ('tst_pnos', '0000000116', '70116', 'staff', 'tst_d1', 'tst_e_pnos',     {},                 'Permission present + Scope absent'),
    ('tst_snop', '0000000117', '70117', 'staff', 'tst_d1', 'tst_e_snop',     {},                 'Scope present + Permission absent'),
    ('tst_fld',  '0000000118', '70118', 'staff', 'tst_d1', 'tst_e_field',    {},                 'Field observer (Assigned)'),
    ('tst_imp',  '0000000119', '70119', 'staff', 'tst_d1', 'tst_e_imp',      {},                 'Importer (import.run)'),
    ('tst_ds',   '0000000120', '70120', 'staff', 'tst_d1', 'tst_e_ds',       {},                 'Daily statistics — haram source only (Source)'),
    ('tst_emp2', '0000000121', '70121', 'staff', 'tst_d2', 'tst_e_emp2',     {},                 'Employee (tst_d2) — granted a page outside the department ceiling'),
]
NAMES = {'tst_sa': 'مدير النظام', 'tst_dm1': 'مدير الإدارة ١', 'tst_dm2': 'مدير الإدارة ٢', 'tst_gm1': 'مدير عام الفرع', 'tst_dm3': 'مدير الإدارة ٣',
         'tst_sup1': 'مشرف الوردية أ', 'tst_supB': 'مشرف الوردية ب', 'tst_emp1': 'موظف الوردية أ', 'tst_lon': 'موظف بعدسة المصليات', 'tst_loff': 'موظف بلا عدسة المصليات',
         'tst_pnos': 'موظف بصلاحية بلا نطاق', 'tst_snop': 'موظف بنطاق بلا صلاحية', 'tst_fld': 'راصد ميدان', 'tst_imp': 'موظف الاستيراد', 'tst_ds': 'مدخل إحصائيات الحرم', 'tst_emp2': 'موظف الإدارة ٢'}
users, creds = [], []
for (uid, un, pw, role, dept, ekey, extra, scen) in ACC:
    u = {'id': uid, 'un': un, 'ph': (pbkdf2(pw, uid) if pw else unusable(uid)), 'name': TAG + ' · ' + NAMES[uid], 'role': role}
    # نموذجُ المنصة: الرقمُ الوظيفيّ هو كلمةُ المرور — يُحفظ مع حساب المدير (mgr/gm) لأنه لا سجلَّ موظفٍ له، وللموظف في جدول الموظفين
    if pw and (extra.get('mgr') or role == 'gm'): u['no'] = pw
    if dept: u['deptId'] = dept
    if ekey: u['ekey'] = ekey
    u.update(extra); u['dis'] = 0; u['test'] = TAG
    users.append(u)
    creds.append((uid, un, pw or '(لا دخول — جلسة الاختبار الداخلية وحدها)', role + ('/mgr' if extra.get('mgr') else ''), dept or extra.get('gid', ''), scen))
STAFF = [a for a in ACC if a[3] == 'staff' and not a[6].get('mgr')]
# ── permission sheets (leaf level, AS-IS form) · explicit grants (plus/minus) · lenses
SHEET = {
    'tst_e_sup1':     {'staff': ['view', 'edit'], 'dreport': ['view', 'add', 'edit', 'approve'], 'daily/rounds': ['view', 'edit'], 'plan': ['view'], 'emps/data': ['view'], 'tasks': ['view', 'add', 'edit'], 'irshad/records': ['view', 'add', 'edit', 'del', 'approve']},
    # مشرف ب: أوراقُه كلُّها مقيّدةٌ بالوردية (لا بيانات موظفين ولا مهام ولا خطة) — فتنطبق Shift على قراءة التقرير والجدول (D4-09)؛
    # ومشرف أ يحمل «بيانات الموظفين» (emp.view بلا Shift في v24.9) فيرى الجدولَ والتقريرَ كاملين — دلالةُ «أيُّ مفتاحِ قراءةٍ يكفي»
    'tst_e_supB':     {'staff': ['view', 'edit'], 'dreport': ['view', 'add', 'edit', 'approve'], 'daily/rounds': ['view', 'edit'], 'irshad/records': ['view', 'add', 'edit', 'del', 'approve']},
    'tst_e_emp1':     {'irshad/records': ['view', 'add', 'edit'], 'tasks': ['view'], 'dreport': ['view'], 'staff': ['view']},
    'tst_e_lens_on':  {'daily/rounds': ['view', 'add', 'edit', 'del'], 'plan': ['view', 'edit']},
    'tst_e_lens_off': {'daily/rounds': ['view', 'add', 'edit', 'del'], 'plan': ['view', 'edit']},
    'tst_e_pnos':     {'daily/rounds': ['view', 'edit'], 'plan': ['view', 'edit']},
    'tst_e_snop':     {'daily/rounds': ['view']},
    'tst_e_field':    {'daily/field': ['view']},
    'tst_e_imp':      {'admin/import': ['view', 'add'], 'emps/data': ['view', 'add', 'edit']},
    'tst_e_ds':       {'dstats/haram': ['view', 'add', 'edit', 'approve']},
    'tst_e_emp2':     {'seized/records': ['view', 'add'], 'irshad/records': ['view', 'add']},
}
PERMS_ADD = {
    'caps': {'tst_d1': PG_KEYS[:], 'tst_d2': [k for k in PG_KEYS if k not in ('seized', 'award')], 'tst_d3': PG_KEYS[:]},
    'lenses': {'tst_d1': ['zones', 'paths', 'gates', 'marks', 'dist', 'dens'], 'tst_d2': ['zones', 'paths', 'gates', 'marks', 'dist'], 'tst_d3': ['zones', 'paths', 'gates', 'marks', 'dist', 'dens']},
    'empLens': {'tst_d1': {'tst_e_lens_on': ['zones', 'paths', 'gates', 'marks', 'dist', 'dens'], 'tst_e_lens_off': ['paths', 'gates', 'marks', 'dist', 'dens']}},
    'emps': {'tst_d1': {k: v for k, v in SHEET.items() if k != 'tst_e_emp2'}, 'tst_d2': {'tst_e_emp2': SHEET['tst_e_emp2']}},
}
PERMS_DEL = {s: {dd['id']: None for dd in DEPTS} for s in ['caps', 'subs', 'lenses', 'empLens', 'emps', 'tplOf']}
# المنحُ الصريح: سجلٌّ مستقلٌّ لكل إدارة (bsdept:<d>:bassam_grants_v1) — خارج bassam_perms_v1
GRANTS = {'tst_d1': {'v': 1, 'test': TAG, 'emp': {'tst_e_sup1': {'plus': ['ir.rec.retro.open'], 'minus': ['report.reopen'], 'src': TAG},
                                                  'mgr:tst_d1': {'plus': ['backup.restore'], 'src': TAG}}}}
# ── per-department records
def emp_rec(ekey, nm, work):
    return {'eid': ekey, 'name': TAG + ' · ' + nm, 'empno': [a[2] for a in ACC if a[5] == ekey][0], 'type': TAG + ' رسمي', 'work': work}
EMPS = {
    'tst_d1': [emp_rec(a[5], NAMES[a[0]], TAG + ' مراقب') for a in STAFF if a[4] == 'tst_d1'],
    'tst_d2': [emp_rec(a[5], NAMES[a[0]], TAG + ' مراقب') for a in STAFF if a[4] == 'tst_d2'],
    'tst_d3': [],
}
SHIFT_OF = {'tst_e_sup1': SA, 'tst_e_emp1': SA, 'tst_e_supB': SB, 'tst_e_field': SA, 'tst_e_lens_on': SA, 'tst_e_lens_off': SB, 'tst_e_pnos': SA, 'tst_e_snop': SA, 'tst_e_imp': SB, 'tst_e_ds': SA}
def staff_month():
    return {ek: {'shift': sh, 'rest': [], 'leaves': {}, 'perm': {}, 'cs': '', 'muk': False} for ek, sh in SHIFT_OF.items()}
def zone(uid, code, nm, emp, x0):
    return {'uid': uid, 'code': code, 'name': TAG + ' ' + nm, 'd': 'M%d 0 L%d 0 L%d 10 L%d 10 Z' % (x0, x0 + 10, x0 + 10, x0), 'cx': x0 + 5, 'cy': 5, 'area': 100, 'emp': emp}
def floor(sid, nm, num, k):
    return {'sid': sid, 'name': TAG + ' ' + nm, 'num': num,
            'zones': [zone('tstz%da' % k, 'TZ%dA' % k, 'مصلى %d-أ' % k, ['tst_e_field', 'tst_e_lens_on'], 0), zone('tstz%db' % k, 'TZ%dB' % k, 'مصلى %d-ب' % k, [], 20)],
            'gates': [{'uid': 'tstg%d' % k, 'id': 'TG%d' % k, 'num': str(k), 'x': 10 * k, 'y': 10, 'emp': ['tst_e_field']}],
            'marks': [{'uid': 'tstm%d' % k, 'id': 'TM%d' % k, 'label': TAG + ' معلم %d' % k, 'x': 3, 'y': 4 * k, 'emp': []}],
            'paths': [{'uid': 'tstp%d' % k, 'id': 'TP%d' % k, 'pts': [{'x': 0, 'y': 0}, {'x': 5, 'y': 5 * k}], 'active': True}]}
F1, F2 = floor('tsts1', 'موقع ١', 1, 1), floor('tsts2', 'موقع ٢', 2, 2)
def cp(o): return json.loads(json.dumps(o))
PLAN = {'floors': [cp(F1), cp(F2)], 'months': {MK: {'c': 1, 'd': [cp(F1), cp(F2)]}}, 'zones': cp(F1['zones']), 'gates': cp(F1['gates']), 'marks': cp(F1['marks']), 'paths': cp(F1['paths'])}
RF1, RF2 = cp(F1), cp(F2)
# حالاتُ الرصد الصالحة في الواجهة: open · closed (والمغلقُ بسببه cWhy) — لا busy/severe (تُنقّيها الواجهةُ آلياً عند التحميل)
RF1['zones'][0].update({'fst': 'open', 'fAt': TS0 + 1000, 'fBy': 'tst_e_field'}); RF2['zones'][0].update({'fst': 'open', 'fAt': TS0 + 1000})
RF1['zones'][1].update({'fst': 'closed', 'cWhy': TAG + ' صيانة', 'fAt': TS0 + 1100}); RF2['zones'][1].update({'fst': 'closed', 'cWhy': TAG + ' صيانة', 'fAt': TS0 + 1100})   # حالةٌ على عنصرٍ غيرِ مسنَد — تُحجب عن راصد الميدان
ROUNDS = {DAY: {'t': TS0 + 2000, 'd': [RF1, RF2], 'shAp': {}}}
def roster(sh): return [{'ekey': ek, 'st': 'pr', 'shift': s} for ek, s in SHIFT_OF.items() if s == sh]
DREPORT = {DAY: {'created': TS0 + 3000, 'shifts': {SA: {'pulled': True, 'roster': roster(SA)}, SB: {'pulled': True, 'roster': roster(SB)}}},
           PDAY: {'created': TS0 + 4000, 'shifts': {SA: {'pulled': True, 'roster': roster(SA), 'ap': 1, 'apAt': '1/1', 'apBy': TAG}}}}
def ir(i, dd, sh, by): return {'id': 'tstir%d' % i, 'y': dd['y'], 'm': dd['m'], 'd': dd['d'], 'loc': TAG + ' موقع', 'shift': sh, 'lang': TAG + ' لغة', 'n': 1, 'by': by, 'test': TAG}
IRSHAD = {'reports': [ir(1, T, SA, 'tst_e_emp1'), ir(2, T, SB, 'tst_e_supB'), ir(3, {'y': PM['y'], 'm': PM['m'], 'd': 10}, SA, 'tst_e_emp1'), ir(4, T, SA, 'tst_e_sup1')]}
SEIZED = {'reports': [{'id': 'tstsz1', 'y': y, 'm': m, 'd': d, 'loc': TAG + ' موقع', 'shift': SA, 'test': TAG}]}
def task(tid, title, st, ek, nm): return [TAG + ' ' + title, '', 'med', st, None, None, None, [ek] if ek else [], nm, None, None, (TS0 + 50) if st != 'pending' else None, None, tid, ek, None, None, None, None, None, None, None]
TASKS = {DAY: [task(TS0 + 101, 'مهمة الموظف', 'pending', 'tst_e_emp1', TAG + ' · ' + NAMES['tst_emp1']), task(TS0 + 102, 'مهمة المشرف', 'in_progress', 'tst_e_sup1', TAG + ' · ' + NAMES['tst_sup1']), task(TS0 + 103, 'مهمة عامة', 'pending', '', '')]}
CUSTODY = {'items': [{'name': TAG + ' جهاز', 'qty': 5}], 'moves': [{'t': 'out', 'eid': 'tst_e_emp1', 'item': TAG + ' جهاز', 'ser': 'TST-001', 'y': y, 'm': m, 'd': d}]}
# This fixture has exactly one item and one historical out movement. These
# literal rows describe that fixed document, not another custody converter.
CU_DEPT, CU_MARK = 'tst_d1', 'tst_fixture_custody_v1'
CU_ROWS = {
    'custody_items': [{'department_id': CU_DEPT, 'item_id': 'tst_fixture_item', 'name': TAG + ' جهاز', 'qty': 5, 'prefix': None, 'color': None, 'presence_mask': 1}],
    'custody_issues': [{'department_id': CU_DEPT, 'issue_id': 'tst_fixture_issue', 'item_id': 'tst_fixture_item', 'serial': 'TST-001', 'serial_number': 1, 'legacy_identity': 'serial:TST-001'}],
    'custody_movements': [{'department_id': CU_DEPT, 'move_id': 'tst_fixture_move', 'issue_id': 'tst_fixture_issue', 'item_id': 'tst_fixture_item', 'sequence': 0, 'kind': 'out', 'holder_key': 'tst_e_emp1', 'hijri_year': y, 'hijri_month': m, 'hijri_day': d, 'condition': None, 'note': None, 'color_snapshot': None, 'actor_uid': None, 'actor_label': None, 'holder_nid_snapshot': None, 'holder_empno_snapshot': None, 'holder_name_snapshot': None, 'presence_mask': 0, 'created_at': None}],
    'custody_requests': [], 'custody_request_outputs': []
}
CU_COLUMNS = {
    'custody_items': ['department_id','item_id','name','qty','prefix','color','presence_mask'],
    'custody_issues': ['department_id','issue_id','item_id','serial','serial_number','legacy_identity'],
    'custody_movements': ['department_id','move_id','issue_id','item_id','sequence','kind','holder_key','hijri_year','hijri_month','hijri_day','condition','note','color_snapshot','actor_uid','actor_label','holder_nid_snapshot','holder_empno_snapshot','holder_name_snapshot','presence_mask','created_at'],
    'custody_requests': ['department_id','account_uid','request_id','fingerprint','resource_rev','operation','result_n','item_id','created_at'],
    'custody_request_outputs': ['department_id','account_uid','request_id','position','issue_id','move_id','serial']
}
CU_OWNER = {'version': 1, 'department': CU_DEPT, 'rows': CU_ROWS}
AWARD = {'recs': [{'id': 'tstaw1', 'ekey': 'tst_e_emp1', 'name': TAG + ' ترشيح ١', 'st': 'قيد التحكيم'}, {'id': 'tstaw2', 'ekey': 'tst_e_sup1', 'name': TAG + ' ترشيح ٢', 'st': 'قيد التحكيم'}]}
SHIFTS = [{'name': SA, 'color': '#2563eb', 'tStart': '06:00', 'tEnd': '14:00'}, {'name': SB, 'color': '#16a34a', 'tStart': '14:00', 'tEnd': '22:00'}]
SCOPE = {
    'tst_d1': {'v': 1, 'test': TAG,
               'ceiling': {'Site': {'mode': 'list', 'list': ['f:tsts1', 'f:tsts2']}, 'Zone/Element': {'mode': 'ALL'}},
               'emp': {'tst_e_sup1': {'Site': {'mode': 'inherit'}, 'Zone/Element': {'mode': 'inherit'}, 'Shift': {'mode': 'staffing-bound'}},
                       'tst_e_supB': {'Site': {'mode': 'inherit'}, 'Zone/Element': {'mode': 'inherit'}, 'Shift': {'mode': 'staffing-bound'}},
                       'tst_e_emp1': {'Site': {'mode': 'inherit'}, 'Zone/Element': {'mode': 'inherit'}, 'Shift': {'mode': 'staffing-bound'}},
                       'tst_e_lens_on': {'Site': {'mode': 'inherit'}, 'Zone/Element': {'mode': 'inherit'}, 'Shift': {'mode': 'staffing-bound'}},
                       'tst_e_lens_off': {'Site': {'mode': 'inherit'}, 'Zone/Element': {'mode': 'inherit'}, 'Shift': {'mode': 'staffing-bound'}},
                       'tst_e_snop': {'Site': {'mode': 'list', 'list': ['f:tsts1']}, 'Zone/Element': {'mode': 'inherit'}, 'Shift': {'mode': 'staffing-bound'}},
                       'tst_e_field': {'Site': {'mode': 'list', 'list': ['f:tsts1']}, 'Zone/Element': {'mode': 'inherit'}, 'Shift': {'mode': 'staffing-bound'}},
                       'tst_e_imp': {'Site': {'mode': 'inherit'}, 'Zone/Element': {'mode': 'inherit'}, 'Shift': {'mode': 'n/a'}},
                       'tst_e_ds': {'Shift': {'mode': 'n/a'}}}},
    'tst_d2': {'v': 1, 'test': TAG, 'ceiling': {'Site': {'mode': 'ALL'}, 'Zone/Element': {'mode': 'ALL'}},
               'emp': {'tst_e_emp2': {'Site': {'mode': 'inherit'}, 'Zone/Element': {'mode': 'inherit'}, 'Shift': {'mode': 'n/a'}}}},
}
DEPT_KEYS = {}
def put(dd, res, v): DEPT_KEYS['bsdept:%s:%s' % (dd, res)] = v
for dd in ['tst_d1', 'tst_d2', 'tst_d3']:
    put(dd, 'bassam_employees_v1', EMPS[dd])
    put(dd, 'bassam_shift_options_v1', SHIFTS)
put('tst_d1', 'bassam_staffing_v3', {MK: staff_month(), PMK: staff_month()})
put('tst_d1', 'bassam_staffing_locks_v1', {PMK: True})
put('tst_d1', 'bassam_plan_v1', PLAN)
put('tst_d1', 'bassam_rounds_v1', ROUNDS)
put('tst_d1', 'bassam_dreport_v1', DREPORT)
put('tst_d1', 'bassam_irshad_v1', IRSHAD)
put('tst_d1', 'bassam_irshad_langs_v1', [TAG + ' لغة'])
put('tst_d1', 'bassam_irshad_locs_v1', [TAG + ' موقع'])
put('tst_d1', 'bassam_seized_v1', SEIZED)
put('tst_d1', 'bassam_tasks_v1', TASKS)
put('tst_d1', 'bassam_tasks_locks_v1', {PMK: True})
if A.custody_storage == 'legacy-kv': put('tst_d1', 'bassam_custody_v1', CUSTODY)
put('tst_d1', 'bassam_award_v1', AWARD)
put('tst_d1', 'bassam_options_v1', {'type': [TAG + ' رسمي'], 'work': [TAG + ' مراقب']})
put('tst_d2', 'bassam_irshad_v1', {'reports': [{'id': 'tstir21', 'y': y, 'm': m, 'd': d, 'loc': TAG + ' موقع', 'shift': SA, 'test': TAG}]})
put('tst_d2', 'bassam_plan_v1', {'floors': [cp(floor('tsts21', 'موقع إدارة ٢', 1, 21))]})
put('tst_d3', 'bassam_plan_v1', {'floors': [cp(floor('tsts31', 'موقع إدارة ٣', 1, 31))]})
for dd, rec in SCOPE.items(): put(dd, 'bassam_scope_v1', rec)
for dd, rec in GRANTS.items(): put(dd, 'bassam_grants_v1', rec)
DSTATS_YEAR = 9999 if A.daily_stats_storage == 'relational' else 1400
DSTATS_DAY = '%d-01-01' % DSTATS_YEAR
DSTATS_DAY2 = '%d-01-02' % DSTATS_YEAR
# Reserved fixture dates; typed rows also carry an explicit TEST_ONLY attribution tag.
DSTATS_ADD = {'haram': {DSTATS_DAY: {'worshippers': 1001, 'umrah': 11, '__m': {'t': TAG}}, DSTATS_DAY2: {'worshippers': 1002, '__m': {'t': TAG}}},
              'nabawi': {DSTATS_DAY: {'worshippers': 2002, '__m': {'t': TAG}}},
              'locks': {'haram|%d-1' % DSTATS_YEAR: {'mo': 1, 'dopen': {'1': 1}}, 'nabawi|%d-1' % DSTATS_YEAR: {'mo': 1, 'dopen': {'1': 1}}}}
DSTATS_DEL = {'haram': {DSTATS_DAY: None, DSTATS_DAY2: None}, 'nabawi': {DSTATS_DAY: None}, 'locks': {key: None for key in DSTATS_ADD['locks']}}

fixture = {'tag': TAG, 'version': 'KIVO_243-fixture-1', 'today': T, 'prevMonth': PM, 'MK': MK, 'PMK': PMK, 'DAY': DAY, 'PDAY': PDAY, 'shifts': [SA, SB],
           'users': users, 'depts': DEPTS, 'nodes': NODES, 'permsAdd': PERMS_ADD, 'permsDel': PERMS_DEL, 'deptKeys': DEPT_KEYS,
           'custodyStorage': A.custody_storage, 'custodyAdd': {CU_DEPT: CUSTODY}, 'custodyRows': CU_ROWS if A.custody_storage == 'relational' else {},
           'dstatsAdd': DSTATS_ADD, 'dstatsDel': DSTATS_DEL, 'dailyStatsStorage': A.daily_stats_storage, 'scenarios': [{'id': c[0], 'un': c[1], 'role': c[3], 'dept': c[4], 'scenario': c[5]} for c in creds]}
os.makedirs(A.out, exist_ok=True)
open(os.path.join(A.out, 'fixture.json'), 'w', encoding='utf-8').write(json.dumps(fixture, ensure_ascii=False, indent=1))

# ── SQL
def q(s): return "'" + s.replace("'", "''") + "'"
# السجلُّ العامّ يُمسّ فقط إن كان قطعةً واحدة (≤ 700000 حرف) وقيمتُه JSON صالحٌ من النوع المتوقَّع — وإلا يُترك كما هو (والتحقّقُ في الآخر يُظهر ذلك)
def guard(key, typ): return "(SELECT COUNT(*) FROM kv WHERE k = %s) = 1 AND json_valid(v) AND json_type(v) = '%s'" % (q(key), typ)
TST = "'bsdept:tst\\_%' ESCAPE '\\'"
# عنصرٌ من json_each يُعاد كما هو: الكائنُ/المصفوفةُ JSON · true/false/null بقيمها · النصُّ نصٌّ · العددُ عدد
ELEM = "CASE WHEN t IN ('object', 'array') THEN json(v) WHEN t = 'true' THEN json('true') WHEN t = 'false' THEN json('false') WHEN t = 'null' THEN json('null') ELSE v END"
# الإبقاءُ: كلُّ ما ليس كائناً يبقى، والكائنُ يبقى ما لم يطابق شرطَ الاختبار (CASE يضمن ألا يُقيَّم json_extract على غير كائن)
def keep(cond): return "CASE WHEN type = 'object' THEN NOT (%s) ELSE 1 END" % cond
def arr_merge(key, items, idcond):
    return ("INSERT OR IGNORE INTO kv (k, seq, v) VALUES (%s, 0, '[]');\n" % q(key) +
            "UPDATE kv SET v = (SELECT json_group_array(%s) FROM (SELECT type AS t, value AS v FROM json_each((SELECT v FROM kv WHERE k = %s AND seq = 0)) WHERE %s"
            " UNION ALL SELECT type AS t, value AS v FROM json_each(%s))) WHERE k = %s AND seq = 0 AND %s;\n" % (ELEM, q(key), keep(idcond), q(J(items)), q(key), guard(key, 'array')))
def arr_remove(key, idcond):
    return ("UPDATE kv SET v = (SELECT json_group_array(%s) FROM (SELECT type AS t, value AS v FROM json_each((SELECT v FROM kv WHERE k = %s AND seq = 0)) WHERE %s))"
            " WHERE k = %s AND seq = 0 AND %s;\n" % (ELEM, q(key), keep(idcond), q(key), guard(key, 'array')))
def obj_patch(key, patch, create=True):
    s = ("INSERT OR IGNORE INTO kv (k, seq, v) VALUES (%s, 0, '{}');\n" % q(key)) if create else ''
    return s + "UPDATE kv SET v = json_patch(v, %s) WHERE k = %s AND seq = 0 AND %s;\n" % (q(J(patch)), q(key), guard(key, 'object'))
# الإزالةُ بمسارات json_remove (لا json_patch بقيمٍ null): مسارٌ غائبٌ لا أثرَ له، فلا يُنشأ قسمٌ فارغٌ في سجلٍّ حقيقيّ
def jpath(parts): return '$' + ''.join('."%s"' % str(x).replace('"', '\\"') for x in parts)
def paths_of(tree, pre=()):
    out = []
    for k, v in tree.items():
        if v is None: out.append(jpath(pre + (k,)))
        else: out += paths_of(v, pre + (k,))
    return out
def obj_remove(key, tree):
    ps = paths_of(tree)
    return "UPDATE kv SET v = json_remove(v, %s) WHERE k = %s AND seq = 0 AND %s;\n" % (', '.join(q(x) for x in ps), q(key), guard(key, 'object'))

# Use the canonical DDL only: fixture setup never claims to apply migration 0004.
# Each statement occupies one line because the historical test harness executes SQL line by line.
DS_MARK = 'tst_fixture_daily_stats_v1'
DS_OWNED = "EXISTS (SELECT 1 FROM meta WHERE k = '%s' AND v = '1')" % DS_MARK
DS_TAGGED = "CASE WHEN json_valid(meta_json) THEN COALESCE(json_extract(meta_json, '$.t') = 'TEST_ONLY', 0) ELSE 0 END"
DS_DATES = "('9999-01-01', '9999-01-02')"
def ds_schema():
    if A.daily_stats_storage == 'legacy-kv': return ''
    canonical = (Path(__file__).resolve().parents[2] / 'migrations' / '0004_daily_stats.sql').read_text(encoding='utf-8')
    tables = re.findall(r'CREATE TABLE IF NOT EXISTS daily_stats_\w+\s*\([\s\S]*?\) WITHOUT ROWID;', canonical)
    if len(tables) != 3: raise ValueError('Expected the three canonical daily-statistics tables')
    return '-- Canonical daily-statistics tables; no schema/migration stamp.\n' + '\n'.join(' '.join(t.split()) for t in tables) + '\n'
def ds_preflight():
    if A.daily_stats_storage == 'legacy-kv': return ''
    return ("SELECT CASE WHEN EXISTS (SELECT 1 FROM daily_stats_days WHERE hijri_date LIKE '9999-01-%%' AND (hijri_date NOT IN %s OR NOT (%s))) "
            "OR EXISTS (SELECT 1 FROM daily_stats_month_locks WHERE hijri_year = 9999 AND hijri_month = 1 AND NOT (%s)) "
            "OR EXISTS (SELECT 1 FROM daily_stats_day_locks WHERE hijri_year = 9999 AND hijri_month = 1 AND (hijri_day != 1 OR NOT (%s))) "
            "THEN json_extract('{}', 'KIVO_FIXTURE_DSTATS_TARGET_COLLISION') END;\n") % (DS_DATES, DS_TAGGED, DS_OWNED, DS_OWNED)
def ds_remove():
    if A.daily_stats_storage == 'legacy-kv': return obj_remove('bassam_dstats_v1', DSTATS_DEL)
    return ("DELETE FROM daily_stats_day_locks WHERE hijri_year = 9999 AND hijri_month = 1 AND hijri_day = 1 AND %s;\n"
            "DELETE FROM daily_stats_days WHERE hijri_date IN %s AND (%s);\n"
            "DELETE FROM daily_stats_month_locks WHERE hijri_year = 9999 AND hijri_month = 1 AND %s "
            "AND NOT EXISTS (SELECT 1 FROM daily_stats_day_locks d WHERE d.site = daily_stats_month_locks.site AND d.hijri_year = 9999 AND d.hijri_month = 1) "
            "AND NOT EXISTS (SELECT 1 FROM daily_stats_days d WHERE d.site = daily_stats_month_locks.site AND d.hijri_date LIKE '9999-01-%%');\n"
            "DELETE FROM meta WHERE k = %s;\n") % (DS_OWNED, DS_DATES, DS_TAGGED, DS_OWNED, q(DS_MARK))
def ds_seed():
    if A.daily_stats_storage == 'legacy-kv': return obj_patch('bassam_dstats_v1', DSTATS_ADD)
    metrics = ['worshippers', 'umrah', 'hijr_ismail', 'carts', 'salam_corridor', 'rawdah_men_published', 'rawdah_men_reserved', 'rawdah_men_actual', 'rawdah_women_published', 'rawdah_women_reserved', 'rawdah_women_actual']
    s = ''
    for site in ['haram', 'nabawi']:
        for date, row in DSTATS_ADD[site].items():
            fields = [field for field in metrics if field in row]
            columns = ['site', 'hijri_date', 'field_mask'] + fields + ['meta_json']
            values = [q(site), q(date), str(sum(1 << metrics.index(field) for field in fields))] + [str(row[field]) for field in fields] + [q(J(row['__m']))]
            s += 'INSERT INTO daily_stats_days (%s) VALUES (%s);\n' % (', '.join(columns), ', '.join(values))
        s += "INSERT INTO daily_stats_month_locks (site, hijri_year, hijri_month, approved, reopened, legacy_boolean) VALUES (%s, 9999, 1, 0, 1, 0);\n" % q(site)
        s += "INSERT INTO daily_stats_day_locks (site, hijri_year, hijri_month, hijri_day, is_open, is_shut) VALUES (%s, 9999, 1, 1, 1, 0);\n" % q(site)
    return s + "INSERT INTO meta (k, v) VALUES (%s, '1');\n" % q(DS_MARK)
# CU ownership is an exact witness for the known TEST_ONLY row set. Refuse
# collision/drift before global account or scoped cleanup, including reset.
# The script stays flat for existing executors. Atomic rollback is guaranteed
# only when the caller executes the complete script in one transaction/batch;
# the historical line-by-line helper is not an atomic executor.
def cu_schema():
    if A.custody_storage == 'legacy-kv': return ''
    canonical = (Path(__file__).resolve().parents[2] / 'migrations' / '0006_custody.sql').read_text(encoding='utf-8')
    ddl = re.findall(r'CREATE TABLE IF NOT EXISTS custody_\w+\s*\([\s\S]*?\) WITHOUT ROWID;|CREATE(?: UNIQUE)? INDEX IF NOT EXISTS custody_\w+[\s\S]*?;', canonical)
    if sum(t.startswith('CREATE TABLE') for t in ddl) != 5: raise ValueError('Expected five canonical custody tables')
    return '-- Canonical custody DDL only; no migration/schema stamp.\n' + '\n'.join(' '.join(t.split()) for t in ddl) + '\n'

def cu_preflight():
    if A.custody_storage == 'legacy-kv': return ''
    checks = ["json_type(v) != 'object'", "json_extract(v, '$.version') IS NOT 1", "json_extract(v, '$.department') IS NOT " + q(CU_DEPT)]
    checks += ["json_type(v, '$.rows.%s') IS NOT 'array'" % table for table in CU_COLUMNS]
    invalid = "EXISTS (SELECT 1 FROM meta WHERE k=%s AND CASE WHEN NOT json_valid(v) THEN 1 ELSE (%s) END)" % (q(CU_MARK), ' OR '.join(checks))
    sql = "SELECT CASE WHEN %s THEN json_extract('{}', 'KIVO_FIXTURE_CUSTODY_TARGET_COLLISION') END;\n" % invalid
    test_depts = '(' + ','.join(q(x['id']) for x in DEPTS) + ')'
    for table, columns in CU_COLUMNS.items():
        expected = "COALESCE((SELECT json_array_length(v, '$.rows.%s') FROM meta WHERE k=%s),0)" % (table,q(CU_MARK))
        # Compare SQL values with IS, not serialized JSON text: REAL 5.0 and
        # JSON numeric 5 are the same quantity, while NULL stays NULL-safe.
        same = ' AND '.join("t.%s IS json_extract(j.value, '$.%s')" % (col,col) for col in columns)
        cond = "EXISTS (SELECT 1 FROM %s WHERE department_id IN %s AND department_id!=%s)" % (table,test_depts,q(CU_DEPT))
        cond += " OR (SELECT COUNT(*) FROM %s WHERE department_id=%s)!=%s" % (table,q(CU_DEPT),expected)
        cond += " OR EXISTS (SELECT 1 FROM %s t WHERE department_id=%s AND NOT EXISTS (SELECT 1 FROM meta m,json_each(m.v,'$.rows.%s') j WHERE m.k=%s AND %s))" % (table,q(CU_DEPT),table,q(CU_MARK),same)
        sql += "SELECT CASE WHEN %s THEN json_extract('{}', 'KIVO_FIXTURE_CUSTODY_TARGET_COLLISION') END;\n" % cond
    return sql

def cu_remove():
    if A.custody_storage == 'legacy-kv': return ''
    owned = "EXISTS (SELECT 1 FROM meta WHERE k=%s)" % q(CU_MARK)
    return ''.join("DELETE FROM %s WHERE department_id=%s AND %s;\n" % (table,q(CU_DEPT),owned) for table in ['custody_request_outputs','custody_requests','custody_movements','custody_issues','custody_items']) + "DELETE FROM meta WHERE k=%s;\n" % q(CU_MARK)

def cu_seed():
    if A.custody_storage == 'legacy-kv': return ''
    sql = ''
    for table, rows in CU_ROWS.items():
        for row in rows:
            values = ['NULL' if row[c] is None else (q(row[c]) if isinstance(row[c],str) else str(row[c])) for c in CU_COLUMNS[table]]
            sql += 'INSERT INTO %s (%s) VALUES (%s);\n' % (table,','.join(CU_COLUMNS[table]),','.join(values))
    return sql + "INSERT INTO meta(k,v) VALUES(%s,%s);\n" % (q(CU_MARK),q(J(CU_OWNER)))

# ثلاثيُّ القيم في SQL: حقلٌ غائب ⇒ NULL، و NOT (FALSE OR NULL) = NULL يُسقط السطرَ الحقيقيّ — فكلُّ طرفٍ مُحاطٌ بـ IFNULL(…, 0)
USER_COND = "IFNULL(CAST(json_extract(value, '$.id') AS TEXT) LIKE 'tst\\_%' ESCAPE '\\', 0) OR IFNULL(json_extract(value, '$.test') = 'TEST_ONLY', 0)"
ID_COND = "IFNULL(CAST(json_extract(value, '$.id') AS TEXT) LIKE 'tst\\_%' ESCAPE '\\', 0)"
GLOBALS = ['bassam_auth_users_v1', 'bassam_perms_v1', 'bassam_depts_v1', 'bassam_gdepts_v1'] + (['bassam_dstats_v1'] if A.daily_stats_storage == 'legacy-kv' else [])
def removal():
    s = "-- (أ) إزالةُ بيانات الاختبار السابقة (TEST_ONLY) — مفاتيحُ الإدارات التجريبية كاملةً، وما يخصّها في السجلات العامة\n"
    s += "DELETE FROM kv WHERE k LIKE %s;\n" % TST
    s += "DELETE FROM sess WHERE uid LIKE 'tst\\_%' ESCAPE '\\';\n"
    s += arr_remove('bassam_auth_users_v1', USER_COND)
    s += arr_remove('bassam_depts_v1', ID_COND)
    s += arr_remove('bassam_gdepts_v1', ID_COND)
    s += obj_remove('bassam_perms_v1', PERMS_DEL)
    s += ds_remove()
    s += cu_remove()
    return s
# ── ما أنشأه الزرعُ في السجلات العامة (مفتاحٌ أو قسمٌ لم يكن قائماً) يُسجَّل في meta.tst_fixture_created — فيزيله الإرجاعُ إن بقي فارغاً، فتعود القاعدةُ كما كانت حرفاً بحرف
MARK = 'tst_fixture_created'
SECTIONS = [('bassam_perms_v1', sec) for sec in PERMS_ADD] + ([('bassam_dstats_v1', sec) for sec in DSTATS_ADD] if A.daily_stats_storage == 'legacy-kv' else [])
def marks():
    s = "-- (ب-٠) تسجيلُ ما سيُنشئه الزرعُ ولم يكن قائماً (مفتاحاً عامّاً أو قسماً فيه)\n"
    s += "INSERT INTO meta (k, v) SELECT %s, '[]' WHERE NOT EXISTS (SELECT 1 FROM meta WHERE k = %s);\n" % (q(MARK), q(MARK))
    for g in GLOBALS:
        tag = 'key:' + g
        s += ("UPDATE meta SET v = json_insert(v, '$[#]', %s) WHERE k = %s AND NOT EXISTS (SELECT 1 FROM kv WHERE k = %s) AND NOT EXISTS (SELECT 1 FROM json_each(meta.v) WHERE value = %s);\n"
              % (q(tag), q(MARK), q(g), q(tag)))
    for (g, sec) in SECTIONS:
        tag = 'sec:%s:%s' % (g, sec)
        s += ("UPDATE meta SET v = json_insert(v, '$[#]', %s) WHERE k = %s AND NOT EXISTS (SELECT 1 FROM kv WHERE k = %s AND seq = 0 AND json_valid(v) AND json_type(v, %s) IS NOT NULL) AND NOT EXISTS (SELECT 1 FROM json_each(meta.v) WHERE value = %s);\n"
              % (q(tag), q(MARK), q(g), q(jpath([sec])), q(tag)))
    return s
def unmarks():
    s = "-- (أ-٢) ما أنشأه الزرعُ وبقي فارغاً يُزال (قسماً ثم مفتاحاً)، ثم يُمحى سجلُّ الإنشاء\n"
    for (g, sec) in SECTIONS:
        tag = 'sec:%s:%s' % (g, sec)
        s += ("UPDATE kv SET v = json_remove(v, %s) WHERE k = %s AND seq = 0 AND %s AND json_extract(v, %s) IN ('{}', '[]') AND EXISTS (SELECT 1 FROM meta, json_each(meta.v) WHERE meta.k = %s AND json_each.value = %s);\n"
              % (q(jpath([sec])), q(g), guard(g, 'object'), q(jpath([sec])), q(MARK), q(tag)))
    for g in GLOBALS:
        tag = 'key:' + g
        s += ("DELETE FROM kv WHERE k = %s AND seq = 0 AND v IN ('{}', '[]') AND EXISTS (SELECT 1 FROM meta, json_each(meta.v) WHERE meta.k = %s AND json_each.value = %s);\n" % (q(g), q(MARK), q(tag)))
    s += "DELETE FROM meta WHERE k = %s;\n" % q(MARK)
    return s
def bump(note):
    s = "-- (ج) مراجعةٌ جديدة لكل مفتاحٍ مسّه السكربت (والمحذوفُ منها كذلك) — فتصل التغييراتُ والحذوفُ إلى الجلسات المفتوحة (/api/changes)\n"
    s += "INSERT INTO meta (k, v) VALUES ('rev', '1') ON CONFLICT(k) DO UPDATE SET v = CAST(CAST(meta.v AS INTEGER) + 1 AS TEXT);\n"
    s += ("INSERT INTO revs (k, rev) SELECT k, (SELECT CAST(v AS INTEGER) FROM meta WHERE k = 'rev') FROM (SELECT k FROM kv WHERE k LIKE %s UNION SELECT k FROM revs WHERE k LIKE %s UNION SELECT k FROM kv WHERE k IN (%s)) WHERE 1"
          " ON CONFLICT(k) DO UPDATE SET rev = excluded.rev;\n") % (TST, TST, ', '.join(q(g) for g in GLOBALS))
    if A.daily_stats_storage == 'relational':
        s += "INSERT INTO revs (k, rev) VALUES ('bassam_dstats_v1', (SELECT CAST(v AS INTEGER) FROM meta WHERE k = 'rev')) ON CONFLICT(k) DO UPDATE SET rev = excluded.rev;\n"
    if A.custody_storage == 'relational':
        s += "INSERT INTO revs (k,rev) VALUES ('bsdept:tst_d1:bassam_custody_v1',(SELECT CAST(v AS INTEGER) FROM meta WHERE k='rev')) ON CONFLICT(k) DO UPDATE SET rev=excluded.rev;\n"
    s += ("INSERT OR IGNORE INTO aud (cid, ts, uid, un, dept, k, rev, etype, eid, ename, act, ctx, bef, aft, ip, dev, city) VALUES (%s, %d, 'tst_fixture', 'TEST_ONLY', '', 'system', "
          "(SELECT CAST(v AS INTEGER) FROM meta WHERE k = 'rev'), 'system', 'fixture', 'TEST_ONLY fixture', %s, %s, '', '', '', '', '');\n") % (
          q('tst_fx_' + note + '_' + hashlib.sha256(J(fixture).encode()).hexdigest()[:16] + '_' + str(TS0)), TS0, q(note), q(J({'today': T, 'version': fixture['version']})))
    return s
def cnt_arr(key, cond):
    return ("(SELECT COUNT(*) FROM json_each((SELECT CASE WHEN json_valid(v) THEN v ELSE '[]' END FROM kv WHERE k = %s AND seq = 0)) WHERE CASE WHEN type = 'object' THEN %s ELSE 0 END)" % (q(key), cond))
EXPECT = {'test_keys': len(DEPT_KEYS), 'test_users': len(users), 'test_depts': len(DEPTS), 'test_nodes': len(NODES)}
def verify(label, zero):
    s = "-- (د) تحقّق — %s\n" % label
    s += ("SELECT (SELECT COUNT(DISTINCT k) FROM kv WHERE k LIKE %s) AS test_keys, %s AS test_users, %s AS test_depts, %s AS test_nodes, "
          "(SELECT COUNT(*) FROM sess WHERE uid LIKE 'tst\\_%%' ESCAPE '\\') AS test_sessions, "
          "(SELECT COUNT(*) FROM kv WHERE k IN (%s) AND seq > 0) AS chunked_globals, "
          "(SELECT v FROM meta WHERE k = 'authz_mode') AS authz_mode, '%s' AS expected;\n") % (
          TST, cnt_arr('bassam_auth_users_v1', USER_COND), cnt_arr('bassam_depts_v1', ID_COND), cnt_arr('bassam_gdepts_v1', ID_COND),
          ', '.join(q(g) for g in GLOBALS), ('0 · 0 · 0 · 0 · 0' if zero else '%(test_keys)d · %(test_users)d · %(test_depts)d · %(test_nodes)d · 0' % EXPECT))
    return s
HEAD = ("-- ═══ KIVO_243 · TEST FIXTURE · TEST_ONLY ═══\n-- مولَّدٌ حتمياً (gen_fixture.py --today %s) · لا بيانات إنتاج · لا بيانات شخصية حقيقية · لا يمسّ meta.authz_mode (مفتاح الإنفاذ)\n"
        "-- يُشغَّل على قاعدة Preview وحدها. قابلٌ لإعادة التشغيل بلا تكرار: يزيل بيانات الاختبار السابقة ثم يزرعها من جديد.\n"
        "-- السجلاتُ العامة (الحسابات · الإدارات · الهيكل · الصلاحيات) تُدمج دمجاً ولا تُستبدل — وتُترك كما هي إن كانت مقطَّعة أو تالفة (chunked_globals في التحقّق).\n") % A.today
seed = HEAD + ds_schema() + cu_schema() + ds_preflight() + cu_preflight() + removal()
seed += marks()
seed += "-- (ب) الزرع\n"
seed += arr_merge('bassam_auth_users_v1', users, USER_COND)
seed += arr_merge('bassam_depts_v1', DEPTS, ID_COND)
seed += arr_merge('bassam_gdepts_v1', NODES, ID_COND)
seed += obj_patch('bassam_perms_v1', PERMS_ADD)
seed += ds_seed()
seed += cu_seed()
for k in sorted(DEPT_KEYS):
    seed += "INSERT INTO kv (k, seq, v) VALUES (%s, 0, %s);\n" % (q(k), q(J(DEPT_KEYS[k])))
seed += bump('seeded')
seed += verify('المتوقَّع: test_keys · test_users · test_depts · test_nodes · test_sessions', False)
reset = HEAD.replace('يزيل بيانات الاختبار السابقة ثم يزرعها من جديد', 'يزيل كلَّ بيانات الاختبار (TEST_ONLY) ولا يزرع شيئاً') + ds_schema() + cu_schema() + cu_preflight() + removal() + unmarks() + bump('reset')
reset += verify('يجب أن تكون الأعدادُ صفراً', True)
reset += ("-- (اختياري) سجلُّ الأنشطة وسجلُّ قرارات الصلاحية لحسابات الاختبار يبقيان شاهداً (السجلُّ إلحاقٌ فقط) — وأرقامُ مراجعة المفاتيح المحذوفة تبقى (أثرُ الحذف للجلسات). لمحوها صراحةً أزل التعليق:\n"
          "-- DELETE FROM aud WHERE uid LIKE 'tst\\_%' ESCAPE '\\' OR dept LIKE 'tst\\_%' ESCAPE '\\';\n"
          "-- DELETE FROM authz WHERE uid LIKE 'tst\\_%' ESCAPE '\\' OR dept LIKE 'tst\\_%' ESCAPE '\\';\n"
          "-- DELETE FROM revs WHERE k LIKE 'bsdept:tst\\_%' ESCAPE '\\';\n")
open(os.path.join(A.out, 'test_seed.sql'), 'w', encoding='utf-8').write(seed)
open(os.path.join(A.out, 'reset_test_fixture.sql'), 'w', encoding='utf-8').write(reset)
with open(os.path.join(A.out, 'credentials.txt'), 'w', encoding='utf-8') as f:
    f.write('KIVO_243 · حساباتُ الاختبار (TEST_ONLY) — أرقامٌ اصطناعية، ليست لأشخاصٍ حقيقيين · Preview وحدها\n\n')
    for c in creds: f.write('%-9s  %-11s  %-34s  %-10s  %-8s  %s\n' % c)
print('fixture: %d users · %d depts · %d dept keys · seed %d B · reset %d B' % (len(users), len(DEPTS), len(DEPT_KEYS), len(seed.encode()), len(reset.encode())))
