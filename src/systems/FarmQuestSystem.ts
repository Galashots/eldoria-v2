import { MIRA_FIRST_ERRAND, MIRA_SECOND_ERRAND, MIRA_THIRD_ERRAND } from '../data/quests';
import type { InteractionId } from '../data/interactions';
import type { SaveState, StarterQuestStep } from './SaveSystem';

type SproutFlagKey = 'sprout1Awakened' | 'sprout2Awakened' | 'sprout3Awakened';

const SPROUT_FLAG_BY_ID: Partial<Record<InteractionId, SproutFlagKey>> = {
  'sprout-1': 'sprout1Awakened',
  'sprout-2': 'sprout2Awakened',
  'sprout-3': 'sprout3Awakened'
};

export type FarmQuestReward = {
  gold: number;
  item?: {
    key: string;
    name: string;
  };
};

export type FarmQuestOutcome = {
  stateChanged: boolean;
  objectiveChanged?: boolean;
  message?: string;
  toast?: string;
  reward?: FarmQuestReward;
  foundItem?: string;
};

export type FarmQuestState = {
  firstQuestStep: StarterQuestStep;
  secondErrandAccepted: boolean;
  secondErrandCharmFound: boolean;
  secondErrandComplete: boolean;
  thirdErrandAccepted: boolean;
  sprout1Awakened: boolean;
  sprout2Awakened: boolean;
  sprout3Awakened: boolean;
  thirdErrandComplete: boolean;
  practiceSlimeDefeated: boolean;
};

const defaultState = (): FarmQuestState => ({
  firstQuestStep: MIRA_FIRST_ERRAND.steps.talkToMira,
  secondErrandAccepted: false,
  secondErrandCharmFound: false,
  secondErrandComplete: false,
  thirdErrandAccepted: false,
  sprout1Awakened: false,
  sprout2Awakened: false,
  sprout3Awakened: false,
  thirdErrandComplete: false,
  practiceSlimeDefeated: false
});

export class FarmQuestSystem {
  private state: FarmQuestState;

  constructor(initialState: FarmQuestState = defaultState()) {
    this.state = { ...initialState };
  }

  static fromSave(saved: SaveState | null): FarmQuestSystem {
    const savedStep = saved?.firstQuestStep ?? MIRA_FIRST_ERRAND.steps.talkToMira;
    const practiceSlimeDefeated = saved?.questFlags?.practiceSlimeDefeated === true;

    return new FarmQuestSystem({
      // Soft-lock guard: a save written at the find-slime step with the slime
      // already permanently defeated (defeated mid-step, tab closed before the
      // prompt resolved) would otherwise point the player at a slime that no
      // longer exists. Normalize forward to return-to-mira — the defeat
      // happened, so the step's purpose is fulfilled.
      firstQuestStep: savedStep === MIRA_FIRST_ERRAND.steps.findSlime && practiceSlimeDefeated
        ? MIRA_FIRST_ERRAND.steps.returnToMira
        : savedStep,
      secondErrandAccepted: saved?.questFlags?.miraSecondErrandAccepted === true,
      secondErrandCharmFound: saved?.questFlags?.miraSecondErrandCharmFound === true,
      secondErrandComplete: saved?.questFlags?.miraSecondErrandComplete === true,
      thirdErrandAccepted: saved?.questFlags?.miraThirdErrandAccepted === true,
      sprout1Awakened: saved?.questFlags?.miraThirdErrandSprout1Awakened === true,
      sprout2Awakened: saved?.questFlags?.miraThirdErrandSprout2Awakened === true,
      sprout3Awakened: saved?.questFlags?.miraThirdErrandSprout3Awakened === true,
      thirdErrandComplete: saved?.questFlags?.miraThirdErrandComplete === true,
      // Missing flag (every pre-existing save) => false: the slime is present.
      practiceSlimeDefeated
    });
  }

  get firstQuestStep(): StarterQuestStep {
    return this.state.firstQuestStep;
  }

