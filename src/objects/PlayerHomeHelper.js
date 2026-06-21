import { getDoorLevelInfo } from '../config/DoorConfig';
import { getHomeLevelInfo } from '../config/PlayerHomeConfig';
import { getGunLevelInfo } from '../config/GunConfig';
import { getLeidianLevelInfo } from '../config/LeidianConfig';
import { BuildFlag, State } from '../config/Constants';

export function initDoorDir(home, gameMap) {
  if (home.doorStartX > home.doorEndX) {
    home.doorDir = -1;
  } else if (home.doorStartX < home.doorEndX) {
    home.doorDir = 1;
  } else if (home.doorStartY > home.doorEndY) {
    home.doorDir = -2;
  } else if (home.doorStartY < home.doorEndY) {
    home.doorDir = 2;
  }

  resetDoorBlood(home);

  const doorX = home.doorEndX;
  const doorY = home.doorEndY;
  if (gameMap.checkIsEmpty(doorX, doorY - 1)) {
    home.ghostPosition = { x: doorX, y: doorY - 1 };
    home.ghostDir = State.UP;
  } else if (gameMap.checkIsEmpty(doorX, doorY + 1)) {
    home.ghostPosition = { x: doorX, y: doorY + 1 };
    home.ghostDir = State.DOWN;
  } else if (gameMap.checkIsEmpty(doorX - 1, doorY)) {
    home.ghostPosition = { x: doorX - 1, y: doorY };
    home.ghostDir = State.RIGHT;
  } else if (gameMap.checkIsEmpty(doorX + 1, doorY)) {
    home.ghostPosition = { x: doorX + 1, y: doorY };
    home.ghostDir = State.LEFT;
  } else {
    home.ghostPosition = { x: doorX, y: doorY };
  }
}

export function resetDoorBlood(home) {
  const info = getDoorLevelInfo(home.doorLevel);
  if (info) home.doorBlood = info.blood;
}

export function isDoorCanUpdate(home) {
  const info = getDoorLevelInfo(home.doorLevel + 1);
  if (!info) return false;
  return home.coinNum >= info.costCoin && home.leidianNum >= info.costLeidian;
}

export function doorUpdate(home) {
  if (!isDoorCanUpdate(home)) return;
  home.doorLevel++;
  const info = getDoorLevelInfo(home.doorLevel);
  home.doorBlood = info.blood;
  home.coinNum -= info.costCoin;
  home.leidianNum -= info.costLeidian;
}

export function isHomeCanUpdate(home) {
  const info = getHomeLevelInfo(home.homeLevel + 1);
  if (!info) return false;
  if (home.coinNum < info.costCoin) return false;
  if (home.leidianNum < info.costLeidian) return false;
  if (home.doorLevel < info.doorLevel) return false;
  return true;
}

export function homeUpdate(home) {
  if (!isHomeCanUpdate(home)) return;
  home.homeLevel++;
  const info = getHomeLevelInfo(home.homeLevel);
  home.addCoin = info.addCoin;
  home.coinNum -= info.costCoin;
  home.leidianNum -= info.costLeidian;
}

export function updateDoorCurrentPos(home, delta) {
  if (home.doorDir === -1) {
    home.doorCurrentX -= delta;
    if (home.doorCurrentX <= home.doorEndX) {
      home.doorCurrentX = home.doorEndX;
      home.doorState = 1;
    }
  } else if (home.doorDir === 1) {
    home.doorCurrentX += delta;
    if (home.doorCurrentX >= home.doorEndX) {
      home.doorCurrentX = home.doorEndX;
      home.doorState = 1;
    }
  } else if (home.doorDir === -2) {
    home.doorCurrentY -= delta;
    if (home.doorCurrentY <= home.doorEndY) {
      home.doorCurrentY = home.doorEndY;
      home.doorState = 1;
    }
  } else if (home.doorDir === 2) {
    home.doorCurrentY += delta;
    if (home.doorCurrentY >= home.doorEndY) {
      home.doorCurrentY = home.doorEndY;
      home.doorState = 1;
    }
  }
}

