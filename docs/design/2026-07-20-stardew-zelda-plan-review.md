# Eldoria Plan Review — Stardew Valley & 2D Zelda Lens

- **Date:** 2026-07-20 · **Author:** Kimi · **Type:** audit report (engagement-retention framework)
- **References:** Stardew Valley (design facts + critic consensus, Wikipedia); The Legend of Zelda series structure (Wikipedia); screenshots reviewed: mines combat, Stardew Fair, museum collections (2), fall farm, Pelican Town map, Egg Festival, "combat-for-cuddles" mod.
- **Scope:** review the overall game plan (M1 ✅, M2 ✅, M3 queued, Zone #4 Mossheart specced, beautification Ph2, parking lot) against the two reference games. **No new feature is specced here** — candidates route to game-design-brainstorm.

---

## 1. What the research says

### Stardew Valley — the cozy engine

Verified mechanics that drive its "one more day" pull:

- **Day-length time segments + morning energy bar** — every session is a self-contained unit with a natural stopping point and a fresh start tomorrow.
- **28-day seasons** — crops must be planted/watered/harvested before the season turns; the same map re-reads as new four times a cycle.
- **Community Center bundles** — collect fixed sets of goods → unlock new areas/activities. The collection *is* the progression compass.
- **Skills across five axes** (farming, foraging, fishing, mining, combat) — the player always has a second thing to do when the first gets stale.
- **Relationships via repeated small gifts** — townspeople hearts grow over time; spouse later helps with chores. Social progress is accumulated kindness, not one big quest.
- **The mines** — danger is *a place you choose to enter*, deeper = better treasure, with combat woven into a non-combat game. Critics: systems integrate so "each in-game day feels distinct and cohesive"; "engaging without feeling stressful".

The museum screenshots show the collector loop perfectly: shelves of artifacts/minerals with visible filled and empty slots — completion you can *see*. The Fair/Egg Festival shots show the village-as-stage principle: NPCs gathered, the map dressed for an event.

### 2D Zelda — the adventure skeleton

Verified structural principles:

- **Three area types:** an overworld connecting everything with multidirectional freedom; interaction areas (towns, caves, hidden rooms — equipment, advice, side quests); dungeons with enemies, bosses, and items.
- **Item-gated progression:** each dungeon holds one major item essential for *its own* puzzles and often crucial for *its boss* and overworld progression — you learn the verb, the dungeon tests it, the boss twists it.
- **Dungeon map + compass + boss key:** the player always knows where the goal *is*; the lock is visible before the key.
- **Hearts:** start with 3; full containers from bosses; **Pieces of Heart** (4 = 1 container) awarded for side quests or *hidden throughout the world* — fractional, permanent, exploration-driven growth.
- **Cheap recovery** (hearts from grass/enemies, fairies) — failure is a soft reset, never a punishment.

---

## 2. Per-loop assessment of Eldoria (verified state)

| Loop | Stardew/Zelda ideal | Eldoria today | Grade |
|---|---|---|---|
| **Core (seconds)** | Every action responds; systems interlock | M1 made move/interact/reward feel good; flavor layer gives post-purpose responses; prompt opens only after presentation | **Strong** |
| **Session (minutes)** | A day = clear win + visible next thing; 3–10 min kid target | Mira errands are short wins with banners; Wildbloom secrets; M3 will add cross-map questing; Zone #4 arc planned | **Good, improving** |
| **Meta (days+)** | Bundles, collections, seasons, relationships, heart pieces | Keepsakes (3), gold (**no sink — dead currency**), mastery stats (no goal), saves | **Weakest — fix here** |

**Audit rule verdict: the meta loop is weakest.** The core is healthy (do not add meta onto a weak core — ours is fine). The plan's biggest gap is *why a kid opens the game on day 5*.

Notably, two things already in flight are exactly right by these references and need no change: the Mossgate Arch as a visible lock before the key (Zelda boss-key principle), and the mines-style "danger is a place" direction of Mossheart + the guardian (Stardew principle).

---

## 3. Recommended improvements (kid-ethics gated, with numbers)

Ranked by fun-per-effort. All fixed-placement/fixed-reward — no variable-ratio anything, no expiry, no absence punishment.

### P1 — Collections tab in the STATS panel *(Stardew museum; serves Collectors + Achievers; XS–S effort)*
A third STATS tab ("COLLECTION") showing fixed slots with icons: filled = found, empty silhouette = hint. Launch sets: **Keepsakes (3) · Wildbloom Secrets (3) · Critters spotted (5: slime, 2 beetles, 2 moths — Zone #4) · Waystones (3)** = 14 slots. Completion % per set, icons only (pre-reader proof). Pure read-model over existing flags — no new gameplay systems, no save-schema bump (derive from existing fields).

### P2 — Cosmetic gold sink in the village *(Stardew tool/upgrade treadmill; S–M effort, needs M3 village)*
Gold is currently dead currency — the plan's own parking lot already names this. Give it a kid-magnetic purpose: **Pell's Hat Cart** (or seamstress NPC) selling cosmetic hats/capes at **25 / 50 / 100 gold** anchors. Income reference: errands 4–20g, pattern solve +5g, Mossheart arc +50g → a 50g hat is ~3–5 sessions of saving for a young player: long enough to anticipate, short enough to reach. Wears via the armor contract's *cosmetic outfit switching* — zero new combat implications. This single feature makes every gold reward in the game retroactively meaningful.

### P3 — "Star Shard" collectible set *(Zelda Pieces of Heart; S effort)*
**4 fixed hidden shards** (1 per map: farm, woods, village, ruins) → completing the set lights the **Heart of Eldoria** display slot in the Collection tab. Fixed placements (no random rewards doctrine), each in a visible-but-puzzling spot (Zelda's "I can see it — how?"). Teaches map coverage to Explorers; pairs with the edge-arrow/compass for pre-readers.

### P4 — Mira's Favor Board *(Stardew bundles; M effort, post-M3)*
A request board (farm or village) with **3 standing favors**, each a fixed small set from things the kid already does: e.g. "3 sprout wakes + 2 pattern solves" → reward: cosmetic seed packet (decor for the farm) or 25g. Always available, never expires, completes at the kid's pace — the bundle loop without FOMO. Rides M3's quest registry as data.

### P5 — Guardian visible through the Mossgate *(Zelda visible-lock principle; XS, fold into Zone #4 build prompts)*
Sightline through the sealed arch: the kid can *see* Old Mossback sleeping (and poke the grate for the flavor line) before the waystones open it. Turns the lock into a promise. One camera framing + collision gap detail in map composition.

### P6 — World reactivity pass *(Zelda grass principle; XS–S)*
Extend the flavor layer so **every** decor target responds: rocks thunk, trees rustle, signposts read. ~1 line + 1 tween per target type. The Zelda overworld feels alive because nothing is inert; ours should hit the same bar now that the machinery exists.

### P7 — Quest-complete summary splash *(Stardew end-of-day; XS)*
On quest completion, a 2s splash: keepsake icon, gold total, **and the next unlocked thing** ("The village path is open!"). Sessions end on a win *plus* a visible next thing — the skill's session-shape requirement, one widget deep.

### Parked (validated, not now)
- **Seasons/festivals** — powerful but art-heavy; viable later via the deterministic pipeline as *palette-recolor* manifests (Batch-work, art-director decision). Revisit after Phase 3 recomposition.
- **Mine checkpoints for the boss** — sub-project B's spec should include Stardew's free-exit rule: leave the sanctum anytime, no penalty on loss.
- **Comeback gift** — allowed by the ethics gate but unnecessary while P1–P4 land.

---

## 4. What the plan already gets right (don't touch)

- **No energy bar / no fail states** — Stardew's stress-free praise applies; Eldoria goes further (learning never gates), correct for age 6–10.
- **Opt-in practice + flavor layer** — the world responds without quizzing (Zelda reactivity, already half-built).
- **Exit visible before it's open** (woods→ruins), arch opens by exploration — textbook Zelda lock-and-key done right.
- **Adaptive difficulty easing wrong answers toward the floor** — matches the ~70–80% success target for kids.
- **FTUE** — Waking Gate = playing within seconds, no text tutorial, first errand = guaranteed early win.

## 5. Kid-Ethics Gate confirmation

All P1–P7: no absence punishment, no expiring content, no time-pressure anxiety, no variable-ratio power/progress rewards (collections are fixed-placement; cosmetic surprise only via shop *choice*), no grind walls (P2's 50g ≈ 3–5 sessions is pacing, not a wall), and every quest completion is a natural stopping point. **Pass.**

## 6. Next step

Pick one (my call: **P1 Collections tab** — cheapest fill of the weakest loop, zero dependencies) and it goes through game-design-brainstorm → spec → build prompts. P2/P4 queue behind M3; P5 folds into the Zone #4 build prompts I write after M3 lands.
