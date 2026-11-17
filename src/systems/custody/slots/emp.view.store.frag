<!-- ═══ KIVO_265 · مستودع العهد — قرارُ المالك 2026-10-19 ═══
     الأصنافُ تُدار هنا وحدها (إضافة · تعديل · حذف) والتسليمُ في «عهد الموظفين» يختار من المتاح فقط.
     الصلاحيات: مفاتيحُ «إنشاء صنف عهدة» و«تعديل صنف عهدة» و«حذف صنف» تحت ورقة «عهد الموظفين» في الشجرة. -->
<sc-if value="{{empOnStore}}" hint-placeholder-val="{{ false }}">

<div style="display:flex;flex-direction:column;gap:16px">

<div style="border-radius:16px;border:1px solid var(--bd-a185151810p2);background:var(--bg-xffffff);box-shadow:var(--shadow-card);overflow:hidden">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;border-bottom:1px solid var(--bd-a185151810p1);background:linear-gradient(to left,var(--bg-a185151810p05),transparent);flex-wrap:wrap">
    <div style="display:flex;align-items:center;gap:10px;min-width:0">
      <div style="width:36px;height:36px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:var(--bg-a185151810p1);color:var(--fg-xb99751)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-231d5af6"></svg></div>
      <div style="min-width:0">
        <div style="font-size:14px;font-weight:600;color:var(--fg-x141414);line-height:1.4">مستودع العهد</div>
        <div style="font-size:11px;font-weight:400;color:var(--fg-x94a3b8);line-height:1.5">{{stSub}} · الحالة محسوبة من سجلّ الحركات حتى الشهر الجاري</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
      <sc-for list="{{stKpis}}" as="k" hint-placeholder-count="4">
      <span style="{{k.style}}">{{k.label}} <b dir="ltr" style="font-feature-settings:'tnum'">{{k.val}}</b></span>
      </sc-for>
      <sc-if value="{{stCanAdd}}" hint-placeholder-val="{{ true }}">
      <button onClick="{{stAddOpen}}" title="أضف صنفاً جديداً إلى المستودع" style="height:32px;padding:0 13px;border-radius:9px;border:0;display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;font-family:'Cairo',sans-serif;color:var(--text-on-brand);background:linear-gradient(135deg,var(--bg-xb99751),var(--bg-a185151810p85));cursor:pointer">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" data-i="i-de4e6997"></svg>صنف جديد
      </button>
      </sc-if>
    </div>
  </div>

  <sc-if value="{{stReadOnly}}" hint-placeholder-val="{{ false }}">
  <div style="margin:12px 14px 0"><div style="{{empPmNoteStyle}}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0" data-i="i-9d08ae4a"></svg><span>للاطّلاع فقط — إضافةُ الأصناف وتعديلُها وحذفُها بصلاحيات «عهد الموظفين» (إنشاء · تعديل · حذف صنف)</span></div></div>
  </sc-if>

  <sc-if value="{{stFormOn}}" hint-placeholder-val="{{ false }}">
  <div style="margin:12px 14px 0;border:1px solid var(--bd-a185151810p35);border-radius:12px;background:var(--bg-a185151810p04);padding:11px 12px">
    <div style="font-size:11.5px;font-weight:700;color:var(--fg-x8a6f35);margin-bottom:9px">{{stFormTitle}}</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end">
      <div style="flex:1 1 170px;min-width:0">
        <label style="display:block;font-size:10px;font-weight:600;color:var(--fg-x94a3b8);margin-bottom:4px">اسم الصنف</label>
        <input value="{{stFName}}" onChange="{{stFSetName}}" placeholder="جهاز لاسلكي" style="width:100%;height:32px;padding:0 10px;font-size:11.5px;background:var(--bg-xffffff);border:1px solid var(--bd-xe1e1e1);border-radius:9px;outline:none;font-family:'Cairo',sans-serif;box-sizing:border-box"/>
      </div>
      <div style="width:110px;flex-shrink:0">
        <label style="display:block;font-size:10px;font-weight:600;color:var(--fg-x94a3b8);margin-bottom:4px">{{stFQtyLbl}}</label>
        <input value="{{stFQty}}" onChange="{{stFSetQty}}" dir="ltr" inputMode="numeric" style="width:100%;height:32px;padding:0 10px;font-size:11.5px;background:var(--bg-xffffff);border:1px solid var(--bd-xe1e1e1);border-radius:9px;outline:none;font-family:'Cairo',sans-serif;box-sizing:border-box"/>
      </div>
      <div style="width:110px;flex-shrink:0">
        <label style="display:block;font-size:10px;font-weight:600;color:var(--fg-x94a3b8);margin-bottom:4px">بادئة الرقم</label>
        <input value="{{stFPre}}" onChange="{{stFSetPre}}" dir="ltr" placeholder="RD" style="width:100%;height:32px;padding:0 10px;font-size:11.5px;background:var(--bg-xffffff);border:1px solid var(--bd-xe1e1e1);border-radius:9px;outline:none;font-family:'Cairo',sans-serif;box-sizing:border-box"/>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:9px;margin-top:10px;flex-wrap:wrap">
      <span style="font-size:10px;font-weight:600;color:var(--fg-x94a3b8)">اللون</span>
      <span style="display:inline-flex;gap:6px;align-items:center">
        <sc-for list="{{stFColors}}" as="c" hint-placeholder-count="8">
        <span onClick="{{c.pick}}" style="{{c.style}}"></span>
        </sc-for>
      </span>
      <span style="margin-right:auto;display:inline-flex;gap:7px">
        <button onClick="{{stFCancel}}" style="height:30px;padding:0 13px;border-radius:9px;border:1px solid var(--bd-xe1e1e1);background:var(--bg-xffffff);color:var(--fg-x53565a);font-size:11px;font-weight:600;cursor:pointer;font-family:'Cairo',sans-serif">إلغاء</button>
        <button onClick="{{stFSave}}" style="height:30px;padding:0 15px;border-radius:9px;border:0;color:var(--text-on-brand);font-size:11px;font-weight:700;cursor:pointer;font-family:'Cairo',sans-serif;background:linear-gradient(135deg,var(--bg-xb99751),var(--bg-a185151810p85))">حفظ</button>
      </span>
    </div>
    <sc-if value="{{stFWarnOn}}" hint-placeholder-val="{{ false }}">
    <div style="margin-top:9px;display:flex;align-items:flex-start;gap:6px;font-size:10.5px;font-weight:600;color:var(--fg-xb45309);line-height:1.7">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px" data-i="i-9d08ae4a"></svg>
      <span>{{stFWarn}}</span>
    </div>
    </sc-if>
  </div>
  </sc-if>

  <div style="overflow-x:auto;padding:12px 0 0">
    <table class="bs-rtable" style="width:100%;border-collapse:collapse;min-width:860px">
      <thead>
        <tr style="background:linear-gradient(to left,var(--bg-a185151810p05),var(--bg-a185151810p03),var(--bg-a185151810p05));border-bottom:2px solid var(--bd-a185151810p25)">
          <th style="padding:10px 6px;width:46px;font-size:11px;font-weight:600;color:var(--fg-x53565a);text-align:center">م</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:600;color:var(--fg-x53565a);text-align:right">الصنف</th>
          <th style="padding:10px 8px;width:120px;font-size:11px;font-weight:600;color:var(--fg-x53565a);text-align:center">بادئة الرقم</th>
          <th style="padding:10px 8px;width:90px;font-size:11px;font-weight:600;color:var(--fg-x53565a);text-align:center">الكمية</th>
          <th style="padding:10px 8px;width:90px;font-size:11px;font-weight:600;color:var(--fg-x53565a);text-align:center">بعهدة</th>
          <th style="padding:10px 8px;width:90px;font-size:11px;font-weight:600;color:var(--fg-x53565a);text-align:center">متاح</th>
          <th style="padding:10px 8px;width:100px;font-size:11px;font-weight:600;color:var(--fg-x53565a);text-align:center">تالف / مفقود</th>
          <th style="padding:10px 8px;width:170px;font-size:11px;font-weight:600;color:var(--fg-x53565a);text-align:center">الحالة</th>
          <th style="padding:10px 8px;width:90px;font-size:11px;font-weight:600;color:var(--fg-x53565a);text-align:center">إجراءات</th>
        </tr>
      </thead>
      <tbody>
        <sc-for list="{{stRows}}" as="r" hint-placeholder-count="5">
        <tr style="border-bottom:1px solid var(--bd-xf1f5f9);transition:background .15s" style-hover="background:var(--bg-a2452452450p5)">
          <td data-label="م" style="padding:8px 6px;text-align:center"><span style="font-size:13px;font-weight:400;color:var(--fg-x53565a);font-family:'Cairo',sans-serif">{{r.sn}}</span></td>
          <td data-label="الصنف" style="padding:6px 12px">
            <div style="display:flex;align-items:center;gap:9px;min-width:0">
              <i style="width:12px;height:12px;border-radius:4px;flex-shrink:0;background:{{r.color}}"></i>
              <span style="font-size:13px;font-weight:600;color:var(--fg-x141414);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{r.name}}</span>
            </div>
          </td>
          <td data-label="بادئة الرقم" style="padding:6px 8px;text-align:center"><span dir="ltr" style="font-size:11.5px;font-weight:600;color:var(--fg-x8a6f35);font-family:'Cairo',sans-serif;font-feature-settings:'tnum'" title="الرقم التالي عند التسليم: {{r.nextSer}}">{{r.prefix}}</span><br><span dir="ltr" style="font-size:10px;color:var(--fg-x94a3b8);font-family:'Cairo',sans-serif">{{r.nextSer}}</span></td>
          <td data-label="الكمية" style="padding:6px 8px;text-align:center"><span dir="ltr" style="font-size:13px;font-weight:600;color:var(--fg-x141414);font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{r.qty}}</span></td>
          <td data-label="بعهدة" style="padding:6px 8px;text-align:center"><span dir="ltr" style="font-size:13px;font-weight:600;color:var(--fg-xb99751);font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{r.held}}</span></td>
          <td data-label="متاح" style="padding:6px 8px;text-align:center"><span dir="ltr" style="{{r.availStyle}}">{{r.avail}}</span></td>
          <td data-label="تالف / مفقود" style="padding:6px 8px;text-align:center"><span dir="ltr" title="{{r.deadTip}}" style="font-size:13px;font-weight:600;color:var(--fg-xdc2626);font-family:'Cairo',sans-serif;font-feature-settings:'tnum';cursor:help">{{r.dead}}</span></td>
          <td data-label="الحالة" style="padding:6px 8px;text-align:center"><span style="{{r.stStyle}}">{{r.stLabel}}</span></td>
          <td data-label="إجراءات" style="padding:6px 8px;text-align:center">
            <span style="display:inline-flex;gap:4px;align-items:center">
              <span onClick="{{r.edit}}" title="تعديل الصنف" style="{{r.editStyle}}" style-hover="background:var(--bg-a185151810p1);color:var(--fg-xb99751)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-099046fc"></svg></span>
              <span onClick="{{r.del}}" title="{{r.delTip}}" style="{{r.delStyle}}" style-hover="background:var(--bg-a22038380p08)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-488e8910"></svg></span>
            </span>
          </td>
        </tr>
        </sc-for>
      </tbody>
    </table>
    <sc-if value="{{stEmpty}}" hint-placeholder-val="{{ false }}">
    <div style="padding:28px 14px;text-align:center;font-size:12px;font-weight:400;color:var(--fg-x94a3b8);line-height:1.9">المستودع فارغ — أضِف أوّل صنفٍ من زرّ «صنف جديد» أعلاه، وبعدها يظهر في خطوة التسليم تلقائياً</div>
    </sc-if>
  </div>
  <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-top:1px solid var(--bd-a185151810p1);font-size:10.5px;font-weight:400;color:var(--fg-x94a3b8);line-height:1.7;flex-wrap:wrap">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;color:var(--fg-xb99751)" data-i="i-7ae7d78f"></svg>
    <span>التسليمُ من تبويب «عهد الموظفين» يعرض الأصنافَ المتاحة هنا فقط · المتاح = الكمية − بعهدة − تالف/مفقود · لا يُحذف صنفٌ له حركاتٌ مسجّلة، بل تُصفَّر كميته.</span>
    <span onClick="{{stGoCustody}}" style="margin-right:auto;color:var(--fg-x8a6f35);font-weight:600;cursor:pointer;white-space:nowrap">إلى عهد الموظفين ←</span>
  </div>
</div>

</div>

</sc-if>
