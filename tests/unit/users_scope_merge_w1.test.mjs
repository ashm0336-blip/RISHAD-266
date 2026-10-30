/* الفحصُ العميق 2026-10-21 · الموجة 1 · R4 — خاصّيةُ «الكتابة من قائمةٍ مُسقَطة لا تحذف حساباً ولا تمحو حقلاً» على دوال الخادم نفسِها (054 usersScopeOut ·
   usersScopeIn مع stripPh · usersNoOut · usersNoIn) بلا طلبات: قوائمُ اصطناعيةٌ عشوائيةٌ بذرتُها ثابتة (TEST_ONLY) — إداراتٌ وأدوارٌ وحقولُ هويةٍ وجوالٍ
   ورقمٍ وظيفيّ وبصمة، ومفاتيحُ قديمةٌ برقم الهوية، وسجلاتٌ تالفة — ولكلّ فاعلٍ (حساب الإدارة · المديرُ المعيَّن · مديرُ الفرع · المشرف · الموظف):
     (أ) القائمةُ كما وصلته ⇒ المخزَّنُ حرفاً (نصّاً لا معنىً فقط)
     (ب) تعديلاتٌ عشوائية مما يملكه (تجميدٌ · اسمٌ · بصمةٌ لنفسه · إضافةٌ في الذيل · حذفٌ) ⇒ الناتجُ = المخزَّنُ بعد التعديلات نفسِها، ترتيباً وحقولاً
     (ج) ما لا يراه لا يتغيّر أبداً: كلُّ حسابٍ لم يُعدَّل يعود كما خُزِّن حرفاً، ولا يُحذف حسابٌ لم يحذفه */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { internals } from './internals.mjs';

