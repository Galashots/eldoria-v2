from pathlib import Path

path = Path('docs/CHATGPT_CHANGELOG.md')
text = path.read_text(encoding='utf-8')
start = text.index('## 2026-07-18 — Adaptive difficulty + PWA home-screen + terrain-integration proof')
end = text.index('## 2026-07-17 — Deterministic terrain-blend compositor', start)
replacement = '''## 2026-07-18 — Kimi-K3 audit improvements, independently reviewed and corrected

- Author/branch: Kimi-K3 supplied the approved proposal bundle; ChatGPT independently reviewed, corrected, and staged it on `chatgpt/kimi-audit-improvements` (draft PR #101).
- Scope 1 — **adaptive difficulty**: per-skill derived difficulty remains `1 + floor(currentCorrectStreak/3)`, capped per template. ChatGPT corrected an unreachable-content defect in the supplied implementation: requested context is authoritative and every context template is reachable at its declared `minDifficulty`, then mastery raises it above that floor. This prevents higher-floor skills such as Grade 5 decimals from requiring mastery that no reachable prompt could create. Wrong answers ease back toward the floor; skips do not move it; rewards and adventure progress remain ungated.
- Scope 2 — **PWA / Add to Home Screen**: relative-path manifest, Realm of Eldoria branding, deterministic generated icons, standalone landscape launch metadata, and CI validation. No service worker or offline caching was added.
- Scope 3 — **bounded terrain proof**: the farm Ground layer uses approved `grass_b`/`grass_c`, `water_a`/`water_b`, and dirt-centre runtime pixels through a deterministic generated proof sheet. Collision, Decor, object coordinates, saves, and gameplay semantics are unchanged. This is a reversible proof, not final Wangset or environment-kit integration.
- Scope 4 — **E2E hardening**: browser-side recorders replace poll races for short-lived animations, crop feedback, and reward text. ChatGPT corrected two review defects: transient text history is reset immediately before each action so prior objective text cannot satisfy a later toast assertion, and animation listeners are removed by their own callback rather than clearing every `animationstart` listener.
- Verification hardening: CI now runs PWA validation, regenerates PWA icons and the terrain-proof map/sheet and requires a clean diff, retains unit-test diagnostics on failure, and runs the full browser smoke suite. Focused unit and browser coverage pins reachable template floors, mastery elevation, exactly-one-correct-choice invariants, and live WorldScene wiring.
- Compatibility: no save-schema, reward-value, quest-progression, collision, dependency, or curriculum-band change. The map repaint changes Ground visuals only. PR #101 is based before the approved shoreline PR #99 and must be restacked after #99 lands, preserving both CI and authoritative documentation histories additively.
- Remaining risk: streak thresholds and numerical ceilings still require long-term child/pedagogical tuning; PWA installation/orientation and touch/frame pacing need physical-iPad validation; the proof map retains hard centre-tile pond/path boundaries and placeholder structures until the Wangset and production environment-kit pass.

'''
path.write_text(text[:start] + replacement + text[end:], encoding='utf-8')
print('Patched Kimi changelog entry.')
