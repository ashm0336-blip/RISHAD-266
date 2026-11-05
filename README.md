# رشاد — RISHAD

**منظومة رقمية لإدارة العمليات واتخاذ القرار.**

تجمع رشاد الإدارات والأقسام في منصة واحدة. لكل وحدة بياناتها وصلاحياتها المستقلة، ويدخل الجميع بحساب موحد. تشمل المنظومة:
- الخطة التشغيلية والجدول الشهري والمتابعة اليومية والتقارير.
- المهام والموظفين والعهد.
- أنظمة الاسترشاد والمضبوطات والجائزة.
- مؤشرات الأداء داخل كل نظام.

**صاحب المشروع والإشراف على تطويره:** بسام الغزاوي.

## التشغيل السريع

يتطلب Node.js بدعم `node:sqlite`، وPython 3.11 أو أحدث مع `jsonschema`، وBash. ثم من جذر المستودع:

```bash
npm ci
npm run generate
npm run build
npm run check
npm run test:unit
```

## التوثيق

| الموضوع | الملف |
|---|---|
| خريطة المستودع والبناء وقواعد العمل | [docs/repository.md](docs/repository.md) |
| دليل المطوّر | [docs/developer.md](docs/developer.md) |
| المعمارية والوحدات والملكيات | [docs/architecture.md](docs/architecture.md) · [docs/modules.md](docs/modules.md) |
| مسارات الواجهة والخادم | [docs/routes.md](docs/routes.md) · [docs/api-routes.md](docs/api-routes.md) · [docs/api.md](docs/api.md) |
| الاختبارات | [docs/testing.md](docs/testing.md) |
| الأمن | [docs/security.md](docs/security.md) |
| سجل التنفيذ الحالي | [docs/RISHAD_266_IMPLEMENTATION.md](docs/RISHAD_266_IMPLEMENTATION.md) |
| سجل التغييرات | [CHANGELOG.md](CHANGELOG.md) |

## قاعدة النشر

لا ينشر شيء في هذا المستودع إلى Production آلياً. يُرفع إلى بيئة Test يدوياً بعد الاعتماد، ولا يُمسّ Production إلا بقرار صاحب المشروع.