// Build position helpers
export function isCanBuildGun(bp) {
  const info = getGunLevelInfo(1);
  return bp.homeInfo.coinNum >= info.costCoin && bp.homeInfo.leidianNum >= info.costLeidian;
}

export function buildGun(bp) {
  if (!isCanBuildGun(bp)) return;
  const info = getGunLevelInfo(1);
  bp.flag = BuildFlag.GUN;
  bp.level = 1;
  bp.homeInfo.coinNum -= info.costCoin;
  bp.homeInfo.leidianNum -= info.costLeidian;
  bp.distance = info.distance;
  bp.hit = info.power;
}

export function isCanBuildElectricity(bp) {
  const info = getLeidianLevelInfo(1);
  return bp.homeInfo.coinNum >= info.costCoin && bp.homeInfo.leidianNum >= info.costLeidian;
}

export function buildElectricity(bp) {
  if (!isCanBuildElectricity(bp)) return;
  const info = getLeidianLevelInfo(1);
  bp.flag = BuildFlag.ELECTRICITY;
  bp.level = 1;
  bp.addLeidian = info.addCoin;
  bp.homeInfo.coinNum -= info.costCoin;
  bp.homeInfo.leidianNum -= info.costLeidian;
}

export function isCanUpdateBP(bp) {
  if (bp.flag === BuildFlag.GUN) {
    const info = getGunLevelInfo(bp.level + 1);
    if (!info) return false;
    return bp.homeInfo.coinNum >= info.costCoin && bp.homeInfo.leidianNum >= info.costLeidian;
  } else if (bp.flag === BuildFlag.ELECTRICITY) {
    const info = getLeidianLevelInfo(bp.level + 1);
    if (!info) return false;
    return bp.homeInfo.coinNum >= info.costCoin && bp.homeInfo.leidianNum >= info.costLeidian;
  }
  return false;
}

export function updateBP(bp) {
  if (!isCanUpdateBP(bp)) return;
  bp.level++;
  if (bp.flag === BuildFlag.GUN) {
    const info = getGunLevelInfo(bp.level);
    bp.homeInfo.coinNum -= info.costCoin;
    bp.homeInfo.leidianNum -= info.costLeidian;
    bp.distance = info.distance;
    bp.hit = info.power;
  } else if (bp.flag === BuildFlag.ELECTRICITY) {
    const info = getLeidianLevelInfo(bp.level);
    bp.addLeidian = info.addCoin;
    bp.homeInfo.coinNum -= info.costCoin;
    bp.homeInfo.leidianNum -= info.costLeidian;
  }
}

export function isCanClearBP(bp) {
  let lastLevel = bp.level - 1;
  if (lastLevel < 1) lastLevel = 1;
  if (bp.flag === BuildFlag.GUN) {
    const info = getGunLevelInfo(lastLevel);
    return bp.homeInfo.coinNum >= info.costCoin && bp.homeInfo.leidianNum >= info.costLeidian;
  } else if (bp.flag === BuildFlag.ELECTRICITY) {
    const info = getLeidianLevelInfo(lastLevel);
    return bp.homeInfo.coinNum >= info.costCoin && bp.homeInfo.leidianNum >= info.costLeidian;
  }
  return false;
}

export function clearBP(bp) {
  if (!isCanClearBP(bp)) return;
  let lastLevel = bp.level - 1;
  if (lastLevel < 1) lastLevel = 1;
  if (bp.flag === BuildFlag.GUN) {
    const info = getGunLevelInfo(lastLevel);
    bp.homeInfo.coinNum -= info.costCoin;
    bp.homeInfo.leidianNum -= info.costLeidian;
  } else if (bp.flag === BuildFlag.ELECTRICITY) {
    const info = getLeidianLevelInfo(lastLevel);
    bp.homeInfo.coinNum -= info.costCoin;
    bp.homeInfo.leidianNum -= info.costLeidian;
  }
  bp.level = 1;
  bp.flag = BuildFlag.CAN_BUILD;
  bp.addLeidian = 0;
  bp.distance = 0;
  bp.hit = 0;
}

export function deadClearBP(bp) {
  bp.level = 1;
  bp.flag = BuildFlag.CAN_BUILD;
  bp.addLeidian = 0;
  bp.distance = 0;
  bp.hit = 0;
}
