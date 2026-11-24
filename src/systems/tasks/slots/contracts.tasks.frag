    {
      "path": "/api/me/tasks",
      "methods": [
        "GET"
      ],
      "access": "session",
      "query": {
        "ym": "Y-M (اختياري — شهرُ «سجل مهامك»)",
        "since": "rev (اختياري — ردٌّ رخيص {same:1} إن لم يتغيّر مخزنُ المهام)",
        "uid?": "string — KIVO_264 · C1 للقراءة: هويةُ التبويب (BOOT.uid)"
      },
      "responses": {
        "200": {
          "keys": [
            "ok",
            "now",
            "me",
            "rev"
          ],
          "full_keys": [
            "n",
            "more",
            "months",
            "rows"
          ],
          "note": "KIVO_264 · KIVO-Tasks P0: صفوفُ المتصل وحده (العمود 14 = مفتاحُه الثابت eid، ورقمُ الهوية nid للحسابات القديمة قراءةً — والمعرّفُ يحمله سجلٌّ واحدٌ وحده في الإدارة: SR-2.2 · F-1) في إدارته — بلا task.view ولا صفوفِ زملاء؛ me.linked=false لحسابٍ بلا سجلّ موظف (أو بمعرّفٍ مكرَّر)؛ me.off=1 وrows فارغة حين لا تكون صفحةُ المهام مفعّلةً لإدارته أو تُطفأ للمنصة (F-7)"
        },
        "400": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "bad-ym"
        },
        "405": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "409": {
          "keys": [
            "ok",
            "err"
          ],
          "err": "session-changed",
          "note": "KIVO_264 · C1: uid يخالف صاحبَ الجلسة"
        }
      }
    },
    {
      "path": "/api/me/tasks/act",
      "methods": [
        "POST"
      ],
      "access": "session",
      "request": {
        "k": "Y-M-D (يومُ الصفّ)",
        "id": "number | string ≤ 40 (العمود 13 — هويةُ الصفّ)",
        "i": "int ≥ 0 (تلميحُ الموضع — اختياري)",
        "act": "ack (تأكيدُ الاستلام) | start (البدء — accept اسمُه القديم) | decline (اعتذار) | stall (تعثّر) | resume (استئناف) | doc (توثيقٌ مسودّة) | submit (تسليم — finish اسمُه القديم) | expire",
        "why": "string ≤ 200 (إلزاميٌّ للاعتذار والتعثّر)",
        "note": "string ≤ 1000 (doc · submit)",
        "imgs": "≤ 4 معرّفات img_tsk… مرفوعةٌ لي — تُضاف إلى المحفوظ (≤ 12 للمهمة)",
        "steps": "{خطوة: true|false} — من خطوات سياسة المهمة وحدها (≤ 12)",
        "rm": "[img_tsk…] تُحذف من المسودّة — صورُ التسليم السابق لا تُحذف (img-locked)",
        "meta?": "[{img?, at, lat?, lng?, acc?}] ≤ 4 — KIVO_265 · البند 18: البياناتُ الوصفية لختم الصورة (وقتُ الالتقاط · الإحداثيات أو null «بلا موقع») لكل صورةٍ جديدة بترتيبها — تُحفظ في r21.meta ويعيدها GET /api/me/tasks في proof.meta",
        "idem?": "string 6–40 [A-Za-z0-9_-] — مفتاح عدم التكرار لطلب الصفحة؛ تبقى المسودة والمفتاح في ذاكرة الصفحة عند غموض الإقرار لإعادة المحاولة الصريحة، دون طابور جهاز أو إرسال عند عودة الاتصال؛ فعل كُتب بالمفتاح نفسه ⇒ 200 noop:1 (لا كتابة ولا تنبيه) بدل 409 state — آخر 8 مفاتيح في r20.q",
        "uid?": "string — KIVO_264 · C1: هويةُ التبويب (BOOT.uid) — يخالف صاحبَ الجلسة ⇒ 409 session-changed قبل أيّ قراءةٍ أو كتابة"
      },
      "responses": {
        "200": {
          "keys": [
            "ok",
            "rev",
            "row"
          ],
          "note": "يمرّ بالحفظ المركزي applySave: selfTaskOnly (legacy) · self.task.respond بنطاق Own (enforce) — أعمدةُ الذات وحدها (3·6·11·12·20·21) + حدثُ تدقيق etype=task؛ noop:1 لتأكيدٍ مكرَّر ولانقضاءٍ مضى على نهايته أكثرُ من 48 ساعة (F-3 — بلا كتابة). التسليمُ بلا مراجِع ⇒ done، ومع مراجِعٍ ⇒ بانتظار المراجعة (ق3)"
        },
        "400": {
          "keys": [
            "ok",
            "err",
            "at"
          ],
          "err": "bad-body",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/me/tasks/act",
          "note": "bad-body (at) · proof (msg — سياسةُ الإثبات ق2 · خطواتُ العمل) · imgs"
        },
        "403": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "not-linked · denied (why) · origin · off (F-7: صفحةُ المهام غيرُ مفعّلةٍ لإدارته)"
        },
        "404": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "not-found — ليس صفّاً مسنَداً إليك (لا كشفَ لوجوده)"
        },
        "405": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "409": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "state (ph) · locked · identity · img · img-locked · expired (ق6 — يمدّدها المسؤول) · policy (لا اعتذار) · busy · session-changed (C1)"
        },
        "413": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "429": {
          "keys": [
            "ok",
            "err",
            "retry"
          ]
        }
      }
    },
    {
      "path": "/api/me/tasks/img",
      "methods": [
        "GET"
      ],
      "access": "session",
      "query": {
        "id": "img_tsk… مذكورٌ في صفٍّ مسنَدٍ إليك",
        "uid?": "string — KIVO_264 · C1 للقراءة: هويةُ التبويب (BOOT.uid)"
      },
      "responses": {
        "200": {
          "GET": "جسمُ الصورة (data:image/…;base64) — claim لك أو bound لمخزن مهام إدارتك"
        },
        "400": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "bad-id"
        },
        "403": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "forbidden · off (F-7)"
        },
        "405": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "409": {
          "keys": [
            "ok",
            "err"
          ],
          "err": "session-changed",
          "note": "KIVO_264 · C1: uid يخالف صاحبَ الجلسة"
        }
      }
    },
    {
      "path": "/api/me/tasks/log",
      "methods": [
        "GET"
      ],
      "access": "session",
      "query": {
        "k": "Y-M-D (يومُ الصفّ)",
        "id": "هويةُ الصفّ (العمود 13)",
        "uid?": "string — KIVO_264 · C1 للقراءة: هويةُ التبويب (BOOT.uid)"
      },
      "responses": {
        "200": {
          "keys": [
            "ok",
            "k",
            "id",
            "events"
          ],
          "note": "KIVO_264 · المرحلة الثانية: سجلُّ مهمتي — أحداثُ تدقيق etype=task لصفّي وحده (هويةُ الكيان في العمود 22) {at, act, txt, by (أنت | اسمُ المسؤول — بلا معرّفات), why}؛ وطوابعُ الصفّ القديم موسومةٌ src:row"
        },
        "400": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "bad-query"
        },
        "403": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "not-linked · off (F-7)"
        },
        "404": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "not-found — ليس صفّاً مسنَداً إليك"
        },
        "405": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "409": {
          "keys": [
            "ok",
            "err"
          ],
          "err": "session-changed",
          "note": "KIVO_264 · C1: uid يخالف صاحبَ الجلسة"
        }
      }
    },
    {
      "path": "/api/tasks/create",
      "methods": [
        "POST"
      ],
      "access": "actor",
      "request": {
        "dept": "معرّفُ الإدارة (اختياري — الافتراضيّ إدارتُك؛ ضمن نطاقك)",
        "k": "Y-M-D يومُ المهمة (= يومُ بدايتها ±1)",
        "t": "string ≤ 300",
        "desc": "string ≤ 4000",
        "prio": "low | normal | high | urgent",
        "s": "ms بدايةُ التنفيذ",
        "e": "ms المهلة (> s · ≤ 14 يوماً)",
        "asg": "[eid] ≤ 50 — المعرّفُ الثابت وحده (لا اسم) · أو shift بدله (KIVO_265 · البند 12)",
        "shift": "KIVO_265 · البند 12: {name: اسمُ الوردية ≤ 80} بدل asg (لا كليهما ⇒ 400 at:asg) — الورديةُ كيانٌ: مكلَّفوها يومَ k من الجدول الشهري لشهره (صفُّ الموظف shift) ∪ كشفُ الوردية في تقرير اليوم المسحوب، بسياق الأهلية نفسِه (072 tkShiftAsg)؛ صفٌّ لكل مكلَّف بالقواعد نفسِها (الأهلية · force لغير المتاح · grp واحد بوسم «<الوردية> كاملة» · تنبيه task_new) بسقف 500 صفّ — والمتخطَّون بأسبابهم في skipped (بلا حسابٍ نشط · بلا معرّفٍ فريد · المراجِعُ نفسُه · ما بعد السقف) لا 409 كالقائمة",
        "grpL": "string ≤ 120 (جماعية)",
        "wt": "string ≤ 80 (بلا مكلَّف)",
        "dec": "0 | 1 (السماحُ بالاعتذار — 1 افتراضاً)",
        "pol": "{m: any | img | note | both | none, n: 1…4, steps: [≤ 12]} — ق2: الافتراضيّ any «صورة أو ملاحظة»",
        "win": "KIVO_265 · نافذةُ التنفيذ (قرارُ المالك 2026-10-19): {early: دقائقُ البدء قبل الموعد 0–240 (0 = لا بدءَ قبل الموعد) · late: ساعاتُ التسليم بعد المهلة 0–24 (0 = لا تسليمَ بعدها)} — الافتراضيُّ بلا win: early 0 · late 2 · القبولُ (ack) حرٌّ · الأداءُ من المهلة",
        "rv": "creator | none | {u} — ق3: الافتراضيّ منشئُ المهمة",
        "needs": "[مفتاحُ صلاحيةٍ من سجلّ v24.9] ≤ 8 (أهليةُ «الصلاحية»)",
        "rec": "{t: daily | weekly | monthly | every (days اسمٌ قديمٌ لـweekly), wd: [0…6] (للأسبوعي — الأحد 0 · 1…7 أيام), md: 1…30 | 'last' (للشهري — يومُ الشهر الهجري؛ شهرٌ بلا يومِه لا نسخةَ فيه · 'last' آخرُ يومٍ في الشهر 29 أو 30 لا يُتخطّى — KIVO_265 · البند 16), n: 2…30 (لـevery — كل n يوماً من يوم البدء بعدّ الأيام المدنية · خارج المدى 400 at:rec.n — البند 16), to?: Y-M-D (≥ k · ≤ ثلاث سنواتٍ هجرية), open?: 1 («حتى الإيقاف» — لا to مخزَّنة؛ لا تُجمع مع to)} — بلا to ولا open ⇒ سنةٌ هجرية · ق5: يُولَّد في الخادم بلا Cron · KIVO_265 · srvrec: المتكررةُ تحتاج مكلَّفاً (400 rec-asg)",
        "force": "true — إنشاءٌ رغم «غير متاح» بعد كشفه (409 elig) — لا يتجاوز «بلا حسابِ مستخدمٍ نشط» (409 acct · KIVO_265 البند 4)",
        "uid?": "string — KIVO_264 · C1: هويةُ التبويب (BOOT.uid) — يخالف صاحبَ الجلسة ⇒ 409 session-changed قبل أيّ قراءةٍ أو كتابة",
        "requestId": "معرّف طلب ثابت 8–100 حرف؛ إعادة الطلب نفسه تعيد الإقرار المحفوظ دون تكرار الكتابة",
        "epoch": "عدد صحيح؛ حقبة الاستعادة المؤكدة",
        "base": "اختياري؛ الإنشاء append إلى المصدر الحديث على الخادم، ولا يقارن مراجعة العميل. CAS ذرّي على المصدر الحديث يبقى إلزاميًا؛ لا استبدال وثيقة عميل."
      },
      "responses": {
        "200": {
          "keys": [
            "ok",
            "rev",
            "rows",
            "elig",
            "skipped"
          ],
          "note": "task.create (+ task.assign مع مكلَّفين) — tkHeld: enforce ⇒ enfHeld · legacy ⇒ السجل v24.9؛ صفوفٌ بهويةٍ فريدة في 13 وطابعٍ في 22 وx في 23 عبر applySave (CAS · تدقيق created) + تنبيهُ task_new من الخادم · skipped (KIVO_265 · البند 12): [{ekey, name, why, code}] من تخطّاه الإسنادُ بالوردية (فارغةٌ للقائمة)"
        },
        "400": {
          "keys": [
            "ok",
            "err",
            "at"
          ],
          "err": "bad-body",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/tasks/create",
          "note": "bad-body (at — ومنه rec.t · rec.n · rec.wd · rec.md · rec.to · rec.open ومفتاحٌ زائد في rec: مخطّطُ rec نفسُه في /api/tasks/recur — S7 · shift بلا اسم · asg مع shift) · asg (معرّفٌ مجهول) · shift at:shift (لا موظفَ في الوردية يومَها — البند 12) · rec-asg at:rec (متكررةٌ بلا مكلَّف — KIVO_265 · srvrec · S10)"
        },
        "403": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "denied (صلاحيةُ المهام) · forbidden (إدارةٌ خارج نطاقك)"
        },
        "404": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "not-found"
        },
        "405": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "409": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "acct (items — مكلَّفٌ بلا حسابِ مستخدمٍ نشط: بلا حساب أو معطَّل — قاطعٌ ولو بـforce · KIVO_265 البند 4؛ وبالوردية: لا مكلَّفَ يمكن إسنادُه بعد التخطّي — items · skipped) · elig (items — «غير متاح» يحتاج force؛ وبالوردية skipped معها) · locked (شهرٌ معتمد) · busy · session-changed (C1)"
        },
        "413": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "429": {
          "keys": [
            "ok",
            "err",
            "retry"
          ]
        }
      }
    },
    {
      "path": "/api/tasks/review",
      "methods": [
        "POST"
      ],
      "access": "actor",
      "request": {
        "dept": "معرّفُ الإدارة (اختياري — الافتراضيّ إدارتُك؛ ضمن نطاقك)",
        "k": "Y-M-D",
        "id": "العمود 13",
        "ekey": "eid المكلَّف",
        "decision": "approve | return",
        "why": "string ≤ 200 (إلزاميٌّ للإعادة — يصل الموظفَ نصُّه)",
        "uid?": "string — KIVO_264 · C1: هويةُ التبويب (BOOT.uid) — يخالف صاحبَ الجلسة ⇒ 409 session-changed قبل أيّ قراءةٍ أو كتابة"
      },
      "responses": {
        "200": {
          "keys": [
            "ok",
            "rev",
            "st"
          ],
          "note": "ق3: المراجِعُ المسمّى في المهمة أو مديرُ إدارتها أو مديرُ النظام — للتسليم الحاليّ وحده (x.rev.sub = r21.sub)؛ الاعتمادُ ⇒ done · الإعادةُ ⇒ «أُعيدت للاستكمال» + تنبيه"
        },
        "400": {
          "keys": [
            "ok",
            "err",
            "at"
          ],
          "err": "bad-body",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/tasks/review",
          "note": "bad-body (at)"
        },
        "403": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "not-reviewer · forbidden"
        },
        "404": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "not-found"
        },
        "405": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "409": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "state (لا تسليمَ بانتظار المراجعة) · locked · busy · session-changed (C1)"
        },
        "413": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "429": {
          "keys": [
            "ok",
            "err",
            "retry"
          ]
        }
      }
    },
    {
      "path": "/api/tasks/extend",
      "methods": [
        "POST"
      ],
      "access": "actor",
      "request": {
        "dept": "معرّفُ الإدارة (اختياري — الافتراضيّ إدارتُك؛ ضمن نطاقك)",
        "k": "Y-M-D",
        "id": "العمود 13",
        "ekey": "eid (اختياري)",
        "e": "ms المهلةُ الجديدة (مستقبلٌ · بعد البداية · ≤ 30 يوماً)",
        "why": "string ≤ 200",
        "uid?": "string — KIVO_264 · C1: هويةُ التبويب (BOOT.uid) — يخالف صاحبَ الجلسة ⇒ 409 session-changed قبل أيّ قراءةٍ أو كتابة"
      },
      "responses": {
        "200": {
          "keys": [
            "ok",
            "rev",
            "e"
          ],
          "note": "ق6: task.edit — لا بدءَ بعد المهلة إلا بتمديدٍ من المسؤول؛ يُمسح علَمُ «انقضت» ويُسجَّل x.ext"
        },
        "400": {
          "keys": [
            "ok",
            "err",
            "at"
          ],
          "err": "bad-body",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/tasks/extend",
          "note": "bad-body (at)"
        },
        "403": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "denied (صلاحيةُ المهام) · forbidden (إدارةٌ خارج نطاقك)"
        },
        "404": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "not-found"
        },
        "405": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "409": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "state · locked (شهرٌ معتمد) · busy · session-changed (C1)"
        },
        "413": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "429": {
          "keys": [
            "ok",
            "err",
            "retry"
          ]
        }
      }
    },
    {
      "path": "/api/tasks/reassign",
      "methods": [
        "POST"
      ],
      "access": "actor",
      "request": {
        "dept": "معرّفُ الإدارة (اختياري — الافتراضيّ إدارتُك؛ ضمن نطاقك)",
        "k": "Y-M-D",
        "id": "العمود 13",
        "from": "eid المكلَّف الحاليّ",
        "to": "eid الجديد",
        "why": "string ≤ 200",
        "e": "ms مهلةٌ جديدة (اختياري)",
        "force": "true رغم «غير متاح» — لا يتجاوز «بلا حسابِ مستخدمٍ نشط» (409 acct)",
        "uid?": "string — KIVO_264 · C1: هويةُ التبويب (BOOT.uid) — يخالف صاحبَ الجلسة ⇒ 409 session-changed قبل أيّ قراءةٍ أو كتابة"
      },
      "responses": {
        "200": {
          "keys": [
            "ok",
            "rev",
            "row",
            "elig"
          ],
          "note": "task.assign — صفٌّ جديد للمكلَّف الجديد (x.from) والقديمُ «أُعيد إسنادها» يبقى في سجلّه"
        },
        "400": {
          "keys": [
            "ok",
            "err",
            "at"
          ],
          "err": "bad-body",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/tasks/reassign",
          "note": "bad-body (at) · to: المراجِعُ المسمّى لا يكون المكلَّفَ (KIVO_265 · R-7)"
        },
        "403": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "denied (صلاحيةُ المهام) · forbidden (إدارةٌ خارج نطاقك)"
        },
        "404": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "not-found"
        },
        "405": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "409": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "acct (المكلَّفُ الجديد بلا حسابِ مستخدمٍ نشط — قاطعٌ ولو بـforce · KIVO_265 البند 4) · state · dup · elig · locked · busy · session-changed (C1)"
        },
        "413": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "429": {
          "keys": [
            "ok",
            "err",
            "retry"
          ]
        }
      }
    },
    {
      "path": "/api/tasks/cancel",
      "methods": [
        "POST"
      ],
      "access": "actor",
      "request": {
        "dept": "معرّفُ الإدارة (اختياري — الافتراضيّ إدارتُك؛ ضمن نطاقك)",
        "k": "Y-M-D",
        "id": "العمود 13",
        "ekey": "eid (اختياري — يلزم لمجموعةٍ تتشارك الهوية)",
        "why": "string ≤ 200 (اختياري — V7 · 53 REVIEW ١١-أ: يُحفظ إن كُتب)",
        "uid?": "string — KIVO_264 · C1: هويةُ التبويب (BOOT.uid) — يخالف صاحبَ الجلسة ⇒ 409 session-changed قبل أيّ قراءةٍ أو كتابة"
      },
      "responses": {
        "200": {
          "keys": [
            "ok",
            "rev"
          ],
          "note": "task.delete أو task.edit — إلغاءٌ منطقيّ يبقى في السجل (لا حذف) · السببُ اختياريّ"
        },
        "400": {
          "keys": [
            "ok",
            "err",
            "at"
          ],
          "err": "bad-body",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/tasks/cancel",
          "note": "bad-body (at)"
        },
        "403": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "denied (صلاحيةُ المهام) · forbidden (إدارةٌ خارج نطاقك)"
        },
        "404": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "not-found"
        },
        "405": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "409": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "state · locked (شهرٌ معتمد) · busy · session-changed (C1)"
        },
        "413": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "429": {
          "keys": [
            "ok",
            "err",
            "retry"
          ]
        }
      }
    },
    {
      "path": "/api/tasks/relink",
      "methods": [
        "POST"
      ],
      "access": "actor",
      "request": {
        "dept": "معرّفُ الإدارة (اختياري — الافتراضيّ إدارتُك؛ ضمن نطاقك)",
        "k": "Y-M-D",
        "id": "العمود 13",
        "from": "قيمةُ العمود 14 الحالية (اسمٌ/رقمُ هوية — ≤ 160)",
        "to": "eid من سجلّ الإدارة",
        "uid?": "string — KIVO_264 · C1: هويةُ التبويب (BOOT.uid) — يخالف صاحبَ الجلسة ⇒ 409 session-changed قبل أيّ قراءةٍ أو كتابة"
      },
      "responses": {
        "200": {
          "keys": [
            "ok",
            "rev",
            "row"
          ],
          "note": "ق4: ربطٌ يدويّ لصفٍّ قديمٍ «غير مرتبط» (لا إعادةَ كتابةٍ تلقائية) — x.relink يحفظ القيمةَ السابقة"
        },
        "400": {
          "keys": [
            "ok",
            "err",
            "at"
          ],
          "err": "bad-body",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/tasks/relink",
          "note": "bad-body (at)"
        },
        "403": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "denied (صلاحيةُ المهام) · forbidden (إدارةٌ خارج نطاقك)"
        },
        "404": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "not-found"
        },
        "405": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "409": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "linked (مرتبطٌ بمعرّفٍ ثابت · برقم هويةِ غيره · فيه نشاطٌ أو أُغلق ويُربط بغير صاحب رمزه — KIVO_265 · R-6) · acct (مفتوحةٌ لمن بلا حسابِ مستخدمٍ نشط — البند 4) · state · locked (شهرٌ معتمد) · busy · session-changed (C1)"
        },
        "413": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "429": {
          "keys": [
            "ok",
            "err",
            "retry"
          ]
        }
      }
    },
    {
      "path": "/api/tasks/settings",
      "methods": [
        "POST"
      ],
      "access": "actor",
      "request": {
        "dept": "معرّفُ الإدارة (اختياري — الافتراضيّ إدارتُك؛ ضمن نطاقك)",
        "k": "Y-M-D",
        "id": "العمود 13 (أو grp)",
        "grp": "العمود 17 — صفوفُ المهمة الجماعية في يومها كلُّها (بدل id)",
        "ekey": "eid (اختياري)",
        "pol": "{m: any|img|note|both|none, n?, steps?[]} (اختياري)",
        "rv": "creator | none | {u} (اختياري)",
        "dec": "0|1 (اختياري)",
        "uid?": "string — KIVO_264 · C1: هويةُ التبويب (BOOT.uid) — يخالف صاحبَ الجلسة ⇒ 409 session-changed قبل أيّ قراءةٍ أو كتابة",
        "requestId": "معرّف طلب ثابت 8–100 حرف؛ إعادة الطلب نفسه تعيد الإقرار المحفوظ دون تكرار الكتابة",
        "epoch": "عدد صحيح؛ حقبة الاستعادة المؤكدة",
        "base": "عدد صحيح؛ مراجعة مورد المهام عند فتح المسودة",
        "edit": "اختياري: {k,t,desc,prio,s,e,ekey?,wt?} لتعديل الحقول الحالية؛ هوية المصدر k/id/ekey أو grp في الجذر",
        "recur": "اختياري: {op,id?,rec?,row?} من عقد التكرار القائم؛ يُنفذ مع edit/settings في معاملة واحدة",
        "why": "اختياري (V7 · د5-ح): سببُ نافذة 280 حين يطلب الإنفاذُ سبباً (task.reopen: إسنادُ المعتذَر عنها بالتعديل)"
      },
      "responses": {
        "200": {
          "keys": [
            "ok",
            "rev",
            "n"
          ],
          "note": "KIVO_265 · H-1: إعداداتُ المهمة في العمود 23 من الخادم وحده (task.edit) — والحفظُ الخامّ الذي يغيّر العمودَ 23 يُرفض task-x"
        },
        "400": {
          "keys": [
            "ok",
            "err",
            "at"
          ],
          "err": "bad-body",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/tasks/settings",
          "note": "bad-body (at) · rv (لا يملك الاعتماد · المكلَّفُ نفسُه)"
        },
        "403": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "denied (صلاحيةُ المهام) · forbidden (إدارةٌ خارج نطاقك)"
        },
        "404": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "not-found"
        },
        "405": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "409": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "state (ملغاة · أُعيد إسنادها) · locked · busy · session-changed (C1)"
        },
        "413": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "429": {
          "keys": [
            "ok",
            "err",
            "retry"
          ]
        }
      }
    },
    {
      "path": "/api/tasks/reopen",
      "methods": [
        "POST"
      ],
      "access": "actor",
      "request": {
        "dept": "معرّفُ الإدارة (اختياري — الافتراضيّ إدارتُك؛ ضمن نطاقك)",
        "k": "Y-M-D",
        "id": "العمود 13",
        "ekey": "eid (اختياري — يلزم لمجموعةٍ تتشارك الهوية)",
        "why": "string ≤ 200 (اختياري — يصل الموظفَ)",
        "uid?": "string — KIVO_264 · C1: هويةُ التبويب (BOOT.uid) — يخالف صاحبَ الجلسة ⇒ 409 session-changed قبل أيّ قراءةٍ أو كتابة"
      },
      "responses": {
        "200": {
          "keys": [
            "ok",
            "rev",
            "st"
          ],
          "note": "KIVO_265 · H-1: منجزة ⇒ جارية (الحفظُ المركزي يحكم: task.reopen في الإنفاذ) وقرارُ المراجعة «أُعيدت» في العمود 23 إن كان لها تسليمٌ ومراجِع — من الخادم وحده"
        },
        "400": {
          "keys": [
            "ok",
            "err",
            "at"
          ],
          "err": "bad-body",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/tasks/reopen",
          "note": "bad-body (at)"
        },
        "403": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "denied (صلاحيةُ المهام) · forbidden (إدارةٌ خارج نطاقك)"
        },
        "404": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "not-found"
        },
        "405": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "409": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "state (ليست منجزة · ملغاة · أُعيد إسنادها) · locked · busy · session-changed (C1)"
        },
        "413": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "429": {
          "keys": [
            "ok",
            "err",
            "retry"
          ]
        }
      }
    },
    {
      "path": "/api/tasks/recur",
      "methods": [
        "POST"
      ],
      "access": "actor",
      "request": {
        "dept": "معرّفُ الإدارة (اختياري — الافتراضيّ إدارتُك؛ ضمن نطاقك)",
        "op": "pause | resume | stop | edit | start",
        "id": "pause · resume · stop · edit: معرّفُ سلسلة التكرار (x.rec.id) — start: العمود 13 لمهمةٍ مسندةٍ لمرةٍ واحدة (number | string)",
        "k": "start: Y-M-D يومُ المهمة — stop (مع row): يومُ النسخة التي تبقى",
        "row?": "stop وحده: string ≤ 40 — العمود 13 لنسخةٍ من هذه السلسلة في اليوم k تبقى آخرَ موعدٍ لها فلا يُلغيها الإنهاء (KIVO_265 · U1 — نموذجُ «المهام»)؛ لغير stop ⇒ 400 at:row · بلا k صالح ⇒ 400 at:k",
        "grp": "start: العمود 17 — المهمةُ الجماعية بصفوفها في يومها (بدل id)",
        "rec": "edit · start (إلزامي): {t: daily | weekly | monthly | every (days = weekly), wd?: [0…6], md?: 1…30 | 'last', n?: 2…30, to?: Y-M-D, open?: 1} — قواعدُ الإنشاء نفسُها (KIVO_265 · البند 16: every بـn · md 'last')؛ edit: البدايةُ والمكلَّفون كما هم و«لا to ولا open» = النهايةُ كما هي · start: بلا to ولا open ⇒ سنةٌ هجرية كالإنشاء",
        "uid?": "string — KIVO_264 · C1: هويةُ التبويب (BOOT.uid) — يخالف صاحبَ الجلسة ⇒ 409 session-changed قبل أيّ قراءةٍ أو كتابة",
        "requestId": "معرّف طلب ثابت 8–100 حرف؛ إعادة الطلب نفسه تعيد الإقرار المحفوظ دون تكرار الكتابة",
        "epoch": "عدد صحيح؛ حقبة الاستعادة المؤكدة",
        "base": "عدد صحيح؛ مراجعة مورد المهام عند فتح المسودة"
      },
      "responses": {
        "200": {
          "keys": [
            "ok",
            "rev",
            "n"
          ],
          "ops_keys": [
            "ok",
            "rev",
            "n",
            "cancelled",
            "ver",
            "restored",
            "kept"
          ],
          "start_keys": [
            "ok",
            "rev",
            "n",
            "rec"
          ],
          "note": "KIVO_265 · srvrec — pause · resume · stop · edit (task.edit): القاعدةُ بإصدارٍ أعلى (ver = إصدارُ النموذج + 1) على نُسخ اليوم وما بعده في الأشهر المفتوحة وحدها، والنموذجُ يحملها دائماً — والسابقةُ وما في شهرٍ معتمدٍ وإثباتُها وسجلُّها لا تُمسّ · stop: rec.stop=1 والنهايةُ أقربُهما من نهايتها واليوم (لا تتقدّم) وتُلغى القادمةُ المعلّقة غيرُ المبدوءة («أُنهي التكرار») · edit: تُلغى القادمةُ المعلّقة غيرُ المبدوءة التي لم تعد موعداً أو بعد النهاية الجديدة («عُدّل التكرار») وحدثُ تدقيقٍ واحد rec_edit {rec, before, after}؛ والتوليدُ التالي يضيف الناقصَ وحده (idem) · start (task.create + task.edit + task.assign): x.rec {id, ver:1, from:k, asg: مكلَّفوها, by: أنت} وx.idem لكل صفّ وحدثُ rec_start — ثم يولِّدها الخادمُ كالمنشأة؛ rec في الردّ {id, ver, t, wd?, md?, n?, from, to?, paused, asg}",
          "srv2_note": "مراجعةُ الخادم (srv2): كلُّ نسخةٍ يلغيها stop أو edit لها حدثُ «أُلغيت» {day, via:srv, rec, why} على هويتها (S9 — بلا تنبيه) والحدثُ المجمَّع rec_<op> باقٍ · edit يعيد النسخةَ القادمة المعلّقة غيرَ المبدوءة التي ألغاها تعديلٌ سابق (x.can.rec) إن صارت موعداً — restored عددُها والإلغاءُ السابق في x.canh (S2؛ لا يعود إلغاءُ stop ولا المسؤول) · kept = 1 إن حدّد {k, row} نسخةً من السلسلة (U1) · سلسلةٌ لها حدثُ rec_stop من الخادم منتهية (S8) · التوليدُ يعيد الحكمَ على السلسلة الطازجة قبل الكتابة (S1)"
        },
        "400": {
          "keys": [
            "ok",
            "err",
            "at"
          ],
          "err": "bad-body",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/tasks/recur",
          "note": "bad-body (at: op · id · k · row · grp · rec · rec.t · rec.n · rec.wd · rec.md · rec.to · rec.open) · asg (start: مكلَّفٌ بلا معرّفٍ ثابتٍ فريد)"
        },
        "403": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "denied (صلاحيةُ المهام: task.edit · وللتحويل task.create وtask.edit وtask.assign) · forbidden (إدارةٌ خارج نطاقك)"
        },
        "404": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "not-found (السلسلة · المهمة)"
        },
        "405": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "409": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "rec-ended (السلسلةُ أُنهيت أو مضت نهايتُها: لا استئنافَ ولا إيقافَ ولا تعديلَ ولا إنهاءَ ثانٍ) · month-locked (نُسخُ السلسلة كلُّها في أشهرٍ معتمدة — لا نموذجَ يحمل القاعدة؛ لا تجاوزَ للقفل والرسالة: «كلُّ مواعيد هذه السلسلة في شهرٍ معتمد مقفل — يمكن إيقافها أو تعديلها عند ظهور موعدها القادم (قبل استحقاقه بشهر)، أو بعد فتح الشهر» — S3 · KIVO_265 · البند 15: الأفقُ 30 يوماً) · locked (start: شهرُ المهمة معتمد) · state (start: ملغاة · أُعيد إسنادُها · منفصلة · في سلسلةٍ أصلاً · صفٌّ من مجموعة بلا grp · غيرُ مسندة · بلا وقت) · dup · busy · session-changed (C1)"
        },
        "413": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "429": {
          "keys": [
            "ok",
            "err",
            "retry"
          ]
        }
      }
    },
    {
      "path": "/api/tasks/recur/run",
      "methods": [
        "POST"
      ],
      "access": "actor",
      "query": {
        "dept": "اختياري",
        "day": "Y-M-D — اليومُ الجاري وحده (اختياري)"
      },
      "request": {
        "dept": "معرّفُ الإدارة (اختياري — الافتراضيّ إدارتُك؛ ضمن نطاقك)",
        "uid?": "string — KIVO_264 · C1: هويةُ التبويب (BOOT.uid) — يخالف صاحبَ الجلسة ⇒ 409 session-changed قبل أيّ قراءةٍ أو كتابة"
      },
      "responses": {
        "200": {
          "keys": [
            "ok",
            "created",
            "skipped",
            "denied",
            "series",
            "due"
          ],
          "note": "due (KIVO_265 · البند 10): تقريرُ مسح التذكير والتصعيد {soon, late, exp, skipped, sent} (074 tkDueRun). ق5: توليدٌ متساوي القوى (مفتاحُ idem لكل يومٍ ومكلَّف — ولا تعود نسخةٌ حُذفت) · KIVO_265 · البند 15: الأفقُ 30 يوماً قادمة (كان 7 — Pages بلا Cron فالتوليدُ كسولٌ بأفقٍ أطول) بسقف 600 صفّ للتشغيل الواحد والباقي في التالي باسم صاحب القالب لا المستدعي (صاحبُ المحوَّلة من حوّلها: rec.by بحدث rec_start)؛ الموقوفةُ والمنتهية (stop) لا تُولَّد · وrec.to الغائبُ «حتى الإيقاف»؛ يُستدعى كسولاً من GET /api/me/tasks أيضاً · srv2: صاحبُ القالب بلا task.create وtask.assign معاً ⇒ denied (S4) · صاحبُه ونُسخُه المحذوفة من سجل الخادم وحده: cid tk… (S5) · الحكمُ على السلسلة الطازجة قبل الكتابة (S1) · الوردية الليلية في يومها التالي (S6)"
        },
        "400": {
          "keys": [
            "ok",
            "err",
            "at"
          ],
          "err": "bad-body",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/tasks/recur/run",
          "note": "bad-query (day)"
        },
        "403": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "forbidden"
        },
        "405": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "409": {
          "keys": [
            "ok",
            "err"
          ],
          "err": "session-changed",
          "note": "KIVO_264 · C1: uid يخالف صاحبَ الجلسة"
        },
        "413": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "429": {
          "keys": [
            "ok",
            "err",
            "retry"
          ]
        }
      }
    },
    {
      "path": "/api/tasks/group",
      "methods": [
        "GET"
      ],
      "access": "actor",
      "query": {
        "dept": "اختياري",
        "id": "معرّفُ المجموعة (العمود 17)",
        "k": "Y-M-D (اختياري)",
        "uid?": "string — KIVO_264 · C1 للقراءة: هويةُ التبويب (BOOT.uid)"
      },
      "responses": {
        "200": {
          "keys": [
            "ok",
            "id",
            "title",
            "label",
            "summary",
            "members"
          ],
          "note": "المهمةُ الجماعية: حالةُ كلِّ مكلَّف (asg · exe · rev) ونسبةُ الإنجاز — لقارئ مخزن المهام"
        },
        "400": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "bad-query"
        },
        "403": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "forbidden"
        },
        "405": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "409": {
          "keys": [
            "ok",
            "err"
          ],
          "err": "session-changed",
          "note": "KIVO_264 · C1: uid يخالف صاحبَ الجلسة"
        },
        "429": {
          "keys": [
            "ok",
            "err",
            "retry"
          ]
        }
      }
    },
    {
      "path": "/api/tasks/linkage",
      "methods": [
        "GET"
      ],
      "access": "actor",
      "query": {
        "dept": "اختياري",
        "ym": "Y-M (اختياري)",
        "uid?": "string — KIVO_264 · C1 للقراءة: هويةُ التبويب (BOOT.uid)"
      },
      "responses": {
        "200": {
          "keys": [
            "ok",
            "counts",
            "rows",
            "more"
          ],
          "note": "ق4: ربطُ الصفوف بسجلّ الموظفين وقتَ القراءة (eid · nid · ملتبس · اسمٌ «غير مرتبطة» · مجهول) — بلا كتابة"
        },
        "400": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "bad-ym"
        },
        "403": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "forbidden"
        },
        "405": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "409": {
          "keys": [
            "ok",
            "err"
          ],
          "err": "session-changed",
          "note": "KIVO_264 · C1: uid يخالف صاحبَ الجلسة"
        },
        "429": {
          "keys": [
            "ok",
            "err",
            "retry"
          ]
        }
      }
    },
    {
      "path": "/api/tasks/eligibility",
      "methods": [
        "GET"
      ],
      "access": "actor",
      "query": {
        "dept": "اختياري",
        "ekeys": "eid,eid,… ≤ 50",
        "s": "ms",
        "e": "ms (اختياري)",
        "needs": "مفاتيحُ صلاحيات مفصولةٌ بفواصل (اختياري)",
        "uid?": "string — KIVO_264 · C1 للقراءة: هويةُ التبويب (BOOT.uid)"
      },
      "responses": {
        "200": {
          "keys": [
            "ok",
            "s",
            "e",
            "items"
          ],
          "note": "الأهليةُ وقتَ التنفيذ من الجدول الشهري (الوردية · الراحة · الإجازة · الغياب · التعارض · الصلاحية): متاح | بانتظار التحقق | غير متاح — والتفصيلُ لقارئ الجدول وحده · KIVO_265 البند 4: بلا حسابِ مستخدمٍ نشط (بقاعدة «ملفي») ⇒ «غير متاح» قاطع: code no_acct | acct_disabled | acct_nid (حسابُه برقم الهوية — يرى ولا ينفّذ · R-3) · hard:1 · acct:0 — والسببُ لكل مَن يفحص الأهلية"
        },
        "400": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "bad-query (at)"
        },
        "403": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "denied · forbidden"
        },
        "405": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "409": {
          "keys": [
            "ok",
            "err"
          ],
          "err": "session-changed",
          "note": "KIVO_264 · C1: uid يخالف صاحبَ الجلسة"
        },
        "429": {
          "keys": [
            "ok",
            "err",
            "retry"
          ]
        }
      }
    },
