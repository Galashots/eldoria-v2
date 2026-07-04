import { describe, expect, it } from 'vitest';
import { QuestionEngine } from '../../src/systems/QuestionEngine';
import { QUESTION_TEMPLATES } from '../../src/data/questionTemplates';
import { PROFILES } from '../../src/data/profiles';
import type { PlayerProfile } from '../../src/data/profiles';

const grade2Profile = PROFILES['grade2-mage'];
const grade5Profile = PROFILES['grade5-adventurer'];

describe('QuestionEngine.makePrompt', () => {
  it('only ever selects templates matching the profile band and requested context', () => {
    for (let i = 0; i < 50; i += 1) {
      const prompt = QuestionEngine.makePrompt(grade2Profile, 'farm');
      expect(prompt.band).toBe('grade2');
      expect(prompt.context).toBe('farm');
    }
  });

  it('respects the difficulty range declared on each template', () => {
    // grade5-shop-decimal-estimate is the only 'shop' template for grade5,
    // and it declares minDifficulty: 2. At difficulty 1 it must be excluded
    // from the context-matching set.
    const template = QUESTION_TEMPLATES.find((t) => t.id === 'grade5-shop-decimal-estimate');
    expect(template?.minDifficulty).toBe(2);

    for (let i = 0; i < 20; i += 1) {
      const prompt = QuestionEngine.makePrompt(grade5Profile, 'shop', 2);
      // At a difficulty that satisfies the template's range, the returned
      // subject/skill should be the decimal-estimate template's, since it is
      // the only 'shop' template for grade5.
      expect(prompt.subject).toBe('math');
      expect(prompt.skill).toBe('decimals');
    }
  });

  it('falls back to any band template when difficulty excludes every context match', () => {
    // At difficulty 1, no 'shop' template qualifies (min difficulty is 2),
    // so templatesFor's context-filtered set is empty and the engine falls
    // back to the full-band set instead of throwing or narrowing by context
    // alone. Note this means the returned prompt.context field is stamped
    // with the *requested* context ('shop') even when a non-shop template
    // (e.g. a combat/farm one) is chosen by the fallback — the prompt does
    // not necessarily describe a shop scenario. This is current, documented
    // (via this test) behavior, not something this test suite changes.
    const seenSkills = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      const prompt = QuestionEngine.makePrompt(grade5Profile, 'shop', 1);
      expect(prompt.band).toBe('grade5');
      expect(prompt.context).toBe('shop');
      seenSkills.add(prompt.skill);
    }
    // With 50 draws from the full grade5 template set (7 templates), we
    // should see more than just 'decimals' turn up.
    expect(seenSkills.size).toBeGreaterThan(1);
  });

  it('falls back to the full band when the requested context has no templates at all', () => {
    // No grade5 template declares 'cooking' as a context.
    for (const template of QUESTION_TEMPLATES) {
      if (template.band === 'grade5') {
        expect(template.contexts).not.toContain('cooking');
      }
    }

    const prompt = QuestionEngine.makePrompt(grade5Profile, 'cooking');
    expect(prompt.band).toBe('grade5');
  });

  it('throws when no templates exist for the profile band', () => {
    const unknownBandProfile = {
      ...grade5Profile,
      curriculumBand: 'grade9'
    } as unknown as PlayerProfile;

    expect(() => QuestionEngine.makePrompt(unknownBandProfile, 'farm')).toThrow(
      /No question templates available for grade9/
    );
  });

  it('defaults difficulty to 1 when not provided', () => {
    // grade2 templates all declare minDifficulty: 1, so an unspecified
    // difficulty should behave the same as passing 1 explicitly.
    const withDefault = QuestionEngine.makePrompt(grade2Profile, 'combat');
    const withExplicit = QuestionEngine.makePrompt(grade2Profile, 'combat', 1);
    expect(withDefault.band).toBe(withExplicit.band);
    expect(withDefault.context).toBe(withExplicit.context);
  });
});

describe('QuestionEngine.makePromptById', () => {
  it('generates a prompt for a known template id using its first declared context', () => {
    const template = QUESTION_TEMPLATES.find((t) => t.id === 'grade2-farm-subtraction-berries');
    expect(template).toBeDefined();

    const prompt = QuestionEngine.makePromptById(grade2Profile, 'grade2-farm-subtraction-berries');
    expect(prompt.band).toBe('grade2');
    expect(prompt.context).toBe(template!.contexts[0]);
    expect(prompt.subject).toBe('math');
    expect(prompt.skill).toBe('subtraction');
  });

  it('throws for an unknown template id', () => {
    expect(() => QuestionEngine.makePromptById(grade2Profile, 'does-not-exist')).toThrow(
      /Unknown question template: does-not-exist/
    );
  });

  it('throws when the template band does not match the profile band', () => {
    expect(() => QuestionEngine.makePromptById(grade2Profile, 'grade5-farm-area-rectangle')).toThrow(
      /is not available for grade2/
    );
  });
});
