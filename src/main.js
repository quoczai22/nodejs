import Phaser from 'phaser';
import './style.css';
import { GAME_WIDTH, GAME_HEIGHT } from './config';
import BootScene from './scenes/BootScene';
import MenuScene from './scenes/MenuScene';
import GameScene from './scenes/GameScene';

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'app',
  backgroundColor: '#111620',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 3600 },
      tileBias: 64,
      debug: false,
    },
  },
  pixelArt: true,
  roundPixels: false,
  scene: [BootScene, MenuScene, GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
