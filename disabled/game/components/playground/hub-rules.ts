export const HUB_STATIONS=[
 {id:'map',x:-7,z:-5,title:'WORLD ATLAS'},
 {id:'quests',x:7,z:-5,title:'FIELD MISSIONS'},
] as const;
export type HubStation=typeof HUB_STATIONS[number]['id'];
export function stationAt(x:number,z:number):HubStation|null{return HUB_STATIONS.find(s=>Math.hypot(x-s.x,z-(s.z+1.6))<2.5)?.id??null;}
export const HUB_EXTENT=42;
export const CIRCUIT={x:25,z:21,r:9};
export const LAKE={x:-25,z:22,r:6.5};
export const LAKES=[LAKE,{x:-27,z:-22,r:4.5},{x:27,z:-23,r:5}];
export const GARDEN={x:0,z:-26,r:7};
export const CIRCUIT_GATES=Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return {x:CIRCUIT.x+Math.sin(a)*CIRCUIT.r,z:CIRCUIT.z-Math.cos(a)*CIRCUIT.r};});
export function hubGround(x:number,z:number){return Number.isFinite(x)&&Number.isFinite(z)&&Math.abs(x)<HUB_EXTENT&&Math.abs(z)<HUB_EXTENT;}
export function hubDistrict(x:number,z:number):'commons'|'circuit'|'lake'|'garden'{
 if(Math.hypot(x-CIRCUIT.x,z-CIRCUIT.z)<14)return 'circuit';
 if(LAKES.some(l=>Math.hypot(x-l.x,z-l.z)<l.r+5))return 'lake';
 if(Math.hypot(x-GARDEN.x,z-GARDEN.z)<12)return 'garden';
 return 'commons';
}
/** Positive distance outside cleared attraction paths and decks. Shared with grass. */
export function attractionClearance(x:number,z:number){
 return Math.min(Math.abs(Math.hypot(x-CIRCUIT.x,z-CIRCUIT.z)-CIRCUIT.r)-2,
  ...LAKES.map(l=>Math.hypot(x-l.x,z-l.z)-l.r-2.5),
  Math.hypot(x-GARDEN.x,z-GARDEN.z)-GARDEN.r,
  Math.abs(z-12)-1.4);
}
export type CircuitRun={next:number;started:number|null;lastLap:number|null};
export const emptyCircuit=():CircuitRun=>({next:0,started:null,lastLap:null});
/** Ordered physical checkpoints, local amusement only: never grants account rewards. */
export function advanceCircuit(run:CircuitRun,x:number,z:number,driving:boolean,time:number):CircuitRun{
 if(!driving)return run.started===null?run:{...run,next:0,started:null};
 const gate=CIRCUIT_GATES[run.next];
 if(Math.hypot(x-gate.x,z-gate.z)>2)return run;
 if(run.started===null)return {...run,next:1,started:time};
 if(run.next===0)return {next:1,started:time,lastLap:Math.max(0,time-run.started)};
 return {...run,next:(run.next+1)%CIRCUIT_GATES.length};
}
