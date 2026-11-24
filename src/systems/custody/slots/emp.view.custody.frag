<sc-if value="{{empOnCustody}}" hint-placeholder-val="{{ false }}">

<div style="display:flex;flex-direction:column;gap:16px">

<!-- ═══ شريط التقويم المعتمد — نسخة طبق الأصل من شريط الجدول الشهري ═══ -->
<div style="border-radius:16px;border:1px solid var(--bd-a185151810p2);background:var(--bg-xffffff);box-shadow:var(--shadow-card);overflow:hidden">
  <div class="bs-hbar" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 12px;border-bottom:1px solid var(--bd-a185151810p1);background:linear-gradient(to left,var(--bg-a185151810p05),transparent,var(--bg-a185151810p05));flex-wrap:wrap">
    <div style="display:flex;align-items:center;gap:4px">
      <button onClick="{{cuPrevYear}}" title="السنة السابقة" style="width:28px;height:28px;border-radius:8px;border:0;background:transparent;color:var(--fg-x53565a);cursor:pointer;display:flex;align-items:center;justify-content:center" style-hover="background:var(--bg-xf5f5f5)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-870cde61"></svg></button>
      <div style="display:flex;flex-direction:column;align-items:center;min-width:110px">
        <span style="font-weight:400;font-size:14px;color:var(--fg-xb99751);line-height:1.3">{{cuYearLabel}}</span>
        <span style="font-size:10px;color:var(--fg-x53565a);line-height:1.3;font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{cuGregRange}}</span>
      </div>
      <button onClick="{{cuNextYear}}" title="السنة التالية" style="width:28px;height:28px;border-radius:8px;border:0;background:transparent;color:var(--fg-x53565a);cursor:pointer;display:flex;align-items:center;justify-content:center" style-hover="background:var(--bg-xf5f5f5)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-5ff99641"></svg></button>
      <button onClick="{{cuGoCurrent}}" style="height:28px;padding:0 8px;font-size:11px;color:var(--fg-x53565a);background:transparent;border:0;border-radius:8px;cursor:pointer;font-family:'Cairo',sans-serif" style-hover="color:var(--fg-xb99751)">الحالية</button>
    </div>
    <div style="display:flex;align-items:center;gap:8px">
      <span style="{{cuBadgeStyle}}">{{cuBadgeLabel}}</span>
    </div>
  </div>
  <div class="bs-hscroll" style="overflow-x:auto">
    <div style="display:flex;gap:12px;padding:16px 12px;min-width:100%;box-sizing:border-box">
      <!-- V7 · 53 تقويم (§7 · day_card_design): كرتُ الشهر من المكوّن الواحد KIVO.BassamCalCard — الميلاديُّ وتحته المدى الهجري، وحالتان فقط -->
      <sc-for list="{{cuMonths}}" as="m" hint-placeholder-count="12">
      <div style="position:relative;flex:1 1 auto;min-width:64px;display:flex">{{m.card}}</div>
      </sc-for>
    </div>
  </div>
</div>



