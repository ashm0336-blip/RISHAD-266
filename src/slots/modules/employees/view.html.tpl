<div dir="rtl" data-screen-label="إدارة الكوادر — الموظفون" style="font-family:'Cairo',sans-serif;color:var(--fg-x141414);margin:0 auto;display:flex;flex-direction:column;gap:16px">
@@SYS:emp.view.status@@
<!-- صلاحية «عرض فقط»: سطرٌ واحد يقول السبب — الأزرار تختفي لا تُعطَّل،
     والزرّ الرمادي يثير سؤال «ليش ما يشتغل؟» بلا جواب -->
<sc-if value="{{empPmReadOnly}}" hint-placeholder-val="{{ false }}">
<div style="{{empPmNoteStyle}}">
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0" data-i="i-ec9ec7cc"></svg>
  <span>صلاحيتك على هذه الصفحة: <b style="font-weight:800">عرض فقط</b> — أدوات الإضافة والتعديل والحذف مخفيّة. راجع مسؤول المنصة إن احتجت تعديلاً.</span>
</div>
</sc-if>

<sc-if value="{{addOpen}}" hint-placeholder-val="{{ false }}">
<div onClick="{{closeAdd}}" style="position:fixed;inset:0;z-index:50;background:var(--bg-a0000p5);display:flex;align-items:center;justify-content:center;padding:24px">
  <div onClick="{{stopClick}}" style="background:var(--bg-xffffff);border-radius:16px;box-shadow:var(--shadow-elevated);width:100%;max-width:520px;max-height:90vh;overflow-y:auto;padding:24px;display:flex;flex-direction:column;gap:14px">
    <div style="display:flex;align-items:center;gap:10px">
      <div style="width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--bg-a185151810p1);border:1px solid var(--bd-a185151810p25);color:var(--fg-xb99751)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-f9ceca4b"></svg>
      </div>
      <div style="flex:1">
        <h2 style="font-size:18px;font-weight:600;margin:0">{{dlgTitle}}</h2>
        <p style="font-size:11px;color:var(--fg-x53565a);margin:2px 0 0">البيانات الأساسية — يمكن استكمال الملف لاحقاً</p>
      </div>
      <button onClick="{{closeAdd}}" style="width:32px;height:32px;border-radius:8px;border:0;background:var(--bg-xf5f5f5);color:var(--fg-x53565a);cursor:pointer;display:flex;align-items:center;justify-content:center" style-hover="background:var(--bg-xe1e1e1)" aria-label="إغلاق"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-26175592"></svg></button>
    </div>
    <div class="bs-grid bs-stackcards" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div>
        <label style="font-size:11px;font-weight:400;color:var(--fg-x374151);display:block;margin-bottom:5px">اسم الموظف *</label>
        <input value="{{fName}}" onChange="{{onFName}}" placeholder="مثال: أحمد بن سالم الحربي" style="width:100%;height:38px;border:1px solid var(--bd-xe1e1e1);border-radius:8px;padding:0 12px;font-size:13px;outline:none;font-family:'Cairo',sans-serif;box-sizing:border-box" style-focus="border-color:var(--bd-xb99751);box-shadow:0 0 0 2px rgba(185,151,81,0.15)">
        <sc-if value="{{fErrName}}"><div style="margin-top:5px;display:flex;align-items:center;gap:5px;font-size:10.5px;font-weight:600;color:var(--fg-xb91c1c);line-height:1.7"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0" data-i="i-9e57d679"></svg><span>{{fErrName}}</span></div></sc-if>
      </div>
      <div>
        <label style="font-size:11px;font-weight:400;color:var(--fg-x374151);display:block;margin-bottom:5px">الرقم الوظيفي <span style="color:var(--fg-x9a7e40);font-weight:600">(كلمة المرور)</span></label>
        <input dir="ltr" value="{{fEmpno}}" onChange="{{onFEmpno}}" placeholder="5 أو 6 أرقام — مثال: 10023" maxLength="{{ 6 }}" style="width:100%;height:38px;border:1px solid var(--bd-xe1e1e1);border-radius:8px;padding:0 12px;font-size:13px;outline:none;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';box-sizing:border-box;text-align:center" style-focus="border-color:var(--bd-xb99751);box-shadow:0 0 0 2px rgba(185,151,81,0.15)">
        <sc-if value="{{fErrEmpno}}"><div style="margin-top:5px;display:flex;align-items:center;gap:5px;font-size:10.5px;font-weight:600;color:var(--fg-xb91c1c);line-height:1.7"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0" data-i="i-9e57d679"></svg><span>{{fErrEmpno}}</span></div></sc-if>
      </div>
      <div>
        <label style="font-size:11px;font-weight:400;color:var(--fg-x374151);display:block;margin-bottom:5px">رقم الهوية <span style="color:var(--fg-x9a7e40);font-weight:600">(اسم المستخدم)</span></label>
        <input dir="ltr" value="{{fNid}}" onChange="{{onFNid}}" placeholder="1XXXXXXXXX" maxLength="{{ 10 }}" style="width:100%;height:38px;border:1px solid var(--bd-xe1e1e1);border-radius:8px;padding:0 12px;font-size:13px;outline:none;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';box-sizing:border-box;text-align:center" style-focus="border-color:var(--bd-xb99751)">
        <sc-if value="{{fErrNid}}"><div style="margin-top:5px;display:flex;align-items:center;gap:5px;font-size:10.5px;font-weight:600;color:var(--fg-xb91c1c);line-height:1.7"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0" data-i="i-9e57d679"></svg><span>{{fErrNid}}</span></div></sc-if>
      </div>
      <div>
        <label style="font-size:11px;font-weight:400;color:var(--fg-x374151);display:block;margin-bottom:5px">رقم الجوال <span style="color:var(--fg-x9a7e40);font-weight:600">(اسم المستخدم البديل)</span></label>
        <input dir="ltr" value="{{fPhone}}" onChange="{{onFPhone}}" placeholder="05XXXXXXXX" maxLength="{{ 10 }}" style="width:100%;height:38px;border:1px solid var(--bd-xe1e1e1);border-radius:8px;padding:0 12px;font-size:13px;outline:none;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';box-sizing:border-box;text-align:center" style-focus="border-color:var(--bd-xb99751)">
        <sc-if value="{{fErrPhone}}"><div style="margin-top:5px;display:flex;align-items:center;gap:5px;font-size:10.5px;font-weight:600;color:var(--fg-xb91c1c);line-height:1.7"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0" data-i="i-9e57d679"></svg><span>{{fErrPhone}}</span></div></sc-if>
      </div>
      <div>
        <label style="font-size:11px;font-weight:400;color:var(--fg-x374151);display:block;margin-bottom:5px">البريد الإلكتروني</label>
        <input dir="ltr" value="{{fEmail}}" onChange="{{onFEmail}}" placeholder="name@example.gov.sa" style="width:100%;height:38px;border:1px solid var(--bd-xe1e1e1);border-radius:8px;padding:0 12px;font-size:13px;outline:none;font-family:'Cairo',sans-serif;box-sizing:border-box;text-align:left" style-focus="border-color:var(--bd-xb99751)">
        <sc-if value="{{fErrEmail}}"><div style="margin-top:5px;display:flex;align-items:center;gap:5px;font-size:10.5px;font-weight:600;color:var(--fg-xb91c1c);line-height:1.7"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" style="flex-shrink:0" data-i="i-9e5875ba"></svg>{{fErrEmail}}</div></sc-if>
      </div>
      <div>
        <label style="font-size:11px;font-weight:400;color:var(--fg-x374151);display:block;margin-bottom:5px">نوع التوظيف</label>
        <div style="position:relative">
          <button onClick="{{typeToggle}}" style="{{typeBtnStyle}}">
            <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{typeValue}}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="{{typeChev}}" data-i="i-c92915c6"></svg>
          </button>
          <sc-if value="{{typeOpen}}" hint-placeholder-val="{{ false }}">
          <div data-bs-dd="1" style="position:absolute;top:100%;right:0;left:0;z-index:60;margin-top:4px;background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p35);border-radius:10px;box-shadow:var(--shadow-elevated);overflow:hidden">
            <div style="max-height:170px;overflow-y:auto;padding:4px">
              <sc-for list="{{typeOpts}}" as="o" hint-placeholder-count="4">
              <div onClick="{{o.pick}}" style="{{o.style}}" style-hover="background:var(--bg-a185151810p06)">
                <sc-if value="{{o.selected}}" hint-placeholder-val="{{ false }}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-xb99751)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0" data-i="i-c37d9e39"></svg></sc-if>
                <sc-if value="{{o.editing}}" hint-placeholder-val="{{ false }}"><input value="{{o.editVal}}" onChange="{{o.editOn}}" onKeyDown="{{o.editKd}}" onClick="{{o.stop}}" style="flex:1;min-width:0;height:26px;border:1px solid var(--bd-xb99751);border-radius:6px;padding:0 8px;font-size:11.5px;font-family:'Cairo',sans-serif;outline:none;box-sizing:border-box;background:var(--bg-xffffff);color:var(--fg-x141414)"><button onClick="{{o.editSave}}" title="حفظ الاسم الجديد وترحيله لكل موظف يحمل الاسم القديم" style="width:22px;height:22px;border-radius:6px;border:0;background:var(--bg-a4120870p12);color:var(--fg-x047857);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" data-i="i-c37d9e39"></svg></button><button onClick="{{o.editCancel}}" title="إلغاء التعديل" style="width:22px;height:22px;border-radius:6px;border:0;background:transparent;color:var(--fg-x94a3b8);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" data-i="i-26175592"></svg></button></sc-if><sc-if
                    value="{{o.notEdit}}" hint-placeholder-val="{{ true }}"><span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{o.name}}</span><button onClick="{{o.edit}}" title="تعديل اسم الخيار" style="width:22px;height:22px;border-radius:6px;border:0;background:transparent;color:var(--fg-xcbd5e1);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0" style-hover="background:var(--bg-a185151810p12);color:var(--fg-x8a6f35)"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" data-i="i-f6efaf94"></svg></button>
                <sc-if value="{{o.canDel}}" hint-placeholder-val="{{ true }}">
                <button onClick="{{o.del}}" title="حذف الخيار" style="width:22px;height:22px;border-radius:6px;border:0;background:transparent;color:var(--fg-xcbd5e1);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0" style-hover="background:var(--bg-xfef2f2);color:var(--fg-xef4444)"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" data-i="i-9bf9a6dd"></svg></button>
                </sc-if></sc-if>
              </div>
              </sc-for>
            </div>
            <div style="display:flex;gap:6px;padding:6px;border-top:1px solid var(--bd-xf1f5f9);background:var(--bg-xfafafa)">
              <input value="{{ddNew}}" onChange="{{onDdNew}}" onKeyDown="{{onDdKey}}" placeholder="إضافة خيار جديد..." style="flex:1;height:30px;border:1px dashed var(--bd-xcbd5e1);border-radius:8px;padding:0 10px;font-size:11px;outline:none;font-family:'Cairo',sans-serif;box-sizing:border-box;background:var(--bg-xffffff)" style-focus="border-color:var(--bd-xb99751)">
              <button onClick="{{typeAdd}}" title="إضافة" style="width:30px;height:30px;border-radius:8px;border:0;background:var(--bg-xb99751);color:var(--text-on-brand);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0" style-hover="background:var(--bg-xa6884a)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" data-i="i-de4e6997"></svg></button>
            </div>
          </div>
          </sc-if>
        </div>
      </div>
      <div>
        <label style="font-size:11px;font-weight:400;color:var(--fg-x374151);display:block;margin-bottom:5px">الجنس</label>
        <div style="position:relative">
          <button onClick="{{genderToggle}}" style="{{genderBtnStyle}}">
            <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{genderValue}}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="{{genderChev}}" data-i="i-c92915c6"></svg>
          </button>
          <sc-if value="{{genderOpen}}" hint-placeholder-val="{{ false }}">
          <div data-bs-dd="1" style="position:absolute;top:100%;right:0;left:0;z-index:60;margin-top:4px;background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p35);border-radius:10px;box-shadow:var(--shadow-elevated);overflow:hidden;text-align:right">
            <div style="padding:4px">
              <sc-for list="{{genderOpts}}" as="o" hint-placeholder-count="2">
              <div onClick="{{o.pick}}" style="{{o.style}}" style-hover="background:var(--bg-a185151810p06)">
                <sc-if value="{{o.selected}}" hint-placeholder-val="{{ false }}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-xb99751)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0" data-i="i-c37d9e39"></svg></sc-if>
                <span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{o.name}}</span>
              </div>
              </sc-for>
            </div>
          </div>
          </sc-if>
        </div>
      </div>
    </div>
    <div style="display:flex;justify-content:flex-start;gap:8px">
      <button onClick="{{saveEmp}}" style="height:38px;padding:0 20px;border-radius:10px;font-size:13px;font-weight:400;background:var(--bg-xb99751);color:var(--text-on-brand);border:0;cursor:pointer;font-family:'Cairo',sans-serif" style-hover="background:var(--bg-xa6884a)">{{dlgAction}}</button>
      <button onClick="{{closeAdd}}" style="height:38px;padding:0 16px;border-radius:10px;font-size:13px;font-weight:400;background:var(--bg-xffffff);color:var(--fg-x141414);border:1px solid var(--bd-xe1e1e1);cursor:pointer;font-family:'Cairo',sans-serif" style-hover="background:var(--bg-xf5f5f5)">إلغاء</button>
    </div>
  </div>
</div>
</sc-if>

<sc-if value="{{confirmOpen}}" hint-placeholder-val="{{ false }}">
<div onClick="{{confirmCancel}}" style="position:fixed;inset:0;z-index:60;background:var(--bg-a0000p5);display:flex;align-items:center;justify-content:center;padding:24px">
  <div onClick="{{stopClick}}" style="background:var(--bg-xffffff);border-radius:16px;box-shadow:var(--shadow-elevated);width:100%;max-width:400px;padding:24px;text-align:center">
    <div style="width:56px;height:56px;border-radius:16px;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;background:var(--bg-xfef2f2);border:1px solid var(--bd-xfecaca);color:var(--fg-xef4444)">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-5f010ee5"></svg>
    </div>
    <h2 style="font-size:17px;font-weight:600;margin:0 0 6px">حذف الموظف</h2>
    <p style="font-size:13px;color:var(--fg-x53565a);line-height:1.8;margin:0 0 4px">{{confirmPre}} <b style="color:var(--fg-x141414)">{{confirmName}}</b>؟</p>
    <sc-if value="{{confirmScopeOn}}" hint-placeholder-val="{{ false }}"><p style="font-size:11px;color:var(--fg-xb45309);background:var(--bg-a245158110p07);border:1px solid var(--bd-a245158110p3);border-radius:10px;padding:8px 10px;line-height:1.9;margin:0 0 8px;text-align:right">{{confirmScope}}</p></sc-if>
    <p style="font-size:11px;color:var(--fg-xef4444);margin:0 0 18px">لا يمكن التراجع عن هذا الإجراء.</p>
    <div style="display:flex;justify-content:center;gap:8px">
      <button disabled="{{!confirmReady}}" onClick="{{confirmDo}}" style="height:38px;padding:0 20px;border-radius:10px;font-size:13px;font-weight:400;background:var(--danger);color:var(--text-on-fill);border:0;cursor:pointer;font-family:'Cairo',sans-serif" style-hover="background:var(--danger)">تأكيد الحذف</button>
      <button onClick="{{confirmCancel}}" style="height:38px;padding:0 16px;border-radius:10px;font-size:13px;font-weight:400;background:var(--bg-xffffff);color:var(--fg-x141414);border:1px solid var(--bd-xe1e1e1);cursor:pointer;font-family:'Cairo',sans-serif" style-hover="background:var(--bg-xf5f5f5)">إلغاء</button>
    </div>
  </div>
</div>
</sc-if>


