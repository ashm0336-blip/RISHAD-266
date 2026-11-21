<div dir="rtl" data-screen-label="صفحتي" class="pf-root">

<div class="pf-top" style="{{pfTopStyle}}">
  <!-- ═══ بطاقة الهوية وخط سير الوردية ═══ -->
  <div class="pf-card pf-id" style="position:relative;border-radius:20px;padding:22px 24px">
    <div class="pf-glow" aria-hidden="true"></div>
    <div class="pf-idrow" style="display:flex;align-items:center;gap:16px;position:relative;flex-wrap:wrap">
      <div class="pf-ava" aria-hidden="true">{{profInitial}}<span class="pf-ava-dot" style="background:{{statusColor}}"></span></div>
      <div class="pf-idinfo" style="flex:1;min-width:200px">
        <div class="pf-greet" style="font-size:11.5px;color:var(--text-faint);display:flex;align-items:center;gap:5px">
          <sc-if value="{{greetIsDay}}" hint-placeholder-val="{{ true }}"><svg width="12" height="12" sc-camel-view-box="0 0 24 24" fill="none" stroke="var(--fg-xf59e0b)" stroke-width="2" stroke-linecap="round" data-i="i-44d97f3e"></svg></sc-if>
          <sc-if value="{{greetIsNight}}" hint-placeholder-val="{{ false }}"><svg width="12" height="12" sc-camel-view-box="0 0 24 24" fill="none" stroke="var(--fg-xb99751)" stroke-width="2" stroke-linecap="round" data-i="i-b6311d8a"></svg></sc-if>
          <span>{{greeting}} · {{dateLine}}</span>
        </div>
        <div class="pf-name">{{profName}}</div>
        <div class="pf-role">{{roleLine}}<sc-if value="{{statusOn}}" hint-placeholder-val="{{ true }}"> · <span style="color:{{statusColor}};font-weight:700">{{statusTxt}}</span></sc-if></div>
        <sc-if value="{{roleLine2On}}" hint-placeholder-val="{{ false }}"><div class="pf-role pf-role2">{{roleLine2}}</div></sc-if>
      </div>
      <!-- KIVO_264 · أزرارُ الرأس الأربعة («السجل» ← #/profile/history) -->
      <div class="pf-idbtns" role="group" aria-label="ملفي">
        <button class="pf-btn pf-hbtn" onClick="{{pfToggleDept}}" aria-haspopup="dialog" aria-expanded="{{pfDeptOn}}"><svg width="13" height="13" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-1acfc53e"></svg><span>الإدارة</span></button>
        <button class="pf-btn pf-hbtn" onClick="{{pfToggleData}}" aria-haspopup="dialog" aria-expanded="{{pfDataOn}}"><svg width="13" height="13" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-2e178c4d"></svg><span>بياناتي</span></button>
        <button class="pf-btn pf-hbtn" onClick="{{pfToggleAcct}}" aria-haspopup="dialog" aria-expanded="{{pfAcctOn}}"><svg width="13" height="13" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-bff28d36"></svg><span>الأمان</span></button>
        <button class="pf-btn pf-hbtn" data-pf-hist="1" onClick="{{pfToggleHist}}" aria-haspopup="dialog" aria-expanded="{{pfHistOn}}"><svg width="13" height="13" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-0732b330"></svg><span>السجل</span></button>
      </div>
    </div>
    <sc-if value="{{isStaffView}}" hint-placeholder-val="{{ true }}">
    <div style="position:relative">
      <!-- ★ خطٌّ فاصلٌ بعرض البطاقة يفصل الهويّة عن اليوم (بطلب المستخدم) -->
      <div class="pf-hr"></div>
      <!-- بطاقات اليوم بوسم مصدرها (KIVO_264) -->
      <div class="{{pfFactsCls}}" aria-busy="{{pfFactsBusy}}" style="display:grid;grid-template-columns:{{pfFactsCols}};gap:8px">
        <sc-for list="{{pfFacts}}" as="f" hint-placeholder-count="5">
        <div class="pf-fact {{f.cls}}" data-pf-fact="{{f.k}}" onClick="{{f.open}}" title="{{f.tip}}" aria-label="{{f.aria}}" style="cursor:pointer">
          <span class="pf-fact-go" aria-hidden="true"><svg width="10" height="10" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" data-i="i-e39e12c6"></svg></span>
          <span class="pf-fico" aria-hidden="true"><svg width="14" height="14" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-3b603edb"></svg></span>
          <div class="pf-flbl">{{f.l}}</div>
          <div class="pf-fval">{{f.v}}</div>
          <sc-if value="{{f.subOn}}" hint-placeholder-val="{{ false }}"><div class="pf-fsub">{{f.sub}}</div></sc-if>
        </div>
        </sc-for>
      </div>
      <sc-if value="{{pfFactsNoteOn}}" hint-placeholder-val="{{ false }}"><div class="{{pfFactsNoteCls}}" data-pf-fnote="1" role="status"><span>{{pfFactsNote}}</span><sc-if value="{{pfFactsRetryOn}}" hint-placeholder-val="{{ false }}"><button class="pf-linkbtn" onClick="{{pfFactsNoteGo}}">أعد المحاولة</button></sc-if></div></sc-if>
    </div>
    </sc-if>
  </div>

  <sc-if value="{{isStaffView}}" hint-placeholder-val="{{ true }}">
  <sc-if value="{{bsMapOn}}" hint-placeholder-val="{{ true }}">
  <!-- ═══ موقعك اليوم + رصد الميدان ═══ -->
  <div class="pf-card pf-mapcard" style="border-radius:20px;display:flex;flex-direction:column;min-height:0">
    <div class="pf-head" style="border-bottom:0;padding-bottom:0"><div style="flex:1;min-width:0"><b>موقعك اليوم<sc-if value="{{mapFloor}}" hint-placeholder-val="{{ true }}"> — {{mapFloor}}</sc-if></b><small>{{mapSub}}</small></div></div>
    <div class="pf-map">
      <sc-if value="{{mapHas}}" hint-placeholder-val="{{ true }}">
      <svg sc-camel-view-box="0 0 1000 600" sc-camel-preserve-aspect-ratio="xMidYMid meet" data-i="i-b9c83585"></svg>
      <sc-if value="{{mapHasMine}}" hint-placeholder-val="{{ false }}"><div class="pf-mine" style="left:{{mapMine.lx}}%;top:{{mapMine.ty}}%">{{mapMine.label}}</div></sc-if>
      </sc-if>
      <sc-if value="{{mapUnavailable}}" hint-placeholder-val="{{ false }}"><div class="pf-mapmsg">الخريطة غير متاحة بصلاحياتك الحالية<span>تُعرض بيانات إسنادك المتاحة في بطاقة موقعك اليوم</span></div></sc-if>
      <sc-if value="{{mapNoRound}}" hint-placeholder-val="{{ false }}"><div class="pf-mapmsg">لا جولة لليوم بعد<span>تُنشأ جولة اليوم من المتابعة اليومية أو عند سحب التقرير اليومي</span></div></sc-if>
      <sc-if value="{{mapEmpty}}" hint-placeholder-val="{{ false }}"><div class="pf-mapmsg">جولة اليوم بلا أبواب أو معالم مرسومة</div></sc-if>
    </div>
    <!-- ═══ رصد الميدان — لحامل ورقة «رصد الميدان» المسكَّن على باب في جولة اليوم ═══ -->
    <sc-if value="{{fdNoteOn}}" hint-placeholder-val="{{ false }}">
    <div class="fd fd-note" data-fd-note="1"><div class="fd-ph"><b>رصد الميدان</b></div><div class="fd-note-t">{{fdNote}}</div></div>
    </sc-if>
    <sc-if value="{{fdOn}}" hint-placeholder-val="{{ false }}">
    <div class="fd">
      <div class="fd-ph"><b>رصد الميدان</b><span class="fd-pill">{{fdPill}}</span></div>
      <div class="fd-sec" style="display:flex;flex-direction:column;gap:7px">
        <sc-for list="{{fdRows}}" as="r" hint-placeholder-count="1">
        <div class="fd-row">
          <span class="fd-chip" style="background:{{r.color}};box-shadow:inset 0 0 0 1px {{r.color}}"></span>
          <div class="fd-nm"><p class="fd-n1">{{r.name}}</p><p class="fd-n2" dir="auto">{{r.meta}}</p></div>
          <sc-if value="{{r.flowOn}}" hint-placeholder-val="{{ true }}">
          <span class="{{r.flCls}}">
            <sc-for list="{{r.flows}}" as="f" hint-placeholder-count="3">
            <button class="{{f.cls}}" onClick="{{f.pick}}" title="{{f.t}}">
              <sc-if value="{{f.one}}" hint-placeholder-val="{{ true }}"><span class="{{f.arCls}}">{{f.a}}</span></sc-if>
              <sc-if value="{{f.two}}" hint-placeholder-val="{{ false }}"><span class="fd-stk"><span class="fd-ar">←</span><span class="fd-ar r">→</span></span></sc-if>
            </button>
            </sc-for>
          </span>
          </sc-if>
          <button class="{{r.stCls}}" onClick="{{r.stPick}}" title="{{r.stTitle}}">
            <sc-if value="{{r.stOn}}" hint-placeholder-val="{{ true }}"><svg width="13" height="13" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" data-i="i-bad807cf"></svg></sc-if>
            <sc-if value="{{r.stOff}}" hint-placeholder-val="{{ false }}"><svg width="13" height="13" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" data-i="i-823d20ec"></svg></sc-if>
          </button>
        </div>
        </sc-for>
      </div>
    </div>
    </sc-if>
    <!-- حوار سبب الإغلاق -->
    <sc-if value="{{fdDlgOn}}" hint-placeholder-val="{{ false }}">
    <div class="fd-ov" onClick="{{fdDlgNo}}">
      <div class="fd-dlg" onClick="{{fdStop}}" role="dialog">
        <div class="fd-dh"><div class="fd-ic"><svg width="18" height="18" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-e3e3cc65"></svg></div><div><b>إغلاق {{fdSpot}}</b><small>يصل التنبيه فوراً لرئيس الوردية ومدير الإدارة</small></div></div>
        <div class="fd-db">
          <div><div class="fd-lbl">سبب الإغلاق</div><div class="fd-chips">
            <sc-for list="{{fdReasons}}" as="r" hint-placeholder-count="5"><button class="{{r.cls}}" onClick="{{r.pick}}">{{r.t}}</button></sc-for>
          </div></div>
          <textarea class="fd-ta" value="{{fdWhyTxt}}" onChange="{{fdOnWhy}}" placeholder="{{fdWhyPh}}"></textarea>
          <div class="fd-auto">ساعة الإغلاق تُسجَّل تلقائياً: <b>{{fdNow}}</b> · بواسطة {{fdMe}}</div>
        </div>
        <div class="fd-df"><button class="pf-btn fd-ok" onClick="{{fdDlgOk}}" disabled="{{fdOkDis}}">تسجيل الإغلاق</button><button class="pf-btn" onClick="{{fdDlgNo}}">إلغاء</button></div>
      </div>
    </div>
    </sc-if>
    <div class="pf-maplg"><span>{{mapLegend}}</span></div>
  </div>
  </sc-if>
  </sc-if>
</div>

<!-- ═══ منبثقات بطاقات اليوم ═══ -->
<sc-if value="{{pfPanelDay}}" hint-placeholder-val="{{ false }}">
<div class="pf-ov" onClick="{{pfOvClose}}"><div class="pf-modal" onClick="{{pfStop}}" role="dialog" aria-modal="true" aria-label="يومك" style="max-width:720px">
  <div class="pf-head pf-mhd"><div style="flex:1;min-width:0"><b>يومك</b><small>{{daySub}}</small></div><button class="pf-btn" onClick="{{pfClosePanel}}">إغلاق</button></div>
  <div class="pf-mbd"><div style="padding:6px 20px 18px">
      <div style="height:8px"></div>
      <!-- خطّ سير الوردية -->
      <sc-if value="{{hasTime}}" hint-placeholder-val="{{ true }}">
      <div class="pf-tlw">
        <sc-if value="{{tlOn}}" hint-placeholder-val="{{ true }}">
        <div class="pf-tlchip" style="right:{{tlFill}}%">{{tlNow}}</div>
        </sc-if>
        <div class="pf-tl">
          <div class="pf-tl-fill" style="width:{{tlFill}}%"></div>
          <sc-for list="{{ticks}}" as="tk" hint-placeholder-count="5">
            <div class="pf-tl-tk" style="right:{{tk.pct}}%"></div>
            <div class="pf-tk {{tk.cls}}" style="right:calc({{tk.pct}}% + 5px)">{{tk.lbl}}</div>
          </sc-for>
          <sc-if value="{{tlOn}}" hint-placeholder-val="{{ true }}">
          <div class="pf-tl-edge" style="right:{{tlFill}}%"></div>
          </sc-if>
        </div>
      </div>
      </sc-if>
      <sc-if value="{{tlHint}}" hint-placeholder-val="{{ false }}"><div class="pf-tlhint">{{tlHint}}</div></sc-if>
      <!-- ★ صندوق اليوم: حالة الوردية · زمنها · مصدر بياناتها — في إطارٍ واحد -->
      <sc-if value="{{dayBoxOn}}" hint-placeholder-val="{{ true }}">
      <div class="pf-note" data-pf-daybox="1">
        <span class="pf-note-ic"><svg width="13" height="13" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-d81dfaae"></svg></span>
        <div class="pf-note-tx">
          <sc-if value="{{dayB1On}}" hint-placeholder-val="{{ true }}"><div class="pf-nb1" style="color:{{dayB1C}}">{{dayB1}}</div></sc-if>
          <sc-if value="{{dayB2On}}" hint-placeholder-val="{{ false }}"><div class="pf-nb2">{{dayB2}}</div></sc-if>
          <sc-if value="{{dayB3On}}" hint-placeholder-val="{{ true }}"><div class="pf-nb3">{{dayB3}}</div></sc-if>
        </div>
      </div>
      </sc-if>
  </div></div>
</div></div>
</sc-if>
<!-- ═══ «تفاصيل موقعك» (KIVO_264 · OD-4/OD-5) ═══ -->
<sc-if value="{{pfPanelSpot}}" hint-placeholder-val="{{ false }}">
<div class="pf-ov" onClick="{{pfOvClose}}"><div class="pf-modal" onClick="{{pfStop}}" role="dialog" aria-modal="true" aria-label="تفاصيل موقعك" style="max-width:760px">
  <div class="pf-head pf-mhd"><div style="flex:1;min-width:0"><b>تفاصيل موقعك</b><small>{{spotSub}}</small></div><button class="pf-btn" onClick="{{pfClosePanel}}">إغلاق</button></div>
  <div class="pf-mbd"><div class="pf-spot">
    <sc-for list="{{spotRows}}" as="x" hint-placeholder-count="2">
    <div class="pf-srow" data-pf-spot="{{x.k}}"><span class="{{x.evCls}}">{{x.evl}}</span><div class="pf-srow-tx"><small>{{x.l}}</small><b>{{x.v}}</b><sc-if value="{{x.sOn}}" hint-placeholder-val="{{ false }}"><i>{{x.s}}</i></sc-if><sc-if value="{{x.srcOn}}" hint-placeholder-val="{{ false }}"><em>{{x.src}}</em></sc-if></div></div>
    </sc-for>
    <sc-if value="{{spotMapOn}}" hint-placeholder-val="{{ false }}">
    <div class="pf-map pf-map-in">
      <sc-if value="{{mapHas}}" hint-placeholder-val="{{ true }}">
      <svg sc-camel-view-box="0 0 1000 600" sc-camel-preserve-aspect-ratio="xMidYMid meet" data-i="i-b9c83585"></svg>
      <sc-if value="{{mapHasMine}}" hint-placeholder-val="{{ false }}"><div class="pf-mine" style="left:{{mapMine.lx}}%;top:{{mapMine.ty}}%">{{mapMine.label}}</div></sc-if>
      </sc-if>
      <sc-if value="{{mapUnavailable}}" hint-placeholder-val="{{ false }}"><div class="pf-mapmsg">الخريطة غير متاحة بصلاحياتك الحالية<span>تُعرض بيانات إسنادك المتاحة في بطاقة موقعك اليوم</span></div></sc-if>
      <sc-if value="{{mapNoRound}}" hint-placeholder-val="{{ false }}"><div class="pf-mapmsg">لا جولة لليوم بعد</div></sc-if>
      <sc-if value="{{mapEmpty}}" hint-placeholder-val="{{ false }}"><div class="pf-mapmsg">جولة اليوم بلا أبواب أو معالم مرسومة</div></sc-if>
    </div>
    <div class="pf-maplg pf-maplg-in"><span>{{mapLegend}}</span></div>
    </sc-if>
    <div class="pf-smates" data-pf-mates="1">
      <div class="pf-smh"><b>زملاؤك على الموقع</b><small>{{spotMatesSub}}</small></div>
      <div class="pf-chips">
        <sc-for list="{{spotMates}}" as="c" hint-placeholder-count="3"><span class="pf-chip"><i aria-hidden="true">{{c.i}}</i>{{c.n}}</span></sc-for>
        <sc-if value="{{spotMoreOn}}" hint-placeholder-val="{{ false }}"><button class="pf-btn pf-more" onClick="{{spotMoreGo}}" aria-label="اعرض بقية الزملاء">{{spotMore}}</button></sc-if>
        <sc-if value="{{spotRestOn}}" hint-placeholder-val="{{ false }}"><span class="pf-faint">{{spotRest}}</span></sc-if>
        <sc-if value="{{spotMatesNone}}" hint-placeholder-val="{{ false }}"><span class="pf-faint">{{spotMatesTxt}}</span></sc-if>
      </div>
    </div>
    <div class="pf-snote">{{spotNote}}</div>
    <sc-if value="{{spotDailyOn}}" hint-placeholder-val="{{ false }}"><div class="pf-sacts"><button class="pf-btn" onClick="{{spotDaily}}">افتح في المتابعة اليومية ←</button></div></sc-if>
  </div></div>
</div></div>
</sc-if>
<sc-if value="{{pfPanelWhy}}" hint-placeholder-val="{{ false }}">
<div class="pf-ov" onClick="{{pfOvClose}}"><div class="pf-modal" onClick="{{pfStop}}" role="dialog" aria-modal="true" aria-label="{{whyHead}}" style="max-width:560px">
  <div class="pf-head pf-mhd"><div style="flex:1;min-width:0"><b>{{whyHead}}</b><small>{{whyHeadSub}}</small></div><button class="pf-btn" onClick="{{pfClosePanel}}">إغلاق</button></div>
  <div class="pf-mbd"><div class="pf-why">
    <span class="pf-why-ic" style="background:{{whyBg}};color:{{whyC}}"><svg width="26" height="26" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-49411f48"></svg></span>
    <div class="pf-why-t" style="color:{{whyC}}">{{whyTitle}}</div>
    <sc-if value="{{whySub}}" hint-placeholder-val="{{ false }}"><div class="pf-why-s">{{whySub}}</div></sc-if>
    <sc-if value="{{whyLinesOn}}" hint-placeholder-val="{{ true }}"><div class="pf-why-ls">
      <sc-for list="{{whyLines}}" as="w" hint-placeholder-count="2"><div class="pf-why-l"><i style="background:{{whyC}}"></i><span>{{w.t}}</span></div></sc-for>
    </div></sc-if>
    <sc-if value="{{whySrc}}" hint-placeholder-val="{{ false }}"><div class="pf-why-src">{{whySrc}}</div></sc-if>
  </div></div>
</div></div>
</sc-if>
<sc-if value="{{pfPanelWeek}}" hint-placeholder-val="{{ false }}">
<div class="pf-ov" onClick="{{pfOvClose}}"><div class="pf-modal" onClick="{{pfStop}}" role="dialog" aria-modal="true" aria-label="أسبوعك" style="max-width:720px">
  <div class="pf-head pf-mhd"><div style="flex:1;min-width:0"><b>أسبوعك</b><small>{{weekSub}}</small></div><button class="pf-btn" onClick="{{pfClosePanel}}">إغلاق</button></div>
  <div class="pf-mbd">
  <div class="pf-wk">
      <div style="padding:12px 16px">
        <!-- KIVO_264 · طبقتان: المجدول والفعلي -->
        <div class="pf-week">
          <sc-for list="{{week}}" as="w" hint-placeholder-count="7">
          <button class="{{w.cls}}" onClick="{{w.pick}}" disabled="{{w.dis}}" title="{{w.full}}" aria-label="{{w.full}}"><b>{{w.txt}}</b><small>{{w.sub}}</small><span class="pf-wd-n">{{w.wd}}</span></button>
          </sc-for>
        </div>
        <div class="pf-legend">{{weekLegend}}</div>
        <sc-if value="{{restBoxOn}}" hint-placeholder-val="{{ true }}">
        <div class="pf-restdays"><svg width="13" height="13" sc-camel-view-box="0 0 24 24" fill="none" stroke="var(--fg-x64748b)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0" data-i="i-04697a02"></svg><b>أيام راحتك المجدولة:</b>
          <sc-if value="{{restDaysNone}}" hint-placeholder-val="{{ false }}"><span class="pf-faint">{{restNone}}</span></sc-if>
          <sc-for list="{{restDays}}" as="rd" hint-placeholder-count="2"><span class="{{rd.cls}}" title="{{rd.tip}}"><i></i>{{rd.n}}</span></sc-for>
          <sc-if value="{{restNext}}" hint-placeholder-val="{{ false }}"><span class="pf-faint" style="margin-right:auto">{{restNext}}</span></sc-if>
        </div>
        <sc-if value="{{restSrcOn}}" hint-placeholder-val="{{ false }}"><div class="pf-legend">{{restSrc}}</div></sc-if>
        </sc-if>
        <div class="pf-stats pf-monst">
          <span class="pf-faint">{{monTitle}}:</span>
          <sc-for list="{{monStats}}" as="m" hint-placeholder-count="4"><span class="{{m.cls}}"><b>{{m.v}}</b> {{m.l}}</span></sc-for>
          <sc-if value="{{goWeekOn}}" hint-placeholder-val="{{ true }}"><button class="pf-linkbtn" data-pf-goweek="1" onClick="{{goWeek}}">{{goWeekTxt}}</button></sc-if>
        </div>
      </div>
    </div>
  </div>
</div></div>
</sc-if>

<!-- ═══ «الإدارة» — عرضٌ فقط ═══ -->
<sc-if value="{{pfPanelDept}}" hint-placeholder-val="{{ false }}">
<div class="pf-ov" onClick="{{pfOvClose}}"><div class="pf-modal" onClick="{{pfStop}}" role="dialog" aria-modal="true" aria-label="الإدارة">
  <div class="pf-head pf-mhd"><div style="flex:1;min-width:0"><b>الإدارة</b><small>{{pfDeptSub}}</small></div><button class="pf-btn" onClick="{{pfClosePanel}}">إغلاق</button></div>
  <div class="pf-mbd">
  <div class="pf-info">
    <sc-for list="{{pfDeptInfo}}" as="f" hint-placeholder-count="8">
    <sc-if value="{{f.hd}}" hint-placeholder-val="{{ false }}"><div class="pf-info-hd">{{f.l}}</div></sc-if>
    <sc-if value="{{f.v}}" hint-placeholder-val="{{ true }}"><div class="pf-info-it" data-pf-dept="{{f.k}}" data-wide="{{f.w}}" data-half="{{f.h}}"><span class="pf-info-ic"><svg width="15" height="15" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" data-i="i-5cb0bf3b"></svg></span><span class="pf-info-tx"><small>{{f.l}}</small><b class="{{f.cls}}" dir="{{f.dir}}">{{f.v}}</b><sc-if value="{{f.s}}" hint-placeholder-val="{{ false }}"><i>{{f.s}}</i></sc-if></span></div></sc-if>
    </sc-for>
  </div>
  <div class="pf-info-note"><svg width="13" height="13" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-fd04beb6"></svg><span>هذه العلاقاتُ تُسندها الإدارة ولا تُعدَّل من هنا — بياناتُك الشخصية والوظيفية في «بياناتي».</span></div>
  </div>
</div></div>
</sc-if>

<!-- ═══ «بياناتي» و«الأمان» ═══ -->
<sc-if value="{{pfPanelData}}" hint-placeholder-val="{{ false }}">
<div class="pf-ov" onClick="{{pfOvClose}}"><div class="pf-modal" onClick="{{pfStop}}" role="dialog" aria-modal="true" aria-label="بياناتي">
  <div class="pf-head pf-mhd"><div style="flex:1;min-width:0"><b>بياناتي</b><small>{{pfDataSub}}</small></div><button class="pf-btn" onClick="{{pfClosePanel}}">إغلاق</button></div>
  <div class="pf-mbd">
  <sc-if value="{{pfReadOnly}}" hint-placeholder-val="{{ true }}">
  <div class="pf-info">
    <sc-for list="{{pfInfo}}" as="f" hint-placeholder-count="10">
    <sc-if value="{{f.hd}}" hint-placeholder-val="{{ false }}"><div class="pf-info-hd">{{f.l}}</div></sc-if>
    <sc-if value="{{f.v}}" hint-placeholder-val="{{ true }}"><div class="pf-info-it" data-pf-info="{{f.k}}" data-wide="{{f.w}}"><span class="pf-info-ic"><svg width="15" height="15" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" data-i="i-5cb0bf3b"></svg></span><span class="pf-info-tx"><small>{{f.l}}</small><b class="{{f.cls}}" dir="{{f.dir}}">{{f.v}}</b><sc-if value="{{f.s}}" hint-placeholder-val="{{ false }}"><i>{{f.s}}</i></sc-if></span></div></sc-if>
    </sc-for>
  </div>
  <sc-if value="{{pfInfoMissOn}}" hint-placeholder-val="{{ false }}"><div class="pf-info-miss" data-pf-miss="1">{{pfInfoMiss}}</div></sc-if>
  <div class="pf-info-note"><svg width="13" height="13" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-fd04beb6"></svg><span>{{pfInfoNote}}</span></div>
  </sc-if>
  <sc-if value="{{pfEditable}}" hint-placeholder-val="{{ false }}">
  <div class="pf-form">
    <sc-if value="{{pfNameEdit}}" hint-placeholder-val="{{ true }}"><div><label>الاسم الكامل *</label><input value="{{pfName}}" onChange="{{onPfName}}" placeholder="اسمك الكامل"></div></sc-if>
    <sc-if value="{{pfNameRO}}" hint-placeholder-val="{{ false }}"><div><label>الاسم الكامل — يعدّله مسؤول المنصة</label><div class="pf-fixed" data-pf-name-ro="1">{{pfName}}</div></div></sc-if>
    <div><label>الدور — يحدده نوع الحساب</label><div class="pf-fixed">{{pfRoleFixed}}</div></div>
    <div><label>البريد الإلكتروني</label><input value="{{pfEmail}}" onChange="{{onPfEmail}}" dir="ltr" placeholder="name@example.com" style="text-align:left"></div>
    <div><label>رقم الجوال</label><input value="{{pfPhone}}" onChange="{{onPfPhone}}" dir="ltr" placeholder="05xxxxxxxx" style="text-align:left"></div>
    <div style="grid-column:1 / -1;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <button class="pf-btn pri" onClick="{{pfSave}}" style="height:38px;padding:0 22px;font-size:13px">حفظ البيانات</button>
      <sc-if value="{{pfMsg}}" hint-placeholder-val="{{ false }}"><span class="{{pfMsgCls}}" role="status">{{pfMsg}}</span></sc-if>
    </div>
  </div>
  </sc-if>
  </div>
</div></div>
</sc-if>
<sc-if value="{{pfPanelAcct}}" hint-placeholder-val="{{ false }}">
<div class="pf-ov" onClick="{{pfOvClose}}"><div class="pf-modal" onClick="{{pfStop}}" role="dialog" aria-modal="true" aria-label="الأمان">
  <div class="pf-head pf-mhd"><div style="flex:1"><b>الأمان</b><small>بيانات دخولك وجلساتك — لك وحدك</small></div><button class="pf-btn" onClick="{{pfClosePanel}}">إغلاق</button></div>
  <div class="pf-mbd">
  <div class="pf-sec">
  <!-- بيانات الدخول -->
  <div class="pf-sub">
  <div class="pf-sub-hd"><b>بيانات الدخول</b><small>{{pfAccSub}}</small></div>
  <div class="pf-form">
    <!-- اسمُ الدخول: عرضٌ للموظف ومدير الإدارة؛ ولمدير النظام بكلمة مروره الحالية (KIVO_264 · D13) -->
    <sc-if value="{{pfUnLocked}}" hint-placeholder-val="{{ false }}"><div><label>اسم المستخدم — رقم هويتك أو جوالك</label><div dir="ltr" class="pf-fixed pf-fixed-un">{{pfUn}}</div></div></sc-if>
    <sc-if value="{{pfUnEditable}}" hint-placeholder-val="{{ true }}"><div><label>اسم المستخدم — رقم الجوال أو الهوية (10 أرقام) *</label><input value="{{pfUn}}" onChange="{{onPfUn}}" dir="ltr" inputMode="numeric" placeholder="05XXXXXXXX" style="text-align:left"></div></sc-if>
    <div><label>كلمة المرور الحالية *</label><input value="{{pfCur}}" onChange="{{onPfCur}}" type="password" dir="ltr" inputMode="numeric" placeholder="••••••" style="text-align:left"></div>
    <div><label>كلمة المرور الجديدة — <span class="{{pfPwHintCls}}">{{pfPwHint}}</span></label><input value="{{pfNew}}" onChange="{{onPfNew}}" type="password" dir="ltr" inputMode="numeric" placeholder="أرقام فقط" style="text-align:left"></div>
    <div><label>تأكيد كلمة المرور الجديدة</label><input value="{{pfNew2}}" onChange="{{onPfNew2}}" type="password" dir="ltr" inputMode="numeric" placeholder="أعد كتابته" style="text-align:left"></div>
    <div style="grid-column:1 / -1;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <button class="pf-btn pf-dark" onClick="{{pfAccSave}}" style="height:38px;padding:0 22px;font-size:13px">{{pfAccBtn}}</button>
      <sc-if value="{{pfAccMsg}}" hint-placeholder-val="{{ false }}"><span class="{{pfAccMsgCls}}" role="status">{{pfAccMsg}}</span></sc-if>
    </div>
  </div>
  </div>
  <!-- الجلسات والنشاط -->
  <div class="pf-sub">
  <div class="pf-sub-hd"><b>الجلسات والنشاط</b><small>{{secSub}}</small></div>
      <div style="padding:12px 14px;display:flex;flex-direction:column;gap:8px;font-size:11.5px">
        <sc-for list="{{sess}}" as="x" hint-placeholder-count="2">
        <div style="display:flex;align-items:center;gap:8px">
          <span class="pf-muted" style="display:inline-flex">
            <sc-if value="{{x.isM}}" hint-placeholder-val="{{ false }}"><svg width="14" height="14" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-0fc3b909"></svg></sc-if>
            <sc-if value="{{x.isD}}" hint-placeholder-val="{{ true }}"><svg width="14" height="14" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-dc79b3fe"></svg></sc-if>
          </span>
          <span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{x.dev}}<sc-if value="{{x.where}}" hint-placeholder-val="{{ true }}"> · {{x.where}}</sc-if> <span class="pf-faint">· {{x.when}}</span><sc-if value="{{x.since}}" hint-placeholder-val="{{ true }}"> <span class="pf-faint">· {{x.since}}</span></sc-if><sc-if value="{{x.last}}" hint-placeholder-val="{{ false }}"> <span class="pf-faint">· {{x.last}}</span></sc-if></span>
          <sc-if value="{{x.mine}}" hint-placeholder-val="{{ true }}"><span class="pf-pill pf-pill-ok">الحالية</span></sc-if>
          <sc-if value="{{x.canKill}}" hint-placeholder-val="{{ false }}"><button class="pf-btn pf-danger" onClick="{{x.kill}}" style="height:26px;padding:0 10px;font-size:11px" aria-label="إنهاء هذه الجلسة">إنهاء</button></sc-if>
        </div>
        </sc-for>
        <sc-for list="{{secEv}}" as="e" hint-placeholder-count="2">
        <div class="{{e.cls}}"><svg width="14" height="14" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0" data-i="i-5b6c7d90"></svg><span style="flex:1;min-width:0">{{e.t}}</span></div>
        </sc-for>
        <sc-if value="{{sessHasOthers}}" hint-placeholder-val="{{ false }}"><div class="pf-sess-x">
          <button class="pf-btn pf-danger" onClick="{{pfKillOthers}}">{{sessKillTxt}}</button>
        </div></sc-if>
      </div>
  </div>
  </div>
  </div>
