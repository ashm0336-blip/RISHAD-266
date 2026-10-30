
/* ── تشفير النسخة الشاملة ─────────────────────────────────────────────────────
   AES-GCM بمفتاح مشتق من كلمة مرور عبر PBKDF2 (210 ألف تكرار، SHA-256) —
   ملف النسخة الشاملة يحوي حسابات الدخول وبصماتها، فلا يخرج إلا مشفّراً. */
(function(){
  function b64(buf){ var b=''; var u=new Uint8Array(buf); for(var i=0;i<u.length;i++) b+=String.fromCharCode(u[i]); return btoa(b); }
  function unb64(s){ var b=atob(String(s||'')); var u=new Uint8Array(b.length); for(var i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return u; }
  function key(pass, salt){
    return crypto.subtle.importKey('raw', new TextEncoder().encode(String(pass)), 'PBKDF2', false, ['deriveKey'])
      .then(function(k){ return crypto.subtle.deriveKey({ name:'PBKDF2', salt:salt, iterations:210000, hash:'SHA-256' }, k, { name:'AES-GCM', length:256 }, false, ['encrypt','decrypt']); });
  }
  KIVO.BassamCrypt = {
    ok: function(){ try { return !!(window.crypto && crypto.subtle && window.TextEncoder); } catch(e){ return false; } },
    enc: function(text, pass){ var B = KIVO.BassamBusy, p = KIVO.BassamCrypt.enc0(text, pass); return B ? B.wrap(p, 'جارٍ تشفير النسخة الاحتياطية…', { sub: B.fmtBytes(String(text || '').length) }) : p; },
    dec: function(enc, pass){ var B = KIVO.BassamBusy, p = KIVO.BassamCrypt.dec0(enc, pass); return B ? B.wrap(p, 'جارٍ فكّ تشفير النسخة…') : p; },
    enc0: function(text, pass){
      var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
      return key(pass, salt).then(function(k){ return crypto.subtle.encrypt({ name:'AES-GCM', iv:iv }, k, new TextEncoder().encode(text)); })
        .then(function(ct){ return { salt:b64(salt.buffer), iv:b64(iv.buffer), data:b64(ct) }; });
    },
    dec0: function(obj, pass){
      try {
        var salt = unb64(obj.salt), iv = unb64(obj.iv), ct = unb64(obj.data);
        return key(pass, salt).then(function(k){ return crypto.subtle.decrypt({ name:'AES-GCM', iv:iv }, k, ct); })
          .then(function(pt){ return new TextDecoder().decode(pt); });
      } catch(e){ return Promise.reject(e); }
    }
  };
})();
