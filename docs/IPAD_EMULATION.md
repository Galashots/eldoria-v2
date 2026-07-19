# iPad-fidelity emulation harness

This document describes the offline-PWA and iPad-emulation test harness added
for the "offline-capable PWA + iPad-fidelity emulation" milestone. **This is
emulation. It is not physical-iPad Safari validation** and does not replace it —
physical touch comfort, safe-area behavior, audio balance, memory stability, and
frame pacing on a real iPad Safari remain unverified and still owed (see
`docs/CURRENT_STATE.md` "Known risks").

## What runs where

| Suite | Config | Server | Purpose |
| --- | --- | --- | --- |
| Default gameplay smoke | `playwright.config.ts` (`npm run smoke`) | `vite` dev server | Fast, deterministic gameplay/UI regression. **Unchanged.** |
| Offline PWA + iPad emulation | `playwright.emulation.config.ts` (`npm run test:emulation`) | production build via `vite preview` | Service-worker offline capability and iPad-scale performance/comfort. |

The emulation harness is a **separate Playwright config**, not extra projects on
the default one, specifically so it can never slow the default suite: the
default suite never builds a production bundle or starts a preview server, and
`npm run test:emulation` is the only thing that invokes this config. In CI it is
a separate, parallel job (`emulation`) alongside `build`.

It runs against the **production build served by `vite preview`** because (a) the
service worker only registers in production (`import.meta.env.PROD`), and (b) the
harness should measure the shipped bundle, not the dev server. Everything uses
relative paths and scope, so it stays correct from the GitHub Pages subpath
(`/eldoria-v2/`).

## Goal 1 — Offline PWA (`tests-emulation/offline-pwa.spec.ts`)

A dependency-free service worker (`scripts/pwa/service-worker.template.js`,
emitted as `dist/sw.js` at build time by `scripts/pwa/vite-plugin-pwa.mjs`):

- **Versioned cache per build.** The cache name embeds a token derived from the
  content-hashed bundle filenames plus the byte-content of every unhashed public
  file, so any deploy change yields a new cache; the old one is deleted on
  `activate`.
- **Precaches the whole app shell** on install: `index.html`, the manifest, the
  icons, `maps/farm.json`, every hashed Vite bundle, and the unhashed public
  assets (audio, placeholder tiles/sprites) the game fetches at runtime.
- **Cache-first** for hashed immutable bundles; **network-first with cache
  fallback** for navigations, `index.html`, `manifest.webmanifest`, `maps/*.json`
  and other unhashed public files, so a fresh deploy is picked up online but the
  game still boots fully offline.
- Same-origin GET only. No cross-origin caching (the game makes zero cross-origin
  requests by design); `localStorage` saves are never touched.

`cache.match` uses `{ ignoreVary: true }` — a document's own `<script>`/`<link>`
subresource requests carry different headers than the request we precached with,
so a plain match misses on a `Vary` header and the fetch would fail offline.
Matching by URL only is correct for an immutable precache.

Tests: the worker registers and controls the page and precaches the shell; a
second load with `context.setOffline(true)` boots the game fully (canvas visible,
title → farm reachable, zero console errors); a save written offline round-trips
across an offline reload; and after a simulated version bump the previous cache
is deleted while the current one survives.

## Goal 2 — iPad emulation (`tests-emulation/ipad-emulation.spec.ts`)

Device profile: iPad Pro 11" (CSS viewport 1194×834, `deviceScaleFactor` 2,
touch, spoofed Mobile Safari UA) forced onto **Chromium**. Real iPad Safari is
WebKit, but WebKit under Playwright cannot drive CDP CPU or network throttling —
the two knobs this harness needs — so we emulate the iPad envelope on Chromium
and throttle via CDP. The engine is therefore Blink, not WebKit; treat WebKit-
specific behavior as still-unverified.

- **~60 s journey probe** (boot → title → farm → walk a loop → practice-slime
  encounter → answer a learning prompt) under 4× CPU throttle, using a
  browser-side rAF recorder (the suite's existing pattern — no per-frame polling
  from Node). Records the frame-time distribution (p50/p95, long-frame >50 ms
  count), JS heap at a post-boot baseline vs. journey end (a leak signal via
  `performance.memory`), and a strict zero console-error / pageerror watchdog.
- **Cold load to interactive** under CPU + network throttle.
- **Touch-comfort audit**: every pointer-interactive canvas target (ACTION,
  prompt choice buttons, STATS/mute, read-aloud, stats-panel close) is measured
  in CSS px at the emulated scale and asserted ≥ 44×44.
- **Installability**: the served manifest declares `display: standalone` and
  `orientation: landscape` with ≥ 2 icons; the portrait orientation-lock overlay
  appears when rotated to portrait.

### Budgets (documented, re-tunable)

Defined in `tests-emulation/support/emulation.ts` (`BUDGETS`). They must pass on
GitHub-hosted runners with headroom; re-tune by running the full config 3× in CI
and taking the worst value plus ~20–30%.

| Budget | Value | Rationale |
| --- | --- | --- |
| p50 frame time | ≤ 40 ms | Primary, stable gate. Under 4× CPU throttle the game settles at Chromium's ~30 fps (33.3 ms) fallback cadence — the healthy throttled state, not a defect. p50 is rock-stable at 33.3 ms across every run, so this catches any *sustained* slowdown. |
| p95 frame time | ≤ 60 ms | Lenient backstop for severe stutter. p95 is noise-sensitive (33.4 ms isolated, up to ~50 ms under cross-project/CI load), so it is set loose to avoid flakiness while still failing on a genuine ~2× regression. |
| Heap growth | ≤ 25 MB | Leak signal from post-boot baseline to journey end. `performance.memory` is Chromium-only and coarse; observed growth is ~0 MB. |
| Cold load to interactive | ≤ 6000 ms | Guards against a pathological load regression, not micro-optimization. Observed ~1.9 s throttled. |

Representative metrics are captured in
`docs/evidence/pwa-ipad-emulation/ipad-journey-report.json`; each CI run
re-generates the report and attaches the offline-boot / journey / portrait-lock
screenshots as PR artifacts.

## Known emulation limitations (honest scope)

- **Installed `display-mode: standalone` is verified at the manifest level, not
  by runtime media emulation.** Headless Chromium under Playwright cannot force
  the installed display-mode media state (CDP `Emulation.setEmulatedMedia` does
  not cover `display-mode`; headless `--app` reports `browser`). The served
  manifest declaring `display: standalone` is what actually makes an installed
  PWA launch without browser chrome, so that is what the harness asserts. Real
  standalone chrome / safe-area behavior remains part of physical validation.
- **The engine is Blink, not WebKit.** WebKit-specific rendering, audio, and
  memory behavior are not exercised.
- **Throttling is synthetic.** 4× CPU + a fixed network profile approximate a
  mobile envelope; they are not a specific iPad's thermal or radio behavior.

## Running locally

```bash
npm run test:emulation
```

Note: Playwright 1.61 does not collect tests on Node 24, which strips TypeScript
types natively and bypasses Playwright's own loader (this affects the default
suite too, not just this config). Use the repo's supported Node 22 locally, the
same version CI uses.
