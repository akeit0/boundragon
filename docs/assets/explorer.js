// SPDX-License-Identifier: Unlicense
import {decimalString,exactDecimal} from './converter.js';
import {FORMATS} from './formats.js';
import {renderMath,renderSymbol,renderBindings} from './math.js';
import {appendCopy,copy} from './content.js';
import {renderNotation} from './notation.js';
import {decimalPowerLabel} from './math-values.js';
import {distributions,distributionLabel,reference,percent,countText,nodeRate} from './branch-rates.js';
import {locale,setLanguage,applyPageLanguage,t,bi} from './i18n.js';
const $ = id => document.getElementById(id);
const initialURL=new URL(location.href);
let format=FORMATS[initialURL.searchParams.get('format')]??(/^0x[0-9a-f]{16}$/i.test(initialURL.searchParams.get('bits')??'')?FORMATS.binary64:FORMATS.binary32);
let presets=format.presets;
// Shared controller calls the selected adapter, never its encoding directly.
const convert=(...args)=>format.convert(...args),bitsOf=(...args)=>format.bitsOf(...args),valueOf=(...args)=>format.valueOf(...args),hex=(...args)=>format.hex(...args);
const geometry=(...args)=>format.geometry(...args),interval=(...args)=>format.interval(...args),containsDecimal=(...args)=>format.containsDecimal(...args),parseDecimalBits=(...args)=>format.parseDecimalBits(...args);
const explainStep=(...args)=>format.teaching.explainStep(...args),renderFlowchart=(...args)=>format.flow.renderFlowchart(...args),skippedGuards=(...args)=>format.flow.skippedGuards(...args);
const names={coarse:'Coarse grid accepted',fine:'Fine grid accepted',fallback:'Exact fallback',integer:'Integer shortcut',power:'Power lookup',zero:'Signed zero',nonfinite:'Nonfinite'};
const defaultFlowZoom=1;
let current, position=0, flowZoom=defaultFlowZoom;
let randomNote,inputError,rateCorpus='random-finite-bits';
const referenceSample=()=>reference(format.id,rateCorpus);
function drawRandomNote(){
  $('random-note').textContent=!randomNote?bi('A fresh input, a different path.','新しい入力から、別の経路へ。'):randomNote.kind==='fallback'?(randomNote.attempts===10000?bi('Used a known fallback after 10,000 samples.','10,000件探した後、既知のフォールバックを使いました。'):bi(`Found an exact fallback after ${randomNote.attempts} sampled encodings.`,`${randomNote.attempts}件のビット列でフォールバックが見つかりました。`)):bi('Random '+hex(randomNote.bits)+' selected.',`ランダムな${hex(randomNote.bits)}を選びました。`);
}
function element(tag,text,className) { const el=document.createElement(tag);if(text!==undefined)el.textContent=t(text);if(className)el.className=className;return el; }
function populateValues(target,values) {
  target.replaceChildren();
  for(const [key,value] of Object.entries(values)) target.append(element('dt',key),element('dd',value===null?bi('not evaluated','未評価'):typeof value==='boolean'?t(value?'true':'false'):t(String(value))));
}
function drawStep(index,reveal=false) {
  position=Math.max(0,Math.min(current.steps.length-1,index));
  const step=current.steps[position];
  $('step-label').textContent=bi('STEP ','ステップ ')+String(position+1).padStart(2,'0');
  $('step-node').textContent=bi(step.node,'');
  $('step-title').textContent=t(step.title);
  $('step-explanation').replaceChildren();
  const explanation=explainStep(current,position);
  appendCopy($('step-text'),explanation.lead);
  $('symbol-definitions').replaceChildren();$('step-symbols').hidden=!explanation.definitions.length;
  for(const [name,meaning] of explanation.definitions){const term=element('dt'),description=element('dd');term.append(renderSymbol(name));appendCopy(description,meaning);$('symbol-definitions').append(term,description);}
  $('guard-decision').hidden=step.kind!=='guard';
  if(step.kind==='guard'){
    $('guard-result').textContent=t(step.outcome?'TRUE':'FALSE');
    $('guard-equation').replaceChildren(renderMath(`guard.${format.id}.${step.node}`));
    $('guard-next').textContent=t(step.nextAction);
  }
  drawRates(step);
  const introduced=new Set();
  for(const block of explanation.blocks){
    const section=element('section',undefined,'teaching-block'),body=element('div',undefined,'teaching-prose');section.append(element('h4',String(block.title)));appendCopy(body,block.text);section.append(body);
    if(block.formula){const notation=renderNotation(block,format.id,step.node,introduced);if(notation)section.append(notation);section.append(renderMath(block.formula,block.results,{...block.values,...block.mathValues}));}
    else if(block.values&&Object.keys(block.values).length)section.append(renderBindings(block.values));
    $('step-explanation').append(section);
  }
  const next=element('p',undefined,'next-explanation');appendCopy(next,explanation.next);$('step-explanation').append(next);
  populateValues($('step-values'),step.values);
  document.querySelectorAll('.path-step').forEach((el,i)=>{el.classList.toggle('active',i===position);el.classList.toggle('future',i>position);el.setAttribute('aria-current',i===position?'step':'false');});
  document.querySelectorAll('[data-step-action="previous"]').forEach(el=>el.disabled=position===0);
  document.querySelectorAll('[data-step-action="next"]').forEach(el=>el.disabled=position===current.steps.length-1);
  document.querySelectorAll('[data-step-count]').forEach(el=>el.textContent=`${position+1} / ${current.steps.length}`);
  $('step-select').value=String(position);
  renderFlowchart($('flowchart'),current,position,index=>drawStep(index,true));
  applyFlowZoom();followFlowStep($('flowchart'));
  if($('flow-dialog').open)drawExpandedFlow();
  $('grid-details').hidden=current.result.exp===10000||current.result.sig===0n;
  $('show-grid').disabled=$('grid-details').hidden;
  drawGrid();
  if(reveal&&!$('flow-dialog').open){
    const panel=document.querySelector('.step-panel'),box=panel.getBoundingClientRect(),toolbar=document.querySelector('.step-toolbar').getBoundingClientRect();
    if(box.top<toolbar.bottom+12||box.top>innerHeight-140)panel.scrollIntoView({block:'start',behavior:'instant'});
  }
}
function drawRates(step){
  const s=referenceSample(),rate=nodeRate(s,step.node),panel=$('path-frequency');
  panel.hidden=step.kind!=='guard'||rate?.kind!=='guard';
  if(panel.hidden)return;
  const coarse=['check-coarse','check-tail'].includes(step.node);
  const fallback=format.id==='binary32'?['check-tiny','check-boundary','check-fine-change','check-fine-tie'].includes(step.node):['check-special','check-ambiguity'].includes(step.node);
  const hits=format.id==='binary64'&&step.node==='check-special'?s.reasons.subnormal:rate.hits;
  const label=coarse?bi('Coarse accepted','粗い候補の採用'):fallback?bi('Fallback','フォールバック'):
    format.id==='binary64'&&step.node==='check-boundary'?bi('Boundary uncertain','境界の不確かさ'):
    format.id==='binary64'&&step.node==='check-rounding'?bi('Rounding uncertain','丸めの不確かさ'):t('TRUE');
  panel.classList.toggle('acceptance',coarse);
  const statement=$('frequency-statement');statement.replaceChildren();
  if(!rate.reached)statement.textContent=bi('Not reached in this sample','この標本では未到達');
  else statement.append(element('b',`${label}: ${percent(hits,rate.reached)}`),document.createTextNode(
    bi(` at this guard · ${percent(hits,s.n)} of all inputs`,` この判定への到達数が分母 · 全入力では${percent(hits,s.n)}`)));
  panel.title=bi(
    `${s.label} · ${format.id} ${s.policy} · ${s.recorded}. ${label}: ${countText(hits)} / ${countText(rate.reached)} inputs reaching this guard; ${countText(s.n)} inputs in the full sample. Sample frequencies, not a probability for this input.`,
    `${s.label} · ${format.id} ${s.policy} · ${s.recorded}。${label}：この判定に到達した${countText(rate.reached)}件中${countText(hits)}件。標本全体は${countText(s.n)}件。この入力の確率ではなく標本の頻度です。`)+(format.id==='binary64'&&['check-boundary','check-rounding','check-ambiguity'].includes(step.node)?bi(
      ' Both ambiguity tests run; counts can overlap. The combined check counts their union.',
      ' 2つの不確かさの判定は両方実行され、成立数が重なりえます。組み合わせた判定は和集合を数えます。'):'');
  $('rate-corpus').setAttribute('aria-label',bi('Reference distribution for decision rates','判定の割合を参照する入力分布'));
  $('rate-corpus').replaceChildren(...distributions(format.id).map(id=>{const option=element('option',distributionLabel(id));option.value=id;return option;}));
  $('rate-corpus').value=rateCorpus;
  $('rates-method').textContent=bi('Sample counts ↗','標本件数（英語）↗');
}
function drawPath() {
  const container=$('path');container.replaceChildren();
  $('step-select').replaceChildren(...current.steps.map((step,i)=>{const option=element('option',`${i+1}. ${t(step.title)}${step.kind==='guard'?' → '+t(String(step.outcome)):''}`);option.value=String(i);return option;}));
  current.steps.forEach((step,i)=>{
    const button=element('button',undefined,'path-step');button.type='button';
    const content=element('span');content.append(element('strong',step.title),element('small',step.kind==='guard'?bi(`Evaluated: ${step.outcome?'TRUE':'FALSE'} · ${step.nextAction}`,`評価済み：${t(step.outcome?'TRUE':'FALSE')} · ${t(step.nextAction)}`):step.node==='output'?bi('sign × coefficient × 10ᵉ','符号 × 係数 × 10ᵉ'):step.node==='exact'?bi('Ambiguity resolved with full precision','不確かさを完全精度で決着'):step.node==='coarse'?bi('Fewer decimal digits','10進数の桁を減らす'):step.node==='fine'?bi('Ten times finer spacing','間隔を10分の1にする'):step.node==='scale'?bi('Integer arithmetic, bounded error','整数演算と誤差の上限'):step.node==='decode'?hex(current.bits):bi('Recorded conversion operation','変換で実行した処理')));
    button.append(element('span',String(i+1).padStart(2,'0'),'ordinal'),content);
    button.addEventListener('click',()=>drawStep(i,true));container.append(button);
  });
  const skipped=skippedGuards(current);
  const alternatives=element('div',bi('Checks not evaluated','評価しなかった条件'),'branch-alternatives');
  skipped.forEach(({title,reason})=>{const item=element('div',undefined,'skipped-check');item.append(element('strong',title),element('p',reason));alternatives.append(item);});
  if(!skipped.length)alternatives.append(element('p',bi('All dispatch and kernel checks were evaluated.','すべての経路選択と計算の判定を評価しました。')));
  container.append(alternatives);
  $('flow-note').textContent=bi('Blue follows the evaluated route; orange marks the selected step. Gray checks were not reached. ','青は実行した経路、橙は選択中のステップ、灰色は未到達の条件です。')+(skipped.length?bi(`${skipped.length} checks bypassed; see Steps for their reasons.`,`${skipped.length}個の判定を省略。理由はステップ表示で確認できます。`):bi('Every dispatch and kernel check was evaluated.','すべての経路選択と計算の判定を評価しました。'));
}
const svgNS='http://www.w3.org/2000/svg';
function svgElement(tag,attrs,text) { const el=document.createElementNS(svgNS,tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,value);if(text!==undefined)el.textContent=t(text);return el; }
function drawGrid() {
  const g=geometry(current),target=$('grid');target.replaceChildren();
  for(const id of ['grid-spacings','grid-primer','grid-reading','grid-candidates','grid-selection'])$(id).replaceChildren();
  if(!g) {
    $('grid-exp').textContent=bi('No finite nonzero interval','有限の非ゼロの区間なし');
    target.append(element('div',current.branch==='zero'?bi('Zero is returned directly, with its sign preserved.','ゼロは符号を保って直接返します。'):bi('Infinity and NaN use the nonfinite sentinel; no decimal grid is searched.','無限大とNaNは特別な指数を使い、10進格子を探しません。'),'empty-grid'));
    $('grid-caption').textContent=bi('Use another preset to explore the rounding interval and decimal candidates.','別のプリセットで丸め区間と10進数の候補を見られます。');return;
  }
  drawGridTeaching(g);
  $('grid-exp').textContent=bi(`coarse ${decimalPowerLabel(g.exp)} · fine ${decimalPowerLabel(g.exp-1)}`,`粗い ${decimalPowerLabel(g.exp)} · 細かい ${decimalPowerLabel(g.exp-1)}`);
  const width=Math.max(280,target.clientWidth||900), left=60, right=width-14, x=v=>left+(v+.6)/2.2*(right-left);
  const svg=svgElement('svg',{viewBox:`0 0 ${width} 235`,role:'img','aria-label':bi(`Rounding interval on coarse and fine decimal grids. ${t(current.branch==='power'?format.powerBadge:names[current.branch])}. The magnitude is approximately ${g.x.toFixed(7)} coarse units above origin ${g.origin}.`,`粗い・細かい10進格子上の丸め区間。${t(current.branch==='power'?format.powerBadge:names[current.branch])}。絶対値は原点${g.origin}から約${g.x.toFixed(7)}粗い間隔の単位です。`)});
  const showResult=true;
  const selectedInside=containsDecimal(current.bits,current.result.sig,current.result.exp);
  for(const y of [78,157]) {
    const row=svgElement('g',{});
    row.append(svgElement('rect',{x:x(g.lo),y:y-21,width:Math.max(.6,x(g.hi)-x(g.lo)),height:42,fill:'#e7eef8'}));
    row.append(svgElement('line',{x1:x(-.6),x2:x(1.6),y1:y,y2:y,stroke:'#cbd0d2','stroke-width':1}));
    for(const endpoint of [g.lo,g.hi]) { row.append(svgElement('line',{x1:x(endpoint),x2:x(endpoint),y1:y-21,y2:y+21,stroke:'#365fa1','stroke-width':1}));row.append(svgElement('circle',{cx:x(endpoint),cy:y,r:3,stroke:'#365fa1',fill:g.closed?'#365fa1':'white'})); }
    row.append(svgElement('line',{x1:x(g.x),x2:x(g.x),y1:y-29,y2:y+24,stroke:'#365fa1','stroke-width':1.5,'stroke-dasharray':'3 3'}));
    row.append(svgElement('circle',{cx:x(g.x),cy:y-29,r:3,fill:'#365fa1'}));svg.append(row);
  }
  svg.append(svgElement('text',{x:5,y:81,class:'grid-row-label'},'Coarse'));
  svg.append(svgElement('text',{x:5,y:160,class:'grid-row-label'},'Fine'));
  for(let i=-5;i<=15;i++) {
    const v=i/10,inInterval=containsDecimal(current.bits,g.origin*10n+BigInt(i),g.exp-1);
    svg.append(svgElement('circle',{cx:x(v),cy:157,r:3,fill:inInterval?'#365fa1':'#cbd0d2'}));
    if(i%5===0)svg.append(svgElement('text',{x:x(v),y:190,'text-anchor':'middle'},v===0?'I₀':v===10/10?'I₀ + 1':(v>0?'+':'')+v.toFixed(1)));
  }
  for(const v of [0,1]) {
    svg.append(svgElement('circle',{cx:x(v),cy:78,r:5,fill:containsDecimal(current.bits,g.origin+BigInt(v),g.exp)?'#365fa1':'white',stroke:'#6d7780','stroke-width':1.5}));
    svg.append(svgElement('text',{x:x(v),y:112,'text-anchor':'middle'},v?'I₀ + 1':'I₀'));
  }
  const labelX=value=>Math.max(85,Math.min(width-85,x(value)));
  svg.append(svgElement('text',{x:labelX(g.x),y:20,'text-anchor':'middle',fill:'#365fa1'},'exact float magnitude'));
  if(showResult) {
    const onCoarse=resultOnCoarse(g.exp);
    const y=onCoarse?78:157;
    svg.append(svgElement('circle',{cx:x(g.selected),cy:y,r:7,fill:'#ab402d',stroke:'white','stroke-width':2}));
    svg.append(svgElement('text',{x:labelX(g.selected),y:onCoarse?38:209,'text-anchor':'middle',style:'fill:#ab402d'},'selected decimal'));
  }
  svg.append(svgElement('text',{x:left,y:230},bi(`one unit = ${decimalPowerLabel(g.exp)}`,`1単位 = ${decimalPowerLabel(g.exp)}`)));
  target.append(svg);
  const context=current.branch==='power'?bi(...format.powerCaption):current.branch==='integer'?bi('The integer shortcut supplies this result directly.','整数の近道で結果を直接得ています。'):current.branch==='fallback'?(current.raw===0?bi('The complete integer calculation selected this subnormal result.','完全精度の整数計算がこの非正規数の結果を選びました。'):bi('The exact finish selected this result after the approximate route could not certify a decision.','近似で保証できなかった判定を完全精度で決着し、この結果を選びました。')):current.branch==='coarse'?bi('The coarse point is certified inside. The fine grid would add an unnecessary digit.','粗い候補が区間内だと保証しました。細かい格子は不要な桁を増やします。'):bi('The coarse grid is excluded; the fine point is the certified closest result.','粗い候補を除外し、細かい候補を最も近い結果だと保証しました。');
  $('grid-caption').textContent=bi(`${context} ${g.closed?'Closed':'Open'} endpoints: the binary significand is ${g.closed?'even':'odd'}. ${selectedInside?'Orange marks the selected decimal inside the exact interval.':''}`,`${context} 2進仮数が${g.closed?'偶数なので両端を含みます':'奇数なので両端を含みません'}。${selectedInside?'橙は正確な区間内で選ばれた10進数です。':''}`);
}
function resultOnCoarse(exp){
  return current.result.exp>=exp||current.result.sig%10n**BigInt(exp-current.result.exp)===0n;
}
function drawGridTeaching(g){
  const block=(target,title,body,values={})=>{
    const section=element('section');
    if(title){const heading=element('h4');appendCopy(heading,copy('common.grid.'+title));section.append(heading);}
    const prose=element('div');appendCopy(prose,copy('common.grid.'+body,values));section.append(prose);$(target).append(section);
  };
  block('grid-primer','definition.title','definition.body');
  block('grid-spacings',null,'spacings.body',{coarse_exp:g.exp,fine_exp:g.exp-1});
  block('grid-reading',null,'read.body',{origin:g.origin,coarse_exp:g.exp});
  const table=element('table'),caption=element('caption');appendCopy(caption,copy('common.grid.candidates.title'));table.append(caption);
  const header=element('tr');
  for(const title of [bi('Candidate','候補'),bi('Exact magnitude','厳密な絶対値'),bi('In interval?','区間内？')]){const cell=element('th',title);cell.scope='col';header.append(cell);}
  const head=element('thead');head.append(header);table.append(head);
  const body=element('tbody');
  for(const [name,sig,exp,selected]of [
    [bi('Lower coarse · I₀','下側の粗い点 · I₀'),g.origin,g.exp,false],
    [bi('Upper coarse · I₀ + 1','上側の粗い点 · I₀ + 1'),g.origin+1n,g.exp,false],
    [resultOnCoarse(g.exp)?bi('Selected · coarse','選んだ粗い値'):bi('Selected · fine','選んだ細かい値'),current.result.sig,current.result.exp,true]
  ]){
    const row=element('tr');if(selected)row.className='grid-selected-row';
    const label=element('th',name);label.scope='row';
    const value=element('td',`${sig} × ${decimalPowerLabel(exp)}`,'mono');
    row.append(label,value,element('td',containsDecimal(current.bits,sig,exp)?bi('Inside','区間内'):bi('Outside','区間外')));body.append(row);
  }
  table.append(body);$('grid-candidates').append(table);
  block('grid-selection','why-two.title','why-two.body');
  block('grid-selection','selection.title','selection.body');
}
function show(bits) {
  current=convert(bits);position=0;
  const result=current.result, text=decimalString(result);
  $('decimal-output').textContent=text;
  $('coefficient').textContent=result.sig.toString();$('exponent').textContent=String(result.exp);$('sign').textContent=result.negative?'−':'+';
  $('branch-badge').textContent=t(current.branch==='power'?format.powerBadge:names[current.branch]);$('branch-badge').className='badge '+current.branch;
  $('result-contract').textContent=result.exp===10000?bi('Sentinel exponent 10000; NaN coefficient is the payload.','特別な指数10000。NaNの係数はペイロードです。'):bi('Decimal presentation of the canonical numeric components.','正規化した数値の構成要素を10進数で表示しています。');
  if(result.exp===10000)$('roundtrip').textContent=result.sig?bi('NaN payload preserved in the coefficient.','NaNのペイロードを係数に保持しました。'):bi('Infinity and sign preserved.','無限大と符号を保持しました。');
  else $('roundtrip').textContent=bitsOf(Number(text))===current.bits?bi(`✓ Parses back to the same ${format.width} bits.`,`✓ 再読み込みで同じ${format.width}ビットに戻ります。`):bi('Browser roundtrip differs; inspect the exact interval.','ブラウザーでの再読み込みが異なります。正確な区間を確認してください。');
  $('bits-summary').textContent=hex(current.bits);
  $('bit-strip').replaceChildren(...format.fields(current).map(({label,bits,value})=>{
    const field=element('div',undefined,'bit-field');field.append(element('h5',label));
    const digits=element('div',undefined,'bit-digits');for(const digit of bits)digits.append(element('span',digit));field.append(digits,element('p',value,'field-value'));return field;
  }));
  $('bit-meaning').textContent=format.bitMeaning(current);
  const bitCalculation=format.bitCalculation(current);$('bit-equation').replaceChildren();
  if(bitCalculation)$('bit-equation').append(renderMath(bitCalculation.formula,bitCalculation.results,bitCalculation.values),renderBindings({E:current.raw,F:current.fraction}));
  const bounds=interval(bits), exactValues={'raw bits':hex(bits),['browser '+format.id+' value']:Object.is(valueOf(bits),-0)?'-0':String(valueOf(bits))};
  if(bounds) {const sign=current.negative?'-':'';exactValues['exact magnitude']=exactDecimal(bounds.center);exactValues['magnitude lower midpoint']=exactDecimal(bounds.lower);exactValues['magnitude upper midpoint']=exactDecimal(bounds.upper);exactValues['midpoint ties']=bounds.closed?'included (even)':'excluded (odd)';if(sign)exactValues['negative input']='Negate and reverse the two magnitude endpoints.';}
  populateValues($('exact-values'),exactValues);
  document.querySelectorAll('.preset').forEach((el,i)=>el.setAttribute('aria-pressed',presets[i][1]===current.bits?'true':'false'));
  $('input-error').hidden=true;drawPath();drawStep(0);
  const url=new URL(location.href);url.searchParams.set('bits',hex(current.bits));url.searchParams.set('format',format.id);history.replaceState(null,'',url);
}
function selectBits(bits) {$('input-mode').value='bits';$('input-value').value=hex(bits);show(bits);}
function drawPresets(){$('presets').replaceChildren();presets.forEach(([label,bits])=>{const button=element('button',label,'preset');button.type='button';button.setAttribute('aria-pressed','false');button.addEventListener('click',()=>selectBits(bits));$('presets').append(button);});}
$('input-form').addEventListener('submit',event=>{
  event.preventDefault();const input=$('input-value').value.trim();
  try {
    if($('input-mode').value==='bits')show(format.parseHex(input));
    else show(parseDecimalBits(input));
  } catch(error) {inputError=error.message;$('input-error').textContent=t(inputError);$('input-error').hidden=false;}
});
$('input-mode').addEventListener('change',()=>{$('input-value').value=$('input-mode').value==='bits'?hex(current.bits):decimalString(current.result);$('input-error').hidden=true;});
$('random').addEventListener('click',()=>{randomNote=format.random($('random-kind').value);selectBits(randomNote.bits);drawRandomNote();});

