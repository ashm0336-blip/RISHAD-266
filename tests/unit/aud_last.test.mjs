/* KIVO_259 — «مَن سبقك» في التعارض و«آخرُ نشاط» في الحضور من السجلّ الموحّد aud (كشفه التقييمُ المستقل · SOT-168): كان الخادمُ يقرؤهما من
   جدول audit الذي لم يعد يُكتب منذ R169-CC (السجلُّ الموحّد aud) — فبقي اسمُ السابق فارغاً في رسالة التعارض و«آخرُ نشاط» فارغاً دائماً. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv, client, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';

const K = 'bsdept:dA:bassam_options_v1';
async function setup() {
  const env = makeTestEnv(); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  const g0 = await C.api('/api/get?keys=bassam_depts_v1', { cookie: su.ck });
  const s1 = await C.api('/api/save', { method: 'POST', cookie: su.ck, body: { set: { bassam_depts_v1: JSON.stringify([{ id: 'dA', name: 'إدارة', gid: '' }]) }, del: [], base: { bassam_depts_v1: (g0.j.keys.bassam_depts_v1 || {}).rev || 0 } } });
  assert.equal(s1.j.ok, 1);
  return { env, C, ck: su.ck };
}
const getRev = async (C, ck, k) => { const r = await C.api('/api/get?keys=' + encodeURIComponent(k), { cookie: ck }); const it = (r.j.keys || {})[k] || {}; return { v: it.v, rev: it.rev || 0 }; };

test('التعارض: «مَن سبقك» يحمل اسمَ آخر كاتبٍ للمفتاح ووقتَه من aud — وself حين يكون الحسابَ نفسَه من جهازٍ آخر', async () => {
  const { C, ck } = await setup();
  const s0 = await C.api('/api/save', { method: 'POST', cookie: ck, body: { set: { [K]: JSON.stringify({ n: 1 }) }, del: [], base: { [K]: 0 } } }); assert.equal(s0.j.ok, 1);
  const g = await getRev(C, ck, K);
  const s1 = await C.api('/api/save', { method: 'POST', cookie: ck, body: { set: { [K]: JSON.stringify({ n: 2 }) }, del: [], base: { [K]: g.rev } } }); assert.ok(s1.j.revs[K]);
  /* حفظٌ بنسخةٍ متجاوَزة (g.rev) ⇒ تعارضٌ: السابقُ هو مدير النظام نفسُه (جهازٌ آخر) */
  const s2 = await C.api('/api/save', { method: 'POST', cookie: ck, body: { set: { [K]: JSON.stringify({ n: 3 }) }, del: [], base: { [K]: g.rev } } });
  const c = (s2.j.conflicts || {})[K];
  assert.ok(c, 'تعارض: ' + JSON.stringify(s2.j).slice(0, 200));
  assert.ok(c.at > 0, 'وقتُ السابق من aud: ' + JSON.stringify(c).slice(0, 200));
  assert.equal(c.self, true, 'الحسابُ نفسُه من جهازٍ آخر ⇒ self');
  assert.ok(c.by && c.by.length > 0, 'اسمُ السابق غيرُ فارغ: ' + JSON.stringify(c).slice(0, 200));
});

test('الحضور: «آخرُ نشاط» لكل حساب (المفتاحُ والفعلُ والوقت) من aud في آخر 24 ساعة', async () => {
  const { C, ck } = await setup();
  await C.api('/api/save', { method: 'POST', cookie: ck, body: { set: { [K]: JSON.stringify({ n: 9 }) }, del: [], base: { [K]: 0 } } });
  const p = await C.api('/api/presence', { cookie: ck });
  assert.equal(p.j.ok, 1, JSON.stringify(p.j).slice(0, 200));
  const me = (p.j.list || []).find(x => x.u && (x.u.id === 'su'));
  assert.ok(me, 'مدير النظام في الحضور');
  assert.ok(me.last && me.last.t > 0 && me.last.k && (me.last.act === 'set' || me.last.act === 'del'), 'آخرُ نشاطه: ' + JSON.stringify(me.last));
});
