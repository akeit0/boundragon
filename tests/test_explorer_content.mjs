// SPDX-License-Identifier: Unlicense
// Verify the authoring contract across real paths, including exponent extremes.
import assert from 'node:assert/strict';
import {FORMATS} from '../docs/assets/formats.js';
import {setLanguage} from '../docs/assets/i18n.js';
import {validateEquationBindings} from '../docs/assets/math.js';

function read(content){
  if(typeof content==='object'){
    const html=content.html;
    assert(!html.includes('{{'),`Unresolved field in ${content.id}`);
  }else assert.equal(typeof content,'string');
}
function calculations(explanation){
  return explanation.blocks.map(({id,formula,values,results,mathValues})=>({id,formula,values,results,mathValues}));
}
let count=0;
for(const format of Object.values(FORMATS)){
  const encodings=new Set(format.presets.map(([,bits])=>BigInt(bits)));
  for(let exponent=0;exponent<=format.maxRaw;exponent++)for(const fraction of [0n,1n,3n])encodings.add(BigInt(exponent)<<BigInt(format.fractionBits)|fraction);
  // Exercise varied significands as well as dispatch and power cases.
  let random=0x123456789abcdefn;
  for(let index=0;index<256;index++){
    random=BigInt.asUintN(64,random*6364136223846793005n+1442695040888963407n);
    encodings.add(BigInt.asUintN(format.width,random));
  }
  for(const encoding of encodings){
    const trace=format.convert(format.width===32?Number(encoding):encoding);
    const bits=format.bitCalculation(trace);
    if(bits)validateEquationBindings(bits.formula,bits.values);
    for(let index=0;index<trace.steps.length;index++){
      let source;
      for(const language of ['en','ja']){
        setLanguage(language);
        const explanation=format.teaching.explainStep(trace,index);
        read(explanation.lead);read(explanation.next);
        for(const block of explanation.blocks){
          read(block.title);read(block.text);
          if(block.formula)validateEquationBindings(block.formula,{...block.values,...block.mathValues});
        }
        if(trace.steps[index].kind==='guard')validateEquationBindings(`guard.${format.id}.${trace.steps[index].node}`);
        for(const [,meaning]of explanation.definitions)read(meaning);
        if(language==='en')source=calculations(explanation);
        else assert.deepEqual(calculations(explanation),source,`${format.id} ${encoding} step ${index}: language changed calculation`);
        count++;
      }
    }
  }
}
console.log(`Checked ${count} bilingual explanations: prose/equation bindings resolve and calculations agree.`);
