  {
   "key": "daily",
   "module": "daily",
   "activation": "toggle",
   "platSwitch": true,
   "requires": [
@@SYS:pages.daily.requires.dreport@@    {"for": "daily/kpiOcc", "on": "lens:zones", "kind": "lens"},
    {"for": "daily/kpiOcc", "on": "lens:dens", "kind": "lens"},
    {"for": "daily/kpiZones", "on": "lens:zones", "kind": "lens"}
   ],
   "departmentComponents": ["Daily Sessions"],
   "nav": "daily",
   "name": "المتابعة اليومية",
   "seq": [
    "tab:kpiDaily",
    "tab:kpiOcc",
    "tab:kpiZones",
@@SYS:pages.daily.seq.dreport@@    "tab:rounds",
@@SYS:pages.daily.seq.tasks@@    "tab:field"
   ],
   "tabLabel": "التبويبات",
   "tabs": [
    {
     "key": "kpiDaily",
     "name": "مؤشرات المتابعة — التشغيل اليومي",
     "offPage": true
    },
    {
     "key": "kpiOcc",
     "name": "مؤشرات المتابعة — الإشغال",
     "offPage": true
    },
    {
     "key": "kpiZones",
     "name": "مؤشرات المتابعة — المصليات",
     "offPage": true
    },
    {
     "key": "rounds",
     "name": "الجولات اليومية"
    },
    {
     "key": "field",
     "name": "رصد الميدان — حالة الموقع واتجاه الحركة من صفحة الموظف",
     "offPage": true
    }
   ]
  },
