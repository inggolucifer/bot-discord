/**
 * JIANGHU WORLD — SERVER CHUNK STREAMING ENGINE (utils/chunkStreamingEngine.js)
 * Implements Fase C1 Specification:
 * - 32x32 tiles per chunk for 5000x5000 Tale of Immortal world map.
 * - Deterministic, immutable static chunk generation with ETag & Base64 packed terrain.
 * - In-memory LRU Cache (capacity 2000 chunks) with < 2 ms hit latency.
 * - Dynamic live chunk data aggregator (active players, monsters, NPCs, custom plots).
 * - Bi-directional unpacker to ensure 100% equivalence with getTileAt.
 */

const crypto = require('crypto');
const proceduralWorldEngine = require('./proceduralWorldEngine');
const objectScatter = require('./objectScatter');
const autotileEngine = require('./autotileEngine');
const { getRegionAt, getTerritoryInfo, getTerrainStaminaCost } = require('./worldRegionEngine');
const monsterSpawnEngine = require('./monsterSpawnEngine');

const CHUNK_SIZE = 32;
const WORLD_WIDTH = proceduralWorldEngine.WORLD_WIDTH || 5000;
const WORLD_HEIGHT = proceduralWorldEngine.WORLD_HEIGHT || 5000;
const MAX_CHUNK_X = Math.floor((WORLD_WIDTH - 1) / CHUNK_SIZE); // 156
const MAX_CHUNK_Y = Math.floor((WORLD_HEIGHT - 1) / CHUNK_SIZE); // 156

const WORLD_VERSION = 'v6_20260916';
const LRU_CAPACITY = 2000;

// High-performance LRU Cache (Map maintains insertion order)
class ChunkLRUCache {
  constructor(capacity = LRU_CAPACITY) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    const value = this.cache.get(key);
    // Refresh position to most recently used
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, value);
  }

  has(key) {
    return this.cache.has(key);
  }

  clear() {
    this.cache.clear();
  }

  get size() {
    return this.cache.size;
  }
}

const staticChunkCache = new ChunkLRUCache(LRU_CAPACITY);

/**
 * Validates chunk coordinates
 */
function isValidChunk(cx, cy) {
  return Number.isInteger(cx) && Number.isInteger(cy) &&
    cx >= 0 && cx <= MAX_CHUNK_X &&
    cy >= 0 && cy <= MAX_CHUNK_Y;
}

/**
 * Generates or retrieves static chunk (32x32 tiles)
 * @param {number} cx Chunk X (0..156)
 * @param {number} cy Chunk Y (0..156)
 * @param {string} [version=WORLD_VERSION]
 * @returns {object} Static chunk data
 */
