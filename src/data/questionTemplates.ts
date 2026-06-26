import Phaser from 'phaser';
import type { AnswerValue, LearningPrompt, QuestionTemplate } from './curriculumMap';

function shuffledChoices(answer: number, distractors: number[]): number[];
function shuffledChoices(answer: string, distractors: string[]): string[];
function shuffledChoices(answer: boolean, distractors: boolean[]): boolean[];
function shuffledChoices(answer: AnswerValue, distractors: AnswerValue[]): AnswerValue[] {
  const choices = Array.from(new Set([answer, ...distractors])).slice(0, 3);
  return choices.sort(() => Math.random() - 0.5);
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
      const picked = Phaser.Math.Between(6, 18);
      const used = Phaser.Math.Between(1, Math.min(9, picked));
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
      const shield = Phaser.Math.Between(7, 20);
      const spell = Phaser.Math.Between(2, Math.min(10, shield));
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
    id: 'grade2-shop-addition-supplies',
    band: 'grade2',
    subject: 'math',
    skill: 'addition',
    contexts: ['shop', 'quest'],
    minDifficulty: 1,
    maxDifficulty: 3,
    makePrompt: ({ context }) => {
      const apples = Phaser.Math.Between(3, 14);
      const carrots = Phaser.Math.Between(2, 12);
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
      text: 'Mira says, "The fox hid under the log." Who hid?',
      readAloudText: 'Mira says, the fox hid under the log. Who hid?',
      answer: 'fox',
      choices: shuffledChoices('fox', ['log', 'Mira']),
      rewardKind: 'bonus-xp',
      hint: 'Listen for the character doing the action.',
      explanation: 'The fox is the character that hid.'
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
      id: `${context}-grade2-materials-bridge`,
      band: 'grade2',
      subject: 'science',
      skill: 'materials',
      context,
      text: 'Which material is strongest for a small bridge?',
      readAloudText: 'Which material is strongest for a small bridge?',
      answer: 'stone',
      choices: shuffledChoices('stone', ['paper', 'snow']),
      rewardKind: 'bonus-xp',
      hint: 'A bridge needs a strong, sturdy material.',
      explanation: 'Stone is stronger and more suitable than paper or snow.'
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
      const length = Phaser.Math.Between(8, 24);
      const width = Phaser.Math.Between(4, 12);
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
      const price = Phaser.Math.Between(6, 18) + 0.75;
      const quantity = Phaser.Math.Between(2, 4);
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
      text: 'Which force helps a floating shield stay up in water?',
      answer: 'buoyancy',
      choices: shuffledChoices('buoyancy', ['drag', 'friction']),
      rewardKind: contextReward(context, 'bonus-xp'),
      hint: 'Think about the upward force from water.',
      explanation: 'Buoyancy is the upward force that helps objects float in water.'
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
      text: 'Why did many ancient civilizations grow near rivers?',
      answer: 'water and trade',
      choices: shuffledChoices('water and trade', ['more snow', 'fewer crops']),
      rewardKind: 'bonus-xp',
      hint: 'Rivers helped people farm, travel, and trade.',
      explanation: 'Rivers provided water, fertile land, transportation, and trade routes.'
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
      text: 'Which detail best proves the village is in danger?',
      answer: 'The warning bell rang all night.',
      choices: shuffledChoices('The warning bell rang all night.', ['The bakery opened early.', 'The fountain was clean.']),
      rewardKind: 'bonus-xp',
      hint: 'Choose the detail that gives the strongest evidence of danger.',
      explanation: 'A warning bell ringing all night is evidence of danger.'
    })
  }
];
