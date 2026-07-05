import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../gameConfig';
import type { AnswerValue, BonusContext, LearningPrompt } from '../data/curriculum';
import { REWARD_KIND_GOLD_VALUE } from '../data/curriculum';
import { PROFILES, type ProfileId } from '../data/profiles';
import { MIRA_FIRST_ERRAND } from '../data/quests';
import { resolveInteractionId, getTiledProperty, type InteractionId } from '../data/interactions';
import {
  facingFromVector,
  HeroPresentationController
} from '../presentation/HeroPresentationController';
import { AtmosphereController } from '../presentation/AtmosphereController';
import { LearningBonusSystem } from '../systems/LearningBonusSystem';
import { MasterySystem, type LearningMastery } from '../systems/MasterySystem';
import { FarmQuestSystem, type FarmQuestOutcome } from '../systems/FarmQuestSystem';
import { CURRENT_SAVE_VERSION, SaveSystem, type StarterQuestStep } from '../systems/SaveSystem';

type SceneInitData = {
  profileId?: ProfileId;
};

type TouchMoveVector = {
  x: number;
  y: number;
};

type InteractionTarget = {
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

type PromptCloseHandler = (result: PromptCloseResult) => string | undefined;

const PRACTICE_SLIME_TEXTURE_KEY = 'practice-slime-v001';
const PRACTICE_SLIME_IDLE_ANIMATION = 'practice-slime-idle';
const PRACTICE_SLIME_HOP_ANIMATION = 'practice-slime-hop';
const CROP_BONUS_FEEDBACK_NAME = 'crop-bonus-feedback';

// Tile GIDs on the `farm` map's "Collision" layer (maps/farm.json, tileset
// eldoria-placeholder) that are impassable — fence/water/rock stand-ins in
// the current placeholder art. Update this list if the Collision layer's
// tile palette changes in Tiled.
const FARM_COLLISION_TILE_GIDS = [3, 4, 6];
export class WorldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'SPACE' | 'E' | 'I' | 'TAB', Phaser.Input.Keyboard.Key>;
  private touchMove: TouchMoveVector = { x: 0, y: 0 };
  private joystickOrigin: TouchMoveVector = { x: 0, y: 0 };
  private joystickPointer: Phaser.Input.Pointer | null = null;
  private joystickBase!: Phaser.GameObjects.Arc;
  private joystickKnob!: Phaser.GameObjects.Arc;
  private readonly joystickRadius = 42;
  private targets: InteractionTarget[] = [];
  private profileId: ProfileId = 'grade5-adventurer';
  private learning!: LearningBonusSystem;
  private gold = 0;
  private inventory: Record<string, number> = {};
  private mastery: LearningMastery = {};
  private farmQuest!: FarmQuestSystem;
  private busy = false;
  private statsPanelOpen = false;
  private statsContainer?: Phaser.GameObjects.Container;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private hudText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private practiceSlimeSprite?: Phaser.GameObjects.Sprite;
  private heroPresentation!: HeroPresentationController;
  private atmosphere!: AtmosphereController;

  constructor() {
    super('WorldScene');
  }

  init(data: SceneInitData): void {
    this.profileId = data.profileId ?? 'grade5-adventurer';
    this.learning = new LearningBonusSystem(this.profileId);
  }

  create(): void {
    this.cameras.main.setRoundPixels(true);

    const map = this.make.tilemap({ key: 'farm' });
    const tileset = map.addTilesetImage('eldoria-placeholder', 'tiles');

    if (!tileset) {
      throw new Error('Missing tileset: eldoria-placeholder');
    }

    map.createLayer('Ground', tileset, 0, 0);
    map.createLayer('Decor', tileset, 0, 0);

    const collisionLayer = map.createLayer('Collision', tileset, 0, 0);
    if (collisionLayer) {
      collisionLayer.setCollision(FARM_COLLISION_TILE_GIDS);
      collisionLayer.setVisible(false);
    }

    const objectLayer = map.getObjectLayer('Objects');
    const spawn = objectLayer?.objects.find((obj) => obj.name === 'PlayerSpawn');

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.player = this.physics.add.sprite(spawn?.x ?? 160, spawn?.y ?? 160, 'adventurer', 0);
    this.player.setCollideWorldBounds(true);
    this.player.body?.setSize(18, 18).setOffset(7, 12);

    if (collisionLayer) {
      this.physics.add.collider(this.player, collisionLayer);
    }

    this.targets = this.makeTargets(objectLayer?.objects ?? []);

    this.atmosphere = new AtmosphereController(this, GAME_WIDTH, GAME_HEIGHT);
    this.atmosphere.create(map.widthInPixels, map.heightInPixels);
    this.atmosphere.attachPlayerShadow(this.player);

    this.createPracticeSlimeAnimations();
    this.drawTargetMarkers();

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,SPACE,E,I,TAB') as Record<
      'W' | 'A' | 'S' | 'D' | 'SPACE' | 'E' | 'I' | 'TAB',
      Phaser.Input.Keyboard.Key
    >;
    this.input.keyboard!.addCapture(Phaser.Input.Keyboard.KeyCodes.TAB);

    const saved = SaveSystem.load(this.profileId);
    if (saved) {
      this.gold = saved.gold;
      this.inventory = { ...(saved.inventory ?? {}) };
      this.mastery = { ...(saved.mastery ?? {}) };
      this.player.setPosition(saved.player.x, saved.player.y);
    }

    this.farmQuest = FarmQuestSystem.fromSave(saved);

    this.heroPresentation = new HeroPresentationController(this, this.player, this.profileId);
    this.heroPresentation.create();

    this.createHud();
    this.createTouchControls();

    this.events.on(Phaser.Scenes.Events.PAUSE, this.stopPromptReadAloud, this);
    this.events.on(Phaser.Scenes.Events.SLEEP, this.stopPromptReadAloud, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.stopPromptReadAloud();
      this.resetJoystick();
      this.heroPresentation.dispose();
      this.atmosphere.dispose();
      this.events.off(Phaser.Scenes.Events.PAUSE, this.stopPromptReadAloud, this);
      this.events.off(Phaser.Scenes.Events.SLEEP, this.stopPromptReadAloud, this);
    });
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      this.stopPromptReadAloud();
    });

    if (!window.__ELDORIA_E2E__) {
      this.cameras.main.fadeIn(400, 0, 0, 0);
    }
  }

  update(): void {
    this.heroPresentation.syncPosition();
    this.atmosphere.update();

    if (this.busy && !this.statsPanelOpen) {
      this.player.setVelocity(0, 0);
      this.heroPresentation.setBusy();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.I) || Phaser.Input.Keyboard.JustDown(this.keys.TAB)) {
      this.toggleStatsPanel();
      return;
    }

    if (this.busy) {
      this.player.setVelocity(0, 0);
      this.heroPresentation.setBusy();
      return;
    }

    const speed = 125;
    const keyX = (this.cursors.right.isDown || this.keys.D.isDown ? 1 : 0)
      - (this.cursors.left.isDown || this.keys.A.isDown ? 1 : 0);
    const keyY = (this.cursors.down.isDown || this.keys.S.isDown ? 1 : 0)
      - (this.cursors.up.isDown || this.keys.W.isDown ? 1 : 0);
    const rawX = keyX + this.touchMove.x;
    const rawY = keyY + this.touchMove.y;
    const rawLength = Math.hypot(rawX, rawY);
    const inputX = rawLength > 1 ? rawX / rawLength : rawX;
    const inputY = rawLength > 1 ? rawY / rawLength : rawY;
    const isMoving = Math.abs(inputX) > 0.01 || Math.abs(inputY) > 0.01;

    this.player.setVelocity(inputX * speed, inputY * speed);

    if (isMoving) {
      this.heroPresentation.setMovement(facingFromVector(inputX, inputY), true);
    } else {
      this.heroPresentation.setIdle();
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.keys.E)) {
      this.handleActionInput();
    }

    this.updateHint();
  }

  private makeTargets(objects: Phaser.Types.Tilemaps.TiledObject[]): InteractionTarget[] {
    return objects
      .filter((obj) => obj.type === 'npc' || obj.type === 'bonus' || obj.type === 'enemy')
      .map((obj) => {
        const label = obj.name || obj.type || 'Target';
        const customId = getTiledProperty(obj, 'interactionId') as InteractionId | undefined;
        return {
          id: customId || resolveInteractionId(label),
          kind: obj.type === 'enemy' ? 'combat' : obj.type === 'bonus' ? 'farm' : 'quest',
          x: obj.x ?? 0,
          y: obj.y ?? 0,
          label
        } satisfies InteractionTarget;
      });
  }

  private drawTargetMarkers(): void {
    for (const target of this.targets) {
      this.atmosphere.addStaticShadow(target.x, target.y);

      if (target.id === 'practice-slime') {
        this.practiceSlimeSprite = this.add.sprite(
          target.x,
          target.y,
          PRACTICE_SLIME_TEXTURE_KEY,
          0
        )
          .setOrigin(0.5, 1)
          .setDepth(2)
          .play(PRACTICE_SLIME_IDLE_ANIMATION);
        continue;
      }

      const color = target.kind === 'combat' ? 0xaa3344 : target.kind === 'farm' ? 0x55aa33 : 0x4488cc;
      this.add.circle(target.x, target.y - 12, 6, color).setStrokeStyle(2, 0x1a1208);
      this.add.text(target.x, target.y - 30, target.label, {
        fontFamily: 'system-ui',
        fontSize: '9px',
        color: '#ffffff',
        stroke: '#1a1208',
        strokeThickness: 3
      }).setOrigin(0.5);
    }
  }

  private createPracticeSlimeAnimations(): void {
    if (!this.anims.exists(PRACTICE_SLIME_IDLE_ANIMATION)) {
      this.anims.create({
        key: PRACTICE_SLIME_IDLE_ANIMATION,
        frames: this.anims.generateFrameNumbers(PRACTICE_SLIME_TEXTURE_KEY, { start: 0, end: 3 }),
        frameRate: 3,
        repeat: -1
      });
    }

    if (!this.anims.exists(PRACTICE_SLIME_HOP_ANIMATION)) {
      this.anims.create({
        key: PRACTICE_SLIME_HOP_ANIMATION,
        frames: this.anims.generateFrameNumbers(PRACTICE_SLIME_TEXTURE_KEY, { start: 6, end: 11 }),
        frameRate: 10,
        repeat: 0
      });
    }
  }

  private playPracticeSlimeFeedback(kind: 'hop' | 'poof', onComplete?: () => void): void {
    const sprite = this.practiceSlimeSprite;
    if (!sprite || kind !== 'hop') {
      onComplete?.();
      return;
    }

    sprite.play(PRACTICE_SLIME_HOP_ANIMATION);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (sprite.active) {
        sprite.play(PRACTICE_SLIME_IDLE_ANIMATION);
      }
      onComplete?.();
    });
  }

  private playCropBonusFeedback(target: InteractionTarget, onComplete: () => void): void {
    const centerY = target.y - 12;
    const pulse = this.add.circle(target.x, centerY, 8, 0x8fd14f, 0.08)
      .setName(CROP_BONUS_FEEDBACK_NAME)
      .setStrokeStyle(2, 0xd7ff8f, 0.95)
      .setDepth(3);

    for (let index = 0; index < 4; index += 1) {
      const direction = index % 2 === 0 ? -1 : 1;
      const leaf = this.add.ellipse(
        target.x + direction * (4 + index * 2),
        centerY + 2,
        5,
        3,
        index < 2 ? 0x8fd14f : 0xffd666,
        0.95
      ).setDepth(3).setAngle(direction * 22);

      this.tweens.add({
        targets: leaf,
        x: leaf.x + direction * (8 + index * 2),
        y: leaf.y - 12 - index * 2,
        angle: leaf.angle + direction * 55,
        alpha: 0,
        duration: 420 + index * 20,
        ease: 'Sine.easeOut',
        onComplete: () => leaf.destroy()
      });
    }

    this.tweens.add({
      targets: pulse,
      scale: 2.4,
      alpha: 0,
      duration: 480,
      ease: 'Sine.easeOut',
      onComplete: () => {
        pulse.destroy();
        onComplete();
      }
    });
  }

  private createHud(): void {
    this.add.rectangle(GAME_WIDTH / 2, 14, GAME_WIDTH - 20, 24, 0x2a1a08, 0.9)
      .setScrollFactor(0)
      .setStrokeStyle(1, 0x6f5126);

    this.hudText = this.add.text(16, 7, '', {
      fontFamily: 'system-ui',
      fontSize: '12px',
      color: '#ffd666'
    }).setScrollFactor(0);

    const statsBtn = this.add.rectangle(GAME_WIDTH - 50, 14, 56, 16, 0x5f3d12, 0.9)
      .setStrokeStyle(1, 0xffd666)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    this.add.text(GAME_WIDTH - 50, 14, 'STATS', {
      fontFamily: 'system-ui',
      fontSize: '9px',
      color: '#ffd666',
      fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0);

    statsBtn.on('pointerdown', () => this.toggleStatsPanel());

    this.add.rectangle(GAME_WIDTH / 2, 42, GAME_WIDTH - 20, 28, 0x162a12, 0.9)
      .setScrollFactor(0)
      .setStrokeStyle(1, 0x5e9f3a);

    this.objectiveText = this.add.text(16, 34, '', {
      fontFamily: 'system-ui',
      fontSize: '11px',
      color: '#d7ffb8',
      wordWrap: { width: GAME_WIDTH - 32 }
    }).setScrollFactor(0);

    this.hintText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 18, '', {
      fontFamily: 'system-ui',
      fontSize: '11px',
      color: '#f5e6c8',
      backgroundColor: '#2a1a08',
      padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setScrollFactor(0);

    this.refreshHud();
    this.refreshObjective();
  }

  private refreshHud(): void {
    const profile = PROFILES[this.profileId];
    const charm = MIRA_FIRST_ERRAND.rewards.charm;
    const keepsake = (this.inventory[charm.key] ?? 0) > 0
      ? `  |  Keepsake: ${charm.name}`
      : '';

    this.hudText.setText(`${profile.label}  |  Gold: ${this.gold}${keepsake}`);
  }

  private refreshObjective(): void {
    this.objectiveText.setText(`Objective: ${this.farmQuest.currentObjective()}`);
  }

  private updateHint(): void {
    const target = this.nearestTarget();
    this.hintText.setText(target ? `Action: ${this.hintLabel(target)}` : 'Explore. Learning bonuses are optional.');
  }

  private hintLabel(target: InteractionTarget): string {
    return this.farmQuest.hintLabel(target.label);
  }

  private createTouchControls(): void {
    this.createDynamicJoystick();

    const action = this.add.circle(GAME_WIDTH - 54, GAME_HEIGHT - 52, 34, 0x5f3d12, 0.82)
      .setStrokeStyle(3, 0xffd666)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    this.add.text(GAME_WIDTH - 54, GAME_HEIGHT - 52, 'ACTION', {
      fontFamily: 'system-ui',
      fontSize: '10px',
      color: '#ffd666'
    }).setOrigin(0.5).setScrollFactor(0);

    action.on('pointerdown', () => this.handleActionInput());
  }

  private createDynamicJoystick(): void {
    this.joystickBase = this.add.circle(0, 0, this.joystickRadius, 0x5f3d12, 0.5)
      .setStrokeStyle(3, 0xffd666, 0.75)
      .setScrollFactor(0)
      .setVisible(false);
    this.joystickKnob = this.add.circle(0, 0, 16, 0xffd666, 0.82)
      .setStrokeStyle(2, 0x2a1a08)
      .setScrollFactor(0)
      .setVisible(false);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.startJoystick(pointer));
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.updateJoystick(pointer));
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => this.resetJoystick(pointer));
    this.input.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => this.resetJoystick(pointer));
  }

  private startJoystick(pointer: Phaser.Input.Pointer): void {
    if (this.busy || this.joystickPointer !== null || !this.isLowerLeftTouch(pointer)) {
      return;
    }

    this.joystickPointer = pointer;
    this.joystickOrigin = { x: pointer.x, y: pointer.y };
    this.joystickBase.setPosition(pointer.x, pointer.y).setVisible(true);
    this.joystickKnob.setPosition(pointer.x, pointer.y).setVisible(true);
    this.updateJoystick(pointer);
  }

  private updateJoystick(pointer: Phaser.Input.Pointer): void {
    if (this.joystickPointer !== pointer) {
      return;
    }

    const dx = pointer.x - this.joystickOrigin.x;
    const dy = pointer.y - this.joystickOrigin.y;
    const distance = Math.hypot(dx, dy);
    const clampedDistance = Math.min(distance, this.joystickRadius);
    const angle = Math.atan2(dy, dx);
    const knobX = this.joystickOrigin.x + Math.cos(angle) * clampedDistance;
    const knobY = this.joystickOrigin.y + Math.sin(angle) * clampedDistance;

    this.joystickKnob.setPosition(knobX, knobY);

    if (distance <= 0) {
      this.touchMove = { x: 0, y: 0 };
      return;
    }

    const inputStrength = clampedDistance / this.joystickRadius;
    this.touchMove = {
      x: Math.cos(angle) * inputStrength,
      y: Math.sin(angle) * inputStrength
    };
  }

  private resetJoystick(pointer?: Phaser.Input.Pointer): void {
    if (pointer && this.joystickPointer !== pointer) {
      return;
    }

    this.joystickPointer = null;
    this.touchMove = { x: 0, y: 0 };
    this.joystickBase?.setVisible(false);
    this.joystickKnob?.setVisible(false);
  }

  private isLowerLeftTouch(pointer: Phaser.Input.Pointer): boolean {
    return pointer.x <= GAME_WIDTH / 2 && pointer.y >= GAME_HEIGHT / 2;
  }

  private nearestTarget(): InteractionTarget | null {
    const px = this.player.x;
    const py = this.player.y;

    let best: InteractionTarget | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const target of this.targets) {
      const d = Phaser.Math.Distance.Between(px, py, target.x, target.y);
      if (d < 42 && d < bestDistance) {
        best = target;
        bestDistance = d;
      }
    }

    return best;
  }

  private handleActionInput(): void {
    if (this.heroPresentation.isHurtPlaying()) return;
    if (!this.tryInteract()) this.heroPresentation.playAction(this.busy);
  }

  // Interaction registry: maps a target's stable InteractionId to its handler.
  // Adding a future NPC/interactable means registering an entry here (and,
  // for a special sprite/marker, in drawTargetMarkers), not editing a chain
  // of label comparisons. 'generic-bonus' is the fallback every unmapped
  // target already used before this registry existed.
  private readonly interactionHandlers: Record<InteractionId, (target: InteractionTarget) => void> = {
    mira: () => this.handleMiraInteraction(),
    'crop-bonus': (target) => this.handleCropBonusInteraction(target),
    'practice-slime': (target) => this.handleSlimeInteraction(target),
    'generic-bonus': (target) => this.openBonusPrompt(target.kind, target.label)
  };

  private tryInteract(): boolean {
    if (this.busy) return false;

    const target = this.nearestTarget();
    if (!target) {
      this.showToast('Nothing to use here yet.');
      return false;
    }

    this.interactionHandlers[target.id](target);
    return true;
  }

  private handleMiraInteraction(): void {
    this.applyQuestOutcome(this.farmQuest.interactWithMira(), true);
  }

  private handleCropBonusInteraction(target: InteractionTarget): void {
    this.busy = true;
    this.resetJoystick();
    this.player.setVelocity(0, 0);
    this.playCropBonusFeedback(target, () => {
      this.openBonusPrompt(target.kind, target.label, () => {
        const outcome = this.farmQuest.completeCropInteraction();
        this.applyQuestOutcome(outcome, false);
        return outcome.message;
      });
    });
  }

  private handleSlimeInteraction(target: InteractionTarget): void {
    this.busy = true;
    this.resetJoystick();
    this.player.setVelocity(0, 0);
    this.playPracticeSlimeFeedback('hop', () => {
      this.openBonusPrompt(target.kind, target.label, () => {
        const outcome = this.farmQuest.completeSlimeInteraction();
        this.applyQuestOutcome(outcome, false);
        return outcome.message;
      });
    });
  }

  private setFirstQuestStep(step: StarterQuestStep): void {
    this.farmQuest.setFirstQuestStepForTest(step);
    this.refreshObjective();
    this.save();
  }

  private get firstQuestStep(): StarterQuestStep {
    return this.farmQuest.firstQuestStep;
  }

  private applyQuestOutcome(outcome: FarmQuestOutcome, persist: boolean): void {
    if (outcome.objectiveChanged) this.refreshObjective();

    let showSparkles = false;
    if (outcome.reward) {
      this.gold += outcome.reward.gold;
      this.showFloatingReward(`+${outcome.reward.gold} Gold`, this.player.x, this.player.y - 26, '#ffd666');
      if (outcome.reward.item) {
        const { key, name } = outcome.reward.item;
        this.inventory[key] = (this.inventory[key] ?? 0) + 1;
        this.showFloatingReward(`Received: ${name}`, this.player.x, this.player.y - 44, '#d7ffb8');
      }
      this.refreshHud();
      showSparkles = true;
    }

    if (outcome.foundItem) {
      this.showFloatingReward(`Found: ${outcome.foundItem}`, this.player.x, this.player.y - 26, '#d7ffb8');
      showSparkles = true;
    }

    if (showSparkles) this.createSparkleBurst(this.player.x, this.player.y - 14);
    if (outcome.toast) this.showToast(outcome.toast);
    if (persist && (outcome.stateChanged || outcome.reward)) this.save();
  }

  previewPrompt(templateId: string): LearningPrompt {
    if (!import.meta.env.DEV && !window.__ELDORIA_E2E__) {
      throw new Error('Prompt preview is available only in development and tests.');
    }
    if (this.busy) throw new Error('Cannot preview a prompt while another interaction is open.');

    const prompt = this.learning.makePromptById(templateId);
    this.openBonusPrompt(prompt.context, 'Prompt Preview', undefined, prompt);
    return prompt;
  }

  triggerGrade2HurtForTest(): boolean {
    if (!import.meta.env.DEV && !window.__ELDORIA_E2E__) {
      throw new Error('Grade 2 hurt preview is available only in development and tests.');
    }

    return this.heroPresentation.playHurtForPreview(this.busy);
  }

  private openBonusPrompt(
    context: BonusContext,
    label: string,
    onClose?: PromptCloseHandler,
    previewPrompt?: LearningPrompt
  ): void {
    this.busy = true;
    this.resetJoystick();
    this.player.setVelocity(0, 0);

    const isPreview = previewPrompt !== undefined;
    const prompt = previewPrompt ?? this.learning.makePrompt(context);
    const isAudioFirst = PROFILES[this.profileId].readingMode === 'audio-first';
    const panel = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setScrollFactor(0)
      .setDepth(30);
    const panelHeight = isAudioFirst ? 220 : 190;
    const titleY = isAudioFirst ? -84 : -72;
    const promptY = isAudioFirst ? -52 : -42;
    const choicesY = isAudioFirst ? 38 : 34;
    const skipY = isAudioFirst ? 94 : 82;

    const bg = this.add.rectangle(0, 0, 360, panelHeight, 0x2a1a08, 0.96)
      .setStrokeStyle(3, 0xffd666);
    panel.add(bg);

    panel.add(this.add.text(0, titleY, `${label}: optional learning bonus`, {
      fontFamily: 'system-ui',
      fontSize: '14px',
      color: '#ffd666'
    }).setOrigin(0.5));

    panel.add(this.add.text(0, promptY, prompt.text, {
      fontFamily: 'system-ui',
      fontSize: prompt.text.length > 55 ? '13px' : '17px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 324 }
    }).setOrigin(0.5));

    if (isAudioFirst) {
      const readButton = this.add.rectangle(0, -12, 132, 28, 0x3a4f8f)
        .setStrokeStyle(2, 0x99c7ff)
        .setInteractive({ useHandCursor: true });
      const readText = this.add.text(0, -12, 'READ ALOUD', {
        fontFamily: 'system-ui',
        fontSize: '11px',
        color: '#ffffff'
      }).setOrigin(0.5);

      readButton.on('pointerdown', () => this.readPromptAloud(label, prompt));
      panel.add(readButton);
      panel.add(readText);
    }

    const skipButton = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + skipY, 132, 28, 0x3a2208)
      .setStrokeStyle(2, 0xc9a66b)
      .setScrollFactor(0)
      .setDepth(31)
      .setInteractive({ useHandCursor: true });
    const skipText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + skipY, 'Skip bonus', {
      fontFamily: 'system-ui',
      fontSize: '12px',
      color: '#c9a66b'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(32);
    const destroyPrompt = (): void => {
      panel.destroy();
      skipButton.destroy();
      skipText.destroy();
    };

    prompt.choices.forEach((choice, index) => {
      const x = -110 + index * 110;
      const choiceLabel = String(choice);
      const btn = this.add.rectangle(x, choicesY, 102, 46, 0x5f3d12)
        .setStrokeStyle(2, 0xffd666)
        .setInteractive({ useHandCursor: true });

      const txt = this.add.text(x, choicesY, choiceLabel, {
        fontFamily: 'system-ui',
        fontSize: choiceLabel.length > 12 ? '9px' : '17px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: 92 }
      }).setOrigin(0.5);

      btn.on('pointerdown', () => {
        const result = this.learning.resolve(prompt, choice as AnswerValue);
        this.stopPromptReadAloud();
        destroyPrompt();

        if (isPreview) {
          this.busy = false;
          return;
        }

        if (result.correct) {
          this.applyReward(prompt);
        }

        this.mastery = MasterySystem.recordOutcome(
          this.mastery,
          prompt,
          result.correct ? 'correct' : 'wrong'
        );

        this.busy = false;
        const progressMessage = onClose?.({ answered: true, correct: result.correct });
        this.showToast(progressMessage ? `${result.message} ${progressMessage}` : result.message);
        this.save();
      });

      panel.add(btn);
      panel.add(txt);
    });

    skipButton.on('pointerdown', () => {
      this.stopPromptReadAloud();
      destroyPrompt();
      this.busy = false;
      if (isPreview) return;

      this.mastery = MasterySystem.recordOutcome(this.mastery, prompt, 'skipped');
      const progressMessage = onClose?.({ answered: false, correct: false });
      this.showToast(progressMessage ? `Skipped. ${progressMessage}` : 'Skipped. Adventure continues.');
      this.save();
    });
  }

  private readPromptAloud(label: string, prompt: LearningPrompt): void {
    if (!this.hasPromptReadAloudSupport()) {
      this.showToast('Read aloud is not available here.');
      return;
    }

    this.stopPromptReadAloud();

    const utterance = new SpeechSynthesisUtterance(this.makeReadAloudText(label, prompt));
    utterance.rate = 0.85;
    utterance.pitch = 1.05;

    // Prevent garbage collection mid-speech
    this.activeUtterance = utterance;
    utterance.onend = () => {
      if (this.activeUtterance === utterance) {
        this.activeUtterance = null;
      }
    };
    utterance.onerror = () => {
      if (this.activeUtterance === utterance) {
        this.activeUtterance = null;
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  private stopPromptReadAloud(): void {
    if (this.hasPromptReadAloudSupport()) {
      window.speechSynthesis.cancel();
    }
    this.activeUtterance = null;
  }

  private hasPromptReadAloudSupport(): boolean {
    return typeof window !== 'undefined'
      && 'speechSynthesis' in window
      && 'SpeechSynthesisUtterance' in window;
  }

  private makeReadAloudText(label: string, prompt: LearningPrompt): string {
    const readablePrompt = (prompt.readAloudText ?? prompt.text)
      .replaceAll('−', ' minus ')
      .replaceAll('×', ' times ')
      .replace(/\s*=\s*\?/g, ' equals what?')
      .replace(/\s+/g, ' ')
      .trim();
    const choices = prompt.choices.map(String).join(', ');

    return `${label} optional learning bonus. ${readablePrompt}. Choices are: ${choices}. Tap the answer to try for a bonus.`;
  }

  private applyReward(prompt: LearningPrompt): void {
    const goldReward = REWARD_KIND_GOLD_VALUE[prompt.rewardKind];

    this.gold += goldReward;

    this.refreshHud();

    if (goldReward > 0) {
      this.showFloatingReward(`+${goldReward} Gold`, this.player.x, this.player.y - 26, '#ffd666');
      this.createSparkleBurst(this.player.x, this.player.y - 12);
    }
  }

  private showFloatingReward(message: string, x: number, y: number, color: string): void {
    const text = this.add.text(x, y, message, {
      fontFamily: 'system-ui',
      fontSize: '12px',
      color,
      stroke: '#1a1208',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: text,
      y: y - 22,
      alpha: 0,
      duration: 1200,
      ease: 'Sine.easeOut',
      onComplete: () => text.destroy()
    });
  }

  private createSparkleBurst(x: number, y: number): void {
    const sparkleCount = 8;
    for (let index = 0; index < sparkleCount; index += 1) {
      const angle = (Math.PI * 2 * index) / sparkleCount;
      const sparkle = this.add.circle(x, y, 2, 0xfff0a3, 0.95).setDepth(19);
      this.tweens.add({
        targets: sparkle,
        x: x + Math.cos(angle) * 22,
        y: y + Math.sin(angle) * 16,
        alpha: 0,
        scale: 0.2,
        duration: 520,
        ease: 'Sine.easeOut',
        onComplete: () => sparkle.destroy()
      });
    }
  }

  private toggleStatsPanel(): void {
    if (this.statsPanelOpen) {
      this.closeStatsPanel();
    } else {
      if (this.busy) return;
      this.openStatsPanel();
    }
  }

  private openStatsPanel(): void {
    this.busy = true;
    this.statsPanelOpen = true;
    this.resetJoystick();
    this.player.setVelocity(0, 0);

    const panel = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setScrollFactor(0).setDepth(100);
    this.statsContainer = panel;

    const bg = this.add.rectangle(0, 0, 380, 240, 0x1a1208, 0.98)
      .setStrokeStyle(3, 0xffd666);
    panel.add(bg);

    const title = this.add.text(0, -100, 'STATS & MASTERY', {
      fontFamily: 'system-ui',
      fontSize: '15px',
      color: '#ffd666',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    panel.add(title);

    const divider = this.add.graphics();
    divider.lineStyle(1, 0x6f5126);
    divider.lineBetween(0, -80, 0, 80);
    panel.add(divider);

    // --- LEFT COLUMN: PROFILE & KEEPSAKES ---
    const profile = PROFILES[this.profileId];
    const profileName = this.add.text(-90, -70, profile.label, {
      fontFamily: 'system-ui',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    panel.add(profileName);

    const profileDesc = this.add.text(-90, -50, profile.readingMode === 'audio-first' ? 'Grade 2 Mage' : 'Grade 5 Adventurer', {
      fontFamily: 'system-ui',
      fontSize: '10px',
      color: '#c9a66b'
    }).setOrigin(0.5);
    panel.add(profileDesc);

    const goldLabel = this.add.text(-90, -16, `Gold: ${this.gold} 🪙`, {
      fontFamily: 'system-ui',
      fontSize: '12px',
      color: '#ffd666'
    }).setOrigin(0.5);
    panel.add(goldLabel);

    const keepsakeHeader = this.add.text(-90, 18, 'KEEPSAKES', {
      fontFamily: 'system-ui',
      fontSize: '11px',
      color: '#ffd666',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    panel.add(keepsakeHeader);

    const slotBg = this.add.rectangle(-90, 52, 40, 40, 0x2a1a08)
      .setStrokeStyle(2, 0x6f5126);
    panel.add(slotBg);

    const charm = MIRA_FIRST_ERRAND.rewards.charm;
    const hasCharm = (this.inventory[charm.key] ?? 0) > 0;
    if (hasCharm) {
      const charmText = this.add.text(-90, 52, '🍓', { fontSize: '20px' }).setOrigin(0.5);
      panel.add(charmText);
    }

    const charmLabel = this.add.text(-90, 82, hasCharm ? charm.name : '(Empty Slot)', {
      fontFamily: 'system-ui',
      fontSize: '9px',
      color: hasCharm ? '#d7ffb8' : '#6f5126'
    }).setOrigin(0.5);
    panel.add(charmLabel);

    // --- RIGHT COLUMN: CURRICULUM MASTERY ---
    const masteryHeader = this.add.text(90, -70, 'CURRICULUM MASTERY', {
      fontFamily: 'system-ui',
      fontSize: '12px',
      color: '#ffd666',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    panel.add(masteryHeader);

    const subjects = [
      { id: 'math', label: 'Math' },
      { id: 'ela', label: 'English (ELA)' },
      { id: 'science', label: 'Science' },
      { id: 'social', label: 'Social Studies' }
    ];

    subjects.forEach((subject, index) => {
      const yPos = -40 + index * 34;

      let correct = 0;
      let attempted = 0;
      for (const [key, record] of Object.entries(this.mastery)) {
        const parts = key.split(':');
        if (parts[1] === subject.id) {
          correct += record.correct;
          attempted += record.attempted;
        }
      }

      const percent = attempted > 0 ? (correct / attempted) : 0;

      const subLabel = this.add.text(90 - 70, yPos - 11, subject.label, {
        fontFamily: 'system-ui',
        fontSize: '10px',
        color: '#ffffff'
      }).setOrigin(0, 0.5);
      panel.add(subLabel);

      const subProgressText = this.add.text(90 + 70, yPos - 11, `${correct}/${attempted}`, {
        fontFamily: 'system-ui',
        fontSize: '10px',
        color: '#c9a66b'
      }).setOrigin(1, 0.5);
      panel.add(subProgressText);

      const barBg = this.add.rectangle(90, yPos, 140, 8, 0x2a1a08)
        .setStrokeStyle(1, 0x6f5126)
        .setOrigin(0.5);
      panel.add(barBg);

      if (percent > 0) {
        const barFill = this.add.rectangle(90 - 70, yPos, 140 * percent, 8, 0x5e9f3a)
          .setOrigin(0, 0.5);
        panel.add(barFill);
      }
    });

    // --- CLOSE BUTTON ---
    const closeBtn = this.add.rectangle(0, 100, 100, 24, 0x5f3d12)
      .setStrokeStyle(2, 0xffd666)
      .setInteractive({ useHandCursor: true });
    panel.add(closeBtn);

    const closeTxt = this.add.text(0, 100, 'CLOSE', {
      fontFamily: 'system-ui',
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5);
    panel.add(closeTxt);

    closeBtn.on('pointerdown', () => this.closeStatsPanel());
  }

  private closeStatsPanel(): void {
    if (!this.statsPanelOpen) return;
    if (this.statsContainer) {
      this.statsContainer.destroy();
      this.statsContainer = undefined;
    }
    this.statsPanelOpen = false;
    this.busy = false;
  }

  private showToast(message: string): void {
    const toast = this.add.text(GAME_WIDTH / 2, 66, message, {
      fontFamily: 'system-ui',
      fontSize: '13px',
      color: '#ffffff',
      backgroundColor: '#3a2208',
      padding: { x: 8, y: 5 },
      align: 'center',
      wordWrap: { width: GAME_WIDTH - 40 }
    }).setOrigin(0.5).setScrollFactor(0);

    this.tweens.add({
      targets: toast,
      y: 54,
      alpha: 0,
      duration: 2200,
      ease: 'Sine.easeInOut',
      onComplete: () => toast.destroy()
    });
  }

  private save(): void {
    const questSave = this.farmQuest.toSaveFields();
    SaveSystem.save({
      version: CURRENT_SAVE_VERSION,
      profileId: this.profileId,
      gold: this.gold,
      inventory: this.inventory,
      mastery: this.mastery,
      lastArea: 'farm',
      ...questSave,
      player: {
        x: this.player.x,
        y: this.player.y
      }
    });
  }
}
