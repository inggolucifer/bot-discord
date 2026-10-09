/**
 * JIANGHU WORLD — AUTOTILING ENGINE (utils/autotileEngine.js)
 * Implements 4-bit / 16-variant autotile bitmasking for rivers, lakes, and roads:
 * - Bit 0 (1): North neighbor connected
 * - Bit 1 (2): East neighbor connected
 * - Bit 2 (4): South neighbor connected
 * - Bit 3 (8): West neighbor connected
 * Yields frames: autotile_{type}_m00 to autotile_{type}_m0f
 */

const AUTOTILE_COMPATIBILITY = {
  river: ['river', 'river_shallow', 'lake', 'lake_deep', 'waterfall_pool'],
  lake: ['lake', 'lake_deep', 'river', 'pond_lotus'],
  road_stone: ['road_stone', 'settlement', 'sect_ground'],
  road_dirt: ['road_dirt', 'road_stone', 'settlement']
};

/**
 * Checks if target terrain connects with neighbor terrain.
 */
function isTerrainConnected(baseTerrain, neighborTerrain) {
  if (baseTerrain === neighborTerrain) return true;
  const compatible = AUTOTILE_COMPATIBILITY[baseTerrain];
  if (compatible && compatible.includes(neighborTerrain)) return true;
  return false;
}

/**
 * Calculates 4-neighbor directional bitmask (0..15).
 * @param {number} x
 * @param {number} y
 * @param {function(x, y): string} getTerrainFn
 * @returns {number} bitmask 0..15
 */
function calculateAutotileBitmask(x, y, getTerrainFn) {
  const currentTerrain = getTerrainFn(x, y);
  if (!AUTOTILE_COMPATIBILITY[currentTerrain]) {
    return 0;
  }

  let bitmask = 0;

  // North (y + 1 in grid coordinates)
  if (isTerrainConnected(currentTerrain, getTerrainFn(x, y + 1))) {
    bitmask |= 1;
  }
  // East (x + 1)
  if (isTerrainConnected(currentTerrain, getTerrainFn(x + 1, y))) {
    bitmask |= 2;
  }
  // South (y - 1)
  if (isTerrainConnected(currentTerrain, getTerrainFn(x, y - 1))) {
    bitmask |= 4;
  }
  // West (x - 1)
  if (isTerrainConnected(currentTerrain, getTerrainFn(x - 1, y))) {
    bitmask |= 8;
  }

  return bitmask;
}

/**
 * Maps terrain and bitmask to sprite frame ID.
 */
function getAutotileFrameId(terrainType, bitmask) {
  const hex = (bitmask & 0x0f).toString(16).padStart(2, '0');
  let category = 'river';
  if (terrainType.includes('road')) category = 'road';
  else if (terrainType.includes('lake') || terrainType.includes('water')) category = 'river';

  return `autotile_${category}_m${hex}`;
}

module.exports = {
  calculateAutotileBitmask,
  getAutotileFrameId,
  isTerrainConnected
};
