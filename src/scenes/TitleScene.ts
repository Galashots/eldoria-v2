import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../gameConfig';
import { DEFAULT_PROFILE, PROFILES, type ProfileId } from '../data/profiles';

export class TitleScene extends Phaser.Scene {
  private selectedProfile: ProfileId = DEFAULT_PROFILE;

  constructor() {
    super('TitleScene');
  }

  create(): void {
    // Deep twilight fantasy blue background
    this.cameras.main.setBackgroundColor('#111a2e');

    // Subtle background magical glows (soft blue and green)
    this.add.circle(GAME_WIDTH * 0.2, GAME_HEIGHT * 0.35, 120, 0x1f3c5c, 0.2);
    this.add.circle(GAME_WIDTH * 0.8, GAME_HEIGHT * 0.65, 140, 0x124734, 0.15);

    // Outer screen frame/decorations for fantasy book aesthetic
    const frame = this.add.graphics();
    frame.lineStyle(4, 0x3d2812); // Warm wood outer frame
    frame.strokeRect(4, 4, GAME_WIDTH - 8, GAME_HEIGHT - 8);
    frame.lineStyle(1.5, 0xffd666); // Gold inner highlight
    frame.strokeRect(8, 8, GAME_WIDTH - 16, GAME_HEIGHT - 16);

    // Draw decorative stars in corners
    this.drawFantasyStar(frame, 15, 15);
    this.drawFantasyStar(frame, GAME_WIDTH - 15, 15);
    this.drawFantasyStar(frame, 15, GAME_HEIGHT - 15);
    this.drawFantasyStar(frame, GAME_WIDTH - 15, GAME_HEIGHT - 15);

    // Title banner panel behind text with gold trim
    this.add.rectangle(GAME_WIDTH / 2, 58, 380, 52, 0x18243c, 0.95)
      .setStrokeStyle(1.5, 0xffd666);

    // Simulated drop shadow for title
    this.add.text(GAME_WIDTH / 2 + 1, 46, 'Realm of Eldoria v2', {
      fontFamily: 'Georgia, serif',
      fontSize: '26px',
      color: '#080d1a',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Main title text
    this.add.text(GAME_WIDTH / 2, 44, 'Realm of Eldoria v2', {
      fontFamily: 'Georgia, serif',
      fontSize: '26px',
      color: '#ffd666',
      fontStyle: 'bold',
      stroke: '#221408',
      strokeThickness: 3
    }).setOrigin(0.5);

    // Tagline / Subtitle (softer twilight blue-white)
    this.add.text(GAME_WIDTH / 2, 82, 'Learning gives bonuses. Adventure never gets gated.', {
      fontFamily: 'system-ui',
      fontSize: '11px',
      color: '#cbe0f5',
      align: 'center'
    }).setOrigin(0.5);

    // Vertically stacked profile cards (centered at x = 240 for test coordinate clicks)
    this.addProfileCard(240, 132, 'grade2-mage');
    this.addProfileCard(240, 204, 'grade5-adventurer');

    // Footer helper text (bright gold)
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 32, 'Choose your hero to start', {
      fontFamily: 'system-ui',
      fontSize: '13px',
      color: '#ffd666',
      fontStyle: 'bold',
      stroke: '#080d1a',
      strokeThickness: 2
    }).setOrigin(0.5);
  }

  private addProfileCard(x: number, y: number, profileId: ProfileId): void {
    const profile = PROFILES[profileId];
    const isSelected = profileId === this.selectedProfile;
    
    // Warmer and brighter card fills
    const fillStyle = isSelected ? 0x243554 : 0x1b263b;
    const strokeStyle = isSelected ? 0xffd666 : 0x415a77;
    const strokeThickness = isSelected ? 3 : 1.5;

    // Card background
    const bg = this.add.rectangle(x, y, 320, 56, fillStyle, 0.95)
      .setStrokeStyle(strokeThickness, strokeStyle)
      .setInteractive({ useHandCursor: true });

    const gradeBandText = profileId === 'grade2-mage' ? 'Grade 2' : 'Grade 5';

    // Left-aligned card title (fixed text bug from Mage (Grade Grade 2) to Mage (Grade 2))
    const titleText = this.add.text(x - 110, y - 11, `${profile.label} (${gradeBandText})`, {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    // Left-aligned card description
    const descText = this.add.text(x - 110, y + 11, profile.subtitle, {
      fontFamily: 'system-ui',
      fontSize: '10px',
      color: '#f5e6c8'
    }).setOrigin(0, 0.5);

    // Decorative magical icon badge on the left side of the card
    const iconG = this.add.graphics();
    if (profileId === 'grade2-mage') {
      this.drawFantasyStar(iconG, x - 134, y);
    } else {
      iconG.fillStyle(0xffd666, 0.95);
      iconG.beginPath();
      iconG.moveTo(x - 134, y - 6);
      iconG.lineTo(x - 128, y);
      iconG.lineTo(x - 134, y + 6);
      iconG.lineTo(x - 140, y);
      iconG.closePath();
      iconG.fillPath();
    }

    // Right-aligned start action badge (slightly wider touch target)
    const playBadge = this.add.rectangle(x + 112, y, 60, 22, 0x1b263b)
      .setStrokeStyle(1.5, 0xc9a66b);
    const playTxt = this.add.text(x + 112, y, 'START', {
      fontFamily: 'system-ui',
      fontSize: '10px',
      color: '#c9a66b',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Interactive animations and transitions on hover
    bg.on('pointerover', () => {
      bg.setStrokeStyle(3, 0xffd666);
      bg.setFillStyle(0x2e3e5c);
      playBadge.setFillStyle(0x3a4f7c);
      playBadge.setStrokeStyle(1.5, 0xffffff);
      playTxt.setColor('#ffffff');
    });

    bg.on('pointerout', () => {
      if (profileId !== this.selectedProfile) {
        bg.setStrokeStyle(1.5, 0x415a77);
        bg.setFillStyle(0x1b263b);
        playBadge.setFillStyle(0x1b263b);
        playBadge.setStrokeStyle(1.5, 0xc9a66b);
        playTxt.setColor('#c9a66b');
      } else {
        bg.setStrokeStyle(3, 0xffd666);
        bg.setFillStyle(0x243554);
        playBadge.setFillStyle(0x1b263b);
        playBadge.setStrokeStyle(1.5, 0xc9a66b);
        playTxt.setColor('#c9a66b');
      }
    });

    bg.on('pointerdown', () => {
      this.scene.start('WorldScene', { profileId });
    });
  }

  private drawFantasyStar(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0xffd666, 0.95);
    g.beginPath();
    g.moveTo(x, y - 6);
    g.lineTo(x + 2, y - 2);
    g.lineTo(x + 6, y);
    g.lineTo(x + 2, y + 2);
    g.lineTo(x, y + 6);
    g.lineTo(x - 2, y + 2);
    g.lineTo(x - 6, y);
    g.lineTo(x - 2, y - 2);
    g.closePath();
    g.fillPath();
  }
}
