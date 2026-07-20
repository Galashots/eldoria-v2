import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSpeechSupport } from '../../src/systems/speech';

class FakeUtterance {
  readonly text: string;
  rate = 1;
  pitch = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

function installSpeechStubs() {
  const spoken: FakeUtterance[] = [];
  const cancel = vi.fn();
  const speak = vi.fn((utterance: FakeUtterance) => spoken.push(utterance));
  vi.stubGlobal('window', {
    SpeechSynthesisUtterance: FakeUtterance,
    speechSynthesis: { cancel, speak }
  });
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  return { spoken, cancel, speak };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createSpeechSupport', () => {
  it('reports unsupported speech without browser APIs', () => {
    vi.stubGlobal('window', {});
    const speech = createSpeechSupport();
    expect(speech.supported()).toBe(false);
    expect(() => speech.speak('hello')).not.toThrow();
  });

  it('speaks with the shared rate and pitch and runs lifecycle hooks', () => {
    const { spoken } = installSpeechStubs();
    const onStart = vi.fn();
    const onEnd = vi.fn();
    const speech = createSpeechSupport();

    speech.speak('hello', { onStart, onEnd });
    expect(spoken).toHaveLength(1);
    expect(spoken[0]).toMatchObject({ text: 'hello', rate: 0.85, pitch: 1.05 });
    expect(onStart).toHaveBeenCalledOnce();
    spoken[0]?.onend?.();
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it('replacing speech cancels and completes the previous utterance once', () => {
    const { spoken, cancel } = installSpeechStubs();
    const firstEnd = vi.fn();
    const secondEnd = vi.fn();
    const speech = createSpeechSupport();

    speech.speak('first', { onEnd: firstEnd });
    const first = spoken[0];
    speech.speak('second', { onEnd: secondEnd });

    expect(cancel).toHaveBeenCalledOnce();
    expect(firstEnd).toHaveBeenCalledOnce();
    first?.onend?.();
    expect(firstEnd).toHaveBeenCalledOnce();
    expect(secondEnd).not.toHaveBeenCalled();
  });

  it('manual cancellation restores once even if a late end event arrives', () => {
    const { spoken, cancel } = installSpeechStubs();
    const onEnd = vi.fn();
    const speech = createSpeechSupport();

    speech.speak('hello', { onEnd });
    const utterance = spoken[0];
    speech.cancel();
    speech.cancel();
    utterance?.onend?.();

    expect(cancel).toHaveBeenCalledOnce();
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it('uses the same completion path for synthesis errors', () => {
    const { spoken } = installSpeechStubs();
    const onEnd = vi.fn();
    const speech = createSpeechSupport();

    speech.speak('hello', { onEnd });
    spoken[0]?.onerror?.();
    spoken[0]?.onend?.();
    expect(onEnd).toHaveBeenCalledOnce();
  });
});
