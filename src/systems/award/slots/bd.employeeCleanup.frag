  for(var pd of plan.kv.pend) {
    if(resName(pd.k)!=='bassam_employees_v1'||!parseKey(pd.k).dept)continue;
    var d=parseKey(pd.k).dept;if(wiped.includes(d))continue;
    if(opt.__serverEmployeeIntent&&opt.__serverEmployeeIntent.kind==='import-replace'&&!capOnDept(A,d,'award'))continue;
    var oldEmployees=parseJson(pd.cur,[]),newEmployees=pd.act==='del'?[]:parseJson(pd.v,[]),before=new Set(oldEmployees.map(empStableKey)),after=new Set(newEmployees.map(empStableKey));
    if(!Array.from(before).some(function(key){return !after.has(key);})&&!(opt.__serverEmployeeIntent&&/wipe|replace/.test(opt.__serverEmployeeIntent.kind)))continue;
    var def=bdDefinitions()[@@SYS:bd.awardIndex|empty="0"@@],base=opt.__awardsBase||{};
    if(!opt.__awardsBase)AW_NAMES.forEach(function(name,i){base[name]=reference.inputRevs[awKey(d,i)]||0;});
    var addition=await awPlanEmployeeCleanup(env,A,d,{oldEmployees:oldEmployees,newEmployees:newEmployees,base:base,reason:body.reason||((body.why||{})[pd.k])||'',all:!!(opt.__serverEmployeeIntent&&/wipe|replace/.test(opt.__serverEmployeeIntent.kind)),finalKeys:body.set||{}});
    bdPlanAppend(plan,def,d,addition);
  }
