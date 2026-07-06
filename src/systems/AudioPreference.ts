const AUDIO_MUTED_KEY = 'eldoria_v2_audio_muted';

/** Audio defaults to on; this only persists an explicit mute choice. */
export function loadAudioMuted(): boolean {
  try {
    return localStorage.getItem(AUDIO_MUTED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveAudioMuted(muted: boolean): void {
  try {
    localStorage.setItem(AUDIO_MUTED_KEY, String(muted));
  } catch {
    // Muting is a convenience preference, not game state; a storage
    // failure here should never interrupt gameplay.
  }
}
