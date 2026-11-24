<!-- ═══ منبثقات المهام: التوثيق والتسليم · الاعتذار/التعثّر · السجل · سجل المهمة الواحدة (KIVO_264) ═══ -->
<sc-if value="{{pfPanelTkFin}}" hint-placeholder-val="{{ false }}">
<div class="pf-ov" onClick="{{pfOvClose}}"><div class="pf-modal" onClick="{{pfStop}}" role="dialog" style="max-width:540px">
  <div class="pf-head pf-mhd"><div style="flex:1;min-width:0"><b>{{tkFinHead}}</b><small>{{tkDlgTitle}} · {{tkFinSub}}</small></div><button class="pf-btn" onClick="{{pfClosePanel}}">رجوع</button></div>
  <div class="pf-mbd"><div style="padding:14px 16px;display:grid;gap:10px">
    <sc-if value="{{tkFinRet}}" hint-placeholder-val="{{ false }}"><div style="border:1px solid var(--danger-border);background:var(--danger-bg);color:var(--danger-text);border-radius:11px;padding:9px 12px;font-size:11.5px;font-weight:700;line-height:1.7">{{tkFinRet}}</div></sc-if>
    <sc-if value="{{tkFinPol}}" hint-placeholder-val="{{ false }}"><div style="font-size:11px;color:var(--text-secondary);font-weight:700">{{tkFinPol}}</div></sc-if>
    <sc-if value="{{tkFinStepsOn}}" hint-placeholder-val="{{ false }}"><div style="display:grid;gap:6px"><div style="font-size:11.5px;font-weight:700">خطوات العمل — علّم ما أنجزت</div><div style="display:flex;flex-wrap:wrap;gap:6px"><sc-for list="{{tkFinSteps}}" as="sp" hint-placeholder-count="3"><button class="{{sp.cls}}" onClick="{{sp.tog}}">{{sp.t}}</button></sc-for></div></div></sc-if>
    <sc-if value="{{tkFinOldOn}}" hint-placeholder-val="{{ false }}"><div style="display:grid;gap:6px"><div style="font-size:10.5px;color:var(--text-muted)">{{tkFinOldTxt}}</div><div class="tk-thumbs"><sc-for list="{{tkFinOld}}" as="im" hint-placeholder-count="1"><div class="tk-thw"><sc-if value="{{im.on}}" hint-placeholder-val="{{ true }}"><img src="{{im.src}}" alt="صورة توثيق محفوظة"></sc-if><sc-if value="{{im.off}}" hint-placeholder-val="{{ false }}"><span class="tk-th" style="width:84px;height:64px"></span></sc-if><sc-if value="{{im.rmOn}}" hint-placeholder-val="{{ false }}"><span class="tk-thx" onClick="{{im.rm}}">×</span></sc-if></div></sc-for></div></div></sc-if>
    <label class="tk-drop"><b>📷 صوّر ما أنجزته</b>التقط بالكاميرا أو اختر من الصور — تُضغط الصورة وتُختم بالتاريخ والوقت والموقع (إن سمحت به) واسمك وعنوان المهمة ثم تُحفظ مع المهمة (حتى 4 صور)
      <input type="file" accept="image/*" multiple onChange="{{onTkPick}}" style="display:none"></label>
    <div class="tk-thumbs"><sc-for list="{{tkImgs}}" as="im" hint-placeholder-count="1"><div class="tk-thw"><img src="{{im.src}}" alt="صورة مرفقة"><span class="tk-thx" onClick="{{im.rm}}">×</span></div></sc-for>
      <sc-if value="{{tkImgsCan}}" hint-placeholder-val="{{ true }}"><label class="tk-thadd">+<input type="file" accept="image/*" multiple onChange="{{onTkPick}}" style="display:none"></label></sc-if></div>
    <sc-if value="{{tkImgErr}}" hint-placeholder-val="{{ false }}"><div class="tk-req" style="color:var(--fg-xb91c1c)"><span style="width:6px;height:6px;border-radius:50%;background:var(--bg-xdc2626);display:inline-block"></span>{{tkImgErr}}</div></sc-if>
    <sc-if value="{{tkFinHint}}" hint-placeholder-val="{{ true }}"><div class="tk-req"><span style="width:6px;height:6px;border-radius:50%;background:var(--bg-xb45309);display:inline-block"></span>{{tkFinHint}}</div></sc-if>
    <textarea class="tk-ta" value="{{tkNote}}" onChange="{{onTkNote}}" placeholder="{{tkNotePh}}"></textarea>
    <sc-if value="{{tkFinPerf}}" hint-placeholder-val="{{ true }}"><div class="tk-m" style="text-align:right;display:flex;justify-content:space-between;align-items:center"><span><small>الأداء عند الإنهاء الآن</small><b style="color:{{tkFinPerfC}}">{{tkFinPerf}}</b></span><span style="font-size:20px;color:{{tkFinPerfC}}">✓</span></div></sc-if>
    <div class="tk-btns"><button class="tk-btn ok" onClick="{{tkFinGo}}" disabled="{{tkFinDis}}">{{tkFinBtn}}</button><sc-if value="{{tkFinDraftOn}}" hint-placeholder-val="{{ false }}"><button class="tk-btn" onClick="{{tkFinDraft}}" disabled="{{tkBusyOn}}">حفظ مسودّة</button></sc-if><button class="tk-btn" onClick="{{pfClosePanel}}">رجوع</button></div>
  </div></div>
