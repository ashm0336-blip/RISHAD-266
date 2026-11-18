  _tkAll() {
    /* KIVO_264 · KIVO-Tasks P0: «مهامي» من الخادم بنطاق صفوفي وحدها (KIVO.BassamMyTasks ⇒ GET /api/me/tasks) — كان المخزنُ الكامل
       من التخزين المحلي، والخادمُ لا يحقنه إلا لحامل task.view فيصل التنبيهُ ولا تظهر المهمة. الصفوفُ تُعاد بشكلها القائم (22 عموداً)
       فلا يتغيّر عرضُ البطاقة والسجل؛ والعمود 14 علامةُ «لي» لا مفتاح. */
    const MT = KIVO.BassamMyTasks;
    if (MT) {
      const S = MT.state();
      if (S.rows === this._tkRows0 && this._tkObj0) return this._tkObj0;
      const e = {},
        Qf = MT.queue && MT.queue.forRow;
      (S.rows || []).forEach((x) => {
        /* KIVO_265 · البند 9: أفعالٌ بانتظار الإرسال على الصفّ (q · qAct) — تُعلَّق عليه هنا (الطابورُ يُعلن تغيّرَه فيُبطل الذاكرة) */
        const qq = Qf ? Qf(x) : [];
        qq.length && (x = Object.assign({}, x, { q: qq.length, qAct: qq[qq.length - 1].act }));
        (e[x.k] = e[x.k] || [])[x.i] = this._tkRowOf(x);
      });
      return ((this._tkRows0 = S.rows), (this._tkObj0 = e), e);
    }
    return {};
  }
  _tkRowOf(x) {
    const r = [x.t, x.desc, x.prio, x.st, "normal", "مضافة", x.perf, [], "", x.by, x.dur, x.acc, x.fin, x.at != null ? x.at : x.id, "__me", x.s, x.e,
      x.grp ? x.grp.id : null, x.grp ? x.grp.label : null, null, x.dec, x.proof];
    return ((r.__x = x), r);
  }
  /* الفعلُ الذاتيّ في الخادم (POST /api/me/tasks/act) — لا تحديثَ متفائل: النتيجةُ من الخادم، والفشلُ يُعلَن فشلاً */
  _tkAct(d, i, a, x) {
    const MT = KIVO.BassamMyTasks,
      r = (this._tkAll()[d] || [])[i];
    if (!MT || !r || !r.__x) return Promise.resolve({ ok: !1, msg: "تعذّر الحفظ — حدّث الصفحة وأعد المحاولة" });
    const key = r.__x.k + "#" + r.__x.id;
    (this._pfSelfDrafts || (this._pfSelfDrafts = new Set())).add(key);
    return MT.act(r.__x, a, x).then((res) => (this._tkAfter(res, key), res));
  }
  /* Only a confirmed self-task ACK lets the caller close its editor. */
  _tkAfter(result, key) {
    if (key && result && (result.ok || !result.uncertain) && this._pfSelfDrafts) this._pfSelfDrafts.delete(key);
    this.setState({ pfTick: (this.state.pfTick || 0) + 1, tkNow: Date.now() });
  }
