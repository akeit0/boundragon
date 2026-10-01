// SPDX-License-Identifier: Unlicense
// Check denominator semantics and overlapping binary64 predicates.
import assert from 'node:assert/strict';
import {reference,nodeRate,percent,distributions} from '../docs/assets/branch-rates.js';
import {setLanguage} from '../docs/assets/i18n.js';
for(const format of ['binary32','binary64'])for(const id of distributions(format)){
  const sample=reference(format,id);
  assert.equal(Object.values(sample.branches).reduce((a,b)=>a+b,0),sample.n);
  assert.equal(Object.values(sample.reasons).reduce((a,b)=>a+b,0),sample.branches.fallback);
  assert.equal(nodeRate(sample,'exact').reached,sample.n);
}
const f32=reference('binary32','random-finite-bits');
assert.deepEqual(nodeRate(f32,'check-coarse'),{kind:'guard',reached:2080601,hits:800374});
assert.notEqual(percent(800374,2080601),percent(800374,f32.n));
const short32=reference('binary32','decimal-1-to-6');
assert.equal(nodeRate(short32,'check-fine-tie').reached,0);
assert.equal(percent(0,0),'not reached');
assert.equal(percent(0,short32.n),'0 observed');
const f64=reference('binary64','random-finite-bits');
const boundary=nodeRate(f64,'check-boundary').hits,rounding=nodeRate(f64,'check-rounding').hits;
const union=nodeRate(f64,'check-ambiguity').hits;
assert.equal(boundary+rounding-union,52);
assert.equal(union+f64.reasons.subnormal,nodeRate(f64,'exact').hits);
assert.equal(nodeRate(f64,'check-power-coarse'),null,'Unprofiled power procedure must not invent a rate');
setLanguage('ja');assert.equal(percent(0,0),'未到達');assert.equal(percent(0,10),'観測0件');
setLanguage('en');
console.log('Branch shares, reached-input denominators, zero observations and overlapping ambiguity counts agree.');
