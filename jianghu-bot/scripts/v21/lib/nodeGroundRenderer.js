const path = require('path');
const crypto = require('crypto');
const { createCanvas } = require('../../../node_modules/@napi-rs/canvas');
const nodeGroundTextures = require('./nodeGroundTextures');
const { getStaticChunk } = require('../../../utils/chunkStreamingEngine.js');

// Mock browser globals for groundRenderer in Node environment
if (typeof global.document === 'undefined') {
  global.document = {
    createElement: (tag) => {
      if (tag === 'canvas') {
        return createCanvas(100, 100);
      }
      return {};
    }
  };
}
if (typeof global.window === 'undefined') {
  global.window = {
    localStorage: { getItem: () => '1' },
    location: { search: '' }
  };
}
if (typeof global.DOMMatrix === 'undefined') {
  global.DOMMatrix = class DOMMatrix {
    translate() { return this; }
    scale() { return this; }
  };
}

const jiti = require('../../../web-dashboard/node_modules/jiti')(__filename, {
  alias: {
    '@': path.resolve(__dirname, '../../../web-dashboard/src')
  }
});

let isInitialized = false;
let groundRendererModule = null;

// Chunk terrain cache for neighbor tile queries
const chunkTileCache = new Map();

function getCachedChunkTiles(cx, cy) {
  const key = `${cx},${cy}`;
  if (chunkTileCache.has(key)) return chunkTileCache.get(key);
  try {
    const chunk = getStaticChunk(cx, cy);
    if (chunk && chunk.groundTiles) {
      chunkTileCache.set(key, chunk.groundTiles);
      if (chunkTileCache.size > 200) {
        const firstKey = chunkTileCache.keys().next().value;
        chunkTileCache.delete(firstKey);
      }
      return chunk.groundTiles;
    }
  } catch (_) {}
  return null;
}

function getNeighborTerrain(wx, wy) {
  const ncx = Math.floor(wx / 32);
  const ncy = Math.floor(wy / 32);
  const groundTiles = getCachedChunkTiles(ncx, ncy);
  if (!groundTiles) return 'plains';
  const lx = ((wx % 32) + 32) % 32;
  const ly = ((wy % 32) + 32) % 32;
  const idx = ly * 32 + lx;
  return groundTiles[idx] || 'plains';
}

async function initNodeGroundRenderer() {
  if (isInitialized) return groundRendererModule;

  await nodeGroundTextures.load();

  const groundTexturesMod = jiti('@/lib/groundTextures');
  groundTexturesMod.groundTextures.manifest = nodeGroundTextures.manifest;
  groundTexturesMod.groundTextures.images = nodeGroundTextures.images;
  groundTexturesMod.groundTextures.transitionMasks = nodeGroundTextures.transitionMasks;
  groundTexturesMod.groundTextures.patterns = nodeGroundTextures.patterns;
  groundTexturesMod.groundTextures.ready = true;

  groundRendererModule = jiti('@/lib/groundRenderer');
  isInitialized = true;
  return groundRendererModule;
}

function renderChunk(cx, cy, tileSize = 54) {
  if (!isInitialized || !groundRendererModule) {
    throw new Error('nodeGroundRenderer belum diinisialisasi. Panggil initNodeGroundRenderer() terlebih dahulu.');
  }

  const chunk = getStaticChunk(cx, cy);
  const groundTiles = chunk ? chunk.groundTiles : null;
  const tiles = [];

  for (let ty = 0; ty < 32; ty++) {
    for (let tx = 0; tx < 32; tx++) {
      const idx = ty * 32 + tx;
      tiles.push({
        tileX: cx * 32 + tx,
        tileY: cy * 32 + ty,
        terrainType: groundTiles ? groundTiles[idx] : 'plains'
      });
    }
  }

  return groundRendererModule.renderChunkGroundBitmap(cx, cy, tiles, tileSize, getNeighborTerrain);
}

function bakeChunk(cx, cy) {
  const canvasZ0 = renderChunk(cx, cy, 54);
  if (!canvasZ0) {
    throw new Error(`Gagal merender chunk (${cx}, ${cy})`);
  }

  // Z0: 1728 x 1728 (Full resolution, 1 px/cell)
  const z0Buffer = canvasZ0.toBuffer('image/webp');
  const sha256_z0 = crypto.createHash('sha256').update(z0Buffer).digest('hex');

  // Z1: 864 x 864 (Half resolution)
  const canvasZ1 = createCanvas(864, 864);
  const ctxZ1 = canvasZ1.getContext('2d');
  ctxZ1.drawImage(canvasZ0, 0, 0, 864, 864);
  const z1Buffer = canvasZ1.toBuffer('image/webp');
  const sha256_z1 = crypto.createHash('sha256').update(z1Buffer).digest('hex');

  // Z2: 432 x 432 (Quarter resolution)
  const canvasZ2 = createCanvas(432, 432);
  const ctxZ2 = canvasZ2.getContext('2d');
  ctxZ2.drawImage(canvasZ0, 0, 0, 432, 432);
  const z2Buffer = canvasZ2.toBuffer('image/webp');
  const sha256_z2 = crypto.createHash('sha256').update(z2Buffer).digest('hex');

  return {
    cx,
    cy,
    z0Buffer,
    z1Buffer,
    z2Buffer,
    sha256_z0,
    sha256_z1,
    sha256_z2
  };
}

module.exports = {
  initNodeGroundRenderer,
  renderChunk,
  bakeChunk,
  getNeighborTerrain
};
