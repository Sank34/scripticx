import * as THREE from 'three';
import { robotLeg } from './robot-leg';
import {mouseJump} from './mouse-jump';

/** Longer planted phase, eased recovery. Phase is measured in cycles. */
export function footstep(phase: number) {
  const t=((phase%1)+1)%1;
  if(t<.6)return {stride:1-2*t/.6,lift:0};
  const swing=(t-.6)/.4;
  return {stride:-Math.cos(Math.PI*swing),lift:Math.sin(Math.PI*swing)**2};
}
export function turnTowards(current: number,target: number,dt: number,rate=6) {
  return current+Math.atan2(Math.sin(target-current),Math.cos(target-current))*(1-Math.exp(-rate*dt));
}
export function gestureEnvelope(time:number,start:number,hold:number,end:number){
  return THREE.MathUtils.smootherstep(time,0,start)*(1-THREE.MathUtils.smootherstep(time,hold,end));
}

/** Additive poses are always applied AFTER mixer.update; no accumulated rotations. */
export function characterMotion(root:THREE.Object3D,kind:'mouse'|'robot') {
  const bones=new Map<string,THREE.Object3D>();
  root.traverse(o=>{if(o instanceof THREE.Bone)bones.set(o.name,o);});
  const get=(name:string)=>bones.get(THREE.PropertyBinding.sanitizeNodeName(name));
  const feet=['L','R'].map(side=>get('foot.'+side)).map(bone=>bone?{bone,rest:bone.position.clone()}:null);
  const legs=kind==='robot'?['L','R'].map(side=>{const hip=get('thigh.'+side),knee=get('shin.'+side),foot=get('foot.'+side);return hip&&knee&&foot?robotLeg(root,hip,knee,foot):null;}):[];
  const xAxis=new THREE.Vector3(1,0,0),yAxis=new THREE.Vector3(0,1,0),zAxis=new THREE.Vector3(0,0,1),q=new THREE.Quaternion();
  function rotate(name:string,x=0,y=0,z=0){const bone=get(name);if(!bone)return;bone.quaternion.multiply(q.setFromAxisAngle(xAxis,x));bone.quaternion.multiply(q.setFromAxisAngle(yAxis,y));bone.quaternion.multiply(q.setFromAxisAngle(zAxis,z));}
  let weight=0,cycle=0,clock=0,greeting=10,nearBefore=false,lastGreeting=-20;
  const footOffsets=[new THREE.Vector3(),new THREE.Vector3()];
  const base=[...bones.values()].map(bone=>({bone,position:bone.position.clone(),quaternion:bone.quaternion.clone()}));
  const update=(dt:number,speed:number,near:boolean,attention:number,reduced:boolean,reaction=0,jumpTime=-1)=>{
    // Remember the mixer pose so static/optimized animation tracks cannot
    // accidentally accumulate our additive rotation on the next frame.
    base.forEach(p=>{p.position.copy(p.bone.position);p.quaternion.copy(p.bone.quaternion);});
    clock+=dt;
    weight=THREE.MathUtils.damp(weight,Math.min(1,speed/(kind==='mouse'?1.5:.3)),10,dt);
    cycle+=speed*dt/(kind==='mouse'?.56:.38);
    if(near&&!nearBefore&&clock-lastGreeting>8){greeting=0;lastGreeting=clock;}
    nearBefore=near;greeting+=dt;
    const secondary=reduced?.2:1,phase=cycle*Math.PI*2;
    if(kind==='mouse'){
      const jump=mouseJump(jumpTime,reduced);
      if(jumpTime>=0){weight=0;footOffsets.forEach(o=>o.set(0,0,0));}
      feet.forEach((entry,i)=>{if(!entry)return;const step=footstep(cycle+i*.5),offset=footOffsets[i];offset.z=THREE.MathUtils.damp(offset.z,step.stride*.40*weight,22,dt);offset.y=THREE.MathUtils.damp(offset.y,step.lift*.14*weight,25,dt);entry.bone.position.copy(entry.rest).add(offset);rotate('foot.'+(i?'R':'L'),step.lift*-.09*weight);});
      rotate('body',.025*weight,0,Math.sin(phase)*.022*weight*secondary);
      rotate('chest',0,Math.sin(phase)*-.035*weight,0);
      rotate('head',Math.sin(clock*1.7)*.018*secondary,Math.sin(phase-.4)*.025*weight,Math.sin(phase)*-.025*weight);
      rotate('tail',Math.sin(phase-.7)*.045*weight,Math.sin(clock*1.2)*.025*secondary+Math.sin(phase-.8)*.09*weight);
      const body=get('body');if(body)body.position.y-=jump.crouch;
      feet.forEach(entry=>{if(entry)entry.bone.position.y+=jump.tuck;});
      rotate('chest',jump.lean);rotate('head',-jump.lean*.65);rotate('tail',jump.tuck*.8);
    }else{
      const breathe=Math.sin(clock*1.3)*.008*secondary;
      const glance=gestureEnvelope(clock%11,1.2,2.1,3.6)*.09*(near?0:1)*secondary;
      rotate('body',breathe+.025*weight,Math.sin(phase)*.035*weight,Math.sin(phase)*.035*weight);
      rotate('head',-breathe,THREE.MathUtils.clamp(attention,-.4,.4)*.6+glance,glance*.3);
      if(!reduced&&reaction>0){rotate('head',Math.sin(clock*7)*.07*reaction);rotate('upper_arm.L',-.45*reaction,0,.12*reaction);rotate('forearm.L',-.35*reaction);rotate('hand.L',0,Math.sin(clock*8)*.15*reaction);}
      for(const [side,sign] of [['L',1],['R',-1]] as const){
        rotate('upper_arm.'+side,-Math.sin(phase-.2)*sign*.18*weight+.008*Math.sin(clock*1.1+sign)*secondary);
        rotate('forearm.'+side,-.09*weight-Math.max(0,Math.sin(phase-.4)*sign)*.15*weight);
        rotate('hand.'+side,Math.sin(phase-.65)*sign*.065*weight,Math.sin(clock*1.3+sign)*.008*secondary);
      }
      // One greeting per approach, with an eased raise/hold/lower envelope.
      if(greeting<3.7&&!reduced){const envelope=gestureEnvelope(greeting,.85,2.3,3.7);const wave=gestureEnvelope(greeting-.65,.3,1.2,1.8);rotate('upper_arm.R',-.9*envelope,0,-.28*envelope);rotate('forearm.R',-.75*envelope);rotate('hand.R',0,Math.sin((greeting-.65)*8)*.20*wave);rotate('head',-.045*envelope,0,.035*envelope);}
      const body=get('body');if(body)body.position.y-=.055*weight;
      legs.forEach((solve,i)=>{const step=footstep(cycle+i*.5);solve?.(step.stride,step.lift,weight);});
    }
  };
  return Object.assign(update,{reset(){base.forEach(p=>{p.bone.position.copy(p.position);p.bone.quaternion.copy(p.quaternion);});}});
}
