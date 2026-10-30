/* A D1 REAL is a JS number when returned. Its JSON spelling (0 vs 0.0)
   must not cause a false restore conflict; real concurrent edits still must. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {world,ok,snap,seedTypedDomains,copy} from './backup_review_fx.mjs';

const numbers=()=>({haram:{'9999-01-01':{worshippers:0,umrah:5.5,carts:null}},nabawi:{},locks:{}});

test('actual atomic restore accepts unchanged REAL zero/fraction and SQL NULL without a JSON-text false conflict',async()=>{
  const B=await world();await seedTypedDomains(B,numbers());
  const physical=B.DB.q("SELECT typeof(worshippers) zeroType,typeof(umrah) fractionType,typeof(carts) nullType FROM daily_stats_days WHERE site='haram'")[0];
  assert.deepEqual(copy(physical),{zeroType:'real',fractionType:'real',nullType:'null'});
  const before=copy(B.DB.q('SELECT * FROM daily_stats_days'));
  const ack=ok(await B.restore(await B.body()));
  assert.ok(ack.snapshot);assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n,1);
  assert.deepEqual(copy(B.DB.q('SELECT * FROM daily_stats_days')),before);
  assert.deepEqual((await B.W.dsDomainRead(B.env)).data,numbers());
});

test('numeric, text and null changes after the restore plan return HTTP409 and leave every other row, revision and receipt unchanged',async()=>{
  for(const kind of ['numeric','text','null']){
    const B=await world();await seedTypedDomains(B,numbers());const body=await B.body(),batch=B.DB.batch.bind(B.DB);let injected=false,concurrent;
    B.DB.batch=async statements=>{
      if(!injected&&statements.some(s=>/INSERT .*INTO restore_operations/.test(s.sql))){
        injected=true;
        if(kind==='numeric')B.DB.db.prepare("UPDATE daily_stats_days SET worshippers=7 WHERE site='haram'").run();
        if(kind==='text')B.DB.db.prepare("UPDATE daily_stats_days SET meta_json=? WHERE site='haram'").run('{"u":"TEST_ONLY_changed"}');
        if(kind==='null')B.DB.db.prepare("UPDATE daily_stats_days SET worshippers=NULL WHERE site='haram'").run();
        concurrent=snap(B.DB);
      }
      return batch(statements);
    };
    const rejected=await B.restore(body);
    assert.equal(injected,true,kind);assert.equal(rejected.status,409,kind);assert.equal(rejected.json.err,'conflict',kind);
    assert.deepEqual(snap(B.DB),concurrent,kind+': the restore wrote no partial state after the concurrent edit');
    assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n,0,kind);
  }
});
