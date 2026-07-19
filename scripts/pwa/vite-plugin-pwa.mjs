// Dependency-free Vite plugin that generates the offline service worker.
//
// At build time it:
//   1. Reads the emitted bundle to list content-hashed (immutable) outputs.
//   2. Walks the public/ dir for unhashed runtime files (manifest, icons,
//      maps, audio, placeholder sprites/tiles).
//   3. Derives a deterministic per-build cache token from the hashed bundle
//      names plus the byte-content of every unhashed public file, so ANY
//      deploy change yields a new cache name (and the old cache is dropped on
//      activate).
//   4. Injects the cache name + precache lists into
//      scripts/pwa/service-worker.template.js and emits it as dist/sw.js.
//
// No runtime dependencies and no build-time dependencies beyond Node core.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(HERE, 'service-worker.template.js');

/** Recursively list files under `dir`, returned as posix-relative paths. */
function listFilesRelative(dir, baseDir = dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRelative(abs, baseDir));
    } else if (entry.isFile()) {
      out.push(path.relative(baseDir, abs).split(path.sep).join('/'));
    }
  }
  return out;
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * @param {{ packageVersion?: string }} [options]
 * @returns {import('vite').Plugin}
 */
export function serviceWorkerPlugin(options = {}) {
  let root = process.cwd();
  let publicDir = path.join(root, 'public');

  return {
    name: 'eldoria-service-worker',
    apply: 'build',
    configResolved(config) {
      root = config.root;
      // config.publicDir is absolute (or false if disabled).
      publicDir = config.publicDir || path.join(root, 'public');
    },
    generateBundle(_outputOptions, bundle) {
      // 1. Hashed, immutable build outputs (everything except the HTML shell).
      const immutablePaths = Object.keys(bundle)
        .filter((name) => name !== 'index.html')
        .sort();

      // 2. Unhashed runtime files copied verbatim from public/.
      const publicFiles = listFilesRelative(publicDir)
        // The Tiled project file is an editor artifact, never fetched at runtime.
        .filter((rel) => !rel.endsWith('.tiled-project'))
        .sort();

      // The navigable shell plus every mutable resource, network-first at runtime.
      const mutablePaths = ['./', 'index.html', ...publicFiles];

      // 3. Deterministic cache token: sensitive to any hashed-bundle change AND
      //    to any public-file content change.
      const packageVersion =
        options.packageVersion ??
        JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
      const hasher = crypto.createHash('sha256');
      hasher.update(immutablePaths.join('\n'));
      for (const rel of publicFiles) {
        hasher.update(`\n${rel}:`);
        hasher.update(fs.readFileSync(path.join(publicDir, rel)));
      }
      const token = hasher.digest('hex').slice(0, 12);
      const cacheName = `eldoria-v2-precache-v${packageVersion}-${token}`;

      // 4. Inject into the template and emit dist/sw.js.
      const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
      const source = template
        .replace('__SW_CACHE_NAME__', () => cacheName)
        .replace('__SW_IMMUTABLE__', () => JSON.stringify(immutablePaths))
        .replace('__SW_MUTABLE__', () => JSON.stringify(mutablePaths));

      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    }
  };
}

export default serviceWorkerPlugin;
