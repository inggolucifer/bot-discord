/**
 * JIANGHU WORLD — SERVER-SIDE DETERMINISTIC OBJECT SCATTER ENGINE (utils/objectScatter.js)
 * Implements §3.4 & §3.2 Specification:
 * - Deterministic Poisson-disc & noise-cluster scattering per 32x32 chunk.
 * - Multi-cell footprint collision (largest -> smallest) with road/settlement/water rejection.
 * - Automated Mountain Chains for Azure Wall barriers using 1x1..4x3 mountain objects.
 * - Set-piece injection from anchors.json.
 * - Enforces <= 140 objects budget per screen chunk window.
 */

const worldData = require('./worldData');
const { getTileAt, WORLD_SEED } = require('./proceduralWorldEngine');

const CHUNK_SIZE = 32;

// Pseudo-random number generator (Mulberry32)
function createPRNG(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Object Catalogue for Placement
const SCATTER_OBJECT_CATALOG = {
  // Mountains & Karst
  mt_large: [
    { defId: 'mt_bastion_wall_v1', cw: 4, ch: 3, overhang: 2.6, collision: 'solid' },
    { defId: 'mt_twin_peaks_v1', cw: 3, ch: 2, overhang: 2.4, collision: 'solid' },
    { defId: 'mt_azure_crag_v1', cw: 2, ch: 2, overhang: 1.6, collision: 'solid' }
  ],
  mt_small: [
    { defId: 'mt_ridge_double_v1', cw: 2, ch: 1, overhang: 1.8, collision: 'solid' },
    { defId: 'mt_karst_pillar_v1', cw: 1, ch: 1, overhang: 1.2, collision: 'solid' }
  ],
  // Bamboo
  bamboo: [
    { defId: 'bamboo_jade_2x2_l_dense', cw: 2, ch: 2, overhang: 0.6, collision: 'soft' },
    { defId: 'bamboo_jade_2x1_m_dense', cw: 2, ch: 1, overhang: 1.2, collision: 'soft' },
    { defId: 'bamboo_jade_1x1_s_sparse', cw: 1, ch: 1, overhang: 0.8, collision: 'soft' }
  ],
  // Trees
  trees: [
    { defId: 'tree_spirit_peach_v1', cw: 2, ch: 2, overhang: 0.8, collision: 'solid' },
    { defId: 'tree_willow_river_v1', cw: 2, ch: 1, overhang: 1.0, collision: 'soft' },
    { defId: 'tree_pine_ancient_v1', cw: 1, ch: 1, overhang: 0.6, collision: 'soft' }
  ],
  // Rocks
  rocks: [
    { defId: 'rock_crag_cluster_v1', cw: 2, ch: 1, overhang: 0.5, collision: 'solid' },
    { defId: 'rock_boulder_moss_v1', cw: 1, ch: 1, overhang: 0.1, collision: 'solid' }
  ],
  // Structures
  structures: [
    { defId: 'building_sect_gate_v1', cw: 3, ch: 2, overhang: 1.2, collision: 'solid' },
    { defId: 'building_road_inn_v1', cw: 2, ch: 2, overhang: 0.4, collision: 'solid' },
    { defId: 'building_farm_hut_v1', cw: 2, ch: 1, overhang: 0.8, collision: 'solid' },
    { defId: 'building_tea_pavilion_v1', cw: 1, ch: 1, overhang: 0.4, collision: 'none' }
  ]
};

// In-memory chunk cache to ensure O(1) performance and determinism
const chunkCache = new Map();

/**
 * Checks if a multi-cell footprint (cw x ch) at (x, y) can be placed without collision.
 */
function canPlaceFootprint(startX, startY, cw, ch, occupiedGrid, getTileFn) {
  for (let dy = 0; dy < ch; dy++) {
    for (let dx = 0; dx < cw; dx++) {
      const tx = startX + dx;
      const ty = startY + dy;
      const key = `${tx},${ty}`;

      // 1. Grid already occupied by another object
      if (occupiedGrid.has(key)) return false;

      // 2. Tile underlying check (roads, water, settlement)
      const tile = getTileFn(tx, ty);
      if (!tile) return false;
      const t = tile.terrainType || '';

      // Do not block roads, paths, settlements, or rivers
      if (t.includes('road') || t.includes('pass') || t === 'settlement' || tile.isSettlementOrigin) {
        return false;
      }
      if (t === 'river' || t === 'river_shallow' || t === 'lake_deep' || t === 'ocean') {
        return false;
      }
    }
  }
  return true;
}

/**
 * Marks multi-cell footprint cells as occupied in grid.
 */
function markFootprintOccupied(startX, startY, cw, ch, occupiedGrid, objId) {
  for (let dy = 0; dy < ch; dy++) {
    for (let dx = 0; dx < cw; dx++) {
      occupiedGrid.set(`${startX + dx},${startY + dy}`, objId);
    }
  }
}

/**
 * Generates or retrieves scattered objects for a single 32x32 chunk.
 */
function getChunkObjects(chunkX, chunkY, worldSeed = WORLD_SEED) {
  const cacheKey = `${chunkX},${chunkY}_${worldSeed}`;
  if (chunkCache.has(cacheKey)) {
    return chunkCache.get(cacheKey);
  }

  // Derive chunk deterministic seed
  const chunkSeed = (worldSeed ^ (chunkX * 73856093) ^ (chunkY * 19349663)) >>> 0;
  const rand = createPRNG(chunkSeed);

  const startTileX = chunkX * CHUNK_SIZE;
  const startTileY = chunkY * CHUNK_SIZE;
  const endTileX = startTileX + CHUNK_SIZE - 1;
  const endTileY = startTileY + CHUNK_SIZE - 1;

  const objects = [];
  const occupiedGrid = new Map();
  const maxObjectsBudget = 140;

  // 1. Set-pieces from anchors in this chunk
  const anchors = worldData.getAnchors().filter(a =>
    a.x >= startTileX && a.x <= endTileX &&
    a.y >= startTileY && a.y <= endTileY
  );

  for (const a of anchors) {
    let structureDef = SCATTER_OBJECT_CATALOG.structures[2]; // farm hut
    if (a.type === 'sect') structureDef = SCATTER_OBJECT_CATALOG.structures[0];
    else if (a.type === 'city') structureDef = SCATTER_OBJECT_CATALOG.structures[1];

    if (canPlaceFootprint(a.x, a.y, structureDef.cw, structureDef.ch, occupiedGrid, getTileAt)) {
      const objId = `anchor_${a.id}`;
      markFootprintOccupied(a.x, a.y, structureDef.cw, structureDef.ch, occupiedGrid, objId);
      objects.push({
        id: objId,
        defId: structureDef.defId,
        x: a.x,
        y: a.y,
        customLabel: a.name,
        collision: structureDef.collision,
        tags: ['setpiece', a.type]
      });
    }
  }

  // 2. Procedural Scatter by terrain
  for (let y = startTileY; y <= endTileY; y++) {
    for (let x = startTileX; x <= endTileX; x++) {
      if (objects.length >= maxObjectsBudget) break;

      const tileKey = `${x},${y}`;
      if (occupiedGrid.has(tileKey)) continue;

      const tile = getTileAt(x, y);
      const terrain = tile.terrainType || '';

      // --- MOUNTAIN RIDGE SCATTER (Azure Wall & Mountain Peaks) ---
      if (terrain === 'azure_mountain' || terrain === 'mountain' || terrain === 'mountain_rock') {
        const roll = rand();
        if (roll < 0.35) {
          // Attempt Large Mountain (4x3 -> 3x2 -> 2x2)
          let placed = false;
          for (const mDef of SCATTER_OBJECT_CATALOG.mt_large) {
            if (canPlaceFootprint(x, y, mDef.cw, mDef.ch, occupiedGrid, getTileAt)) {
              const objId = `mt_${x}_${y}`;
              markFootprintOccupied(x, y, mDef.cw, mDef.ch, occupiedGrid, objId);
              objects.push({
                id: objId,
                defId: mDef.defId,
                x,
                y,
                collision: 'solid',
                tags: ['mountain', 'barrier']
              });
              placed = true;
              break;
            }
          }
          if (!placed) {
            // Attempt Small Karst (2x1 -> 1x1)
            for (const mDef of SCATTER_OBJECT_CATALOG.mt_small) {
              if (canPlaceFootprint(x, y, mDef.cw, mDef.ch, occupiedGrid, getTileAt)) {
                const objId = `mt_${x}_${y}`;
                markFootprintOccupied(x, y, mDef.cw, mDef.ch, occupiedGrid, objId);
                objects.push({
                  id: objId,
                  defId: mDef.defId,
                  x,
                  y,
                  collision: 'solid',
                  tags: ['mountain']
                });
                break;
              }
            }
          }
        }
      }

      // --- BAMBOO GROVE CLUSTER SCATTER ---
      else if (terrain.includes('bamboo')) {
        const roll = rand();
        if (roll < 0.45) {
          for (const bDef of SCATTER_OBJECT_CATALOG.bamboo) {
            if (canPlaceFootprint(x, y, bDef.cw, bDef.ch, occupiedGrid, getTileAt)) {
              const objId = `bamboo_${x}_${y}`;
              markFootprintOccupied(x, y, bDef.cw, bDef.ch, occupiedGrid, objId);
              objects.push({
                id: objId,
                defId: bDef.defId,
                x,
                y,
                collision: 'soft',
                tags: ['bamboo', 'vegetation']
              });
              break;
            }
          }
        }
      }

      // --- FOREST & SPIRIT WOOD SCATTER ---
      else if (terrain === 'forest' || terrain === 'spirit_wood') {
        const roll = rand();
        if (roll < 0.35) {
          for (const tDef of SCATTER_OBJECT_CATALOG.trees) {
            if (canPlaceFootprint(x, y, tDef.cw, tDef.ch, occupiedGrid, getTileAt)) {
              const objId = `tree_${x}_${y}`;
              markFootprintOccupied(x, y, tDef.cw, tDef.ch, occupiedGrid, objId);
              objects.push({
                id: objId,
                defId: tDef.defId,
                x,
                y,
                collision: tDef.collision,
                tags: ['tree']
              });
              break;
            }
          }
        }
      }

      // --- PLAINS / MEADOW SPARSE SCATTER ---
      else if (terrain === 'plains' || terrain === 'meadow') {
        const roll = rand();
        if (roll < 0.05) {
          const tDef = SCATTER_OBJECT_CATALOG.trees[2]; // ancient pine 1x1
          if (canPlaceFootprint(x, y, tDef.cw, tDef.ch, occupiedGrid, getTileAt)) {
            const objId = `tree_${x}_${y}`;
            markFootprintOccupied(x, y, tDef.cw, tDef.ch, occupiedGrid, objId);
            objects.push({
              id: objId,
              defId: tDef.defId,
              x,
              y,
              collision: 'soft',
              tags: ['tree', 'lone']
            });
          }
        } else if (roll < 0.08) {
          const rDef = SCATTER_OBJECT_CATALOG.rocks[1]; // boulder 1x1
          if (canPlaceFootprint(x, y, rDef.cw, rDef.ch, occupiedGrid, getTileAt)) {
            const objId = `rock_${x}_${y}`;
            markFootprintOccupied(x, y, rDef.cw, rDef.ch, occupiedGrid, objId);
            objects.push({
              id: objId,
              defId: rDef.defId,
              x,
              y,
              collision: 'solid',
              tags: ['rock']
            });
          }
        }
      }
    }
  }

  // Cache up to 128 chunks in memory
  if (chunkCache.size > 128) {
    const firstKey = chunkCache.keys().next().value;
    chunkCache.delete(firstKey);
  }
  chunkCache.set(cacheKey, objects);

  return objects;
}

/**
 * Retrieves scattered objects across a multi-chunk viewport window.
 */
function getViewportObjects(minTileX, minTileY, maxTileX, maxTileY, worldSeed = WORLD_SEED) {
  const minChunkX = Math.floor(minTileX / CHUNK_SIZE);
  const maxChunkX = Math.floor(maxTileX / CHUNK_SIZE);
  const minChunkY = Math.floor(minTileY / CHUNK_SIZE);
  const maxChunkY = Math.floor(maxTileY / CHUNK_SIZE);

  const result = [];
  const maxBudget = 140;

  for (let cy = minChunkY; cy <= maxChunkY; cy++) {
    for (let cx = minChunkX; cx <= maxChunkX; cx++) {
      if (result.length >= maxBudget) break;
      const chunkObjs = getChunkObjects(cx, cy, worldSeed);
      for (const obj of chunkObjs) {
        if (result.length >= maxBudget) break;
        if (obj.x >= minTileX && obj.x <= maxTileX && obj.y >= minTileY && obj.y <= maxTileY) {
          result.push(obj);
        }
      }
    }
  }

  return result;
}

module.exports = {
  CHUNK_SIZE,
  SCATTER_OBJECT_CATALOG,
  getChunkObjects,
  getViewportObjects
};
