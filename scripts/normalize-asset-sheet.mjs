#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';

const SIG = Buffer.from([137,80,78,71,13,10,26,10]);
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data = Buffer.alloc(0)) {
  const tb = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0);
  return Buffer.concat([len, tb, data, crc]);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

export function readPng(filePath) {
  const buf = fs.readFileSync(filePath);
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error(`Not a PNG file: ${filePath}`);
  let off = 8;
  let width = 0;
  let height = 0;
  let depth = 0;
  let colorType = 0;
  const idats = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off); off += 4;
    const type = buf.subarray(off, off + 4).toString('ascii'); off += 4;
    const data = buf.subarray(off, off + len); off += len + 4;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      depth = data[8];
      colorType = data[9];
      if (data[10] !== 0 || data[11] !== 0 || data[12] !== 0) throw new Error(`Unsupported PNG settings in ${filePath}`);
    } else if (type === 'IDAT') idats.push(data);
    else if (type === 'IEND') break;
  }
  if (depth !== 8 || (colorType !== 6 && colorType !== 2)) throw new Error(`Unsupported PNG format in ${filePath}; expected 8-bit RGB or RGBA.`);
  const bpp = colorType === 6 ? 4 : 3;
  const rowBytes = width * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idats));
  const bytes = Buffer.alloc(rowBytes * height);
  let i = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[i]; i += 1;
    const row = y * rowBytes;
    for (let x = 0; x < rowBytes; x += 1) {
      const v = raw[i]; i += 1;
      const left = x >= bpp ? bytes[row + x - bpp] : 0;
      const up = y > 0 ? bytes[row - rowBytes + x] : 0;
      const ul = y > 0 && x >= bpp ? bytes[row - rowBytes + x - bpp] : 0;
      let out = v;
      if (filter === 1) out = v + left;
      else if (filter === 2) out = v + up;
      else if (filter === 3) out = v + Math.floor((left + up) / 2);
      else if (filter === 4) out = v + paeth(left, up, ul);
      else if (filter !== 0) throw new Error(`Unsupported PNG filter ${filter} in ${filePath}`);
      bytes[row + x] = out & 255;
    }
  }
  const rgba = new Uint8Array(width * height * 4);
  if (colorType === 6) rgba.set(bytes);
  else {
    for (let s = 0, d = 0; s < bytes.length; s += 3, d += 4) {
      rgba[d] = bytes[s]; rgba[d + 1] = bytes[s + 1]; rgba[d + 2] = bytes[s + 2]; rgba[d + 3] = 255;
    }
  }
  return { width, height, colorType, data: rgba };
}

