import type { StarterQuestStep } from '../systems/SaveSystem';

type MiraFirstErrandDefinition = {
  id: string;
  name: string;
  steps: {
    talkToMira: StarterQuestStep;
    tryCropBonus: StarterQuestStep;
    findSlime: StarterQuestStep;
    returnToMira: StarterQuestStep;
    complete: StarterQuestStep;
  };
  objectives: Record<StarterQuestStep, string>;
  targets: {
    mira: string;
    cropBonus: string;
    practiceSlime: string;
  };
  dialogue: {
    start: string;
    cropReminder: string;
    slimeReminder: string;
    complete: string;
  };
  progress: {
    cropComplete: string;
    slimeComplete: string;
  };
  completionToast: string;
  rewards: {
    gold: number;
    charm: {
      key: string;
      name: string;
    };
  };
};

export const MIRA_FIRST_ERRAND = {
  id: 'mira-first-errand',
  name: 'Mira\'s First Errand',
  steps: {
    talkToMira: 'talk-to-mira',
    tryCropBonus: 'try-crop-bonus',
    findSlime: 'find-slime',
    returnToMira: 'return-to-mira',
    complete: 'complete'
  },
  objectives: {
    'talk-to-mira': 'Talk to Mira near the path.',
    'try-crop-bonus': 'Check the crop patch and try an optional bonus.',
    'find-slime': 'Find the Practice Slime and test a combat bonus.',
    'return-to-mira': 'Return to Mira for your reward.',
    complete: 'Mira\'s first errand complete. Keep exploring.'
  },
  targets: {
    mira: 'Mira',
    cropBonus: 'CropBonus',
    practiceSlime: 'Practice Slime'
  },
  dialogue: {
    start: 'Mira: Check the crop patch for a bonus!',
    cropReminder: 'Mira: The crop patch is southwest of here.',
    slimeReminder: 'Mira: The Practice Slime is east of the farm.',
    complete: 'Mira: Great work. Keep exploring Eldoria!'
  },
  progress: {
    cropComplete: 'Objective updated: find the Practice Slime.',
    slimeComplete: 'Practice complete. Return to Mira.'
  },
  completionToast: 'Quest Complete: Mira\'s First Errand\nReceived: Sunberry Charm',
  rewards: {
    gold: 10,
    charm: {
      key: 'sunberryCharm',
      name: 'Sunberry Charm'
    }
  }
} as const satisfies MiraFirstErrandDefinition;
