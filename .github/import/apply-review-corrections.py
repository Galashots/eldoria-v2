from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    content = file_path.read_text(encoding="utf-8")
    count = content.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one match in {path}, found {count}: {old[:80]!r}")
    file_path.write_text(content.replace(old, new, 1), encoding="utf-8")


# Root-cause correction: a higher-minimum template must be reachable at its
# declared floor before it can generate mastery for its own skill.
replace_once(
    "tests/unit/QuestionEngine.test.ts",
    """  it('reproduces baseline eligibility with an empty mastery map (locked templates stay locked)', () => {
    // grade5-shop-decimal-estimate (minDifficulty 2) must not appear at
    // baseline difficulty — the same contract makePrompt(d=1) enforces for
    // the context-matching set.
    for (let i = 0; i < 100; i += 1) {
      const prompt = QuestionEngine.makeAdaptivePrompt(grade5Profile, 'shop', {});
      expect(prompt.skill).not.toBe('decimals');
    }
  });

  it('unlocks a higher-minDifficulty template once its own skill builds a streak', () => {
    // A decimals streak of 3 derives difficulty 2, reaching decimal-estimate's
    // minDifficulty. It is the only grade5 'shop' template, so every shop
    // prompt must then come from it.
    const mastery = masteryWithStreak('grade5', 'math', 'decimals', 3);
    for (let i = 0; i < 50; i += 1) {
      const prompt = QuestionEngine.makeAdaptivePrompt(grade5Profile, 'shop', mastery);
      expect(prompt.skill).toBe('decimals');
      expect(prompt.subject).toBe('math');
    }
  });
""",
    """  it('serves a context-only higher-minimum template at its declared floor for an unseen skill', () => {
    // Decimal estimate is the only grade5 shop template and declares
    // minDifficulty 2. It must be reachable immediately at that floor;
    // requiring decimals mastery first would create an impossible self-unlock.
    for (let i = 0; i < 100; i += 1) {
      const prompt = QuestionEngine.makeAdaptivePrompt(grade5Profile, 'shop', {});
      expect(prompt.skill).toBe('decimals');
      expect(prompt.subject).toBe('math');
      expect(Number(prompt.answer)).toBeLessThanOrEqual(115);
      expect(prompt.choices.filter((choice) => choice === prompt.answer)).toHaveLength(1);
    }
  });

  it('raises that reachable template after its own skill builds a streak', () => {
    // A maxed decimals streak derives difficulty 5. The prompt remains in the
    // shop/decimals context and stays answerable, while samples can exceed the
    // difficulty-2 ceiling of 115 without exceeding the difficulty-5 maximum.
    const mastery = masteryWithStreak('grade5', 'math', 'decimals', 12);
    let sawElevatedAnswer = false;
    for (let i = 0; i < 200; i += 1) {
      const prompt = QuestionEngine.makeAdaptivePrompt(grade5Profile, 'shop', mastery);
      expect(prompt.skill).toBe('decimals');
      expect(prompt.subject).toBe('math');
      expect(Number(prompt.answer)).toBeLessThanOrEqual(280);
      expect(prompt.choices.filter((choice) => choice === prompt.answer)).toHaveLength(1);
      if (Number(prompt.answer) > 115) sawElevatedAnswer = true;
    }
    expect(sawElevatedAnswer).toBe(true);
  });
""",
)

# The lifetime canvas-text set is useful for short-lived toasts, but it must be
# reset immediately before the action under test or old objective text can make
# a later substring assertion pass without observing the new toast.
replace_once(
    "tests/vertical-slice.spec.ts",
    """async function canvasTextSeen(page: Page, text: string): Promise<boolean> {
  return page.evaluate((expected) => {
    const seen = (window as unknown as { __canvasTextsSeen?: Set<string> }).__canvasTextsSeen;
    if (!seen) return false;
    for (const entry of seen) {
      if (entry.includes(expected)) return true;
    }
    return false;
  }, text);
}

async function hasCanvasText(page: Page, text: string): Promise<boolean> {
""",
    """async function canvasTextSeen(page: Page, text: string): Promise<boolean> {
  return page.evaluate((expected) => {
    const seen = (window as unknown as { __canvasTextsSeen?: Set<string> }).__canvasTextsSeen;
    if (!seen) return false;
    for (const entry of seen) {
      if (entry.includes(expected)) return true;
    }
    return false;
  }, text);
}

async function resetCanvasTextRecorder(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { __canvasTextsSeen?: Set<string> }).__canvasTextsSeen?.clear();
  });
}

async function hasCanvasText(page: Page, text: string): Promise<boolean> {
""",
)

