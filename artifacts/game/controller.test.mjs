import assert from 'node:assert/strict';
import { createMascotController } from './mascot-controller.mjs';
const mesh = { morphTargetDictionary: { blink:0, sad:1, lookLeft:2, lookRight:3 }, morphTargetInfluences:[0,0,0,0] };
const scene = { traverse(fn) { fn(mesh); fn({}); } };
const actions = new Map(); let ticks=0, stopped=0;
const mixer = {
  clipAction(clip) {
    if (!actions.has(clip.name)) actions.set(clip.name, {reset(){return this},setEffectiveTimeScale(){return this},setEffectiveWeight(){return this},play(){return this},crossFadeTo(){return this}});
    return actions.get(clip.name);
  }, update(dt){assert(dt<=.1);ticks++},stopAllAction(){stopped++},uncacheRoot(root){assert.equal(root,scene)},
};
const control=createMascotController({scene,animations:[{name:'Idle'},{name:'Walk'}]},mixer);
assert(control.play('Idle'));assert(control.play('Walk'));assert(!control.play('missing'));
control.setFace({blink:3,lookLeft:.8,lookRight:.2});control.setExpression('sad');
for(let i=0;i<60;i++)control.update(1/60);
assert(mesh.morphTargetInfluences[0]>.99);assert(mesh.morphTargetInfluences[1]>.99);
assert(Math.abs(mesh.morphTargetInfluences[2]-.6)<.001);assert.equal(mesh.morphTargetInfluences[3],0);
assert.throws(()=>control.setExpression('unsupported'));
control.update(NaN);control.update(-1);assert.equal(ticks,60);
control.dispose();control.dispose();control.update(.01);assert.equal(stopped,1);assert.equal(ticks,60);
console.log('Controller tests passed');