<sc-if value="{{viewOpen}}" hint-placeholder-val="{{ false }}">
<!-- ═══ عرض الموظف من الجدول: بطاقةُ عرض البطاقات نفسها حرفياً (نفس القالب أدناه) في نافذة منبثقة — تُغلق بـ × أو بالنقر خارجها ═══ -->
<div onClick="{{viewClose}}" style="position:fixed;inset:0;z-index:60;background:var(--bg-a0000p5);display:flex;align-items:center;justify-content:center;padding:24px">
  <div onClick="{{stopClick}}" style="position:relative;width:100%;max-width:300px">
    <button onClick="{{viewClose}}" title="إغلاق" style="position:absolute;top:-14px;left:-14px;z-index:2;width:32px;height:32px;border-radius:9999px;border:1px solid var(--bd-a185151810p35);background:var(--bg-xffffff);color:var(--fg-x53565a);cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-soft)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" data-i="i-26175592"></svg></button>
    <div class="bs-cardgrid" style="display:grid;grid-template-columns:1fr">
    <sc-for list="{{viewRows}}" as="e" hint-placeholder-count="1">
  <div style="background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p25);border-radius:14px;overflow:visible;box-shadow:var(--shadow-soft);transition:all .2s;display:flex;flex-direction:column" style-hover="box-shadow:0 12px 28px -12px rgba(154,126,64,0.35)">
    <div style="background:linear-gradient(135deg,var(--bg-x303d48) 0%,var(--bg-x3d4c59) 60%,var(--bg-x303d48) 100%);border-radius:13px 13px 0 0;height:14px;position:relative;display:flex;align-items:center;justify-content:center">
      <div style="width:56px;height:3px;border-radius:9999px;background:linear-gradient(90deg,var(--bg-xe6d29d),var(--bg-xb99751),var(--bg-x9a7e40))"></div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding:10px 10px 0">
      <div style="width:44px;height:44px;border-radius:9999px;display:flex;align-items:center;justify-content:center;color:var(--fg-x303d48);font-weight:600;font-size:17px;background:linear-gradient(135deg,var(--bg-xe6d29d),var(--bg-xb99751));box-shadow:0 3px 8px rgba(154,126,64,0.35);border:2px solid var(--bd-a2552552550p9)">{{e.initial}}</div>
      <sc-if value="{{e.notEditing}}">
        <div style="font-size:13px;font-weight:600;color:var(--fg-x141414);margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">{{e.name}}</div>
      </sc-if>
      <sc-if value="{{e.editing}}">
        <input value="{{e.fName}}" onChange="{{e.onIName}}" placeholder="اسم الموظف" style="width:100%;height:28px;margin-top:6px;border:1px solid var(--bd-xb99751);border-radius:6px;padding:0 8px;font-size:12px;font-weight:400;outline:none;font-family:'Cairo',sans-serif;box-sizing:border-box;text-align:center">
      </sc-if>
    </div>
    <div style="padding:10px 12px;display:flex;flex-direction:column;gap:6px;flex:1">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <span style="font-size:9px;font-weight:400;color:var(--fg-x94a3b8);flex-shrink:0">الرقم الوظيفي</span>
        <sc-if value="{{e.notEditing}}"><span dir="ltr" style="font-size:11px;font-weight:400;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';color:var(--fg-x141414)">{{e.empnoDisp}}</span></sc-if>
        <sc-if value="{{e.editing}}"><input dir="ltr" value="{{e.fEmpno}}" onChange="{{e.onIEmpno}}" maxLength="{{ 6 }}" style="width:90px;height:26px;border:1px solid var(--bd-xb99751);border-radius:6px;padding:0 6px;font-size:11px;text-align:center;outline:none;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';box-sizing:border-box"></sc-if>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <span style="font-size:9px;font-weight:400;color:var(--fg-x94a3b8);flex-shrink:0">رقم الهوية</span>
        <sc-if value="{{e.notEditing}}"><span dir="ltr" style="font-size:11px;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';color:var(--fg-x475569)">{{e.nid}}</span></sc-if>
        <sc-if value="{{e.editing}}"><input dir="ltr" value="{{e.fNid}}" onChange="{{e.onINid}}" maxLength="{{ 10 }}" style="width:110px;height:26px;border:1px solid var(--bd-xb99751);border-radius:6px;padding:0 6px;font-size:11px;text-align:center;outline:none;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';box-sizing:border-box"></sc-if>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <span style="font-size:9px;font-weight:400;color:var(--fg-x94a3b8);flex-shrink:0">رقم الجوال</span>
        <sc-if value="{{e.notEditing}}"><span dir="ltr" style="font-size:11px;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';color:var(--fg-x475569)">{{e.phone}}</span></sc-if>
        <sc-if value="{{e.editing}}"><input dir="ltr" value="{{e.fPhone}}" onChange="{{e.onIPhone}}" maxLength="{{ 10 }}" style="width:110px;height:26px;border:1px solid var(--bd-xb99751);border-radius:6px;padding:0 6px;font-size:11px;text-align:center;outline:none;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';box-sizing:border-box"></sc-if>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <span style="font-size:9px;font-weight:400;color:var(--fg-x94a3b8);flex-shrink:0">البريد الإلكتروني</span>
        <sc-if value="{{e.notEditing}}"><span dir="ltr" style="font-size:10.5px;font-family:'Cairo',sans-serif;color:var(--fg-x475569);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:150px">{{e.emailD}}</span></sc-if>
        <sc-if value="{{e.editing}}"><input dir="ltr" value="{{e.fEmail}}" onChange="{{e.onIEmail}}" placeholder="name@example.gov.sa" style="width:150px;height:26px;border:1px solid var(--bd-xb99751);border-radius:6px;padding:0 6px;font-size:10.5px;text-align:left;outline:none;font-family:'Cairo',sans-serif;box-sizing:border-box"></sc-if>
      </div>
      <sc-if value="{{e.notEditing}}">
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:2px;justify-content:center">
          <span style="display:inline-flex;padding:2px 9px;border-radius:6px;font-size:9px;font-weight:400;{{e.typeBadge}}">{{e.typeD}}</span>
        </div>
      </sc-if>
      <sc-if value="{{e.editing}}">
        <div style="display:flex;flex-direction:column;gap:5px;margin-top:2px">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:9px;font-weight:400;color:var(--fg-x94a3b8);width:52px;flex-shrink:0">التوظيف</span>
            <div style="position:relative;flex:1;text-align:right">
              <button onClick="{{e.iTypeToggle}}" style="{{e.iTypeBtnStyle}}">
                <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{e.iTypeValue}}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="{{e.iTypeChev}}" data-i="i-c92915c6"></svg>
              </button>
              <sc-if value="{{e.iTypeOpen}}" hint-placeholder-val="{{ false }}">
              <div data-bs-dd="1" style="position:absolute;top:100%;right:0;left:0;min-width:150px;z-index:70;margin-top:4px;background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p35);border-radius:10px;box-shadow:var(--shadow-elevated);overflow:hidden">
                <div style="max-height:150px;overflow-y:auto;padding:4px">
                  <sc-for list="{{e.iTypeOpts}}" as="o" hint-placeholder-count="4">
                  <div onClick="{{o.pick}}" style="{{o.style}}" style-hover="background:var(--bg-a185151810p06)">
                    <sc-if value="{{o.selected}}" hint-placeholder-val="{{ false }}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-xb99751)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0" data-i="i-c37d9e39"></svg></sc-if>
                    <sc-if value="{{o.editing}}" hint-placeholder-val="{{ false }}"><input value="{{o.editVal}}" onChange="{{o.editOn}}" onKeyDown="{{o.editKd}}" onClick="{{o.stop}}" style="flex:1;min-width:0;height:26px;border:1px solid var(--bd-xb99751);border-radius:6px;padding:0 8px;font-size:11.5px;font-family:'Cairo',sans-serif;outline:none;box-sizing:border-box;background:var(--bg-xffffff);color:var(--fg-x141414)"><button onClick="{{o.editSave}}" title="حفظ الاسم الجديد وترحيله لكل موظف يحمل الاسم القديم" style="width:22px;height:22px;border-radius:6px;border:0;background:var(--bg-a4120870p12);color:var(--fg-x047857);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" data-i="i-c37d9e39"></svg></button><button onClick="{{o.editCancel}}" title="إلغاء التعديل" style="width:22px;height:22px;border-radius:6px;border:0;background:transparent;color:var(--fg-x94a3b8);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" data-i="i-26175592"></svg></button></sc-if><sc-if
                        value="{{o.notEdit}}" hint-placeholder-val="{{ true }}"><span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{o.name}}</span><button onClick="{{o.edit}}" title="تعديل اسم الخيار" style="width:22px;height:22px;border-radius:6px;border:0;background:transparent;color:var(--fg-xcbd5e1);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0" style-hover="background:var(--bg-a185151810p12);color:var(--fg-x8a6f35)"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" data-i="i-f6efaf94"></svg></button>
                    <sc-if value="{{o.canDel}}" hint-placeholder-val="{{ true }}">
                    <button onClick="{{o.del}}" style="width:22px;height:22px;border-radius:6px;border:0;background:transparent;color:var(--fg-xcbd5e1);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0" style-hover="background:var(--bg-xfef2f2);color:var(--fg-xef4444)" aria-label="حذف"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" data-i="i-9bf9a6dd"></svg></button>
                    </sc-if></sc-if>
                  </div>
                  </sc-for>
                </div>
                <div style="display:flex;gap:6px;padding:6px;border-top:1px solid var(--bd-xf1f5f9);background:var(--bg-xfafafa)">
                  <input value="{{e.iNew}}" onChange="{{e.onINew}}" onKeyDown="{{e.onINewKey}}" placeholder="إضافة خيار جديد..." style="flex:1;height:28px;border:1px dashed var(--bd-xcbd5e1);border-radius:8px;padding:0 8px;font-size:11px;outline:none;font-family:'Cairo',sans-serif;box-sizing:border-box;background:var(--bg-xffffff);min-width:0" style-focus="border-color:var(--bd-xb99751)">
                  <button onClick="{{e.iTypeAdd}}" style="width:28px;height:28px;border-radius:8px;border:0;background:var(--bg-xb99751);color:var(--text-on-brand);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0" style-hover="background:var(--bg-xa6884a)" aria-label="إضافة صنف"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" data-i="i-de4e6997"></svg></button>
                </div>
              </div>
              </sc-if>
            </div>
          </div>
        </div>
      </sc-if>
    </div>
    <div style="display:flex;align-items:center;justify-content:center;gap:6px;border-top:1px solid var(--bd-a185151810p15);padding:5px 8px;background:var(--bg-a185151810p03);border-radius:0 0 13px 13px">
      <sc-if value="{{e.notEditing}}">
        <span class="emp-cardact" style="display:inline-flex;align-items:center;gap:2px">
<sc-if value="{{empPmEdit}}" hint-placeholder-val="{{ true }}">
        <button onClick="{{e.edit}}" style="width:26px;height:26px;border-radius:7px;border:0;background:transparent;color:var(--fg-x64748b);cursor:pointer;display:inline-flex;align-items:center;justify-content:center" style-hover="background:var(--bg-a185151810p1);color:var(--fg-xb99751)" aria-label="تعديل"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-37ad70cd"></svg></button>
</sc-if>
<sc-if value="{{empPmDel}}" hint-placeholder-val="{{ true }}">
        <button onClick="{{e.remove}}" style="width:26px;height:26px;border-radius:7px;border:0;background:transparent;color:var(--fg-x64748b);cursor:pointer;display:inline-flex;align-items:center;justify-content:center" style-hover="background:var(--bg-xfef2f2);color:var(--fg-xef4444)" aria-label="حذف"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-9bf9a6dd"></svg></button>
</sc-if>
        </span>
      </sc-if>
      <sc-if value="{{e.editing}}">
        <span style="display:inline-flex;align-items:center;gap:4px">
        <button onClick="{{e.saveInline}}" style="height:26px;padding:0 12px;border-radius:7px;border:1px solid var(--bd-xa7f3d0);background:var(--bg-xecfdf5);color:var(--fg-x059669);font-size:10px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;display:inline-flex;align-items:center;gap:4px" style-hover="background:var(--bg-xd1fae5)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" data-i="i-c37d9e39"></svg>حفظ</button>
        <button onClick="{{e.cancelInline}}" style="height:26px;padding:0 10px;border-radius:7px;border:1px solid var(--bd-xe2e8f0);background:var(--bg-xffffff);color:var(--fg-x64748b);font-size:10px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif" style-hover="background:var(--bg-xf8fafc)">إلغاء</button>
        </span>
      </sc-if>
    </div>
  </div>
    </sc-for>
    </div>
  </div>
</div>
</sc-if>

<!-- ═══ تبويبا صفحة الموظفين — التصميم المعتمد ═══ -->
<!-- شريطُ تبويبٍ واحد لا يعرض خياراً: يختفي الإطار كلّه وتُعرض لوحته مباشرةً -->
<sc-if value="{{empTabBarShow}}" hint-placeholder-val="{{ true }}">
<div style="border-radius:16px;border:2px solid var(--bd-a185151810p1);background:linear-gradient(90deg,var(--bg-a185151810p03),transparent,var(--bg-a185151810p03));padding:12px">
  <div class="bs-hbar bs-tabstrip" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:4px 0;flex-wrap:wrap">
    <sc-if value="{{empDataAllowed}}" hint-placeholder-val="{{ true }}">
    <div onClick="{{empGoData}}" style="{{empDataTabStyle}}">
      <div style="{{empDataTabIcon}}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-9e70a218"></svg></div>
      <span style="{{empDataTabLbl}}">بيانات الموظفين</span>
      <sc-if value="{{empOnData}}" hint-placeholder-val="{{ false }}"><span style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:32px;height:2px;border-radius:9999px;background:var(--bg-xb99751)"></span></sc-if>
    </div>
    </sc-if>
@@SYS:emp.view.tabs@@  </div>
</div>
</sc-if>

