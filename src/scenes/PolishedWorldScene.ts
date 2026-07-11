import Phaser from 'phaser';
import type { BonusContext } from '../data/curriculum';
import type { InteractionId } from '../data/interactions';
import type { ProfileId } from '../data/profiles';
import { GAME_HEIGHT, GAME_SCALE, GAME_WIDTH, sx, sy } from '../gameDimensions';
import type { HeroPresentationController } from '../presentation/HeroPresentationController';
import {
  PracticeSlimeEncounterController,
  type PracticeSlimeEncounterSnapshot
} from '../presentation/PracticeSlimeEncounterController';
import {
  WildbloomDiscoveryController,
  type WildbloomDiscoverySnapshot
} from '../presentation/WildbloomDiscoveryController';
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
  inventory: Record<string, number>;
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
  save: () => void;
  openBonusPrompt: (
    context: BonusContext,
    label: string,
    onClose?: (result: PromptCloseResult) => string | undefined
  ) => void;
};

/**
 * Verified farm gameplay with a deliberately narrow presentation/integration
 * layer. Focused controllers add first-minute polish, the Practice Slime loop,
 * and Wildbloom discoveries without moving quest, prompt, curriculum, reward,
 * mastery, or save-schema authority out of WorldScene/FarmQuestSystem.
 */
export class PolishedWorldScene extends WorldScene {
  private arrivedFromOpening = false;
  private playerShadow?: Phaser.GameObjects.Ellipse;
  private miraPulse?: Phaser.GameObjects.Arc;
  private presentationHint?: Phaser.GameObjects.Text;
  private presentationObjective?: Phaser.GameObjects.Text;
  private practiceSlimeEncounter?: PracticeSlimeEncounterController;
  private wildbloomDiscovery?: WildbloomDiscoveryController;
  private encounterInputLocked = false;
  private discoveryInputLocked = false;

  init(data: PolishedSceneInitData): void {
    this.arrivedFromOpening = data.fromOpening === true;
    super.init(data);
  }

