// SPDX-License-Identifier: Unlicense
// Format adapters own numeric APIs, teaching/graph models and presentation
// metadata. The controller does not inspect a format's encoding or kernel.
import * as binary32 from './converter.js';
import * as binary64 from './converter64.js';
import * as teaching32 from './explanations.js';
import * as teaching64 from './explanations64.js';
import * as flow32 from './flowchart.js';
import * as flow64 from './flowchart64.js';
import {bi,registerTranslations} from './i18n.js';
registerTranslations(teaching64.labels64);
function adapter(config){
  const {id,width,fractionBits,exponentBits,bias,numeric}=config,hexDigits=width/4,maxRaw=(1<<exponentBits)-1;
  const fromBigInt=n=>width===32?Number(n):n,signMask=1n<<BigInt(width-1),fractionMask=(1n<<BigInt(fractionBits))-1n;
  const randomBits=()=>{const words=crypto.getRandomValues(new Uint32Array(width/32));return fromBigInt(width===32?BigInt(words[0]):(BigInt(words[0])<<32n)|BigInt(words[1]));};
  const exponentOf=bits=>Number((BigInt(bits)>>BigInt(fractionBits))&BigInt(maxRaw));
  return {
    ...config,...numeric,hexDigits,maxRaw,
    parseHex(input){if(!new RegExp(`^(?:0x)?[0-9a-f]{1,${hexDigits}}$`,'i').test(input))throw new Error(`Enter 1–${hexDigits} hex digits, optionally starting with 0x.`);return fromBigInt(BigInt('0x'+input.replace(/^0x/i,'')));},
    fields(trace){
      const bits=trace.bits.toString(2).padStart(width,'0');
      return [
        {label:'Sign · 1 bit',bits:bits.slice(0,1),value:bi(trace.negative?'negative':'positive',trace.negative?'負':'正')},
        {label:`Exponent · ${exponentBits} bits`,bits:bits.slice(1,1+exponentBits),value:bi('stored: ','格納値：')+trace.raw},
        {label:`Fraction · ${fractionBits} bits`,bits:bits.slice(1+exponentBits),value:bi('stored: ','格納値：')+trace.fraction}
      ];
    },
    bitMeaning(trace){
      if(trace.raw===maxRaw)return bi(`An exponent of ${maxRaw} identifies infinity or NaN.`,`指数${maxRaw}は無限大・NaNです。`);
      const names=bi('E is the stored exponent; F is the stored fraction. Restoring them gives integer significand m and binary exponent q.','Eは格納された指数、Fは格納された仮数部です。この2つから整数仮数mと2進指数qを復元します。');
      const restoration=!trace.raw?bi('Exponent zero has no hidden leading 1, so m = F.','指数0には隠れた先頭の1がないので、m = Fです。'):bi(`Restore the hidden leading 1 in the stored fraction, as shown below. Subtract bias ${bias} and the ${fractionBits} fraction places from E.`,`下の式で、格納された仮数部に隠れた先頭の1を復元します。Eからバイアス${bias}と仮数の小数部分${fractionBits}ビットを引きます。`);
      return names+' '+restoration;
    },
    bitCalculation(trace){
      if(trace.raw===maxRaw)return null;
      const sign=trace.negative?'−':'';
      return {
        formula:`${id}.bits.${trace.raw?'normal':'subnormal'}`,
        values:{E:trace.raw,F:trace.fraction,sign,m:trace.m,q:trace.q},results:{m:trace.m,...(trace.raw?{q:trace.q}:{})}
      };
    },
    random(kind){
      let bits,attempts=0;
      if(kind==='unit')bits=numeric.bitsOf(Number(BigInt(randomBits())>>BigInt(Math.max(0,width-53)))/2**Math.min(width,53));
      else if(kind==='integer'){const [min,max]=config.integerPool;bits=numeric.bitsOf(min+Number(BigInt(randomBits())%BigInt(max-min)));}
      else if(kind==='subnormal'){const word=BigInt(randomBits());bits=fromBigInt((word&signMask)|((word%fractionMask)+1n));}
      else {do{bits=randomBits();attempts++;}while(exponentOf(bits)===maxRaw||(kind==='fallback'&&numeric.convert(bits).branch!=='fallback'&&attempts<10000));if(kind==='fallback'&&numeric.convert(bits).branch!=='fallback')bits=config.knownFallback;}
      return {kind,bits,attempts};
    },
    pageCopy:{
      '.edition':[`ALGORITHM EXPLORER / ${id.toUpperCase()}`,`アルゴリズムをたどる / ${id.toUpperCase()}`],
      '.section-heading .small':[`Native ${config.nativeName} · ${fractionBits+1} significant binary bits`,`ネイティブ${config.nativeName} · 2進の有効桁${fractionBits+1}ビット`],
      '#input-note':[`Decimal input is rounded directly to ${id} before conversion. Hex bits select an exact encoding.`,`10進入力は${id}に直接丸めます。16進ビットなら元の${width}ビットを指定できます。`],
      '#grid-title':['The two decimal grids · why shortest works','2つの10進格子 · 最短を選べる理由'],
      '.overview-heading p':[`Compare decimal candidates with the exact ${id} rounding interval. The picture shows the final selection; each step explains how it is certified.`,`10進数の候補と${id}の正確な丸め区間を比較します。図は最終的な選択を示し、各ステップでその保証の方法を説明します。`],
      '.context-notes p:nth-of-type(2)':[`This page follows the native ${id} ${id==='binary32'?'Fast':'Balanced'} path using tables generated from the C++ implementation. BigInt exposes its integer operations, intermediate values and evaluated guards. Browser timing does not measure C++ performance.`,`C++の表を生成し、${id}の${id==='binary32'?'Fast':'Balanced'}経路をたどります。BigIntで整数演算、中間値、評価した判定を表示します。ブラウザーの時間はC++の性能を表しません。`],
      ...config.pageCopy
    }
  };
}
export const FORMATS={
  binary32:adapter({id:'binary32',width:32,fractionBits:23,exponentBits:8,bias:127,subnormalExponent:-149,nativeName:'float',numeric:binary32,teaching:teaching32,flow:flow32,boundsDocument:'binary32_fast.html',integerPool:[65536,16777216],knownFallback:0x49cd36ee,
    presets:[['0.1',binary32.bitsOf(.1)],['Just above 1',0x3f800001],['π',binary32.bitsOf(Math.PI)],['65537',binary32.bitsOf(65537)],['Power of two',binary32.bitsOf(1)],['Boundary guard',0xcd68ffb5],['Fine digit guard',0x6b56e535],['Fine tie guard',0x49cd36ee],['Smallest subnormal',1],['Smallest normal',0x00800000],['Largest finite',0x7f7fffff],['−0',0x80000000],['Infinity',0x7f800000],['NaN payload',0x7fc12345]],
    powerBadge:'Power lookup',powerCaption:['The precomputed power result accounts for the interval’s shape.','生成済みの2の累乗の結果は区間の形を考慮しています。'],boundsLabel:['Q40 bounds and certificates ↗','Q40の上限と証明（英語）↗']
  }),
  binary64:adapter({id:'binary64',width:64,fractionBits:52,exponentBits:11,bias:1023,subnormalExponent:-1074,nativeName:'double',numeric:binary64,teaching:teaching64,flow:flow64,boundsDocument:'proof.html',integerPool:[4294967296,9007199254740992],knownFallback:0x011ffffffffffffen,
    presets:[['0.1',binary64.bitsOf(.1)],['Just above 1',0x3ff0000000000001n],['π',binary64.bitsOf(Math.PI)],['53-bit integer',0x433fffffffffffffn],['Power of two',0x3f20000000000000n],['Power cache recovery',0x3db0000000000000n],['Boundary guard',0x0f7ffffffffffffen],['Fine rounding guard',0x011ffffffffffffen],['Smallest subnormal',1n],['Smallest normal',0x0010000000000000n],['Largest finite',0x7fefffffffffffffn],['−0',0x8000000000000000n],['Infinity',0x7ff0000000000000n],['NaN payload',0x7ff8000000012345n]],
    powerBadge:'Power shortcut',powerCaption:['The specialized power procedure accounts for the interval’s shape.','2の累乗の専用手続きが区間の形を考慮しています。'],boundsLabel:['Centered guard bounds and certificates ↗','中心化した判定の上限と証明（英語）↗'],
    pageCopy:{'.explanation-grid article:nth-child(3) p':['The binary64 conversion retains an 11-bit centered residual from one high-word product. It evaluates both the boundary and fine-rounding ambiguity tests. Either uncertainty uses the complete cache; otherwise a mask selects a certified coarse or fine result.','binary64の変換では積の上位Wordから11ビットの中心化した残差を保ちます。境界と細かい丸めの不確かさを両方評価します。どちらかが不確かなら完全なキャッシュを使い、両方とも確かならマスクで保証された粗い・細かい候補を選びます。']}
  })
};
