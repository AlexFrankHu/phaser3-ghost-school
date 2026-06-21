const DOOR_LEVELS = {
  1:  { level: 1,  blood: 50,    costCoin: 0,      costLeidian: 0 },
  2:  { level: 2,  blood: 100,   costCoin: 16,     costLeidian: 0 },
  3:  { level: 3,  blood: 150,   costCoin: 32,     costLeidian: 0 },
  4:  { level: 4,  blood: 200,   costCoin: 64,     costLeidian: 0 },
  5:  { level: 5,  blood: 250,   costCoin: 128,    costLeidian: 0 },
  6:  { level: 6,  blood: 320,   costCoin: 256,    costLeidian: 0 },
  7:  { level: 7,  blood: 640,   costCoin: 512,    costLeidian: 16 },
  8:  { level: 8,  blood: 1280,  costCoin: 1024,   costLeidian: 32 },
  9:  { level: 9,  blood: 2560,  costCoin: 2048,   costLeidian: 64 },
  10: { level: 10, blood: 3500,  costCoin: 4096,   costLeidian: 128 },
  11: { level: 11, blood: 5000,  costCoin: 8192,   costLeidian: 512 },
  12: { level: 12, blood: 7000,  costCoin: 16384,  costLeidian: 1024 },
  13: { level: 13, blood: 10000, costCoin: 32768,  costLeidian: 2048 },
  14: { level: 14, blood: 12500, costCoin: 50000,  costLeidian: 4096 },
  15: { level: 15, blood: 15000, costCoin: 100000, costLeidian: 8192 },
};

export function getDoorLevelInfo(level) {
  return DOOR_LEVELS[level] || null;
}
