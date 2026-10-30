# -*- coding: utf-8 -*-
"""KIVO_259 · AUD-030 · SOT-089 · SOT-069 — قبولُ «إضافةُ عدسةٍ بلا تعديلٍ في 33x ولا في الخادم» آلياً (ADR-018):
   على نسخةٍ مؤقتة من الشجرة تُضاف عدسةٌ جديدة «heat» (حقولٌ فوق عناصر المصليات + حقلُ طابق) بملفّين فقط:
   plugins/lenses/heat/manifest.json (جديد) ومفاتيحُها في سجلّ v24.9 (permissions/registry/registry-v24.9.json — بيانات)، ثم يُشغَّل المولِّد. فيجب:
   (أ) ما تغيّر = الملفّان + المشتقّاتُ المعلنة وحدها (كتلةُ السجلّ في الواجهة · جزءُ السجلّ في الخادم · جزءُ الإضافات 006a · العاملُ المركَّب · شجرةُ v24.9)
       — لا ملفَّ كودٍ آخر: 33x · طبقةُ الإنفاذ · الوحدات · الصفحات بايتاً كما كانت.
   (ب) الواجهة: LENS_REG (KIVO_MANIFEST.lenses) فيه العدسة · شجرةُ v24.9 تُلحقها بحاوية «العدسات (Plugins)» بمفاتيحها (source: plugin) — فتظهر في
       السقف ونافذة الموظف والقوالب (المصدرُ نفسُه الذي يرسمها) · tools/plugins.py check على النسخة = 0 مخالفة.
   (ج) الخادم (طبقةُ الإنفاذ، تشغيلاً في Node): مفاتيحُ العدسة مربوطةٌ بها (enfIx.lens) فتمرّ ببوابة العدسة · سقفُ العدسة يحجبها خارجه (enfKeyOnCeiling) ·
       تعديلُ حقلها يُصنَّف بمفتاحها لا بتعديل المصلّى العام (enfPlugOps) · حقلُ الطابق بمفتاحها لا بتعديل الموقع · الإسقاطُ يحجب حقولَها حين تُطفأ
       والدمجُ يعيدها من الخادم · وحين تعمل تُرى كما هي · والعدساتُ الستّ المضمَّنة كما كانت.
       python3 tests/source/plugin_add_check.py"""
import os, sys, json, shutil, tempfile, subprocess, hashlib
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P, F = [0], [0]
def ok(c, n, x=''):
    (P if c else F)[0] += 1
    print(('  ✔ ' if c else '  ✘ ') + n + (('   ← ' + str(x)[:400]) if x else ''))
tmp = tempfile.mkdtemp(prefix='k259plug_'); S = os.path.join(tmp, 'src')
shutil.copytree(os.path.join(ROOT, 'src'), S)
for d in ('workers', 'migrations', 'config'):
    if os.path.isdir(os.path.join(ROOT, d)): shutil.copytree(os.path.join(ROOT, d), os.path.join(tmp, d), ignore=shutil.ignore_patterns('__pycache__'))
def snap():
    out = {}
    for base in (S, os.path.join(tmp, 'workers')):
        for dp, dn, fn in os.walk(base):
            for f in fn:
                q = os.path.join(dp, f); out[os.path.relpath(q, tmp)] = hashlib.sha256(open(q, 'rb').read()).hexdigest()
    return out
