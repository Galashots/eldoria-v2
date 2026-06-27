#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectManifestErrors, readPng } from './normalize-asset-sheet.mjs';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    out[argv[i].slice(2)] = argv[i + 1];
    i += 1;
  }
  return out;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function validateAssetSheet(manifestPath) {
  let errors;
  try {
    errors = collectManifestErrors(manifestPath, { checkOutput: true });
  } catch (error) {
    errors = [`${manifestPath}: validation failed: ${error.message}`];
  }
  if (errors.length) return { ok: false, errors };
  const manifest = readJson(manifestPath);
  const manifestDir = path.dirname(path.resolve(manifestPath));
  const outputPath = path.resolve(manifestDir, manifest.target.outputPath);
  const image = readPng(outputPath);
  return { ok: true, id: manifest.id, width: image.width, height: image.height, frameCount: manifest.frames.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cliArgs = parseArgs(process.argv.slice(2));
  if (!cliArgs.manifest) {
    console.error('Usage: node scripts/validate-asset-sheet.mjs --manifest <manifestPath>');
    process.exitCode = 1;
  } else {
    const result = validateAssetSheet(cliArgs.manifest);
    if (!result.ok) {
      for (const error of result.errors) console.error(error);
      process.exitCode = 1;
    } else {
      console.log(`Asset sheet validation passed: ${result.id} (${result.width}x${result.height}, ${result.frameCount} frames).`);
    }
  }
}
