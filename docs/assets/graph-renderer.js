// SPDX-License-Identifier: Unlicense
// Shared SVG renderer. Format-specific files provide graph data and trace IDs.
import {t,bi} from './i18n.js';
const NS='http://www.w3.org/2000/svg';
function svg(tag,attrs={},text){const el=document.createElementNS(NS,tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,value);if(text!==undefined)el.textContent=t(text);return el;}
export function renderGraph(container,model,trace,position,onSelect,nodeId,extraLines=()=>[]){
  const focusedId=document.activeElement?.getAttribute('data-flow-node');
  const visible=new Set(model.nodes.map(([id])=>id));
  const mapped=trace.steps.map((s,index)=>({id:nodeId(s,trace),index})).filter(s=>visible.has(s.id)),path=mapped.map(s=>s.id),indices=new Map(mapped.map(s=>[s.id,s.index]));
  const active=nodeId(trace.steps[position],trace);
  const graph=svg('svg',{viewBox:model.viewBox,role:'group','aria-label':bi('Recorded branch path: ','記録した分岐経路：')+path.join(' → ')}),defs=svg('defs');
  for(const [name,color] of [['idle','#d9dedf'],['taken','#365fa1']]){
    const marker=svg('marker',{id:container.id+'-'+name,viewBox:'0 0 8 8',refX:7,refY:4,markerWidth:5,markerHeight:5,orient:'auto'});
    marker.append(svg('path',{d:'M0 0 L8 4 L0 8 Z',fill:color}));defs.append(marker);
  }
  graph.append(defs);
  const taken=(a,b)=>path.some((id,i)=>id===a&&path[i+1]===b);
  for(const selected of [false,true])for(const [a,b,d,label,lx,ly] of model.edges){
    if(taken(a,b)!==selected)continue;
    graph.append(svg('path',{d,fill:'none',stroke:selected?'#365fa1':'#d9dedf','stroke-width':selected?2:1,'marker-end':`url(#${container.id}-${selected?'taken':'idle'})`}));
    if(label)graph.append(svg('text',{x:lx,y:ly,'text-anchor':'middle',class:'flow-label'+(selected?' taken':'')},label));
  }
  for(const [id,x,y,w,h,baseLines,shape] of model.nodes){
    const lines=[...baseLines,...extraLines(id)].map(t),index=indices.get(id),visited=index!==undefined,event=visited?trace.steps[index]:null,focused=id===active;
    const status=event?.kind==='guard'?bi('Evaluated: ','評価済み：')+t(String(event.outcome)):visited?bi('Recorded operation','実行した処理'):bi('Not evaluated / not reached','未評価・未到達');
    const group=svg('g',{'data-flow-node':id,'data-step-index':visited?index:'',class:'flow-node'+(visited?' taken':'')+(focused?' active':'')});
    group.append(svg('title',{},lines.join(' ')+'. '+status));
    group.setAttribute('aria-label',lines.join('. ')+'. '+status+(visited?bi('. Open this step.','。このステップを開く。'):''));
    if(visited){
      group.setAttribute('role','button');group.setAttribute('tabindex','0');group.setAttribute('aria-current',focused?'step':'false');
      const select=()=>onSelect(index);group.addEventListener('click',select);group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}});
    }
    group.append(shape==='gate'?svg('polygon',{points:`${x+w/2},${y} ${x+w},${y+h/2} ${x+w/2},${y+h} ${x},${y+h/2}`}):svg('rect',{x,y,width:w,height:h,rx:id==='output'?18:5}));
    lines.forEach((line,i)=>group.append(svg('text',{x:x+w/2,y:y+h/2+(i-(lines.length-1)/2)*13+3,'text-anchor':'middle'},line)));
    graph.append(group);
  }
  container.replaceChildren(graph);
  if(focusedId)container.querySelector(`[data-flow-node="${focusedId}"]`)?.focus({preventScroll:true});
}
