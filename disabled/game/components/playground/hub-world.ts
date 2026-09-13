import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {renderPipeline} from './world-renderer';
import {characterMotion,turnTowards} from './character-motion';
import {moveWithCollisions,type Obstacle} from './collisions';
import {HUB_STATIONS,hubGround,stationAt,type HubStation} from './hub-rules';
import {loadGameSettings} from '@/lib/playground-settings';
import {mouseJump,JUMP_DURATION} from './mouse-jump';
import {createHubGrass} from './hub-grass';
import {createAttractions,type HubStatus} from './hub-attractions';
import {movementSpeed} from './movement-speed';

export async function createHub(host:HTMLElement,signal:AbortSignal,onNear:(s:HubStation|null)=>void,onVehicle:(driving:boolean,near:boolean)=>void,onLost:()=>void,onStatus:(s:HubStatus)=>void=()=>{}){
 const settings=loadGameSettings(),reduced=settings.reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const scene=new T.Scene();scene.background=new T.Color('#252134');scene.fog=new T.Fog('#252134',30,75);
 const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
 const camera=new T.PerspectiveCamera(38,1,.1,100),pipeline=renderPipeline(renderer,scene,camera);host.appendChild(renderer.domElement);
 const sun=new T.DirectionalLight('#ffd2a0',3);sun.position.set(-10,18,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-28,right:28,top:28,bottom:-28,far:70});sun.shadow.normalBias=.04;scene.add(sun,new T.HemisphereLight('#9a99da','#794749',2));
 const rim=new T.DirectionalLight('#ad87ff',2);rim.position.set(8,8,-12);scene.add(rim);
 const mat=(c:string)=>new T.MeshStandardMaterial({color:c,roughness:.85});
 const clay=mat('#c7916f'),stone=mat('#e7c5a2'),wood=mat('#553e50'),mint=mat('#c2dfa1');
 const obstacles:Obstacle[]=[];
 function mesh(g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;scene.add(o);return o;}
 const floor=mesh(new T.PlaneGeometry(160,160),clay,0,-.04,0);floor.rotation.x=-Math.PI/2;floor.castShadow=false;
 // Intersecting footpaths connect the stations, garage and open meadow.
 const pavingDummy=new T.Object3D();
 for(const horizontal of [true,false]){const paving=new T.InstancedMesh(new T.BoxGeometry(horizontal?1.15:.8,.045,horizontal?.8:1.1),stone,23);paving.receiveShadow=true;scene.add(paving);for(let i=-11;i<=11;i++){pavingDummy.position.set(horizontal?i*1.25:0,0,horizontal?-2:i*1.3);pavingDummy.updateMatrix();paving.setMatrixAt(i+11,pavingDummy.matrix);}}
 const textures:T.Texture[]=[];
 function label(text:string,x:number,z:number){const c=document.createElement('canvas');c.width=512;c.height=160;const ctx=c.getContext('2d')!;ctx.fillStyle='#24212e';ctx.fillRect(0,0,512,160);ctx.strokeStyle='#b3c6a7';ctx.lineWidth=5;ctx.strokeRect(8,8,496,144);ctx.fillStyle='#e8e6cb';ctx.font='52px "Amatic SC",sans-serif';ctx.textAlign='center';ctx.fillText(text,256,103);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;textures.push(tex);const board=mesh(new T.BoxGeometry(3.6,1.15,.18),new T.MeshStandardMaterial({map:tex}),x,2,z);board.receiveShadow=false;for(const dx of [-1.5,1.5]){mesh(new T.BoxGeometry(.13,2,.13),wood,x+dx,1,z);obstacles.push({x:x+dx,z,r:.2});}obstacles.push({x,z,r:1.4});}
 for(const s of HUB_STATIONS){label(s.title,s.x,s.z);const platform=mesh(new T.CylinderGeometry(2.3,2.4,.12,32),wood,s.x,.025,s.z+1.5);platform.castShadow=false;const ring=mesh(new T.TorusGeometry(2.1,.025,6,48),mint,s.x,.11,s.z+1.5);ring.rotation.x=Math.PI/2;}
 label('SCRIPTICX / MOTOR CLUB',4,6);
 // Landmark: raised atlas relief, with the same destinations as the UI map.
 const mapDesk=mesh(new T.BoxGeometry(2.4,.15,1.1),wood,-7,.8,-4.8);mapDesk.rotation.x=.12;
 for(let i=0;i<5;i++)mesh(new T.ConeGeometry(.25+i*.04,.3+i*.05,5),mint,-7.8+i*.4,1.05,-4.8);
 const treeGeo=new T.IcosahedronGeometry(1,1),trunkGeo=new T.CylinderGeometry(.16,.25,2,7),leafMats=[mat('#ae709c'),mat('#df9e94'),mat('#9da56c')];
 const trunks=new T.InstancedMesh(trunkGeo,wood,38),crowns=leafMats.map((m,i)=>new T.InstancedMesh(treeGeo,m,i===2?12:13));for(const trees of [trunks,...crowns]){trees.castShadow=true;trees.receiveShadow=true;scene.add(trees);}const treeDummy=new T.Object3D();
 for(let i=0;i<38;i++){const a=i*2.399,r=13+(i%5)*1.8,x=Math.cos(a)*r,z=Math.sin(a)*r;treeDummy.position.set(x,1,z);treeDummy.scale.setScalar(1);treeDummy.updateMatrix();trunks.setMatrixAt(i,treeDummy.matrix);treeDummy.position.y=2.7;treeDummy.scale.set(1.5,1.2,1.5);treeDummy.updateMatrix();crowns[i%3].setMatrixAt(Math.floor(i/3),treeDummy.matrix);obstacles.push({x,z,r:.42});}
 for(const [x,z] of [[-5,-1],[5,-1],[-9,-3],[9,-3],[-2,7],[7,7]]){mesh(new T.CylinderGeometry(.06,.09,1.6,6),wood,x,.8,z);mesh(new T.BoxGeometry(.25,.4,.25),new T.MeshStandardMaterial({color:'#ffeac0',emissive:'#ffb458',emissiveIntensity:2}),x,1.7,z);obstacles.push({x,z,r:.14});}
 const attractions=createAttractions(scene,obstacles,reduced,onStatus);
 // Small independently culled tiles retain grass density without drawing the entire park.
 const grass=Array.from({length:16},(_,i)=>createHubGrass(settings.quality==='low',reduced,{x:-31.5+(i%4)*21,z:-31.5+Math.floor(i/4)*21,size:21}));grass.forEach(g=>scene.add(g.mesh));
 scene.add(sun.target);
 let playTime=0;
 let disposed=false,raf=0,paused=true,covered=true,last=performance.now(),elapsed=0,driving=false,speed=0,jumpTime=-1,near:HubStation|null=null,nearCar=false,target:T.Vector3|null=null;
 const keys=new Set<string>(),ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),0),aim=new T.Vector3(0,.6,2),offset=new T.Vector3(10,14,16);
 let mouse:T.Group,car:T.Group,mixer:T.AnimationMixer;
 const texturesOwned=()=>{scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){for(const v of Object.values(m))if(v instanceof T.Texture)textures.push(v);m.dispose();}}});new Set(textures).forEach(t=>t.dispose());};
 function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer.disconnect();renderer.domElement.removeEventListener('pointerdown',pointer);renderer.domElement.removeEventListener('webglcontextlost',lost);mixer?.stopAllAction();pipeline.dispose();texturesOwned();renderer.dispose();renderer.domElement.remove();}
 function lost(e:Event){e.preventDefault();dispose();onLost();}
 const observer=new ResizeObserver(()=>{if(disposed)return;const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();pipeline.resize(w,h);});observer.observe(host);
 function pointer(e:PointerEvent){if(paused)return;const b=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-b.left)/b.width*2-1,1-(e.clientY-b.top)/b.height*2),camera);const p=ray.ray.intersectPlane(plane,new T.Vector3());if(p&&hubGround(p.x,p.z))target=p;}
 renderer.domElement.addEventListener('pointerdown',pointer);renderer.domElement.addEventListener('webglcontextlost',lost);
 try{
  for(const url of ['/game/mousey.glb','/game/scripticx-rover.glb']){const response=await fetch(url,{signal});if(!response.ok)throw Error('Model unavailable');const gltf=await new GLTFLoader().parseAsync(await response.arrayBuffer(),'/game/');if(signal.aborted) {gltf.scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});throw Error('Aborted');}scene.add(gltf.scene);if(url.includes('mousey')){mouse=gltf.scene;mouse.scale.setScalar(.5);mouse.position.set(0,0,3);mixer=new T.AnimationMixer(mouse);const idle=gltf.animations.find(a=>a.name==='Idle');if(idle)mixer.clipAction(idle).play();}else{car=gltf.scene;car.position.set(4,0,3);}}
  for(const root of [mouse!,car!])root.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=!/eye|pupil|catchlight|whisker|smile|nose|contour|bow|inner.ear/i.test(o.name);o.receiveShadow=false;}});
  const motion=characterMotion(mouse!,'mouse'),wheels:T.Object3D[]=[];car!.traverse(o=>{if(/Wheel|Hub/.test(o.name))wheels.push(o);});
  const parked={x:4,z:3,r:1.2},movingObstacles=obstacles.map(o=>({...o,r:o.r+.55}));
  renderer.shadowMap.enabled=settings.quality!=='low';pipeline.quality(settings.quality!=='low');pipeline.resize(host.clientWidth,host.clientHeight);camera.position.copy(aim).add(offset);
  function tick(now:number){if(disposed)return;raf=requestAnimationFrame(tick);const dt=Math.min(.04,(now-last)/1000);last=now;if(document.hidden||covered)return;elapsed+=dt;
   const actor=driving?car:mouse;const x=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),z=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));const move=new T.Vector3(x*.814+z*.581,0,-x*.581+z*.814);
   if(x||z)target=null;else if(target){move.copy(target).sub(actor.position);move.y=0;if(move.length()<.2){target=null;move.set(0,0,0);}}
   if(paused)move.set(0,0,0);const active=move.lengthSq()>.001;speed=T.MathUtils.damp(speed,movementSpeed(active,keys.has('shift'),driving),driving?3:8,dt);let actual=0;
   if(active){move.normalize();actor.rotation.y=turnTowards(actor.rotation.y,Math.atan2(move.x,move.z),dt,driving?4:12);if(driving)move.set(Math.sin(actor.rotation.y),0,Math.cos(actor.rotation.y));parked.x=car.position.x;parked.z=car.position.z;const next=moveWithCollisions(actor.position,{x:move.x*speed*dt,z:move.z*speed*dt},driving?movingObstacles:[...obstacles,parked],hubGround);actual=Math.hypot(next.x-actor.position.x,next.z-actor.position.z)/dt;actor.position.set(next.x,0,next.z);if(actual<.02){speed=0;target=null;}}
   if(jumpTime>=0){jumpTime+=dt;if(jumpTime>=JUMP_DURATION)jumpTime=-1;}motion.reset();mixer.update(dt);motion(dt,driving?0:actual,false,0,reduced,0,jumpTime);if(!driving)mouse.position.y=mouseJump(jumpTime,reduced).height;
   if(driving){mouse.position.set(0,.68,.03);mouse.rotation.set(0,0,reduced?0:Math.sin(elapsed*4)*.01*Math.min(speed,1));wheels.forEach(w=>w.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),actual*dt/.43)));}
   const station=stationAt(actor.position.x,actor.position.z);if(station!==near){near=station;onNear(near);}const nc=!driving&&mouse.position.distanceTo(car.position)<2.5;if(nc!==nearCar){nearCar=nc;onVehicle(driving,nc);}
   grass.forEach(g=>g.update(elapsed,actor.position.x,actor.position.z,driving));
   if(!paused)playTime+=dt;
   attractions.update(playTime,dt,actor.position.x,actor.position.z,driving);
   // Follow the explorer with the shadow volume; keep resolution instead of stretching it.
   const shadowTexel=56/1024,sx=Math.round(actor.position.x/shadowTexel)*shadowTexel,sz=Math.round(actor.position.z/shadowTexel)*shadowTexel;
   sun.position.set(sx-10,18,sz+8);sun.target.position.set(sx,0,sz);
   aim.lerp(new T.Vector3(actor.position.x,.6,actor.position.z),1-Math.exp(-4*dt));const scale=Math.max(1,Math.min(1.6,1/camera.aspect))*settings.zoom;camera.position.lerp(aim.clone().addScaledVector(offset,scale),1-Math.exp(-3*dt));camera.lookAt(aim);pipeline.render();
  }raf=requestAnimationFrame(tick);
  return {dispose,jump(){if(!paused&&!driving&&jumpTime<0)jumpTime=0;},setPaused(v:boolean){paused=v;keys.clear();target=null;},setCovered(v:boolean){covered=v;},input(key:string,down:boolean){if(down)keys.add(key);else keys.delete(key);},vehicle(){if(paused||jumpTime>=0)return;if(driving){const p=car!.position;const candidates=[{x:p.x+2,z:p.z},{x:p.x-2,z:p.z}];const exit=candidates.find(c=>hubGround(c.x,c.z)&&obstacles.every(o=>Math.hypot(c.x-o.x,c.z-o.z)>o.r+.4));if(!exit)return;scene.attach(mouse!);mouse!.scale.setScalar(.5);mouse!.rotation.set(0,car!.rotation.y,0);mouse!.position.set(exit.x,0,exit.z);driving=false;}else if(nearCar){car!.add(mouse!);mouse!.scale.setScalar(.29);mouse!.position.set(0,.68,.03);driving=true;}speed=0;target=null;onVehicle(driving,!driving);},reset(){if(driving)car!.position.set(4,0,3);else mouse!.position.set(0,0,3);speed=0;target=null;}};
 }catch(e){dispose();throw e;}
}
