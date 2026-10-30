-- KIVO · migrations/0003_aud_legacy_import.sql — R169-CC: نقلُ سجل التدقيق القديم (audit · مستوى المفتاح) إلى المخزن الواحد aud
-- سطرُ audit يُحفظ نوعاً legacy: معرّفُه اسمُ مجموعة البيانات، وفرقُه في aft، وفاعلُه ووقتُه ومراجعتُه كما سُجّلت.
-- INSERT OR IGNORE على cid الفريد يجعلها قابلةً للإعادة بلا تكرار (كانت تُنفَّذ مرّةً وتُختم في meta.aud_mig؛ الختمُ يبقى للتوافق).
INSERT OR IGNORE INTO aud (cid, ts, uid, un, dept, k, rev, etype, eid, ename, act, ctx, bef, aft, ip, dev, city)
SELECT 'legacy_' || id, ts, uid, COALESCE(un, ''),
       CASE WHEN k LIKE 'bsdept:%' THEN substr(k, 8, instr(substr(k, 8), ':') - 1) ELSE '' END,
       k, rev, 'legacy',
       CASE WHEN k LIKE 'bsdept:%' THEN substr(k, 8 + instr(substr(k, 8), ':')) ELSE k END,
       '', CASE WHEN act = 'del' THEN 'deleted' ELSE 'changed' END, '{"legacy":1}', '', COALESCE(diff, ''),
       COALESCE(ip, ''), COALESCE(dev, ''), COALESCE(city, '') FROM audit;
INSERT INTO meta (k, v) VALUES ('aud_mig', '1') ON CONFLICT(k) DO UPDATE SET v = '1';
INSERT INTO meta (k, v) VALUES ('schema_version', '3') ON CONFLICT(k) DO UPDATE SET v = excluded.v;
