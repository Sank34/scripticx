# Commons expansion

The accessible ground is now 84×84 instead of 46×46 (about 3.3× the area).
Inspiration: https://github.com/brunosimon/folio-2025/tree/main/sources/Game/World/Areas
Specifically the organization into distinct play areas, including CircuitArea.
New attraction geometry and game rules are original ScripticX code, not imported
Bruno models or the original rigid-body circuit implementation.

- East: Motor Loop, eight ordered physical rover checkpoints. Finish by returning
  to gate 1; the last lap is displayed locally. Walking cancels an active run.
  Pausing does not advance the circuit clock. No account rewards or persistence.
- North: Wind Garden, orbital rings and nearby-player-reactive kinetic sculptures.
- West: Reflection Lake, animated surface rings, shore dock and benches. The
  water has a collider; it is not a swimming area.
- Promenade, directional signs, extra trees and a visible perimeter.
- Existing physical atlas and mission-board interactions retained.

Grass uses 16 independently culled tiles at the previous density. Static
attractions are merged by material; all primitive geometries are normalized to
non-indexed form before merging. Shadows follow the player with a texel-snapped
volume. Reduced motion stops ambient kinetic/water animation.

QA: TypeScript and targeted ESLint pass; 396 tests pass across 81 files. Added
tests for ordered laps, on-foot cancellation, area masks, valid merged scenery,
lake collision volume and a bounded attraction mesh count. Browser smoke test
confirmed scene loading, rover entry and movement along the expanded paths.
Full physical-device performance and a complete manually driven lap are not yet
verified. Existing arcade steering and direct click-to-walk remain unchanged.
