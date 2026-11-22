/* ═══ ناقلُ الخادم — القاعدةُ وسيطٌ فقط (V7 · د5-د) ═══
   نظيرُ ناقل العميل (src/core/060-bus.js) بقواعده: لا اسمَ برنامجٍ هنا ولا معرفةَ بمن يجيب؛ الاسمُ «مالك.شيء@إصدار» وحده؛
   وغيابُ الطرف الآخر ليس خطأً.
     srvBusParticipant(name, fn) · srvBusAccepts(name, …args)
        مشاركٌ في تبعة حدثٍ يقع أثرُه في مورده: القاعدةُ تسأل «هل يقبل أحدٌ هذه الكتابة تبعةً للحدث؟» فيجيب مالكُ المورد المتأثّر.
        بلا مشاركٍ ⇒ false (لا تبعةَ تُقبل)، وليس خطأ.
     srvBusProvide(name, fn) · srvBusRead(name, …args)
        قراءةٌ معلنة يوفّرها مالكُها (مزوّدٌ واحد لكل اسم). بلا مزوّدٍ ⇒ undefined، وسلوكُ المستهلك عند الغياب مكتوبٌ في عقده. */
var SRV_BUS_NAME = /^[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*)+@[1-9][0-9]*$/;
var SRV_BUS_PARTICIPANTS = Object.create(null);
function srvBusNamed(name) { if (typeof name !== 'string' || !SRV_BUS_NAME.test(name)) throw Error('bus-name: ' + String(name)); return name; }
function srvBusParticipant(name, fn) {
  srvBusNamed(name); if (typeof fn !== 'function') throw Error('bus-handler');
  var list = SRV_BUS_PARTICIPANTS[name] || (SRV_BUS_PARTICIPANTS[name] = []);
  if (list.indexOf(fn) === -1) list.push(fn);
}
function srvBusAccepts(name) {
  var list = SRV_BUS_PARTICIPANTS[srvBusNamed(name)] || [], args = Array.prototype.slice.call(arguments, 1);
  for (var i = 0; i < list.length; i++) if (list[i].apply(null, args) === true) return true;
  return false;
}
var SRV_BUS_READS = Object.create(null);
function srvBusProvide(name, fn) {
  srvBusNamed(name); if (typeof fn !== 'function') throw Error('bus-handler');
  if (SRV_BUS_READS[name] && SRV_BUS_READS[name] !== fn) throw Error('bus-read-taken: ' + name);
  SRV_BUS_READS[name] = fn;
}
function srvBusRead(name) { var fn = SRV_BUS_READS[srvBusNamed(name)]; return fn ? fn.apply(null, Array.prototype.slice.call(arguments, 1)) : undefined; }
