  return {
    context:irQueryContext,retired:irGuardRetired,retiredGuard:irRetiredGuard,
    snapshot:async function(env,d){var snapshot=await irRetroSnapshot(env,d);snapshot.guards=rsWitness(env,IR_TABLES.windows[0],IR_TABLES.windows[1],snapshot.rows,'department_id=?1',[d]).concat(rsWitness(env,'meta',['k','v'],snapshot.metaRows,'k=?1 OR k=?2',[irMetaKey(d),irMetaKey(d)+':retro-version']));return snapshot;},
    install:function(env,d,state){var domain=irConvert(d,{retro:state});return [env.DB.prepare('DELETE FROM irshad_retro_windows WHERE department_id=?1').bind(d)].concat(rsBulk(env,IR_TABLES.windows[0],IR_TABLES.windows[1],domain.rows.windows),irMarkResourceStatements(env,d,'retro'));},
  };
