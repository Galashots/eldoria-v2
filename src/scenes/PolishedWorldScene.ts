import Phaser from 'phaser';
import type { ProfileId } from '../data/profiles';
import { GAME_HEIGHT, GAME_WIDTH } from '../gameConfig';
import { WorldScene } from './WorldScene';

type PolishedSceneInitData = {
  profileId?: ProfileId;
  fromOpening?: boolean;
};

type WorldSceneTarget = {
  id: string;
  x: number;
  y: number;
  label: string;
};

type WorldScenePresentationInternals = {
  player: Phaser.Physics.Arcade.Sprite;
  targets: WorldSceneTarget[];
  hintText: Phaser.GameObjects.Text;
  objectiveText: Phaser.GameObjects.Text;
};

/**
 * Presentation-only wrapper around the verified farm scene.
 *
 * This keeps the first-minute visual pass isolated from quest, save, learning,
 * collision, and interaction logic while the farm art is still transitional.
 * The base scene remains the source of gameplay truth; this subclass adds the
 * gate-arrival continuity, clearer Mira guidance, shadows, atmosphere, and
 * less developer-like helper wording requested by the product review.
 */
export class PolishedWorldScene extends WorldScene {
  private arrivedFromOpening = false;
  private playerShadow?: Phaser.GameObjects.Ellipse;
  private miraPulse?: Phaser.GameObjects.Arc;

  init(data: PolishedSceneInitData): void {
    this.arrivedFromOpening = data.fromOpening === true;
    super.init(data);
  }

  create(): void {
    super.create();
    this.addFarmColorGrade();
    this.addPlayerShadow();
    this.addMiraGuidance();
    this.polishHudTypography();

    if (this.arrivedFromOpening) {
      this.playGateArrival();
    }
  }

  update(): void {
    super.update();

    const { player, hintText } = this.presentationInternals;
    this.playerShadow?.setPosition(player.x, player.y + 9);

    const currentHint = hintText.text;
    if (currentHint === 'Explore. Learning bonuses are optional.') {
      hintText.setText('Old magic is stirring nearby.');
    } else if (currentHint.startsWith('Action: ')) {
      hintText.setText(`ACTION • ${currentHint.slice('Action: '.length)}`);
    }
  }

  private get presentationInternals(): WorldScenePresentationInternals {
    // WorldScene uses TypeScript `private`, not ECMAScript #private fields.
    // This narrow presentation seam intentionally reads only stable scene
    // objects after `super.create()`; it does not mutate gameplay state.
    return this as unknown as WorldScenePresentationInternals;
  }

  private addFarmColorGrade(): void {
    const vignette = this.add.graphics()
      .setScrollFactor(0)
      .setDepth(1);

    // Very low-alpha edge bands add depth without obscuring the placeholder
    // tile readability or turning the child-friendly daytime farm into night.
    vignette.fillGradientStyle(0x0c2a20, 0x0c2a20, 0x102819, 0x102819, 0.08, 0.08, 0.02, 0.02);
    vignette.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    for (let index = 0; index < 14; index += 1) {
      const x = 26 + ((index * 89) % (GAME_WIDTH - 52));
      const y = 76 + ((index * 53) % (GAME_HEIGHT - 112));
      const mote = this.add.circle(x, y, index % 4 === 0 ? 2 : 1, index % 3 === 0 ? 0xffe39a : 0xd7ffb8, 0.18)
        .setScrollFactor(0)
        .setDepth(2);
      this.tweens.add({
        targets: mote,
        y: y - 8 - (index % 4) * 2,
        alpha: 0.04,
        duration: 1700 + index * 90,
        yoyo: true,
        repeat: -1,
        delay: index * 80,
        ease: 'Sine.easeInOut'
      });
    }
  }

  private addPlayerShadow(): void {
    const { player } = this.presentationInternals;
    this.playerShadow = this.add.ellipse(player.x, player.y + 9, 26, 10, 0x06110d, 0.35)
      .setDepth(1);
  }

