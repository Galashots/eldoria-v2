#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { normalizeAssetSheet, readPng, writePng } from './normalize-asset-sheet.mjs';
import { validateAssetSheet } from './validate-asset-sheet.mjs';

const parseArgs = (argv) => {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    out[argv[i].slice(2)] = argv[i + 1];
    i += 1;
  }
  return out;
};

const rgbDistance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const round = (value) => Math.round(value * 1000) / 1000;
const relativePortable = (filePath) => path.relative(process.cwd(), filePath).split(path.sep).join('/');
const pixel = (image, x, y) => {
  const i = (y * image.width + x) * 4;
  return [image.data[i], image.data[i + 1], image.data[i + 2], image.data[i + 3]];
};

function resizeNearest(image, width, height) {
  const out = { width, height, colorType: 6, data: new Uint8Array(width * height * 4) };
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const source = (Math.floor(y * image.height / height) * image.width + Math.floor(x * image.width / width)) * 4;
    const dest = (y * width + x) * 4;
    out.data.set(image.data.subarray(source, source + 4), dest);
  }
  return out;
}

function tileImage(image, cols, rows) {
  const out = { width: image.width * cols, height: image.height * rows, colorType: 6, data: new Uint8Array(image.width * cols * image.height * rows * 4) };
  for (let ty = 0; ty < rows; ty += 1) for (let tx = 0; tx < cols; tx += 1) {
    for (let y = 0; y < image.height; y += 1) for (let x = 0; x < image.width; x += 1) {
      const source = (y * image.width + x) * 4;
      const dest = (((ty * image.height + y) * out.width) + tx * image.width + x) * 4;
      out.data.set(image.data.subarray(source, source + 4), dest);
    }
  }
  return out;
}

function opaqueCanvas(width, height, color = [24, 20, 30, 255]) {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set(color, i);
  return { width, height, colorType: 6, data };
}

function containOn(canvas, image, left, top, width, height) {
  const scale = Math.min(width / image.width, height / image.height);
  const scaled = resizeNearest(image, Math.max(1, Math.floor(image.width * scale)), Math.max(1, Math.floor(image.height * scale)));
  const ox = left + Math.floor((width - scaled.width) / 2);
  const oy = top + Math.floor((height - scaled.height) / 2);
  for (let y = 0; y < scaled.height; y += 1) for (let x = 0; x < scaled.width; x += 1) {
    const source = (y * scaled.width + x) * 4;
    const dest = ((oy + y) * canvas.width + ox + x) * 4;
    if (scaled.data[source + 3] === 0) continue;
    canvas.data.set(scaled.data.subarray(source, source + 4), dest);
  }
}

function edgeMetrics(image) {
  const horizontalWrap = [];
  const horizontalInternal = [];
  const verticalWrap = [];
  const verticalInternal = [];
  for (let y = 0; y < image.height; y += 1) {
    horizontalWrap.push(rgbDistance(pixel(image, image.width - 1, y), pixel(image, 0, y)));
    for (let x = 0; x < image.width - 1; x += 1) horizontalInternal.push(rgbDistance(pixel(image, x, y), pixel(image, x + 1, y)));
  }
  for (let x = 0; x < image.width; x += 1) {
    verticalWrap.push(rgbDistance(pixel(image, x, image.height - 1), pixel(image, x, 0)));
    for (let y = 0; y < image.height - 1; y += 1) verticalInternal.push(rgbDistance(pixel(image, x, y), pixel(image, x, y + 1)));
  }
  const average = (values) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  const hWrap = average(horizontalWrap), hInternal = average(horizontalInternal);
  const vWrap = average(verticalWrap), vInternal = average(verticalInternal);
  return {
    horizontal: { wrapStep: round(hWrap), internalStep: round(hInternal), ratio: round(hInternal ? hWrap / hInternal : 0) },
    vertical: { wrapStep: round(vWrap), internalStep: round(vInternal), ratio: round(vInternal ? vWrap / vInternal : 0) }
  };
}

function alphaMetrics(image) {
  const counts = { transparent: 0, partial: 0, opaque: 0 };
  for (let i = 3; i < image.data.length; i += 4) {
    if (image.data[i] === 0) counts.transparent += 1;
    else if (image.data[i] === 255) counts.opaque += 1;
    else counts.partial += 1;
  }
  return counts;
}

