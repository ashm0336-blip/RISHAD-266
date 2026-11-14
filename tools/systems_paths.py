# -*- coding: utf-8 -*-
"""V7 · المرحلة 2 · الحزمة ب — أين يسكن ملفُّ وحدةٍ أو جزءُ خادم بعد نقل الأنظمة إلى src/systems/<key>/ (مساراتٌ فقط، لا سلوك).
   وحدةُ الصفحة: src/modules/<slug>/ أو src/systems/<key>/client/ (يُعرف الـslug من meta.json نفسه).
   جزءُ الخادم: كما يسمّيه workers/parts.json (اسمٌ في workers/parts أو مسارٌ نسبيٌّ إليه نحو src/systems/<key>/server/)."""
import os, glob, json

def module_dirs(S):
    """{slug: المجلد} لكل وحدات الصفحات — S = مجلد المصدر (src)."""
    out = {}
    m = os.path.join(S, 'modules')
    if os.path.isdir(m):
        for d in sorted(os.listdir(m)):
            if os.path.isfile(os.path.join(m, d, 'meta.json')): out[d] = os.path.join(m, d)
    for meta in sorted(glob.glob(os.path.join(S, 'systems', '*', 'client', 'meta.json'))):
        out[json.load(open(meta, encoding='utf-8'))['slug']] = os.path.dirname(meta)
    return out

def module_dir(S, slug):
    return module_dirs(S).get(slug) or os.path.join(S, 'modules', slug)

def module_rel(S, slug):
    """مسارُ مجلد الوحدة نسبةً إلى S، بفاصل /."""
    return os.path.relpath(module_dir(S, slug), S).replace(os.sep, '/')

def module_globs(S, pattern):
    """ما كان glob(S/modules/*/<pattern>) — الآن مع مجلدات الأنظمة."""
    return sorted(glob.glob(os.path.join(S, 'modules', '*', pattern)) + glob.glob(os.path.join(S, 'systems', '*', 'client', pattern)))

def worker_parts(PD):
    """[(الاسم في parts.json, المسار)] بترتيب الضمّ — PD = مجلد workers/parts."""
    order = json.load(open(os.path.join(PD, '..', 'parts.json'), encoding='utf-8'))['parts']
    return [(p['file'], os.path.normpath(os.path.join(PD, p['file']))) for p in order]

def part_path(PD, name):
    """مسارُ جزءٍ باسم ملفه (الاسمُ وحده يكفي — الأسماءُ المرقَّمة فريدة)."""
    for f, p in worker_parts(PD):
        if os.path.basename(f) == name: return p
    return os.path.join(PD, name)
