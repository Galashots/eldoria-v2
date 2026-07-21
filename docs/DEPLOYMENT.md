# Deployment (Vercel)

The game is a fully static Vite build (`npm run build` → `dist/`) deployed on **Vercel** through its Git integration with `Galashots/eldoria-v2`. There is no server code; saves remain local-first in the browser.

## How deploys happen

- **Production:** every push to `main` triggers a Vercel production build and deploy.
- **Previews:** every pull request gets an automatic preview deployment with its own URL, useful for visual review on a real iPad without merging.
- **Configuration:** [`../vercel.json`](../vercel.json) pins the framework (`vite`), build command (`npm run build`, which type-checks before building), and output directory (`dist`). No environment variables are required.
- GitHub Actions CI (`.github/workflows/ci.yml`) no longer deploys anything. It remains the verification gate (checks, unit tests, browser smoke suite); per the merge policy in `AGENTS.md`, only green PRs merge to `main`, so production builds stay verified.

The relative asset base (`base: './'` in `vite.config.ts` and relative hrefs in `index.html`) makes the build subpath-agnostic: it works at the Vercel domain root exactly as it did from the old GitHub Pages subpath.

## One-time setup (repo owner)

1. Sign in at [vercel.com](https://vercel.com) and choose **Add New → Project**, then import `Galashots/eldoria-v2` from GitHub.
2. Vercel auto-detects Vite and reads `vercel.json`; accept the defaults (no environment variables needed) and deploy.
3. Confirm the production URL. The expected default is `https://eldoria-v2.vercel.app/` — if Vercel assigns a different project name/URL, update the live-build links in `README.md` and `docs/REAL_CHILD_PLAYTEST_GUIDE.md`.
4. Verify the deployed game loads on desktop and iPad Safari (landscape), including Add to Home Screen.
5. After the Vercel deployment is confirmed working, disable GitHub Pages in the repository settings (**Settings → Pages**) so the stale `galashots.github.io/eldoria-v2/` build stops serving.

## Save-data impact of the move

Browser saves are keyed to the page origin. Moving from `https://galashots.github.io` to the Vercel domain means **existing saves on family devices do not carry over** — each profile starts fresh at the new URL. There is no export/import mechanism; treat the cutover as a fresh start and time it accordingly (not mid-quest during real-child playtesting). The old Pages URL keeps its saves until its site data is cleared.
