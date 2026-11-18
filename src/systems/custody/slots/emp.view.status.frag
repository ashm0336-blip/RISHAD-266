<!-- قراءةُ العهد: خطُّ التحديث والشارة من مكوّن حالات الصفحة — بلا زرّ تحديثٍ خاص بالصفحة، وبلا شريطٍ دائم.
     الشريطُ أدناه يظهر فقط حين يكون فيه ما يُقال أو يُطلب: انتظارُ حفظ، خطأ، أو «تحميل بقية». -->
<sc-if value="{{cuLoadOn}}"><div ref="{{cuStates}}"></div></sc-if>
<sc-if value="{{cuStatusOn}}">
  <div role="status" style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 14px;margin-bottom:12px;border:1px solid var(--border-default);border-radius:10px">
    <sc-if value="{{cuSaving}}"><span>جارٍ انتظار تأكيد الحفظ…</span></sc-if>
    <sc-if value="{{cuErrorOn}}"><div role="alert">{{cuError}}</div><button onClick="{{cuReviewDrafts}}" style="height:38px;padding:0 16px;border-radius:10px;font-size:12.5px;font-weight:400;background:var(--bg-surface);color:var(--text-secondary);border:1px solid var(--border-default);cursor:pointer;font-family:'Cairo',sans-serif" style-hover="background:var(--bg-surface-3)" disabled="{{cuSaving || cuLoading}}">جلب أحدث نسخة لمراجعة المسودة</button></sc-if>
    <sc-if value="{{cuHolderNext}}"><span>{{cuHolderProgress}}</span><button onClick="{{cuHolderMore}}" style="height:38px;padding:0 16px;border-radius:10px;font-size:12.5px;font-weight:400;background:var(--bg-surface);color:var(--text-secondary);border:1px solid var(--border-default);cursor:pointer;font-family:'Cairo',sans-serif" style-hover="background:var(--bg-surface-3)" disabled="{{cuHolderLoading || cuSaving || cuLoading}}">تحميل بقية عهدة الحامل</button></sc-if>
    <sc-if value="{{cuLogNext}}"><button onClick="{{cuLogMore}}" style="height:38px;padding:0 16px;border-radius:10px;font-size:12.5px;font-weight:400;background:var(--bg-surface);color:var(--text-secondary);border:1px solid var(--border-default);cursor:pointer;font-family:'Cairo',sans-serif" style-hover="background:var(--bg-surface-3)" disabled="{{cuSaving || cuLoading}}">تحميل حركات أخرى</button></sc-if>
    <sc-if value="{{cuCatalogNext}}"><button onClick="{{cuCatalogMore}}" style="height:38px;padding:0 16px;border-radius:10px;font-size:12.5px;font-weight:400;background:var(--bg-surface);color:var(--text-secondary);border:1px solid var(--border-default);cursor:pointer;font-family:'Cairo',sans-serif" style-hover="background:var(--bg-surface-3)" disabled="{{cuSaving || cuLoading}}">تحميل أصناف أخرى</button></sc-if>
  </div>
</sc-if>
