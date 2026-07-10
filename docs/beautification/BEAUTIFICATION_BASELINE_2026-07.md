# Beautification Baseline — 2026-07-10

Phase 0 of `docs/beautification/ELDORIA_BEAUTIFICATION_EXECUTION_PLAN.md` (the ChatGPT-authored beautification execution brief). This is a baseline-only record: no runtime changes are included in this PR. Its only purpose is to lock in evidence of the pre-migration state before Phase 1 (the 960×640 canvas migration) begins.

## Commit and branch

- Baseline commit: `f9d844c` ("Ground interactive farm objects with soft shadows (#64)") on `main`.
- This audit is recorded on branch `claude/beautification-phase0-baseline`.
- Most recently merged work (chronological, newest first): #64 ground shadows, Stardew-caliber visual research docs (`docs/research/visual-design/STARDEW_CALIBER_VISUAL_RESEARCH_2026-07.md`), #63 art-pipeline prompting guidance, #57 Attention-First Opening Pass, #56 planning, #55 design critique fixes, #54 audio pipeline, and further back the Practice Slime combat loop, Wildbloom discovery loop, and the Waking Gate opening scene.

## Test suite status (unmodified `main`, before any change)

All four required gates were run before any modification:

| Command | Result |
| --- | --- |
| `npm ci` | clean, 0 vulnerabilities |
| `npm run check` (validate-visual-targets + typecheck + build) | ✅ pass |
| `npm run test:asset-pipeline` | ✅ pass |
| `npm run test:unit` | ✅ 48/48 passed |
| `npm run smoke` (Playwright, run against the sandbox's installed Chromium — see note below) | ✅ 43/43 passed |

**Sandbox browser note:** this environment's Playwright package (`1.61.x`) expects a Chromium revision (`1228`) that isn't pre-installed; only revision `1194` is available locally. All smoke runs in this sandbox use a throwaway local Playwright config pointing `launchOptions.executablePath` at the installed `chromium-1194` binary — this is a sandbox-only workaround, not a repo config change, and CI installs the matching browser revision itself so this does not affect CI. One test (`Grade 5 prompts keep reader profile without the Grade 2 read-aloud control`) failed once on the first full run with a 30s scene-activation timeout; retried 3x in isolation and passed every time, and passed again in the very next full-suite run — treated as an environment flake, not a baseline regression.

## Baseline screenshots

Captured via the existing Playwright specs (`opening-scene.spec.ts`, `practice-slime-encounter.spec.ts`, `ranger-identity.spec.ts`, `wildbloom-discovery.spec.ts`) plus a new small evidence-only spec, `tests/baseline-capture.spec.ts`, added to close the gap for screens no existing spec captured (title screen, farm arrival without the opening cutscene, Mira interaction, the crop-bonus optional-learning prompt, and the Stats & Mastery panel). All screenshots below are full-page captures from a 1280×720 Playwright viewport.

| Required baseline | File | Source |
| --- | --- | --- |
| Title screen | `baseline-title.png` | `tests/baseline-capture.spec.ts` (new) |
| Mage Waking Gate start | `opening-mage-start.png` | `tests/opening-scene.spec.ts` |
| Mage Waking Gate first hit | `opening-mage-first-hit.png` | `tests/opening-scene.spec.ts` |
| Ranger Waking Gate start | `opening-ranger-start.png` | `tests/opening-scene.spec.ts` |
| Ranger Waking Gate first hit | `opening-ranger-first-hit.png` | `tests/opening-scene.spec.ts` |
| Mage farm arrival (post-gate) | `opening-mage-world-entry.png` | `tests/opening-scene.spec.ts` |
| Mage farm arrival (direct) | `baseline-mage-farm-arrival.png` | `tests/baseline-capture.spec.ts` (new) |
| Ranger farm arrival (direct) | `baseline-ranger-farm-arrival.png` | `tests/baseline-capture.spec.ts` (new) |
| Mira interaction area | `baseline-mira-interaction.png` | `tests/baseline-capture.spec.ts` (new) |
| Practice Slime encounter (before/first-hit/complete/prompt, both profiles) | `slime-mage-*.png`, `slime-ranger-*.png` (8 files) | `tests/practice-slime-encounter.spec.ts` |
| Wildbloom sensing/ability/reveal/complete (both profiles) | `discovery-mage-*.png`, `discovery-ranger-*.png` (7 files) | `tests/wildbloom-discovery.spec.ts` |
| Optional-learning prompt (curriculum, non-combat) | `baseline-crop-bonus-prompt.png` | `tests/baseline-capture.spec.ts` (new) |
| Stats & Mastery panel | `baseline-stats-panel.png` | `tests/baseline-capture.spec.ts` (new) |
| Ranger front/side/ACTION presentation | `ranger-identity-front.png`, `ranger-identity-right.png`, `ranger-identity-action.png` | `tests/ranger-identity.spec.ts` |

Visual read on the three spot-checked screenshots (title, Mage farm arrival, Stats panel): the title screen has a warm gradient and ambient sparkles from the Attention-First Opening pass; the farm itself still reads exactly as the project's own `docs/CURRENT_STATE.md` "Next Checkpoint" describes it — a flat placeholder tile grid (solid-color grass/dirt/water blocks, circle "trees"), with the only real character art being the Mage sprite and Mira's hand-drawn presentation-layer marker; the Stats & Mastery panel is a clean but flat gold-bordered rounded-rectangle UI with no ornamental/textured skin. This matches the beautification plan's stated starting point precisely.

CI's existing `visual-playtest-pr-*` artifact glob (`.github/workflows/ci.yml`) only picks up `opening-*`, `slime-*`, `ranger-*`, and `discovery-*` — the new `baseline-*.png` files are not currently included in that upload pattern. This is left as-is for this baseline-only PR (no CI workflow changes) and is worth revisiting if these new baseline shots should also be archived as CI artifacts going forward.

## Canvas, renderer, and performance snapshot

Captured via a throwaway Playwright script against the dev server (title scene, idle) in the sandbox's headless Chromium — not a real iPad, so treat FPS as directional only; Phase 7 of the execution plan requires real-device certification separately.

| Metric | Value |
| --- | --- |
| Renderer type | WebGL |
| Logical game config size | `480 × 320` (`GAME_WIDTH`/`GAME_HEIGHT`, `src/gameConfig.ts`) |
| Canvas backing-buffer size (`canvas.width/height`) | `480 × 320` |
| CSS display size (1280×720 viewport, `Scale.FIT` + `CENTER_BOTH`) | `1080 × 720` (letterboxed left/right to preserve 3:2) |
| Device pixel ratio | 1 (sandbox headless default) |
| Scale mode | `Phaser.Scale.FIT` (mode value `3`) |
| Camera/scale zoom | 1 |
| Idle FPS (title scene, 5 samples over ~2s) | 57.5, 57.5, 58.375, 58.375, 58.375 |

## World-map resolution finding (important for Phase 1 planning)

`public/maps/farm.json` is a Tiled map with `tilewidth: 32`, `tileheight: 32`, `width: 30` tiles, `height: 20` tiles — i.e. the world itself is **already exactly 960×640 pixels**. At the current 480×320 canvas, the camera (`cameras.main.startFollow`, bounded to `map.widthInPixels`/`heightInPixels`) already shows roughly a quarter of the map's area at once and scrolls as the player moves.

This means a literal "make the canvas 960×640" change, if done by touching only `GAME_WIDTH`/`GAME_HEIGHT`, would make the *entire* existing map visible at once with no scrolling — a real gameplay/composition change, not a pure resolution bump. Phase 1 needs to scale the world presentation (tile visual size, physics bounds, object coordinates, interaction radii, VFX offsets) by the same `GAME_SCALE` factor as the canvas so that the camera continues to show the same proportion of the world as it does today, just at twice the pixel density — matching the execution plan's own stated core requirement ("same visible world coverage... at twice the coordinate and visual resolution") and its documented "preferred approach" (scale map/world presentation by 2, via a centralized loader seam, rather than editing `farm.json` by hand).

## Files added in this PR

- `docs/beautification/BEAUTIFICATION_BASELINE_2026-07.md` (this file)
- `tests/baseline-capture.spec.ts` (new evidence-only Playwright spec; not a regression gate, purely captures the screens not covered by existing specs)

No `src/`, `public/`, map, save-schema, curriculum, or CI changes are included.
