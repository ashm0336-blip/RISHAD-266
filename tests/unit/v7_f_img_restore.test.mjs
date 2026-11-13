/* V7-F · owner decision 2, condition (ii) — «اختبار يثبت سلوك استعادة نسخة احتياطية تشير إلى صورة حُذفت
   (لا تفشل الاستعادة، والصورة المفقودة تُعرض كمفقودة)». Real worker, the verified restore route /api/backup/restore.
   Before (develop 5add483): a backup mentioning an image the platform no longer held stopped the WHOLE restore — 409
   'backup-image-reuse-rejected' when the file carried its bytes (every v4 backup does), 409 'restore-image-body-missing' when it did not.
   With the sweep now really deleting images after their grace, every backup older than that would have become unrestorable.
   Now: the restore goes on; no image byte is written by a restore (unchanged: R2 is never put/deleted); the reference is kept as it is and
   READS AS MISSING — 404 to those who read the record, the unified refusal to anyone else; inspection and receipt say so. Every other
   image gate (present-but-unbound, orphan, foreign, mismatching, unreferenced, staged) still refuses the whole restore (atomic_restore_images). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, ok } from './atomic_restore_review_fx.mjs';
import { D1, IDS, copy } from './notifications_review_fx.mjs';
import { replaceOperationalFixture, inspectOperationalFixture } from './operational_legacy_seed_fx.mjs';

const OPTIONS = 'bsdept:' + D1 + ':bassam_options_v1';
const ID = 'img_testonly_swept', KEPT = 'img_testonly_kept', BODY = 'data:image/png;base64,VEVTVF9PTkxZ';
let rid = 0;
function r2(B, objects = {}) {   /* a recording object store: a restore must never put or delete */
  const calls = [], map = new Map(Object.entries(objects));
  B.env.IMG_R2 = { get: async (k) => { calls.push(['get', k]); return map.has(k) ? { text: async () => map.get(k) } : null; },
    put: async (k, v) => { calls.push(['put', k]); map.set(k, v); }, delete: async (k) => { calls.push(['delete', k]); map.delete(k); } };
  return { calls, map };
}
async function payload(B, images, phase = 'commit', who = 'super', scope = { kind: 'full' }) {
  const restored = JSON.stringify({ type: [ID, KEPT], work: ['TEST_ONLY restored'] }), request = await B.body({ scope }), full = scope.kind === 'full';
  const file = { app: 'bassam-crowd', version: 3, kind: scope.kind, data: full ? { ...request.keys, [OPTIONS]: restored } : { bassam_options_v1: restored },
    domains: Object.fromEntries(Object.entries(request.domains).filter(([name]) => name !== 'operations')),
    manifest: { ...request.manifest, version: 3, domains: Object.fromEntries(Object.entries(request.manifest.domains).filter(([name]) => name !== 'operations')), keys: request.manifest.keys.concat(full ? [OPTIONS] : ['bassam_options_v1']) } };
  if (images) file.idbImages = images;
  return { version: 1, uid: IDS[who], requestId: 'TEST_ONLY_v7f_restore_' + ++rid, scope, mode: 'replace', reason: 'TEST_ONLY v7f restore', base: request.base, backup: file, phase, legacyConsent: false };
}
/* the platform still holds KEPT (bound to the record); ID was swept after its grace: no body row, no owner row, no object */
async function seed(B) {
  await replaceOperationalFixture(B.env, OPTIONS, { type: [KEPT], work: ['TEST_ONLY before'] });
  await B.DB.batch([...B.W.kvPutStmts(B.env, 'imgs', KEPT, '~r2~'),
    B.DB.prepare('INSERT INTO imgown(img,st,k,uid,dept,ts) VALUES(?1,?2,?3,?4,?5,1)').bind(KEPT, 'bound', OPTIONS, IDS.super, D1),
    B.DB.prepare('INSERT INTO imgref(img,k) VALUES(?1,?2)').bind(KEPT, OPTIONS)]);
  return r2(B, { ['img/' + KEPT]: BODY });
}
const get = async (B, who, id) => { const r = await B.W.default.fetch(new Request('http://x/api/img/' + id, { headers: { Cookie: 'bs_tok=TEST_ONLY_session_' + who } }), B.env); return { status: r.status, text: await r.text() }; };

