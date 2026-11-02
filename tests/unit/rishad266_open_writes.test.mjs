/* RISHAD266 · لا كتابة عند فتح الصفحات: ما كانت الصفحةُ ترسله عند فتحها صار في الخادم
     (أ) دخولٌ من جهازٍ جديد (sc_dev): يحكم به الخادمُ عند الدخول ببصمة (النوع|المتصفح) من سجل الأمن —
         أولُ دخولٍ ببصمةٍ يُسجَّل بلا تنبيه (لا موجةَ تنبيهاتٍ بعد النشر) · البصمةُ نفسُها مرةً ثانية لا تنبّه · بصمةٌ جديدة تنبّه مرةً واحدة
     (ب) توليدُ المواعيد المتكررة: قراءةُ مخزن مهام الإدارة (/api/operations/read) تولِّد بالحارس المشترك — بلا POST من الصفحة
     (ج) مصدرُ الصفحة: لا recur/run عند فتح صفحة المهام ولا إرسالَ sc_dev من مراقب التنبيهات */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { world, workerUnderTest, KT, stored, TAG, MID, HR, hij, ME, taskCommandBody, operationSaveBody } from './tasks_fx.mjs';
import { SRC } from './harness.mjs';

const WU = workerUnderTest();
const DM = ['0000000101', '70101'];
const UA = { pc: 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0 Safari/537.36', ph: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1' };
const dvRows = (W, uid) => W.env.DB.q("SELECT detail FROM sec WHERE act = 'login_ok' AND uid = ? ORDER BY ts", uid).map((r) => r.detail);
const scDevCount = (W) => W.env.DB.q("SELECT name FROM sqlite_master WHERE type = 'table'").map((t) => t.name)
  .reduce((n, t) => { try { return n + W.env.DB.q('SELECT * FROM "' + t + '"').filter((r) => JSON.stringify(r).includes('sc_dev') && !JSON.stringify(r).includes('"cfg"')).length; } catch (e) { return n; } }, 0);

test('(أ) sc_dev من الخادم عند الدخول: الأولُ صامت · البصمةُ نفسُها لا تنبّه · الجديدةُ تنبّه مرةً', async () => {
  const W = await world({ worker: WU.file, mode: 'enforce' });
  const login = (ua) => W.C.login(DM[0], DM[1], { headers: { 'User-Agent': ua } });
  const a = await login(UA.pc); assert.ok(a.ok, JSON.stringify(a.j));
  const uid = a.j.uid, n0 = scDevCount(W);
  assert.deepEqual(dvRows(W, uid).filter(Boolean).slice(-1), ['dv:d|Chrome'], 'البصمةُ في سجل الأمن');
  assert.ok((await login(UA.pc)).ok); assert.equal(scDevCount(W), n0, 'البصمةُ نفسُها: لا تنبيه');
  assert.ok((await login(UA.ph)).ok); const n1 = scDevCount(W); assert.ok(n1 > n0, 'بصمةٌ جديدة (هاتف · Safari): تنبيه');
  assert.ok((await login(UA.ph)).ok); assert.equal(scDevCount(W), n1, 'الهاتفُ نفسُه ثانيةً: لا تنبيه');
});

test('(ب) قراءةُ مخزن المهام تولّد المواعيد المتكررة (بلا POST من الصفحة)', async () => {
  const W = await world({ worker: WU.file, mode: 'enforce' }); const dm = await W.login(...DM);
  const T0 = MID(Date.now()) + 864e5, k0 = hij(T0 + 12 * HR);
  const c = await W.C.api('/api/tasks/create', { method: 'POST', cookie: dm.ck, body: operationSaveBody(W.env, '/api/tasks/create', taskCommandBody(W.env, '/api/tasks/create', { k: k0, t: TAG + ' يومية', s: T0 + 8 * HR, e: T0 + 9 * HR, asg: [ME.eid], rv: 'none', force: true, rec: { t: 'daily' } })) });
  assert.equal(c.status, 200, JSON.stringify(c.j).slice(0, 300));
  const count = () => { const S = stored(W.env, KT) || {}; let n = 0; for (const dk in S) (S[dk] || []).forEach((r) => { if (Array.isArray(r) && r[23] && r[23].rec) n++; }); return n; };
  const before = count();
  const r = await W.C.api('/api/operations/read?keys=' + encodeURIComponent(KT), { cookie: dm.ck }); assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 300));
  assert.ok(count() > before, 'وُلّدت النسخُ عند القراءة: ' + before + ' ⇒ ' + count());
});

test('(ج) مصدرُ الصفحة: لا recur/run عند فتح المهام ولا sc_dev من مراقب التنبيهات ولا ذاكرةَ جهازٍ له', () => {
  const tasks = fs.readFileSync(path.join(SRC, 'modules/tasks/logic.js'), 'utf8');
  const obs = fs.readFileSync(path.join(SRC, 'services/442-notif-observer.js'), 'utf8');
  assert.ok(!tasks.includes('/api/tasks/recur/run'), 'لا POST لتوليد التكرار من الصفحة');
  assert.ok(!/emit\(\s*['"]sc_dev/.test(obs) && !obs.includes('bassam_notif_dev_v1'), 'لا إرسالَ sc_dev من الصفحة');
});
