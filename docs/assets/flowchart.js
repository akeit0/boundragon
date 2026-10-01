// SPDX-License-Identifier: Unlicense
// Every evaluated dispatch/Q40 guard maps to its own recorded trace event.
import {t,bi} from './i18n.js';
import {renderGraph} from './graph-renderer.js';
export const GUARDS=[
  ['check-nonfinite','Infinity / NaN check'],['check-power','Zero / power check'],
  ['check-integer-range','Integer range check'],['check-integer-bits','Discarded integer bits'],
  ['check-tiny','Tiny subnormal check'],['check-coarse','Coarse acceptance guard'],
  ['check-boundary','Boundary uncertainty guard'],['check-fine-change','Fine digit-change guard'],
  ['check-fine-tie','Fine tie-threshold guard']
];
const ids={decode:'decode','check-nonfinite':'nonfinite','check-power':'power','check-integer-range':'range',
  'check-integer-bits':'integer','check-tiny':'tiny',scale:'scale','check-coarse':'coarse',
  'check-boundary':'boundary',outside:'outside',round:'round','check-fine-change':'change','check-fine-tie':'tie',
  integer:'integerResult',coarse:'coarseResult',fine:'fineResult',exact:'exact',resolve:'resolve',output:'output'};
const flowId=(step,trace)=>step.node==='special'?(trace.branch==='nonfinite'?'nonfiniteResult':'powerResult'):ids[step.node];
const nodes=[
  ['decode',20,0,170,34,['Decode binary32'],'box'],
  ['nonfinite',20,56,170,50,['Nonfinite?'],'gate'],['nonfiniteResult',220,62,90,38,['NaN / ∞','sentinel'],'box'],
  ['power',20,120,170,50,['Zero or power?'],'gate'],['powerResult',220,126,90,38,['Zero / power','lookup'],'box'],
  ['range',20,184,170,50,['Integer range?'],'gate'],
  ['integer',20,248,170,50,['Integer bits zero?'],'gate'],['integerResult',220,254,90,38,['Integer','normalize'],'box'],
  ['tiny',20,312,170,50,['Tiny subnormal?'],'gate'],
  ['scale',20,380,170,36,['Scale significand'],'box'],
  ['coarse',20,436,170,50,['Coarse point safe?'],'gate'],['coarseResult',220,442,90,38,['Coarse grid','normalize'],'box'],
  ['boundary',20,506,170,50,['Boundary uncertain?'],'gate'],
  ['outside',20,576,170,36,['Exclude coarse grid'],'box'],
  ['round',20,624,170,36,['Round fine digit'],'box'],
  ['change',20,680,170,50,['Digit changes?'],'gate'],
  ['tie',20,750,170,50,['On a tie threshold?'],'gate'],
  ['fineResult',20,828,170,40,['Fine grid','Already canonical'],'box'],
  ['exact',220,822,90,44,['Exact','fallback'],'box'],
  ['resolve',220,890,90,44,['Resolve','normalize'],'box'],
  ['output',20,988,170,36,['Decimal components'],'box']
];
const edges=[
  ['decode','nonfinite','M105 34 V56'],
  ['nonfinite','nonfiniteResult','M190 81 H220','True',202,75],['nonfinite','power','M105 106 V120','False',127,118],
  ['power','powerResult','M190 145 H220','True',202,139],['power','range','M105 170 V184','False',127,182],
  ['range','integer','M105 234 V248','True',127,246],['range','tiny','M20 209 H7 V337 H20','False',20,306],
  ['integer','integerResult','M190 273 H220','True',202,267],['integer','tiny','M105 298 V312','False',127,310],
  ['tiny','exact','M190 337 H205 V844 H220','True',202,331],['tiny','scale','M105 362 V380','False',127,375],
  ['scale','coarse','M105 416 V436'],['coarse','coarseResult','M190 461 H220','True',202,455],
  ['coarse','boundary','M105 486 V506','False',127,501],
  ['boundary','exact','M190 531 H205 V844 H220','True',202,525],['boundary','outside','M105 556 V576','False',127,571],
  ['outside','round','M105 612 V624'],['round','change','M105 660 V680'],
  ['change','exact','M190 705 H205 V844 H220','True',202,699],['change','tie','M105 730 V750','False',127,745],
  ['tie','exact','M190 775 H205 V844 H220','True',202,769],['tie','fineResult','M105 800 V828','False',127,817],
  ['fineResult','output','M105 868 V988'],['exact','resolve','M265 866 V890'],['resolve','output','M265 934 V968 H105 V988'],
  ...[['nonfiniteResult',81],['powerResult',145],['integerResult',273],['coarseResult',461]].map(([id,y])=>[id,'output',`M310 ${y} H316 V968 H105 V988`])
];
export function skippedGuards(trace){
  return GUARDS.filter(([node])=>!trace.steps.some(s=>s.node===node)).map(([node,title])=>{
    const range=trace.steps.find(s=>s.node==='check-integer-range');
    const change=trace.steps.find(s=>s.node==='check-fine-change');
    const reason=node==='check-integer-bits'&&range&&!range.outcome?bi('Integer range was false: the inner bit test is not reached.','整数の範囲判定が不成立なので、内側のビット判定には到達しません。'):
      node==='check-fine-tie'&&change?.outcome?bi('The digit-change guard was true: the OR condition short-circuits to exact fallback.','桁の変動判定が成立したので、OR条件の短絡評価により完全精度へ進みます。'):
      bi('An earlier decision returned through '+({coarse:'the coarse grid',fine:'the fine grid',integer:'the integer shortcut',power:'the power lookup',zero:'signed zero',nonfinite:'the nonfinite return',fallback:'exact fallback'}[trace.branch])+'.','前の判定で'+({coarse:'粗い格子',fine:'細かい格子',integer:'整数の近道',power:'2の累乗の表引き',zero:'符号付きゼロ',nonfinite:'無限大・NaN',fallback:'完全精度へのフォールバック'}[trace.branch])+'の経路へ進み、以降の条件を評価せず結果を返します。');
    return {node,title:t(title),reason};
  });
}
export function renderFlowchart(container,trace,position,onSelect){
  renderGraph(container,{viewBox:'0 -4 322 1032',nodes,edges},trace,position,onSelect,flowId);
}