function getStaticChunk(cx, cy, version = WORLD_VERSION) {
  if (!isValidChunk(cx, cy)) {
    throw new Error(`Koordinat chunk (${cx}, ${cy}) di luar batas dunia [0..${MAX_CHUNK_X}, 0..${MAX_CHUNK_Y}].`);
  }

  if (version && version !== WORLD_VERSION) {
    const err = new Error(`Versi dunia mismatch. Diharapkan '${WORLD_VERSION}', diterima '${version}'.`);
    err.statusCode = 410;
    throw err;
  }

  const cacheKey = `${cx}:${cy}`;
  const cached = staticChunkCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const minX = cx * CHUNK_SIZE;
  const maxX = Math.min(WORLD_WIDTH - 1, minX + CHUNK_SIZE - 1);
  const minY = cy * CHUNK_SIZE;
  const maxY = Math.min(WORLD_HEIGHT - 1, minY + CHUNK_SIZE - 1);

  // Pre-filter anchor settlements intersecting this chunk (+ 4 tile margin for span)
  const candidateSettlements = proceduralWorldEngine.ANCHOR_SETTLEMENTS.filter(s =>
    (s.tileX + s.spanWidth) >= minX && s.tileX <= maxX &&
    (s.tileY + s.spanHeight) >= minY && s.tileY <= maxY
  );

  const paletteMap = new Map();
  const palette = [];
  const terrainBytes = Buffer.alloc(CHUNK_SIZE * CHUNK_SIZE);
  const specialTiles = {};

  // 1. Generate 32x32 terrain grid
  for (let dy = 0; dy < CHUNK_SIZE; dy++) {
    for (let dx = 0; dx < CHUNK_SIZE; dx++) {
      const idx = dy * CHUNK_SIZE + dx;
      const x = minX + dx;
      const y = minY + dy;

      if (x >= WORLD_WIDTH || y >= WORLD_HEIGHT) {
        continue;
      }

      const tile = proceduralWorldEngine.getTileAt(x, y, candidateSettlements);
      const tt = tile.terrainType || 'plains';

      let pIdx = paletteMap.get(tt);
      if (pIdx === undefined) {
        pIdx = palette.length;
        palette.push(tt);
        paletteMap.set(tt, pIdx);
      }
      terrainBytes[idx] = pIdx;

      // Autotile computation for continuous terrain
      let autotileBitmask;
      let autotileFrame;
      if (tt.includes('river') || tt.includes('road') || tt.includes('lake')) {
        autotileBitmask = autotileEngine.calculateAutotileBitmask(x, y, (nx, ny) => {
          if (nx >= minX && nx <= maxX && ny >= minY && ny <= maxY) {
            const nIdx = (ny - minY) * CHUNK_SIZE + (nx - minX);
            const nPaletteIdx = terrainBytes[nIdx];
            if (nPaletteIdx !== undefined && palette[nPaletteIdx]) {
              return palette[nPaletteIdx];
            }
          }
          return proceduralWorldEngine.getTileAt(nx, ny, candidateSettlements).terrainType || tt;
        });
        autotileFrame = autotileEngine.getAutotileFrameId(tt, autotileBitmask);
      }

      // Check if tile has special properties worth storing (sparse overrides)
      const special = {};
      if (tile.resourceType) {
        special.resourceType = tile.resourceType;
        if (tile.label) special.label = tile.label;
      }
      if (tile.isSettlementOrigin) {
        special.isSettlementOrigin = true;
        if (tile.settlementName) special.settlementName = tile.settlementName;
        if (tile.chineseName) special.chineseName = tile.chineseName;
        if (tile.label) special.label = tile.label;
      }
      if (autotileFrame) {
        special.autotileBitmask = autotileBitmask;
        special.autotileFrame = autotileFrame;
      }
      if (tile.isSolid && !tt.includes('mountain') && !tt.includes('barrier')) {
        special.isSolid = true;
      }

      if (Object.keys(special).length > 0) {
        specialTiles[idx] = special;
      }
    }
  }

  // 2. Fetch deterministic scatter objects
  const scatter = objectScatter.getChunkObjects(cx, cy);

  // 3. Compute 32x32 Occupancy Bitmask (1024 bits = 128 bytes)
  const occupancyBuffer = Buffer.alloc(128, 0);

  // Mark footprint collisions in specialTiles and occupancy bitmask
  for (const obj of scatter) {
    const col = objectScatter.getCanonCollision
      ? objectScatter.getCanonCollision(obj.defId, obj.cw || 1, obj.ch || 1)
      : { w: 1, h: 1, offsetX: 0 };

    if (col.w > 0 && col.h > 0) {
      const baseStartX = obj.x + Math.round(col.offsetX || 0);
      const baseStartY = obj.y;
      for (let dy = 0; dy < col.h; dy++) {
        for (let dx = 0; dx < col.w; dx++) {
          const lx = (baseStartX + dx) - minX;
          const ly = (baseStartY + dy) - minY;
          if (lx >= 0 && lx < CHUNK_SIZE && ly >= 0 && ly < CHUNK_SIZE) {
            const idx = ly * CHUNK_SIZE + lx;
            if (!specialTiles[idx]) specialTiles[idx] = {};
            specialTiles[idx].isSolid = true;

            const byteIdx = Math.floor(idx / 8);
            const bitIdx = idx % 8;
            occupancyBuffer[byteIdx] |= (1 << bitIdx);
          }
        }
      }
    }
  }

  // Also mark terrain barriers/mountain solids in occupancy bitmask
  for (let idx = 0; idx < 1024; idx++) {
    if (specialTiles[idx] && specialTiles[idx].isSolid) {
      const byteIdx = Math.floor(idx / 8);
      const bitIdx = idx % 8;
      occupancyBuffer[byteIdx] |= (1 << bitIdx);
    }
  }

  const occupancy = occupancyBuffer.toString('base64');
  const terrainBase64 = terrainBytes.toString('base64');

  // 4. Compute deterministic MD5 hash for ETag & cache verification
  const hash = crypto.createHash('md5')
    .update(`${WORLD_VERSION}:${cx}:${cy}:${terrainBase64}:${occupancy}:${JSON.stringify(specialTiles)}:${JSON.stringify(scatter)}`)
    .digest('hex');

  const chunkData = {
    v: WORLD_VERSION,
    cx,
    cy,
    bounds: { minX, maxX, minY, maxY },
    palette,
    terrain: terrainBase64,
    specialTiles,
    scatter,
    occupancy,
    hash
  };

  staticChunkCache.set(cacheKey, chunkData);
  return chunkData;
}

