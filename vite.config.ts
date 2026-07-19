import { defineConfig } from 'vite';
// .mjs plugin (dependency-free) that emits the offline service worker at build
// time. Kept as a plain Node module so it can be unit-tested without Vite.
import { serviceWorkerPlugin } from './scripts/pwa/vite-plugin-pwa.mjs';

export default defineConfig({
  base: './',
  plugins: [serviceWorkerPlugin()],
  server: {
    port: 5173
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});
