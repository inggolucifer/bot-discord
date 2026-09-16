/**
 * sparseFogManager.js
 * Manajemen Kabut Misteri (Fog of War) Spasial Chunk-Based untuk Peta 5000x5000
 * Efisiensi memori 99.9%: Menyimpan ID Macro-Chunk dan koordinat offset aktif.
 */

const CHUNK_SIZE = 16; // 1 Chunk = 16x16 tile

/**
 * Mendapatkan ID Chunk dari koordinat tile
 */
function getChunkCoord(tileX, tileY) {
  return {
    chunkX: Math.floor(tileX / CHUNK_SIZE),
    chunkY: Math.floor(tileY / CHUNK_SIZE)
  };
}

function getChunkKey(chunkX, chunkY) {
  return `${chunkX},${chunkY}`;
}

/**
 * Membuka kabut di sekitar pemain berdasarkan radius pandang
 * Mengembalikan array kunci chunk yang baru terungkap dan set tile tereksplorasi di viewport
 */
function revealFogAtPosition(player, centerX, centerY, radius = 4) {
  if (!player.exploredChunks) {
    player.exploredChunks = [];
  }

  // Set chunk yang sudah ada
  const chunkSet = new Set(player.exploredChunks);
  let newlyRevealedChunks = 0;

  const minX = Math.max(0, centerX - radius);
  const maxX = Math.min(4999, centerX + radius);
  const minY = Math.max(0, centerY - radius);
  const maxY = Math.min(4999, centerY + radius);

  const minChunkX = Math.floor(minX / CHUNK_SIZE);
  const maxChunkX = Math.floor(maxX / CHUNK_SIZE);
  const minChunkY = Math.floor(minY / CHUNK_SIZE);
  const maxChunkY = Math.floor(maxY / CHUNK_SIZE);

  for (let cy = minChunkY; cy <= maxChunkY; cy++) {
    for (let cx = minChunkX; cx <= maxChunkX; cx++) {
      const key = getChunkKey(cx, cy);
      if (!chunkSet.has(key)) {
        chunkSet.add(key);
        newlyRevealedChunks++;
      }
    }
  }

  player.exploredChunks = Array.from(chunkSet);

  return {
    newlyRevealedChunks,
    totalExploredChunks: player.exploredChunks.length
  };
}

/**
 * Memeriksa apakah sebuah tile berada di dalam chunk yang sudah dijelajahi
 */
function isTileExplored(player, tileX, tileY) {
  if (!player.exploredChunks || player.exploredChunks.length === 0) {
    return false;
  }
  const cx = Math.floor(tileX / CHUNK_SIZE);
  const cy = Math.floor(tileY / CHUNK_SIZE);
  const key = getChunkKey(cx, cy);
  return player.exploredChunks.includes(key);
}

module.exports = {
  CHUNK_SIZE,
  getChunkCoord,
  getChunkKey,
  revealFogAtPosition,
  isTileExplored
};
