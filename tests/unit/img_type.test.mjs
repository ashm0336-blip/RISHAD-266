/* KIVO_261 · SOT-068 — سياسةُ الصور في الخادم: الحدودُ قائمة (512KB للطلب · 24MB للمجمَّع · 64 جزءاً · ربعُ سقف الحفظ) والآن النوعُ أيضاً:
   ما ليس data:image/… يُرفض 415 قبل أيّ كتابة — طلباً واحداً أو مقطَّعاً (الجزءُ الأوّل يحمل الترويسة، والمجمَّعُ يُفحص قبل الكتابة) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv, makeEnv, TEST_SUPER_USERNAME, TEST_SUPER_PIN, client } from './harness.mjs';
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
test('/api/img: data:image/… يُقبل · HTML ونصٌّ حرّ وdata:text وdata:application تُرفض 415 بلا أثر — طلباً واحداً ومقطَّعاً', async () => {
  const env = makeTestEnv({}); const C = client(env);
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok);
  const put = (k, body, q = '') => C.api('/api/img/' + k + q, { method: 'PUT', cookie: su.ck, headers: { 'content-type': 'text/plain; charset=utf-8' }, body });
  const has = (k) => env.DB.q("SELECT COUNT(*) AS n FROM imgs WHERE k = ?1 OR k LIKE ?2", k, '~stg~' + k + '~%')[0].n;
  for (const [nm, v] of [['png', PNG], ['jpeg', 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='], ['webp', 'data:image/webp;base64,UklGRg=='], ['svg', 'data:image/svg+xml;base64,PHN2Zy8+']]) {
    const r = await put('im_ok_' + nm, v); assert.equal(r.status, 200, nm + ' يُقبل: ' + JSON.stringify(r.j)); assert.equal(has('im_ok_' + nm), 1);
  }
  for (const [nm, v] of [['html', '<script>alert(1)</script>'], ['svgraw', '<svg onload="alert(1)"></svg>'], ['text', 'hello world'], ['datatext', 'data:text/html;base64,PHNjcmlwdD4='],
                         ['dataapp', 'data:application/javascript;base64,YWxlcnQoMSk='], ['empty', ''], ['json', '{"a":1}'], ['spoof', ' data:image/png;base64,AAAA']]) {
    const r = await put('im_bad_' + nm, v);
    assert.equal(r.status, nm === 'empty' ? r.status : 415, nm + ' ⇒ ' + r.status);
    if (nm !== 'empty') { assert.equal(r.j.ok, 0); assert.ok(/نوعُ الملف غيرُ مدعوم/.test(r.j.err || '')); }
    assert.equal(has('im_bad_' + nm), 0, nm + ': لا أثرَ في imgs');
  }
  /* مقطَّعاً: الجزءُ الأوّل بلا ترويسة صورة ⇒ 415 ولا مرحَّلَ يبقى */
  const p0 = await put('im_parts_bad', 'AAAA'.repeat(10), '?p=0&n=2'); assert.equal(p0.status, 415); assert.equal(has('im_parts_bad'), 0);
  /* ومقطَّعاً سليماً: يُجمَّع ويُكتب */
  const half = Math.ceil(PNG.length / 2);
  const q0 = await put('im_parts_ok', PNG.slice(0, half), '?p=0&n=2'); assert.equal(q0.status, 200);
  const q1 = await put('im_parts_ok', PNG.slice(half), '?p=1&n=2'); assert.equal(q1.status, 200); assert.equal(q1.j.n, PNG.length);
  const rd = await C.req('/api/img/im_parts_ok', { cookie: su.ck }); const body = await rd.text(); let v = body; try { const j = JSON.parse(body); v = j.v != null ? j.v : body; } catch (e) {}
  assert.equal(v, PNG, 'المجمَّعُ يُقرأ كما أُرسل (R2 أو D1)');
});
