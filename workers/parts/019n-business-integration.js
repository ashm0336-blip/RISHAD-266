/* Shared cutover/backup integration for the two schema9 business domains.
   This is the only adapter to the existing atomic restore compiler. */
function bdDefinitions() {
  return [
    {name:'seized',resources:SZ_RES,names:SZ_NAMES,key:szKey,empty:szEmptyDomain,validate:szValidateDomain,convert:szConvert,inflate:szInflate,plan:szDomainPlan,exportDomain:szExportDomain,revs:szRevs,context:szQueryContext,tables:SZ_TABLES},
    {name:'awards',resources:AW_RES,names:AW_NAMES,key:awKey,empty:awEmptyDomain,validate:awValidateDomain,convert:awConvert,inflate:awInflate,plan:awDomainPlan,exportDomain:awExportDomain,revs:awRevs,context:awQueryContext,tables:AW_TABLES},
  ];
}
function bdLegacyKey(key) { return SZ_RES.concat(AW_RES).some(function(name){return String(key)===name||String(key).endsWith(':'+name)||String(key).includes(':'+name+':')||String(key).startsWith(name+':');}); }
function bdLegacyPredicate() {
  return "k IN(SELECT value FROM json_each(?1)) OR EXISTS(SELECT 1 FROM json_each(?1) r WHERE k GLOB 'bsdept:*:'||r.value OR k GLOB 'bsdept:*:'||r.value||':*' OR k GLOB r.value||':*')";
}
function bdRetiredGuard(env) {
  return env.DB.prepare("SELECT CASE WHEN EXISTS(SELECT 1 FROM kv WHERE "+bdLegacyPredicate()+")THEN json_extract('{}','KIVO_BUSINESS_LEGACY_SOURCE')END").bind(JSON.stringify(SZ_RES.concat(AW_RES)));
}
function bdCommitRetiredGuard(env) {
  // One transaction statement, with the same independent source predicates and errors.
  return env.DB.prepare("SELECT CASE WHEN EXISTS(SELECT 1 FROM kv WHERE "+irLegacyPredicate()+")THEN json_extract('{}','KIVO_IRSHAD_LEGACY_SOURCE')END,CASE WHEN EXISTS(SELECT 1 FROM kv WHERE "+bdLegacyPredicate().replace(/\?1/g,'?2')+")THEN json_extract('{}','KIVO_BUSINESS_LEGACY_SOURCE')END")
    .bind(JSON.stringify(IR_RES),JSON.stringify(SZ_RES.concat(AW_RES)));
}
async function bdGuardRetired(env) {
  if (await env.DB.prepare('SELECT 1 FROM kv WHERE '+bdLegacyPredicate()+' LIMIT 1').bind(JSON.stringify(SZ_RES.concat(AW_RES))).first()) throw rsError('business-legacy-source-present',503);
}
async function bdMigrationPrepare(env) {
  var plans=[await szLegacyPrepare(env),await awLegacyPrepare(env)];
  return {before:plans.flatMap(function(p){return p.before;}),after:plans.flatMap(function(p){return p.after;})};
}
function bdScope(domain) {
  return domain && domain.scope && domain.scope.kind==='global' ? '' : domain && domain.scope && domain.scope.departmentId;
}
function bdPlanAppend(plan, definition, dept, addition) {
  if(addition.imageProjection&&addition.imageProjection.before!==addition.imageProjection.after) {
    var image=addition.imageProjection;
    if(Object.keys(imgIdsIn(image.before||'')).length||Object.keys(imgIdsIn(image.after||'')).length) {
      (plan.relationalImageBefore||(plan.relationalImageBefore=Object.create(null)))[image.k]=image.before;
      (plan.imgTouch||(plan.imgTouch=[])).push({k:image.k,v:image.after});
    }
  }
  plan.guards.push.apply(plan.guards,addition.guards);
  plan.statements.push.apply(plan.statements,addition.statements);
  plan.revisionKeys.push.apply(plan.revisionKeys,addition.changed ? addition.revisionKeys : []);
  plan.counts[definition.name]=(plan.counts[definition.name]||0)+(addition.count===undefined?((addition.counts||{})[definition.name]||0):addition.count);
  if (addition.changed) Object.keys(addition.snapshotRows).forEach(function(kind){
    plan.snapshots.push({domain:definition.name,table:dept+':'+kind,rows:addition.snapshotRows[kind]});
  });
}
function bdRestoreReferences(plan,def,d,domain,addition) {
  var before=def.empty(d);Object.keys(def.tables).forEach(function(kind){before.rows[kind]=addition.snapshotRows[kind];});
  var old=def.inflate(before),next=def.inflate(domain),name=def.name==='seized'?'reports':'records',key=def.key(d,0),
    previous=JSON.stringify(old[name]||{}),candidate=JSON.stringify(next[name]||{});
  // Read-only typed references are also required for an unchanged modern archive.
  // They do not request image metadata writes or adopt ownership.
  (plan.relationalImageCurrent||(plan.relationalImageCurrent=Object.create(null)))[key]=previous;
  (plan.relationalImageReferences||(plan.relationalImageReferences=Object.create(null)))[key]=candidate;
  if(!addition.imageProjection&&previous!==candidate)addition.imageProjection={k:key,before:previous,after:candidate};
  return {before:old,after:next};
}
function bdRestoreCeiling(A,def,d,values) {
  if(A.u.role==='super')return;
  def.names.forEach(function(name,i){
    if(!deq(values.before[name],values.after[name])&&!canRead(A,def.key(d,i)))throw rsError('restore-'+def.name+'-resource-denied',403);
  });
}
function bdResetStatements(env) {
  return ['seized_requests'].concat(Object.keys(SZ_TABLES).reverse().map(function(k){return SZ_TABLES[k][0];}),
    ['award_request_checks','award_requests'],Object.keys(AW_TABLES).reverse().map(function(k){return AW_TABLES[k][0];}))
    .map(function(table){return env.DB.prepare('DELETE FROM '+table);});
}
async function bdRestorePlan(env,A,body,plan,domains,finalDeptIds,removedDepartments,keys) {
  for(var def of bdDefinitions()) {
    if(domains[def.name]===undefined&&body.mode==='merge')continue;
    if(!Array.isArray(domains[def.name])) throw rsError('restore-'+def.name+'-shape');
    var seen=new Set();
    for(var domain of domains[def.name]) {
      var d=bdScope(domain), global=def.name==='awards'&&d==='';
      if(typeof d!=='string'||(!global&&!finalDeptIds.has(d))||seen.has(d)||removedDepartments.includes(d)||(body.scope.kind==='dept'&&d!==body.scope.departmentId)||(global&&(body.scope.kind!=='full'||A.u.role!=='super'))) throw rsError('restore-'+def.name+'-scope',403);
      seen.add(d);
      if(!global) await cuRestorePermission(A,d,{scope:body.scope.kind,reason:body.reason});
      var addition=await def.plan(env,def.validate(domain,d),d,{base:(body.base[def.name]||{})[d],reason:body.reason,intent:'restore',finalKeys:keys});
      var restoredValues=bdRestoreReferences(plan,def,d,domain,addition);
      if(!global)bdRestoreCeiling(A,def,d,restoredValues);
      if(body.mode==='merge'&&Object.values(addition.snapshotRows).some(function(rows){return rows.length>0;})) throw rsError('restore-'+def.name+'-merge-target-not-empty',409);
      bdPlanAppend(plan,def,d,addition);
    }
  }
  for(var removed of removedDepartments) for(var def of bdDefinitions()) {
    var addition=await def.plan(env,def.empty(removed),removed,{base:(body.base[def.name]||{})[removed],reason:body.reason,intent:'dept-delete',finalKeys:keys});
    bdRestoreReferences(plan,def,removed,def.empty(removed),addition);
    bdPlanAppend(plan,def,removed,addition);
  }
}
async function bdRestoreRevisions(env,depts,full) {
  var out={seized:Object.create(null),awards:Object.create(null)};
  for(var d of depts) for(var def of bdDefinitions()) out[def.name][d]=await def.revs(env,d);
  if(full) out.awards['']=await awRevs(env,'');
  return out;
}
async function bdGlobalRevision(env) { var row=await env.DB.prepare("SELECT v FROM meta WHERE k='rev'").first(),value=row&&Number(row.v);if(!Number.isSafeInteger(value)||value<0)throw rsError('domain-revision',503);return value; }
async function bdExport(env,actor,url,name) {
  var def=bdDefinitions().find(function(d){return d.name===name;});
  if(!def) throw rsError('domain-export');
  var requested=url.searchParams.get('dept')||'', uid=actor.u.id;
  for(var attempt=0;attempt<3;attempt++) {
    var globals=[K_USERS,K_PERM,K_DEPTS,K_GDEPTS,K_PLAT], firstRev=await bdGlobalRevision(env),
      authority=(await env.DB.prepare('SELECT k,seq,v FROM kv WHERE k IN(SELECT value FROM json_each(?1)) ORDER BY k,seq').bind(JSON.stringify(globals)).all()).results||[],
      raw=kvJoin(authority), fresh=actorFromKeys(raw,uid);
    if(!fresh||(!requested&&fresh.u.role!=='super')) throw rsError('domain-export-permission',403);
    var chunks=Object.create(null); authority.forEach(function(row){if(typeof row.v!=='string'||row.seq!==(chunks[row.k]||0))throw rsError('domain-export-reference-chunks',503);chunks[row.k]=row.seq+1;});
    var departments=(fresh.depts||[]).map(function(d){return d.id;});
    if(departments.some(function(d){return typeof d!=='string'||!d||d.includes(':');})||new Set(departments).size!==departments.length)throw rsError('domain-export-departments');
    if(requested&&!departments.includes(requested)) throw rsError('domain-export-scope',403);
    var depts=requested?[requested]:departments.slice().sort(), domains=[], epoch=await rsEpoch(env);
    if(!requested&&name==='awards') depts.push('');
    for(var dept of depts) {
      var ctx=await def.context(env,fresh,dept,{write:true,global:dept===''}), k=dept===''?AW_RES[1]:def.key(dept,0);
      if(!canRead(ctx.A,k)||(!dept&&ctx.A.u.role!=='super')||(dept&&ctx.A.u.role!=='super'&&(ctx.A.enf?!enfHeld(ctx.A,dept,'backup.view'):!actsHeldOn(ctx.A,dept,'admin/backup',['view'])))) throw rsError('domain-export-permission',403);
      var readResources=(name==='seized'?def.resources.slice(0,5):def.resources).filter(function(_,i){return dept!==''||i>0;});
      if(readResources.some(function(resource){return !canRead(ctx.A,dept?'bsdept:'+dept+':'+resource:resource);}))throw rsError('domain-export-permission',403);
      domains.push(await def.exportDomain(ctx.env,dept));
      await ctx.env.DB.batch(ctx.guards.concat([rsEpochGuard(ctx.env.DB,epoch),bdRetiredGuard(ctx.env)]));
    }
    var base=await bdRestoreRevisions(env,depts.filter(Boolean),!requested);
    var orphan=Object.keys(def.tables).map(function(kind){return 'SELECT department_id d FROM '+def.tables[kind][0];}).join(' UNION '),allowed=departments.concat(name==='awards'?['']:[]);
    await env.DB.batch([env.DB.prepare("SELECT CASE WHEN EXISTS(SELECT 1 FROM ("+orphan+") o WHERE o.d IS NULL OR o.d NOT IN(SELECT value FROM json_each(?1)))THEN json_extract('{}','KIVO_BUSINESS_ORPHAN_SCOPE')END").bind(JSON.stringify(allowed))]);
    await env.DB.batch(rsWitness(env,'kv',['k','seq','v'],authority,'k IN(SELECT value FROM json_each(?1))',[JSON.stringify(globals)]));
    if(firstRev!==await bdGlobalRevision(env)||epoch!==await rsEpoch(env)) continue;
    return {ok:1,domains:domains,globalRev:firstRev,epoch:epoch,departments:depts,base:base};
  }
  throw rsError('domain-export-conflict',409);
}

