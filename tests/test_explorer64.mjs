// SPDX-License-Identifier: Unlicense
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {convert,bitsOf,hex,valueOf,parseDecimalBits,decimalString,containsDecimal,geometry,interval} from '../docs/assets/converter64.js';
if(!process.argv[2])throw new Error('Pass the compiled explorer64_oracle executable.');
const inputs=new Set([0n,1n,10n,0x8000000000000000n,0x7ff0000000000000n,0xfff0000000000000n,0x7ff8000000012345n,0xffffffffffffffffn,0x7fefffffffffffffn,bitsOf(.1),bitsOf(Math.PI)]);
for(let raw=0;raw<2047;raw++)for(const f of [0n,1n,2n,10n,11n,0x12345n,1n<<51n,(1n<<52n)-2n,(1n<<52n)-1n]){
  const bits=(BigInt(raw)<<52n)|f;inputs.add(bits);inputs.add(bits|(1n<<63n));
}
let seed=0x3156a59a71den;
for(let i=0;i<100000;i++){seed=BigInt.asUintN(64,seed*6364136223846793005n+1442695040888963407n);inputs.add(seed);}
const list=[...inputs],lines=execFileSync(process.argv[2],{input:list.join('\n')+'\n',encoding:'utf8',maxBuffer:32*1024*1024}).trim().split('\n');
assert.equal(lines.length,list.length);
const branches={},examples={};
for(let i=0;i<list.length;i++){
  const bits=list[i],trace=convert(bits),r=trace.result,[sig,exp,negative,slow]=lines[i].trim().split(' ');
  assert.equal(r.sig,BigInt(sig),hex(bits)+' coefficient');assert.equal(r.exp,Number(exp),hex(bits)+' exponent');assert.equal(r.negative,negative==='1');
  assert.equal(Number(slow),['fallback','power','zero','nonfinite'].includes(trace.branch)?1:0,'native outlined-call count '+hex(bits));
  branches[trace.branch]=(branches[trace.branch]??0)+1;
  for(const guard of trace.steps.filter(s=>s.kind==='guard'&&s.outcome))examples[guard.node]??=hex(bits);
  if(r.exp!==10000&&r.sig){
    assert.notEqual(r.sig%10n,0n,'canonical');assert.ok(containsDecimal(bits,r.sig,r.exp),'exact interval '+hex(bits));
    assert.equal(bitsOf(Number(decimalString(r))),bits,'binary64 roundtrip '+hex(bits));
    // Grid coordinates must remain finite at exponents that overflow Number's integer range.
    if(i<37000){const g=geometry(trace);assert.ok([g.x,g.lo,g.hi,g.selected].every(Number.isFinite),'finite geometry');assert.ok(g.lo<=g.x&&g.x<=g.hi);}
  }
  const boundary=trace.steps.find(s=>s.node==='check-boundary');
  if(boundary)assert.ok(trace.steps.some(s=>s.node==='check-rounding'),'both ambiguity tests evaluated even when boundary is true');
}
for(const text of ['0','-0','0.1','1e-324','5e-324','2.2250738585072014e-308','1.7976931348623157e308','1e309','-Infinity','9007199254740991'])assert.equal(valueOf(parseDecimalBits(text)),Number(text));
// Midpoint closure must follow input parity, including the minimum-normal boundary.
assert.equal(interval(0x0010000000000000n).closed,true);assert.equal(interval(0x0010000000000001n).closed,false);
console.log(`PASS ${list.length} binary64 inputs: C++ components and dispatch, exact interval inclusion, canonicalization, roundtrips and finite geometry`);
console.log(branches);console.log('Guard examples',examples);
