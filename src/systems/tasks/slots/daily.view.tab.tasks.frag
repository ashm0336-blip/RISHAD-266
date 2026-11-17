    <sc-if value="{{dsTasksTabShow}}" hint-placeholder-val="{{ true }}">
    <div onClick="{{dsGoTasks}}" style="{{dsTasksTabStyle}}">
      <div style="{{dsTasksTabIcon}}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-cc942376"></svg></div>
      <span style="{{dsTasksTabLbl}}">المهام</span>
      <sc-if value="{{dsOnTasks}}" hint-placeholder-val="{{ false }}"><span style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:32px;height:2px;border-radius:9999px;background:var(--bg-xb99751)"></span></sc-if>
    </div>
    </sc-if>
