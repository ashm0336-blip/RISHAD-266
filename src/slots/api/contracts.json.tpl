{
  "$schema_note": "KIVO_255 · SOT-127/SOT-100/AUD-026 — عقودُ الواجهة البرمجية /api/* (52 مساراً — KIVO_264: +/api/me/today · /api/me/history · +4 «مهامي» · +11 «المهام» للمسؤول) مقروءةً آلياً: لكل مسارٍ طرائقُه ومستوى وصوله والجسمُ المطلوب ومفاتيحُ الردّ لكل حالة. tests/unit/api_contracts.test.mjs يثبت (أ) أن قائمةَ المسارات هنا = ما في workers/_worker.js حرفاً (لا مسارَ بلا عقد ولا عقدَ بلا مسار) و(ب) أن الردودَ الفعلية تحمل مفاتيحَ عقدها. المستوياتُ: public · session · actor (جلسة + حساب قائم) · super · enforce (بيئةُ الإنفاذ وحدها؛ 404 بدونها بجلسة — وبلا جلسة 401 كسائر المسارات: بوابةُ الجلسة أولاً). الوثيقةُ المقروءة: docs/api.md.",
  "version": 1,
  "common": {
    "errors": {
      "401": {
        "keys": [
          "ok",
          "err"
        ],
        "err": "session"
      },
      "403": {
        "keys": [
          "ok",
          "err"
        ]
      },
      "404": {
        "keys": [
          "ok",
          "err"
        ],
        "err": "not-found"
      },
      "413": {
        "keys": [
          "ok",
          "err",
          "rid"
        ]
      },
      "500": {
        "keys": [
          "ok",
          "err",
          "rid"
        ],
        "err": "worker-error"
      },
      "503": {
        "keys": [
          "ok",
          "err"
        ]
      }
    },
    "headers": {
      "X-Kivo-Rid": "معرّفُ الطلب (12 hex) على كل ردّ",
      "Server-Timing": "app;dur=<ms> على /api/* والغلاف (KIVO_255)"
    },
    "csrf": "POST/PUT/DELETE: Origin ≠ الموقع أو Sec-Fetch-Site: cross-site ⇒ 403 {ok:0, err:'origin', rid}"
  },
  "routes": [
    {
      "path": "/api/brand",
      "methods": [
        "GET"
      ],
      "access": "public",
      "responses": {
        "200": {
          "keys": [
            "ok",
            "brand",
            "rk"
          ]
        }
      }
    },
    {
      "path": "/api/ping",
      "methods": [
        "GET"
      ],
      "access": "public",
      "responses": {
        "200": {
          "keys": [
            "ok",
            "cf",
            "fresh"
          ],
          "super_extra": [
            "ver",
            "commit",
            "users",
            "rev",
            "sess",
            "schema",
            "schemaDb",
            "schemaOk",
            "ready"
          ],
          "protect_extra": [
            "ready",
            "mode"
          ]
        }
      }
    },
    {
      "path": "/api/recover",
      "methods": [
        "POST"
      ],
      "access": "public",
      "request": {
        "key": "string(20)",
        "pw": "string"
      },
      "responses": {
        "200": {
          "keys": [
            "ok"
          ],
          "note": "ok:0 + err عند مفتاحٍ غير صحيح/محاولاتٍ كثيرة · ok:1 + un عند النجاح"
        },
        "400": {
          "keys": [
            "ok",
            "err",
            "at"
          ],
          "err": "bad-body",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/recover"
        },
        "409": {
          "keys": [
            "ok",
            "err"
          ],
          "why": "rk-changed",
          "note": "V7 · د5-هـ: مفتاحُ الاستعادة استُعمل أو تغيّر بين التحقّق والكتابة (why: rk-changed) — أو تغيّرت الحسابات (بلا why) · لا يُكتب شيء"
        }
      }
    },
    {
      "path": "/api/login",
      "methods": [
        "POST"
      ],
      "access": "public",
      "request": {
        "u": "string",
        "p": "string"
      },
      "responses": {
        "200": {
          "keys": [
            "ok"
          ],
          "ok1": [
            "uid",
            "role",
            "deptId",
            "mustChange"
          ],
          "cookie": "bs_tok HttpOnly SameSite=Lax (Secure خارج localhost)"
        },
        "400": {
          "keys": [
            "ok",
            "err",
            "at"
          ],
          "err": "bad-body",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/login"
        }
      }
    },
    {
      "path": "/api/logout",
      "methods": [
        "GET",
        "POST"
      ],
      "access": "public",
      "request": {
        "POST": "بلا جسم — الفارغُ أو {} وحدهما (KIVO_264 · SOT-101)"
      },
      "responses": {
        "200": {
          "keys": [
            "ok"
          ]
        },
        "303": {
          "note": "GET: توجيهٌ إلى / مع مسح الكوكي"
        },
        "400": {
          "keys": [
            "ok",
            "err",
            "at"
          ],
          "err": "bad-body",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/logout"
        }
      }
    },
    {
      "path": "/api/whoami",
      "methods": [
        "GET"
      ],
      "access": "session",
      "responses": {
        "200": {
          "keys": [
            "ok",
            "uid"
          ]
        }
      }
    },
    {
      "path": "/api/me",
      "methods": [
        "GET"
      ],
      "access": "session",
      "note": "V7 · د5-هـ (x1): sess[] = {sid (مِقبضُ الجلسة — بصمةٌ لا الرمز) · mine · ts · la · dev · br (المتصفح) · city · active} — لا رمزَ ولا IP",
      "responses": {
        "200": {
          "keys": [
            "ok",
            "now",
            "sess",
            "events",
            "lastLogin",
            "thisLogin"
          ]
        }
      }
    },
    {
      "path": "/api/me/sess/kill",
      "methods": [
        "POST"
      ],
      "access": "session",
      "request": {
        "body": "بلا جسم — الفارغُ أو {} (العميلُ يرسل {}) · KIVO_264: كان معقوداً {tok} والمعالجُ لا يقرأ جسماً"
      },
      "responses": {
        "200": {
          "keys": [
            "ok"
          ]
        },
        "400": {
          "keys": [
            "ok",
            "err",
            "at"
          ],
          "err": "bad-body",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/me/sess/kill"
        }
      }
    },
    {
      "path": "/api/me/sess/kill-one",
      "methods": [
        "POST"
      ],
      "access": "session",
      "note": "V7 · د5-هـ (x1): إنهاءُ جلسةٍ واحدة من جلسات صاحب الطلب بمِقبضها (قائمةُ «الجلسات والنشاط» · «ليس أنا» في تنبيه sc_dev) — مِقبضُ غيره 404 كالمجهول",
      "request": {
        "sid": "string(16 hex)",
        "why": "'not-me' | null"
      },
      "responses": {
        "200": {
          "keys": [
            "ok"
          ]
        },
        "400": {
          "keys": [
            "ok",
            "err",
            "at"
          ],
          "err": "bad-body",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/me/sess/kill-one"
        },
        "404": {
          "keys": [
            "ok",
            "err"
          ],
          "err": "not-found"
        },
        "409": {
          "keys": [
            "ok",
            "err"
          ],
          "err": "current"
        }
      }
    },
    {
      "path": "/api/me/today",
      "methods": [
        "GET"
      ],
      "access": "session",
      "note": "KIVO_264 · OD-3 — حقائقُ يوم صاحب الجلسة وحده (الهويةُ من الخادم: ekey = eid ثم nid · لا اسم) · الزملاء بالاسم وحده (OD-4)",
      "responses": {
        "200": {
          "keys": [
            "ok",
            "v",
            "day",
            "account",
            "identity",
            "facts",
            "site",
            "mates",
            "matesN",
            "week",
            "mon"
          ]
        },
        "405": {
          "keys": [
            "ok",
            "err"
          ],
          "err": "read-only"
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
      "path": "/api/me/history",
      "methods": [
        "GET"
      ],
      "access": "session",
      "note": "KIVO_264 · OD-3 — «السجل»: شهرٌ هجريٌّ من صفوف صاحب الجلسة وحدها، وكلُّ عنصرٍ بفئة دليله · ≤ 60 KB",
      "query": {
        "ym?": "YYYY-M (1400-1 … الشهرُ الجاري + 1؛ غيابُه = الشهرُ الجاري)"
      },
      "responses": {
        "200": {
          "keys": [
            "ok",
            "v",
            "ym",
            "today",
            "account",
            "identity",
            "range",
            "month",
            "days",
            "sites",
            "changes",
            "evidence",
            "moves"
          ]
        },
        "400": {
          "keys": [
            "ok",
            "err"
          ],
          "err": "bad-ym"
        },
        "405": {
          "keys": [
            "ok",
            "err"
          ],
          "err": "read-only"
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
@@SYS:contracts.tasks@@    {
      "path": "/api/checkpw",
      "methods": [
        "POST"
      ],
      "access": "session",
      "request": {
        "p": "string"
      },
      "responses": {
        "200": {
          "keys": [
            "ok"
          ]
        },
        "400": {
          "keys": [
            "ok",
            "err",
            "at"
          ],
          "err": "bad-body",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/checkpw"
        }
      }
    },
    {
      "path": "/api/save",
      "methods": [
        "POST"
      ],
      "access": "actor",
      "request": {
        "set": "{key: value}",
        "del": "[key]",
        "base": "{key: rev}",
        "aud?": "object",
        "ops?": "array",
        "uid?": "string — KIVO_264 · C1: هويةُ الجلسة التي بُني لها الطابور (BOOT.uid)",
        "cur?": "string — KIVO_264 · D14: كلمةُ المرور الحالية لتغيير اسم دخول صاحب الحساب (لا تُخزَّن)"
      },
      "responses": {
        "200": {
          "keys": [
            "ok",
            "v",
            "revs",
            "denied",
            "conflicts",
            "atomic"
          ],
          "note": "denied[k].why لمخزن المهام (KIVO_265 · 018 taskRawWhy): task-x (العمود 23 للخادم — H-1) · task-asg (المكلَّفُ بعد نشاط الموظف — RC-13: إعادةُ الإسناد بمسارها /api/tasks/reassign) · task-rv (المراجِعُ مكلَّفاً) · task-acct (مكلَّفٌ جديد بلا حسابِ مستخدمٍ نشط — البند 4) — وعلى base قديمٍ تعارضٌ (conflicts) لا رفض"
        },
        "400": {
          "keys": [
            "ok",
            "err",
            "at"
          ],
          "err": "bad-body",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/save"
        },
        "409": {
          "keys": [
            "ok",
            "err"
          ],
          "err": "session-changed",
          "note": "KIVO_264 · C1: uid يخالف صاحبَ الجلسة — قبل أيّ قراءةٍ أو كتابة"
        },
        "413": {
          "keys": [
            "ok",
            "err",
            "rid"
          ]
        },
        "503": {
          "keys": [
            "ok",
            "err",
            "msg"
          ]
        }
      }
    },
    {
      "path": "/api/get",
      "methods": [
        "GET"
      ],
      "access": "actor",
      "query": {
        "keys": "k1,k2,… (≤ 80)",
        "uid?": "string — KIVO_264 · C1 للقراءة: هويةُ التبويب (BOOT.uid)"
      },
      "responses": {
        "200": {
          "keys": [
            "ok",
            "v",
            "keys"
          ],
          "more_extra": [
            "more"
          ],
          "note": "KIVO_264 · C2: أكثرُ من 80 مفتاحاً ⇒ أوّلُ 80 + more:1"
        },
        "409": {
          "keys": [
            "ok",
            "err"
          ],
          "err": "session-changed",
          "note": "KIVO_264 · C1: uid يخالف صاحبَ الجلسة — قبل أيّ قراءة"
        }
      }
    },
    {
      "path": "/api/changes",
      "methods": [
        "GET"
      ],
      "access": "actor",
      "query": {
        "since": "rev",
        "wait?": "1 (انتظارٌ حتى 25 ثانية)",
        "uid?": "string — KIVO_264 · C1 للقراءة (409 قبل الانتظار)"
      },
      "responses": {
        "200": {
          "keys": [
            "v",
            "keys"
          ],
          "enforce_extra": [
            "am",
            "az"
          ],
          "more_extra": [
            "more"
          ],
          "note": "KIVO_264 · C2: مرتّبةٌ بالمراجعة؛ تُقطع بعد 80 مفتاحاً مرئياً على حدود مراجعةٍ كاملة ⇒ more:1 و v = آخرُ مراجعةٍ مضمَّنة (يُطلب الباقي بـ since=v فوراً)؛ بلا قطع v = المراجعةُ الحالية كما كان"
        },
        "409": {
          "keys": [
            "ok",
            "err"
          ],
          "err": "session-changed",
          "note": "KIVO_264 · C1: uid يخالف صاحبَ الجلسة — قبل أيّ قراءةٍ أو انتظار"
        }
      }
    },
    {
      "path": "/api/perm44/check",
      "methods": [
        "GET"
      ],
      "access": "actor",
      "query": {
        "d": "id — الوحدة",
        "role|ekey": "دورٌ أو شخص (أحدهما)",
        "key": "مفتاحُ السجلّ"
      },
      "responses": {
        "200": {
          "keys": [
            "ok",
            "allow",
            "why",
            "on"
          ],
          "note": "V7 · د5-هـ (44): «اختبار الوصول» — القرارُ نفسُه الذي تُحكم به كتابةُ الأدوار (057b perm44Decide) · on: الأنظمةُ المشغَّلة في سقف الوحدة بالوراثة"
        },
        "400": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "unit · args"
        },
        "403": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "مديرُ المنصة أو مديرُ الوحدة وحدهما"
        },
        "405": {
          "keys": [
            "ok",
            "err"
          ]
        }
      }
    },
    {
      "path": "/api/perm44/log",
      "methods": [
        "GET"
      ],
      "access": "actor",
      "query": {
        "d": "id — الوحدة",
        "limit?": "1..200"
      },
      "responses": {
        "200": {
          "keys": [
            "ok",
            "rows"
          ],
          "note": "V7 · د5-هـ (44): «سجل الصلاحيات» — rows[{id, at, who{uid,name}, unit, k, changes[{what, role?, sys?, person?, key?, unit?, from, to}], affected[], truncated}] من أحداث aud (etype perm44) التي يكتبها الخادمُ مع كلّ حفظة أدوارٍ أو سقف"
        },
        "403": {
          "keys": [
            "ok",
            "err"
          ]
        }
      }
    },
    {
      "path": "/api/retro",
      "methods": [
        "GET",
        "POST"
      ],
      "access": "actor",
      "query": {
        "dept": "id"
      },
      "request": {
        "POST": "{res, dept?, act: open|close, scope?:{y,m,d?}, hours?, reason?, id?}"
      },
      "responses": {
        "200": {
          "keys": [
            "ok"
          ]
        },
        "400": {
          "keys": [
            "ok",
            "err"
          ],
          "err": "bad-body",
          "note": "bad-body (+ at) لمخالفة المخطّط؛ وres · dept · scope · not-closed · reason للدلالة",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/retro"
        }
      }
    },
    {
      "path": "/api/aud",
      "methods": [
        "GET"
      ],
      "access": "actor",
      "query": {
        "limit?": "1..200",
        "cursor?": "",
        "key?": "",
        "uid?": "",
        "first?": "1 — بدايةُ تشغيل المنصة (آخرُ تهيئة وإلا أقدمُ حدثٍ في السجلّ) لتنبيه sy_nobk · مدير النظام وحده · الردّ first_keys"
      },
      "responses": {
        "200": {
          "keys": [
            "ok",
            "rows",
            "next"
          ],
          "first_keys": [
            "ok",
            "first"
          ]
        },
        "403": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "first=1 لغير مدير النظام · أو إدارةٌ خارج نطاق الفاعل"
        },
        "405": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "غيرُ GET: read-only"
        }
      }
    },
    {
      "path": "/api/imgs",
      "methods": [
        "GET"
      ],
      "access": "actor",
      "responses": {
        "200": {
          "keys": [],
          "note": "{id: meta} — قد يكون فارغاً"
        }
      }
    },
    {
      "path": "/api/img/",
      "prefix": true,
      "methods": [
        "GET",
        "PUT",
        "DELETE"
      ],
      "access": "actor",
      "request": {
        "PUT": "جسمُ الصورة ≤ 512 KB — data:image/…;base64, وحدها (KIVO_261 · SOT-068) · المقطَّع: الجزءُ الأوّل بالترويسة والتالي base64 · Content-Type: text/plain أو غائب (KIVO_264) — العقدُ الخامّ: src/schemas/api/bodies.schema.json#/raw//api/img/"
      },
      "responses": {
        "200": {
          "keys": [
            "ok"
          ],
          "PUT_keys": [
            "ok",
            "n"
          ],
          "GET": "جسمُ الصورة"
        },
        "409": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "part0-missing — جزءٌ تالٍ بلا جزءٍ أوّل مرحَّل"
        },
        "415": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "ليس data:image/…;base64 (أو جزءٌ تالٍ ليس base64) · أو Content-Type غيرُ text/plain (KIVO_264 — قبل قراءة الجسم)"
        },
        "429": {
          "keys": [
            "ok",
            "err",
            "retry"
          ],
          "note": "حدُّ المعدّل (دقيقة) أو حصّةُ الرفع اليومية 256 MB لغير مدير النظام — KIVO_261"
        }
      }
    },
    {
      "path": "/api/presence",
      "methods": [
        "GET"
      ],
      "access": "super",
      "responses": {
        "200": {
          "keys": [
            "ok",
            "now",
            "active",
            "list"
          ]
        }
      }
    },
    {
      "path": "/api/sec",
      "methods": [
        "GET"
      ],
      "access": "super",
      "responses": {
        "200": {
          "keys": [
            "ok",
            "rows"
          ]
        }
      },
      "note": "KIVO_264: لمدير النظام وحده في الوضعين (كان معقوداً actor والكودُ يردّ 403 لغير مدير النظام في القديم أيضاً)"
    },
    {
      "path": "/api/sess/kill",
      "methods": [
        "POST"
      ],
      "access": "super",
      "request": {
        "uid": "string",
        "all?": "1"
      },
      "responses": {
        "200": {
          "keys": [
            "ok"
          ]
        },
        "400": {
          "keys": [
            "ok",
            "err",
            "at"
          ],
          "err": "bad-body",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/sess/kill"
        },
        "403": {
          "keys": [
            "ok",
            "err"
          ]
        }
      }
    },
    {
      "path": "/api/guard",
      "methods": [
        "GET"
      ],
      "access": "super",
      "responses": {
        "200": {
          "keys": [
            "ok",
            "now",
            "rows"
          ]
        }
      }
    },
    {
      "path": "/api/guard/unlock",
      "methods": [
        "POST"
      ],
      "access": "super",
      "request": {
        "gk": "string (u:/ip:/p: — وإلا 400)",
        "gks": "string[] (KIVO_261 · ≤ 20 · u:/ip:/p:)",
        "all": "1 — فكُّ الكلّ صريحاً (KIVO_261)"
      },
      "responses": {
        "200": {
          "keys": [
            "ok"
          ]
        },
        "400": {
          "keys": [
            "ok",
            "err"
          ],
          "err": "bad-body",
          "note": "bad-body (+ at) لمخالفة المخطّط (KIVO_264 — null كان {} منذ 261)؛ و gk ببادئةٍ مجهولة · أو جسمٌ بلا gk/gks/all",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/guard/unlock"
        }
      }
    },
    {
      "path": "/api/policy",
      "methods": [
        "GET",
        "POST"
      ],
      "access": "super",
      "request": {
        "sessH": "1..",
        "idleH": "0.25..",
        "dispH": "1..72 (V7 · د5-هـ: مدةُ جلسة شاشة العرض)",
        "lockN": "3..",
        "lockMin": "1..",
        "pwMin": "6..",
        "wrMin": "30..5000",
        "thrOn": "0..1",
        "thrN": "5..100",
        "thrWin": "5..120",
        "thrSec": "1..10",
        "types": "أرقامٌ أو نصوصٌ رقمية (حقولُ النموذج)"
      },
      "responses": {
        "200": {
          "keys": [
            "ok",
            "policy"
          ]
        },
        "400": {
          "keys": [
            "ok",
            "err",
            "at"
          ],
          "err": "bad-body",
          "note": "KIVO_264 · E5: null كان 500",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/policy"
        }
      }
    },
    {
      "path": "/api/overview",
      "methods": [
        "GET"
      ],
      "access": "super",
      "responses": {
        "200": {
          "keys": [
            "ok",
            "now",
            "policy",
            "oldHash",
            "imgs",
            "failsToday",
            "deniedToday",
            "lockedNow",
            "activeNow",
            "sessions",
            "lastLogin",
            "fails",
            "added"
          ],
          "note": "KIVO_265 · imgs: تشخيصُ مخزن الصور (r2 · stored · staged · counts{bound,claim,orphan,amb} · claims[] · orphans[] · grace) — البند 6 بعد حادثة الصور"
        }
      }
    },
    {
      "path": "/api/recovery",
      "methods": [
        "GET"
      ],
      "access": "super",
      "responses": {
        "200": {
          "keys": [
            "ok",
            "key",
            "used",
            "backups",
            "backupLastLogin"
          ]
        }
      }
    },
    {
      "path": "/api/recovery/new",
      "methods": [
        "POST"
      ],
      "access": "super",
      "request": {
        "pw": "string — كلمةُ مرور مدير النظام الحالية"
      },
      "responses": {
        "200": {
          "keys": [
            "ok"
          ],
          "note": "ok:1 + key مرةً واحدة · ok:0 + err"
        },
        "400": {
          "keys": [
            "ok",
            "err",
            "at"
          ],
          "err": "bad-body",
          "note": "KIVO_264 · E5: null كان 500",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/recovery/new"
        },
        "409": {
          "keys": [
            "ok",
            "err"
          ],
          "why": "rk-changed",
          "note": "V7 · د5-هـ: إصدارٌ متزامن أو استعمالٌ غيّر المفتاحَ السابق — لا يُنشأ مفتاح"
        }
      }
    },
    {
      "path": "/api/reset",
      "methods": [
        "POST"
      ],
      "access": "super",
      "request": {
        "pw": "string",
        "key": "string(20)",
        "confirm": "تهيئة",
        "keepBrand?": "boolean",
        "admin": "{un, name, pw}"
      },
      "responses": {
        "200": {
          "keys": [
            "ok"
          ]
        },
        "400": {
          "keys": [
            "ok",
            "err",
            "at"
          ],
          "err": "bad-body",
          "note": "KIVO_264 · E5: null كان 500",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/reset"
        },
        "409": {
          "keys": [
            "ok",
            "err"
          ],
          "why": "rk-changed",
          "note": "V7 · د5-هـ: المفتاحُ الذي أجاز التهيئة استُهلك قبل كتابتها — لا يُنفَّذ شيء"
        }
      },
      "note": "محروسة — لا تُنفَّذ في اختبار العقد"
    },
    {
      "path": "/api/identity-rehearsal",
      "methods": [
        "GET"
      ],
      "access": "super",
      "responses": {
        "200": {
          "keys": [
            "ok",
            "worker",
            "rehearsal"
          ]
        }
      }
    },
    {
      "path": "/api/authz",
      "methods": [
        "GET"
      ],
      "access": "session",
      "responses": {
        "200": {
          "keys": [
            "ok",
            "ver",
            "mode",
            "env",
            "d1",
            "perm",
            "scope",
            "ident",
            "fixture",
            "me"
          ]
        },
        "404": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "بلا ENV"
        }
      }
    },
    {
      "path": "/api/authz/log",
      "methods": [
        "GET"
      ],
      "access": "super",
      "responses": {
        "200": {
          "keys": [
            "ok",
            "rows",
            "totals"
          ]
        },
        "404": {
          "keys": [
            "ok",
            "err"
          ]
        }
      }
    },
    {
      "path": "/api/authz/snaps",
      "methods": [
        "GET"
      ],
      "access": "super",
      "responses": {
        "200": {
          "keys": [
            "ok",
            "rows"
          ]
        },
        "404": {
          "keys": [
            "ok",
            "err"
          ]
        }
      }
    },
    {
      "path": "/api/authz-migrate",
      "methods": [
        "POST"
      ],
      "access": "super",
      "request": {
        "act": "apply | rollback (POST) · status | plan (GET ?act=)",
        "seed": "hex64",
        "hash": "hex64 — بصمةُ الخطة",
        "generated": "لحظةُ الخطة",
        "parts?": "[identity|perm] أو [scope-retire] وحدها (RISHAD-266: تقاعدُ سقف النطاق القديم — حذفُ bsdept:%:bassam_scope_v1 وmeta.authz_scope_mig بلقطةٍ قابلةٍ للرجوع)",
        "inferable?": "boolean",
        "snap": "معرّفُ اللقطة (rollback)",
        "force?": "boolean"
      },
      "responses": {
        "200": {
          "keys": [
            "ok"
          ]
        },
        "400": {
          "keys": [
            "ok",
            "err"
          ],
          "err": "bad-body",
          "note": "bad-body (+ at) لمخالفة المخطّط؛ و act · seed-hash · generated · snap · parts-mixed (scope-retire مع غيرها) للدلالة",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/authz-migrate"
        },
        "404": {
          "keys": [
            "ok",
            "err"
          ]
        }
      }
    },
    {
      "path": "/api/demo-data",
      "methods": [
        "POST"
      ],
      "access": "enforce",
      "request": {
        "act": "preview|seed|remove|status",
        "reveal?": "boolean — كلماتُ مرور حسابات العرض في الرد مرةً واحدة (seed)",
        "force?": "boolean — الحذفُ رغم الانحراف (remove)"
      },
      "responses": {
        "200": {
          "keys": [
            "ok",
            "act"
          ]
        },
        "400": {
          "keys": [
            "ok",
            "err"
          ],
          "err": "bad-body",
          "note": "بعد حرّاس الأداة (البيئة · المضيف · مدير النظام)",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/demo-data"
        },
        "403": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "غيرُ مدير المنصة"
        },
        "404": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "بلا KIVO_TEST_FIXTURE=allow أو مضيفٍ غير مسموح — وحزمةُ الإنتاج بلا الأداة أصلاً (tools/prod_strip.py)"
        },
        "409": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "demo-already-seeded · demo-residue · demo-drift · conflict"
        }
      }
    },
    {
      "path": "/api/authz-test",
      "methods": [
        "POST"
      ],
      "access": "enforce",
      "request": {
        "uid": "tst_*",
        "path": "/…",
        "method": "GET|POST|PUT|DELETE",
        "body?": "أيّ شكل — يفحصه المسارُ المستهدف",
        "vals?": "[مفاتيح]"
      },
      "responses": {
        "200": {
          "keys": [
            "ok"
          ]
        },
        "400": {
          "keys": [
            "ok",
            "err"
          ],
          "err": "bad-body",
          "note": "بعد حرّاس الأداة (البيئة · المضيف · مدير النظام)",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/authz-test"
        },
        "404": {
          "keys": [
            "ok",
            "err"
          ],
          "note": "بلا KIVO_TEST_FIXTURE=allow أو مضيفٍ غير مسموح"
        }
      }
    },
