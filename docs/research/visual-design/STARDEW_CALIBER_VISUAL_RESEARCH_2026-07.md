# Research: Reaching Stardew-Caliber (Or Better) Visuals

Date: 2026-07-10
Requested by: Leo, following the ChatGPT/Codex Eldoria-V2 audit trail (PRs #57-#63)

## Why this doc exists

The existing [`VISUAL_ASSET_CONTRACT.md`](../../VISUAL_ASSET_CONTRACT.md) already encodes a strong technical baseline (16x16 grid, limited palette, upper-left light, naming/metadata contract). What it does not yet encode is *why specific games like Stardew Valley read as cohesive and premium* while Eldoria-V2's farm currently "reads as a development grid" (the ChatGPT audit's own words, 2026-07-10). This doc distills concrete, sourced findings into decisions the contract and pipeline can act on.

This is research and guidance. It changes no runtime code or art by itself; see the contract/target-doc updates that accompany this research pass for the resulting rule changes.

## Finding 1: The single highest-leverage fix is terrain blending, not more detail

Stardew (and every well-regarded top-down pixel RPG) never places a flat, single-tile grass texture next to a flat, single-tile path texture. Every terrain boundary is drawn by an **autotile / "blob" tileset**: a small set of edge and corner tile variants that are automatically selected based on which neighboring tiles share the same terrain type, so grass melts into dirt instead of butting against it in a hard grid line.

