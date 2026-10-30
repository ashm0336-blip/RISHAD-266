/* Synthetic schema9 integration fixture over the canonical compiler/Worker. */
import assert from 'node:assert/strict';
import {world as custodyWorld, D1, D2, G1, IDS, EKEYS, identitySnapshot, notificationSnapshot} from './custody_review_fx.mjs';
import {candidateWorker} from './irshad_domain_fx.mjs';
export {D1,D2,G1,IDS,EKEYS,identitySnapshot,notificationSnapshot};
export const clone=x=>JSON.parse(JSON.stringify(x));
const NAMES=['SZ_RES','SZ_NAMES','SZ_TABLES','szKey','szConvert','szInflate','szEmptyDomain','szExportDomain','szInstallStatements','szDomainPlan',
 'AW_RES','AW_NAMES','AW_TABLES','awKey','awConvert','awInflate','awEmptyDomain','awExportDomain','awInstallStatements','awDomainPlan','awPhysicalTables','awQueryContext','awPermission','awRevs','szRevs','hAwardAct',
 'bdExport','bdDefinitions','rsRestoreInventory','rsWipeInventory','rsReferenceSnapshot','rsNFValidate','irEmptyDomain','irExport','nfRead','dsDomainRead','cuExport','canRead','enfHeld','retroApiRun','preAttach'];
