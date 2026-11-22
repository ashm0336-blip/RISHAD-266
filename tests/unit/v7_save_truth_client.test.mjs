/* V7 · د5-هـ (أمن ١) — العميل: flushAsync() كان يُحلّ true لحفظٍ رُفض (settle يُسقط المفتاحَ المرفوض من الطابور فيصير «نظيفاً»)، فيظنّ المستدعي
   أن تعديله حُفظ. الآن: رفضُ أيّ مفتاحٍ في الإقرار ⇒ false · وإقرارُ الخادم ok:0 (رُفض كلُّ شيء) إقرارٌ صالح يُحسم به الطابور — لا إعادةَ إرسالٍ بلا نهاية.
   الطابورُ الحقيقي (280) في vm، والخادمُ مُحاكى بردودٍ اصطناعية. TEST_ONLY. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadClient, sleep } from './k264_vm.mjs';

const USERS = 'bassam_auth_users_v1', PERMS = 'bassam_perms_v1';
const json = value => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
function queue(t, response) {
  const requests = [];
  const T = loadClient({
    boot: { srv: 1, cf: 1, uid: 'TEST_ONLY_truth_owner', v: 4, keys: { [USERS]: '[]', [PERMS]: '{}' }, revs: { [USERS]: 3, [PERMS]: 3 } },
    C: { req: async (route, options = {}) => {
      if (route === '/api/save') { const body = JSON.parse(options.body); requests.push(body); return json(response(body, requests.length)); }
      return json({ v: 4, keys: [] });
    } },
  });
  T.W.document.hidden = true;
  t.after(() => T.dispose());
  return { T, requests, api: T.W.KIVO.__BS_SRV };
}
const denyUsers = { why: 'users', cur: '[]', rev: 3 };

test('a denied key: flushAsync resolves false (it resolved true once the denied key left the queue)', async t => {
  for (const ok of [1, 0]) {   /* the answer of a server before this change (ok:1) and after it (ok:0) */
    const f = queue(t, () => ({ ok, v: 4, revs: {}, denied: { [USERS]: denyUsers }, conflicts: {} }));
    f.T.set(USERS, '[{"id":"TEST_ONLY refused"}]');
    assert.equal(await f.api.flushAsync(600), false, '★ ok:' + ok + ': a refused save is not reported saved');
    await sleep(150);
    assert.equal(f.requests.length, 1, 'ok:' + ok + ': the refusal settles the key — no resend');
    assert.equal(f.api.dirty(), false); assert.equal(f.T.get(USERS), '[]', 'the stored value is restored');
    assert.equal(f.api.denied(USERS), 1);
  }
});

test('a partly saved batch with a refused sibling: false — and a fully saved one: true', async t => {
  const f = queue(t, () => ({ ok: 1, v: 5, revs: { [PERMS]: 5 }, denied: { [USERS]: denyUsers }, conflicts: {} }));
  f.T.set(USERS, '[{"id":"TEST_ONLY refused"}]'); f.T.set(PERMS, '{"TEST_ONLY":1}');
  assert.equal(await f.api.flushAsync(600), false, '★ one refused key ⇒ the flush is not a success');
  const g = queue(t, (body) => ({ ok: 1, v: 5, revs: Object.fromEntries(Object.keys(body.set).map(k => [k, 5])), denied: {}, conflicts: {} }));
  g.T.set(PERMS, '{"TEST_ONLY":2}');
  assert.equal(await g.api.flushAsync(600), true);
});

test('an ok:0 answer that still reports a saved key is not a valid acknowledgement', async t => {
  const f = queue(t, () => ({ ok: 0, v: 5, revs: { [PERMS]: 5 }, denied: {}, conflicts: {} }));
  f.T.set(PERMS, '{"TEST_ONLY":3}');
  assert.equal(await f.api.flushAsync(300), false); assert.equal(f.api.dirty(), true, 'kept for a retry');
});
