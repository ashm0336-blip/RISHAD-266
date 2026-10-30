#!/usr/bin/env node
/* KIVO_257 · AUD-024 (SOT-148) — تصغيرٌ حافظٌ للرموز لكتل الواجهة: يحذف التعليقاتِ والمسافاتِ البادئة ويُبقي كلَّ رمزٍ حرفاً بحرف،
   وكلَّ فاصلِ سطرٍ بين رمزين (فلا يتغيّر الإدراجُ التلقائي للفاصلة المنقوطة ولا معنى أيّ سطر). لا إعادةَ طباعةٍ من شجرة ولا إعادةَ تسمية.
   البرهانُ مدمَج: تيّارُ الرموز في الناتج (النوع · النصّ · «قبله فاصلُ سطر») = الأصل، وإلا يُرفض التصغير (خروج 1).
     node tools/jsmin_tokens.mjs --serve          ← سطرٌ JSON {"t": نص} على stdin ⇒ سطرٌ JSON {"t": ناتج} أو {"err": …} (للبناء)
     node tools/jsmin_tokens.mjs <ملف.js>          ← الناتجُ على stdout
     node tools/jsmin_tokens.mjs --same <أ.js> <ب.js> ← 0 إن تطابق تيّارا الرموز (برهانُ أنّ ب تصغيرٌ لـأ) */
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { createRequire } from 'module';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const acorn = createRequire(ROOT + '/package.json')('acorn');
const LT = new RegExp('[' + String.fromCharCode(10, 13, 0x2028, 0x2029) + ']');
const OPT = { ecmaVersion: 'latest', allowReturnOutsideFunction: true, allowHashBang: true };
export function tmin(src, options = {}) {
  let out = '', prev = null;
  // Only the two operator-tool boundaries survive a Worker build. Their
  // contents are still token-minified, and the proof below remains unchanged.
  const gapText = (gap, between) => {
    const markers = options.preserveTestToolMarkers ? gap.match(/\/\* @@KIVO_TEST_TOOL_(?:BEGIN[^\r\n]*?|END )\*\//g) : null;
    if (markers?.length) return (LT.test(gap) ? '\n' : ' ') + markers.join(LT.test(gap) ? '\n' : ' ') + (LT.test(gap) ? '\n' : ' ');
    return between && gap.length ? (LT.test(gap) ? '\n' : ' ') : '';
  };
  for (const t of acorn.tokenizer(src, OPT)) {
    if (t.type === acorn.tokTypes.eof) break;
    out += gapText(src.slice(prev ? prev.end : 0,t.start),!!prev);
    out += src.slice(t.start, t.end); prev = t;
  }
  if (prev && options.preserveTestToolMarkers) out += gapText(src.slice(prev.end),false);
  return out + '\n';
}
export function sig(src) {
  const out = []; let prevEnd = 0;
  for (const t of acorn.tokenizer(src, OPT)) { if (t.type === acorn.tokTypes.eof) break; out.push((out.length && LT.test(src.slice(prevEnd, t.start)) ? 'NL ' : '') + t.type.label + ' ' + JSON.stringify(src.slice(t.start, t.end))); prevEnd = t.end; }
  return out;
}
export function minProved(src, options = {}) {
  const o = tmin(src,options), a = sig(src), b = sig(o);
  if (a.length !== b.length || a.some((x, i) => x !== b[i])) throw new Error('token-stream-mismatch');
  return o;
}
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const a = process.argv.slice(2);
  if (a[0] === '--serve') {
    const rl = readline.createInterface({ input: process.stdin });
    rl.on('line', (line) => { let r; try { const input=JSON.parse(line);r = { t: minProved(input.t,{preserveTestToolMarkers:input.preserveTestToolMarkers === true}) }; } catch (e) { r = { err: String(e && e.message || e) }; } process.stdout.write(JSON.stringify(r) + '\n'); });
  } else if (a[0] === '--same') {
    const x = sig(fs.readFileSync(a[1], 'utf8')), y = sig(fs.readFileSync(a[2], 'utf8'));
    const i = x.findIndex((v, k) => v !== y[k]); const same = x.length === y.length && i === -1;
    console.log(same ? 'TOKENS-EQUAL ' + x.length : 'TOKENS-DIFFERENT at ' + i + ': ' + x[i] + ' ≠ ' + y[i]); process.exit(same ? 0 : 1);
  } else if (a[0]) process.stdout.write(minProved(fs.readFileSync(a[0], 'utf8')));
  else { console.error('usage: node tools/jsmin_tokens.mjs --serve | <file.js> | --same <a.js> <b.js>'); process.exit(2); }
}