  currentObjective(): string {
    if (this.state.firstQuestStep !== MIRA_FIRST_ERRAND.steps.complete) {
      return MIRA_FIRST_ERRAND.objectives[this.state.firstQuestStep];
    }

    if (!this.state.secondErrandComplete) {
      if (this.state.secondErrandCharmFound) return MIRA_SECOND_ERRAND.objectives.returnToMira;
      return this.state.secondErrandAccepted
        ? MIRA_SECOND_ERRAND.objectives.investigate
        : MIRA_SECOND_ERRAND.objectives.available;
    }

    if (this.state.thirdErrandComplete) return MIRA_THIRD_ERRAND.objectives.complete;
    if (!this.state.thirdErrandAccepted) return MIRA_THIRD_ERRAND.objectives.available;

    const sproutsAwakened = this.sproutsAwakenedCount();
    return sproutsAwakened === MIRA_THIRD_ERRAND.totalSprouts
      ? MIRA_THIRD_ERRAND.objectives.returnToMira
      : MIRA_THIRD_ERRAND.objectives.inProgress(sproutsAwakened);
  }

  hintLabel(targetLabel: string): string {
    return targetLabel === MIRA_FIRST_ERRAND.targets.cropBonus && this.canDiscoverSecondErrandCharm()
      ? 'Check Scarecrow'
      : targetLabel;
  }

  interactWithMira(): FarmQuestOutcome {
    switch (this.state.firstQuestStep) {
      case MIRA_FIRST_ERRAND.steps.talkToMira:
        this.state.firstQuestStep = MIRA_FIRST_ERRAND.steps.tryCropBonus;
        return this.changed(MIRA_FIRST_ERRAND.dialogue.start);
      case MIRA_FIRST_ERRAND.steps.tryCropBonus:
        return this.unchanged(MIRA_FIRST_ERRAND.dialogue.cropReminder);
      case MIRA_FIRST_ERRAND.steps.findSlime:
        return this.unchanged(MIRA_FIRST_ERRAND.dialogue.slimeReminder);
      case MIRA_FIRST_ERRAND.steps.returnToMira:
        this.state.firstQuestStep = MIRA_FIRST_ERRAND.steps.complete;
        return {
          ...this.changed(MIRA_FIRST_ERRAND.completionToast),
          reward: {
            gold: MIRA_FIRST_ERRAND.rewards.gold,
            item: MIRA_FIRST_ERRAND.rewards.charm
          }
        };
      case MIRA_FIRST_ERRAND.steps.complete:
        return this.interactWithMiraAfterFirstErrand();
    }
  }

  completeCropInteraction(): FarmQuestOutcome {
    if (this.state.firstQuestStep === MIRA_FIRST_ERRAND.steps.tryCropBonus) {
      // Soft-lock guard: the Practice Slime encounter is strikeable at any
      // quest step, so it can already be permanently defeated before the
      // errand ever points at it. Route straight past find-slime in that
      // case — there is no slime left to find.
      const slimeAlreadyDone = this.state.practiceSlimeDefeated;
      this.state.firstQuestStep = slimeAlreadyDone
        ? MIRA_FIRST_ERRAND.steps.returnToMira
        : MIRA_FIRST_ERRAND.steps.findSlime;
      return {
        stateChanged: true,
        objectiveChanged: true,
        message: slimeAlreadyDone
          ? MIRA_FIRST_ERRAND.progress.cropCompleteSlimeAlreadyDefeated
          : MIRA_FIRST_ERRAND.progress.cropComplete
      };
    }

    if (this.canDiscoverSecondErrandCharm()) {
      this.state.secondErrandCharmFound = true;
      return {
        stateChanged: true,
        objectiveChanged: true,
        message: MIRA_SECOND_ERRAND.progress.discover,
        foundItem: MIRA_SECOND_ERRAND.storyItem.name
      };
    }

    return { stateChanged: false };
  }

  completeSlimeInteraction(): FarmQuestOutcome {
    if (this.state.firstQuestStep !== MIRA_FIRST_ERRAND.steps.findSlime) {
      return { stateChanged: false };
    }

    this.state.firstQuestStep = MIRA_FIRST_ERRAND.steps.returnToMira;
    return {
      stateChanged: true,
      objectiveChanged: true,
      message: MIRA_FIRST_ERRAND.progress.slimeComplete
    };
  }

  completeSproutInteraction(sproutId: InteractionId): FarmQuestOutcome {
    if (!this.state.thirdErrandAccepted || this.state.thirdErrandComplete) {
      return { stateChanged: false };
    }

    const flagKey = SPROUT_FLAG_BY_ID[sproutId];
    if (!flagKey || this.state[flagKey]) {
      return { stateChanged: false };
    }

    this.state[flagKey] = true;
    return {
      stateChanged: true,
      objectiveChanged: true,
      message: MIRA_THIRD_ERRAND.progress.sproutAwakened
    };
  }

  setFirstQuestStepForTest(step: StarterQuestStep): void {
    this.state.firstQuestStep = step;
  }

