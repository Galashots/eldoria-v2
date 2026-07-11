import Phaser from 'phaser';
import { GAME_SCALE, sscale, sy } from '../gameDimensions';
import type { ProfileId } from '../data/profiles';

export type HeroFacing = 'front' | 'back' | 'left' | 'right';
export type HeroMotion = 'idle' | 'walk' | 'action' | 'hurt';

type DirectionalAnimations = Record<HeroFacing, string>;

type HeroClipConfig = {
  textureKey: string;
  animations: DirectionalAnimations;
  framesPerDirection: number;
  frameRate: number;
  repeat: number;
};

export type HeroPresentationConfig = {
  profileId: ProfileId;
  verticalOffset: number;
  clips: Record<HeroMotion, HeroClipConfig>;
};

const DIRECTIONS: HeroFacing[] = ['front', 'back', 'left', 'right'];
const RANGER_PROFILE_ID: ProfileId = 'grade5-adventurer';

/**
 * Shared facing calculation for a normalized movement/velocity vector.
 * Horizontal intent wins once it clears the deadzone; otherwise facing
 * follows vertical intent (up = 'back', anything else = 'front').
 */
export function facingFromVector(x: number, y: number): HeroFacing {
  if (x < -0.35) return 'left';
  if (x > 0.35) return 'right';
  return y < 0 ? 'back' : 'front';
}

const mageAnimations = (motion: 'idle' | 'walk' | 'cast' | 'hurt'): DirectionalAnimations => ({
  front: `grade2-mage-${motion}-front`,
  back: `grade2-mage-${motion}-back`,
  left: `grade2-mage-${motion}-left`,
  right: `grade2-mage-${motion}-right`
});

const rangerAnimations = (motion: HeroMotion): DirectionalAnimations => ({
  front: `grade5-ranger-${motion}-front`,
  back: `grade5-ranger-${motion}-back`,
  left: `grade5-ranger-${motion}-left`,
  right: `grade5-ranger-${motion}-right`
});

const rangerClip = (motion: HeroMotion, frameRate: number, repeat: number): HeroClipConfig => ({
  textureKey: 'adventurer',
  animations: rangerAnimations(motion),
  framesPerDirection: 1,
  frameRate,
  repeat
});

export const HERO_PRESENTATION_CONFIGS: Partial<Record<ProfileId, HeroPresentationConfig>> = {
  'grade2-mage': {
    profileId: 'grade2-mage',
    verticalOffset: sy(16),
    clips: {
      idle: {
        textureKey: 'grade2-mage-idle-v001',
        animations: mageAnimations('idle'),
        framesPerDirection: 4,
        frameRate: 3,
        repeat: -1
      },
      walk: {
        textureKey: 'grade2-mage-walk-v001',
        animations: mageAnimations('walk'),
        framesPerDirection: 6,
        frameRate: 8,
        repeat: -1
      },
      action: {
        textureKey: 'grade2-mage-cast-v001',
        animations: mageAnimations('cast'),
        framesPerDirection: 4,
        frameRate: 8,
        repeat: 0
      },
      hurt: {
        textureKey: 'grade2-mage-hurt-v001',
        animations: mageAnimations('hurt'),
        framesPerDirection: 3,
        frameRate: 10,
        repeat: 0
      }
    }
  },
  'grade5-adventurer': {
    profileId: 'grade5-adventurer',
    verticalOffset: sy(16),
    clips: {
      idle: rangerClip('idle', 1, -1),
      walk: rangerClip('walk', 4, -1),
      action: rangerClip('action', 8, 0),
      hurt: rangerClip('hurt', 8, 0)
    }
  }
};

export class HeroPresentationController {
  public sprite?: Phaser.GameObjects.Sprite;

