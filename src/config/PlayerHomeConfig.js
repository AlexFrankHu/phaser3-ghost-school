const HOME_LEVELS = {
  1:  { level: 1,  addCoin: 3,     doorLevel: 0,  costCoin: 50,     costLeidian: 0 },
  2:  { level: 2,  addCoin: 4,     doorLevel: 1,  costCoin: 100,    costLeidian: 0 },
  3:  { level: 3,  addCoin: 8,     doorLevel: 2,  costCoin: 200,    costLeidian: 0 },
  4:  { level: 4,  addCoin: 16,    doorLevel: 5,  costCoin: 400,    costLeidian: 0 },
  5:  { level: 5,  addCoin: 32,    doorLevel: 5,  costCoin: 800,    costLeidian: 16 },
  6:  { level: 6,  addCoin: 64,    doorLevel: 8,  costCoin: 1600,   costLeidian: 32 },
  7:  { level: 7,  addCoin: 128,   doorLevel: 10, costCoin: 3200,   costLeidian: 64 },
  8:  { level: 8,  addCoin: 256,   doorLevel: 10, costCoin: 6400,   costLeidian: 128 },
  9:  { level: 9,  addCoin: 512,   doorLevel: 12, costCoin: 12800,  costLeidian: 0 },
  10: { level: 10, addCoin: 1024,  doorLevel: 12, costCoin: 25600,  costLeidian: 0 },
  11: { level: 11, addCoin: 2048,  doorLevel: 15, costCoin: 51200,  costLeidian: 0 },
  12: { level: 12, addCoin: 4096,  doorLevel: 15, costCoin: 102400, costLeidian: 0 },
  13: { level: 13, addCoin: 8192,  doorLevel: 15, costCoin: 204800, costLeidian: 0 },
  14: { level: 14, addCoin: 16384, doorLevel: 15, costCoin: 409600, costLeidian: 0 },
  15: { level: 15, addCoin: 32768, doorLevel: 15, costCoin: 819200, costLeidian: 0 },
};

export function getHomeLevelInfo(level) {
  return HOME_LEVELS[level] || null;
}
