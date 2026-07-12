#!/usr/bin/env node
// Produces a canonical high-resolution production source from an approved,
// already-runtime-audited low-resolution master (e.g. a 16x16 tile that
// passed the visual audit at its actual runtime size) by exact
// nearest-neighbour upscaling: every source pixel becomes one identical
// solid-color square block in the output. No filtering, interpolation,
// sharpening, antialiasing, or color/palette modification is applied — this
// is a pure block-replication scale, not a resample.
//
// Exists because normalize-asset-sheet.mjs's own nearest-neighbour paste()
// is purpose-built for packing a source into a runtime sheet cell; this is
// the inverse direction (low-res approved master -> high-res source image)
// and has no other place in the pipeline.
import { pathToFileURL } from 'node:url';
import { readPng, writePng } from './normalize-asset-sheet.mjs';

/**
 * @param {{width:number,height:number,colorType:number,data:Uint8Array}} image
 * @param {number} scale - integer scale factor; output is width*scale x height*scale
 * @returns {{width:number,height:number,colorType:number,data:Uint8Array}} RGB-only (no alpha) output
 */
export function upscaleNearestNeighborRgbOnly(image, scale) {
  if (!Number.isInteger(scale) || scale < 1) throw new Error(`scale must be a positive integer, got ${scale}`);
  // readPng() always expands its returned `data` to 4 bytes/pixel (RGBA),
  // synthesizing alpha=255 for RGB (colorType 2) sources — so the read
  // stride here must always be 4, regardless of the source's original
  // colorType. (A colorType-conditional 3-byte stride previously caused a
  // one-channel misalignment for every colorType-2 source: see the water_a
  // block-exactness audit.)
  const outWidth = image.width * scale;
  const outHeight = image.height * scale;
  const out = new Uint8Array(outWidth * outHeight * 4);
  for (let sy = 0; sy < image.height; sy += 1) {
    for (let sx = 0; sx < image.width; sx += 1) {
      const sIndex = (sy * image.width + sx) * 4;
      const r = image.data[sIndex];
      const g = image.data[sIndex + 1];
      const b = image.data[sIndex + 2];
      for (let by = 0; by < scale; by += 1) {
        const oy = sy * scale + by;
        for (let bx = 0; bx < scale; bx += 1) {
          const ox = sx * scale + bx;
          const oIndex = (oy * outWidth + ox) * 4;
          out[oIndex] = r;
          out[oIndex + 1] = g;
          out[oIndex + 2] = b;
          out[oIndex + 3] = 255;
        }
      }
    }
  }
  return { width: outWidth, height: outHeight, colorType: 2, data: out };
}

function args(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i += 1) if (argv[i].startsWith('--')) { a[argv[i].slice(2)] = argv[i + 1]; i += 1; }
  return a;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = args(process.argv.slice(2));
  if (!a.in || !a.out || !a.scale) {
    console.error('Usage: node scripts/upscale-nearest-neighbor.mjs --in <path> --out <path> --scale <integer>');
    process.exit(1);
  }
  try {
    const source = readPng(a.in);
    const upscaled = upscaleNearestNeighborRgbOnly(source, Number(a.scale));
    writePng(a.out, upscaled, { colorType: 2 });
    console.log(`Upscaled ${a.in} (${source.width}x${source.height}) -> ${a.out} (${upscaled.width}x${upscaled.height}), scale ${a.scale}x, RGB (no alpha).`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