  private facing: HeroFacing = 'front';
  private motion: HeroMotion = 'idle';
  private actionActive = false;
  private hurtActive = false;
  private readonly config?: HeroPresentationConfig;
  private rangerBackAccents?: Phaser.GameObjects.Graphics;
  private rangerFrontAccents?: Phaser.GameObjects.Graphics;
  private rangerActionTimer?: Phaser.Time.TimerEvent;
  private rangerHurtTimer?: Phaser.Time.TimerEvent;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly physicsSprite: Phaser.Physics.Arcade.Sprite,
    profileId: ProfileId
  ) {
    this.config = HERO_PRESENTATION_CONFIGS[profileId];
  }

  create(): void {
    if (!this.config) return;

    // Keep the long-standing Grade 5 physics sprite as the visible base so
    // collision and regression helpers retain their existing seam. The role
    // identity is supplied by presentation-only accents around that sprite.
    if (this.isRanger()) {
      this.physicsSprite.setVisible(true).setDepth(3).setFrame(0);
      this.createRangerAccents();
      return;
    }

    for (const motion of ['idle', 'walk', 'action', 'hurt'] as const) {
      this.createAnimations(this.config.clips[motion]);
    }

    this.physicsSprite.setVisible(false);
    this.sprite = this.scene.add.sprite(
      this.physicsSprite.x,
      this.physicsSprite.y + this.config.verticalOffset,
      this.config.clips.idle.textureKey,
      0
    )
      .setOrigin(0.5, 1)
      .setScale(GAME_SCALE)
      .setDepth(3)
      .play(this.config.clips.idle.animations.front);
  }

  syncPosition(): void {
    if (!this.config) return;

    const x = this.physicsSprite.x;
    const y = this.physicsSprite.y + this.config.verticalOffset;
    this.sprite?.setPosition(x, y);
    this.rangerBackAccents?.setPosition(x, y);
    this.rangerFrontAccents?.setPosition(x, y);
  }

  setMovement(facing: HeroFacing, moving: boolean): void {
    if (this.isOneShotActive()) return;

    if (this.sprite) {
      this.setAnimation(facing, moving ? 'walk' : 'idle');
      return;
    }

    this.facing = facing;
    this.motion = moving ? 'walk' : 'idle';
    this.physicsSprite.setFrame(
      facing === 'left' ? 2 : facing === 'right' ? 3 : facing === 'back' ? 1 : 0
    );
    this.redrawRangerAccents();
  }

  setIdle(): void {
    if (this.isOneShotActive()) return;
    if (this.isRanger()) {
      this.motion = 'idle';
      this.redrawRangerAccents();
      return;
    }
    this.setAnimation(this.facing, 'idle');
  }

  setBusy(): void {
    this.cancelAction();
    this.cancelHurt();
    if (this.isRanger()) {
      this.motion = 'idle';
      this.redrawRangerAccents();
      return;
    }
    this.setAnimation(this.facing, 'idle');
  }

  playAction(busy: boolean): boolean {
    if ((!this.sprite && !this.isRanger()) || busy || this.isOneShotActive()) return false;

    this.actionActive = true;

    if (this.isRanger()) {
      this.motion = 'action';
      this.redrawRangerAccents();
      this.playRangerOneShot('action');
      return true;
    }

    const actionKey = this.config!.clips.action.animations[this.facing];
    this.setAnimation(this.facing, 'action');
    this.sprite!.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + actionKey,
      () => {
        this.actionActive = false;
        this.recover();
      }
    );
    return true;
  }

  playHurtForPreview(busy: boolean): boolean {
    // The hurt clip remains a Grade 2 development/test presentation seam.
    // Ranger identity feedback is handled by ACTION and never implies damage.
    if (this.isRanger() || !this.sprite || busy || this.hurtActive) return false;

    this.cancelAction();
    this.hurtActive = true;
    const hurtKey = this.config!.clips.hurt.animations[this.facing];
    this.setAnimation(this.facing, 'hurt');
    this.sprite.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + hurtKey,
      () => {
        this.hurtActive = false;
        this.recover();
      }
    );
    return true;
  }

  isHurtPlaying(): boolean {
    return this.hurtActive;
  }

  dispose(): void {
    this.cancelAction();
    this.cancelHurt();
    this.rangerBackAccents?.destroy();
    this.rangerFrontAccents?.destroy();
    this.rangerBackAccents = undefined;
    this.rangerFrontAccents = undefined;
    this.physicsSprite.setScale(GAME_SCALE);
  }

  private createAnimations(clip: HeroClipConfig): void {
    DIRECTIONS.forEach((facing, directionIndex) => {
      const key = clip.animations[facing];
      if (this.scene.anims.exists(key)) return;

      const start = directionIndex * clip.framesPerDirection;
      this.scene.anims.create({
        key,
        frames: this.scene.anims.generateFrameNumbers(clip.textureKey, {
          start,
          end: start + clip.framesPerDirection - 1
        }),
        frameRate: clip.frameRate,
        repeat: clip.repeat
      });
    });
  }

  private setAnimation(facing: HeroFacing, motion: HeroMotion): void {
    if (!this.sprite || !this.config || (facing === this.facing && motion === this.motion)) return;

    this.facing = facing;
    this.motion = motion;
    this.sprite.play(this.config.clips[motion].animations[facing]);
  }

  private cancelAction(): void {
    if (!this.actionActive || !this.config) return;

    this.rangerActionTimer?.remove(false);
    this.rangerActionTimer = undefined;
    this.sprite?.off(
      Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + this.config.clips.action.animations[this.facing]
    );
    this.actionActive = false;
    this.resetRangerOneShotScale();
  }

  private cancelHurt(): void {
    if (!this.hurtActive || !this.config) return;

    this.rangerHurtTimer?.remove(false);
    this.rangerHurtTimer = undefined;
    this.sprite?.off(
      Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + this.config.clips.hurt.animations[this.facing]
    );
    this.hurtActive = false;
    this.resetRangerOneShotScale();
  }

  private isOneShotActive(): boolean {
    return this.actionActive || this.hurtActive;
  }

  private recover(): void {
    if ((!this.sprite && !this.isRanger()) || this.isOneShotActive()) return;

    const body = this.physicsSprite.body as Phaser.Physics.Arcade.Body | null;
    const velocityX = body?.velocity.x ?? 0;
    const velocityY = body?.velocity.y ?? 0;
    const moving = Math.abs(velocityX) > 0.01 || Math.abs(velocityY) > 0.01;

    if (this.isRanger()) {
      this.setMovement(moving ? facingFromVector(velocityX, velocityY) : this.facing, moving);
      return;
    }

    if (!moving) {
      this.setAnimation(this.facing, 'idle');
      return;
    }

    this.setAnimation(facingFromVector(velocityX, velocityY), 'walk');
  }

  private isRanger(): boolean {
    return this.config?.profileId === RANGER_PROFILE_ID;
  }

  private createRangerAccents(): void {
    // Every drawn offset in redrawRangerAccents() stays in the original
    // local design space; scaling these two Graphics objects themselves
    // reproduces the accents at GAME_SCALE without touching that geometry.
    this.rangerBackAccents = this.scene.add.graphics().setDepth(2.9).setScale(GAME_SCALE);
    this.rangerFrontAccents = this.scene.add.graphics().setDepth(3.1).setScale(GAME_SCALE);
    this.syncPosition();
    this.redrawRangerAccents();
  }

  private redrawRangerAccents(): void {
    const back = this.rangerBackAccents;
    const front = this.rangerFrontAccents;
    if (!back || !front || !this.isRanger()) return;

    back.clear();
    front.clear();

    const side = this.facing === 'left' ? 1 : -1;
    const quiverX = this.facing === 'back' ? 8 : side * 10;

    // Quiver and arrow shafts sit behind the temporary base sprite.
    back.fillStyle(0x6b4423, 1);
    back.fillRoundedRect(quiverX - 3, -25, 6, 15, 2);
    back.lineStyle(1.5, 0xe9d39b, 1);
    back.beginPath();
    back.moveTo(quiverX - 1, -24);
    back.lineTo(quiverX - 4, -33);
    back.moveTo(quiverX + 1, -24);
    back.lineTo(quiverX + 4, -34);
    back.strokePath();
    back.fillStyle(0xa9e783, 1);
    back.fillTriangle(quiverX - 6, -33, quiverX - 2, -35, quiverX - 3, -30);
    back.fillTriangle(quiverX + 2, -34, quiverX + 6, -36, quiverX + 5, -31);

    // A compact forest-green cape gives the silhouette a readable class cue.
    back.fillStyle(0x254b2c, 0.98);
    if (this.facing === 'back') {
      back.fillRoundedRect(-11, -26, 22, 15, 5);
      back.fillTriangle(-10, -14, 0, -7, 10, -14);
    } else {
      back.fillTriangle(-9, -23, 9, -23, side * 8, -9);
    }

    // Hood rim and shoulder mantle leave the face readable from the front.
    front.fillStyle(0x315f36, 1);
    if (this.facing === 'front') {
      front.fillRoundedRect(-10, -31, 20, 5, 3);
      front.fillRect(-11, -28, 4, 8);
      front.fillRect(7, -28, 4, 8);
    } else if (this.facing === 'back') {
      front.fillRoundedRect(-11, -31, 22, 13, 5);
    } else {
      const hoodX = this.facing === 'left' ? -3 : 3;
      front.fillRoundedRect(hoodX - 8, -31, 16, 11, 4);
    }
    front.fillRoundedRect(-12, -21, 24, 6, 3);

    // Leather cross-strap anchors the bow/quiver to the torso.
    front.lineStyle(2, 0x8a5b2f, 1);
    front.beginPath();
    if (this.facing === 'back') {
      front.moveTo(-8, -20);
      front.lineTo(8, -9);
    } else {
      front.moveTo(-8, -19);
      front.lineTo(7, -9);
    }
    front.strokePath();
    front.fillStyle(0xd5b36a, 1);
    front.fillCircle(0, -14, 2);

    // The bow remains visible in every direction and stays clear of the body.
    const bowX = this.facing === 'left' ? -14 : 14;
    front.lineStyle(2, 0xa9e783, 1);
    front.beginPath();
    front.arc(
      bowX,
      -15,
      10,
      Phaser.Math.DegToRad(this.facing === 'left' ? 108 : -72),
      Phaser.Math.DegToRad(this.facing === 'left' ? 252 : 72)
    );
    front.strokePath();
    front.lineStyle(1, 0xf5e6c8, 0.95);
    front.beginPath();
    front.moveTo(bowX + (this.facing === 'left' ? -3 : 3), -25);
    front.lineTo(bowX + (this.facing === 'left' ? -3 : 3), -5);
    front.strokePath();

    if (this.motion === 'action') {
      this.drawRangerActionArrow(front);
    }
  }

  private drawRangerActionArrow(graphics: Phaser.GameObjects.Graphics): void {
    const directionX = this.facing === 'left' ? -1 : 1;
    const startX = directionX * 3;
    const endX = directionX * 19;
    const y = this.facing === 'back' ? -20 : -15;

    graphics.lineStyle(2, 0xffe39a, 1);
    graphics.beginPath();
    graphics.moveTo(startX, y);
    graphics.lineTo(endX, y);
    graphics.strokePath();
    graphics.fillStyle(0xfff4bd, 1);
    graphics.fillTriangle(
      endX + directionX * 3,
      y,
      endX - directionX * 2,
      y - 3,
      endX - directionX * 2,
      y + 3
    );
  }

  private playRangerOneShot(kind: 'action' | 'hurt'): void {
    const targets: Array<Phaser.GameObjects.Sprite | Phaser.GameObjects.Graphics> = [this.physicsSprite];
    if (this.rangerBackAccents) targets.push(this.rangerBackAccents);
    if (this.rangerFrontAccents) targets.push(this.rangerFrontAccents);

    // These punch scales replace (not multiply) the target's current
    // scaleX/scaleY, so GAME_SCALE must be folded in — otherwise the punch
    // would shrink the ranger from its 2x baseline down toward 1x.
    this.scene.tweens.add({
      targets,
      scaleX: sscale(kind === 'action' ? 1.12 : 0.9),
      scaleY: sscale(kind === 'action' ? 0.92 : 1.08),
      duration: 85,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () => this.resetRangerOneShotScale()
    });

    const finish = () => {
      if (kind === 'action') {
        this.rangerActionTimer = undefined;
        this.actionActive = false;
      } else {
        this.rangerHurtTimer = undefined;
        this.hurtActive = false;
      }
      this.recover();
    };

    if (kind === 'action') {
      this.rangerActionTimer = this.scene.time.delayedCall(190, finish);
    } else {
      this.rangerHurtTimer = this.scene.time.delayedCall(190, finish);
    }
  }

  private resetRangerOneShotScale(): void {
    this.physicsSprite.setScale(GAME_SCALE);
    this.sprite?.setScale(GAME_SCALE);
    this.rangerBackAccents?.setScale(GAME_SCALE);
    this.rangerFrontAccents?.setScale(GAME_SCALE);
  }
}
