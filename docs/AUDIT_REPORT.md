# Eldoria-V2 Repository Audit & Reference Files Review

## Overview

The `Galashots/eldoria-v2` repository contains an educational fantasy 2D RPG built with Phaser 4, Vite, and TypeScript. The project has a very strong foundation, focusing on a "vertical slice" and ensuring that "learning never gates adventure."

The repository is exceptionally well-documented, with a comprehensive set of design guidelines, visual asset contracts, and curriculum schemas. The inclusion of Playwright smoke tests for browser-game regression coverage is an excellent practice.

## Architecture & Code Quality

*   **Tech Stack:** Phaser 4 is an appropriate choice for a web-based 2D RPG. Combining it with Vite and TypeScript provides a modern, typed, and fast development environment.
*   **Modularity:** The codebase is reasonably well-structured (`src/scenes`, `src/systems`, `src/data`). Extracting data like `MIRA_FIRST_ERRAND` from the scenes into a dedicated `data/quests.ts` file is a great example of maintaining a clean separation of concerns.
*   **Testing:** The `playwright` tests cover crucial paths like movement, save state, and grade-specific profile behavior (`tests/vertical-slice.spec.ts`), which is a huge plus.
*   **Type Safety:** The use of TypeScript with strict compiler options provides good safety. The curriculum and save state definitions use explicit types, ensuring type correctness throughout the engine.

## Reference Files Review

The `docs/` folder contains significant reference materials that govern the project.

### 1. `docs/reference/Design-Guide-for-a-Beautiful-Deep-Addictive-Immersive-Curriculum-Aligned-2D-RPG.pdf`

**Review:**
This is an extensive design guide (1500 lines when converted to text). It anchors the project against successful benchmark games (like *Sea of Stars*, *Octopath Traveler II*, *CrossCode*, *Eastward*, *Children of Morta*, *Terraria*).

**Key Takeaways from the Guide:**
*   **Scope:** Emphasizes building one excellent vertical slice before expanding scope (one village, one wilderness, one dungeon, etc.).
*   **Art Direction:** Advocates for highly coherent, readable pixel art with limited dynamic lighting, rather than maximalist detail.
*   **Progression:** Every 10-15 minute session must yield permanent progress.
*   **Learning:** The "stealth assessment" model is emphasized—learning should be gathered through natural play, not just button-pressing quizzes.
*   **UX/Accessibility:** Splitting UX into distinct profiles (Grade 2/Grade 5) is critical due to reading ability differences.

### 2. `docs/VISUAL_ASSET_CONTRACT.md`

**Review:**
This is a critical governing document for art production. It's well-structured and highly prescriptive, preventing the common "visual drift" in indie game development.

**Key Strengths:**
*   **Strict Baselines:** Defines canvas sizes (32x48 for humans), pixel-per-unit (16 PPU), rendering sampling (nearest/point), and lighting directions (upper-left key light).
*   **Naming Conventions:** Implements a strict `snake_case` taxonomy (`<domain>_<entity>_<variant>_...`), making asset management predictable.
*   **JSON Metadata Requirements:** The mandate that every exported asset must have a JSON sidecar defining its footprint, pivot, loops, and hitboxes is an excellent engineering practice, moving logic out of code and into data.

### 3. `docs/visual-targets/`

**Review:**
This folder acts as the bridge between the design contract and actual art production. The JSON files (`farm_village_tile_targets.json`, `hero_actor_targets.json`, etc.) serve as strict specifications that *must* pass the custom validation script (`npm run validate:visual-targets`).

**Key Strengths:**
*   **Automated Validation:** The `scripts/validate-visual-targets.mjs` script is a fantastic way to enforce the `VISUAL_ASSET_CONTRACT.md` before any art is checked into the game. It checks for unique IDs, correct canvas/pivot arrays, valid animation clip formats, and more.
*   **Modularity Planning:** Files like `hero_actor_targets.json` define required slices (`base_body`, `head`, `armor_torso`), ensuring the pipeline is ready for paper-doll equipment layers from day one without over-engineering the immediate implementation.

## Suggestions for Improvement

1.  **Extract Remaining Inline Data:**
    *   While `quests.ts` is a good step, consider ensuring all hardcoded dialogue, UI text, and curriculum prompts are fully extracted into `data/` or a dedicated `i18n` system if localization is ever planned. The curriculum engine handles its data well, but other parts of the world scene could benefit from this.
2.  **Asset Pipeline Automation:**
    *   The `VISUAL_ASSET_CONTRACT.md` mentions a future direction of feature/scene atlases. Consider integrating an automated tool (like TexturePacker CLI or a custom script) into the `npm run build` process to automatically pack `.aseprite` or `.png` sequences into atlases at build time, reducing manual steps for artists.
3.  **Expanded Playwright Tests:**
    *   Currently, smoke tests run successfully, but they rely on the UI and canvas interactions. To ensure the curriculum engine is robust, unit tests (using Jest or Vitest) specifically for `QuestionEngine.ts` and `LearningBonusSystem.ts` would be beneficial. Testing the engine's edge cases without needing the full Phaser context would speed up test execution.
4.  **Save Migration Strategy:**
    *   The `SaveSystem.ts` currently throws away saves if `version !== 1`. As the game evolves past the vertical slice, a robust migration strategy (upgrading v1 saves to v2, etc.) will be necessary to prevent players from losing their 10-15 minutes of permanent progress.
5.  **Stealth Assessment Implementation:**
    *   The design guide heavily emphasizes stealth assessment (gathering learning evidence from natural actions, not just answering prompts). The current system primarily relies on explicit UI prompts. Consider implementing background telemetry that tracks how long a player takes to traverse an area or solve a puzzle, mapped to specific curriculum competencies.
