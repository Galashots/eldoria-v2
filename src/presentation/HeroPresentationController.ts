import Phaser from 'phaser';
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

const mageAnimations = (motion: 'idle' | 'walk' | 'cast' | 'hurt'): DirectionalAnimations => ({
  front: `grade2-mage-${motion}-front`,
  back: `grade2-mage-${motion}-back`,
  left: `grade2-mage-${motion}-left`,
  right: `grade2-mage-${motion}-right`
});

export const HERO_PRESENTATION_CONFIGS: Partial<Record<ProfileId, HeroPresentationConfig>> = {
  'grade2-mage': {
    profileId: 'grade2-mage',
    verticalOffset: 16,
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
  }
};

export class HeroPresentationController {
  public sprite?: Phaser.GameObjects.Sprite;

  private facing: HeroFacing = 'front';
  private motion: HeroMotion = 'idle';
  private actionActive = false;
  private hurtActive = false;
  private readonly config?: HeroPresentationConfig;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly physicsSprite: Phaser.Physics.Arcade.Sprite,
    profileId: ProfileId
  ) {
    this.config = HERO_PRESENTATION_CONFIGS[profileId];
  }

  create(): void {
    if (!this.config) return;

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
      .setDepth(3)
      .play(this.config.clips.idle.animations.front);
  }

  syncPosition(): void {
    if (!this.config) return;
    this.sprite?.setPosition(this.physicsSprite.x, this.physicsSprite.y + this.config.verticalOffset);
  }

  setMovement(facing: HeroFacing, moving: boolean): void {
    if (this.isOneShotActive()) return;

    if (this.sprite) {
      this.setAnimation(facing, moving ? 'walk' : 'idle');
      return;
    }

    this.facing = facing;
    if (moving) {
      this.physicsSprite.setFrame(
        facing === 'left' ? 2 : facing === 'right' ? 3 : facing === 'back' ? 1 : 0
      );
    }
  }

  setIdle(): void {
    if (this.isOneShotActive()) return;
    this.setAnimation(this.facing, 'idle');
  }

  setBusy(): void {
    this.cancelAction();
    this.cancelHurt();
    this.setAnimation(this.facing, 'idle');
  }

  playAction(busy: boolean): boolean {
    if (!this.sprite || busy || this.isOneShotActive()) return false;

    this.actionActive = true;
    const actionKey = this.config!.clips.action.animations[this.facing];
    this.setAnimation(this.facing, 'action');
    this.sprite.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + actionKey,
      () => {
        this.actionActive = false;
        this.recover();
      }
    );
    return true;
  }

  playHurtForPreview(busy: boolean): boolean {
    if (!this.sprite || busy || this.hurtActive) return false;

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

    this.sprite?.off(
      Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + this.config.clips.action.animations[this.facing]
    );
    this.actionActive = false;
  }

  private cancelHurt(): void {
    if (!this.hurtActive || !this.config) return;

    this.sprite?.off(
      Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + this.config.clips.hurt.animations[this.facing]
    );
    this.hurtActive = false;
  }

  private isOneShotActive(): boolean {
    return this.actionActive || this.hurtActive;
  }

  private recover(): void {
    if (!this.sprite || this.isOneShotActive()) return;

    const body = this.physicsSprite.body as Phaser.Physics.Arcade.Body | null;
    const velocityX = body?.velocity.x ?? 0;
    const velocityY = body?.velocity.y ?? 0;
    const moving = Math.abs(velocityX) > 0.01 || Math.abs(velocityY) > 0.01;

    if (!moving) {
      this.setAnimation(this.facing, 'idle');
      return;
    }

    const facing: HeroFacing = velocityX < -0.35
      ? 'left'
      : velocityX > 0.35
        ? 'right'
        : velocityY < 0
          ? 'back'
          : 'front';
    this.setAnimation(facing, 'walk');
  }
}