</div></div>
</sc-if>
<sc-if value="{{pfPanelTkDec}}" hint-placeholder-val="{{ false }}">
<div class="pf-ov" onClick="{{pfOvClose}}"><div class="pf-modal" onClick="{{pfStop}}" role="dialog" style="max-width:480px">
  <div class="pf-head pf-mhd"><div style="flex:1;min-width:0"><b>{{tkDecHead}}</b><small>{{tkDlgTitle}} — {{tkDecSub}}</small></div><button class="pf-btn" onClick="{{pfClosePanel}}">رجوع</button></div>
  <div class="pf-mbd"><div style="padding:14px 16px;display:grid;gap:10px">
    <div style="font-size:11.5px;font-weight:700">{{tkDecLbl}}</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px"><sc-for list="{{tkWhys}}" as="w" hint-placeholder-count="5"><button class="{{w.cls}}" onClick="{{w.pick}}">{{w.t}}</button></sc-for></div>
    <sc-if value="{{tkWhyOther}}" hint-placeholder-val="{{ false }}"><textarea class="tk-ta" value="{{tkWhyTxt}}" onChange="{{onTkWhyTxt}}" placeholder="اكتب السبب باختصار…"></textarea></sc-if>
    <div class="tk-btns"><sc-if value="{{tkDecDec}}" hint-placeholder-val="{{ true }}"><button class="tk-btn" style="background:var(--bg-xdc2626);border-color:var(--bd-xdc2626);color:var(--fg-xffffff)" onClick="{{tkDecGo}}">إرسال الاعتذار</button></sc-if><sc-if value="{{tkDecStall}}" hint-placeholder-val="{{ false }}"><button class="tk-btn" style="background:var(--warning-bg);border-color:var(--warning-border);color:var(--warning-text)" onClick="{{tkDecGo}}">إبلاغ بالتعثّر</button></sc-if><button class="tk-btn" onClick="{{pfClosePanel}}">رجوع</button></div>
  </div></div>
