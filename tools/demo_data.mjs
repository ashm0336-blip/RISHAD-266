#!/usr/bin/env node
/* V7 · د5-هـ (م6) — بياناتُ العرض التجريبية TEST_ONLY بأمرٍ واحد: زرعٌ · حذفٌ يعيد القاعدةَ كما كانت · حالة.
   الخادمُ وحده يكتب (POST /api/demo-data — أداةُ اختبارٍ خلف الإنفاذ ∧ KIVO_TEST_FIXTURE=allow ∧ مضيفِ الاختبار ∧ مديرِ المنصة، منزوعةٌ من حزمة الإنتاج).

     node tools/demo_data.mjs --lab  [seed|remove|status|preview]   المختبرُ المحلي (tests/browser/local_server.mjs): يُشغَّل ثم يُنفَّذ الأمر؛
                                                                 بعد seed يبقى قائماً (PORT، افتراضياً 8788) لتصفّحه — Ctrl-C يوقفه (القاعدةُ في الذاكرة)
     node tools/demo_data.mjs --site [seed|remove|status|preview] [--force]
                                    موقعُ الاختبار وحده: KIVO_TEST_BASE (افتراضياً https://test.kivo-d81.pages.dev) — أيُّ مضيفٍ آخر يُرفض
                                    بيانُ دخول مدير المنصة من المتغيّرين KIVO_TEST_SUPER_UN / KIVO_TEST_SUPER_PW وحدهما (لا يُطبعان ولا يُكتبان)

   لا تطبع الأداةُ كلمةَ مرورٍ أبداً ولا تطلب كشفَها (reveal): حساباتُ العرض (tst_demo_u_*) موسومةٌ TEST_ONLY فيُدخَل بها عبر جلسة الاختبار
   الداخلية (/api/authz-test)، ومن أراد كلماتِها طلبها بنفسه مرةً واحدة: POST /api/demo-data {act:'seed', reveal:true}. */
import { pathToFileURL } from 'node:url';

export const TEST_HOST = 'test.kivo-d81.pages.dev';
export function siteBase(raw) {
  const u = new URL(raw || 'https://' + TEST_HOST);
  if (u.protocol !== 'https:' || u.hostname !== TEST_HOST || u.username || u.password) throw new Error('refused: only https://' + TEST_HOST + ' (got ' + u.host + ')');
  return u.origin;
}
async function call(base, cookie, body) {
  const r = await fetch(base + '/api/demo-data', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, Cookie: cookie }, body: JSON.stringify(body) });
  let j = null; try { j = await r.json(); } catch (e) { j = { ok: 0, err: 'not-json' }; }
  if (j && j.secrets) delete j.secrets;   /* لا تُطبع كلمةُ مرور ولو طُلبت من غير هذه الأداة */
  return { status: r.status, j };
}
async function login(base, un, pw) {
  const r = await fetch(base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ u: un, p: pw }) });
  const set = typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : [r.headers.get('set-cookie') || ''];
  const ck = (set.find((c) => /=/.test(c)) || '').split(';')[0];
  let j = null; try { j = await r.json(); } catch (e) { j = null; }
  if (r.status !== 200 || !j || j.ok !== 1 || !ck) throw new Error('sign-in refused (' + r.status + ')' + (j && j.err ? ' ' + j.err : ''));
  return ck;
}
function summary(cmd, res) {
  const j = res.j || {}, o = { status: res.status, ok: j.ok, act: j.act || cmd };
  for (const k of ['err', 'msg', 'noop', 'seeded', 'state', 'counts', 'rows', 'removed', 'shared', 'keptCounters', 'demoRows', 'accounts', 'systems', 'drift', 'foreign']) if (j[k] !== undefined) o[k] = j[k];
  return o;
}
export async function main(argv) {
  const mode = argv.includes('--lab') ? 'lab' : argv.includes('--site') ? 'site' : null;
  const cmd = argv.find((a) => ['seed', 'remove', 'status', 'preview'].includes(a)) || 'status', force = argv.includes('--force');
  if (!mode) { console.error('usage: node tools/demo_data.mjs --lab|--site [seed|remove|status|preview] [--force]'); return 2; }
  const body = { act: cmd }; if (force) body.force = true;
  if (mode === 'site') {
    const base = siteBase(process.env.KIVO_TEST_BASE);
    const un = process.env.KIVO_TEST_SUPER_UN, pw = process.env.KIVO_TEST_SUPER_PW;
    if (!un || !pw) { console.error('KIVO_TEST_SUPER_UN / KIVO_TEST_SUPER_PW are required (environment only)'); return 2; }
    const ck = await login(base, un, pw);
    const res = await call(base, ck, body);
    console.log(JSON.stringify(Object.assign({ host: new URL(base).host }, summary(cmd, res)), null, 1));
    return res.status === 200 && res.j && res.j.ok === 1 ? 0 : 1;
  }
  const { startLab, LAB } = await import('../tests/browser/local_server.mjs');
  const lab = await startLab({ port: +(process.env.PORT || 8788) });
  lab.env.KIVO_TEST_FIXTURE = 'allow'; lab.env.KIVO_TEST_HOST = 'lab.local';   /* المختبرُ يخدم العاملَ على https://lab.local */
  const ck = await login(lab.base, LAB.superUn, LAB.superPw);
  const res = await call(lab.base, ck, body);
  console.log(JSON.stringify(Object.assign({ host: 'lab', base: lab.base }, summary(cmd, res)), null, 1));
  if (cmd === 'seed' && res.status === 200 && !argv.includes('--exit')) { console.log('lab running at ' + lab.base + ' — Ctrl-C to stop'); return null; }
  await lab.close();
  return res.status === 200 && res.j && res.j.ok === 1 ? 0 : 1;
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((rc) => { if (rc !== null) process.exit(rc); }, (e) => { console.error(String(e && e.message || e)); process.exit(1); });
}
