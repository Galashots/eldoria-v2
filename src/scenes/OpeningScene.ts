import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../gameConfig';
import { DEFAULT_PROFILE, PROFILES, type ProfileId } from '../data/profiles';
import { drawRoundedButton } from '../presentation/uiHelpers';
import { loadAudioMuted } from '../systems/AudioPreference';

const OPENING_SEEN_PREFIX = 'eldoria_v2_opening_seen_';
const SAVE_PREFIX = 'eldoria_v2_save_';
const TOTAL_HITS = 3;
const HERO_X = 108;
const HERO_Y = 170;
const GATE_X = 324;
const GATE_Y = 158;

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
  private gateCore!: Phaser.GameObjects.Arc;
  private gateGlow!: Phaser.GameObjects.Arc;
  private progressPips: Phaser.GameObjects.Arc[] = [];

  constructor() {
    super('OpeningScene');
  }

  init(data: OpeningSceneData): void {
    this.profileId = data.profileId ?? DEFAULT_PROFILE;
    this.remainingHits = TOTAL_HITS;
    this.inputLocked = false;
    this.completed = false;
    this.progressPips = [];
  }

  create(): void {
    this.sound.mute = loadAudioMuted();
    this.drawBackground();
    this.drawHeroEmblem();
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
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x111b2e, 0x111b2e, 0x2a1a08, 0x2a1a08, 1, 1, 1, 1);
    sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const horizon = this.add.graphics();
    horizon.fillGradientStyle(0x23452f, 0x23452f, 0x0f2418, 0x0f2418, 0.5, 0.5, 0.9, 0.9);
    horizon.fillRect(0, GAME_HEIGHT * 0.58, GAME_WIDTH, GAME_HEIGHT * 0.42);

    for (let index = 0; index < 18; index += 1) {
      const x = 18 + ((index * 79) % (GAME_WIDTH - 36));
      const y = 28 + ((index * 47) % 210);
      const mote = this.add.circle(x, y, index % 3 === 0 ? 2 : 1, 0xffedaa, 0.2 + (index % 4) * 0.12);
      this.tweens.add({
        targets: mote,
        y: y - 10 - (index % 4) * 3,
        alpha: 0.08,
        duration: 1800 + index * 90,
        yoyo: true,
        repeat: -1,
        delay: index * 70,
        ease: 'Sine.easeInOut'
      });
    }
  }

  private drawHeroEmblem(): void {
    const isMage = this.profileId === 'grade2-mage';
    const accent = isMage ? 0x9fd7ff : 0xa9e783;
    const bodyColor = isMage ? 0x5b3f9c : 0x315f36;
    const hero = this.add.graphics().setPosition(HERO_X, HERO_Y).setDepth(3);

    hero.fillStyle(0xf0c8a0, 1);
    hero.fillCircle(0, -30, 15);
    hero.fillStyle(bodyColor, 1);
    hero.fillTriangle(-24, 30, 24, 30, 0, -18);
    hero.lineStyle(3, accent, 1);

    if (isMage) {
      hero.strokeCircle(0, -30, 20);
      hero.beginPath();
      hero.moveTo(24, 28);
      hero.lineTo(34, -28);
      hero.strokePath();
      hero.fillStyle(accent, 1);
      hero.fillCircle(35, -32, 6);
    } else {
      hero.beginPath();
      hero.arc(18, -2, 26, Phaser.Math.DegToRad(-72), Phaser.Math.DegToRad(72));
      hero.strokePath();
      hero.beginPath();
      hero.moveTo(25, -27);
      hero.lineTo(25, 23);
      hero.strokePath();
      hero.beginPath();
      hero.moveTo(6, -2);
      hero.lineTo(40, -2);
      hero.strokePath();
    }

    this.add.text(HERO_X, HERO_Y + 46, PROFILES[this.profileId].label, {
      fontFamily: 'system-ui',
      fontSize: '15px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(3);
  }

  private drawGate(): void {
    const isMage = this.profileId === 'grade2-mage';
    const accent = isMage ? 0x9fd7ff : 0xa9e783;

    this.gateGlow = this.add.circle(GATE_X, GATE_Y, 56, accent, 0.12).setDepth(2);
    const outer = this.add.circle(GATE_X, GATE_Y, 48, 0x11131c, 0.75)
      .setStrokeStyle(5, accent, 0.75)
      .setDepth(3);
    const middle = this.add.circle(GATE_X, GATE_Y, 34, 0x152238, 0.92)
      .setStrokeStyle(3, 0xffd666, 0.72)
      .setDepth(3);
    this.gateCore = this.add.circle(GATE_X, GATE_Y, 17, accent, 0.58)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setDepth(4);

    this.tweens.add({
      targets: [this.gateGlow, outer, middle],
      scale: 1.08,
      alpha: { from: 0.72, to: 1 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const gateZone = this.add.zone(GATE_X, GATE_Y, 128, 128)
      .setInteractive({ useHandCursor: true });
    gateZone.on('pointerdown', () => this.strikeGate());

    this.add.text(GATE_X, 86, 'THE WAKING GATE', {
      fontFamily: 'system-ui',
      fontSize: '15px',
      color: '#ffd666',
      fontStyle: 'bold',
      stroke: '#1a1208',
      strokeThickness: 3
    }).setOrigin(0.5);

    for (let index = 0; index < TOTAL_HITS; index += 1) {
      const pip = this.add.circle(GATE_X - 24 + index * 24, 226, 6, 0x251b12, 1)
        .setStrokeStyle(2, accent, 0.8);
      this.progressPips.push(pip);
    }
  }

  private drawInstructions(): void {
    const isMage = this.profileId === 'grade2-mage';
    this.add.text(GAME_WIDTH / 2, 24, 'Old magic blocks the path!', {
      fontFamily: 'system-ui',
      fontSize: '20px',
      color: '#ffd666',
      fontStyle: 'bold',
      stroke: '#1a1208',
      strokeThickness: 4
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 52, 'TAP THE GLOW 3 TIMES', {
      fontFamily: 'system-ui',
      fontSize: '17px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.instructionText = this.add.text(GAME_WIDTH / 2, 252,
      isMage ? 'Cast three spell sparks.' : 'Fire three tracking shots.', {
        fontFamily: 'system-ui',
        fontSize: '13px',
        color: '#f5e6c8'
      }).setOrigin(0.5);
  }

  private createControls(): void {
    const action = this.add.circle(GAME_WIDTH - 54, GAME_HEIGHT - 48, 34, 0x5f3d12, 0.88)
      .setStrokeStyle(3, 0xffd666, 1)
      .setInteractive({ useHandCursor: true });
    this.add.text(GAME_WIDTH - 54, GAME_HEIGHT - 48, 'ACTION', {
      fontFamily: 'system-ui',
      fontSize: '10px',
      color: '#ffd666',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    action.on('pointerdown', () => this.strikeGate());

    const skip = drawRoundedButton(this, GAME_WIDTH - 38, 20, 58, 22, 0x2a1a08, 0xc9a66b, 5);
    this.add.text(GAME_WIDTH - 38, 20, 'SKIP', {
      fontFamily: 'system-ui',
      fontSize: '9px',
      color: '#c9a66b',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    skip.on('pointerdown', () => this.skipOpening());
  }

  private strikeGate(): void {
    if (this.inputLocked || this.completed) return;

    this.inputLocked = true;
    this.remainingHits -= 1;
    this.sound.play('sfx-interact', { volume: 0.34 });

    if (this.profileId === 'grade2-mage') {
      this.fireMageSpark();
    } else {
      this.fireRangerShot();
    }

    this.time.delayedCall(230, () => this.impactGate());
    this.time.delayedCall(360, () => {
      if (!this.completed) this.inputLocked = false;
    });
  }

  private fireMageSpark(): void {
    const spark = this.add.circle(HERO_X + 30, HERO_Y - 22, 7, 0x9fd7ff, 1)
      .setStrokeStyle(2, 0xffffff, 0.9)
      .setDepth(8);
    this.tweens.add({
      targets: spark,
      x: GATE_X,
      y: GATE_Y,
      scale: 0.55,
      duration: 220,
      ease: 'Quad.easeIn',
      onComplete: () => spark.destroy()
    });
  }

  private fireRangerShot(): void {
    const shot = this.add.rectangle(HERO_X + 30, HERO_Y - 12, 24, 4, 0xa9e783, 1)
      .setStrokeStyle(1, 0xffffff, 0.85)
      .setDepth(8);
    this.tweens.add({
      targets: shot,
      x: GATE_X,
      y: GATE_Y,
      rotation: 0.18,
      duration: 220,
      ease: 'Quad.easeIn',
      onComplete: () => shot.destroy()
    });
  }

  private impactGate(): void {
    const isMage = this.profileId === 'grade2-mage';
    const accent = isMage ? 0x9fd7ff : 0xa9e783;
    const completedHits = TOTAL_HITS - this.remainingHits;

    this.progressPips.forEach((pip, index) => {
      if (index < completedHits) pip.setFillStyle(accent, 1);
    });

    const ring = this.add.circle(GATE_X, GATE_Y, 18, accent, 0.06)
      .setStrokeStyle(4, 0xffffff, 0.95)
      .setDepth(7);
    this.tweens.add({
      targets: ring,
      scale: 3.2,
      alpha: 0,
      duration: 360,
      ease: 'Sine.easeOut',
      onComplete: () => ring.destroy()
    });

    this.cameras.main.shake(110, 0.004);
    this.gateCore.setFillStyle(accent, 0.9);

    if (this.remainingHits <= 0) {
      this.completeOpening();
      return;
    }

    this.instructionText.setText(
      isMage ? 'Again! The spell is working.' : 'Again! The hidden trail is opening.'
    );
  }

  private completeOpening(): void {
    this.completed = true;
    markOpeningSeen(this.profileId);
    this.sound.play('sfx-reward', { volume: 0.48 });
    this.instructionText.setText('THE GATE IS OPEN!');
    this.instructionText.setColor('#ffd666').setFontStyle('bold').setFontSize(17);

    for (let index = 0; index < 18; index += 1) {
      const angle = (Math.PI * 2 * index) / 18;
      const sparkle = this.add.circle(GATE_X, GATE_Y, index % 3 === 0 ? 4 : 2, 0xfff0a3, 1)
        .setDepth(9);
      this.tweens.add({
        targets: sparkle,
        x: GATE_X + Math.cos(angle) * (46 + (index % 3) * 15),
        y: GATE_Y + Math.sin(angle) * (38 + (index % 3) * 12),
        alpha: 0,
        scale: 0.2,
        duration: 620,
        ease: 'Sine.easeOut',
        onComplete: () => sparkle.destroy()
      });
    }

    this.tweens.add({
      targets: [this.gateCore, this.gateGlow],
      scale: 1.55,
      alpha: 1,
      duration: 420,
      ease: 'Back.easeOut'
    });

    this.time.delayedCall(650, () => {
      this.cameras.main.fadeOut(300, 12, 10, 18);
      this.time.delayedCall(320, () => this.scene.start('WorldScene', { profileId: this.profileId }));
    });
  }

  private skipOpening(): void {
    if (this.completed) return;
    this.completed = true;
    markOpeningSeen(this.profileId);
    this.scene.start('WorldScene', { profileId: this.profileId });
  }
}
