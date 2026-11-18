function ocptWho(table) {
  return ocObject(table, {u:ocScalar('text'),e:ocScalar('text'),n:ocScalar('text')});
}
function ocptTaskDecision(table) {
  return ocObject(table, {st:ocScalar('text'),at:ocScalar('number'),by:ocptWho(table+'_by'),sub:ocScalar('number'),why:ocScalar('text')});
}
function ocptTaskCancellation(table) {
  return ocObject(table, {at:ocScalar('number'),by:ocptWho(table+'_by'),why:ocScalar('text'),rec:ocScalar('scalar')});
}
function ocptTaskManagement(table) {
  return ocObject(table, {
    v:ocScalar('number'),
    by:ocptWho(table+'_by'),
    pol:ocObject(table+'_policy', {m:ocScalar('text'),n:ocScalar('number'),steps:ocArray(table+'_policy_steps',ocScalar('text'))}),
    rv:ocptWho(table+'_reviewer'),
    dec:ocScalar('scalar'),
    needs:ocArray(table+'_needs',ocScalar('text')),
    elig:ocObject(table+'_eligibility', {res:ocScalar('text'),code:ocScalar('text'),at:ocScalar('number')}),
    win:ocObject(table+'_window', {early:ocScalar('number'),late:ocScalar('number')}),
    ext:ocArray(table+'_extensions',ocObject(table+'_extension', {at:ocScalar('number'),by:ocptWho(table+'_extension_by'),from:ocScalar('number'),to:ocScalar('number'),why:ocScalar('text')})),
    rev:ocptTaskDecision(table+'_decision'),
    revh:ocArray(table+'_decision_history',ocptTaskDecision(table+'_history_decision')),
    asg:ocScalar('text'),
    can:ocptTaskCancellation(table+'_cancellation'),
    canh:ocArray(table+'_cancellation_history',ocptTaskCancellation(table+'_old_cancellation')),
    re:ocObject(table+'_reassignment', {at:ocScalar('number'),by:ocptWho(table+'_reassign_by'),why:ocScalar('text'),to:ocObject(table+'_reassign_target', {e:ocScalar('text'),n:ocScalar('text')})}),
    from:ocObject(table+'_predecessor', {id:ocScalar('scalar'),e:ocScalar('text'),at:ocScalar('number')}),
    relink:ocArray(table+'_relinks',ocObject(table+'_relink', {at:ocScalar('number'),by:ocptWho(table+'_relink_by'),from:ocScalar('text'),to:ocScalar('text')})),
    rec:ocObject(table+'_recurrence', {
      id:ocScalar('text'),ver:ocScalar('number'),t:ocScalar('text'),
      wd:ocArray(table+'_recurrence_weekdays',ocScalar('number')),
      md:ocScalar('scalar'),n:ocScalar('number'),from:ocScalar('text'),to:ocScalar('text'),
      paused:ocScalar('scalar'),stop:ocScalar('scalar'),by:ocptWho(table+'_recurrence_by'),
      asg:ocArray(table+'_recurrence_assignees',ocScalar('text'))
    }),
    idem:ocScalar('text'),det:ocScalar('scalar')
  });
}
function ocptTaskSelf(table) {
  return ocObject(table, {
    at:ocScalar('number'),why:ocScalar('text'),exp:ocScalar('number'),ack:ocScalar('number'),
    stall:ocObject(table+'_stall', {at:ocScalar('number'),why:ocScalar('text')}),
    q:ocArray(table+'_idempotency',ocScalar('text'))
  });
}
function ocptTaskProof(table) {
  return ocObject(table, {
    imgs:ocArray(table+'_images',ocScalar('text')),note:ocScalar('text'),at:ocScalar('number'),
    st:ocMap(table+'_steps',ocScalar('number')),sub:ocScalar('number'),draft:ocScalar('scalar'),
    h:ocArray(table+'_history',ocObject(table+'_submission', {
      at:ocScalar('number'),imgs:ocArray(table+'_submission_images',ocScalar('text')),
      note:ocScalar('text'),n:ocScalar('number')
    })),
    meta:ocArray(table+'_image_metadata',ocObject(table+'_image_metadata_entry', {
      img:ocScalar('text'),at:ocScalar('number'),lat:ocScalar('number'),lng:ocScalar('number'),acc:ocScalar('number')
    }))
  });
}
function ocptTaskRow(table) {
  // 071:135 creation and Tasks.logic:3012 preserve the established tuple.
  // Slot13 is an existing number|string business identity, not a SQL row key.
  return ocTuple(table, [
    ocScalar('text'),ocScalar('text'),ocScalar('text'),ocScalar('text'),
    ocScalar('text'),ocScalar('text'),
    ocArray(table+'_performance',ocScalar('text')),
    ocArray(table+'_initials',ocScalar('text')),
    ocScalar('text'),ocScalar('text'),ocScalar('number'),ocScalar('number'),
    ocScalar('number'),ocScalar('scalar'),ocScalar('scalar'),ocScalar('number'),
    ocScalar('number'),ocScalar('scalar'),ocScalar('text'),ocScalar('text'),
    ocptTaskSelf(table+'_self'),ocptTaskProof(table+'_proof'),
    ocScalar('text'),ocptTaskManagement(table+'_management')
  ]);
}
