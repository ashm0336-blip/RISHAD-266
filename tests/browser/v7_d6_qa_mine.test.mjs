/* V7 · د6 (QA) · البند ٥ — لا شريطَ «عُدِّل … بعد حفظك» كاذباً بعد فعل المستخدم نفسِه عبر مسار خادم (TEST_ONLY · المختبر · وضع الإنفاذ):
     ① إعادةُ إنتاج الخلل: أحفظ مفتاحاً، ثم يكتبه «مسارُ خادمٍ» بطلبي بقيمةٍ لا تحمل تعديلي ⇒ بلا إيصال mine يظهر الشريط (الخلل كما رآه المالك)
     ② مع إيصال المسار (KIVO.__BS_SRV.mine(revs) — ما تفعله الآن حذفُ الإدارة ومسحُها · نقلُ الموظفين/إنشاءُ حساباتهم/استيرادُهم · استيرادُ النسخة واستعادتُها)
        ⇒ لا شريط
     ③ جهازٌ آخر يكتب فوق حفظي التالي ⇒ الشريطُ يظهر كما كان (التحذيرُ الحقيقي باقٍ)
     ④ الربط: المساراتُ الأربعة تستدعي mine بإيصالها (في الحزمة المبنية) */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const K = 'bassam_depts_v1', G = 'TEST_ONLY_G';
const DEPTS = (bName) => [{ id: 'TEST_ONLY_A', name: 'TEST_ONLY إدارة أ', gid: G }, { id: 'TEST_ONLY_B', name: bName, gid: G }, { id: 'TEST_ONLY_A_S1', name: 'TEST_ONLY قسم أ١', gid: 'TEST_ONLY_A', kind: 'قسم' }];
async function putK(lab, k, v) {
  const DB = lab.env.DB;
  await DB.batch([DB.prepare('DELETE FROM kv WHERE k=?1').bind(k), ...lab.W.kvPutStmts(lab.env, 'kv', k, JSON.stringify(v)),
    DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,1) ON CONFLICT(k) DO UPDATE SET rev=rev+1').bind(k),
    DB.prepare("UPDATE meta SET v=CAST(CAST(v AS INTEGER)+1 AS TEXT) WHERE k='rev'")]);
  return lab.env.DB.q('SELECT rev FROM revs WHERE k=?1', k)[0].rev;
}
const banner = (p) => p.evaluate(() => { const d = document.getElementById('bs-conflict'); return d && d.style.display !== 'none' ? d.innerText.replace(/\s+/g, ' ') : ''; });
const clearBanner = (p) => p.evaluate(() => { const d = document.getElementById('bs-conflict'); if (d) d.remove(); });
const mySave = (p, v) => p.evaluate(async ([k, v]) => { localStorage.setItem(k, JSON.stringify(v)); await KIVO.__BS_SRV.flush(); return localStorage.getItem(k); }, [K, v]);
const pull = async (p) => { await p.evaluate(async () => { try { await KIVO.__BS_SRV.resync(false); } catch (e) {} }); await p.waitForTimeout(2500); };

test('البند ٥: فعلُ المستخدم عبر مسار خادم لا يُعلَن «كاتباً آخر»؛ تعديلُ جهازٍ آخر يُعلَن', { timeout: 300000 }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw); await s.go('#/admin', 3000);
    /* ① بلا إيصال: الخلل */
    await mySave(s.page, DEPTS('TEST_ONLY ب mine-a')); await lab.idle();
    await putK(lab, K, DEPTS('TEST_ONLY إدارة ب'));                       /* «المسار» أزال ما أضفتُه */
    await pull(s.page);
    assert.match(await banner(s.page), /بعد حفظك|عُدِّل/, '① بلا إيصال mine يظهر الشريط (إعادةُ إنتاج الخلل)');
    await clearBanner(s.page);
    /* ② بالإيصال: لا شريط */
    await mySave(s.page, DEPTS('TEST_ONLY ب mine-b')); await lab.idle();
    const R = await putK(lab, K, DEPTS('TEST_ONLY ب srv'));
    await s.page.evaluate(([k, r]) => KIVO.__BS_SRV.mine({ [k]: r }), [K, R]);
    await pull(s.page);
    assert.equal(await banner(s.page), '', '② فعلُ الخادم بطلبي ⇒ لا شريط');
    assert.equal(JSON.parse(await s.page.evaluate((k) => localStorage.getItem(k), K))[1].name, 'TEST_ONLY ب srv', '② القيمةُ الجديدة وصلت');
    /* ③ جهازٌ آخر فوق حفظي التالي ⇒ الشريط */
    await mySave(s.page, DEPTS('TEST_ONLY ب mine-c')); await lab.idle();
    await putK(lab, K, DEPTS('TEST_ONLY ب other'));
    await pull(s.page);
    assert.match(await banner(s.page), /بعد حفظك|عُدِّل/, '③ تعديلُ جهازٍ آخر يُعلَن كما كان');
    assert.deepEqual(s.errs, [], 'لا أخطاء صفحة');
    await s.ctx.close();
  } finally { await b.close(); await lab.close(); }
  /* ④ الربط في الحزمة المبنية */
  const dist = process.env.KIVO_DIST, all = fs.readdirSync(path.join(dist, 'assets'), { recursive: true }).filter((f) => String(f).endsWith('.js')).map((f) => fs.readFileSync(path.join(dist, 'assets', String(f)), 'utf8')).join('\n');
  assert.ok((all.match(/srv\.mine\(receipt\.revs\)/g) || []).length >= 2, '④ حذفُ الإدارة ومسحُها');
  assert.ok((all.match(/__BS_SRV\.mine\(ack\.revs\)/g) || []).length >= 2, '④ انتقالُ الموظفين (نقل · إنشاء · استيراد · حذف) واستيرادُ النسخة/استعادتُها');
});
