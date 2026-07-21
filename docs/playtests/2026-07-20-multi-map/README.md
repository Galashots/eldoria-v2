# 2026-07-20 multi-map world foundation — browser evidence

Captured from a fresh headless Playwright run of `tests/multi-map.spec.ts` (full local suite 65/65 green on the same run). Browser evidence only — not physical-iPad or child validation.

| File | Shows |
| --- | --- |
| `multimap-woods-arrival.png` | Arrival in Wildbloom Woods through the farm's east gate: "Wildbloom Woods" entry banner, collidable tree border, gate path, walk-behind signpost, and both quest-free interactables (Whispering Flower, Mossy Stone) |
| `multimap-farm-return.png` | The return trip: "The Farm" entry banner, arrival at the east-gate `from-woods` spawn on the road (clear of the exit zone, no bounce), and the Prompt-01 objective edge arrow correctly pointing back west toward Mira |
| `multimap-mossy-stone-prompt.png` | The Mossy Stone's opt-in practice prompt, opened by a second ACTION press — flavor first, questions only by choice |

## Known gap (by design, deferred to M3)

While standing in the woods the objective banner still reads with the farm quest's text ("find her by the path"), because quest state is intentionally farm-only in this milestone. The objective **marker** correctly hides on the woods (no target on this map). A cross-map objective compass is explicitly M3's scope per the approved Mossheart Ruins design spec; it is not built here.