g0 = subprocess.run([sys.executable, 'tools/generate.py', '--src', S, '--check'], cwd=ROOT, capture_output=True, text=True)
ok(g0.returncode == 0, 'النسخةُ المؤقتة = المصدر (generate --check قبل الإضافة)', (g0.stdout + g0.stderr).strip().split('\n')[-1][:160])
before = snap()
print('╔═ إضافةُ العدسة «heat»: manifest + مفاتيحُها في السجلّ ═╗')
man = {'schema': 1, 'kind': 'lens', 'key': 'heat', 'name': 'الحرارة', 'label': 'عدسة الحرارة', 'order': 7, 'owner': 'lens.heat', 'hosts': ['plan', 'daily/rounds'],
       'keys': {'own': ['lens.heat.enable', 'lens.heat.view', 'lens.heat.data.edit', 'lens.heat.configure'], 'managedRefs': [], 'reserved': ['lens.heat.report.view']},
       'resources': {'elementFields': [{'cols': ['zones'], 'fields': ['heat', 'heatAt'], 'op': 'lens.heat.data.edit'}], 'floorFields': [{'field': 'heatCfg', 'op': 'lens.heat.configure'}]},
       'guards': {'enable': 'lens.heat.enable', 'resources': ['bassam_plan_v1', 'bassam_rounds_v1']}, 'tests': ['tests/unit/plugins.test.mjs']}
os.makedirs(os.path.join(S, 'plugins', 'lenses', 'heat'))
sys.path.insert(0, os.path.join(ROOT, 'tools')); import plugins as PL
open(os.path.join(S, 'plugins', 'lenses', 'heat', 'manifest.json'), 'w', encoding='utf-8').write(PL.fmt(man) + '\n')
rp = os.path.join(S, 'permissions', 'registry', 'registry-v24.9.json'); R = json.load(open(rp, encoding='utf-8'))
base = next(e for e in R['registry'] if e['key'] == 'lens.dens.view')
def ent(key, label, typ, grant, status, asis, guard):
    e = json.loads(json.dumps(base)); e.update({'key': key, 'owner': 'lens.heat', 'domain': 'lens.heat', 'label': label, 'type': typ, 'grant': grant, 'status': status, 'asisMap': asis, 'v23': [], 'reservedReason': None if status == 'active' else 'لا تقرير'}); e['guard'] = guard; return e
G = lambda kind, st: {'kind': kind, 'resources': ['bassam_plan_v1', 'bassam_rounds_v1'], 'detail': 'عدسةُ إضافةٍ (اختبار القبول)', 'status': st}
R['owners'].append({'id': 'lens.heat', 'kind': 'lens', 'label': 'عدسة الحرارة', 'manifest': 'plugin', 'managedIn': None, 'resource': None})
R['registry'] += [ent('lens.heat.enable', 'تفعيل عدسة الحرارة', 'capability', 'assignable', 'active', ['lens-flag:heat (deptLenses/empLens)'], G('capability', 'to-build')),
                  ent('lens.heat.view', 'عرض الحرارة', 'access', 'assignable', 'active', ['daily/rounds:view', 'plan:view'], G('read', 'exists')),
                  ent('lens.heat.data.edit', 'تسجيل قراءة الحرارة', 'action', 'assignable', 'active', ['daily/rounds:edit', 'plan:edit'], G('write', 'exists')),
                  ent('lens.heat.configure', 'ضبط عتبة الحرارة', 'action', 'assignable', 'active', ['plan:edit'], G('write', 'exists')),
                  ent('lens.heat.report.view', 'تقارير الحرارة', 'access', 'none', 'reserved', [], {'kind': 'none', 'resources': [], 'detail': 'محجوز', 'status': 'reserved'})]
for a in R['atoms']:
    if (a['leaf'], a['act']) in (('plan', 'view'), ('daily/rounds', 'view')): a['targets'].append('lens.heat.view')
    if (a['leaf'], a['act']) in (('plan', 'edit'), ('daily/rounds', 'edit')): a['targets'].append('lens.heat.data.edit')
    if (a['leaf'], a['act']) == ('plan', 'edit'): a['targets'].append('lens.heat.configure')