<sc-if value="{{empOnReadiness}}" hint-placeholder-val="{{ true }}">
<style>
.rz-card{border-radius:16px;border:1px solid var(--bd-a2252252250p7);background:var(--bg-xffffff);box-shadow:var(--shadow-card)}
.rz-gz svg{width:100%;height:auto;overflow:visible;display:block}
.rz-mr{display:grid;grid-template-columns:minmax(150px,1.1fr) 1fr 48px 18px;align-items:center;gap:10px;font-size:11.5px;font-weight:700;color:var(--fg-x3f3a30)}
.rz-mr .tk{height:6px;border-radius:99px;background:var(--bg-xf2eee4);overflow:hidden}
.rz-prow{display:grid;grid-template-columns:300px minmax(0,1fr) 380px;grid-template-areas:"z1 z2 z3" "z4 z4 z4";gap:2px 26px;padding:24px 26px 20px;position:relative;overflow:hidden}
.rz-z1{grid-area:z1;display:flex;flex-direction:column;min-width:0}
.rz-z2{grid-area:z2;border-right:1px solid var(--bd-xf2eee4);border-left:1px solid var(--bd-xf2eee4);padding:2px 24px;min-width:0}
.rz-z3{grid-area:z3;min-width:0;display:flex;flex-direction:column;justify-content:center}
.rz-z4{grid-area:z4;margin-top:14px;background:linear-gradient(90deg,var(--bg-xf8f3e8),var(--bg-xfcfaf4));border-right:3px solid var(--bd-xb99751);border-radius:10px;padding:9px 14px;font-size:12px;color:var(--fg-x3f3a30);font-weight:600}
.rz-z4 b{color:var(--fg-x8a6f35)}
.rz-wm{position:absolute;bottom:-54px;left:4px;font-size:170px;font-weight:900;color:var(--fg-a185151810p05);line-height:1;pointer-events:none}
.rz-hd{display:flex;align-items:flex-start;gap:12px}
.rz-hd h3{font-size:16.5px;font-weight:800;margin:0;line-height:1.45}
.rz-hd .q{font-size:11px;color:var(--fg-x8b8676);font-weight:600;line-height:1.65;margin-top:1px}
.rz-ico{flex:none;width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 5px var(--bg-card),var(--shadow-card)}
.rz-ngl b{display:block;font-size:29px;font-weight:900;color:var(--fg-x141414);line-height:1.2}
.rz-ngl > span{font-size:10px;color:var(--fg-xb0aa9a);font-weight:700}
.rz-pv{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:800;border-radius:9999px;padding:4px 15px}
.rz-zt{font-size:10.5px;font-weight:800;color:var(--fg-xb0aa9a);letter-spacing:.3px;margin-bottom:7px}
.rz-big{font-size:44px;font-weight:900;line-height:1.15;color:var(--fg-x141414)}
.rz-big small{font-size:12.5px;font-weight:700;color:var(--fg-x8b8676)}
.rz-sub{font-size:11px;color:var(--fg-x8b8676);font-weight:600}
.rz-seg{display:flex;height:14px;border-radius:99px;overflow:hidden;gap:2px;margin:10px 0 7px}
.rz-leg{display:flex;flex-wrap:wrap;gap:5px 15px;font-size:11px;font-weight:700;color:var(--fg-x3f3a30)}
.rz-leg b{font-weight:900}
.rz-leg small{color:var(--fg-x8b8676);font-weight:600}
.rz-jw{display:inline-flex;align-items:center;gap:7px;border-radius:11px;padding:6px 12px;font-size:11px;font-weight:700}
.rz-jw.r{background:var(--bg-xfdf1ef);border:1px solid var(--bd-xf2d6d0);color:var(--fg-xb3402f)}
.rz-jw.g{background:var(--bg-xedf6f0);border:1px solid var(--bd-xcfe6d8);color:var(--fg-x16a34a)}
.rz-jw.d{background:var(--bg-xf8f3e8);border:1px solid var(--bd-xe8dcc0);color:var(--fg-x8a6f35)}
.rz-warn{display:block;background:var(--bg-xfdf1ef);border:1px solid var(--bd-xf2d6d0);border-radius:11px;padding:7px 13px;font-size:11px;font-weight:700;color:var(--fg-xb3402f);margin-top:10px;line-height:1.8}
.rz-lead{border-radius:22px;position:relative;overflow:hidden;background:var(--brand-pattern) center/96px 96px,linear-gradient(115deg,var(--hero-1) 0%,var(--hero-2) 45%,var(--hero-3) 100%);border:1px solid var(--bd-xcbb98d);box-shadow:0 2px 8px rgba(28,22,10,0.06),0 22px 54px -24px rgba(120,95,45,0.22);padding:24px 28px 20px;display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:8px 24px}
.rz-lmain{position:relative;display:flex;flex-direction:column;min-width:0}
.rz-wpill{display:inline-flex;align-items:center;gap:7px;background:var(--bg-xffffff);border:1px solid var(--bd-xe6dcc2);color:var(--fg-x6e5626);border-radius:9999px;padding:4px 14px;font-size:11.5px;font-weight:800;box-shadow:0 1px 3px rgba(90,70,25,0.15)}
.rz-lcols{display:flex;align-items:flex-end;gap:20px;flex:1;min-height:145px;max-height:185px;margin:16px 6px 0;padding:0 4px;border-bottom:1.5px solid var(--bd-a11086380p28)}
.rz-lnm{display:flex;gap:20px;margin:7px 6px 0;padding:0 4px}
.rz-lnm span{flex:1;text-align:center;font-size:10px;font-weight:800;color:var(--fg-a9070250p95);line-height:1.5}
.rz-lnm span i{display:block;font-style:normal;font-size:8.5px;color:var(--fg-a9070250p6);font-weight:700}
.rz-bchip{display:inline-flex;align-items:baseline;gap:7px;background:var(--bg-a2552552550p55);border:1px solid var(--bd-a2552552550p75);color:var(--fg-x6e5626);border-radius:9999px;padding:4px 13px;font-size:10.5px;font-weight:700}
.rz-bchip b{font-size:12px;font-weight:900;color:var(--fg-x4a3a10)}
.rz-lsc{background:var(--bg-xffffff);border:1px solid var(--bd-xefe9dc);border-radius:15px;box-shadow:0 2px 8px rgba(70,52,15,0.10),0 14px 34px -18px rgba(70,52,15,0.35);padding:13px 16px 11px}
.rz-lsc .t{font-size:11.5px;font-weight:800;color:var(--fg-x3f3a30);margin-bottom:8px}
.rz-crow{display:flex;align-items:center;gap:7px;padding:5px 0;border-top:1px dashed var(--bd-xf2eee4)}
.rz-crow:first-of-type{border-top:none}
.rz-crow .wch{flex-shrink:0;font-size:8.5px;font-weight:800;border-radius:9999px;padding:0 7px;background:var(--bg-xf3effb);color:var(--fg-x7c3aed)}
.rz-crow .nm{flex:1;font-size:10.5px;font-weight:700;color:var(--fg-x3f3a30);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rz-crow .cb{width:82px;flex-shrink:0;height:5px;border-radius:99px;background:var(--bg-xf2eee4);overflow:hidden}
.rz-kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-top:14px}
.rz-kpi{padding:14px 14px 10px;text-align:center;min-width:0;transition:transform .3s,box-shadow .3s}
.rz-kpi:hover{transform:translateY(-3px);box-shadow:0 2px 8px rgba(28,22,10,0.05),0 22px 54px -24px rgba(120,95,45,0.22)}
.rz-kpi .kt{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:800;color:var(--fg-x141414);white-space:nowrap;overflow:hidden}
.rz-kpi .kd{flex:none;width:6px;height:6px;border-radius:50%;background:var(--bg-x1e9e5a);box-shadow:0 0 0 3px rgba(30,158,90,0.15)}
.rz-kpi .ks{font-size:9px;color:var(--fg-x8b8676);font-weight:600;text-align:right;margin-top:2px;min-height:42px;line-height:1.6}
.rz-kpi .kgz{width:100%;max-width:150px;margin:3px auto 0}
.rz-kpi .kf{display:flex;align-items:stretch;margin-top:5px;border-top:1px solid var(--bd-xf2eee4);padding-top:7px}
.rz-kpi .kf>div{flex:1;min-width:0}
.rz-kpi .kf span.s{display:block;font-size:7.5px;color:var(--fg-x8b8676);font-weight:700;line-height:1.5}
.rz-kpi .kf .dv{flex:none;width:1px;background:var(--bg-xf2eee4);margin:2px 6px}
.rz-trio{display:grid;grid-template-columns:1.12fr 1fr 1fr;gap:14px;margin-top:14px}
.rz-stack{display:flex;flex-direction:column;gap:16px;margin-top:14px}
.rz-dots{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.rz-duo{display:grid;grid-template-columns:minmax(0,1.9fr) minmax(0,1fr);gap:14px;margin-top:14px;align-items:stretch}
.rz-trio2{display:grid;grid-template-columns:1.05fr 1fr;gap:14px;margin-top:14px}
@media (max-width:1150px){.rz-lead{grid-template-columns:minmax(0,1fr)}.rz-kpis{grid-template-columns:repeat(3,1fr)}.rz-trio{grid-template-columns:1fr}.rz-prow{grid-template-columns:1fr;grid-template-areas:"z1" "z2" "z3" "z4"}.rz-z2{border:none;border-top:1px solid var(--bd-xf2eee4);border-bottom:1px solid var(--bd-xf2eee4);padding:16px 0}.rz-duo{grid-template-columns:1fr}.rz-trio2{grid-template-columns:1fr}}
/* الموجة 2 · KD-08: عناوينُ بطاقات «مؤشر الجاهزية» على الجوال (ثلاثُ بطاقاتٍ في الصفّ ≈95px) كانت تُقصّ بلا نقاط («مجدولون على الورديات»)
   — تلتفّ إلى سطرين بدل القصّ */
@media (max-width:640px){.rz-kpi .kt{white-space:normal;line-height:1.35}}
</style>
<svg width="0" height="0" style="position:absolute" data-i="i-4ab1171c"></svg>

<div class="rz-lead" data-anim>
  <div class="rz-lmain">
    <div style="display:flex;gap:9px;flex-wrap:wrap;align-items:center">
      <span class="rz-wpill">المؤشر القيادي</span>
      <span class="rz-wpill"><span style="width:7px;height:7px;border-radius:50%;background:var(--bg-x1e9e5a);box-shadow:0 0 0 3px rgba(30,158,90,0.18)"></span>محسوب من بيانات المنصة مباشرة</span>
      <span style="margin-right:auto;font-size:11px;font-weight:700;color:var(--fg-a9070250p8)">{{gregShort}} · {{hijriShort}} · {{timeShort}}</span>
    </div>
    <div style="font-size:12px;font-weight:700;color:var(--fg-a9070250p85);margin-top:11px">{{greeting}} 👋 — {{rdMonthLbl}}</div>
    <div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap">
      <span title="{{rdScoreTip}}" style="font-size:80px;font-weight:900;line-height:1.05;color:var(--fg-x6e5626);text-shadow:0 1px 0 rgba(255,255,255,0.35);cursor:help">{{rdScore}}</span>
      <span style="font-size:14px;font-weight:800;color:var(--fg-a9070250p75)">من 100</span>
      <span title="{{rdVerdictTip}}" style="{{rdVerdictSt}}">{{rdVerdict}}</span>
    </div>
    <div style="font-size:12px;font-weight:600;color:var(--fg-a8062220p9);max-width:560px;margin-top:4px">{{rdMiss}}</div>
    <div class="rz-lcols">
      <sc-for list="{{rdCols}}" as="c" hint-placeholder-count="6">
        <div title="{{c.tip}}" style="flex:1;text-align:center;min-width:0;cursor:help"><span style="{{c.vSt}}">{{c.v}}</span><span style="{{c.b}}"></span></div>
      </sc-for>
    </div>
    <div class="rz-lnm">
      <sc-for list="{{rdCols}}" as="c" hint-placeholder-count="6"><span>{{c.nm}}<i>{{c.step}}</i></span></sc-for>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
      <span class="rz-bchip" title="{{rdTopTip}}" style="cursor:help">أعلى خطوة <b>{{rdTopTxt}}</b></span>
      <span class="rz-bchip" title="{{rdLowTip}}" style="cursor:help">أدنى خطوة <b style="color:var(--fg-x9b3a25)">{{rdLowTxt}}</b></span>
      <span class="rz-bchip" title="{{rdAvgTip}}" style="cursor:help">متوسط الخطوات ({{rdStepsN}}) <b>{{rdAvgTxt}}</b></span>
      <span class="rz-bchip" title="{{rdFldTip}}" style="cursor:help">حقول القياس السليمة <b>{{rdFldTxt}}</b></span>
    </div>
  </div>
  <div style="position:relative;display:flex;flex-direction:column;gap:11px;justify-content:center">
    <div class="rz-lsc">
      <div class="t">{{rdFieldsTitle}}</div>
      <div style="display:flex;height:13px;border-radius:99px;overflow:hidden;gap:2px">
        <i title="{{rdFldOkTip}}" style="display:block;height:100%;cursor:help;{{rdFldOkW}}"></i><i title="{{rdFldBadTip}}" style="display:block;height:100%;cursor:help;{{rdFldBadW}}"></i>
      </div>
      <div class="rz-leg" style="margin-top:7px">
        <span><span style="display:inline-block;width:8px;height:8px;border-radius:3px;margin-left:5px;background:var(--bg-x0f8a50)"></span>سليمة <b>{{rdFldOkN}}</b> <small>· {{rdFldOkPct}}</small></span>
        <span><span style="display:inline-block;width:8px;height:8px;border-radius:3px;margin-left:5px;background:var(--bg-xb3402f)"></span>تحتاج عملاً <b>{{rdFldBadN}}</b> <small>· {{rdFldBadPct}}</small></span>
      </div>
    </div>
    <div class="rz-lsc">
      <div class="t">كيف يُحسب المؤشر؟ <span style="color:var(--fg-xb0aa9a);font-weight:700;font-size:9.5px">{{rdCalcSub}}</span></div>
      <sc-for list="{{rdCalc}}" as="p" hint-placeholder-count="6">
        <div class="rz-crow" title="{{p.tip}}" style="cursor:help"><span class="wch">{{p.chip}}</span><span class="nm">{{p.nm}}</span><span class="cb"><i style="{{p.bar}}"></i></span><span style="{{p.valSt}}">{{p.val}}</span></div>
      </sc-for>
    </div>
  </div>
</div>

<div class="rz-kpis">
  <sc-for list="{{rdKpis}}" as="k" hint-placeholder-count="6">
    <div class="rz-card rz-kpi">
      <div class="kt"><span class="kd"></span>{{k.label}}</div>
      <div class="ks">{{k.sub}}</div>
      <div title="{{k.vTip}}" style="cursor:help;{{k.vSt}}">{{k.v}}</div>
      <div class="kgz"><div class="rz-gz"><svg viewBox="0 0 200 118" data-i="i-77d52f63"></svg></div></div>
      <div class="kf">
        <div title="{{k.f1t}}" style="cursor:help"><b style="{{k.f1st}}">{{k.f1b}}</b><span class="s">{{k.f1s}}</span></div><span class="dv"></span>
        <div title="{{k.f2t}}" style="cursor:help"><b style="{{k.f2st}}">{{k.f2b}}</b><span class="s">{{k.f2s}}</span></div><span class="dv"></span>
        <div title="{{k.f3t}}" style="cursor:help"><b style="{{k.f3st}}">{{k.f3b}}</b><span class="s">{{k.f3s}}</span></div>
      </div>
    </div>
  </sc-for>
</div>
<sc-if value="{{rdSchedOn}}" hint-placeholder-val="{{ true }}"><div class="rz-duo"><sc-if value="{{netCovOn}}" hint-placeholder-val="{{ false }}">
<div style="border-radius:16px;border:1px solid var(--bd-a2252252250p7);background:var(--bg-xffffff);box-shadow:var(--shadow-card);padding:20px;animation:fadeUp .5s ease-out .1s backwards">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:4px">
    <div style="flex:1;min-width:0">
      <h2 class="bs-tip-host" style="font-size:16px;font-weight:600;margin:0"><span class="bs-tip">المؤشر القيادي للوحة القرار: كم موظفاً سيقف <b>فعلاً</b> في كل وردية اليوم بعد خصم كل الأسباب، مقابل ما يحتاجه الميدان. تحت الواحد عجزٌ مؤكّد، وحول الواحد لا احتياط لأي طارئ، وفوق ١٫١ فائضٌ يسمح بالمناورة.</span>معامل التغطية الصافي — لكل وردية</h2>
      <p style="font-size:10.5px;color:var(--fg-x94a3b8);margin:3px 0 0;line-height:1.8">{{netCovSub}}</p>
<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:9px">
  <span style="display:inline-flex;align-items:center;gap:6px;border-radius:11px;padding:5px 12px;font-size:11px;font-weight:700;background:var(--bg-xedf6f0);border:1px solid var(--bd-xcfe6d8);color:var(--fg-x16a34a);cursor:help" title="{{rdTodayAvailTip}}">متاحون اليوم <b>{{rdTodayAvail}}</b> · {{rdTodayAvailPct}}</span>
  <span style="display:inline-flex;align-items:center;gap:6px;border-radius:11px;padding:5px 12px;font-size:11px;font-weight:700;background:var(--bg-xf8f3e8);border:1px solid var(--bd-xe8dcc0);color:var(--fg-x8a6f35);cursor:help" title="{{rdTodayRestTip}}">في راحة اليوم <b>{{rdTodayRest}}</b></span>
  <span style="display:inline-flex;align-items:center;gap:6px;border-radius:11px;padding:5px 12px;font-size:11px;font-weight:700;background:var(--bg-xf8f3e8);border:1px solid var(--bd-xe8dcc0);color:var(--fg-x8a6f35);cursor:help" title="{{rdTodayLvTip}}">في إجازة اليوم <b>{{rdTodayLv}}</b></span>
  <span style="display:inline-flex;align-items:center;gap:6px;border-radius:11px;padding:5px 12px;font-size:11px;font-weight:700;background:var(--bg-xf8f3e8);border:1px solid var(--bd-xe8dcc0);color:var(--fg-x8a6f35);cursor:help" title="{{rdTodayMukTip}}">المكلفون <b>{{rdTodayMuk}}</b></span>
</div>
    </div>
    <span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;flex-shrink:0;border-radius:10px;background:var(--bg-a151181100p08);border:1px solid var(--bd-a151181100p25);color:var(--fg-x0f766e)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-f9dcb9b8"></svg></span>
  </div>
  <sc-if value="{{netCovNoNeed}}" hint-placeholder-val="{{ false }}">
  <div style="margin-top:10px;padding:12px;border-radius:10px;background:var(--bg-a1481631840p07);border:1px dashed var(--bd-a1481631840p35);color:var(--fg-x64748b);font-size:11px;font-weight:400;line-height:1.8">لا احتياج مُدخلاً في التشغيل الميداني لهذا الشهر — عبّئ جداول الاحتياج ({{rdNeedKinds}}) ليُقاس المعامل مقابل احتياجٍ حقيقي.</div>
  </sc-if>
  <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
    <sc-for list="{{netCovRows}}" as="r" hint-placeholder-count="4">
    <div title="{{r.tip}}" style="display:flex;align-items:center;gap:14px;padding:10px 12px;border-radius:12px;border:1px solid var(--bd-xf1f1f1);background:var(--bg-xfcfcfd);flex-wrap:wrap">
      <div style="flex:1.2;min-width:200px;display:flex;flex-direction:column;gap:3px">
        <span style="display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;color:var(--fg-x141414)"><span style="{{r.dot}}"></span>{{r.name}}</span>
        <span dir="rtl" style="font-size:10px;font-weight:400;color:var(--fg-x94a3b8);font-feature-settings:'tnum'">{{r.brk}}</span>
      </div>
      <div style="flex:1.4;min-width:180px;display:flex;flex-direction:column;gap:4px">
        <div style="display:flex;justify-content:space-between;font-size:9.5px;font-weight:600;color:var(--fg-x53565a)"><span>{{r.needTxt}}</span></div>
        <div style="height:7px;border-radius:9999px;background:var(--bg-a2352352350p9);overflow:hidden;position:relative">
          <div style="height:100%;border-radius:9999px;width:{{r.barW}}%;background:{{r.barColor}}"></div>
          <span style="position:absolute;top:-2px;bottom:-2px;right:83.3%;width:2px;background:var(--bg-a2020200p35)"></span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
        <span dir="ltr" style="{{r.factorStyle}}">{{r.factor}}</span>
        <span style="{{r.verdictStyle}}">{{r.verdict}}</span>
      </div>
    </div>
    </sc-for>
  </div>
  <div style="font-size:9px;font-weight:400;color:var(--fg-xc3c7cb);margin-top:8px">الخط العمودي على الشريط = الواحد الصحيح (الاحتياج بالضبط) — ما بعده احتياط</div>
</div>
</sc-if><div style="border-radius:16px;border:1px solid var(--bd-a2252252250p7);background:var(--bg-xffffff);box-shadow:var(--shadow-card);padding:20px;animation:fadeUp .5s ease-out .15s backwards">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div>
        <h2 class="bs-tip-host" style="font-size:16px;font-weight:600;margin:0"><span class="bs-tip">رسم دائري يوضح توزيع الموظفين على الورديات حسب <b>التسكين الفعلي</b> في الجدول الشهري. «بدون تسكين» = موظف لم يُسند لأي وردية بعد. شارة <b>الأعلى ▲</b> لأكثر وردية و<b>الأدنى ▼</b> لأقلها. تحت كل وردية: كم <b>حاضر</b> وكم <b>في راحة</b> اليوم تحديداً.</span>توزيع الورديات</h2>
        <p style="font-size:11px;color:var(--fg-x53565a);margin:2px 0 0">التسكين الفعلي — {{hijriChip}}</p>
      </div>
      <span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:10px;background:var(--bg-a185151810p1);border:1px solid var(--bd-a185151810p25);color:var(--fg-xb99751)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-fab3c0b3"></svg></span>
    </div>
    <div class="bs-statrow" style="display:flex;flex-direction:column;align-items:center;gap:10px">
      <div class="bs-statfig" style="position:relative;flex-shrink:0;width:142px;height:142px">
        <svg width="142" height="142" viewBox="0 0 120 120" data-i="i-99c3634c"></svg>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none">
          <span dir="ltr" style="font-size:27px;font-weight:800;color:var(--fg-x141414);font-feature-settings:'tnum';line-height:1.1">{{donutCenter}}</span>
          <span style="font-size:10px;color:var(--fg-x94a3b8);font-weight:600">{{donutCenterSub}}</span>
        </div>
      </div>
      <div class="bs-statlist" style="align-self:stretch;display:flex;flex-direction:column;gap:5px;min-width:0">
        <sc-if value="{{schedOff}}" hint-placeholder-val="{{ false }}">
        <div style="display:flex;flex-direction:column;gap:6px;padding:10px;border-radius:10px;background:var(--bg-a1481631840p07);border:1px dashed var(--bd-a1481631840p35);color:var(--fg-x64748b);font-size:11px;font-weight:400;line-height:1.7">لم يُنشأ الجدول الشهري بعد — أنشئه من «الجدول الشهري» في القائمة الجانبية ليظهر توزيع الورديات الفعلي هنا.</div>
        </sc-if>
        <sc-if value="{{schedOn}}" hint-placeholder-val="{{ true }}">
        <sc-for list="{{shiftLegend}}" as="c" hint-placeholder-count="4">
        <div title="{{c.tip}}" style="display:flex;align-items:center;gap:7px;font-size:11.5px;padding:4.5px 11px;border:1px solid var(--bd-xf2eee4);border-radius:11px;background:var(--bg-xfffefb);cursor:help">
          <span style="width:9px;height:9px;border-radius:3px;flex-shrink:0;background:{{c.color}}"></span>
          <span class="bs-statlbl" style="flex:1;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{c.name}}</span>
          <sc-if value="{{c.isTop}}" hint-placeholder-val="{{ false }}"><span style="font-size:7px;font-weight:600;padding:1px 6px;border-radius:9999px;background:var(--bg-a0163870p1);color:var(--fg-x047857);border:1px solid var(--bd-a0163870p25);flex-shrink:0">الأعلى ▲</span></sc-if>
          <sc-if value="{{c.isLow}}" hint-placeholder-val="{{ false }}"><span style="font-size:7px;font-weight:600;padding:1px 6px;border-radius:9999px;background:var(--bg-a245158110p1);color:var(--fg-xb45309);border:1px solid var(--bd-a245158110p3);flex-shrink:0">الأدنى ▼</span></sc-if>
          <sc-if value="{{c.hasBreakdown}}" hint-placeholder-val="{{ false }}">
          <span style="display:inline-flex;align-items:center;gap:3px;flex-shrink:0">
            <span title="حاضر اليوم" dir="ltr" style="display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;padding:0 4px;border-radius:9999px;background:var(--bg-a0163870p15);color:var(--fg-x047857);font-size:9px;font-weight:600;cursor:help">{{c.presentToday}}</span>
            <span title="راحة اليوم" dir="ltr" style="display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;padding:0 4px;border-radius:9999px;background:var(--bg-a245158110p18);color:var(--fg-xb45309);font-size:9px;font-weight:600;cursor:help">{{c.restingToday}}</span>
          </span>
          </sc-if>
          <span dir="ltr" style="font-feature-settings:'tnum';color:var(--fg-x53565a);font-size:10px;flex-shrink:0"><b style="color:{{c.color}};font-size:14.5px">{{c.count}}</b> · {{c.pct}}%</span>
        </div>
        </sc-for>
        </sc-if>
      </div>
    </div>
  </div></div>
<div class="rz-trio2"><div style="border-radius:16px;border:1px solid var(--bd-a2252252250p7);background:var(--bg-xffffff);box-shadow:var(--shadow-card);padding:20px;animation:fadeUp .5s ease-out .25s backwards">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div>
        <h2 class="bs-tip-host" style="font-size:16px;font-weight:600;margin:0"><span class="bs-tip"><b>معتمد</b> = مقفل بنقرة مزدوجة من الجدول الشهري · <b>مفتوح</b> = الشهر الحالي قيد الإعداد · <b>فارغ</b> = لا بيانات بعد.</span>حالة جداول السنة {{yearLabel}}</h2>
        <p style="font-size:11px;color:var(--fg-x53565a);margin:2px 0 0">المعتمد والمفتوح حسب الجدول الشهري</p>
      </div>
      <span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:10px;background:var(--bg-a0132800p08);border:1px solid var(--bd-a0132800p25);color:var(--fg-x008450)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-fd2c82c2"></svg></span>
    </div>
    <div class="bs-cardrow" style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px">
      <sc-for list="{{monthCells}}" as="m" hint-placeholder-count="12">
      <div title="{{m.tip}}" style="{{m.style}}">
        <span style="font-size:10px;font-weight:400;display:block">{{m.name}}</span>
        <span style="font-size:8px;font-weight:400;color:{{m.subColor}}">{{m.status}}</span>
      </div>
      </sc-for>
    </div>
  </div><div style="border-radius:16px;border:1px solid var(--bd-a2252252250p7);background:var(--bg-xffffff);box-shadow:var(--shadow-card);padding:20px;animation:fadeUp .5s ease-out .3s backwards">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div>
        <h2 class="bs-tip-host" style="font-size:16px;font-weight:600;margin:0"><span class="bs-tip">الموظفون الذين يصادف <b>اليوم الحقيقي الحالي</b> أحد أيام راحتهم الأسبوعية — تتغير القائمة تلقائياً كل يوم.</span>راحات اليوم — {{todayName}}</h2>
        <p style="font-size:11px;color:var(--fg-x53565a);margin:2px 0 0">الموظفون في راحة اليوم حسب الجدول</p>
      </div>
      <span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:10px;background:var(--bg-a245158110p08);border:1px solid var(--bd-a245158110p3);color:var(--fg-xb45309)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-14d20e05"></svg></span>
    </div>
    <sc-if value="{{hasResters}}" hint-placeholder-val="{{ true }}">
    <div style="display:flex;flex-direction:column;gap:8px">
      <sc-for list="{{resters}}" as="e" hint-placeholder-count="3">
      <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:12px;background:var(--bg-a2552512350p6);border:1px solid var(--bd-a245158110p2)">
        <div style="width:30px;height:30px;border-radius:9999px;display:flex;align-items:center;justify-content:center;color:var(--fg-xffffff);font-weight:400;font-size:12px;background:var(--bg-a185151810p55);flex-shrink:0">{{e.initial}}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{e.name}}</div>
        </div>
        <span dir="ltr" style="font-size:10px;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';color:var(--fg-xb45309);font-weight:400;flex-shrink:0">{{e.empno}}</span>
      </div>
      </sc-for>
      <sc-if value="{{restersMore}}" hint-placeholder-val="{{ false }}"><div onClick="{{rdGoSched}}" title="فتح الجدول الشهري" style="text-align:center;font-size:10.5px;font-weight:700;color:var(--fg-x9a7e40);padding:5px;cursor:pointer;text-decoration:underline;text-underline-offset:3px">{{restersMore}}</div></sc-if>
    </div>
    </sc-if>
    <sc-if value="{{noResters}}" hint-placeholder-val="{{ false }}">
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;color:var(--fg-x94a3b8)">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:8px" data-i="i-707176b1"></svg>
      <span style="font-size:12px;font-weight:400">{{restEmptyMsg}}</span>
    </div>
    </sc-if>
  </div></div>