document.querySelectorAll('[data-step-action="previous"]').forEach(el=>el.addEventListener('click',()=>drawStep(position-1,true)));
document.querySelectorAll('[data-step-action="next"]').forEach(el=>el.addEventListener('click',()=>drawStep(position+1,true)));
$('step-select').addEventListener('change',()=>drawStep(Number($('step-select').value),true));
function switchView(flow){$('flowchart').hidden=!flow;$('flow-tools').hidden=!flow;$('flow-note').hidden=!flow;$('path').hidden=flow;$('flow-view').setAttribute('aria-pressed',String(flow));$('steps-view').setAttribute('aria-pressed',String(!flow));if(flow){applyFlowZoom();followFlowStep($('flowchart'));}}
$('flow-view').addEventListener('click',()=>switchView(true));$('steps-view').addEventListener('click',()=>switchView(false));
function followFlowStep(container){
  const node=container.querySelector('.flow-node.active');if(!node||container.hidden)return;
  const host=container.getBoundingClientRect(),box=node.getBoundingClientRect();
  if(box.top<host.top+16)container.scrollTop+=box.top-host.top-16;
  else if(box.bottom>host.bottom-16)container.scrollTop+=box.bottom-host.bottom+16;
}
function applyFlowZoom(){
  const graph=$('flowchart').querySelector('svg'),workspace=document.querySelector('.workspace'),panel=document.querySelector('.trace-panel');
  // Keep drawing proportions independent of the narrower sidebar. The compact
  // reference size below is the 100% baseline; zoom scales that size directly.
  const styles=getComputedStyle(workspace),sideBySide=styles.gridTemplateColumns.trim().split(/\s+/).length>1;
  const baseWidth=sideBySide?(workspace.clientWidth-parseFloat(styles.columnGap))*.82/1.82-(panel.getBoundingClientRect().width-$('flowchart').clientWidth)-8:$('flowchart').clientWidth-8;
  const referenceWidth=Math.max(330,baseWidth*.75);
  if(graph)graph.style.width=referenceWidth*flowZoom+'px';
  $('zoom-fit').textContent=Math.round(flowZoom*100)+'%';$('zoom-out').disabled=flowZoom<=.5;$('zoom-in').disabled=flowZoom>=2;
}
function changeZoom(value){flowZoom=Math.max(.5,Math.min(2,value));applyFlowZoom();followFlowStep($('flowchart'));}
$('zoom-out').addEventListener('click',()=>changeZoom(flowZoom-.25));$('zoom-in').addEventListener('click',()=>changeZoom(flowZoom+.25));$('zoom-fit').addEventListener('click',()=>changeZoom(defaultFlowZoom));
function drawExpandedFlow(){renderFlowchart($('expanded-flowchart'),current,position,index=>drawStep(index,true));$('dialog-step-title').textContent=t(current.steps[position].title);followFlowStep($('expanded-flowchart'));}
$('expand-flow').addEventListener('click',()=>{$('flow-dialog').showModal();drawExpandedFlow();});
$('close-flow').addEventListener('click',()=>$('flow-dialog').close());
$('flow-dialog').addEventListener('click',event=>{if(event.target===$('flow-dialog'))$('flow-dialog').close();});
$('grid-details').addEventListener('toggle',()=>{if($('grid-details').open&&current)drawGrid();});
$('show-grid').addEventListener('click',()=>{$('grid-details').open=true;$('grid-details').scrollIntoView({block:'start'});});
$('return-to-step').addEventListener('click',()=>document.querySelector('.step-panel').scrollIntoView({block:'start'}));
window.addEventListener('resize',()=>{if(current){applyFlowZoom();followFlowStep($('flowchart'));drawGrid();}});
function drawLanguages(){
  applyPageLanguage(format.pageCopy);
  document.body.dataset.format=format.id;$('format-select').value=format.id;
  const boundsLink=document.querySelector('.context-notes a:nth-of-type(2)');boundsLink.href=format.boundsDocument;boundsLink.textContent=bi(...format.boundsLabel);
  document.querySelectorAll('.preset').forEach((el,i)=>el.textContent=t(presets[i][0]));
  drawRandomNote();
}
function changeLanguage(value){
  const saved=position,error=$('input-error').hidden?null:inputError;
  setLanguage(value);drawLanguages();show(current.bits);drawStep(saved);
  if(error){$('input-error').textContent=t(error);$('input-error').hidden=false;}
  try{localStorage.setItem('boundragon-language',locale());}catch{}
  const url=new URL(location.href);url.searchParams.set('lang',locale());history.replaceState(null,'',url);
}
const requestedLanguage=new URL(location.href).searchParams.get('lang');
let preferredLanguage;try{preferredLanguage=localStorage.getItem('boundragon-language');}catch{}
setLanguage(requestedLanguage??preferredLanguage);
document.querySelectorAll('[data-language]').forEach(el=>el.addEventListener('click',()=>changeLanguage(el.dataset.language)));
$('format-select').addEventListener('change',()=>{
  const magnitude=valueOf(current.bits),decimal=$('input-mode').value==='decimal';
  format=FORMATS[$('format-select').value];presets=format.presets;randomNote=undefined;drawPresets();drawLanguages();
  if(!distributions(format.id).includes(rateCorpus))rateCorpus='random-finite-bits';
  if(decimal){try{show(parseDecimalBits($('input-value').value));}catch{show(bitsOf(magnitude));}}else selectBits(bitsOf(magnitude));
});
$('rate-corpus').addEventListener('change',()=>{rateCorpus=$('rate-corpus').value;drawStep(position);});
drawPresets();drawLanguages();
const initial=initialURL.searchParams.get('bits');
if(initial&&new RegExp(`^0x[0-9a-f]{${format.hexDigits}}$`,'i').test(initial))selectBits(format.parseHex(initial));else show(bitsOf(.1));
