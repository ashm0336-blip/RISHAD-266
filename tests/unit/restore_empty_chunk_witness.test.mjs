import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
const source=fs.readFileSync('workers/parts/019d-atomic-restore.js','utf8');
const context=vm.createContext({TextEncoder});
vm.runInContext(source.slice(source.indexOf('function rsChunks('),source.indexOf('function rsBulk(')),context);
function fixture(){
  const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE kv(k TEXT,seq INTEGER,v TEXT,PRIMARY KEY(k,seq))');
  const rows=[{k:'a',seq:0,v:''},{k:'a',seq:1,v:'7'},{k:'b',seq:0,v:'مرحبا 𝒜'}];
  for(const row of rows)db.prepare('INSERT INTO kv VALUES(?,?,?)').run(row.k,row.seq,row.v);
  const env={DB:{prepare(sql){return{bind(...args){return{run(){return db.prepare(sql).all(...args);}};}};}}};
  const guards=context.rsWitness(env,'kv',['k','seq','v'],rows);
  return {db,run(){for(const guard of guards)guard.run();}};
}
test('actual raw witness accepts exact empty chunks and UTF8 bytes',()=>{const f=fixture();assert.doesNotThrow(()=>f.run());f.db.close();});
test('empty chunk witnesses retain exact cardinality, text, sequence and absence checks',()=>{
  for(const mutation of ["UPDATE kv SET v='0' WHERE k='a' AND seq=0","UPDATE kv SET v='' WHERE k='a' AND seq=1","UPDATE kv SET seq=2 WHERE k='a' AND seq=0","DELETE FROM kv WHERE k='a' AND seq=0","INSERT INTO kv VALUES('a',2,'')","UPDATE kv SET v='مرحبا A' WHERE k='b'"]){
    const f=fixture();f.db.exec(mutation);assert.throws(()=>f.run());f.db.close();
  }
});
