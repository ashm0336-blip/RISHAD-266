function cuBind(env, sql, args) {
  if (/^WITH /.test(sql)) sql = 'SELECT * FROM (' + sql + ')';
  var statement = env.DB.prepare(sql);
  return statement.bind.apply(statement, args);
}
