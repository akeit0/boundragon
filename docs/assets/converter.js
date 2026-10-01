// SPDX-License-Identifier: Unlicense AND MIT
// BigInt translation of binary32 Fast and the inherited exact finish formulas.
// See include/boundragon/detail/float_decimal.h and ./zmij-MIT.txt.
import {PARAMETERS, POWER_SIGS, POWERS} from './tables.js';

const Q = 1n << 40n, MASK = Q - 1n;
const U32 = n => BigInt.asUintN(32, n);
const abs = n => n < 0n ? -n : n;
const buffer = new ArrayBuffer(4), view = new DataView(buffer);
export function bitsOf(value) { view.setFloat32(0, value, false); return view.getUint32(0, false); }
export function valueOf(bits) { view.setUint32(0, bits, false); return view.getFloat32(0, false); }
export const hex = bits => '0x' + (bits >>> 0).toString(16).padStart(8, '0');

// Parse decimal directly to binary32 with exact rational rounding. Parsing via
// JavaScript Number first can double-round long inputs beside a float midpoint.
export function parseDecimalBits(input) {
  input=input.trim();
  if(input.length>4096)throw new Error('Use at most 4096 input characters.');
  if(/^nan$/i.test(input))return 0x7fc00000;
  if(/^[+]?infinity$/i.test(input))return 0x7f800000;
  if(/^-infinity$/i.test(input))return 0xff800000;
  const match=/^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:e([+-]?\d+))?$/i.exec(input);
  if(!match)throw new Error('Enter a decimal number, Infinity, -Infinity, or NaN.');
  const sign=match[1]==='-'?0x80000000:0;
  const after=match[3]??match[4]??'',digits=((match[2]??'')+after).replace(/^0+/,'');
  if(!digits)return sign;
  const exp=Number(match[5]??0)-after.length,order=exp+digits.length-1;
  if(order>39)return (sign|0x7f800000)>>>0;
  if(order<-46)return sign;
  let n=BigInt(digits),d=1n;
  if(exp>=0)n*=10n**BigInt(exp);else d=10n**BigInt(-exp);
  const round=(n,d)=>{const q=n/d,r=n%d;return q+(r*2n>d||(r*2n===d&&(q&1n))?1n:0n);};
  let exponent=n.toString(2).length-d.toString(2).length;
  if(exponent>=0 ? n<(d<<BigInt(exponent)) : (n<<BigInt(-exponent))<d)exponent--;
  if(exponent<-126) {
    const m=round(n<<149n,d);
    return (sign|Number(m))>>>0; // Includes rounding into the minimum normal.
  }
  let q=exponent-23;
  let m=q>=0?round(n,d<<BigInt(q)):round(n<<BigInt(-q),d);
  if(m===1n<<24n){m>>=1n;q++;}
  const raw=q+150;
  if(raw>=255)return (sign|0x7f800000)>>>0;
  return (sign|(raw<<23)|Number(m-(1n<<23n)))>>>0;
}
const decExp = (q, regular = true) => Math.floor((q * 315653 - (regular ? 0 : 131072)) / 1048576);
const powerExp = p => Math.floor(p * 217707 / 65536);

function normalize(sig, exp, negative) {
  const removed = [];
  while (sig && sig % 10n === 0n) { sig /= 10n; exp++; removed.push(1); }
  return {sig, exp, negative, removed};
}

// The integer value is identical to the C++ modular-inverse / rotate test.
// Keep the actual group decisions visible, rather than a generic string trim.
function group(sig, digits, inverse, bound) {
  const product = U32(sig * inverse), shift = BigInt(digits);
  const candidate = U32((product >> shift) | (product << (32n - shift)));
  return candidate <= bound ? {sig: candidate, removed: digits} : {sig, removed: 0};
}
function boundedNormalize(sig, exp, negative, coarse = false) {
  const removed = [];
  if (!sig) return {sig, exp, negative, removed};
  if (!coarse) {
    const first = group(sig, 1, 3435973837n, 429496729n);
    if (!first.removed) return {sig, exp, negative, removed};
    sig = first.sig; exp++; removed.push(1);
  }
  for (const [digits, inverse, bound] of [[4,989560465n,429496n], [2,3264175145n,42949672n], [1,3435973837n,429496729n]]) {
    const result = group(sig, digits, inverse, bound);
    sig = result.sig; exp += result.removed;
    if (result.removed) removed.push(result.removed);
  }
  return {sig, exp, negative, removed};
}

