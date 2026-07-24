# 2026-07-23 — Mage 3D camera/capture proof

- Author/branch: ChatGPT, `chatgpt/mage-3d-capture-proof`.
- Scope: adds an isolated browser experiment under `public/tools/mage-3d-proof/`. A procedural low-poly Mage proxy can be inspected under the binding fixed elevated orthographic camera or through free orbit; the actor rotates through strict South/West/North/East headings. The page also provides pitch/framing controls, wireframe and silhouette diagnostics, a direct 32×48 preview, PNG capture, and GLB export.
- Authority: identity inventory from the approved Mage source art; camera and headings from `CHARACTER_PERSPECTIVE_LOCK_V1.md`; target geometry from `hero_actor_targets.json`. The neutral base remains empty-handed with no staff, cape, or hat.
- Verification: matching offline GLB generation and reload passed; 32 geometries, 1,908 triangles, and watertight generated meshes were recorded; JavaScript syntax and HTML parsing passed; static cardinal and pitch-comparison evidence was visually inspected. Live browser execution is not claimed because local navigation was blocked by administrator policy in the execution environment.
- Compatibility: additive proof tooling only; no Phaser runtime, map, save, curriculum, profile ID, sprite, dependency, lockfile, workflow, or deployment change.
- Remaining risk: the proxy is only an approximate identity model, CDN/WebGL and physical-iPad operation remain unverified, and raw 32×48 downsampling is diagnostic rather than production-quality pixel art.
- Roll-up note: this standalone entry should be folded into `docs/CHATGPT_CHANGELOG.md` before merge if the branch receives approval; the connected contents writer cannot safely prepend to that existing long-line file without replacing its full body.
