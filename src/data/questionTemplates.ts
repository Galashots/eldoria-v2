import type { AnswerValue, LearningPrompt, QuestionTemplate } from './curriculumMap';
import { pickRandom, randomInt, shuffled } from '../systems/random';

function shuffledChoices(answer: number, distractors: number[]): number[];
function shuffledChoices(answer: string, distractors: string[]): string[];
function shuffledChoices(answer: boolean, distractors: boolean[]): boolean[];
function shuffledChoices(answer: AnswerValue, distractors: AnswerValue[]): AnswerValue[] {
  const choices = Array.from(new Set([answer, ...distractors])).slice(0, 3);
  return shuffled(choices);
}

// A single non-math prompt's text/answer/hint content. Non-math skills don't
// have an obvious procedural-generation story the way "pick two numbers and
// add them" does, so variety instead comes from picking uniformly among a
// small hand-authored set each time the template fires — this is what turns
// "replay shows the literal same question" (docs/AUDIT_AND_GAME_PLAN_2026-07.md
// A3) into at least a few different questions per skill.
type TextVariant = {
  text: string;
  readAloudText?: string;
  answer: string;
  distractors: [string, string];
  hint: string;
  explanation: string;
};

function pickVariantPrompt(variants: readonly TextVariant[]): Omit<LearningPrompt, 'id' | 'band' | 'subject' | 'skill' | 'context' | 'rewardKind'> {
  const variant = pickRandom(variants);
  return {
    text: variant.text,
    readAloudText: variant.readAloudText,
    answer: variant.answer,
    choices: shuffledChoices(variant.answer, variant.distractors),
    hint: variant.hint,
    explanation: variant.explanation
  };
}

function contextReward(context: LearningPrompt['context'], fallback: LearningPrompt['rewardKind']): LearningPrompt['rewardKind'] {
  if (context === 'combat') return 'critical-hit';
  if (context === 'farm') return 'bonus-harvest';
  if (context === 'shop') return 'bonus-gold';
  return fallback;
}

