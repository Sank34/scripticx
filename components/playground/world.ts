import * as THREE from 'three';
import {movementSpeed} from './movement-speed';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { isNearRobot, ROBOT_POSITION } from '@/lib/playground-rules';
import { clearPosition, moveWithCollisions, type Obstacle } from './collisions';
import {JUMP_DURATION,mouseJump} from './mouse-jump';
import { characterMotion, turnTowards } from './character-motion';
import { canWalk, atExit } from '@/lib/game-navigation';
import { editorCameraBlend } from './camera-transition';
import { renderPipeline } from './world-renderer';
import { emptyWorldPreview, previewFrame } from '@/lib/game-adventure';
import type { MissionFrame } from '@/lib/island-mission';
import { atmosphere } from './world-atmosphere';
import type { MissionId, ZoneId } from '@/lib/game-missions';
import { defaultSettings, type GameSettings } from '@/lib/playground-settings';

export type WorldDiagnostics={fps:number;drawCalls:number;triangles:number;width:number;height:number};
export type World = { diagnostics():WorldDiagnostics; preview(id:MissionId,frame:MissionFrame|null):void; clearPreview():void; react():void; dispose(): void; setInput(key: string, down: boolean): void; setPaused(value: boolean): void; setCovered(value:boolean):void; setSettings(value:GameSettings):void; setEditorOpen(value:boolean):void; setLampCount(count:number):void; complete(): void; setProgress(ids:MissionId[]):void; celebrate():void; jump():void; reset(): void };
export async function createWorld(host: HTMLElement, signal: AbortSignal, onNear: (near: boolean) => void, onLost: () => void, zone:ZoneId='meadow', onTravel:()=>void=()=>{}): Promise<World> {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor('#17132c');renderer.toneMappingExposure=1.15;
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog('#17132c', 24, 65);
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 80);
  const pipeline=renderPipeline(renderer,scene,camera);
  let editorOpen=false,editorBlend=0,focusMission:MissionId='lanterns',preview=emptyWorldPreview(),reaction=0;
  function updateEditorView(){const w=host.clientWidth,h=host.clientHeight;if(editorBlend>0&&w&&h){if(w>700)camera.setViewOffset(w,h,Math.min(600,w-40)/2*editorBlend,0,w,h);else camera.setViewOffset(w,h,0,h*.29*editorBlend,w,h);}else camera.clearViewOffset();}
  const ambient = new THREE.HemisphereLight('#8a9cff', '#5a245e', 1.8); scene.add(ambient);
  const sun = new THREE.DirectionalLight(zone==='meadow'?'#ffaf65':'#b9a5ff', 3.2); sun.position.set(-5, 12, 6); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, far: 35 }); sun.shadow.normalBias = .025; sun.shadow.bias=-.0001; scene.add(sun);
  const material = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: .95 });
  const clay=material('#ad5261'),top=material(zone==='meadow'?'#d89964':'#685d9c'),bark=material('#593855'),mint=material('#af568e'),pink=material('#dc839e');
  const rim=new THREE.DirectionalLight('#9760ff',2.5);rim.position.set(6,5,-8);scene.add(rim);
  const atmosphereFX=atmosphere(scene,zone);
  function mesh(geometry: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) {
    const o = new THREE.Mesh(geometry, mat); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; scene.add(o); return o;
  }
  mesh(new THREE.CylinderGeometry(8, 7.5, .65, 64), clay, 0, -.4, 0);
  mesh(new THREE.CylinderGeometry(8, 8, .08, 64), top, 0, -.035, 0);
  const water = mesh(new THREE.PlaneGeometry(180, 180), material('#292244'), 0, -.85, 0); water.rotation.x = -Math.PI / 2; water.castShadow = false;
  const robotObstacle={ ...ROBOT_POSITION, r: .65 };
  const obstacles: Obstacle[] = [robotObstacle,...atmosphereFX.obstacles];
  const foliage: THREE.Mesh[] = [];
  const crown = new THREE.IcosahedronGeometry(1, 1), trunk = new THREE.CylinderGeometry(.12, .21, 1.5, 8);
  for (const [x, z, scale] of [[-5,-3,1.2],[5,-4,1.4],[-5,3,1],[4,4,1.05],[-3.1,-5.5,1.1]]) {
    mesh(trunk, bark, x, .75, z); obstacles.push({ x, z, r: .5 });
    const leaf = mesh(crown, x < 0 ? mint : pink, x, 2.15, z); leaf.scale.set(scale, scale * .85, scale); foliage.push(leaf);
  }
  const pebble = new THREE.IcosahedronGeometry(.23, 0), stone = material('#e6d6b3');
  for (let i=0;i<22;i++) { const a=i*2.399; const r=6.4+(i%3)*.3; const o=mesh(pebble, stone, Math.cos(a)*r,.12,Math.sin(a)*r);o.scale.y=.65;obstacles.push({x:o.position.x,z:o.position.z,r:.2}); }
  const lampMaterial = material('#a8b6a1');
  const bulbs: THREE.Mesh[] = [];
  for (const [x,z] of [[-2,-2],[0,-3],[3,-4]]) {
    obstacles.push({x,z,r:.12});
    mesh(new THREE.CylinderGeometry(.07,.09,.8,8),bark,x,.4,z);
    bulbs.push(mesh(new THREE.SphereGeometry(.18,12,8),lampMaterial.clone(),x,.92,z));
  }
  const bridge=mesh(new THREE.BoxGeometry(2,.16,3),bark,0,-.45,zone==='meadow'?-7.7:7.7);
  for(let i=0;i<8;i++){const plank=new THREE.Mesh(new THREE.BoxGeometry(1.9,.05,.27),material('#ca967b'));plank.position.set(0,.12,-1.3+i*.37);bridge.add(plank);}
  for(const x of [-.95,.95]){const rail=new THREE.Mesh(new THREE.BoxGeometry(.06,.06,3),bark);rail.position.set(x,.5,0);bridge.add(rail);for(const z of [-1.2,1.2]){const post=new THREE.Mesh(new THREE.BoxGeometry(.08,.5,.08),bark);post.position.set(x,.25,z);bridge.add(post);}}
  if(zone==='meadow')for(let i=0;i<6;i++)mesh(new THREE.BoxGeometry(.9,.03,.4),material('#ca9d70'),0,.025,-3.1-i*.65);
  const gate=mesh(new THREE.BoxGeometry(3,.9,.18),material('#795374'),0,.5,-3.7);gate.visible=zone==='grove';
  const beacon=mesh(new THREE.CylinderGeometry(.28,.5,2.2,8),material('#e9b785'),0,1.1,-5.5);beacon.visible=zone==='grove';
  if(zone==='grove')obstacles.push({x:0,z:-5.5,r:.5});
  const beaconTop=mesh(new THREE.IcosahedronGeometry(.42,1),new THREE.MeshStandardMaterial({color:'#ffe9a9',emissive:'#ff9944',emissiveIntensity:.1}),0,2.4,-5.5);beaconTop.visible=zone==='grove';
  // A relay carriage visibly follows PRINT station numbers. It carries energy,
  // not the player; navigation remains controlled by verified mission progress.
  const relay=new THREE.Group();relay.visible=zone==='grove';scene.add(relay);
  const relayBase=new THREE.Mesh(new THREE.CylinderGeometry(.48,.55,.18,8),material('#806987'));relay.add(relayBase);
  const relayCrystal=new THREE.Mesh(new THREE.IcosahedronGeometry(.22,0),new THREE.MeshStandardMaterial({color:'#bde2b4',emissive:'#9bffa9',emissiveIntensity:1.8}));relayCrystal.position.y=.3;relay.add(relayCrystal);
  relay.position.set(-1.8,.18,-.8);
  const stationMaterials:THREE.MeshStandardMaterial[]=[];
  for(let n=1;n<=6;n++){
    const stationMaterial=new THREE.MeshStandardMaterial({color:n%2===0?'#bde2b4':'#846c87',emissive:'#9bffa9'});
    stationMaterials.push(stationMaterial);
    const station=mesh(new THREE.CylinderGeometry(.34,.34,.04,16),stationMaterial,-1.8,.04,-.8-n*.7);station.visible=zone==='grove';
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d')!;
    ctx.fillStyle='#f8efd9';ctx.font='bold 42px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(n),32,34);
    const label=new THREE.Mesh(new THREE.PlaneGeometry(.35,.35),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false}));
    label.rotation.x=-Math.PI/2;label.position.set(.52,.025,0);station.add(label);
  }
  const relayRail=mesh(new THREE.BoxGeometry(.09,.04,4.6),material('#b49bb7'),-1.8,.045,-3);relayRail.visible=zone==='grove';
  const signalBeam=mesh(new THREE.CylinderGeometry(.12,.8,10,12,1,true),new THREE.MeshBasicMaterial({color:'#b9ffbf',transparent:true,opacity:.14,depthWrite:false,blending:THREE.AdditiveBlending}),0,7.2,-5.5);signalBeam.visible=false;
  const lampLights=bulbs.map(o=>{const light=new THREE.PointLight('#ffb34d',0,4,2);light.position.copy(o.position);scene.add(light);return light;});
  for (let i=0;i<8;i++) mesh(new THREE.BoxGeometry(.9,.03,.4),material('#ca9d70'),Math.sin(i*.5)*.65,.025,2.5-i*.65);
  const keys = new Set<string>(); let paused=false, covered=false, disposed=false, raf=0, wasNear=false;
  let unlocked=false,gateOpen=false,beaconDone=false,traveling=false,jumpTime=-1;
  let destination: THREE.Vector3 | null = null;
  function walkable(x:number,z:number){return canWalk(zone,unlocked,gateOpen,x,z);}
  const raycaster=new THREE.Raycaster(), floor=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  function pointToWalk(event: PointerEvent) {
    if(paused)return;
    const rect=renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),camera);
    const point=raycaster.ray.intersectPlane(floor,new THREE.Vector3());
    if(point&&clearPosition(point,obstacles,walkable))destination=point;
  }
  renderer.domElement.addEventListener('pointerdown',pointToWalk);
  const mixers: THREE.AnimationMixer[]=[]; const imported: THREE.Object3D[]=[];
  function release() {
    if(disposed)return;disposed=true; cancelAnimationFrame(raf);atmosphereFX.dispose();pipeline.dispose();
    observer.disconnect(); renderer.domElement.removeEventListener('webglcontextlost',lost);
    renderer.domElement.removeEventListener('pointerdown',pointToWalk);
    mixers.forEach(m => m.stopAllAction());
    const geometries=new Set<THREE.BufferGeometry>(), materials=new Set<THREE.Material>();
    scene.traverse(o=>{ if(o instanceof THREE.Mesh){geometries.add(o.geometry); (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));} });
    geometries.forEach(g=>g.dispose());const textures=new Set<THREE.Texture>();materials.forEach(m=>{for(const value of Object.values(m))if(value instanceof THREE.Texture)textures.add(value);m.dispose();});textures.forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove();
  }
  function lost(event: Event) { event.preventDefault(); onLost(); release(); }
  renderer.domElement.addEventListener('webglcontextlost', lost);
  const observer = new ResizeObserver(() => { const w=host.clientWidth,h=host.clientHeight;if(w&&h){renderer.setSize(w,h);pipeline.resize(w,h);camera.aspect=w/h;updateEditorView();camera.updateProjectionMatrix();pipeline.render();} }); observer.observe(host);
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','ScripticX 3D playground');
  try {
    // allSettled ensures a late successful model is disposed if its peer fails.
    const loaded = await Promise.allSettled(['/game/mousey.glb','/game/robot.glb'].map(url=>fetch(url,{signal:AbortSignal.any([signal,AbortSignal.timeout(20000)])}).then(async response=>{if(!response.ok)throw Error('Model download failed');return new GLTFLoader().parseAsync(await response.arrayBuffer(),'/game/');})));
    for (const result of loaded) if(result.status==='fulfilled'&&disposed){result.value.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}
    for (const result of loaded) if(result.status==='fulfilled'&&!disposed){scene.add(result.value.scene);imported.push(result.value.scene);}
    if(signal.aborted || disposed || loaded.some(r=>r.status==='rejected')) throw new Error('Could not load the mascots');
    const [mouse,robot]=loaded.map(r=>(r as PromiseFulfilledResult<Awaited<ReturnType<GLTFLoader['loadAsync']>>>).value);
    mouse.scene.scale.setScalar(.5);robot.scene.scale.setScalar(.48);robot.scene.position.set(2,0,-2);robot.scene.rotation.y=-.45;
    mouse.scene.position.set(0,0,3);
    for(const root of imported) root.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=!/eye|pupil|catchlight|whisker|smile|nose|contour|bow|inner.ear/i.test(o.name);o.receiveShadow=false;}});
    const mixer=new THREE.AnimationMixer(mouse.scene);mixers.push(mixer);
    // Idle supplies the baseline. One procedural gait owns the limbs, avoiding
    // competing Walk clip phases that made knees and arms jerk.
    mixer.clipAction(mouse.animations.find(a=>a.name==='Idle')!).play();
    const robotMixer=new THREE.AnimationMixer(robot.scene);mixers.push(robotMixer);
    robotMixer.clipAction(robot.animations.find(a=>a.name==='Idle')!).play();let patrol=0;
    const mouseMotion=characterMotion(mouse.scene,'mouse'),robotMotion=characterMotion(robot.scene,'robot');
    let speed=0,patrolSpeed=0,look=0;
    const systemReduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let settings={...defaultSettings};
    let reduced=systemReduced;
    const aim=new THREE.Vector3(),targetAim=new THREE.Vector3(),editorAim=new THREE.Vector3(), offset=new THREE.Vector3(10,12,14), movement=new THREE.Vector3();
    let previous=performance.now(),elapsed=0,measuredSeconds=0,measuredFrames=0,fps=0;
    camera.position.copy(mouse.scene.position).add(offset);camera.lookAt(mouse.scene.position);
    function tick(now:number) {
      if(disposed)return; raf=requestAnimationFrame(tick);const duration=(now-previous)/1000,dt=Math.min(duration,.04);previous=now;
      if(document.hidden||covered){measuredSeconds=0;measuredFrames=0;return;}measuredSeconds+=duration;measuredFrames++;if(measuredSeconds>=1){fps=Math.round(measuredFrames/measuredSeconds);measuredFrames=0;measuredSeconds=0;}
      renderer.shadowMap.needsUpdate=true;elapsed+=dt;if(jumpTime>=0){jumpTime+=dt;if(jumpTime>=JUMP_DURATION)jumpTime=-1;}reaction=Math.max(0,reaction-dt);
      const x=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
      const z=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
      movement.set(x*.814+z*.581,0,-x*.581+z*.814);
      if(x||z)destination=null;
      else if(destination){movement.copy(destination).sub(mouse.scene.position);movement.y=0;if(movement.length()<.15){destination=null;movement.set(0,0,0);}}
      if(paused)movement.set(0,0,0);
      let moving=movement.lengthSq()>0;
      speed=THREE.MathUtils.damp(speed,movementSpeed(moving,keys.has('shift'),false,1.6),moving?6:12,dt);
      let actualSpeed=0;
      if(moving){movement.normalize();const p=mouse.scene.position;const next=moveWithCollisions(p,{x:movement.x*speed*dt,z:movement.z*speed*dt},obstacles,walkable);
        actualSpeed=Math.hypot(next.x-p.x,next.z-p.z)/Math.max(dt,.001);p.set(next.x,0,next.z);moving=actualSpeed>.01;if(!moving){destination=null;speed=0;}
        const target=Math.atan2(movement.x,movement.z);let delta=target-mouse.scene.rotation.y;delta=Math.atan2(Math.sin(delta),Math.cos(delta));mouse.scene.rotation.y+=delta*(1-Math.exp(-14*dt));
      }
      // Robot takes a short patrol around its station, then settles when approached.
      const patrolActive=!paused&&!isNearRobot(mouse.scene.position.x,mouse.scene.position.z);
      // Short strolls separated by resting beats instead of perpetual circling.
      const stroll=Math.sin(elapsed*.42)>.15;
      patrolSpeed=THREE.MathUtils.damp(patrolSpeed,patrolActive&&stroll?.65:0,3,dt);
      patrol+=dt*patrolSpeed;robot.scene.position.set(2+Math.sin(patrol)*.38,0,-2+(Math.cos(patrol)-1)*.38);
      robotObstacle.x=robot.scene.position.x;robotObstacle.z=robot.scene.position.z;
      const playerAngle=Math.atan2(mouse.scene.position.x-robot.scene.position.x,mouse.scene.position.z-robot.scene.position.z);
      robot.scene.rotation.y=turnTowards(robot.scene.rotation.y,patrolActive?Math.atan2(Math.cos(patrol),-Math.sin(patrol)):playerAngle,dt,4);
      look=THREE.MathUtils.damp(look,patrolActive?0:Math.atan2(Math.sin(playerAngle-robot.scene.rotation.y),Math.cos(playerAngle-robot.scene.rotation.y)),5,dt);
      mouseMotion.reset();robotMotion.reset();
      mixers.forEach(m=>m.update(dt));
      mouseMotion(dt,actualSpeed,!patrolActive,0,reduced,0,jumpTime);
      robotMotion(dt,patrolSpeed*.38,!patrolActive,look,reduced,Math.sin(reaction/2.5*Math.PI));
      mouse.scene.position.y=mouseJump(jumpTime,reduced).height;
      const blink=Math.max(0,1-Math.abs((elapsed%4.8)-4.5)/.11);
      for(const [index,root] of imported.entries())root.traverse(o=>{if(o instanceof THREE.Mesh&&o.morphTargetDictionary&&o.morphTargetInfluences){const i=o.morphTargetDictionary.blink;if(i!==undefined)o.morphTargetInfluences[i]=index?Math.max(0,1-Math.abs(((elapsed+.9)%5.3)-5)/.12):blink;}});
      if(!reduced)foliage.forEach((o,i)=>o.rotation.z=Math.sin(elapsed*.8+i)*.025);
      bridge.position.y=THREE.MathUtils.damp(bridge.position.y,unlocked||zone==='grove'?.02:-.45,4,dt);
      const gateLit=preview.mission==='gate'?preview.gateSignal==='OPEN':gateOpen;
      gate.position.y=THREE.MathUtils.damp(gate.position.y,gateLit?-1:.5,4,dt);
      const relayStep=preview.mission==='beacon'?preview.relayStep:beaconDone?6:0;
      relay.position.z=THREE.MathUtils.damp(relay.position.z,-.8-relayStep*.7,8,dt);
      relay.position.y=.18+(reduced?0:Math.sin(elapsed*2)*.025);
      const relayColor=relayStep%2===0?'#9bffa9':'#ff927c';
      (relayCrystal.material as THREE.MeshStandardMaterial).emissive.set(relayColor);
      stationMaterials.forEach((m,i)=>m.emissiveIntensity=i+1===relayStep?1.5:0);
      (beaconTop.material as THREE.MeshStandardMaterial).emissiveIntensity=beaconDone?3:relayStep===6?1.5:.1;
      signalBeam.visible=zone==='grove'&&beaconDone;
      signalBeam.scale.x=signalBeam.scale.z=reduced?1:1+Math.sin(elapsed*1.8)*.15;
      bulbs.forEach((bulb,i)=>{const lit=preview.mission==='lanterns'?preview.lamps.includes(i+1):unlocked;const m=bulb.material as THREE.MeshStandardMaterial;m.emissive.set(lit?'#ffae55':'#000000');m.emissiveIntensity=lit?2.5:0;lampLights[i].intensity=lit?5:0;});
      beaconTop.rotation.y+=reduced?0:dt*.5;
      if(!paused&&!traveling&&atExit(zone,unlocked,mouse.scene.position.x,mouse.scene.position.z)){traveling=true;keys.clear();destination=null;onTravel();}
      const near=zone==='grove'&&gateOpen?Math.hypot(mouse.scene.position.x,mouse.scene.position.z+5.5)<2:isNearRobot(mouse.scene.position.x,mouse.scene.position.z);if(near!==wasNear){wasNear=near;onNear(near);}
      const blend=editorCameraBlend(editorBlend,editorOpen,dt,reduced);if(blend!==editorBlend){editorBlend=blend;updateEditorView();}targetAim.set(mouse.scene.position.x*.35,.7,mouse.scene.position.z*.35);editorAim.set(focusMission==='beacon'?-.7:0,.7,focusMission==='beacon'?-3.5:-2.2);targetAim.lerp(editorAim,editorBlend);aim.lerp(targetAim,reduced?1:1-Math.exp(-10*dt));camera.position.lerp(aim.clone().addScaledVector(offset,Math.max(1,Math.min(1.65,1.15/camera.aspect))*settings.zoom),reduced?1:1-Math.exp(-3*dt));camera.lookAt(aim);
      pipeline.render();
    }
    raf=requestAnimationFrame(tick);
    renderer.setSize(host.clientWidth||1,host.clientHeight||1);pipeline.resize(host.clientWidth||1,host.clientHeight||1);camera.aspect=(host.clientWidth||1)/(host.clientHeight||1);camera.updateProjectionMatrix();pipeline.render();
    return {diagnostics(){return {fps,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,width:renderer.domElement.width,height:renderer.domElement.height};},preview(id,frame){focusMission=id;preview=previewFrame(preview,id,frame);},clearPreview(){preview=emptyWorldPreview();},react(){reaction=2.5;},dispose:release,setInput(key,down){if(down)keys.add(key);else keys.delete(key);},setPaused(value){paused=value;keys.clear();destination=null;},setCovered(value){covered=value;measuredFrames=0;measuredSeconds=0;previous=performance.now();},setSettings(value){pipeline.quality(value.quality==='high');atmosphereFX.setQuality(value.quality==='low');const qualityChanged=settings.quality!==value.quality;settings={...value};reduced=systemReduced||value.reducedMotion;renderer.shadowMap.enabled=value.quality!=='low';if(qualityChanged)renderer.shadowMap.needsUpdate=true;if(qualityChanged)scene.traverse(o=>{if(o instanceof THREE.Mesh){for(const m of Array.isArray(o.material)?o.material:[o.material])m.needsUpdate=true;}});pipeline.render();},setEditorOpen(value){editorOpen=value;},setLampCount(count){bulbs.forEach((o,i)=>{const m=o.material as THREE.MeshStandardMaterial;m.color.set(i<count?'#e0ffb2':'#a8b6a1');m.emissive.set(i<count?'#b5ef87':'#000000');m.emissiveIntensity=i<count?2.5:0;lampLights[i].intensity=i<count?5:0;});pipeline.render();},setProgress(ids){unlocked=ids.includes('lanterns');gateOpen=ids.includes('gate');beaconDone=ids.includes('beacon');if(unlocked){bulbs.forEach(o=>{const m=o.material as THREE.MeshStandardMaterial;m.color.set('#e0ffb2');m.emissive.set('#ffae55');m.emissiveIntensity=2.5;});lampLights.forEach(l=>l.intensity=5);}},jump(){if(!paused&&jumpTime<0)jumpTime=0;},celebrate(){if(jumpTime<0)jumpTime=0;reaction=2.5;},complete(){bulbs.forEach(o=>{const m=o.material as THREE.MeshStandardMaterial;m.color.set('#e0ffb2');m.emissive.set('#b5ef87');m.emissiveIntensity=2.5;});},reset(){jumpTime=-1;mouse.scene.position.set(0,0,3);traveling=false;keys.clear();destination=null;}};
  } catch(error) { release(); throw error; }
}