export function writePng(filePath, image, options = {}) {
  const colorType = options.colorType ?? 6;
  const bpp = colorType === 6 ? 4 : 3;
  const rowBytes = image.width * bpp;
  const raw = Buffer.alloc((rowBytes + 1) * image.height);
  let o = 0;
  for (let y = 0; y < image.height; y += 1) {
    raw[o] = 0; o += 1;
    for (let x = 0; x < image.width; x += 1) {
      const p = (y * image.width + x) * 4;
      raw[o] = image.data[p]; raw[o + 1] = image.data[p + 1]; raw[o + 2] = image.data[p + 2]; o += 3;
      if (colorType === 6) { raw[o] = image.data[p + 3]; o += 1; }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(image.width, 0);
  ihdr.writeUInt32BE(image.height, 4);
  ihdr[8] = 8; ihdr[9] = colorType; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND')]));
}

const okInt = (v) => Number.isInteger(v) && v > 0;
const pair = (v, allowZero = false) => Array.isArray(v) && v.length === 2 && v.every((x) => Number.isInteger(x) && (allowZero ? x >= 0 : x > 0));
const rect = (v) => Array.isArray(v) && v.length === 4 && v.every((x) => Number.isInteger(x) && x >= 0) && v[2] > 0 && v[3] > 0;
const sourceEntries = (m) => Array.isArray(m.sources) ? m.sources.map((s, i) => ({ ref: s.id ?? s.ref ?? `source_${i}`, ...s })) : Object.entries(m.sources ?? {}).map(([ref, s]) => ({ ref, ...s }));
const loadJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const err = (mp, ctx, msg) => `${mp}${ctx ? ` [${ctx}]` : ''}: ${msg}`;

function hex(c) {
  if (typeof c !== 'string' || !/^#[0-9a-f]{6}$/i.test(c)) throw new Error(`Invalid color key ${c}; expected #rrggbb.`);
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}

function keyConfig(bg) {
  const [r, g, b] = hex(bg.color);
  const tol = bg.tolerance ?? 0;
  if (!Number.isInteger(tol) || tol < 0 || tol > 255) throw new Error(`Invalid color-key tolerance ${tol}; expected an integer from 0 to 255.`);
  return { r, g, b, tol };
}

function matchesKey(data, index, key) {
  return Math.abs(data[index] - key.r) <= key.tol
    && Math.abs(data[index + 1] - key.g) <= key.tol
    && Math.abs(data[index + 2] - key.b) <= key.tol;
}

function applyBg(img, bg) {
  if (!bg || bg.mode === 'alpha' || bg.mode === 'edge_flood_color_key') return img;
  if (bg.mode !== 'color_key') throw new Error(`Unsupported background mode: ${bg.mode}`);
  const key = keyConfig(bg);
  const data = new Uint8Array(img.data);
  for (let i = 0; i < data.length; i += 4) {
    if (matchesKey(data, i, key)) data[i + 3] = 0;
  }
  return { ...img, colorType: 6, data };
}

function applyEdgeFlood(img, bg, sourceRect) {
  if (bg?.mode !== 'edge_flood_color_key') return img;
  const key = keyConfig(bg);
  const data = new Uint8Array(img.data);
  const visited = new Uint8Array(sourceRect.w * sourceRect.h);
  const queue = [];

  const enqueue = (x, y) => {
    const local = (y - sourceRect.y) * sourceRect.w + (x - sourceRect.x);
    if (visited[local]) return;
    const pixel = (y * img.width + x) * 4;
    if (!matchesKey(data, pixel, key)) return;
    visited[local] = 1;
    queue.push([x, y]);
  };

  for (let x = sourceRect.x; x < sourceRect.x + sourceRect.w; x += 1) {
    enqueue(x, sourceRect.y);
    enqueue(x, sourceRect.y + sourceRect.h - 1);
  }
  for (let y = sourceRect.y; y < sourceRect.y + sourceRect.h; y += 1) {
    enqueue(sourceRect.x, y);
    enqueue(sourceRect.x + sourceRect.w - 1, y);
  }

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [x, y] = queue[cursor];
    data[(y * img.width + x) * 4 + 3] = 0;
    if (x > sourceRect.x) enqueue(x - 1, y);
    if (x + 1 < sourceRect.x + sourceRect.w) enqueue(x + 1, y);
    if (y > sourceRect.y) enqueue(x, y - 1);
    if (y + 1 < sourceRect.y + sourceRect.h) enqueue(x, y + 1);
  }

  return { ...img, colorType: 6, data };
}

function alphaBounds(img, r) {
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  for (let y = r.y; y < r.y + r.h; y += 1) for (let x = r.x; x < r.x + r.w; x += 1) {
    if (img.data[(y * img.width + x) * 4 + 3] > 0) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  }
  return maxX < minX ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function paste(src, sr, dst, destCell, cellPx, anchor, fit = 'contain') {
  const [cw, ch] = cellPx;
  let dw, dh;
  if (fit === 'fill') {
    dw = cw;
    dh = ch;
  } else {
    const scale = Math.min(cw / sr.w, ch / sr.h);
    dw = Math.max(1, Math.round(sr.w * scale));
    dh = Math.max(1, Math.round(sr.h * scale));
  }
  const ox = anchor === 'top_left' ? 0 : Math.floor((cw - dw) / 2);
  const oy = anchor === 'top_left' ? 0 : anchor === 'center' ? Math.floor((ch - dh) / 2) : ch - dh;
  const baseX = destCell[0] * cw + ox;
  const baseY = destCell[1] * ch + oy;
  for (let y = 0; y < dh; y += 1) for (let x = 0; x < dw; x += 1) {
    const sx = sr.x + Math.min(sr.w - 1, Math.floor(x * sr.w / dw));
    const sy = sr.y + Math.min(sr.h - 1, Math.floor(y * sr.h / dh));
    const si = (sy * src.width + sx) * 4;
    if (src.data[si + 3] === 0) continue;
    const di = ((baseY + y) * dst.width + baseX + x) * 4;
    dst.data[di] = src.data[si]; dst.data[di + 1] = src.data[si + 1]; dst.data[di + 2] = src.data[si + 2]; dst.data[di + 3] = src.data[si + 3];
  }
}

function transparentCell(img, cellPx, cell) {
  const [cw, ch] = cellPx;
  for (let y = cell[1] * ch; y < (cell[1] + 1) * ch; y += 1) for (let x = cell[0] * cw; x < (cell[0] + 1) * cw; x += 1) {
    if (img.data[(y * img.width + x) * 4 + 3] !== 0) return false;
  }
  return true;
}

export function collectManifestErrors(manifestPath, options = {}) {
  const out = [];
  const dir = path.dirname(path.resolve(manifestPath));
  let m;
  try { m = loadJson(manifestPath); } catch (e) { return [err(manifestPath, '', `failed to parse JSON: ${e.message}`)]; }
  if (m.version !== 1) out.push(err(manifestPath, 'version', 'version must be 1.'));
  if (typeof m.id !== 'string' || !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(m.id)) out.push(err(manifestPath, 'id', 'id must be lowercase snake_case.'));
  const t = m.target ?? {};
  if (typeof t.outputPath !== 'string' || !t.outputPath.trim()) out.push(err(manifestPath, 'target.outputPath', 'target.outputPath is required.'));
  if (!pair(t.cellPx)) out.push(err(manifestPath, 'target.cellPx', 'target.cellPx must be [positiveInteger, positiveInteger].'));
  if (!okInt(t.cols) || !okInt(t.rows)) out.push(err(manifestPath, 'target', 'target.cols and target.rows must be positive integers.'));
  const sources = sourceEntries(m);
  if (!sources.length) out.push(err(manifestPath, 'sources', 'sources must be present and non-empty.'));
  const byRef = new Map();
  const sourceImages = new Map();
  for (const s of sources) {
    if (byRef.has(s.ref)) out.push(err(manifestPath, `sources.${s.ref}`, 'duplicate source reference.'));
    byRef.set(s.ref, s);
    const p = path.resolve(dir, s.path ?? '');
    if (!s.path || !fs.existsSync(p)) { out.push(err(manifestPath, `sources.${s.ref}`, `source file does not exist: ${s.path}`)); continue; }
    let img;
    try { img = readPng(p); } catch (e) { out.push(err(manifestPath, `sources.${s.ref}`, e.message)); continue; }
    sourceImages.set(s.ref, img);
    if (img.colorType !== 6 && !['color_key', 'edge_flood_color_key', 'alpha'].includes(s.background?.mode)) out.push(err(manifestPath, `sources.${s.ref}`, 'source PNG must have alpha or declare a color-key background mode.'));
    if (['color_key', 'edge_flood_color_key'].includes(s.background?.mode)) {
      try { keyConfig(s.background); } catch (e) { out.push(err(manifestPath, `sources.${s.ref}.background`, e.message)); }
    }
    if (s.background && !['alpha', 'color_key', 'edge_flood_color_key'].includes(s.background.mode)) out.push(err(manifestPath, `sources.${s.ref}.background.mode`, 'background.mode must be alpha, color_key, or edge_flood_color_key.'));
    if (s.grid && (!okInt(s.grid.cols) || !okInt(s.grid.rows) || img.width % s.grid.cols !== 0 || img.height % s.grid.rows !== 0)) out.push(err(manifestPath, `sources.${s.ref}.grid`, 'source dimensions must divide evenly by positive grid cols and rows.'));
  }
  if (!Array.isArray(m.frames) || !m.frames.length) out.push(err(manifestPath, 'frames', 'frames must be a non-empty array.'));
  const seen = new Set();
  for (const [i, f] of (Array.isArray(m.frames) ? m.frames : []).entries()) {
    const c = `frames[${i}]`;
    if (!pair(f.destCell, true)) out.push(err(manifestPath, `${c}.destCell`, 'destCell must be [col, row].'));
    else {
      if (f.destCell[0] >= t.cols || f.destCell[1] >= t.rows) out.push(err(manifestPath, `${c}.destCell`, 'destCell is outside target grid.'));
      const key = f.destCell.join(','); if (seen.has(key)) out.push(err(manifestPath, `${c}.destCell`, 'duplicate destCell.')); seen.add(key);
    }
    if (f.sourceRef && f.sourcePath) out.push(err(manifestPath, c, 'frame must use sourceRef or sourcePath, not both.'));
    if (f.sourceCell !== undefined && f.sourceRect !== undefined) out.push(err(manifestPath, c, 'frame must use sourceCell or sourceRect, not both.'));
    const s = f.sourceRef ? byRef.get(f.sourceRef) : f.sourcePath ? { ref: f.sourcePath, path: f.sourcePath, background: f.background } : null;
    if (!s) {
      out.push(err(manifestPath, c, f.sourceRef ? `unknown sourceRef: ${f.sourceRef}` : 'frame must include sourceRef or sourcePath.'));
      continue;
    }
    const sp = path.resolve(dir, s.path);
    if (!fs.existsSync(sp)) {
      if (f.sourcePath) out.push(err(manifestPath, `${c}.sourcePath`, `source file does not exist: ${f.sourcePath}`));
      continue;
    }
    let img = sourceImages.get(s.ref);
    if (!img) {
      try { img = readPng(sp); } catch (e) { out.push(err(manifestPath, c, e.message)); continue; }
      if (img.colorType !== 6 && !['color_key', 'edge_flood_color_key', 'alpha'].includes(s.background?.mode)) out.push(err(manifestPath, c, 'source PNG must have alpha or declare a color-key background mode.'));
      if (['color_key', 'edge_flood_color_key'].includes(s.background?.mode)) {
        try { keyConfig(s.background); } catch (e) { out.push(err(manifestPath, `${c}.background`, e.message)); }
      }
      if (s.background && !['alpha', 'color_key', 'edge_flood_color_key'].includes(s.background.mode)) out.push(err(manifestPath, `${c}.background.mode`, 'background.mode must be alpha, color_key, or edge_flood_color_key.'));
    }
    if (f.sourceCell !== undefined) {
      if (!s.grid) out.push(err(manifestPath, `${c}.sourceCell`, 'sourceCell requires a source grid.'));
      else if (!pair(f.sourceCell, true) || f.sourceCell[0] >= s.grid.cols || f.sourceCell[1] >= s.grid.rows) out.push(err(manifestPath, `${c}.sourceCell`, 'sourceCell is outside source grid.'));
    }
    if (f.sourceRect !== undefined && (!rect(f.sourceRect) || f.sourceRect[0] + f.sourceRect[2] > img.width || f.sourceRect[1] + f.sourceRect[3] > img.height)) out.push(err(manifestPath, `${c}.sourceRect`, 'sourceRect is invalid or outside source image.'));
    if (f.trim !== undefined && !['alpha', 'none'].includes(f.trim)) out.push(err(manifestPath, `${c}.trim`, 'trim must be alpha or none.'));
    if (f.fit !== undefined && !['contain', 'fill'].includes(f.fit)) out.push(err(manifestPath, `${c}.fit`, 'fit must be contain or fill.'));
    if (f.anchor !== undefined && !['center', 'center_bottom', 'top_left'].includes(f.anchor)) out.push(err(manifestPath, `${c}.anchor`, 'anchor must be center, center_bottom, or top_left.'));
  }
  if (t.expectedEmptyCells !== undefined && !Array.isArray(t.expectedEmptyCells)) out.push(err(manifestPath, 'target.expectedEmptyCells', 'expectedEmptyCells must be an array.'));
  for (const [i, cell] of (Array.isArray(t.expectedEmptyCells) ? t.expectedEmptyCells : []).entries()) {
    if (!pair(cell, true) || cell[0] >= t.cols || cell[1] >= t.rows) out.push(err(manifestPath, `target.expectedEmptyCells[${i}]`, 'expected empty cell must be inside the target grid.'));
  }
  if (options.checkOutput !== false && t.outputPath) {
    const op = path.resolve(dir, t.outputPath);
    if (!fs.existsSync(op)) out.push(err(manifestPath, 'target.outputPath', `output PNG does not exist: ${t.outputPath}`));
    else {
      try {
        const img = readPng(op);
        const ew = t.cellPx?.[0] * t.cols, eh = t.cellPx?.[1] * t.rows;
        if (img.width !== ew || img.height !== eh) out.push(err(manifestPath, 'target.outputPath', `output dimensions ${img.width}x${img.height} do not equal expected ${ew}x${eh}.`));
        if (img.colorType !== 6) out.push(err(manifestPath, 'target.outputPath', 'output PNG must have alpha.'));
        for (const cell of t.expectedEmptyCells ?? []) if (pair(cell, true) && cell[0] < t.cols && cell[1] < t.rows && !transparentCell(img, t.cellPx, cell)) out.push(err(manifestPath, 'target.expectedEmptyCells', `expected empty cell [${cell}] is not fully transparent.`));
      } catch (e) { out.push(err(manifestPath, 'target.outputPath', e.message)); }
    }
  }
  return out;
}

function sourceRect(img, source, frame) {
  if (frame.sourceCell !== undefined) {
    const cw = img.width / source.grid.cols;
    const ch = img.height / source.grid.rows;
    return { x: frame.sourceCell[0] * cw, y: frame.sourceCell[1] * ch, w: cw, h: ch };
  }
  if (frame.sourceRect !== undefined) return { x: frame.sourceRect[0], y: frame.sourceRect[1], w: frame.sourceRect[2], h: frame.sourceRect[3] };
  return { x: 0, y: 0, w: img.width, h: img.height };
}

export function normalizeAssetSheet(manifestPath) {
  const errors = collectManifestErrors(manifestPath, { checkOutput: false });
  if (errors.length) throw new Error(errors.join('\n'));
  const m = loadJson(manifestPath);
  const dir = path.dirname(path.resolve(manifestPath));
  const t = m.target;
  const [cw, ch] = t.cellPx;
  const output = { width: cw * t.cols, height: ch * t.rows, colorType: 6, data: new Uint8Array(cw * t.cols * ch * t.rows * 4) };
  const byRef = new Map(sourceEntries(m).map((s) => [s.ref, s]));
  const cache = new Map();
  for (const f of m.frames) {
    const s = f.sourceRef ? byRef.get(f.sourceRef) : { ref: f.sourcePath, path: f.sourcePath, background: f.background };
    if (!cache.has(s.ref)) cache.set(s.ref, applyBg(readPng(path.resolve(dir, s.path)), s.background));
    const sourceImage = cache.get(s.ref);
    const sr = sourceRect(sourceImage, s, f);
    const img = applyEdgeFlood(sourceImage, s.background, sr);
    const bounds = alphaBounds(img, sr);
    if (!bounds) throw new Error(`frame ${JSON.stringify(f.destCell)} contains no non-transparent pixels.`);
    paste(img, (f.trim ?? 'alpha') === 'none' ? sr : bounds, output, f.destCell, t.cellPx, f.anchor ?? 'center_bottom', f.fit ?? 'contain');
  }
  const op = path.resolve(dir, t.outputPath);
  writePng(op, output);
  console.log(`Asset sheet normalized: ${m.id} -> ${t.outputPath} (${output.width}x${output.height}, ${t.cols}x${t.rows}, cell ${cw}x${ch})`);
  return { id: m.id, outputPath: op, width: output.width, height: output.height, cols: t.cols, rows: t.rows, cellPx: t.cellPx };
}

function args(argv) { const a = {}; for (let i = 0; i < argv.length; i += 1) if (argv[i].startsWith('--')) { a[argv[i].slice(2)] = argv[i + 1]; i += 1; } return a; }
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = args(process.argv.slice(2));
  if (!a.manifest) { console.error('Usage: node scripts/normalize-asset-sheet.mjs --manifest <manifestPath>'); process.exit(1); }
  try { normalizeAssetSheet(a.manifest); } catch (e) { console.error(e.message); process.exit(1); }
}
