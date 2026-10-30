/* One backup transport for admin, department settings and the authenticated gate.
   Files/tickets remain in memory. No local storage overlay or image upload. */
(function () {
  'use strict';
  var tickets = new WeakMap();
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }
  function integer(value) {
    return Number.isSafeInteger(value) && value >= 0;
  }
  function record(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }
  function counts(value) {
    return (
      record(value) &&
      ['kv', 'dailyStats', 'notifications', 'custody', 'kept'].every(function (k) {
        return integer(value[k]);
      })
    );
  }
  function context() {
    var boot = window.__BS_BOOT || {},
      auth = KIVO.BassamAuth,
      user = auth && auth.user && auth.user();
    return boot.srv === 1 && boot.cf === 1 && boot.uid && user && String(user.id) === String(boot.uid) ? { uid: String(boot.uid) } : null;
  }
  function same(stamp) {
    var now = context();
    return !!now && now.uid === stamp.uid;
  }
  function failure(code, status, data) {
    var messages = {
      session: 'سجّل الدخول بالحساب الحالي أولًا؛ كلمة ملف النسخة ليست مصادقة على الخادم',
      network: 'تعذّر تأكيد الاستعادة؛ الملف محفوظ، أعد المحاولة بالطلب نفسه',
      invalid: 'لم يصل إقرار كامل من الخادم؛ لم يُعرض نجاح',
      conflict: 'تغيّرت البيانات؛ راجع الجرد مجددًا قبل اعتماد الاستعادة',
      reason: 'أُلغي الاستيراد لعدم إدخال سبب',
      cancelled: 'أُلغيت الاستعادة دون كتابة',
      'backup-image-reuse-rejected': 'تعذّر اعتماد صور النسخة؛ تُقبل فقط صور موجودة ومطابقة ومصرّح بمرجعها',
      'restore-image-body-missing': 'النسخة تشير إلى صورة غير موجودة؛ أُوقفت الاستعادة كاملةً',
      'restore-credential-change': 'النسخة تغيّر بيانات دخول حساب قائم؛ أُوقفت لحماية كلمات المرور الحالية',
      'restore-self-identity-change': 'النسخة تغيّر اسم دخول صاحب الجلسة؛ غيّره من إعدادات الحساب بالمصادقة الحالية',
    };
    return {
      ok: 0,
      err: code,
      status: status || 0,
      message: messages[code] || 'رفض الخادم النسخة؛ لم تُعتمد الاستعادة',
      uncertain: ['invalid', 'session', 'network'].includes(code) || !status || status >= 500,
      details: data,
    };
  }
  async function request(url, options, stamp) {
    if (!stamp || !same(stamp)) return failure('session', 401);
    var controller = new AbortController(),
      timer = setTimeout(function () {
        controller.abort();
      }, 20000);
    try {
      var response = await fetch(url, Object.assign({ credentials: 'same-origin', cache: 'no-store', signal: controller.signal }, options)),
        data;
      try {
        data = await response.json();
      } catch (e) {
        return failure('invalid', response.status);
      }
      if (!same(stamp)) return failure('session', 401);
      if (!response.ok || !data || data.ok !== 1)
        return failure(response.status === 401 ? 'session' : String((data && data.err) || 'invalid'), response.status, data);
      return { ok: 1, data: data };
    } catch (e) {
      return failure(same(stamp) ? 'network' : 'session', same(stamp) ? 0 : 401);
    } finally {
      clearTimeout(timer);
    }
  }
  function identity() {
    if (!window.crypto || !window.crypto.getRandomValues) return null;
    var bytes = new Uint8Array(20);
    window.crypto.getRandomValues(bytes);
    return (
      'rs-' +
      Array.from(bytes, function (n) {
        return n.toString(16).padStart(2, '0');
      }).join('')
    );
  }
  function askReason(scope) {
    var srv = KIVO.__BS_SRV;
    if (!srv || typeof srv.askReason !== 'function') return Promise.resolve('');
    return new Promise(function (resolve) {
      srv.askReason(
        scope.kind === 'dept' ? 'bsdept:' + scope.departmentId + ':bassam_employees_v1' : 'bassam_depts_v1',
        ['backup.restore'],
        function (reason) {
          resolve(String(reason || ''));
        },
      );
    });
  }
  async function prepare(file, options) {
    var stamp = context(),
      opt = options || {},
      scope = clone(opt.scope || { kind: 'full' }),
      id = identity();
    if (!stamp) return failure('session', 401);
    if (!id || !file || typeof file !== 'object' || !['replace', 'merge'].includes(opt.mode) || !['full', 'dept'].includes(scope.kind))
      return failure('invalid');
    var reason = typeof opt.reason === 'string' ? opt.reason.trim() : await askReason(scope);
    if (!reason) return failure('reason', 403);
    if (!same(stamp)) return failure('session', 401);
    var departments = [];
    try {
      departments = JSON.parse((file.data && file.data.bassam_depts_v1) || '[]').map(function (d) {
        return d.id;
      });
    } catch (e) {}
    var query = new URLSearchParams({ kind: scope.kind, departments: JSON.stringify(departments) });
    if (scope.kind === 'dept') query.set('dept', scope.departmentId || '');
    var read = await request('/api/backup/restore?' + query.toString(), {}, stamp);
    if (!read.ok) return read;
    var base = read.data.base;
    if (!base || !integer(base.epoch) || !base.kv || !base.custody) return failure('invalid');
    var body = {
        version: 1,
        uid: stamp.uid,
        requestId: id,
        scope: scope,
        mode: opt.mode,
        reason: reason,
        base: clone(base),
        backup: clone(file),
        legacyConsent: false,
        phase: 'inspect',
      },
      checked = await request(
        '/api/backup/restore',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
        stamp,
      );
    if (!checked.ok) return checked;
    var inspection = checked.data.inspection;
    if (
      !inspection ||
      !counts(inspection.counts) ||
      !record(inspection.base) ||
      !record(inspection.summary) ||
      typeof inspection.summary.legacy !== 'boolean' ||
      !integer(inspection.summary.imagesReused) ||
      !Array.isArray(inspection.summary.emptyDomains) ||
      !Array.isArray(inspection.summary.preservedGlobals) ||
      JSON.stringify(inspection.scope) !== JSON.stringify(scope)
    )
      return failure('invalid');
    body.base = clone(inspection.base);
    body.phase = 'commit';
    var ticket = Object.freeze({ requestId: id });
    tickets.set(ticket, { stamp: stamp, body: body, inspection: clone(inspection), approved: false });
    return { ok: 1, ticket: ticket, inspection: clone(inspection) };
  }
  function approve(ticket) {
    var entry = tickets.get(ticket);
    if (!entry || !same(entry.stamp)) return failure('session', 401);
    entry.approved = true;
    entry.body.legacyConsent = !!entry.inspection.summary.legacy;
    return { ok: 1 };
  }
  async function send(ticket) {
    var entry = tickets.get(ticket);
    if (!entry || !entry.approved || !same(entry.stamp)) return failure('session', 401);
    var result = await request(
      '/api/backup/restore',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry.body) },
      entry.stamp,
    );
    if (!result.ok) return result;
    var ack = result.data;
    if (
      ack.requestId !== entry.body.requestId ||
      !integer(ack.rev) ||
      typeof ack.snapshot !== 'string' ||
      !ack.snapshot ||
      ack.mode !== entry.body.mode ||
      !ack.scope ||
      JSON.stringify(ack.scope) !== JSON.stringify(entry.body.scope) ||
      !integer(ack.imagesReused) ||
      ack.imagesReused !== entry.inspection.summary.imagesReused ||
      !counts(ack.counts) ||
      JSON.stringify(ack.counts) !== JSON.stringify(entry.inspection.counts) ||
      typeof ack.reauthRequired !== 'boolean' ||
      !record(ack.revs) ||
      Object.values(ack.revs).some(function (v) {
        return !integer(v) || v > ack.rev;
      })
    )
      return failure('invalid');
    return { ok: 1, receipt: clone(ack) };
  }
  async function confirm(prepared) {
    if (!prepared || !prepared.ok) return false;
    var i = prepared.inspection,
      c = i.counts || {},
      legacy = i.summary && i.summary.legacy,
      text =
        'سيُعتمد ' +
        (c.kv || 0) +
        ' مجموعة بيانات و' +
        (c.custody || 0) +
        ' نطاق عهد. ستبقى كلمات مرور الحسابات الحالية كما هي.' +
        (legacy ? ' ستُحوَّل النسخة القديمة إلى المخطط الحالي قبل الكتابة.' : '') +
        (i.summary.imagesReused
          ? ' سيُعاد استخدام ' + i.summary.imagesReused + ' صورة موجودة بعد تطابقها؛ أجسامها الحالية تبقى معتمدة.'
          : '') +
        (legacy && i.summary.emptyDomains.length
          ? ' النسخة القديمة لا تحمل ' + i.summary.emptyDomains.length + ' نطاق عهد أو تنبيهات؛ ستُستعاد فارغة وفق معنى النسخة القديمة.'
          : '') +
        (i.summary.preservedGlobals.length ? ' سيُحافظ على ' + i.summary.preservedGlobals.length + ' مورد عام غير مشمول بالنسخة.' : '');
    return KIVO.bsConfirm
      ? !!(await KIVO.bsConfirm({ title: 'اعتماد استعادة النسخة', msg: text, ok: 'استعادة النسخة', cancel: 'إلغاء' }))
      : !!window.confirm(text);
  }
  async function refresh() {
    try {
      if (KIVO.__BS_SRV && KIVO.__BS_SRV.resync) await KIVO.__BS_SRV.resync(false);
      if (KIVO.BassamNotif && KIVO.BassamNotif.refresh) await KIVO.BassamNotif.refresh();
      return { ok: 1 };
    } catch (e) {
      return failure('network');
    }
  }
  KIVO.BackupRestore = Object.freeze({
    context: context,
    prepare: prepare,
    approve: approve,
    send: send,
    confirm: confirm,
    refresh: refresh,
  });
})();
