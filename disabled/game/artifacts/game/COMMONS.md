# ScripticX Commons

Entry: `/play/world`; `/play` launches Commons. The existing islands remain
mission destinations, not the central navigation space.

- WASD/arrows or click/tap to move; Space jumps on foot.
- F or the contextual vehicle button enters/exits the rover.
- Tab/E or the contextual preview opens an atlas/quest station only nearby.
- The atlas respects account progression before offering Energy Grove.
- Expeditions use a black transition and retain the existing verified mission API.
- Mission menu links return to `/play/world?resume=1`.

The rover is original geometry made in Blender, not a downloaded model.
Source: `build-rover.py`, editable `scripticx-rover.blend`, browser export
`public/game/scripticx-rover.glb` (~169 KB). Mousey reuses the existing GLB and
is attached to the cockpit at runtime. Movement is arcade steering, not a
rigid-body vehicle simulation. Grass interaction is visual and does not add
colliders. Trees and paths are instanced; moving grass updates only displaced
instance matrices. Saved quality/reduced-motion settings are respected.

QA: typecheck, scoped ESLint, full Vitest suite; browser smoke testing of
boarding, contextual atlas with Tab, travel to Energy Grove and return to
Commons, desktop and narrow layout. No reward submissions or account resets
were performed. Real-device/mobile GPU benchmarking remains separate from
viewport layout testing.

Visual reference: user screen recording and https://bruno-simon.com/.
No third-party models, textures or source code were imported.