export const QUESTION_TEMPLATES: QuestionTemplate[] = [
  {
    id: 'grade2-farm-subtraction-berries',
    band: 'grade2',
    subject: 'math',
    skill: 'subtraction',
    contexts: ['farm'],
    minDifficulty: 1,
    maxDifficulty: 3,
    makePrompt: ({ context }) => {
      const picked = randomInt(6, 18);
      const used = randomInt(1, Math.min(9, picked));
      const answer = picked - used;

      return {
        id: `${context}-grade2-subtraction-berries`,
        band: 'grade2',
        subject: 'math',
        skill: 'subtraction',
        context,
        text: `You picked ${picked} berries and used ${used}. How many are left?`,
        readAloudText: `You picked ${picked} berries and used ${used}. How many berries are left?`,
        answer,
        choices: shuffledChoices(answer, [answer + 1, answer + 2, Math.max(0, answer - 1)]),
        rewardKind: 'bonus-harvest',
        hint: 'Start with the berries picked, then count backward by the berries used.',
        explanation: `${picked} minus ${used} equals ${answer}.`
      };
    }
  },
  {
    id: 'grade2-combat-subtraction-shield',
    band: 'grade2',
    subject: 'math',
    skill: 'subtraction',
    contexts: ['combat'],
    minDifficulty: 1,
    maxDifficulty: 3,
    makePrompt: ({ context }) => {
      const shield = randomInt(7, 20);
      const spell = randomInt(2, Math.min(10, shield));
      const answer = shield - spell;

      return {
        id: `${context}-grade2-subtraction-shield`,
        band: 'grade2',
        subject: 'math',
        skill: 'subtraction',
        context,
        text: `The slime shield has ${shield}. Your spell removes ${spell}. What remains?`,
        readAloudText: `The slime shield has ${shield} points. Your spell removes ${spell}. How many shield points remain?`,
        answer,
        choices: shuffledChoices(answer, [answer + 1, answer + 2, Math.max(0, answer - 1)]),
        rewardKind: 'critical-hit',
        hint: 'Take away the spell amount from the shield amount.',
        explanation: `${shield} minus ${spell} equals ${answer}.`
      };
    }
  },
  {
    id: 'grade2-farm-place-value-basket',
    band: 'grade2',
    subject: 'math',
    skill: 'place-value',
    contexts: ['farm'],
    minDifficulty: 1,
    maxDifficulty: 3,
    makePrompt: ({ context }) => {
      const tens = randomInt(2, 8);
      const ones = randomInt(0, 9);
      const berries = tens * 10 + ones;

      return {
        id: `${context}-grade2-place-value-basket`,
        band: 'grade2',
        subject: 'math',
        skill: 'place-value',
        context,
        text: `A basket holds ${berries} berries. Which digit shows the tens?`,
        readAloudText: `A basket holds ${berries} berries. Which digit tells how many tens there are?`,
        answer: tens,
        choices: shuffledChoices(tens, [ones, Math.min(9, tens + 1), Math.max(0, tens - 1)]),
        rewardKind: 'bonus-harvest',
        hint: 'The tens digit is the first digit in a two-digit number.',
        explanation: `${berries} has ${tens} tens and ${ones} ones.`
      };
    }
  },
  {
    id: 'grade2-combat-addition-sparks',
    band: 'grade2',
    subject: 'math',
    skill: 'addition',
    contexts: ['combat'],
    minDifficulty: 1,
    maxDifficulty: 3,
    makePrompt: ({ context }) => {
      const sparks = randomInt(4, 10);
      const gained = randomInt(2, 9);
      const answer = sparks + gained;

      return {
        id: `${context}-grade2-addition-sparks`,
        band: 'grade2',
        subject: 'math',
        skill: 'addition',
        context,
        text: `Your wand has ${sparks} sparks and gains ${gained}. How many now?`,
        readAloudText: `Your wand has ${sparks} sparks and gains ${gained} more. How many sparks does it have now?`,
        answer,
        choices: shuffledChoices(answer, [answer + 1, answer + 2, Math.max(0, answer - 1)]),
        rewardKind: 'critical-hit',
        hint: 'Add the new sparks to the sparks already in the wand.',
        explanation: `${sparks} plus ${gained} equals ${answer}.`
      };
    }
  },
  {
    id: 'grade2-shop-addition-supplies',
    band: 'grade2',
    subject: 'math',
    skill: 'addition',
    contexts: ['shop', 'quest'],
    minDifficulty: 1,
    maxDifficulty: 3,
    makePrompt: ({ context }) => {
      const apples = randomInt(3, 14);
      const carrots = randomInt(2, 12);
      const answer = apples + carrots;

      return {
        id: `${context}-grade2-addition-supplies`,
        band: 'grade2',
        subject: 'math',
        skill: 'addition',
        context,
        text: `Mira packs ${apples} apples and ${carrots} carrots. How many snacks?`,
        readAloudText: `Mira packs ${apples} apples and ${carrots} carrots. How many snacks does she pack altogether?`,
        answer,
        choices: shuffledChoices(answer, [answer + 1, Math.max(0, answer - 1), answer + 2]),
        rewardKind: contextReward(context, 'bonus-gold'),
        hint: 'Add the two snack groups together.',
        explanation: `${apples} plus ${carrots} equals ${answer}.`
      };
    }
  },
  {
    id: 'grade2-quest-ela-story-detail',
    band: 'grade2',
    subject: 'ela',
    skill: 'reading-comprehension',
    contexts: ['quest', 'dialogue'],
    minDifficulty: 1,
    maxDifficulty: 3,
    makePrompt: ({ context }) => ({
      id: `${context}-grade2-story-detail`,
      band: 'grade2',
      subject: 'ela',
      skill: 'reading-comprehension',
      context,
      rewardKind: 'bonus-xp',
      ...pickVariantPrompt([
        {
          text: 'Mira says, "The fox hid under the log." Who hid?',
          readAloudText: 'Mira says, the fox hid under the log. Who hid?',
          answer: 'fox',
          distractors: ['log', 'Mira'],
          hint: 'Listen for the character doing the action.',
          explanation: 'The fox is the character that hid.'
        },
        {
          text: 'Mira says, "The bird built a nest in the tree." What did the bird build?',
          readAloudText: 'Mira says, the bird built a nest in the tree. What did the bird build?',
          answer: 'nest',
          distractors: ['tree', 'egg'],
          hint: 'Listen for the thing the bird made.',
          explanation: 'The bird built a nest.'
        },
        {
          text: 'Mira says, "The cat chased the mouse into the barn." Where did the mouse go?',
          readAloudText: 'Mira says, the cat chased the mouse into the barn. Where did the mouse go?',
          answer: 'barn',
          distractors: ['cat', 'garden'],
          hint: 'Listen for the place the mouse ran to.',
          explanation: 'The mouse ran into the barn.'
        }
      ])
    })
  },
  {
    id: 'grade2-crafting-science-materials',
    band: 'grade2',
    subject: 'science',
    skill: 'materials',
    contexts: ['crafting', 'quest'],
    minDifficulty: 1,
    maxDifficulty: 3,
    makePrompt: ({ context }) => ({
      id: `${context}-grade2-materials-suitability`,
      band: 'grade2',
      subject: 'science',
      skill: 'materials',
      context,
      rewardKind: 'bonus-xp',
      ...pickVariantPrompt([
        {
          text: 'Which material is strongest for a small bridge?',
          readAloudText: 'Which material is strongest for a small bridge?',
          answer: 'stone',
          distractors: ['paper', 'snow'],
          hint: 'A bridge needs a strong, sturdy material.',
          explanation: 'Stone is stronger and more suitable than paper or snow.'
        },
        {
          text: 'Which material floats best for a small boat?',
          readAloudText: 'Which material floats best for a small boat?',
          answer: 'wood',
          distractors: ['stone', 'iron'],
          hint: 'A boat needs a material light enough to float.',
          explanation: 'Wood floats, while stone and iron sink.'
        },
        {
          text: 'Which material keeps you warmest on a cold night?',
          readAloudText: 'Which material keeps you warmest on a cold night?',
          answer: 'wool',
          distractors: ['metal', 'glass'],
          hint: 'A cozy blanket needs a soft, warm material.',
          explanation: 'Wool traps warmth better than metal or glass.'
        }
      ])
    })
  },
  {
    id: 'grade2-quest-social-trade-transportation',
    band: 'grade2',
    subject: 'social',
    skill: 'trade-transportation',
    contexts: ['quest', 'exploration', 'dialogue'],
    minDifficulty: 1,
    maxDifficulty: 3,
    makePrompt: ({ context }) => ({
      id: `${context}-grade2-trade-transportation`,
      band: 'grade2',
      subject: 'social',
      skill: 'trade-transportation',
      context,
      rewardKind: 'bonus-xp',
      ...pickVariantPrompt([
        {
          text: 'A farmer trades apples for a new tool at the market. What does the farmer give away?',
          readAloudText: 'A farmer trades apples for a new tool at the market. What does the farmer give away?',
          answer: 'apples',
          distractors: ['tool', 'market'],
          hint: 'Trading means giving something to get something else.',
          explanation: 'The farmer gives apples and gets a tool in return.'
        },
        {
          text: 'A cart carries heavy sacks of grain from the farm to the village. What carries the grain?',
          readAloudText: 'A cart carries heavy sacks of grain from the farm to the village. What carries the grain?',
          answer: 'cart',
          distractors: ['well', 'fence'],
          hint: 'Think about what people use to move heavy things.',
          explanation: 'A cart is used to carry the grain to the village.'
        },
        {
          text: 'A bridge lets travelers cross the river. What does a bridge help people do?',
          readAloudText: 'A bridge lets travelers cross the river. What does a bridge help people do?',
          answer: 'cross the river',
          distractors: ['grow crops', 'bake bread'],
          hint: 'Think about what a bridge is built over.',
          explanation: 'A bridge helps travelers cross the river safely.'
        }
      ])
    })
  },
  {
    id: 'grade5-farm-area-rectangle',
    band: 'grade5',
    subject: 'math',
    skill: 'area-perimeter',
    contexts: ['farm'],
    minDifficulty: 1,
    maxDifficulty: 5,
    makePrompt: ({ context }) => {
      const length = randomInt(8, 24);
      const width = randomInt(4, 12);
      const answer = length * width;

      return {
        id: `${context}-grade5-area-rectangle`,
        band: 'grade5',
        subject: 'math',
        skill: 'area-perimeter',
        context,
        text: `A field is ${length} tiles long and ${width} tiles wide. What is its area?`,
        answer,
        choices: shuffledChoices(answer, [answer + length, answer + width, Math.max(0, answer - width)]),
        rewardKind: 'bonus-harvest',
        hint: 'Area of a rectangle is length times width.',
        explanation: `${length} × ${width} = ${answer} square tiles.`
      };
    }
  },
  {
    id: 'grade5-shop-decimal-estimate',
    band: 'grade5',
    subject: 'math',
    skill: 'decimals',
    contexts: ['shop'],
    minDifficulty: 2,
    maxDifficulty: 5,
    makePrompt: ({ context }) => {
      const price = randomInt(6, 18) + 0.75;
      const quantity = randomInt(2, 4);
      const answer = Math.round(price) * quantity;

      return {
        id: `${context}-grade5-decimal-estimate`,
        band: 'grade5',
        subject: 'math',
        skill: 'decimals',
        context,
        text: `A crystal costs about ${price.toFixed(2)} gold. You buy ${quantity}. Estimate the total.`,
        answer,
        choices: shuffledChoices(answer, [answer + quantity, Math.max(0, answer - quantity), answer + 10]),
        rewardKind: 'bonus-gold',
        hint: 'Round the price to the nearest whole gold, then multiply.',
        explanation: `${price.toFixed(2)} rounds to ${Math.round(price)}, and ${Math.round(price)} × ${quantity} = ${answer}.`
      };
    }
  },
  {
    id: 'grade5-farm-fractions-sunberry-rows',
    band: 'grade5',
    subject: 'math',
    skill: 'fractions',
    contexts: ['farm'],
    minDifficulty: 1,
    maxDifficulty: 5,
    makePrompt: ({ context }) => {
      const plantedRows = randomInt(2, 5);
      const totalRows = plantedRows * 4;

      return {
        id: `${context}-grade5-fractions-sunberry-rows`,
        band: 'grade5',
        subject: 'math',
        skill: 'fractions',
        context,
        text: `${plantedRows} of ${totalRows} garden rows have sunberries. What fraction is that in simplest form?`,
        answer: '1/4',
        choices: shuffledChoices('1/4', ['1/3', '3/4']),
        rewardKind: 'bonus-harvest',
        hint: `Divide both ${plantedRows} and ${totalRows} by ${plantedRows}.`,
        explanation: `${plantedRows}/${totalRows} simplifies to 1/4.`
      };
    }
  },
  {
    id: 'grade5-combat-science-energy-transfer',
    band: 'grade5',
    subject: 'science',
    skill: 'energy-resources',
    contexts: ['combat'],
    minDifficulty: 1,
    maxDifficulty: 5,
    makePrompt: ({ context }) => ({
      id: `${context}-grade5-energy-transfer-rune`,
      band: 'grade5',
      subject: 'science',
      skill: 'energy-resources',
      context,
      rewardKind: 'critical-hit',
      ...pickVariantPrompt([
        {
          text: 'A rune stores energy, then releases it to launch a stone. Which change best describes what happens?',
          answer: 'stored energy to motion',
          distractors: ['motion to stored energy', 'energy disappears'],
          hint: 'Compare the energy before and after the stone launches.',
          explanation: 'The rune transfers stored energy into the stone\'s motion.'
        },
        {
          text: 'A torch burns and lights up a dark room. Which change best describes what happens?',
          answer: 'chemical energy to light',
          distractors: ['light to chemical energy', 'energy disappears'],
          hint: 'Compare the torch before and after it is lit.',
          explanation: 'Burning releases chemical energy as light and heat.'
        },
        {
          text: 'A waterwheel spins and grinds grain into flour. Which change best describes what happens?',
          answer: 'motion to mechanical work',
          distractors: ['mechanical work to motion', 'energy disappears'],
          hint: 'Compare the water\'s motion to the wheel\'s work.',
          explanation: 'The water\'s motion energy becomes the wheel\'s grinding work.'
        }
      ])
    })
  },
  {
    id: 'grade5-combat-science-forces',
    band: 'grade5',
    subject: 'science',
    skill: 'forces-fluid-air',
    contexts: ['combat', 'quest'],
    minDifficulty: 1,
    maxDifficulty: 5,
    makePrompt: ({ context }) => ({
      id: `${context}-grade5-forces-buoyancy`,
      band: 'grade5',
      subject: 'science',
      skill: 'forces-fluid-air',
      context,
      rewardKind: contextReward(context, 'bonus-xp'),
      ...pickVariantPrompt([
        {
          text: 'Which force helps a floating shield stay up in water?',
          answer: 'buoyancy',
          distractors: ['drag', 'lift'],
          hint: 'Think about the upward force from water.',
          explanation: 'Buoyancy is the upward force that helps objects float in water.'
        },
        {
          text: 'Which force slows a rider gliding fast through the air?',
          answer: 'drag',
          distractors: ['buoyancy', 'lift'],
          hint: 'Think about the force air pushes back with.',
          explanation: 'Drag is the resistance force air applies against motion.'
        },
        {
          text: 'Which force pushes a glider\'s wings upward as air rushes past?',
          answer: 'lift',
          distractors: ['buoyancy', 'drag'],
          hint: 'Think about the force that keeps wings airborne.',
          explanation: 'Lift is the force that pushes wings upward through moving air.'
        }
      ])
    })
  },
  {
    id: 'grade5-quest-social-rivers',
    band: 'grade5',
    subject: 'social',
    skill: 'environment-civilization',
    contexts: ['quest', 'exploration'],
    minDifficulty: 1,
    maxDifficulty: 5,
    makePrompt: ({ context }) => ({
      id: `${context}-grade5-environment-civilization-rivers`,
      band: 'grade5',
      subject: 'social',
      skill: 'environment-civilization',
      context,
      rewardKind: 'bonus-xp',
      ...pickVariantPrompt([
        {
          text: 'Why did many ancient civilizations grow near rivers?',
          answer: 'water and trade',
          distractors: ['more snow', 'fewer crops'],
          hint: 'Rivers helped people farm, travel, and trade.',
          explanation: 'Rivers provided water, fertile land, transportation, and trade routes.'
        },
        {
          text: 'Why did many ancient villages build near coastlines?',
          answer: 'fishing and trade',
          distractors: ['colder weather', 'less farmland'],
          hint: 'Coastlines gave access to the sea for food and travel.',
          explanation: 'Coastlines offered fishing grounds and sea trade routes.'
        },
        {
          text: 'Why did some ancient cities grow up near mountains?',
          answer: 'stone and metal',
          distractors: ['warmer winters', 'faster travel'],
          hint: 'Mountains hold useful materials people can mine.',
          explanation: 'Mountains provided stone and metal for tools and building.'
        }
      ])
    })
  },
  {
    id: 'grade5-quest-ela-evidence',
    band: 'grade5',
    subject: 'ela',
    skill: 'reading-comprehension',
    contexts: ['quest', 'dialogue'],
    minDifficulty: 1,
    maxDifficulty: 5,
    makePrompt: ({ context }) => ({
      id: `${context}-grade5-evidence-village-danger`,
      band: 'grade5',
      subject: 'ela',
      skill: 'reading-comprehension',
      context,
      rewardKind: 'bonus-xp',
      ...pickVariantPrompt([
        {
          text: 'Which detail best proves the village is in danger?',
          answer: 'The warning bell rang all night.',
          distractors: ['The bakery opened early.', 'The fountain was clean.'],
          hint: 'Choose the detail that gives the strongest evidence of danger.',
          explanation: 'A warning bell ringing all night is evidence of danger.'
        },
        {
          text: 'Which detail best proves the harvest was excellent this year?',
          answer: 'The storehouses overflowed with grain.',
          distractors: ['The road was repaved in spring.', 'The well was painted blue.'],
          hint: 'Choose the detail that gives the strongest evidence of a big harvest.',
          explanation: 'Overflowing storehouses are direct evidence of a large harvest.'
        },
        {
          text: 'Which detail best proves the traveler was exhausted?',
          answer: 'He fell asleep before finishing dinner.',
          distractors: ['He wore a green traveling cloak.', 'He carried three old maps.'],
          hint: 'Choose the detail that gives the strongest evidence of tiredness.',
          explanation: 'Falling asleep before finishing a meal is evidence of exhaustion.'
        }
      ])
    })
  }
];
