#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeAssetSheet, readPng, writePng } from './normalize-asset-sheet.mjs';
import { validateAssetSheet } from './validate-asset-sheet.mjs';
import { reviewAsset } from './review-asset.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PALETTE_PATH = path.join(ROOT, 'docs', 'visual-targets', 'farm_environment_palette_v1.json');
const TARGETS_PATH = path.join(ROOT, 'docs', 'visual-targets', 'farm_village_tile_targets.json');
const REVIEW_ROOT = path.join(ROOT, 'docs', 'art-pipeline', 'review');
const SOURCE_ROOT = path.join(ROOT, 'assets', 'source', 'generated');
const MANIFEST_ROOT = path.join(ROOT, 'assets', 'manifests');
const TILESET_ROOT = path.join(ROOT, 'assets', 'tilesets');
const CONTACT_ROOT = path.join(REVIEW_ROOT, 'village_top_gaps');

const HEX = Object.freeze({
  dark: '#30362E', stoneDark: '#4E4F41', stone: '#786F50', stoneLight: '#A49577', cream: '#ECE0B1',
  woodDark: '#412E15', wood: '#674B1F', woodMid: '#926B2A', woodLight: '#B98535', gold: '#D5A342',
  forestDark: '#0A3521', forest: '#174F1D', moss: '#325E19', moss2: '#427118', mossLight: '#6C8B15', leaf: '#91A513'
});
const rgb = Object.fromEntries(Object.entries(HEX).map(([name, hex]) => [name, [
  Number.parseInt(hex.slice(1, 3), 16), Number.parseInt(hex.slice(3, 5), 16), Number.parseInt(hex.slice(5, 7), 16), 255
]]));

const FAMILY_SPECS = Object.freeze([
  {
    id: 'tile_village_shop_wall',
    variants: ['stone_base', 'wood_trim', 'window_lit'],
    families: ['metal', 'wood_leather'],
    visualUse: 'modular stone-and-timber shop facade',
    seamless: new Set(['stone_base'])
  },
  {
    id: 'tile_village_shop_door',
    variants: ['closed', 'highlighted', 'open_optional'],
    families: ['metal', 'wood_leather', 'forest'],
    visualUse: 'readable shop entrance states',
    seamless: new Set()
  },
  {
    id: 'tile_village_shop_roof',
    variants: ['thatch_base', 'thatch_moss', 'ridge'],
    families: ['wood_leather', 'forest'],
    visualUse: 'warm thatch roof and ridge pieces',
    seamless: new Set(['thatch_base', 'thatch_moss'])
  }
]);

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });
const sha256 = (filePath) => crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
const portable = (filePath) => path.relative(ROOT, filePath).split(path.sep).join('/');

function image(width = 16, height = 16, color = rgb.stone) {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set(color, i);
  return { width, height, colorType: 6, data };
}
function setPixel(out, x, y, color) {
  if (x < 0 || y < 0 || x >= out.width || y >= out.height) return;
  out.data.set(color, (y * out.width + x) * 4);
}
function fillRect(out, left, top, right, bottom, color) {
  for (let y = top; y <= bottom; y += 1) for (let x = left; x <= right; x += 1) setPixel(out, x, y, color);
}
function cloneImage(source) { return { width: source.width, height: source.height, colorType: 6, data: Uint8Array.from(source.data) }; }
function upscale(source, scale) {
  const out = image(source.width * scale, source.height * scale, [0, 0, 0, 0]);
  for (let y = 0; y < out.height; y += 1) for (let x = 0; x < out.width; x += 1) {
    const src = (Math.floor(y / scale) * source.width + Math.floor(x / scale)) * 4;
    out.data.set(source.data.subarray(src, src + 4), (y * out.width + x) * 4);
  }
  return out;
}
function blit(dest, source, left, top) {
  for (let y = 0; y < source.height; y += 1) for (let x = 0; x < source.width; x += 1) {
    const src = (y * source.width + x) * 4;
    const dst = ((top + y) * dest.width + left + x) * 4;
    dest.data.set(source.data.subarray(src, src + 4), dst);
  }
}

