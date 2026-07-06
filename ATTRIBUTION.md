# Attribution

This starter package includes original placeholder pixel assets generated for the Eldoria v2 scaffold.

Replace placeholders before release with either:
- original commissioned/generated assets you are allowed to use,
- public-domain assets,
- properly licensed open assets with attribution,
- or paid asset packs used under their license terms.

No Stardew Valley assets are included.

## Audio (placeholder, not final)

`public/assets/audio/music/farm-theme-loop.wav` and the five files under
`public/assets/audio/sfx/` are **synthesized locally with a small Node
script** (simple sine/triangle tones and filtered noise, no samples or
external audio) — not licensed third-party assets, and not attributed to
anyone because there is no source to attribute. They exist only so the
audio plumbing (preload, looping BGM, mute toggle, SFX triggers, read-aloud
ducking) is real and testable; they are not meant to ship as the final
sound of the game.

Before shipping to the boys, swap these for real licensed audio. Concrete
options (checked directly on their license pages, not just "royalty-free"
marketing copy):

- **Background music** — Tallbeard Studios' *Music Loop Bundle* or
  HydroGene's *16-bit RPG Music* pack, both CC0 on itch.io (zero cost, zero
  attribution). ChillMindscapes' *Free Chiptune Music Pack 4* is a fallback
  but double-check its exact license text before use.
- **SFX** (footstep, interact, reward, quest-complete, UI tap) — Freesound,
  filtered explicitly to **CC0** (Freesound's search does not exclude
  CC-BY-NC or the legacy "Sampling+" license by default, and both mean no
  commercial use — filter deliberately, don't just search).
- Kevin MacLeod / incompetech.com is the fallback for a signature theme
  track: CC BY 4.0 (attribution satisfied by an in-game credits screen), or
  a one-time $16-50 buyout license to drop attribution entirely.

This environment's network policy blocks itch.io, freesound.org,
opengameart.org, incompetech.com, and kenney.nl outright, so the actual
files need to be downloaded from a normal network and dropped into
`public/assets/audio/` in place of the placeholders (same filenames, or
update the `this.load.audio(...)` calls in `src/scenes/PreloadScene.ts`).
Once real assets are in, replace this section with their actual credits.
