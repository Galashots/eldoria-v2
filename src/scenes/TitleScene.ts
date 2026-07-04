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

    // Outer screen frame/decorations for fantasy book aesthetic
    const frame = this.add.graphics();
    frame.lineStyle(4, 0x3a2208); // Dark wood outer frame
    frame.strokeRect(4, 4, GAME_WIDTH - 8, GAME_HEIGHT - 8);
    frame.lineStyle(1.5, 0xffd666); // Gold inner highlight
    frame.strokeRect(8, 8, GAME_WIDTH - 16, GAME_HEIGHT - 16);

    // Title banner panel behind text
    this.add.rectangle(GAME_WIDTH / 2, 58, 380, 52, 0x2a1a08, 0.9)
      .setStrokeStyle(1.5, 0x6f5126);

    // Simulated drop shadow for title
    this.add.text(GAME_WIDTH / 2 + 1, 46, 'Realm of Eldoria v2', {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: '#1a1208',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Main title text
    this.add.text(GAME_WIDTH / 2, 44, 'Realm of Eldoria v2', {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: '#ffd666',
      fontStyle: 'bold',
      stroke: '#3a2208',
      strokeThickness: 3
    }).setOrigin(0.5);

    // Tagline / Subtitle
    this.add.text(GAME_WIDTH / 2, 78, 'Learning gives bonuses. Adventure never gets gated.', {
      fontFamily: 'system-ui',
      fontSize: '11px',
      color: '#f5e6c8',
      align: 'center'
    }).setOrigin(0.5);

    // Vertically stacked profile cards (centered at x = 240 for test coordinate clicks)
    this.addProfileCard(240, 132, 'grade2-mage');
    this.addProfileCard(240, 204, 'grade5-adventurer');

    // Footer helper text
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 32, 'Choose your hero to start', {
      fontFamily: 'system-ui',
      fontSize: '12px',
      color: '#c9a66b',
      fontStyle: 'bold'
    }).setOrigin(0.5);
  }

  private addProfileCard(x: number, y: number, profileId: ProfileId): void {
    const profile = PROFILES[profileId];
    const isSelected = profileId === this.selectedProfile;
    
    const fillStyle = isSelected ? 0x5f3d12 : 0x2a1a08;
    const strokeStyle = isSelected ? 0xffd666 : 0x6f5126;
    const strokeThickness = isSelected ? 3 : 1.5;

    // Card background
    const bg = this.add.rectangle(x, y, 320, 56, fillStyle, 0.95)
      .setStrokeStyle(strokeThickness, strokeStyle)
      .setInteractive({ useHandCursor: true });

    const gradeBandText = profileId === 'grade2-mage' ? 'Grade 2' : 'Grade 5';

    // Left-aligned card title
    const titleText = this.add.text(x - 146, y - 11, `${profile.label} (Grade ${gradeBandText})`, {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    // Left-aligned card description
    const descText = this.add.text(x - 146, y + 11, profile.subtitle, {
      fontFamily: 'system-ui',
      fontSize: '10px',
      color: '#f5e6c8'
    }).setOrigin(0, 0.5);

    // Right-aligned start action badge
    const playBadge = this.add.rectangle(x + 114, y, 54, 20, 0x3a2208)
      .setStrokeStyle(1.5, 0xc9a66b);
    const playTxt = this.add.text(x + 114, y, 'START', {
      fontFamily: 'system-ui',
      fontSize: '10px',
      color: '#c9a66b',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Interactive animations and transitions on hover
    bg.on('pointerover', () => {
      if (profileId !== this.selectedProfile) {
        bg.setStrokeStyle(3, 0xc9a66b);
        bg.setFillStyle(0x3a2208);
        playBadge.setFillStyle(0x5f3d12);
        playBadge.setStrokeStyle(1.5, 0xffd666);
        playTxt.setColor('#ffd666');
      }
    });

    bg.on('pointerout', () => {
      if (profileId !== this.selectedProfile) {
        bg.setStrokeStyle(1.5, 0x6f5126);
        bg.setFillStyle(0x2a1a08);
        playBadge.setFillStyle(0x3a2208);
        playBadge.setStrokeStyle(1.5, 0xc9a66b);
        playTxt.setColor('#c9a66b');
      }
    });

    bg.on('pointerdown', () => {
      this.scene.start('WorldScene', { profileId });
    });
  }
}
