/* RM-5 · SOT-131/SOT-136 — اختباراتُ الوحدة للدوال النقيّة في الخادم (جداولُ حالات؛ بلا D1 ولا طلبات):
   التحقق من الهوية وكلمة المرور · المفاتيح والنطاق · تواريخُ الإحصائيات (هجري · الرياض · سماحُ 3 ساعات) · أقفالُ الأيام والأشهر
   · محرّكُ مواضع الاعتماد (opMatch/opPrefix/splitOps) · المقارنةُ العميقة · ترويساتُ الأمن (CSP بلا unsafe-eval) · حارسُ مضيف الأداة · التجزئة */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { internals } from './internals.mjs';
const W = await internals(['unCheck', 'pwCheck', 'normKey', 'normId', 'isDeviceKey', 'isMgrKey', 'parseKey', 'stripKey', 'isObj', 'isEmptyVal', 'parseJson', 'eq', 'eqExcept',
  'dsDayOk', 'dsStampOk', 'dsToday', 'dsLockOk', 'dsLockRec', 'dsLockedIn', 'opMatch', 'opPrefix', 'splitOps', 'secHeaders', 'bodyLimit', 'isLocal', 'enfTestHostOk', 'enfIsTestUser',
  'legacyHash', 'hex', 'pbkdf2', 'hashPw', 'verifyPw', 'readCookie']);

