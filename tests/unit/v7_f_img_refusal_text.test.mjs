/* V7-F · owner condition (2026-11-13): the one remaining refusal of a record for its escapes (a record too large / too deeply nested to
   decode within the bound) must tell the USER, in plain Arabic, that the record is larger than the limit — not an error code, not "\u".
   Two places carry the text: the server's `detail` and the client's reason map (the toast «لم يُحفظ تعديلك على … — <reason>»), which
   before this showed the fallback «صلاحيتك لا تشمله» for 'img-escape' and 'img-limit' — a wrong reason. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TAG, dk, D2, both, scene } from './v7_f_img_fx.mjs';

const chain = (c, levels) => { for (let l = 0; l < levels; l++) c = c.replace(/\\/g, '\\u005c'); return c; };
const plain = (s, what) => { assert.ok(s.includes('أكبر من الحد'), what + ' says the record is larger than the limit: ' + s); assert.ok(!/[A-Za-z\\]/.test(s), what + ' has no code, no Latin, no backslash: ' + s); };

both(test, 'a record past the decoding work bound is refused with a plain Arabic reason: larger than the limit', async (mode) => {
  const { W, S } = await scene(mode), KP2 = dk(D2, 'profile');
  const heavy = JSON.stringify({ t: TAG, pad: 'x'.repeat(5e6), note: chain('C:\\u0041bc', 50) }), r = await W.C.save(S.mgr2, { [KP2]: heavy });
  const d = (r.j.denied || {})[KP2] || {};
  assert.equal(d.why, 'img-escape'); plain(String(d.detail || ''), 'server detail');
});

test('the client names both image refusals in Arabic instead of the permission fallback', () => {
  const src = readFileSync(join(process.env.KIVO_SRC, 'api', '280-server-storage.js'), 'utf8');
  const get = (k) => { const m = new RegExp('WHY\\["' + k + '"\\]\\s*=\\s*"([^"]+)"').exec(src); assert.ok(m, 'WHY["' + k + '"] is defined'); return m[1]; };
  plain(get('img-escape'), 'client img-escape');
  const lim = get('img-limit'); assert.ok(/صور/.test(lim) && !/[A-Za-z\\]/.test(lim), lim);
});
