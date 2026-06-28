import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../gameConfig';
import { DEFAULT_PROFILE, PROFILES, type ProfileId } from '../data/profiles';

export class TitleScene extends Phaser.Scene {
  private selectedProfile: ProfileId = DEFAULT_PROFILE;

  constructor() {
    super('TitleScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1a1208');

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

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 34, 'Tap a hero to start', {
      fontFamily: 'system-ui',
      fontSize: '13px',
      color: '#c9a66b'
    }).setOrigin(0.5);
  }

  private addProfileButton(y: number, profileId: ProfileId): void {
    const profile = PROFILES[profileId];
    const isSelected = profileId === this.selectedProfile;
    const bg = this.add.rectangle(GAME_WIDTH / 2, y, 310, 48, isSelected ? 0x5f3d12 : 0x2a1a08)
      .setStrokeStyle(2, isSelected ? 0xffd666 : 0x6f5126)
      .setInteractive({ useHandCursor: true });

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