- The classic solution is the **47-tile blob tileset**: 47 variants cover every combination of "same terrain" vs. "different terrain" among the 8 neighboring cells (4 edges + 4 corners), and give artists full inner/outer corner coverage. ([Red Blob Games: Autotiling](https://www.redblobgames.com/articles/autotile/index-claude-me.html), [Boris the Brave: Classification of Tilesets](https://www.boristhebrave.com/2021/11/14/classification-of-tilesets/))
- A lighter alternative used by many small teams is a **reduced ~13-tile subset** (center, 4 edges, 4 outer corners, 4 inner corners) that skips rarely-needed combinations — this is closer to what Eldoria-V2 already partially built for `tile_farm_path_dirt` (it already declares `center`, 4 `edge_*`, and 4 `corner_*` variants — 9 of the ~13 needed). That existing target should be finished, not redesigned.
- **Tiled** (already Eldoria-V2's map editor) has this built in natively via **Terrains/Wangsets**: paint with the "Terrain Brush" and Tiled auto-selects the correct blended tile from an author-tagged tileset. No plugin or runtime code is required for *static* map painting. ([Tiled docs: Using Terrains](https://doc.mapeditor.org/en/stable/manual/terrain/))
- Runtime-changing tiles (Eldoria-V2's planned `tile_farm_tilled_soil` dry/wet/seeded states) are a different problem — that's a same-cell state swap, not a neighbor-blend, so it does **not** need autotiling at all. Keep it a simple sprite swap.
- A Phaser-specific plugin, `phaser3-autotile`, exists for *procedural, runtime* neighbor-based tile selection (reading Tiled's Wangset data at runtime) if Eldoria-V2 ever needs tiles that blend based on gameplay state changes (e.g., magic corrupting/healing terrain). It generates the 47-tile set from 5 source tiles via a CLI tool. It targets the Phaser 3 API — compatibility with this project's Phaser `^4.2.0` is **unverified and should be spiked before depending on it**; the Tiled-native Terrain Brush workflow has no such risk and should be the default. ([browndragon/phaser3-autotile](https://github.com/browndragon/phaser3-autotile))

**Action:** formalized as a new mandatory rule in the contract and an expanded checklist in the farm/village tile targets (see accompanying edits).

## Finding 2: Stardew's specific "flattened pop-up book" perspective is a named, teachable technique

Stardew's readability comes partly from a deliberate perspective rule: anything that has *height* (trees, buildings, standing characters) is drawn leaning/flattened toward the camera, almost like a pop-up book page, while the ground plane itself stays a clean top-down/3-4 projection. This is different from "isometric" or "true top-down" and is why tall objects in Stardew never look like they are floating or leaning wrongly against the grid. ([Playbite: How to Make Pixel Art Like Stardew Valley](https://www.playbite.com/q/how-to-make-pixel-art-like-stardew-valley); corroborated across multiple pixel-art tutorials on Lospec)

Eldoria-V2's contract already specifies "3/4 top-down" for actors but doesn't say anything about how *vertical* world objects (trees, buildings, fences) should be drawn relative to the ground plane. This is worth stating explicitly so future tile/building art doesn't drift between true top-down (looks flat) and full isometric (breaks the existing 16x16 actor grammar).

**Action:** added as an explicit "Perspective Discipline" rule in the contract.

## Finding 3: Limited palette + sparing dithering, already partially adopted, should be enforced with an artifact, not just a rule

Stardew uses a genuinely small, curated palette per scene and reserves **dithering** (alternating pixels to fake a gradient with few colors) almost entirely for large environmental surfaces — grass, water, cliffs — never on small character sprites or UI, where it reads as noise. ([Scribd: Stardew Valley Art Style Guide](https://www.scribd.com/document/694721155/SundropArtGuide); [Pixilart: Stardew Valley Palette](https://www.pixilart.com/palettes/stardew-valley-45323))

Eldoria-V2's contract already states this rule (Section 4) almost verbatim. The gap is that the 8 named sub-palettes (`forest`, `ruins`, `arcane`, `lava`, `ui_neutral`, `metal`, `wood_leather`, `skin_hair`) are declared **by name only** — there is no committed swatch reference, so two different art-generation sessions can silently drift on what "forest" actually means in hex values. This is exactly the kind of drift the earlier audit flagged ("the opening hero is vector-like geometry... together they do not look like one game").

**Action:** recommend (not yet implemented — needs an actual color pass) a committed palette swatch file per sub-palette once real production art begins, so "forest" is a literal locked set of hex values, not a floating name. Documented as a near-term follow-up rather than done today, since inventing hex values without real art in hand would just be guessing.

## Finding 4: Every grounded thing needs a shadow — this is the cheapest "juice" available

Across pixel-art top-down RPGs, the single cheapest technique for making flat sprites feel like they occupy a 3D space is a **soft, dark, squashed ellipse shadow anchored to each actor/prop's feet**, with light coming from a consistent direction (upper-left, matching Eldoria-V2's existing lighting rule) so shadows fall down-right. ([GameDev.net: Lighting a 2D RPG](https://gamedev.net/forums/topic/673331-lighting-a-2d-rpg-tile-based-top-down-game-so-confused/5262797/))

The earlier ChatGPT visual review called this out directly without naming the technique: *"Mira represented by a blue orb... Character and object shadows would add substantial depth."* This is a two-line fix per actor (draw a semi-transparent ellipse at the pivot) with an outsized visual return, and it costs nothing in gameplay logic.

**Action:** added as a mandatory rule — every dynamic actor, NPC, and interactive world object must render a ground shadow — to the contract's rendering rules, plus a checklist line.

## Finding 5: Lighting can stay cheap and still read as atmospheric

The existing `CURRENT_STATE.md` lighting note already correctly identified that Phaser `^4.2.0` ships a native `PointLight` game object (`this.add.pointlight(x, y, color, radius, intensity, attenuation)`), avoiding the normal-map/`Light2D` setup an older Phaser 3 tutorial would suggest. That's confirmed as the right direction. ([GameDev.net thread on 2D RPG lighting](https://gamedev.net/forums/topic/673331-lighting-a-2d-rpg-tile-based-top-down-game-so-confused/5263753/) corroborates ambient + simple point lights as the standard cheap approach, versus full normal-mapping.)

What's missing is the **cheapest atmosphere layer of all**: a single semi-transparent color-tint rectangle over the whole scene (a soft warm gold in daytime, cooler blue-violet for any future evening/interior scene) blended with `MULTIPLY` or `SCREEN`. This is what makes disconnected sprites feel like they're lit by the same sun, and it's a few lines of Phaser code, not an art asset.

**Action:** added as a specific, low-cost recommendation in the contract's lighting section, separate from the (bigger, later) `PointLight` torch/spell-glow work.

## Finding 6: "Juice" is real, cheap, and already partially present — name it so it isn't lost

The industry term for the small reactive effects that make flat sprites feel alive is **"juice"**: squash-and-stretch on impact/landing, screen shake on impact, and particles that leave a lasting trace rather than just flying and vanishing. ([itch.io: Making a Game Feel "Juicy" with Simple Effects](https://itch.io/blog/1059831/making-a-game-feel-juicy-with-simple-effects); [gamedeveloper.com: Squeezing more juice out of your game design](https://www.gamedeveloper.com/design/squeezing-more-juice-out-of-your-game-design-))

Eldoria-V2 already independently reinvented two of these — the Waking Gate's camera shake and the Practice Slime's "squash and hop" reaction — without naming the pattern. The important guardrail from the research: **juice must echo gameplay that already works; it is never allowed to replace or gate it.** That is fully consistent with this project's existing "learning never gates adventure" rule and should be stated alongside it so future PRs don't treat juice as a substitute for an actual improvement.

**Action:** added as a short "Feedback & Juice" section in the contract, codifying squash/stretch, screen shake, and lingering particles/decals as expected, with the explicit non-negotiable that juice never gates or replaces gameplay.

## Finding 7: UI material matters as much as icon polish

Stardew's UI reads as "part of the world" because its panels use a warm wood/parchment material with a visible border, not a flat modern rounded rectangle. Eldoria-V2's own changelog already notes a prior polish pass replaced "ad hoc flat rectangles" with "shared rounded-rect helpers" — a real improvement, but still a flat, materialless shape rather than a textured one.

**Action:** flagged as a near-term follow-up (needs an actual UI art pass, not just a contract rule) rather than solved today: give the `ui_neutral` sub-palette a physical material (wood/parchment/carved-stone, pick one) once UI art work is scheped, replacing the current flat-color panels.

## Non-goals / what this research explicitly does not recommend

- **Full day/night cycle or weather system** — expensive, and the project's own "one excellent vertical slice before expanding scope" pillar argues against it until the core loop is more finished. The single tint-overlay recommendation above gets most of the atmospheric benefit for a fraction of the cost.
- **Real-time normal-mapped lighting** — unnecessary complexity; Phaser 4's `PointLight` plus flat-color ambient tinting is the right-sized solution for this project's scope.
- **A full 47-tile blob set everywhere immediately** — start with the farm's grass/dirt boundary (already 90% specified) and expand the pattern to village tiles only once it's proven in the farm.

## Sources

- [Red Blob Games — Autotiling: An Interactive Guide to Procedural Tile Selection](https://www.redblobgames.com/articles/autotile/index-claude-me.html)
- [Boris the Brave — Classification of Tilesets](https://www.boristhebrave.com/2021/11/14/classification-of-tilesets/)
- [Tiled documentation — Using Terrains](https://doc.mapeditor.org/en/stable/manual/terrain/)
- [browndragon/phaser3-autotile (GitHub)](https://github.com/browndragon/phaser3-autotile)
- [Playbite — How to Make Pixel Art Like Stardew Valley](https://www.playbite.com/q/how-to-make-pixel-art-like-stardew-valley)
- [mentalnerd — ConcernedApe Interview: Getting Started with Pixel Art for Games](https://mentalnerd.com/blog/getting-started-pixel-art-interview/)
- [Scribd — Stardew Valley Art Style Guide](https://www.scribd.com/document/694721155/SundropArtGuide)
- [Pixilart — Stardew Valley Palette](https://www.pixilart.com/palettes/stardew-valley-45323)
- [GameDev.net — Lighting a 2D RPG, tile-based, top-down game](https://gamedev.net/forums/topic/673331-lighting-a-2d-rpg-tile-based-top-down-game-so-confused/5262797/)
- [itch.io — Making a Game Feel "Juicy" with Simple Effects](https://itch.io/blog/1059831/making-a-game-feel-juicy-with-simple-effects)
- [Game Developer — Squeezing more juice out of your game design](https://www.gamedeveloper.com/design/squeezing-more-juice-out-of-your-game-design-)