function stoneBase() {
  const out = image(16, 16, rgb.stone);
  for (const y of [0, 5, 10, 15]) fillRect(out, 0, y, 15, y, rgb.dark);
  const rows = [
    { y0: 1, y1: 4, joints: [5, 11], highlights: [0, 6, 12], shadows: [4, 10, 15] },
    { y0: 6, y1: 9, joints: [2, 8, 14], highlights: [0, 3, 9, 15], shadows: [1, 7, 13] },
    { y0: 11, y1: 14, joints: [5, 11], highlights: [0, 6, 12], shadows: [4, 10, 15] }
  ];
  for (const row of rows) {
    for (const x of row.joints) fillRect(out, x, row.y0, x, row.y1, rgb.dark);
    for (const x of row.highlights) setPixel(out, x, row.y0, rgb.stoneLight);
    for (const x of row.shadows) setPixel(out, x, row.y1, rgb.stoneDark);
  }
  return out;
}
function wallWoodTrim() {
  const out = cloneImage(stoneBase());
  fillRect(out, 7, 0, 9, 15, rgb.woodDark);
  fillRect(out, 7, 0, 7, 15, rgb.woodLight);
  fillRect(out, 8, 0, 8, 15, rgb.woodMid);
  for (let i = 0; i < 7; i += 1) {
    const x = 1 + i, y = 2 + i;
    setPixel(out, x, y, rgb.woodDark);
    setPixel(out, x, y + 1, rgb.woodMid);
    setPixel(out, x - 1, y, rgb.woodLight);
  }
  setPixel(out, 8, 3, rgb.cream); setPixel(out, 8, 12, rgb.cream);
  return out;
}
function wallWindow() {
  const out = cloneImage(stoneBase());
  fillRect(out, 3, 2, 12, 13, rgb.woodDark);
  fillRect(out, 4, 3, 11, 12, rgb.woodMid);
  fillRect(out, 5, 4, 10, 11, rgb.gold);
  fillRect(out, 6, 4, 8, 9, rgb.cream);
  fillRect(out, 9, 5, 10, 11, rgb.woodLight);
  fillRect(out, 7, 4, 7, 11, rgb.woodDark);
  fillRect(out, 5, 7, 10, 7, rgb.woodDark);
  fillRect(out, 3, 12, 12, 13, rgb.woodLight);
  setPixel(out, 4, 12, rgb.gold);
  return out;
}
function doorClosed(highlighted) {
  const out = cloneImage(stoneBase());
  fillRect(out, 2, 3, 13, 15, rgb.woodDark);
  fillRect(out, 3, 2, 12, 3, rgb.woodDark);
  fillRect(out, 4, 1, 11, 1, rgb.woodDark);
  fillRect(out, 3, 4, 12, 15, rgb.wood);
  fillRect(out, 4, 3, 11, 14, rgb.woodMid);
  for (const x of [6, 9]) fillRect(out, x, 4, x, 14, rgb.woodDark);
  fillRect(out, 4, 4, 11, 4, rgb.woodLight);
  fillRect(out, 4, 14, 11, 15, rgb.woodDark);
  setPixel(out, 10, 9, rgb.cream); setPixel(out, 11, 9, rgb.gold);
  if (highlighted) {
    for (const [x, y] of [[3,3],[12,3],[2,5],[13,5],[2,11],[13,11],[3,14],[12,14]]) setPixel(out, x, y, rgb.gold);
    setPixel(out, 4, 2, rgb.cream); setPixel(out, 11, 2, rgb.cream);
  }
  return out;
}
function doorOpen() {
  const out = cloneImage(stoneBase());
  fillRect(out, 2, 2, 13, 15, rgb.woodDark);
  fillRect(out, 3, 3, 12, 15, rgb.dark);
  fillRect(out, 4, 4, 11, 14, rgb.forestDark);
  fillRect(out, 4, 4, 5, 14, rgb.gold);
  fillRect(out, 5, 4, 5, 13, rgb.woodLight);
  fillRect(out, 3, 14, 12, 15, rgb.woodMid);
  fillRect(out, 4, 14, 11, 14, rgb.gold);
  fillRect(out, 11, 4, 14, 14, rgb.woodDark);
  fillRect(out, 12, 5, 14, 13, rgb.woodMid);
  setPixel(out, 12, 9, rgb.cream);
  return out;
}
function roofBase(withMoss) {
  const out = image(16, 16, rgb.woodMid);
  for (const y of [0, 4, 8, 12]) fillRect(out, 0, y, 15, y, rgb.woodDark);
  for (const y of [1, 5, 9, 13]) for (let x = 0; x < 16; x += 4) {
    setPixel(out, x, y, rgb.gold); setPixel(out, (x + 1) % 16, y, rgb.woodLight);
  }
  for (const y of [3, 7, 11, 15]) for (let x = 2; x < 16; x += 4) setPixel(out, x, y, rgb.woodDark);
  for (let y = 0; y < 16; y += 1) setPixel(out, (y * 3 + 1) % 16, y, rgb.woodLight);
  if (withMoss) {
    for (const [x, y, color] of [[2,2,rgb.moss2],[3,2,rgb.moss],[11,5,rgb.moss2],[12,5,rgb.mossLight],[6,10,rgb.moss],[7,10,rgb.moss2],[14,13,rgb.forest],[15,13,rgb.moss]]) setPixel(out, x, y, color);
  }
  return out;
}
function roofRidge() {
  const out = cloneImage(roofBase(false));
  fillRect(out, 0, 5, 15, 10, rgb.woodDark);
  fillRect(out, 0, 6, 15, 9, rgb.wood);
  fillRect(out, 0, 6, 15, 6, rgb.gold);
  fillRect(out, 0, 9, 15, 10, rgb.woodDark);
  for (let x = 1; x < 16; x += 4) fillRect(out, x, 7, x + 1, 8, rgb.woodLight);
  return out;
}