for (const carried of [true, false]) {
  test('a backup that mentions a swept image ' + (carried ? 'and CARRIES its bytes' : 'without its bytes') + ' is restored; the image reads as missing; no image byte is written', async () => {
    const B = await world(), S = await seed(B), images = carried ? { [ID]: BODY, [KEPT]: BODY } : { [KEPT]: BODY };
    const inspected = ok(await B.api('super', '/api/backup/restore', await payload(B, images, 'inspect')));
    assert.equal(inspected.inspection.summary.imagesMissing, 1, 'the confirmation step tells the admin before anything is written');
    assert.equal(inspected.inspection.summary.imagesReused, 1);
    const ack = ok(await B.api('super', '/api/backup/restore', await payload(B, images)));
    assert.equal(ack.ok, 1, 'the restore does not fail'); assert.deepEqual(ack.warnings, ['images-missing']); assert.equal(ack.imagesReused, 1);
    assert.deepEqual(inspectOperationalFixture(B.env, OPTIONS), { type: [ID, KEPT], work: ['TEST_ONLY restored'] }, 'the record is restored with its reference as it was');
    /* stored truth: nothing was invented for the missing image, the held one is untouched */
    assert.equal(B.DB.q('SELECT COUNT(*) n FROM imgs WHERE k=?1', ID)[0].n, 0, 'no body row');
    assert.equal(B.DB.q('SELECT COUNT(*) n FROM imgown WHERE img=?1', ID)[0].n, 0, 'no owner row');
    assert.deepEqual(copy(B.DB.q('SELECT k FROM imgref WHERE img=?1', ID)), [{ k: OPTIONS }], 'the reference is indexed');
    assert.equal(S.map.has('img/' + ID), false, 'no object');
    assert.equal(S.calls.some((c) => c[0] === 'put' || c[0] === 'delete'), false, 'R2 is never written by a restore · ' + JSON.stringify(S.calls));
    assert.deepEqual(copy(B.DB.q('SELECT st,k FROM imgown WHERE img=?1', KEPT)), [{ st: 'bound', k: OPTIONS }]); assert.equal(S.map.get('img/' + KEPT), BODY);
    /* how it reads */
    for (const who of ['super', 'manager1']) { const g = await get(B, who, ID); assert.equal(g.status, 404, who + ': MISSING'); assert.equal(g.text, ''); }
    const other = await get(B, 'manager2', ID); assert.equal(other.status, 403); assert.deepEqual(JSON.parse(other.text), { ok: 0, err: 'forbidden' }, 'another unit: the unified refusal');
    assert.equal((await get(B, 'manager1', KEPT)).text, BODY, 'the image the platform holds still reads');
    /* a second, idempotent delivery of the same request replays the same receipt */
  });
}

test('the bytes of a swept image come back only by a real upload: after it, the same backup restores it as a normal reused image', async () => {
  const B = await world(), S = await seed(B);
  /* the platform admin uploads the bytes he holds (PUT /api/img) and saves them into the record — the ordinary bind path */
  const up = await B.W.default.fetch(new Request('http://x/api/img/' + ID, { method: 'PUT', headers: { Cookie: 'bs_tok=TEST_ONLY_session_super', Origin: 'http://x', 'Content-Type': 'text/plain' }, body: BODY }), B.env);
  assert.equal(up.status, 200);
  assert.equal(B.DB.q('SELECT st FROM imgown WHERE img=?1', ID)[0].st, 'claim');
  /* an upload that is not bound yet is still refused by the reuse gate (unchanged) */
  const refused = await B.api('super', '/api/backup/restore', await payload(B, { [ID]: BODY, [KEPT]: BODY }));
  assert.equal(refused.status, 409); assert.equal(refused.json.err, 'backup-image-reuse-rejected');
  /* without the archive proof the same file restores and binds the admin's own upload to the record */
  const ack = ok(await B.api('super', '/api/backup/restore', await payload(B, undefined)));
  assert.equal(ack.ok, 1); assert.deepEqual(ack.warnings, []);
  assert.deepEqual(copy(B.DB.q('SELECT st,k FROM imgown WHERE img=?1', ID)), [{ st: 'bound', k: OPTIONS }]);
  assert.equal((await get(B, 'manager1', ID)).text, BODY, 'restored and readable by the unit');
  assert.equal(S.map.get('img/' + ID), BODY);
});

/* ── the independent review, finding 7 — the paradox: a backup that carries the bytes of an image still here as an ORPHAN (its reference was removed,
   its 30 days are running) was refused 409 even for the platform admin — and once the sweep had deleted the orphan, the very same file restored,
   with the image missing. So the file was restorable only after the image it carries was lost.
   Now, inside the existing gates and still without writing one image byte: whoever may re-bind the orphan (decision 1: the platform admin, or a
   record of its original unit) restores the file, and the restore re-binds the orphan that is still there — its stored bytes must equal the file's. */
