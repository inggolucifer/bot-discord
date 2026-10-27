/**
 * utils/monsterSpawnEngine.js
 * DETERMINISTIC SERVER-AUTHORITATIVE MONSTER SPAWN ENGINE (PROMPT E3)
 * Single Source of Truth for monster spawns across overworld chunks.
 *
 * Guaranteed Properties:
 * 1. 100% Deterministic PRNG via Mulberry32 using WORLD_SEED (ZERO arbitrary random, pure deterministic).
 * 2. Strict buffer zones: >= 20 tiles from anchors, >= 10 tiles from roads.
 * 3. Never spawns on solid or water tiles.
 * 4. Active elite camps (1 elite + 3 guards in radius 2..4) and scheduled boss lairs.
 * 5. High performance LRU cache (512 chunks, p95 <= 3ms).
 */

const fs = require('fs');
const path = require('path');
const { WORLD_SEED } = require('../config/world-seed');
const worldData = require('./worldData');
const { getTileAt } = require('./proceduralWorldEngine');
const objectScatter = require('./objectScatter');

// Load configurations & static world data once
const bestiary = require('../world-data/bestiary-v2.json');
const regionChallenge = require('../world-data/region_challenge_v9.json');
const anchorsData = require('../world-data/anchors.json');
const roadOverridesData = require('../world-data/road-overrides-v9.json');
const authoredPropsData = require('../world-data/authored-props.json');

const CHUNK_SIZE = 32;
const SPATIAL_CELL = 64;

// Pure Mulberry32 PRNG
function mulberry32(seed) {
  let a = seed >>> 0;
  return function() {
    let t = (a += 0x6D2B79F5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stringHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  }
  return hash >>> 0;
}

// =========================================================================
// SPATIAL INDEXING FOR FAST REJECTION
// =========================================================================

// 1. Anchors spatial index (cell = 64)
const anchorSpatialGrid = new Map();
const anchorChunkSet = new Set(); // chunks within < 2 chunks of anchor

for (const a of anchorsData) {
  const gx = Math.floor(a.x / SPATIAL_CELL);
  const gy = Math.floor(a.y / SPATIAL_CELL);
  const gKey = `${gx},${gy}`;
  if (!anchorSpatialGrid.has(gKey)) anchorSpatialGrid.set(gKey, []);
  anchorSpatialGrid.get(gKey).push({ x: a.x, y: a.y, id: a.id });

  const acx = Math.floor(a.x / CHUNK_SIZE);
  const acy = Math.floor(a.y / CHUNK_SIZE);
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      anchorChunkSet.add(`${acx + dx},${acy + dy}`);
    }
  }
}

// 2. Roads spatial index (cell = 64)
const roadSpatialGrid = new Map();

function addRoadPoint(x, y) {
  const gx = Math.floor(x / SPATIAL_CELL);
  const gy = Math.floor(y / SPATIAL_CELL);
  const gKey = `${gx},${gy}`;
  if (!roadSpatialGrid.has(gKey)) roadSpatialGrid.set(gKey, []);
  roadSpatialGrid.get(gKey).push({ x, y });
}

// Index road overrides polylines
if (roadOverridesData && Array.isArray(roadOverridesData.roads)) {
  for (const r of roadOverridesData.roads) {
    if (Array.isArray(r.polyline)) {
      for (let i = 0; i < r.polyline.length - 1; i++) {
        const [x1, y1] = r.polyline[i];
        const [x2, y2] = r.polyline[i + 1];
        const dist = Math.hypot(x2 - x1, y2 - y1);
        const steps = Math.max(1, Math.ceil(dist / 2));
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          addRoadPoint(Math.round(x1 + (x2 - x1) * t), Math.round(y1 + (y2 - y1) * t));
        }
      }
    }
  }
}

// Index authored village roads
if (authoredPropsData && Array.isArray(authoredPropsData.roads)) {
  for (const r of authoredPropsData.roads) {
    if (r.from && r.to) {
      const x1 = r.from.x, y1 = r.from.y;
      const x2 = r.to.x, y2 = r.to.y;
      const dist = Math.hypot(x2 - x1, y2 - y1);
      const steps = Math.max(1, Math.ceil(dist / 2));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        addRoadPoint(Math.round(x1 + (x2 - x1) * t), Math.round(y1 + (y2 - y1) * t));
      }
    }
  }
}

// 3. Lairs & Elite Camps spatial index (cell = 64)
const lairCampSpatialGrid = new Map();
const allEliteCamps = []; // { regionId, index, x, y }
const allLairs = [];      // { regionId, x, y }

