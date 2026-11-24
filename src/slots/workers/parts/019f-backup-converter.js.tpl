/* Backup normalization. Read/validate only: the existing restore compiler
   remains the only writer and the only source of authorization/account policy. */
function rsBCFail(code) {
  throw rsError('backup-' + code);
}
function rsBCParse(raw) {
  if (typeof raw !== 'string') rsBCFail('value-shape');
  try {
    return JSON.parse(raw);
  } catch (e) {
    rsBCFail('value-json');
  }
}
function rsBCClone(value) {
  return JSON.parse(JSON.stringify(value));
}
function rsBCOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}
function rsBCDeptIds(raw) {
  var rows = rsBCParse(raw);
  if (!Array.isArray(rows)) rsBCFail('departments');
  var ids = rows.map(function (d) {
    if (!isObj(d) || typeof d.id !== 'string' || !d.id || d.id.indexOf(':') >= 0) rsBCFail('departments');
    return d.id;
  });
  if (new Set(ids).size !== ids.length) rsBCFail('departments');
  return ids;
}
function rsBCNF(domain, scope) {
  return Object.assign({ version: 1 }, rsNFValidate(domain, scope));
}
function rsBCEmptyNF() {
  var d = { version: 1 };
  Object.keys(NF_TABLES).forEach(function (n) {
    d[n] = [];
  });
  return d;
}
function rsBCRemapNF(domain, source, target, rec) {
  var next = rsBCClone(domain);
  if (source === target) return next;
  /* V7 · د6 (remap): ومفتاحُ مدير الإدارة المصدر في منشئ التنبيه وأهدافه — كما في النسخة القديمة (rsBCDeptWalk) */
  function mgr(r, c) {
    if (rsBCMgrOf(r[c]) !== source) return;
    r[c] = 'mgr:' + target + r[c].slice(4 + source.length);
    if (rec) { rec.n++; rec.by['التنبيهات'] = (rec.by['التنبيهات'] || 0) + 1; }
  }
  Object.keys(NF_TABLES).forEach(function (n) {
    next[n].forEach(function (r) {
      var col = n === 'states' ? 'message_scope' : 'scope';
      if (r[col] === 'd:' + source) r[col] = 'd:' + target;
      if (n === 'messages' && r.department === source) r.department = target;
      if (n === 'messages') mgr(r, 'author_key');
      if (n === 'targets' && r.kind === 'department' && r.value === source) r.value = target;
      if (n === 'targets' && r.kind === 'employee') mgr(r, 'value');
    });
  });
  return next;
}
/* V7 · د6 (remap): إعادةُ ربط معرّف الإدارة. نسخةُ إدارةٍ من Production لا تحمل معرّفَ إدارتها في رأسها (dept اسمٌ، والمفاتيحُ بلا بادئة)،
   ويحمله ما تكتبه الكتّابُ فيها (جردُ مصدر Production 39b7f42): التنبيهُ dept (441 emit · tkNotify) · مفتاحُ مدير الإدارة «mgr:<المعرّف>» (330 mgrKeyOf)
   في منشئ التنبيه by وأهدافه to.e وعلامات القراءة read/ack/del (مفاتيحُها رمزُ الحساب) · ومنشئ المهمة ومراجِعها r[23].by.e · r[23].rv.e (071 tkWho) ·
   وصحيفةُ صلاحيات المدير في شريحة الصلاحيات perms.emps (ومواضعُ الأنظمة في RS_DEPT_REFS). هذه المواضع وحدها تُزار (لا استبدالَ نصٍّ أعمى)، كلٌّ بحقله. */
