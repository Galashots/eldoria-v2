# Visual Evidence and Retention Policy

This policy applies to beautification, asset generation, map composition, UI, camera, lighting, animation, and VFX pull requests.

## Required review evidence

Use the smallest evidence set that proves the visual change:

- isolated assets: exact `1×` runtime output and an enlarged nearest-neighbour preview;
- terrain: one-cell output plus `3×3` and large-field repetition views;
- modular fences/walls: one-tile output plus a repeated strip and connection-edge view;
- runtime-integrated changes: before/after in-game screenshots;
- profile-sensitive changes: Mage and Ranger screenshots;
- gameplay, map, UI, camera, or composition changes: at least one iPad-like landscape viewport;
- batch completion: one family contact sheet before the next batch or map integration.

Source-only assets that are not loaded by the game do not require full-game screenshots. Exact runtime previews and type-specific evidence are the correct gate.

## Evidence lifecycle

1. Keep failed candidates, broad screenshot sets, videos, and diagnostic previews in temporary local storage, PR attachments, or CI artifacts during iteration.
2. Before merge, remove superseded candidates and redundant screenshots from the branch.
3. Commit only durable evidence needed to reproduce or understand the final approval:
   - canonical approved source or runtime master;
   - exact normalized output where it proves the pipeline result;
   - one concise comparison or contact panel when materially useful;
   - manifest and `AUDIT.md` with hashes, measurements, verdict, and reviewed paths.
4. Never delete canonical approved sources, required manifests, or evidence needed to prove a zero-drift round trip.
5. PR/CI artifacts may expire. The committed audit must therefore preserve the final measurements and decision even when larger temporary galleries are not retained.

## Game-level audit cadence

- Run the browser screenshot matrix after every runtime-integrated visual change.
- At the end of each production asset batch, review a family contact sheet.
- Before Phase 3 map integration, review the complete environment-kit contact sheet.
- After farm recomposition, run a full visual audit covering title, both farm arrivals, Mira, crop area, Practice Slime, all Wildbloom states, prompts, Stats, portrait guidance, and an iPad-like landscape viewport.
- Browser viewport evidence does not constitute physical-iPad certification.

This keeps visual review mandatory while preventing rejected generations and temporary screenshot galleries from accumulating indefinitely in Git history.
