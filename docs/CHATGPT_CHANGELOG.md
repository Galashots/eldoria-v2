# ChatGPT Change Log

This file records repository changes made through ChatGPT so future work can see what changed, who made it, and when.

## 2026-06-26 — GPT-5.5 Thinking via ChatGPT GitHub Connector

- Branch: `chatgpt/dynamic-joystick`
- Files changed:
  - `src/scenes/WorldScene.ts`
  - `docs/CHATGPT_CHANGELOG.md`
- Summary: Replaced the fixed lower-left D-pad buttons with a dynamic all-direction virtual joystick that appears where the player starts touching in the lower-left quadrant.
- Implementation notes:
  - Movement starts only when the touch begins in the lower-left quadrant of the game screen.
  - The joystick base appears under the initial thumb position and the knob follows the drag, clamped to a 42 px radius.
  - Touch movement is analog and combines safely with keyboard/WASD input.
  - The existing lower-right action button remains unchanged.
  - The joystick resets when released, when a learning prompt opens, or when the scene shuts down.
- Reason: Mobile play should allow natural all-direction movement without requiring the player to aim at fixed D-pad buttons.

## 2026-06-25 — GPT-5.5 Thinking via ChatGPT GitHub Connector

- Branch: `chatgpt/grade2-read-aloud`
- Files changed:
  - `src/scenes/WorldScene.ts`
  - `docs/CHATGPT_CHANGELOG.md`
- Summary: Added a Grade 2 audio-first `READ ALOUD` button to optional learning prompts using the browser `speechSynthesis` API.
- Implementation notes:
  - Kept read-aloud behind an explicit tap/click instead of auto-playing speech.
  - Limited the button to profiles with `readingMode: 'audio-first'`.
  - Cancels active speech when the prompt is answered, skipped, or the scene shuts down.
  - Added no new dependencies.
- Reason: The Grade 2 Mage profile is defined as audio-first, but the prompt UI previously required reading the question and choices.