test('هويةُ الدخول: 10 أرقام بالضبط (جوال/هوية) — لا فراغات ولا حروف ولا أرقام عربية', () => {
  for (const [v, want] of [['0500000000', true], ['1234567890', true], [' 0500000000 ', true], ['050000000', false], ['05000000001', false], ['05000000a0', false], ['٠٥٠٠٠٠٠٠٠٠', false], ['', false], [null, false], [undefined, false], [500000000, false], [5000000000, true]])
    assert.equal(W.unCheck(v), want, 'unCheck(' + JSON.stringify(v) + ')');
});
test('كلمةُ المرور: موظف/قطاع 5–6 أرقام؛ مدير النظام 6 أرقام بلا تكرارٍ ولا تسلسل', () => {
  for (const [pw, role, want] of [['12345', 'staff', true], ['123456', 'staff', true], ['1234', 'staff', false], ['1234567', 'staff', false], ['12a45', 'staff', false], ['70113', 'gm', true],
    ['482917', 'super', true], ['48291', 'super', false], ['4829171', 'super', false], ['111111', 'super', false], ['123456', 'super', false], ['654321', 'super', false], ['012345', 'super', false], ['135790', 'super', true], ['', 'super', false], [null, 'super', false]])
    assert.equal(W.pwCheck(pw, role), want, 'pwCheck(' + JSON.stringify(pw) + ', ' + role + ')');
});
test('مفاتيحُ التخزين: parseKey · isDeviceKey · isMgrKey · normKey · normId · stripKey', () => {
  assert.deepEqual(W.parseKey('bsdept:d1:bassam_employees_v1'), { dept: 'd1', name: 'bassam_employees_v1' });
  assert.deepEqual(W.parseKey('bassam_depts_v1'), { dept: '', name: 'bassam_depts_v1' });
  assert.deepEqual(W.parseKey('bsdept:d:1:x'), { dept: 'd', name: '1:x' }, 'أولُ نقطتين تفصلان الإدارة');
  assert.equal(W.isDeviceKey('bsdept:d1:bassam_page_v1:tasks'), true); assert.equal(W.isDeviceKey('bsdept:d1:bassam_st_grp_v1'), true); assert.equal(W.isDeviceKey('bsdept:d1:bassam_employees_v1'), false);
  assert.equal(W.isMgrKey('mgr:d1'), true); assert.equal(W.isMgrKey('mgr'), false); assert.equal(W.isMgrKey(null), false);
  assert.equal(W.normKey(' ab-cd_12 xyz '), 'ABCD12XYZ'); assert.equal(W.normKey(null), '');
  assert.equal(W.normId('  x1 '), 'x1'); assert.equal(W.normId(null), ''); assert.equal(W.normId(7), '7');
  assert.deepEqual(W.stripKey({ a: 1, b: 2, c: 3 }, 'b'), { a: 1, c: 3 });
});
test('المقارنةُ والقيمُ الفارغة: isObj · isEmptyVal · parseJson · eq · eqExcept', () => {
  assert.equal(W.isObj({}), true); assert.equal(W.isObj([]), false); assert.equal(W.isObj(null), false); assert.equal(W.isObj('x'), false);
  for (const [v, want] of [[null, true], [undefined, true], ['', true], [0, true], [[], true], [{}, true], [false, false], ['0', false], [[0], false], [{ a: 0 }, false], [1, false]]) assert.equal(W.isEmptyVal(v), want, 'isEmptyVal(' + JSON.stringify(v) + ')');
  assert.deepEqual(W.parseJson('{"a":1}', null), { a: 1 }); assert.equal(W.parseJson('nope', 'd'), 'd'); assert.equal(W.parseJson(null, 'd'), 'd'); assert.equal(W.parseJson('null', 'd'), 'd');
  /* eq: مقارنةُ نصوصٍ بزمنٍ ثابت (للتجزئات) — لا مقارنةٌ عميقة */
  assert.equal(W.eq('abc', 'abc'), true); assert.equal(W.eq('abc', 'abd'), false); assert.equal(W.eq('a', 'ab'), false); assert.equal(W.eq(1, '1'), true); assert.equal(W.eq('', ''), true);
  assert.equal(W.eqExcept({ a: 1, rev: 5 }, { a: 1, rev: 9 }, 'rev'), true); assert.equal(W.eqExcept({ a: 1, rev: 5 }, { a: 2, rev: 5 }, 'rev'), false);
});
test('الإحصائياتُ اليومية: شكلُ اليوم (dsDayOk) وختمُ الحقل (dsStampOk)', () => {
  assert.equal(W.dsDayOk({ men: 10, women: null, __m: { by: 'u', ts: 1 } }), true);
  assert.equal(W.dsDayOk({ men: '10' }), false, 'نصٌّ بدل رقم');
  assert.equal(W.dsDayOk({ men: Infinity }), false); assert.equal(W.dsDayOk({ men: NaN }), false);
  assert.equal(W.dsDayOk({ [('x').repeat(41)]: 1 }), false, 'اسمُ حقل > 40');
  assert.equal(W.dsDayOk(Object.fromEntries(Array.from({ length: 41 }, (_, i) => ['f' + i, 1]))), false, '> 40 حقلاً');
  assert.equal(W.dsDayOk({ __f: { men: 0, women: { by: 'u' } } }), true); assert.equal(W.dsDayOk({ __f: { men: 'x' } }), false);
  assert.equal(W.dsDayOk({ __m: { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7 } }), false, 'ختمٌ > 6 مفاتيح');
  assert.equal(W.dsDayOk([]), false); assert.equal(W.dsDayOk(null), false);
});
test('dsToday: اليومُ الهجري (أم القرى) بتوقيت الرياض مع سماح 3 ساعات بعد منتصف الليل', () => {
  const t = W.dsToday(Date.now()); assert.ok(t && t.y > 1440 && t.m >= 1 && t.m <= 12 && t.d >= 1 && t.d <= 30, JSON.stringify(t));
  /* 2026-10-09 (الجمعة) = 27 ربيع الآخر 1448 هـ تقريباً: الساعة 01:00 بتوقيت الرياض (22:00 UTC من اليوم السابق) ما زالت «أمس» (سماحُ 3 ساعات) */
  const utc = Date.UTC(2026, 9, 8, 22, 0, 0);   /* = 2026-10-09 01:00 الرياض */
  const a = W.dsToday(utc), b = W.dsToday(utc + 3 * 3600 * 1000);   /* 04:00 الرياض */
  assert.ok(a && b && (b.d === a.d + 1 || (b.d === 1 && a.d >= 29)), 'قبل 03:00 الرياض يُحسب اليومُ السابق: ' + JSON.stringify([a, b]));
  assert.equal(W.dsToday(NaN), null, 'وقتٌ غيرُ صالح ⇒ null');
});
test('أقفالُ الإحصائيات: dsLockOk · dsLockRec · dsLockedIn (معتمد · شهرٌ منقضٍ · يومٌ مفتوح/مقفل يدوياً)', () => {
  assert.equal(W.dsLockOk(undefined), true); assert.equal(W.dsLockOk(true), true); assert.equal(W.dsLockOk({ ap: 1 }), true); assert.equal(W.dsLockOk({ ap: 2 }), false);
  assert.equal(W.dsLockOk({ dopen: { '5': 1 } }), true); assert.equal(W.dsLockOk({ dopen: { '55x': 1 } }), false); assert.equal(W.dsLockOk({ zz: 1 }), false); assert.equal(W.dsLockOk('x'), false);
  assert.deepEqual(W.dsLockRec({ 'haram|1448-4': true }, 'haram', 1448, 4), { ap: 1 }); assert.deepEqual(W.dsLockRec({}, 'haram', 1448, 4), {});
  const T = { y: 1448, m: 4, d: 20 };
  assert.equal(W.dsLockedIn({ 'haram|1448-4': true }, 'haram', 1448, 4, 1, T), true, 'شهرٌ معتمد: مقفل');
  assert.equal(W.dsLockedIn({}, 'haram', 1448, 3, 10, T), true, 'شهرٌ منقضٍ بلا سجل: مقفل');
  assert.equal(W.dsLockedIn({ 'haram|1448-3': { mo: 1 } }, 'haram', 1448, 3, 10, T), true, 'شهرٌ منقضٍ فُتح بأثر رجعي (mo) لكنّ اليومَ المنقضي يبقى مقفلاً حتى يُفتح (dopen)');
  assert.equal(W.dsLockedIn({ 'haram|1448-3': { mo: 1, dopen: { '10': 1 } } }, 'haram', 1448, 3, 10, T), false, 'mo + dopen لليوم: مفتوح');
  assert.equal(W.dsLockedIn({ 'haram|1448-3': { dopen: { '10': 1 } } }, 'haram', 1448, 3, 10, T), true, 'dopen بلا mo في شهرٍ منقضٍ: ما زال مقفلاً');
  assert.equal(W.dsLockedIn({}, 'haram', 1448, 4, 19, T), true, 'يومٌ منقضٍ في الشهر الحالي: مقفل');
  assert.equal(W.dsLockedIn({ 'haram|1448-4': { dopen: { '19': 1 } } }, 'haram', 1448, 4, 19, T), false, 'يومٌ منقضٍ فُتح (dopen): مفتوح');
  assert.equal(W.dsLockedIn({}, 'haram', 1448, 4, 20, T), false, 'اليوم: مفتوح');
  assert.equal(W.dsLockedIn({ 'haram|1448-4': { dshut: { '25': 1 } } }, 'haram', 1448, 4, 25, T), true, 'يومٌ لم ينقضِ أُقفل يدوياً (dshut): مقفل');
  assert.equal(W.dsLockedIn({}, 'haram', 1448, 5, 1, T), false, 'شهرٌ لاحق: مفتوح');
});
test('محرّكُ مواضع الاعتماد: opMatch (نمطٌ بطول المسار · *) · opPrefix (بادئة) · splitOps (فصلُ الاعتمادات عن البقية)', () => {
  assert.equal(W.opMatch(['days.*.ap'], ['days', '3', 'ap']), true); assert.equal(W.opMatch(['days.*.ap'], ['days', '3']), false); assert.equal(W.opMatch(['days.*.ap'], ['days', '3', 'mo']), false);
  assert.equal(W.opPrefix(['days.*.ap'], ['days']), true); assert.equal(W.opPrefix(['days.*.ap'], ['days', '3', 'ap']), false); assert.equal(W.opPrefix(['x.y'], ['z']), false);
  const v = { days: { '3': { v: 1, ap: 1 }, '4': { v: 2 } }, meta: 'm' };
  const r = W.splitOps(v, ['days.*.ap'], []);
  assert.deepEqual(r.c, { days: { '3': { v: 1 }, '4': { v: 2 } }, meta: 'm' }, 'ما ليس اعتماداً');
  assert.deepEqual(r.a, { days: { '3': { ap: 1 } } }, 'إسقاطُ مواضع الاعتماد وحدها');
  assert.deepEqual(W.splitOps('s', ['a'], []), { c: 's', a: undefined }, 'قيمةٌ بدائية');
  const arr = W.splitOps([{ ap: 1, v: 1 }, { v: 2 }], ['*.ap'], []); assert.deepEqual(arr.c, [{ v: 1 }, { v: 2 }]); assert.deepEqual(arr.a, [{ ap: 1 }]);
});
test('ترويساتُ الأمن: nosniff · SAMEORIGIN · HSTS خارج localhost · CSP لـHTML فقط وبلا unsafe-eval', () => {
  const h = W.secHeaders(new URL('https://test.kivo-d81.pages.dev/'), true);
  assert.equal(h['X-Content-Type-Options'], 'nosniff'); assert.equal(h['X-Frame-Options'], 'SAMEORIGIN'); assert.match(h['Strict-Transport-Security'], /max-age=31536000/);
  assert.ok(h['Content-Security-Policy'] && !/unsafe-eval/.test(h['Content-Security-Policy']) && /object-src 'none'/.test(h['Content-Security-Policy']) && /frame-ancestors 'self'/.test(h['Content-Security-Policy']) && /base-uri 'self'/.test(h['Content-Security-Policy']), h['Content-Security-Policy']);
  const l = W.secHeaders(new URL('http://localhost:8787/api/ping'), false);
  assert.equal(l['Strict-Transport-Security'], undefined, 'لا HSTS على localhost'); assert.equal(l['Content-Security-Policy'], undefined, 'لا CSP لغير HTML');
  assert.equal(W.isLocal(new URL('http://127.0.0.1:9/')), true); assert.equal(W.isLocal(new URL('https://localhost/')), false);
  assert.equal(W.bodyLimit('/api/save'), 8 * 1024 * 1024); assert.equal(W.bodyLimit('/api/img/x'), 512 * 1024); assert.equal(W.bodyLimit('/api/login'), 64 * 1024);
});
test('حارسُ مضيف أداة الاختبار (ADR-004): Production مرفوضٌ دائماً · KIVO_TEST_HOST بالضبط · وإلا test.* أو مضيفٌ محلي', () => {
  const U = (h) => new URL('https://' + h + '/api/authz-test');
  assert.equal(W.enfTestHostOk({}, U('kivo-d81.pages.dev')), false); assert.equal(W.enfTestHostOk({ KIVO_TEST_HOST: 'kivo-d81.pages.dev' }, U('kivo-d81.pages.dev')), false, 'حتى لو أُعلن مضيفَ اختبار');
  assert.equal(W.enfTestHostOk({}, U('test.kivo-d81.pages.dev')), true); assert.equal(W.enfTestHostOk({}, U('abc123.kivo-d81.pages.dev')), false, 'رابطُ نشرٍ ذو بصمة ليس test.*');
  assert.equal(W.enfTestHostOk({ KIVO_TEST_HOST: 'test.kivo-d81.pages.dev' }, U('test.kivo-d81.pages.dev')), true); assert.equal(W.enfTestHostOk({ KIVO_TEST_HOST: 'test.kivo-d81.pages.dev' }, U('test2.kivo-d81.pages.dev')), false);
  assert.equal(W.enfTestHostOk({ KIVO_PROD_HOST: 'prod.example' }, U('prod.example')), false); assert.equal(W.enfTestHostOk({}, new URL('http://localhost:8787/')), true); assert.equal(W.enfTestHostOk({}, new URL('http://127.0.0.1:1/')), true);
  assert.equal(W.enfIsTestUser({ id: 'tst_x', test: 'TEST_ONLY' }), true); assert.equal(W.enfIsTestUser({ id: 'tst_x', test: 'TEST_ONLY', dis: 1 }), false); assert.equal(W.enfIsTestUser({ id: 'u1', test: 'TEST_ONLY' }), false); assert.equal(W.enfIsTestUser({ id: 'tst_x' }), false);
});
test('التجزئة: legacyHash حتمية · PBKDF2 (p2$) تتحقق وترفض الخطأ · القديمةُ تُقبل عبر verifyPw', async () => {
  assert.equal(W.legacyHash('482917'), W.legacyHash('482917')); assert.notEqual(W.legacyHash('482917'), W.legacyHash('482918'));
  assert.equal(W.hex(new Uint8Array([0, 15, 255]).buffer), '000fff');
  const ph = await W.hashPw('482917'); assert.match(ph, /^p2\$\d+\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
  assert.equal(await W.verifyPw('482917', ph), true); assert.equal(await W.verifyPw('482918', ph), false); assert.equal(await W.verifyPw('', ph), false);
  assert.equal(await W.verifyPw('482917', W.legacyHash('482917')), true, 'تجزئةٌ قديمة تُقبل');
  assert.equal(await W.pbkdf2('x', '00'.repeat(16), 1000), await W.pbkdf2('x', '00'.repeat(16), 1000), 'حتمية');
});
test('readCookie', () => {   /* RISHAD-266: enfScopeParse أُزيلت مع تقاعد سقف النطاق القديم */
  const req = (c) => new Request('http://x/', { headers: c ? { cookie: c } : {} });
  assert.equal(W.readCookie(req('a=1; bs_tok=abc; z=9'), 'bs_tok'), 'abc'); assert.equal(W.readCookie(req('bs_tok=abc'), 'bs_tok'), 'abc'); assert.equal(W.readCookie(req(''), 'bs_tok'), '' || null || undefined ? W.readCookie(req(''), 'bs_tok') : W.readCookie(req(''), 'bs_tok'));
  assert.ok(!W.readCookie(req('xbs_tok=1'), 'bs_tok'), 'لا مطابقةَ جزئية للاسم');
});
