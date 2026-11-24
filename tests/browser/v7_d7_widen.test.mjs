/* V7 · د7 (52 · الكامن — قرارُ المالك REPLY_52_2: الدورُ الأوسع بعد توسيع السقف، بخطوتين بلا تغيير حارس) — المختبرُ المعزول (TEST_ONLY، الإنفاذ):
   بعد أن يؤكّد الخادمُ حفظَ سقفٍ وُسِّع، تعيد شاشةُ الوحدات حسابَ منحِ الأدوار في الوحدة وفروعها بالسقف الجديد (KIVO.Perm44.refreshUnits) في حفظٍ ثانٍ.
   ١ الدورُ الأوسع: «مشاهدة» ← إطفاء ← «كامل» ← تشغيل ⇒ «كامل» بلا أيّ حفظٍ من المدير.   ٢ العدسة نفسُها.   ٣ موظفٌ في قسمٍ تحت الوحدة.
   ٤ فشلُ الخطوة الثانية: الرسالة · السقفُ موسَّع · لا يضيع شيء · أولُ حفظٍ للدور يُكمل.   ٥ الحجم: 500 موظفٍ بأدوار في طلبٍ واحد (الزمن والحجم).
   ٦ لا تنبيهات من إعادة الحساب. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const A = 'TEST_ONLY_A', S1 = 'TEST_ONLY_A_S1', EMP = 'TEST_ONLY_eA1', X = { k: 'dstats', n: 'الإحصائيات اليومية' };
const KG = (d) => 'bsdept:' + d + ':bassam_grants_v1';
const P = (p, sel, o) => p.locator('main .p44 ' + sel, o);
const kv = (lab, k) => { const r = lab.env.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', k).map((x) => x.v).join(''); return r ? JSON.parse(r) : null; };
const eff = (g, rx) => (g ? g.plus.filter((k) => !(g.minus || []).includes(k) && rx.test(k)) : []).sort();
async function settle(lab, p, ms = 1200) { await p.waitForTimeout(ms); await lab.idle(); }
const roleA = (id, sys) => ({ id: id + '_a', name: 'TEST_ONLY مشاهد ' + id, sys: { tasks: { lvl: 'view' }, [sys]: { lvl: 'view' } } });
const roleB = (id, sys) => ({ id: id + '_b', name: 'TEST_ONLY كامل ' + id, sys: { tasks: { lvl: 'view' }, [sys]: { lvl: 'full' } } });

async function superSession(b, lab) {
  const s = await openAs(b, lab, LAB.superUn, LAB.superPw); s.page.setDefaultTimeout(20000);
  const toasts = []; await s.page.exposeFunction('__d7t', (t) => toasts.push(t));
  await s.page.evaluate(() => { const seen = {}; new MutationObserver(() => document.querySelectorAll('#bs-toast, .bs-toast, [role=status], [role=alert]').forEach((n) => { const t = (n.textContent || '').trim(); if (t && !seen[t]) { seen[t] = 1; window.__d7t(t); } })).observe(document, { childList: true, subtree: true, characterData: true }); });
  s.toasts = toasts;
  /* the one path (KIVO.Perm44 draft → commit) — roles + their compiled grants */
  s.roles = async (d, roles, people) => {
    const r = await s.page.evaluate(async ([d, roles, people]) => { const E = KIVO.Perm44, rec = E.rolesOf(d), dr = E.draft(d);
      roles.forEach((x) => { const i = rec.roles.findIndex((y) => y.id === x.id); if (i === -1) rec.roles.push(x); else rec.roles[i] = x; });
      Object.assign(rec.people, people); const w = E.setRoles(dr, d, rec); if (!w.ok) return w; return E.commit(dr); }, [d, roles, people]);
    await settle(lab, s.page); assert.equal(r.ok, true, 'roles saved: ' + JSON.stringify(r)); return r;
  };
  /* the org screen's ceiling writer: «الأنظمة» → switch → «مراجعة وحفظ» → «حفظ» (step 2 follows it on widening) */
  s.flip = async (sys, on) => {
    await s.go('#/sysadmin/org/' + A + '/systems', 3000);
    await P(s.page, 'button.p44-sw[aria-label="' + sys.n + '"]').click(); await s.page.waitForTimeout(200);
    await P(s.page, '.p44-bar button', { hasText: 'مراجعة وحفظ' }).click(); await P(s.page, '[role=dialog].p44-rev').waitFor();
    await P(s.page, '[role=dialog].p44-rev button', { hasText: 'حفظ' }).click(); await settle(lab, s.page, 3000);
    assert.equal((kv(lab, 'bassam_perms_v1').caps[A] || []).includes(sys.k), on, sys.k + (on ? ' ON' : ' OFF'));
  };
  return s;
}
const notifRows = (lab) => lab.env.DB.q("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%notif%' AND name NOT LIKE '%checkpoint%'").map((t) => t.name + ':' + lab.env.DB.q('SELECT COUNT(*) n FROM ' + t.name)[0].n).join(' ')
  + ' kv:' + lab.env.DB.q("SELECT COUNT(*) n, COALESCE(SUM(LENGTH(v)),0) s FROM kv WHERE k LIKE '%notif%'").map((r) => r.n + '/' + r.s).join('');

