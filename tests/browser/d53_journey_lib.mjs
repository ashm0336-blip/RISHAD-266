/* V7 · 53 (writers · جرد الكتّاب 53-أ…د — «قائمة اختبارات السيناريو لكل نظام»): عُدّةُ رحلة الإطفاء والتشغيل ببياناتٍ قائمة (TEST_ONLY · مختبرٌ معزول بلا شبكة).
   الرحلة: بياناتٌ قائمة ← مديرُ المنصة يطفئ نظاماً أو عدسة ← مديرُ الإدارة وموظفٌ بدور يعدّلان ما بقي مفعّلاً بكتّاب الصفحة الحقيقيين ←
   كلُّ حفظٍ ينجح ← التشغيل ← كلُّ موردٍ كما كان، إلا ما عدّله المستخدمان بالضبط (القيمةُ المتوقَّعة = اللقطةُ قبلها + تعديلُ كلٍّ منهما بالدالة نفسِها).
   ثلاثة أوضاع: lab (بذرُ العرض tst_demo_d1) · prod (نسخةٌ بشكل Production — v7_d6_import_fx oldFile، عناصرُها بلا eid — يستوردها مديرُ المنصة
   بالبروتوكول الحقيقي فوق الوحدة نفسِها) · mobile (بيانات lab بشاشة iPhone 13 ولمس). الاستيرادُ لمدير المنصة وحده (مسارُ المدير لمجموعة mgrimp5). */
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';
import { kv, put } from './d7_cov_lib.mjs';
import { oldFile, client, protocol, readBack } from '../unit/v7_d6_import_fx.mjs';

