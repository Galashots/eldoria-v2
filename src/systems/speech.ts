export type SpeechHooks = { onStart?: () => void; onEnd?: () => void };

export type SpeechSupport = {
  supported(): boolean;
  /** Cancels any active utterance, then speaks (rate 0.85, pitch 1.05). */
  speak(text: string, hooks?: SpeechHooks): void;
  cancel(): void;
};

type ActiveSpeech = {
  utterance: SpeechSynthesisUtterance;
  hooks?: SpeechHooks;
};

/**
 * Owns the game's single speech-synthesis slot. Ending, erroring, replacing,
 * and manually cancelling an utterance all converge on the same guarded
 * completion path, so callers can safely use onEnd to restore ducked music.
 */
export function createSpeechSupport(): SpeechSupport {
  let active: ActiveSpeech | undefined;

  const supported = (): boolean => typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && 'SpeechSynthesisUtterance' in window;

  const finish = (utterance: SpeechSynthesisUtterance): void => {
    if (active?.utterance !== utterance) return;
    const hooks = active.hooks;
    active = undefined;
    hooks?.onEnd?.();
  };

  const cancel = (): void => {
    const current = active;
    if (!current) return;

    // Clear first: some engines synchronously fire onend from cancel(). The
    // guarded handler then becomes a no-op and onEnd still runs exactly once.
    active = undefined;
    if (supported()) window.speechSynthesis.cancel();
    current.hooks?.onEnd?.();
  };

  const speak = (text: string, hooks?: SpeechHooks): void => {
    cancel();
    if (!supported()) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.pitch = 1.05;
    utterance.onend = () => finish(utterance);
    utterance.onerror = () => finish(utterance);
    active = { utterance, hooks };
    hooks?.onStart?.();

    try {
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      finish(utterance);
      throw error;
    }
  };

  return { supported, speak, cancel };
}
