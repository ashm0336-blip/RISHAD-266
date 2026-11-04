
/* ── مفتاح الموظف الموحّد ──────────────────────────────────────────────────────
   كانت كل صفحة تختار مفتاحها بنفسها (nid تارة، eid تارة، الاسم تارة)، فأي
   تغيير في بيانات الموظف كان ينقل تسكينه إلى مفتاح آخر ويُظهره «بدون تسكين».
   المفتاح الرسمي الآن eid (مولّد ومضمون)، والقراءة متسامحة مع الصيغ القديمة. */
(function(){
  function key(e){ return (e && (e.eid || e.nid || e.name)) || ''; }
  function tokens(e){
    if (!e) return [];
    return [e.eid, e.nid, e.name].filter(function(x){ return x != null && x !== ''; }).map(String);
  }
  KIVO.BassamEmp = {
    key: key,
    tokens: tokens,
    /* يجرّب eid ثم nid ثم الاسم — فلا تختفي التسكينات قبل أن يمرّ الترحيل */
    entry: function(bucket, e){
      if (!bucket || !e) return null;
      var ks = tokens(e);
      for (var i=0;i<ks.length;i++) if (bucket[ks[i]] !== undefined) return bucket[ks[i]];
      return null;
    },
    entryKey: function(bucket, e){
      if (!bucket || !e) return '';
      var ks = tokens(e);
      for (var i=0;i<ks.length;i++) if (bucket[ks[i]] !== undefined) return ks[i];
      return key(e);
    },
    /* يحوّل أي رمز مخزَّن (معرّف أو اسم قديم) إلى الموظف المقابل */
    resolve: function(list, tok){
      if (tok == null) return null;
      var t = String(tok);
      var arr = list || [];
      for (var i=0;i<arr.length;i++){ var e = arr[i]; if (e && (String(e.eid||'')===t || String(e.nid||'')===t || String(e.name||'')===t)) return e; }
      return null;
    },
    nameOf: function(list, tok){ var e = this.resolve(list, tok); return e ? (e.name || String(tok)) : String(tok == null ? '' : tok); }
  };
})();
