/* V7 · د5-ح (قرار المالك · البند ٧) — تنبيهُ نظامٍ مطفأ لا يُولَّد ولا يُعرض لأحد: الحكمُ الواحد في الخادم (019 nfSysOf · nfSysOff) على دواله الحقيقية.
   · مصدرُ النوع من إعلان النظام نفسِه (NF_CAP_ID · NF_CAP ← فتحاتُ الأنظمة) ⇒ النظامُ مالكُ الورقة (perm44E().sysList) — لا قائمةَ أسماء.
   · الأنواعُ العامة (الأمن · النسخ · الحساب · التعاميم · الموظفون) بلا نظام فلا تتأثر.
   · مطفأٌ على المنصة (A.off) أو في سقف الوحدة أو أصلها ⇒ off؛ مفعّلٌ في وحدةٍ أخرى ⇒ لا. بيانات TEST_ONLY. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { internals } from './internals.mjs';

const W = await internals(['nfSysOf', 'nfSysOff', 'NF_TYPES', 'NF_CAP', 'NF_CAP_ID', 'perm44E']);
const SYS = W.perm44E().sysList().filter((s) => s.toggle !== false).map((s) => s.key);
const A = (caps, off = []) => ({ u: { role: 'super', id: 'TEST_ONLY_su' }, off, perms: { caps, subs: {}, lenses: {}, emps: {} }, depts: [{ id: 'TEST_ONLY_D1', name: 'TEST_ONLY' }, { id: 'TEST_ONLY_D2', name: 'TEST_ONLY' }], gdepts: [], nodes: [] });

test('every notification type is attributed from the system\'s own declaration — core kinds have no system', () => {
  const types = Object.keys(W.NF_TYPES), by = {};
  for (const t of types) by[t] = W.nfSysOf(t, W.NF_TYPES[t].k);
  for (const t of types) {
    const k = W.NF_TYPES[t].k;
    if (t === 'st_shdef') continue;   /* its own leaf (NF_CAP_ID) is «الإعدادات ← الورديات» — checked below */
    if (['sec', 'sys', 'bc', 'acct', 'emp', 'perm'].includes(k)) assert.equal(by[t], '', t + ' (' + k + ') is a core kind');
    else assert.ok(SYS.includes(by[t]), t + ' (' + k + ') belongs to a switchable system: ' + by[t]);
  }
  assert.equal(by.st_shdef, '', 'the shift definitions live in «الإعدادات ← الورديات» — core');
  assert.ok(new Set(Object.values(by).filter(Boolean)).size >= 8, 'several systems carry notifications');
});

test('OFF for the department (or an ancestor) or on the platform ⇒ off; ON elsewhere ⇒ not', () => {
  const t = Object.keys(W.NF_TYPES).find((x) => W.nfSysOf(x, W.NF_TYPES[x].k) === 'tasks') || Object.keys(W.NF_TYPES).find((x) => W.nfSysOf(x, W.NF_TYPES[x].k));
  const s = W.nfSysOf(t, W.NF_TYPES[t].k), page = W.NF_CAP_ID[t] || W.NF_CAP[W.NF_TYPES[t].k], top = page.split('/')[0];
  const full = ['tasks', 'daily', 'dreport', 'admin', 'emps', 'dstats', 'staff', 'plan', 'planning', 'irshad', 'seized', 'award', 'links', 'help'];
  const caps = { TEST_ONLY_D1: full.filter((k) => k !== top), TEST_ONLY_D2: full };
  assert.equal(W.nfSysOff(A(caps), 'TEST_ONLY_D1', t, W.NF_TYPES[t].k), true, t + ': OFF in D1');
  assert.equal(W.nfSysOff(A(caps), 'TEST_ONLY_D2', t, W.NF_TYPES[t].k), false, t + ': ON in D2');
  assert.equal(W.nfSysOff(A({ TEST_ONLY_D1: full, TEST_ONLY_D2: full }, [s]), 'TEST_ONLY_D2', t, W.NF_TYPES[t].k), true, t + ': OFF on the platform ⇒ everywhere');
  assert.equal(W.nfSysOff(A(caps), 'TEST_ONLY_D1', 'sc_dev', 'sec'), false, 'a security notice is never affected');
  assert.equal(W.nfSysOff(A(caps), 'TEST_ONLY_D1', 'bc_dept', 'bc'), false, 'a broadcast is never affected');
});
