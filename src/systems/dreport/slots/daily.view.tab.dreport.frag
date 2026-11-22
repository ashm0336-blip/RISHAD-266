    <sc-if value="{{dsDrTabShow}}" hint-placeholder-val="{{ true }}">
    <div onClick="{{dsGoDr}}" style="{{dsDrTabStyle}}">
      <div style="{{dsDrTabIcon}}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-43ca6054"></svg></div>
      <span style="{{dsDrTabLbl}}">التقرير اليومي</span>
      <sc-if value="{{dsOnDr}}" hint-placeholder-val="{{ false }}"><span style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:32px;height:2px;border-radius:9999px;background:var(--bg-xb99751)"></span></sc-if>
    </div>
    </sc-if>
