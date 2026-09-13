import { it,expect } from 'vitest';
import * as THREE from 'three';
import { robotLeg } from './robot-leg';
it('keeps leg lengths and a level foot under rotated, scaled character roots',()=>{
  const root=new THREE.Group(),hip=new THREE.Bone(),knee=new THREE.Bone(),foot=new THREE.Bone();
  root.add(hip);hip.add(knee);knee.add(foot);hip.position.y=1.2;knee.position.y=-.6;foot.position.y=-.6;
  root.scale.setScalar(.48);root.rotation.y=.7;
  const solve=robotLeg(root,hip,knee,foot),p=new THREE.Vector3(),q=new THREE.Vector3();
  for(let i=0;i<100;i++){
    hip.position.y=1.14;solve(Math.sin(i*.1),Math.max(0,Math.sin(i*.1)),1);
    expect(hip.getWorldPosition(p).distanceTo(knee.getWorldPosition(q))).toBeCloseTo(.288,5);
    expect(knee.getWorldPosition(p).distanceTo(foot.getWorldPosition(q))).toBeCloseTo(.288,5);
    const up=new THREE.Vector3(0,1,0).applyQuaternion(foot.getWorldQuaternion(new THREE.Quaternion()));
    expect(up.y).toBeCloseTo(1,5);expect(Number.isFinite(foot.getWorldPosition(p).y)).toBe(true);
  }
});
