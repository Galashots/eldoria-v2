import { fileURLToPath } from 'node:url';
import { readPng, writePng } from '../../../../scripts/normalize-asset-sheet.mjs';

const input = fileURLToPath(new URL('root_star_revealed.pre-correction-32x32.png', import.meta.url));
const output = fileURLToPath(new URL('root_star_revealed.approved-master-32x32.png', import.meta.url));
const image = readPng(input);
const base = [
  [10, 53, 33], [23, 79, 29], [50, 94, 25], [66, 113, 24], [108, 139, 21], [145, 165, 19],
  [48, 54, 46], [78, 79, 65], [120, 111, 80], [164, 149, 119], [236, 224, 177]
];
const gold = [255, 214, 102, 255];
const green = [143, 209, 79, 255];
const corrections = [];

function replace(x, y, after, reason) {
  const offset = (y * image.width + x) * 4;
  const before = [...image.data.slice(offset, offset + 4)];
  if (before.every((value, index) => value === after[index])) return;
  image.data.set(after, offset);
  corrections.push({ x, y, before, after, reason });
}

replace(11, 4, [118, 150, 11, 255], 'upper-left moss fringe');
replace(28, 23, [55, 69, 49, 255], 'right-edge dark-plane fringe');

for (let y = 10; y <= 23; y += 1) {
  for (let x = 9; x <= 21; x += 1) {
    const offset = (y * image.width + x) * 4;
    const [r, g, b, a] = image.data.slice(offset, offset + 4);
    if (a === 0) continue;
    if (r >= 180 && g >= 160 && b <= 140) {
      replace(x, y, gold, 'Root-Star gold rune');
    } else if (g >= 150 && g >= r + 15 && g >= b + 50) {
      replace(x, y, green, 'Root-Star green rune');
    }
  }
}

for (let y = 0; y < image.height; y += 1) {
  for (let x = 0; x < image.width; x += 1) {
    const offset = (y * image.width + x) * 4;
    const rgba = [...image.data.slice(offset, offset + 4)];
    if (rgba[3] === 0) continue;
    if ([gold, green].some((swatch) => rgba.every((value, index) => value === swatch[index]))) continue;
    let nearest = null;
    let distance = Infinity;
    for (const swatch of base) {
      const candidate = Math.hypot(rgba[0] - swatch[0], rgba[1] - swatch[1], rgba[2] - swatch[2]);
      if (candidate < distance) {
        distance = candidate;
        nearest = swatch;
      }
    }
    if (distance > 40) replace(x, y, [...nearest, 255], 'base-family tolerance correction');
  }
}

writePng(output, image);
console.log(JSON.stringify({ output, count: corrections.length, corrections }, null, 2));
