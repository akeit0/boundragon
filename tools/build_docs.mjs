// SPDX-License-Identifier: Unlicense
// Generated browser assets are build outputs; only their inputs are versioned.
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const check=process.argv.includes('--check')?['--check']:[];
const python=process.env.PYTHON??(process.platform==='win32'?'python':'python3');
// Temml's MathML uses CSS classes for cell alignment and row spacing.
// Ship the pinned local stylesheet, its small supporting font, and its license.
for(const [source,name]of [
  ['dist/Temml-Local.css','temml.css'],['dist/Temml.woff2','Temml.woff2'],
  ['LICENSE','temml-MIT.txt']
]){
  const bytes=fs.readFileSync(path.join(root,'node_modules/temml',source));
  const target=path.join(root,'docs/assets',name);
  if(check.length){
    if(!fs.existsSync(target)||!fs.readFileSync(target).equals(bytes))throw Error(`Stale math asset ${name}. Run npm run build:docs.`);
  }else fs.writeFileSync(target,bytes);
}
for(const [command,args] of [
  [python,['tools/generate_explorer_tables.py',...check]],
  [python,['tools/generate_explorer64_tables.py',...check]],
  [python,['tools/generate_branch_rates.py',...check]],
  [process.execPath,['tools/build_explorer_content.mjs',...check]]
]){
  const result=spawnSync(command,args,{cwd:root,stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status??1);
}
