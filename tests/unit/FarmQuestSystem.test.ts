import { describe, expect, it } from 'vitest';
import { FarmQuestSystem } from '../../src/systems/FarmQuestSystem';
import { MIRA_FIRST_ERRAND } from '../../src/data/quests';
import type { SaveState } from '../../src/systems/SaveSystem';
import { CURRENT_SAVE_VERSION } from '../../src/systems/SaveSystem';

const baseSave = (overrides: Partial<SaveState> = {}): SaveState => ({
  version: CURRENT_SAVE_VERSION,
  profileId: 'grade2-mage',
  gold: 0,
  lastArea: 'farm',
  player: { x: 0, y: 0 },
  ...overrides
});

describe('practiceSlimeDefeated persistence', () => {
  it('defaults to false when the flag is missing (every pre-existing save)', () => {
    const quest = FarmQuestSystem.fromSave(baseSave());
    expect(quest.isPracticeSlimeDefeated()).toBe(false);
    expect(quest.toSaveFields().questFlags.practiceSlimeDefeated).toBe(false);
  });

  it('defaults to false with no save at all', () => {
    expect(FarmQuestSystem.fromSave(null).isPracticeSlimeDefeated()).toBe(false);
  });

  it('round-trips true through toSaveFields and fromSave', () => {
    const quest = FarmQuestSystem.fromSave(baseSave());
    quest.markPracticeSlimeDefeated();
    expect(quest.isPracticeSlimeDefeated()).toBe(true);

    const reloaded = FarmQuestSystem.fromSave(baseSave(quest.toSaveFields()));
    expect(reloaded.isPracticeSlimeDefeated()).toBe(true);
    expect(reloaded.toSaveFields().questFlags.practiceSlimeDefeated).toBe(true);
  });

  it('is idempotent', () => {
    const quest = FarmQuestSystem.fromSave(baseSave());
    quest.markPracticeSlimeDefeated();
    quest.markPracticeSlimeDefeated();
    expect(quest.isPracticeSlimeDefeated()).toBe(true);
  });
});

describe('practice slime defeat soft-lock guards', () => {
  it('does not advance the quest step when the flag is marked outside find-slime', () => {
    const quest = FarmQuestSystem.fromSave(baseSave());
    quest.markPracticeSlimeDefeated();
    expect(quest.firstQuestStep).toBe(MIRA_FIRST_ERRAND.steps.talkToMira);
  });

  it('still advances find-slime -> return-to-mira via completeSlimeInteraction after defeat', () => {
    const quest = FarmQuestSystem.fromSave(baseSave({
      firstQuestStep: MIRA_FIRST_ERRAND.steps.findSlime
    }));
    quest.markPracticeSlimeDefeated();

    const outcome = quest.completeSlimeInteraction();
    expect(outcome.stateChanged).toBe(true);
    expect(outcome.message).toBe(MIRA_FIRST_ERRAND.progress.slimeComplete);
    expect(quest.firstQuestStep).toBe(MIRA_FIRST_ERRAND.steps.returnToMira);
  });

  it('routes crop completion past find-slime when the slime was already defeated', () => {
    const quest = FarmQuestSystem.fromSave(baseSave({
      firstQuestStep: MIRA_FIRST_ERRAND.steps.tryCropBonus,
      questFlags: { practiceSlimeDefeated: true }
    }));

    const outcome = quest.completeCropInteraction();
    expect(outcome.stateChanged).toBe(true);
    expect(outcome.message).toBe(MIRA_FIRST_ERRAND.progress.cropCompleteSlimeAlreadyDefeated);
    expect(quest.firstQuestStep).toBe(MIRA_FIRST_ERRAND.steps.returnToMira);
  });

  it('crop completion still targets find-slime when the slime is alive', () => {
    const quest = FarmQuestSystem.fromSave(baseSave({
      firstQuestStep: MIRA_FIRST_ERRAND.steps.tryCropBonus
    }));

    const outcome = quest.completeCropInteraction();
    expect(outcome.message).toBe(MIRA_FIRST_ERRAND.progress.cropComplete);
    expect(quest.firstQuestStep).toBe(MIRA_FIRST_ERRAND.steps.findSlime);
  });

  it('normalizes a loaded find-slime save with a defeated slime forward to return-to-mira', () => {
    const quest = FarmQuestSystem.fromSave(baseSave({
      firstQuestStep: MIRA_FIRST_ERRAND.steps.findSlime,
      questFlags: { practiceSlimeDefeated: true }
    }));

    expect(quest.firstQuestStep).toBe(MIRA_FIRST_ERRAND.steps.returnToMira);
    expect(quest.isPracticeSlimeDefeated()).toBe(true);
  });

  it('leaves a loaded find-slime save untouched when the slime is alive', () => {
    const quest = FarmQuestSystem.fromSave(baseSave({
      firstQuestStep: MIRA_FIRST_ERRAND.steps.findSlime
    }));

    expect(quest.firstQuestStep).toBe(MIRA_FIRST_ERRAND.steps.findSlime);
  });
});

describe('post-purpose interaction predicates', () => {
  it('crop purpose is not fulfilled before or during the crop step', () => {
    expect(FarmQuestSystem.fromSave(baseSave({
      firstQuestStep: MIRA_FIRST_ERRAND.steps.talkToMira
    })).cropPurposeFulfilled()).toBe(false);
    expect(FarmQuestSystem.fromSave(baseSave({
      firstQuestStep: MIRA_FIRST_ERRAND.steps.tryCropBonus
    })).cropPurposeFulfilled()).toBe(false);
  });

  it('crop purpose is fulfilled once the crop step is behind us', () => {
    expect(FarmQuestSystem.fromSave(baseSave({
      firstQuestStep: MIRA_FIRST_ERRAND.steps.findSlime
    })).cropPurposeFulfilled()).toBe(true);
    expect(FarmQuestSystem.fromSave(baseSave({
      firstQuestStep: MIRA_FIRST_ERRAND.steps.complete
    })).cropPurposeFulfilled()).toBe(true);
  });

  it('a pending scarecrow charm discovery reclaims the crop patch for the quest', () => {
    const quest = FarmQuestSystem.fromSave(baseSave({
      firstQuestStep: MIRA_FIRST_ERRAND.steps.complete,
      questFlags: { miraSecondErrandAccepted: true }
    }));

    expect(quest.cropPurposeFulfilled()).toBe(false);

    // After the charm is found, the crop patch goes back to flavor.
    quest.completeCropInteraction();
    expect(quest.cropPurposeFulfilled()).toBe(true);
  });

  it('sprout purpose and all-errands both track third-errand completion', () => {
    const before = FarmQuestSystem.fromSave(baseSave({
      firstQuestStep: MIRA_FIRST_ERRAND.steps.complete,
      questFlags: {
        miraSecondErrandComplete: true,
        miraThirdErrandAccepted: true,
        miraThirdErrandSprout1Awakened: true,
        miraThirdErrandSprout2Awakened: true,
        miraThirdErrandSprout3Awakened: true
      }
    }));
    expect(before.sproutPurposeFulfilled()).toBe(false);
    expect(before.allErrandsComplete()).toBe(false);

    // Turning in the errand at Mira completes it.
    before.interactWithMira();
    expect(before.sproutPurposeFulfilled()).toBe(true);
    expect(before.allErrandsComplete()).toBe(true);
  });
});
