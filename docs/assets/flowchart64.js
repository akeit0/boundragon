// SPDX-License-Identifier: Unlicense
import {renderGraph} from './graph-renderer.js';
import {bi,t} from './i18n.js';
export const GUARDS=[
  ['check-special','Check the non-normal dispatch'],['check-integer-range','Check the integer-shortcut range'],['check-integer-bits','Check the discarded binary bits'],['check-power','Check for a power of two'],
  ['check-boundary','Test the boundary-uncertainty guard'],['check-rounding','Test the fine-rounding ambiguity'],['check-ambiguity','Combine both ambiguity tests'],['check-tail','Check for a coarse result']
];
const POWER_GUARDS=[['check-power-coarse','Select the coarse power grid']];
export function skippedGuards(trace){
  const range=trace.steps.find(s=>s.node==='check-integer-range');
  return [...GUARDS,...(trace.branch==='power'?POWER_GUARDS:[])].filter(([id])=>!trace.steps.some(s=>s.node===id)).map(([node,title])=>({node,title:t(title),reason:node==='check-integer-bits'&&range&&!range.outcome?
    bi('Integer range was false: the inner bit test is not reached.','整数の範囲判定が不成立なので、内側のビット判定には到達しません。'):
    node.startsWith('check-power-')?bi('An earlier power-procedure condition failed or returned. Its nested stability test was not reached.','先の2の累乗の条件が不成立か、結果を返しました。内側の安定の判定には到達しません。'):
    bi(`Execution returned through ${t(trace.branch)} before reaching this condition.`,'この条件に到達する前に、別の経路で結果を返しました。')}));
}
// Main dispatch and power routine are separate diagrams, just as they are
// separate C++ procedures. Selecting a power-internal step opens its diagram.
// Guard boxes record both predicate results; their combined OR is the branch.
const main={viewBox:'0 -4 322 1050',nodes:[
  ['decode',20,0,170,34,['Decode binary64'],'box'],['check-special',20,56,170,50,['Non-normal?'],'gate'],['special',220,62,90,40,['NaN / ∞','Signed zero'],'box'],
  ['check-integer-range',20,126,170,50,['Integer range?'],'gate'],['check-integer-bits',20,196,170,50,['Integer bits zero?'],'gate'],['integer',220,202,90,40,['Integer','normalize'],'box'],
  ['check-power',20,266,170,50,['Power of two?'],'gate'],['power-scale',220,272,90,40,['Power','procedure'],'box'],
  ['scale',20,346,170,40,['High-word product','11-bit residual'],'box'],['check-boundary',20,422,170,50,['Boundary uncertain?','0 ≤ d < 2'],'box'],
  ['check-rounding',20,496,170,50,['Rounding uncertain?','g ≤ 10'],'box'],['check-ambiguity',20,576,170,50,['Either guard true?'],'gate'],
  ['exact',220,582,90,44,['Exact','fallback'],'box'],['resolve',220,660,90,40,['Resolve','normalize'],'box'],
  ['choose',20,660,170,36,['Select adjustment'],'box'],['check-tail',20,726,170,50,['tail = 0?'],'gate'],['coarse',220,732,90,40,['Coarse grid','normalize'],'box'],
  ['fine',20,816,170,40,['Fine grid','Already canonical'],'box'],['output',20,1000,170,36,['Decimal components'],'box']
],edges:[
  ['decode','check-special','M105 34 V56'],['check-special','special','M190 81 H220','True',203,75],['check-special','exact','M190 81 H211 V568 H265 V582', 'Subnormal',251,112],['check-special','check-integer-range','M105 106 V126','False',127,120],
  ['check-integer-range','check-integer-bits','M105 176 V196','True',127,190],['check-integer-range','check-power','M20 151 H7 V291 H20','False',20,260],['check-integer-bits','integer','M190 221 H220','True',203,215],['check-integer-bits','check-power','M105 246 V266','False',127,260],
  ['check-power','power-scale','M190 291 H220','True',203,285],['check-power','scale','M105 316 V346','False',127,335],['scale','check-boundary','M105 386 V422'],
  ['check-boundary','check-rounding','M105 472 V496'],['check-rounding','check-ambiguity','M105 546 V576'],['check-ambiguity','exact','M190 601 H220','True',203,595],['check-ambiguity','choose','M105 626 V660','False',127,648],['exact','resolve','M265 626 V660'],['choose','check-tail','M105 696 V726'],['check-tail','coarse','M190 751 H220','True',203,745],['check-tail','fine','M105 776 V816','False',127,803],['fine','output','M105 856 V1000'],
  ...[['special',82],['integer',222],['power-scale',292],['resolve',680],['coarse',752]].map(([id,y])=>[id,'output',`M310 ${y} H316 V979 H105 V1000`])
]};
const power={viewBox:'0 -4 322 380',nodes:[
  ['power-scale',20,0,170,44,['Power-of-two','procedure'],'box'],
  ['check-power-coarse',20,80,170,50,['Coarse grid?'],'gate'],
  ['power-result',20,220,170,44,['Power result'],'box'],
  ['output',20,340,170,36,['Decimal components'],'box']
],edges:[
  ['power-scale','check-power-coarse','M105 44 V80'],
  ['check-power-coarse','power-result','M20 105 H7 V242 H20','True',28,200],
  ['check-power-coarse','power-result','M105 130 V220','False',127,185],
  ['power-result','output','M105 264 V340']
]};
export function renderFlowchart(container,trace,position,onSelect){
  const inPower=trace.steps[position].node.startsWith('power-')||trace.steps[position].node.startsWith('check-power-');
  const extraLines=id=>{
    if(id==='check-boundary'||id==='check-rounding'){
      const event=trace.steps.find(s=>s.node===id);
      return event?[t(String(event.outcome))]:[];
    }
    return [];
  };
  renderGraph(container,inPower?power:main,trace,position,onSelect,s=>s.node,extraLines);
}
