const { DEFAULT_REVEAL_RADIUS } = require('../config/gridConfig');

/**
 * Konversi koordinat (tileX, tileY) ke sparse tileIndex linear
 */
function getTileIndex(tileX, tileY, gridWidth) {
  return tileY * gridWidth + tileX;
}

/**
 * Konversi sparse tileIndex linear ke koordinat (tileX, tileY)
 */
function getCoordinatesFromIndex(tileIndex, gridWidth) {
  return {
    tileX: tileIndex % gridWidth,
    tileY: Math.floor(tileIndex / gridWidth)
  };
}

/**
 * Ambil semua tileIndex dalam radius pandang (Chebyshev square radius)
 */
function getTilesInRevealRadius(centerX, centerY, radius, gridWidth, gridHeight) {
  const indexes = [];
  const minX = Math.max(0, centerX - radius);
  const maxX = Math.min(gridWidth - 1, centerX + radius);
  const minY = Math.max(0, centerY - radius);
  const maxY = Math.min(gridHeight - 1, centerY + radius);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      indexes.push(getTileIndex(x, y, gridWidth));
    }
  }

  return indexes;
}

/**
 * Perbarui daftar exploredTiles pemain secara sparse tanpa duplikasi
 */
function revealTilesForPlayer(player, zoneId, centerX, centerY, radius = DEFAULT_REVEAL_RADIUS, gridWidth = 30, gridHeight = 20) {
  if (!player.exploredTiles) {
    player.exploredTiles = [];
  }

  let entry = player.exploredTiles.find(e => e.zoneId === zoneId);
  if (!entry) {
    entry = { zoneId, tileIndexes: [] };
    player.exploredTiles.push(entry);
  }

  const existingSet = new Set(entry.tileIndexes || []);
  const inRadius = getTilesInRevealRadius(centerX, centerY, radius, gridWidth, gridHeight);
  let newlyRevealed = 0;

  for (const idx of inRadius) {
    if (!existingSet.has(idx)) {
      existingSet.add(idx);
      newlyRevealed++;
    }
  }

  entry.tileIndexes = Array.from(existingSet);
  return { newlyRevealed, totalExplored: entry.tileIndexes.length };
}

/**
 * Resolusi status pergerakan grid pemain secara lazy (timestamp check)
 */
function resolvePlayerGridMove(player, zoneConfig) {
  if (!player.gridMove || !player.gridMove.moveArrivesAt) {
    return { resolved: false, moving: false };
  }

  const now = Date.now();
  const arrivalTime = new Date(player.gridMove.moveArrivesAt).getTime();

  if (now >= arrivalTime) {
    // Pemain telah tiba di tujuan
    if (!player.gridPosition) {
      player.gridPosition = { zoneId: zoneConfig.zoneId, tileX: 0, tileY: 0 };
    }

    player.gridPosition.tileX = player.gridMove.targetX;
    player.gridPosition.tileY = player.gridMove.targetY;
    if (player.gridMove.targetZoneId) {
      player.gridPosition.zoneId = player.gridMove.targetZoneId;
    }

    const targetZoneId = player.gridPosition.zoneId;
    const width = zoneConfig.gridWidth || 30;
    const height = zoneConfig.gridHeight || 20;

    // Reveal Fog of War di sekitar posisi baru
    revealTilesForPlayer(player, targetZoneId, player.gridPosition.tileX, player.gridPosition.tileY, DEFAULT_REVEAL_RADIUS, width, height);

    // Reset status pergerakan
    player.gridMove = {
      targetX: null,
      targetY: null,
      targetZoneId: null,
      moveStartedAt: null,
      moveArrivesAt: null
    };

    return { resolved: true, arrived: true, justArrived: true };
  }

  // Masih dalam perjalanan
  return {
    resolved: false,
    moving: true,
    arrivesAt: player.gridMove.moveArrivesAt,
    remainingSeconds: Math.max(1, Math.ceil((arrivalTime - now) / 1000))
  };
}

module.exports = {
  getTileIndex,
  getCoordinatesFromIndex,
  getTilesInRevealRadius,
  revealTilesForPlayer,
  resolvePlayerGridMove
};