/**
 * Batch request for multiple static chunks
 * @param {Array<{ cx: number, cy: number }>} chunks
 * @param {string} [version=WORLD_VERSION]
 * @returns {{ version: string, chunks: Array<object> }}
 */
function getStaticChunksBatch(chunks, version = WORLD_VERSION) {
  if (!Array.isArray(chunks)) {
    throw new Error('Daftar chunk harus berupa array.');
  }

  const requestedChunks = chunks.slice(0, 16); // Cap at 16 chunks per batch
  const results = [];

  for (const c of requestedChunks) {
    if (isValidChunk(c.cx, c.cy)) {
      results.push(getStaticChunk(c.cx, c.cy, version));
    }
  }

  return {
    version: WORLD_VERSION,
    chunks: results
  };
}

/**
 * Unpacks a static chunk into an array of full Tile objects (identical to getTileAt)
 * Useful for client fallback rendering, offline simulation, and automated validation.
 * @param {object} chunk Static chunk object
 * @returns {Array<object>} Full tile objects
 */
function unpackChunkTiles(chunk) {
  const { cx, cy, palette, terrain, specialTiles = {}, scatter = [] } = chunk;
  const terrainBytes = Buffer.from(terrain, 'base64');
  const minX = cx * CHUNK_SIZE;
  const minY = cy * CHUNK_SIZE;

  // Map scatter objects by local tile index
  const scatterByTile = new Map();
  for (const obj of scatter) {
    const key = `${obj.x},${obj.y}`;
    if (!scatterByTile.has(key)) scatterByTile.set(key, []);
    scatterByTile.get(key).push(obj);
  }

  const candidateSettlements = proceduralWorldEngine.ANCHOR_SETTLEMENTS.filter(s =>
    (s.tileX + s.spanWidth) >= minX && s.tileX <= (minX + CHUNK_SIZE - 1) &&
    (s.tileY + s.spanHeight) >= minY && s.tileY <= (minY + CHUNK_SIZE - 1)
  );

  const tiles = [];

  for (let dy = 0; dy < CHUNK_SIZE; dy++) {
    for (let dx = 0; dx < CHUNK_SIZE; dx++) {
      const idx = dy * CHUNK_SIZE + dx;
      const x = minX + dx;
      const y = minY + dy;

      if (x >= WORLD_WIDTH || y >= WORLD_HEIGHT) continue;

      const baseTile = proceduralWorldEngine.getTileAt(x, y, candidateSettlements);
      const tt = palette[terrainBytes[idx]] || baseTile.terrainType;
      const special = specialTiles[idx] || {};

      const objectsOnTile = scatterByTile.get(`${x},${y}`) || [];
      const hasSolidObj = objectsOnTile.some(o => o.collision === 'solid');

      const fullTile = {
        ...baseTile,
        terrainType: tt,
        isSolid: special.isSolid !== undefined ? special.isSolid : (baseTile.isSolid || hasSolidObj),
        label: special.label !== undefined ? special.label : baseTile.label,
        terrainLabel: special.terrainLabel !== undefined ? special.terrainLabel : baseTile.terrainLabel,
        resourceType: special.resourceType !== undefined ? special.resourceType : baseTile.resourceType,
        isSettlementOrigin: special.isSettlementOrigin !== undefined ? special.isSettlementOrigin : baseTile.isSettlementOrigin,
        settlementName: special.settlementName !== undefined ? special.settlementName : baseTile.settlementName,
        chineseName: special.chineseName !== undefined ? special.chineseName : baseTile.chineseName,
        autotileBitmask: special.autotileBitmask !== undefined ? special.autotileBitmask : baseTile.autotileBitmask,
        autotileFrame: special.autotileFrame !== undefined ? special.autotileFrame : baseTile.autotileFrame,
        objects: objectsOnTile
      };

      tiles.push(fullTile);
    }
  }

  return tiles;
}

