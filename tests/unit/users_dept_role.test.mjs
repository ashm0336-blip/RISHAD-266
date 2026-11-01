/* التنظيف L-05 (أ) — منقولٌ من الخطّ القديم (5197c2e · tests/unit/users_dept_role.test.mjs) ومكيَّفٌ لعُدّة هذا المستودع (tasks_fx).
   حسابُ «الإدارة» (role dept) أُلغي: لا يُنشئه أحدٌ ولو مدير النظام، ولا يُغيَّر إليه حسابٌ، ولا يُعدَّل القائمُ منه — بالوضعين
   (018 usersA1Why · قاعدةُ الحسابات في legacy ولمدير النظام 044 وenforce 059). والقائمةُ التي تحمل صفّاً قديماً به كما خُزِّن تُحفظ،
   وحذفُه مقبول — الصفوفُ القائمة يحذفها المالك. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { applySql } from './harness.mjs';
const { world, stored } = await import('./tasks_fx.mjs');

const KU = 'bassam_auth_users_v1';
const q = (x) => "'" + String(x).replace(/'/g, "''") + "'";
const PH = (pw, tag) => { const salt = crypto.createHash('sha256').update('f19|' + tag).digest().subarray(0, 16); return 'p2$100000$' + salt.toString('hex') + '$' + crypto.pbkdf2Sync(pw, salt, 100000, 32, 'sha256').toString('hex'); };
async function put(w, ck, list) {
  const g = await w.C.api('/api/get?keys=' + KU, { cookie: ck });
  const body = { set: { [KU]: JSON.stringify(list) }, del: [], base: { [KU]: ((g.j.keys || {})[KU] || {}).rev || 0 } };
  if (g.j.uscope !== undefined) body.uscope = g.j.uscope;
  const r = await w.C.api('/api/save', { method: 'POST', cookie: ck, body });
  const d = (r.j.denied || {})[KU] || (r.j.conflicts || {})[KU] || null;
  return { ok: !!(r.j.revs && r.j.revs[KU]), why: d ? (d.why || 'conflict') : '', show: d ? JSON.stringify(Object.assign({}, d, { cur: undefined })).slice(0, 200) : 'OK' };
}
const listOf = async (w, ck) => JSON.parse((await w.C.api('/api/get?keys=' + KU, { cookie: ck })).j.keys[KU].v);
const dep = (id, un) => ({ id, un, ph: PH('583914', id), name: 'TEST_ONLY · حساب إدارة', role: 'dept', deptId: 'tst_d1', dis: 0, test: 'TEST_ONLY' });

for (const mode of ['legacy', 'enforce']) {
  test('[' + mode + '] F19 · حسابُ «الإدارة» (dept) لا يُنشأ ولا يُغيَّر إليه ولا يُعدَّل — لأحدٍ ولو مدير النظام · والقائمُ كما خُزِّن يُحفظ ويُحذف', async () => {
    const w = await world({ mode }), su = w.su.ck;
    let r = await put(w, su, (await listOf(w, su)).concat([dep('x_dep1', '1888888891')]));
    assert.ok(!r.ok, 'مديرُ النظام يُنشئ حسابَ إدارة — قُبل'); assert.equal(r.why, 'shape', r.show);
    const L = await listOf(w, su); L.find((x) => x.id === 'tst_snop').role = 'dept';
    r = await put(w, su, L); assert.ok(!r.ok, 'مديرُ النظام يحوّل حساباً إلى dept — قُبل'); assert.equal(r.why, 'shape', r.show);
    const dm = (await w.login('0000000101', '70101')).ck;
    r = await put(w, dm, (await listOf(w, dm)).concat([dep('x_dep2', '1888888892')]));
    assert.ok(!r.ok, 'مديرُ الإدارة يُنشئ حسابَ إدارة — قُبل');
    assert.deepEqual((stored(w.env, KU) || []).filter((x) => x.role === 'dept').map((x) => x.id), [], 'لم يُخزَّن حسابُ إدارة');
    assert.ok(!(await w.C.login('1888888891', '583914')).ok, 'ولا يدخل به أحد');
    /* صفٌّ قديمٌ في البيانات كما تركته إصداراتٌ سابقة (يُزرع في القاعدة مباشرةً) */
    const cur = (stored(w.env, KU) || []).concat([dep('x_old', '1888888893')]);
    await applySql(w.env.DB, ['DELETE FROM kv WHERE k = ' + q(KU) + ';', 'INSERT INTO kv (k, seq, v) VALUES (' + q(KU) + ', 0, ' + q(JSON.stringify(cur)) + ');'].join('\n'));
    r = await put(w, su, (await listOf(w, su)).map((u) => (u.id === 'x_old' ? { ...u, name: 'TEST_ONLY · اسمٌ آخر' } : u)));
    assert.ok(!r.ok, 'تعديلُ صفّ dept قائم — قُبل'); assert.equal(r.why, 'shape', r.show);
    r = await put(w, su, (await listOf(w, su)).map((u) => (u.id === 'tst_snop' ? { ...u, name: 'TEST_ONLY · اسمٌ جديد' } : u)));
    assert.ok(r.ok, 'القائمةُ بالصفّ القديم كما هو تُحفظ: ' + r.show);
    r = await put(w, su, (await listOf(w, su)).filter((u) => u.id !== 'x_old'));
    assert.ok(r.ok, 'وحذفُ الصفّ القديم مقبول: ' + r.show);
    assert.ok(!(stored(w.env, KU) || []).some((x) => x.role === 'dept'), 'حُذف');
  });
}
