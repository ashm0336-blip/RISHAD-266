var KIVO_IDENTITY_MIGRATION = (function (M, S, R) {
  'use strict';
  /* ═══ Phase 4.4 (v24.8) + Phase 4.5 (v24.9 · IP‑01/IP‑02: إقفالُ هوية الموقع sid للطوابق الحالية ولقطة الشهر الجاري) — Identity Migration Rehearsal: محرّكُ بروفة ترحيل الهوية — قراءةٌ فقط (writes = 0) · حتميٌّ (البذرةُ + البيانات ⇒ مجموعةُ كتابةٍ واحدة) ═══
     ١) uid ثابتٌ لكل عنصرٍ قائم في plan.floors: يُشتقّ من بذرةٍ عشوائيةٍ آمنة (32 بايتاً من crypto.getRandomValues عند المنادي) بـSHA-256(seed · dept · path · attempt)،
        ويُفحص تفرّدُه على مجموعة الترحيل كاملةً (كلُّ uid قائمٍ في الخطة واللقطات والجولات والمرآة الجذرية عبر كلِّ الإدارات + المولَّد) — التصادمُ ⇒ attempt+1 وإعادة. لا يُغيَّر uid قائم.
     ٢) الانتشارُ إلى لقطات الأشهر والجولات بسلسلة نسبٍ مثبتة فقط: الطابقُ (sid أو الموضعُ المثبت) · النوعُ · الصفاتُ الثابتة (eid/id التدقيق · ser · cat …) · الهندسةُ (d · x,y · pts) —
        لا يُعتمد على label/code/num وحدها. التصنيف: exact · high · medium · ambiguous · unlinked. exact/high في مجموعة الكتابة (tier A)؛ medium معلَّقٌ للتأكيد (tier B)؛ ambiguous/unlinked لا يُمسّان (هويةٌ قديمة).
     ٣) sid لطوابق الجولات التاريخية: برهانُ النسب الموضعي من الكود (الإنشاءُ من لقطة الشهر بالموضع · الحذفُ يقصّ من الخطة واللقطات والجولات معاً · الإضافةُ تُلحق وتحشو · لا إعادةَ ترتيب) ومن البيانات (تداخلُ الهندسة مع طابق الخطة في الموضع نفسِه وأفضلُ بديل) — لا backfill موضعياً أعمى.
     ٤) emp[]: كلُّ رمزٍ قديم → ekey (eid الموظف) عند تفرّد الحلّ في سجلّ الإدارة؛ المرآةُ الجذرية plan.* تُسوَّى بالمثل. unknown يبقى مرئياً (يجب أن يكون 0).
     ٥) مجموعةُ كتابةٍ حتمية (ops مرتّبة) ببصمات قبل/بعد لكل مفتاح + تصميمُ الرجوع (عكسُ العمليات · استعادةُ القيمة الكاملة بحراسة rev) مع تحقّقٍ ذهاباً وإياباً. */
  function isObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function obj(x) { return isObj(x) ? x : {}; }
  function str(x) { return x == null ? '' : String(x); }
  function parseDay(k) { var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(k)); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null; }
  function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  var COLS = ['zones', 'gates', 'marks', 'paths'], EMP_COLS = ['zones', 'gates', 'marks'];
  var CLS = ['exact', 'high', 'medium', 'ambiguous', 'unlinked'];
  var AUTO = { exact: 1, high: 1 };          /* tier A — مجموعةُ الكتابة */
  var PENDING = { medium: 1 };               /* tier B — معلَّقٌ للتأكيد */
  /* ── SHA-256 (متزامن · نقي) — لاشتقاق uid حتمياً ولبصمات مجموعة الكتابة ── */
  var K256 = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  function utf8(s) { var out = [], i, c; s = String(s); for (i = 0; i < s.length; i++) { c = s.charCodeAt(i); if (c < 0x80) out.push(c); else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63)); else if (c >= 0xd800 && c < 0xdc00 && i + 1 < s.length) { var d = s.charCodeAt(++i); c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00); out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); } else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); } return out; }
  function sha256Hex(msg) {
    var b = utf8(msg), l = b.length, bitLen = l * 8, i, j;
    b.push(0x80); while ((b.length % 64) !== 56) b.push(0);
    for (i = 7; i >= 0; i--) b.push(i >= 4 ? 0 : (Math.floor(bitLen / Math.pow(2, i * 8)) & 0xff));
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], W = new Array(64);
    for (i = 0; i < b.length; i += 64) {
      for (j = 0; j < 16; j++) W[j] = (b[i + j * 4] << 24) | (b[i + j * 4 + 1] << 16) | (b[i + j * 4 + 2] << 8) | b[i + j * 4 + 3];
      for (j = 16; j < 64; j++) { var s0 = ((W[j - 15] >>> 7) | (W[j - 15] << 25)) ^ ((W[j - 15] >>> 18) | (W[j - 15] << 14)) ^ (W[j - 15] >>> 3), s1 = ((W[j - 2] >>> 17) | (W[j - 2] << 15)) ^ ((W[j - 2] >>> 19) | (W[j - 2] << 13)) ^ (W[j - 2] >>> 10); W[j] = (W[j - 16] + s0 + W[j - 7] + s1) | 0; }
      var a = H[0], bb = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (j = 0; j < 64; j++) { var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7)), ch = (e & f) ^ (~e & g), t1 = (h + S1 + ch + K256[j] + W[j]) | 0, S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10)), mj = (a & bb) ^ (a & c) ^ (bb & c), t2 = (S0 + mj) | 0; h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0; }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + bb) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    var hex = ''; for (i = 0; i < 8; i++) hex += ('00000000' + (H[i] >>> 0).toString(16)).slice(-8); return hex;
  }
  /* uid المرشَّح: 'u' + أوّل 25 رمزاً من تمثيل base36 لـSHA-256 — حتميٌّ للبذرة والمسار والمحاولة (≈128 بت) */
  function hexToBase36(hex) { var n = 0n, i; for (i = 0; i < hex.length; i++) n = n * 16n + BigInt(parseInt(hex.charAt(i), 16)); return n.toString(36); }
  function uidCandidate(seedHex, lineageKey, attempt) { return 'u' + hexToBase36(sha256Hex(seedHex + '|' + lineageKey + '|' + attempt)).slice(0, 25); }
  /* IP‑01: sid المرشَّح للطابق الحالي بلا sid: 's_' + أوّل 14 رمزاً من base36(SHA-256(seed|key|sid|attempt)) — صيغةُ BassamAudit.newId('s_') نفسُها (s_[0-9a-z]+) */
  function sidCandidate(seedHex, lineageKey, attempt) { return 's_' + hexToBase36(sha256Hex(seedHex + '|' + lineageKey + '|sid|' + attempt)).slice(0, 14); }
  function sidOf(f) { return isObj(f) && f.sid != null && f.sid !== '' ? String(f.sid) : null; }
  function isHexSeed(s) { return /^[0-9a-f]{64}$/.test(String(s || '')); }
  /* ── الهويةُ القديمة · الصفاتُ الثابتة · الهندسة ── */
  function uidOf(e) { return isObj(e) && e.uid != null && e.uid !== '' ? String(e.uid) : null; }
  function stableOf(col, e) { if (!isObj(e)) return null; if (col === 'paths') return e.id != null && e.id !== '' ? 'id:' + e.id : null; if (e.eid != null && e.eid !== '') return 'eid:' + e.eid; if (col === 'gates' && e.gid != null && e.leafNo != null) return 'leaf:' + e.gid + '/' + e.leafNo; return null; }
  function num(v) { var n = +v; return isFinite(n) ? String(Math.round(n * 1000) / 1000) : str(v); }
  function geoOf(col, e) { if (!isObj(e)) return null; if (col === 'zones') return typeof e.d === 'string' && e.d ? 'd:' + e.d : null; if (col === 'paths') { var p = arr(e.pts); if (!p.length) return null; var o = []; for (var i = 0; i < p.length; i++) o.push(num(obj(p[i]).x) + ',' + num(obj(p[i]).y)); return 'pts:' + o.join(';'); } return (e.x != null && e.y != null) ? 'xy:' + num(e.x) + ',' + num(e.y) : null; }
  function attrOf(col, e) { if (!isObj(e)) return null; var f = col === 'zones' ? ['code', 'ser', 'name', 'cat'] : col === 'gates' ? ['num', 'label', 'gid', 'pOf', 'leafNo'] : col === 'marks' ? ['label', 'kind'] : ['code', 'name', 'type']; var o = []; for (var i = 0; i < f.length; i++) o.push(str(e[f[i]])); return o.join('|'); }
  /* صفةٌ ثانوية ثابتة تُؤيّد تطابقَ الهندسة عند تغيّر الرمز (ser · cat · kind · type) */
  function secondaryEq(col, a, b) { var f = col === 'zones' ? ['ser', 'cat', 'name'] : col === 'gates' ? ['label', 'num', 'gtype'] : col === 'marks' ? ['kind', 'label'] : ['name', 'type']; for (var i = 0; i < f.length; i++) { var x = str(a[f[i]]), y = str(b[f[i]]); if (x !== '' && x === y) return f[i]; } return null; }
  function bboxOf(col, e) {
    if (!isObj(e)) return null; var xs = [], ys = [], i, m;
    if (col === 'zones' && typeof e.d === 'string') { var re = /(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g; while ((m = re.exec(e.d))) { xs.push(+m[1]); ys.push(+m[2]); } }
    else if (col === 'paths') { for (i = 0; i < arr(e.pts).length; i++) { var p = obj(e.pts[i]); if (p.x != null) { xs.push(+p.x); ys.push(+p.y); } } }
    else if (e.x != null && e.y != null) { xs.push(+e.x); ys.push(+e.y); }
    if (!xs.length) return null; var x0 = Math.min.apply(null, xs), y0 = Math.min.apply(null, ys); return { x: x0, y: y0, w: Math.max.apply(null, xs) - x0, h: Math.max.apply(null, ys) - y0 };
  }
  function bboxDist(a, b) { if (!a || !b) return Infinity; return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.w - b.w) + Math.abs(a.h - b.h); }
  var NEAR = 12;   /* وحداتُ خريطةٍ (من 1000) — «قريب» للتصنيف medium عند تطابق الصفات دون الهندسة */
  function legacyKey(col, e) { return str(stableOf(col, e)) + '#' + str(geoOf(col, e)) + '#' + str(attrOf(col, e)); }
  /* فهرسُ طابق خطة: stable → [idx] · geo → [idx] · attr → [idx] */
  function indexFloor(f) {
    var ix = {}; for (var c = 0; c < COLS.length; c++) { var col = COLS[c], a = arr(obj(f)[col]), st = {}, ge = {}, at = {}; for (var i = 0; i < a.length; i++) { var e = a[i]; if (!isObj(e)) continue; var s = stableOf(col, e), g = geoOf(col, e), t = attrOf(col, e); if (s) (st[s] = st[s] || []).push(i); if (g) (ge[g] = ge[g] || []).push(i); if (t != null) (at[t] = at[t] || []).push(i); } ix[col] = { st: st, ge: ge, at: at, n: a.length }; }
    return ix;
  }
  function geoSet(f) { var s = {}, n = 0; for (var c = 0; c < COLS.length; c++) { var col = COLS[c], a = arr(obj(f)[col]); for (var i = 0; i < a.length; i++) { var g = geoOf(col, a[i]); if (g) { s[col + '|' + g] = 1; n++; } } } return { s: s, n: n }; }
  function stableSet(f) { var s = {}, n = 0; for (var c = 0; c < COLS.length; c++) { var col = COLS[c], a = arr(obj(f)[col]); for (var i = 0; i < a.length; i++) { var g = stableOf(col, a[i]); if (g) { s[col + '|' + g] = 1; n++; } } } return { s: s, n: n }; }
  function jaccard(A, B) { var ka = Object.keys(A.s), kb = Object.keys(B.s); if (!ka.length && !kb.length) return null; var i = 0; for (var k = 0; k < ka.length; k++) if (B.s[ka[k]]) i++; return i / (ka.length + kb.length - i); }
  function elemCount(f) { var n = 0; for (var c = 0; c < COLS.length; c++) n += arr(obj(f)[COLS[c]]).length; return n; }
  function round2(x) { return x == null ? null : Math.round(x * 100) / 100; }
  /* ── نسبُ الطابق (الجولة/اللقطة → طابقُ الخطة) ── */
  function floorLineage(f, i, planFloors, planGeo, planStable, snapFloor, snapIdx, planSids) {
    var n = elemCount(f), P = planFloors[i], PSID = planSids || planFloors.map(function (pf) { return sidOf(pf); }), out = { idx: i, elements: n, cls: 'unlinked', basis: '', planIdx: i, targetSid: null, metrics: {} };
    if (isObj(f) && f.sid != null && f.sid !== '') { var k = -1; for (var q = 0; q < planFloors.length; q++) if (PSID[q] != null && str(PSID[q]) === str(f.sid)) k = q; out.hasSid = true; if (k >= 0) { out.cls = 'exact'; out.planIdx = k; out.basis = 'sid مطابقٌ لطابق الخطة (' + (k === i ? 'الموضعُ نفسُه' : 'موضعٌ آخر') + ')'; out.targetSid = str(f.sid); } else { out.cls = 'unlinked'; out.basis = 'sid لا يطابق أيَّ طابق خطةٍ حالي'; } return out; }
    if (!P) { out.basis = 'لا طابقَ خطةٍ في هذا الموضع (' + i + ' ≥ ' + planFloors.length + ')'; return out; }
    var G = geoSet(f), ST = stableSet(f), jG = jaccard(G, planGeo[i]), jS = jaccard(ST, planStable[i]);
    var best = { idx: -1, j: -1 }, second = -1; for (var q2 = 0; q2 < planFloors.length; q2++) { var jq = jaccard(G, planGeo[q2]); if (jq == null) continue; if (jq > best.j) { second = best.j; best = { idx: q2, j: jq }; } else if (jq > second) second = jq; }
    var snapJ = snapFloor ? jaccard(G, geoSet(snapFloor)) : null, snapSidEq = snapFloor ? (str(obj(snapFloor).sid) === '' ? null : str(obj(snapFloor).sid) === str(PSID[i])) : null;   /* لقطةٌ بلا sid ⇒ مجهول (null) لا نفي؛ sid مختلف ⇒ نفيٌ يمنع exact */
    out.metrics = { jGeo: round2(jG), jStable: round2(jS), bestIdx: best.idx, bestJ: round2(best.j), secondJ: round2(second), snapJ: round2(snapJ), snapSidEq: snapSidEq, planElements: elemCount(P) };
    var sid = PSID[i] != null && PSID[i] !== '' ? str(PSID[i]) : null;   /* IP‑01: sid الفعلي (قائمٌ أو مُقفَل في هذه البروفة) */
    if (!sid) { out.cls = 'unlinked'; out.basis = 'طابقُ الخطة في هذا الموضع بلا sid — لا هدفَ للنسب'; return out; }
    if (n === 0) { out.cls = 'medium'; out.basis = 'طابقٌ فارغ: النسبُ الموضعي ثابتٌ بالكود (حشوُ الإضافة · قصُّ الحذف) ولا محتوى يؤيّده أو ينفيه'; out.targetSid = sid; return out; }
    if (best.idx >= 0 && best.idx !== i && best.j >= 0.5 && (jG == null || best.j > jG)) { out.cls = 'ambiguous'; out.basis = 'أفضلُ تداخلٍ هندسي في موضعٍ آخر (' + best.idx + ' · ' + round2(best.j) + ') — اشتباهُ إعادة ترتيب'; return out; }
    if (best.idx === i && second >= 0.5 && Math.abs(best.j - second) < 0.05) { out.cls = 'ambiguous'; out.basis = 'طابقان متقاربان في التداخل (' + round2(best.j) + ' ↔ ' + round2(second) + ')'; return out; }
    if (jG == null) { out.cls = 'unlinked'; out.basis = 'لا هندسةَ قابلة للمقارنة'; return out; }
    if (jG >= 0.95 && (snapSidEq !== false)) { out.cls = 'exact'; out.basis = 'تداخلٌ هندسي ≥ 0.95 مع طابق الخطة في الموضع نفسِه' + (snapSidEq ? ' · لقطةُ الشهر بـsid الخطة نفسِه' : '') + (jS != null ? ' · تداخلُ eid/id ' + round2(jS) : ''); out.targetSid = sid; return out; }
    if (jG >= 0.8) { out.cls = 'high'; out.basis = 'تداخلٌ هندسي ≥ 0.8 في الموضع نفسِه وأفضلُ من كلِّ بديل' + (jS != null ? ' · eid/id ' + round2(jS) : ''); out.targetSid = sid; return out; }
    if (jG >= 0.5) { out.cls = 'medium'; out.basis = 'تداخلٌ هندسي 0.5–0.8 في الموضع نفسِه — يحتاج تأكيداً'; out.targetSid = sid; return out; }
    out.cls = 'unlinked'; out.basis = 'تداخلٌ هندسي < 0.5 مع طابق الخطة في الموضع — محتوىً مختلف'; return out;
  }
  /* ── نسبُ العنصر داخل طابقٍ مثبت ── */
  function elemLineage(col, e, P, ix) {
    var s = stableOf(col, e), g = geoOf(col, e), t = attrOf(col, e);
    var S_ = s ? arr(ix.st[s]) : [], G_ = g ? arr(ix.ge[g]) : [], A_ = t != null ? arr(ix.at[t]) : [];
    var pa = arr(obj(P)[col]);
    if (G_.length === 1) { var gi = G_[0], pe = pa[gi]; if ((S_.length === 1 && S_[0] === gi) || (S_.length === 0 && A_.indexOf(gi) >= 0)) return { cls: 'exact', target: gi, basis: S_.length ? 'eid/id + الهندسةُ متطابقان' : 'الهندسةُ + الصفاتُ متطابقة' }; if (S_.length === 1 && S_[0] !== gi) return { cls: 'ambiguous', target: null, basis: 'تعارض: الهندسةُ تطابق عنصراً وeid/id يطابق آخر' }; if (A_.indexOf(gi) >= 0) return { cls: 'exact', target: gi, basis: 'الهندسةُ + الصفاتُ متطابقة (eid/id مختلف — ختمٌ لاحق)' }; var sec = isObj(pe) ? secondaryEq(col, e, pe) : null; if (sec) return { cls: 'high', target: gi, basis: 'الهندسةُ متطابقة + صفةٌ ثانوية (' + sec + ')' }; return { cls: 'medium', target: gi, basis: 'الهندسةُ وحدَها متطابقة — الصفاتُ كلُّها مختلفة' }; }
    if (G_.length > 1) return { cls: 'ambiguous', target: null, basis: 'هندسةٌ مكرَّرة في طابق الخطة (' + G_.length + ')' };
    if (S_.length === 1) { var si = S_[0], d = bboxDist(bboxOf(col, e), bboxOf(col, pa[si])); if (d <= NEAR) return { cls: 'high', target: si, basis: 'eid/id متطابق + هندسةٌ قريبة (' + round2(d) + ')' }; return { cls: 'medium', target: si, basis: 'eid/id متطابق — الهندسةُ مختلفة (' + (isFinite(d) ? round2(d) : '∞') + ')' }; }
    if (S_.length > 1) return { cls: 'ambiguous', target: null, basis: 'eid/id مكرَّر في طابق الخطة' };
    if (A_.length === 1) { var ai = A_[0], d2 = bboxDist(bboxOf(col, e), bboxOf(col, pa[ai])); if (d2 <= NEAR) return { cls: 'medium', target: ai, basis: 'الصفاتُ متطابقة + هندسةٌ قريبة (' + round2(d2) + ') — بلا eid/id' }; return { cls: 'unlinked', target: null, basis: 'الصفاتُ وحدَها متطابقة (label/code/num) — لا يُعتمد عليها' }; }
    if (A_.length > 1) return { cls: 'ambiguous', target: null, basis: 'صفاتٌ مكرَّرة بلا هندسةٍ أو eid/id مطابق' };
    return { cls: 'unlinked', target: null, basis: 'لا مرشَّح' };
  }
  /* ── الموظفون: حلُّ الرمز إلى ekey ── */
  function empResolver(dept, employees, users) {
    var acct = {}, byEid = {}, byNid = {}, byName = {}, nameDup = {};
    for (var u = 0; u < arr(users).length; u++) { var U = users[u]; if (isObj(U) && str(U.deptId) === str(dept) && U.ekey && !/^(mgr|gm):/.test(str(U.ekey))) acct[str(U.ekey)] = 1; }
    for (var i = 0; i < arr(employees).length; i++) { var e = employees[i]; if (!isObj(e)) continue; if (e.eid != null && e.eid !== '') byEid[str(e.eid)] = e; if (e.nid != null && str(e.nid) !== '') { if (byNid[str(e.nid)]) nameDup['nid:' + e.nid] = 1; byNid[str(e.nid)] = e; } if (e.name) { if (byName[str(e.name)]) nameDup['name:' + e.name] = 1; byName[str(e.name)] = e; } }
    return function (tok) {
      var t = str(tok); if (acct[t] || byEid[t]) return { cls: 'canonical', to: t };
      if (byNid[t]) { if (nameDup['nid:' + t]) return { cls: 'ambiguous', to: null, via: 'nid' }; var e1 = byNid[t]; return e1.eid != null && e1.eid !== '' ? { cls: 'exact', to: str(e1.eid), via: 'nid' } : { cls: 'unknown', to: null, via: 'nid (موظفٌ بلا eid)' }; }
      if (byName[t]) { if (nameDup['name:' + t]) return { cls: 'ambiguous', to: null, via: 'name' }; var e2 = byName[t]; return e2.eid != null && e2.eid !== '' ? { cls: 'exact', to: str(e2.eid), via: 'name' } : { cls: 'unknown', to: null, via: 'name (موظفٌ بلا eid)' }; }
      return { cls: 'unknown', to: null, via: '—' };
    };
  }
  /* ── تطبيقُ العمليات (على نسخة) وعكسُها ── */
  function getAt(root, path) { var cur = root; for (var i = 0; i < path.length; i++) { if (cur == null) return undefined; cur = cur[path[i]]; } return cur; }
  function applyOps(root, ops) {
    for (var i = 0; i < ops.length; i++) { var o = ops[i], p = o.path, parent = getAt(root, p.slice(0, -1)), last = p[p.length - 1]; if (parent == null) throw new Error('path missing: ' + o.p);
      if (o.op === 'set') { if (parent[last] !== undefined && parent[last] !== o.from) throw new Error('set over existing: ' + o.p); parent[last] = o.to; }
      else if (o.op === 'unset') { delete parent[last]; }
      else if (o.op === 'replace') { if (parent[last] !== o.from) throw new Error('replace mismatch: ' + o.p); parent[last] = o.to; }
      else if (o.op === 'remove') { if (!Array.isArray(parent) || parent[last] !== o.from) throw new Error('remove mismatch: ' + o.p); parent.splice(last, 1); }
      else if (o.op === 'insert') { if (!Array.isArray(parent)) throw new Error('insert on non-array: ' + o.p); parent.splice(last, 0, o.to); }
      else throw new Error('unknown op ' + o.op); }
    return root;
  }
  function invertOps(ops) { var out = []; for (var i = ops.length - 1; i >= 0; i--) { var o = ops[i]; if (o.op === 'set') out.push({ op: 'unset', path: o.path, p: o.p }); else if (o.op === 'replace') out.push({ op: 'replace', path: o.path, p: o.p, from: o.to, to: o.from }); else if (o.op === 'remove') out.push({ op: 'insert', path: o.path, p: o.p, to: o.from }); else throw new Error('non-invertible ' + o.op); } return out; }
  function pstr(path) { var s = ''; for (var i = 0; i < path.length; i++) s += typeof path[i] === 'number' ? '[' + path[i] + ']' : (i ? '.' : '') + path[i]; return s; }
  function canonJSON(v) { if (Array.isArray(v)) { var a = []; for (var i = 0; i < v.length; i++) a.push(canonJSON(v[i])); return '[' + a.join(',') + ']'; } if (isObj(v)) { var ks = Object.keys(v).sort(), o = []; for (var j = 0; j < ks.length; j++) if (v[ks[j]] !== undefined) o.push(JSON.stringify(ks[j]) + ':' + canonJSON(v[ks[j]])); return '{' + o.join(',') + '}'; } return JSON.stringify(v); }
  /* IP‑02: مساواةٌ بنيوية بين طابقِ لقطة الشهر الجاري وطابقِ الخطة في الموضع نفسِه — الاسمُ والرقمُ (إن وُجدا على الجانبَين) · عددُ العناصر لكل نوع · ثم الهندسةُ (exact/high) أو فراغُ الطابقَين */
  function structuralEq(snap, plan) {
    var a = obj(snap), b = obj(plan), nm = a.name != null && b.name != null ? str(a.name) === str(b.name) : true, nu = a.num != null && b.num != null ? str(a.num) === str(b.num) : true, cnt = true;
    for (var c = 0; c < COLS.length; c++) if (arr(a[COLS[c]]).length !== arr(b[COLS[c]]).length) cnt = false;
    return { ok: nm && nu && cnt, name: nm, num: nu, counts: cnt, empty: elemCount(a) === 0 && elemCount(b) === 0 };
  }
  function mkOfToday(T) { return T && T.y > 0 && T.m > 0 ? (T.y + '-' + T.m) : null; }
  /* ── البروفة ── */
  function rehearse(input, H) {
    H = H || {}; input = obj(input);
    var depts = arr(input.depts).filter(function (d) { return isObj(d) && d.id != null; }).slice().sort(function (a, b) { return str(a.id) < str(b.id) ? -1 : str(a.id) > str(b.id) ? 1 : 0; });
    var users = arr(input.users), byDept = obj(input.byDept), raw = obj(H.raw);
    var seed = isHexSeed(H.seed) ? String(H.seed) : null; if (!seed) throw new Error('seed (64 hex) مطلوب — يُولَّد عند المنادي بـcrypto.getRandomValues');
    var cand = typeof H.uidCandidate === 'function' ? H.uidCandidate : uidCandidate, candS = typeof H.sidCandidate === 'function' ? H.sidCandidate : sidCandidate, curMk = mkOfToday(H.today);
    var rep = { version: M.version, docSha256: M.docSha256, phase: 4.5, mode: 'rehearsal (dry-run · deterministic)', writes: 0, seed: seed, seedSource: H.seedSource || 'caller', generated: H.now || null, today: H.today || null, currentMonth: curMk,
      counts: { depts: depts.length, plan: { elements: 0, withUid: 0, assigned: 0, kept: 0 }, planFloors: { floors: 0, withSid: 0, assigned: 0 }, sidClosure: { planAssigned: 0, snapshotStructural: 0, snapshotGeometry: 0, snapshotPending: 0, snapshotUntouched: 0, currentSnapshotFloors: 0, currentSnapshotUnresolvable: 0, noCurrentMonth: curMk ? 0 : 1 }, snapshots: cls0(), rounds: cls0(), roundsFloors: cls0(), mirror: { elements: 0, exact: 0, stale: 0, noFloors: 0 }, frozenSnaps: { days: 0, floors: 0, elements: 0 }, emp: { tokens: 0, canonical: 0, exact: 0, ambiguous: 0, unknown: 0, dedup: 0, byVia: {} } },
      perDept: {}, floors: [], writeSet: { keys: [], ops: 0, tierA: 0, tierB: 0, byOp: {}, byKind: {}, hash: null, tierAHash: null, tierBHash: null }, pending: [], rollback: { strategy: M.rollback || null, verified: null, keys: [] },
      gates: { writes: 0, duplicateUid: 0, duplicateSid: 0, collisionRetries: 0, sidCollisionRetries: 0, collisionTest: (H.uidCandidate || H.sidCandidate) ? 'injected' : 'production-hash (no injection)', identityLoss: 0, existingUidChanged: 0, ambiguousAutoMaps: 0, unknownEmp: 0, rollbackVerified: null, uniqueSetSize: 0 } };
    /* ١) مجموعةُ الهويات القائمة عبر كلِّ الإدارات (uid) — للتفرّد عند التوليد؛ والتكرارُ القائم يُعدّ داخل الحاوية الواحدة فقط (طوابقُ الخطة · المرآةُ الجذرية · لقطةُ شهرٍ · يومُ جولة · لقطةُ اعتمادٍ shAp):
       uid نفسُه على عنصرَين مختلفَين في حاويةٍ واحدة = تكرار؛ أما uid نفسُه عبر الحاويات (الخطة ↔ لقطتُها ↔ جولاتُها) فهو النسبُ المقصود (العنصرُ نفسُه) لا تكرار */
    var USED = {}, DUPC = 0, GENN = 0, USED_S = {}, DUPC_S = 0, GENN_S = 0, i, j, c, k;
    function noteUid(e, seen) { var u = uidOf(e); if (u) { USED[u] = 1; if (seen[u]) DUPC++; else seen[u] = 1; } }
    function noteSid(f, seen) { var sd = sidOf(f); if (sd) { USED_S[sd] = 1; if (seen[sd]) DUPC_S++; else seen[sd] = 1; } }
    function noteFloors(list, seen) { var seenS = {}; arr(list).forEach(function (f) { noteSid(f, seenS); COLS.forEach(function (col) { arr(obj(f)[col]).forEach(function (e) { noteUid(e, seen); }); }); }); }
    for (i = 0; i < depts.length; i++) { var B = obj(byDept[depts[i].id]), pl = obj(B.plan), rd = obj(B.rounds), seenMirror = {};
      noteFloors(pl.floors, {});
      COLS.forEach(function (col) { arr(pl[col]).forEach(function (e) { noteUid(e, seenMirror); }); });
      Object.keys(obj(pl.months)).forEach(function (mk) { noteFloors(Array.isArray(pl.months[mk]) ? pl.months[mk] : arr(obj(pl.months[mk]).d), {}); });
      Object.keys(rd).forEach(function (rk) { var rec = obj(rd[rk]); noteFloors(rec.d, {}); Object.keys(obj(rec.shAp)).forEach(function (s) { noteFloors(obj(rec.shAp[s]).snap, {}); }); }); }
    rep.gates.preExistingDuplicateUid = DUPC;   /* تكرارٌ قائمٌ قبل البروفة داخل حاويةٍ واحدة (يجب 0) */
    rep.gates.preExistingDuplicateSid = DUPC_S; /* IP‑01: تكرارُ sid القائم داخل حاويةٍ واحدة (يجب 0) */
    var GEN = {}, GEN_S = {};
    function newSid(lineageKey) { var attempt = 0, u; for (;;) { u = candS(seed, lineageKey, attempt); if (!USED_S[u] && !GEN_S[u]) { GEN_S[u] = 1; USED_S[u] = 1; GENN_S++; return { sid: u, attempts: attempt }; } attempt++; rep.gates.sidCollisionRetries++; if (attempt > 64) throw new Error('sid collision storm'); } }
    function newUid(lineageKey) { var attempt = 0, u; for (;;) { u = cand(seed, lineageKey, attempt); if (!USED[u] && !GEN[u]) { GEN[u] = 1; USED[u] = 1; GENN++; return { uid: u, attempts: attempt }; } attempt++; rep.gates.collisionRetries++; if (attempt > 64) throw new Error('uid collision storm'); } }
    /* ٢) لكل إدارة */
    for (i = 0; i < depts.length; i++) {
      var D = depts[i], did = str(D.id), B2 = obj(byDept[D.id]), plan = isObj(B2.plan) ? B2.plan : null, rounds = obj(B2.rounds), employees = arr(B2.employees);
      var PD = rep.perDept[did] = { plan: { elements: 0, withUid: 0, assigned: 0, kept: 0 }, planFloors: { floors: 0, withSid: 0, assigned: 0 }, snapshots: cls0(), rounds: cls0(), roundsFloors: cls0(), mirror: { elements: 0, exact: 0, stale: 0 }, emp: { tokens: 0, canonical: 0, exact: 0, ambiguous: 0, unknown: 0, dedup: 0 }, ops: { plan: 0, rounds: 0 }, pending: 0 };
      if (!plan) continue;
      var pf = arr(plan.floors), PIX = pf.map(indexFloor), PGEO = pf.map(geoSet), PST = pf.map(stableSet);
      var planOps = [], roundOps = [], pend = [];
      /* IP‑01: إقفالُ هوية الموقع — كلُّ طابقٍ حالي بلا sid يُمنح sid حتمياً (أوّلُ العمليات على مفتاح الخطة) · PSID = sid الفعلي لكل طابق */
      var PSID = pf.map(function (f, fi) { if (!isObj(f)) return null; PD.planFloors.floors++; rep.counts.planFloors.floors++; var sd = sidOf(f); if (sd) { PD.planFloors.withSid++; rep.counts.planFloors.withSid++; return sd; } var g = newSid(did + '|floors[' + fi + ']'); PD.planFloors.assigned++; rep.counts.planFloors.assigned++; rep.counts.sidClosure.planAssigned++; planOps.push({ op: 'set', path: ['floors', fi, 'sid'], p: 'floors[' + fi + '].sid', to: g.sid, cls: 'assign', kind: 'sid', attempts: g.attempts, basis: 'IP‑01: طابقُ خطةٍ حالي بلا sid — sid حتميٌّ من البذرة' }); return g.sid; });
      var resolve = empResolver(did, employees, users);
      /* uid للخطة (floors) — أو إبقاءُ القائم */
      var planUid = pf.map(function (f, fi) { var m = {}; COLS.forEach(function (col) { m[col] = arr(obj(f)[col]).map(function (e, ei) { if (!isObj(e)) return null; PD.plan.elements++; rep.counts.plan.elements++; var u = uidOf(e); if (u) { PD.plan.withUid++; rep.counts.plan.withUid++; PD.plan.kept++; rep.counts.plan.kept++; return u; } var g = newUid(did + '|floors[' + fi + '].' + col + '[' + ei + ']'); PD.plan.assigned++; rep.counts.plan.assigned++; planOps.push({ op: 'set', path: ['floors', fi, col, ei, 'uid'], p: 'floors[' + fi + '].' + col + '[' + ei + '].uid', to: g.uid, cls: 'assign', kind: 'uid', attempts: g.attempts }); return g.uid; }); }); return m; });
      /* عناصرٌ مستهدَفة مرّةً واحدة لكل حاوية (one-to-one) */
      function propagate(container, f, fi, planIdx, pathPrefix, ops, counts, totalCounts, lineageCls) {
        if (planIdx == null || planIdx < 0 || !pf[planIdx]) return;
        var P = pf[planIdx], ix = PIX[planIdx], used = {}, pendingHere = [];
        COLS.forEach(function (col) { arr(obj(f)[col]).forEach(function (e, ei) { if (!isObj(e)) return; counts.elements++; totalCounts.elements++; var have = uidOf(e); var L = elemLineage(col, e, P, ix[col]); var cls = L.cls;
          /* نسبُ الطابق يحكم نسبَ العنصر: طابقٌ medium يسقف العنصرَ عند medium · طابقٌ ambiguous/unlinked يجعل كلَّ عنصرٍ له هدفٌ ambiguous (لا انتشار) */
          if (lineageCls === 'medium') { if (cls === 'exact' || cls === 'high') cls = 'medium'; }
          else if (lineageCls !== 'exact' && lineageCls !== 'high') { if (cls !== 'unlinked') cls = 'ambiguous'; }
          if (L.target != null && (AUTO[cls] || PENDING[cls])) { var key = col + ':' + L.target; if (used[key]) { cls = 'ambiguous'; L.basis += ' · هدفٌ مكرَّر (many-to-one)'; } else used[key] = 1; }
          var tgtUid = L.target != null ? planUid[planIdx][col][L.target] : null;
          if (have) { counts.alreadyUid++; totalCounts.alreadyUid++; if (tgtUid && (AUTO[cls] || PENDING[cls]) && have !== tgtUid) { counts.conflict++; totalCounts.conflict++; } counts[cls]++; totalCounts[cls]++; return; }
          counts[cls]++; totalCounts[cls]++;
          if (AUTO[cls] && tgtUid) ops.push({ op: 'set', path: pathPrefix.concat([col, ei, 'uid']), p: pstr(pathPrefix) + '.' + col + '[' + ei + '].uid', to: tgtUid, cls: cls, kind: 'uid', basis: L.basis });
          else if (PENDING[cls] && tgtUid) pendingHere.push({ kind: 'uid', container: container, p: pstr(pathPrefix) + '.' + col + '[' + ei + '].uid', to: tgtUid, cls: cls, basis: L.basis }); }); });
        pend.push.apply(pend, pendingHere);
      }
      /* لقطاتُ الأشهر */
      var months = obj(plan.months), mks = Object.keys(months).sort();
      mks.forEach(function (mk) { var isArr = Array.isArray(months[mk]); var md = isArr ? months[mk] : arr(obj(months[mk]).d); var isCur = curMk != null && mk === curMk; md.forEach(function (f, fi) { var L = floorLineage(f, fi, pf, PGEO, PST, null, null, PSID); var prefix = isArr ? ['months', mk, fi] : ['months', mk, 'd', fi]; var structural = null;
          /* IP‑02: لقطةُ الشهر الجاري — طابقٌ بلا sid وطابقُ الخطة في الموضع نفسِه له sid فعلي: نسبٌ بنيوي (الكود: savePlan يعيد بناءها موضعياً · البيانات: الاسم/الرقم + العدد + الهندسة أو الفراغ) ⇒ set sid (tier A)؛ وإلا تصنيفُ الهندسة */
          if (isCur && isObj(f)) { rep.counts.sidClosure.currentSnapshotFloors++; if (!L.hasSid && PSID[fi]) { var SQ = structuralEq(f, pf[fi]); structural = SQ; var proven = SQ.ok && (SQ.empty || L.cls === 'exact' || L.cls === 'high') && md.length === pf.length;
              if (proven) { L.cls = 'exact'; L.planIdx = fi; L.targetSid = PSID[fi]; L.basis = 'IP‑02: لقطةُ الشهر الجاري مبنيةٌ موضعياً من الخطة (savePlan/_snapshot) · البنيةُ متطابقة (الاسم/الرقم · عددُ العناصر لكل نوع' + (SQ.empty ? ' · الطابقان فارغان' : ' · الهندسة ' + L.cls) + ')'; planOps.push({ op: 'set', path: prefix.concat(['sid']), p: pstr(prefix) + '.sid', to: PSID[fi], cls: 'exact', kind: 'sid', basis: L.basis }); rep.counts.sidClosure.snapshotStructural++; }
              else if (L.cls === 'exact' || L.cls === 'high') { planOps.push({ op: 'set', path: prefix.concat(['sid']), p: pstr(prefix) + '.sid', to: PSID[fi], cls: L.cls, kind: 'sid', basis: L.basis }); rep.counts.sidClosure.snapshotGeometry++; }
              else if (L.cls === 'medium') { pend.push({ kind: 'sid', container: 'snapshot', p: pstr(prefix) + '.sid', to: PSID[fi], cls: 'medium', basis: L.basis }); rep.counts.sidClosure.snapshotPending++; rep.counts.sidClosure.currentSnapshotUnresolvable += (pf[fi] && PSID[fi]) ? 0 : 1; }
              else { rep.counts.sidClosure.snapshotUntouched++; rep.counts.sidClosure.currentSnapshotUnresolvable += (pf[fi] && PSID[fi]) ? 0 : 1; } }
            else if (!L.hasSid && !PSID[fi]) rep.counts.sidClosure.currentSnapshotUnresolvable++; }
          rep.floors.push({ dept: did, container: 'snapshot', key: mk, idx: fi, cls: L.cls, planIdx: L.planIdx, targetSid: L.targetSid || null, metrics: L.metrics, basis: L.basis, hasSid: !!L.hasSid, currentMonth: isCur, structural: structural }); propagate('snapshot', f, fi, L.planIdx, prefix, planOps, PD.snapshots, rep.counts.snapshots, L.cls); }); });
      /* المرآةُ الجذرية plan.zones/gates/marks/paths = طابقٌ ما بالكامل */
      var hasMirror = COLS.some(function (col) { return arr(plan[col]).length > 0; });
      if (hasMirror) { var mIdx = -1; for (j = 0; j < pf.length && mIdx < 0; j++) { var same = true; for (c = 0; c < COLS.length && same; c++) { var A1 = arr(plan[COLS[c]]), A2 = arr(obj(pf[j])[COLS[c]]); if (A1.length !== A2.length) { same = false; break; } for (k = 0; k < A1.length; k++) if (legacyKey(COLS[c], A1[k]) !== legacyKey(COLS[c], A2[k])) { same = false; break; } } if (same) mIdx = j; }
        var mEl = 0; COLS.forEach(function (col) { mEl += arr(plan[col]).length; }); PD.mirror.elements = mEl; rep.counts.mirror.elements += mEl;
        if (!pf.length) { rep.counts.mirror.noFloors++; } else if (mIdx >= 0) { PD.mirror.exact = mEl; rep.counts.mirror.exact += mEl; COLS.forEach(function (col) { arr(plan[col]).forEach(function (e, ei) { if (!isObj(e) || uidOf(e)) return; planOps.push({ op: 'set', path: [col, ei, 'uid'], p: col + '[' + ei + '].uid', to: planUid[mIdx][col][ei], cls: 'exact', kind: 'uid', basis: 'المرآةُ الجذرية = floors[' + mIdx + '] حرفاً' }); }); }); } else { PD.mirror.stale = mEl; rep.counts.mirror.stale += mEl; } }
      /* الجولات (مفاتيحُ التاريخ فقط) */
      Object.keys(rounds).filter(parseDay).sort().forEach(function (day) { var rec = obj(rounds[day]), dl = arr(rec.d), mk = day.replace(/-\d+$/, ''); var snap = isObj(months[mk]) ? arr(months[mk].d) : (Array.isArray(months[mk]) ? months[mk] : []);
        dl.forEach(function (f, fi) { var L = floorLineage(f, fi, pf, PGEO, PST, snap[fi], fi, PSID); PD.roundsFloors[L.cls]++; rep.counts.roundsFloors[L.cls]++; PD.roundsFloors.elements++; rep.counts.roundsFloors.elements++; if (L.hasSid) { PD.roundsFloors.alreadyUid++; rep.counts.roundsFloors.alreadyUid++; }
          rep.floors.push({ dept: did, container: 'rounds', key: day, idx: fi, cls: L.cls, planIdx: L.planIdx, targetSid: L.targetSid, metrics: L.metrics, basis: L.basis, hasSid: !!L.hasSid, elements: L.elements });
          if (!L.hasSid && L.targetSid) { if (AUTO[L.cls]) roundOps.push({ op: 'set', path: [day, 'd', fi, 'sid'], p: day + '.d[' + fi + '].sid', to: L.targetSid, cls: L.cls, kind: 'sid', basis: L.basis }); else if (PENDING[L.cls]) pend.push({ kind: 'sid', container: 'rounds', p: day + '.d[' + fi + '].sid', to: L.targetSid, cls: L.cls, basis: L.basis }); }
          propagate('rounds', f, fi, L.planIdx, [day, 'd', fi], roundOps, PD.rounds, rep.counts.rounds, L.hasSid ? 'exact' : L.cls); });
        Object.keys(obj(rec.shAp)).forEach(function (s) { var sn = arr(obj(rec.shAp[s]).snap); if (sn.length) { rep.counts.frozenSnaps.days++; sn.forEach(function (f) { rep.counts.frozenSnaps.floors++; rep.counts.frozenSnaps.elements += elemCount(f); }); } }); });
      /* emp[] — الطوابق واللقطات والمرآة (plan) · الجولات (rounds) */
      function canonEmp(container, e, pathPrefix, ops) { var emp = isObj(e) ? e.emp : null; if (!Array.isArray(emp)) return; var seen = {}, removed = 0; emp.forEach(function (t0, ti) { var t = str(t0); PD.emp.tokens++; rep.counts.emp.tokens++; var r = resolve(t); var to = t; if (r.cls === 'canonical') { PD.emp.canonical++; rep.counts.emp.canonical++; } else if (r.cls === 'exact') { PD.emp.exact++; rep.counts.emp.exact++; rep.counts.emp.byVia[r.via] = (rep.counts.emp.byVia[r.via] || 0) + 1; to = r.to; } else if (r.cls === 'ambiguous') { PD.emp.ambiguous++; rep.counts.emp.ambiguous++; } else { PD.emp.unknown++; rep.counts.emp.unknown++; rep.gates.unknownEmp++; }
          var idx = ti - removed; if (seen[to]) { ops.push({ op: 'remove', path: pathPrefix.concat(['emp', idx]), p: pstr(pathPrefix) + '.emp[' + idx + ']', from: t0, cls: 'dedup', kind: 'emp', basis: 'الرمزُ يكرّر موظفاً قياسياً قائماً' }); removed++; PD.emp.dedup++; rep.counts.emp.dedup++; return; } seen[to] = 1; if (to !== t && r.cls === 'exact') ops.push({ op: 'replace', path: pathPrefix.concat(['emp', idx]), p: pstr(pathPrefix) + '.emp[' + idx + ']', from: t0, to: to, cls: 'canonical', kind: 'emp', basis: 'رمزٌ قديم (' + r.via + ') → ekey' }); }); }
      pf.forEach(function (f, fi) { EMP_COLS.forEach(function (col) { arr(obj(f)[col]).forEach(function (e, ei) { canonEmp('plan', e, ['floors', fi, col, ei], planOps); }); }); });
      mks.forEach(function (mk) { var isArr = Array.isArray(months[mk]); var md = isArr ? months[mk] : arr(obj(months[mk]).d); md.forEach(function (f, fi) { EMP_COLS.forEach(function (col) { arr(obj(f)[col]).forEach(function (e, ei) { canonEmp('snapshot', e, isArr ? ['months', mk, fi, col, ei] : ['months', mk, 'd', fi, col, ei], planOps); }); }); }); });
      if (hasMirror) EMP_COLS.forEach(function (col) { arr(plan[col]).forEach(function (e, ei) { canonEmp('mirror', e, [col, ei], planOps); }); });
      Object.keys(rounds).filter(parseDay).sort().forEach(function (day) { arr(obj(rounds[day]).d).forEach(function (f, fi) { EMP_COLS.forEach(function (col) { arr(obj(f)[col]).forEach(function (e, ei) { canonEmp('rounds', e, [day, 'd', fi, col, ei], roundOps); }); }); }); });
      /* ترتيبُ العمليات = ترتيبُ الاجتياز الحتمي (الطوابقُ ثم اللقطاتُ ثم المرآةُ ثم الجولات؛ داخل كلٍّ بالفهرس) — لا يُعاد ترتيبُها نصّياً لأن عمليات emp (remove) تعتمد على الفهرس المتحرّك */
      pend.sort(function (a, b) { return a.p < b.p ? -1 : a.p > b.p ? 1 : 0; });
      PD.ops.plan = planOps.length; PD.ops.rounds = roundOps.length; PD.pending = pend.length;
      pend.forEach(function (x) { x.dept = did; rep.pending.push(x); });
      [['bsdept:' + did + ':bassam_plan_v1', plan, planOps, 'plan'], ['bsdept:' + did + ':bassam_rounds_v1', B2.rounds, roundOps, 'rounds']].forEach(function (K) { var key = K[0], val = K[1], ops = K[2]; if (!ops.length || val == null) return; var before = clone(val), after = applyOps(clone(val), ops); var inv = invertOps(ops), back = applyOps(clone(after), inv); var bJ = JSON.stringify(before), aJ = JSON.stringify(after), rJ = JSON.stringify(back); var ok = canonJSON(back) === canonJSON(before) && rJ === bJ;
        /* فقدانُ الهوية: لا عنصرَ يفقد uid قائماً أو يتغيّر؛ ولا تتغيّر صفاتُه القديمة */
        var loss = 0, changed = 0; (function walk(a, b) { if (Array.isArray(a) && Array.isArray(b)) { for (var q = 0; q < Math.max(a.length, b.length); q++) walk(a[q], b[q]); return; } if (isObj(a) && isObj(b)) { if (a.uid != null && a.uid !== '' && b.uid !== a.uid) { loss++; changed++; } if (a.sid != null && a.sid !== '' && b.sid !== a.sid) loss++; var ks = Object.keys(a); for (var w = 0; w < ks.length; w++) { var kk = ks[w]; if (kk === 'uid' || kk === 'sid' || kk === 'emp') continue; if (isObj(a[kk]) || Array.isArray(a[kk])) { if (kk === 'd' || kk === 'months' || kk === 'floors' || COLS.indexOf(kk) >= 0 || kk === 'shAp' || kk === 'snap' || /^\d{4}-\d{1,2}-\d{1,2}$/.test(kk)) walk(a[kk], b[kk]); } else if (a[kk] !== b[kk] && !(a[kk] == null && b[kk] == null)) loss++; } } })(before, after);
        rep.gates.identityLoss += loss; rep.gates.existingUidChanged += changed;
        var rawS = raw[key] != null ? sha256Hex(String(raw[key])) : null;
        rep.writeSet.keys.push({ key: key, resource: K[3], dept: did, before: { sha256: sha256Hex(bJ), rawSha256: rawS, bytes: utf8(bJ).length, rev: H.revs && H.revs[key] != null ? H.revs[key] : null }, after: { sha256: sha256Hex(aJ), bytes: utf8(aJ).length }, ops: ops, counts: countOps(ops), roundTrip: ok });
        rep.rollback.keys.push({ key: key, beforeSha256: sha256Hex(bJ), afterSha256: sha256Hex(aJ), inverseOps: inv.length, verified: ok });
        rep.writeSet.ops += ops.length; rep.writeSet.tierA += ops.length; ops.forEach(function (o) { rep.writeSet.byOp[o.op + ':' + o.cls] = (rep.writeSet.byOp[o.op + ':' + o.cls] || 0) + 1; var kd = o.kind || (/\.uid$/.test(o.p) ? 'uid' : /\.emp\[/.test(o.p) ? 'emp' : 'other'); rep.writeSet.byKind[kd] = (rep.writeSet.byKind[kd] || 0) + 1; }); });
    }
    rep.writeSet.tierB = rep.pending.length;
    /* بصماتُ مجموعة الكتابة (حتمية: البذرةُ + المفاتيحُ + العمليات) */
    var tierAStr = canonJSON({ seed: seed, keys: rep.writeSet.keys.map(function (k) { return { key: k.key, before: k.before.sha256, after: k.after.sha256, ops: k.ops.map(function (o) { return { op: o.op, p: o.p, from: o.from === undefined ? null : o.from, to: o.to === undefined ? null : o.to }; }) }; }) });
    rep.writeSet.tierAHash = sha256Hex(tierAStr); rep.writeSet.tierBHash = sha256Hex(canonJSON(rep.pending.map(function (x) { return { dept: x.dept, kind: x.kind, p: x.p, to: x.to, cls: x.cls }; }))); rep.writeSet.hash = sha256Hex(rep.writeSet.tierAHash + '|' + rep.writeSet.tierBHash);
    rep.gates.ambiguousAutoMaps = 0; rep.writeSet.keys.forEach(function (k) { k.ops.forEach(function (o) { if (o.cls === 'ambiguous' || o.cls === 'unlinked' || o.cls === 'medium') rep.gates.ambiguousAutoMaps++; }); });
    rep.gates.rollbackVerified = rep.rollback.keys.every(function (k) { return k.verified; }); rep.rollback.verified = rep.gates.rollbackVerified;
    rep.gates.uniqueSidSetSize = Object.keys(USED_S).length; rep.gates.generatedSid = GENN_S; rep.gates.generatedSidCollisions = GENN_S - Object.keys(GEN_S).length; rep.gates.duplicateSid = rep.gates.preExistingDuplicateSid + rep.gates.generatedSidCollisions;
    rep.gates.planFloorsNoSidAfter = rep.counts.planFloors.floors - rep.counts.planFloors.withSid - rep.counts.planFloors.assigned; rep.gates.currentSnapshotUnresolvable = rep.counts.sidClosure.currentSnapshotUnresolvable; rep.gates.sidClosure = rep.gates.planFloorsNoSidAfter === 0 && rep.gates.currentSnapshotUnresolvable === 0;
    rep.gates.uniqueSetSize = Object.keys(USED).length; rep.gates.generated = GENN; rep.gates.generatedCollisions = GENN - Object.keys(GEN).length;   /* صفرٌ بالبناء: كلُّ مولَّدٍ فُحص على USED + GEN قبل قبوله */
    rep.gates.duplicateUid = rep.gates.preExistingDuplicateUid + rep.gates.generatedCollisions;   /* بعد التوليد: تكرارٌ قائمٌ داخل حاوية + تصادمُ مولَّد (يجب 0) */
    rep.gates.duplicateUidAfter = rep.gates.duplicateUid;
    rep.gates.pass = rep.gates.writes === 0 && rep.gates.duplicateUid === 0 && rep.gates.duplicateSid === 0 && rep.gates.identityLoss === 0 && rep.gates.existingUidChanged === 0 && rep.gates.ambiguousAutoMaps === 0 && rep.gates.rollbackVerified === true && rep.gates.sidClosure === true;
    rep.summary = { plan: rep.counts.plan, snapshots: strip(rep.counts.snapshots), rounds: strip(rep.counts.rounds), roundsFloors: strip(rep.counts.roundsFloors), emp: rep.counts.emp, mirror: rep.counts.mirror, writeSet: { keys: rep.writeSet.keys.length, ops: rep.writeSet.ops, tierA: rep.writeSet.tierA, tierB: rep.writeSet.tierB, byOp: rep.writeSet.byOp, hash: rep.writeSet.hash }, gates: rep.gates };
    return rep;
  }
  function cls0() { var o = { elements: 0, alreadyUid: 0, conflict: 0 }; for (var i = 0; i < CLS.length; i++) o[CLS[i]] = 0; return o; }
  function strip(o) { var r = {}; for (var k in o) r[k] = o[k]; return r; }
  function countOps(ops) { var o = {}; for (var i = 0; i < ops.length; i++) { var k = ops[i].op + ':' + ops[i].cls; o[k] = (o[k] || 0) + 1; } return o; }
  function validate() { var errs = []; if (sha256Hex('abc') !== 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad') errs.push('sha256 self-test'); if (sha256Hex('') !== 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855') errs.push('sha256 empty'); if (!/^u[0-9a-z]{25}$/.test(uidCandidate('00'.repeat(32), 'x', 0))) errs.push('uid shape'); if (!/^s_[0-9a-z]{14}$/.test(sidCandidate('00'.repeat(32), 'x', 0))) errs.push('sid shape'); return { ok: !errs.length, errors: errs }; }
  return { version: M.version, docSha256: M.docSha256, phase: 4.5, mode: 'rehearsal (dry-run)', writes: 0, classes: CLS.slice(), auto: Object.keys(AUTO), pending: Object.keys(PENDING), model: M.model || null, lineageRules: M.lineageRules || null, codeInvariance: M.codeInvariance || null, rollbackDesign: M.rollback || null, gatesSpec: M.gates || null, sidClosureGates: M.sidClosureGates || null, decisions: M.decisions || null,
           rehearse: rehearse, sha256Hex: sha256Hex, uidCandidate: uidCandidate, sidCandidate: sidCandidate, structuralEq: structuralEq, floorLineage: floorLineage, elemLineage: elemLineage, indexFloor: indexFloor, geoSet: geoSet, stableSet: stableSet, applyOps: applyOps, invertOps: invertOps, canonJSON: canonJSON, empResolver: empResolver, validate: validate, NEAR: NEAR };
})(KIVO_IDENTITY_MIGRATION_DATA, KIVO_SCOPE, KIVO_REGISTRY);

