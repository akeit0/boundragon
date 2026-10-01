// SPDX-License-Identifier: Unlicense
// node tests/test_explorer.mjs build/explorer/oracle[.exe]
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {convert,bitsOf,hex,geometry,interval,containsDecimal,decimalString,exactDecimal,parseDecimalBits} from '../docs/assets/converter.js';
import {explainStep} from '../docs/assets/explanations.js';
import {skippedGuards} from '../docs/assets/flowchart.js';
import {validateEquationBindings} from '../docs/assets/math.js';

if(!process.argv[2])throw new Error('Pass the path of the compiled tests/explorer_oracle.cpp executable.');
const inputs=new Set([0,0x80000000,0x7f800000,0xff800000,0x7fc12345,0xff800001,0x7f7fffff,0x49cd36ee,0xcd68ffb5,0x6b56e535]);
for(let raw=0;raw<255;raw++)for(const fraction of [0,1,2,3,9,10,11,0x12345,0x400000,0x7ffffe,0x7fffff]) {
  const bits=((raw<<23)|fraction)>>>0;inputs.add(bits);inputs.add((bits|0x80000000)>>>0);
}
for(const x of [.1,Math.PI,65536,65537,16777215,1.234,1e-45])inputs.add(bitsOf(x));
let state=0x579bf321;
for(let i=0;i<100000;i++){state=(Math.imul(state,1664525)+1013904223)>>>0;inputs.add(state);}
const bitsList=[...inputs];
const expected=execFileSync(process.argv[2],{input:bitsList.join('\n')+'\n',encoding:'utf8',maxBuffer:20*1024*1024}).trim().split(/\r?\n/);
assert.equal(expected.length,bitsList.length);
const branches={};
bitsList.forEach((bits,i)=>{
  const trace=convert(bits),r=trace.result;
  const [sig,exp,negative,fallback]=expected[i].split(' ');
  assert.equal(r.sig.toString(),sig,hex(bits)+' coefficient');assert.equal(r.exp,Number(exp),hex(bits)+' exponent');
  assert.equal(r.negative,negative==='1',hex(bits)+' sign');assert.equal(trace.branch==='fallback',fallback==='1',hex(bits)+' fallback decision');
  branches[trace.branch]=(branches[trace.branch]||0)+1;
  if(r.exp!==10000) {
    assert.equal(bitsOf(Number(decimalString(r))),bits,hex(bits)+' browser roundtrip');
    assert.equal(parseDecimalBits(decimalString(r)),bits,hex(bits)+' exact decimal roundtrip');
    if(r.sig) {
      assert.ok(containsDecimal(bits,r.sig,r.exp),hex(bits)+' exact interval inclusion');
      assert.notEqual(r.sig%10n,0n,hex(bits)+' canonical coefficient');
      const g=geometry(trace);assert.ok(Number.isFinite(g.x)&&Number.isFinite(g.selected));
      assert.ok(Math.abs(g.selected-g.x)<=1,hex(bits)+' selected point in displayed range');
    }
  }
});
for(const branch of ['coarse','fine','fallback','integer','power','zero','nonfinite'])assert.ok(branches[branch],branch+' coverage');
assert.equal(exactDecimal(interval(bitsOf(.1)).center),'0.100000001490116119384765625');
assert.equal(interval(bitsOf(1)).closed,true);
assert.equal(interval(0x3f800001).closed,false);
assert.equal(containsDecimal(0x3f800001,1000000059604644775390625n,-24),false,'odd midpoint excluded');
assert.equal(containsDecimal(0x3f800000,1000000059604644775390625n,-24),true,'even midpoint included');
assert.equal(parseDecimalBits('1.000000059604644775390625'),0x3f800000,'midpoint ties to even');
assert.equal(parseDecimalBits('1.000000059604644775390626'),0x3f800001,'no intermediate binary64 rounding');
assert.equal(parseDecimalBits('1.000000178813934326171875'),0x3f800002,'odd midpoint rounds upward to even');
assert.equal(parseDecimalBits(exactDecimal({n:1n,d:1n<<150n})),0,'half minimum subnormal ties to zero');
assert.equal(parseDecimalBits('1e99999999999999999999'),0x7f800000);
assert.equal(parseDecimalBits('-1e-99999999999999999999'),0x80000000);
assert.equal(parseDecimalBits('NaN'),0x7fc00000);
assert.throws(()=>parseDecimalBits('0x123'));
assert.deepEqual(convert(bitsOf(123400)).result.removed,[1,1],'integer normalization records digits, not divisors');
for(const bits of [0,0x80000000,0x7f800000,0x7fc12345,bitsOf(1),bitsOf(123400),bitsOf(.1),bitsOf(Math.PI),1,0x49cd36ee,0xcd68ffb5,0x6b56e535,0x47800001]){
  const trace=convert(bits);
  trace.steps.forEach((step,i)=>{
    const explanation=explainStep(trace,i);
    assert.ok(explanation.blocks.length>=2,step.node+' detailed explanation');
    // Materialize the displayed content, rather than serializing trace BigInts.
    for(const content of [explanation.lead,explanation.next,...explanation.blocks.flatMap(block=>[block.title,block.text])]){
      const rendered=typeof content==='object'?content.html:content;
      assert.ok(rendered&&!rendered.includes('undefined'),step.node+' substituted values');
    }
    for(const block of explanation.blocks)if(block.formula)validateEquationBindings(block.formula,{...block.values,...block.mathValues});
    for(const [symbol,definition] of explanation.definitions)assert.ok(symbol&&String(definition).length>30&&definition.html,symbol+' plain-language definition');
  });
}
const guards=bits=>convert(bits).steps.filter(s=>s.kind==='guard').map(s=>[s.node,s.outcome]);
assert.deepEqual(guards(bitsOf(.1)),[
  ['check-nonfinite',false],['check-power',false],['check-integer-range',false],['check-tiny',false],['check-coarse',true]
],'false dispatch checks remain explicit, followed by early coarse return');
assert.deepEqual(guards(bitsOf(65537)),[
  ['check-nonfinite',false],['check-power',false],['check-integer-range',true],['check-integer-bits',true]
],'integer bit test is reached only inside the selected range');
assert.deepEqual(guards(0x47800001).slice(2,5),[
  ['check-integer-range',true],['check-integer-bits',false],['check-tiny',false]
],'in-range fractional values show the failed inner bit test and continue');
assert.deepEqual(guards(bitsOf(Math.PI)).slice(-4),[
  ['check-coarse',false],['check-boundary',false],['check-fine-change',false],['check-fine-tie',false]
],'ordinary fine route records every evaluated Q40 condition');
const change=convert(0x6b56e535);
assert.deepEqual(guards(change.bits).at(-1),['check-fine-change',true]);
assert.equal(change.steps.some(s=>s.node==='check-fine-tie'),false,'short-circuit must not invent a tie-check outcome');
assert.equal(change.steps.find(s=>s.node==='exact').values['on tie threshold'],null);
assert.match(skippedGuards(change).find(s=>s.node==='check-fine-tie').reason,/short-circuits/);
assert.match(skippedGuards(convert(bitsOf(.1))).find(s=>s.node==='check-integer-bits').reason,/range was false/);
assert.deepEqual(guards(0x49cd36ee).at(-1),['check-fine-tie',true],'equal digits can still require exact tie resolution');
console.log(`PASS ${bitsList.length} inputs: exact C++ outputs, fallback decisions, rational interval inclusion, canonicalization and roundtrips`);
console.log(branches);
