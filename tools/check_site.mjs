// SPDX-License-Identifier: Unlicense
// Verify the uploaded artifact itself, including ES module dependencies.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const site=fileURLToPath(new URL('../dist/site/',import.meta.url));
const siteRoot=path.resolve(site);
const manifest=new Set(JSON.parse(fs.readFileSync(path.join(site,'site-files.json'),'utf8')));
function walk(directory){
  return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
    const file=path.join(directory,entry.name);
    return entry.isDirectory()?walk(file):[path.relative(site,file).replaceAll('\\','/')];
  });
}
const files=walk(site);
if(files.length!==manifest.size||files.some(file=>!manifest.has(file)))throw Error('Site contains stale or unexpected files. Use a fresh dist/site directory.');
let links=0;
for(const file of files){
  if(!/\.(html|js|css)$/.test(file))continue;
  const source=fs.readFileSync(path.join(site,file),'utf8');
  const references=file.endsWith('.html')?[...source.matchAll(/(?:href|src)="([^"]+)"/g)].map(m=>m[1]):
    file.endsWith('.css')?[...source.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^()\s]+))\s*\)/g)].map(m=>m[1]??m[2]??m[3]):
    [...source.matchAll(/(?:from\s*|import\s*)['"](\.\.?\/[^'"]+)['"]/g)].map(m=>m[1]);
  for(const reference of references){
    if(/^(?:[a-z]+:|\/\/)/i.test(reference))continue;
    const [pathname,fragment]=reference.split('#');
    const target=path.resolve(path.dirname(path.join(site,file)),decodeURI(pathname||path.basename(file)));
    if(target!==siteRoot&&!target.startsWith(siteRoot+path.sep))throw Error(`Link leaves the Pages artifact: ${file} → ${reference}`);
    const resolved=fs.existsSync(target)&&fs.statSync(target).isDirectory()?path.join(target,'index.html'):target;
    if(!fs.existsSync(resolved))throw Error(`Broken site link: ${file} → ${reference}`);
    if(fragment&&resolved.endsWith('.html')&&!fs.readFileSync(resolved,'utf8').includes(`id="${decodeURI(fragment)}"`))throw Error(`Missing anchor: ${file} → ${reference}`);
    links++;
  }
}
if(files.some(file=>/\.(csv|cpp|h|py|md)$/.test(file)||file.includes('fallback-rates')||file.includes('/sources/')))throw Error('Research/source data leaked into Pages');
console.log(`Checked ${files.length} published files and ${links} local links/imports; no raw research data.`);
