import type { CDPSession, Page } from '@playwright/test';
import { GAME_HEIGHT, GAME_WIDTH } from '../../src/gameDimensions';
import { CANVAS } from '../../tests/support/canvas';

/**
 * iPad Pro 11" device profile, forced onto Chromium.
 *
 * Real iPad Safari is WebKit, but WebKit under Playwright cannot drive CDP CPU
 * or network throttling — the two knobs this harness needs to approximate a
 * mobile thermal/perf envelope. So we emulate the iPad's viewport, DPR, touch,
 * and (spoofed) Mobile Safari UA on top of Chromium and throttle via CDP. This
 * is emulation, not physical-device validation, and the engine is Blink not
 * WebKit — see docs/IPAD_EMULATION.md for the honest scope of what this proves.
 */
export const IPAD_PRO_11 = {
  viewport: { width: 1194, height: 834 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ' +
    '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  defaultBrowserType: 'chromium' as const
};

/**
 * Documented performance budgets. Starting points from the build brief, tuned
 * to pass on GitHub-hosted runners with headroom. Re-tune by running the
 * journey 3x locally and 3x in CI and taking the worst observed value plus
 * ~30% margin; bump the number here (with a note) rather than silencing a real
 * regression.
 */
export const BUDGETS = {
  /**
   * Frame-pacing budgets under 4x CPU throttle.
   *
   * These are REGRESSION backstops, not a smoothness certification — under 4x
   * CPU throttle the achievable frame rate is dominated by the host CPU, and a
   * shared GitHub-hosted VM is much slower than a dev box. Physical-device
   * smoothness is owed separately (docs/IPAD_EMULATION.md). The gate must pass
   * on GitHub runners with headroom, so it is calibrated to CI, not local:
   *
   *   - Local (i7-7700, Chromium): p50 33.3 / p95 33.4 ms — Chromium's ~30 fps
   *     throttled cadence.
   *   - CI (GitHub 2-core VM): p50 49.9 / p95 50.1 ms — a stable ~20 fps cadence
   *     (both the first run and its retry were identical), i.e. the same game on
   *     a weaker host under the same 4x throttle.
   *
   * The primary gate is the median (catches any SUSTAINED slowdown); the p95 is
   * a lenient stutter backstop. Budgets sit ~30-60% over the CI baseline so VM
   * variance doesn't flake while a genuine ~1.5-2x regression still fails.
   * Re-tune by taking the worst CI p50 + ~30% and worst CI p95 + ~50%.
   */
  p50FrameMs: 65,
  p95FrameMs: 80,
  /** A frame slow enough for a player to feel as a hitch. Counted, and reported. */
  longFrameMs: 50,
  /**
   * JS heap growth (MB) from post-boot baseline to journey end. A steady leak
   * blows past this; normal texture/tween churn stays well under. Chromium-only
   * and coarse (performance.memory), so this is a leak SIGNAL, not a fuel gauge.
   */
  heapGrowthMb: 25,
  /**
   * Cold navigation -> interactive (canvas painted + Title ready) under CPU and
   * network throttle. Real iPad Safari is faster; this guards against a
   * pathological load regression, not micro-optimization.
   */
  coldLoadMs: 6000
};

/** CPU throttle rate applied during the journey and the cold-load probe. */
export const CPU_THROTTLE_RATE = 4;

/**
 * Network profile for the cold-load probe only. Roughly good-4G: enough to
 * download the ~390 KB gzipped bundle in well under a second so the budget is
 * dominated by parse/exec under CPU throttle, which is the mobile-relevant cost.
 */
export const COLD_LOAD_NETWORK = {
  offline: false,
  downloadThroughput: (12 * 1024 * 1024) / 8, // 12 Mbps
  uploadThroughput: (4 * 1024 * 1024) / 8,
  latency: 40
};

export async function throttleCpu(client: CDPSession, rate = CPU_THROTTLE_RATE): Promise<void> {
  await client.send('Emulation.setCPUThrottlingRate', { rate });
}

export async function throttleNetwork(client: CDPSession): Promise<void> {
  await client.send('Network.enable');
  await client.send('Network.emulateNetworkConditions', COLD_LOAD_NETWORK);
}

type FrameRecorder = {
  frames: { t: number; dt: number }[];
  startTime: number;
  startHeap: number;
  mark: number | null;
  baselineHeap: number | null;
};

declare global {
  interface Window {
    __ELDORIA_FRAME_RECORDER__?: FrameRecorder;
  }
}

/**
 * Install a browser-side rAF frame-time recorder that starts at page load and
 * runs for the whole journey. Following the suite's existing browser-side
 * recorder pattern: we never poll transient per-frame state from Node — the
 * page records everything and we read the aggregate once at the end.
 */
export async function installFrameRecorder(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const perf = performance as Performance & { memory?: { usedJSHeapSize: number } };
    const recorder: FrameRecorder = {
      frames: [],
      startTime: performance.now(),
      startHeap: perf.memory ? perf.memory.usedJSHeapSize : 0,
      mark: null,
      baselineHeap: null
    };
    window.__ELDORIA_FRAME_RECORDER__ = recorder;
    let last = performance.now();
    const tick = (now: number): void => {
      recorder.frames.push({ t: now, dt: now - last });
      last = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/**
 * Mark the steady-state baseline: called once the farm is entered, so frame and
 * heap budgets measure gameplay pacing rather than one-time boot/asset-decode.
 */
export async function markSteadyStateBaseline(page: Page): Promise<void> {
  await page.evaluate(() => {
    const rec = window.__ELDORIA_FRAME_RECORDER__;
    const perf = performance as Performance & { memory?: { usedJSHeapSize: number } };
    if (!rec) throw new Error('Frame recorder was not installed.');
    rec.mark = performance.now();
    rec.baselineHeap = perf.memory ? perf.memory.usedJSHeapSize : 0;
  });
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(rank, sorted.length) - 1];
}

export type FrameStats = {
  totalFrames: number;
  steadyFrames: number;
  journeyMs: number;
  p50FrameMs: number;
  p95FrameMs: number;
  maxFrameMs: number;
  longFrames: number;
  heapStartMb: number;
  heapBaselineMb: number;
  heapEndMb: number;
  heapGrowthMb: number;
};

/** Read the recorder and reduce it to the reportable/asserted statistics. */
export async function readFrameStats(page: Page, longFrameMs = BUDGETS.longFrameMs): Promise<FrameStats> {
  const raw = await page.evaluate(() => {
    const rec = window.__ELDORIA_FRAME_RECORDER__;
    const perf = performance as Performance & { memory?: { usedJSHeapSize: number } };
    if (!rec) throw new Error('Frame recorder was not installed.');
    return {
      frames: rec.frames,
      startTime: rec.startTime,
      mark: rec.mark,
      startHeap: rec.startHeap,
      baselineHeap: rec.baselineHeap,
      endHeap: perf.memory ? perf.memory.usedJSHeapSize : 0
    };
  });

  const mark = raw.mark ?? raw.startTime;
  // The first frame after any timestamp carries an inflated dt spanning the gap
  // before recording resumed; drop frames at/just after the mark by filtering
  // on t strictly greater than the mark.
  const steady = raw.frames.filter((f) => f.t > mark).map((f) => f.dt);
  const sorted = [...steady].sort((a, b) => a - b);
  const toMb = (bytes: number): number => Math.round((bytes / (1024 * 1024)) * 100) / 100;
  const lastT = raw.frames.length ? raw.frames[raw.frames.length - 1].t : mark;

  return {
    totalFrames: raw.frames.length,
    steadyFrames: steady.length,
    journeyMs: Math.round(lastT - mark),
    p50FrameMs: Math.round(percentile(sorted, 50) * 100) / 100,
    p95FrameMs: Math.round(percentile(sorted, 95) * 100) / 100,
    maxFrameMs: Math.round((sorted[sorted.length - 1] ?? 0) * 100) / 100,
    longFrames: steady.filter((dt) => dt > longFrameMs).length,
    heapStartMb: toMb(raw.startHeap),
    heapBaselineMb: toMb(raw.baselineHeap ?? raw.startHeap),
    heapEndMb: toMb(raw.endHeap),
    heapGrowthMb: toMb(raw.endHeap - (raw.baselineHeap ?? raw.startHeap))
  };
}

export type TouchTarget = { label: string; cssWidth: number; cssHeight: number };

/**
 * Walk every active scene's display list and return each pointer-interactive
 * canvas control with its on-screen size in CSS px. Handles both rectangular
 * (drawRoundedButton) and circular (ACTION) hit areas. Because Phaser's canvas
 * is letterboxed via Scale.FIT, one CSS-px-per-game-unit factor (derived from
 * the live canvas bounding box) converts hit-area game units to CSS px.
 */
export async function auditTouchTargets(page: Page): Promise<TouchTarget[]> {
  const box = await page.locator(CANVAS).boundingBox();
  if (!box) throw new Error('Canvas was not visible for the touch audit.');
  const cssPerGameUnit = box.width / GAME_WIDTH;

  const targets = await page.evaluate(() => {
    const game = window.__ELDORIA_GAME__;
    if (!game) throw new Error('Game handle was not exposed (needs __ELDORIA_E2E__).');

    const found: { label: string; wUnits: number; hUnits: number }[] = [];
    for (const scene of game.scene.getScenes(true)) {
      const children = (scene as unknown as { children?: { list?: unknown[] } }).children;
      const list = children?.list ?? [];
      for (const raw of list) {
        const obj = raw as {
          input?: { enabled?: boolean; hitArea?: { width?: number; height?: number; radius?: number } };
          scaleX?: number;
          scaleY?: number;
          type?: string;
          name?: string;
        };
        const hit = obj.input?.hitArea;
        if (!obj.input?.enabled || !hit) continue;
        const scaleX = obj.scaleX ?? 1;
        const scaleY = obj.scaleY ?? 1;
        let wUnits = 0;
        let hUnits = 0;
        if (typeof hit.width === 'number' && typeof hit.height === 'number') {
          wUnits = hit.width * scaleX;
          hUnits = hit.height * scaleY;
        } else if (typeof hit.radius === 'number') {
          wUnits = 2 * hit.radius * scaleX;
          hUnits = 2 * hit.radius * scaleY;
        } else {
          continue;
        }
        found.push({
          label: obj.name || `${scene.scene.key}:${obj.type ?? 'GameObject'}`,
          wUnits,
          hUnits
        });
      }
    }
    return found;
  });

  return targets.map((t) => ({
    label: t.label,
    cssWidth: Math.round(t.wUnits * cssPerGameUnit * 10) / 10,
    cssHeight: Math.round(t.hUnits * cssPerGameUnit * 10) / 10
  }));
}
