/** Pass a loaded GLTF and a THREE.AnimationMixer for that scene.
 * Each mascot instance needs its own scene (SkeletonUtils.clone) and mixer.
 */
export function createMascotController(gltf, mixer) {
  const controls = ['blink', 'sad', 'lookLeft', 'lookRight'];
  const targets = [];
  gltf.scene.traverse(node => {
    if (node.morphTargetDictionary && node.morphTargetInfluences) targets.push(node);
  });
  const clips = new Map(gltf.animations.map(clip => [clip.name, clip]));
  const current = Object.fromEntries(controls.map(name => [name, 0]));
  const desired = { ...current };
  let active = null, disposed = false;
  const clamp = value => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  function setFace(values) {
    if (disposed) return;
    for (const name of controls) if (Object.hasOwn(values, name)) desired[name] = clamp(values[name]);
    // Opposing gaze directions cancel; do not add competing offsets.
    const gaze = desired.lookRight - desired.lookLeft;
    desired.lookRight = Math.max(0, gaze); desired.lookLeft = Math.max(0, -gaze);
  }
  function play(name, fadeSeconds = 0.2) {
    if (disposed) return false;
    const clip = clips.get(name);
    if (!clip) return false;
    const next = mixer.clipAction(clip);
    if (next === active) return true;
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    if (active) active.crossFadeTo(next, Math.max(0, fadeSeconds), false);
    active = next;
    return true;
  }
  return {
    setFace, play,
    setExpression(name) {
      if (!['happy', 'sad'].includes(name)) throw new Error(`Unknown expression: ${name}`);
      setFace({ sad: name === 'sad' ? 1 : 0 });
    },
    update(deltaSeconds) {
      if (disposed || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
      const dt = Math.min(deltaSeconds, 0.1);
      mixer.update(dt);
      const smoothing = 1 - Math.exp(-24 * dt);
      for (const name of controls) current[name] += (desired[name] - current[name]) * smoothing;
      // Facial values are applied after skeletal animation evaluation.
      for (const node of targets) for (const name of controls) {
        const index = node.morphTargetDictionary[name];
        if (index !== undefined) node.morphTargetInfluences[index] = current[name];
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      mixer.stopAllAction(); mixer.uncacheRoot(gltf.scene);
      // Geometry/material lifetime belongs to the caller (may be shared).
    },
  };
}
