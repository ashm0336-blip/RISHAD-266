<div id="bsPtRoot" data-ptab="{{ptab}}" data-pton="{{ptOn}}" dir="rtl" data-screen-label="الخطة التشغيلية" style="font-family:'Cairo',sans-serif;color:var(--fg-x141414)">
  <div class="pt-strip" style="border-radius:16px;border:2px solid var(--bd-a185151810p1);background:linear-gradient(90deg,var(--bg-a185151810p03),transparent,var(--bg-a185151810p03));padding:12px;margin-bottom:14px">
    <div class="bs-hbar bs-tabstrip" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:4px 0;flex-wrap:wrap">
      <sc-if value="{{readAllowed}}" hint-placeholder-val="{{ true }}">
      <div onClick="{{goRead}}" class="pt-tab pt-read">
        <div class="pt-ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-a9e1a498"></svg></div>
        <span class="pt-lbl">مؤشرات الجاهزية</span>
        <sc-if value="{{onRead}}" hint-placeholder-val="{{ true }}"><span style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:32px;height:2px;border-radius:9999px;background:var(--bg-xb99751)"></span></sc-if>
      </div>
      </sc-if>
@@SYS:planning.tabs@@    </div>
  </div>
  <sc-if value="{{onRead}}" hint-placeholder-val="{{ false }}"><dc-import name="Employees" solo="readiness" hint-size="100%,1100px"></dc-import></sc-if>
@@SYS:planning.mounts@@</div>