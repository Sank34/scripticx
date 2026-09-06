import * as THREE from 'three';

/** Two-bone IK with a forward knee pole; preserves the imported bone roll. */
export function robotLeg(root: THREE.Object3D, hip: THREE.Object3D, knee: THREE.Object3D, foot: THREE.Object3D) {
  root.updateWorldMatrix(true,true);
  const h=new THREE.Vector3(),k=new THREE.Vector3(),f=new THREE.Vector3();
  hip.getWorldPosition(h);knee.getWorldPosition(k);foot.getWorldPosition(f);
  const upper=h.distanceTo(k),lower=k.distanceTo(f);
  const rest=root.worldToLocal(f.clone());
  const rootQ=root.getWorldQuaternion(new THREE.Quaternion());
  const footRest=rootQ.clone().invert().multiply(foot.getWorldQuaternion(new THREE.Quaternion()));
  const target=new THREE.Vector3(),direction=new THREE.Vector3(),pole=new THREE.Vector3(),joint=new THREE.Vector3();
  const current=new THREE.Vector3(),wanted=new THREE.Vector3(),parentQ=new THREE.Quaternion(),worldQ=new THREE.Quaternion(),delta=new THREE.Quaternion();
  function aim(bone:THREE.Object3D,child:THREE.Object3D,to:THREE.Vector3){
    bone.getWorldPosition(h);child.getWorldPosition(current);current.sub(h).normalize();wanted.copy(to).sub(h).normalize();
    delta.setFromUnitVectors(current,wanted);bone.getWorldQuaternion(worldQ);worldQ.premultiply(delta);
    bone.parent!.getWorldQuaternion(parentQ).invert();bone.quaternion.copy(parentQ.multiply(worldQ));bone.updateWorldMatrix(false,true);
  }
  return (stride:number,lift:number,weight:number)=>{
    root.updateWorldMatrix(true,true);
    target.copy(rest);target.z+=stride*.22*weight;target.y+=lift*.13*weight;root.localToWorld(target);
    hip.getWorldPosition(h);direction.copy(target).sub(h);
    const distance=THREE.MathUtils.clamp(direction.length(),Math.abs(upper-lower)+.0001,upper+lower-.0001);direction.normalize();
    target.copy(h).addScaledVector(direction,distance);
    root.getWorldQuaternion(rootQ);pole.set(0,0,1).applyQuaternion(rootQ);pole.addScaledVector(direction,-pole.dot(direction)).normalize();
    const along=(upper*upper-lower*lower+distance*distance)/(2*distance);
    joint.copy(h).addScaledVector(direction,along).addScaledVector(pole,Math.sqrt(Math.max(0,upper*upper-along*along)));
    aim(hip,knee,joint);aim(knee,foot,target);
    foot.parent!.getWorldQuaternion(parentQ).invert();foot.quaternion.copy(parentQ.multiply(rootQ).multiply(footRest));
    foot.updateWorldMatrix(false,true);
  };
}
