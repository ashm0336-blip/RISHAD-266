/* KIVO_263 · SOT-098 — النطاقُ في القراءة يقرّره الخادمُ وحده (061-enf-read) والواجهةُ تعرض ما يصلها — على العامل الحقيقي في الإنفاذ:
   (أ) الخطةُ «سياقُ رسم»: كلُّ الطوابق والعناصر تصل كلَّ دور (لا يُحجب طابقٌ ولا عنصر — v24.9) لكن العدسةَ المطفأة تُحجب بعناصرها (المصليات لـ«بلا عدسة»)
   (ب) جولةُ اليوم: حالةُ العناصر خارج نطاق Site للموظف تُسقَط ('?') وتبقى داخلَه — راصدُ الميدان (Site = f:tsts1) يرى حالة tsts1 لا tsts2
   (ج) مديرُ الإدارة (سقفُ الإدارة = الموقعان) يرى الحالتين
   (د) الإقلاعُ (/) يحمل القيمةَ المُسقَطة نفسَها — لا نسخةَ غيرَ مُسقَطة في الصفحة يرشّحها منطقُ الواجهة */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PYTHON, makeTestEnv, client, applySql, ROOT, since, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
function seed() {
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date(Date.now() - 3 * 3600 * 1000)).forEach(p => { o[p.type] = +p.value; });
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_fx_sp_')); execFileSync(PYTHON, [ROOT + '/tests/fixtures/gen_fixture.py', '--today', o.year + '-' + o.month + '-' + o.day, '--out', out], { stdio: 'pipe' });
  return fs.readFileSync(out + '/test_seed.sql', 'utf8');
}
const PL = 'bsdept:tst_d1:bassam_plan_v1', RD = 'bsdept:tst_d1:bassam_rounds_v1';
test('النطاقُ في القراءة من الخادم وحده (الإنفاذ)', since(162), async () => {
  const env = makeTestEnv({ KIVO_AUTHZ_MODE: 'enforce' }); const C = client(env);
  assert.ok((await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN)).ok);
  await applySql(env.DB, seed());
  env.DB.exec("INSERT INTO meta (k, v) VALUES ('authz_mode', 'enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const as = async (un, pw) => { const s = await C.login(un, pw); assert.ok(s.ok, un); return s.ck; };
  const read = async (ck, k) => { const r = await C.api('/api/get?keys=' + encodeURIComponent(k), { cookie: ck }); const it = (r.j.keys || {})[k]; return it && it.v ? JSON.parse(it.v) : null; };
  const fld = await as('0000000118', '70118'), loff = await as('0000000115', '70115'), dm = await as('0000000101', '70101');
  /* (أ) */
  const pf = await read(fld, PL), po = await read(loff, PL);
  assert.deepEqual(pf.floors.map(f => f.sid), ['tsts1', 'tsts2'], 'الطابقان يصلان راصدَ الميدان (سياقُ رسم)');
  assert.ok(pf.floors.every(f => f.zones.length === 2), 'المصلياتُ تصل من عدستُه مفعّلة');
  assert.ok(po.floors.every(f => f.zones.length === 0 && f.gates.length === 1), 'عدسةُ المصليات المطفأة ⇒ لا مصليات (والأبوابُ باقية)');
  /* (ب) (ج) */
  const day = (r) => r[Object.keys(r)[0]];
  const rf = day(await read(fld, RD)), rm = day(await read(dm, RD));
  const st = (r, sid) => r.d.find(f => f.sid === sid).zones[0].fst;
  assert.equal(st(rm, 'tsts1'), 'open'); assert.equal(st(rm, 'tsts2'), 'open', 'مديرُ الإدارة يرى حالة الموقعين');
  assert.equal(st(rf, 'tsts1'), 'open', 'راصدُ الميدان يرى حالة موقعه');
  assert.notEqual(st(rf, 'tsts2'), 'open', 'وحالةُ الموقع خارج نطاقه أُسقطت في الخادم: ' + st(rf, 'tsts2'));
  /* (د) الإقلاع */
  const bt = await C.boot(fld); assert.ok(bt && bt.boot && bt.boot.keys, 'الإقلاعُ محقون');
  const raw = bt.boot.keys[RD]; assert.equal(typeof raw, 'string', 'جولةُ اليوم في الإقلاع');
  const bd = day(JSON.parse(raw)); assert.equal(st(bd, 'tsts1'), 'open'); assert.notEqual(st(bd, 'tsts2'), 'open', 'الإقلاعُ يحمل القيمةَ المُسقَطة نفسَها');
});
