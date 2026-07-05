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

const THIRD_ERRAND_TOTAL_SPROUTS = 3;

type MiraSecondErrandDefinition = {
  id: string;
  name: string;
  objectives: {
    available: string;
    investigate: string;
    returnToMira: string;
    complete: string;
  };
  dialogue: {
    start: string;
    reminder: string;
    return: string;
    complete: string;
  };
  storyItem: {
    name: string;
  };
  progress: {
    discover: string;
  };
  completionToast: string;
  rewards: {
    gold: number;
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
    slimeReminder: 'Mira: The Practice Slime is east of the farm.'
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

type MiraThirdErrandDefinition = {
  id: string;
  name: string;
  totalSprouts: number;
  objectives: {
    available: string;
    inProgress: (awakened: number) => string;
    returnToMira: string;
    complete: string;
  };
  dialogue: {
    start: string;
    reminder: string;
    return: string;
    complete: string;
  };
  progress: {
    sproutAwakened: (awakened: number) => string;
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

export const MIRA_SECOND_ERRAND = {
  id: 'mira-second-errand',
  name: 'The Whispering Scarecrow',
  objectives: {
    available: 'Optional: Talk to Mira about the whispering scarecrow.',
    investigate: 'Optional: Check the scarecrow by the crop patch.',
    returnToMira: 'Optional: Bring the Moonseed Charm back to Mira.',
    complete: 'Optional errand complete: The Whispering Scarecrow.'
  },
  dialogue: {
    start: 'Mira: The old scarecrow whispers at night. It may be wind, but the crops feel uneasy. Check it for me.',
    reminder: 'Mira: Check the scarecrow by the crop patch.',
    return: 'Mira: A Moonseed Charm. Harmless, but old. Maybe the farm is closer to Eldoria\'s old magic than I thought.',
    complete: 'Mira: Keep listening. The farm may remember more old magic yet.'
  },
  storyItem: {
    name: 'Moonseed Charm'
  },
  progress: {
    discover: 'You found a Moonseed Charm beneath the scarecrow.'
  },
  completionToast: 'Optional Errand Complete: The Whispering Scarecrow',
  rewards: {
    gold: 4
  }
} as const satisfies MiraSecondErrandDefinition;

export const MIRA_THIRD_ERRAND = {
  id: 'mira-third-errand',
  name: 'The Sleepy Sprouts',
  totalSprouts: THIRD_ERRAND_TOTAL_SPROUTS,
  objectives: {
    available: 'Optional: Talk to Mira about the sleepy sprouts.',
    inProgress: (awakened: number) => `Optional: Wake the sleepy sprouts (${awakened}/${THIRD_ERRAND_TOTAL_SPROUTS}).`,
    returnToMira: 'Optional: Tell Mira the sprouts are awake.',
    complete: 'Optional errand complete: The Sleepy Sprouts.'
  },
  dialogue: {
    start: 'Mira: The Moonseed charm wasn\'t the only strange thing. Some sprouts in the crop rows have gone sleepy, like the old magic tired them out. Could you wake a few up?',
    reminder: 'Mira: The sleepy sprouts around the farm are still waiting to wake up.',
    return: 'Mira: All three awake? Good. The old magic stirs gently here. Nothing to fear, just... waking up.',
    complete: 'Mira: The sprouts hum softly now. Keep an eye on the farm. It\'s changing.'
  },
  progress: {
    sproutAwakened: (awakened: number) => `Sprout awakened! (${awakened}/${THIRD_ERRAND_TOTAL_SPROUTS})`
  },
  completionToast: 'Optional Errand Complete: The Sleepy Sprouts\nReceived: Wildbloom Sprig',
  rewards: {
    gold: 6,
    charm: {
      key: 'wildbloomSprig',
      name: 'Wildbloom Sprig'
    }
  }
} as const satisfies MiraThirdErrandDefinition;

export const CHARM_REGISTRY = [
  { key: MIRA_FIRST_ERRAND.rewards.charm.key, name: MIRA_FIRST_ERRAND.rewards.charm.name, emoji: '🍓' },
  { key: MIRA_THIRD_ERRAND.rewards.charm.key, name: MIRA_THIRD_ERRAND.rewards.charm.name, emoji: '🌱' }
] as const;
