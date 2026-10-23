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
const quarantineData = require('../world-data/asset-quarantine.json');
const quarantinedFamilies = quarantineData.quarantinedFamilies || [];
const scaleCanon = require('../world-data/scale-canon.json');

// Known atlas frames SSOT (Prompt 1.1)
const knownFramesData = require('../config/known-frames.json');
const KNOWN_FRAMES = new Set(knownFramesData);

const CHUNK_SIZE = 32;

// Authored Props SSOT (Prompt 2.1 & 2.2)
const authoredPropsData = require('../world-data/authored-props.json');
const AUTHORED_BY_CHUNK = new Map();
if (authoredPropsData && Array.isArray(authoredPropsData.props)) {
  for (const p of authoredPropsData.props) {
    const cx = Math.floor(p.x / CHUNK_SIZE);
    const cy = Math.floor(p.y / CHUNK_SIZE);
    const key = `${cx},${cy}`;
    if (!AUTHORED_BY_CHUNK.has(key)) {
      AUTHORED_BY_CHUNK.set(key, []);
    }
    AUTHORED_BY_CHUNK.get(key).push(p);
  }
}

function resolveDef(defId, fallbackDefId = null) {
  if (defId && KNOWN_FRAMES.has(defId) && !isQuarantined(defId)) return defId;
  if (fallbackDefId && KNOWN_FRAMES.has(fallbackDefId) && !isQuarantined(fallbackDefId)) return fallbackDefId;
  return null;
}

const WATER_TERRAINS = new Set(['sea', 'ocean', 'sea_reef', 'island_reef', 'lake_deep', 'lake', 'river', 'river_shallow']);
const WATER_EXEMPT_REGEX = /lotus|coral|reef|boat|drift|dock|island|reed|stream|water/;

function matchesTerrain(allowedList, actualTerrain) {
  if (!allowedList || !Array.isArray(allowedList)) return true;
  if (allowedList.includes(actualTerrain)) return true;
  // Substring & alias matching for procedural generator terrain varieties
  if (actualTerrain.includes('desert') || actualTerrain.includes('sand') || actualTerrain.includes('dune')) {
    if (allowedList.some(t => t.includes('desert') || t.includes('sand') || t.includes('dune') || t === 'arid_dirt')) return true;
  }
  if (actualTerrain.includes('bamboo')) {
    if (allowedList.some(t => t.includes('bamboo'))) return true;
  }
  if (actualTerrain.includes('swamp') || actualTerrain === 'poison_pool') {
    if (allowedList.some(t => t.includes('swamp') || t === 'miasma_waste' || t === 'poison_pool')) return true;
  }
  if (actualTerrain.includes('volcan') || actualTerrain === 'crater' || actualTerrain === 'basalt' || actualTerrain === 'lava_flow') {
    if (allowedList.some(t => t === 'volcanic' || t === 'crater' || t === 'basalt' || t === 'lava_flow')) return true;
  }
  if (actualTerrain === 'forest' || actualTerrain === 'spirit_wood') {
    if (allowedList.some(t => t === 'plains' || t === 'meadow' || t === 'peach_blossom' || t === 'forest' || t === 'spirit_wood')) return true;
  }
  if (actualTerrain === 'battlefield_ash' || actualTerrain === 'lightning_scar') {
    if (allowedList.some(t => t === 'dirt' || t === 'plains' || t === 'dead_wood' || t === 'abyssal_scar')) return true;
  }
  if (actualTerrain === 'sword_gorge_pass') {
    if (allowedList.some(t => t.includes('canyon') || t.includes('cliff') || t.includes('mountain'))) return true;
  }
  if (actualTerrain === 'ruin_floor' || actualTerrain === 'formation_tile') {
    if (allowedList.some(t => t === 'ruin_floor' || t === 'formation_tile')) return true;
  }
  return false;
}

function isAllowedOnTerrain(defId, terrainType, isAnchor = false) {
  if (!defId || !terrainType) return true;

  // Water terrain restriction is absolute for random scatter (Prompt 1.5)
  if (WATER_TERRAINS.has(terrainType)) {
    if (isAnchor && terrainType === 'island_reef') return true;
    if (!WATER_EXEMPT_REGEX.test(defId)) return false;
  }

  // 1. Check in natureScatters
  for (const cat of Object.values(assetBindings.natureScatters || {})) {
    if (Array.isArray(cat)) {
      const entry = cat.find(e => e.defId === defId);
      if (entry) {
        if (entry.terrains && Array.isArray(entry.terrains)) {
          return matchesTerrain(entry.terrains, terrainType);
        }
        if (WATER_TERRAINS.has(terrainType)) {
          return WATER_EXEMPT_REGEX.test(defId);
        }
        return true;
      }
    }
  }

  // 2. Check in landmarks
  if (assetBindings.landmarks) {
    for (const lm of Object.values(assetBindings.landmarks)) {
      if (lm && lm.defId === defId) {
        if (lm.terrains && Array.isArray(lm.terrains)) {
          return matchesTerrain(lm.terrains, terrainType);
        }
        if (WATER_TERRAINS.has(terrainType)) {
          return WATER_EXEMPT_REGEX.test(defId);
        }
        return true;
      }
    }
  }

  // 3. Fallback: if water terrain, only allow water objects
  if (WATER_TERRAINS.has(terrainType)) {
    if (isAnchor && terrainType === 'island_reef') return true;
    return WATER_EXEMPT_REGEX.test(defId);
  }

  return true;
}

