/* Original backup scenarios on the actual canonical atomic API. Synthetic data;
   no local business overlay, downloaded files, Cloudflare or legacy worker. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {world,ok,snap,copy,D1,D2,OPTIONS,backupBrowser,exportFull,exportDepartment,seedTypedDomains,until,tick} from './backup_review_fx.mjs';
const ds=()=>({haram:{'9999-01-01':{worshippers:0,umrah:null}},nabawi:{},locks:{}});
const oldKeys=['bassam_notif_v1','bassam_notif_sys_v1','bassam_notif_cfg_v1','bassam_bc_v1'];
const commitPosts=C=>C.requests.filter(r=>r.method==='POST'&&JSON.parse(r.body).phase==='commit');

test('full backup awaits the actual normalized notification export and never offers stale encryption or a partial domain set after failure',async()=>{
  for(const approved of [false,true]){
    const B=await world();await seedTypedDomains(B,ds());const C=await backupBrowser(B),actualExport=C.KIVO.BassamNotif.exportDomain;let settle;
    C.KIVO.BassamNotif.exportDomain=async()=>await new Promise(resolve=>{settle=async()=>resolve(approved?await actualExport():{ok:0,err:'TEST_ONLY_disconnected'});});
    for(const helper of ['_wpActor','_irBackupCapture','_irBackupFence','_irBackupDomain'])C.page[helper]=C.method('src/modules/admin/logic.js',helper);
    C.page._encPend={json:'TEST_ONLY_stale_payload'};C.property('src/modules/admin/logic.js','exportBackup')();await until(()=>!!settle);
    assert.equal(C.page._encPend,null);assert.equal(C.states.some(s=>s.pwDlg),false);assert.equal(C.blobs.length,0);
    await settle();await until(()=>!!C.page._encPend||C.states.some(s=>s.backupMsg));
    if(approved){
      const file=JSON.parse(C.page._encPend.json),actual=await actualExport();assert.deepEqual(file.domains.notifications,actual.domain);assert.deepEqual(file.domains.dailyStats.data,ds());
      assert.equal(file.manifest.version,2);assert.deepEqual(file.manifest.domains,{kv:1,dailyStats:1,notifications:1,custody:1,irshad:1});assert.equal(file.domains.custody.find(d=>d.scope.departmentId===D1).rows.items.length,1);
      assert.deepEqual(file.domains.irshad.map(d=>d.scope.departmentId).sort(),[D1,D2].sort());assert.ok(C.requests.some(request=>request.url.startsWith('/api/irshad/export?')&&request.status===200));
      assert.equal(file.domains.custody.length,2);assert.ok(C.states.some(s=>s.pwDlg?.mode==='exp'));
    }else{assert.equal(C.page._encPend,null);assert.ok(C.states.at(-1).backupMsg);assert.equal(C.states.some(s=>s.pwDlg),false);}
    assert.deepEqual(C.writes,[]);assert.equal(C.reads.some(k=>oldKeys.some(n=>k.endsWith(n))),false);assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n,0);
  }
});

test('department export waits for the server notification domain and aborts the pre-import continuation on failure',async()=>{
  for(const approved of [false,true]){
    const B=await world();await seedTypedDomains(B,ds());const C=await backupBrowser(B),actualExport=C.KIVO.BassamNotif.exportDomain;let settle,continued=0,requested;
    C.KIVO.BassamNotif.exportDomain=async d=>{requested=d;return await new Promise(resolve=>{settle=async()=>resolve(approved?await actualExport(d):{ok:0,err:'TEST_ONLY_disconnected'});});};
    C.method('src/layouts/root-logic.js','bkExportRun').call(C.page,{preImport:true,cb:()=>continued++});await until(()=>!!settle);
    assert.equal(requested,D1);assert.equal(C.blobs.length,0);assert.equal(continued,0);await settle();await until(()=>continued>0||C.toasts.length>0);
    assert.equal(continued,approved?1:0);assert.equal(C.downloads.length,approved?1:0);
    if(approved){const file=JSON.parse(await C.blobs[0].text());assert.deepEqual(file.domains.notifications,(await actualExport(D1)).domain);assert.equal(file.kind,'dept');assert.equal(file.manifest.version,2);assert.deepEqual(file.manifest.domains,{kv:1,notifications:1,custody:1,irshad:1});assert.equal(file.domains.custody.length,1);assert.equal(file.domains.custody[0].scope.departmentId,D1);assert.equal(file.domains.irshad.length,1);assert.equal(file.domains.irshad[0].scope.departmentId,D1);assert.equal(file.domains.dailyStats,undefined);assert.equal(file.domains.notifications.messages.every(m=>m.scope==='d:'+D1),true);}
    else{assert.ok(C.toasts.at(-1)[0]);assert.deepEqual(C.blobs,[]);}
    assert.deepEqual(C.writes,[]);
  }
});

test('full admin and authenticated gate restore normalized notifications atomically and reject every retired document in a modern manifest without partial writes',async()=>{
  for(const entry of ['admin','gate']){
    const B=await world();await seedTypedDomains(B,ds());const C=await backupBrowser(B),file=await exportFull(C),messages=[];
    const run=async f=>{if(entry==='admin'){C.page._fbkPend={file:f,ticket:null};await C.method('src/modules/admin/logic.js','fbkCommit').call(C.page,'replace');}else await C.func('src/auth/335-identity-gate.js','doRestore')(f,message=>messages.push(message),{setAttribute(){}});};
    await run(copy(file));assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n,1,JSON.stringify({entry,state:C.page.state,messages,requests:C.requests.map(r=>({status:r.status,err:r.err}))}));assert.equal(commitPosts(C).length,1);assert.equal(entry==='admin'?C.page._fbkPend:null,null);
    assert.deepEqual(copy((await B.W.nfRead(B.env)).messages),file.domains.notifications.messages);assert.deepEqual(C.writes,[]);
    for(const key of oldKeys){
      const invalid=copy(file);invalid.data['bsdept:'+D1+':'+key]='{}';invalid.data[OPTIONS]='{"TEST_ONLY":"must not partially commit"}';
      if(!invalid.manifest.keys.includes(OPTIONS))invalid.manifest.keys.push(OPTIONS);
      const before=snap(B.DB),commits=commitPosts(C).length;await run(invalid);assert.deepEqual(snap(B.DB),before,key);assert.equal(commitPosts(C).length,commits,key);assert.deepEqual(C.writes,[]);
    }
  }
});

test('department parsing and defensive commit use the shared atomic writer and refuse invalid notification scope or retired documents before an overwrite',async()=>{
  const B=await world();await seedTypedDomains(B,ds());const C=await backupBrowser(B),file=await exportDepartment(C),foreignBefore=copy(B.DB.q('SELECT * FROM kv WHERE k GLOB ?','bsdept:'+D2+':*'));
  const parse=C.method('src/layouts/root-logic.js','bkImportFile'),commit=C.method('src/layouts/root-logic.js','bkCommit');
  parse.call(C.page,file,D1);assert.ok(C.page._bkPend);assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n,0,'Parsing alone never writes');
  await commit.call(C.page,'replace');assert.equal(C.page._bkPend,null);assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n,1);assert.deepEqual(copy(B.DB.q('SELECT * FROM kv WHERE k GLOB ?','bsdept:'+D2+':*')),foreignBefore);
  const variants=[...oldKeys.map(key=>{const f=copy(file);f.data[key]='{}';return f;}),(()=>{const f=copy(file);f.domains.notifications.messages[0].scope='d:'+D2;return f;})()];
  for(const invalid of variants){
    invalid.data.bassam_options_v1='{"TEST_ONLY":"must not partially commit"}';if(!invalid.manifest.keys.includes('bassam_options_v1'))invalid.manifest.keys.push('bassam_options_v1');
    parse.call(C.page,invalid,D1);assert.ok(C.page._bkPend);const before=snap(B.DB),commits=commitPosts(C).length;await commit.call(C.page,'replace');
    assert.ok(C.page._bkPend,'A rejected file stays reviewable');assert.deepEqual(snap(B.DB),before);assert.equal(commitPosts(C).length,commits);assert.deepEqual(C.writes,[]);
  }
});
