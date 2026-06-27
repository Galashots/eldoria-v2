# Visual Target Specifications

The JSON files in this directory define reviewable production targets before art or runtime integration begins. They are specifications, not runtime assets, and must follow [`docs/VISUAL_ASSET_CONTRACT.md`](../VISUAL_ASSET_CONTRACT.md).

Run the validator from the repository root:

```bash
npm run validate:visual-targets
```

The validator checks every JSON file directly in this directory for shared contract fields, unique IDs, target-only status, source-contract references, inheritance references, and spec-only/no-runtime notes.

Future visual target and art PRs should pass this validator before review. Passing validation does not approve art or authorize runtime, loader, atlas, map, UI, or gameplay changes.
