# Asset sheet normalization pipeline change note

This note records the manual ChatGPT GitHub connector change that added the generated-art asset pipeline.

- Branch: `manual/asset-sheet-normalizer`
- Summary: Added dependency-free Node scripts for normalizing generated source art into exact packed PNG sheets.
- Implementation notes:
  - Added asset-sheet validation for dimensions, alpha output, source-grid extraction, color-key cleanup, and expected transparent empty cells.
  - Added a synthetic asset-pipeline self-test covering alpha sources, magenta color-key sources, and larger non-32 asset cells.
  - Documented the generated-art workflow and Practice Slime example manifest.
  - Added the real draft Practice Slime v001 manifest at `assets/manifests/mob_slime_practice_v001.manifest.json` so the approved source sheet can be dropped in later.
- Reason: Make ChatGPT-generated source art usable as deterministic repo-ready runtime PNGs without spending Codex usage.

This standalone note is temporary. It can be folded into `docs/CHATGPT_CHANGELOG.md` in a later cleanup if desired.
