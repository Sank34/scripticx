/** Exponential blend preserves continuity when a panel is toggled mid-flight. */
export function editorCameraBlend(current:number,open:boolean,dt:number,reduced:boolean){
  const target=open?1:0;
  if(reduced)return target;
  const next=target+(current-target)*Math.exp(-7*Math.max(0,dt));
  return Math.abs(next-target)<.0001?target:next;
}