async function bdCount(env,definition,dept) {
  var sql=Object.keys(definition.tables).map(function(kind){return '(SELECT COUNT(*) FROM '+definition.tables[kind][0]+' WHERE department_id=?1)';}).join('+');
  var row=await env.DB.prepare('SELECT '+sql+' n').bind(dept).first();return Number(row.n);
}
async function bdWipePlans(env,A,body,plan,departments,opt,finalDepartments) {
  for(var d of departments)for(var def of bdDefinitions()) {
    var base=opt['__'+def.name+'Base'];
    if(!base){base={};def.names.forEach(function(name,i){base[name]=(body.base||{})[def.key(d,i)];});}
    var addition=await def.plan(env,def.empty(d),d,{base:base,reason:body.reason||'',intent:opt.__wipeKind==='delete'||!finalDepartments.some(function(row){return row.id===d;})?'dept-delete':'dept-wipe'});
    bdPlanAppend(plan,def,d,addition);
  }
}
async function bdEmployeeCleanupPlan(env,A,body,plan,reference,opt,wiped) {
  for(var pd of plan.kv.pend) {
    if(resName(pd.k)!=='bassam_employees_v1'||!parseKey(pd.k).dept)continue;
    var d=parseKey(pd.k).dept;if(wiped.includes(d))continue;
    if(opt.__serverEmployeeIntent&&opt.__serverEmployeeIntent.kind==='import-replace'&&!capOnDept(A,d,'award'))continue;
    var oldEmployees=parseJson(pd.cur,[]),newEmployees=pd.act==='del'?[]:parseJson(pd.v,[]),before=new Set(oldEmployees.map(empStableKey)),after=new Set(newEmployees.map(empStableKey));
    if(!Array.from(before).some(function(key){return !after.has(key);})&&!(opt.__serverEmployeeIntent&&/wipe|replace/.test(opt.__serverEmployeeIntent.kind)))continue;
    var def=bdDefinitions()[1],base=opt.__awardsBase||{};
    if(!opt.__awardsBase)AW_NAMES.forEach(function(name,i){base[name]=reference.inputRevs[awKey(d,i)]||0;});
    var addition=await awPlanEmployeeCleanup(env,A,d,{oldEmployees:oldEmployees,newEmployees:newEmployees,base:base,reason:body.reason||((body.why||{})[pd.k])||'',all:!!(opt.__serverEmployeeIntent&&/wipe|replace/.test(opt.__serverEmployeeIntent.kind)),finalKeys:body.set||{}});
    bdPlanAppend(plan,def,d,addition);
  }
}