export const awardDocs=mark=>({records:{recs:[{id:'TEST_ONLY_aw_'+mark,ekey:EKEYS.employee1,name:'TEST_ONLY historical '+mark,cat:'emp',hij:'1448-1-2',score:0,ok:false,st:'قيد التحكيم',pic:'data:image/png;base64,TEST_ONLY',sigEmp:'',sigBy:null,caseTxt:[null,''],ans:[false,null],scores:[[],[0,null]]}]},docsV2:Object.fromEntries(['A','B','C'].map(k=>[k,{title:k+mark,lead:'',foot:'',secs:[{title:'TEST_ONLY',body:'<p>'+mark+'&amp; نص</p>'}]}]))});
export const seizedDocs=(mark='old',photos=[])=>({reports:{reports:[{id:'TEST_ONLY_sz_'+mark,y:1448,m:1,d:2,ts:12,loc:'TEST_ONLY location',actor:'TEST_ONLY historical '+mark,actorKey:EKEYS.employee1,no:'',note:null,items:[{id:23,n:2,val:0,act:'sto',kind:'',kindTxt:'',photos,hist:[{from:'sec',to:'sto',at:'TEST_ONLY time',by:'TEST_ONLY actor',t:123}]}]}]},catalog:{ver:'TEST_ONLY v',cats:[{name:'TEST_ONLY category',color:'#123456',def:'sto',items:[{id:23,name:'TEST_ONLY cash',desc:'',unit:'sar'}]}]},actions:[{k:'sto',name:'TEST_ONLY storage',color:'#123456'}],locations:['','TEST_ONLY location','TEST_ONLY location'],jew:['TEST_ONLY type'],retro:{v:1,windows:[]}});
let rid=0;
export async function world({seed=false,mode='enforce'}={}){
 const B=await custodyWorld({mode}),W=await candidateWorker(NAMES);assert.equal(W.KIVO_SCHEMA_VERSION,9);
 const actor=who=>({u:{id:IDS[who]}});
 async function put(k,v,bump=false){await B.DB.batch(W.kvPutStmts(B.env,'kv',k,typeof v==='string'?v:JSON.stringify(v)));if(bump)await B.DB.prepare('INSERT INTO revs(k,rev)VALUES(?1,1)ON CONFLICT(k)DO UPDATE SET rev=rev+1').bind(k).run();W.preOff(B.env);}
 async function install(kind,d,docs){const def=W.bdDefinitions().find(x=>x.name===kind),domain=def.convert(d,docs),fn=kind==='seized'?W.szInstallStatements:W.awInstallStatements;await B.DB.batch(fn(B.env,domain));return domain;}
 const rawKeys=()=>{const keys={};for(const row of B.DB.q('SELECT k,seq,v FROM kv ORDER BY k,seq'))keys[row.k]=(keys[row.k]||'')+row.v;return keys;};
 const A=async(who='super')=>W.actorOf(B.env,IDS[who]);
 async function body(extra={}){
  const scope=extra.scope||{kind:'full'},full=scope.kind==='full',keys=full?{...rawKeys(),...(extra.keys||{})}:{...(extra.keys||{})},depts=full?JSON.parse(keys.bassam_depts_v1).map(d=>d.id):[scope.departmentId];
  if(full)for(const k of Object.keys(keys)){const d=/^bsdept:([^:]+):/.exec(k)?.[1];if(d&&!depts.includes(d)&&!(k in(extra.keys||{})))delete keys[k];}
  const aa=await A(),nf=await W.nfRead(B.env),ds=await W.dsDomainRead(B.env),cu=(await W.cuExport(B.env,aa,new URL('http://x/export'))).domains,
   ir=(await W.irExport(B.env,aa,new URL('http://x/export'))).domains,notifications=full?nf:Object.fromEntries(Object.entries(nf).map(([n,v])=>[n,Array.isArray(v)?(['overrides','checkpoints'].includes(n)?[]:v.filter(r=>(n==='states'?r.message_scope:r.scope)==='d:'+scope.departmentId)):v])),
   domains={...(full?{dailyStats:{version:1,data:ds.data}}:{}),notifications,custody:depts.map(d=>cu.find(x=>x.scope.departmentId===d)||{version:1,scope:{departmentId:d},rows:{items:[],issues:[],moves:[]}}),irshad:depts.map(d=>ir.find(x=>x.scope.departmentId===d)||W.irEmptyDomain(d)),
    seized:await Promise.all(depts.map(d=>W.szExportDomain(B.env,d))),awards:await Promise.all(depts.concat(full?['']:[]).map(d=>W.awExportDomain(B.env,d))),...(extra.domains||{})},
   base=(await W.rsRestoreInventory(B.env,aa,scope,depts)).base;
  return{version:1,requestId:'TEST_ONLY_business_restore_'+ ++rid,scope,mode:'replace',reason:'TEST_ONLY business atomic restore',base,keys,delete:[],...extra,keys,domains,
   manifest:extra.manifest||{version:3,scope:scope.kind,domains:{kv:1,...(full?{dailyStats:1}:{}),notifications:1,custody:1,irshad:1,seized:1,awards:1},departments:depts,keys:Object.keys(keys).filter(k=>full||k!=='bassam_perms_v1').map(k=>full?k:k.replace('bsdept:'+scope.departmentId+':',''))}};
 }
 async function prepare(input,who='super',internal){return W.rsPrepare(B.env,await A(who),input,{},internal);}
 async function commit(plan,who='super'){return W.rsCommit(B.env,await A(who),plan,{});}
 if(seed){await install('seized',D1,seizedDocs());await install('awards',D1,awardDocs('old'));await install('awards','',{docsV2:awardDocs('global').docsV2});}
 return{...B,canonicalW:B.W,W,A,actor,rawKeys,put,install,body,prepare,commit};
}
export const snapshot=B=>Object.fromEntries(B.DB.q("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").map(({name})=>[name,clone(B.DB.q('SELECT * FROM "'+name+'"')).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))]));
export const fileFrom=body=>({app:'bassam-crowd',version:3,kind:body.scope.kind,data:clone(body.keys),domains:clone(body.domains),manifest:clone(body.manifest)});
export function seedReceipts(B,d=D1){
 B.DB.db.prepare('INSERT INTO seized_requests(department_id,account_uid,request_id,fingerprint,resource_key,resource_rev,operation,result_n,result_id,permission_mode,permission_keys,created_at)VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(d,IDS.super,'TEST_ONLY_prior_sz_receipt','TEST_ONLY',B.W.szKey(d),0,'create',1,'TEST_ONLY_old','enforce','["sz.rec.create"]',1);
 B.DB.db.prepare('INSERT INTO award_requests(department_id,account_uid,request_id,fingerprint,resource_key,resource_rev,operation,result_n,result_id,permission_mode,permission_count,created_at)VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(d,IDS.super,'TEST_ONLY_prior_aw_receipt','TEST_ONLY',B.W.awKey(d),0,'create',1,'TEST_ONLY_old','enforce',1,1);
 B.DB.db.prepare('INSERT INTO award_request_checks(department_id,account_uid,request_id,position,check_kind,permission_key)VALUES(?,?,?,?,?,?)').run(d,IDS.super,'TEST_ONLY_prior_aw_receipt',0,'enforce','award.new.create');
}
export function preimageRows(B,snapshotId,domain,table){
 const stored=B.DB.q('SELECT row_number,row_json FROM restore_preimage WHERE snapshot_id=?1 AND domain=?2 AND table_key=?3 ORDER BY row_number',snapshotId,domain,table),out=[];let parts=[];
 stored.forEach((item,i)=>{assert.equal(item.row_number,i,'Private preimage numbering stays contiguous');const row=JSON.parse(item.row_json);if(row.__restore_fragment===1){if(row.index===0){assert.equal(parts.length,0);parts=[];}assert.equal(row.index,parts.length);parts.push(row.text);if(row.index===row.count-1){out.push(JSON.parse(parts.join('')));parts=[];}}else{assert.equal(parts.length,0);out.push(row);}});assert.equal(parts.length,0,'No incomplete private preimage row');return out;
}
export function batchBounds(statements){
 let maxBindParameters=0,maxSqlBytes=0;
 statements.forEach((statement,i)=>{let raw=statement;while(raw&&raw.__st)raw=raw.__st;assert.equal(typeof raw?.sql,'string','Inspect actual canonical statement at '+i);assert.ok(Array.isArray(raw.args),'Inspect actual SQLite bound arguments at '+i);const bytes=new TextEncoder().encode(raw.sql).byteLength;maxBindParameters=Math.max(maxBindParameters,raw.args.length);maxSqlBytes=Math.max(maxSqlBytes,bytes);assert.ok(raw.args.length<=100,'D1 maximum100 bind parameters per query; actual='+raw.args.length);assert.ok(bytes<=100000,'D1 maximum100KB SQL text per query; actual='+bytes);});
 return{statements:statements.length,maxBindParameters,maxSqlBytes};
}
