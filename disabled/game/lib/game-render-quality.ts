/** Retina detail without unbounded GPU buffers on very large displays. */
export function gamePixelRatio(width:number,height:number,dpr:number,high:boolean){
  const w=Math.max(1,width),h=Math.max(1,height);
  return Math.min(Math.max(1,dpr||1),high?2:1,4096/Math.max(w,h),Math.sqrt(8_294_400/(w*h)));
}
