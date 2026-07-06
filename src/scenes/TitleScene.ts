import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../gameConfig';
import { DEFAULT_PROFILE, PROFILES, type ProfileId } from '../data/profiles';
import { drawRoundedButton } from '../presentation/uiHelpers';

export class TitleScene extends Phaser.Scene {
  private selectedProfile: ProfileId = DEFAULT_PROFILE;

  constructor() {
    super('TitleScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1a1208');
    this.drawBackground();

    this.add.text(GAME_WIDTH / 2, 44, 'Realm of Eldoria v2', {
      fontFamily: 'system-ui',
      fontSize: '24px',
      color: '#ffd666',
      stroke: '#3a2208',
      strokeThickness: 4
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 76, 'Learning gives bonuses. Adventure never gets gated.', {
      fontFamily: 'system-ui',
      fontSize: '12px',
      color: '#f5e6c8',
      align: 'center'
    }).setOrigin(0.5);

    this.addProfileButton(116, 'grade2-mage');
    this.addProfileButton(184, 'grade5-adventurer');

    // Pulled up from the very bottom of the frame: with the gradient behind
    // it, the space between the cards and this line no longer needs to be
    // this large to avoid feeling empty.
    this.add.text(GAME_WIDTH / 2, 238, 'Tap a hero to start', {
      fontFamily: 'system-ui',
      fontSize: '13px',
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

  private addProfileButton(y: number, profileId: ProfileId): void {
    const profile = PROFILES[profileId];
    const isSelected = profileId === this.selectedProfile;
    const bg = drawRoundedButton(this, GAME_WIDTH / 2, y, 310, 48, isSelected ? 0x5f3d12 : 0x2a1a08, isSelected ? 0xffd666 : 0x6f5126, 8);

    this.add.text(GAME_WIDTH / 2, y - 8, profile.label, {
      fontFamily: 'system-ui',
      fontSize: '16px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, y + 12, profile.subtitle, {
      fontFamily: 'system-ui',
      fontSize: '11px',
      color: '#f5e6c8'
    }).setOrigin(0.5);

    bg.on('pointerdown', () => {
      this.scene.start('WorldScene', { profileId });
    });
  }
}