<!-- ═══ معالج سند التسليم — ثلاث خطوات ═══ -->
<sc-if value="{{wzOn}}" hint-placeholder-val="{{ false }}">
<div onClick="{{wzCancel}}" style="position:fixed;inset:0;z-index:80;background:var(--bg-a0000p5);display:flex;align-items:center;justify-content:center;padding:24px">
  <div onClick="{{stopClick}}" style="background:var(--bg-xffffff);border-radius:16px;box-shadow:var(--shadow-elevated);width:100%;max-width:660px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden">
    <div class="es-wzhd" style="display:flex;align-items:center;flex-wrap:wrap;gap:10px 11px;padding:16px 20px;border-bottom:1px solid var(--bd-xf1f5f9)">
      <div style="width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--bg-a185151810p1);border:1px solid var(--bd-a185151810p25);color:var(--fg-xb99751);flex-shrink:0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-7ae7d78f"></svg>
      </div>
      <div style="flex:1 1 150px;min-width:0">
        <div style="font-size:15px;font-weight:600;color:var(--fg-x141414)">سند تسليم عهدة جديد</div>
        <div style="font-size:11px;color:var(--fg-x94a3b8);font-weight:400;margin-top:2px">{{wzHint}}</div>
      </div>
      <div class="es-wzst" style="display:flex;align-items:center;gap:7px">
        <sc-for list="{{wzSteps}}" as="st" hint-placeholder-count="3">
        <span style="display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:600;white-space:nowrap;color:{{st.col}}">
          <span style="{{st.badge}}">{{st.n}}</span>{{st.name}}
        </span>
        </sc-for>
      </div>
    </div>

    <div style="flex:1;min-height:0;overflow-y:auto;padding:16px 20px">
      <sc-if value="{{wzS1}}" hint-placeholder-val="{{ true }}">
        <div style="position:relative;margin-bottom:11px">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--fg-x94a3b8)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;right:12px;top:50%;transform:translateY(-50%)" data-i="i-7133b944"></svg>
          <input value="{{wzQ}}" onChange="{{wzSetQ}}" placeholder="ابحث عن الموظف بالاسم أو الرقم الوظيفي..." style="width:100%;height:38px;padding:0 38px 0 12px;font-size:12.5px;background:var(--bg-a2482502520p8);border:1px solid var(--bd-xe2e8f0);border-radius:11px;outline:none;font-family:'Cairo',sans-serif;box-sizing:border-box;color:var(--fg-x141414)">
        </div>
        <sc-for list="{{wzGroups}}" as="g" hint-placeholder-count="3">
        <div onClick="{{g.toggle}}" style="{{g.head}}" style-hover="border-color:var(--bd-a185151810p45)">
          <span style="{{g.dot}}"></span>
          <span style="flex:1;min-width:0;font-size:12.5px;font-weight:600;color:var(--fg-x141414)">{{g.name}}</span>
          <span style="{{g.countStyle}}" dir="ltr">{{g.count}}</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--fg-xb0b6bd)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="{{g.chev}}" data-i="i-c92915c6"></svg>
        </div>
        <sc-if value="{{g.open}}" hint-placeholder-val="{{ false }}">
        <div style="padding-right:13px;margin-bottom:4px;border-right:2px solid var(--bd-xf1f3f5)">
        <sc-for list="{{g.emps}}" as="e" hint-placeholder-count="4">
        <div onClick="{{e.pick}}" style="{{e.style}}" style-hover="border-color:var(--bd-a185151810p5)">
          <span style="width:32px;height:32px;border-radius:9999px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10.5px;font-weight:600;color:var(--fg-x8a6f35);background:linear-gradient(135deg,var(--bg-xefe3cd),var(--bg-xdcc4a0))">{{e.ini}}</span>
          <span style="flex:1;min-width:0">
            <span style="font-size:12.5px;font-weight:600;color:var(--fg-x141414)">{{e.name}}</span><br>
            <span dir="ltr" style="font-size:10.5px;color:var(--fg-x94a3b8);font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{e.eid}}</span>
          </span>
          <span style="{{e.badge}}">{{e.held}}</span>
        </div>
        </sc-for>
        </div>
        </sc-if>
        </sc-for>
        <sc-if value="{{wzNoEmps}}" hint-placeholder-val="{{ false }}">
        <div style="padding:26px;text-align:center;font-size:12px;font-weight:400;color:var(--fg-x94a3b8)">لا موظفين مطابقين</div>
        </sc-if>
      </sc-if>

      <sc-if value="{{wzS2}}" hint-placeholder-val="{{ false }}">
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:11px;background:var(--bg-a185151810p05);border:1px solid var(--bd-a185151810p25);margin-bottom:12px">
          <span style="width:32px;height:32px;border-radius:9999px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10.5px;font-weight:600;color:var(--fg-x8a6f35);background:linear-gradient(135deg,var(--bg-xefe3cd),var(--bg-xdcc4a0))">{{wzIni}}</span>
          <span style="flex:1"><span style="font-size:12.5px;font-weight:600">{{wzName}}</span><br>
            <span dir="ltr" style="font-size:10.5px;color:var(--fg-x94a3b8);font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{wzEid}}</span></span>
          <button onClick="{{wzBack}}" style="height:29px;padding:0 11px;border-radius:8px;border:1px solid var(--bd-xe1e1e1);background:var(--bg-xffffff);color:var(--fg-x53565a);font-size:11px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif">تغيير الموظف</button>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:9px">
          <span style="flex:1;font-size:11px;font-weight:600;color:var(--fg-x94a3b8)">المتاح في المستودع — اختر ما يُسلَّم</span>
        </div>
        <sc-for list="{{wzItems}}" as="it" hint-placeholder-count="5">
        <div onClick="{{it.tog}}" style="{{it.style}}" style-hover="border-color:var(--bd-a185151810p5)">
          <span style="{{it.box}}"><sc-if value="{{it.on}}" hint-placeholder-val="{{ false }}"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--fg-xffffff)" stroke-width="3" stroke-linecap="round" data-i="i-37b7e01a"></svg></sc-if></span>
          <i style="width:10px;height:10px;border-radius:3px;flex-shrink:0;background:{{it.color}}"></i>
          <span style="flex:1;min-width:0"><span style="font-size:12px;font-weight:600">{{it.name}}</span><br>
            <span style="font-size:10.5px;color:var(--fg-x94a3b8);font-weight:400">{{it.avail}}</span></span>
          <span style="display:inline-flex;border:1px solid var(--bd-xe1e1e1);border-radius:8px;overflow:hidden" onClick="{{stopClick}}">
            <sc-for list="{{it.conds}}" as="c" hint-placeholder-count="3">
            <span onClick="{{c.pick}}" style="{{c.style}}">{{c.name}}</span>
            </sc-for>
          </span>
          <span dir="ltr" style="font-size:10.5px;font-weight:600;color:var(--fg-x8a6f35);width:62px;text-align:left;font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{it.ser}}</span>
        </div>
        </sc-for>
        <sc-if value="{{wzNoItems}}" hint-placeholder-val="{{ false }}">
        <div style="padding:22px 14px;text-align:center;font-size:12px;font-weight:400;color:var(--fg-x94a3b8);line-height:1.9">{{wzNoItemsMsg}}<br>
          <button onClick="{{wzGoStore}}" style="margin-top:8px;height:30px;padding:0 13px;border-radius:9px;border:1px dashed var(--bd-a185151810p55);background:var(--bg-a185151810p06);color:var(--fg-x8a6f35);font-size:11px;font-weight:600;font-family:'Cairo',sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:5px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-231d5af6"></svg>افتح مستودع العهد</button></div>
        </sc-if>
      </sc-if>

      <sc-if value="{{wzS3}}" hint-placeholder-val="{{ false }}">
        <div style="border:1px solid var(--bd-xe6e8eb);border-radius:12px;overflow:hidden">
          <div style="padding:12px 14px;background:linear-gradient(to left,var(--bg-a2482502520p9),var(--bg-xffffff));border-bottom:1px solid var(--bd-xf1f5f9);display:flex;align-items:center;gap:10px">
            <span style="width:32px;height:32px;border-radius:9999px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10.5px;font-weight:600;color:var(--fg-x8a6f35);background:linear-gradient(135deg,var(--bg-xefe3cd),var(--bg-xdcc4a0))">{{wzIni}}</span>
            <span style="flex:1"><span style="font-size:13px;font-weight:600">{{wzName}}</span><br>
              <span style="font-size:10.5px;color:var(--fg-x94a3b8);font-weight:400">سند {{wzDocNo}} · {{wzDate}}</span></span>
            <span style="display:inline-flex;align-items:center;border-radius:9999px;padding:4px 12px;font-size:11px;font-weight:600;background:var(--bg-a185151810p12);color:var(--fg-x8a6f35);border:1px solid var(--bd-a185151810p3)">{{wzCount}}</span>
          </div>
          <sc-for list="{{wzReview}}" as="v" hint-placeholder-count="3">
          <div style="display:flex;align-items:center;gap:9px;padding:10px 14px;border-bottom:1px solid var(--bd-xf5f6f7)">
            <i style="width:9px;height:9px;border-radius:3px;flex-shrink:0;background:{{v.color}}"></i>
            <span style="flex:1;font-size:12px;font-weight:400">{{v.name}}</span>
            <span style="font-size:11px;font-weight:400;color:var(--fg-x53565a)">{{v.cond}}</span>
            <span dir="ltr" style="font-size:11px;font-weight:600;color:var(--fg-x8a6f35);font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{v.ser}}</span>
          </div>
          </sc-for>
        </div>
        <div style="margin-top:12px;padding:12px 14px;border-radius:11px;background:var(--bg-a185151810p05);border:1px solid var(--bd-a185151810p25);font-size:11.5px;font-weight:400;color:var(--fg-x53565a);line-height:1.9">
          بالاعتماد تُسجَّل حركة تسليم لكل صنف بتاريخ اليوم، ويُخصَّص لكل قطعة رقمها التسلسلي، وتدخل عهدة الموظف فوراً — ويظهر ذلك في ميزان الشهر وسجل الحركة.
        </div>
      </sc-if>
    </div>

    <div style="display:flex;align-items:center;gap:8px;padding:13px 20px;border-top:1px solid var(--bd-xf1f5f9);background:var(--bg-a2482502520p5)">
      <span style="flex:1;font-size:11px;font-weight:400;color:var(--fg-x94a3b8)">{{wzFoot}}</span>
      <button onClick="{{wzCancel}}" style="height:36px;padding:0 16px;border-radius:10px;border:1px solid var(--bd-xe1e1e1);background:var(--bg-xffffff);color:var(--fg-x53565a);font-size:12.5px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif">إلغاء</button>
      <sc-if value="{{wzBackOn}}" hint-placeholder-val="{{ false }}">
      <button onClick="{{wzBack}}" style="height:36px;padding:0 16px;border-radius:10px;border:1px solid var(--bd-xe1e1e1);background:var(--bg-xffffff);color:var(--fg-x53565a);font-size:12.5px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif">السابق</button>
      </sc-if>
      <button onClick="{{wzNext}}" style="{{wzNextStyle}}">{{wzNextLbl}}</button>
    </div>
  </div>
</div>
</sc-if>


<!-- ═══ بطاقة عهدة الموظف — طبقة تحلّ محلّ سجل العهد ═══ -->
<sc-if value="{{ecOn}}" hint-placeholder-val="{{ false }}">
<div style="display:flex;flex-direction:column;gap:12px">
  <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
    <button onClick="{{ecBack}}" style="display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 13px;border-radius:9px;border:1px solid var(--bd-xe1e1e1);background:var(--bg-xffffff);font-size:12px;font-weight:400;color:var(--fg-x53565a);cursor:pointer;font-family:'Cairo',sans-serif" style-hover="border-color:var(--bd-xb99751);color:var(--fg-x8a6f35)">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-dd6b2a72"></svg>
      رجوع إلى سجل العهد
    </button>
    <span style="font-size:11px;font-weight:400;color:var(--fg-x94a3b8)">سجل العهد › <b style="color:var(--fg-x8a6f35)">{{ecName}}</b> · {{ecMonth}}</span>
  </div>

  <div style="border-radius:16px;border:1px solid var(--bd-xe2e8f0);background:var(--bg-xffffff);box-shadow:var(--shadow-card);padding:16px 18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
    <span style="width:52px;height:52px;border-radius:9999px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:var(--fg-x8a6f35);background:linear-gradient(135deg,var(--bg-xefe3cd),var(--bg-xdcc4a0))">{{ecIni}}</span>
    <span style="flex:1;min-width:180px">
      <span style="font-size:17px;font-weight:700;color:var(--fg-x141414)">{{ecName}}</span>
      <span style="{{ecBadge}}">{{ecBadgeLbl}}</span><br>
      <span style="font-size:11px;font-weight:400;color:var(--fg-x94a3b8)">الرقم الوظيفي <span dir="ltr" style="font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{ecEid}}</span> · {{ecType}} · {{ecWork}}</span>
    </span>
    <span style="display:flex;gap:7px;flex-wrap:wrap">
