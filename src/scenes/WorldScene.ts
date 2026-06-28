import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../gameConfig';
import type { AnswerValue, BonusContext, LearningPrompt } from '../data/curriculum';
import { PROFILES, type ProfileId } from '../data/profiles';
import { MIRA_FIRST_ERRAND } from '../data/quests';
import { LearningBonusSystem } from '../systems/LearningBonusSystem';
import { MasterySystem, type LearningMastery } from '../systems/MasterySystem';
import { SaveSystem, type StarterQuestStep } from '../systems/SaveSystem';

type SceneInitData = {
  profileId?: ProfileId;
};

type TouchMoveVector = {
  x: number;
  y: number;
};

type InteractionTarget = {
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

type HeroFacing = 'front' | 'back' | 'left' | 'right';
type HeroMotion = 'idle' | 'walk';

const PRACTICE_SLIME_TEXTURE_KEY = 'practice-slime-v001';
const PRACTICE_SLIME_IDLE_ANIMATION = 'practice-slime-idle';
const PRACTICE_SLIME_HOP_ANIMATION = 'practice-slime-hop';
const CROP_BONUS_FEEDBACK_NAME = 'crop-bonus-feedback';
const GRADE2_MAGE_IDLE_TEXTURE_KEY = 'grade2-mage-idle-v001';
const GRADE2_MAGE_WALK_TEXTURE_KEY = 'grade2-mage-walk-v001';
const GRADE2_MAGE_IDLE_ANIMATIONS: Record<HeroFacing, string> = {
  front: 'grade2-mage-idle-front',
  back: 'grade2-mage-idle-back',
  left: 'grade2-mage-idle-left',
  right: 'grade2-mage-idle-right'
};
const GRADE2_MAGE_WALK_ANIMATIONS: Record<HeroFacing, string> = {
  front: 'grade2-mage-walk-front',
  back: 'grade2-mage-walk-back',
  left: 'grade2-mage-walk-left',
  right: 'grade2-mage-walk-right'
};

export class WorldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'SPACE' | 'E', Phaser.Input.Keyboard.Key>;
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
  private firstQuestStep: StarterQuestStep = MIRA_FIRST_ERRAND.steps.talkToMira;
  private busy = false;
  private hudText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private practiceSlimeSprite?: Phaser.GameObjects.Sprite;
  private grade2HeroSprite?: Phaser.GameObjects.Sprite;
  private heroFacing: HeroFacing = 'front';
  private heroMotion: HeroMotion = 'idle';

  constructor() {
    super('WorldScene');
  }

  init(data: SceneInitData): void {
    this.profileId = data.profileId ?? 'grade5-adventurer';
    this.learning = new LearningBonusSystem(this.profileId);
    this.grade2HeroSprite = undefined;
    this.heroFacing = 'front';
    this.heroMotion = 'idle';
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
      collisionLayer.setCollision([3, 4, 6]);
      collisionLayer.setVisible(false);
    }

    const objectLayer = map.getObjectLayer('Objects');
    const spawn = objectLayer?.objects.find((obj) => obj.name === 'PlayerSpawn');

    this.player = this.physics.add.sprite(spawn?.x ?? 160, spawn?.y ?? 160, 'adventurer', 0);
    this.player.setCollideWorldBounds(true);
    this.player.body?.setSize(18, 18).setOffset(7, 12);

    if (collisionLayer) {
      this.physics.add.collider(this.player, collisionLayer);
    }

    this.targets = this.makeTargets(objectLayer?.objects ?? []);
    this.createPracticeSlimeAnimations();
    this.drawTargetMarkers();

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,SPACE,E') as Record<
      'W' | 'A' | 'S' | 'D' | 'SPACE' | 'E',
      Phaser.Input.Keyboard.Key
    >;

    const saved = SaveSystem.load(this.profileId);
    if (saved) {
      this.gold = saved.gold;
      this.inventory = { ...(saved.inventory ?? {}) };
      this.mastery = { ...(saved.mastery ?? {}) };
      this.player.setPosition(saved.player.x, saved.player.y);
      this.firstQuestStep = saved.firstQuestStep ?? MIRA_FIRST_ERRAND.steps.talkToMira;
    }

    this.createGrade2HeroPresentation();

    this.createHud();
    this.createTouchControls();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.stopPromptReadAloud();
      this.resetJoystick();
    });
  }

  update(): void {
    this.syncGrade2HeroPresentation();

    if (this.busy) {
      this.player.setVelocity(0, 0);
      this.setGrade2HeroAnimation(this.heroFacing, 'idle');
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
      const facing: HeroFacing = inputX < -0.35
        ? 'left'
        : inputX > 0.35
          ? 'right'
          : inputY < 0
            ? 'back'
            : 'front';

      if (this.grade2HeroSprite) {
        this.setGrade2HeroAnimation(facing, 'walk');
      } else {
        this.player.setFrame(facing === 'left' ? 2 : facing === 'right' ? 3 : facing === 'back' ? 1 : 0);
      }
    } else {
      this.setGrade2HeroAnimation(this.heroFacing, 'idle');
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.keys.E)) {
      this.tryInteract();
    }

    this.updateHint();
  }

  private makeTargets(objects: Phaser.Types.Tilemaps.TiledObject[]): InteractionTarget[] {
    return objects
      .filter((obj) => obj.type === 'npc' || obj.type === 'bonus' || obj.type === 'enemy')
      .map((obj) => ({
        kind: obj.type === 'enemy' ? 'combat' : obj.type === 'bonus' ? 'farm' : 'quest',
        x: obj.x ?? 0,
        y: obj.y ?? 0,
        label: obj.name || obj.type || 'Target'
      }));
  }

  private createGrade2HeroPresentation(): void {
    if (this.profileId !== 'grade2-mage') return;

    const idleClips: Array<{ facing: HeroFacing; start: number; end: number }> = [
      { facing: 'front', start: 0, end: 3 },
      { facing: 'back', start: 4, end: 7 },
      { facing: 'left', start: 8, end: 11 },
      { facing: 'right', start: 12, end: 15 }
    ];

    for (const clip of idleClips) {
      const key = GRADE2_MAGE_IDLE_ANIMATIONS[clip.facing];
      if (!this.anims.exists(key)) {
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(GRADE2_MAGE_IDLE_TEXTURE_KEY, {
            start: clip.start,
            end: clip.end
          }),
          frameRate: 3,
          repeat: -1
        });
      }
    }

    const walkClips: Array<{ facing: HeroFacing; start: number; end: number }> = [
      { facing: 'front', start: 0, end: 5 },
      { facing: 'back', start: 6, end: 11 },
      { facing: 'left', start: 12, end: 17 },
      { facing: 'right', start: 18, end: 23 }
    ];

    for (const clip of walkClips) {
      const key = GRADE2_MAGE_WALK_ANIMATIONS[clip.facing];
      if (!this.anims.exists(key)) {
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(GRADE2_MAGE_WALK_TEXTURE_KEY, {
            start: clip.start,
            end: clip.end
          }),
          frameRate: 8,
          repeat: -1
        });
      }
    }

    this.player.setVisible(false);
    this.grade2HeroSprite = this.add.sprite(
      this.player.x,
      this.player.y + 16,
      GRADE2_MAGE_IDLE_TEXTURE_KEY,
      0
    )
      .setOrigin(0.5, 1)
      .setDepth(3)
      .play(GRADE2_MAGE_IDLE_ANIMATIONS.front);
  }

  private setGrade2HeroAnimation(facing: HeroFacing, motion: HeroMotion): void {
    if (!this.grade2HeroSprite || (facing === this.heroFacing && motion === this.heroMotion)) return;

    this.heroFacing = facing;
    this.heroMotion = motion;
    const animations = motion === 'walk' ? GRADE2_MAGE_WALK_ANIMATIONS : GRADE2_MAGE_IDLE_ANIMATIONS;
    this.grade2HeroSprite.play(animations[facing]);
  }

  private syncGrade2HeroPresentation(): void {
    this.grade2HeroSprite?.setPosition(this.player.x, this.player.y + 16);
  }

  private drawTargetMarkers(): void {
    for (const target of this.targets) {
      if (target.label === MIRA_FIRST_ERRAND.targets.practiceSlime) {
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
    this.objectiveText.setText(`Objective: ${this.firstQuestObjective()}`);
  }

  private firstQuestObjective(): string {
    return MIRA_FIRST_ERRAND.objectives[this.firstQuestStep];
  }

  private updateHint(): void {
    const target = this.nearestTarget();
    this.hintText.setText(target ? `Action: ${target.label}` : 'Explore. Learning bonuses are optional.');
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

    action.on('pointerdown', () => this.tryInteract());
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

  private tryInteract(): void {
    if (this.busy) return;

    const target = this.nearestTarget();
    if (!target) {
      this.showToast('Nothing to use here yet.');
      return;
    }

    if (target.label === MIRA_FIRST_ERRAND.targets.mira) {
      this.handleMiraInteraction();
      return;
    }

    if (target.label === MIRA_FIRST_ERRAND.targets.cropBonus) {
      this.busy = true;
      this.resetJoystick();
      this.player.setVelocity(0, 0);
      this.playCropBonusFeedback(target, () => {
        this.openBonusPrompt(target.kind, target.label, () => {
          if (this.firstQuestStep === MIRA_FIRST_ERRAND.steps.tryCropBonus) {
            this.setFirstQuestStep(MIRA_FIRST_ERRAND.steps.findSlime);
            return MIRA_FIRST_ERRAND.progress.cropComplete;
          }
          return undefined;
        });
      });
      return;
    }

    if (target.label === MIRA_FIRST_ERRAND.targets.practiceSlime) {
      this.busy = true;
      this.resetJoystick();
      this.player.setVelocity(0, 0);
      this.playPracticeSlimeFeedback('hop', () => {
        this.openBonusPrompt(target.kind, target.label, () => {
          if (this.firstQuestStep === MIRA_FIRST_ERRAND.steps.findSlime) {
            this.setFirstQuestStep(MIRA_FIRST_ERRAND.steps.returnToMira);
            return MIRA_FIRST_ERRAND.progress.slimeComplete;
          }
          return undefined;
        });
      });
      return;
    }

    this.openBonusPrompt(target.kind, target.label);
  }

  private handleMiraInteraction(): void {
    switch (this.firstQuestStep) {
      case MIRA_FIRST_ERRAND.steps.talkToMira:
        this.setFirstQuestStep(MIRA_FIRST_ERRAND.steps.tryCropBonus);
        this.showToast(MIRA_FIRST_ERRAND.dialogue.start);
        return;
      case MIRA_FIRST_ERRAND.steps.tryCropBonus:
        this.showToast(MIRA_FIRST_ERRAND.dialogue.cropReminder);
        return;
      case MIRA_FIRST_ERRAND.steps.findSlime:
        this.showToast(MIRA_FIRST_ERRAND.dialogue.slimeReminder);
        return;
      case MIRA_FIRST_ERRAND.steps.returnToMira: {
        const { gold, charm } = MIRA_FIRST_ERRAND.rewards;
        this.gold += gold;
        this.inventory[charm.key] = (this.inventory[charm.key] ?? 0) + 1;
        this.setFirstQuestStep(MIRA_FIRST_ERRAND.steps.complete);
        this.refreshHud();
        this.showFloatingReward(`+${gold} Gold`, this.player.x, this.player.y - 26, '#ffd666');
        this.showFloatingReward(`Received: ${charm.name}`, this.player.x, this.player.y - 44, '#d7ffb8');
        this.createSparkleBurst(this.player.x, this.player.y - 14);
        this.showToast(MIRA_FIRST_ERRAND.completionToast);
        return;
      }
      case MIRA_FIRST_ERRAND.steps.complete:
        this.showToast(MIRA_FIRST_ERRAND.dialogue.complete);
        return;
    }
  }

  private setFirstQuestStep(step: StarterQuestStep): void {
    this.firstQuestStep = step;
    this.refreshObjective();
    this.save();
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
    const panel = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setScrollFactor(0);
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
        panel.destroy();

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

    const skip = this.add.text(0, skipY, 'Skip bonus', {
      fontFamily: 'system-ui',
      fontSize: '12px',
      color: '#c9a66b'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    skip.on('pointerdown', () => {
      this.stopPromptReadAloud();
      panel.destroy();
      this.busy = false;
      if (isPreview) return;

      this.mastery = MasterySystem.recordOutcome(this.mastery, prompt, 'skipped');
      const progressMessage = onClose?.({ answered: false, correct: false });
      this.showToast(progressMessage ? `Skipped. ${progressMessage}` : 'Skipped. Adventure continues.');
      this.save();
    });

    panel.add(skip);
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
    window.speechSynthesis.speak(utterance);
  }

  private stopPromptReadAloud(): void {
    if (this.hasPromptReadAloudSupport()) {
      window.speechSynthesis.cancel();
    }
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
    let goldReward = 0;
    if (prompt.rewardKind === 'bonus-gold') goldReward = 5;
    if (prompt.rewardKind === 'bonus-harvest') goldReward = 3;
    if (prompt.rewardKind === 'critical-hit') goldReward = 2;
    if (prompt.rewardKind === 'bonus-xp') goldReward = 1;

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
    SaveSystem.save({
      version: 1,
      profileId: this.profileId,
      gold: this.gold,
      inventory: this.inventory,
      mastery: this.mastery,
      lastArea: 'farm',
      firstQuestStep: this.firstQuestStep,
      questFlags: {
        miraFirstErrandComplete: this.firstQuestStep === MIRA_FIRST_ERRAND.steps.complete
      },
      player: {
        x: this.player.x,
        y: this.player.y
      }
    });
  }
}
