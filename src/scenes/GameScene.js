import Phaser from 'phaser';
import { GameMap } from '../objects/GameMap';
import { TileType, TILE_SIZE, State, BuildFlag, HomeFlag, SelectState } from '../config/Constants';
import { AutoFindWay } from '../utils/AutoFindWay';
import { getGhostLevelInfo } from '../config/GhostConfig';
import { getDoorLevelInfo } from '../config/DoorConfig';
import { getGunLevelInfo } from '../config/GunConfig';
import { getLeidianLevelInfo } from '../config/LeidianConfig';
import { getHomeLevelInfo } from '../config/PlayerHomeConfig';
import {
  initDoorDir, resetDoorBlood, updateDoorCurrentPos,
  isDoorCanUpdate, doorUpdate, isHomeCanUpdate, homeUpdate,
  isCanBuildGun, buildGun, isCanBuildElectricity, buildElectricity,
  isCanUpdateBP, updateBP, isCanClearBP, clearBP, deadClearBP,
} from '../objects/PlayerHomeHelper';

const MAX_GHOST_LEVEL = 40;
const T = TILE_SIZE;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    // Parse map
    this.gameMap = new GameMap(this);
    this.gameMap.init();

    // Rendering layers
    this.mapLayer = this.add.container(0, 0);
    this.entityLayer = this.add.container(0, 0);
    this.uiLayer = this.add.container(0, 0).setScrollFactor(0);

    this._renderStaticMap();
    this._initPlayer();
    this._initRobots();
    this._initGhost();
    this._initEye();
    this._initSelectFrame();
    this._initBullets();
    this._initUI();
    this._initCamera();

    // Game state
    this.selectState = SelectState.PLAYER;
    this.gameStarted = false;
    this.gameOver = false;

    this._showStartDialog();
  }

  /* ===================== MAP RENDERING ===================== */
  _renderStaticMap() {
    for (let y = 0; y < this.gameMap.mapHeight; y++) {
      for (let x = 0; x < this.gameMap.mapWidth; x++) {
        const pix = this.gameMap.tiles[x][y];
        const drawX = x * T;
        const drawY = y * T;
        let img = null;
        if (pix === TileType.TILE) {
          img = this.add.image(drawX, drawY, 'tile').setOrigin(0, 0).setDisplaySize(T, T);
        } else if (pix === TileType.BUILDING) {
          img = this.add.image(drawX, drawY, 'building').setOrigin(0, 0).setDisplaySize(T, T);
        } else if (pix === TileType.PLAYER_HOME) {
          img = this.add.image(drawX, drawY, 'bed').setOrigin(0, 0).setDisplaySize(T, T);
        } else if (pix === TileType.GHOST_HOME) {
          img = this.add.image(drawX, drawY, 'ghostHome').setOrigin(0, 0).setDisplaySize(T, T);
        } else if (pix === TileType.DOOR_START) {
          img = this.add.image(drawX, drawY, 'tile').setOrigin(0, 0).setDisplaySize(T, T);
        }
        if (img) this.mapLayer.add(img);
      }
    }
  }

  /* ===================== PLAYER ===================== */
  _initPlayer() {
    const sp = this.gameMap.playerStartPos;
    this.player = {
      state: State.SPAWN,
      x: sp.x,
      y: sp.y,
      stateTime: 0,
      isNearbyBed: false,
      bedPosX: 0, bedPosY: 0,
      homeInfo: null,
      isAutoRun: false,
      autoPath: null,
      autoIdx: 0,
    };
    this.playerSprite = this.add.sprite(0, 0, 'player', 0).setOrigin(0, 0).setDisplaySize(T, T);
    this.entityLayer.add(this.playerSprite);
    this._updatePlayerSprite();
  }

  _updatePlayerSprite() {
    const p = this.player;
    const px = p.x * T;
    const py = (this.gameMap.mapHeight - 1 - p.y) * T;
    this.playerSprite.setPosition(px, py);

    if (p.state === State.DEAD) {
      this.playerSprite.setTexture('dead');
      this.playerSprite.setDisplaySize(T, T);
      this.playerSprite.anims.stop();
    } else if (p.state === State.INBED) {
      this.playerSprite.setTexture('playerbed');
      this.playerSprite.setDisplaySize(T, T);
      this.playerSprite.anims.stop();
    } else if (p.state === State.UP) {
      this.playerSprite.setTexture('player');
      this.playerSprite.setDisplaySize(T, T);
      if (!this.playerSprite.anims.isPlaying || this.playerSprite.anims.currentAnim.key !== 'player_up')
        this.playerSprite.play('player_up');
    } else if (p.state === State.DOWN) {
      this.playerSprite.setTexture('player');
      this.playerSprite.setDisplaySize(T, T);
      if (!this.playerSprite.anims.isPlaying || this.playerSprite.anims.currentAnim.key !== 'player_down')
        this.playerSprite.play('player_down');
    } else if (p.state === State.LEFT) {
      this.playerSprite.setTexture('player');
      this.playerSprite.setDisplaySize(T, T);
      if (!this.playerSprite.anims.isPlaying || this.playerSprite.anims.currentAnim.key !== 'player_left')
        this.playerSprite.play('player_left');
    } else if (p.state === State.RIGHT) {
      this.playerSprite.setTexture('player');
      this.playerSprite.setDisplaySize(T, T);
      if (!this.playerSprite.anims.isPlaying || this.playerSprite.anims.currentAnim.key !== 'player_right')
        this.playerSprite.play('player_right');
    } else {
      this.playerSprite.setTexture('player', 0);
      this.playerSprite.setDisplaySize(T, T);
      this.playerSprite.anims.stop();
    }
  }

  _updatePlayer(delta) {
    const p = this.player;
    p.stateTime += delta;
    if (this.selectState !== SelectState.PLAYER) return;
    if (p.state === State.INBED || p.state === State.DEAD) return;

    if (!p.isAutoRun) {
      p.state = State.IDLE;
    }

    let dx = 0, dy = 0;
    if (this.dirPressed.left) { dx = -1; p.state = State.LEFT; p.isAutoRun = false; }
    if (this.dirPressed.right) { dx = 1; p.state = State.RIGHT; p.isAutoRun = false; }
    if (this.dirPressed.up) { dy = 1; p.state = State.UP; p.isAutoRun = false; }
    if (this.dirPressed.down) { dy = -1; p.state = State.DOWN; p.isAutoRun = false; }

    if (p.state !== State.IDLE && !p.isAutoRun) {
      const speed = 6;
      const moveX = dx * speed * delta;
      const moveY = dy * speed * delta;
      this._tryMovePlayer(moveX, moveY);
    }

    if (p.isAutoRun && p.autoPath) {
      const spd = 3 * delta;
      const target = p.autoPath[p.autoIdx];
      if (p.x === target.x && p.y === target.y) {
        if (p.autoIdx <= 0) {
          p.isAutoRun = false;
          p.autoPath = null;
          return;
        }
        p.autoIdx--;
      }
      const t = p.autoPath[p.autoIdx];
      if (t.x < p.x) { p.x = Math.max(t.x, p.x - spd); p.state = State.LEFT; }
      else if (t.x > p.x) { p.x = Math.min(t.x, p.x + spd); p.state = State.RIGHT; }
      if (t.y < p.y) { p.y = Math.max(t.y, p.y - spd); p.state = State.DOWN; }
      else if (t.y > p.y) { p.y = Math.min(t.y, p.y + spd); p.state = State.UP; }
    }

    this._checkNearbyBed();
    this._updatePlayerSprite();
  }

  _tryMovePlayer(moveX, moveY) {
    const p = this.player;
    const w = 0.6, h = 0.8;
    let bx = p.x + 0.2, by = p.y;

    bx += moveX;
    if (this._checkCollision(bx, by, w, h)) {
      if (moveX < 0) bx = Math.floor(bx) + 1 + 0.01;
      else bx = Math.ceil(bx) - w - 0.01;
    }

    by += moveY;
    if (this._checkCollision(bx, by, w, h)) {
      if (moveY < 0) by = Math.floor(by) + 1 + 0.01;
      else by = Math.ceil(by) - h - 0.01;
    }

    p.x = bx - 0.2;
    p.y = by;
  }

  _checkCollision(bx, by, w, h) {
    const corners = [
      [Math.floor(bx), Math.floor(by)],
      [Math.floor(bx + w), Math.floor(by)],
      [Math.floor(bx + w), Math.floor(by + h + 0.2)],
      [Math.floor(bx), Math.floor(by + h + 0.2)],
    ];
    for (const [cx, cy] of corners) {
      const topY = this.gameMap.mapHeight - 1 - cy;
      if (topY < 0 || topY >= this.gameMap.mapHeight || cx < 0 || cx >= this.gameMap.mapWidth) continue;
      if (this.gameMap.tiles[cx][topY] === TileType.TILE) return true;
    }
    return false;
  }

  _checkNearbyBed() {
    const p = this.player;
    p.isNearbyBed = false;
    const w = 0.6, h = 0.8;
    const bx = p.x + 0.2, by = p.y;
    const corners = [
      [Math.floor(bx), Math.floor(by)],
      [Math.floor(bx + w), Math.floor(by)],
      [Math.floor(bx + w), Math.floor(by + h + 0.2)],
      [Math.floor(bx), Math.floor(by + h + 0.2)],
    ];
    for (const [cx, cy] of corners) {
      const topY = this.gameMap.mapHeight - 1 - cy;
      if (topY < 0 || topY >= this.gameMap.mapHeight || cx < 0 || cx >= this.gameMap.mapWidth) continue;
      if (this.gameMap.tiles[cx][topY] === TileType.PLAYER_HOME) {
        p.isNearbyBed = true;
        p.bedPosX = cx;
        p.bedPosY = cy;
        return;
      }
    }
  }

  /* ===================== EYE ===================== */
  _initEye() {
    const sp = this.gameMap.playerStartPos;
    this.eye = { x: sp.x, y: sp.y };
    this.eyeSprite = this.add.image(0, 0, 'eye').setOrigin(0, 0).setDisplaySize(T, T).setVisible(false);
    this.entityLayer.add(this.eyeSprite);
  }

  _updateEye(delta) {
    if (this.selectState !== SelectState.EYE) {
      this.eyeSprite.setVisible(false);
      return;
    }
    this.eyeSprite.setVisible(true);
    const speed = 8;
    if (this.dirPressed.left) this.eye.x -= speed * delta;
    if (this.dirPressed.right) this.eye.x += speed * delta;
    if (this.dirPressed.up) this.eye.y += speed * delta;
    if (this.dirPressed.down) this.eye.y -= speed * delta;

    this.eye.x = Phaser.Math.Clamp(this.eye.x, this.gameMap.eyeMinX, this.gameMap.eyeMaxX);
    this.eye.y = Phaser.Math.Clamp(this.eye.y, this.gameMap.eyeMinY, this.gameMap.eyeMaxY);

    this.eyeSprite.setPosition(this.eye.x * T, (this.gameMap.mapHeight - 1 - this.eye.y) * T);
  }

  /* ===================== SELECT FRAME ===================== */
  _initSelectFrame() {
    this.selectFrame = { x: 0, y: 0, tile: TileType.PLAYER_HOME };
    this.selectFrameSprite = this.add.image(0, 0, 'selectFrame').setOrigin(0, 0)
      .setDisplaySize(T + 2, T + 2).setVisible(false).setAlpha(0.8);
    this.entityLayer.add(this.selectFrameSprite);
  }

  _updateSelectFrame(dirIndex) {
    if (this.selectState !== SelectState.PLAYER) return;
    if (this.player.state !== State.INBED) return;

    let tx = this.selectFrame.x;
    let ty = this.selectFrame.y;
    if (dirIndex === 'left') tx--;
    else if (dirIndex === 'right') tx++;
    else if (dirIndex === 'up') ty++;
    else if (dirIndex === 'down') ty--;
    else return;

    const topY = this.gameMap.mapHeight - 1 - ty;
    if (topY < 0 || topY >= this.gameMap.mapHeight || tx < 0 || tx >= this.gameMap.mapWidth) return;
    const t = this.gameMap.tiles[tx][topY];
    if (t === TileType.PLAYER_HOME || t === TileType.BUILDING || t === TileType.DOOR_END) {
      this.selectFrame.x = tx;
      this.selectFrame.y = ty;
      this.selectFrame.tile = t;
    }
  }

  _renderSelectFrame() {
    if (this.player.state !== State.INBED) {
      this.selectFrameSprite.setVisible(false);
      return;
    }
    this.selectFrameSprite.setVisible(true);
    this.selectFrameSprite.setPosition(
      this.selectFrame.x * T - 1,
      (this.gameMap.mapHeight - 1 - this.selectFrame.y) * T - 1
    );
  }

  /* ===================== ROBOTS ===================== */
  _initRobots() {
    this.robots = [];
    const offsets = [[-2,0],[2,0],[0,2],[0,-2],[-1,1],[1,-1],[1,1],[-1,-1]];
    const sp = this.gameMap.playerStartPos;
    for (let i = 0; i < 8; i++) {
      const robot = {
        index: i,
        state: State.IDLE,
        x: sp.x + offsets[i][0],
        y: sp.y + offsets[i][1],
        stateTime: 0,
        homeInfo: null,
        isAutoRun: false,
        autoPath: null,
        autoIdx: 0,
        maxEleCount: 0, maxGunCount: 4,
        eleCount: 0, gunCount: 0,
        doorSleepTime: 3600,
      };
      robot.sprite = this.add.sprite(0, 0, 'player', 0).setOrigin(0, 0).setDisplaySize(T, T);
      this.entityLayer.add(robot.sprite);
      this.robots.push(robot);
    }
  }

  _startRobots() {
    for (const robot of this.robots) {
      this._robotSelectDest(robot, true);
    }
  }

  _robotSelectDest(robot, checkTRobot) {
    const homes = Object.values(this.gameMap.playerHomePosMap);
    let tries = 0;
    while (tries < 100) {
      tries++;
      const idx = Phaser.Math.Between(0, homes.length - 1);
      const home = homes[idx];
      if (home.flag !== HomeFlag.EMPTY) continue;
      if (checkTRobot && home.tRobotFlag !== 0) continue;
      home.tRobotFlag = 1;
      const path = new AutoFindWay(
        { x: Math.floor(robot.x), y: Math.floor(robot.y) },
        { x: home.bedX, y: home.bedY },
        (pos) => this.gameMap.isPassableForRobot(pos)
      ).getWayLine();
      if (!path || path.length === 0) continue;
      if (path.length === 1) {
        robot.x = path[0].x;
        robot.y = path[0].y;
        robot.isAutoRun = false;
        this._robotReachDest(robot);
      } else {
        robot.isAutoRun = true;
        robot.autoPath = path;
        robot.autoIdx = path.length - 2;
      }
      break;
    }
  }

  _robotReachDest(robot) {
    const key = `${robot.x}-${robot.y}`;
    const home = this.gameMap.playerHomePosMap[key];
    if (!home || home.flag !== HomeFlag.EMPTY) {
      this._robotSelectDest(robot, false);
      return;
    }
    home.flag = HomeFlag.ROBOT;
    home.robot = robot;
    robot.homeInfo = home;
    robot.state = State.INBED;

    for (const bk in home.buildPositions) {
      home.buildPositions[bk].flag = BuildFlag.CAN_BUILD;
    }
    initDoorDir(home, this.gameMap);

    // Sort build positions by distance to door
    home.buildPosList = Object.values(home.buildPositions).map(bp => {
      bp.distanceToDoor = Math.abs(bp.x - home.doorEndX) + Math.abs(bp.y - home.doorEndY);
      return bp;
    });
    home.buildPosList.sort((a, b) => a.distanceToDoor - b.distanceToDoor);
  }

  _updateRobot(robot, delta) {
    robot.stateTime += delta;
    if (robot.state === State.DEAD) return;
    if (robot.state === State.INBED) {
      this._robotDoSomething(robot, delta);
      this._updateRobotSprite(robot);
      return;
    }

    if (robot.isAutoRun && robot.autoPath) {
      const spd = 3 * delta;
      if (robot.autoIdx < 0 || robot.autoIdx >= robot.autoPath.length) {
        robot.isAutoRun = false;
        robot.autoPath = null;
        this._robotReachDest(robot);
        this._updateRobotSprite(robot);
        return;
      }
      let t = robot.autoPath[robot.autoIdx];
      const closeEnough = Math.abs(robot.x - t.x) < 0.05 && Math.abs(robot.y - t.y) < 0.05;
      if (closeEnough) {
        robot.x = t.x;
        robot.y = t.y;
        if (robot.autoIdx <= 0) {
          robot.isAutoRun = false;
          robot.autoPath = null;
          this._robotReachDest(robot);
          this._updateRobotSprite(robot);
          return;
        }
        robot.autoIdx--;
        t = robot.autoPath[robot.autoIdx];
      }
      if (t.x < robot.x) { robot.x = Math.max(t.x, robot.x - spd); robot.state = State.LEFT; }
      else if (t.x > robot.x) { robot.x = Math.min(t.x, robot.x + spd); robot.state = State.RIGHT; }
      if (t.y < robot.y) { robot.y = Math.max(t.y, robot.y - spd); robot.state = State.DOWN; }
      else if (t.y > robot.y) { robot.y = Math.min(t.y, robot.y + spd); robot.state = State.UP; }
    }
    this._updateRobotSprite(robot);
  }

  _robotDoSomething(robot, delta) {
    const home = robot.homeInfo;
    if (!home) return;

    robot.doorSleepTime += delta;
    const doorInfo = getDoorLevelInfo(home.doorLevel);
    if (doorInfo && home.doorBlood < doorInfo.blood * 0.3) {
      if (robot.doorSleepTime >= 30) {
        robot.doorSleepTime = 0;
        home.doorBlood = doorInfo.blood;
      }
    }

    if (isHomeCanUpdate(home)) homeUpdate(home);
    if (home.doorLevel < 2 || (home.doorLevel >= 2 && home.homeLevel >= 2)) {
      if (isDoorCanUpdate(home)) doorUpdate(home);
    }

    if (home.doorLevel > 2 && home.homeLevel > 3) { robot.maxGunCount = 5; robot.maxEleCount = 0; }
    if (home.doorLevel > 5 && home.homeLevel > 5) { robot.maxGunCount = 6; robot.maxEleCount = 2; }
    if (home.doorLevel > 9 && home.homeLevel > 8) { robot.maxGunCount = 8; robot.maxEleCount = 3; }

    if (home.doorLevel >= 2 && home.homeLevel >= 1) {
      if (robot.eleCount < robot.maxEleCount) {
        for (let i = home.buildPosList.length - 1; i >= 0; i--) {
          const bp = home.buildPosList[i];
          if (bp.flag === BuildFlag.CAN_BUILD && isCanBuildElectricity(bp)) {
            buildElectricity(bp);
            robot.eleCount++;
          } else if (bp.flag === BuildFlag.CAN_BUILD) break;
        }
      }
      if (robot.gunCount < robot.maxGunCount) {
        for (let i = 0; i < home.buildPosList.length; i++) {
          const bp = home.buildPosList[i];
          if (bp.flag === BuildFlag.CAN_BUILD && isCanBuildGun(bp)) {
            buildGun(bp);
            robot.gunCount++;
          } else if (bp.flag === BuildFlag.CAN_BUILD) break;
        }
      }
      for (let i = home.buildPosList.length - 1; i >= 0; i--) {
        const bp = home.buildPosList[i];
        if (bp.flag !== BuildFlag.CAN_BUILD && isCanUpdateBP(bp)) {
          updateBP(bp);
        }
      }
    }
  }

  _updateRobotSprite(robot) {
    const px = robot.x * T;
    const py = (this.gameMap.mapHeight - 1 - robot.y) * T;
    robot.sprite.setPosition(px, py);

    if (robot.state === State.DEAD) {
      robot.sprite.setTexture('dead');
      robot.sprite.setDisplaySize(T, T);
      robot.sprite.anims.stop();
    } else if (robot.state === State.INBED) {
      robot.sprite.setTexture('playerbed');
      robot.sprite.setDisplaySize(T, T);
      robot.sprite.anims.stop();
    } else if (robot.state === State.UP) {
      if (!robot.sprite.anims.isPlaying || robot.sprite.anims.currentAnim.key !== 'player_up')
        robot.sprite.play('player_up');
    } else if (robot.state === State.DOWN) {
      if (!robot.sprite.anims.isPlaying || robot.sprite.anims.currentAnim.key !== 'player_down')
        robot.sprite.play('player_down');
    } else if (robot.state === State.LEFT) {
      if (!robot.sprite.anims.isPlaying || robot.sprite.anims.currentAnim.key !== 'player_left')
        robot.sprite.play('player_left');
    } else if (robot.state === State.RIGHT) {
      if (!robot.sprite.anims.isPlaying || robot.sprite.anims.currentAnim.key !== 'player_right')
        robot.sprite.play('player_right');
    } else {
      robot.sprite.setTexture('player', 0);
      robot.sprite.setDisplaySize(T, T);
      robot.sprite.anims.stop();
    }
  }

  _isAllRobotStart() {
    return this.robots.every(r => r.state === State.INBED);
  }

  _isAllRobotDead() {
    return this.robots.every(r => r.state === State.DEAD);
  }

  /* ===================== GHOST ===================== */
  _initGhost() {
    this.ghost = {
      state: State.SPAWN,
      x: 0, y: 0,
      stateTime: 0,
      level: 1, blood: 0,
      isInit: false,
      isAutoRun: false, isGoHome: false, goHomeTimes: 0,
      autoPath: null, autoIdx: 0,
      allRobotStart: false, isStart: false,
      isGotoBed: false, isGotoPlayer: false,
      homeInfo: null,
      startAttack: false, attackTime: 0,
      showHitTime: 0,
    };
    this.ghostSprite = this.add.sprite(0, 0, 'ghost', 0).setOrigin(0, 0).setDisplaySize(T, T).setVisible(false);
    this.entityLayer.add(this.ghostSprite);

    // Ghost blood bar
    this.ghostBloodBg = this.add.image(0, 0, 'blood_bar_bg').setOrigin(0, 0).setDisplaySize(T, T * 0.2).setVisible(false);
    this.ghostBloodBar = this.add.image(0, 0, 'blood_bar_red').setOrigin(0, 0).setDisplaySize(T, T * 0.2).setVisible(false);
    this.ghostLevelText = this.add.text(0, 0, '', { fontSize: '10px', color: '#ffff00' }).setVisible(false);
    this.ghostHitSprite = this.add.image(0, 0, 'hit').setOrigin(0, 0).setDisplaySize(T, T).setVisible(false);
    this.entityLayer.add(this.ghostBloodBg);
    this.entityLayer.add(this.ghostBloodBar);
    this.entityLayer.add(this.ghostLevelText);
    this.entityLayer.add(this.ghostHitSprite);
  }

  _startGhost() {
    const g = this.ghost;
    const idx = Phaser.Math.Between(0, this.gameMap.ghostStartPosList.length - 1);
    g.x = this.gameMap.ghostStartPosList[idx].x;
    g.y = this.gameMap.ghostStartPosList[idx].y;
    g.blood = getGhostLevelInfo(1).blood;
    g.isInit = true;
    this.ghostSprite.setVisible(true);
    this.ghostBloodBg.setVisible(true);
    this.ghostBloodBar.setVisible(true);
    this.ghostLevelText.setVisible(true);
  }

  _getGhostStartPos() {
    const g = this.ghost;
    const gx = Math.round(g.x);
    const gy = Math.round(g.y);
    // Try rounded position first, then adjacent tiles
    const candidates = [
      { x: gx, y: gy },
      { x: Math.floor(g.x), y: Math.floor(g.y) },
      { x: Math.ceil(g.x), y: Math.ceil(g.y) },
      { x: gx + 1, y: gy }, { x: gx - 1, y: gy },
      { x: gx, y: gy + 1 }, { x: gx, y: gy - 1 },
    ];
    for (const c of candidates) {
      if (this.gameMap.isPassableForGhost(c)) return c;
    }
    return { x: gx, y: gy };
  }

  _assignGhostPath(path) {
    const g = this.ghost;
    if (!path || path.length === 0) return false;
    if (path.length === 1) {
      // Already adjacent to destination, snap there
      g.x = path[0].x;
      g.y = path[0].y;
      g.isAutoRun = false;
      g.autoPath = null;
      return true;
    }
    g.autoPath = path;
    g.isAutoRun = true;
    g.autoIdx = path.length - 2;
    return true;
  }

  _ghostSelectDest() {
    const g = this.ghost;
    g.isGotoPlayer = false;
    g.isGotoBed = false;
    const startPos = this._getGhostStartPos();

    // If player is not in bed and not dead, chase player
    if (this.player.state !== State.INBED && this.player.state !== State.DEAD) {
      const path = new AutoFindWay(
        startPos,
        { x: Math.round(this.player.x), y: Math.round(this.player.y) },
        (pos) => this.gameMap.isPassableForGhost(pos)
      ).getWayLine();
      if (path && path.length > 0) {
        if (this._assignGhostPath(path)) {
          g.isGotoPlayer = true;
          if (!g.isAutoRun) { this._ghostReachDest(); }
          return;
        }
      }
    }

    const homes = Object.values(this.gameMap.playerHomePosMap);
    let tries = 0;
    while (tries < 200) {
      tries++;
      if (this._isAllRobotDead()) {
        if (this.player.state !== State.DEAD && this.player.homeInfo) {
          g.homeInfo = this.player.homeInfo;
        } else break;
      } else {
        const idx = Phaser.Math.Between(0, homes.length - 1);
        g.homeInfo = homes[idx];
      }

      if (g.homeInfo.flag === HomeFlag.PLAYER && this.player.state === State.DEAD) continue;
      if (g.homeInfo.flag === HomeFlag.ROBOT && g.homeInfo.robot && g.homeInfo.robot.state === State.DEAD) continue;
      if (g.homeInfo.flag === HomeFlag.EMPTY) continue;

      const path = new AutoFindWay(
        startPos,
        { x: Math.round(g.homeInfo.ghostPosition.x), y: Math.round(g.homeInfo.ghostPosition.y) },
        (pos) => this.gameMap.isPassableForGhost(pos)
      ).getWayLine();
      if (!path || path.length === 0) continue;
      if (this._assignGhostPath(path)) {
        if (!g.isAutoRun) { this._ghostReachDest(); }
        break;
      }
    }
  }

  _ghostReachDest() {
    const g = this.ghost;
    g.isAutoRun = false;

    if (g.isGoHome) {
      g.goHomeTimes++;
      g.level = Math.min(MAX_GHOST_LEVEL, Math.floor(g.goHomeTimes / 2) + 1);
      g.blood = getGhostLevelInfo(g.level).blood;
      g.isGoHome = false;
      this._ghostSelectDest();
      return;
    }

    if (g.isGotoBed) {
      g.startAttack = false;
      if (g.homeInfo.flag === HomeFlag.ROBOT && g.homeInfo.robot) {
        g.homeInfo.robot.state = State.DEAD;
      } else if (g.homeInfo.flag === HomeFlag.PLAYER) {
        this.player.state = State.DEAD;
      }
      for (const bk in g.homeInfo.buildPositions) deadClearBP(g.homeInfo.buildPositions[bk]);
      if (this._isAllRobotDead() && this.player.state === State.DEAD) return;
      this._ghostSelectDest();
      return;
    }

    if (g.isGotoPlayer) {
      // Check if close enough to kill
      const dx = Math.abs(g.x - this.player.x);
      const dy = Math.abs(g.y - this.player.y);
      if (dx <= 1 && dy <= 1) {
        this.player.state = State.DEAD;
      }
      this._ghostSelectDest();
      return;
    }

    // Arrived at door - start attacking
    g.startAttack = true;
    g.state = g.homeInfo.ghostDir;
    g.attackTime = 0;
  }

  _updateGhost(delta) {
    const g = this.ghost;
    if (!g.isInit) return;

    if (!g.allRobotStart) {
      g.allRobotStart = this._isAllRobotStart();
    }
    if (!g.allRobotStart) return;

    if (!g.isStart) {
      g.isStart = true;
      this._ghostSelectDest();
      return;
    }

    if (g.blood <= 0) g.state = State.DEAD;

    // Go home if low health
    if (!g.isGoHome) {
      const maxBlood = getGhostLevelInfo(g.level).blood;
      if (g.blood < maxBlood * 0.4) {
        let closest = null, minDist = Infinity;
        for (const pos of this.gameMap.ghostStartPosList) {
          const d = Math.abs(pos.x - g.x) + Math.abs(pos.y - g.y);
          if (d < minDist) { minDist = d; closest = pos; }
        }
        if (closest) {
          const startPos = this._getGhostStartPos();
          const path = new AutoFindWay(
            startPos,
            { x: Math.round(closest.x), y: Math.round(closest.y) },
            (pos) => this.gameMap.isPassableForGhost(pos)
          ).getWayLine();
          if (path && path.length > 0) {
            if (this._assignGhostPath(path)) {
              g.isGoHome = true;
              g.startAttack = false;
              if (!g.isAutoRun) { this._ghostReachDest(); }
            }
          }
        }
      }
    }

    if (g.state === State.DEAD) return;

    g.stateTime += delta;

    if (g.isAutoRun && g.autoPath) {
      const spd = 5.5 * delta;
      if (g.autoIdx < 0 || g.autoIdx >= g.autoPath.length) {
        g.isAutoRun = false;
        g.autoPath = null;
        this._ghostReachDest();
        this._updateGhostSprite();
        return;
      }
      let t = g.autoPath[g.autoIdx];
      const closeEnough = Math.abs(g.x - t.x) < 0.05 && Math.abs(g.y - t.y) < 0.05;
      if (closeEnough) {
        g.x = t.x;
        g.y = t.y;
        if (g.autoIdx <= 0) {
          g.isAutoRun = false;
          g.autoPath = null;
          this._ghostReachDest();
          this._updateGhostSprite();
          return;
        }
        g.autoIdx--;
        t = g.autoPath[g.autoIdx];
      }
      if (t.x < g.x) { g.x = Math.max(t.x, g.x - spd); g.state = State.LEFT; }
      else if (t.x > g.x) { g.x = Math.min(t.x, g.x + spd); g.state = State.RIGHT; }
      if (t.y < g.y) { g.y = Math.max(t.y, g.y - spd); g.state = State.DOWN; }
      else if (t.y > g.y) { g.y = Math.min(t.y, g.y + spd); g.state = State.UP; }
    }

    // Attack door
    if (g.startAttack && g.homeInfo) {
      g.attackTime += delta;
      if (g.attackTime >= 0.5) {
        g.showHitTime = delta;
        g.attackTime = 0;
        g.homeInfo.doorBlood -= getGhostLevelInfo(g.level).power;
        if (g.homeInfo.doorBlood <= 0) {
          g.startAttack = false;
          g.isGotoBed = true;
          g.homeInfo.doorBlood = 0;
          const startPos = this._getGhostStartPos();
          const path = new AutoFindWay(
            startPos,
            { x: g.homeInfo.bedX, y: g.homeInfo.bedY },
            (pos) => this.gameMap.isPassableForGhost(pos)
          ).getWayLine();
          if (path && path.length > 0) {
            if (!this._assignGhostPath(path)) {
              // Already at bed
              this._ghostReachDest();
            }
          } else {
            // Can't path to bed, snap directly
            g.x = g.homeInfo.bedX;
            g.y = g.homeInfo.bedY;
            this._ghostReachDest();
          }
        }
      }
    }

    this._updateGhostSprite();
  }

  _updateGhostSprite() {
    const g = this.ghost;
    if (!g.isInit) return;
    const px = g.x * T;
    const py = (this.gameMap.mapHeight - 1 - g.y) * T;
    this.ghostSprite.setPosition(px, py);

    if (g.state === State.UP) {
      if (!this.ghostSprite.anims.isPlaying || this.ghostSprite.anims.currentAnim.key !== 'ghost_up')
        this.ghostSprite.play('ghost_up');
    } else if (g.state === State.DOWN) {
      if (!this.ghostSprite.anims.isPlaying || this.ghostSprite.anims.currentAnim.key !== 'ghost_down')
        this.ghostSprite.play('ghost_down');
    } else if (g.state === State.LEFT) {
      if (!this.ghostSprite.anims.isPlaying || this.ghostSprite.anims.currentAnim.key !== 'ghost_left')
        this.ghostSprite.play('ghost_left');
    } else if (g.state === State.RIGHT) {
      if (!this.ghostSprite.anims.isPlaying || this.ghostSprite.anims.currentAnim.key !== 'ghost_right')
        this.ghostSprite.play('ghost_right');
    } else {
      this.ghostSprite.setTexture('ghost', 0);
      this.ghostSprite.setDisplaySize(T, T);
      this.ghostSprite.anims.stop();
    }

    // Blood bar
    this.ghostBloodBg.setPosition(px, py - T * 0.25);
    const maxBlood = getGhostLevelInfo(g.level).blood;
    const ratio = Math.max(0, g.blood / maxBlood);
    this.ghostBloodBar.setPosition(px, py - T * 0.25);
    this.ghostBloodBar.setDisplaySize(T * ratio, T * 0.2);

    this.ghostLevelText.setPosition(px + T * 0.3, py - T * 0.1);
    this.ghostLevelText.setText('Lv.' + g.level);

    // Hit effect
    if (g.showHitTime > 0 && g.homeInfo) {
      g.showHitTime += this.game.loop.delta / 1000;
      this.ghostHitSprite.setVisible(true);
      this.ghostHitSprite.setPosition(
        g.homeInfo.doorEndX * T,
        (this.gameMap.mapHeight - 1 - g.homeInfo.doorEndY) * T
      );
      if (g.showHitTime >= 0.3) {
        g.showHitTime = 0;
        this.ghostHitSprite.setVisible(false);
      }
    } else {
      this.ghostHitSprite.setVisible(false);
    }
  }

  /* ===================== BULLETS ===================== */
  _initBullets() {
    this.bullets = [];
  }

  _addBullet(sx, sy, ex, ey, power) {
    const bullet = {
      startX: sx, startY: sy,
      endX: ex, endY: ey,
      x: sx, y: sy,
      power: power,
      done: false,
      flyTime: 0.2,
      sprite: this.add.image(0, 0, 'zidan').setOrigin(0, 0).setDisplaySize(T * 0.25, T * 0.25),
    };
    this.entityLayer.add(bullet.sprite);
    this.bullets.push(bullet);
  }

  _updateBullets(delta) {
    for (const b of this.bullets) {
      if (b.done) continue;
      if (b.x === b.endX && b.y === b.endY) {
        // Check hit ghost
        const g = this.ghost;
        const dx = Math.abs(b.x - g.x);
        const dy = Math.abs(b.y - g.y);
        if (dx <= 1 && dy <= 1) {
          g.blood = Math.max(0, g.blood - b.power);
        }
        b.done = true;
        b.sprite.setVisible(false);
        continue;
      }
      // Move bullet
      if (b.endX < b.startX) { b.x -= delta * (b.startX - b.endX) / b.flyTime; if (b.x < b.endX) b.x = b.endX; }
      if (b.startX < b.endX) { b.x += delta * (b.endX - b.startX) / b.flyTime; if (b.x > b.endX) b.x = b.endX; }
      if (b.startY < b.endY) { b.y += delta * (b.endY - b.startY) / b.flyTime; if (b.y > b.endY) b.y = b.endY; }
      if (b.endY < b.startY) { b.y -= delta * (b.startY - b.endY) / b.flyTime; if (b.y < b.endY) b.y = b.endY; }

      b.sprite.setPosition(b.x * T, (this.gameMap.mapHeight - 1 - b.y) * T);
    }
    // Clean up
    this.bullets = this.bullets.filter(b => {
      if (b.done) { b.sprite.destroy(); return false; }
      return true;
    });
  }

  /* ===================== DYNAMIC ELEMENTS ===================== */
  _initDynamicElements() {
    this.dynamicSprites = {};
    this.doorSprites = {};
    this.bloodBarSprites = {};
    this.levelTexts = {};
    this.coinTexts = {};
    this.elecTexts = {};

    for (const key in this.gameMap.playerHomePosMap) {
      const home = this.gameMap.playerHomePosMap[key];
      // Door sprite
      this.doorSprites[key] = this.add.image(0, 0, 'door').setOrigin(0, 0).setDisplaySize(T, T);
      this.entityLayer.add(this.doorSprites[key]);
      // Blood bar for door
      this.bloodBarSprites[key] = {
        bg: this.add.image(0, 0, 'blood_bar_bg').setOrigin(0, 0).setDisplaySize(T, T * 0.2).setVisible(false),
        bar: this.add.image(0, 0, 'blood_bar').setOrigin(0, 0).setDisplaySize(T, T * 0.2).setVisible(false),
      };
      this.entityLayer.add(this.bloodBarSprites[key].bg);
      this.entityLayer.add(this.bloodBarSprites[key].bar);
      // Door level text
      this.levelTexts[key] = this.add.text(0, 0, '', { fontSize: '9px', color: '#ffff00' }).setVisible(false);
      this.entityLayer.add(this.levelTexts[key]);

      // Build position sprites
      for (const bk in home.buildPositions) {
        this.dynamicSprites[bk] = {
          sprite: null,
          levelText: this.add.text(0, 0, '', { fontSize: '8px', color: '#ffff00' }),
        };
        this.entityLayer.add(this.dynamicSprites[bk].levelText);
      }
    }
  }

  _updateDynamicElements(delta) {
    const g = this.ghost;
    for (const key in this.gameMap.playerHomePosMap) {
      const home = this.gameMap.playerHomePosMap[key];

      // Update door position
      if (home.doorState === 0 && home.flag !== HomeFlag.EMPTY) {
        updateDoorCurrentPos(home, delta);
      }
      const doorPx = home.doorCurrentX * T;
      const doorPy = (this.gameMap.mapHeight - 1 - home.doorCurrentY) * T;
      this.doorSprites[key].setPosition(doorPx, doorPy);

      // Door blood bar
      if (home.doorState === 1) {
        const doorEndPx = home.doorEndX * T;
        const doorEndPy = (this.gameMap.mapHeight - 1 - home.doorEndY) * T;
        this.bloodBarSprites[key].bg.setVisible(true).setPosition(doorEndPx, doorEndPy - T * 0.25);
        const doorInfo = getDoorLevelInfo(home.doorLevel);
        const ratio = doorInfo ? Math.max(0, home.doorBlood / doorInfo.blood) : 1;
        this.bloodBarSprites[key].bar.setVisible(true).setPosition(doorEndPx, doorEndPy - T * 0.25)
          .setDisplaySize(T * ratio, T * 0.2);

        // Door level
        this.levelTexts[key].setVisible(true).setPosition(doorEndPx + 2, doorEndPy + 2).setText('' + home.doorLevel);
      }

      // Coin generation
      if (home.flag !== HomeFlag.EMPTY) {
        if (!home._coinTimer) home._coinTimer = 0;
        home._coinTimer += delta;
        if (home._coinTimer >= 1) {
          home._coinTimer -= 1;
          if (home.addCoin <= 0) {
            home.addCoin = getHomeLevelInfo(1).addCoin;
          }
          home.coinNum += home.addCoin;
        }

        // Electricity generation
        for (const bk in home.buildPositions) {
          const bp = home.buildPositions[bk];
          if (bp.flag === BuildFlag.ELECTRICITY) {
            if (!bp._elecTimer) bp._elecTimer = 0;
            bp._elecTimer += delta;
            if (bp._elecTimer >= 1) {
              bp._elecTimer -= 1;
              if (bp.addLeidian <= 0) {
                bp.addLeidian = getLeidianLevelInfo(1).addCoin;
              }
              home.leidianNum += bp.addLeidian;
            }
          }
        }
      }

      // Build positions rendering
      for (const bk in home.buildPositions) {
        const bp = home.buildPositions[bk];
        const bpx = bp.x * T;
        const bpy = (this.gameMap.mapHeight - 1 - bp.y) * T;
        const ds = this.dynamicSprites[bk];

        if (bp.flag === BuildFlag.CAN_BUILD && home.flag === HomeFlag.PLAYER) {
          if (!ds.sprite) {
            ds.sprite = this.add.image(bpx, bpy, 'canbuild').setOrigin(0, 0).setDisplaySize(T, T).setAlpha(0.6);
            this.entityLayer.add(ds.sprite);
          }
          ds.sprite.setTexture('canbuild').setPosition(bpx, bpy).setVisible(true).setDisplaySize(T, T);
          ds.levelText.setVisible(false);
        } else if (bp.flag === BuildFlag.GUN) {
          if (!ds.sprite) {
            ds.sprite = this.add.image(bpx, bpy, 'gun').setOrigin(0, 0).setDisplaySize(T, T * 0.63);
            this.entityLayer.add(ds.sprite);
          }
          ds.sprite.setTexture('gun').setPosition(bpx, bpy + T * 0.18).setVisible(true).setDisplaySize(T, T * 0.63);
          ds.levelText.setVisible(true).setPosition(bpx + 2, bpy + 2).setText('' + bp.level);

          // Gun shooting
          if (g.isInit && g.state !== State.DEAD) {
            bp.hitTime = (bp.hitTime || 1) + delta;
            if (bp.hitTime >= 1) {
              const dist = Math.abs(bp.x - g.x) + Math.abs(bp.y - g.y);
              if (dist <= (bp.distance || 4)) {
                this._addBullet(bp.x + 0.5, bp.y + 0.5, g.x + 0.5, g.y + 0.5, bp.hit || 2);
                bp.hitTime = 0;
              }
            }
          }
        } else if (bp.flag === BuildFlag.ELECTRICITY) {
          if (!ds.sprite) {
            ds.sprite = this.add.image(bpx, bpy, 'electricity').setOrigin(0, 0).setDisplaySize(T, T);
            this.entityLayer.add(ds.sprite);
          }
          ds.sprite.setTexture('electricity').setPosition(bpx, bpy).setVisible(true).setDisplaySize(T, T);
          ds.levelText.setVisible(true).setPosition(bpx + 2, bpy + 2).setText('' + bp.level);
        } else {
          if (ds.sprite) ds.sprite.setVisible(false);
          ds.levelText.setVisible(false);
        }

        // Update indicator for upgradeable items
        if (home.flag === HomeFlag.PLAYER && (bp.flag === BuildFlag.GUN || bp.flag === BuildFlag.ELECTRICITY)) {
          if (isCanUpdateBP(bp) && !ds.updateSprite) {
            ds.updateSprite = this.add.image(bpx, bpy, 'update').setOrigin(0, 0).setDisplaySize(T, T).setAlpha(0.7);
            this.entityLayer.add(ds.updateSprite);
          }
          if (ds.updateSprite) {
            ds.updateSprite.setVisible(isCanUpdateBP(bp));
            ds.updateSprite.setPosition(bpx, bpy);
          }
        }
      }
    }
  }

  /* ===================== CAMERA ===================== */
  _initCamera() {
    const worldW = this.gameMap.mapWidth * T;
    const worldH = this.gameMap.mapHeight * T;
    this.cameras.main.setBounds(0, 0, worldW, worldH);
  }

  _updateCamera() {
    let targetX, targetY;
    if (this.selectState === SelectState.EYE) {
      targetX = this.eye.x * T + T / 2;
      targetY = (this.gameMap.mapHeight - 1 - this.eye.y) * T + T / 2;
    } else if (this.selectState === SelectState.GHOST) {
      targetX = this.ghost.x * T + T / 2;
      targetY = (this.gameMap.mapHeight - 1 - this.ghost.y) * T + T / 2;
    } else {
      if (this.player.state === State.INBED) {
        targetX = this.selectFrame.x * T + T / 2;
        targetY = (this.gameMap.mapHeight - 1 - this.selectFrame.y) * T + T / 2;
      } else {
        targetX = this.player.x * T + T / 2;
        targetY = (this.gameMap.mapHeight - 1 - this.player.y) * T + T / 2;
      }
    }
    const cam = this.cameras.main;
    cam.scrollX += (targetX - cam.scrollX - cam.width / 2) * 0.08;
    cam.scrollY += (targetY - cam.scrollY - cam.height / 2) * 0.08;
  }

  /* ===================== UI ===================== */
  _initUI() {
    this.dirPressed = { left: false, right: false, up: false, down: false };

    // Direction buttons
    const btnSize = 56;
    const baseX = 25;
    const baseY = 625;
    this._createDirBtn('toLeft', baseX, baseY, btnSize, 'left');
    this._createDirBtn('toDown', baseX + 75, baseY, btnSize, 'down');
    this._createDirBtn('toUp', baseX + 75, baseY - 75, btnSize, 'up');
    this._createDirBtn('toRight', baseX + 150, baseY, btnSize, 'right');

    // Keyboard controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // Select eye/player buttons
    this.eyeBtn = this._createUIBtn('eye', 15, 300, 44, 44, () => {
      this.eye.x = this.player.x;
      this.eye.y = this.player.y;
      this.selectState = SelectState.EYE;
    });
    this.playerBtn = this._createUIBtn('player', 15, 360, 44, 44, () => {
      this.selectState = SelectState.PLAYER;
    }, 0);

    // Go to bed button
    this.bedBtn = this._createUIBtn('bedicon', 410, 350, 44, 44, () => {
      if (!this.player.isNearbyBed || this.player.state === State.INBED) return;
      const key = `${this.player.bedPosX}-${this.player.bedPosY}`;
      const home = this.gameMap.playerHomePosMap[key];
      if (!home || home.flag !== HomeFlag.EMPTY) return;
      this.player.state = State.INBED;
      this.player.x = this.player.bedPosX;
      this.player.y = this.player.bedPosY;
      this.player.homeInfo = home;
      home.flag = HomeFlag.PLAYER;
      for (const bk in home.buildPositions) home.buildPositions[bk].flag = BuildFlag.CAN_BUILD;
      initDoorDir(home, this.gameMap);
      this.selectFrame.x = this.player.bedPosX;
      this.selectFrame.y = this.player.bedPosY;
      home.doorBlood = getDoorLevelInfo(1).blood;
      this._updatePlayerSprite();
    });
    this.bedBtn.setVisible(false);

    // Build electricity button
    this.buildElecBtn = this._createUIBtn('leidian', 410, 350, 44, 44, () => {
      if (!this.player.homeInfo) return;
      const key = `${this.selectFrame.x}-${this.selectFrame.y}`;
      const bp = this.player.homeInfo.buildPositions[key];
      if (!bp || !isCanBuildElectricity(bp)) {
        this._showTips('Cannot build!');
        return;
      }
      buildElectricity(bp);
    });
    this.buildElecBtn.setVisible(false);

    // Build gun button
    this.buildGunBtn = this._createUIBtn('gun', 410, 410, 44, 44, () => {
      if (!this.player.homeInfo) return;
      const key = `${this.selectFrame.x}-${this.selectFrame.y}`;
      const bp = this.player.homeInfo.buildPositions[key];
      if (!bp || !isCanBuildGun(bp)) {
        this._showTips('Cannot build!');
        return;
      }
      buildGun(bp);
    });
    this.buildGunBtn.setVisible(false);

    // Update button
    this.updateBtn = this._createUIBtn('update', 410, 350, 44, 44, () => {
      if (!this.player.homeInfo) return;
      if (this.selectFrame.tile === TileType.BUILDING) {
        const key = `${this.selectFrame.x}-${this.selectFrame.y}`;
        const bp = this.player.homeInfo.buildPositions[key];
        if (!bp || !isCanUpdateBP(bp)) { this._showTips('Cannot upgrade!'); return; }
        updateBP(bp);
      } else if (this.selectFrame.tile === TileType.PLAYER_HOME) {
        if (!isHomeCanUpdate(this.player.homeInfo)) { this._showTips('Cannot upgrade!'); return; }
        homeUpdate(this.player.homeInfo);
      } else if (this.selectFrame.tile === TileType.DOOR_END) {
        if (!isDoorCanUpdate(this.player.homeInfo)) { this._showTips('Cannot upgrade!'); return; }
        doorUpdate(this.player.homeInfo);
      }
    });
    this.updateBtn.setVisible(false);

    // Clear button
    this.clearBtn = this._createUIBtn('chanzi', 410, 290, 44, 44, () => {
      if (!this.player.homeInfo) return;
      const key = `${this.selectFrame.x}-${this.selectFrame.y}`;
      const bp = this.player.homeInfo.buildPositions[key];
      if (!bp || !isCanClearBP(bp)) { this._showTips('Cannot remove!'); return; }
      clearBP(bp);
    });
    this.clearBtn.setVisible(false);

    // Repair button
    this.repairBtn = this._createUIBtn('repair', 410, 410, 44, 44, () => {
      if (this.player.homeInfo) resetDoorBlood(this.player.homeInfo);
    });
    this.repairBtn.setVisible(false);

    // Coin info bar
    this.coinBg = this.add.image(50, 12, 'coin_bg').setOrigin(0, 0).setDisplaySize(126, 35).setScrollFactor(0);
    this.coinIcon = this.add.image(60, 17, 'coin').setOrigin(0, 0).setDisplaySize(25, 25).setScrollFactor(0);
    this.coinText = this.add.text(92, 18, '0', { fontSize: '14px', color: '#ffff00' }).setScrollFactor(0);
    this.leidianBg = this.add.image(240, 12, 'coin_bg').setOrigin(0, 0).setDisplaySize(129, 37).setScrollFactor(0);
    this.leidianIcon = this.add.image(250, 17, 'leidian').setOrigin(0, 0).setDisplaySize(15, 25).setScrollFactor(0);
    this.leidianText = this.add.text(272, 18, '0', { fontSize: '14px', color: '#ffff00' }).setScrollFactor(0);

    // Robot status bar
    this._initRobotBar();

    // Tips text
    this.tipsText = this.add.text(240, 120, '', { fontSize: '14px', color: '#ff0000', backgroundColor: '#333' })
      .setScrollFactor(0).setVisible(false).setDepth(100);

    // Test button (view ghost)
    this.testBtn = this._createUIBtn('testBtn', 410, 625, 44, 44, () => {
      this.selectState = SelectState.GHOST;
    });

    this._initDynamicElements();
  }

  _createDirBtn(texture, x, y, size, dir) {
    const btn = this.add.image(x, y, texture).setOrigin(0, 0).setDisplaySize(size, size)
      .setScrollFactor(0).setInteractive().setAlpha(0.7).setDepth(10);
    btn.on('pointerdown', () => {
      this.dirPressed[dir] = true;
      if (this.player.state === State.INBED) this._updateSelectFrame(dir);
    });
    btn.on('pointerup', () => { this.dirPressed[dir] = false; });
    btn.on('pointerout', () => { this.dirPressed[dir] = false; });
    return btn;
  }

  _createUIBtn(texture, x, y, w, h, callback, frame) {
    const bg = this.add.image(x, y, 'btn_bg').setOrigin(0, 0).setDisplaySize(w + 6, h + 6)
      .setScrollFactor(0).setDepth(10);
    let icon;
    if (frame !== undefined) {
      icon = this.add.sprite(x + 3, y + 3, texture, frame).setOrigin(0, 0).setDisplaySize(w, h)
        .setScrollFactor(0).setDepth(11);
    } else {
      icon = this.add.image(x + 3, y + 3, texture).setOrigin(0, 0).setDisplaySize(w, h)
        .setScrollFactor(0).setDepth(11);
    }
    bg.setInteractive().on('pointerdown', callback);
    // Group them
    const container = { bg, icon, setVisible: (v) => { bg.setVisible(v); icon.setVisible(v); return container; } };
    return container;
  }

  _initRobotBar() {
    this.robotBarItems = [];
    const startX = 30;
    const startY = 55;
    const itemW = 50;
    for (let i = 0; i < 8; i++) {
      const x = startX + i * itemW;
      const bbg = this.add.image(x, startY + 38, 'blood_bar_bg').setOrigin(0, 0)
        .setDisplaySize(itemW * 0.8, 5).setScrollFactor(0);
      const bbar = this.add.image(x, startY + 38, 'blood_bar').setOrigin(0, 0)
        .setDisplaySize(itemW * 0.8, 5).setScrollFactor(0);
      const bg = this.add.image(x, startY, 'btn_bg').setOrigin(0, 0)
        .setDisplaySize(itemW * 0.8, itemW * 0.8).setScrollFactor(0);
      const icon = this.add.sprite(x + 4, startY + 4, 'player', 0).setOrigin(0, 0)
        .setDisplaySize(itemW * 0.6, itemW * 0.6).setScrollFactor(0);
      const deadIcon = this.add.image(x, startY, 'dead').setOrigin(0, 0)
        .setDisplaySize(itemW * 0.8, itemW * 0.8).setScrollFactor(0).setVisible(false);
      this.robotBarItems.push({ bbg, bbar, bg, icon, deadIcon, fullW: itemW * 0.8 });
    }
  }

  _updateRobotBar() {
    for (let i = 0; i < 8; i++) {
      const item = this.robotBarItems[i];
      const robot = this.robots[i];
      const ratio = this._getRobotBloodRatio(robot);
      item.bbar.setDisplaySize(item.fullW * ratio, 5);
      if (robot.state === State.DEAD) item.deadIcon.setVisible(true);
    }
  }

  _getRobotBloodRatio(robot) {
    if (!robot.homeInfo) return 1;
    const info = getDoorLevelInfo(robot.homeInfo.doorLevel);
    if (!info) return 1;
    return Math.max(0, robot.homeInfo.doorBlood / info.blood);
  }

  _updateUIButtons() {
    const p = this.player;
    // Bed button
    this.bedBtn.setVisible(p.isNearbyBed && p.state !== State.INBED && p.state !== State.DEAD);

    // Build/update/clear buttons
    if (p.state === State.INBED && p.homeInfo) {
      if (this.selectFrame.tile === TileType.BUILDING) {
        const key = `${this.selectFrame.x}-${this.selectFrame.y}`;
        const bp = p.homeInfo.buildPositions[key];
        if (bp) {
          if (bp.flag === BuildFlag.CAN_BUILD) {
            this.buildElecBtn.setVisible(true);
            this.buildGunBtn.setVisible(true);
            this.updateBtn.setVisible(false);
            this.clearBtn.setVisible(false);
            this.repairBtn.setVisible(false);
          } else if (bp.flag === BuildFlag.GUN || bp.flag === BuildFlag.ELECTRICITY) {
            this.buildElecBtn.setVisible(false);
            this.buildGunBtn.setVisible(false);
            this.updateBtn.setVisible(true);
            this.clearBtn.setVisible(true);
            this.repairBtn.setVisible(false);
          } else {
            this._hideAllBuildBtns();
          }
        } else {
          this._hideAllBuildBtns();
        }
      } else if (this.selectFrame.tile === TileType.PLAYER_HOME) {
        this.buildElecBtn.setVisible(false);
        this.buildGunBtn.setVisible(false);
        this.updateBtn.setVisible(true);
        this.clearBtn.setVisible(false);
        this.repairBtn.setVisible(false);
      } else if (this.selectFrame.tile === TileType.DOOR_END) {
        this.buildElecBtn.setVisible(false);
        this.buildGunBtn.setVisible(false);
        this.updateBtn.setVisible(true);
        this.clearBtn.setVisible(false);
        this.repairBtn.setVisible(true);
      } else {
        this._hideAllBuildBtns();
      }
    } else {
      this._hideAllBuildBtns();
    }

    // Coin/leidian display
    const coinNum = p.homeInfo ? p.homeInfo.coinNum : 0;
    const leidianNum = p.homeInfo ? p.homeInfo.leidianNum : 0;
    this.coinText.setText('' + coinNum);
    this.leidianText.setText('' + leidianNum);
  }

  _hideAllBuildBtns() {
    this.buildElecBtn.setVisible(false);
    this.buildGunBtn.setVisible(false);
    this.updateBtn.setVisible(false);
    this.clearBtn.setVisible(false);
    this.repairBtn.setVisible(false);
  }

  _showTips(msg) {
    this.tipsText.setText(msg).setVisible(true);
    this.time.delayedCall(1500, () => { this.tipsText.setVisible(false); });
  }

  /* ===================== DIALOGS ===================== */
  _showStartDialog() {
    // Use a separate camera for UI overlays so input works correctly
    this.dialogCam = this.cameras.add(0, 0, 480, 720);
    this.dialogCam.setScroll(0, 0);

    this.startDialogElements = [];
    const bg = this.add.image(0, 0, 'dialog_bg1').setOrigin(0, 0).setDisplaySize(480, 720).setDepth(50);
    const btnBg = this.add.image(177, 350, 'coin_bg').setOrigin(0, 0).setDisplaySize(126, 35).setDepth(51).setInteractive();
    const label = this.add.text(215, 355, 'Start', { fontSize: '18px', color: '#ffff00' }).setDepth(51);
    this.startDialogElements.push(bg, btnBg, label);

    // Ignore these from main camera, show only on dialog camera
    this.cameras.main.ignore(this.startDialogElements);

    btnBg.on('pointerdown', () => {
      this.startDialogElements.forEach(e => e.setVisible(false));
      this.cameras.remove(this.dialogCam);
      this.dialogCam = null;
      this.gameStarted = true;
      this._startRobots();
      this._startGhost();
    });
  }

  _showGameOverDialog() {
    if (this.gameOverDialog) return;
    this.gameOverDialog = true;

    this.dialogCam2 = this.cameras.add(0, 0, 480, 720);
    this.dialogCam2.setScroll(0, 0);

    this.gameOverElements = [];
    const bg = this.add.image(0, 0, 'dialog_bg1').setOrigin(0, 0).setDisplaySize(480, 720).setAlpha(0.8).setDepth(50);
    const dialogBg = this.add.image(10, 260, 'dialog_bg').setOrigin(0, 0).setDisplaySize(460, 200).setDepth(51);
    const title = this.add.text(170, 290, 'GAME OVER', { fontSize: '24px', color: '#ff0000' }).setDepth(52);
    const sub = this.add.text(120, 330, 'The game is over!', { fontSize: '16px', color: '#ffff00' }).setDepth(52);
    const restartBg = this.add.image(40, 390, 'coin_bg').setOrigin(0, 0).setDisplaySize(126, 35).setDepth(52).setInteractive();
    const restartLbl = this.add.text(70, 395, 'Restart', { fontSize: '16px', color: '#00ff00' }).setDepth(52);
    const exitBg = this.add.image(300, 390, 'coin_bg').setOrigin(0, 0).setDisplaySize(126, 35).setDepth(52).setInteractive();
    const exitLbl = this.add.text(345, 395, 'Exit', { fontSize: '16px', color: '#ff0000' }).setDepth(52);
    this.gameOverElements.push(bg, dialogBg, title, sub, restartBg, restartLbl, exitBg, exitLbl);

    this.cameras.main.ignore(this.gameOverElements);

    restartBg.on('pointerdown', () => { this.scene.restart(); });
    exitBg.on('pointerdown', () => { this.scene.start('StartScene'); });
  }

  /* ===================== MAIN UPDATE ===================== */
  update(time, rawDelta) {
    const delta = Math.min(rawDelta / 1000, 0.06);
    if (this.gameOver) return;

    // Keyboard
    if (this.cursors.left.isDown || this.wasd.left.isDown) this.dirPressed.left = true;
    else if (!this.input.activePointer.isDown) this.dirPressed.left = false;
    if (this.cursors.right.isDown || this.wasd.right.isDown) this.dirPressed.right = true;
    else if (!this.input.activePointer.isDown) this.dirPressed.right = false;
    if (this.cursors.up.isDown || this.wasd.up.isDown) this.dirPressed.up = true;
    else if (!this.input.activePointer.isDown) this.dirPressed.up = false;
    if (this.cursors.down.isDown || this.wasd.down.isDown) this.dirPressed.down = true;
    else if (!this.input.activePointer.isDown) this.dirPressed.down = false;

    if (!this.gameStarted) return;

    this._updatePlayer(delta);
    this._updateEye(delta);
    for (const robot of this.robots) this._updateRobot(robot, delta);
    this._updateGhost(delta);
    this._updateBullets(delta);
    this._updateDynamicElements(delta);
    this._renderSelectFrame();
    this._updateCamera();
    this._updateUIButtons();
    this._updateRobotBar();

    // Check game over
    if (this.player.state === State.DEAD) {
      this.gameOver = true;
      this._showGameOverDialog();
    }
  }
}