<sc-if value="{{empPmExport}}" hint-placeholder-val="{{ true }}">
      <button onClick="{{ecPrint}}" style="height:36px;padding:0 14px;border-radius:10px;border:1px solid var(--bd-xe1e1e1);background:var(--bg-xffffff);color:var(--fg-x53565a);font-size:12.5px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;display:inline-flex;align-items:center;gap:7px" style-hover="border-color:var(--bd-xb99751);color:var(--fg-x8a6f35)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-9662a985"></svg>
        طباعة سند العهدة
      </button>
</sc-if>
      <sc-if value="{{ecCanIssue}}" hint-placeholder-val="{{ true }}">
      <button onClick="{{ecNewDoc}}" style="height:36px;padding:0 16px;border-radius:10px;border:0;color:var(--fg-xffffff);font-size:12.5px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;display:inline-flex;align-items:center;gap:7px;background:linear-gradient(135deg,var(--bg-xb99751),var(--bg-a185151810p85));box-shadow:0 4px 12px -2px rgba(185,151,81,0.4)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" data-i="i-5132a761"></svg>
        تسليم أصناف
      </button>
      </sc-if>
    </span>
  </div>

  <div class="bs-grid bs-stackcards" style="display:grid;grid-template-columns:1.55fr 1fr;gap:12px">
    <div style="border-radius:16px;border:1px solid var(--bd-xe2e8f0);background:var(--bg-xffffff);box-shadow:var(--shadow-card);padding:15px 17px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:13px">
        <span style="flex:1;height:1px;background:linear-gradient(90deg,var(--bg-a185151810),var(--bg-a185151810p32))"></span>
        <span style="display:inline-flex;align-items:center;gap:6px;border-radius:9999px;padding:4px 13px;background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p3);font-size:11.5px;font-weight:600;color:var(--fg-x53565a);white-space:nowrap">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-xb99751)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-931f8640"></svg>
          الأصناف التي بعهدته
        </span>
        <span style="flex:1;height:1px;background:linear-gradient(90deg,var(--bg-a185151810p32),var(--bg-a185151810))"></span>
      </div>
      <sc-if value="{{ecLoading}}"><div ref="{{ecStates}}"></div></sc-if>
      <sc-if value="{{ecError}}"><p role="alert">{{ecError}}</p><button onClick="{{ecRetry}}" style="height:38px;padding:0 16px;border-radius:10px;font-size:12.5px;font-weight:400;background:var(--bg-surface);color:var(--text-secondary);border:1px solid var(--border-default);cursor:pointer;font-family:'Cairo',sans-serif" style-hover="background:var(--bg-surface-3)" disabled="{{ecLoading || cuSaving}}">إعادة القراءة</button></sc-if>
      <sc-if value="{{ecProgress}}"><p style="font-size:11px;color:var(--text-secondary)">{{ecProgress}}</p></sc-if>
      <sc-if value="{{ecHasItems}}" hint-placeholder-val="{{ true }}">
      <div class="bs-cardgrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(196px,1fr));gap:10px">
        <sc-for list="{{ecItems}}" as="it" hint-placeholder-count="4">
        <div style="border:1px solid var(--bd-xeef0f2);border-radius:13px;padding:12px 13px;background:var(--bg-xffffff);box-shadow:var(--shadow-card);display:flex;flex-direction:column;gap:9px">
          <div style="display:flex;align-items:center;gap:9px">
            <span style="{{it.icoStyle}}"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="{{it.color}}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-931f8640"></svg></span>
            <span style="flex:1;min-width:0"><span style="font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block">{{it.name}}</span>
              <span dir="ltr" style="font-size:10px;font-weight:600;color:var(--fg-x8a6f35);font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{it.ser}}</span></span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:6px">
            <span style="{{it.condStyle}}">{{it.cond}}</span>
            <span style="font-size:10px;font-weight:400;color:var(--fg-x94a3b8)">سُلِّم {{it.since}}</span>
          </div>
          <sc-if value="{{ecCanWrite}}" hint-placeholder-val="{{ true }}">
          <div style="display:flex;gap:6px">
            <button onClick="{{it.ret}}" style="flex:1;height:29px;border-radius:8px;border:1px solid var(--bd-xe1e1e1);background:var(--bg-xffffff);color:var(--fg-x53565a);font-size:11px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif" style-hover="border-color:var(--bd-x0369a1);color:var(--fg-x0369a1)">استرجاع</button>
            <button onClick="{{it.dmg}}" title="تسجيل تالفة" style="width:31px;height:29px;border-radius:8px;border:1px solid var(--bd-xe1e1e1);background:var(--bg-xffffff);color:var(--fg-x94a3b8);cursor:pointer;display:inline-flex;align-items:center;justify-content:center" style-hover="border-color:var(--bd-xdc2626);color:var(--fg-xdc2626)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-a61be56e"></svg></button>
            <button onClick="{{it.lost}}" title="تسجيل مفقودة" style="width:31px;height:29px;border-radius:8px;border:1px solid var(--bd-xe1e1e1);background:var(--bg-xffffff);color:var(--fg-x94a3b8);cursor:pointer;display:inline-flex;align-items:center;justify-content:center" style-hover="border-color:var(--bd-x64748b);color:var(--fg-x475569)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-823e31c6"></svg></button>
          </div>
          </sc-if>
        </div>
        </sc-for>
      </div>
      </sc-if>
      <sc-if value="{{ecMore}}"><button disabled="{{ecLoading}}" onClick="{{ecMoreDo}}" style="height:38px;padding:0 16px;border-radius:10px;font-size:12.5px;font-weight:400;background:var(--bg-surface);color:var(--text-secondary);border:1px solid var(--border-default);cursor:pointer;font-family:'Cairo',sans-serif" style-hover="background:var(--bg-surface-3)">تحميل الصفحة التالية من عهدة الحامل</button></sc-if>
      <sc-if value="{{ecNoItems}}" hint-placeholder-val="{{ false }}">
      <div style="padding:34px;text-align:center">
        <div style="font-size:13px;font-weight:600;color:var(--fg-x141414);margin-bottom:6px">لا أصناف بعهدته في {{ecMonth}}</div>
        <div style="font-size:11.5px;color:var(--fg-x94a3b8);font-weight:400">سلّم له أصنافاً من زر «تسليم أصناف» أعلاه.</div>
      </div>
      </sc-if>
    </div>

    <div style="display:flex;flex-direction:column;gap:12px">
      <div style="border-radius:16px;border:1px solid var(--bd-xe2e8f0);background:var(--bg-xffffff);box-shadow:var(--shadow-card);padding:15px 17px">
        <div style="font-size:11px;font-weight:600;color:var(--fg-x94a3b8);margin-bottom:11px">ملخّص عهدته في هذا الشهر</div>
        <div style="display:flex;align-items:center;gap:12px">
          <div style="{{ecRing}}">
            <span dir="ltr" style="font-size:18px;font-weight:700;color:var(--fg-x141414);font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{ecCount}}</span>
          </div>
          <div style="flex:1;min-width:0">
            <p style="font-size:10px;color:var(--text-secondary)">{{ecStatsScope}}</p>
            <sc-for list="{{ecStats}}" as="st" hint-placeholder-count="3">
            <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px">
              <i style="width:8px;height:8px;border-radius:3px;flex-shrink:0;background:{{st.color}}"></i>
              <span style="flex:1;font-size:11px;font-weight:400;color:var(--fg-x3f3f3f)">{{st.name}}</span>
              <span dir="ltr" style="font-size:11px;font-weight:700;color:var(--fg-x8a6f35);font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{st.n}}</span>
            </div>
            </sc-for>
          </div>
        </div>
      </div>

      <div style="border-radius:16px;border:1px solid var(--bd-xe2e8f0);background:var(--bg-xffffff);box-shadow:var(--shadow-card);padding:15px 17px;flex:1;min-height:0">
        <div style="font-size:11px;font-weight:600;color:var(--fg-x94a3b8);margin-bottom:12px">حركة عهدته — {{ecMonth}}</div>
        <div style="max-height:330px;overflow-y:auto">
          <sc-if value="{{ecMovesLoading}}"><div ref="{{ecStates}}"></div></sc-if>
          <sc-if value="{{ecMovesError}}"><p role="alert">{{ecMovesError}}</p><button disabled="{{ecMovesLoading}}" onClick="{{ecMovesRetry}}" style="height:38px;padding:0 16px;border-radius:10px;font-size:12.5px;font-weight:400;background:var(--bg-surface);color:var(--text-secondary);border:1px solid var(--border-default);cursor:pointer;font-family:'Cairo',sans-serif">إعادة القراءة</button></sc-if>
          <sc-if value="{{ecMovesProgress}}"><p style="font-size:10px;color:var(--text-secondary)">{{ecMovesProgress}}</p></sc-if>
          <sc-for list="{{ecMoves}}" as="v" hint-placeholder-count="5">
          <div style="display:flex;gap:9px;align-items:flex-start;padding-bottom:12px">
            <span style="{{v.dot}}"></span>
            <span style="flex:1;min-width:0">
              <span style="font-size:11.5px;font-weight:600;display:block;color:var(--fg-x141414)">{{v.title}}</span>
              <span style="font-size:10px;font-weight:400;color:var(--fg-x94a3b8)">{{v.sub}}</span>
            </span>
          </div>
          </sc-for>
          <sc-if value="{{ecMovesMore}}"><button disabled="{{ecMovesLoading}}" onClick="{{ecMovesMoreDo}}" style="height:38px;padding:0 16px;border-radius:10px;font-size:12.5px;font-weight:400;background:var(--bg-surface);color:var(--text-secondary);border:1px solid var(--border-default);cursor:pointer;font-family:'Cairo',sans-serif">تحميل حركات أخرى للحامل</button></sc-if>
          <sc-if value="{{ecNoMoves}}" hint-placeholder-val="{{ false }}">
          <div style="padding:20px;text-align:center;font-size:11.5px;font-weight:400;color:var(--fg-x94a3b8)">لا حركات لهذا الموظف في هذا الشهر</div>
          </sc-if>
        </div>
      </div>
    </div>
  </div>
