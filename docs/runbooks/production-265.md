# Runbook — نقلُ Production من KIVO_242 + SR-2.3 إلى KIVO_265 · SOT-162 · SOT-191/192

> **مرجع تاريخي لا ينطبق على RISHAD-266 — 30 أكتوبر 2026:** لا تنفيذ إنتاجي ضمن التفويض الحالي. بيانات المخطط والإصدارات والربط هنا تاريخية. أدوات D1 الحالية مقيدة بـPreview وترفض أعلام السماح القديمة؛ يلزم إعداد خطة مستقلة جديدة قبل أي عمل إنتاجي مستقبلًا، ولا يُستنتج اعتماده من قبول Preview.

> **الحالة: لا يُنفَّذ إلا بموافقة المالك الصريحة** — «لا تنشر على Production حتى أعطيك موافقة صريحة» (2026-10-15 09:25 · `reports/k265/decisions.md`).
> كلُّ خطوةٍ تمسّ Production (الرفع · Save and deploy · Rollback · استرجاعُ D1) **ينفّذها المالك بنفسه**؛ ومن جهتنا قراءةٌ وحدها. الإجراءُ العامّ لأيّ إصدار: `docs/runbooks/production-release.md`.

| | الآن (المصدر) | الهدف |
|---|---|---|
| الكود | النشر **`c378cd7e`** (2026-10-14 12:19) = KIVO_242 + AUD-033c + SR-1 + SR-2.3 · `/api/brand`: `ver 2026.10.06-140` · `hf "AUD-033c+SR-1+SR-2.3 · 2026-10-14"` · ملفُّ رفعه `8504f25c…8efe` | KIVO_265 = `k265` @ **التزامُ الإصدار** (خطُّ `11bfda9` · آخرُ تغييرٍ في المنتج `164616d` k265-init — يُثبَّت الالتزامُ عند وسم `KIVO_265`) · `pk265` MANIFEST **`1dd251b2d8a4e904`** (#src `608c9233c6af007b` · العامل `f234c4e299fa771d…`) · `pk265.prod` (بلا أداة الاختبار) MANIFEST **`2ecaf62b1ce54feb`** · الإصدار `2026.10.14-265` · الخادم `2026.10.14-165` · `KIVO_265_Production_upload.zip` بـ``f4bbe2e015dba9bd7225b29dc169d0e6fff7d014d7be4c562e0de106ed3234d5`` |
| القاعدة | `bassam-db` (ربطُ `DB` في بيئة Production) — عصرُ 242: بلا `d1_migrations` | الترحيلاتُ 0001…0003 تُطبَّق آلياً عند أول طلب (§1) |
| الصلاحيات | `legacy` (لا متغيّراتِ بيئة) | **`legacy` كما هي**: بلا `KIVO_AUTHZ_MODE=enforce` لا يُقرأ `meta.authz_mode` أصلاً (`workers/parts/056-enforce.js` `enfModeOf`) — لا تُضاف متغيّراتٌ إلا بقرار؛ و`KIVO_TEST_FIXTURE` ممنوعٌ على Production |
| الرجوع | — | **`c378cd7e`** (§5) — **لا `152c5dfb` أبداً** |

> **تحديث 2026-10-19 (قرارُ المالك «أبغاهم يطابقون»):** Production صار في وضع **الإنفاذ** كالتست: `KIVO_AUTHZ_MODE=enforce` أُضيف إلى متغيّرات بيئة Production وأُعيد رفعُ حزمة 265 نفسِها · ترحيلُ الصلاحيات من متصفح المالك بحساب مدير النظام: `apply` (11 كتابة · لقطة `migration_mvfpp0wf_qzjw7` · rev 7286) ثم `apply` بالمستنتَج (`inferable`: 16 قيمةَ نطاقٍ لموظفين · لقطة `migration_mvfptavn_2n8n4k` · rev 7287) بلا تحذيرات · ثم `meta.authz_mode='enforce'` في D1 Console. المفتاحُ الطارئ كما هو: `UPDATE meta SET v='legacy' WHERE k='authz_mode';` بلا نشر. الصفُّ «الصلاحيات» أعلاه تاريخيٌّ لما قبل هذا التاريخ.

## 0) شروطُ البدء (كلُّها إلزامية)
> **بصمةُ المرشّح النهائي (كانت `30258e1` · MANIFEST `08d3051817070e9f` — أُبطلت بدمج k265-init):** `pk265` MANIFEST `1dd251b2d8a4e904` = أوّلُ 16 خانةً من `sha256(pk265.MANIFEST.sha256)` · `pk265.prod` MANIFEST `2ecaf62b1ce54feb` = أوّلُ 16 خانةً من `sha256(pk265.prod.MANIFEST.sha256)` · العامل `f234c4e2…`. أيُّ اختلافٍ في أيٍّ منها عند التسليم ⇒ توقّف.

- [x] البوابةُ الإلزامية كاملةً PASS على المرشّح النهائي `1dd251b2d8a4e904` (`reports/k265/gate_265_run4.txt` + الاستئناف `gate_265_run4b.txt` · `gate_265_done4.txt` · الإفصاح `gate_265_run4_fixes.txt` — run3 كانت على المرشّح السابق) · release_check 16|0 · `python3 tools/release_check.py 265` · التغليفُ من `pk265.prod` و`python3 tools/prod_strip.py pk265 --check` ⇒ «0 مخالفة».
- [ ] نُشر 265 على Preview بموافقة 09:25 (مطابقةُ الحزمة المختبرة للمنشورة · سلامةُ بيانات Preview) وتحقّقٌ حيٌّ بأدوارٍ متعددة.
  - **2026-10-16:** نُشر ✔ (المالك · Preview · `test` · `KIVO_265_Preview_upload.zip` `643c1057…`) · **المطابقة ✔** 143/143 ملفاً = `pk265` بالبصمة · **التحقّقُ الحيّ بلا جلسة PASS 18 | 0** (`reports/k265/preview/verify_265_live_2026-10-16.md`) · **متعدّدُ الأدوار: ينتظر دخولَ المالك بنفسه** (أقسامُ الجلسة في المقتطف) — أو قرارَه بالاكتفاء بما سبق.
- [ ] النقاطُ الستّ التي طلب المالك التحقّقَ منها قبل Production (رسالةُ 09:25) — مغلقةٌ بدليل.
- [ ] عُرضت على المالك المخاطرُ المفتوحة: R-20 (حساباتٌ مربوطةٌ برقم الهوية لا تُسند إليها مهامُّ جديدة) · R-26 (الحساباتُ المكرّرة — §2 بند 4) · **R-27 (خطُّ 243…265 لم يعمل قطّ بالوضع القديم على Cloudflare الحقيقي)** · R-28 (الرجوع) — `reports/k264/tasks/RISKS.md`.
- [ ] عُرضت على المالك ملاحظاتُ المراجعة المستقلة على k265-init (N1…N4 — §1) ونتيجةُ عدّ `audit` (§2 بند 5) ونافذةُ النشر الهادئة المقترحة (§3).
- [ ] موافقةُ المالك الصريحة على هذا النشر بعينه (ملفُّ الرفع وبصمتُه).

## 1) ما يحدث في `bassam-db` عند أول طلبٍ بعد النشر (آليّ · لا يُشغَّل شيءٌ يدوياً)
العاملُ يهيّئ القاعدةَ عند أوّل طلب (`workers/parts/052-aud-events.js`: `initDb` ← `migrateDb`) — **منذ k265-init (`164616d`) لا وعدَ تهيئةٍ مشتركاً بين الطلبات**: كلُّ طلبٍ يصل قبل أوّل نجاحٍ في الـisolate يُجري `migrateDb` الخاصَّ به (متساوي القوى: `IF NOT EXISTS` · `INSERT OR IGNORE` · وعلى القاعدة المحدَّثة استعلامٌ واحد) حتى ينجح أحدُها فتُرفع العلامةُ `_initOk` ولا تهيئةَ بعدها؛ ولكلّ طلبٍ مهلةُ **8 ث** (`INIT_MS = 8000`) — انقضاؤها أو خطأُ D1 ⇒ ردٌّ سريع **500 `worker-error`** على `/api/*` (رسالةُ السجلّ `db-init-timeout 8000ms` أو رسالةُ SQLite) و**صفحةُ 503** للغلاف، والطلبُ التالي يحاول من جديد. (كان: «مرّةً لكل isolate بوعدٍ مشترك» — فإن علقت جولتُه علقت كلُّ الطلبات بلا 5xx: حادثةُ 2026-10-15 · `reports/k265/incident_prod_2026-10-15.md`.) والترحيلاتُ من `migrations/` مولَّدةٌ في `workers/parts/051a-schema-migrations.js` (`docs/runbooks/migrations.md` · ADR-011):

| الخطوة | ما يحدث | يمحو أو يعدّل بياناتٍ قائمة؟ | بعد الرجوع |
|---|---|---|---|
| (أ) `SELECT name FROM d1_migrations` | الجدولُ غيرُ موجودٍ في قاعدة 242 (عاملُ 242 وSR-2.3 لا يعرفانه) ⇒ «قاعدةٌ جديدة على الترقيم» | لا | — |
| (ب) `adoptLegacy` | `PRAGMA table_info` على `sess` و`audit`، و`ALTER TABLE … ADD COLUMN dev/city` **إن غاب العمودُ وحده** — وعاملُ 242 يضيفهما كسولاً أصلاً | لا (إضافةُ عمود) | يبقى · لا يضرّ |
| (ج) `CREATE TABLE IF NOT EXISTS d1_migrations` | جدولُ wrangler نفسُه (`id · name UNIQUE · applied_at`) | لا | يبقى · لا يقرؤه 242 |
| (د) `0001_baseline` | `CREATE TABLE/INDEX IF NOT EXISTS` لجداول 242 نفسِها بنصّ `initDb` في 242 (kv · imgs · revs · imgown · imgref · meta · sess · guard · audit · sec · aud وفهارسُها) ثم `meta.schema_version = 1` | لا (القائمُ لا يُمسّ) | `schema_version` لا يقرؤه 242 |
| (هـ) `0002_enforcement_tables` | `authz` · `authz_snap` · `authz_snaps` (+3 فهارس) — لوضع الإنفاذ وأداة الترحيل وحدهما · `schema_version = 2` | لا | جداولُ زائدة يتجاهلها 242 |
| (و) `0003_aud_legacy_import` | `INSERT OR IGNORE INTO aud … SELECT … FROM audit` بمعرّف `cid = 'legacy_' \|\| id` الفريد · `meta.aud_mig = 1` · `schema_version = 3` — عاملُ 242 أجرى النقلَ نفسَه مرّةً (`aud_mig`) ولا يكتب في `audit` ⇒ **لا صفوفَ مكرّرة**؛ كلفتُه مسحُ `audit` كاملاً مرّةً | لا (إدراجٌ يتجاهل الموجود) | يبقى |

- كلُّ ترحيلٍ **دفعةٌ ذرّيّة واحدة** تنتهي بتسجيل اسمه في `d1_migrations`، ويُكتب سطرُ `schema-migrate` في Workers Logs.
- **إن أخفقت دفعة أو انقضت المهلة**: لا أثرَ جزئيّ للدفعة؛ الطلبُ نفسُه 500 `worker-error` سريعاً، وكلُّ طلبٍ لاحق يعيد التهيئةَ بنفسه حتى تنجح إحداها. 500 متكرّرةٌ لا تزول خلال دقيقتين (§4) ⇒ الرجوعُ إلى `c378cd7e` (§5) وقراءةُ رسالة SQLite أو `db-init-timeout 8000ms` من السجلّ.
- **ملاحظاتُ المراجعة المستقلة على k265-init (APPROVE-WITH-NOTES) وأثرُها هنا:**
  - **N1 (منخفض):** التهيئةُ لم تعد مرّةً لكل isolate — N طلباً متزامناً قبل أوّل نجاح تُجري كلُّها `migrateDb` (آمنٌ للبيانات) ⇒ قد يظهر سطرُ `schema-migrate` أكثرَ من مرّة ودفعاتٌ زائدة في D1. **متوقَّع، لا يستدعي إجراءً** (§4).
  - **N2 (مشروط · متوسّط لقفزة 242→265):** طلباتٌ أولى كثيرةٌ متزامنة + استيرادُ 0003 بطيءٌ على `audit` كبير + قطعُ 8 ث ⇒ رشقةٌ قصيرةٌ من 500 تزول وحدها؛ لا تُعتبر إلا قرابةَ مليون صفّ في `audit` فأكثر ⇒ **عدُّ `audit` قبل النشر (§2 بند 5) · نافذةٌ هادئة · طلبُ إحماءٍ واحد قبل فتح الاستعمال (§3)**.
  - **N3 (منخفض · تشخيصيّ):** متسابقٌ بطيءٌ تقطعه المهلةُ بعد أن أنهى غيرُه قد يترك `meta.schema_version` على `'1'` أو `'2'` و`d1_migrations` فيه 3 أسطر ⇒ `/api/ping` يعطي `schemaOk = 0` و`ready = 0` ويُخفق فحصُ `schema = schemaDb = 3` — **الإجراءُ في §4**. (متابعةٌ هندسية: جعلُ ختم `schema_version` رتيباً لا ينزل.)
  - **N4 (منخفض · ليس Production):** على قواعدَ أقدمَ من 242 بلا عمودَي `dev/city` قد تتسابق `ALTER` في `adoptLegacy` فتُعطي 500 عابرة — قاعدةُ `bassam-db` عصرُ 242 وعاملُه يضيف العمودين ⇒ لا ينطبق؛ ويُثبَّت بقراءة §2 بند 7.
- **لا ترحيلَ بيانات للمحتوى:** صفوفُ المهام والحساباتُ والصلاحياتُ لا يُعاد كتابتُها (`reports/k264/tasks/COMPAT_MIGRATION.md` §1 · ق4)؛ بصمةُ كلمة المرور بالصيغة نفسِها (`p2$100000$…` — `verifyPw`/`hashPw` متطابقتان)؛ وكوكي الجلسة `bs_tok` نفسُه وجدولُ `sess` نفسُه (فالجلساتُ تبقى — استنتاجٌ لم يُجرَّب على Cloudflare).

## 2) قبل النشر — قراءةٌ وحدها (ينفّذها المالك · لا كتابة)
1. **مرجعُ Time Travel (نقطةُ الاسترجاع):** `npx wrangler d1 time-travel info bassam-db` — يطبع المرجعَ (bookmark) للحظة الحالية ولا يغيّر شيئاً؛ يُسجَّل المرجعُ ووقتُه في سجلّ النشر (كما سُجّل `000005dc-00000592-00005104-951aa0a9…` قبل SR-2.3). البديل: لوحةُ D1 ← Time Travel.
2. **بند النسخة الإنتاجية التاريخي غير قابل للتنفيذ بالأداة الحالية:** `backup.sh` مقيدة بـPreview وترفض الإنتاج دون استثناء بيئي. يلزم اعتماد محتوى ووجهة وخطة نسخة مستقلة مستقبلًا؛ لا تصدير إنتاجي ضمن هذا التفويض.
3. **حالةُ Production:** `GET /api/brand` ⇒ `ver 2026.10.06-140` و`hf "AUD-033c+SR-1+SR-2.3 · 2026-10-14"` · النشرُ الفعّال على Production = `c378cd7e` · متغيّراتُ البيئة: لا شيء · `DB` = `bassam-db`.
4. **الحساباتُ النشطة المكرّرة لسجلّ موظفٍ واحد (R-24 · R-26)** — في D1 Console (SELECT وحده). بعد 265 لا يُربط سجلٌّ يحلّ إليه حسابان نشطان بأيٍّ منهما (لا «مهامي» ولا جدولَ ولا تقرير) حتى يُعطَّل أحدُهما. الاستعلامُ يحاكي قاعدةَ الخادم (`054 usersDupEkey` · `070 tkRecShared`: المعرّفُ أو رقمُ الهوية فريداً في الإدارة، ثم ربطُ «ملفي» للموظفين) — مختبَرٌ على بياناتٍ اصطناعية؛ القيمةُ الأطول من 700,000 حرف مقسومةٌ على عدّة صفوف `seq` ويعيد الاستعلامُ وصلَها:

```sql
-- KIVO_265 · R-24/R-26 — READ-ONLY (SELECT only): active login accounts that resolve to the SAME employee record in one department.
-- Output: one row per employee record carried by 2+ active accounts (account ids only — no login names). Expected after cleanup: 0 rows.
WITH RECURSIVE
parts(k, seq, v) AS (
  SELECT k, seq, v FROM kv WHERE k = 'bassam_auth_users_v1' OR k LIKE 'bsdept:%:bassam_employees_v1'
),
cat(k, seq, j) AS (
  SELECT k, seq, v FROM parts WHERE seq = 0
  UNION ALL
  SELECT c.k, p.seq, c.j || p.v FROM cat c JOIN parts p ON p.k = c.k AND p.seq = c.seq + 1
),
whole(k, j) AS (
  SELECT c.k, c.j FROM cat c WHERE c.seq = (SELECT MAX(p.seq) FROM parts p WHERE p.k = c.k)
),
acct(id, role, dept, ek) AS (
  SELECT CAST(json_extract(x.value, '$.id') AS TEXT), CAST(json_extract(x.value, '$.role') AS TEXT),
         CAST(COALESCE(json_extract(x.value, '$.deptId'), '') AS TEXT), CAST(json_extract(x.value, '$.ekey') AS TEXT)
  FROM whole w, json_each(w.j) x
  WHERE w.k = 'bassam_auth_users_v1' AND json_valid(w.j) AND x.type = 'object'
    AND (json_extract(x.value, '$.dis') IS NULL OR json_extract(x.value, '$.dis') IN (0, ''))
),
act(id, role, dept, ek) AS (
  SELECT id, role, dept, ek FROM acct
  WHERE id IS NOT NULL AND id <> '' AND ek IS NOT NULL AND ek <> '' AND COALESCE(role, '') NOT IN ('super', 'gm')
    AND ek NOT LIKE 'mgr:%' AND ek NOT LIKE 'gm:%'
),
emp(dept, idx, eid, nid) AS (
  SELECT substr(w.k, 8, length(w.k) - 7 - length(':bassam_employees_v1')), x.key,
         CAST(json_extract(x.value, '$.eid') AS TEXT), trim(CAST(json_extract(x.value, '$.nid') AS TEXT))
  FROM whole w, json_each(w.j) x
  WHERE w.k LIKE 'bsdept:%:bassam_employees_v1' AND json_valid(w.j) AND x.type = 'object'
),
res(id, dept, ek, idx) AS (
  SELECT a.id, a.dept, a.ek, COALESCE(
    (SELECT CASE WHEN COUNT(*) = 1 THEN MIN(e.idx) END FROM emp e WHERE e.dept = a.dept AND (e.eid = a.ek OR e.nid = a.ek)),
    CASE WHEN a.role = 'staff' THEN COALESCE(
      (SELECT CASE WHEN COUNT(*) = 1 THEN MIN(e.idx) END FROM emp e WHERE e.dept = a.dept AND e.eid = a.ek),
      (SELECT CASE WHEN COUNT(*) = 1 THEN MIN(e.idx) END FROM emp e WHERE e.dept = a.dept AND e.nid = a.ek
         AND NOT EXISTS (SELECT 1 FROM emp e2 WHERE e2.dept = a.dept AND e2.eid = a.ek))) END)
  FROM act a
)
SELECT r.dept AS department,
       CASE WHEN r.idx IS NULL THEN 'key ' || r.ek
            ELSE 'record #' || r.idx || ' (eid ' || COALESCE((SELECT e.eid FROM emp e WHERE e.dept = r.dept AND e.idx = r.idx), '-') || ')' END AS employee,
       COUNT(*) AS active_accounts,
       group_concat(r.id, ' , ') AS account_ids
FROM res r
GROUP BY r.dept, COALESCE('#' || r.idx, 'k:' || r.ek)
HAVING COUNT(*) > 1
ORDER BY r.dept;
```
   - **صفرُ أسطر** ⇒ لا أثرَ لـR-26. **أسطرٌ** ⇒ لكلّ سجلٍّ يُعطَّل الحسابُ الزائد من الواجهة (مديرُ النظام ← الإدارات ← «حسابات الإدارة» ← إيقاف) قبل النشر أو بعده مباشرة؛ ولا تعديلَ يدويّ في D1.
5. **عدّادُ ما قبل الترحيل (للمقارنة في §4) — وفحصُ N2:** `SELECT (SELECT COUNT(*) FROM audit) AS audit_rows, (SELECT COUNT(*) FROM aud WHERE cid LIKE 'legacy_%') AS imported, (SELECT v FROM meta WHERE k = 'aud_mig') AS aud_mig;` (SELECT وحده على `bassam-db` من D1 Console، أو `npx wrangler d1 execute bassam-db --remote --command "<الاستعلام>"`). يُسجَّل `audit_rows` في سجلّ النشر:
   - **أقلُّ من 1,000,000** ⇒ أثرُ N2 مستبعَد؛ يُتابَع بالإحماء المعتاد (§3 بند 4).
   - **1,000,000 فأكثر** ⇒ يُعرض على المالك قبل النشر: النشرُ في أهدأ نافذة (خارج الدوام — بلا مستخدمين نشطين) والإحماءُ بطلبٍ واحدٍ ثم الانتظارُ حتى يكتمل قبل أيّ استعمال، مع قبول رشقةٍ قصيرة من 500 تزول وحدها. لا تعديلَ في `audit` ولا حذف.
6. **صفوفُ المهام وربطُها (اختياريّ):** الاستعلاماتُ الثلاثة في `tools/hotfix242_sr2/legacy_rows_count.sql` (المسندةُ بالاسم أو برقم هويةٍ مشترك · الحساباتُ غيرُ المرتبطة · المتأخّرات) — والحساباتُ المربوطةُ برقم الهوية هي R-20.
7. **أعمدةُ `dev/city` (فحصُ N4 · SELECT وحده):** `SELECT name FROM pragma_table_info('sess') WHERE name IN ('dev','city') UNION ALL SELECT name FROM pragma_table_info('audit') WHERE name IN ('dev','city');` ⇒ أربعةُ أسطر (المتوقَّع لقاعدة 242) ⇒ N4 لا ينطبق. أقلُّ من أربعة ⇒ لا شيءَ يُصلَح يدوياً؛ النشرُ بالإحماء بطلبٍ واحد (§3 بند 4) يُجري `ALTER` مرّةً بلا تسابق.

## 3) النشر (المالك بنفسه)
> لا خطوةَ من هذا القسم قبل «نعم» صريحةٍ من المالك على هذا النشر بعينه (§0). **النافذة (N2):** وقتٌ هادئٌ خارج الدوام بلا مستخدمين نشطين — ويُثبَّت الوقتُ في سجلّ النشر.

1. على جهاز المالك: `sha256sum KIVO_265_Production_upload.zip` (أو `certutil -hashfile … SHA256`) = السطرُ نفسُه في `SHA256SUMS.txt` المسلَّم = ``f4bbe2e015dba9bd7225b29dc169d0e6fff7d014d7be4c562e0de106ed3234d5`` — وإلا توقّف. ومعه: MANIFEST `pk265.prod` المسلَّم = `2ecaf62b1ce54feb` (الجدولُ أعلاه). (`prod_strip --check` أُجري قبل التسليم: «0 مخالفة».)
2. Cloudflare ← Workers & Pages ← المشروع `0` ← Deployments ← Create deployment ← **Production (main)** — النموذجُ يبدأ على Production افتراضياً، فيُتأكَّد من البيئة قبل الإسقاط ← إسقاط **`KIVO_265_Production_upload.zip`** ← Save and deploy.
3. **لا يُرفع** `KIVO_265_Preview_upload.zip` (يحمل أداةَ الاختبار) ولا `KIVO_265_dist_Candidate.zip` (أرشيفٌ تحت `dist/`) إلى Production أبداً. **ولا تُضاف** متغيّراتُ بيئة.
4. **الإحماءُ بطلبٍ واحد (N2 · N1 · N4) — قبل أيّ استعمال:** فورَ اكتمال النشر يُرسَل طلبٌ واحدٌ فقط وينتظَر ردُّه: `curl -sS -m 60 https://<نطاقُ Production>/api/brand` (أو فتحُ `/api/brand` في تبويبٍ واحد) ⇒ `ver = 2026.10.14-165`. هذا الطلبُ يُجري الترحيلاتِ 0001…0003 وحده بلا تسابق. **إن ردّ 500 (`worker-error`)**: انتظارُ 30 ث ثم طلبٌ واحدٌ آخر — التهيئةُ تُستأنف في كل طلب؛ و500 متكرّرةٌ أكثرَ من دقيقتين ⇒ قراءةُ Workers Logs (`db-init-timeout 8000ms` أو رسالةُ SQLite) ثم الرجوعُ (§5) بقرار المالك. لا يُعلَن للمستخدمين ولا تُفتح الواجهةُ قبل 200.
5. يُسجَّل معرّفُ النشر الجديد ووقتُه ووقتُ ردّ الإحماء؛ والنشرُ السابق `c378cd7e` هدفُ الرجوع.

## 4) بعد النشر — تحقّقٌ قرائيّ (خلال 10 دقائق)
- **بلا جلسة:** `GET /api/brand` ⇒ `ver = 2026.10.14-165` **بلا `hf`** (متوقَّع: `hf` هويةُ حزمة الإصلاح وحدها — سكربتاتُ المراقبة التي تنتظره تُحدَّث) · `GET /api/me/tasks` و`GET /api/get` ⇒ 401 · `POST /api/authz-test` ⇒ ليس 200 (الأداةُ منزوعة — ADR-036).
- **بجلسة مدير النظام:** `GET /api/ping` ⇒ `schema = schemaDb = 3` و**`schemaOk = 1` و`ready = 1`** و`users/rev/sess` كما قبل النشر.
  - **فحصُ N3 — إن جاء `schemaOk = 0` / `ready = 0` و`schemaDb` = `1` أو `2`:** لا رجوعَ ولا إعادةَ نشر؛ أوّلاً قراءةٌ وحدها: `SELECT COUNT(*) AS n FROM d1_migrations;` و`SELECT name FROM d1_migrations ORDER BY id;`
    - **3 أسطر (0001…0003)** ⇒ الترحيلاتُ كاملةٌ والختمُ وحده متأخّر (متسابقٌ قطعته المهلة بعد غيره). العلاجُ كتابةٌ واحدة **بموافقة المالك الصريحة («نعم») وعلى Preview أولاً** بالحالة نفسِها: `UPDATE meta SET v = '3' WHERE k = 'schema_version';` ثم `/api/ping` ⇒ `schemaOk = 1` · `ready = 1` · ويُسجَّل في سجلّ النشر.
    - **أقلُّ من 3** ⇒ الترحيلُ لم يكتمل: طلبٌ واحدٌ آخر (`/api/brand`) يستأنفه، ثم يُعاد الفحص؛ وإن بقي ⇒ Workers Logs ثم الرجوعُ (§5) بقرار المالك. لا `UPDATE` يدويّ في هذه الحالة.
- **D1 Console (SELECT):** `SELECT name, applied_at FROM d1_migrations ORDER BY id;` ⇒ ثلاثةُ أسطر 0001…0003 · `SELECT k, v FROM meta WHERE k IN ('schema_version', 'aud_mig');` ⇒ `3` و`1` · عدّادُ §2 بند 5 ⇒ `imported = audit_rows` (ولا زيادةَ غيرُ ذلك) · استعلامُ §2 بند 4 ⇒ صفرُ أسطر أو المعروفةُ وحدها.
- **Workers Logs:** سطرُ `schema-migrate` واحدٌ من طلب الإحماء عادةً — **وأكثرُ من سطرٍ مقبول** (N1: كلُّ طلبٍ متزامن قبل أوّل نجاحٍ يُجري التهيئة؛ آمنٌ للبيانات · `INSERT OR IGNORE`) · `worker-error` / `db-init-timeout 8000ms`: مقبولٌ رشقةً قصيرةً في الدقيقة الأولى تزول وحدها (N2) — أمّا استمرارُها بعد دقيقتين أو ظهورُها بعد `ready = 1` فإيقافٌ وقرارُ رجوع (§5) · لا `ph-redacted` في الاستعمال الطبيعي.
- **وظيفيّاً بحساباتٍ حقيقية (قراءةٌ وأفعالٌ عادية بأيدي أصحابها):** الدخولُ لكل دور (مديرُ النظام · مديرُ إدارة · موظف) · «ملفي» بتبويباتها الأربعة · «مهامي» للموظف وصورُ إثباته · صفحةُ «المهام» للمدير · الكونسول بلا أخطاء · `GET /api/tasks/linkage?dept=<d>` لعدّ «غير المرتبطة» (R-4).
- **بعدها:** تدويرُ كلمات مرور مديري الإدارات والعموم إن لم يُنفَّذ بعد SR-1 (`reports/k264/decisions.md` ج-3) — بيد المالك. وتُسجَّل النتائجُ في `reports/k265/production/post_<التاريخ>.json`.

## 5) الرجوع
- **الكود (المالك):** Deployments ← **`c378cd7e`** ← Rollback (يبقى هدفَ الرجوع الوحيد — مع العلم أنّ عاملَ خطّ 242 يحمل نمطَ وعد التهيئة المشترك الذي أصلحه k265-init: `k242/src/root/_worker.js` `_init` — فحادثةُ 2026-10-15 ممكنةُ التكرار بعد الرجوع؛ `reports/k265/incident_prod_2026-10-15.md`). **لا `152c5dfb` أبداً**: هو KIVO_242 بلا AUD-033c وSR-1 وSR-2.3 — يعيد إرسالَ بصمات كلمات المرور والرقم الوظيفي لكل جلسة وفقدَ الإثبات (RC-12). زرُّ Rollback لنشرات Production وحدها، و**لم يُجرَّب قطّ في هذا المشروع** (SOT-162).
- **المخطّط:** متوافقٌ للخلف — 0001…0003 إضافيةٌ كلُّها، وعاملُ SR-2.3 لا يقرأ `d1_migrations` ولا `schema_version` ولا جداولَ الإنفاذ. لا شيءَ يُحذف من القاعدة عند الرجوع.
- **البيانات المكتوبة على 265 تبقى صالحةً لـSR-2.3** (لا ترحيل) — لكن بأثرٍ معلَن (R-18 · **R-28**):
  - العمودُ 23 (`x`) يُتجاهل: **المُلغاةُ تعود مفتوحة** · **الأصلُ المُعاد إسنادُه يعود نشطاً** بجانب نسخته · «بانتظار المراجعة» تظهر «جارية» ويُنهيها الموظفُ بلا مراجِع · التكرارُ يتوقف (نسخُه المولَّدة صفوفٌ عادية).
  - **صفحةُ «المهام» في SR-2.3 تُسقط `x` صامتاً** من كلّ صفٍّ تعدّله (تحفظ 20 و21 وحدهما · ولا حارسَ H-1 في عاملها) — فلا يعود إن أُعيد النشرُ على 265.
  - إضافاتُ 20 (`ack` · `stall`) و21 (`st` · `sub` · `draft` · `h`) تُتجاهل؛ والصورُ والملاحظةُ تُعرض كما كانت.
  - حارسُ الحسابات المكرّرة (R-24) غيرُ موجودٍ في SR-2.3: لا تُنشأ حساباتٌ ولا تُربط في فترة الرجوع إلا للضرورة.
  - **قبل الرجوع (إن أمكن):** عدُّ المُلغاة والمُعاد إسنادُها والمعلّقة للمراجعة من صفحة «المهام» و`/api/tasks/linkage`، وإبلاغُ المسؤولين بحذف ما يظهر من المُلغاة أو تجاهلِه، وألّا يعدّلوا المهامَ ذاتَ الإعدادات المتقدمة حتى العودة (`reports/k264/tasks/COMPAT_MIGRATION.md` §7).
- **استرجاعُ D1 (Time Travel) — بموافقة المالك الصريحة («نعم») وحدها، وعند ثبوت تلفٍ في البيانات لا عند عطلٍ في الكود:** `npx wrangler d1 time-travel restore bassam-db --bookmark=<مرجعُ §2 بند 1>`. **هدّام:** يكتب فوق القاعدة كلِّها ويُسقط كلَّ ما كُتب بعد المرجع — ومنه عملُ المستخدمين المشروع منذ النشر — ويقطع الطلباتِ الجارية. يطبع مرجعاً سابقاً يُتراجَع به عن الاسترجاع نفسِه. الترتيب: رجوعُ الكود أولاً، ثم الاسترجاعُ إن لزم.

## 6) بعد الإصدار
وسمُ git `KIVO_265` · CHANGELOG بتاريخ النشر الإنتاجي وبصماته · SOT-191/192 · `STATE.md` · إبقاءُ الفرع `k265-tasks` وحزمة SR-2.3 المبنية مصدراً لنشر `c378cd7e` (R-29) · هذا الدليلُ يُحدَّث بما جرى فعلاً.
