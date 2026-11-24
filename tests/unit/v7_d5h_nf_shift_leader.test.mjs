/* V7 · د5-ح (بند 11) — تنبيهاتُ رئيس الوردية (العاملُ الحقيقي من أجزائه · SQLite في الذاكرة · بياناتٌ TEST_ONLY).
   كان nfLeader يعدّ رئيساً كلَّ من ورد رئيساً أو نائباً في أيّ تقريرٍ مخزَّن ولو قبل شهور (أو حمل قالباً إشرافياً بلا تقرير).
   الآن: رئيسُ الوردية = من دورُه الآن في سجلّ أدوار وحدته (bassam_roles_v1) يحمل sup:true، وورد رئيساً أو نائباً في تقرير ورديته هو
   لليوم التشغيلي بتوقيت الرياض؛ وحدثُ الرئيس الذي يحمل ورديته (vars.الوردية) يصل رئيسَ تلك الوردية وحده (هدف «lead:<الوردية>»).
   كلُّ حالةٍ تُقرأ من صندوق الوارد الحقيقي (/api/notifications) لكل حساب. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, D1, IDS, EKEYS } from './notifications_review_fx.mjs';
import { isOperationalFixtureKey, replaceOperationalFixture } from './operational_legacy_seed_fx.mjs';
import { needs } from './harness.mjs';

const HF = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' });
const dk = (ts) => { const o = {}; HF.formatToParts(new Date(ts)).forEach((p) => { o[p.type] = +p.value; }); return o.year + '-' + o.month + '-' + o.day; };
const NOW = Date.now(), TODAY = dk(NOW), YESTERDAY = dk(NOW - 86400000);
const KROLES = 'bsdept:' + D1 + ':bassam_roles_v1', KREP = 'bsdept:' + D1 + ':bassam_dreport_v1';
const SUP = 'TEST_ONLY_role_supervisor', PLAIN = 'TEST_ONLY_role_plain';
const NAME = { leader: 'TEST_ONLY leader', employee1: 'TEST_ONLY employee1' };   /* اسمُ الحساب في العُدّة («TEST_ONLY » + نوعه) — والتقريرُ يحفظ الرئيسَ باسمه */
const S1 = 'TEST_ONLY_shift_A', S2 = 'TEST_ONLY_shift_B';

async function put(W, key, value) {
  if (isOperationalFixtureKey(W.env, key)) return replaceOperationalFixture(W.env, key, value);
  const rev = W.DB.q('SELECT rev FROM revs WHERE k=?', key)[0]?.rev || 0;
  await W.DB.batch(W.W.kvPutStmts(W.env, 'kv', key, JSON.stringify(value)).concat([
    W.DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,?2) ON CONFLICT(k) DO UPDATE SET rev=excluded.rev').bind(key, rev + 1),
    W.DB.prepare("INSERT INTO meta(k,v) VALUES('rev',CAST(COALESCE((SELECT CAST(v AS INTEGER) FROM meta WHERE k='rev'),0)+1 AS TEXT)) ON CONFLICT(k) DO UPDATE SET v=excluded.v"),
  ]));
}
const roles = (people) => ({ v: 1, roles: [{ id: SUP, name: 'TEST_ONLY supervisory role', desc: '', sup: true, sys: {} }, { id: PLAIN, name: 'TEST_ONLY plain role', desc: '', sup: false, sys: {} }],
  people: Object.fromEntries(Object.entries(people).map(([who, role]) => [EKEYS[who], { role, ex: [] }])) });
const shift = (chief, rosterOf) => ({ pulled: true, roster: rosterOf.map((who) => ({ ekey: EKEYS[who], name: NAME[who], st: 'pr' })), leaders: { chief, deputy: '' }, ap: false });
async function inbox(W, who) {
  const r = await W.get(who); assert.equal(r.status, 200, who + ': inbox read'); assert.equal(r.json.ok, 1);
  return r.json.items;
}
async function emitShift(W, sh, tag) {
  /* V7 · د7 (البند ٨): المرسِلُ المديرُ العام لا مديرُ الوحدة — فالفاعلُ لا يُنبَّه بفعله، ومديرُ الوحدة مستلمٌ يُفحص */
  const r = await W.act('gm', { op: 'emit', type: 'rep_pull', dept: D1, vars: { 'الوردية': sh, 'اليوم': TODAY, 'المُعدّل': 'TEST_ONLY ' + tag } });
  assert.equal(r.status, 200, 'the general manager emits rep_pull for ' + sh + ': ' + JSON.stringify(r.json).slice(0, 200)); assert.equal(r.json.ok, 1);
  return r.json.id;
}
const has = (items, id) => items.some((x) => x.id === id);
const mid = (ref) => JSON.parse(Buffer.from(String(ref).slice(3), 'base64url').toString('utf8'))[1];   /* «nf:» + base64url([النطاق, المعرّف]) */

