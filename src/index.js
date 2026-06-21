import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { StartScene } from './scenes/StartScene';
import { GameScene } from './scenes/GameScene';

const config = {
  type: Phaser.AUTO,
  width: 480,
  height: 720,
  parent: 'game-container',
  backgroundColor: '#1a1a1a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, StartScene, GameScene],
};

new Phaser.Game(config);