</div>
</sc-if>

<sc-if value="{{ecOff}}" hint-placeholder-val="{{ true }}">

<!-- ═══ مؤشرات الشهر — تحت كرت الشهر وفوق الجدول، خاصة بالشهر المختار ═══ -->
<sc-if value="{{ckOn}}" hint-placeholder-val="{{ true }}">
<div class="rp-kpis bs-statscroll" style="gap:12px">
        <div style="display:flex;align-items:stretch;gap:10px;border:1px solid var(--bd-xeef0f2);border-radius:12px;padding:10px;background:linear-gradient(180deg,var(--bg-xffffff),var(--bg-xfcfcfd));box-shadow:var(--shadow-card);flex-wrap:wrap">
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 6px;min-width:110px">
            <div style="position:relative;width:96px;height:96px;display:grid;place-items:center;flex-shrink:0">
              <svg width="96" height="96" viewBox="0 0 96 96" style="position:absolute;top:0;right:0;transform:rotate(-90deg)" data-i="i-74a971cb"></svg>
              <b dir="ltr" style="position:relative;z-index:2;font-size:30px;font-weight:700;line-height:1;color:{{ckK1Col}};font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{ckK1Big}}</b>
              <span dir="ltr" style="position:absolute;bottom:-7px;z-index:3;font-size:9.5px;font-weight:700;color:{{ckK1Col}};font-family:'Cairo',sans-serif;font-feature-settings:'tnum';background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p28);box-shadow:var(--shadow-card);border-radius:9999px;padding:1.5px 10px;white-space:nowrap">{{ckK1Pill}}</span>
            </div>
            <span style="display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:600;color:var(--fg-x53565a);margin-top:16px;white-space:nowrap">ميزان الشهر</span>
            <i style="display:block;width:82px;height:1px;margin:6px 0 5px;background:linear-gradient(90deg,var(--bg-a185151810),var(--bg-a185151810p42),var(--bg-a185151810))"></i>
            <span style="font-size:9px;font-weight:400;color:{{ckK1SubCol}};white-space:normal;max-width:150px;text-align:center;line-height:1.55">{{ckK1Sub}}</span>
          </div>
          <div style="width:1px;background:linear-gradient(180deg,transparent,var(--bg-xe6e8eb),transparent);flex-shrink:0"></div>
          <div style="flex:1;min-width:140px;display:flex;flex-direction:column;justify-content:center;gap:3px">
            <sc-for list="{{ckK1Rows}}" as="r" hint-placeholder-count="4">
            <div title="{{r.tip}}" style="display:flex;align-items:center;gap:7px">
              <i style="width:8px;height:8px;border-radius:2px;flex-shrink:0;background:{{r.color}};box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06)"></i>
              <span style="font-size:10.5px;font-weight:400;color:var(--fg-x53565a);white-space:nowrap;flex-shrink:1;min-width:0;overflow:hidden;text-overflow:ellipsis;max-width:132px">{{r.label}}</span>
              <i style="flex:1;min-width:12px;height:1px;background:linear-gradient(90deg,var(--bg-a185151810p28),var(--bg-a185151810))"></i>
              <span dir="ltr" style="flex-shrink:0;font-size:11.5px;font-weight:700;color:{{r.ncolor}};font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{r.n}}<em style="font-style:normal;font-size:9.5px;font-weight:600;color:var(--fg-x53565a);margin-left:6px">{{r.pct}}</em></span>
            </div>
            </sc-for>
          </div>
        </div>
        <div style="display:flex;align-items:stretch;gap:10px;border:1px solid var(--bd-xeef0f2);border-radius:12px;padding:10px;background:linear-gradient(180deg,var(--bg-xffffff),var(--bg-xfcfcfd));box-shadow:var(--shadow-card);flex-wrap:wrap">
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 6px;min-width:110px">
            <div style="position:relative;width:96px;height:96px;display:grid;place-items:center;flex-shrink:0">
              <svg width="96" height="96" viewBox="0 0 96 96" style="position:absolute;top:0;right:0;transform:rotate(-90deg)" data-i="i-a839893d"></svg>
              <b dir="ltr" style="position:relative;z-index:2;font-size:30px;font-weight:700;line-height:1;color:{{ckK2Col}};font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{ckK2Big}}</b>
              <span dir="ltr" style="position:absolute;bottom:-7px;z-index:3;font-size:9.5px;font-weight:700;color:{{ckK2Col}};font-family:'Cairo',sans-serif;font-feature-settings:'tnum';background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p28);box-shadow:var(--shadow-card);border-radius:9999px;padding:1.5px 10px;white-space:nowrap">{{ckK2Pill}}</span>
            </div>
            <span style="display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:600;color:var(--fg-x53565a);margin-top:16px;white-space:nowrap">القطع بحسب الحالة</span>
            <i style="display:block;width:82px;height:1px;margin:6px 0 5px;background:linear-gradient(90deg,var(--bg-a185151810),var(--bg-a185151810p42),var(--bg-a185151810))"></i>
            <span style="font-size:9px;font-weight:400;color:{{ckK2SubCol}};white-space:normal;max-width:150px;text-align:center;line-height:1.55">{{ckK2Sub}}</span>
          </div>
          <div style="width:1px;background:linear-gradient(180deg,transparent,var(--bg-xe6e8eb),transparent);flex-shrink:0"></div>
          <div style="flex:1;min-width:140px;display:flex;flex-direction:column;justify-content:center;gap:3px">
            <sc-for list="{{ckK2Rows}}" as="r" hint-placeholder-count="4">
            <div title="{{r.tip}}" style="display:flex;align-items:center;gap:7px">
              <i style="width:8px;height:8px;border-radius:2px;flex-shrink:0;background:{{r.color}};box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06)"></i>
              <span style="font-size:10.5px;font-weight:400;color:var(--fg-x53565a);white-space:nowrap;flex-shrink:1;min-width:0;overflow:hidden;text-overflow:ellipsis;max-width:132px">{{r.label}}</span>
              <i style="flex:1;min-width:12px;height:1px;background:linear-gradient(90deg,var(--bg-a185151810p28),var(--bg-a185151810))"></i>
              <span dir="ltr" style="flex-shrink:0;font-size:11.5px;font-weight:700;color:{{r.ncolor}};font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{r.n}}<em style="font-style:normal;font-size:9.5px;font-weight:600;color:var(--fg-x53565a);margin-left:6px">{{r.pct}}</em></span>
            </div>
            </sc-for>
          </div>
        </div>
        <div style="display:flex;align-items:stretch;gap:10px;border:1px solid var(--bd-xeef0f2);border-radius:12px;padding:10px;background:linear-gradient(180deg,var(--bg-xffffff),var(--bg-xfcfcfd));box-shadow:var(--shadow-card);flex-wrap:wrap">
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 6px;min-width:110px">
            <div style="position:relative;width:96px;height:96px;display:grid;place-items:center;flex-shrink:0">
              <svg width="96" height="96" viewBox="0 0 96 96" style="position:absolute;top:0;right:0;transform:rotate(-90deg)" data-i="i-ba229330"></svg>
              <b dir="ltr" style="position:relative;z-index:2;font-size:30px;font-weight:700;line-height:1;color:{{ckK3Col}};font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{ckK3Big}}</b>
              <span dir="ltr" style="position:absolute;bottom:-7px;z-index:3;font-size:9.5px;font-weight:700;color:{{ckK3Col}};font-family:'Cairo',sans-serif;font-feature-settings:'tnum';background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p28);box-shadow:var(--shadow-card);border-radius:9999px;padding:1.5px 10px;white-space:nowrap">{{ckK3Pill}}</span>
            </div>
            <span style="display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:600;color:var(--fg-x53565a);margin-top:16px;white-space:nowrap">المستودع بحسب الصنف</span>
            <i style="display:block;width:82px;height:1px;margin:6px 0 5px;background:linear-gradient(90deg,var(--bg-a185151810),var(--bg-a185151810p42),var(--bg-a185151810))"></i>
            <span style="font-size:9px;font-weight:400;color:{{ckK3SubCol}};white-space:normal;max-width:150px;text-align:center;line-height:1.55">{{ckK3Sub}}</span>
          </div>
          <div style="width:1px;background:linear-gradient(180deg,transparent,var(--bg-xe6e8eb),transparent);flex-shrink:0"></div>
          <div style="flex:1;min-width:140px;display:flex;flex-direction:column;justify-content:center;gap:3px">
            <sc-if value="{{ckNoItems}}" hint-placeholder-val="{{ false }}">
            <div style="display:flex;align-items:center;justify-content:center;gap:7px;padding:14px 8px;border-radius:10px;border:1px dashed var(--bd-xe6e8eb);background:var(--bg-xfcfcfd)">
              <span style="font-size:9.5px;font-weight:400;color:var(--fg-x8b9099)">لا أصناف في المستودع بعد</span>
            </div>
            </sc-if>
            <sc-for list="{{ckK3Rows}}" as="r" hint-placeholder-count="4">
            <div title="{{r.tip}}" style="display:flex;align-items:center;gap:7px">
              <i style="width:8px;height:8px;border-radius:2px;flex-shrink:0;background:{{r.color}};box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06)"></i>
              <span style="font-size:10.5px;font-weight:400;color:var(--fg-x53565a);white-space:nowrap;flex-shrink:1;min-width:0;overflow:hidden;text-overflow:ellipsis;max-width:132px">{{r.label}}</span>
              <i style="flex:1;min-width:12px;height:1px;background:linear-gradient(90deg,var(--bg-a185151810p28),var(--bg-a185151810))"></i>
              <span dir="ltr" style="flex-shrink:0;font-size:11.5px;font-weight:700;color:{{r.ncolor}};font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{r.n}}<em style="font-style:normal;font-size:9.5px;font-weight:600;color:var(--fg-x53565a);margin-left:6px">{{r.pct}}</em></span>
            </div>
            </sc-for>
          </div>
        </div>
        <div style="display:flex;align-items:stretch;gap:10px;border:1px solid var(--bd-xeef0f2);border-radius:12px;padding:10px;background:linear-gradient(180deg,var(--bg-xffffff),var(--bg-xfcfcfd));box-shadow:var(--shadow-card);flex-wrap:wrap">
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 6px;min-width:110px">
            <div style="position:relative;width:96px;height:96px;display:grid;place-items:center;flex-shrink:0">
              <svg width="96" height="96" viewBox="0 0 96 96" style="position:absolute;top:0;right:0;transform:rotate(-90deg)" data-i="i-d1625100"></svg>
              <b dir="ltr" style="position:relative;z-index:2;font-size:30px;font-weight:700;line-height:1;color:{{ckK4Col}};font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{ckK4Big}}</b>
              <span dir="ltr" style="position:absolute;bottom:-7px;z-index:3;font-size:9.5px;font-weight:700;color:{{ckK4Col}};font-family:'Cairo',sans-serif;font-feature-settings:'tnum';background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p28);box-shadow:var(--shadow-card);border-radius:9999px;padding:1.5px 10px;white-space:nowrap">{{ckK4Pill}}</span>
            </div>
            <span style="display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:600;color:var(--fg-x53565a);margin-top:16px;white-space:nowrap">الأكثر عهدةً</span>
            <i style="display:block;width:82px;height:1px;margin:6px 0 5px;background:linear-gradient(90deg,var(--bg-a185151810),var(--bg-a185151810p42),var(--bg-a185151810))"></i>
            <span style="font-size:9px;font-weight:400;color:{{ckK4SubCol}};white-space:normal;max-width:150px;text-align:center;line-height:1.55">{{ckK4Sub}}</span>
          </div>
          <div style="width:1px;background:linear-gradient(180deg,transparent,var(--bg-xe6e8eb),transparent);flex-shrink:0"></div>
          <div style="flex:1;min-width:140px;display:flex;flex-direction:column;justify-content:center;gap:3px">
            <sc-if value="{{ckNoTops}}" hint-placeholder-val="{{ false }}">
            <div style="display:flex;align-items:center;justify-content:center;gap:7px;padding:14px 8px;border-radius:10px;border:1px dashed var(--bd-xe6e8eb);background:var(--bg-xfcfcfd)">
              <span style="font-size:9.5px;font-weight:400;color:var(--fg-x8b9099)">لا عهد بنهاية هذا الشهر</span>
            </div>
            </sc-if>
            <sc-for list="{{ckK4Rows}}" as="r" hint-placeholder-count="4">
            <div title="{{r.tip}}" style="display:flex;align-items:center;gap:7px">
              <i style="width:8px;height:8px;border-radius:2px;flex-shrink:0;background:{{r.color}};box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06)"></i>
              <span style="font-size:10.5px;font-weight:400;color:var(--fg-x53565a);white-space:nowrap;flex-shrink:1;min-width:0;overflow:hidden;text-overflow:ellipsis;max-width:132px">{{r.label}}</span>
              <i style="flex:1;min-width:12px;height:1px;background:linear-gradient(90deg,var(--bg-a185151810p28),var(--bg-a185151810))"></i>
              <span dir="ltr" style="flex-shrink:0;font-size:11.5px;font-weight:700;color:{{r.ncolor}};font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{r.n}}<em style="font-style:normal;font-size:9.5px;font-weight:600;color:var(--fg-x53565a);margin-left:6px">{{r.pct}}</em></span>
            </div>
            </sc-for>
          </div>
        </div>
