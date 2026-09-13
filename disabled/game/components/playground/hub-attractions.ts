import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {Obstacle} from './collisions';
import {CIRCUIT,CIRCUIT_GATES,LAKE,LAKES,GARDEN,HUB_EXTENT,advanceCircuit,emptyCircuit,hubDistrict} from './hub-rules';
import {createLakeSurface} from './hub-lakes';

export type HubStatus={district:ReturnType<typeof hubDistrict>;checkpoint:number;lap:number|null;running:boolean};

/** Original low-poly landmarks, inspired by folio-2025's separate play areas.
 * Static props are merged by material; only gates and kinetic pieces stay dynamic.
 */
export function createAttractions(scene:T.Scene,obstacles:Obstacle[],reduced:boolean,onStatus:(s:HubStatus)=>void){
 const palette=['#98745b','#554251','#c9af80','#93ad81','#b982a9','#3a777e','#c5e8b0'];
 const materials=palette.map(color=>new T.MeshStandardMaterial({color,roughness:.85}));
 const batches:T.BufferGeometry[][]=palette.map(()=>[]);
 const dummy=new T.Object3D();
 function prop(g:T.BufferGeometry,m:number,x:number,y:number,z:number,ry=0){if(g.index){const original=g;g=g.toNonIndexed();original.dispose();}dummy.position.set(x,y,z);dummy.rotation.set(0,ry,0);dummy.updateMatrix();g.applyMatrix4(dummy.matrix);batches[m].push(g);}
 const box=(w:number,h:number,d:number,m:number,x:number,y:number,z:number,ry=0)=>prop(new T.BoxGeometry(w,h,d),m,x,y,z,ry);
 function disk(r:number,m:number,x:number,z:number){prop(new T.CylinderGeometry(r,r,.06,64),m,x,.015,z);}
 function sign(text:string,sub:string,x:number,z:number){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#292536';ctx.fillRect(0,0,1024,256);
  ctx.strokeStyle='#b7c694';ctx.lineWidth=5;ctx.strokeRect(9,9,1006,238);ctx.textAlign='center';ctx.fillStyle='#edf0d0';ctx.font='76px "Amatic SC",sans-serif';ctx.fillText(text,512,114);ctx.fillStyle='#b7b0bc';ctx.font='25px sans-serif';ctx.fillText(sub,512,193);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const board=new T.Mesh(new T.BoxGeometry(5,.0+1.25,.15),new T.MeshStandardMaterial({map:texture}));board.position.set(x,2,z);scene.add(board);
  for(const dx of [-2.2,2.2]){box(.14,2,.14,1,x+dx,1,z);obstacles.push({x:x+dx,z,r:.18});}
  obstacles.push({x,z,r:1.8});
 }
 // A secondary promenade gives the expanded world a legible east/west route.
 for(let i=-31;i<=31;i++)box(1.15,.05,2.5,2,i*1.25,0,12);
 for(let i=12;i<=31;i++)box(1.1,.05,.95,2,0,0,-i*1.25);
 sign('NORTH / WIND GARDEN','Follow the central path',-4,-12);
 sign('WEST / REFLECTION LAKE','A quiet place beyond the trees',-13,10);
 sign('EAST / MOTOR CIRCUIT','Drive through the glowing arches in order',14,10);
 // Closed circuit: wide, flat and fully drivable, with a timed sequence of gates.
 const track=new T.Mesh(new T.RingGeometry(CIRCUIT.r-2,CIRCUIT.r+2,96),materials[0]);track.rotation.x=-Math.PI/2;track.position.set(CIRCUIT.x,.06,CIRCUIT.z);track.receiveShadow=true;scene.add(track);
 for(let i=0;i<64;i++){const a=i*Math.PI/32;for(const r of [6.85,11.15])box(.55,.08,.25,i%2?1:2,CIRCUIT.x+Math.sin(a)*r,.07,CIRCUIT.z-Math.cos(a)*r,-a);}
 const gates=CIRCUIT_GATES.map((p,i)=>{
  const material=new T.MeshStandardMaterial({color:'#768b79',emissive:'#91dfaf',emissiveIntensity:i===0?1.2:0,roughness:.4});
  const arch=new T.Mesh(new T.TorusGeometry(2.25,.09,5,24,Math.PI),material);arch.position.set(p.x,.08,p.z);arch.rotation.y=Math.PI/2-i*Math.PI/4;scene.add(arch);return arch;
 });
 sign('THE LOOP','Start at the glowing gate / Rover required',25,6);
 // The lake is a solid collision volume; the dock ends at its near shore.
 const lakes=LAKES.map(l=>{const surface=createLakeSurface(l);scene.add(surface.water,surface.shore);obstacles.push({x:l.x,z:l.z,r:l.r});return surface;});
 for(let i=0;i<7;i++)box(3,.12,.55,0,LAKE.x,.12,13+i*.55);
 for(const x of [LAKE.x-1.6,LAKE.x+1.6])for(const z of [13,16])prop(new T.CylinderGeometry(.1,.13,.8,6),1,x,.35,z);
 // Shore stones anchor the smaller pools without adding more draw calls.
 for(const lake of LAKES)for(let i=0;i<9;i++){const a=i*2.399;prop(new T.IcosahedronGeometry(.2+(i%3)*.1,0),2,lake.x+Math.cos(a)*(lake.r+1),.1,lake.z+Math.sin(a)*(lake.r+1));}
 sign('REFLECTION LAKE','Take the slow way home',-25,10);
 function bench(x:number,z:number,angle=0){box(2.7,.18,.85,0,x,.65,z,angle);box(2.7,.7,.15,0,x,1.1,z-.35,angle);for(const dx of [-1,1])box(.16,.65,.6,1,x+dx,.3,z,angle);obstacles.push({x,z,r:1.3});}
 bench(-34,19);bench(-27,32);bench(6,-31);
 // Wind garden: orbiting brass rings and softly reacting chime sculptures.
 disk(GARDEN.r,2,GARDEN.x,GARDEN.z);
 prop(new T.CylinderGeometry(1.5,2,.5,12),1,0,.25,-26);obstacles.push({x:0,z:-26,r:2});
 const orbits=[0,1,2].map(i=>{const o=new T.Mesh(new T.TorusGeometry(2+i*.45,.085,5,48),materials[i===1?4:6]);o.position.set(0,3.1,-26);o.rotation.set(i*.8,.4+i,0);scene.add(o);return o;});
 const chimes=Array.from({length:6},(_,i)=>{
  const a=i*Math.PI/3,x=Math.sin(a)*5.5,z=-26+Math.cos(a)*5.5;
  prop(new T.CylinderGeometry(.09,.16,2,6),1,x,1,z);obstacles.push({x,z,r:.25});
  const o=new T.Mesh(new T.OctahedronGeometry(.65,0),materials[i%2?4:3]);o.position.set(x,2.4,z);scene.add(o);return o;
 });
 sign('WIND GARDEN','Walk among the kinetic sculptures',0,-17);
 // Trees, boulders and low edge markers frame the new districts without a wall.
 for(let i=0;i<90;i++){
  const a=i*2.399,r=31+(i%7)*1.3,x=Math.sin(a)*r,z=Math.cos(a)*r;
  if(Math.abs(x)>HUB_EXTENT-2||Math.abs(z)>HUB_EXTENT-2||Math.abs(z-12)<3||Math.abs(x)<2)continue;
  if(Math.hypot(x-CIRCUIT.x,z-CIRCUIT.z)<13||LAKES.some(l=>Math.hypot(x-l.x,z-l.z)<l.r+3))continue;
  prop(new T.CylinderGeometry(.13,.22,2.6,6),1,x,1.3,z);
  prop(new T.IcosahedronGeometry(1.6+(i%3)*.2,1),i%2?3:4,x,3,z);
  obstacles.push({x,z,r:.4});
 }
 for(let i=-40;i<=40;i+=4)for(const [x,z] of [[i,-41],[i,41],[-41,i],[41,i]])prop(new T.IcosahedronGeometry(.5,0),2,x,.1,z);
 batches.forEach((list,i)=>{if(!list.length)return;const geometry=mergeGeometries(list);list.forEach(g=>g.dispose());const o=new T.Mesh(geometry,materials[i]);o.castShadow=true;o.receiveShadow=true;scene.add(o);});
 let run=emptyCircuit(),lastStatus='';
 return {update(time:number,dt:number,x:number,z:number,driving:boolean){
  run=advanceCircuit(run,x,z,driving,time);
  gates.forEach((g,i)=>{const target=i===run.next?1.3:.03;g.material.emissiveIntensity=T.MathUtils.damp(g.material.emissiveIntensity,target,5,dt);});
  if(!reduced){orbits.forEach((o,i)=>{o.rotation.y=time*(.13+i*.035);o.rotation.z=Math.sin(time*.3+i)*.35;});lakes.forEach(l=>l.update(time));}
  chimes.forEach((o,i)=>{const nearby=Math.max(0,1-Math.hypot(x-o.position.x,z-o.position.z)/3);o.rotation.z=T.MathUtils.damp(o.rotation.z,reduced?0:Math.sin(time*3+i)*nearby*.4,5,dt);if(!reduced)o.rotation.y=time*.2;});
  const district=hubDistrict(x,z),status={district,checkpoint:run.next+1,lap:run.lastLap,running:run.started!==null};
  const key=JSON.stringify(status);if(key!==lastStatus){lastStatus=key;onStatus(status);}
 }};
}