</div></div>
</sc-if>
<sc-if value="{{pfPanelTkLog}}" hint-placeholder-val="{{ false }}">
<div class="pf-ov" onClick="{{pfOvClose}}"><div class="pf-modal" onClick="{{pfStop}}" role="dialog" style="max-width:720px">
  <div class="pf-head pf-mhd"><div style="flex:1;min-width:0"><b>سجل مهامك</b><small>{{tkLogTitle}} — كل ما أُسند إليك وما أنجزته</small></div><button class="pf-btn" onClick="{{pfClosePanel}}">إغلاق</button></div>
  <div class="pf-mbd">
    <div class="tk-sum" style="padding-top:14px"><div class="tk-m"><small>منجزة</small><b style="color:var(--fg-x059669)">{{tkLogDone}}</b></div><div class="tk-m"><small>في الوقت</small><b style="color:var(--fg-x047857)">{{tkLogOn}}</b></div><div class="tk-m"><small>متأخرة</small><b style="color:var(--fg-xb45309)">{{tkLogLate}}</b></div><div class="tk-m"><small>اعتذار / لم تُقبل</small><b style="color:var(--fg-x94a3b8)">{{tkLogDec}}</b></div></div>
    <div style="padding:10px 16px 4px;display:flex;gap:6px;flex-wrap:wrap;align-items:center"><sc-for list="{{tkLogFilt}}" as="fl" hint-placeholder-count="4"><span class="pf-pill" style="{{fl.style}}" onClick="{{fl.pick}}">{{fl.t}}</span></sc-for><span style="margin-right:auto;display:inline-flex;gap:4px"><button class="pf-btn" onClick="{{tkLogPrev}}" style="height:26px;padding:0 9px">‹ السابق</button><button class="pf-btn" onClick="{{tkLogNext}}" style="height:26px;padding:0 9px">التالي ›</button></span></div>
    <div style="padding:6px 16px 16px;display:flex;flex-direction:column;gap:6px">
      <sc-if value="{{tkLogEmpty}}" hint-placeholder-val="{{ false }}"><div class="tk-empty" style="padding:18px">لا مهام في هذا الشهر بهذا التصنيف</div></sc-if>
      <sc-for list="{{tkLogDays}}" as="dy" hint-placeholder-count="2">
      <div class="tk-log-day">{{dy.label}}</div>
      <sc-for list="{{dy.rows}}" as="q" hint-placeholder-count="2"><div class="tk-row" style="{{q.rowStyle}}" onClick="{{q.open}}"><sc-if value="{{q.thumbOn}}" hint-placeholder-val="{{ false }}"><img class="tk-th" style="width:44px;height:36px" src="{{q.thumb}}" alt="صورة مصغّرة للمهمة"></sc-if><sc-if value="{{q.icoOn}}" hint-placeholder-val="{{ true }}"><span class="tk-ic" style="{{q.icoStyle}}">{{q.ico}}</span></sc-if><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:700">{{q.title}}</div><div style="font-size:10px;color:var(--fg-x94a3b8)">{{q.meta}}</div></div><span class="pf-pill" style="{{q.pillStyle}}">{{q.pill}}</span></div></sc-for>
      </sc-for>
    </div>
  </div>
</div></div>
</sc-if>
<sc-if value="{{pfPanelTkTl}}" hint-placeholder-val="{{ false }}">
<div class="pf-ov" onClick="{{pfOvClose}}"><div class="pf-modal" onClick="{{pfStop}}" role="dialog" style="max-width:540px">
  <div class="pf-head pf-mhd"><div style="flex:1;min-width:0"><b>سجل المهمة</b><small>{{tkTlTitle}} — كل ما جرى عليها بفاعلٍ ووقت</small></div><button class="pf-btn" onClick="{{tkTlBack}}">رجوع</button></div>
  <div class="pf-mbd"><div style="padding:14px 16px 16px;display:flex;flex-direction:column;gap:8px">
    <sc-if value="{{tkTlLoading}}" hint-placeholder-val="{{ false }}"><div class="tk-empty" style="padding:18px">جارٍ تحميل سجل المهمة…</div></sc-if>
    <sc-if value="{{tkTlErr}}" hint-placeholder-val="{{ false }}"><div class="tk-empty" style="padding:18px">تعذّر تحميل سجل المهمة — تحقّق من الاتصال وأعد المحاولة</div></sc-if>
    <sc-if value="{{tkTlEmpty}}" hint-placeholder-val="{{ false }}"><div class="tk-empty" style="padding:18px">لا أحداث مسجّلة لهذه المهمة بعد</div></sc-if>
    <sc-for list="{{tkTlRows}}" as="ev" hint-placeholder-count="3"><div style="display:flex;gap:10px;align-items:flex-start;border:1px solid var(--border-subtle);border-radius:12px;padding:9px 12px;background:var(--bg-surface)"><span style="width:8px;height:8px;border-radius:50%;background:var(--border-brand);margin-top:6px;flex-shrink:0;display:inline-block"></span><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:800">{{ev.txt}} <span style="font-weight:600;color:var(--text-muted)">— {{ev.by}}</span></div><sc-if value="{{ev.why}}" hint-placeholder-val="{{ false }}"><div style="font-size:11px;color:var(--text-secondary);margin-top:2px">{{ev.why}}</div></sc-if><div style="font-size:10px;color:var(--text-faint);margin-top:2px">{{ev.when}}</div><sc-if value="{{ev.whenH}}" hint-placeholder-val="{{ false }}"><div style="font-size:9px;color:var(--text-faint);opacity:.85">{{ev.whenH}}</div></sc-if></div></div></sc-for>
  </div></div>
</div></div>
</sc-if>
