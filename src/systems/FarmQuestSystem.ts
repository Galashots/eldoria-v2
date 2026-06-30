import { MIRA_FIRST_ERRAND, MIRA_SECOND_ERRAND } from '../data/quests';
import type { SaveState, StarterQuestStep } from './SaveSystem';

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
};

const defaultState = (): FarmQuestState => ({
  firstQuestStep: MIRA_FIRST_ERRAND.steps.talkToMira,
  secondErrandAccepted: false,
  secondErrandCharmFound: false,
  secondErrandComplete: false
});

export class FarmQuestSystem {
  private state: FarmQuestState;

  constructor(initialState: FarmQuestState = defaultState()) {
    this.state = { ...initialState };
  }

  static fromSave(saved: SaveState | null): FarmQuestSystem {
    return new FarmQuestSystem({
      firstQuestStep: saved?.firstQuestStep ?? MIRA_FIRST_ERRAND.steps.talkToMira,
      secondErrandAccepted: saved?.questFlags?.miraSecondErrandAccepted === true,
      secondErrandCharmFound: saved?.questFlags?.miraSecondErrandCharmFound === true,
      secondErrandComplete: saved?.questFlags?.miraSecondErrandComplete === true
    });
  }

  get firstQuestStep(): StarterQuestStep {
    return this.state.firstQuestStep;
  }

  currentObjective(): string {
    if (this.state.firstQuestStep !== MIRA_FIRST_ERRAND.steps.complete) {
      return MIRA_FIRST_ERRAND.objectives[this.state.firstQuestStep];
    }

    if (this.state.secondErrandComplete) return MIRA_SECOND_ERRAND.objectives.complete;
    if (this.state.secondErrandCharmFound) return MIRA_SECOND_ERRAND.objectives.returnToMira;
    return this.state.secondErrandAccepted
      ? MIRA_SECOND_ERRAND.objectives.investigate
      : MIRA_SECOND_ERRAND.objectives.available;
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
      this.state.firstQuestStep = MIRA_FIRST_ERRAND.steps.findSlime;
      return {
        stateChanged: true,
        objectiveChanged: true,
        message: MIRA_FIRST_ERRAND.progress.cropComplete
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

  setFirstQuestStepForTest(step: StarterQuestStep): void {
    this.state.firstQuestStep = step;
  }

  toSaveFields(): Pick<SaveState, 'firstQuestStep' | 'questFlags'> {
    return {
      firstQuestStep: this.state.firstQuestStep,
      questFlags: {
        miraFirstErrandComplete: this.state.firstQuestStep === MIRA_FIRST_ERRAND.steps.complete,
        miraSecondErrandAccepted: this.state.secondErrandAccepted,
        miraSecondErrandCharmFound: this.state.secondErrandCharmFound,
        miraSecondErrandComplete: this.state.secondErrandComplete
      }
    };
  }

  private interactWithMiraAfterFirstErrand(): FarmQuestOutcome {
    if (this.state.secondErrandComplete) {
      return this.unchanged(MIRA_SECOND_ERRAND.dialogue.complete);
    }

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

  private canDiscoverSecondErrandCharm(): boolean {
    return this.state.firstQuestStep === MIRA_FIRST_ERRAND.steps.complete
      && this.state.secondErrandAccepted
      && !this.state.secondErrandCharmFound
      && !this.state.secondErrandComplete;
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
