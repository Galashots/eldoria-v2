import Phaser from 'phaser';
import { fpx, GAME_HEIGHT, GAME_WIDTH, sx, sy } from '../gameDimensions';
import { DEFAULT_PROFILE, PROFILES, type ProfileId } from '../data/profiles';
import { drawRoundedButton } from '../presentation/uiHelpers';
import { shouldPlayOpening } from './OpeningScene';

export class TitleScene extends Phaser.Scene {
  private selectedProfile: ProfileId = DEFAULT_PROFILE;

  constructor() {
    super('TitleScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1a1208');
    this.drawBackground();

    this.add.text(GAME_WIDTH / 2, sy(44), 'Realm of Eldoria v2', {
      fontFamily: 'system-ui',
      fontSize: fpx(24),
      color: '#ffd666',
      stroke: '#3a2208',
      strokeThickness: 8
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, sy(76), 'Old magic is waking in Eldoria. Learning helps — adventure never waits.', {
      fontFamily: 'system-ui',
      fontSize: fpx(12),
      color: '#f5e6c8',
      align: 'center'
    }).setOrigin(0.5);

    this.addAmbientSparkles();

    this.addProfileButton(sy(116), 'grade2-mage');
    this.addProfileButton(sy(184), 'grade5-adventurer');

    // Pulled up from the very bottom of the frame: with the gradient behind
    // it, the space between the cards and this line no longer needs to be
    // this large to avoid feeling empty.
    this.add.text(GAME_WIDTH / 2, sy(238), 'Tap a hero to start', {
      fontFamily: 'system-ui',
      fontSize: fpx(13),
      color: '#c9a66b'
    }).setOrigin(0.5);
  }

  /**
   * A warm vertical gradient plus a soft amber glow near the bottom third,
   * standing in for a dusk sky until real background art exists — costs no
   * new art assets and stops the title screen from being a flat color field.
   */
  private drawBackground(): void {
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x1a1208, 0x1a1208, 0x2a1a08, 0x2a1a08, 1, 1, 1, 1);
    sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const glow = this.add.graphics();
    glow.fillGradientStyle(0x3a2208, 0x3a2208, 0x5f3d12, 0x5f3d12, 0, 0, 0.4, 0.4);
    glow.fillRect(0, GAME_HEIGHT * 0.55, GAME_WIDTH, GAME_HEIGHT * 0.45);
  }

  /**
   * A handful of slow, staggered-fade sparkle dots near the title text —
   * a cheap "something magical is here" cue that costs no new art and
   * doesn't sit over any button hitbox.
   */
  private addAmbientSparkles(): void {
    const positions = [
      { x: GAME_WIDTH / 2 - sx(168), y: sy(40) },
      { x: GAME_WIDTH / 2 + sx(176), y: sy(52) },
      { x: GAME_WIDTH / 2 - sx(140), y: sy(92) },
      { x: GAME_WIDTH / 2 + sx(150), y: sy(90) },
      { x: GAME_WIDTH / 2 + sx(200), y: sy(28) }
    ];

    positions.forEach(({ x, y }, index) => {
      const sparkle = this.add.circle(x, y, sx(1.6), 0xfff0a3, 0).setDepth(1);
      this.tweens.add({
        targets: sparkle,
        alpha: { from: 0, to: 0.9 },
        duration: 1400,
        delay: index * 260,
        yoyo: true,
        repeat: -1,
        repeatDelay: 900 + index * 180,
        ease: 'Sine.easeInOut'
      });
    });
  }

  private addProfileButton(y: number, profileId: ProfileId): void {
    const profile = PROFILES[profileId];
    const isSelected = profileId === this.selectedProfile;
    const bg = drawRoundedButton(this, GAME_WIDTH / 2, y, sx(310), sy(48), isSelected ? 0x5f3d12 : 0x2a1a08, isSelected ? 0xffd666 : 0x6f5126, 16);

    this.add.text(GAME_WIDTH / 2, y - sy(8), profile.label, {
      fontFamily: 'system-ui',
      fontSize: fpx(16),
      color: '#ffffff'
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, y + sy(12), profile.subtitle, {
      fontFamily: 'system-ui',
      fontSize: fpx(11),
      color: '#f5e6c8'
    }).setOrigin(0.5);

    bg.on('pointerdown', () => {
      // Existing regression tests intentionally enter the world directly;
      // the dedicated opening-scene spec covers this new first-run beat.
      const playOpening = !window.__ELDORIA_E2E__ && shouldPlayOpening(profileId);
      this.scene.start(playOpening ? 'OpeningScene' : 'WorldScene', { profileId });
    });
  }
}
