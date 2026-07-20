import { getQuestDefinition, QUEST_REGISTRY } from '../data/questDefs';
import type { SaveState } from './SaveSystem';

const BERRY_ORDER_ID = 'pell-berry-order';
const BERRY_FLAGS = [
  'pellBerryOrderBerry1',
  'pellBerryOrderBerry2',
  'pellBerryOrderBerry3'
] as const;

export class QuestSystem {
  private readonly questSteps: Record<string, string>;
  private readonly berryFlags: Record<(typeof BERRY_FLAGS)[number], boolean>;

  private constructor(
    questSteps: Record<string, string> = {},
    berryFlags: Record<(typeof BERRY_FLAGS)[number], boolean> = {
      pellBerryOrderBerry1: false,
      pellBerryOrderBerry2: false,
      pellBerryOrderBerry3: false
    }
  ) {
    this.questSteps = questSteps;
    this.berryFlags = berryFlags;
  }

  static fromSave(saved: SaveState | null): QuestSystem {
    const questSteps: Record<string, string> = {};
    for (const [questId, step] of Object.entries(saved?.questSteps ?? {})) {
      const definition = QUEST_REGISTRY[questId];
      if (definition?.engine === 'registry' && definition.steps.includes(step)) {
        questSteps[questId] = step;
      }
    }

    return new QuestSystem(questSteps, {
      pellBerryOrderBerry1: saved?.questFlags?.pellBerryOrderBerry1 === true,
      pellBerryOrderBerry2: saved?.questFlags?.pellBerryOrderBerry2 === true,
      pellBerryOrderBerry3: saved?.questFlags?.pellBerryOrderBerry3 === true
    });
  }

  step(questId: string): string {
    this.registryQuest(questId);
    return this.questSteps[questId] ?? 'not-started';
  }

  isActive(questId: string): boolean {
    const step = this.step(questId);
    return step !== 'not-started' && step !== 'complete';
  }

  isComplete(questId: string): boolean {
    return this.step(questId) === 'complete';
  }

  setStep(questId: string, step: string): void {
    const definition = this.registryQuest(questId);
    if (!definition.steps.includes(step)) {
      throw new Error(`Unknown step ${step} for quest ${questId}`);
    }
    this.questSteps[questId] = step;
  }

  berriesCollected(): number {
    return BERRY_FLAGS.filter((flag) => this.berryFlags[flag]).length;
  }

  collectNextBerry(): number {
    const nextFlag = BERRY_FLAGS.find((flag) => !this.berryFlags[flag]);
    if (nextFlag) this.berryFlags[nextFlag] = true;
    return this.berriesCollected();
  }

  toSaveFields(): Pick<SaveState, 'questSteps'> & { questFlags: Record<string, boolean> } {
    const questSteps = Object.fromEntries(
      Object.entries(this.questSteps).filter(([, step]) => step !== 'not-started')
    );
    const questFlags = Object.fromEntries(
      BERRY_FLAGS.filter((flag) => this.berryFlags[flag]).map((flag) => [flag, true])
    );
    return { questSteps, questFlags };
  }

  private registryQuest(questId: string) {
    const definition = getQuestDefinition(questId);
    if (definition.engine !== 'registry') {
      throw new Error(`Quest ${questId} is owned by ${definition.engine}`);
    }
    return definition;
  }
}
