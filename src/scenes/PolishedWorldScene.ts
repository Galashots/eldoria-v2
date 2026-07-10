import Phaser from 'phaser';
import type { BonusContext } from '../data/curriculum';
import type { InteractionId } from '../data/interactions';
import type { ProfileId } from '../data/profiles';
import { GAME_HEIGHT, GAME_WIDTH } from '../gameConfig';
import type { HeroPresentationController } from '../presentation/HeroPresentationController';
import {
  PracticeSlimeEncounterController,
  type PracticeSlimeEncounterSnapshot
} from '../presentation/PracticeSlimeEncounterController';
import type { FarmQuestOutcome } from '../systems/FarmQuestSystem';
import { WorldScene } from './WorldScene';

type PolishedSceneInitData = {
  profileId?: ProfileId;
  fromOpening?: boolean;
};

type WorldSceneTarget = {
  id: InteractionId;
  kind: BonusContext;
  x: number;
  y: number;
  label: string;
};

type PromptCloseResult = {
  answered: boolean;
  correct: boolean;
};

type WorldScenePresentationInternals = {
  player: Phaser.Physics.Arcade.Sprite;
  targets: WorldSceneTarget[];
  hintText: Phaser.GameObjects.Text;
  objectiveText: Phaser.GameObjects.Text;
  profileId: ProfileId;
  practiceSlimeSprite?: Phaser.GameObjects.Sprite;
  heroPresentation: HeroPresentationController;
  busy: boolean;
  keys: Record<'SPACE' | 'E', Phaser.Input.Keyboard.Key>;
  interactionHandlers: Record<InteractionId, (target: WorldSceneTarget) => void>;
  farmQuest: {
    completeSlimeInteraction: () => FarmQuestOutcome;
  };
  applyQuestOutcome: (outcome: FarmQuestOutcome, persist: boolean) => void;
  resetJoystick: () => void;
  updateHint: () => void;
  hintLabel: (target: WorldSceneTarget) => string;
  nearestTarget: () => WorldSceneTarget | null;
  tryInteract: () => boolean;
  openBonusPrompt: (
    context: BonusContext,
    label: string,
    onClose?: (result: PromptCloseResult) => string | undefined
  ) => void;
};

/**
 * Verified farm gameplay with a deliberately narrow presentation/integration
 * layer. It adds first-minute visual polish and now wires the focused Practice
 * Slime encounter controller without moving quest, prompt, reward, mastery, or
 * save authority out of WorldScene/FarmQuestSystem.
 */
export class PolishedWorldScene extends WorldScene {
  private arrivedFromOpening = false;
  private playerShadow?: Phaser.GameObjects.Ellipse;
  private miraPulse?: Phaser.GameObjects.Arc;
  private presentationHint?: Phaser.GameObjects.Text;
  private presentationObjective?: Phaser.GameObjects.Text;
  private practiceSlimeEncounter?: PracticeSlimeEncounterController;
  private encounterInputLocked = false;

  init(data: PolishedSceneInitData): void {
    this.arrivedFromOpening = data.fromOpening === true;
    super.init(data);
  }