  create(): void {
    super.create();
    this.installPracticeSlimeEncounter();
    this.addFarmColorGrade();
    this.addPlayerShadow();
    this.addInteractiveObjectShadows();
    this.addMiraGuidance();
    this.installWildbloomDiscovery();
    this.createPolishedHudText();

    if (this.arrivedFromOpening) {
      this.playGateArrival();
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.practiceSlimeEncounter?.dispose();
      this.practiceSlimeEncounter = undefined;
      this.wildbloomDiscovery?.dispose();
      this.wildbloomDiscovery = undefined;
      this.encounterInputLocked = false;
      this.discoveryInputLocked = false;
    });
  }

  update(): void {
    super.update();

    const { player, hintText, objectiveText, inventory } = this.presentationInternals;
    this.practiceSlimeEncounter?.update();
    // Create discovery containers lazily. Before the Sprig is earned there are
    // no hidden-world containers competing with prompt/UI container discovery.
    if ((inventory.wildbloomSprig ?? 0) > 0) {
      this.wildbloomDiscovery?.create();
    }
    this.wildbloomDiscovery?.update();

    // Controllers keep WorldScene un-busy so one-shot hero animations are not
    // cancelled by HeroPresentationController.setBusy(). Movement is stopped
    // here and repeat input is rejected inside each controller.
    if (this.encounterInputLocked || this.discoveryInputLocked) {
      player.setVelocity(0, 0);
    }

    this.playerShadow?.setPosition(player.x, player.y + sy(9));
    const discoveryHint = this.wildbloomDiscovery?.hintText();
    this.presentationHint?.setText(discoveryHint ?? this.formatHint(hintText.text));
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

  getWildbloomDiscoverySnapshot(): WildbloomDiscoverySnapshot {
    return this.wildbloomDiscovery?.snapshot() ?? {
      activeSpotId: null,
      discoveredSpotIds: [],
      inputLocked: false,
      profileId: this.presentationInternals.profileId,
      totalSpots: 3,
      unlocked: false
    };
  }

  private get presentationInternals(): WorldScenePresentationInternals {
    // WorldScene uses TypeScript `private`, not ECMAScript #private fields.
    // These narrow seams touch stable scene objects and existing inventory/save
    // methods while the base scene remains the gameplay authority.
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

  private installWildbloomDiscovery(): void {
    const internals = this.presentationInternals;
    this.wildbloomDiscovery = new WildbloomDiscoveryController({
      scene: this,
      profileId: internals.profileId,
      player: internals.player,
      heroPresentation: internals.heroPresentation,
      hasInventoryItem: (key) => (internals.inventory[key] ?? 0) > 0,
      markInventoryItem: (key) => {
        internals.inventory[key] = 1;
        internals.save();
      },
      isBusy: () => internals.busy,
      onLockChanged: (locked) => {
        this.discoveryInputLocked = locked;
        if (locked) {
          internals.resetJoystick();
          internals.player.setVelocity(0, 0);
        }
      }
    });

    // ACTION first checks for a nearby Sprig secret. If no discovery is close
    // enough, the already-wrapped WorldScene interaction path runs unchanged.
    const originalTryInteract = internals.tryInteract.bind(this);
    internals.tryInteract = () => {
      const discovered = this.wildbloomDiscovery?.tryDiscover() ?? false;
      if (discovered) {
        internals.resetJoystick();
        internals.player.setVelocity(0, 0);
        return true;
      }
      return originalTryInteract();
    };
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
      //
      // Polls and retries rather than firing at two fixed offsets: a fixed
      // 440ms/880ms schedule left only ~50ms of slack against the encounter's
      // own hit-unlock timer, which the larger 960x640 canvas's heavier
      // render load was enough to occasionally overrun, silently dropping
      // the second auto-strike and stranding the encounter at 2/3 hits.
      if (interacted && directLegacySlimeCall) {
        const attemptRemainingStrikes = (): void => {
          this.time.delayedCall(80, () => {
            const snapshot = this.practiceSlimeEncounter?.snapshot();
            if (!snapshot || snapshot.completed) return;
            this.practiceSlimeEncounter?.tryStrike();
            attemptRemainingStrikes();
          });
        };
        this.time.delayedCall(440, attemptRemainingStrikes);
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
      const x = sx(26) + ((index * 89) % (GAME_WIDTH - sx(52)));
      const y = sy(76) + ((index * 53) % (GAME_HEIGHT - sy(112)));
      const mote = this.add.circle(x, y, index % 4 === 0 ? sx(2) : sx(1), index % 3 === 0 ? 0xffe39a : 0xd7ffb8, 0.18)
        .setScrollFactor(0)
        .setDepth(2);
      this.tweens.add({
        targets: mote,
        y: y - sy(8) - (index % 4) * sy(2),
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
    this.playerShadow = this.add.ellipse(player.x, player.y + sy(9), sx(26), sx(10), 0x06110d, 0.35)
      .setDepth(1);
  }

  /**
   * Grounds the remaining interactive world objects with the same soft shadow
   * the player and Mira already use (contract Section 8a). The Practice Slime
   * gets a shadow at its bottom-center base; the other bare quest markers get a
   * small shadow on the tile beneath them so they read as objects hovering over
   * the world rather than UI floating on top of it. Mira already has its own
   * shadow (addMiraGuidance) and the Wildbloom spots draw their own, so both are
   * skipped here. These objects do not move, so no per-frame update is needed.
   */
  private addInteractiveObjectShadows(): void {
    const { targets, practiceSlimeSprite } = this.presentationInternals;

    if (practiceSlimeSprite) {
      // Slime sprite origin is bottom-center, so its base sits at the sprite y.
      this.add.ellipse(practiceSlimeSprite.x, practiceSlimeSprite.y - sy(1), sx(20), sx(7), 0x06110d, 0.32)
        .setDepth(1);
    }

    for (const target of targets) {
      if (target.id === 'mira' || target.id === 'practice-slime') continue;
      // The bare marker (WorldScene.drawTargetMarkers) floats ~12px above the
      // target's map point; anchor the shadow on that ground point.
      this.add.ellipse(target.x, target.y, sx(12), sx(5), 0x06110d, 0.28)
        .setDepth(1);
    }
  }

  private addMiraGuidance(): void {
    const mira = this.presentationInternals.targets.find((target) => target.id === 'mira');
    if (!mira) return;

    // A small world-space NPC silhouette cheaply replaces the bare marker feel
    // until final Mira sprite art arrives. The original target remains the
    // interaction authority underneath it. Scaling this single Graphics
    // object reproduces every local fill/shape coordinate below at
    // GAME_SCALE without needing each one doubled by hand.
    const npc = this.add.graphics().setPosition(mira.x, mira.y).setScale(GAME_SCALE).setDepth(3.5);
    npc.fillStyle(0x06110d, 0.35);
    npc.fillEllipse(0, 5, 24, 8);
    npc.fillStyle(0x5a2f68, 1);
    npc.fillRoundedRect(-8, -20, 16, 22, 5);
    npc.fillStyle(0xe8b98f, 1);
    npc.fillCircle(0, -25, 7);
    npc.fillStyle(0x3b2238, 1);
    npc.fillRoundedRect(-7, -31, 14, 8, 4);
    npc.fillRect(-7, -28, 3, 8);
    npc.fillRect(4, -28, 3, 8);
    npc.fillStyle(0xf1d7a5, 1);
    npc.fillRoundedRect(-5, -13, 10, 11, 3);
    npc.fillStyle(0x342016, 1);
    npc.fillCircle(-2.5, -25, 1);
    npc.fillCircle(2.5, -25, 1);

    const markerY = mira.y - sy(42);
    // Both glow and marker share a GAME_SCALE baseline (radius/geometry left
    // in local units) so the shared pulse tween below can target one scale
    // value consistently for both.
    const glow = this.add.circle(mira.x, markerY, 13, 0xffd666, 0.08)
      .setStrokeStyle(2, 0xffd666, 0.9)
      .setScale(GAME_SCALE)
      .setDepth(4);
    this.miraPulse = glow;

    const marker = this.add.graphics().setPosition(mira.x, markerY).setScale(GAME_SCALE).setDepth(5);
    marker.fillStyle(0xfff2ad, 1);
    marker.fillTriangle(0, -7, 3.5, 0, 0, 7);
    marker.fillTriangle(0, -7, -3.5, 0, 0, 7);
    marker.fillTriangle(-7, 0, 0, -3.5, 7, 0);
    marker.fillTriangle(-7, 0, 0, 3.5, 7, 0);

    this.tweens.add({
      targets: [glow, marker],
      scale: 1.18 * GAME_SCALE,
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

    this.presentationObjective = this.add.text(sx(16), sy(40), this.formatObjective(objectiveText.text), {
      fontFamily: 'system-ui',
      fontSize: '22px',
      color: '#fff3c9',
      fontStyle: 'bold',
      stroke: '#102016',
      strokeThickness: 4,
      wordWrap: { width: GAME_WIDTH - sx(32) }
    }).setScrollFactor(0).setDepth(21);

    this.presentationHint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - sy(18), this.formatHint(hintText.text), {
      fontFamily: 'system-ui',
      fontSize: '22px',
      color: '#fff3c9',
      backgroundColor: '#1a140d',
      padding: { x: sx(10), y: sy(4) },
      stroke: '#0d0905',
      strokeThickness: 4
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

    const arrivalRing = this.add.circle(player.x, player.y + sy(2), sx(10), 0x8f63ff, 0.08)
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
        index % 4 === 0 ? sx(3) : sx(2),
        index % 2 === 0 ? 0xcdb8ff : 0xffe39a,
        1
      ).setDepth(6);
      this.tweens.add({
        targets: sparkle,
        x: player.x + Math.cos(angle) * (sx(25) + (index % 4) * sx(6)),
        y: player.y + Math.sin(angle) * (sy(18) + (index % 4) * sy(5)) - sy(8),
        alpha: 0,
        scale: 0.25,
        duration: 620 + index * 14,
        ease: 'Sine.easeOut',
        onComplete: () => sparkle.destroy()
      });
    }

    if (mira) {
      this.createGuidingTrail(player.x, player.y - sy(8), mira.x, mira.y - sy(12));
    }
  }

  private createGuidingTrail(startX: number, startY: number, endX: number, endY: number): void {
    const points = 7;
    for (let index = 1; index <= points; index += 1) {
      const progress = index / (points + 1);
      const x = Phaser.Math.Linear(startX, endX, progress);
      const y = Phaser.Math.Linear(startY, endY, progress) - Math.sin(progress * Math.PI) * sy(18);
      const sparkle = this.add.circle(x, y, index % 3 === 0 ? sx(3) : sx(2), 0xcdb8ff, 0)
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
      // miraPulse (the "glow" circle from addMiraGuidance) carries a
      // GAME_SCALE baseline, so this absolute scale target must too.
      this.tweens.add({
        targets: this.miraPulse,
        scale: 1.45 * GAME_SCALE,
        alpha: 1,
        delay: 980,
        duration: 260,
        yoyo: true,
        ease: 'Back.easeOut'
      });
    }
  }
}
