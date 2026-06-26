import Phaser from 'phaser';

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
    this.load.tilemapTiledJSON('farm', 'maps/farm.json');
  }

  create(): void {
    this.scene.start('TitleScene');
  }
}
