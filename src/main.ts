import Phaser from 'phaser';
import './styles/global.css';
import { gameConfig } from './gameConfig';

declare global {
  interface Window {
    __ELDORIA_GAME__?: Phaser.Game;
    __ELDORIA_E2E__?: boolean;
  }
}

const game = new Phaser.Game(gameConfig);

if (import.meta.env.DEV || window.__ELDORIA_E2E__) {
  window.__ELDORIA_GAME__ = game;
}

// Register the offline service worker in production builds only. Keeping it out
// of dev (and therefore the default Playwright suite, which runs the dev server)
// preserves deterministic dev/test behavior — there is no worker to serve stale
// bundles or intercept requests. The worker is emitted at build time by
// scripts/pwa/vite-plugin-pwa.mjs; the './sw.js' path stays relative so scope
// and registration keep working from the GitHub Pages subpath (/eldoria-v2/).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = new URL('sw.js', document.baseURI);
    void navigator.serviceWorker.register(swUrl, { scope: './' }).catch(() => {
      // Registration failure must never break the game; it just means no
      // offline support this session.
    });
  });
}
