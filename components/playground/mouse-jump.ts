export const JUMP_DURATION=1.08;
const smooth=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
/** Anticipation, ballistic flight and a damped landing. All offsets end at zero. */
export function mouseJump(time:number,reduced=false){
  if(reduced||time<0||time>=JUMP_DURATION)return {height:0,crouch:0,tuck:0,lean:0};
  if(time<.16){const p=smooth(time/.16);return {height:0,crouch:.12*p,tuck:0,lean:.07*p};}
  if(time<.76){const t=(time-.16)/.6;return {height:4*.48*t*(1-t),crouch:.12*(1-smooth(t/.14)),tuck:.12*Math.sin(Math.PI*t),lean:.07*(1-smooth(t/.2))-.035*Math.sin(Math.PI*t)};}
  const t=(time-.76)/.32;
  const impact=Math.sin(Math.PI*t)*(1-t);
  return {height:0,crouch:.18*impact,tuck:0,lean:.09*impact};
}
