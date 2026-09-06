import type { ZoneId } from './game-missions';
export function canWalk(zone:ZoneId,bridgeUnlocked:boolean,gateOpen:boolean,x:number,z:number){
  if(!Number.isFinite(x)||!Number.isFinite(z))return false;
  const island=Math.hypot(x,z)<7.2;
  const bridge=Math.abs(x)<.85&&(zone==='meadow'?bridgeUnlocked&&z<0&&z>-9:z>0&&z<9);
  return (island||bridge)&&!(zone==='grove'&&!gateOpen&&z<-3.4);
}
export function atExit(zone:ZoneId,unlocked:boolean,x:number,z:number){return Math.abs(x)<1&&(zone==='meadow'?unlocked&&z<-7.3:z>7.3);}
