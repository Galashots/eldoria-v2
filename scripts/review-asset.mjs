#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { normalizeAssetSheet, readPng, writePng } from './normalize-asset-sheet.mjs';
import { validateAssetSheet } from './validate-asset-sheet.mjs';
import { HEX_COLOR_PATTERN } from './lib/hex-color.mjs';

const parseArgs = (argv) => {
  const out = {};
  const allowed = new Set(['manifest', 'out-dir', 'palette', 'atlas-family', 'families', 'tolerance', 'modular-axis', 'exact-group']);
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) throw new Error(`Unexpected argument: ${argv[i]}`);
    const key = argv[i].slice(2);
    if (!allowed.has(key)) throw new Error(`Unknown option: --${key}`);
    if (Object.hasOwn(out, key)) throw new Error(`Duplicate option: --${key}`);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) throw new Error(`--${key} requires a value`);
    out[key] = next;
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

function compositeOnCheckerboard(image) {
  const out = { width: image.width, height: image.height, colorType: 6, data: new Uint8Array(image.width * image.height * 4) };
  const colors = [[214, 208, 220], [174, 167, 181]];
  for (let y = 0; y < image.height; y += 1) for (let x = 0; x < image.width; x += 1) {
    const source = (y * image.width + x) * 4;
    const dest = source;
    const background = colors[(Math.floor(x / 2) + Math.floor(y / 2)) % 2];
    const alpha = image.data[source + 3] / 255;
    out.data[dest] = Math.round(image.data[source] * alpha + background[0] * (1 - alpha));
    out.data[dest + 1] = Math.round(image.data[source + 1] * alpha + background[1] * (1 - alpha));
    out.data[dest + 2] = Math.round(image.data[source + 2] * alpha + background[2] * (1 - alpha));
    out.data[dest + 3] = 255;
  }
  return out;
}

