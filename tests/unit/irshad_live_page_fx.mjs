/* Real module + the existing VM browser/HTTP transport; only React's render
   scheduling and application identity bindings are supplied by this fixture. */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {ROOT} from './harness.mjs';
import {TODAY} from './k264_vm.mjs';
export function mountIrshadPage(tab,uid,dept='tst_d1') {
  class Base {
    hToday(){return{y:TODAY.year,m:TODAY.month,d:TODAY.day};}
    _hfmt(){return new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn',{year:'numeric',month:'numeric',day:'numeric'});}
    setState(patch){Object.assign(this.state,typeof patch==='function'?patch(this.state):patch);
      if(this.mounted&&!this.queued){this.queued=true;queueMicrotask(()=>{this.queued=false;if(this.mounted)this._irEnsure('records',this._irRecordQuery());});}}
  }
  Object.assign(tab.W,{DCLogic:Base,Intl,URLSearchParams,AbortController});
  tab.W.KIVO.BassamPageKit={base:()=>Base};
  tab.W.KIVO.BassamAuth={user:()=>({id:uid})};
  tab.W.KIVO.BassamDepts={active:()=>dept,has:value=>value===dept};
  vm.runInContext(fs.readFileSync(path.join(ROOT,'src/systems/irshad/client/logic.js'),'utf8')+'\nglobalThis.IrshadFixtureComponent=Component;',tab.ctx);
  const page=new tab.W.IrshadFixtureComponent();
  Object.assign(page.state,{irTab:'records',irYear:TODAY.year,irMonth:TODAY.month,irDay:TODAY.day,irLedgerOpen:true,irLedgerPerPage:200});
  page.componentDidMount();page.mounted=true;page._irEnsure('records',page._irRecordQuery());
  return{page,dispose(){page.mounted=false;page.componentWillUnmount();}};
}
