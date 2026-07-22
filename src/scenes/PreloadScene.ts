import Phaser from 'phaser';
import { MAP_REGISTRY } from '../data/maps';
import { FARM_SCATTER_TEXTURE_KEY } from '../data/farmDecorScatterConfig';
import grade2MageCastSheetUrl from '../../assets/sprites/char_mage_boy_base_cast_v001.png?url';
import grade2MageHurtSheetUrl from '../../assets/sprites/char_mage_boy_base_hurt_v001.png?url';
import grade2MageIdleSheetUrl from '../../assets/sprites/char_mage_boy_base_idle_v001.png?url';
import grade2MageWalkSheetUrl from '../../assets/sprites/char_mage_boy_base_walk_v001.png?url';
import practiceSlimeSheetUrl from '../../assets/sprites/mob_slime_practice_v001.png?url';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    this.load.image('tiles', 'assets/tilesets/eldoria-placeholder.png');
    // Approved terrain proof tileset (grass/water/dirt masters, 2x upscaled
    // onto the map's 32px grid). See scripts/compose-terrain-proof-tileset.mjs.
    this.load.image('terrain-tiles', 'assets/tilesets/farm-terrain-proof.png');
    // Approved Farm grass-scatter Decor family (tuft_a/tuft_b/pebble_a/
    // flower_a, packed row-major in that order, 2x upscaled onto the map's
    // 32px grid). See scripts/compose-farm-scatter-tileset.mjs and
    // src/data/farmDecorScatterConfig.ts.
    this.load.spritesheet(FARM_SCATTER_TEXTURE_KEY, 'assets/tilesets/tile_farm_grass_scatter.png', {
      frameWidth: 32,
      frameHeight: 32
    });
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
    this.load.spritesheet('grade2-mage-hurt-v001', grade2MageHurtSheetUrl, {
      frameWidth: 32,
      frameHeight: 48
    });
    this.load.spritesheet('practice-slime-v001', practiceSlimeSheetUrl, {
      frameWidth: 32,
      frameHeight: 32
    });
    // Every registered map's tilemap JSON loads through the registry (see
    // data/maps.ts) rather than per-map hardcodes; tileset images above keep
    // their stable cache keys ('tiles', 'terrain-tiles') that the registry
    // entries reference. Adding a map should not require touching this file
    // unless it introduces a brand-new tileset image or music track.
    for (const mapDef of Object.values(MAP_REGISTRY)) {
      this.load.tilemapTiledJSON(mapDef.tiledKey, mapDef.jsonPath);
    }

    this.load.audio('bgm-farm', 'assets/audio/music/farm-theme-loop.wav');
    this.load.audio('sfx-footstep', 'assets/audio/sfx/footstep.wav');
    this.load.audio('sfx-interact', 'assets/audio/sfx/interact.wav');
    this.load.audio('sfx-reward', 'assets/audio/sfx/reward.wav');
    this.load.audio('sfx-quest-complete', 'assets/audio/sfx/quest-complete.wav');
    this.load.audio('sfx-ui-tap', 'assets/audio/sfx/ui-tap.wav');
    this.load.audio('sfx-text-blip', 'assets/audio/sfx/text-blip.wav');
  }

  create(): void {
    this.scene.start('TitleScene');
  }
}