function exact(bits) {
  let m = BigInt(bits & 0x7fffff), raw = (bits >>> 23) & 255;
  const negative = Boolean(bits >>> 31), regular = m !== 0n || raw <= 1;
  if (!raw) { if (!m) return {result: {sig:0n,exp:0,negative}, detail:{}}; raw = 1; }
  else m |= 1n << 23n;
  const q = raw - 150, k = decExp(q, regular), p = -k - 1;
  const shift = q + powerExp(p) + 8, cache = POWERS[p + 32], high = cache >> 32n;
  const product = (cache * (m << BigInt(shift))) >> 32n;
  const integral = product >> 39n, f = U32(product >> 7n);
  let h = high >> BigInt(8 - shift), up, down, digit;
  if (regular) {
    h += 1n - (m & 1n);
    up = U32(f + h) < f; down = h > f;
    digit = (f * 10n + (1n << 31n) + 6n) >> 32n;
    if (f === (1n << 30n)) digit = 2n;
  } else {
    up = h > 0xffffffffn - f; down = (h >> 1n) > f;
    digit = (f * 10n + (1n << 31n) - 1n) >> 32n;
    const lowerDigit = (U32(f - (h >> 1n)) * 10n + 0xffffffffn) >> 32n;
    if (digit < lowerDigit) digit = lowerDigit;
  }
  const sig = (integral + (up ? 1n : 0n)) * 10n + ((up || down) ? 0n : digit);
  return {result: boundedNormalize(sig,k,negative), detail:{q,k,p,shift,cache,product,integral,f,h,up,down,digit,sig}};
}