const ORPH = 'img_testonly_orph', D2 = 'TEST_ONLY_department_2', OTHER = 'data:image/png;base64,T1RIRVJfVjdG';
async function payloadOf(B, ids, images, { who = 'super', scope = { kind: 'full' }, dept = D1 } = {}) {
  const key = 'bsdept:' + dept + ':bassam_options_v1', restored = JSON.stringify({ type: ids, work: ['TEST_ONLY restored'] }), request = await B.body({ scope }), full = scope.kind === 'full';
  const file = { app: 'bassam-crowd', version: 3, kind: scope.kind, data: full ? { ...request.keys, [key]: restored } : { bassam_options_v1: restored },
    domains: Object.fromEntries(Object.entries(request.domains).filter(([name]) => name !== 'operations')),
    manifest: { ...request.manifest, version: 3, domains: Object.fromEntries(Object.entries(request.manifest.domains).filter(([name]) => name !== 'operations')), keys: request.manifest.keys.concat(full ? [key] : ['bassam_options_v1']) } };
  if (images) file.idbImages = images;
  return { version: 1, uid: IDS[who], requestId: 'TEST_ONLY_v7f_orph_' + ++rid, scope, mode: 'replace', reason: 'TEST_ONLY v7f orphan restore', base: request.base, backup: file, phase: 'commit', legacyConsent: false };
}
async function seedOrphan(B, body = BODY) {
  const S = await seed(B);
  await B.DB.batch([...B.W.kvPutStmts(B.env, 'imgs', ORPH, '~r2~'),
    B.DB.prepare('INSERT INTO imgown(img,st,k,uid,dept,ts) VALUES(?1,?2,?3,?4,?5,?6)').bind(ORPH, 'orphan', '', '', D1, Date.now())]);
  S.map.set('img/' + ORPH, body);
  return S;
}
const ownOf = (B, id) => copy(B.DB.q('SELECT st,k,dept FROM imgown WHERE img=?1', id))[0] || null;
const writes = (S) => S.calls.filter((c) => c[0] === 'put' || c[0] === 'delete');

test('finding 7 · the platform admin restores a backup that carries a still-present orphan: the orphan is re-bound to the restored record, no image byte is written, and it is never swept', async () => {
  const B = await world(), S = await seedOrphan(B);
  assert.equal(D2, (await import('./notifications_review_fx.mjs')).D2);
  const ack = await B.api('super', '/api/backup/restore', await payloadOf(B, [ORPH, KEPT], { [ORPH]: BODY, [KEPT]: BODY }));
  assert.equal(ack.status, 200, JSON.stringify(ack.json).slice(0, 300)); assert.equal(ack.json.ok, 1); assert.deepEqual(ack.json.warnings, [], 'nothing is missing'); assert.equal(ack.json.imagesReused, 2);
  assert.deepEqual(ownOf(B, ORPH), { st: 'bound', k: OPTIONS, dept: D1 }, 're-bound to the record that shows it');
  assert.deepEqual(copy(B.DB.q('SELECT k FROM imgref WHERE img=?1', ORPH)), [{ k: OPTIONS }]);
  assert.deepEqual(writes(S), [], 'the image store is not written'); assert.equal(S.map.get('img/' + ORPH), BODY);
  assert.equal((await get(B, 'manager1', ORPH)).text, BODY, 'its unit reads it again');
  B.DB.exec("UPDATE imgown SET ts = ts - " + 31 * 864e5 + " WHERE img = '" + ORPH + "'");
  B.DB.exec("DELETE FROM guard WHERE gk = 'rl:img-sweep'"); assert.equal((await B.api('super', '/api/overview')).status, 200);   /* a pass of the sweep */
  assert.deepEqual(ownOf(B, ORPH), { st: 'bound', k: OPTIONS, dept: D1 }, '31 days later it is a bound image, not a candidate'); assert.equal(S.map.get('img/' + ORPH), BODY);
});

