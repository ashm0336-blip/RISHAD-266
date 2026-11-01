/* Award nominations and references. Pure lossless codec and plans; the shared
   transaction/authority capture remains canonical. No device or R2 storage. */
var AW_RES = ['bassam_award_v1', 'bassam_award_docs_v1', 'bassam_award_docs_v2'];
var AW_NAMES = ['records', 'docsV1', 'docsV2'];
var AW_FIELDS = [
  ['id','business_id','text'], ['ekey','employee_key','text'], ['cat','category','text'], ['hij','hijri_date','text'],
  ['score','score','number'], ['cases','case_count','number'], ['fileOk','file_ok','boolean'], ['ok','eligible','boolean'],
  ['st','status','text'], ['comp','employee_number','text'], ['city','city','text'], ['field','work_field','text'],
  ['phone','phone','text'], ['email','email','text'], ['declName','declarer_name','text'], ['by','approver_name','text'],
  ['byTitle','approver_title','text'], ['wdesc','work_description','text'], ['wevid','work_evidence','text'],
  ['pic','picture','text'], ['sigEmp','employee_signature','text'], ['sigBy','approver_signature','text'], ['byUser','author_name','text'],
  ['name','legacy_name','text'], ['test','test_marker','text'], ['eid','legacy_employee_key','text'],
  ['status','legacy_status','text'], ['emp','legacy_employee_name','text'], ['award','legacy_award','text'],
  ['stWhy','status_reason','text'], ['why','legacy_reason','text'], ['reason','reason','text']
];
var AW_ARRAYS = ['caseTxt','ans','scores'];
var AW_REQUEST_COLS = ['department_id','account_uid','request_id','fingerprint','resource_key','resource_rev','operation','result_n','result_id','permission_mode','permission_count','created_at'];
var AW_CHECK_COLS = ['department_id','account_uid','request_id','position','check_kind','permission_key'];
var AW_TABLES = {
  resources: ['award_resources',['department_id','resource','root_kind','list_kind']],
  records: ['award_records',['department_id','record_id','sequence'].concat(AW_FIELDS.map(function(f){return f[1];}),['presence_mask','case_text_kind','answers_kind','scores_kind'])],
  caseTexts: ['award_case_texts',['department_id','record_id','position','value']],
  answers: ['award_answers',['department_id','record_id','position','value']],
  scoreRows: ['award_score_rows',['department_id','record_id','row_number']],
  scores: ['award_scores',['department_id','record_id','row_number','column_number','value']],
  documents: ['award_documents',['department_id','version','group_key','title','lead','foot','presence_mask','sections_kind']],
  sections: ['award_doc_sections',['department_id','version','group_key','position','title','header','body','presence_mask','items_kind']],
  items: ['award_doc_items',['department_id','version','group_key','section_position','position','kind','text','presence_mask']]
};
function awError(code,status){var e=new Error('award-'+code);e.awCode='award-'+code;e.awStatus=status||400;return e;}
function awOwn(o,k){return Object.prototype.hasOwnProperty.call(o,k);}
function awShape(o,keys){if(!isObj(o)||Object.keys(o).some(function(k){return keys.indexOf(k)<0;}))throw awError('shape');}
function awNatural(v){if(!Number.isSafeInteger(v)||v<0)throw awError('revision',503);return v;}
function awScope(d){if(typeof d!=='string'||d.length>200||d.indexOf(':')>=0)throw awError('scope');return d;}
function awKey(d,i){return d?'bsdept:'+d+':'+AW_RES[i||0]:AW_RES[i||0];}
var AW_DEFINITION={resources:AW_RES,resourceNames:AW_NAMES,global:true,error:awError,resourceKeys:function(d){return AW_RES.map(function(_,i){return awKey(d,i);});}};
async function awQueryContext(env,A,d,options){return bdQueryContext(env,A,awScope(d),AW_DEFINITION,Object.assign({},options||{},{global:d===''}));}
function awLegacyKey(k){return AW_RES.indexOf(resName(k))>=0;}
function awLegacyPredicate(){return 'k IN(SELECT value FROM json_each(?1))'+AW_RES.map(function(n){return " OR k GLOB 'bsdept:*:"+n+"' OR k GLOB 'bsdept:*:"+n+":*' OR k GLOB '"+n+":*'";}).join('');}
async function awLegacyPresent(env){return !!(await env.DB.prepare('SELECT 1 FROM kv WHERE '+awLegacyPredicate()+' LIMIT 1').bind(JSON.stringify(AW_RES)).first());}
function awRetiredGuard(env){return env.DB.prepare("SELECT CASE WHEN EXISTS(SELECT 1 FROM kv WHERE "+awLegacyPredicate()+") THEN json_extract('{}','KIVO_AWARD_LEGACY_SOURCE')END").bind(JSON.stringify(AW_RES));}
async function awGuardRetired(env){if(await awLegacyPresent(env))throw awError('legacy-source-present',503);}
function awScalar(v,type){if(v===null)return null;if(type==='text'&&typeof v!=='string'||type==='number'&&(typeof v!=='number'||!Number.isFinite(v))||type==='boolean'&&typeof v!=='boolean')throw awError('value-type');return type==='boolean'?(v?1:0):v;}
function awHas(mask,bit){return Math.floor(mask/Math.pow(2,bit))%2===1;}
function awPack(fields,object,row){var mask=0;fields.forEach(function(f,i){row[f[1]]=null;if(awOwn(object,f[0])){mask+=Math.pow(2,i);row[f[1]]=awScalar(object[f[0]],f[2]);}});return mask;}
function awUnpack(fields,row){var value={};fields.forEach(function(f,i){if(awHas(row.presence_mask,i))value[f[0]]=row[f[1]]===null?null:f[2]==='boolean'?row[f[1]]===1:row[f[1]];});return value;}
function awListKind(o,k){return !awOwn(o,k)?0:o[k]===null?1:Array.isArray(o[k])?2:(function(){throw awError('array-shape');})();}
function awRecordKey(rec){
  if(typeof rec.id==='string'&&rec.id)return 'id:'+encodeURIComponent(rec.id);
  if(awOwn(rec,'id'))throw awError('record-identity');
  var e=typeof rec.ekey==='string'?rec.ekey:'',n=typeof rec.name==='string'?rec.name:'';
  if(!e&&!n)throw awError('record-identity');return 'legacy:'+encodeURIComponent(e)+':'+encodeURIComponent(n);
}
function awEmptyDomain(d){awScope(d);var rows={};Object.keys(AW_TABLES).forEach(function(k){rows[k]=[];});return {version:1,scope:d?{departmentId:d}:{kind:'global'},resources:{records:false,docsV1:false,docsV2:false},rows:rows};}
function awConvert(d,docs){
  awScope(d);awShape(docs,AW_NAMES);var domain=awEmptyDomain(d),out=domain.rows;
  AW_NAMES.forEach(function(resource,index){
    if(!awOwn(docs,resource))return;
    if(!d&&resource==='records')throw awError('global-records');
    var value=docs[resource],root={department_id:d,resource:resource,root_kind:value===null?1:2,list_kind:0};
    if(value!==null)awShape(value,index===0?['recs']:['A','B','C']);
    domain.resources[resource]=true;
    if(index===0&&value!==null){
      root.list_kind=awListKind(value,'recs');
      if(root.list_kind===2){var ids=new Set();value.recs.forEach(function(rec,position){
        awShape(rec,AW_FIELDS.map(function(f){return f[0];}).concat(AW_ARRAYS));
        var recordKey=awRecordKey(rec);if(ids.has(recordKey))throw awError('record-identity');ids.add(recordKey);
        var row={department_id:d,record_id:recordKey,sequence:value.recs.length-1-position},mask=awPack(AW_FIELDS,rec,row);
        row.presence_mask=mask;row.case_text_kind=awListKind(rec,'caseTxt');row.answers_kind=awListKind(rec,'ans');row.scores_kind=awListKind(rec,'scores');out.records.push(row);
        if(row.case_text_kind===2)rec.caseTxt.forEach(function(v,i){out.caseTexts.push({department_id:d,record_id:recordKey,position:i,value:awScalar(v,'text')});});
        if(row.answers_kind===2)rec.ans.forEach(function(v,i){out.answers.push({department_id:d,record_id:recordKey,position:i,value:awScalar(v,'boolean')});});
        if(row.scores_kind===2)rec.scores.forEach(function(values,i){
          if(!Array.isArray(values))throw awError('scores-row');out.scoreRows.push({department_id:d,record_id:recordKey,row_number:i});
          values.forEach(function(v,j){out.scores.push({department_id:d,record_id:recordKey,row_number:i,column_number:j,value:awScalar(v,'number')});});
        });
      });}
    }else if(index>0&&value!==null){
      ['A','B','C'].forEach(function(group){if(!awOwn(value,group))return;var doc=value[group];awShape(doc,['title','lead','foot','secs']);
        var row={department_id:d,version:index,group_key:group,presence_mask:0,sections_kind:awListKind(doc,'secs')};
        ['title','lead','foot'].forEach(function(k,i){row[k]=null;if(awOwn(doc,k)){row.presence_mask+=Math.pow(2,i);row[k]=awScalar(doc[k],'text');}});out.documents.push(row);
        if(row.sections_kind===2)doc.secs.forEach(function(section,i){
          awShape(section,['title','h','body','items']);var sec={department_id:d,version:index,group_key:group,position:i,presence_mask:0,items_kind:awListKind(section,'items')};
          [['title','title'],['h','header'],['body','body']].forEach(function(pair,j){sec[pair[1]]=null;if(awOwn(section,pair[0])){sec.presence_mask+=Math.pow(2,j);sec[pair[1]]=awScalar(section[pair[0]],'text');}});out.sections.push(sec);
          if(sec.items_kind===2)section.items.forEach(function(item,j){awShape(item,['k','t']);var child={department_id:d,version:index,group_key:group,section_position:i,position:j,kind:null,text:null,presence_mask:0};
            if(awOwn(item,'k')){child.presence_mask+=1;child.kind=awScalar(item.k,'text');}if(awOwn(item,'t')){child.presence_mask+=2;child.text=awScalar(item.t,'text');}out.items.push(child);
          });
        });
      });
    }
    out.resources.push(root);
  });return domain;
}
function awInflate(domain){
  var rows=domain.rows,out={};rows.resources.forEach(function(root){var resource=root.resource;
    if(root.root_kind===1){out[resource]=null;return;}
    if(resource==='records'){
      var object={};if(root.list_kind===1)object.recs=null;
      if(root.list_kind===2)object.recs=rows.records.slice().sort(function(a,b){return b.sequence-a.sequence;}).map(function(row){
        var rec=awUnpack(AW_FIELDS,row),id=row.record_id;
        if(row.case_text_kind===1)rec.caseTxt=null;else if(row.case_text_kind===2)rec.caseTxt=rows.caseTexts.filter(function(v){return v.record_id===id;}).sort(function(a,b){return a.position-b.position;}).map(function(v){return v.value;});
        if(row.answers_kind===1)rec.ans=null;else if(row.answers_kind===2)rec.ans=rows.answers.filter(function(v){return v.record_id===id;}).sort(function(a,b){return a.position-b.position;}).map(function(v){return v.value===null?null:v.value===1;});
        if(row.scores_kind===1)rec.scores=null;else if(row.scores_kind===2)rec.scores=rows.scoreRows.filter(function(v){return v.record_id===id;}).sort(function(a,b){return a.row_number-b.row_number;}).map(function(r){return rows.scores.filter(function(v){return v.record_id===id&&v.row_number===r.row_number;}).sort(function(a,b){return a.column_number-b.column_number;}).map(function(v){return v.value;});});
        return rec;
      });out[resource]=object;
    }else{
      var version=AW_NAMES.indexOf(resource),doc={};rows.documents.filter(function(r){return r.version===version;}).forEach(function(row){
        var group={},g=row.group_key;['title','lead','foot'].forEach(function(k,i){if(awHas(row.presence_mask,i))group[k]=row[k];});
        if(row.sections_kind===1)group.secs=null;else if(row.sections_kind===2)group.secs=rows.sections.filter(function(s){return s.version===version&&s.group_key===g;}).sort(function(a,b){return a.position-b.position;}).map(function(s){
          var section={};[['title','title'],['h','header'],['body','body']].forEach(function(pair,i){if(awHas(s.presence_mask,i))section[pair[0]]=s[pair[1]];});
          if(s.items_kind===1)section.items=null;else if(s.items_kind===2)section.items=rows.items.filter(function(i){return i.version===version&&i.group_key===g&&i.section_position===s.position;}).sort(function(a,b){return a.position-b.position;}).map(function(i){var item={};if(i.presence_mask&1)item.k=i.kind;if(i.presence_mask&2)item.t=i.text;return item;});return section;
        });doc[g]=group;
      });out[resource]=doc;
    }
  });return out;
}
function awSorted(rows){return rows.map(function(r){return cuCanonical(r);}).sort(function(a,b){var x=JSON.stringify(a),y=JSON.stringify(b);return x<y?-1:x>y?1:0;});}
function awSameDomain(a,b){return deq(cuCanonical(a.scope),cuCanonical(b.scope))&&deq(cuCanonical(a.resources),cuCanonical(b.resources))&&Object.keys(AW_TABLES).every(function(k){return deq(awSorted(a.rows[k]),awSorted(b.rows[k]));});}
function awValidateDomain(domain,d){
  awScope(d);awShape(domain,['version','scope','resources','rows']);if(domain.version!==1)throw awError('domain-version');
  if(d){awShape(domain.scope,['departmentId']);if(domain.scope.departmentId!==d)throw awError('domain-scope');}
  else{awShape(domain.scope,['kind']);if(domain.scope.kind!=='global')throw awError('domain-scope');}
  awShape(domain.resources,AW_NAMES);awShape(domain.rows,Object.keys(AW_TABLES));
  Object.keys(AW_TABLES).forEach(function(kind){var cols=AW_TABLES[kind][1];if(!Array.isArray(domain.rows[kind]))throw awError('domain-rows');domain.rows[kind].forEach(function(row){awShape(row,cols);if(row.department_id!==d||cols.some(function(k){return !awOwn(row,k);}))throw awError('domain-row');});});
  var sequence=new Map(),seen=new Set();domain.rows.records.forEach(function(row){if(!Number.isSafeInteger(row.sequence)||row.sequence<0||seen.has(row.sequence)||sequence.has(row.record_id))throw awError('record-sequence');seen.add(row.sequence);sequence.set(row.record_id,row.sequence);});
  var canonical=awConvert(d,awInflate(domain));canonical.rows.records.forEach(function(row){row.sequence=sequence.get(row.record_id);});
  if(!deq(cuCanonical(canonical.resources),cuCanonical(domain.resources)))throw awError('domain-presence');
  Object.keys(AW_TABLES).forEach(function(kind){if(!deq(awSorted(canonical.rows[kind]),awSorted(domain.rows[kind])))throw awError('domain-noncanonical');});return domain;
}
function awInstallStatements(env,domain){var out=[];Object.keys(AW_TABLES).forEach(function(k){out.push.apply(out,rsBulk(env,AW_TABLES[k][0],AW_TABLES[k][1],domain.rows[k]));});return out;}
async function awDomainState(env,d){
  awScope(d);var kinds=Object.keys(AW_TABLES),statements=kinds.map(function(k){return env.DB.prepare('SELECT * FROM '+AW_TABLES[k][0]+' WHERE department_id=?1').bind(d);});
  statements.push(env.DB.prepare('SELECT * FROM award_requests WHERE department_id=?1').bind(d));statements.push(env.DB.prepare('SELECT * FROM award_request_checks WHERE department_id=?1').bind(d));statements.push(env.DB.prepare('SELECT k,rev FROM revs WHERE k IN(SELECT value FROM json_each(?1))').bind(JSON.stringify(AW_RES.map(function(_,i){return awKey(d,i);}))));
  var out=await env.DB.batch(statements),domain=awEmptyDomain(d),snapshots={};kinds.forEach(function(k,i){domain.rows[k]=out[i].results||[];snapshots[k]=domain.rows[k];});
  domain.rows.resources.forEach(function(row){if(AW_NAMES.indexOf(row.resource)<0)throw awError('resource');domain.resources[row.resource]=true;});
  awValidateDomain(domain,d);snapshots.requests=out[kinds.length].results||[];snapshots.requestChecks=out[kinds.length+1].results||[];var revs={};AW_NAMES.forEach(function(n,i){var row=(out[kinds.length+2].results||[]).find(function(r){return r.k===awKey(d,i);});revs[n]=awNatural(row?row.rev:0);});
  return {domain:domain,snapshotRows:snapshots,revs:revs};
}
async function awCurrentDomain(env,d){return (await awDomainState(env,d)).domain;}
async function awExportDomain(env,d){await awGuardRetired(env);return awCurrentDomain(env,d);}
async function awRevs(env,d){var rows=await env.DB.prepare('SELECT k,rev FROM revs WHERE k IN(SELECT value FROM json_each(?1))').bind(JSON.stringify(AW_RES.map(function(_,i){return awKey(d,i);}))).all();var out={};AW_NAMES.forEach(function(n,i){var row=(rows.results||[]).find(function(r){return r.k===awKey(d,i);});out[n]=awNatural(row?row.rev:0);});return out;}
function awPhysicalTables(){var out={};Object.keys(AW_TABLES).forEach(function(k){out[k]=AW_TABLES[k];});out.requests=['award_requests',AW_REQUEST_COLS];out.requestChecks=['award_request_checks',AW_CHECK_COLS];return out;}
/* One exact raw-row/revision/source witness for the domain. In particular an
   unchanged empty restore adds no DELETEs and only one guard, not11 guards. */