json.dump(R, open(rp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
g1 = subprocess.run([sys.executable, 'tools/generate.py', '--src', S], cwd=ROOT, capture_output=True, text=True)
pt = subprocess.run([sys.executable, 'tools/perm_tree.py', 'emit', '--src', S], cwd=ROOT, capture_output=True, text=True)
ok(g1.returncode == 0 and pt.returncode == 0, 'المولِّدُ وشجرةُ v24.9 بعد الإضافة', ((g1.stdout + g1.stderr).strip().split('\n')[-1] + ' · ' + pt.stdout.strip())[:200])
after = snap()
changed = sorted(k for k in set(before) | set(after) if before.get(k) != after.get(k))
want = {'src/plugins/lenses/heat/manifest.json', 'src/permissions/registry/registry-v24.9.json',                         # الملفّان (يدوياً)
        'src/permissions/340-registry-v24-9.js', 'workers/parts/004-registry-2.js', 'workers/parts/006a-lens-plugins.js',  # المشتقّات
        'workers/_worker.js', 'src/manifests/255-page-manifest.js', 'src/manifests/perm-tree24.json'}
ok(set(changed) == want, '★ (أ) ما تغيّر = manifest العدسة + سجلُّها (يدوياً) + المشتقّاتُ وحدها — لا ملفَّ كودٍ آخر (33x · طبقةُ الإنفاذ · الوحدات · الصفحات)',
   json.dumps({'extra': sorted(set(changed) - want), 'missing': sorted(want - set(changed))}, ensure_ascii=False))
code = [k for k in before if k.endswith('.js') and k not in want and ('/permissions/3' in k or '/auth/' in k or k.startswith('workers/parts/05') or k.startswith('workers/parts/06'))]
ok(len(code) >= 15 and all(before[k] == after[k] for k in code), '   كودُ الصلاحيات (33x) وطبقةُ الإنفاذ (05x/06x) بايتاً كما كانا (' + str(len(code)) + ' ملفاً)')
pc = subprocess.run([sys.executable, 'tools/plugins.py', 'check', '--src', S], cwd=ROOT, capture_output=True, text=True)
ok(pc.returncode == 0 and '7 عدسة' in pc.stdout and 'heat' in pc.stdout, '★ (ب) tools/plugins.py check على النسخة: 7 عدسات · 0 مخالفة (heat خارج المرجع — تحرسها طبقةُ الإنفاذ)', pc.stdout.strip().split('\n')[-1][:200])
T = json.load(open(os.path.join(S, 'manifests', 'perm-tree24.json'), encoding='utf-8'))
lc = [c for c in T['containers'] if c['id'] == 'lenses'][0]; hl = [l for l in lc['leaves'] if l['owner'] == 'lens.heat']
ok(len(hl) == 1 and hl[0].get('source') == 'plugin' and sorted(hl[0]['keys']) == sorted(man['keys']['own']) and T['counts']['leaves'] == 45 and T['counts']['keys'] == 259,
   '★ (ب) شجرةُ v24.9: ورقةُ «عدسة الحرارة» في حاوية العدسات بمفاتيحها الأربعة (source: plugin) — 45 ورقة · 259 مفتاحاً', json.dumps(T['counts']))
js = r'''
const vm = require('vm'); const fs = require('fs'); const w = {}; const ctx = vm.createContext({ window: w }); ctx.KIVO = w;
vm.runInContext(fs.readFileSync(process.argv[1], 'utf8'), ctx);
console.log(JSON.stringify(w.KIVO_MANIFEST.clone('lenses')));
'''
r = subprocess.run(['node', '-e', js, os.path.join(S, 'manifests', '255-page-manifest.js')], capture_output=True, text=True)
L = json.loads(r.stdout.strip() or '[]') if r.stdout.strip().startswith('[') else []
ok([x['key'] for x in L] == ['zones', 'paths', 'gates', 'marks', 'dist', 'dens', 'heat'] and L[-1]['name'] == 'الحرارة', '★ (ب) الواجهة: LENS_REG (KIVO_MANIFEST.lenses) = العدساتُ الستّ + «الحرارة» (ومنه LENS_KEYS · P24_LENSES · النمطُ «ميداني»)', r.stdout.strip()[:200] or r.stderr[:200])
print('\n╔═ (ج) الخادم: طبقةُ الإنفاذ تحرس العدسةَ الجديدة من الـmanifest وحده ═╗')
node = r'''
import { internals } from '%s';
const W = await internals(['KIVO_LENS_PLUGINS', 'KIVO_GUARDS', 'KIVO_BUILD', 'enfPlugOps', 'enfIx', 'enfKeyOnCeiling', 'ENF_PROJ', 'enfFloorProj'], process.argv[2]);
const out = {};
out.keys = W.KIVO_LENS_PLUGINS.keys; out.refLenses = W.KIVO_BUILD.LENSES;
out.ix = ['lens.heat.view', 'lens.heat.data.edit', 'lens.heat.configure', 'lens.heat.enable', 'lens.zones.view'].map(k => W.enfIx().lens[k] || null);
const ctx = { dept: 'd1', actor: { id: 'u', ekey: 'e1', role: 'staff' } };
const a = { floors: [{ sid: 'S1', zones: [{ uid: 'z1', heat: 1, name: 'أ', count: 1 }], heatCfg: 1 }] }, b = { floors: [{ sid: 'S1', zones: [{ uid: 'z1', heat: 2, name: 'ب', count: 2 }], heatCfg: 2 }] };
out.rawKeys = W.KIVO_GUARDS.classify('bassam_plan_v1', a, b, ctx).keys();
out.plugKeys = W.enfPlugOps(W.KIVO_GUARDS.classify('bassam_plan_v1', a, b, ctx)).keys();
const ra = { '1447-3-5': { d: [{ sid: 'S1', zones: [{ uid: 'z1', heatAt: 1 }], heatCfg: 1 }] } }, rb = { '1447-3-5': { d: [{ sid: 'S1', zones: [{ uid: 'z1', heatAt: 2 }], heatCfg: 3 }] } };
out.roundsRaw = W.KIVO_GUARDS.classify('bassam_rounds_v1', ra, rb, ctx).keys();
out.roundsPlug = W.enfPlugOps(W.KIVO_GUARDS.classify('bassam_rounds_v1', ra, rb, ctx)).keys();
const A = (lenses) => ({ perms: { caps: { d1: ['plan', 'daily'] }, subs: {}, tabs: {}, lenses: { d1: lenses }, empLens: {} }, u: { role: 'super', id: 'u', ekey: '' } });
out.ceilOff = W.enfKeyOnCeiling(A(['zones']), 'd1', 'lens.heat.view'); out.ceilOn = W.enfKeyOnCeiling(A(['zones', 'heat']), 'd1', 'lens.heat.view');
const V = (on) => ({ lens: { zones: true, paths: true, gates: true, marks: true, dist: true, dens: true, heat: on }, restrict: { Site: false, 'Zone/Element': false, Assigned: false, Shift: false }, ekey: 'e1', siteOk: () => true, zoneOk: () => true });
const cur = { floors: [{ sid: 'S1', zones: [{ uid: 'z1', name: 'أ', heat: 7, heatAt: 'T', count: 3 }], heatCfg: { th: 5 } }] };
out.onOff = [W.ENF_PROJ['bassam_plan_v1'].on(V(true)), W.ENF_PROJ['bassam_plan_v1'].on(V(false))];
out.projOff = W.ENF_PROJ['bassam_plan_v1'].proj(cur, V(false));
out.projOn = W.ENF_PROJ['bassam_plan_v1'].proj(cur, V(true));
const sent = { floors: [{ sid: 'S1', zones: [{ uid: 'z1', name: 'ب', count: 4 }] }] };
out.merged = W.ENF_PROJ['bassam_plan_v1'].merge(cur, sent, V(false));
console.log(JSON.stringify(out));
''' % ('file://' + os.path.join(ROOT, 'tests', 'unit', 'internals.mjs'))
nf = os.path.join(tmp, 'probe.mjs'); open(nf, 'w', encoding='utf-8').write(node)
r = subprocess.run(['node', '--no-warnings', nf, os.path.join(tmp, 'workers', '_worker.js')], capture_output=True, text=True, cwd=ROOT)
o = json.loads(r.stdout.strip().split('\n')[-1]) if r.stdout.strip().startswith('{') else {}
ok(o.get('keys') == ['zones', 'paths', 'gates', 'marks', 'dist', 'dens', 'heat'] and 'heat' not in (o.get('refLenses') or ['heat']), '   KIVO_LENS_PLUGINS فيه heat · المرجعُ KIVO_BUILD.LENSES كما هو (الست)', (r.stdout + r.stderr)[:300])
ok(o.get('ix') == ['heat', 'heat', 'heat', 'heat', 'zones'], '★ (ج) enfIx: مفاتيحُ العدسة الأربعة مربوطةٌ بـheat (enfPlugLensOf) — فتمرّ ببوابة العدسة كالمضمَّنة', json.dumps(o.get('ix')))
ok(o.get('ceilOff') is False and o.get('ceilOn') is True, '★ (ج) سقفُ الإدارة: lens.heat.view خارج السقف حين لا تكون heat في عدسات الإدارة · داخله حين تكون', json.dumps([o.get('ceilOff'), o.get('ceilOn')]))
ok(sorted(o.get('rawKeys') or []) == ['lens.dens.reading.record', 'lens.zones.data.edit', 'site.edit'] and sorted(o.get('plugKeys') or []) == ['lens.dens.reading.record', 'lens.heat.configure', 'lens.heat.data.edit', 'lens.zones.data.edit'],
   '★ (ج) التصنيف: حقلُ heat على المصلّى → lens.heat.data.edit (لا تعديلَ المصلّى العام وحده) · حقلُ الطابق heatCfg → lens.heat.configure (لا site.edit) · الكثافةُ والاسمُ كما هما', json.dumps([o.get('rawKeys'), o.get('plugKeys')], ensure_ascii=False))
ok(sorted(o.get('roundsRaw') or []) == ['lens.zones.data.edit', 'round.edit'] and sorted(o.get('roundsPlug') or []) == ['lens.heat.configure', 'lens.heat.data.edit'], '   والجولات: heatAt → lens.heat.data.edit · heatCfg → lens.heat.configure', json.dumps([o.get('roundsRaw'), o.get('roundsPlug')]))
po, pn = o.get('projOff') or {}, o.get('projOn') or {}
z0 = (po.get('floors') or [{}])[0].get('zones', [{}])[0] if po else {}; z1 = (pn.get('floors') or [{}])[0].get('zones', [{}])[0] if pn else {}
ok(o.get('onOff') == [False, True] and 'heat' not in z0 and 'heatAt' not in z0 and 'heatCfg' not in po['floors'][0] and z0.get('count') == 3 and z1.get('heat') == 7 and z1.get('heatAt') == 'T' and pn['floors'][0].get('heatCfg') == {'th': 5},
   '★ (ج) الإسقاط: العدسةُ مطفأة ⇒ heat/heatAt على المصلّى وheatCfg على الطابق محجوبة (والكثافةُ كما هي) · تعمل ⇒ تُرى كما هي', json.dumps([z0, z1], ensure_ascii=False))
mz = ((o.get('merged') or {}).get('floors') or [{}])[0]
ok(mz.get('zones', [{}])[0].get('heat') == 7 and mz['zones'][0].get('heatAt') == 'T' and mz.get('heatCfg') == {'th': 5} and mz['zones'][0].get('name') == 'ب' and mz['zones'][0].get('count') == 4,
   '★ (ج) الدمج: حفظُ من لا يرى العدسة يعيد حقولَها من الخادم (لا تُمحى) ويُبقي تعديلَه على ما يراه', json.dumps(mz, ensure_ascii=False)[:200])
shutil.rmtree(tmp, ignore_errors=True)
print('\n══ النتيجة: نجح %d | أخفق %d ══' % (P[0], F[0]))
sys.exit(1 if F[0] else 0)