function paletteMetrics(image, palettePath, families, tolerance) {
  if (!palettePath || !families.length) return null;
  const palette = JSON.parse(fs.readFileSync(palettePath, 'utf8'));
  const swatches = families.flatMap((family) => palette.families?.[family] ?? []).map((hex) => [
    Number.parseInt(hex.slice(1, 3), 16), Number.parseInt(hex.slice(3, 5), 16), Number.parseInt(hex.slice(5, 7), 16)
  ]);
  if (!swatches.length) throw new Error(`No palette swatches found for families: ${families.join(', ')}`);
  const distances = [];
  for (let y = 0; y < image.height; y += 1) for (let x = 0; x < image.width; x += 1) {
    const p = pixel(image, x, y);
    if (p[3] === 0) continue;
    distances.push(Math.min(...swatches.map((swatch) => rgbDistance(p, swatch))));
  }
  distances.sort((a, b) => a - b);
  return {
    families,
    tolerance,
    pixels: distances.length,
    withinTolerance: distances.filter((distance) => distance <= tolerance).length,
    min: round(distances[0] ?? 0),
    median: round(distances[Math.floor(distances.length / 2)] ?? 0),
    max: round(distances.at(-1) ?? 0)
  };
}

function firstSourcePath(manifest, manifestDir) {
  const source = Array.isArray(manifest.sources) ? manifest.sources[0] : Object.values(manifest.sources ?? {})[0];
  return source?.path ? path.resolve(manifestDir, source.path) : null;
}

export function reviewAsset(manifestPath, options = {}) {
  const resolvedManifest = path.resolve(manifestPath);
  const manifestDir = path.dirname(resolvedManifest);
  const manifest = JSON.parse(fs.readFileSync(resolvedManifest, 'utf8'));
  if (options.normalize !== false) normalizeAssetSheet(resolvedManifest);
  const validation = validateAssetSheet(resolvedManifest);
  if (!validation.ok) throw new Error(validation.errors.join('\n'));

  const outputPath = path.resolve(manifestDir, manifest.target.outputPath);
  const runtime = readPng(outputPath);
  const outDir = path.resolve(options.outDir ?? path.join('.tmp', 'asset-review', manifest.id));
  fs.mkdirSync(outDir, { recursive: true });

  const preview = resizeNearest(runtime, runtime.width * 20, runtime.height * 20);
  const repeat3 = resizeNearest(tileImage(runtime, 3, 3), runtime.width * 3 * 8, runtime.height * 3 * 8);
  const field = resizeNearest(tileImage(runtime, 12, 8), runtime.width * 12 * 3, runtime.height * 8 * 3);
  writePng(path.join(outDir, 'preview-20x.png'), preview);
  writePng(path.join(outDir, 'tile-3x3-8x.png'), repeat3);
  writePng(path.join(outDir, 'field-12x8-3x.png'), field);

  const panel = opaqueCanvas(864, 288);
  const sourcePath = firstSourcePath(manifest, manifestDir);
  if (sourcePath && fs.existsSync(sourcePath)) containOn(panel, readPng(sourcePath), 0, 0, 288, 288);
  containOn(panel, runtime, 288, 0, 288, 288);
  containOn(panel, tileImage(runtime, 3, 3), 576, 0, 288, 288);
  writePng(path.join(outDir, 'comparison-panel.png'), panel);

  const families = options.families ?? [];
  const report = {
    version: 1,
    id: manifest.id,
    manifest: relativePortable(resolvedManifest),
    output: relativePortable(outputPath),
    dimensions: [runtime.width, runtime.height],
    frames: manifest.frames.length,
    sha256: crypto.createHash('sha256').update(fs.readFileSync(outputPath)).digest('hex'),
    alpha: alphaMetrics(runtime),
    seams: edgeMetrics(runtime),
    palette: paletteMetrics(runtime, options.palettePath, families, options.tolerance ?? 40),
    evidence: ['preview-20x.png', 'tile-3x3-8x.png', 'field-12x8-3x.png', 'comparison-panel.png']
  };
  fs.writeFileSync(path.join(outDir, 'review.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Asset review generated: ${manifest.id} -> ${outDir} (${runtime.width}x${runtime.height}, ${report.evidence.length} images + review.json)`);
  return { outDir, report };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.manifest) {
    console.error('Usage: node scripts/review-asset.mjs --manifest <path> [--out-dir <path>] [--palette <path>] [--families a,b] [--tolerance 40]');
    process.exitCode = 1;
  } else {
    try {
      reviewAsset(args.manifest, {
        outDir: args['out-dir'],
        palettePath: args.palette ? path.resolve(args.palette) : null,
        families: args.families ? args.families.split(',').map((value) => value.trim()).filter(Boolean) : [],
        tolerance: args.tolerance === undefined ? 40 : Number(args.tolerance)
      });
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}
