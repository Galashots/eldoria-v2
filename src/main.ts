import Phaser from 'phaser';
import './styles/global.css';
import { gameConfig } from './gameConfig';

declare global {
  interface Window {
    __ELDORIA_GAME__?: Phaser.Game;
    __ELDORIA_E2E__?: boolean;
  }
}

const game = new Phaser.Game(gameConfig);

if (import.meta.env.DEV || window.__ELDORIA_E2E__) {
  window.__ELDORIA_GAME__ = game;
}