@@SYS:contracts.dstats@@    {
      "path": "/api/notifications",
      "methods": [
        "GET"
      ],
      "access": "actor",
      "query": {
        "uid?": "captured session owner",
        "dept?": "active department in actor scope",
        "all?": "1 permits super to include all permitted scopes",
        "cursor?": "opaque revision-bound keyset cursor",
        "limit?": "1..200",
        "summary?": "1 reads aggregate counters only",
        "filter?": "all | act | un; counters stay unfiltered",
        "kinds?": "comma-separated known category keys",
        "manage?": "1 adds super-only broadcast management page",
        "bcCursor?": "broadcast resource revision-bound keyset cursor"
      },
      "responses": {
        "200": {
          "keys": [
            "ok",
            "rev",
            "items",
            "total",
            "unread",
            "actionable",
            "urgentUnread",
            "unreadAll",
            "byKind",
            "next",
            "cfg",
            "configRev",
            "broadcastRev",
            "counters",
            "pendingAck"
          ],
          "manage_extra": [
            "broadcasts",
            "stats",
            "bcTotal",
            "bcNext"
          ]
        },
        "400": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "403": {
          "keys": [
            "ok",
            "err"
          ]
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
          ]
        },
        "503": {
          "keys": [
            "ok",
            "err"
          ],
          "err": "notification-legacy-source-present"
        }
      }
    },
    {
      "path": "/api/notifications/act",
      "methods": [
        "POST"
      ],
      "access": "actor",
      "request": {
        "op": "emit | emit-batch | state | config | broadcast | dept-broadcast | withdraw | remind | targets | security-poll",
        "uid?": "captured session owner",
        "base?": "required CAS for config and global broadcast management; state belongs to session only"
      },
      "responses": {
        "200": {
          "keys": [
            "ok",
            "rev"
          ]
        },
        "400": {
          "keys": [
            "ok",
            "err"
          ],
          "err": "bad-body",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/notifications/act",
          "note": "Semantic operation/target errors also use 400 with their explicit code"
        },
        "403": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "404": {
          "keys": [
            "ok",
            "err"
          ]
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
          ]
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
        },
        "503": {
          "keys": [
            "ok",
            "err"
          ],
          "err": "notification-legacy-source-present"
        }
      }
    },
    {
      "path": "/api/notifications/export",
      "methods": [
        "GET"
      ],
      "access": "actor",
      "query": {
        "dept?": "department backup.view; absent means full domain, super only"
      },
      "responses": {
        "200": {
          "keys": [
            "ok",
            "rev",
            "domain"
          ]
        },
        "403": {
          "keys": [
            "ok",
            "err"
          ]
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
          ]
        },
        "503": {
          "keys": [
            "ok",
            "err"
          ],
          "err": "notification-legacy-source-present"
        }
      }
    },
