/* KIVO_263 · SOT-101 — قواعدُ شكل الطلب مكتوبةٌ مرةً (src/schemas/api/bodies.schema.json) ويفرضها الخادم قبل أيّ كتابة:
   (أ) نسخةُ الخادم (051b-body-schemas.js) = المخطّط حرفاً · والمخطّطُ JSON Schema صالح
   (ب) /api/save: قيمةٌ غيرُ نصية في set ⇒ 400 bad-body at:set.<k> ولا يُكتب شيء (كانت تُخزَّن «[object Object]») · base سالب ⇒ 400 · del غيرُ نصّي ⇒ 400 · السليم يمرّ
   (ج) الدخول/الاستعادة/فحصُ الكلمة/إنهاءُ الجلسات: الأنواعُ الخاطئة ⇒ 400 · الجسمُ null ⇒ 400 (كان 500) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeLegacyTestEnv as makeEnv, client, ROOT, since } from './harness.mjs';
const SCH = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/schemas/api/bodies.schema.json'), 'utf8'));
const sortKeys = (v) => Array.isArray(v) ? v.map(sortKeys) : (v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sortKeys(v[k])])) : v);
test('(أ) نسخةُ الخادم = المخطّط حرفاً', since(163), () => {
  const p = fs.readFileSync(path.join(ROOT, 'workers/parts/051b-body-schemas.js'), 'utf8');
  const m = /var KIVO_BODY_SCHEMAS = (\{.*\});\n/.exec(p); assert.ok(m, 'المتغيّر موجود');
  assert.deepEqual(JSON.parse(m[1]), sortKeys(SCH.bodies));
  assert.equal(SCH.$schema, 'https://json-schema.org/draft/2020-12/schema');
});
test('(ب) /api/save يرفض الشكلَ الخاطئ قبل الكتابة', since(163), async () => {
  const env = makeEnv(); const C = client(env); const su = await C.login('admin', 'admin'); assert.ok(su.ok);
  const K = 'bassam_platform_v1';
  const g0 = await C.api('/api/get?keys=' + K, { cookie: su.ck }); const v0 = ((g0.j.keys || {})[K] || {}).v ?? null;
  for (const [body, at] of [[{ set: { [K]: { a: 1 } }, del: [], base: {} }, 'set.' + K], [{ set: { [K]: null }, base: {} }, 'set.' + K], [{ set: {}, del: [5] }, 'del[0]'],
                            [{ set: { [K]: '{}' }, base: { [K]: -1 } }, 'base.' + K], [{ set: [] }, 'set'], [null, '$']]) {
    const r = await C.api('/api/save', { method: 'POST', cookie: su.ck, body });
    assert.equal(r.status, 400, JSON.stringify(body)); assert.equal(r.j.err, 'bad-body'); assert.equal(r.j.at, at);
  }
  const g1 = await C.api('/api/get?keys=' + K, { cookie: su.ck }); assert.equal(((g1.j.keys || {})[K] || {}).v ?? null, v0, 'لم يُكتب شيء');
  const ok = await C.api('/api/save', { method: 'POST', cookie: su.ck, body: { set: { bassam_notif_cfg_v1: '{"x":1}' }, del: [], base: { bassam_notif_cfg_v1: 0 }, aud: [], ops: null } });
  assert.equal(ok.status, 200); assert.equal(ok.j.ok, 1);
});
test('(ج) الدخولُ والاستعادةُ وفحصُ الكلمة وإنهاءُ الجلسات', since(163), async () => {
  const env = makeEnv(); const C = client(env); const su = await C.login('admin', 'admin'); assert.ok(su.ok);
  const cases = [['/api/login', { u: 123, p: 'x' }, 'u', null], ['/api/login', null, '$', null], ['/api/recover', { key: ['a'], pw: '1' }, 'key', null],
                 ['/api/checkpw', { p: { x: 1 } }, 'p', su.ck], ['/api/sess/kill', { uid: 7 }, 'uid', su.ck]];
  for (const [p, body, at, ck] of cases) { const r = await C.api(p, { method: 'POST', body, cookie: ck || undefined }); assert.equal(r.status, 400, p + ' ' + JSON.stringify(body)); assert.equal(r.j.err, 'bad-body'); assert.equal(r.j.at, at); }
  assert.equal((await C.api('/api/checkpw', { method: 'POST', cookie: su.ck, body: { p: 'admin' } })).j.ok, 1, 'السليمُ يمرّ');
});
