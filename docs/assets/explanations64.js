// SPDX-License-Identifier: Unlicense
import {copy} from './content.js';
import {equation,resultEquation,calculationBlock} from './math-model.js';
// Bilingual teaching content shares one set of formulas and trace values.
import {bi,t} from './i18n.js';
import {decimalString,hex} from './converter64.js';
import {HIGH_POWERS,MAJOR,MINOR,SHIFTS,POW_MIN} from './tables64.js';
import {connectResult} from './result-derivation.js';
const say=(id,values)=>copy('binary64.'+id,values);
// Exact normalization exponent of a decimal power; no floating-point logarithm.
function powerExponent(p){
  const numerator=p>=0?10n**BigInt(p):1n,denominator=p<0?10n**BigInt(-p):1n;
  let b=numerator.toString(2).length-denominator.toString(2).length;
  if(b>=0?numerator<(denominator<<BigInt(b)):(numerator<<BigInt(-b))<denominator)b--;
  return b;
}
const cacheMax=POW_MIN+HIGH_POWERS.length-1,highBytes=HIGH_POWERS.length*8,
  compactBytes=MAJOR.length*16+MINOR.length*8;
export const labels64=[
  ['Select the coarse power grid','2の累乗の粗い格子を選ぶ'],['Coarse grid?','粗い格子を選ぶ？'],
  ['Normalize and return the coarse power result.','粗い候補の末尾の0を除き、返します。'],['Select the fine power digit.','細かい桁を選びます。'],
  ['Boundary uncertain?','境界が不確か？'],['Rounding uncertain?','丸めが不確か？'],['Either guard true?','どちらか成立？'],
  ['Recover','復元'],
  ['Power cache recovery','2の累乗のキャッシュ復元'],['Power','2の累乗'],['procedure','手続き'],['Subnormal','非正規数'],['Power-of-two','2の累乗'],['Power of two?','2の累乗？'],['11-bit residual','11ビットの残差'],
  ['Check the non-normal dispatch','非正規・特殊値の経路を判定'],['Check for a power of two','2の累乗を判定'],['One high-word product','積の上位Wordを1回で求める'],
  ['Test the fine-rounding ambiguity','細かい桁の丸めの不確かさ'],['Combine both ambiguity tests','2つの不確かさを合わせる'],['Select the certified adjustment','保証された調整値を求める'],['Check for a coarse result','粗い格子の結果か'],
  ['Scale a power of two','2の累乗をスケールする'],['Certify a coarse power result','2の累乗の粗い候補を保証'],['Exclude both coarse power points','2の累乗の粗い候補を除外'],['Check the nearest power digit','2の累乗の最近接の桁を判定'],['Check the lower power digit','2の累乗の下端の桁を判定'],['Recover the complete power cache','2の累乗の完全なキャッシュを復元'],['Return the power result','2の累乗の結果を返す'],
  ['Handle zero, subnormals, infinity or NaN.','ゼロ・非正規数・無限大・NaNを処理します。'],['Bypass the integer-bit test and check for a power of two.','整数のビット判定を省略し、2の累乗か調べます。'],['Check for a power of two.','2の累乗か調べます。'],['Use the specialized power-of-two procedure.','2の累乗の専用手続きを使います。'],['Form the high-word product.','積の上位Wordを求めます。'],
  ['Record boundary ambiguity; evaluate the rounding test too.','区間境界の不確かさを記録し、丸めの判定も評価します。'],['Record a certain boundary; evaluate the rounding test too.','確かな区間境界を記録し、丸めの判定も評価します。'],['Record fine-rounding ambiguity.','細かい桁の丸めの不確かさを記録します。'],['Record stable fine rounding or a masked coarse choice.','細かい桁の安定、またはマスクによる粗い候補の選択を記録します。'],['Select a certified coarse or fine result.','保証された粗い・細かい候補を選びます。'],['Normalize the coarse point.','粗い候補の末尾の0を除きます。'],['Return the fine-grid coefficient directly.','細かい格子の係数を直接返します。'],
  ['Normalize and return a certified coarse power result.','保証した粗い候補の末尾の0を除き、返します。'],['Try to certify the fine power digit.','細かい桁の保証を試みます。'],['Check stability of the nearest fine digit.','最近接の細かい桁が変わらないか調べます。'],['Recover the complete power cache.','完全なキャッシュを復元します。'],['Check stability of the lower endpoint digit.','下端の桁が変わらないか調べます。'],['Select the bounded fine power digit.','上下限で保証した細かい桁を選びます。'],
  ['Power procedure','2の累乗の手続き'],['Rounding guard','丸めの判定'],['Either ambiguous?','どちらか不確か？'],['Select adjustment','調整値を求める'],['tail = 0?','調整値が0？'],['Non-normal?','非正規・特殊値？'],['Subnormal / special','非正規・特殊値'],['Decode binary64','binary64を解読'],['High-word product','積の上位Word'],['Boundary distance','境界への距離'],['Coarse certified?','粗い候補を保証？'],['Both points out?','両候補は区間外？'],['Nearest stable?','最近接の桁は安定？'],['Lower stable?','下端の桁は安定？'],['Recover cache','表を復元'],['Power result','2の累乗の結果'],['Both evaluated','両方を評価'],
  ['reason','原因'],['Subnormal dispatch','非正規数の経路'],['Fine rounding uncertainty','細かい桁の丸めの不確かさ'],['residual','残差'],['difference','境界との差'],['mask','粗い候補のマスク'],['rounded','丸めの分子'],['rounding guard g','丸めの判定値 g'],['tail','調整値'],['boundary','境界が不確か'],['rounding','丸めが不確か'],['tie','同距離の補正'],['upper','上限'],['error','省いた情報の上限'],['half','下側の半径'],['low word','下位Word'],['low cache limb','キャッシュの下位Word'],['lower endpoint digit','下端の桁'],['browser binary64 value','ブラウザーが表示するbinary64値'],['Power-of-two procedure','2の累乗の手続き'],
  ['Sign · 1 bit','符号 · 1ビット'],['Exponent · 11 bits','指数 · 11ビット'],['Fraction · 52 bits','仮数部 · 52ビット'],['Enter 1–16 hex digits, optionally starting with 0x.','16進数を1〜16桁で入力してください。先頭の0xは省略できます。'],['Power shortcut','2の累乗の近道'],['Fine rounding guard','細かい桁の丸めの判定'],['Smallest normal','最小の正規数'],['53-bit integer','53ビットの整数']
];
export function explainStep(trace,index){
  const s=trace.steps[index],v=s.values,r=trace.result,g=trace.guard,blocks=[],symbols=new Set();
  const add=(title,text,formula,values,results)=>blocks.push(calculationBlock(title,text,formula,values,results));
  const use=(...keys)=>keys.forEach(k=>symbols.add(k));
  const glossary={
    E:say('definition.E', {raw: trace.raw}),
    F:say('definition.F', {fraction: trace.fraction}),
    m:say('definition.m', {m: trace.m}),
    q:say('definition.q', {q: trace.q}),
    s:say('definition.s'),
    k:say('definition.k'),
    p:say('definition.p'),
    fs:say('definition.fs'),
    hi:say('definition.hi'),
    b:say('definition.b'),
    T:say('definition.T'),
    n:say('definition.n'),
    z:say('definition.z'),
    Y:say('definition.Y'),
    v:say('definition.v'),
    centered:say('definition.centered'),
    ρ:say('definition.ρ'),
    u:say('definition.u'),
    I:say('definition.I'),
    w:say('definition.w'),
    h:s.node==='resolve'?say('definition.h.yes'):say('definition.h.no'),
    d:say('definition.d'),
    c:say('definition.c'),
    R:say('definition.R'),
    g:say('definition.g'),
    tail:say('definition.tail'),
    P:say('definition.P'),
    cache:say('definition.cache'),
    shift:say('definition.shift'),
    integer:say('definition.integer'),
    digit:say('definition.digit'),
    up:say('definition.up'),
    down:say('definition.down'),
    boundary:say('definition.boundary'),
    rounding:say('definition.rounding'),
    low:s.node==='power-cache'?say('definition.low.yes'):say('definition.low.no'),
    limit:say('definition.limit'),
    sig_0:say('definition.sig_0'),
    exp_0:say('definition.exp_0'),
    f:say('definition.f'),
    error:say('definition.error'),
    upper:say('definition.upper'),
    half:say('definition.half'),
    sig:say('definition.sig', {sig: r.sig}),
    exp:say('definition.exp', {exp: r.exp}),
    negative:say('definition.negative')
  };
  switch(s.node){
    case 'decode':
      use('E','F');if(trace.raw!==2047)use('m','q');
      add(say('decode.read-all-64-bits.title'),say('decode.read-all-64-bits.body', {bits: hex(trace.bits)}));
      add(say('decode.restore-this-binary-value.title'),trace.raw===2047?say('decode.restore-this-binary-value.body.yes'):trace.raw===0?say('decode.restore-this-binary-value.body.no.yes'):say('decode.restore-this-binary-value.body.no.no'),trace.raw===2047?undefined:(trace.raw===0?"binary64.decode.restore-this-binary-value.calculation.no.yes":"binary64.decode.restore-this-binary-value.calculation.no.no"),trace.raw===2047?undefined:{E:trace.raw,F:trace.fraction},trace.raw===2047?undefined:{m:trace.m,q:trace.q});
      if(trace.raw!==2047)add(say('decode.use-the-binary64-interval.title'),say('decode.use-the-binary64-interval.body'));break;
    case 'check-special':
      use('E');add(say('check-special.dispatch-before-the-approximation.title'),say('check-special.dispatch-before-the-approximation.body'),"binary64.check-special.dispatch-before-the-approximation.calculation",{E:trace.raw});break;
    case 'check-integer-range':
      use('E','s');add(say('check-integer-range.cover-exact-integers-below-2.title'),say('check-integer-range.cover-exact-integers-below-2.body'),"binary64.check-integer-range.cover-exact-integers-below-2.calculation",{E:trace.raw});break;
    case 'check-integer-bits':
      use('E','F','s');add(say('check-integer-bits.no-nonzero-bit-may-be-discarded.title'),say('check-integer-bits.no-nonzero-bit-may-be-discarded.body'),"binary64.check-integer-bits.no-nonzero-bit-may-be-discarded.calculation",{E:trace.raw,F:trace.fraction,'F mod 2^s':v['discarded bits']},{s:v.shift});break;
    case 'integer':
      use('m','s','sig','exp');add(say('integer.shift-then-remove-decimal-zeroes.title'),say('integer.shift-then-remove-decimal-zeroes.body'),resultEquation('binary64.integer.shift-then-remove-decimal-zeroes.calculation'),{m:trace.m,s:v['right shift']},{integer:v.integer});break;
    case 'check-power':
      use('F');add(say('check-power.a-dedicated-asymmetric-interval-procedure.title'),say('check-power.a-dedicated-asymmetric-interval-procedure.body'),"binary64.check-power.a-dedicated-asymmetric-interval-procedure.calculation",{F:trace.fraction});break;
    case 'scale':{
      use('m','q','k','p','z','b','T','hi','fs','n','Y','u','v','I','w','ρ','h');
      const b=powerExponent(g.p),I=g.centered>>11n;
      add(say('scale.measure-the-input-on-the-decimal-grids.title'),say('scale.measure-the-input-on-the-decimal-grids.body'),"binary64.scale.measure-the-input-on-the-decimal-grids.calculation",{q:trace.q},{k:g.k,p:g.p});
      add(say('scale.choose-a-power-from-a-finite-cache.title'),say('scale.choose-a-power-from-a-finite-cache.body', {cache_min:POW_MIN, cache_max:cacheMax, cache_entries:HIGH_POWERS.length, cache_index:g.p-POW_MIN}),'binary64.scale.choose-a-power-from-a-finite-cache.calculation',{q:trace.q,p:g.p},{k:g.k,index:g.p-POW_MIN});
      add(say('scale.normalize-the-cached-multiplier-to-64-bits.title'),say('scale.normalize-the-cached-multiplier-to-64-bits.body', {bits: hex(g.hi)}),"binary64.scale.normalize-the-cached-multiplier-to-64-bits.calculation",{p:g.p},{b,hi:g.hi});
      add(say('scale.one-64-64-bit-product-retain-its-upper-half.title'),say('scale.one-64-64-bit-product-retain-its-upper-half.body'),"binary64.scale.one-64-64-bit-product-retain-its-upper-half.calculation",{q:trace.q,b,m:trace.m,hi:g.hi},{fs:g.fs,n:g.n,u:g.u});
      add(say('scale.bound-both-sources-of-omitted-information.title'),say('scale.bound-both-sources-of-omitted-information.body'),"binary64.scale.bound-both-sources-of-omitted-information.calculation",{u:g.u},{v:g.u+1n});
      add(say('scale.why-add-1025-and-why-keep-eleven-bits.title'),say('scale.why-add-1025-and-why-keep-eleven-bits.body'),"binary64.scale.why-add-1025-and-why-keep-eleven-bits.calculation",{u:g.u,v:g.u+1n,k:g.k},{centered:g.centered,I,w:g.residual});
      add(say('scale.get-the-interval-radius-from-the-same-cached-word.title'),say('scale.get-the-interval-radius-from-the-same-cached-word.body'),"binary64.scale.get-the-interval-radius-from-the-same-cached-word.calculation",{hi:g.hi,fs:g.fs},{h:g.h});
      add(say('scale.what-is-stored-and-what-is-reconstructed-only-when-needed.title'),say('scale.what-is-stored-and-what-is-reconstructed-only-when-needed.body', {cache_entries: HIGH_POWERS.length, highBytes: highBytes, shift_entries: SHIFTS.length, major_entries: MAJOR.length, minor_entries: MINOR.length, correction_bytes: 0, compactBytes: compactBytes, full_cache_bytes: HIGH_POWERS.length*16, total_cache_bytes: highBytes+SHIFTS.length+compactBytes}));
      break;
    }
    case 'check-boundary':
      use('w','h','d');add(say('check-boundary.only-distances-zero-and-one-are-uncertain.title'),say('check-boundary.only-distances-zero-and-one-are-uncertain.body'),"binary64.check-boundary.only-distances-zero-and-one-are-uncertain.calculation",{w:v.residual,h:v.h},{d:v.difference});break;
    case 'check-rounding':
      use('w','R','c','g');add(say('check-rounding.guard-a-narrow-fine-rounding-window.title'),say('check-rounding.guard-a-narrow-fine-rounding-window.body'),"binary64.check-rounding.guard-a-narrow-fine-rounding-window.calculation",{w:g.residual,c:v.mask},{R:v.rounded,g:v['rounding guard g']});break;
    case 'check-ambiguity':
      use('d','g');add(say('check-ambiguity.combine-two-already-evaluated-results.title'),say('check-ambiguity.combine-two-already-evaluated-results.body'),"binary64.check-ambiguity.combine-two-already-evaluated-results.calculation",{d:g.difference,g:g.roundingGuard},{boundary:v.boundary,rounding:v.rounding});break;
    case 'choose':
      use('I','w','c','R','tail');add(say('choose.select-the-signed-fine-adjustment.title'),say('choose.select-the-signed-fine-adjustment.body'),"binary64.choose.select-the-signed-fine-adjustment.calculation",{I:v.I,R:v.rounded,c:v.mask},{tail:v.tail});break;
    case 'check-tail':
      use('tail');add(say('check-tail.avoid-an-unnecessary-multiply-divide-pair.title'),say('check-tail.avoid-an-unnecessary-multiply-divide-pair.body'),"binary64.check-tail.avoid-an-unnecessary-multiply-divide-pair.calculation",{tail:v.tail});break;
    case 'coarse':case 'fine':
      use('I','k','sig','exp');
      if(s.node==='fine')use('tail');else use('sig_0','exp_0');
      add(say('fine.return-the-certified-grid-point.title'),s.node==='coarse'?say('fine.return-the-certified-grid-point.body.yes'):say('fine.return-the-certified-grid-point.body.no'),resultEquation());break;
    case 'exact':
      use('m','q');add(say('exact.why-this-input-needs-the-complete-finish.title'),trace.raw===0?say('exact.why-this-input-needs-the-complete-finish.body.yes'):say('exact.why-this-input-needs-the-complete-finish.body.no'));
      add(say('exact.recover-both-cache-limbs.title'),say('exact.recover-both-cache-limbs.body'));break;
    case 'resolve':
      use('k','p','m','cache','shift','P','I','f','h','digit');
      add(say('resolve.use-the-complete-integer-product.title'),say('resolve.use-the-complete-integer-product.body'),"binary64.resolve.use-the-complete-integer-product.calculation",{k:v.k,shift:v.shift,m:trace.m},{p:v.p,P:v.product,I:v.integral,f:v.f});
      add(say('resolve.correct-endpoints-for-binary-parity.title'),say('resolve.correct-endpoints-for-binary-parity.body'),"binary64.resolve.correct-endpoints-for-binary-parity.calculation",{shift:v.shift,m:trace.m,f:v.f},{h:v.h,up:v.up,down:v.down});
      add(say('resolve.choose-a-grid-and-resolve-decimal-ties.title'),say('resolve.choose-a-grid-and-resolve-decimal-ties.body'),resultEquation('binary64.resolve.choose-a-grid-and-resolve-decimal-ties.calculation'),{f:v.f,sig_0:v['raw coefficient'],exp_0:v['raw exponent']},{digit:(v.f*10n+(1n<<63n)+6n)>>64n});break;
    case 'power-scale':
      use('k','p','hi','I','f','h','half');add(say('power-scale.scale-an-asymmetric-power-interval.title'),say('power-scale.scale-an-asymmetric-power-interval.body'),"binary64.power-scale.scale-an-asymmetric-power-interval.calculation",{k:v.k,shift:v.shift,hi:v.hi},{p:v.p,I:v.integral,f:v.f,h:v.h,half:v.half});break;
    case 'check-power-coarse':
      use('f','h','half');add(say('check-power-coarse.certify-a-coarse-point-over-the-error-interval.title'),say('check-power-coarse.certify-a-coarse-point-over-the-error-interval.body'),"binary64.check-power-coarse.certify-a-coarse-point-over-the-error-interval.calculation",{up:v.up,half:v.half,f:v.f,h:v.h});break;
    case 'power-result':
      use('sig','exp');add(say('power-result.return-the-specialized-power-answer.title'),say('power-result.return-the-specialized-power-answer.body'),resultEquation(),{sig_0:v['raw coefficient'],exp_0:v['raw exponent']});break;
    case 'special':
      use('sig','exp','negative');add(say('special.return-special-components-directly.title'),trace.branch==='zero'?say('special.return-special-components-directly.body.yes'):say('special.return-special-components-directly.body.no'),undefined,{sig:r.sig,exp:r.exp,negative:r.negative});break;
    case 'output':
      use('sig','exp','negative');add(say('output.read-the-returned-numeric-components.title'),r.exp===10000?say('output.read-the-returned-numeric-components.body.yes'):say('output.read-the-returned-numeric-components.body.no', {decimal: decimalString(r)}),r.exp===10000?"binary64.output.read-the-returned-numeric-components.calculation.yes":equation('binary64.output.read-the-returned-numeric-components.calculation.no', {sign: r.negative?'−':'', sig: r.sig, exp: r.exp}),{sig:r.sig,exp:r.exp});
      add(say('output.conversion-is-separate-from-formatting.title'),say('output.conversion-is-separate-from-formatting.body'));break;
    default:throw new Error('Missing binary64 teaching step: '+s.node);
  }
  if(s.kind==='guard')add(say('guard.follow-the-evaluated-decision.title'),say('guard.follow-the-evaluated-decision.body', {detail: s.outcome?say('guard.follow-the-evaluated-decision.body.detail.yes'):say('guard.follow-the-evaluated-decision.body.detail.no'), nextaction: t(s.nextAction)}));
  // Input bindings also introduce their named variables in the glossary.
  for(const block of blocks)for(const name of [...Object.keys(block.values??{}),...Object.keys(block.results??{})]){
    if(Object.hasOwn(glossary,name))symbols.add(name);
  }
  const leads={
    decode:say('lead.decode'),
    'check-special':say('lead.check-special'),
    'check-integer-range':say('lead.check-integer-range'),
    'check-integer-bits':say('lead.check-integer-bits'),
    integer:say('lead.integer'),
    'check-power':say('lead.check-power'),
    scale:say('lead.scale'),
    'check-boundary':say('lead.check-boundary'),
    'check-rounding':say('lead.check-rounding'),
    'check-ambiguity':say('lead.check-ambiguity'),
    choose:say('lead.choose'),
    'check-tail':say('lead.check-tail'),
    coarse:say('lead.coarse'),
    fine:say('lead.fine'),
    exact:say('lead.exact'),
    resolve:say('lead.resolve'),
    'power-scale':say('lead.power-scale'),
    'check-power-coarse':say('lead.check-power-coarse'),
    'power-result':say('lead.power-result'),
    special:say('lead.special'),
    output:say('lead.output')
  };
  return connectResult(trace,index,{lead:leads[s.node],blocks,definitions:[...symbols].map(key=>[key,glossary[key]]),next:trace.steps[index+1]?say('next.step', {title: t(trace.steps[index+1].title)}):say('next.complete')},'binary64');
}
