import Phaser from 'phaser';
import './styles/global.css';
import { gameConfig } from './gameConfig';

declare global {
  interface Window {
    __ELDORIA_GAME__?: Phaser.Game;
    __ELDORIA_E2E__?: boolean;
  }
}

// Production keeps Phaser.AUTO so capable browsers use WebGL. Playwright sets
// __ELDORIA_E2E__ before page scripts run; forcing Canvas there avoids
// Chromium/SwiftShader WebGL-context exhaustion across the reload-heavy suite
// without changing any other game configuration.
const runtimeConfig = window.__ELDORIA_E2E__
  ? { ...gameConfig, type: Phaser.CANVAS }
  : gameConfig;

const game = new Phaser.Game(runtimeConfig);

if (import.meta.env.DEV || window.__ELDORIA_E2E__) {
  window.__ELDORIA_GAME__ = game;
}