function bdErrorResponse(error) {
  if(error.szCode)return json({ok:0,err:error.szCode,at:error.szPath,denied:error.szDecision},error.szStatus||400);
  if(error.awCode)return json({ok:0,err:error.awCode,at:error.awPath,denied:error.awDecision},error.awStatus||400);
  if(error.rs)return json({ok:0,err:error.rs},error.status);
  if(/KIVO_(?:RESTORE_EPOCH|RESTORE_TARGET|REV_CONFLICT|SEIZED_TARGET|AWARD_TARGET)|UNIQUE constraint/.test(String(error)))return json({ok:0,err:'conflict'},409);
  if(/KIVO_BUSINESS_LEGACY_SOURCE|KIVO_SEIZED_LEGACY_SOURCE|KIVO_AWARD_LEGACY_SOURCE/.test(String(error)))return json({ok:0,err:'business-legacy-source-present'},503);
  return irErrorResponse(error);
}
async function bdRoute(env,request,url,ss,name) {
  try {
    var prefix=name==='seized'?'/api/seized':'/api/award';
    if(!((url.pathname===prefix||url.pathname===prefix+'/export')&&request.method==='GET')&&!(url.pathname===prefix+'/act'&&request.method==='POST'))return json({ok:0,err:'method'},405);
    var mismatch=sessUidMismatch(env,url,ss,prefix);if(mismatch)return mismatch;
    var A=await actorOf(env,ss.uid);if(!A)return json({ok:0,err:'session'},401);
    if(url.pathname===prefix+'/export')return json(await bdExport(env,A,url,name==='seized'?'seized':'awards'));
    if(request.method==='GET')return json(await(name==='seized'?hSeizedGet(env,A,url):hAwardGet(env,A,url)));
    var read=await bodyRead(request,prefix+'/act');if(read.res)return read.res;
    if(read.v.uid!==undefined&&read.v.uid!==A.u.id)throw rsError('session-changed',409);
    var limit=await rlHit(env,'sv',A.u.id,RL_SAVE);if(limit)return tooMany(limit);
    return json(await(name==='seized'?hSeizedAct(env,A,read.v,reqMeta(request)):hAwardAct(env,A,read.v,reqMeta(request))));
  } catch(error) {return bdErrorResponse(error);}
}
