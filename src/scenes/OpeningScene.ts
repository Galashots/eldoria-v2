import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_SCALE, GAME_WIDTH, LEGACY_GAME_HEIGHT, LEGACY_GAME_WIDTH, sx, sy } from '../gameDimensions';
import { DEFAULT_PROFILE, PROFILES, type ProfileId } from '../data/profiles';
import { drawRoundedButton, drawRoundedPanelBackground } from '../presentation/uiHelpers';
import { loadAudioMuted } from '../systems/AudioPreference';

const OPENING_SEEN_PREFIX = 'eldoria_v2_opening_seen_';
const SAVE_PREFIX = 'eldoria_v2_save_';
const TOTAL_HITS = 3;
const HERO_X = 108;
const HERO_Y = 224;
const GATE_X = 326;
const GATE_Y = 160;
const MAGE_IDLE_RIGHT = 'opening-grade2-mage-idle-right';
const MAGE_CAST_RIGHT = 'opening-grade2-mage-cast-right';

type OpeningSceneData = {
  profileId?: ProfileId;
};

export function shouldPlayOpening(profileId: ProfileId): boolean {
  try {
    const alreadySeen = localStorage.getItem(OPENING_SEEN_PREFIX + profileId) === 'true';
    const hasSave = localStorage.getItem(SAVE_PREFIX + profileId) !== null;
    return !alreadySeen && !hasSave;
  } catch {
    return true;
  }
}

function markOpeningSeen(profileId: ProfileId): void {
  try {
    localStorage.setItem(OPENING_SEEN_PREFIX + profileId, 'true');
  } catch {
    // This one-time presentation flag must never block entry into the game.
  }
}

/**
 * A short, non-random, skippable action beat before a profile's first farm
 * visit. It gives the player something immediately responsive to do without
 * adding a quest, reward economy, learning gate, or save-schema change.
 */
export class OpeningScene extends Phaser.Scene {
  private profileId: ProfileId = DEFAULT_PROFILE;
  private remainingHits = TOTAL_HITS;
  private inputLocked = false;
  private completed = false;
  private actionKey!: Phaser.Input.Keyboard.Key;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private instructionText!: Phaser.GameObjects.Text;
  private heroSprite?: Phaser.GameObjects.Sprite;
  private gateCore!: Phaser.GameObjects.Arc;
  private gateGlow!: Phaser.GameObjects.Arc;
  private gateOuter!: Phaser.GameObjects.Arc;
  private gateMiddle!: Phaser.GameObjects.Arc;
  private gateCracks!: Phaser.GameObjects.Graphics;
  private gateRunes: Phaser.GameObjects.Arc[] = [];
  private progressPips: Phaser.GameObjects.Arc[] = [];
  // Everything decorative (background, hero, gate, and every VFX burst) is
  // parented to this single container, scaled by GAME_SCALE, instead of
  // doubling each of the dozens of HERO_X/GATE_X-relative literals below by
  // hand. Only the screen-fixed controls (ACTION/SKIP) stay outside it.
  private worldContainer!: Phaser.GameObjects.Container;

  constructor() {
    super('OpeningScene');
  }

