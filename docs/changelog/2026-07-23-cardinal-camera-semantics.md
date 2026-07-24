# 2026-07-23 — Cardinal actor-heading clarification

- **Author/branch:** ChatGPT, `chatgpt/fix-cardinal-camera-semantics`.
- **Scope:** Corrects the character-camera doctrine that previously conflated the fixed elevated vertical camera pitch with a 45-degree horizontal actor turn. The four-direction family now uses strict South, West, North, and East actor headings beneath one stationary elevated orthographic camera. West/East are exact 90-degree rotations and may read as horizontal profiles while retaining visible top surfaces from the elevated camera. Diagonal headings are reserved for an explicitly authorized eight-direction family. The Mage neutral base is also recorded as empty-handed, with no permanent staff or cape pixels; staff-on-back remains a later equipment layer.
- **Principal files:** `docs/visual-targets/CHARACTER_PERSPECTIVE_LOCK_V1.md`, `docs/VISUAL_ASSET_CONTRACT.md`, `docs/art-pipeline/IMAGE_PROMPTING_GUIDE.md`, `docs/visual-targets/hero_actor_targets.json`, `docs/README.md`.
- **Verification:** documentation and target-JSON validation to be confirmed by exact-head CI and independent review.
- **Compatibility:** documentation/target guidance only; no runtime, map, save, curriculum, dependency, workflow, or asset-pixel change.
- **Remaining risk:** the owner-approved Mage/mannequin visual exemplars are not added by this PR; source-art ingestion and runtime approval remain separate work.
