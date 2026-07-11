import Phaser from 'phaser';
import { fpx, GAME_SCALE, sscale, sx, sy } from '../gameDimensions';
import type { ProfileId } from '../data/profiles';
import type { HeroPresentationController } from './HeroPresentationController';

const TOTAL_HITS = 3;
const IMPACT_DELAY_MS = 150;
const HIT_LOCK_MS = 390;
const FINISH_DURATION_MS = 720;
const HEALTH_PIP_NAME = 'practice-slime-health-pip';
const PROJECTILE_NAME = 'practice-slime-projectile';
const IMPACT_NAME = 'practice-slime-impact';
const COMPLETE_TEXT_NAME = 'practice-slime-complete-text';

export type PracticeSlimeEncounterSnapshot = {
  completed: boolean;
  hitCount: number;
  inputLocked: boolean;
  profileId: ProfileId;
  remainingHits: number;
};

type PracticeSlimeEncounterOptions = {
  scene: Phaser.Scene;
  profileId: ProfileId;
  player: Phaser.Physics.Arcade.Sprite;
  slime: Phaser.GameObjects.Sprite;
  heroPresentation: HeroPresentationController;
  onLockChanged: (locked: boolean) => void;
  onComplete: () => void;
};

/**
 * Owns only the transient, child-safe presentation state for the farm's
 * three-hit Practice Slime encounter. Quest progress, prompts, rewards,
 * mastery, saves, and repeatability remain owned by WorldScene/FarmQuestSystem.
 */
export class PracticeSlimeEncounterController {
  private readonly scene: Phaser.Scene;
  private readonly profileId: ProfileId;
  private readonly player: Phaser.Physics.Arcade.Sprite;
  private readonly slime: Phaser.GameObjects.Sprite;
  private readonly heroPresentation: HeroPresentationController;
  private readonly onLockChanged: (locked: boolean) => void;
  private readonly onComplete: () => void;

  private hitCount = 0;
  private inputLocked = false;
  private completed = false;
  private pips: Phaser.GameObjects.Arc[] = [];
  private delayedCalls: Phaser.Time.TimerEvent[] = [];

  constructor(options: PracticeSlimeEncounterOptions) {
    this.scene = options.scene;
    this.profileId = options.profileId;
    this.player = options.player;
    this.slime = options.slime;
    this.heroPresentation = options.heroPresentation;
    this.onLockChanged = options.onLockChanged;
    this.onComplete = options.onComplete;
  }

  create(): void {
    if (this.pips.some((pip) => pip.active)) return;

    for (let index = 0; index < TOTAL_HITS; index += 1) {
      const pip = this.scene.add.circle(0, 0, sx(4), 0x18211b, 1)
        .setName(`${HEALTH_PIP_NAME}-${index + 1}`)
        .setStrokeStyle(1.5, 0xffd666, 0.95)
        .setDepth(5);
      this.pips.push(pip);
    }

    this.reset();
  }

  update(): void {
    this.pips.forEach((pip, index) => {
      pip.setPosition(this.slime.x - sx(13) + index * sx(13), this.slime.y - sy(43));
    });
  }

  hintLabel(): string {
    if (this.completed) return 'Practice complete!';
    const verb = this.profileId === 'grade2-mage' ? 'Cast at' : 'Shoot';
    const remaining = Math.max(0, TOTAL_HITS - this.hitCount);
    return `${verb} Practice Slime (${remaining} ${remaining === 1 ? 'hit' : 'hits'})`;
  }

  tryStrike(): boolean {
    if (this.inputLocked || this.completed || !this.slime.active) return false;

    this.setLocked(true);
    this.hitCount += 1;
    this.heroPresentation.playAction(false);
    this.fireProjectile();

    this.delay(IMPACT_DELAY_MS, () => this.impact());
    return true;
  }

  reset(): void {
    this.clearDelayedCalls();
    this.hitCount = 0;
    this.completed = false;
    this.setLocked(false);
    this.slime.setVisible(true).setAlpha(1).setScale(GAME_SCALE).setAngle(0);
    this.slime.play('practice-slime-idle', true);
    this.pips.forEach((pip) => pip.setVisible(true).setAlpha(1).setScale(1));
    this.update();
    this.refreshPips();
  }

  snapshot(): PracticeSlimeEncounterSnapshot {
    return {
      completed: this.completed,
      hitCount: this.hitCount,
      inputLocked: this.inputLocked,
      profileId: this.profileId,
      remainingHits: Math.max(0, TOTAL_HITS - this.hitCount)
    };
  }

