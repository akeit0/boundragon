// SPDX-License-Identifier: Unlicense
import {copy} from './content.js';
import {equation,resultEquation,calculationBlock} from './math-model.js';
// Teaching text is separate from the numeric kernel; values come from its trace.
import {decimalString,hex} from './converter.js';
import {locale} from './i18n.js';
import {explainJapanese} from './explanations-ja.js';
import {connectResult} from './result-derivation.js';
const say=(id,values)=>copy('binary32.'+id,values,'en');
const Q=1n<<40n;
const countZeros=r=>(r.removed??[]).reduce((a,b)=>a+b,0);
export function explainStep(trace,index){
  const step=trace.steps[index],v=step.values,r=trace.result;
  const blocks=[];
  const add=(title,text,formula,values,results)=>blocks.push(calculationBlock(title,text,formula,values,results));
  const positive=trace.negative?say('decode.sign.yes'):say('decode.sign.no');
  const next=trace.steps[index+1]?.title;
  if(step.kind==='guard'){
    const g=trace.guard;
    const checks={
      'check-nonfinite':()=>[
        say('checks.check-nonfinite.title'),
        say('checks.check-nonfinite.body'),
        "binary32.checks.check-nonfinite.calculation",{E:trace.raw},undefined],
      'check-power':()=>[
        say('checks.check-power.title'),
        say('checks.check-power.body'),
        "binary32.checks.check-power.calculation",{F:trace.fraction},undefined],
      'check-integer-range':()=>[
        say('checks.check-integer-range.title'),
        say('checks.check-integer-range.body'),
        "binary32.checks.check-integer-range.calculation",{E:trace.raw},undefined],
      'check-integer-bits':()=>[
        say('checks.check-integer-bits.title'),
        say('checks.check-integer-bits.body'),
        equation('binary32.checks.check-integer-bits.calculation', {discarded: v["discarded bits"]}),{E:trace.raw,F:trace.fraction},{s:v.shift}],
      'check-tiny':()=>[
        say('checks.check-tiny.title'),
        say('checks.check-tiny.body'),
        "binary32.checks.check-tiny.calculation",{m:trace.m},undefined],
      'check-coarse':()=>[
        say('checks.check-coarse.title'),
        say('checks.check-coarse.body'),
        "binary32.checks.check-coarse.calculation",{a:v.a,m:g.m,h:g.h},{'a + m + 1':v['left side']}],
      'check-boundary':()=>[
        say('checks.check-boundary.title'),
        say('checks.check-boundary.body'),
        "binary32.checks.check-boundary.calculation",{a:v.a,h:g.h,m:g.m},{'h + m + 1':g.h+g.m+1n}],
      'check-fine-change':()=>[
        say('checks.check-fine-change.title'),
        say('checks.check-fine-change.body'),
        "binary32.checks.check-fine-change.calculation",{d_0:v['lower digit'],d_1:v['upper digit']},undefined],
      'check-fine-tie':()=>[
        say('checks.check-fine-tie.title'),
        say('checks.check-fine-tie.body'),
        "binary32.checks.check-fine-tie.calculation",{T:v.T,Q:v.Q},{'T mod Q':v['T mod Q']}]
    };
    const [title,meaning,formula,values,results]=checks[step.node]();
    add(title,meaning);
    add(say('guard.evaluate-with-this-input.title'),say('guard.evaluate-with-this-input.body', {detail: step.outcome?say('guard.evaluate-with-this-input.body.detail.yes'):say('guard.evaluate-with-this-input.body.detail.no')}),formula,values,results);
    let control=step.nextAction;
    if(step.node==='check-integer-range'&&!step.outcome)control+=say('guard.control.the-discarded-bit-condition-is-not-evaluated');
    if(step.node==='check-fine-change'&&step.outcome)control+=say('guard.control.the-tie-threshold-condition-is-not-evaluated-the-first-term-of-the-or-condition-already-selected-fallback');
    add(say('guard.follow-the-control-flow.title'),control+say('guard.follow-the-control-flow.body.right'));
  }
  switch(step.node){
    case 'decode':
      add(say('decode.read-the-three-fields.title'),say('decode.read-the-three-fields.body', {bits: hex(trace.bits), status: trace.negative?1:0, raw: trace.raw, fraction: trace.fraction}));
      if(trace.raw===255){
        add(say('decode.recognize-a-special-value.title'),trace.fraction?say('decode.recognize-a-special-value.body.yes'):say('decode.recognize-a-special-value.body.no'));
      }else if(!trace.raw){
        add(say('decode.use-subnormal-spacing.title'),say('decode.use-subnormal-spacing.body'),"binary32.decode.use-subnormal-spacing.calculation",{F:trace.fraction},{m:trace.m});
      }else{
        add(say('decode.restore-the-hidden-bit.title'),say('decode.restore-the-hidden-bit.body'),"binary32.decode.restore-the-hidden-bit.calculation",{E:trace.raw,F:trace.fraction},{m:trace.m,q:trace.q});
      }
      add(say('decode.why-the-original-format-matters.title'),say('decode.why-the-original-format-matters.body', {positive: positive}));
      break;
    case 'special':
      if(trace.branch==='nonfinite'){
        add(say('special.preserve-the-numeric-api-contract.title'),say('special.preserve-the-numeric-api-contract.body', {detail: trace.negative?1:0}),"binary32.special.preserve-the-numeric-api-contract.calculation",{sig:r.sig,negative:r.negative},undefined);
        add(say('special.do-not-search-a-grid.title'),say('special.do-not-search-a-grid.body'));
      }else if(trace.branch==='zero'){
        add(say('special.use-the-zero-table-entry.title'),say('special.use-the-zero-table-entry.body'));
        add(say('special.return-without-interval-arithmetic.title'),say('special.return-without-interval-arithmetic.body', {detail: trace.negative?say('special.return-without-interval-arithmetic.body.detail.yes'):say('special.return-without-interval-arithmetic.body.detail.no')}),"binary32.special.return-without-interval-arithmetic.calculation",{negative:r.negative},undefined);
      }else{
        add(say('special.why-powers-get-a-separate-route.title'),say('special.why-powers-get-a-separate-route.body'));
        add(say('special.read-a-precomputed-canonical-answer.title'),say('special.read-a-precomputed-canonical-answer.body', {raw: trace.raw}),resultEquation(),{E:trace.raw},undefined);
        add(say('special.why-this-bypasses-the-filter.title'),say('special.why-this-bypasses-the-filter.body'));
      }
      break;
    case 'integer':
      add(say('integer.prove-that-no-fractional-bits-remain.title'),say('integer.prove-that-no-fractional-bits-remain.body', {right_shift: v['right shift']}),"binary32.integer.prove-that-no-fractional-bits-remain.calculation",{E:trace.raw,m:trace.m},{shift:v['right shift'],integer:v.integer});
      add(say('integer.normalize-decimal-zeroes.title'),say('integer.normalize-decimal-zeroes.body', {integer: v.integer, count: countZeros(r), note: countZeros(r)===1?say('integer.normalize-decimal-zeroes.body.note.yes'):say('integer.normalize-decimal-zeroes.body.note.no')}),resultEquation(),{integer:v.integer},undefined);
      add(say('integer.why-the-range-is-selective.title'),say('integer.why-the-range-is-selective.body'));
      break;
    case 'scale':{
      const e=v['decimal grid exponent'];
      add(say('scale.pick-the-two-neighboring-decimal-grids.title'),say('scale.pick-the-two-neighboring-decimal-grids.body', {q: trace.q, e: e}),"binary32.scale.pick-the-two-neighboring-decimal-grids.calculation",{q:trace.q},{e});
      add(say('scale.keep-40-fractional-bits.title'),say('scale.keep-40-fractional-bits.body'),"binary32.scale.keep-40-fractional-bits.calculation",{m:trace.m},{Q:v.Q,W:v.W,P:v['m × W + Q/2']});
      add(say('scale.center-the-leftover-fraction.title'),say('scale.center-the-leftover-fraction.body'),"binary32.scale.center-the-leftover-fraction.calculation",{P:v["m × W + Q/2"],Q:v.Q},{I:v.I,r:v.r,a:v['a = |r|']});
      add(say('scale.bound-the-omitted-information.title'),say('scale.bound-the-omitted-information.body', {m: v.m}),"binary32.scale.bound-the-omitted-information.calculation",{r:v.r,m:v.m,W:v.W},{h:v['h = floor(W/2)']});
      break;
    }
    case 'coarse':{
      const guard=trace.guard,a=guard.r<0n?-guard.r:guard.r;
      add(say('coarse.leave-a-full-error-margin.title'),say('coarse.leave-a-full-error-margin.body'),"binary32.coarse.leave-a-full-error-margin.calculation",{a,m:guard.m,h:guard.h},{'a + m + 1':a+guard.m+1n,margin:guard.h-(a+guard.m+1n)});
      add(say('coarse.prefer-the-grid-with-fewer-digits.title'),say('coarse.prefer-the-grid-with-fewer-digits.body', {integral: guard.integral, gridexp: trace.gridExp}),"binary32.coarse.prefer-the-grid-with-fewer-digits.calculation",{I:guard.integral,e:trace.gridExp},undefined);
      add(say('coarse.use-bounded-zero-removal.title'),say('coarse.use-bounded-zero-removal.body', {count: countZeros(r)}),resultEquation(),{I:guard.integral,e:trace.gridExp},undefined);
      break;
    }
    case 'outside':{
      const g=trace.guard,a=g.r<0n?-g.r:g.r;
      add(say('outside.the-coarse-acceptance-test-did-not-pass.title'),say('outside.the-coarse-acceptance-test-did-not-pass.body'));
      add(say('outside.exclude-the-coarse-point-with-its-error-bound.title'),say('outside.exclude-the-coarse-point-with-its-error-bound.body'),"binary32.outside.exclude-the-coarse-point-with-its-error-bound.calculation",{a,h:g.h,m:g.m},{'h + m + 1':g.h+g.m+1n});
      add(say('outside.spend-one-more-decimal-digit.title'),say('outside.spend-one-more-decimal-digit.body', {gridexp: trace.gridExp, status: trace.gridExp-1}),"binary32.outside.spend-one-more-decimal-digit.calculation",{I:g.integral,e:trace.gridExp},{exp:trace.gridExp-1});
      break;
    }
    case 'round':{
      add(say('round.move-the-residual-to-the-fine-grid.title'),say('round.move-the-residual-to-the-fine-grid.body'),"binary32.round.move-the-residual-to-the-fine-grid.calculation",{r:trace.guard.r,Q},{T:v.T});
      add(say('round.round-both-bounds-of-the-omitted-information.title'),say('round.round-both-bounds-of-the-omitted-information.body'),"binary32.round.round-both-bounds-of-the-omitted-information.calculation",{T:v.T,Q,m:trace.m},{d_0:v['lower digit'],d_1:v['upper digit']});
      add(say('round.do-not-accept-a-digit-yet.title'),say('round.do-not-accept-a-digit-yet.body'));
      break;
    }
    case 'fine':{
      const g=trace.guard,T=g.r*10n+Q/2n;
      add(say('fine.round-a-digit-not-the-whole-float.title'),say('fine.round-a-digit-not-the-whole-float.body'),"binary32.fine.round-a-digit-not-the-whole-float.calculation",{r:g.r,Q,m:g.m},{T,d_0:v['lower digit'],d_1:v['upper digit']});
      add(say('fine.prove-the-digit-cannot-change.title'),say('fine.prove-the-digit-cannot-change.body', {lower_digit: v['lower digit']}),"binary32.fine.prove-the-digit-cannot-change.calculation",{d_0:v['lower digit'],d_1:v['upper digit'],T,Q},{'T mod Q':T&(Q-1n)});
      add(say('fine.assemble-a-canonical-result.title'),say('fine.assemble-a-canonical-result.body'),resultEquation(),{I:g.integral,digit:v['lower digit'],e:trace.gridExp},{sig:r.sig,exp:r.exp});
      break;
    }
    case 'exact':
      if(trace.m<11n)add(say('exact.a-deliberately-excluded-tiny-case.title'),say('exact.a-deliberately-excluded-tiny-case.body', {m: trace.m}));
      else if(Object.hasOwn(v,'a'))add(say('exact.the-coarse-boundary-is-uncertain.title'),say('exact.the-coarse-boundary-is-uncertain.body'),"binary32.exact.the-coarse-boundary-is-uncertain.calculation",{a:v.a,'h + m + 1':v['h + m + 1']},undefined);
      else add(say('exact.fine-rounding-needs-more-information.title'),say('exact.fine-rounding-needs-more-information.body', {lower_digit: v['lower digit'], upper_digit: v['upper digit'], note: v['tie test evaluated']?say('exact.fine-rounding-needs-more-information.body.note.yes'):say('exact.fine-rounding-needs-more-information.body.note.no')}),"",{d_0:v['lower digit'],d_1:v['upper digit']},undefined);
      add(say('exact.recover-the-full-integer-product.title'),say('exact.recover-the-full-integer-product.body'));
      add(say('exact.fallback-is-part-of-the-algorithm.title'),say('exact.fallback-is-part-of-the-algorithm.body'));
      break;
    case 'resolve':
      add(say('resolve.rescale-with-the-complete-cache.title'),say('resolve.rescale-with-the-complete-cache.body', {k: v.k, p: v.p, shift: v.shift}),"binary32.resolve.rescale-with-the-complete-cache.calculation",{cache:v.cache,m:trace.m,shift:v.shift},{P:v.product,I:v.integral,f:v.f});
      add(say('resolve.correct-the-radius-for-midpoint-parity.title'),say('resolve.correct-the-radius-for-midpoint-parity.body'),"binary32.resolve.correct-the-radius-for-midpoint-parity.calculation",{cache:v.cache,shift:v.shift,m:trace.m},{high:v.cache>>32n,h:v.h});
      add(say('resolve.test-the-interval-endpoints.title'),say('resolve.test-the-interval-endpoints.body'), "binary32.resolve.test-the-interval-endpoints.calculation",{f:v.f,h:v.h},{up:v.up,down:v.down});
      add(say('resolve.round-the-fine-digit-and-correct-a-decimal-tie.title'),say('resolve.round-the-fine-digit-and-correct-a-decimal-tie.body', {detail: v.f===1n<<30n?say('resolve.round-the-fine-digit-and-correct-a-decimal-tie.body.detail.yes'):say('resolve.round-the-fine-digit-and-correct-a-decimal-tie.body.detail.no')}),"binary32.resolve.round-the-fine-digit-and-correct-a-decimal-tie.calculation",{f:v.f},{digit:(v.f*10n+(1n<<31n)+6n)>>32n,digit_final:v.digit});
      add(say('resolve.choose-coarse-or-fine-then-normalize.title'),v.up||v.down?say('resolve.choose-coarse-or-fine-then-normalize.body.yes'):say('resolve.choose-coarse-or-fine-then-normalize.body.no'),resultEquation(),{I:v.integral,up:v.up?1:0,digit:v.up||v.down?0:v.digit,k:v.k},{sig_0:v.sig});
      break;
    case 'output':
      add(say('output.read-the-numeric-components.title'),r.exp===10000?say('output.read-the-numeric-components.body.yes'):say('output.read-the-numeric-components.body.no', {sig: r.sig, exp: r.exp, decimal: decimalString(r)}),r.exp===10000?"binary32.output.read-the-numeric-components.calculation.yes":equation('binary32.output.read-the-numeric-components.calculation.no', {sign: r.negative?'−':'', sig: r.sig, exp: r.exp}),{sig:r.sig,exp:r.exp});
      if(r.exp!==10000){
        add(say('output.what-shortest-and-closest-mean.title'),say('output.what-shortest-and-closest-mean.body'));
        add(say('output.separate-conversion-from-formatting.title'),say('output.separate-conversion-from-formatting.body'));
      }else add(say('output.distinguish-the-payload-from-its-display.title'),r.sig?say('output.distinguish-the-payload-from-its-display.body.yes'):say('output.distinguish-the-payload-from-its-display.body.no'));
      break;
  }
  const guard=trace.guard;
  const glossary={
    E:say('definition.E', {raw: trace.raw}),
    F:say('definition.F', {fraction: trace.fraction}),
    s:say('definition.s'),
    T:say('definition.T'),
    d_0:say('definition.d_0'),
    d_1:say('definition.d_1'),
    m:say('definition.m', {detail: trace.raw===255?say('definition.m.detail.yes'):say('definition.m.detail.no', {m: trace.m})}),
    q:say('definition.q', {q: trace.q}),
    e:say('definition.e', {gridexp: trace.gridExp}),
    Q:say('definition.Q', {Q: Q}),
    P:step.node==='resolve'?say('definition.P.yes'):say('definition.P.no'),
    α:say('definition.α'),
    W:say('definition.W'),
    I:say('definition.I', {detail: guard?say('definition.I.detail.yes', {integral: guard.integral}):say('definition.I.detail.no')}),
    r:say('definition.r'),
    a:say('definition.a'),
    h:step.node==='resolve'?say('definition.h.yes'):say('definition.h.no'),
    shift:say('definition.shift'),
    digit:say('definition.digit'),
    k:say('definition.k', {k: v.k}),
    p:say('definition.p', {p: v.p}),
    f:say('definition.f'),
    sig:say('definition.sig', {sig: r.sig}),
    exp:say('definition.exp', {exp: r.exp}),
    negative:say('definition.negative'),
    integer:say('definition.integer'),
    cache:say('definition.cache'),
    high:say('definition.high'),
    δ:say('definition.δ'),
    margin:say('definition.margin'),
    digit_final:say('definition.digit_final'),
    sig_0:say('definition.sig_0'),
    up:say('definition.up'),
    down:say('definition.down')
  };
  const symbols={decode:trace.raw===255?['E','F']:['E','F','m','q'],special:['sig','exp','negative'],
    'check-nonfinite':['E'],'check-power':['F'],'check-integer-range':['E'],'check-integer-bits':['E','F','s'],
    'check-tiny':['m'],'check-coarse':['a','m','h'],'check-boundary':['a','h','m'],
    'check-fine-change':['d_0','d_1'],'check-fine-tie':['T','Q'],round:['r','m','Q','T','d_0','d_1'],
    integer:['m','shift','sig','exp'],scale:['m','q','e','α','Q','W','P','I','r','a','h','δ'],coarse:['I','r','a','m','h','Q','e'],
    outside:['I','r','a','m','h','Q','e'],fine:['I','r','m','Q','T','d_0','d_1','digit','e'],
    exact:trace.m<11n?['m']:Object.hasOwn(v,'a')?['r','a','m','h','Q']:['m','Q','digit'],
    resolve:['k','p','m','P','f','h','digit'],output:['sig','exp','negative']}[step.node]??[];
  const lead={
    'check-nonfinite':say('lead.check-nonfinite'),
    'check-power':say('lead.check-power'),
    'check-integer-range':say('lead.check-integer-range'),
    'check-integer-bits':say('lead.check-integer-bits'),
    'check-tiny':say('lead.check-tiny'),
    'check-coarse':say('lead.check-coarse'),
    'check-boundary':say('lead.check-boundary'),
    'check-fine-change':say('lead.check-fine-change'),
    'check-fine-tie':say('lead.check-fine-tie'),
    round:say('lead.round'),
    decode:say('lead.decode'),
    special:trace.branch==='power'?say('lead.special.yes'):trace.branch==='zero'?say('lead.special.no.yes'):say('lead.special.no.no'),
    integer:say('lead.integer'),
    scale:say('lead.scale'),
    coarse:say('lead.coarse'),
    outside:say('lead.outside'),
    fine:say('lead.fine'),
    exact:say('lead.exact'),
    resolve:say('lead.resolve'),
    output:say('lead.output')
  }[step.node];
  const used=new Set(symbols);
  for(const block of blocks)for(const key of [...Object.keys(block.values??{}),...Object.keys(block.results??{})]){
    if(Object.hasOwn(glossary,key))used.add(key);
  }
  const explanation={lead,blocks,definitions:[...used].map(key=>[key,glossary[key]]),next:next?say('next.yes', {next: next}):say('next.no')};
  return connectResult(trace,index,locale()==='ja'?explainJapanese(trace,index,explanation):explanation,'binary32');
}
