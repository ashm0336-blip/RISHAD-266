/* V7 · د5-ح (القفل) — ما حُذف لا يبقى له أثر (تتمّةُ v7_d5e44_deleted_residue — وهذه تشمل الخادمَ والسجلَّ والشجرةَ والأنواع):
   ① ورقةُ «قوالب الصلاحيات» admin/ptpls ومفاتيحُ tpl.* ومالكُها — لا في الواجهة ولا في السجلّ (القاعدة · المجموع · 340 · 004) ولا الروابط (006 · 008 · 010)
      ولا perm-tree24 ولا pages.json ولا meta.json ولا الأنواع ولا بذر السقف (SEED_BASIC)
   ② موردُ bassam_perm_tpls_v1 (و_named_v1) غيرُ مسجَّل في الخادم (RES_REG · ENTITIES · FIELDS · RD_REG · المصنِّف · الإسقاط) — يذكره وحدهما:
      الترحيلُ (063: perm44-roles يقرؤه خاماً · tpls-retire يحذفه) ومحوّلُ النسخ (019f يُسقطه من نسخةٍ قديمة) عبر enfTplsKey
   ③ مسارُ القرار الحيّ في الوضع القديم: لا فرعَ «A.enf ؟ … : قديم» في الخادم ولا دوالُّه (canRead0 · authorize0 · authorizeActs · usersRule …) ولا 'legacy'
      وضعاً يُعاد من enfModeOf؛ والواجهةُ لا تعود إلى الورقة وحدها بلا وصف الخادم
   ④ تقريرُ السجلّ القديم لمدير النظام (permv2) — لا مسارَ ولا عقدَ ولا متغيّر */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SRC, ROOT } from './harness.mjs';

const rd = (p) => fs.readFileSync(p, 'utf8');
function walk(dir, ok, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!/^(tests|assets|node_modules)$/.test(e.name)) walk(p, ok, out); continue; }
    if (ok(p)) out.push(p);
  }
  return out;
}
/* تعليقاتُ JS تُنزع قبل البحث عن الرموز (نصُّ التاريخ في التعليق ليس أثراً حيّاً) — والنصوصُ تبقى */
function code(s) {
  let o = '', i = 0, q = null;
  while (i < s.length) {
    const c = s[i];
    if (q) { if (c === '\\') { o += s.slice(i, i + 2); i += 2; continue; } if (c === q) q = null; o += c; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; o += c; i++; continue; }
    if (s.startsWith('/*', i)) { const j = s.indexOf('*/', i + 2); i = j < 0 ? s.length : j + 2; o += ' '; continue; }
    if (s.startsWith('//', i) && s[i - 1] !== ':' && s[i - 1] !== '\\') { const j = s.indexOf('\n', i); i = j < 0 ? s.length : j; continue; }
    o += c; i++;
  }
  return o;
}
/* والنصوصُ كذلك (للرموز وحدها: وصفُ السجلّ المرجعي في بيانات 004 · 006 · 010 · 014 يذكر أسماءَ قديمة نصاً — وثيقةٌ مثبَّتةٌ ببصمتها) */
const bare = (s) => code(s).replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, '""');
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const word = (n) => new RegExp('(?<![\\w$])' + n.replace(/[$.]/g, '\\$&') + '(?![\\w$])');
const SERVER = [].concat(
  walk(path.join(ROOT, 'workers', 'parts'), (p) => p.endsWith('.js')),
  walk(path.join(SRC, 'slots', 'workers'), (p) => /\.(tpl|js)$/.test(p)),
  walk(path.join(SRC, 'systems'), (p) => /[/\\]systems[/\\][^/\\]+[/\\](server[/\\].+\.js|slots[/\\].+\.(frag|json)|system\.json)$/.test(p)),
  [path.join(ROOT, 'workers', '_worker.js')]);
const CLIENT = walk(SRC, (p) => /\.(js|tpl|html|css|json|frag|mjs|ts)$/.test(p) && !/[/\\](slots[/\\]workers|systems[/\\][^/\\]+[/\\](server|slots))[/\\]/.test(p));

