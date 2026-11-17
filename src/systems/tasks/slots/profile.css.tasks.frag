/* ═══ مهامك — بطاقة الموظف: ملخّص · الأهم الآن · بقية اليوم · السجل (بطلب المستخدم) ═══ */
.tk-sum{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:12px 16px 0}
.tk-m{border:1px solid var(--border-subtle);border-radius:11px;background:var(--bg-surface);padding:8px 10px;text-align:center;min-width:0}
.tk-m small{display:block;font-size:9.5px;color:var(--text-faint);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tk-m b{display:block;font-size:12.5px;font-weight:800;margin-top:2px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tk-m.hot{border-color:var(--bd-orange-40-a35);background:var(--bg-orange-40-a6)}
.tk-f{padding:12px 16px 10px;display:flex;flex-direction:column;gap:10px}
.tk-flbl{font-size:10px;font-weight:800;display:flex;align-items:center;gap:6px}.tk-flbl i{width:6px;height:6px;border-radius:50%;background:currentColor;display:inline-block;font-style:normal}
.tk-top{display:flex;align-items:flex-start;gap:10px}
.tk-ic{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:900;font-size:14px}
.tk-t{font-size:13px;font-weight:800;line-height:1.5}.tk-s{font-size:10.5px;color:var(--text-muted);margin-top:2px}
.tk-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.tk-timer{border:1px solid var(--brand-glow);border-radius:14px;background:linear-gradient(180deg,var(--bg-gold-50-a8-v2),var(--bg-surface));padding:12px 14px;display:flex;align-items:center;gap:12px}
.tk-big{font-size:26px;font-weight:900;font-variant-numeric:tabular-nums;direction:ltr;letter-spacing:.3px}
.tk-tl{font-size:10.5px;color:var(--text-muted);min-width:0}.tk-tl b{display:block;font-size:12px;color:var(--text-primary)}
.tk-bar{height:6px;border-radius:9999px;background:var(--bg-surface-4);overflow:hidden;position:relative}.tk-bar i{position:absolute;top:0;bottom:0;right:0;border-radius:9999px;transition:width .6s}
.tk-btns{display:flex;gap:8px}
.tk-btn{flex:1;height:40px;border-radius:11px;border:1px solid var(--border-default);background:var(--bg-surface);font-family:'Cairo',sans-serif;font-size:12.5px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;color:var(--text-secondary);cursor:pointer}
.tk-btn.pri{background:linear-gradient(180deg,var(--border-brand),var(--border-brand));border-color:var(--border-brand);color:var(--text-on-brand)}
.tk-btn.ok{background:linear-gradient(180deg,var(--success),var(--success));border-color:var(--success);color:var(--text-on-fill)}
.tk-btn.ghost{color:var(--danger-text)}.tk-btn:disabled{opacity:.5;cursor:not-allowed}
.tk-steps{display:flex;font-size:9.5px;color:var(--text-faint);margin-top:2px}
.pf-st{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;position:relative}.pf-st i{width:10px;height:10px;border-radius:50%;background:var(--bg-surface-4);display:block;font-style:normal}
.pf-st.on i{background:var(--border-brand);box-shadow:0 0 0 3px rgba(185,151,81,.2)}.pf-st.done i{background:var(--success)}.pf-st.done,.pf-st.on{color:var(--text-primary);font-weight:700}
.tk-proof{display:flex;gap:10px;align-items:center;border:1px solid var(--border-subtle);border-radius:12px;padding:8px 10px;background:var(--bg-surface)}
.tk-th{width:64px;height:50px;border-radius:10px;background:var(--bg-surface-4);border:1px solid var(--border-default);object-fit:cover;flex-shrink:0;display:block}
.tk-rows{padding:2px 16px 12px;display:flex;flex-direction:column;gap:6px}
.tk-rowh{font-size:10.5px;font-weight:800;color:var(--text-muted);margin:4px 0 2px}
.tk-row{display:flex;align-items:center;gap:10px;padding:9px 12px;border:1px solid var(--border-subtle);border-radius:12px;background:var(--bg-surface);cursor:pointer;transition:border-color .15s}.tk-row:hover{border-color:var(--tone-gold-50-a50)}
.tk-row .tk-ic{width:28px;height:28px;border-radius:8px;font-size:12px}
.tk-foot{display:flex;align-items:center;justify-content:space-between;font-size:11px;padding:4px 2px;gap:8px}
.tk-empty{padding:26px 16px;text-align:center;color:var(--text-muted);font-size:12px;background:var(--brand-pattern) center/96px 96px}
.tk-empty .tk-eic{width:44px;height:44px;border-radius:9999px;background:var(--bg-gold-50-a12);color:var(--brand-text);display:flex;align-items:center;justify-content:center;margin:0 auto 8px}
.tk-drop{border:1.5px dashed var(--border-brand);border-radius:14px;background:var(--bg-gold-50-a5);padding:16px;text-align:center;font-size:11.5px;color:var(--text-muted);cursor:pointer}.tk-drop b{display:block;color:var(--brand-text);font-size:12.5px;margin-bottom:2px}
.tk-thumbs{display:flex;gap:8px;flex-wrap:wrap}.tk-thw{position:relative}.tk-thw img{width:84px;height:64px;border-radius:10px;object-fit:cover;border:1px solid var(--border-default);display:block}
.tk-thx{position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:var(--danger);color:var(--text-on-fill);border:2px solid var(--bg-surface);font-size:11px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-weight:900}
.tk-thadd{width:84px;height:64px;border-radius:10px;border:1.5px dashed var(--border-strong);display:flex;align-items:center;justify-content:center;color:var(--text-faint);font-size:22px;cursor:pointer;background:var(--bg-surface)}
.tk-ta{width:100%;min-height:64px;border:1px solid var(--border-subtle);border-radius:10px;padding:9px 12px;font-family:'Cairo',sans-serif;font-size:12px;background:var(--bg-surface);color:var(--text-primary);resize:vertical;box-sizing:border-box}.tk-ta:focus{outline:none;border-color:var(--border-brand);box-shadow:0 0 0 2px rgba(185,151,81,.15)}
.tk-req{font-size:10px;color:var(--warning-text);display:flex;align-items:center;gap:5px}
.pf-whychip{border:1px solid var(--border-subtle);background:var(--bg-surface);color:var(--text-primary);border-radius:999px;padding:5px 12px;font-family:'Cairo',sans-serif;font-size:12px;cursor:pointer}.pf-whychip.on{border-color:var(--border-brand);background:var(--bg-gold-50-a12);color:var(--brand-text);font-weight:700}
.tk-log-day{font-size:10px;font-weight:800;color:var(--text-faint);margin-top:6px}
@media (max-width:640px){.tk-sum{grid-template-columns:repeat(2,1fr)}.tk-big{font-size:22px}}
