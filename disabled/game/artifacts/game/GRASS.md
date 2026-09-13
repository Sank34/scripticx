# Commons grass

Adapted from Bruno Simon's folio-2025 `sources/Game/World/Grass.js` for the
existing Three.js WebGLRenderer. Original license is shipped in
`public/game/licenses/bruno-simon-grass.txt`.

- Camera-facing, single-triangle blades; no alpha texture or per-blade objects.
- Static jittered grid, 260² candidate blades on normal quality / 150² on low,
  filtered by paths, station decks, garage, spawn and terrain bounds.
- Root-to-tip vertex colors, spatially varied height, root-anchored GPU wind.
- Eight time-stamped interaction samples retain a short trail, recovering over
  0.9 seconds. Only fixed-size uniforms update per frame; no matrix uploads.
- Receives existing scene shadows but does not add grass shadow draw calls.
- Reduced motion disables ambient wind. Existing world teardown disposes both
  the mesh geometry and material, and covered/hidden scenes stop ticking.

Validation: TypeScript and targeted ESLint pass; all 393 tests pass (80 files).
Browser smoke test at 509×755: rendered meadow and tree shadows, moved Mousey
from spawn into the grass, verified the displaced patch around the character.
Physical mobile GPU benchmarks and broad-device frame-time measurements remain
unverified; the low-quality density budget is not a measured FPS guarantee.
