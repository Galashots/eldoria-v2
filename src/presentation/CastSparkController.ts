import Phaser from 'phaser';
import { sx, sy } from '../gameDimensions';
import type { ProfileId } from '../data/profiles';
import {
  CAST_RANGE,
  castImpactPoint,
  resolveCastHit,
  type CastCandidate,
  type CastFacing
} from '../systems/castTargeting';

/**
 * The visible half of the hero's ranged cast.
 *
 * ACTION away from an interactable used to play the hero's cast animation in
 * silence — the animation was there, but nothing left the hero's hands and
 * nothing in the world reacted. This fires a projectile along the facing
 * direction, lands it on whatever the targeting rule says it reaches
 * (src/systems/castTargeting.ts), and pops an impact.
 *
 * Built entirely from primitives and tweens, like every other effect in this
 * scene (the Practice Slime strike bursts, the Wildbloom reveals, the gate
 * arrival): no new art, no new audio. The two profiles read differently —
 * the Mage throws a round arcane spark, the Ranger looses a thin arrow — using
 * each one's own accent colour.
 */

const CAST_NAME = 'cast-spark';
export const CAST_IMPACT_NAME = 'cast-impact';

/** Above the actor band (see src/systems/worldDepth.ts), with the other VFX. */
const PROJECTILE_DEPTH = 7;
const IMPACT_DEPTH = 8;
const TRAIL_DEPTH = 6;

type CastSparkOptions = {
  scene: Phaser.Scene;
  profileId: ProfileId;
  player: { x: number; y: number };
  /** Every interaction target in the scene; the rule filters them. */
  candidates: () => readonly CastCandidate[];
  /** Runs when the projectile lands on a castable target. */
  onHit: (targetId: string) => void;
  playSfx: (key: string, volume?: number) => void;
};

export class CastSparkController {
  private readonly options: CastSparkOptions;
  private readonly isRanger: boolean;
  /** Guards against a held button spamming dozens of overlapping projectiles. */
  private cooldownUntil = 0;

  constructor(options: CastSparkOptions) {
    this.options = options;
    this.isRanger = options.profileId === 'grade5-adventurer';
  }

  /** Milliseconds between casts. Fast enough to feel responsive to mashing,
   * slow enough that the screen does not fill with sparks. */
  static readonly COOLDOWN_MS = 260;

  private accent(): number {
    return this.isRanger ? 0xa9e783 : 0x9fd7ff;
  }

  private core(): number {
    return this.isRanger ? 0xeaffd0 : 0xeaf4ff;
  }

  /**
   * Fires a cast. Returns the id of the target it will hit, or null when it
   * flies into open ground — the caller uses that only for reporting; the hit
   * itself is delivered through `onHit` when the projectile actually lands, so
   * the reaction is synchronised with the visual.
   */
  fire(facing: CastFacing, now: number): string | null {
    if (now < this.cooldownUntil) return null;
    this.cooldownUntil = now + CastSparkController.COOLDOWN_MS;

    const { scene, player } = this.options;
    // Chest height rather than the feet, so the projectile leaves the hero's
    // hands instead of sliding along the ground.
    const origin = { x: player.x, y: player.y - sy(6) };
    const hit = resolveCastHit(origin, facing, this.options.candidates());
    const impact = castImpactPoint(origin, facing, hit, CAST_RANGE);

    this.options.playSfx('sfx-interact', 0.22);

    const projectile = this.isRanger
      ? scene.add.ellipse(origin.x, origin.y, sx(9), sx(2.5), this.core(), 1)
      : scene.add.circle(origin.x, origin.y, sx(4), this.core(), 1);
    projectile.setName(CAST_NAME).setDepth(PROJECTILE_DEPTH);
    if (this.isRanger) {
      projectile.setRotation(Math.atan2(impact.y - origin.y, impact.x - origin.x));
    }

    const glow = scene.add.circle(origin.x, origin.y, sx(8), this.accent(), 0.32).setDepth(PROJECTILE_DEPTH - 0.1);

    // Distance-proportional flight time keeps the speed constant whether it
    // lands on a near sprout or sails the full range.
    const distance = Phaser.Math.Distance.Between(origin.x, origin.y, impact.x, impact.y);
    const duration = Phaser.Math.Clamp((distance / CAST_RANGE) * 210, 70, 210);

    let trailAt = 0;
    scene.tweens.add({
      targets: [projectile, glow],
      x: impact.x,
      y: impact.y,
      duration,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        // A sparse trail: one dot every ~35ms rather than one per frame, so it
        // reads as a streak without allocating sixty objects per cast.
        if (scene.time.now - trailAt < 35) return;
        trailAt = scene.time.now;
        this.addTrailDot(projectile.x, projectile.y);
      },
      onComplete: () => {
        projectile.destroy();
        glow.destroy();
        this.addImpact(impact.x, impact.y, hit !== null);
        if (hit) this.options.onHit(hit.id);
      }
    });
    return hit?.id ?? null;
  }

  private addTrailDot(x: number, y: number): void {
    const { scene } = this.options;
    const dot = scene.add.circle(x, y, sx(1.5), this.accent(), 0.5).setDepth(TRAIL_DEPTH);
    scene.tweens.add({
      targets: dot,
      alpha: 0,
      scale: 0.3,
      duration: 180,
      ease: 'Sine.easeOut',
      onComplete: () => dot.destroy()
    });
  }

  /**
   * Landing pop. A hit gets a bigger ring and more sparks than a fizzle, so the
   * difference between "I hit the sprout" and "I cast into the grass" is
   * legible without reading any text.
   */
  private addImpact(x: number, y: number, didHit: boolean): void {
    const { scene } = this.options;
    // A hit gets a short, small camera shake. This is the single cheapest way
    // to make a button press feel like it connected; kept brief and shallow so
    // it never reads as damage taken or unsettles a young player.
    if (didHit) scene.cameras.main.shake(90, 0.0035);
    const ring = scene.add.circle(x, y, sx(didHit ? 7 : 4), this.accent(), 0.1)
      .setName(CAST_IMPACT_NAME)
      .setStrokeStyle(didHit ? 3 : 2, this.core(), 0.9)
      .setDepth(IMPACT_DEPTH);
    scene.tweens.add({
      targets: ring,
      scale: didHit ? 3.2 : 1.9,
      alpha: 0,
      duration: didHit ? 330 : 220,
      ease: 'Sine.easeOut',
      onComplete: () => ring.destroy()
    });

    const sparkCount = didHit ? 6 : 3;
    for (let index = 0; index < sparkCount; index += 1) {
      const angle = (Math.PI * 2 * index) / sparkCount;
      const spark = scene.add.circle(x, y, sx(1.5), index % 2 === 0 ? this.core() : this.accent(), 0.95)
        .setDepth(IMPACT_DEPTH);
      scene.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * sx(didHit ? 12 : 7),
        y: y + Math.sin(angle) * sx(didHit ? 12 : 7),
        alpha: 0,
        scale: 0.4,
        duration: didHit ? 320 : 210,
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy()
      });
    }
  }
}
