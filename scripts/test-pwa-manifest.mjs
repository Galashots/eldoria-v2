#!/usr/bin/env node
// Validates the PWA/Add-to-Home-Screen surface: the web app manifest parses
// and declares the fields iOS/Android home-screen installs rely on, every
// declared icon exists at its declared pixel size (checked via the
// pipeline's own PNG reader, so a corrupt/truncated icon fails here), and
// index.html actually links the manifest and touch icon.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPng } from './normalize-asset-sheet.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// --- manifest -------------------------------------------------------------
const manifestPath = join(ROOT, 'public', 'manifest.webmanifest');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

for (const field of ['name', 'short_name', 'start_url', 'scope', 'display', 'background_color', 'theme_color']) {
  assert.ok(manifest[field], `manifest is missing required field: ${field}`);
}
assert.equal(manifest.display, 'standalone', 'home-screen launch should be standalone (no browser chrome)');
assert.equal(manifest.orientation, 'landscape', 'game requires landscape, manifest should say so');
assert.ok(!manifest.start_url.startsWith('/'), 'start_url must stay relative so the Pages subpath keeps working');
assert.ok(!manifest.scope.startsWith('/'), 'scope must stay relative so the Pages subpath keeps working');

// --- icons ----------------------------------------------------------------
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'manifest needs at least 192/512 icons');
const declaredSizes = new Set();
for (const icon of manifest.icons) {
  const iconPath = join(ROOT, 'public', icon.src.replace(/^\.\//, ''));
  const png = readPng(iconPath); // throws on missing/corrupt files
  const [declaredWidth, declaredHeight] = icon.sizes.split('x').map(Number);
  assert.equal(png.width, declaredWidth, `${icon.src}: width ${png.width} != declared ${declaredWidth}`);
  assert.equal(png.height, declaredHeight, `${icon.src}: height ${png.height} != declared ${declaredHeight}`);
  declaredSizes.add(icon.sizes);
}
assert.ok(declaredSizes.has('192x192'), 'manifest is missing a 192x192 icon');
assert.ok(declaredSizes.has('512x512'), 'manifest is missing a 512x512 icon');

// Apple touch icon: referenced from index.html, must exist at 180x180.
const appleIcon = readPng(join(ROOT, 'public', 'icons', 'apple-touch-icon.png'));
assert.equal(appleIcon.width, 180, 'apple-touch-icon must be 180x180');
assert.equal(appleIcon.height, 180, 'apple-touch-icon must be 180x180');

// --- index.html wiring ------------------------------------------------------
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
assert.ok(html.includes('rel="manifest"'), 'index.html does not link the web app manifest');
assert.ok(html.includes('manifest.webmanifest'), 'index.html manifest link does not point at manifest.webmanifest');
assert.ok(html.includes('rel="apple-touch-icon"'), 'index.html does not link the apple touch icon');
assert.ok(html.includes('apple-mobile-web-app-capable'), 'index.html is missing apple-mobile-web-app-capable');
assert.ok(html.includes('apple-mobile-web-app-title'), 'index.html is missing apple-mobile-web-app-title');

console.log('PWA manifest, icons, and index.html wiring are valid.');
