/* V7 · د5-هـ (44) · إصلاحُ نافذة السبب — «اسأل أولاً ثم أرسل مرّةً واحدة» في طبقة التخزين الحقيقية (src/api/280-server-storage.js داخل node:vm)
   وخادمٍ وهميٍّ يسجّل كلَّ طلب /api/save (TEST_ONLY):
     ① كتابةٌ يُعرف أنها تتطلب سبباً (قاعدةُ المورد reasonRule · أو السجلّ: كلُّ مفاتيح الكتابة المحمولة على المورد مفاتيحُ سبب) لا تُرسل قبل السبب: صفرُ طلبات
     ② «حفظ بالسبب» ⇒ طلبٌ واحد يحمل why بالسبب · ③ «إلغاء» ⇒ صفرُ طلبات ولا رسالةَ رفض وتعود القيمةُ المحفوظة
     ④ مديرُ المنصة لا يُسأل أبداً (طلبٌ واحد بلا why) · ⑤ الوضعُ القديم (بلا إنفاذ) لا يسأل · ⑥ reasonFirst: الإلغاءُ go:false بلا طلب، والقبولُ يُعلِّم المفتاح */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadClient, sleep } from './k264_vm.mjs';

const K = 'bsdept:tst_d1:bassam_last_export_v1', RES = 'bassam_last_export_v1';
function server() {
  const saves = [];
  return { saves, req: async (p, o = {}) => {
    if (/^\/api\/save/.test(p) && o.method === 'POST') {
      const b = JSON.parse(o.body); saves.push(b); const revs = {}; Object.keys(b.set || {}).concat(b.del || []).forEach((k) => { revs[k] = saves.length; });
      return new Response(JSON.stringify({ ok: 1, revs }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ ok: 1 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } };
}
/* عناصرُ الصفحة الوهمية: querySelector يعيد العنصرَ نفسَه لكل محدِّد (للضغط على «حفظ بالسبب» و«إلغاء التعديل») */
function dialogDom(W) {
  const mk = () => { const kids = {}; const e = { style: {}, attrs: {}, children: [], listeners: {}, value: '', checked: false,
    setAttribute(k, v) { e.attrs[k] = v; }, addEventListener(t, f) { (e.listeners[t] = e.listeners[t] || []).push(f); }, focus() {},
    querySelector(s) { return kids[s] || (kids[s] = mk()); }, appendChild(c) { e.children.push(c); c.parentNode = e; return c; },
    removeChild(c) { e.children = e.children.filter((x) => x !== c); c.parentNode = null; return c; } };
    Object.defineProperty(e, 'innerHTML', { set(v) { e._h = v; }, get() { return e._h || ''; } });
    Object.defineProperty(e, 'textContent', { set(v) { e._t = v; }, get() { return e._t || ''; } });
    return e; };
  const body = mk(); W.document.body = body; W.document.createElement = () => mk();
  return { open: () => body.children.filter((c) => c.attrs.role === 'dialog'), body };
}
function page({ role = 'staff', authz = true, rule = true, reg = false } = {}) {
  const C = server();
  const T = loadClient({ C, boot: { srv: 1, cf: 1, v: 1, uid: 'TEST_ONLY_u', keys: { [K]: '"TEST_ONLY_old"' }, revs: { [K]: 3 }, ...(authz ? { authz: { mode: 'enforce', depts: {} } } : {}) } });
  const KV = T.W.KIVO, toasts = [];
  KV.BassamAuth = { user: () => ({ id: 'TEST_ONLY_u', role }) };
  KV.bsToast = (m, o) => toasts.push({ m, tone: o && o.tone });
  if (rule) KV.__BS_SRV.reasonRule(RES, (oldV, newV) => (newV === '"TEST_ONLY_new"' ? ['backup.restore'] : []));
  if (reg) {
    KV.KIVO_REGISTRY = { keys: ['backup.restore', 'backup.view'], byKey: {
      'backup.restore': { status: 'active', type: 'operation', guard: { resources: [RES] }, audit: { reason: true } },
      'backup.view': { status: 'active', type: 'view', guard: { resources: [RES] }, audit: { reason: false } } } };
    KV.BassamPerm = { key: () => true };
  }
  const D = dialogDom(T.W);
  return { T, C, D, toasts, KV };
}
const settle = () => sleep(250);

/* V7 · د6 (QA) · البند ١ (قرارُ المالك): لا يُسأل أحدٌ عن سبب — هذه الحالاتُ كانت تثبت «النافذة أولاً» وصارت تثبت غيابَها:
   كتابةٌ كانت تُعدّ «تتطلب سبباً» (قاعدةُ المورد أو التنبّؤ من السجلّ) تُرسل فوراً طلباً واحداً بلا why ولا نافذة ولا رسالةَ رفض */
test('① ② ③ لا نافذةَ سبب: كتابةُ مفتاحٍ كان يتطلب سبباً تُرسل فوراً طلباً واحداً بلا سبب', async () => {
  const { T, C, D, toasts } = page();
  try {
    T.set(K, '"TEST_ONLY_new"'); await settle();
    assert.equal(D.open().length, 0, 'لا نافذة'); assert.equal(C.saves.length, 1, 'طلبٌ واحد'); assert.equal(C.saves[0].set[K], '"TEST_ONLY_new"');
    assert.equal(C.saves[0].why, undefined, 'بلا سبب'); assert.equal(toasts.filter((x) => x.tone === 'err').length, 0, 'لا رسالةَ رفض');
  } finally { T.dispose(); }
});

test('التنبّؤ من السجلّ لم يعد يسأل: كلُّ مفاتيح الكتابة على المورد مفاتيحُ audit.reason ⇒ يُرسل بلا نافذة', async () => {
  const { T, C, D } = page({ rule: false, reg: true });
  try {
    T.set(K, '"TEST_ONLY_any"'); await settle();
    assert.equal(D.open().length, 0); assert.equal(C.saves.length, 1); assert.equal(C.saves[0].why, undefined);
  } finally { T.dispose(); }
});

test('④ مديرُ المنصة لا يُسأل · ⑤ الوضعُ القديم لا يسأل — طلبٌ واحد بلا سبب', async () => {
  for (const o of [{ role: 'super' }, { authz: false }]) {
    const { T, C, D } = page(o);
    try {
      T.set(K, '"TEST_ONLY_new"'); await settle();
      assert.equal(D.open().length, 0, 'لا نافذة: ' + JSON.stringify(o)); assert.equal(C.saves.length, 1); assert.equal(C.saves[0].why, undefined);
    } finally { T.dispose(); }
  }
});

test('⑥ reasonFirst (للتوافق): go:true فوراً بلا نافذة لأيّ حساب — V7 · د6 (QA)', async () => {
  for (const o of [{ rule: false }, { role: 'super', rule: false }]) {
    const { T, D, KV } = page(o);
    try {
      let r = null; KV.__BS_SRV.reasonFirst(K, ['backup.restore'], (x) => { r = x; }); await settle();
      assert.equal(D.open().length, 0, 'لا نافذة: ' + JSON.stringify(o)); assert.equal(r.go, true); assert.equal(r.reason, '');
      assert.equal(KV.__BS_SRV.reasonExempt(), true, 'كلُّ حسابٍ معفًى');
    } finally { T.dispose(); }
  }
});