const I = await internals(['actorFromKeys', 'usersScopeOut', 'usersScopeIn', 'usersNoOut', 'usersNoIn', 'stripPh', 'mergeUsers']);
const TAG = 'TEST_ONLY';
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const D = ['wd1', 'wd2', 'wd3', 'wd4'];
const PH = (r) => 'p2$100000$' + Math.floor(r() * 1e16).toString(16).padStart(32, '0').slice(0, 32) + '$' + 'a'.repeat(64);
/* قائمةٌ اصطناعية: مديرو نظام · مدير فرعٍ فوق wd1+wd2 · حسابُ إدارة · مديرٌ معيَّن · موظفٌ بصفة مدير · موظفون (بعضُهم مفتاحُه رقمُ هوية) · سجلٌّ تالف */
function makeList(r) {
  const L = [{ id: 'su', un: '0000000001', ph: PH(r), name: TAG + ' مدير النظام', role: 'super' }, { id: 'wgm', un: '0000000002', alt: '0500000002', ph: PH(r), no: '70002', name: TAG + ' مدير الفرع', role: 'gm', gid: 'wg1', ekey: 'gm:wg1', dis: 0 }];
  let n = 10;
  for (const d of D) {
    L.push({ id: 'wdep_' + d, un: '00000001' + d.slice(-1) + '0', ph: PH(r), name: TAG + ' حساب ' + d, role: 'dept', deptId: d });
    L.push({ id: 'wm_' + d, un: '00000002' + d.slice(-1) + '0', alt: '05000002' + d.slice(-1) + '0', ph: PH(r), no: '7' + d.slice(-1) + '000', role: 'staff', deptId: d, ekey: 'mgr:' + d, name: TAG + ' مدير ' + d, mgr: true, dis: 0, title: 'مدير' });
    const k = 3 + Math.floor(r() * 6);
    for (let i = 0; i < k; i++) {
      const nid = String(2000000000 + (++n)), u = { id: 'ws_' + d + '_' + i, un: nid, alt: '05' + String(10000000 + n), ph: r() < 0.8 ? PH(r) : undefined, role: 'staff', deptId: d,
        ekey: r() < 0.2 ? nid : 'we_' + d + '_' + i, name: TAG + ' موظف ' + n, dis: r() < 0.15 ? 1 : 0 };
      if (r() < 0.1) u.mgr = true;
      if (r() < 0.2) u.email = 'w' + n + '@test.invalid';
      if (r() < 0.1) u.test = TAG;
      L.push(Object.fromEntries(Object.entries(u).filter(([, v]) => v !== undefined)));
    }
  }
  for (const u of L) if (u.id === 'ws_wd2_0' || u.id === 'ws_wd3_0') { u.dis = 0; u.ekey = 'we_' + u.deptId + '_0'; delete u.mgr; }   /* الفاعلان نشطان بمفتاحهما */
  if (r() < 0.5) L.splice(Math.floor(r() * L.length), 0, { name: TAG + ' سجلٌّ تالفٌ بلا معرّف' });
  /* ترتيبٌ مختلط كما في القواعد الحقيقية (الإضافاتُ عبر السنين) */
  for (let i = L.length - 1; i > 1; i--) { const j = 2 + Math.floor(r() * (i - 1)); [L[i], L[j]] = [L[j], L[i]]; }
  return L;
}
const ACTORS = { dept: 'wdep_wd1', mgr: 'wm_wd1', gm: 'wgm', sup: 'ws_wd2_0', plain: 'ws_wd3_0' };
function keysOf(L) {
  return {
    bassam_auth_users_v1: JSON.stringify(L),
    bassam_depts_v1: JSON.stringify(D.map((d) => ({ id: d, name: TAG + ' ' + d, gid: d === 'wd1' || d === 'wd2' ? 'wg1' : '' }))),
    bassam_gdepts_v1: JSON.stringify([{ id: 'wg1', name: TAG + ' فرع', kind: 'إدارة عامة' }]),
    /* المشرفُ في wd2 بورقة «الجدول الشهري» (يقرأ سجلَّ موظفي إدارته) — والموظفُ في wd3 بلا ورقة */
    bassam_perms_v1: JSON.stringify({ emps: { wd2: { we_wd2_0: { staff: ['view'] } } } }),
    bassam_platform_v1: '{}'
  };
}
/* ما يصل الفاعلَ — كما في الإقلاع و/api/get حرفاً */
const seen = (raw, A) => I.usersScopeOut(I.usersNoOut(I.stripPh(raw), A), A);
/* ما يُحكم عليه — كما في applySave قبل الحكم (وبه يُقاس «لا كتابةَ بلا تغيير») · وما يُكتب بعد القبول (mergeUsers: البصمةُ الغائبة تُورَث) */
const merged = (incRaw, curRaw, A) => I.usersScopeIn(I.usersNoIn(incRaw, curRaw, A), curRaw, A);
const written = (incRaw, curRaw, A) => I.mergeUsers(merged(incRaw, curRaw, A), JSON.parse(curRaw), A.u.id, 'w1');

test('(أ) القائمةُ كما وصلت كلَّ فاعلٍ تعود المخزَّنَ حرفاً — 60 قائمةً عشوائية × 5 فاعلين', () => {
  const r = rng(20261021);
  let checked = 0;
  for (let t = 0; t < 60; t++) {
    const L = makeList(r), raw = JSON.stringify(L);
    for (const [role, uid] of Object.entries(ACTORS)) {
      if (!L.some((u) => u.id === uid)) continue;
      const A = I.actorFromKeys(keysOf(L), uid); assert.ok(A, role + ': فاعل');
      const v = seen(raw, A); assert.equal(merged(v, raw, A), raw, role + ' #' + t + ': المخزَّنُ حرفاً'); checked++;
    }
  }
  assert.ok(checked >= 250, 'عددُ الحالات ' + checked);
});

