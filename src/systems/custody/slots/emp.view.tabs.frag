    <sc-if value="{{empCustodyAllowed}}" hint-placeholder-val="{{ true }}">
    <div onClick="{{empGoCustody}}" style="{{empCustodyTabStyle}}">
      <div style="{{empCustodyTabIcon}}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-7ae7d78f"></svg></div>
      <span style="{{empCustodyTabLbl}}">عهد الموظفين</span>
      <sc-if value="{{empOnCustody}}" hint-placeholder-val="{{ false }}"><span style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:32px;height:2px;border-radius:9999px;background:var(--bg-xb99751)"></span></sc-if>
    </div>
    </sc-if>
    <!-- KIVO_265 · مستودع العهد — قرارُ المالك 2026-10-19: تبويبٌ ثالث يخضع لورقة «عهد الموظفين» في شجرة الصلاحيات -->
    <sc-if value="{{empStoreAllowed}}" hint-placeholder-val="{{ true }}">
    <div onClick="{{empGoStore}}" style="{{empStoreTabStyle}}">
      <div style="{{empStoreTabIcon}}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-231d5af6"></svg></div>
      <span style="{{empStoreTabLbl}}">مستودع العهد</span>
      <sc-if value="{{empOnStore}}" hint-placeholder-val="{{ false }}"><span style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:32px;height:2px;border-radius:9999px;background:var(--bg-xb99751)"></span></sc-if>
    </div>
    </sc-if>
