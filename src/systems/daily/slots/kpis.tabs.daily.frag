      <sc-if value="{{ok_dy}}" hint-placeholder-val="{{ true }}">
      <div onClick="{{go_dy}}" style="{{st_dy}}">
        <div style="{{ic_dy}}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-4c46088b"></svg></div>
        <span style="{{lb_dy}}">مؤشرات التشغيل اليومي</span>
        <sc-if value="{{on_dy}}" hint-placeholder-val="{{ false }}"><span style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:32px;height:2px;border-radius:9999px;background:var(--bg-xb99751)"></span></sc-if>
      </div>
      </sc-if>
      <sc-if value="{{ok_occ}}" hint-placeholder-val="{{ true }}">
      <div onClick="{{go_occ}}" style="{{st_occ}}">
        <div style="{{ic_occ}}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-807df044"></svg></div>
        <span style="{{lb_occ}}">مؤشرات الإشغال</span>
        <sc-if value="{{on_occ}}" hint-placeholder-val="{{ false }}"><span style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:32px;height:2px;border-radius:9999px;background:var(--bg-xb99751)"></span></sc-if>
      </div>
      </sc-if>
      <sc-if value="{{ok_zn}}" hint-placeholder-val="{{ true }}">
      <div onClick="{{go_zn}}" style="{{st_zn}}">
        <div style="{{ic_zn}}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-28f88d58"></svg></div>
        <span style="{{lb_zn}}">مؤشرات المصليات</span>
        <sc-if value="{{on_zn}}" hint-placeholder-val="{{ false }}"><span style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:32px;height:2px;border-radius:9999px;background:var(--bg-xb99751)"></span></sc-if>
      </div>
      </sc-if>