test('(ب)(ج) تعديلاتٌ عشوائية مما يملكه كلُّ فاعل ⇒ الناتجُ = المخزَّنُ بعد التعديلات نفسِها · وما لم يُعدَّل يعود حرفاً', () => {
  const r = rng(424242);
  let edits = 0, hiddenKept = 0;
  for (let t = 0; t < 80; t++) {
    const L = makeList(r), raw = JSON.stringify(L);
    for (const [role, uid] of Object.entries(ACTORS)) {
      if (!L.some((u) => u.id === uid)) continue;
      const A = I.actorFromKeys(keysOf(L), uid), V = JSON.parse(seen(raw, A));
      if (role === 'sup') assert.ok(V.some((u) => u.id === 'ws_wd2_1' && u.ekey && !u.un), 'المشرفُ يرى زميله بلا أرقام (الإعدادُ ذو معنى)');
      const own = (u) => !!(u && u.id && u.role === 'staff' && !u.mgr && !/^mgr:/.test(String(u.ekey || '')));   /* حساباتُ موظفي إداراته (ما يحكم usersRule بأنه يملكه) */
      const exp = JSON.parse(raw), out = V.map((u) => Object.assign({}, u)), touched = new Set();
      const mgrDeps = role === 'gm' ? ['wd1', 'wd2'] : (role === 'dept' || role === 'mgr') ? ['wd1'] : [];
      /* (1) لنفسه: بصمةٌ جديدة */
      if (r() < 0.6) { const p = PH(r); out.find((u) => u.id === uid).ph = p; exp.find((u) => u.id === uid).ph = p; touched.add(uid); edits++; }
      /* (2) المديرُ: تجميدٌ/اسمٌ لموظفٍ في إدارته · حذفُ موظف · إضافةٌ في الذيل */
      if (mgrDeps.length) {
        const mine = out.filter((u) => own(u) && mgrDeps.includes(u.deptId));
        for (const u of mine) {
          const x = r();
          if (x < 0.15) { u.dis = u.dis ? 0 : 1; exp.find((e) => e.id === u.id).dis = u.dis; touched.add(u.id); edits++; }
          else if (x < 0.25) { u.name = TAG + ' اسمٌ معدَّل ' + t; exp.find((e) => e.id === u.id).name = u.name; touched.add(u.id); edits++; }
        }
        const del = mine.filter(() => r() < 0.1).map((u) => u.id);
        for (const id of del) { out.splice(out.findIndex((u) => u.id === id), 1); exp.splice(exp.findIndex((u) => u.id === id), 1); touched.add(id); edits++; }
        if (r() < 0.5) { const nu = { id: 'wnew_' + t + '_' + role, un: String(2100000000 + t), ph: PH(r), role: 'staff', deptId: mgrDeps[0], ekey: 'wenew_' + t, name: TAG + ' جديد', dis: 0 }; out.push(nu); exp.push(nu); edits++; }
      }
      const got = JSON.parse(written(JSON.stringify(out), raw, A));
      assert.deepEqual(got, exp, role + ' #' + t + ': الناتجُ = المخزَّنُ بعد التعديلات نفسِها (الترتيبُ والحقول)');
      /* (ج) كلُّ سجلٍّ لم يُعدَّل يعود كما خُزِّن حرفاً — والمحجوبُ منها خاصةً */
      const vis = new Set(V.map((u) => u.id));
      for (const u of L) {
        if (touched.has(u.id)) continue;
        const g = got.find((x) => x.id === u.id && (u.id !== undefined || x.name === u.name));
        assert.equal(JSON.stringify(g), JSON.stringify(u), role + ' #' + t + ': ' + (u.id || 'بلا معرّف') + ' كما هو حرفاً');
        if (!vis.has(u.id)) hiddenKept++;
      }
      /* ولا هويةَ ولا جوالَ لمن لا يديره فيما وصله */
      for (const u of V) if (u.id !== uid && !mgrDeps.includes(u.deptId)) assert.ok(!u.un && !u.alt && !u.no && !u.email && !u.phone, role + ': ' + u.id + ' بلا أرقام');
    }
  }
  assert.ok(edits > 200 && hiddenKept > 2000, 'التعديلات ' + edits + ' · المحجوبُ المحفوظ ' + hiddenKept);
});
