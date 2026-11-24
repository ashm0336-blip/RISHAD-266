/* V7 · 53 تقويم (REVIEW 27 · cal-import): أداةُ الاستيراد الكسولة (services/548-import-kit.js — blocks.json "lazy": true · tools/build.py @@KIVO_LAZY).
   ① البناءُ المُصرَّف: لا وسمَ لها في الغلاف · ملفٌّ واحد ذو بصمة في البيان · خدمةُ النسخ (548) تشير إليه بالاسم الكامل مرةً واحدة.
   ② المونوليث يحمل البايتاتِ نفسَها data: · وحزمةُ الإنتاج (pk<N>.prod إن وُجدت) تحمل الملفَّ نفسَه بايتاً.
   ③ السلوك: تحميلُ 548 لا يجلب الأداة · الطلبُ بلا جلسة يُرفض قبل أي جلب · أولُ استيرادٍ بجلسة يُدرج سكربتاً واحداً برابطها، والثاني لا يُدرج شيئاً،
      وبعد أن تسجّل الأداةُ نفسَها يُكمل الطلبُ نفسُه عبرها · فشلُ الجلب يقول السببَ وما العمل (لا «تم» ولا صمت). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { ROOT } from './harness.mjs';

const DIST = path.resolve(ROOT, process.env.KIVO_DIST || 'pk265'), SRC = process.env.KIVO_SRC || path.join(ROOT, 'src');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const need = fs.existsSync(DIST + '.build.json') ? {} : { skip: 'يحتاج بناءً (KIVO_DIST)' };
function built() {
  const man = JSON.parse(fs.readFileSync(DIST + '.build.json', 'utf8')), retained = new Set(man.retainedFiles || []);
  const one = (stem) => { const m = Object.keys(man.files).filter((f) => new RegExp('^assets/js/' + stem + '\\.[0-9a-f]{10}\\.js$').test(f) && !retained.has(f)); assert.equal(m.length, 1, stem + ': ملفٌّ واحد في البيان'); const b = fs.readFileSync(path.join(DIST, m[0])); assert.equal(sha(b), man.files[m[0]].sha256); return { rel: m[0], url: '/' + m[0], bytes: b, text: b.toString('utf8') }; };
  return { man, one, index: fs.readFileSync(path.join(DIST, 'index.html'), 'utf8') };
}

test('① ② الأداةُ ملفٌّ كسول: لا وسمَ في الغلاف · 548 يشير إليها مرةً · المونوليثُ data: بالبايتات نفسِها · الإنتاجُ الملفُّ نفسُه', need, () => {
  const B = built(), kit = B.one('548-import-kit'), eager = B.one('548-atomic-backup');
  assert.equal(B.index.includes('548-import-kit'), false, 'لا وسمَ ولا تحميلَ مسبقاً للأداة في الغلاف');
  assert.equal(B.index.split(eager.url).length - 1, 2, '548 في الغلاف: وسمٌ واحد + تحميلٌ مسبق');
  assert.equal(eager.text.split(kit.url).length - 1, 1, '548 يحمل رابطَ الأداة ذا البصمة مرةً واحدة');
  assert.ok(!/@@KIVO_/.test(eager.text + kit.text), 'لا علامةَ بناءٍ باقية');
  assert.ok(/KIVO\.BackupRestore\.register\(/.test(kit.text), 'الأداةُ تسجّل نفسها');
  const mono = DIST + '.mono/index.html';
  if (fs.existsSync(mono)) assert.ok(fs.readFileSync(mono, 'utf8').includes('data:text/javascript;base64,' + kit.bytes.toString('base64')), 'المونوليث: الأداةُ نفسُها data:');
  const prod = DIST + '.prod';
  if (fs.existsSync(prod)) assert.equal(sha(fs.readFileSync(path.join(prod, kit.rel))), sha(kit.bytes), 'الإنتاج: الملفُّ نفسُه بايتاً');
});

function page({ session = true, appendFails = false } = {}) {
  const added = [], calls = [];
  const document = { head: { appendChild(s) { added.push(s); if (appendFails) setTimeout(() => s.onerror && s.onerror(), 0); } }, createElement(tag) { assert.equal(tag, 'script'); return {}; } };
  const boot = session ? { srv: 1, cf: 1, uid: 'TEST_ONLY_u1', v: 1 } : {};
  const KIVO = { BassamAuth: { user: () => (session ? { id: 'TEST_ONLY_u1', role: 'super' } : null) } };
  const C = vm.createContext({ KIVO, window: { __BS_BOOT: boot, addEventListener() {}, crypto: crypto.webcrypto }, document, setTimeout, clearTimeout, AbortController, URLSearchParams, Uint8Array, console,
    fetch: async (u) => { calls.push(String(u)); return new Response(JSON.stringify({ ok: 0, err: 'TEST_ONLY_stop' }), { status: 409, headers: { 'Content-Type': 'application/json' } }); } });
  return { C, KIVO, added, calls };
}
const eagerSrc = () => fs.readFileSync(path.join(SRC, 'services/548-atomic-backup.js'), 'utf8').replace("'@@KIVO_LAZY:services/548-import-kit.js@@'", "'/assets/js/548-import-kit.TESTONLY00.js'");
const kitSrc = () => fs.readFileSync(path.join(SRC, 'services/548-import-kit.js'), 'utf8');
const FILE = { app: 'bassam-crowd', version: 3, kind: 'dept', dept: 'TEST_ONLY', data: { bassam_options_v1: '{}' }, perms: null, idbImages: {} };

test('③ تحميلُ 548 لا يجلب الأداة · بلا جلسة يُرفض قبل أي جلب · أولُ استيرادٍ يجلبها مرةً واحدة ثم يكمل عبرها', async () => {
  const anon = page({ session: false });
  vm.runInContext(eagerSrc(), anon.C);
  assert.deepEqual(anon.added, [], 'فتحُ الصفحة لا يجلب أداة الاستيراد');
  assert.equal((await anon.KIVO.BackupRestore.prepare(FILE, { mode: 'replace', scope: { kind: 'dept', departmentId: 'TEST_ONLY_d' } })).status, 401);
  assert.equal((await anon.KIVO.BackupRestore.summary(FILE, { kind: 'dept', departmentId: 'TEST_ONLY_d' })).status, 401);
  assert.deepEqual(anon.added, [], 'بلا جلسة: لا جلب'); assert.deepEqual(anon.calls, []);
  assert.equal(anon.KIVO.BackupRestore.permsLine({ perms: { roles: 1 } }), '', 'المتزامنةُ قبل التحميل: فارغةٌ بلا خطأ');
  assert.equal(anon.KIVO.BackupRestore.approve({}).status, 401);

  const P = page();
  vm.runInContext(eagerSrc(), P.C);
  assert.deepEqual(P.added, []);
  const first = P.KIVO.BackupRestore.summary(FILE, { kind: 'dept', departmentId: 'TEST_ONLY_d' }), second = P.KIVO.BackupRestore.prepare(FILE, { mode: 'replace', scope: { kind: 'dept', departmentId: 'TEST_ONLY_d' } });
  assert.equal(P.added.length, 1, 'طلبان متزامنان ⇒ سكربتٌ واحد'); assert.equal(P.added[0].src, '/assets/js/548-import-kit.TESTONLY00.js');
  vm.runInContext(kitSrc(), P.C); P.added[0].onload();
  const [a, b] = await Promise.all([first, second]);
  assert.equal(a.err, 'TEST_ONLY_stop', 'الملخّصُ وصل الخادمَ عبر الأداة: ' + JSON.stringify(a)); assert.ok(b.ok === 0 && b.message, 'التحضيرُ عبر الأداة بسبب الخادم');
  assert.ok(P.calls.length >= 2 && P.calls.every((u) => u.startsWith('/api/backup/import')));
  await P.KIVO.BackupRestore.summary(FILE, { kind: 'dept', departmentId: 'TEST_ONLY_d' });
  assert.equal(P.added.length, 1, 'بعد التحميل لا جلبَ ثانٍ');
  assert.match(P.KIVO.BackupRestore.permsLine({ perms: { roles: 2, assignments: 1 } }), /2 دور/, 'المتزامنةُ بعد التحميل عبر الأداة');

  const F = page({ appendFails: true });
  vm.runInContext(eagerSrc(), F.C);
  const r = await F.KIVO.BackupRestore.prepare(FILE, { mode: 'replace', scope: { kind: 'dept', departmentId: 'TEST_ONLY_d' } });
  assert.equal(r.err, 'kit'); assert.match(r.message, /تعذّر تحميل أداة الاستيراد.*لم يتغيّر شيء.*أعد تحميل الصفحة/, 'فشلُ الجلب يقول السببَ وما العمل');
  assert.equal(await F.KIVO.BackupRestore.confirm({ ok: 1 }), false, 'لا تأكيدَ بلا أداة');
  const n0 = F.added.length, again = F.KIVO.BackupRestore.prepare(FILE, { mode: 'replace', scope: { kind: 'dept', departmentId: 'TEST_ONLY_d' } });
  assert.equal(F.added.length, n0 + 1, 'بعد الفشل يُعاد الجلبُ في المحاولة التالية (لا وعدَ فاشلاً محفوظاً)'); await again;
});
