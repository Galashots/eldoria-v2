import type { ProfileId } from '../data/profiles';

export type SaveState = {
  version: 1;
  profileId: ProfileId;
  gold: number;
  lastArea: string;
  player: {
    x: number;
    y: number;
  };
};

const SAVE_PREFIX = 'eldoria_v2_save_';

export class SaveSystem {
  static load(profileId: ProfileId): SaveState | null {
    try {
      const raw = localStorage.getItem(SAVE_PREFIX + profileId);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SaveState;
      return parsed.version === 1 ? parsed : null;
    } catch {
      return null;
    }
  }

  static save(state: SaveState): void {
    try {
      localStorage.setItem(SAVE_PREFIX + state.profileId, JSON.stringify(state));
    } catch {
      // Save failure should never interrupt gameplay.
    }
  }
}
