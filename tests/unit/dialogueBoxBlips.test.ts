// Production-path integration test for read-aloud blips (Council #115 D5).
//
// The pure policy is covered in textBlips.test.ts; this file exercises the REAL
// DialogueBox reveal loop — open() → the scene-timer-driven per-character
// reveal → onTypewriterCharacter → the injected playBlip — and the ACTION
// early-completion path, which the extracted-emitter tests cannot prove.
//
// The vitest environment is `node` (no DOM) and DialogueBox imports Phaser, so
// we (1) shim a minimal `window` for the `__ELDORIA_E2E__` checks and (2) mock
// only Phaser's tiny runtime surface DialogueBox/uiHelpers touch (a geometry
// class, a math helper, and the SHUTDOWN event constant). The code under test —
// DialogueBox and uiHelpers — runs unmocked. The scene is a stub whose only
// real behavior is `time.addEvent`, so the test drives the reveal tick-by-tick.
import { beforeEach, describe, expect, it, vi } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).window = (globalThis as any).window ?? {};

vi.mock('phaser', () => {
  class Rectangle {
    constructor(public x = 0, public y = 0, public width = 0, public height = 0) {}
    static Contains(): boolean {
      return true;
    }
  }
  return {
    default: {
      Scenes: { Events: { SHUTDOWN: 'shutdown' } },
      Geom: { Rectangle },
      Math: { DegToRad: (deg: number): number => (deg * Math.PI) / 180 }
    }
  };
});

// Imported after the mock is registered (vi.mock is hoisted, so this is safe).
const { DialogueBox } = await import('../../src/presentation/DialogueBox');
const { computeBlipIndices } = await import('../../src/systems/textBlips');

type FakeTimer = { config: { callback: () => void }; removed: boolean; remove: () => void };

/** A recursive chainable stub: every property/read/call returns the stub. */
function chainStub(): unknown {
  const stub: unknown = new Proxy(function () { return stub; }, {
    get: (_t, prop) => {
      if (prop === 'then') return undefined; // not a thenable
      // Coerce to a harmless primitive when the code does math/string ops on a
      // stubbed GameObject field (e.g. `continueHint.y - sy(2)`).
      if (prop === Symbol.toPrimitive || prop === 'valueOf') return () => 0;
      if (prop === 'toString') return () => '';
      return stub;
    },
    apply: () => stub
  });
  return stub;
}

function makeScene(): { scene: unknown; timers: FakeTimer[] } {
  const timers: FakeTimer[] = [];
  const scene = {
    add: chainStub(),
    tweens: chainStub(),
    input: chainStub(),
    events: chainStub(),
    time: {
      now: 0,
      addEvent(config: { callback: () => void }): FakeTimer {
        const timer: FakeTimer = {
          config,
          removed: false,
          remove() {
            this.removed = true;
          }
        };
        timers.push(timer);
        return timer;
      }
    }
  };
  return { scene, timers };
}

function speechStub(supported: boolean): {
  supported: () => boolean;
  speak: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
} {
  return { supported: () => supported, speak: vi.fn(), cancel: vi.fn() };
}

/** Runs the active reveal timer to completion, returning the char indices at which a blip fired. */
function driveRevealCapturingBlipIndices(timer: FakeTimer, playBlip: ReturnType<typeof vi.fn>): number[] {
  const blipped: number[] = [];
  let prior = 0;
  // Each tick reveals one more char; the i-th tick (1-based) reveals char i-1.
  for (let tick = 1; !timer.removed && tick < 500; tick += 1) {
    timer.config.callback();
    if (playBlip.mock.calls.length > prior) {
      blipped.push(tick - 1);
      prior = playBlip.mock.calls.length;
    }
  }
  return blipped;
}

describe('DialogueBox read-aloud blips (production reveal path)', () => {
  beforeEach(() => {
    (globalThis as unknown as { window: Record<string, unknown> }).window.__ELDORIA_E2E__ = undefined;
  });

  it('fires playBlip on exactly the emitted glyphs of a non-TTS line (Ranger/manual)', () => {
    const { scene, timers } = makeScene();
    const playBlip = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const box = new DialogueBox(scene as any, { speech: speechStub(true), playBlip });

    // autoRead:false → lineVoiced=false even though speech is supported → blips carry the voice.
    box.open([{ speaker: 'Pell', text: 'Hello there' }], { autoRead: false });
    const blipped = driveRevealCapturingBlipIndices(timers.at(-1)!, playBlip);

    expect(blipped).toEqual([...computeBlipIndices('Hello there')].sort((a, b) => a - b));
    expect(playBlip.mock.calls.length).toBeGreaterThan(0);
  });

  it('suppresses every blip when auto-read voices the line (Mage TTS = the voice)', () => {
    const { scene, timers } = makeScene();
    const playBlip = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const box = new DialogueBox(scene as any, { speech: speechStub(true), playBlip });

    // autoRead:true AND speech supported → lineVoiced=true → emitter created empty.
    box.open([{ speaker: 'Pell', text: 'Hello there' }], { autoRead: true });
    driveRevealCapturingBlipIndices(timers.at(-1)!, playBlip);

    expect(playBlip).not.toHaveBeenCalled();
  });

  it('still blips when auto-read is requested but speech is unavailable', () => {
    const { scene, timers } = makeScene();
    const playBlip = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const box = new DialogueBox(scene as any, { speech: speechStub(false), playBlip });

    // autoRead:true but supported()=false → lineVoiced=false → blips carry the voice.
    box.open([{ speaker: 'Pell', text: 'Hello there' }], { autoRead: true });
    const blipped = driveRevealCapturingBlipIndices(timers.at(-1)!, playBlip);

    expect(blipped).toEqual([...computeBlipIndices('Hello there')].sort((a, b) => a - b));
  });

  it('stops emitting once ACTION completes the line early — no blips for unrevealed glyphs', () => {
    const { scene, timers } = makeScene();
    const playBlip = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const box = new DialogueBox(scene as any, { speech: speechStub(true), playBlip });

    box.open([{ speaker: 'Pell', text: 'Hello there' }], { autoRead: false });
    const timer = timers.at(-1)!;

    // Reveal only the first 4 chars ("Hell"), then the child taps ACTION.
    for (let i = 0; i < 4; i += 1) timer.config.callback();
    const blipsBeforeAction = playBlip.mock.calls.length;
    expect(blipsBeforeAction).toBeGreaterThan(0); // proves reveals were happening

    box.advance(); // isTyping → completeTyping → stopTyping (removes the real timer)

    expect(timer.removed).toBe(true); // the production loop actually stopped
    // The remaining glyphs are painted in one shot with no per-char reveal, so
    // no further blips fire even though the line has more emit indices past #4.
    const emittedTotal = computeBlipIndices('Hello there').size;
    expect(blipsBeforeAction).toBeLessThan(emittedTotal);
    expect(playBlip.mock.calls.length).toBe(blipsBeforeAction);
  });

  it('creates no emitter (never blips) when playBlip is not injected', () => {
    const { scene, timers } = makeScene();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const box = new DialogueBox(scene as any, { speech: speechStub(true) });
    box.open([{ speaker: 'Pell', text: 'Hello there' }], { autoRead: false });
    // Should complete the reveal without throwing and with no blip side effects.
    expect(() => driveRevealCapturingBlipIndices(timers.at(-1)!, vi.fn())).not.toThrow();
  });
});
