# Content Schema Notes

These are intentionally simple starter shapes. Keep them stable until there is a real need to expand.

## Profile

```ts
type Profile = {
  id: 'grade2-mage' | 'grade5-adventurer';
  label: string;
  readingMode: 'audio-first' | 'reader';
  curriculumBand: 'grade2' | 'grade5';
};
```

## Curriculum prompt

```ts
type LearningPrompt = {
  id: string;
  band: 'grade2' | 'grade5';
  context: 'farm' | 'combat' | 'shop' | 'cooking' | 'quest';
  text: string;
  answer: number;
  choices: number[];
  rewardKind: 'bonus-harvest' | 'critical-hit' | 'bonus-gold' | 'bonus-xp';
};
```

## Tiled object conventions

Object layer name: `Objects`

Recommended object names/types:

- `PlayerSpawn`
- `Mira` / `npc`
- `CropBonus` / `bonus`
- `PracticeSlime` / `enemy`
- `ExitTown` / `exit`

Use custom properties for `targetArea`, `dialogueId`, `enemyId`, `bonusContext`, etc.
