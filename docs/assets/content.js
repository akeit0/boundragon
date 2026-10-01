// SPDX-License-Identifier: Unlicense
import {CONTENT} from './content.generated.js';
import {locale} from './i18n.js';
import {mathValue} from './math-values.js';

const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
// The model supplies named values, never JavaScript expressions to be evaluated.
// Materialize lazily: an unused glossary definition may have no value on this path.
export function copy(id,values={},language=locale()){
  const entry=CONTENT[language]?.[id];
  if(!entry)throw Error(`Missing ${language} content: ${id}`);
  function value(name){
    if(!Object.hasOwn(values,name)||values[name]===undefined||values[name]===null)throw Error(`Missing ${id} value: ${name}`);
    return String(values[name]);
  }
  return {
    id,values,notation:entry.notation,
    get html(){entry.slots.forEach(value);return entry.html.replace(/\{\{([\p{L}][\p{L}\p{N}_]*)\}\}/gu,(_,name)=>escape(value(name)));},
    toString(){return entry.plain.replace(/\{\{([\p{L}][\p{L}\p{N}_]*)\}\}/gu,(_,name)=>value(name));}
  };
}
export function hasCopy(id,language=locale()){return Object.hasOwn(CONTENT[language],id);}
export function appendCopy(element,content){
  if(!content||typeof content!=='object'||!Object.hasOwn(content,'html')){element.textContent=String(content??'');return;}
  const template=document.createElement('template');template.innerHTML=content.html;
  for(const slot of template.content.querySelectorAll('[data-content-value]')){
    const name=slot.getAttribute('data-content-value');
    if(!Object.hasOwn(content.values,name))throw Error(`Missing ${content.id} math value: ${name}`);
    slot.replaceChildren(mathValue(content.values[name]));
  }
  // Avoid nested paragraphs when inserting inline content into a lead or definition.
  const children=template.content.children;
  if(element.tagName!=='DIV'&&children.length===1&&children[0].tagName==='P')element.replaceChildren(...children[0].childNodes);
  else element.replaceChildren(template.content);
}
