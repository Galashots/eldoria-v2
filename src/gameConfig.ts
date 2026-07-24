import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { OpeningScene } from './scenes/OpeningScene';
import { PolishedWorldScene } from './scenes/PolishedWorldScene';

// Re-exported from the Phaser-free gameDimensions module (not defined here)
// so Node-side tooling — e.g. tests/support/canvas.ts — can import the real
// GAME_WIDTH/GAME_HEIGHT without transitively importing 'phaser', which
// throws outside a browser.
export {
  GAME_HEIGHT,
  GAME_SCALE,
  GAME_WIDTH,
  LEGACY_GAME_HEIGHT,
  LEGACY_GAME_WIDTH,
  sx,
  sy
} from './gameDimensions';
import { GAME_HEIGHT, GAME_WIDTH } from './gameDimensions';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: '#1a1208',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  // Two active touch pointers so the movement thumb (lower-left joystick) and
  // an ACTION tap (lower-right) can be down at the same time on a tablet.
  // Configured once here rather than via addPointer() in a scene, because the
  // InputManager is game-wide and a per-scene-create addPointer() would leak
  // pointers across map transitions (which restart WorldScene).
  input: {
    activePointers: 2
  },
  scene: [PreloadScene, TitleScene, OpeningScene, PolishedWorldScene]
};
