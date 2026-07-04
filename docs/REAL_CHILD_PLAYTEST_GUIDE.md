# Real-Child Playtest Guide

Use this guide for one supervised 10-15 minute session per child. Play the live build at:

https://galashots.github.io/eldoria-v2/

Use an iPad in landscape with sound enabled. Safari is the primary iPad target. Keep the session observational: introduce the game, then let the child discover controls and objectives before offering help.

## Start A Fresh Session

1. Open the live playtest link.
2. On the title screen, tap **Mage** for the Grade 2 audio-first profile or **Adventurer** for the Grade 5 reader-mode profile.
3. Test the two profiles separately. Each profile has its own local save in that browser.

For a clean test, clear the saved site data before choosing a profile:

- On iPad, remove the `galashots.github.io` website data in Safari settings. Depending on the iPadOS version, website data is under **Settings > Safari** or **Settings > Apps > Safari**, then **Advanced > Website Data**.
- On a desktop browser, open developer tools and clear Local Storage for `https://galashots.github.io`.
- For a profile-only desktop reset, remove `eldoria_v2_save_grade2-mage` or `eldoria_v2_save_grade5-adventurer` from Local Storage.

Clearing website data removes Eldoria saves stored for that site on that device. Do not reset between the end-of-session reload check and confirming that progress persisted.

## Controls

### iPad and touch

- Movement: press and drag in the lower-left half of the game to reveal and use the virtual joystick.
- Interact: tap **ACTION** in the lower-right corner when near Mira, the crop/scarecrow point, or the Practice Slime.
- Stats: tap **STATS** in the upper-right HUD.
- Prompts: tap an answer, **Skip bonus**, or **READ ALOUD** when it is available for the Grade 2 profile.

### Keyboard

- Movement: Arrow keys or WASD.
- Interact: Space or E.
- Stats: I or Tab toggles the Stats & Mastery panel. The on-screen **STATS** button also works.

## Parent Observation Rules

Begin with only: "Explore the farm and see what you can discover."

Watch whether the child can:

- choose the intended profile and understand that play has started;
- discover movement and ACTION without repeated coaching;
- notice the objective, find Mira, and understand the next destination;
- recognize when an interaction is available;
- read or hear the optional learning prompt;
- answer incorrectly or skip and continue the adventure normally;
- notice gold, charm, sparkle, and mastery feedback;
- open and close Stats & Mastery; and
- reload the page and recognize that progress was saved.

Do not lead the child to the correct answer. Learning prompts award optional bonuses only. A wrong answer or skip must never block traversal, quest progress, baseline rewards, or continued play.

## Grade 2 Mage: 10-15 Minutes

1. Tap **Mage** on the title screen.
2. Let the child discover the lower-left joystick and lower-right ACTION button.
3. Ask the child what the objective says or means; do not read it first.
4. Observe whether the child finds Mira and starts the first errand.
5. At the crop patch, observe whether the child opens the optional prompt and notices **READ ALOUD**.
6. Let the child answer, answer incorrectly, or use **Skip bonus**. Confirm the quest still advances.
7. Observe whether the child finds and interacts with the Practice Slime.
8. Return to Mira and watch for recognition of gold and the Sunberry Charm.
9. Open **STATS** and ask the child what they think changed.
10. If time remains, begin the Whispering Scarecrow errand. Reload once before ending and confirm the saved progress is recognizable.

Focus on audio clarity, short-text readability, touch accuracy, objective clarity, and whether the child needs an adult to keep moving.

## Grade 5 Adventurer: 10-15 Minutes

1. Tap **Adventurer** on the title screen.
2. Let the child discover movement and ACTION without instructions.
3. Observe whether the child reads the objective and finds Mira independently.
4. At the crop patch, let the child handle the reader-mode bonus prompt without coaching.
5. Ensure the child sees that an incorrect answer or **Skip bonus** does not stop the errand.
6. Observe whether the child finds and interacts with the Practice Slime.
7. Return to Mira and watch for recognition of the baseline quest reward and keepsake.
8. Ask the child to find Stats & Mastery without naming its screen location; keyboard players may also discover I or Tab.
9. If time remains, begin or complete the Whispering Scarecrow errand.
10. Reload once before ending and ask what the child expects to remain saved.

Focus on reading density, reasoning-prompt clarity, objective tracking, navigation, Stats & Mastery comprehension, and fun factor.

## Blocker Versus Polish

Record an issue as a **blocker** when it prevents or reliably derails the session, including:

- the game does not load, crashes, freezes, or loses input;
- touch movement or ACTION cannot be used reliably in landscape;
- required text or controls are unreadable or hidden;
- the child cannot progress after a wrong answer or skip;
- an objective cannot be completed through normal play; or
- expected progress is lost after reload.

Record an issue as **polish** when play can continue without adult intervention, including:

- a momentary hesitation that resolves naturally;
- cosmetic alignment, animation, or feedback issues;
- wording that is understood after a second look;
- a control that is discoverable but could be clearer; or
- a preference that does not block or repeatedly confuse the child.

Repeated confusion across sessions may justify promotion from polish to blocker. Capture evidence before proposing a redesign.

## Notes To Capture

For each notable moment, record:

- profile and approximate elapsed time;
- what the child tried before asking for help;
- exact help required, if any;
- confusion or repeated backtracking;
- text readability and objective clarity;
- Grade 2 READ ALOUD discovery, volume, pronunciation, and interruption behavior;
- iPad orientation, joystick, ACTION, prompt, and STATS touch behavior;
- whether optional bonuses felt optional;
- moments of delight, boredom, or frustration; and
- an initial classification of blocker or polish.

Use profile labels only. Do not commit names, photos, recordings, or other identifying information. The shorter checklist in [`docs/playtests/CHILD_CLARITY_CHECKLIST.md`](playtests/CHILD_CLARITY_CHECKLIST.md) can be used as the session note sheet.
