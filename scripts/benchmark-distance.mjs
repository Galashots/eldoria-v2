import { performance } from 'perf_hooks';

// Simulate Phaser.Math.Distance.Between
function distance(px, py, tx, ty) {
    return Math.sqrt((px - tx) * (px - tx) + (py - ty) * (py - ty));
}

const targets = [];
for (let i = 0; i < 10000; i++) {
    targets.push({x: Math.random() * 1000, y: Math.random() * 1000});
}
const px = 500, py = 500;

function benchDistance() {
    let best = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const target of targets) {
        const d = distance(px, py, target.x, target.y);
        if (d < 42 && d < bestDistance) {
            best = target;
            bestDistance = d;
        }
    }
    return best;
}

function benchDistanceSq() {
    let best = null;
    let bestDistanceSq = Number.POSITIVE_INFINITY;
    for (const target of targets) {
        const dx = px - target.x;
        const dy = py - target.y;
        const dSq = dx * dx + dy * dy;
        if (dSq < 1764 && dSq < bestDistanceSq) { // 42 * 42 = 1764
            best = target;
            bestDistanceSq = dSq;
        }
    }
    return best;
}

const ITERATIONS = 10000;

const startDistance = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    benchDistance();
}
const endDistance = performance.now();
console.log(`Baseline (Distance): ${(endDistance - startDistance).toFixed(2)}ms`);

const startDistanceSq = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    benchDistanceSq();
}
const endDistanceSq = performance.now();
console.log(`Optimized (DistanceSq): ${(endDistanceSq - startDistanceSq).toFixed(2)}ms`);

console.log(`Improvement: ${((endDistance - startDistance) / (endDistanceSq - startDistanceSq)).toFixed(2)}x faster`);
