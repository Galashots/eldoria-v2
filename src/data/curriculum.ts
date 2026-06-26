import Phaser from 'phaser';
import type { PlayerProfile } from './profiles';

export type BonusContext = 'farm' | 'combat' | 'shop' | 'cooking' | 'quest';

export type RewardKind = 'bonus-harvest' | 'critical-hit' | 'bonus-gold' | 'bonus-xp';

export type LearningPrompt = {
  id: string;
  band: PlayerProfile['curriculumBand'];
  context: BonusContext;
  text: string;
  answer: number;
  choices: number[];
  rewardKind: RewardKind;
};

function shuffledChoices(answer: number, distractors: number[]): number[] {
  const choices = Array.from(new Set([answer, ...distractors.filter((n) => n >= 0)])).slice(0, 3);
  while (choices.length < 3) choices.push(answer + choices.length + 1);
  return choices.sort(() => Math.random() - 0.5);
}

export function makeLearningPrompt(profile: PlayerProfile, context: BonusContext): LearningPrompt {
  if (profile.curriculumBand === 'grade2') {
    const a = Phaser.Math.Between(3, 12);
    const b = Phaser.Math.Between(1, a);
    const answer = a - b;

    return {
      id: `${context}-grade2-subtraction`,
      band: 'grade2',
      context,
      text: `${a} − ${b} = ?`,
      answer,
      choices: shuffledChoices(answer, [answer + 1, answer + 2, answer - 1]),
      rewardKind: context === 'combat' ? 'critical-hit' : 'bonus-harvest'
    };
  }

  if (context === 'farm' || context === 'shop') {
    const rows = Phaser.Math.Between(2, 6);
    const cols = Phaser.Math.Between(2, 8);
    const answer = rows * cols;

    return {
      id: `${context}-grade5-area`,
      band: 'grade5',
      context,
      text: `${rows} rows × ${cols} crops = ?`,
      answer,
      choices: shuffledChoices(answer, [answer + rows, answer - cols, answer + cols]),
      rewardKind: 'bonus-harvest'
    };
  }

  const base = Phaser.Math.Between(20, 90);
  const bonus = Phaser.Math.Between(10, 80);
  const roundedBase = Math.round(base / 10) * 10;
  const roundedBonus = Math.round(bonus / 10) * 10;
  const answer = roundedBase + roundedBonus;

  return {
    id: `${context}-grade5-estimation`,
    band: 'grade5',
    context,
    text: `Estimate: ${base} + ${bonus}`,
    answer,
    choices: shuffledChoices(answer, [answer + 10, answer - 10, answer + 20]),
    rewardKind: context === 'combat' ? 'critical-hit' : 'bonus-gold'
  };
}
