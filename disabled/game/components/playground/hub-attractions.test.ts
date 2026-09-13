import {expect,it,vi} from 'vitest';
import * as T from 'three';
import {createAttractions} from './hub-attractions';
import type {Obstacle} from './collisions';
import {advanceCircuit,emptyCircuit,CIRCUIT_GATES,attractionClearance,hubDistrict,LAKE,LAKES,GARDEN} from './hub-rules';
it('only starts the circuit in the rover and requires ordered checkpoints',()=>{
 let run=emptyCircuit();const first=CIRCUIT_GATES[0];
 expect(advanceCircuit(run,first.x,first.z,false,0)).toEqual(run);
 run=advanceCircuit(run,first.x,first.z,true,0);
 expect(run.next).toBe(1);
 expect(advanceCircuit(run,first.x,first.z,true,2)).toEqual(run);
 for(let i=1;i<8;i++){const p=CIRCUIT_GATES[i];run=advanceCircuit(run,p.x,p.z,true,i*2);}
 expect(run.next).toBe(0);run=advanceCircuit(run,first.x,first.z,true,20);
 expect(run.lastLap).toBe(20);expect(run.next).toBe(1);
 expect(advanceCircuit(run,0,0,false,21).started).toBeNull();
});
it('clears the attraction grounds of grass and labels their districts',()=>{
 for(const p of CIRCUIT_GATES){expect(attractionClearance(p.x,p.z)).toBeLessThan(0);expect(hubDistrict(p.x,p.z)).toBe('circuit');}
 expect(attractionClearance(LAKE.x,LAKE.z)).toBeLessThan(0);
 expect(hubDistrict(LAKE.x,LAKE.z)).toBe('lake');
 expect(hubDistrict(GARDEN.x,GARDEN.z)).toBe('garden');
 expect(hubDistrict(0,3)).toBe('commons');
});
it('builds valid merged scenery with a lake collider and a bounded mesh count',()=>{
 const ctx={fillRect(){},strokeRect(){},fillText(){}};
 vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>ctx})});
 try{
  const scene=new T.Scene(),obstacles:Obstacle[]=[];
  const status=vi.fn(),attractions=createAttractions(scene,obstacles,false,status);
  expect(scene.children.length).toBeLessThan(40);
  for(const lake of LAKES)expect(obstacles.some(o=>o.x===lake.x&&o.z===lake.z&&o.r===lake.r)).toBe(true);
  attractions.update(1,.016,0,3,false);expect(status).toHaveBeenCalledOnce();
  attractions.update(2,.016,0,3,false);expect(status).toHaveBeenCalledOnce();
  scene.traverse(o=>{if(o instanceof T.Mesh){expect(o.geometry.getAttribute('position').count).toBeGreaterThan(0);o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){if(m.map)m.map.dispose();m.dispose();}}});
 }finally{vi.unstubAllGlobals();}
});
