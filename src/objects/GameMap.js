import { TileType, TILE_SIZE } from '../config/Constants';

export class GameMap {
  constructor(scene) {
    this.scene = scene;
    this.tiles = null;
    this.mapWidth = 0;
    this.mapHeight = 0;
    this.playerStartPos = null;
    this.ghostStartPosList = [];
    this.playerHomePosMap = {};
    this.eyeMinX = Infinity;
    this.eyeMinY = Infinity;
    this.eyeMaxX = 0;
    this.eyeMaxY = 0;
  }

  init() {
    const texture = this.scene.textures.get('ghostmap');
    const source = texture.getSourceImage();
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(source, 0, 0);
    const imageData = ctx.getImageData(0, 0, source.width, source.height);

    this.mapWidth = source.width;
    this.mapHeight = source.height;
    this.tiles = [];

    for (let x = 0; x < this.mapWidth; x++) {
      this.tiles[x] = [];
      for (let y = 0; y < this.mapHeight; y++) {
        this.tiles[x][y] = TileType.EMPTY;
      }
    }

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const idx = (y * this.mapWidth + x) * 4;
        const r = imageData.data[idx];
        const g = imageData.data[idx + 1];
        const b = imageData.data[idx + 2];
        const pix = (r << 16) | (g << 8) | b;

        this.tiles[x][y] = pix;

        const bottomY = this.mapHeight - 1 - y;

        if (pix === TileType.PLAYER_START) {
          this.playerStartPos = { topX: x, topY: y, x: x, y: bottomY };
        } else if (pix === TileType.GHOST_HOME) {
          const pos = { topX: x, topY: y, x: x, y: bottomY };
          this.ghostStartPosList.push(pos);
          if (pos.x > this.eyeMaxX) this.eyeMaxX = pos.x;
          if (pos.x < this.eyeMinX) this.eyeMinX = pos.x;
          if (pos.y > this.eyeMaxY) this.eyeMaxY = pos.y;
          if (pos.y < this.eyeMinY) this.eyeMinY = pos.y;
        } else if (pix === TileType.PLAYER_HOME) {
          const homeInfo = this._createHomeInfo(x, y, bottomY);
          this.playerHomePosMap[homeInfo.key] = homeInfo;
        }
      }
    }

    this._initPlayerHomeInfo();
  }

  _createHomeInfo(x, topY, bottomY) {
    return {
      bedX: x,
      bedTopY: topY,
      bedY: bottomY,
      key: `${x}-${bottomY}`,
      doorStartX: 0, doorStartY: 0, doorStartTopY: 0,
      doorEndX: 0, doorEndY: 0, doorEndTopY: 0,
      doorCurrentX: 0, doorCurrentY: 0,
      topEdge: null, bottomEdge: null, leftEdge: null, rightEdge: null,
      buildPositions: {},
      buildPosList: [],
      ghostPosition: { x: 0, y: 0 },
      ghostDir: -2,
      flag: 0,          // 0=empty, 1=player, 2=robot
      tRobotFlag: 0,
      robot: null,
      doorState: 0,     // 0=open, 1=closed
      doorDir: 0,
      doorBlood: 0,
      doorLevel: 1,
      homeLevel: 1,
      addCoin: 0,
      coinNum: 0,
      leidianNum: 0,
    };
  }

  _initPlayerHomeInfo() {
    for (const key in this.playerHomePosMap) {
      const home = this.playerHomePosMap[key];
      home.topEdge = this._getTopEdge(home);
      home.bottomEdge = this._getBottomEdge(home);
      home.leftEdge = this._getLeftEdge(home);
      home.rightEdge = this._getRightEdge(home);

      if (!home.topEdge || !home.bottomEdge || !home.leftEdge || !home.rightEdge) {
        console.error('Edge error for home:', key);
        continue;
      }

      const startX = home.leftEdge.topX;
      const endX = home.rightEdge.topX;
      const startY = home.topEdge.topY;
      const endY = home.bottomEdge.topY;

      for (let x = startX; x < endX; x++) {
        for (let y = startY; y < endY; y++) {
          const pix = this.tiles[x][y];
          const bY = this.mapHeight - 1 - y;
          if (pix === TileType.DOOR_START) {
            home.doorStartX = x;
            home.doorStartTopY = y;
            home.doorStartY = bY;
            home.doorCurrentX = x;
            home.doorCurrentY = bY;
          } else if (pix === TileType.DOOR_END) {
            home.doorEndX = x;
            home.doorEndTopY = y;
            home.doorEndY = bY;
          } else if (pix === TileType.BUILDING) {
            const bKey = `${x}-${bY}`;
            const buildPos = {
              topX: x, topY: y, x: x, y: bY,
              key: bKey,
              flag: 0, level: 1,
              homeInfo: home,
              addLeidian: 0,
              distance: 0, hit: 0,
              distanceToDoor: 0,
              hitTime: 1,
              showTime: 0, hideTime: 1, isShow: true,
            };
            home.buildPositions[bKey] = buildPos;
          }
        }
      }
    }
  }

  _getTopEdge(home) {
    const x = home.bedX;
    for (let y = home.bedTopY; y >= 0; y--) {
      if (this.tiles[x][y] === TileType.PLAYER_HOME_EDGE) {
        return { topX: x, topY: y };
      }
    }
    return null;
  }

  _getBottomEdge(home) {
    const x = home.bedX;
    for (let y = home.bedTopY; y < this.mapHeight; y++) {
      if (this.tiles[x][y] === TileType.PLAYER_HOME_EDGE) {
        return { topX: x, topY: y };
      }
    }
    return null;
  }

  _getLeftEdge(home) {
    const y = home.bedTopY;
    for (let x = home.bedX; x >= 0; x--) {
      if (this.tiles[x][y] === TileType.PLAYER_HOME_EDGE) {
        return { topX: x, topY: y };
      }
    }
    return null;
  }

  _getRightEdge(home) {
    const y = home.bedTopY;
    for (let x = home.bedX; x < this.mapWidth; x++) {
      if (this.tiles[x][y] === TileType.PLAYER_HOME_EDGE) {
        return { topX: x, topY: y };
      }
    }
    return null;
  }

  isPassableForRobot(pos) {
    if (pos.x < 0 || pos.x >= this.mapWidth || pos.y < 0 || pos.y >= this.mapHeight) return false;
    const topY = this.mapHeight - 1 - pos.y;
    const t = this.tiles[pos.x][topY];
    return t !== TileType.TILE && t !== TileType.DOOR_START;
  }

  isPassableForGhost(pos) {
    if (pos.x < 0 || pos.x >= this.mapWidth || pos.y < 0 || pos.y >= this.mapHeight) return false;
    const topY = this.mapHeight - 1 - pos.y;
    const t = this.tiles[pos.x][topY];
    return t !== TileType.TILE && t !== TileType.DOOR_START;
  }

  isPassableForGhostRelaxed(pos) {
    if (pos.x < 0 || pos.x >= this.mapWidth || pos.y < 0 || pos.y >= this.mapHeight) return false;
    const topY = this.mapHeight - 1 - pos.y;
    const t = this.tiles[pos.x][topY];
    return t !== TileType.TILE;
  }

  isWall(tileX, tileTopY) {
    if (tileX < 0 || tileX >= this.mapWidth || tileTopY < 0 || tileTopY >= this.mapHeight) return true;
    return this.tiles[tileX][tileTopY] === TileType.TILE;
  }

  getTileAt(x, topY) {
    if (x < 0 || x >= this.mapWidth || topY < 0 || topY >= this.mapHeight) return TileType.EMPTY;
    return this.tiles[x][topY];
  }

  checkIsEmpty(x, y) {
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) return false;
    const topY = this.mapHeight - 1 - y;
    const t = this.tiles[x][topY];
    return t === TileType.EMPTY || t === TileType.PLAYER_HOME_EDGE;
  }
}
