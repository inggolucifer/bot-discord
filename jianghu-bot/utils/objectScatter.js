/**
 * JIANGHU WORLD — SERVER-SIDE DETERMINISTIC OBJECT SCATTER ENGINE (utils/objectScatter.js)
 * Implements Fase D Specification:
 * - Deterministic Poisson-disc & noise-cluster scattering per 32x32 chunk.
 * - Multi-cell footprint collision (largest -> smallest) with road/settlement/water rejection.
 * - Full integration with asset-bindings.json:
 *   - 29 Regional Landmarks & Set-Pieces
 *   - Regional Illustrated Monsters (monsters_0..2)
 *   - Biome-specific Nature Scatters (weeping peach blossom, ginkgo gold canopy, scarlet maple, volcanic pillars, lotus ponds, karst, frost pine, dead wood, desert cairns, camellia shrubs)
 *   - Settlement Density Rings (wayside shrines, tea stalls, lanterns, cottages, dock warehouses)
 * - Enforces <= 140 objects budget per chunk.
 */

const worldData = require('./worldData');
const { getTileAt, WORLD_SEED } = require('./proceduralWorldEngine');
const { getRegionAt } = require('./worldRegionEngine');
const assetBindings = require('../config/asset-bindings.json');

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

// In-memory chunk cache to ensure O(1) performance and determinism
const chunkCache = new Map();

/**
 * Checks if a multi-cell footprint (cw x ch) at (x, y) can be placed without collision.
 */
