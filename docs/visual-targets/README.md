# Visual Target Specifications

The JSON files in this directory define reviewable production targets before art or runtime integration begins. They are specifications, not runtime assets, and must follow [`docs/VISUAL_ASSET_CONTRACT.md`](../VISUAL_ASSET_CONTRACT.md).

Run the validator from the repository root:

```bash
npm run validate:visual-targets
```

The validator checks every JSON file directly in this directory for shared contract fields, unique IDs, target-only status, source-contract references, inheritance references, and spec-only/no-runtime notes. Optional target `paletteFamilies` must be a non-empty unique list of lowercase identifiers when present. A palette's `appliesToAtlasFamilies` defines its namespace: targets with no applicable palette receive syntax validation only, targets with one applicable palette resolve against only that palette's direct families, aliases, and scoped deferred names, and duplicate palette claims for one atlas family are errors. Deferred names preserve existing target metadata but do not acquire invented swatches.

Future visual target and art PRs should pass this validator before review. Passing validation does not approve art or authorize runtime, loader, atlas, map, UI, or gameplay changes.
