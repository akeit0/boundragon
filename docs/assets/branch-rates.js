// SPDX-License-Identifier: Unlicense
import {BRANCH_RATES} from './branch-rates.generated.js';
import {bi} from './i18n.js';
export const countText=n=>n.toLocaleString('en-US');
export function percent(n,d){
  if(!d)return bi('not reached','未到達');
  if(!n)return bi('0 observed','観測0件');
  const value=100*n/d;
  return value.toFixed(value<.01?5:3)+'%';
}
export function distributionLabel(id){
  if(id==='random-finite-bits')return bi('Random finite bits','ランダムな有限ビット列');
  if(id==='decimal-1-to-6')return bi('Random 1–6-digit decimals','ランダムな1〜6桁の10進数');
  const digits=Number(id.slice('precision-d'.length));
  return bi(`Full range · ${digits} requested digit${digits===1?'':'s'}`,`全範囲 · 指定した有効桁${digits}桁`);
}
export const distributions=format=>Object.keys(BRANCH_RATES.formats[format].samples);
export function reference(format,id){
  const data=BRANCH_RATES.formats[format];
  return {...data.samples[id],id,format,policy:data.policy,label:distributionLabel(id),recorded:BRANCH_RATES.recorded};
}
export function nodeRate(sample,node){
  if(Object.hasOwn(sample.guards,node)){
    const [reached,hits]=sample.guards[node];
    return {kind:'guard',reached,hits};
  }
  if(node==='exact'||node==='resolve')return {kind:'fallback',reached:sample.n,hits:sample.branches.fallback};
  if(Object.hasOwn(sample.branches,node))return {kind:'branch',reached:sample.n,hits:sample.branches[node]};
  return null;
}
