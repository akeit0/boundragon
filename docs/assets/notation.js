// SPDX-License-Identifier: Unlicense
import {copy,hasCopy,appendCopy} from './content.js';
import {renderSymbol,renderBinding,renderBindings} from './math.js';
import {bi} from './i18n.js';

function definition(format,node,name){
  for(const id of [`symbols.${format}.${node}.${name}`,`symbols.${format}.${name}`,`symbols.${name}`])if(hasCopy(id))return copy(id);
}
// Authors can select the locally useful symbols. By default reintroduce inputs;
// output quantities are defined by the paragraph and the calculation itself.
export function renderNotation(block,format,node,introduced){
  const values=block.values??{},names=new Set(block.text.notation??Object.keys(values));
  const entries=[...names].map(name=>[name,definition(format,node,name)])
    .filter(([name,meaning])=>meaning&&(Object.hasOwn(values,name)||!introduced.has(name)));
  const context=document.createElement('div');context.className='formula-context';
  const remaining=Object.fromEntries(Object.entries(values).filter(([name])=>!entries.some(([defined])=>defined===name)));
  if(!entries.length)return Object.keys(remaining).length?renderBindings(remaining):null;
  const paragraph=document.createElement('p');paragraph.className='local-notation';
  paragraph.append(bi('Here ','ここで、'));
  entries.forEach(([name,meaning],index)=>{
    if(index)paragraph.append(bi('; ', '、'));
    paragraph.append(Object.hasOwn(values,name)?renderBinding(name,values[name]):renderSymbol(name),bi(' is the ','は'));
    const phrase=document.createElement('span');appendCopy(phrase,meaning);paragraph.append(phrase);introduced.add(name);
  });
  paragraph.append(bi('.', 'を表します。'));context.append(paragraph);
  if(Object.keys(remaining).length)context.append(renderBindings(remaining));
  return context;
}