</div>
</sc-if>

<!-- ═══ جدول عهد الموظفين — بتصميم الجدول المعتمد نفسه ═══ -->
<div style="border-radius:16px;border:1px solid var(--bd-xe2e8f0);background:var(--bg-xffffff);box-shadow:var(--shadow-card)">
  <div class="bs-hbar" style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 12px;border-bottom:2px solid var(--bd-a185151810p25);background:linear-gradient(to left,var(--bg-a2482502520p8),var(--bg-xffffff));border-radius:16px 16px 0 0">
    <!-- الزرّ في رأس الشريط كزرّ «إضافة موظف» في بيانات الموظفين: أيقونة وحدها والوصف في التلميح -->
    <sc-if value="{{cuOpenMonth}}" hint-placeholder-val="{{ true }}">
    <button onClick="{{cuNewDoc}}" title="تسليم عهدة" style="width:40px;height:40px;border-radius:9999px;border:0;background:linear-gradient(135deg,var(--bg-xe6d29d) 0%,var(--bg-xb99751) 50%,var(--bg-x9a7e40) 100%);color:var(--text-on-brand);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px -2px rgba(154,126,64,0.6);transition:all .2s" style-hover="transform:scale(1.08);box-shadow:0 4px 14px -2px rgba(154,126,64,0.7)">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" data-i="i-de4e6997"></svg>
    </button>
    </sc-if>
    <div style="position:relative;flex:1;min-width:200px">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--fg-x94a3b8)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;right:12px;top:50%;transform:translateY(-50%)" data-i="i-7133b944"></svg>
      <input value="{{cuSearch}}" onChange="{{cuOnSearch}}" placeholder="بحث باسم الموظف أو الرقم الوظيفي..." style="width:100%;height:40px;padding:0 40px 0 12px;font-size:13px;background:var(--bg-a2482502520p8);border:1px solid var(--bd-xe2e8f0);border-radius:12px;outline:none;font-family:'Cairo',sans-serif;box-sizing:border-box;color:var(--fg-x141414)" style-focus="background:var(--bg-xffffff);border-color:var(--bd-a185151810p4);box-shadow:0 0 0 2px rgba(185,151,81,0.2)">
    </div>
    <div style="margin-right:auto;font-size:11px;color:var(--fg-x64748b);font-feature-settings:'tnum'">
      <span style="font-weight:400;color:var(--fg-xb99751)" dir="ltr">{{cuShown}}</span><span style="color:var(--text-muted)"> / {{cuTotal}}</span>
    </div>
  </div>

  <sc-if value="{{cuLockedMonth}}" hint-placeholder-val="{{ false }}">
  <div style="display:flex;align-items:center;gap:10px;margin:12px;padding:10px 13px;border-radius:12px;background:var(--bg-a1001161390p06);border:1px solid var(--bd-a1001161390p2)">
    <span style="width:28px;height:28px;border-radius:9px;background:var(--bg-a1001161390p12);color:var(--fg-x475569);display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-b9106568"></svg></span>
    <span style="flex:1;font-size:12px;font-weight:400;color:var(--fg-x475569);line-height:1.8">هذا الشهر <b>انقضى ومقفل</b> — يُعرض ويُطبع فقط ولا تُقبل عليه حركة جديدة. العهد التي لم تُرجَع رُحِّلت تلقائياً إلى الشهر التالي.</span>
  </div>
  </sc-if>

  <sc-if value="{{cuHasRows}}" hint-placeholder-val="{{ true }}">
  <div class="bs-hscroll bs-sthead" style="overflow-x:auto">
    <table class="bs-rtable" style="width:100%;border-collapse:collapse;min-width:900px">
      <thead>
        <tr style="background:linear-gradient(to left,var(--bg-a185151810p05),var(--bg-a185151810p03),var(--bg-a185151810p05));border-bottom:2px solid var(--bd-a185151810p25)">
          <sc-for list="{{cuCols}}" as="h" hint-placeholder-count="7">
          <th style="{{h.style}}">
            <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
              <div style="width:32px;height:32px;border-radius:12px;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-card);background:var(--bg-a185151810p12);color:var(--fg-xb99751)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-b984ef8e"></svg></div>
              <div style="display:flex;align-items:center;gap:4px"><span style="font-size:11px;font-weight:600;color:var(--fg-x53565a);white-space:nowrap">{{h.name}}</span></div>
            </div>
          </th>
          </sc-for>
        </tr>
      </thead>
      <tbody>
        <sc-for list="{{cuRows}}" as="r" hint-placeholder-count="6">
        <tr style="border-bottom:1px solid var(--bd-xf1f5f9);transition:background .15s" style-hover="background:var(--bg-a2452452450p5)">
          <td data-label="م" style="padding:8px 6px;text-align:center"><span style="font-size:13px;font-weight:400;color:var(--fg-x53565a);font-family:'Cairo',sans-serif">{{r.sn}}</span></td>
          <td data-label="الموظف" style="padding:6px 12px">
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:34px;height:34px;border-radius:9999px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:var(--fg-x8a6f35);background:linear-gradient(135deg,var(--bg-xefe3cd),var(--bg-xdcc4a0))">{{r.ini}}</div>
              <div style="min-width:0">
                <div onClick="{{r.openCard}}" style="font-size:13px;font-weight:400;color:var(--fg-x141414);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" style-hover="color:var(--fg-xb99751)">{{r.name}}</div>
                <div dir="ltr" style="font-size:10.5px;color:var(--fg-x94a3b8);font-family:'Cairo',sans-serif;font-feature-settings:'tnum';text-align:right">{{r.eid}}</div>
              </div>
            </div>
          </td>
          <td data-label="السند" style="padding:6px 8px;text-align:center"><span dir="ltr" style="font-size:12px;font-weight:600;color:{{r.docColor}};font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{r.doc}}</span></td>
          <td data-label="الأصناف" style="padding:6px 8px;text-align:center">
            <span onClick="{{r.toggle}}" title="{{r.togTip}}" style="{{r.cntStyle}}" style-hover="border-color:var(--bd-a185151810p45);background:var(--bg-a185151810p06)">
              <span dir="ltr" style="font-size:13px;font-weight:700;color:{{r.cntColor}};font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{r.cnt}}</span>
              <span style="font-size:10px;font-weight:400;color:var(--fg-x94a3b8)">{{r.cntW}}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-xb0b6bd)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="{{r.chev}}" data-i="i-c92915c6"></svg>
            </span>
          </td>
          <td data-label="نسبة التسليم" style="padding:6px 8px">
            <div style="display:flex;gap:1.5px;align-items:center;min-width:110px">
              <sc-for list="{{r.cells}}" as="c" hint-placeholder-count="12">
              <i style="{{c}}"></i>
              </sc-for>
            </div>
          </td>
          <td data-label="آخر حركة" style="padding:6px 8px;text-align:center"><span dir="ltr" style="font-size:11.5px;color:var(--fg-x475569);font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{r.last}}</span></td>
          <td data-label="الحالة" style="padding:6px 8px;text-align:center"><span style="{{r.stStyle}}">{{r.stLabel}}</span></td>
          <td data-label="إجراءات" style="padding:6px 8px;text-align:center">
            <sc-if value="{{r.rmHas}}" hint-placeholder-val="{{ true }}">
            <span style="position:relative;display:inline-block">
              <button onClick="{{r.rmToggle}}" title="إجراءات هذا السجل" style="{{r.rmBtnStyle}}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" data-i="i-0dbad243"></svg>
              </button>
              <sc-if value="{{r.rmOpen}}" hint-placeholder-val="{{ false }}">
              <div style="position:absolute;top:100%;left:50%;transform:translateX(-50%);z-index:60;margin-top:5px;background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p28);border-radius:11px;box-shadow:var(--shadow-elevated);padding:5px;display:flex;align-items:center;gap:4px;width:max-content">
                <sc-for list="{{r.rmItems}}" as="a" hint-placeholder-count="3">
                <button onClick="{{a.run}}" title="{{a.name}}" style="{{a.style}}" style-hover="border-color:var(--bd-xb99751);background:var(--bg-a185151810p08)">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-9621a719"></svg>
                </button>
                </sc-for>
              </div>
              </sc-if>
            </span>
            </sc-if>
          </td>
        </tr>
        <sc-if value="{{r.open}}" hint-placeholder-val="{{ false }}">
        <tr style="border-bottom:1px solid var(--bd-xf1f5f9)">
          <td colspan="8" style="padding:0 12px 14px">
            <div style="border:1px solid var(--bd-a185151810p22);border-radius:12px;background:var(--bg-a185151810p035);padding:11px 12px">
              <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
                <span style="font-size:10.5px;font-weight:600;color:var(--fg-x94a3b8);margin-left:3px">بعهدته الآن:</span>
                <sc-for list="{{r.chips}}" as="ch" hint-placeholder-count="4">
                <span style="position:relative;display:inline-block">
                  <span onClick="{{ch.menu}}" title="إجراءات هذه القطعة" style="{{ch.style}}" style-hover="border-color:var(--bd-a185151810p5)">
                    <i style="width:8px;height:8px;border-radius:2.5px;background:{{ch.color}}"></i>{{ch.name}}
                    <span dir="ltr" style="font-size:9.5px;color:var(--fg-x94a3b8);font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{ch.ser}}</span>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--fg-xb0b6bd)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" data-i="i-c92915c6"></svg>
                  </span>
                  <sc-if value="{{ch.open}}" hint-placeholder-val="{{ false }}">
                  <div data-bs-dd="1" style="position:absolute;top:100%;right:0;z-index:60;min-width:168px;margin-top:5px;background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p35);border-radius:10px;box-shadow:var(--shadow-elevated);padding:4px;text-align:right">
                    <sc-for list="{{ch.acts}}" as="a" hint-placeholder-count="3">
                    <div onClick="{{a.run}}" style="{{a.style}}" style-hover="background:var(--bg-a185151810p06)">
                      <span style="{{a.dot}}"></span><span style="flex:1;white-space:nowrap">{{a.name}}</span>
                    </div>
                    </sc-for>
                  </div>
                  </sc-if>
                </span>
                </sc-for>
                <sc-if value="{{r.noItems}}" hint-placeholder-val="{{ true }}">
                <span style="font-size:11px;font-weight:400;color:var(--fg-x94a3b8)">لا توجد أصناف بعهدته في هذا الشهر</span>
                </sc-if>
              </div>

              <sc-if value="{{r.canAdd}}" hint-placeholder-val="{{ true }}">
              <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px dashed var(--bd-a185151810p3)">
                <span style="font-size:10.5px;font-weight:600;color:var(--fg-x8a6f35);white-space:nowrap">تسليم صنف:</span>
                <span style="position:relative;display:inline-block">
                  <button onClick="{{r.ddToggle}}" style="{{r.ddStyle}}">
                    <i style="width:9px;height:9px;border-radius:3px;flex-shrink:0;background:{{r.pickColor}}"></i>
                    <span style="flex:1;white-space:nowrap;text-align:right">{{r.pickName}}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="{{r.ddChev}}" data-i="i-c92915c6"></svg>
                  </button>
                  <sc-if value="{{r.ddOpen}}" hint-placeholder-val="{{ false }}">
                  <div style="position:absolute;top:100%;right:0;z-index:60;min-width:246px;margin-top:5px;background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p35);border-radius:11px;box-shadow:var(--shadow-elevated);padding:5px;text-align:right">
                    <div style="max-height:190px;overflow-y:auto">
                      <sc-for list="{{r.opts}}" as="o" hint-placeholder-count="4">
                      <div onClick="{{o.pick}}" style="{{o.style}}" style-hover="background:var(--bg-a185151810p06)">
                        <i style="width:9px;height:9px;border-radius:3px;flex-shrink:0;background:{{o.color}}"></i>
                        <span style="flex:1;white-space:nowrap">{{o.name}}</span>
                        <span style="{{o.availStyle}}">{{o.avail}}</span>
                      </div>
                      </sc-for>
                      <sc-if value="{{r.noOpts}}" hint-placeholder-val="{{ true }}">
                      <div style="padding:9px 10px;font-size:10.5px;font-weight:400;color:var(--fg-x94a3b8);text-align:center;line-height:1.8">لا قطعَ متاحةً في المستودع<br><span onClick="{{r.goStore}}" style="color:var(--fg-x8a6f35);font-weight:600;cursor:pointer">أضِف الأصناف أو زِد الكمية من تبويب «مستودع العهد»</span></div>
                      </sc-if>
                    </div>
                  </div>
                  </sc-if>
                </span>
                <span style="display:inline-flex;border:1px solid var(--bd-xe1e1e1);border-radius:9px;overflow:hidden">
                  <sc-for list="{{r.conds}}" as="c" hint-placeholder-count="3">
                  <span onClick="{{c.pick}}" style="{{c.style}}">{{c.name}}</span>
                  </sc-for>
                </span>
                <span style="font-size:10.5px;font-weight:400;color:var(--fg-x94a3b8)">الرقم التسلسلي: <b dir="ltr" style="color:var(--fg-x8a6f35);font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{r.nextSer}}</b> — تلقائي</span>
                <span style="flex:1"></span>
                <button onClick="{{r.handOut}}" style="{{r.handStyle}}">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" data-i="i-5132a761"></svg>
                  تسليم وإضافة
                </button>
              </div>
              </sc-if>
            </div>
          </td>
        </tr>
        </sc-if>
        </sc-for>
      </tbody>
    </table>
  </div>
  </sc-if>

  <sc-if value="{{cuNoRows}}" hint-placeholder-val="{{ false }}">
  <div style="padding:44px 24px;text-align:center">
    <div style="width:74px;height:74px;border-radius:22px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;background:var(--bg-a185151810p08);color:var(--fg-xb99751)"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" data-i="i-7ae7d78f"></svg></div>
    <div style="font-size:15px;font-weight:600;color:var(--fg-x141414);margin-bottom:7px">{{cuEmptyTitle}}</div>
    <div style="font-size:12px;color:var(--fg-x53565a);line-height:1.9;max-width:460px;margin:0 auto">{{cuEmptyDesc}}</div>
  </div>
  </sc-if>

  <sc-if value="{{cuHasRows}}" hint-placeholder-val="{{ true }}">
  <div class="bs-hbar" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-top:1px solid var(--bd-xe1e1e1);background:var(--bg-surface);font-size:12px">
    <span style="color:var(--fg-x53565a)">عرض <span style="font-weight:400;color:var(--fg-x141414)" dir="ltr">{{cuPgRange}}</span> من <span style="font-weight:400;color:var(--fg-x141414)" dir="ltr">{{cuPgTotal}}</span> {{cuPgTotalW}}</span>
    <div style="display:flex;align-items:center;gap:8px">
      <span style="color:var(--fg-x94a3b8);font-size:11px">لكل صفحة</span>
      <select value="{{cuPerPage}}" onChange="{{cuOnPerPage}}" style="height:28px;width:78px;font-size:10px;border-radius:8px;border:1px solid var(--border-default);background:var(--bg-surface);font-family:'Cairo',sans-serif;outline:none;cursor:pointer"><option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option></select>
      <div style="display:flex;align-items:center;border:1px solid var(--bd-xe1e1e1);border-radius:8px;overflow:hidden">
        <button onClick="{{cuPgFirst}}" title="الصفحة الأولى" style="{{cuPgFirstStyle}}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-ec58a044"></svg></button>
        <button onClick="{{cuPgPrev}}" title="السابق" style="{{cuPgPrevStyle}}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-870cde61"></svg></button>
        <sc-for list="{{cuPgNums}}" as="n" hint-placeholder-count="5">
          <sc-if value="{{n.dots}}"><span style="height:28px;width:20px;display:flex;align-items:center;justify-content:center;color:var(--fg-x94a3b8);font-size:10px;border-right:1px solid var(--bd-xe1e1e1)">…</span></sc-if>
          <sc-if value="{{n.cur}}"><button style="{{n.style}}">{{n.label}}</button></sc-if>
          <sc-if value="{{n.plain}}"><button onClick="{{n.click}}" style="{{n.style}}" style-hover="background:var(--bg-xf5f5f5)">{{n.label}}</button></sc-if>
        </sc-for>
        <button onClick="{{cuPgNext}}" title="التالي" style="{{cuPgNextStyle}}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-5ff99641"></svg></button>
        <button onClick="{{cuPgLast}}" title="الصفحة الأخيرة" style="{{cuPgLastStyle}}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-9e7cf3ce"></svg></button>
      </div>
    </div>
  </div>
  </sc-if>
