<div dir="rtl" data-screen-label="مؤشرات الإدارة" style="font-family:'Cairo',sans-serif;color:var(--fg-x141414)">
  <sc-if value="{{stripOn}}" hint-placeholder-val="{{ true }}">
  <div style="border-radius:16px;border:2px solid var(--bd-a185151810p1);background:linear-gradient(90deg,var(--bg-a185151810p03),transparent,var(--bg-a185151810p03));padding:12px;margin-bottom:14px">
    <div class="bs-hbar bs-tabstrip" style="display:flex;align-items:center;justify-content:flex-start;gap:8px;padding:4px 0;flex-wrap:wrap">
      <sc-if value="{{ok_read}}" hint-placeholder-val="{{ true }}">
      <div onClick="{{go_read}}" style="{{st_read}}">
        <div style="{{ic_read}}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-a9e1a498"></svg></div>
        <span style="{{lb_read}}">مؤشرات الجاهزية</span>
        <sc-if value="{{on_read}}" hint-placeholder-val="{{ false }}"><span style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:32px;height:2px;border-radius:9999px;background:var(--bg-xb99751)"></span></sc-if>
      </div>
      </sc-if>
@@SYS:kpis.tabs.daily@@@@SYS:kpis.tabs.mid@@@@SYS:kpis.tabs.tasks@@@@SYS:kpis.tabs.tail@@    </div>
  </div>
  </sc-if>
  <sc-if value="{{noneOn}}" hint-placeholder-val="{{ false }}">
  <div style="border-radius:16px;border:1px dashed var(--bd-xe1e1e1);background:var(--bg-xffffff);padding:26px;text-align:center;color:var(--fg-x94a3b8);font-size:12.5px">لا مؤشرات ممنوحة لك في هذه الإدارة</div>
  </sc-if>
  <sc-if value="{{on_read}}" hint-placeholder-val="{{ true }}"><dc-import name="Employees" solo="readiness" hint-size="100%,1100px"></dc-import></sc-if>
@@SYS:kpis.mounts.daily@@@@SYS:kpis.mounts.mid@@@@SYS:kpis.mounts.tasks@@@@SYS:kpis.mounts.tail@@</div>
