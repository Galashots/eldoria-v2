#!/usr/bin/env node
// Builds one same-camera before/after contact sheet per profile from the
// screenshots captured by scripts/capture-farm-scatter-evidence.mjs: each
// named spot becomes one row, before on the left and after on the right.
import fs from 'node:fs';
import path from 'node:path';
import { readPng, writePng } from './normalize-asset-sheet.mjs';

const ROOT = process.argv[2] ?? '/tmp/farm-scatter-evidence';
const PROFILES = ['mage', 'ranger'];
const SEP = 12;

function hstack(images) {
  const height = Math.max(...images.map((i) => i.height));
  const width = images.reduce((a, i) => a + i.width, 0) + SEP * (images.length - 1);
  const out = { width, height, colorType: 2, data: new Uint8Array(width * height * 4).fill(0) };
  let ox = 0;
  for (const img of images) {
    for (let y = 0; y < img.height; y += 1) {
      for (let x = 0; x < img.width; x += 1) {
        const s = (y * img.width + x) * 4;
        const d = (y * width + ox + x) * 4;
        out.data[d] = img.data[s]; out.data[d + 1] = img.data[s + 1];
        out.data[d + 2] = img.data[s + 2]; out.data[d + 3] = 255;
      }
    }
    ox += img.width + SEP;
  }
  return out;
}

function vstack(images) {
  const width = Math.max(...images.map((i) => i.width));
  const height = images.reduce((a, i) => a + i.height, 0) + SEP * (images.length - 1);
  const out = { width, height, colorType: 2, data: new Uint8Array(width * height * 4).fill(0) };
  let oy = 0;
  for (const img of images) {
    for (let y = 0; y < img.height; y += 1) {
      for (let x = 0; x < img.width; x += 1) {
        const s = (y * img.width + x) * 4;
        const d = ((oy + y) * width + x) * 4;
        out.data[d] = img.data[s]; out.data[d + 1] = img.data[s + 1];
        out.data[d + 2] = img.data[s + 2]; out.data[d + 3] = 255;
      }
    }
    oy += img.height + SEP;
  }
  return out;
}

for (const profile of PROFILES) {
  const beforeDir = path.join(ROOT, 'before', profile);
  const afterDir = path.join(ROOT, 'after', profile);
  const spots = fs.readdirSync(beforeDir).filter((f) => f.endsWith('.png')).sort();
  const rows = spots.map((spot) => hstack([readPng(path.join(beforeDir, spot)), readPng(path.join(afterDir, spot))]));
  const outPath = path.join(ROOT, `${profile}-before-after-contact-sheet.png`);
  writePng(outPath, vstack(rows));
  console.log(`wrote ${outPath} (${spots.length} rows: ${spots.map((s) => s.replace('.png', '')).join(', ')})`);
}