test('① ورقةُ «قوالب الصلاحيات» ومفاتيحُ tpl.* لا أثرَ لها في الواجهة والسجلّ والروابط والشجرة والأنواع', () => {
  assert.ok(CLIENT.length > 200 && SERVER.length > 60, 'الشجرةُ تُقرأ');
  const NAMES = ['ptpls', 'admin/ptpls', 'tpl.view', 'tpl.create', 'tpl.edit', 'tpl.delete', 'tpl.supervisory', 'PermTpl', 'pm_tpl', 'acct_tpl'];   /* V7 · د5-ح (الدمج): ونوعا تنبيه القوالب كلاهما (pm_tpl · acct_tpl — 019 + 441) */
  const files = CLIENT.concat(SERVER, [path.join(ROOT, 'workers', 'bindings', 'scope-bindings', 'data.json'), path.join(ROOT, 'workers', 'bindings', 'guard-bindings', 'data.json'),
    path.join(ROOT, 'workers', 'bindings', 'build-bindings', 'data.json'), path.join(ROOT, 'workers', 'bindings', 'scope-bindings', 'data.base.json'),
    path.join(ROOT, 'workers', 'bindings', 'guard-bindings', 'data.base.json'), path.join(ROOT, 'workers', 'bindings', 'build-bindings', 'data.base.json')]);
  const hits = [];
  for (const p of files) { const s = /\.json$/.test(p) ? rd(p) : code(rd(p)); for (const n of NAMES) if (s.includes(n)) hits.push(rel(p) + ': ' + n); }
  /* نصُّ الواجهة «قوالب الصلاحيات» — في ملفات الواجهة وحدها (عدا ملاحظاتِ خطوط الأساس في slots/tools: سجلٌّ تاريخيّ) */
  for (const p of CLIENT) { if (/[/\\]slots[/\\]tools[/\\]/.test(p)) continue; const s = /\.(js|mjs|tpl)$/.test(p) ? code(rd(p)) : rd(p); if (s.includes('قوالب الصلاحيات')) hits.push(rel(p) + ': قوالب الصلاحيات'); }
  assert.deepEqual(hits, [], 'باقٍ:\n' + hits.join('\n'));
  const REG = JSON.parse(rd(path.join(SRC, 'permissions', 'registry', 'registry-v24.9.json')));
  assert.ok(!REG.registry.some((e) => /^tpl\./.test(e.key) || e.owner === 'admin/ptpls'), 'لا مفتاحَ tpl.* في السجلّ');
  assert.ok(!REG.owners.some((o) => o.id === 'admin/ptpls') && !REG.atoms.some((a) => a.leaf === 'admin/ptpls'));
  const PAGES = JSON.parse(rd(path.join(SRC, 'manifests', 'pages.json')));
  assert.ok(!JSON.stringify(PAGES).includes('"ptpls"'), 'pages.json بلا الورقة');
  assert.match(rd(path.join(SRC, 'permissions', '331-perm-model.js')), /admin:\['shifts','backup','import'\]/, 'بذرُ السقف «أساسي» بلا الورقة');
});

