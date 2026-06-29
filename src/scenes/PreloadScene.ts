import Phaser from 'phaser';
import grade2MageCastSheetUrl from '../../assets/sprites/char_mage_boy_base_cast_v001.png?url';
import grade2MageIdleSheetUrl from '../../assets/sprites/char_mage_boy_base_idle_v001.png?url';
import grade2MageWalkSheetUrl from '../../assets/sprites/char_mage_boy_base_walk_v001.png?url';
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
    this.load.spritesheet('grade2-mage-idle-v001', grade2MageIdleSheetUrl, {
      frameWidth: 32,
      frameHeight: 48
    });
    this.load.spritesheet('grade2-mage-walk-v001', grade2MageWalkSheetUrl, {
      frameWidth: 32,
      frameHeight: 48
    });
    this.load.spritesheet('grade2-mage-cast-v001', grade2MageCastSheetUrl, {
      frameWidth: 32,
      frameHeight: 48
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
