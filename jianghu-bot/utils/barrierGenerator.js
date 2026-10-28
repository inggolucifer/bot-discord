'use strict';
/**
 * utils/barrierGenerator.js
 * Jianghu World — Colossal Mountain Barrier & Massif Generator (Prompt V12 P10)
 * 
 * Generates deterministic colossal mountain massifs (mountain_range, mountain_XXL,
 * mountain_XL, mountain_L, cliff_wall_seg) across major world barrier ridges,
 * strictly guaranteeing that the 4 official passes through Azure Wall
 * (caravan_gap, north_pass, mist_pass, sword_gorge) remain wide, open, and reachable (width >= 3).
 */

const path = require('path');
const GC = require('./gridContract');
const { getTileAt, WORLD_SEED } = require('./proceduralWorldEngine');

const AZURE_WALL = {
  id: 'azure_wall',
  bounds: { minX: 0, maxX: 3950, minY: 3100, maxY: 3600 }
};

const OFFICIAL_PASSES = [
  { id: 'caravan_gap', x: 750, y: 3350, width: 3 },
  { id: 'north_pass', x: 2200, y: 3350, width: 3 },
  { id: 'mist_pass', x: 2600, y: 3350, width: 3 },
  { id: 'sword_gorge', x: 3100, y: 3350, width: 3 }
];

const WATER_TERRAINS = new Set([
  'sea', 'ocean', 'sea_reef', 'island_reef', 'lake_deep', 'lake', 'river', 'river_shallow'
]);

function createPRNG(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Checks if a given tile coordinate falls inside a pass corridor.
 * A pass corridor must remain completely free of impassable objects.
 */
function isPassCorridor(x, y) {
  if (y < AZURE_WALL.bounds.minY - 4 || y > AZURE_WALL.bounds.maxY + 4) {
    return false;
  }
  for (const p of OFFICIAL_PASSES) {
    const halfWidth = Math.max(2, Math.floor((p.width || 3) / 2) + 2);
    if (Math.abs(x - p.x) <= halfWidth) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if a 32x32 chunk intersects Azure Wall bounds.
 */
function isBarrierChunk(cx, cy) {
  const minX = cx * 32;
  const maxX = minX + 31;
  const minY = cy * 32;
  const maxY = minY + 31;

  return (
    maxX >= AZURE_WALL.bounds.minX &&
    minX <= AZURE_WALL.bounds.maxX &&
    maxY >= AZURE_WALL.bounds.minY &&
    minY <= AZURE_WALL.bounds.maxY
  );
}

/**
 * Generates deterministic colossal mountain massif objects for a chunk.
 */
function getBarrierObjectsForChunk(cx, cy, worldSeed = WORLD_SEED) {
  if (!isBarrierChunk(cx, cy)) {
    return [];
  }

  const chunkMinX = cx * 32;
  const chunkMinY = cy * 32;
  const chunkSeed = ((worldSeed ^ (cx * 1103515245) ^ (cy * 12345)) >>> 0);
  const rand = createPRNG(chunkSeed);

  // Available colossal massif types
  const massifDefs = [
    'mountain_range',
    'mountain_XXL',
    'mountain_XL',
    'mountain_L',
    'cliff_wall_seg'
  ];

  const results = [];
  const occupiedLocal = new Map();

  // Determine how many massifs to try placing in this chunk (1 to 3)
  const numMassifs = 1 + Math.floor(rand() * 2);

  for (let attempt = 0; attempt < 8 && results.length < numMassifs; attempt++) {
    // Pick massif type based on roll
    const roll = rand();
    let defId;
    if (roll < 0.20) defId = 'mountain_range';
    else if (roll < 0.45) defId = 'mountain_XXL';
    else if (roll < 0.70) defId = 'mountain_XL';
    else if (roll < 0.88) defId = 'mountain_L';
    else defId = 'cliff_wall_seg';

    const g = GC.getGrid(defId);
    if (!g) continue;

    // Must fit inside chunk with canopy to satisfy insideChunk
    const maxLocalX = 32 - g.fw;
    const minLocalY = g.rowsAbove;
    const maxLocalY = 32 - g.fh;

    if (maxLocalX <= 0 || maxLocalY < minLocalY) continue;

    const lx = Math.floor(rand() * (maxLocalX + 1));
    const ly = minLocalY + Math.floor(rand() * (maxLocalY - minLocalY + 1));

    const worldX = chunkMinX + lx;
    const worldY = chunkMinY + ly;

    // Check pass corridor and terrain validity
    let valid = true;
    for (let dy = 0; dy < g.fh && valid; dy++) {
      for (let dx = 0; dx < g.fw && valid; dx++) {
        const tx = worldX + dx;
        const ty = worldY + dy;

        // Never touch pass corridors
        if (isPassCorridor(tx, ty)) {
          valid = false;
          break;
        }

        const tile = getTileAt(tx, ty);
        if (!tile) {
          valid = false;
          break;
        }

        // Avoid roads, water, settlements
        if (tile.isRoad || tile.terrainType === 'road' || tile.terrainType === 'mountain_pass' || tile.terrainType === 'sword_gorge_pass') {
          valid = false;
          break;
        }
        if (WATER_TERRAINS.has(tile.terrain) || tile.isWater) {
          valid = false;
          break;
        }
        if (tile.isSettlementCore || tile.isSettlementOrigin) {
          valid = false;
          break;
        }
      }
    }

    if (!valid) continue;

    // Check collision with already placed massifs in this chunk
    if (!GC.isFree(worldX, worldY, g, occupiedLocal)) {
      continue;
    }

    const objId = `barrier_${defId}_${cx}_${cy}_${results.length}`;
    GC.mark(worldX, worldY, g, occupiedLocal, objId);

    results.push({
      id: objId,
      defId,
      x: worldX,
      y: worldY,
      cw: g.fw,
      ch: g.fh,
      collision: 'solid',
      isBarrierMassif: true
    });
  }

  return results;
}

module.exports = {
  AZURE_WALL,
  OFFICIAL_PASSES,
  isBarrierChunk,
  isPassCorridor,
  getBarrierObjectsForChunk
};
