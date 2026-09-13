# ScripticX mascots — WebGL asset baseline

`mousey/` and `robot/` contain editable Blender files and GLBs with skin rigs,
facial morphs and named in-place `Idle` / `Walk` animation loops. Original assets
are unchanged. The GLBs contain characters only, not studio decor or lights.

## Blender controls

Select the armature and use Object → Custom Properties: `blink`, `sad`,
`lookLeft`, `lookRight` (0–1). Happy is the default design. These drive the
shape keys in Blender. The GLB contains native morph targets, not drivers.
Pose Mode controls the FK bones. Enable the desired NLA track to preview a clip;
the saved editing file has the tracks muted for neutral posing.

## Three.js integration

```js
import { AnimationMixer } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createMascotController } from './mascot-controller.mjs';

const gltf = await new GLTFLoader().loadAsync('/assets/robot/robot.glb');
scene.add(gltf.scene);
const actor = createMascotController(gltf, new AnimationMixer(gltf.scene));
actor.play('Idle');
actor.setExpression('happy');
actor.setFace({ blink: 1 }); // return to 0 after the blink interval
// Each frame: actor.update(deltaSeconds);
// Movement: actor.play('Walk'); translate the scene root from game logic.
// Cleanup: actor.dispose(); scene.remove(gltf.scene);
```

Use SkeletonUtils.clone for additional instances, with one mixer/controller per
instance. Do not share morph influence arrays. Dispose GPU resources only when
no other instance uses them. Schedule blinking in the game's update loop rather
than leaving unmanaged timers. Use renderer tone mapping and soft lighting to
match the previews; appearances depend on scene lighting.

## Runtime constraints / remaining work

- glTF axes: Y up, character faces +Z. Blender source: Z up, faces -Y.
- No embedded images, external textures, DRACO or decoder dependency.
- Mousey has 7 bones; robot has 15. Separate mechanical parts remain editable.
- Use separate simple capsule colliders, not render-mesh collision. Scale the
  asset and collider consistently to your game's dimensions.
- Walk is a prototype in-place loop: tune speed/foot contact in the actual game.
- No IK, lip sync, separate finger controls, LODs or mobile performance promise.
- Many separate pieces mean nontrivial draw calls. Profile in the real game
  before crowds; merging skinned meshes must preserve skin/morph attributes.
- Controller logic is unit-tested. Final browser GPU/performance testing and
  physics integration still require the actual game scene.

Run controller checks: `node artifacts/game/controller.test.mjs`.
Regenerate assets with Blender: `--background --threads 4 --python artifacts/prepare_game_mascots.py`.