function rsBCMgrOf(v) {
  var m = typeof v === 'string' && /^mgr:([^:]+)/.exec(v);
  return m ? m[1] : '';
}
/* مواضعُ الأنظمة: كلُّ نظامٍ يعلن موردَه ومواضعَه في فتحته bc.deptRefs — { المورد: function (وثيقة, fn(وسمُ المورد بالعربية, 0, القيمة, set)) } */
var RS_DEPT_REFS = {
@@SYS:bc.deptRefs@@};
function rsBCDeptWalk(docs, perms, fn) {
  var nf = docs.bassam_notif_v1;
  if (isObj(nf)) {
    (Array.isArray(nf.items) ? nf.items : []).forEach(function (x) {
      if (!isObj(x)) return;
      if (typeof x.dept === 'string') fn('التنبيهات', 1, x.dept, function (v) { x.dept = v; });
      fn('التنبيهات', 0, x.by, function (v) { x.by = v; });
      if (isObj(x.to) && Array.isArray(x.to.e)) x.to.e.forEach(function (e, i) { fn('التنبيهات', 0, e, function (v) { x.to.e[i] = v; }); });
    });
    ['read', 'ack', 'del'].forEach(function (f) {
      var m = nf[f];
      if (isObj(m)) Object.keys(m).forEach(function (a) { fn('التنبيهات', 0, a, function (v) { var o = m[a]; delete m[a]; m[v] = isObj(m[v]) && isObj(o) ? Object.assign({}, o, m[v]) : o; }); });
    });
  }
  Object.keys(RS_DEPT_REFS).forEach(function (n) { if (rsBCOwn(docs, n)) RS_DEPT_REFS[n](docs[n], fn); });
  var pe = isObj(perms) && perms.emps;
  if (isObj(pe)) Object.keys(pe).forEach(function (ek) { fn('الصلاحيات', 0, ek, function (v) { var o = pe[ek]; delete pe[ek]; if (!rsBCOwn(pe, v)) pe[v] = o; }); });
}
/* إدارةُ النسخة نفسها: معرّفُ تنبيهات مخزنها (الأكثر ورداً) — فمعرّفُ مفاتيح المدير إن لم تكن تنبيهات؛ '' = لا إشارة */
function rsBCDeptFind(docs, perms) {
  var ids = [{}, {}];
  rsBCDeptWalk(docs, perms, function (res, bare, v) { var d = bare ? v : rsBCMgrOf(v); if (d) ids[bare][d] = (ids[bare][d] || 0) + 1; });
  return [1, 0].map(function (b) { var o = ids[b]; return Object.keys(o).sort(function (x, y) { return o[y] - o[x] || (x < y ? -1 : 1); })[0] || ''; }).filter(Boolean)[0] || '';
}
/* from ← to في المواضع وحدها · معرّفٌ آخر يُعدّ في foreign ولا يُمسّ · rec يجمع (n · by[مورد] · foreign[معرّف]) */
function rsBCDeptRemap(docs, perms, from, to, rec) {
  rsBCDeptWalk(docs, perms, function (res, bare, v, set) {
    var d = bare ? v : rsBCMgrOf(v);
    if (!d || d === to) return;
    if (d !== from) { rec.foreign[d] = (rec.foreign[d] || 0) + 1; return; }
    set(bare ? to : 'mgr:' + to + v.slice(4 + from.length));
    rec.n++;
    rec.by[res] = (rec.by[res] || 0) + 1;
  });
  return rec;
}
/* V7 · د6 (QA ٦ — قرارُ المالك ب1): صحيفةُ صلاحيات مدير المصدر (perms.emps['mgr:*']) لا تنتقل ولا يُعاد ربطُها — مديرُ الإدارة لا تحكمه صحيفةٌ ولا دور،
   ويبقى مديرُ الهدف كاملَ الصلاحية داخل سقف وحدته كما كان قبل الاستيراد (019d rsDeptPermsKeep). تُذكر في «ما لن يُنقل» بعددها */