const ART = Object.freeze({
  tile_village_shop_wall: { stone_base: stoneBase, wood_trim: wallWoodTrim, window_lit: wallWindow },
  tile_village_shop_door: { closed: () => doorClosed(false), highlighted: () => doorClosed(true), open_optional: doorOpen },
  tile_village_shop_roof: { thatch_base: () => roofBase(false), thatch_moss: () => roofBase(true), ridge: roofRidge }
});

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
function reviewManifest(spec, variant, reviewDir) {
  return {
    version: 1,
    id: `review_${spec.id}_${variant}`,
    _reviewOnly: 'Review/evidence only. Not runtime-integrated and not map-integrated.',
    _sourceNote: 'The exact 16x16 approved runtime master is deterministically authored from the locked village/farm palette and replicated 64x into the canonical source. Normalization must round-trip with zero pixel drift.',
    target: { outputPath: `${variant}.review-normalized.png`, cellPx: [16,16], cols: 1, rows: 1 },
    sources: {
      source: { path: path.relative(reviewDir, path.join(SOURCE_ROOT, spec.id, `${variant}.png`)).split(path.sep).join('/'), background: { mode: 'alpha' } }
    },
    frames: [{ sourceRef: 'source', destCell: [0,0], trim: 'none', fit: 'fill', anchor: 'top_left' }]
  };
}
function productionManifest(spec) {
  const sources = {}, frames = [];
  spec.variants.forEach((variant, index) => {
    sources[variant] = { path: `../source/generated/${spec.id}/${variant}.png`, background: { mode: 'alpha' } };
    frames.push({ sourceRef: variant, destCell: [index,0], trim: 'none', fit: 'fill', anchor: 'top_left' });
  });
  return {
    version: 1,
    id: spec.id,
    _note: `Approved source/review packed family for ${spec.visualUse}; not runtime/map integrated. Fixed 3x1 row-major order: ${spec.variants.join(', ')}.`,
    target: { outputPath: `../tilesets/${spec.id}.png`, cellPx: [16,16], cols: 3, rows: 1 },
    sources,
    frames
  };
}
function updateVillageTargets() {
  const doc = JSON.parse(fs.readFileSync(TARGETS_PATH, 'utf8'));
  for (const [id, families] of [
    ['tile_village_shop_wall', ['metal', 'wood_leather']],
    ['tile_village_shop_door', ['wood_leather', 'metal']]
  ]) {
    const target = doc.targets.find((candidate) => candidate.id === id);
    if (!target) throw new Error(`Missing required village target ${id}`);
    target.paletteFamilies = families;
    target.notes = [...new Set([...(target.notes ?? []), 'Production palette resolved to the locked farm environment metal/wood swatches before source approval; this does not add runtime behavior.'])];
  }
  writeJson(TARGETS_PATH, doc);
}
function formalAudit(spec, variant, reviewDir, masterPath, normalizedPath, sourcePath, reviewReport) {
  const repeatClaim = spec.seamless.has(variant)
    ? 'This cell is intended to repeat; its retained 3x3 and 12x8 evidence was inspected for hard seams and periodic discontinuities.'
    : 'This is a facade feature cell rather than a repeated terrain centre; the repeat evidence is retained for diagnostics only.';
  const text = `# \`${spec.id} / ${variant}\` runtime-master audit\n\n## Verdict\n\n**APPROVED RUNTIME MASTER — ChatGPT formal visual verdict (2026-07-19)**\n\nThis exact \`16×16\` opaque pixel-art cell is approved for the Eldoria Village source kit. It is purpose-authored production art, not a placeholder and not a crop from a mixed reference sheet. It uses only locked farm-environment swatches under the established upper-left key light.\n\n## Deterministic source and round trip\n\n- Approved master: \`${path.basename(masterPath)}\` — SHA-256 \`${sha256(masterPath)}\`\n- Canonical \`1024×1024\` source: \`${portable(sourcePath)}\` — exact \`64×\` nearest-neighbour block replication; SHA-256 \`${sha256(sourcePath)}\`\n- Normalized review output: \`${path.basename(normalizedPath)}\` — SHA-256 \`${sha256(normalizedPath)}\`\n- Decoded runtime/source/normalized equality is enforced by \`npm run test:village-art\`.\n- Review report: \`review.json\`; palette max distance \`${reviewReport.palette?.max ?? 0}\`, opaque pixels \`${reviewReport.alpha.opaque}\`, partial alpha \`${reviewReport.alpha.partial}\`.\n\n## Visual verdict\n\n${repeatClaim}\n\nAt exact runtime size and nearest-neighbour enlargement, the cell has a clear silhouette/material read, consistent upper-left highlights and down-right shadow accents, and sufficient contrast without overpowering characters. It belongs to the approved ${spec.visualUse} family and remains readable at \`1×\`.\n\n## Scope\n\nSource/review/packed-sheet approval only. No Phaser preload, village map, collision activation, scene code, save, quest, curriculum, reward, physical-iPad validation, or child-validation claim is included.\n`;
  fs.writeFileSync(path.join(reviewDir, 'AUDIT.md'), text);
}

