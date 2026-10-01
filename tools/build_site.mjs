// SPDX-License-Identifier: Unlicense
// Publish only the explorer and rendered documentation, without research data.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import MarkdownIt from 'markdown-it';
import temml from 'temml';

const root=fileURLToPath(new URL('../',import.meta.url));
const site=path.join(root,'dist/site');
const repository=process.env.GITHUB_REPOSITORY;
const revision=process.env.GITHUB_SHA??'main';
const published=new Set();
// Remove only files owned by the previous build, after checking each path.
const previous=path.join(site,'site-files.json');
if(fs.existsSync(previous))for(const name of JSON.parse(fs.readFileSync(previous,'utf8'))){
  const target=path.resolve(site,name);
  if(!target.startsWith(path.resolve(site)+path.sep))throw Error('Invalid previous site manifest path');
  if(fs.existsSync(target)&&fs.statSync(target).isFile())fs.unlinkSync(target);
}
const pages=new Map([
  ['README.md','getting-started.html'],['NOTICE.md','attribution.html'],
  ['benchmarks/results/README.md','benchmarks/index.html']
]);
for(const directory of ['docs','proof'])for(const name of fs.readdirSync(path.join(root,directory))){
  if(name.endsWith('.md'))pages.set(`${directory}/${name}`,`${directory==='docs'?'':directory+'/'}${name.slice(0,-3)}.html`);
}
for(const name of ['canonical','integrated-writers'])pages.set(
  `benchmarks/results/2026-10-01/${name}/REPORT.md`,`benchmarks/${name}.html`);
function write(name,content){
  const target=path.join(site,name);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,content);
  published.add(name);
}
const escape=text=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const markdown=new MarkdownIt({html:false,linkify:false});
const math=(tex,displayMode)=>temml.renderToString(tex,{displayMode,throwOnError:true});
// The reference documents use both dollar and LaTeX delimiters.
markdown.inline.ruler.before('escape','math',(state,silent)=>{
  const opening=state.src.startsWith('\\(',state.pos)?'\\(':state.src[state.pos]==='$'?'$':null;
  if(!opening)return false;
  const closing=opening==='$'?'$':'\\)';
  const end=state.src.indexOf(closing,state.pos+opening.length);
  if(end<0)return false;
  if(!silent){const token=state.push('math','math',0);token.content=state.src.slice(state.pos+opening.length,end);}
  state.pos=end+closing.length;return true;
});
markdown.block.ruler.before('fence','display_math',(state,start,end,silent)=>{
  const begin=state.bMarks[start]+state.tShift[start];
  const opening=state.src.slice(begin,state.eMarks[start]).trim();
  if(!['$$','\\['].includes(opening))return false;
  const closing=opening==='$$'?'$$':'\\]';
  let next=start+1;
  while(next<end&&state.src.slice(state.bMarks[next],state.eMarks[next]).trim()!==closing)next++;
  if(next===end)throw Error('Unclosed display equation');
  if(!silent){const token=state.push('display_math','math',0);token.content=state.getLines(start+1,next,0,false);}
  state.line=next+1;return true;
});
markdown.renderer.rules.math=(tokens,index)=>math(tokens[index].content,false);
markdown.renderer.rules.display_math=(tokens,index)=>`<div class="document-equation">${math(tokens[index].content,true)}</div>\n`;
function relative(from,to){return path.posix.relative(path.posix.dirname(from),to)||'./';}
function destination(href,source,output){
  if(/^(?:[a-z]+:|\/\/)/i.test(href))return href;
  const [file,fragment]=href.split('#');
  if(!file)return href;
  const resolved=path.posix.normalize(path.posix.join(path.posix.dirname(source),decodeURI(file)));
  if(pages.has(resolved))return relative(output,pages.get(resolved))+(fragment?'#'+fragment:'');
  if(resolved==='docs/index.html')return relative(output,'index.html')+(fragment?'#'+fragment:'');
  if(resolved.startsWith('docs/assets/'))return relative(output,resolved.slice(5));
  if(!fs.existsSync(path.join(root,resolved)))throw Error(`Missing source link in ${source}: ${href}`);
  // Source code and raw research records stay in the repository, outside Pages.
  return repository?`https://github.com/${repository}/blob/${revision}/${resolved}`+(fragment?'#'+fragment:''):null;
}
for(const [source,output]of pages){
  const input=fs.readFileSync(path.join(root,source),'utf8').replace(/\r\n/g,'\n');
  const tokens=markdown.parse(input,{}),ids=new Map();
  for(let i=0;i<tokens.length;i++){
    if(tokens[i].type==='heading_open'){
      const text=tokens[i+1].children.map(t=>t.content).join('');
      const base=text.toLowerCase().replace(/[^\p{L}\p{N}_\s-]/gu,'').trim().replace(/\s/g,'-');
      const count=ids.get(base)??0;ids.set(base,count+1);
      tokens[i].attrSet('id',base+(count?'-'+count:''));
    }
    const stack=[];
    for(const token of tokens[i].children??[]){
      if(token.type==='link_open'){
        const original=token.attrGet('href'),href=destination(original,source,output);
        stack.push(href===null);
        if(href===null){token.tag='span';token.attrs=[['class','source-reference'],['title',original]];}
        else token.attrSet('href',href);
      }else if(token.type==='link_close'&&stack.pop())token.tag='span';
    }
  }
  const title=tokens.find(t=>t.type==='inline')?.content??'Boundragon';
  const home=relative(output,'index.html'),css=relative(output,'assets/explorer.css');
  const mathCss=relative(output,'assets/temml.css');
  const note=source.includes('/REPORT.md')?'<p class="record-note">Recorded before the Boundragon rename. Original method IDs and measurements are preserved. <a href="index.html">Measurement provenance</a>.</p>':'';
  write(output,`<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)} — Boundragon</title><link rel="stylesheet" href="${mathCss}"><link rel="stylesheet" href="${css}"></head><body class="document-page"><header class="masthead"><a class="brand" href="${home}">Boundragon</a><nav aria-label="Documentation"><a href="${relative(output,'getting-started.html')}">C++ library</a> · <a href="${relative(output,'algorithm.html')}">Algorithm</a> · <a href="${relative(output,'benchmarks.html')}">Benchmarks</a></nav></header><main class="document">${note}${markdown.renderer.render(tokens,markdown.options,{})}</main><footer><a href="${home}">Algorithm explorer</a><a href="${relative(output,'attribution.html')}">License and attribution</a></footer></body></html>\n`);
}
write('index.html',fs.readFileSync(path.join(root,'docs/index.html')));
for(const name of fs.readdirSync(path.join(root,'docs/assets'))){
  if(/\.(?:js|css|txt|woff2)$/.test(name))write('assets/'+name,fs.readFileSync(path.join(root,'docs/assets',name)));
}
write('.nojekyll','');
write('site-files.json',JSON.stringify([...published,'site-files.json'].sort(),null,2)+'\n');
console.log(`Built ${pages.size+1} pages and ${published.size} files in dist/site.`);
