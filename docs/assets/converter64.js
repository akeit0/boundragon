// SPDX-License-Identifier: Unlicense AND MIT
// Integer-accurate translation of centered_half_hot<false,false,*,true>,
// canonical_slow and canonical_power_of_two. Inherited finish: zmij-MIT.txt.
import {HIGH_POWERS,MAJOR,MINOR,SHIFTS,POW_MIN,COMPACT_BASE} from './tables64.js';
export {decimalString,exactDecimal} from './converter.js';
const MASK=(1n<<64n)-1n,FRAC=(1n<<52n)-1n,SIGN=1n<<63n;
const U64=n=>BigInt.asUintN(64,n),U32=n=>BigInt.asUintN(32,n);
const buffer=new ArrayBuffer(8),view=new DataView(buffer);
export function bitsOf(value){view.setFloat64(0,value,false);return view.getBigUint64(0,false);}
export function valueOf(bits){view.setBigUint64(0,bits,false);return view.getFloat64(0,false);}
export const hex=bits=>'0x'+U64(bits).toString(16).padStart(16,'0');
export function parseDecimalBits(input){
  input=input.trim();
  if(input.length>4096)throw new Error('Use at most 4096 input characters.');
  if(/^nan$/i.test(input))return 0x7ff8000000000000n;
  if(!/^[+-]?(?:(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|Infinity)$/i.test(input))throw new Error('Enter a decimal number, Infinity, -Infinity, or NaN.');
  // Number parses directly to binary64; no intervening narrower format.
  return bitsOf(/infinity/i.test(input)?(input[0]==='-'?-Infinity:Infinity):Number(input));
}
const decExp=(q,regular=true)=>Math.floor((q*315653-(regular?0:131072))/1048576);
const expShift=(q,k)=>q+Math.floor(-k*217707/65536)+1;
export function compactPower(p){
  const i=p-COMPACT_BASE,m=MINOR[i%28],[a,b]=MAJOR[Math.floor(i/28)];
  const low=b*m;let high=a*m+(low>>64n);
  const shift=1n-(high>>127n);
  high=(high<<shift)|((U64(low)>>63n)&(-shift));
  return {hi:high>>64n,lo:U64(high),major:Math.floor(i/28),minor:i%28};
}
function group(sig,digits,inverse,bound){
  const p=U64(sig*inverse),s=BigInt(digits),candidate=U64((p>>s)|(p<<(64n-s)));
  return candidate<=bound?{sig:candidate,removed:digits}:{sig,removed:0};
}
function normalize(sig,exp,negative){
  const removed=[];
  if(!sig)return {sig,exp,negative,removed};
  for(const [d,i,b] of [[1,14757395258967641293n,1844674407370955161n],[8,14368461155438497313n,184467440737n],[4,15170602326218735249n,1844674407370955n],[2,10330176681277348905n,184467440737095516n],[1,14757395258967641293n,1844674407370955161n]]){
    const result=group(sig,d,i,b);
    if(d===1&&!removed.length&&!result.removed)return {sig,exp,negative,removed};
    sig=result.sig;exp+=result.removed;if(result.removed)removed.push(result.removed);
  }
  return {sig,exp,negative,removed};
}
export function convert(bits){
  bits=U64(bits);
  const fraction=bits&FRAC,raw=Number((bits>>52n)&2047n),negative=Boolean(bits&SIGN),q=Math.max(raw,1)-1075;
  const m=raw&&raw!==2047?fraction|(1n<<52n):fraction;
  const steps=[];
  let gridExp=decExp(q,fraction!==0n)+1,guard;
  const step=(node,title,values={})=>steps.push({node,title,values});
  const check=(node,title,predicate,outcome,values,yes,no)=>steps.push({node,title,kind:'guard',predicate,outcome,values,nextAction:outcome?yes:no});
  const finish=(branch,result)=>{step('output','Canonical decimal',{coefficient:result.sig,exponent:result.exp,negative:result.negative,'removed zero groups':result.removed?.join(' + ')||'none'});return {format:'binary64',bits,fraction,raw,negative,q,m,branch,result,steps,gridExp,guard};};
  step('decode','Decode the bits',{sign:negative?1:0,'exponent field':raw,'fraction field':fraction,...(raw===2047?{}:{significand:m,'binary exponent q':q})});
  const slow=reason=>{
    step('exact','Exact fallback',{reason});
    const k=raw===0?-324:decExp(q),shift=raw===0?8:expShift(q,k+1)+9,p=-k-1;
    const power=raw===0?{hi:0xfcf62c1dee382c42n,lo:0x46729e03dd9ed7b5n}:compactPower(p);
    gridExp=k+1;
    const cache=(power.hi<<64n)|power.lo,product=(cache*(m<<BigInt(shift)))>>64n;
    const integral=product>>73n,f=U64(product>>9n),h=(power.hi>>BigInt(10-shift))+1n-(m&1n);
    const up=U64(f+h)<f,down=h>f;
    let digit=(f*10n+(1n<<63n)+6n)>>64n;
    const tie=f===1n<<62n;if(tie)digit=2n;
    const sig=up||down?integral+(up?1n:0n):digit?integral*10n+digit:integral;
    const exp=up||down||!digit?k+1:k;
    const result=up||down||!digit?normalize(sig,exp,negative):{sig,exp,negative};
    step('resolve','Resolve the two grids',{q,k,p,shift,cache,product,integral,f,h,up,down,digit,tie,'raw coefficient':sig,'raw exponent':exp});
    return finish('fallback',result);
  };
  check('check-special','Check the non-normal dispatch','E = 0 or E = 2047',raw===0||raw===2047,{'exponent field E':raw},'Handle zero, subnormals, infinity or NaN.','Check the selected integer range.');
  if(raw===0||raw===2047){
    if(raw===2047){step('special',fraction?'NaN payload':'Infinity');return finish('nonfinite',{sig:fraction,exp:10000,negative});}
    if(!fraction){step('special','Signed zero');return finish('zero',{sig:0n,exp:0,negative});}
    return slow('Subnormal dispatch');
  }
  const shift=1075-raw,integerRange=shift>=0&&shift<=52;
  check('check-integer-range','Check the integer-shortcut range','1023 ≤ E ≤ 1075',integerRange,{'exponent field E':raw},'Test whether the discarded binary bits are zero.','Bypass the integer-bit test and check for a power of two.');
  if(integerRange){
    const discarded=fraction&((1n<<BigInt(shift))-1n);
    check('check-integer-bits','Check the discarded binary bits','F mod 2^s = 0',!discarded,{shift,'discarded bits':discarded},'Return the exact integer shortcut.','Check for a power of two.');
    if(!discarded){const integer=m>>BigInt(shift);step('integer','Exact integer shortcut',{'right shift':shift,integer});return finish('integer',normalize(integer,0,negative));}
  }
  check('check-power','Check for a power of two','F = 0',!fraction,{'fraction field F':fraction},'Use the specialized power-of-two procedure.','Form the high-word product.');
  if(!fraction){
    const k=decExp(q,false),p=-k-1,shift=expShift(q,k+1)+9,hi=HIGH_POWERS[p-POW_MIN],combined=52+shift;
    gridExp=k+1;
    const integral=hi>>BigInt(73-combined),f=U64(hi<<BigInt(combined-9)),h=hi>>BigInt(10-shift),half=h>>1n;
    const up=h>MASK-f;
    step('power-scale','Scale a power of two',{k,p,shift,hi,integral,f,h,half});
    check('check-power-coarse','Select the coarse power grid','up or half > f',up||half>f,{up,half,f,h},'Normalize and return the coarse power result.','Select the fine power digit.');
    if(up||half>f){step('power-result','Return the power result',{'raw coefficient':integral+(up?1n:0n),'raw exponent':k+1});return finish('power',normalize(integral+(up?1n:0n),k+1,negative));}
    let digit=(f*10n+(1n<<63n)-1n)>>64n;
    const lower=(U64(f-half)*10n+MASK)>>64n;
    if(digit<lower)digit=lower;
    const sig=integral*10n+digit,exp=k;
    step('power-result','Return the power result',{digit,'lower endpoint digit':lower,'raw coefficient':sig,'raw exponent':exp});
    return finish('power',{sig,exp,negative});
  }
  const k=decExp(q),p=-k-1,fs=SHIFTS[raw]+2,hi=HIGH_POWERS[p-POW_MIN];gridExp=k+1;
  const n=m<<BigInt(fs),product=n*hi,u=product>>64n,centered=u+1025n;
  const residual=Number(centered&2047n)-1024,h=Number(hi>>BigInt(65-fs));
  const difference=Math.abs(residual)-h,mask=difference<0?-1:0,rounded=5*residual+512;
  const roundingGuard=U32(BigInt((rounded+5)&1023))|U32(BigInt(mask));
  guard={k,p,fs,hi,n,product,u,centered,residual,h,difference,mask,rounded,roundingGuard};
  step('scale','One high-word product',guard);
  const boundary=U32(BigInt(difference))<2n,rounding=roundingGuard<=10n;
  check('check-boundary','Test the boundary-uncertainty guard','0 ≤ d < 2',boundary,{residual,h,difference},'Record boundary ambiguity; evaluate the rounding test too.','Record a certain boundary; evaluate the rounding test too.');
  check('check-rounding','Test the fine-rounding ambiguity','g ≤ 10',rounding,{rounded,'rounding guard g':roundingGuard,mask},'Record fine-rounding ambiguity.','Record stable fine rounding or a masked coarse choice.');
  check('check-ambiguity','Combine both ambiguity tests','boundary or rounding',boundary||rounding,{boundary,rounding},'Use the complete exact finish.','Select a certified coarse or fine result.');
  if(boundary||rounding)return slow(boundary?'Boundary uncertainty':'Fine rounding uncertainty');
  const tail=(Math.floor(rounded/1024))&~mask,I=centered>>11n;
  step('choose','Select the certified adjustment',{I,residual,mask,rounded,tail});
  check('check-tail','Check for a coarse result','tail = 0',tail===0,{tail},'Normalize the coarse point.','Return the fine-grid coefficient directly.');
  if(!tail){step('coarse','Certify the coarse grid',{'raw coefficient':I,'raw exponent':k+1});return finish('coarse',normalize(I,k+1,negative));}
  const sig=I*10n+BigInt(tail);step('fine','Certify the fine grid',{'raw coefficient':sig,'raw exponent':k,tail});
  return finish('fine',{sig,exp:k,negative});
}
// Independent exact dyadic geometry. Never convert a 64-bit encoding to Number.
const BASE=1n<<1074n;
function units(bits){const raw=Number(bits>>52n),f=bits&FRAC;return raw?(f|(1n<<52n))<<BigInt(raw-1):f;}
export function interval(bits){
  const magnitude=bits&(SIGN-1n);
  if(!magnitude||magnitude>=0x7ff0000000000000n)return null;
  const center=units(magnitude),before=units(magnitude-1n),after=magnitude===0x7fefffffffffffffn?1n<<2098n:units(magnitude+1n);
  return {center:{n:center,d:BASE},lower:{n:center+before,d:BASE*2n},upper:{n:center+after,d:BASE*2n},closed:!(magnitude&1n)};
}
function scale(f,exp){return exp<0?{n:f.n*10n**BigInt(-exp),d:f.d}:{n:f.n,d:f.d*10n**BigInt(exp)};}
export function containsDecimal(bits,sig,exp){
  const bounds=interval(bits);if(!bounds)return false;
  const decimal=scale({n:sig,d:1n},-exp),lo=decimal.n*bounds.lower.d-bounds.lower.n*decimal.d,hi=bounds.upper.n*decimal.d-decimal.n*bounds.upper.d;
  return bounds.closed?lo>=0n&&hi>=0n:lo>0n&&hi>0n;
}
function ratio(n,d){const shift=BigInt(Math.max(0,d.toString(2).length-900));return Number(n>>shift)/Number(d>>shift);}
export function geometry(trace){
  const bounds=interval(trace.bits);if(!bounds)return null;
  const e=trace.gridExp,center=scale(bounds.center,e),origin=center.n/center.d;
  const local=f=>{const s=scale(f,e);return ratio(s.n-origin*s.d,s.d);};
  const selected=scale({n:trace.result.sig,d:1n},e-trace.result.exp);
  return {...bounds,origin,exp:e,x:local(bounds.center),lo:local(bounds.lower),hi:local(bounds.upper),selected:ratio(selected.n-origin*selected.d,selected.d)};
}
