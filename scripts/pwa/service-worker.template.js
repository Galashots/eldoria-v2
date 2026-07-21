/* eslint-disable */
// Eldoria offline service worker — TEMPLATE.
//
// This file is not shipped as-is. At build time, scripts/pwa/vite-plugin-pwa.mjs
// replaces the three __SW_*__ tokens below with concrete, build-derived values
// and emits the result as dist/sw.js. Keeping the logic here as real JavaScript
// (rather than a string inside the plugin) means it stays lintable and greppable.
//
// Design (see docs/IPAD_EMULATION.md and the PR body for the rationale):
//   * Versioned cache per build. CACHE_NAME embeds a token derived from the
//     content-hashed bundle filenames, so any code/asset change yields a new
//     cache and the old one is deleted on activate.
//   * Precache the whole app shell on install: index.html, the manifest, the
//     icons, maps/farm.json, every hashed Vite bundle, and the unhashed public
//     assets (audio, placeholder tiles/sprites) the game fetches at runtime.
//   * Serve hashed, immutable bundles cache-first. Serve navigations and every
//     other in-scope resource (index.html, manifest.webmanifest, maps/*.json,
//     public assets) network-first with a cache fallback, so a fresh deploy is
//     picked up when online but the game still boots fully offline.
//   * Same-origin GET only. No cross-origin caching (the game makes zero
//     cross-origin requests by design) and localStorage saves are never touched.

const CACHE_NAME = '__SW_CACHE_NAME__';
// URLs of content-hashed, immutable build outputs — safe to serve cache-first.
const IMMUTABLE_PATHS = __SW_IMMUTABLE__;
// URLs that can change between deploys without changing their name — served
// network-first so updates land, with a cache fallback for offline.
const MUTABLE_PATHS = __SW_MUTABLE__;

// Resolve every precache path against the worker's own scope so the same code
// works from the site root (vite preview) and from the GitHub Pages subpath
// (/eldoria-v2/) without any absolute paths baked in.
const scope = new URL('./', self.location.href);
const toUrl = (relativePath) => new URL(relativePath, scope).href;
const IMMUTABLE_URLS = new Set(IMMUTABLE_PATHS.map(toUrl));
const MUTABLE_URLS = new Set(MUTABLE_PATHS.map(toUrl));
const PRECACHE_URLS = [...IMMUTABLE_URLS, ...MUTABLE_URLS];
const INDEX_URL = toUrl('index.html');

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Precache one request at a time with cache:'reload' so a stale HTTP
      // cache can't seed the offline cache with an outdated shell.
      await Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => {
            // A single missing/optional asset must not abort the whole install;
            // the fetch handler will still network-first it later.
          })
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          // Delete every Eldoria precache except the current build's. Foreign
          // cache names (if any) are left untouched.
          .filter((name) => name.startsWith('eldoria-v2-precache-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

// ignoreVary matters: precached responses can carry a Vary header (e.g.
// Accept-Encoding), and a document's own <script>/<link> subresource requests
// send different headers than the Request we precached with — so a plain
// cache.match(request) misses, falls through to fetch(), and throws offline.
// Matching by URL only (ignoreVary) is correct for an immutable precache.
const MATCH_OPTIONS = { ignoreVary: true };

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, MATCH_OPTIONS);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request, MATCH_OPTIONS);
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await cache.match(fallbackUrl, MATCH_OPTIONS);
      if (fallback) return fallback;
    }
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Only same-origin, in-scope requests are ours to serve.
  if (url.origin !== self.location.origin) return;
  if (!url.href.startsWith(scope.href) && url.href !== scope.href.replace(/\/$/, '')) return;

  // App-shell navigations: network-first, fall back to the cached index.html so
  // a cold offline launch still boots.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, INDEX_URL));
    return;
  }

  const key = url.href.split('#')[0];
  if (IMMUTABLE_URLS.has(key)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Everything else in scope (manifest, maps/*.json, public assets, and any
  // as-yet-uncached same-origin GET): network-first with cache fallback.
  event.respondWith(networkFirst(request));
});
