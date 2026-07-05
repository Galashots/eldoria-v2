import Phaser from 'phaser';

/**
 * Scene-owned ambient presentation layer: a gentle day/evening light cycle,
 * drifting ambient particles, dusk fireflies, and soft actor drop-shadows.
 *
 * This controller is purely cosmetic. It never touches gameplay, saves,
 * quests, curriculum, or input, and mirrors the lifecycle shape of
 * `HeroPresentationController` (scene-owned `create()`/`update()`/`dispose()`).
 *
 * Kid-safety rule: the ambient tint stays subtle and warm and NEVER darkens the
 * world into an unreadable night. Alpha is capped low; "dusk" is a soft rose
 * glow, not darkness.
 */

const MOTE_TEXTURE_KEY = 'atmo-mote';

// Depth ladder (matches WorldScene): actors 2-3, reward sparkles 19-20,
// HUD 30-32, stats panel 100. Shadows sit under actors; the tint sits above
// actors but below sparkles/UI so feedback and menus always stay crisp.
const SHADOW_DEPTH = 1;
const MOTE_DEPTH = 4;
const FIREFLY_DEPTH = 6;
const TINT_DEPTH = 15;

type AmbientStop = {
  /** Overlay fill color. */
  color: number;
  /** Overlay alpha; never exceeds ~0.16 so the world stays readable. */
  alpha: number;
  /** Whether fireflies drift during this part of the cycle. */
  dusk: boolean;
};

// One gentle loop: soft morning gold -> near-clear noon -> warm afternoon ->
// soft dusk rose -> back toward morning. All low-alpha and warm; nothing dark.
const AMBIENT_STOPS: readonly AmbientStop[] = [
  { color: 0xffdca8, alpha: 0.12, dusk: false }, // early morning gold
  { color: 0xffffff, alpha: 0.02, dusk: false }, // bright noon (almost clear)
  { color: 0xffe0a0, alpha: 0.1, dusk: false }, // warm afternoon
  { color: 0xffb98c, alpha: 0.16, dusk: true }, // soft dusk rose
  { color: 0xf6c6b0, alpha: 0.13, dusk: true } // late dusk easing back to morning
];

// Full day/evening loop in milliseconds (~9 minutes). Long enough to be
// atmospheric rather than distracting during a 10-15 minute session.
const CYCLE_DURATION_MS = 9 * 60 * 1000;

export class AtmosphereController {
  private tint?: Phaser.GameObjects.Rectangle;
  private motes?: Phaser.GameObjects.Particles.ParticleEmitter;
  private fireflies?: Phaser.GameObjects.Particles.ParticleEmitter;
  private phaseHolder = { phase: 0 };
  private phaseTween?: Phaser.Tweens.Tween;
  private playerShadow?: Phaser.GameObjects.Ellipse;
  private playerSprite?: Phaser.GameObjects.GameObject & { x: number; y: number };
  private firefliesActive = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly viewWidth: number,
    private readonly viewHeight: number
  ) {}

  create(worldWidth: number, worldHeight: number): void {
    this.ensureMoteTexture();

    // Camera-fixed full-screen tint overlay. Non-interactive so pointer and
    // joystick input pass straight through.
    this.tint = this.scene.add
      .rectangle(0, 0, this.viewWidth, this.viewHeight, AMBIENT_STOPS[0].color, AMBIENT_STOPS[0].alpha)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(TINT_DEPTH);

    // Ambient motes drift slowly across the whole map at a low rate.
    this.motes = this.scene.add.particles(0, 0, MOTE_TEXTURE_KEY, {
      x: { min: 0, max: worldWidth },
      y: { min: 0, max: worldHeight },
      lifespan: 7000,
      speedX: { min: -6, max: 6 },
      speedY: { min: -14, max: -4 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.35, end: 0 },
      frequency: 520,
      quantity: 1,
      blendMode: 'ADD'
    });
    this.motes.setDepth(MOTE_DEPTH);

    // Dusk fireflies: warm, slow, flickering. Emit only during the dusk band.
    this.fireflies = this.scene.add.particles(0, 0, MOTE_TEXTURE_KEY, {
      x: { min: 0, max: worldWidth },
      y: { min: 0, max: worldHeight },
      lifespan: 3600,
      speedX: { min: -10, max: 10 },
      speedY: { min: -10, max: 4 },
      scale: { start: 0.9, end: 0.4 },
      alpha: { min: 0.15, max: 0.9 },
      tint: 0xfff2a0,
      frequency: 700,
      quantity: 1,
      blendMode: 'ADD'
    });
    this.fireflies.setDepth(FIREFLY_DEPTH);
    this.fireflies.stop();

    // Advance a single phase value around the ambient stop ring forever.
    this.phaseHolder.phase = 0;
    this.phaseTween = this.scene.tweens.add({
      targets: this.phaseHolder,
      phase: AMBIENT_STOPS.length,
      duration: CYCLE_DURATION_MS,
      repeat: -1,
      onUpdate: () => this.applyAmbientPhase()
    });
    this.applyAmbientPhase();
  }

  /** Soft dark ground shadow that tracks a moving actor (the player). */
  attachPlayerShadow(sprite: Phaser.GameObjects.GameObject & { x: number; y: number }): void {
    this.playerSprite = sprite;
    this.playerShadow = this.addStaticShadow(sprite.x, sprite.y, 9, 4);
  }

  /** One-off ground shadow for a static actor/marker. */
  addStaticShadow(x: number, y: number, radiusX = 8, radiusY = 4): Phaser.GameObjects.Ellipse {
    return this.scene.add
      .ellipse(x, y, radiusX * 2, radiusY * 2, 0x14100a, 0.28)
      .setDepth(SHADOW_DEPTH);
  }

  update(): void {
    if (this.playerShadow && this.playerSprite) {
      this.playerShadow.setPosition(this.playerSprite.x, this.playerSprite.y);
    }
  }

  dispose(): void {
    this.phaseTween?.remove();
    this.phaseTween = undefined;
    this.motes?.destroy();
    this.fireflies?.destroy();
    this.tint?.destroy();
    this.playerShadow?.destroy();
    this.motes = undefined;
    this.fireflies = undefined;
    this.tint = undefined;
    this.playerShadow = undefined;
    this.playerSprite = undefined;
  }

  private applyAmbientPhase(): void {
    if (!this.tint) return;

    const count = AMBIENT_STOPS.length;
    const wrapped = ((this.phaseHolder.phase % count) + count) % count;
    const index = Math.floor(wrapped);
    const next = (index + 1) % count;
    const t = wrapped - index;

    const from = AMBIENT_STOPS[index];
    const to = AMBIENT_STOPS[next];
    const blend = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(from.color),
      Phaser.Display.Color.ValueToColor(to.color),
      100,
      Math.round(t * 100)
    );
    const color = Phaser.Display.Color.GetColor(blend.r, blend.g, blend.b);
    const alpha = Phaser.Math.Linear(from.alpha, to.alpha, t);

    this.tint.setFillStyle(color, alpha);
    this.setFirefliesActive(from.dusk || to.dusk);
  }

  private setFirefliesActive(active: boolean): void {
    if (!this.fireflies || active === this.firefliesActive) return;
    this.firefliesActive = active;
    if (active) {
      this.fireflies.start();
    } else {
      this.fireflies.stop();
    }
  }

  private ensureMoteTexture(): void {
    if (this.scene.textures.exists(MOTE_TEXTURE_KEY)) return;
    const graphics = this.scene.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(2, 2, 2);
    graphics.generateTexture(MOTE_TEXTURE_KEY, 4, 4);
    graphics.destroy();
  }
}
