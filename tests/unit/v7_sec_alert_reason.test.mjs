/* V7 · د5-هـ (أمن ٥) — سببُ الرفض في إنذارين أمنيين: sc_rk (محاولةُ استعادةٍ فاشلة: الفعلُ «رُفض» لا «استُخدم» والسببُ من sec.detail)
   وsc_fail (محاولاتُ الدخول الفاشلة: الأسبابُ bad-pw · no-user · frozen بأعدادها). الخادمُ (الاستطلاع) ونصُّ الكتالوج في العميل. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './harness.mjs';
import { world } from './notifications_review_fx.mjs';

const sec = (W, act, un, detail, from, ago) => W.DB.prepare('INSERT INTO sec(ts,uid,un,act,target,detail,ip) VALUES(?1,?2,?3,?4,?5,?6,?7)').bind(Date.now() - ago, '', un, act, '', detail, from).run();
const poll = async (W) => assert.equal((await W.act('super', { op: 'security-poll' })).status, 200);
const msgs = (W, t) => W.DB.q("SELECT title, body FROM notification_messages WHERE type = ?1 ", t).map((m) => m.body);   /* النصُّ وحده (العنوانُ اسمُ النوع) */

test('sc_rk: محاولةُ استعادةٍ فاشلة تقول «رُفض» وتحمل السبب (المفتاح غير صحيح · لا مفتاحَ مُصدَر) — والنجاحُ «استُخدم»', async () => {
  const W = await world();
  await sec(W, 'recover_fail', '', 'bad-key', '198.51.100.9', 3000);
  await sec(W, 'recover_fail', '', 'no-key', '198.51.100.10', 2000);
  await sec(W, 'recover_ok', 'TEST_ONLY_u', 'password-reset-by-recovery-key', '198.51.100.11', 1000);
  await poll(W);
  const all = msgs(W, 'sc_rk'), by = (ip) => all.filter((x) => x.includes(ip + ' '))[0] || '';   /* المعرّفُ نصٌّ عشوائي: لا ترتيبَ مضمون */
  assert.equal(all.length, 3, JSON.stringify(all));
  const m = [by('198.51.100.9'), by('198.51.100.10'), by('198.51.100.11')];
  assert.match(m[0], /رُفض مفتاح الاستعادة/, m[0]); assert.doesNotMatch(m[0], /استُخدم/, '★ الفعلُ لمحاولةٍ فاشلة ليس «استُخدم»: ' + m[0]);
  assert.match(m[0], /المفتاح غير صحيح/, '★ السببُ bad-key في النص: ' + m[0]); assert.match(m[0], /198\.51\.100\.9/);
  assert.match(m[1], /لا يوجد مفتاح استعادة مُصدَر/, '★ السببُ no-key في النص: ' + m[1]);
  assert.match(m[2], /استُخدم مفتاح الاستعادة/, m[2]); assert.match(m[2], /نجح/);
});

test('sc_fail: الإنذارُ يحمل أسبابَ الإخفاق بأعدادها (كلمة مرور خاطئة · حساب موقوف)', async () => {
  const W = await world(); const ACC = W.users[1].un;
  for (let i = 0; i < 4; i++) await sec(W, 'login_fail', ACC, 'bad-pw', '198.51.100.77', 5000 - i);
  await sec(W, 'login_fail', ACC, 'frozen', '198.51.100.77', 4000);
  await poll(W);
  const m = msgs(W, 'sc_fail');
  assert.equal(m.length, 1, JSON.stringify(m));
  assert.match(m[0], /كلمة مرور خاطئة ×4/, '★ السببُ bad-pw وعددُه: ' + m[0]);
  assert.match(m[0], /حساب موقوف ×1/, '★ السببُ frozen وعددُه: ' + m[0]);
  assert.match(m[0], /198\.51\.100\.77/); assert.match(m[0], /5 محاولات/);
});

test('sc_fail: اسمٌ غيرُ موجود سببُه في النص (no-user)', async () => {
  const W = await world();
  for (let i = 0; i < 5; i++) await sec(W, 'login_fail', '0555000333', 'no-user', '198.51.100.78', 5000 - i);
  await poll(W);
  const m = msgs(W, 'sc_fail');
  assert.equal(m.length, 1); assert.match(m[0], /اسم مستخدم غير موجود ×5/, '★ السببُ no-user: ' + m[0]);
});

test('الكتالوج: نصُّ sc_rk وsc_fail في العميل = الخادم ويحمل {السبب}', () => {
  const cli = fs.readFileSync(path.join(ROOT, 'src/slots/services/441-notif-core.js.tpl'), 'utf8');
  const srv = fs.readFileSync(path.join(ROOT, 'src/slots/workers/parts/019-notifications.js.tpl'), 'utf8');
  for (const id of ['sc_rk', 'sc_fail']) {
    const c = cli.match(new RegExp("L\\('" + id + "'(?:,'[^']*'|,true|,false|,\\[[^\\]]*\\])*"))[0].split("','");
    const txt = c[c.length - 2]; assert.match(txt, /\{السبب\}/, id + ' في العميل: ' + txt);
    const s = srv.match(new RegExp(id + ': \\{[\\s\\S]*?txt: "([^"]*)"'))[1]; assert.equal(s, txt, id + ': العميل = الخادم');
  }
});