</div>

<!-- ═══ سجل حركة الشهر — قائمة منسدلة مطوية تحت الجدول ═══ -->
<div style="border-radius:16px;border:1px solid var(--bd-xe2e8f0);background:var(--bg-xffffff);box-shadow:var(--shadow-card);overflow:hidden">
  <div onClick="{{cuLogToggle}}" style="display:flex;align-items:center;gap:11px;padding:13px 16px;cursor:pointer" style-hover="background:var(--bg-a2482502520p7)">
    <span style="width:34px;height:34px;border-radius:12px;background:var(--bg-a185151810p12);color:var(--fg-xb99751);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:var(--shadow-card)"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-6746ac48"></svg></span>
    <span style="flex:1;min-width:0">
      <span style="font-size:13.5px;font-weight:600;color:var(--fg-x141414)">سجل حركة الشهر</span>
      <span style="{{cuLogCountStyle}}">{{cuLogCount}}</span><br>
      <span style="font-size:11px;color:var(--fg-x94a3b8);font-weight:400">{{cuLogSub}}</span>
    </span>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--fg-xb0b6bd)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="{{cuLogChev}}" data-i="i-c92915c6"></svg>
  </div>
  <sc-if value="{{cuLogOpen}}" hint-placeholder-val="{{ false }}">
  <div style="border-top:2px solid var(--bd-a185151810p25)">
    <div class="bs-hbar" style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:10px 12px;background:linear-gradient(to left,var(--bg-a2482502520p8),var(--bg-xffffff))">
      <sc-for list="{{cuLogChips}}" as="c" hint-placeholder-count="5">
      <span onClick="{{c.pick}}" style="{{c.style}}" style-hover="border-color:var(--bd-a185151810p5)">{{c.name}}</span>
      </sc-for>
    </div>
    <sc-if value="{{cuLogHas}}" hint-placeholder-val="{{ true }}">
    <div class="bs-hscroll bs-sthead" style="overflow-x:auto">
      <table class="bs-rtable" style="width:100%;border-collapse:collapse;min-width:820px">
        <thead>
          <tr style="background:linear-gradient(to left,var(--bg-a185151810p05),var(--bg-a185151810p03),var(--bg-a185151810p05));border-bottom:2px solid var(--bd-a185151810p25)">
            <sc-for list="{{cuLogCols}}" as="h" hint-placeholder-count="6">
            <th style="{{h.style}}"><span style="font-size:11px;font-weight:600;color:var(--fg-x53565a);white-space:nowrap">{{h.name}}</span></th>
            </sc-for>
          </tr>
        </thead>
        <tbody>
          <sc-for list="{{cuLogRows}}" as="v" hint-placeholder-count="6">
          <tr style="border-bottom:1px solid var(--bd-xf1f5f9);transition:background .15s" style-hover="background:var(--bg-a2452452450p5)">
            <td data-label="التاريخ" style="padding:8px;text-align:center"><span dir="ltr" style="font-size:11.5px;font-weight:400;color:var(--fg-x475569);font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{v.date}}</span></td>
            <td data-label="الموظف" style="padding:8px">
              <div style="display:flex;align-items:center;gap:8px">
                <span style="width:26px;height:26px;border-radius:9999px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:600;color:var(--fg-x8a6f35);background:linear-gradient(135deg,var(--bg-xefe3cd),var(--bg-xdcc4a0))">{{v.ini}}</span>
                <span style="font-size:12px;font-weight:400;color:var(--fg-x141414);white-space:nowrap">{{v.emp}}</span>
              </div>
            </td>
            <td data-label="الصنف" style="padding:8px">
              <span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:400;color:var(--fg-x3f3f3f)"><i style="width:8px;height:8px;border-radius:2.5px;background:{{v.color}}"></i>{{v.item}}</span>
            </td>
            <td data-label="الرقم التسلسلي" style="padding:8px;text-align:center"><span dir="ltr" style="font-size:11.5px;font-weight:600;color:var(--fg-x8a6f35);font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{v.ser}}</span></td>
            <td data-label="الحركة" style="padding:8px;text-align:center"><span style="{{v.kStyle}}">{{v.kind}}</span></td>
            <td data-label="ملاحظة" style="padding:8px;text-align:center"><span style="font-size:11px;color:var(--fg-x94a3b8);font-weight:400">{{v.note}}</span></td>
          </tr>
          </sc-for>
        </tbody>
      </table>
    </div>
    </sc-if>
    <sc-if value="{{cuLogEmpty}}" hint-placeholder-val="{{ false }}">
    <div style="padding:28px;text-align:center"><span style="font-size:12px;font-weight:400;color:var(--fg-x94a3b8)">لا توجد حركات مطابقة في هذا الشهر</span></div>
    </sc-if>
  </div>
  </sc-if>

</div>
</sc-if>

</div>

</sc-if>