function cropImage(image, left, top, width, height) {
  const out = { width, height, colorType: 6, data: new Uint8Array(width * height * 4) };
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const source = ((top + y) * image.width + left + x) * 4;
    const dest = (y * width + x) * 4;
    out.data.set(image.data.subarray(source, source + 4), dest);
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

function contiguousRuns(indices) {
  const runs = [];
  for (const value of indices) {
    const current = runs.at(-1);
    if (current && value === current[1] + 1) current[1] = value;
    else runs.push([value, value]);
  }
  return runs;
}

function edgeConnectivityMetrics(image, axis) {
  const first = [];
  const second = [];
  const length = axis === 'horizontal' ? image.height : image.width;
  for (let index = 0; index < length; index += 1) {
    const firstPixel = axis === 'horizontal' ? pixel(image, 0, index) : pixel(image, index, 0);
    const secondPixel = axis === 'horizontal'
      ? pixel(image, image.width - 1, index)
      : pixel(image, index, image.height - 1);
    if (firstPixel[3] > 0) first.push(index);
    if (secondPixel[3] > 0) second.push(index);
  }
  const firstSet = new Set(first);
  const secondSet = new Set(second);
  const shared = first.filter((index) => secondSet.has(index));
  const firstOnly = first.filter((index) => !secondSet.has(index));
  const secondOnly = second.filter((index) => !firstSet.has(index));
  if (axis === 'horizontal') {
    return {
      leftRows: first,
      rightRows: second,
      sharedRuns: contiguousRuns(shared),
      leftOnlyRows: firstOnly,
      rightOnlyRows: secondOnly
    };
  }
  return {
    topColumns: first,
    bottomColumns: second,
    sharedRuns: contiguousRuns(shared),
    topOnlyColumns: firstOnly,
    bottomOnlyColumns: secondOnly
  };
}

function modularEvidence(image, axis) {
  const horizontal = axis === 'horizontal';
  const strip = tileImage(image, horizontal ? 5 : 1, horizontal ? 1 : 5);
  const stripPreview = resizeNearest(
    compositeOnCheckerboard(strip),
    strip.width * 8,
    strip.height * 8
  );
  const pair = tileImage(image, horizontal ? 2 : 1, horizontal ? 1 : 2);
  const seamDepth = Math.min(4, horizontal ? image.width : image.height);
  const connection = horizontal
    ? cropImage(pair, image.width - seamDepth, 0, seamDepth * 2, image.height)
    : cropImage(pair, 0, image.height - seamDepth, image.width, seamDepth * 2);
  const connectionPreview = resizeNearest(
    compositeOnCheckerboard(connection),
    connection.width * 20,
    connection.height * 20
  );
  return { stripPreview, connectionPreview };
}

function hexToRgb(hex) {
  return [Number.parseInt(hex.slice(1, 3), 16), Number.parseInt(hex.slice(3, 5), 16), Number.parseInt(hex.slice(5, 7), 16)];
}

function nestedSwatchGroup(palette, groupPath) {
  let value = palette;
  for (const segment of groupPath.split('.')) value = value?.[segment];
  if (!Array.isArray(value) || value.length === 0 || value.some((hex) => typeof hex !== 'string' || !HEX_COLOR_PATTERN.test(hex))) {
    throw new Error(`Exact palette group ${groupPath} must resolve to a non-empty array of #rrggbb colors`);
  }
  return value;
}

function validatePaletteAtlasScope(palette, palettePath, atlasFamily) {
  const scopes = palette.appliesToAtlasFamilies;
  if (!Array.isArray(scopes) || scopes.length === 0) return;
  if (!atlasFamily) throw new Error(`Palette ${palette.paletteId ?? palettePath} requires an atlasFamily option`);
  if (!scopes.includes(atlasFamily)) {
    throw new Error(`Palette ${palette.paletteId ?? palettePath} does not apply to atlas family ${atlasFamily}`);
  }
}

function paletteMetrics(image, palettePath, atlasFamily, families, tolerance, exactGroup) {
  if (!families.length && !exactGroup) return null;
  if (!palettePath) throw new Error('Palette metrics require --palette when families or an exact group are requested');
  if (exactGroup && families.length === 0) throw new Error('Exact-group coverage requires at least one base palette family');
  const palette = JSON.parse(fs.readFileSync(palettePath, 'utf8'));
  validatePaletteAtlasScope(palette, palettePath, atlasFamily);
  const familyResolution = families.map((requested) => {
    const resolved = Object.hasOwn(palette.families ?? {}, requested) ? requested : palette.familyAliases?.[requested];
    if (!resolved || !Object.hasOwn(palette.families ?? {}, resolved)) {
      if (palette.deferredContractFamilies?.includes(requested)) {
        throw new Error(`Palette family ${requested} is deferred and has no review swatches`);
      }
      throw new Error(`Unresolved palette family: ${requested}`);
    }
    return { requested, resolved };
  });
  const swatches = familyResolution.flatMap(({ resolved }) => palette.families[resolved]).map(hexToRgb);
  const exactHexes = exactGroup ? nestedSwatchGroup(palette, exactGroup) : [];
  const exactColors = exactHexes.map((hex) => ({ hex: hex.toUpperCase(), rgb: hexToRgb(hex), fullyOpaqueCount: 0, nonTransparentCount: 0 }));
  const distances = [];
  let exactMatchPixels = 0;
  let baseTolerancePixels = 0;
  let uncoveredPixels = 0;
  for (let y = 0; y < image.height; y += 1) for (let x = 0; x < image.width; x += 1) {
    const p = pixel(image, x, y);
    if (p[3] === 0) continue;
    const exact = exactColors.find((color) => color.rgb[0] === p[0] && color.rgb[1] === p[1] && color.rgb[2] === p[2]);
    if (exact) {
      exact.nonTransparentCount += 1;
      if (p[3] === 255) exact.fullyOpaqueCount += 1;
      exactMatchPixels += 1;
      continue;
    }
    const distance = Math.min(...swatches.map((swatch) => rgbDistance(p, swatch)));
    distances.push(distance);
    if (distance <= tolerance) baseTolerancePixels += 1;
    else uncoveredPixels += 1;
  }
  distances.sort((a, b) => a - b);
  const result = {
    families,
    atlasFamily: atlasFamily ?? null,
    tolerance,
    pixels: distances.length,
    withinTolerance: distances.filter((distance) => distance <= tolerance).length,
    min: round(distances[0] ?? 0),
    median: round(distances[Math.floor(distances.length / 2)] ?? 0),
    max: round(distances.at(-1) ?? 0)
  };
  const aliasesUsed = familyResolution.filter(({ requested, resolved }) => requested !== resolved);
  if (aliasesUsed.length) result.familyResolution = familyResolution;
  if (exactGroup) {
    const missing = exactColors.filter((color) => color.fullyOpaqueCount === 0).map((color) => color.hex);
    if (missing.length) throw new Error(`Exact palette group ${exactGroup} is missing fully opaque colors: ${missing.join(', ')}`);
    if (uncoveredPixels > 0) throw new Error(`Palette coverage failed: ${uncoveredPixels} non-transparent pixels match neither base tolerance nor exact group ${exactGroup}`);
    result.exact = {
      group: exactGroup,
      colors: exactColors.map(({ hex, fullyOpaqueCount, nonTransparentCount }) => ({ hex, fullyOpaqueCount, nonTransparentCount })),
      coverage: {
        nonTransparentPixels: distances.length + exactMatchPixels,
        exactMatchPixels,
        baseTolerancePixels,
        uncoveredPixels
      }
    };
  }
  return result;
}

function firstSourcePath(manifest, manifestDir) {
  const source = Array.isArray(manifest.sources) ? manifest.sources[0] : Object.values(manifest.sources ?? {})[0];
  return source?.path ? path.resolve(manifestDir, source.path) : null;
}

export function reviewAsset(manifestPath, options = {}) {
  const modularAxis = options.modularAxis ?? null;
  if (modularAxis !== null && !['horizontal', 'vertical'].includes(modularAxis)) {
    throw new Error(`modularAxis must be horizontal or vertical, got ${modularAxis}`);
  }
  const tolerance = options.tolerance ?? 40;
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new Error(`tolerance must be a finite non-negative number, got ${tolerance}`);
  }
  const families = options.families ?? [];
  if (options.palettePath) {
    const palette = JSON.parse(fs.readFileSync(options.palettePath, 'utf8'));
    validatePaletteAtlasScope(palette, options.palettePath, options.atlasFamily ?? null);
  }
  const resolvedManifest = path.resolve(manifestPath);
  const manifestDir = path.dirname(resolvedManifest);
  const manifest = JSON.parse(fs.readFileSync(resolvedManifest, 'utf8'));
  if (options.normalize !== false) normalizeAssetSheet(resolvedManifest);
  const validation = validateAssetSheet(resolvedManifest);
  if (!validation.ok) throw new Error(validation.errors.join('\n'));

  const outputPath = path.resolve(manifestDir, manifest.target.outputPath);
  const runtime = readPng(outputPath);
  const palette = paletteMetrics(runtime, options.palettePath, options.atlasFamily ?? null, families, tolerance, options.exactGroup ?? null);
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

  const evidence = ['preview-20x.png', 'tile-3x3-8x.png', 'field-12x8-3x.png', 'comparison-panel.png'];
  let connectivity = null;
  if (modularAxis) {
    const modular = modularEvidence(runtime, modularAxis);
    const stripName = `strip-${modularAxis}-8x.png`;
    const connectionName = `connection-edges-${modularAxis}-20x.png`;
    writePng(path.join(outDir, stripName), modular.stripPreview);
    writePng(path.join(outDir, connectionName), modular.connectionPreview);
    evidence.push(stripName, connectionName);
    connectivity = { [modularAxis]: edgeConnectivityMetrics(runtime, modularAxis) };
  }

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
    palette,
    evidence
  };
  if (connectivity) report.connectivity = connectivity;
  fs.writeFileSync(path.join(outDir, 'review.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Asset review generated: ${manifest.id} -> ${outDir} (${runtime.width}x${runtime.height}, ${report.evidence.length} images + review.json)`);
  return { outDir, report };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.manifest) throw new Error('Usage: node scripts/review-asset.mjs --manifest <path> [--out-dir <path>] [--palette <path> --atlas-family <name>] [--families a,b] [--tolerance 40] [--modular-axis horizontal|vertical] [--exact-group group.name]');
      reviewAsset(args.manifest, {
        outDir: args['out-dir'],
        palettePath: args.palette ? path.resolve(args.palette) : null,
        atlasFamily: args['atlas-family'],
        families: args.families ? args.families.split(',').map((value) => value.trim()).filter(Boolean) : [],
        tolerance: args.tolerance === undefined ? 40 : Number(args.tolerance),
        modularAxis: args['modular-axis'],
        exactGroup: args['exact-group']
      });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