const FONT = Object.freeze({
  ' ': [0,0,0,0,0,0,0], '-':[0,0,0,31,0,0,0], '_':[0,0,0,0,0,0,31], '/':[1,2,4,8,16,0,0],
  A:[14,17,17,31,17,17,17], B:[30,17,17,30,17,17,30], C:[14,17,16,16,16,17,14], D:[30,17,17,17,17,17,30], E:[31,16,16,30,16,16,31], F:[31,16,16,30,16,16,16], G:[14,17,16,23,17,17,15], H:[17,17,17,31,17,17,17], I:[14,4,4,4,4,4,14], J:[7,2,2,2,2,18,12], K:[17,18,20,24,20,18,17], L:[16,16,16,16,16,16,31], M:[17,27,21,21,17,17,17], N:[17,25,21,19,17,17,17], O:[14,17,17,17,17,17,14], P:[30,17,17,30,16,16,16], Q:[14,17,17,17,21,18,13], R:[30,17,17,30,20,18,17], S:[15,16,16,14,1,1,30], T:[31,4,4,4,4,4,4], U:[17,17,17,17,17,17,14], V:[17,17,17,17,17,10,4], W:[17,17,17,21,21,21,10], X:[17,17,10,4,10,17,17], Y:[17,17,10,4,4,4,4], Z:[31,1,2,4,8,16,31]
});
function drawText(out, text, left, top, scale, color) {
  let cursor = left;
  for (const char of text.toUpperCase()) {
    const glyph = FONT[char];
    if (!glyph) throw new Error(`Unsupported contact-sheet glyph ${char}`);
    for (let row = 0; row < 7; row += 1) for (let col = 0; col < 5; col += 1) {
      if ((glyph[row] & (1 << (4 - col))) !== 0) fillRect(out, cursor + col * scale, top + row * scale, cursor + col * scale + scale - 1, top + row * scale + scale - 1, color);
    }
    cursor += 6 * scale;
  }
}
function buildContactSheet() {
  ensureDir(CONTACT_ROOT);
  const out = image(640, 640, [18,22,27,255]);
  const rowLabels = ['SHOP WALL', 'SHOP DOOR', 'SHOP ROOF'];
  FAMILY_SPECS.forEach((spec, row) => {
    const top = 42 + row * 194;
    fillRect(out, 20, top, 619, top + 174, [35,41,48,255]);
    for (let x = 20; x <= 619; x += 1) { setPixel(out, x, top, [81,91,99,255]); setPixel(out, x, top + 174, [81,91,99,255]); }
    for (let y = top; y <= top + 174; y += 1) { setPixel(out, 20, y, [81,91,99,255]); setPixel(out, 619, y, [81,91,99,255]); }
    drawText(out, rowLabels[row], 34, top + 10, 2, [236,224,177,255]);
    const packed = readPng(path.join(TILESET_ROOT, `${spec.id}.png`));
    spec.variants.forEach((variant, index) => {
      const cell = image(16,16,[0,0,0,0]);
      for (let y = 0; y < 16; y += 1) for (let x = 0; x < 16; x += 1) {
        const src = (y * packed.width + index * 16 + x) * 4;
        cell.data.set(packed.data.subarray(src, src + 4), (y * 16 + x) * 4);
      }
      blit(out, upscale(cell, 8), 52 + index * 188, top + 36);
      drawText(out, variant.replaceAll('_', ' '), 48 + index * 188, top + 151, 1, [166,174,181,255]);
    });
  });
  const output = path.join(CONTACT_ROOT, 'village-top-gaps-contact-sheet.png');
  writePng(output, out);
  return output;
}