function rsBCMgrSheetDrop(perms, summary) {
  var pe = isObj(perms) && perms.emps, n = 0;
  if (isObj(pe)) Object.keys(pe).forEach(function (ek) { if (isMgrKey(ek)) { delete pe[ek]; n++; } });
  if (n) (summary.notTransferred = summary.notTransferred || []).push({ k: 'perms · mgr', why: 'mgr-sheet', n: n });
}
function rsBCRemapRec(from, to) {
  return { from: from, to: to, n: 0, by: {}, foreign: {}, left: {} };
}
@@SYS:bc.remapCustody@@@@SYS:bc.remapIrshad@@function rsBCForbiddenKey(key) {
  var n = resName(key);
  return isDeviceKey(key) || isDeviceKey(n) || /(?:^|_)(?:sessions?|recovery|recover|cookies?|tokens?|credentials?)(?:_|$)/i.test(n);
}
/* V7 · د7: القوالب ← أدوار الهدف (063 enfRolesFromTpls) · tplOf بالموظف أو بالإدارة · mgr:* لا يُسند (ب1) */
function rsBCTplsRoles(keys, perms, d, src, summary) {
  var T0 = isObj(perms) && isObj(perms.tplOf) ? perms.tplOf : null, of = null, tk = 'bsdept:' + d + ':bassam_perm_tpls_v1', rk = perm44Key(d);
  if (T0) {
    of = Object.keys(T0).every(function (k) { return typeof T0[k] === 'string'; }) ? T0 : (isObj(T0[src]) ? T0[src] : isObj(T0[d]) ? T0[d] : null);
    delete perms.tplOf;
  }
  var tpls = rsBCOwn(keys, tk) ? parseJson(keys[tk], null) : null;
  if (!Array.isArray(tpls) || !tpls.length) return;
  var assign = {};
  Object.keys(of || {}).forEach(function (ek) { if (!isMgrKey(ek)) assign[ek] = of[ek]; });
  var X = enfRolesFromTpls(tpls, assign, rsBCOwn(keys, rk) ? parseJson(keys[rk], null) : null);
  if (X.rep.roles || X.rep.people) keys[rk] = JSON.stringify(X.rec);
  var S = summary.tplRoles || (summary.tplRoles = { roles: 0, people: 0, unknownTpl: 0, lensDropped: 0 }); for (var q in S) S[q] += X.rep[q];   /* V7 · 53: يُجمع لكل إدارةٍ في النسخة الشاملة */
}
function rsBCManifest(manifest, scope, keys, domains, departments) {
  rsShape(manifest, ['version', 'scope', 'domains', 'departments', 'keys']);
  var required = scope.kind === 'full' @@SYS:bc.required.dstats|pre="? ['kv', "|empty="? ['kv', "@@'notifications'@@SYS:bc.required.custody@@] : ['kv', 'notifications'@@SYS:bc.required.custody@@];
@@SYS:bc.required.irshad@@  if (manifest.version >= 3) @@SYS:bc.required.business|sep=","|pre="required.push("|post=");"|empty="required.push();"@@
  if (manifest.version >= 4) required.push('operations');
  rsShape(manifest.domains, required);
  if (
    ![1, 2, 3, 4].includes(manifest.version) ||
    manifest.scope !== scope.kind ||
    required.some(function (k) {
      return manifest.domains[k] !== 1;
    }) ||
    !Array.isArray(manifest.departments) ||
    new Set(manifest.departments).size !== manifest.departments.length ||
    !deq(manifest.departments.slice().sort(), departments.slice().sort()) ||
    !Array.isArray(manifest.keys) ||
    new Set(manifest.keys).size !== manifest.keys.length
  )
    rsBCFail('incomplete-manifest');
  var declared = Object.keys(keys).map(function (k) {
    return scope.kind === 'dept' ? resName(k) : k;
  });
  if (
    !deq(manifest.keys.slice().sort(), declared.slice().sort()) ||
    !domains.notifications@@SYS:bc.manifest.custody@@@@SYS:bc.manifest.dstats@@
  )
    rsBCFail('incomplete-manifest');