@@SYS:contracts.custody@@    {
      "path": "/api/employees/transition",
      "methods": [
        "GET",
        "POST"
      ],
      "access": "actor",
      "responses": {
        "200": {
          "keys": [
            "ok"
          ]
        },
        "400": {
          "keys": [
            "ok",
            "err",
            "at"
          ],
          "err": "bad-body",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/employees/transition",
          "note": "الجلسة وهوية الفاعل قبل فحص الشكل؛ تظل حراسة العملية والنطاق كما هي بعده."
        },
        "401": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "403": {
          "keys": [
            "ok",
            "err"
          ]
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
          ]
        },
        "413": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "503": {
          "keys": [
            "ok",
            "err"
          ]
        }
      },
      "note": "Server-owned operations. Existing resource authority, session identity, revision/epoch checks and operation-specific closed validation apply. GET inspects; POST commits atomically where supported."
    },
    {
      "path": "/api/admin/dept-wipe",
      "methods": [
        "GET",
        "POST"
      ],
      "access": "super",
      "responses": {
        "200": {
          "keys": [
            "ok"
          ]
        },
        "400": {
          "keys": [
            "ok",
            "err",
            "at"
          ],
          "err": "bad-body",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/admin/dept-wipe",
          "note": "الجلسة ودور مدير المنصة قبل فحص الشكل؛ الصلاحية تظل403 لغيره."
        },
        "401": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "403": {
          "keys": [
            "ok",
            "err"
          ]
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
          ]
        },
        "413": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "503": {
          "keys": [
            "ok",
            "err"
          ]
        }
      },
      "note": "Server-owned operations. Existing resource authority, session identity, revision/epoch checks and operation-specific closed validation apply. GET inspects; POST commits atomically where supported."
    },
    {
      "path": "/api/admin/dept-delete",
      "methods": [
        "GET",
        "POST"
      ],
      "access": "super",
      "responses": {
        "200": {
          "keys": [
            "ok"
          ]
        },
        "400": {
          "keys": [
            "ok",
            "err",
            "at"
          ],
          "err": "bad-body",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/admin/dept-delete",
          "note": "الجلسة ودور مدير المنصة قبل فحص الشكل؛ الصلاحية تظل403 لغيره."
        },
        "401": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "403": {
          "keys": [
            "ok",
            "err"
          ]
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
          ]
        },
        "413": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "503": {
          "keys": [
            "ok",
            "err"
          ]
        }
      },
      "note": "Server-owned operations. Existing resource authority, session identity, revision/epoch checks and operation-specific closed validation apply. GET inspects; POST commits atomically where supported."
    },
    {
      "path": "/api/backup/import",
      "methods": [
        "POST"
      ],
      "access": "actor",
      "responses": {
        "200": {
          "keys": [
            "ok"
          ]
        },
        "400": {
          "keys": [
            "ok",
            "err",
            "at"
          ],
          "err": "bad-body",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/backup/import",
          "note": "الجلسة وهوية الفاعل قبل فحص الشكل؛ تظل حراسة العملية والنطاق كما هي بعده."
        },
        "401": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "403": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "404": {
          "keys": [
            "ok",
            "err"
          ]
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
          ]
        },
        "410": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "413": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "503": {
          "keys": [
            "ok",
            "err"
          ]
        }
      },
      "note": "V7 · د6: استيراد النسخة على أجزاء (op: begin · part · inspect · commit · cancel). كل طلب يُفحص بصلاحية الاستعادة نفسها وبمالك المنطقة المؤقتة؛ الأجزاء لا تمسّ إلا المؤقت، والاعتماد دفعة واحدة بالمسار القائم (/api/backup/restore)."
    },
    {
      "path": "/api/backup/restore",
      "methods": [
        "GET",
        "POST"
      ],
      "access": "actor",
      "responses": {
        "200": {
          "keys": [
            "ok"
          ]
        },
        "400": {
          "keys": [
            "ok",
            "err",
            "at"
          ],
          "err": "bad-body",
          "schema": "src/schemas/api/bodies.schema.json#/bodies//api/backup/restore",
          "note": "الجلسة وهوية الفاعل قبل فحص الشكل؛ تظل حراسة العملية والنطاق كما هي بعده."
        },
        "401": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "403": {
          "keys": [
            "ok",
            "err"
          ]
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
          ]
        },
        "413": {
          "keys": [
            "ok",
            "err"
          ]
        },
        "503": {
          "keys": [
            "ok",
            "err"
          ]
        }
      },
      "note": "Server-owned operations. Existing resource authority, session identity, revision/epoch checks and operation-specific closed validation apply. GET inspects; POST commits atomically where supported."
    },
