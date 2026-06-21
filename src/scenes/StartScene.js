import Phaser from 'phaser';

export class StartScene extends Phaser.Scene {
  constructor() {
    super('StartScene');
  }

  create() {
    const { width, height } = this.cameras.main;
    this.add.image(width / 2, height / 2, 'intro').setDisplaySize(width, height);

    this.time.delayedCall(1000, () => {
      this.input.on('pointerdown', () => {
        this.scene.start('GameScene');
      });
      this.input.keyboard.on('keydown', () => {
        this.scene.start('GameScene');
      });
    });
  }
}
