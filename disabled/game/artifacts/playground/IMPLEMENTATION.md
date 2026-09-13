# ScripticX Island — implementation and verification

## Gameplay

`/play` remains the platform hub; `/play/island` is the full-screen game.

| Mission | Concept | World consequence | One-time account reward |
| --- | --- | --- | --- |
| `lanterns` | Fix a WHILE loop | Light three lanterns and open the bridge | 500 points + `miniscript-background` |
| `gate` | Test a sensor using IF / ELSE | Open the grove gate | 500 points |
| `beacon` | Combine a loop and condition | Move an energy-relay carriage to stations 2, 4 and 6; activate the beacon | 500 points |

The welcome screen and scene transitions use a black overlay with a white running Mousey silhouette. Settings include graphics quality, camera distance, reduced motion, movement buttons, sound and volume. Space/the sparkle button produces cosmetic sparks, never rewards.

The storm/restoration story now links all three missions. Each has a short robot dialogue and an aftermath, with a final transmission once the beacon is restored. The adventure journal tracks the next objective, discovered clues and confirmed account rewards; future clues remain locked. Replays explicitly explain that rewards will not be granted again.

`game-adventure.ts` owns derived story/journal state and temporary world previews. PRINT frames drive the lamps, gate rehearsal and energy carriage while the code remains visible. Temporary previews never unlock navigation. Closing/resetting the editor restores the verified world. On mobile the editor docks below the scene; desktop retains the side-by-side layout. The carriage carries energy, not the player.

## Authority and persistence

- `POST /api/play/progress` authenticates the session and verifies MiniScript+ source with the existing interpreter. The browser's preview, success flag, identity, reward amounts and local storage are not authoritative.
- Sensor missions run against multiple server-defined input values. Programs are limited to 2,000 characters, 60 lines, 160 execution steps and a 75 ms wall-clock execution budget per case. Input replacement and unsafe variable names are rejected.
- `20260906003000_game_mission_rewards.sql` adds the mission catalog, completion receipts and service-only grant function. The migration was confirmed present in the connected database during this work.
- The grant locks the player's profile row and checks the unique `(user_id, mission_id)` receipt before changing points. Receipt, points and inventory are committed in one transaction. Prerequisites are checked in that transaction. Repeated completions return zero additional points.
- Account progress is restored from receipts; previous browser-only progress is not imported. A failed/unconfirmed request can be retried safely.
- Reward configuration lives in the server-side SQL catalog, not a client-submitted field.

## Rendering and lifecycle

The two low-poly scenes combine warm lanterns, violet ambient/rim lighting, instanced vegetation, 3D signs and pooled sparks. High quality uses display-aware rendering up to 2× pixel density, bounded to 4,096 pixels per dimension and 8.3 million total pixels. Scene and bloom use the same resolution; FXAA smooths final postprocessed edges. The previous 1,440-pixel whole-scene cap has been removed. Low disables bloom/shadows, lowers pixel ratio and reduces foliage counts. Existing mascot models and procedural scenery are reused; no new third-party art assets were downloaded.

Model fetches have cancellation and a 20-second timeout. Scene replacement releases models, textures, geometries, render targets and listeners. The UI offers retry/back-to-hub on WebGL failure. Reduced-motion settings suppress decorative animation.

## Checks and remaining acceptance tests

Automated coverage includes interpreter validation/deadlines, API identity and reward-input rejection, retry identity, navigation boundaries, settings, sounds and character motion. Run:

```sh
npm run test:run
npm run typecheck
npx eslint components/playground lib/game-*.ts lib/island-mission*.ts app/api/play
```

Interpreter tests use a deterministic clock, with a separate advancing-clock timeout test, so concurrent test workers cannot make valid solutions fail spuriously.

## Acceptance run — 2026-09-06

- User authenticated a separate test account through the normal login UI. Its initial shop balance was 685; inventory had one unrelated item and no MiniScript+ background.
- Started the same corrected lantern program in two browser tabs together. One displayed `Saved! +500 points and the MiniScript+ background.`, the other `Already saved. No duplicate reward.` The shop showed exactly 1,185 points and two inventory items, with MiniScript+ marked in inventory. No account progress was reset and no direct grant call was used for this test.
- Crossed the unlocked bridge by click/tap. The URL changed to `?zone=grove` and the second scene loaded.
- At 390 × 844, exercised the journal, expanded a clue, used the robot dialogue and ran the gate starter. It printed WAIT, showed the hint and left the gate closed. The corrected condition printed OPEN, awarded 500 points and opened the gate.
- Reached the beacon and ran the even-station program. The carriage moved, the beacon lit, and another 500 points were saved. The resulting balance was exactly 2,185 (+1,500 total), inventory still two items. Replaying the beacon returned no duplicate reward. The final story transmission and journal were inspected.
- During a replay, captured the highlighted PRINT line together with output `2` and the carriage at the corresponding station; the final output was `2, 4, 6`.
- Progress survived a development reload. Browser console error capture was empty. Mobile DOM width equalled viewport width (390); no horizontal page overflow. Settings and scrollable editor controls were usable.
- Full automated suite: 372 passing tests across 75 files. TypeScript, scoped ESLint and whitespace checks passed.

### Performance observations and limits

Settings now expose live FPS, render dimensions, draw calls and triangle counts. The render counter includes postprocessing and shadow passes. The mobile-size browser viewport ran around 60 FPS; this is **not** a real-phone benchmark. The 2560 × 1440 High viewport initially reached roughly 34 FPS; separate bloom-resolution capping and 24 Hz shadow-map refresh produced later samples around 39–45 FPS. Main scene resolution remained 2560 × 1440. High is not guaranteed to maintain 60 FPS on large displays; Low remains available.

Only bloom's blur buffers are capped at 1,280 pixels; scene geometry and final antialiasing retain display-aware resolution. Existing GLBs total about 2 MB and 39,876 mesh triangles. The test viewport override was restored and graphics quality returned to High.

Still requires device-lab acceptance: real iOS/Android keyboard/GPU behaviour, sustained thermal performance and context-loss recovery on physical hardware. No production-build or real-device certification is claimed.

For isolated world/navigation QA without account or reward writes:

```sh
npx vite --config artifacts/playground/vite.config.ts
```

Open `http://127.0.0.1:3012/artifacts/playground/scene-test.html`. Its fixture buttons only change temporary scene state; they do not call the progress or reward API. Stop this preview server after testing.