</sc-if><div class="rz-stack"><sc-if value="{{rdP1On}}" hint-placeholder-val="{{ true }}"><div class="rz-card rz-prow"><span class="rz-wm">{{rdP1N}}</span><div class="rz-z1"><div class="rz-hd"><div class="rz-ico" style="background:var(--bg-a185151810p12);color:var(--fg-x8a6f35)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-20ab3353"></svg></div><div style="flex:1;min-width:0"><h2>{{rdP1N}} · مؤشر حصر القوة</h2><div class="q">كم سيفاً أملك فعلاً — وهل أعرف عنه ما يكفي لاتخاذ القرار؟</div></div></div><div style="margin:12px auto 0;text-align:center;width:196px"><div class="rz-ngl" title="{{rd1pctTip}}" style="cursor:help"><b>{{rd1pct}}</b><span>اكتمال بيانات القرار</span></div><div class="rz-gz"><svg viewBox="0 0 200 118" data-i="i-b698df02"></svg></div></div><div style="text-align:center;margin-top:9px"><span class="rz-pv" style="{{rd1pill}}">⚠ {{rd1pct}} من حقول هذا القرار</span></div></div><div class="rz-z2"><div class="rz-zt">تكوين القوة — من صفحة موظفي الإدارة</div>
<div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap">
  <div style="flex:1;min-width:220px">
    <div class="rz-big" title="{{rd1totalTip}}" style="cursor:help">{{rd1total}}</div>
    <div style="font-size:12.5px;font-weight:700;color:var(--fg-x3f3a30)">القوة الاسمية الميدانية القابلة للتشغيل</div>
    <div class="rz-sub">كل رقمٍ هنا محسوب من سجل الموظفين لحظياً — رأس المال الذي تصرف منه بقية الخطوات.</div>
    <div class="rz-seg" style="margin-top:12px"><i style="display:block;height:100%;{{rd1segA}}"></i><i style="display:block;height:100%;{{rd1segB}}"></i></div>
    <div class="rz-leg">
      <span title="{{rd1topTip}}" style="cursor:help"><span style="display:inline-block;width:8px;height:8px;border-radius:3px;margin-left:5px;background:var(--bg-xb99751)"></span>{{rd1topName}} <b>{{rd1topC}}</b> <small>· {{rd1topPct}}</small></span>
      <span title="{{rd1secTip}}" style="cursor:help"><span style="display:inline-block;width:8px;height:8px;border-radius:3px;margin-left:5px;background:var(--bg-x33507f)"></span>{{rd1secName}} <b>{{rd1secC}}</b> <small>· {{rd1secPct}}</small></span>
    </div>
  </div>
  <div style="flex:none;position:relative">
    <svg width="132" height="132" viewBox="0 0 128 128" data-i="i-28b752ff"></svg>
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
      <b title="{{rd1totalTip}}" style="font-size:22px;font-weight:900;cursor:help">{{rd1total}}</b><span style="font-size:9.5px;color:var(--fg-x8b8676);font-weight:700">{{rd1totalW}}</span>
    </div>
  </div>
</div></div><div class="rz-z3"><div class="rz-zt">حقول القياس الخمسة — الحقل والقرار الذي يخدمه</div><div style="display:flex;flex-direction:column;gap:8px"><sc-for list="{{rd1rows}}" as="r" hint-placeholder-count="5"><div class="rz-mr" title="{{r.tip}}" style="cursor:help"><span>{{r.nm}}</span><span class="tk"><i style="{{r.tk}}"></i></span><span style="{{r.pcSt}}">{{r.pc}}</span><span style="{{r.icSt}}">{{r.ic}}</span></div></sc-for></div></div><div class="rz-z4"><b>قراءة المدير:</b> {{rd1read}}</div></div></sc-if><sc-if value="{{rdP2On}}" hint-placeholder-val="{{ true }}"><div class="rz-card rz-prow"><span class="rz-wm">{{rdP2N}}</span><div class="rz-z1"><div class="rz-hd"><div class="rz-ico" style="background:var(--bg-a37992350p1);color:var(--fg-x2563eb)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-eb7ee93b"></svg></div><div style="flex:1;min-width:0"><h2>{{rdP2N}} · مؤشر حصر الميدان</h2><div class="q">ماذا أحرس بالضبط — وهل أعرف عن كل موقعٍ ما يلزم لتغطيته؟</div></div></div><div style="margin:12px auto 0;text-align:center;width:196px"><div class="rz-ngl" title="{{rd2pctTip}}"
    style="cursor:help"><b>{{rd2pct}}</b><span>اكتمال بيانات القرار</span></div><div class="rz-gz"><svg viewBox="0 0 200 118" data-i="i-dbba45f5"></svg></div></div><div style="text-align:center;margin-top:9px"><span class="rz-pv" style="{{rd2pill}}">⚠ {{rd2pct}} من حقول هذا القرار</span></div></div><div class="rz-z2"><div class="rz-zt">خريطة الثقل الميداني — من خطة الشهر الميدانية</div>
<div class="rz-big" title="{{rd2totalTip}}" style="cursor:help">{{rd2total}} <small>{{rd2totalW}} — نطاق مسؤولية الإدارة كاملاً</small></div>
<div class="rz-sub">كل بابٍ سطرٌ في الخطة برقمه وموضعه على الخريطة — لا موقع محفوظ في الذاكرة خارج المنصة.</div>
<div class="rz-seg" style="margin-top:12px;height:16px">
  <sc-for list="{{rd2segs}}" as="s" hint-placeholder-count="4"><i style="display:block;height:100%;{{s.w}}"></i></sc-for>
</div>
<div class="rz-leg">
  <sc-for list="{{rd2leg}}" as="l" hint-placeholder-count="4"><span title="{{l.tip}}" style="cursor:help"><span style="{{l.dot}}"></span>{{l.nm}} <b>{{l.b}}</b> <small>· {{l.pc}}</small></span></sc-for>
</div>
<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:12px">
  <sc-for list="{{rd2kinds}}" as="k" hint-placeholder-count="5"><span class="rz-jw" title="{{k.tip}}" style="cursor:help;{{k.st}}">{{k.nm}} <b>{{k.b}}</b></span></sc-for>
</div>
<sc-if value="{{rd2dupOn}}" hint-placeholder-val="{{ true }}"><span class="rz-warn">⚠ {{rd2dupTxt}}</span></sc-if></div><div class="rz-z3"><div class="rz-zt">حقول القياس الخمسة — الحقل والقرار الذي يخدمه</div><div style="display:flex;flex-direction:column;gap:8px"><sc-for list="{{rd2rows}}" as="r" hint-placeholder-count="5"><div class="rz-mr" title="{{r.tip}}" style="cursor:help"><span>{{r.nm}}</span><span class="tk"><i style="{{r.tk}}"></i></span><span style="{{r.pcSt}}">{{r.pc}}</span><span style="{{r.icSt}}">{{r.ic}}</span></div></sc-for></div></div><div class="rz-z4"><b>قراءة المدير:</b> {{rd2read}}</div></div></sc-if><sc-if value="{{rdP3On}}" hint-placeholder-val="{{ true }}"><div class="rz-card rz-prow"><span class="rz-wm">{{rdP3N}}</span><div class="rz-z1"><div class="rz-hd"><div class="rz-ico" style="background:var(--bg-a21711960p1);color:var(--fg-xd97706)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-4451845e"></svg></div><div style="flex:1;min-width:0"><h2>{{rdP3N}} · مؤشر تحديد الاحتياج</h2><div class="q">كم رجلاً يحتاج ميداني في كل وردية — وهل الرقم أمامي رقمُ قرار أم رقمُ افتراض؟</div></div></div><div
    style="margin:12px auto 0;text-align:center;width:196px"><div class="rz-ngl" title="{{rd3pctTip}}" style="cursor:help"><b>{{rd3pct}}</b><span>اكتمال بيانات القرار</span></div><div class="rz-gz"><svg viewBox="0 0 200 118" data-i="i-9e13ace7"></svg></div></div><div style="text-align:center;margin-top:9px"><span class="rz-pv" style="{{rd3pill}}">⚠ {{rd3pct}} من حقول هذا القرار</span></div></div><div class="rz-z2"><div class="rz-zt">الاحتياج المُدخل — جداول الاحتياج في التشغيل الميداني</div>
<div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start">
  <div style="flex:1.1;min-width:210px">
    <div class="rz-big" title="{{rd3needTip}}" style="cursor:help">{{rd3need}}</div>
    <div style="font-size:12.5px;font-weight:700;color:var(--fg-x3f3a30)">إجمالي الاحتياج المُدخل للشهر</div>
    <div class="rz-sub">{{rd3formula}} — الرقم الذي تُحاسَب عليه خطوتا التنظيم والتوزيع.</div>
    <div style="margin-top:14px">
      <div style="display:flex;justify-content:space-between;font-size:10.5px;font-weight:700;color:var(--fg-x8b8676)"><span>الاحتياج مقابل القوة — قبل الراحات</span><span title="{{rd3strainTip}}" style="color:var(--fg-x8a6f35);font-weight:900;cursor:help">{{rd3strain}}</span></div>
      <div style="height:9px;border-radius:99px;background:var(--bg-xf2eee4);overflow:hidden;margin-top:5px"><i style="{{rd3strainW}}"></i></div>
      <div class="rz-sub" style="margin-top:5px">{{rd3strainNote}}</div>
    </div>
  </div>
  <div style="flex:1;min-width:220px">
    <div style="display:flex;align-items:flex-end;justify-content:space-around;gap:16px;height:140px;padding:0 6px">
      <sc-for list="{{rd3cols}}" as="c" hint-placeholder-count="4">
        <div title="{{c.tip}}" style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;justify-content:flex-end;cursor:help">
          <span style="font-size:12.5px;font-weight:900;color:var(--fg-x141414)">{{c.v}}</span>
          <span style="{{c.h}}"></span>
          <span style="font-size:10.5px;color:var(--fg-x8b8676);font-weight:700">{{c.nm}}</span>
          <span style="font-size:9px;color:var(--fg-xb0aa9a);font-weight:700">{{c.pc}}</span>
        </div>
      </sc-for>
    </div>
    <sc-if value="{{rd3sameOn}}" hint-placeholder-val="{{ true }}"><div class="rz-sub" style="text-align:center;margin-top:6px">أعمدة متطابقة إلى المليمتر — قيمة استيرادٍ افتراضية لم تُراجَع</div></sc-if>
  </div>
</div></div><div class="rz-z3"><div class="rz-zt">حقول القياس الخمسة — الحقل والقرار الذي يخدمه</div><div style="display:flex;flex-direction:column;gap:8px"><sc-for list="{{rd3rows}}" as="r" hint-placeholder-count="5"><div class="rz-mr" title="{{r.tip}}" style="cursor:help"><span>{{r.nm}}</span><span class="tk"><i style="{{r.tk}}"></i></span><span style="{{r.pcSt}}">{{r.pc}}</span><span style="{{r.icSt}}">{{r.ic}}</span></div></sc-for></div></div><div class="rz-z4"><b>قراءة المدير:</b> {{rd3read}}</div></div></sc-if><sc-if value="{{rdP4On}}" hint-placeholder-val="{{ true }}"><div class="rz-card rz-prow"><span class="rz-wm">{{rdP4N}}</span><div class="rz-z1"><div class="rz-hd"><div class="rz-ico" style="background:var(--bg-a37992350p1);color:var(--fg-x2563eb)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-4fe977a2"></svg></div><div style="flex:1;min-width:0"><h2>{{rdP4N}} · مؤشر التنظيم الزمني</h2><div class="q">هل قوّتي مرتّبة على الزمن — لكل رجلٍ وردية وراحة، وما من يومٍ مكشوف؟</div></div></div><div style="margin:12px auto 0;text-align:center;width:196px"><div class="rz-ngl" title="{{rd4pctTip}}"
    style="cursor:help"><b>{{rd4pct}}</b><span>اكتمال بيانات القرار</span></div><div class="rz-gz"><svg viewBox="0 0 200 118" data-i="i-6adce6b1"></svg></div></div><div style="text-align:center;margin-top:9px"><span class="rz-pv" style="{{rd4pill}}">⚠ {{rd4pct}} من حقول هذا القرار</span></div></div><div class="rz-z2"><div class="rz-zt">نبض أيام الأسبوع — القوة العاملة بعد الراحات مقابل الاحتياج</div>
<div style="display:flex;gap:14px;align-items:baseline;flex-wrap:wrap;margin-bottom:4px">
  <span title="{{rd4BigTip}}" style="font-size:30px;font-weight:900;color:var(--fg-x141414);cursor:help">{{assignPct}}٪</span>
  <span title="{{rd4ShiftsTip}}" style="font-size:11.5px;font-weight:700;color:var(--fg-x3f3a30);cursor:help">من القوة مجدولة على الورديات — {{rd4shiftsLine}}</span>
</div>
<div style="border-radius:16px;border:1px solid var(--bd-a2252252250p7);background:var(--bg-xffffff);box-shadow:var(--shadow-card);padding:20px;animation:fadeUp .5s ease-out .2s backwards">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <div>
        <h2 class="bs-tip-host" style="font-size:16px;font-weight:600;margin:0"><span class="bs-tip">لكل يوم: المتاحون = إجمالي الموظفين ناقص أصحاب الراحة فيه. <b>النقاط الحمراء</b> أضعف الأيام، <b>الذهبية</b> اليوم الحالي. مرّر على أي نقطة لرؤية العدد.</span>جاهزية أيام الأسبوع</h2>
        <p style="font-size:11px;color:var(--fg-x53565a);margin:2px 0 0">عدد المتاحين كل يوم بعد خصم الراحات</p>
      </div>
      <span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:10px;background:var(--bg-a0132800p08);border:1px solid var(--bd-a0132800p25);color:var(--fg-x008450)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-a9e1a498"></svg></span>
    </div>
    <sc-if value="{{schedOn}}" hint-placeholder-val="{{ true }}">
    <div style="position:relative;height:132px;margin-top:4px">
      <svg width="100%" height="132" viewBox="0 0 340 132" preserveAspectRatio="none" style="display:block;position:absolute;inset:0" data-i="i-ed834a53"></svg>
      <sc-for list="{{wkDots}}" as="d" hint-placeholder-count="7">
      <div data-tip="{{d.tip}}" style="{{d.dotStyle}}"></div>
      </sc-for>
      <sc-for list="{{wkVals}}" as="v" hint-placeholder-count="2">
      <span style="{{v.valStyle}}">{{v.label}}</span>
      </sc-for>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--fg-x94a3b8);font-weight:400;padding:0 6px;margin-top:2px">
      <sc-for list="{{wkLabels}}" as="w" hint-placeholder-count="7"><span style="color:{{w.color}};font-weight:{{w.weight}}">{{w.name}}</span></sc-for>
    </div>
    </sc-if>
    <div style="display:flex;align-items:flex-start;gap:6px;margin-top:10px;padding:8px 10px;border-radius:10px;font-size:10px;line-height:1.6;{{wkInsightStyle}}">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px" data-i="i-b8548f13"></svg>
      <span style="font-weight:400">{{wkInsight}}</span>
    </div>
  </div></div><div class="rz-z3"><div class="rz-zt">حقول القياس الخمسة — الحقل والقرار الذي يخدمه</div><div style="display:flex;flex-direction:column;gap:8px"><sc-for list="{{rd4rows}}" as="r" hint-placeholder-count="5"><div class="rz-mr" title="{{r.tip}}" style="cursor:help"><span>{{r.nm}}</span><span class="tk"><i style="{{r.tk}}"></i></span><span style="{{r.pcSt}}">{{r.pc}}</span><span style="{{r.icSt}}">{{r.ic}}</span></div></sc-for></div></div><div class="rz-z4"><b>قراءة المدير:</b> {{rd4read}}</div></div></sc-if><sc-if value="{{rdP5On}}" hint-placeholder-val="{{ true }}"><div class="rz-card rz-prow"><span class="rz-wm">{{rdP5N}}</span><div class="rz-z1"><div class="rz-hd"><div class="rz-ico" style="background:var(--bg-a17964470p09);color:var(--fg-xb3402f)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-4442c373"></svg></div><div style="flex:1;min-width:0"><h2>{{rdP5N}} · مؤشر التوزيع</h2><div class="q">هل رجالي على المواقع بقدر الاحتياج — وأين عجزي واحتياطي قبل أن يبدأ الشهر؟</div></div></div><div style="margin:12px auto 0;text-align:center;width:196px"><div class="rz-ngl" title="{{rd5pctTip}}"
      style="cursor:help"><b>{{rd5pct}}</b><span>اكتمال بيانات القرار</span></div><div class="rz-gz"><svg viewBox="0 0 200 118" data-i="i-9683b3a9"></svg></div></div><div style="text-align:center;margin-top:9px"><span class="rz-pv" style="{{rd5pill}}">⚠ {{rd5pct}} من حقول هذا القرار</span></div></div><div class="rz-z2"><div class="rz-zt">سدّ الاحتياج — توزيعات الخطة الميدانية</div>
