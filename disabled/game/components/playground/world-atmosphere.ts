import * as THREE from 'three';
import type { ZoneId } from '@/lib/game-missions';
import type { Obstacle } from './collisions';

/** Shared low-poly geometry; no external asset or full-screen postprocessing cost. */
export function atmosphere(scene:THREE.Scene,zone:ZoneId){
  const obstacles:Obstacle[]=[];
  const dummy=new THREE.Object3D();
  const grass=new THREE.InstancedMesh(new THREE.ConeGeometry(.055,.42,3),new THREE.MeshStandardMaterial({color:zone==='grove'?'#60937e':'#b5a857',roughness:1}),700);
  grass.castShadow=false;grass.receiveShadow=true;
  for(let i=0;i<700;i++){const a=i*2.399963,r=3.7+((i*37)%100)/31;dummy.position.set(Math.cos(a)*r,.15,Math.sin(a)*r);dummy.rotation.set(0,a,Math.sin(i)*.15);dummy.scale.setScalar(.6+(i%5)*.17);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);}
  scene.add(grass);
  const blossoms=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.22,0),new THREE.MeshStandardMaterial({color:zone==='meadow'?'#e56fac':'#a67ad8',roughness:1}),500);
  const trees=[[-5,-3,1.2],[5,-4,1.4],[-5,3,1],[4,4,1.05],[-3.1,-5.5,1.1]];
  for(let i=0;i<500;i++){const [x,z,s]=trees[i%5],a=i*2.399,b=Math.acos(1-2*((i*43)%101)/101);dummy.position.set(x+Math.sin(b)*Math.cos(a)*s,2.15+Math.cos(b)*s*.8,z+Math.sin(b)*Math.sin(a)*s);dummy.scale.setScalar(.7+(i%4)*.14);dummy.rotation.set(a,b,0);dummy.updateMatrix();blossoms.setMatrixAt(i,dummy.matrix);}blossoms.receiveShadow=true;scene.add(blossoms);
  const glowCanvas=document.createElement('canvas');glowCanvas.width=64;glowCanvas.height=64;const glowContext=glowCanvas.getContext('2d')!;
  const gradient=glowContext.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,206,115,1)');gradient.addColorStop(.18,'rgba(255,136,40,.65)');gradient.addColorStop(1,'rgba(255,100,0,0)');glowContext.fillStyle=gradient;glowContext.fillRect(0,0,64,64);
  const glowTexture=new THREE.CanvasTexture(glowCanvas);const decorativeLights:THREE.PointLight[]=[];
  for(const [x,z] of [[-3.1,2.2],[3.4,-.5]]){
    obstacles.push({x,z,r:.15});
    const post=new THREE.Mesh(new THREE.CylinderGeometry(.06,.08,1.2,6),new THREE.MeshStandardMaterial({color:'#4f3455'}));post.position.set(x,.6,z);scene.add(post);
    const lantern=new THREE.Mesh(new THREE.BoxGeometry(.23,.32,.23),new THREE.MeshStandardMaterial({color:'#ffd581',emissive:'#ffac47',emissiveIntensity:3}));lantern.position.set(x,1.32,z);scene.add(lantern);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(.25,.18,4),new THREE.MeshStandardMaterial({color:'#493552'}));roof.position.set(x,1.58,z);scene.add(roof);
    const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,transparent:true,opacity:.65,depthWrite:false,blending:THREE.AdditiveBlending}));glow.position.set(x,1.32,z);glow.scale.setScalar(1.5);scene.add(glow);
    const light=new THREE.PointLight('#ff9f39',4,4,2);light.position.set(x,1.5,z);scene.add(light);decorativeLights.push(light);
  }
  const flowers=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.065,0),new THREE.MeshStandardMaterial({color:'#ffa1e6',emissive:'#8b2f8b',emissiveIntensity:.35}),100);
  for(let i=0;i<100;i++){const a=i*2.399,r=4+(i%8)*.3;dummy.position.set(Math.cos(a)*r,.4,Math.sin(a)*r);dummy.scale.setScalar(1);dummy.updateMatrix();flowers.setMatrixAt(i,dummy.matrix);}scene.add(flowers);
  const textures:THREE.Texture[]=[glowTexture];
  function sign(text:string,x:number,z:number){
    for(const dx of [-.8,-.4,0,.4,.8])obstacles.push({x:x+dx,z,r:.2});
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d')!;
    ctx.fillStyle='#292035';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#d4bce1';ctx.lineWidth=3;ctx.strokeRect(8,8,496,112);ctx.fillStyle='#fff1da';ctx.font='40px "Amatic SC", sans-serif';ctx.textAlign='center';ctx.fillText(text,256,82);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);
    const panel=new THREE.Mesh(new THREE.BoxGeometry(2,.48,.1),[new THREE.MeshStandardMaterial({color:'#3b2a3d'}),new THREE.MeshStandardMaterial({color:'#3b2a3d'}),new THREE.MeshStandardMaterial({color:'#3b2a3d'}),new THREE.MeshStandardMaterial({color:'#3b2a3d'}),new THREE.MeshBasicMaterial({map:texture}),new THREE.MeshStandardMaterial({color:'#3b2a3d'})]);panel.position.set(x,1.2,z);scene.add(panel);
    const post=new THREE.Mesh(new THREE.CylinderGeometry(.045,.065,1.2,5),new THREE.MeshStandardMaterial({color:'#5b4054'}));post.position.set(x,.6,z);scene.add(post);
  }
  sign(zone==='meadow'?'THE LEARNING GROVE →':'← LANTERN MEADOW',zone==='meadow'?-1.9:-2,zone==='meadow'?-5.5:5.8);
  sign(zone==='meadow'?'HELLO, EXPLORER!':'THE ENERGY GATE',-2.2,zone==='meadow'?2.5:-2);
  return {obstacles,setQuality(low:boolean){grass.count=low?350:700;flowers.count=low?50:100;blossoms.count=low?250:500;decorativeLights.forEach(l=>l.intensity=low?0:4);},dispose(){scene.traverse(o=>{if(o instanceof THREE.Sprite)o.material.dispose();});textures.forEach(t=>t.dispose());}};
}
