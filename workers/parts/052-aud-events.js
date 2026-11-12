/* ═══ R169: أحداثُ سجل الأنشطة (aud) ═══
   الشكلُ الوارد من العميل: { cid, k, etype, eid, ename, act, ctx, before, after } — يُنظَّف ويُقصّ، ولا يُقبل إلا لمفتاحٍ
   كُتب في هذا الطلب نفسِه. الفاعلُ والوقتُ والإدارةُ من الخادم. */
var AUD_MAX_N = 400, AUD_STR = 6000, AUD_ID_RE = /^[A-Za-z0-9_-]{8,64}$/, AUD_TOK_RE = /^[a-z][a-z0-9_]{0,23}$/;
function audClip(v, n) { if (v == null) return ''; v = typeof v === 'string' ? v : JSON.stringify(v); return v.length > n ? v.slice(0, n) : v; }
function audClean(list, keysOk) {
  var out = [], seen = {};
  if (!Array.isArray(list)) return out;
  for (var i = 0; i < list.length && out.length < AUD_MAX_N; i++) {
    var e = list[i]; if (!isObj(e)) continue;
    var cid = String(e.cid || ''); if (!AUD_ID_RE.test(cid) || seen[cid]) continue;
    var k = String(e.k || ''); if (!keysOk[k]) continue;
    var et = String(e.etype || ''), act = String(e.act || '');
    if (!AUD_TOK_RE.test(et) || !AUD_TOK_RE.test(act)) continue;
    var eid = String(e.eid == null ? '' : e.eid).slice(0, 80); if (!eid) continue;
    seen[cid] = 1;
    out.push({ cid: cid, k: k, etype: et, act: act, eid: eid, ename: audClip(e.ename, 160), ctx: audClip(e.ctx, 800), bef: audClip(e.before, AUD_STR), aft: audClip(e.after, AUD_STR) });
  }
  return out;
}
function audEvStmt(env, r) {
  return env.DB.prepare('INSERT OR IGNORE INTO aud (cid, ts, uid, un, dept, k, rev, etype, eid, ename, act, ctx, bef, aft, ip, dev, city) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)')
    .bind(r.cid, r.ts, r.uid, r.un || '', r.dept || '', r.k, r.rev || 0, r.etype, r.eid, r.ename || '', r.act, r.ctx || '', r.bef || '', r.aft || '', r.ip || '', r.dev || '', r.city || '');
}
/* من يقرأ سجلَّ إدارةٍ كاملاً: مدير النظام، مدير الإدارة، ومن مُنح «الإعدادات» في إدارته — وسجلُّ كيانٍ واحد لمن يقرأ نطاقَ الإدارة */
function audCanDept(AA, d, entMode) {
  if (AA && AA.enf) return enfAudCanDept(AA, d, entMode);                     /* KIVO_243: audit.view */
  if (!d) return AA.u.role === 'super';
  if (isMgrOf(AA, d)) return true;
  if (entMode) return deptInScope(AA, d);
  /* سقفُ الإدارة الفعليّ (deptCapOf: «لا سقفَ مضبوطاً» = كلُّ الصفحات، والوحدةُ المطفأة تُستبعد) لا السقفُ الخام */
  var ep = ((AA.perms.emps || {})[d] || {})[AA.u.ekey] || {};
  /* الورقةُ نفسُها التي تفتح «سجل الحركة» داخل الإعدادات: admin/oplog (والشكلُ القديم admin)
     — caps-own · read-time narrowing: only while admin/oplog is inside the unit ceiling (a switched-off tab is no longer deleted from sheets) */
  return deptInScope(AA, d) && capOnDept(AA, d, 'admin/oplog') && ((ep['admin/oplog'] || ep.admin || []).indexOf('view') !== -1);
}
/* نصُّ البحث حرفيٌّ: رموزُ LIKE (% _ \) تُهرَّب بشرطةٍ خلفيّة — فالمعرّفاتُ التي تحوي «_» تُبحث كما هي */
function audLike(v) { return String(v || '').replace(/[%_\\]/g, function (m) { return '\\' + m; }).trim(); }
/* R169-CC: auditStmt أُزيلت — لا كتابةَ في الجدول القديم بعد الترحيل. الجدولُ يبقى مصدرَ الترحيل وحدَه. */

