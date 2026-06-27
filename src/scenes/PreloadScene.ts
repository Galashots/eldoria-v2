import Phaser from 'phaser';
import practiceSlimeSheetUrl from '../../assets/sprites/mob_slime_practice_v001.png?url';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    this.load.image('tiles', 'assets/tilesets/eldoria-placeholder.png');
    this.load.spritesheet('adventurer', 'assets/sprites/adventurer-placeholder.png', {
      frameWidth: 32,
      frameHeight: 32
    });
    this.load.spritesheet('practice-slime-v001', practiceSlimeSheetUrl, {
      frameWidth: 32,
      frameHeight: 32
    });
    this.load.tilemapTiledJSON('farm', 'maps/farm.json');
  }

  create(): void {
    this.scene.start('TitleScene');
  }
}