test('V7 · د7 (52 · REPLY_52_2) ١ wider role · ٣ a section employee · ٦ no notifications: «مشاهدة» → OFF → «كامل» → ON ⇒ «كامل» with no manager save', { timeout: 600000 }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    const s = await superSession(b, lab), ES = 'TEST_ONLY_eS1';
    await s.roles(A, [roleA('TEST_ONLY_w1', X.k), roleB('TEST_ONLY_w1', X.k)], { [EMP]: { role: 'TEST_ONLY_w1_a', ex: [] } });
    await s.roles(S1, [roleA('TEST_ONLY_w3', X.k), roleB('TEST_ONLY_w3', X.k)], { [ES]: { role: 'TEST_ONLY_w3_a', ex: [] } });
    const full = await s.page.evaluate((x) => KIVO.Perm44.keysFor(x, 'full').slice().sort(), X.k), view = await s.page.evaluate((x) => KIVO.Perm44.keysFor(x, 'view').slice().sort(), X.k);
    assert.ok(full.length > view.length, '«كامل» is wider than «مشاهدة»');
    await s.flip(X, false);
    await s.roles(A, [], { [EMP]: { role: 'TEST_ONLY_w1_b', ex: [] } });
    await s.roles(S1, [], { [ES]: { role: 'TEST_ONLY_w3_b', ex: [] } });
    assert.deepEqual(eff(kv(lab, KG(A)).emp[EMP], /^dstats\./), view, 'while OFF: what the stored grant can hold (A\'s view keys)');
    const n0 = notifRows(lab), saves = []; s.page.on('request', (r) => { if (r.method() === 'POST' && /\/api\/save$/.test(r.url())) saves.push(Object.keys(JSON.parse(r.postData() || '{}').set || {})); });
    await s.flip(X, true);
    assert.deepEqual(eff(kv(lab, KG(A)).emp[EMP], /^dstats\./), full, '١ ON again ⇒ B\'s «كامل» with no manager save: ' + JSON.stringify(kv(lab, KG(A)).emp[EMP]));
    assert.deepEqual(eff(kv(lab, KG(S1)).emp[ES], /^dstats\./), full, '٣ the section employee too (sub-units)');
    assert.ok(saves.some((k) => k.includes(KG(A)) && !k.includes('bassam_perms_v1')), 'step 2 is its own save after the ceiling: ' + JSON.stringify(saves));
    assert.equal(notifRows(lab), n0, '٦ no notification from the automatic recompute');
    assert.ok(!s.toasts.some((t) => /تعذّر تحديث صلاحيات الأدوار/.test(t)), 'no failure message');
    assert.deepEqual(s.errs, [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});

test('V7 · د7 (52 · REPLY_52_2) ٢ a lens: «مشاهدة» → lens OFF → «كامل» → lens ON ⇒ «كامل»', { timeout: 600000 }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    const s = await superSession(b, lab), L = 'zones';
    await s.roles(A, [roleA('TEST_ONLY_l', 'lens.' + L), roleB('TEST_ONLY_l', 'lens.' + L)], { [EMP]: { role: 'TEST_ONLY_l_a', ex: [] } });
    const full = await s.page.evaluate((x) => KIVO.Perm44.keysFor(x, 'full').slice().sort(), 'lens.' + L);
    const lens = (on) => s.page.evaluate(async ([d, L, on]) => { const Pm = KIVO.BassamPerm, all = Pm.LENS_KEYS || KIVO.BassamPerm.deptLenses(d); const r = Pm.setDeptLenses(d, on ? all.concat([L]).filter((x, i, a) => a.indexOf(x) === i) : Pm.deptLenses(d).filter((x) => x !== L)); await KIVO.__BS_SRV.flushAsync(15000); return r; }, [A, L, on]);
    await lens(false); await settle(lab, s.page);
    assert.ok(!(kv(lab, 'bassam_perms_v1').lenses || {})[A].includes(L), 'lens OFF');
    await s.roles(A, [], { [EMP]: { role: 'TEST_ONLY_l_b', ex: [] } });
    await lens(true); await settle(lab, s.page);
    /* the lens ceiling writer of the org screen (lenses group) calls the same step 2 after its save — here the helper directly */
    const r = await s.page.evaluate((d) => KIVO.Perm44.refreshUnits([d]), A); await settle(lab, s.page);
    assert.equal(r.ok, true, 'step 2: ' + JSON.stringify(r));
    const g = kv(lab, KG(A)).emp[EMP];
    assert.deepEqual(full.filter((k) => !eff(g, /./).includes(k)), [], '٢ lens ON ⇒ B\'s «كامل» lens keys: ' + JSON.stringify(g));
  } finally { await b.close(); await lab.close(); }
});

