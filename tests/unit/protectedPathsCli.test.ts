// Spawned-process coverage for the hook's CLI boundary (PR #121 review
// amendment): verifies the actual stdin protocol, marker file I/O, and
// process exit codes — not just the pure decision function — and pins the
// committed settings to the portable exec-form invocation.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../..');
const hookScript = join(repoRoot, 'scripts', 'hooks', 'protectedPaths.mjs');

interface HookRun {
  status: number | null;
  stderr: string;
}

function runHook(input: string, projectDir: string): HookRun {
  const result = spawnSync(process.execPath, [hookScript], {
    input,
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
    timeout: 15000,
  });
  return { status: result.status, stderr: result.stderr };
}

function toolCall(filePath: string): string {
  return JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: filePath } });
}

describe('protectedPaths.mjs process boundary', () => {
  let scratchRepo: string | undefined;

  afterEach(() => {
    if (scratchRepo) {
      rmSync(scratchRepo, { recursive: true, force: true });
      scratchRepo = undefined;
    }
  });

  it('exits 2 with a reason on a protected write', () => {
    const run = runHook(toolCall(join(repoRoot, '.github', 'workflows', 'ci.yml')), repoRoot);
    expect(run.status).toBe(2);
    expect(run.stderr).toContain('owner-gated');
  });

  it('exits 0 on an ordinary write', () => {
    const run = runHook(toolCall(join(repoRoot, 'src', 'scenes', 'WorldScene.ts')), repoRoot);
    expect(run.status).toBe(0);
  });

  it('honours the .owner-approval marker for the listed pattern only', () => {
    scratchRepo = mkdtempSync(join(tmpdir(), 'hook-marker-'));
    writeFileSync(join(scratchRepo, '.owner-approval'), '# test\n.github/workflows/**\n');

    const unlocked = runHook(toolCall(join(scratchRepo, '.github', 'workflows', 'ci.yml')), scratchRepo);
    expect(unlocked.status).toBe(0);

    const stillLocked = runHook(toolCall(join(scratchRepo, 'src', 'systems', 'SaveSystem.ts')), scratchRepo);
    expect(stillLocked.status).toBe(2);
  });

  it('exits 0 on malformed input but emits a diagnostic', () => {
    const run = runHook('not json at all', repoRoot);
    expect(run.status).toBe(0);
    expect(run.stderr).toContain('protectedPaths');
  });
});

describe('committed hook registration', () => {
  it('uses the documented portable exec form (command + args, no shell string)', () => {
    const settings = JSON.parse(readFileSync(join(repoRoot, '.claude', 'settings.json'), 'utf8'));
    const hook = settings.hooks.PreToolUse[0].hooks[0];
    expect(hook.type).toBe('command');
    expect(hook.command).toBe('node');
    expect(hook.args).toEqual(['${CLAUDE_PROJECT_DIR}/scripts/hooks/protectedPaths.mjs']);
    expect(settings.hooks.PreToolUse[0].matcher).toBe('Edit|Write|NotebookEdit');
  });
});
