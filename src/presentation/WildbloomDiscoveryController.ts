import Phaser from 'phaser';
import { GAME_SCALE, GAME_WIDTH, sx, sy } from '../gameDimensions';
import type { ProfileId } from '../data/profiles';
import { drawRoundedPanelBackground } from './uiHelpers';
import type { HeroPresentationController } from './HeroPresentationController';

const WILDBLOOM_SPRIG_KEY = 'wildbloomSprig';
const SENSE_RADIUS = sx(112);
const REVEAL_RADIUS = sx(48);
const IMPACT_DELAY_MS = 300;
const REVEAL_LOCK_MS = 760;

export type WildbloomSpotId = 'root-star' | 'moonwell-echo' | 'foxfire-seed';

type WildbloomSpotDefinition = {
  id: WildbloomSpotId;
  name: string;
  inventoryKey: string;
  x: number;
  y: number;
  accent: number;
  secondary: number;
  lore: string;
  rune: 'star' | 'waves' | 'flame';
};

const WILDBLOOM_SPOTS: readonly WildbloomSpotDefinition[] = [
  {
    id: 'root-star',
    name: 'Root-Star Sigil',
    inventoryKey: 'wildbloomSecretRootStar',
    x: 560 * GAME_SCALE,
    y: 144 * GAME_SCALE,
    accent: 0xffd666,
    secondary: 0x8fd14f,
    lore: 'A tiny star was carved beneath the oldest roots.',
    rune: 'star'
  },
  {
    id: 'moonwell-echo',
    name: 'Moonwell Echo',
    inventoryKey: 'wildbloomSecretMoonwellEcho',
    x: 336 * GAME_SCALE,
    y: 480 * GAME_SCALE,
    accent: 0x9fd7ff,
    secondary: 0x8f63ff,
    lore: 'Silver ripples answer the Sprig from below the soil.',
    rune: 'waves'
  },
  {
    id: 'foxfire-seed',
    name: 'Foxfire Seed',
    inventoryKey: 'wildbloomSecretFoxfireSeed',
    x: 800 * GAME_SCALE,
    y: 464 * GAME_SCALE,
    accent: 0xa9e783,
    secondary: 0x72b95c,
    lore: 'A sleeping green flame remembers the first garden.',
    rune: 'flame'
  }
] as const;

type SpotRuntime = {
  definition: WildbloomSpotDefinition;
  indicator: Phaser.GameObjects.Container;
  reveal?: Phaser.GameObjects.Container;
};

export type WildbloomDiscoverySnapshot = {
  activeSpotId: WildbloomSpotId | null;
  discoveredSpotIds: WildbloomSpotId[];
  inputLocked: boolean;
  profileId: ProfileId;
  totalSpots: number;
  unlocked: boolean;
};

type WildbloomDiscoveryOptions = {
  scene: Phaser.Scene;
  profileId: ProfileId;
  player: Phaser.Physics.Arcade.Sprite;
  heroPresentation: HeroPresentationController;
  hasInventoryItem: (key: string) => boolean;
  markInventoryItem: (key: string) => void;
  isBusy: () => boolean;
  onLockChanged: (locked: boolean) => void;
};

/**
 * Owns the optional Wildbloom Sprig exploration loop: proximity sensing,
 * profile-specific reveal abilities, persistent discovery flags inside the
 * existing inventory record, and the presentation of hidden farm secrets.
 * It deliberately does not own quests, curriculum, rewards, or save schema.
 */
export class WildbloomDiscoveryController {
  private readonly scene: Phaser.Scene;
  private readonly profileId: ProfileId;
  private readonly player: Phaser.Physics.Arcade.Sprite;
  private readonly heroPresentation: HeroPresentationController;
  private readonly hasInventoryItem: (key: string) => boolean;
  private readonly markInventoryItem: (key: string) => void;
  private readonly isBusy: () => boolean;
  private readonly onLockChanged: (locked: boolean) => void;

  private readonly discoveredSpotIds = new Set<WildbloomSpotId>();
  private runtimes: SpotRuntime[] = [];
  private activeSpotId: WildbloomSpotId | null = null;
  private inputLocked = false;
  private delayedCalls: Phaser.Time.TimerEvent[] = [];
  private toast?: Phaser.GameObjects.Container;

