/* Candidate custody transport: server authority, bounded DTOs and confirmed
 * mutation receipts only. No storage, serial allocation or business-event emit.
 * Staging only; not loaded by the accepted runtime. */
(function () {
  'use strict';
  var prepared = new WeakMap();
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function integer(value) { return Number.isSafeInteger(value) && value >= 0; }
  function context() {
    var boot = window.__BS_BOOT || {}, auth = KIVO.BassamAuth, user = auth && auth.user && auth.user();
    var dept = KIVO.BassamDepts && KIVO.BassamDepts.active && KIVO.BassamDepts.active();
    if (boot.srv !== 1 || boot.cf !== 1 || !boot.uid || !user || String(user.id) !== String(boot.uid)) return null;
    return { uid: String(boot.uid), dept: String(dept || ''), key: String(boot.uid) + '\u0000' + String(dept || '') };
  }
  function failure(code, status) {
    var messages = {
      session: 'تغيّرت الجلسة — أعد تحميل الصفحة قبل المتابعة',
      conflict: 'تغيّرت بيانات العهد على الخادم؛ مسودتك محفوظة، راجع النسخة الجديدة قبل إعادة الاعتماد',
      invalid: 'لم يصل تأكيد كامل من الخادم؛ لم يُعرض نجاح، أعد المحاولة بنفس الطلب',
      network: 'تعذّر تأكيد العملية على الخادم؛ مسودتك محفوظة لإعادة المحاولة',
      forbidden: 'صلاحيتك لا تشمل هذه العملية',
      'custody-quota': 'القطع المتاحة لا تكفي للسند؛ لم يُسجل تسليم جزئي ومسودتك محفوظة',
      'custody-history': 'للصنف سجل حركات؛ لا يمكن حذفه، عدّل كميته وفق العهد القائمة',
      'custody-duplicate': 'يوجد صنف بهذا الاسم؛ راجع الاسم ثم أعد المحاولة',
      'custody-issue-missing': 'العهدة لم تعد نشطة في النسخة الحالية؛ حدّث بيانات الحامل',
    };
    return { ok: 0, err: code, status: status || 0, message: messages[code] || 'رفض الخادم العملية؛ راجع المدخلات ثم أعد المحاولة' };
  }
  function same(stamp) { var now = context(); return !!now && now.key === stamp.key; }
  async function request(url, options, stamp) {
    if (!stamp || !same(stamp)) return failure('session', 401);
    var control = new AbortController(), timer = setTimeout(function () { control.abort(); }, 15000);
    try {
      var response = await fetch(url, Object.assign({ credentials: 'same-origin', cache: 'no-store', signal: control.signal }, options));
      if (!same(stamp)) return failure('session', 401);
      var body;
      try { body = await response.json(); } catch (error) { return failure('invalid', response.status); }
      if (!same(stamp)) return failure('session', 401);
      if (!response.ok || !body || body.ok !== 1) {
        var code = String(body && body.err || 'invalid');
        if (response.status === 401) code = 'session';
        else if (response.status === 403) code = 'forbidden';
        else if (response.status === 409 && ['custody-quota', 'custody-history', 'custody-duplicate'].indexOf(code) < 0) code = 'conflict';
        return failure(code, response.status);
      }
      return { ok: 1, body: body };
    } catch (error) { return failure(same(stamp) ? 'network' : 'session'); }
    finally { clearTimeout(timer); }
  }
  function identity() {
    if (!window.crypto || !window.crypto.getRandomValues) return null;
    var bytes = new Uint8Array(20); window.crypto.getRandomValues(bytes);
    return 'cu-' + Array.from(bytes, function (n) { return n.toString(16).padStart(2, '0'); }).join('');
  }
  function prepare(op, data, base) {
    var stamp = context(), requestId = identity();
    if (!stamp) return failure('session', 401);
    if (!requestId || !integer(base) || ['type-create', 'type-edit', 'type-delete', 'issue', 'issue-batch', 'close'].indexOf(op) < 0) return failure('invalid');
    var body = Object.assign({}, clone(data || {}), { uid: stamp.uid, dept: stamp.dept, base: base, requestId: requestId, op: op });
    var ticket = Object.freeze({ requestId: requestId, op: op });
    prepared.set(ticket, { stamp: stamp, body: body });
    return ticket;
  }
  async function send(ticket) {
    var input = prepared.get(ticket);
    if (!input || !same(input.stamp)) return failure('session', 401);
    var result = await request('/api/custody/act', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input.body) }, input.stamp);
    if (!result.ok) return result;
    var receipt = result.body, expected = input.body.op === 'issue-batch' ? (input.body.lines || []).length : 1;
    if (!integer(receipt.rev) || receipt.requestId !== input.body.requestId || receipt.op !== input.body.op || receipt.n !== expected || !Array.isArray(receipt.outputs)) return failure('invalid');
    if (/^type-/.test(input.body.op)) {
      if (typeof receipt.itemId !== 'string' || !receipt.itemId) return failure('invalid');
    } else {
      if (receipt.outputs.length !== expected || receipt.outputs.some(function (row) { return !row || typeof row.issueId !== 'string' || !row.issueId || typeof row.moveId !== 'string' || !row.moveId || typeof row.serial !== 'string'; })) return failure('invalid');
      if (input.body.op === 'close' && receipt.outputs[0].issueId !== input.body.issueId) return failure('invalid');
    }
    return { ok: 1, receipt: clone(receipt) };
  }
  async function read(options) {
    var stamp = context(), input = options || {}, view = input.view || 'month';
    if (!stamp) return failure('session', 401);
    if (['month', 'holder', 'moves', 'catalog'].indexOf(view) < 0) return failure('invalid');
    var limit = input.limit == null ? 100 : +input.limit;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > (view === 'month' ? 100 : 200)) return failure('invalid');
    var query = new URLSearchParams({ uid: stamp.uid, dept: stamp.dept, view: view, limit: String(limit) });
    ['year', 'month', 'cursor', 'kind', 'holderKey', 'q'].forEach(function (key) { if (input[key] !== undefined && input[key] !== null && input[key] !== '') query.set(key, String(input[key])); });
    var result = await request('/api/custody?' + query.toString(), { method: 'GET' }, stamp);
    if (!result.ok) return result;
    var body = result.body;
    if (!integer(body.rev) || !body.clock || !Number.isSafeInteger(body.clock.y) || !Number.isSafeInteger(body.clock.m) || !Number.isSafeInteger(body.clock.d) || !Array.isArray(body.rows) || body.rows.length > limit || !integer(body.total) || !(body.next == null || typeof body.next === 'string')) return failure('invalid');
    return { ok: 1, data: clone(body), contextKey: stamp.key };
  }
  async function collectHolder(options) {
    var stamp = context(), rows = [], cursor = null, revision = null, cursors = new Set();
    if (!stamp) return failure('session', 401);
    do {
      if (!same(stamp)) return failure('session', 401);
      var page = await read(Object.assign({}, options, { view: 'holder', limit: 200, cursor: cursor }));
      if (!page.ok) return page;
      if (!same(stamp) || page.contextKey !== stamp.key) return failure('session', 401);
      if (revision !== null && revision !== page.data.rev) return failure('conflict', 409);
      revision = page.data.rev; rows.push.apply(rows, page.data.rows);
      if (rows.length > 10000) return { ok: 0, err: 'export-too-large', message: 'السند أكبر من حد الطباعة المحلية؛ لم تُطبع نسخة جزئية' };
      cursor = page.data.next;
      if (cursor && cursors.has(cursor)) return failure('invalid');
      if (cursor) cursors.add(cursor);
      if (!cursor && rows.length !== page.data.total) return failure('invalid');
    } while (cursor);
    return { ok: 1, rev: revision, rows: rows };
  }
  async function exportDomain(dept) {
    var stamp = context(); if (!stamp) return failure('session', 401);
    var query = new URLSearchParams({ uid: stamp.uid }); if (dept) query.set('dept', String(dept));
    var result = await request('/api/custody/export?' + query.toString(), { method: 'GET' }, stamp);
    if (!result.ok) return result;
    var domains = result.body.domains, seen = new Set();
    if (!Array.isArray(domains) || domains.some(function (domain) {
      var id = domain && domain.scope && domain.scope.departmentId;
      if (!domain || domain.version !== 1 || typeof id !== 'string' || !id || seen.has(id) || !domain.rows || !['items', 'issues', 'moves'].every(function (name) { return Array.isArray(domain.rows[name]); })) return true;
      seen.add(id); return false;
    }) || (dept && (domains.length !== 1 || domains[0].scope.departmentId !== String(dept)))) return failure('invalid');
    return { ok: 1, domains: clone(domains) };
  }
  KIVO.Custody = Object.freeze({ read: read, prepare: prepare, send: send, collectHolder: collectHolder, exportDomain: exportDomain, context: context });
})();
