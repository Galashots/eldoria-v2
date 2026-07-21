#!/usr/bin/env node
// Generates the original placeholder `text-blip.wav` dialogue tick (Council
// issue #115, D5 condition 1: provenance — original/synthesized audio, same
// license bar as art; no ripped asset-pack sound in this public repo).
//
// A short, soft triangle-ish blip with a fast exponential decay — the
// per-character "voiced text" tick played during the typewriter reveal. Fully
// deterministic (no RNG); re-run to regenerate byte-identically.
//
//   node scripts/generate-blip-sfx.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'assets', 'audio', 'sfx', 'text-blip.wav');

const SAMPLE_RATE = 44100;
const DURATION_S = 0.055; // brief tick
const FREQ_HZ = 720; // gentle mid pitch, not shrill
const PEAK = 0.22; // soft — it fires many times per line

const sampleCount = Math.round(SAMPLE_RATE * DURATION_S);
const pcm = Buffer.alloc(sampleCount * 2); // mono, 16-bit

// Triangle wave from a sine's arcsine shaping, with a 2ms attack and an
// exponential decay so consecutive blips never smear into a buzz.
const attack = Math.round(SAMPLE_RATE * 0.002);
for (let i = 0; i < sampleCount; i += 1) {
  const t = i / SAMPLE_RATE;
  const phase = 2 * Math.PI * FREQ_HZ * t;
  const triangle = (2 / Math.PI) * Math.asin(Math.sin(phase));
  const attackGain = i < attack ? i / attack : 1;
  const decayGain = Math.exp(-t / (DURATION_S * 0.35));
  const value = triangle * PEAK * attackGain * decayGain;
  const clamped = Math.max(-1, Math.min(1, value));
  pcm.writeInt16LE(Math.round(clamped * 32767), i * 2);
}

function wav(pcmData) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + pcmData.length, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate (mono, 16-bit)
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(pcmData.length, 40);
  return Buffer.concat([header, pcmData]);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, wav(pcm));
console.log(`wrote ${OUT} (${sampleCount} samples, ${DURATION_S * 1000}ms, ${FREQ_HZ}Hz mono)`);