/**
 * Dynamic Live Chunk Aggregator
 * Gathers active players, monsters, NPCs, and custom plot structures in the chunk.
 * Cached for 5s to prevent database contention under high concurrency.
 */
const liveChunkCache = new Map();
const LIVE_TTL_MS = 5000;

async function getChunkLive(cx, cy, guildId = 'global', models = {}) {
  if (!isValidChunk(cx, cy)) {
    throw new Error(`Koordinat chunk (${cx}, ${cy}) di luar batas.`);
  }

  const cacheKey = `${guildId}:${cx}:${cy}`;
  const now = Date.now();
  const cached = liveChunkCache.get(cacheKey);
  if (cached && (now - cached.timestamp < LIVE_TTL_MS)) {
    return cached.data;
  }

  const minX = cx * CHUNK_SIZE;
  const maxX = Math.min(WORLD_WIDTH - 1, minX + CHUNK_SIZE - 1);
  const minY = cy * CHUNK_SIZE;
  const maxY = Math.min(WORLD_HEIGHT - 1, minY + CHUNK_SIZE - 1);

  const Player = models.Player || require('../models/Player');
  const Npc = models.Npc || require('../models/Npc');
  const ZoneTile = models.ZoneTile || require('../models/ZoneTile');
  const DefeatedMonsterTile = models.DefeatedMonsterTile || require('../models/DefeatedMonsterTile');

  // 1. Online / active players in this chunk
  let players = [];
  try {
    const activePlayers = await Player.find({
      'gridPosition.tileX': { $gte: minX, $lte: maxX },
      'gridPosition.tileY': { $gte: minY, $lte: maxY }
    }).select('discordId username customTitle systemCultivation.realm gridPosition avatar outfit').lean();

    players = (activePlayers || []).map(p => ({
      discordId: p.discordId,
      username: p.username,
      title: p.customTitle || null,
      realm: p.systemCultivation?.realm || 'Mortal',
      x: p.gridPosition?.tileX,
      y: p.gridPosition?.tileY,
      avatar: p.avatar,
      outfit: p.outfit || 'default'
    }));
  } catch (err) {
    console.warn(`[CHUNK-LIVE] Player query non-fatal error: ${err.message}`);
  }

  // 2. Active NPCs in this chunk
  let npcs = [];
  try {
    const activeNpcs = await Npc.find({
      tileX: { $gte: minX, $lte: maxX },
      tileY: { $gte: minY, $lte: maxY },
      isActive: true
    }).select('_id name title portraitUrl tileX tileY settlementName').lean();

    npcs = (activeNpcs || []).map(n => ({
      id: String(n._id),
      name: n.name,
      title: n.title,
      portraitUrl: n.portraitUrl,
      x: n.tileX,
      y: n.tileY,
      settlementName: n.settlementName
    }));
  } catch (err) {
    console.warn(`[CHUNK-LIVE] NPC query non-fatal error: ${err.message}`);
  }

  // 3. Custom plots & player-built structures
  let customTiles = [];
  try {
    const tiles = await ZoneTile.find({
      tileX: { $gte: minX, $lte: maxX },
      tileY: { $gte: minY, $lte: maxY }
    }).lean();

    customTiles = (tiles || []).map(t => ({
      tileX: t.tileX,
      tileY: t.tileY,
      ownerId: t.ownerId,
      buildingName: t.buildingName,
      isUnderConstruction: t.isUnderConstruction,
      cropType: t.cropType,
      spawnedMonster: t.spawnedMonster
    }));
  } catch (err) {
    console.warn(`[CHUNK-LIVE] Custom tile query non-fatal error: ${err.message}`);
  }

  // Inject overworld monsters from monsterSpawnEngine (Prompt E4)
  try {
    const spawnedMonsters = monsterSpawnEngine.getMonstersInChunk(cx, cy);
    for (const [key, monster] of spawnedMonsters.entries()) {
      const [mx, my] = key.split(',').map(Number);
      const existing = customTiles.find(t => t.tileX === mx && t.tileY === my);
      if (existing) {
        if (!existing.spawnedMonster) existing.spawnedMonster = monster;
      } else {
        customTiles.push({
          tileX: mx,
          tileY: my,
          spawnedMonster: monster
        });
      }
    }
  } catch (err) {
    console.warn(`[CHUNK-LIVE] Monster spawn injection error: ${err.message}`);
  }

  // 4. Defeated monster tile filters
  let defeatedMonsterKeys = [];
  try {
    const defeated = await DefeatedMonsterTile.find({
      respawnAt: { $gt: new Date() }
    }).select('tileKey').lean();
    defeatedMonsterKeys = (defeated || []).map(d => d.tileKey);
  } catch (err) {
    console.warn(`[CHUNK-LIVE] Defeated monster query non-fatal error: ${err.message}`);
  }

  // Bersihkan monster dari petak yang sedang dalam masa respawn
  if (defeatedMonsterKeys.length > 0) {
    const defeatedSet = new Set(defeatedMonsterKeys);
    for (const ct of customTiles) {
      if (defeatedSet.has(`${ct.tileX},${ct.tileY}`)) {
        delete ct.spawnedMonster;
      }
    }
  }

  const liveData = {
    cx,
    cy,
    timestamp: now,
    ttlMs: LIVE_TTL_MS,
    players,
    npcs,
    customTiles,
    defeatedMonsterKeys
  };

  liveChunkCache.set(cacheKey, { data: liveData, timestamp: now });

  // LRU eviction for live cache (keep max 500 entries)
  if (liveChunkCache.size > 500) {
    const oldestKey = liveChunkCache.keys().next().value;
    liveChunkCache.delete(oldestKey);
  }

  return liveData;
}

function isChunkTileOccupied(cx, cy, lx, ly) {
  if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_SIZE) return false;
  const chunk = getStaticChunk(cx, cy);
  if (!chunk || !chunk.occupancy) return false;
  const buf = Buffer.from(chunk.occupancy, 'base64');
  const idx = ly * CHUNK_SIZE + lx;
  return (buf[Math.floor(idx / 8)] & (1 << (idx % 8))) !== 0;
}

module.exports = {
  CHUNK_SIZE,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  MAX_CHUNK_X,
  MAX_CHUNK_Y,
  WORLD_VERSION,
  LRU_CAPACITY,
  staticChunkCache,
  isValidChunk,
  getStaticChunk,
  getStaticChunksBatch,
  unpackChunkTiles,
  getChunkLive,
  isChunkTileOccupied
};
