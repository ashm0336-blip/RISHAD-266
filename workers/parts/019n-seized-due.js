/* Former Seized browser polls, now scoped SQL facts and one NF transaction. */
async function nfSeizedDueRun(env,actor,url) {
  var now=Date.now(),minutes=pfRiyadhMins(now),d=url.searchParams.get('dept')||'';
  if(!d||minutes<480||!irDailyManager(actor))return {emitted:0};
  var saturday=new Date(now+3*3600000).getUTCDay()===6,day=pfHijriAt(now),candidates=[];
  if(minutes>=540)candidates.push({type:'bx_old',once:'bx_old:'+day.y+'-'+day.m+'-'+day.d});
  if(saturday)candidates.push({type:'bx_wk',once:'bx_wk:'+day.y+'-'+day.m+'-'+day.d});
  if(!candidates.length)return {emitted:0};
  var ctx;
  try{ctx=await szQueryContext(env,actor,d);}catch(error){if(error.szStatus===403)return {emitted:0};throw error;}
  if(!irDailyManager(ctx.A))return {emitted:0};
  var scope=nfScope(d),once=JSON.stringify(candidates.map(function(e){return e.once;})),seen=(await ctx.env.DB.prepare('SELECT once_key FROM notification_dedup WHERE scope=?1 AND once_key IN(SELECT value FROM json_each(?2))').bind(scope,once).all()).results||[];
  candidates=candidates.filter(function(e){return !seen.some(function(s){return s.once_key===e.once;});});
  if(!candidates.length)return {emitted:0};
  var q=szQueryScope(ctx,'r'),args=q.args.slice(),slot='?'+(args.push(now)),age='CAST(('+slot+'-COALESCE(r.created_at,0))/86400000 AS INTEGER)',
    sql='SELECT COALESCE(SUM(CASE WHEN '+age+'>=30 THEN CAST(COALESCE(i.quantity,0)AS INTEGER) ELSE 0 END),0) oldCount,COALESCE(SUM(CAST(COALESCE(i.quantity,0)AS INTEGER)),0) total,MAX(0,COALESCE(MAX('+age+'),0)) days,COALESCE(SUM(CAST(COALESCE(i.value,0)AS INTEGER)),0) money FROM seized_items i JOIN seized_reports r ON r.department_id=i.department_id AND r.report_id=i.report_id WHERE '+q.sql+" AND i.action_key='sto'",
    guards=ctx.guards.concat([rsEpochGuard(ctx.env.DB,ctx.base.epoch),szRetiredGuard(ctx.env)]),result=await ctx.env.DB.batch(guards.concat([rsBound(ctx.env.DB.prepare(sql),args)])),summary=result[result.length-1].results[0];
  var events=candidates.filter(function(e){return e.type==='bx_old'?summary.oldCount>0:summary.total>0;}).map(function(e){return {type:e.type,dept:d,once:e.once,vars:e.type==='bx_old'?{'العدد':summary.oldCount,'الأيام':30}:{'العدد':summary.total,'الأيام':summary.days,'المبلغ':Number(summary.money).toLocaleString('en-US')}};});
  if(!events.length)return {emitted:0};
  var plan=await nfPlanEvents(ctx.env,ctx.A,events,true);if(!plan.plans.length)return {emitted:0};
  var values=Object.keys(summary),sourceArgs=args.slice(),comparison=values.map(function(k){sourceArgs.push(summary[k]);return 's.'+k+' IS NOT ?'+sourceArgs.length;}).join(' OR '),
    sourceGuard=rsBound(ctx.env.DB.prepare("SELECT CASE WHEN EXISTS(SELECT 1 FROM ("+sql+")s WHERE "+comparison+")THEN json_extract('{}','KIVO_SEIZED_DUE_CHANGED')END"),sourceArgs),
    emittedOnce=JSON.stringify(events.map(function(e){return e.once;})),seenGuard=ctx.env.DB.prepare("SELECT CASE WHEN EXISTS(SELECT 1 FROM notification_dedup WHERE scope=?1 AND once_key IN(SELECT value FROM json_each(?2)))THEN json_extract('{}','KIVO_SEIZED_DUE_SEEN')END").bind(scope,emittedOnce),statements=guards.concat(plan.guards,[sourceGuard,seenGuard],bdBumpStatements(ctx.env,NF_REV,false),plan.statements,nfRetention(ctx.env,now,plan.scopes));
  try{await ctx.env.DB.batch(statements);}catch(error){
    if(/KIVO_SEIZED_DUE_SEEN/.test(String(error))){var rows=(await ctx.env.DB.prepare('SELECT once_key FROM notification_dedup WHERE scope=?1 AND once_key IN(SELECT value FROM json_each(?2))').bind(scope,emittedOnce).all()).results||[];if(rows.length===events.length)return {emitted:0};}
    if(/KIVO_RESTORE_TARGET|KIVO_RESTORE_EPOCH|KIVO_SEIZED_DUE_(?:SEEN|CHANGED)/.test(String(error)))throw nfErr('conflict',409);throw error;
  }
  preOff(ctx.env);return {emitted:plan.plans.length};
}

async function nfSeizedDue(env,actor,url) {
  try{return await nfSeizedDueRun(env,actor,url);}
  catch(error){
    if(error.szCode)throw nfErr(error.szCode,error.szStatus===409?409:503);
    if(/KIVO_SEIZED_LEGACY_SOURCE/.test(String(error)))throw nfErr('seized-legacy-source-present',503);
    throw error;
  }
}