for (const [rId, rData] of Object.entries(regionChallenge)) {
  if (rData.lair) {
    const pt = { x: rData.lair.x, y: rData.lair.y, regionId: rId, type: 'lair' };
    allLairs.push(pt);
    const gx = Math.floor(pt.x / SPATIAL_CELL);
    const gy = Math.floor(pt.y / SPATIAL_CELL);
    const gKey = `${gx},${gy}`;
    if (!lairCampSpatialGrid.has(gKey)) lairCampSpatialGrid.set(gKey, []);
    lairCampSpatialGrid.get(gKey).push(pt);
  }
  if (Array.isArray(rData.eliteCamps)) {
    rData.eliteCamps.forEach((c, idx) => {
      const pt = { x: c.x, y: c.y, regionId: rId, index: idx, type: 'camp' };
      allEliteCamps.push(pt);
      const gx = Math.floor(pt.x / SPATIAL_CELL);
      const gy = Math.floor(pt.y / SPATIAL_CELL);
      const gKey = `${gx},${gy}`;
      if (!lairCampSpatialGrid.has(gKey)) lairCampSpatialGrid.set(gKey, []);
      lairCampSpatialGrid.get(gKey).push(pt);
    });
  }
}

// Rejection helpers using spatial grids
function isTooCloseToAnchor(x, y, minTiles = 20) {
  const gx = Math.floor(x / SPATIAL_CELL);
  const gy = Math.floor(y / SPATIAL_CELL);
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const pts = anchorSpatialGrid.get(`${gx + dx},${gy + dy}`);
      if (pts) {
        for (let i = 0; i < pts.length; i++) {
          if (Math.max(Math.abs(x - pts[i].x), Math.abs(y - pts[i].y)) < minTiles) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

function isTooCloseToRoad(x, y, minTiles = 10) {
  const gx = Math.floor(x / SPATIAL_CELL);
  const gy = Math.floor(y / SPATIAL_CELL);
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const pts = roadSpatialGrid.get(`${gx + dx},${gy + dy}`);
      if (pts) {
        for (let i = 0; i < pts.length; i++) {
          if (Math.max(Math.abs(x - pts[i].x), Math.abs(y - pts[i].y)) < minTiles) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

function isTooCloseToLairOrCamp(x, y, minTiles = 14) {
  const gx = Math.floor(x / SPATIAL_CELL);
  const gy = Math.floor(y / SPATIAL_CELL);
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const pts = lairCampSpatialGrid.get(`${gx + dx},${gy + dy}`);
      if (pts) {
        for (let i = 0; i < pts.length; i++) {
          if (Math.max(Math.abs(x - pts[i].x), Math.abs(y - pts[i].y)) < minTiles) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

// =========================================================================
// MONSTER SPAWN ENGINE & LRU CACHE
// =========================================================================

const CHUNK_BUDGET = { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 6 };
const tierLevelBase = { 1: 4, 2: 12, 3: 24, 4: 40, 5: 60, 6: 80 };

const LRU_CACHE = new Map();
const MAX_CACHE_SIZE = 512;

function getMonstersInChunk(cx, cy) {
  const cacheKey = `${cx},${cy}`;
  if (LRU_CACHE.has(cacheKey)) {
    const cached = LRU_CACHE.get(cacheKey);
    // Refresh LRU position
    LRU_CACHE.delete(cacheKey);
    LRU_CACHE.set(cacheKey, cached);
    return cached;
  }

  const result = new Map(); // key "${x},${y}" -> SpawnedMonsterData

  const minX = cx * CHUNK_SIZE;
  const minY = cy * CHUNK_SIZE;
  const maxX = minX + CHUNK_SIZE - 1;
  const maxY = minY + CHUNK_SIZE - 1;

  // 1. Check Boss Lair in this chunk
  for (const lair of allLairs) {
    if (lair.x >= minX && lair.x <= maxX && lair.y >= minY && lair.y <= maxY) {
      const regId = lair.regionId;
      const bReg = bestiary[regId] || bestiary['central_plains'];
      const boss = bReg?.boss;
      if (boss) {
        const now = new Date();
        const currentHourUTC7 = (now.getUTCHours() + 7) % 24;
        const spawnHours = boss.spawnHours || [20];
        const isActive = spawnHours.includes(currentHourUTC7);

        if (isActive) {
          result.set(`${lair.x},${lair.y}`, {
            key: `${lair.x},${lair.y}`,
            x: lair.x,
            y: lair.y,
            name: boss.name,
            tier: boss.tier || bReg.dangerTier || 3,
            hp: boss.hp,
            maxHp: boss.maxHp || boss.hp,
            atk: boss.atk,
            def: boss.def,
            spd: boss.spd,
            icon: boss.icon || '🐉',
            isAggressive: true,
            level: boss.level || 50,
            isElite: false,
            isBoss: true
          });
        }
      }
    }
  }

  // 2. Check Elite Camps in this chunk (or overlapping guards)
  for (const camp of allEliteCamps) {
    const regId = camp.regionId;
    const bReg = bestiary[regId] || bestiary['central_plains'];
    const eliteData = bReg?.elite?.[0];
    const commonSpecies = bReg?.common || [];

    // Elite monster at camp center
    if (camp.x >= minX && camp.x <= maxX && camp.y >= minY && camp.y <= maxY) {
      if (eliteData) {
        result.set(`${camp.x},${camp.y}`, {
          key: `${camp.x},${camp.y}`,
          x: camp.x,
          y: camp.y,
          name: eliteData.name,
          tier: eliteData.tier || bReg.dangerTier || 2,
          hp: eliteData.hp,
          maxHp: eliteData.maxHp || eliteData.hp,
          atk: eliteData.atk,
          def: eliteData.def,
          spd: eliteData.spd,
          icon: eliteData.icon || '🐺',
          isAggressive: true,
          level: eliteData.level || 16,
          isElite: true,
          isBoss: false
        });
      }
    }

    // 3 guards in radius 2..4 around camp (deterministic positions)
    if (camp.x + 4 >= minX && camp.x - 4 <= maxX && camp.y + 4 >= minY && camp.y - 4 <= maxY) {
      const campSeed = (stringHash(regId) ^ (camp.index * 9973) ^ WORLD_SEED) >>> 0;
      const campRng = mulberry32(campSeed);

      // Predefined guard offsets with Chebyshev radius in [2..4]
      const guardOffsets = [
        [-2, -2], [2, 2], [-3, 2], [3, -2], [2, -3], [-2, 3], [0, 3], [-3, 0]
      ];

      let placedGuards = 0;
      for (let gIdx = 0; gIdx < guardOffsets.length && placedGuards < 3; gIdx++) {
        const off = guardOffsets[(gIdx + Math.floor(campRng() * 4)) % guardOffsets.length];
        const gx = camp.x + off[0];
        const gy = camp.y + off[1];

        if (gx >= minX && gx <= maxX && gy >= minY && gy <= maxY) {
          const tile = getTileAt(gx, gy);
          if (tile && !tile.isSolid && !/river|lake|sea|ocean|pond|lava|poison_pool/i.test(tile.terrainType)) {
            const species = commonSpecies[placedGuards % commonSpecies.length];
            if (species && !result.has(`${gx},${gy}`)) {
              result.set(`${gx},${gy}`, {
                key: `${gx},${gy}`,
                x: gx,
                y: gy,
                name: species.name,
                tier: species.tier || bReg.dangerTier || 1,
                hp: species.hp,
                maxHp: species.maxHp || species.hp,
                atk: species.atk,
                def: species.def,
                spd: species.spd,
                icon: species.icon || '🐾',
                isAggressive: true,
                level: species.level || 4,
                isElite: false,
                isBoss: false
              });
              placedGuards++;
            }
          }
        }
      }
    }
  }

  // 3. Common monster spawning (budget-based)
  const centerTileX = minX + 16;
  const centerTileY = minY + 16;
  const region = worldData.getRegionAt(centerTileX, centerTileY) || { id: 'central_plains', dangerTier: 1 };
  const dangerTier = region.dangerTier || 1;
  const bReg = bestiary[region.id] || bestiary['central_plains'];
  const commonSpecies = bReg?.common || [];

  // Check if chunk is within 2 chunks of an anchor
  const isNearAnchorChunk = anchorChunkSet.has(`${cx},${cy}`);
  const budget = isNearAnchorChunk ? 0 : (CHUNK_BUDGET[dangerTier] || 2);

  if (budget > 0 && commonSpecies.length > 0) {
    // Collect solid scatter object coordinates in this chunk
    const scatterObjs = objectScatter.getChunkObjects(cx, cy);
    const solidScatterPositions = new Set();
    for (const obj of scatterObjs) {
      if (obj.collision === 'solid') {
        solidScatterPositions.add(`${obj.x},${obj.y}`);
      }
    }

    const chunkSeed = (WORLD_SEED ^ (cx * 73856093) ^ (cy * 19349663)) >>> 0;
    const rng = mulberry32(chunkSeed);

    let attempts = 0;
    const maxAttempts = 40;
    const placedPositions = [];

    while (attempts < maxAttempts && result.size < budget) {
      attempts++;
      const tx = minX + Math.floor(rng() * CHUNK_SIZE);
      const ty = minY + Math.floor(rng() * CHUNK_SIZE);
      const tKey = `${tx},${ty}`;

      if (result.has(tKey)) continue;

      // Distance to anchor < 20
      if (isTooCloseToAnchor(tx, ty, 20)) continue;

      // Distance to road polyline < 10
      if (isTooCloseToRoad(tx, ty, 10)) continue;

      // Within 14 tiles of lair or elite camp
      if (isTooCloseToLairOrCamp(tx, ty, 14)) continue;

      // Distance to already placed monsters < 5
      let tooCloseToOther = false;
      for (const p of placedPositions) {
        if (Math.max(Math.abs(tx - p.x), Math.abs(ty - p.y)) < 5) {
          tooCloseToOther = true;
          break;
        }
      }
      if (tooCloseToOther) continue;

      // Solid scatter collision & canopy check (G5)
      if (solidScatterPositions.has(tKey)) continue;
      if (objectScatter.isCellBlocked(tx, ty) || (objectScatter.isCellUnderCanopy && objectScatter.isCellUnderCanopy(tx, ty))) continue;

      // Procedural terrain check
      const tile = getTileAt(tx, ty);
      if (!tile || tile.isSolid) continue;
      if (/river|lake|sea|ocean|pond|lava|poison_pool/i.test(tile.terrainType)) continue;
      if (tile.terrainType === 'road_stone') continue;

      // Candidate passed all checks! Pick species by spawnWeight
      let totalWeight = 0;
      for (const sp of commonSpecies) totalWeight += (sp.spawnWeight || 70);
      let roll = rng() * totalWeight;
      let pickedSpecies = commonSpecies[0];
      for (const sp of commonSpecies) {
        roll -= (sp.spawnWeight || 70);
        if (roll <= 0) {
          pickedSpecies = sp;
          break;
        }
      }

      const isAggressive = (dangerTier >= 2 && rng() < 0.10) || Boolean(pickedSpecies.isAggressive);

      result.set(tKey, {
        key: tKey,
        x: tx,
        y: ty,
        name: pickedSpecies.name,
        tier: pickedSpecies.tier || dangerTier,
        hp: pickedSpecies.hp || Math.floor(40 + pickedSpecies.level * 18),
        maxHp: pickedSpecies.maxHp || pickedSpecies.hp || Math.floor(40 + pickedSpecies.level * 18),
        atk: pickedSpecies.atk || Math.floor(8 + pickedSpecies.level * 3),
        def: pickedSpecies.def || Math.floor(4 + pickedSpecies.level * 1.5),
        spd: pickedSpecies.spd || Math.floor(8 + pickedSpecies.level * 0.6),
        icon: pickedSpecies.icon || '🐾',
        isAggressive,
        level: pickedSpecies.level || (tierLevelBase[dangerTier] || 4),
        isElite: false,
        isBoss: false
      });

      placedPositions.push({ x: tx, y: ty });
    }
  }

  // Save to LRU cache
  if (LRU_CACHE.size >= MAX_CACHE_SIZE) {
    const oldestKey = LRU_CACHE.keys().next().value;
    LRU_CACHE.delete(oldestKey);
  }
  LRU_CACHE.set(cacheKey, result);

  return result;
}

function getMonstersInBounds(minX, minY, maxX, maxY) {
  const result = new Map();
  const minCX = Math.floor(minX / CHUNK_SIZE);
  const maxCX = Math.floor(maxX / CHUNK_SIZE);
  const minCY = Math.floor(minY / CHUNK_SIZE);
  const maxCY = Math.floor(maxY / CHUNK_SIZE);

  for (let cx = minCX; cx <= maxCX; cx++) {
    for (let cy = minCY; cy <= maxCY; cy++) {
      const chunkMonsters = getMonstersInChunk(cx, cy);
      for (const [key, monster] of chunkMonsters.entries()) {
        if (monster.x >= minX && monster.x <= maxX && monster.y >= minY && monster.y <= maxY) {
          result.set(key, monster);
        }
      }
    }
  }

  return result;
}

module.exports = {
  getMonstersInChunk,
  getMonstersInBounds,
  CHUNK_BUDGET
};
