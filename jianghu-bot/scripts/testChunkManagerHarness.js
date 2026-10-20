/**
 * scripts/testChunkManagerHarness.js
 * Node.js test harness for Client ChunkManager logic
 */

const CHUNK_SIZE = 32;
const WORLD_WIDTH = 5000;
const WORLD_HEIGHT = 5000;
const MAX_CHUNK_X = Math.floor((WORLD_WIDTH - 1) / CHUNK_SIZE);
const MAX_CHUNK_Y = Math.floor((WORLD_HEIGHT - 1) / CHUNK_SIZE);
const WORLD_VERSION = 'v6_20260916';
const MAX_RESIDENT_CHUNKS = 64;

function decodeBase64ToUint8(base64) {
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

function worldToChunkCoord(worldX, worldY) {
  const cx = Math.floor(worldX / CHUNK_SIZE);
  const cy = Math.floor(worldY / CHUNK_SIZE);
  const lx = worldX - cx * CHUNK_SIZE;
  const ly = worldY - cy * CHUNK_SIZE;
  const index = ly * CHUNK_SIZE + lx;
  return { cx, cy, lx, ly, index };
}

function chunkToBounds(cx, cy) {
  const minX = cx * CHUNK_SIZE;
  const maxX = Math.min(WORLD_WIDTH - 1, minX + CHUNK_SIZE - 1);
  const minY = cy * CHUNK_SIZE;
  const maxY = Math.min(WORLD_HEIGHT - 1, minY + CHUNK_SIZE - 1);
  return { minX, maxX, minY, maxY };
}

class ChunkManager {
  constructor() {
    this.chunks = new Map();
    this.unpackedChunks = new Map();
    this.liveData = new Map();
    this.hotRing = new Set();
    this.warmRing = new Set();
  }

  getLoadedChunkCount() {
    return this.chunks.size;
  }

  hasChunk(cx, cy) {
    return this.chunks.has(`${cx}:${cy}`);
  }

  computeRings(centerTileX, centerTileY, zoom = 1.0) {
    const centerCx = Math.max(0, Math.min(MAX_CHUNK_X, Math.floor(centerTileX / CHUNK_SIZE)));
    const centerCy = Math.max(0, Math.min(MAX_CHUNK_Y, Math.floor(centerTileY / CHUNK_SIZE)));

    const hotRadius = zoom < 0.35 ? 3 : (zoom < 0.75 ? 2 : 1);
    const warmRadius = hotRadius + 1;

    const hot = [];
    const warm = [];
    const hotKeys = new Set();
    const warmKeys = new Set();

    for (let dy = -warmRadius; dy <= warmRadius; dy++) {
      for (let dx = -warmRadius; dx <= warmRadius; dx++) {
        const cx = centerCx + dx;
        const cy = centerCy + dy;

        if (cx < 0 || cx > MAX_CHUNK_X || cy < 0 || cy > MAX_CHUNK_Y) continue;

        const key = `${cx}:${cy}`;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));

        if (dist <= hotRadius) {
          hot.push({ cx, cy });
          hotKeys.add(key);
        } else {
          warm.push({ cx, cy });
          warmKeys.add(key);
        }
      }
    }

    return { hot, warm, hotKeys, warmKeys, centerCx, centerCy };
  }

  getPrioritizedFetchQueue(hot, warm, centerCx, centerCy) {
    const sortByDistance = (a, b) => {
      const distA = Math.hypot(a.cx - centerCx, a.cy - centerCy);
      const distB = Math.hypot(b.cx - centerCx, b.cy - centerCy);
      return distA - distB;
    };

    const sortedHot = [...hot].sort(sortByDistance);
    const sortedWarm = [...warm].sort(sortByDistance);

    return [...sortedHot, ...sortedWarm];
  }

  updateCamera(centerTileX, centerTileY, zoom = 1.0) {
    const { hotKeys, warmKeys } = this.computeRings(centerTileX, centerTileY, zoom);
    this.hotRing = hotKeys;
    this.warmRing = warmKeys;
    this.evictColdChunks(hotKeys, warmKeys);
  }

  evictColdChunks(hotKeys, warmKeys) {
    if (this.chunks.size <= MAX_RESIDENT_CHUNKS) return;

    for (const key of this.chunks.keys()) {
      if (!hotKeys.has(key) && !warmKeys.has(key)) {
        this.unpackedChunks.delete(key);
        this.chunks.delete(key);
        this.liveData.delete(key);

        if (this.chunks.size <= MAX_RESIDENT_CHUNKS) {
          break;
        }
      }
    }
  }

  ingestStaticChunk(chunk) {
    if (!chunk || typeof chunk.cx !== 'number' || typeof chunk.cy !== 'number') return;
    const key = `${chunk.cx}:${chunk.cy}`;
    this.chunks.set(key, chunk);
    const unpacked = this.unpackChunk(chunk);
    this.unpackedChunks.set(key, unpacked);
  }

  setLiveData(live) {
    if (!live || typeof live.cx !== 'number' || typeof live.cy !== 'number') return;
    const key = `${live.cx}:${live.cy}`;
    this.liveData.set(key, live);
  }

  unpackChunk(chunk) {
    const { cx, cy, palette, terrain, specialTiles = {}, scatter = [] } = chunk;
    const terrainBytes = decodeBase64ToUint8(terrain);
    const minX = cx * CHUNK_SIZE;
    const minY = cy * CHUNK_SIZE;

    const scatterByCoord = new Map();
    for (const obj of scatter) {
      const coordKey = `${obj.x},${obj.y}`;
      if (!scatterByCoord.has(coordKey)) scatterByCoord.set(coordKey, []);
      scatterByCoord.get(coordKey).push({
        id: obj.id,
        defId: obj.defId,
        x: obj.x,
        y: obj.y,
        customLabel: obj.customLabel
      });
    }

    const tiles = [];

    for (let dy = 0; dy < CHUNK_SIZE; dy++) {
      for (let dx = 0; dx < CHUNK_SIZE; dx++) {
        const idx = dy * CHUNK_SIZE + dx;
        const x = minX + dx;
        const y = minY + dy;

        if (x >= WORLD_WIDTH || y >= WORLD_HEIGHT) continue;

        const paletteIdx = terrainBytes[idx] !== undefined ? terrainBytes[idx] : 0;
        const terrainType = palette[paletteIdx] || 'plains';
        const special = specialTiles[idx] || {};

        const tileScatter = scatterByCoord.get(`${x},${y}`) || [];
        const isSolid = special.isSolid !== undefined
          ? special.isSolid
          : (terrainType.includes('mountain') || tileScatter.some(o => o.defId.includes('mt_')));

        const tile = {
          tileX: x,
          tileY: y,
          terrainType,
          tileType: special.isSettlementOrigin ? 'settlement' : (isSolid ? 'solid' : 'walkable'),
          isSolid,
          resourceType: special.resourceType || null,
          label: special.label || null,
          terrainLabel: special.terrainLabel || null,
          settlementName: special.settlementName || null,
          chineseName: special.chineseName || null,
          isSettlementOrigin: special.isSettlementOrigin || false,
          objects: tileScatter
        };

        tiles.push(tile);
      }
    }

    return tiles;
  }

  getTile(worldX, worldY) {
    if (worldX < 0 || worldX >= WORLD_WIDTH || worldY < 0 || worldY >= WORLD_HEIGHT) {
      return null;
    }
    const { cx, cy, index } = worldToChunkCoord(worldX, worldY);
    const key = `${cx}:${cy}`;
    const unpacked = this.unpackedChunks.get(key);
    if (!unpacked || !unpacked[index]) {
      return null;
    }

    let tile = unpacked[index];

    const live = this.liveData.get(key);
    if (live && Array.isArray(live.customTiles)) {
      const custom = live.customTiles.find(t => t.tileX === worldX && t.tileY === worldY);
      if (custom) {
        tile = {
          ...tile,
          ownerId: custom.ownerId,
          buildingName: custom.buildingName,
          isUnderConstruction: custom.isUnderConstruction,
          cropType: custom.cropType,
          spawnedMonster: custom.spawnedMonster
        };
      }
    }

    return tile;
  }
}

module.exports = {
  CHUNK_SIZE,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  MAX_CHUNK_X,
  MAX_CHUNK_Y,
  MAX_RESIDENT_CHUNKS,
  WORLD_VERSION,
  decodeBase64ToUint8,
  worldToChunkCoord,
  chunkToBounds,
  ChunkManager
};