<div class="rz-big" title="{{rd5filledTip}}" style="color:var(--fg-xb3402f);cursor:help">{{rd5filled}} <small>{{rd5filledW}} من احتياجٍ قوامه {{rd5need}}</small></div>
<div class="rz-sub">كل خانة احتياجٍ في كل وردية تحتاج اسماً — الخانة الشاغرة عجزٌ مبرمَج قبل أن يبدأ اليوم.</div>
<div style="position:relative;height:15px;border-radius:99px;background:var(--bg-xf2eee4);margin:26px 2px 8px">
  <span style="position:absolute;top:-21px;right:0;font-size:9.5px;font-weight:800;color:var(--fg-x8b8676);white-space:nowrap">الاحتياج الكامل {{rd5need}}</span>
  <span style="position:absolute;top:-5px;bottom:-5px;left:0;width:2px;background:var(--bg-x5b5546);border-radius:2px"></span>
  <span style="{{rd5fillW}}"></span>
</div>
<div class="rz-leg">
  <span><span style="display:inline-block;width:8px;height:8px;border-radius:3px;margin-left:5px;background:var(--bg-xb3402f)"></span>مسدود <b>{{rd5filled}}</b> <small>· {{rd5fillPct}}</small></span>
  <span><span style="display:inline-block;width:8px;height:8px;border-radius:3px;margin-left:5px;background:var(--bg-xe5e0d2)"></span>شاغر <b>{{rd5vacant}}</b> <small>· {{rd5vacPct}}</small></span>
</div>
<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:12px">
  <sc-if value="{{rd5dupOn}}" hint-placeholder-val="{{ true }}"><span class="rz-jw r" title="{{rd5dupTip}}" style="cursor:help">{{rd5dupTxt}}</span></sc-if>
  <span class="rz-jw d" title="{{rd5unTip2}}" style="cursor:help">{{rd5unTxt}}</span>
  <span class="rz-jw g" title="{{rd5resTip}}" style="cursor:help">{{rd5resTxt}}</span>
</div></div><div class="rz-z3"><div class="rz-zt">حقول القياس الخمسة — الحقل والقرار الذي يخدمه</div><div style="display:flex;flex-direction:column;gap:8px"><sc-for list="{{rd5rows}}" as="r" hint-placeholder-count="5"><div class="rz-mr" title="{{r.tip}}" style="cursor:help"><span>{{r.nm}}</span><span class="tk"><i style="{{r.tk}}"></i></span><span style="{{r.pcSt}}">{{r.pc}}</span><span style="{{r.icSt}}">{{r.ic}}</span></div></sc-for></div></div><div class="rz-z4"><b>قراءة المدير:</b> {{rd5read}}</div></div></sc-if><sc-if value="{{rdP6On}}" hint-placeholder-val="{{ true }}"><div class="rz-card rz-prow"><span class="rz-wm">{{rdP6N}}</span><div class="rz-z1"><div class="rz-hd"><div class="rz-ico" style="background:var(--bg-a124582370p09);color:var(--fg-x7c3aed)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-47a9486d"></svg></div><div style="flex:1;min-width:0"><h2>{{rdP6N}} · مؤشر المتابعة اليومية</h2><div class="q">هل عيني على الميدان يوماً بيوم — تقريرٌ يُسحب وجولةٌ تُوثَّق واعتمادٌ يقفل السجل؟</div></div></div><div style="margin:12px auto 0;text-align:center;width:196px"><div class="rz-ngl" title="{{rd6pctTip}}"
    style="cursor:help"><b>{{rd6pct}}</b><span>اكتمال بيانات القرار</span></div><div class="rz-gz"><svg viewBox="0 0 200 118" data-i="i-c837a1e1"></svg></div></div><div style="text-align:center;margin-top:9px"><span class="rz-pv" style="{{rd6pill}}">⚠ {{rd6pct}} من حقول هذا القرار</span></div></div><div class="rz-z2"><div class="rz-zt">دورة اليوم — تقرير ثم جولة ثم اعتماد</div>
<div class="rz-big" title="{{rd6docTip}}" style="cursor:help">{{rd6docDays}} <small>{{rd6docDaysW}} بجولة ميدانية — من {{rd6elapsed}} {{rd6elapsedW}}</small></div>
<div class="rz-sub">دورة اليوم الكاملة ثلاث لبنات: تقرير الورديات، الجولة الميدانية، ثم الاعتماد الذي يقفل السجل.</div>
<div class="rz-dots">
  <sc-for list="{{rdDays}}" as="d" hint-placeholder-count="15"><span style="{{d.st}}">{{d.n}}</span></sc-for>
</div>
<div class="rz-leg" style="margin-top:10px">
  <span><span style="display:inline-block;width:8px;height:8px;border-radius:3px;margin-left:5px;background:var(--bg-x8a6f35)"></span>جولة وتقرير <b title="{{rd6fullTip}}" style="cursor:help">{{rd6full}}</b> <small>· {{rd6fullPct}}</small></span>
  <span><span style="display:inline-block;width:8px;height:8px;border-radius:3px;margin-left:5px;background:var(--bg-xfbbf24)"></span>تقرير فقط <b title="{{rd6halfTip}}" style="cursor:help">{{rd6half}}</b> <small>· {{rd6halfPct}}</small></span>
  <span><span style="display:inline-block;width:8px;height:8px;border-radius:3px;margin-left:5px;background:var(--bg-xe5e0d2)"></span>بلا أثر <b title="{{rd6noneTip}}" style="cursor:help">{{rd6none}}</b> <small>· {{rd6nonePct}}</small></span>
</div>
<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:12px">
  <span class="rz-jw r" title="{{rd6apprTip}}" style="cursor:help">{{rd6apprTxt}}</span>
  <span class="rz-jw g" title="{{rd6lvTip}}" style="cursor:help">{{rd6lvTxt}}</span>
</div></div><div class="rz-z3"><div class="rz-zt">حقول القياس الخمسة — الحقل والقرار الذي يخدمه</div><div style="display:flex;flex-direction:column;gap:8px"><sc-for list="{{rd6rows}}" as="r" hint-placeholder-count="5"><div class="rz-mr" title="{{r.tip}}" style="cursor:help"><span>{{r.nm}}</span><span class="tk"><i style="{{r.tk}}"></i></span><span style="{{r.pcSt}}">{{r.pc}}</span><span style="{{r.icSt}}">{{r.ic}}</span></div></sc-for></div></div><div class="rz-z4"><b>قراءة المدير:</b> {{rd6read}}</div></div></sc-if></div>
<div style="margin-top:16px"><div style="border-radius:16px;border:1px solid var(--bd-a185151810p35);background:linear-gradient(135deg,var(--bg-xffffff),var(--bg-xffffff) 82%,var(--bg-a185151810p05));box-shadow:var(--shadow-card);padding:20px;animation:fadeUp .5s ease-out .26s backwards">
    <div onClick="{{rdRecsToggle}}" title="عرض وإخفاء التوصيات" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none">
      <div>
        <h2 class="bs-tip-host" style="font-size:16px;font-weight:600;margin:0"><span class="bs-tip">توصيات تُولَّد <b>تلقائياً</b> من البيانات الحية وتُرتب حسب الخطورة: <b>عاجل</b> ثم <b>مهم</b>. كل توصية تختفي وحدها فور معالجة سببها.</span>التوصيات والتنبيهات الذكية</h2>
        <p style="font-size:11px;color:var(--fg-x53565a);margin:2px 0 0">توصيات مولّدة تلقائياً من بيانات التشغيل الحية</p>
      </div>
      <span style="display:inline-flex;align-items:center;gap:9px"><span style="font-size:10.5px;font-weight:800;border-radius:9999px;padding:2px 11px;background:var(--bg-a185151810p12);border:1px solid var(--bd-a185151810p35);color:var(--fg-x8a6f35)">{{rdRecsTotal}} توصية</span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--fg-x9a7e40)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="{{rdRecsChev}}" data-i="i-c92915c6"></svg></span><span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,var(--bg-xe6d29d),var(--bg-xb99751));color:var(--text-on-brand);box-shadow:0 2px 8px -2px rgba(154,126,64,0.6)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-c8a56100"></svg></span>
    </div>
    <sc-if value="{{rdRecsOpen}}" hint-placeholder-val="{{ true }}"><div style="height:12px"></div><div style="display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;align-items:center;gap:10px;font-size:12px;font-weight:800;color:var(--fg-x8b8676);margin:4px 2px 0">توصيات اليوم — من بيانات هذا اليوم<span style="flex:1;height:1px;background:var(--bg-xf2eee4)"></span></div> <sc-for list="{{execAlerts}}" as="a" hint-placeholder-count="3">
      <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:12px;{{a.style}}">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:8px;flex-shrink:0;{{a.iconStyle}}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" data-i="i-9621a719"></svg></span>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:12px;font-weight:600">{{a.title}}</span>
            <span style="font-size:7px;font-weight:600;padding:1px 7px;border-radius:9999px;{{a.chipStyle}}">{{a.severity}}</span>
          </div>
          <p style="font-size:10px;color:var(--fg-x53565a);margin:2px 0 0;line-height:1.6">{{a.action}}</p>
        </div>
      </div>
      </sc-for>
      <sc-if value="{{execMore}}" hint-placeholder-val="{{ false }}"><div style="text-align:center;font-size:10px;font-weight:400;color:var(--fg-x9a7e40);padding:4px">{{execMore}}</div></sc-if>
<sc-if value="{{rdRecsOn}}" hint-placeholder-val="{{ true }}">
<div style="display:flex;align-items:center;gap:10px;font-size:12px;font-weight:800;color:var(--fg-x8b8676);margin:4px 2px 0">توصيات الجاهزية — على خطوات القرار المتاحة<span style="flex:1;height:1px;background:var(--bg-xf2eee4)"></span></div>
<sc-for list="{{rdRecs}}" as="a" hint-placeholder-count="4">
  <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:12px;{{a.style}}">
    <span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:8px;flex-shrink:0;{{a.iconStyle}}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" data-i="i-9621a719"></svg></span>
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:6px"><span style="font-size:12px;font-weight:600">{{a.title}}</span>
      <span style="font-size:7px;font-weight:600;padding:1px 7px;border-radius:9999px;{{a.chipStyle}}">{{a.severity}}</span></div>
      <p style="font-size:10px;color:var(--fg-x53565a);margin:2px 0 0;line-height:1.6">{{a.action}}</p>
    </div>
  </div>
</sc-for>
</sc-if>
    </div></sc-if>
  </div></div>
</sc-if>

@@SYS:emp.view.custody@@
<sc-if value="{{impToastOn}}" hint-placeholder-val="{{ false }}">
  <div style="position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:300;background:var(--bg-x1c2733);color:var(--fg-xffffff);padding:10px 22px;border-radius:9999px;font-size:12px;font-weight:400;box-shadow:var(--shadow-elevated);font-family:'Cairo',sans-serif;white-space:nowrap">{{impToastMsg}}</div>
</sc-if>
<!-- شجرة صلاحيات الموظف انتقلت إلى الجدول الشهري وحده — مكان واحد للقوالب والصلاحيات -->



@@SYS:emp.view.store@@
<sc-if value="{{empOnData}}" hint-placeholder-val="{{ false }}">

<div style="display:flex;flex-direction:column;gap:16px">

<sc-if value="{{hasEmployees}}" hint-placeholder-val="{{ true }}">
<div class="emp-kpis bs-statscroll">
  <!-- ═══ أنواع التوظيف — بنية كرت مؤشرات التقرير اليومي حرفياً ═══ -->
  <div style="display:flex;align-items:stretch;gap:10px;border:1px solid var(--bd-xeef0f2);border-radius:12px;padding:10px;background:linear-gradient(180deg,var(--bg-xffffff),var(--bg-xfcfcfd));box-shadow:var(--shadow-card);flex-wrap:wrap">
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 6px;min-width:110px">
      <div style="position:relative;width:96px;height:96px;display:grid;place-items:center;flex-shrink:0">
        <svg width="96" height="96" viewBox="0 0 96 96" style="position:absolute;top:0;right:0;transform:rotate(-90deg)" data-i="i-5748ca41"></svg>
        <b dir="ltr" style="position:relative;z-index:2;font-size:30px;font-weight:700;line-height:1;color:var(--fg-xb99751);font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{ekTVal}}</b>
        <span dir="ltr" style="position:absolute;bottom:-7px;z-index:3;font-size:9.5px;font-weight:700;color:var(--fg-xb99751);font-family:'Cairo',sans-serif;font-feature-settings:'tnum';background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p28);box-shadow:var(--shadow-card);border-radius:9999px;padding:1.5px 10px;white-space:nowrap">{{ekTPct}}</span>
      </div>
      <span class="bs-tip-host" style="display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:600;color:var(--fg-x53565a);margin-top:16px;white-space:nowrap">أنواع التوظيف<span class="bs-tip">أكبر فئات التوظيف عدداً ونسبتها من إجمالي الموظفين — التفصيل الكامل إلى الجانب ومجموعه يساوي الإجمالي؛ يكشف تركيبة القوة (تعاقد/دائم) لقرارات التجديد والتوزيع.</span></span>
      <i style="display:block;width:82px;height:1px;margin:6px 0 5px;background:linear-gradient(90deg,var(--bg-a185151810),var(--bg-a185151810p42),var(--bg-a185151810))"></i>
      <span style="font-size:9px;font-weight:400;color:var(--fg-x94a3b8);white-space:nowrap">{{ekTSub}}</span>
    </div>
    <div style="width:1px;background:linear-gradient(180deg,transparent,var(--bg-xe6e8eb),transparent);flex-shrink:0"></div>
    <div style="flex:1;min-width:140px;display:flex;flex-direction:column;justify-content:center;gap:3px">
      <sc-for list="{{ekTRows}}" as="r" hint-placeholder-count="3">
      <div title="{{r.tip}}" style="display:flex;align-items:center;gap:7px">
        <i style="width:8px;height:8px;border-radius:2px;flex-shrink:0;background:{{r.color}};box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06)"></i>
        <span style="font-size:10.5px;font-weight:400;color:var(--fg-x53565a);white-space:nowrap;flex-shrink:1;min-width:0;overflow:hidden;text-overflow:ellipsis;max-width:132px">{{r.label}}</span>
        <i style="flex:1;min-width:12px;height:1px;background:linear-gradient(90deg,var(--bg-a185151810p28),var(--bg-a185151810))"></i>
        <span dir="ltr" style="flex-shrink:0;font-size:11.5px;font-weight:700;color:{{r.color}};font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{r.n}}<em style="font-style:normal;font-size:9.5px;font-weight:600;color:var(--fg-x53565a);margin-left:6px">{{r.pct}}</em></span>
      </div>
      </sc-for>
    </div>
  </div>

  <!-- ═══ اكتمال البيانات — بنية كرت مؤشرات التقرير اليومي حرفياً ═══ -->
  <div style="display:flex;align-items:stretch;gap:10px;border:1px solid var(--bd-xeef0f2);border-radius:12px;padding:10px;background:linear-gradient(180deg,var(--bg-xffffff),var(--bg-xfcfcfd));box-shadow:var(--shadow-card);flex-wrap:wrap">
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 6px;min-width:110px">
      <div style="position:relative;width:96px;height:96px;display:grid;place-items:center;flex-shrink:0">
        <svg width="96" height="96" viewBox="0 0 96 96" style="position:absolute;top:0;right:0;transform:rotate(-90deg)" data-i="i-4c03338b"></svg>
        <b dir="ltr" style="position:relative;z-index:2;font-size:30px;font-weight:700;line-height:1;color:var(--fg-x047857);font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{ekDVal}}</b>
        <span dir="ltr" style="position:absolute;bottom:-7px;z-index:3;font-size:9.5px;font-weight:700;color:var(--fg-x047857);font-family:'Cairo',sans-serif;font-feature-settings:'tnum';background:var(--bg-xffffff);border:1px solid var(--bd-a4120870p28);box-shadow:var(--shadow-card);border-radius:9999px;padding:1.5px 10px;white-space:nowrap">{{ekDPct}}</span>
      </div>
      <span class="bs-tip-host" style="display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:600;color:var(--fg-x53565a);margin-top:16px;white-space:nowrap">اكتمال البيانات<span class="bs-tip">السجلات مكتملة الحقول الأساسية من إجمالي السجلات — النواقص مفصّلة إلى الجانب، واستكمالها يرفع دقة كل مؤشرات المنصة وتقاريرها.</span></span>
      <i style="display:block;width:82px;height:1px;margin:6px 0 5px;background:linear-gradient(90deg,var(--bg-a4120870),var(--bg-a4120870p42),var(--bg-a4120870))"></i>
      <span style="font-size:9px;font-weight:400;color:var(--fg-x94a3b8);white-space:nowrap">{{ekDSub}}</span>
    </div>
    <div style="width:1px;background:linear-gradient(180deg,transparent,var(--bg-xe6e8eb),transparent);flex-shrink:0"></div>
    <div style="flex:1;min-width:140px;display:flex;flex-direction:column;justify-content:center;gap:3px">
      <sc-for list="{{ekDRows}}" as="r" hint-placeholder-count="3">
      <div title="{{r.tip}}" style="display:flex;align-items:center;gap:7px">
        <i style="width:8px;height:8px;border-radius:2px;flex-shrink:0;background:{{r.color}};box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06)"></i>
        <span style="font-size:10.5px;font-weight:400;color:var(--fg-x53565a);white-space:nowrap;flex-shrink:1;min-width:0;overflow:hidden;text-overflow:ellipsis;max-width:132px">{{r.label}}</span>
        <i style="flex:1;min-width:12px;height:1px;background:linear-gradient(90deg,var(--bg-a185151810p28),var(--bg-a185151810))"></i>
        <span dir="ltr" style="flex-shrink:0;font-size:11.5px;font-weight:700;color:{{r.color}};font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{r.n}}<em style="font-style:normal;font-size:9.5px;font-weight:600;color:var(--fg-x53565a);margin-left:6px">{{r.pct}}</em></span>
      </div>
      </sc-for>
    </div>
  </div>

  <!-- ═══ حالة الحسابات — بنية كرت مؤشرات التقرير اليومي حرفياً ═══ -->
  <div style="display:flex;align-items:stretch;gap:10px;border:1px solid var(--bd-xeef0f2);border-radius:12px;padding:10px;background:linear-gradient(180deg,var(--bg-xffffff),var(--bg-xfcfcfd));box-shadow:var(--shadow-card);flex-wrap:wrap">
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 6px;min-width:110px">
      <div style="position:relative;width:96px;height:96px;display:grid;place-items:center;flex-shrink:0">
        <svg width="96" height="96" viewBox="0 0 96 96" style="position:absolute;top:0;right:0;transform:rotate(-90deg)" data-i="i-b2d95184"></svg>
        <b dir="ltr" style="position:relative;z-index:2;font-size:30px;font-weight:700;line-height:1;color:var(--fg-x4f46e5);font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{ekAVal}}</b>
        <span dir="ltr" style="position:absolute;bottom:-7px;z-index:3;font-size:9.5px;font-weight:700;color:var(--fg-x4f46e5);font-family:'Cairo',sans-serif;font-feature-settings:'tnum';background:var(--bg-xffffff);border:1px solid var(--bd-a79702290p28);box-shadow:var(--shadow-card);border-radius:9999px;padding:1.5px 10px;white-space:nowrap">{{ekAPct}}</span>
      </div>
      <span class="bs-tip-host" style="display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:600;color:var(--fg-x53565a);margin-top:16px;white-space:nowrap">حالة الحسابات<span class="bs-tip">حسابات الدخول النشطة من إجمالي الموظفين — من بلا حساب لا يصل إلى المنصة؛ لمتابعة تفعيل الوصول لمن يحتاجه.</span></span>
      <i style="display:block;width:82px;height:1px;margin:6px 0 5px;background:linear-gradient(90deg,var(--bg-a79702290),var(--bg-a79702290p42),var(--bg-a79702290))"></i>
      <span style="font-size:9px;font-weight:400;color:var(--fg-x94a3b8);white-space:nowrap">{{ekASub}}</span>
    </div>
    <div style="width:1px;background:linear-gradient(180deg,transparent,var(--bg-xe6e8eb),transparent);flex-shrink:0"></div>
    <div style="flex:1;min-width:140px;display:flex;flex-direction:column;justify-content:center;gap:3px">
      <sc-for list="{{ekARows}}" as="r" hint-placeholder-count="3">
      <div title="{{r.tip}}" style="display:flex;align-items:center;gap:7px">
        <i style="width:8px;height:8px;border-radius:2px;flex-shrink:0;background:{{r.color}};box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06)"></i>
        <span style="font-size:10.5px;font-weight:400;color:var(--fg-x53565a);white-space:nowrap;flex-shrink:1;min-width:0;overflow:hidden;text-overflow:ellipsis;max-width:132px">{{r.label}}</span>
        <i style="flex:1;min-width:12px;height:1px;background:linear-gradient(90deg,var(--bg-a185151810p28),var(--bg-a185151810))"></i>
        <span dir="ltr" style="flex-shrink:0;font-size:11.5px;font-weight:700;color:{{r.color}};font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{r.n}}<em style="font-style:normal;font-size:9.5px;font-weight:600;color:var(--fg-x53565a);margin-left:6px">{{r.pct}}</em></span>
      </div>
      </sc-for>
    </div>
  </div>

  <!-- ═══ الجنس — بنية كرت مؤشرات التقرير اليومي حرفياً ═══ -->
  <div style="display:flex;align-items:stretch;gap:10px;border:1px solid var(--bd-xeef0f2);border-radius:12px;padding:10px;background:linear-gradient(180deg,var(--bg-xffffff),var(--bg-xfcfcfd));box-shadow:var(--shadow-card);flex-wrap:wrap">
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 6px;min-width:110px">
      <div style="position:relative;width:96px;height:96px;display:grid;place-items:center;flex-shrink:0">
        <svg width="96" height="96" viewBox="0 0 96 96" style="position:absolute;top:0;right:0;transform:rotate(-90deg)" data-i="i-a2efcb85"></svg>
        <b dir="ltr" style="position:relative;z-index:2;font-size:30px;font-weight:700;line-height:1;color:var(--fg-x0369a1);font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{ekGVal}}</b>
        <span dir="ltr" style="position:absolute;bottom:-7px;z-index:3;font-size:9.5px;font-weight:700;color:var(--fg-x0369a1);font-family:'Cairo',sans-serif;font-feature-settings:'tnum';background:var(--bg-xffffff);border:1px solid var(--bd-a31051610p28);box-shadow:var(--shadow-card);border-radius:9999px;padding:1.5px 10px;white-space:nowrap">{{ekGPct}}</span>
      </div>
      <span class="bs-tip-host" style="display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:600;color:var(--fg-x53565a);margin-top:16px;white-space:nowrap">الجنس<span class="bs-tip">الفئة الأكبر (ذكور/إناث) ونسبتها من إجمالي الموظفين — تركيبة القوة للتوزيع على المواقع ذات الاشتراطات.</span></span>
      <i style="display:block;width:82px;height:1px;margin:6px 0 5px;background:linear-gradient(90deg,var(--bg-a31051610),var(--bg-a31051610p42),var(--bg-a31051610))"></i>
      <span style="font-size:9px;font-weight:400;color:var(--fg-x94a3b8);white-space:nowrap">{{ekGSub}}</span>
    </div>
    <div style="width:1px;background:linear-gradient(180deg,transparent,var(--bg-xe6e8eb),transparent);flex-shrink:0"></div>
    <div style="flex:1;min-width:140px;display:flex;flex-direction:column;justify-content:center;gap:3px">
      <sc-for list="{{ekGRows}}" as="r" hint-placeholder-count="3">
      <div title="{{r.tip}}" style="display:flex;align-items:center;gap:7px">
        <i style="width:8px;height:8px;border-radius:2px;flex-shrink:0;background:{{r.color}};box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06)"></i>
        <span style="font-size:10.5px;font-weight:400;color:var(--fg-x53565a);white-space:nowrap;flex-shrink:1;min-width:0;overflow:hidden;text-overflow:ellipsis;max-width:132px">{{r.label}}</span>
        <i style="flex:1;min-width:12px;height:1px;background:linear-gradient(90deg,var(--bg-a185151810p28),var(--bg-a185151810))"></i>
        <span dir="ltr" style="flex-shrink:0;font-size:11.5px;font-weight:700;color:{{r.color}};font-family:'Cairo',sans-serif;font-feature-settings:'tnum'">{{r.n}}<em style="font-style:normal;font-size:9.5px;font-weight:600;color:var(--fg-x53565a);margin-left:6px">{{r.pct}}</em></span>
      </div>
      </sc-for>
    </div>
  </div>
