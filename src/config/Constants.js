// Tile types from pixel map colors
export const TileType = {
  EMPTY: 0x000000,
  TILE: 0xffffff,       // Wall
  BUILDING: 0x00ff00,   // Build position
  PLAYER_START: 0xff0000,
  GHOST_HOME: 0xff0100,
  PLAYER_HOME: 0xff0001, // Bed
  DOOR_START: 0x00ffff,
  DOOR_END: 0x01ffff,
  PLAYER_HOME_EDGE: 0xffff00,
};

// Tile size in pixels for rendering
export const TILE_SIZE = 32;

// Camera viewport in tiles
export const CAMERA_VIEWPORT_W = 15;
export const CAMERA_VIEWPORT_H = 22;

// Entity states
export const State = {
  IDLE: 0,
  RIGHT: 1,
  UP: 2,
  SPAWN: 3,
  DYING: 4,
  DEAD: 5,
  INBED: 6,
  LEFT: -1,
  DOWN: -2,
};

// Building flags
export const BuildFlag = {
  NONE: 0,
  CAN_BUILD: 1,
  GUN: 2,
  ELECTRICITY: 3,
};

// Home flags
export const HomeFlag = {
  EMPTY: 0,
  PLAYER: 1,
  ROBOT: 2,
};

// Select state
export const SelectState = {
  PLAYER: 1,
  EYE: 2,
  GHOST: 3,
};