  /** Parents a freshly created game object to `worldContainer` and returns it, so creation chains read unchanged. */
  private toWorld<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.worldContainer.add(obj);
    return obj;
  }

  init(data: OpeningSceneData): void {
    this.profileId = data.profileId ?? DEFAULT_PROFILE;
    this.remainingHits = TOTAL_HITS;
    this.inputLocked = false;
    this.completed = false;
    this.heroSprite = undefined;
    this.gateRunes = [];
    this.progressPips = [];
  }

  create(): void {
    this.sound.mute = loadAudioMuted();
    this.worldContainer = this.add.container(0, 0).setScale(GAME_SCALE);
    this.drawBackground();
    this.drawHero();
    this.drawGate();
    this.drawInstructions();
    this.createControls();

    this.actionKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.actionKey)
      || Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.strikeGate();
    }
  }

  private drawBackground(): void {
    // Every literal below is in the original 480x320 design space
    // (LEGACY_GAME_WIDTH/HEIGHT, not the real doubled GAME_WIDTH/HEIGHT):
    // all of it is parented to worldContainer, which is scaled by
    // GAME_SCALE, so nothing here needs to be doubled by hand.
    const sky = this.toWorld(this.add.graphics());
    sky.fillGradientStyle(0x07101f, 0x07101f, 0x1a1730, 0x1a1730, 1, 1, 1, 1);
    sky.fillRect(0, 0, LEGACY_GAME_WIDTH, LEGACY_GAME_HEIGHT);

    const horizon = this.toWorld(this.add.graphics());
    horizon.fillGradientStyle(0x182e2b, 0x182e2b, 0x0b1d16, 0x0b1d16, 0.72, 0.72, 1, 1);
    horizon.fillRect(0, LEGACY_GAME_HEIGHT * 0.57, LEGACY_GAME_WIDTH, LEGACY_GAME_HEIGHT * 0.43);

    const hills = this.toWorld(this.add.graphics()).setDepth(0);
    hills.fillStyle(0x111f32, 0.9);
    hills.fillTriangle(0, 202, 84, 124, 172, 202);
    hills.fillTriangle(100, 202, 214, 112, 320, 202);
    hills.fillTriangle(250, 202, 386, 126, 480, 202);
    hills.fillStyle(0x0d291f, 0.95);
    for (let index = 0; index < 12; index += 1) {
      const x = index * 44 - 12;
      const height = 28 + (index % 4) * 7;
      hills.fillTriangle(x, 216, x + 16, 216 - height, x + 32, 216);
    }

    for (let index = 0; index < 24; index += 1) {
      const x = 12 + ((index * 83) % (LEGACY_GAME_WIDTH - 24));
      const y = 18 + ((index * 47) % 205);
      const color = index % 5 === 0 ? 0x9fd7ff : 0xffedaa;
      const mote = this.toWorld(this.add.circle(x, y, index % 4 === 0 ? 2 : 1, color, 0.18 + (index % 4) * 0.1))
        .setDepth(1);
      this.tweens.add({
        targets: mote,
        y: y - 8 - (index % 5) * 2,
        alpha: 0.06,
        duration: 1700 + index * 80,
        yoyo: true,
        repeat: -1,
        delay: index * 65,
        ease: 'Sine.easeInOut'
      });
    }

    const groundGlow = this.toWorld(this.add.ellipse(GATE_X, 235, 150, 34, 0x7757cc, 0.12)).setDepth(1);
    this.tweens.add({
      targets: groundGlow,
      scaleX: 1.14,
      alpha: 0.2,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private drawHero(): void {
    const isMage = this.profileId === 'grade2-mage';
    const accent = isMage ? 0x9fd7ff : 0xa9e783;

    const shadow = this.toWorld(this.add.ellipse(HERO_X, HERO_Y + 3, 68, 18, 0x05070d, 0.55)).setDepth(2);
    this.tweens.add({
      targets: shadow,
      scaleX: 1.05,
      alpha: 0.42,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.createMageAnimations();
    this.heroSprite = this.toWorld(this.add.sprite(HERO_X, HERO_Y, 'grade2-mage-idle-v001', 12))
      .setOrigin(0.5, 1)
      .setScale(2.25)
      .setDepth(4);

    if (isMage) {
      this.heroSprite.play(MAGE_IDLE_RIGHT);
    } else {
      // A detailed normalized hero proxy is preferable to the blocky 32x32
      // development placeholder in this high-focus scene. Tint + bow make the
      // temporary role clear until approved Ranger production art lands.
      this.heroSprite.setTint(0xb8d59a);
      const bow = this.toWorld(this.add.graphics()).setPosition(HERO_X + 29, HERO_Y - 43).setDepth(5);
      bow.lineStyle(3, accent, 1);
      bow.beginPath();
      bow.arc(0, 0, 22, Phaser.Math.DegToRad(-72), Phaser.Math.DegToRad(72));
      bow.strokePath();
      bow.lineStyle(1.5, 0xf5e6c8, 0.95);
      bow.beginPath();
      bow.moveTo(7, -21);
      bow.lineTo(7, 21);
      bow.strokePath();

      const quiver = this.toWorld(this.add.graphics()).setPosition(HERO_X - 17, HERO_Y - 55).setDepth(3);
      quiver.fillStyle(0x6b4423, 1);
      quiver.fillRoundedRect(-4, -9, 8, 24, 3);
      quiver.lineStyle(1.5, 0xd7ffb8, 0.9);
      quiver.beginPath();
      quiver.moveTo(-2, -8);
      quiver.lineTo(-6, -18);
      quiver.moveTo(2, -8);
      quiver.lineTo(6, -19);
      quiver.strokePath();
    }

    const heroAura = this.toWorld(this.add.circle(HERO_X + 22, HERO_Y - 52, 8, accent, 0.18))
      .setStrokeStyle(2, 0xffffff, 0.7)
      .setDepth(5);
    this.tweens.add({
      targets: heroAura,
      scale: 1.35,
      alpha: 0.5,
      duration: 780,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.toWorld(drawRoundedPanelBackground(this, HERO_X, 275, 150, 38, 0x17110d, 0x9b6b2e, 8)).setDepth(3);
    this.toWorld(this.add.circle(HERO_X - 55, 275, 12, isMage ? 0x5b3f9c : 0x315f36, 1))
      .setStrokeStyle(2, accent, 1)
      .setDepth(4);
    this.toWorld(this.add.text(HERO_X - 55, 275, isMage ? '✦' : '➶', {
      fontFamily: 'system-ui',
      fontSize: '15px',
      color: '#ffffff',
      fontStyle: 'bold'
    })).setOrigin(0.5).setDepth(5);
    this.toWorld(this.add.text(HERO_X - 34, 266, PROFILES[this.profileId].label, {
      fontFamily: 'system-ui',
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold'
    })).setDepth(5);
    this.toWorld(this.add.text(HERO_X - 34, 281, isMage ? 'Magic awakened' : 'Trail awakened', {
      fontFamily: 'system-ui',
      fontSize: '9px',
      color: '#ffd666'
    })).setDepth(5);
  }

  private createMageAnimations(): void {
    if (!this.anims.exists(MAGE_IDLE_RIGHT)) {
      this.anims.create({
        key: MAGE_IDLE_RIGHT,
        frames: this.anims.generateFrameNumbers('grade2-mage-idle-v001', { start: 12, end: 15 }),
        frameRate: 3,
        repeat: -1
      });
    }

    if (!this.anims.exists(MAGE_CAST_RIGHT)) {
      this.anims.create({
        key: MAGE_CAST_RIGHT,
        frames: this.anims.generateFrameNumbers('grade2-mage-cast-v001', { start: 12, end: 15 }),
        frameRate: 9,
        repeat: 0
      });
    }
  }

  private drawGate(): void {
    const isMage = this.profileId === 'grade2-mage';
    const accent = isMage ? 0x78cfff : 0x9fdf77;
    const magic = isMage ? 0x8f63ff : 0x72b95c;

    this.gateGlow = this.toWorld(this.add.circle(GATE_X, GATE_Y, 69, magic, 0.1)).setDepth(2);
    this.gateOuter = this.toWorld(this.add.circle(GATE_X, GATE_Y, 55, 0x0c1220, 0.96))
      .setStrokeStyle(7, 0x5d6682, 1)
      .setDepth(3);
    this.gateMiddle = this.toWorld(this.add.circle(GATE_X, GATE_Y, 42, 0x111a31, 0.98))
      .setStrokeStyle(4, accent, 0.82)
      .setDepth(3);
    const goldRing = this.toWorld(this.add.circle(GATE_X, GATE_Y, 30, 0x15102a, 0.98))
      .setStrokeStyle(3, 0xffd666, 0.82)
      .setDepth(4);
    this.gateCore = this.toWorld(this.add.circle(GATE_X, GATE_Y, 16, magic, 0.75))
      .setStrokeStyle(3, 0xeaf8ff, 0.95)
      .setDepth(5);

    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8 - Math.PI / 2;
      const rune = this.toWorld(this.add.circle(
        GATE_X + Math.cos(angle) * 47,
        GATE_Y + Math.sin(angle) * 47,
        4,
        0x26314d,
        1
      )).setStrokeStyle(1.5, accent, 0.6).setDepth(5);
      this.gateRunes.push(rune);
    }

    for (let index = 0; index < 7; index += 1) {
      const angle = (Math.PI * 2 * index) / 7 + 0.3;
      const radius = 72 + (index % 3) * 8;
      const shard = this.toWorld(this.add.rectangle(
        GATE_X + Math.cos(angle) * radius,
        GATE_Y + Math.sin(angle) * radius,
        7 + (index % 2) * 4,
        5 + (index % 3) * 2,
        0x5d6682,
        0.72
      )).setRotation(angle * 1.6).setDepth(3);
      this.tweens.add({
        targets: shard,
        rotation: shard.rotation + (index % 2 === 0 ? 0.35 : -0.35),
        y: shard.y - 4,
        duration: 1300 + index * 120,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    this.gateCracks = this.toWorld(this.add.graphics()).setDepth(6);

    this.tweens.add({
      targets: [this.gateGlow, this.gateMiddle, goldRing],
      scale: 1.06,
      alpha: { from: 0.76, to: 1 },
      duration: 880,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Deliberately NOT parented via toWorld(): Phaser's input hit-test for a
    // Zone's interactive bounds doesn't account for an ancestor container's
    // scale (only its position), so a zone inside worldContainer would
    // silently stop responding to real clicks/taps. Real screen coordinates
    // (GATE_X/GATE_Y * GAME_SCALE) instead, matching the gate's true
    // on-screen position.
    const gateZone = this.add.zone(GATE_X * GAME_SCALE, GATE_Y * GAME_SCALE, sx(142), sy(142))
      .setInteractive({ useHandCursor: true });
    gateZone.on('pointerdown', () => this.strikeGate());

    for (let index = 0; index < TOTAL_HITS; index += 1) {
      const pip = this.toWorld(this.add.circle(GATE_X - 24 + index * 24, 236, 7, 0x17110d, 1))
        .setStrokeStyle(2, 0xffd666, 0.95)
        .setDepth(6);
      this.progressPips.push(pip);
    }
  }

  private drawInstructions(): void {
    // LEGACY_GAME_WIDTH/2 (not GAME_WIDTH/2): these two titles are parented
    // to worldContainer alongside the hero/gate composition above.
    this.toWorld(this.add.text(LEGACY_GAME_WIDTH / 2, 24, 'BREAK THE WAKING GATE!', {
      fontFamily: 'system-ui',
      fontSize: '20px',
      color: '#ffd666',
      fontStyle: 'bold',
      stroke: '#1a1208',
      strokeThickness: 4
    })).setOrigin(0.5).setDepth(8);

    this.toWorld(this.add.text(LEGACY_GAME_WIDTH / 2, 52, 'Tap ACTION 3 times', {
      fontFamily: 'system-ui',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#111827',
      strokeThickness: 3
    })).setOrigin(0.5).setDepth(8);

    this.instructionText = this.toWorld(this.add.text(GATE_X, 266, '', {
      fontFamily: 'system-ui',
      fontSize: '12px',
      color: '#f5e6c8',
      fontStyle: 'bold',
      stroke: '#1a1208',
      strokeThickness: 3
    })).setOrigin(0.5).setDepth(8);
  }

  // Unlike everything above, these controls are real screen-space UI (not
  // parented to worldContainer) — their positions use the real GAME_WIDTH/
  // GAME_HEIGHT and their literal offsets/sizes are doubled via sx()/sy(),
  // matching WorldScene's own HUD/ACTION-button treatment.
  private createControls(): void {
    const actionGlow = this.add.circle(GAME_WIDTH - sx(54), GAME_HEIGHT - sy(48), sx(42), 0xffc94d, 0.12)
      .setDepth(7);
    this.tweens.add({
      targets: actionGlow,
      scale: 1.08,
      alpha: 0.28,
      duration: 720,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const action = this.add.circle(GAME_WIDTH - sx(54), GAME_HEIGHT - sy(48), sx(36), 0x5f3d12, 0.96)
      .setStrokeStyle(4, 0xffd666, 1)
      .setDepth(8)
      .setInteractive({ useHandCursor: true });
    this.add.text(GAME_WIDTH - sx(54), GAME_HEIGHT - sy(48), 'ACTION', {
      fontFamily: 'system-ui',
      fontSize: '22px',
      color: '#fff1b5',
      fontStyle: 'bold',
      stroke: '#3a2108',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(9);
    action.on('pointerdown', () => this.strikeGate());

    const skip = drawRoundedButton(this, GAME_WIDTH - sx(38), sy(20), sx(58), sy(22), 0x17110d, 0xc9a66b, 10)
      .setDepth(9);
    this.add.text(GAME_WIDTH - sx(38), sy(20), 'SKIP', {
      fontFamily: 'system-ui',
      fontSize: '18px',
      color: '#e5c88e',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(10);
    skip.on('pointerdown', () => this.skipOpening());
  }

  private strikeGate(): void {
    if (this.inputLocked || this.completed) return;

    this.inputLocked = true;
    this.remainingHits -= 1;
    this.sound.play('sfx-interact', { volume: 0.34 });
    this.playHeroAction();

    if (this.profileId === 'grade2-mage') {
      this.fireMageSpark();
    } else {
      this.fireRangerShot();
    }

    this.time.delayedCall(230, () => this.impactGate());
    this.time.delayedCall(430, () => {
      if (!this.completed) this.inputLocked = false;
    });
  }

  private playHeroAction(): void {
    if (!this.heroSprite) return;

    if (this.profileId === 'grade2-mage') {
      this.heroSprite.play(MAGE_CAST_RIGHT, true);
      this.heroSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (this.heroSprite?.active && !this.completed) this.heroSprite.play(MAGE_IDLE_RIGHT, true);
      });
      return;
    }

    this.tweens.add({
      targets: this.heroSprite,
      x: HERO_X + 5,
      angle: -4,
      duration: 90,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
  }

  private fireMageSpark(): void {
    const startX = HERO_X + 35;
    const startY = HERO_Y - 58;
    const spark = this.toWorld(this.add.circle(startX, startY, 7, 0x9fd7ff, 1))
      .setStrokeStyle(2, 0xffffff, 0.95)
      .setDepth(10);

    for (let index = 0; index < 5; index += 1) {
      const trail = this.toWorld(this.add.circle(startX - index * 5, startY + (index % 2 === 0 ? 2 : -2), 4 - index * 0.5, 0x8f63ff, 0.8))
        .setDepth(9);
      this.tweens.add({
        targets: trail,
        x: GATE_X - 18 - index * 3,
        y: GATE_Y + (index - 2) * 4,
        alpha: 0,
        scale: 0.35,
        duration: 240 + index * 20,
        ease: 'Quad.easeIn',
        onComplete: () => trail.destroy()
      });
    }

    this.tweens.add({
      targets: spark,
      x: GATE_X,
      y: GATE_Y,
      scale: 0.6,
      duration: 220,
      ease: 'Quad.easeIn',
      onComplete: () => spark.destroy()
    });
  }

  private fireRangerShot(): void {
    const shot = this.toWorld(this.add.rectangle(HERO_X + 38, HERO_Y - 43, 28, 4, 0xa9e783, 1))
      .setStrokeStyle(1, 0xffffff, 0.9)
      .setDepth(10);
    const trail = this.toWorld(this.add.rectangle(HERO_X + 24, HERO_Y - 43, 18, 2, 0xd7ffb8, 0.55)).setDepth(9);
    this.tweens.add({
      targets: [shot, trail],
      x: GATE_X,
      y: GATE_Y,
      rotation: 0.12,
      duration: 220,
      ease: 'Quad.easeIn',
      onComplete: () => {
        shot.destroy();
        trail.destroy();
      }
    });
  }

  private impactGate(): void {
    const isMage = this.profileId === 'grade2-mage';
    const accent = isMage ? 0x9fd7ff : 0xa9e783;
    const completedHits = TOTAL_HITS - this.remainingHits;

    this.progressPips.forEach((pip, index) => {
      if (index < completedHits) {
        pip.setFillStyle(accent, 1).setStrokeStyle(2, 0xffffff, 1);
      }
    });

    this.gateRunes.forEach((rune, index) => {
      if (index < completedHits * 3) {
        rune.setFillStyle(accent, 1).setStrokeStyle(1.5, 0xffffff, 0.95);
      }
    });

    this.drawGateCracks(completedHits, accent);
    this.createImpactBurst(accent, completedHits);

    this.cameras.main.shake(105 + completedHits * 25, 0.004 + completedHits * 0.0015);
    this.gateCore.setFillStyle(accent, 0.95).setScale(1 + completedHits * 0.08);
    this.gateGlow.setAlpha(0.16 + completedHits * 0.08);
    this.gateOuter.setStrokeStyle(7, completedHits >= 2 ? 0x9a6cff : 0x697693, 1);
    this.gateMiddle.setStrokeStyle(4, accent, 1);

    if (this.remainingHits <= 0) {
      this.completeOpening();
      return;
    }

    this.instructionText.setText(completedHits === 1 ? 'Gate weakening!' : 'One more hit!');
  }

  private drawGateCracks(completedHits: number, accent: number): void {
    this.gateCracks.clear();
    this.gateCracks.lineStyle(2, accent, 0.95);

    const crackSets = [
      [[0, -18], [8, -27], [4, -38], [13, -47]],
      [[15, 3], [27, 9], [34, 4], [45, 14]],
      [[-11, 14], [-20, 26], [-16, 37], [-30, 45]]
    ];

    for (let setIndex = 0; setIndex < completedHits; setIndex += 1) {
      const points = crackSets[setIndex];
      this.gateCracks.beginPath();
      this.gateCracks.moveTo(GATE_X + points[0][0], GATE_Y + points[0][1]);
      for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
        this.gateCracks.lineTo(GATE_X + points[pointIndex][0], GATE_Y + points[pointIndex][1]);
      }
      this.gateCracks.strokePath();
    }
  }

  private createImpactBurst(accent: number, completedHits: number): void {
    const ring = this.toWorld(this.add.circle(GATE_X, GATE_Y, 17, accent, 0.08))
      .setStrokeStyle(4, 0xffffff, 0.95)
      .setDepth(11);
    this.tweens.add({
      targets: ring,
      scale: 3.2 + completedHits * 0.35,
      alpha: 0,
      duration: 380,
      ease: 'Sine.easeOut',
      onComplete: () => ring.destroy()
    });

    const particleCount = 8 + completedHits * 3;
    for (let index = 0; index < particleCount; index += 1) {
      const angle = (Math.PI * 2 * index) / particleCount;
      const particle = this.toWorld(this.add.circle(GATE_X, GATE_Y, index % 3 === 0 ? 3 : 2, index % 2 === 0 ? accent : 0xffd666, 1))
        .setDepth(12);
      this.tweens.add({
        targets: particle,
        x: GATE_X + Math.cos(angle) * (30 + completedHits * 10 + (index % 3) * 5),
        y: GATE_Y + Math.sin(angle) * (24 + completedHits * 8 + (index % 3) * 4),
        alpha: 0,
        scale: 0.25,
        duration: 330 + index * 16,
        ease: 'Sine.easeOut',
        onComplete: () => particle.destroy()
      });
    }
  }

  private completeOpening(): void {
    this.completed = true;
    markOpeningSeen(this.profileId);
    this.sound.play('sfx-reward', { volume: 0.48 });
    this.instructionText.setText('THE GATE IS OPEN!');
    this.instructionText.setColor('#ffd666').setFontStyle('bold').setFontSize(16);

    for (let index = 0; index < 22; index += 1) {
      const angle = (Math.PI * 2 * index) / 22;
      const sparkle = this.toWorld(this.add.circle(GATE_X, GATE_Y, index % 4 === 0 ? 4 : 2, index % 2 === 0 ? 0xfff0a3 : 0x9fd7ff, 1))
        .setDepth(13);
      this.tweens.add({
        targets: sparkle,
        x: GATE_X + Math.cos(angle) * (54 + (index % 4) * 13),
        y: GATE_Y + Math.sin(angle) * (44 + (index % 4) * 10),
        alpha: 0,
        scale: 0.2,
        duration: 650,
        ease: 'Sine.easeOut',
        onComplete: () => sparkle.destroy()
      });
    }

    this.tweens.add({
      targets: [this.gateCore, this.gateGlow],
      scale: 1.62,
      alpha: 1,
      duration: 430,
      ease: 'Back.easeOut'
    });

    this.time.delayedCall(680, () => {
      this.cameras.main.fadeOut(300, 12, 10, 18);
      this.time.delayedCall(320, () => this.scene.start('WorldScene', {
        profileId: this.profileId,
        fromOpening: true
      }));
    });
  }

  private skipOpening(): void {
    if (this.completed) return;
    this.completed = true;
    markOpeningSeen(this.profileId);
    this.scene.start('WorldScene', { profileId: this.profileId, fromOpening: true });
  }
}