</div>
</sc-if>

<sc-if value="{{hasEmployees}}" hint-placeholder-val="{{ true }}">
<div style="border-radius:16px;border:1px solid var(--bd-xe2e8f0);background:var(--bg-xffffff);box-shadow:var(--shadow-card)">
  <div class="bs-hbar" style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 12px;border-bottom:2px solid var(--bd-a185151810p25);background:linear-gradient(to left,var(--bg-a2482502520p8),var(--bg-xffffff));border-radius:16px 16px 0 0">
<sc-if value="{{empPmAdd}}" hint-placeholder-val="{{ true }}">
    <button onClick="{{openAdd}}" title="إضافة موظف" style="width:40px;height:40px;border-radius:9999px;border:0;background:linear-gradient(135deg,var(--bg-xe6d29d) 0%,var(--bg-xb99751) 50%,var(--bg-x9a7e40) 100%);color:var(--text-on-brand);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px -2px rgba(154,126,64,0.6);transition:all .2s" style-hover="transform:scale(1.08);box-shadow:0 4px 14px -2px rgba(154,126,64,0.7)">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" data-i="i-de4e6997"></svg>
    </button>
</sc-if>
    <div style="position:relative;flex:1;min-width:200px">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--fg-x94a3b8)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;right:12px;top:50%;transform:translateY(-50%)" data-i="i-7133b944"></svg>
      <input value="{{search}}" onChange="{{onSearch}}" placeholder="بحث بالاسم أو الهوية أو الجوال أو البريد..." style="width:100%;height:40px;padding:0 40px 0 12px;font-size:13px;background:var(--bg-a2482502520p8);border:1px solid var(--bd-xe2e8f0);border-radius:12px;outline:none;font-family:'Cairo',sans-serif;box-sizing:border-box;color:var(--fg-x141414)" style-focus="background:var(--bg-xffffff);border-color:var(--bd-a185151810p4);box-shadow:0 0 0 2px rgba(185,151,81,0.2)">
    </div>
    <div style="height:24px;width:1px;background:var(--bg-xe2e8f0);margin:0 4px"></div>
<sc-if value="{{empPmFiles}}" hint-placeholder-val="{{ true }}">
    <div style="position:relative">
      <button onClick="{{filesToggle}}" style="{{filesBtnStyle}}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-53b60cd3"></svg>
        ملفات
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="{{filesChev}}" data-i="i-c92915c6"></svg>
      </button>
      <sc-if value="{{filesOpen}}" hint-placeholder-val="{{ false }}">
      <div data-bs-dd="1" style="position:absolute;top:100%;left:0;z-index:55;min-width:190px;margin-top:4px;background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p35);border-radius:10px;box-shadow:var(--shadow-elevated);overflow:hidden;padding:4px;text-align:right">
<i data-ei-s="menu"></i>
<sc-if value="{{empPmExport}}" hint-placeholder-val="{{ true }}">
        <div onClick="{{exportCsv}}" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;font-size:11px;font-weight:400;cursor:pointer;color:var(--fg-x141414);transition:background .15s" style-hover="background:var(--bg-a185151810p06)">
          <span style="display:inline-flex;width:24px;height:24px;border-radius:7px;align-items:center;justify-content:center;background:var(--bg-a0132800p08);color:var(--fg-x008450);flex-shrink:0"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-336c1c51"></svg></span>
          <div style="flex:1"><div>تصدير Excel</div><div style="font-size:8px;color:var(--fg-x94a3b8);font-weight:400">حسب الفلاتر الحالية — {{shownCount}} {{shownCountW}}</div></div>
        </div>
        
        <div onClick="{{printTable}}" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;font-size:11px;font-weight:400;cursor:pointer;color:var(--fg-x141414);transition:background .15s" style-hover="background:var(--bg-a185151810p06)">
          <span style="display:inline-flex;width:24px;height:24px;border-radius:7px;align-items:center;justify-content:center;background:var(--bg-a141652330p08);color:var(--fg-x0369a1);flex-shrink:0"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-9662a985"></svg></span>
          <div style="flex:1"><div>طباعة / حفظ PDF</div><div style="font-size:8px;color:var(--fg-x94a3b8);font-weight:400">نافذة الطباعة مباشرة</div></div>
        </div>
</sc-if>
      </div>
      </sc-if>
    </div>
</sc-if>
    <!-- ═══ الإجراءات الجماعية — في صف الأدوات نفسه بقرار المستخدم ═══ -->
    <sc-if value="{{hasSelection}}" hint-placeholder-val="{{ false }}">
      <span style="display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:var(--fg-x8a6f35);background:var(--bg-a185151810p1);border:1px solid var(--bd-a185151810p3);padding:4px 11px;border-radius:9999px;white-space:nowrap"><span dir="ltr">{{selCount}}</span> محدد</span>
      <button onClick="{{bulkClear}}" title="إلغاء التحديد" style="height:26px;width:26px;display:inline-flex;align-items:center;justify-content:center;border:1px dashed var(--bd-xcbd5e1);background:var(--bg-xffffff);color:var(--fg-x94a3b8);border-radius:9999px;cursor:pointer;flex-shrink:0" style-hover="border-color:var(--bd-xef4444);color:var(--fg-xef4444)"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" data-i="i-26175592"></svg></button>
<sc-if value="{{bulkAccOn}}" hint-placeholder-val="{{ false }}">
      <select onChange="{{onBulkAcc}}" title="تفعيل أو تجميد حسابات الدخول للموظفين المحددين" style="height:32px;font-size:11px;font-weight:400;color:var(--fg-x8a6f35);background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p4);border-radius:10px;padding:0 8px;cursor:pointer;font-family:'Cairo',sans-serif;outline:none;max-width:175px">
        <option value="">حساب الدخول…</option>
        <option value="act">تفعيل الحسابات</option>
        <option value="frz">تجميد الحسابات</option>
      </select>
</sc-if>
<sc-if value="{{empPmDel}}" hint-placeholder-val="{{ true }}">
      <button onClick="{{deleteSelected}}" style="height:32px;display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:400;color:var(--fg-xef4444);background:var(--bg-a23968680p06);border:1px solid var(--bd-a23968680p25);border-radius:10px;padding:0 11px;cursor:pointer;font-family:'Cairo',sans-serif;white-space:nowrap" style-hover="background:var(--bg-xfef2f2);border-color:var(--bd-xef4444)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-9bf9a6dd"></svg>
        {{delSelLabel}}
      </button>
</sc-if>
    </sc-if>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fg-x94a3b8)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0" data-i="i-0b453296"></svg>
    <span style="font-size:10px;font-weight:400;color:var(--fg-x94a3b8)">فلترة:</span>
    <div style="position:relative">
      <button onClick="{{fgToggle}}" style="{{fgBtnStyle}}">
        <span style="white-space:nowrap">{{fgLabel}}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="{{fgChev}}" data-i="i-c92915c6"></svg>
      </button>
      <sc-if value="{{fgOpen}}" hint-placeholder-val="{{ false }}">
      <div data-bs-dd="1" style="position:absolute;top:100%;right:0;z-index:50;min-width:150px;max-height:260px;overflow-y:auto;margin-top:4px;background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p35);border-radius:10px;box-shadow:var(--shadow-elevated);padding:4px;text-align:right">
        <sc-for list="{{fgOpts}}" as="o" hint-placeholder-count="3">
        <div onClick="{{o.pick}}" style="{{o.style}}" style-hover="background:var(--bg-a185151810p06)">
          <span style="flex:1;white-space:nowrap">{{o.name}}</span>
          <sc-if value="{{o.selected}}" hint-placeholder-val="{{ false }}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-xb99751)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0" data-i="i-c37d9e39"></svg></sc-if>
        </div>
        </sc-for>
      </div>
      </sc-if>
    </div>
    <div style="position:relative">
      <button onClick="{{ftToggle}}" style="{{ftBtnStyle}}">
        <span style="white-space:nowrap">{{ftLabel}}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="{{ftChev}}" data-i="i-c92915c6"></svg>
      </button>
      <sc-if value="{{ftOpen}}" hint-placeholder-val="{{ false }}">
      <div data-bs-dd="1" style="position:absolute;top:100%;right:0;z-index:50;min-width:150px;margin-top:4px;background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p35);border-radius:10px;box-shadow:var(--shadow-elevated);overflow:hidden;padding:4px;text-align:right">
        <sc-for list="{{ftOpts}}" as="o" hint-placeholder-count="3">
        <div onClick="{{o.pick}}" style="{{o.style}}" style-hover="background:var(--bg-a185151810p06)">
          <span style="flex:1;white-space:nowrap">{{o.name}}</span>
          <sc-if value="{{o.selected}}" hint-placeholder-val="{{ false }}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-xb99751)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0" data-i="i-c37d9e39"></svg></sc-if>
        </div>
        </sc-for>
      </div>
      </sc-if>
    </div>
    <div style="position:relative">
      <button onClick="{{faToggle}}" style="{{faBtnStyle}}">
        <span style="white-space:nowrap">{{faLabel}}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="{{faChev}}" data-i="i-c92915c6"></svg>
      </button>
      <sc-if value="{{faOpen}}" hint-placeholder-val="{{ false }}">
      <div data-bs-dd="1" style="position:absolute;top:100%;right:0;z-index:50;min-width:150px;margin-top:4px;background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p35);border-radius:10px;box-shadow:var(--shadow-elevated);overflow:hidden;padding:4px;text-align:right">
        <sc-for list="{{faOpts}}" as="o" hint-placeholder-count="3">
        <div onClick="{{o.pick}}" style="{{o.style}}" style-hover="background:var(--bg-a185151810p06)">
          <span style="flex:1;white-space:nowrap">{{o.name}}</span>
          <sc-if value="{{o.selected}}" hint-placeholder-val="{{ false }}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-xb99751)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0" data-i="i-c37d9e39"></svg></sc-if>
        </div>
        </sc-for>
      </div>
      </sc-if>
    </div>
    <div style="margin-right:auto;font-size:11px;color:var(--fg-x64748b);font-feature-settings:'tnum'">
      <span style="font-weight:400;color:var(--fg-xb99751)" dir="ltr">{{shownCount}}</span><span style="color:var(--text-muted)"> / {{totalCount}}</span>
    </div>
    <div style="display:flex;align-items:center;gap:2px;background:var(--bg-xffffff);border-radius:12px;padding:2px;border:1px solid var(--bd-a185151810p2);flex-shrink:0">
      <button onClick="{{viewList}}" title="عرض جدول" style="{{viewListStyle}}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-d9ba0eac"></svg></button>
      <button onClick="{{viewGrid}}" title="عرض بطاقات" style="{{viewGridStyle}}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-1b59ac83"></svg></button>
    </div>
  </div>

<sc-if value="{{isListView}}" hint-placeholder-val="{{ true }}">
<div>
  <div class="bs-hscroll bs-sthead" style="overflow-x:auto">
    <table class="bs-rtable" style="width:100%;border-collapse:collapse;min-width:860px">
      <thead>
        <tr style="background:linear-gradient(to left,var(--bg-a185151810p05),var(--bg-a185151810p03),var(--bg-a185151810p05));border-bottom:2px solid var(--bd-a185151810p25)">
<sc-if value="{{empPmWrite}}" hint-placeholder-val="{{ true }}">
          <th style="padding:10px 8px;width:44px;border-left:1px solid var(--bd-a185151810p1)"><label class="bs-ckhit"><input type="checkbox" checked="{{allSelected}}" onChange="{{toggleAll}}" style="accent-color:var(--fg-xb99751);width:16px;height:16px;cursor:pointer"></label></th>
