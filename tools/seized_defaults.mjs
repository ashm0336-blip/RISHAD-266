// Usage: node tools/seized_defaults.mjs src
/* Build-time derivation from the sole catalogue data source and live UI version. */
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'acorn';
const root=process.argv[2];if(!root)throw Error('source directory required');
const source=fs.readFileSync(path.join(root,'modules/seized/logic.js'),'utf8');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'script'});
const component=ast.body.find(n=>n.type==='ClassDeclaration'&&n.id?.name==='Component');
const versions=component?.body.body.filter(n=>!n.computed&&n.key?.name==='SZ_VER');
if(versions?.length!==1||versions[0].type!=='PropertyDefinition'||versions[0].value?.type!=='Literal'||typeof versions[0].value.value!=='string')throw Error('Seized version must be one string literal');
const data=JSON.parse(fs.readFileSync(path.join(root,'modules/seized/defaults.json'),'utf8'));
if(Object.keys(data).sort().join()!=='actions,cats,kinds'||!Array.isArray(data.cats)||!data.cats.length||!Array.isArray(data.actions)||!Array.isArray(data.kinds))throw Error('Seized defaults contract changed');
const value={catalog:{ver:versions[0].value.value,cats:data.cats},actions:data.actions,kinds:data.kinds};
process.stdout.write('/* Generated from the Seized module defaults and version; do not edit. */\nvar SZ_DEFAULTS = '+JSON.stringify(value)+';\n');
