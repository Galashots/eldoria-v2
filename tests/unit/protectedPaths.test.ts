import { describe, expect, it } from 'vitest';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - plain ESM hook module without type declarations
import { evaluateWrite, parseApprovalFile } from '../../scripts/hooks/protectedPaths.mjs';

const repoRoot = 'C:/Users/Leo/Desktop/eldoria-v2';

describe('evaluateWrite', () => {
  it('allows writes to ordinary source files', () => {
    const verdict = evaluateWrite({
      filePath: `${repoRoot}/src/scenes/WorldScene.ts`,
      repoRoot,
      approvedPatterns: [],
    });
    expect(verdict.allowed).toBe(true);
  });

  it('blocks writes to .github/workflows files', () => {
    const verdict = evaluateWrite({
      filePath: `${repoRoot}/.github/workflows/ci.yml`,
      repoRoot,
      approvedPatterns: [],
    });
    expect(verdict.allowed).toBe(false);
    expect(verdict.protectedPattern).toBe('.github/workflows/**');
  });

  it('blocks nested paths under .github/workflows', () => {
    const verdict = evaluateWrite({
      filePath: `${repoRoot}/.github/workflows/deploy/extra.yml`,
      repoRoot,
      approvedPatterns: [],
    });
    expect(verdict.allowed).toBe(false);
  });

  it('blocks writes to the SaveSystem surface', () => {
    const verdict = evaluateWrite({
      filePath: `${repoRoot}/src/systems/SaveSystem.ts`,
      repoRoot,
      approvedPatterns: [],
    });
    expect(verdict.allowed).toBe(false);
    expect(verdict.protectedPattern).toBe('src/systems/SaveSystem*');
  });

  it('blocks SaveSystem-prefixed siblings (e.g. SaveSystemMigrations.ts)', () => {
    const verdict = evaluateWrite({
      filePath: `${repoRoot}/src/systems/SaveSystemMigrations.ts`,
      repoRoot,
      approvedPatterns: [],
    });
    expect(verdict.allowed).toBe(false);
  });

  it('does not block files that merely mention SaveSystem elsewhere', () => {
    const verdict = evaluateWrite({
      filePath: `${repoRoot}/tests/unit/SaveSystem.test.ts`,
      repoRoot,
      approvedPatterns: [],
    });
    expect(verdict.allowed).toBe(true);
  });

  it('normalizes Windows backslash paths', () => {
    const verdict = evaluateWrite({
      filePath: 'C:\\Users\\Leo\\Desktop\\eldoria-v2\\.github\\workflows\\ci.yml',
      repoRoot,
      approvedPatterns: [],
    });
    expect(verdict.allowed).toBe(false);
  });

  it('allows a protected write when its pattern is owner-approved', () => {
    const verdict = evaluateWrite({
      filePath: `${repoRoot}/.github/workflows/ci.yml`,
      repoRoot,
      approvedPatterns: ['.github/workflows/**'],
    });
    expect(verdict.allowed).toBe(true);
  });

  it('approval for one surface does not unlock the other', () => {
    const verdict = evaluateWrite({
      filePath: `${repoRoot}/src/systems/SaveSystem.ts`,
      repoRoot,
      approvedPatterns: ['.github/workflows/**'],
    });
    expect(verdict.allowed).toBe(false);
  });

  it('allows paths outside the repository root', () => {
    const verdict = evaluateWrite({
      filePath: 'C:/some/other/place/.github/workflows/ci.yml',
      repoRoot,
      approvedPatterns: [],
    });
    expect(verdict.allowed).toBe(true);
  });
});

describe('parseApprovalFile', () => {
  it('extracts patterns, ignoring comments and blank lines', () => {
    const content = [
      '# owner approval for workflow edit, 2026-07-21',
      '',
      '.github/workflows/**',
      '  ',
      '# save surface stays locked',
    ].join('\n');
    expect(parseApprovalFile(content)).toEqual(['.github/workflows/**']);
  });

  it('returns empty list for empty or missing content', () => {
    expect(parseApprovalFile('')).toEqual([]);
    expect(parseApprovalFile(null)).toEqual([]);
  });
});
