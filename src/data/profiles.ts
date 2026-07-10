export type ProfileId = 'grade2-mage' | 'grade5-adventurer';

export type PlayerProfile = {
  id: ProfileId;
  label: string;
  subtitle: string;
  readingMode: 'audio-first' | 'reader';
  curriculumBand: 'grade2' | 'grade5';
};

export const PROFILES: Record<ProfileId, PlayerProfile> = {
  'grade2-mage': {
    id: 'grade2-mage',
    label: 'Mage',
    subtitle: 'Audio-first spellcaster with charms and sparkle magic',
    readingMode: 'audio-first',
    curriculumBand: 'grade2'
  },
  'grade5-adventurer': {
    id: 'grade5-adventurer',
    label: 'Ranger Explorer',
    subtitle: 'Reader mode, clues, tracking, and tactical bonuses',
    readingMode: 'reader',
    curriculumBand: 'grade5'
  }
};

export const DEFAULT_PROFILE: ProfileId = 'grade5-adventurer';
