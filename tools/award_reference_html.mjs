// Usage: node tools/award_reference_html.mjs src
/* Build-time derivation of Award v1 section HTML; no UI or DOM is started. */
import fs from 'node:fs';
import path from 'node:path';
import {parse} from 'acorn';
const root=process.argv[2];if(!root)throw Error('source directory required');
const source=fs.readFileSync(path.join(root,'modules/award/logic.js'),'utf8');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'script'});
const cls=ast.body.find(n=>n.type==='ClassDeclaration'&&n.id?.name==='Component');
if(!cls)throw Error('Award Component missing');
const parts=['awEsc','awSecToHtml'].map(name=>{const a=cls.body.body.filter(n=>!n.computed&&n.key?.name===name);if(a.length!==1)throw Error('Award formatter member missing/repeated: '+name);return source.slice(a[0].start,a[0].end);});
process.stdout.write('/* Generated from Award awEsc/awSecToHtml, one presentation source. */\nvar AW_REFERENCE_HTML=(function(){var formatter=new(class{'+parts.join('\n')+'})();return function(section){return formatter.awSecToHtml(section);};})();\n');
