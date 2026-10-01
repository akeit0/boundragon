// SPDX-License-Identifier: Unlicense
// Shared numeric leaves for compiled prose and live equations.
import {bi} from './i18n.js';
const NS='http://www.w3.org/1998/Math/MathML';
export function mathNode(tag,text){
  const element=document.createElementNS(NS,tag);
  if(text!==undefined)element.textContent=text;
  return element;
}
export function mathValue(value){
  if(typeof value==='boolean')return mathNode('mtext',bi(value?'true':'false',value?'成立':'不成立'));
  const text=String(value);
  return mathNode(/^[−-]?\d+(?:\.\d+)?$/.test(text)?'mn':'mtext',text.replace(/^-/,'−'));
}
// SVG figure labels cannot contain inline MathML. Use exponent glyphs there.
export function decimalPowerLabel(exponent){
  return '10'+String(exponent).replace(/[0-9-]/g,char=>'⁰¹²³⁴⁵⁶⁷⁸⁹⁻'['0123456789-'.indexOf(char)]);
}
