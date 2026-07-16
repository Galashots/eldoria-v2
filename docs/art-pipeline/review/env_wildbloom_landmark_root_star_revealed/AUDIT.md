# env_wildbloom_landmark / root_star_revealed — Approved Runtime Master Audit

## Verdict

**APPROVED RUNTIME MASTER**

The second high-resolution generation produced the correct simple composition: one cohesive mossy standing stone with one dominant five-point Root-Star rune. Exact runtime normalization preserved that composition but exposed generated colour drift. The retained deterministic recipe changes colours only: 42 existing gold-rune pixels to exact `#FFD666`, 38 existing green-rune pixels to exact `#8FD14F`, six isolated base-family pixels to their nearest locked swatch, and two key-colour fringe pixels to adjacent material colours. Silhouette, alpha, geometry, occupancy, planes, lighting, star shape, and grounding are unchanged.

## Authoritative target

- Runtime canvas: `32×32`
- Footprint: centred lower `16×16`, `[8,16,16,16]`
- Pivot: `[16,31]`
- Render layer: `actors_body`
- Base palette: farm `forest` + `metal_stone`
- Exact accents: Root-Star `#FFD666` + `#8FD14F`
- Light: upper-left
- Collision/runtime integration: unchanged and absent

## Reproducible correction and round trip

- Pre-correction runtime SHA-256: `1fc7b99fdbe9aef891bf1deb1e3d70da17c27c99138065f9c1137cf347758b7c`
- Correction recipe SHA-256: `c9b7d0e0647faafb874548e7cd6d7ea157926dc7cbae8bd6e4bfb548fbd5179e`
- Approved master SHA-256: `b7722b807396ca6164c7281008b2e87006ecfcc6d8e150817be53ea05a7a7041`
- Canonical `1024×1024` RGBA source SHA-256: `9bff2b627cb09631314934a4bdb004baa0e0e6e7b421e54e973e588a764bb429`
- Review-normalized SHA-256: `b7722b807396ca6164c7281008b2e87006ecfcc6d8e150817be53ea05a7a7041`
- Correction reproduction: exactly `88` changed pixels and `0` decoded-channel mismatches against the retained approved master
- Canonical source: exact `32×` alpha-preserving nearest-neighbour replication with `0 / 1,048,576` block mismatches
- Runtime round trip: byte-identical PNG and `0 / 1,024` decoded-RGBA pixel mismatches

Run the retained correction recipe from the repository root:

```bash
node docs/art-pipeline/review/env_wildbloom_landmark_root_star_revealed/root_star_revealed.quantize.mjs
```

## Runtime audit

- Alpha: `504` transparent, `0` partial, `520` opaque; one connected silhouette
- Visible bounds: x `4–28`, y `2–31`
- Canvas contact: bottom only at x `20–21`; no top, left, or right contact
- Base palette tolerance: `440 / 440` non-accent pixels within `40` RGB units of `forest` or `metal_stone`
- Base distance: min `0`, median `18.788`, max `36.770`
- Exact Root-Star gold: `42` fully opaque pixels
- Exact Root-Star green: `38` fully opaque pixels
- Coverage: `520 / 520` opaque pixels covered; `0` uncovered
- Lighting: broad upper-left stone highlight with down-right dark plane
- Silhouette: one compact asymmetric mossy standing stone; star remains unmistakable at exact runtime size
- No baked shadow, ground patch, text, secondary rune, loose prop, particle field, or unrelated scenery

`root_star_revealed.footprint-pivot-20x.png` overlays the exact runtime pixels on a checkerboard, the declared lower footprint in cyan, and the pivot in magenta. The lower mass spans the footprint and reaches the baseline without visible floating.

## Retained evidence

- `root_star_revealed.pre-correction-32x32.png` — exact normalized input to the correction recipe
- `root_star_revealed.quantize.mjs` — complete deterministic correction recipe and machine-readable per-pixel log
- `root_star_revealed.approved-master-32x32.png` — authoritative corrected runtime source of truth
- `root_star_revealed.review-normalized.png` — exact real-pipeline round trip
- `root_star_revealed.preview-20x.png` — nearest-neighbour silhouette/palette inspection
- `root_star_revealed.footprint-pivot-20x.png` — declared footprint and pivot overlay
- `root_star_revealed.review.manifest.json` — deterministic review-only recipe

## Scope

This accepts one individual source asset only. It does not create the six-variant Wildbloom packed sheet, invent indicator/Moonwell/Foxfire variants, load the asset in Phaser, replace the procedural landmark, or modify the farm map, collision, saves, gameplay, quests, curriculum, mastery, profiles, economy, or interactions.