</div></div>
</sc-if>

<!-- ═══ «السجل» (KIVO_264) ═══ -->
<sc-if value="{{pfPanelHist}}" hint-placeholder-val="{{ false }}">
<div class="pf-ov" onClick="{{pfOvClose}}"><div class="pf-modal pf-histm" onClick="{{pfStop}}" role="dialog" aria-modal="true" aria-label="السجل" data-pf-histpanel="1">
  <div class="pf-head pf-mhd"><div style="flex:1;min-width:0"><b>السجل</b><small>{{histSub}}</small></div><button class="pf-btn" onClick="{{pfClosePanel}}">إغلاق</button></div>
  <div class="pf-mbd">
    <div class="pf-hnav">
      <button class="pf-btn" onClick="{{histPrev}}" disabled="{{histPrevDis}}" aria-label="الشهر السابق">‹ السابق</button>
      <b class="pf-hmon" data-pf-hmon="1">{{histTitle}}</b>
      <button class="pf-btn" onClick="{{histNext}}" disabled="{{histNextDis}}" aria-label="الشهر التالي">التالي ›</button>
    </div>
    <div class="pf-hfs" role="group" aria-label="نوع السجل">
      <sc-for list="{{histFilters}}" as="h" hint-placeholder-count="8"><button class="{{h.cls}}" aria-pressed="{{h.on}}" onClick="{{h.pick}}">{{h.t}}</button></sc-for>
    </div>
    <sc-if value="{{histLoading}}" hint-placeholder-val="{{ false }}"><div class="pf-hstate">جارٍ تحميل السجل…</div></sc-if>
    <sc-if value="{{histErrOn}}" hint-placeholder-val="{{ false }}"><div class="pf-hstate bad" role="alert"><span>{{histErrTxt}}</span><button class="pf-btn" onClick="{{histRetry}}">أعد المحاولة</button></div></sc-if>
    <sc-if value="{{histNoteOn}}" hint-placeholder-val="{{ false }}"><div class="pf-hnote">{{histNote}}</div></sc-if>
    <sc-if value="{{histGridOn}}" hint-placeholder-val="{{ false }}">
    <div class="pf-hgrid" data-pf-hgrid="1">
      <sc-for list="{{histGrid}}" as="g" hint-placeholder-count="30"><div class="{{g.cls}}" title="{{g.tip}}"><b>{{g.d}}</b><span>{{g.txt}}</span><i>{{g.wd}}</i></div></sc-for>
    </div>
    <div class="pf-legend">الإطار المنقّط: راحةٌ مجدولة (مشتقّة من نمط الأسبوع) · الرمز: الحالة المسجّلة في التقرير اليومي (✓ حاضر · غ غائب · م مستأذن · إ إجازة · ⇄ محوَّل · ر راحة) · الحدُّ الأخضر: تقريرٌ معتمد · — لا تقرير</div>
    </sc-if>
    <sc-for list="{{histSections}}" as="s" hint-placeholder-count="3">
    <div class="pf-hsec" data-hist="{{s.key}}">
      <b class="pf-hsec-t">{{s.title}}</b>
      <sc-for list="{{s.items}}" as="x" hint-placeholder-count="2">
      <div class="pf-hit"><span class="{{x.evCls}}">{{x.evl}}</span><div class="pf-hit-tx"><p>{{x.t}}</p><sc-if value="{{x.subOn}}" hint-placeholder-val="{{ false }}"><small>{{x.sub}}</small></sc-if></div></div>
      </sc-for>
    </div>
    </sc-for>
    <sc-if value="{{histSourcesOn}}" hint-placeholder-val="{{ false }}"><div class="pf-hsrc">{{histSources}}</div></sc-if>
    <div class="pf-hlegend"><span>وسومُ الدليل:</span><sc-for list="{{histLegend}}" as="l" hint-placeholder-count="6"><span class="{{l.cls}}">{{l.t}}</span></sc-for></div>
  </div>
</div></div>
</sc-if>

@@SYS:profile.view.popups.tasks@@<div class="pf-body" style="grid-template-columns:1fr">
  <div class="pf-col">

@@SYS:profile.view.card.tasks@@  </div>
</div>
</div>