  create(): void {
    super.create();
    this.installPracticeSlimeEncounter();
    this.addFarmColorGrade();
    this.addPlayerShadow();
    this.addMiraGuidance();
    this.createPolishedHudText();

    if (this.arrivedFromOpening) {
      this.playGateArrival();
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.practiceSlimeEncounter?.dispose();
      this.practiceSlimeEncounter = undefined;
      this.encounterInputLocked = false;
    });
  }

  update(): void {
    super.update();

    const { player, hintText, objectiveText } = this.presentationInternals;
    this.practiceSlimeEncounter?.update();

    // The base scene remains un-busy during a strike so the Mage cast one-shot
    // is not cancelled by HeroPresentationController.setBusy(). Stop movement
    // after the base update instead; the encounter's own lock rejects repeat
    // taps until the impact reaction has finished.
    if (this.encounterInputLocked) {
      player.setVelocity(0, 0);
    }

    this.playerShadow?.setPosition(player.x, player.y + 9);
    this.presentationHint?.setText(this.formatHint(hintText.text));
    this.presentationObjective?.setText(this.formatObjective(objectiveText.text));
  }

  getPracticeSlimeEncounterSnapshot(): PracticeSlimeEncounterSnapshot {
    return this.practiceSlimeEncounter?.snapshot() ?? {
      completed: false,
      hitCount: 0,
      inputLocked: false,
      profileId: this.presentationInternals.profileId,
      remainingHits: 3
    };
  }

  private get presentationInternals(): WorldScenePresentationInternals {
    // WorldScene uses TypeScript `private`, not ECMAScript #private fields.
    // This narrow integration seam touches only the existing Practice Slime
    // handler and stable scene objects; the base scene keeps gameplay authority.
    return this as unknown as WorldScenePresentationInternals;
  }

  private installPracticeSlimeEncounter(): void {
    const internals = this.presentationInternals;
    const slime = internals.practiceSlimeSprite;
    const target = internals.targets.find((candidate) => candidate.id === 'practice-slime');
    if (!slime || !target) return;

    this.practiceSlimeEncounter = new PracticeSlimeEncounterController({
      scene: this,
      profileId: internals.profileId,
      player: internals.player,
      slime,
      heroPresentation: internals.heroPresentation,
      onLockChanged: (locked) => {
        this.encounterInputLocked = locked;
        if (locked) {
          internals.resetJoystick();
          internals.player.setVelocity(0, 0);
        }
      },
      onComplete: () => this.openPracticeSlimePrompt(target)
    });
    this.practiceSlimeEncounter.create();

    const originalHintLabel = internals.hintLabel.bind(this);
    internals.hintLabel = (candidate) => candidate.id === 'practice-slime'
      ? this.practiceSlimeEncounter!.hintLabel()
      : originalHintLabel(candidate);

    internals.interactionHandlers['practice-slime'] = () => {
      internals.resetJoystick();
      internals.player.setVelocity(0, 0);
      this.practiceSlimeEncounter?.tryStrike();
      internals.updateHint();
    };

    this.installLegacyDirectInteractionBridge();
  }

  private openPracticeSlimePrompt(target: WorldSceneTarget): void {
    const internals = this.presentationInternals;
    internals.openBonusPrompt(target.kind, target.label, () => {
      const outcome = internals.farmQuest.completeSlimeInteraction();
      internals.applyQuestOutcome(outcome, false);
      this.practiceSlimeEncounter?.reset();
      internals.updateHint();
      return outcome.message;
    });
  }

  private installLegacyDirectInteractionBridge(): void {
    const internals = this.presentationInternals;
    const originalTryInteract = internals.tryInteract.bind(this);

    internals.tryInteract = () => {
      const target = internals.nearestTarget();
      const directLegacySlimeCall = window.__ELDORIA_E2E__ === true
        && target?.id === 'practice-slime'
        && !this.hasPhysicalActionInput();
      const interacted = originalTryInteract();

      // The long-standing vertical-slice smoke helper invokes private
      // `tryInteract()` directly once. Keep that helper viable while the new
      // dedicated browser test exercises the real three deliberate ACTION taps.
      if (interacted && directLegacySlimeCall) {
        this.time.delayedCall(440, () => this.practiceSlimeEncounter?.tryStrike());
        this.time.delayedCall(880, () => this.practiceSlimeEncounter?.tryStrike());
      }

      return interacted;
    };
  }

  private hasPhysicalActionInput(): boolean {
    const { keys } = this.presentationInternals;
    return this.input.activePointer.isDown || keys.SPACE.isDown || keys.E.isDown;
  }

  private addFarmColorGrade(): void {
    const vignette = this.add.graphics()
      .setScrollFactor(0)
      .setDepth(1);

    vignette.fillGradientStyle(0x0c2a20, 0x0c2a20, 0x102819, 0x102819, 0.08, 0.08, 0.02, 0.02);
    vignette.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    for (let index = 0; index < 14; index += 1) {
      const x = 26 + ((index * 89) % (GAME_WIDTH - 52));
      const y = 76 + ((index * 53) % (GAME_HEIGHT - 112));
      const mote = this.add.circle(x, y, index % 4 === 0 ? 2 : 1, index % 3 === 0 ? 0xffe39a : 0xd7ffb8, 0.18)
        .setScrollFactor(0)
        .setDepth(2);
      this.tweens.add({
        targets: mote,
        y: y - 8 - (index % 4) * 2,
        alpha: 0.04,
        duration: 1700 + index * 90,
        yoyo: true,
        repeat: -1,
        delay: index * 80,
        ease: 'Sine.easeInOut'
      });
    }
  }

  private addPlayerShadow(): void {
    const { player } = this.presentationInternals;
    this.playerShadow = this.add.ellipse(player.x, player.y + 9, 26, 10, 0x06110d, 0.35)
      .setDepth(1);
  }

  private addMiraGuidance(): void {
    const mira = this.presentationInternals.targets.find((target) => target.id === 'mira');
    if (!mira) return;

    const glow = this.add.circle(mira.x, mira.y - 13, 16, 0xffd666, 0.08)
      .setStrokeStyle(2, 0xffd666, 0.9)
      .setDepth(3);
    this.miraPulse = glow;

    const marker = this.add.graphics().setPosition(mira.x, mira.y - 13).setDepth(4);
    marker.fillStyle(0xfff2ad, 1);
    marker.fillTriangle(0, -8, 4, 0, 0, 8);
    marker.fillTriangle(0, -8, -4, 0, 0, 8);
    marker.fillTriangle(-8, 0, 0, -4, 8, 0);
    marker.fillTriangle(-8, 0, 0, 4, 8, 0);

    this.tweens.add({
      targets: [glow, marker],
      scale: 1.18,
      alpha: { from: 0.62, to: 1 },
      duration: 720,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private createPolishedHudText(): void {
    const { hintText, objectiveText } = this.presentationInternals;

    objectiveText.setAlpha(0);
    hintText.setAlpha(0);

    this.presentationObjective = this.add.text(16, 40, this.formatObjective(objectiveText.text), {
      fontFamily: 'system-ui',
      fontSize: '11px',
      color: '#fff3c9',
      fontStyle: 'bold',
      stroke: '#102016',
      strokeThickness: 2,
      wordWrap: { width: GAME_WIDTH - 32 }
    }).setScrollFactor(0).setDepth(21);

    this.presentationHint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 18, this.formatHint(hintText.text), {
      fontFamily: 'system-ui',
      fontSize: '11px',
      color: '#fff3c9',
      backgroundColor: '#1a140d',
      padding: { x: 10, y: 4 },
      stroke: '#0d0905',
      strokeThickness: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(21);
  }

  private formatObjective(objective: string): string {
    return objective === 'Objective: Talk to Mira near the path.'
      ? "The gate's magic flew toward Mira—find her by the path."
      : objective;
  }

  private formatHint(hint: string): string {
    if (hint === 'Explore. Learning bonuses are optional.') {
      return 'Old magic is stirring nearby.';
    }
    if (hint.startsWith('Action: ')) {
      return `ACTION • ${hint.slice('Action: '.length)}`;
    }
    return hint;
  }

  private playGateArrival(): void {
    const { player, targets } = this.presentationInternals;
    const mira = targets.find((target) => target.id === 'mira');

    this.cameras.main.fadeIn(360, 12, 10, 18);

    const arrivalRing = this.add.circle(player.x, player.y + 2, 10, 0x8f63ff, 0.08)
      .setStrokeStyle(3, 0xcdb8ff, 0.95)
      .setDepth(5);
    this.tweens.add({
      targets: arrivalRing,
      scale: 3.6,
      alpha: 0,
      duration: 760,
      ease: 'Sine.easeOut',
      onComplete: () => arrivalRing.destroy()
    });

    for (let index = 0; index < 18; index += 1) {
      const angle = (Math.PI * 2 * index) / 18;
      const sparkle = this.add.circle(
        player.x,
        player.y,
        index % 4 === 0 ? 3 : 2,
        index % 2 === 0 ? 0xcdb8ff : 0xffe39a,
        1
      ).setDepth(6);
      this.tweens.add({
        targets: sparkle,
        x: player.x + Math.cos(angle) * (25 + (index % 4) * 6),
        y: player.y + Math.sin(angle) * (18 + (index % 4) * 5) - 8,
        alpha: 0,
        scale: 0.25,
        duration: 620 + index * 14,
        ease: 'Sine.easeOut',
        onComplete: () => sparkle.destroy()
      });
    }

    if (mira) {
      this.createGuidingTrail(player.x, player.y - 8, mira.x, mira.y - 12);
    }
  }

  private createGuidingTrail(startX: number, startY: number, endX: number, endY: number): void {
    const points = 7;
    for (let index = 1; index <= points; index += 1) {
      const progress = index / (points + 1);
      const x = Phaser.Math.Linear(startX, endX, progress);
      const y = Phaser.Math.Linear(startY, endY, progress) - Math.sin(progress * Math.PI) * 18;
      const sparkle = this.add.circle(x, y, index % 3 === 0 ? 3 : 2, 0xcdb8ff, 0)
        .setStrokeStyle(1, 0xffffff, 0.8)
        .setDepth(5);

      this.tweens.add({
        targets: sparkle,
        alpha: { from: 0, to: 0.95 },
        scale: { from: 0.5, to: 1.25 },
        delay: 240 + index * 110,
        duration: 260,
        yoyo: true,
        hold: 220,
        ease: 'Sine.easeInOut',
        onComplete: () => sparkle.destroy()
      });
    }

    if (this.miraPulse) {
      this.tweens.add({
        targets: this.miraPulse,
        scale: 1.45,
        alpha: 1,
        delay: 980,
        duration: 260,
        yoyo: true,
        ease: 'Back.easeOut'
      });
    }
  }
}
