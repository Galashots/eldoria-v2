# AI Change Log

This file records repository changes made through AI-assisted work so future work can see what changed, who made it, and when.

## 2026-06-25 — GPT-5.5 Thinking via ChatGPT GitHub Connector

- Branch: `chatgpt/grade2-read-aloud`
- Files changed:
  - `src/scenes/WorldScene.ts`
  - `docs/AI_CHANGELOG.md`
- Summary: Added a Grade 2 audio-first `READ ALOUD` button to optional learning prompts using the browser `speechSynthesis` API.
- Implementation notes:
  - Kept read-aloud behind an explicit tap/click instead of auto-playing speech.
  - Limited the button to profiles with `readingMode: 'audio-first'`.
  - Cancels active speech when the prompt is answered, skipped, or the scene shuts down.
  - Added no new dependencies.
- Reason: The Grade 2 Mage profile is defined as audio-first, but the prompt UI previously required reading the question and choices.