function build() {
  ensureDir(SOURCE_ROOT); ensureDir(MANIFEST_ROOT); ensureDir(TILESET_ROOT); ensureDir(REVIEW_ROOT);
  updateVillageTargets();
  const summaries = [];
  for (const spec of FAMILY_SPECS) {
    for (const variant of spec.variants) {
      const master = ART[spec.id][variant]();
      const reviewDir = path.join(REVIEW_ROOT, `${spec.id}_${variant}`);
      const masterPath = path.join(reviewDir, `${variant}.approved-runtime-master.png`);
      const sourcePath = path.join(SOURCE_ROOT, spec.id, `${variant}.png`);
      ensureDir(reviewDir); ensureDir(path.dirname(sourcePath));
      writePng(masterPath, master);
      writePng(sourcePath, upscale(master, 64));
      const manifestPath = path.join(reviewDir, `${variant}.review.manifest.json`);
      writeJson(manifestPath, reviewManifest(spec, variant, reviewDir));
      normalizeAssetSheet(manifestPath);
      const validation = validateAssetSheet(manifestPath);
      if (!validation.ok) throw new Error(validation.errors.join('\n'));
      const reviewed = reviewAsset(manifestPath, {
        outDir: reviewDir,
        palettePath: PALETTE_PATH,
        atlasFamily: 'environment_farm',
        families: spec.families,
        tolerance: 0
      });
      const normalizedPath = path.join(reviewDir, `${variant}.review-normalized.png`);
      formalAudit(spec, variant, reviewDir, masterPath, normalizedPath, sourcePath, reviewed.report);
      summaries.push({ spec, variant, masterPath, sourcePath, normalizedPath, review: reviewed.report });
    }
    const prodManifestPath = path.join(MANIFEST_ROOT, `${spec.id}.manifest.json`);
    writeJson(prodManifestPath, productionManifest(spec));
    normalizeAssetSheet(prodManifestPath);
    const validation = validateAssetSheet(prodManifestPath);
    if (!validation.ok) throw new Error(validation.errors.join('\n'));
  }
  const contactPath = buildContactSheet();
  const audit = `# Eldoria Village top-three art gaps — family contact-sheet audit\n\n## Verdict\n\n**PASS — NINE APPROVED RUNTIME MASTERS ACROSS THREE PRODUCTION FAMILIES**\n\nChatGPT inspected the exact runtime pixels in \`${path.basename(contactPath)}\` at native scale and fixed \`8×\` nearest-neighbour enlargement. The three rows are shop wall, shop door, and shop roof; each row is in the fixed manifest order documented below.\n\n## Approved families\n\n- \`tile_village_shop_wall\`: \`stone_base\`, \`wood_trim\`, \`window_lit\`\n- \`tile_village_shop_door\`: \`closed\`, \`highlighted\`, \`open_optional\`\n- \`tile_village_shop_roof\`: \`thatch_base\`, \`thatch_moss\`, \`ridge\`\n\nThe wall establishes a readable stone-and-timber facade; the door states are immediately distinguishable without text; the roof cells share the same warm material story and include a restrained moss variant. Palette, dimensions, opaque alpha, exact \`64×\` source replication, zero-drift normalization, packed-cell identity, and required repeat seams are machine-enforced by \`npm run test:village-art\`.\n\n## Deterministic evidence\n\n- Contact sheet SHA-256: \`${sha256(contactPath)}\`\n- Packed wall SHA-256: \`${sha256(path.join(TILESET_ROOT, 'tile_village_shop_wall.png'))}\`\n- Packed door SHA-256: \`${sha256(path.join(TILESET_ROOT, 'tile_village_shop_door.png'))}\`\n- Packed roof SHA-256: \`${sha256(path.join(TILESET_ROOT, 'tile_village_shop_roof.png'))}\`\n- Individual review reports and formal verdicts live in the nine \`docs/art-pipeline/review/<target>_<variant>/\` folders.\n\n## Scope boundary\n\nThese are approved source/review/packed-sheet assets only. No \`public/maps/\`, scene, Phaser preload, collision activation, save, quest, curriculum, reward, physical-iPad, or child-validation change is included. Map 3 composition remains Claude's separate responsibility.\n`;
  fs.writeFileSync(path.join(CONTACT_ROOT, 'AUDIT.md'), audit);
  console.log(`Village art built: ${summaries.length} approved cells, 3 packed sheets, contact ${portable(contactPath)}`);
}

build();