for old, new in [
    (
        """  expect((await setPlayer(page, 832, 512)).hint).toContain('Mira');
  await sceneInteract(page);
  await expect.poll(async () => (await state(page)).questStep).toBe('complete');
""",
        """  expect((await setPlayer(page, 832, 512)).hint).toContain('Mira');
  await resetCanvasTextRecorder(page);
  await sceneInteract(page);
  await expect.poll(async () => (await state(page)).questStep).toBe('complete');
""",
    ),
    (
        """  await armCropFeedbackWatcher(page);
  expect(await interactAt(page, 480, 832)).toContain('Check Scarecrow');
""",
        """  await armCropFeedbackWatcher(page);
  await resetCanvasTextRecorder(page);
  expect(await interactAt(page, 480, 832)).toContain('Check Scarecrow');
""",
    ),
    (
        """  await setPlayer(page, 832, 512);
  await sceneInteract(page);
  await expect.poll(async () => (await state(page)).gold).toBe(14);
""",
        """  await setPlayer(page, 832, 512);
  await resetCanvasTextRecorder(page);
  await sceneInteract(page);
  await expect.poll(async () => (await state(page)).gold).toBe(14);
""",
    ),
    (
        """  expect((await setPlayer(page, 832, 512)).hint).toContain('Mira');
  await sceneInteract(page);
  await expect.poll(async () => (await state(page)).gold).toBe(20);
""",
        """  expect((await setPlayer(page, 832, 512)).hint).toContain('Mira');
  await resetCanvasTextRecorder(page);
  await sceneInteract(page);
  await expect.poll(async () => (await state(page)).gold).toBe(20);
""",
    ),
    (
        """  await expect.poll(async () => hasCanvasText(page, 'READ ALOUD')).toBe(false);
  await clickGame(page, 260, 388);
""",
        """  await expect.poll(async () => hasCanvasText(page, 'READ ALOUD')).toBe(false);
  await resetCanvasTextRecorder(page);
  await clickGame(page, 260, 388);
""",
    ),
]:
    replace_once("tests/vertical-slice.spec.ts", old, new)

# Recorder listeners are removed by callback, not by deleting every listener
# for Phaser's animationstart event.
replace_once(
    "tests/vertical-slice.spec.ts",
    """    (window as unknown as { __heroAnimRecorder: string[] }).__heroAnimRecorder = [];
    scene.heroPresentation?.sprite?.on('animationstart', (anim) => {
      (window as unknown as { __heroAnimRecorder: string[] }).__heroAnimRecorder.push(anim.key);
    });
""",
    """    const recorderWindow = window as unknown as {
      __heroAnimRecorder: string[];
      __heroAnimRecorderCallback?: (anim: { key: string }) => void;
    };
    recorderWindow.__heroAnimRecorder = [];
    const callback = (anim: { key: string }) => recorderWindow.__heroAnimRecorder.push(anim.key);
    recorderWindow.__heroAnimRecorderCallback = callback;
    scene.heroPresentation?.sprite?.on('animationstart', callback);
""",
)
replace_once(
    "tests/vertical-slice.spec.ts",
    """      heroPresentation?: { sprite?: { off: (event: string) => void } };
    };
    scene.heroPresentation?.sprite?.off('animationstart');
""",
    """      heroPresentation?: {
        sprite?: { off: (event: string, cb: (anim: { key: string }) => void) => void };
      };
    };
    const recorderWindow = window as unknown as {
      __heroAnimRecorderCallback?: (anim: { key: string }) => void;
    };
    const callback = recorderWindow.__heroAnimRecorderCallback;
    if (callback) scene.heroPresentation?.sprite?.off('animationstart', callback);
    delete recorderWindow.__heroAnimRecorderCallback;
""",
)

replace_once(
    "tests/vertical-slice.spec.ts",
    """    (window as unknown as { __slimeAnimRecorder: string[] }).__slimeAnimRecorder = [];
    scene.practiceSlimeSprite?.on('animationstart', (anim) => {
      (window as unknown as { __slimeAnimRecorder: string[] }).__slimeAnimRecorder.push(anim.key);
    });
""",
    """    const recorderWindow = window as unknown as {
      __slimeAnimRecorder: string[];
      __slimeAnimRecorderCallback?: (anim: { key: string }) => void;
    };
    recorderWindow.__slimeAnimRecorder = [];
    const callback = (anim: { key: string }) => recorderWindow.__slimeAnimRecorder.push(anim.key);
    recorderWindow.__slimeAnimRecorderCallback = callback;
    scene.practiceSlimeSprite?.on('animationstart', callback);
""",
)
replace_once(
    "tests/vertical-slice.spec.ts",
    """      practiceSlimeSprite?: { off: (event: string) => void };
    };
    scene.practiceSlimeSprite?.off('animationstart');
""",
    """      practiceSlimeSprite?: {
        off: (event: string, cb: (anim: { key: string }) => void) => void;
      };
    };
    const recorderWindow = window as unknown as {
      __slimeAnimRecorderCallback?: (anim: { key: string }) => void;
    };
    const callback = recorderWindow.__slimeAnimRecorderCallback;
    if (callback) scene.practiceSlimeSprite?.off('animationstart', callback);
    delete recorderWindow.__slimeAnimRecorderCallback;
""",
)

print("Applied ChatGPT review corrections.")
