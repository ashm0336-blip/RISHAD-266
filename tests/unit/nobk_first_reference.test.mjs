/* RISHAD-266 · «لم تُنشأ نسخة احتياطية منذ 7 أيام» (sy_nobk) — مرجعُ بداية التشغيل سحابيٌّ للقراءة وحدها.
   كان متصفحُ مدير النظام يكتب bassam_first_boot_v1 عند أول فتحٍ بعد الثامنة (كتابةٌ عند الفتح، وقيمةٌ لكل إدارةٍ نشطة لا للمنصة).
   الآن: GET /api/aud?first=1 يعيد أقدمَ حدثٍ في سجلّ الأنشطة (aud) — لمدير النظام وحده، بلا أي كتابة؛ ولا يكتب المراقبُ المفتاحَ بعد اليوم.
   العامل المولَّد الفعلي فوق SQLite، بياناتٌ اصطناعية TEST_ONLY. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { world, IDS } from './custody_review_fx.mjs';

const SRC = process.env.KIVO_SRC || path.resolve('src');
const state = (DB) => JSON.stringify([DB.q('SELECT k, rev FROM revs ORDER BY k'), DB.q('SELECT COUNT(*) n FROM aud'), DB.q('SELECT COUNT(*) n FROM kv'), DB.q("SELECT k, v FROM meta WHERE k <> 'rev' ORDER BY k")]);

test('first=1: the platform administrator reads the platform start (earliest event, or the latest reset); read-only; nobody else', async () => {
  const t = await world({ mode: 'enforce' }), DB = t.env.DB;
  const old = Date.now() - 30 * 864e5;
  /* the earliest recorded change, as an older platform would have it */
  await DB.batch([DB.prepare("INSERT INTO aud (cid, ts, uid, un, dept, k, rev, etype, eid, act) VALUES ('TEST_ONLY_first', ?1, ?2, 'TEST_ONLY', '', 'system', 0, 'system', '', 'set')").bind(old, IDS.super)]);
  const before = state(DB);
  const r = await t.api('super', '/api/aud?first=1');
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.deepEqual(r.json, { ok: 1, first: DB.q('SELECT MIN(ts) t FROM aud')[0].t });
  assert.equal(r.json.first, old, 'the oldest event, not the newest');
  for (const who of ['gm', 'manager1', 'employee1']) {
    const x = await t.api(who, '/api/aud?first=1');
    assert.equal(x.status, 403, who + ': ' + JSON.stringify(x.json)); assert.equal(x.json.first, undefined);
  }
  assert.equal((await t.api('super', '/api/aud?first=1', { method: 'POST', body: {} })).status, 405, 'read-only');
  assert.equal(state(DB), before, 'no revision, log, data or meta change');
  /* after a platform reset (تهيئة) the log is kept, so the start is the latest reset, not the old history */
  const ev = (cid, ts, act) => DB.prepare("INSERT INTO aud (cid, ts, uid, un, dept, k, rev, etype, eid, act) VALUES (?1, ?2, ?3, 'TEST_ONLY', '', 'system', 0, 'system', 'platform', ?4)").bind(cid, ts, IDS.super, act);
  const r1 = Date.now() - 10 * 864e5, r2 = Date.now() - 2 * 864e5;
  await DB.batch([ev('TEST_ONLY_reset1', r1, 'reset'), ev('TEST_ONLY_reset2', r2, 'reset'), ev('TEST_ONLY_after', Date.now() - 864e5, 'set')]);
  const afterReset = state(DB), rr = await t.api('super', '/api/aud?first=1');
  assert.deepEqual(rr.json, { ok: 1, first: r2 }, 'the latest reset');
  assert.equal(state(DB), afterReset, 'still read-only');
  /* the ordinary listing is unchanged */
  const list = await t.api('super', '/api/aud?limit=5');
  assert.equal(list.status, 200); assert.ok(Array.isArray(list.json.rows)); assert.equal(list.json.first, undefined);
});

test('the observer no longer writes bassam_first_boot_v1; the alert measures from the cloud reference', () => {
  const s = fs.readFileSync(path.join(SRC, 'services/442-notif-observer.js'), 'utf8');
  assert.doesNotMatch(s, /first_boot/, 'no read or write of the device-born key');
  assert.match(s, /\/api\/aud\?first=1/);
  assert.match(s, /if \(hh >= 8\) try \{/, 'still the daily 08:00 check');
  assert.match(s, /if \(hasData\) \{ if \(last\) nobk\(last\); else firstAt\(\)\.then\(nobk\); \}/, 'last backup first, else the platform start');
  assert.match(s, /emit\('sy_nobk'/, 'the alert is kept');
});
