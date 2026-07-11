# Real-Child Playtest Guide

Use this guide for one supervised 10–15 minute session per profile on an actual iPad. The live build is:

https://galashots.github.io/eldoria-v2/

Use Safari in landscape with sound enabled. Keep the session observational: introduce the game, then let the player discover controls, objectives, and interactions before offering help.

Do not describe browser-emulated viewport testing as this playtest. This guide is for a physical iPad and a real player.

## Privacy

Record observations by profile only: **Grade 2 Mage** or **Grade 5 Ranger Explorer**.

Do not commit names, photos, audio, video, account details, or other identifying information.

## Start a fresh session

1. Open the live build in Safari and rotate to landscape.
2. Choose **Mage** for the Grade 2 audio-first profile or **Ranger Explorer** for the Grade 5 reader-mode profile.
3. Test profiles separately. Each profile has its own local save.

For a clean test, clear the saved site data before choosing a profile:

- iPad: remove `galashots.github.io` website data in Safari settings. Depending on iPadOS, this is under **Settings > Safari** or **Settings > Apps > Safari**, then **Advanced > Website Data**.
- Desktop troubleshooting only: clear Local Storage for `https://galashots.github.io`.
- Profile-only desktop reset: remove `eldoria_v2_save_grade2-mage` or `eldoria_v2_save_grade5-adventurer`.

Clearing site data removes Eldoria saves on that device. Do not clear data between the reload check and confirming that progress persisted.

## Current flow to expect

A fresh profile should:

1. enter the short, skippable **Waking Gate** scene;
2. use **ACTION** three deliberate times to weaken the gate;
3. arrive at the farm;
4. follow the objective toward Mira;
5. begin Mira's first errand;
6. reach the crop bonus and Practice Slime;
7. answer or skip optional learning without blocking progress;
8. return to Mira for the baseline reward and Sunberry Charm;
9. open **STATS** and recognize persistent progress;
10. reload and retain progress.

The Wildbloom Sprig discovery loop occurs later, after The Sleepy Sprouts. Test it in a separate prepared-save session unless the player naturally reaches it.

## Controls

### iPad and touch

- **Waking Gate / interact / attack / reveal:** tap **ACTION** in the lower-right.
- **Movement:** press and drag in the lower-left area to reveal and use the virtual joystick.
- **Stats:** tap **STATS** in the upper-right HUD.
- **Prompts:** tap an answer, **Skip bonus**, or **READ ALOUD** when available for Grade 2.

### Keyboard reference

- Move: Arrow keys or WASD.
- Interact: Space or E.
- Stats: I or Tab.

## Observation rules

Begin with only:

> Explore and see what you can discover.

Do not point at controls, read the objective, suggest an answer, or explain the route unless the player is genuinely stuck.

Watch whether the player can:

- recognize that the Waking Gate scene is interactive;
- discover and deliberately use ACTION three times without accidental double taps;
- understand that the farm has started after the gate opens;
- discover movement and ACTION without repeated coaching;
- notice the objective, find Mira, and understand the next destination;
- recognize when an interaction is available;
- understand the Practice Slime as a three-hit friendly encounter rather than a single tap;
- read or hear the optional prompt;
- answer incorrectly or skip and continue normally;
- notice gold, keepsake, sparkle, and mastery feedback;
- open and close Stats & Mastery;
- reload and recognize that progress was saved.

Never lead the player to the correct learning answer. A wrong answer or skip must not block traversal, quest progress, baseline rewards, or continued play.

## Grade 2 Mage session

1. Choose **Mage**.
2. Observe whether the player notices ACTION and completes the Waking Gate without repeated coaching.
3. Listen for audio clarity and whether text can be understood with minimal reading.
4. At the farm, observe discovery of the joystick and the path to Mira.
5. At the crop patch, observe whether **READ ALOUD** is found and usable.
6. Let the player answer, answer incorrectly, or choose **Skip bonus**. Confirm the errand continues.
7. Observe the three-hit Practice Slime encounter: deliberate taps, hit readability, rapid-tap rejection, and prompt timing.
8. Return to Mira and watch for recognition of gold and the Sunberry Charm.
9. Open **STATS** and ask what changed.
10. Reload once and ask what the player expects to remain.

Focus on audio clarity, pronunciation, interruption behavior, touch accuracy, short-text readability, objective clarity, and whether the player needs an adult to keep moving.

## Grade 5 Ranger Explorer session

1. Choose **Ranger Explorer**.
2. Observe whether the player understands the tracking-shot Waking Gate interaction without instructions.
3. At the farm, observe independent discovery of movement, ACTION, objective tracking, and Mira.
4. At the crop patch, let the player handle the reader-mode bonus prompt without coaching.
5. Confirm that an incorrect answer or **Skip bonus** does not stop the errand.
6. Observe the three-hit Practice Slime encounter and whether the Ranger presentation feels older, capable, and readable.
7. Return to Mira and watch for recognition of the baseline reward and keepsake.
8. Ask the player to find Stats & Mastery without naming its location.
9. If time remains, begin The Whispering Scarecrow.
10. Reload once and ask what should remain saved.

Focus on reading density, reasoning-prompt clarity, objective tracking, navigation, Ranger identity, Stats & Mastery comprehension, and fun factor.

## Optional prepared-save Wildbloom session

Use a save where the Wildbloom Sprig has already been earned.

Observe whether the player can:

- notice the Sprig's proximity hum;
- follow the in-world guidance without a written walkthrough;
- use the profile ability near a hidden spot;
- distinguish Mage magic from Ranger tracking;
- understand that the revealed landmark is permanent;
- find more than one secret without losing interest;
- reload and see discovered spots remain revealed.

This loop is optional and must not be mistaken for required quest progress.

## Physical-iPad checks

Record:

- load time and any blank or stalled state;
- canvas fit, centering, and safe-area clipping;
- orientation message behavior;
- joystick comfort and unintended page movement;
- ACTION size, touch latency, and accidental double taps;
- text fit and prompt-button reliability;
- audio/read-aloud balance and mute behavior;
- browser zoom, selection, or scroll interference;
- frame pacing during movement, gate impacts, slime hits, and Wildbloom reveals;
- memory or responsiveness after 10–15 minutes.

## Blocker versus polish

Classify as a **blocker** when it prevents or reliably derails play, including:

- load failure, crash, freeze, or lost input;
- unreliable joystick or ACTION in landscape;
- unreadable or hidden required controls/text;
- inability to complete the Waking Gate or an objective through normal play;
- wrong-answer or skip behavior blocking progress;
- lost progress after reload;
- browser scrolling/zooming that repeatedly interrupts play.

Classify as **polish** when play continues without adult intervention, including:

- brief hesitation that resolves naturally;
- cosmetic alignment, animation, or feedback weakness;
- wording understood after a second look;
- a discoverable control that could be clearer;
- a preference that does not repeatedly confuse or block.

Repeated confusion across sessions may justify promoting a polish issue to a blocker. Capture evidence before proposing redesign.

## Notes to capture

For each notable moment, record:

- profile and approximate elapsed time;
- game state or step;
- what the player tried before asking for help;
- exact help required, if any;
- confusion, backtracking, delight, boredom, or frustration;
- text and objective readability;
- Grade 2 read-aloud discovery, volume, pronunciation, and interruption behavior;
- iPad joystick, ACTION, prompt, STATS, orientation, and safe-area behavior;
- whether optional bonuses felt optional;
- initial blocker/polish classification.

Use [`docs/playtests/CHILD_CLARITY_CHECKLIST.md`](playtests/CHILD_CLARITY_CHECKLIST.md) as the short note sheet.
