import type Phaser from 'phaser';
import { sx, sy } from '../gameDimensions';

/**
 * Any display object with a transform the controller can tween in place.
 * Structural (not a Phaser type parameter) so Graphics, Arc, Sprite, and
 * Text all register without casts.
 */
export type AffordanceVisual = Phaser.GameObjects.GameObject & {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  active: boolean;
  visible: boolean;
};

export type AffordanceRegistration = {
  /** Stable key matching the interaction target id. */
  id: string;
  /** World anchor — the interaction point the player approaches. */
  x: number;
  y: number;
  /** The single visual that idles and pops (e.g. the marker glyph). */
  marker: AffordanceVisual;
  /**
   * Idle "alive" motion (gentle y-bob). Default true. Targets that already
   * read as alive on their own (the Practice Slime's idle animation) pass
   * false so two idle systems never fight.
   */
  idleBob?: boolean;
  /**
   * Optional extra gate consulted before the proximity pop fires — e.g. the
   * slime encounter declines pops while a strike animation owns the sprite's
   * transform.
   */
  canPop?: () => boolean;
};

type RegisteredTarget = {
  id: string;
  x: number;
  y: number;
  marker: AffordanceVisual;
  baseY: number;
  baseScaleX: number;
  baseScaleY: number;
  canPop?: () => boolean;
  inRange: boolean;
  popTween?: Phaser.Tweens.Tween;
};

/** Matches WorldScene.nearestTarget()'s interaction radius. */
const INTERACTION_RANGE = sx(42);
/** Proximity pop magnitude — noticeable, but restrained per the juice rules. */
const POP_SCALE_FACTOR = 1.15;

/**
 * Centralized "this thing is interactive" feel for world interaction
 * markers, in the spirit of Stardew's wiggle and Sunflower Land's proximity
 * affordances:
 *
 *  1. Idle: every registered marker gently bobs (slow, low amplitude, with
 *     staggered phases so markers never pulse in sync).
 *  2. Proximity: when the player enters interaction range the marker pops
 *     (~1.15x, quick Back.easeOut) and releases exactly one small sparkle;
 *     leaving range eases it back to rest.
 *
 * Visuals are tweened in place — never re-parented into a container — so the
 * suite's "first Container in the scene" prompt-panel convention and the
 * getByName lookups keep working. One restrained sparkle per range entry
 * (not a stream) keeps this inside the contract's no-particle-spam rule.
 */
export class InteractableAffordanceController {
  private readonly scene: Phaser.Scene;
  private readonly player: { x: number; y: number };
  private readonly targets: RegisteredTarget[] = [];
  private registrationCount = 0;

  constructor(scene: Phaser.Scene, player: { x: number; y: number }) {
    this.scene = scene;
    this.player = player;
  }

  register(registration: AffordanceRegistration): void {
    const index = this.registrationCount;
    this.registrationCount += 1;

    const target: RegisteredTarget = {
      id: registration.id,
      x: registration.x,
      y: registration.y,
      marker: registration.marker,
      baseY: registration.marker.y,
      baseScaleX: registration.marker.scaleX,
      baseScaleY: registration.marker.scaleY,
      canPop: registration.canPop,
      inRange: false
    };
    this.targets.push(target);

    if (registration.idleBob !== false) {
      // Staggered phases: both the start delay and the cycle length vary by
      // registration order, so markers drift out of sync instead of pulsing
      // together.
      this.scene.tweens.add({
        targets: registration.marker,
        y: target.baseY - sy(2),
        duration: 1080 + (index % 4) * 190,
        delay: (index * 277) % 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  /** Adds or replaces the proximity gate for an already-registered target. */
  setPopGuard(id: string, canPop: () => boolean): void {
    const target = this.targets.find((candidate) => candidate.id === id);
    if (target) target.canPop = canPop;
  }

  /** Drops a target whose world visual is being retired mid-scene. */
  unregister(id: string): void {
    const index = this.targets.findIndex((candidate) => candidate.id === id);
    if (index < 0) return;
    const [removed] = this.targets.splice(index, 1);
    this.scene.tweens.killTweensOf(removed.marker);
  }

  /** Per-frame proximity check — pure distance math, no allocations. */
  update(): void {
    const rangeSquared = INTERACTION_RANGE * INTERACTION_RANGE;
    for (const target of this.targets) {
      const { marker } = target;
      if (!marker.active || !marker.visible) {
        // A hidden/retired marker quietly resets to "out of range" so it can
        // pop again if it ever comes back — without tweening an invisible
        // object.
        target.inRange = false;
        continue;
      }

      // Inline distance math (not Phaser.Math.Distance) keeps this module
      // free of runtime Phaser imports, so the proximity/latch logic stays
      // unit-testable in Node with a structural scene stub.
      const dx = this.player.x - target.x;
      const dy = this.player.y - target.y;
      const nowInRange = dx * dx + dy * dy < rangeSquared;
      if (nowInRange === target.inRange) continue;

      if (nowInRange) {
        if (target.canPop && !target.canPop()) {
          // The target's own presentation is mid-beat (e.g. a strike squash).
          // Do NOT latch in-range: leaving it false retries the pop on later
          // frames while the player waits in range, and if the player leaves
          // first there is simply nothing to un-pop.
          continue;
        }
        target.inRange = true;
        this.popIn(target);
      } else {
        target.inRange = false;
        this.popOut(target);
      }
    }
  }

  dispose(): void {
    for (const target of this.targets) {
      this.scene.tweens.killTweensOf(target.marker);
    }
    this.targets.length = 0;
  }

  private popIn(target: RegisteredTarget): void {
    target.popTween?.remove();
    target.popTween = this.scene.tweens.add({
      targets: target.marker,
      scaleX: target.baseScaleX * POP_SCALE_FACTOR,
      scaleY: target.baseScaleY * POP_SCALE_FACTOR,
      duration: 170,
      ease: 'Back.easeOut'
    });
    this.fireEntrySparkle(target);
  }

  private popOut(target: RegisteredTarget): void {
    target.popTween?.remove();
    target.popTween = this.scene.tweens.add({
      targets: target.marker,
      scaleX: target.baseScaleX,
      scaleY: target.baseScaleY,
      duration: 150,
      ease: 'Sine.easeInOut'
    });
  }

  /** Exactly one small sparkle per range entry — a glint, not a burst. */
  private fireEntrySparkle(target: RegisteredTarget): void {
    const sparkle = this.scene.add.graphics()
      .setPosition(target.x + sx(11), target.marker.y - sy(6))
      .setScale(0.45)
      .setDepth(6);
    sparkle.fillStyle(0xfff3c9, 1);
    sparkle.fillTriangle(0, -5, 2, 0, 0, 5);
    sparkle.fillTriangle(0, -5, -2, 0, 0, 5);
    sparkle.fillTriangle(-5, 0, 0, -2, 5, 0);
    sparkle.fillTriangle(-5, 0, 0, 2, 5, 0);

    this.scene.tweens.add({
      targets: sparkle,
      scale: 1.05,
      alpha: 0,
      duration: 320,
      ease: 'Sine.easeOut',
      onComplete: () => sparkle.destroy()
    });
  }
}
