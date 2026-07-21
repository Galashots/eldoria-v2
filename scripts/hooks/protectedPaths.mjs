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
 * Returns the repo-relative path (forward slashes) or null when the file
 * is outside the repository root. Comparison is case-insensitive because
 * Windows paths are.
 */
function toRepoRelative(filePath, repoRoot) {
  const file = normalizeSlashes(filePath);
  const root = normalizeSlashes(repoRoot).replace(/\/+$/, '');
  if (!file.toLowerCase().startsWith(`${root.toLowerCase()}/`)) {
    return null;
  }
  return file.slice(root.length + 1);
}

/**
 * Minimal glob support for exactly the two pattern shapes this policy uses:
 * a directory subtree ("dir/**") and a same-directory name prefix ("dir/Name*").
 */
function matchesPattern(relativePath, pattern) {
  if (pattern.endsWith('/**')) {
    const base = pattern.slice(0, -3);
    return relativePath === base || relativePath.startsWith(`${base}/`);
  }
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1);
    return relativePath.startsWith(prefix) && !relativePath.slice(prefix.length).includes('/');
  }
  return relativePath === pattern;
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
    process.exit(0); // Malformed input: never brick the session over the hook itself.
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
