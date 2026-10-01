// SPDX-License-Identifier: Unlicense
// All authored math is compiled by Temml at build time. Runtime only binds values.
import {EQUATIONS,SYMBOLS} from './equations.generated.js';
import {copy} from './content.js';
import {bi} from './i18n.js';
import {mathNode as node,mathValue as numeric} from './math-values.js';
function template(html){
  const element=document.createElement('template');element.innerHTML=html;
  return element.content;
}
export function validateEquationBindings(ids,values={}){
  for(const id of Array.isArray(ids)?ids:[ids]){
    const equation=EQUATIONS[id];
    if(!equation)throw Error(`Missing equation: ${id}`);
    for(const key of equation.values)if(!Object.hasOwn(values,key)||values[key]===undefined||values[key]===null)throw Error(`Missing ${id} math value: ${key}`);
  }
}
export function renderMath(ids,results={},values={}){
  validateEquationBindings(ids,values);
  const wrapper=document.createElement('div');wrapper.className='math-calculation';
  for(const id of Array.isArray(ids)?ids:[ids]){
    const fragment=template(EQUATIONS[id].html);
    for(const slot of fragment.querySelectorAll('[data-content-copy]'))slot.textContent=String(copy(slot.getAttribute('data-content-copy')));
    for(const slot of fragment.querySelectorAll('[data-content-value]'))slot.replaceChildren(numeric(values[slot.getAttribute('data-content-value')]));
    for(const slot of fragment.querySelectorAll('[data-content-result]')){
      const key=slot.getAttribute('data-content-result');
      if(Object.hasOwn(results,key)&&results[key]!==undefined){
        slot.replaceChildren(node('mo','='),numeric(results[key]));
      }
      else slot.remove();
    }
    // Inferred MathML spacing varies with the following number, text or sign.
    // Normalize only leading relations; preserve operators inside formulas.
    for(const cell of fragment.querySelectorAll('mtd.tml-left')){
      let first=cell.firstElementChild;
      while(first?.localName==='mrow')first=first.firstElementChild;
      if(first?.localName==='mo'&&/^[=≠<>≤≥≈∈∉≡]$/.test(first.textContent)){
        cell.style.paddingLeft='0.2778em';
        first.setAttribute('lspace','0em');first.setAttribute('rspace','0.2778em');
      }
    }
    wrapper.append(fragment);
  }
  // Candidate assembly and normalization are one derivation. Share table
  // columns instead of centering each compiled fragment independently.
  let previous=null;
  for(const math of [...wrapper.children]){
    const table=math.childElementCount===1&&math.firstElementChild.localName==='mtable'?math.firstElementChild:null;
    if(table&&previous&&table.firstElementChild?.childElementCount===previous.firstElementChild?.childElementCount){
      table.firstElementChild.classList.add('math-group-start');
      previous.append(...table.children);math.remove();
    }else previous=table;
  }
  for(const math of wrapper.querySelectorAll('math'))math.setAttribute('aria-label',math.textContent);
  return wrapper;
}
export function renderSymbol(name){
  if(Object.hasOwn(SYMBOLS,name))return template(SYMBOLS[name]).firstElementChild;
  // Non-mathematical labels may appear in numeric trace metadata.
  const math=node('math');math.append(node('mtext',name));return math;
}
export function renderBinding(name,value){
  const math=renderSymbol(name);
  math.append(node('mo','='),numeric(value));
  math.setAttribute('aria-label',math.textContent);return math;
}
export function renderBindings(values){
  const wrapper=document.createElement('div');wrapper.className='formula-bindings';
  const label=document.createElement('span');label.className='formula-bindings-label';
  label.textContent=bi('For this input:','この入力：');wrapper.append(label);
  for(const [name,value]of Object.entries(values)){
    const binding=document.createElement('span');binding.className='formula-binding';
    binding.append(renderBinding(name,value));wrapper.append(binding);
  }
  return wrapper;
}