  constructor(options: WildbloomDiscoveryOptions) {
    this.scene = options.scene;
    this.profileId = options.profileId;
    this.player = options.player;
    this.heroPresentation = options.heroPresentation;
    this.hasInventoryItem = options.hasInventoryItem;
    this.markInventoryItem = options.markInventoryItem;
    this.isBusy = options.isBusy;
    this.onLockChanged = options.onLockChanged;
  }

  create(): void {
    if (this.runtimes.length > 0) return;

    this.runtimes = WILDBLOOM_SPOTS.map((definition) => {
      const indicator = this.createIndicator(definition);
      const discovered = this.hasInventoryItem(definition.inventoryKey);
      if (discovered) this.discoveredSpotIds.add(definition.id);

      return {
        definition,
        indicator,
        reveal: discovered ? this.createReveal(definition, false) : undefined
      };
    });
    this.update();
  }

  update(): void {
    const unlocked = this.hasInventoryItem(WILDBLOOM_SPRIG_KEY);
    const suspended = this.isBusy() && !this.inputLocked;

    if (!unlocked || suspended) {
      this.activeSpotId = null;
      this.runtimes.forEach((runtime) => runtime.indicator.setVisible(false));
      return;
    }

    let nearest: SpotRuntime | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const runtime of this.runtimes) {
      if (this.discoveredSpotIds.has(runtime.definition.id)) {
        runtime.indicator.setVisible(false);
        continue;
      }

      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        runtime.definition.x,
        runtime.definition.y
      );
      if (distance <= SENSE_RADIUS && distance < nearestDistance) {
        nearest = runtime;
        nearestDistance = distance;
      }
    }

    this.activeSpotId = nearest?.definition.id ?? null;
    for (const runtime of this.runtimes) {
      const active = runtime === nearest;
      runtime.indicator.setVisible(active);
      if (active) {
        const strength = Phaser.Math.Clamp(1 - nearestDistance / SENSE_RADIUS, 0.25, 1);
        runtime.indicator.setAlpha(0.45 + strength * 0.55);
      }
    }
  }

  hintText(): string | undefined {
    if (!this.hasInventoryItem(WILDBLOOM_SPRIG_KEY)) return undefined;
    if (this.inputLocked) {
      return this.profileId === 'grade2-mage'
        ? 'The Sprig answers your magic...'
        : 'The Sprig follows your trail...';
    }

    const runtime = this.activeRuntime();
    if (!runtime) return undefined;
    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      runtime.definition.x,
      runtime.definition.y
    );

    return distance <= REVEAL_RADIUS
      ? 'WILDBLOOM • ACTION to reveal the hidden place.'
      : 'The Wildbloom Sprig hums nearby — follow the green glow.';
  }

  tryDiscover(): boolean {
    if (this.inputLocked || this.isBusy() || !this.hasInventoryItem(WILDBLOOM_SPRIG_KEY)) return false;

    const runtime = this.activeRuntime();
    if (!runtime) return false;

    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      runtime.definition.x,
      runtime.definition.y
    );
    if (distance > REVEAL_RADIUS) return false;

    this.setLocked(true);
    runtime.indicator.setVisible(false);
    this.heroPresentation.playAction(false);
    this.fireAbility(runtime.definition);
    this.delay(IMPACT_DELAY_MS, () => this.reveal(runtime));
    this.delay(REVEAL_LOCK_MS, () => this.setLocked(false));
    return true;
  }

  snapshot(): WildbloomDiscoverySnapshot {
    return {
      activeSpotId: this.activeSpotId,
      discoveredSpotIds: WILDBLOOM_SPOTS
        .map((spot) => spot.id)
        .filter((id) => this.discoveredSpotIds.has(id)),
      inputLocked: this.inputLocked,
      profileId: this.profileId,
      totalSpots: WILDBLOOM_SPOTS.length,
      unlocked: this.hasInventoryItem(WILDBLOOM_SPRIG_KEY)
    };
  }

  dispose(): void {
    this.clearDelayedCalls();
    this.toast?.destroy();
    this.toast = undefined;
    for (const runtime of this.runtimes) {
      runtime.indicator.destroy();
      runtime.reveal?.destroy();
    }
    this.runtimes = [];
    this.activeSpotId = null;
    this.setLocked(false);
  }

  private activeRuntime(): SpotRuntime | undefined {
    return this.runtimes.find((runtime) => runtime.definition.id === this.activeSpotId);
  }

  private createIndicator(definition: WildbloomSpotDefinition): Phaser.GameObjects.Container {
    const glow = this.scene.add.circle(0, 0, 15, 0x72b95c, 0.08)
      .setStrokeStyle(2, 0xa9e783, 0.9);
    const inner = this.scene.add.circle(0, 0, 5, definition.secondary, 0.5)
      .setStrokeStyle(1, 0xffffff, 0.8);
    const leafLeft = this.scene.add.ellipse(-8, 3, 8, 4, 0x8fd14f, 0.95).setAngle(-28);
    const leafRight = this.scene.add.ellipse(8, 3, 8, 4, 0xa9e783, 0.95).setAngle(28);
    const spark = this.scene.add.circle(0, -11, 2, 0xfff3c9, 1);
    // A pre-existing container; scaling it reproduces every local offset
    // above at GAME_SCALE without touching them individually.
    const indicator = this.scene.add.container(definition.x, definition.y - sy(8), [glow, inner, leafLeft, leafRight, spark])
      .setName(`wildbloom-indicator-${definition.id}`)
      .setScale(GAME_SCALE)
      .setDepth(5)
      .setVisible(false);

    this.scene.tweens.add({
      targets: glow,
      scale: 1.45,
      alpha: 0.02,
      duration: 820,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.scene.tweens.add({
      targets: [leafLeft, leafRight, spark],
      y: '-=4',
      duration: 640,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    return indicator;
  }

  private fireAbility(definition: WildbloomSpotDefinition): void {
    const start = this.projectileStart(definition.x);
    const targetX = definition.x;
    const targetY = definition.y - sy(8);

    if (this.profileId === 'grade2-mage') {
      const orb = this.scene.add.circle(start.x, start.y, sx(6), 0x9fd7ff, 1)
        .setName('wildbloom-mage-projectile')
        .setStrokeStyle(2, 0xffffff, 0.95)
        .setDepth(8);
      const glow = this.scene.add.circle(start.x, start.y, sx(12), 0x8f63ff, 0.2).setDepth(7);
      const trails = [0, 1, 2].map((index) => this.scene.add.circle(start.x, start.y, sx(3 - index * 0.5), 0x8f63ff, 0.65)
        .setDepth(7));

      this.scene.tweens.add({
        targets: [orb, glow],
        x: targetX,
        y: targetY,
        duration: IMPACT_DELAY_MS,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          orb.destroy();
          glow.destroy();
        }
      });
      trails.forEach((trail, index) => {
        this.scene.tweens.add({
          targets: trail,
          x: targetX,
          y: targetY,
          delay: 35 + index * 35,
          duration: IMPACT_DELAY_MS,
          alpha: 0,
          scale: 0.2,
          ease: 'Cubic.easeIn',
          onComplete: () => trail.destroy()
        });
      });
      return;
    }

    const dx = targetX - start.x;
    const dy = targetY - start.y;
    const angle = Math.atan2(dy, dx);
    const tracker = this.scene.add.circle(targetX, targetY, sx(17), 0x72b95c, 0.05)
      .setStrokeStyle(2, 0xd7ffb8, 0.95)
      .setDepth(7)
      .setScale(0.45);
    const shot = this.scene.add.rectangle(start.x, start.y, sx(27), sx(4), 0xa9e783, 1)
      .setName('wildbloom-ranger-projectile')
      .setStrokeStyle(1, 0xffffff, 0.9)
      .setRotation(angle)
      .setDepth(8);
    const arrowhead = this.scene.add.triangle(
      start.x,
      start.y,
      0,
      -sy(4),
      sx(8),
      0,
      0,
      sy(4),
      0xffe39a,
      1
    ).setRotation(angle).setDepth(8);

    this.scene.tweens.add({
      targets: tracker,
      scale: 1.2,
      alpha: 0.75,
      duration: 140,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => tracker.destroy()
    });
    this.scene.tweens.add({
      targets: [shot, arrowhead],
      x: targetX,
      y: targetY,
      duration: IMPACT_DELAY_MS,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        shot.destroy();
        arrowhead.destroy();
      }
    });
  }

  private projectileStart(targetX: number): { x: number; y: number } {
    const hero = this.heroPresentation.sprite;
    const playerX = hero?.x ?? this.player.x;
    return {
      x: playerX + (targetX >= playerX ? sx(16) : -sx(16)),
      y: (hero?.y ?? this.player.y) - sy(22)
    };
  }

  private reveal(runtime: SpotRuntime): void {
    const definition = runtime.definition;
    if (this.discoveredSpotIds.has(definition.id)) return;

    this.discoveredSpotIds.add(definition.id);
    this.markInventoryItem(definition.inventoryKey);
    runtime.reveal = this.createReveal(definition, true);
    this.createRevealBurst(definition);
    this.scene.cameras.main.shake(130, 0.0035);
    this.scene.sound.play('sfx-reward', { volume: 0.36 });

    const complete = this.discoveredSpotIds.size === WILDBLOOM_SPOTS.length;
    this.showDiscoveryToast(definition, complete);
    this.activeSpotId = null;
    this.update();
  }

  private createReveal(definition: WildbloomSpotDefinition, animate: boolean): Phaser.GameObjects.Container {
    const shadow = this.scene.add.ellipse(0, 7, 34, 12, 0x06110d, 0.4);
    const moss = this.scene.add.ellipse(0, 2, 32, 16, 0x254b2c, 0.98)
      .setStrokeStyle(1.5, 0x8fd14f, 0.8);
    const stone = this.scene.add.circle(0, -5, 12, 0x465448, 1)
      .setStrokeStyle(2, definition.accent, 0.95);
    const rune = this.scene.add.graphics();
    this.drawRune(rune, definition);

    const petals: Phaser.GameObjects.Ellipse[] = [];
    for (let index = 0; index < 4; index += 1) {
      const angle = (Math.PI * 2 * index) / 4 + Math.PI / 4;
      const petal = this.scene.add.ellipse(
        Math.cos(angle) * 15,
        Math.sin(angle) * 7,
        7,
        4,
        index % 2 === 0 ? definition.secondary : definition.accent,
        0.95
      ).setRotation(angle);
      petals.push(petal);
    }

    const label = this.scene.add.text(0, -29, definition.name, {
      fontFamily: 'system-ui',
      fontSize: '9px',
      color: '#fff3c9',
      fontStyle: 'bold',
      stroke: '#102016',
      strokeThickness: 3
    }).setOrigin(0.5);
    const glow = this.scene.add.circle(0, -5, 15, definition.secondary, 0.05)
      .setStrokeStyle(1.5, definition.accent, 0.45);

    // A pre-existing container of purely local-offset children; scaling it
    // reproduces the whole composition at GAME_SCALE with no other edits.
    const reveal = this.scene.add.container(
      definition.x,
      definition.y,
      [shadow, moss, glow, ...petals, stone, rune, label]
    ).setName(`wildbloom-reveal-${definition.id}`).setScale(GAME_SCALE).setDepth(4);

    this.scene.tweens.add({
      targets: glow,
      scale: 1.3,
      alpha: 0.18,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    if (animate) {
      // Pop-in animates around the container's real GAME_SCALE baseline
      // rather than 1, so it grows from small up to its true rest size.
      reveal.setScale(0.2 * GAME_SCALE).setAlpha(0);
      this.scene.tweens.add({
        targets: reveal,
        scale: GAME_SCALE,
        alpha: 1,
        duration: 420,
        ease: 'Back.easeOut'
      });
    }
    return reveal;
  }

  private drawRune(graphics: Phaser.GameObjects.Graphics, definition: WildbloomSpotDefinition): void {
    graphics.lineStyle(2, definition.accent, 1);
    graphics.fillStyle(definition.secondary, 0.35);

    if (definition.rune === 'star') {
      graphics.fillTriangle(0, -13, 4, -5, -4, -5);
      graphics.fillTriangle(0, 3, 4, -5, -4, -5);
      graphics.fillTriangle(-9, -5, -1, -9, -1, -1);
      graphics.fillTriangle(9, -5, 1, -9, 1, -1);
      graphics.strokeCircle(0, -5, 7);
      return;
    }

    if (definition.rune === 'waves') {
      graphics.strokeCircle(0, -6, 7);
      graphics.beginPath();
      graphics.moveTo(-7, -7);
      graphics.lineTo(-3, -5);
      graphics.lineTo(1, -7);
      graphics.lineTo(6, -5);
      graphics.strokePath();
      graphics.beginPath();
      graphics.moveTo(-6, -2);
      graphics.lineTo(-1, 0);
      graphics.lineTo(5, -2);
      graphics.strokePath();
      return;
    }

    graphics.fillTriangle(0, -14, 7, -2, 0, 2);
    graphics.fillTriangle(0, -9, -7, -2, 0, 3);
    graphics.strokeCircle(0, -4, 8);
  }

  private createRevealBurst(definition: WildbloomSpotDefinition): void {
    const count = this.discoveredSpotIds.size === WILDBLOOM_SPOTS.length ? 22 : 14;
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count;
      const distance = sx(24) + (index % 4) * sx(5);
      const particle = index % 3 === 0
        ? this.scene.add.ellipse(definition.x, definition.y - sy(8), sx(7), sx(4), definition.secondary, 1).setRotation(angle)
        : this.scene.add.circle(definition.x, definition.y - sy(8), index % 4 === 0 ? sx(3) : sx(2), definition.accent, 1);
      particle.setDepth(8);
      this.scene.tweens.add({
        targets: particle,
        x: definition.x + Math.cos(angle) * distance,
        y: definition.y - sy(8) + Math.sin(angle) * (distance * 0.72),
        alpha: 0,
        scale: 0.2,
        duration: 460 + (index % 4) * 45,
        ease: 'Sine.easeOut',
        onComplete: () => particle.destroy()
      });
    }
  }

  private showDiscoveryToast(definition: WildbloomSpotDefinition, complete: boolean): void {
    this.toast?.destroy();

    const title = this.scene.add.text(0, -14, complete ? 'WILDBLOOM SONG COMPLETE!' : `SECRET FOUND • ${definition.name}`, {
      fontFamily: 'system-ui',
      fontSize: complete ? '14px' : '13px',
      color: '#d7ffb8',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);
    const detail = this.scene.add.text(
      0,
      10,
      complete
        ? 'Three old places answered the Sprig.'
        : `${definition.lore}\n${this.discoveredSpotIds.size}/${WILDBLOOM_SPOTS.length} secrets revealed`,
      {
        fontFamily: 'system-ui',
        fontSize: '10px',
        color: '#fff3c9',
        align: 'center',
        wordWrap: { width: 320 }
      }
    ).setOrigin(0.5);
    const background = drawRoundedPanelBackground(this.scene, 0, 0, 360, complete ? 62 : 72, 0x152016, 0x8fd14f, 9);
    // Was hardcoded to 240 (the old GAME_WIDTH/2) instead of referencing the
    // real constant — harmless while GAME_WIDTH was fixed, but would have
    // silently mis-centered this toast once the canvas resolution changed.
    this.toast = this.scene.add.container(GAME_WIDTH / 2, sy(82), [background, title, detail])
      .setName('wildbloom-discovery-toast')
      .setScrollFactor(0)
      .setScale(0.78 * GAME_SCALE)
      .setDepth(42);

    this.scene.tweens.add({
      targets: this.toast,
      scale: GAME_SCALE,
      duration: 180,
      ease: 'Back.easeOut'
    });
    this.scene.tweens.add({
      targets: this.toast,
      y: sy(72),
      alpha: 0,
      delay: complete ? 1650 : 1250,
      duration: 850,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.toast?.destroy();
        this.toast = undefined;
      }
    });
  }

  private setLocked(locked: boolean): void {
    if (this.inputLocked === locked) return;
    this.inputLocked = locked;
    this.onLockChanged(locked);
  }

  private delay(delayMs: number, callback: () => void): void {
    let timer: Phaser.Time.TimerEvent;
    timer = this.scene.time.delayedCall(delayMs, () => {
      this.delayedCalls = this.delayedCalls.filter((entry) => entry !== timer);
      callback();
    });
    this.delayedCalls.push(timer);
  }

  private clearDelayedCalls(): void {
    this.delayedCalls.forEach((timer) => timer.remove(false));
    this.delayedCalls = [];
  }
}
