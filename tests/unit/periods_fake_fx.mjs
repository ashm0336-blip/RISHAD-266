/* V7 · 53 (periodsui): the period wire of the TEST_ONLY fake servers in the client unit tests ($S/periods_api.md v2).
   A split resource is held whole in `docs[name]` (as the fixtures always did); this answers K@ (head), K@<p> and range=K@<grp>,
   and applies a save of K@<p> / del K@<p> back onto that whole document. The group of a period is computed here (the test is the server). */
export const SPLIT = { bassam_plan_v1: 'months', bassam_staffing_v3: '', bassam_rounds_v1: '', bassam_rounds_arc_v1: '', bassam_dreport_v1: '', bassam_tasks_v1: '' };
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const grpOf = (name, p) => (SPLIT[name] || /staffing/.test(name) ? p : p.indexOf('m:') === 0 ? p.slice(2) : (/^(\d+-\d+)-/.exec(p) || [])[1] || p);
function parts(doc, name) {
  const f = SPLIT[name], head = {}, periods = {};
  if (!doc || typeof doc !== 'object') return null;
  Object.keys(doc).forEach((k) => { if (f) head[k] = k === f ? {} : doc[k]; else if (k.indexOf('__') === 0) head[k] = doc[k]; else periods[k] = doc[k]; });
  if (f) { if (!own(head, f)) head[f] = {}; Object.assign(periods, doc[f] || {}); }
  return { head, periods };
}
/* keys (and range) of one read → { resources, absent, base, ranges } entries for the split keys; returns the keys it did not handle */
export function periodRead(url, docs, rev, out) {
  const keys = (url.searchParams.get('keys') || '').split(',').filter(Boolean), all = keys.slice(), rest = [];
  out.ranges = out.ranges || {};
  (url.searchParams.get('range') || '').split(',').filter(Boolean).forEach((r) => {
    const at = r.lastIndexOf('@'), K = r.slice(0, at), g = r.slice(at + 1), name = K.split(':').at(-1), P = parts(docs[name], name);
    out.ranges[r] = P ? Object.keys(P.periods).filter((p) => grpOf(name, p) === g).map((p) => K + '@' + p) : [];
    out.ranges[r].forEach((k) => { if (!all.includes(k)) all.push(k); });
  });
  for (const k of all) {
    const at = k.indexOf('@');
    if (at < 0) { rest.push(k); continue; }
    const name = k.slice(0, at).split(':').at(-1), p = k.slice(at + 1), P = parts(docs[name], name);
    const v = !P ? undefined : p === '' ? P.head : own(P.periods, p) ? P.periods[p] : undefined;
    out.base[k] = typeof rev === 'function' ? rev(k) : rev;
    if (v === undefined) out.absent.push(k); else out.resources[k] = JSON.parse(JSON.stringify(v));
  }
  return rest;
}
/* one saved key: K@<p> / K@ onto the whole document. Returns true when it was a period key */
export function periodSave(k, value, docs) {
  const at = k.indexOf('@');
  if (at < 0) return false;
  const name = k.slice(0, at).split(':').at(-1), p = k.slice(at + 1), f = SPLIT[name];
  const doc = docs[name] && typeof docs[name] === 'object' ? docs[name] : (docs[name] = f ? { [f]: {} } : {});
  if (p === '') { if (value) Object.keys(value).forEach((x) => { if (x !== f) doc[x] = value[x]; }); return true; }
  const box = f ? (doc[f] || (doc[f] = {})) : doc;
  if (value === undefined) delete box[p]; else box[p] = value;
  return true;
}
/* index=K… → out.index[K] = [{ p, grp, seq, rev }] in document order */
export function periodIndex(url, docs, rev, out) {
  (url.searchParams.get('index') || '').split(',').filter(Boolean).forEach((K) => {
    const name = K.split(':').at(-1), P = parts(docs[name], name);
    (out.index || (out.index = {}))[K] = P ? Object.keys(P.periods).map((p, seq) => ({ p, grp: grpOf(name, p), seq, rev: typeof rev === 'function' ? rev(K + '@' + p) : rev })) : [];
  });
}
/* V7 · 53 (basefix): every period of every split resource, from the (fake or real) server's index (280 index → want) — what the page asks for by
   month and then re-reads on «bassam:remote», which never reaches a page in another vm context. Used by attachTaskOperations and the hand-written stubs */
export async function loadAllPeriods(operations) {
  if (!operations || !operations.split) return;
  for (const name of operations.resources) {
    if (!operations.split(name)) continue;
    const ix = await operations.index(name);
    if (!ix || ix.ok !== 1) throw new Error('period index ' + name + ': ' + JSON.stringify(ix));
    const periods = ix.index.map((x) => x.p);
    if (periods.length) { const r = await operations.want(name, { periods, quiet: true }); if (!r || r.ok !== 1) throw new Error('period load ' + name + ': ' + JSON.stringify(r)); }
  }
}