@@SYS:contracts.systems@@    {
      "path": "/api/operations/read",
      "methods": [
        "GET"
      ],
      "access": "actor",
      "responses": {
        "200": {
          "keys": [
            "ok",
            "uid",
            "v",
            "epoch",
            "resources",
            "absent",
            "denied",
            "base"
          ]
        },
        "400": {
          "keys": [
            "ok",
            "err"
          ]
        }
      }
    },
    {
      "path": "/api/operations/export",
      "methods": [
        "GET"
      ],
      "access": "actor",
      "responses": {
        "200": {
          "keys": [
            "ok",
            "version",
            "globalRev",
            "epoch",
            "domains"
          ]
        },
        "400": {
          "keys": [
            "ok",
            "err"
          ]
        }
      }
    },
    {
      "path": "/api/operations/summary",
      "methods": [
        "GET"
      ],
      "access": "actor",
      "responses": {
        "200": {
          "keys": [
            "ok",
            "key",
            "rows"
          ]
        },
        "400": {
          "keys": [
            "ok",
            "err"
          ]
        }
      }
    },
    {
      "path": "/api/operations/receipt",
      "methods": [
        "GET"
      ],
      "access": "actor",
      "responses": {
        "200": {
          "keys": [
            "ok",
            "found"
          ]
        },
        "400": {
          "keys": [
            "ok",
            "err"
          ]
        }
      }
    },
    {
      "path": "/api/operations/periods-migrate",
      "methods": [
        "POST"
      ],
      "access": "super",
      "responses": {
        "200": {
          "keys": [
            "ok",
            "departments",
            "pending"
          ]
        },
        "400": {
          "keys": [
            "ok",
            "err"
          ]
        }
      }
    }
  ]
}
