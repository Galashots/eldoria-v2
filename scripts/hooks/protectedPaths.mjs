/**
 * Protected-path decision logic for the Claude Code PreToolUse hook.
 *
 * Pure functions only in this module body; the CLI entry point at the bottom
 * is the single I/O boundary. See scripts/hooks/README.md for the policy and
 * docs/MULTI_MODEL_OPERATING_GUIDE.md section 11 for the doctrine.
 */

export const PROTECTED_PATTERNS = ['.github/workflows/**', 'src/systems/SaveSystem*'];

function normalizeSlashes(p) {
  return String(p).replace(/\\/g, '/');
}

/**
 * Canonicalize a path: forward slashes, no "." segments, ".." resolved
 * against preceding segments. Pure string logic (no filesystem) so the
 * decision function stays testable and platform-independent. A ".." that
 * would climb past the first segment simply pops it — the result then
 * fails the root-prefix check and is treated as outside the repo.
 */
function canonicalize(p) {
  const segments = normalizeSlashes(p).split('/');
  const out = [];
  for (const segment of segments) {
    if (segment === '.' || (segment === '' && out.length > 0)) {
      continue;
    }
    if (segment === '..') {
      out.pop();
      continue;
    }
    out.push(segment);
  }
  return out.join('/');
}

/**
 * Returns the repo-relative path (forward slashes, "."/".."-resolved) or
 * null when the file is outside the repository root. The root-prefix
 * comparison is case-insensitive because Windows paths are.
 */
function toRepoRelative(filePath, repoRoot) {
  const file = canonicalize(filePath);
  const root = canonicalize(repoRoot).replace(/\/+$/, '');
  if (!file.toLowerCase().startsWith(`${root.toLowerCase()}/`)) {
    return null;
  }
  return file.slice(root.length + 1);
}

/**
 * Minimal glob support for exactly the two pattern shapes this policy uses:
 * a directory subtree ("dir/**") and a same-directory name prefix ("dir/Name*").
 *
 * Matching is case-insensitive everywhere: required for Windows filesystem
 * semantics, and on case-sensitive filesystems it only over-blocks unusual
 * spellings (fails closed), never under-blocks the protected files.
 */
function matchesPattern(relativePath, pattern) {
  const rel = relativePath.toLowerCase();
  const pat = pattern.toLowerCase();
  if (pat.endsWith('/**')) {
    const base = pat.slice(0, -3);
    return rel === base || rel.startsWith(`${base}/`);
  }
  if (pat.endsWith('*')) {
    const prefix = pat.slice(0, -1);
    return rel.startsWith(prefix) && !rel.slice(prefix.length).includes('/');
  }
  return rel === pat;
}

/**
 * Decide whether a write to filePath is allowed.
 * approvedPatterns are protected patterns the owner has explicitly unlocked
 * via the .owner-approval marker file.
 */
export function evaluateWrite({ filePath, repoRoot, approvedPatterns }) {
  const relativePath = toRepoRelative(filePath, repoRoot);
  if (relativePath === null) {
    return { allowed: true };
  }
  const protectedPattern = PROTECTED_PATTERNS.find((pattern) => matchesPattern(relativePath, pattern));
  if (!protectedPattern) {
    return { allowed: true };
  }
  if (approvedPatterns.includes(protectedPattern)) {
    return { allowed: true, protectedPattern };
  }
  return {
    allowed: false,
    protectedPattern,
    reason:
      `"${relativePath}" is owner-gated (${protectedPattern}). ` +
      'Writes require an explicit owner-approval marker: add the pattern to a ' +
      '.owner-approval file at the repo root after the owner authorizes the change.',
  };
}

/** Parse the .owner-approval marker file: one pattern per line, # comments. */
export function parseApprovalFile(content) {
  if (!content) {
    return [];
  }
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

// ---------------------------------------------------------------------------
// CLI entry point (Claude Code PreToolUse hook protocol): reads the tool-call
// JSON on stdin, exits 2 with a stderr message to block, 0 to allow.
// ---------------------------------------------------------------------------
const isMain = process.argv[1] && import.meta.url.endsWith(normalizeSlashes(process.argv[1]).split('/').pop());

if (isMain) {
  const { readFileSync, existsSync } = await import('node:fs');
  const { join } = await import('node:path');

  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    // Malformed or missing hook input is permitted to continue (this guardrail
    // is not the merge authority), but never silently: a protocol change that
    // stops parseable input arriving must be visible in hook logs.
    console.error('protectedPaths hook: unparseable stdin; allowing tool call (guardrail inactive for this call)');
    process.exit(0);
  }

  const repoRoot = process.env.CLAUDE_PROJECT_DIR ?? input.cwd;
  const filePath = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
  if (!repoRoot || !filePath) {
    process.exit(0);
  }

  const markerPath = join(repoRoot, '.owner-approval');
  const approvedPatterns = existsSync(markerPath)
    ? parseApprovalFile(readFileSync(markerPath, 'utf8'))
    : [];

  const verdict = evaluateWrite({ filePath, repoRoot, approvedPatterns });
  if (!verdict.allowed) {
    console.error(verdict.reason);
    process.exit(2);
  }
  process.exit(0);
}
