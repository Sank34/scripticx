import { describe,it,expect } from 'vitest';
import * as THREE from 'three';
import { footstep,turnTowards,characterMotion } from './character-motion';
describe('character motion',()=>{
  it('plants the foot for most of the cycle and closes the loop',()=>{expect(footstep(.3).lift).toBe(0);expect(footstep(.8).lift).toBeCloseTo(1);expect(footstep(1)).toEqual(footstep(0));expect(footstep(.6-1e-8).stride).toBeCloseTo(footstep(.6+1e-8).stride);});
  it('turns over the short arc independent of frame rate',()=>{const a=turnTowards(3,-3,.1);expect(a).toBeGreaterThan(3);expect(turnTowards(turnTowards(0,1,.05),1,.05)).toBeCloseTo(turnTowards(0,1,.1));});
  it('keeps procedurally translated feet stable at rest',()=>{const root=new THREE.Group();const left=new THREE.Bone();left.name='footL';root.add(left);const motion=characterMotion(root,'mouse');for(let i=0;i<300;i++)motion(1/60,0,false,0,false);expect(left.position.length()).toBe(0);});
  it('does not accumulate additive rotation on optimized static tracks',()=>{const root=new THREE.Group(),head=new THREE.Bone();head.name='head';root.add(head);const motion=characterMotion(root,'robot');for(let i=0;i<3600;i++){motion.reset();motion(1/60,0,false,0,false);}expect(head.quaternion.angleTo(new THREE.Quaternion())).toBeLessThan(.1);});
});
