# 2026-07-21 Living World (M3) — browser evidence

Captured by the named Playwright cases in `tests/village.spec.ts` and `tests/multi-map.spec.ts`; the final local suite passed 73/73 in 5.0 minutes. These are browser-rendered 1280×720 screenshots from Chromium, not physical-iPad or child validation.

| File | Evidence |
| --- | --- |
| `village-dialogue-ranger.png` | Ranger Explorer dialogue panel, Baker Pell speaker/body hierarchy, and manual read-aloud control |
| `village-dialogue-mage.png` | Grade 2 Mage path using the same large dialogue presentation with automatic read-aloud covered by the speech stub assertion |
| `village-sunberry-2-of-3.png` | Berry Order gathering at the farm crop patch with persistent `2/3` objective progress and no learning prompt |
| `village-berry-order-complete.png` | Exact one-time completion presentation: 20 gold and one Berry Pie |
| `village-berry-order-exit-guidance.png` | Active gathering objective in Eldoria Village with the edge arrow pointing east to the real GateToFarm rectangle |
| `multimap-mira-return-guidance.png` | Active Mira objective in Wildbloom Woods with corrected `Head back to The Farm —` wording and the edge arrow pointing west to GateToFarm |

The corresponding tests poll durable scene/save state with explicit 15–20 second timeouts; they do not use fixed-duration waits.
