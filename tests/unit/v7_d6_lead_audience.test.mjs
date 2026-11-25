/* V7 · د6 (بند «رئيس الوردية» — LEAD_D6) — جمهورُ «lead» من تقرير اليوم التشغيلي الحالي وحده، لورديته وحدها، ولمن يملك الآن صلاحيةً إشرافية.
   الحسابُ في الخادم وحده (019-notifications nfLeadShifts · nfSupNow · nfLeadTargets) — وهذا الملفُّ يكمّل v7_d5h_nf_shift_leader بالحالات الناقصة:
   نائبُ اليوم يستلم · ورديةٌ تمتدّ بعد منتصف الليل (اليومُ التشغيليُّ نفسُه بعد 00:00، ثم رئيسُ اليوم التالي بعد انتهائه) · لا تقرير اليوم ⇒ لا مستلمَ من lead
   والمديرُ يستلم · رئيسُ ورديةٍ أخرى اليوم لا يستلم تنبيهَ غيرها · التنبيهاتُ المرسلة لا تُعاد كتابتُها. العاملُ الحقيقي · SQLite في الذاكرة · TEST_ONLY.
   الساعةُ تُثبَّت (Date.now) على أوقاتٍ ماضيةٍ بتوقيت الرياض لحالة منتصف الليل وحدها، وتُعاد بعدها. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, D1, IDS, EKEYS } from './notifications_review_fx.mjs';
import { isOperationalFixtureKey, replaceOperationalFixture } from './operational_legacy_seed_fx.mjs';
import { needs } from './harness.mjs';

/* يومُ الرياض التقويميّ — V7 · 53 تقويم: ميلاديٌّ بمفتاح ISO (YYYY-MM-DD) كما يقرؤه الخادم (nfDeptOpDay · pfDayAt) ويكتبه BassamCal.gKey */
const HF = new Intl.DateTimeFormat('en-u-ca-gregory-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' });
const P2 = (n) => String(n).padStart(2, '0');
const dk = (ts) => { const o = {}; HF.formatToParts(new Date(ts)).forEach((p) => { o[p.type] = +p.value; }); return o.year + '-' + P2(o.month) + '-' + P2(o.day); };
const DAY = 86400000, H = 3600000;
const KROLES = 'bsdept:' + D1 + ':bassam_roles_v1', KREP = 'bsdept:' + D1 + ':bassam_dreport_v1';
const SUP = 'TEST_ONLY_role_supervisor', PLAIN = 'TEST_ONLY_role_plain';
const NAME = { leader: 'TEST_ONLY leader', employee1: 'TEST_ONLY employee1' };
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
const shift = (leaders, rosterOf, def) => Object.assign({ pulled: true, roster: rosterOf.map((who) => ({ ekey: EKEYS[who], name: NAME[who], st: 'pr' })), leaders: Object.assign({ chief: '', deputy: '' }, leaders), ap: false }, def ? { def } : {});
const has = (items, id) => items.some((x) => x.id === id);
async function inbox(W, who) { const r = await W.get(who); assert.equal(r.status, 200, who + ': inbox read'); assert.equal(r.json.ok, 1); return r.json.items; }
async function emit(W, vars, tag) {
  /* V7 · د7 (البند ٨): المرسِلُ المديرُ العام — الفاعلُ لا يُنبَّه بفعله، ومديرُ الوحدة مستلمٌ يُفحص */
  const r = await W.act('gm', { op: 'emit', type: 'rep_pull', dept: D1, vars: Object.assign({ 'المُعدّل': 'TEST_ONLY ' + tag }, vars) });
  assert.equal(r.status, 200, tag + ': ' + JSON.stringify(r.json).slice(0, 200)); assert.equal(r.json.ok, 1);
  return r.json.id;
}
/* الرسائلُ وأهدافُها كما خُزّنت (لا حالةُ القراءة) */
const sent = (DB) => ['notification_messages', 'notification_targets'].map((t) => JSON.stringify(DB.q('SELECT * FROM ' + t + ' ORDER BY 1, 2')));
async function atClock(ts, fn) { const real = Date.now; Date.now = () => ts; try { return await fn(); } finally { Date.now = real; } }