  /**
   * Records the Practice Slime's permanent defeat (the three-hit encounter
   * completed). Idempotent. Deliberately does not touch firstQuestStep:
   * during the find-slime step the prompt-close path still advances via
   * completeSlimeInteraction(), and outside it completeCropInteraction() /
   * fromSave() route past find-slime when this flag is set.
   */
  markPracticeSlimeDefeated(): void {
    this.state.practiceSlimeDefeated = true;
  }

  isPracticeSlimeDefeated(): boolean {
    return this.state.practiceSlimeDefeated;
  }

  toSaveFields(): Pick<SaveState, 'firstQuestStep' | 'questFlags'> {
    return {
      firstQuestStep: this.state.firstQuestStep,
      questFlags: {
        miraSecondErrandAccepted: this.state.secondErrandAccepted,
        miraSecondErrandCharmFound: this.state.secondErrandCharmFound,
        miraSecondErrandComplete: this.state.secondErrandComplete,
        miraThirdErrandAccepted: this.state.thirdErrandAccepted,
        miraThirdErrandSprout1Awakened: this.state.sprout1Awakened,
        miraThirdErrandSprout2Awakened: this.state.sprout2Awakened,
        miraThirdErrandSprout3Awakened: this.state.sprout3Awakened,
        miraThirdErrandComplete: this.state.thirdErrandComplete,
        practiceSlimeDefeated: this.state.practiceSlimeDefeated
      }
    };
  }

  private interactWithMiraAfterFirstErrand(): FarmQuestOutcome {
    if (!this.state.secondErrandComplete) {
      return this.interactWithMiraForSecondErrand();
    }

    return this.interactWithMiraForThirdErrand();
  }

  private interactWithMiraForSecondErrand(): FarmQuestOutcome {
    if (this.state.secondErrandCharmFound) {
      this.state.secondErrandAccepted = false;
      this.state.secondErrandCharmFound = false;
      this.state.secondErrandComplete = true;
      return {
        ...this.changed(
          `${MIRA_SECOND_ERRAND.dialogue.return}\n${MIRA_SECOND_ERRAND.completionToast}`
        ),
        reward: { gold: MIRA_SECOND_ERRAND.rewards.gold }
      };
    }

    if (!this.state.secondErrandAccepted) {
      this.state.secondErrandAccepted = true;
      return this.changed(MIRA_SECOND_ERRAND.dialogue.start);
    }

    return this.unchanged(MIRA_SECOND_ERRAND.dialogue.reminder);
  }

  private interactWithMiraForThirdErrand(): FarmQuestOutcome {
    if (this.state.thirdErrandComplete) {
      return this.unchanged(MIRA_THIRD_ERRAND.dialogue.complete);
    }

    // Require acceptance before a fully-awakened sprout set can complete the
    // errand, so a malformed/tampered save (sprout flags true, accepted
    // false) can't skip Mira's start dialogue and auto-complete on the next
    // interaction.
    if (this.state.thirdErrandAccepted && this.sproutsAwakenedCount() === MIRA_THIRD_ERRAND.totalSprouts) {
      this.state.thirdErrandComplete = true;
      return {
        ...this.changed(
          `${MIRA_THIRD_ERRAND.dialogue.return}\n${MIRA_THIRD_ERRAND.completionToast}`
        ),
        reward: {
          gold: MIRA_THIRD_ERRAND.rewards.gold,
          item: MIRA_THIRD_ERRAND.rewards.charm
        }
      };
    }

    if (!this.state.thirdErrandAccepted) {
      this.state.thirdErrandAccepted = true;
      return this.changed(MIRA_THIRD_ERRAND.dialogue.start);
    }

    return this.unchanged(MIRA_THIRD_ERRAND.dialogue.reminder);
  }

  private canDiscoverSecondErrandCharm(): boolean {
    return this.state.firstQuestStep === MIRA_FIRST_ERRAND.steps.complete
      && this.state.secondErrandAccepted
      && !this.state.secondErrandCharmFound
      && !this.state.secondErrandComplete;
  }

  private sproutsAwakenedCount(): number {
    return [this.state.sprout1Awakened, this.state.sprout2Awakened, this.state.sprout3Awakened]
      .filter(Boolean).length;
  }

  private changed(toast: string): FarmQuestOutcome {
    return {
      stateChanged: true,
      objectiveChanged: true,
      toast
    };
  }

  private unchanged(toast: string): FarmQuestOutcome {
    return {
      stateChanged: false,
      toast
    };
  }
}