test('V7 · د7 (52 · REPLY_52_2) ٤ step 2 fails ⇒ the message · the ceiling stays widened · nothing lost · the first role save completes the keys', { timeout: 600000 }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    const s = await superSession(b, lab);
    await s.roles(A, [roleA('TEST_ONLY_f', X.k), roleB('TEST_ONLY_f', X.k)], { [EMP]: { role: 'TEST_ONLY_f_a', ex: [] } });
    const full = await s.page.evaluate((x) => KIVO.Perm44.keysFor(x, 'full').slice().sort(), X.k);
    await s.flip(X, false);
    await s.roles(A, [], { [EMP]: { role: 'TEST_ONLY_f_b', ex: [] } });
    const before = kv(lab, KG(A));
    /* step 2 refused by the server: the save that carries the grants alone (after the ceiling) gets a key the server refuses («not assignable») */
    await s.page.route('**/api/save', async (route) => {
      const j = JSON.parse(route.request().postData() || '{}'), k = Object.keys(j.set || {});
      if (!(k.includes(KG(A)) && !k.includes('bassam_perms_v1'))) return route.continue();
      const g = JSON.parse(j.set[KG(A)]); g.emp[EMP].plus = g.emp[EMP].plus.concat(['TEST_ONLY.not.a.key']); j.set[KG(A)] = JSON.stringify(g);
      return route.continue({ postData: JSON.stringify(j) });
    });
    await s.flip(X, true);
    for (let i = 0; i < 40 && !s.toasts.some((t) => /تعذّر تحديث صلاحيات الأدوار/.test(t)); i++) await s.page.waitForTimeout(500);
    await lab.idle();
    assert.ok(s.toasts.some((t) => /وُسِّع السقف، وتعذّر تحديث صلاحيات الأدوار: تظهر عند أول حفظ لدور الموظف/.test(t)), '٤ the message: ' + JSON.stringify(s.toasts));
    assert.ok(kv(lab, 'bassam_perms_v1').caps[A].includes(X.k), 'the ceiling stays widened');
    assert.deepEqual(kv(lab, KG(A)), before, 'nothing lost: the grants as they were');
    await s.page.unroute('**/api/save');
    await s.page.reload({ waitUntil: 'domcontentloaded' }); await s.page.waitForTimeout(4000);
    /* the first role save (the role's level for tasks changes) completes the keys */
    await s.roles(A, [{ ...roleB('TEST_ONLY_f', X.k), sys: { tasks: { lvl: 'input' }, [X.k]: { lvl: 'full' } } }], {});
    assert.deepEqual(eff(kv(lab, KG(A)).emp[EMP], /^dstats\./), full, 'the first role save completes B\'s keys');
  } finally { await b.close(); await lab.close(); }
});

test('V7 · د7 (52 · REPLY_52_2) ٥ size: 500 employees with roles — step 2 in one request within the limits (time · bytes)', { timeout: 900000 }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    const s = await superSession(b, lab), N = 500, ppl = (r) => Object.fromEntries(Array.from({ length: N }, (_, i) => ['TEST_ONLY_e500_' + i, { role: r, ex: [] }]));
    await s.roles(A, [roleA('TEST_ONLY_z', X.k), roleB('TEST_ONLY_z', X.k)], ppl('TEST_ONLY_z_a'));
    await s.flip(X, false);
    await s.roles(A, [], ppl('TEST_ONLY_z_b'));
    const reqs = []; s.page.on('request', (r) => { if (r.method() === 'POST' && /\/api\/save$/.test(r.url())) { const j = JSON.parse(r.postData() || '{}'); reqs.push({ k: Object.keys(j.set || {}), bytes: Buffer.byteLength(r.postData() || ''), t: Date.now(), r }); } });
    await s.flip(X, true);
    const st = reqs.filter((x) => x.k.includes(KG(A)) && !x.k.includes('bassam_perms_v1'));
    assert.equal(st.length, 1, '٥ step 2 is one request: ' + JSON.stringify(reqs.map((x) => [x.k.length, x.bytes])));
    const res = await st[0].r.response(), ms = res ? (await res.finished(), Date.now() - st[0].t) : -1;
    assert.equal(res && res.status(), 200, 'accepted');
    const full = await s.page.evaluate((x) => KIVO.Perm44.keysFor(x, 'full').slice().sort(), X.k), G = kv(lab, KG(A));
    assert.equal(Object.keys(G.emp).filter((e) => /^TEST_ONLY_e500_/.test(e) && JSON.stringify(eff(G.emp[e], /^dstats\./)) === JSON.stringify(full)).length, N, 'all 500 at «كامل»');
    console.log('D7_SIZE step2 bytes=' + st[0].bytes + ' ms≈' + ms + ' (BODY_MAX /api/save 16MB)');
    assert.ok(st[0].bytes < 16 * 1024 * 1024 * 0.5, 'well within the 16MB body limit');
  } finally { await b.close(); await lab.close(); }
});
