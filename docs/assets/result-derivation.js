// SPDX-License-Identifier: Unlicense
// Connect the selected grid coefficient to the returned numeric components.
import {copy} from './content.js';
import {t} from './i18n.js';

function candidate(trace,source,format){
  const v=source.values,r=trace.result,is64=format==='binary64';
  const make=(kind,values,sig0,exp0)=>({kind,formula:'common.candidate.'+kind,values,sig0,exp0});
  if(source.node==='integer')return make('integer',{integer:v.integer},v.integer,0);
  if(source.node==='special'){
    if(trace.branch==='nonfinite')return {kind:'nonfinite',formula:'common.candidate.nonfinite',values:{F:trace.fraction},results:{sig:r.sig}};
    if(trace.branch==='zero')return {kind:'zero',formula:'common.candidate.zero',values:{},results:{}};
    return {kind:'table',formula:'common.candidate.table',values:{E:trace.raw},results:{sig:r.sig,exp:r.exp}};
  }
  if(source.node==='coarse'){
    const I=is64?v['raw coefficient']:trace.guard.integral;
    return make(is64?'coarse64':'coarse32',is64?{I,k:trace.guard.k}:{I,e:trace.gridExp},I,v['raw exponent']);
  }
  if(source.node==='fine'){
    const I=is64?trace.steps.find(step=>step.node==='choose').values.I:trace.guard.integral;
    const digit=is64?v.tail:v['lower digit'];
    if(is64)return {kind:'fine64',formula:'common.candidate.fine64',values:{I,tail:digit,k:trace.guard.k},results:{sig:r.sig,exp:r.exp}};
    return make('fine32',{I,digit,e:trace.gridExp},r.sig,r.exp);
  }
  if(source.node==='resolve'){
    if(!is64)return make('complete32',{I:v.integral,up:v.up?1:0,digit_used:v.up||v.down?0:v.digit,k:v.k},v.sig,v.k);
    const coarse=v.up||v.down||!v.digit;
    return make(coarse?'completeCoarse64':'completeFine64',{I:v.integral,up:v.up?1:0,digit_final:v.digit,k:v.k},v['raw coefficient'],v['raw exponent']);
  }
  if(source.node==='power-result'){
    const scale=trace.steps.find(step=>step.node==='power-scale').values;
    const coarse=v['raw exponent']===scale.k+1;
    const I=scale.integral,up=coarse?v['raw coefficient']-I:0n;
    return make(coarse?'powerCoarse64':'powerFine64',{I,up,digit:v.digit??0n,k:scale.k},v['raw coefficient'],v['raw exponent']);
  }
  return null;
}
function calculation(trace,selected){
  if(selected.sig0===undefined)return selected;
  const zeros=trace.result.exp-selected.exp0;
  if(zeros<0||selected.sig0/10n**BigInt(zeros)!==trace.result.sig)throw Error('Result derivation does not match conversion');
  return {...selected,
    formula:[selected.formula,`common.normalization.${zeros?'remove-zeroes':'unchanged'}`],
    values:{...selected.values,...(zeros?{zeros}:{})},
    results:{sig_0:selected.sig0,exp_0:selected.exp0,sig:trace.result.sig,exp:trace.result.exp}
  };
}
export function connectResult(trace,index,explanation,format){
  const step=trace.steps[index],output=step.node==='output',source=output?trace.steps[index-1]:step;
  const selected=candidate(trace,source,format);
  if(!selected)return explanation;
  const derived=calculation(trace,selected);
  if(output){
    explanation.blocks.unshift({id:'common.result.source',title:copy('common.result.source.title'),
      text:copy('common.result.source.body.'+(selected.sig0===undefined?'direct':'normal'),{step:index,title:t(source.title),origin:copy('common.origin.'+selected.kind)}),
      formula:derived.formula,values:derived.values,results:derived.results});
  }else if(selected.sig0!==undefined||['table','fine64'].includes(selected.kind)){
    const block=explanation.blocks.find(block=>block.result);
    if(!block)throw Error(`Missing result calculation in ${format} ${step.node}`);
    const formulas=Array.isArray(derived.formula)?derived.formula:[derived.formula];
    block.formula=[...(block.formula?[block.formula]:[]),...formulas];
    block.values={...block.values,...derived.values};block.results={...block.results,...derived.results};
  }
  return explanation;
}