/* ── أدوات صغيرة ── */
function json(o, status, extra) {
  var h = Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, extra || {});
  return new Response(redactPh(JSON.stringify(o), 'json'), { status: status || 200, headers: h });   /* KIVO_254 · AUD-033 (ج): لا بصمةَ تغادر في أيّ استجابة JSON */
}
function readCookie(req, name) {
  var c = req.headers.get('Cookie') || '';
  var m = c.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? m[1] : null;
}
function hex(buf) { var b = new Uint8Array(buf), o = ''; for (var i = 0; i < b.length; i++) o += ('0' + b[i].toString(16)).slice(-2); return o; }
function randTok() {
  var a = new Uint8Array(24); crypto.getRandomValues(a);
  return hex(a.buffer);
}

/* ── التجزئة: منقولة حرفياً من بوابة المنصة حتى تتطابق البصمات ── */
function legacyHash(p) {
  var h = 5381, s = 'bs~' + p + '~gate';
  for (var i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) | 0; }
  var h2 = 52711;
  for (var j = s.length - 1; j >= 0; j--) { h2 = ((h2 << 5) + h2 + s.charCodeAt(j)) | 0; }
  return (h >>> 0).toString(36) + '.' + (h2 >>> 0).toString(36);
}
function pbkdf2(pw, saltHex, iter) {
  var salt = new Uint8Array(saltHex.match(/../g).map(function (x) { return parseInt(x, 16); }));
  return crypto.subtle.importKey('raw', new TextEncoder().encode(String(pw)), 'PBKDF2', false, ['deriveBits'])
    .then(function (k) { return crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' }, k, 256); })
    .then(hex);
}
function hashPw(pw) {
  var salt = new Uint8Array(16); crypto.getRandomValues(salt);
  var sh = hex(salt.buffer);
  return pbkdf2(pw, sh, PBKDF2_ITER).then(function (h) { return 'p2$' + PBKDF2_ITER + '$' + sh + '$' + h; });
}
function eq(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  var r = 0; for (var i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function verifyPw(pw, ph) {
  ph = String(ph || '');
  if (ph.indexOf('p2$') === 0) {
    var p = ph.split('$'), it = parseInt(p[1], 10) || 0;
    if (it > PBKDF2_MAX) return Promise.resolve('unsupported');
    return Promise.resolve().then(function () { return pbkdf2(pw, p[2], it); }).then(function (h) { return eq(h, p[3]); }).catch(function () { return false; });
  }
  if (ph.indexOf('p1$') === 0) return Promise.resolve(eq(legacyHash(pw), ph.slice(3)));
  return Promise.resolve(eq(legacyHash(pw), ph));
}
/* v7-C · Issue 2 (التوقيت): تجزئةٌ وهمية بصيغة p2 والتكرارات الحالية — verifyPw يشتقّ ضدّها كاملاً ولا يطابق أبداً (ليست كلمةَ أحد) */
function PW_DUMMY() { return 'p2$' + PBKDF2_ITER + '$00112233445566778899aabbccddeeff$' + '0000000000000000000000000000000000000000000000000000000000000000'; }
function isLegacy(ph) { return String(ph || '').indexOf('p2$') !== 0; }
/* سياسة الدخول الموحَّدة — نفس قاعدة المنصة، ليتطابق حكم «يجب تغييرها»:
   اسم المستخدم 10 أرقام (جوال/هوية)؛ كلمة المرور أرقام فقط — الموظف ومدير الإدارة العامة 5 أرقام، ومدير النظام وحساب الإدارة 6 أرقام */
function unCheck(un) { return /^[0-9]{10}$/.test(String(un == null ? '' : un).trim()); }
function pwCheck(pw, role) {
  pw = String(pw == null ? '' : pw);
  if (!/^[0-9]*$/.test(pw)) return false;
  if (role === 'staff' || role === 'gm') return pw.length === 5 || pw.length === 6;
  if (pw.length < PW_MIN || pw.length > 6) return false;
  if (/^(.)\1+$/.test(pw)) return false;
  if ('01234567890123456789'.indexOf(pw) !== -1 || '98765432109876543210'.indexOf(pw) !== -1) return false;
  return true;
}

/* ── قاعدة D1: تهيئةٌ كسولة مرةً لكل isolate — KIVO_249 · AUD-022 · ADR-011: ترحيلاتٌ مرقَّمة بدل DDL على كل بدء ──
   الأثرُ على القاعدة المحدَّثة: قراءتان لسجل الترحيلات وختم المخطّط لمنع الرجوع إلى إصدار أقدم، دون كتابة. القاعدةُ الجديدة أو المتأخرة: تُطبَّق
   الترحيلاتُ الناقصة بترتيبها، كلُّ ترحيلٍ دفعةً ذرّيّة واحدة تنتهي بتسجيل اسمه (INSERT OR IGNORE: تزاحمُ isolate ثانٍ لا يُسقط أحدَهما).
   d1_migrations هو جدولُ wrangler نفسُه (id · name UNIQUE · applied_at) فيتشارك العاملُ و`wrangler d1 migrations apply` السجلَّ نفسَه.
   قاعدةٌ أقدم من الأساس (sess/audit بلا dev/city — ما قبل KIVO_242) تُستوعَب مرّةً بـPRAGMA table_info قبل الأساس (adoptLegacy). */
var MIG_TABLE = 'CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)';
async function dbColumns(env, table) {
  var r = await env.DB.prepare('PRAGMA table_info(' + table + ')').all(), out = {}, rows = (r && r.results) || [];
  for (var i = 0; i < rows.length; i++) out[rows[i].name] = 1;
  return out;
}
/* استيعابُ قاعدةٍ قائمة قبل أول ترحيل: الأعمدةُ التي كانت تُضاف بـALTER كسولاً (dev · city) تُضاف إن غابت — ثم الأساسُ لا يمسّ شيئاً (IF NOT EXISTS) */
async function adoptLegacy(env) {
  var tabs = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('sess', 'audit')").all(), have = {}, rows = (tabs && tabs.results) || [], st = [], i;
  for (i = 0; i < rows.length; i++) have[rows[i].name] = 1;
  var names = ['sess', 'audit'];
  for (i = 0; i < names.length; i++) {
    if (!have[names[i]]) continue;
    var cols = await dbColumns(env, names[i]);
    if (!cols.dev) st.push(env.DB.prepare('ALTER TABLE ' + names[i] + ' ADD COLUMN dev TEXT'));
    if (!cols.city) st.push(env.DB.prepare('ALTER TABLE ' + names[i] + ' ADD COLUMN city TEXT'));
  }
  return st;
}
/* Operator SQL only: no route or environment flag creates this short-lived
   permit. A rollback point captured before it was issued cannot auto-upgrade. */
var DB_UPGRADE_PERMIT = 'schema_upgrade_permit_v1';
async function dbMigrationPermit(env, names, applied, schema) {
  var row = null;
  try { row = await env.DB.prepare('SELECT v FROM meta WHERE k=?1').bind(DB_UPGRADE_PERMIT).first(); }
  catch (e) { if (!/no such table/i.test(String((e && e.message) || e))) throw e; }
  if (!row) throw dbGuardError('db-migration-permit-required');
  var p;
  try { p = JSON.parse(row.v); } catch (eJson) { throw dbGuardError('db-migration-permit-invalid'); }
  var fields = ['version', 'from', 'to', 'migrations', 'operationId', 'expiresAt'];
  if (!isObj(p) || Object.keys(p).length !== fields.length || Object.keys(p).some(function (k) { return fields.indexOf(k) < 0; }) ||
      p.version !== 1 || !Number.isSafeInteger(p.from) || p.from < 0 || p.from >= KIVO_SCHEMA_VERSION ||
      p.from > applied || p.to !== KIVO_SCHEMA_VERSION ||
      typeof p.operationId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(p.operationId) ||
      !Number.isSafeInteger(p.expiresAt) || p.expiresAt <= Date.now() ||
      !Array.isArray(p.migrations) || !deq(p.migrations, names.slice(p.from)) ||
      (applied ? schema !== String(applied) : schema !== null && schema !== '0'))
    throw dbGuardError('db-migration-permit-invalid');
  return { raw: row.v, expiresAt: p.expiresAt };
}
function dbMigrationFence(env, state, permit) {
  var args = [], checks = [];
  function arg(value) { args.push(value); return '?' + args.length; }
  if (state.tables) {
    var tables = arg(JSON.stringify(state.tables));
    checks.push("(SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*')<>" + state.tables.length);
    checks.push("EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*' AND name NOT IN (SELECT value FROM json_each(" + tables + ')))');
  }
  if (state.hasMeta) checks.push("(SELECT v FROM meta WHERE k='schema_version') IS NOT " + arg(state.schema));
  else checks.push("EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='meta')");
  if (state.hasLedger) {
    var ledger = arg(JSON.stringify(state.names));
    checks.push('(SELECT COUNT(*) FROM d1_migrations)<>' + state.names.length);
    checks.push('EXISTS(SELECT 1 FROM d1_migrations m WHERE NOT EXISTS(SELECT 1 FROM json_each(' + ledger + ') e WHERE e.value IS m.name))');
    checks.push('EXISTS(SELECT 1 FROM json_each(' + ledger + ') e WHERE NOT EXISTS(SELECT 1 FROM d1_migrations m WHERE m.name IS e.value))');
  }
  var invalid = permit ? "(SELECT v FROM meta WHERE k='" + DB_UPGRADE_PERMIT + "') IS NOT " + arg(permit.raw) +
    ' OR ' + arg(permit.expiresAt) + "<=CAST(strftime('%s','now') AS INTEGER)*1000+CAST(substr(strftime('%f','now'),4,3) AS INTEGER)" : '0';
  var statement = env.DB.prepare('SELECT CASE WHEN ' + (checks.length ? checks.join(' OR ') : '0') +
    " THEN json_extract('{}','KIVO_DB_SCHEMA') WHEN " + invalid +
    " THEN json_extract('{}','KIVO_DB_MIGRATION_PERMIT') END");
  return statement.bind.apply(statement, args);
}
async function migrateDb(env) {
  var applied = Object.create(null), known = Object.create(null), fresh = false, r0 = null, i, j;
  try { r0 = await env.DB.prepare('SELECT name FROM d1_migrations').all(); }
  catch (e0) { if (!/no such table/i.test(String((e0 && e0.message) || e0))) throw e0; fresh = true; }
  var rows = (r0 && r0.results) || [];
  for (i = 0; i < KIVO_MIGRATIONS.length; i++) known[KIVO_MIGRATIONS[i].name] = 1;
  /* لا يُستعمل إصدارٌ أقدم من العامل لتخمين مخطّطٍ أحدث أو لإعادة ختمه إلى الخلف.
     يُفحص السجل والختم قبل أي DDL أو كتابة؛ القواعد القديمة بلا meta أو سجل ترحيلات
     تبقى قابلةً للاستيعاب بواسطة adoptLegacy والترحيلات المعروفة كما كانت. */
  for (i = 0; i < rows.length; i++) {
    if (!known[rows[i].name]) throw new Error('db-schema-unsupported: unknown migration ' + rows[i].name);
    applied[rows[i].name] = 1;
  }
  var schemaRow = null;
  try { schemaRow = await env.DB.prepare("SELECT v FROM meta WHERE k = 'schema_version'").first(); }
  catch (eSchema) { if (!/no such table/i.test(String((eSchema && eSchema.message) || eSchema))) throw eSchema; }
  if (schemaRow) {
    var schemaText = String(schemaRow.v == null ? '' : schemaRow.v).trim(), schemaN = Number(schemaText);
    if (!/^\d+$/.test(schemaText) || !Number.isSafeInteger(schemaN) || schemaN > KIVO_SCHEMA_VERSION)
      throw new Error('db-schema-unsupported: database version exceeds or differs from supported schema ' + KIVO_SCHEMA_VERSION);
  }
  var pending = [];
  for (i = 0; i < KIVO_MIGRATIONS.length; i++) if (!applied[KIVO_MIGRATIONS[i].name]) pending.push(KIVO_MIGRATIONS[i]);
  if (!pending.length) return { applied: rows.length, ran: 0 };
  var names = KIVO_MIGRATIONS.map(function (m) { return m.name; }),
    appliedNames = rows.map(function (r) { return r.name; }),
    tables = (await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*' ORDER BY name").all()).results || [],
    tableNames = tables.map(function (t) { return t.name; }),
    empty = !rows.length && !tableNames.some(function (n) { return n !== 'd1_migrations'; }),
    schema = schemaRow ? String(schemaRow.v) : null;
  if (!deq(appliedNames.slice().sort(), names.slice(0, rows.length).sort())) throw dbGuardError('db-schema-unsupported');
  var permit = empty ? null : await dbMigrationPermit(env, names, rows.length, schema),
    legacy = fresh && !empty ? await adoptLegacy(env) : [],
    state = { names: appliedNames, schema: schema, hasMeta: tableNames.indexOf('meta') >= 0,
      hasLedger: !fresh, tables: tableNames };
  if (fresh) {
    await env.DB.batch([dbMigrationFence(env, state, permit), env.DB.prepare(MIG_TABLE)].concat(legacy));
    state.hasLedger = true;
    state.tables = null;
  }
  for (i = 0; i < pending.length; i++) {
    var dataPlan = pending[i].name === '0004_daily_stats' ? await dsLegacyPrepare(env) :
      pending[i].name === '0005_notifications' ? await nfLegacyPrepare(env) : pending[i].name === '0006_custody' ? await cuLegacyPrepare(env) : pending[i].name === '0008_irshad' ? await irLegacyPrepare(env) : pending[i].name === '0009_seized_awards' ? await bdMigrationPrepare(env) : pending[i].name === '0010_operational_domains' ? await opLegacyPrepare(env) : null;
    var st = [dbMigrationFence(env, state, permit)];
    if (dataPlan) st = st.concat(dataPlan.before);
    for (j = 0; j < pending[i].sql.length; j++) st.push(env.DB.prepare(pending[i].sql[j]));
    if (dataPlan) st = st.concat(dataPlan.after);
    if (permit && pending[i].name === names[names.length - 1])
      st.push(env.DB.prepare('DELETE FROM meta WHERE k=?1 AND v=?2').bind(DB_UPGRADE_PERMIT, permit.raw));
    st.push(env.DB.prepare('INSERT OR IGNORE INTO d1_migrations (name) VALUES (?1)').bind(pending[i].name));
    await env.DB.batch(st);
    state = { names: state.names.concat([pending[i].name]), schema: String(names.indexOf(pending[i].name) + 1), hasMeta: true, hasLedger: true, tables: null };
  }
  logEv('info', 'schema-migrate', { ran: pending.map(function (m) { return m.name; }).join(','), applied: rows.length + pending.length, fresh: fresh ? 1 : 0 });   /* KIVO_250 · SOT-142 */
  return { applied: rows.length + pending.length, ran: pending.length };
}
/* KIVO_265 · k265-init (حادثةُ Production 2026-10-15 — تشخيصٌ للقراءة): كان وعدُ التهيئة _init مشتركاً بين طلبات الـisolate — فإن أُلغي الطلبُ الذي بدأه
   أو علقت جولتُه الأولى إلى D1 بقي الوعدُ معلَّقاً أبداً، وانتظره كلُّ طلبٍ لاحق في الـisolate بلا مهلةٍ ولا 5xx (المساراتُ كلُّها معلّقة · الأصولُ تعمل).
   الآن: علامةٌ تُرفع بعد تهيئةٍ ناجحة وحدها (_initOk) — وقبلها يجري كلُّ طلبٍ migrateDb الخاصَّ به (متساوي القوى: IF NOT EXISTS · INSERT OR IGNORE ·
   وعلى القاعدة المحدَّثة قراءتان للتحقق من المخطّط) بمهلة INIT_MS: انقضاؤها أو الخطأُ رفضٌ يصل درعَ الأعطال (500 worker-error · وصفحةُ 503 للغلاف) سريعاً؛ ولا يُخبَّأ وعدٌ معلَّق */
var _initOk = false, INIT_MS = 8000;
function initDb(env) {
  if (_initOk) return Promise.resolve(true);
  return new Promise(function (ok, no) {
    var fin = false, tm = setTimeout(function () { if (!fin) { fin = true; no(new Error('db-init-timeout ' + INIT_MS + 'ms')); } }, INIT_MS);
    migrateDb(env).then(function () { _initOk = true; if (!fin) { fin = true; clearTimeout(tm); ok(true); } }, function (e9) { if (!fin) { fin = true; clearTimeout(tm); no(e9); } });
  });
}

/* ═══ KIVO_255 · AUD-037 (SOT-149): لقطةُ قراءةٍ لكل طلب — جولةُ D1 واحدة لمقدّمة الطلب المصادَق ═══
   كانت مقدّمةُ كلِّ طلبٍ مصادَق تقرأ متسلسلةً: السياسة · وضعُ الإنفاذ · الجلسة · الحسابات · الصلاحيات · الإدارات · العقد · المنصة · المراجعات
   (≈ 9–12 جولة D1 من الحافة إلى موقع القاعدة ⇒ ≈ 1.2 s على Preview). الآن تُجلب كلُّها في دفعةٍ واحدة (batch) أوّلَ الطلب وتُحفظ لقطةً
   على env.__pre، وتستهلكها kvGet/metaGet/session/revsAll ما دامت «حيّة». الضمانُ الدلالي: اللقطةُ تُطفأ عند أوّل كتابةٍ في الطلب
   (dbGuard يلفّ env.DB: batch · exec · أيُّ عبارةِ تعديل مهما كان منفذُها) فلا قراءةَ قديمةً بعد كتابة — والقراءاتُ بعدها حيّةٌ كما كانت.
   إن أخفق جلبُ اللقطة (تعذّرُ D1) يُترك env.__pre فارغاً وتعمل كلُّ المسارات كما قبل 255 (ومنها وضعُ الحماية fail-closed في enfModeOf). */
var PRE_META_BASE = ['policy', 'rev', 'rk', 'schema_version', 'restore_epoch'], PRE_META_AUTHZ = ['authz_mode', 'authz_perm_mig', 'authz_scope_mig', 'authz_id_mig'];   /* مفاتيحُ الإنفاذ تُقرأ في بيئة الإنفاذ وحدها (KIVO_243: Production بلا المتغيّر لا تقرأ شيئاً) — والعبارةُ تحمل علامةَ pre:authz حين تشملها */
var PRE_KV = [K_USERS, K_PERM, K_DEPTS, K_GDEPTS, K_PLAT];
function kvJoin(rows) {
  var out = {}, i; rows = rows || [];
  for (i = 0; i < rows.length; i++) out[rows[i].k] = (out[rows[i].k] || '') + rows[i].v;
  return out;
}
function preOff(env) { if (env && env.__pre) env.__pre.live = false; }
/* يُغلّف env.DB فيُطفئ اللقطةَ عند أيّ كتابة؛ العباراتُ الملفوفة تُفكّ قبل batch الحقيقية */
function dbGuardError(code, status) {
  var e = new Error(code);
  e.dbGuardCode = code;
  e.dbGuardStatus = status || 503;
  return e;
}
function dbGuardFailure(e) {
  var text = String((e && e.message) || e || '');
  if (e && e.dbGuardCode) return { err: e.dbGuardCode, status: e.dbGuardStatus || 503 };
  if (/KIVO_DB_MIGRATION_PERMIT/.test(text)) return { err: 'db-migration-permit-invalid', status: 503 };
  if (/KIVO_RESTORE_EPOCH/.test(text)) return { err: 'restore-epoch-changed', status: 409 };
  if (/KIVO_DB_SCHEMA|db-schema-unsupported|no such table: (?:main\.)?(?:meta|d1_migrations)\b/i.test(text))
    return { err: 'db-schema-unsupported', status: 503 };
  return null;
}
function dbGuardCapture(meta, migrations) {
  var stamp = meta.schema_version,
    epoch = meta.restore_epoch == null ? '0' : String(meta.restore_epoch),
    known = KIVO_MIGRATIONS.map(function (m) {
      return m.name;
    }),
    seen = Object.create(null);
  if (
    String(stamp) === 'undefined' ||
    String(stamp) !== String(KIVO_SCHEMA_VERSION) ||
    !Array.isArray(migrations) ||
    migrations.length !== known.length
  )
    throw dbGuardError('db-schema-unsupported');
  migrations.forEach(function (m) {
    if (!m || typeof m.name !== 'string' || known.indexOf(m.name) < 0 || seen[m.name]) throw dbGuardError('db-schema-unsupported');
    seen[m.name] = 1;
  });
  if (!/^(0|[1-9]\d*)$/.test(epoch) || !Number.isSafeInteger(Number(epoch))) throw dbGuardError('db-restore-epoch-invalid');
  return { schema: String(stamp), epoch: Number(epoch), names: JSON.stringify(known), count: known.length };
}
function dbGuardStatement(DB, capture) {
  return DB.prepare(
    "SELECT CASE WHEN COALESCE((SELECT v FROM meta WHERE k='schema_version'),'')<>?1 " +
      'OR (SELECT COUNT(*) FROM d1_migrations)<>?2 ' +
      'OR EXISTS(SELECT 1 FROM d1_migrations m WHERE NOT EXISTS(SELECT 1 FROM json_each(?3) e WHERE e.value IS m.name)) ' +
      'OR EXISTS(SELECT 1 FROM json_each(?3) e WHERE NOT EXISTS(SELECT 1 FROM d1_migrations m WHERE m.name IS e.value)) ' +
      "THEN json_extract('{}','KIVO_DB_SCHEMA') " +
      "WHEN COALESCE((SELECT v FROM meta WHERE k='restore_epoch'),'0')<>?4 " +
      "THEN json_extract('{}','KIVO_RESTORE_EPOCH') END",
  ).bind(capture.schema, capture.count, capture.names, String(capture.epoch));
}
function dbGuardReadOnly(sql) {
  var text = String(sql).replace(/^(?:\s|--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)*/, '');
  return /^(?:SELECT|EXPLAIN)\b/i.test(text) || /^PRAGMA\s+(?:table_info|index_list|foreign_key_check)\s*\(/i.test(text);
}
function dbGuardCacheNeutral(sql, args) {
  var q = String(sql).replace(/\s+/g, ' ').trim(),
    a = args || [];
  if (/^UPDATE sess SET la = \?2 WHERE tok = \?1$/i.test(q)) return true;
  if (/^DELETE FROM meta WHERE k = \?1$/i.test(q)) return typeof a[0] === 'string' && /^tkg:(?:rec|due|ird|szd):[^:]+$/.test(a[0]);
  if (/^INSERT INTO meta \(k, v\) VALUES \(\?\d+, \?1\)(?:, \(\?\d+, \?1\))* ON CONFLICT\(k\) DO UPDATE SET v = excluded.v$/i.test(q))
    return (
      a.length > 1 &&
      a.slice(1).every(function (k) {
        return typeof k === 'string' && /^tkg:(?:rec|due|ird|szd):[^:]+$/.test(k);
      })
    );
  return false;
}
async function dbGuardFallback(env, tok) {
  var result;
  try {
    result = await env.DB.batch([
      env.DB.prepare("SELECT k,v FROM meta WHERE k IN ('schema_version','restore_epoch')"),
      env.DB.prepare('SELECT name FROM d1_migrations'),
    ]);
  } catch (e) {
    throw dbGuardError('db-guard-unavailable');
  }
  var meta = { schema_version: null, restore_epoch: null };
  ((result[0] && result[0].results) || []).forEach(function (r) {
    meta[r.k] = r.v;
  });
  return {
    live: false,
    meta: meta,
    kv: {},
    revs: {},
    tok: tok || '',
    sess: null,
    hasSess: false,
    guard: dbGuardCapture(meta, (result[1] && result[1].results) || []),
  };
}
function dbGuard(DB, pre, preserve) {
  var capture = pre.guard;
  if (!capture) throw dbGuardError('db-guard-unavailable');
  function unwrap(s) {
    while (s && s.__st) s = s.__st;
    return s;
  }
  function off(sql, args) {
    if (!preserve || !dbGuardCacheNeutral(sql, args)) pre.live = false;
  }
  function compatible(s) {
    if (!s || !s.__guard) return;
    var c = s.__guard;
    if (c.schema !== capture.schema || c.names !== capture.names) throw dbGuardError('db-schema-unsupported');
    if (c.epoch !== capture.epoch) throw dbGuardError('restore-epoch-changed', 409);
  }
  function resultOf(result, method, args) {
    if (method === 'all' || method === 'run') return result;
    var rows = (result && result.results) || [];
    if (method === 'first') {
      if (!rows.length) return null;
      if (args[0] !== undefined) {
        if (rows[0][args[0]] === undefined) throw new Error('D1_COLUMN_NOTFOUND: Column not found (' + args[0] + ')');
        return rows[0][args[0]];
      }
      return rows[0];
    }
  }
  function wrap(st, sql, args) {
    var read = dbGuardReadOnly(sql),
      q = { __st: st, __guard: capture, __guardReadOnly: read };
    q.bind = function () {
      return wrap(st.bind.apply(st, arguments), sql, Array.prototype.slice.call(arguments));
    };
    ['first', 'all', 'raw', 'run'].forEach(function (method) {
      q[method] = async function () {
        if (method === 'raw') {
          if (!read) throw dbGuardError('db-unfenced-raw', 409);
          return st.raw.apply(st, arguments);
        }
        if (!read) off(sql, args);
        var out = await DB.batch([dbGuardStatement(DB, capture), unwrap(st)]);
        return resultOf(out[1], method, arguments);
      };
    });
    return q;
  }
  var g = {
    prepare: function (sql) {
      return wrap(DB.prepare(sql), String(sql));
    },
    batch: async function (statements) {
      var a = statements || [];
      a.forEach(compatible);
      if (
        a.some(function (s) {
          return !s || s.__guardReadOnly !== true;
        })
      )
        pre.live = false;
      var out = await DB.batch([dbGuardStatement(DB, capture)].concat(a.map(unwrap)));
      return out.slice(1);
    },
    exec: function () {
      throw dbGuardError('db-unfenced-exec', 409);
    },
  };
  if (typeof DB.withSession === 'function')
    g.withSession = function (bookmark) {
      return dbGuard(DB.withSession(bookmark), pre, preserve);
    };
  if (typeof DB.getBookmark === 'function')
    g.getBookmark = function () {
      return DB.getBookmark();
    };
  return g;
}
async function preload(env, tok, kvKeys) {
  var pre = { live: true, meta: {}, kv: {}, revs: {}, tok: tok || '', sess: null, hasSess: !!tok },
    i;
  var withAuthz = enfEnvOn(env),
    PRE_META = withAuthz ? PRE_META_BASE.concat(PRE_META_AUTHZ) : PRE_META_BASE;
  for (i = 0; i < PRE_META.length; i++) pre.meta[PRE_META[i]] = null;
  for (i = 0; i < kvKeys.length; i++) pre.kv[kvKeys[i]] = null;
  var sM = env.DB.prepare(
    'SELECT k, v FROM meta WHERE k IN (' +
      PRE_META.map(function (_, j) {
        return '?' + (j + 1);
      }).join(',') +
      ')' +
      (withAuthz ? ' /* pre:authz */' : ''),
  );
  var sK = env.DB.prepare(
    'SELECT k, seq, v FROM kv WHERE k IN (' +
      kvKeys
        .map(function (_, j) {
          return '?' + (j + 1);
        })
        .join(',') +
      ') ORDER BY k, seq',
  );
  var st = [
    sM.bind.apply(sM, PRE_META),
    kvKeys.length ? sK.bind.apply(sK, kvKeys) : env.DB.prepare('SELECT k, seq, v FROM kv WHERE 0'),
    env.DB.prepare('SELECT k, rev FROM revs'),
    env.DB.prepare('SELECT name FROM d1_migrations'),
  ];
  if (tok) st.push(env.DB.prepare('SELECT tok, uid, ts, la, dev FROM sess WHERE tok = ?1').bind(tok));
  var rs = await env.DB.batch(st),
    R = function (n) {
      return (rs && rs[n] && rs[n].results) || [];
    };
  R(0).forEach(function (r) {
    pre.meta[r.k] = r.v;
  });
  pre.guard = dbGuardCapture(pre.meta, R(3));
  var joined = kvJoin(R(1));
  Object.keys(joined).forEach(function (k) {
    pre.kv[k] = joined[k];
  });
  R(2).forEach(function (r) {
    pre.revs[r.k] = r.rev;
  });
  if (tok) pre.sess = R(4)[0] || null;
  return pre;
}
/* يُرفق اللقطةَ بالبيئة (نسخةٌ جديدة من env — لا تُمسّ البيئةُ الأصلية) · عند التعذّر: بلا لقطة */
async function preAttach(env, request, mode) {
  var tok = readCookie(request, COOKIE),
    pre = null,
    keys = mode === 'shell' ? [] : tok ? PRE_KV : [K_USERS, K_PLAT];
  try {
    pre = await preload(env, tok, keys);
  } catch (e) {
    if (dbGuardFailure(e)) throw e;
    swallow('pre-load', e, env.__rid);
    pre = await dbGuardFallback(env, tok);
  }
  return Object.assign({}, env, {
    __pre: pre,
    __restoreEpoch: pre.guard.epoch,
    __rawDB: dbGuard(env.DB, pre, true),
    DB: dbGuard(env.DB, pre),
  });
}
/* قراءة قيمة مفتاح مجزّأة وإعادة تجميعها (KIVO_255: من اللقطة إن كان المفتاحُ فيها وهي حيّة) */
async function kvGet(env, table, k) {
  var P = env.__pre;
  if (P && P.live && table === 'kv' && Object.prototype.hasOwnProperty.call(P.kv, k)) return P.kv[k];
  if (P && P.live && P.track && table === 'kv') return (await rsScopeKV(env, [k]))[k];   /* RISHAD-266 · s1: a department-scoped reference fences what it reads (019d) */
  var r = await env.DB.prepare('SELECT v FROM ' + table + ' WHERE k = ?1 ORDER BY seq').bind(k).all();
  var rows = (r && r.results) || [];
  if (!rows.length) return null;
  var out = '';
  for (var i = 0; i < rows.length; i++) out += rows[i].v;
  return out;
}
/* KIVO_255 · AUD-037: مفاتيحُ عدّة في جولةٍ واحدة — {k: القيمة أو null}؛ حدُّ معاملات D1 (100) يُراعى بالتقطيع */
async function kvMany(env, table, ks) {
  var P = env.__pre; if (P && P.live && P.track && table === 'kv') return await rsScopeKV(env, ks);   /* RISHAD-266 · s1 (019d) */
  var out = {}, i, j;
  for (i = 0; i < ks.length; i++) out[ks[i]] = null;
  for (i = 0; i < ks.length; i += 90) {
    var part = ks.slice(i, i + 90);
    var sQ = env.DB.prepare('SELECT k, seq, v FROM ' + table + ' WHERE k IN (' + part.map(function (_, n) { return '?' + (n + 1); }).join(',') + ') ORDER BY k, seq');
    var r = await sQ.bind.apply(sQ, part).all();
    var kj = kvJoin((r && r.results) || []);
    for (j in kj) out[j] = kj[j];
  }
  return out;
}
/* كتابة قيمة مجزّأة — حذف القِطع القديمة ثم إدراج الجديدة في دفعة واحدة */
function kvPutStmts(env, table, k, v) {
  var st = [env.DB.prepare('DELETE FROM ' + table + ' WHERE k = ?1').bind(k)];
  v = String(v);
  var n = Math.max(1, Math.ceil(v.length / CHUNK));
  for (var i = 0; i < n; i++)
    st.push(env.DB.prepare('INSERT INTO ' + table + ' (k, seq, v) VALUES (?1, ?2, ?3)').bind(k, i, v.slice(i * CHUNK, (i + 1) * CHUNK)));
  return st;
}