test('② موردُ القوالب غيرُ مسجَّل في الخادم — يذكره الترحيلُ (063) ومحوّلُ النسخ (019f · بـenfTplsKey) وحدهما', () => {
  const hits = [];
  for (const p of SERVER) {
    const r = rel(p), s = code(rd(p));
    if (/063-enf-api-and-handler|_worker\.js$/.test(r)) continue;
    if (/bassam_perm_tpls/.test(s)) hits.push(r);
  }
  assert.deepEqual(hits, [], 'يذكر المورد خارج الترحيل:\n' + hits.join('\n'));
  const W = rd(path.join(ROOT, 'workers', '_worker.js')), M = code(rd(path.join(ROOT, 'workers', 'parts', '063-enf-api-and-handler.js')));
  for (const reg of ['RES_REG', 'ENT', 'FIELDS', 'RD_REG']) {
    const m = new RegExp('var ' + reg + ' = \\{([\\s\\S]*?)\\n\\};').exec(W); assert.ok(m, reg);
    assert.ok(!/perm_tpls/.test(m[1]), reg + ' بلا القوالب');
  }
  assert.match(M, /function enfTplsKey\(k\)/); assert.match(code(rd(path.join(ROOT, 'workers', 'parts', '019f-backup-converter.js'))), /if \(enfTplsKey\(k\)\) delete keys\[k\];/);
  assert.match(M, /var ENF_TPLS_PART = 'tpls-retire'/); assert.match(M, /function enfRolesPlan\(/, 'perm44-roles يقرأ القوالبَ خاماً');
});

test('③ مسارُ القرار الحيّ في الوضع القديم محذوف: لا فرعَ قديم ولا دوالُّه ولا وضعَ legacy — والواجهةُ لا تعود إلى الورقة وحدها', () => {
  const GONE = ['canRead0', 'authorize0', 'authorize', 'authorizeActs', 'holdsAllWrites', 'allowKeyDelete', 'perm44LegacyGrantsWhy', 'superSelfWhy', 'usersRule', 'usersA1Of',
    'writePages', 'selfEmailOnly', 'selfTaskOnly', 'dstatsRule', 'empGoneCleanup', 'GONE_FN', 'refsGoneOk', 'custodyMoveOp', 'custodyCleanup', 'awardCleanup', 'dreportCleanup',
    'staffGoneOk', 'tasksGoneOk', 'awardGoneOk', 'fieldObsOnly', 'VIA_FN', 'SEED_ONLY', 'prot9', 'imgDeptWriter', 'WR_ACTS', 'REG_VALIDATION', 'empApplyTemplates', 'empCleanTemplate'];
  const hits = [];
  for (const p of SERVER) {
    if (/_worker\.js$/.test(p)) continue;   /* العاملُ مجموعُ الأجزاء نفسِها (تُفحص هي) */
    const s = /\.json$/.test(p) ? rd(p) : bare(rd(p));
    for (const n of GONE) if (new RegExp('(?<![\\w$.:])' + n + '\\s*[(=]|function\\s+' + n + '\\b').test(s)) hits.push(rel(p) + ': ' + n);
    if (/\b(?:ctx\.)?A{1,2}B?\.enf\s*\?|\(A && A\.enf\)\s*return|!(?:ctx\.)?A\.enf\b(?!\.)|if\s*\(\s*(?:ctx\.)?A{1,2}B?\.enf\s*\)|ENFX\s*\?|!ENFX\b(?!\.)|ENFX\s*&&/.test(s)) hits.push(rel(p) + ': فرعٌ بحسب الوضع');
    if (/\?\s*['"]enforce['"]\s*:\s*['"]legacy['"]/.test(s)) hits.push(rel(p) + ": 'legacy' وضعاً");
  }
  assert.deepEqual(hits, [], 'باقٍ:\n' + hits.join('\n'));
  const E = code(rd(path.join(ROOT, 'workers', 'parts', '056-enforce.js')));
  assert.doesNotMatch(E, /mode:\s*'legacy'|'legacy'\s*\)/, 'enfModeOf لا يعيد legacy');
  assert.match(E, /out\.mode = out\.unavailable \? 'unavailable' : \(out\.d1 === 'enforce' \? 'enforce' : 'unmigrated'\);/);
  assert.doesNotMatch(E, /if \(!out\.env\) return out;/, 'لا يتوقف الوضعُ على متغيّر البيئة');
  const H = code(rd(path.join(ROOT, 'workers', 'parts', '063-enf-api-and-handler.js')));
  assert.doesNotMatch(H, /if \(enfEnvOn\(env\)\) \{ var ENF[MP] = await enfModeOf/, 'الوضعُ يُقرأ في كل بيئة');
  assert.equal((H.match(/enfEnvOn\(env\)/g) || []).length, 1, 'المتغيّرُ شرطُ أداة الاختبار وحدها');
  assert.match(H, /\(enfEnvOn\(env\) && \(path === '\/api\/authz-test' \|\| path === '\/api\/demo-data'\)/);
  const A = code(rd(path.join(ROOT, 'workers', 'parts', '017-authorize-core.js')));
  assert.match(A, /A0\.enf = \(env && env\.__enf\) \|\| ENF_CLOSED; await enfAttachGrants\(env, A0\);/, 'كلُّ فاعلٍ بوضع المحرّك');
  const C = code(rd(path.join(SRC, 'permissions', '331-perm-model.js')));
  assert.doesNotMatch(C, /if \(!azZ\(\) \|\| isSuper\(\)\) return all;/); assert.doesNotMatch(C, /_lensOn0/);
  assert.match(C, /if \(isSuper\(\)\) return all;\s*if \(!azZ\(\)\) return \{\};\s*var H = azHeld\(curDept\(\)\); if \(H === null\) return \{\};/);
  assert.doesNotMatch(code(rd(path.join(SRC, 'modules', 'admin', 'logic-perm44.js'))), /"enforce" === KIVO\.__BS_AUTHZ\.mode/, '«الصلاحيات» للمدير لا تتوقف على وضعٍ قديم');
});

test('④ تقريرُ السجلّ القديم (permv2) — لا مسارَ ولا عقدَ', () => {
  const hits = [];
  for (const p of SERVER.concat(CLIENT)) if (rd(p).includes('/api/permv2')) hits.push(rel(p));
  assert.deepEqual(hits, []);
});