</sc-if>
          <th style="padding:10px 8px;width:46px;border-left:1px solid var(--bd-a185151810p1)">
            <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
              <div style="width:32px;height:32px;border-radius:12px;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-card);background:var(--bg-a185151810p12);color:var(--fg-xb99751)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-fc24ba3c"></svg></div>
              <div style="display:flex;align-items:center;gap:4px"><span style="font-size:11px;font-weight:600;color:var(--fg-x53565a)">م</span></div>
            </div>
          </th>
          <th onClick="{{sortByName}}" class="bs-stick" style="padding:10px 8px;width:260px;cursor:pointer;border-left:1px solid var(--bd-a185151810p1)" style-hover="background:var(--bg-a185151810p05)">
            <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
              <div style="width:32px;height:32px;border-radius:12px;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-card);background:var(--bg-a185151810p12);color:var(--fg-xb99751)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-78302479"></svg></div>
              <div style="display:flex;align-items:center;gap:4px"><span style="font-size:11px;font-weight:600;color:var(--fg-x53565a)">اسم الموظف</span><span style="font-size:10px;color:{{arrNameColor}}">{{arrName}}</span></div>
            </div>
          </th>
          <th style="padding:10px 8px;width:90px;border-left:1px solid var(--bd-a185151810p1)">
            <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
              <div style="width:32px;height:32px;border-radius:12px;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-card);background:var(--bg-a185151810p12);color:var(--fg-xb99751)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-f038c28f"></svg></div>
              <div style="display:flex;align-items:center;gap:4px"><span style="font-size:11px;font-weight:600;color:var(--fg-x53565a)">الجنس</span></div>
            </div>
          </th>
          <th style="padding:10px 8px;width:125px;border-left:1px solid var(--bd-a185151810p1)">
            <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
              <div style="width:32px;height:32px;border-radius:12px;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-card);background:var(--bg-a185151810p12);color:var(--fg-xb99751)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-aac7e173"></svg></div>
              <div style="display:flex;align-items:center;gap:4px"><span style="font-size:11px;font-weight:600;color:var(--fg-x53565a)">رقم الهوية</span></div>
            </div>
          </th>
          <th style="padding:10px 8px;width:110px;border-left:1px solid var(--bd-a185151810p1)">
            <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
              <div style="width:32px;height:32px;border-radius:12px;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-card);background:var(--bg-a185151810p12);color:var(--fg-xb99751)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-d0d04915"></svg></div>
              <div style="display:flex;align-items:center;gap:4px"><span style="font-size:11px;font-weight:600;color:var(--fg-x53565a)">الرقم الوظيفي</span></div>
            </div>
          </th>
          <th style="padding:10px 8px;width:150px;border-left:1px solid var(--bd-a185151810p1)">
            <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
              <div style="width:32px;height:32px;border-radius:12px;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-card);background:var(--bg-a185151810p12);color:var(--fg-xb99751)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-f6485bbe"></svg></div>
              <div style="display:flex;align-items:center;gap:4px"><span style="font-size:11px;font-weight:600;color:var(--fg-x53565a)">رقم الجوال</span></div>
            </div>
          </th>
          <th style="padding:10px 8px;width:190px;border-left:1px solid var(--bd-a185151810p1)">
            <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
              <div style="width:32px;height:32px;border-radius:12px;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-card);background:var(--bg-a185151810p12);color:var(--fg-xb99751)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-944807b7"></svg></div>
              <div style="display:flex;align-items:center;gap:4px"><span style="font-size:11px;font-weight:600;color:var(--fg-x53565a)">البريد الإلكتروني</span></div>
            </div>
          </th>
          <th style="padding:10px 8px;width:110px;border-left:1px solid var(--bd-a185151810p1)">
            <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
              <div style="width:32px;height:32px;border-radius:12px;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-card);background:var(--bg-a185151810p12);color:var(--fg-xb99751)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-45eb9fd6"></svg></div>
              <div style="display:flex;align-items:center;gap:4px"><span style="font-size:11px;font-weight:600;color:var(--fg-x53565a)">نوع التوظيف</span></div>
            </div>
          </th>
          <th style="padding:10px 8px;width:132px;border-left:1px solid var(--bd-a185151810p1)">
            <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
              <div style="width:32px;height:32px;border-radius:12px;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-card);background:var(--bg-a185151810p12);color:var(--fg-xb99751)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-52345f29"></svg></div>
              <div style="display:flex;align-items:center;gap:4px"><span style="font-size:11px;font-weight:600;color:var(--fg-x53565a)">حساب الدخول</span></div>
            </div>
          </th>
          <th style="padding:10px 8px;width:110px">
            <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
              <div style="width:32px;height:32px;border-radius:12px;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-card);background:var(--bg-a185151810p12);color:var(--fg-xb99751)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-bfbe856f"></svg></div>

            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <sc-for list="{{rows}}" as="e" hint-placeholder-count="8">
        <tr style="border-bottom:1px solid var(--bd-xf1f5f9);transition:background .15s" style-hover="background:var(--bg-a185151810p05)">
<sc-if value="{{empPmWrite}}" hint-placeholder-val="{{ true }}">
          <td style="padding:8px;text-align:center"><label class="bs-ckhit"><input type="checkbox" checked="{{e.sel}}" onChange="{{e.toggle}}" style="accent-color:var(--fg-xb99751);width:16px;height:16px;cursor:pointer"></label></td>
</sc-if>
          <td data-label="م" style="padding:8px 6px;text-align:center"><span style="font-size:13px;font-weight:400;color:var(--fg-x53565a);font-family:'Cairo',sans-serif">{{e.sn}}</span></td>
          <td data-label="اسم الموظف" class="bs-stick" style="padding:8px">
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:32px;height:32px;border-radius:9999px;display:flex;align-items:center;justify-content:center;color:var(--text-on-brand);font-weight:400;font-size:13px;flex-shrink:0;box-shadow:var(--shadow-card);background:var(--bg-xb99751)">{{e.initial}}</div>
              <div style="min-width:0;text-align:right;flex:1">
                <sc-if value="{{e.notEditing}}"><div style="font-size:13px;font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{e.name}}</div></sc-if>
                <sc-if value="{{e.editing}}"><input value="{{e.fName}}" onChange="{{e.onIName}}" style="width:100%;height:30px;border:1px solid var(--bd-xb99751);border-radius:6px;padding:0 8px;font-size:12px;font-weight:400;outline:none;font-family:'Cairo',sans-serif;box-sizing:border-box"></sc-if>
              </div>
            </div>
          </td>
          <td data-label="الجنس" style="padding:8px;text-align:center">
            <sc-if value="{{e.notEditing}}"><span style="font-size:12px;font-weight:400">{{e.genderD}}</span></sc-if>
            <sc-if value="{{e.editing}}">
              <div style="position:relative;text-align:right">
                <div style="display:flex;justify-content:center;align-items:center;min-height:30px">
                <sc-if value="{{e.iGenderHas}}" hint-placeholder-val="{{ true }}"><span onClick="{{e.iGenderToggle}}" title="انقر لتغيير الجنس" style="{{e.iGenderTxtStyle}}">{{e.iGenderValue}}</span></sc-if>
                <sc-if value="{{e.iGenderNo}}" hint-placeholder-val="{{ false }}"><button onClick="{{e.iGenderToggle}}" title="انقر لاختيار الجنس" style="{{e.iGenderPlusStyle}}">+</button></sc-if>
                </div>
                <sc-if value="{{e.iGenderOpen}}" hint-placeholder-val="{{ false }}">
                <div data-bs-dd="1" style="position:absolute;top:100%;right:0;left:0;min-width:110px;z-index:70;margin-top:4px;background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p35);border-radius:10px;box-shadow:var(--shadow-elevated);overflow:hidden;text-align:right">
                  <div style="padding:4px">
                    <sc-for list="{{e.iGenderOpts}}" as="o" hint-placeholder-count="2">
                    <div onClick="{{o.pick}}" style="{{o.style}}" style-hover="background:var(--bg-a185151810p06)">
                      <sc-if value="{{o.selected}}" hint-placeholder-val="{{ false }}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-xb99751)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0" data-i="i-c37d9e39"></svg></sc-if>
                      <span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{o.name}}</span>
                    </div>
                    </sc-for>
                  </div>
                </div>
                </sc-if>
              </div>
            </sc-if>
          </td>
          <td data-label="رقم الهوية" style="padding:8px;text-align:center">
            <sc-if value="{{e.notEditing}}"><span dir="ltr" style="font-size:12px;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';font-weight:400;color:var(--fg-x475569)">{{e.nid}}</span></sc-if>
            <sc-if value="{{e.editing}}"><input dir="ltr" value="{{e.fNid}}" onChange="{{e.onINid}}" maxLength="{{ 10 }}" placeholder="1XXXXXXXXX" style="width:120px;height:30px;border:1px solid var(--bd-xb99751);border-radius:6px;padding:0 6px;font-size:12px;text-align:center;outline:none;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';box-sizing:border-box"></sc-if>
          </td>
          <td data-label="الرقم الوظيفي" style="padding:8px;text-align:center">
            <sc-if value="{{e.notEditing}}"><span dir="ltr" style="font-size:12px;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';font-weight:400;color:var(--fg-x141414)">{{e.empnoDisp}}</span></sc-if>
            <sc-if value="{{e.editing}}"><input dir="ltr" value="{{e.fEmpno}}" onChange="{{e.onIEmpno}}" maxLength="{{ 6 }}" style="width:90px;height:30px;border:1px solid var(--bd-xb99751);border-radius:6px;padding:0 6px;font-size:12px;text-align:center;outline:none;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';box-sizing:border-box"></sc-if>
          </td>
          <td style="padding:8px;text-align:center">
            <sc-if value="{{e.notEditing}}"><span dir="ltr" style="font-size:12px;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';color:var(--fg-x475569)">{{e.phone}}</span></sc-if>
            <sc-if value="{{e.editing}}"><input dir="ltr" value="{{e.fPhone}}" onChange="{{e.onIPhone}}" maxLength="{{ 10 }}" placeholder="05XXXXXXXX" style="width:110px;height:30px;border:1px solid var(--bd-xb99751);border-radius:6px;padding:0 6px;font-size:12px;text-align:center;outline:none;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';box-sizing:border-box"></sc-if>
          </td>
          <td data-label="البريد الإلكتروني" style="padding:8px;text-align:center">
            <sc-if value="{{e.notEditing}}"><span dir="ltr" style="font-size:11.5px;font-family:'Cairo',sans-serif;color:var(--fg-x475569);display:inline-block;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:middle">{{e.emailD}}</span></sc-if>
            <sc-if value="{{e.editing}}"><input dir="ltr" value="{{e.fEmail}}" onChange="{{e.onIEmail}}" placeholder="name@example.gov.sa" style="width:170px;height:30px;border:1px solid var(--bd-xb99751);border-radius:6px;padding:0 6px;font-size:11.5px;text-align:left;outline:none;font-family:'Cairo',sans-serif;box-sizing:border-box"></sc-if>
          </td>
          <td data-label="نوع التوظيف" style="padding:8px;text-align:center">
            <sc-if value="{{e.notEditing}}"><span style="font-size:12px;font-weight:400">{{e.typeD}}</span></sc-if>
            <sc-if value="{{e.editing}}">
              <div style="position:relative;text-align:right">
                <div style="display:flex;justify-content:center;align-items:center;min-height:30px">
                <sc-if value="{{e.iTypeHas}}" hint-placeholder-val="{{ true }}"><span onClick="{{e.iTypeToggle}}" title="انقر لتغيير نوع التوظيف" style="{{e.iTypeTxtStyle}}">{{e.iTypeValue}}</span></sc-if>
                <sc-if value="{{e.iTypeNo}}" hint-placeholder-val="{{ false }}"><button onClick="{{e.iTypeToggle}}" title="انقر لاختيار نوع التوظيف" style="{{e.iTypePlusStyle}}">+</button></sc-if>
                </div>
                <sc-if value="{{e.iTypeOpen}}" hint-placeholder-val="{{ false }}">
                <div data-bs-dd="1" style="position:absolute;top:100%;right:0;left:0;min-width:150px;z-index:70;margin-top:4px;background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p35);border-radius:10px;box-shadow:var(--shadow-elevated);overflow:hidden">
                  <div style="max-height:150px;overflow-y:auto;padding:4px">
                    <sc-for list="{{e.iTypeOpts}}" as="o" hint-placeholder-count="4">
                    <div onClick="{{o.pick}}" style="{{o.style}}" style-hover="background:var(--bg-a185151810p06)">
                      <sc-if value="{{o.selected}}" hint-placeholder-val="{{ false }}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-xb99751)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0" data-i="i-c37d9e39"></svg></sc-if>
                      <sc-if value="{{o.editing}}" hint-placeholder-val="{{ false }}"><input value="{{o.editVal}}" onChange="{{o.editOn}}" onKeyDown="{{o.editKd}}" onClick="{{o.stop}}" style="flex:1;min-width:0;height:26px;border:1px solid var(--bd-xb99751);border-radius:6px;padding:0 8px;font-size:11.5px;font-family:'Cairo',sans-serif;outline:none;box-sizing:border-box;background:var(--bg-xffffff);color:var(--fg-x141414)"><button onClick="{{o.editSave}}" title="حفظ الاسم الجديد وترحيله لكل موظف يحمل الاسم القديم" style="width:22px;height:22px;border-radius:6px;border:0;background:var(--bg-a4120870p12);color:var(--fg-x047857);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" data-i="i-c37d9e39"></svg></button><button onClick="{{o.editCancel}}" title="إلغاء التعديل" style="width:22px;height:22px;border-radius:6px;border:0;background:transparent;color:var(--fg-x94a3b8);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" data-i="i-26175592"></svg></button></sc-if><sc-if
                          value="{{o.notEdit}}" hint-placeholder-val="{{ true }}"><span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{o.name}}</span><button onClick="{{o.edit}}" title="تعديل اسم الخيار" style="width:22px;height:22px;border-radius:6px;border:0;background:transparent;color:var(--fg-xcbd5e1);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0" style-hover="background:var(--bg-a185151810p12);color:var(--fg-x8a6f35)"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" data-i="i-f6efaf94"></svg></button>
                      <sc-if value="{{o.canDel}}" hint-placeholder-val="{{ true }}">
                      <button onClick="{{o.del}}" title="حذف الخيار" style="width:22px;height:22px;border-radius:6px;border:0;background:transparent;color:var(--fg-xcbd5e1);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0" style-hover="background:var(--bg-xfef2f2);color:var(--fg-xef4444)"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" data-i="i-9bf9a6dd"></svg></button>
                      </sc-if></sc-if>
                    </div>
                    </sc-for>
                  </div>
                  <div style="display:flex;gap:6px;padding:6px;border-top:1px solid var(--bd-xf1f5f9);background:var(--bg-xfafafa)">
                    <input value="{{e.iNew}}" onChange="{{e.onINew}}" onKeyDown="{{e.onINewKey}}" placeholder="إضافة خيار جديد..." style="flex:1;height:28px;border:1px dashed var(--bd-xcbd5e1);border-radius:8px;padding:0 8px;font-size:11px;outline:none;font-family:'Cairo',sans-serif;box-sizing:border-box;background:var(--bg-xffffff);min-width:0" style-focus="border-color:var(--bd-xb99751)">
                    <button onClick="{{e.iTypeAdd}}" title="إضافة" style="width:28px;height:28px;border-radius:8px;border:0;background:var(--bg-xb99751);color:var(--text-on-brand);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0" style-hover="background:var(--bg-xa6884a)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" data-i="i-de4e6997"></svg></button>
                  </div>
                </div>
                </sc-if>
              </div>
            </sc-if>
          </td>
          <td data-label="حساب الدخول" style="padding:8px;text-align:center">
            <!-- نقطة + نصّ لمن له حساب (يفتح أدواته)؛ «بلا حساب» نصٌّ رمادي بتلميح يذكر الشرط الناقص — التفعيل تلقائي فلا زر له -->
            <div style="position:relative;text-align:right">
              <div style="display:flex;justify-content:center;align-items:center;min-height:24px">
              <sc-if value="{{e.accHas}}" hint-placeholder-val="{{ true }}"><span onClick="{{e.accToggle}}" title="{{e.accTitle}}" style="{{e.accTxtStyle}}"><span style="width:7px;height:7px;border-radius:9999px;flex-shrink:0;background:{{e.accDot}}"></span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{e.accLabel}}</span></span></sc-if>
              <sc-if value="{{e.accNo}}" hint-placeholder-val="{{ false }}"><span title="{{e.accTitle}}" style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--fg-x94a3b8);cursor:help;white-space:nowrap"><span style="width:7px;height:7px;border-radius:9999px;flex-shrink:0;background:var(--bg-xcbd5e1)"></span>بلا حساب</span></sc-if>
              </div>
              <sc-if value="{{e.accOpen}}" hint-placeholder-val="{{ false }}">
              <div data-bs-dd="1" style="position:absolute;top:100%;right:0;left:0;min-width:190px;z-index:70;margin-top:4px;background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p35);border-radius:10px;box-shadow:var(--shadow-elevated);overflow:hidden;padding:4px">
                <div onClick="{{e.accActivate}}" style="{{e.accActStyle}}" style-hover="background:var(--bg-a0163870p08)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0" data-i="i-c37d9e39"></svg>
                  <span style="flex:1">{{e.accActText}}</span>
                </div>
                
                <div onClick="{{e.accFreeze}}" style="{{e.accFrzStyle}}" style-hover="background:var(--bg-a245158110p1)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0" data-i="i-14542284"></svg>
                  <span style="flex:1">تجميد الحساب</span>
                </div>
                <sc-if value="{{e.accMgrShow}}" hint-placeholder-val="{{ false }}">
                <div onClick="{{e.accMgrToggle}}" title="حاملُ الشارة يدير حسابات موظفي إدارته وصلاحياتهم ويمنحهم مما يملكه — وتبقى صفحاتُه كما في ورقته الحالية ما لم يوسّعها مسؤول المنصة" style="{{e.accMgrStyle}}" style-hover="background:var(--bg-a185151810p1)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0" data-i="i-a45641fc"></svg>
                  <span style="flex:1">{{e.accMgrText}}</span>
                </div>
                </sc-if>
                <div style="border-top:1px dashed var(--bd-xeef1f4);margin:4px 2px 0;padding:6px 6px 2px;font-size:8.5px;color:var(--fg-x94a3b8);line-height:1.7">{{e.accHint}}</div>
              </div>
              </sc-if>
            </div>
            
          </td>
          <td data-label="الإجراءات" style="padding:8px;text-align:center">
            <sc-if value="{{e.notEditing}}">
            <sc-if value="{{e.rmHas}}" hint-placeholder-val="{{ true }}">
            <span style="position:relative;display:inline-block">
              <button onClick="{{e.rmToggle}}" title="إجراءات هذا السجل" style="{{e.rmBtnStyle}}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" data-i="i-0dbad243"></svg>
              </button>
              <sc-if value="{{e.rmOpen}}" hint-placeholder-val="{{ false }}">
              <div style="position:absolute;top:100%;left:50%;transform:translateX(-50%);z-index:60;margin-top:5px;background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p28);border-radius:11px;box-shadow:var(--shadow-elevated);padding:5px;display:flex;align-items:center;gap:4px;width:max-content">
                <sc-for list="{{e.rmItems}}" as="a" hint-placeholder-count="3">
                <button onClick="{{a.run}}" title="{{a.name}}" style="{{a.style}}" style-hover="border-color:var(--bd-xb99751);background:var(--bg-a185151810p08)">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-9621a719"></svg>
                </button>
                </sc-for>
              </div>
              </sc-if>
            </span>
            </sc-if>
            </sc-if>
            <sc-if value="{{e.editing}}">
              <span style="display:inline-flex;align-items:center;gap:2px">
              <button title="{{e.tSave}}" onClick="{{e.saveInline}}" style="width:28px;height:28px;border-radius:8px;border:1px solid var(--bd-xa7f3d0);background:var(--bg-xecfdf5);color:var(--fg-x059669);cursor:pointer;display:inline-flex;align-items:center;justify-content:center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" data-i="i-00f444e5"></svg></button>
              <button title="{{e.tCancel}}" onClick="{{e.cancelInline}}" style="width:28px;height:28px;border-radius:8px;border:1px solid var(--bd-xe2e8f0);background:var(--bg-xffffff);color:var(--fg-x64748b);cursor:pointer;display:inline-flex;align-items:center;justify-content:center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" data-i="i-884562fd"></svg></button>
              </span>
            </sc-if>
          </td>
        </tr>
        </sc-for>
      </tbody>
    </table>
  </div>
  <div class="bs-hbar" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-top:1px solid var(--bd-xe1e1e1);background:var(--bg-surface);font-size:12px">
    <span style="color:var(--fg-x53565a)">عرض <span style="font-weight:400;color:var(--fg-x141414)" dir="ltr">{{pgRange}}</span> من <span style="font-weight:400;color:var(--fg-x141414)" dir="ltr">{{pgTotal}}</span> {{pgTotalW}}</span>
    <div style="display:flex;align-items:center;gap:8px">
      <span style="color:var(--fg-x94a3b8);font-size:11px">لكل صفحة</span>
      <select value="{{perPage}}" onChange="{{onPerPage}}" style="height:28px;width:78px;font-size:10px;border-radius:8px;border:1px solid var(--bd-xe1e1e1);background:var(--bg-xffffff);font-family:'Cairo',sans-serif;outline:none;cursor:pointer"><option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option><option value="0">الكل</option></select>
      <div style="display:flex;align-items:center;border:1px solid var(--bd-xe1e1e1);border-radius:8px;overflow:hidden">
        <button onClick="{{pgFirst}}" title="الصفحة الأولى" style="{{pgFirstStyle}}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-ec58a044"></svg></button>
        <button onClick="{{pgPrev}}" title="السابق" style="{{pgPrevStyle}}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-870cde61"></svg></button>
        <sc-for list="{{pgNums}}" as="n" hint-placeholder-count="5">
          <sc-if value="{{n.dots}}"><span style="height:28px;width:20px;display:flex;align-items:center;justify-content:center;color:var(--fg-x94a3b8);font-size:10px;border-right:1px solid var(--bd-xe1e1e1)">…</span></sc-if>
          <sc-if value="{{n.cur}}"><button style="{{n.style}}">{{n.label}}</button></sc-if>
          <sc-if value="{{n.plain}}"><button onClick="{{n.click}}" style="{{n.style}}" style-hover="background:var(--bg-xf5f5f5)">{{n.label}}</button></sc-if>
        </sc-for>
        <button onClick="{{pgNext}}" title="التالي" style="{{pgNextStyle}}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-5ff99641"></svg></button>
        <button onClick="{{pgLast}}" title="الصفحة الأخيرة" style="{{pgLastStyle}}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-9e7cf3ce"></svg></button>
      </div>
    </div>
  </div>
