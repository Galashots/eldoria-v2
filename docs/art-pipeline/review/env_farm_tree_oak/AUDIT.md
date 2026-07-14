# `env_farm_tree / oak` runtime-master audit

## Verdict

**APPROVED RUNTIME MASTER**

The original high-resolution AI-generated oak is not canonical source art. The approved source of truth is the exact corrected `32×48` RGBA runtime cell committed here.

## Identity and geometry

- Target: `env_farm_tree`
- Variant: `oak`
- Runtime canvas: `32×48`
- Gameplay footprint: lower-centre `16×16`
- Declared pivot: `[16,47]`
- Render layer: `actors_body`
- Approved-master SHA-256: `5d8212aafff7f5b2ee84b7dbc9c42ba087981a4de4115483e09f95571f06e030`
- Canonical `1024×1536` source SHA-256: `6d5007977575faf506fae72875e53aaccd91a794d7816042259fe418ed9158ad`

## Deterministic source creation

The canonical source at `assets/source/generated/env_farm_tree/oak.png` was created by exact `32×` nearest-neighbour block replication:

- every runtime pixel becomes one solid `32×32` block;
- no interpolation, smoothing, sharpening, recolouring, alpha modification, cropping, or repositioning;
- block-exactness mismatches: **0**;
- canonical dimensions: `1024×1536` RGBA.

## Zero-drift round trip

Normalizing the canonical source back to `32×48` with `background.mode: "alpha"`, `trim: "none"`, `fit: "fill"`, and `anchor: "top_left"` reproduces the approved master exactly:

- RGBA mismatches: **0 / 1,536 pixels**;
- normalized SHA-256: `5d8212aafff7f5b2ee84b7dbc9c42ba087981a4de4115483e09f95571f06e030`.

## Independently derived runtime metrics

- Visible bounding box: `30×45`
- Visible x range: `1–30`
- Visible y range: `3–47`
- Opaque pixels: `763`
- Locked palette tolerance: `763/763` opaque pixels within 40 RGB units
- Median palette distance: `15.94`
- Maximum palette distance: `39.23`
- Top/left/right edge contacts: none
- Bottom edge contact: only `[15,47]`
- Magenta fringe: none

## Visual review

At exact `1×` scale the prop reads as a broad, sturdy, welcoming oak. The asymmetric canopy, trunk, and major branch divisions remain legible. The base is compact, with no baked ground shadow or ground patch. Upper-left lighting and the locked `forest` plus `wood_leather` palette families are preserved.

## Scope

This approval is individual and review-only:

- no production packed tree sheet;
- no Phaser loading path;
- no farm-map placement;
- no collision or Y-sort integration;
- no other tree variant;
- no next Batch A asset started in this PR.

The broader `env_farm_tree` family and Phase 2 environment kit remain incomplete.

## Evidence retention

The durable repository evidence is intentionally minimal: the approved master, exact normalized round trip, this audit, and manifest. Larger inspection panels and unsuccessful/superseded generations belong in the PR or CI artifacts and should not remain in the repository after approval.
