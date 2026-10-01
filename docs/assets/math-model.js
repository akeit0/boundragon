// SPDX-License-Identifier: Unlicense
// Equation IDs and named trace bindings; no notation parsing or DOM dependency.
export const equation=(id,values)=>({id,values});
// Mark the block that explains the selected candidate and normalization.
// An optional equation introduces work done immediately before that selection.
export const resultEquation=id=>({id,result:true});
export function calculationBlock(title,text,formula,values,results){
  const reference=formula&&typeof formula==='object';
  return {id:title.id,title,text,formula:reference?formula.id:formula,
    values,results,mathValues:reference?formula.values:undefined,
    ...(reference&&formula.result?{result:true}:{})};
}