</div>
</sc-if>

<sc-if value="{{isGridView}}" hint-placeholder-val="{{ false }}">
<div class="bs-cardgrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(178px,1fr));gap:10px;padding:12px">
  <sc-for list="{{rows}}" as="e" hint-placeholder-count="8">
  <div style="background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p25);border-radius:14px;overflow:visible;box-shadow:var(--shadow-soft);transition:all .2s;display:flex;flex-direction:column" style-hover="box-shadow:0 12px 28px -12px rgba(154,126,64,0.35)">
    <div style="background:linear-gradient(135deg,var(--bg-x303d48) 0%,var(--bg-x3d4c59) 60%,var(--bg-x303d48) 100%);border-radius:13px 13px 0 0;height:14px;position:relative;display:flex;align-items:center;justify-content:center">
      <div style="width:56px;height:3px;border-radius:9999px;background:linear-gradient(90deg,var(--bg-xe6d29d),var(--bg-xb99751),var(--bg-x9a7e40))"></div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding:10px 10px 0">
      <div style="width:44px;height:44px;border-radius:9999px;display:flex;align-items:center;justify-content:center;color:var(--fg-x303d48);font-weight:600;font-size:17px;background:linear-gradient(135deg,var(--bg-xe6d29d),var(--bg-xb99751));box-shadow:0 3px 8px rgba(154,126,64,0.35);border:2px solid var(--bd-a2552552550p9)">{{e.initial}}</div>
      <sc-if value="{{e.notEditing}}">
        <div style="font-size:13px;font-weight:600;color:var(--fg-x141414);margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">{{e.name}}</div>
      </sc-if>
      <sc-if value="{{e.editing}}">
        <input value="{{e.fName}}" onChange="{{e.onIName}}" placeholder="اسم الموظف" style="width:100%;height:28px;margin-top:6px;border:1px solid var(--bd-xb99751);border-radius:6px;padding:0 8px;font-size:12px;font-weight:400;outline:none;font-family:'Cairo',sans-serif;box-sizing:border-box;text-align:center">
      </sc-if>
    </div>
    <div style="padding:10px 12px;display:flex;flex-direction:column;gap:6px;flex:1">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <span style="font-size:9px;font-weight:400;color:var(--fg-x94a3b8);flex-shrink:0">الرقم الوظيفي</span>
        <sc-if value="{{e.notEditing}}"><span dir="ltr" style="font-size:11px;font-weight:400;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';color:var(--fg-x141414)">{{e.empnoDisp}}</span></sc-if>
        <sc-if value="{{e.editing}}"><input dir="ltr" value="{{e.fEmpno}}" onChange="{{e.onIEmpno}}" maxLength="{{ 6 }}" style="width:90px;height:26px;border:1px solid var(--bd-xb99751);border-radius:6px;padding:0 6px;font-size:11px;text-align:center;outline:none;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';box-sizing:border-box"></sc-if>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <span style="font-size:9px;font-weight:400;color:var(--fg-x94a3b8);flex-shrink:0">رقم الهوية</span>
        <sc-if value="{{e.notEditing}}"><span dir="ltr" style="font-size:11px;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';color:var(--fg-x475569)">{{e.nid}}</span></sc-if>
        <sc-if value="{{e.editing}}"><input dir="ltr" value="{{e.fNid}}" onChange="{{e.onINid}}" maxLength="{{ 10 }}" style="width:110px;height:26px;border:1px solid var(--bd-xb99751);border-radius:6px;padding:0 6px;font-size:11px;text-align:center;outline:none;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';box-sizing:border-box"></sc-if>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <span style="font-size:9px;font-weight:400;color:var(--fg-x94a3b8);flex-shrink:0">رقم الجوال</span>
        <sc-if value="{{e.notEditing}}"><span dir="ltr" style="font-size:11px;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';color:var(--fg-x475569)">{{e.phone}}</span></sc-if>
        <sc-if value="{{e.editing}}"><input dir="ltr" value="{{e.fPhone}}" onChange="{{e.onIPhone}}" maxLength="{{ 10 }}" style="width:110px;height:26px;border:1px solid var(--bd-xb99751);border-radius:6px;padding:0 6px;font-size:11px;text-align:center;outline:none;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';box-sizing:border-box"></sc-if>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <span style="font-size:9px;font-weight:400;color:var(--fg-x94a3b8);flex-shrink:0">البريد الإلكتروني</span>
        <sc-if value="{{e.notEditing}}"><span dir="ltr" style="font-size:10.5px;font-family:'Cairo',sans-serif;color:var(--fg-x475569);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:150px">{{e.emailD}}</span></sc-if>
        <sc-if value="{{e.editing}}"><input dir="ltr" value="{{e.fEmail}}" onChange="{{e.onIEmail}}" placeholder="name@example.gov.sa" style="width:150px;height:26px;border:1px solid var(--bd-xb99751);border-radius:6px;padding:0 6px;font-size:10.5px;text-align:left;outline:none;font-family:'Cairo',sans-serif;box-sizing:border-box"></sc-if>
      </div>
      <sc-if value="{{e.notEditing}}">
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:2px;justify-content:center">
          <span style="display:inline-flex;padding:2px 9px;border-radius:6px;font-size:9px;font-weight:400;{{e.typeBadge}}">{{e.typeD}}</span>
        </div>
      </sc-if>
      <sc-if value="{{e.editing}}">
        <div style="display:flex;flex-direction:column;gap:5px;margin-top:2px">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:9px;font-weight:400;color:var(--fg-x94a3b8);width:52px;flex-shrink:0">التوظيف</span>
            <div style="position:relative;flex:1;text-align:right">
              <button onClick="{{e.iTypeToggle}}" style="{{e.iTypeBtnStyle}}">
                <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{e.iTypeValue}}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="{{e.iTypeChev}}" data-i="i-c92915c6"></svg>
              </button>
              <sc-if value="{{e.iTypeOpen}}" hint-placeholder-val="{{ false }}">
              <div data-bs-dd="1" style="position:absolute;top:100%;right:0;left:0;min-width:150px;z-index:70;margin-top:4px;background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p35);border-radius:10px;box-shadow:var(--shadow-elevated);overflow:hidden">
                <div style="max-height:150px;overflow-y:auto;padding:4px">
                  <sc-for list="{{e.iTypeOpts}}" as="o" hint-placeholder-count="4">
                  <div onClick="{{o.pick}}" style="{{o.style}}" style-hover="background:var(--bg-a185151810p06)">
                    <sc-if value="{{o.selected}}" hint-placeholder-val="{{ false }}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-xb99751)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0" data-i="i-c37d9e39"></svg></sc-if>
                    <sc-if value="{{o.editing}}" hint-placeholder-val="{{ false }}"><input value="{{o.editVal}}" onChange="{{o.editOn}}" onKeyDown="{{o.editKd}}" onClick="{{o.stop}}" style="flex:1;min-width:0;height:26px;border:1px solid var(--bd-xb99751);border-radius:6px;padding:0 8px;font-size:11.5px;font-family:'Cairo',sans-serif;outline:none;box-sizing:border-box;background:var(--bg-xffffff);color:var(--fg-x141414)"><button onClick="{{o.editSave}}" title="حفظ الاسم الجديد وترحيله لكل موظف يحمل الاسم القديم" style="width:22px;height:22px;border-radius:6px;border:0;background:var(--bg-a4120870p12);color:var(--fg-x047857);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" data-i="i-c37d9e39"></svg></button><button onClick="{{o.editCancel}}" title="إلغاء التعديل" style="width:22px;height:22px;border-radius:6px;border:0;background:transparent;color:var(--fg-x94a3b8);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" data-i="i-26175592"></svg></button></sc-if><sc-if
                        value="{{o.notEdit}}" hint-placeholder-val="{{ true }}"><span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{o.name}}</span><button onClick="{{o.edit}}" title="تعديل اسم الخيار" style="width:22px;height:22px;border-radius:6px;border:0;background:transparent;color:var(--fg-xcbd5e1);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0" style-hover="background:var(--bg-a185151810p12);color:var(--fg-x8a6f35)"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" data-i="i-f6efaf94"></svg></button>
                    <sc-if value="{{o.canDel}}" hint-placeholder-val="{{ true }}">
                    <button onClick="{{o.del}}" style="width:22px;height:22px;border-radius:6px;border:0;background:transparent;color:var(--fg-xcbd5e1);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0" style-hover="background:var(--bg-xfef2f2);color:var(--fg-xef4444)" aria-label="حذف"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" data-i="i-9bf9a6dd"></svg></button>
                    </sc-if></sc-if>
                  </div>
                  </sc-for>
                </div>
                <div style="display:flex;gap:6px;padding:6px;border-top:1px solid var(--bd-xf1f5f9);background:var(--bg-xfafafa)">
                  <input value="{{e.iNew}}" onChange="{{e.onINew}}" onKeyDown="{{e.onINewKey}}" placeholder="إضافة خيار جديد..." style="flex:1;height:28px;border:1px dashed var(--bd-xcbd5e1);border-radius:8px;padding:0 8px;font-size:11px;outline:none;font-family:'Cairo',sans-serif;box-sizing:border-box;background:var(--bg-xffffff);min-width:0" style-focus="border-color:var(--bd-xb99751)">
                  <button onClick="{{e.iTypeAdd}}" style="width:28px;height:28px;border-radius:8px;border:0;background:var(--bg-xb99751);color:var(--text-on-brand);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0" style-hover="background:var(--bg-xa6884a)" aria-label="إضافة صنف"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" data-i="i-de4e6997"></svg></button>
                </div>
              </div>
              </sc-if>
            </div>
          </div>
        </div>
      </sc-if>
    </div>
    <div style="display:flex;align-items:center;justify-content:center;gap:6px;border-top:1px solid var(--bd-a185151810p15);padding:5px 8px;background:var(--bg-a185151810p03);border-radius:0 0 13px 13px">
      <sc-if value="{{e.notEditing}}">
        <span class="emp-cardact" style="display:inline-flex;align-items:center;gap:2px">
<sc-if value="{{empPmEdit}}" hint-placeholder-val="{{ true }}">
        <button onClick="{{e.edit}}" style="width:26px;height:26px;border-radius:7px;border:0;background:transparent;color:var(--fg-x64748b);cursor:pointer;display:inline-flex;align-items:center;justify-content:center" style-hover="background:var(--bg-a185151810p1);color:var(--fg-xb99751)" aria-label="تعديل"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-37ad70cd"></svg></button>
</sc-if>
<sc-if value="{{empPmDel}}" hint-placeholder-val="{{ true }}">
        <button onClick="{{e.remove}}" style="width:26px;height:26px;border-radius:7px;border:0;background:transparent;color:var(--fg-x64748b);cursor:pointer;display:inline-flex;align-items:center;justify-content:center" style-hover="background:var(--bg-xfef2f2);color:var(--fg-xef4444)" aria-label="حذف"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-9bf9a6dd"></svg></button>
</sc-if>
        </span>
      </sc-if>
      <sc-if value="{{e.editing}}">
        <span style="display:inline-flex;align-items:center;gap:4px">
        <button onClick="{{e.saveInline}}" style="height:26px;padding:0 12px;border-radius:7px;border:1px solid var(--bd-xa7f3d0);background:var(--bg-xecfdf5);color:var(--fg-x059669);font-size:10px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;display:inline-flex;align-items:center;gap:4px" style-hover="background:var(--bg-xd1fae5)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" data-i="i-c37d9e39"></svg>حفظ</button>
        <button onClick="{{e.cancelInline}}" style="height:26px;padding:0 10px;border-radius:7px;border:1px solid var(--bd-xe2e8f0);background:var(--bg-xffffff);color:var(--fg-x64748b);font-size:10px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif" style-hover="background:var(--bg-xf8fafc)">إلغاء</button>
        </span>
      </sc-if>
    </div>
  </div>
  </sc-for>
</div>
  <div class="bs-hbar" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-top:1px solid var(--bd-xe1e1e1);background:var(--bg-surface);font-size:12px">
    <span style="color:var(--fg-x53565a)">عرض <span style="font-weight:400;color:var(--fg-x141414)" dir="ltr">{{pgRange}}</span> من <span style="font-weight:400;color:var(--fg-x141414)" dir="ltr">{{pgTotal}}</span> {{pgTotalW}}</span>
    <div style="display:flex;align-items:center;gap:8px">
      <span style="color:var(--fg-x94a3b8);font-size:11px">لكل صفحة</span>
      <select value="{{perPage}}" onChange="{{onPerPage}}" style="height:28px;width:78px;font-size:10px;border-radius:8px;border:1px solid var(--bd-xe1e1e1);background:var(--bg-xffffff);font-family:'Cairo',sans-serif;outline:none;cursor:pointer"><option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option><option value="0">الكل</option></select>
      <div style="display:flex;align-items:center;border:1px solid var(--bd-xe1e1e1);border-radius:8px;overflow:hidden">
        <button onClick="{{pgFirst}}" title="الصفحة الأولى" style="{{pgFirstStyle}}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-ec58a044"></svg></button>
        <button onClick="{{pgPrev}}" title="السابق" style="{{pgPrevStyle}}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-870cde61"></svg></button>
        <sc-for list="{{pgNums}}" as="n" hint-placeholder-count="5">
          <sc-if value="{{n.dots}}"><span style="height:28px;width:20px;display:flex;align-items:center;justify-content:center;color:var(--fg-x94a3b8);font-size:10px;border-right:1px solid var(--bd-xe1e1e1)">…</span></sc-if>
          <sc-if value="{{n.cur}}"><button style="{{n.style}}">{{n.label}}</button></sc-if>
          <sc-if value="{{n.plain}}"><button onClick="{{n.click}}" style="{{n.style}}" style-hover="background:var(--bg-xf5f5f5)">{{n.label}}</button></sc-if>
        </sc-for>
        <button onClick="{{pgNext}}" title="التالي" style="{{pgNextStyle}}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-5ff99641"></svg></button>
        <button onClick="{{pgLast}}" title="الصفحة الأخيرة" style="{{pgLastStyle}}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-i="i-9e7cf3ce"></svg></button>
      </div>
    </div>
  </div>
</sc-if>
</div>
</sc-if>
<sc-if value="{{noEmployees}}" hint-placeholder-val="{{ false }}">
<div style="border-radius:16px;border:1px solid var(--bd-a2252252250p6);background:var(--bg-xffffff);box-shadow:var(--shadow-card);padding:48px 24px;display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center">
  <div style="width:96px;height:96px;border-radius:24px;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px -12px rgba(185,151,81,0.4);background:linear-gradient(135deg,var(--bg-a185151810p15),var(--bg-a185151810p05));border:1px solid var(--bd-a185151810p3);color:var(--fg-xb99751)">
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" data-i="i-78302479"></svg>
  </div>
  <div>
    <h2 style="font-size:16px;font-weight:600;margin:0">{{empNoneTitle}}</h2>
<sc-if value="{{empPmWrite}}" hint-placeholder-val="{{ true }}">
    <p style="font-size:12px;color:var(--fg-x53565a);margin:6px 0 0;line-height:1.8">أضف موظفيك يدوياً أو استوردهم من ملف Excel — وستنعكس بياناتهم تلقائياً على الجدول الشهري ومؤشرات الإدارة والمهام.</p>
</sc-if>
<sc-if value="{{empPmReadOnly}}" hint-placeholder-val="{{ false }}">
    <p style="font-size:12px;color:var(--fg-x53565a);margin:6px 0 0;line-height:1.8">لم يُضَف موظفون بعد — وصلاحيتك على هذه الصفحة عرضٌ فقط، فلا تظهر لك أدوات الإضافة.</p>
</sc-if>
  </div>
  <div class="bs-hbar" style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
<sc-if value="{{empPmAdd}}" hint-placeholder-val="{{ true }}">
    <button onClick="{{openAdd}}" style="height:42px;padding:0 24px;border-radius:12px;font-size:13px;font-weight:400;background:linear-gradient(135deg,var(--bg-xb99751),var(--bg-a185151810p85));color:var(--text-on-brand);border:1px solid var(--bd-a185151810p4);box-shadow:0 4px 12px -4px rgba(154,126,64,0.5);cursor:pointer;font-family:'Cairo',sans-serif;display:inline-flex;align-items:center;gap:8px;transition:all .2s" style-hover="box-shadow:0 8px 20px -6px rgba(154,126,64,0.6)">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" data-i="i-de4e6997"></svg>
      إضافة أول موظف
    </button>
</sc-if>
<i data-ei-s="empty"></i>
  </div>
</div>
</sc-if>

</div>
</sc-if>
<i data-ei-s="conf"></i>
</div>