test('[د6 · LEAD] today\'s DEPUTY receives his shift\'s notification · a leader of another shift today does not · no report today ⇒ no «lead» recipient, the manager still receives · sent notifications are not rewritten', needs('dreport'), async () => {
  const W = await world(), TODAY = dk(Date.now());
  assert.ok(sent(W.DB).every((x) => typeof x === 'string'), 'the notification tables exist');
  await put(W, KROLES, roles({ leader: SUP, employee1: SUP }));
  /* employee1 نائبُ الوردية A اليوم (ورئيسُها غيرُه) · leader رئيسُ الوردية B اليوم */
  await put(W, KREP, { [TODAY]: { shifts: { [S1]: shift({ chief: 'TEST_ONLY someone else', deputy: NAME.employee1 }, ['employee1']), [S2]: shift({ chief: NAME.leader }, ['leader']) } } });
  const a = await emit(W, { 'الوردية': S1, 'اليوم': TODAY }, 'A');
  assert.ok(has(await inbox(W, 'employee1'), a), 'today\'s deputy of shift A receives the shift-A notification');
  assert.equal(has(await inbox(W, 'leader'), a), false, 'the chief of shift B today does not receive shift A\'s');
  assert.ok(has(await inbox(W, 'manager1'), a), 'the manager receives');
  assert.equal(has(await inbox(W, 'gm'), a), false, 'the actor (the general manager who emitted) is not notified of his own action');
  const b = await emit(W, { 'الوردية': S2, 'اليوم': TODAY }, 'B');
  assert.ok(has(await inbox(W, 'leader'), b), 'the chief of B receives B');
  assert.equal(has(await inbox(W, 'employee1'), b), false, 'the deputy of A does not receive B');
  /* لا تقرير لليوم ⇒ لا مستلمَ من lead (لا رجوعَ إلى يومٍ سابق) — والمديرُ يستلم كما هو */
  const before = sent(W.DB);
  await put(W, KREP, { [dk(Date.now() - 2 * DAY)]: { shifts: { [S1]: shift({ chief: NAME.employee1 }, ['employee1']), [S2]: shift({ chief: NAME.leader }, ['leader']) } } });
  const c = await emit(W, { 'الوردية': S1, 'اليوم': TODAY }, 'none'), g = await emit(W, { 'اليوم': TODAY }, 'general');
  for (const who of ['employee1', 'leader']) { const it = await inbox(W, who); assert.equal(has(it, c) || has(it, g) || has(it, a) || has(it, b), false, who + ': no report today ⇒ no «lead» notification (old report days do not count)'); }
  const m = await inbox(W, 'manager1');
  assert.ok(has(m, c) && has(m, g) && has(m, a) && has(m, b), 'the manager still receives every one');
  /* المرسلُ سابقاً لا يُمسّ: الرسائلُ وأهدافُها المخزّنة قبل التغيير كما هي (القراءةُ تحسب الجمهورَ ولا تكتب) */
  const after = sent(W.DB);
  const ids = W.DB.q('SELECT * FROM notification_targets ORDER BY 1, 2').length;
  assert.ok(ids > 0);
  for (const [i, t] of ['notification_messages', 'notification_targets'].entries()) {
    const old = JSON.parse(before[i]), now = JSON.parse(after[i]);
    assert.deepEqual(now.slice(0, old.length).map((r) => JSON.stringify(r)).filter((r) => !old.map((o) => JSON.stringify(o)).includes(r)), [], t + ': the rows stored before are byte-identical after the change (only the two new emits are added)');
    assert.ok(now.length >= old.length);
  }
});

test('[د6 · LEAD] a shift that runs past midnight: after 00:00 it is still the same operational day (its leader receives); after it ends, the next day\'s leader receives and the night\'s does not', needs('dreport'), async () => {
  const W = await world();
  /* منتصفُ ليل الرياض (UTC+3 ثابت) لأمس: X — ورديةٌ ليلية 22:00 → 06:00 بدأت يوم X-1 */
  const midToday = Math.floor((Date.now() + 3 * H) / DAY) * DAY - 3 * H, X = midToday - DAY, T1 = X + 1 * H, T2 = X + 7 * H;
  const NIGHT = { tStart: '22:00', tEnd: '06:00' };
  await put(W, KROLES, roles({ leader: SUP, employee1: SUP }));
  await put(W, KREP, {
    [dk(X - 2 * H)]: { shifts: { [S1]: shift({ chief: NAME.employee1 }, ['employee1'], NIGHT) } },    /* يومُ بدء الليلة (X-1) */
    [dk(X + 2 * H)]: { shifts: { [S1]: shift({ chief: NAME.leader }, ['leader', 'employee1'], NIGHT) } },   /* اليومُ التالي (X) */
  });
  assert.notEqual(dk(X - 2 * H), dk(X + 2 * H));
  await atClock(T1, async () => {
    const n = await emit(W, { 'الوردية': S1, 'اليوم': dk(X - 2 * H) }, 'night 01:00');
    assert.ok(has(await inbox(W, 'employee1'), n), '01:00 — the night shift has not ended: its operational day is the day it started, and its chief receives');
    assert.equal(has(await inbox(W, 'leader'), n), false, 'the next day\'s chief does not yet');
  });
  await atClock(T2, async () => {
    const d = await emit(W, { 'الوردية': S1, 'اليوم': dk(X + 2 * H) }, 'day 07:00');
    assert.ok(has(await inbox(W, 'leader'), d), '07:00 — the night ended: the next operational day\'s chief receives');
    assert.equal(has(await inbox(W, 'employee1'), d), false, 'the night\'s chief no longer receives');
  });
  assert.ok(IDS.leader);
});