  private addMiraGuidance(): void {
    const mira = this.presentationInternals.targets.find((target) => target.id === 'mira');
    if (!mira) return;

    const glow = this.add.circle(mira.x, mira.y - 13, 16, 0xffd666, 0.08)
      .setStrokeStyle(2, 0xffd666, 0.9)
      .setDepth(3);
    this.miraPulse = glow;

    const marker = this.add.graphics().setPosition(mira.x, mira.y - 13).setDepth(4);
    marker.fillStyle(0xfff2ad, 1);
    marker.fillTriangle(0, -8, 4, 0, 0, 8);
    marker.fillTriangle(0, -8, -4, 0, 0, 8);
    marker.fillTriangle(-8, 0, 0, -4, 8, 0);
    marker.fillTriangle(-8, 0, 0, 4, 8, 0);

    this.tweens.add({
      targets: [glow, marker],
      scale: 1.18,
      alpha: { from: 0.62, to: 1 },
      duration: 720,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private polishHudTypography(): void {
    const { hintText, objectiveText } = this.presentationInternals;

    if (objectiveText.text === 'Objective: Talk to Mira near the path.') {
      objectiveText.setText("The gate's magic flew toward Mira—find her by the path.");
    }

    objectiveText
      .setColor('#fff3c9')
      .setFontStyle('bold')
      .setStroke('#102016', 2);

    hintText
      .setColor('#fff3c9')
      .setBackgroundColor('#1a140d')
      .setPadding({ x: 10, y: 4 })
      .setStroke('#0d0905', 2);
  }

  private playGateArrival(): void {
    const { player, targets } = this.presentationInternals;
    const mira = targets.find((target) => target.id === 'mira');

    this.cameras.main.fadeIn(360, 12, 10, 18);

    const arrivalRing = this.add.circle(player.x, player.y + 2, 10, 0x8f63ff, 0.08)
      .setStrokeStyle(3, 0xcdb8ff, 0.95)
      .setDepth(5);
    this.tweens.add({
      targets: arrivalRing,
      scale: 3.6,
      alpha: 0,
      duration: 760,
      ease: 'Sine.easeOut',
      onComplete: () => arrivalRing.destroy()
    });

    for (let index = 0; index < 18; index += 1) {
      const angle = (Math.PI * 2 * index) / 18;
      const sparkle = this.add.circle(
        player.x,
        player.y,
        index % 4 === 0 ? 3 : 2,
        index % 2 === 0 ? 0xcdb8ff : 0xffe39a,
        1
      ).setDepth(6);
      this.tweens.add({
        targets: sparkle,
        x: player.x + Math.cos(angle) * (25 + (index % 4) * 6),
        y: player.y + Math.sin(angle) * (18 + (index % 4) * 5) - 8,
        alpha: 0,
        scale: 0.25,
        duration: 620 + index * 14,
        ease: 'Sine.easeOut',
        onComplete: () => sparkle.destroy()
      });
    }

    if (mira) {
      this.createGuidingTrail(player.x, player.y - 8, mira.x, mira.y - 12);
    }
  }

  private createGuidingTrail(startX: number, startY: number, endX: number, endY: number): void {
    const points = 7;
    for (let index = 1; index <= points; index += 1) {
      const progress = index / (points + 1);
      const x = Phaser.Math.Linear(startX, endX, progress);
      const y = Phaser.Math.Linear(startY, endY, progress) - Math.sin(progress * Math.PI) * 18;
      const sparkle = this.add.circle(x, y, index % 3 === 0 ? 3 : 2, 0xcdb8ff, 0)
        .setStrokeStyle(1, 0xffffff, 0.8)
        .setDepth(5);

      this.tweens.add({
        targets: sparkle,
        alpha: { from: 0, to: 0.95 },
        scale: { from: 0.5, to: 1.25 },
        delay: 240 + index * 110,
        duration: 260,
        yoyo: true,
        hold: 220,
        ease: 'Sine.easeInOut',
        onComplete: () => sparkle.destroy()
      });
    }

    if (this.miraPulse) {
      this.tweens.add({
        targets: this.miraPulse,
        scale: 1.45,
        alpha: 1,
        delay: 980,
        duration: 260,
        yoyo: true,
        ease: 'Back.easeOut'
      });
    }
  }
}
