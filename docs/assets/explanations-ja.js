// SPDX-License-Identifier: Unlicense
import {copy} from './content.js';
// Equations are reused from the English explanation; prose follows the same trace.
import {decimalString,hex} from './converter.js';
import {t} from './i18n.js';
const say=(id,values)=>copy('binary32.'+id,values,'ja');
const Q=1n<<40n;
export function explainJapanese(trace,index,source){
  const step=trace.steps[index],v=step.values,r=trace.result,g=trace.guard;
  const blocks=[];
  const add=(title,text)=>blocks.push({id:title.id,title,text});
  const zeroes=(r.removed??[]).reduce((a,b)=>a+b,0);
  if(step.kind==='guard'){
    const checks={
      'check-nonfinite':[say('checks.check-nonfinite.title'),say('checks.check-nonfinite.body')],
      'check-power':[say('checks.check-power.title'),say('checks.check-power.body')],
      'check-integer-range':[say('checks.check-integer-range.title'),say('checks.check-integer-range.body')],
      'check-integer-bits':[say('checks.check-integer-bits.title'),say('checks.check-integer-bits.body')],
      'check-tiny':[say('checks.check-tiny.title'),say('checks.check-tiny.body')],
      'check-coarse':[say('checks.check-coarse.title'),say('checks.check-coarse.body')],
      'check-boundary':[say('checks.check-boundary.title'),say('checks.check-boundary.body')],
      'check-fine-change':[say('checks.check-fine-change.title'),say('checks.check-fine-change.body')],
      'check-fine-tie':[say('checks.check-fine-tie.title'),say('checks.check-fine-tie.body')]
    };
    add(...checks[step.node]);
    add(say('guard.evaluate-with-this-input.title'),say('guard.evaluate-with-this-input.body', {detail: step.outcome?say('guard.evaluate-with-this-input.body.detail.yes'):say('guard.evaluate-with-this-input.body.detail.no')}));
    let control=t(step.nextAction);
    if(step.node==='check-integer-range'&&!step.outcome)control+=say('guard.control.');
    if(step.node==='check-fine-change'&&step.outcome)control+=say('guard.control.or');
    add(say('guard.follow-the-control-flow.title'),control+say('guard.follow-the-control-flow.body.right'));
  }
  switch(step.node){
    case 'decode':
      add(say('decode.read-the-three-fields.title'),say('decode.read-the-three-fields.body', {bits: hex(trace.bits), status: trace.negative?1:0, raw: trace.raw, fraction: trace.fraction}));
      if(trace.raw===255)add(say('decode.recognize-a-special-value.title'),trace.fraction?say('decode.recognize-a-special-value.body.yes'):say('decode.recognize-a-special-value.body.no'));
      else if(!trace.raw)add(say('decode.use-subnormal-spacing.title'),say('decode.use-subnormal-spacing.body'));
      else add(say('decode.restore-the-hidden-bit.title'),say('decode.restore-the-hidden-bit.body'));
      add(say('decode.why-the-original-format-matters.title'),say('decode.why-the-original-format-matters.body', {detail: trace.negative?say('decode.why-the-original-format-matters.body.detail.yes'):say('decode.why-the-original-format-matters.body.detail.no')}));
      break;
    case 'special':
      if(trace.branch==='nonfinite'){
        add(say('special.preserve-the-numeric-api-contract.title'),say('special.preserve-the-numeric-api-contract.body', {detail: trace.negative?1:0}));
        add(say('special.do-not-search-a-grid.title'),say('special.do-not-search-a-grid.body'));
      }else if(trace.branch==='zero'){
        add(say('special.use-the-zero-table-entry.title'),say('special.use-the-zero-table-entry.body'));
        add(say('special.return-without-interval-arithmetic.title'),say('special.return-without-interval-arithmetic.body', {detail: trace.negative?say('special.return-without-interval-arithmetic.body.detail.yes'):say('special.return-without-interval-arithmetic.body.detail.no')}));
      }else{
        add(say('special.why-powers-get-a-separate-route.title'),say('special.why-powers-get-a-separate-route.body'));
        add(say('special.read-a-precomputed-canonical-answer.title'),say('special.read-a-precomputed-canonical-answer.body', {raw: trace.raw}));
        add(say('special.why-this-bypasses-the-filter.title'),say('special.why-this-bypasses-the-filter.body'));
      }
      break;
    case 'integer':
      add(say('integer.prove-that-no-fractional-bits-remain.title'),say('integer.prove-that-no-fractional-bits-remain.body', {right_shift: v['right shift']}));
      add(say('integer.normalize-decimal-zeroes.title'),say('integer.normalize-decimal-zeroes.body', {integer: v.integer, zeroes: zeroes}));
      add(say('integer.why-the-range-is-selective.title'),say('integer.why-the-range-is-selective.body'));
      break;
    case 'scale':
      add(say('scale.pick-the-two-neighboring-decimal-grids.title'),say('scale.pick-the-two-neighboring-decimal-grids.body', {q: trace.q, decimal_grid_exponent: v['decimal grid exponent']}));
      add(say('scale.keep-40-fractional-bits.title'),say('scale.keep-40-fractional-bits.body'));
      add(say('scale.center-the-leftover-fraction.title'),say('scale.center-the-leftover-fraction.body'));
      add(say('scale.bound-the-omitted-information.title'),say('scale.bound-the-omitted-information.body', {m: v.m}));
      break;
    case 'coarse':
      add(say('coarse.leave-a-full-error-margin.title'),say('coarse.leave-a-full-error-margin.body'));
      add(say('coarse.prefer-the-grid-with-fewer-digits.title'),say('coarse.prefer-the-grid-with-fewer-digits.body', {integral: g.integral, gridexp: trace.gridExp}));
      add(say('coarse.use-bounded-zero-removal.title'),say('coarse.use-bounded-zero-removal.body', {zeroes: zeroes}));
      break;
    case 'outside':
      add(say('outside.the-coarse-acceptance-test-did-not-pass.title'),say('outside.the-coarse-acceptance-test-did-not-pass.body'));
      add(say('outside.exclude-the-coarse-point-with-its-error-bound.title'),say('outside.exclude-the-coarse-point-with-its-error-bound.body'));
      add(say('outside.spend-one-more-decimal-digit.title'),say('outside.spend-one-more-decimal-digit.body', {gridexp: trace.gridExp, status: trace.gridExp-1}));
      break;
    case 'round':
      add(say('round.move-the-residual-to-the-fine-grid.title'),say('round.move-the-residual-to-the-fine-grid.body'));
      add(say('round.round-both-bounds-of-the-omitted-information.title'),say('round.round-both-bounds-of-the-omitted-information.body'));
      add(say('round.do-not-accept-a-digit-yet.title'),say('round.do-not-accept-a-digit-yet.body'));
      break;
    case 'fine':
      add(say('fine.round-a-digit-not-the-whole-float.title'),say('fine.round-a-digit-not-the-whole-float.body'));
      add(say('fine.prove-the-digit-cannot-change.title'),say('fine.prove-the-digit-cannot-change.body', {lower_digit: v['lower digit']}));
      add(say('fine.assemble-a-canonical-result.title'),say('fine.assemble-a-canonical-result.body'));
      break;
    case 'exact':
      if(trace.m<11n)add(say('exact.a-deliberately-excluded-tiny-case.title'),say('exact.a-deliberately-excluded-tiny-case.body', {m: trace.m}));
      else if(Object.hasOwn(v,'a'))add(say('exact.the-coarse-boundary-is-uncertain.title'),say('exact.the-coarse-boundary-is-uncertain.body'));
      else add(say('exact.fine-rounding-needs-more-information.title'),say('exact.fine-rounding-needs-more-information.body', {lower_digit: v['lower digit'], upper_digit: v['upper digit'], note: v['tie test evaluated']?say('exact.fine-rounding-needs-more-information.body.note.yes'):say('exact.fine-rounding-needs-more-information.body.note.no')}));
      add(say('exact.recover-the-full-integer-product.title'),say('exact.recover-the-full-integer-product.body'));
      add(say('exact.fallback-is-part-of-the-algorithm.title'),say('exact.fallback-is-part-of-the-algorithm.body'));
      break;
    case 'resolve':
      add(say('resolve.rescale-with-the-complete-cache.title'),say('resolve.rescale-with-the-complete-cache.body', {k: v.k, p: v.p, shift: v.shift}));
      add(say('resolve.correct-the-radius-for-midpoint-parity.title'),say('resolve.correct-the-radius-for-midpoint-parity.body'));
      add(say('resolve.test-the-interval-endpoints.title'),say('resolve.test-the-interval-endpoints.body'));
      add(say('resolve.round-the-fine-digit-and-correct-a-decimal-tie.title'),say('resolve.round-the-fine-digit-and-correct-a-decimal-tie.body', {detail: v.f===1n<<30n?say('resolve.round-the-fine-digit-and-correct-a-decimal-tie.body.detail.yes'):say('resolve.round-the-fine-digit-and-correct-a-decimal-tie.body.detail.no')}));
      add(say('resolve.choose-coarse-or-fine-then-normalize.title'),v.up||v.down?say('resolve.choose-coarse-or-fine-then-normalize.body.yes'):say('resolve.choose-coarse-or-fine-then-normalize.body.no'));
      break;
    case 'output':
      add(say('output.read-the-numeric-components.title'),r.exp===10000?say('output.read-the-numeric-components.body.yes'):say('output.read-the-numeric-components.body.no', {sig: r.sig, exp: r.exp, decimal: decimalString(r)}));
      if(r.exp!==10000){
        add(say('output.what-shortest-and-closest-mean.title'),say('output.what-shortest-and-closest-mean.body'));
        add(say('output.separate-conversion-from-formatting.title'),say('output.separate-conversion-from-formatting.body'));
      }else add(say('output.distinguish-the-payload-from-its-display.title'),r.sig?say('output.distinguish-the-payload-from-its-display.body.yes'):say('output.distinguish-the-payload-from-its-display.body.no'));
      break;
  }
  const calculations=new Map(source.blocks.map(block=>[block.id,block]));
  const glossary={
    E:say('definition.E', {raw: trace.raw}),F:say('definition.F', {fraction: trace.fraction}),
    s:say('definition.s'),
    T:say('definition.T'),
    d_0:say('definition.d_0'),d_1:say('definition.d_1'),
    m:say('definition.m', {detail: trace.raw===255?say('definition.m.detail.yes'):say('definition.m.detail.no', {m: trace.m})}),q:say('definition.q', {q: trace.q}),e:say('definition.e', {gridexp: trace.gridExp}),
    Q:say('definition.Q', {Q: Q}),
    P:step.node==='resolve'?say('definition.P.yes'):say('definition.P.no'),
    α:say('definition.α'),W:say('definition.W'),I:say('definition.I', {detail: g?say('definition.I.detail.yes', {integral: g.integral}):say('definition.I.detail.no')}),
    r:say('definition.r'),a:say('definition.a'),
    h:step.node==='resolve'?say('definition.h.yes'):say('definition.h.no'),
    shift:say('definition.shift'),digit:say('definition.digit'),k:say('definition.k', {k: v.k}),p:say('definition.p', {p: v.p}),f:say('definition.f'),
    sig:say('definition.sig', {sig: r.sig}),exp:say('definition.exp', {exp: r.exp}),negative:say('definition.negative')
  };
  Object.assign(glossary,{
    integer:say('definition.integer'),cache:say('definition.cache'),high:say('definition.high'),
    δ:say('definition.δ'),margin:say('definition.margin'),
    digit_final:say('definition.digit_final'),sig_0:say('definition.sig_0'),
    up:say('definition.up'),down:say('definition.down')
  });
  const lead={
    decode:say('lead.decode'),
    'check-nonfinite':say('lead.check-nonfinite'),'check-power':say('lead.check-power'),
    'check-integer-range':say('lead.check-integer-range'),'check-integer-bits':say('lead.check-integer-bits'),'check-tiny':say('lead.check-tiny'),
    scale:say('lead.scale'),'check-coarse':say('lead.check-coarse'),coarse:say('lead.coarse'),
    'check-boundary':say('lead.check-boundary'),outside:say('lead.outside'),
    round:say('lead.round'),'check-fine-change':say('lead.check-fine-change'),'check-fine-tie':say('lead.check-fine-tie'),
    fine:say('lead.fine'),exact:say('lead.exact'),resolve:say('lead.resolve'),
    special:trace.branch==='power'?say('lead.special.yes'):trace.branch==='zero'?say('lead.special.no.yes'):say('lead.special.no.no'),
    integer:say('lead.integer'),output:say('lead.output')
  }[step.node];
  return {lead,blocks:blocks.map(block=>{const calculation=calculations.get(block.id);if(!calculation)throw new Error('Missing calculation '+block.id);return {...block,formula:calculation.formula,values:calculation.values,results:calculation.results,mathValues:calculation.mathValues,...(calculation.result?{result:true}:{})};}),definitions:source.definitions.map(([key])=>[key,glossary[key]]),next:trace.steps[index+1]?say('next.yes', {count: t(trace.steps[index+1].title)}):say('next.no')};
}