export function convert(bits) {
  bits >>>= 0;
  const fraction = bits & 0x7fffff, raw = (bits >>> 23) & 255, negative = Boolean(bits >>> 31);
  const q = Math.max(raw,1) - 150, m = BigInt(fraction | (raw ? 0x800000 : 0));
  const steps = [];
  const step = (node,title,text,values = {},extra = {}) => steps.push({node,title,text,values,...extra});
  const check = (node,title,predicate,outcome,values,yes,no) =>
    step(node,title,'Evaluate this decision before choosing the next branch.',values,
      {kind:'guard',predicate,outcome,nextAction:outcome?yes:no});
  const finish = (branch,result) => {
    step('output','Canonical decimal', result.exp === 10000 ? 'Nonfinite values keep a sentinel exponent and the original sign and payload.' : 'The coefficient has no trailing decimal zeroes. Together with the exponent and sign, it is the closest shortest decimal for this binary32 input.',
      {coefficient:result.sig, exponent:result.exp, negative:result.negative, 'removed zero groups':result.removed?.join(' + ') || 'none'});
    return {bits,fraction,raw,negative,q,m,branch,result,steps,gridExp:decExp(q,fraction !== 0 || raw <= 1)+1};
  };
  step('decode','Decode the bits',raw === 255 ? 'Exponent 255 identifies infinity or a NaN payload.' : raw === 0 ? 'Subnormals have no hidden bit. Their spacing is 2⁻¹⁴⁹.' : 'A normal float is a 24-bit integer significand multiplied by a power of two.',
    raw === 255 ? {sign:negative ? 1 : 0,'exponent field':raw,'fraction / payload':fraction} :
      {sign:negative ? 1 : 0, 'exponent field':raw, 'fraction field':fraction, significand:m, 'binary exponent q':q});
  check('check-nonfinite','Check for infinity or NaN','E = 255',raw===255,{'exponent field E':raw},'Return the nonfinite components.','Continue to the zero/power check.');
  if (raw === 255) {
    step('special',fraction ? 'NaN payload' : 'Infinity','No decimal grid is needed. Preserve the sign and fraction payload.');
    return finish('nonfinite',{sig:BigInt(fraction),exp:10000,negative});
  }
  check('check-power','Check for zero or a power of two','F = 0',fraction===0,{'fraction field F':fraction},'Use the generated zero/power result.','Check the selected integer range.');
  if (fraction === 0) {
    const t = PARAMETERS[raw];
    step('special',raw ? 'Power lookup' : 'Signed zero',raw ? 'A normal power of two usually has an asymmetric lower interval. A separately generated table already contains its canonical shortest result.' : 'Table entry zero returns zero and preserves its sign.',
      {'table index':raw, 'stored coefficient':POWER_SIGS[raw], 'stored exponent':Number((t >> 48n) & 255n)-45});
    return finish(raw ? 'power' : 'zero',{sig:POWER_SIGS[raw],exp:Number((t>>48n)&255n)-45,negative});
  }
  const shift = 150 - raw;
  const integerRange=raw>=143&&raw<=150;
  check('check-integer-range','Check the integer-shortcut range','143 ≤ E ≤ 150',integerRange,{'exponent field E':raw},'Test whether the discarded binary bits are zero.','Bypass the integer-bit test and check the tiny-subnormal case.');
  let exactInteger=false;
  if(integerRange){
    const mask=(1n<<BigInt(shift))-1n,discarded=BigInt(fraction)&mask;
    exactInteger=discarded===0n;
    check('check-integer-bits','Check the discarded binary bits','F mod 2^s = 0',exactInteger,{shift,'discarded bits':discarded},'Return the exact integer shortcut.','Continue to the tiny-subnormal check.');
  }
  if (exactInteger) {
    const integer = m >> BigInt(shift);
    step('integer','Exact integer shortcut','Fast checks the eight binades [2¹⁶, 2²⁴). Here all fractional binary bits are zero, so an integer shift gives the coefficient directly.',
      {'right shift':shift, integer});
    return finish('integer',normalize(integer,0,negative));
  }
  const fallback = (reason,values = {}) => {
    step('exact', 'Exact fallback',reason + ' The complete cached integer product resolves interval endpoints and decimal ties.',values);
    const e = exact(bits);
    step('resolve','Resolve the two grids','The exact finish tests whether a coarse point is inside the interval. Otherwise it selects the closest valid fine-grid digit, including ties-to-even corrections.',e.detail);
    return finish('fallback',e.result);
  };
  check('check-tiny','Check the tiny-subnormal exception','m < 11',m<11n,{significand:m},'Use the complete exact finish.','Form the exponent-indexed Q40 product.');
  if (m < 11n) return fallback('The first ten nonzero subnormal encodings bypass the approximate filter.',{significand:m});
  const t = PARAMETERS[raw], w = t & MASK, exp = Number(t >> 56n)-45;
  const product = m * w + Q/2n, integral = product >> 40n;
  const r = (product & MASK)-Q/2n, a = abs(r), h = w >> 1n;
  step('scale','One Q40 product','W is a downward-rounded cached scale. Round the product to the nearest coarse integer I, then retain the signed residual r. The omitted center error is less than m.',
    {Q,W:w,m,'decimal grid exponent':exp,'m × W + Q/2':product,I:integral,r,'a = |r|':a,'h = floor(W/2)':h});
  check('check-coarse','Test the coarse acceptance guard','a + m + 1 < h',a+m+1n<h,{a,m,h,'left side':a+m+1n,'right side':h},'Accept and normalize the coarse point.','The coarse point is not certified; evaluate the boundary guard.');
  if (a + m + 1n < h) {
    step('coarse','Certify the coarse grid','Even after allowing for cache error, I is strictly inside the rounding interval. The coarse candidate is safe and shorter; remove zeroes in 4/2/1 groups.',
      {'a + m + 1':a+m+1n,h,'strict inequality':true,'raw coefficient':integral,'raw exponent':exp});
    return {...finish('coarse',boundedNormalize(integral,exp,negative,true)), gridExp:exp, guard:{r,w,h,m,integral}};
  }
  check('check-boundary','Test the boundary-uncertainty guard','a ≤ h + m + 1',a<=h+m+1n,{a,m,h,'left side':a,'right side':h+m+1n},'Use exact fallback to resolve the uncertain boundary.','The coarse grid is certainly outside; prepare the fine digit.');
  if (a <= h+m+1n) return {...fallback('The approximate center is too close to an interval endpoint to certify the coarse decision.',
    {a,'h + m + 1':h+m+1n}),gridExp:exp,guard:{r,w,h,m,integral}};
  step('outside','Exclude the coarse grid','The nearest coarse point is certainly outside the interval. The certified bound also excludes the other coarse point. Move to the grid with ten times finer spacing.',
    {a,'h + m + 1':h+m+1n,'outside guard':true});
  const rounded = r*10n+Q/2n, tail = rounded >> 40n, upperTail = (rounded+m*10n)>>40n;
  step('round','Compute the fine rounding bounds','Evaluate the fine digit at both ends of the permitted center-error range.',{T:rounded,Q,m,'lower digit':tail,'upper digit':upperTail});
  check('check-fine-change','Test whether the fine digit changes','d_0 ≠ d_1',tail!==upperTail,{'lower digit':tail,'upper digit':upperTail},'Use exact fallback; the tie test is not evaluated.','Evaluate the fine tie-threshold guard.');
  let fineTie=false;
  if(tail===upperTail){
    fineTie=(rounded&MASK)===0n;
    check('check-fine-tie','Test the fine tie threshold','T mod Q = 0',fineTie,{T:rounded,Q,'T mod Q':rounded&MASK},'Use exact fallback to resolve the tie.','Accept the stable, non-tie fine digit.');
  }
  if (tail !== upperTail || fineTie) return {...fallback('The fine-digit rounding could change within the error bound, or lies on a decimal tie threshold.',
    {'lower digit':tail,'upper digit':upperTail,'tie test evaluated':tail===upperTail,'on tie threshold':tail===upperTail?fineTie:null}),gridExp:exp,guard:{r,w,h,m,integral}};
  step('fine','Certify the fine grid','The fine digit is unchanged across the entire center-error interval and is not on a tie threshold. It is nonzero, so the result is already canonical.',
    {'10r + Q/2':rounded,'lower digit':tail,'upper digit':upperTail,'coefficient = 10I + digit':integral*10n+tail,'exponent':exp-1});
  return {...finish('fine',{sig:integral*10n+tail,exp:exp-1,negative}),gridExp:exp,guard:{r,w,h,m,integral}};
}