@@SYS:bc.manifest.custodyScopes@@@@SYS:bc.manifest.irshad@@  for(var def of bdDefinitions()) {
    if(manifest.version>=3) {
      var expected=departments.concat(@@SYS:bc.awardGlobal.1|empty="[]"@@).sort();
      if(!Array.isArray(domains[def.name])||!deq(domains[def.name].map(bdScope).sort(),expected))rsBCFail('incomplete-'+def.name);
    } else if(domains[def.name]!==undefined)rsBCFail(def.name+'-manifest-version');
  }
  if(manifest.version>=4)opValidateBackupDomains(domains.operations,departments);
  else if(domains.operations!==undefined)rsBCFail('operations-manifest-version');
}
async function rsConvertBackup(env, A, file, opt) {
  opt = opt || {};
  rsShape(opt, ['scope', 'mode', 'legacyConsent', 'reference']);
  rsShape(opt.scope, ['kind', 'departmentId']);
  if (
    !A ||
    !A.u ||
    !['full', 'dept'].includes(opt.scope.kind) ||
    !['replace', 'merge'].includes(opt.mode) ||
    (opt.scope.kind === 'dept' && (typeof opt.scope.departmentId !== 'string' || !opt.scope.departmentId))
  )
    rsBCFail('scope');
  if (!isObj(file) || !isObj(file.data)) rsBCFail('file-shape');
  if (privRedacted(file)) throw rsError('restore-redacted', 409);   // PRIVACY batch (019u): a copy exported without personal data restores nothing
  rsShape(file, ['app', 'version', 'kind', 'data', 'domains', 'manifest', 'perms', 'idbImages', 'imagesMissing', 'dept', 'exportedAt', 'preImport']);
  var modern = rsBCOwn(file, 'manifest'),
    legacy = !modern,
    target = opt.scope.departmentId || '',
    scope = opt.scope,
    kind = file.kind || scope.kind,
    summary = { legacy: legacy, emptyDomains: [], preservedGlobals: [], ignoredDevicePreferences: [], remapped: false },
    readGuards = [];
  if (modern && (file.app !== 'bassam-crowd' || ![1, 2, 3, 4].includes(file.version) || file.kind !== scope.kind)) rsBCFail('identity');
  if (
    legacy &&
    (opt.legacyConsent !== true ||
      (file.app !== undefined && file.app !== 'bassam-crowd') ||
      (file.version !== undefined && ![1, 2, 3].includes(file.version)) ||
      !['full', 'dept'].includes(kind))
  )
    rsBCFail(opt.legacyConsent !== true ? 'legacy-consent-required' : 'identity');
  if (scope.kind === 'full' && (A.u.role !== 'super' || kind !== 'full')) throw rsError('restore-policy', 403);
  if (scope.kind === 'dept' && kind === 'full' && (!legacy || A.u.role !== 'super')) throw rsError('restore-policy', 403);
  if (file.idbImages !== undefined) rsImageArchiveShape(file.idbImages);
  /* V7-F (owner blocker): a backup made while a record pointed at an image whose bytes were already gone carries the list — id and where it was
     mentioned — so the restore can say «already missing when this copy was made». It is a note only: it restores nothing and proves nothing. */
  if (file.imagesMissing !== undefined) {
    if (!Array.isArray(file.imagesMissing) || file.imagesMissing.length > IMG_CAP || file.imagesMissing.some(function (m) {
      return !isObj(m) || Object.keys(m).some(function (k) { return k !== 'id' && k !== 'at'; }) || typeof m.id !== 'string' || !/^(?:img|szp)_[a-z0-9]+_[a-z0-9]+$/.test(m.id) ||
        !Array.isArray(m.at) || m.at.length > 50 || m.at.some(function (x) { return typeof x !== 'string' || x.length > 300; });
    })) rsBCFail('file-shape');
    if (file.imagesMissing.length) summary.imagesMissingAtBackup = file.imagesMissing.map(function (m) { return m.id; }).sort().slice(0, 50);
  }
  if (file.perms !== undefined && scope.kind !== 'dept') rsBCFail('permissions-scope');
  var reference = opt.reference && opt.reference.inputKeys;
  if (!isObj(reference)) rsBCFail('reference-required');
  var input = Object.create(null),
    keys = Object.create(null),
    domains = file.domains === undefined ? {} : rsBCClone(file.domains);
  @@SYS:bc.domains.dstats|pre="rsShape(domains, ["|empty="rsShape(domains, ["@@'notifications', @@SYS:bc.domains.systems|post="'operations']);"|empty="'operations']);"@@
  Object.keys(file.data).forEach(function (k) {
    if (k === 'bassam_active_dept_v1') {
      summary.ignoredDevicePreferences.push(k);
      return;
    }
    if (['__proto__', 'constructor', 'prototype'].indexOf(k) >= 0 || typeof file.data[k] !== 'string') rsBCFail('data-shape');
    if (rsBCForbiddenKey(k)) rsBCFail('sensitive-device-key');
@@SYS:bc.keys.irshadNamespace@@    rsBCParse(file.data[k]);
    input[k] = file.data[k];
  });
  var prefixes = Array.from(
      new Set(
        Object.keys(input)
          .filter(function (k) {
            return /^bsdept:/.test(k);
          })
          .map(function (k) {
            var p = parseKey(k);
            if (!p.dept) rsBCFail('scope');
            return p.dept;
          }),
      ),
    ),
    source = target,
    deptIds = [];
  if (scope.kind === 'full') {
    if (!rsBCOwn(input, K_DEPTS)) rsBCFail('flat-requires-explicit-department');
    deptIds = rsBCDeptIds(input[K_DEPTS]);
    prefixes.forEach(function (d) {
      if (deptIds.indexOf(d) < 0) rsBCFail('unknown-department');
    });
    Object.keys(input).forEach(function (k) {
      if (!parseKey(k).dept && resOf(k) && resOf(k).scope === 'dept'@@SYS:bc.keys.awardGlobal@@) rsBCFail('unscoped-department-key');
      keys[k] = input[k];
    });
  } else {
    if (prefixes.length > 1) rsBCFail('ambiguous-department');
    var declared = modern ? file.manifest && file.manifest.departments : undefined;
    if (declared !== undefined && (!Array.isArray(declared) || declared.length !== 1)) rsBCFail('manifest-scope');
    var typed =@@SYS:bc.typed.custody|empty=" null"@@;
    var irTyped = @@SYS:bc.irTyped|empty="null"@@;
    var hints = [prefixes[0], declared && declared[0], typed, irTyped].filter(Boolean);
    if (new Set(hints).size > 1) rsBCFail('ambiguous-department');
    source = hints[0] || target;
    deptIds = [target];
    summary.remapped = source !== target;
    Object.keys(input).forEach(function (k) {
      var p = parseKey(k),
        name = p.name;
      if (p.dept && p.dept !== source) rsBCFail('scope');
      if (
        (!p.dept && [K_DEPTS, K_GDEPTS, K_USERS, K_PERM, K_PLAT].indexOf(k) >= 0) ||
        ['bassam_notif_sys_v1', 'bassam_notif_cfg_v1', 'bassam_bc_v1'].indexOf(name) >= 0
      )
        rsBCFail('global-in-department');
      var dest = 'bsdept:' + target + ':' + name;
      if (rsBCOwn(keys, dest)) rsBCFail('duplicate-key');
      keys[dest] = input[k];
    });
  }
  /* V7 · د6 (remap): نسخةُ إدارةٍ قديمة تُستورد إلى وحدةٍ بمعرّفٍ آخر — الحالةُ الطبيعية على منصة الشركة. إدارةُ النسخة: من بادئة مفاتيحها إن كانت،
     وإلا ممّا تحمله بياناتُها (rsBCDeptFind). إشاراتُها تصير الوحدةَ الهدف في المواضع المعدودة قبل أي تحويل؛ ومعرّفٌ غيرُها يُذكر ولا يُربط.
     وما بقي يحمل المعرّفَ المصدر نصّاً في موضعٍ لم يُعدّ يُذكر بموارده (left) — لا يُعاد ربطه ولا يُرفض به الملف. */
  /* إدارةُ المصدر إن كانت إدارةً على هذه المنصة: تنبيهاتُها تُحوَّل بهوياتها هي (حساباتُ علاماتِ القراءة حساباتُها — لا يُعاد ربطُ معرّف حساب) ثم يُنقل نطاقُها
     ومفتاحُ مديرها (rsBCRemapNF) كما كان؛ وإلا (نسخةُ Production: معرّفٌ لا يوجد هنا) فوثيقةُ التنبيهات تُربط قبل التحويل وتُحوَّل بهويات الوحدة الهدف. */
  var perms = file.perms === undefined ? undefined : rsBCClone(file.perms), nfSrc = target;
  if (legacy && scope.kind === 'dept') {
    var rdocs = {}, nk = 'bsdept:' + target + ':bassam_notif_v1';
    ['bassam_notif_v1'].concat(Object.keys(RS_DEPT_REFS)).forEach(function (n) { var k = 'bsdept:' + target + ':' + n; if (rsBCOwn(keys, k)) rdocs[n] = parseJson(keys[k], null); });
    var from = source !== target ? source : rsBCDeptFind(rdocs, perms);
    rsBCMgrSheetDrop(perms, summary);   /* V7 · د6 (QA ٦ — قرارُ المالك ب1): بعد معرفة المصدر وقبل إعادة الربط */
    if (from && from !== target && (parseJson(reference[K_DEPTS] || '[]', []) || []).some(function (d) { return d && d.id === from; })) { nfSrc = from; delete rdocs.bassam_notif_v1; }
    if (from) {
      var rec = (summary.remap = rsBCDeptRemap(rdocs, perms, from, target, rsBCRemapRec(from, target)));
      Object.keys(rdocs).forEach(function (n) { if (isObj(rdocs[n])) keys['bsdept:' + target + ':' + n] = JSON.stringify(rdocs[n]); });
      if (from !== target) Object.keys(keys).forEach(function (k) { var c = k === nk && nfSrc !== target ? 0 : keys[k].split(from).length - 1; if (c) rec.left[resName(k)] = c; });
    }
  }
  Object.keys(keys).filter(bdLegacyKey).forEach(function(k){
    var def=bdDefinitions().find(function(def){return def.resources.includes(resName(k));}),part=parseKey(k),index=def.resources.indexOf(resName(k));
    if(k!==(part.dept?def.key(part.dept,index):def.resources[index]))rsBCFail('business-namespace');
    if(!part.dept&&!(@@SYS:bc.awardGlobalPart|empty="false"@@))rsBCFail('business-global-scope');
    if(part.dept&&!deptIds.includes(part.dept))rsBCFail('business-department');
  });
  var @@SYS:bc.keys.custody@@irKeys = @@SYS:bc.irKeys|empty="[]"@@,
    businessKeys = Object.keys(keys).filter(bdLegacyKey),
    nfKeys = Object.keys(keys).filter(nfLegacyKey),
    dsKeys = @@SYS:bc.dsKeys|empty="[]"@@;
  if (
@@SYS:bc.dup.custody@@    (nfKeys.length && rsBCOwn(domains, 'notifications')) ||
    (dsKeys.length && rsBCOwn(domains, 'dailyStats')) ||
    @@SYS:bc.dup.irshad|empty="false"@@
  )
    rsBCFail('duplicate-domain-source');
  for(var def of bdDefinitions()) if(businessKeys.some(function(k){return def.resources.includes(resName(k));})&&rsBCOwn(domains,def.name))rsBCFail('duplicate-domain-source');
  if (modern && (@@SYS:bc.retiredModern.custody@@nfKeys.length || dsKeys.length || (file.manifest && file.manifest.version >= 2 && irKeys.length))) rsBCFail('retired-key-in-modern-file');
  if(modern&&file.manifest.version>=3&&businessKeys.length)rsBCFail('retired-key-in-modern-file');
  if(modern&&file.manifest.version>=4&&Object.keys(keys).some(opIsResource))rsBCFail('retired-key-in-modern-file');
  if (scope.kind === 'dept' && (dsKeys.length || domains.dailyStats !== undefined)) rsBCFail('global-domain-in-department');
  if (modern) {
    // Validate the source declaration before an explicit scoped remap. Missing
    // modern domains cannot obtain legacy empty/preservation fallbacks.
    var sourceScope = scope.kind === 'dept' ? { kind: 'dept', departmentId: source } : scope,
      sourceKeys = Object.create(null);
    Object.keys(keys).forEach(function (k) {
      sourceKeys[scope.kind === 'dept' ? 'bsdept:' + source + ':' + resName(k) : k] = keys[k];
    });
    rsBCManifest(file.manifest, sourceScope, sourceKeys, domains, scope.kind === 'dept' ? [source] : deptIds);
  }
@@SYS:bc.convert.irshad@@  for(var def of bdDefinitions()) {
    if(domains[def.name]!==undefined) {
      if(!Array.isArray(domains[def.name]))rsBCFail(def.name+'-shape');
      domains[def.name]=domains[def.name].map(function(domain){
        var d=bdScope(domain),global=@@SYS:bc.awardGlobalScope|empty="false"@@;
        if(typeof d!=='string'||(global&&scope.kind!=='full')||(!global&&(scope.kind==='full'?!deptIds.includes(d):d!==source)))rsBCFail(def.name+'-scope');
        var next=rsBCClone(def.validate(domain,d)),targetDept=scope.kind==='dept'?target:d;
        if(targetDept!==d){next.scope={departmentId:targetDept};Object.keys(def.tables).forEach(function(kind){next.rows[kind].forEach(function(row){row.department_id=targetDept;});});}
        return def.validate(next,targetDept);
      });
      if(new Set(domains[def.name].map(bdScope)).size!==domains[def.name].length)rsBCFail(def.name+'-duplicate');
    } else if(legacy||file.manifest.version<3) {
      domains[def.name]=deptIds.concat(@@SYS:bc.awardGlobal.2|empty="[]"@@).map(function(d){
        var docs={};def.names.forEach(function(name,i){var k=d?def.key(d,i):def.resources[i];if(rsBCOwn(keys,k))docs[name]=rsBCParse(keys[k]);});
        if(!Object.keys(docs).length)summary.emptyDomains.push(def.name+':'+d);
        return def.validate(def.convert(d,docs),d);
      });
    }
  }
@@SYS:bc.convert.custody@@@@SYS:bc.convert.dstats@@  if (domains.notifications !== undefined) {
    if (scope.kind === 'dept') {
      var normalized = rsBCNF(domains.notifications, { kind: 'dept', departmentId: source });
      if (source !== target) summary.remap = rsBCRemapRec(source, target);
      domains.notifications = rsBCNF(rsBCRemapNF(normalized, source, target, summary.remap), scope);
    } else domains.notifications = rsBCNF(domains.notifications, scope);
  } else if (legacy) {
    var identity = Object.create(null),
      legacyNF = Object.create(null),
      nativeUsers = rsBCOwn(input, K_USERS) ? input[K_USERS] : reference[K_USERS],
      nativeDepts = rsBCOwn(input, K_DEPTS) ? input[K_DEPTS] : reference[K_DEPTS];
    if (nfKeys.length && (typeof nativeUsers !== 'string' || typeof nativeDepts !== 'string')) rsBCFail('notifications-identity-required');
    identity[K_USERS] = nativeUsers;
    identity[K_DEPTS] = nativeDepts;
    /* V7 · د6 (remap): تنبيهاتُ نسخة الإدارة القديمة تُحوَّل باسم nfSrc (أعلاه): الوحدةُ الهدف بعد إعادة ربطها، أو إدارةُ المصدر القائمة هنا */
    nfKeys.forEach(function (k) {
      var old = scope.kind === 'dept' ? 'bsdept:' + nfSrc + ':' + resName(k) : k;
      legacyNF[old] = keys[k];
    });
    Object.keys(identity).forEach(function (k) {
      legacyNF[k] = identity[k];
    });
    // Only explicit department references may be remapped. Plain local payload
    // fields never invent a source department or an account identity.
    if (scope.kind === 'dept' && nfKeys.length) {
      var ds = rsBCParse(identity[K_DEPTS]);
      if (
        !ds.some(function (d) {
          return d && d.id === nfSrc;
        })
      )
        rsBCFail('notifications-unknown-source-department');
    }
    var nfDrop = {},
      converted = nfKeys.length ? nfLegacyConvert(legacyNF, nfDrop) : rsBCEmptyNF();
    /* V7 · د6 (remap): ما أُسقط بنداً بنداً يُذكر قبل التأكيد بعدده ونوعه (019g RSI_FIELD_WHY · 548) */
    Object.keys(nfDrop).forEach(function (id) {
      var p = id.split('|');
      (summary.notTransferred = summary.notTransferred || []).push({ k: 'bassam_notif_v1 · ' + (p[1] || '—'), why: 'nf-' + p[0], n: nfDrop[id] });
    });
    if (scope.kind === 'dept') {
      converted = rsBCRemapNF(converted, nfSrc, target, summary.remap);
      domains.notifications = rsBCNF(converted, scope);
      if (!nfKeys.length) summary.emptyDomains.push('notifications:' + target);
    } else {
      var saved = await nfRead(env),
        hasSys = rsBCOwn(input, 'bassam_notif_sys_v1'),
        hasBC = rsBCOwn(input, 'bassam_bc_v1'),
        hasConfig = rsBCOwn(input, 'bassam_notif_cfg_v1');
      Object.keys(NF_TABLES).forEach(function (n) {
        if (n === 'overrides') {
          if (!hasConfig) converted[n] = rsBCClone(saved[n]);
          return;
        }
        var preserved = saved[n].filter(function (r) {
          var s = n === 'states' ? r.message_scope : r.scope;
          return (s === 'sys' && !hasSys) || (s === 'bc' && !hasBC);
        });
        converted[n] = converted[n].concat(rsBCClone(preserved));
      });
      var preservedScopes = [];
      if (!hasSys) preservedScopes.push('sys');
      if (!hasBC) preservedScopes.push('bc');
      Object.keys(NF_TABLES).forEach(function (n) {
        var spec = NF_TABLES[n];
        if (n === 'overrides') {
          if (!hasConfig) readGuards.push.apply(readGuards, rsWitness(env, spec[0], spec[1], saved[n]));
          return;
        }
        if (!preservedScopes.length) return;
        var col = n === 'states' ? 'message_scope' : 'scope',
          rows = saved[n].filter(function (r) {
            return preservedScopes.indexOf(r[col]) >= 0;
          }),
          where =
            col +
            ' IN (' +
            preservedScopes
              .map(function (_, i) {
                return '?' + (i + 1);
              })
              .join(',') +
            ')';
        readGuards.push.apply(readGuards, rsWitness(env, spec[0], spec[1], rows, where, preservedScopes));
      });
      if (!hasSys) summary.preservedGlobals.push('notifications:sys');
      if (!hasBC) summary.preservedGlobals.push('notifications:bc');
      if (!hasConfig) summary.preservedGlobals.push('notifications:config');
      domains.notifications = rsBCNF(converted, scope);
      deptIds.forEach(function (d) {
        if (
          !nfKeys.some(function (k) {
            return parseKey(k).dept === d;
          })
        )
          summary.emptyDomains.push('notifications:' + d);
      });
    }
  }
  @@SYS:bc.retired.custody|empty="[]"@@.concat(nfKeys, dsKeys, irKeys, businessKeys).forEach(function (k) {
    delete keys[k];
  });
  /* V7 · د5-ح: قوالبُ الصلاحيات موردٌ حُذف (063 «tpls-retire») — نسخةٌ أُخذت قبل القفل تحملها فتُسقط هنا ولا تُستعاد (الأدوارُ بديلُها)

     V7 · د7 (51ب): في نسخة الإدارة تصير أدواراً قبل الإسقاط (rsBCTplsRoles) */
  if (scope.kind === 'dept') rsBCTplsRoles(keys, perms, target, source, summary);
  /* V7 · 53 (رد المالك د7_1): النسخةُ الشاملة كذلك، إدارةً إدارة — إسناداتُ كلٍّ من tplOf[<الإدارة>] في سجلّ صلاحياتها (019d rsRoleGrants يبني المنح) */
  else if (scope.kind === 'full') { var fp9 = parseJson(keys[K_PERM], null), of9 = isObj(fp9) && isObj(fp9.tplOf) ? fp9.tplOf : {}; deptIds.forEach(function (d) { rsBCTplsRoles(keys, { tplOf: isObj(of9[d]) ? of9[d] : {} }, d, d, summary); }); }
  Object.keys(keys).forEach(function (k) {
    if (enfTplsKey(k)) delete keys[k];
  });
  opConvertBackupBoundary(keys,domains,deptIds,scope,source,modern?file.manifest.version:0,summary);
  // Conversion preserves credentials byte-for-byte; applySave/restore retains
  // its existing hash, final-owner and session policy for the eventual commit.
  Object.keys(keys).forEach(function (k) {
    if (!resOf(k)) rsBCFail('unknown-resource');
    if (scope.kind === 'dept' && parseKey(k).dept !== target) rsBCFail('scope');
  });
  var manifest = modern
    ? rsBCClone(file.manifest)
    : {
        version: 1,
        scope: scope.kind,
        domains: scope.kind === 'full' @@SYS:bc.out.dstats|pre="? { kv: 1, "|empty="? { kv: 1, "@@notifications: 1@@SYS:bc.out.custody@@ } : { kv: 1, notifications: 1@@SYS:bc.out.custody@@ },
        departments: deptIds.slice(),
        keys: Object.keys(keys).map(function (k) {
          return scope.kind === 'dept' ? resName(k) : k;
        }),
      };
  if (modern && scope.kind === 'dept') {
    manifest.departments = [target];
    manifest.keys = Object.keys(keys).map(resName);
  }
  // A v1 source is validated before conversion. The compiled destination always
  // declares the complete typed Irshad domain; v2 never receives empty fallbacks.
  manifest.version = 4;
@@SYS:bc.out.systems@@  manifest.domains.operations = 1;
  manifest.keys = Object.keys(keys).map(function (k) { return scope.kind === 'dept' ? resName(k) : k; });
  rsBCManifest(manifest, scope, keys, domains, deptIds);
  var result = { keys: keys, domains: domains, manifest: manifest, summary: summary, readGuards: readGuards, images: file.idbImages || {} };
  if (scope.kind === 'dept') rsBCMgrSheetDrop(perms, summary);
  if (perms !== undefined) result.permissionSlice = perms;
  return result;
}