function awStateGuard(env,d,snapshot,base){
  var args=[d],checks=[],tables=awPhysicalTables();
  // D1 caps expression depth at100; balance the same predicates instead of
  // growing a left-deep chain across every table and every record column.
  function booleanSql(parts,operator){var middle=Math.floor(parts.length/2);return parts.length===1?parts[0]:'('+booleanSql(parts.slice(0,middle),operator)+' '+operator+' '+booleanSql(parts.slice(middle),operator)+')';}
  Object.keys(tables).forEach(function(kind){var table=tables[kind][0],cols=tables[kind][1],rows=snapshot[kind]||[],slot='?'+(args.push(JSON.stringify(rows)));
    checks.push('(SELECT COUNT(*) FROM '+table+' WHERE department_id=?1)<>json_array_length('+slot+')');
    if(rows.length)checks.push('EXISTS(SELECT 1 FROM '+table+' t WHERE t.department_id=?1 AND NOT EXISTS(SELECT 1 FROM json_each('+slot+') e WHERE '+booleanSql(cols.map(function(c){return 't."'+c+'" IS json_extract(e.value,\'$."'+c+'"\')';}),'AND')+'))');
  });
  if(base){AW_NAMES.forEach(function(n){awNatural(base[n]);});var revSlot='?'+args.push(JSON.stringify(AW_NAMES.map(function(n,i){return {k:awKey(d,i),rev:base[n]};})));
    checks.push("EXISTS(SELECT 1 FROM json_each("+revSlot+") e WHERE COALESCE((SELECT rev FROM revs WHERE k=json_extract(e.value,'$.k')),0) IS NOT json_extract(e.value,'$.rev'))");}
  var retiredSlot='?'+args.push(JSON.stringify(AW_RES));checks.push('EXISTS(SELECT 1 FROM kv WHERE '+awLegacyPredicate().replace(/\?1/g,retiredSlot)+')');
  return rsBound(env.DB.prepare("SELECT CASE WHEN "+booleanSql(checks,'OR')+" THEN json_extract('{}','KIVO_AWARD_TARGET_CHANGED')END"),args);
}
async function awDomainPlan(env,domain,d,opt){
  opt=opt||{};awValidateDomain(domain,d);await awGuardRetired(env);var state=await awDomainState(env,d),base=opt.base||state.revs;
  AW_NAMES.forEach(function(n){if(awNatural(base[n])!==state.revs[n])throw awError('conflict',409);});
  var same=awSameDomain(state.domain,domain),changed=!same||state.snapshotRows.requests.length>0||state.snapshotRows.requestChecks.length>0;
  if(!d&&changed)throw awError('global-references-readonly',403);
  if(opt.intent==='employee-delete'||opt.intent==='employee-wipe'){
    Object.keys(AW_TABLES).filter(function(k){return ['records','caseTexts','answers','scoreRows','scores'].indexOf(k)<0;}).forEach(function(k){if(!deq(awSorted(state.domain.rows[k]),awSorted(domain.rows[k])))throw awError('employee-cleanup-documents');});
    var kept=new Set(domain.rows.records.map(function(row){return row.record_id;})),removed=state.domain.rows.records.filter(function(row){return !kept.has(row.record_id);}).map(function(row){return row.record_id;});
    ['records','caseTexts','answers','scoreRows','scores'].forEach(function(k){if(!deq(awSorted(state.domain.rows[k].filter(function(row){return kept.has(row.record_id);})),awSorted(domain.rows[k])))throw awError('employee-cleanup-changed-survivor');});
    var cleanup=[];if(removed.length){
      cleanup.push(env.DB.prepare('DELETE FROM award_records WHERE department_id=?1 AND record_id IN(SELECT value FROM json_each(?2))').bind(d,JSON.stringify(removed)));
      cleanup.push(env.DB.prepare('DELETE FROM award_requests WHERE department_id=?1 AND resource_key=?2').bind(d,awKey(d)));
    }
    return {guards:[awStateGuard(env,d,state.snapshotRows,base)],statements:cleanup,revisionKeys:removed.length?[awKey(d)]:[],snapshotRows:state.snapshotRows,count:removed.length,changed:removed.length>0};
  }
  var st=[];if(changed){
    if(same)st.push(env.DB.prepare('DELETE FROM award_requests WHERE department_id=?1').bind(d));
    else{
      ['award_request_checks','award_requests','award_case_texts','award_answers','award_scores','award_score_rows','award_records','award_doc_items','award_doc_sections','award_documents','award_resources'].forEach(function(t){st.push(env.DB.prepare('DELETE FROM '+t+' WHERE department_id=?1').bind(d));});
      st.push.apply(st,awInstallStatements(env,domain));
    }
  }
  return {guards:[awStateGuard(env,d,state.snapshotRows,base)],statements:st,revisionKeys:changed?AW_RES.map(function(_,i){return awKey(d,i);}):[],snapshotRows:state.snapshotRows,count:domain.rows.records.length+domain.rows.documents.length+domain.rows.sections.length,changed:changed};
}
async function awLegacyPrepare(env){
  var predicate=awLegacyPredicate(),names=Object.keys(awPhysicalTables()).map(function(k){return awPhysicalTables()[k][0];}),args=[JSON.stringify(AW_RES)],
    rows=(await env.DB.prepare('SELECT k,seq,v FROM kv WHERE '+predicate+' ORDER BY k,seq').bind(args[0]).all()).results||[],
    deptRows=(await env.DB.prepare('SELECT k,seq,v FROM kv WHERE k=?1 ORDER BY seq').bind(K_DEPTS).all()).results||[],known=new Set(),departments;
  deptRows.forEach(function(row,i){if(row.seq!==i||typeof row.v!=='string')throw awError('cutover-departments');});
  try{departments=JSON.parse(deptRows.map(function(row){return row.v;}).join('')||'[]');}catch(e){throw awError('cutover-departments');}
  if(!Array.isArray(departments))throw awError('cutover-departments');departments.forEach(function(d){if(!isObj(d)||typeof d.id!=='string'||!d.id||d.id.indexOf(':')>=0||known.has(d.id))throw awError('cutover-departments');known.add(d.id);});
  var chunks=new Map(),docs=new Map();rows.forEach(function(row){var p=parseKey(row.k),index=AW_RES.indexOf(resName(row.k)),d=p.dept||'';
    if(index<0||row.k!==awKey(d,index)||(!d&&index===0))throw awError('cutover-scope-unknown');
    if(d&&!known.has(d))throw awError('cutover-orphan-scope');var list=chunks.get(row.k)||[];
    if(row.seq!==list.length||typeof row.v!=='string')throw awError('cutover-chunks');list.push(row.v);chunks.set(row.k,list);
  });
  chunks.forEach(function(list,key){var value;try{value=JSON.parse(list.join(''));}catch(e){throw awError('cutover-json');}var d=parseKey(key).dept||'',object=docs.get(d)||{};object[AW_NAMES[AW_RES.indexOf(resName(key))]]=value;docs.set(d,object);});
  var domains=[];docs.forEach(function(value,d){domains.push(awConvert(d,value));});
  var existing=(await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN(SELECT value FROM json_each(?1))").bind(JSON.stringify(names)).all()).results||[];
  for(var table of existing)if(await env.DB.prepare('SELECT 1 FROM '+table.name+' LIMIT 1').first())throw awError('cutover-target-not-empty');
  var before=rsWitness(env,'kv',['k','seq','v'],rows,predicate,args).concat(rsWitness(env,'kv',['k','seq','v'],deptRows,'k=?1',[K_DEPTS]));
  before.push(env.DB.prepare("INSERT INTO meta(k,v)VALUES('aw_cutover_ready','validated')ON CONFLICT(k)DO UPDATE SET v=excluded.v"));
  var after=[env.DB.prepare("SELECT CASE WHEN "+names.map(function(n){return 'EXISTS(SELECT 1 FROM '+n+')';}).join(' OR ')+" THEN json_extract('{}','KIVO_AWARD_TARGET_CHANGED')END")];
  domains.forEach(function(domain){after.push.apply(after,awInstallStatements(env,domain));});after.push(env.DB.prepare('DELETE FROM kv WHERE '+predicate).bind(args[0]),env.DB.prepare("DELETE FROM meta WHERE k='aw_cutover_ready'"));
  if(rows.length)after.push(env.DB.prepare("INSERT INTO meta(k,v)VALUES('rev',CAST((SELECT MAX(n)+1 FROM(SELECT COALESCE(MAX(rev),0)n FROM revs UNION ALL SELECT COALESCE(CAST(v AS INTEGER),0)FROM meta WHERE k='rev'))AS TEXT))ON CONFLICT(k)DO UPDATE SET v=excluded.v"));
  return {before:before,after:after,domains:domains,n:domains.reduce(function(n,d){return n+d.rows.records.length+d.rows.documents.length;},0)};
}
async function awPlanEmployeeCleanup(env,A,d,opt){
  opt=opt||{};if(!d||!Array.isArray(opt.oldEmployees)||!Array.isArray(opt.newEmployees))throw awError('employee-cleanup-shape');
  var state=await awDomainState(env,d),oldDoc=awInflate(state.domain),records=oldDoc.records&&oldDoc.records.recs;
  var removed=new Set(cuRemovedHolderKeys(opt.oldEmployees,opt.newEmployees)),liveNames=new Set(opt.newEmployees.map(function(e){return typeof e==='string'?e:e&&e.name;})),removedNames=new Set();
  opt.oldEmployees.forEach(function(e){var name=typeof e==='string'?e:e&&e.name;if(name&&!liveNames.has(name))removedNames.add(name);});
  if(Array.isArray(records)){
    oldDoc.records.recs=records.filter(function(rec){return !opt.all&&!((rec.ekey&&removed.has(String(rec.ekey)))||(!rec.ekey&&rec.name&&removedNames.has(String(rec.name))));});
  }
  var next=awConvert(d,oldDoc),sequences=new Map(state.domain.rows.records.map(function(row){return [row.record_id,row.sequence];}));next.rows.records.forEach(function(row){row.sequence=sequences.get(row.record_id);});
  if(!deq(cuCanonical(state.domain),cuCanonical(next))){
    var newEmployees=opt.newEmployees,
      live=Object.create(null);newEmployees.forEach(function(e){if(typeof e==='string')live[e]=1;else if(e){if(e.eid)live[e.eid]=1;if(e.nid)live[e.nid]=1;if(e.name)live[e.name]=1;}});
    var ctx={emps:{live:live},empsEmpty:newEmployees.length===0};
    if(opt.all?!wipeAllowed(A,d,ctx):!empCleanAllowed(A,d,ctx)&&!actsHeldOn(A,d,'admin/import',['del']))throw awError('employee-cleanup-denied',403);
  }
  return awDomainPlan(env,next,d,{base:opt.base,reason:opt.reason,intent:opt.all?'employee-wipe':'employee-delete',finalKeys:opt.finalKeys});
}
function awNumber(value,min,max,fallback){if(value===undefined||value===null||value==='')return fallback;var n=Number(value);if(!Number.isSafeInteger(n)||n<min||n>max)throw awError('query');return n;}
function awText(value,max){if(typeof value!=='string'||value.length>max)throw awError('query');return value;}
function awEmployees(ctx){var list=parseJson(ctx.rawKeys['bsdept:'+ctx.d+':bassam_employees_v1']||'[]',null);if(!Array.isArray(list))throw awError('employees-unavailable',503);var map=new Map();list.forEach(function(e){var key=empStableKey(e);if(key&&!map.has(key))map.set(key,e);});return map;}
// PRIVACY batch (019u): the register empno (initial password) only for privPersonalOk, the record's number for award managers (privAwardOk)
function awDisplay(row,employees,A,d){var e=employees.get(row.employee_key),name=e&&e.name||row.declarer_name||'—',number=(A&&privPersonalOk(A,d)&&e&&e.empno)||(A&&privAwardOk(A,d)&&row.employee_number)||'—';return {name:name,number:number};}
function awListRecord(row){var rec={};AW_FIELDS.forEach(function(f,i){if(awHas(row.presence_mask,i)&&awOwn(row,f[1]))rec[f[0]]=row[f[1]]===null?null:f[2]==='boolean'?row[f[1]]===1:row[f[1]];});rec.recordKey=row.record_id;if(typeof rec.id!=='string'||!rec.id)rec.id=row.record_id;return rec;}
function awListColumns(){return ['record_id','sequence','presence_mask'].concat(AW_FIELDS.filter(function(f){return ['pic','sigEmp','sigBy'].indexOf(f[0])<0;}).map(function(f){return f[1];})).join(',');}
async function awRecordFragment(env,d,ids){
  if(!Array.isArray(ids)||ids.length>200)throw awError('record-query');var domain=awEmptyDomain(d);domain.resources.records=true;domain.rows.resources=[{department_id:d,resource:'records',root_kind:2,list_kind:2}];
  var kinds=['records','caseTexts','answers','scoreRows','scores'],out=await env.DB.batch(kinds.map(function(k){return env.DB.prepare('SELECT * FROM '+AW_TABLES[k][0]+' WHERE department_id=?1 AND record_id IN(SELECT value FROM json_each(?2))').bind(d,JSON.stringify(ids));}));
  kinds.forEach(function(k,i){domain.rows[k]=out[i].results||[];});awValidateDomain(domain,d);return domain;
}
function awSummaryQueries(env,d){return [
  env.DB.prepare("SELECT COUNT(*)total,COALESCE(SUM(CASE WHEN eligible=1 THEN 1 ELSE 0 END),0)eligible,AVG(CASE WHEN category='emp' AND score IS NOT NULL THEN score END)employeeScoreAverage,MAX(CASE WHEN category='emp' AND score IS NOT NULL THEN score END)topScore FROM award_records WHERE department_id=?1").bind(d),
  env.DB.prepare('SELECT '+awListColumns()+" FROM award_records WHERE department_id=?1 AND category='emp' AND score IS NOT NULL ORDER BY score DESC,sequence DESC LIMIT 1").bind(d)
];}
async function awRecords(ctx,q){
  var env=ctx.env,d=ctx.d,limit=awNumber(q.limit,1,200,10),query=q.q===undefined?'':awText(q.q,500),page=awNumber(q.page,1,1000000,1),token=null;
  if(q.cursor){try{token=cuUncursor(awText(q.cursor,16000));}catch(e){throw awError('cursor');}
    if(token.kind!=='award-records-v1'||token.witness!==ctx.witness||token.dept!==d||token.limit!==limit||token.q!==query)throw awError('cursor-stale',409);
    page=awNumber(token.page,1,1000000,1);
  }
  var summarySt=awSummaryQueries(env,d),dataSt=env.DB.prepare('SELECT '+awListColumns()+' FROM award_records WHERE department_id=?1 ORDER BY sequence DESC').bind(d),results;
  // Search uses the existing generated Find engine over text metadata only;
  // photos, signatures and questionnaire children never enter the history scan.
  if(query.trim())results=await env.DB.batch(ctx.guards.concat([awRetiredGuard(env)],summarySt,[dataSt]));
  else{
    var skip=(page-1)*limit;
    dataSt=env.DB.prepare('SELECT '+awListColumns()+' FROM award_records WHERE department_id=?1 AND sequence<=COALESCE((SELECT sequence FROM award_records WHERE department_id=?1 ORDER BY sequence DESC LIMIT 1 OFFSET MIN(?2,MAX(0,CAST(((SELECT COUNT(*)FROM award_records WHERE department_id=?1)-1)/?3 AS INTEGER)*?3))),-1)ORDER BY sequence DESC LIMIT ?3').bind(d,skip,limit);
    results=await env.DB.batch(ctx.guards.concat([awRetiredGuard(env)],summarySt,[dataSt]));
  }
  var tail=results.length-3,summary=Object.assign({},results[tail].results[0]),top=results[tail+1].results||[],rows=results[tail+2].results||[],employees=awEmployees(ctx),total=summary.total,filtered;
  summary.topRecord=top.length?Object.assign(privAwardRec(ctx.A,d,awListRecord(top[0])),{employeeName:awDisplay(top[0],employees).name}):null;
  if(query.trim()){
    rows=KIVO_FIND.filter(query,rows,function(row){var display=awDisplay(row,employees,ctx.A,d);return [display.name,display.number,row.status,privAwardOk(ctx.A,d)?row.employee_number:'',row.declarer_name];});filtered=rows.length;
    page=Math.min(page,Math.max(1,Math.ceil(filtered/limit)));rows=rows.slice((page-1)*limit,page*limit);
  }else filtered=total;
  var pages=Math.max(1,Math.ceil(filtered/limit));
  page=Math.min(page,pages);
  function cursor(p){return cuCursor({kind:'award-records-v1',witness:ctx.witness,dept:d,limit:limit,q:query,page:p});}
  return {recs:rows.map(function(row){return privAwardRec(ctx.A,d,awListRecord(row));}),total:total,filteredTotal:filtered,page:page,pageSize:limit,pages:pages,next:page<pages?cursor(page+1):null,prev:page>1?cursor(page-1):null,summary:summary};
}
function awLegacySectionHtml(section){
  // The client formatter is canonical; this worker function is generated from it.
  return AW_REFERENCE_HTML(section);
}
function awReferencePresentation(docs){
  var v2=docs.docsV2;if(isObj(v2)&&['A','B','C'].every(function(k){return isObj(v2[k])&&Array.isArray(v2[k].secs)&&v2[k].secs.every(function(s){return typeof s.body==='string';});}))return v2;
  var v1=docs.docsV1;if(!isObj(v1)||!['A','B','C'].every(function(k){return isObj(v1[k])&&Array.isArray(v1[k].secs);}))return null;
  var out={};['A','B','C'].forEach(function(k){var g=v1[k];out[k]={title:g.title||'',lead:g.lead||'',foot:g.foot||'',secs:g.secs.map(function(s){return {title:s.h||s.title||'',body:typeof s.body==='string'?s.body:awLegacySectionHtml(s)};})};});return out;
}
async function awReferences(ctx){
  var env=ctx.env,d=ctx.d,kinds=['resources','documents','sections','items'],st=kinds.map(function(k){return env.DB.prepare('SELECT * FROM '+AW_TABLES[k][0]+' WHERE department_id=?1'+(k==='resources'?" AND resource IN('docsV1','docsV2')":'')).bind(d);});
  var out=await env.DB.batch(ctx.guards.concat([awRetiredGuard(env)],st)),domain=awEmptyDomain(d),offset=out.length-kinds.length;kinds.forEach(function(k,i){domain.rows[k]=out[offset+i].results||[];});domain.rows.resources.forEach(function(r){domain.resources[r.resource]=true;});awValidateDomain(domain,d);
  var docs=awInflate(domain);return {references:{docsV1:{present:domain.resources.docsV1,value:awOwn(docs,'docsV1')?docs.docsV1:null},docsV2:{present:domain.resources.docsV2,value:awOwn(docs,'docsV2')?docs.docsV2:null},document:awReferencePresentation(docs)}};
}
async function hAwardGet(env,A,url){
  var q=url&&url.searchParams?Object.fromEntries(url.searchParams):url||{},view=q.view||'records',global=q.scope==='global',d=global?'':String(q.dept||A.u.deptId||'');
  if(['records','record','references','context'].indexOf(view)<0||global&&['references','context'].indexOf(view)<0)throw awError('view');
  await awGuardRetired(env);var ctx=await awQueryContext(env,A,d,{write:true}),value;if(d)await privPrepDepts(ctx.env,ctx.A,[d]);   // PRIVACY (019u (9)): a record's ekey that is a hidden nid
  if(view==='references'){
    if(!canRead(ctx.A,awKey(d,1))||!canRead(ctx.A,awKey(d,2)))throw awError('denied',403);value=await awReferences(ctx);
  }else if(view==='context'){
    var readable=AW_RES.map(function(_,i){return canRead(ctx.A,awKey(d,i));});if(!readable.some(Boolean))throw awError('denied',403);
    await env.DB.batch(ctx.guards.concat([awRetiredGuard(env)]));value={readable:{records:readable[0],docsV1:readable[1],docsV2:readable[2]},globalReadOnly:global};
  }else{
    if(!canRead(ctx.A,awKey(d)))throw awError('denied',403);
    if(view==='records')value=await awRecords(ctx,q);
    else{
      var id=awText(q.id,12000),out=await env.DB.batch(ctx.guards.concat([awRetiredGuard(env),env.DB.prepare('SELECT record_id FROM award_records WHERE department_id=?1 AND(record_id=?2 OR business_id=?2)').bind(d,id)])),ids=(out[out.length-1].results||[]).map(function(r){return r.record_id;});
      if(ids.length!==1)throw awError(ids.length?'record-ambiguous':'record-missing',ids.length?409:404);
      var fragment=await awRecordFragment(ctx.env,d,ids);await ctx.env.DB.batch(ctx.guards.concat([awRetiredGuard(ctx.env)]));value={record:privAwardRec(ctx.A,d,awInflate(fragment).records.recs[0]),recordKey:ids[0]};
    }
  }
  return Object.assign({ok:1,dept:d,scope:global?'global':'dept',view:view,base:Object.assign({},ctx.base)},value);
}
async function awPermission(ctx,index,before,after,reason){
  var k=awKey(ctx.d,index),set={},keys={},body={why:{}},X=null,c={};set[k]=JSON.stringify(after);keys[k]=1;if(reason)body.why[k]=reason;
  if(ctx.A.enf){var pv={};pv[ctx.d]=ctx.pv4;X=await enfSavePrep(ctx.env,ctx.A,body,set,[],keys,KIVO_BUILD.markers({},keys),null,false,false,{},pv);c.enf=enfCtxFor(X,k,ctx.d);}
  var decision=X&&X.batchDeny?enfNo(X.batchDeny.why,X.batchDeny):canWrite(ctx.A,k,JSON.stringify(after),before===undefined?null:JSON.stringify(before),c);
  if(!decision.ok){var e=awError('denied',403);e.awDecision=decision;throw e;}
  var checks;if(ctx.A.enf)checks=(decision.keys||[]).map(function(key){return {kind:'enforce',key:key};});
  else{var acts=Object.keys(classifyMutation(resOf(k),before===undefined?null:JSON.stringify(before),JSON.stringify(after),entOf(k),opsOf(k)));if(!acts.length)acts=['edit'];checks=acts.map(function(act){return {kind:'legacy',key:act};});}
  return {decision:decision,checks:checks};
}
async function awReceiptRows(env,A,b){var result=await env.DB.batch([
  env.DB.prepare('SELECT * FROM award_requests WHERE department_id=?1 AND account_uid=?2 AND request_id=?3').bind(b.dept,A.u.id,b.requestId),
  env.DB.prepare('SELECT * FROM award_request_checks WHERE department_id=?1 AND account_uid=?2 AND request_id=?3 ORDER BY position').bind(b.dept,A.u.id,b.requestId)
]);return {receipt:(result[0].results||[])[0]||null,checks:result[1].results||[]};}
function awAck(row,b){var affected=AW_NAMES.find(function(_,i){return awKey(b.dept,i)===row.resource_key;});if(!affected||!Number.isSafeInteger(row.resource_rev)||row.resource_rev<0||row.result_n!==1)throw awError('receipt-invalid',503);var base=Object.assign({},b.base);base[affected]=row.resource_rev;var ack={ok:1,requestId:b.requestId,op:row.operation,affected:affected,rev:row.resource_rev,base:base,n:row.result_n};if(row.result_id!==null)ack.id=row.result_id;return ack;}
async function awReplay(ctx,b,fingerprint,found){
  var row=found.receipt;if(!row)return null;if(row.fingerprint!==fingerprint)throw awError('request-reused',409);
  if(!Number.isSafeInteger(row.permission_count)||row.permission_count<0||found.checks.length!==row.permission_count||found.checks.some(function(c,i){return c.position!==i||typeof c.permission_key!=='string';}))throw awError('receipt-permission-proof-invalid',503);
  var index=AW_RES.indexOf(resName(row.resource_key));if(index<0||row.resource_key!==awKey(ctx.d,index)||!resOnCeiling(ctx.A,ctx.d,resOf(row.resource_key)))throw awError('denied',403);
  var mode=ctx.A.enf?'enforce':'legacy';if(row.permission_mode!==mode)throw awError('receipt-authority-changed',409);
  if(mode==='enforce'){
    if(!enfResWriter(ctx.A,ctx.d,AW_RES[index])||found.checks.some(function(c){return c.check_kind!=='enforce'||!KIVO_GUARDS.decide(c.permission_key,permv2Ctx(ctx.A,ctx.d)).ok;}))throw awError('denied',403);
  }else if(!found.checks.length||found.checks.some(function(c){return c.check_kind!=='legacy'||!authorize(ctx.A,row.resource_key,c.permission_key).ok;}))throw awError('denied',403);
  var where='department_id=?1 AND account_uid=?2 AND request_id=?3',args=[ctx.d,ctx.A.u.id,b.requestId];
  await ctx.env.DB.batch(ctx.guards.concat([awRetiredGuard(ctx.env),rsEpochGuard(ctx.env.DB,b.base.epoch)],
    rsWitness(ctx.env,'award_requests',AW_REQUEST_COLS,[row],where,args),rsWitness(ctx.env,'award_request_checks',AW_CHECK_COLS,found.checks,where,args)));
  return awAck(row,b);
}
async function awEventPlan(ctx,b,before,after){
  var events=[],row=after||before,once='award:'+await cuFingerprint({uid:ctx.A.u.id,requestId:b.requestId,id:row&&row.id,op:b.op});
  if(b.op==='create')events.push({type:'aw_new',dept:ctx.d,once:once,vars:{'الاسم':row.name||row.emp||'—','المرشِّح':row.by||String(ctx.A.u.name||ctx.A.u.un||ctx.A.u.id)}});
  else if(b.op==='delete')events.push({type:'aw_del',dept:ctx.d,once:once,own:row.eid?[row.eid]:[],vars:{'الاسم':row.name||row.emp||'—','المُعدّل':String(ctx.A.u.name||ctx.A.u.un||ctx.A.u.id)}});
  else if(before&&after&&(before.status||before.st)!==(after.status||after.st)&&(after.status||after.st))events.push({type:'aw_res',dept:ctx.d,once:once,own:after.eid?[after.eid]:[],vars:{'القرار':/appr|اعتم|قبل/.test(String(after.status||after.st))?'اعتُمد':'رُفض','الجائزة':after.award||after.cat||'التميز'}});
  events.forEach(function(event){Object.keys(event.vars).forEach(function(k){if(typeof event.vars[k]==='string')event.vars[k]=event.vars[k].slice(0,4000);});});
  var plan=await nfPlanEvents(ctx.env,ctx.A,events,true);return {guards:plan.guards,statements:plan.statements.concat(nfRetention(ctx.env,Date.now(),plan.scopes)),active:plan.plans.length};
}
function awCommandShape(b){
  var extras={create:['data'],edit:['id','data'],status:['id','status'],delete:['id'],'reference-replace':['version','document']};
  if(!isObj(b)||!awOwn(extras,b.op))throw awError('operation');awShape(b,['uid','dept','requestId','base','op','reason'].concat(extras[b.op]));
  if(typeof b.dept!=='string'||!b.dept)throw awError('global-references-readonly',403);awScope(b.dept);awText(b.requestId,100);if(!b.requestId)throw awError('request');
  awShape(b.base,['epoch'].concat(AW_NAMES));['epoch'].concat(AW_NAMES).forEach(function(n){awNatural(b.base[n]);});
  if(b.reason!==undefined&&typeof b.reason!=='string')throw awError('reason');return b;
}
async function hAwardAct(env,A,b,meta){
  awCommandShape(b);if(b.uid!==undefined&&b.uid!==A.u.id){var identity=awError('session-changed',409);identity.awCode='session-changed';throw identity;}
  await awGuardRetired(env);var ctx=await awQueryContext(env,A,b.dept,{write:true});env=ctx.env;A=ctx.A;
  if(b.base.epoch!==ctx.base.epoch)throw awError('restore-epoch-changed',409);
  var fingerprint=await cuFingerprint({body:b}),found=await awReceiptRows(env,A,b),replayed=await awReplay(ctx,b,fingerprint,found);if(replayed)return replayed;
  if(AW_NAMES.some(function(n){return b.base[n]!==ctx.base[n];}))throw awError('conflict',409);
  var index=b.op==='reference-replace'?b.version:0;if(b.op==='reference-replace'&&index!==1&&index!==2)throw awError('reference-version');
  var key=awKey(ctx.d,index),resource=AW_NAMES[index],resourceRows=(await env.DB.prepare('SELECT * FROM award_resources WHERE department_id=?1 AND resource=?2').bind(ctx.d,resource).all()).results||[],
    guards=ctx.guards.concat([awRetiredGuard(env),rsEpochGuard(env.DB,b.base.epoch)],rsWitness(env,'award_resources',AW_TABLES.resources[1],resourceRows,'department_id=?1 AND resource=?2',[ctx.d,resource])),
    statements=[],beforeRecord=null,afterRecord=null,beforeValue,afterValue,resultId=null,now=Date.now(),reason=String(b.reason||'').trim().slice(0,300);
  if(index>0){
    var kinds=['documents','sections','items'],out=await env.DB.batch(kinds.map(function(k){return env.DB.prepare('SELECT * FROM '+AW_TABLES[k][0]+' WHERE department_id=?1 AND version=?2').bind(ctx.d,index);})),old=awEmptyDomain(ctx.d);
    old.rows.resources=resourceRows;old.resources[resource]=resourceRows.length>0;kinds.forEach(function(k,i){old.rows[k]=out[i].results||[];guards.push.apply(guards,rsWitness(env,AW_TABLES[k][0],AW_TABLES[k][1],old.rows[k],'department_id=?1 AND version=?2',[ctx.d,index]));});awValidateDomain(old,ctx.d);
    beforeValue=awInflate(old)[resource];afterValue=b.document;var documents={};documents[resource]=afterValue;var replacement=awConvert(ctx.d,documents);
    ['award_doc_items','award_doc_sections','award_documents'].forEach(function(t){statements.push(env.DB.prepare('DELETE FROM '+t+' WHERE department_id=?1 AND version=?2').bind(ctx.d,index));});
    statements.push(env.DB.prepare('DELETE FROM award_resources WHERE department_id=?1 AND resource=?2').bind(ctx.d,resource));statements.push.apply(statements,awInstallStatements(env,replacement));
  }else{
    var raw=[],fragment=null,recordId,sequence,permissionRecords=[];
    if(b.op==='create'){
      var seq=await env.DB.prepare('SELECT COALESCE(MAX(sequence),-1)+1 n FROM award_records WHERE department_id=?1').bind(ctx.d).first();sequence=seq.n;
      guards.push(env.DB.prepare("SELECT CASE WHEN (SELECT COALESCE(MAX(sequence),-1)+1 FROM award_records WHERE department_id=?1)IS NOT ?2 THEN json_extract('{}','KIVO_AWARD_TARGET_CHANGED')END").bind(ctx.d,sequence));
      if(sequence>0&&(!resourceRows.length||resourceRows[0].root_kind!==2||resourceRows[0].list_kind!==2))throw awError('record-resource-state',503);
      var allowed=AW_FIELDS.map(function(f){return f[0];}).filter(function(n){return ['id','st','byUser'].indexOf(n)<0;}).concat(AW_ARRAYS);awShape(b.data,allowed);
      if(typeof b.data.ekey!=='string'||!awEmployees(ctx).has(b.data.ekey))throw awError('employee');
      afterRecord=Object.assign({},b.data,{id:'aw-'+randTok(),st:'قيد التحكيم',byUser:String(A.u.name||A.u.un||A.u.id)});recordId=awRecordKey(afterRecord);resultId=afterRecord.id;
      var root=awEmptyDomain(ctx.d);root.rows.resources=resourceRows;root.resources.records=resourceRows.length>0;beforeValue=awInflate(root).records;
    }else{
      awText(b.id,12000);raw=(await env.DB.prepare('SELECT * FROM award_records WHERE department_id=?1 AND(record_id=?2 OR business_id=?2)').bind(ctx.d,b.id).all()).results||[];
      if(raw.length!==1)throw awError(raw.length?'record-ambiguous':'record-missing',raw.length?409:404);recordId=raw[0].record_id;sequence=raw[0].sequence;
      if(resourceRows.length!==1||resourceRows[0].root_kind!==2||resourceRows[0].list_kind!==2)throw awError('record-resource-state',503);
      // Preserve the existing collection classifier's distinction between one
      // deletion and a full wipe, using at most one real unchanged neighbour.
      var fragmentIds=[recordId];if(b.op==='delete'){var neighbour=await env.DB.prepare('SELECT record_id FROM award_records WHERE department_id=?1 AND record_id<>?2 ORDER BY sequence DESC LIMIT 1').bind(ctx.d,recordId).first();if(neighbour)fragmentIds.push(neighbour.record_id);}
      fragment=await awRecordFragment(env,ctx.d,fragmentIds);permissionRecords=awInflate(fragment).records.recs;beforeRecord=permissionRecords.find(function(rec){return awRecordKey(rec)===recordId;});resultId=typeof beforeRecord.id==='string'&&beforeRecord.id?beforeRecord.id:recordId;
      ['records','caseTexts','answers','scoreRows','scores'].forEach(function(k){guards.push.apply(guards,rsWitness(env,AW_TABLES[k][0],AW_TABLES[k][1],fragment.rows[k],'department_id=?1 AND record_id IN(SELECT value FROM json_each(?2))',[ctx.d,JSON.stringify(fragmentIds)]));});
      beforeValue={recs:permissionRecords};
      if(b.op==='status'){if(typeof b.status!=='string'||!b.status)throw awError('status');afterRecord=Object.assign({},beforeRecord,{st:b.status});}
      else if(b.op==='edit'){
        awShape(b.data,AW_FIELDS.map(function(f){return f[0];}).filter(function(n){return ['id','st','byUser'].indexOf(n)<0;}).concat(AW_ARRAYS));
        afterRecord=Object.assign({},beforeRecord,b.data);if(afterRecord.ekey!==beforeRecord.ekey&&!awEmployees(ctx).has(afterRecord.ekey))throw awError('employee');
      }
      statements.push(env.DB.prepare('DELETE FROM award_records WHERE department_id=?1 AND record_id=?2').bind(ctx.d,recordId));
    }
    afterValue={recs:b.op==='create'?[afterRecord]:permissionRecords.filter(function(rec){return awRecordKey(rec)!==recordId;}).concat(afterRecord?[afterRecord]:[])};
    if(afterRecord){var typed=awConvert(ctx.d,{records:{recs:[afterRecord]}});typed.rows.records[0].sequence=sequence;if(typed.rows.records[0].record_id!==recordId)throw awError('record-identity');
      ['records','caseTexts','answers','scoreRows','scores'].forEach(function(k){statements.push.apply(statements,rsBulk(env,AW_TABLES[k][0],AW_TABLES[k][1],typed.rows[k]));});}
    if(b.op==='create')statements.push(env.DB.prepare("INSERT INTO award_resources(department_id,resource,root_kind,list_kind)VALUES(?1,'records',2,2)ON CONFLICT(department_id,resource)DO UPDATE SET root_kind=2,list_kind=2").bind(ctx.d));
  }
  var permission=await awPermission(ctx,index,beforeValue,afterValue,reason),nf=await awEventPlan(ctx,b,beforeRecord,afterRecord);guards.push.apply(guards,nf.guards);
  statements.push.apply(statements,bdBumpStatements(env,key,nf.active>0));statements.push.apply(statements,nf.statements);
  statements.push(env.DB.prepare("INSERT INTO award_requests(department_id,account_uid,request_id,fingerprint,resource_key,resource_rev,operation,result_n,result_id,permission_mode,permission_count,created_at)VALUES(?1,?2,?3,?4,?5,CAST((SELECT v FROM meta WHERE k='rev')AS INTEGER),?6,1,?7,?8,?9,?10)").bind(ctx.d,A.u.id,b.requestId,fingerprint,key,b.op,resultId,A.enf?'enforce':'legacy',permission.checks.length,now));
  statements.push.apply(statements,rsBulk(env,'award_request_checks',AW_CHECK_COLS,permission.checks.map(function(c,i){return {department_id:ctx.d,account_uid:A.u.id,request_id:b.requestId,position:i,check_kind:c.kind,permission_key:c.key};})));
  statements.push(env.DB.prepare("INSERT INTO aud(cid,ts,uid,un,dept,k,rev,etype,eid,ename,act,ctx,bef,aft,ip,dev,city)VALUES(?1,?2,?3,?4,?5,?6,CAST((SELECT v FROM meta WHERE k='rev')AS INTEGER),'dataset',?7,'award',?8,?9,'','',?10,?11,?12)").bind('award_'+randTok(),now,A.u.id,String(A.u.un||''),ctx.d,key,resultId||b.requestId,b.op,JSON.stringify({requestId:b.requestId,reason:reason,n:1}),(meta&&meta.ip)||'',(meta&&meta.dev)||'',(meta&&meta.city)||''));
  var authz=A.enf&&enfLogRow(A,key,permission.decision,'/api/award/act',meta||{});if(authz)statements.push(enfLogStmt(env,authz));
  try{await env.DB.batch(guards.concat(statements));}
  catch(error){preOff(env);var fresh=await awQueryContext(env,A,b.dept,{write:true}),receipt=await awReceiptRows(fresh.env,fresh.A,b),ack=await awReplay(fresh,b,fingerprint,receipt);if(ack)return ack;
    if(isRevConflict(error)||/KIVO_AWARD_TARGET_CHANGED|KIVO_RESTORE_TARGET|UNIQUE constraint/.test(String(error)))throw awError('conflict',409);throw error;}
  preOff(env);var completed=await awReceiptRows(env,A,b);if(!completed.receipt)throw awError('receipt-unavailable',503);return awAck(completed.receipt,b);
}