// Exact rational geometry, independent of the fixed-point approximation.
const BASE = 1n << 149n;
function units(bits) {
  const raw = bits >>> 23, f = BigInt(bits & 0x7fffff);
  return raw ? (f | (1n << 23n)) << BigInt(raw-1) : f;
}
export function interval(bits) {
  const magnitude = bits & 0x7fffffff;
  if (!magnitude || magnitude >= 0x7f800000) return null;
  const center = units(magnitude), before = units(magnitude-1);
  const after = magnitude === 0x7f7fffff ? 1n<<277n : units(magnitude+1);
  return {center:{n:center,d:BASE},lower:{n:center+before,d:BASE*2n},upper:{n:center+after,d:BASE*2n},closed:(magnitude&1)===0};
}
function scale(f,exp) { return exp < 0 ? {n:f.n*10n**BigInt(-exp),d:f.d} : {n:f.n,d:f.d*10n**BigInt(exp)}; }
export function containsDecimal(bits,sig,exp) {
  const bounds=interval(bits);
  if (!bounds) return false;
  const decimal=scale({n:sig,d:1n},-exp);
  const lower=decimal.n*bounds.lower.d-bounds.lower.n*decimal.d;
  const upper=bounds.upper.n*decimal.d-decimal.n*bounds.upper.d;
  return bounds.closed ? lower>=0n&&upper>=0n : lower>0n&&upper>0n;
}
export function geometry(trace) {
  const bounds = interval(trace.bits);
  if (!bounds) return null;
  const e = trace.gridExp, center = scale(bounds.center,e), origin = center.n/center.d;
  const local = f => { const s=scale(f,e); return Number(s.n-origin*s.d)/Number(s.d); };
  const selected = scale({n:trace.result.sig,d:1n},e-trace.result.exp);
  return {...bounds,origin,exp:e,x:local(bounds.center),lo:local(bounds.lower),hi:local(bounds.upper),
    selected:Number(selected.n-origin*selected.d)/Number(selected.d)};
}
export function exactDecimal(f) {
  let n=f.n,d=f.d;
  while (d>1n && n%2n===0n && d%2n===0n) { n/=2n; d/=2n; }
  let places=0;
  while (d>1n) { if (d%2n) throw new Error('Expected a dyadic fraction'); d/=2n; places++; }
  const digits=(n*5n**BigInt(places)).toString().padStart(places+1,'0');
  return places ? digits.slice(0,-places)+'.'+digits.slice(-places) : digits;
}
export function decimalString(result) {
  const sign=result.negative?'-':'';
  if (result.exp===10000) return result.sig ? 'NaN' : sign+'Infinity';
  if (!result.sig) return sign+'0';
  const s=result.sig.toString(), exponent=result.exp+s.length-1;
  if (exponent>=-4 && exponent<9) {
    const at=s.length+result.exp;
    return sign+(at<=0?'0.'+'0'.repeat(-at)+s:at>=s.length?s+'0'.repeat(at-s.length):s.slice(0,at)+'.'+s.slice(at));
  }
  return sign+s[0]+(s.length>1?'.'+s.slice(1):'')+'e'+(exponent>=0?'+':'')+exponent;
}