function canPlaceFootprint(startX, startY, cw, ch, occupiedGrid, getTileFn, isAnchor = false, defId = null, objects = null) {
  // 0. Anti-clumping dispersion: identical defId must not appear within 3 tiles (Chebyshev < 3)
  if (!isAnchor && defId && objects && objects.length > 0) {
    for (let i = objects.length - 1; i >= 0; i--) {
      const o = objects[i];
      if (o.defId === defId) {
        const dist = Math.max(Math.abs(startX - o.x), Math.abs(startY - o.y));
        if (dist < 3) return false;
      }
    }
  }

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

      // Do not block roads or passes
      if (t.includes('road') || t.includes('pass')) {
        return false;
      }

      // Deep water restriction (unless anchor is a dock/port)
      if (t === 'river' || t === 'river_shallow' || t === 'lake_deep' || t === 'ocean') {
        if (!isAnchor) return false;
      }

      // If NOT an anchor set-piece, do not overlap settlement cores
      if (!isAnchor) {
        if (t === 'settlement' || tile.isSettlementOrigin) {
          return false;
        }
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

  // 1. Set-pieces from anchors & 29 Regional Landmarks
  const anchorsInChunk = worldData.getAnchors().filter(a =>
    a.x >= startTileX && a.x <= endTileX &&
    a.y >= startTileY && a.y <= endTileY
  );

  for (const a of anchorsInChunk) {
    const region = getRegionAt(a.x, a.y);
    const landmarkBinding = assetBindings.landmarks[region.id];

    let structureDef = { defId: 'building_village_thatched_cottage', cw: 2, ch: 2, collision: 'solid' };

    if (a.id === 'xitong_city' || a.name.toLowerCase().includes('xitong')) {
      structureDef = { defId: 'xitong_city_landmark', cw: 4, ch: 3, collision: 'solid' };
    } else if (a.type === 'sect') {
      structureDef = { defId: 'building_sect_library', cw: 3, ch: 2, collision: 'solid' };
    } else if (a.type === 'capital_city' || a.type === 'major_city' || a.type === 'city') {
      structureDef = { defId: 'building_spirit_pagoda', cw: 3, ch: 3, collision: 'solid' };
    } else if (a.name.toLowerCase().includes('dermaga') || a.name.toLowerCase().includes('dock') || a.name.toLowerCase().includes('port') || a.type === 'port') {
      structureDef = { defId: 'building_dock_warehouse', cw: 3, ch: 2, collision: 'solid' };
    } else if (landmarkBinding) {
      structureDef = {
        defId: landmarkBinding.defId,
        cw: landmarkBinding.cw || 3,
        ch: landmarkBinding.ch || 3,
        collision: landmarkBinding.collision || 'solid'
      };
    }

    if (canPlaceFootprint(a.x, a.y, structureDef.cw, structureDef.ch, occupiedGrid, getTileAt, true)) {
      const objId = `anchor_${a.id}`;
      markFootprintOccupied(a.x, a.y, structureDef.cw, structureDef.ch, occupiedGrid, objId);
      objects.push({
        id: objId,
        defId: structureDef.defId,
        x: a.x,
        y: a.y,
        customLabel: a.name,
        collision: structureDef.collision,
        tags: ['setpiece', a.type, region.id]
      });
    }
  }

  // 2. Settlement Density Rings: Outskirts structures around nearby anchors (radius <= 8 tiles)
  const nearbyAnchors = worldData.getAnchors().filter(a =>
    a.x >= (startTileX - 8) && a.x <= (endTileX + 8) &&
    a.y >= (startTileY - 8) && a.y <= (endTileY + 8)
  );

  if (nearbyAnchors.length > 0) {
    const outskirts = assetBindings.settlementObjects.outskirts;
    for (const a of nearbyAnchors) {
      const ringCount = Math.floor(rand() * 3) + 2; // 2..4 outskirts objects per anchor
      for (let i = 0; i < ringCount; i++) {
        if (objects.length >= maxObjectsBudget) break;
        const angle = rand() * Math.PI * 2;
        const dist = 3 + rand() * 4; // dist 3..7 tiles from anchor center
        const ox = Math.round(a.x + Math.cos(angle) * dist);
        const oy = Math.round(a.y + Math.sin(angle) * dist);

        if (ox >= startTileX && ox <= endTileX && oy >= startTileY && oy <= endTileY) {
          const itemDef = outskirts[Math.floor(rand() * outskirts.length)];
          if (canPlaceFootprint(ox, oy, itemDef.cw, itemDef.ch, occupiedGrid, getTileAt, false, itemDef.defId, objects)) {
            const objId = `outskirt_${ox}_${oy}`;
            markFootprintOccupied(ox, oy, itemDef.cw, itemDef.ch, occupiedGrid, objId);
            objects.push({
              id: objId,
              defId: itemDef.defId,
              x: ox,
              y: oy,
              collision: itemDef.collision,
              tags: ['settlement_outskirts']
            });
          }
        }
      }
    }
  }

  // 3. Regional Ambient Monster Spawns in Wilderness (Danger Tier >= 2)
  const centerTile = getTileAt(startTileX + 16, startTileY + 16);
  const chunkRegion = getRegionAt(startTileX + 16, startTileY + 16);
  const regionMonsters = assetBindings.regionalMonsters[chunkRegion.id] || [];
  const effectiveDanger = Math.max(centerTile.dangerTier || 1, chunkRegion.dangerTier || 1);

  if (regionMonsters.length > 0 && effectiveDanger >= 2) {
    const numMonsters = effectiveDanger >= 4 ? 2 : 1;
    for (let mi = 0; mi < numMonsters; mi++) {
      if (objects.length >= maxObjectsBudget) break;
      const mDefId = regionMonsters[Math.floor(rand() * regionMonsters.length)];

      for (let attempt = 0; attempt < 10; attempt++) {
        const mx = startTileX + 4 + Math.floor(rand() * 24);
        const my = startTileY + 4 + Math.floor(rand() * 24);
        if (canPlaceFootprint(mx, my, 1, 1, occupiedGrid, getTileAt, false, mDefId, objects)) {
          const objId = `monster_${mx}_${my}`;
          markFootprintOccupied(mx, my, 1, 1, occupiedGrid, objId);
          objects.push({
            id: objId,
            defId: mDefId,
            x: mx,
            y: my,
            collision: 'soft',
            tags: ['monster', 'regional', chunkRegion.id]
          });
          break;
        }
      }
    }
  }

  // 4. Procedural Biome Scatter by Terrain & Region
  for (let y = startTileY; y <= endTileY; y++) {
    for (let x = startTileX; x <= endTileX; x++) {
      if (objects.length >= maxObjectsBudget) break;

      const tileKey = `${x},${y}`;
      if (occupiedGrid.has(tileKey)) continue;

      const tile = getTileAt(x, y);
      const terrain = tile.terrainType || '';
      const region = getRegionAt(x, y);

      // --- DESERT & ARID DUNES ---
      if (terrain.includes('desert') || terrain.includes('sand') || terrain.includes('dune') || region.id === 'western_sacred_desert' || region.id === 'western_gorge_labyrinth') {
        const roll = rand();
        if (roll < 0.08) {
          // Weathered skull cairn or quartz crag or limestone spire
          const desertRocks = assetBindings.natureScatters.rocks.filter(r =>
            !r.biomes || r.biomes.includes('western_sacred_desert') || r.biomes.includes('desert')
          );
          const rDef = desertRocks.length > 0
            ? desertRocks[Math.floor(rand() * desertRocks.length)]
            : assetBindings.natureScatters.rocks[7];

          if (canPlaceFootprint(x, y, rDef.cw, rDef.ch, occupiedGrid, getTileAt, false, rDef.defId, objects)) {
            const objId = `desert_rock_${x}_${y}`;
            markFootprintOccupied(x, y, rDef.cw, rDef.ch, occupiedGrid, objId);
            objects.push({
              id: objId,
              defId: rDef.defId,
              x,
              y,
              collision: rDef.collision,
              tags: ['desert', 'rock', region.id]
            });
          }
        } else if (roll < 0.12) {
          // Twisted locust tree or wolfberry bush
          const candidateFlora = [
            assetBindings.natureScatters.trees.find(t => t.defId.includes('locust')) || assetBindings.natureScatters.trees[12],
            ...(assetBindings.natureScatters.shrubs || []).filter(s => s.biomes.includes('western_sacred_desert') || s.biomes.includes('desert'))
          ].filter(Boolean);

          const fDef = candidateFlora[Math.floor(rand() * candidateFlora.length)];
          if (fDef && canPlaceFootprint(x, y, fDef.cw, fDef.ch, occupiedGrid, getTileAt, false, fDef.defId, objects)) {
            const objId = `desert_flora_${x}_${y}`;
            markFootprintOccupied(x, y, fDef.cw, fDef.ch, occupiedGrid, objId);
            objects.push({
              id: objId,
              defId: fDef.defId,
              x,
              y,
              collision: fDef.collision,
              tags: ['desert', 'flora', region.id]
            });
          }
        }
      }

      // --- DEAD WOOD, LAVA & VOLCANIC OBSIDIAN ---
      else if (terrain === 'dead_wood' || terrain.includes('lava') || terrain.includes('volcano') || region.id === 'lava_spine' || region.id === 'abyssal_scar') {
        const roll = rand();
        if (roll < 0.22) {
          const volcanicPillars = assetBindings.natureScatters.rocks.filter(r =>
            r.biomes && (r.biomes.includes('lava_spine') || r.biomes.includes('abyssal_scar'))
          );
          const deadTrees = assetBindings.natureScatters.trees.filter(t =>
            t.biomes && (t.biomes.includes('lava_spine') || t.biomes.includes('dead_wood'))
          );
          const stumps = (assetBindings.natureScatters.shrubs || []).filter(s =>
            s.biomes && s.biomes.includes('lava_spine')
          );
          const pool = [...volcanicPillars, ...deadTrees, ...stumps];
          const itemDef = pool.length > 0 ? pool[Math.floor(rand() * pool.length)] : assetBindings.natureScatters.rocks[7];

          if (itemDef && canPlaceFootprint(x, y, itemDef.cw, itemDef.ch, occupiedGrid, getTileAt, false, itemDef.defId, objects)) {
            const objId = `volcanic_${x}_${y}`;
            markFootprintOccupied(x, y, itemDef.cw, itemDef.ch, occupiedGrid, objId);
            objects.push({
              id: objId,
              defId: itemDef.defId,
              x,
              y,
              collision: itemDef.collision,
              tags: ['volcanic', 'dead_wood', region.id]
            });
          }
        }
      }

      // --- MOUNTAIN, ROCK, PEAK & HILL SCATTER ---
      else if (terrain === 'azure_mountain' || terrain === 'mountain' || terrain === 'mountain_rock' || terrain === 'mountain_peak' || terrain === 'hill') {
        const roll = rand();
        if (roll < 0.35) {
          const candidateRocks = assetBindings.natureScatters.rocks.filter(r =>
            !r.biomes || r.biomes.includes(region.id) || r.biomes.includes('mountain')
          );
          const rDef = candidateRocks.length > 0
            ? candidateRocks[Math.floor(rand() * candidateRocks.length)]
            : assetBindings.natureScatters.rocks[0];

          if (canPlaceFootprint(x, y, rDef.cw, rDef.ch, occupiedGrid, getTileAt, false, rDef.defId, objects)) {
            const objId = `rock_${x}_${y}`;
            markFootprintOccupied(x, y, rDef.cw, rDef.ch, occupiedGrid, objId);
            objects.push({
              id: objId,
              defId: rDef.defId,
              x,
              y,
              collision: rDef.collision,
              tags: ['mountain', 'barrier', region.id]
            });
          }
        } else if (roll < 0.45) {
          // Cliff red maple, twisted juniper or frost pine on high ridges
          const ridgeTrees = assetBindings.natureScatters.trees.filter(t =>
            t.biomes && (t.biomes.includes('mountain') || t.biomes.includes(region.id))
          );
          if (ridgeTrees.length > 0) {
            const tDef = ridgeTrees[Math.floor(rand() * ridgeTrees.length)];
            if (canPlaceFootprint(x, y, tDef.cw, tDef.ch, occupiedGrid, getTileAt, false, tDef.defId, objects)) {
              const objId = `mountain_tree_${x}_${y}`;
              markFootprintOccupied(x, y, tDef.cw, tDef.ch, occupiedGrid, objId);
              objects.push({
                id: objId,
                defId: tDef.defId,
                x,
                y,
                collision: tDef.collision,
                tags: ['mountain', 'tree', region.id]
              });
            }
          }
        }
      }

      // --- BAMBOO GROVE CLUSTER ---
      else if (terrain.includes('bamboo')) {
        const roll = rand();
        if (roll < 0.45) {
          const bDefs = assetBindings.natureScatters.bamboo;
          const bDef = bDefs[Math.floor(rand() * bDefs.length)];
          if (canPlaceFootprint(x, y, bDef.cw, bDef.ch, occupiedGrid, getTileAt, false, bDef.defId, objects)) {
            const objId = `bamboo_${x}_${y}`;
            markFootprintOccupied(x, y, bDef.cw, bDef.ch, occupiedGrid, objId);
            objects.push({
              id: objId,
              defId: bDef.defId,
              x,
              y,
              collision: bDef.collision,
              tags: ['bamboo', 'vegetation']
            });
          }
        }
      }

      // --- FOREST, SPIRIT WOOD & DENSE WOODLAND ---
      else if (terrain === 'forest' || terrain === 'spirit_wood') {
        const roll = rand();
        if (roll < 0.35) {
          const candidateTrees = assetBindings.natureScatters.trees.filter(t =>
            !t.biomes || t.biomes.includes(region.id) || t.biomes.includes('forest')
          );
          const tDef = candidateTrees.length > 0
            ? candidateTrees[Math.floor(rand() * candidateTrees.length)]
            : assetBindings.natureScatters.trees[0];

          if (canPlaceFootprint(x, y, tDef.cw, tDef.ch, occupiedGrid, getTileAt, false, tDef.defId, objects)) {
            const objId = `tree_${x}_${y}`;
            markFootprintOccupied(x, y, tDef.cw, tDef.ch, occupiedGrid, objId);
            objects.push({
              id: objId,
              defId: tDef.defId,
              x,
              y,
              collision: tDef.collision,
              tags: ['tree', region.id]
            });
          }
        }
      }

      // --- WATER EDGES & DELTA FLORA ---
      else if (terrain.includes('lake') || terrain.includes('pond') || region.id === 'nine_springs_delta' || region.id === 'mirror_lake') {
        const roll = rand();
        if (roll < 0.18) {
          const wDefs = assetBindings.natureScatters.waters;
          const wDef = wDefs[Math.floor(rand() * wDefs.length)];
          if (canPlaceFootprint(x, y, wDef.cw, wDef.ch, occupiedGrid, getTileAt, false, wDef.defId, objects)) {
            const objId = `water_veg_${x}_${y}`;
            markFootprintOccupied(x, y, wDef.cw, wDef.ch, occupiedGrid, objId);
            objects.push({
              id: objId,
              defId: wDef.defId,
              x,
              y,
              collision: wDef.collision,
              tags: ['water_flora', region.id]
            });
          }
        } else if (roll < 0.24) {
          // Weeping willow along river/lake banks
          const willow = assetBindings.natureScatters.trees.find(t => t.defId.includes('willow'));
          if (willow && canPlaceFootprint(x, y, willow.cw, willow.ch, occupiedGrid, getTileAt, false, willow.defId, objects)) {
            const objId = `willow_${x}_${y}`;
            markFootprintOccupied(x, y, willow.cw, willow.ch, occupiedGrid, objId);
            objects.push({
              id: objId,
              defId: willow.defId,
              x,
              y,
              collision: willow.collision,
              tags: ['water_tree', region.id]
            });
          }
        }
      }

      // --- PLAINS, MEADOW & PRAIRIE SCATTER ---
      else if (terrain === 'plains' || terrain === 'meadow' || terrain === 'farmland' || terrain === 'herb_field') {
        const isSnowRegion = region.id === 'northern_desolate' || region.id === 'frostmoon_sea';
        const roll = rand();

        if (isSnowRegion) {
          // Northern desolate frost pines & frozen cypresses
          if (roll < 0.12) {
            const frostTrees = assetBindings.natureScatters.trees.filter(t =>
              t.biomes && (t.biomes.includes('northern_desolate') || t.biomes.includes('frostmoon_sea'))
            );
            const fTree = frostTrees.length > 0 ? frostTrees[Math.floor(rand() * frostTrees.length)] : assetBindings.natureScatters.trees[7];
            if (canPlaceFootprint(x, y, fTree.cw, fTree.ch, occupiedGrid, getTileAt, false, fTree.defId, objects)) {
              const objId = `frost_pine_${x}_${y}`;
              markFootprintOccupied(x, y, fTree.cw, fTree.ch, occupiedGrid, objId);
              objects.push({
                id: objId,
                defId: fTree.defId,
                x,
                y,
                collision: fTree.collision,
                tags: ['frost_tree', region.id]
              });
            }
          }
        } else {
          // Wuxia scholar trees (ginkgo, weeping peach, autumn maple)
          if (roll < 0.05) {
            const candidateTrees = assetBindings.natureScatters.trees.filter(t =>
              !t.biomes || t.biomes.includes(region.id) || t.biomes.includes('plains')
            );
            const tDef = candidateTrees.length > 0
              ? candidateTrees[Math.floor(rand() * candidateTrees.length)]
              : assetBindings.natureScatters.trees[0];

            if (canPlaceFootprint(x, y, tDef.cw, tDef.ch, occupiedGrid, getTileAt, false, tDef.defId, objects)) {
              const objId = `tree_${x}_${y}`;
              markFootprintOccupied(x, y, tDef.cw, tDef.ch, occupiedGrid, objId);
              objects.push({
                id: objId,
                defId: tDef.defId,
                x,
                y,
                collision: tDef.collision,
                tags: ['tree', 'scholar', region.id]
              });
            }
          } else if (roll < 0.08) {
            // Shrubs (mountain camellia, wild peony, wild tea terrace, wolfberry)
            const shrubs = (assetBindings.natureScatters.shrubs || []).filter(s =>
              !s.biomes || s.biomes.includes(region.id) || s.biomes.includes('plains') || s.biomes.includes('meadow')
            );
            if (shrubs.length > 0) {
              const sDef = shrubs[Math.floor(rand() * shrubs.length)];
              if (canPlaceFootprint(x, y, sDef.cw, sDef.ch, occupiedGrid, getTileAt, false, sDef.defId, objects)) {
                const objId = `shrub_${x}_${y}`;
                markFootprintOccupied(x, y, sDef.cw, sDef.ch, occupiedGrid, objId);
                objects.push({
                  id: objId,
                  defId: sDef.defId,
                  x,
                  y,
                  collision: sDef.collision,
                  tags: ['shrub', region.id]
                });
              }
            }
          } else if (roll < 0.10) {
            // Mossy boulder or crag
            const candidateRocks = assetBindings.natureScatters.rocks.filter(r =>
              !r.biomes || r.biomes.includes(region.id) || r.biomes.includes('plains')
            );
            const rDef = candidateRocks.length > 0
              ? candidateRocks[Math.floor(rand() * candidateRocks.length)]
              : assetBindings.natureScatters.rocks[6];

            if (canPlaceFootprint(x, y, rDef.cw, rDef.ch, occupiedGrid, getTileAt, false, rDef.defId, objects)) {
              const objId = `rock_${x}_${y}`;
              markFootprintOccupied(x, y, rDef.cw, rDef.ch, occupiedGrid, objId);
              objects.push({
                id: objId,
                defId: rDef.defId,
                x,
                y,
                collision: rDef.collision,
                tags: ['rock', region.id]
              });
            }
          }
        }
      }
    }
  }


  // Cache up to 256 chunks in memory
  if (chunkCache.size > 256) {
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
  getChunkObjects,
  getViewportObjects
};
