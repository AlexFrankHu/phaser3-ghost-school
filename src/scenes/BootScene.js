import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Tiles and map
    this.load.image('tile', 'assets/images/Tile.png');
    this.load.image('building', 'assets/images/Building.png');
    this.load.image('ghostHome', 'assets/images/GhostHome.png');
    this.load.image('bed', 'assets/images/bed.png');
    this.load.image('playerbed', 'assets/images/playerbed.png');
    this.load.image('door', 'assets/images/door.png');
    this.load.image('eye', 'assets/images/Eye.png');
    this.load.image('selectFrame', 'assets/images/selectFrame.png');
    this.load.image('ghostmap', 'assets/images/ghostmap.png');

    // Buildings
    this.load.image('electricity', 'assets/images/electricity.png');
    this.load.image('gun', 'assets/images/gun.png');
    this.load.image('canbuild', 'assets/images/canbuild1.png');

    // UI
    this.load.image('toLeft', 'assets/images/toLeft.png');
    this.load.image('toRight', 'assets/images/toRight.png');
    this.load.image('toUp', 'assets/images/toUp.png');
    this.load.image('toDown', 'assets/images/toDown.png');
    this.load.image('btn_bg', 'assets/images/btn_bg.png');
    this.load.image('coin', 'assets/images/coin.png');
    this.load.image('coin_bg', 'assets/images/coin_bg.png');
    this.load.image('leidian', 'assets/images/leidian.png');
    this.load.image('bedicon', 'assets/images/bedicon.png');
    this.load.image('testBtn', 'assets/images/testBtn.png');
    this.load.image('update', 'assets/images/update.png');
    this.load.image('update1', 'assets/images/update1.png');
    this.load.image('repair', 'assets/images/repair.png');
    this.load.image('chanzi', 'assets/images/chanzi.png');

    // Combat
    this.load.image('blood_bar', 'assets/images/blood_bar.png');
    this.load.image('blood_bar_bg', 'assets/images/blood_bar_bg.png');
    this.load.image('blood_bar_red', 'assets/images/blood_bar_red.png');
    this.load.image('hit', 'assets/images/hit.png');
    this.load.image('zidan', 'assets/images/zidan.png');
    this.load.image('dead', 'assets/images/dead.png');

    // Dialogs
    this.load.image('dialog_bg', 'assets/images/dialog_bg.png');
    this.load.image('dialog_bg1', 'assets/images/dialog_bg1.png');
    this.load.image('intro', 'assets/images/intro.png');

    // Spritesheets
    this.load.spritesheet('player', 'assets/images/Player.png', {
      frameWidth: 32,
      frameHeight: 48,
    });
    this.load.spritesheet('ghost', 'assets/images/Ghost.png', {
      frameWidth: 25,
      frameHeight: 44,
    });

    // Loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
    });
  }

  create() {
    // Create player animations
    this.anims.create({
      key: 'player_down',
      frames: this.anims.generateFrameNumbers('player', { start: 0, end: 2 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'player_left',
      frames: this.anims.generateFrameNumbers('player', { start: 3, end: 5 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'player_right',
      frames: this.anims.generateFrameNumbers('player', { start: 6, end: 8 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'player_up',
      frames: this.anims.generateFrameNumbers('player', { start: 9, end: 11 }),
      frameRate: 10,
      repeat: -1,
    });

    // Create ghost animations
    this.anims.create({
      key: 'ghost_down',
      frames: this.anims.generateFrameNumbers('ghost', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'ghost_left',
      frames: this.anims.generateFrameNumbers('ghost', { start: 4, end: 7 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'ghost_right',
      frames: this.anims.generateFrameNumbers('ghost', { start: 8, end: 11 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'ghost_up',
      frames: this.anims.generateFrameNumbers('ghost', { start: 12, end: 15 }),
      frameRate: 10,
      repeat: -1,
    });

    this.scene.start('StartScene');
  }
}
