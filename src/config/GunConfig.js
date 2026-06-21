const GUN_LEVELS = {
  1:  { level: 1,  power: 2,  distance: 4,    costCoin: 8,     costLeidian: 0 },
  2:  { level: 2,  power: 3,  distance: 4,    costCoin: 8,     costLeidian: 0 },
  3:  { level: 3,  power: 4,  distance: 4.5,  costCoin: 16,    costLeidian: 0 },
  4:  { level: 4,  power: 5,  distance: 5,    costCoin: 32,    costLeidian: 0 },
  5:  { level: 5,  power: 6,  distance: 5.5,  costCoin: 64,    costLeidian: 0 },
  6:  { level: 6,  power: 8,  distance: 6,    costCoin: 256,   costLeidian: 0 },
  7:  { level: 7,  power: 10, distance: 7,    costCoin: 512,   costLeidian: 16 },
  8:  { level: 8,  power: 13, distance: 8,    costCoin: 1024,  costLeidian: 32 },
  9:  { level: 9,  power: 16, distance: 9,    costCoin: 2048,  costLeidian: 64 },
  10: { level: 10, power: 19, distance: 10,   costCoin: 4096,  costLeidian: 128 },
  11: { level: 11, power: 21, distance: 10,   costCoin: 8192,  costLeidian: 256 },
  12: { level: 12, power: 25, distance: 10,   costCoin: 16384, costLeidian: 512 },
  13: { level: 13, power: 30, distance: 10,   costCoin: 32768, costLeidian: 1024 },
  14: { level: 14, power: 35, distance: 10,   costCoin: 50000, costLeidian: 2048 },
  15: { level: 15, power: 40, distance: 10,   costCoin: 80000, costLeidian: 4096 },
};

export function getGunLevelInfo(level) {
  return GUN_LEVELS[level] || null;
}