test('finding 7 · the gate is not weakened: different bytes, or an actor who may not re-bind the orphan, keep the 409 and change nothing', async () => {
  /* the file's bytes differ from the orphan's stored bytes */
  let B = await world(), S = await seedOrphan(B, OTHER), before = ownOf(B, ORPH);
  let r = await B.api('super', '/api/backup/restore', await payloadOf(B, [ORPH, KEPT], { [ORPH]: BODY, [KEPT]: BODY }));
  assert.equal(r.status, 409, JSON.stringify(r.json).slice(0, 200)); assert.equal(r.json.err, 'backup-image-reuse-rejected');
  assert.deepEqual(ownOf(B, ORPH), before); assert.deepEqual(writes(S), []); assert.equal(S.map.get('img/' + ORPH), OTHER);
  /* another unit's manager, a unit-scope restore of a file that carries the foreign orphan: refused (in this fixture already by the restore policy,
     before the image gate is reached) — and nothing about the orphan changes */
  B = await world(); S = await seedOrphan(B); before = ownOf(B, ORPH);
  r = await B.api('manager2', '/api/backup/restore', await payloadOf(B, [ORPH], { [ORPH]: BODY }, { who: 'manager2', scope: { kind: 'dept', departmentId: D2 }, dept: D2 }));
  assert.ok(r.status === 409 || r.status === 403, 'another unit: ' + r.status + ' ' + JSON.stringify(r.json).slice(0, 200)); assert.notEqual(r.json.ok, 1);
  assert.equal(JSON.stringify(r.json).includes(ORPH), false, 'and the refusal does not name the image');
  assert.deepEqual(ownOf(B, ORPH), before); assert.deepEqual(writes(S), []);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM imgref WHERE img=?1', ORPH)[0].n, 0);
});

/* ── the independent review, low item — a FULL replace-restore that no longer carries a unit removes it without passing through the unit-delete
   route, which is where the orphans of a deleted unit were stamped (decision 3). The restore now stamps them in its own commit: a unit created
   later under the same id inherits nothing (054 imgOrphanRebindOk refuses a stamped orphan to everyone but the platform admin). */
test('low · a full replace-restore that drops a unit stamps that unit\'s orphans in the same commit; the orphans of the units it keeps are untouched', async () => {
  const B = await world(), scope = { kind: 'full' }, request = await B.body({ scope }), K = 'bassam_depts_v1', units = JSON.parse(request.keys[K]);
  assert.ok(units.some((d) => d.id === D2) && units.some((d) => d.id === D1));
  await B.DB.batch([B.DB.prepare('INSERT INTO imgown(img,st,k,uid,dept,ts) VALUES(?1,?2,?3,?4,?5,?6)').bind('img_testonly_d2orph', 'orphan', '', 'TEST_ONLY_u2', D2, Date.now()),
    B.DB.prepare('INSERT INTO imgown(img,st,k,uid,dept,ts) VALUES(?1,?2,?3,?4,?5,?6)').bind('img_testonly_d1orph', 'orphan', '', 'TEST_ONLY_u1', D1, Date.now())]);
  const gone = (k) => k.startsWith('bsdept:' + D2 + ':'), keep = (x) => (Array.isArray(x) ? x.filter((d) => !(d && d.scope && d.scope.departmentId === D2)) : x);
  const data = Object.fromEntries(Object.entries(request.keys).filter(([k]) => !gone(k))); data[K] = JSON.stringify(units.filter((d) => d.id !== D2));
  const file = { app: 'bassam-crowd', version: 3, kind: 'full', data,
    domains: Object.fromEntries(Object.entries(request.domains).filter(([name]) => name !== 'operations').map(([name, v]) => [name, keep(v)])),
    manifest: { ...request.manifest, version: 3, departments: (request.manifest.departments || []).filter((d) => d !== D2),
      domains: Object.fromEntries(Object.entries(request.manifest.domains).filter(([name]) => name !== 'operations')), keys: request.manifest.keys.filter((k) => !gone(k)) } };
  const ack = ok(await B.api('super', '/api/backup/restore', { version: 1, uid: IDS.super, requestId: 'TEST_ONLY_v7f_dropunit', scope, mode: 'replace', reason: 'TEST_ONLY v7f drop unit', base: request.base, backup: file, phase: 'commit', legacyConsent: false }));
  assert.equal(ack.ok, 1);
  assert.equal(JSON.parse(B.DB.q('SELECT v FROM kv WHERE k=?1', K)[0].v).some((d) => d.id === D2), false, 'the unit is no longer on the platform');
  assert.deepEqual(copy(B.DB.q("SELECT st,uid,dept FROM imgown WHERE img='img_testonly_d2orph'")), [{ st: 'orphan', uid: '~unit-deleted~', dept: D2 }], 'its orphan is stamped: the platform admin\'s for good');
  assert.deepEqual(copy(B.DB.q("SELECT st,uid,dept FROM imgown WHERE img='img_testonly_d1orph'")), [{ st: 'orphan', uid: 'TEST_ONLY_u1', dept: D1 }], 'a kept unit\'s orphan still returns to its own unit');
});