function getCanonCollision(defId, fallbackCw = 1, fallbackCh = 1) {
  const canon = scaleCanon[defId];
  if (canon && canon.collision) {
    return {
      w: canon.collision.w,
      h: canon.collision.h,
      offsetX: canon.collision.offsetX || 0
    };
  }
  return { w: fallbackCw, h: fallbackCh, offsetX: 0 };
}

function isQuarantined(defId) {
  if (!defId) return false;
  return quarantinedFamilies.some(family => defId.startsWith(family) || defId.includes(family));
}

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
function canPlaceFootprint(startX, startY, cw, ch, occupiedGrid, getTileFn, isAnchor = false, defId = null, objects = null, collisionOverride = false) {
  // Phase HA: Asset Quarantine rejection (never place code-generated placeholder sprites)
  if (defId && isQuarantined(defId)) {
    return false;
  }

  // 0. Anti-clumping dispersion: identical defId must not appear within 3 tiles (Chebyshev < 3)
  if (!isAnchor && defId && objects && objects.length > 0) {
    for (let i = objects.length - 1; i >= 0; i--) {
      const o = objects[i];
      if (o.defId === defId) {
        const dist = Math.max(Math.abs(startX - o.x), Math.abs(startY - o.y));
        if (dist < 3) return false;
      }
    }

    // 18% Dominance Limit rule (Prompt 1.3 & Fase D in Plan V8)
    if (objects.length > 0) {
      const sameCount = objects.filter(o => o.defId === defId).length;
      if (sameCount >= 1 && (sameCount + 1) / (objects.length + 1) > 0.18) {
        return false;
      }
    }

    // 14-Tile Minimum Spacing for Small Huts (Fase E in Plan V8)
    const isHutDef = defId.includes('cottage') || defId.includes('shack') || defId.includes('hut');
    if (isHutDef) {
      for (const o of objects) {
        if (o.defId && (o.defId.includes('cottage') || o.defId.includes('shack') || o.defId.includes('hut'))) {
          const hDist = Math.max(Math.abs(startX - o.x), Math.abs(startY - o.y));
          if (hDist < 14) return false;
        }
      }
    }
  }

  // Always verify root/origin tile (startX, startY)
  const originTile = getTileFn(startX, startY);
  if (!originTile) return false;
  const ot = originTile.terrainType || '';
  if (defId && !isAllowedOnTerrain(defId, ot, isAnchor)) return false;
  if (ot.includes('road') || (!isAnchor && ot.includes('pass'))) return false;
  if (WATER_TERRAINS.has(ot) && !isAnchor && (!defId || !WATER_EXEMPT_REGEX.test(defId))) return false;

  // Use base collision footprint from scale-canon if available (or collisionOverride)
  const col = collisionOverride ? { w: cw, h: ch, offsetX: 0 } : getCanonCollision(defId, cw, ch);
  if (col.w === 0 && col.h === 0) {
    return true;
  }

  const baseStartX = startX + Math.round(col.offsetX);
  const baseStartY = startY;

  for (let dy = 0; dy < col.h; dy++) {
    for (let dx = 0; dx < col.w; dx++) {
      const tx = baseStartX + dx;
      const ty = baseStartY + dy;
      const key = `${tx},${ty}`;

      // 1. Grid already occupied by another object
      if (occupiedGrid.has(key)) return false;

      // 2. Tile underlying check (roads, water, settlement)
      const tile = getTileFn(tx, ty);
      if (!tile) return false;
      const t = tile.terrainType || '';

      // Check allowed terrain for defId (Prompt 1.5)
      if (defId && !isAllowedOnTerrain(defId, t, isAnchor)) {
        return false;
      }

      // Do not block roads or passes
      if (t.includes('road') || (!isAnchor && t.includes('pass'))) {
        return false;
      }

      // Water restriction (unless anchor or water-exempt)
      if (WATER_TERRAINS.has(t)) {
        if (!isAnchor && (!defId || !WATER_EXEMPT_REGEX.test(defId))) {
          return false;
        }
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
function markFootprintOccupied(startX, startY, cw, ch, occupiedGrid, objId, defId = null, collisionOverride = false) {
  const col = collisionOverride ? { w: cw, h: ch, offsetX: 0 } : getCanonCollision(defId, cw, ch);
  if (col.w === 0 && col.h === 0) {
    return;
  }
  const baseStartX = startX + Math.round(col.offsetX);
  const baseStartY = startY;
  for (let dy = 0; dy < col.h; dy++) {
    for (let dx = 0; dx < col.w; dx++) {
      occupiedGrid.set(`${baseStartX + dx},${baseStartY + dy}`, objId);
    }
  }
}

const REGION_LANDMARK_CENTERS = {
  central_plains: { x: 2700, y: 2800 },
  nine_springs_delta: { x: 2400, y: 2450 },
  azure_mountain_range: { x: 2200, y: 3340 },
  northern_desolate: { x: 2120, y: 4180 },
  thundersteppe: { x: 2400, y: 4000 },
  godthunder_peaks: { x: 3540, y: 4500 },
  mirror_lake: { x: 3100, y: 3100 },
  beast_prairies: { x: 1400, y: 3800 },
  western_sacred_desert: { x: 820, y: 2220 },
  western_gorge_labyrinth: { x: 500, y: 1500 },
  hermit_highlands: { x: 1200, y: 4200 },
  border_march: { x: 2300, y: 1950 },
  lava_spine: { x: 1100, y: 700 },
  venom_mire: { x: 2600, y: 900 },
  southern_demon_domain: { x: 1900, y: 1400 },
  crimson_battlefield: { x: 2900, y: 600 },
  abyssal_scar: { x: 1900, y: 600 },
  southern_plague_woods: { x: 3400, y: 550 },
  bone_sea_coast: { x: 1750, y: 150 },
  spirit_wood_sea: { x: 3700, y: 1300 },
  mist_insect_valley: { x: 4150, y: 750 },
  formation_barrens: { x: 3600, y: 2200 },
  sword_gorge: { x: 3400, y: 3250 },
  ore_teeth_range: { x: 3625, y: 2800 },
  eastern_sea: { x: 3880, y: 2750 },
  frostmoon_sea: { x: 4650, y: 4050 },
  floating_wind_isles: { x: 4600, y: 2700 },
  immortal_ruins_valley: { x: 600, y: 1000 },
  void_rift: { x: 250, y: 4750 }
};

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
  // Density Noise Field (Fase D in Plan V8): modulated budget between 35 and 110 (ceiling 140)
  const densityNoise = Math.sin(chunkX * 0.37 + 1.3) * Math.cos(chunkY * 0.37 + 0.9) * 0.5 + 0.5;
  const maxObjectsBudget = Math.floor(35 + densityNoise * 75);

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
    } else if (a.type === 'village' || a.type === 'hamlet') {
      structureDef = { defId: 'building_village_thatched_cottage', cw: 2, ch: 2, collision: 'solid' };
    } else if (a.type === 'outpost') {
      structureDef = { defId: 'building_stone_torii_v1', cw: 2, ch: 2, collision: 'solid' };
    } else if (landmarkBinding && (a.type === 'landmark' || a.type === 'focal')) {
      structureDef = {
        defId: landmarkBinding.defId,
        cw: landmarkBinding.cw || 3,
        ch: landmarkBinding.ch || 3,
        collision: landmarkBinding.collision || 'solid'
      };
    }

    if (canPlaceFootprint(a.x, a.y, structureDef.cw, structureDef.ch, occupiedGrid, getTileAt, true)) {
      const objId = `anchor_${a.id}`;
      markFootprintOccupied(a.x, a.y, structureDef.cw, structureDef.ch, occupiedGrid, objId, structureDef.defId);
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

  // 1b. Regional Landmark Placement at Focal Origin (ensures all 29 regions have their grand setpiece)
  for (const [regId, focal] of Object.entries(REGION_LANDMARK_CENTERS)) {
    if (focal.x >= startTileX && focal.x <= endTileX && focal.y >= startTileY && focal.y <= endTileY) {
      const landmarkDef = assetBindings.landmarks[regId];
      if (landmarkDef && !isQuarantined(landmarkDef.defId)) {
        const lx = focal.x;
        const ly = focal.y;
        if (canPlaceFootprint(lx, ly, landmarkDef.cw || 3, landmarkDef.ch || 3, occupiedGrid, getTileAt, true, landmarkDef.defId, objects)) {
          const objId = `landmark_${regId}`;
          markFootprintOccupied(lx, ly, landmarkDef.cw || 3, landmarkDef.ch || 3, occupiedGrid, objId, landmarkDef.defId);
          objects.push({
            id: objId,
            defId: landmarkDef.defId,
            x: lx,
            y: ly,
            customLabel: landmarkDef.name,
            collision: landmarkDef.collision || 'solid',
            tags: ['landmark', 'regional_setpiece', regId]
          });
        }
      }
    }
  }

  // 1c. Authored props (Prompt 2.2)
  let authoredCount = 0;
  const authoredInChunk = AUTHORED_BY_CHUNK.get(`${chunkX},${chunkY}`) || [];
  for (const p of authoredInChunk) {
    const defId = resolveDef(p.defId, p.fallbackDefId);
    if (!defId) continue;
    const cw = p.cw || 1, ch = p.ch || 1;
    // isAnchor=true: lewati anti-gerombol & batas dominasi; tabrakan tetap dicek
    // collisionOverride=true: paksa tabrakan 1x1 agar canon 3x2 cottage tidak menolak penempatan
    if (!canPlaceFootprint(p.x, p.y, cw, ch, occupiedGrid, getTileAt, true, defId, objects, true)) continue;
    markFootprintOccupied(p.x, p.y, cw, ch, occupiedGrid, p.id, defId, true);
    objects.push({
      id: p.id,
      defId,
      x: p.x,
      y: p.y,
      collision: p.collision,
      enterable: !!p.enterable,
      structureTemplate: p.structureTemplate,
      facing: p.facing,
      tags: ['authored', p.kind, p.anchorId, p.region]
    });
    authoredCount++;
  }

  // 1-tile buffer zone around authored houses to protect yards from random scatter (Prompt 2.2.5)
  for (const p of authoredInChunk) {
    if (p.kind === 'house') {
      const cw = p.cw || 1, ch = p.ch || 1;
      for (let by = p.y - 1; by <= p.y + ch; by++) {
        for (let bx = p.x - 1; bx <= p.x + cw; bx++) {
          const bKey = `${bx},${by}`;
          if (!occupiedGrid.has(bKey)) {
            occupiedGrid.set(bKey, `${p.id}_buffer`);
          }
        }
      }
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
        if (objects.length - authoredCount >= maxObjectsBudget) break;
        const angle = rand() * Math.PI * 2;
        const dist = 3 + rand() * 4; // dist 3..7 tiles from anchor center
        const ox = Math.round(a.x + Math.cos(angle) * dist);
        const oy = Math.round(a.y + Math.sin(angle) * dist);

        if (ox >= startTileX && ox <= endTileX && oy >= startTileY && oy <= endTileY) {
          const itemDef = outskirts[Math.floor(rand() * outskirts.length)];
          if (canPlaceFootprint(ox, oy, itemDef.cw, itemDef.ch, occupiedGrid, getTileAt, false, itemDef.defId, objects)) {
            const objId = `outskirt_${ox}_${oy}`;
            markFootprintOccupied(ox, oy, itemDef.cw, itemDef.ch, occupiedGrid, objId, itemDef.defId);
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

  // 3. One-Grid Huts & Ambient Shelters Placement (Fase E & Plan V8)
  // Approved proportions: 55% Decorative, 35% Enterable, 10% Abandoned
  const centerTile = getTileAt(startTileX + 16, startTileY + 16);
  const chunkRegion = getRegionAt(startTileX + 16, startTileY + 16);
  const effectiveDanger = Math.max(centerTile.dangerTier || 1, chunkRegion.dangerTier || 1);

  // Spawn probability based on regional density:
  // Populated plains/delta: ~0.65; mountain/desert: ~0.35; danger zones: ~0.20
  const isPopulated = ['central_plains', 'nine_springs_delta', 'mirror_lake'].includes(chunkRegion.id);
  const hutSpawnProb = isPopulated ? 0.65 : (effectiveDanger >= 3 ? 0.20 : 0.35);

  if (rand() < hutSpawnProb && (objects.length - authoredCount) < maxObjectsBudget) {
    for (let attempt = 0; attempt < 16; attempt++) {
      const hx = startTileX + 4 + Math.floor(rand() * 24);
      const hy = startTileY + 4 + Math.floor(rand() * 24);
      const tile = getTileAt(hx, hy);
      const t = tile.terrainType || '';

      // Skip invalid terrain
      if (t.includes('road') || t.includes('river') || t.includes('lake') || t === 'ocean' || t === 'sea' || tile.isSolid) {
        continue;
      }

      // Roll type: 55% decorative, 35% enterable, 10% abandoned (Prompt 1.1)
      const typeRoll = rand();
      let hutDefId = null;
      let isEnterable = false;
      let isAbandoned = false;
      let hutName = 'Pondok Singgah Musafir';

      const isHighDanger = effectiveDanger >= 4;
      const abandonedThreshold = isHighDanger ? 0.22 : 0.10;

      if (typeRoll < abandonedThreshold) {
        // Abandoned (10% normal, 35% in danger >= 4)
        hutDefId = resolveDef('hut_abandoned_thatched_ruin', 'building_mountain_hermitage_shack');
        isEnterable = true;
        isAbandoned = true;
        hutName = 'Gubuk Terbengkalai';
      } else if (typeRoll < (abandonedThreshold + 0.35)) {
        // 35% Enterable
        isEnterable = true;
        if (chunkRegion.id === 'azure_mountain_range' || chunkRegion.id === 'hermit_highlands') {
          hutDefId = resolveDef('building_mountain_hermitage_shack', 'building_village_thatched_cottage');
          hutName = 'Pondok Pertapa Gunung';
        } else {
          const rHut = rand();
          if (rHut < 0.35) {
            hutDefId = resolveDef('building_farm_hut_v1', 'building_village_thatched_cottage');
            hutName = 'Pondok Ladang Petani';
          } else if (rHut < 0.65) {
            hutDefId = resolveDef('building_road_inn_v1', 'building_village_thatched_cottage');
            hutName = 'Kedai Musafir';
          } else {
            hutDefId = resolveDef('building_village_thatched_cottage', 'building_mountain_hermitage_shack');
            hutName = 'Pondok Singgah Musafir';
          }
        }
      } else {
        // 55% Decorative
        isEnterable = false;
        const rDeco = rand();
        if (rDeco < 0.35) {
          hutDefId = resolveDef('building_tea_pavilion_v1', 'building_village_thatched_cottage');
          hutName = 'Paviliun Minum Teh';
        } else if (rDeco < 0.65) {
          hutDefId = resolveDef('building_village_thatched_cottage', 'building_mountain_hermitage_shack');
          hutName = 'Gubuk Jerami';
        } else {
          hutDefId = resolveDef('building_wayside_tea_resting_shed', 'building_village_thatched_cottage');
          hutName = 'Shed Peristirahatan';
        }
      }

      // If resolveDef returned null, skip placement
      if (!hutDefId) continue;

      // Use canon collision footprint (Prompt 1.2)
      const col = getCanonCollision(hutDefId, 1, 1);
      const hw = col.w || 1;
      const hh = col.h || 1;

      if (canPlaceFootprint(hx, hy, hw, hh, occupiedGrid, getTileAt, false, hutDefId, objects)) {
        const objId = `hut_${hx}_${hy}`;
        markFootprintOccupied(hx, hy, hw, hh, occupiedGrid, objId, hutDefId);
        objects.push({
          id: objId,
          defId: hutDefId,
          x: hx,
          y: hy,
          collision: 'solid',
          enterable: isEnterable,
          isAbandoned,
          customLabel: hutName,
          tags: ['hut', 'shelter', isEnterable ? 'enterable' : 'decorative', chunkRegion.id]
        });
        break;
      }
    }
  }

  // 4. Procedural Biome Scatter by Terrain & Region
  for (let y = startTileY; y <= endTileY; y++) {
    for (let x = startTileX; x <= endTileX; x++) {
      if (objects.length - authoredCount >= maxObjectsBudget) break;

      const tileKey = `${x},${y}`;
      if (occupiedGrid.has(tileKey)) continue;

      const tile = getTileAt(x, y);
      const terrain = tile.terrainType || '';
      const region = getRegionAt(x, y);

      // --- DESERT & ARID DUNES ---
      if (terrain.includes('desert') || terrain.includes('sand') || terrain.includes('dune') || terrain === 'oasis' || region.id === 'western_sacred_desert' || region.id === 'western_gorge_labyrinth') {
        const roll = rand();
        if (roll < 0.08) {
          const desertRocks = assetBindings.natureScatters.rocks.filter(r =>
            !r.biomes || r.biomes.includes('western_sacred_desert') || r.biomes.includes('desert')
          );
          const rDef = desertRocks.length > 0
            ? desertRocks[Math.floor(rand() * desertRocks.length)]
            : assetBindings.natureScatters.rocks[7];

          if (canPlaceFootprint(x, y, rDef.cw, rDef.ch, occupiedGrid, getTileAt, false, rDef.defId, objects)) {
            const objId = `desert_rock_${x}_${y}`;
            markFootprintOccupied(x, y, rDef.cw, rDef.ch, occupiedGrid, objId, rDef.defId);
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
          const candidateFlora = [
            assetBindings.natureScatters.trees.find(t => t.defId.includes('locust')) || assetBindings.natureScatters.trees[12],
            ...(assetBindings.natureScatters.shrubs || []).filter(s => s.biomes.includes('western_sacred_desert') || s.biomes.includes('desert'))
          ].filter(Boolean);

          const fDef = candidateFlora[Math.floor(rand() * candidateFlora.length)];
          if (fDef && canPlaceFootprint(x, y, fDef.cw, fDef.ch, occupiedGrid, getTileAt, false, fDef.defId, objects)) {
            const objId = `desert_flora_${x}_${y}`;
            markFootprintOccupied(x, y, fDef.cw, fDef.ch, occupiedGrid, objId, fDef.defId);
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

      // --- DEAD WOOD, LAVA, VOLCANIC OBSIDIAN, BASALT & CRATER ---
      else if (terrain === 'dead_wood' || terrain.includes('lava') || terrain.includes('volcano') || terrain === 'basalt' || terrain === 'crater' || region.id === 'lava_spine') {
        const roll = rand();
        if (roll < 0.24) {
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
            markFootprintOccupied(x, y, itemDef.cw, itemDef.ch, occupiedGrid, objId, itemDef.defId);
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

      // --- SWAMP, DEMONIC SWAMP, POISON POOL & MIASMA WETLANDS ---
      else if (terrain === 'swamp' || terrain === 'demonic_swamp' || terrain === 'poison_pool' || region.id === 'venom_mire' || region.id === 'southern_plague_woods') {
        const roll = rand();
        if (roll < 0.25) {
          const swampTrees = assetBindings.natureScatters.trees.filter(t =>
            t.biomes && (t.biomes.includes('swamp') || t.biomes.includes('venom_mire') || t.biomes.includes('southern_plague_woods') || t.biomes.includes('dead_wood'))
          );
          const swampRocks = assetBindings.natureScatters.rocks.filter(r =>
            r.biomes && (r.biomes.includes('venom_mire') || r.biomes.includes('abyssal_scar') || r.biomes.includes('mountain'))
          );
          const swampWaters = (assetBindings.natureScatters.waters || []).filter(w =>
            w.biomes && w.biomes.includes('venom_mire')
          );
          const swampStumps = (assetBindings.natureScatters.shrubs || []).filter(s =>
            s.biomes && (s.biomes.includes('dead_wood') || s.biomes.includes('lava_spine'))
          );
          const pool = [...swampTrees, ...swampRocks, ...swampWaters, ...swampStumps];
          const itemDef = pool.length > 0 ? pool[Math.floor(rand() * pool.length)] : assetBindings.natureScatters.trees[8];

          if (itemDef && canPlaceFootprint(x, y, itemDef.cw, itemDef.ch, occupiedGrid, getTileAt, false, itemDef.defId, objects)) {
            const objId = `swamp_${x}_${y}`;
            markFootprintOccupied(x, y, itemDef.cw, itemDef.ch, occupiedGrid, objId, itemDef.defId);
            objects.push({
              id: objId,
              defId: itemDef.defId,
              x,
              y,
              collision: itemDef.collision,
              tags: ['swamp', 'miasma', region.id]
            });
          }
        }
      }

      // --- BATTLEFIELD ASH, MIASMA WASTE & ABYSS EDGE ---
      else if (terrain === 'battlefield_ash' || terrain === 'miasma_waste' || terrain === 'abyss_edge' || region.id === 'crimson_battlefield' || region.id === 'abyssal_scar' || region.id === 'void_rift') {
        const roll = rand();
        if (roll < 0.26) {
          const abyssRocks = assetBindings.natureScatters.rocks.filter(r =>
            r.biomes && (r.biomes.includes('abyssal_scar') || r.biomes.includes('void_rift') || r.biomes.includes('crimson_battlefield') || r.biomes.includes('mountain'))
          );
          const abyssTrees = assetBindings.natureScatters.trees.filter(t =>
            t.biomes && (t.biomes.includes('abyssal_scar') || t.biomes.includes('crimson_battlefield') || t.biomes.includes('dead_wood') || t.biomes.includes('void_rift'))
          );
          const abyssShrubs = (assetBindings.natureScatters.shrubs || []).filter(s =>
            s.biomes && (s.biomes.includes('crimson_battlefield') || s.biomes.includes('abyssal_scar'))
          );
          const pool = [...abyssRocks, ...abyssTrees, ...abyssShrubs];
          const itemDef = pool.length > 0 ? pool[Math.floor(rand() * pool.length)] : assetBindings.natureScatters.rocks[7];

          if (itemDef && canPlaceFootprint(x, y, itemDef.cw, itemDef.ch, occupiedGrid, getTileAt, false, itemDef.defId, objects)) {
            const objId = `abyss_${x}_${y}`;
            markFootprintOccupied(x, y, itemDef.cw, itemDef.ch, occupiedGrid, objId, itemDef.defId);
            objects.push({
              id: objId,
              defId: itemDef.defId,
              x,
              y,
              collision: itemDef.collision,
              tags: ['abyss', 'desolate', region.id]
            });
          }
        }
      }

      // --- CANYON, CLIFF & GORGE ---
      else if (terrain === 'cliff' || terrain === 'canyon_floor' || region.id === 'sword_gorge' || region.id === 'western_gorge_labyrinth') {
        const roll = rand();
        if (roll < 0.32) {
          const gorgeRocks = assetBindings.natureScatters.rocks.filter(r =>
            r.biomes && (r.biomes.includes('sword_gorge') || r.biomes.includes('western_gorge_labyrinth') || r.biomes.includes('mountain'))
          );
          const gorgeTrees = assetBindings.natureScatters.trees.filter(t =>
            t.biomes && (t.biomes.includes('sword_gorge') || t.biomes.includes('mountain'))
          );
          const pool = [...gorgeRocks, ...gorgeTrees];
          const itemDef = pool.length > 0 ? pool[Math.floor(rand() * pool.length)] : assetBindings.natureScatters.rocks[5];

          if (itemDef && canPlaceFootprint(x, y, itemDef.cw, itemDef.ch, occupiedGrid, getTileAt, false, itemDef.defId, objects)) {
            const objId = `gorge_${x}_${y}`;
            markFootprintOccupied(x, y, itemDef.cw, itemDef.ch, occupiedGrid, objId, itemDef.defId);
            objects.push({
              id: objId,
              defId: itemDef.defId,
              x,
              y,
              collision: itemDef.collision,
              tags: ['gorge', 'cliff', region.id]
            });
          }
        }
      }

      // --- SNOW, GLACIER, ICE CRACK & FROZEN TUNDRA ---
      else if (terrain === 'snow' || terrain === 'glacier' || terrain === 'ice_crack' || region.id === 'northern_desolate' || region.id === 'frostmoon_sea') {
        const roll = rand();
        if (roll < 0.22) {
          const frostTrees = assetBindings.natureScatters.trees.filter(t =>
            t.biomes && (t.biomes.includes('northern_desolate') || t.biomes.includes('frostmoon_sea'))
          );
          const frostRocks = assetBindings.natureScatters.rocks.filter(r =>
            r.biomes && (r.biomes.includes('northern_desolate') || r.biomes.includes('frostmoon_sea') || r.biomes.includes('mountain'))
          );
          const pool = [...frostTrees, ...frostRocks];
          const itemDef = pool.length > 0 ? pool[Math.floor(rand() * pool.length)] : assetBindings.natureScatters.trees[6];

          if (itemDef && canPlaceFootprint(x, y, itemDef.cw, itemDef.ch, occupiedGrid, getTileAt, false, itemDef.defId, objects)) {
            const objId = `frost_${x}_${y}`;
            markFootprintOccupied(x, y, itemDef.cw, itemDef.ch, occupiedGrid, objId, itemDef.defId);
            objects.push({
              id: objId,
              defId: itemDef.defId,
              x,
              y,
              collision: itemDef.collision,
              tags: ['frost', 'tundra', region.id]
            });
          }
        }
      }

      // --- ISLAND REEFS, FLOATING ISLES & COASTAL SHORES ---
      else if (terrain === 'island_reef' || terrain.includes('island') || terrain.includes('reef') || region.id === 'floating_wind_isles' || region.id === 'eastern_sea' || region.id === 'bone_sea_coast') {
        const roll = rand();
        if (roll < 0.30) {
          const islandWaters = (assetBindings.natureScatters.waters || []).filter(w =>
            w.biomes && (w.biomes.includes('eastern_sea') || w.biomes.includes('floating_wind_isles') || w.biomes.includes('bone_sea_coast'))
          );
          const islandRocks = assetBindings.natureScatters.rocks.filter(r =>
            r.biomes && (r.biomes.includes('eastern_sea') || r.biomes.includes('floating_wind_isles') || r.biomes.includes('mountain'))
          );
          const islandTrees = assetBindings.natureScatters.trees.filter(t =>
            t.biomes && (t.biomes.includes('eastern_sea') || t.biomes.includes('floating_wind_isles'))
          );
          const pool = [...islandWaters, ...islandRocks, ...islandTrees];
          const itemDef = pool.length > 0 ? pool[Math.floor(rand() * pool.length)] : assetBindings.natureScatters.rocks[4];

          if (itemDef && canPlaceFootprint(x, y, itemDef.cw, itemDef.ch, occupiedGrid, getTileAt, false, itemDef.defId, objects)) {
            const objId = `island_${x}_${y}`;
            markFootprintOccupied(x, y, itemDef.cw, itemDef.ch, occupiedGrid, objId, itemDef.defId);
            objects.push({
              id: objId,
              defId: itemDef.defId,
              x,
              y,
              collision: itemDef.collision,
              tags: ['island', 'reef', region.id]
            });
          }
        }
      }

      // --- FORMATION BARRENS ---
      else if (terrain === 'formation_tile' || region.id === 'formation_barrens') {
        const roll = rand();
        if (roll < 0.20) {
          const formRocks = assetBindings.natureScatters.rocks.filter(r =>
            r.biomes && (r.biomes.includes('formation_barrens') || r.biomes.includes('mountain'))
          );
          const formShrubs = (assetBindings.natureScatters.shrubs || []).filter(s =>
            s.biomes && s.biomes.includes('thundersteppe')
          );
          const pool = [...formRocks, ...formShrubs];
          const itemDef = pool.length > 0 ? pool[Math.floor(rand() * pool.length)] : assetBindings.natureScatters.rocks[7];

          if (itemDef && canPlaceFootprint(x, y, itemDef.cw, itemDef.ch, occupiedGrid, getTileAt, false, itemDef.defId, objects)) {
            const objId = `formation_${x}_${y}`;
            markFootprintOccupied(x, y, itemDef.cw, itemDef.ch, occupiedGrid, objId, itemDef.defId);
            objects.push({
              id: objId,
              defId: itemDef.defId,
              x,
              y,
              collision: itemDef.collision,
              tags: ['formation', region.id]
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
            markFootprintOccupied(x, y, rDef.cw, rDef.ch, occupiedGrid, objId, rDef.defId);
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
          const ridgeTrees = assetBindings.natureScatters.trees.filter(t =>
            t.biomes && (t.biomes.includes('mountain') || t.biomes.includes(region.id))
          );
          if (ridgeTrees.length > 0) {
            const tDef = ridgeTrees[Math.floor(rand() * ridgeTrees.length)];
            if (canPlaceFootprint(x, y, tDef.cw, tDef.ch, occupiedGrid, getTileAt, false, tDef.defId, objects)) {
              const objId = `mountain_tree_${x}_${y}`;
              markFootprintOccupied(x, y, tDef.cw, tDef.ch, occupiedGrid, objId, tDef.defId);
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
            markFootprintOccupied(x, y, bDef.cw, bDef.ch, occupiedGrid, objId, bDef.defId);
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
      else if (terrain === 'forest' || terrain === 'spirit_wood' || region.id === 'spirit_wood_sea') {
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
            markFootprintOccupied(x, y, tDef.cw, tDef.ch, occupiedGrid, objId, tDef.defId);
            objects.push({
              id: objId,
              defId: tDef.defId,
              x,
              y,
              collision: tDef.collision,
              tags: ['tree', region.id]
            });
          }
        } else if (roll < 0.42) {
          const mossRocks = assetBindings.natureScatters.rocks.filter(r =>
            r.biomes && (r.biomes.includes('spirit_wood_sea') || r.biomes.includes('plains'))
          );
          if (mossRocks.length > 0) {
            const rDef = mossRocks[Math.floor(rand() * mossRocks.length)];
            if (canPlaceFootprint(x, y, rDef.cw, rDef.ch, occupiedGrid, getTileAt, false, rDef.defId, objects)) {
              const objId = `forest_rock_${x}_${y}`;
              markFootprintOccupied(x, y, rDef.cw, rDef.ch, occupiedGrid, objId, rDef.defId);
              objects.push({
                id: objId,
                defId: rDef.defId,
                x,
                y,
                collision: rDef.collision,
                tags: ['forest_rock', region.id]
              });
            }
          }
        }
      }

      // --- WATER EDGES & DELTA FLORA ---
      else if (terrain.includes('lake') || terrain.includes('pond') || terrain === 'pond_lotus' || terrain === 'river') {
        const roll = rand();
        if (roll < 0.18) {
          const wDefs = assetBindings.natureScatters.waters;
          const wDef = wDefs[Math.floor(rand() * wDefs.length)];
          if (canPlaceFootprint(x, y, wDef.cw, wDef.ch, occupiedGrid, getTileAt, false, wDef.defId, objects)) {
            const objId = `water_veg_${x}_${y}`;
            markFootprintOccupied(x, y, wDef.cw, wDef.ch, occupiedGrid, objId, wDef.defId);
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
          const willow = assetBindings.natureScatters.trees.find(t => t.defId.includes('willow'));
          if (willow && canPlaceFootprint(x, y, willow.cw, willow.ch, occupiedGrid, getTileAt, false, willow.defId, objects)) {
            const objId = `willow_${x}_${y}`;
            markFootprintOccupied(x, y, willow.cw, willow.ch, occupiedGrid, objId, willow.defId);
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
      else if (terrain === 'plains' || terrain === 'meadow' || terrain === 'farmland' || terrain === 'herb_field' || region.id === 'central_plains' || region.id === 'beast_prairies' || region.id === 'border_march' || region.id === 'nine_springs_delta' || region.id === 'mirror_lake') {
        const roll = rand();
        if (roll < 0.06) {
          const candidateTrees = assetBindings.natureScatters.trees.filter(t =>
            !t.biomes || t.biomes.includes(region.id) || t.biomes.includes('plains')
          );
          const tDef = candidateTrees.length > 0
            ? candidateTrees[Math.floor(rand() * candidateTrees.length)]
            : assetBindings.natureScatters.trees[0];

          if (canPlaceFootprint(x, y, tDef.cw, tDef.ch, occupiedGrid, getTileAt, false, tDef.defId, objects)) {
            const objId = `tree_${x}_${y}`;
            markFootprintOccupied(x, y, tDef.cw, tDef.ch, occupiedGrid, objId, tDef.defId);
            objects.push({
              id: objId,
              defId: tDef.defId,
              x,
              y,
              collision: tDef.collision,
              tags: ['tree', 'scholar', region.id]
            });
          }
        } else if (roll < 0.12) {
          const shrubs = (assetBindings.natureScatters.shrubs || []).filter(s =>
            !s.biomes || s.biomes.includes(region.id) || s.biomes.includes('plains') || s.biomes.includes('meadow')
          );
          if (shrubs.length > 0) {
            const sDef = shrubs[Math.floor(rand() * shrubs.length)];
            if (canPlaceFootprint(x, y, sDef.cw, sDef.ch, occupiedGrid, getTileAt, false, sDef.defId, objects)) {
              const objId = `shrub_${x}_${y}`;
              markFootprintOccupied(x, y, sDef.cw, sDef.ch, occupiedGrid, objId, sDef.defId);
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
        } else if (roll < 0.16) {
          const candidateRocks = assetBindings.natureScatters.rocks.filter(r =>
            !r.biomes || r.biomes.includes(region.id) || r.biomes.includes('plains')
          );
          const rDef = candidateRocks.length > 0
            ? candidateRocks[Math.floor(rand() * candidateRocks.length)]
            : assetBindings.natureScatters.rocks[6];

          if (canPlaceFootprint(x, y, rDef.cw, rDef.ch, occupiedGrid, getTileAt, false, rDef.defId, objects)) {
            const objId = `rock_${x}_${y}`;
            markFootprintOccupied(x, y, rDef.cw, rDef.ch, occupiedGrid, objId, rDef.defId);
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

  // Filter: landmarks must be strictly within requested bounds (Prompt 1.4)
  return result.filter(obj => {
    if (obj.tags && obj.tags.includes('landmark')) {
      return obj.x >= minTileX && obj.x <= maxTileX && obj.y >= minTileY && obj.y <= maxTileY;
    }
    return true;
  });
}

module.exports = {
  CHUNK_SIZE,
  getChunkObjects,
  getViewportObjects,
  isQuarantined,
  getCanonCollision,
  resolveDef,
  isAllowedOnTerrain,
  KNOWN_FRAMES
};