export { LAB };
export const DD = 'tst_demo_d1', ROLE_ID = 'TEST_ONLY_d53_role', HOLDER = 'tst_demo_e11';
export const MOBILE = { viewport: { width: 390, height: 844 }, context: { isMobile: true, hasTouch: true, deviceScaleFactor: 3,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1' } };
/* مواردُ تتغيّر بفعلٍ صحيح لا بتعديل البيانات (تنبيهاتُ الأفعال · مفاتيحُ الجهاز · ختمُ آخر تصدير) — تُذكر في التشخيص ولا تُطابَق */
const NOISE = /:(bassam_notif_v1|bassam_notif_dev_v1:.*|bassam_page_v1.*|bassam_last_export_v1|bassam_first_boot_v1)$/;
export const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const log0 = console.log; console.log = (...a) => { if (typeof a[0] === 'string' && a[0].startsWith('{"v":1,"t":')) return; log0(...a); };

/* المختبر · بذرُ العرض · (prod) استيرادُ النسخة · دورٌ TEST_ONLY للموظف tst_demo_e11 بمستوىً لكل نظام (طريقُ محرّر الأدوار — KIVO.Perm44) */
export async function setup({ mode, roleSys, prep }) {
  const lab = await startLab(), b = await chromium.launch();
  try {
    lab.env.KIVO_TEST_FIXTURE = 'allow'; lab.env.KIVO_TEST_HOST = 'lab.local';
    const sa = await openAs(b, lab, LAB.superUn, LAB.superPw), seed = await sa.api('/api/demo-data', { method: 'POST', body: JSON.stringify({ act: 'seed', reveal: true }) });
    assert.equal(seed.status, 200, JSON.stringify(seed.j && seed.j.err));
    const sec = (id) => seed.j.secrets.find((x) => x.id === id);
    const H = await sa.page.evaluate(() => KIVO.BassamCal.hNow(new Date(), null));
    if (mode === 'prod') {
      const C = client(lab), su = await C.login(LAB.superUn, LAB.superPw), T = { lab, DB: lab.env.DB, ...C, su };
      const f = await oldFile({ small: true, open: { y: H.y, m: H.m, days: [H.d - 2, H.d - 1, H.d].filter((d) => d >= 1) } });
      const run = await protocol(T, su, f, { scope: { kind: 'dept', departmentId: DD } }).run();
      assert.ok(run.commit && run.commit.status === 200 && run.commit.j.ok, 'الاستيراد (مدير المنصة): ' + JSON.stringify({ failedAt: run.failedAt, commit: run.commit && run.commit.j }).slice(0, 800));
      await readBack(T, DD);
    }
    await sa.page.reload({ waitUntil: 'domcontentloaded' }); await sa.page.waitForTimeout(2500);
    const g = await sa.page.evaluate(async ([d, sys, ekey, id]) => {
      const E = KIVO.Perm44, dr = E.draft(d), rec = E.rolesOf(d), s = {};
      Object.keys(sys).forEach((k) => { s[k] = { lvl: sys[k] }; });
      rec.roles = rec.roles.filter((x) => x.id !== id).concat([{ id, name: 'TEST_ONLY دور رحلة 53', sys: s }]);
      rec.people[ekey] = { role: id, ex: [] };
      const x = E.setRoles(dr, d, rec); if (!x.ok) return x; return E.commit(dr);
    }, [DD, roleSys, HOLDER, ROLE_ID]);
    assert.ok(g && g.ok, 'الدور: ' + JSON.stringify(g));
    await lab.idle();
    const W = { lab, b, sa, H, mode, mgr: sec('tst_demo_u_m1'), holder: sec('tst_demo_u_e11'), close: async () => { await new Promise((r) => setTimeout(r, 500)); await b.close().catch(() => {}); await lab.close(); } };
    if (prep) await prep(W);
    return W;
  } catch (e) { console.error('SETUP ' + (e && e.stack || e)); await new Promise((r) => setTimeout(r, 500)); await b.close().catch(() => {}); await lab.close(); throw e; }
}
/* لقطةُ كلّ ما تملكه الوحدة: كلُّ موردٍ تشغيلي (قراءةُ مدير المنصة) · كلُّ مفتاح KV · مجالاتُ الأنظمة العلائقية (التصدير) */
export async function snapshot(W) {
  const ops = await W.sa.page.evaluate(async (d) => { const out = {}; for (const r of KIVO.__BS_SRV.operations.resources) { const k = 'bsdept:' + d + ':' + r, x = await fetch('/api/operations/read?keys=' + encodeURIComponent(k), { cache: 'no-store' }), j = await x.json(); out[k] = { s: x.status, v: j && j.resources ? j.resources[k] : undefined }; } return out; }, DD);
  const rows = W.lab.env.DB.q("SELECT k, group_concat(v,'') v FROM (SELECT k,v FROM kv WHERE k>=?1 AND k<?2 ORDER BY k,seq) GROUP BY k", 'bsdept:' + DD + ':', 'bsdept:' + DD + ';'), K = {};
  for (const r of rows) K[r.k] = r.v;
  const dom = await W.sa.page.evaluate(async (d) => { const out = {}; for (const n of ['irshad', 'seized', 'award']) { const x = await fetch('/api/' + n + '/export?uid=' + encodeURIComponent(window.__BS_BOOT.uid) + '&dept=' + d, { cache: 'no-store' }); const j = await x.json().catch(() => null); out[n] = x.status === 200 && j && j.domains ? j.domains.map((y) => y.rows) : { s: x.status }; } return out; }, DD);
  return { ops, kv: K, dom };
}
/* مديرُ المنصة يطفئ أنظمةً في سقف الوحدة أو عدساتِها ويعيدها كما كانت */
export async function off(W, { caps = [], lenses = [] }) {
  const P = kv(W.lab, 'bassam_perms_v1'), c0 = clone(P.caps[DD]), l0 = clone((P.lenses || {})[DD]);
  assert.ok(Array.isArray(c0), 'سقفُ الوحدة صريح');
  P.caps[DD] = c0.filter((x) => caps.indexOf(x) === -1);
  if (lenses.length) { P.lenses = P.lenses || {}; const all = Array.isArray(l0) ? l0 : ['zones', 'paths', 'gates', 'marks', 'dist', 'dens']; P.lenses[DD] = all.filter((x) => lenses.indexOf(x) === -1); }
  await put(W.lab, 'bassam_perms_v1', P);
  return async () => { const Q = kv(W.lab, 'bassam_perms_v1'); Q.caps[DD] = c0; if (l0 === undefined) { if (Q.lenses) delete Q.lenses[DD]; } else Q.lenses[DD] = l0; await put(W.lab, 'bassam_perms_v1', Q); };
}
/* جلسةُ فاعل: كلُّ طلب كتابةٍ يُسجَّل بحالته ورفضه */
export async function actor(W, who) {
  const acc = who === 'mgr' ? W.mgr : W.holder;
  const s = await openAs(W.b, W.lab, acc.un, acc.pw, W.mode === 'mobile' ? MOBILE : {}), posts = [];
  s.page.on('response', async (r) => { const q = r.request(); if (q.method() !== 'POST' || !/\/api\/(save|irshad\/act|seized\/act|award\/act|operations\/commit)\b/.test(r.url())) return; let j = null; try { j = await r.json(); } catch (e) { /* بلا جسم */ } posts.push({ p: new URL(r.url()).pathname, st: r.status(), j }); });
  s.posts = posts; s.who = who;
  return s;
}
/* مكوّنُ الصفحة الذي يحمل الطريقة (الكاتبُ الحقيقي) */
export async function comp(s, hash, method, ready = 'true') {
  await s.go(hash, 3000);
  await s.page.waitForFunction(([m, rd]) => {
    for (const el of document.querySelectorAll('main *')) { const fk = Object.keys(el).find((k) => k.indexOf('__reactFiber') === 0); let x = fk ? el[fk] : null; while (x) { const n = x.stateNode; for (const c of [n, n && n.logic]) if (c && typeof c[m] === 'function' && (0, eval)('(c) => ' + rd)(c)) { window.__c = c; return true; } x = x.return; } }
    return false;
  }, [method, ready], { timeout: 60000, polling: 250 });
}
/* بعد فعلٍ: كلُّ حفظٍ أُرسل مقبولٌ بلا رفض */
export async function settled(s, n0, label) {
  const t0 = Date.now(); while (s.posts.length === n0 && Date.now() - t0 < 15000) await s.page.waitForTimeout(200);
  await s.page.waitForTimeout(1500);
  const mine = s.posts.slice(n0);
  assert.ok(mine.length > 0, label + ': الفعلُ أرسل حفظاً');
  for (const x of mine) {
    const den = x.j && x.j.denied && Object.keys(x.j.denied).length ? x.j.denied : null;
    assert.ok(x.st < 400 && !den && (!x.j || x.j.ok !== 0), label + ': ' + x.p + ' مقبول — ' + x.st + ' ' + JSON.stringify(x.j).slice(0, 700));
  }
}
/* الحكم: كلُّ موردٍ = المتوقَّع (اللقطةُ قبل الإطفاء + التعديلاتُ المقصودة بالدالة نفسِها) · وما سواه كما كان حرفاً */
export function judge(t, S0, S1, expect) {
  S1 = clone(S1);   /* المقارنةُ على شكل JSON (الغائبُ = بلا قيمة) */
  const E = { ops: clone(S0.ops), kv: clone(S0.kv), dom: clone(S0.dom) };
  expect(E);
  for (const k of Object.keys({ ...E.ops, ...S1.ops })) assert.deepEqual(S1.ops[k], E.ops[k], k + ': بعد التشغيل كما يجب (ما لم يعدّله المستخدمان كما خُزِّن)');
  const noise = [];
  for (const k of Object.keys({ ...E.kv, ...S1.kv })) { if (NOISE.test(k)) { if (S1.kv[k] !== E.kv[k]) noise.push(k); continue; } assert.equal(S1.kv[k], E.kv[k], k + ': KV بعد التشغيل كما يجب'); }
  for (const n of Object.keys(E.dom)) assert.deepEqual(S1.dom[n], E.dom[n], n + ': المجالُ العلائقي كما يجب');
  if (noise.length) t.diagnostic('تغيّرت مفاتيحُ الأفعال وحدها: ' + noise.join(' · '));
}
export const ymOf = (H) => H.y + '-' + H.m, dkOf = (H, d = H.d) => H.y + '-' + H.m + '-' + d;
