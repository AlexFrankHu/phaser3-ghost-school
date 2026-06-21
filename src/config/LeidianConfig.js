const LEIDIAN_LEVELS = {
  1:  { level: 1,  addCoin: 1,  costCoin: 230,    costLeidian: 0 },
  2:  { level: 2,  addCoin: 2,  costCoin: 400,    costLeidian: 0 },
  3:  { level: 3,  addCoin: 4,  costCoin: 800,    costLeidian: 0 },
  4:  { level: 4,  addCoin: 6,  costCoin: 1600,   costLeidian: 0 },
  5:  { level: 5,  addCoin: 8,  costCoin: 3200,   costLeidian: 0 },
  6:  { level: 6,  addCoin: 10, costCoin: 6400,   costLeidian: 0 },
  7:  { level: 7,  addCoin: 12, costCoin: 12800,  costLeidian: 0 },
  8:  { level: 8,  addCoin: 14, costCoin: 25600,  costLeidian: 0 },
  9:  { level: 9,  addCoin: 16, costCoin: 51200,  costLeidian: 0 },
  10: { level: 10, addCoin: 18, costCoin: 102400, costLeidian: 0 },
  11: { level: 11, addCoin: 20, costCoin: 204800, costLeidian: 0 },
  12: { level: 12, addCoin: 22, costCoin: 409600, costLeidian: 0 },
  13: { level: 13, addCoin: 24, costCoin: 819200, costLeidian: 0 },
  14: { level: 14, addCoin: 26, costCoin: 200000, costLeidian: 0 },
  15: { level: 15, addCoin: 28, costCoin: 500000, costLeidian: 0 },
};

export function getLeidianLevelInfo(level) {
  return LEIDIAN_LEVELS[level] || null;
}