  dispose(): void {
    this.clearDelayedCalls();
    this.scene.tweens.killTweensOf(this.slime);
    this.pips.forEach((pip) => {
      this.scene.tweens.killTweensOf(pip);
      pip.destroy();
    });
    this.pips = [];
    this.inputLocked = false;
  }

  private fireProjectile(): void {
    const isMage = this.profileId === 'grade2-mage';
    const start = this.projectileStart();
    const targetX = this.slime.x;
    const targetY = this.slime.y - sy(16);

    if (isMage) {
      const projectile = this.scene.add.circle(start.x, start.y, sx(6), 0x9fd7ff, 1)
        .setName(PROJECTILE_NAME)
        .setStrokeStyle(2, 0xffffff, 0.95)
        .setDepth(7);
      const glow = this.scene.add.circle(start.x, start.y, sx(11), 0x8f63ff, 0.18).setDepth(6);

      this.scene.tweens.add({
        targets: [projectile, glow],
        x: targetX,
        y: targetY,
        duration: IMPACT_DELAY_MS,
        ease: 'Quad.easeIn',
        onUpdate: () => this.spawnTrail(projectile.x, projectile.y, 0x8f63ff),
        onComplete: () => {
          projectile.destroy();
          glow.destroy();
        }
      });
      return;
    }

    const dx = targetX - start.x;
    const dy = targetY - start.y;
    const angle = Math.atan2(dy, dx);
    const shot = this.scene.add.rectangle(start.x, start.y, sx(25), sx(4), 0xa9e783, 1)
      .setName(PROJECTILE_NAME)
      .setStrokeStyle(1, 0xffffff, 0.9)
      .setRotation(angle)
      .setDepth(7);
    const tracker = this.scene.add.circle(targetX, targetY, sx(14), 0x72b95c, 0.05)
      .setStrokeStyle(2, 0xd7ffb8, 0.9)
      .setDepth(6)
      .setScale(0.45);

    this.scene.tweens.add({
      targets: tracker,
      scale: 1,
      alpha: 0.75,
      duration: 110,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => tracker.destroy()
    });
    this.scene.tweens.add({
      targets: shot,
      x: targetX,
      y: targetY,
      duration: IMPACT_DELAY_MS,
      ease: 'Cubic.easeIn',
      onUpdate: () => this.spawnTrail(shot.x, shot.y, 0xa9e783),
      onComplete: () => shot.destroy()
    });
  }

  private projectileStart(): { x: number; y: number } {
    const hero = this.heroPresentation.sprite;
    return {
      x: (hero?.x ?? this.player.x) + (this.slime.x >= this.player.x ? sx(16) : -sx(16)),
      y: (hero?.y ?? this.player.y) - sy(22)
    };
  }

