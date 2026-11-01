/* Operational backup boundary: versioned typed rows, the existing policy
   compiler and the existing atomic restore executor. No second restore path. */
function opBackupDomain(prepared, domain) {
  return { version:1, scope:{departmentId:domain.departmentId}, resource:domain.resource, rows:ocPhysicalRows(prepared,domain) };
}
function opBackupDecode(domain) {
  rsShape(domain,['version','scope','resource','rows']); rsShape(domain.scope,['departmentId']);
  if(domain.version!==1||typeof domain.resource!=='string'||!opRegistry()[domain.resource])throw rsError('restore-operations-domain');
  var d=domain.scope.departmentId, k='bsdept:'+d+':'+domain.resource, info=opInfo(k);
  return {key:k,domain:ocFromPhysical(info.prepared,d,info.resource,domain.rows),info:info};
}
function opValidateBackupDomains(domains,departments) {
  if(!Array.isArray(domains))throw rsError('restore-incomplete-operations');
  var expected=new Set(),seen=new Set(),decodedDomains=[];
  departments.forEach(function(d){opDefinitions().forEach(function(def){expected.add('bsdept:'+d+':'+def.resource);});});
  domains.forEach(function(item){
    var decoded=opBackupDecode(item),key=decoded.key;
    if(!expected.has(key)||seen.has(key))throw rsError('restore-operations-scope');seen.add(key);
    decodedDomains.push(decoded);
  });
  if(seen.size!==expected.size)throw rsError('restore-incomplete-operations');
  return decodedDomains;
}
function opRestoreDocuments(body,reference,A) {
  var keys={},physicalDeletes=[];
  opValidateBackupDomains(body.domains.operations,body.manifest.departments).forEach(function(decoded){
    var key=decoded.key;
    var projection=ocInflate(decoded.info.prepared,decoded.domain),raw=projection.present?JSON.stringify(projection.value):null;
    if(rsNat(body.base.kv[key])!==(reference.inputRevs[key]||0))throw rsError('conflict',409);
    if(raw===reference.inputKeys[key])return;
    if(!canRead(A,key))throw rsError('restore-operations-resource-denied',403);
    if(raw===null){
      var empty=ENT[decoded.info.resource]&&ENT[decoded.info.resource].empty;
      if(typeof empty!=='string')throw rsError('restore-operations-empty');
      keys[key]=empty;physicalDeletes.push(key);
    }else keys[key]=raw;
  });
  return {keys:keys,physicalDeletes:body.mode==='replace'?physicalDeletes:[]};
}
function opConvertBackupBoundary(keys,domains,departments,scope,source,version,summary) {
  var oldKeys=Object.keys(keys).filter(opIsResource);
  oldKeys.forEach(function(k){var info=opInfo(k);if(!departments.includes(info.dept))throw rsError('backup-unknown-department');});
  if(version>=4) {
    if(oldKeys.length)throw rsError('backup-retired-key-in-modern-file');
    var sourceDepartments=scope.kind==='dept'?[source]:departments;
    domains.operations=opValidateBackupDomains(domains.operations,sourceDepartments).map(function(decoded){
      var target=scope.kind==='dept'?scope.departmentId:decoded.info.dept, projection=ocInflate(decoded.info.prepared,decoded.domain);
      return opBackupDomain(decoded.info.prepared,ocConvert(decoded.info.prepared,target,decoded.info.resource,projection.value,projection.present));
    });
  } else {
    if(domains.operations!==undefined)throw rsError('backup-operations-manifest-version');
    domains.operations=[];
    departments.forEach(function(d){opDefinitions().forEach(function(def){
      var k='bsdept:'+d+':'+def.resource,prepared=opPrepared(def.resource),present=ocOwn(keys,k),value;
      if(present){opInfo(k);value=rsBCParse(keys[k]);}else summary.emptyDomains.push('operations:'+k);
      domains.operations.push(opBackupDomain(prepared,ocConvert(prepared,d,def.resource,value,present)));
    });});
  }
  oldKeys.forEach(function(k){delete keys[k];});
}
async function opExport(env,request,url,session) {
  var mismatch=sessUidMismatch(env,url,session,'/api/operations/export');if(mismatch)return mismatch;
  if(request.method!=='GET')return json({ok:0,err:'method'},405);
  try {
    for(var attempt=0;attempt<3;attempt++){
      var firstRev=await bdGlobalRevision(env),reference=await rsReferenceSnapshot(env,session.uid),A=reference.A,
        requested=url.searchParams.get('dept')||'',departments=(A.depts||[]).map(function(d){return d.id;}),domains=[];
      if(!requested&&A.u.role!=='super')throw rsError('operations-export-permission',403);
      if(requested&&!departments.includes(requested))throw rsError('operations-export-scope',403);
      if(requested)departments=[requested];
      var refs=await enfRefsFor(reference.env,departments,reference.inputKeys);
      for(var d of departments){
        if(!bkExportOk(A,d))throw rsError('operations-export-permission',403);   // IP39 (019u): backup.view alone does not export
        for(var def of opDefinitions()){
          var k='bsdept:'+d+':'+def.resource,raw=reference.inputKeys[k];
          if(!canRead(A,k))throw rsError('operations-export-permission',403);
          if(A.enf&&raw!=null)raw=enfProjectStr(A,k,raw,refs);
          raw=privOut(A,k,raw);   // PRIVACY batch (019u): exports follow the read rule
          var prepared=opPrepared(def.resource),domain=ocConvert(prepared,d,def.resource,raw==null?undefined:JSON.parse(raw),raw!=null);
          domains.push(opBackupDomain(prepared,domain));
        }
      }
      await reference.env.DB.batch(rsReferenceGuards(reference.env,reference));
      var lastRev=await bdGlobalRevision(reference.env);if(firstRev!==lastRev)continue;
      return json({ok:1,version:1,globalRev:lastRev,epoch:Number(reference.inputMeta.restore_epoch||0),domains:domains});
    }
    throw rsError('operations-export-conflict',409);
  }catch(error){
    if(error.rs||error.ocCode)return json({ok:0,err:error.rs||error.ocCode},error.status||400);
    var guard=dbGuardFailure(error);if(guard)return json({ok:0,err:guard.err},guard.status);
    if(/KIVO_RESTORE_TARGET|KIVO_REV_CONFLICT/.test(String(error)))return json({ok:0,err:'conflict'},409);
    throw error;
  }
}
