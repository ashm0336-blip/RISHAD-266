/* F01 · الأقسام (خطة التوحيد) — على العامل الحقيقي (workers/_worker.js · عالمُ tasks_fx · D1 البديل) بالوضعين legacy وenforce.
   الهيكل: tst_g1 (عقدة) ⊃ tst_d1 ⊃ tst_s1 · tst_s2 (قسمان) — tst_d2 ⊃ tst_s3. القسمُ وحدةُ بياناتٍ كالإدارة: مديرُه وموظفوه وسقفُه وبياناتُه.
     (1) إنشاءُ قسمٍ تحت إدارة: مدير النظام · ومديرُ الإدارة الأم (سجلُّ الوحدات + بذرُ سقف القسم من سقف إدارته) — وما سواه مرفوض
     (2) مديرُ القسم يدير قسمه وحده · ومديرُ الإدارة الأم يدير أقسامَه (قراءةً وكتابةً) — لا أقسامَ غيره
     (3) العزل: بين القسمين الشقيقين · وبين القسم والإدارات الأخرى · وموظفو الإدارة الأم خارج القسم — kv (bsdept:<قسم>:*) والعلائقيّ (العهدة)
     (4) تصادمُ المعرّفات (id-clash) · (5) العقدةُ الفوقية ليست وحدةَ بيانات (super · gm تالف · العهدة العلائقية)
     (6) حذفُ القسم ذرّيٌّ في الخادم بلا يتيم · وحذفُ إدارةٍ لها أقسام مرفوضٌ صراحةً
     (7) الخصوصيةُ والسقفُ لكلّ قسم
   البياناتُ اصطناعيةٌ كلُّها (TEST_ONLY · tst_). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, TAG, stored, putKV, addAccount, operationSaveBody, replaceOperationalFixture } from './tasks_fx.mjs';

const K = 'bassam_auth_users_v1', KD = 'bassam_depts_v1', KG = 'bassam_gdepts_v1', KP = 'bassam_perms_v1';
const dk = (d, r) => 'bsdept:' + d + ':bassam_' + r;
const S1 = 'tst_s1', S2 = 'tst_s2', S3 = 'tst_s3';
const E = (d) => dk(d, 'employees_v1');
const ACC = {
  dm1: ['0000000101', '70101', 'tst_dm1'], dm2: ['0000000102', '70102', 'tst_dm2'], sup1: ['0000000111', '70111', 'tst_sup1'], gm: ['0000000103', '70103', 'tst_gm1'],
  sm1: ['0000000141', '70141', 'tst_sm1'], se1: ['0000000142', '70142', 'tst_se1'], sm2: ['0000000145', '70145', 'tst_sm2'], gmX: ['0000000144', '70144', 'tst_gmX'],
};
function acct(W, uid, un, pw, extra) {
  addAccount(W.env, { uid, un, pw, ekey: extra.ekey, dept: extra.deptId || 'tst_d1', role: extra.role || 'staff' });
  const U = stored(W.env, K), u = U.find((x) => x.id === uid);
  Object.assign(u, extra); if (!extra.deptId) delete u.deptId;
  putKV(W.env, K, U);
}
async function sec(W, id, gid, name) {
  const L = stored(W.env, KD); L.push({ id, name: TAG + ' · ' + name, gid, kind: 'قسم' }); putKV(W.env, KD, L);
  const P = stored(W.env, KP); P.caps[id] = (P.caps[gid] || []).slice(); P.emps = P.emps || {}; P.emps[id] = {}; putKV(W.env, KP, P);
  await replaceOperationalFixture(W.env, E(id), [{ eid: 'tst_e_' + id, name: TAG + ' · موظف ' + name, empno: '7' + id.slice(-1) + '001', type: TAG + ' رسمي', work: TAG + ' مراقب' }]);
  if (W.mode === 'enforce') {
    putKV(W.env, dk(id, 'scope_v1'), { v: 1, test: TAG, ceiling: { Site: { mode: 'ALL' }, 'Zone/Element': { mode: 'ALL' } }, emp: {} });
    putKV(W.env, dk(id, 'grants_v1'), { v: 1, test: TAG, emp: {} });
  }
}
async function setup(mode) {
  const W = await world({ mode });
  await sec(W, S1, 'tst_d1', 'قسم ١'); await sec(W, S2, 'tst_d1', 'قسم ٢'); await sec(W, S3, 'tst_d2', 'قسم ٣');
  const P = stored(W.env, KP); P.emps[S1].tst_e_se1 = { 'emps/data': ['view'] }; putKV(W.env, KP, P);
  acct(W, 'tst_sm1', ACC.sm1[0], ACC.sm1[1], { deptId: S1, ekey: 'mgr:' + S1, mgr: true, name: TAG + ' · مدير القسم ١' });
  acct(W, 'tst_se1', ACC.se1[0], ACC.se1[1], { deptId: S1, ekey: 'tst_e_se1', name: TAG + ' · موظف القسم ١', nid: '1999000142', phone: '0599000142' });
  acct(W, 'tst_sm2', ACC.sm2[0], ACC.sm2[1], { deptId: S2, ekey: 'mgr:' + S2, mgr: true, name: TAG + ' · مدير القسم ٢' });
  acct(W, 'tst_gmX', ACC.gmX[0], ACC.gmX[1], { role: 'gm', gid: 'tst_d1', ekey: 'gm:tst_d1', name: TAG + ' · gm تالف (معرّفُه إدارة)' });
  const S = {};
  for (const [r, [u, p]] of Object.entries(ACC)) { const l = await W.login(u, p); S[r] = l.ck; }
  S.super = W.su.ck;
  return { W, S };
}
const get = async (W, ck, keys) => (await W.C.api('/api/get?keys=' + encodeURIComponent(keys.join(',')), { cookie: ck })).j;
const has = (j, k) => !!(j && ((j.keys && j.keys[k] && j.keys[k].v != null) || (j.resources && Object.prototype.hasOwnProperty.call(j.resources, k))));
const UID = (who) => (ACC[who] || [])[2];
/* الموارد التشغيلية (العلائقية — bsdept:<وحدة>:bassam_employees_v1 …) تُقرأ من /api/operations/read بحكم canRead نفسِه */
const opRead = async (W, ck, who, keys) => (await W.C.api('/api/operations/read?' + new URLSearchParams({ keys: keys.join(','), uid: UID(who) }), { cookie: ck })).j;
const val = (j, k) => JSON.parse(j.keys[k].v);
const revOf = (W, k) => { const r = W.env.DB.q('SELECT rev FROM revs WHERE k = ?', k); return r.length ? r[0].rev : 0; };
const save = (W, ck, set, extra) => {
  const base = {}; for (const k of Object.keys(set)) base[k] = revOf(W, k);
  const s = {}; for (const k of Object.keys(set)) s[k] = JSON.stringify(set[k]);
  return W.C.api('/api/save', { method: 'POST', cookie: ck, body: operationSaveBody(W.env, '/api/save', Object.assign({ set: s, del: [], base }, extra || {})) });
};
const ok = (s, k) => !!(s.j && s.j.revs && s.j.revs[k] != null && !(s.j.denied || {})[k] && !(s.j.conflicts || {})[k]);
const why = (s, k) => (((s.j || {}).denied || {})[k] || {}).why || (s.j && s.j.err) || ('status ' + s.status);
const show = (s) => JSON.stringify(s.j).slice(0, 300);
/* رفضُ النطاق: «dept» من الحكم · أو «read-reference-denied» من بوابة القراءة قبل الكتابة في المسار التشغيليّ (019r) — وكلاهما بلا كتابة */
const SCOPE_NO = ['dept', 'read-reference-denied'];
let EMPN = 0;
const addEmp = (W, ck, d, tag) => { const L = stored(W.env, E(d)) || []; return save(W, ck, { [E(d)]: L.concat([{ eid: 'tst_e_x_' + tag, name: TAG + ' · ' + tag, empno: String(79000 + (++EMPN)) }]) }); };
const custody = (W, ck, uid, d) => W.C.api('/api/custody?' + new URLSearchParams({ dept: d, uid }), { cookie: ck });

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';

  test(M + 'F01 (1) إنشاءُ قسم: مدير النظام ومديرُ الإدارة الأم (مع بذر سقفه) — والشكلُ المخالف ومن لا يدير الإدارة مرفوضون', async () => {
    const { W, S } = await setup(mode);
    const L0 = stored(W.env, KD);
    /* مدير النظام: قسمٌ تحت إدارة ✓ · قسمٌ تحت عقدة ✗ · قسمٌ تحت قسم ✗ · قسمٌ بلا أب ✗ */
    let r = await save(W, S.super, { [KD]: L0.concat([{ id: 'tst_s9', name: TAG + ' · قسم المدير', gid: 'tst_d2', kind: 'قسم' }]) });
    assert.ok(ok(r, KD), 'مدير النظام يُنشئ قسماً تحت إدارة: ' + show(r));
    for (const [gid, label] of [['tst_g1', 'تحت عقدة'], [S1, 'تحت قسم'], ['', 'بلا أب']]) {
      const L = stored(W.env, KD);
      r = await save(W, S.super, { [KD]: L.concat([{ id: 'tst_sbad', name: TAG + ' · ' + label, gid, kind: 'قسم' }]) });
      assert.equal(why(r, KD), 'dept-shape', 'قسمٌ ' + label + ': ' + show(r));
    }
    /* مديرُ الإدارة الأم: قسمٌ تحت إدارته مع سقفه (لقطةٌ من سقف إدارته) في حفظةٍ واحدة */
    const L1 = stored(W.env, KD), pj = await get(W, S.dm1, [KP]), P1 = val(pj, KP);
    P1.caps = P1.caps || {}; P1.caps.tst_s8 = (P1.caps.tst_d1 || []).slice(0, 3);
    r = await save(W, S.dm1, { [KD]: L1.concat([{ id: 'tst_s8', name: TAG + ' · قسم مدير الإدارة', gid: 'tst_d1', kind: 'قسم' }]), [KP]: P1 });
    assert.ok(ok(r, KD) && ok(r, KP), 'مديرُ الإدارة يُنشئ قسماً تحت إدارته ببذر سقفه: ' + show(r));
    assert.ok(stored(W.env, KD).some((d) => d.id === 'tst_s8' && d.gid === 'tst_d1' && d.kind === 'قسم'));
    assert.deepEqual(stored(W.env, KP).caps.tst_s8, P1.caps.tst_s8);
    /* …ويكتب في قسمه الجديد */
    r = await save(W, S.dm1, { [E('tst_s8')]: [{ eid: 'tst_e_s8', name: TAG + ' · أول موظف', empno: '78001' }] });
    assert.ok(ok(r, E('tst_s8')), 'مديرُ الإدارة يكتب في قسمه الجديد: ' + show(r));
    /* وما سوى ذلك مرفوض: قسمٌ تحت إدارةٍ أخرى · إدارةٌ جديدة · حذفُ وحدة · سقفٌ أوسع من سقف إدارته · ومديرُ القسم لا يُنشئ قسماً */
    const L2 = stored(W.env, KD);
    r = await save(W, S.dm1, { [KD]: L2.concat([{ id: 'tst_s7', name: TAG + ' · دخيل', gid: 'tst_d2', kind: 'قسم' }]) });
    assert.ok(!ok(r, KD), 'قسمٌ تحت إدارةٍ لا يديرها مرفوض: ' + show(r));
    r = await save(W, S.dm1, { [KD]: L2.concat([{ id: 'tst_d9', name: TAG + ' · إدارة', gid: 'tst_g1' }]) });
    assert.ok(!ok(r, KD), 'إدارةٌ جديدة لمدير النظام وحده: ' + show(r));
    r = await save(W, S.dm1, { [KD]: L2.filter((d) => d.id !== S2) });
    assert.ok(!ok(r, KD), 'حذفُ قسمٍ عبر السجلّ مرفوض (الحذفُ ذرّيٌّ في الخادم): ' + show(r));
    const P2 = val(await get(W, S.dm2, [KP]), KP); P2.caps.tst_s6 = ['seized'];   /* سقفُ tst_d2 بلا المضبوطات */
    r = await save(W, S.dm2, { [KD]: stored(W.env, KD).concat([{ id: 'tst_s6', name: TAG + ' · أوسع', gid: 'tst_d2', kind: 'قسم' }]), [KP]: P2 });
    assert.ok(!ok(r, KP), 'سقفٌ خارج سقف الإدارة الأم مرفوض: ' + show(r));
    assert.ok(!(stored(W.env, KP).caps || {}).tst_s6, 'لم يُكتب السقفُ الأوسع');
    r = await save(W, S.sm1, { [KD]: stored(W.env, KD).concat([{ id: 'tst_s5', name: TAG + ' · من مدير القسم', gid: 'tst_d1', kind: 'قسم' }]) });
    assert.ok(!ok(r, KD), 'مديرُ القسم لا يُنشئ قسماً: ' + show(r));
    assert.ok(!stored(W.env, KD).some((d) => ['tst_sbad', 'tst_s7', 'tst_d9', 'tst_s5'].includes(d.id)), 'لم يُكتب شيءٌ مرفوض');
    assert.ok(stored(W.env, KD).some((d) => d.id === S2), 'القسم ٢ باقٍ');
  });

  test(M + 'F01 (2) مديرُ القسم يدير قسمه وحده · ومديرُ الإدارة الأم يدير أقسامَه لا أقسامَ غيره', async () => {
    const { W, S } = await setup(mode);
    /* مديرُ القسم ١ */
    let j = await opRead(W, S.sm1, 'sm1', [E(S1), E(S2), E('tst_d1'), E(S3)]);
    assert.ok(has(j, E(S1)), 'مديرُ القسم يقرأ قسمه');
    for (const k of [E(S2), E('tst_d1'), E(S3)]) assert.ok(!has(j, k), 'مديرُ القسم لا يقرأ ' + k);
    let r = await addEmp(W, S.sm1, S1, 'sm1'); assert.ok(ok(r, E(S1)), 'مديرُ القسم يكتب في قسمه: ' + show(r));
    for (const d of [S2, 'tst_d1']) { r = await addEmp(W, S.sm1, d, 'sm1x' + d.slice(-1)); assert.ok(!ok(r, E(d)) && SCOPE_NO.includes(why(r, E(d))), 'مديرُ القسم لا يكتب في ' + d + ': ' + show(r)); }
    /* مديرُ الإدارة الأم: إدارتُه وقسماها — لا قسمُ الإدارة الأخرى */
    j = await opRead(W, S.dm1, 'dm1', [E(S1), E(S2), E('tst_d1'), E(S3)]);
    for (const k of [E(S1), E(S2), E('tst_d1')]) assert.ok(has(j, k), 'مديرُ الإدارة يقرأ ' + k);
    assert.ok(!has(j, E(S3)), 'مديرُ الإدارة لا يقرأ قسمَ إدارةٍ أخرى');
    for (const d of [S1, S2]) { r = await addEmp(W, S.dm1, d, 'dm1' + d.slice(-1)); assert.ok(ok(r, E(d)), 'مديرُ الإدارة يكتب في قسمه ' + d + ': ' + show(r)); }
    r = await addEmp(W, S.dm1, S3, 'dm1x'); assert.ok(!ok(r, E(S3)) && SCOPE_NO.includes(why(r, E(S3))), 'ولا يكتب في قسم إدارةٍ أخرى: ' + show(r));
    /* مديرُ الإدارة الأخرى يصل قسمَها هو */
    j = await opRead(W, S.dm2, 'dm2', [E(S3), E(S1)]);
    assert.ok(has(j, E(S3)) && !has(j, E(S1)), 'مديرُ الإدارة ٢ يقرأ قسمه ٣ لا القسم ١');
    /* ورقةُ موظف القسم: يكتبها مديرُ القسم ومديرُ الإدارة الأم — لا مديرُ الإدارة الأخرى */
    for (const [who, good] of [['sm1', true], ['dm1', true], ['dm2', false]]) {
      const P = val(await get(W, S[who], [KP]), KP); P.emps = P.emps || {}; P.emps[S1] = Object.assign({}, P.emps[S1] || {}, { tst_e_se1: { 'emps/data': ['view'], help: ['view'] } });
      r = await save(W, S[who], { [KP]: P });
      assert.equal(ok(r, KP), good, who + ' ورقةُ موظف القسم: ' + show(r));
      if (good) { const P0 = stored(W.env, KP); delete P0.emps[S1].tst_e_se1.help; putKV(W.env, KP, P0); }
    }
  });

  test(M + 'F01 (3) العزل: الأقسامُ الشقيقة · القسمُ والإدارات الأخرى · موظفو الإدارة الأم — kv والعهدة العلائقية', async () => {
    const { W, S } = await setup(mode);
    /* موظفُ القسم وموظفُ الإدارة الأم ومديرُ القسم الشقيق */
    for (const [who, own, foreign] of [['se1', S1, [S2, 'tst_d1', S3]], ['sup1', 'tst_d1', [S1, S2]], ['sm2', S2, [S1, 'tst_d1']]]) {
      const j = await opRead(W, S[who], who, foreign.map(E));
      for (const d of foreign) assert.ok(!has(j, E(d)), who + ' لا يقرأ ' + d);
      for (const d of foreign) { const r = await addEmp(W, S[who], d, who + d.slice(-1)); assert.ok(!ok(r, E(d)), who + ' لا يكتب في ' + d + ': ' + show(r)); }
      const c = await custody(W, S[who], 'tst_' + who, foreign[0]);
      assert.equal(c.status, 403, who + ' لا يقرأ عهدةَ ' + foreign[0] + ': ' + JSON.stringify(c.j).slice(0, 200));
      void own;
    }
    /* العهدة العلائقية: مديرُ القسم ومديرُ الإدارة الأم يقرآنها · ومديرُ الإدارة الأخرى لا */
    for (const [who, uid, st] of [['sm1', 'tst_sm1', 200], ['dm1', 'tst_dm1', 200], ['dm2', 'tst_dm2', 403], ['sm2', 'tst_sm2', 403]]) {
      const c = await custody(W, S[who], uid, S1);
      assert.equal(c.status, st, who + ' عهدةُ القسم ١: ' + JSON.stringify(c.j).slice(0, 200));
    }
    /* حساباتُ القسم: لا تصل موظفي الإدارة الأم ولا القسمَ الشقيق — وتصل مديرَ الإدارة الأم */
    for (const [who, sees] of [['sup1', false], ['sm2', false], ['dm1', true]]) {
      const j = await get(W, S[who], [K]); const L = val(j, K);
      assert.equal(L.some((u) => u.id === 'tst_se1'), sees, who + ' يرى حسابَ موظف القسم ١: ' + sees);
    }
  });

  test(M + 'F01 (4) تصادمُ المعرّفات: وحدةٌ بمعرّف عقدة · وعقدةٌ بمعرّف وحدة — مرفوضتان', async () => {
    const { W, S } = await setup(mode);
    let r = await save(W, S.super, { [KD]: stored(W.env, KD).concat([{ id: 'tst_g1', name: TAG + ' · إدارة بمعرّف عقدة' }]) });
    assert.equal(why(r, KD), 'id-clash', 'وحدةٌ بمعرّف عقدة: ' + show(r));
    r = await save(W, S.super, { [KG]: stored(W.env, KG).concat([{ id: 'tst_d2', name: TAG + ' · عقدة بمعرّف إدارة', kind: 'إدارة عامة' }]) });
    assert.equal(why(r, KG), 'id-clash', 'عقدةٌ بمعرّف إدارة: ' + show(r));
    r = await save(W, S.super, { [KG]: stored(W.env, KG).concat([{ id: 'tst_nX', name: TAG + ' · عقدة تحت قسم', kind: 'إدارة عامة', pid: S1 }]) });
    assert.equal(why(r, KG), 'dept-shape', 'عقدةٌ تحت قسم: ' + show(r));
    assert.ok(!stored(W.env, KD).some((d) => d.id === 'tst_g1') && !stored(W.env, KG).some((n) => n.id === 'tst_d2' || n.id === 'tst_nX'), 'لم يُكتب شيء');
  });

  test(M + 'F01 (5) العقدةُ الفوقية ليست وحدةَ بيانات: كتابةُ مدير النظام فيها · gm تالف · والعهدةُ العلائقية', async () => {
    const { W, S } = await setup(mode);
    let r = await save(W, S.super, { [E('tst_g1')]: [{ eid: 'tst_e_node', name: TAG + ' · في عقدة', empno: '77001' }] });
    assert.equal(why(r, E('tst_g1')), 'unit', 'مدير النظام لا يكتب بيانات وحدةٍ في عقدة: ' + show(r));
    const c = await W.C.api('/api/custody/act', { method: 'POST', cookie: S.super, body: { uid: W.su.j.uid, dept: 'tst_g1', base: 0, requestId: 'TEST_ONLY_f01_node_custody', op: 'type-create', item: { name: TAG + ' radio', qty: 1, prefix: 'RD', color: '#123456' } } });
    assert.notEqual(c.status, 200, 'عهدةٌ علائقيةٌ بمعرّف عقدة مرفوضة: ' + JSON.stringify(c.j).slice(0, 200));
    assert.equal(W.env.DB.q("SELECT COUNT(*) n FROM custody_items WHERE department_id = 'tst_g1'")[0].n, 0, 'لا صفَّ عهدة على العقدة');
    /* gm تالف (gid = معرّفُ إدارة) لا يصل الإدارةَ ولا قسمَها — ومديرُ العقدة الحقيقيّ يصل القسمَ عبر إدارته */
    const jx = await opRead(W, S.gmX, 'gmX', [E('tst_d1'), E(S1)]);
    assert.ok(!has(jx, E('tst_d1')) && !has(jx, E(S1)), 'gm تالف بلا شيء');
    r = await addEmp(W, S.gmX, S1, 'gmx'); assert.ok(!ok(r, E(S1)), 'gm تالف لا يكتب في القسم: ' + show(r));
    const jg = await opRead(W, S.gm, 'gm', [E(S1), E(S3)]);
    assert.ok(has(jg, E(S1)) && has(jg, E(S3)), 'مديرُ العقدة يصل أقسامَ إداراته');
  });

  test(M + 'F01 (6) حذفُ القسم ذرّيٌّ في الخادم بلا يتيم · وحذفُ إدارةٍ لها أقسام يُرفض صراحةً', async () => {
    const { W, S } = await setup(mode);
    const api = (p, body) => W.C.api(p, body ? { method: 'POST', cookie: S.super, body } : { cookie: S.super });
    /* إدارةٌ لها أقسام: الجردُ يسمّيها والحذفُ يُرفض بلا كتابة */
    const inv1 = await api('/api/admin/dept-delete?dept=tst_d1');
    assert.equal(inv1.status, 200, JSON.stringify(inv1.j).slice(0, 200));
    assert.deepEqual(inv1.j.sections.map((x) => x.id).sort(), [S1, S2], 'الجردُ يسمّي أقسامَ الإدارة');
    const r1 = await api('/api/admin/dept-delete', { uid: W.su.j.uid, dept: 'tst_d1', requestId: 'TEST_ONLY_f01_del_parent', base: inv1.j.base, reason: TAG + ' سبب' });
    assert.equal(r1.status, 409, JSON.stringify(r1.j).slice(0, 200)); assert.equal(r1.j.err, 'dept-has-sections');
    assert.ok(stored(W.env, KD).some((d) => d.id === 'tst_d1'), 'الإدارةُ باقية');
    /* القسم: حذفٌ ذرّيٌّ يزيل سجلَّه وحساباتِه ومفاتيحَه وسجلَّ صلاحياته كلَّه */
    const P0 = stored(W.env, KP); P0.capOwn = Object.assign({}, P0.capOwn || {}, { [S1]: true }); P0.subs = Object.assign({}, P0.subs || {}, { [S1]: {} });
    P0.lenses = Object.assign({}, P0.lenses || {}, { [S1]: [] }); P0.empLens = Object.assign({}, P0.empLens || {}, { [S1]: { tst_e_se1: [] } }); P0.tplOf = Object.assign({}, P0.tplOf || {}, { [S1]: { tst_e_se1: 'tpl1' } });
    putKV(W.env, KP, P0);
    const inv = await api('/api/admin/dept-delete?dept=' + S1);
    assert.equal(inv.status, 200); assert.equal(inv.j.department.kind, 'قسم'); assert.deepEqual(inv.j.sections, []);
    const r = await api('/api/admin/dept-delete', { uid: W.su.j.uid, dept: S1, requestId: 'TEST_ONLY_f01_del_s1', base: inv.j.base, reason: TAG + ' سبب حذف القسم' });
    assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 300));
    assert.ok(!stored(W.env, KD).some((d) => d.id === S1), 'سجلُّ القسم');
    assert.ok(!stored(W.env, K).some((u) => u.deptId === S1), 'حساباتُ القسم');
    assert.equal(W.env.DB.q('SELECT COUNT(*) n FROM kv WHERE k LIKE ?', 'bsdept:' + S1 + ':%')[0].n, 0, 'مفاتيحُ القسم');
    const P = stored(W.env, KP);
    for (const f of ['caps', 'capOwn', 'subs', 'lenses', 'emps', 'empLens', 'tplOf']) assert.ok(!(P[f] && Object.prototype.hasOwnProperty.call(P[f], S1)), 'سجلُّ الصلاحيات: ' + f);
    assert.ok(P.caps.tst_d1 && P.caps[S2], 'سقوفُ الوحدات الأخرى باقية');
    assert.ok(stored(W.env, KD).some((d) => d.id === S2) && stored(W.env, K).some((u) => u.id === 'tst_sm2'), 'القسمُ الشقيق باقٍ بحسابه');
  });

  test(M + 'F01 (7) الخصوصيةُ والسقفُ لكلّ قسم: سجلُّ الصلاحيات المُسقَط · وسقفُ القسم المستقلّ', async () => {
    const { W, S } = await setup(mode);
    /* سجلُّ الصلاحيات المُسقَط: سقفُ القسم وأوراقُه لمديره ولمدير الإدارة الأم — لا لموظف الإدارة الأم ولا للقسم الشقيق */
    for (const [who, sees] of [['sm1', true], ['dm1', true], ['sup1', false], ['sm2', false], ['dm2', false]]) {
      const P = val(await get(W, S[who], [KP]), KP);
      assert.equal(!!(P.caps && P.caps[S1]), sees, who + ' يرى سقفَ القسم ١');
      assert.equal(!!(P.emps && P.emps[S1] && P.emps[S1].tst_e_se1), sees, who + ' يرى ورقةَ موظف القسم ١');
    }
    /* سقفُ القسم: مستقلٌّ في وضع capOwn — تضييقُ سقف العقدة فوق الإدارة يحكم القسمَ بلا capOwn (السلسلةُ تمرّ بالإدارة) ولا يحكمه به */
    const P = stored(W.env, KP); P.caps.tst_g1 = (P.caps.tst_d1 || []).filter((x) => x !== 'emps'); putKV(W.env, KP, P);
    let r = await addEmp(W, S.sm1, S1, 'cap1');
    assert.ok(!ok(r, E(S1)), 'بلا سقفٍ مستقلّ: صفحةٌ خارج سقف العقدة فوق الإدارة لا تُكتب في القسم: ' + show(r));
    const P2 = stored(W.env, KP); P2.capOwn = Object.assign({}, P2.capOwn || {}, { [S1]: true }); putKV(W.env, KP, P2);
    r = await addEmp(W, S.sm1, S1, 'cap2');
    assert.ok(ok(r, E(S1)), 'سقفُ القسم المستقلّ يحكمه وحده: ' + show(r));
  });
}