  private spawnTrail(x: number, y: number, color: number): void {
    if (Phaser.Math.Between(0, 1) === 0) return;
    const trail = this.scene.add.circle(x, y, sx(2), color, 0.65).setDepth(6);
    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      scale: 0.2,
      duration: 190,
      ease: 'Sine.easeOut',
      onComplete: () => trail.destroy()
    });
  }

  private impact(): void {
    const isFinalHit = this.hitCount >= TOTAL_HITS;
    const accent = this.profileId === 'grade2-mage' ? 0x9fd7ff : 0xa9e783;
    this.refreshPips();
    this.scene.sound.play(isFinalHit ? 'sfx-reward' : 'sfx-interact', {
      volume: isFinalHit ? 0.38 : 0.25
    });
    this.createImpactBurst(accent, isFinalHit);
    this.playSlimeReaction(isFinalHit);

    if (!isFinalHit) {
      this.delay(HIT_LOCK_MS - IMPACT_DELAY_MS, () => this.setLocked(false));
      return;
    }

    this.completed = true;
    this.playCompletion(accent);
    this.delay(FINISH_DURATION_MS - IMPACT_DELAY_MS, () => {
      this.setLocked(false);
      this.onComplete();
    });
  }

  private refreshPips(): void {
    const accent = this.profileId === 'grade2-mage' ? 0x9fd7ff : 0xa9e783;
    this.pips.forEach((pip, index) => {
      const filled = index < this.hitCount;
      pip.setFillStyle(filled ? accent : 0x18211b, 1)
        .setStrokeStyle(1.5, filled ? 0xffffff : 0xffd666, filled ? 1 : 0.95);
    });
  }

  private playSlimeReaction(finalHit: boolean): void {
    this.slime.play('practice-slime-hop', true);
    const direction = this.slime.x >= this.player.x ? 1 : -1;
    this.scene.tweens.killTweensOf(this.slime);
    this.scene.tweens.add({
      targets: this.slime,
      x: this.slime.x + direction * (finalHit ? sx(8) : sx(4)),
      y: this.slime.y - (finalHit ? sy(8) : sy(4)),
      // The slime sprite carries a persistent GAME_SCALE baseline (set where
      // it's created), so — unlike the transient burst objects below, which
      // start at Phaser's default scale of 1 — these absolute scaleX/scaleY
      // targets must be scaled up too, or the squash/stretch would shrink it
      // down from 2x toward 1x instead of animating around its real baseline.
      scaleX: sscale(finalHit ? 1.4 : 1.22),
      scaleY: sscale(finalHit ? 0.62 : 0.78),
      angle: direction * (finalHit ? 6 : 3),
      duration: finalHit ? 170 : 120,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (!this.slime.active) return;
        this.slime.setScale(GAME_SCALE).setAngle(0);
        this.slime.play('practice-slime-idle', true);
      }
    });
  }

  private createImpactBurst(accent: number, finalHit: boolean): void {
    const targetX = this.slime.x;
    const targetY = this.slime.y - sy(16);
    const ring = this.scene.add.circle(targetX, targetY, sx(8), accent, 0.08)
      .setName(IMPACT_NAME)
      .setStrokeStyle(finalHit ? 4 : 2, 0xffffff, 0.95)
      .setDepth(8);
    this.scene.tweens.add({
      targets: ring,
      scale: finalHit ? 4.3 : 2.6,
      alpha: 0,
      duration: finalHit ? 430 : 280,
      ease: 'Sine.easeOut',
      onComplete: () => ring.destroy()
    });

    const count = finalHit ? 18 : 8;
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count;
      const particle = this.scene.add.circle(
        targetX,
        targetY,
        finalHit && index % 4 === 0 ? sx(4) : sx(2),
        index % 3 === 0 ? 0xffd666 : accent,
        1
      ).setDepth(8);
      this.scene.tweens.add({
        targets: particle,
        x: targetX + Math.cos(angle) * (finalHit ? sx(34) + (index % 4) * sx(5) : sx(19)),
        y: targetY + Math.sin(angle) * (finalHit ? sy(28) + (index % 3) * sy(4) : sy(15)),
        alpha: 0,
        scale: 0.2,
        duration: finalHit ? 480 : 260,
        ease: 'Sine.easeOut',
        onComplete: () => particle.destroy()
      });
    }
  }

  private playCompletion(accent: number): void {
    const text = this.scene.add.text(this.slime.x, this.slime.y - sy(62), 'Practice complete!', {
      fontFamily: 'system-ui',
      fontSize: fpx(13),
      color: '#fff3c9',
      fontStyle: 'bold',
      stroke: '#162018',
      strokeThickness: 6
    }).setName(COMPLETE_TEXT_NAME).setOrigin(0.5).setDepth(9).setScale(0.65);

    this.scene.tweens.add({
      targets: text,
      y: text.y - sy(10),
      scale: 1,
      alpha: { from: 1, to: 0 },
      duration: 680,
      ease: 'Back.easeOut',
      onComplete: () => text.destroy()
    });

    this.scene.tweens.add({
      targets: this.pips,
      scale: 1.25,
      alpha: 0,
      duration: 480,
      delay: 120,
      ease: 'Sine.easeOut'
    });

    const poof = this.scene.add.circle(this.slime.x, this.slime.y - sy(14), sx(13), accent, 0.18)
      .setStrokeStyle(3, 0xffffff, 0.85)
      .setDepth(7);
    this.scene.tweens.add({
      targets: poof,
      scale: 3.2,
      alpha: 0,
      duration: 520,
      ease: 'Sine.easeOut',
      onComplete: () => poof.destroy()
    });
  }

  private setLocked(locked: boolean): void {
    this.inputLocked = locked;
    this.onLockChanged(locked);
  }

  private delay(delay: number, callback: () => void): void {
    const event = this.scene.time.delayedCall(delay, () => {
      this.delayedCalls = this.delayedCalls.filter((candidate) => candidate !== event);
      callback();
    });
    this.delayedCalls.push(event);
  }

  private clearDelayedCalls(): void {
    this.delayedCalls.forEach((event) => event.remove(false));
    this.delayedCalls = [];
  }
}