test('[د5-ح · بند 11] رئيسُ الأمس لا يصله شيء اليوم · رئيسُ اليوم بلا صلاحيةٍ إشرافية لا يصله شيء · رئيسُ اليوم بها تصله تنبيهاتُ ورديته وحدها', { ...needs('dreport'), timeout: 120000 }, async () => {
  const W = await world();
  /* leader: دورٌ إشرافيّ الآن، ورئيسُ الوردية A أمس — لا اليوم · employee1: رئيسُ الوردية A اليوم (في صفّها)، ودورُه غيرُ إشرافيّ أولاً */
  await put(W, KROLES, roles({ leader: SUP, employee1: PLAIN }));
  await put(W, KREP, { [YESTERDAY]: { shifts: { [S1]: shift(NAME.leader, ['leader']) } }, [TODAY]: { shifts: { [S1]: shift(NAME.employee1, ['employee1']), [S2]: shift('', ['leader']) } } });
  const a1 = await emitShift(W, S1, 'pull A');
  assert.ok(has(await inbox(W, 'manager1'), a1), 'المدير يصله الحدث (هدف mgr) — الحدثُ مخزَّن ومرئيّ');
  assert.equal(has(await inbox(W, 'leader'), a1), false, 'رئيسُ الأمس (ولو بدورٍ إشرافيّ الآن) لا يصله تنبيهُ رئيس الوردية اليوم');
  assert.equal(has(await inbox(W, 'employee1'), a1), false, 'رئيسُ اليوم بلا صلاحيةٍ إشرافية لا يصله شيء');
  /* employee1 يُمنح الآن الدورَ الإشرافيّ: يصله حدثُ ورديته A، ولا يصله حدثُ الوردية B */
  await put(W, KROLES, roles({ leader: SUP, employee1: SUP }));
  const b1 = await emitShift(W, S2, 'pull B');
  const e1 = await inbox(W, 'employee1');
  assert.ok(has(e1, a1), 'رئيسُ اليوم بصلاحيةٍ إشرافية يصله تنبيهُ ورديته (A)');
  assert.equal(has(e1, b1), false, 'ولا يصله تنبيهُ ورديةٍ أخرى (B)');
  const l1 = await inbox(W, 'leader');
  assert.equal(has(l1, a1) || has(l1, b1), false, 'رئيسُ الأمس لا يصله تنبيهُ أيّ وردية');
  /* الهدفُ المخزَّن نفسُه: «lead:<الوردية>» لا «lead» العام */
  const t = W.DB.q("SELECT value FROM notification_targets WHERE kind='role' AND message_id IN (?1,?2) ORDER BY value", mid(a1), mid(b1)).map((r) => r.value);
  assert.deepEqual(t, ['lead:' + S1, 'lead:' + S2, 'mgr', 'mgr'].sort());
  /* سحبُ الدور الإشرافيّ الآن يُسقطه فوراً (الصلاحيةُ تُقرأ وقتَ القراءة) */
  await put(W, KROLES, roles({ leader: SUP, employee1: PLAIN }));
  assert.equal(has(await inbox(W, 'employee1'), a1), false, 'بلا الدور الإشرافيّ الآن لا يصله تنبيهُ ورديته');
  /* رئيسُ ورديةٍ اليوم وهو ليس من صفّها ولا من جدولها: ليست ورديتَه فلا يُعدّ رئيساً */
  await put(W, KREP, { [TODAY]: { shifts: { [S1]: shift(NAME.leader, ['employee1']), [S2]: shift('', ['leader']) } } });
  assert.equal(has(await inbox(W, 'leader'), a1), false, 'رئيسٌ في تقرير ورديةٍ غير ورديته اليوم لا يصله تنبيهُها');
  await put(W, KREP, { [TODAY]: { shifts: { [S2]: shift(NAME.leader, ['leader']) } } });
  const l2 = await inbox(W, 'leader');
  assert.ok(has(l2, b1) && !has(l2, a1), 'رئيسُ ورديته (B) اليوم بدورٍ إشرافيّ: تنبيهُ B وحده');
});

test('[د5-ح · بند 11] حدثُ الرئيس بلا متغيّر الوردية يُخزَّن «lead» عاماً ويصل رئيسَ ورديته اليوم وحده', needs('dreport'), async () => {
  const W = await world();
  /* حدثٌ بلا متغيّر الوردية لنوعٍ يستهدف الرئيس (rep_pull) — يُخزَّن «lead» عاماً: يصل رئيسَ أيّ وردية اليوم بدوره الإشرافيّ */
  await put(W, KROLES, roles({ employee1: SUP }));
  await put(W, KREP, { [TODAY]: { shifts: { [S1]: shift(NAME.employee1, ['employee1']) } } });
  const r = await W.act('manager1', { op: 'emit', type: 'rep_pull', dept: D1, vars: { 'اليوم': TODAY } });
  assert.equal(r.status, 200); const id = r.json.id;
  assert.deepEqual(W.DB.q("SELECT value FROM notification_targets WHERE kind='role' AND message_id=?1 ORDER BY value", mid(id)).map((x) => x.value), ['lead', 'mgr']);
  assert.ok(has(await inbox(W, 'employee1'), id), 'رئيسُ ورديته اليوم يصله حدثُ الرئيس العام');
  assert.equal(has(await inbox(W, 'leader'), id), false, 'ومن ليس رئيساً اليوم لا يصله');
  assert.ok(IDS.leader && IDS.employee1);
});
